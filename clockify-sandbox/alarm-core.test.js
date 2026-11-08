/* Sandbox Clockify: categories, day groups, stars, and storage isolation.
   Run: node clockify-sandbox/alarm-core.test.js */
"use strict";
var fs = require("fs");
var path = require("path");
var C = require("./alarm-core.js");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL " + msg); failed++; }
  else console.log("ok " + msg);
}

var defs = C.defaultCategories();
assert(defs.length === 3, "three default categories");
assert(defs.map(function (c) { return c.name.he; }).join(",") === "נסיעות,תרגולים,טיפוח", "default Hebrew names");
assert(defs.every(function (c) { return c.builtin && c.sound; }), "defaults are built-in and each has a sound");
assert(defs.map(function (c) { return c.sound; }).filter(function (s, i, a) { return a.indexOf(s) === i; }).length === 3, "the three defaults use different sounds");

var demo = C.defaults(0);
assert(demo.length >= 3 && demo.length <= 6, "a few generic examples, not a long personal list");
assert(demo.every(function (a) { return a.title && a.title.he && a.title.en && typeof a.star === "boolean" && a.cat; }), "examples have both languages, a star flag, and a category");
assert(demo.some(function (a) { return a.star; }) && demo.some(function (a) { return !a.star; }), "examples include a starred alarm and an ordinary one");
assert(demo.some(function (a) { return a.type === "daily"; }) && demo.some(function (a) { return a.type === "once"; }), "examples include a daily alarm and a later one-time alarm");

var now = new Date(2026, 10, 8, 16, 37, 0);
var today = C.dateKey(now);
var tomorrow = C.dateKey(new Date(2026, 10, 9));
var later = C.dateKey(new Date(2026, 10, 11));
var old = { id: "old1", time: "08:15", type: "daily", date: "", enabled: true, title: { he: "שעון ישן", en: "Old alarm" } };
var migrated = C.normalizeAlarms([old, null, { time: "09:00", type: "once", date: tomorrow, title: { he: "בלי מזהה" } }]);
assert(migrated.alarms.length === 2, "broken entries drop out and real alarms stay");
assert(migrated.alarms[0].id === "old1" && migrated.alarms[0].star === false && migrated.alarms[0].cat === "" && migrated.alarms[0].title.he === "שעון ישן", "an old alarm gains star and category defaults and keeps its title");
assert(migrated.alarms[1].id && migrated.alarms[1].cat === "", "an alarm without an id is kept and given one");

var mixed = [
  { id: "d1", time: "22:00", type: "daily", date: "", cat: "c-care", star: false, enabled: true, title: { he: "לילה" } },
  { id: "d2", time: "07:30", type: "daily", date: "", cat: "c-travel", star: true, enabled: true, title: { he: "בוקר חשוב" } },
  { id: "d3", time: "18:30", type: "daily", date: "", cat: "c-practice", star: false, enabled: true, title: { he: "אחה״צ" } },
  { id: "o1", time: "09:00", type: "once", date: tomorrow, cat: "c-travel", star: false, enabled: true, title: { he: "מחר" } },
  { id: "o2", time: "11:00", type: "once", date: later, cat: "c-practice", star: true, enabled: true, title: { he: "עוד יום" } },
  { id: "past", time: "06:00", type: "once", date: "2026-11-01", cat: "c-care", star: false, enabled: false, title: { he: "עבר" } }
];
var groups = C.groupAlarms(mixed.concat(migrated.alarms), now);
assert(groups.map(function (g) { return g.key; }).join(",") === [today, tomorrow, later, "2026-11-01"].join(","), "today, then later days, then a past day");
assert(groups[0].today && groups[0].alarms.map(function (a) { return a.id; }).join(",") === "d2,d3,d1,old1", "today: starred first, then upcoming, then times that already passed");
assert(groups[1].alarms.some(function (a) { return a.id === "o1"; }) && groups[2].alarms[0].id === "o2" && groups[2].alarms[0].star, "other days stay in their own groups, starred still inside that day");
assert(groups[3].past && groups[3].alarms[0].id === "past", "a past one-time alarm is still listed");

var travel = C.filterAlarms(mixed, defs, "c-travel");
assert(travel.map(function (a) { return a.id; }).join(",") === "d2,o1", "filter keeps only the chosen category");
assert(C.filterAlarms(mixed, defs, "all").length === mixed.length, "all shows every alarm");
assert(C.filterAlarms(migrated.alarms, defs, "c-travel").length === 0, "an alarm with no category is not forced into a default");
assert(C.filterAlarms(mixed.concat(migrated.alarms), defs, "all").some(function (a) { return a.id === "old1"; }), "the old alarm still appears in All");

var cats = defs.map(function (c) { return Object.assign({}, c); });
var custom = C.addCategory(cats, "  בדיקה  ", "bell");
assert(custom && custom.name === "בדיקה" && custom.builtin === false && cats.length === 4, "a custom category can be added");
assert(C.renameCategory(cats, custom.id, "בדיקה 2") === true && custom.name === "בדיקה 2", "a custom category can be renamed");
assert(C.renameCategory(cats, "c-travel", "שם אחר") === false && cats[0].name.he === "נסיעות", "a built-in category is not renamed");
var blocked = C.removeCategory(mixed, cats, "c-travel");
assert(blocked.blocked && blocked.cats.length === 4 && mixed[1].cat === "c-travel", "a built-in category is not deleted and its alarms stay");
var gone = C.removeCategory([{ id: "x", cat: custom.id, star: true, title: { he: "נשאר" }, time: "10:00", type: "daily" }], cats, custom.id);
assert(!gone.blocked && gone.cats.every(function (c) { return c.id !== custom.id; }) && gone.alarms[0].cat === "" && gone.alarms[0].star === true && gone.alarms[0].title.he === "נשאר", "deleting a custom category keeps the alarm, clears only its category, and keeps the star");

var ensured = C.ensureCategories([{ id: "c-extra", name: "נוסף", sound: "chime" }]);
assert(ensured.cats[0].id === "c-extra" && defs.every(function (d) { return ensured.cats.some(function (c) { return c.id === d.id; }); }), "saved categories stay and missing defaults come back");
var same = C.ensureCategories(defs);
assert(same.changed === false && same.cats.length === 3, "defaults alone are not rewritten");

var root = path.join(__dirname);
var page = fs.readFileSync(path.join(root, "index.html"), "utf8");
var core = fs.readFileSync(path.join(root, "alarm-core.js"), "utf8");
var livePage = fs.readFileSync(path.join(root, "../clockify/index.html"), "utf8");
var liveCore = fs.readFileSync(path.join(root, "../clockify/alarm-core.js"), "utf8");
["rg-alarms-v1", "rg-alarm-snoozes-v1", "rg-alarm-cats-v1", "rg-alarm-defsound-v1", "rg-alarm-filter-v1", "rg-alarm-theme", "rg-alarm-bg", "rg-alarm-note-open", "rg-clock-alarms-v1"].forEach(function (k) {
  assert(page.indexOf(k) < 0, "sandbox page does not use live key " + k);
});
assert(page.indexOf("rg-sbx-clockify-alarms-v1") >= 0 && page.indexOf("rg-sbx-clockify-cats-v1") >= 0, "sandbox has its own alarm and category keys");
assert(page.indexOf("<title>Clockify</title>") >= 0 && page.indexOf('document.title = "Clockify"') >= 0, "the browser tab title stays Clockify");
assert(core.indexOf("נסיעות") >= 0 && core.indexOf("תרגולים") >= 0 && core.indexOf("טיפוח") >= 0, "sandbox defaults name the three categories");
assert(liveCore.indexOf("נסיעות") < 0 && liveCore.indexOf("בוקר") >= 0 && liveCore.indexOf("groupAlarms") < 0, "live alarm logic was not changed");
assert(livePage.indexOf("rg-alarms-v1") >= 0 && livePage.indexOf("rg-sbx-clockify") < 0 && livePage.indexOf('class="chips"') >= 0, "live Clockify page and its chip filter were not changed");
assert(page.indexOf('class="chips"') < 0 && page.indexOf('id="picker"') >= 0, "the sandbox uses the dropdown instead of the swipe chips");

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("all passed");
