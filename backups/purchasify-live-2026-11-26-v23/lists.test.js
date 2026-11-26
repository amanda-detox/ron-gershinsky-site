/* Purchasify: old categories are lists inside one category, and no item is dropped or copied.
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
var builtins = [{ cat: "main", pos: 0, name: "קניות" }, { cat: "tea", pos: 1, name: "תה" }];
var beforeI = JSON.stringify(items);
var beforeC = JSON.stringify(cats);
var placed = L.place(items, cats, builtins, "רשימה 1");
assert(placed.count === 4, "four live items are placed and the tombstone is not");
assert(placed.byCat[L.HOME].lists.main.length === 2, "items of the old main category sit in that list under קניות");
assert(placed.byCat[L.HOME].lists.main[0].id !== placed.byCat[L.HOME].lists.main[1].id, "those two items are not the same row");
assert(placed.byCat[L.HOME].lists.tea.length === 1 && placed.byCat[L.HOME].lists.tea[0].id === "c", "a tea item with no grp stays on the תה list");
assert(placed.byCat[L.HOME].lists.g2 && placed.byCat[L.HOME].lists.g2.length === 1 && placed.byCat[L.HOME].lists.g2[0].id === "d", "an item with a saved grp stays on that list only");
var seen = {}, homeLists = placed.byCat[L.HOME].lists, lk, li;
for (lk in homeLists) for (li = 0; li < homeLists[lk].length; li++) {
  assert(!seen[homeLists[lk][li].id], "item " + homeLists[lk][li].id + " is not placed twice");
  seen[homeLists[lk][li].id] = 1;
}
assert(JSON.stringify(items) === beforeI && JSON.stringify(cats) === beforeC, "placing lists does not write the items or the categories");

var catsView = L.categories(cats, "קניות");
assert(catsView.length === 1 && catsView[0].id === L.HOME && catsView[0].name === "קניות", "old categories collapse into one category named קניות");
var named = L.listsFor(cats, L.HOME, builtins, "רשימה 1");
assert(named.map(function (l) { return l.name; }).join(",") === "קניות,תה,בוקר", "list names stay the old category names, in order, plus a saved extra list");
assert(named.every(function (l) { return l.name !== "קניות" || l.id === "main"; }), "the home category does not grow a second list that copies its name");
var dated = {
  "c:a1": { id: "c:a1", type: "cat", cat: "a1", name: "11.26", pos: 3, at: 4 }
};
var datedLists = L.listsFor(dated, L.HOME, [{ cat: "main", pos: 0, name: "קניות", gone: true }], "רשימה 1");
assert(datedLists.length === 1 && datedLists[0].id === "a1" && datedLists[0].name === "11.26", "a renamed old category is the list, and the dropdowns are not both that name");
assert(L.categories(dated, "קניות")[0].name === "קניות" && L.categories(dated, "קניות").length === 1, "the category side of that screen is קניות");
var fresh = L.listsFor({ "c:new": { id: "c:new", type: "cat", cat: "new", name: "מתנות", real: 1, pos: 1, at: 5 } }, "new", builtins, "רשימה 1");
assert(fresh.length === 1 && fresh[0].virtual && fresh[0].name === "רשימה 1", "a new category starts with רשימה 1, not a copy of its name");
assert(L.categories({ "c:new": { id: "c:new", type: "cat", cat: "new", name: "מתנות", real: 1, pos: 1, at: 5 } }, "קניות").some(function (c) { return c.id === "new" && c.name === "מתנות"; }), "a real:1 category stays a category");
assert(L.fmtSum(4.9) === "4.90 \u20aa" && L.fmtSum(12) === "12.00 \u20aa" && L.fmtSum(1600) === "1600.00 \u20aa" && L.fmtSum(4.9).indexOf(".") > 0, "sums keep a decimal point before the shekel sign");
assert(L.viewOf({ id: "z", text: "זר", grp: "missing" }, cats, builtins, "רשימה 1").list === "main", "an unknown grp still shows once, on the old category list");

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

var catOnly = L.listsFor(cats, L.HOME, builtins, "רשימה 1");
assert(catOnly.length >= 2 && cats["g:d:tea"] == null && JSON.stringify(cats) === beforeC, "reading lists does not create a record");

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
