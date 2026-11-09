/* Oracle for AlarmMath: expected timestamps from clockify-sandbox/alarm-core.js.
   TZ is the process timezone. Run under the same TZ as the Java checker.
   node clockify-android/tools/expected-schedule.js > /tmp/clockify-expected.json */
"use strict";
var C = require("../../clockify-sandbox/alarm-core.js");

function stamp(d) { return d ? d.getTime() : null; }
function add(cases, name, alarm, now) {
  var n = C.nextOccurrence(alarm, now);
  var l = C.lastOccurrence(alarm, now);
  var due = C.dueAlarms([Object.assign({}, alarm, { days: alarm.days ? alarm.days.slice() : alarm.days })], now);
  cases.push({
    name: name,
    now: now.getTime(),
    alarm: {
      id: alarm.id || "a",
      time: alarm.time || "",
      type: alarm.type || "",
      date: alarm.date || "",
      enabled: !!alarm.enabled,
      lastFired: alarm.lastFired || "",
      created: alarm.created || 0,
      days: alarm.days || [],
      sound: alarm.sound || "",
      vibrate: alarm.vibrate || "",
      cat: alarm.cat || ""
    },
    next: stamp(n),
    last: stamp(l),
    due: due.length ? due[0].key : null,
    sound: C.soundFor(alarm, [
      { id: "c-travel", sound: "rising" },
      { id: "c-practice", sound: "marimba" },
      { id: "c-care", sound: "piano" }
    ], "chime")
  });
}

var cases = [];
var sun = new Date(2026, 10, 8, 16, 0, 0);
add(cases, "daily next day", { enabled: true, time: "07:30", type: "daily" }, sun);
add(cases, "weekly wednesday", { enabled: true, time: "09:00", type: "weekly", days: [3] }, sun);
add(cases, "daily mon wed", { enabled: true, time: "08:00", type: "daily", days: [1, 3] }, sun);
add(cases, "weekly due", { id: "w", enabled: true, time: "09:00", type: "weekly", days: [3], created: 0, lastFired: "" }, new Date(2026, 10, 11, 9, 10, 0));
add(cases, "weekly not sunday", { id: "w", enabled: true, time: "09:00", type: "weekly", days: [3], created: 0, lastFired: "" }, sun);
add(cases, "d28 ahead", { enabled: true, time: "09:00", type: "d28", date: "2026-01-01" }, new Date(2026, 0, 1, 8, 0, 0));
add(cases, "d28 after", { enabled: true, time: "09:00", type: "d28", date: "2026-01-01" }, new Date(2026, 0, 1, 10, 0, 0));
add(cases, "d28 last", { enabled: true, time: "09:00", type: "d28", date: "2026-01-01" }, new Date(2026, 0, 20, 12, 0, 0));
add(cases, "monthly short", { enabled: true, time: "09:00", type: "monthly", date: "2026-01-31" }, new Date(2026, 1, 1, 12, 0, 0));
add(cases, "monthly next full", { enabled: true, time: "09:00", type: "monthly", date: "2026-01-31" }, new Date(2026, 2, 1, 12, 0, 0));
add(cases, "yearly short", { enabled: true, time: "09:00", type: "yearly", date: "2024-02-29" }, new Date(2025, 0, 1, 12, 0, 0));
add(cases, "yearly leap", { enabled: true, time: "09:00", type: "yearly", date: "2024-02-29" }, new Date(2028, 0, 1, 12, 0, 0));
add(cases, "every 5 years", { enabled: true, time: "12:00", type: "y5", date: "2020-06-01" }, sun);
add(cases, "decade", { enabled: true, time: "12:00", type: "decade", date: "2020-06-01" }, sun);
add(cases, "disabled", { enabled: false, time: "09:00", type: "monthly", date: "2026-12-01" }, sun);
add(cases, "once future", { enabled: true, time: "11:00", type: "once", date: "2026-11-20" }, sun);
add(cases, "once past", { enabled: true, time: "11:00", type: "once", date: "2026-11-01" }, sun);
add(cases, "silent category", { enabled: true, time: "10:00", type: "daily", sound: "none", cat: "c-travel" }, sun);
add(cases, "alarm sound wins", { enabled: true, time: "10:00", type: "daily", sound: "bell", cat: "c-travel" }, sun);
add(cases, "category sound", { enabled: true, time: "10:00", type: "daily", sound: "", cat: "c-practice" }, sun);
add(cases, "default sound", { enabled: true, time: "10:00", type: "daily", cat: "" }, sun);
add(cases, "catch-up inside", { id: "c", enabled: true, time: "16:00", type: "daily", created: 0, lastFired: "" }, new Date(2026, 10, 8, 16, 20, 0));
add(cases, "catch-up outside", { id: "c", enabled: true, time: "12:00", type: "daily", created: 0, lastFired: "" }, new Date(2026, 10, 8, 16, 20, 0));
add(cases, "already fired", { id: "c", enabled: true, time: "16:00", type: "daily", created: 0, lastFired: "2026-11-08 16:00" }, new Date(2026, 10, 8, 16, 10, 0));
add(cases, "created after", { id: "c", enabled: true, time: "16:00", type: "daily", created: new Date(2026, 10, 8, 16, 5, 0).getTime(), lastFired: "" }, new Date(2026, 10, 8, 16, 10, 0));
add(cases, "empty weekdays", { enabled: true, time: "06:00", type: "weekly", days: [] }, sun);
add(cases, "exact now goes forward", { enabled: true, time: "16:00", type: "daily", days: [0] }, sun);

var types = ["once", "daily", "weekly", "d28", "monthly", "yearly", "y5", "decade"];
var base = new Date(2026, 5, 15, 13, 40, 0).getTime();
for (var i = 0; i < 80; i++) {
  var type = types[i % types.length];
  var day = 1 + (i * 3) % 28;
  var date = "2024-" + C.pad(1 + (i % 12)) + "-" + C.pad(day);
  var days = [];
  if (i % 2 === 0) days = [i % 7];
  else if (i % 5 === 0) days = [1, 3, 5];
  var now = new Date(base + i * 86400000 * 3 + (i % 11) * 3600000);
  add(cases, "rand " + i, {
    id: "r" + i,
    enabled: i % 7 !== 0,
    time: C.pad(i % 24) + ":" + C.pad((i * 7) % 60),
    type: type,
    date: date,
    days: days,
    created: i % 4 === 0 ? now.getTime() - 1000 : 0,
    lastFired: "",
    sound: i % 9 === 0 ? "none" : "",
    cat: i % 3 === 0 ? "c-care" : ""
  }, now);
}

process.stdout.write(JSON.stringify({ cases: cases }));
