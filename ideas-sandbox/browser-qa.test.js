/* Headless-browser check for the sandbox page.
   Run: node ideas-sandbox/browser-qa.test.js
   Needs playwright-core (or playwright) and Chrome. */
"use strict";
var http = require("http");
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "..");
var PORT = 9876;
var UID = "qa-user";
var CLASH = "התנגשות בעריכה: נשמרה הגרסה האחרונה, הגרסה השנייה בהיסטוריה";
var STAY = "הישאר מחובר";
var ANYWAY = "צא בכל זאת";

function rec(text, at, sec) {
  sec = sec || "tasks";
  return {
    id: "a", sec: sec, text: text, done: false, order: 1, created: 1000, at: at,
    _f: { text: at, "~": at, sec: at, done: at, order: at, created: at }
  };
}
function types(p) {
  if (p.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".svg")) return "image/svg+xml";
  if (p.endsWith(".json")) return "application/json";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}
function serve() {
  return http.createServer(function (req, res) {
    var u = decodeURIComponent((req.url || "/").split("?")[0]);
    var file = path.normalize(path.join(ROOT, u));
    if (file.indexOf(ROOT) !== 0) { res.writeHead(403); res.end(); return; }
    fs.stat(file, function (err, st) {
      if (!err && st.isDirectory()) file = path.join(file, "index.html");
      fs.readFile(file, function (e2, buf) {
        if (e2) { res.writeHead(404); res.end("missing"); return; }
        res.writeHead(200, { "content-type": types(file), "cache-control": "no-store" });
        res.end(buf);
      });
    });
  });
}
function userScript(extra) {
  return "try{" +
    "localStorage.setItem('rg-lang','he');" +
    "localStorage.setItem('rg-account-user'," + JSON.stringify(JSON.stringify({ id: UID, email: "qa@example.com", name: "QA" })) + ");" +
    extra +
    "}catch(e){}";
}
function cacheScript(text, at, pending, sec) {
  var doc = { items: { a: rec(text, at, sec) }, pending: !!pending, seeded: true };
  var base = { a: rec("מקור", 1000) };
  return "localStorage.setItem('rg-sbx-ideas-v1:" + UID + "'," + JSON.stringify(JSON.stringify(doc)) + ");" +
    "localStorage.setItem('rg-sbx-ideas-base:" + UID + "'," + JSON.stringify(JSON.stringify(base)) + ");" +
    "localStorage.setItem('rg-sbx-ideas-lastsync:" + UID + "','1');";
}
function installCloud(page, store) {
  return page.route("https://fra.cloud.appwrite.io/**", function (route) {
    var req = route.request();
    var url = new URL(req.url());
    var method = req.method();
    if (url.pathname === "/v1/account" || url.pathname === "/v1/account/") {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({ $id: UID, email: "qa@example.com", name: "QA", passwordUpdate: "2020-01-01T00:00:00.000+00:00" })
      });
    }
    var row = url.pathname.match(/\/rows\/([^/]+)$/);
    if (url.pathname.indexOf("/rows") !== -1 && method === "POST") {
      var created = {};
      try { created = JSON.parse(req.postData() || "{}"); } catch (e) {}
      var id = created.rowId;
      store[id] = created.data && created.data.value;
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ $id: id, value: store[id] || "" }) });
    }
    if (row && method === "GET") {
      if (!Object.prototype.hasOwnProperty.call(store, row[1])) {
        return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ message: "missing", type: "document_not_found" }) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ $id: row[1], value: store[row[1]] }) });
    }
    if (row && (method === "PATCH" || method === "PUT")) {
      var patched = {};
      try { patched = JSON.parse(req.postData() || "{}"); } catch (e2) {}
      store[row[1]] = patched.data && patched.data.value;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ $id: row[1], value: store[row[1]] || "" }) });
    }
    if (method === "DELETE") return route.fulfill({ status: 204, body: "" });
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
}
function cloudValue(store, kind) {
  var id, v;
  for (id in store) {
    try { v = JSON.parse(store[id]); } catch (e) { continue; }
    if (kind === "items" && v && v.items) return v;
    if (kind === "history" && v && Array.isArray(v.snaps)) return v;
  }
  return null;
}
function waitFor(fn, ms) {
  var t0 = Date.now();
  return new Promise(function (resolve, reject) {
    (function tick() {
      var v;
      try { v = fn(); } catch (e) { v = null; }
      if (v) return resolve(v);
      if (Date.now() - t0 > ms) return reject(new Error("timed out"));
      setTimeout(tick, 100);
    })();
  });
}

async function main() {
  var chromium;
  try { chromium = require("playwright").chromium; }
  catch (e) { chromium = require("playwright-core").chromium; }
  var server = serve();
  await new Promise(function (resolve) { server.listen(PORT, "127.0.0.1", resolve); });
  var chrome = process.env.CHROME || "/usr/local/bin/google-chrome";
  var browser = await chromium.launch({ executablePath: chrome, headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  var failed = 0;
  function check(cond, msg) {
    if (!cond) { console.error("FAIL " + msg); failed++; }
    else console.log("ok " + msg);
  }
  try {
    var sign = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    var signPage = await sign.newPage();
    var signErr = [];
    signPage.on("pageerror", function (err) { signErr.push(String(err)); });
    await signPage.route("https://fra.cloud.appwrite.io/**", function (route) { route.abort(); });
    await signPage.addInitScript(userScript(cacheScript("QA-UNSYNCED", Date.now(), true)));
    await signPage.goto("http://127.0.0.1:" + PORT + "/ideas-sandbox/", { waitUntil: "domcontentloaded" });
    await signPage.waitForFunction(function () { return document.getElementById("build") && document.getElementById("build").textContent === "rg-sbx-ideas-v18"; });
    check(true, "the on-screen label shows rg-sbx-ideas-v18");
    var srcs = await signPage.evaluate(function () {
      return Array.prototype.map.call(document.scripts, function (s) { return s.src || ""; }).join("\n");
    });
    check(srcs.indexOf("app.js?v=55") !== -1 && srcs.indexOf("rg-sync-status.js?v=10") !== -1 && srcs.indexOf("rg-account.js?v=3") !== -1, "the page loads the bumped scripts");
    await signPage.evaluate(function () { document.getElementById("build").textContent = "rg-sbx-ideas-v8"; });
    await signPage.evaluate(function () { window.dispatchEvent(new Event("online")); });
    await signPage.waitForFunction(function () { return document.getElementById("build").textContent === "rg-sbx-ideas-v18"; });
    check(true, "the running script rewrites a stale v8 label");
    await sign.setOffline(true);
    await signPage.waitForSelector("[data-rg-account] button");
    await signPage.click("[data-rg-account] button");
    await signPage.waitForSelector(".rgacc-back [data-a=out]");
    await signPage.click(".rgacc-back [data-a=out]");
    await signPage.waitForSelector("#rg-choice-back");
    var choice = await signPage.locator("#rg-choice-back").innerText();
    check(choice.indexOf(STAY) !== -1 && choice.indexOf(ANYWAY) !== -1, "offline sign-out on the real button asks " + STAY + " / " + ANYWAY);
    check(choice.indexOf("שינויים שטרם סונכרנו") !== -1, "the question names the unsynced changes");
    await signPage.locator("#rg-choice-back button.no").click();
    await signPage.waitForFunction(function (uid) {
      var raw = localStorage.getItem("rg-sbx-ideas-hist:" + uid);
      return raw && raw.indexOf("גיבוי לפני יציאה") !== -1;
    }, UID);
    check(true, "signing out anyway stores a labeled backup in version history");
    check(signErr.length === 0, "the sign-out page runs without a script error");
    if (signErr.length) console.error(signErr.join(" | "));
    await sign.close();

    var store = {};
    var a = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    var b = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    var pageA = await a.newPage();
    var pageB = await b.newPage();
    var clashErr = [];
    pageA.on("pageerror", function (err) { clashErr.push("A " + err); });
    pageB.on("pageerror", function (err) { clashErr.push("B " + err); });
    await installCloud(pageA, store);
    await installCloud(pageB, store);
    await pageA.addInitScript(userScript(cacheScript("מ-א", 3500, true)));
    await pageA.goto("http://127.0.0.1:" + PORT + "/ideas-sandbox/", { waitUntil: "domcontentloaded" });
    await waitFor(function () {
      var doc = cloudValue(store, "items");
      return doc && doc.items.a && doc.items.a.text === "מ-א";
    }, 15000);
    await new Promise(function (r) { setTimeout(r, 1500); });
    check(true, "device A published its text first");
    await pageB.addInitScript(userScript(cacheScript("מ-ב", 2000, true)));
    await pageB.goto("http://127.0.0.1:" + PORT + "/ideas-sandbox/", { waitUntil: "domcontentloaded" });
    await pageB.waitForFunction(function (note) {
      var el = document.getElementById("clash");
      return el && el.textContent.indexOf(note) !== -1;
    }, CLASH);
    check(true, "the device that syncs second shows the clash notice");
    await waitFor(function () {
      var hist = cloudValue(store, "history");
      if (!hist) return false;
      return hist.snaps.some(function (s) { return s && s.clash && String(s.label || "").indexOf("התנגשות") === 0 && String(s.label).indexOf("מ-ב") !== -1; });
    }, 15000);
    check(true, "the cloud history row is labeled with the losing text");
    await pageA.evaluate(function () { window.dispatchEvent(new Event("online")); });
    await pageA.waitForFunction(function (note) {
      var el = document.getElementById("clash");
      return el && el.textContent.indexOf(note) !== -1;
    }, CLASH);
    check(true, "the device that synced first shows the same clash notice");
    await pageB.click("#hist-btn");
    await pageB.waitForFunction(function () {
      var sheet = document.getElementById("sheet");
      return sheet && sheet.textContent.indexOf("התנגשות:") !== -1 && sheet.textContent.indexOf("מ-ב") !== -1;
    });
    await pageA.click("#hist-btn");
    await pageA.waitForFunction(function () {
      var sheet = document.getElementById("sheet");
      return sheet && sheet.textContent.indexOf("התנגשות:") !== -1 && sheet.textContent.indexOf("מ-ב") !== -1;
    });
    check(true, "both devices show the labeled clash row in version history");
    check(clashErr.length === 0, "the clash pages run without a script error");
    if (clashErr.length) console.error(clashErr.join(" | "));
    await a.close();
    await b.close();

    var snaps = [], hi;
    for (hi = 0; hi < 20; hi++) {
      snaps.push({
        id: "row-" + hi, t: 1000 + hi, lists: 3, items: 1,
        data: { a: rec(hi === 0 ? "OLDEST-TEXT" : ("v" + hi), 1000 + hi, "ideas") }
      });
    }
    var old = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    var oldPage = await old.newPage();
    var oldErr = [];
    oldPage.on("pageerror", function (err) { oldErr.push(String(err)); });
    await oldPage.route("https://fra.cloud.appwrite.io/**", function (route) { route.abort(); });
    await oldPage.addInitScript(userScript(
      cacheScript("CURRENT-NOW", 5000, true, "ideas") +
      "localStorage.setItem('rg-sbx-ideas-hist:" + UID + "'," + JSON.stringify(JSON.stringify(snaps)) + ");"
    ));
    await oldPage.goto("http://127.0.0.1:" + PORT + "/ideas-sandbox/", { waitUntil: "domcontentloaded" });
    await oldPage.waitForSelector("#hist-btn");
    await oldPage.click("#hist-btn");
    await oldPage.waitForSelector('[data-s="r:row-0"]');
    await oldPage.waitForTimeout(1000);
    await oldPage.click('[data-s="r:row-0"]');
    await oldPage.waitForFunction(function () {
      var sheet = document.getElementById("sheet");
      var body = document.body ? document.body.innerText : "";
      return !sheet && body.indexOf("OLDEST-TEXT") !== -1 && body.indexOf("CURRENT-NOW") === -1;
    });
    var keptOldest = await oldPage.evaluate(function (uid) {
      var raw = localStorage.getItem("rg-sbx-ideas-hist:" + uid);
      var rows = raw ? JSON.parse(raw) : [];
      var hasOld = false, hasNow = false, i;
      for (i = 0; i < rows.length; i++) {
        if (rows[i].id === "row-0") hasOld = true;
        if (rows[i].data && rows[i].data.a && rows[i].data.a.text === "CURRENT-NOW") hasNow = true;
      }
      return hasOld && hasNow && rows.length === 20;
    }, UID);
    check(keptOldest, "restoring the oldest row at the cap changes the list and keeps that row");
    var clashText = await oldPage.locator("#clash").innerText();
    check(clashText.indexOf("התנגשות בעריכה") === -1, "restoring a version does not show the clash notice");
    check(oldErr.length === 0, "the oldest-restore page runs without a script error");
    if (oldErr.length) console.error(oldErr.join(" | "));
    await old.close();

    var emptySnaps = [{ id: "empty-row", t: 1000, lists: 3, items: 0, data: {} }];
    var warn = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    var warnPage = await warn.newPage();
    var warnErr = [];
    warnPage.on("pageerror", function (err) { warnErr.push(String(err)); });
    await warnPage.route("https://fra.cloud.appwrite.io/**", function (route) { route.abort(); });
    await warnPage.addInitScript(userScript(
      cacheScript("KEEP-ME", 5000, true, "ideas") +
      "localStorage.setItem('rg-sbx-ideas-hist:" + UID + "'," + JSON.stringify(JSON.stringify(emptySnaps)) + ");"
    ));
    await warnPage.goto("http://127.0.0.1:" + PORT + "/ideas-sandbox/", { waitUntil: "domcontentloaded" });
    await warnPage.waitForSelector("#hist-btn");
    await warnPage.click("#hist-btn");
    await warnPage.waitForSelector('[data-s="r:empty-row"]');
    await warnPage.waitForTimeout(1000);
    await warnPage.click('[data-s="r:empty-row"]');
    await warnPage.waitForSelector("#rg-restore-back");
    var warnText = await warnPage.locator("#rg-restore-back").innerText();
    var warnLook = await warnPage.evaluate(function () {
      function nums(rgb) { var m = String(rgb || "").match(/\d+/g); return m ? m.slice(0, 3).map(Number) : [0, 0, 0]; }
      function red(rgb) { var c = nums(rgb); return c[0] > 180 && c[1] < 90 && c[2] < 90; }
      var box = document.querySelector(".rg-restore");
      var empty = document.querySelector(".rg-restore-empty");
      var gone = document.querySelector(".rg-restore-gone li");
      var go = document.querySelector(".rg-restore-go");
      var cancel = document.querySelector(".rg-restore-cancel");
      var bs = getComputedStyle(box), es = getComputedStyle(empty), gs = getComputedStyle(gone), gos = getComputedStyle(go);
      var buttons = Array.prototype.map.call(box.querySelectorAll("button"), function (b) { return b.textContent; });
      return {
        dir: box.getAttribute("dir"),
        radius: bs.borderRadius, pad: bs.padding,
        emptyWeight: es.fontWeight, emptyRed: red(es.color),
        strike: gs.textDecoration.indexOf("line-through") !== -1, goneRed: red(gs.color),
        goRed: red(gos.backgroundColor),
        buttons: buttons.join("|"),
        focus: document.activeElement ? document.activeElement.textContent : "",
        sheetBottom: box.getBoundingClientRect().bottom >= window.innerHeight - 24
      };
    });
    check(warnText.indexOf("לשחזר את הגרסה הזו?") !== -1 && warnText.indexOf("אחרי השחזור יישארו 0 פריטים. יוסרו 1 ויתווספו 0.") !== -1 && warnText.indexOf("הרשימה תתרוקן.") !== -1 && warnText.indexOf("KEEP-ME") !== -1, "the dialog states the counts and the item that would be removed");
    check(warnLook.dir === "rtl" && warnLook.buttons === "שחזור|ביטול" && warnLook.focus === "ביטול" && warnLook.radius === "12px" && warnLook.pad === "20px" && warnLook.sheetBottom && warnLook.strike && !warnLook.emptyRed && !warnLook.goneRed && !warnLook.goRed && Number(warnLook.emptyWeight) >= 700, "the sheet is a bottom sheet, cancel is focused, and the warning uses the existing accent");
    await warnPage.screenshot({ path: "/opt/cursor/artifacts/restore-warning.png" });
    await warnPage.locator("#rg-restore-back .rg-restore-cancel").click();
    await warnPage.waitForFunction(function () { return !document.getElementById("rg-restore-back"); });
    var afterCancel = await warnPage.evaluate(function (uid) {
      var raw = localStorage.getItem("rg-sbx-ideas-v1:" + uid);
      var hist = localStorage.getItem("rg-sbx-ideas-hist:" + uid);
      var body = document.body ? document.body.innerText : "";
      return { kept: body.indexOf("KEEP-ME") !== -1, cache: raw && raw.indexOf("KEEP-ME") !== -1, rows: hist ? JSON.parse(hist).length : 0 };
    }, UID);
    check(afterCancel.kept && afterCancel.cache && afterCancel.rows === 1, "cancel leaves the item and the history unchanged");
    await warnPage.click('[data-s="r:empty-row"]');
    await warnPage.waitForSelector("#rg-restore-back .rg-restore-go");
    await warnPage.locator("#rg-restore-back .rg-restore-go").click();
    await warnPage.waitForFunction(function () {
      var body = document.body ? document.body.innerText : "";
      return body.indexOf("KEEP-ME") === -1 && body.indexOf("שוחזר") !== -1;
    });
    check(true, "confirming the warning applies the empty version and shows the undo toast");
    await warnPage.locator("#toast .tundo").click();
    await warnPage.waitForFunction(function () {
      var body = document.body ? document.body.innerText : "";
      return body.indexOf("KEEP-ME") !== -1;
    });
    check(true, "undo within the toast puts the removed item back");
    check(warnErr.length === 0, "the restore-warning page runs without a script error");
    if (warnErr.length) console.error(warnErr.join(" | "));
    await warn.close();
  } finally {
    await browser.close();
    server.close();
  }
  if (failed) { console.error(failed + " browser check(s) failed"); process.exit(1); }
  console.log("browser checks passed");
}

main().catch(function (err) {
  console.error(err && err.stack || err);
  process.exit(1);
});
