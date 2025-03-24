const { makeRequest } = require("./httpClient");
const { JSDOM } = require("jsdom");

const search = async (query) => {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  console.log(`Fetching search results from: ${url}`);

  const html = await makeRequest(url);

  const fs = require("fs");
  fs.writeFileSync("output.html", html);
  console.log("HTML saved to output.html");

  console.log("\n=== DEBUG: RAW HTML ===\n");
  console.log(html); // ➡️ Полный HTML-код страницы
  console.log("\n=======================\n");

  const dom = new JSDOM(html);
  const document = dom.window.document;

  const results = [];

  // Попробуем разные селекторы
  document.querySelectorAll('a[href^="http"]').forEach((link) => {
    if (results.length < 10) {
      results.push({
        title: link.textContent.trim(),
        link: link.href.startsWith("http")
          ? link.href
          : `https://duckduckgo.com${link.href}`,
      });
    }
  });

  if (results.length === 0) {
    throw new Error("No results found.");
  }

  return results;
};

module.exports = { search };
