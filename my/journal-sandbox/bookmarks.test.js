/* Sandbox bookmarks must not mutate journal entries, and old entries stay unsaved.
   Run: node my/journal-sandbox/bookmarks.test.js */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var child = require("child_process");
var BM = require("./bookmarks.js");
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
function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

var entry = Object.freeze({
  id: "oldentry1", kind: "entry", text: "רשומה ישנה בלי סימניה", topic: "t1",
  day: "2020-01-01", created: 10, at: 10
});
var entrySnap = JSON.stringify(entry);
var mem = memory();
var liveDoc = JSON.stringify({
  items: { liveentry1: { id: "liveentry1", kind: "entry", text: "LIVE TEXT", topic: "t1", day: "2024-05-01", created: 4, at: 4 } },
  pending: false
});
mem.setItem("rg-myjournal-v1:user1", liveDoc);
mem.setItem("rg-sbx-journal-bookmarks", JSON.stringify({
  v: 1,
  users: { user2: { v: 1, ids: { otherid1: 20 }, gone: {} } }
}));

var uid = "user1";
var gets = [], sets = [];
var B = BM.create({
  auto: false,
  storage: mem,
  uid: function () { return uid; },
  cloudGet: function (app, key) {
    gets.push([app, key]);
    if (app !== "sbxjournal" || key !== "journal-bookmarks") throw new Error("unexpected bookmark read " + app + "/" + key);
    return Promise.resolve(null);
  },
  cloudSet: function (app, key, value) {
    sets.push({ app: app, key: key, value: value });
    if (app !== "sbxjournal" || key !== "journal-bookmarks") throw new Error("unexpected bookmark write " + app + "/" + key);
    return Promise.resolve(value);
  }
});

assert(BM.KEY === "rg-sbx-journal-bookmarks", "bookmarks use the separate local key");
assert(BM.CLOUD_APP === "sbxjournal" && BM.CLOUD_KEY === "journal-bookmarks", "bookmarks use their own cloud row");
assert(B.isSaved(entry.id) === false, "an old entry with no bookmark record is not saved");
assert(B.isSaved("missing99") === false, "an unknown id is not saved");
assert(B.toggle(entry) === false, "a toggle refuses an entry object");
assert(JSON.stringify(entry) === entrySnap, "refusing an object does not mutate it");
assert(mem.getItem("rg-myjournal-v1:user1") === liveDoc, "refusing an object does not touch the live journal key");

assert(B.toggle(entry.id) === true, "toggle saves by id");
assert(B.isSaved(entry.id) === true, "the id is saved after toggle");
assert(JSON.stringify(entry) === entrySnap, "toggling does not mutate the entry object");
assert(!("saved" in entry) && !("important" in entry), "the entry gains no saved field");
assert(mem.getItem("rg-myjournal-v1:user1") === liveDoc, "toggling does not touch the live journal key");
var bag = JSON.parse(mem.getItem("rg-sbx-journal-bookmarks"));
assert(bag.users.user1.ids.oldentry1 > 0, "the saved id is stored in the bookmark key");
assert(JSON.stringify(bag).indexOf("רשומה") === -1, "the bookmark key does not copy entry text");
assert(bag.users.user2.ids.otherid1 === 20, "another user's bookmarks stay as they were");

assert(B.toggle(entry.id) === false && B.isSaved(entry.id) === false, "toggling again clears the id");
assert(JSON.stringify(entry) === entrySnap, "clearing a bookmark does not mutate the entry");
assert(mem.getItem("rg-myjournal-v1:user1") === liveDoc, "clearing a bookmark does not touch the live journal key");

assert(B.toggle("oldentry1") === true, "save the old entry again for the cloud check");

function runCloud() {
  return B.syncNow().then(function () {
    assert(gets.length === 1 && gets[0][0] === "sbxjournal" && gets[0][1] === "journal-bookmarks", "bookmark sync reads only the bookmark row");
    assert(sets.length === 1, "a toggle uploads the bookmark row once");
    assert(sets[0].app === "sbxjournal" && sets[0].key === "journal-bookmarks", "the upload is the bookmark row");
    assert(JSON.stringify(sets[0].value).indexOf("רשומה") === -1, "the uploaded bookmark row has no entry text");
    assert(sets[0].value.items == null && sets[0].value.entries == null, "the uploaded bookmark row has no entry map");
    assert(typeof sets[0].value.ids.oldentry1 === "number", "the uploaded row records the id");
    assert(JSON.stringify(entry) === entrySnap, "cloud sync does not mutate the entry");
    assert(mem.getItem("rg-myjournal-v1:user1") === liveDoc, "cloud sync does not touch the live journal key");
  }).then(function () {
    gets.length = 0; sets.length = 0;
    B = BM.create({
      auto: false,
      storage: memory(),
      uid: function () { return "user1"; },
      cloudGet: function () {
        return Promise.resolve({
          v: 1,
          ids: { fromcloud1: 50 },
          gone: {},
          items: { liveentry1: { text: "should never be copied" } }
        });
      },
      cloudSet: function () { throw new Error("pull must not write"); }
    });
    var old = { id: "fromcloud1", kind: "entry", text: "עוד רשומה ישנה", at: 3 };
    var oldSnap = JSON.stringify(old);
    assert(B.isSaved("fromcloud1") === false, "before the pull, a cloud id is not saved locally");
    return B.syncNow().then(function (pushed) {
      assert(pushed === false, "a pull of an existing bookmark row does not write when nothing local is newer");
      assert(B.isSaved("fromcloud1") === true, "a pulled id counts as saved");
      assert(B.isSaved("oldentry1") === false, "an old entry that is not in the bookmark row stays unsaved");
      assert(JSON.stringify(old) === oldSnap, "pulling bookmarks does not mutate an entry object");
    });
  });
}

function runStore() {
  var sandboxSeed = JSON.stringify({
    items: {
      oldentry1: { id: "oldentry1", kind: "entry", text: "רשומה ישנה בלי סימניה", topic: "t1", day: "2020-01-01", created: 10, at: 10 },
      t1: { id: "t1", kind: "topic", name: "יום יום", created: 9, at: 9 }
    },
    pending: false
  });
  var box = memory();
  box.setItem("rg-myjournal-v1:user1", liveDoc);
  box.setItem("rg-sbx-journal-v1:user1", sandboxSeed);
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
    CALLS: calls
  };
  g.window = g;
  g.RGAccount = {
    user: function () { return { id: "user1" }; },
    onChange: function () {},
    ready: Promise.resolve({ id: "user1" }),
    get: function (app, key) {
      calls.push("get " + app + " " + key);
      if (app !== "sbxjournal" || key !== "items") return Promise.reject(new Error("store read " + app + "/" + key));
      return Promise.resolve(null);
    },
    set: function (app, key) {
      calls.push("set " + app + " " + key);
      if (app !== "sbxjournal" || key !== "items") return Promise.reject(new Error("store write " + app + "/" + key));
      return Promise.reject(new Error("load must not write entries"));
    }
  };
  vm.createContext(g);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "rg-store.js"), "utf8"), g, { filename: "rg-store.js" });
  var threw = false;
  try { g.RGStore("sbxjournalx"); } catch (e) { threw = true; }
  assert(threw, "the sandbox store refuses any app other than its own");
  var S = g.RGStore("sbxjournal", { onChange: function () {}, onStatus: function () {} });
  var marks = BM.create({
    auto: false,
    storage: box,
    uid: function () { return S.uid(); },
    cloudGet: function () { return Promise.resolve(null); },
    cloudSet: function () { return Promise.resolve(null); }
  });
  return tick().then(tick).then(function () { return S.sync(); }).then(tick).then(function () {
    assert(box.getItem("rg-myjournal-v1:user1") === liveDoc, "opening the sandbox does not rewrite the live journal key");
    assert(box.getItem("rg-sbx-journal-v1:user1") === sandboxSeed, "opening the sandbox does not re-save its own entries when nothing changed");
    assert(calls.indexOf("set sbxjournal items") === -1, "opening the sandbox does not upload entries");
    assert(calls.indexOf("get sbxjournal items") !== -1, "the sandbox reads only its own items row");
    assert(marks.isSaved("oldentry1") === false, "a stored old entry loads as not saved");
    var loaded = S.get("oldentry1");
    var loadedSnap = JSON.stringify(loaded);
    assert(loaded.text === "רשומה ישנה בלי סימניה" && loaded.saved == null && loaded.important == null, "the loaded entry has no saved flag");
    marks.toggle("oldentry1");
    assert(JSON.stringify(S.get("oldentry1")) === loadedSnap, "toggling leaves the stored entry byte-for-byte the same");
    assert(JSON.stringify(loaded) === loadedSnap, "toggling leaves the in-memory entry object untouched");
    assert(box.getItem("rg-sbx-journal-v1:user1") === sandboxSeed, "toggling does not re-save the entry cache");
    assert(box.getItem("rg-myjournal-v1:user1") === liveDoc, "toggling does not rewrite the live journal key");
    assert(marks.isSaved("oldentry1") === true, "the old entry can be saved without changing it");
    var added = S.add({ kind: "entry", text: "חדשה", topic: "t1", day: "2026-11-09" });
    var fresh = S.get(added);
    assert(fresh.saved == null && fresh.important == null && fresh.text === "חדשה", "a new entry is not bookmarked and has no saved field");
    assert(box.getItem("rg-myjournal-v1:user1") === liveDoc, "adding a sandbox entry does not rewrite the live journal key");
  });
}

function scanSources() {
  var dir = __dirname;
  var app = fs.readFileSync(path.join(dir, "app.js"), "utf8");
  var store = fs.readFileSync(path.join(dir, "rg-store.js"), "utf8");
  var sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8");
  var html = fs.readFileSync(path.join(dir, "index.html"), "utf8");
  var marks = fs.readFileSync(path.join(dir, "bookmarks.js"), "utf8");
  var news = fs.readFileSync(path.join(dir, "../../news/app.js"), "utf8");
  var liveApp = fs.readFileSync(path.join(dir, "../journal/app.js"), "utf8");
  var liveStore = fs.readFileSync(path.join(dir, "../journal/rg-store.js"), "utf8");
  var glyph = "M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 0 1 1-1z";
  [app, store, sw, html, marks].forEach(function (src) {
    assert(src.indexOf("myjournal") === -1, "sandbox source does not name the live journal app");
    assert(src.indexOf("rg-myjournal") === -1, "sandbox source does not use the live journal storage key");
  });
  assert(app.indexOf(glyph) !== -1 && news.indexOf(glyph) !== -1, "the bookmark glyph matches Updatify");
  assert(app.indexOf('RGStore("sbxjournal"') !== -1, "the sandbox opens its own store");
  assert(liveApp.indexOf('RGStore("myjournal"') !== -1, "the live journal still opens myjournal");
  assert(liveApp.indexOf("rg-sbx-journal") === -1 && liveStore.indexOf("rg-sbx-journal") === -1, "the live journal does not use sandbox keys");
  var markAt = app.indexOf('else if (a === "mark")');
  var editAt = app.indexOf('else if (a === "edit")');
  var markBlock = app.slice(markAt, editAt);
  assert(markAt > 0 && markBlock.indexOf("B.toggle") !== -1, "the bookmark button toggles the bookmark list");
  assert(markBlock.indexOf("S.upd") === -1 && markBlock.indexOf("S.add") === -1 && markBlock.indexOf("S.del") === -1, "the bookmark button does not write an entry");
  assert(html.indexOf("<title>Journalify</title>") !== -1, "the sandbox tab title is Journalify");
  assert(html.indexOf('lang="he"') !== -1 && html.indexOf('dir="rtl"') !== -1, "the sandbox page is Hebrew RTL");
  assert(sw.indexOf('indexOf("rg-sbx-journal-")') !== -1, "the sandbox service worker only deletes its own caches");
  assert(store.indexOf("rg-sbx-journal-v1:") !== -1, "entry cache uses the sandbox prefix");
  assert(store.indexOf("if (!cloud && !pending)") !== -1, "an idle open does not upload entries");
  var diff = child.execSync("git diff --name-only -- my/journal shared my/apps.js index.html sw.js auth", { cwd: path.join(dir, "../.."), encoding: "utf8" });
  assert(diff.trim() === "", "live journal, shared files, and root shell are unchanged");
}

runCloud().then(runStore).then(function () {
  scanSources();
  if (failed) { console.error(failed + " failed"); process.exit(1); }
  console.log("all journal sandbox bookmark checks passed");
}).catch(function (e) {
  console.error(e);
  process.exit(1);
});
