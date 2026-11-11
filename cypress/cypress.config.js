const { defineConfig } = require("cypress");

module.exports = defineConfig({
  allowCypressEnv: false,
  screenshotOnRunFailure: true,
  retries: 0,

  e2e: {
    baseUrl: "http://localhost:3000",
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },

  component: {
    devServer: {
      framework: "react",
      bundler: "webpack",
    },
  },
});
