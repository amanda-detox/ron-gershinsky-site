/* Listify (my/ideas/, formerly "Checklist") — private, per-user, synced through RGAccount (Appwrite row app="myideas", key="items",
   readable/writable by the signed-in user only). Nothing personal is stored in the site's files.
   Model: { v: 1, seeded: true, items: { <id>: { id, sec, text, note?, done, order, created, at, deleted?, seed? } } }
     Since v8 every list is the same kind (title, short note, נבחר, free drag order). Records from older versions may still carry
     status / progress / prev / due / kind: they are kept untouched and only read to work out "selected" (see isSel).
     sec = which category the item belongs to: one of the built-in ids ("ideas" | "tasks" | "goals") or a custom category id.
   Categories (since Listify): stored in the SAME items map as records { id: "c:<cat>", type: "cat", cat, name?, kind, pos, gone?, created, at }
     kind = "idea" | "task" | "goal" (which item features the category has). The three built-in categories exist without a record
     until they are renamed, moved or deleted (gone: 1 hides one; it is not a tombstone, so it is never pruned and never comes back).
     Old data needs no rewrite: old items already point at "ideas" / "tasks" / "goals". Old app versions ignore the category records
     (they have no "sec") but keep and sync them, because they merge every valid record.
     goals: progress 0-100 (100 = achieved), prev = progress before it was marked achieved.
   Merge: per item id and per field (see merge below); deletions are tombstones (deleted: true), pruned after 30 days.
   Offline-first: kept in localStorage per user (rg-myideas-v1:<user id>) and merged into the account copy on every sync.
   The first checklist item is added once, on the first successful sync of an account whose list was never seeded. */
(function () {
  "use strict";
  var APP = "myideas", KEY = "items", POLL_MS = 10000, TOMB_MS = 30 * 24 * 3600 * 1000;
  var SECTIONS = [
    { id: "ideas", tab: "tabIdeas", kind: "idea", pos: 0 },
    { id: "tasks", tab: "tabTasks", kind: "task", pos: 1 },
    { id: "goals", tab: "tabGoals", kind: "goal", pos: 2 }
  ];
  var KINDS = ["task", "idea", "goal"]; // old category kinds: still read and kept in the records, but every list now works the same
  var A = window.RGAccount, M = window.RGMy, t = M.t;
  var uid = null, items = {}, seeded = false, pending = false, busy = false, again = false, offline = false, lastT = 0, soonT = 0;
  var editing = null, rendering = false;
  var tab = lsGet("rg-myideas-tab") || "ideas", doneOpen = {};
  var drag = null, idrag = null, needRender = false, noClick = false;

  function $(id) { return document.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function jparse(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
  function cacheKey(id) { return "rg-myideas-v1:" + id; }
  function now() { lastT = Math.max(Date.now(), lastT + 1); return lastT; }
  function newId() { return now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function clean(s, n) { return String(s || "").replace(/[ \t\u00a0]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, n); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  /* ---------- local cache ---------- */
  function loadLocal() {
    var c = uid ? jparse(lsGet(cacheKey(uid)), null) : null;
    items = (c && c.items && typeof c.items === "object") ? c.items : {}; pending = !!(c && c.pending); seeded = !!(c && c.seeded); snap = stamp(items, null);
  }
  var snap = {};
  function saveLocal() { snap = stamp(items, snap); if (uid) lsSet(cacheKey(uid), JSON.stringify({ items: items, pending: pending, seeded: seeded })); }
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
  function live(sec) { var r = []; for (var k in items) { var x = items[k]; if (!x.deleted && x.sec === sec) r.push(x); } return r; }

  /* ---------- categories ---------- */
  function catRec(cid) { var r = items["c:" + cid]; return r && !r.deleted && r.type === "cat" ? r : null; }
  function cats() {
    var map = {}, out = [], k, c;
    SECTIONS.forEach(function (s) { map[s.id] = { cat: s.id, kind: s.kind, pos: s.pos, created: 0, def: s.tab }; });
    for (k in items) { var r = items[k]; if (r.deleted || r.type !== "cat" || typeof r.cat !== "string") continue;
      var b = map[r.cat] || { cat: r.cat }; map[r.cat] = { cat: r.cat, kind: KINDS.indexOf(r.kind) >= 0 ? r.kind : (b.kind || "task"), pos: typeof r.pos === "number" ? r.pos : (b.pos || 0),
        created: r.created || 0, name: r.name, gone: r.gone, def: b.def }; }
    for (k in map) { c = map[k]; if (!c.gone) out.push(c); }
    return out.sort(function (a, b) { return (a.pos - b.pos) || (a.created - b.created) || (a.cat < b.cat ? -1 : 1); });
  }
  function catName(c) { return c.name || (c.def ? t(c.def) : "…"); }
  function catOf(cid) { var l = cats(); for (var i = 0; i < l.length; i++) if (l[i].cat === cid) return l[i]; return null; }
  function upCat(cid, patch) {
    var r = catRec(cid), y = {}, k, d = SECTIONS.filter(function (s) { return s.id === cid; })[0];
    if (r) for (k in r) y[k] = r[k];
    else { var c = catOf(cid) || {}; y = { id: "c:" + cid, type: "cat", cat: cid, kind: c.kind || (d && d.kind) || "task", pos: typeof c.pos === "number" ? c.pos : 0, created: c.created || 0 }; }
    for (k in patch) { if (patch[k] === "" || patch[k] == null) delete y[k]; else y[k] = patch[k]; }
    y.at = now(); put(y);
  }
  function addCat(name, kind) {
    name = clean(name, 40); if (!name) return null;
    var l = cats(), id = newId(), at = now(), pos = l.reduce(function (m, c) { return Math.max(m, c.pos); }, -1) + 1;
    put({ id: "c:" + id, type: "cat", cat: id, name: name, kind: KINDS.indexOf(kind) >= 0 ? kind : "task", pos: pos, created: at, at: at });
    return id;
  }
  function setOrder(ids) { ids.forEach(function (cid, n) { var c = catOf(cid); if (c && c.pos !== n) upCat(cid, { pos: n }); }); }
  function delCat(cid) {
    live(cid).forEach(function (x) { del(x.id); });
    upCat(cid, { gone: 1 });
  }
  function curTab() { var l = cats(); if (!l.some(function (c) { return c.cat === tab; })) tab = l.length ? l[0].cat : ""; return tab; }

  /* ---------- safety net (same as Purchasify) ----------
     Before every cloud write, the cloud copy that is about to be replaced is kept on this device (last BAK_N versions):
     rg-myideas-bak:<user id> = [{ t, items }, ...]. A write that would suddenly remove most of the lists / items is blocked
     (the cloud copy stays as it was) unless Ron just deleted a whole list himself. */
  var BAK_N = 5, bulkOk = 0;
  function bakKey(id) { return "rg-myideas-bak:" + id; }
  function backup(cl) {
    if (!uid || !Object.keys(cl).length) return;
    var l = jparse(lsGet(bakKey(uid)), []); if (!Array.isArray(l)) l = [];
    var last = l[l.length - 1];
    if (last && same(last.items || {}, cl)) return; // same as the newest backup
    l.push({ t: Date.now(), items: cl });
    while (l.length > BAK_N) l.shift();
    try { localStorage.setItem(bakKey(uid), JSON.stringify(l)); } catch (e) { l.splice(0, l.length - 1); lsSet(bakKey(uid), JSON.stringify(l)); }
  }
  function liveCount(m) { var n = 0; for (var k in m) { var x = m[k]; if (x && !x.deleted && !x.gone) n++; } return n; }
  function tooManyGone(next, cloud) {
    if (Date.now() < bulkOk) return false;
    var before = liveCount(cloud), gone = before - liveCount(next);
    return before >= 4 && gone >= 3 && gone * 2 > before;
  }

  /* ---------- sync ---------- */
  function setStatus() {
    var s = $("status"); if (!s) return;
    s.className = "status" + (offline ? " off" : "");
    s.textContent = !uid ? "" : offline ? t("offline") : (pending || busy) ? t("saving") : t("synced");
  }
  function sync() {
    if (!uid || !A) return Promise.resolve();
    if (busy) { again = true; return Promise.resolve(); }
    busy = true; again = false; setStatus();
    var who = uid, sent = null, blocked = false;
    return A.get(APP, KEY).then(function (cloud) {
      if (who !== uid) return;
      var cl = (cloud && cloud.items && typeof cloud.items === "object") ? cloud.items : {};
      var cloudSeeded = !!(cloud && cloud.seeded);
      snap = stamp(items, snap);
      var merged = merge(items, cl), dirty = !same(merged, items);
      items = merged; snap = stamp(items, null);
      if (!seeded && !cloudSeeded) { // first time for this account: add the first checklist item (only if the checklist is empty)
        if (!live("tasks").length) { var id = newId(), at = now(); items[id] = { id: id, sec: "tasks", text: t("seedTask"), seed: 1, done: false, created: at, at: at }; }
        dirty = true;
      }
      seeded = true;
      return Promise.resolve(undoImport()).then(function (imp) {
      if (imp) dirty = true;
      if (dirty) { saveLocal(); render(); }
      if (cloudSeeded && same(items, cl)) return;
      if (tooManyGone(items, cl)) { blocked = true; try { console.warn("Listify: a write that removes most items was blocked; the cloud copy is untouched"); } catch (e) {} return; }
      backup(cl);
      sent = items;
      return A.set(APP, KEY, { v: 1, seeded: true, items: items });
      });
    }).then(function () {
      if (who !== uid) return;
      offline = false;
      if (blocked) return; // keep "pending": nothing was lost locally, and the cloud copy stays as it was
      if (!sent || sent === items) { pending = false; saveLocal(); } else again = true;
    }, function (e) {
      if (e && e.code === "signed_out") return;
      offline = true;
    }).then(function () {
      busy = false; setStatus();
      if (again) { again = false; sync(); }
    });
  }
  function syncSoon() { clearTimeout(soonT); soonT = setTimeout(sync, 250); }
  function changed() { pending = true; saveLocal(); render(); syncSoon(); }

  setInterval(function () { if (uid && document.visibilityState === "visible" && !editing) sync(); }, POLL_MS);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sync(); });
  window.addEventListener("online", function () { sync(); });
  window.addEventListener("offline", function () { offline = true; setStatus(); });

  /* ---------- actions (every change makes a new copy of the item, so "items" identity changes too) ----------
     Since the "one kind of list" change every category looks and behaves the same: title, short note, נבחר (selected), free order.
     Old fields stay in the records untouched (harmless): status / progress / prev / due from the old idea / goal / date features.
     Old data is read like this: an item is selected when "done" says so; an old idea / goal without "done" is selected when it
     was "done" / achieved (status "done" or progress 100). Order: "order" when it has one, else the creation time. */
  function put(x) { var c = {}; for (var k in items) c[k] = items[k]; c[x.id] = x; items = c; }
  function upd(id, patch) {
    var x = items[id]; if (!x || x.deleted) return; var y = {}, k;
    for (k in x) y[k] = x[k]; for (k in patch) { if (patch[k] === "" || patch[k] == null) delete y[k]; else y[k] = patch[k]; }
    y.at = now(); put(y);
  }
  function del(id) { if (items[id]) put({ id: id, deleted: true, at: now() }); }
  function label(x) { return x.seed ? t("seedTask") : x.text; } // the first item follows the language until it is edited
  function prog(x) { var v = Math.round(+x.progress || 0); return v < 0 ? 0 : v > 100 ? 100 : v; }
  function isSel(x) { return typeof x.done === "boolean" ? x.done : (x.status === "done" || prog(x) >= 100); }
  function byOrder(a, b) {
    var ao = typeof a.order === "number", bo = typeof b.order === "number";
    if (ao && bo && a.order !== b.order) return a.order - b.order;
    if (ao !== bo) return ao ? -1 : 1;
    return ((a.created || 0) - (b.created || 0)) || (a.id < b.id ? -1 : 1);
  }
  function openIn(sec) { return live(sec).filter(function (x) { return !isSel(x); }).sort(byOrder); }
  /* order inside "נבחר": "dord" (set when a selected item is dragged with ☰, like Purchasify); an item without it (just selected) goes to the bottom */
  function dordOf(x) { return typeof x.dord === "number" && isFinite(x.dord) ? x.dord : Infinity; }
  function selIn(sec) { return live(sec).filter(isSel).sort(function (a, b) { var p = dordOf(a), q = dordOf(b); return p !== q ? (p < q ? -1 : 1) : ((a.at || 0) - (b.at || 0)); }); } // Ron's order (☰ drag), last selected at the very bottom
  function setItemOrder(ids, f) { f = f || "order"; ids.forEach(function (id, n) { var x = items[id], p = {}; p[f] = n + 1; if (x && !x.deleted && x[f] !== n + 1) upd(id, p); }); }
  function nextOrder(sec) { // give every item in the list a number first (old items may have none), then one less for the new item (top of the list)
    var l = live(sec).sort(byOrder);
    if (l.some(function (x) { return typeof x.order !== "number"; })) setItemOrder(l.map(function (x) { return x.id; }));
    return live(sec).reduce(function (m, y) { return Math.min(m, typeof y.order === "number" ? y.order : 1); }, 1) - 1; // one less than the smallest: a new item goes to the TOP (Ron, 2026-10-30)
  }
  function add(sec, text, note, price) {
    text = clean(text, 200); if (!text) return;
    var o = nextOrder(sec), id = newId(), at = now(), x = { id: id, sec: sec, text: text, done: false, order: o, created: at, at: at };
    note = clean(note, 500); if (note) x.note = note;
    if (typeof price === "number" && isFinite(price)) x.price = price;
    put(x);
  }
  function toggleSel(id) { var x = items[id]; if (x && !x.deleted) upd(id, { done: !isSel(x), dord: null }); } // dord reset: lands at the bottom of "נבחר"
  /* move one item to another category (list); it keeps its selected state and goes to the top of that list */
  function moveItem(id, cid) {
    var x = items[id]; if (!x || x.deleted || x.sec === cid || !catOf(cid)) return false;
    upd(id, { sec: cid, done: isSel(x), order: nextOrder(cid), dord: null }); return true;
  }

  /* ---------- prices (same as Purchasify): optional, in ₪, stored on the item as a number "price"; a list shows the ₪ column and
     the total when its category record has price: 1 (set by the import, or with ₪ in the list editor) or any item has a price ---------- */
  function parsePrice(v) {
    v = String(v == null ? "" : v).replace(/[₪\s\u00a0]/g, "").replace(/,/g, ".");
    if (!v) return null;
    if (!/^\d*\.?\d*$/.test(v) || v === ".") return NaN;
    var n = Math.round(parseFloat(v) * 100) / 100;
    return isFinite(n) && n >= 0 && n < 1e7 ? n : NaN;
  }
  var NF = null;
  function fmtPrice(n) { try { NF = NF || new Intl.NumberFormat("he-IL", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); return NF.format(n || 0); } catch (e) { return String(Math.round((n || 0) * 100) / 100); } }
  function priceOf(x) { return typeof x.price === "number" && isFinite(x.price) ? x.price : 0; }
  function hasPrices(sec) { var r = catRec(sec); if (r && r.price) return true; return live(sec).some(function (x) { return typeof x.price === "number"; }); }
  function sumNow() {
    var el = $("sum"), sec = curTab(); if (!el) return;
    if (!uid || !sec || !hasPrices(sec)) { el.hidden = true; return; }
    var ae = document.activeElement, lv = null, tot = 0, sel = 0;
    if (ae && ae.getAttribute && ae.getAttribute("data-price")) { var v = parsePrice(ae.value); if (!(typeof v === "number" && isNaN(v))) lv = { id: ae.getAttribute("data-price"), v: v || 0 }; }
    live(sec).forEach(function (x) { var p = lv && lv.id === x.id ? lv.v : priceOf(x); tot += p; if (isSel(x)) sel += p; });
    el.hidden = false;
    el.innerHTML = "<span>" + esc(t("sumTotal")) + ": <b>" + esc(fmtPrice(tot)) + ' ₪</b></span><span class="sel">· ' + esc(t("sumSel")) + ": <b>" + esc(fmtPrice(sel)) + " ₪</b></span>";
  }
  function commitPrice(inp) {
    var id = inp.getAttribute("data-price"), x = items[id]; if (!x || x.deleted) return true;
    var v = parsePrice(inp.value);
    if (typeof v === "number" && isNaN(v)) { inp.classList.add("bad"); return false; }
    inp.classList.remove("bad");
    var old = typeof x.price === "number" ? x.price : null;
    if (v !== old) { upd(id, { price: v }); pending = true; saveLocal(); syncSoon(); }
    inp.value = v == null ? "" : String(v); sumNow(); return true;
  }

  /* ---------- one-time undo of the v13 Purchasify import (v14) ----------
     v13 copied Purchasify into Listify with fixed ids: lists "c:sh-<cat>" (cat "sh-<cat>") and items "sh-<id>", plus the marker
     "m:shopimport". This removes every list whose cat starts with "sh-" (with everything in it) and any leftover "sh-" item.
     It only touches Listify's own records (app "myideas"); Purchasify (app "shopping") is never read or written here.
     Before deleting, the whole Listify copy is saved on this device: rg-myideas-undo-bak:<user id>.
     A marker { id: "m:shopundo" } keeps it from running again. */
  function undoImport() {
    if (!items["m:shopimport"] || items["m:shopundo"]) return false;
    try { localStorage.setItem("rg-myideas-undo-bak:" + uid, JSON.stringify({ t: Date.now(), items: items })); } catch (e) { return false; }
    bulkOk = Date.now() + 60000;
    var k, x, cs = [];
    for (k in items) { x = items[k]; if (x && x.type === "cat" && typeof x.cat === "string" && x.cat.indexOf("sh-") === 0 && !x.gone) cs.push(x.cat); }
    cs.forEach(function (cid) { delCat(cid); });
    for (k in items) { x = items[k]; if (k.indexOf("sh-") === 0 && x && !x.deleted) del(k); }
    put({ id: "m:shopundo", type: "meta", done: 1, lists: cs.length, at: now() });
    return true;
  }

  /* ---------- render ---------- */
  var MVICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/><path d="M15 12H4"/><path d="M8 8l-4 4 4 4"/></svg>';
  var TRASHICON = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/></svg>';
  function editor(x) {
    return '<div class="ed" data-ed="' + esc(x.id) + '">' +
      '<input type="text" class="e-text" maxlength="200" enterkeyhint="done" value="' + esc(label(x)) + '" placeholder="' + esc(t("phTitle")) + '" aria-label="' + esc(t("phTitle")) + '">' +
      '<textarea class="e-note" maxlength="500" placeholder="' + esc(t("phNote")) + '" aria-label="' + esc(t("phNote")) + '">' + esc(x.note || "") + "</textarea>" +
      '<input type="text" class="e-price" inputmode="decimal" maxlength="10" placeholder="' + esc(t("priceLabel")) + '" aria-label="' + esc(t("priceLabel")) + '" value="' + (typeof x.price === "number" ? esc(String(x.price)) : "") + '">' +
      '<div class="row"><button type="button" class="btn pri" data-a="save">' + esc(t("save")) + '</button><button type="button" class="btn" data-a="cancel">' + esc(t("cancel")) +
      '</button><button type="button" class="btn dng" data-a="del">' + esc(t("del")) + "</button></div></div>";
  }
  var GRIP = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14"/></svg>';
  var showP = false;
  function row(x) { // ☰ on every item, open and selected (same look and place as Purchasify)
    if (editing === x.id) return '<li data-id="' + esc(x.id) + '">' + editor(x) + "</li>";
    var sel = isSel(x), n = label(x);
    return '<li data-id="' + esc(x.id) + '"' + (sel ? ' class="done"' : "") + '>' +
      '<span class="handle ihandle" title="' + esc(t("dragItem")) + '" aria-label="' + esc(t("dragItem") + ": " + n) + '">☰</span>' + '<button type="button" class="chk" data-a="toggle" aria-pressed="' + sel + '" aria-label="' + esc((sel ? t("uncheck") : t("check")) + ": " + n) + '"><i aria-hidden="true">✓</i></button>' +
      '<div class="body" role="button" tabindex="0" data-a="edit" title="' + esc(t("edit")) + '"><span class="txt">' + esc(n) + "</span>" + (x.note ? '<span class="note">' + esc(x.note) + "</span>" : "") + "</div>" +
      (showP ? '<input class="pin" data-price="' + esc(x.id) + '" type="text" inputmode="decimal" maxlength="10" enterkeyhint="done" autocomplete="off" placeholder="₪" value="' + (typeof x.price === "number" ? esc(String(x.price)) : "") + '" aria-label="' + esc(t("priceLabel") + ": " + n) + '">' : "") +
      "</li>"; // move + delete live in the swipe-left menu (no row icons, so the text gets the room)
  }
  function panel(sec) {
    showP = hasPrices(sec);
    var act = openIn(sec), done = selIn(sec);
    return '<form class="addform" data-add="' + esc(sec) + '" autocomplete="off"><div class="addrow"><input type="text" name="text" maxlength="200" enterkeyhint="done" placeholder="' + esc(t("phTitle")) + '" aria-label="' + esc(t("phTitle")) + '"><button type="submit">' + esc(t("add")) + "</button></div>" +
      '<div class="addextra"><input type="text" name="note" maxlength="500" enterkeyhint="done" placeholder="' + esc(t("phNote")) + '" aria-label="' + esc(t("phNote")) + '">' +
      (showP ? '<input type="text" name="price" class="addprice" inputmode="decimal" maxlength="10" enterkeyhint="done" placeholder="₪" aria-label="' + esc(t("priceLabel")) + '">' : "") + "</div></form>" +
      (done.length ? '<details class="donebox" data-sec="' + esc(sec) + '"' + (doneOpen[sec] !== false ? " open" : "") + '><summary>' + esc(t("doneHead")) + "</summary>" +
        '<div class="card listcard"><ul class="list" id="list-done">' + done.map(row).join("") + "</ul></div></details>" : "") +  // selected ("נבחר") group sits ABOVE the open items (Ron 30.10)

      (act.length ? '<div class="card listcard"><ul class="list" id="list-active">' + act.map(row).join("") + "</ul></div>"
        : '<div class="card empty"><p>' + esc(t(done.length ? "allDone" : "emptyList")) + "</p></div>") + '<div class="sum" id="sum" hidden></div>';
  }
  function render() {
    var panels = $("panels"), pn = $("picker-name"); if (!panels || !pn) return;
    if (drag || idrag) { needRender = true; return; } // never rebuild under a finger that is dragging (a category or an item)
    if (!uid) { pn.textContent = ""; closeMenu(); panels.innerHTML = ""; setStatus(); return; } // signed out: nothing private on the page
    if (editing && (!items[editing] || items[editing].deleted)) editing = null;
    var ae = document.activeElement, keep = null;
    if (ae && ae.closest && ae.closest(".addform")) keep = { form: ae.closest(".addform").getAttribute("data-add"), name: ae.name };
    var drafts = {}; document.querySelectorAll(".addform input").forEach(function (i) { drafts[i.closest("form").getAttribute("data-add") + "/" + i.name] = i.value; });
    var edVals = null, ed = editing && document.querySelector('[data-ed="' + editing + '"]');
    if (ed) edVals = [].map.call(ed.querySelectorAll("input,textarea"), function (e) { return e.value; });
    var pk = null; if (ae && ae.getAttribute && ae.getAttribute("data-price")) pk = { id: ae.getAttribute("data-price"), v: ae.value, s: ae.selectionStart, e: ae.selectionEnd };
    rendering = true;
    var cur = curTab(), cc = cur && catOf(cur);
    pn.textContent = cc ? catName(cc) : t("noCats");
    $("picker").setAttribute("aria-label", t("pickList") + ": " + pn.textContent); $("picker").title = t("pickList");
    var le = $("list-edit"); le.setAttribute("aria-label", t("editTitle")); le.title = t("editTitle");
    if (menuOpen()) fillMenu();
    var hint = $("cathint"); if (hint) { hint.textContent = t("catHint"); hint.hidden = !!lsGet("rg-myideas-hint2"); }
    panels.innerHTML = !cur ? '<div class="card empty"><p>' + esc(t("noCats")) + "</p></div>" : '<section role="tabpanel" data-panel="' + esc(cur) + '">' + panel(cur) + "</section>";
    document.querySelectorAll(".addform input").forEach(function (i) { var v = drafts[i.closest("form").getAttribute("data-add") + "/" + i.name]; if (v) i.value = v; });
    if (keep) { var k = document.querySelector('.addform[data-add="' + keep.form + '"] [name="' + keep.name + '"]'); if (k) k.focus(); }
    if (editing) {
      var ne = document.querySelector('[data-ed="' + editing + '"]');
      if (ne) { if (edVals) [].forEach.call(ne.querySelectorAll("input,textarea"), function (e, n) { if (n < edVals.length) e.value = edVals[n]; }); if (!ed) { var ti = ne.querySelector(".e-text"); ti.focus(); var L = ti.value.length; try { ti.setSelectionRange(L, L); } catch (e) {} } }
    }
    if (pk) { var pi = document.querySelector('[data-price="' + pk.id + '"]'); if (pi) { pi.value = pk.v; pi.focus(); try { pi.setSelectionRange(pk.s, pk.e); } catch (e) {} } }
    sumNow();
    rendering = false;
    setStatus();
  }

  function saveEdit(id) {
    var ed = document.querySelector('[data-ed="' + id + '"]'), x = items[id]; editing = null;
    if (!ed || !x || x.deleted) { render(); return; }
    var text = clean(ed.querySelector(".e-text").value, 200);
    if (!text) { render(); return; }
    var p = {};
    if (text !== label(x)) { p.text = text; p.seed = null; } // once edited, the first item keeps its own text
    var nt = clean(ed.querySelector(".e-note").value, 500); if (nt !== (x.note || "")) p.note = nt;
    var pe = ed.querySelector(".e-price"), pv = pe ? parsePrice(pe.value) : (typeof x.price === "number" ? x.price : null);
    if (typeof pv === "number" && isNaN(pv)) { editing = id; pe.classList.add("bad"); pe.focus(); return; }
    if (pv !== (typeof x.price === "number" ? x.price : null)) p.price = pv;
    if (Object.keys(p).length) { upd(id, p); changed(); return; }
    render();
  }

  /* ---------- toast (gold, at the bottom) + delete with a 5-second undo ---------- */
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
    toast(t("deleted").replace("{x}", label(keep)), function () { keep.at = now(); put(keep); changed(); });
  }
  function askDel(id) { delWithUndo(id); }

  /* ---------- sheets (bottom panels) ---------- */
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
  function closeSheet() { var w = $("sheet"); if (!w) return; var f = w.onClose; w.onClose = null; w.parentNode.removeChild(w); if (f) f(); }
  function nameSheet(title, value, isNew, done) {
    var w = sheet('<h3>' + esc(title) + '</h3><form class="sform" autocomplete="off"><input type="text" class="s-name" maxlength="40" enterkeyhint="done" value="' + esc(value || "") + '" placeholder="' + esc(t("catPh")) + '" aria-label="' + esc(t("catPh")) + '">' +
      '<div class="row"><button type="submit" class="btn pri">' + esc(t(isNew ? "create" : "save")) + '</button><button type="button" class="btn" data-s="x">' + esc(t("cancel")) + "</button></div></form>",
      function (a) { if (a === "x") closeSheet(); });
    w.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault(); var v = clean(w.querySelector(".s-name").value, 40); if (!v) { w.querySelector(".s-name").focus(); return; }
      closeSheet(); done(v);
    });
  }
  /* move one item to another list through a small menu (same save + sync as every other change) */
  function moveTo(id, cid) {
    var c = catOf(cid); if (!c) return;
    if (editing === id) editing = null;
    if (moveItem(id, cid)) { changed(); toast(t("movedTo").replace("{x}", catName(c))); }
  }
  function moveMenu(id) {
    var x = items[id]; if (!x || x.deleted) return;
    var from = x.sec, others = cats().filter(function (c) { return c.cat !== from; });
    var html = '<h3>' + esc(t("moveTitle")) + '</h3><p class="mnote">' + esc(label(x)) + "</p>";
    if (others.length) html += others.map(function (c) { return '<button type="button" class="mi" data-s="to:' + esc(c.cat) + '">' + esc(catName(c)) + "</button>"; }).join("");
    else html += '<p class="mnote">' + esc(t("noOther")) + '</p><button type="button" class="mi big" data-s="new">' + esc("＋ " + t("catAdd")) + "</button>";
    html += '<button type="button" class="mi" data-s="x">' + esc(t("cancel")) + '</button><button type="button" class="mi dng" data-s="del">' + esc(t("delItem")) + "</button>";
    sheet(html, function (a) {
      if (a === "x") { closeSheet(); return; }
      if (a === "del") { closeSheet(); delWithUndo(id); return; }
      if (a === "new") { nameSheet(t("catAdd"), "", true, function (v) { var nid = addCat(v, "task"); if (nid) moveTo(id, nid); }); return; }
      if (a.indexOf("to:") === 0) { closeSheet(); moveTo(id, a.slice(3)); }
    });
  }
  function selectTab(cid) { tab = cid; editing = null; lsSet("rg-myideas-tab", tab); closeMenu(); render(); try { window.scrollTo({ top: 0 }); } catch (e) {} }
  function hideHint() { lsSet("rg-myideas-hint2", "1"); var h = $("cathint"); if (h) h.hidden = true; }

  /* ---------- drag-to-reorder for a vertical list of rows (lists in ☰ edit mode, items in a list).
     Nothing moves in the page while the finger is down: the lifted row follows the finger (transform) and the other rows slide out of
     its way (transform), so the pointer capture is never lost. The page (or the scrolling box) scrolls by itself near its edges.
     end() returns the new order of the rows. ---------- */
  function makeSorter(rows, el, y0, box) {
    function sy() { return box ? box.scrollTop : (window.scrollY || window.pageYOffset || 0); }
    var s0 = sy(), from = rows.indexOf(el), to = from, n = rows.length, lastY = y0, raf = 0, alive = true;
    var info = rows.map(function (r) { var b = r.getBoundingClientRect(); return { el: r, top: b.top + s0, h: b.height }; });
    var gap = from < n - 1 ? info[from + 1].top - info[from].top : from > 0 ? info[from].top - info[from - 1].top - info[from - 1].h + info[from].h : info[from].h;
    rows.forEach(function (r) { if (r !== el) r.style.transition = "transform .16s ease"; });
    el.style.transition = "none"; el.classList.add("sorting");
    function place() {
      var dy = lastY + sy() - (y0 + s0), c = info[from].top + info[from].h / 2 + dy, i;
      el.style.transform = "translateY(" + dy + "px)";
      to = from;
      for (i = 0; i < from; i++) if (c < info[i].top + info[i].h / 2) { to = i; break; }
      for (i = n - 1; i > from; i--) if (c > info[i].top + info[i].h / 2) { to = i; break; }
      info.forEach(function (o, k) {
        if (k === from) return;
        var sh = (from < to && k > from && k <= to) ? -gap : (to < from && k >= to && k < from) ? gap : 0;
        o.el.style.transform = sh ? "translateY(" + sh + "px)" : "";
      });
    }
    function tick() { // auto-scroll near the top / bottom edge
      if (!alive) return;
      var top, bot, z = 70, sp = 0;
      if (box) { var r = box.getBoundingClientRect(); top = r.top; bot = r.bottom; z = Math.min(56, r.height / 4); } else { top = 0; bot = window.innerHeight; }
      if (lastY < top + z) sp = -Math.ceil((top + z - lastY) / 4); else if (lastY > bot - z) sp = Math.ceil((lastY - (bot - z)) / 4);
      if (sp) { var b = sy(); if (box) box.scrollTop += sp; else window.scrollBy(0, sp); if (sy() !== b) place(); }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return {
      move: function (y) { lastY = y; place(); },
      end: function () {
        alive = false; cancelAnimationFrame(raf);
        rows.forEach(function (r) { r.style.transition = "none"; r.style.transform = ""; r.classList.remove("sorting"); });
        setTimeout(function () { rows.forEach(function (r) { r.style.transition = ""; }); }, 0);
        var out = rows.slice(); out.splice(to, 0, out.splice(from, 1)[0]);
        return { order: out, moved: to !== from };
      }
    };
  }

  /* ---------- list picker: a big button with the open list; it opens every list + "＋ new list". ☰ = edit mode ---------- */
  function menuOpen() { var m = $("pmenu"); return m && !m.hidden; }
  function closeMenu() { var m = $("pmenu"), p = $("picker"); if (m) m.hidden = true; if (p) p.setAttribute("aria-expanded", "false"); }
  function fillMenu() {
    var m = $("pmenu"), cur = curTab(); if (!m) return;
    m.innerHTML = cats().map(function (c) {
      return '<button type="button" class="popt" role="option" data-pick="' + esc(c.cat) + '" aria-selected="' + (c.cat === cur) + '"><span class="pn">' + esc(catName(c)) + '</span><span class="pk" aria-hidden="true">' + (c.cat === cur ? "✓" : "") + "</span></button>";
    }).join("") + '<button type="button" class="popt padd" data-pick="+">' + esc("＋ " + t("catAdd")) + "</button>";
  }
  function openMenu() { hideHint(); fillMenu(); var m = $("pmenu"); m.hidden = false; $("picker").setAttribute("aria-expanded", "true"); var s = m.querySelector('[aria-selected="true"]'); if (s) s.focus(); }
  function newList(after) {
    nameSheet(t("catAdd"), "", true, function (v) { var id = addCat(v, "task"); if (id) { changed(); if (after) after(id); } });
  }

  function editSheet() {
    hideHint(); closeMenu();
    var order = cats().map(function (c) { return c.cat; }), sorter = null, sd = null;
    function rowHtml(cid) {
      var c = catOf(cid); if (!c) return "";
      return '<li class="erow" data-cat="' + esc(cid) + '"><span class="handle" role="button" tabindex="0" aria-label="' + esc(t("dragHandle") + ": " + catName(c)) + '" title="' + esc(t("dragHandle")) + '">' +
        GRIP + '</span>' +
        '<span class="ename">' + esc(catName(c)) + '</span>' +
        '<button type="button" class="eic" data-s="ren:' + esc(cid) + '" title="' + esc(t("renameShort")) + '" aria-label="' + esc(t("renameShort") + ": " + catName(c)) + '">✏️</button>' +
        '<button type="button" class="eic eprice' + (catRec(cid) && catRec(cid).price ? " on" : "") + '" data-s="prc:' + esc(cid) + '" title="' + esc(t("priceToggle")) + '" aria-pressed="' + !!(catRec(cid) && catRec(cid).price) + '" aria-label="' + esc(t("priceToggle") + ": " + catName(c)) + '">₪</button>' +
        '<button type="button" class="eic" data-s="del:' + esc(cid) + '" title="' + esc(t("delShort")) + '" aria-label="' + esc(t("delShort") + ": " + catName(c)) + '">🗑</button></li>';
    }
    function save() { var ids = order.filter(function (cid) { return !!catOf(cid); }); var cur = cats().map(function (c) { return c.cat; }); cur.forEach(function (cid) { if (ids.indexOf(cid) < 0) ids.push(cid); }); if (ids.join() !== cur.join()) { setOrder(ids); changed(); } }
    var w = sheet('<div class="ehead"><h3>' + esc(t("editTitle")) + '</h3><button type="button" class="donebtn" data-s="done" title="' + esc(t("finish")) + '" aria-label="' + esc(t("finish")) + '">✓</button></div>' +
      '<p class="mnote">' + esc(t("editNote")) + '</p><ul class="elist" id="elist">' + order.map(rowHtml).join("") + "</ul>" +
      '<button type="button" class="mi big" data-s="new">' + esc("＋ " + t("catAdd")) + "</button>",
      function (a, w) {
        if (a === "done") { closeSheet(); return; }
        if (a === "new") { save(); w.onClose = null; newList(function (id) { selectTab(id); editSheet(); }); return; }
        var cid = a.slice(4), li = w.querySelector('.erow[data-cat="' + cid + '"]'), c = catOf(cid); if (!li || !c) return;
        if (a.indexOf("prc:") === 0) {
          var onP = !(catRec(cid) && catRec(cid).price); upCat(cid, { price: onP ? 1 : null }); changed();
          var pb = li.querySelector(".eprice"); if (pb) { pb.classList.toggle("on", onP); pb.setAttribute("aria-pressed", String(onP)); }
          return;
        }
        if (a.indexOf("ren:") === 0) {
          var sp = li.querySelector(".ename"); if (!sp || li.querySelector(".einput")) return;
          var inp = document.createElement("input"); inp.type = "text"; inp.className = "einput"; inp.maxLength = 40; inp.value = catName(c); inp.setAttribute("enterkeyhint", "done"); inp.setAttribute("aria-label", t("catPh"));
          sp.replaceWith(inp); inp.focus(); inp.select();
          var fini = false, fin = function (ok) {
            if (fini || !inp.parentNode) return; fini = true;
            var v = clean(inp.value, 40), s2 = document.createElement("span"); s2.className = "ename";
            if (ok && v && v !== catName(c)) { upCat(cid, { name: v }); changed(); }
            s2.textContent = catName(catOf(cid) || c); inp.replaceWith(s2);
          };
          inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); fin(true); } else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); fin(false); } });
          inp.addEventListener("blur", function () { fin(true); });
        } else if (a.indexOf("del:") === 0) {
          if (cats().length <= 1) { window.alert(t("lastCat")); return; }
          if (window.confirm(t("confirmDelCat").replace("{x}", catName(c)))) {
            bulkOk = Date.now() + 60000; delCat(cid); if (tab === cid) { tab = ""; lsSet("rg-myideas-tab", curTab()); }
            order = order.filter(function (x) { return x !== cid; }); li.parentNode.removeChild(li); changed();
          }
        }
      });
    w.classList.add("editmode");
    w.onClose = save;
    var list = w.querySelector("#elist");
    list.addEventListener("pointerdown", function (e) {
      var h = e.target.closest(".handle"); if (!h || sorter || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.preventDefault();
      var li = h.closest(".erow"), rows = [].slice.call(list.children);
      sd = { pid: e.pointerId, h: h }; sorter = makeSorter(rows, li, e.clientY, list.scrollHeight > list.clientHeight + 2 ? list : null);
      try { h.setPointerCapture(e.pointerId); } catch (e2) {}
      if (navigator.vibrate) try { navigator.vibrate(10); } catch (e3) {}
    });
    function mv(e) { if (sorter && e.pointerId === sd.pid) { e.preventDefault(); sorter.move(e.clientY); } }
    function upE(e) {
      if (!sorter || e.pointerId !== sd.pid) return;
      var r = sorter.end(); sorter = null; sd = null;
      if (r.moved) { r.order.forEach(function (li) { list.appendChild(li); }); order = r.order.map(function (li) { return li.getAttribute("data-cat"); }); }
    }
    list.addEventListener("pointermove", mv); list.addEventListener("pointerup", upE); list.addEventListener("pointercancel", upE);
    list.addEventListener("keydown", function (e) { // keyboard: arrow up / down on a handle moves the list
      var h = e.target.closest && e.target.closest(".handle"); if (!h || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return; e.preventDefault();
      var li = h.closest(".erow"), sib = e.key === "ArrowUp" ? li.previousElementSibling : li.nextElementSibling; if (!sib) return;
      if (e.key === "ArrowUp") list.insertBefore(li, sib); else list.insertBefore(sib, li);
      order = [].map.call(list.children, function (x) { return x.getAttribute("data-cat"); }); h.focus();
    });
  }

  function bootLists() {
    $("picker").addEventListener("click", function (e) { e.stopPropagation(); if (menuOpen()) closeMenu(); else openMenu(); });
    $("list-edit").addEventListener("click", function (e) { e.stopPropagation(); editSheet(); });
    $("pmenu").addEventListener("click", function (e) {
      e.stopPropagation(); var b = e.target.closest("[data-pick]"); if (!b) return;
      var p = b.getAttribute("data-pick");
      if (p === "+") { closeMenu(); newList(function (id) { selectTab(id); }); } else selectTab(p);
    });
    document.addEventListener("click", function (e) { if (menuOpen() && !e.target.closest("#listbar")) closeMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menuOpen()) { closeMenu(); $("picker").focus(); } });
  }

  /* ---------- items: swipe (on the row body) right = נבחר (and back), left = move/delete menu;
     the ☰ handle on an open item = drag it to any place in the list, right away (no long-press) ---------- */
  function bootItemDrag() {
    var main = document.querySelector("main"), SLOP = 10, SWIPE = 0.35;
    function reset() {
      if (idrag) { unswipe(); if (idrag.sorter) idrag.sorter.end(); }
      var tip = $("drophint"); if (tip) tip.hidden = true;
      document.body.classList.remove("idragging"); idrag = null;
      if (needRender && !drag) { needRender = false; render(); }
    }
    function unswipe() { if (idrag && idrag.li) { idrag.li.classList.remove("swiping", "sw-r", "sw-l", "sw-go"); idrag.li.style.removeProperty("--sx"); } }
    main.addEventListener("pointerdown", function (e) {
      var li = e.target.closest(".list > li[data-id]"); if (!li || li.querySelector(".ed") || editing) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      var h = e.target.closest(".ihandle");
      if (h) { // drag handle: lift now
        var ul = li.parentNode; if (!ul || (ul.id !== "list-active" && ul.id !== "list-done")) return;
        e.preventDefault(); reset(); hideHint();
        idrag = { li: li, id: li.getAttribute("data-id"), x: e.clientX, y: e.clientY, pid: e.pointerId, type: e.pointerType, lifted: true, f: ul.id === "list-done" ? "dord" : "order" };
        idrag.sorter = makeSorter([].slice.call(ul.children), li, e.clientY, null);
        document.body.classList.add("idragging");
        try { h.setPointerCapture(e.pointerId); } catch (e2) {}
        if (navigator.vibrate) try { navigator.vibrate(10); } catch (e3) {}
        var tip = $("drophint"); if (tip) { tip.textContent = t("dropHint"); tip.hidden = false; }
        return;
      }
      if (e.target.closest("button,input,select,textarea,summary,a")) return;
      reset();
      idrag = { li: li, id: li.getAttribute("data-id"), x: e.clientX, y: e.clientY, pid: e.pointerId, type: e.pointerType, lifted: false };
    });
    document.addEventListener("pointermove", function (e) {
      if (!idrag || e.pointerId !== idrag.pid) return;
      var dx = e.clientX - idrag.x, dy = e.clientY - idrag.y;
      if (idrag.lifted) { e.preventDefault(); idrag.sorter.move(e.clientY); return; }
      if (idrag.swipe) {
        e.preventDefault();
        var w = idrag.li.offsetWidth || 1, go = Math.abs(dx) >= w * SWIPE;
        idrag.li.style.setProperty("--sx", dx + "px");
        idrag.li.classList.toggle("sw-r", dx > 0); idrag.li.classList.toggle("sw-l", dx < 0); idrag.li.classList.toggle("sw-go", go);
        return;
      }
      if (Math.abs(dx) <= SLOP && Math.abs(dy) <= SLOP) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.5) { // clearly sideways: a swipe
        idrag.swipe = true; idrag.li.classList.add("swiping");
        try { idrag.li.setPointerCapture(idrag.pid); } catch (e2) {}
        e.preventDefault(); return;
      }
      reset(); // vertical: a normal scroll
    });
    function up(e) {
      if (!idrag || e.pointerId !== idrag.pid) return;
      var d = idrag;
      if (d.swipe) {
        noClick = true; setTimeout(function () { noClick = false; }, 400);
        var w = d.li.offsetWidth || 1, dx = e.type === "pointerup" ? e.clientX - d.x : 0, id = d.id;
        reset();
        if (Math.abs(dx) >= w * SWIPE) {
          var x = items[id];
          if (dx > 0 && x && !x.deleted) { toggleSel(id); changed(); if (navigator.vibrate) try { navigator.vibrate(10); } catch (e3) {} }
          else if (dx < 0) moveMenu(id);
        }
        return;
      }
      if (d.lifted) {
        noClick = true; setTimeout(function () { noClick = false; }, 400);
        var r = d.sorter.end(); d.sorter = null;
        reset();
        if (r.moved) { setItemOrder(r.order.map(function (li) { return li.getAttribute("data-id"); }), d.f); changed(); }
      } else reset();
    }
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
    document.addEventListener("touchmove", function (e) { if (idrag && (idrag.lifted || idrag.swipe)) e.preventDefault(); }, { passive: false });
  }

  function boot() {
    var main = document.querySelector("main");
    if (!main) return;
    try { bootLists(); } catch (e) { setTimeout(function () { throw e; }); } // the lists still load and show even if a control fails
    try { bootItemDrag(); } catch (e) { setTimeout(function () { throw e; }); }
    main.addEventListener("submit", function (e) {
      var f = e.target.closest("[data-add]"); if (!f) return; e.preventDefault();
      var sec = f.getAttribute("data-add"), ti = f.querySelector('[name="text"]'); if (!clean(ti.value, 200)) { ti.focus(); return; }
      var nf = f.querySelector('[name="note"]'), pf = f.querySelector('[name="price"]'), pr = pf ? parsePrice(pf.value) : null;
      if (typeof pr === "number" && isNaN(pr)) { pf.focus(); pf.select(); return; }
      add(sec, ti.value, nf ? nf.value : "", pr); f.reset(); f.querySelectorAll("input").forEach(function (i) { i.value = ""; });
      changed(); var n = document.querySelector('.addform[data-add="' + sec + '"] [name="text"]'); if (n) n.focus();
    });
    main.addEventListener("keydown", function (e) {
      var f = e.target.closest && e.target.closest(".addform");
      if (f && e.key === "Enter" && e.target.name === "text" && !e.isComposing) { e.preventDefault(); f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); }
      if (e.target.classList && e.target.classList.contains("body") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.target.click(); }
      var ed = e.target.closest && e.target.closest("[data-ed]");
      if (ed) {
        if (e.key === "Escape") { e.preventDefault(); editing = null; render(); }
        else if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); saveEdit(ed.getAttribute("data-ed")); }
      }
    });
    main.addEventListener("keydown", function (e) {
      if (!e.target.getAttribute || !e.target.getAttribute("data-price")) return;
      if (e.key === "Enter") { e.preventDefault(); if (commitPrice(e.target)) e.target.blur(); }
      else if (e.key === "Escape") { e.preventDefault(); var xx = items[e.target.getAttribute("data-price")]; e.target.value = xx && typeof xx.price === "number" ? String(xx.price) : ""; e.target.classList.remove("bad"); e.target.blur(); sumNow(); }
    });
    main.addEventListener("focusout", function (e) { if (!rendering && e.target.getAttribute && e.target.getAttribute("data-price")) commitPrice(e.target); });
    main.addEventListener("input", function (e) { if (e.target.getAttribute && e.target.getAttribute("data-price")) { e.target.classList.remove("bad"); sumNow(); } });
    main.addEventListener("toggle", function (e) { if (e.target.classList && e.target.classList.contains("donebox")) doneOpen[e.target.getAttribute("data-sec")] = e.target.open; }, true);
    main.addEventListener("click", function (e) {
      if (noClick && e.target.closest(".list")) { noClick = false; e.preventDefault(); return; }
      var b = e.target.closest("[data-a]"); if (!b) return;
      var a = b.getAttribute("data-a");
      var li = b.closest("[data-id]"), id = li && li.getAttribute("data-id"), x = id && items[id]; if (!x) return;
      if (a === "move") { moveMenu(id); return; }
      if (a === "trash") { delWithUndo(id); return; }
      if (a === "toggle") { toggleSel(id); changed(); }
      else if (a === "edit") { editing = id; render(); }
      else if (a === "save") saveEdit(id);
      else if (a === "cancel") { editing = null; render(); }
      else if (a === "del") askDel(id);
    });
    M.onLang(render);
    function onUser(u) {
      var id = u ? u.id : null; if (id === uid) return;
      if (!id && uid) { var c = jparse(lsGet(cacheKey(uid)), null); if (!c || !c.pending) lsSet(cacheKey(uid), null); } // signed out: drop this device's copy unless unsynced
      uid = id; editing = null; offline = false; loadLocal(); render();
      if (uid) sync();
    }
    onUser(A.user());
    A.onChange(onUser);
    A.ready.then(function () { onUser(A.user()); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
