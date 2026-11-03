/* Saved mixes for Soundify (localStorage "rg-snd-mixes").
   Account sync is a dedicated row (app "sounds", key "mixes"), NOT RGAccount.syncPrefs.
   syncPrefs keeps one timestamp per localStorage key and replaces the whole value, so the
   device that saved last would wipe the other device's mixes. This file merges by id instead:
   union of both sides, newest updatedAt wins per mix, deletions are tombstones.
   Pulls on open, focus, and when the tab becomes visible. Pushes after each save or delete.
   Mixes saved before ids existed get a stable id from the name plus the mix content, so the
   same mix on two devices is one item and different mixes are both kept. */
(function (root) {
  "use strict";
  var KEY = "rg-snd-mixes", APP = "sounds", DOC = "mixes";
  var TOMB_MS = 30 * 24 * 3600 * 1000;
  var listeners = [], started = false, busy = false, again = false, soon = 0, lastT = 0;

  function lsGet() { try { return root.localStorage.getItem(KEY); } catch (e) { return null; } }
  function lsSet(v) { try { root.localStorage.setItem(KEY, v); } catch (e) {} }
  function now() { lastT = Math.max(Date.now(), lastT + 1); return lastT; }
  function newId() { return "n" + now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function empty() { return { v: 2, items: {} }; }
  function h32(s, seed) {
    var h = (0x811c9dc5 ^ Math.imul(seed, 0x9e3779b1)) >>> 0, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function sortObj(o) {
    var out = {}, keys, i;
    if (!o || typeof o !== "object") return out;
    keys = Object.keys(o).sort();
    for (i = 0; i < keys.length; i++) out[keys[i]] = o[keys[i]];
    return out;
  }
  /* Identity of a mix that has no id yet: name + content, not the save time. */
  function canon(m) {
    return JSON.stringify({
      name: String(m && m.name != null ? m.name : "").trim(),
      on: m && Array.isArray(m.on) ? m.on.map(function (id) { return String(id); }) : [],
      vols: sortObj(m && m.vols),
      freqs: sortObj(m && m.freqs),
      master: m && typeof m.master === "number" && isFinite(m.master) ? m.master : null,
      mode: !m || m.mode == null ? null : String(m.mode),
      carrier: m && typeof m.carrier === "number" && isFinite(m.carrier) ? m.carrier : null,
      gender: !m || m.gender == null ? null : String(m.gender)
    });
  }
  function legacyId(m) { var s = canon(m); return "m" + h32(s, 1) + h32(s, 2); }
  function stamp(v) { return typeof v === "number" && isFinite(v) ? v : 0; }
  function liveItem(m, id, at) {
    return {
      id: id, name: String(m.name != null ? m.name : "").trim(),
      on: Array.isArray(m.on) ? m.on.map(function (x) { return String(x); }) : [],
      vols: sortObj(m.vols), freqs: sortObj(m.freqs),
      master: typeof m.master === "number" && isFinite(m.master) ? m.master : 0.5,
      mode: m.mode === "iso" ? "iso" : "binaural",
      carrier: typeof m.carrier === "number" && isFinite(m.carrier) ? m.carrier : 200,
      gender: m.gender === "f" ? "f" : "m",
      updatedAt: at, t: at
    };
  }
  function normalize(m) {
    if (!m || typeof m !== "object" || Array.isArray(m)) return null;
    var at = stamp(m.updatedAt != null ? m.updatedAt : m.t);
    if (m.deleted === true && typeof m.id === "string" && m.id) return { id: m.id, deleted: true, updatedAt: at };
    if (typeof m.name !== "string" && !Array.isArray(m.on) && typeof m.id !== "string") return null;
    var id = typeof m.id === "string" && m.id ? m.id : legacyId(m);
    return liveItem(m, id, at);
  }
  function newer(a, b) {
    if (!a) return b; if (!b) return a;
    if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b;
    if (!!a.deleted !== !!b.deleted) return a.deleted ? a : b;
    return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
  }
  function pack(doc) {
    var items = {}, ids = Object.keys((doc && doc.items) || {}).sort(), i;
    for (i = 0; i < ids.length; i++) items[ids[i]] = doc.items[ids[i]];
    return { v: 2, items: items };
  }
  function fromValue(j) {
    var items = {}, src, keys, i, it;
    function add(m) {
      it = normalize(m);
      if (!it) return;
      items[it.id] = items[it.id] ? newer(items[it.id], it) : it;
    }
    if (Array.isArray(j)) { for (i = 0; i < j.length; i++) add(j[i]); }
    else if (j && typeof j === "object") {
      src = j.items && typeof j.items === "object" && !Array.isArray(j.items) ? j.items : null;
      if (src) { keys = Object.keys(src); for (i = 0; i < keys.length; i++) add(src[keys[i]]); }
    }
    return pack({ v: 2, items: items });
  }
  function parseAny(v) {
    if (v == null || v === "") return empty();
    if (typeof v === "string") { try { return fromValue(JSON.parse(v)); } catch (e) { return empty(); } }
    return fromValue(v);
  }
  function mergeDocs(a, b, at) {
    var items = {}, cut = stamp(at || Date.now()) - TOMB_MS;
    function take(doc) {
      var src = doc && doc.items || {}, keys = Object.keys(src), i, it;
      for (i = 0; i < keys.length; i++) {
        it = normalize(src[keys[i]]);
        if (!it) continue;
        items[it.id] = items[it.id] ? newer(items[it.id], it) : it;
      }
    }
    take(parseAny(a)); take(parseAny(b));
    Object.keys(items).forEach(function (id) { if (items[id].deleted && items[id].updatedAt < cut) delete items[id]; });
    return pack({ v: 2, items: items });
  }
  function sameDoc(a, b) { return JSON.stringify(pack(parseAny(a))) === JSON.stringify(pack(parseAny(b))); }
  function live(doc) {
    var out = [];
    Object.keys(doc.items).forEach(function (id) { if (doc.items[id] && !doc.items[id].deleted) out.push(doc.items[id]); });
    out.sort(function (a, b) {
      if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
      if (a.name < b.name) return -1; if (a.name > b.name) return 1;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    return out;
  }
  function occupied(doc) {
    var ids = Object.keys(doc.items);
    for (var i = 0; i < ids.length; i++) return true;
    return false;
  }
  function load() {
    var raw = lsGet(), doc = parseAny(raw), next = JSON.stringify(doc);
    if (raw !== next && !(raw == null && !occupied(doc))) lsSet(next);
    return doc;
  }
  function write(doc) { doc = pack(doc); lsSet(JSON.stringify(doc)); return doc; }
  function notify() { listeners.slice().forEach(function (fn) { try { fn(); } catch (e) {} }); }
  function findByName(doc, name) {
    var best = null, ids = Object.keys(doc.items), i, it;
    for (i = 0; i < ids.length; i++) {
      it = doc.items[ids[i]];
      if (!it || it.deleted || it.name !== name) continue;
      if (!best || it.updatedAt >= best.updatedAt) best = it;
    }
    return best;
  }
  function put(doc, item) { var items = {}, ids = Object.keys(doc.items), i; for (i = 0; i < ids.length; i++) items[ids[i]] = doc.items[ids[i]]; items[item.id] = item; return pack({ v: 2, items: items }); }

  function account() { return root.RGAccount || null; }
  function signedIn() { var A = account(), u = A && A.user && A.user(); return !!(A && u && u.id && A.get && A.set); }
  function sync() {
    if (!signedIn()) return Promise.resolve(false);
    if (busy) { again = true; return Promise.resolve(false); }
    busy = true; again = false;
    var A = account(), rounds = 0;
    function step() {
      rounds++;
      return A.get(APP, DOC).then(function (cloud) {
        var local = load(), merged = mergeDocs(local, cloud);
        if (!sameDoc(merged, local)) { write(merged); notify(); }
        if (sameDoc(merged, cloud) || rounds >= 4) return null;
        return A.set(APP, DOC, merged).then(step);
      });
    }
    return step().then(function () { return true; }, function (e) {
      if (e && (e.code === "signed_out" || e.type === "signed_out")) return false;
      return false;
    }).then(function (ok) {
      busy = false;
      if (again) { again = false; return sync(); }
      return ok;
    });
  }
  function schedule() { clearTimeout(soon); soon = setTimeout(sync, 300); }
  function save(fields, at) {
    fields = fields || {};
    var name = String(fields.name != null ? fields.name : "").trim();
    if (!name) return null;
    var doc = load(), prev = findByName(doc, name), when = stamp(at) || now();
    var item = liveItem({
      name: name, on: fields.on, vols: fields.vols, freqs: fields.freqs,
      master: fields.master, mode: fields.mode, carrier: fields.carrier, gender: fields.gender
    }, prev ? prev.id : newId(), when);
    write(put(doc, item)); notify(); schedule();
    return item;
  }
  function remove(id, at) {
    if (!id) return false;
    var doc = load();
    if (!doc.items[id]) return false;
    var when = stamp(at) || now();
    write(put(doc, { id: id, deleted: true, updatedAt: when }));
    notify(); schedule();
    return true;
  }
  function start() {
    if (started) return;
    started = true;
    load();
    var A = account();
    function kick() { if (signedIn()) sync(); }
    if (A) {
      kick();
      if (A.onChange) A.onChange(function () { kick(); });
      if (A.ready && A.ready.then) A.ready.then(function () { kick(); });
    }
    root.addEventListener("visibilitychange", function () { if (root.document && root.document.visibilityState === "visible") sync(); });
    root.addEventListener("focus", function () { sync(); });
    root.addEventListener("pageshow", function () { sync(); });
    root.addEventListener("online", function () { sync(); });
    root.addEventListener("pagehide", function () { sync(); });
    root.addEventListener("storage", function (e) { if (e && e.key === KEY) notify(); });
    setInterval(function () {
      try { if (!root.document || root.document.visibilityState === "visible") sync(); } catch (e) {}
    }, 15000);
  }

  root.RGSoundMixes = {
    KEY: KEY, APP: APP, DOC: DOC,
    legacyId: legacyId, canon: canon, parse: parseAny, merge: mergeDocs, same: sameDoc,
    list: function (doc) { return live(doc ? parseAny(doc) : load()); },
    load: load, save: save, remove: remove, sync: sync, start: start,
    onChange: function (fn) { if (typeof fn === "function") listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; }
  };
})(typeof window !== "undefined" ? window : globalThis);
