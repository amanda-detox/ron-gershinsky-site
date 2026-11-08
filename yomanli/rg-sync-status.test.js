/* Status, popup, and restore rules for live Journalify and Purchasify.
   Run: node yomanli/rg-sync-status.test.js */
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
assert(SS.ASK_Q === "זיהיתי הרבה מחיקות ורוצה לוודא שאתה בטוח לגבי זה?", "the popup asks in Ron's exact words, including ל in לגבי");
assert(SS.ASK_Q.indexOf("לגבי") !== -1, "the question includes לגבי");
assert(SS.ASK_YES === "כן, העלי לענן" && SS.ASK_NO === "לא, שחזרי מחיקות", "the popup buttons use the exact wording");

assert(blockedSave.holdBlocked && !blockedSave.clearPending && !blockedSave.again, "a blocked write keeps pending and does not immediately retry");
var doneSave = SS.applySuccess(null, { blocked: false, sentSame: true });
assert(doneSave.clearPending && !doneSave.holdBlocked, "a write that landed clears pending");

function item(id, gone) { return { id: id, at: 1, deleted: !!gone }; }
var cloud = { a: item("a"), b: item("b"), c: item("c"), d: item("d"), e: item("e"), f: item("f") };
var phoneNext = { a: item("a", true), b: item("b", true), c: item("c", true), d: item("d", true), e: item("e"), f: item("f") };
assert(SS.tooManyGone(phoneNext, cloud, 1000, 0) === true, "deleting most of the cloud copy is blocked");
assert(SS.tooManyGone(phoneNext, cloud, 1000, 5000) === false, "a fresh confirm (bulkUntil in the future) allows the write");
assert(SS.tooManyGone({ a: item("a") }, { a: item("a"), b: item("b") }, 1000, 0) === false, "a small list is not treated as a mass deletion");
var half = { a: item("a", true), b: item("b", true), c: item("c", true), d: item("d"), e: item("e"), f: item("f") };
assert(SS.tooManyGone(half, cloud, 1000, 0) === false, "exactly half of a 6-item cloud copy is not more than half");
assert(SS.BULK_MS === 60000 && SS.REQ_MS === 15000, "confirm window is 60s and the request timeout is 15s");

function cat(id, name, at, gone) {
  var x = { id: id, type: "cat", cat: id, name: name, at: at, _f: { name: at, "~": at } };
  if (gone) x.gone = 1;
  return x;
}
var cloudCats = { a: cat("a", "A", 1), b: cat("b", "B", 1), c: cat("c", "C", 1), d: cat("d", "D", 1) };
var phoneCats = { a: cat("a", "A", 4, true), b: cat("b", "B", 4, true), c: cat("c", "C", 4, true), d: cat("d", "D renamed", 8) };
assert(SS.tooManyGone(phoneCats, cloudCats, 1000, 0) === true, "hiding most categories is blocked");
assert(SS.tooManyGone(phoneCats, cloudCats, 1000, 0, { keepGone: true }) === false, "a shopping item with gone still counts as live");
var catsBack = SS.restoreLive(phoneCats, cloudCats);
assert(catsBack.a && !catsBack.a.gone && catsBack.a.name === "A" && catsBack.a.at > 4, "a hidden category comes back from the cloud");
assert(catsBack.d && catsBack.d.name === "D renamed" && catsBack.d.at === 8, "a category that was only renamed stays");
assert(SS.tooManyGone(catsBack, cloudCats, 1000, 0) === false, "restored categories are no longer a mass deletion");
var keptGone = SS.restoreLive({ a: { id: "a", text: "local", at: 3, gone: 1, deleted: false } }, { a: { id: "a", text: "cloud", at: 1 } }, { keepGone: true });
assert(keptGone.a && keptGone.a.text === "local" && keptGone.a.at === 3, "keepGone does not treat a gone shopping item as deleted");

var root = path.join(__dirname, "..");
var liveAccount = fs.readFileSync(path.join(root, "shared/rg-account.js"), "utf8");
var livePublic = fs.readFileSync(path.join(root, "shared/rg-public-store.js"), "utf8");
var liveStore = fs.readFileSync(path.join(root, "my/store.js"), "utf8");
var ideas = fs.readFileSync(path.join(root, "my/ideas/app.js"), "utf8");
assert(liveAccount.indexOf("AbortController") === -1 && liveAccount.indexOf("fetchWithTimeout") === -1, "live rg-account.js has no request timeout");
assert(livePublic.indexOf("fetchWithTimeout") === -1 && livePublic.indexOf("tooManyGone") === -1 && livePublic.indexOf("openDeletion") === -1, "the shared public store is unchanged");
assert(liveStore.indexOf("tooManyGone") === -1, "my/store.js is unchanged");
assert(ideas.indexOf("rg-sync-status.js") !== -1, "Listify still has its own helper and was not rewritten here");

var buyHelper = fs.readFileSync(path.join(root, "purchasify/rg-sync-status.js"), "utf8");
var youHelper = fs.readFileSync(path.join(root, "yomanli/rg-sync-status.js"), "utf8");
assert(buyHelper === youHelper, "Journalify and Purchasify load the same status helper");
assert(youHelper.indexOf("זיהיתי הרבה מחיקות ורוצה לוודא שאתה בטוח לגבי זה?") !== -1, "the helper asks in Ron's exact words");
assert(youHelper.indexOf("כן, העלי לענן") !== -1 && youHelper.indexOf("לא, שחזרי מחיקות") !== -1, "the helper buttons use the exact wording");
assert(youHelper.indexOf("לחתוך") === -1, "the helper does not use a violent Hebrew word");
var css = youHelper.slice(youHelper.indexOf(".rg-delask-back"), youHelper.indexOf("@media"));
assert(css.indexOf("red") === -1 && css.indexOf("orange") === -1 && css.indexOf("#") === -1, "the popup adds no red, orange, or extra colors");
assert(youHelper.indexOf("min-height:48px") !== -1, "popup buttons are 48px tap targets");
assert(youHelper.indexOf("REQ_MS = 15000") !== -1, "hung Appwrite calls time out after 15s");

var yHtml = fs.readFileSync(path.join(root, "yomanli/index.html"), "utf8");
var yApp = fs.readFileSync(path.join(root, "yomanli/app.js"), "utf8");
var ySw = fs.readFileSync(path.join(root, "yomanli/sw.js"), "utf8");
var yStrings = fs.readFileSync(path.join(root, "yomanli/strings.js"), "utf8");
var yStore = fs.readFileSync(path.join(root, "yomanli/rg-store.js"), "utf8");
assert(yHtml.indexOf("<title>Journalify</title>") !== -1, "Journalify keeps its English tab title");
assert(yHtml.indexOf("rg-sync-status.js?v=1") !== -1 && yHtml.indexOf("rg-sync-status.js?v=1") < yHtml.indexOf("../shared/rg-account.js"), "Journalify loads the helper before the shared account script");
assert(yHtml.indexOf("rg-store.js?v=1") !== -1 && yHtml.indexOf("../shared/rg-public-store.js") === -1, "Journalify uses its own store, not the shared one");
assert(yHtml.indexOf("app.js?v=5") !== -1 && yHtml.indexOf("strings.js?v=6") !== -1, "Journalify cache-busts the changed scripts");
assert(yHtml.indexOf('id="status"') === -1, "Journalify no longer keeps the status under the journal");
assert(yApp.indexOf('RGStore("pubyomanli"') !== -1, "Journalify still uses pubyomanli");
assert(yApp.indexOf("openDeletion") !== -1 && yApp.indexOf("restoreBulk") !== -1 && yApp.indexOf("confirmBulk") !== -1, "Journalify opens the popup and can restore or upload");
assert(yStore.indexOf("tooManyGone") !== -1 && yStore.indexOf("restoreLive") !== -1 && yStore.indexOf("blockedCloud") !== -1, "the Journalify store asks before replacing a large cloud deletion");
assert(yStore.indexOf('APP = "pubyomanli"') === -1, "the store still takes the app id from the page");
assert(yStrings.indexOf('"doc": "Journalify"') !== -1 && yStrings.indexOf('"title": "יומןלי"') !== -1, "in-page Hebrew title stays יומןלי");
assert(yStrings.indexOf("syncErrorTimeout") !== -1 && yStrings.indexOf("syncErrorAuth") !== -1, "Journalify has named sync errors in both places");
assert(yApp.indexOf("rg-pub-yomanli-stat") !== -1 && yApp.indexOf('class="jhead"') !== -1 && yApp.indexOf('data-a="stat"') !== -1, "Journalify status sits beside היומן שלי and can fold");
assert(yStrings.indexOf('"statusPeek": "שים לב"') !== -1, "a folded problem keeps a short notice");
assert(ySw.indexOf('CACHE = "rg-pub-yomanli-v6"') !== -1, "Journalify service worker cache was bumped");
assert(ySw.indexOf("rg-sync-status.js?v=1") !== -1 && ySw.indexOf("rg-store.js?v=1") !== -1 && ySw.indexOf("app.js?v=5") !== -1, "the Journalify service worker precaches the new scripts");
assert(yApp.indexOf("לחתוך") === -1 && yStrings.indexOf("לחתוך") === -1, "Journalify copy has no violent Hebrew");

var pHtml = fs.readFileSync(path.join(root, "purchasify/index.html"), "utf8");
var pApp = fs.readFileSync(path.join(root, "purchasify/app.js"), "utf8");
var pSw = fs.readFileSync(path.join(root, "purchasify/sw.js"), "utf8");
assert(pHtml.indexOf("<title>Purchasify</title>") !== -1, "Purchasify keeps its English tab title");
assert(pHtml.indexOf("rg-sync-status.js?v=1") !== -1 && pHtml.indexOf("rg-sync-status.js?v=1") < pHtml.indexOf("../shared/rg-account.js"), "Purchasify loads the helper before the shared account script");
assert(pHtml.indexOf("app.js?v=50") !== -1, "Purchasify cache-busts app.js");
assert(pHtml.indexOf('class="cathead"') !== -1 && pHtml.indexOf('id="status"') < pHtml.indexOf("</main>"), "Purchasify status sits beside the list heading");
assert(pHtml.indexOf('statusPeek: "שים לב"') !== -1, "Purchasify uses the same short notice when folded");
assert(pHtml.indexOf('title: "קניותיפיי"') !== -1, "in-page Hebrew title stays קניותיפיי");
assert(pHtml.indexOf("syncErrorTimeout") !== -1 && pHtml.indexOf("syncErrorAuth") !== -1, "Purchasify has named sync errors");
assert(pApp.indexOf('APP = "pubpurchasify"') !== -1, "Purchasify still uses pubpurchasify");
assert(pApp.indexOf("rg-pub-purchasify:") !== -1, "Purchasify still uses its existing storage key");
assert(pApp.indexOf("openDeletion") !== -1 && pApp.indexOf("restoreBlocked") !== -1 && pApp.indexOf("confirmBlocked") !== -1, "Purchasify opens the popup and can restore or upload");
assert(pApp.indexOf("keepGone: true") !== -1, "shopping items do not treat gone as a deletion");
assert(pApp.indexOf("blockedItems") !== -1 && pApp.indexOf("blockedCats") !== -1, "Purchasify can restore items and categories separately");
assert(pApp.indexOf("rg-pub-purchasify-stat") !== -1 && pApp.indexOf("toggleStat") !== -1, "Purchasify remembers whether the status is folded");
assert(pSw.indexOf('CACHE = "rg-pub-purchasify-v4"') !== -1, "Purchasify service worker cache was bumped");
assert(pSw.indexOf("rg-sync-status.js?v=1") !== -1 && pSw.indexOf("app.js?v=50") !== -1, "the Purchasify service worker precaches the new helper and app");
assert(pApp.indexOf("לחתוך") === -1 && pHtml.indexOf("לחתוך") === -1, "Purchasify copy has no violent Hebrew");

var rehab = fs.readFileSync(path.join(root, "rehabify/index.html"), "utf8");
assert(rehab.indexOf("../shared/rg-public-store.js") !== -1 && rehab.indexOf("rg-sync-status.js") === -1, "rehabify still uses the shared store and has no deletion popup");

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
  console.log("all live journal and purchase sync-status checks passed");
}
