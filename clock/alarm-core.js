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

  // Public version: starts empty.
  function defaults(createdMs) { return []; }

  function splitTasks(text) {
    return String(text || "").split(/\s*(?:,|\+|\n|،)\s*/).filter(Boolean);
  }

  return { CATCH_UP_MS: CATCH_UP_MS, pad: pad, dateKey: dateKey, parseTime: parseTime, lastOccurrence: lastOccurrence,
    nextOccurrence: nextOccurrence, occKey: occKey, dueAlarms: dueAlarms, markFired: markFired,
    dueSnoozes: dueSnoozes, sortAlarms: sortAlarms, defaults: defaults, splitTasks: splitTasks };
});
