/* Sandbox copy of Clockify alarm logic. No DOM here.
   Storage stays in the page (rg-sbx-clockify-* keys). This file does not read localStorage. */
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

  // Generic demo alarms for a brand-new sandbox user. Not anyone's personal alarms.
  // Daily alarms belong to today; one-time alarms sit on later days so day groups are visible.
  function defaults(createdMs) {
    var now = new Date();
    var tomorrow = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    var later = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3));
    var list = [
      { id: "demo1", time: "07:30", type: "daily", date: "", cat: "c-travel", star: true,
        title: { he: "יציאה: מפתחות, ארנק, מים", en: "Heading out: keys, wallet, water" } },
      { id: "demo2", time: "18:30", type: "daily", date: "", cat: "c-practice", star: false,
        title: { he: "תרגול קצר: 10 דקות תנועה", en: "Short practice: 10 minutes of movement" } },
      { id: "demo3", time: "21:00", type: "daily", date: "", cat: "c-care", star: false,
        title: { he: "טיפוח ערב: לשטוף פנים, להכין בגדים למחר", en: "Evening care: wash face, set out clothes" } },
      { id: "demo4", time: "09:00", type: "once", date: tomorrow, cat: "c-travel", star: false,
        title: { he: "בדיקת תחבורה למחר", en: "Check tomorrow's ride" } },
      { id: "demo5", time: "11:00", type: "once", date: later, cat: "c-practice", star: false,
        title: { he: "תרגול ארוך יותר", en: "A longer practice" } }
    ];
    return list.map(function (a) {
      a.enabled = true; a.lastFired = ""; a.created = createdMs || 0; return a;
    });
  }

  /* ---------- categories: [{ id, name: string | {he, en}, sound, builtin? }]; alarm.cat = category id or "" ---------- */
  function defaultCategories() {
    return [
      { id: "c-travel", name: { he: "נסיעות", en: "Travel" }, sound: "rising", builtin: true },
      { id: "c-practice", name: { he: "תרגולים", en: "Practice" }, sound: "marimba", builtin: true },
      { id: "c-care", name: { he: "טיפוח", en: "Care" }, sound: "piano", builtin: true }
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
    return null; // unknown id = uncategorized, alarm still listed under All
  }
  // filter: "all" or a category id
  function filterAlarms(alarms, cats, filter) {
    if (!filter || filter === "all") return (alarms || []).slice();
    return (alarms || []).filter(function (a) { var c = catOf(a, cats); return !!c && c.id === filter; });
  }
  function countIn(alarms, cats, id) { return filterAlarms(alarms, cats, id).length; }
  // Deletes a custom category only. Built-in categories stay. Alarms are kept and become uncategorized.
  function removeCategory(alarms, cats, id) {
    var target = null;
    for (var i = 0; i < cats.length; i++) if (cats[i].id === id) target = cats[i];
    if (!target || target.builtin) return { alarms: alarms, cats: cats, moved: 0, blocked: !!(target && target.builtin) };
    var moved = 0;
    alarms.forEach(function (a) { if (a.cat === id) { a.cat = ""; moved++; } });
    return { alarms: alarms, cats: cats.filter(function (c) { return c.id !== id; }), moved: moved, blocked: false };
  }
  function addCategory(cats, name, sound) {
    name = String(name || "").trim().slice(0, 30);
    if (!name) return null;
    var c = { id: "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: name, sound: sound || "chime", builtin: false };
    cats.push(c);
    return c;
  }
  function renameCategory(cats, id, name) {
    name = String(name || "").trim().slice(0, 30);
    if (!name) return false;
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].id === id) {
        if (cats[i].builtin) return false;
        cats[i].name = name;
        return true;
      }
    }
    return false;
  }
  // Keep saved categories, fill missing sound/name, and put any missing built-ins back. Never drops a saved category or alarm.
  function ensureCategories(cats) {
    var defs = defaultCategories();
    if (!Array.isArray(cats)) return { cats: defs, changed: true };
    var kept = [], changed = false;
    cats.forEach(function (c) {
      if (!c || typeof c !== "object" || !c.id) { changed = true; return; }
      if (!c.sound) { c.sound = "chime"; changed = true; }
      if (c.name == null || c.name === "") { c.name = c.id; changed = true; }
      kept.push(c);
    });
    defs.forEach(function (d) {
      if (!kept.some(function (c) { return c.id === d.id; })) { kept.push(d); changed = true; }
    });
    return { cats: kept, changed: changed };
  }
  // Old alarms have no star/cat. Default them in place so they still appear.
  function normalizeAlarms(list) {
    var changed = false, out = [];
    (list || []).forEach(function (a, i) {
      if (!a || typeof a !== "object") { changed = true; return; }
      if (!a.id) { a.id = "a" + i + "-" + Date.now().toString(36); changed = true; }
      if (typeof a.star !== "boolean") { a.star = false; changed = true; }
      if (typeof a.cat !== "string") { a.cat = a.cat ? String(a.cat) : ""; changed = true; }
      out.push(a);
    });
    return { alarms: out, changed: changed };
  }
  function soundFor(alarm, cats, defSound) {
    var c = catOf(alarm, cats);
    return (c && c.sound) || defSound || "chime";
  }

  // Day the alarm belongs in. Daily (and a one-time alarm with no date) stays on today.
  function alarmDay(alarm, now) {
    if (alarm && alarm.type === "once" && /^\d{4}-\d{2}-\d{2}$/.test(alarm.date || "")) return alarm.date;
    return dateKey(now || new Date());
  }
  function minutesOf(t) {
    var p = parseTime(t);
    return p ? p.h * 60 + p.m : 24 * 60;
  }
  // Today first, then later days, then past one-time days. Starred alarms lead their day.
  // On today, an unstarred alarm that already passed sinks below ones still ahead.
  function groupAlarms(alarms, now) {
    now = now || new Date();
    var today = dateKey(now), buckets = {}, nowM = now.getHours() * 60 + now.getMinutes();
    (alarms || []).forEach(function (a) {
      if (!a) return;
      var k = alarmDay(a, now);
      if (!buckets[k]) buckets[k] = [];
      buckets[k].push(a);
    });
    function cmp(a, b, isToday) {
      var sa = a.star ? 0 : 1, sb = b.star ? 0 : 1;
      if (sa !== sb) return sa - sb;
      if (isToday) {
        var ap = minutesOf(a.time) < nowM ? 1 : 0, bp = minutesOf(b.time) < nowM ? 1 : 0;
        if (ap !== bp) return ap - bp;
      }
      var ta = a.time || "", tb = b.time || "";
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    }
    var keys = Object.keys(buckets), future = [], past = [], hasToday = false;
    keys.forEach(function (k) {
      if (k === today) hasToday = true;
      else if (k > today) future.push(k);
      else past.push(k);
    });
    future.sort(); past.sort().reverse();
    var order = (hasToday ? [today] : []).concat(future, past);
    return order.map(function (k) {
      var isToday = k === today;
      var items = buckets[k].slice().sort(function (a, b) { return cmp(a, b, isToday); });
      return { key: k, today: isToday, past: k < today, alarms: items };
    });
  }

  function splitTasks(text) {
    return String(text || "").split(/\s*(?:,|\+|\n|،)\s*/).filter(Boolean);
  }

  return { CATCH_UP_MS: CATCH_UP_MS, pad: pad, dateKey: dateKey, parseTime: parseTime, lastOccurrence: lastOccurrence,
    nextOccurrence: nextOccurrence, occKey: occKey, dueAlarms: dueAlarms, markFired: markFired,
    dueSnoozes: dueSnoozes, sortAlarms: sortAlarms, defaults: defaults, splitTasks: splitTasks,
    defaultCategories: defaultCategories, catName: catName, catOf: catOf, filterAlarms: filterAlarms, countIn: countIn,
    removeCategory: removeCategory, addCategory: addCategory, renameCategory: renameCategory, ensureCategories: ensureCategories,
    normalizeAlarms: normalizeAlarms, soundFor: soundFor, alarmDay: alarmDay, groupAlarms: groupAlarms };
});
