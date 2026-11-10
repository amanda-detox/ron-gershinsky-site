/* Sandbox Listify sync rules. Run: node ideas-sandbox/rg-sync-status.test.js */
"use strict";
var fs = require("fs");
var path = require("path");
var SS = require("./rg-sync-status.js");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL " + msg); failed++; }
  else console.log("ok " + msg);
}

assert(SS.READ_MS === 15000 && SS.REQ_MS === 15000, "reads stay on the 15s limit");
assert(SS.UPLOAD_MS === 60000, "uploads get 60s");
assert(SS.timeoutFor({ method: "GET" }, 15000) === 15000, "a download keeps the 15s timeout");
assert(SS.timeoutFor({ method: "HEAD" }, 15000) === 15000, "a header read keeps the 15s timeout");
assert(SS.timeoutFor({}, 15000) === 15000, "a call with no method is a read");
assert(SS.timeoutFor({ method: "PATCH" }, 15000) === 60000, "an upload ignores the 15s read timeout");
assert(SS.timeoutFor({ method: "POST" }, SS.REQ_MS) === SS.UPLOAD_MS, "a create ignores the timeout the account helper passes");
assert(SS.timeoutFor({ method: "PUT" }, 15000) === 60000 && SS.timeoutFor({ method: "patch" }, 15000) === 60000, "every write method gets the upload limit");
assert(SS.backoffMs(1) === 2000 && SS.backoffMs(2) === 4000 && SS.backoffMs(3) === 8000, "retries wait longer each time");
assert(SS.backoffMs(2) > SS.backoffMs(1) && SS.backoffMs(6) === 60000 && SS.backoffMs(8) === 60000, "the backoff grows and then stops at 60s");

assert(SS.kind({ maySync: true, uid: "ron", uploadCut: true, pending: true, busy: true, onLine: true, err: "", blocked: false }) === "uploadCut", "a cut-off upload stays visible instead of שומר…");
assert(SS.kind({ maySync: true, uid: "ron", uploadCut: true, err: "timeout", pending: true, onLine: true, failN: 2 }) === "syncErrorTimeout", "repeated upload timeouts stay an error");
assert(SS.kind({ maySync: true, uid: "ron", blocked: true, uploadCut: true, bulkUntil: 0, pending: true }) === "blocked", "a deletion question wins over the cutoff line");
assert(SS.kind({ maySync: true, uid: "ron", blocked: true, bulkUntil: 0, pending: true, busy: true }) === "blocked", "a blocked deletion is not silent saving");

var stampAt = new Date(2026, 0, 5, 9, 4).getTime();
assert(SS.formatSyncTime(stampAt) === "05/01 09:04", "the clock is local 24h DD/MM HH:MM");
assert(SS.lastSyncLabel(stampAt) === "סונכרן לאחרונה ב-05/01 09:04", "the line under the status uses the exact Hebrew");
assert(SS.LAST_PREFIX === "rg-sbx-ideas-lastsync:", "the clock is stored per user and survives reload");
assert(SS.shouldStampSync({ downloaded: true, uploaded: true, nothingToUpload: false, blocked: false, failed: false, pendingLeft: false }) === true, "a finished upload counts");
assert(SS.shouldStampSync({ downloaded: true, uploaded: false, nothingToUpload: true, blocked: false, failed: false, pendingLeft: false }) === true, "a download with nothing to upload counts");
assert(SS.shouldStampSync({ downloaded: true, uploaded: true, blocked: true, failed: false, pendingLeft: false }) === false, "a sync held by the deletion guard does not count");
assert(SS.shouldStampSync({ downloaded: true, nothingToUpload: true, blocked: true, failed: false, pendingLeft: false }) === false, "a held round does not count even when the documents match");
assert(SS.shouldStampSync({ downloaded: false, uploaded: true, failed: true, blocked: false, pendingLeft: false }) === false, "a failed round does not count");
assert(SS.shouldStampSync({ downloaded: true, uploaded: true, failed: false, blocked: false, pendingLeft: true }) === false, "an upload that left newer local edits does not count yet");
assert(SS.shouldStampSync({ downloaded: true, uploaded: false, nothingToUpload: false, failed: false, blocked: false, pendingLeft: false }) === false, "a download that never uploaded does not count");

function row(id, text, at) { return { id: id, text: text, at: at, _f: { text: at, "~": at } }; }
var union = SS.restoreLive(
  { n: row("n", "only phone", 4), a: row("a", "phone edit", 9) },
  { a: row("a", "cloud", 2), c: row("c", "only cloud", 3) }
);
assert(union.n && union.n.text === "only phone" && union.c && union.c.text === "only cloud", "a normal merge keeps data that exists on only one side");
assert(union.a && union.a.text === "phone edit", "a newer local edit is not overwritten by the cloud");

var plan = SS.planCloudLoad({ a: row("a", "phone only", 4) }, { seeded: true, items: { b: row("b", "cloud", 2) } });
assert(plan.writeCloud === false, "loading the cloud copy is not a cloud write");
assert(plan.backup.a && plan.backup.a.text === "phone only" && plan.next.b && !plan.next.a, "the phone-only item stays in the backup and the device takes the cloud copy");
assert(plan.seeded === true, "the cloud seeded flag is kept");

var root = path.join(__dirname, "..");
var app = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
var html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
var sw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
var src = fs.readFileSync(path.join(__dirname, "rg-sync-status.js"), "utf8");
var acct = fs.readFileSync(path.join(root, "sandbox-shared/rg-account.js"), "utf8");
assert(acct.indexOf("RGSyncStatus.REQ_MS") !== -1, "the sandbox account helper still passes one timeout for every call");
assert(app.indexOf('APP = "sbxmyideas"') !== -1, "the sandbox app id is unchanged");
assert(app.indexOf('APP = "myideas"') === -1 && app.indexOf("rg-myideas") === -1, "the sandbox does not use the live app id or live storage keys");
assert(app.indexOf("אמנדה") === -1 && app.indexOf("הרגלים שלי") === -1, "personal one-time lists stay out of the sandbox");
assert(app.indexOf("for (k in a) if (valid(a[k])) out[k] = a[k];") !== -1, "the merge still starts from the local copy");
assert(app.indexOf("out[k] = out[k] ? mergeItem(out[k], b[k]) : b[k];") !== -1, "the merge still unions in cloud-only items");
assert(app.indexOf("items = cl") === -1 && app.indexOf("items = merged") !== -1, "automatic sync merges and does not replace the local copy with the cloud");
assert(app.indexOf("ensureDeletion") !== -1 && app.indexOf("restoreBlocked") !== -1 && app.indexOf('t("blockedAct")') === -1, "the deletion question stays a two-choice prompt and is never a one-tap delete");
assert(app.indexOf("shouldStampSync") !== -1 && app.indexOf("rg-sbx-ideas-lastsync:") !== -1, "the app records a last sync only through the success rule");
assert(app.indexOf("לחתוך") === -1 && src.indexOf("לחתוך") === -1 && html.indexOf("לחתוך") === -1, "no violent Hebrew");
var loadBody = app.slice(app.indexOf("function loadFromCloud"), app.indexOf("function syncSoon"));
assert(loadBody.indexOf("loadCloudCopy") !== -1 && loadBody.indexOf("A.set") === -1 && loadBody.indexOf('"-bak"') !== -1, "טען מהענן saves a -bak copy and has no cloud write");
assert(html.indexOf('id="lastsync"') !== -1 && html.indexOf('id="status"') < html.indexOf('id="lastsync"') && html.indexOf('id="lastsync"') < html.indexOf('id="cloudat"'), "the clock sits directly under #status");
assert(html.indexOf("סונכרן לאחרונה ב-{t}") !== -1 && html.indexOf('loadCloud: "טען מהענן"') !== -1, "the Hebrew clock and the account action use the exact words");
assert(html.indexOf("<title>Listify</title>") !== -1 && html.indexOf('doc: "Listify"') !== -1, "the browser tab stays Listify in English");
assert(html.indexOf("../sandbox-shared/rg-sync-status.js") !== -1 && html.indexOf("rg-sync-status.js?v=1") > html.indexOf("../sandbox-shared/rg-sync-status.js") && html.indexOf("rg-sync-status.js?v=1") < html.indexOf("../sandbox-shared/rg-account.js"), "the sandbox helper replaces the shared one before account calls");
assert(sw.indexOf('CACHE = "rg-sbx-ideas-v4"') !== -1 && sw.indexOf("rg-sync-status.js?v=1") !== -1 && sw.indexOf("app.js?v=42") !== -1, "the sandbox service worker cache was bumped");
assert(sw.indexOf('indexOf("rg-sbx-ideas-")') !== -1 && sw.indexOf("rg-myideas-") === -1, "the sandbox cache cannot delete the live cache");
var css = src.slice(src.indexOf(".rg-delask-back"), src.indexOf("@media"));
assert(css.indexOf("red") === -1 && css.indexOf("#") === -1 && html.indexOf(".lastsync") !== -1 && html.slice(html.indexOf(".lastsync"), html.indexOf(".lastsync") + 280).indexOf("red") === -1, "new UI keeps the existing palette");
assert(SS.ASK_Q.indexOf("זיהיתי הרבה מחיקות") === 0 && SS.ASK_YES === "כן, העלי לענן" && SS.ASK_NO === "לא, שחזרי מחיקות", "the deletion prompt is unchanged and is not an automatic delete");
assert(SS.LOAD_YES === "טען מהענן" && SS.LOAD_Q.indexOf("הענן לא ייכתב") !== -1, "the load action says it will not write the cloud");

function spyTimers() {
  var real = global.setTimeout, seen = [];
  global.setTimeout = function (fn, ms) { seen.push(ms); return real(fn, ms); };
  return { seen: seen, restore: function () { global.setTimeout = real; } };
}

var spy = spyTimers();
var reads = 0, writes = 0;
SS.fetchWithTimeout(function () { reads++; return Promise.resolve({ ok: true, body: "read" }); }, "/row", { method: "GET" }, 15000).then(function (v) {
  assert(v && v.body === "read" && reads === 1, "a fast download still resolves");
  assert(spy.seen.indexOf(15000) !== -1 && spy.seen.indexOf(60000) === -1, "the download timer is 15s");
  spy.seen.length = 0;
  return SS.fetchWithTimeout(function () { writes++; return Promise.resolve({ ok: true, body: "wrote" }); }, "https://fra.cloud.appwrite.io/v1/tablesdb/ron/tables/userdata/rows/r1", { method: "PATCH" }, 15000);
}).then(function (v) {
  assert(v && v.body === "wrote" && writes === 1, "a fast upload is not cut off");
  assert(spy.seen[0] === 60000 && spy.seen.indexOf(15000) === -1, "the upload timer is 60s even when the caller passes 15s");
  spy.restore();
  return SS.fetchWithTimeout(function () { return new Promise(function () {}); }, "/slow-read", { method: "GET" }, 30);
}).then(function () {
  assert(false, "a hung download should reject");
  return null;
}, function (e) {
  assert(e && e.type === "timeout" && e.timeout === true, "a hung download still rejects as a timeout");
  var order = [];
  return SS.loadCloudCopy({
    local: { a: row("a", "phone only", 4) },
    saveBak: function (local) { order.push("bak:" + (local.a && local.a.text)); },
    get: function () { order.push("get"); return Promise.resolve({ seeded: true, items: { b: row("b", "from cloud", 8) } }); },
    set: function () { order.push("set"); return Promise.resolve("wrote"); }
  }).then(function (res) {
    assert(order.join(",") === "bak:phone only,get", "טען מהענן backs up, then downloads, and never calls set");
    assert(res && res.wrote === false && res.writes === 0, "the load result records no cloud write");
    assert(res.items.b && res.items.b.text === "from cloud" && !res.items.a, "only this device's copy is replaced");
    var noted = [];
    SS.watchCloudUpdated(function (iso) { noted.push(iso); });
    function fake(obj) { return { ok: true, clone: function () { return { json: function () { return Promise.resolve(obj); } }; } }; }
    return SS.fetchWithTimeout(function () { return Promise.resolve(fake({ app: "sbxmyideas", $updatedAt: "2026-11-10T02:05:00.000Z" })); }, "https://fra.cloud.appwrite.io/v1/tablesdb/ron/tables/userdata/rows/r1", { method: "GET" }, 1000).then(function () {
      return new Promise(function (resolve) { setTimeout(resolve, 20); });
    }).then(function () {
      assert(SS.cloudUpdatedAt === "2026-11-10T02:05:00.000Z" && noted[0] === SS.cloudUpdatedAt, "a cloud row download remembers its own updated time");
      return SS.fetchWithTimeout(function () { return Promise.resolve(fake({ app: "prefs", $updatedAt: "1999-01-01T00:00:00.000Z" })); }, "https://fra.cloud.appwrite.io/v1/tablesdb/ron/tables/userdata/rows/p", { method: "GET" }, 1000);
    }).then(function () {
      return new Promise(function (resolve) { setTimeout(resolve, 20); });
    }).then(function () {
      assert(SS.cloudUpdatedAt === "2026-11-10T02:05:00.000Z", "another app's row does not replace the Listify cloud time");
      finish();
    });
  });
}).catch(function (e) {
  assert(false, "unexpected " + (e && e.stack || e));
  finish();
});

function finish() {
  if (failed) { console.error(failed + " failed"); process.exit(1); }
  console.log("all ideas-sandbox sync checks passed");
}
