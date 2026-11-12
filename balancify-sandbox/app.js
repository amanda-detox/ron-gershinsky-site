/* Balancify sandbox (balancify-sandbox/). Not linked from the homepage.
   Same app as balancify/, with its own storage keys (rg-sbx-balancify-*) so it never
   reads or writes the live app's lists, order, checks, theme or background.
   rg-lang stays the site language key, same as the other sandboxes.
   Content lives in data.js.
   Every list: add items, edit the title and the note, reorder, swipe right = delete (undo), swipe left = move.
   The mark is stored on the synced user record (marks[id] = "ok" | "no"); tapping the same mark again clears it.
   Directions are physical: clientX right = delete, clientX left = move to another list.
   A vertical drag on the row scrolls the page. A drag on ☰ reorders. */
(function () {
  "use strict";
  var LANG_KEY = "rg-lang", THEME_KEY = "rg-sbx-balancify-theme", BG_KEY = "rg-sbx-balancify-bg", CHK_PREFIX = "rg-sbx-balancify-checked-";
  var USER_KEY = "rg-sbx-balancify-user", ORD_KEY = "rg-sbx-balancify-order";
  var D = window.BAL_DATA;
  var L = {
    he: {
      back: "→ לאתר", home: "→ חזרה לבחירה", bg: "🖼️ רקע", bgTitle: "בחירת רקע",
      clear: "ניקוי הבחירה", soon: "יצורף בקרוב", noInfo: "ההסבר יצורף בקרוב",
      count: function (n, total) { return n ? "נבחרו " + n + " מתוך " + total : "עדיין לא נבחר דבר"; },
      items: function (n) { return n ? n + " אפשרויות" : "יצורף בקרוב"; },
      dark: "לילה", light: "יום", toLight: "מעבר למצב יום", toDark: "מעבר למצב לילה",
      install: "📲 הוספה למסך הבית",
      ios: "באייפון או באייפד: לוחצים על כפתור השיתוף (□↑) בתחתית ספארי, ואז על \"הוספה למסך הבית\".",
      other: "פותחים את תפריט הדפדפן (⋮) ובוחרים \"התקנת אפליקציה\" או \"הוספה למסך הבית\".",
      crisis: "אם יש מצוקה עכשיו, ער״ן זמינים כל השעה: חייגו 1201, או וואטסאפ 052-8451201.",
      close: "סגירה"
    },
    en: {
      back: "← Back to site", home: "← Back to choices", bg: "🖼️ Background", bgTitle: "Choose a background",
      clear: "Clear selection", soon: "Coming soon", noInfo: "Explanation coming soon",
      count: function (n, total) { return n ? n + " of " + total + " selected" : "Nothing selected yet"; },
      items: function (n) { return n ? n + " options" : "Coming soon"; },
      dark: "Night", light: "Day", toLight: "Switch to day mode", toDark: "Switch to night mode",
      install: "📲 Add to home screen",
      ios: "On iPhone or iPad: tap the Share button (□↑) at the bottom of Safari, then choose “Add to Home Screen”.",
      other: "Open your browser menu (⋮) and choose “Install app” or “Add to Home screen”.",
      crisis: "If there is distress right now, in Israel ERAN is there around the clock: call 1201, or WhatsApp 052-8451201. Elsewhere, contact local emergency services.",
      close: "Close"
    }
  };
  var P = {
    he: {
      add: "הוספת פריט…", addBtn: "הוספה", del: "נמחק", undo: "ביטול", moved: "הועבר אל ",
      moveTo: "להעביר לאיזו רשימה?", cancel: "ביטול",
      hint: "החלק ימינה למחיקה ושמאלה להעברה. גרור את ☰ לשינוי הסדר.",
      drag: "גרור לשינוי הסדר", empty: "הרשימה ריקה. אפשר להוסיף פריט בשדה למעלה.",
      itemEdit: "עריכת פריט", titlePh: "כותרת פריט", notePh: "הערה אישית…",
      noteSave: "שמירה", noteClear: "מחיקת ההערה",
      restore: "שחזור ברירת מחדל", restoreTitle: "לשחזר את הרשימה המקורית?",
      restoreBody: "פריטים שהוספת, שינויי כותרת, הערות, מחיקות ושינויי סדר ברשימה הזו יימחקו. פריטים שהועברו יחזרו למקומם.",
      restoreAll: "שחזור כל הרשימות", restoreAllTitle: "לשחזר את כל ברירות המחדל?",
      restoreAllBody: "כל הפריטים, הכותרות, ההערות והסדר ששינית בבאלאנסיפיי יחזרו למצב המקורי.",
      restoreYes: "שחזור", restored: "הרשימה שוחזרה", restoredAll: "כל הרשימות שוחזרו"
    },
    en: {
      add: "Add an item…", addBtn: "Add", del: "Deleted", undo: "Undo", moved: "Moved to ",
      moveTo: "Move to which list?", cancel: "Cancel",
      hint: "Swipe right to delete, swipe left to move. Drag ☰ to reorder.",
      drag: "Drag to reorder", empty: "The list is empty. Add an item in the field above.",
      itemEdit: "Edit item", titlePh: "Item title", notePh: "A personal note…",
      noteSave: "Save", noteClear: "Delete note",
      restore: "Restore defaults", restoreTitle: "Restore this list?",
      restoreBody: "Items you added, title edits, notes, deletions and the order in this list will be cleared. Moved items go back where they belong.",
      restoreAll: "Restore all lists", restoreAllTitle: "Restore every list?",
      restoreAllBody: "Every item, title, note and order you changed in Balancify will return to the original.",
      restoreYes: "Restore", restored: "List restored", restoredAll: "All lists restored"
    }
  };
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  var TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/><path d="M10 11v6M14 11v6"/></svg>';
  var MOVE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"/><path d="M15 12H4"/><path d="M8 8l-4 4 4 4"/></svg>';
  var PEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></svg>';

  function $(id) { return document.getElementById(id); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var lang = get(LANG_KEY) === "en" ? "en" : "he";
  var theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  var bg = get(BG_KEY) || D.defaultBg;
  if (!D.backgrounds.some(function (b) { return b.id === bg; })) bg = D.defaultBg;
  var current = null;
  var openInfo = null;
  var noteItem = null;
  var confirmAction = null;
  var toastT = null;
  var swallow = false;

  function t() { return L[lang]; }
  function p() { return P[lang]; }
  function nm(o) { return (o && (o[lang] || o.he || o.en)) || ""; }
  function rawList(id) { for (var i = 0; i < D.lists.length; i++) if (D.lists[i].id === id) return D.lists[i]; return null; }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function builtinKey(listId, i) { return "b:" + listId + ":" + i; }
  function cloneNote(n) {
    if (!n) return { he: "", en: "" };
    if (typeof n === "string") return { he: n, en: "" };
    return { he: n.he || "", en: n.en || "" };
  }
  function noteText(n) {
    if (!n) return "";
    if (typeof n === "string") return n.trim();
    return String(n[lang] || n.he || n.en || "").trim();
  }

  function emptyUser() { return { v: 2, notes: {}, titles: {}, custom: {}, hidden: {}, loc: {}, order: {}, marks: {} }; }
  function normalize(u) {
    if (!u || typeof u !== "object") u = emptyUser();
    if (!u.notes || typeof u.notes !== "object") u.notes = {};
    if (!u.titles || typeof u.titles !== "object" || Array.isArray(u.titles)) u.titles = {};
    if (!u.custom || typeof u.custom !== "object") u.custom = {};
    if (!u.hidden || typeof u.hidden !== "object") u.hidden = {};
    if (!u.loc || typeof u.loc !== "object") u.loc = {};
    if (!u.order || typeof u.order !== "object") u.order = {};
    if (!u.marks || typeof u.marks !== "object" || Array.isArray(u.marks)) u.marks = {};
    u.v = 2;
    return u;
  }
  function readRaw() {
    try { var o = JSON.parse(get(USER_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; }
  }

  var CATALOG = null;
  function catalog() {
    if (CATALOG) return CATALOG;
    var out = [];
    D.lists.forEach(function (list) {
      var flat = [];
      if (list.sections) {
        list.sections.forEach(function (sec, si) {
          (sec.items || []).forEach(function (it, ii) { flat.push({ it: it, section: si, seq: si * 1000 + ii }); });
        });
      } else {
        (list.items || []).forEach(function (it, i) { flat.push({ it: it, section: null, seq: i }); });
      }
      flat.forEach(function (row, i) {
        out.push({
          id: builtinKey(list.id, i), origin: list.id, section: row.section, seq: row.seq,
          he: row.it.he || "", en: row.it.en || "", detail: row.it.detail || null,
          info: row.it.info || null, links: row.it.links || null, group: row.it.group || null,
          defaultNote: cloneNote(row.it.note)
        });
      });
    });
    CATALOG = out;
    return out;
  }
  function builtinById(id) {
    var all = catalog();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }
  function builtinsOf(listId) { return catalog().filter(function (b) { return b.origin === listId; }); }

  function migrate(raw) {
    var u = emptyUser();
    var powerDefaults = builtinsOf("power");
    var used = {};
    if (Array.isArray(raw.power)) {
      var order = [];
      raw.power.forEach(function (it, n) {
        if (!it || !it.he) return;
        var m = /^d(\d+)$/.exec(String(it.id || ""));
        var def = null;
        if (m) {
          var idx = +m[1];
          if (powerDefaults[idx] && !used[powerDefaults[idx].id] && powerDefaults[idx].he === it.he) def = powerDefaults[idx];
        }
        if (!def) {
          for (var i = 0; i < powerDefaults.length; i++) {
            var d = powerDefaults[i];
            if (!used[d.id] && d.he === it.he && (d.defaultNote.he || "") === (it.note || "")) { def = d; break; }
          }
        }
        if (!def) {
          for (var j = 0; j < powerDefaults.length; j++) {
            if (!used[powerDefaults[j].id] && powerDefaults[j].he === it.he) { def = powerDefaults[j]; break; }
          }
        }
        if (def) {
          used[def.id] = 1;
          order.push(def.id);
          if ((it.note || "") !== (def.defaultNote.he || "")) u.notes[def.id] = { he: it.note || "", en: "" };
        } else {
          var cid = it.id && !/^d\d+$/.test(String(it.id)) ? String(it.id) : ("p" + n);
          var id = "u:" + cid;
          u.custom[id] = { id: id, list: "power", born: "power", he: it.he, en: it.he, note: { he: it.note || "", en: "" }, seq: 800000 + n };
          order.push(id);
        }
      });
      powerDefaults.forEach(function (d) { if (!used[d.id]) u.hidden[d.id] = 1; });
      u.order.power = order;
    }
    var ex = raw.extra || {};
    Object.keys(ex).forEach(function (listId) {
      if (!rawList(listId)) return;
      (ex[listId] || []).forEach(function (it, n) {
        if (!it || !it.he) return;
        var note = "";
        if (it.detail && typeof it.detail === "object") note = it.detail.he || "";
        else if (typeof it.note === "string") note = it.note;
        var def = null;
        powerDefaults.forEach(function (d) {
          if (def || !u.hidden[d.id]) return;
          if (d.he === it.he && (d.defaultNote.he || "") === note) def = d;
        });
        if (!def) powerDefaults.forEach(function (d) {
          if (def || !u.hidden[d.id]) return;
          if (d.he === it.he) def = d;
        });
        if (def) {
          delete u.hidden[def.id];
          u.loc[def.id] = listId;
          if (note !== (def.defaultNote.he || "")) u.notes[def.id] = { he: note, en: "" };
        } else {
          var id = "u:x:" + listId + ":" + n;
          u.custom[id] = { id: id, list: listId, born: "power", he: it.he, en: it.en || it.he, note: { he: note, en: "" }, seq: 900000 + n };
        }
      });
    });
    var ord = {};
    try { ord = JSON.parse(get(ORD_KEY) || "{}") || {}; } catch (e) { ord = {}; }
    D.lists.forEach(function (list) {
      if (list.id === "power" && Array.isArray(raw.power)) return;
      var arr = ord[list.id];
      if (!Array.isArray(arr) || !arr.length) return;
      var defs = builtinsOf(list.id), seen = {}, ids = [];
      arr.forEach(function (he) {
        for (var i = 0; i < defs.length; i++) {
          if (!seen[defs[i].id] && defs[i].he === he) { seen[defs[i].id] = 1; ids.push(defs[i].id); break; }
        }
      });
      if (ids.length) u.order[list.id] = ids;
    });
    return u;
  }

  function getUser() {
    var raw = readRaw();
    if (raw && raw.v === 2) return normalize(raw);
    return migrate(raw || {});
  }
  function saveUser(u) {
    var o = normalize(u);
    set(USER_KEY, JSON.stringify({ v: 2, notes: o.notes, titles: o.titles, custom: o.custom, hidden: o.hidden, loc: o.loc, order: o.order, marks: o.marks }));
    try { window.dispatchEvent(new StorageEvent("storage", { key: USER_KEY })); } catch (e) {}
  }
  function snap() {
    return {
      user: get(USER_KEY),
      checks: D.lists.map(function (l) { return { id: l.id, v: get(CHK_PREFIX + l.id) }; })
    };
  }
  function unsnap(s) {
    try {
      if (s.user == null) localStorage.removeItem(USER_KEY);
      else localStorage.setItem(USER_KEY, s.user);
    } catch (e) {}
    (s.checks || []).forEach(function (c) {
      var k = CHK_PREFIX + c.id;
      try { if (c.v == null) localStorage.removeItem(k); else localStorage.setItem(k, c.v); } catch (e) {}
    });
  }

  function itemsIn(listId, u) {
    var arr = [];
    catalog().forEach(function (b) {
      if (u.hidden[b.id]) return;
      var dest = u.loc[b.id];
      if (dest && !rawList(dest)) dest = null;
      var where = dest || b.origin;
      if (where !== listId) return;
      var moved = !!dest && dest !== b.origin;
      var ov = u.notes[b.id];
      var tv = u.titles && u.titles[b.id];
      var he = b.he, en = b.en || "";
      if (tv && typeof tv === "object") {
        if (typeof tv.he === "string" && tv.he) he = tv.he;
        if (typeof tv.en === "string" && tv.en) en = tv.en;
      }
      arr.push({
        id: b.id, origin: b.origin, custom: false, list: listId,
        section: moved ? null : b.section, seq: moved ? 500000 + b.seq : b.seq,
        he: he, en: en, detail: b.detail, info: b.info, links: b.links,
        group: moved ? null : b.group, note: ov ? cloneNote(ov) : cloneNote(b.defaultNote)
      });
    });
    Object.keys(u.custom || {}).forEach(function (id) {
      var c = u.custom[id];
      if (!c || c.list !== listId || !c.he) return;
      arr.push({
        id: id, origin: c.born || listId, custom: true, list: listId, section: null,
        seq: c.seq || Date.now(), he: c.he, en: c.en || c.he, detail: null, info: null, links: null,
        group: null, note: cloneNote(c.note)
      });
    });
    return arr;
  }
  function sortGroup(items, ord) {
    return items.slice().sort(function (a, b) {
      var ia = ord.indexOf(a.id), ib = ord.indexOf(b.id);
      if (ia === -1 && ib === -1) return a.seq - b.seq;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }
  function groupsOf(list, u) {
    var items = list.resolved, ord = (u.order && u.order[list.id]) || [];
    var groups;
    if (list.style !== "info") groups = [{ title: null, sec: "all", items: sortGroup(items, ord) }];
    else {
      groups = [];
      (list.sections || []).forEach(function (sec, si) {
        var mem = sortGroup(items.filter(function (it) { return it.section === si; }), ord);
        if (mem.length) groups.push({ title: sec.title, sec: String(si), items: mem });
      });
      var extra = sortGroup(items.filter(function (it) { return it.section == null; }), ord);
      if (extra.length) {
        var anyCustom = extra.some(function (it) { return it.custom; });
        var anyMoved = extra.some(function (it) { return !it.custom; });
        var title = anyCustom && anyMoved ? { he: "הוספתי והועברו", en: "Added and moved here" }
          : anyCustom ? { he: "הוספתי", en: "Added by me" }
          : { he: "הועברו לכאן", en: "Moved here" };
        groups.push({ title: title, sec: "x", items: extra });
      }
    }
    var chosen = [];
    groups.forEach(function (g) {
      var stay = [];
      g.items.forEach(function (it) { if (markOf(u, it.id) === "ok") chosen.push(it); else stay.push(it); });
      g.items = stay;
    });
    groups = groups.filter(function (g) { return g.items.length; });
    if (chosen.length) groups.unshift({ title: { he: "נבחרים", en: "Chosen" }, sec: "chosen", items: chosen });
    return groups;
  }
  function findList(id) {
    var l = rawList(id);
    if (!l) return null;
    var u = getUser();
    return Object.assign({}, l, { resolved: itemsIn(id, u) });
  }
  function itemById(id) {
    if (!current) return null;
    var items = itemsIn(current, getUser());
    for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
    return null;
  }

  function markOf(u, id) { var m = u && u.marks && u.marks[id]; return m === "ok" || m === "no" ? m : ""; }
  function toggleMark(id, dir) {
    if (dir !== "ok" && dir !== "no") return;
    var u = getUser();
    if (u.marks[id] === dir) delete u.marks[id]; else u.marks[id] = dir;
    saveUser(u);
    refresh();
  }
  function getChecked(id) { try { var a = JSON.parse(get(CHK_PREFIX + id) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function setChecked(id, arr) { set(CHK_PREFIX + id, JSON.stringify(arr)); }
  function countChecked(list) {
    var c = getChecked(list.id);
    return (list.resolved || []).filter(function (it) { return c.indexOf(it.he) !== -1; }).length;
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", theme);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", theme === "light" ? "#f4efe9" : "#1b1f4a");
    var b = $("theme-btn");
    b.querySelector(".ti").innerHTML = theme === "light" ? MOON : SUN;
    b.querySelector(".tl").textContent = theme === "light" ? t().dark : t().light;
    b.setAttribute("aria-label", theme === "light" ? t().toDark : t().toLight);
  }
  function applyBg() { document.documentElement.style.setProperty("--bgimg", 'url("bg/' + bg + '.webp")'); }

  function renderHome() {
    var box = $("choices"); box.innerHTML = "";
    D.lists.forEach(function (raw, i) {
      var list = findList(raw.id);
      var b = document.createElement("button");
      b.type = "button"; b.className = "choice" + (i === 0 ? " first" : "");
      var n = countChecked(list), total = list.resolved.length;
      var meta = total ? t().items(total) + (n ? " · " + t().count(n, total) : "") : t().soon;
      b.innerHTML = '<span class="ic" aria-hidden="true">' + esc(list.icon || "•") + '</span><span class="tx">' + esc(nm(list.title)) + '<span class="meta">' + esc(meta) + '</span></span><span class="ar" aria-hidden="true">›</span>';
      b.onclick = function () { location.hash = "#" + list.id; };
      box.appendChild(b);
    });
    $("restore-all").textContent = p().restoreAll;
  }

  function renderCount(list) {
    var n = countChecked(list), total = (list.resolved || []).length;
    $("count").textContent = t().count(n, total);
    $("clear-btn").disabled = !n;
    $("clear-btn").style.opacity = n ? "1" : ".5";
  }

  function renderQuestions(list) {
    var q = list.questions, qb = $("questions");
    if (!q) { qb.hidden = true; qb.innerHTML = ""; return; }
    qb.hidden = false;
    qb.innerHTML = "<h3>" + esc(nm(q.title)) + "</h3><ul>" + q.items.map(function (x) { return "<li>" + esc(nm(x)) + "</li>"; }).join("") + "</ul>";
  }

  function rowEl(list, it, chk, mark) {
    var li = document.createElement("li");
    var title = nm(it);
    var on = list.style !== "power" && chk.indexOf(it.he) !== -1;
    var note = noteText(it.note);
    var open = !!(it.info && openInfo === it.id);
    var pid = "info-" + String(it.id).replace(/[^a-z0-9_-]/gi, "");
    li.className = "drow" + (open ? " open" : "") + (mark ? " mk-" + mark : "");
    li.setAttribute("data-id", it.id);
    var detail = it.detail ? '<span class="d">' + esc(nm(it.detail)) + "</span>" : "";
    var noteHtml = note ? '<span class="d note">' + esc(note) + "</span>" : "";
    var glyph = mark === "no" ? "✕" : mark === "ok" ? "✓" : "";
    var boxCls = "box" + (mark ? " m-" + mark : "");
    var square = list.style === "power"
      ? '<button type="button" class="' + boxCls + ' mkbox" data-mark="1" aria-label="' + esc(title) + '">' + glyph + "</button>"
      : "";
    var body = list.style === "power"
      ? square + '<div class="tw"><span class="t">' + esc(title) + "</span>" + detail + noteHtml + "</div>"
      : '<label class="hit"><input type="checkbox"' + (on ? " checked" : "") + ' aria-label="' + esc(title) + '"><span class="' + boxCls + '">' + (glyph ? '<b class="mg">' + glyph + "</b>" : CHECK) + '</span><span class="tw"><span class="t">' + esc(title) + "</span>" + detail + noteHtml + "</span></label>";
    var infoBtn = it.info ? '<button type="button" class="ibtn" aria-expanded="' + (open ? "true" : "false") + '" aria-controls="' + pid + '">' + (open ? "✕" : "i") + "</button>" : "";
    var links = "";
    if (it.info && open) {
      links = (it.links || []).map(function (l) {
        var href = String(l.href || ""); if (!/^(https?:|tel:)/.test(href)) return "";
        var ext = /^https?:/.test(href);
        return '<a class="ilink" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + esc(nm(l)) + (ext ? " ↗" : "") + "</a>";
      }).join("");
    }
    var panel = it.info ? '<div class="ipanel" id="' + pid + '"' + (open ? "" : " hidden") + "><p>" + esc(nm(it.info) || t().noInfo) + "</p>" + (links ? '<div class="ilinks">' + links + "</div>" : "") + "</div>" : "";
    li.innerHTML = '<div class="slidebox"><span class="sw sw-del" aria-hidden="true">' + TRASH + '</span><span class="sw sw-mv" aria-hidden="true">' + MOVE + '</span>' +
      '<div class="face"><div class="item' + (on ? " on" : "") + '">' + body +
      '<button type="button" class="nbtn' + (note ? " has" : "") + '" aria-label="' + esc(p().itemEdit + ": " + title) + '">' + PEN + "</button>" +
      infoBtn + '</div><span class="hdl" role="button" tabindex="0" aria-label="' + esc(p().drag + ": " + title) + '">☰</span></div></div>' + panel;
    var input = li.querySelector("input");
    if (input) {
      input.addEventListener("click", function (e) {
        if (!mark) return;
        e.preventDefault();
        var u = getUser();
        if (u.marks) delete u.marks[it.id];
        saveUser(u);
        refresh();
      });
      input.onchange = function () {
        if (mark) return;
        var c = getChecked(list.id).filter(function (x) { return x !== it.he; });
        if (input.checked) c.push(it.he);
        setChecked(list.id, c);
        li.querySelector(".item").classList.toggle("on", input.checked);
        renderCount(findList(list.id));
      };
    }
    var mb = li.querySelector("[data-mark]");
    if (mb) mb.onclick = function (e) { e.preventDefault(); e.stopPropagation(); toggleMark(it.id, "ok"); };
    var nb = li.querySelector(".nbtn");
    nb.onclick = function (e) { e.preventDefault(); e.stopPropagation(); openNote(it); };
    var ib = li.querySelector(".ibtn");
    if (ib) ib.onclick = function (e) { e.preventDefault(); e.stopPropagation(); openInfo = openInfo === it.id ? null : it.id; renderList(); };
    return li;
  }

  function renderList() {
    var list = findList(current);
    if (!list) return;
    var u = getUser();
    var isPower = list.style === "power";
    $("list-title").textContent = nm(list.title);
    var tg = $("list-tag"); tg.hidden = !list.tag; if (list.tag) tg.textContent = nm(list.tag);
    $("instr").textContent = isPower ? p().hint : nm(D.instruction);
    var gh = $("ghint"); gh.hidden = isPower; if (!isPower) gh.textContent = p().hint;
    var nt = $("list-note"); nt.hidden = !list.note; if (list.note) nt.textContent = nm(list.note);
    $("add-text").placeholder = p().add;
    $("add-text").setAttribute("aria-label", p().add);
    $("add-btn").textContent = p().addBtn;
    $("restore-btn").textContent = p().restore;
    var ul = $("items");
    ul.innerHTML = "";
    ul.className = "items" + (list.style === "info" ? " info" : "") + (isPower ? " power" : "");
    ul.setAttribute("data-list", list.id);
    var chk = getChecked(list.id);
    var groups = groupsOf(list, u);
    var any = false;
    groups.forEach(function (g) {
      if (g.title) {
        var h = document.createElement("li");
        h.className = "sec";
        h.textContent = nm(g.title);
        ul.appendChild(h);
      }
      var lastG = "";
      g.items.forEach(function (it) {
        any = true;
        var gk = it.group ? nm(it.group) : "";
        if (gk && gk !== lastG) {
          var gh2 = document.createElement("li");
          gh2.className = "sec";
          gh2.textContent = gk;
          ul.appendChild(gh2);
        }
        lastG = gk;
        var li = rowEl(list, it, chk, markOf(u, it.id));
        li.setAttribute("data-sec", g.sec);
        ul.appendChild(li);
      });
    });
    if (!any) {
      var e = document.createElement("li");
      e.className = "pempty";
      e.textContent = p().empty;
      ul.appendChild(e);
    }
    renderQuestions(list);
    var mo = $("list-more"); mo.hidden = !list.more; if (list.more) mo.textContent = nm(list.more);
    $("soon").hidden = true;
    $("count").hidden = isPower;
    $("clear-btn").hidden = isPower;
    $("listfoot").hidden = false;
    if (!isPower) renderCount(list);
  }

  function toast(msg, undoFn) {
    var el = $("toast");
    el.innerHTML = "<span>" + esc(msg) + "</span>";
    if (undoFn) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = p().undo;
      b.onclick = function () { el.hidden = true; undoFn(); };
      el.appendChild(b);
    }
    el.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.hidden = true; }, 5000);
  }
  function refresh() { if (current) renderList(); else renderHome(); }

  function deleteItem(it) {
    if (!it) return;
    var before = snap();
    var u = getUser();
    if (it.custom) { delete u.custom[it.id]; if (u.marks) delete u.marks[it.id]; }
    else u.hidden[it.id] = 1;
    saveUser(u);
    if (openInfo === it.id) openInfo = null;
    refresh();
    toast(p().del + ": " + nm(it), function () { unsnap(before); refresh(); });
  }
  function deleteById(id) { deleteItem(itemById(id)); }

  function moveItem(it, toId) {
    if (!it || !toId || toId === current) return;
    var before = snap();
    var u = getUser();
    var from = current;
    if (it.custom) {
      if (!u.custom[it.id]) return;
      u.custom[it.id].list = toId;
    } else if (it.origin === toId) delete u.loc[it.id];
    else u.loc[it.id] = toId;
    saveUser(u);
    var fromC = getChecked(from);
    if (fromC.indexOf(it.he) !== -1) {
      setChecked(from, fromC.filter(function (x) { return x !== it.he; }));
      var toC = getChecked(toId);
      if (toC.indexOf(it.he) === -1) { toC.push(it.he); setChecked(toId, toC); }
    }
    refresh();
    var dest = rawList(toId);
    toast(p().moved + nm(dest && dest.title), function () { unsnap(before); refresh(); });
  }
  function pickList(it) {
    var s = $("mv-sheet"), grid = $("mv-grid");
    $("mv-title").textContent = p().moveTo;
    grid.innerHTML = "";
    D.lists.forEach(function (l) {
      if (l.id === current) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "choice mvopt";
      b.innerHTML = '<span class="ic" aria-hidden="true">' + esc(l.icon || "•") + '</span><span class="tx">' + esc(nm(l.title)) + "</span>";
      b.onclick = function () { s.hidden = true; moveItem(it, l.id); };
      grid.appendChild(b);
    });
    var c = document.createElement("button");
    c.type = "button";
    c.className = "btn";
    c.textContent = p().cancel;
    c.onclick = function () { s.hidden = true; };
    grid.appendChild(c);
    sheetReadyAt = Date.now() + 320;
    s.hidden = false;
  }
  function moveById(id) { var it = itemById(id); if (it) pickList(it); }

  /* The title shown in the current language. If the other language is empty or a copy of
     this one (user-added items store the same string twice), a rename updates both. */
  function nextTitles(it, text) {
    var shown = nm(it);
    var he = it.he || "", en = it.en || "";
    if (lang === "he") {
      if (!en || en === shown) en = text;
      he = text;
    } else {
      if (!he || he === shown) he = text;
      en = text;
    }
    return { he: he, en: en };
  }
  function renameChecked(oldHe, newHe) {
    if (!current || !oldHe || oldHe === newHe) return;
    var c = getChecked(current);
    var i = c.indexOf(oldHe);
    if (i === -1) return;
    c[i] = newHe;
    setChecked(current, c);
  }
  function openNote(it) {
    noteItem = it;
    var has = !!noteText(it.note);
    $("note-title").textContent = p().itemEdit;
    var title = $("item-title");
    title.value = nm(it);
    title.placeholder = p().titlePh;
    title.setAttribute("aria-label", p().titlePh);
    title.classList.remove("bad");
    $("title-label").textContent = p().titlePh;
    var area = $("note-text");
    area.value = noteText(it.note);
    area.placeholder = p().notePh;
    area.setAttribute("aria-label", p().notePh);
    $("note-label").textContent = p().notePh;
    $("note-save").textContent = p().noteSave;
    $("note-clear").hidden = !has;
    $("note-clear").textContent = p().noteClear;
    $("note-cancel").textContent = p().cancel;
    $("note-close").setAttribute("aria-label", t().close);
    $("note-sheet").hidden = false;
    setTimeout(function () {
      title.focus();
      var n = title.value.length;
      try { title.setSelectionRange(n, n); } catch (e) {}
    }, 30);
  }
  function closeNote() { $("note-sheet").hidden = true; noteItem = null; }
  function commitItem(opts) {
    var it = noteItem;
    if (!it) return;
    opts = opts || {};
    var titleEl = $("item-title");
    var title = String(titleEl.value || "").replace(/\s+/g, " ").trim().slice(0, 200);
    if (!title) { titleEl.classList.add("bad"); titleEl.focus(); return; }
    titleEl.classList.remove("bad");
    var text = opts.clearNote ? "" : String($("note-text").value || "").trim().slice(0, 500);
    var u = getUser();
    var next = nextTitles(it, title);
    if (it.custom) {
      if (!u.custom[it.id]) { closeNote(); return; }
      if (next.he !== (it.he || "")) renameChecked(it.he, next.he);
      u.custom[it.id].he = next.he;
      u.custom[it.id].en = next.en || next.he;
      u.custom[it.id].note = { he: text, en: text };
    } else {
      if (next.he !== (it.he || "")) renameChecked(it.he, next.he);
      var b = builtinById(it.id);
      var same = b && next.he === (b.he || "") && (next.en || "") === (b.en || "");
      if (same) delete u.titles[it.id];
      else u.titles[it.id] = { he: next.he, en: next.en };
      u.notes[it.id] = { he: text, en: text };
    }
    saveUser(u);
    closeNote();
    refresh();
  }

  function askConfirm(title, body, yes, fn) {
    $("cf-title").textContent = title;
    $("cf-body").textContent = body;
    $("cf-yes").textContent = yes;
    $("cf-no").textContent = p().cancel;
    $("cf-close").setAttribute("aria-label", t().close);
    confirmAction = fn;
    $("cf-sheet").hidden = false;
  }
  function restoreList(id) {
    askConfirm(p().restoreTitle, p().restoreBody, p().restoreYes, function () {
      var before = snap();
      var u = getUser();
      var gone = {};
      Object.keys(u.custom).forEach(function (cid) {
        var c = u.custom[cid];
        if (!c) return;
        if (c.list === id) {
          if (c.born && c.born !== id && rawList(c.born)) c.list = c.born;
          else { delete u.custom[cid]; gone[cid] = 1; }
        } else if (c.born === id) { delete u.custom[cid]; gone[cid] = 1; }
      });
      catalog().forEach(function (b) {
        if (b.origin === id) { delete u.hidden[b.id]; delete u.loc[b.id]; delete u.notes[b.id]; delete u.titles[b.id]; gone[b.id] = 1; }
        else if (u.loc[b.id] === id) delete u.loc[b.id];
      });
      delete u.order[id];
      Object.keys(u.marks).forEach(function (mid) { if (gone[mid]) delete u.marks[mid]; });
      saveUser(u);
      refresh();
      toast(p().restored, function () { unsnap(before); refresh(); });
    });
  }
  function restoreAll() {
    askConfirm(p().restoreAllTitle, p().restoreAllBody, p().restoreYes, function () {
      var before = snap();
      saveUser(emptyUser());
      refresh();
      toast(p().restoredAll, function () { unsnap(before); refresh(); });
    });
  }

  function addCurrent() {
    if (!current) return;
    var input = $("add-text");
    var v = input.value.trim();
    if (!v) { input.focus(); return; }
    var he = v, note = "";
    var k = v.indexOf(" - ");
    if (k > 0) { he = v.slice(0, k).trim(); note = v.slice(k + 3).trim(); }
    if (!he) { input.focus(); return; }
    he = he.slice(0, 200);
    note = note.slice(0, 500);
    var u = getUser();
    var id = "u:" + uid();
    u.custom[id] = { id: id, list: current, born: current, he: he, en: he, note: { he: note, en: note }, seq: Date.now() };
    saveUser(u);
    input.value = "";
    renderList();
    var row = document.querySelector('.drow[data-id="' + id + '"]');
    if (row) {
      row.classList.add("flash");
      if (row.scrollIntoView) row.scrollIntoView({ block: "nearest" });
    }
  }

  /* Visible row order, then any id already stored for this list that is not on screen
     (hidden, or not rendered this pass). Never drops or duplicates an id. */
  function saveOrderFromDom(ul) {
    if (!current) return;
    var ids = [];
    ul.querySelectorAll(".drow").forEach(function (r) {
      var id = r.getAttribute("data-id");
      if (id && ids.indexOf(id) === -1) ids.push(id);
    });
    var u = getUser();
    var prev = (u.order && Array.isArray(u.order[current])) ? u.order[current] : [];
    prev.forEach(function (id) { if (id && ids.indexOf(id) === -1) ids.push(id); });
    u.order[current] = ids;
    saveUser(u);
  }
  function siblingsInGroup(li) {
    var sec = li.getAttribute("data-sec");
    return Array.prototype.filter.call(li.parentNode.querySelectorAll(".drow"), function (r) { return r.getAttribute("data-sec") === sec; });
  }

  /* Sideways swipe is immediate (right delete, left move). A vertical drag on the row is native
     page scrolling and never marks the item. Tapping the mark square still toggles ✓,
     which moves the item into נבחרים; clearing ✓ puts it back.
     Reorder: the ☰ handle lifts at once. The row follows the finger with a transform and
     the other rows in the same group shift to show the gap. The DOM is not moved until
     the finger lifts — moving it mid-drag made the row jump back under the finger (and
     mobile browsers cancelled the pointer), so the order never stuck. */
  var g = null;
  var sheetReadyAt = 0;
  function bootGestures() {
    var ul = $("items");
    function scrollY() { return window.scrollY || window.pageYOffset || 0; }
    function armCancelFallback() {
      if (!g) return;
      var cur = g;
      clearTimeout(cur.cancelT);
      cur.cancelT = setTimeout(function () {
        if (g === cur && cur.mode === "drag" && cur.sawCancel) end({ pointerId: cur.pid, type: "touchend" });
      }, 160);
    }
    /* Snapshot row centers once. Later frames only write transforms, so a moving finger
       is compared with the original list, not with boxes that jump on every swap. */
    function lift(handle) {
      if (!g || g.lifted || g.mode !== "drag") return;
      var rows = siblingsInGroup(g.li);
      var sy = scrollY();
      var mids = rows.map(function (r) {
        var b = r.getBoundingClientRect();
        return { el: r, mid: b.top + sy + b.height / 2, h: b.height };
      });
      var from = rows.indexOf(g.li);
      if (from < 0) return;
      g.lifted = true;
      g.drag = { rows: rows, mids: mids, from: from, to: from, y0: g.y + sy, h: mids[from].h };
      g.li.classList.add("lifted");
      g.ul.classList.add("dragging");
      try { if (handle) handle.setPointerCapture(g.pid); } catch (err) {}
      if (navigator.vibrate && g.type !== "mouse") { try { navigator.vibrate(12); } catch (e) {} }
      dragFollow(g.y);
      tick();
    }
    function dragFollow(clientY) {
      if (!g || !g.drag) return;
      var d = g.drag, docY = clientY + scrollY(), to = 0, i, j;
      for (i = 0; i < d.mids.length; i++) if (i !== d.from && d.mids[i].mid < docY) to++;
      d.to = to;
      var dy = docY - d.y0;
      var origin = d.mids[d.from];
      if (d.mids.length) {
        var min = d.mids[0].mid - origin.mid, max = d.mids[d.mids.length - 1].mid - origin.mid;
        if (dy < min) dy = min;
        if (dy > max) dy = max;
      }
      var shift = d.h + 8;
      for (j = 0; j < d.mids.length; j++) {
        var el = d.mids[j].el, s = 0;
        if (j === d.from) { el.style.transform = "translate3d(0," + dy + "px,0)"; continue; }
        if (d.from < to && j > d.from && j <= to) s = -shift;
        else if (d.from > to && j >= to && j < d.from) s = shift;
        el.style.transform = s ? "translate3d(0," + s + "px,0)" : "";
      }
    }
    function tick() {
      if (!g || !g.lifted) return;
      var y = g.y, H = window.innerHeight, sp = 0;
      if (y < 72) sp = -Math.ceil((72 - y) / 5);
      else if (y > H - 72) sp = Math.ceil((y - (H - 72)) / 5);
      if (sp) {
        var before = scrollY();
        window.scrollBy(0, sp);
        if (scrollY() !== before) dragFollow(y);
      }
      g.raf = requestAnimationFrame(tick);
    }
    ul.addEventListener("touchstart", function (e) {
      if (e.target.closest && e.target.closest(".hdl") && e.cancelable) e.preventDefault();
    }, { passive: false });
    ul.addEventListener("pointerdown", function (e) {
      if (e.button > 0) return;
      var handle = e.target.closest(".hdl");
      var face = e.target.closest(".face");
      if (!handle && !face) return;
      if (!handle && e.target.closest("button, a")) return;
      var li = (handle || face).closest(".drow");
      if (!li) return;
      if (handle) {
        e.preventDefault();
        g = { mode: "drag", li: li, ul: ul, pid: e.pointerId, type: e.pointerType, x: e.clientX, y: e.clientY, lifted: false, timer: null, raf: 0, cancelT: 0 };
        lift(handle);
        return;
      }
      g = { mode: "maybe", li: li, face: face, ul: ul, pid: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0, t: Date.now(), type: e.pointerType };
    });
    document.addEventListener("pointermove", function (e) {
      if (!g || e.pointerId !== g.pid) return;
      if (g.mode === "drag") {
        if (g.sawCancel && g.type === "touch") return;
        g.y = e.clientY;
        g.x = e.clientX;
        if (e.cancelable) e.preventDefault();
        dragFollow(e.clientY);
        return;
      }
      var dx = e.clientX - g.x, dy = e.clientY - g.y, adx = Math.abs(dx), ady = Math.abs(dy);
      g.dx = dx; g.dy = dy;
      if (g.mode === "vert") return; // page scroll: never preventDefault, never turn it into a swipe or a mark
      if (g.mode === "maybe") {
        if (adx < 12 && ady < 12) return;
        if (adx > ady * 1.5) {
          g.mode = "swipe";
          g.li.classList.add("swiping");
          try { g.face.setPointerCapture(e.pointerId); } catch (err) {}
        } else if (ady > adx * 1.5) { g.mode = "vert"; return; }
        else { g = null; return; }
      }
      if (g && g.mode === "swipe") {
        e.preventDefault();
        g.face.style.transform = "translateX(" + dx + "px)";
        var go = Math.abs(dx) > (g.face.offsetWidth || 1) * 0.34;
        g.li.classList.toggle("sdel", dx > 12);
        g.li.classList.toggle("smv", dx < -12);
        g.li.classList.toggle("sgo", go);
      }
    });
    function end(e) {
      if (!g || (e.pointerId != null && e.pointerId !== g.pid)) return;
      if (g.type === "touch" && g.mode !== "swipe" && g.mode !== "drag" && e.type === "pointercancel") {
        g.sawCancel = true;
        g.mode = "vert";
        return;
      }
      /* A touch reorder keeps going on touchmove/touchend after the browser cancels the pointer.
         Committing here would drop the row back before the finger has finished. */
      if (e.type === "pointercancel" && g.mode === "drag" && g.type === "touch") {
        g.sawCancel = true;
        armCancelFallback();
        return;
      }
      var cur = g;
      g = null;
      if (cur.timer) clearTimeout(cur.timer);
      if (cur.cancelT) clearTimeout(cur.cancelT);
      if (cur.raf) cancelAnimationFrame(cur.raf);
      if (cur.mode === "swipe") {
        swallow = true;
        setTimeout(function () { swallow = false; }, 450);
        var w = (cur.face.offsetWidth || 1) * 0.34;
        var dx = cur.dx || 0;
        var id = cur.li.getAttribute("data-id");
        cur.li.classList.remove("sdel", "smv", "sgo", "swiping");
        if (dx > w) { deleteById(id); return; }
        if (dx < -w) { cur.face.style.transform = ""; pickList(itemById(id)); return; }
        cur.face.style.transition = "transform .18s ease";
        cur.face.style.transform = "";
        setTimeout(function () { cur.face.style.transition = ""; }, 200);
        return;
      }
      if (cur.mode !== "drag" || !cur.lifted) return;
      swallow = true;
      setTimeout(function () { swallow = false; }, 450);
      var d = cur.drag;
      var moved = d && d.to !== d.from;
      if (d) d.mids.forEach(function (m) { m.el.style.transform = ""; });
      cur.li.classList.remove("lifted");
      cur.ul.classList.remove("dragging");
      if (!moved) return;
      var parent = cur.li.parentNode;
      if (d.to < d.from) parent.insertBefore(cur.li, d.rows[d.to]);
      else parent.insertBefore(cur.li, d.rows[d.to].nextSibling);
      var movedId = cur.li.getAttribute("data-id");
      saveOrderFromDom(cur.ul);
      renderList();
      var again = ul.querySelector('.drow[data-id="' + movedId + '"] .hdl');
      if (again && cur.type === "mouse") again.focus();
    }
    document.addEventListener("pointerup", end);
    document.addEventListener("pointercancel", end);
    document.addEventListener("touchend", function (e) {
      if (!g || g.handled) return;
      var tch = e.changedTouches && e.changedTouches[0]; if (!tch) return;
      if (g.mode === "drag") {
        g.y = tch.clientY;
        g.x = tch.clientX;
        if (g.lifted) dragFollow(tch.clientY);
        end({ pointerId: g.pid, type: "touchend" });
        return;
      }
      if (g.mode === "swipe" && g.sawCancel) {
        g.dx = tch.clientX - g.x; g.dy = tch.clientY - g.y;
        end({ pointerId: g.pid, type: "touchend" });
        return;
      }
      if (g.mode === "swipe") return;
      g = null;
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (!g || g.handled) return;
      var tch = e.touches && e.touches[0]; if (!tch) return;
      if (g.mode === "drag") {
        if (e.cancelable) e.preventDefault();
        g.y = tch.clientY;
        g.x = tch.clientX;
        dragFollow(tch.clientY);
        if (g.sawCancel) armCancelFallback();
        return;
      }
      if (g.mode === "vert") return;
      g.dx = tch.clientX - g.x; g.dy = tch.clientY - g.y;
      var adx = Math.abs(g.dx), ady = Math.abs(g.dy);
      if (g.mode === "swipe" && g.face) {
        g.face.style.transform = "translateX(" + g.dx + "px)";
        return;
      }
      if (g.mode !== "maybe") return;
      if (adx < 12 && ady < 12) return;
      if (adx > ady * 1.5) {
        g.mode = "swipe";
        g.li.classList.add("swiping");
      } else if (ady > adx * 1.5) g.mode = "vert";
    }, { passive: false });
    ul.addEventListener("keydown", function (e) {
      var handle = e.target.closest && e.target.closest(".hdl");
      if (!handle) return;
      var li = handle.closest(".drow");
      if (!li) return;
      if (e.key === "Delete") { e.preventDefault(); deleteById(li.getAttribute("data-id")); return; }
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      var rows = siblingsInGroup(li);
      var i = rows.indexOf(li);
      var j = e.key === "ArrowUp" ? i - 1 : i + 1;
      if (j < 0 || j >= rows.length) return;
      var sib = rows[j];
      if (e.key === "ArrowUp") li.parentNode.insertBefore(li, sib);
      else li.parentNode.insertBefore(sib, li);
      saveOrderFromDom(ul);
      renderList();
      var again = ul.querySelector('.drow[data-id="' + li.getAttribute("data-id") + '"] .hdl');
      if (again) again.focus();
    });
    ul.addEventListener("contextmenu", function (e) { if (g && (g.mode === "swipe" || g.mode === "drag")) e.preventDefault(); });
    document.addEventListener("click", function (e) {
      if (!swallow) return;
      swallow = false;
      if (e.target.closest && e.target.closest("#toast, .sheet, #add-form, #listfoot, header, .home-restore")) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);
    $("mv-sheet").addEventListener("click", function (e) {
      if (Date.now() < sheetReadyAt) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  function renderBgGrid() {
    var grid = $("bg-grid"); grid.innerHTML = "";
    D.backgrounds.forEach(function (b) {
      var o = document.createElement("button");
      o.type = "button"; o.className = "bgopt"; o.setAttribute("aria-pressed", b.id === bg ? "true" : "false");
      o.innerHTML = '<img src="bg/' + esc(b.id) + '-t.webp" alt="" loading="lazy" width="180" height="320"><span>' + esc(nm(b)) + "</span>";
      o.onclick = function () { bg = b.id; set(BG_KEY, bg); applyBg(); renderBgGrid(); };
      grid.appendChild(o);
    });
  }

  function closeMoveNote() {
    $("mv-sheet").hidden = true;
    $("note-sheet").hidden = true;
    $("cf-sheet").hidden = true;
    noteItem = null;
    confirmAction = null;
  }
  function route() {
    var id = (location.hash || "").slice(1);
    var next = rawList(id) ? id : null;
    if (current !== next) openInfo = null;
    current = next;
    $("home").hidden = !!current;
    $("list").hidden = !current;
    if (current) renderList(); else renderHome();
    window.scrollTo(0, 0);
  }

  function renderAll() {
    var he = lang === "he";
    document.documentElement.lang = lang;
    document.documentElement.dir = he ? "rtl" : "ltr";
    document.title = "Balancify";
    $("lang-he").setAttribute("aria-pressed", he ? "true" : "false");
    $("lang-en").setAttribute("aria-pressed", he ? "false" : "true");
    $("back").textContent = t().back;
    $("home-btn").textContent = t().home;
    $("bg-btn").textContent = t().bg;
    $("bg-title").textContent = t().bgTitle;
    $("bg-close").setAttribute("aria-label", t().close);
    $("title").textContent = nm(D.APP_NAME);
    $("tagline").textContent = nm(D.subtitle);
    $("clear-btn").textContent = t().clear;
    $("install-btn").textContent = t().install;
    if (!$("install-hint").hidden) $("install-hint").textContent = t()[isIOS ? "ios" : "other"];
    var c = $("crisis");
    c.innerHTML = esc(t().crisis).replace(/(\d{3}-\d{7}|1201)/g, "<bdi>$1</bdi>") + " ";
    var a = document.createElement("a");
    a.href = "https://www.eran.org.il/";
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = "eran.org.il";
    c.appendChild(a);
    applyTheme();
    renderBgGrid();
    route();
  }

  $("lang-he").onclick = function () { lang = "he"; set(LANG_KEY, "he"); renderAll(); };
  $("lang-en").onclick = function () { lang = "en"; set(LANG_KEY, "en"); renderAll(); };
  $("theme-btn").onclick = function () { theme = theme === "light" ? "dark" : "light"; set(THEME_KEY, theme); applyTheme(); };
  $("home-btn").onclick = function () { if (history.length > 1 && current) history.back(); else location.hash = ""; };
  $("clear-btn").onclick = function () { if (current) { setChecked(current, []); renderList(); } };
  $("restore-btn").onclick = function () { if (current) restoreList(current); };
  $("restore-all").onclick = function () { restoreAll(); };
  $("add-btn").onclick = addCurrent;
  $("add-form").addEventListener("submit", function (e) { e.preventDefault(); addCurrent(); });
  $("add-text").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addCurrent(); } });
  $("note-save").onclick = function () { commitItem(); };
  $("note-clear").onclick = function () { commitItem({ clearNote: true }); };
  $("note-cancel").onclick = closeNote;
  $("note-close").onclick = closeNote;
  $("note-sheet").onclick = function (e) { if (e.target === this) closeNote(); };
  $("item-title").addEventListener("input", function () { this.classList.remove("bad"); });
  $("item-title").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commitItem(); return; }
    if (e.key === "Enter") { e.preventDefault(); $("note-text").focus(); }
  });
  $("note-text").addEventListener("keydown", function (e) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); commitItem(); }
  });
  $("cf-yes").onclick = function () { $("cf-sheet").hidden = true; var fn = confirmAction; confirmAction = null; if (fn) fn(); };
  $("cf-no").onclick = function () { $("cf-sheet").hidden = true; confirmAction = null; };
  $("cf-close").onclick = function () { $("cf-sheet").hidden = true; confirmAction = null; };
  $("cf-sheet").onclick = function (e) { if (e.target === this) { this.hidden = true; confirmAction = null; } };
  $("bg-btn").onclick = function () { $("bg-sheet").hidden = false; };
  $("bg-close").onclick = function () { $("bg-sheet").hidden = true; };
  $("bg-sheet").onclick = function (e) { if (e.target === this) this.hidden = true; };
  $("mv-sheet").onclick = function (e) { if (e.target === this) this.hidden = true; };
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { $("bg-sheet").hidden = true; closeMoveNote(); }
  });
  window.addEventListener("hashchange", function () { closeMoveNote(); route(); });
  window.addEventListener("storage", function (e) {
    if (!e.isTrusted) return;
    if (e.key === USER_KEY || e.key === ORD_KEY || (e.key && e.key.indexOf(CHK_PREFIX) === 0)) refresh();
  });

  var ua = navigator.userAgent || "";
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function standalone() { return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; }
  var deferred = null;
  function updateInstall() { var s = !standalone(); $("install-wrap").hidden = !s; if (!s) $("install-hint").hidden = true; }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; updateInstall(); });
  window.addEventListener("appinstalled", function () { deferred = null; $("install-wrap").hidden = true; });
  $("install-btn").onclick = function () {
    if (deferred) { var d = deferred; deferred = null; d.prompt(); (d.userChoice || Promise.resolve()).then(updateInstall); return; }
    var h = $("install-hint"); h.textContent = t()[isIOS ? "ios" : "other"]; h.hidden = !h.hidden;
  };

  bootGestures();
  applyBg();
  renderAll();
  updateInstall();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  }
})();
