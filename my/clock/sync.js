/* Private alarm clock (my/clock/): sign-in gate + account sync.
   Alarms live in localStorage (same key as before, "rg-clock-alarms-v1", so existing alarms on this site carry over)
   AND in the signed-in user's account (Appwrite row app="myclock", key="alarms", readable/writable by that user only).
   Doc: { v: 1, at: <ms of last edit>, alarms: [...] }. Whole-list "last edit wins".
   First sign-in on a device: this device's existing alarms are merged into the account copy (union by id), so nothing is lost.
   "Already rang" marks (lastFired) stay per device: every device rings for itself. Snoozes stay on the device. */
(function () {
  "use strict";
  var APP = "myclock", DOC = "alarms", KEY = "rg-clock-alarms-v1", POLL_MS = 15000;
  var PENDING = "rg-myclock-pending", AT = "rg-myclock-at", SEEN = "rg-myclock-cloudat", MIGR = "rg-myclock-migrated:";
  var A = window.RGAccount, uid = null, busy = false, again = false, soonT = 0;
  var S = {
    he: { title: "השעון המעורר הפרטי שלך", text: "התחבר לחשבון שלך כדי לראות את השעונים שלך. הם שמורים בחשבון ונגישים רק לך." },
    en: { title: "Your private alarm clock", text: "Sign in to your account to see your alarms. They are stored in your account and only you can see them." }
  };
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); } catch (e) { return null; } }
  function local() { try { var v = JSON.parse(ls(KEY)); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function clean(list) { return (list || []).map(function (a) { var b = {}; for (var k in a) if (k !== "lastFired") b[k] = a[k]; return b; }); }
  function same(a, b) { return JSON.stringify(clean(a)) === JSON.stringify(clean(b)); }
  function app() { return window.__alarmApp; }
  function adopt(list) { if (!same(list, local()) && app()) app().replace(clean(list)); }

  /* gate: [data-when="in"] only when signed in, [data-when="out"] only when signed out */
  function gate(u) {
    uid = u ? (u.$id || u.id || u.email || "me") : null;
    var ins = document.querySelectorAll('[data-when="in"]'), outs = document.querySelectorAll('[data-when="out"]'), i;
    for (i = 0; i < ins.length; i++) ins[i].hidden = !uid;
    for (i = 0; i < outs.length; i++) outs[i].hidden = !!uid;
    if (uid) sync();
  }
  function texts() {
    var L = S[document.documentElement.lang === "en" ? "en" : "he"];
    var h = document.getElementById("gate-title"), p = document.getElementById("gate-text");
    if (h) h.textContent = L.title; if (p) p.textContent = L.text;
  }
  new MutationObserver(texts).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  function push(list, at) {
    return A.set(APP, DOC, { v: 1, at: at, alarms: clean(list) }).then(function () { ls(SEEN, at); ls(PENDING, null); });
  }
  function sync() {
    if (!uid || !A) return;
    if (busy) { again = true; return; }
    busy = true; again = false;
    var who = uid;
    A.get(APP, DOC).then(function (cloud) {
      if (who !== uid) return;
      var mine = local(), localAt = +ls(AT) || 0;
      var ok = cloud && Array.isArray(cloud.alarms);
      if (!ls(MIGR + who)) { // first sign-in on this device: bring the existing alarms into the account
        var merged = ok ? cloud.alarms.slice() : [], ids = {};
        merged.forEach(function (a) { ids[a.id] = 1; });
        mine.forEach(function (a) { if (!ids[a.id]) merged.push(a); });
        var at = Date.now();
        return push(merged, at).then(function () { ls(MIGR + who, 1); ls(AT, at); adopt(merged); });
      }
      if (!ok) return push(mine, localAt || Date.now());
      var cloudAt = +cloud.at || 0;
      if (ls(PENDING)) {
        if (cloudAt > localAt) { ls(PENDING, null); ls(SEEN, cloudAt); adopt(cloud.alarms); return; } // edited elsewhere after this device's edit
        return push(mine, localAt || Date.now());
      }
      if (String(cloudAt) !== ls(SEEN)) { ls(SEEN, cloudAt); adopt(cloud.alarms); }
    }).catch(function () { /* offline or signed out: keep everything locally; retry on the next poll */ })
      .then(function () { busy = false; if (again) sync(); });
  }
  function changed() { ls(AT, Date.now()); ls(PENDING, 1); clearTimeout(soonT); soonT = setTimeout(sync, 300); }

  window.RGMyClockSync = { changed: changed, sync: sync, signedIn: function () { return !!uid; } };
  texts();
  if (!A) { gate(null); return; }
  gate(A.user());
  A.onChange(gate);
  if (A.ready && A.ready.then) A.ready.then(function () { gate(A.user()); });
  setInterval(function () { if (uid && document.visibilityState === "visible") sync(); }, POLL_MS);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sync(); });
  window.addEventListener("focus", sync);
  window.addEventListener("online", sync);
})();
