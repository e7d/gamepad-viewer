const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
    testDir: "tests",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? "github" : "list",
    use: {
        baseURL: "http://localhost:8100",
        headless: true,
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "python3 -m http.server 8100",
        url: "http://localhost:8100",
        reuseExistingServer: !process.env.CI,
        stdout: "ignore",
        stderr: "ignore",
    },
});
