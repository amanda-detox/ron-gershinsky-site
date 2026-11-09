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
  function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || ""); }
  function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

  // once = a date. daily and weekly = chosen weekdays. The rest repeat from a start date.
  var SCHEDULES = ["once", "daily", "weekly", "d28", "monthly", "yearly", "y5", "decade"];
  var VIBRATIONS = ["short", "long", "continuous", "none"];
  function usesWeekdays(type) { return type === "daily" || type === "weekly"; }
  function usesDate(type) { return type === "once" || type === "d28" || type === "monthly" || type === "yearly" || type === "y5" || type === "decade"; }
  function cleanDays(list) {
    var out = [];
    (Array.isArray(list) ? list : []).forEach(function (d) {
      var n = typeof d === "number" ? d : (/^\d$/.test(String(d)) ? +d : -1);
      if (n >= 0 && n <= 6 && out.indexOf(n) < 0) out.push(n);
    });
    out.sort(function (a, b) { return a - b; });
    return out;
  }
  // Missing or empty weekdays mean every day, so older daily alarms keep ringing.
  function daysOf(alarm) {
    var cleaned = cleanDays(alarm && alarm.days);
    return cleaned.length ? cleaned : [0, 1, 2, 3, 4, 5, 6];
  }
  function intervalStep(type) {
    if (type === "d28") return { kind: "day", n: 28 };
    if (type === "monthly") return { kind: "month", n: 1 };
    if (type === "yearly") return { kind: "year", n: 1 };
    if (type === "y5") return { kind: "year", n: 5 };
    if (type === "decade") return { kind: "year", n: 10 };
    return null;
  }
  function shiftFrom(start, step, k, h, mi) {
    if (step.kind === "day") return new Date(start.getFullYear(), start.getMonth(), start.getDate() + step.n * k, h, mi, 0, 0);
    if (step.kind === "month") {
      var total = start.getFullYear() * 12 + start.getMonth() + step.n * k;
      var y = Math.floor(total / 12), m = ((total % 12) + 12) % 12;
      return new Date(y, m, Math.min(start.getDate(), daysInMonth(y, m)), h, mi, 0, 0);
    }
    var y2 = start.getFullYear() + step.n * k, m2 = start.getMonth();
    return new Date(y2, m2, Math.min(start.getDate(), daysInMonth(y2, m2)), h, mi, 0, 0);
  }
  function estimateK(start, now, step) {
    var k;
    if (step.kind === "day") k = Math.floor((now - start) / (step.n * 86400000));
    else if (step.kind === "month") k = Math.floor(((now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())) / step.n);
    else k = Math.floor((now.getFullYear() - start.getFullYear()) / step.n);
    return k < 0 ? 0 : k;
  }

  function lastWeekday(alarm, now) {
    var p = parseTime(alarm.time), days = daysOf(alarm);
    for (var i = 0; i < 8; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i, p.h, p.m, 0, 0);
      if (d <= now && days.indexOf(d.getDay()) >= 0) return d;
    }
    return null;
  }
  function nextWeekday(alarm, now) {
    var p = parseTime(alarm.time), days = daysOf(alarm);
    for (var i = 0; i < 8; i++) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, p.h, p.m, 0, 0);
      if (d > now && days.indexOf(d.getDay()) >= 0) return d;
    }
    return null;
  }
  function nextInterval(alarm, now) {
    var p = parseTime(alarm.time), step = intervalStep(alarm.type);
    if (!p || !step || !validDate(alarm.date)) return null;
    var start = at(alarm.date, alarm.time);
    if (start > now) return start;
    var k = estimateK(start, now, step);
    var occ = shiftFrom(start, step, k, p.h, p.m);
    var guard = 0;
    while (occ <= now && guard < 8) { k++; occ = shiftFrom(start, step, k, p.h, p.m); guard++; }
    while (k > 0 && shiftFrom(start, step, k - 1, p.h, p.m) > now && guard < 16) { k--; occ = shiftFrom(start, step, k, p.h, p.m); guard++; }
    return occ > now ? occ : null;
  }
  function lastInterval(alarm, now) {
    var p = parseTime(alarm.time), step = intervalStep(alarm.type);
    if (!p || !step || !validDate(alarm.date)) return null;
    var start = at(alarm.date, alarm.time);
    if (start > now) return null;
    var nxt = nextInterval(alarm, now);
    if (!nxt) return start;
    var k = estimateK(start, nxt, step);
    var occ = shiftFrom(start, step, k, p.h, p.m);
    var guard = 0;
    while (occ < nxt && guard < 6) { k++; occ = shiftFrom(start, step, k, p.h, p.m); guard++; }
    while (occ > nxt && k > 0 && guard < 12) { k--; occ = shiftFrom(start, step, k, p.h, p.m); guard++; }
    if (k <= 0) return start <= now ? start : null;
    var prev = shiftFrom(start, step, k - 1, p.h, p.m);
    return prev <= now ? prev : null;
  }

  // Occurrence (Date) of an alarm on or before `now`, the most recent one; null if none.
  function lastOccurrence(alarm, now) {
    if (!alarm || !parseTime(alarm.time)) return null;
    if (alarm.type === "once") {
      if (!validDate(alarm.date)) return null;
      var o = at(alarm.date, alarm.time);
      return o <= now ? o : null;
    }
    if (intervalStep(alarm.type)) return lastInterval(alarm, now);
    return lastWeekday(alarm, now);
  }

  // Next occurrence strictly after `now`; null if none (disabled or one-time in the past).
  function nextOccurrence(alarm, now) {
    if (!alarm || !alarm.enabled || !parseTime(alarm.time)) return null;
    if (alarm.type === "once") {
      if (!validDate(alarm.date)) return null;
      var o = at(alarm.date, alarm.time);
      return o > now ? o : null;
    }
    if (intervalStep(alarm.type)) return nextInterval(alarm, now);
    return nextWeekday(alarm, now);
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
      a.enabled = true; a.lastFired = ""; a.created = createdMs || 0;
      a.sound = ""; a.vibrate = "short";
      a.days = a.type === "once" ? [] : [0, 1, 2, 3, 4, 5, 6];
      return a;
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
  // Old alarms have no star, category, schedule days, sound, or vibration.
  // Fill those in place. Never drop a real alarm and never wipe a title.
  function normalizeAlarms(list) {
    var changed = false, out = [];
    (list || []).forEach(function (a, i) {
      if (!a || typeof a !== "object") { changed = true; return; }
      if (!a.id) { a.id = "a" + i + "-" + Date.now().toString(36); changed = true; }
      if (typeof a.star !== "boolean") { a.star = false; changed = true; }
      if (typeof a.cat !== "string") { a.cat = a.cat ? String(a.cat) : ""; changed = true; }
      if (SCHEDULES.indexOf(a.type) < 0) { a.type = "daily"; changed = true; }
      if (usesWeekdays(a.type)) {
        var days = cleanDays(a.days);
        var nextDays = days.length ? days : [0, 1, 2, 3, 4, 5, 6];
        var same = Array.isArray(a.days) && a.days.length === nextDays.length && nextDays.every(function (d, n) { return a.days[n] === d; });
        if (!same) { a.days = nextDays; changed = true; }
      }
      if (typeof a.sound !== "string" || (a.sound && !/^[a-z0-9_-]{1,24}$/.test(a.sound))) { a.sound = ""; changed = true; }
      if (VIBRATIONS.indexOf(a.vibrate) < 0) { a.vibrate = "short"; changed = true; }
      out.push(a);
    });
    return { alarms: out, changed: changed };
  }
  function soundFor(alarm, cats, defSound) {
    if (alarm && alarm.sound === "none") return "none";
    if (alarm && alarm.sound) return alarm.sound;
    var c = catOf(alarm, cats);
    return (c && c.sound) || defSound || "chime";
  }

  // Day the alarm belongs in. A daily or weekly alarm that rings today stays on today,
  // even after its time has passed. Other weekday choices use the next matching day.
  // A dated repeat (28 days, monthly, yearly, 5 years, decade) uses its next occurrence.
  function alarmDay(alarm, now) {
    now = now || new Date();
    if (!alarm) return dateKey(now);
    if (alarm.type === "once") return validDate(alarm.date) ? alarm.date : dateKey(now);
    if (!intervalStep(alarm.type)) {
      var days = daysOf(alarm);
      if (days.indexOf(now.getDay()) >= 0) return dateKey(now);
      var p = parseTime(alarm.time) || { h: 0, m: 0 };
      for (var i = 1; i <= 7; i++) {
        var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, p.h, p.m, 0, 0);
        if (days.indexOf(d.getDay()) >= 0) return dateKey(d);
      }
      return dateKey(now);
    }
    var nxt = nextOccurrence({ enabled: true, time: alarm.time, type: alarm.type, date: alarm.date, days: alarm.days }, now);
    if (nxt) return dateKey(nxt);
    return validDate(alarm.date) ? alarm.date : dateKey(now);
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
    normalizeAlarms: normalizeAlarms, soundFor: soundFor, alarmDay: alarmDay, groupAlarms: groupAlarms,
    SCHEDULES: SCHEDULES, VIBRATIONS: VIBRATIONS, usesWeekdays: usesWeekdays, usesDate: usesDate,
    cleanDays: cleanDays, daysOf: daysOf };
});
