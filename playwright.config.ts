import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 0,
  timeout: 30000,
  use: { baseURL: "http://127.0.0.1:8790", trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "PORT=8790 APP_ORIGIN=http://127.0.0.1:8790 npm start",
    url: "http://127.0.0.1:8790/api/health",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
