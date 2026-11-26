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
assert(liveHtml.indexOf("rg-sync-status.js?v=9") !== -1 && liveHtml.indexOf("rg-sync-status.js?v=9") < liveHtml.indexOf("../../shared/rg-account.js"), "the page helper loads before the shared account script");
assert(liveHtml.indexOf("../sandbox-shared/") === -1 && liveHtml.indexOf("sandbox-tag") === -1, "live private Listify does not load sandbox scripts or the sandbox banner");
assert(liveHtml.indexOf("<title>Listify</title>") !== -1, "the browser tab stays Listify in English");
assert(liveSw.indexOf("var CACHE = RG_MYIDEAS_CACHE") !== -1 && liveSw.indexOf('cache: "no-cache"') !== -1, "the private Listify service worker cache was bumped and revalidates html and js");
assert(liveHtml.indexOf('updateViaCache:"none"') !== -1 && liveHtml.indexOf("גרסה חדשה מוכנה, תתעדכן אחרי הסנכרון") !== -1, "a new version reloads only when local edits are safe");
assert(liveHtml.indexOf('id="print-btn"') !== -1 && liveHtml.indexOf("window.print()") !== -1 && liveHtml.indexOf('print: "הדפסה"') !== -1 && liveHtml.indexOf('print: "Print"') !== -1, "private Listify prints through the browser dialog");
assert(liveHtml.indexOf('id="hist-btn"') !== -1 && liveHtml.indexOf('id="restore-file"') !== -1, "version history and file restore are on the live page");
assert(liveSw.indexOf("rg-sync-status.js?v=9") !== -1 && liveSw.indexOf("app.js?v=63") !== -1 && liveSw.indexOf("restore.js?v=2") !== -1 && liveSw.indexOf("version.js?v=7") !== -1, "the service worker precaches the new helper and app");
assert(liveHtml.indexOf('id="list-search"') !== -1 && liveIdeas.indexOf("function searchView") !== -1, "search is on the live page and does not replace the app id");
assert(liveSw.indexOf("icon-maskable-192.png?v=56") !== -1 && liveSw.indexOf("icon-maskable-512.png?v=56") !== -1, "maskable icons are precached under the live cache");
assert(liveIdeas.indexOf("sbxmyideas") === -1 && liveIdeas.indexOf("rg-sbx-ideas") === -1 && liveHtml.indexOf("rg-sbx-ideas") === -1 && liveHtml.indexOf("sandbox-tag") === -1, "live keeps its own keys and has no sandbox banner");
var verFile = fs.readFileSync(path.join(__dirname, "version.js"), "utf8");
assert(verFile.indexOf('RG_MYIDEAS_CACHE = "rg-myideas-v64"') !== -1 && liveSw.indexOf("rg-myideas-v64") === -1 && liveIdeas.indexOf("rg-myideas-v64") === -1, "the cache name is written once, in version.js");
assert(liveHtml.indexOf("version.js?v=7") !== -1 && liveHtml.indexOf("version.js?v=7") < liveHtml.indexOf("app.js?v=63") && liveIdeas.indexOf("RG_MYIDEAS_CACHE") !== -1 && liveIdeas.indexOf('BUILD.slice(3)') !== -1, "the on-screen version is painted from version.js without the rg- prefix");
assert(liveHtml.indexOf('id="backup-link"') !== -1 && liveHtml.indexOf('backupLink: "גיבוי"') !== -1 && liveHtml.indexOf('restoreBtn: "שיחזור"') !== -1 && liveHtml.indexOf('id="box-picker"') !== -1 && liveHtml.indexOf('id="notes-all"') !== -1, "backup, restore, categories, and note toggles are on the live page");
assert(liveHtml.indexOf('class="rg-install"') === -1 && liveHtml.indexOf('id="rg-inst"') === -1 && liveHtml.indexOf('data-menu="install"') !== -1 && liveHtml.indexOf('menuInstall: "התקנה למסך הבית"') !== -1, "install is a menu item, not a blue button");
assert(liveHtml.indexOf('dismissKey:"rg-inst-off"') !== -1 && liveHtml.indexOf("underMyHub:true") !== -1 && liveHtml.indexOf("../../shared/rg-install.js?v=1") !== -1, "the menu still uses the shared install flow");
assert(SS.LAST_PREFIX === "rg-myideas-lastsync:" && SS.formatSyncTime(new Date(2026, 0, 5, 9, 4).getTime()) === "05/01 09:04", "the sync clock stays on the live key and shows the exact time");
assert(typeof SS.capBackups === "function" && SS.HIST_BYTES === 450000 && SS.BAK_BYTES === 480 * 1024, "history uses one 450K cap and backups keep theirs");
function bigList(nItems, edit) {
  var o = {}, i, note = new Array(2501).join("א");
  o["c:shop"] = { id: "c:shop", type: "cat", cat: "shop", name: "קניות", kind: "task", pos: 0, at: 1000 };
  for (i = 0; i < nItems; i++) o["i" + i] = { id: "i" + i, sec: "shop", text: "פריט " + i, note: note, done: false, order: i, created: 1000, at: 1000 };
  o.i0.text = "עריכה " + edit;
  return o;
}
var wide = [], wv;
for (wv = 0; wv < 12; wv++) wide = SS.pushHistory(wide, bigList(82, wv), 5000 + wv, true, { id: "row-" + wv });
var uncapped = SS.packHistory(wide, 1000000000);
var uncappedBody = JSON.stringify({ v: 1, snaps: uncapped });
var uncappedFulls = 0, ui;
for (ui = 0; ui < uncapped.length; ui++) if (uncapped[ui] && uncapped[ui].data) uncappedFulls++;
assert(SS.expandHistory(uncapped).length === 12 && uncappedFulls === 1 && uncapped[uncapped.length - 1].data && !uncapped[0].data, "twelve versions pack as one newest full copy plus reverse diffs (" + uncappedBody.length + ")");
assert(uncappedBody.length <= SS.HIST_BYTES, "one full copy of 82 long notes plus small diffs fits under 450K (" + uncappedBody.length + ")");
var fitted = SS.cloudHistoryPayload(wide);
var fittedRows = SS.expandHistory(fitted.snaps);
var fittedIds = fittedRows.map(function (r) { return r.id; });
var expectIds = [];
for (wv = 12 - fittedRows.length; wv < 12; wv++) expectIds.push("row-" + wv);
var newestFit = fittedRows[fittedRows.length - 1];
var listKept = !!(newestFit && newestFit.data && newestFit.data["c:shop"] && newestFit.data["c:shop"].name === "קניות" && !newestFit.data["c:shop"].deleted);
var itemsKept = 0, fk;
for (fk in newestFit.data) if (newestFit.data[fk] && newestFit.data[fk].sec === "shop") itemsKept++;
var olderNote = fittedRows[0] && fittedRows[0].data && fittedRows[0].data.i0 && fittedRows[0].data.i0.note;
assert(fittedRows.length >= 10 && JSON.stringify(fitted).length <= SS.HIST_BYTES, "oldest-diff trim keeps at least 10 versions under 450K (" + fittedRows.length + ", " + JSON.stringify(fitted).length + ")");
assert(fittedIds.join(",") === expectIds.join(",") && fittedIds[fittedIds.length - 1] === "row-11", "dropped versions are the oldest and the newest stays");
assert(listKept && itemsKept === 82 && olderNote && olderNote.length === 2500, "trimming history does not delete lists or items");
function sameDoc(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function fullCount(snaps) {
  var n = 0, i;
  snaps = snaps || [];
  for (i = 0; i < snaps.length; i++) if (snaps[i] && snaps[i].data) n++;
  return n;
}
function notedDoc(nItems, step, opts) {
  var o = {}, i, note = new Array(2501).join("א"), mid;
  opts = opts || {};
  o["b:home"] = { id: "b:home", type: "box", box: "home", name: step % 5 === 3 ? ("קופסה " + step) : "בית", pos: 0, created: 1, at: 1 };
  o["c:shop"] = { id: "c:shop", type: "cat", cat: "shop", name: step % 5 === 2 ? ("קניות " + step) : "קניות", kind: "task", box: "home", pos: 0, at: 1000 };
  for (i = 0; i < nItems; i++) {
    o["i" + i] = { id: "i" + i, sec: "shop", text: i === 0 ? ("עריכה " + step) : ("פריט " + i), note: i === 0 ? (note.slice(0, 2490) + step) : note, done: false, order: i, created: 1000, at: 1000 };
  }
  mid = "i" + Math.floor(nItems / 2);
  if (!opts.stable && step % 4 === 1 && o[mid]) delete o[mid];
  o["i-extra-" + step] = { id: "i-extra-" + step, sec: "shop", text: "נוסף " + step, note: note, done: false, order: 9000 + step, created: 2000 + step, at: 2000 + step };
  return o;
}
function growHist(nItems, steps, idPrefix, opts) {
  var hist = [], s;
  for (s = 0; s < steps; s++) hist = SS.pushHistory(hist, notedDoc(nItems + s, s, opts), 8000 + s, true, { id: idPrefix + s });
  return hist;
}
function versionsMatch(rows, hist) {
  var i, j, hit, bad = [];
  for (i = 0; i < rows.length; i++) {
    hit = null;
    for (j = 0; j < hist.length; j++) if (hist[j].id === rows[i].id) hit = hist[j];
    if (!hit || !sameDoc(hit.data, rows[i].data)) bad.push(rows[i] && rows[i].id);
  }
  return bad;
}
var keptLine = [];
[20, 60, 90, 100, 120].forEach(function (n) {
  var hist = growHist(n, 12, "n" + n + "-");
  var looseSnaps = SS.packHistory(hist, 1000000000);
  var looseLen = JSON.stringify({ v: 1, snaps: looseSnaps }).length;
  var payload = SS.cloudHistoryPayload(hist);
  var rows = SS.expandHistory(payload.snaps);
  var bad = versionsMatch(rows, hist);
  var fits = looseLen <= SS.HIST_BYTES;
  var onlyNewest = fullCount(payload.snaps) === 1 && payload.snaps[payload.snaps.length - 1].data && (payload.snaps.length === 1 || !payload.snaps[0].data);
  keptLine.push(n + ":" + rows.length);
  assert(onlyNewest, "N=" + n + " stores one full snapshot, the newest");
  assert(!bad.length, "N=" + n + " kept versions restore byte-identical (" + bad.join(",") + ")");
  assert(JSON.stringify(payload).length <= SS.HIST_BYTES || rows.length === 1, "N=" + n + " stays under 450K or is the single newest copy");
  if (fits) assert(rows.length >= 10 && rows.length === hist.length, "N=" + n + " keeps every version when the newest full copy plus diffs fit (" + rows.length + "/" + hist.length + ", loose " + looseLen + ")");
  else assert(rows.length >= 1 && rows[rows.length - 1].id === hist[hist.length - 1].id, "N=" + n + " keeps the newest when the chain does not fit");
});
assert(keptLine.length === 5, "kept versions per N [" + keptLine.join(", ") + "]");
function oldForwardDiff(prev, next) {
  var changed = {}, removed = [], k;
  prev = prev || {};
  next = next || {};
  for (k in next) if (JSON.stringify(prev[k]) !== JSON.stringify(next[k])) changed[k] = next[k];
  for (k in prev) if (!Object.prototype.hasOwnProperty.call(next, k)) removed.push(k);
  return { changed: changed, removed: removed };
}
function packOldFormat(rows) {
  var out = [], prev = null, j, r, y, k;
  for (j = 0; j < rows.length; j++) {
    r = rows[j];
    y = {};
    for (k in r) if (k !== "data" && k !== "diff") y[k] = r[k];
    if (j === 0 || j === rows.length - 1) y.data = JSON.parse(JSON.stringify(r.data));
    else y.diff = oldForwardDiff(prev, r.data);
    out.push(y);
    prev = r.data;
  }
  return out;
}
function oldUpload(label, nItems, versions) {
  var hist = growHist(nItems, versions, label + "-", { stable: true });
  var oldSnaps = packOldFormat(hist);
  var oldRead = SS.expandHistory(oldSnaps);
  var readBad = versionsMatch(oldRead, hist);
  var edited = JSON.parse(JSON.stringify(hist[hist.length - 1].data));
  edited.i0.text = "אחרי עריכה";
  edited.i0.note = new Array(2501).join("ב");
  edited["c:shop"].name = "אחרי";
  edited["b:home"].name = "אחרי קופסה";
  edited["i-new"] = { id: "i-new", sec: "shop", text: "חדש", note: new Array(2501).join("ג"), done: false, order: 1, created: 9, at: 9 };
  var local = SS.pushHistory(oldRead, edited, 15000, true, { id: "edit-" + label });
  var merged = SS.expandHistory(SS.packHistory(SS.mergeHistory(local, { v: 1, snaps: oldSnaps }, SS.HIST_MAX).snaps));
  var payload = SS.cloudHistoryPayload(merged);
  var back = SS.expandHistory(payload.snaps);
  var missing = [], i, j, hit;
  for (i = 0; i < hist.length; i++) {
    hit = null;
    for (j = 0; j < back.length; j++) if (back[j].id === hist[i].id) hit = back[j];
    if (!hit || !sameDoc(hit.data, hist[i].data)) missing.push(hist[i].id);
  }
  hit = null;
  for (j = 0; j < back.length; j++) if (back[j].id === "edit-" + label) hit = back[j];
  var looseLen = JSON.stringify({ v: 1, snaps: SS.packHistory(local, 1000000000) }).length;
  assert(!readBad.length && oldRead.length === hist.length, label + " old-format history is read byte-identical (" + versions + ")");
  assert(fullCount(payload.snaps) === 1 && payload.snaps[payload.snaps.length - 1].data, label + " next write stores one newest full snapshot");
  assert(hit && sameDoc(hit.data, edited), label + " the new edit is in that upload");
  if (looseLen <= SS.HIST_BYTES) assert(!missing.length && back.length === local.length, label + " conversion keeps every previous version (" + back.length + "/" + local.length + ", " + JSON.stringify(payload).length + " chars, old " + JSON.stringify({ v: 1, snaps: oldSnaps }).length + ")");
  else assert(!missing.length || missing[0] === hist[0].id, label + " conversion drops only oldest versions that do not fit");
  return back.length;
}
var oldSevenKept = oldUpload("seven", 2, 7);
var oldSmallKept = oldUpload("small", 3, 8);
var oldLargeKept = oldUpload("large", 100, 12);
assert(oldSevenKept === 8 && oldSmallKept === 9 && oldLargeKept === 13, "old-format rewrite kept seven " + oldSevenKept + ", small " + oldSmallKept + ", and large " + oldLargeKept);
var alone = SS.pushHistory([], bigList(180, 0), 9, true, { id: "only" });
var alonePayload = SS.cloudHistoryPayload(alone);
var aloneRow = SS.expandHistory(alonePayload.snaps)[0];
var aloneCount = 0, ak;
for (ak in aloneRow.data) if (aloneRow.data[ak] && aloneRow.data[ak].sec === "shop") aloneCount++;
assert(alonePayload.snaps.length === 1 && aloneRow.id === "only" && aloneRow.data["c:shop"] && aloneCount === 180, "a single oversized version is kept whole");
var pushBody = liveIdeas.slice(liveIdeas.indexOf("function pushHistoryCloud"), liveIdeas.indexOf("function hiddenCats"));
assert(pushBody.indexOf("cloudHistoryPayload(history)") !== -1 && pushBody.indexOf("HIST_CLOUD_MAX") === -1 && pushBody.indexOf("slice(-1)") === -1 && pushBody.indexOf("450000") === -1 && pushBody.indexOf("480") === -1, "the upload packs the merged history under the shared cap and does not replace it");
assert((pushBody.match(/A\.set\(APP, HIST_CLOUD/g) || []).length === 1, "one edit still uploads history once");
assert(pushBody.indexOf("HIST_CLOUD_OLD") !== -1 && pushBody.indexOf("A.set(APP, HIST_CLOUD_OLD)") === -1 && pushBody.indexOf('A.set(APP, "history"') === -1, "a missing history2 row is read from the old cloud key and that key is not written");
var syncBody = liveIdeas.slice(liveIdeas.indexOf("function sync("), liveIdeas.indexOf("function cloudLoadUsed"));
assert((syncBody.match(/A\.set\(APP, KEY/g) || []).length === 1, "one edit uploads the items row once");
assert(liveIdeas.indexOf('KEY = "items"') !== -1 && liveIdeas.indexOf('HIST_CLOUD = "history2"') !== -1 && liveIdeas.indexOf('HIST_CLOUD_OLD = "history"') !== -1, "items stays the items key and history moves to history2");
assert(liveIdeas.indexOf('rg-myideas-hist2:') !== -1 && liveIdeas.indexOf('rg-myideas-hist:') !== -1, "local history2 has its own prefix and the old prefix is still named");
assert(liveIdeas.indexOf("writeLocal(histLegacyKey") === -1 && liveIdeas.indexOf("setItem(histLegacyKey") === -1 && liveIdeas.indexOf("removeItem(histLegacyKey") === -1, "the old local history key is never written or removed");
var restoreBody = liveIdeas.slice(liveIdeas.indexOf("function restoreVersion"), liveIdeas.indexOf("function openHistory"));
assert(restoreBody.indexOf("sparseRestore") !== -1 && syncBody.indexOf("sparseRestore") !== -1, "an empty restore does not bypass the deletion question");
assert(restoreBody.indexOf("adoptRestore(restoreDoc, {}, Date.now(), before)") !== -1 && syncBody.indexOf("adoptRestore(restoreDoc, cl, now(), items)") !== -1, "restore stamps only records that differ from the list on screen");
var sheetBody = liveIdeas.slice(liveIdeas.indexOf("function sheet("), liveIdeas.indexOf("function closeSheet"));
var openBody = liveIdeas.slice(liveIdeas.indexOf("function openHistory"), liveIdeas.indexOf("setInterval"));
assert(sheetBody.indexOf("opts.immediate") !== -1 && sheetBody.indexOf("< 450") !== -1, "other sheets still ignore the opening click");
assert(openBody.indexOf("immediate: true") !== -1 && openBody.indexOf('data-s="r:') !== -1, "version history takes a restore click immediately");

function notedList(nItems, edit, at) {
  var o = {}, i, note = new Array(2501).join("א"), base = at || 1000, stamp;
  o["c:shop"] = { id: "c:shop", type: "cat", cat: "shop", name: "קניות", kind: "task", pos: 0, at: base, _f: { name: base, kind: base, cat: base, pos: base, "~": base } };
  for (i = 0; i < nItems; i++) {
    stamp = i === 0 ? base + edit : base;
    o["i" + i] = {
      id: "i" + i, sec: "shop", text: i === 0 ? ("עריכה " + edit) : ("פריט " + i),
      note: note, done: false, order: i, created: 1000, at: stamp,
      _f: { text: stamp, note: stamp, sec: stamp, done: stamp, order: stamp, created: stamp, "~": stamp }
    };
  }
  return o;
}
function buildNotedHist(nItems, steps) {
  var hist = [], s;
  for (s = 0; s < steps; s++) hist = SS.pushHistory(hist, notedList(nItems, s, 1000), 8000 + s, true, { id: "v" + s });
  return hist;
}
function rowById(rows, id) {
  var i;
  for (i = 0; i < rows.length; i++) if (rows[i] && rows[i].id === id) return rows[i];
  return null;
}
function restoreKept(nItems, steps, idx, selective) {
  var hist = buildNotedHist(nItems, steps);
  var cappedBefore = SS.expandHistory(SS.cloudHistoryPayload(hist).snaps).length;
  var cur = hist[hist.length - 1].data;
  var target = hist[idx];
  var plan = SS.planRestore(hist, cur, target.id, 90000);
  var adopted = selective ? SS.adoptRestore(plan.items, cur, 90000, cur) : SS.adoptRestore(plan.items, {}, 90000);
  var next = SS.pushHistory(plan.history, adopted, 90001, true, { id: "restored-" + idx });
  var payload = SS.cloudHistoryPayload(next);
  var rows = SS.expandHistory(payload.snaps);
  var bad = [], i, hit, again;
  for (i = 0; i < hist.length; i++) {
    hit = rowById(rows, hist[i].id);
    if (!hit) continue;
    if (!sameDoc(hit.data, hist[i].data)) bad.push(hist[i].id);
  }
  again = rowById(rows, "restored-" + idx);
  var back = SS.planRestore(rows, rows[rows.length - 1].data, target.id, 90002);
  var restoredBack = again ? SS.planRestore(rows, rows[rows.length - 1].data, again.id, 90003) : null;
  return {
    before: hist.length,
    cappedBefore: cappedBefore,
    after: rows.length,
    bytes: JSON.stringify(payload).length,
    bad: bad,
    adoptedOk: !!(again && sameDoc(again.data, adopted)),
    targetBack: !!(back.found && sameDoc(back.items, target.data)),
    restoredBack: !!(restoredBack && restoredBack.found && sameDoc(restoredBack.items, adopted)),
    contentOk: adopted.i0.text === target.data.i0.text && adopted.i1.note === target.data.i1.note,
    fmt: payload.fmt,
    note: adopted.i1 && adopted.i1.note ? adopted.i1.note.length : 0
  };
}
[100, 150].forEach(function (nItems) {
  var steps = 20, positions = { "newest-1": steps - 2, middle: Math.floor(steps / 2), oldest: 0 };
  Object.keys(positions).forEach(function (name) {
    var kept = restoreKept(nItems, steps, positions[name], true);
    assert(kept.after >= kept.cappedBefore && kept.bytes <= SS.HIST_BYTES, "B1 " + nItems + " " + name + " keeps history " + kept.after + "/" + kept.before + " (cap " + kept.cappedBefore + ", " + kept.bytes + " chars)");
    assert(!kept.bad.length && kept.adoptedOk && kept.restoredBack && kept.contentOk && kept.note === 2500 && kept.fmt === 2, "B1 " + nItems + " " + name + " still restores exactly");
    if (name !== "oldest") assert(kept.targetBack, "B1 " + nItems + " " + name + " keeps that version byte for byte");
  });
  var mass = restoreKept(nItems, steps, 0, false);
  assert(mass.after >= mass.cappedBefore - 1 && mass.after > 8 && mass.bytes <= SS.HIST_BYTES, "B1 " + nItems + " mass re-stamp still keeps history " + mass.after + "/" + mass.before + " (cap " + mass.cappedBefore + ", " + mass.bytes + ")");
  assert(!mass.bad.length && mass.adoptedOk && mass.restoredBack && mass.contentOk, "B1 " + nItems + " mass re-stamp still restores exactly");
});
var sampleHist = buildNotedHist(12, 6);
var sampleCur = sampleHist[sampleHist.length - 1].data;
var sampleOld = sampleHist[0].data;
var sampleAdopted = SS.adoptRestore(sampleOld, sampleCur, 91000, sampleCur);
assert(sampleAdopted.i5.at === sampleCur.i5.at && JSON.stringify(sampleAdopted.i5._f) === JSON.stringify(sampleCur.i5._f), "an unchanged record keeps its at and _f");
assert(sampleAdopted.i0.text === sampleOld.i0.text && sampleAdopted.i0.at === 91000 && sampleAdopted.i0._f.text === 91000, "a changed record is stamped so the restore wins");
assert(SS.mergeRecords(sampleAdopted.i0, sampleCur.i0).text === sampleOld.i0.text, "the next merge keeps the restored text");
var massList = buildNotedHist(8, 4);
var massAdopted = SS.adoptRestore(massList[0].data, {}, 92000);
var massNext = SS.pushHistory(SS.planRestore(massList, massList[massList.length - 1].data, massList[0].id, 92000).history, massAdopted, 92001, true, { id: "mass" });
var massPacked = SS.packHistory(massNext);
var massAt = 0, mi;
for (mi = 0; mi < massPacked.length; mi++) if (massPacked[mi].diff && massPacked[mi].diff.atOnly) massAt += Object.keys(massPacked[mi].diff.atOnly).length;
assert(massAt >= 8 && SS.expandHistory(massPacked).length === massNext.length, "timestamp-only changes are stored as an at map (" + massAt + ")");
function fullCopyRows(hist) {
  var out = [], i, y, k;
  for (i = 0; i < hist.length; i++) {
    y = {};
    for (k in hist[i]) if (k !== "diff") y[k] = hist[i][k];
    y.data = JSON.parse(JSON.stringify(hist[i].data));
    out.push(y);
  }
  return out;
}
function readV57(raw) {
  var rows = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.snaps) ? raw.snaps : []), out = [], i, row;
  for (i = 0; i < rows.length; i++) {
    row = rows[i];
    if (!row || typeof row.t !== "number") continue;
    out.push({ id: row.id, t: row.t, data: (row.data && typeof row.data === "object" && !Array.isArray(row.data)) ? row.data : {} });
  }
  return out;
}
function applyOldForward(base, diff) {
  var out = JSON.parse(JSON.stringify(base || {})), k, i;
  diff = diff || {};
  if (diff.changed) for (k in diff.changed) out[k] = JSON.parse(JSON.stringify(diff.changed[k]));
  if (diff.removed) for (i = 0; i < diff.removed.length; i++) delete out[diff.removed[i]];
  return out;
}
function readV31(raw) {
  var rows = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.snaps) ? raw.snaps : []), out = [], i, row, base = {};
  for (i = 0; i < rows.length; i++) {
    row = rows[i];
    if (!row || typeof row.t !== "number") continue;
    if (row.data && typeof row.data === "object" && !Array.isArray(row.data)) base = JSON.parse(JSON.stringify(row.data));
    else if (row.diff && typeof row.diff === "object") base = applyOldForward(base, row.diff);
    else base = {};
    out.push({ id: row.id, t: row.t, data: base });
  }
  return out;
}
function migrateStore(legacyBytes) {
  var oldKey = "rg-myideas-hist:user", newKey = "rg-myideas-hist2:user", store = {};
  store[oldKey] = legacyBytes;
  if (store[newKey] == null) {
    var migrated = SS.readLegacyHistory(JSON.parse(store[oldKey]));
    store[newKey] = JSON.stringify(SS.historyEnvelope(SS.packHistory(migrated)));
  }
  var frozen = store[oldKey];
  var hist = SS.readHistory(JSON.parse(store[newKey]));
  var edited = JSON.parse(JSON.stringify(hist[hist.length - 1].data));
  edited.i0.text = "אחרי עריכה";
  edited.i0.note = new Array(2501).join("ב");
  hist = SS.pushHistory(hist, edited, 16000, true, { id: "edit-after" });
  store[newKey] = JSON.stringify(SS.historyEnvelope(SS.packHistory(hist)));
  return { store: store, oldKey: oldKey, newKey: newKey, frozen: frozen, hist: hist };
}
function migratedExact(label, legacyDoc, hist, reader) {
  var bytes = JSON.stringify(legacyDoc);
  var moved = SS.readHistory(SS.historyEnvelope(SS.packHistory(SS.readLegacyHistory(JSON.parse(bytes)))));
  var bad = versionsMatch(moved, hist);
  var sim = migrateStore(bytes);
  var readOld = reader(JSON.parse(sim.store[sim.oldKey]));
  var readBad = [], i, hit;
  for (i = 0; i < hist.length; i++) {
    hit = null;
    var j;
    for (j = 0; j < readOld.length; j++) if (readOld[j].id === hist[i].id) hit = readOld[j];
    if (!hit || !sameDoc(hit.data, hist[i].data)) readBad.push(hist[i].id);
  }
  var after = SS.readHistory(JSON.parse(sim.store[sim.newKey]));
  assert(!bad.length && moved.length === hist.length && moved[0] && sameDoc(moved[0].data, hist[0].data), label + " migrates into history2 with every version exact (" + moved.length + ")");
  assert(sim.store[sim.oldKey] === bytes && sim.frozen === bytes, label + " leaves the old key byte-for-byte after migration and a later edit");
  assert(!readBad.length && readOld.length === hist.length, label + " old reader still parses the untouched old key");
  assert(after.length === hist.length + 1 && rowById(after, "edit-after") && rowById(after, "edit-after").data.i0.text === "אחרי עריכה", label + " further edits land only in history2");
}
var migV57 = buildNotedHist(100, 8);
migratedExact("v57 full-copy", fullCopyRows(migV57), migV57, readV57);
var migV31 = buildNotedHist(100, 8);
migratedExact("v31 forward-diff", packOldFormat(migV31), migV31, readV31);
var migRev = buildNotedHist(40, 6);
var migRevPacked = SS.packHistory(migRev);
migratedExact("v32 reverse-diff", migRevPacked, migRev, function (raw) { return SS.expandHistory(Array.isArray(raw) ? raw : raw.snaps); });
assert(SS.readHistory([{ id: "a", t: 1, data: notedList(1, 0, 1) }]).length === 0, "history2 refuses a bare list with no fmt marker");
assert(SS.readHistory({ fmt: 3, snaps: fullCopyRows(buildNotedHist(2, 2)) }).length === 0, "history2 ignores an envelope it cannot parse");
var goodSnap = SS.pushHistory([], notedList(6, 0, 1000), 1000, true, { id: "good" });
var brokenChain = [{ id: "bad", t: 1, diff: { rev: 1, changed: "nope" } }].concat(SS.packHistory(goodSnap));
var brokenRead = SS.expandHistory(brokenChain);
assert(brokenRead.length === 1 && brokenRead[0].id === "good" && sameDoc(brokenRead[0].data, goodSnap[0].data), "an unparseable row is skipped and the good version stays whole");
assert(SS.expandHistory([{ id: "bad", t: 1 }]).length === 0, "a row with no data and no diff is not an empty list");
assert(SS.expandHistory([{ id: "bad", t: 1, diff: { rev: 1, changed: [], removed: [] } }]).length === 0, "a reverse diff with a broken changed map is not restored");
assert(SS.expandHistory([{ id: "bad", t: 1, diff: { rev: 1, changed: {}, removed: [] } }]).length === 0, "a reverse diff with no newer copy is skipped instead of becoming empty");
var oldWouldEmpty = readV57([{ id: "bad", t: 1, diff: { rev: 1, changed: {}, removed: [] } }]);
assert(oldWouldEmpty.length === 1 && Object.keys(oldWouldEmpty[0].data).length === 0, "the old reader still turns that row into an empty list");
var skippedPlan = SS.planRestore(brokenRead, brokenRead[0].data, "bad", 5);
assert(skippedPlan.found === false && skippedPlan.items == null, "a skipped row cannot be restored");
var emptyBase = notedList(24, 0, 1000);
assert(SS.sparseRestore({}, emptyBase) === true && SS.needsConfirm(SS.dropReport({}, emptyBase), { now: 9000, differs: true }).hold === true, "an empty restore goes through the deletion guard");
assert(SS.sparseRestore(notedList(2, 1, 9000), emptyBase) === true, "a near-empty restore is treated as a bulk drop");
assert(SS.sparseRestore(notedList(19, 1, 9000), emptyBase) === false, "a normal older version is not a near-empty restore");
assert(SS.needsConfirm(SS.dropReport(notedList(8, 1, 9000), emptyBase), { now: 9000, overwriteUntil: 9000 + 60000 }).hold === false, "a chosen restore that is not near-empty can still overwrite");
var preItems = { a: { id: "a", text: "keep-me", at: 4 } };
var fatBak = [{ t: 1, items: preItems, preupgrade: 1, reason: "before-v58" }];
var zi;
for (zi = 0; zi < 6; zi++) fatBak.push({ t: 10 + zi, items: { x: { id: "x", text: new Array(80).join("z") + zi, at: zi } } });
var heldBak = SS.capBackups(fatBak, 2, 120, true);
var heldRow = null;
for (zi = 0; zi < heldBak.length; zi++) if (heldBak[zi].preupgrade) heldRow = heldBak[zi];
assert(heldRow && heldRow.items.a.text === "keep-me" && JSON.stringify(heldRow.items) === JSON.stringify(preItems), "a byte cap keeps the pre-upgrade list snapshot until sync");
var released = SS.capBackups(fatBak, 2, 120, false);
var releasedHit = false;
for (zi = 0; zi < released.length; zi++) if (released[zi].preupgrade) releasedHit = true;
assert(releasedHit === false && released.length <= 2, "after one sync the same cap may drop backup extras");
var snapBody = liveIdeas.slice(liveIdeas.indexOf("function rememberSnap"), liveIdeas.indexOf("function pullHistory"));
assert(snapBody.indexOf("scheduleHistoryPush()") !== -1 && snapBody.indexOf("pushHistoryCloud()") === -1, "one edit schedules a single history upload");
assert(liveIdeas.indexOf("removeItem(cacheKey(uid))") === -1 && liveIdeas.indexOf("function keepPreupgrade") !== -1 && liveIdeas.indexOf("if (uid) keepPreupgrade()") < liveIdeas.indexOf("loadLocal(); loadHistory()"), "the current cache is not deleted and the pre-upgrade copy is taken before load");

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
