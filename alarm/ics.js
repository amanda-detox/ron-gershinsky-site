/* Build an iCalendar (.ics) file from the alarm list. No DOM here, so node can test it. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.AlarmIcs = factory();
})(this, function () {
  "use strict";
  var TZID = "Asia/Jerusalem";
  // Israel rules since 2013: summer time starts the Friday before the last Sunday of March at 02:00,
  // ends the last Sunday of October at 02:00.
  var VTIMEZONE = [
    "BEGIN:VTIMEZONE", "TZID:" + TZID, "X-LIC-LOCATION:" + TZID,
    "BEGIN:DAYLIGHT", "TZOFFSETFROM:+0200", "TZOFFSETTO:+0300", "TZNAME:IDT", "DTSTART:19700327T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=FR;BYMONTHDAY=23,24,25,26,27,28,29", "END:DAYLIGHT",
    "BEGIN:STANDARD", "TZOFFSETFROM:+0300", "TZOFFSETTO:+0200", "TZNAME:IST", "DTSTART:19701025T020000",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU", "END:STANDARD",
    "END:VTIMEZONE"
  ];
  var DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()); }
  function utcStamp(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z";
  }
  function escapeText(s) {
    return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,")
      .replace(/\r\n|\r|\n/g, "\\n");
  }
  function utf8Len(ch) {
    var c = ch.codePointAt(0);
    return c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  // RFC 5545 3.1: lines longer than 75 octets are split; continuation lines start with one space.
  // Never splits inside a UTF-8 character.
  function fold(line) {
    var out = [], cur = "", len = 0, limit = 75;
    Array.from(line).forEach(function (ch) {
      var l = utf8Len(ch);
      if (len + l > limit) { out.push(cur); cur = " "; len = 1; limit = 75; }
      cur += ch; len += l;
    });
    out.push(cur);
    return out.join("\r\n");
  }
  function parseTime(t) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(t || "");
    if (!m || +m[1] > 23 || +m[2] > 59) return null;
    return { h: +m[1], m: +m[2] };
  }
  function safeId(s) { return String(s || "x").replace(/[^A-Za-z0-9_-]/g, ""); }

  /* alarms: the app's alarm objects. opts: { now: Date, titleOf: fn(alarm) -> string, includeDisabled: bool }
     Returns { text, count }. */
  function build(alarms, opts) {
    opts = opts || {};
    var now = opts.now || new Date();
    var titleOf = opts.titleOf || function (a) { return (a.title && (a.title.he || a.title.en)) || String(a.title || ""); };
    var stamp = utcStamp(now), events = [];
    (alarms || []).forEach(function (a, i) {
      if (!a || (!a.enabled && !opts.includeDisabled)) return;
      var p = parseTime(a.time);
      if (!p) return;
      var day, rrule = null;
      if (a.type === "once") {
        var d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a.date || "");
        if (!d) return;
        var when = new Date(+d[1], +d[2] - 1, +d[3], p.h, p.m);
        if (when <= now) return; // one-time alarm already passed
        day = d[1] + d[2] + d[3];
      } else {
        day = ymd(now);
        var byday = Array.isArray(a.days) && a.days.length && a.days.length < 7
          ? a.days.map(function (x) { return typeof x === "number" ? DAYS[x] : String(x).slice(0, 2).toUpperCase(); }).filter(function (x) { return DAYS.indexOf(x) >= 0; })
          : [];
        rrule = "RRULE:FREQ=" + (byday.length ? "WEEKLY;BYDAY=" + byday.join(",") : "DAILY");
      }
      var title = titleOf(a) || "Clockify";
      var hhmm = pad(p.h) + pad(p.m);
      events.push("BEGIN:VEVENT");
      events.push("UID:clockify-" + safeId(a.id || ("n" + i)) + "-" + hhmm + "@amanda-detox.github.io");
      events.push("DTSTAMP:" + stamp);
      events.push("DTSTART;TZID=" + TZID + ":" + day + "T" + hhmm + "00");
      events.push("DURATION:PT5M");
      if (rrule) events.push(rrule);
      events.push("SUMMARY:" + escapeText("⏰ " + title));
      events.push("DESCRIPTION:" + escapeText(title));
      events.push("TRANSP:TRANSPARENT");
      events.push("BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT0M", "DESCRIPTION:" + escapeText(title), "END:VALARM");
      events.push("END:VEVENT");
    });
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Ron Gershinsky//Clockify//HE", "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH", "X-WR-CALNAME:" + escapeText("קלוקיפיי · Clockify"), "X-WR-TIMEZONE:" + TZID]
      .concat(VTIMEZONE, events, ["END:VCALENDAR"]);
    var count = events.filter(function (l) { return l === "BEGIN:VEVENT"; }).length;
    return { text: lines.map(fold).join("\r\n") + "\r\n", count: count };
  }

  return { build: build, fold: fold, escapeText: escapeText, TZID: TZID };
});
