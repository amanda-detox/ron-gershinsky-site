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
assert(app.indexOf("לחתוך") === -1 && src.indexOf("לחתוך") === -1 && html.indexOf("לחתוך") === -1 && app.indexOf("נחתך") === -1 && html.indexOf("נחתך") === -1, "no violent Hebrew and notes are never described as cut");
var loadBody = app.slice(app.indexOf("function loadFromCloud"), app.indexOf("function syncSoon"));
assert(loadBody.indexOf("loadCloudCopy") !== -1 && loadBody.indexOf("A.set") === -1 && loadBody.indexOf('"-bak"') !== -1, "טען מהענן saves a -bak copy and has no cloud write");
assert(html.indexOf('id="lastsync"') !== -1 && html.indexOf('id="status"') < html.indexOf('id="lastsync"') && html.indexOf('id="lastsync"') < html.indexOf('id="cloudat"'), "the clock sits directly under #status");
assert(html.indexOf("סונכרן לאחרונה ב-{t}") !== -1 && html.indexOf('loadCloud: "טען מהענן"') !== -1, "the Hebrew clock and the account action use the exact words");
assert(html.indexOf("<title>Listify</title>") !== -1 && html.indexOf('doc: "Listify"') !== -1, "the browser tab stays Listify in English");
assert(html.indexOf("../sandbox-shared/rg-sync-status.js") !== -1 && html.indexOf("rg-sync-status.js?v=11") > html.indexOf("../sandbox-shared/rg-sync-status.js") && html.indexOf("rg-sync-status.js?v=11") < html.indexOf("../sandbox-shared/rg-account.js"), "the sandbox helper replaces the shared one before account calls");
assert(sw.indexOf('CACHE = RG_SBX_IDEAS_CACHE') !== -1 && sw.indexOf("version.js?v=11") !== -1 && sw.indexOf("rg-sync-status.js?v=11") !== -1 && sw.indexOf("restore.js?v=2") !== -1 && sw.indexOf("app.js?v=69") !== -1 && sw.indexOf("rg-account.js?v=3") !== -1 && sw.indexOf("rg-install.js?v=1") !== -1, "the sandbox service worker cache was bumped");
assert(html.indexOf('id="build"') !== -1 && html.indexOf("rg-sbx-ideas-v21") === -1 && app.indexOf("RG_SBX_IDEAS_CACHE") !== -1 && app.indexOf("function paintBuild") !== -1, "the on-screen version is painted from the shared cache name");
assert(html.indexOf('updateViaCache:"none"') !== -1 && html.indexOf("controllerchange") !== -1 && html.indexOf("visibilitychange") !== -1 && html.indexOf("r.update") !== -1, "the sandbox checks for a new service worker without using the HTTP cache");
assert(html.indexOf("גרסה חדשה מוכנה, תתעדכן אחרי הסנכרון") !== -1 && html.indexOf("if(!had)") !== -1, "a new version waits for sync and does not reload on the first install");
assert(sw.indexOf('cache: "no-cache"') !== -1 && sw.indexOf("caches.match(e.request)") !== -1, "html and js are revalidated and the offline fallback stays");
assert(app.indexOf("pending || editing || busy || holdBlocked") !== -1 && app.indexOf("RGSbxUpdate") !== -1 && app.indexOf("location.reload") !== -1, "the app reloads for a new version only when nothing unsynced is open");
assert(sw.indexOf('indexOf("rg-sbx-ideas-")') !== -1 && sw.indexOf("rg-myideas-") === -1, "the sandbox cache cannot delete the live cache");
var css = src.slice(src.indexOf(".rg-delask-back"), src.indexOf("@media"));
assert(css.indexOf("red") === -1 && css.indexOf("#") === -1 && html.indexOf(".lastsync") !== -1 && html.slice(html.indexOf(".lastsync"), html.indexOf(".lastsync") + 280).indexOf("red") === -1, "new UI keeps the existing palette");
assert(SS.ASK_YES === "השאר את הענן" && SS.ASK_NO === "העלה בכל זאת" && SS.ASK_Q.indexOf("להשאיר את הענן") !== -1, "the overwrite prompt defaults to keeping the cloud");
assert(app.indexOf("needsConfirm") !== -1 && app.indexOf("noteGone") !== -1 && app.indexOf("planRestore") !== -1 && html.indexOf('restoreTitle: "שיחזור"') !== -1, "history, the overwrite guard, and file restore are all in the sandbox");
assert(html.indexOf("היסטוריית גרסאות") !== -1 && html.indexOf('id="hist-btn"') !== -1, "version history has its own screen");

function cat(id, name, at) {
  return { id: "c:" + id, type: "cat", cat: id, name: name, at: at, _f: { name: at, "~": at } };
}
function task(id, at) { return { id: id, sec: "tasks", text: id, at: at, _f: { text: at, "~": at } }; }
var t0 = Date.UTC(2026, 10, 5, 8, 0);
var tHide = Date.UTC(2026, 10, 5, 12, 0);
var tEdit = Date.UTC(2026, 10, 10, 4, 30);
var tBack = Date.UTC(2026, 10, 10, 4, 41);
var shown = SS.noteGone(cat("l0", "קניות", t0), tEdit, false);
shown.name = "קניות אחרי";
shown._f.name = tEdit;
var hid = SS.noteGone(cat("l0", "קניות", t0), tHide, true);
var replay = SS.mergeRecords(hid, shown);
assert(!replay.gone && replay.name === "קניות אחרי", "a later un-hide and edit beat an offline hide");
var plain = cat("l0", "קניות", t0);
var oldHide = SS.noteGone(plain, tHide, true);
assert(SS.mergeRecords(oldHide, plain).gone === 1, "a 5/11 gone stamp beats a visible list that never stamped gone");
var bag = { "c:l0": cat("l0", "קניות", t0) };
assert(SS.assertVisible(bag, tEdit) === true && bag["c:l0"]._f.gone === tEdit && !bag["c:l0"].gone, "showing a list writes a fresh visibility stamp");
assert(SS.assertVisible(bag, tEdit + 1000) === false, "a list that already asserted visibility is not rewritten every sync");
assert(!SS.mergeRecords(oldHide, bag["c:l0"]).gone, "that fresh stamp keeps the list visible");
var hiddenBag = { "c:l0": SS.noteGone(cat("l0", "קניות", t0), tHide, true) };
assert(SS.assertVisible(hiddenBag, tEdit) === false && hiddenBag["c:l0"].gone === 1, "a hidden list is not un-hidden by the visibility pass");
var kept = SS.restoreLive({ "c:l0": oldHide }, { "c:l0": plain });
assert(!kept["c:l0"].gone && kept["c:l0"]._f.gone > oldHide._f.gone, "keeping the cloud stamps visibility above the old hide");
assert(!SS.mergeRecords(oldHide, kept["c:l0"]).gone, "the restored list stays visible against the old hide");

var cloud = {}, next = {}, n;
for (n = 0; n < 10; n++) cloud["c:l" + n] = cat("l" + n, "רשימה " + n, t0);
next = JSON.parse(JSON.stringify(cloud));
for (n = 0; n < 10; n++) next["c:l" + n] = SS.noteGone(next["c:l" + n], tHide, true);
for (n = 0; n < 20; n++) cloud["it" + n] = task("it" + n, t0);
for (n = 0; n < 20; n++) next["it" + n] = task("it" + n, t0);
for (n = 0; n < 12; n++) { next["it" + n].deleted = true; next["it" + n].at = tHide; }
var incident = SS.dropReport(next, cloud);
assert(incident.cloudLists === 13 && incident.listsHidden === 10, "hiding those 10 lists leaves 3 of 13");
assert(incident.itemsDeleted === 12, "the 12 tombstones count as deleted items");
var held = SS.needsConfirm(incident, { now: tBack, lastSync: t0, cloudUpdated: tBack, bulkUntil: tBack + 60000 });
assert(held.hold === true && held.reason === "drop", "the 10/11 incident is blocked even during the local-delete window");
assert(SS.needsConfirm(incident, { now: tBack, overwriteUntil: tBack + 60000 }).hold === false, "only an explicit overwrite confirm lets that upload through");
var one = SS.dropReport({ "c:only": SS.noteGone(cat("only", "אחת", t0), tHide, true) }, { "c:only": cat("only", "אחת", t0) });
assert(one.listsHidden === 1 && SS.needsConfirm(one, { now: tHide + 1000, lastSync: t0, cloudUpdated: t0 }).hold === false, "hiding a single list on a fresh device still uploads");
var staleRename = SS.dropReport({ "c:l0": cat("l0", "חדש", tEdit) }, { "c:l0": cat("l0", "ישן", t0) });
var stale = SS.needsConfirm(staleRename, { now: tEdit, lastSync: t0, cloudUpdated: tEdit, differs: true });
assert(staleRename.listsHidden === 0 && stale.hold === true && stale.reason === "stale", "a device whose last sync is days old cannot silently overwrite");
assert(SS.needsConfirm(staleRename, { now: t0 + 60000, lastSync: t0, cloudUpdated: t0 + 1000, differs: true }).hold === false, "a recent device can upload a rename");

var older = { "c:l0": cat("l0", "ישן", t0) };
var current = { "c:l0": cat("l0", "חדש", tEdit) };
var hist = SS.pushHistory([], older, t0, true);
var again = SS.pushHistory(hist, older, t0 + 5000, false);
assert(again.length === 1, "an unchanged snapshot is not stored twice");
var plan = SS.planRestore(hist, current, hist[0].id, tEdit);
assert(plan.savedCurrent && plan.found && plan.history.length === 2, "restore saves the current state as a new version first");
assert(plan.items["c:l0"].name === "ישן" && plan.history[plan.history.length - 1].data["c:l0"].name === "חדש", "restore returns the chosen version and keeps the previous one");
var full = [], fi;
for (fi = 0; fi < SS.HIST_MAX; fi++) full = SS.pushHistory(full, { a: taskAt("a", "v" + fi, 1000 + fi) }, 1000 + fi, true, { id: "row-" + fi });
assert(full.length === SS.HIST_MAX && full[0].id === "row-0" && full[0].data.a.text === "v0", "history is full and the oldest row is still first");
var oldest = SS.planRestore(full, { a: taskAt("a", "now", 9000) }, full[0].id, 9000);
var oldestKept = false, currentKept = false, oi;
for (oi = 0; oi < oldest.history.length; oi++) {
  if (oldest.history[oi].id === "row-0") oldestKept = true;
  if (oldest.history[oi].data && oldest.history[oi].data.a && oldest.history[oi].data.a.text === "now") currentKept = true;
}
assert(oldest.found && oldest.items.a.text === "v0" && oldestKept && currentKept && oldest.history.length === SS.HIST_MAX, "restoring the oldest row at the cap keeps that snapshot and saves the current list");
var restoreBody = app.slice(app.indexOf("function restoreVersion"), app.indexOf("function openHistory"));
assert(restoreBody.indexOf("armQuietRestore()") !== -1 && restoreBody.indexOf("adoptRestore") !== -1 && app.indexOf("function armQuietRestore") !== -1, "a version restore is marked quiet before it syncs");
assert(app.indexOf("if (!restoring && !quietRestore && SS && SS.fieldConflicts)") !== -1 && app.indexOf("if (quietRestore || !uid || !snaps) return;") !== -1, "that cycle does not raise a clash notice");
assert(app.indexOf("roundRestore && (phase === \"upload\" || phase === \"same\")") !== -1, "only the restore's own sync clears the restore snapshot");
var baseNow = { a: taskAt("a", "now", 5000) };
assert(SS.fieldConflicts({ a: taskAt("a", "old", 9000) }, baseNow, baseNow).length === 0, "restoring a different local text over an unchanged cloud is not a clash");
var published = SS.fieldConflicts(
  { a: taskAt("a", "old", 9000) },
  { a: taskAt("a", "now", 5000) },
  { a: taskAt("a", "old", 2000) },
  { a: taskAt("a", "older", 1000) }
);
assert(published.length === 1, "a real replacement of a published edit is still a clash");
assert(SS.sameDeviceEdits("v3", "v2", ["v1", "v2", "v3"]) === true, "rapid edits on one device are one sequence");
assert(SS.sameDeviceEdits("AAA", "BBB", ["base", "AAA"]) === false, "another device's text is not part of this device's sequence");
var rapid = SS.fieldConflicts({ a: taskAt("a", "v3", 4000) }, { a: taskAt("a", "v2", 3000) }, { a: taskAt("a", "v0", 1000) });
assert(rapid.length === 1 && SS.sameDeviceEdits(rapid[0].localText, rapid[0].cloudText, ["v0", "v1", "v2", "v3"]) === true, "two moves that are this device's own edits are not a clash");
var twoDev = SS.fieldConflicts({ a: taskAt("a", "AAA", 4000) }, { a: taskAt("a", "BBB", 3500) }, { a: taskAt("a", "base", 1000) });
assert(twoDev.length === 1 && SS.sameDeviceEdits(twoDev[0].localText, twoDev[0].cloudText, ["base", "AAA"]) === false, "a genuine two-device clash still counts");
assert(app.indexOf("sameDeviceEdits") !== -1 && app.indexOf("saveAgreed(sent)") !== -1 && app.indexOf("rememberOwn") !== -1, "this device records its own writes and moves the base when it uploads");
function manyItems(n, text, at) {
  var o = {}, i;
  for (i = 0; i < n; i++) o["it" + i] = taskAt("it" + i, text, at);
  return o;
}
var cloud24 = manyItems(24, "now", 5000);
var keep19 = SS.dropReport(manyItems(19, "old", 9000), cloud24);
assert(SS.needsConfirm(keep19, { now: 9000, lastSync: 5000, cloudUpdated: 5000, overwriteUntil: 9000 + 60000 }).hold === false, "a chosen restore from 24 items to 19 is not stopped");
var sharp = SS.dropReport(manyItems(8, "old", 9000), cloud24);
assert(SS.needsConfirm(sharp, { now: 9000, lastSync: 1000, cloudUpdated: 8000, differs: true }).hold === true, "a sharp drop on a normal sync is still stopped");
assert(SS.needsConfirm(sharp, { now: 9000, overwriteUntil: 9000 + 60000 }).hold === false, "the same sharp drop is allowed when the user chose a restore");
var missing = SS.planRestore(full, { a: taskAt("a", "now", 9000) }, "missing-row", 9001);
assert(missing.found === false && missing.items == null, "a missing version is reported instead of restoring nothing");
var file = SS.historyFile(hist[0]);
assert(file.v === 1 && file.data["c:l0"].name === "ישן" && file.lists === plan.history[0].lists, "a downloaded version is JSON of that snapshot");
var joined = SS.mergeHistory(hist, { snaps: [{ id: "cloud-1", t: tEdit, lists: 1, items: 0, data: current }] }, 12);
assert(joined.snaps.length === 2, "local and cloud history are unioned");

function taskAt(id, text, at, note, noteAt) {
  var x = { id: id, sec: "tasks", text: text, at: at, _f: { text: at, "~": at } };
  if (note != null) { x.note = note; x._f.note = noteAt || at; if ((noteAt || at) > x.at) x.at = noteAt || at; }
  x._f["~"] = x.at;
  return x;
}
function mergeAll(a, b) {
  var out = {}, k;
  for (k in a) out[k] = a[k];
  for (k in b) out[k] = out[k] ? SS.mergeRecords(out[k], b[k]) : b[k];
  return out;
}
var snap12 = {}, cloud13 = {}, ni;
for (ni = 0; ni < 4; ni++) {
  snap12["c:l" + ni] = cat("l" + ni, "רשימה " + ni, 100);
  cloud13["c:l" + ni] = cat("l" + ni, "רשימה " + ni, 4000);
}
for (ni = 0; ni < 12; ni++) snap12["it" + ni] = taskAt("it" + ni, "ישן " + ni, 100);
for (ni = 0; ni < 13; ni++) cloud13["it" + ni] = taskAt("it" + ni, "חדש " + ni, 4000);
var adopted = SS.adoptRestore(snap12, cloud13, 9000);
assert(SS.summarize(adopted).lists === 7 && SS.summarize(adopted).items === 12, "restore keeps 7 lists and 12 items, not the cloud's 13th");
assert(adopted.it0.text === "ישן 0" && adopted.it0.at === 9000 && adopted.it0._f.text === 9000, "restored records get fresh field stamps");
assert(adopted.it12 && adopted.it12.deleted === true && adopted.it12.at === 9000, "an item that exists only in the cloud is tombstoned");
var revived = mergeAll(adopted, cloud13);
assert(revived.it0.text === "ישן 0" && !revived.it0.deleted, "the next merge does not put the cloud text back");
assert(revived.it12.deleted === true, "the next merge does not bring back the extra cloud item");
var dropOne = SS.dropReport(adopted, cloud13);
assert(dropOne.itemsDeleted === 1 && SS.needsConfirm(dropOne, { now: 9000, lastSync: 100, cloudUpdated: 4000, overwriteUntil: 9000 + 60000 }).hold === false, "a deliberate restore is not blocked by the overwrite guard");

var agreed = { a: taskAt("a", "מקור", 1000) };
var bothText = SS.fieldConflicts(
  { a: taskAt("a", "מ-ב", 3000) },
  { a: taskAt("a", "מ-א", 3500) },
  agreed
);
assert(bothText.length === 1 && bothText[0].field === "text" && bothText[0].localWins === false, "the same field edited on both devices since the agreed copy is a clash");
var loserFirst = SS.clashSnap(
  { a: taskAt("a", "מ-ב", 2000) },
  { a: taskAt("a", "מ-א", 3500) },
  SS.fieldConflicts({ a: taskAt("a", "מ-ב", 2000) }, { a: taskAt("a", "מ-א", 3500) }, agreed),
  9000
);
assert(loserFirst.clash === 1 && loserFirst.data.a.text === "מ-ב" && loserFirst.label.indexOf("התנגשות") === 0 && loserFirst.label.indexOf("מ-ב") !== -1, "the losing text is in a labeled history row even if that device synced first");
var winnerFirst = SS.clashSnap(
  { a: taskAt("a", "מ-א", 3500) },
  { a: taskAt("a", "מ-ב", 2000) },
  SS.fieldConflicts({ a: taskAt("a", "מ-א", 3500) }, { a: taskAt("a", "מ-ב", 2000) }, agreed),
  9001
);
assert(winnerFirst.data.a.text === "מ-ב" && winnerFirst.localWins !== true, "when the other device synced first, the row still holds the losing text");
var seen = SS.rememberClash([], loserFirst);
seen = SS.rememberClash(seen, loserFirst);
assert(seen.length === 1 && seen[0].clash === 1, "the same clash row is stored once and kept");
var cloudHist = SS.mergeHistory([], { snaps: [loserFirst] }, 12);
assert(cloudHist.snaps.length === 1 && cloudHist.snaps[0].data.a.text === "מ-ב" && cloudHist.snaps[0].label.indexOf("מ-ב") !== -1, "the losing text is in the cloud history both devices read");
var replaced = SS.fieldConflicts(
  { a: taskAt("a", "מ-ב", 2000) },
  { a: taskAt("a", "מ-א", 3500) },
  { a: taskAt("a", "מ-ב", 2000) },
  agreed
);
assert(replaced.length === 1 && replaced[0].localText === "מ-ב", "a published edit that the cloud then replaces is still a clash");
var splitFields = SS.fieldConflicts(
  { a: taskAt("a", "משותף", 1500, "הערה ב", 3000) },
  { a: taskAt("a", "מ-א", 3500, "הערה ישנה", 1500) },
  { a: taskAt("a", "משותף", 1500, "הערה ישנה", 1500) }
);
assert(splitFields.length === 0, "edits to different fields are not a clash");
var otherItem = SS.fieldConflicts(
  { a: taskAt("a", "רק כאן", 3000) },
  { b: taskAt("b", "רק שם", 3500) },
  { a: taskAt("a", "מקור", 1000), b: taskAt("b", "מקור", 1000) }
);
assert(otherItem.length === 0, "edits to different items are not a clash");
assert(SS.fieldConflicts({ a: taskAt("a", "מ-א", 3000) }, { a: taskAt("a", "מקור", 1000) }, agreed).length === 0, "a single device edit does not raise a clash");
assert(SS.signOutGate({ pending: false, online: false }) === "logout", "a clean sign-out does not ask");
assert(SS.signOutGate({ pending: true, online: true, pushed: true }) === "logout", "pending changes that reached the cloud do not ask");
assert(SS.signOutGate({ pending: true, online: false, pushed: false }) === "ask", "offline unsynced changes ask before sign-out");
assert(SS.unsyncedCount({ a: taskAt("a", "QA-UNSYNCED", 5000), b: taskAt("b", "old", 1000) }, 2000) === 1, "only records newer than the last sync count as unsynced");
assert(html.indexOf("התנגשות בעריכה: נשמרה הגרסה האחרונה, הגרסה השנייה בהיסטוריה") !== -1 && html.indexOf('id="clash"') !== -1, "the clash notice is in the list UI");
assert(html.indexOf("הגיבוי נשמר בהיסטוריית הגרסאות") !== -1 && html.indexOf("צא בכל זאת") !== -1 && html.indexOf("מזג לענן") !== -1, "sign-out and sign-in copy is in Hebrew");
assert(SS.signOutPlan({ items: { a: 1 }, pending: true }).keepCache === true && SS.signOutPlan({ items: { a: 1 }, pending: true }).dropCache === false, "signing out keeps unsynced local changes");
assert(SS.signOutPlan({ items: { a: 1 }, pending: true }).backup === true, "signing out also writes a backup");
assert(SS.signOutPlan({ items: { a: 1 }, pending: false }).dropCache === true, "a fully synced sign-out can drop the cache");
assert(app.indexOf('"-signout"') !== -1 && app.indexOf("adoptRestore") !== -1 && app.indexOf("fieldConflicts") !== -1, "the app restores with fresh stamps and keeps conflicts");
assert(app.indexOf('t("historyFail")') !== -1 && html.indexOf("לא הצלחנו לשחזר את הגרסה הזו.") !== -1, "a failed restore shows a Hebrew error instead of doing nothing");
var keepBody = app.slice(app.indexOf("function keepConflict"), app.indexOf("function baseKey"));
assert(keepBody.indexOf('t("clashNote")') !== -1 && keepBody.indexOf("conflictNote") === -1 && app.indexOf("pullHistory") !== -1 && app.indexOf("noteIncomingClash") !== -1, "a clash writes the new notice and the other device pulls that labeled row");
assert(app.indexOf("window.RGBeforeLogout") !== -1 && app.indexOf("hasUnsynced") !== -1 && app.indexOf('.rgacc-back [data-a=out]') !== -1, "sign-out is gated on the real account button");
assert(acct.indexOf("window.RGBeforeLogout") !== -1 && acct.indexOf("function doLogout") !== -1 && acct.indexOf('a === "out"') !== -1, "the sandbox account script asks the page before it logs out");
["index.html", "my/ideas/index.html", "shared/rg-topbar.js"].forEach(function (rel) {
  var liveSrc = fs.readFileSync(path.join(root, rel), "utf8");
  assert(liveSrc.indexOf("sandbox-shared/rg-account.js") === -1, rel + " does not load the sandbox account script");
});
function qver(src, file) {
  var m = src.match(new RegExp(file.replace(/\./g, "\\.") + "\\?v=(\\d+)"));
  return m ? +m[1] : 0;
}
assert(qver(html, "app.js") >= 52 && qver(sw, "app.js") === qver(html, "app.js"), "app.js query param is bumped and identical in index.html and sw.js");
assert(qver(html, "rg-sync-status.js") >= 7 && qver(sw, "rg-sync-status.js") === qver(html, "rg-sync-status.js"), "rg-sync-status.js query param is bumped and identical in index.html and sw.js");
assert(qver(html, "rg-account.js") >= 2 && qver(sw, "rg-account.js") === qver(html, "rg-account.js"), "rg-account.js query param is bumped and identical in index.html and sw.js");
var crypto = require("crypto");
var stressItems = {}, si, stressNote = new Array(2501).join("א");
for (si = 0; si < 102; si++) {
  stressItems["i" + si] = { id: "i" + si, sec: "ideas", text: "פריט " + si, done: false, order: si, created: 1000 + si, at: 1000 + si };
  if (si < 70) stressItems["i" + si].note = stressNote;
}
var stressLive = JSON.stringify({ items: stressItems, pending: false, seeded: true }).length;
var stressHist = [], sv, stressCopy;
for (sv = 0; sv < 20; sv++) {
  stressCopy = JSON.parse(JSON.stringify(stressItems));
  stressCopy.i0.at = 2000 + sv;
  stressCopy.i0.text = "עריכה " + sv;
  stressHist = SS.pushHistory(stressHist, stressCopy, 3000 + sv, true);
}
var stressBak = [];
for (sv = 0; sv < 5; sv++) stressBak.push({ t: sv, items: JSON.parse(JSON.stringify(stressItems)) });
var beforeHist = JSON.stringify(stressHist).length, beforeBak = JSON.stringify(stressBak).length;
var packedStress = SS.packHistory(stressHist);
var afterHist = JSON.stringify(packedStress).length;
var cappedBak = SS.capList(stressBak, 5, SS.BAK_BYTES);
var afterBak = JSON.stringify(cappedBak).length;
var beforeTotal = stressLive + beforeHist + beforeBak;
var afterTotal = stressLive + afterHist + afterBak;
var expandedStress = SS.expandHistory(packedStress);
var newestStress = expandedStress[expandedStress.length - 1];
assert(beforeTotal > afterTotal * 3 && afterHist < beforeHist / 5 && newestStress.data.i69.note.length === 2500 && newestStress.data.i0.text === "עריכה 19" && expandedStress[0].data.i0.text === "עריכה 0", "stress storage " + beforeTotal + " -> " + afterTotal + " chars (history " + beforeHist + " -> " + afterHist + ", backups " + beforeBak + " -> " + afterBak + ", live " + stressLive + ")");
var snapBody = app.slice(app.indexOf("function rememberSnap"), app.indexOf("function pullHistory"));
assert(snapBody.indexOf("scheduleHistoryPush()") !== -1 && snapBody.indexOf("pushHistoryCloud()") === -1, "one edit schedules a single history upload");
var pruneBody = app.slice(app.indexOf("function pruneFootprint"), app.indexOf("function writeLocal"));
assert(pruneBody.indexOf("removeItem(cacheKey(uid))") === -1 && pruneBody.indexOf("removeItem(currentCacheKey") === -1 && app.indexOf("function writeLocal") !== -1, "a full disk drops history and backups and keeps the current lists");
assert(SS.HIST_BYTES === 450000 && SS.BAK_BYTES === 480 * 1024, "history uses one 450K cap and backups keep theirs");
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
var pushBody = app.slice(app.indexOf("function pushHistoryCloud"), app.indexOf("function hiddenCats"));
assert(pushBody.indexOf("cloudHistoryPayload(history)") !== -1 && pushBody.indexOf("HIST_CLOUD_MAX") === -1 && pushBody.indexOf("slice(-1)") === -1 && pushBody.indexOf("450000") === -1 && pushBody.indexOf("480") === -1, "the upload packs the merged history under the shared cap and does not replace it");
assert((pushBody.match(/A\.set\(APP, HIST_CLOUD/g) || []).length === 1, "one edit still uploads history once");
assert(pushBody.indexOf("HIST_CLOUD_OLD") !== -1 && pushBody.indexOf("A.set(APP, HIST_CLOUD_OLD)") === -1 && pushBody.indexOf('A.set(APP, "history"') === -1, "a missing history2 row is read from the old cloud key and that key is not written");
var syncBody = app.slice(app.indexOf("function sync("), app.indexOf("function cloudLoadUsed"));
assert((syncBody.match(/A\.set\(APP, KEY/g) || []).length === 1, "one edit uploads the items row once");
assert(app.indexOf('KEY = "items"') !== -1 && app.indexOf('HIST_CLOUD = "history2"') !== -1 && app.indexOf('HIST_CLOUD_OLD = "history"') !== -1, "items stays the items key and history moves to history2");
assert(app.indexOf('rg-sbx-ideas-hist2:') !== -1 && app.indexOf('rg-sbx-ideas-hist:') !== -1, "local history2 has its own prefix and the old prefix is still named");
assert(app.indexOf("writeLocal(histLegacyKey") === -1 && app.indexOf("setItem(histLegacyKey") === -1 && app.indexOf("removeItem(histLegacyKey") === -1, "the old local history key is never written or removed");
var sheetBody = app.slice(app.indexOf("function sheet("), app.indexOf("function closeSheet"));
var openBody = app.slice(app.indexOf("function openHistory"), app.indexOf("setInterval"));
assert(sheetBody.indexOf("opts.immediate") !== -1 && sheetBody.indexOf("< 450") !== -1, "other sheets still ignore the opening click");
assert(openBody.indexOf("immediate: true") !== -1 && openBody.indexOf('data-s="r:') !== -1, "version history takes a restore click immediately");
assert(restoreBody.indexOf("sparseRestore") !== -1 && syncBody.indexOf("sparseRestore") !== -1, "an empty restore does not bypass the deletion question");
assert(restoreBody.indexOf("adoptRestore(restoreDoc, {}, Date.now(), before)") !== -1 && syncBody.indexOf("adoptRestore(restoreDoc, cl, now(), items)") !== -1, "restore stamps only records that differ from the list on screen");

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
  var oldKey = "rg-sbx-ideas-hist:user", newKey = "rg-sbx-ideas-hist2:user", store = {};
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

var pins = {
  "ideas-sandbox/app.js": { v: 69, hash: "b5c41675b001ce7a" },
  "ideas-sandbox/rg-sync-status.js": { v: 11, hash: "03552d2f94cf7fb6" },
  "sandbox-shared/rg-account.js": { v: 3, hash: "d87f8ad4da2f5de3" }
};
Object.keys(pins).forEach(function (rel) {
  var hash = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, rel))).digest("hex").slice(0, 16);
  var ver = qver(rel.indexOf("account") !== -1 ? html : html, rel.split("/").pop());
  assert(ver === pins[rel].v && hash === pins[rel].hash, rel + " changed (" + hash + "): bump its ?v= in index.html and sw.js, then set the pin to v " + ver + " hash " + hash);
});
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
