/* An existing shared-account session must drive the Wealthify footer.
   Run: node wealthify/session.test.js
   The session is the same localStorage pair Listify already keeps: rg-account-user and cookieFallback. */
"use strict";
var http = require("http");
var fs = require("fs");
var path = require("path");
var ROOT = path.join(__dirname, "..");
var PORT = 8779;
module.paths.unshift(path.join(ROOT, "tests/node_modules"));

function typeOf(p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".json")) return "application/json";
  if (p.endsWith(".svg")) return "image/svg+xml";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

function startServer() {
  return new Promise(function (resolve) {
    var server = http.createServer(function (req, res) {
      var rel = decodeURIComponent((req.url || "/").split("?")[0]);
      if (rel.endsWith("/")) rel += "index.html";
      var file = path.normalize(path.join(ROOT, rel));
      if (file.indexOf(ROOT) !== 0) { res.writeHead(403); res.end(); return; }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
      fs.readFile(file, function (err, buf) {
        if (err) { res.writeHead(404); res.end("missing"); return; }
        res.writeHead(200, { "content-type": typeOf(file), "cache-control": "no-store" });
        res.end(buf);
      });
    });
    server.listen(PORT, "127.0.0.1", function () { resolve(server); });
  });
}

function fail(msg) { console.error("FAIL " + msg); process.exitCode = 1; }
function ok(msg) { console.log("ok " + msg); }

(async function () {
  var chromium;
  try { chromium = require("playwright").chromium; }
  catch (e) { chromium = require("playwright-core").chromium; }
  var server = await startServer();
  var browser = await chromium.launch({ channel: "chrome", headless: true });
  var page = await browser.newPage({ viewport: { width: 393, height: 780 }, locale: "he-IL" });
  var errors = [];
  page.on("pageerror", function (e) { errors.push(e.message); });
  await page.route("https://fra.cloud.appwrite.io/**", function (route) {
    var req = route.request();
    var url = req.url();
    var method = req.method();
    if (url.indexOf("/account") !== -1 && method === "GET") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ $id: "user-test", email: "ron@example.com", name: "Ron" })
      });
    }
    if (url.indexOf("/rows") !== -1 && method === "GET") {
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "missing", type: "document_not_found" }) });
    }
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ $id: "row", $updatedAt: "2026-11-26T10:15:00.000Z", app: "wealthify" })
    });
  });
  await page.addInitScript(function () {
    localStorage.setItem("rg-account-user", JSON.stringify({ id: "user-test", email: "ron@example.com", name: "Ron" }));
    localStorage.setItem("cookieFallback", "existing-session");
    localStorage.setItem("rg-wealth-answers-v2", JSON.stringify({ v: 1, answers: { equity: "debt" }, completed: false, updated: "2026-01-01T00:00:00.000Z" }));
  });
  await page.goto("http://127.0.0.1:" + PORT + "/wealthify/?session=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(function () {
    var s = document.getElementById("status");
    return s && s.textContent.indexOf("מסונכרן") !== -1 && s.textContent.indexOf("בלי חשבון") === -1;
  }, null, { timeout: 8000 });
  var lines = await page.evaluate(function () {
    return {
      status: document.getElementById("status").textContent,
      last: document.getElementById("lastsync").textContent,
      cloud: document.getElementById("cloudat").textContent,
      kept: JSON.parse(localStorage.getItem("rg-wealth-answers-v2") || "{}")
    };
  });
  if (lines.status.indexOf("מסונכרן") !== -1 && lines.status.indexOf("בלי חשבון") === -1) ok("footer shows the signed-in state");
  else fail("footer stayed signed out: " + lines.status);
  if (/\d/.test(lines.last) && lines.last.indexOf("—") === -1) ok("last sync time is a real time");
  else fail("last sync time was not set: " + lines.last);
  if (/\d/.test(lines.cloud) && lines.cloud.indexOf("—") === -1) ok("cloud time is a real time");
  else fail("cloud time was not set: " + lines.cloud);
  if (lines.kept.answers && lines.kept.answers.equity === "debt") ok("existing local answers were kept");
  else fail("local answers were overwritten");
  if (!errors.length) ok("no page errors");
  else fail(errors.join(" | "));
  await browser.close();
  server.close();
  if (process.exitCode) process.exit(process.exitCode);
})().catch(function (e) {
  console.error(e);
  process.exit(1);
});
