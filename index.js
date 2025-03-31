#!/usr/bin/env node

const minimist = require("minimist");
const { makeRequest } = require("./src/httpClient");
const { searchWithPuppeteer } = require("./src/puppeteerClient");

const args = minimist(process.argv.slice(2));

const showHelp = () => {
  console.log(`
Usage:
  go2web -u <URL>         Make an HTTP request to the specified URL and print the response.
  go2web -s <search-term> Make an HTTP request to search the term using your favorite search engine and print top 10 results.
  go2web -h               Show this help.
`);
};

const main = async () => {
  if (args.h) {
    showHelp();
  } else if (args.u) {
    try {
      console.log(`Fetching URL: ${args.u}`);
      const response = await makeRequest(args.u);
      console.log("\nResponse:\n");
      console.log(response);
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
