const { makeRequest } = require("./httpClient");
const { JSDOM } = require("jsdom");

const searchWithHttpClient = async (query) => {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  console.log(`Fetching search results from: ${url}`);
  const html = await makeRequest(url);

  const dom = new JSDOM(html);
  const document = dom.window.document;
  const results = [];

  document.querySelectorAll(".result__title a").forEach((el) => {
    const title = el.textContent.trim();
    const link = el.href;
    if (title && link && results.length < 10) {
      results.push({ title, link });
    }
  });

  if (results.length === 0) {
    throw new Error("No results found.");
  }

  return results;
};

module.exports = { searchWithHttpClient };
