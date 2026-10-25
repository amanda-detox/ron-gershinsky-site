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
  function findList(id) { for (var i = 0; i < D.lists.length; i++) if (D.lists[i].id === id) return D.lists[i]; return null; }

  /* checked items are stored by their Hebrew text, so reordering/adding items in data.js keeps choices */
  function getChecked(id) { try { var a = JSON.parse(get(CHK_PREFIX + id) || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function setChecked(id, arr) { set(CHK_PREFIX + id, JSON.stringify(arr)); }
  function itemsOf(list) {
    if (list.items) return list.items;
    var a = []; (list.sections || []).forEach(function (sec) { a = a.concat(sec.items || []); }); return a;
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
    if (list.style === "info") renderInfoList(list, ul, chk);
    else list.items.forEach(function (it) {
      var li = document.createElement("li");
      var on = chk.indexOf(it.he) !== -1;
      li.innerHTML = '<label class="item' + (on ? " on" : "") + '"><input type="checkbox"' + (on ? " checked" : "") + '><span class="box">' + CHECK + '</span><span class="tw"><span class="t">' + esc(nm(it)) + "</span>" + (it.detail ? '<span class="d">' + esc(nm(it.detail)) + "</span>" : "") + "</span></label>";
      li.querySelector("input").onchange = function (e) {
        var c = getChecked(list.id).filter(function (x) { return x !== it.he; });
        if (e.target.checked) c.push(it.he);
        setChecked(list.id, c); li.firstChild.classList.toggle("on", e.target.checked); renderCount(list);
      };
      ul.appendChild(li);
    });
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
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") $("bg-sheet").hidden = true; });
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
