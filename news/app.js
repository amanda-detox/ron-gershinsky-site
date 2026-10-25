/* Updates (עדכונים): daily news feed from news.json. */
(function () {
  "use strict";
  var LANG_KEY = "rg-lang", THEME_KEY = "rg-news-theme", TOPIC_KEY = "rg-news-topic", BG_KEY = "rg-news-bg";
  var TZ = "Asia/Jerusalem";
  var L = {
    he: {
      title: "עדכוניפיי", doc: "עדכוניפיי · Updatify",
      tagline: "החדשות על האנשים והחברות שאתה עוקב אחריהם, מתעדכן פעם ביום",
      back: "← חזרה לאתר", updated: "עודכן לאחרונה:", loading: "טוען עדכונים…",
      refresh: "רענון", all: "הכול", people: "אנשים", companies: "חברות ונושאים",
      read: "למקור", empty: "אין עדכונים בנושא הזה כרגע.",
      error: "לא הצלחנו לטעון את העדכונים. בדוק את החיבור ונסה שוב.",
      offline: "מוצגים עדכונים שמורים (אין חיבור)",
      note: "התקצירים נכתבו על סמך המקורות המקושרים. כדאי לפתוח את המקור לפרטים המלאים. אין לראות בתוכן ייעוץ רפואי או פיננסי.",
      dark: "לילה", light: "בהיר", toLight: "מעבר למצב בהיר", toDark: "מעבר למצב לילה",
      install: "📲 התקנה למסך הבית",
      ios: "באייפון או באייפד: לוחצים על כפתור השיתוף (□↑) בתחתית Safari, ואז בוחרים „הוסף למסך הבית”.",
      other: "פותחים את תפריט הדפדפן (⋮) ובוחרים „התקנת אפליקציה” או „הוספה למסך הבית”.",
      bgTitle: "בחירת רקע", bgBtn: "בחירת רקע",
      bgs: ["זוהר צפוני", "שקיעה", "ניאון", "לגונה", "ערפילית", "גחלים", "יער בדמדומים", "פירות יער", "פריזמה", "זהב של חצות"],
      close: "סגירה", prev: "נושאים קודמים", next: "נושאים נוספים",
      locale: "he-IL"
    },
    en: {
      title: "Updatify", doc: "Updatify · עדכוניפיי",
      tagline: "News on the people and companies you follow, refreshed daily",
      back: "← Back to site", updated: "Last updated:", loading: "Loading updates…",
      refresh: "Refresh", all: "All", people: "People", companies: "Companies & topics",
      read: "Source", empty: "No updates on this topic right now.",
      error: "Couldn't load updates. Check your connection and try again.",
      offline: "Showing saved updates (offline)",
      note: "Summaries are based on the linked sources. Open the source for full details. Nothing here is medical or financial advice.",
      dark: "Night", light: "Light", toLight: "Switch to light mode", toDark: "Switch to night mode",
      install: "📲 Add to home screen",
      ios: "On iPhone or iPad: tap the Share button (□↑) at the bottom of Safari, then choose “Add to Home Screen”.",
      other: "Open your browser menu (⋮) and choose “Install app” or “Add to Home screen”.",
      bgTitle: "Choose background", bgBtn: "Choose background",
      bgs: ["Aurora", "Sunset", "Neon mesh", "Lagoon", "Nebula", "Ember", "Forest dusk", "Berry swirl", "Prism", "Midnight gold"],
      close: "Close", prev: "Previous topics", next: "More topics",
      locale: "en-GB"
    }
  };
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"/></svg>';
  var EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';

  function $(id) { return document.getElementById(id); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var lang = get(LANG_KEY) === "en" ? "en" : "he";
  var theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  var topic = get(TOPIC_KEY) || "all";
  var bg = document.documentElement.getAttribute("data-bg") || "2";
  var TC = window.RG_BG_TC || {};
  var data = null, offline = false, loading = false, lastFetch = 0;
  function t() { return L[lang]; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pick(o) { return (o && (o[lang] || o.he || o.en)) || {}; }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : "#"; }

  function fmtDate(iso, withTime) {
    var d = new Date(iso); if (isNaN(d)) return "";
    var o = { timeZone: TZ, day: "numeric", month: "short" };
    if (withTime) { o.hour = "2-digit"; o.minute = "2-digit"; o.hour12 = false; }
    if (d.getFullYear() !== new Date().getFullYear()) o.year = "numeric";
    try { return new Intl.DateTimeFormat(t().locale, o).format(d); } catch (e) { return d.toLocaleString(); }
  }
  function rel(iso) {
    var d = new Date(iso); if (isNaN(d)) return "";
    var s = (d - Date.now()) / 1000, a = Math.abs(s);
    if (a > 86400 * 6) return fmtDate(iso, false);
    try {
      var rf = new Intl.RelativeTimeFormat(t().locale, { numeric: "auto" });
      if (a < 3600) return rf.format(Math.round(s / 60), "minute");
      if (a < 86400) return rf.format(Math.round(s / 3600), "hour");
      return rf.format(Math.round(s / 86400), "day");
    } catch (e) { return fmtDate(iso, false); }
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", theme);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", theme === "light" ? "#f3efe6" : (TC[bg] || "#e9506a"));
    if (theme === "light") closeSheet();
    var b = $("theme-btn");
    b.querySelector(".ti").innerHTML = theme === "light" ? MOON : SUN;
    b.querySelector(".tl").textContent = theme === "light" ? t().dark : t().light;
    b.setAttribute("aria-label", theme === "light" ? t().toDark : t().toLight);
  }

  function renderChrome() {
    var he = lang === "he";
    document.documentElement.lang = lang;
    document.documentElement.dir = he ? "rtl" : "ltr";
    document.title = t().doc;
    $("lang-he").setAttribute("aria-pressed", he ? "true" : "false");
    $("lang-en").setAttribute("aria-pressed", he ? "false" : "true");
    $("back").textContent = t().back;
    $("title").textContent = t().title;
    $("tagline").textContent = t().tagline;
    $("refresh-l").textContent = t().refresh;
    $("install-btn").textContent = t().install;
    if (!$("install-hint").hidden) $("install-hint").textContent = t()[isIOS ? "ios" : "other"];
    $("note").textContent = t().note;
    $("bg-btn").setAttribute("aria-label", t().bgBtn); $("bg-btn").title = t().bgBtn;
    $("bg-title").textContent = t().bgTitle; $("bg-close").setAttribute("aria-label", t().close);
    $("chip-prev").setAttribute("aria-label", t().prev); $("chip-next").setAttribute("aria-label", t().next);
    renderSwatches();
    applyTheme();
  }

  function renderStatus() {
    var el = $("updated");
    if (!data) { el.textContent = loading ? t().loading : ""; return; }
    var age = (Date.now() - new Date(data.updated)) / 3600000;
    var cls = offline ? "off" : age > 36 ? "stale" : "";
    el.innerHTML = '<span class="dot ' + cls + '"></span>' + esc(t().updated) + " <b>" + esc(fmtDate(data.updated, true)) + "</b>" +
      (offline ? " · " + esc(t().offline) : "");
  }

  function topicsWithItems() {
    var count = {};
    data.items.forEach(function (it) { count[it.topic] = (count[it.topic] || 0) + 1; });
    return { list: data.topics.filter(function (tp) { return count[tp.id]; }), count: count };
  }

  function renderChips() {
    var nav = $("chips"); nav.innerHTML = "";
    if (!data) return;
    var tw = topicsWithItems();
    if (topic !== "all" && !tw.count[topic]) topic = "all";
    function chip(id, label, n) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip";
      b.setAttribute("aria-pressed", topic === id ? "true" : "false");
      b.innerHTML = esc(label) + (n ? '<span class="n">' + n + "</span>" : "");
      b.onclick = function () { topic = id; set(TOPIC_KEY, id); renderChips(); renderFeed(); window.scrollTo({ top: 0, behavior: "smooth" }); };
      nav.appendChild(b);
      if (topic === id && b.scrollIntoView) setTimeout(function () { b.scrollIntoView({ block: "nearest", inline: "center" }); }, 0);
    }
    chip("all", t().all, data.items.length);
    var lastGroup = null;
    tw.list.forEach(function (tp) {
      if (lastGroup && tp.group !== lastGroup) { var s = document.createElement("span"); s.className = "sep"; nav.appendChild(s); }
      lastGroup = tp.group;
      chip(tp.id, tp[lang] || tp.he, tw.count[tp.id]);
    });
    setTimeout(updateArrows, 0);
  }

  function card(it) {
    var c = pick(it);
    return '<article class="card"><h3>' + esc(c.title) + "</h3><p>" + esc(c.summary) + '</p><div class="meta"><span>' +
      esc(rel(it.date)) + (it.source ? " · " + esc(it.source) : "") + '</span><a href="' + esc(safeUrl(it.url)) +
      '" target="_blank" rel="noopener noreferrer">' + esc(t().read) + EXT + "</a></div></article>";
  }

  function renderFeed() {
    var feed = $("feed");
    if (!data) { feed.innerHTML = loading ? '<div class="empty">' + esc(t().loading) + "</div>" : '<div class="err">' + esc(t().error) + "</div>"; return; }
    var tw = topicsWithItems(), html = "";
    tw.list.forEach(function (tp) {
      if (topic !== "all" && topic !== tp.id) return;
      var its = data.items.filter(function (it) { return it.topic === tp.id; })
        .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      html += '<section class="group"><h2>' + esc(tp[lang] || tp.he) + "</h2>" + its.map(card).join("") + "</section>";
    });
    feed.innerHTML = html || '<div class="empty">' + esc(t().empty) + "</div>";
  }

  function renderAll() { renderChrome(); renderStatus(); renderChips(); renderFeed(); }

  function load(manual) {
    if (loading) return;
    loading = true; $("refresh").classList.add("spin"); if (!data) { renderStatus(); renderFeed(); }
    fetch("news.json?t=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error(r.status); return r.json();
    }).then(function (j) {
      if (!j || !Array.isArray(j.items) || !Array.isArray(j.topics)) throw new Error("bad");
      data = j; offline = !navigator.onLine; lastFetch = Date.now();
      try { localStorage.setItem("rg-news-cache", JSON.stringify(j)); } catch (e) {}
    }).catch(function () {
      if (!data) { try { data = JSON.parse(get("rg-news-cache") || "null"); } catch (e) { data = null; } }
      offline = true;
    }).then(function () {
      loading = false; $("refresh").classList.remove("spin"); renderStatus(); renderChips(); renderFeed();
    });
  }

  /* ----- background picker (night mode only) ----- */
  function renderSwatches() {
    var box = $("swatches"), html = "";
    for (var i = 1; i <= 10; i++) {
      html += '<button type="button" class="sw" data-bg="' + i + '" aria-pressed="' + (String(i) === bg ? "true" : "false") + '">' +
        '<span class="pv" style="background:var(--bgi-' + i + '),var(--bgc-' + i + ')"><span class="num">' + i + '</span></span>' +
        '<span class="nm">' + esc(t().bgs[i - 1]) + "</span></button>";
    }
    box.innerHTML = html;
  }
  function setBg(v) {
    bg = String(v); set(BG_KEY, bg);
    document.documentElement.setAttribute("data-bg", bg);
    applyTheme(); renderSwatches();
  }
  function openSheet() { renderSwatches(); $("bg-sheet").hidden = false; }
  function closeSheet() { $("bg-sheet").hidden = true; }
  $("bg-btn").onclick = openSheet;
  $("bg-close").onclick = closeSheet;
  $("bg-sheet").addEventListener("click", function (e) {
    if (e.target === $("bg-sheet")) { closeSheet(); return; }
    var b = e.target.closest && e.target.closest(".sw"); if (b) setBg(b.getAttribute("data-bg"));
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });

  /* ----- chips row: arrows, wheel, drag (desktop) ----- */
  function rtl() { return document.documentElement.dir === "rtl"; }
  function chipPos() { var c = $("chips"); return { pos: Math.abs(c.scrollLeft), max: c.scrollWidth - c.clientWidth }; }
  function updateArrows() {
    var p = chipPos(), over = p.max > 4;
    $("chip-prev").hidden = !over || p.pos <= 4;
    $("chip-next").hidden = !over || p.pos >= p.max - 4;
  }
  function scrollChips(dir) { // dir: +1 toward the end, -1 toward the start
    var c = $("chips"); c.scrollBy({ left: dir * (rtl() ? -1 : 1) * Math.max(160, c.clientWidth * 0.7), behavior: "smooth" });
  }
  $("chip-prev").onclick = function () { scrollChips(-1); };
  $("chip-next").onclick = function () { scrollChips(1); };
  $("chips").addEventListener("scroll", updateArrows, { passive: true });
  window.addEventListener("resize", updateArrows);
  $("chips").addEventListener("wheel", function (e) {
    var c = $("chips"); if (c.scrollWidth <= c.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    e.preventDefault(); c.style.scrollBehavior = "auto"; c.scrollLeft += (rtl() ? -1 : 1) * e.deltaY; c.style.scrollBehavior = "";
  }, { passive: false });
  (function () {
    var c = $("chips"), down = false, moved = false, x0 = 0, s0 = 0;
    c.addEventListener("pointerdown", function (e) { if (e.pointerType !== "mouse" || e.button !== 0) return; down = true; moved = false; x0 = e.clientX; s0 = c.scrollLeft; });
    window.addEventListener("pointermove", function (e) {
      if (!down) return; var dx = e.clientX - x0;
      if (!moved && Math.abs(dx) > 5) { moved = true; c.classList.add("dragging"); }
      if (moved) c.scrollLeft = s0 - dx;
    });
    window.addEventListener("pointerup", function () { if (!down) return; down = false; setTimeout(function () { c.classList.remove("dragging"); }, 0); });
  })();

  /* ----- events ----- */
  $("lang-he").onclick = function () { lang = "he"; set(LANG_KEY, lang); renderAll(); };
  $("lang-en").onclick = function () { lang = "en"; set(LANG_KEY, lang); renderAll(); };
  $("theme-btn").onclick = function () { theme = theme === "light" ? "dark" : "light"; set(THEME_KEY, theme); applyTheme(); };
  $("refresh").onclick = function () { load(true); };
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && Date.now() - lastFetch > 30 * 60 * 1000) load();
  });
  window.addEventListener("online", function () { load(); });

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
  renderAll();
  updateInstall();
  load();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  }
})();
