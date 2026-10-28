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
  var drag = null, idrag = null, needRender = false, noClick = false;

  function $(id) { return document.getElementById(id); }
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
    var who = uid, sentI = null, sentC = null;
    return Promise.all([A.get(APP, KEY), A.get(APP, CKEY)]).then(function (r) {
      if (who !== uid) return;
      var cl = (r[0] && r[0].items && typeof r[0].items === "object") ? r[0].items : {};
      var cc = (r[1] && r[1].cats && typeof r[1].cats === "object") ? r[1].cats : {};
      var mi = merge(items, cl), mc = merge(catsMap, cc);
      if (!same(mi, items) || !same(mc, catsMap)) { items = mi; catsMap = mc; saveLocal(); render(); }
      var jobs = [];
      if (!same(mi, cl)) { sentI = mi; jobs.push(A.set(APP, KEY, { v: 1, items: mi })); }
      if (!same(mc, cc)) { sentC = mc; jobs.push(A.set(APP, CKEY, { v: 1, cats: mc })); }
      return Promise.all(jobs);
    }).then(function () {
      if (who !== uid) return;
      offline = false;
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
  function add(text, cid) {
    text = clean(text, 200); if (!text) return;
    var id = newId(), at = now(); items[id] = { id: id, text: text, done: false, created: at, at: at };
    cid = cid || curTab(); if (cid && cid !== "main") items[id].list = cid;
  }
  function upd(id, patch) { var x = items[id]; if (!x || x.deleted) return; var y = {}, k; for (k in x) y[k] = x[k]; for (k in patch) { if (patch[k] == null) delete y[k]; else y[k] = patch[k]; } y.at = now(); items[id] = y; }
  function del(id) { var x = items[id]; if (!x) return; items[id] = { id: id, deleted: true, at: now() }; }
  function moveItem(id, cid) { var x = items[id]; if (!x || x.deleted || listOf(x) === cid) return false; upd(id, { list: cid === "main" ? null : cid }); return true; }

  /* ---------- render ---------- */
  var MVICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/><path d="M15 12H4"/><path d="M8 8l-4 4 4 4"/></svg>';
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function row(x) {
    var txt = editing === x.id
      ? '<input class="edit" data-edit="' + esc(x.id) + '" maxlength="200" enterkeyhint="done" value="' + esc(x.text) + '" aria-label="' + esc(t("edit")) + '">'
      : '<span class="txt" role="button" tabindex="0" data-a="edit" title="' + esc(t("edit")) + '">' + esc(x.text) + "</span>";
    return '<li data-id="' + esc(x.id) + '"' + (x.done ? ' class="done"' : "") + '><button type="button" class="chk" data-a="toggle" aria-pressed="' + (x.done ? "true" : "false") + '" aria-label="' + esc((x.done ? t("uncheck") : t("check")) + ": " + x.text) + '"><i aria-hidden="true">✓</i></button>' +
      txt + '<button type="button" class="mv" data-a="move" title="' + esc(t("moveTo")) + '" aria-label="' + esc(t("moveTo") + ": " + x.text) + '">' + MVICON + '</button>' +
      '<button type="button" class="del" data-a="del" aria-label="' + esc(t("del") + ": " + x.text) + '">×</button></li>';
  }
  function render() {
    if (!$("active")) return;
    if (drag || idrag) { needRender = true; return; } // never rebuild under a finger that is dragging
    var bar = $("tabs"), cur = curTab(), c = catOf(cur) || {};
    var act = [], done = [];
    if (uid) for (var k in items) { var x = items[k]; if (x.deleted) continue; if (listOf(x) === cur) (x.done ? done : act).push(x); }
    var sl = bar.scrollLeft;
    bar.innerHTML = uid ? cats().map(function (cc) {
      return '<button type="button" class="tab" role="tab" data-tab="' + esc(cc.cat) + '" aria-selected="' + (cur === cc.cat) + '" title="' + esc(t("tabTip")) + '">' + esc(catName(cc)) + "</button>";
    }).join("") : "";
    bar.scrollLeft = sl;
    var ca = $("cat-add"); ca.setAttribute("aria-label", t("catAdd")); ca.title = t("catAdd");
    var hint = $("cathint"); hint.textContent = t("catHint"); hint.hidden = !uid || !!lsGet("rg-my-shopping-hint");
    var ph = c.ph || "ph", ai = $("add-input");
    ai.setAttribute("data-i18n-ph", ph); ai.setAttribute("data-i18n-label", ph); ai.placeholder = t(ph); ai.setAttribute("aria-label", t(ph));
    $("empty-p").textContent = c.empty ? t(c.empty) : t("emptyCat");
    $("suggest").hidden = cur !== "main";
    act.sort(function (a, b) { return (a.created || 0) - (b.created || 0); });
    done.sort(function (a, b) { return (a.at || 0) - (b.at || 0); }); // last checked goes to the very bottom
    var keep = null, ae = document.activeElement;
    if (editing && ae && ae.getAttribute && ae.getAttribute("data-edit") === editing) keep = { v: ae.value, s: ae.selectionStart, e: ae.selectionEnd };
    if (editing && (!items[editing] || items[editing].deleted)) editing = null;
    rendering = true; // replacing the rows blurs an open edit box; that blur must not count as "done editing"
    $("active").innerHTML = act.map(row).join("");
    $("active-card").hidden = !act.length;
    $("done").innerHTML = done.map(row).join("");
    $("done-wrap").hidden = !done.length;
    $("done-h").textContent = t("bought") + " (" + done.length + ")";
    $("empty").hidden = !!(act.length || done.length);
    if (editing) {
      var inp = document.querySelector('[data-edit="' + editing + '"]');
      if (inp) { if (keep) { inp.value = keep.v; } inp.focus(); try { if (keep) inp.setSelectionRange(keep.s, keep.e); } catch (e) {} }
    }
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
  function catMenu(cid) {
    var c = catOf(cid); if (!c) return;
    hideHint();
    sheet('<h3>' + esc(catName(c)) + '</h3><button type="button" class="mi big" data-s="ren">' + esc(t("rename")) + "</button>" +
      '<p class="mnote">' + esc(t("dragNote")) + "</p>" +
      '<button type="button" class="mi dng" data-s="del">' + esc(t("delCat")) + '</button><button type="button" class="mi" data-s="x">' + esc(t("cancel")) + "</button>",
      function (a) {
        if (a === "x") closeSheet();
        else if (a === "ren") nameSheet(t("renameTitle"), catName(c), false, function (v) { if (v !== catName(c)) { upCat(cid, { name: v }); changed(); } });
        else if (a === "del") {
          if (cats().length <= 1) { window.alert(t("lastCat")); return; }
          if (window.confirm(t("confirmDelCat").replace("{x}", catName(c)))) { closeSheet(); delCat(cid); if (tab === cid) tab = ""; lsSet("rg-my-shopping-tab", curTab()); changed(); }
        }
      });
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
  function selectTab(cid) {
    tab = cid; editing = null; lsSet("rg-my-shopping-tab", tab); render();
    var b = document.querySelector('#tabs [data-tab="' + tab + '"]'); if (b && b.scrollIntoView) try { b.scrollIntoView({ block: "nearest", inline: "nearest" }); } catch (e) {}
  }

  /* ---------- category bar: tap = open, tap again (double-tap) / long-press = menu,
     long-press + drag (mouse: just drag) = move to ANY place in one drag; the bar auto-scrolls near its edges ---------- */
  function bootCats() {
    var bar = $("tabs"), LONG = 450, SLOP = 10, timer = 0, auto = 0;
    function reset() { clearTimeout(timer); clearInterval(auto); auto = 0; if (drag && drag.el) drag.el.classList.remove("lifted"); bar.classList.remove("dragging"); drag = null; if (needRender && !idrag) { needRender = false; render(); } }
    function lift() { drag.lifted = true; drag.el.classList.add("lifted"); bar.classList.add("dragging"); try { drag.el.setPointerCapture(drag.pid); } catch (e) {} if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {} }
    function moveTo(x) {
      var l = [].slice.call(bar.querySelectorAll(".tab")), others = l.filter(function (b) { return b !== drag.el; });
      // insert before the first tab (in visual reading order) whose middle the finger has not passed yet
      var rtl = getComputedStyle(bar).direction === "rtl", target = null;
      for (var i = 0; i < others.length; i++) { var r = others[i].getBoundingClientRect(), mid = r.left + r.width / 2; if (rtl ? x > mid : x < mid) { target = others[i]; break; } }
      if (target === drag.el.nextSibling && target) return;
      if (!target && drag.el === l[l.length - 1]) return;
      bar.insertBefore(drag.el, target); drag.moved = true;
    }
    function startAuto() {
      if (auto) return;
      auto = setInterval(function () { if (!drag || !drag.lifted) return; var r = bar.getBoundingClientRect(), z = 44, sp = 0;
        if (drag.cx < r.left + z) sp = -Math.ceil((r.left + z - drag.cx) / 3); else if (drag.cx > r.right - z) sp = Math.ceil((drag.cx - (r.right - z)) / 3);
        if (sp) { bar.scrollLeft += sp; moveTo(drag.cx); } }, 30);
    }
    bar.addEventListener("pointerdown", function (e) {
      noClick = false;
      var el = e.target.closest(".tab"); if (!el || (e.pointerType === "mouse" && e.button !== 0)) return;
      reset();
      drag = { el: el, cat: el.getAttribute("data-tab"), x: e.clientX, y: e.clientY, cx: e.clientX, pid: e.pointerId, type: e.pointerType, lifted: false, moved: false };
      if (e.pointerType !== "mouse") timer = setTimeout(function () { if (drag && !drag.lifted) lift(); }, LONG);
    });
    bar.addEventListener("pointermove", function (e) {
      if (!drag || e.pointerId !== drag.pid) return;
      drag.cx = e.clientX;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y, far = Math.abs(dx) > SLOP || Math.abs(dy) > SLOP;
      if (!drag.lifted) {
        if (!far) return;
        if (drag.type === "mouse") lift(); else { reset(); return; } // touch moved before the long-press: a normal scroll
      }
      e.preventDefault(); moveTo(e.clientX); startAuto();
    });
    function up(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      var d = drag;
      if (d.lifted) {
        noClick = true; setTimeout(function () { noClick = false; }, 400);
        if (d.moved) { var ids = [].map.call(bar.querySelectorAll(".tab"), function (b) { return b.getAttribute("data-tab"); }); hideHint(); reset(); setOrder(ids); changed(); }
        else { reset(); if (d.type !== "mouse") catMenu(d.cat); else noClick = false; }
      } else reset();
    }
    bar.addEventListener("pointerup", up);
    bar.addEventListener("pointercancel", up);
    bar.addEventListener("touchmove", function (e) { if (drag && drag.lifted) e.preventDefault(); }, { passive: false }); // the bar must not scroll while a category is lifted
    bar.addEventListener("contextmenu", function (e) {
      var el = e.target.closest(".tab"); if (!el) return; e.preventDefault();
      if (!drag || drag.type === "mouse") { reset(); catMenu(el.getAttribute("data-tab")); }
    });
    bar.addEventListener("click", function (e) {
      if (noClick) { noClick = false; e.preventDefault(); return; }
      var b = e.target.closest("[data-tab]"); if (!b) return;
      var cid = b.getAttribute("data-tab");
      if (cid === curTab()) catMenu(cid); else selectTab(cid); // a second tap on the open category opens its menu
    });
    $("cat-add").addEventListener("click", function () {
      nameSheet(t("catAdd"), "", true, function (v) { var id = addCat(v); if (id) { tab = id; lsSet("rg-my-shopping-tab", id); changed(); var b = bar.querySelector('[data-tab="' + id + '"]'); if (b) try { b.scrollIntoView({ inline: "nearest", block: "nearest" }); } catch (e) {} } });
    });
  }

  /* ---------- items: long-press (mouse: drag) an item and drop it on a category to move it there ---------- */
  function bootItemDrag() {
    var main = document.querySelector("main"), bar = $("tabs"), LONG = 500, SLOP = 10, SWIPE = 0.35, timer = 0, auto = 0;
    function overTab(x, y) { var el = document.elementFromPoint(x, y); return el && el.closest ? el.closest("#tabs .tab") : null; }
    function mark(tb) { bar.querySelectorAll(".tab.drop").forEach(function (b) { if (b !== tb) b.classList.remove("drop"); }); if (tb) tb.classList.add("drop"); }
    function reset() {
      clearTimeout(timer); clearInterval(auto); auto = 0;
      if (idrag) { unswipe(); if (idrag.ghost && idrag.ghost.parentNode) idrag.ghost.parentNode.removeChild(idrag.ghost); if (idrag.li) idrag.li.classList.remove("ilifted"); }
      mark(null); document.body.classList.remove("idragging"); idrag = null;
      if (needRender && !drag) { needRender = false; render(); }
    }
    function lift() {
      var x = items[idrag.id]; if (!x) { reset(); return; }
      idrag.lifted = true; idrag.li.classList.add("ilifted"); document.body.classList.add("idragging");
      var g = document.createElement("div"); g.className = "ighost"; g.textContent = x.text; document.body.appendChild(g); idrag.ghost = g; place();
      try { idrag.li.setPointerCapture(idrag.pid); } catch (e) {}
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
      var tip = $("drophint"); if (tip) { tip.textContent = t("dropHint"); tip.hidden = false; }
    }
    function unswipe() { if (idrag && idrag.li) { idrag.li.classList.remove("swiping", "sw-r", "sw-l", "sw-go"); idrag.li.style.removeProperty("--sx"); } }
    function place() { if (idrag && idrag.ghost) { idrag.ghost.style.left = idrag.cx + "px"; idrag.ghost.style.top = idrag.cy + "px"; } }
    main.addEventListener("pointerdown", function (e) {
      var li = e.target.closest(".list li"); if (!li || e.target.closest("button,input") || editing) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      reset();
      idrag = { li: li, id: li.getAttribute("data-id"), x: e.clientX, y: e.clientY, cx: e.clientX, cy: e.clientY, pid: e.pointerId, type: e.pointerType, lifted: false };
      if (e.pointerType !== "mouse") timer = setTimeout(function () { if (idrag && !idrag.lifted) lift(); }, LONG);
    });
    main.addEventListener("pointermove", function (e) {
      if (!idrag || e.pointerId !== idrag.pid) return;
      idrag.cx = e.clientX; idrag.cy = e.clientY;
      var dx = e.clientX - idrag.x, dy = e.clientY - idrag.y;
      if (idrag.swipe) { // a horizontal swipe on a row: right = selected / back to the list, left = move menu
        e.preventDefault();
        var w = idrag.li.offsetWidth || 1, go = Math.abs(dx) >= w * SWIPE;
        idrag.dx = dx; idrag.li.style.setProperty("--sx", dx + "px");
        idrag.li.classList.toggle("sw-r", dx > 0); idrag.li.classList.toggle("sw-l", dx < 0); idrag.li.classList.toggle("sw-go", go);
        return;
      }
      if (!idrag.lifted) {
        if (Math.abs(dx) <= SLOP && Math.abs(dy) <= SLOP) return;
        if (idrag.type === "mouse") lift();
        else if (Math.abs(dx) > Math.abs(dy) * 1.5) { // clearly sideways before the long-press: a swipe
          clearTimeout(timer); idrag.swipe = true; idrag.dx = dx; idrag.li.classList.add("swiping");
          try { idrag.li.setPointerCapture(idrag.pid); } catch (e2) {}
          e.preventDefault(); return;
        } else { reset(); return; } // vertical: a normal scroll
      }
      e.preventDefault(); place(); mark(overTab(e.clientX, e.clientY));
      if (!auto) auto = setInterval(function () { if (!idrag) return; var z = 60, h = window.innerHeight, sp = 0;
        if (idrag.cy < z) sp = -Math.ceil((z - idrag.cy) / 3); else if (idrag.cy > h - z) sp = Math.ceil((idrag.cy - (h - z)) / 3);
        var r = bar.getBoundingClientRect();
        if (idrag.cy >= r.top && idrag.cy <= r.bottom) { if (idrag.cx < r.left + 36) bar.scrollLeft -= 8; else if (idrag.cx > r.right - 36) bar.scrollLeft += 8; }
        if (sp) window.scrollBy(0, sp); mark(overTab(idrag.cx, idrag.cy)); }, 30);
    });
    function up(e) {
      if (!idrag || e.pointerId !== idrag.pid) return;
      var d = idrag, tip = $("drophint"); if (tip) tip.hidden = true;
      if (d.swipe) {
        noClick = true; setTimeout(function () { noClick = false; }, 400);
        var w = d.li.offsetWidth || 1, dx = e.type === "pointerup" ? e.clientX - d.x : 0, id = d.id;
        reset();
        if (Math.abs(dx) >= w * SWIPE) {
          var x = items[id];
          if (dx > 0 && x && !x.deleted) { upd(id, { done: !x.done }); changed(); if (navigator.vibrate) try { navigator.vibrate(10); } catch (e3) {} }
          else if (dx < 0) moveMenu(id);
        }
        return;
      }
      if (d.lifted) {
        noClick = true; setTimeout(function () { noClick = false; }, 400);
        var tb = e.type === "pointerup" ? overTab(e.clientX, e.clientY) : null, cid = tb && tb.getAttribute("data-tab");
        reset();
        if (cid && moveItem(d.id, cid)) changed();
      } else reset();
    }
    main.addEventListener("pointerup", up);
    main.addEventListener("pointercancel", up);
    main.addEventListener("touchmove", function (e) { if (idrag && (idrag.lifted || idrag.swipe)) e.preventDefault(); }, { passive: false });
    main.addEventListener("contextmenu", function (e) { if (e.target.closest(".list li")) e.preventDefault(); });
  }

  function boot() {
    bootCats();
    bootItemDrag();
    $("add-form").addEventListener("submit", function (e) {
      e.preventDefault(); var i = $("add-input"); if (!i.value.trim()) return;
      add(i.value); i.value = ""; changed(); i.focus();
    });
    $("suggest").addEventListener("click", function () { SUGGESTED.forEach(function (s) { add(s); }); changed(); });
    $("clear").addEventListener("click", function () { var cur = curTab(); for (var k in items) if (items[k].done && !items[k].deleted && listOf(items[k]) === cur) del(k); changed(); });
    var main = document.querySelector("main");
    main.addEventListener("click", function (e) {
      if (noClick && e.target.closest(".list")) { noClick = false; e.preventDefault(); return; }
      var b = e.target.closest("[data-a]"); if (!b) return;
      var li = b.closest("li"), id = li && li.getAttribute("data-id"), x = id && items[id]; if (!x) return;
      var a = b.getAttribute("data-a");
      if (a === "toggle") { upd(id, { done: !x.done }); changed(); }
      else if (a === "del") { del(id); changed(); }
      else if (a === "move") moveMenu(id);
      else if (a === "edit") { editing = id; render(); var inp = document.querySelector('[data-edit="' + id + '"]'); if (inp) { var n = inp.value.length; try { inp.setSelectionRange(n, n); } catch (e2) {} } }
    });
    main.addEventListener("keydown", function (e) {
      if (e.target.classList.contains("txt") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.target.click(); }
      if (e.target.getAttribute("data-edit")) {
        if (e.key === "Enter") { e.preventDefault(); commitEdit(e.target); }
        else if (e.key === "Escape") { e.preventDefault(); commitEdit(e.target, true); }
      }
    });
    main.addEventListener("focusout", function (e) { if (!rendering && e.target.getAttribute && e.target.getAttribute("data-edit")) commitEdit(e.target); });
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
