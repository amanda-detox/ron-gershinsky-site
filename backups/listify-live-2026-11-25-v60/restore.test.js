/* Live Listify: restore a file into live keys only.
   Run: node my/ideas/restore.test.js */
"use strict";
var fs = require("fs");
var path = require("path");
var R = require("./restore.js");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL " + msg); failed++; }
  else console.log("ok " + msg);
}
function memory() {
  var map = {};
  return {
    map: map,
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(map, k) ? map[k] : null; },
    setItem: function (k, v) { map[k] = String(v); },
    removeItem: function (k) { delete map[k]; }
  };
}
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

var root = __dirname;
var filePath = path.join(root, "fixtures", "synthetic-restore.json");
var fileText = fs.readFileSync(filePath, "utf8");
var file = readJson(filePath);
var parsed = R.parseText(fileText);
assert(parsed.ok && parsed.kind === "listify-restore" && parsed.picked === "value", "synthetic file parses as listify-restore");
assert(parsed.createdAtLocal === "10/11/2026 07:20" && parsed.source === "synthetic", "synthetic file keeps its date and source");
assert(parsed.summary.listCount === 1 && parsed.summary.visible[0].name === "List A", "synthetic file has one list, List A");
assert(parsed.summary.visible[0].count === 1 && parsed.summary.itemCount === 1, "List A has one item; the tombstone is not an item");
assert(parsed.summary.tombstones === 1 && parsed.summary.hidden.length === 0, "the deleted record is a tombstone and there is no hidden list");
assert(parsed.summary.newestAt === 1, "newest date is the live record, from the file");
assert(parsed.items["c:abc"].name === "List A" && parsed.items.x1.text === "item" && parsed.items.x2.deleted === true, "the stored records are kept, including the tombstone");
assert(R.parseText("\ufeff" + fileText).ok, "a byte-order mark in front of the file is ignored");
assert(R.formatWhen(new Date(2026, 10, 10, 7, 20, 0).getTime()) === "10/11/2026 07:20", "dates are shown day/month/year and hour:minute");
assert(R.formatWhen(null) === "" && R.formatWhen("10/11/2026") === "", "a missing date is blank");

var mixed = R.parse({
  format: "listify-restore",
  value: { v: 1, seeded: true, items: {
    "c:vis": { id: "c:vis", type: "cat", cat: "vis", name: "Shown", pos: 1, at: 50 },
    a: { id: "a", sec: "vis", text: "one", done: false, order: 0, at: 40 },
    "c:hid": { id: "c:hid", type: "cat", cat: "hid", name: "Hidden", pos: 0, gone: 1, at: 80 },
    b: { id: "b", sec: "hid", text: "two", done: false, order: 0, at: 70 },
    z: { id: "z", deleted: true, at: 9999 },
    t1: { id: "t1", sec: "tasks", text: "do", done: false, order: 0, at: 30 }
  } }
});
assert(mixed.summary.listCount === 2 && mixed.summary.itemCount === 2, "a hidden list is not part of the visible count");
assert(mixed.summary.visible.map(function (r) { return r.name || r.builtin; }).join(",") === "tasks,Shown", "built-in tasks and the visible list, in list order");
assert(mixed.summary.visible[0].count === 1 && mixed.summary.visible[1].count === 1, "items per visible list");
assert(mixed.summary.hidden.length === 1 && mixed.summary.hidden[0].name === "Hidden" && mixed.summary.hidden[0].count === 1, "a gone list is previewed as hidden, with its items");
assert(mixed.summary.newestAt === 80 && mixed.summary.tombstones === 1, "a tombstone does not become the newest date; a hidden list still can");
assert(mixed.summary.builtinsMissing.join(",") === "ideas,goals", "built-ins with no record and no items are named, not counted as file lists");

assert(R.parse({ format: "listify-restore", value: { v: 1 } }).ok === false, "a restore wrapper without items is refused");
assert(R.parse(null).ok === false && R.parse([]).ok === false && R.parseText("nope").ok === false, "broken files are refused");

var deviceItems = { "c:dev": { id: "c:dev", type: "cat", cat: "dev", name: "From device", pos: 0, at: 5 }, i: { id: "i", sec: "dev", text: "d", done: false, order: 0, at: 5 } };
var cloudItems = { "c:cloud": { id: "c:cloud", type: "cat", cat: "cloud", name: "From cloud", pos: 0, at: 9 } };
var exported = {
  format: "healify-data-export",
  exportedAtLocal: "10/11/2026, 07:20:00",
  apps: { myideas: { device: {}, cloud: { items: { value: { v: 1, seeded: true, items: cloudItems } } } } }
};
exported.apps.myideas.device["rg-myideas-v1:user"] = { items: deviceItems, pending: false, seeded: true };
exported.apps.myideas.device["rg-sbx-ideas-v1:user"] = { items: { "c:no": { id: "c:no", type: "cat", cat: "no", name: "Sandbox key", pos: 0, at: 50 } } };
exported.apps.myideas.device["rg-other"] = { items: { "c:nope": { id: "c:nope", type: "cat", cat: "nope", name: "Nope", pos: 0, at: 40 } } };
var fromDevice = R.parse(exported);
assert(fromDevice.ok && fromDevice.picked === "device" && fromDevice.summary.visible[0].name === "From device", "a full export uses the live device slot, not the cloud and not other keys");
assert(fromDevice.createdAtLocal === "10/11/2026, 07:20:00", "a full export shows its local export time");

var older = JSON.parse(JSON.stringify(deviceItems));
older["c:dev"].at = 1; older.i.at = 1;
var newer = { "c:new": { id: "c:new", type: "cat", cat: "new", name: "Newer device", pos: 0, at: 20 } };
var two = { format: "healify-data-export", apps: { myideas: { device: {}, cloud: { items: { value: { items: cloudItems } } } } } };
two.apps.myideas.device["rg-myideas-v1:old"] = { items: older };
two.apps.myideas.device["rg-myideas-v1:new"] = { items: newer };
assert(R.parse(two).summary.visible[0].name === "Newer device", "when several device copies are present, the newer one is previewed");

var cloudOnly = { format: "healify-data-export", apps: { myideas: { device: { "rg-sbx-ideas-v1:user": exported.apps.myideas.device["rg-sbx-ideas-v1:user"] }, cloud: { items: { value: { v: 1, seeded: true, items: cloudItems } } } } } };
assert(R.parse(cloudOnly).picked === "cloud" && R.parse(cloudOnly).summary.visible[0].name === "From cloud", "with no live device copy, the cloud items in the export are used");
var emptyDevice = { format: "healify-data-export", apps: { myideas: { device: {}, cloud: { items: { value: { items: cloudItems } } } } } };
emptyDevice.apps.myideas.device["rg-myideas-v1:user"] = { items: {} };
assert(R.parse(emptyDevice).picked === "cloud", "an empty device copy falls through to the cloud copy");
assert(R.parse({ format: "healify-data-export", apps: {} }).ok === false, "an export with no lists is refused");
assert(R.parse({ v: 1, seeded: true, items: deviceItems }).summary.visible[0].name === "From device", "a bare stored value is accepted");

var foreignBefore = JSON.stringify({ items: { keep: { id: "keep", text: "SANDBOX", at: 4 } }, pending: false, seeded: true });
var mem = memory();
mem.setItem("rg-sbx-ideas-v1:user1", foreignBefore);
mem.setItem("rg-my-shopping-v1:user1", "{\"cart\":1}");
var current = { "c:old": { id: "c:old", type: "cat", cat: "old", name: "Old", pos: 0, at: 3 } };
var staged = R.stage({ storage: mem, uid: "user1", currentItems: current, nextItems: parsed.items, now: 1234 });
assert(staged.ok && staged.writes.every(function (w) { return w.key.indexOf("rg-myideas-") === 0 && w.key.indexOf("rg-sbx-ideas") === -1; }), "the planned writes are live keys only");
assert(R.commit(mem, staged).ok === true, "commit stores the live backup and the live copy");
var bak = JSON.parse(mem.getItem("rg-myideas-restore-bak:user1"));
var cache = JSON.parse(mem.getItem("rg-myideas-v1:user1"));
var roll = JSON.parse(mem.getItem("rg-myideas-bak:user1"));
assert(bak.t === 1234 && bak.reason === "before-file-restore" && bak.items["c:old"].name === "Old" && !bak.items["c:abc"], "the previous lists are in the backup");
assert(cache.pending === true && cache.seeded === true && cache.items["c:abc"].name === "List A" && cache.items.x1.text === "item" && !cache.items["c:old"], "the live cache is the file, not the old list");
assert(roll.length === 1 && roll[0].items["c:old"].name === "Old", "the rolling backup also keeps the previous lists");
assert(mem.getItem("rg-sbx-ideas-v1:user1") === foreignBefore && mem.getItem("rg-my-shopping-v1:user1") === "{\"cart\":1}", "sandbox and shopping keys are not written");
assert(Object.keys(mem.map).filter(function (k) { return k !== "rg-sbx-ideas-v1:user1" && k !== "rg-my-shopping-v1:user1"; }).every(function (k) { return k.indexOf("rg-myideas-") === 0; }), "the only new keys are live keys");

var evil = memory();
evil.setItem("rg-sbx-ideas-v1:user1", foreignBefore);
var refused = R.commit(evil, { ok: true, writes: [
  { key: "rg-sbx-ideas-v1:user1", json: "{\"pwn\":1}" },
  { key: "rg-myideas-v1:user1", json: "{}" }
] });
assert(refused.ok === false && evil.getItem("rg-sbx-ideas-v1:user1") === foreignBefore && evil.getItem("rg-myideas-v1:user1") === null, "a write that names a sandbox key is refused before anything is stored");
assert(R.stage({ storage: mem, uid: "../rg-sbx-ideas-v1:user1", currentItems: {}, nextItems: parsed.items }).ok === false, "a user id cannot retarget the backup key");

var quota = memory();
quota.setItem("rg-sbx-ideas-v1:user1", foreignBefore);
var nSet = 0;
var origSet = quota.setItem;
quota.setItem = function (k, v) { nSet++; if (nSet === 3) throw new Error("quota"); return origSet.call(quota, k, v); };
var staged2 = R.stage({ storage: quota, uid: "user1", currentItems: current, nextItems: parsed.items, now: 5 });
assert(R.commit(quota, staged2).ok === false, "a failed save is reported");
assert(quota.getItem("rg-myideas-restore-bak:user1") === null && quota.getItem("rg-myideas-v1:user1") === null, "a failed save rolls the live keys back");
assert(quota.getItem("rg-sbx-ideas-v1:user1") === foreignBefore, "a failed save does not touch the sandbox key");

var page = fs.readFileSync(path.join(root, "index.html"), "utf8");
var app = fs.readFileSync(path.join(root, "app.js"), "utf8");
var sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
var helper = fs.readFileSync(path.join(root, "restore.js"), "utf8");
var manifest = fs.readFileSync(path.join(root, "manifest.json"), "utf8");
var hub = fs.readFileSync(path.join(root, "../manifest.json"), "utf8");
assert(page.indexOf('restoreBtn: "שיחזור"') !== -1 && page.indexOf('data-i18n="restoreBtn">שיחזור</span>') !== -1 && page.indexOf('id="restore-file"') !== -1, "the restore control says שיחזור");
assert(page.indexOf('restoreTitle: "שיחזור"') !== -1 && page.indexOf("שחזור מקובץ") === -1, "the restore dialog title is שיחזור");
assert(page.indexOf('print: "הדפסה"') !== -1 && page.indexOf(">הדפסה</button>") !== -1 && page.indexOf('searchPh: "חיפוש"') !== -1, "the toolbar says חיפוש, הדפסה, and שיחזור");
assert(page.indexOf('id="hist-btn"') < page.indexOf('id="backup-link"') && page.indexOf('backupLink: "גיבוי"') !== -1 && page.indexOf('backupLink: "Backup"') !== -1, "backup is a text link beside version history");
assert(page.indexOf('restoreTitle: "Restore"') !== -1 && page.indexOf("<title>Listify</title>") !== -1 && page.indexOf('doc: "Listify"') !== -1, "the English tab title stays Listify");
assert(page.indexOf("version.js?v=3") !== -1 && page.indexOf("version.js?v=3") < page.indexOf("app.js?v=60") && page.indexOf("restore.js?v=2") !== -1, "the page loads version.js, then the bumped app");
assert(sw.indexOf("var CACHE = RG_MYIDEAS_CACHE") !== -1 && sw.indexOf("version.js?v=3") !== -1 && sw.indexOf("restore.js?v=2") !== -1 && sw.indexOf("app.js?v=60") !== -1 && sw.indexOf("../../shared/rg-install.js?v=1") !== -1, "the live cache list includes the new files and the shared install script");
var verFile = fs.readFileSync(path.join(root, "version.js"), "utf8");
assert(verFile.indexOf('RG_MYIDEAS_CACHE = "rg-myideas-v60"') !== -1 && sw.indexOf("rg-myideas-v60") === -1 && app.indexOf("rg-myideas-v60") === -1, "the cache name is written once, in version.js");
assert(app.indexOf('BUILD.indexOf("rg-") === 0 ? BUILD.slice(3)') !== -1, "the footer drops the leading rg-");
assert(app.indexOf('DEFAULT_BOX_ID = "b:"') !== -1 && app.indexOf("function saveDefaultName") !== -1 && app.indexOf("rg-myideas-boxname") === -1, "renaming כללי writes record b: inside the items map and adds no storage key");
assert(sw.indexOf("icon-maskable-192.png?v=56") !== -1 && manifest.indexOf("icon-maskable-192.png?v=56") !== -1 && manifest.indexOf('"scope": "./"') !== -1 && manifest.indexOf('"/ron-gershinsky-site/my/ideas/"') !== -1, "the live manifest scope and maskable icons stay");
assert(hub.indexOf('"/ron-gershinsky-site/my/index.html"') !== -1, "the private hub scope stays on my/index.html");
assert(sw.indexOf("rg-sbx-ideas") === -1 && page.indexOf("sandbox-tag") === -1 && page.indexOf("sandbox-shared") === -1, "live files do not point at the sandbox cache or scripts");
var built = R.buildFile({ a: { id: "a", at: 5, text: "Hi", sec: "tasks" } }, new Date(2026, 10, 10, 7, 20).getTime());
var back = R.parse(built);
assert(back.ok && back.kind === "listify-restore" && back.items.a.text === "Hi" && built.app === "myideas" && built.source === "listify", "a backup file loads back through restore as the live app");
var bakBody = app.slice(app.indexOf("function downloadBackup"), app.indexOf("function boot()"));
assert(bakBody.indexOf("function downloadBackup") === 0 && bakBody.indexOf("backupEmpty") !== -1 && bakBody.indexOf("restoreNeed") === -1, "an empty backup shows a short message and does not ask to sign in");
assert(page.indexOf('backupEmpty: "אין עדיין מה לגבות"') !== -1 && page.indexOf('waiting: "ממתין לסנכרון…"') !== -1, "the empty-backup and waiting lines are in Hebrew");
var restoreCss = page.slice(page.indexOf(".restorebtn {"), page.indexOf(".restorebtn {") + 500);
assert(restoreCss.indexOf("16px") !== -1, "the restore button is 16px like print");
var loadBody = app.slice(app.indexOf("function loadRestore"), app.indexOf("function bootRestore"));
assert(loadBody.indexOf("rememberSnap(true)") !== -1 && loadBody.indexOf("rememberSnap(true)") < loadBody.indexOf("restoreDoc = staged.items"), "a confirmed file restore saves the current state as a version first");
assert(loadBody.indexOf("adoptRestore") !== -1 && loadBody.indexOf("overwriteOk") !== -1 && loadBody.indexOf("sync()") !== -1, "a file restore is stamped fresh, then synced as a deliberate overwrite");
assert(app.indexOf("RGMyIdeasRestore") !== -1 && app.indexOf("RGSbxRestore") === -1 && app.indexOf("items = merged") !== -1, "file restore uses the live helper and sync still merges");
assert(app.indexOf('APP = "myideas"') !== -1 && app.indexOf("sbxmyideas") === -1 && app.indexOf("rg-sbx-ideas") === -1, "the app uses the live id and never a sandbox key");
assert(helper.indexOf('FOREIGN = "rg-sbx-ideas-"') !== -1 && helper.indexOf('SBX = "rg-myideas-"') !== -1 && helper.indexOf('setItem("rg-sbx') === -1, "the helper names the sandbox prefix only to refuse it");
assert(page.indexOf('id="list-search"') !== -1 && page.indexOf('id="search-clear"') !== -1 && page.indexOf('id="actrow"') !== -1 && page.indexOf('id="print-btn"') !== -1, "search sits in the same row as print and restore");
var searchBody = app.slice(app.indexOf("function searchView"), app.indexOf("function render"));
assert(searchBody.indexOf("saveLocal") === -1 && searchBody.indexOf("changed(") === -1 && searchBody.indexOf("put(") === -1 && searchBody.indexOf("localStorage") === -1 && searchBody.indexOf("setOrder") === -1, "the search view does not write or reorder");
var delBoxBody = app.slice(app.indexOf("function delBox"), app.indexOf("function orderWithin"));
assert(delBoxBody.indexOf("function delBox") === 0 && delBoxBody.indexOf("del(") === -1 && delBoxBody.indexOf("box: null") !== -1, "deleting a category clears the list link and does not delete lists");
assert(app.indexOf("NOTE_MAX = 2500") !== -1 && app.indexOf("function cleanNote") !== -1 && app.indexOf("clean(note, 500)") === -1 && app.indexOf('maxlength="500"') === -1, "the note cap is 2500 and notes are not sliced");
assert(page.indexOf("הגעת לאורך המרבי של הערה") !== -1 && page.indexOf('id="box-picker"') !== -1 && page.indexOf('boxDefault: "כללי"') !== -1 && page.indexOf('id="notes-all"') !== -1, "the category dropdown, the note toggles, and the max-length message are on the live page");
var boxMenu = app.slice(app.indexOf("function fillBoxMenu"), app.indexOf("function openBoxMenu"));
assert(boxMenu.indexOf('t("optMove")') !== -1 && boxMenu.indexOf('t("moveNote")') !== -1 && boxMenu.indexOf("pm-h") !== -1 && boxMenu.indexOf('t("editDone")') !== -1 && boxMenu.indexOf('data-box="mov:') !== -1, "every category, including כללי, gets סידור with the list reorder wording");
assert(app.indexOf("function setBoxOrder") !== -1 && app.indexOf("writeDefault({ pos: n })") !== -1 && app.indexOf("boxorder") === -1 && app.indexOf("function boxViews") !== -1, "category order is a pos field on the existing box records");
assert(page.indexOf('boxDelKeep: "אי אפשר למחוק את הקטגוריה הזו: אין קטגוריה אחרת, או שיש בה רשימות."') !== -1 && page.indexOf('noteToggle: "הצג/הסתר הערה"') !== -1 && page.indexOf("width: 36px") !== -1 && page.indexOf("height: 36px") !== -1, "כללי can be renamed, delete is blocked in Hebrew, and the note control is 36px");
assert(page.indexOf("נחתך") === -1 && app.indexOf("נחתך") === -1 && page.indexOf("לחתוך") === -1 && app.indexOf("לחתוך") === -1, "the UI never says a note was cut");
var longNote = new Array(2501).join("נ");
var many = { "c:shop": { id: "c:shop", type: "cat", cat: "shop", name: "קניות", box: "brand", pos: 4, at: 5 }, "b:brand": { id: "b:brand", type: "box", box: "brand", name: "מיתוג", pos: 1, at: 6 }, s1: { id: "s1", sec: "shop", text: "חלב", note: longNote, done: false, order: 1, at: 7 } };
for (var li = 0; li < 30; li++) many["n" + li] = { id: "n" + li, sec: "shop", text: "שורה " + li, note: li === 3 ? "סימן" : "", done: false, order: li + 2, at: 8 + li };
var builtLong = R.buildFile(many, new Date(2026, 10, 11, 8, 0).getTime());
var backLong = R.parse(builtLong);
assert(backLong.ok && backLong.items.s1.note === longNote && backLong.items.s1.note.length === 2500, "a 2500-character note survives backup and restore whole");
assert(backLong.items["c:shop"] && backLong.items["c:shop"].box === "brand" && backLong.items["b:brand"].name === "מיתוג" && !backLong.items.s1.deleted, "a category and its list survive backup and restore");
assert(Object.keys(backLong.items).filter(function (k) { return backLong.items[k].sec === "shop"; }).length === 31, "a long list survives backup and restore");

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("all live restore checks passed");
