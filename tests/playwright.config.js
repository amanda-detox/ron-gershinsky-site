"use strict";

const { defineConfig, devices } = require("@playwright/test");
const { LIVE_SITE } = require("./pages");

function baseURL() {
  const raw = (process.env.BASE_URL || LIVE_SITE).trim();
  return raw.endsWith("/") ? raw : raw + "/";
}

module.exports = defineConfig({
  testDir: ".",
  testMatch: "*.spec.js",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 3 : undefined,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL: baseURL(),
    browserName: "chromium",
    /* A fresh profile every test: no saved sign-in, no cached account. */
    serviceWorkers: "block",
    screenshot: "on",
    trace: "on-first-retry",
    video: "off",
    locale: "he-IL",
  },
  projects: [
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        browserName: "chromium",
        viewport: { width: 1280, height: 800 },
      },
    },
  ],
});
