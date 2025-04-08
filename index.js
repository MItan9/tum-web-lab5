#!/usr/bin/env node

const minimist = require("minimist");
const { makeRequest } = require("./src/httpClient");
const { searchWithPuppeteer } = require("./src/puppeteerClient");
const fs = require("fs");
const path = require("path");

const args = minimist(process.argv.slice(2), {
  string: ["s", "u"],
  alias: { h: "help", s: "search", u: "url" },
  stopEarly: false,
});

// Объединяем все слова после -s в одну строку, даже если не в кавычках
const sIndex = process.argv.findIndex(arg => arg === "-s" || arg === "--search");
if (sIndex !== -1) {
  args.s = process.argv.slice(sIndex + 1).filter(arg => !arg.startsWith('-')).join(" ");
}

const showHelp = () => {
  console.log(`
Usage:
  go2web -u <URL>         Make an HTTP request and print the response (uses cache).
  go2web -s <search-term> Search and print top 10 results from DuckDuckGo.
  go2web -h               Show this help.
`);
};

const getCachePath = (url) => {
  const cacheDir = path.join(__dirname, "cache");
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);
  const filename = encodeURIComponent(url) + ".txt";
  return path.join(cacheDir, filename);
};

const main = async () => {
  if (args.h) {
    showHelp();
  } else if (args.u) {
    try {
      const cacheFile = getCachePath(args.u);

      if (fs.existsSync(cacheFile)) {
        console.log(`Loaded from cache: ${args.u}`);
        const cached = fs.readFileSync(cacheFile, "utf8");
        console.log("\nCached Response:\n");
        console.log(cached);
      } else {
        console.log(`Fetching URL: ${args.u}`);

const response = await makeRequest(args.u);


        fs.writeFileSync(cacheFile, response);
        console.log("\nResponse:\n");
        console.log(response);
      }
    } catch (err) {
      console.error(`Request failed: ${err.message}`);
    }
  } else if (args.s) {
    try {
      console.log(`Searching for: "${args.s}"...`);
      const results = await searchWithPuppeteer(args.s);
      console.log("\nTop 10 results:");
      results.forEach((result, index) => {
        console.log(`${index + 1}. ${result.title}`);
        console.log(`   ${result.link}`);
      });
    } catch (err) {
      console.error(`Search failed: ${err.message}`);
    }
  } else {
    showHelp();
  }
};

main();
