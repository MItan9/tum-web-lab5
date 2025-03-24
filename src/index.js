const minimist = require("minimist");
const { makeRequest } = require("./httpClient");

const args = minimist(process.argv.slice(2));

const showHelp = () => {
  console.log(`
Usage:
  go2web -u <URL>         Make an HTTP request to the specified URL and print the response.
  go2web -h               Show this help.
`);
};

const main = async () => {
  if (args.h) {
    showHelp();
  } else if (args.u) {
    try {
      console.log(`Sending request to ${args.u}...`);
      const response = await makeRequest(args.u);
      console.log("\nResponse:\n");
      console.log(response);
    } catch (err) {
      console.error(err);
    }
  } else {
    showHelp();
  }
};

main();
