// src/httpClient.js
const net = require("net");
const tls = require("tls");
const { JSDOM } = require("jsdom");
const { URL } = require("url");

function parseHeaders(raw) {
  const lines = raw.split("\r\n");
  const headers = {};
  for (let i = 1; i < lines.length; i++) {
    const [key, ...rest] = lines[i].split(":");
    headers[key.toLowerCase()] = rest.join(":").trim();
  }
  return headers;
}

// 
function decompressBody(buffer, encoding) {
  return Promise.resolve(buffer.toString());
}


async function makeRequest(initialUrl, maxRedirects = 5) {
  let currentUrl = new URL(initialUrl);
  let redirects = 0;

  while (redirects < maxRedirects) {
    const isHttps = currentUrl.protocol === "https:";
    const port = isHttps ? 443 : 80;

    const response = await new Promise((resolve, reject) => {
      const client = isHttps
        ? tls.connect(port, currentUrl.hostname, { servername: currentUrl.hostname }, onConnect)
        : net.connect(port, currentUrl.hostname, onConnect);

      function onConnect() {
        const request = `GET ${currentUrl.pathname + currentUrl.search} HTTP/1.1\r\n` +
                        `Host: ${currentUrl.hostname}\r\n` +
                        `User-Agent: CustomClient/1.0\r\n` +
                        `Accept: text/html, application/json;q=0.9, */*;q=0.8\r\n` +
                        `Accept-Encoding: identity\r\n` +
                        `Connection: close\r\n\r\n`;
        client.write(request);
      }

      let rawData = [];

      client.on("data", (chunk) => {
        rawData.push(chunk);
      });

      client.on("end", () => {
        const buffer = Buffer.concat(rawData);
        const rawText = buffer.toString("latin1");
        const [headerPart] = rawText.split("\r\n\r\n");
        const bodyStart = buffer.indexOf("\r\n\r\n") + 4;
        const bodyBuffer = buffer.slice(bodyStart);

        const headers = parseHeaders(headerPart);
        const statusLine = headerPart.split("\r\n")[0];
        const statusMatch = statusLine.match(/^HTTP\/1\.\d\s+(\d+)/);
        const statusCode = statusMatch ? parseInt(statusMatch[1]) : 0;

        const encoding = headers["content-encoding"] || "";
        const contentType = headers["content-type"] || "";


        decompressBody(bodyBuffer, encoding)
          .then((decodedBody) => {
           
            if (contentType.includes("application/json")) { 
              try {

                const json = JSON.parse(decodedBody);
                resolve({ statusCode, headers, body: JSON.stringify(json, null, 2) });

              } catch (e) {
                resolve({ statusCode, headers, body: decodedBody });

              }
            } else if (contentType.includes("text/html")) {
              try {
                const dom = new JSDOM(decodedBody);
                const unwanted = dom.window.document.querySelectorAll("script, style, meta, link, iframe, noscript");
                unwanted.forEach((el) => el.remove());

                let text = dom.window.document.body.textContent || "";
                text = text
                  .replace(/\s+/g, " ")
                  .replace(/^\s+|\s+$/g, "")
                  .replace(/([.!?])\s*(?=[A-ZА-Я])/g, "$1\n\n")
                  .replace(/(?<!\n)\s*-\s*/g, "\n- ")
                  .replace(/(\d+\.)\s*/g, "\n$1 ")
                  .replace(/\n{2,}/g, "\n\n");

                resolve({ statusCode, headers, body: text });
              } catch (err) {
                resolve({ statusCode, headers, body: decodedBody });
              }
            } else {
              resolve({ statusCode, headers, body: decodedBody });
            }
          })
          .catch((err) => reject(err));


      });

      client.on("error", (err) => {
        reject(`Connection error: ${err.message}`);
      });
    });

    if (response.statusCode >= 300 && response.statusCode < 400) {
      const location = response.headers["location"];
      if (!location) {
        throw new Error("Redirect response without Location header.");
      }
      console.log(`Redirect ${redirects + 1}: ${location}`);
      currentUrl = new URL(location, currentUrl);
      redirects++;
    } else {
      return response.body;
    }
  }

  throw new Error("Too many redirects.");
}

module.exports = {
  makeRequest
};
