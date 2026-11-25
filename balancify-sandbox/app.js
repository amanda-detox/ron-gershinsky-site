/* Balancify sandbox. Lists and items are editable starting data, synced like Listify.
   App id sbxbalancify, database ron, table userdata. Device data is kept and uploaded
   on the first sync. It is never replaced by an empty cloud copy.
   Storage: rg-sbx-balancify-doc (this device), rg-sbx-balancify-v1:<user> (account cache),
   rg-sbx-balancify-hist2:*, rg-sbx-balancify-lastsync:*, rg-sbx-balancify-notefold:*,
   rg-sbx-balancify-claimed. Legacy rg-sbx-balancify-user / -order / -checked-* are read
   once and left in place. */
(function () {
  "use strict";
  var M = window.BALModel, D = window.BAL_DATA;
  var LANG_KEY = "rg-lang", THEME_KEY = "rg-sbx-balancify-theme", BG_KEY = "rg-sbx-balancify-bg";
  var NOTE_MAX = 2500;
  var S = {
    he: {
      home: "→ חזרה", bg: "🖼️ רקע", bgTitle: "בחירת רקע",
      dark: "לילה", light: "יום", toLight: "מעבר למצב יום", toDark: "מעבר למצב לילה", close: "סגירה",
      addList: "＋ רשימה חדשה", listPh: "שם הרשימה", optMenu: "אפשרויות", optMove: "סידור", optRename: "עריכה", optDelete: "אשפה",
      moveNote: "סידור: גרירה ב-☰ או ▲▼", moveUp: "למעלה", moveDown: "למטה", editDone: "סיום",
      save: "שמור", cancel: "ביטול", del: "מחק", add: "הוספה", phTitle: "כותרת פריט", phNote: "הערה",
      empty: "הרשימה ריקה. כתוב למעלה את הפריט הראשון.", noLists: "אין רשימות עדיין. ＋ רשימה חדשה למטה.",
      confirmDel: "למחוק את הרשימה „{x}” וכל מה שבתוכה?", deleted: "„{x}” נמחק", undo: "ביטול",
      dragItem: "גרירה לסידור הפריט", dragHandle: "גרירה לסידור", noteToggle: "הצג/הסתר הערה",
      notesHide: "הסתר הערות", notesShow: "הצג הערות", noteMax: "הגעת לאורך המרבי של הערה",
      chosen: "נבחרים", markOk: "סומן ✓", markNo: "סומן ✕", check: "סימון",
      synced: "מסונכרן", saving: "שומר…", waiting: "ממתין לסנכרן…",
      lastSync: "סונכרן לאחרונה ב-{t}", cloudAt: "עודכן בענן ב-{t}",
      localOnly: "נשמר במכשיר הזה בלבד, בלי חשבון",
      offline: "⚠ אין חיבור – השינויים נשמרו במכשיר ויסונכרנו כשתחזור לרשת",
      blocked: "השמירה נעצרה: נראית מחיקה גדולה מול העותק בענן. מה שנמצא במכשיר נשאר כאן, והענן לא נדרס.",
      uploadCut: "ההעלאה לענן נקטעה. הרשימות נשארו במכשיר ומנסים שוב.",
      syncErrorAuth: "הענן דחה את ההתחברות. הרשימות נשארו במכשיר.",
      syncErrorDenied: "אין הרשאה לשמור בענן. הרשימות נשארו במכשיר.",
      syncErrorPaused: "השרת מושהה כרגע. הרשימות נשארו במכשיר.",
      syncErrorServer: "השמירה לענן נכשלה. הרשימות נשארו במכשיר.",
      syncErrorTimeout: "השמירה לענן לא הסתיימה בזמן. הרשימות נשארו במכשיר.",
      history: "היסטוריית גרסאות", backupLink: "גיבוי", backupEmpty: "אין עדיין מה לגבות",
      historyEmpty: "עדיין אין גרסאות שמורות.", historyCounts: "{l} רשימות · {n} פריטים",
      historyRestore: "שחזר", historyDownload: "הורד", historyBack: "סגור", historyFail: "לא הצלחנו לשחזר את הגרסה הזו.",
      renameTitle: "עריכת הרשימה", create: "יצירה", move: "העבר", moveTitle: "להעביר לאיזו רשימה?",
      movedTo: "הועבר אל {x}", noOther: "אין עוד רשימה."
    },
    en: {
      home: "← Back", bg: "🖼️ Background", bgTitle: "Choose a background",
      dark: "Night", light: "Day", toLight: "Switch to day", toDark: "Switch to night", close: "Close",
      addList: "＋ New list", listPh: "List name", optMenu: "Options", optMove: "Reorder", optRename: "Edit", optDelete: "Trash",
      moveNote: "Reorder: drag ☰ or use ▲▼", moveUp: "Up", moveDown: "Down", editDone: "Done",
      save: "Save", cancel: "Cancel", del: "Delete", add: "Add", phTitle: "Item title", phNote: "Note",
      empty: "This list is empty. Write the first item above.", noLists: "No lists yet. ＋ New list below.",
      confirmDel: "Delete the list “{x}” and everything in it?", deleted: "“{x}” deleted", undo: "Undo",
      dragItem: "Drag to reorder the item", dragHandle: "Drag to reorder", noteToggle: "Show/hide note",
      notesHide: "Hide notes", notesShow: "Show notes", noteMax: "This note is at its maximum length",
      chosen: "Chosen", markOk: "Marked ✓", markNo: "Marked ✕", check: "Mark",
      synced: "Synced", saving: "Saving…", waiting: "Waiting to sync…",
      lastSync: "Last synced at {t}", cloudAt: "Cloud copy updated at {t}",
      localOnly: "Saved on this device only, until you sign in",
      offline: "⚠ Offline – changes are saved on this device and will sync when you're back online",
      blocked: "Saving stopped: this looks like a large deletion compared with the cloud copy. What is on this device stays here.",
      uploadCut: "The upload to the cloud was cut off. The lists stayed on this device and another try is coming.",
      syncErrorAuth: "The cloud rejected the sign-in. The lists stayed on this device.",
      syncErrorDenied: "This account is not allowed to save to the cloud. The lists stayed on this device.",
      syncErrorPaused: "The server is paused right now. The lists stayed on this device.",
      syncErrorServer: "Saving to the cloud failed. The lists stayed on this device.",
      syncErrorTimeout: "Saving to the cloud did not finish in time. The lists stayed on this device.",
      history: "Version history", backupLink: "Backup", backupEmpty: "Nothing to back up yet.",
      historyEmpty: "No saved versions yet.", historyCounts: "{l} lists · {n} items",
      historyRestore: "Restore", historyDownload: "Download", historyBack: "Close", historyFail: "This version could not be restored.",
      renameTitle: "Edit list", create: "Create", move: "Move", moveTitle: "Move to which list?",
      movedTo: "Moved to {x}", noOther: "There is no other list."
    }
  };
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"/></svg>';

  function $(id) { return document.getElementById(id); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function jparse(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
  function clean(s, n) { return String(s || "").replace(/[ \t\u00a0]+/g, " ").replace(/\n+/g, " ").trim().slice(0, n); }
  function cleanNote(s) { return String(s || "").replace(/[ \t\u00a0]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, NOTE_MAX); }
  function t(k) { return S[lang][k]; }

  var lang = get(LANG_KEY) === "en" ? "en" : "he";
  var theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  var bg = get(BG_KEY) || D.defaultBg;
  if (!D.backgrounds.some(function (b) { return b.id === bg; })) bg = D.defaultBg;
  var uid = undefined;
  var items = {};
  var pending = false;
  var busy = false;
  var again = false;
  var offline = false;
  var syncErr = "";
  var failN = 0;
  var holdBlocked = false;
  var blockedCloud = null;
  var uploadCut = false;
  var overwriteOk = 0;
  var nextTry = 0;
  var history = [];
  var editing = null;
  var openOpt = null;
  var moveMode = false;
  var current = "";
  var dragging = false;
  var idrag = null;
  var noClick = false;
  var needRender = false;
  var lastT = 0;
  var soonT = 0;
  var histT = 0;
  var retryT = 0;
  var toastT = 0;
  var pollT = 0;

  function now() { lastT = Math.max(Date.now(), lastT + 1); return lastT; }
  function newId() { return now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function catRec(cid) { var r = items["c:" + cid]; return r && !r.deleted && r.type === "cat" ? r : null; }
  function storeKey() { return uid ? M.cacheKey(uid) : M.DOC_KEY; }

  function writeStore() {
    var body = JSON.stringify({ v: 1, seeded: true, items: items, pending: !!pending });
    try { localStorage.setItem(storeKey(), body); } catch (e) {}
    if (uid && get(M.CLAIM_KEY) === uid) { try { localStorage.setItem(M.DOC_KEY, body); } catch (e2) {} }
  }
  function loadDoc() {
    var adopted = M.adopt(D, get);
    items = adopted.doc.items || {};
    pending = false;
    if (adopted.fresh) writeStore();
  }
  function loadCache(id) {
    var cache = jparse(get(M.cacheKey(id)), null);
    if (cache && cache.items && typeof cache.items === "object") {
      items = cache.items;
      pending = !!cache.pending;
      return;
    }
    var claimed = get(M.CLAIM_KEY);
    if (!claimed || claimed === id) {
      pending = true;
      set(M.CLAIM_KEY, id);
    } else {
      items = M.buildFromLegacy(D, function () { return null; }, now()).items;
      pending = true;
    }
    writeStore();
  }

  function notePrefs() {
    var p = jparse(get(M.noteKey(uid || "local")), null);
    if (!p || typeof p !== "object") p = { all: 0, item: {} };
    if (!p.item || typeof p.item !== "object") p.item = {};
    return p;
  }
  function saveNotePrefs(p) { set(M.noteKey(uid || "local"), JSON.stringify({ all: p.all ? 1 : 0, item: p.item || {} })); }
  function noteHidden(id) {
    var p = notePrefs();
    if (p.item && Object.prototype.hasOwnProperty.call(p.item, id)) return p.item[id] === "hide";
    return !!p.all;
  }
  function toggleItemNote(id) {
    var p = notePrefs();
    p.item[id] = noteHidden(id) ? "show" : "hide";
    saveNotePrefs(p);
    render();
  }
  function toggleAllNotes() {
    var p = notePrefs();
    p.all = p.all ? 0 : 1;
    p.item = {};
    saveNotePrefs(p);
    render();
  }

  function nextPair(he, en, shown, text, which) {
    he = he || ""; en = en || "";
    if (which === "en") { if (!he || he === shown) he = text; en = text; }
    else { if (!en || en === shown) en = text; he = text; }
    return { he: he, en: en };
  }

  function changed() {
    pending = true;
    writeStore();
    render();
    syncSoon();
    clearTimeout(histT);
    histT = setTimeout(function () { rememberSnap(false); }, 1200);
  }

  /* ---------- home ---------- */
  function listRows() {
    var gl = M.lists(items), html = "";
    if (!gl.length && !moveMode) return '<li class="lempty">' + esc(t("noLists")) + "</li>";
    gl.forEach(function (c, i) {
      var id = esc(c.cat), name = M.nameOf(c, lang), on = c.cat === current;
      if (moveMode) {
        html += '<li class="lrow mv" data-cat="' + id + '"><span class="handle lhandle" aria-label="' + esc(t("dragHandle") + ": " + name) + '">☰</span>' +
          '<span class="lname">' + esc(name) + "</span>" +
          '<button type="button" class="step" data-act="up:' + id + '"' + (i === 0 ? " disabled" : "") + ' aria-label="' + esc(t("moveUp")) + '">▲</button>' +
          '<button type="button" class="step" data-act="down:' + id + '"' + (i === gl.length - 1 ? " disabled" : "") + ' aria-label="' + esc(t("moveDown")) + '">▼</button></li>';
        return;
      }
      var open = openOpt === c.cat;
      html += '<li class="lrow' + (on ? " on" : "") + '" data-cat="' + id + '">' +
        '<button type="button" class="lname" data-open="' + id + '">' + esc(name) + "</button>" +
        '<button type="button" class="lmore' + (open ? " on" : "") + '" data-opt="' + id + '" aria-expanded="' + (open ? "true" : "false") + '" aria-label="' + esc(t("optMenu") + ": " + name) + '">⋮</button></li>';
      if (open) {
        html += '<li class="lopts" data-opts="' + id + '">' +
          '<button type="button" data-act="move:' + id + '"><span aria-hidden="true">↕</span>' + esc(t("optMove")) + "</button>" +
          '<button type="button" data-act="ren:' + id + '"><span aria-hidden="true">✏️</span>' + esc(t("optRename")) + "</button>" +
          '<button type="button" data-act="del:' + id + '"><span aria-hidden="true">🗑</span>' + esc(t("optDelete")) + "</button></li>";
      }
    });
    return html;
  }

  /* ---------- items ---------- */
  function linksHtml(rec) {
    return (rec.links || []).map(function (l) {
      var href = String(l.href || "");
      if (!/^(https?:|tel:)/.test(href)) return "";
      var label = lang === "en" ? (l.en || l.he || "") : (l.he || l.en || "");
      var ext = /^https?:/.test(href);
      return '<a class="ilink" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + esc(label) + "</a>";
    }).join("");
  }
  function hasNote(x) { return !!(M.noteOf(x, lang) || (x.links && x.links.length)); }
  function editor(x) {
    return '<div class="ed" data-ed="' + esc(x.id) + '">' +
      '<textarea class="e-text grow" rows="1" maxlength="200" enterkeyhint="done" aria-label="' + esc(t("phTitle")) + '">' + esc(M.textOf(x, lang)) + "</textarea>" +
      '<textarea class="e-note" maxlength="' + NOTE_MAX + '" aria-label="' + esc(t("phNote")) + '">' + esc(M.noteOf(x, lang)) + "</textarea>" +
      '<p class="notemax" hidden></p>' +
      '<div class="row"><button type="button" class="btn pri" data-a="save">' + esc(t("save")) + '</button>' +
      '<button type="button" class="btn" data-a="cancel">' + esc(t("cancel")) + '</button>' +
      '<button type="button" class="btn" data-a="move">' + esc(t("move")) + '</button>' +
      '<button type="button" class="btn" data-a="del">' + esc(t("del")) + "</button></div></div>";
  }
  function row(x) {
    if (editing === x.id) return '<li class="irow editing" data-id="' + esc(x.id) + '">' + editor(x) + "</li>";
    var name = M.textOf(x, lang), note = M.noteOf(x, lang), links = linksHtml(x);
    var g = x.mark === "no" ? "no" : x.mark === "ok" ? "ok" : "";
    var cls = "irow" + (hasNote(x) ? " has-note" : "") + (g ? " mk-" + g : "");
    var hidden = noteHidden(x.id);
    var box = '<button type="button" class="ckbox' + (g ? " on-" + g : "") + '" data-a="ck" aria-label="' + esc((g === "no" ? t("markNo") : g === "ok" ? t("markOk") : t("check")) + ": " + name) + '">' + (g === "ok" ? "✓" : g === "no" ? "✕" : "") + "</button>";
    return '<li class="' + cls + '" data-id="' + esc(x.id) + '">' +
      '<span class="handle ihandle" aria-label="' + esc(t("dragItem") + ": " + name) + '">☰</span>' + box +
      '<div class="body" role="button" tabindex="0" data-a="edit"><span class="txt">' + esc(name) + "</span></div>" +
      (hasNote(x) ? '<button type="button" class="notetog' + (hidden ? "" : " on") + '" data-a="note" aria-pressed="' + (hidden ? "false" : "true") + '" aria-label="' + esc(t("noteToggle")) + '">i</button>' : "") +
      (hasNote(x) ? '<div class="note' + (hidden ? " note-off" : "") + '" data-a="edit">' + esc(note) + (links ? '<div class="ilinks">' + links + "</div>" : "") + "</div>" : "") +
      "</li>";
  }
  function grouped(arr) {
    if (!arr.length) return "";
    var html = '<ul class="list">', last = "\0";
    arr.forEach(function (x) {
      var g = M.groupOf(x, lang);
      if (g !== last) {
        if (g) html += '<li class="sec">' + esc(g) + "</li>";
        last = g;
      }
      html += row(x);
    });
    return html + "</ul>";
  }
  function panel(sec) {
    var all = M.itemsInList(items, sec);
    var chosen = all.filter(function (x) { return x.mark === "ok"; });
    var act = all.filter(function (x) { return x.mark !== "ok"; });
    var html = "";
    if (chosen.length) html += '<div class="ckhead"><span aria-hidden="true">✓</span> ' + esc(t("chosen")) + " (" + chosen.length + ")</div>" + '<ul class="list">' + chosen.map(row).join("") + "</ul>";
    html += grouped(act);
    if (!all.length) html += '<div class="empty"><p>' + esc(t("empty")) + "</p></div>";
    return html;
  }
  function paintNotes() {
    var bar = $("notesbar"), b = $("notes-all");
    if (!bar || !b) return;
    if (!current) { bar.hidden = true; return; }
    var any = M.itemsInList(items, current).some(hasNote);
    if (!any && !notePrefs().all) { bar.hidden = true; return; }
    bar.hidden = false;
    var hiding = !!notePrefs().all;
    b.textContent = t(hiding ? "notesShow" : "notesHide");
    b.setAttribute("aria-pressed", hiding ? "true" : "false");
  }
  function paintNoteMax(el) {
    if (!el) return;
    var p = el.nextElementSibling && el.nextElementSibling.classList.contains("notemax") ? el.nextElementSibling : null;
    if (!p) return;
    var n = String(el.value || "").length, on = n >= NOTE_MAX;
    p.hidden = !on;
    p.textContent = on ? (t("noteMax") + " " + n + "/" + NOTE_MAX) : "";
  }

  function render() {
    if (dragging) { needRender = true; return; }
    var home = $("home"), list = $("list");
    if (!home || !list) return;
    home.hidden = !!current;
    list.hidden = !current;
    var mb = $("movebar"); if (mb) mb.hidden = !moveMode || !!current;
    var addL = $("add-list"); if (addL) addL.hidden = !!moveMode;
    if ($("move-note")) $("move-note").textContent = t("moveNote");
    if ($("move-done")) $("move-done").textContent = t("editDone");
    if ($("lists")) $("lists").innerHTML = listRows();
    if ($("add-list")) $("add-list").textContent = t("addList");
    if (current && $("panels")) {
      var ae = document.activeElement, edVals = null;
      var ed = editing && document.querySelector('[data-ed="' + editing + '"]');
      if (ed) edVals = [].map.call(ed.querySelectorAll("textarea"), function (e) { return e.value; });
      $("panels").innerHTML = panel(current);
      if (editing) {
        var ne = document.querySelector('[data-ed="' + editing + '"]');
        if (ne && edVals) [].forEach.call(ne.querySelectorAll("textarea"), function (e, n) { if (n < edVals.length) e.value = edVals[n]; });
        if (ne && !ed) { var ti = ne.querySelector(".e-text"); if (ti) ti.focus(); }
        if (ne) paintNoteMax(ne.querySelector(".e-note"));
      }
      growAll();
    }
    paintNotes();
    setStatus();
    if (ae && ae.id && $(ae.id) && document.activeElement !== $(ae.id) && (ae.id === "add-text" || ae.id === "add-note")) $(ae.id).focus();
  }

  function grow(el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight + 2, 220) + "px"; }
  function growAll() { document.querySelectorAll("textarea.grow").forEach(grow); }

  function saveEdit(id) {
    var ed = document.querySelector('[data-ed="' + id + '"]'), x = items[id];
    editing = null;
    if (!ed || !x || x.deleted) { render(); return; }
    var text = clean(ed.querySelector(".e-text").value, 200);
    if (!text) { render(); return; }
    var note = cleanNote(ed.querySelector(".e-note").value);
    var names = nextPair(x.he, x.en, M.textOf(x, lang), text, lang);
    var notes = nextPair(x.noteHe, x.noteEn, M.noteOf(x, lang), note, lang);
    var patch = {};
    if (names.he !== (x.he || "") || names.en !== (x.en || "")) { patch.he = names.he; patch.en = names.en; }
    if (notes.he !== (x.noteHe || "") || notes.en !== (x.noteEn || "")) { patch.noteHe = notes.he; patch.noteEn = notes.en; if (x.note) patch.note = null; }
    if (Object.keys(patch).length) { items[id] = M.editRec(x, patch, now()); changed(); return; }
    render();
  }
  function cycleMark(id) {
    var x = items[id]; if (!x) return;
    var m = x.mark === "ok" ? "no" : x.mark === "no" ? null : "ok";
    items[id] = M.editRec(x, { mark: m }, now());
    changed();
  }
  function delWithUndo(id) {
    var x = items[id]; if (!x || x.deleted) return;
    var keep = M.clone(x);
    if (editing === id) editing = null;
    items[id] = M.editRec(x, { deleted: true }, now());
    changed();
    toast(t("deleted").replace("{x}", M.textOf(keep, lang)), function () {
      items[id] = M.editRec(keep, { deleted: null }, now());
      changed();
    });
  }
  function applySubsetOrder(sec, ids) {
    var all = M.itemsInList(items, sec).map(function (x) { return x.id; });
    var set = {}, slots = [];
    ids.forEach(function (id) { set[id] = 1; });
    all.forEach(function (id, i) { if (set[id]) slots.push(i); });
    ids.forEach(function (id, k) { if (k < slots.length) all[slots[k]] = id; });
    var at = now(), any = false;
    all.forEach(function (id, i) {
      if (!items[id] || items[id].order === i) return;
      items[id] = M.editRec(items[id], { order: i }, at);
      any = true;
    });
    if (any) changed();
  }
  function setListOrder(ids) {
    var at = now(), any = false;
    ids.forEach(function (cid, n) {
      var c = catRec(cid);
      if (c && c.pos !== n) { items[c.id] = M.editRec(c, { pos: n }, at); any = true; }
    });
    if (any) changed();
  }
  function addItem(text, note) {
    text = clean(text, 200);
    if (!text || !current) return;
    note = cleanNote(note || "");
    var rows = M.itemsInList(items, current);
    var order = rows.reduce(function (m, x) { return Math.max(m, x.order || 0); }, -1) + 1;
    var id = "u:" + newId();
    var at = now();
    items[id] = M.touch({ id: id, sec: current, he: text, en: text, noteHe: note, noteEn: note, order: order, created: at }, at);
    changed();
  }
  function addList(name) {
    name = clean(name, 40);
    if (!name) return "";
    var id = "l" + newId();
    var pos = M.lists(items).reduce(function (m, c) { return Math.max(m, c.pos || 0); }, -1) + 1;
    var at = now();
    var rec = M.touch({ id: "c:" + id, type: "cat", cat: id, name: name, nameHe: name, nameEn: name, pos: pos, created: at }, at);
    if (window.RGSyncStatus && RGSyncStatus.noteGone) rec = RGSyncStatus.noteGone(rec, at, false);
    items[rec.id] = rec;
    openOpt = null;
    changed();
    return id;
  }
  function renameList(cid, name) {
    var c = catRec(cid); if (!c) return;
    name = clean(name, 80);
    if (!name || name === M.nameOf(c, lang)) return;
    var pair = nextPair(c.nameHe || c.name, c.nameEn, M.nameOf(c, lang), name, lang);
    items[c.id] = M.editRec(c, { name: name, nameHe: pair.he, nameEn: pair.en }, now());
    changed();
  }
  function deleteList(cid) {
    var c = catRec(cid); if (!c) return;
    var name = M.nameOf(c, lang);
    ask(t("optDelete"), t("confirmDel").replace("{x}", name), t("optDelete"), function () {
      var at = now();
      M.itemsInList(items, cid).forEach(function (x) { items[x.id] = M.editRec(x, { deleted: true }, at); });
      var y = M.editRec(c, { gone: 1 }, at);
      if (window.RGSyncStatus && RGSyncStatus.noteGone) y = RGSyncStatus.noteGone(y, at, true);
      items[c.id] = y;
      openOpt = null;
      if (current === cid) { current = ""; if (location.hash) location.hash = ""; }
      changed();
    });
  }
  /* Swipe-delete, same as Listify: the list is removed at once and the toast can put it back for 5 seconds. */
  function delListWithUndo(cid) {
    var c = catRec(cid); if (!c || c.gone) return;
    var name = M.nameOf(c, lang);
    var keepC = M.clone(c);
    var keepItems = M.itemsInList(items, cid).map(function (x) { return M.clone(x); });
    var at = now();
    keepItems.forEach(function (x) { items[x.id] = M.editRec(items[x.id], { deleted: true }, at); });
    var y = M.editRec(c, { gone: 1 }, at);
    if (window.RGSyncStatus && RGSyncStatus.noteGone) y = RGSyncStatus.noteGone(y, at, true);
    items[c.id] = y;
    openOpt = null;
    if (current === cid) { current = ""; if (location.hash) location.hash = ""; }
    changed();
    toast(t("deleted").replace("{x}", name), function () {
      var at2 = now();
      var back = M.editRec(keepC, { gone: null, deleted: null }, at2);
      if (window.RGSyncStatus && RGSyncStatus.noteGone) back = RGSyncStatus.noteGone(back, at2, false);
      items[keepC.id] = back;
      keepItems.forEach(function (x) { items[x.id] = M.editRec(x, { deleted: null }, at2); });
      changed();
    });
  }
  function moveItem(id, cid) {
    var x = items[id], c = catRec(cid);
    if (!x || !c || x.sec === cid) return;
    if (editing === id) editing = null;
    var rows = M.itemsInList(items, cid);
    var order = rows.reduce(function (m, r) { return Math.max(m, r.order || 0); }, -1) + 1;
    items[id] = M.editRec(x, { sec: cid, order: order, groupHe: null, groupEn: null }, now());
    changed();
    toast(t("movedTo").replace("{x}", M.nameOf(c, lang)));
  }
  function moveMenu(id) {
    var x = items[id]; if (!x) return;
    var others = M.lists(items).filter(function (c) { return c.cat !== x.sec; });
    var html = "<h3>" + esc(t("moveTitle")) + "</h3>";
    if (!others.length) html += '<p class="cf-body">' + esc(t("noOther")) + "</p>";
    else html += '<div class="mlist">' + others.map(function (c) { return '<button type="button" class="mi" data-s="to:' + esc(c.cat) + '">' + esc(M.nameOf(c, lang)) + "</button>"; }).join("") + "</div>";
    html += '<button type="button" class="btn" data-s="x">' + esc(t("cancel")) + "</button>";
    sheet(html, function (a) {
      if (a.indexOf("to:") === 0) { var dest = a.slice(3); closeSheet(); moveItem(id, dest); return; }
      closeSheet();
    });
  }

  /* ---------- sheets, toast, drag ---------- */
  function closeSheet() { var w = $("sheet"); if (w && w.parentNode) w.parentNode.removeChild(w); }
  function sheet(html, onClick) {
    closeSheet();
    var w = document.createElement("div");
    w.className = "sheet"; w.id = "sheet";
    w.innerHTML = '<div class="sheet-in" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.appendChild(w);
    w.addEventListener("click", function (e) {
      if (e.target === w) { closeSheet(); return; }
      var b = e.target.closest("[data-s]");
      if (b) onClick(b.getAttribute("data-s"), w);
    });
    var f = w.querySelector("input,textarea,button");
    if (f) setTimeout(function () { f.focus(); if (f.select) f.select(); }, 30);
    return w;
  }
  function ask(title, body, yes, fn) {
    sheet("<h3>" + esc(title) + '</h3><p class="cf-body">' + esc(body) + '</p><div class="row"><button type="button" class="btn pri" data-s="yes">' + esc(yes) + '</button><button type="button" class="btn" data-s="no">' + esc(t("cancel")) + "</button></div>", function (a) {
      closeSheet();
      if (a === "yes") fn();
    });
  }
  function nameSheet(title, value, isNew, done) {
    var w = sheet("<h3>" + esc(title) + '</h3><form class="sform" autocomplete="off"><input type="text" class="s-name" maxlength="80" enterkeyhint="done" value="' + esc(value || "") + '" placeholder="' + esc(t("listPh")) + '" aria-label="' + esc(t("listPh")) + '"><div class="row"><button type="submit" class="btn pri">' + esc(t(isNew ? "create" : "save")) + '</button><button type="button" class="btn" data-s="x">' + esc(t("cancel")) + "</button></div></form>", function (a) { if (a === "x") closeSheet(); });
    w.querySelector("form").addEventListener("submit", function (e) {
      e.preventDefault();
      var v = clean(w.querySelector(".s-name").value, 80);
      if (!v) { w.querySelector(".s-name").focus(); return; }
      closeSheet();
      done(v);
    });
  }
  function hideToast() {
    var el = $("toast"); if (!el) return;
    clearTimeout(toastT);
    el.hidden = true;
    el.classList.remove("drag");
    el.style.transform = "";
    el.style.opacity = "";
  }
  /* Same toast swipe as Listify: any direction, 40px dismisses without undoing. */
  function toastSwipe(el) {
    if (el._sw) return; el._sw = 1;
    var sx = 0, sy = 0, dx = 0, dy = 0, on = false;
    el.addEventListener("pointerdown", function (e) {
      if (el.hidden || e.target.closest("button")) return;
      on = true; sx = e.clientX; sy = e.clientY; dx = dy = 0;
      el.classList.add("drag");
      clearTimeout(toastT);
      try { el.setPointerCapture(e.pointerId); } catch (x) {}
    });
    el.addEventListener("pointermove", function (e) {
      if (!on) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      var d = Math.sqrt(dx * dx + dy * dy);
      el.style.transform = "translate(calc(-50% + " + dx + "px), " + dy + "px)";
      el.style.opacity = String(Math.max(0.2, 1 - d / 160));
    });
    function end() {
      if (!on) return;
      on = false;
      el.classList.remove("drag");
      if (Math.sqrt(dx * dx + dy * dy) >= 40) {
        el.style.transform = "translate(calc(-50% + " + (dx * 3) + "px), " + (dy * 3) + "px)";
        el.style.opacity = "0";
        setTimeout(hideToast, 200);
      } else {
        el.style.transform = "";
        el.style.opacity = "";
        toastT = setTimeout(hideToast, el._undo ? 5000 : 2200);
      }
    }
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }
  function toast(msg, undo) {
    var el = $("toast");
    if (!el) return;
    toastSwipe(el);
    el._undo = !!undo;
    el.style.transform = "";
    el.style.opacity = "";
    el.innerHTML = '<span class="tmsg">' + esc(msg) + "</span>";
    if (undo) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "tundo";
      b.textContent = t("undo");
      b.onclick = function () { hideToast(); undo(); };
      var x = document.createElement("button");
      x.type = "button";
      x.className = "tx";
      x.setAttribute("aria-label", t("close"));
      x.textContent = "✕";
      x.onclick = function () { hideToast(); };
      el.appendChild(b);
      el.appendChild(x);
    }
    el.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(hideToast, undo ? 5000 : 2200);
  }
  function makeSorter(rows, el, y0) {
    function sy() { return window.scrollY || window.pageYOffset || 0; }
    var s0 = sy(), from = rows.indexOf(el), to = from, n = rows.length, lastY = y0, raf = 0, alive = true;
    var info = rows.map(function (r) { var b = r.getBoundingClientRect(); return { el: r, top: b.top + s0, h: b.height }; });
    var gap = from < n - 1 ? info[from + 1].top - info[from].top : (info[from] ? info[from].h : 56);
    rows.forEach(function (r) { if (r !== el) r.style.transition = "transform .16s ease"; });
    el.style.transition = "none"; el.classList.add("sorting");
    function place() {
      var dy = lastY + sy() - (y0 + s0), c = info[from].top + info[from].h / 2 + dy, i;
      el.style.transform = "translateY(" + dy + "px)"; el.style.position = "relative"; el.style.zIndex = "3";
      to = from;
      for (i = 0; i < from; i++) if (c < info[i].top + info[i].h / 2) { to = i; break; }
      for (i = n - 1; i > from; i--) if (c > info[i].top + info[i].h / 2) { to = i; break; }
      info.forEach(function (o, k) {
        if (k === from) return;
        var sh = (from < to && k > from && k <= to) ? -gap : (to < from && k >= to && k < from) ? gap : 0;
        o.el.style.transform = sh ? "translateY(" + sh + "px)" : "";
      });
    }
    function tick() {
      if (!alive) return;
      var z = 70, sp = 0;
      if (lastY < z) sp = -Math.ceil((z - lastY) / 4);
      else if (lastY > window.innerHeight - z) sp = Math.ceil((lastY - (window.innerHeight - z)) / 4);
      if (sp) { var b = sy(); window.scrollBy(0, sp); if (sy() !== b) place(); }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    place();
    return {
      move: function (y) { lastY = y; place(); },
      end: function () {
        alive = false; cancelAnimationFrame(raf);
        rows.forEach(function (r) { r.style.transition = "none"; r.style.transform = ""; r.style.zIndex = ""; r.classList.remove("sorting"); });
        var out = rows.slice();
        if (from >= 0) out.splice(to, 0, out.splice(from, 1)[0]);
        return { order: out, moved: to !== from };
      }
    };
  }
  /* ---------- rows: Listify's swipe (my/ideas app.js).
     Physical right = delete, with the 5-second undo. Physical left = move
     (an item asks which list; a list enters סידור). Same numbers as Listify:
     12px before the axis locks, the clearer axis must lead by 1.5×, and the
     swipe commits at 35% of the row width. Directions are physical clientX,
     so RTL does not flip them. A vertical drag stays vertical (page scroll),
     except on ☰, which reorders. The note toggle is not a swipe. ---------- */
  function bootGestures() {
    var AXIS = 12, SWIPE = 0.35, swipeGen = 0, noteGuard = null;
    function reset() {
      if (idrag) {
        unswipe();
        if (idrag.sorter) idrag.sorter.end();
      }
      document.body.classList.remove("idragging");
      idrag = null;
      dragging = false;
      if (needRender) { needRender = false; render(); }
    }
    function clearKids(li) {
      if (!li) return;
      var kids = li.children, i;
      for (i = 0; i < kids.length; i++) { kids[i].style.transition = ""; kids[i].style.transform = ""; }
    }
    function unswipe() {
      var li = idrag && idrag.li;
      if (!li) return;
      var sx = li.style.getPropertyValue("--sx");
      var kids = [].slice.call(li.children);
      var gen = ++swipeGen;
      li.classList.remove("swiping", "sw-r", "sw-l", "sw-go");
      li.style.removeProperty("--sx");
      if (!sx || sx === "0px") { clearKids(li); return; }
      var i;
      for (i = 0; i < kids.length; i++) {
        kids[i].style.transition = "none";
        kids[i].style.transform = "translateX(" + sx + ")";
      }
      void li.offsetWidth;
      for (i = 0; i < kids.length; i++) {
        kids[i].style.transition = "transform .18s ease";
        kids[i].style.transform = "";
      }
      setTimeout(function () {
        if (gen !== swipeGen) return;
        clearKids(li);
      }, 220);
    }
    function clearSel() {
      var sl = window.getSelection && window.getSelection();
      if (sl && !sl.isCollapsed) sl.removeAllRanges();
    }
    function capturePtr() {
      var el = idrag.cap && idrag.cap.setPointerCapture ? idrag.cap : idrag.li;
      try { el.setPointerCapture(idrag.pid); } catch (e2) { try { idrag.li.setPointerCapture(idrag.pid); } catch (e3) {} }
    }
    function armH() {
      if (!idrag || idrag.swipe || idrag.lifted) return;
      if (idrag.fromText) clearSel();
      swipeGen++;
      clearKids(idrag.li);
      idrag.swipe = true;
      idrag.axis = "h";
      idrag.li.classList.add("swiping");
      capturePtr();
    }
    function paintH(dx) {
      var w = idrag.li.offsetWidth || 1, go = Math.abs(dx) >= w * SWIPE;
      idrag.li.style.setProperty("--sx", dx + "px");
      idrag.li.classList.toggle("sw-r", dx > 0);
      idrag.li.classList.toggle("sw-l", dx < 0);
      idrag.li.classList.toggle("sw-go", go);
    }
    function beginLift() {
      if (!idrag || idrag.lifted || idrag.swipe) return;
      var li = idrag.li, ul = li.parentNode;
      if (!ul) return;
      var sel = idrag.kind === "list" ? ".lrow" : ".irow";
      var rows = [].filter.call(ul.children, function (n) { return n.matches(sel); });
      if (rows.indexOf(li) < 0) return;
      swipeGen++;
      clearKids(li);
      idrag.lifted = true;
      idrag.axis = "v";
      idrag.sorter = makeSorter(rows, li, idrag.y);
      document.body.classList.add("idragging");
      capturePtr();
      if (navigator.vibrate) try { navigator.vibrate(10); } catch (e3) {}
    }
    function follow(dx, dy) {
      if (!idrag || idrag.handled) return "";
      idrag._dx = dx;
      idrag._dy = dy;
      if (idrag.lifted) return "v";
      if (idrag.swipe) { paintH(dx); return "h"; }
      var adx = Math.abs(dx), ady = Math.abs(dy);
      if (!idrag.axis) {
        if (adx < AXIS && ady < AXIS) return "";
        if (adx > ady * 1.5) idrag.axis = "h";
        else if (ady > adx * 1.5) idrag.axis = "v";
        else return "";
      }
      if (idrag.axis === "v") {
        if (idrag.fromHandle && !idrag.sawCancel) { beginLift(); return idrag.lifted ? "v" : ""; }
        return "";
      }
      armH();
      paintH(dx);
      return "h";
    }
    function rowFrom(target) {
      if (!target || !target.closest) return null;
      return target.closest(".irow[data-id], .lrow[data-cat]");
    }
    function track(e, li, fromHandle) {
      reset();
      var kind = li.classList.contains("lrow") ? "list" : "item";
      idrag = {
        li: li,
        id: kind === "list" ? li.getAttribute("data-cat") : li.getAttribute("data-id"),
        kind: kind,
        x: e.clientX,
        y: e.clientY,
        pid: e.pointerId,
        type: e.pointerType,
        lifted: false,
        axis: "",
        fromHandle: !!fromHandle,
        fromText: e.pointerType === "mouse" && !!(e.target.closest && e.target.closest(".txt, .note, .lname, input, textarea")),
        cap: e.target && e.target.setPointerCapture ? e.target : li,
        _dx: 0,
        _dy: 0
      };
      dragging = true;
    }
    function endSwipe(d, sdx) {
      if (!d || d.handled) return;
      d.handled = true;
      noClick = true;
      setTimeout(function () { noClick = false; }, 400);
      var w = (d.li && d.li.offsetWidth) || 1, kind = d.kind, sid = d.id;
      reset();
      if (Math.abs(sdx) < w * SWIPE) return;
      if (kind === "list") {
        if (sdx > 0) {
          delListWithUndo(sid);
          if (navigator.vibrate) try { navigator.vibrate(10); } catch (e3) {}
        } else if (!moveMode) { openOpt = null; moveMode = true; render(); }
        return;
      }
      var x = items[sid];
      if (sdx > 0 && x && !x.deleted) {
        delWithUndo(sid);
        if (navigator.vibrate) try { navigator.vibrate(10); } catch (e4) {}
      } else if (sdx < 0 && x && !x.deleted) moveMenu(sid);
    }
    function endLift(d) {
      if (!d || d.handled) return;
      d.handled = true;
      noClick = true;
      setTimeout(function () { noClick = false; }, 400);
      var r = d.sorter ? d.sorter.end() : { moved: false, order: [] };
      var kind = d.kind, sec = current;
      d.sorter = null;
      reset();
      if (!r.moved) return;
      var ids = r.order.map(function (li) { return li.getAttribute(kind === "list" ? "data-cat" : "data-id"); });
      if (kind === "list") setListOrder(ids);
      else applySubsetOrder(sec, ids);
    }
    document.addEventListener("pointerdown", function (e) {
      if (e.target.closest && e.target.closest(".notetog")) {
        noteGuard = { x: e.clientX, y: e.clientY, pid: e.pointerId, moved: false };
        return;
      }
      var li = rowFrom(e.target);
      if (!li || li.querySelector(".ed") || (li.classList.contains("irow") && editing)) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (e.target.closest && e.target.closest(".sheet, #bg-sheet, #toast")) return;
      var h = e.target.closest && e.target.closest(".ihandle, .lhandle");
      if (h) { e.preventDefault(); track(e, li, true); return; }
      track(e, li, false);
    });
    document.addEventListener("pointermove", function (e) {
      if (noteGuard && e.pointerId === noteGuard.pid) {
        if (Math.abs(e.clientX - noteGuard.x) + Math.abs(e.clientY - noteGuard.y) > 8) noteGuard.moved = true;
      }
      if (!idrag || e.pointerId !== idrag.pid) return;
      if (idrag.sawCancel && !idrag.swipe && !idrag.lifted) return;
      if (idrag.lifted) { e.preventDefault(); if (idrag.sorter) idrag.sorter.move(e.clientY); return; }
      var act = follow(e.clientX - idrag.x, e.clientY - idrag.y);
      if (idrag && idrag.lifted) { e.preventDefault(); if (idrag.sorter) idrag.sorter.move(e.clientY); return; }
      if (act === "h" || act === "v") e.preventDefault();
    });
    function up(e) {
      if (noteGuard && e.pointerId === noteGuard.pid) {
        if (noteGuard.moved) { noClick = true; setTimeout(function () { noClick = false; }, 400); }
        noteGuard = null;
      }
      if (!idrag || e.pointerId !== idrag.pid || idrag.handled) return;
      var d = idrag;
      if (d.type === "touch" && e.type === "pointercancel") {
        d.sawCancel = true;
        if (!d.swipe && !d.lifted) d.axis = "v";
        return;
      }
      if (d.swipe || d.axis === "h") {
        var sdx = (e.type === "pointerup" && typeof e.clientX === "number") ? e.clientX - d.x : (d._dx || 0);
        endSwipe(d, sdx);
        return;
      }
      if (d.lifted) { endLift(d); return; }
      var moved = Math.abs(d._dx || 0) + Math.abs(d._dy || 0) > 8;
      var sl = window.getSelection && window.getSelection();
      if (moved || (sl && !sl.isCollapsed && String(sl).trim())) { noClick = true; setTimeout(function () { noClick = false; }, 400); }
      d.handled = true;
      reset();
    }
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
    document.addEventListener("touchend", function (e) {
      if (!idrag || idrag.handled) return;
      var tch = e.changedTouches && e.changedTouches[0]; if (!tch) return;
      var dx = tch.clientX - idrag.x, dy = tch.clientY - idrag.y, d = idrag;
      d._dx = dx; d._dy = dy;
      if (d.type !== "touch" && !d.sawCancel) return;
      if (d.lifted) { if (d.sawCancel) endLift(d); return; }
      if (d.swipe || d.axis === "h") { if (d.sawCancel) endSwipe(d, dx); return; }
      if (Math.abs(dx) + Math.abs(dy) > 8) { noClick = true; setTimeout(function () { noClick = false; }, 400); }
      d.handled = true;
      reset();
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (!idrag || idrag.handled || idrag.sawCancel) return;
      var tch = e.touches && e.touches[0]; if (!tch) return;
      if (idrag.lifted && idrag.sorter) { idrag.sorter.move(tch.clientY); return; }
      follow(tch.clientX - idrag.x, tch.clientY - idrag.y);
      if (idrag && idrag.lifted && idrag.sorter) idrag.sorter.move(tch.clientY);
    }, { passive: true });
    document.addEventListener("selectstart", function (e) {
      if (!idrag || idrag.handled) return;
      if (idrag.swipe || idrag.axis === "h" || idrag.lifted || idrag.fromHandle) e.preventDefault();
    }, true);
    document.addEventListener("dragstart", function (e) {
      if (idrag && e.target.closest && (e.target.closest(".irow") || e.target.closest(".lrow"))) e.preventDefault();
    });
    document.addEventListener("contextmenu", function (e) {
      if (idrag && (idrag.swipe || idrag.lifted) && e.target.closest && e.target.closest(".irow, .lrow")) e.preventDefault();
    });
    document.addEventListener("click", function (e) {
      if (!noClick) return;
      if (e.target.closest && e.target.closest("#toast")) return;
      e.preventDefault();
      e.stopPropagation();
      noClick = false;
    }, true);
  }

  /* ---------- history + backup ---------- */
  function loadHistory() {
    var SS = window.RGSyncStatus;
    history = SS && SS.readHistory ? SS.readHistory(jparse(get(M.histKey(uid || "local")), null)) : [];
  }
  function saveHistory() {
    var SS = window.RGSyncStatus;
    if (!SS) return;
    var packed = SS.packHistory ? SS.packHistory(history) : history;
    if (SS.expandHistory) history = SS.expandHistory(packed);
    var body = SS.historyEnvelope ? SS.historyEnvelope(packed) : packed;
    try { localStorage.setItem(M.histKey(uid || "local"), JSON.stringify(body)); } catch (e) {}
  }
  function rememberSnap(force) {
    var SS = window.RGSyncStatus;
    if (!SS || !SS.pushHistory) return;
    var n = history.length, id = n ? history[n - 1].id : "";
    history = SS.pushHistory(history, items, Date.now(), !!force);
    if (history.length === n && (!history.length || history[history.length - 1].id === id)) return;
    saveHistory();
    if (uid) pushHistoryCloud();
  }
  function counts(map) {
    var ls = M.lists(map || {}), n = 0;
    ls.forEach(function (c) { n += M.itemsInList(map, c.cat).length; });
    return { l: ls.length, n: n };
  }
  function downloadJson(obj, name) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    if (a.parentNode) a.parentNode.removeChild(a);
    setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 800);
  }
  function downloadBackup() {
    if (!M.liveCount(items)) { toast(t("backupEmpty")); return; }
    var when = Date.now();
    var SS = window.RGSyncStatus;
    var stamp = SS ? SS.formatSyncTime(when).replace(/[^\d]/g, "") : String(when);
    downloadJson({ app: M.APP, v: 1, t: when, items: items }, "balancify-" + stamp + ".json");
  }
  function restoreVersion(id) {
    var SS = window.RGSyncStatus;
    if (!SS || !SS.planRestore) { toast(t("historyFail")); return; }
    var plan = SS.planRestore(history, items, id, Date.now());
    if (!plan.found || !plan.items) { toast(t("historyFail")); return; }
    history = plan.history;
    saveHistory();
    var before = items;
    items = SS.adoptRestore ? SS.adoptRestore(plan.items, {}, Date.now(), before) : plan.items;
    pending = true;
    overwriteOk = Date.now() + (SS.BULK_MS || 60000);
    holdBlocked = false;
    blockedCloud = null;
    writeStore();
    closeSheet();
    render();
    sync();
  }
  function openHistory() {
    var SS = window.RGSyncStatus;
    if (!SS) return;
    var rows = history.slice().sort(function (a, b) { return b.t - a.t; });
    var html = '<div class="ehead"><h3>' + esc(t("history")) + '</h3><button type="button" class="btn" data-s="x">' + esc(t("historyBack")) + "</button></div>";
    if (!rows.length) html += '<p class="cf-body">' + esc(t("historyEmpty")) + "</p>";
    rows.forEach(function (s) {
      var c = s.data ? counts(s.data) : { l: s.lists || 0, n: s.items || 0 };
      html += '<div class="hrow"><div class="histwhen">' + esc(SS.formatSyncTime(s.t)) + '</div><p class="histmeta">' + esc(t("historyCounts").replace("{l}", c.l).replace("{n}", c.n)) + '</p><div class="row"><button type="button" class="btn pri" data-s="r:' + esc(s.id) + '">' + esc(t("historyRestore")) + '</button><button type="button" class="btn" data-s="d:' + esc(s.id) + '">' + esc(t("historyDownload")) + "</button></div></div>";
    });
    sheet(html, function (a) {
      if (a === "x") { closeSheet(); return; }
      if (a.indexOf("d:") === 0) {
        var snap = null, i;
        for (i = 0; i < history.length; i++) if (history[i].id === a.slice(2)) snap = history[i];
        if (snap) downloadJson(SS.historyFile ? SS.historyFile(snap) : snap, "balancify-version.json");
        return;
      }
      if (a.indexOf("r:") === 0) restoreVersion(a.slice(2));
    });
  }
  function pushHistoryCloud() {
    var A = window.RGAccount, SS = window.RGSyncStatus;
    if (!uid || !A || !SS || !SS.cloudHistoryPayload) return;
    A.get(M.APP, M.HIST_CLOUD).then(function (cloud) {
      if (!uid) return;
      if (cloud && cloud.fmt != null && cloud.fmt !== SS.HIST_FMT) return;
      history = SS.mergeHistory(history, cloud, SS.HIST_MAX).snaps;
      saveHistory();
      return A.set(M.APP, M.HIST_CLOUD, SS.cloudHistoryPayload(history));
    }).catch(function () {});
  }
  function pullHistory() {
    var A = window.RGAccount, SS = window.RGSyncStatus;
    if (!uid || !A || !SS || !SS.mergeHistory) return;
    A.get(M.APP, M.HIST_CLOUD).then(function (cloud) {
      if (!uid || !cloud) return;
      history = SS.mergeHistory(history, cloud, SS.HIST_MAX).snaps;
      saveHistory();
    }).catch(function () {});
  }

  /* ---------- sync ---------- */
  function statusFlags() {
    return { maySync: !!uid, blocked: holdBlocked, bulkUntil: overwriteOk, err: syncErr, onLine: typeof navigator === "undefined" || navigator.onLine !== false, failN: failN, pending: pending, busy: busy, offline: offline, uploadCut: uploadCut };
  }
  function paintStatusWord(s, text) {
    while (s.firstChild) s.removeChild(s.firstChild);
    var span = document.createElement("span");
    span.className = "status-txt";
    span.textContent = text || "";
    s.appendChild(span);
  }
  function paintSynced(s) {
    while (s.firstChild) s.removeChild(s.firstChild);
    var mark = document.createElement("span");
    mark.className = "syncmark";
    mark.setAttribute("aria-hidden", "true");
    mark.textContent = "✓";
    var span = document.createElement("span");
    span.className = "status-txt";
    span.textContent = t("synced");
    s.appendChild(mark);
    s.appendChild(span);
  }
  function paintBuild() {
    var el = $("build");
    var name = typeof RG_SBX_BALANCIFY_CACHE === "string" ? RG_SBX_BALANCIFY_CACHE : "";
    if (el) el.textContent = M.versionLabel(name);
  }
  function paintLastSync() {
    var el = $("lastsync"), cl = $("cloudat"), SS = window.RGSyncStatus;
    paintBuild();
    if (!uid || !SS) { if (el) el.textContent = ""; if (cl) cl.textContent = ""; return; }
    var ms = parseInt(get(M.lastKey(uid)) || "", 10);
    if (el) el.textContent = ms ? t("lastSync").replace("{t}", SS.formatSyncTime(ms)) : "";
    var cms = SS.cloudUpdatedAt ? Date.parse(SS.cloudUpdatedAt) : NaN;
    if (cl) cl.textContent = cms ? t("cloudAt").replace("{t}", SS.formatSyncTime(cms)) : "";
  }
  function setStatus() {
    paintLastSync();
    var s = $("status"), SS = window.RGSyncStatus;
    if (!s) return;
    var flags = statusFlags();
    var k = SS ? SS.kind(flags) : (!uid ? "localOnly" : "synced");
    var show = (k === "saving" && pending && !busy) ? "waiting" : k;
    if (show === "synced") { s.className = "status ok"; paintSynced(s); }
    else if (show === "saving") { s.className = "status save"; paintStatusWord(s, t("saving")); }
    else if (show === "waiting") { s.className = "status wait"; paintStatusWord(s, t("waiting")); }
    else if (show === "localOnly") { s.className = "status local"; paintStatusWord(s, t("localOnly")); }
    else if (SS) SS.fillStatus(s, k, t(k) || "");
    else { s.className = "status"; paintStatusWord(s, t(k) || ""); }
    if (k === "blocked" || holdBlocked) { if (SS) SS.ensureDeletion({ onYes: restoreBlocked, onNo: confirmBlocked }); }
    else if (SS) SS.closeDeletion();
  }
  function confirmBlocked() {
    var SS = window.RGSyncStatus;
    if (SS) SS.closeDeletion();
    overwriteOk = Date.now() + ((SS && SS.BULK_MS) || 60000);
    holdBlocked = false;
    syncErr = "";
    offline = false;
    sync();
  }
  function restoreBlocked() {
    var SS = window.RGSyncStatus;
    if (SS) SS.closeDeletion();
    if (SS && blockedCloud) items = SS.restoreLive(items, blockedCloud);
    holdBlocked = false;
    blockedCloud = null;
    pending = true;
    writeStore();
    render();
    sync();
  }
  function syncSoon() { clearTimeout(soonT); soonT = setTimeout(sync, 300); }
  function armBackoff(n) {
    var SS = window.RGSyncStatus;
    var ms = SS ? SS.backoffMs(n) : 2000;
    nextTry = Date.now() + ms;
    clearTimeout(retryT);
    retryT = setTimeout(function () { nextTry = 0; if (uid) sync(); }, ms);
  }
  function sync() {
    var A = window.RGAccount, SS = window.RGSyncStatus;
    if (!uid || !A) return Promise.resolve();
    if (nextTry && Date.now() < nextTry) return Promise.resolve();
    if (busy) { again = true; return Promise.resolve(); }
    busy = true;
    setStatus();
    var who = uid, phase = "read", sent = null, blocked = false;
    return A.get(M.APP, M.KEY).then(function (cloud) {
      if (who !== uid) return;
      if (SS && SS.assertVisible) SS.assertVisible(items, now());
      var plan = M.planSync(items, cloud, SS && SS.mergeRecords);
      items = plan.items;
      var cl = (cloud && cloud.items) || {};
      var report = SS ? SS.dropReport(items, cl) : null;
      var cloudAt = SS && SS.cloudUpdatedAt ? (Date.parse(SS.cloudUpdatedAt) || 0) : 0;
      var lastOk = parseInt(get(M.lastKey(who)) || "", 10) || 0;
      var decision = SS && report ? SS.needsConfirm(report, { now: Date.now(), lastSync: lastOk, cloudUpdated: cloudAt, overwriteUntil: overwriteOk, differs: plan.upload }) : { hold: false };
      if (plan.upload && decision.hold) {
        blocked = true; holdBlocked = true; pending = true; phase = "held"; blockedCloud = cl;
        writeStore(); render(); return;
      }
      if (!plan.upload) { phase = "same"; holdBlocked = false; return; }
      holdBlocked = false;
      if (SS) SS.closeDeletion();
      sent = items;
      phase = "upload";
      pending = true;
      writeStore();
      return A.set(M.APP, M.KEY, { v: 1, seeded: true, app: M.APP, items: items });
    }).then(function () {
      if (who !== uid) return;
      var info = SS ? SS.applySuccess(null, { blocked: blocked, sentSame: !sent || sent === items }) : { holdBlocked: blocked, clearPending: !blocked };
      offline = false; syncErr = ""; failN = 0; uploadCut = blocked ? uploadCut : false; holdBlocked = !!info.holdBlocked;
      if (blocked) return;
      if (info.clearPending !== false) { pending = false; writeStore(); }
      if (SS && SS.shouldStampSync({ downloaded: true, uploaded: phase === "upload", nothingToUpload: phase === "same", blocked: false, failed: false, pendingLeft: !!pending })) {
        set(M.lastKey(who), String(Date.now()));
      }
      pullHistory();
    }, function (e) {
      if (who !== uid) return;
      if (e && (e.code === "signed_out" || e.type === "signed_out")) { offline = false; syncErr = ""; return; }
      var onLine = typeof navigator === "undefined" || navigator.onLine !== false;
      var next = SS ? SS.applyFailure({ failN: failN }, e, onLine) : { offline: true, syncErr: "", failN: failN + 1 };
      offline = next.offline; syncErr = next.syncErr; failN = next.failN;
      if (SS && SS.classifyError(e) === "timeout" && phase === "upload") { uploadCut = true; armBackoff(failN); }
    }).then(function () {
      busy = false;
      setStatus();
      if (again && who === uid) { again = false; sync(); }
    });
  }

  function onUser(u) {
    var id = u && u.id ? u.id : null;
    if (id === uid) return;
    if (uid !== undefined) writeStore();
    uid = id;
    editing = null;
    offline = false; syncErr = ""; failN = 0; holdBlocked = false; blockedCloud = null; uploadCut = false; nextTry = 0;
    if (uid) loadCache(uid);
    else loadDoc();
    loadHistory();
    render();
    if (uid) sync();
  }

  /* ---------- chrome ---------- */
  function applyTheme() {
    document.documentElement.setAttribute("data-theme", theme);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", theme === "light" ? "#f4efe9" : "#0d2a6b");
    var b = $("theme-btn");
    if (b) {
      b.querySelector(".ti").innerHTML = theme === "light" ? MOON : SUN;
      b.querySelector(".tl").textContent = theme === "light" ? t("dark") : t("light");
      b.setAttribute("aria-label", theme === "light" ? t("toDark") : t("toLight"));
    }
  }
  function applyBg() { document.documentElement.style.setProperty("--bgimg", 'url("bg/' + bg + '.webp")'); }
  function renderBg() {
    var grid = $("bg-grid"); if (!grid) return;
    grid.innerHTML = "";
    D.backgrounds.forEach(function (b) {
      var o = document.createElement("button");
      o.type = "button"; o.className = "bgopt"; o.setAttribute("aria-pressed", b.id === bg ? "true" : "false");
      o.innerHTML = '<img src="bg/' + esc(b.id) + '-t.webp" alt="" loading="lazy"><span>' + esc(b[lang] || b.he) + "</span>";
      o.onclick = function () { bg = b.id; set(BG_KEY, bg); applyBg(); renderBg(); };
      grid.appendChild(o);
    });
  }
  function paintChrome() {
    var he = lang !== "en";
    document.documentElement.lang = he ? "he" : "en";
    document.documentElement.dir = he ? "rtl" : "ltr";
    document.title = he ? "איזוניפיי" : "Balancify";
    if ($("title")) $("title").textContent = (D.APP_NAME && (D.APP_NAME[lang] || D.APP_NAME.he)) || "";
    if ($("tagline")) $("tagline").textContent = (D.subtitle && (D.subtitle[lang] || D.subtitle.he)) || "";
    if ($("home-btn")) $("home-btn").textContent = t("home");
    if ($("bg-btn")) $("bg-btn").textContent = t("bg");
    if ($("bg-title")) $("bg-title").textContent = t("bgTitle");
    if ($("bg-close")) $("bg-close").setAttribute("aria-label", t("close"));
    if ($("add-text")) { $("add-text").placeholder = t("phTitle"); $("add-text").setAttribute("aria-label", t("phTitle")); }
    if ($("add-note")) { $("add-note").placeholder = t("phNote"); $("add-note").setAttribute("aria-label", t("phNote")); }
    if ($("add-btn")) $("add-btn").textContent = t("add");
    if ($("hist-btn")) $("hist-btn").textContent = t("history");
    if ($("backup-link")) $("backup-link").textContent = t("backupLink");
    if ($("lang-he")) $("lang-he").setAttribute("aria-pressed", he ? "true" : "false");
    if ($("lang-en")) $("lang-en").setAttribute("aria-pressed", he ? "false" : "true");
    applyTheme();
    renderBg();
  }
  function route() {
    var id = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    var known = M.lists(items).some(function (c) { return c.cat === id; });
    var next = known ? id : "";
    if (next !== current) { editing = null; openOpt = null; }
    current = next;
    render();
  }
  function boot() {
    loadDoc();
    loadHistory();
    paintChrome();
    route();
    bootGestures();
    if ($("lang-he")) $("lang-he").onclick = function () { lang = "he"; set(LANG_KEY, "he"); paintChrome(); render(); };
    if ($("lang-en")) $("lang-en").onclick = function () { lang = "en"; set(LANG_KEY, "en"); paintChrome(); render(); };
    if ($("theme-btn")) $("theme-btn").onclick = function () { theme = theme === "light" ? "dark" : "light"; set(THEME_KEY, theme); applyTheme(); };
    if ($("bg-btn")) $("bg-btn").onclick = function () { $("bg-sheet").hidden = false; };
    if ($("bg-close")) $("bg-close").onclick = function () { $("bg-sheet").hidden = true; };
    if ($("bg-sheet")) $("bg-sheet").onclick = function (e) { if (e.target === this) this.hidden = true; };
    if ($("home-btn")) $("home-btn").onclick = function () { location.hash = ""; };
    if ($("add-list")) $("add-list").onclick = function () { nameSheet(t("addList"), "", true, function (v) { var id = addList(v); if (id) location.hash = "#" + id; }); };
    if ($("move-done")) $("move-done").onclick = function () { moveMode = false; render(); syncSoon(); };
    if ($("notes-all")) $("notes-all").onclick = function () { toggleAllNotes(); };
    if ($("hist-btn")) $("hist-btn").onclick = function () { openHistory(); };
    if ($("backup-link")) $("backup-link").onclick = function () { downloadBackup(); };
    var form = $("add-form");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      addItem($("add-text").value, $("add-note").value);
      form.reset();
      if ($("add-text")) $("add-text").style.height = "";
    });
    if ($("add-note")) $("add-note").addEventListener("input", function () { paintNoteMax($("add-note")); });
    document.addEventListener("input", function (e) {
      if (!e.target.classList) return;
      if (e.target.classList.contains("e-note") || e.target.classList.contains("notein")) paintNoteMax(e.target);
      if (e.target.classList.contains("grow")) { if (/[\r\n]/.test(e.target.value)) e.target.value = e.target.value.replace(/[\r\n]+/g, " "); grow(e.target); }
    });
    document.addEventListener("click", function (e) {
      var open = e.target.closest && e.target.closest("[data-open]");
      if (open && !moveMode) { location.hash = "#" + open.getAttribute("data-open"); return; }
      var opt = e.target.closest && e.target.closest("[data-opt]");
      if (opt) { var cid = opt.getAttribute("data-opt"); openOpt = openOpt === cid ? null : cid; render(); return; }
      var act = e.target.closest && e.target.closest("[data-act]");
      if (act) {
        var p = act.getAttribute("data-act"), id = p.slice(p.indexOf(":") + 1);
        if (p.indexOf("move:") === 0) { openOpt = null; moveMode = true; render(); return; }
        if (p.indexOf("ren:") === 0) { openOpt = null; var c = catRec(id); nameSheet(t("renameTitle"), c ? M.nameOf(c, lang) : "", false, function (v) { renameList(id, v); }); return; }
        if (p.indexOf("del:") === 0) { deleteList(id); return; }
        if (p.indexOf("up:") === 0 || p.indexOf("down:") === 0) {
          var ids = M.lists(items).map(function (c) { return c.cat; }), i = ids.indexOf(id), j = p.indexOf("up:") === 0 ? i - 1 : i + 1;
          if (i < 0 || j < 0 || j >= ids.length) return;
          ids.splice(j, 0, ids.splice(i, 1)[0]);
          setListOrder(ids);
          return;
        }
      }
      var b = e.target.closest && e.target.closest("[data-a]");
      if (!b) return;
      if (e.target.closest("a")) return;
      var a = b.getAttribute("data-a");
      var li = b.closest("[data-id]");
      var iid = li && li.getAttribute("data-id");
      if (!iid || !items[iid]) return;
      if (a === "note") { toggleItemNote(iid); return; }
      if (a === "ck") { cycleMark(iid); return; }
      if (a === "edit") { editing = iid; render(); return; }
      if (a === "save") { saveEdit(iid); return; }
      if (a === "cancel") { editing = null; render(); return; }
      if (a === "del") { delWithUndo(iid); return; }
      if (a === "move") { moveMenu(iid); return; }
    });
    document.addEventListener("keydown", function (e) {
      var ed = e.target.closest && e.target.closest("[data-ed]");
      if (!ed) return;
      if (e.key === "Escape") { editing = null; render(); }
      else if (e.key === "Enter" && !e.shiftKey && e.target.classList.contains("e-text")) { e.preventDefault(); saveEdit(ed.getAttribute("data-ed")); }
    });
    window.addEventListener("hashchange", function () { closeSheet(); route(); });
    window.addEventListener("online", function () { if (uid) sync(); });
    if (window.RGSyncStatus && RGSyncStatus.watchCloudUpdated) RGSyncStatus.watchCloudUpdated(function () { paintLastSync(); });
    clearInterval(pollT);
    pollT = setInterval(function () { if (uid && !busy) sync(); }, 10000);
    function armAccount() {
      var A = window.RGAccount;
      if (!A || armAccount.done) return;
      armAccount.done = true;
      A.onChange(onUser);
      A.ready.then(function () { onUser(A.user()); });
      onUser(A.user());
    }
    if (window.RGAccount) armAccount();
    else window.addEventListener("rg-account-ready", armAccount);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
