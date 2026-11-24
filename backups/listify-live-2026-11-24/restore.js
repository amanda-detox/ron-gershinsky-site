/* Restore from a JSON file for live Listify (my/ideas/).
   commit() writes only rg-myideas-* keys. It refuses sandbox keys. */
(function (root) {
  "use strict";
  var SBX = "rg-myideas-";
  var FOREIGN = "rg-sbx-ideas-";
  var BUILTIN_POS = { ideas: 0, tasks: 1, goals: 2 };
  var BAK_N = 5;

  function fail(code) { return { ok: false, error: code }; }
  function clip(s) {
    if (typeof s !== "string") return "";
    s = s.replace(/\s+/g, " ").trim();
    return s.length > 80 ? s.slice(0, 80) : s;
  }
  function own(obj) {
    var out = [], k;
    for (k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) out.push(k);
    return out;
  }
  function safeKey(k) { return k !== "__proto__" && k !== "constructor" && k !== "prototype"; }
  function copyRecord(x) {
    var y = {}, keys = Object.keys(x), i, f;
    for (i = 0; i < keys.length; i++) {
      f = keys[i];
      if (!safeKey(f)) continue;
      y[f] = x[f];
    }
    return y;
  }
  function cleanItems(raw) {
    var out = {}, keys, i, k, x;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    keys = own(raw);
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      if (!safeKey(k)) continue;
      x = raw[k];
      if (!x || typeof x !== "object" || Array.isArray(x)) continue;
      if (typeof x.id !== "string" || typeof x.at !== "number" || !isFinite(x.at)) continue;
      out[k] = copyRecord(x);
    }
    return JSON.parse(JSON.stringify(out));
  }
  function itemsFrom(node, depth) {
    if (depth > 3) return null;
    if (typeof node === "string") {
      try { node = JSON.parse(node); } catch (e) { return null; }
    }
    if (!node || typeof node !== "object" || Array.isArray(node)) return null;
    if (node.items && typeof node.items === "object" && !Array.isArray(node.items)) return node.items;
    if (node.value && node.value !== node) return itemsFrom(node.value, (depth || 0) + 1);
    return null;
  }
  function better(a, b) {
    var i;
    for (i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
    return String(a[3]) > String(b[3]);
  }
  function rankOf(items, key) {
    var sum = summarize(cleanItems(items));
    return [sum.newestAt == null ? -1 : sum.newestAt, sum.itemCount, sum.listCount, key];
  }
  function hasOwn(items) {
    var k;
    for (k in items) if (Object.prototype.hasOwnProperty.call(items, k)) return true;
    return false;
  }
  function exportItems(data) {
    var my = data.apps && data.apps.myideas, device, keys, i, k, items, best = null, bestRank = null, cloud;
    if (!my || typeof my !== "object") return null;
    device = my.device && typeof my.device === "object" ? my.device : null;
    if (device) {
      keys = own(device);
      for (i = 0; i < keys.length; i++) {
        k = keys[i];
        if (k.indexOf(LIVE_DEVICE) !== 0) continue;
        items = itemsFrom(device[k], 0);
        if (!items || !hasOwn(cleanItems(items))) continue;
        if (!best || better(rankOf(items, k), bestRank)) { best = items; bestRank = rankOf(items, k); }
      }
    }
    if (best) return { items: best, picked: "device" };
    cloud = my.cloud && my.cloud.items ? itemsFrom(my.cloud.items, 0) : null;
    if (cloud) return { items: cloud, picked: "cloud" };
    return null;
  }
  function byPos(a, b) {
    return (a.pos - b.pos) || (a.created - b.created) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }
  function summarize(items) {
    var cats = {}, rows = {}, list = [], tombstones = 0, newest = null, keys, i, k, x, id, visible = [], hidden = [], missing = [], itemCount = 0;
    items = items && typeof items === "object" ? items : {};
    keys = own(items);
    for (i = 0; i < keys.length; i++) {
      x = items[keys[i]];
      if (!x || typeof x !== "object" || typeof x.at !== "number" || !isFinite(x.at)) continue;
      if (x.deleted) { tombstones++; continue; }
      if (newest == null || x.at > newest) newest = x.at;
      if (x.type === "cat" && typeof x.cat === "string") cats[x.cat] = x;
      else if (x.type !== "meta" && typeof x.sec === "string" && x.sec) list.push(x);
    }
    keys = own(cats);
    for (i = 0; i < keys.length; i++) {
      x = cats[keys[i]];
      id = x.cat;
      rows[id] = {
        id: id, name: typeof x.name === "string" ? x.name : "", builtin: BUILTIN_POS[id] != null ? id : "",
        pos: typeof x.pos === "number" ? x.pos : (BUILTIN_POS[id] != null ? BUILTIN_POS[id] : 1000000),
        created: typeof x.created === "number" ? x.created : 0, count: 0,
        newestAt: x.at, hidden: !!x.gone
      };
    }
    for (i = 0; i < list.length; i++) {
      x = list[i]; id = x.sec;
      if (!rows[id]) rows[id] = {
        id: id, name: "", builtin: BUILTIN_POS[id] != null ? id : "",
        pos: BUILTIN_POS[id] != null ? BUILTIN_POS[id] : 1000000, created: 0, count: 0, newestAt: null, hidden: false
      };
      rows[id].count++;
      if (rows[id].newestAt == null || x.at > rows[id].newestAt) rows[id].newestAt = x.at;
    }
    keys = own(rows);
    for (i = 0; i < keys.length; i++) {
      k = rows[keys[i]];
      (k.hidden ? hidden : visible).push(k);
    }
    visible.sort(byPos); hidden.sort(byPos);
    for (i = 0; i < visible.length; i++) itemCount += visible[i].count;
    ["ideas", "tasks", "goals"].forEach(function (bid) { if (!rows[bid]) missing.push(bid); });
    return { listCount: visible.length, itemCount: itemCount, newestAt: newest, visible: visible, hidden: hidden, tombstones: tombstones, builtinsMissing: missing };
  }
  function finish(items, meta) {
    items = cleanItems(items);
    return {
      ok: true, items: items, summary: summarize(items), kind: meta.kind, picked: meta.picked || "",
      createdAtLocal: meta.createdAtLocal || "", source: meta.source || ""
    };
  }
  function parse(data) {
    var raw, exp;
    if (!data || typeof data !== "object" || Array.isArray(data)) return fail("format");
    if (data.format === "listify-restore") {
      raw = itemsFrom(data.value, 0) || itemsFrom(data, 0);
      if (!raw) return fail("format");
      return finish(raw, { kind: "listify-restore", picked: "value", createdAtLocal: clip(data.createdAtLocal), source: clip(data.source) });
    }
    if (data.format === "healify-data-export") {
      exp = exportItems(data);
      if (!exp) return fail("format");
      return finish(exp.items, { kind: "healify-data-export", picked: exp.picked, createdAtLocal: clip(data.exportedAtLocal), source: clip(data.exportedFrom) });
    }
    if (data.items && typeof data.items === "object" && !Array.isArray(data.items)) {
      return finish(data.items, { kind: "items", picked: "items", createdAtLocal: "", source: "" });
    }
    return fail("format");
  }
  function parseText(text) {
    var data;
    if (typeof text !== "string") return fail("format");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    try { data = JSON.parse(text); } catch (e) { return fail("format"); }
    return parse(data);
  }
  function formatWhen(ms) {
    var d, p;
    if (typeof ms !== "number" || !isFinite(ms)) return "";
    d = new Date(ms);
    if (isNaN(d.getTime())) return "";
    p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear() + " " + p(d.getHours()) + ":" + p(d.getMinutes());
  }
  function uidOk(uid) {
    return typeof uid === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(uid);
  }
  function cloneItems(v) {
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    return JSON.parse(JSON.stringify(v));
  }
  function stage(opt) {
    var uid, now, current, next, cacheKey, bakKey, rollKey, roll, raw;
    opt = opt || {};
    uid = opt.uid;
    if (!uidOk(uid)) return fail("uid");
    if (!opt.storage || typeof opt.storage.getItem !== "function") return fail("storage");
    now = typeof opt.now === "number" && isFinite(opt.now) ? opt.now : Date.now();
    try { current = cloneItems(opt.currentItems); next = cleanItems(opt.nextItems); }
    catch (e) { return fail("format"); }
    cacheKey = SBX + "v1:" + uid;
    bakKey = SBX + "restore-bak:" + uid;
    rollKey = SBX + "bak:" + uid;
    roll = [];
    try { raw = JSON.parse(opt.storage.getItem(rollKey) || "[]"); if (Array.isArray(raw)) roll = raw; } catch (e) { roll = []; }
    roll.push({ t: now, items: current, reason: "before-file-restore" });
    while (roll.length > BAK_N) roll.shift();
    return {
      ok: true,
      items: next,
      summary: summarize(next),
      writes: [
        { key: bakKey, json: JSON.stringify({ t: now, reason: "before-file-restore", items: current }) },
        { key: rollKey, json: JSON.stringify(roll) },
        { key: cacheKey, json: JSON.stringify({ items: next, pending: true, seeded: true }) }
      ]
    };
  }
  function keyOk(key) {
    return typeof key === "string" && key.indexOf(SBX) === 0 && key.indexOf(FOREIGN) === -1 && key.indexOf("..") === -1;
  }
  function commit(storage, staged) {
    var writes, i, w, seen = {}, prev = {}, k;
    if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") return fail("storage");
    if (!staged || staged.ok !== true || !Array.isArray(staged.writes) || !staged.writes.length) return fail("stage");
    writes = staged.writes;
    for (i = 0; i < writes.length; i++) {
      w = writes[i];
      if (!w || !keyOk(w.key) || typeof w.json !== "string") return fail("key");
      seen[w.key] = 1;
    }
    for (k in seen) prev[k] = storage.getItem(k);
    try {
      for (i = 0; i < writes.length; i++) storage.setItem(writes[i].key, writes[i].json);
    } catch (e) {
      try {
        for (k in seen) {
          if (prev[k] == null) storage.removeItem(k);
          else storage.setItem(k, prev[k]);
        }
      } catch (e2) {}
      return fail("storage");
    }
    return { ok: true };
  }

  var api = { parse: parse, parseText: parseText, summarize: summarize, formatWhen: formatWhen, stage: stage, commit: commit };
  root.RGMyIdeasRestore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
