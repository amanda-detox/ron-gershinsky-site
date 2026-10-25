/* Monthly (חודשיפיי): awareness months + subscribable monthly topic tracks. Content is in data.js. */
(function () {
  "use strict";
  var LANG_KEY = "rg-lang", THEME_KEY = "rg-monthly-theme", SUBS_KEY = "rg-monthly-subs", PANEL_KEY = "rg-monthly-panel";
  var AWARE = { id: "awareness", color: "#ff8a5c", icon: "🎗️", he: "חודשי מודעות", en: "Awareness months" };
  var L = {
    he: {
      title: "חודשיפיי", doc: "חודשיפיי · Monthly", back: "← חזרה לאתר",
      tagline: "לכל חודש הנושאים שלו: חודשי מודעות ונושאים שבחרת",
      months: ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"],
      now: "החודש", panel: "הנושאים שלי", sub: "סמן ✓ ליד הנושאים שתרצה לראות. בכל חודש יופיע פריט אחר מכל נושא.",
      selected: function (n) { return n === 1 ? "נושא אחד נבחר" : n + " נושאים נבחרו"; },
      all: "בחירת הכול", none: "ניקוי", us: "ארה״ב", intl: "בינלאומי", src: "מקור",
      empty: "אין נושאים לחודש הזה. אפשר לסמן נושאים למעלה.",
      note: "חודשי המודעות הם בעיקר ימי מודעות מוכרים בארה״ב, עם כמה בינלאומיים. הנושאים הם שמות בלבד ואינם ייעוץ רפואי או פיננסי.",
      dark: "לילה", light: "בהיר", toLight: "מעבר למצב בהיר", toDark: "מעבר למצב לילה",
      install: "📲 התקנה למסך הבית",
      ios: "באייפון או באייפד: לוחצים על כפתור השיתוף (□↑) בתחתית Safari, ואז בוחרים „הוסף למסך הבית”.",
      other: "פותחים את תפריט הדפדפן (⋮) ובוחרים „התקנת אפליקציה” או „הוספה למסך הבית”."
    },
    en: {
      title: "Monthly", doc: "Monthly · חודשיפיי", back: "← Back to site",
      tagline: "Every month has its topics: awareness months plus the tracks you pick",
      months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
      now: "This month", panel: "My topics", sub: "Tick ✓ the tracks you want to follow. Each month shows a different item from every track.",
      selected: function (n) { return n === 1 ? "1 selected" : n + " selected"; },
      all: "Select all", none: "Clear", us: "US", intl: "International", src: "Source",
      empty: "No topics this month. Tick some tracks above.",
      note: "Awareness months are mostly well-known US observances, plus a few international ones. Topics are names only, not medical or financial advice.",
      dark: "Night", light: "Light", toLight: "Switch to light mode", toDark: "Switch to night mode",
      install: "📲 Add to home screen",
      ios: "On iPhone or iPad: tap the Share button (□↑) at the bottom of Safari, then choose “Add to Home Screen”.",
      other: "Open your browser menu (⋮) and choose “Install app” or “Add to Home screen”."
    }
  };
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

  var D = window.MONTHLY_DATA || { awareness: {}, tracks: [] };
  function $(id) { return document.getElementById(id); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  var lang = get(LANG_KEY) === "en" ? "en" : "he";
  var theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  function t() { return L[lang]; }
  function nm(o) { return (o && (o[lang] || o.he || o.en)) || ""; }

  /* subscriptions: { awareness: true (default on), <trackId>: true } */
  var subs = { awareness: true };
  try { var s = JSON.parse(get(SUBS_KEY) || "null"); if (s && typeof s === "object") subs = s; } catch (e) {}
  function saveSubs() { set(SUBS_KEY, JSON.stringify(subs)); }
  var ALL = [AWARE].concat(D.tracks);

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", theme);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", theme === "light" ? "#fbf1e6" : "#3a1450");
    var b = $("theme-btn");
    b.querySelector(".ti").innerHTML = theme === "light" ? MOON : SUN;
    b.querySelector(".tl").textContent = theme === "light" ? t().dark : t().light;
    b.setAttribute("aria-label", theme === "light" ? t().toDark : t().toLight);
  }

  function renderOpts() {
    var box = $("opts"); box.innerHTML = "";
    ALL.forEach(function (tr) {
      var lab = document.createElement("label");
      lab.className = "opt" + (subs[tr.id] ? " on" : "");
      lab.style.setProperty("--c", tr.color);
      lab.innerHTML = '<input type="checkbox"' + (subs[tr.id] ? " checked" : "") + '><span class="box">' + CHECK + '</span><span class="em" aria-hidden="true">' + tr.icon + "</span><span>" + esc(nm(tr)) + "</span>";
      lab.querySelector("input").onchange = function (e) {
        if (e.target.checked) subs[tr.id] = true; else delete subs[tr.id];
        saveSubs(); lab.classList.toggle("on", e.target.checked); renderCount(); renderMonths(false);
      };
      box.appendChild(lab);
    });
    renderCount();
  }
  function renderCount() {
    var n = ALL.filter(function (tr) { return subs[tr.id]; }).length;
    $("panel-cnt").textContent = t().selected(n);
  }

  function renderMonths(scroll) {
    var main = $("months"), cur = new Date().getMonth(), nowEl = null;
    main.innerHTML = "";
    for (var i = 0; i < 12; i++) {
      var items = [];
      if (subs.awareness) (D.awareness[i + 1] || []).forEach(function (a) { items.push({ tr: AWARE, it: a }); });
      D.tracks.forEach(function (tr) { if (subs[tr.id] && tr.items[i]) items.push({ tr: tr, it: tr.items[i] }); });
      var sec = document.createElement("section");
      sec.className = "month" + (i === cur ? " now" : "");
      sec.id = "m" + (i + 1);
      var h = '<h2><span class="num">' + (i + 1) + "</span>" + esc(t().months[i]) + (i === cur ? '<span class="badge">' + esc(t().now) + "</span>" : "") + "</h2>";
      if (!items.length) h += '<div class="none">' + esc(t().empty) + "</div>";
      else {
        h += "<ul>";
        items.forEach(function (x) {
          var tags = '<span class="tag" style="--c:' + x.tr.color + '">' + x.tr.icon + " " + esc(nm(x.tr.tag || x.tr)) + "</span>";
          if (x.it.where) tags += '<span class="tag" style="--c:#94a3b8">' + esc(x.it.where === "us" ? t().us : t().intl) + "</span>";
          var u = safeUrl(x.it.src);
          if (u) tags += '<a class="tag src" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(t().src) + " ↗</a>";
          h += '<li style="--c:' + x.tr.color + '"><span class="dot"></span><div class="txt"><div class="name">' + esc(nm(x.it)) + '</div><div class="tags">' + tags + "</div></div></li>";
        });
        h += "</ul>";
      }
      sec.innerHTML = h;
      main.appendChild(sec);
      if (i === cur) nowEl = sec;
    }
    if (scroll && nowEl) setTimeout(function () { nowEl.scrollIntoView({ block: "start", behavior: "auto" }); }, 50);
  }

  function renderAll(scroll) {
    var he = lang === "he";
    document.documentElement.lang = lang;
    document.documentElement.dir = he ? "rtl" : "ltr";
    document.title = t().doc;
    $("lang-he").setAttribute("aria-pressed", he ? "true" : "false");
    $("lang-en").setAttribute("aria-pressed", he ? "false" : "true");
    $("back").textContent = t().back;
    $("title").textContent = t().title;
    $("tagline").textContent = t().tagline;
    $("panel-title").textContent = t().panel;
    $("panel-sub").textContent = t().sub;
    $("all-btn").textContent = t().all;
    $("none-btn").textContent = t().none;
    $("install-btn").textContent = t().install;
    if (!$("install-hint").hidden) $("install-hint").textContent = t()[isIOS ? "ios" : "other"];
    $("note").textContent = t().note;
    applyTheme(); renderOpts(); renderMonths(scroll);
  }

  $("lang-he").onclick = function () { lang = "he"; set(LANG_KEY, "he"); renderAll(false); };
  $("lang-en").onclick = function () { lang = "en"; set(LANG_KEY, "en"); renderAll(false); };
  $("theme-btn").onclick = function () { theme = theme === "light" ? "dark" : "light"; set(THEME_KEY, theme); applyTheme(); };
  $("all-btn").onclick = function () { ALL.forEach(function (tr) { subs[tr.id] = true; }); saveSubs(); renderOpts(); renderMonths(false); };
  $("none-btn").onclick = function () { subs = {}; saveSubs(); renderOpts(); renderMonths(false); };
  /* panel opens by default until the user picks a track; remembers open/closed after that */
  var p = get(PANEL_KEY);
  $("panel").open = p ? p === "open" : D.tracks.every(function (tr) { return !subs[tr.id]; });
  $("panel").addEventListener("toggle", function () { set(PANEL_KEY, $("panel").open ? "open" : "closed"); });

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

  /* ----- boot ----- */
  renderAll(!$("panel").open);
  updateInstall();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  }
})();
