/* Purchasify lists: missing grp is the default list, and no item is dropped or copied.
   Run: node my/shopping/lists.test.js */
"use strict";
var L = require("./lists.js");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL " + msg); failed++; }
  else console.log("ok " + msg);
}

var cats = {
  "c:main": { id: "c:main", type: "cat", cat: "main", name: "קניות", pos: 0, at: 1 },
  "c:tea": { id: "c:tea", type: "cat", cat: "tea", name: "תה", pos: 1, at: 2 },
  "g:g2": { id: "g:g2", type: "grp", cat: "tea", grp: "g2", name: "בוקר", pos: 1, at: 2 }
};
var items = {
  a: { id: "a", text: "חלב", list: "main", at: 3 },
  b: { id: "b", text: "לחם", at: 4 },
  c: { id: "c", text: "ארל גריי", list: "tea", price: 12, mark: "ok", at: 5 },
  d: { id: "d", text: "נס", list: "tea", grp: "g2", price: 8, at: 6 },
  gone: { id: "gone", text: "נמחק", list: "main", deleted: true, at: 7 }
};
var beforeI = JSON.stringify(items);
var beforeC = JSON.stringify(cats);
var placed = L.place(items, cats, function (cid) { return cid === "tea" ? "תה" : "קניות"; });
assert(placed.count === 4, "four live items are placed and the tombstone is not");
assert(placed.byCat.main.lists[L.defaultId("main")].length === 2, "items with no grp sit in the category's default list");
assert(placed.byCat.main.lists[L.defaultId("main")][0].id !== placed.byCat.main.lists[L.defaultId("main")][1].id, "those two items are not the same row");
assert(placed.byCat.tea.lists[L.defaultId("tea")].length === 1 && placed.byCat.tea.lists[L.defaultId("tea")][0].id === "c", "a tea item with no grp stays in תה");
assert(placed.byCat.tea.lists.g2 && placed.byCat.tea.lists.g2.length === 1 && placed.byCat.tea.lists.g2[0].id === "d", "an item with a saved grp stays on that list only");
var seen = {};
["main", "tea"].forEach(function (cid) {
  var lists = placed.byCat[cid].lists, k, i;
  for (k in lists) for (i = 0; i < lists[k].length; i++) {
    assert(!seen[lists[k][i].id], "item " + lists[k][i].id + " is not placed twice");
    seen[lists[k][i].id] = 1;
  }
});
assert(JSON.stringify(items) === beforeI && JSON.stringify(cats) === beforeC, "placing lists does not write the items or the categories");

var named = L.listsFor(cats, "main", "קניות");
assert(named.length === 1 && named[0].virtual && named[0].id === "d:main" && named[0].name === "קניות", "the first list is virtual and named after the category");
var withRec = L.listsFor({
  "g:d:main": { id: "g:d:main", type: "grp", cat: "main", grp: "d:main", name: "שבוע", pos: 1, at: 9 },
  "g:x": { id: "g:x", type: "grp", cat: "main", grp: "x", name: "שישי", pos: 0, at: 8 }
}, "main", "קניות");
assert(withRec[0].id === "x" && withRec[1].id === "d:main" && withRec[1].virtual === false, "saved lists keep their order and the default is no longer virtual");
var hidden = L.listsFor({
  "g:d:main": { id: "g:d:main", type: "grp", cat: "main", grp: "d:main", gone: 1, at: 9 },
  "g:x": { id: "g:x", type: "grp", cat: "main", grp: "x", name: "שישי", pos: 0, at: 8 }
}, "main", "קניות");
assert(hidden.length === 1 && hidden[0].id === "x", "a gone default list is not invented again");
assert(L.grpOf({ id: "b", text: "לחם" }, hidden) === "x", "an item with no grp shows on the remaining list when the default is gone");
assert(L.grpOf({ id: "z", text: "זר", grp: "missing" }, withRec) === withRec[0].id, "an unknown grp still shows, on the first list");

var sums = L.totals([
  { id: "1", price: 10, mark: "ok" },
  { id: "2", price: 5 },
  { id: "3" }
], false);
assert(sums.all === 3 && sums.sel === 1 && sums.unsel === 2, "the three counts add up");
assert(sums.anyPrice && sums.priceAll === 15 && sums.priceSel === 10 && sums.priceUnsel === 5, "price sums follow the same split");
var bare = L.totals([{ id: "1" }, { id: "2", mark: "ok" }], false);
assert(bare.anyPrice === false && bare.all === 2 && bare.sel === 1 && bare.unsel === 1, "with no prices the counts still split");
assert(L.isSelected({ mark: "ok" }, false) && L.isSelected({ ck: true }, true) && !L.isSelected({ ck: true }, false), "selected means the gold mark, or a check only in a checklist");

var catOnly = L.listsFor(cats, "tea", "תה");
assert(catOnly.length === 2 && catOnly.some(function (l) { return l.virtual && l.id === "d:tea"; }) && cats["g:d:tea"] == null, "reading lists does not create a record for the default list");

var R = require("./restore.js");
function memory() {
  var map = {};
  return { map: map, getItem: function (k) { return map[k] == null ? null : map[k]; }, setItem: function (k, v) { map[k] = String(v); }, removeItem: function (k) { delete map[k]; } };
}
var mem = memory();
mem.setItem("rg-sbx-shopping:abc", "{\"no\":1}");
var staged = R.stage({ storage: mem, uid: "abc", currentItems: { old: { id: "old", text: "keep", at: 1 } }, currentCats: {}, nextItems: { a: { id: "a", text: "file", at: 2 } }, nextCats: {}, now: 9 });
assert(staged.ok && staged.writes.every(function (w) { return w.key.indexOf("rg-my-shopping") === 0 && w.key.indexOf("rg-sbx-shopping") === -1; }), "a live restore plans only live keys");
assert(R.commit(mem, staged).ok === true && mem.getItem("rg-sbx-shopping:abc") === "{\"no\":1}", "committing a live restore does not touch the sandbox key");
assert(R.commit(mem, { ok: true, writes: [{ key: "rg-sbx-shopping:abc", json: "{}" }] }).ok === false, "a sandbox key is refused");

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("all purchasify list checks passed");
