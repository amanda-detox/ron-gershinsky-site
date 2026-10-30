/* Balancify (באלאנסיפיי). Content lives in data.js. */
(function () {
  "use strict";
  var LANG_KEY = "rg-lang", THEME_KEY = "rg-balancify-theme", BG_KEY = "rg-balancify-bg", CHK_PREFIX = "rg-balancify-checked-";
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
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  function $(id) { return document.getElementById(id); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var lang = get(LANG_KEY) === "en" ? "en" : "he";
  var theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  var bg = get(BG_KEY) || D.defaultBg;
  if (!D.backgrounds.some(function (b) { return b.id === bg; })) bg = D.defaultBg;
  var current = null; // open list id, or null = home
  function t() { return L[lang]; }
  function nm(o) { return (o && (o[lang] || o.he || o.en)) || ""; }
  function rawList(id) { for (var i = 0; i < D.lists.length; i++) if (D.lists[i].id === id) return D.lists[i]; return null; }
  /* a list as shown: data.js content + items Ron moved into it (rg-balancify-user.extra) */
  function findList(id) {
    var l = rawList(id); if (!l) return null;
    var ex = (getUser().extra || {})[id] || [];
    if (l.style === "power") { var c = Object.assign({}, l); c.items = powerItems(); return c; }
    if (!ex.length) return l;
    var o = Object.assign({}, l);
    if (l.sections) o.sections = l.sections.concat([{ title: { he: "הועברו לכאן", en: "Moved here" }, items: ex }]);
    else o.items = (l.items || []).concat(ex);
    return o;
  }
  /* Ron's editable lists (items, deletions, moves, order); synced as a pref */
  var USER_KEY = "rg-balancify-user";
  function getUser() { try { var o = JSON.parse(get(USER_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
  function saveUser(u) { set(USER_KEY, JSON.stringify(u)); try { window.dispatchEvent(new StorageEvent("storage", { key: USER_KEY })); } catch (e) {} }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function powerItems() {
    var u = getUser();
    if (Array.isArray(u.power)) return u.power;
    var l = rawList("power"); return (l ? l.items : []).map(function (it, i) { return { id: "d" + i, he: it.he, note: it.note || "" }; });
  }
  function savePower(arr) { var u = getUser(); u.power = arr; saveUser(u); }

  /* checked items are stored by their Hebrew text, so reordering/adding items in data.js keeps choices */
  function getChecked(id) { try { var a = JSON.parse(get(CHK_PREFIX + id) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function setChecked(id, arr) { set(CHK_PREFIX + id, JSON.stringify(arr)); }
  function itemsOf(list) {
    if (list.items) return list.items;
    var a = []; (list.sections || []).forEach(function (sec) { a = a.concat(sec.items || []); }); return a;
  }
  /* Ron's own order (☰ drag), per list, stored by Hebrew text; synced as a pref */
  var ORD_KEY = "rg-balancify-order";
  function getOrd() { try { var o = JSON.parse(get(ORD_KEY) || "{}"); return o && typeof o === "object" ? o : {}; } catch (e) { return {}; } }
  function sorted(list) {
    var ord = getOrd()[list.id] || [], items = list.items.slice();
    return items.map(function (it, i) { var p = ord.indexOf(it.he); return { it: it, k: p === -1 ? 1e6 + i : p }; })
      .sort(function (x, y) { return x.k - y.k; }).map(function (x) { return x.it; });
  }
  function saveOrd(id, arr) { var o = getOrd(); o[id] = arr; set(ORD_KEY, JSON.stringify(o)); try { window.dispatchEvent(new StorageEvent("storage", { key: ORD_KEY })); } catch (e) {} }
  function enableDrag(ul, list) {
    ul.addEventListener("pointerdown", function (e) {
      var h = e.target.closest(".hdl"); if (!h) return;
      e.preventDefault();
      var li = h.closest("li"); li.classList.add("lifted"); ul.classList.add("dragging");
      try { h.setPointerCapture(e.pointerId); } catch (x) {}
      function mv(ev) {
        var rows = Array.prototype.slice.call(ul.children);
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i]; if (r === li) continue; var b = r.getBoundingClientRect();
          if (ev.clientY > b.top && ev.clientY < b.bottom) { if (ev.clientY < b.top + b.height / 2) ul.insertBefore(li, r); else ul.insertBefore(li, r.nextSibling); break; }
        }
      }
      function up() {
        h.removeEventListener("pointermove", mv); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up);
        li.classList.remove("lifted"); ul.classList.remove("dragging");
        saveOrd(list.id, Array.prototype.map.call(ul.children, function (r) { return r.getAttribute("data-he"); }));
      }
      h.addEventListener("pointermove", mv); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
    });
  }
  function countChecked(list) { var c = getChecked(list.id); return itemsOf(list).filter(function (it) { return c.indexOf(it.he) !== -1; }).length; }

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
    D.lists.forEach(function (list, i) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "choice" + (i === 0 ? " first" : "");
      var n = countChecked(list), total = itemsOf(list).length;
      var meta = total ? t().items(total) + (n ? " · " + t().count(n, total) : "") : t().soon;
      b.innerHTML = '<span class="ic" aria-hidden="true">' + esc(list.icon || "•") + '</span><span class="tx">' + esc(nm(list.title)) + '<span class="meta">' + esc(meta) + '</span></span><span class="ar" aria-hidden="true">›</span>';
      b.onclick = function () { location.hash = "#" + list.id; };
      box.appendChild(b);
    });
  }

  function renderList() {
    var list = findList(current); if (!list) return;
    $("list-title").textContent = nm(list.title);
    var tg = $("list-tag"); tg.hidden = !list.tag; if (list.tag) tg.textContent = nm(list.tag);
    $("instr").textContent = nm(D.instruction);
    var nt = $("list-note"); nt.hidden = !list.note; if (list.note) nt.textContent = nm(list.note);
    var ul = $("items"); ul.innerHTML = ""; ul.className = "items";
    var chk = getChecked(list.id);
    $("power-box").hidden = list.style !== "power";
    if (list.style === "power") { renderPower(list, ul); return; }
    if (list.style === "info") renderInfoList(list, ul, chk);
    else { enableDrag(ul, list); sorted(list).forEach(function (it) {
      var li = document.createElement("li"); li.className = "drow"; li.setAttribute("data-he", it.he);
      var on = chk.indexOf(it.he) !== -1;
      li.innerHTML = '<label class="item' + (on ? " on" : "") + '"><input type="checkbox"' + (on ? " checked" : "") + '><span class="box">' + CHECK + '</span><span class="tw"><span class="t">' + esc(nm(it)) + "</span>" + (it.detail ? '<span class="d">' + esc(nm(it.detail)) + "</span>" : "") + "</span></label>" + '<span class="hdl" role="button" aria-label="' + (lang === "en" ? "Drag to reorder" : "גרור לשינוי הסדר") + '">☰</span>';
      li.querySelector("input").onchange = function (e) {
        var c = getChecked(list.id).filter(function (x) { return x !== it.he; });
        if (e.target.checked) c.push(it.he);
        setChecked(list.id, c); li.firstChild.classList.toggle("on", e.target.checked); renderCount(list);
      };
      ul.appendChild(li);
    }); }
    var mo = $("list-more"); mo.hidden = !list.more; if (list.more) mo.textContent = nm(list.more);
    var empty = !itemsOf(list).length;
    $("soon").hidden = !empty; $("soon").textContent = t().soon;
    $("listfoot").hidden = empty;
    renderCount(list);
  }
  /* list with sections, where each item has an explanation panel (accordion) */
  var openInfo = null;
  function renderInfoList(list, ul, chk) {
    ul.className = "items info";
    list.sections.forEach(function (sec, si) {
      var h = document.createElement("li");
      h.className = "sec"; h.textContent = nm(sec.title);
      ul.appendChild(h);
      sec.items.forEach(function (it, ii) {
        var key = si + "-" + ii, on = chk.indexOf(it.he) !== -1, isOpen = openInfo === key;
        var li = document.createElement("li");
        li.className = "irow" + (on ? " on" : "") + (isOpen ? " open" : "");
        var links = (it.links || []).map(function (l) {
          var href = String(l.href || ""); if (!/^(https?:|tel:)/.test(href)) return "";
          var ext = /^https?:/.test(href);
          return '<a class="ilink" href="' + esc(href) + '"' + (ext ? ' target="_blank" rel="noopener"' : "") + ">" + esc(nm(l)) + (ext ? " ↗" : "") + "</a>";
        }).join("");
        var pid = "info-" + list.id + "-" + key;
        li.innerHTML = '<div class="ihead"><label class="ichk"><input type="checkbox"' + (on ? " checked" : "") + ' aria-label="' + esc(nm(it)) + '"><span class="box">' + CHECK + '</span></label>' +
          '<button type="button" class="itext" aria-expanded="' + isOpen + '" aria-controls="' + pid + '"><span class="t">' + esc(nm(it)) + '</span><span class="ibtn" aria-hidden="true">' + (isOpen ? "✕" : "i") + "</span></button></div>" +
          '<div class="ipanel" id="' + pid + '"' + (isOpen ? "" : " hidden") + '><p>' + esc(nm(it.info) || t().noInfo) + "</p>" + (links ? '<div class="ilinks">' + links + "</div>" : "") + "</div>";
        li.querySelector("input").onchange = function (e) {
          var c = getChecked(list.id).filter(function (x) { return x !== it.he; });
          if (e.target.checked) c.push(it.he);
          setChecked(list.id, c); li.classList.toggle("on", e.target.checked); renderCount(list);
        };
        li.querySelector(".itext").onclick = function () { openInfo = openInfo === key ? null : key; renderList(); };
        ul.appendChild(li);
      });
    });
  }

  /* ----- הדמיות עוצמה: swipe right = delete (undo), swipe left = move, ☰ = reorder ----- */
  var P = {
    he: { add: "הוספת פריט…", addBtn: "הוספה", del: "נמחק", undo: "ביטול", moved: "הועבר ל", moveTo: "להעביר לאיזו רשימה?", cancel: "ביטול",
      hint: "החלק ימינה למחיקה, שמאלה להעברה לרשימה אחרת, וגרור את ☰ לשינוי הסדר.", drag: "גרור לשינוי הסדר", empty: "הרשימה ריקה. אפשר להוסיף פריט למטה." },
    en: { add: "Add an item…", addBtn: "Add", del: "Deleted", undo: "Undo", moved: "Moved to ", moveTo: "Move to which list?", cancel: "Cancel",
      hint: "Swipe right to delete, swipe left to move to another list, drag ☰ to reorder.", drag: "Drag to reorder", empty: "The list is empty. You can add an item below." }
  };
  function p() { return P[lang]; }
  var toastT = null;
  function toast(msg, undoFn) {
    var el = $("toast"); el.innerHTML = '<span>' + esc(msg) + '</span>';
    if (undoFn) { var b = document.createElement("button"); b.type = "button"; b.textContent = p().undo; b.onclick = function () { el.hidden = true; undoFn(); }; el.appendChild(b); }
    el.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { el.hidden = true; }, 5000);
  }
  function renderPower(list, ul) {
    ul.className = "items power";
    $("instr").textContent = p().hint;
    $("listfoot").hidden = true; $("soon").hidden = true; $("list-more").hidden = true;
    $("p-add").placeholder = p().add; $("p-add-btn").textContent = p().addBtn;
    var arr = powerItems();
    arr.forEach(function (it) {
      var li = document.createElement("li"); li.className = "drow prow"; li.setAttribute("data-id", it.id);
      li.innerHTML = '<span class="sw sw-del" aria-hidden="true">🗑️</span><span class="sw sw-mv" aria-hidden="true">↪️</span>' +
        '<div class="item pitem"><span class="tw"><span class="t">' + esc(it.he) + '</span>' + (it.note ? '<span class="d">' + esc(it.note) + '</span>' : "") + '</span></div>' +
        '<span class="hdl" role="button" aria-label="' + p().drag + '">☰</span>';
      enableSwipe(li, it);
      ul.appendChild(li);
    });
    if (!arr.length) { var e = document.createElement("li"); e.className = "pempty"; e.textContent = p().empty; ul.appendChild(e); }
    enableTouchDrag(ul);
    var q = list.questions, qb = $("questions");
    qb.innerHTML = q ? "<h3>" + esc(nm(q.title)) + "</h3><ul>" + q.items.map(function (x) { return "<li>" + esc(nm(x)) + "</li>"; }).join("") + "</ul>" : "";
  }
  function deletePower(it) {
    var arr = powerItems(), i = -1; arr.forEach(function (x, k) { if (x.id === it.id) i = k; });
    if (i < 0) return; var before = arr.slice(); arr.splice(i, 1); savePower(arr); renderList();
    toast(p().del + ": " + it.he, function () { savePower(before); renderList(); });
  }
  function movePower(it, toId) {
    var u = getUser(), before = JSON.stringify(u);
    u.power = powerItems().filter(function (x) { return x.id !== it.id; });
    u.extra = u.extra || {}; u.extra[toId] = (u.extra[toId] || []).concat([it.note ? { he: it.he, detail: { he: it.note } } : { he: it.he }]);
    saveUser(u); renderList();
    toast(p().moved + nm(rawList(toId).title), function () { set(USER_KEY, before); saveUser(JSON.parse(before)); renderList(); });
  }
  function pickList(it) {
    var s = $("mv-sheet"), g = $("mv-grid"); $("mv-title").textContent = p().moveTo; g.innerHTML = "";
    D.lists.forEach(function (l) {
      if (l.id === "power") return;
      var b = document.createElement("button"); b.type = "button"; b.className = "choice mvopt";
      b.innerHTML = '<span class="ic" aria-hidden="true">' + esc(l.icon) + '</span><span class="tx">' + esc(nm(l.title)) + "</span>";
      b.onclick = function () { s.hidden = true; movePower(it, l.id); };
      g.appendChild(b);
    });
    var c = document.createElement("button"); c.type = "button"; c.className = "btn"; c.textContent = p().cancel; c.onclick = function () { s.hidden = true; }; g.appendChild(c);
    s.hidden = false;
  }
  function enableSwipe(li, it) {
    var card = li.querySelector(".pitem"), x0 = 0, y0 = 0, dx = 0, on = false, horiz = null, pid = null;
    card.addEventListener("pointerdown", function (e) { if (e.button > 0) return; on = true; horiz = null; dx = 0; x0 = e.clientX; y0 = e.clientY; pid = e.pointerId; });
    card.addEventListener("pointermove", function (e) {
      if (!on || e.pointerId !== pid) return;
      var mx = e.clientX - x0, my = e.clientY - y0;
      if (horiz === null && (Math.abs(mx) > 10 || Math.abs(my) > 10)) { horiz = Math.abs(mx) > Math.abs(my); if (horiz) try { card.setPointerCapture(pid); } catch (x) {} }
      if (!horiz) return;
      dx = mx; card.style.transform = "translateX(" + dx + "px)";
      li.classList.toggle("sdel", dx > 30); li.classList.toggle("smv", dx < -30);
    });
    function end() {
      if (!on) return; on = false;
      var w = card.offsetWidth * 0.3;
      card.style.transition = "transform .18s"; card.style.transform = "";
      setTimeout(function () { card.style.transition = ""; }, 200);
      li.classList.remove("sdel", "smv");
      if (horiz && dx > w) deletePower(it); else if (horiz && dx < -w) pickList(it);
    }
    card.addEventListener("pointerup", end); card.addEventListener("pointercancel", end);
  }
  /* ☰ drag: press-and-hold lifts (touch), mouse lifts at once; auto-scroll near screen edges */
  function enableTouchDrag(ul) {
    if (ul._td) return; ul._td = true;
    ul.addEventListener("pointerdown", function (e) {
      var h = e.target.closest(".hdl"); if (!h || !ul.classList.contains("power")) return;
      e.preventDefault();
      var li = h.closest("li"), lifted = false, y = e.clientY, raf = 0, timer = null;
      try { h.setPointerCapture(e.pointerId); } catch (x) {}
      function lift() { lifted = true; li.classList.add("lifted"); ul.classList.add("dragging"); if (navigator.vibrate) try { navigator.vibrate(15); } catch (x) {} tick(); }
      if (e.pointerType === "mouse") lift(); else timer = setTimeout(lift, 180);
      function place() {
        var rows = Array.prototype.slice.call(ul.querySelectorAll(".prow"));
        for (var i = 0; i < rows.length; i++) {
          var r = rows[i]; if (r === li) continue; var b = r.getBoundingClientRect();
          if (y > b.top && y < b.bottom) { if (y < b.top + b.height / 2) ul.insertBefore(li, r); else ul.insertBefore(li, r.nextSibling); break; }
        }
      }
      function tick() {
        if (!lifted) return; var H = window.innerHeight, sp = 0;
        if (y < 80) sp = -Math.ceil((80 - y) / 6); else if (y > H - 80) sp = Math.ceil((y - (H - 80)) / 6);
        if (sp) { window.scrollBy(0, sp); place(); }
        raf = requestAnimationFrame(tick);
      }
      function mv(ev) { y = ev.clientY; if (!lifted) { if (Math.abs(ev.clientY - e.clientY) > 8) { clearTimeout(timer); lift(); } return; } place(); }
      function up() {
        clearTimeout(timer); cancelAnimationFrame(raf);
        h.removeEventListener("pointermove", mv); h.removeEventListener("pointerup", up); h.removeEventListener("pointercancel", up);
        if (!lifted) return; li.classList.remove("lifted"); ul.classList.remove("dragging");
        var byId = {}; powerItems().forEach(function (x) { byId[x.id] = x; });
        savePower(Array.prototype.map.call(ul.querySelectorAll(".prow"), function (r) { return byId[r.getAttribute("data-id")]; }).filter(Boolean));
      }
      h.addEventListener("pointermove", mv); h.addEventListener("pointerup", up); h.addEventListener("pointercancel", up);
    });
  }
  function addPower() {
    var v = $("p-add").value.trim(); if (!v) return;
    var he = v, note = ""; var k = v.indexOf(" - "); if (k > 0) { he = v.slice(0, k).trim(); note = v.slice(k + 3).trim(); }
    var arr = powerItems().slice(); arr.push({ id: uid(), he: he, note: note }); savePower(arr);
    $("p-add").value = ""; renderList();
  }
  $("p-add-btn").onclick = addPower;
  $("p-add").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addPower(); } });
  $("mv-sheet").onclick = function (e) { if (e.target === this) this.hidden = true; };
  window.addEventListener("storage", function (e) { if (e.key === USER_KEY && e.isTrusted && current) renderList(); });

  function renderCount(list) {
    var n = countChecked(list);
    $("count").textContent = t().count(n, itemsOf(list).length);
    $("clear-btn").disabled = !n; $("clear-btn").style.opacity = n ? "1" : ".5";
  }

  function renderBgGrid() {
    var g = $("bg-grid"); g.innerHTML = "";
    D.backgrounds.forEach(function (b) {
      var o = document.createElement("button");
      o.type = "button"; o.className = "bgopt"; o.setAttribute("aria-pressed", b.id === bg ? "true" : "false");
      o.innerHTML = '<img src="bg/' + esc(b.id) + '-t.webp" alt="" loading="lazy" width="180" height="320"><span>' + esc(nm(b)) + "</span>";
      o.onclick = function () { bg = b.id; set(BG_KEY, bg); applyBg(); renderBgGrid(); };
      g.appendChild(o);
    });
  }

  function route() {
    var id = (location.hash || "").slice(1);
    if (current !== (findList(id) ? id : null)) openInfo = null;
    current = findList(id) ? id : null;
    $("home").hidden = !!current; $("list").hidden = !current;
    if (current) renderList(); else renderHome();
    window.scrollTo(0, 0);
  }

  function renderAll() {
    var he = lang === "he";
    document.documentElement.lang = lang;
    document.documentElement.dir = he ? "rtl" : "ltr";
    document.title = nm(D.APP_NAME) + (he ? " · " + D.APP_NAME.en : "");
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
    var c = $("crisis"); c.innerHTML = esc(t().crisis).replace(/(\d{3}-\d{7}|1201)/g, "<bdi>$1</bdi>") + " ";
    var a = document.createElement("a"); a.href = "https://www.eran.org.il/"; a.target = "_blank"; a.rel = "noopener"; a.textContent = "eran.org.il"; c.appendChild(a);
    applyTheme(); renderBgGrid(); route();
  }

  $("lang-he").onclick = function () { lang = "he"; set(LANG_KEY, "he"); renderAll(); };
  $("lang-en").onclick = function () { lang = "en"; set(LANG_KEY, "en"); renderAll(); };
  $("theme-btn").onclick = function () { theme = theme === "light" ? "dark" : "light"; set(THEME_KEY, theme); applyTheme(); };
  $("home-btn").onclick = function () { if (history.length > 1 && current) history.back(); else location.hash = ""; };
  $("clear-btn").onclick = function () { if (current) { setChecked(current, []); renderList(); } };
  $("bg-btn").onclick = function () { $("bg-sheet").hidden = false; };
  $("bg-close").onclick = function () { $("bg-sheet").hidden = true; };
  $("bg-sheet").onclick = function (e) { if (e.target === this) this.hidden = true; };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { $("bg-sheet").hidden = true; $("mv-sheet").hidden = true; } });
  window.addEventListener("hashchange", route);

  /* ----- install: visible unless already installed ----- */
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

  applyBg(); renderAll(); updateInstall();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  }
})();
