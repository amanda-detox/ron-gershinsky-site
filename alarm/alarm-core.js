/* Alarm logic shared by the page and the unit tests. No DOM here. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AlarmCore = factory();
})(this, function () {
  "use strict";
  var CATCH_UP_MS = 30 * 60 * 1000; // ring a missed alarm if the page woke up within 30 minutes of it

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function dateKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function parseTime(t) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) return null;
    return { h: h, m: mi };
  }
  function at(dayStr, time) {
    var p = parseTime(time), d = dayStr.split("-");
    return new Date(+d[0], +d[1] - 1, +d[2], p.h, p.m, 0, 0);
  }

  // Occurrence (Date) of an alarm on or before `now`, the most recent one; null if none.
  function lastOccurrence(alarm, now) {
    if (!parseTime(alarm.time)) return null;
    if (alarm.type === "once") {
      if (!alarm.date) return null;
      var o = at(alarm.date, alarm.time);
      return o <= now ? o : null;
    }
    var today = at(dateKey(now), alarm.time);
    if (today <= now) return today;
    var y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return at(dateKey(y), alarm.time);
  }

  // Next occurrence strictly after `now`; null if none (disabled or one-time in the past).
  function nextOccurrence(alarm, now) {
    if (!alarm.enabled || !parseTime(alarm.time)) return null;
    if (alarm.type === "once") {
      if (!alarm.date) return null;
      var o = at(alarm.date, alarm.time);
      return o > now ? o : null;
    }
    var t = at(dateKey(now), alarm.time);
    if (t > now) return t;
    var tm = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return at(dateKey(tm), alarm.time);
  }

  function occKey(d) { return dateKey(d) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes()); }

  // Returns alarms that should ring now (each occurrence rings once, missed ones within CATCH_UP_MS).
  function dueAlarms(alarms, now) {
    var out = [];
    alarms.forEach(function (a) {
      if (!a.enabled) return;
      var o = lastOccurrence(a, now);
      if (!o) return;
      if (now - o > CATCH_UP_MS) return;
      if (a.lastFired === occKey(o)) return;
      if (a.created && o.getTime() < a.created) return; // don't ring for times before the alarm existed
      out.push({ alarm: a, occurrence: o, key: occKey(o) });
    });
    return out;
  }

  // Mark as fired; one-time alarms switch off. Returns the updated alarm (mutates too).
  function markFired(alarm, key) {
    alarm.lastFired = key;
    if (alarm.type === "once") alarm.enabled = false;
    return alarm;
  }

  function dueSnoozes(snoozes, now) {
    return snoozes.filter(function (s) { return s.at <= now.getTime(); });
  }

  function sortAlarms(alarms) {
    return alarms.slice().sort(function (a, b) {
      var ka = (a.type === "once" ? "1" + a.date : "0") + a.time;
      var kb = (b.type === "once" ? "1" + b.date : "0") + b.time;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
  }

  // Generic demo alarms shown only to a brand-new user (nothing saved on the device yet).
  function defaults(createdMs) {
    var list = [
      ["07:00", "daily", "השכמה, כוס מים, מתיחות קלות", "Wake up, glass of water, light stretch", "c-morning"],
      ["13:00", "daily", "הפסקה קצרה, לקום מהכיסא, לנשום", "Short break, stand up, breathe", "c-work"],
      ["22:30", "daily", "התארגנות לשינה, להניח את הטלפון", "Wind down, put the phone away", "c-evening"]
    ];
    return list.map(function (r, i) {
      return { id: "demo" + (i + 1), time: r[0], type: r[1], date: "",
        title: { he: r[2], en: r[3] }, cat: r[4], enabled: true, lastFired: "", created: createdMs || 0 };
    });
  }

  /* ---------- categories: [{ id, name: string | {he, en}, sound }]; alarm.cat = category id or "" ---------- */
  function defaultCategories() {
    return [
      { id: "c-morning", name: { he: "בוקר", en: "Morning" }, sound: "birds" },
      { id: "c-work", name: { he: "עבודה", en: "Work" }, sound: "digital" },
      { id: "c-evening", name: { he: "ערב", en: "Evening" }, sound: "piano" }
    ];
  }
  function catName(cat, lang) {
    if (!cat) return "";
    if (typeof cat.name === "string") return cat.name;
    return (cat.name && (cat.name[lang] || cat.name.he || cat.name.en)) || "";
  }
  function catOf(alarm, cats) {
    if (!alarm || !alarm.cat) return null;
    for (var i = 0; i < (cats || []).length; i++) if (cats[i].id === alarm.cat) return cats[i];
    return null; // unknown id = uncategorized
  }
  // filter: "all" or a category id
  function filterAlarms(alarms, cats, filter) {
    if (!filter || filter === "all") return alarms.slice();
    return alarms.filter(function (a) { var c = catOf(a, cats); return !!c && c.id === filter; });
  }
  function countIn(alarms, cats, id) { return filterAlarms(alarms, cats, id).length; }
  // Deletes the category only; its alarms stay and become uncategorized (shown under "All").
  function removeCategory(alarms, cats, id) {
    var moved = 0;
    alarms.forEach(function (a) { if (a.cat === id) { a.cat = ""; moved++; } });
    return { alarms: alarms, cats: cats.filter(function (c) { return c.id !== id; }), moved: moved };
  }
  function addCategory(cats, name, sound) {
    name = String(name || "").trim().slice(0, 30);
    if (!name) return null;
    var c = { id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: name, sound: sound || "chime" };
    cats.push(c);
    return c;
  }
  function renameCategory(cats, id, name) {
    name = String(name || "").trim().slice(0, 30);
    if (!name) return false;
    for (var i = 0; i < cats.length; i++) if (cats[i].id === id) { cats[i].name = name; return true; }
    return false;
  }
  function soundFor(alarm, cats, defSound) {
    var c = catOf(alarm, cats);
    return (c && c.sound) || defSound || "chime";
  }

  function splitTasks(text) {
    return String(text || "").split(/\s*(?:,|\+|\n|،)\s*/).filter(Boolean);
  }

  return { CATCH_UP_MS: CATCH_UP_MS, pad: pad, dateKey: dateKey, parseTime: parseTime, lastOccurrence: lastOccurrence,
    nextOccurrence: nextOccurrence, occKey: occKey, dueAlarms: dueAlarms, markFired: markFired,
    dueSnoozes: dueSnoozes, sortAlarms: sortAlarms, defaults: defaults, splitTasks: splitTasks,
    defaultCategories: defaultCategories, catName: catName, catOf: catOf, filterAlarms: filterAlarms, countIn: countIn,
    removeCategory: removeCategory, addCategory: addCategory, renameCategory: renameCategory, soundFor: soundFor };
});
