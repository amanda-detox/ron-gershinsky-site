/* Listify (my/ideas/, formerly "Checklist") — private, per-user, synced through RGAccount (Appwrite row app="myideas", key="items",
   readable/writable by the signed-in user only). Nothing personal is stored in the site's files.
   Model: { v: 1, seeded: true, items: { <id>: { id, sec, text, note?, status?, order?, due?, done?, created, at, deleted?, seed? } } }
     sec = which category the item belongs to: one of the built-in ids ("ideas" | "tasks" | "goals") or a custom category id.
   Categories (since Listify): stored in the SAME items map as records { id: "c:<cat>", type: "cat", cat, name?, kind, pos, gone?, created, at }
     kind = "idea" | "task" | "goal" (which item features the category has). The three built-in categories exist without a record
     until they are renamed, moved or deleted (gone: 1 hides one; it is not a tombstone, so it is never pruned and never comes back).
     Old data needs no rewrite: old items already point at "ideas" / "tasks" / "goals". Old app versions ignore the category records
     (they have no "sec") but keep and sync them, because they merge every valid record.
     goals: progress 0-100 (100 = achieved), prev = progress before it was marked achieved.
   Merge: per item id, the newer "at" wins; deletions are tombstones (deleted: true), pruned after 30 days.
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
  var KINDS = ["task", "idea", "goal"], KIND_LABEL = { task: "kTask", idea: "kIdea", goal: "kGoal" };
  var STATUSES = ["new", "dev", "done"], ST_LABEL = { "new": "stNew", dev: "stDev", done: "stDone" };
  var A = window.RGAccount, M = window.RGMy, t = M.t;
  var uid = null, items = {}, seeded = false, pending = false, busy = false, again = false, offline = false, lastT = 0, soonT = 0;
  var editing = null, rendering = false;
  var tab = lsGet("rg-myideas-tab") || "ideas", sort = lsGet("rg-myideas-sort") || "manual", doneOpen = {};
  var drag = null, needRender = false, noClick = false;

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
  function kindOf(sec) { var c = catOf(sec); if (c) return c.kind; var d = SECTIONS.filter(function (s) { return s.id === sec; })[0]; return d ? d.kind : "task"; }
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
    var kd = kindOf(sec);
    if (kd === "idea") { x.status = "new"; x.order = live(sec).reduce(function (m, y) { return Math.max(m, y.order || 0); }, 0) + 1; }
    else if (kd === "task") x.done = false;
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
  function sortedIdeas(sec) {
    var l = live(sec);
    if (sort === "new") l.sort(function (a, b) { return (b.created || 0) - (a.created || 0); });
    else if (sort === "abc") l.sort(function (a, b) { return a.text.localeCompare(b.text, M.lang() === "he" ? "he" : "en"); });
    else if (sort === "status") l.sort(function (a, b) { return (STATUSES.indexOf(b.status) - STATUSES.indexOf(a.status)) || ((a.order || 0) - (b.order || 0)); });
    else l.sort(function (a, b) { return ((a.order || 0) - (b.order || 0)) || ((a.created || 0) - (b.created || 0)); });
    return l;
  }
  function move(id, dir) {
    var l = live(items[id].sec).sort(function (a, b) { return ((a.order || 0) - (b.order || 0)) || ((a.created || 0) - (b.created || 0)); });
    var i = l.findIndex(function (x) { return x.id === id; }), j = i + dir; if (i < 0 || j < 0 || j >= l.length) return;
    l.forEach(function (x, n) { if ((x.order || 0) !== n + 1) upd(x.id, { order: n + 1 }); }); // normalise once
    upd(l[i].id, { order: j + 1 }); upd(l[j].id, { order: i + 1 });
  }
  function today() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function sortedTasks(sec, done) {
    var l = live(sec).filter(function (x) { return !!x.done === done; });
    if (done) return l.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    return l.sort(function (a, b) {
      if (!!a.due !== !!b.due) return a.due ? -1 : 1;
      if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
      return (a.created || 0) - (b.created || 0);
    });
  }
  function byDue(a, b) {
    if (!!a.due !== !!b.due) return a.due ? -1 : 1;
    if (a.due && b.due && a.due !== b.due) return a.due < b.due ? -1 : 1;
    return (a.created || 0) - (b.created || 0);
  }
  function prog(x) { var v = Math.round(+x.progress || 0); return v < 0 ? 0 : v > 100 ? 100 : v; }
  function goalStep(v) { return v >= 100 ? "gDone" : v > 0 ? "gDoing" : "gNot"; }
  function sortedGoals(sec, achieved) {
    var l = live(sec).filter(function (x) { return (prog(x) >= 100) === achieved; });
    return achieved ? l.sort(function (a, b) { return (b.at || 0) - (a.at || 0); }) : l.sort(byDue);
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
    var kd = kindOf(x.sec), isIdea = kd === "idea", h = '<div class="ed" data-ed="' + esc(x.id) + '">' +
      '<input type="text" class="e-text" maxlength="200" enterkeyhint="done" value="' + esc(label(x)) + '" aria-label="' + esc(t("edit")) + '">';
    if (isIdea) {
      h += '<textarea class="e-note" maxlength="500" placeholder="' + esc(t("phNote")) + '" aria-label="' + esc(t("note")) + '">' + esc(x.note || "") + '</textarea>' +
        '<div class="row"><label>' + esc(t("stLabel")) + ' <select class="e-status">' + STATUSES.map(function (s) {
          return '<option value="' + s + '"' + ((x.status || "new") === s ? " selected" : "") + ">" + esc(t(ST_LABEL[s])) + "</option>"; }).join("") + "</select></label></div>";
    } else if (kd === "goal") {
      var v = prog(x);
      h += '<textarea class="e-note" maxlength="500" placeholder="' + esc(t("phNote")) + '" aria-label="' + esc(t("note")) + '">' + esc(x.note || "") + '</textarea>' +
        '<div class="row"><label>' + esc(t("targetShort")) + ' <input type="date" class="e-due" value="' + esc(x.due || "") + '"></label></div>' +
        '<div class="prow"><label for="pr-' + esc(x.id) + '">' + esc(t("progress")) + '</label><input type="range" class="e-prog" id="pr-' + esc(x.id) + '" min="0" max="100" step="5" value="' + v + '"><output class="e-out">' + v + '%</output></div>' +
        '<div class="row steps">' + [[0, "gNot"], [50, "gDoing"], [100, "gDone"]].map(function (o) { return '<button type="button" class="btn sm" data-a="step" data-v="' + o[0] + '">' + esc(t(o[1])) + "</button>"; }).join("") + "</div>";
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
  function goalRow(x) {
    if (editing === x.id) return '<li data-id="' + esc(x.id) + '" class="goal">' + editor(x) + "</li>";
    var v = prog(x), got = v >= 100, late = x.due && !got && x.due < today();
    return '<li data-id="' + esc(x.id) + '" class="goal' + (got ? " done" : "") + '"><button type="button" class="chk" data-a="achieve" aria-pressed="' + got + '" aria-label="' + esc((got ? t("unachieve") : t("achieve")) + ": " + x.text) + '"><i aria-hidden="true">✓</i></button>' +
      '<div class="body" role="button" tabindex="0" data-a="edit" title="' + esc(t("edit")) + '"><span class="txt">' + esc(x.text) + "</span>" + (x.note ? '<span class="note">' + esc(x.note) + "</span>" : "") +
      (x.due ? '<span class="due' + (late ? " late" : "") + '">🎯 ' + esc(dueText(x.due)) + "</span>" : "") +
      '<span class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + v + '" aria-label="' + esc(t("progress")) + '"><i style="width:' + v + '%"></i></span><span class="plabel">' + v + "% · " + esc(t(goalStep(v))) + "</span></div></li>";
  }
  function panelGoals(sec) {
    var act = sortedGoals(sec, false), got = sortedGoals(sec, true);
    return '<form class="addform" data-add="' + esc(sec) + '" autocomplete="off"><div class="addrow"><input type="text" name="text" maxlength="200" enterkeyhint="next" placeholder="' + esc(t("phGoal")) + '" aria-label="' + esc(t("phGoal")) + '"><button type="submit">' + esc(t("add")) + "</button></div>" +
      '<div class="addextra"><input type="text" name="note" maxlength="500" enterkeyhint="done" placeholder="' + esc(t("phNote")) + '" aria-label="' + esc(t("phNote")) + '"></div>' +
      '<div class="addextra"><label for="add-target">' + esc(t("target")) + '</label><input type="date" id="add-target" name="due"></div></form>' +
      (act.length ? '<div class="card listcard"><ul class="list" id="goals-active">' + act.map(goalRow).join("") + "</ul></div>"
        : '<div class="card empty"><p>' + esc(t(got.length ? "allGoals" : "emptyGoals")) + "</p></div>") +
      (got.length ? '<details class="donebox" data-sec="' + esc(sec) + '"' + (doneOpen[sec] ? " open" : "") + '><summary>' + esc(t("goalsDone")) + " (" + got.length + ")</summary>" +
        '<div class="card listcard"><ul class="list" id="goals-done">' + got.map(goalRow).join("") + "</ul></div></details>" : "");
  }
  function panelIdeas(sec) {
    var l = sortedIdeas(sec);
    return '<form class="addform" data-add="' + esc(sec) + '" autocomplete="off"><div class="addrow"><input type="text" name="text" maxlength="200" enterkeyhint="next" placeholder="' + esc(t("phIdea")) + '" aria-label="' + esc(t("phIdea")) + '"><button type="submit">' + esc(t("add")) + "</button></div>" +
      '<div class="addextra"><input type="text" name="note" maxlength="500" enterkeyhint="done" placeholder="' + esc(t("phNote")) + '" aria-label="' + esc(t("phNote")) + '"></div></form>' +
      (l.length ? '<div class="tools2"><label>' + esc(t("sortLabel")) + ' <select data-sort>' + [["manual", "sortManual"], ["new", "sortNew"], ["abc", "sortAbc"], ["status", "sortStatus"]].map(function (o) {
        return '<option value="' + o[0] + '"' + (sort === o[0] ? " selected" : "") + ">" + esc(t(o[1])) + "</option>"; }).join("") + '</select></label><span class="count">' + l.length + " " + esc(t("ideas")) + "</span></div>" +
        '<div class="card listcard"><ul class="list">' + l.map(function (x, i) { return ideaRow(x, i, l.length); }).join("") + "</ul></div>"
        : '<div class="card empty"><p>' + esc(t("emptyIdeas")) + "</p></div>");
  }
  function panelTasks(sec) {
    var act = sortedTasks(sec, false), done = sortedTasks(sec, true);
    return '<form class="addform" data-add="' + esc(sec) + '" autocomplete="off"><div class="addrow"><input type="text" name="text" maxlength="200" enterkeyhint="done" placeholder="' + esc(t("phTask")) + '" aria-label="' + esc(t("phTask")) + '"><button type="submit">' + esc(t("add")) + "</button></div>" +
      '<div class="addextra"><label for="add-due">' + esc(t("due")) + '</label><input type="date" id="add-due" name="due"></div></form>' +
      (act.length ? '<div class="card listcard"><ul class="list" id="tasks-active">' + act.map(taskRow).join("") + "</ul></div>"
        : '<div class="card empty"><p>' + esc(t(done.length ? "allDone" : "emptyTasks")) + "</p></div>") +
      (done.length ? '<details class="donebox" data-sec="' + esc(sec) + '"' + (doneOpen[sec] ? " open" : "") + '><summary>' + esc(t("doneHead")) + " (" + done.length + ')<button type="button" class="clear" data-a="clear">' + esc(t("clearDone")) + "</button></summary>" +
        '<div class="card listcard"><ul class="list" id="tasks-done">' + done.map(taskRow).join("") + "</ul></div></details>" : "");
  }
  function render() {
    var tabs = $("tabs"), panels = $("panels"); if (!tabs || !panels) return;
    if (drag) { needRender = true; return; } // never rebuild the bar under a finger that is dragging a category
    if (!uid) { tabs.innerHTML = ""; panels.innerHTML = ""; setStatus(); return; } // signed out: nothing private on the page
    if (editing && (!items[editing] || items[editing].deleted)) editing = null;
    var ae = document.activeElement, keep = null;
    if (ae && ae.closest && ae.closest(".addform")) keep = { form: ae.closest(".addform").getAttribute("data-add"), name: ae.name, v: ae.value };
    var drafts = {}; document.querySelectorAll(".addform input").forEach(function (i) { drafts[i.closest("form").getAttribute("data-add") + "/" + i.name] = i.value; });
    var edVals = null, ed = editing && document.querySelector('[data-ed="' + editing + '"]');
    if (ed) edVals = [].map.call(ed.querySelectorAll("input,textarea,select"), function (e) { return e.value; });
    rendering = true;
    var sl = tabs.scrollLeft, cur = curTab(), kd = cur ? kindOf(cur) : "";
    tabs.innerHTML = cats().map(function (c) {
      return '<button type="button" class="tab" role="tab" data-tab="' + esc(c.cat) + '" aria-selected="' + (cur === c.cat) + '" title="' + esc(t("tabTip")) + '">' + esc(catName(c)) + "</button>";
    }).join("");
    var ca = $("cat-add"); if (ca) { ca.setAttribute("aria-label", t("catAdd")); ca.title = t("catAdd"); }
    tabs.scrollLeft = sl;
    var hint = $("cathint"); if (hint) { hint.textContent = t("catHint"); hint.hidden = !!lsGet("rg-myideas-hint"); }
    panels.innerHTML = !cur ? '<div class="card empty"><p>' + esc(t("noCats")) + "</p></div>" :
      '<section role="tabpanel" data-panel="' + esc(cur) + '">' + (kd === "idea" ? panelIdeas(cur) : kd === "goal" ? panelGoals(cur) : panelTasks(cur)) + "</section>";
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
    var kd = kindOf(x.sec);
    if (kd === "idea") { var nt = clean(ed.querySelector(".e-note").value, 500); if (nt !== (x.note || "")) p.note = nt; var st = ed.querySelector(".e-status").value; if (st !== (x.status || "new")) p.status = st; }
    else {
      var du = ed.querySelector(".e-due").value || ""; if (du !== (x.due || "")) p.due = du;
      if (kd === "goal") {
        var gn = clean(ed.querySelector(".e-note").value, 500); if (gn !== (x.note || "")) p.note = gn;
        var pv = Math.max(0, Math.min(100, parseInt(ed.querySelector(".e-prog").value, 10) || 0)); if (pv !== prog(x)) { p.progress = pv || null; p.prev = null; }
      }
    }
    if (Object.keys(p).length) { upd(id, p); changed(); return; }
    render();
  }
  function askDel(id) {
    var x = items[id]; if (!x) return;
    if (window.confirm(t("confirmDel").replace("{x}", label(x)))) { if (editing === id) editing = null; del(id); changed(); }
  }

  /* ---------- category bar: tap = open, tap again (or double-tap) / long-press = menu, long-press + move (mouse: drag) = reorder ---------- */
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
  function nameSheet(title, value, withKind, done) {
    var kind = "task";
    var w = sheet('<h3>' + esc(title) + '</h3><form class="sform" autocomplete="off"><input type="text" class="s-name" maxlength="40" enterkeyhint="done" value="' + esc(value || "") + '" placeholder="' + esc(t("catPh")) + '" aria-label="' + esc(t("catPh")) + '">' +
      (withKind ? '<div class="kinds" role="radiogroup" aria-label="' + esc(t("catKind")) + '">' + KINDS.map(function (k) { return '<button type="button" class="kind" role="radio" data-s="k-' + k + '" aria-checked="' + (k === kind) + '">' + esc(t(KIND_LABEL[k])) + "</button>"; }).join("") + "</div>" : "") +
      '<div class="row"><button type="submit" class="btn pri">' + esc(t(withKind ? "create" : "save")) + '</button><button type="button" class="btn" data-s="x">' + esc(t("cancel")) + "</button></div></form>",
      function (a, w) {
        if (a === "x") closeSheet();
        else if (a.indexOf("k-") === 0) { kind = a.slice(2); w.querySelectorAll(".kind").forEach(function (b) { b.setAttribute("aria-checked", b.getAttribute("data-s") === a); }); }
      });
    w.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault(); var v = clean(w.querySelector(".s-name").value, 40); if (!v) { w.querySelector(".s-name").focus(); return; }
      closeSheet(); done(v, kind);
    });
  }
  function catMenu(cid) {
    var c = catOf(cid); if (!c) return;
    lsSet("rg-myideas-hint", "1"); var h = $("cathint"); if (h) h.hidden = true;
    var l = cats(), i = l.findIndex(function (x) { return x.cat === cid; }), rtl = document.documentElement.dir === "rtl";
    var prev = '<button type="button" class="mi" data-s="prev"' + (i === 0 ? " disabled" : "") + ">" + esc(t(rtl ? "moveR" : "moveL")) + "</button>";
    var next = '<button type="button" class="mi" data-s="next"' + (i === l.length - 1 ? " disabled" : "") + ">" + esc(t(rtl ? "moveL" : "moveR")) + "</button>";
    sheet('<h3>' + esc(catName(c)) + '</h3><button type="button" class="mi big" data-s="ren">' + esc(t("rename")) + "</button>" +
      '<div class="mrow">' + (rtl ? prev + next : prev + next) + "</div>" +
      '<button type="button" class="mi dng" data-s="del">' + esc(t("delCat")) + '</button><button type="button" class="mi" data-s="x">' + esc(t("cancel")) + "</button>",
      function (a) {
        if (a === "x") closeSheet();
        else if (a === "ren") nameSheet(t("renameTitle"), catName(c), false, function (v) { if (v !== catName(c)) { upCat(cid, { name: v }); changed(); } });
        else if (a === "prev" || a === "next") {
          var ids = cats().map(function (x) { return x.cat; }), j = i + (a === "prev" ? -1 : 1); if (j < 0 || j >= ids.length) return;
          ids.splice(j, 0, ids.splice(i, 1)[0]); setOrder(ids); closeSheet(); changed();
        } else if (a === "del") {
          if (cats().length <= 1) { window.alert(t("lastCat")); return; }
          if (window.confirm(t("confirmDelCat").replace("{x}", catName(c)))) { closeSheet(); delCat(cid); if (tab === cid) { tab = ""; } changed(); lsSet("rg-myideas-tab", curTab()); render(); }
        }
      });
  }
  function selectTab(cid) { tab = cid; editing = null; lsSet("rg-myideas-tab", tab); render(); }
  function bootCats() {
    var bar = $("tabs"), LONG = 450, SLOP = 10, timer = 0, auto = 0;
    function reset() { clearTimeout(timer); clearInterval(auto); if (drag && drag.el) drag.el.classList.remove("lifted"); bar.classList.remove("dragging"); drag = null; if (needRender) { needRender = false; render(); } }
    function lift() { drag.lifted = true; drag.el.classList.add("lifted"); bar.classList.add("dragging"); try { drag.el.setPointerCapture(drag.pid); } catch (e) {} if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {} }
    function overTab(x) {
      var l = bar.querySelectorAll(".tab");
      for (var i = 0; i < l.length; i++) { var r = l[i].getBoundingClientRect(); if (x >= r.left && x <= r.right) return l[i]; }
      return null;
    }
    function moveTo(x) {
      var o = overTab(x); if (!o || o === drag.el) return;
      var l = [].slice.call(bar.querySelectorAll(".tab")), a = l.indexOf(drag.el), b = l.indexOf(o);
      bar.insertBefore(drag.el, b > a ? o.nextSibling : o); drag.moved = true;
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
        if (drag.type === "mouse") lift(); else { reset(); return; } // touch moved before the long-press: it is a normal scroll
      }
      e.preventDefault(); moveTo(e.clientX);
      if (!auto) auto = setInterval(function () { if (!drag) return; var r = bar.getBoundingClientRect(), z = 36;
        if (drag.cx < r.left + z) { bar.scrollLeft -= 10; moveTo(drag.cx); } else if (drag.cx > r.right - z) { bar.scrollLeft += 10; moveTo(drag.cx); } }, 30);
    });
    function up(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      var d = drag;
      if (d.lifted) {
        noClick = true; setTimeout(function () { noClick = false; }, 400);
        if (d.moved) { var ids = [].map.call(bar.querySelectorAll(".tab"), function (b) { return b.getAttribute("data-tab"); }); reset(); setOrder(ids); changed(); }
        else { reset(); catMenu(d.cat); }
      } else reset();
    }
    bar.addEventListener("pointerup", up);
    bar.addEventListener("pointercancel", up);
    bar.addEventListener("touchmove", function (e) { if (drag && drag.lifted) e.preventDefault(); }, { passive: false }); // keep the bar from scrolling while a category is lifted
    bar.addEventListener("contextmenu", function (e) {
      var el = e.target.closest(".tab"); if (!el) return; e.preventDefault();
      if (!drag || drag.type === "mouse") { reset(); catMenu(el.getAttribute("data-tab")); }
    });
    bar.addEventListener("click", function (e) {
      if (noClick) { noClick = false; e.preventDefault(); return; }
      var b = e.target.closest("[data-tab]"); if (!b) return;
      var cid = b.getAttribute("data-tab");
      if (cid === curTab()) catMenu(cid); else selectTab(cid); // a second tap (double-tap) on the open category opens its menu
    });
    $("cat-add").addEventListener("click", function () {
      {
        nameSheet(t("catAdd"), "", true, function (v, k) { var id = addCat(v, k); if (id) { tab = id; lsSet("rg-myideas-tab", id); changed(); var b = bar.querySelector('[data-tab="' + id + '"]'); if (b) b.scrollIntoView({ inline: "nearest", block: "nearest" }); } });
      }
    });
  }

  function boot() {
    var main = document.querySelector("main");
    bootCats();
    main.addEventListener("submit", function (e) {
      var f = e.target.closest("[data-add]"); if (!f) return; e.preventDefault();
      var sec = f.getAttribute("data-add"), ti = f.querySelector('[name="text"]'); if (!clean(ti.value, 200)) { ti.focus(); return; }
      var ex = {}, nf = f.querySelector('[name="note"]'), df = f.querySelector('[name="due"]');
      if (nf) ex.note = clean(nf.value, 500); if (df) ex.due = df.value || "";
      add(sec, ti.value, ex); f.reset(); f.querySelectorAll("input").forEach(function (i) { i.value = ""; });
      changed(); var n = document.querySelector('.addform[data-add="' + sec + '"] [name="text"]'); if (n) n.focus();
    });
    main.addEventListener("keydown", function (e) {
      var f = e.target.closest && e.target.closest(".addform");
      if (f && e.key === "Enter" && e.target.name === "text" && kindOf(f.getAttribute("data-add")) !== "task" && !e.isComposing) { e.preventDefault(); f.requestSubmit ? f.requestSubmit() : f.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })); }
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
    main.addEventListener("input", function (e) {
      if (e.target.classList && e.target.classList.contains("e-prog")) { var o = e.target.parentNode.querySelector(".e-out"); if (o) o.textContent = e.target.value + "%"; }
    });
    main.addEventListener("toggle", function (e) { if (e.target.classList && e.target.classList.contains("donebox")) doneOpen[e.target.getAttribute("data-sec")] = e.target.open; }, true);
    main.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]"); if (!b) return;
      var a = b.getAttribute("data-a");
      if (a === "clear") {
        e.preventDefault(); e.stopPropagation();
        if (window.confirm(t("confirmClear"))) { live(curTab()).forEach(function (x) { if (x.done) del(x.id); }); changed(); }
        return;
      }
      var li = b.closest("[data-id]"), id = li && li.getAttribute("data-id"), x = id && items[id]; if (!x) return;
      if (a === "step") { var ed = b.closest("[data-ed]"), r = ed && ed.querySelector(".e-prog"); if (r) { r.value = b.getAttribute("data-v"); r.dispatchEvent(new Event("input", { bubbles: true })); } return; }
      if (a === "achieve") { var v = prog(x); if (v >= 100) upd(id, { progress: (x.prev && x.prev < 100) ? x.prev : null, prev: null }); else upd(id, { progress: 100, prev: v || null }); changed(); return; }
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
