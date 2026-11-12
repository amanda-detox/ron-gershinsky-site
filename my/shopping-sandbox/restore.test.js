/* Sandbox Purchasify: search is a view, restore writes sandbox keys only.
   Run: node my/shopping-sandbox/restore.test.js */
"use strict";
var fs = require("fs");
var path = require("path");
var R = require("./restore.js");
var SS = require("./rg-sync-status.js");
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

var item = { id: "a", text: "Milk", note: "cold", done: false, list: "main", created: 5, at: 5 };
var cat = { id: "c:main", type: "cat", cat: "main", name: "Shop", pos: 0, created: 1, at: 5 };
var file = R.buildFile({ a: item, gone: { id: "gone", deleted: true, at: 4 } }, { "c:main": cat }, new Date(2026, 10, 10, 7, 20, 0).getTime());
var parsed = R.parse(file);
assert(parsed.ok && parsed.kind === "purchasify-restore" && parsed.picked === "value", "a backup file parses as purchasify-restore");
assert(parsed.createdAtLocal === "10/11/2026 07:20" && parsed.source === "sandbox", "the backup keeps its local time and sandbox source");
assert(parsed.summary.listCount === 1 && parsed.summary.visible[0].name === "Shop" && parsed.summary.visible[0].count === 1, "the backup has one list and one item");
assert(parsed.summary.tombstones === 1 && parsed.items.a.text === "Milk" && parsed.cats["c:main"].name === "Shop", "items, categories, and the tombstone are kept");
assert(R.parseText("\ufeff" + JSON.stringify(file)).ok, "a byte-order mark in front of the file is ignored");
assert(R.parse({ format: "purchasify-restore", value: { v: 1 } }).ok === false, "a restore wrapper without lists is refused");
assert(R.parse(null).ok === false && R.parseText("nope").ok === false, "broken files are refused");

var hidden = R.parse({
  format: "purchasify-restore",
  value: { v: 1, items: {
    a: { id: "a", text: "shown", at: 10, created: 10, list: "main" },
    b: { id: "b", text: "hid", at: 12, created: 12, list: "old" }
  }, cats: {
    "c:old": { id: "c:old", type: "cat", cat: "old", name: "Old", pos: 2, gone: 1, at: 12 }
  } }
});
assert(hidden.summary.visible.length === 1 && hidden.summary.visible[0].builtin === "main" && hidden.summary.visible[0].count === 1, "an item with no category record still counts in the built-in list");
assert(hidden.summary.hidden.length === 1 && hidden.summary.hidden[0].name === "Old" && hidden.summary.hidden[0].count === 1, "a gone category is previewed as hidden, with its items");

var deviceItems = { a: { id: "a", text: "From device", at: 5, created: 5 } };
var cloudItems = { b: { id: "b", text: "From cloud", at: 9, created: 9 } };
var exported = {
  format: "healify-data-export",
  exportedAtLocal: "10/11/2026, 07:20:00",
  apps: { shopping: { device: {}, cloud: {
    items: { value: { v: 1, items: cloudItems } },
    cats: { value: { v: 1, cats: { "c:tea": { id: "c:tea", type: "cat", cat: "tea", name: "Tea", pos: 1, at: 9 } } } }
  } }, ideas: { device: {}, cloud: {} } }
};
exported.apps.shopping.device["rg-my-shopping:user"] = { items: deviceItems, cats: { "c:main": { id: "c:main", type: "cat", cat: "main", name: "Device", pos: 0, at: 5 } }, pending: false };
exported.apps.shopping.device["rg-sbx-shopping:user"] = { items: { z: { id: "z", text: "Sandbox key", at: 80, created: 80 } }, cats: {} };
exported.apps.ideas = { device: { "rg-myideas-v1:user": { items: { no: { id: "no", text: "Nope", at: 90 } } } } };
var fromDevice = R.parse(exported);
assert(fromDevice.ok && fromDevice.picked === "device" && fromDevice.summary.visible[0].name === "Device", "a full export uses the live shopping device slot, not the sandbox key and not another app");
assert(fromDevice.items.z == null && fromDevice.items.no == null && fromDevice.items.a.text === "From device", "other keys in the file are not restored");
var cloudOnly = { format: "healify-data-export", apps: { shopping: { device: { "rg-sbx-shopping:user": exported.apps.shopping.device["rg-sbx-shopping:user"] }, cloud: exported.apps.shopping.cloud } } };
assert(R.parse(cloudOnly).picked === "cloud" && R.parse(cloudOnly).summary.visible.some(function (r) { return r.name === "Tea"; }), "with no live device copy, the cloud shopping rows are used");
assert(R.parse({ format: "healify-data-export", apps: {} }).ok === false, "an export with no shopping lists is refused");
assert(R.parse({ items: deviceItems, cats: {} }).summary.itemCount === 1, "a bare stored value is accepted");

var liveBefore = JSON.stringify({ items: { keep: { id: "keep", text: "LIVE", at: 4 } }, pending: false });
var mem = memory();
mem.setItem("rg-my-shopping:user1", liveBefore);
mem.setItem("rg-myideas-v1:user1", "{\"ideas\":1}");
var currentI = { old: { id: "old", text: "Old", at: 3, created: 3 } };
var currentC = {};
var staged = R.stage({ storage: mem, uid: "user1", currentItems: currentI, currentCats: currentC, nextItems: parsed.items, nextCats: parsed.cats, now: 1234 });
assert(staged.ok && staged.writes.every(function (w) { return w.key.indexOf("rg-sbx-shopping") === 0 && w.key.indexOf("rg-my-shopping") === -1; }), "the planned writes are sandbox keys only");
assert(R.commit(mem, staged).ok === true, "commit stores the sandbox backup and the sandbox copy");
var bak = JSON.parse(mem.getItem("rg-sbx-shopping-restore-bak:user1"));
var cache = JSON.parse(mem.getItem("rg-sbx-shopping:user1"));
var roll = JSON.parse(mem.getItem("rg-sbx-shopping-bak:user1"));
assert(bak.t === 1234 && bak.reason === "before-file-restore" && bak.items.old.text === "Old", "the previous sandbox list is in the restore backup");
assert(cache.pending === true && cache.items.a.text === "Milk" && cache.cats["c:main"].name === "Shop" && !cache.items.old, "the sandbox cache is the file, not the old sandbox list");
assert(roll.length === 1 && roll[0].items.old.text === "Old" && roll[0].cats && !roll[0].items.a, "the rolling sandbox backup keeps the previous lists");
assert(mem.getItem("rg-my-shopping:user1") === liveBefore && mem.getItem("rg-myideas-v1:user1") === "{\"ideas\":1}", "live keys are not written");
assert(Object.keys(mem.map).filter(function (k) { return k !== "rg-my-shopping:user1" && k !== "rg-myideas-v1:user1"; }).every(function (k) { return k.indexOf("rg-sbx-shopping") === 0; }), "the only new keys are sandbox keys");

var evil = memory();
evil.setItem("rg-my-shopping:user1", liveBefore);
var refused = R.commit(evil, { ok: true, writes: [
  { key: "rg-my-shopping:user1", json: "{\"pwn\":1}" },
  { key: "rg-sbx-shopping:user1", json: "{}" }
] });
assert(refused.ok === false && evil.getItem("rg-my-shopping:user1") === liveBefore && evil.getItem("rg-sbx-shopping:user1") === null, "a write that names a live key is refused before anything is stored");
assert(R.stage({ storage: mem, uid: "../rg-my-shopping:user1", currentItems: {}, currentCats: {}, nextItems: parsed.items, nextCats: {} }).ok === false, "a user id cannot retarget the backup key");

var quota = memory();
var nSet = 0;
var origSet = quota.setItem;
quota.setItem = function (k, v) { nSet++; if (nSet === 3) throw new Error("quota"); return origSet.call(quota, k, v); };
var staged2 = R.stage({ storage: quota, uid: "user1", currentItems: currentI, currentCats: {}, nextItems: parsed.items, nextCats: parsed.cats, now: 5 });
assert(R.commit(quota, staged2).ok === false, "a failed save is reported");
assert(quota.getItem("rg-sbx-shopping-restore-bak:user1") === null && quota.getItem("rg-sbx-shopping:user1") === null, "a failed save rolls the sandbox keys back");

assert(SS.kind({ maySync: true, pending: true, busy: true, onLine: true }) === "saving", "a save in flight is the saving state");
assert(SS.kind({ maySync: true, pending: true, busy: false, onLine: true }) === "waiting", "a change that is not uploading yet waits");
assert(SS.kind({ maySync: true, offline: true, pending: true, onLine: true }) === "offline", "offline stays its own state for the long message");
assert(SS.kind({ maySync: false }) === "localOnly", "signed out is not the waiting state");

var root = __dirname;
var page = fs.readFileSync(path.join(root, "index.html"), "utf8");
var app = fs.readFileSync(path.join(root, "app.js"), "utf8");
var sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
var helper = fs.readFileSync(path.join(root, "restore.js"), "utf8");
var liveHtml = fs.readFileSync(path.join(root, "../shopping/index.html"), "utf8");
var liveApp = fs.readFileSync(path.join(root, "../shopping/app.js"), "utf8");
assert(page.indexOf('id="list-search"') !== -1 && page.indexOf('id="search-clear"') !== -1 && page.indexOf('id="actrow"') !== -1, "search sits in the options row");
assert(page.indexOf('id="backup-btn"') === -1 && page.indexOf('id="syncline"') === -1, "the toolbar backup button and the old sync line are gone");
assert(page.indexOf('id="list-search"') < page.indexOf('id="print-btn"') && page.indexOf('id="print-btn"') < page.indexOf('id="restore-file-btn"'), "the row order is search, print, restore");
assert(page.indexOf('print: "הדפסה"') !== -1 && page.indexOf('restoreBtn: "שיחזור"') !== -1 && page.indexOf('restoreTitle: "שיחזור"') !== -1 && page.indexOf('searchPh: "חיפוש"') !== -1, "the Hebrew labels are חיפוש, הדפסה, and שיחזור");
assert(page.indexOf('print: "Print"') !== -1 && page.indexOf('searchPh: "Search"') !== -1 && page.indexOf('restoreBtn: "Restore"') !== -1, "the English labels are Search, Print, and Restore");
assert(page.indexOf('id="add-form"') < page.indexOf('id="status"') && page.indexOf('id="status"') < page.indexOf('id="lastsync"') && page.indexOf('id="lastsync"') < page.indexOf('id="cloudat"') && page.indexOf('id="cloudat"') < page.indexOf('id="hist-btn"') && page.indexOf('id="hist-btn"') < page.indexOf('id="backup-link"'), "sync times sit at the bottom, and backup is a link beside version history");
assert(page.indexOf('lastSync: "סונכרן לאחרונה ב-{t}"') !== -1 && page.indexOf('cloudAt: "עודכן בענן ב-{t}"') !== -1 && page.indexOf('localOnly: "נשמר במכשיר הזה בלבד, בלי חשבון"') !== -1, "the status uses Listify's wording");
assert(page.indexOf('id="syncslot"') === -1 && page.indexOf("לא מסונכרן") === -1, "the waiting state does not use לא מסונכרן");
var printCss = page.slice(page.indexOf(".printbtn {"), page.indexOf(".printbtn {") + 320);
assert(printCss.indexOf("padding: 0 18px") !== -1, "print uses Listify's 18px padding");
var searchCss = page.slice(page.indexOf(".searchin {"), page.indexOf(".searchin:focus"));
assert(searchCss.indexOf("text-align: start") !== -1 && page.indexOf(".searchin:placeholder-shown { text-align: center; }") !== -1, "only the search placeholder is centered");
assert(sw.indexOf('var CACHE = "rg-sbx-shopping-v7"') !== -1 && sw.indexOf("restore.js?v=1") !== -1 && sw.indexOf("app.js?v=54") !== -1 && sw.indexOf("rg-sync-status.js?v=3") !== -1 && sw.indexOf("rg-install.js?v=1") !== -1, "the sandbox cache name includes the new files");
var bakBody = app.slice(app.indexOf("function downloadBackup"), app.indexOf("function openHistory"));
assert(bakBody.indexOf("backupEmpty") !== -1 && bakBody.indexOf("restoreNeed") === -1, "an empty backup shows a short message and does not ask to sign in");
assert(page.indexOf('backupEmpty: "אין עדיין מה לגבות"') !== -1 && page.indexOf("ממתין לסנכרון…") !== -1 && page.indexOf("#4A78DC") !== -1 && page.indexOf("#1E3A8A") !== -1 && page.indexOf("#5B8DEF") !== -1, "waiting is deep blue and the backup link uses the synced blue");
var restoreCss = page.slice(page.indexOf(".restorebtn {"), page.indexOf(".restorebtn {") + 420);
assert(restoreCss.indexOf("16px") !== -1 && restoreCss.indexOf("15px") === -1, "the restore button is 16px like print");
assert(SS.formatSyncTime(new Date(2026, 0, 5, 9, 4).getTime()) === "05/01 09:04", "sync times use DD/MM HH:MM");
assert(SS.LAST_PREFIX === "rg-sbx-shopping-lastsync:", "the clock key stays in the sandbox prefix");
assert(SS.shouldStampSync({ downloaded: true, uploaded: true, nothingToUpload: false, blocked: false, failed: false, pendingLeft: false }) === true, "a finished upload stamps a sync time");
assert(SS.shouldStampSync({ downloaded: true, blocked: true, failed: false, pendingLeft: false }) === false, "a held sync does not stamp");
assert(app.indexOf('APP = "sbxshopping"') !== -1 && app.indexOf('APP = "shopping"') === -1 && app.indexOf("rg-my-shopping") === -1, "the sandbox app still never names the live app or its key");
assert(app.indexOf('if (APP !== "sbxshopping")') !== -1, "sync refuses to run unless the app id is the sandbox");
assert(helper.indexOf(LIVE_NEEDLE()) !== -1 && helper.indexOf('setItem("rg-my-shopping') === -1 && helper.indexOf("setItem('rg-my-shopping") === -1, "the helper recognizes a live device key in a file and does not write it");
assert(liveHtml.indexOf("list-search") === -1 && liveHtml.indexOf("syncline") === -1 && liveApp.indexOf("function searchView") === -1, "live Purchasify has no search row and no moved sync line");
var searchBody = app.slice(app.indexOf("function searchView"), app.indexOf("function render"));
assert(searchBody.indexOf("saveLocal") === -1 && searchBody.indexOf("changed(") === -1 && searchBody.indexOf("localStorage") === -1 && searchBody.indexOf("setOrder") === -1 && searchBody.indexOf("upd(") === -1, "the search view does not write or reorder");
var loadBody = app.slice(app.indexOf("function loadRestore"), app.indexOf("function bootRestore"));
assert(loadBody.indexOf("R.commit") !== -1 && loadBody.indexOf("restoreDoc") !== -1 && loadBody.indexOf("sync()") !== -1, "a confirmed file restore commits, then syncs");
assert(loadBody.indexOf('A.set("shopping"') === -1 && loadBody.indexOf("rg-my-shopping") === -1, "the confirm path does not target the live app");

function LIVE_NEEDLE() { return "rg-" + "my-shopping:"; }

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("all purchasify sandbox checks passed");
