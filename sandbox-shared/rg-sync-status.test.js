/* Status rules for the list sandboxes. Run: node sandbox-shared/rg-sync-status.test.js */
"use strict";
var fs = require("fs");
var path = require("path");
var SS = require("./rg-sync-status.js");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL " + msg); failed++; }
  else console.log("ok " + msg);
}

function liveIdeasStatus(uid, offline, pending, busy) {
  if (!uid) return "";
  if (offline) return "offline";
  if (pending || busy) return "saving";
  return "synced";
}

var phone = { maySync: true, uid: "ron", blocked: true, bulkUntil: 0, err: "", onLine: true, failN: 0, pending: true, busy: false, offline: false };
assert(liveIdeasStatus("ron", false, true, false) === "saving", "live my/ideas would keep showing saving when pending survives a successful read");
assert(SS.kind(phone) === "blocked", "the same phone state is a blocked large deletion, not saving");
assert(SS.kind({ maySync: true, uid: "ron", blocked: false, err: "", onLine: true, pending: true, busy: true, offline: false }) === "saving", "a real in-flight save still says saving");
assert(SS.kind({ maySync: true, uid: "ron", blocked: false, err: "", onLine: true, pending: false, busy: false, offline: false }) === "synced", "a finished save says synced");
assert(SS.kind({ maySync: false, uid: null, pending: true, busy: false }) === "localOnly", "signed out is local-only even if a pending flag was left behind");
assert(SS.kind({ maySync: false, uid: "guest", pending: true }) === "localOnly", "guest is local-only, not saving");
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
assert(SS.classifyError({ code: "signed_out" }) === "signed_out", "signed out is not a network failure");

var once = SS.applyFailure({ failN: 0 }, { type: "timeout", timeout: true }, true);
assert(once.failN === 1 && once.syncErr === "" && once.offline === false, "the first timeout stays retryable and is not labeled offline");
assert(SS.kind({ maySync: true, uid: "ron", err: once.syncErr, failN: once.failN, pending: true, onLine: true }) === "saving", "one timeout can still say saving while it retries");
var twice = SS.applyFailure(once, { type: "timeout", timeout: true }, true);
assert(twice.failN === 2 && twice.syncErr === "timeout", "the second timeout becomes an error");
var paused = SS.applyFailure({ failN: 0 }, { status: 503, type: "project_paused", message: "project_paused" }, true);
assert(paused.syncErr === "paused" && paused.offline === false, "a paused project does not set the offline flag");
var down = SS.applyFailure({ failN: 0 }, { status: 0, type: "network" }, false);
assert(down.offline === true && down.syncErr === "", "browser offline is the offline flag");
var oddNet = SS.applyFailure({ failN: 1 }, { status: 0, type: "network" }, true);
assert(oddNet.syncErr === "server" && oddNet.offline === false, "a failed request while online is a sync error after it repeats");

var blockedSave = SS.applySuccess(null, { blocked: true, sentSame: false });
function row(id, text, at, deleted) {
  var x = { id: id, text: text, at: at };
  if (deleted) x.deleted = true;
  return x;
}
var cloud6 = { a: row("a", "A", 1), b: row("b", "B", 1), c: row("c", "C", 1), d: row("d", "D", 1), e: row("e", "E", 1), f: row("f", "F", 1) };
var phoneLocal = {
  a: row("a", "A", 5, true), b: row("b", "B", 5, true), c: row("c", "C", 5, true), d: row("d", "D", 5, true),
  e: row("e", "E edited", 9), n: row("n", "new on phone", 8)
};
var restored = SS.restoreLive(phoneLocal, cloud6);
assert(restored.a && !restored.a.deleted && restored.a.text === "A", "a cloud item deleted on the phone comes back");
assert(restored.e && restored.e.text === "E edited", "a local edit that was not deleted stays");
assert(restored.n && restored.n.text === "new on phone", "a local addition stays");
assert(restored.f && restored.f.text === "F", "a cloud item missing locally is kept");
assert(SS.liveCount(restored) === 7, "restore keeps the new item and the six cloud items");
assert(SS.tooManyGone(restored, cloud6, 1000, 0) === false, "after restore the upload is no longer blocked");
var after = SS.applySuccess(null, { blocked: false, sentSame: true });
assert(after.clearPending && !after.holdBlocked, "a successful restore upload clears pending so the status is not saving");

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

var root = path.join(__dirname, "..");
var liveAccount = fs.readFileSync(path.join(root, "shared/rg-account.js"), "utf8");
var liveIdeas = fs.readFileSync(path.join(root, "my/ideas/app.js"), "utf8");
var liveStore = fs.readFileSync(path.join(root, "my/store.js"), "utf8");
var livePublic = fs.readFileSync(path.join(root, "shared/rg-public-store.js"), "utf8");
assert(liveAccount.indexOf("AbortController") === -1 && liveAccount.indexOf("fetchWithTimeout") === -1, "live rg-account.js has no request timeout");
assert(liveIdeas.indexOf('APP = "myideas"') !== -1 && liveIdeas.indexOf("sbxmyideas") === -1, "live private Listify still uses myideas");
assert(liveIdeas.indexOf('s.textContent = !uid ? "" : offline ? t("offline") : (pending || busy) ? t("saving") : t("synced")') !== -1, "live private Listify still collapses pending into saving");
assert(liveStore.indexOf("tooManyGone") === -1, "my/store.js is not the private Listify engine");
assert(livePublic.indexOf("fetchWithTimeout") === -1, "live public store is unchanged");

var sbxIdeas = fs.readFileSync(path.join(root, "ideas-sandbox/app.js"), "utf8");
var sbxIdeasHtml = fs.readFileSync(path.join(root, "ideas-sandbox/index.html"), "utf8");
var sbxIdeasSw = fs.readFileSync(path.join(root, "ideas-sandbox/sw.js"), "utf8");
assert(sbxIdeas.indexOf('APP = "sbxmyideas"') !== -1, "ideas sandbox uses sbxmyideas");
assert(sbxIdeas.indexOf('APP = "myideas"') === -1 && sbxIdeas.indexOf("rg-myideas") === -1, "ideas sandbox does not use live app id or live storage keys");
assert(sbxIdeas.indexOf("אמנדה") === -1 && sbxIdeas.indexOf("הרגלים שלי") === -1, "ideas sandbox does not copy the personal one-time lists");
assert(sbxIdeas.indexOf("holdBlocked") !== -1 && sbxIdeas.indexOf("restoreBlocked") !== -1 && sbxIdeas.indexOf("openDeletion") !== -1, "ideas sandbox asks before uploading or restoring a large deletion");
assert(sbxIdeas.indexOf("blockedAct") === -1, "ideas sandbox no longer uses the single confirm button");
var statusSrc = fs.readFileSync(path.join(__dirname, "rg-sync-status.js"), "utf8");
assert(statusSrc.indexOf("זיהיתי הרבה מחיקות ורוצה לוודא שאתה בטוח לגבי זה?") !== -1, "the popup asks in Ron's exact words");
assert(statusSrc.indexOf("כן, העלי לענן") !== -1 && statusSrc.indexOf("לא, שחזרי מחיקות") !== -1, "the popup buttons use the exact wording");
assert(statusSrc.indexOf("לחתוך") === -1, "the popup does not use a violent Hebrew word");
var yApp2 = fs.readFileSync(path.join(root, "yomanli-sandbox/app.js"), "utf8");
assert(yApp2.indexOf("openDeletion") !== -1 && yApp2.indexOf("restoreDeleted") !== -1, "yomanli sandbox uses the same popup");
var buyApp = fs.readFileSync(path.join(root, "purchasify-sandbox/app.js"), "utf8");
assert(buyApp.indexOf("openDeletion") !== -1 && buyApp.indexOf("restoreBlocked") !== -1, "purchasify sandbox uses the same popup");
assert(sbxIdeasHtml.indexOf("../sandbox-shared/rg-account.js") !== -1 && sbxIdeasHtml.indexOf("../sandbox-shared/rg-sync-status.js") !== -1, "ideas sandbox loads the sandbox account and status helper");
assert(sbxIdeasHtml.indexOf("../../shared/rg-account.js") === -1 && sbxIdeasHtml.indexOf("../shared/rg-account.js") === -1, "ideas sandbox does not load the live account script");
assert(sbxIdeasSw.indexOf('indexOf("rg-sbx-ideas-")') !== -1 && sbxIdeasSw.indexOf("rg-myideas-") === -1, "ideas sandbox cache cannot delete the live ideas cache");

var sbxBuy = fs.readFileSync(path.join(root, "purchasify-sandbox/app.js"), "utf8");
var sbxBuyHtml = fs.readFileSync(path.join(root, "purchasify-sandbox/index.html"), "utf8");
assert(sbxBuy.indexOf('APP = "sbxpurchasify"') !== -1 && sbxBuy.indexOf("rg-pub-purchasify") === -1, "purchasify sandbox has its own app id and keys");
assert(sbxBuyHtml.indexOf("../sandbox-shared/rg-account.js") !== -1, "purchasify sandbox loads the sandbox account");
assert(sbxBuy.indexOf("importAsk") !== -1, "purchasify sandbox offers a guest import instead of copying automatically");

var yHtml = fs.readFileSync(path.join(root, "yomanli-sandbox/index.html"), "utf8");
var yApp = fs.readFileSync(path.join(root, "yomanli-sandbox/app.js"), "utf8");
assert(yHtml.indexOf("../sandbox-shared/rg-public-store.js") !== -1 && yHtml.indexOf("../shared/rg-public-store.js") === -1, "yomanli sandbox loads the sandbox store");
assert(yHtml.indexOf("../sandbox-shared/rg-account.js") !== -1, "yomanli sandbox loads the sandbox account");
assert(yApp.indexOf('RGStore("sbxyomanli"') !== -1 && yApp.indexOf("confirmBulk") !== -1, "yomanli sandbox can confirm a blocked store write");

var home = fs.readFileSync(path.join(root, "index.html"), "utf8");
assert(home.indexOf("ideas-sandbox") === -1 && home.indexOf("purchasify-sandbox") === -1, "homepage does not link the new sandboxes");

function never(ms) {
  return new Promise(function () {});
}
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
  console.log("all sync-status checks passed");
}
