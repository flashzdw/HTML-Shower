const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    ...devices["Pixel 7"],
    baseURL: "http://127.0.0.1:4173"
  },
  webServer: {
    command: "python3 -m http.server 4173 --directory .",
    port: 4173,
    reuseExistingServer: !process.env.CI
  }
});
