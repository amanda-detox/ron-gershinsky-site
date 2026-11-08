/* Purchasify sandbox. App id sbxpurchasify. Guest data stays in localStorage rg-sbx-purchasify:guest and is never uploaded.
   Does not read or write the live purchasify keys.
   Signed-in data is Appwrite app "sbxpurchasify", rows readable only by that user.
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
   Offline-first: kept in localStorage per user (rg-sbx-purchasify:<user id>) and merged into the cloud copy on every sync. */
(function () {
  "use strict";
  var APP = "sbxpurchasify", KEY = "items", CKEY = "cats", POLL_MS = 10000, TOMB_MS = 30 * 24 * 3600 * 1000;
  var SUGGESTED_HE = ["חלב", "לחם", "ביצים", "ירקות", "פירות"];
  var SUGGESTED_EN = ["Milk", "Bread", "Eggs", "Vegetables", "Fruit"];
  function suggested() { return (M.lang && M.lang() === "en") ? SUGGESTED_EN : SUGGESTED_HE; }
  var BUILTIN = [{ cat: "main", def: "tabMain", ph: "ph", empty: "empty", pos: 0 }, { cat: "tea", def: "tabTea", ph: "phTea", empty: "emptyTea", pos: 1 }];
  var A = window.RGAccount, M = window.RGMy, t = M.t;
  var uid = null, items = {}, catsMap = {}, pending = false, busy = false, again = false, offline = false, lastT = 0, editing = null, soonT = 0, rendering = false;
  var failN = 0, syncErr = "", holdBlocked = false, blockedItems = null, blockedCats = null;
  var drag = null, idrag = null, needRender = false, noClick = false; // drag = a category row being reordered, idrag = an item being swiped

  function $(id) { return document.getElementById(id); }
  function on(id, ev, fn) { var el = $(id); if (el) el.addEventListener(ev, fn); } // a missing element (old cached page) never stops the app from loading
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function jparse(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
  function cacheKey(id) { return RGIsolate.cacheKey(APP, id); }
  function now() { lastT = Math.max(Date.now(), lastT + 1); return lastT; }
  function newId() { return now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function clean(s, n) { return String(s || "").replace(/\s+/g, " ").trim().slice(0, n); }
  var tab = lsGet("rg-sbx-purchasify-tab") || "main";

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
  // so nothing is ever lost even if a bug writes something wrong: rg-sbx-purchasify-bak:<user id> = [{ t, items, cats }, ...]
  var BAK_N = 5, bulkOk = 0;
  function bakKey(id) { return "rg-sbx-purchasify-bak:" + id; }
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
    if (Date.now() < bulkOk) return false;
    var before = liveCount(cloud, isCat), after = liveCount(next, isCat), gone = before - after;
    return before >= 4 && gone >= 3 && gone * 2 > before;
  }

  /* ---------- sync ---------- */
  function statusFlags() {
    return { maySync: RGIsolate.maySync(uid), uid: uid, blocked: holdBlocked, bulkUntil: bulkOk, err: syncErr, onLine: typeof navigator === "undefined" || navigator.onLine !== false, failN: failN, pending: pending, busy: busy, offline: offline };
  }
  function confirmBlocked() {
    if (window.RGSyncStatus) RGSyncStatus.closeDeletion();
    bulkOk = Date.now() + ((window.RGSyncStatus && RGSyncStatus.BULK_MS) || 60000);
    holdBlocked = false; syncErr = ""; offline = false; sync();
  }
  function restoreBlocked() {
    var SS = window.RGSyncStatus;
    if (SS) SS.closeDeletion();
    if (SS && blockedItems) items = SS.restoreLive(items, blockedItems);
    if (SS && blockedCats) catsMap = SS.restoreLive(catsMap, blockedCats);
    snap = stamp(items, null); csnap = stamp(catsMap, null);
    holdBlocked = false; pending = true; syncErr = ""; offline = false;
    saveLocal(); render(); sync();
  }
  function setStatus() {
    var s = $("status"); if (!s) return;
    var SS = window.RGSyncStatus;
    if (!SS) { s.textContent = !RGIsolate.maySync(uid) ? t("localOnly") : offline ? t("offline") : (pending || busy) ? t("saving") : t("synced"); return; }
    var k = SS.kind(statusFlags());
    SS.fillStatus(s, k, k && k !== "blocked" ? t(k) : "");
    if (k === "blocked") SS.openDeletion({ onYes: confirmBlocked, onNo: restoreBlocked });
    else SS.closeDeletion();
  }

  function sync() {
    if (!RGIsolate.maySync(uid) || !A) return Promise.resolve();
    RGIsolate.assertPublicApp(APP);
    if (busy) { again = true; return Promise.resolve(); }
    busy = true; again = false; setStatus();
    var who = uid, sentI = null, sentC = null, blocked = false, SS = window.RGSyncStatus;
    return Promise.all([A.get(APP, KEY), A.get(APP, CKEY)]).then(function (r) {
      if (who !== uid) return;
      var cl = (r[0] && r[0].items && typeof r[0].items === "object") ? r[0].items : {};
      var cc = (r[1] && r[1].cats && typeof r[1].cats === "object") ? r[1].cats : {};
      snap = stamp(items, snap); csnap = stamp(catsMap, csnap);
      var mi = merge(items, cl), mc = merge(catsMap, cc);
      if (!same(mi, items) || !same(mc, catsMap)) { items = mi; catsMap = mc; snap = stamp(items, null); csnap = stamp(catsMap, null); saveLocal(); render(); }
      var jobs = [], wI = !same(mi, cl), wC = !same(mc, cc);
      if (wI && tooManyGone(mi, cl, false)) { wI = false; blocked = true; try { console.warn("Purchasify sandbox: a write that removes most items was blocked; the cloud copy is untouched"); } catch (e) {} }
      if (wC && tooManyGone(mc, cc, true)) { wC = false; blocked = true; try { console.warn("Purchasify sandbox: a write that removes most categories was blocked; the cloud copy is untouched"); } catch (e) {} }
      holdBlocked = blocked;
      if (blocked) { pending = true; blockedItems = cl; blockedCats = cc; saveLocal(); }
      if (wI || wC) backup(cl, cc);
      if (wI) { sentI = mi; jobs.push(A.set(APP, KEY, { v: 1, items: mi })); }
      if (wC) { sentC = mc; jobs.push(A.set(APP, CKEY, { v: 1, cats: mc })); }
      return Promise.all(jobs);
    }).then(function () {
      if (who !== uid) return;
      var sentSame = (!sentI || same(sentI, items)) && (!sentC || same(sentC, catsMap));
      var next = SS ? SS.applySuccess(null, { blocked: blocked, sentSame: sentSame }) : { holdBlocked: blocked, clearPending: !blocked && sentSame, again: !blocked && !sentSame };
      offline = false; syncErr = ""; failN = 0; holdBlocked = !!next.holdBlocked;
      if (blocked) return;
      if (next.clearPending) { pending = false; saveLocal(); }
      else if (next.again) again = true;
    }, function (e) {
      if (who !== uid) return;
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

  setInterval(function () { if (RGIsolate.maySync(uid) && document.visibilityState === "visible") sync(); }, POLL_MS);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sync(); });
  window.addEventListener("focus", function () { sync(); });
  window.addEventListener("online", function () { offline = false; sync(); });
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
  function row(x) {
    var showC = isChk(curTab()), g = x.mark === "no" ? "no" : showingOk(x) ? "ok" : "";
    var hasP = typeof x.price === "number" && isFinite(x.price), id = esc(x.id);
    var txt = editing === x.id
      ? '<div class="ebox"><input class="edit" data-edit="' + id + '" maxlength="200" enterkeyhint="done" value="' + esc(x.text) + '" aria-label="' + esc(t("edit")) + '">' +
        '<textarea class="enote" data-enote="' + id + '" maxlength="500" rows="2" placeholder="' + esc(t("phNote")) + '" aria-label="' + esc(t("note")) + '">' + esc(x.note || "") + "</textarea></div>"
      : '<span class="txt" role="button" tabindex="0" data-a="edit" title="' + esc(t("edit")) + '">' + esc(x.text) +
        (x.note ? '<span class="note">' + esc(x.note) + "</span>" : '<span class="addnote">' + esc(t("addNote")) + "</span>") + "</span>";
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
  function render() {
    if (!$("active")) return;
    if (drag || idrag) { needRender = true; return; } // never rebuild under a finger that is dragging
    var cur = curTab(), c = catOf(cur) || {};
    var act = [], done = [];
    var unm = false; // one list only (Ron 31.10): items once marked "נבחר" are unmarked and stay in the regular list
    if (uid) for (var k in items) { var x = items[k]; if (x.deleted || x.type === "cat") continue; if (x.done) { upd(k, { done: false, dord: null }); x = items[k]; unm = true; } if (listOf(x) === cur) act.push(x); }
    if (unm) { pending = true; saveLocal(); syncSoon(); }
    renderCats();
    var hint = $("cathint"); hint.textContent = t("catHint"); hint.hidden = !uid || !!lsGet("rg-sbx-purchasify-hint2");
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
  function hideHint() { lsSet("rg-sbx-purchasify-hint2", "1"); var h = $("cathint"); if (h) h.hidden = true; }
  function renameCat(cid) {
    var c = catOf(cid); if (!c) return;
    nameSheet(t("renameTitle"), catName(c), false, function (v) { if (v !== catName(c)) { upCat(cid, { name: v }); changed(); } });
  }
  function deleteCat(cid) {
    var c = catOf(cid); if (!c) return;
    if (cats().length <= 1) { window.alert(t("lastCat")); return; }
    if (window.confirm(t("confirmDelCat").replace("{x}", catName(c)))) { bulkOk = Date.now() + 60000; delCat(cid); if (tab === cid) tab = ""; lsSet("rg-sbx-purchasify-tab", curTab()); changed(); }
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
  function selectTab(cid) { tab = cid; editing = null; lsSet("rg-sbx-purchasify-tab", tab); render(); }

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
      nameSheet(t("catAdd"), "", true, function (v) { var id = addCat(v); if (!id) return; { tab = id; lsSet("rg-sbx-purchasify-tab", id); catOpen = false; } changed();
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

  function boot() {
    try { bootUI(); } catch (e) { setTimeout(function () { throw e; }); } // the list still loads and shows even if a control fails
    startData();
  }
  function bootUI() {
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
    on("suggest", "click", function () { suggested().forEach(function (s) { add(s); }); changed(); });
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
    function offerGuest() {
      var raw = jparse(lsGet(RGIsolate.cacheKey(APP, RGIsolate.GUEST)), null);
      var g = raw && raw.items && typeof raw.items === "object" ? raw.items : {};
      var gc = raw && raw.cats && typeof raw.cats === "object" ? raw.cats : {};
      var n = 0, k, x;
      for (k in g) { x = g[k]; if (x && !x.deleted) n++; }
      for (k in gc) { x = gc[k]; if (x && !x.deleted && !x.gone) n++; }
      if (!n) return;
      var yes = false;
      try { yes = window.confirm(t("importAsk").replace("{n}", String(n))) === true; } catch (e) { yes = false; }
      if (!yes) return;
      var mi = merge(items, g), mc = merge(catsMap, gc);
      if (!same(mi, items) || !same(mc, catsMap)) { items = mi; catsMap = mc; pending = true; saveLocal(); }
    }
    function onUser(u) {
      var id = RGIsolate.scopeId(u); if (id === uid) return;
      var prev = uid;
      // Guest items enter the account only after a yes on this device. One user never receives another's items.
      uid = id; editing = null; offline = false; syncErr = ""; failN = 0; holdBlocked = false; loadLocal();
      if (prev === RGIsolate.GUEST && RGIsolate.maySync(uid)) offerGuest();
      render();
      if (RGIsolate.maySync(uid)) sync(); else setStatus();
    }
    onUser(A.user());
    A.onChange(onUser);
    A.ready.then(function () { onUser(A.user()); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
