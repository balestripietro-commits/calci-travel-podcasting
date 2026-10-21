import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 4173);
const remoteBaseURL = process.env.E2E_BASE_URL
  ? `${process.env.E2E_BASE_URL.replace(/\/+$/, "")}/`
  : undefined;
const baseURL = remoteBaseURL || `http://127.0.0.1:${port}`;
const staticRoot = process.env.E2E_STATIC_ROOT || ".";
const lowMobileSpec = /low-mobile\.spec\.mjs/;
const productionSmokeSpec = /production-smoke\.spec\.mjs/;
const externalLinksSpec = /external-links\.spec\.mjs/;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./work/e2e-results",
  timeout: 30_000,
  expect: {
    timeout: 6_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["line"],
    ["html", { open: "never", outputFolder: "./work/e2e-report" }],
  ],
  use: {
    baseURL,
    channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || "chrome",
    headless: true,
    locale: "it-IT",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
    video: "off",
    launchOptions: {
      args: ["--autoplay-policy=no-user-gesture-required"],
    },
  },
  webServer: remoteBaseURL
    ? undefined
    : {
        command: `E2E_STATIC_ROOT=${JSON.stringify(staticRoot)} node dev-server.mjs ${port}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 15_000,
        stdout: "ignore",
        stderr: "ignore",
      },
  projects: [
    {
      name: "desktop-chrome",
      testIgnore: [lowMobileSpec, externalLinksSpec],
      use: {
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "mobile-chrome",
      testIgnore: [lowMobileSpec, externalLinksSpec],
      use: {
        ...devices["Pixel 7"],
        channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || "chrome",
      },
    },
    {
      name: "mobile-low-chrome",
      testMatch: [lowMobileSpec, productionSmokeSpec],
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 375, height: 667 },
        channel: process.env.PLAYWRIGHT_BROWSER_CHANNEL || "chrome",
      },
    },
  ],
});
