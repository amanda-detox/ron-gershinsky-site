/* Purchasify sandbox (my/shopping-sandbox/). Not linked from the homepage.
   Separate from the live list: Appwrite app "sbxshopping", local key rg-sbx-shopping:<user>.
   This file never reads or writes the live shopping keys. Copied from the live list and kept on its own data.
   Live-synced through RGAccount (Appwrite rows app="sbxshopping",
   readable/writable by the signed-in user only).
   Row key="items" (unchanged): { v: 1, items: { <id>: { id, text, done, created, at, list?, deleted?, mark? } } }
     mark is "ok" (✓) or "no" (✕). One field, so the two marks replace each other; tapping the same mark again clears it.
     "list" = the category an item belongs to. No "list" = the built-in "קניות" category (every item saved before tabs existed),
     "tea" = the built-in "תה" category, anything else = a custom category id. An item whose category is unknown shows in the
     first category, so nothing is ever hidden or lost.
   Row key="cats" (new, since categories): { v: 1, cats: { "c:<cat>": { id, type: "cat", cat, name?, pos, gone?, created, at } } }
     The two built-in categories ("main", "tea") exist without a record until they are renamed, moved or deleted
     (gone: 1 hides one; it is not a tombstone, so it is never pruned and never comes back). Categories live in their own row so an
     old cached copy of the app (which only knows "items") never sees or drops them.
   Merge (both rows): per id, the newer "at" wins (last write wins); deletions are tombstones (deleted: true), pruned after 30 days.
   Offline-first: kept in localStorage per user (rg-sbx-shopping:<user id>) and merged into the cloud copy on every sync. */
(function () {
  "use strict";
  var APP = "sbxshopping", KEY = "items", CKEY = "cats", POLL_MS = 10000, TOMB_MS = 30 * 24 * 3600 * 1000;
  var SUGGESTED = ["אבקת שוקו", "ממרח שוקולד נוטלה", "חלב עמיד", "רביולי גבינות", "גבינה עם שום שמיר למריחה"];
  var BUILTIN = [{ cat: "main", def: "tabMain", ph: "ph", empty: "empty", pos: 0 }, { cat: "tea", def: "tabTea", ph: "phTea", empty: "emptyTea", pos: 1 }];
  var A = window.RGAccount, M = window.RGMy, t = M.t;
  var uid = null, items = {}, catsMap = {}, pending = false, busy = false, again = false, offline = false, lastT = 0, editing = null, soonT = 0, rendering = false;
  var drag = null, idrag = null, needRender = false, noClick = false; // drag = a category row being reordered, idrag = an item being swiped
  var restoreDoc = null, fileGen = 0;

  function $(id) { return document.getElementById(id); }
  function on(id, ev, fn) { var el = $(id); if (el) el.addEventListener(ev, fn); } // a missing element (old cached page) never stops the app from loading
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function jparse(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
  function cacheKey(id) { return "rg-sbx-shopping:" + id; }
  function now() { lastT = Math.max(Date.now(), lastT + 1); return lastT; }
  function newId() { return now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function clean(s, n) { return String(s || "").replace(/\s+/g, " ").trim().slice(0, n); }
  var tab = lsGet("rg-sbx-shopping-tab") || "main";

  /* ---------- local cache (same key as before; "cats" is simply an extra field) ---------- */
  function loadLocal() {
    var c = uid ? jparse(lsGet(cacheKey(uid)), null) : null;
    items = (c && c.items && typeof c.items === "object") ? c.items : {};
    catsMap = (c && c.cats && typeof c.cats === "object") ? c.cats : {}; snap = stamp(items, null); csnap = stamp(catsMap, null);
    pending = !!(c && c.pending);
  }
  var snap = {}, csnap = {};
  function saveLocal() { snap = stamp(items, snap); csnap = stamp(catsMap, csnap); if (uid) lsSet(cacheKey(uid), JSON.stringify({ items: items, cats: catsMap, pending: pending })); }
  window.addEventListener("storage", function (e) { if (uid && e.key === cacheKey(uid)) { loadLocal(); render(); } });

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

  /* ---------- categories ---------- */
  function cats() {
    var map = {}, out = [], k, c;
    BUILTIN.forEach(function (s) { map[s.cat] = { cat: s.cat, pos: s.pos, created: 0, def: s.def, ph: s.ph, empty: s.empty }; });
    for (k in catsMap) { var r = catsMap[k]; if (!r || r.deleted || r.type !== "cat" || typeof r.cat !== "string") continue;
      var b = map[r.cat] || {};
      map[r.cat] = { cat: r.cat, pos: typeof r.pos === "number" ? r.pos : (b.pos || 0), created: r.created || 0, name: r.name, gone: r.gone, check: r.check, def: b.def, ph: b.ph, empty: b.empty }; }
    for (k in map) { c = map[k]; if (!c.gone) out.push(c); }
    return out.sort(function (a, b) { return (a.pos - b.pos) || (a.created - b.created) || (a.cat < b.cat ? -1 : 1); });
  }
  function catName(c) { return c.name || (c.def ? t(c.def) : "…"); }
  function catOf(cid) { var l = cats(); for (var i = 0; i < l.length; i++) if (l[i].cat === cid) return l[i]; return null; }
  function putCat(r) { var c = {}; for (var k in catsMap) c[k] = catsMap[k]; c[r.id] = r; catsMap = c; }
  function upCat(cid, patch) {
    var r = catsMap["c:" + cid], y = {}, k;
    if (r && !r.deleted) for (k in r) y[k] = r[k];
    else { var c = catOf(cid) || {}; y = { id: "c:" + cid, type: "cat", cat: cid, pos: typeof c.pos === "number" ? c.pos : 0, created: c.created || 0 }; }
    for (k in patch) { if (patch[k] === "" || patch[k] == null) delete y[k]; else y[k] = patch[k]; }
    y.at = now(); putCat(y);
  }
  function addCat(name) {
    name = clean(name, 40); if (!name) return null;
    var l = cats(), id = newId(), at = now(), pos = l.reduce(function (m, c) { return Math.max(m, c.pos); }, -1) + 1;
    putCat({ id: "c:" + id, type: "cat", cat: id, name: name, pos: pos, created: at, at: at });
    return id;
  }
  function setOrder(ids) { ids.forEach(function (cid, n) { var c = catOf(cid); if (c && c.pos !== n) upCat(cid, { pos: n }); }); }
  function listOf(x) { // the category an item shows in
    var l = x.list || "main", c = catOf(l); if (c) return l;
    var all = cats(); return all.length ? all[0].cat : "main";
  }
  function liveIn(cid) { var r = []; for (var k in items) { var x = items[k]; if (!x.deleted && listOf(x) === cid) r.push(x); } return r; }
  function delCat(cid) { liveIn(cid).forEach(function (x) { del(x.id); }); upCat(cid, { gone: 1 }); }
  function curTab() { var l = cats(); if (!l.some(function (c) { return c.cat === tab; })) tab = l.length ? l[0].cat : ""; return tab; }

  /* ---------- safety net ---------- */
  // Before every cloud write, the cloud copy that is about to be replaced is kept on this device (last BAK_N versions),
  // so nothing is ever lost even if a bug writes something wrong: rg-sbx-shopping-bak:<user id> = [{ t, items, cats }, ...]
  var BAK_N = 5, bulkOk = 0, failN = 0, syncErr = "", holdBlocked = false, blockedItems = null, blockedCats = null;
  function bakKey(id) { return "rg-sbx-shopping-bak:" + id; }
  function backup(cl, cc) {
    if (!uid || (!Object.keys(cl).length && !Object.keys(cc).length)) return;
    var l = jparse(lsGet(bakKey(uid)), []); if (!Array.isArray(l)) l = [];
    var last = l[l.length - 1];
    if (last && same(last.items || {}, cl) && same(last.cats || {}, cc)) return; // same as the newest backup
    l.push({ t: Date.now(), items: cl, cats: cc });
    while (l.length > BAK_N) l.shift();
    try { localStorage.setItem(bakKey(uid), JSON.stringify(l)); } catch (e) { l.splice(0, l.length - 1); lsSet(bakKey(uid), JSON.stringify(l)); }
  }
  function liveCount(m, isCat) { var n = 0; for (var k in m) { var x = m[k]; if (x && !x.deleted && !(isCat && x.gone)) n++; } return n; }
  // true when this write would remove most of what is in the cloud at once (and Ron did not just delete a whole category himself)
  function tooManyGone(next, cloud, isCat) {
    var SS = window.RGSyncStatus;
    if (SS) return SS.tooManyGone(next, cloud, Date.now(), bulkOk, isCat ? undefined : { keepGone: true });
    if (Date.now() < bulkOk) return false;
    var before = liveCount(cloud, isCat), after = liveCount(next, isCat), gone = before - after;
    return before >= 4 && gone >= 3 && gone * 2 > before;
  }

  /* ---------- sync ---------- */
  function statusFlags() {
    return { maySync: !!uid, uid: uid, blocked: holdBlocked, bulkUntil: bulkOk, err: syncErr, onLine: typeof navigator === "undefined" || navigator.onLine !== false, failN: failN, pending: pending, busy: busy, offline: offline };
  }
  function confirmBlocked() {
    if (window.RGSyncStatus) RGSyncStatus.closeDeletion();
    bulkOk = Date.now() + ((window.RGSyncStatus && RGSyncStatus.BULK_MS) || 60000);
    holdBlocked = false; syncErr = ""; offline = false; sync();
  }
  function restoreBlocked() {
    var SS = window.RGSyncStatus;
    if (SS) SS.closeDeletion();
    if (SS && blockedItems) items = SS.restoreLive(items, blockedItems, { keepGone: true });
    if (SS && blockedCats) catsMap = SS.restoreLive(catsMap, blockedCats);
    snap = stamp(items, null); csnap = stamp(catsMap, null);
    holdBlocked = false; pending = true; syncErr = ""; offline = false;
    saveLocal(); render(); sync();
  }
  function lastSyncKey(id) { return (window.RGSyncStatus && RGSyncStatus.LAST_PREFIX || "rg-sbx-shopping-lastsync:") + id; }
  function markLastSync() {
    if (!uid) return;
    lsSet(lastSyncKey(uid), String(Date.now()));
    paintLastSync();
  }
  function paintLastSync() {
    var el = $("lastsync"), cl = $("cloudat"), SS = window.RGSyncStatus;
    if (!uid) {
      if (el) el.textContent = "";
      if (cl) cl.textContent = "";
      return;
    }
    var ms = parseInt(lsGet(lastSyncKey(uid)) || "", 10);
    if (el) el.textContent = ms && SS && SS.formatSyncTime ? t("lastSync").replace("{t}", SS.formatSyncTime(ms)) : "";
    if (cl) {
      var cms = SS && SS.cloudUpdatedAt ? Date.parse(SS.cloudUpdatedAt) : NaN;
      cl.textContent = cms && SS && SS.formatSyncTime ? t("cloudAt").replace("{t}", SS.formatSyncTime(cms)) : "";
    }
  }
  /* Bottom line, same words as Listify. Saving is gold, synced is blue with a gold check. */
  function setStatus() {
    paintLastSync();
    var s = $("status"), SS = window.RGSyncStatus, k, doc, span, mark, raw;
    if (!s) return;
    if (!uid) k = "localOnly";
    else if (!SS) k = offline ? "offline" : busy ? "saving" : pending ? "waiting" : "synced";
    else k = SS.kind(statusFlags());
    if (k === "blocked" && SS) SS.openDeletion({ onYes: confirmBlocked, onNo: restoreBlocked });
    else if (SS) SS.closeDeletion();
    s.className = "status";
    if (k === "saving") s.className += " save";
    else if (k === "synced") s.className += " ok";
    else if (k === "waiting") s.className += " wait";
    else if (k === "offline" || k === "blocked" || (k && String(k).indexOf("syncError") === 0)) s.className += " off";
    while (s.firstChild) s.removeChild(s.firstChild);
    doc = s.ownerDocument || document;
    if (k === "synced") {
      mark = doc.createElement("span");
      mark.className = "syncmark";
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = "✓";
      span = doc.createElement("span");
      span.className = "status-txt";
      raw = t("synced").replace(/^✓\s*/, "");
      span.textContent = raw;
      s.appendChild(mark);
      s.appendChild(span);
      return;
    }
    span = doc.createElement("span");
    span.className = "status-txt";
    span.textContent = k === "waiting" ? t("syncWait") : (k ? t(k) : "");
    s.appendChild(span);
  }

  /* ---------- one-time list "ניקויים" (Ron, 2026-10-30) ----------
     Sandbox copy. Runs only when this sandbox already has a list named "חודש הבא".
     It does not read live Listify storage, so a fresh sandbox does not import that list.
     Once only: fixed ids "c:cl1" / "cl1-01".."cl1-13",
     a synced marker record "m:cleanse1" (in the cats row) and a local flag rg-sbx-shopping-cleanse1:<user id>.
     Skipped if a list with the same name already exists. Existing lists are never touched. Before adding, the whole
     Purchasify copy is saved on this device: rg-sbx-shopping-cleanse-bak:<user id>. Items are unselected, without a price. */
  var CL_TITLE = "ניקויים", CL_ITEMS = ["nattokinase for heart plaque", "parasite cleanse", "heavy metals cleanse", "fluoride cleanse with tamarind", "mold cleanse from the body", "mold cleanse from the apartment", "microplastics cleanse from the apartment and the body", "foreign protein by ardis", "air purifiers", "water distillers", "water filters", "rife machine", "ark of sweden drops"];
  function isRon() {
    // Sandbox categories only. Does not read live Listify storage.
    if (cats().some(function (c) { return clean(catName(c), 40) === "חודש הבא"; })) return true;
    return false;
  }
  function seedCleanse() {
    if (!uid || catsMap["m:cleanse1"] || lsGet("rg-sbx-shopping-cleanse1:" + uid) || !isRon()) return false;
    var exists = cats().some(function (c) { return clean(catName(c), 40) === CL_TITLE; }) || (catsMap["c:cl1"] && !catsMap["c:cl1"].deleted);
    if (!exists) {
      try { localStorage.setItem("rg-sbx-shopping-cleanse-bak:" + uid, JSON.stringify({ t: Date.now(), items: items, cats: catsMap })); } catch (e) { return false; }
      var pos = cats().reduce(function (m, c) { return Math.max(m, c.pos); }, -1) + 1, at = now();
      putCat({ id: "c:cl1", type: "cat", cat: "cl1", name: CL_TITLE, pos: pos, created: at, at: at });
      var ni = {}, k; for (k in items) ni[k] = items[k];
      CL_ITEMS.forEach(function (txt, n) { var id = "cl1-" + (n < 9 ? "0" : "") + (n + 1), a = now();
        if (!ni[id]) ni[id] = { id: id, text: txt, done: false, list: "cl1", ord: (n + 1) * 1000, created: a, at: a }; });
      items = ni;
    }
    putCat({ id: "m:cleanse1", type: "meta", done: 1, added: exists ? 0 : CL_ITEMS.length, at: now() });
    lsSet("rg-sbx-shopping-cleanse1:" + uid, "1");
    return true;
  }
  /* ---------- one-time list "טיפוח גוף" (Ron, 2026-10-30): same pattern, ids "c:bc1" / "bc1-01".."bc1-19",
     marker "m:bodycare1", local flag rg-sbx-shopping-bodycare1:<user id>, backup rg-sbx-shopping-bodycare-bak:<user id>.
     Placed after "ניקויים". ---------- */
  var BC_TITLE = "טיפוח גוף", BC_ITEMS = ["laundry detergent", "hand soap", "dish soap", "deodorant", "tongue scraper", "coconut water for the mouth", "ghee butter", "boar bristle brush", "nose strip", "pre shave", "post shave", "shaving gear", "toiletry bags", "towels", "trash bags", "talcum powder", "baby pasta", "self aid kit", "antifungal cream and spray"];
  function seedBodycare() {
    if (!uid || catsMap["m:bodycare1"] || lsGet("rg-sbx-shopping-bodycare1:" + uid) || !isRon()) return false;
    var exists = cats().some(function (c) { return clean(catName(c), 40) === BC_TITLE; }) || (catsMap["c:bc1"] && !catsMap["c:bc1"].deleted);
    if (!exists) {
      try { localStorage.setItem("rg-sbx-shopping-bodycare-bak:" + uid, JSON.stringify({ t: Date.now(), items: items, cats: catsMap })); } catch (e) { return false; }
      var pos = cats().reduce(function (m, c) { return Math.max(m, c.pos); }, -1) + 1, at = now();
      putCat({ id: "c:bc1", type: "cat", cat: "bc1", name: BC_TITLE, pos: pos, created: at, at: at });
      var ni = {}, k; for (k in items) ni[k] = items[k];
      BC_ITEMS.forEach(function (txt, n) { var id = "bc1-" + (n < 9 ? "0" : "") + (n + 1), a = now();
        if (!ni[id]) ni[id] = { id: id, text: txt, done: false, list: "bc1", ord: (n + 1) * 1000, created: a, at: a }; });
      items = ni;
    }
    putCat({ id: "m:bodycare1", type: "meta", done: 1, added: exists ? 0 : BC_ITEMS.length, at: now() });
    lsSet("rg-sbx-shopping-bodycare1:" + uid, "1");
    return true;
  }
  /* ---------- one-time list "פאשן" (Ron, 2026-10-30): same pattern, ids "c:fs1" / "fs1-01".."fs1-12",
     marker "m:fashion1", local flag rg-sbx-shopping-fashion1:<user id>, backup rg-sbx-shopping-fashion-bak:<user id>.
     Placed after "טיפוח גוף". ---------- */
  var FS_TITLE = "פאשן", FS_ITEMS = ["shorts", "pants", "socks", "sliders", "shoes 15 US width 4E fitville", "soles for shoes colorful", "hats", "beanies", "tshirts", "boxers organic cotton", "jackets", "wallets"];
  function seedFashion() {
    if (!uid || catsMap["m:fashion1"] || lsGet("rg-sbx-shopping-fashion1:" + uid) || !isRon()) return false;
    var exists = cats().some(function (c) { return clean(catName(c), 40) === FS_TITLE; }) || (catsMap["c:fs1"] && !catsMap["c:fs1"].deleted);
    if (!exists) {
      try { localStorage.setItem("rg-sbx-shopping-fashion-bak:" + uid, JSON.stringify({ t: Date.now(), items: items, cats: catsMap })); } catch (e) { return false; }
      var pos = cats().reduce(function (m, c) { return Math.max(m, c.pos); }, -1) + 1, at = now();
      putCat({ id: "c:fs1", type: "cat", cat: "fs1", name: FS_TITLE, pos: pos, created: at, at: at });
      var ni = {}, k; for (k in items) ni[k] = items[k];
      FS_ITEMS.forEach(function (txt, n) { var id = "fs1-" + (n < 9 ? "0" : "") + (n + 1), a = now();
        if (!ni[id]) ni[id] = { id: id, text: txt, done: false, list: "fs1", ord: (n + 1) * 1000, created: a, at: a }; });
      items = ni;
    }
    putCat({ id: "m:fashion1", type: "meta", done: 1, added: exists ? 0 : FS_ITEMS.length, at: now() });
    lsSet("rg-sbx-shopping-fashion1:" + uid, "1");
    return true;
  }
  /* ---------- six more one-time lists (Ron, 2026-10-30): same pattern as "פאשן", placed after it in this order.
     ids "c:<cat>" / "<cat>-01".., marker "m:<mark>", local flag rg-sbx-shopping-<mark>:<user id>, backup rg-sbx-shopping-<mark>-bak:<user id>. ---------- */
  var MORE_SEEDS = [
    { cat: "dr1", mark: "drinks1", title: "drinks", items: ["fridge", "refridgerator", "frozen fruits", "supplements", "blender", "coffee mugs", "coconut drinks"] },
    { cat: "fa1", mark: "fortify1", title: "fortification accessories", items: ["freezing hat", "electrolytes", "eye cover", "stimmers", "gua sha", "acupuncture pen", "light saber", "star keychain (has 5 buttons programmed to each his own: order food, order cab, voice reminder, ai voice call)", "room soap (liquid no water required)", "tuning forks"] },
    { cat: "sv1", mark: "savings1", title: "חסכונות", items: ["cash", "bit", "amazon", "iherb", "grok", "airbnb", "stocks", "crypto", "foreign currency cash", "cash for bitcoin"] },
    { cat: "tb1", mark: "tbd1", title: "tbd", items: ["Bee pollen (94 vitamins and minerals, 1 tbsp per day)", "netra tarpana", "natural eye health fixes", "apple of eve https://www.theworldsgreatestrejuvenation.com/products/apple-of-eve", "colloidal gold removes nanotech by Dr. David Nixon", "trip to countries where sex work is legal and promoted", "sex toys", "peterson academy $500 for 1 year", "udacity 3100ils per program: agentic ai, agentic ai for life scienses"] },
    { cat: "tr1", mark: "treat1", title: "treatments", items: ["medical pedicure", "reflexology", "hydrogen peroxide bath", "sea salt bath"] },
    { cat: "of1", mark: "office1", title: "משרד", items: ["chair libernovo", "chair heavyduty", "desk manual adjustable", "notebooks", "laptop screen wiper", "macbook", "iphone", "chargers", "safes", "different color keys + digital locks", "hemp notebooks", "pens", "faraday sleeves and bags", "wifi mobile and non mobile", "playstation", "movemate", "envelopes", "ohmni block wifi", "diffuser", "cigars", "candles", "freedom bulbs", "lapis lazulai", "emerald", "karnelien", "librem phone", "unplugged phone"] },
    { cat: "bk1", mark: "books1", title: "ספרים", items: [{"t": "As Long as Space Endures: Essays on the Kalacakra Tantra in Honor of H.H. the Dalai Lama", "u": "https://www.shambhala.com/browse-categories/as-long-as-space-endures-14905.html"}, {"t": "Jigme Lingpa", "u": "https://www.shambhala.com/authors/g-n/jigme-lingpa.html"}, {"t": "Shambhala Publications: Books, Audio, & More", "u": "https://www.shambhala.com"}, {"t": "Karmapas", "u": "https://www.shambhala.com/topic/karmapas/"}, {"t": "Nyingma: Mahayoga, Anuyoga, and Atiyoga, Part Two: Essential Teachings of the Eight Practice Lineages of Tibet, Volume 2 (The Treasury of Precious Instructions)", "u": "https://www.shambhala.com/browse-categories/nyingma-mahayoga-anuyoga-and-atiyoga-part-two.html"}, {"t": "Seven Line Prayer to Guru Rinpoche (Padmasambhava)", "u": "https://www.shambhala.com/topic/seven-line-prayer/"}, {"t": "Shambhala Pocket Library Series", "u": "https://www.shambhala.com/browse-categories/pocket-library.html"}, {"t": "Secret Teachings of Padmasambhava: Essential Instructions on Mastering the Energies of Life", "u": "https://www.shambhala.com/browse-categories/secret-teachings-of-padmasambhava-1311.html"}, {"t": "The Thirteen Core Indian Buddhist Texts: A Reader's Guide", "u": "https://www.shambhala.com/the-thirteen-core-indian-texts-a-readers-guide/"}, {"t": "The Precious Treasury of the Dharmadhatu", "u": "https://www.shambhala.com/browse-categories/the-precious-treasury-of-the-dharmadhatu.html"}, {"t": "Essential Buddhist Texts to Read", "u": "https://www.shambhala.com/topic/foundational-texts/"}, {"t": "Karmapas: Recognizing a Tulku", "u": "https://www.shambhala.com/snowlion_articles/karmapas-tulku-kagyu-lineage/"}, {"t": "Terma / Treasure Texts", "u": "https://www.shambhala.com/topic/terma-treasure-texts/"}, {"t": "Dream Yoga and the Practice of Natural Light", "u": "https://www.shambhala.com/snowlion_articles/dream-yoga-and-the-practice-of-natural-light-3/"}, "vimalamitra?", {"t": "Buddhist Topics", "u": "https://www.shambhala.com/buddhist-topics/"}, {"t": "The Nyingma School of Tibetan Buddhism", "u": "https://www.shambhala.com/topic/nyingma-tradition/"}] },
    { cat: "fu1", mark: "furniture1", title: "furniture", items: ["fashion cabinet", "squeegee broom", "supplements cabinet", "fitness and movement cabinet", "laundry baskets", "bed", "pillows", "blankets", "sheets", "pillow cases", "flooring", "wall paint", "air ventilator", "new ac", "fan", "alarm clocks", "lighting", "posters", "futon mat", "moon pillow"] },
    { cat: "sm1", mark: "smoke1", title: "עישונים", items: ["organic tobacco 300 at abudi tobacco", "cigarettes for 1600 for 4 packs"] },
    { cat: "ap1", mark: "apps1", title: "אפליקציות", items: ["grok 300", "proton 50 or 500", "spotify 30", "rav kav 170", "numero 40 NIS per month", "sms line 20 NIS"] },
    { cat: "pl1", mark: "pills1", title: "כדורים", items: ["relaxine", "nerven", "region", "lorivan", "paxxet", "seraquel", "trazodil"] }
  ];
  function seedOne(S) {
    if (!uid || catsMap["m:" + S.mark] || lsGet("rg-sbx-shopping-" + S.mark + ":" + uid) || !isRon()) return false;
    var exists = cats().some(function (c) { return clean(catName(c), 40) === S.title; }) || (catsMap["c:" + S.cat] && !catsMap["c:" + S.cat].deleted);
    if (!exists) {
      try { localStorage.setItem("rg-sbx-shopping-" + S.mark + "-bak:" + uid, JSON.stringify({ t: Date.now(), items: items, cats: catsMap })); } catch (e) { return false; }
      var pos = cats().reduce(function (m, c) { return Math.max(m, c.pos); }, -1) + 1, at = now();
      putCat({ id: "c:" + S.cat, type: "cat", cat: S.cat, name: S.title, pos: pos, created: at, at: at });
      var ni = {}, k; for (k in items) ni[k] = items[k];
      S.items.forEach(function (txt, n) { var id = S.cat + "-" + (n < 9 ? "0" : "") + (n + 1), a = now();
        if (!ni[id]) { var it = typeof txt === "string" ? { t: txt } : txt; ni[id] = { id: id, text: it.t, done: false, list: S.cat, ord: (n + 1) * 1000, created: a, at: a }; if (it.u) ni[id].url = it.u; } });
      items = ni;
    }
    putCat({ id: "m:" + S.mark, type: "meta", done: 1, added: exists ? 0 : S.items.length, at: now() });
    lsSet("rg-sbx-shopping-" + S.mark + ":" + uid, "1");
    return true;
  }
  /* one-time append "copper jewelry" (id tb1-10) to list "tbd" (Ron, 2026-10-30), marker "m:tbd2", local flag rg-sbx-shopping-tbd2:<user id>. */
  function seedTbd2() {
    if (!uid || catsMap["m:tbd2"] || lsGet("rg-sbx-shopping-tbd2:" + uid) || !isRon()) return false;
    if (!catsMap["c:tb1"] || catsMap["c:tb1"].deleted) return false;
    var T = "copper jewelry", k, has = !!items["tb1-10"], mx = 0;
    for (k in items) { var it = items[k]; if (it && it.list === "tb1") { if (String(it.text || "").trim().toLowerCase() === T && !it.deleted) has = true; if (it.ord > mx) mx = it.ord; } }
    if (!has) {
      try { localStorage.setItem("rg-sbx-shopping-tbd2-bak:" + uid, JSON.stringify({ t: Date.now(), items: items, cats: catsMap })); } catch (e) { return false; }
      var ni = {}, a = now(); for (k in items) ni[k] = items[k];
      ni["tb1-10"] = { id: "tb1-10", text: T, done: false, list: "tb1", ord: mx + 1000, created: a, at: a };
      items = ni;
    }
    putCat({ id: "m:tbd2", type: "meta", done: 1, added: has ? 0 : 1, at: now() });
    lsSet("rg-sbx-shopping-tbd2:" + uid, "1");
    return true;
  }
  function seedMore() { var any = false; MORE_SEEDS.forEach(function (S) { if (seedOne(S)) any = true; }); if (seedTbd2()) any = true; return any; }
  function freshenRec(rec, at) {
    var y = {}, k, f, F = {};
    for (k in rec) if (k !== "__proto__" && k !== "constructor" && k !== "prototype") y[k] = rec[k];
    if (y._f && typeof y._f === "object") for (k in y._f) F[k] = y._f[k];
    y.at = at;
    if (!y.deleted) for (f in y) if (f !== "id" && f !== "at" && f !== "_f") F[f] = at;
    F["~"] = at;
    y._f = F;
    return y;
  }
  /* The file replaces the sandbox copy. Cloud rows the file does not have become tombstones, so the next merge does not put them back. */
  function adoptMap(snapshot, cloud, at) {
    var out = {}, k, x, c;
    snapshot = snapshot && typeof snapshot === "object" ? snapshot : {};
    cloud = cloud && typeof cloud === "object" ? cloud : {};
    for (k in snapshot) {
      x = snapshot[k];
      if (!x || typeof x !== "object" || typeof x.id !== "string") continue;
      out[k] = freshenRec(x, at);
    }
    for (k in cloud) {
      c = cloud[k];
      if (!c || typeof c !== "object" || out[k] || c.deleted) continue;
      out[k] = { id: typeof c.id === "string" ? c.id : k, deleted: true, at: at, _f: { "~": at } };
    }
    return out;
  }
  function sync() {
    if (APP !== "sbxshopping") return Promise.resolve();
    if (!uid || !A) return Promise.resolve();
    if (busy) { again = true; return Promise.resolve(); }
    busy = true; again = false; setStatus();
    var who = uid, sentI = null, sentC = null, blocked = false, SS = window.RGSyncStatus, gen = fileGen, roundRestore = false;
    return Promise.all([A.get(APP, KEY), A.get(APP, CKEY)]).then(function (r) {
      if (who !== uid || gen !== fileGen) return;
      var cl = (r[0] && r[0].items && typeof r[0].items === "object") ? r[0].items : {};
      var cc = (r[1] && r[1].cats && typeof r[1].cats === "object") ? r[1].cats : {};
      var mi, mc, restoring = !!restoreDoc;
      roundRestore = restoring;
      if (restoring) {
        bulkOk = Date.now() + ((SS && SS.BULK_MS) || 60000);
        items = adoptMap(restoreDoc.items, cl, now());
        catsMap = adoptMap(restoreDoc.cats, cc, now());
        snap = stamp(items, null); csnap = stamp(catsMap, null);
        mi = items; mc = catsMap;
        saveLocal(); render();
      } else {
        snap = stamp(items, snap); csnap = stamp(catsMap, csnap);
        mi = merge(items, cl); mc = merge(catsMap, cc);
        if (!same(mi, items) || !same(mc, catsMap)) { items = mi; catsMap = mc; snap = stamp(items, null); csnap = stamp(catsMap, null); saveLocal(); render(); }
      }
      var sA = seedCleanse(), sB = seedBodycare(), sC = seedFashion(), sD = seedMore();
      if (sA || sB || sC || sD) { mi = items; mc = catsMap; saveLocal(); render(); }
      var jobs = [], wI = !same(mi, cl), wC = !same(mc, cc);
      var blockI = wI && tooManyGone(mi, cl, false), blockC = wC && tooManyGone(mc, cc, true);
      if (blockI) { wI = false; blocked = true; try { console.warn("Purchasify: a write that removes most items was blocked; the cloud copy is untouched"); } catch (e) {} }
      if (blockC) { wC = false; blocked = true; try { console.warn("Purchasify: a write that removes most categories was blocked; the cloud copy is untouched"); } catch (e) {} }
      blockedItems = blockI ? cl : null;
      blockedCats = blockC ? cc : null;
      if (blocked) { holdBlocked = true; pending = true; saveLocal(); }
      else holdBlocked = false;
      if (wI || wC) backup(cl, cc);
      if (wI) { sentI = mi; jobs.push(A.set(APP, KEY, { v: 1, items: mi })); }
      if (wC) { sentC = mc; jobs.push(A.set(APP, CKEY, { v: 1, cats: mc })); }
      return Promise.all(jobs);
    }).then(function () {
      if (who !== uid || gen !== fileGen) return;
      var sentSame = (!sentI || same(sentI, items)) && (!sentC || same(sentC, catsMap));
      var next = SS ? SS.applySuccess(null, { blocked: blocked, sentSame: sentSame }) : { holdBlocked: blocked, clearPending: !blocked && sentSame, again: !blocked && !sentSame };
      offline = false; syncErr = ""; failN = 0; holdBlocked = !!next.holdBlocked;
      if (roundRestore && !blocked) restoreDoc = null;
      if (blocked) return;
      if (next.clearPending) { pending = false; saveLocal(); }
      else if (next.again) again = true;
      if (SS && SS.shouldStampSync && SS.shouldStampSync({
        downloaded: true,
        uploaded: !!(sentI || sentC),
        nothingToUpload: !sentI && !sentC,
        blocked: false,
        failed: false,
        pendingLeft: !next.clearPending
      })) markLastSync();
    }, function (e) {
      if (who !== uid || gen !== fileGen) return;
      if (e && e.code === "signed_out") { offline = false; syncErr = ""; return; }
      var next = SS ? SS.applyFailure({ failN: failN }, e, typeof navigator === "undefined" || navigator.onLine !== false) : { offline: true, syncErr: "", failN: failN };
      offline = next.offline; syncErr = next.syncErr; failN = next.failN;
    }).then(function () {
      busy = false; setStatus();
      if (again && who === uid) { again = false; sync(); }
    });
  }
  function syncSoon() { clearTimeout(soonT); soonT = setTimeout(sync, 250); }
  function changed() { pending = true; saveLocal(); render(); syncSoon(); }

  setInterval(function () { if (uid && document.visibilityState === "visible") sync(); }, POLL_MS);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sync(); });
  window.addEventListener("focus", function () { sync(); });
  window.addEventListener("online", function () { offline = false; syncErr = ""; sync(); });
  window.addEventListener("offline", function () { offline = true; syncErr = ""; setStatus(); });

  /* ---------- actions ---------- */
  /* price: optional, in ₪, decimals allowed; stored on the item as a number ("price"), synced with it; no price = 0 in the sums */
  function parsePrice(v) {
    v = String(v == null ? "" : v).replace(/[₪\s\u00a0]/g, "").replace(/,/g, ".");
    if (!v) return null;
    if (!/^\d*\.?\d*$/.test(v) || v === ".") return NaN;
    var n = Math.round(parseFloat(v) * 100) / 100;
    return isFinite(n) && n >= 0 && n < 1e7 ? n : NaN;
  }
  var NF = null;
  function fmtPrice(n) { try { NF = NF || new Intl.NumberFormat("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); return NF.format(n || 0); } catch (e) { return String(Math.round((n || 0) * 100) / 100); } }
  /* order inside a category: "ord" (set when an item is dragged with ☰); items never dragged keep their creation time;
     add() and moveItem() give a new item an "ord" just below the smallest one, so it lands at the TOP */
  function ordOf(x) { return typeof x.ord === "number" && isFinite(x.ord) ? x.ord : (x.created || 0); }
  function setItemOrder(ids, f) { f = f || "ord"; ids.forEach(function (id, n) { var x = items[id], p = {}; p[f] = (n + 1) * 1000; if (x && !x.deleted && x[f] !== p[f]) upd(id, p); }); }
  /* order inside "נבחר": "dord" (set when a selected item is dragged with ☰); an item without it (just selected) goes to the bottom */
  function dordOf(x) { return typeof x.dord === "number" && isFinite(x.dord) ? x.dord : Infinity; }
  function toggleDone(id) { var x = items[id]; if (!x || x.deleted) return; upd(id, { done: !x.done, dord: null }); }
  /* checklist mode (Ron 1.11, same as Listify): per list, category record field check: 1 (synced). No field = regular list.
     In a checklist each item has its own "ck" (true = checked): ✓, moves to the bottom, no strikethrough, no fading. */
  function isChk(cid) { var c = catOf(cid); return !!(c && c.check); }
  /* Checkbox square: ✓ is mark "ok" (and ck in a checklist). ✕ is mark "no". A tap toggles ✓. */
  function showingOk(x) { return !!(x && (x.mark === "ok" || (x.mark !== "no" && isChk(listOf(x)) && x.ck))); }
  function toggleMark(id, dir) {
    var x = items[id]; if (!x || x.deleted || (dir !== "ok" && dir !== "no")) return false;
    var chk = isChk(listOf(x));
    if (dir === "ok") {
      if (showingOk(x)) upd(id, { mark: null, ck: null });
      else upd(id, { mark: "ok", ck: chk ? true : null });
    } else if (x.mark === "no") upd(id, { mark: null });
    else upd(id, { mark: "no", ck: null });
    return true;
  }
  function toggleCk(id) { return toggleMark(id, "ok"); }
  function priceOf(x) { return typeof x.price === "number" && isFinite(x.price) ? x.price : 0; }
  function add(text, cid, price, note) {
    text = clean(text, 200); if (!text) return;
    var id = newId(), at = now(); items[id] = { id: id, text: text, done: false, created: at, at: at };
    if (typeof price === "number" && isFinite(price)) items[id].price = price;
    note = clean(note || "", 500); if (note) items[id].note = note; // optional short note (like Listify); old items simply have none
    cid = cid || curTab(); if (cid && cid !== "main") items[id].list = cid;
    items[id].ord = topOrd(cid || "main", id);
  }
  /* a new (or moved) item goes to the TOP of its category (Ron, 2026-10-30): one step before the smallest order there */
  function topOrd(cid, skip) {
    var m = Infinity;
    for (var k in items) { var y = items[k]; if (k !== skip && y && !y.deleted && !y.done && y.type !== "cat" && listOf(y) === cid) m = Math.min(m, ordOf(y)); }
    return m === Infinity ? 1000 : m - 1000;
  }
  function upd(id, patch) { var x = items[id]; if (!x || x.deleted) return; var y = {}, k; for (k in x) y[k] = x[k]; for (k in patch) { if (patch[k] == null) delete y[k]; else y[k] = patch[k]; } y.at = now(); items[id] = y; }
  function del(id) { var x = items[id]; if (!x) return; items[id] = { id: id, deleted: true, at: now() }; }
  function moveItem(id, cid) { var x = items[id]; if (!x || x.deleted || listOf(x) === cid) return false; upd(id, { list: cid === "main" ? null : cid, ord: topOrd(cid, id) }); return true; }

  /* ---------- render ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  /* Search reads the field and paints a view. It never calls saveLocal, upd, or setOrder. */
  function fold(s) { return String(s == null ? "" : s).toLocaleLowerCase("en"); }
  function searchRaw() {
    var el = $("list-search");
    return el ? String(el.value || "").replace(/^\s+|\s+$/g, "") : "";
  }
  function hit(text, q) {
    if (q == null) q = searchRaw();
    if (!q) return false;
    return fold(text).indexOf(fold(q)) !== -1;
  }
  function hi(text) {
    var raw = String(text == null ? "" : text), q = searchRaw(), re, out, last, m;
    if (!q) return esc(raw);
    try { re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"); }
    catch (e) { return esc(raw); }
    out = ""; last = 0;
    while ((m = re.exec(raw))) {
      if (!m[0]) { re.lastIndex++; continue; }
      out += esc(raw.slice(last, m.index)) + '<mark class="qhit">' + esc(m[0]) + "</mark>";
      last = m.index + m[0].length;
    }
    return out + esc(raw.slice(last));
  }
  function itemHit(x, q) { return hit(x.text, q) || hit(x.note || "", q); }
  function row(x) {
    var showC = isChk(listOf(x)), g = x.mark === "no" ? "no" : showingOk(x) ? "ok" : "";
    var hasP = typeof x.price === "number" && isFinite(x.price), id = esc(x.id);
    var txt = editing === x.id
      ? '<div class="ebox"><input class="edit" data-edit="' + id + '" maxlength="200" enterkeyhint="done" value="' + esc(x.text) + '" aria-label="' + esc(t("edit")) + '">' +
        '<textarea class="enote" data-enote="' + id + '" maxlength="500" rows="2" placeholder="' + esc(t("phNote")) + '" aria-label="' + esc(t("note")) + '">' + esc(x.note || "") + "</textarea></div>"
      : '<span class="txt" role="button" tabindex="0" data-a="edit" title="' + esc(t("edit")) + '">' + hi(x.text) +
        (x.note ? '<span class="note">' + hi(x.note) + "</span>" : '<span class="addnote">' + esc(t("addNote")) + "</span>") + "</span>";
    // the price column: always an input, typed right in the list (saved on Enter / leaving the field)
    var pin = '<input class="pin" data-price="' + id + '" type="text" inputmode="decimal" maxlength="10" enterkeyhint="done" autocomplete="off" placeholder="₪" value="' + (hasP ? esc(String(x.price)) : "") + '" aria-label="' + esc(t("priceLabel") + ": " + x.text) + '">';
    var cls = (x.done ? "done" : (showC && x.ck) ? "ckd" : ""); if (g) cls = (cls ? cls + " " : "") + "mk-" + g;
    var box = editing === x.id ? "" : '<button type="button" class="ckbox' + (g ? " on-" + g : "") + '" data-a="ck" role="checkbox" aria-checked="' + (g === "ok" ? "true" : "false") + '" aria-label="' + esc((g === "no" ? t("markNo") : g === "ok" ? t("markOk") : t("check")) + ": " + x.text) + '">' + (g === "ok" ? "✓" : g === "no" ? "✕" : "") + "</button>";
    return '<li data-id="' + id + '"' + (cls ? ' class="' + cls + '"' : "") + '>' + (editing === x.id ? "" : '<span class="hdl" aria-label="' + esc(t("handleItem")) + '" title="' + esc(t("handleItem")) + '">☰</span>') +
      box + txt + (x.url && /^https?:\/\//i.test(x.url) && editing !== x.id ? '<a class="ulink" href="' + esc(x.url) + '" target="_blank" rel="noopener" title="' + esc(x.url) + '" aria-label="' + esc(x.text) + ' (link)">🔗</a>' : "") + pin + "</li>";
  }
  function sumNow() { // the total line; a price being typed counts live, before it is saved
    var cur = curTab(), chk = isChk(cur), tot = 0, sel = 0, any = false, ae = document.activeElement, live = null;
    if (ae && ae.getAttribute && ae.getAttribute("data-price")) { var v = parsePrice(ae.value); if (!(typeof v === "number" && isNaN(v))) live = { id: ae.getAttribute("data-price"), v: v || 0 }; }
    if (uid) for (var k in items) { var x = items[k]; if (x.deleted || listOf(x) !== cur) continue; any = true;
      var p = live && live.id === x.id ? live.v : priceOf(x); tot += p; if (chk ? x.ck : x.done) sel += p; }
    var sum = $("sum"); if (!sum) return; sum.hidden = !any;
    // Ron 1.11: total of the whole list + selected + not selected (in a checklist: checked / not checked)
    sum.innerHTML = '<span class="tot">' + esc(t("sumTotal")) + ': <b>' + esc(fmtPrice(tot)) + " ₪</b></span>" + (chk ?
      '<span class="sel">' + esc(t("sumSel")) + ': <b>' + esc(fmtPrice(sel)) + " ₪</b></span>" +
      '<span class="sel">' + esc(t("sumUnsel")) + ': <b>' + esc(fmtPrice(tot - sel)) + " ₪</b></span>" : "");
  }
  function commitPrice(inp) {
    var id = inp.getAttribute("data-price"), x = items[id]; if (!x || x.deleted) return true;
    var v = parsePrice(inp.value);
    if (typeof v === "number" && isNaN(v)) { inp.classList.add("bad"); return false; }
    inp.classList.remove("bad");
    var old = typeof x.price === "number" ? x.price : null;
    if (v !== old) { upd(id, { price: v }); pending = true; saveLocal(); syncSoon(); } // null removes the price
    inp.value = v == null ? "" : String(v);
    sumNow(); return true;
  }
  function searchView() {
    var q = searchRaw(), html = "", any = false;
    cats().forEach(function (c) {
      var nameHit = hit(catName(c), q), all = [], k, x;
      for (k in items) { x = items[k]; if (x && !x.deleted && x.type !== "cat" && listOf(x) === c.cat) all.push(x); }
      if (!nameHit && !all.some(function (it) { return itemHit(it, q); })) return;
      any = true;
      var chkM = isChk(c.cat);
      all.sort(function (a, b) { return (ordOf(a) - ordOf(b)) || ((a.created || 0) - (b.created || 0)); });
      var act = all, done = [];
      if (chkM) { done = act.filter(function (it) { return !!it.ck; }); act = act.filter(function (it) { return !it.ck; }); }
      else {
        done = act.filter(function (it) { return it.mark === "ok"; });
        act = act.filter(function (it) { return it.mark !== "ok"; });
        done.sort(function (a, b) { var p = dordOf(a), qq = dordOf(b); return p !== qq ? (p < qq ? -1 : 1) : ((a.at || 0) - (b.at || 0)); });
      }
      function vis(arr) { return nameHit ? arr : arr.filter(function (it) { return itemHit(it, q); }); }
      var doneV = vis(done), actV = vis(act);
      var head = chkM ? "✓ " + (document.documentElement.lang !== "en" ? "סומנו" : "Checked") : (document.documentElement.lang !== "en" ? "נבחרים" : "Chosen");
      var body = (doneV.length ? '<div class="donehead"><h2>' + esc(head) + " (" + doneV.length + ')</h2></div><div class="card listcard"><ul class="list">' + doneV.map(row).join("") + "</ul></div>" : "") +
        (actV.length ? '<div class="card listcard"><ul class="list">' + actV.map(row).join("") + "</ul></div>" : "");
      if (!body) body = '<div class="card empty"><p>' + esc(t("emptyCat")) + "</p></div>";
      html += '<section class="srchsec"><h2 class="srchhead">' + hi(catName(c)) + "</h2>" + body + "</section>";
    });
    if (!any) return '<div class="card empty"><p>' + esc(t("searchEmpty")) + "</p></div>";
    return html;
  }
  function render() {
    if (!$("active")) return;
    if (drag || idrag) { needRender = true; return; } // never rebuild under a finger that is dragging
    var cur = curTab(), c = catOf(cur) || {};
    var act = [], done = [];
    var unm = false; // one list only (Ron 31.10): items once marked "נבחר" are unmarked and stay in the regular list
    if (uid) for (var k in items) { var x = items[k]; if (x.deleted || x.type === "cat") continue; if (x.done) { upd(k, { done: false, dord: null }); x = items[k]; unm = true; } if (listOf(x) === cur) act.push(x); }
    if (unm) { pending = true; saveLocal(); syncSoon(); }
    renderCats();
    var hint = $("cathint"); hint.textContent = t("catHint"); hint.hidden = !uid || !!lsGet("rg-sbx-shopping-hint2");
    var ph = c.ph || "ph", ai = $("add-input");
    ai.setAttribute("data-i18n-ph", ph); ai.setAttribute("data-i18n-label", ph); ai.placeholder = t(ph); ai.setAttribute("aria-label", t(ph));
    $("empty-p").textContent = c.empty ? t(c.empty) : t("emptyCat");
    $("suggest").hidden = cur !== "main";
    act.sort(function (a, b) { return (ordOf(a) - ordOf(b)) || ((a.created || 0) - (b.created || 0)); }); // Ron's priority order (☰ drag), new items at the top
    var chkM = isChk(cur);
    if (chkM) { done = act.filter(function (x) { return !!x.ck; }); act = act.filter(function (x) { return !x.ck; }); } // checklist: existing checked section above
    else { done = act.filter(function (x) { return x.mark === "ok"; }); act = act.filter(function (x) { return x.mark !== "ok"; }); } // ✓ moves into נבחרים; clearing it returns the item
    if (!chkM) done.sort(function (a, b) { var p = dordOf(a), q = dordOf(b); return p !== q ? (p < q ? -1 : 1) : ((a.at || 0) - (b.at || 0)); });
    var keep = null, ae = document.activeElement;
    var pk = null; if (ae && ae.getAttribute && ae.getAttribute("data-price")) pk = { id: ae.getAttribute("data-price"), v: ae.value, s: ae.selectionStart, e: ae.selectionEnd, bad: ae.classList.contains("bad") }; // a price being typed survives a re-render (sync)
    if (editing && ae && ae.getAttribute && ae.getAttribute("data-edit") === editing) keep = { v: ae.value, s: ae.selectionStart, e: ae.selectionEnd };
    var nk = null; if (editing) { var na = document.querySelector('[data-enote="' + editing + '"]'); if (na) nk = { v: na.value, f: ae === na, s: na.selectionStart, e: na.selectionEnd }; }
    if (editing && !keep) { var ia = document.querySelector('[data-edit="' + editing + '"]'); if (ia) keep = { v: ia.value, s: ia.value.length, e: ia.value.length, nofocus: !!(nk && nk.f) }; }
    if (editing && (!items[editing] || items[editing].deleted)) editing = null;
    rendering = true; // replacing the rows blurs an open edit box; that blur must not count as "done editing"
    $("active").innerHTML = act.map(row).join("");
    $("active-card").hidden = !act.length;
    $("done").innerHTML = done.map(row).join("");
    $("done-wrap").hidden = !done.length;
    $("done-h").textContent = chkM ? "✓ " + (document.documentElement.lang !== "en" ? "סומנו" : "Checked") + " (" + done.length + ")" : (document.documentElement.lang !== "en" ? "נבחרים" : "Chosen") + " (" + done.length + ")";
    sumNow();
    $("empty").hidden = !!(act.length || done.length);
    if (editing) {
      var inp = document.querySelector('[data-edit="' + editing + '"]');
      var nta = document.querySelector('[data-enote="' + editing + '"]');
      if (nta && nk) nta.value = nk.v;
      if (nta && nk && nk.f && !pk) { if (inp && keep) inp.value = keep.v; nta.focus(); try { nta.setSelectionRange(nk.s, nk.e); } catch (e) {} }
      else if (inp && !pk) { if (keep) { inp.value = keep.v; } inp.focus(); try { if (keep && !keep.nofocus) inp.setSelectionRange(keep.s, keep.e); } catch (e) {} }
    }
    if (pk) { var pi = document.querySelector('[data-price="' + pk.id + '"]'); if (pi) { pi.value = pk.v; if (pk.bad) pi.classList.add("bad"); pi.focus(); try { pi.setSelectionRange(pk.s, pk.e); } catch (e) {} } }
    var qOn = !!searchRaw(), so = $("search-out");
    if (so) { so.hidden = !qOn; if (qOn) so.innerHTML = searchView(); }
    if (qOn) {
      $("active-card").hidden = true;
      $("done-wrap").hidden = true;
      $("empty").hidden = true;
      if ($("sum")) $("sum").hidden = true;
    }
    rendering = false;
    setStatus();
  }
  function commitEdit(inp, cancel) {
    var id = inp.getAttribute("data-edit"); if (editing !== id) return;
    editing = null;
    var v = clean(inp.value, 200), x = items[id], na = document.querySelector('[data-enote="' + id + '"]');
    if (!cancel && x && !x.deleted) {
      if (!v) { del(id); changed(); return; }
      var patch = {}, any = false;
      if (v !== x.text) { patch.text = v; any = true; }
      if (na) { var nt = clean(na.value, 500); if (nt !== (x.note || "")) { patch.note = nt || null; any = true; } } // empty note = removed
      if (any) { upd(id, patch); changed(); return; }
    }
    render();
  }


  /* ---------- sheets (add / rename / menu) ---------- */
  function sheet(html, onClick) {
    closeSheet();
    var w = document.createElement("div"); w.className = "sheetwrap"; w.id = "sheet";
    w.innerHTML = '<div class="sheet card" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.appendChild(w);
    var opened = Date.now(); // the finger that opened the sheet (long-press) also sends a late click: ignore clicks in the first moments
    w.addEventListener("click", function (e) { if (Date.now() - opened < 450) { e.preventDefault(); return; } if (e.target === w) { closeSheet(); return; } var b = e.target.closest("[data-s]"); if (b) onClick(b.getAttribute("data-s"), w, e); });
    w.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
    var f = w.querySelector("input") || w.querySelector("button"); if (f) setTimeout(function () { f.focus(); if (f.select) f.select(); }, 30);
    return w;
  }
  function closeSheet() { var w = $("sheet"); if (w) w.parentNode.removeChild(w); }
  function nameSheet(title, value, isNew, done) {
    var w = sheet('<h3>' + esc(title) + '</h3><form class="sform" autocomplete="off"><input type="text" class="s-name" maxlength="40" enterkeyhint="done" value="' + esc(value || "") + '" placeholder="' + esc(t("catPh")) + '" aria-label="' + esc(t("catPh")) + '">' +
      '<div class="row"><button type="submit" class="btn pri">' + esc(t(isNew ? "create" : "save")) + '</button><button type="button" class="btn" data-s="x">' + esc(t("cancel")) + "</button></div></form>",
      function (a) { if (a === "x") closeSheet(); });
    w.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault(); var v = clean(w.querySelector(".s-name").value, 40); if (!v) { w.querySelector(".s-name").focus(); return; }
      closeSheet(); done(v);
    });
  }
  function hideHint() { lsSet("rg-sbx-shopping-hint2", "1"); var h = $("cathint"); if (h) h.hidden = true; }
  function renameCat(cid) {
    var c = catOf(cid); if (!c) return;
    nameSheet(t("renameTitle"), catName(c), false, function (v) { if (v !== catName(c)) { upCat(cid, { name: v }); changed(); } });
  }
  function deleteCat(cid) {
    var c = catOf(cid); if (!c) return;
    if (cats().length <= 1) { window.alert(t("lastCat")); return; }
    if (window.confirm(t("confirmDelCat").replace("{x}", catName(c)))) { bulkOk = Date.now() + 60000; delCat(cid); if (tab === cid) tab = ""; lsSet("rg-sbx-shopping-tab", curTab()); changed(); }
  }
  /* move one item to another category through a small menu (same save + sync as dragging it onto a category) */
  var toastT = 0;
  function toast(msg, undo) {
    var el = $("toast"); if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.appendChild(el); }
    el.innerHTML = '<span class="tmsg">' + esc(msg) + "</span>" + (undo ? '<button type="button" class="tundo">' + esc(t("undo")) + "</button>" : "");
    el.classList.toggle("act", !!undo);
    if (undo) el.querySelector(".tundo").addEventListener("click", function () { el.classList.remove("on", "act"); clearTimeout(toastT); undo(); });
    el.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(function () { el.classList.remove("on", "act"); }, undo ? 5000 : 2200);
  }
  function delWithUndo(id) {
    var x = items[id]; if (!x || x.deleted) return;
    var keep = {}, k; for (k in x) keep[k] = x[k];
    if (editing === id) editing = null;
    del(id); changed();
    toast(t("deleted").replace("{x}", keep.text), function () { keep.at = now(); items[id] = keep; changed(); });
  }
  function moveTo(id, cid) {
    var c = catOf(cid); if (!c) return;
    if (editing === id) editing = null;
    if (moveItem(id, cid)) { changed(); toast(t("movedTo").replace("{x}", catName(c))); }
  }
  function moveMenu(id) {
    var x = items[id]; if (!x || x.deleted) return;
    var from = listOf(x), others = cats().filter(function (c) { return c.cat !== from; });
    var html = '<h3>' + esc(t("moveTitle")) + '</h3><p class="mnote">' + esc(x.text) + "</p>";
    if (others.length) html += '<div class="mlist">' + others.map(function (c) { return '<button type="button" class="mi" data-s="to:' + esc(c.cat) + '"><span class="mn">' + esc(catName(c)) + '</span><span class="mc">' + liveIn(c.cat).length + "</span></button>"; }).join("") + "</div>";
    else html += '<p class="mnote">' + esc(t("noOther")) + '</p><button type="button" class="mi big" data-s="new">' + esc("＋ " + t("catAdd")) + "</button>";
    html += '<div class="mrow"><button type="button" class="mi" data-s="x">' + esc(t("cancel")) + '</button><button type="button" class="mi dng" data-s="del">' + esc(t("delItem")) + "</button></div>";
    sheet(html, function (a) {
      if (a === "x") { closeSheet(); return; }
      if (a === "del") { closeSheet(); delWithUndo(id); return; }
      if (a === "new") { nameSheet(t("catAdd"), "", true, function (v) { var nid = addCat(v); if (nid) moveTo(id, nid); }); return; }
      if (a.indexOf("to:") === 0) { closeSheet(); moveTo(id, a.slice(3)); }
    });
  }
  function selectTab(cid) { tab = cid; editing = null; lsSet("rg-sbx-shopping-tab", tab); render(); }

  /* ---------- drag to reorder (categories in edit mode, items in a category) ----------
     A ☰ handle (touch-action: none) lifts the row at once; elsewhere on the row a press-and-hold of opts.hold ms lifts it
     (opts.hold = 0: handle only). The lifted row follows the finger (transform, never moved in the DOM, so pointer
     capture holds), the other rows shift live to show the drop spot, and the scroller (an element, or the page when
     opts.scroller is null) auto-scrolls near its edges. Drop = opts.onDrop(new id order). Works the same in RTL. */
  function sortable(o) {
    var list = o.list, SLOP = 8, timer = 0, raf = 0;
    function off() { return o.scroller ? o.scroller.scrollTop : (window.scrollY || window.pageYOffset || 0); }
    function rows() { return [].slice.call(list.querySelectorAll(":scope > " + o.rowSel)); }
    function lift() {
      var d = drag; if (!d || d.lifted || d.list !== list) return;
      d.lifted = true; d.rows = rows(); d.from = d.rows.indexOf(d.el); d.to = d.from;
      if (d.from < 0) { drag = null; return; }
      var base = off();
      d.mids = d.rows.map(function (r) { var b = r.getBoundingClientRect(); return b.top + base + b.height / 2; });
      var nx = d.rows[d.from + 1] || d.rows[d.from - 1];
      d.step = nx ? Math.abs(d.mids[d.rows.indexOf(nx)] - d.mids[d.from]) : d.el.offsetHeight;
      d.y0 = d.cy + base;
      d.el.classList.add("lifted"); list.classList.add("dragging"); document.body.classList.add("sorting");
      try { d.el.setPointerCapture(d.pid); } catch (e) {}
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
      follow(); loop();
    }
    function follow() {
      var d = drag; if (!d || !d.lifted || d.list !== list) return;
      var dy = d.cy + off() - d.y0, mid = d.mids[d.from] + dy, to = 0, n = d.mids.length;
      for (var i = 0; i < n; i++) if (i !== d.from && d.mids[i] < mid) to++;
      var lo = d.mids[0] - d.mids[d.from], hi = d.mids[n - 1] - d.mids[d.from];
      dy = Math.max(lo - d.step * 0.45, Math.min(hi + d.step * 0.45, dy));
      d.el.style.setProperty("--dy", dy + "px");
      if (to !== d.to) {
        d.to = to;
        d.rows.forEach(function (r, i) {
          if (r === d.el) return;
          var s = 0; if (d.from < to && i > d.from && i <= to) s = -d.step; else if (d.from > to && i >= to && i < d.from) s = d.step;
          r.style.transform = s ? "translateY(" + s + "px)" : "";
        });
      }
    }
    function loop() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function tick() {
        var d = drag; if (!d || !d.lifted || d.list !== list) return;
        var top = 0, bot = window.innerHeight, E = o.edge || 60, sp = 0;
        if (o.scroller) { var r = o.scroller.getBoundingClientRect(); top = Math.max(0, r.top); bot = Math.min(bot, r.bottom); }
        if (d.cy < top + E) sp = -Math.ceil((top + E - d.cy) / 4); else if (d.cy > bot - E) sp = Math.ceil((d.cy - (bot - E)) / 4);
        sp = Math.max(-20, Math.min(20, sp));
        if (sp) { var b = off(); if (o.scroller) o.scroller.scrollTop += sp; else window.scrollBy(0, sp); if (off() !== b) follow(); }
        raf = requestAnimationFrame(tick);
      });
    }
    function finish(commit) {
      var d = drag; clearTimeout(timer); cancelAnimationFrame(raf);
      if (!d || d.list !== list) return;
      drag = null; document.body.classList.remove("sorting");
      if (d.lifted) {
        noClick = true; setTimeout(function () { noClick = false; }, 350);
        list.classList.remove("dragging"); d.el.classList.remove("lifted"); d.el.style.removeProperty("--dy");
        d.rows.forEach(function (r) { r.style.transform = ""; });
        if (commit && d.to !== d.from) {
          var ids = d.rows.map(function (r) { return r.getAttribute(o.idAttr || "data-cat"); }), id = ids.splice(d.from, 1)[0];
          ids.splice(d.to, 0, id); needRender = false; o.onDrop(ids, id); return;
        }
      }
      if (needRender && !idrag) { needRender = false; render(); }
    }
    list.addEventListener("pointerdown", function (e) {
      if (drag || (e.pointerType === "mouse" && e.button !== 0)) return;
      var li = e.target.closest(o.rowSel); if (!li || li.parentNode !== list || !o.canStart(e, li)) return;
      var onHandle = !!e.target.closest(".hdl");
      if (!onHandle && !o.hold) return;
      drag = { list: list, el: li, pid: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, cy: e.clientY, lifted: false };
      if (onHandle) { e.preventDefault(); e.stopPropagation(); lift(); }
      else timer = setTimeout(function () { if (drag && !drag.lifted) lift(); }, o.hold);
    });
    list.addEventListener("pointermove", function (e) {
      var d = drag; if (!d || d.list !== list || e.pointerId !== d.pid) return;
      d.cy = e.clientY;
      if (!d.lifted) {
        if (Math.abs(e.clientX - d.x) > SLOP || Math.abs(e.clientY - d.y) > SLOP) { if (d.type === "mouse") lift(); else { clearTimeout(timer); drag = null; } }
        return;
      }
      e.preventDefault(); e.stopPropagation(); follow();
    });
    list.addEventListener("pointerup", function (e) { if (drag && drag.list === list && e.pointerId === drag.pid) finish(true); });
    list.addEventListener("pointercancel", function (e) { if (drag && drag.list === list && e.pointerId === drag.pid) finish(!!drag.lifted); });
    list.addEventListener("lostpointercapture", function (e) { if (drag && drag.list === list && drag.lifted && e.pointerId === drag.pid) finish(true); });
    window.addEventListener("blur", function () { if (drag && drag.list === list) finish(false); });
  }

  /* ---------- category picker: a large button with the open category; tap = list of all categories.
     In the list: tap = open that category, ＋ = new category, ☰ = edit mode. Edit mode: every row has a ☰ handle
     (drag it, or press and hold the row ~300 ms) to move the category to ANY place in one drag; the other rows
     shift live to show the drop spot and the list auto-scrolls at its edges. ✏️ rename, 🗑 delete. ✓ ends edit mode.
     Every drop is saved at once (local copy + sync), so nothing is lost if the list is closed without ✓. ---------- */
  var catShut = 0, catOpen = false, catEdit = false, catOpt = null, catMove = false;
  function renderCats() {
    var cur = curTab(), c = catOf(cur);
    $("cat-name").textContent = c ? catName(c) : "";
    var btn = $("cat-btn"); btn.setAttribute("aria-expanded", catOpen ? "true" : "false"); btn.setAttribute("aria-label", t("chooseCat") + ": " + (c ? catName(c) : ""));
    $("catpick").hidden = !uid;
    var panel = $("cat-panel"); panel.hidden = !catOpen || !uid;
    var bk = $("cat-back"); if (catOpen && uid && !bk) { bk = document.createElement("div"); bk.id = "cat-back"; bk.className = "cp-back"; document.body.appendChild(bk); bk.addEventListener("pointerdown", function (e) { e.preventDefault(); catShut = Date.now(); closeCats(); }); }
    else if ((!catOpen || !uid) && bk) bk.parentNode.removeChild(bk);
    if (!catOpen || !uid) return;
    $("cp-title").textContent = t("pickTitle");
    $("cat-new").textContent = t("newCat");
    var list = $("cat-list"), st = list.scrollTop;
    list.classList.toggle("editing", catEdit);
    /* v32: row = name (tap = open) + one ⋮ options button → ↕ reorder · ✏️ rename · 🗑 delete. Reorder = move mode: ☰ drag or ▲▼. */
    $("cp-title").textContent = catMove ? t("moveNote") : t("pickTitle");
    $("cat-new").textContent = catMove ? t("editDone") : t("newCat");
    var all = cats();
    list.innerHTML = all.map(function (cc, i) {
      var nm = esc(catName(cc)), id = esc(cc.cat), on = cc.cat === cur;
      if (catMove) return '<li data-cat="' + id + '"' + (on ? ' class="cur"' : "") + '><span class="cp-handle hdl" aria-label="' + esc(t("handle")) + '" title="' + esc(t("handle")) + '">☰</span><span class="nm">' + nm + "</span>" +
        '<button type="button" class="cp-act" data-up="' + id + '"' + (i === 0 ? " disabled" : "") + ' aria-label="' + esc(t("moveUp") + ": " + catName(cc)) + '">▲</button>' +
        '<button type="button" class="cp-act" data-dn="' + id + '"' + (i === all.length - 1 ? " disabled" : "") + ' aria-label="' + esc(t("moveDown") + ": " + catName(cc)) + '">▼</button></li>';
      var open = catOpt === cc.cat;
      return '<li data-cat="' + id + '"' + (on ? ' class="cur"' : "") + '><button type="button" class="cp-pick" data-pick="' + id + '" aria-current="' + on + '"><span class="nm">' + nm + "</span>" + (on ? '<span class="ck" aria-hidden="true">✓</span>' : "") + "</button>" +
        '<button type="button" class="cp-more' + (open ? " on" : "") + '" data-opt="' + id + '" aria-expanded="' + open + '" title="' + esc(t("optMenu")) + '" aria-label="' + esc(t("optMenu") + ": " + catName(cc)) + '">⋮</button></li>' +
        (open ? '<li class="cp-opts">' +
          '<button type="button" class="cp-oi" data-mov="' + id + '"><span aria-hidden="true">↕</span>' + esc(t("optMove")) + "</button>" +
          '<button type="button" class="cp-oi" data-chk="' + id + '"><span aria-hidden="true">' + (cc.check ? "☰" : "☑") + "</span>" + esc(t(cc.check ? "optToList" : "optToCheck")) + "</button>" +
          '<button type="button" class="cp-oi" data-ren="' + id + '"><span aria-hidden="true">✏️</span>' + esc(t("optRename")) + "</button>" +
          '<button type="button" class="cp-oi" data-del="' + id + '"><span aria-hidden="true">🗑</span>' + esc(t("optDelete")) + "</button></li>" : "");
    }).join("");
    list.scrollTop = st;
  }
  function openCats() { catOpen = true; catEdit = false; catMove = false; catOpt = null; hideHint(); render(); var l = $("cat-list"), b = l && l.querySelector("li.cur"); if (b) try { b.scrollIntoView({ block: "nearest" }); } catch (e) {} }
  function closeCats() { if (drag) return; var was = catEdit; catOpen = false; catEdit = false; catMove = false; catOpt = null; render(); if (was) syncSoon(); }
  function bootCats() {
    var list = $("cat-list");
    on("cat-btn", "click", function () { if (catOpen) closeCats(); else if (Date.now() - catShut < 700) return; /* v39: the outside-tap layer already closed it on this same tap (it covers the arrow) */ else openCats(); });
    on("cat-new", "click", function () {
      if (catMove) { catMove = false; catEdit = false; render(); syncSoon(); return; }
      nameSheet(t("catAdd"), "", true, function (v) { var id = addCat(v); if (!id) return; { tab = id; lsSet("rg-sbx-shopping-tab", id); catOpen = false; } changed();
        if (catOpen) { var b = $("cat-list").querySelector('[data-cat="' + id + '"]'); if (b) try { b.scrollIntoView({ block: "nearest" }); } catch (e) {} } });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && catOpen && !$("sheet")) closeCats(); });
    list.addEventListener("click", function (e) {
      if (noClick) { noClick = false; e.preventDefault(); return; }
      var b = e.target.closest("[data-pick],[data-ren],[data-del],[data-opt],[data-mov],[data-up],[data-dn],[data-chk]"); if (!b) return;
      if (b.hasAttribute("data-chk")) { var kc = b.getAttribute("data-chk"); upCat(kc, { check: isChk(kc) ? null : 1 }); changed(); return; }
      if (b.hasAttribute("data-opt")) { var oc = b.getAttribute("data-opt"); catOpt = catOpt === oc ? null : oc; render(); var ob = $("cat-list").querySelector(".cp-opts"); if (ob) try { ob.scrollIntoView({ block: "nearest" }); } catch (e2) {} return; }
      if (b.hasAttribute("data-mov")) { catOpt = null; catMove = true; catEdit = true; render(); return; }
      if (b.hasAttribute("data-up") || b.hasAttribute("data-dn")) {
        var up = b.hasAttribute("data-up"), mc = b.getAttribute(up ? "data-up" : "data-dn"), ids = cats().map(function (x) { return x.cat; }), i = ids.indexOf(mc), j = up ? i - 1 : i + 1;
        if (i < 0 || j < 0 || j >= ids.length) return;
        ids.splice(j, 0, ids.splice(i, 1)[0]); setOrder(ids); changed();
        var nb = $("cat-list").querySelector(up ? '[data-up="' + mc + '"]' : '[data-dn="' + mc + '"]'); if (nb && !nb.disabled) nb.focus();
        return;
      }
      if (b.hasAttribute("data-ren")) catOpt = null;
      if (b.hasAttribute("data-pick")) { catOpen = false; selectTab(b.getAttribute("data-pick")); }
      else if (b.hasAttribute("data-ren")) renameCat(b.getAttribute("data-ren"));
      else deleteCat(b.getAttribute("data-del"));
    });
    list.addEventListener("contextmenu", function (e) { if (catEdit) e.preventDefault(); });

    sortable({ list: list, scroller: list, hold: 300, edge: 44, rowSel: "li",
      canStart: function (e) { return catMove && !e.target.closest("button"); },
      onDrop: function (ids) { setOrder(ids); changed(); } });
  }

  /* ---------- items: swipe right = delete, swipe left = move (immediate).
     A vertical drag is native page scrolling and never marks the item. Once the
     gesture is vertical it stays vertical, so scrolling cannot turn into a swipe. ---------- */
  function bootItemDrag() {
    var main = document.querySelector("main"), AXIS = 12, SWIPE = 0.35;
    function reset() {
      if (idrag && idrag.li) {
        idrag.li.classList.remove("swiping", "sw-r", "sw-l", "sw-go");
        idrag.li.style.removeProperty("--sx");
      }
      idrag = null; if (needRender && !drag) { needRender = false; render(); }
    }
    function scrollOf(el) {
      var n = el ? el.parentNode : null;
      while (n && n !== document.body && n !== document.documentElement) {
        var st = window.getComputedStyle(n);
        if (/(auto|scroll|overlay)/.test(st.overflowY) && n.scrollHeight > n.clientHeight + 2) return n;
        n = n.parentNode;
      }
      return document.scrollingElement || document.documentElement;
    }
    function clearSel() { var sl = window.getSelection && window.getSelection(); if (sl && !sl.isCollapsed) sl.removeAllRanges(); }
    function armH() {
      if (idrag.swipe) return;
      if (idrag.fromText) clearSel();
      idrag.swipe = true; idrag.axis = "h";
      idrag.li.classList.add("swiping");
      try { idrag.li.setPointerCapture(idrag.pid); } catch (e2) {}
    }
    function paintH(dx) {
      var w = idrag.li.offsetWidth || 1, go = Math.abs(dx) >= w * SWIPE;
      idrag.li.style.setProperty("--sx", dx + "px");
      idrag.li.classList.toggle("sw-r", dx > 0); idrag.li.classList.toggle("sw-l", dx < 0); idrag.li.classList.toggle("sw-go", go);
    }
    /* Vertical never calls preventDefault: that axis is the page scroll. */
    function follow(dx, dy) {
      if (!idrag || idrag.handled) return "";
      idrag._dx = dx; idrag._dy = dy;
      if (idrag.swipe) { paintH(dx); return "h"; }
      var adx = Math.abs(dx), ady = Math.abs(dy), text = idrag.fromText;
      if (!idrag.axis) {
        if (adx < AXIS && ady < AXIS) return "";
        if (adx > ady * 1.5) idrag.axis = "h";
        else if (ady > adx * 1.5) { idrag.axis = "v"; return ""; }
        else return "";
      }
      if (idrag.axis === "v") return "";
      if (idrag.axis === "h") {
        var w = idrag.li.offsetWidth || 1;
        if ((!text || adx >= w * SWIPE) && adx > ady * 1.5) { armH(); paintH(dx); return "h"; }
      }
      return "";
    }
    main.addEventListener("pointerdown", function (e) {
      var li = e.target.closest(".list li"); if (!li || e.target.closest("button,input,.hdl,a") || editing || drag) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      reset();
      var sc = scrollOf(li);
      idrag = { li: li, id: li.getAttribute("data-id"), x: e.clientX, y: e.clientY, pid: e.pointerId, type: e.pointerType, t: Date.now(), axis: "", fromText: e.pointerType === "mouse" && !!e.target.closest(".txt,.note"), scroller: sc, scrollTop: sc.scrollTop, winY: window.scrollY, _dx: 0, _dy: 0 };
    });
    document.addEventListener("pointermove", function (e) {
      if (!idrag || e.pointerId !== idrag.pid) return;
      var act = follow(e.clientX - idrag.x, e.clientY - idrag.y);
      if (act === "h") e.preventDefault();
    });
    function releaseScroll(d) {
      var moved = Math.abs(d._dx || 0) + Math.abs(d._dy || 0) > 8;
      var sl = window.getSelection && window.getSelection();
      if (moved || (sl && !sl.isCollapsed && String(sl).trim())) { noClick = true; setTimeout(function () { noClick = false; }, 400); }
      d.handled = true; reset();
    }
    function up(e) {
      if (!idrag || e.pointerId !== idrag.pid || idrag.handled) return;
      var d = idrag;
      // A vertical pan cancels the pointer. Leave it for touchend, and do not turn that distance into a swipe.
      if (d.type === "touch" && !d.swipe && e.type === "pointercancel") {
        d.sawCancel = true;
        d.axis = "v";
        return;
      }
      if (!d.swipe && d.axis !== "h") { releaseScroll(d); return; }
      noClick = true; setTimeout(function () { noClick = false; }, 400);
      var w = d.li.offsetWidth || 1, dx = (e.type === "pointerup" && typeof e.clientX === "number") ? e.clientX - d.x : (d._dx || 0), id = d.id;
      d.handled = true; reset();
      if (Math.abs(dx) >= w * SWIPE) {
        var x = items[id];
        if (dx > 0 && x && !x.deleted) { delWithUndo(id); if (navigator.vibrate) try { navigator.vibrate(10); } catch (e3) {} } // right = delete
        else if (dx < 0 && x && !x.deleted) moveMenu(id); // left = move to another list
      }
    }
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
    document.addEventListener("touchend", function (e) {
      if (!idrag || idrag.handled) return;
      var tch = e.changedTouches && e.changedTouches[0]; if (!tch) return;
      var dx = tch.clientX - idrag.x, dy = tch.clientY - idrag.y, d = idrag;
      d._dx = dx; d._dy = dy;
      if (d.swipe || d.axis === "h") { if (d.sawCancel) { d.handled = true; noClick = true; setTimeout(function () { noClick = false; }, 400); var w = d.li.offsetWidth || 1, id = d.id; reset(); if (Math.abs(dx) >= w * SWIPE) { var x = items[id]; if (dx > 0 && x && !x.deleted) delWithUndo(id); else if (dx < 0 && x && !x.deleted) moveMenu(id); } } return; }
      d.handled = true; reset();
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (!idrag || idrag.handled) return;
      var tch = e.touches && e.touches[0]; if (!tch) return;
      follow(tch.clientX - idrag.x, tch.clientY - idrag.y);
    }, { passive: true });
    main.addEventListener("contextmenu", function (e) {
      if (idrag && idrag.swipe && e.target.closest(".list li")) e.preventDefault();
      else if (e.target.closest(".list li") && !e.target.closest(".txt,.note,input,textarea")) e.preventDefault();
    });
  }

  /* File restore stays in this sandbox: preview, confirm, then backup, then replace. The helper refuses every key that is not rg-sbx-shopping*. */
  function restoreName(row) {
    if (row.name) return row.name;
    if (row.builtin === "main") return t("tabMain");
    if (row.builtin === "tea") return t("tabTea");
    return row.id || "";
  }
  function restoreCount(n, oneKey, manyKey) { return String(n) + " " + t(n === 1 ? oneKey : manyKey); }
  function showRestore(parsed) {
    var R = window.RGSbxShopRestore, sum, when, html;
    html = '<h3>' + esc(t("restoreTitle")) + '</h3><p class="restore-note">' + esc(t("restoreOnly")) + "</p>";
    if (!parsed || !parsed.ok) {
      html += '<p class="restore-note">' + esc(t(parsed && parsed.error === "read" ? "restoreRead" : "restoreBad")) + "</p>";
      html += '<div class="row"><button type="button" class="btn" data-s="x">' + esc(t("cancel")) + "</button></div>";
      sheet(html, function () { closeSheet(); });
      return;
    }
    sum = parsed.summary;
    when = !sum || sum.newestAt == null || !R ? "—" : R.formatWhen(sum.newestAt);
    if (parsed.createdAtLocal) html += '<p class="restore-meta">' + esc(t("restoreFileDate")) + ": " + esc(parsed.createdAtLocal) + "</p>";
    html += '<p class="restore-meta">' + esc(restoreCount(sum.listCount, "restoreList", "restoreLists")) + " · " + esc(restoreCount(sum.itemCount, "restoreItem", "restoreItems")) + "</p>";
    html += '<p class="restore-meta">' + esc(t("restoreNewest")) + ": " + esc(when) + "</p>";
    function lines(rows) {
      if (!rows.length) return "";
      return '<ul class="restore-lines">' + rows.map(function (row) {
        return '<li><span class="rn">' + esc(restoreName(row)) + '</span><span class="rc">' + esc(restoreCount(row.count, "restoreItem", "restoreItems")) + "</span></li>";
      }).join("") + "</ul>";
    }
    if (!sum.visible.length) html += '<p class="restore-note">' + esc(t("restoreEmpty")) + "</p>";
    else html += lines(sum.visible);
    if (sum.hidden.length) html += '<p class="restore-note">' + esc(t("restoreHidden")) + "</p>" + lines(sum.hidden);
    html += '<div class="row"><button type="button" class="btn" data-s="x">' + esc(t("cancel")) + "</button>";
    if (uid) html += '<button type="button" class="btn pri" data-s="load">' + esc(t("restoreLoad")) + "</button>";
    html += "</div>";
    if (!uid) html += '<p class="restore-note">' + esc(t("restoreNeed")) + "</p>";
    sheet(html, function (a) {
      if (a !== "load") { closeSheet(); return; }
      closeSheet();
      loadRestore(parsed);
    });
  }
  function loadRestore(parsed) {
    var R = window.RGSbxShopRestore, staged, wrote, k, x, vis, found;
    if (!R || !parsed || !parsed.ok) return;
    if (!uid) { toast(t("restoreNeed")); return; }
    staged = R.stage({ storage: localStorage, uid: uid, currentItems: items, currentCats: catsMap, nextItems: parsed.items, nextCats: parsed.cats, now: Date.now() });
    wrote = staged && staged.ok ? R.commit(localStorage, staged) : null;
    if (!wrote || !wrote.ok) { toast(t("restoreFail")); return; }
    fileGen++;
    restoreDoc = { items: staged.items, cats: staged.cats };
    items = adoptMap(staged.items, {}, Date.now());
    catsMap = adoptMap(staged.cats, {}, Date.now());
    snap = stamp(items, null); csnap = stamp(catsMap, null);
    pending = true;
    editing = null;
    holdBlocked = false;
    blockedItems = null;
    blockedCats = null;
    syncErr = "";
    offline = false;
    bulkOk = Date.now() + ((window.RGSyncStatus && window.RGSyncStatus.BULK_MS) || 60000);
    lastT = 0;
    for (k in items) { x = items[k]; if (x && typeof x.at === "number" && x.at > lastT) lastT = x.at; }
    for (k in catsMap) { x = catsMap[k]; if (x && typeof x.at === "number" && x.at > lastT) lastT = x.at; }
    vis = parsed.summary && parsed.summary.visible ? parsed.summary.visible : [];
    found = false;
    vis.forEach(function (r) { if (r.id === tab) found = true; });
    if (vis.length && !found) { tab = vis[0].id; lsSet("rg-sbx-shopping-tab", tab); }
    saveLocal();
    render();
    sync();
    toast(t("restoreDone"));
  }
  function bootRestore() {
    var input = $("restore-file"), lab = $("restore-file-btn");
    if (!input || !window.RGSbxShopRestore) return;
    if (lab) lab.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      input.click();
    });
    input.addEventListener("change", function () {
      var f = input.files && input.files[0];
      try { input.value = ""; } catch (e) {}
      if (!f) return;
      if (f.size > 5000000) { showRestore({ ok: false, error: "read" }); return; }
      var reader = new FileReader();
      reader.onload = function () { showRestore(window.RGSbxShopRestore.parseText(String(reader.result || ""))); };
      reader.onerror = function () { showRestore({ ok: false, error: "read" }); };
      reader.readAsText(f);
    });
  }
  function downloadBlob(file, name) {
    var blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) a.parentNode.removeChild(a);
    setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 1000);
  }
  /* The bottom גיבוי link saves a file from what is already on screen. It does not ask to sign in and it does not wait for the network. */
  function mapHasRows(map) {
    var k, x;
    for (k in (map || {})) {
      x = map[k];
      if (x && typeof x === "object" && !x.deleted) return true;
    }
    return false;
  }
  function downloadBackup() {
    var R = window.RGSbxShopRestore, when, stamp, file;
    if (!mapHasRows(items) && !mapHasRows(catsMap)) { toast(t("backupEmpty")); return; }
    if (!R || !R.buildFile) return;
    when = Date.now();
    file = R.buildFile(items || {}, catsMap || {}, when);
    stamp = String(R.formatWhen(when) || "").replace(/[^\d]/g, "");
    downloadBlob(file, "purchasify-" + (stamp || "backup") + ".json");
  }
  function openHistory() {
    var R = window.RGSbxShopRestore, SS = window.RGSyncStatus, rows = [], raw, html;
    if (uid) {
      raw = jparse(lsGet(bakKey(uid)), []);
      if (Array.isArray(raw)) rows = raw.filter(function (s) { return s && typeof s.t === "number"; }).sort(function (a, b) { return b.t - a.t; });
    }
    html = '<div class="ehead"><h3>' + esc(t("history")) + '</h3><button type="button" class="btn" data-s="x">' + esc(t("historyBack")) + "</button></div>";
    if (!rows.length) html += '<p class="mnote">' + esc(t("historyEmpty")) + "</p>";
    else html += rows.map(function (s, i) {
      var when = SS && SS.formatSyncTime ? SS.formatSyncTime(s.t) : (R && R.formatWhen ? R.formatWhen(s.t) : "");
      return '<div class="hrow"><div class="histwhen">' + esc(when) + '</div><div class="row"><button type="button" class="btn" data-s="d:' + i + '">' + esc(t("historyDownload")) + "</button></div></div>";
    }).join("");
    sheet(html, function (a) {
      var i, snap, file, stamp;
      if (a === "x") { closeSheet(); return; }
      if (a.indexOf("d:") !== 0 || !R || !R.buildFile) return;
      i = parseInt(a.slice(2), 10);
      snap = rows[i];
      if (!snap) return;
      file = R.buildFile(snap.items || {}, snap.cats || {}, snap.t);
      stamp = String(R.formatWhen(snap.t) || "").replace(/[^\d]/g, "");
      downloadBlob(file, "purchasify-" + (stamp || "backup") + ".json");
    });
  }
  function bootSearch() {
    var el = $("list-search"), x = $("search-clear"), box = $("searchbox");
    if (!el) return;
    function paint() {
      var on = !!String(el.value || "");
      if (x) x.hidden = !on;
      if (box) box.classList.toggle("hasq", on);
      render();
    }
    el.addEventListener("input", paint);
    el.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && el.value) { e.preventDefault(); el.value = ""; paint(); }
    });
    if (x) x.addEventListener("click", function () { el.value = ""; paint(); el.focus(); });
  }
  function boot() {
    try { bootUI(); } catch (e) { setTimeout(function () { throw e; }); } // the list still loads and shows even if a control fails
    startData();
  }
  function bootUI() {
    try { bootRestore(); } catch (e) { setTimeout(function () { throw e; }); }
    try { bootSearch(); } catch (e) { setTimeout(function () { throw e; }); }
    on("backup-link", "click", function () { downloadBackup(); });
    on("hist-btn", "click", function () { openHistory(); });
    bootCats();
    bootItemDrag();
    sortable({ list: $("active"), scroller: null, hold: 0, edge: 70, rowSel: "li", idAttr: "data-id",
      canStart: function () { return !editing; },
      onDrop: function (ids) { setItemOrder(ids); changed(); } });
    sortable({ list: $("done"), scroller: null, hold: 0, edge: 70, rowSel: "li", idAttr: "data-id", // "נבחר" items: same ☰ drag
      canStart: function () { return !editing; },
      onDrop: function (ids) { setItemOrder(ids, isChk(curTab()) ? "ord" : "dord"); changed(); } });
    on("add-form", "submit", function (e) {
      e.preventDefault(); var i = $("add-input"), pi = $("add-price"), ni = $("add-note"), pr = parsePrice(pi.value);
      if (pr !== null && isNaN(pr)) { pi.focus(); pi.select(); return; }
      if (!i.value.trim()) { i.focus(); return; }
      add(i.value, null, pr, ni ? ni.value : ""); i.value = ""; pi.value = ""; if (ni) ni.value = ""; changed(); i.focus();
    });
    on("suggest", "click", function () { SUGGESTED.forEach(function (s) { add(s); }); changed(); });
    var main = document.querySelector("main");
    main.addEventListener("click", function (e) {
      if (noClick && e.target.closest(".list")) { noClick = false; e.preventDefault(); return; }
      var b = e.target.closest("[data-a]"); if (!b) return;
      var li = b.closest("li"), id = li && li.getAttribute("data-id"), x = id && items[id]; if (!x) return;
      var a = b.getAttribute("data-a");
      if (a === "ck") { toggleCk(id); changed(); return; }
      if (a === "edit") { editing = id; render(); var inp = document.querySelector('[data-edit="' + id + '"]'); if (inp) { var n = inp.value.length; try { inp.setSelectionRange(n, n); } catch (e2) {} } }
    });
    main.addEventListener("keydown", function (e) {
      if (e.target.classList.contains("txt") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.target.click(); }
      if (e.target.getAttribute("data-price")) {
        if (e.key === "Enter") { e.preventDefault(); if (commitPrice(e.target)) e.target.blur(); }
        else if (e.key === "Escape") { e.preventDefault(); var xx = items[e.target.getAttribute("data-price")]; e.target.value = xx && typeof xx.price === "number" ? String(xx.price) : ""; e.target.classList.remove("bad"); e.target.blur(); sumNow(); }
        return;
      }
      if (e.target.getAttribute("data-enote")) {
        var tb = e.target.closest(".ebox").querySelector("[data-edit]");
        if (e.key === "Escape") { e.preventDefault(); commitEdit(tb, true); }
        else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commitEdit(tb); }
        return;
      }
      if (e.target.getAttribute("data-edit")) {
        if (e.key === "Enter") { e.preventDefault(); commitEdit(e.target); }
        else if (e.key === "Escape") { e.preventDefault(); commitEdit(e.target, true); }
      }
    });
    main.addEventListener("focusout", function (e) {
      if (rendering || !e.target.getAttribute) return;
      if (e.target.getAttribute("data-price")) { commitPrice(e.target); return; }
      if (e.target.getAttribute("data-edit") || e.target.getAttribute("data-enote")) {
        var box = e.target.closest(".ebox"); if (box && e.relatedTarget && box.contains(e.relatedTarget)) return; // moving between title and note
        var ti = box && box.querySelector("[data-edit]"); if (ti) commitEdit(ti);
      }
    });
    main.addEventListener("input", function (e) { if (e.target.getAttribute && e.target.getAttribute("data-price")) { e.target.classList.remove("bad"); sumNow(); } });
  }
  function startData() {
    M.onLang(render);
    function onUser(u) {
      var id = u ? u.id : null; if (id === uid) return;
      if (!id && uid) { // signed out: drop this device's copy unless it holds changes that never reached the cloud
        var c = jparse(lsGet(cacheKey(uid)), null); if (!c || !c.pending) lsSet(cacheKey(uid), null);
      }
      fileGen++; restoreDoc = null;
      uid = id; editing = null; offline = false; syncErr = ""; failN = 0; holdBlocked = false; bulkOk = 0; blockedItems = null; blockedCats = null; loadLocal(); render();
      if (uid) sync();
    }
    onUser(A.user());
    A.onChange(onUser);
    A.ready.then(function () { onUser(A.user()); });
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
