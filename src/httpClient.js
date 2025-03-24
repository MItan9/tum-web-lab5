const net = require("net");
const url = require("url");

const makeRequest = (targetUrl) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new url.URL(targetUrl);
    const host = parsedUrl.hostname;
    const path = parsedUrl.pathname || "/";
    const port = 80;

    const client = new net.Socket();

    client.connect(port, host, () => {
      console.log(`Connected to ${host}:${port}`);

      const request =
        `GET ${path} HTTP/1.1\r\n` +
        `Host: ${host}\r\n` +
        `Connection: close\r\n\r\n`;

      client.write(request);
    });

    let response = "";

    // Читаем данные из потока
    client.on("data", (data) => {
      response += data.toString();
    });

    client.on("end", () => {
      // Разделяем заголовки и тело ответа
      const [headers, body] = response.split("\r\n\r\n");
      console.log("HEADERS:", headers);

      // Извлекаем Content-Type из заголовков
      const contentTypeMatch = headers.match(/Content-Type: (.+)/);
      const contentType = contentTypeMatch
        ? contentTypeMatch[1].split(";")[0]
        : null;

      let output;

      if (contentType === "application/json") {
        try {
          // Парсим JSON и форматируем красиво
          output = JSON.stringify(JSON.parse(body), null, 2);
        } catch (err) {
          output = `Invalid JSON: ${err.message}`;
        }
      } else if (contentType === "text/html") {
        // Убираем HTML-теги, оставляя только текст
        output = body
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Убираем теги <script>
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Убираем теги <style>
          .replace(/<\/?[^>]+(>|$)/g, "") // Убираем все HTML-теги
          .replace(/\s+/g, " ") // Убираем лишние пробелы
          .trim(); // Обрезаем начальные и конечные пробелы
      } else {
        // Если неизвестный формат — просто выводим тело ответа как текст
        output = body;
      }

      resolve(output);
    });

    client.on("error", (err) => {
      reject(`Error: ${err.message}`);
    });
  });
};

module.exports = { makeRequest };
