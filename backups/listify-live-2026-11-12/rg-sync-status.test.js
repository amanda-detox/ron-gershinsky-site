/* Status rules for live private Listify. Run: node my/ideas/rg-sync-status.test.js */
"use strict";
var fs = require("fs");
var path = require("path");
var SS = require("./rg-sync-status.js");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL " + msg); failed++; }
  else console.log("ok " + msg);
}

var phone = { maySync: true, uid: "ron", blocked: true, bulkUntil: 0, err: "", onLine: true, failN: 0, pending: true, busy: false, offline: false };
assert(SS.kind(phone) === "blocked", "a blocked large deletion is not saving");
assert(SS.kind({ maySync: true, uid: "ron", blocked: false, err: "", onLine: true, pending: true, busy: true, offline: false }) === "saving", "a real in-flight save still says saving");
assert(SS.kind({ maySync: true, uid: "ron", blocked: false, err: "", onLine: true, pending: false, busy: false, offline: false }) === "synced", "a finished save says synced");
assert(SS.kind({ maySync: false, uid: null, pending: true, busy: false }) === "localOnly", "signed out is local-only even if a pending flag was left behind");
assert(SS.kind({ maySync: true, uid: "ron", offline: true, onLine: false, pending: true, err: "" }) === "offline", "real offline stays offline, not saving");
assert(SS.kind({ maySync: true, uid: "ron", err: "auth", pending: true, onLine: true, offline: false }) === "syncErrorAuth", "401 is not offline and not saving");
assert(SS.kind({ maySync: true, uid: "ron", err: "denied", pending: true, onLine: true }) === "syncErrorDenied", "403 is its own status");
assert(SS.kind({ maySync: true, uid: "ron", err: "paused", pending: true, onLine: true, offline: true }) === "syncErrorPaused", "project_paused is not called offline");
assert(SS.kind({ maySync: true, uid: "ron", err: "server", pending: true, onLine: true }) === "syncErrorServer", "5xx is not saving");
assert(SS.kind({ maySync: true, uid: "ron", err: "timeout", pending: true, onLine: true, failN: 2 }) === "syncErrorTimeout", "repeated timeout is an error, not endless saving");

assert(SS.classifyError({ status: 401, type: "user_unauthorized" }) === "auth", "401 classifies as auth");
assert(SS.classifyError({ status: 403 }) === "denied", "403 classifies as denied");
assert(SS.classifyError({ status: 503, type: "project_paused", message: "Project is paused" }) === "paused", "project_paused is paused");
assert(SS.classifyError({ status: 500, message: "server" }) === "server", "500 classifies as server");
assert(SS.classifyError({ status: 0, type: "network" }) === "network", "status 0 is network");
assert(SS.classifyError({ timeout: true, status: 0, type: "timeout" }) === "timeout", "abort timeout is timeout");
var wrapped = new Error("network");
wrapped.status = 0; wrapped.type = "network"; wrapped.cause = { timeout: true, type: "timeout", status: 0 };
assert(SS.classifyError(wrapped) === "timeout", "a timeout nested by shared rg-account.js is still a timeout");
assert(SS.classifyError({ code: "signed_out" }) === "signed_out", "signed out is not a network failure");

var once = SS.applyFailure({ failN: 0 }, { type: "timeout", timeout: true }, true);
assert(once.failN === 1 && once.syncErr === "" && once.offline === false, "the first timeout stays retryable and is not labeled offline");
assert(SS.kind({ maySync: true, uid: "ron", err: once.syncErr, failN: once.failN, pending: true, onLine: true }) === "saving", "one timeout can still say saving while it retries");
var twice = SS.applyFailure(once, wrapped, true);
assert(twice.failN === 2 && twice.syncErr === "timeout", "the second timeout becomes an error");
var paused = SS.applyFailure({ failN: 0 }, { status: 503, type: "project_paused", message: "project_paused" }, true);
assert(paused.syncErr === "paused" && paused.offline === false, "a paused project does not set the offline flag");
var down = SS.applyFailure({ failN: 0 }, { status: 0, type: "network" }, false);
assert(down.offline === true && down.syncErr === "", "browser offline is the offline flag");
var oddNet = SS.applyFailure({ failN: 1 }, { status: 0, type: "network" }, true);
assert(oddNet.syncErr === "server" && oddNet.offline === false, "a failed request while online is a sync error after it repeats");

var blockedSave = SS.applySuccess(null, { blocked: true, sentSame: false });
function row(id, text, at, deleted) {
  var x = { id: id, text: text, at: at, _f: { text: at, "~": at } };
  if (deleted) x.deleted = true;
  return x;
}
var cloud6 = { a: row("a", "A", 1), b: row("b", "B", 1), c: row("c", "C", 1), d: row("d", "D", 1), e: row("e", "E", 1), f: row("f", "F", 1) };
var phoneLocal = {
  a: row("a", "A", 5, true), b: row("b", "B", 5, true), c: row("c", "C", 5, true), d: row("d", "D", 5, true),
  e: row("e", "E edited", 9), n: row("n", "new on phone", 8)
};
var restored = SS.restoreLive(phoneLocal, cloud6);
assert(restored.a && !restored.a.deleted && restored.a.text === "A" && restored.a.at > 5, "a cloud item deleted on the phone comes back newer than the tombstone");
assert(restored.e && restored.e.text === "E edited" && restored.e.at === 9, "a local edit that was not deleted stays");
assert(restored.n && restored.n.text === "new on phone", "a local addition stays");
assert(restored.f && restored.f.text === "F", "a cloud item missing locally is kept");
assert(restored.a._f && restored.a._f["~"] === restored.a.at, "a restored item stamps its field clock so the tombstone does not win the next merge");
assert(SS.liveCount(restored) === 7, "restore keeps the new item and the six cloud items");
assert(SS.tooManyGone(restored, cloud6, 1000, 0) === false, "after restore the upload is no longer blocked");
var after = SS.applySuccess(null, { blocked: false, sentSame: true });
assert(after.clearPending && !after.holdBlocked, "a successful restore upload clears pending so the status is not saving");
assert(SS.ASK_Q.indexOf("להשאיר את הענן") !== -1, "the overwrite prompt asks to keep the cloud");
assert(SS.ASK_YES === "השאר את הענן" && SS.ASK_NO === "העלה בכל זאת", "the overwrite prompt defaults to keeping the cloud");

assert(blockedSave.holdBlocked && !blockedSave.clearPending && !blockedSave.again, "a blocked write keeps pending and does not immediately retry");
var doneSave = SS.applySuccess(null, { blocked: false, sentSame: true });
assert(doneSave.clearPending && !doneSave.holdBlocked, "a write that landed clears pending");

function item(id, gone) { return { id: id, at: 1, deleted: !!gone }; }
var cloud = { a: item("a"), b: item("b"), c: item("c"), d: item("d"), e: item("e"), f: item("f") };
var phoneNext = { a: item("a", true), b: item("b", true), c: item("c", true), d: item("d", true), e: item("e"), f: item("f") };
assert(SS.tooManyGone(phoneNext, cloud, 1000, 0) === true, "deleting most of the cloud copy is blocked");
assert(SS.tooManyGone(phoneNext, cloud, 1000, 5000) === false, "a fresh confirm (bulkUntil in the future) allows the write");
assert(SS.tooManyGone({ a: item("a") }, { a: item("a"), b: item("b") }, 1000, 0) === false, "a small list is not treated as a mass deletion");
assert(SS.BULK_MS === 60000 && SS.REQ_MS === 15000, "confirm window is 60s and the request timeout is 15s");

var root = path.join(__dirname, "../..");
var liveAccount = fs.readFileSync(path.join(root, "shared/rg-account.js"), "utf8");
var liveIdeas = fs.readFileSync(path.join(root, "my/ideas/app.js"), "utf8");
var liveHtml = fs.readFileSync(path.join(root, "my/ideas/index.html"), "utf8");
var liveSw = fs.readFileSync(path.join(root, "my/ideas/sw.js"), "utf8");
var liveStore = fs.readFileSync(path.join(root, "my/store.js"), "utf8");
var livePublic = fs.readFileSync(path.join(root, "shared/rg-public-store.js"), "utf8");
assert(liveAccount.indexOf("AbortController") === -1 && liveAccount.indexOf("fetchWithTimeout") === -1, "live rg-account.js has no request timeout");
assert(livePublic.indexOf("fetchWithTimeout") === -1, "live public store is unchanged");
assert(liveStore.indexOf("tooManyGone") === -1, "my/store.js is not the private Listify engine");
assert(liveIdeas.indexOf('APP = "myideas"') !== -1 && liveIdeas.indexOf("sbxmyideas") === -1, "live private Listify still uses myideas");
assert(liveIdeas.indexOf("holdBlocked") !== -1 && liveIdeas.indexOf("restoreBlocked") !== -1 && liveIdeas.indexOf("ensureDeletion") !== -1, "live private Listify asks before uploading or restoring a large deletion");
assert(liveIdeas.indexOf("sameDeviceEdits") !== -1 && liveIdeas.indexOf("armQuietRestore") !== -1 && liveIdeas.indexOf("needsConfirm") !== -1, "live Listify has the v15 clash, restore, and overwrite guards");
assert(liveIdeas.indexOf('APP = "myideas"') !== -1 && liveIdeas.indexOf("rg-sbx-ideas-") === -1, "live storage keys stay rg-myideas");
assert(liveIdeas.indexOf('t("blockedAct")') === -1, "the single status-line confirm button is no longer the blocked action");
assert(liveIdeas.indexOf("לחתוך") === -1, "live private Listify does not use a violent Hebrew word");
var statusSrc = fs.readFileSync(path.join(__dirname, "rg-sync-status.js"), "utf8");
assert(statusSrc.indexOf("להשאיר את הענן") !== -1, "the helper asks to keep the cloud");
assert(statusSrc.indexOf("השאר את הענן") !== -1 && statusSrc.indexOf("העלה בכל זאת") !== -1, "the helper buttons default to keeping the cloud");
var css = statusSrc.slice(statusSrc.indexOf(".rg-delask-back"), statusSrc.indexOf("@media"));
assert(statusSrc.indexOf("לחתוך") === -1 && css.indexOf("red") === -1 && css.indexOf("orange") === -1 && css.indexOf("#") === -1, "the popup adds no violent wording and no red, orange, or extra colors");
assert(statusSrc.indexOf("min-height:48px") !== -1, "popup buttons are 48px tap targets");
assert(liveHtml.indexOf("rg-sync-status.js?v=8") !== -1 && liveHtml.indexOf("rg-sync-status.js?v=8") < liveHtml.indexOf("../../shared/rg-account.js"), "the page helper loads before the shared account script");
assert(liveHtml.indexOf("../sandbox-shared/") === -1 && liveHtml.indexOf("sandbox-tag") === -1, "live private Listify does not load sandbox scripts or the sandbox banner");
assert(liveHtml.indexOf("<title>Listify</title>") !== -1, "the browser tab stays Listify in English");
assert(liveSw.indexOf('CACHE = "rg-myideas-v55"') !== -1 && liveSw.indexOf('cache: "no-cache"') !== -1, "the private Listify service worker cache was bumped and revalidates html and js");
assert(liveHtml.indexOf('updateViaCache:"none"') !== -1 && liveHtml.indexOf("גרסה חדשה מוכנה, תתעדכן אחרי הסנכרון") !== -1, "a new version reloads only when local edits are safe");
assert(liveHtml.indexOf('id="print-btn"') !== -1 && liveHtml.indexOf("window.print()") !== -1 && liveHtml.indexOf('print: "הדפס"') !== -1 && liveHtml.indexOf('print: "Print"') !== -1, "private Listify prints through the browser dialog");
assert(liveHtml.indexOf('id="hist-btn"') !== -1 && liveHtml.indexOf('id="restore-file"') !== -1, "version history and file restore are on the live page");
assert(liveSw.indexOf("rg-sync-status.js?v=8") !== -1 && liveSw.indexOf("app.js?v=55") !== -1 && liveSw.indexOf("restore.js?v=1") !== -1, "the service worker precaches the new helper and app");

function never() { return new Promise(function () {}); }
SS.fetchWithTimeout(never, "/x", {}, 30).then(function () {
  assert(false, "a hung fetch should reject");
  finish();
}, function (e) {
  assert(e && e.type === "timeout" && e.timeout === true, "a hung fetch rejects as timeout");
  return SS.fetchWithTimeout(function () { return Promise.resolve({ ok: true, body: "yes" }); }, "/y", {}, 1000);
}).then(function (v) {
  assert(v && v.body === "yes", "a fast fetch still resolves");
  finish();
}, function (e) {
  assert(false, "fast fetch rejected " + (e && e.message));
  finish();
});

function finish() {
  if (failed) { console.error(failed + " failed"); process.exit(1); }
  console.log("all live listify sync-status checks passed");
}
