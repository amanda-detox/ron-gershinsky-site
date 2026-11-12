/* Sandbox-only Purchasify restore from a JSON file.
   Reads a purchasify-restore file (the backup this sandbox downloads), or a site
   export's shopping device/cloud value. commit() writes only rg-sbx-shopping* keys.
   The live key name below is matched inside an uploaded file. It is never a write target.
   The cloud write stays in app.js and uses the sandbox Appwrite app only. */
(function (root) {
  "use strict";
  var SBX = "rg-sbx-shopping";
  var LIVE_DEVICE = "rg-my-shopping:";
  var BUILTIN_POS = { main: 0, tea: 1 };
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
  function cleanMap(raw) {
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
  function asObj(node, depth) {
    if (depth > 4) return null;
    if (typeof node === "string") {
      try { node = JSON.parse(node); } catch (e) { return null; }
      return asObj(node, depth + 1);
    }
    if (!node || typeof node !== "object" || Array.isArray(node)) return null;
    if (node.value && node.value !== node) {
      var inner = asObj(node.value, depth + 1);
      if (inner && (inner.items || inner.cats)) return inner;
    }
    return node;
  }
  function looksLikeMap(m) {
    var k, n = 0, ok = 0, x;
    if (!m || typeof m !== "object" || Array.isArray(m)) return false;
    for (k in m) {
      if (!Object.prototype.hasOwnProperty.call(m, k) || !safeKey(k)) continue;
      n++;
      x = m[k];
      if (x && typeof x === "object" && typeof x.id === "string") ok++;
    }
    return n === 0 || ok > 0;
  }
  function pairOf(node) {
    var o = asObj(node, 0), hasI, hasC;
    if (!o) return null;
    hasI = looksLikeMap(o.items);
    hasC = looksLikeMap(o.cats);
    if (!hasI && !hasC) return null;
    return { items: hasI ? o.items : null, cats: hasC ? o.cats : null };
  }
  function hasAny(pair) {
    var items, cats, k;
    if (!pair) return false;
    items = cleanMap(pair.items);
    cats = cleanMap(pair.cats);
    for (k in items) return true;
    for (k in cats) return true;
    return false;
  }
  function better(a, b) {
    var i;
    for (i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
    return false;
  }
  function byPos(a, b) {
    return (a.pos - b.pos) || (a.created - b.created) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }
  function listId(x) {
    return x && typeof x.list === "string" && x.list ? x.list : "main";
  }
  function summarize(items, cats) {
    var rows = {}, list = [], tombstones = 0, newest = null, keys, i, k, x, id, visible = [], hidden = [], itemCount = 0;
    items = items && typeof items === "object" ? items : {};
    cats = cats && typeof cats === "object" ? cats : {};
    keys = own(cats);
    for (i = 0; i < keys.length; i++) {
      x = cats[keys[i]];
      if (!x || typeof x !== "object" || typeof x.at !== "number" || !isFinite(x.at)) continue;
      if (newest == null || x.at > newest) newest = x.at;
      if (x.deleted || x.type === "meta") { if (x.deleted) tombstones++; continue; }
      if (x.type !== "cat" || typeof x.cat !== "string") continue;
      id = x.cat;
      rows[id] = {
        id: id, name: typeof x.name === "string" ? x.name : "", builtin: BUILTIN_POS[id] != null ? id : "",
        pos: typeof x.pos === "number" ? x.pos : (BUILTIN_POS[id] != null ? BUILTIN_POS[id] : 1000000),
        created: typeof x.created === "number" ? x.created : 0, count: 0, newestAt: x.at, hidden: !!x.gone
      };
    }
    keys = own(items);
    for (i = 0; i < keys.length; i++) {
      x = items[keys[i]];
      if (!x || typeof x !== "object" || typeof x.at !== "number" || !isFinite(x.at)) continue;
      if (x.deleted || x.type === "cat" || x.type === "meta") { if (x.deleted) tombstones++; continue; }
      if (newest == null || x.at > newest) newest = x.at;
      list.push(x);
    }
    for (i = 0; i < list.length; i++) {
      x = list[i]; id = listId(x);
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
    return { listCount: visible.length, itemCount: itemCount, newestAt: newest, visible: visible, hidden: hidden, tombstones: tombstones };
  }
  function rankOf(pair, key) {
    var sum = summarize(cleanMap(pair.items), cleanMap(pair.cats));
    return [sum.newestAt == null ? -1 : sum.newestAt, sum.itemCount + sum.listCount, key];
  }
  function shoppingExport(data) {
    var shop, device, keys, i, k, pair, best = null, bestRank = null, rank, cloud, ip, cp;
    shop = data.apps && data.apps.shopping;
    if (!shop || typeof shop !== "object") return null;
    device = shop.device && typeof shop.device === "object" ? shop.device : null;
    if (device) {
      keys = own(device);
      for (i = 0; i < keys.length; i++) {
        k = keys[i];
        if (k.indexOf(LIVE_DEVICE) !== 0) continue;
        pair = pairOf(device[k]);
        if (!hasAny(pair)) continue;
        rank = rankOf(pair, k);
        if (!best || better(rank, bestRank)) { best = pair; bestRank = rank; }
      }
    }
    if (best) return { pair: { items: best.items || {}, cats: best.cats || {} }, picked: "device" };
    cloud = shop.cloud && typeof shop.cloud === "object" ? shop.cloud : null;
    if (!cloud) return null;
    ip = cloud.items ? pairOf(cloud.items) : null;
    cp = cloud.cats ? pairOf(cloud.cats) : null;
    if ((!ip || !ip.items) && (!cp || !cp.cats)) return null;
    return { pair: { items: (ip && ip.items) || {}, cats: (cp && cp.cats) || {} }, picked: "cloud" };
  }
  function finish(pair, meta) {
    var items = cleanMap(pair && pair.items), cats = cleanMap(pair && pair.cats);
    return {
      ok: true, items: items, cats: cats, summary: summarize(items, cats), kind: meta.kind, picked: meta.picked || "",
      createdAtLocal: meta.createdAtLocal || "", source: meta.source || ""
    };
  }
  function parse(data) {
    var raw, exp;
    if (!data || typeof data !== "object" || Array.isArray(data)) return fail("format");
    if (data.format === "purchasify-restore") {
      raw = pairOf(data.value) || pairOf(data);
      if (!raw) return fail("format");
      return finish(raw, { kind: "purchasify-restore", picked: "value", createdAtLocal: clip(data.createdAtLocal), source: clip(data.source) });
    }
    if (data.format === "healify-data-export") {
      exp = shoppingExport(data);
      if (!exp) return fail("format");
      return finish(exp.pair, { kind: "healify-data-export", picked: exp.picked, createdAtLocal: clip(data.exportedAtLocal), source: clip(data.exportedFrom) });
    }
    if (data.format) return fail("format");
    raw = pairOf(data);
    if (!raw) return fail("format");
    return finish(raw, { kind: "items", picked: "items", createdAtLocal: "", source: "" });
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
  function buildFile(items, cats, when) {
    return {
      format: "purchasify-restore",
      createdAtLocal: formatWhen(when),
      source: "sandbox",
      app: "sbxshopping",
      value: { v: 1, items: cleanMap(items), cats: cleanMap(cats) }
    };
  }
  function uidOk(uid) {
    return typeof uid === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(uid) && uid.indexOf("my-shopping") === -1 && uid.indexOf("..") === -1;
  }
  function cloneMap(v) {
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    return JSON.parse(JSON.stringify(v));
  }
  function stage(opt) {
    var uid, now, currentI, currentC, nextI, nextC, cacheKey, bakKey, rollKey, roll, raw;
    opt = opt || {};
    uid = opt.uid;
    if (!uidOk(uid)) return fail("uid");
    if (!opt.storage || typeof opt.storage.getItem !== "function") return fail("storage");
    now = typeof opt.now === "number" && isFinite(opt.now) ? opt.now : Date.now();
    try {
      currentI = cloneMap(opt.currentItems);
      currentC = cloneMap(opt.currentCats);
      nextI = cleanMap(opt.nextItems);
      nextC = cleanMap(opt.nextCats);
    } catch (e) { return fail("format"); }
    cacheKey = SBX + ":" + uid;
    bakKey = SBX + "-restore-bak:" + uid;
    rollKey = SBX + "-bak:" + uid;
    roll = [];
    try { raw = JSON.parse(opt.storage.getItem(rollKey) || "[]"); if (Array.isArray(raw)) roll = raw; } catch (e2) { roll = []; }
    roll.push({ t: now, items: currentI, cats: currentC, reason: "before-file-restore" });
    while (roll.length > BAK_N) roll.shift();
    return {
      ok: true,
      items: nextI,
      cats: nextC,
      summary: summarize(nextI, nextC),
      writes: [
        { key: bakKey, json: JSON.stringify({ t: now, reason: "before-file-restore", items: currentI, cats: currentC }) },
        { key: rollKey, json: JSON.stringify(roll) },
        { key: cacheKey, json: JSON.stringify({ items: nextI, cats: nextC, pending: true }) }
      ]
    };
  }
  function keyOk(key) {
    return typeof key === "string" && key.indexOf(SBX) === 0 && key.indexOf(LIVE_DEVICE) === -1 && key.indexOf("rg-my-shopping") === -1 && key.indexOf("..") === -1;
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

  var api = { parse: parse, parseText: parseText, summarize: summarize, formatWhen: formatWhen, buildFile: buildFile, stage: stage, commit: commit };
  root.RGSbxShopRestore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
