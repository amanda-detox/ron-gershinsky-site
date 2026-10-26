/* Ideas & Tasks (my/ideas/) — private, per-user, synced through RGAccount (Appwrite row app="myideas", key="items",
   readable/writable by the signed-in user only). Nothing personal is stored in the site's files.
   Model: { v: 1, seeded: true, items: { <id>: { id, sec, text, note?, status?, order?, due?, done?, created, at, deleted?, seed? } } }
     sec = which section the item belongs to ("ideas" | "tasks"; more sections can be added to SECTIONS later).
   Merge: per item id, the newer "at" wins; deletions are tombstones (deleted: true), pruned after 30 days.
   Offline-first: kept in localStorage per user (rg-myideas-v1:<user id>) and merged into the account copy on every sync.
   The first checklist item is added once, on the first successful sync of an account whose list was never seeded. */
(function () {
  "use strict";
  var APP = "myideas", KEY = "items", POLL_MS = 10000, TOMB_MS = 30 * 24 * 3600 * 1000;
  var SECTIONS = [
    { id: "ideas", tab: "tabIdeas", kind: "idea" },
    { id: "tasks", tab: "tabTasks", kind: "task" }
  ];
  var STATUSES = ["new", "dev", "done"], ST_LABEL = { "new": "stNew", dev: "stDev", done: "stDone" };
  var A = window.RGAccount, M = window.RGMy, t = M.t;
  var uid = null, items = {}, seeded = false, pending = false, busy = false, again = false, offline = false, lastT = 0, soonT = 0;
  var editing = null, rendering = false;
  var tab = lsGet("rg-myideas-tab") || "ideas", sort = lsGet("rg-myideas-sort") || "manual", doneOpen = false;
  if (!SECTIONS.some(function (s) { return s.id === tab; })) tab = SECTIONS[0].id;

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
    items = (c && c.items && typeof c.items === "object") ? c.items : {}; pending = !!(c && c.pending); seeded = !!(c && c.seeded);
  }
  function saveLocal() { if (uid) lsSet(cacheKey(uid), JSON.stringify({ items: items, pending: pending, seeded: seeded })); }
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
  function live(sec) { var r = []; for (var k in items) { var x = items[k]; if (!x.deleted && x.sec === sec) r.push(x); } return r; }

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
    var who = uid, sent = null;
    return A.get(APP, KEY).then(function (cloud) {
      if (who !== uid) return;
      var cl = (cloud && cloud.items && typeof cloud.items === "object") ? cloud.items : {};
      var cloudSeeded = !!(cloud && cloud.seeded);
      var merged = merge(items, cl), dirty = !same(merged, items);
      items = merged;
      if (!seeded && !cloudSeeded) { // first time for this account: add the first checklist item (only if the checklist is empty)
        if (!live("tasks").length) { var id = newId(), at = now(); items[id] = { id: id, sec: "tasks", text: t("seedTask"), seed: 1, done: false, created: at, at: at }; }
        dirty = true;
      }
      seeded = true;
      if (dirty) { saveLocal(); render(); }
      if (cloudSeeded && same(items, cl)) return;
      sent = items;
      return A.set(APP, KEY, { v: 1, seeded: true, items: items });
    }).then(function () {
      if (who !== uid) return;
      offline = false;
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

  /* ---------- actions (every change makes a new copy of the item, so "items" identity changes too) ---------- */
  function put(x) { var c = {}; for (var k in items) c[k] = items[k]; c[x.id] = x; items = c; }
  function add(sec, text, extra) {
    text = clean(text, 200); if (!text) return;
    var id = newId(), at = now(), x = { id: id, sec: sec, text: text, created: at, at: at };
    if (sec === "ideas") { x.status = "new"; x.order = live("ideas").reduce(function (m, y) { return Math.max(m, y.order || 0); }, 0) + 1; }
    else x.done = false;
    for (var k in extra || {}) if (extra[k]) x[k] = extra[k];
    put(x);
  }
  function upd(id, patch, keepAt) {
    var x = items[id]; if (!x || x.deleted) return; var y = {}, k;
    for (k in x) y[k] = x[k]; for (k in patch) { if (patch[k] === "" || patch[k] == null) delete y[k]; else y[k] = patch[k]; }
    y.at = now(); put(y);
  }
  function del(id) { if (items[id]) put({ id: id, deleted: true, at: now() }); }
  function label(x) { return x.seed ? t("seedTask") : x.text; } // the first item follows the language until it is edited

  /* ---------- ordering ---------- */
  function sortedIdeas() {
    var l = live("ideas");
    if (sort === "new") l.sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
    else if (sort === "abc") l.sort(function (a, b) { return a.text.localeCompare(b.text, M.lang() === "he" ? "he" : "en"); });
    else if (sort === "status") l.sort(function (a, b) { return (STATUSES.indexOf(b.status) - STATUSES.indexOf(a.status)) || ((a.order || 0) - (b.order || 0)); });
    else l.sort(function (a, b) { return ((a.order || 0) - (b.order || 0)) || ((a.created || 0) - (b.created || 0)); });
    return l;
  }
  function move(id, dir) {
    var l = live("ideas").sort(function (a, b) { return ((a.order || 0) - (b.order || 0)) || ((a.created || 0) - (b.created || 0)); });
    var i = l.findIndex(function (x) { return x.id === id; }), j = i + dir; if (i < 0 || j < 0 || j >= l.length) return;
    l.forEach(function (x, n) { if ((x.order || 0) !== n + 1) upd(x.id, { order: n + 1 }); }); // normalise once
    upd(l[i].id, { order: j + 1 }); upd(l[j].id, { order: i + 1 });
  }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function sortedTasks(done) {
    var l = live("tasks").filter(function (x) { return !!x.done === done; });
    if (done) return l.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    return l.sort(function (a, b) {
      if (!!a.due !== !!b.due) return a.due ? -1 : 1;
      if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
      return (a.created || 0) - (b.created || 0);
    });
  }
  function dueText(due) {
    var td = today(), tm = new Date(); tm.setDate(tm.getDate() + 1);
    var tms = tm.getFullYear() + "-" + String(tm.getMonth() + 1).padStart(2, "0") + "-" + String(tm.getDate()).padStart(2, "0");
    if (due === td) return t("today"); if (due === tms) return t("tomorrow");
    var p = due.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
    var s = d.toLocaleDateString(M.lang() === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "short", year: p[0] == new Date().getFullYear() ? undefined : "numeric" });
    return due < td ? s + " · " + t("late") : s;
  }

  /* ---------- render ---------- */
  function editor(x) {
    var isIdea = x.sec === "ideas", h = '<div class="ed" data-ed="' + esc(x.id) + '">' +
      '<input type="text" class="e-text" maxlength="200" enterkeyhint="done" value="' + esc(label(x)) + '" aria-label="' + esc(t("edit")) + '">';
    if (isIdea) {
      h += '<textarea class="e-note" maxlength="500" placeholder="' + esc(t("phNote")) + '" aria-label="' + esc(t("note")) + '">' + esc(x.note || "") + '</textarea>' +
        '<div class="row"><label>' + esc(t("stLabel")) + ' <select class="e-status">' + STATUSES.map(function (s) {
          return '<option value="' + s + '"' + ((x.status || "new") === s ? " selected" : "") + ">" + esc(t(ST_LABEL[s])) + "</option>"; }).join("") + "</select></label></div>";
    } else {
      h += '<div class="row"><label>' + esc(t("dueShort")) + ' <input type="date" class="e-due" value="' + esc(x.due || "") + '"></label></div>';
    }
    return h + '<div class="row"><button type="button" class="btn pri" data-a="save">' + esc(t("save")) + '</button><button type="button" class="btn" data-a="cancel">' + esc(t("cancel")) +
      '</button><button type="button" class="btn dng" data-a="del">' + esc(t("del")) + "</button></div></div>";
  }
  function ideaRow(x, i, n) {
    if (editing === x.id) return '<li data-id="' + esc(x.id) + '" class="idea">' + editor(x) + "</li>";
    var st = x.status || "new", manual = sort === "manual";
    return '<li data-id="' + esc(x.id) + '" class="idea s-' + st + '">' +
      (manual ? '<span class="mv"><button type="button" data-a="up" aria-label="' + esc(t("up")) + '"' + (i === 0 ? " disabled" : "") + '>▲</button><button type="button" data-a="down" aria-label="' + esc(t("down")) + '"' + (i === n - 1 ? " disabled" : "") + ">▼</button></span>" : "") +
      '<div class="body" role="button" tabindex="0" data-a="edit" title="' + esc(t("edit")) + '"><span class="txt">' + esc(x.text) + "</span>" + (x.note ? '<span class="note">' + esc(x.note) + "</span>" : "") + "</div>" +
      '<button type="button" class="chip s-' + st + '" data-a="cycle" title="' + esc(t("stCycle")) + '">' + esc(t(ST_LABEL[st])) + "</button></li>";
  }
  function taskRow(x) {
    if (editing === x.id) return '<li data-id="' + esc(x.id) + '">' + editor(x) + "</li>";
    var late = x.due && !x.done && x.due < today();
    return '<li data-id="' + esc(x.id) + '"' + (x.done ? ' class="done"' : "") + '><button type="button" class="chk" data-a="toggle" aria-pressed="' + (x.done ? "true" : "false") + '" aria-label="' + esc((x.done ? t("uncheck") : t("check")) + ": " + label(x)) + '"><i aria-hidden="true">✓</i></button>' +
      '<div class="body" role="button" tabindex="0" data-a="edit" title="' + esc(t("edit")) + '"><span class="txt">' + esc(label(x)) + "</span>" + (x.due ? '<span class="due' + (late ? " late" : "") + '">📅 ' + esc(dueText(x.due)) + "</span>" : "") + "</div></li>";
  }
  function panelIdeas() {
    var l = sortedIdeas();
    return '<form class="addform" data-add="ideas" autocomplete="off"><div class="addrow"><input type="text" name="text" maxlength="200" enterkeyhint="next" placeholder="' + esc(t("phIdea")) + '" aria-label="' + esc(t("phIdea")) + '"><button type="submit">' + esc(t("add")) + "</button></div>" +
      '<div class="addextra"><input type="text" name="note" maxlength="500" enterkeyhint="done" placeholder="' + esc(t("phNote")) + '" aria-label="' + esc(t("phNote")) + '"></div></form>' +
      (l.length ? '<div class="tools2"><label>' + esc(t("sortLabel")) + ' <select data-sort>' + [["manual", "sortManual"], ["new", "sortNew"], ["abc", "sortAbc"], ["status", "sortStatus"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (sort === o[0] ? " selected" : "") + ">" + esc(t(o[1])) + "</option>"; }).join("") + '</select></label><span class="count">' + l.length + " " + esc(t("ideas")) + "</span></div>" +
        '<div class="card listcard"><ul class="list">' + l.map(function (x, i) { return ideaRow(x, i, l.length); }).join("") + "</ul></div>"
        : '<div class="card empty"><p>' + esc(t("emptyIdeas")) + "</p></div>");
  }
  function panelTasks() {
    var act = sortedTasks(false), done = sortedTasks(true);
    return '<form class="addform" data-add="tasks" autocomplete="off"><div class="addrow"><input type="text" name="text" maxlength="200" enterkeyhint="done" placeholder="' + esc(t("phTask")) + '" aria-label="' + esc(t("phTask")) + '"><button type="submit">' + esc(t("add")) + "</button></div>" +
      '<div class="addextra"><label for="add-due">' + esc(t("due")) + '</label><input type="date" id="add-due" name="due"></div></form>' +
      (act.length ? '<div class="card listcard"><ul class="list" id="tasks-active">' + act.map(taskRow).join("") + "</ul></div>"
        : '<div class="card empty"><p>' + esc(t(done.length ? "allDone" : "emptyTasks")) + "</p></div>") +
      (done.length ? '<details class="donebox"' + (doneOpen ? " open" : "") + '><summary>' + esc(t("doneHead")) + " (" + done.length + ')<button type="button" class="clear" data-a="clear">' + esc(t("clearDone")) + "</button></summary>" +
        '<div class="card listcard"><ul class="list" id="tasks-done">' + done.map(taskRow).join("") + "</ul></div></details>" : "");
  }
  function render() {
    var tabs = $("tabs"), panels = $("panels"); if (!tabs || !panels) return;
    if (!uid) { tabs.innerHTML = ""; panels.innerHTML = ""; setStatus(); return; } // signed out: nothing private on the page
    if (editing && (!items[editing] || items[editing].deleted)) editing = null;
    var ae = document.activeElement, keep = null;
    if (ae && ae.closest && ae.closest(".addform")) keep = { form: ae.closest(".addform").getAttribute("data-add"), name: ae.name, v: ae.value };
    var drafts = {}; document.querySelectorAll(".addform input").forEach(function (i) { drafts[i.closest("form").getAttribute("data-add") + "/" + i.name] = i.value; });
    var edVals = null, ed = editing && document.querySelector('[data-ed="' + editing + '"]');
    if (ed) edVals = [].map.call(ed.querySelectorAll("input,textarea,select"), function (e) { return e.value; });
    rendering = true;
    tabs.innerHTML = SECTIONS.map(function (s) {
      var n = s.id === "tasks" ? sortedTasks(false).length : live(s.id).length;
      return '<button type="button" class="tab" role="tab" data-tab="' + s.id + '" aria-selected="' + (tab === s.id) + '">' + esc(t(s.tab)) + (n ? '<span class="n">' + n + "</span>" : "") + "</button>";
    }).join("");
    panels.innerHTML = '<section role="tabpanel" data-panel="' + tab + '">' + (tab === "ideas" ? panelIdeas() : panelTasks()) + "</section>";
    document.querySelectorAll(".addform input").forEach(function (i) { var v = drafts[i.closest("form").getAttribute("data-add") + "/" + i.name]; if (v) i.value = v; });
    if (keep) { var k = document.querySelector('.addform[data-add="' + keep.form + '"] [name="' + keep.name + '"]'); if (k) k.focus(); }
    if (editing) {
      var ne = document.querySelector('[data-ed="' + editing + '"]');
      if (ne) { if (edVals) [].forEach.call(ne.querySelectorAll("input,textarea,select"), function (e, n) { if (n < edVals.length) e.value = edVals[n]; }); if (!ed) { var ti = ne.querySelector(".e-text"); ti.focus(); var L = ti.value.length; try { ti.setSelectionRange(L, L); } catch (e) {} } }
    }
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
    if (x.sec === "ideas") { var nt = clean(ed.querySelector(".e-note").value, 500); if (nt !== (x.note || "")) p.note = nt; var st = ed.querySelector(".e-status").value; if (st !== (x.status || "new")) p.status = st; }
    else { var du = ed.querySelector(".e-due").value || ""; if (du !== (x.due || "")) p.due = du; }
    if (Object.keys(p).length) { upd(id, p); changed(); return; }
    render();
  }
  function askDel(id) {
    var x = items[id]; if (!x) return;
    if (window.confirm(t("confirmDel").replace("{x}", label(x)))) { if (editing === id) editing = null; del(id); changed(); }
  }

  function boot() {
    var main = document.querySelector("main");
    $("tabs").addEventListener("click", function (e) {
      var b = e.target.closest("[data-tab]"); if (!b) return;
      tab = b.getAttribute("data-tab"); editing = null; lsSet("rg-myideas-tab", tab); render();
    });
    main.addEventListener("submit", function (e) {
      var f = e.target.closest("[data-add]"); if (!f) return; e.preventDefault();
      var sec = f.getAttribute("data-add"), ti = f.querySelector('[name="text"]'); if (!clean(ti.value, 200)) { ti.focus(); return; }
      var ex = {}; if (sec === "ideas") ex.note = clean(f.querySelector('[name="note"]').value, 500); else ex.due = f.querySelector('[name="due"]').value || "";
      add(sec, ti.value, ex); f.reset(); f.querySelectorAll("input").forEach(function (i) { i.value = ""; });
      changed(); var n = document.querySelector('.addform[data-add="' + sec + '"] [name="text"]'); if (n) n.focus();
    });
    main.addEventListener("keydown", function (e) {
      var f = e.target.closest && e.target.closest(".addform");
      if (f && e.key === "Enter" && e.target.name === "text" && f.getAttribute("data-add") === "ideas" && !e.isComposing) { e.preventDefault(); f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); }
      if (e.target.classList && e.target.classList.contains("body") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.target.click(); }
      var ed = e.target.closest && e.target.closest("[data-ed]");
      if (ed) {
        if (e.key === "Escape") { e.preventDefault(); editing = null; render(); }
        else if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); saveEdit(ed.getAttribute("data-ed")); }
      }
    });
    main.addEventListener("change", function (e) {
      if (e.target.hasAttribute && e.target.hasAttribute("data-sort")) { sort = e.target.value; lsSet("rg-myideas-sort", sort); render(); }
    });
    main.addEventListener("toggle", function (e) { if (e.target.classList && e.target.classList.contains("donebox") && !rendering) doneOpen = e.target.open; }, true);
    main.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]"); if (!b) return;
      var a = b.getAttribute("data-a");
      if (a === "clear") {
        e.preventDefault(); e.stopPropagation();
        if (window.confirm(t("confirmClear"))) { live("tasks").forEach(function (x) { if (x.done) del(x.id); }); changed(); }
        return;
      }
      var li = b.closest("[data-id]"), id = li && li.getAttribute("data-id"), x = id && items[id]; if (!x) return;
      if (a === "toggle") { upd(id, { done: !x.done }); changed(); }
      else if (a === "cycle") { upd(id, { status: STATUSES[(STATUSES.indexOf(x.status || "new") + 1) % STATUSES.length] }); changed(); }
      else if (a === "up" || a === "down") { move(id, a === "up" ? -1 : 1); changed(); }
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
