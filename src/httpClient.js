const https = require("https");
const zlib = require("zlib");
const url = require("url");
const { JSDOM } = require("jsdom");

const makeRequest = (targetUrl) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new url.URL(targetUrl);

    console.log(`Making request to: ${targetUrl}`);
    console.log(
      `Host: ${parsedUrl.hostname}, Path: ${parsedUrl.pathname}, Port: ${
        parsedUrl.port || 443
      }`
    );

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + (parsedUrl.search || ""),
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        Connection: "keep-alive",
      },
    };

    const req = https.request(options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      // console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);

      let response = [];

      res.on("data", (chunk) => {
        response.push(chunk);
      });

      res.on("end", () => {
        const buffer = Buffer.concat(response);

        // console.log("\n=== RAW RESPONSE ===\n");
        // console.log(buffer.toString());
        // console.log("\n===================\n");

        if (buffer.length === 0) {
          reject("Empty response from server.");
          return;
        }

        // Определяем Content-Type
        const contentType = res.headers["content-type"];
        console.log(`Content-Type: ${contentType}`);

        // Определяем метод сжатия
        const encoding = res.headers["content-encoding"];
        console.log(`Encoding: ${encoding}`);

        const handleDecodedResponse = (decoded) => {
          if (contentType.includes("application/json")) {
            try {
              const json = JSON.parse(decoded);
              console.log("\n=== PARSED JSON ===\n");
              console.log(JSON.stringify(json, null, 2));
              console.log("\n===================\n");
              resolve(json);
            } catch (err) {
              reject(`Error parsing JSON: ${err.message}`);
            }
          } else if (contentType.includes("text/html")) {
            try {
              const dom = new JSDOM(decoded);

              // Убираем теги <script>, <style>, <meta> и т.д.
              const unwantedTags = dom.window.document.querySelectorAll(
                "script, style, meta, link, iframe, noscript"
              );
              unwantedTags.forEach((tag) => tag.remove());

              let textContent = dom.window.document.body.textContent;

              // Убираем лишние пробелы и переносы строк
              textContent = textContent
                .replace(/\s+/g, " ") // Убираем лишние пробелы
                .replace(/^\s+|\s+$/g, "") // Убираем пробелы в начале и конце строки
                .replace(/([.!?])\s*(?=[A-ZА-Я])/g, "$1\n\n") // Добавляем перенос строки после точек и восклицательных знаков
                .replace(/(?<!\n)\s*-\s*/g, "\n- ") // Добавляем перенос строки перед пунктами списка
                .replace(/(\d+\.)\s*/g, "\n$1 ") // Добавляем перенос строки перед нумерацией
                .replace(/\n{2,}/g, "\n\n"); // Убираем двойные переносы строк

              resolve(textContent);
            } catch (err) {
              reject(`Error parsing HTML: ${err.message}`);
            }
          } else {
            console.log("\n=== RAW TEXT ===\n");
            console.log(decoded);
            console.log("\n===================\n");
            resolve(decoded);
          }
        };

        if (encoding === "gzip") {
          console.log("Decompressing GZIP...");
          zlib.gunzip(buffer, (err, decoded) => {
            if (err) reject(`Error decoding gzip: ${err.message}`);
            else handleDecodedResponse(decoded.toString());
          });
        } else if (encoding === "deflate") {
          console.log("Decompressing DEFLATE...");
          zlib.inflate(buffer, (err, decoded) => {
            if (err) reject(`Error decoding deflate: ${err.message}`);
            else handleDecodedResponse(decoded.toString());
          });
        } else if (encoding === "br") {
          console.log("Decompressing Brotli...");
          zlib.brotliDecompress(buffer, (err, decoded) => {
            if (err) reject(`Error decoding brotli: ${err.message}`);
            else handleDecodedResponse(decoded.toString());
          });
        } else {
          handleDecodedResponse(buffer.toString());
        }
      });
    });

    req.on("error", (err) => {
      reject(`Request failed: ${err.message}`);
    });

    req.end();
  });
};

module.exports = { makeRequest };
