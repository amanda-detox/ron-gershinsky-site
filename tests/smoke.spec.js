"use strict";

const { test, expect } = require("@playwright/test");
const { LIVE_SITE, sandboxes, home, apps } = require("./pages");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function siteHostname() {
  try {
    return new URL(process.env.BASE_URL || LIVE_SITE).hostname;
  } catch (e) {
    return "";
  }
}

/** A write to the site or to Appwrite would change real data. Embedded players are not that. */
function isOurData(url, siteHost) {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch (e) {
    return true;
  }
  if (!host) return true;
  if (host === siteHost) return true;
  return host === "appwrite.io" || host.endsWith(".appwrite.io");
}

/**
 * Open one page and refuse anything that would change data.
 * The browser is a brand-new profile, so it is signed out.
 * Nothing in this test clicks, types, or submits a form.
 */
async function loadReadOnly(page, path) {
  const writes = [];
  const consoleErrors = [];
  const pageErrors = [];
  const siteHost = siteHostname();

  await page.route("**/*", (route) => {
    const request = route.request();
    if (SAFE_METHODS.has(request.method())) return route.continue();
    if (isOurData(request.url(), siteHost)) {
      writes.push(request.method() + " " + request.url());
      return route.abort("aborted");
    }
    return route.continue();
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err && err.message ? err.message : String(err));
  });

  const response = await page.goto(path, { waitUntil: "domcontentloaded" });
  expect(response, "the browser did not receive a page").not.toBeNull();
  expect(response.status(), response.url()).toBeLessThan(400);
  expect(response.headers()["content-type"] || "", response.url()).toContain("text/html");

  await page.waitForLoadState("load");
  /* Late account checks and script errors show up just after load.
     networkidle is capped so a page that keeps a connection open still finishes. */
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});

  const rendered = await page.evaluate(() => {
    const body = document.body;
    const text = ((body && body.innerText) || "").replace(/\s+/g, " ").trim();
    let visible = false;
    if (body) {
      const nodes = body.querySelectorAll("*");
      for (let i = 0; i < nodes.length; i++) {
        const el = nodes[i];
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const box = el.getBoundingClientRect();
        if (box.width > 8 && box.height > 8) {
          visible = true;
          break;
        }
      }
    }
    return {
      title: (document.title || "").trim(),
      textLength: text.length,
      sample: text.slice(0, 240),
      visible: visible,
    };
  });

  expect(rendered.title, "the page should have a title").not.toBe("");
  expect(
    rendered.textLength > 0 || rendered.visible,
    "the page should show something. Saw: " + JSON.stringify(rendered.sample)
  ).toBe(true);

  expect(writes, "a signed-out visit tried to change data. The test blocked it.").toEqual([]);
  expect(pageErrors, "JavaScript crashed while the page was loading").toEqual([]);
  expect(consoleErrors, "the browser console reported errors").toEqual([]);

  return rendered;
}

test.describe("sandbox pages", () => {
  for (const info of sandboxes) {
    test(info.name + " renders", async ({ page }) => {
      const rendered = await loadReadOnly(page, info.path);
      const visible = (rendered.title + " " + rendered.sample).toLowerCase();
      expect(visible, "the sandbox label should be on screen").toContain("sandbox");
    });
  }
});

test.describe("home page", () => {
  test(home.name + " loads", async ({ page }) => {
    await loadReadOnly(page, home.path);
  });
});

test.describe("other app pages", () => {
  for (const info of apps) {
    test(info.name + " loads", async ({ page }) => {
      await loadReadOnly(page, info.path);
    });
  }
});
