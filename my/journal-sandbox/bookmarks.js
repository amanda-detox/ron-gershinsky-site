/* Bookmarks for the Journalify sandbox only.
   Saved ids live in localStorage "rg-sbx-journal-bookmarks" (one map per user id).
   When a session exists they also sync to a separate Appwrite row:
   app "sbxjournal", key "journal-bookmarks". That row stores ids and times, never entry text.
   No bookmark record means not saved. toggle/forget take an id string and never see an entry object. */
(function (root) {
  "use strict";
  var KEY = "rg-sbx-journal-bookmarks";
  var CLOUD_APP = "sbxjournal";
  var CLOUD_KEY = "journal-bookmarks";

  function cleanId(id) {
    if (typeof id !== "string" || !/^[A-Za-z0-9]{1,80}$/.test(id)) return "";
    return id;
  }
  function num(x) { return typeof x === "number" && isFinite(x) ? x : null; }
  function blank() { return { v: 1, ids: {}, gone: {} }; }
  function mapOf(x) {
    var o = {}, k, n;
    if (!x || typeof x !== "object") return o;
    for (k in x) {
      if (!cleanId(k)) continue;
      n = num(x[k]);
      if (n == null) continue;
      o[k] = n;
    }
    return o;
  }
  function copyMap(m) {
    var o = {}, k;
    for (k in m) o[k] = m[k];
    return o;
  }

  function create(opt) {
    opt = opt || {};
    var mem = opt.storage;
    var pendingCloud = false, timer = 0, busy = false, again = false, clock = 0;

    function storage() {
      if (mem) return mem;
      try { if (typeof localStorage !== "undefined") return localStorage; } catch (e) {}
      return null;
    }
    function rawGet(k) {
      var s = storage();
      try { return s ? s.getItem(k) : null; } catch (e) { return null; }
    }
    function rawSet(k, v) {
      if (k !== KEY) throw new Error("bookmarks refuse to write " + k);
      var s = storage();
      if (!s) return;
      try { if (v == null) s.removeItem(k); else s.setItem(k, v); } catch (e) {}
    }
    function uid() {
      var id = opt.uid ? opt.uid() : "";
      id = id == null ? "" : String(id);
      if (!/^[A-Za-z0-9]{1,36}$/.test(id)) return "";
      return id;
    }
    function nowMs() { clock = Math.max(Date.now(), clock + 1); return clock; }
    function loadAll() {
      var o = null;
      try { o = JSON.parse(rawGet(KEY) || "null"); } catch (e) { o = null; }
      if (!o || typeof o !== "object" || !o.users || typeof o.users !== "object") o = { v: 1, users: {} };
      return o;
    }
    function bagOf(all, id) {
      var b = all.users[id];
      if (!b || typeof b !== "object") b = blank();
      b.v = 1;
      b.ids = mapOf(b.ids);
      b.gone = mapOf(b.gone);
      all.users[id] = b;
      return b;
    }
    function bag() {
      var id = uid();
      if (!id) return blank();
      return bagOf(loadAll(), id);
    }
    function saveAll(all) { rawSet(KEY, JSON.stringify({ v: 1, users: all.users })); }
    function isSaved(id) {
      id = cleanId(id);
      if (!id || !uid()) return false;
      var b = bag(), on = b.ids[id], off = b.gone[id];
      if (on == null) return false;
      if (off != null && off > on) return false;
      return true;
    }
    function writeBag(mutator) {
      var id = uid();
      if (!id) return false;
      var all = loadAll(), b = bagOf(all, id);
      if (!mutator(b)) return false;
      all.users[id] = b;
      saveAll(all);
      pendingCloud = true;
      syncSoon();
      return true;
    }
    function toggle(id) {
      id = cleanId(id);
      if (!id) return false;
      var on = isSaved(id);
      writeBag(function (b) {
        var t = nowMs();
        if (on) { delete b.ids[id]; b.gone[id] = t; }
        else { b.ids[id] = t; delete b.gone[id]; }
        return true;
      });
      return !on && !!uid();
    }
    function forget(id) {
      id = cleanId(id);
      if (!id || !isSaved(id)) return false;
      return writeBag(function (b) {
        delete b.ids[id];
        b.gone[id] = nowMs();
        return true;
      });
    }
    function exportBag(id) {
      var b = bagOf(loadAll(), id);
      return { v: 1, ids: copyMap(b.ids), gone: copyMap(b.gone) };
    }
    function mergeRemote(id, remote) {
      if (!remote || typeof remote !== "object") return false;
      var all = loadAll(), b = bagOf(all, id);
      var ids = mapOf(remote.ids), gone = mapOf(remote.gone), changed = false, ahead = false, k;
      function localBest(entryId) {
        var on = b.ids[entryId], off = b.gone[entryId], best = -1;
        if (on != null) best = on;
        if (off != null && off > best) best = off;
        return best;
      }
      function consider(entryId, at, removed) {
        var best = localBest(entryId);
        if (best > at) { ahead = true; return; }
        if (best === at) return;
        if (removed) {
          if (b.ids[entryId] != null) { delete b.ids[entryId]; changed = true; }
          if (b.gone[entryId] !== at) { b.gone[entryId] = at; changed = true; }
        } else {
          if (b.ids[entryId] !== at) { b.ids[entryId] = at; changed = true; }
          if (b.gone[entryId] != null) { delete b.gone[entryId]; changed = true; }
        }
      }
      for (k in ids) consider(k, ids[k], false);
      for (k in gone) consider(k, gone[k], true);
      for (k in b.ids) if (ids[k] == null && gone[k] == null) ahead = true;
      for (k in b.gone) if (ids[k] == null && gone[k] == null) ahead = true;
      if (changed) { all.users[id] = b; saveAll(all); }
      if (ahead) pendingCloud = true;
      return changed;
    }
    function account() {
      if (opt.account) return opt.account();
      try { if (typeof window !== "undefined") return window.RGAccount || null; } catch (e) {}
      return null;
    }
    function cloudGet(app, key) {
      if (app !== CLOUD_APP || key !== CLOUD_KEY) throw new Error("bookmarks refuse this cloud read");
      if (opt.cloudGet) return opt.cloudGet(app, key);
      var A = account();
      if (!A || !A.user || !A.user() || !A.get) return Promise.resolve(null);
      return A.get(app, key);
    }
    function cloudSet(app, key, value) {
      if (app !== CLOUD_APP || key !== CLOUD_KEY) throw new Error("bookmarks refuse this cloud write");
      if (!value || value.items || value.text || value.kind || value.entries) throw new Error("bookmarks refuse to store entries");
      if (opt.cloudSet) return opt.cloudSet(app, key, value);
      var A = account();
      if (!A || !A.user || !A.user() || !A.set) return Promise.resolve(value);
      return A.set(app, key, value);
    }
    function syncNow() {
      var id = uid();
      if (!id) return Promise.resolve(false);
      if (busy) { again = true; return Promise.resolve(false); }
      busy = true;
      return Promise.resolve().then(function () { return cloudGet(CLOUD_APP, CLOUD_KEY); }).then(function (remote) {
        if (uid() !== id) return false;
        mergeRemote(id, remote);
        if (!pendingCloud) return false;
        pendingCloud = false;
        return Promise.resolve(cloudSet(CLOUD_APP, CLOUD_KEY, exportBag(id))).then(function () { return true; });
      }).then(function (pushed) {
        busy = false;
        if (again && uid() === id) { again = false; return syncNow().then(function () { return pushed; }); }
        return pushed;
      }, function (err) {
        busy = false;
        pendingCloud = true;
        if (again) { again = false; syncNow(); }
        return Promise.reject(err);
      });
    }
    function syncSoon() {
      if (opt.auto === false) return;
      if (typeof setTimeout !== "function") return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        syncNow().then(function () { if (opt.onChange) opt.onChange(); }, function () { if (opt.onChange) opt.onChange(); });
      }, 400);
    }
    function arm() {
      var A = account();
      if (!A) return;
      function pull() { syncNow().then(function () { if (opt.onChange) opt.onChange(); }, function () {}); }
      if (A.onChange) A.onChange(pull);
      if (A.ready && A.ready.then) A.ready.then(pull);
    }
    if (opt.auto !== false) arm();

    return {
      key: KEY,
      cloudApp: CLOUD_APP,
      cloudKey: CLOUD_KEY,
      isSaved: isSaved,
      toggle: toggle,
      forget: forget,
      syncNow: syncNow
    };
  }

  var api = { create: create, KEY: KEY, CLOUD_APP: CLOUD_APP, CLOUD_KEY: CLOUD_KEY };
  root.RGJournalBookmarks = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
