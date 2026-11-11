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
assert(migrated.alarms[0].type === "daily" && migrated.alarms[0].days.join(",") === "0,1,2,3,4,5,6" && migrated.alarms[0].vibrate === "short" && migrated.alarms[0].sound === "" && migrated.alarms[0].enabled === true, "an old daily alarm keeps ringing every day, stays on, and gains sound and vibration defaults");
assert(migrated.alarms[1].id && migrated.alarms[1].cat === "", "an alarm without an id is kept and given one");
assert(migrated.alarms[1].type === "once" && migrated.alarms[1].date === tomorrow && migrated.alarms[1].vibrate === "short", "a one-time alarm keeps its date and gains a vibration default");
var again = C.normalizeAlarms(migrated.alarms);
assert(again.changed === false && again.alarms[0].title.he === "שעון ישן" && again.alarms.length === 2, "normalizing again does not rewrite or drop alarms");
var explicit = C.normalizeAlarms([{ id: "keep", time: "10:00", type: "weekly", days: [1, 4], date: "", enabled: true, star: true, cat: "c-care", sound: "none", vibrate: "long", title: { he: "נשאר כמו שהוא", en: "Stays" } }]);
assert(explicit.changed === false && explicit.alarms[0].sound === "none" && explicit.alarms[0].vibrate === "long" && explicit.alarms[0].days.join(",") === "1,4" && explicit.alarms[0].title.he === "נשאר כמו שהוא", "a saved schedule, silent sound, and long vibration are kept");

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

assert(C.soundFor({ sound: "none", cat: "c-travel" }, defs, "chime") === "none", "an alarm can be silent even when its category has a sound");
assert(C.soundFor({ sound: "bell", cat: "c-travel" }, defs, "chime") === "bell", "an alarm sound overrides the category sound");
assert(C.soundFor({ sound: "", cat: "c-practice" }, defs, "chime") === "marimba", "a missing alarm sound still uses the category sound");
assert(C.soundFor({ cat: "" }, defs, "gong") === "gong", "no category and no alarm sound uses the default");

var sun = new Date(2026, 10, 8, 16, 0, 0);
assert(sun.getDay() === 0, "the schedule fixture is a Sunday");
var dailyNext = C.nextOccurrence({ enabled: true, time: "07:30", type: "daily" }, sun);
assert(C.dateKey(dailyNext) === "2026-11-09" && dailyNext.getHours() === 7, "a daily alarm with no weekday list still rings the next day");
var wed = C.nextOccurrence({ enabled: true, time: "09:00", type: "weekly", days: [3] }, sun);
assert(C.dateKey(wed) === "2026-11-11" && wed.getDay() === 3, "weekly rings on the chosen weekday");
var mon = C.nextOccurrence({ enabled: true, time: "08:00", type: "daily", days: [1, 3] }, sun);
assert(C.dateKey(mon) === "2026-11-09" && mon.getDay() === 1, "daily can be limited to chosen weekdays");
assert(C.alarmDay({ type: "weekly", time: "09:00", days: [3] }, sun) === "2026-11-11", "a weekly alarm is grouped on its next weekday");
assert(C.alarmDay({ type: "daily", time: "07:30" }, sun) === "2026-11-08", "an everyday alarm stays on today");
var dueWed = C.dueAlarms([{ id: "w", enabled: true, time: "09:00", type: "weekly", days: [3], created: 0, lastFired: "" }], new Date(2026, 10, 11, 9, 10, 0));
assert(dueWed.length === 1 && dueWed[0].alarm.id === "w", "a weekly alarm is due on its weekday");
assert(C.dueAlarms([{ id: "w", enabled: true, time: "09:00", type: "weekly", days: [3], created: 0, lastFired: "" }], sun).length === 0, "a Wednesday alarm does not ring on Sunday");
var weeklyFired = { id: "w", enabled: true, type: "weekly", time: "09:00" };
C.markFired(weeklyFired, "2026-11-11 09:00");
assert(weeklyFired.enabled === true && weeklyFired.lastFired === "2026-11-11 09:00", "a weekly alarm stays on after it rings");

assert(C.dateKey(C.nextOccurrence({ enabled: true, time: "09:00", type: "d28", date: "2026-01-01" }, new Date(2026, 0, 1, 8, 0, 0))) === "2026-01-01", "a 28-day alarm uses its start when that time is still ahead");
assert(C.dateKey(C.nextOccurrence({ enabled: true, time: "09:00", type: "d28", date: "2026-01-01" }, new Date(2026, 0, 1, 10, 0, 0))) === "2026-01-29", "28 days after the start is the next ring");
assert(C.dateKey(C.lastOccurrence({ time: "09:00", type: "d28", date: "2026-01-01" }, new Date(2026, 0, 20, 12, 0, 0))) === "2026-01-01", "the latest 28-day ring on or before today is kept");
assert(C.dateKey(C.nextOccurrence({ enabled: true, time: "09:00", type: "monthly", date: "2026-01-31" }, new Date(2026, 1, 1, 12, 0, 0))) === "2026-02-28", "a monthly alarm uses the last day when the month is shorter");
assert(C.dateKey(C.nextOccurrence({ enabled: true, time: "09:00", type: "monthly", date: "2026-01-31" }, new Date(2026, 2, 1, 12, 0, 0))) === "2026-03-31", "the next month uses the original day again");
assert(C.dateKey(C.nextOccurrence({ enabled: true, time: "09:00", type: "yearly", date: "2024-02-29" }, new Date(2025, 0, 1, 12, 0, 0))) === "2025-02-28", "a yearly leap-day alarm lands on Feb 28 in a short year");
assert(C.dateKey(C.nextOccurrence({ enabled: true, time: "09:00", type: "yearly", date: "2024-02-29" }, new Date(2028, 0, 1, 12, 0, 0))) === "2028-02-29", "a yearly leap-day alarm returns on the next leap day");
assert(C.dateKey(C.nextOccurrence({ enabled: true, time: "12:00", type: "y5", date: "2020-06-01" }, sun)) === "2030-06-01", "every 5 years steps from the start date");
assert(C.dateKey(C.nextOccurrence({ enabled: true, time: "12:00", type: "decade", date: "2020-06-01" }, sun)) === "2030-06-01", "a decade alarm steps 10 years from the start date");
assert(C.nextOccurrence({ enabled: false, time: "09:00", type: "monthly", date: "2026-12-01" }, sun) === null, "a disabled alarm has no next ring");
assert(C.dateKey(C.nextOccurrence({ enabled: true, time: "11:00", type: "once", date: "2026-11-20" }, sun)) === "2026-11-20", "a future one-time alarm keeps its date");
assert(C.nextOccurrence({ enabled: true, time: "11:00", type: "once", date: "2026-11-01" }, sun) === null, "a past one-time alarm does not return");

var Ics = require("./ics.js");
function ruleOf(alarm) {
  var text = Ics.build([alarm], { now: sun }).text;
  var vevent = text.split("BEGIN:VEVENT")[1] || "";
  var m = vevent.match(/RRULE:[^\r\n]+/);
  return m ? m[0] : "";
}
assert(ruleOf({ id: "d", enabled: true, time: "09:00", type: "daily", title: { he: "a" } }) === "RRULE:FREQ=DAILY", "a daily alarm is still exported as daily");
assert(ruleOf({ id: "w", enabled: true, time: "09:00", type: "weekly", days: [1, 3], title: { he: "a" } }) === "RRULE:FREQ=WEEKLY;BYDAY=MO,WE", "weekly days are exported");
assert(ruleOf({ id: "d28", enabled: true, time: "09:00", type: "d28", date: "2026-01-01", title: { he: "a" } }) === "RRULE:FREQ=DAILY;INTERVAL=28", "28 days exports as an interval");
assert(ruleOf({ id: "mo", enabled: true, time: "09:00", type: "monthly", date: "2026-01-31", title: { he: "a" } }) === "RRULE:FREQ=MONTHLY", "monthly exports as monthly");
assert(Ics.build([{ id: "mo", enabled: true, time: "09:00", type: "monthly", date: "2026-01-31", title: { he: "a" } }], { now: sun }).text.indexOf("DTSTART;TZID=Asia/Jerusalem:20260131T090000") >= 0, "a dated repeat starts on its chosen date");
assert(ruleOf({ id: "y", enabled: true, time: "09:00", type: "yearly", date: "2024-02-29", title: { he: "a" } }) === "RRULE:FREQ=YEARLY", "yearly exports as yearly");
assert(ruleOf({ id: "y5", enabled: true, time: "09:00", type: "y5", date: "2020-06-01", title: { he: "a" } }) === "RRULE:FREQ=YEARLY;INTERVAL=5", "5 years exports with an interval");
assert(ruleOf({ id: "dec", enabled: true, time: "09:00", type: "decade", date: "2020-06-01", title: { he: "a" } }) === "RRULE:FREQ=YEARLY;INTERVAL=10", "a decade exports as every 10 years");

["יומי", "שבועי", "28 יום", "חודשי", "שנתי", "5 שנים", "כל עשור", "ללא צליל", "קצרים", "ארוכים", "רציף"].forEach(function (word) {
  assert(page.indexOf(word) >= 0, "sandbox page contains " + word);
});
assert(page.indexOf('id="type-seg"') >= 0 && page.indexOf('id="days-seg"') >= 0 && page.indexOf('id="sound-seg"') >= 0 && page.indexOf('id="vib-seg"') >= 0, "the editor has repeat, weekday, sound, and vibration controls");
assert(page.indexOf("alarm-core.js?v=2") >= 0 && page.indexOf("sounds.js?v=2") >= 0 && page.indexOf("ics.js?v=2") >= 0, "sandbox scripts are cache-busted");
var sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
var liveSw = fs.readFileSync(path.join(root, "../clockify/sw.js"), "utf8");
var mySw = fs.readFileSync(path.join(root, "../my/clock/sw.js"), "utf8");
assert(sw.indexOf('var CACHE = "rg-sbx-clockify-v2"') >= 0, "sandbox service worker cache was bumped");
assert(liveSw.indexOf('rg-clockify-v15') >= 0 && liveSw.indexOf("rg-sbx-clockify") < 0, "live Clockify service worker was not changed");
assert(mySw.indexOf('rg-myclock-v13') >= 0 && mySw.indexOf("ללא צליל") < 0, "my clock service worker was not changed");
assert(page.indexOf('vibNone: "ללא"') >= 0, "vibration can be turned off");
assert(page.indexOf("data-native-app") >= 0 && page.indexOf("ClockifyNative") >= 0 && page.indexOf("nextOccurrence") >= 0, "the sandbox page can hand nextOccurrence to the native app");
assert(page.indexOf('id="install-wrap"') >= 0 && page.indexOf('id="install-btn"') >= 0 && page.indexOf('id="note-title"') >= 0 && page.indexOf("חשוב לדעת") >= 0, "install button and good-to-know stay in the page for the browser");
assert(page.indexOf('html[data-native-app="1"] #install-wrap') >= 0 && page.indexOf('html[data-native-app="1"] #note') >= 0, "the native app hides install and the note section");
assert(livePage.indexOf("ClockifyNative") < 0 && livePage.indexOf("data-native-app") < 0, "live Clockify has no Android wrapper branch");
var myPage = fs.readFileSync(path.join(root, "../my/clock/index.html"), "utf8");
assert(myPage.indexOf("ClockifyNative") < 0 && myPage.indexOf("data-native-app") < 0, "my clock was not changed");

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("all passed");
