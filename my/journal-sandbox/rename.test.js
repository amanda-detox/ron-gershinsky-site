/* Renaming a sandbox topic keeps its id, its entries, and the other topics.
   The new name syncs on the sandbox row only. Run: node my/journal-sandbox/rename.test.js */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var child = require("child_process");
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
function tick(ms) { return new Promise(function (r) { setTimeout(r, ms || 0); }); }
function clone(x) { return JSON.parse(JSON.stringify(x)); }

var liveDoc = JSON.stringify({
  items: { live1: { id: "live1", kind: "entry", text: "LIVE", topic: "t", day: "2024-01-01", created: 1, at: 1 } },
  pending: false
});

function boot() {
  var box = memory();
  box.setItem("rg-myjournal-v1:user1", liveDoc);
  var cloud = { value: null, writes: [] };
  var calls = [];
  var g = {
    console: console,
    setTimeout: function () { return 0; },
    clearTimeout: function () {},
    setInterval: function () { return 0; },
    clearInterval: function () {},
    localStorage: box,
    document: { visibilityState: "visible", addEventListener: function () {} },
    navigator: { onLine: true },
    addEventListener: function () {},
    Date: Date,
    Promise: Promise,
    JSON: JSON,
    Math: Math,
    Object: Object
  };
  g.window = g;
  g.RGAccount = {
    user: function () { return { id: "user1" }; },
    onChange: function () {},
    ready: Promise.resolve({ id: "user1" }),
    get: function (app, key) {
      calls.push("get " + app + " " + key);
      if (app !== "sbxjournal" || key !== "items") return Promise.reject(new Error("store read " + app + "/" + key));
      return Promise.resolve(cloud.value ? clone(cloud.value) : null);
    },
    set: function (app, key, value) {
      calls.push("set " + app + " " + key);
      if (app !== "sbxjournal" || key !== "items") return Promise.reject(new Error("store write " + app + "/" + key));
      cloud.value = clone(value);
      cloud.writes.push(clone(value));
      return Promise.resolve(value);
    }
  };
  vm.createContext(g);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "rg-store.js"), "utf8"), g, { filename: "rg-store.js" });
  var S = g.RGStore("sbxjournal", { onChange: function () {}, onStatus: function () {} });
  return tick().then(tick).then(function () { return S.sync(); }).then(function () {
    return { S: S, box: box, cloud: cloud, calls: calls };
  });
}

function idsOf(items, kind) {
  return Object.keys(items).filter(function (k) { return items[k] && !items[k].deleted && items[k].kind === kind; }).sort();
}

boot().then(function (ctx) {
  var S = ctx.S, box = ctx.box, cloud = ctx.cloud;
  assert(cloud.writes.length === 0, "opening an empty sandbox does not upload");
  assert(box.getItem("rg-myjournal-v1:user1") === liveDoc, "opening does not touch the live journal");
  var topic = S.add({ kind: "topic", name: "עבודה" });
  var other = S.add({ kind: "topic", name: "בריאות" });
  var e1 = S.add({ kind: "entry", text: "פסקה ראשונה", topic: topic, day: "2026-11-01" });
  var e2 = S.add({ kind: "entry", text: "פסקה שנייה", topic: topic, day: "2026-11-02" });
  var e3 = S.add({ kind: "entry", text: "בריאות היום", topic: other, day: "2026-11-03" });
  var snap = {
    e1: clone(S.get(e1)), e2: clone(S.get(e2)), e3: clone(S.get(e3)), other: clone(S.get(other))
  };
  return S.sync().then(function () {
    assert(cloud.writes.length === 1, "the first real edit uploads once");
    assert(cloud.writes[0].v === 1 && cloud.writes[0].items[topic].name === "עבודה", "the upload is the sandbox items row");
    var remote = clone(cloud.value);
    var ahead = remote.items[topic].at + 1;
    remote.items[topic].name = "מהענן";
    remote.items[topic].at = ahead;
    remote.items[topic]._f = remote.items[topic]._f || {};
    remote.items[topic]._f.name = ahead;
    remote.items[topic]._f["~"] = ahead;
    cloud.value = remote;
    return S.sync();
  }).then(function () {
    assert(S.get(topic).name === "מהענן", "a newer name from the other device is adopted");
    assert(S.list("topic").length === 2, "adopting a name does not add a topic");
    assert(S.get(e1).text === snap.e1.text && S.get(e1).topic === topic, "adopting a name leaves the entry on the same topic");
    assert(S.get(e2).topic === topic && S.get(e3).topic === other, "the other entries stay put");
    var beforeAt = S.get(topic).at;
    return tick(30).then(function () {
    S.upd(topic, { name: "עבודה ולימודים" });
    assert(S.get(topic).id === topic && S.get(topic).name === "עבודה ולימודים", "rename keeps the topic id and changes only its name");
    assert(S.get(topic).at > beforeAt, "rename bumps the topic time so other devices can merge it");
    assert(S.list("topic").length === 2, "rename does not create a second topic");
    assert(S.list("topic").filter(function (x) { return x.name === "עבודה" || x.name === "מהענן"; }).length === 0, "the old name is no longer a topic");
    assert(S.get(e1).text === snap.e1.text && S.get(e1).topic === topic && S.get(e1).at === snap.e1.at, "the first entry is not rewritten");
    assert(S.get(e2).text === snap.e2.text && S.get(e2).topic === topic && S.get(e2).at === snap.e2.at, "the second entry is not rewritten");
    assert(S.get(e3).text === snap.e3.text && S.get(e3).topic === other && S.get(other).name === "בריאות", "the other topic and its entry stay");
    var cached = JSON.parse(box.getItem("rg-sbx-journal-v1:user1"));
    assert(cached.items[topic].name === "עבודה ולימודים" && typeof cached.items[topic]._f.name === "number", "the saved topic records a field time for the name");
    assert(cached.items[e1].text === "פסקה ראשונה" && cached.items[e1].topic === topic, "the cache still holds the entry under the same topic");
    assert(box.getItem("rg-myjournal-v1:user1") === liveDoc, "rename does not touch the live journal key");
    return S.sync();
    });
  }).then(function () {
    var sent = cloud.writes[cloud.writes.length - 1];
    assert(sent.items[topic].name === "עבודה ולימודים", "the cloud payload carries the new name");
    assert(sent.items[e1].topic === topic && sent.items[e1].text === "פסקה ראשונה", "the cloud payload keeps the entry text and topic id");
    assert(sent.items[e2].topic === topic && sent.items[e3].topic === other && sent.items[other].name === "בריאות", "the cloud payload keeps every other item");
    assert(idsOf(sent.items, "topic").length === 2, "the upload still has two topics");
    var remote = clone(cloud.value);
    remote.items[e1].text = "נערך במכשיר אחר";
    remote.items[e1].at = remote.items[e1].at + 8000;
    remote.items[e1]._f = remote.items[e1]._f || { topic: snap.e1.at, text: snap.e1.at, day: snap.e1.at, kind: snap.e1.at, created: snap.e1.at };
    remote.items[e1]._f.text = remote.items[e1].at;
    remote.items[e1]._f["~"] = remote.items[e1].at;
    remote.items[topic].name = "שם ישן";
    remote.items[topic]._f.name = 1;
    remote.items.e4 = { id: "e4", kind: "entry", text: "רשומה מהמכשיר האחר", topic: topic, day: "2026-11-04", created: 4, at: 4 };
    cloud.value = remote;
    return S.sync();
  }).then(function () {
    assert(S.get(topic).name === "עבודה ולימודים", "an older cloud name does not undo the rename");
    assert(S.get(e1).text === "נערך במכשיר אחר" && S.get(e1).topic === topic, "a newer edit of the entry text is kept, still on this topic");
    assert(S.get(e2).text === "פסקה שנייה" && S.get("e4").text === "רשומה מהמכשיר האחר" && S.get("e4").topic === topic, "both the local entry and the other device's entry stay on the topic");
    assert(S.list("topic").length === 2 && S.get(other).name === "בריאות", "the merge does not duplicate or drop a topic");
    assert(box.getItem("rg-myjournal-v1:user1") === liveDoc, "a merge does not touch the live journal key");
    assert(ctx.calls.length > 0 && ctx.calls.every(function (c) { return c === "get sbxjournal items" || c === "set sbxjournal items"; }), "topic sync talks only to the sandbox items row");
  });
}).then(function () {
  var dir = __dirname;
  var app = fs.readFileSync(path.join(dir, "app.js"), "utf8");
  var html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  var sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8");
  var str = fs.readFileSync(path.join(dir, "strings.js"), "utf8");
  var live = fs.readFileSync(path.join(dir, "../journal/app.js"), "utf8");
  var block = app.slice(app.indexOf('kind === "r"'), app.indexOf('panels.addEventListener("click"'));
  assert(app.indexOf("prompt(") === -1, "sandbox rename does not use a browser prompt");
  assert(block.indexOf("planRename") !== -1 && block.indexOf("S.upd(rid, { name: plan.name })") !== -1, "rename updates the same topic");
  assert(block.indexOf("S.add") === -1 && block.indexOf("S.del") === -1, "rename does not add or delete an item");
  assert(app.indexOf('code: "empty"') !== -1 && app.indexOf('code: "same"') !== -1 && app.indexOf('code: "exists"') !== -1, "empty, unchanged, and duplicate names are decided before any write");
  assert(app.indexOf('data-a="cancelRen"') !== -1 && app.indexOf('data-a="ren"') !== -1, "rename can be opened and cancelled");
  assert(str.indexOf('"renameBtn": "שינוי שם"') !== -1 && str.indexOf('"renameBtn": "Rename"') !== -1, "the rename control has a Hebrew and an English name");
  assert(str.indexOf("שם הנושא ריק") !== -1 && str.indexOf("The topic name is empty") !== -1, "an empty name tells the user the old name stays");
  assert(html.indexOf("strings.js?v=2") !== -1 && html.indexOf("app.js?v=2") !== -1, "the page cache-busts the changed scripts");
  assert(sw.indexOf('CACHE = "rg-sbx-journal-v2"') !== -1 && sw.indexOf("strings.js?v=2") !== -1 && sw.indexOf("app.js?v=2") !== -1, "the sandbox service worker cache is v2");
  assert(sw.indexOf("rg-store.js?v=1") !== -1 && sw.indexOf("bookmarks.js?v=1") !== -1, "unchanged sandbox scripts keep their query");
  assert(html.indexOf("min-height: 44px") !== -1, "the rename controls ask for a 44px target");
  assert(live.indexOf('RGStore("myjournal"') !== -1 && live.indexOf("prompt(") !== -1, "the live journal file still has its own prompt rename");
  var diff = child.execSync("git diff --name-only -- my/journal shared my/apps.js index.html sw.js auth yomanli yomanli-sandbox", { cwd: path.join(dir, "../.."), encoding: "utf8" });
  assert(diff.trim() === "", "live journal, public journal, shared files, and the root shell are unchanged");
  if (failed) { console.error(failed + " failed"); process.exit(1); }
  console.log("all journal sandbox rename checks passed");
}).catch(function (e) {
  console.error(e);
  process.exit(1);
});
