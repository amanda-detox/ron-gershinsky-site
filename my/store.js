/* store.js: offline-first, per-user item store for the private apps (same engine as my/ideas/app.js), used by
   my/rehabify/ and my/calmify/. Synced through RGAccount (Appwrite row (user, app, "items"), readable/writable by the
   signed-in user only). Nothing personal is stored in the site's files.
   Model: { v: 1, items: { <id>: { id, kind, ..., created, at, deleted? } } }
   Merge: per item id, the newer "at" wins; deletions are tombstones (deleted: true), pruned after 30 days.
   Local copy per user: localStorage "rg-<app>-v1:<user id>".
   Usage: var S = RGStore("myrehab", { onChange: render, onStatus: fn, busy: fn() -> true while the user is typing });
          S.uid(), S.list(kind), S.get(id), S.add(obj) -> id, S.upd(id, patch), S.del(id), S.statusText() */
(function () {
  "use strict";
  var KEY = "items", POLL_MS = 15000, TOMB_MS = 30 * 24 * 3600 * 1000;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function jparse(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
  function newer(a, b) {
    if (!a) return b; if (!b) return a;
    if ((a.at || 0) !== (b.at || 0)) return (a.at || 0) > (b.at || 0) ? a : b;
    if (!!a.deleted !== !!b.deleted) return a.deleted ? a : b;
    return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
  }
  function valid(x) { return x && typeof x === "object" && typeof x.id === "string" && typeof x.at === "number"; }
  function merge(a, b) {
    var out = {}, cut = Date.now() - TOMB_MS, k;
    for (k in a) if (valid(a[k])) out[k] = a[k];
    for (k in b) if (valid(b[k])) out[k] = newer(out[k], b[k]);
    for (k in out) if (out[k].deleted && out[k].at < cut) delete out[k];
    return out;
  }
  function same(a, b) {
    var ka = Object.keys(a), kb = Object.keys(b); if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) { var y = b[ka[i]]; if (!y || JSON.stringify(a[ka[i]]) !== JSON.stringify(y)) return false; }
    return true;
  }
  window.RGStore = function (APP, opt) {
    opt = opt || {};
    var A = window.RGAccount, uid = null, items = {}, pending = false, busy = false, again = false, offline = false, lastT = 0, soonT = 0;
    function cacheKey(id) { return "rg-" + APP + "-v1:" + id; }
    function now() { lastT = Math.max(Date.now(), lastT + 1); return lastT; }
    function newId() { return now().toString(36) + Math.random().toString(36).slice(2, 8); }
    function loadLocal() { var c = uid ? jparse(lsGet(cacheKey(uid)), null) : null; items = (c && c.items && typeof c.items === "object") ? c.items : {}; pending = !!(c && c.pending); }
    function saveLocal() { if (uid) lsSet(cacheKey(uid), JSON.stringify({ items: items, pending: pending })); }
    function fire() { if (opt.onChange) opt.onChange(); }
    function status() { if (opt.onStatus) opt.onStatus(); }
    window.addEventListener("storage", function (e) { if (uid && e.key === cacheKey(uid)) { loadLocal(); fire(); } });
    function sync() {
      if (!uid || !A) return Promise.resolve();
      if (busy) { again = true; return Promise.resolve(); }
      busy = true; again = false; status();
      var who = uid, sent = null;
      return A.get(APP, KEY).then(function (cloud) {
        if (who !== uid) return;
        var cl = (cloud && cloud.items && typeof cloud.items === "object") ? cloud.items : {};
        var merged = merge(items, cl);
        if (!same(merged, items)) { items = merged; saveLocal(); fire(); }
        if (cloud && same(items, cl)) return;
        sent = items;
        return A.set(APP, KEY, { v: 1, items: items });
      }).then(function () {
        if (who !== uid) return;
        offline = false;
        if (!sent || sent === items) { pending = false; saveLocal(); } else again = true;
      }, function (e) { if (e && e.code === "signed_out") return; offline = true; })
        .then(function () { busy = false; status(); if (again) { again = false; sync(); } });
    }
    function syncSoon() { clearTimeout(soonT); soonT = setTimeout(sync, 250); }
    function changed() { pending = true; saveLocal(); fire(); status(); syncSoon(); }
    setInterval(function () { if (uid && document.visibilityState === "visible" && !(opt.busy && opt.busy())) sync(); }, POLL_MS);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sync(); });
    window.addEventListener("online", function () { sync(); });
    window.addEventListener("offline", function () { offline = true; status(); });
    function put(x) { var c = {}; for (var k in items) c[k] = items[k]; c[x.id] = x; items = c; }
    function onUser(u) {
      var id = u ? u.id : null; if (id === uid) return;
      if (!id && uid) { var c = jparse(lsGet(cacheKey(uid)), null); if (!c || !c.pending) lsSet(cacheKey(uid), null); } // signed out: drop this device's copy unless unsynced
      uid = id; offline = false; loadLocal(); fire(); status();
      if (uid) sync();
    }
    // start after the caller has its handle (onChange may use it)
    if (A) Promise.resolve().then(function () { onUser(A.user()); A.onChange(onUser); A.ready.then(function () { onUser(A.user()); }); });
    return {
      uid: function () { return uid; },
      list: function (kind) { var r = []; for (var k in items) { var x = items[k]; if (!x.deleted && x.kind === kind) r.push(x); } return r; },
      get: function (id) { var x = items[id]; return x && !x.deleted ? x : null; },
      add: function (obj) { var id = newId(), at = now(), x = { id: id, created: at, at: at }; for (var k in obj) if (obj[k] !== "" && obj[k] != null) x[k] = obj[k]; put(x); changed(); return id; },
      upd: function (id, patch) { var x = items[id]; if (!x || x.deleted) return; var y = {}, k; for (k in x) y[k] = x[k]; for (k in patch) { if (patch[k] === "" || patch[k] == null) delete y[k]; else y[k] = patch[k]; } y.at = now(); put(y); changed(); },
      del: function (id) { if (items[id]) { put({ id: id, deleted: true, at: now() }); changed(); } },
      state: function () { return !uid ? "" : offline ? "offline" : (pending || busy) ? "saving" : "synced"; },
      sync: sync
    };
  };
})();
