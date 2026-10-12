import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  globalTeardown: "./teardown.ts",
  testDir: "./remote",
  workers: 1,
  timeout: 30000,
  reporter: "list",
  expect: { timeout: 15000 },
  use: {
    ...devices["Pixel 7"],
    browserName: "chromium",
    baseURL: "http://127.0.0.1:4174",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "node tests/e2e/serve.mjs",
    cwd: process.cwd(),
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    env: { PORT: "4174", STATIC_DIR: ".tools/remote-test-dist" },
  },
});
