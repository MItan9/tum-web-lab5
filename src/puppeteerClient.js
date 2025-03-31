const puppeteer = require("puppeteer");

const searchWithPuppeteer = async (query) => {
  const browser = await puppeteer.launch({
    headless: true, // true - без окна браузера, false - с окном (для отладки)
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const page = await browser.newPage();

  // Устанавливаем User-Agent для имитации реального браузера
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
  );

  console.log(`Searching for: "${query}"`);

  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: "networkidle2" }); // Ждём полной загрузки страницы

  console.log(`Fetching search results from: ${url}`);

  // Ждём появления результата
  await page.waitForSelector(".result");

  // Парсим результаты
  const results = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll(".result__title a").forEach((el) => {
      items.push({
        title: el.innerText,
        link: el.href,
      });
    });
    return items;
  });

  await browser.close();

  if (results.length === 0) {
    throw new Error("No results found.");
  }

  return results;
};

module.exports = { searchWithPuppeteer };
