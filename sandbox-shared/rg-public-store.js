/* Sandbox copy of rg-public-store.js. Live pages keep loading shared/rg-public-store.js.
   Adds distinct sync statuses, a confirmable large-deletion block, and uses the sandbox
   account timeout so busy cannot stick. Guest items are still not copied unless the
   page passes importGuest and the person agrees.
   rg-public-store.js: same item engine as my/store.js, for the public apps only.
   Guest (signed out): localStorage "rg-pub-<app>:guest" only. Never calls RGAccount.
   Signed in: localStorage "rg-pub-<app>:<user id>" plus one Appwrite row (app is a public id, never myideas/shopping/myjournal/myrehab/mycalm).
   Switching user or signing in does not copy the guest namespace into the account, and does not copy one user into another.
   Usage: var S = RGStore("pubrehabify", { onChange: render, onStatus: fn, busy: fn() -> true while typing }); */
(function () {
  "use strict";
  var KEY = "items", POLL_MS = 15000, TOMB_MS = 30 * 24 * 3600 * 1000;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function jparse(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
  /* ---------- merge (per field, since Oct 2026) ----------
     Every item may carry "_f": { <field>: <ms of the last edit of that field> }, written by stamp() on every local save.
     Two live copies of the same item are merged field by field: each field takes the value with the newer edit time,
     so edits of different fields on two devices are both kept, and for the same field the latest edit wins.
     Fallbacks (old data / older app versions that do not know "_f"): a field without its own time uses the item's "at";
     a copy whose "at" is newer than all its "_f" times was edited by an older app version, so all its fields count as of "at"
     (the old "newer item wins" rule, nothing worse than before). A field missing on one side with no time there never beats a value.
     Deletions (tombstones { id, deleted: true, at }) keep the old rule: the newer "at" wins. */
  var FM_META = { id: 1, at: 1, _f: 1 };
  function newer(a, b) {
    if (!a) return b; if (!b) return a;
    if ((a.at || 0) !== (b.at || 0)) return (a.at || 0) > (b.at || 0) ? a : b;
    if (!!a.deleted !== !!b.deleted) return a.deleted ? a : b; // same instant: deletion wins
    return JSON.stringify(a) >= JSON.stringify(b) ? a : b;     // deterministic on every device
  }
  // "_f"["~"] = the item's "at" when this app version last wrote it; a newer "at" means an older app version edited it since
  function fmOld(x) { var s = x._f; return !!(s && typeof s === "object" && typeof s["~"] === "number" && x.at > s["~"]); }
  function fmTime(x, f, old) {
    var s = x._f && typeof x._f === "object" ? x._f : null, has = Object.prototype.hasOwnProperty.call(x, f);
    if (old) return (has || (s && f in s)) ? x.at : -1;
    if (s && typeof s[f] === "number") return s[f];
    return has ? x.at : -1;
  }
  function fmPlain(x) { var o = {}, l = Object.keys(x).filter(function (k) { return !FM_META[k]; }).sort(); l.forEach(function (k) { o[k] = x[k]; }); return JSON.stringify(o); }
  function mergeItem(a, b) {
    if (JSON.stringify(a) === JSON.stringify(b)) return a;
    if (a.deleted || b.deleted) return newer(a, b);
    var oa = fmOld(a), ob = fmOld(b), keys = {}, o = { id: a.id }, F = {}, f, i, l, ta, tb, src, va, vb;
    [a, b, a._f || {}, b._f || {}].forEach(function (m) { for (var k in m) if (!FM_META[k] && k !== "~") keys[k] = 1; });
    l = Object.keys(keys).sort();
    for (i = 0; i < l.length; i++) {
      f = l[i]; ta = fmTime(a, f, oa); tb = fmTime(b, f, ob);
      if (ta !== tb) src = ta > tb ? a : b;
      else { va = JSON.stringify(a[f]); vb = JSON.stringify(b[f]); src = vb === undefined ? a : va === undefined ? b : va >= vb ? a : b; }
      if (Object.prototype.hasOwnProperty.call(src, f)) o[f] = src[f];
      if (Math.max(ta, tb) >= 0) F[f] = Math.max(ta, tb);
    }
    o.at = Math.max(a.at, b.at);
    // a result that differs from both copies gets a newer "at", so older app versions (whole item, newer "at" wins) adopt it too
    if (fmPlain(o) !== fmPlain(a) && fmPlain(o) !== fmPlain(b)) o.at++;
    F["~"] = o.at; o._f = F;
    return o;
  }
  function valid(x) { return x && typeof x === "object" && typeof x.id === "string" && typeof x.at === "number"; }
  function merge(a, b) {
    var out = {}, cut = Date.now() - TOMB_MS, k;
    for (k in a) if (valid(a[k])) out[k] = a[k];
    for (k in b) if (valid(b[k])) out[k] = out[k] ? mergeItem(out[k], b[k]) : b[k];
    for (k in out) if (out[k].deleted && out[k].at < cut) delete out[k];
    return out;
  }
  /* stamp(map, snap): for every item that changed since "snap" (the map as last saved / merged), record the edit time ("at")
     of each field that changed (or was removed) in its "_f". Items are copied, never changed in place. Returns the new snap. */
  function stamp(m, snap) {
    var k, x, p, ch, f, keys, F, y;
    for (k in m) {
      x = m[k]; p = snap && snap[k];
      if (x === p || !valid(x) || x.deleted || !p || !valid(p) || p.deleted) continue;
      keys = {}; ch = [];
      for (f in x) if (!FM_META[f]) keys[f] = 1; for (f in p) if (!FM_META[f]) keys[f] = 1;
      for (f in keys) if (JSON.stringify(x[f]) !== JSON.stringify(p[f])) ch.push(f);
      if (!ch.length) continue;
      F = {}; var base = x._f && typeof x._f === "object" ? x._f : null;
      if (base && !fmOld(x)) for (f in base) F[f] = base[f]; else for (f in p) if (!FM_META[f]) F[f] = p.at;
      ch.forEach(function (f) { F[f] = x.at; }); F["~"] = x.at;
      y = {}; for (f in x) y[f] = x[f]; y._f = F; m[k] = y;
    }
    var s = {}; for (k in m) s[k] = m[k]; return s;
  }
  function same(a, b) {
    var ka = Object.keys(a), kb = Object.keys(b); if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) { var y = b[ka[i]]; if (!y || JSON.stringify(a[ka[i]]) !== JSON.stringify(y)) return false; }
    return true;
  }
  window.RGStore = function (APP, opt) {
    opt = opt || {};
    var A = window.RGAccount, uid = null, items = {}, snap = {}, pending = false, busy = false, again = false, offline = false, lastT = 0, soonT = 0;
    var failN = 0, syncErr = "", holdBlocked = false, bulkOk = 0;
    RGIsolate.assertPublicApp(APP);
    function cacheKey(id) { return RGIsolate.cacheKey(APP, id); }
    function now() { lastT = Math.max(Date.now(), lastT + 1); return lastT; }
    function newId() { return now().toString(36) + Math.random().toString(36).slice(2, 8); }
    function loadLocal() {
      var b = RGIsolate.loadBucket(function (k) { return jparse(lsGet(k), null); }, APP, uid && uid !== RGIsolate.GUEST ? { id: uid } : null);
      items = b.items; pending = b.pending; snap = stamp(items, null);
    }
    function saveLocal() { snap = stamp(items, snap); if (uid) lsSet(cacheKey(uid), JSON.stringify({ items: items, pending: pending })); }
    function fire() { if (opt.onChange) opt.onChange(); }
    function status() { if (opt.onStatus) opt.onStatus(); }
    window.addEventListener("storage", function (e) { if (uid && e.key === cacheKey(uid)) { loadLocal(); fire(); } });
    function sync() {
      if (!RGIsolate.maySync(uid) || !A) return Promise.resolve();
      if (busy) { again = true; return Promise.resolve(); }
      busy = true; again = false; status();
      var who = uid, sent = null, blocked = false, SS = window.RGSyncStatus;
      return A.get(APP, KEY).then(function (cloud) {
        if (who !== uid) return;
        var cl = (cloud && cloud.items && typeof cloud.items === "object") ? cloud.items : {};
        snap = stamp(items, snap); var merged = merge(items, cl);
        if (!same(merged, items)) { items = merged; snap = stamp(items, null); saveLocal(); fire(); }
        if (cloud && same(items, cl)) return;
        if (SS && SS.tooManyGone(items, cl, Date.now(), bulkOk)) {
          blocked = true; holdBlocked = true; pending = true; saveLocal();
          try { console.warn(APP + " sandbox: a write that removes most items was blocked; the cloud copy is untouched"); } catch (e) {}
          return;
        }
        holdBlocked = false;
        sent = items;
        return A.set(APP, KEY, { v: 1, items: items });
      }).then(function () {
        if (who !== uid) return;
        var next = SS ? SS.applySuccess(null, { blocked: blocked, sentSame: !sent || sent === items }) : { holdBlocked: blocked, clearPending: !blocked && (!sent || sent === items), again: !blocked && !!sent && sent !== items };
        offline = false; syncErr = ""; failN = 0; holdBlocked = !!next.holdBlocked;
        if (blocked) return;
        if (next.clearPending) { pending = false; saveLocal(); } else if (next.again) again = true;
      }, function (e) {
        if (who !== uid) return;
        if (e && e.code === "signed_out") { offline = false; syncErr = ""; return; }
        var next = SS ? SS.applyFailure({ failN: failN }, e, typeof navigator === "undefined" || navigator.onLine !== false) : { offline: true, syncErr: "", failN: failN };
        offline = next.offline; syncErr = next.syncErr; failN = next.failN;
      }).then(function () { busy = false; status(); if (again && who === uid) { again = false; sync(); } });
    }
    function syncSoon() { clearTimeout(soonT); soonT = setTimeout(sync, 250); }
    function changed() { pending = true; saveLocal(); fire(); status(); syncSoon(); }
    setInterval(function () { if (RGIsolate.maySync(uid) && document.visibilityState === "visible" && !(opt.busy && opt.busy())) sync(); }, POLL_MS);
    document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sync(); });
    window.addEventListener("online", function () { offline = false; sync(); });
    window.addEventListener("offline", function () { offline = true; syncErr = ""; status(); });
    function put(x) { var c = {}; for (var k in items) c[k] = items[k]; c[x.id] = x; items = c; }
    function offerGuest() {
      if (!opt.importGuest) return;
      var raw = jparse(lsGet(cacheKey(RGIsolate.GUEST)), null);
      var g = raw && raw.items && typeof raw.items === "object" ? raw.items : {};
      var n = 0, k, x;
      for (k in g) { x = g[k]; if (x && !x.deleted && !x.gone) n++; }
      if (!n) return;
      var yes = false;
      try { yes = opt.importGuest(n) === true; } catch (e) { yes = false; }
      if (!yes) return;
      var merged = merge(items, g);
      if (!same(merged, items)) { items = merged; pending = true; saveLocal(); }
    }
    function onUser(u) {
      var id = RGIsolate.scopeId(u); if (id === uid) return;
      var prev = uid;
      // Leave every other namespace where it is. Guest items are copied only when importGuest returns true.
      uid = id; offline = false; syncErr = ""; failN = 0; holdBlocked = false; loadLocal();
      if (prev === RGIsolate.GUEST && RGIsolate.maySync(uid)) offerGuest();
      fire(); status();
      if (RGIsolate.maySync(uid)) sync();
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
      state: function () {
        var SS = window.RGSyncStatus;
        if (!SS) return !RGIsolate.maySync(uid) ? "localOnly" : offline ? "offline" : (pending || busy) ? "saving" : "synced";
        return SS.kind({ maySync: RGIsolate.maySync(uid), uid: uid, blocked: holdBlocked, bulkUntil: bulkOk, err: syncErr, onLine: typeof navigator === "undefined" || navigator.onLine !== false, failN: failN, pending: pending, busy: busy, offline: offline });
      },
      confirmBulk: function () { bulkOk = Date.now() + ((window.RGSyncStatus && RGSyncStatus.BULK_MS) || 60000); holdBlocked = false; syncErr = ""; offline = false; return sync(); },
      sync: sync
    };
  };
})();
