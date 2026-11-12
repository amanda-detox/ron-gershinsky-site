/* Sandbox Listify: restore a file into sandbox keys only.
   Run: node ideas-sandbox/restore.test.js */
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

var liveBefore = JSON.stringify({ items: { keep: { id: "keep", text: "LIVE", at: 4 } }, pending: false, seeded: true });
var mem = memory();
mem.setItem("rg-myideas-v1:user1", liveBefore);
mem.setItem("rg-my-shopping-v1:user1", "{\"cart\":1}");
var current = { "c:old": { id: "c:old", type: "cat", cat: "old", name: "Old", pos: 0, at: 3 } };
var staged = R.stage({ storage: mem, uid: "user1", currentItems: current, nextItems: parsed.items, now: 1234 });
assert(staged.ok && staged.writes.every(function (w) { return w.key.indexOf("rg-sbx-ideas-") === 0 && w.key.indexOf("rg-myideas") === -1; }), "the planned writes are sandbox keys only");
assert(R.commit(mem, staged).ok === true, "commit stores the sandbox backup and the sandbox copy");
var bak = JSON.parse(mem.getItem("rg-sbx-ideas-restore-bak:user1"));
var cache = JSON.parse(mem.getItem("rg-sbx-ideas-v1:user1"));
var roll = JSON.parse(mem.getItem("rg-sbx-ideas-bak:user1"));
assert(bak.t === 1234 && bak.reason === "before-file-restore" && bak.items["c:old"].name === "Old" && !bak.items["c:abc"], "the previous sandbox lists are in the backup");
assert(cache.pending === true && cache.seeded === true && cache.items["c:abc"].name === "List A" && cache.items.x1.text === "item" && !cache.items["c:old"], "the sandbox cache is the file, not the old sandbox list");
assert(roll.length === 1 && roll[0].items["c:old"].name === "Old", "the rolling sandbox backup also keeps the previous lists");
assert(mem.getItem("rg-myideas-v1:user1") === liveBefore && mem.getItem("rg-my-shopping-v1:user1") === "{\"cart\":1}", "live keys are not written");
assert(Object.keys(mem.map).filter(function (k) { return k !== "rg-myideas-v1:user1" && k !== "rg-my-shopping-v1:user1"; }).every(function (k) { return k.indexOf("rg-sbx-ideas-") === 0; }), "the only new keys are sandbox keys");

var evil = memory();
evil.setItem("rg-myideas-v1:user1", liveBefore);
var refused = R.commit(evil, { ok: true, writes: [
  { key: "rg-myideas-v1:user1", json: "{\"pwn\":1}" },
  { key: "rg-sbx-ideas-v1:user1", json: "{}" }
] });
assert(refused.ok === false && evil.getItem("rg-myideas-v1:user1") === liveBefore && evil.getItem("rg-sbx-ideas-v1:user1") === null, "a write that names a live key is refused before anything is stored");
assert(R.stage({ storage: mem, uid: "../rg-myideas-v1:user1", currentItems: {}, nextItems: parsed.items }).ok === false, "a user id cannot retarget the backup key");

var quota = memory();
quota.setItem("rg-myideas-v1:user1", liveBefore);
var nSet = 0;
var origSet = quota.setItem;
quota.setItem = function (k, v) { nSet++; if (nSet === 3) throw new Error("quota"); return origSet.call(quota, k, v); };
var staged2 = R.stage({ storage: quota, uid: "user1", currentItems: current, nextItems: parsed.items, now: 5 });
assert(R.commit(quota, staged2).ok === false, "a failed save is reported");
assert(quota.getItem("rg-sbx-ideas-restore-bak:user1") === null && quota.getItem("rg-sbx-ideas-v1:user1") === null, "a failed save rolls the sandbox keys back");
assert(quota.getItem("rg-myideas-v1:user1") === liveBefore, "a failed save does not touch the live key");

var page = fs.readFileSync(path.join(root, "index.html"), "utf8");
var app = fs.readFileSync(path.join(root, "app.js"), "utf8");
var sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
var helper = fs.readFileSync(path.join(root, "restore.js"), "utf8");
var live = fs.readFileSync(path.join(root, "../my/ideas/app.js"), "utf8");
var liveHtml = fs.readFileSync(path.join(root, "../my/ideas/index.html"), "utf8");
assert(page.indexOf('restoreBtn: "שחזור"') !== -1 && page.indexOf('data-i18n="restoreBtn">שחזור</span>') !== -1 && page.indexOf('id="restore-file"') !== -1, "the sandbox restore control says שחזור");
assert(page.indexOf('restoreTitle: "שחזור"') !== -1 && page.indexOf("שחזור מקובץ") === -1, "the restore dialog title is שחזור");
assert(page.indexOf('restoreTitle: "Restore"') !== -1 && page.indexOf("Restore from file") === -1, "the English restore dialog title is Restore");
assert(page.indexOf("z-index: 10001") !== -1, "the preview sheet sits above the install chip so the confirm button can be tapped");
assert(page.indexOf("restore.js?v=1") !== -1 && page.indexOf("app.js?v=55") !== -1, "the sandbox page loads the restore helper and the bumped app");
assert(sw.indexOf('var CACHE = "rg-sbx-ideas-v23"') !== -1 && sw.indexOf("restore.js?v=1") !== -1 && sw.indexOf("app.js?v=55") !== -1 && sw.indexOf("rg-sync-status.js?v=7") !== -1 && sw.indexOf("rg-install.js?v=1") !== -1, "the sandbox cache version includes the new files");
assert(sw.indexOf("icon-maskable-192.png?v=20") !== -1 && sw.indexOf("icon-maskable-512.png?v=20") !== -1 && sw.indexOf("manifest.json?v=23") !== -1, "the sandbox cache includes the maskable icons");
var manifest = fs.readFileSync(path.join(root, "manifest.json"), "utf8");
var liveManifest = fs.readFileSync(path.join(root, "../my/ideas/manifest.json"), "utf8");
assert(manifest.indexOf('"purpose": "any"') !== -1 && manifest.indexOf("icon-maskable-192.png?v=20") !== -1 && manifest.indexOf("icon-maskable-512.png?v=20") !== -1 && manifest.indexOf('"purpose": "maskable"') !== -1, "the sandbox manifest keeps the any icons and adds maskable ones");
assert(liveManifest.indexOf("icon-maskable-192.png?v=56") !== -1 && liveManifest.indexOf("icon-maskable-512.png?v=56") !== -1 && liveManifest.indexOf('"purpose": "maskable"') !== -1 && liveManifest.indexOf('"start_url": "./"') !== -1 && liveManifest.indexOf('"scope": "./"') !== -1 && liveManifest.indexOf('"/ron-gershinsky-site/my/ideas/"') !== -1 && live.indexOf("icon-maskable") === -1, "live Listify keeps its manifest id, start_url, and scope and adds maskable icons");
assert(sw.indexOf("rg-myideas-") === -1, "the sandbox service worker does not name the live cache");
var loadBody = app.slice(app.indexOf("function loadRestore"), app.indexOf("function bootRestore"));
assert(loadBody.indexOf("rememberSnap(true)") !== -1 && loadBody.indexOf("rememberSnap(true)") < loadBody.indexOf("restoreDoc = staged.items"), "a confirmed file restore saves the current state as a version first");
assert(loadBody.indexOf("adoptRestore") !== -1 && loadBody.indexOf("overwriteOk") !== -1 && loadBody.indexOf("sync()") !== -1 && loadBody.indexOf("restoreReplace") === -1, "a file restore is stamped fresh, then synced as a deliberate overwrite");
assert(loadBody.indexOf("stamp(items, null)") !== -1, "the previous snap is not the source of the restored stamps");
assert(app.indexOf("RGSbxRestore") !== -1 && app.indexOf("items = merged") !== -1, "the sandbox app restores a file and still merges on sync");
assert(app.indexOf("rg-myideas") === -1 && app.indexOf('APP = "myideas"') === -1 && app.indexOf('APP = "sbxmyideas"') !== -1, "the sandbox app still never names the live app or its key");
assert(helper.indexOf(LIVE_NEEDLE()) !== -1 && helper.indexOf('setItem("rg-myideas') === -1 && helper.indexOf("setItem('rg-myideas") === -1, "the helper recognizes a live device key in a file and does not write that string");
assert(live.indexOf("RGMyIdeasRestore") !== -1 && live.indexOf("RGSbxRestore") === -1 && live.indexOf("rg-sbx-ideas-") === -1, "live file restore uses the live helper and live keys");
assert(liveHtml.indexOf("שחזור מקובץ") !== -1 && liveHtml.indexOf("ideas-sandbox/restore.js") === -1 && liveHtml.indexOf('src="restore.js?v=1"') !== -1, "the live page loads its own restore helper");
assert(page.indexOf('id="list-search"') !== -1 && page.indexOf('id="search-clear"') !== -1 && page.indexOf('id="actrow"') !== -1 && page.indexOf('id="print-btn"') !== -1, "search sits in the same row as print and restore");
assert(liveHtml.indexOf('id="list-search"') !== -1 && live.indexOf("function searchView") !== -1 && live.indexOf('APP = "myideas"') !== -1 && live.indexOf("rg-sbx-ideas") === -1, "live Listify has search and still uses the live app id and keys");
var searchBody = app.slice(app.indexOf("function searchView"), app.indexOf("function render"));
assert(searchBody.indexOf("saveLocal") === -1 && searchBody.indexOf("changed(") === -1 && searchBody.indexOf("put(") === -1 && searchBody.indexOf("localStorage") === -1 && searchBody.indexOf("setOrder") === -1, "the search view does not write or reorder");

function LIVE_NEEDLE() { return "rg-" + "myideas-v1:"; }

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("all restore checks passed");
