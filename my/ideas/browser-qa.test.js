/* Headless-browser check for live Listify.
   Run: node my/ideas/browser-qa.test.js
   Needs playwright-core (or playwright) and Chrome. */
"use strict";
var http = require("http");
var fs = require("fs");
var path = require("path");

var ROOT = path.join(__dirname, "../..");
var PORT = 9877;
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
  return "localStorage.setItem('rg-myideas-v1:" + UID + "'," + JSON.stringify(JSON.stringify(doc)) + ");" +
    "localStorage.setItem('rg-myideas-base:" + UID + "'," + JSON.stringify(JSON.stringify(base)) + ");" +
    "localStorage.setItem('rg-myideas-lastsync:" + UID + "','1');";
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
    await signPage.goto("http://127.0.0.1:" + PORT + "/my/ideas/", { waitUntil: "domcontentloaded" });
    await signPage.waitForFunction(function () { return document.getElementById("build") && document.getElementById("build").textContent === "myideas-v59"; });
    check(true, "the on-screen label shows myideas-v59");
    var srcs = await signPage.evaluate(function () {
      return Array.prototype.map.call(document.scripts, function (s) { return s.src || ""; }).join("\n");
    });
    check(srcs.indexOf("app.js?v=59") !== -1 && srcs.indexOf("version.js?v=2") !== -1 && srcs.indexOf("rg-sync-status.js?v=9") !== -1 && srcs.indexOf("shared/rg-account.js") !== -1 && srcs.indexOf("sandbox-shared") === -1, "the page loads the bumped scripts");
    await signPage.evaluate(function () { document.getElementById("build").textContent = "rg-myideas-v8"; });
    await signPage.evaluate(function () { window.dispatchEvent(new Event("online")); });
    await signPage.waitForFunction(function () { return document.getElementById("build").textContent === "myideas-v59"; });
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
      var raw = localStorage.getItem("rg-myideas-hist2:" + uid);
      return raw && raw.indexOf("גיבוי לפני יציאה") !== -1 && raw.indexOf('"fmt":2') !== -1;
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
    await pageA.goto("http://127.0.0.1:" + PORT + "/my/ideas/", { waitUntil: "domcontentloaded" });
    await waitFor(function () {
      var doc = cloudValue(store, "items");
      return doc && doc.items.a && doc.items.a.text === "מ-א";
    }, 15000);
    await new Promise(function (r) { setTimeout(r, 1500); });
    check(true, "device A published its text first");
    await pageB.addInitScript(userScript(cacheScript("מ-ב", 2000, true)));
    await pageB.goto("http://127.0.0.1:" + PORT + "/my/ideas/", { waitUntil: "domcontentloaded" });
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
      "localStorage.removeItem('rg-myideas-hist2:" + UID + "');" +
      "localStorage.setItem('rg-myideas-hist:" + UID + "'," + JSON.stringify(JSON.stringify(snaps)) + ");"
    ));
    await oldPage.goto("http://127.0.0.1:" + PORT + "/my/ideas/", { waitUntil: "domcontentloaded" });
    await oldPage.waitForSelector("#hist-btn");
    var earlyRestore = await oldPage.evaluate(function () {
      var open = document.getElementById("hist-btn");
      if (!open) return "no-history";
      open.click();
      var btn = document.querySelector('[data-s="r:row-0"]');
      if (!btn) return "no-button";
      if (btn.disabled) return "disabled";
      btn.click();
      var sheet = document.getElementById("sheet");
      var body = document.body ? document.body.innerText : "";
      if (sheet) return "sheet-open";
      if (body.indexOf("OLDEST-TEXT") === -1 || body.indexOf("CURRENT-NOW") !== -1) return "not-restored";
      return "ok";
    });
    check(earlyRestore === "ok", "שחזר works on the first click (" + earlyRestore + ")");
    await oldPage.goto("http://127.0.0.1:" + PORT + "/my/ideas/", { waitUntil: "domcontentloaded" });
    await oldPage.waitForSelector("#hist-btn");
    await oldPage.click("#hist-btn");
    await oldPage.waitForSelector('[data-s="r:row-0"]');
    await oldPage.waitForTimeout(300);
    await oldPage.click('[data-s="r:row-0"]');
    await oldPage.waitForFunction(function () {
      var sheet = document.getElementById("sheet");
      var body = document.body ? document.body.innerText : "";
      return !sheet && body.indexOf("OLDEST-TEXT") !== -1 && body.indexOf("CURRENT-NOW") === -1;
    });
    var keptOldest = await oldPage.evaluate(function (uid) {
      var legacy = localStorage.getItem("rg-myideas-hist:" + uid);
      var raw = localStorage.getItem("rg-myideas-hist2:" + uid);
      var doc = raw ? JSON.parse(raw) : null;
      var rows = doc && doc.snaps ? doc.snaps : [];
      if (window.RGSyncStatus && RGSyncStatus.expandHistory) rows = RGSyncStatus.expandHistory(rows);
      var hasOld = false, hasNow = false, i, legacySame = false;
      try { legacySame = JSON.parse(legacy).length === 20 && legacy.indexOf("CURRENT-NOW") === -1; } catch (e) { legacySame = false; }
      for (i = 0; i < rows.length; i++) {
        if (rows[i].id === "row-0") hasOld = true;
        if (rows[i].data && rows[i].data.a && rows[i].data.a.text === "CURRENT-NOW") hasNow = true;
      }
      return hasOld && hasNow && rows.length === 20 && doc && doc.fmt === 2 && legacySame;
    }, UID);
    check(keptOldest, "restoring the oldest row at the cap changes the list and keeps that row");
    var clashText = await oldPage.locator("#clash").innerText();
    check(clashText.indexOf("התנגשות בעריכה") === -1, "restoring a version does not show the clash notice");
    check(oldErr.length === 0, "the oldest-restore page runs without a script error");
    if (oldErr.length) console.error(oldErr.join(" | "));
    await old.close();

    var searchItems = {
      a1: { id: "a1", sec: "ideas", text: "Alpha one", note: "first", done: false, order: 1, created: 2001, at: 2001 },
      a2: { id: "a2", sec: "ideas", text: "Middle skip", done: false, order: 2, created: 2002, at: 2002 },
      a3: { id: "a3", sec: "ideas", text: "Alpha two", done: false, order: 3, created: 2003, at: 2003 },
      s1: { id: "s1", sec: "shop", text: "חלב טרי", note: "בבוקר", done: false, order: 1, created: 2101, at: 2101 },
      s2: { id: "s2", sec: "shop", text: "לחם", done: false, order: 2, created: 2102, at: 2102 },
      s3: { id: "s3", sec: "shop", text: "חלב יבש", done: false, order: 3, created: 2103, at: 2103 },
      w1: { id: "w1", sec: "work", text: "Report", note: "Monday", done: false, order: 1, created: 2201, at: 2201 },
      "c:shop": { id: "c:shop", type: "cat", cat: "shop", name: "קניות", kind: "task", pos: 10, created: 1000, at: 1000 },
      "c:work": { id: "c:work", type: "cat", cat: "work", name: "Work", kind: "task", pos: 11, created: 1000, at: 1000 }
    };
    var searchDoc = { items: searchItems, pending: false, seeded: true };
    var searchCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: "block" });
    var searchPage = await searchCtx.newPage();
    var searchErr = [];
    searchPage.on("pageerror", function (err) { searchErr.push(String(err)); });
    searchPage.on("console", function (msg) {
      if (msg.type() !== "error") return;
      var text = msg.text();
      if (text.indexOf("ERR_FAILED") !== -1 || text.indexOf("Failed to load resource") !== -1) return;
      searchErr.push(text);
    });
    await searchPage.route("https://fra.cloud.appwrite.io/**", function (route) { route.abort(); });
    await searchPage.addInitScript(userScript(
      "localStorage.setItem('rg-myideas-v1:" + UID + "'," + JSON.stringify(JSON.stringify(searchDoc)) + ");"
    ));
    var shotDir = "/opt/cursor/artifacts";
    await searchPage.goto("http://127.0.0.1:" + PORT + "/my/ideas/", { waitUntil: "domcontentloaded" });
    await searchPage.waitForFunction(function () { return document.body && document.body.innerText.indexOf("Middle skip") !== -1; });
    function idsOf(page) {
      return page.evaluate(function () {
        return Array.prototype.map.call(document.querySelectorAll("#panels [data-id]"), function (el) { return el.getAttribute("data-id"); });
      });
    }
    function marksOf(page) {
      return page.evaluate(function () {
        return Array.prototype.map.call(document.querySelectorAll("#panels mark.qhit"), function (el) { return el.textContent; });
      });
    }
    function dataOf(page) {
      return page.evaluate(function (uid) {
        var raw = localStorage.getItem("rg-myideas-v1:" + uid);
        var doc = raw ? JSON.parse(raw) : { items: {} };
        var rows = Object.keys(doc.items || {}).sort().map(function (k) {
          var x = doc.items[k];
          return [x.id, x.type || "", x.name || "", x.sec || "", x.text || "", x.note || "", x.order == null ? "" : x.order, x.deleted ? 1 : 0].join("|");
        });
        var live = [];
        for (var i = 0; i < localStorage.length; i++) {
          var key = localStorage.key(i);
          if (key && key.indexOf("rg-sbx-ideas") === 0) live.push(key);
        }
        return { rows: rows.join("\n"), live: live, tab: localStorage.getItem("rg-myideas-tab-cur") || "" };
      }, UID);
    }
    function geomOf(page) {
      return page.evaluate(function () {
        function box(id) {
          var el = document.getElementById(id);
          if (!el || el.hidden) return null;
          var b = el.getBoundingClientRect();
          return { w: Math.round(b.width), h: Math.round(b.height), top: Math.round(b.top), left: Math.round(b.left), right: Math.round(b.right) };
        }
        var row = document.getElementById("actrow");
        var rb = row.getBoundingClientRect();
        return {
          search: box("list-search"), print: box("print-btn"), restore: box("restore-file-btn"), clear: box("search-clear"),
          rowRight: Math.round(rb.right), rowLeft: Math.round(rb.left), sw: row.scrollWidth, cw: row.clientWidth, iw: window.innerWidth
        };
      });
    }
    var before = await dataOf(searchPage);
    var fullIds = await idsOf(searchPage);
    check(fullIds.join(",") === "a1,a2,a3", "before a search the open list keeps its saved order");
    var row0 = await geomOf(searchPage);
    check(row0.search && row0.search.h >= 44 && row0.search.w >= 44, "the search field is at least 44px");
    check(row0.print && row0.print.h >= 44 && row0.print.w >= 44, "print stays at least 44px");
    check(row0.restore && row0.restore.h >= 44 && row0.restore.w >= 44, "restore stays at least 44px");
    check(Math.abs(row0.search.top - row0.print.top) <= 8 && Math.abs(row0.print.top - row0.restore.top) <= 8, "search, print, and restore sit on one row");
    check(row0.rowLeft >= -1 && row0.rowRight <= row0.iw + 1 && row0.sw <= row0.cw + 1, "the row fits the phone width");
    await searchPage.evaluate(function () { return document.fonts && document.fonts.ready; });
    async function placeholderFits() {
      return searchPage.evaluate(function () {
        var input = document.getElementById("list-search");
        var cs = getComputedStyle(input);
        var probe = document.createElement("span");
        probe.textContent = input.placeholder || "";
        probe.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;font:" + cs.font + ";font-weight:700";
        document.body.appendChild(probe);
        var need = probe.getBoundingClientRect().width;
        probe.remove();
        var pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        return { need: Math.ceil(need), have: Math.floor(input.clientWidth - pad), scroll: document.documentElement.scrollWidth, iw: window.innerWidth, label: (document.getElementById("restore-file-btn") || {}).innerText || "", print: (document.getElementById("print-btn") || {}).innerText || "" };
      });
    }
    var fit390 = await placeholderFits();
    check(fit390.label.replace(/\s/g, "") === "שיחזור" && fit390.print.replace(/\s/g, "") === "הדפסה" && fit390.have >= fit390.need && fit390.scroll <= fit390.iw + 1, "at 390px חיפוש is fully visible and the page does not scroll sideways");
    await searchPage.setViewportSize({ width: 360, height: 800 });
    var fit360 = await placeholderFits();
    check(fit360.have >= fit360.need && fit360.scroll <= fit360.iw + 1, "at 360px חיפוש is fully visible and the page does not scroll sideways");
    await searchPage.setViewportSize({ width: 390, height: 844 });
    await searchPage.evaluate(function () { window.scrollTo(0, 0); });
    await searchPage.screenshot({ path: shotDir + "/listify_search_row.png" });
    await searchPage.fill("#list-search", "alpha");
    await searchPage.waitForFunction(function () { return document.body.innerText.indexOf("Middle skip") === -1 && document.body.innerText.indexOf("Alpha two") !== -1; });
    var alphaIds = await idsOf(searchPage);
    var alphaMarks = await marksOf(searchPage);
    check(alphaIds.join(",") === "a1,a3", "an English search keeps matching items in their saved order and hides the rest");
    check(alphaMarks.join(" ").toLowerCase().indexOf("alpha") !== -1, "the English match is highlighted");
    await searchPage.fill("#list-search", "ALPHA");
    await searchPage.waitForFunction(function () {
      var ids = Array.prototype.map.call(document.querySelectorAll("#panels [data-id]"), function (el) { return el.getAttribute("data-id"); });
      return ids.join(",") === "a1,a3";
    });
    check(true, "English search is case-insensitive");
    await searchPage.evaluate(function () { window.scrollTo(0, 0); });
    await searchPage.screenshot({ path: shotDir + "/listify_search_english.png" });
    await searchPage.fill("#list-search", "חלב");
    await searchPage.waitForFunction(function () { return document.body.innerText.indexOf("חלב יבש") !== -1 && document.body.innerText.indexOf("לחם") === -1; });
    var hebIds = await idsOf(searchPage);
    var hebMarks = await marksOf(searchPage);
    check(hebIds.join(",") === "s1,s3", "a Hebrew search keeps matching items in their saved order");
    check(hebMarks.indexOf("חלב") !== -1, "the Hebrew match is highlighted");
    await searchPage.evaluate(function () { window.scrollTo(0, 0); });
    await searchPage.screenshot({ path: shotDir + "/listify_search_hebrew.png" });
    var clearBox = await geomOf(searchPage);
    check(clearBox.clear && clearBox.clear.h >= 44 && clearBox.clear.w >= 44, "the clear button is at least 44px");
    await searchPage.fill("#list-search", "קני");
    await searchPage.waitForFunction(function () { return document.body.innerText.indexOf("לחם") !== -1 && document.body.innerText.indexOf("קניות") !== -1; });
    check((await marksOf(searchPage)).indexOf("קני") !== -1, "a matching list name is highlighted and its items stay in order");
    await searchPage.fill("#list-search", "work");
    await searchPage.waitForFunction(function () { return document.body.innerText.indexOf("Report") !== -1; });
    check((await marksOf(searchPage)).join(" ").toLowerCase().indexOf("work") !== -1, "an English list name matches without regard to case");
    await searchPage.fill("#list-search", "בבוקר");
    await searchPage.waitForFunction(function () {
      var ids = Array.prototype.map.call(document.querySelectorAll("#panels [data-id]"), function (el) { return el.getAttribute("data-id"); });
      return ids.join(",") === "s1";
    });
    check(true, "a note matches without showing the other items");
    await searchPage.fill("#list-search", "zzz");
    await searchPage.waitForFunction(function () { return document.body.innerText.indexOf("אין התאמה") !== -1; });
    check((await idsOf(searchPage)).length === 0, "a query with no match shows the empty line and no items");
    var mid = await dataOf(searchPage);
    check(mid.rows === before.rows && mid.tab === before.tab && mid.live.length === 0, "typing a search does not write lists or sandbox keys");
    await searchPage.click("#search-clear");
    await searchPage.waitForFunction(function () {
      var box = document.getElementById("list-search");
      return box && box.value === "" && document.body.innerText.indexOf("Middle skip") !== -1 && !document.querySelector("#panels mark.qhit");
    });
    var afterIds = await idsOf(searchPage);
    var after = await dataOf(searchPage);
    check(afterIds.join(",") === "a1,a2,a3", "clearing the search restores the full open list in its saved order");
    check(after.rows === before.rows && after.tab === before.tab && after.live.length === 0, "clearing the search does not write lists or sandbox keys");
    await searchPage.evaluate(function () { window.scrollTo(0, 0); });
    await searchPage.screenshot({ path: shotDir + "/listify_search_cleared.png" });
    await searchPage.click("#picker");
    await searchPage.waitForSelector("#pmenu:not([hidden])");
    await searchPage.fill("#list-search", "Work");
    await searchPage.waitForFunction(function () {
      var menu = document.getElementById("pmenu");
      return menu && menu.innerText.indexOf("Work") !== -1 && menu.innerText.indexOf("קניות") === -1;
    });
    check(true, "the list menu filters to matching lists and does not reorder them into storage");
    var menuData = await dataOf(searchPage);
    check(menuData.rows === before.rows, "filtering the menu does not write the lists");
    await searchPage.setViewportSize({ width: 320, height: 700 });
    var narrow = await geomOf(searchPage);
    check(narrow.search && narrow.search.h >= 44 && narrow.print.h >= 44 && narrow.restore.h >= 44 && narrow.clear && narrow.clear.h >= 44 && narrow.clear.w >= 44, "phone-narrow controls stay at least 44px tall");
    check(narrow.rowLeft >= -1 && narrow.rowRight <= narrow.iw + 1 && narrow.sw <= narrow.cw + 1, "the row still fits a 320px-wide phone");
    check(searchErr.length === 0, "search runs without a console error");
    if (searchErr.length) console.error(searchErr.join(" | "));
    await searchCtx.close();

    var featItems = {
      a1: { id: "a1", sec: "ideas", text: "Alpha one", note: "first", done: false, order: 1, created: 3001, at: 3001 },
      keep: { id: "keep", sec: "ideas", text: "שמור", note: new Array(501).join("ק"), done: false, order: 2, created: 3002, at: 3002 },
      s1: { id: "s1", sec: "shop", text: "חלב טרי", note: "בבוקר", done: false, order: 1, created: 3101, at: 3101 },
      "c:shop": { id: "c:shop", type: "cat", cat: "shop", name: "קניות", kind: "task", pos: 10, created: 1000, at: 1000 }
    };
    var fi;
    for (fi = 1; fi <= 24; fi++) featItems["n" + fi] = { id: "n" + fi, sec: "ideas", text: "שורה " + fi, note: fi === 7 ? "סימןארוך" : "", done: false, order: 10 + fi, created: 3200 + fi, at: 3200 + fi };
    var featDoc = { items: featItems, pending: true, seeded: true };
    var featStore = {};
    var feat = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    var featPage = await feat.newPage();
    var featErr = [], featAsk = [];
    featPage.on("pageerror", function (err) { featErr.push(String(err)); });
    featPage.on("dialog", function (d) { featAsk.push(d.message()); d.accept(); });
    await installCloud(featPage, featStore);
    await featPage.addInitScript(userScript(
      "localStorage.setItem('rg-myideas-v1:" + UID + "'," + JSON.stringify(JSON.stringify(featDoc)) + ");"
    ));
    await featPage.goto("http://127.0.0.1:" + PORT + "/my/ideas/", { waitUntil: "domcontentloaded" });
    await featPage.waitForFunction(function () { return document.getElementById("box-name") && document.getElementById("box-name").textContent === "כללי" && document.body.innerText.indexOf("Alpha one") !== -1; });
    var stack = await featPage.evaluate(function () {
      var b = document.getElementById("box-picker").getBoundingClientRect();
      var p = document.getElementById("picker").getBoundingClientRect();
      return { boxAbove: b.bottom <= p.top + 1, noteMax: (document.querySelector(".notein") || {}).maxLength || 0 };
    });
    check(stack.boxAbove && stack.noteMax === 2500, "the category dropdown sits above the lists and the note field allows 2500");
    function noteMap(page) {
      return page.evaluate(function (uid) {
        var raw = localStorage.getItem("rg-myideas-v1:" + uid);
        var doc = raw ? JSON.parse(raw) : { items: {} };
        var out = {};
        Object.keys(doc.items).forEach(function (k) {
          var x = doc.items[k];
          if (x && x.note) out[x.id] = x.note;
        });
        return out;
      }, UID);
    }
    var notesBefore = JSON.stringify(await noteMap(featPage));
    check(notesBefore.indexOf("first") !== -1 && notesBefore.indexOf(new Array(501).join("ק")) !== -1, "an existing 500-character note is kept whole");
    await featPage.click('[data-id="a1"] .notetog');
    await featPage.waitForFunction(function () { var n = document.querySelector('[data-id="a1"] .note'); return n && n.classList.contains("note-off"); });
    check(JSON.stringify(await noteMap(featPage)) === notesBefore, "hiding one note does not change stored notes");
    await featPage.reload({ waitUntil: "domcontentloaded" });
    await featPage.waitForFunction(function () { var n = document.querySelector('[data-id="a1"] .note'); return n && n.classList.contains("note-off"); });
    check(true, "the per-item note toggle is still hidden after reload");
    await featPage.click("#notes-all");
    await featPage.waitForFunction(function () { return document.getElementById("notes-all") && document.getElementById("notes-all").textContent === "הצג הערות" && document.querySelectorAll("#panels .note.note-off").length >= 2; });
    var hiddenCount = await featPage.evaluate(function () { return document.querySelectorAll("#panels .note.note-off").length; });
    check(hiddenCount >= 2 && JSON.stringify(await noteMap(featPage)) === notesBefore, "the global toggle hides every note and writes nothing");
    await featPage.reload({ waitUntil: "domcontentloaded" });
    await featPage.waitForFunction(function () { return document.getElementById("notes-all") && document.getElementById("notes-all").textContent === "הצג הערות"; });
    check(true, "the global note toggle stays hidden after reload");
    await featPage.click("#notes-all");
    await featPage.waitForFunction(function () { return document.querySelector('[data-id="a1"] .note') && !document.querySelector('[data-id="a1"] .note').classList.contains("note-off"); });
    await featPage.click("#box-picker");
    await featPage.waitForSelector('#bmenu:not([hidden]) [data-box="+"]');
    await featPage.click('#bmenu [data-box="+"]');
    await featPage.waitForSelector("#sheet .s-name");
    await featPage.fill("#sheet .s-name", "מיתוג");
    await featPage.waitForTimeout(500);
    await featPage.click('#sheet button[type=submit]');
    await featPage.waitForFunction(function () { return document.getElementById("box-name").textContent === "מיתוג"; });
    await featPage.click("#box-picker");
    await featPage.click("#bmenu .erow.cur .pm-more");
    await featPage.click('#bmenu [data-box^="ren:"]');
    await featPage.waitForSelector("#sheet .s-name");
    await featPage.fill("#sheet .s-name", "מיתוג2");
    await featPage.waitForTimeout(500);
    await featPage.click('#sheet button[type=submit]');
    await featPage.waitForFunction(function () { return document.getElementById("box-name").textContent === "מיתוג2"; });
    if (await featPage.evaluate(function () { var m = document.getElementById("bmenu"); return !m || m.hidden; })) await featPage.click("#box-picker");
    await featPage.click('#bmenu button[data-box="all"]');
    await featPage.waitForFunction(function () { return document.getElementById("box-name").textContent === "כללי" && document.body.innerText.indexOf("חלב טרי") === -1; });
    await featPage.click("#picker");
    await featPage.click('[data-pick="opt:shop"]');
    await featPage.click('[data-pick="box:shop"]');
    await featPage.waitForSelector("#sheet");
    await featPage.waitForTimeout(500);
    await featPage.locator("#sheet button", { hasText: "מיתוג2" }).click();
    if (await featPage.evaluate(function () { var m = document.getElementById("bmenu"); return !m || m.hidden; })) await featPage.click("#box-picker");
    await featPage.locator("#bmenu button", { hasText: "מיתוג2" }).click();
    await featPage.waitForFunction(function () { return document.body.innerText.indexOf("חלב טרי") !== -1 && document.body.innerText.indexOf("Alpha one") === -1; });
    check(true, "picking a category filters the lists");
    if (await featPage.evaluate(function () { var m = document.getElementById("bmenu"); return !m || m.hidden; })) await featPage.click("#box-picker");
    await featPage.click("#bmenu .erow.cur .pm-more");
    await featPage.click('#bmenu [data-box^="del:"]');
    await featPage.waitForFunction(function () { return document.getElementById("box-name").textContent === "כללי" && document.body.innerText.indexOf("חלב טרי") !== -1; });
    var afterDel = await featPage.evaluate(function (uid) {
      var doc = JSON.parse(localStorage.getItem("rg-myideas-v1:" + uid));
      var shop = doc.items["c:shop"], milk = doc.items.s1, boxes = [];
      Object.keys(doc.items).forEach(function (k) { var x = doc.items[k]; if (x && x.type === "box") boxes.push(x); });
      return { shop: !!(shop && !shop.deleted && !shop.gone && !shop.box), milk: !!(milk && !milk.deleted && milk.text === "חלב טרי"), boxes: boxes.map(function (b) { return b.gone ? 1 : 0; }) };
    }, UID);
    check(afterDel.shop && afterDel.milk && afterDel.boxes.length === 1 && afterDel.boxes[0] === 1, "deleting a category keeps the list and its items and sends the list back to כללי");
    check(featAsk.some(function (m) { return m.indexOf("הרשימות נשארות") !== -1 && m.indexOf("וכל מה שבתוכה") === -1; }), "the delete question says the lists stay");
    await featPage.click('[data-id="s1"] [data-a="edit"]');
    await featPage.waitForSelector(".e-note");
    await featPage.evaluate(function (n) {
      var el = document.querySelector(".e-note");
      el.value = new Array(n + 1).join("נ");
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, 2500);
    await featPage.waitForSelector(".ed .notemax:not([hidden])");
    var maxMsg = await featPage.evaluate(function () {
      var p = document.querySelector(".ed .notemax");
      var cs = getComputedStyle(p), gold = getComputedStyle(p.querySelector("bdi"));
      return { text: p.textContent, color: cs.color, gold: gold.color, len: document.querySelector(".e-note").value.length };
    });
    check(maxMsg.len === 2500 && maxMsg.text.indexOf("הגעת לאורך המרבי של הערה") !== -1 && maxMsg.text.indexOf("2500/2500") !== -1 && maxMsg.color === "rgb(91, 141, 239)" && maxMsg.gold === "rgb(245, 197, 66)", "a full note shows a blue and gold limit message with a counter");
    await featPage.evaluate(function () { document.documentElement.style.zoom = "1.2"; });
    await featPage.setViewportSize({ width: 320, height: 700 });
    var fitDark = await featPage.evaluate(function () {
      return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, search: document.getElementById("list-search").getAttribute("placeholder"), print: document.getElementById("print-btn").textContent, restore: document.querySelector("#restore-file-btn span").textContent };
    });
    check(fitDark.sw <= fitDark.cw + 1 && fitDark.search === "חיפוש" && fitDark.print.replace(/\s/g, "") === "הדפסה" && fitDark.restore.replace(/\s/g, "") === "שיחזור", "at 320px and 120% the dark page fits and the toolbar stays");
    await featPage.screenshot({ path: "/opt/cursor/artifacts/listify-note-max-dark.png" });
    await featPage.evaluate(function () { document.documentElement.setAttribute("data-theme", "light"); });
    await featPage.waitForFunction(function () { return document.documentElement.getAttribute("data-theme") === "light"; });
    var fitLight = await featPage.evaluate(function () {
      var p = document.querySelector(".ed .notemax");
      return { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, color: getComputedStyle(p).color, gold: getComputedStyle(p.querySelector("bdi")).color };
    });
    check(fitLight.sw <= fitLight.cw + 1 && fitLight.color === "rgb(26, 71, 160)" && fitLight.gold === "rgb(138, 106, 16)", "at 320px and 120% the light page fits and the message stays blue and gold");
    await featPage.screenshot({ path: "/opt/cursor/artifacts/listify-note-max-light.png" });
    await featPage.evaluate(function () { document.documentElement.style.zoom = "1"; });
    await featPage.setViewportSize({ width: 390, height: 844 });
    await featPage.click('[data-a="save"]');
    await featPage.waitForFunction(function (uid) {
      var doc = JSON.parse(localStorage.getItem("rg-myideas-v1:" + uid) || "{}");
      return doc.items && doc.items.s1 && doc.items.s1.note && doc.items.s1.note.length === 2500 && doc.items.keep.note.length === 500;
    }, UID);
    check(true, "saving a max-length note stores all 2500 characters and leaves the older note whole");
    await featPage.click("#notes-all");
    await featPage.waitForFunction(function () { var n = document.querySelector('[data-id="s1"] .note'); return n && n.classList.contains("note-off"); });
    var storedHidden = JSON.stringify(await noteMap(featPage));
    await featPage.fill("#list-search", "נננ");
    await featPage.waitForFunction(function () {
      var n = document.querySelector('[data-id="s1"] .note');
      return n && !n.classList.contains("note-off") && n.innerText.indexOf("נ") !== -1;
    });
    check(JSON.stringify(await noteMap(featPage)) === storedHidden, "search can show a hidden note without writing it");
    await featPage.click("#search-clear");
    await featPage.fill("#list-search", "שורה 18");
    await featPage.waitForFunction(function () { return document.body.innerText.indexOf("שורה 18") !== -1 && document.body.innerText.indexOf("שורה 17") === -1; });
    check(true, "search still finds one row in a long list");
    await featPage.click("#search-clear");
    await featPage.emulateMedia({ media: "print" });
    var printed = await featPage.evaluate(function () { var n = document.querySelector('[data-id="s1"] .note'); return n ? getComputedStyle(n).display : ""; });
    check(printed === "block", "print still shows a note that is hidden on screen");
    await featPage.emulateMedia({ media: "screen" });
    var backup = await featPage.evaluate(function (uid) {
      var doc = JSON.parse(localStorage.getItem("rg-myideas-v1:" + uid));
      var file = window.RGMyIdeasRestore.buildFile(doc.items, Date.now());
      var back = window.RGMyIdeasRestore.parse(file);
      return { len: back.items.s1.note.length, lists: back.summary.listCount, items: back.summary.itemCount, box: back.items["b:brand"] ? back.items["b:brand"].name : (function () { var k, x; for (k in back.items) { x = back.items[k]; if (x && x.type === "box") return x.name || ""; } return ""; })() };
    }, UID);
    check(backup.len === 2500 && backup.items >= 24 && backup.lists >= 2, "backup and restore keep a long note and a long list");
    await waitFor(function () {
      var doc = cloudValue(featStore, "items");
      if (!doc || !doc.items || !doc.items.s1) return false;
      return doc.items.s1.note && doc.items.s1.note.length === 2500 && doc.items.keep && doc.items.keep.note.length === 500 && doc.items["c:shop"] && !doc.items["c:shop"].deleted;
    }, 15000);
    check(true, "sync uploads the whole long note and the list");
    var featB = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    var pageB2 = await featB.newPage();
    var featBErr = [];
    pageB2.on("pageerror", function (err) { featBErr.push(String(err)); });
    await installCloud(pageB2, featStore);
    await pageB2.addInitScript(userScript("localStorage.setItem('rg-myideas-v1:" + UID + "'," + JSON.stringify(JSON.stringify({ items: {}, pending: false, seeded: true })) + ");"));
    await pageB2.goto("http://127.0.0.1:" + PORT + "/my/ideas/", { waitUntil: "domcontentloaded" });
    await pageB2.waitForFunction(function () {
      var raw = localStorage.getItem("rg-myideas-v1:" + "qa-user");
      if (!raw) return false;
      var doc = JSON.parse(raw);
      return doc.items && doc.items.s1 && doc.items.s1.note && doc.items.s1.note.length === 2500 && doc.items["c:shop"] && !doc.items["c:shop"].deleted;
    });
    await pageB2.click("#picker");
    await pageB2.click('[data-pick="shop"]');
    await pageB2.waitForSelector('[data-id="s1"] .note');
    function catLinks() {
      return featPage.evaluate(function (uid) {
        var doc = JSON.parse(localStorage.getItem("rg-myideas-v1:" + uid));
        var lists = [];
        Object.keys(doc.items).forEach(function (k) {
          var x = doc.items[k];
          if (x && x.type === "cat" && !x.deleted) lists.push(x.cat + ":" + (x.box || ""));
        });
        lists.sort();
        return lists.join(",");
      }, UID);
    }
    var linksBefore = await catLinks();
    if (await featPage.evaluate(function () { var m = document.getElementById("bmenu"); return m && !m.hidden; })) await featPage.click("#box-picker");
    await featPage.click("#box-picker");
    await featPage.waitForSelector('#bmenu [data-box="opt:"]');
    await featPage.click('#bmenu [data-box="opt:"]');
    await featPage.waitForSelector('#bmenu [data-box="ren:"]');
    var defMenu = await featPage.evaluate(function () {
      var ren = document.querySelector('#bmenu [data-box="ren:"]');
      var del = document.querySelector('#bmenu [data-box="del:"]');
      return { ren: ren ? ren.textContent : "", del: del ? del.textContent : "" };
    });
    check(defMenu.ren.indexOf("שינוי שם") !== -1 && defMenu.del.indexOf("מחיקת הקטגוריה") !== -1, "כללי has the same options, including שינוי שם");
    await featPage.screenshot({ path: "/opt/cursor/artifacts/listify-default-category-menu.png" });
    await featPage.click('#bmenu [data-box="del:"]');
    check(featAsk.some(function (m) { return m.indexOf("אי אפשר למחוק") !== -1; }), "deleting כללי while it has lists is blocked in Hebrew");
    check(await catLinks() === linksBefore, "the blocked delete does not move lists");
    await featPage.click('#bmenu [data-box="ren:"]');
    await featPage.waitForSelector("#sheet .s-name");
    await featPage.fill("#sheet .s-name", "בית");
    await featPage.waitForTimeout(500);
    await featPage.click('#sheet button[type=submit]');
    await featPage.waitForFunction(function () { return document.getElementById("box-name").textContent === "בית" && document.body.innerText.indexOf("חלב טרי") !== -1; });
    check(await catLinks() === linksBefore, "renaming כללי keeps every list in place");
    await featPage.close();
    function listsDoc(store) {
      var id, v;
      for (id in store) {
        try { v = JSON.parse(store[id]); } catch (e) { continue; }
        if (v && v.items) return store[id];
      }
      return "";
    }
    var listsBefore = listsDoc(featStore);
    await pageB2.click("#notes-all");
    await pageB2.waitForFunction(function () { var n = document.querySelector('[data-id="s1"] .note'); return n && n.classList.contains("note-off"); });
    await new Promise(function (r) { setTimeout(r, 1500); });
    check(listsDoc(featStore) === listsBefore, "hiding notes on the other device does not write the cloud copy");
    check(featErr.length === 0 && featBErr.length === 0, "notes, categories, and sync run without a script error");
    if (featErr.length || featBErr.length) console.error(featErr.concat(featBErr).join(" | "));
    await featB.close();
    await feat.close();

    var layItems = {
      a1: { id: "a1", sec: "ideas", text: "כותרת", note: new Array(801).join("ש"), done: false, order: 1, created: 1, at: 1 }
    };
    var lay = await browser.newContext({ viewport: { width: 320, height: 700 }, serviceWorkers: "block" });
    var layPage = await lay.newPage();
    await layPage.route("https://fra.cloud.appwrite.io/**", function (route) { route.abort(); });
    await layPage.addInitScript(userScript("localStorage.setItem('rg-myideas-v1:" + UID + "'," + JSON.stringify(JSON.stringify({ items: layItems, pending: false, seeded: true })) + ");"));
    await layPage.goto("http://127.0.0.1:" + PORT + "/my/ideas/", { waitUntil: "domcontentloaded" });
    await layPage.waitForSelector('[data-id="a1"] .notetog');
    var narrow = await layPage.evaluate(function () {
      var row = document.querySelector('[data-id="a1"]');
      var title = row.querySelector(".txt");
      var tog = row.querySelector(".notetog");
      var note = row.querySelector(".note");
      var rb = row.getBoundingClientRect();
      var tb = title.getBoundingClientRect();
      var gb = tog.getBoundingClientRect();
      var nb = note.getBoundingClientRect();
      var cs = getComputedStyle(tog);
      return {
        togTop: Math.round(gb.top - tb.top),
        noteW: Math.round(nb.width),
        rowW: Math.round(rb.width),
        color: getComputedStyle(note).color,
        letter: tog.textContent,
        label: tog.getAttribute("aria-label"),
        togH: Math.round(gb.height),
        togW: Math.round(gb.width),
        togColor: cs.color,
        togBg: cs.backgroundColor,
        togBorder: cs.borderTopWidth,
        radius: cs.borderRadius
      };
    });
    check(narrow.togTop <= 20 && narrow.togTop >= -8, "the note toggle sits at the top of a long row, next to the title");
    check(narrow.noteW >= narrow.rowW - 8, "at 320px the note uses the full row width");
    check(narrow.color === "rgb(246, 237, 212)", "dark note text is cream, not pale blue");
    check(narrow.letter === "i" && narrow.label === "הצג/הסתר הערה", "the note control is a letter i labeled הצג/הסתר הערה");
    check(narrow.togH >= 32 && narrow.togH <= 40 && narrow.togW >= 32 && narrow.togW <= 40, "the note control tap target is about 32-40px");
    check(narrow.togColor === "rgb(245, 197, 66)" && narrow.togBg === "rgba(0, 0, 0, 0)" && narrow.togBorder === "0px" && narrow.radius === "0px", "a shown note's i is gold, with no circle or border");
    await layPage.screenshot({ path: "/opt/cursor/artifacts/listify-note-i-dark.png" });
    await layPage.click('[data-id="a1"] .notetog');
    await layPage.waitForFunction(function () { var n = document.querySelector('[data-id="a1"] .note'); return n && n.classList.contains("note-off"); });
    var iOff = await layPage.evaluate(function () { return getComputedStyle(document.querySelector('[data-id="a1"] .notetog')).color; });
    check(iOff === "rgb(90, 116, 168)", "a hidden note's i is a muted dark blue in dark mode");
    await layPage.evaluate(function () { document.documentElement.setAttribute("data-theme", "light"); });
    var lightNote = await layPage.evaluate(function () { return getComputedStyle(document.querySelector('[data-id="a1"] .note')).color; });
    check(lightNote === "rgb(11, 31, 77)", "light note text is the body navy");
    var iLightOff = await layPage.evaluate(function () { return getComputedStyle(document.querySelector('[data-id="a1"] .notetog')).color; });
    check(iLightOff === "rgb(11, 31, 77)", "a hidden note's i is dark navy in light mode");
    await layPage.screenshot({ path: "/opt/cursor/artifacts/listify-note-i-light.png" });
    await layPage.click('[data-id="a1"] .notetog');
    await layPage.waitForFunction(function () { var n = document.querySelector('[data-id="a1"] .note'); var b = document.querySelector('[data-id="a1"] .notetog'); return n && b && !n.classList.contains("note-off") && b.classList.contains("on"); });
    var iLightOn = await layPage.evaluate(function () { return getComputedStyle(document.querySelector('[data-id="a1"] .notetog')).color; });
    check(iLightOn === "rgb(138, 106, 16)", "a shown note's i is gold in light mode");
    await layPage.setViewportSize({ width: 1100, height: 800 });
    await layPage.click("#box-picker");
    await layPage.waitForSelector("#bmenu:not([hidden])");
    var boxW = await layPage.evaluate(function () {
      var b = document.getElementById("box-picker").getBoundingClientRect();
      var m = document.getElementById("bmenu").getBoundingClientRect();
      return { bw: Math.round(b.width), mw: Math.round(m.width) };
    });
    check(Math.abs(boxW.bw - boxW.mw) <= 2, "the category menu matches its button width");
    await layPage.click("#box-picker");
    await layPage.click("#picker");
    await layPage.waitForSelector("#pmenu:not([hidden])");
    var listW = await layPage.evaluate(function () {
      var b = document.getElementById("picker").getBoundingClientRect();
      var m = document.getElementById("pmenu").getBoundingClientRect();
      return { bw: Math.round(b.width), mw: Math.round(m.width) };
    });
    check(Math.abs(listW.bw - listW.mw) <= 2, "the list menu matches its button width");
    await lay.close();
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
