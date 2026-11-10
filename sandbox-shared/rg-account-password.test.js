/* Password-manager fields in the sandbox account dialog.
   Run: NODE_PATH=/tmp/pw/node_modules node sandbox-shared/rg-account-password.test.js
   Needs playwright-core (or playwright) and Chrome. */
"use strict";
var http = require("http");
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var PORT = 9877;
var PASS = "correct-horse";

function types(p) {
  if (p.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}
function serve() {
  var page = "<!doctype html><html lang=\"he\"><head><meta charset=\"utf-8\"></head><body>" +
    "<span data-rg-account></span><script src=\"/sandbox-shared/rg-account.js\"></script></body></html>";
  return http.createServer(function (req, res) {
    var u = decodeURIComponent((req.url || "/").split("?")[0]);
    if (u === "/pw-form.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(page);
      return;
    }
    var file = path.normalize(path.join(ROOT, u));
    if (file.indexOf(ROOT) !== 0) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, function (err, buf) {
      if (err) { res.writeHead(404); res.end("missing"); return; }
      res.writeHead(200, { "content-type": types(file), "cache-control": "no-store" });
      res.end(buf);
    });
  });
}
function accountUser() {
  return JSON.stringify({ $id: "qa-pw", email: "qa@example.com", name: "QA", passwordUpdate: "" });
}

async function main() {
  var chromium;
  try { chromium = require("playwright").chromium; }
  catch (e) { chromium = require("playwright-core").chromium; }
  var server = serve();
  await new Promise(function (resolve) { server.listen(PORT, "127.0.0.1", resolve); });
  var browser = await chromium.launch({
    executablePath: process.env.CHROME || "/usr/local/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"]
  });
  var failed = 0;
  function check(cond, msg) {
    if (!cond) { console.error("FAIL " + msg); failed++; }
    else console.log("ok " + msg);
  }
  try {
    var sign = await browser.newContext();
    var signPage = await sign.newPage();
    await signPage.goto("http://127.0.0.1:" + PORT + "/pw-form.html", { waitUntil: "domcontentloaded" });
    await signPage.waitForSelector("[data-rg-account] button");
    await signPage.click("[data-rg-account] button");
    await signPage.click("[data-a=pw]");
    await signPage.waitForSelector("form[data-f=pw]");
    var signMarkup = await signPage.evaluate(function () {
      var form = document.querySelector("form[data-f=pw]");
      var email = document.getElementById("rgacc-email");
      var pw = document.getElementById("rgacc-pw");
      return {
        form: form && form.tagName,
        emailName: email && email.getAttribute("name"),
        emailAc: email && email.getAttribute("autocomplete"),
        pwType: pw && pw.type,
        pwName: pw && pw.getAttribute("name"),
        pwAc: pw && pw.getAttribute("autocomplete"),
        submit: form && form.querySelector("button[type=submit]") ? 1 : 0
      };
    });
    check(signMarkup.form === "FORM" && signMarkup.submit === 1, "password sign-in is a real form");
    check(signMarkup.emailName === "username" && signMarkup.emailAc === "username", "the sign-in email is a username field");
    check(signMarkup.pwType === "password" && signMarkup.pwName === "current-password" && signMarkup.pwAc === "current-password", "the sign-in password has a unique name and current-password autocomplete");
    await sign.close();

    var saved = null;
    var ctx = await browser.newContext();
    var page = await ctx.newPage();
    await page.route("https://fra.cloud.appwrite.io/**", function (route) {
      var req = route.request();
      var url = new URL(req.url());
      if (req.method() === "PATCH" && url.pathname === "/v1/account/password") {
        try { saved = JSON.parse(req.postData() || "{}"); } catch (e) { saved = {}; }
        return route.fulfill({
          status: 200, contentType: "application/json",
          body: JSON.stringify({ $id: "qa-pw", email: "qa@example.com", name: "QA", passwordUpdate: "2026-01-01T00:00:00.000+00:00" })
        });
      }
      if (url.pathname === "/v1/account" || url.pathname === "/v1/account/") {
        return route.fulfill({ status: 200, contentType: "application/json", body: accountUser() });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    await page.addInitScript(function () {
      localStorage.setItem("rg-account-user", JSON.stringify({ id: "qa-pw", email: "qa@example.com", name: "QA" }));
    });
    await page.goto("http://127.0.0.1:" + PORT + "/pw-form.html", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-rg-account] button");
    await page.click("[data-rg-account] button");
    await page.waitForSelector("[data-a=setpw]");
    await page.click("[data-a=setpw]");
    await page.waitForSelector("#rgacc-newpw");
    var markup = await page.evaluate(function () {
      var form = document.querySelector("form[data-f=setpw]");
      var user = document.getElementById("rgacc-user");
      var a = document.getElementById("rgacc-newpw");
      var b = document.getElementById("rgacc-newpw2");
      return {
        form: form && form.tagName,
        submit: form && form.querySelector("button[type=submit]") ? 1 : 0,
        userName: user && user.getAttribute("name"),
        userAc: user && user.getAttribute("autocomplete"),
        userRead: user && user.readOnly,
        userValue: user && user.value,
        aName: a && a.getAttribute("name"),
        aAc: a && a.getAttribute("autocomplete"),
        aType: a && a.type,
        bName: b && b.getAttribute("name"),
        bAc: b && b.getAttribute("autocomplete"),
        bType: b && b.type
      };
    });
    check(markup.form === "FORM" && markup.submit === 1, "set-password is a real form and Enter can submit it");
    check(markup.userName === "username" && markup.userAc === "username" && markup.userRead && markup.userValue === "qa@example.com", "the account email is a readonly username field");
    check(markup.aType === "password" && markup.aName === "new-password" && markup.aAc === "new-password" && markup.bType === "password" && markup.bName === "confirm-password" && markup.bAc === "new-password", "the new password fields have unique names and new-password autocomplete");
    await page.evaluate(function (pass) {
      function fill(id) {
        var el = document.getElementById(id);
        el.value = pass;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      }
      fill("rgacc-newpw");
      fill("rgacc-newpw2");
    }, PASS);
    await page.evaluate(function () { document.documentElement.setAttribute("lang", "en"); });
    await page.waitForTimeout(50);
    var lens = await page.evaluate(function () {
      return {
        a: document.getElementById("rgacc-newpw").value.length,
        b: document.getElementById("rgacc-newpw2").value.length
      };
    });
    check(lens.a === PASS.length && lens.b === PASS.length, "a re-render does not clear a value set with input and change events");
    await page.locator("#rgacc-newpw2").press("Enter");
    var until = Date.now() + 5000;
    while (!saved && Date.now() < until) await page.waitForTimeout(50);
    var err = await page.locator(".rgacc-err").innerText();
    check(err.indexOf("לפחות 8 תווים") === -1 && err.indexOf("at least 8") === -1, "save does not report the password as empty");
    check(saved && saved.password === PASS, "the password from input and change events is the one that is saved");
    await ctx.close();
  } finally {
    await browser.close();
    server.close();
  }
  if (failed) { console.error(failed + " password check(s) failed"); process.exit(1); }
  console.log("password checks passed");
}

main().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});
