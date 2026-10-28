/* Shopping list (my/shopping/) — private, per-user, live-synced through RGAccount (Appwrite rows app="shopping",
   readable/writable by the signed-in user only).
   Row key="items" (unchanged): { v: 1, items: { <id>: { id, text, done, created, at, list?, deleted? } } }
     "list" = the category an item belongs to. No "list" = the built-in "קניות" category (every item saved before tabs existed),
     "tea" = the built-in "תה" category, anything else = a custom category id. An item whose category is unknown shows in the
     first category, so nothing is ever hidden or lost.
   Row key="cats" (new, since categories): { v: 1, cats: { "c:<cat>": { id, type: "cat", cat, name?, pos, gone?, created, at } } }
     The two built-in categories ("main", "tea") exist without a record until they are renamed, moved or deleted
     (gone: 1 hides one; it is not a tombstone, so it is never pruned and never comes back). Categories live in their own row so an
     old cached copy of the app (which only knows "items") never sees or drops them.
   Merge (both rows): per id, the newer "at" wins (last write wins); deletions are tombstones (deleted: true), pruned after 30 days.
   Offline-first: kept in localStorage per user (rg-my-shopping:<user id>) and merged into the cloud copy on every sync. */
(function () {
  "use strict";
  var APP = "shopping", KEY = "items", CKEY = "cats", POLL_MS = 10000, TOMB_MS = 30 * 24 * 3600 * 1000;
  var SUGGESTED = ["אבקת שוקו", "ממרח שוקולד נוטלה", "חלב עמיד", "רביולי גבינות", "גבינה עם שום שמיר למריחה"];
  var BUILTIN = [{ cat: "main", def: "tabMain", ph: "ph", empty: "empty", pos: 0 }, { cat: "tea", def: "tabTea", ph: "phTea", empty: "emptyTea", pos: 1 }];
  var A = window.RGAccount, M = window.RGMy, t = M.t;
  var uid = null, items = {}, catsMap = {}, pending = false, busy = false, again = false, offline = false, lastT = 0, editing = null, soonT = 0, rendering = false;
  var drag = null, idrag = null, needRender = false, noClick = false; // drag = a category row being reordered, idrag = an item being swiped

  function $(id) { return document.getElementById(id); }
  function on(id, ev, fn) { var el = $(id); if (el) el.addEventListener(ev, fn); } // a missing element (old cached page) never stops the app from loading
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function jparse(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
  function cacheKey(id) { return "rg-my-shopping:" + id; }
  function now() { lastT = Math.max(Date.now(), lastT + 1); return lastT; }
  function newId() { return now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function clean(s, n) { return String(s || "").replace(/\s+/g, " ").trim().slice(0, n); }
  var tab = lsGet("rg-my-shopping-tab") || "main";

  /* ---------- local cache (same key as before; "cats" is simply an extra field) ---------- */
  function loadLocal() {
    var c = uid ? jparse(lsGet(cacheKey(uid)), null) : null;
    items = (c && c.items && typeof c.items === "object") ? c.items : {};
    catsMap = (c && c.cats && typeof c.cats === "object") ? c.cats : {};
    pending = !!(c && c.pending);
  }
  function saveLocal() { if (uid) lsSet(cacheKey(uid), JSON.stringify({ items: items, cats: catsMap, pending: pending })); }
  window.addEventListener("storage", function (e) { if (uid && e.key === cacheKey(uid)) { loadLocal(); render(); } });

  /* ---------- merge ---------- */
  function newer(a, b) {
    if (!a) return b; if (!b) return a;
    if ((a.at || 0) !== (b.at || 0)) return (a.at || 0) > (b.at || 0) ? a : b;
    if (!!a.deleted !== !!b.deleted) return a.deleted ? a : b; // same instant: deletion wins
    return JSON.stringify(a) >= JSON.stringify(b) ? a : b;     // deterministic on every device
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

  /* ---------- categories ---------- */
  function cats() {
    var map = {}, out = [], k, c;
    BUILTIN.forEach(function (s) { map[s.cat] = { cat: s.cat, pos: s.pos, created: 0, def: s.def, ph: s.ph, empty: s.empty }; });
    for (k in catsMap) { var r = catsMap[k]; if (!r || r.deleted || r.type !== "cat" || typeof r.cat !== "string") continue;
      var b = map[r.cat] || {};
      map[r.cat] = { cat: r.cat, pos: typeof r.pos === "number" ? r.pos : (b.pos || 0), created: r.created || 0, name: r.name, gone: r.gone, def: b.def, ph: b.ph, empty: b.empty }; }
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
  // so nothing is ever lost even if a bug writes something wrong: rg-my-shopping-bak:<user id> = [{ t, items, cats }, ...]
  var BAK_N = 5, bulkOk = 0;
  function bakKey(id) { return "rg-my-shopping-bak:" + id; }
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
  function setStatus() {
    var s = $("status"); if (!s) return;
    s.className = "status" + (offline ? " off" : "");
    s.textContent = !uid ? "" : offline ? t("offline") : (pending || busy) ? t("saving") : t("synced");
  }
  function sync() {
    if (!uid || !A) return Promise.resolve();
    if (busy) { again = true; return Promise.resolve(); }
    busy = true; again = false; setStatus();
    var who = uid, sentI = null, sentC = null, blocked = false;
    return Promise.all([A.get(APP, KEY), A.get(APP, CKEY)]).then(function (r) {
      if (who !== uid) return;
      var cl = (r[0] && r[0].items && typeof r[0].items === "object") ? r[0].items : {};
      var cc = (r[1] && r[1].cats && typeof r[1].cats === "object") ? r[1].cats : {};
      var mi = merge(items, cl), mc = merge(catsMap, cc);
      if (!same(mi, items) || !same(mc, catsMap)) { items = mi; catsMap = mc; saveLocal(); render(); }
      var jobs = [], wI = !same(mi, cl), wC = !same(mc, cc);
      if (wI && tooManyGone(mi, cl, false)) { wI = false; blocked = true; try { console.warn("Purchasify: a write that removes most items was blocked; the cloud copy is untouched"); } catch (e) {} }
      if (wC && tooManyGone(mc, cc, true)) { wC = false; blocked = true; try { console.warn("Purchasify: a write that removes most categories was blocked; the cloud copy is untouched"); } catch (e) {} }
      if (wI || wC) backup(cl, cc);
      if (wI) { sentI = mi; jobs.push(A.set(APP, KEY, { v: 1, items: mi })); }
      if (wC) { sentC = mc; jobs.push(A.set(APP, CKEY, { v: 1, cats: mc })); }
      return Promise.all(jobs);
    }).then(function () {
      if (who !== uid) return;
      offline = false;
      if (blocked) return; // keep "pending": nothing was lost locally, and the cloud copy stays as it was
      if ((!sentI || same(sentI, items)) && (!sentC || same(sentC, catsMap))) { pending = false; saveLocal(); } // nothing new changed meanwhile
      else again = true;
    }, function (e) {
      if (e && e.code === "signed_out") return;
      offline = true; // keep everything locally, retry on the next poll / when back online
    }).then(function () {
      busy = false; setStatus();
      if (again) { again = false; sync(); }
    });
  }
  function syncSoon() { clearTimeout(soonT); soonT = setTimeout(sync, 250); }
  function changed() { pending = true; saveLocal(); render(); syncSoon(); }

  setInterval(function () { if (uid && document.visibilityState === "visible") sync(); }, POLL_MS);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sync(); });
  window.addEventListener("focus", function () { sync(); });
  window.addEventListener("online", function () { sync(); });
  window.addEventListener("offline", function () { offline = true; setStatus(); });

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
  /* order inside a category: "ord" (set when an item is dragged with ☰); items never dragged keep their creation time,
     which is always larger, so a new item lands at the end of the list */
  function ordOf(x) { return typeof x.ord === "number" && isFinite(x.ord) ? x.ord : (x.created || 0); }
  function setItemOrder(ids) { ids.forEach(function (id, n) { var x = items[id]; if (x && !x.deleted && x.ord !== (n + 1) * 1000) upd(id, { ord: (n + 1) * 1000 }); }); }
  function priceOf(x) { return typeof x.price === "number" && isFinite(x.price) ? x.price : 0; }
  function add(text, cid, price) {
    text = clean(text, 200); if (!text) return;
    var id = newId(), at = now(); items[id] = { id: id, text: text, done: false, created: at, at: at };
    if (typeof price === "number" && isFinite(price)) items[id].price = price;
    cid = cid || curTab(); if (cid && cid !== "main") items[id].list = cid;
  }
  function upd(id, patch) { var x = items[id]; if (!x || x.deleted) return; var y = {}, k; for (k in x) y[k] = x[k]; for (k in patch) { if (patch[k] == null) delete y[k]; else y[k] = patch[k]; } y.at = now(); items[id] = y; }
  function del(id) { var x = items[id]; if (!x) return; items[id] = { id: id, deleted: true, at: now() }; }
  function moveItem(id, cid) { var x = items[id]; if (!x || x.deleted || listOf(x) === cid) return false; upd(id, { list: cid === "main" ? null : cid }); return true; }

  /* ---------- render ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function row(x) {
    var hasP = typeof x.price === "number" && isFinite(x.price), id = esc(x.id);
    var txt = editing === x.id
      ? '<input class="edit" data-edit="' + id + '" maxlength="200" enterkeyhint="done" value="' + esc(x.text) + '" aria-label="' + esc(t("edit")) + '">'
      : '<span class="txt" role="button" tabindex="0" data-a="edit" title="' + esc(t("edit")) + '">' + esc(x.text) + "</span>";
    // the price column: always an input, typed right in the list (saved on Enter / leaving the field)
    var pin = '<input class="pin" data-price="' + id + '" type="text" inputmode="decimal" maxlength="10" enterkeyhint="done" autocomplete="off" placeholder="₪" value="' + (hasP ? esc(String(x.price)) : "") + '" aria-label="' + esc(t("priceLabel") + ": " + x.text) + '">';
    return '<li data-id="' + id + '"' + (x.done ? ' class="done"' : "") + '>' + (x.done || editing === x.id ? "" : '<span class="hdl" aria-label="' + esc(t("handleItem")) + '" title="' + esc(t("handleItem")) + '">☰</span>') +
      '<button type="button" class="chk" data-a="toggle" aria-pressed="' + (x.done ? "true" : "false") + '" aria-label="' + esc((x.done ? t("uncheck") : t("check")) + ": " + x.text) + '"><i aria-hidden="true">✓</i></button>' +
      txt + pin + "</li>";
  }
  function sumNow() { // the total line; a price being typed counts live, before it is saved
    var cur = curTab(), tot = 0, sel = 0, any = false, ae = document.activeElement, live = null;
    if (ae && ae.getAttribute && ae.getAttribute("data-price")) { var v = parsePrice(ae.value); if (!(typeof v === "number" && isNaN(v))) live = { id: ae.getAttribute("data-price"), v: v || 0 }; }
    if (uid) for (var k in items) { var x = items[k]; if (x.deleted || listOf(x) !== cur) continue; any = true;
      var p = live && live.id === x.id ? live.v : priceOf(x); tot += p; if (x.done) sel += p; }
    var sum = $("sum"); if (!sum) return; sum.hidden = !any;
    sum.innerHTML = '<span>' + esc(t("sumTotal")) + ': <b>' + esc(fmtPrice(tot)) + ' ₪</b></span><span class="sel">· ' + esc(t("sumSel")) + ': <b>' + esc(fmtPrice(sel)) + " ₪</b></span>";
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
    if (uid) for (var k in items) { var x = items[k]; if (x.deleted) continue; if (listOf(x) === cur) (x.done ? done : act).push(x); }
    renderCats();
    var hint = $("cathint"); hint.textContent = t("catHint"); hint.hidden = !uid || !!lsGet("rg-my-shopping-hint");
    var ph = c.ph || "ph", ai = $("add-input");
    ai.setAttribute("data-i18n-ph", ph); ai.setAttribute("data-i18n-label", ph); ai.placeholder = t(ph); ai.setAttribute("aria-label", t(ph));
    $("empty-p").textContent = c.empty ? t(c.empty) : t("emptyCat");
    $("suggest").hidden = cur !== "main";
    act.sort(function (a, b) { return (ordOf(a) - ordOf(b)) || ((a.created || 0) - (b.created || 0)); }); // Ron's priority order (☰ drag), new items at the end
    done.sort(function (a, b) { return (a.at || 0) - (b.at || 0); }); // last checked goes to the very bottom
    var keep = null, ae = document.activeElement;
    var pk = null; if (ae && ae.getAttribute && ae.getAttribute("data-price")) pk = { id: ae.getAttribute("data-price"), v: ae.value, s: ae.selectionStart, e: ae.selectionEnd, bad: ae.classList.contains("bad") }; // a price being typed survives a re-render (sync)
    if (editing && ae && ae.getAttribute && ae.getAttribute("data-edit") === editing) keep = { v: ae.value, s: ae.selectionStart, e: ae.selectionEnd };
    if (editing && (!items[editing] || items[editing].deleted)) editing = null;
    rendering = true; // replacing the rows blurs an open edit box; that blur must not count as "done editing"
    $("active").innerHTML = act.map(row).join("");
    $("active-card").hidden = !act.length;
    $("done").innerHTML = done.map(row).join("");
    $("done-wrap").hidden = !done.length;
    $("done-h").textContent = t("bought");
    sumNow();
    $("empty").hidden = !!(act.length || done.length);
    if (editing) {
      var inp = document.querySelector('[data-edit="' + editing + '"]');
      if (inp && !pk) { if (keep) { inp.value = keep.v; } inp.focus(); try { if (keep) inp.setSelectionRange(keep.s, keep.e); } catch (e) {} }
    }
    if (pk) { var pi = document.querySelector('[data-price="' + pk.id + '"]'); if (pi) { pi.value = pk.v; if (pk.bad) pi.classList.add("bad"); pi.focus(); try { pi.setSelectionRange(pk.s, pk.e); } catch (e) {} } }
    rendering = false;
    setStatus();
  }
  function commitEdit(inp, cancel) {
    var id = inp.getAttribute("data-edit"); if (editing !== id) return;
    editing = null;
    var v = clean(inp.value, 200), x = items[id];
    if (!cancel && x && !x.deleted) {
      if (!v) { del(id); changed(); return; }
      if (v !== x.text) { upd(id, { text: v }); changed(); return; }
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
  function hideHint() { lsSet("rg-my-shopping-hint", "1"); var h = $("cathint"); if (h) h.hidden = true; }
  function renameCat(cid) {
    var c = catOf(cid); if (!c) return;
    nameSheet(t("renameTitle"), catName(c), false, function (v) { if (v !== catName(c)) { upCat(cid, { name: v }); changed(); } });
  }
  function deleteCat(cid) {
    var c = catOf(cid); if (!c) return;
    if (cats().length <= 1) { window.alert(t("lastCat")); return; }
    if (window.confirm(t("confirmDelCat").replace("{x}", catName(c)))) { bulkOk = Date.now() + 60000; delCat(cid); if (tab === cid) tab = ""; lsSet("rg-my-shopping-tab", curTab()); changed(); }
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
    if (others.length) html += others.map(function (c) { return '<button type="button" class="mi" data-s="to:' + esc(c.cat) + '">' + esc(catName(c)) + "</button>"; }).join("");
    else html += '<p class="mnote">' + esc(t("noOther")) + '</p><button type="button" class="mi big" data-s="new">' + esc("＋ " + t("catAdd")) + "</button>";
    html += '<button type="button" class="mi" data-s="x">' + esc(t("cancel")) + '</button><button type="button" class="mi dng" data-s="del">' + esc(t("delItem")) + "</button>";
    sheet(html, function (a) {
      if (a === "x") { closeSheet(); return; }
      if (a === "del") { closeSheet(); delWithUndo(id); return; }
      if (a === "new") { nameSheet(t("catAdd"), "", true, function (v) { var nid = addCat(v); if (nid) moveTo(id, nid); }); return; }
      if (a.indexOf("to:") === 0) { closeSheet(); moveTo(id, a.slice(3)); }
    });
  }
  function selectTab(cid) { tab = cid; editing = null; lsSet("rg-my-shopping-tab", tab); render(); }

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
    list.addEventListener("touchmove", function (e) { if (drag && drag.list === list && drag.lifted) e.preventDefault(); }, { passive: false });
    window.addEventListener("blur", function () { if (drag && drag.list === list) finish(false); });
  }

  /* ---------- category picker: a large button with the open category; tap = list of all categories.
     In the list: tap = open that category, ＋ = new category, ☰ = edit mode. Edit mode: every row has a ☰ handle
     (drag it, or press and hold the row ~300 ms) to move the category to ANY place in one drag; the other rows
     shift live to show the drop spot and the list auto-scrolls at its edges. ✏️ rename, 🗑 delete. ✓ ends edit mode.
     Every drop is saved at once (local copy + sync), so nothing is lost if the list is closed without ✓. ---------- */
  var catOpen = false, catEdit = false;
  function renderCats() {
    var cur = curTab(), c = catOf(cur);
    $("cat-name").textContent = c ? catName(c) : "";
    var btn = $("cat-btn"); btn.setAttribute("aria-expanded", catOpen ? "true" : "false"); btn.setAttribute("aria-label", t("chooseCat") + ": " + (c ? catName(c) : ""));
    $("catpick").hidden = !uid;
    var panel = $("cat-panel"); panel.hidden = !catOpen || !uid;
    var bk = $("cat-back"); if (catOpen && uid && !bk) { bk = document.createElement("div"); bk.id = "cat-back"; bk.className = "cp-back"; document.body.appendChild(bk); bk.addEventListener("pointerdown", function (e) { e.preventDefault(); closeCats(); }); }
    else if ((!catOpen || !uid) && bk) bk.parentNode.removeChild(bk);
    if (!catOpen || !uid) return;
    $("cp-title").textContent = t(catEdit ? "editTitle" : "pickTitle");
    var eb = $("cat-edit"); eb.classList.toggle("on", catEdit); eb.textContent = catEdit ? t("editDone") : "☰";
    eb.setAttribute("aria-label", catEdit ? t("editDone") : t("editOrder")); eb.title = eb.getAttribute("aria-label");
    $("cat-new").textContent = t("newCat");
    var list = $("cat-list"), st = list.scrollTop;
    list.classList.toggle("editing", catEdit);
    list.innerHTML = cats().map(function (cc) {
      var nm = esc(catName(cc)), id = esc(cc.cat), on = cc.cat === cur;
      if (!catEdit) return '<li data-cat="' + id + '"' + (on ? ' class="cur"' : "") + '><button type="button" class="cp-pick" data-pick="' + id + '" aria-current="' + on + '"><span class="nm">' + nm + "</span>" + (on ? '<span class="ck" aria-hidden="true">✓</span>' : "") + "</button></li>";
      return '<li data-cat="' + id + '"' + (on ? ' class="cur"' : "") + '><span class="cp-handle hdl" aria-label="' + esc(t("handle")) + '" title="' + esc(t("handle")) + '">☰</span><span class="nm">' + nm + "</span>" +
        '<button type="button" class="cp-act" data-ren="' + id + '" aria-label="' + esc(t("renameOne") + ": " + catName(cc)) + '" title="' + esc(t("renameOne")) + '">✏️</button>' +
        '<button type="button" class="cp-act" data-del="' + id + '" aria-label="' + esc(t("delOne") + ": " + catName(cc)) + '" title="' + esc(t("delOne")) + '">🗑</button></li>';
    }).join("");
    list.scrollTop = st;
  }
  function openCats() { catOpen = true; catEdit = false; hideHint(); render(); var l = $("cat-list"), b = l && l.querySelector("li.cur"); if (b) try { b.scrollIntoView({ block: "nearest" }); } catch (e) {} }
  function closeCats() { if (drag) return; var was = catEdit; catOpen = false; catEdit = false; render(); if (was) syncSoon(); }
  function bootCats() {
    var list = $("cat-list");
    on("cat-btn", "click", function () { if (catOpen) closeCats(); else openCats(); });
    on("cat-edit", "click", function () { if (drag) return; catEdit = !catEdit; render(); if (!catEdit) syncSoon(); });
    on("cat-new", "click", function () {
      nameSheet(t("catAdd"), "", true, function (v) { var id = addCat(v); if (!id) return; if (!catEdit) { tab = id; lsSet("rg-my-shopping-tab", id); catOpen = false; } changed();
        if (catEdit) { var b = $("cat-list").querySelector('[data-cat="' + id + '"]'); if (b) try { b.scrollIntoView({ block: "nearest" }); } catch (e) {} } });
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && catOpen && !$("sheet")) closeCats(); });
    list.addEventListener("click", function (e) {
      if (noClick) { noClick = false; e.preventDefault(); return; }
      var b = e.target.closest("[data-pick],[data-ren],[data-del]"); if (!b) return;
      if (b.hasAttribute("data-pick")) { catOpen = false; selectTab(b.getAttribute("data-pick")); }
      else if (b.hasAttribute("data-ren")) renameCat(b.getAttribute("data-ren"));
      else deleteCat(b.getAttribute("data-del"));
    });
    list.addEventListener("contextmenu", function (e) { if (catEdit) e.preventDefault(); });

    sortable({ list: list, scroller: list, hold: 300, edge: 44, rowSel: "li",
      canStart: function (e) { return catEdit && !e.target.closest("button"); },
      onDrop: function (ids) { setOrder(ids); changed(); } });
  }

  /* ---------- items: swipe right = selected / back to the list, swipe left = move (or delete) menu ---------- */
  function bootItemDrag() {
    var main = document.querySelector("main"), SLOP = 10, SWIPE = 0.35;
    function reset() { if (idrag && idrag.li) { idrag.li.classList.remove("swiping", "sw-r", "sw-l", "sw-go"); idrag.li.style.removeProperty("--sx"); } idrag = null; if (needRender && !drag) { needRender = false; render(); } }
    main.addEventListener("pointerdown", function (e) {
      var li = e.target.closest(".list li"); if (!li || e.target.closest("button,input,.hdl") || editing || drag) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      reset();
      idrag = { li: li, id: li.getAttribute("data-id"), x: e.clientX, y: e.clientY, pid: e.pointerId, type: e.pointerType };
    });
    main.addEventListener("pointermove", function (e) {
      if (!idrag || e.pointerId !== idrag.pid) return;
      var dx = e.clientX - idrag.x, dy = e.clientY - idrag.y;
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
        e.preventDefault();
      } else reset(); // vertical: a normal scroll
    });
    function up(e) {
      if (!idrag || e.pointerId !== idrag.pid) return;
      var d = idrag;
      if (!d.swipe) { reset(); return; }
      noClick = true; setTimeout(function () { noClick = false; }, 400);
      var w = d.li.offsetWidth || 1, dx = e.type === "pointerup" ? e.clientX - d.x : 0, id = d.id;
      reset();
      if (Math.abs(dx) >= w * SWIPE) {
        var x = items[id];
        if (dx > 0 && x && !x.deleted) { upd(id, { done: !x.done }); changed(); if (navigator.vibrate) try { navigator.vibrate(10); } catch (e3) {} }
        else if (dx < 0) moveMenu(id);
      }
    }
    main.addEventListener("pointerup", up);
    main.addEventListener("pointercancel", up);
    main.addEventListener("touchmove", function (e) { if (idrag && idrag.swipe) e.preventDefault(); }, { passive: false });
    main.addEventListener("contextmenu", function (e) { if (e.target.closest(".list li")) e.preventDefault(); });
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
    on("add-form", "submit", function (e) {
      e.preventDefault(); var i = $("add-input"), pi = $("add-price"), pr = parsePrice(pi.value);
      if (pr !== null && isNaN(pr)) { pi.focus(); pi.select(); return; }
      if (!i.value.trim()) { i.focus(); return; }
      add(i.value, null, pr); i.value = ""; pi.value = ""; changed(); i.focus();
    });
    on("suggest", "click", function () { SUGGESTED.forEach(function (s) { add(s); }); changed(); });
    var main = document.querySelector("main");
    main.addEventListener("click", function (e) {
      if (noClick && e.target.closest(".list")) { noClick = false; e.preventDefault(); return; }
      var b = e.target.closest("[data-a]"); if (!b) return;
      var li = b.closest("li"), id = li && li.getAttribute("data-id"), x = id && items[id]; if (!x) return;
      var a = b.getAttribute("data-a");
      if (a === "toggle") { upd(id, { done: !x.done }); changed(); }
      else if (a === "edit") { editing = id; render(); var inp = document.querySelector('[data-edit="' + id + '"]'); if (inp) { var n = inp.value.length; try { inp.setSelectionRange(n, n); } catch (e2) {} } }
    });
    main.addEventListener("keydown", function (e) {
      if (e.target.classList.contains("txt") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.target.click(); }
      if (e.target.getAttribute("data-price")) {
        if (e.key === "Enter") { e.preventDefault(); if (commitPrice(e.target)) e.target.blur(); }
        else if (e.key === "Escape") { e.preventDefault(); var xx = items[e.target.getAttribute("data-price")]; e.target.value = xx && typeof xx.price === "number" ? String(xx.price) : ""; e.target.classList.remove("bad"); e.target.blur(); sumNow(); }
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
      if (e.target.getAttribute("data-edit")) commitEdit(e.target);
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
      uid = id; editing = null; offline = false; loadLocal(); render();
      if (uid) sync();
    }
    onUser(A.user());
    A.onChange(onUser);
    A.ready.then(function () { onUser(A.user()); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
