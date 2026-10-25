/* Diagnosify (דיאגנוסיפיי): free self-screening checks. Content is in data.js. */
(function () {
  "use strict";
  var LANG_KEY = "rg-lang", THEME_KEY = "rg-diagnosify-theme";
  var L = {
    he: {
      doc: "דיאגנוסיפיי · Diagnosify", back: "← חזרה לאתר", soon: "יצורף בקרוב",
      dark: "לילה", light: "בהיר", toLight: "מעבר למצב בהיר", toDark: "מעבר למצב לילה",
      install: "📲 התקנה למסך הבית",
      ios: "באייפון או באייפד: לוחצים על כפתור השיתוף (□↑) בתחתית Safari, ואז בוחרים „הוסף למסך הבית”.",
      other: "פותחים את תפריט הדפדפן (⋮) ובוחרים „התקנת אפליקציה” או „הוספה למסך הבית”."
    },
    en: {
      doc: "Diagnosify · דיאגנוסיפיי", back: "← Back to site", soon: "Coming soon",
      dark: "Night", light: "Light", toLight: "Switch to light mode", toDark: "Switch to night mode",
      install: "📲 Add to home screen",
      ios: "On iPhone or iPad: tap the Share button (□↑) at the bottom of Safari, then choose “Add to Home Screen”.",
      other: "Open your browser menu (⋮) and choose “Install app” or “Add to Home screen”."
    }
  };
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"/></svg>';

  var D = window.DIAG_DATA || { APP_NAME: { he: "דיאגנוסיפיי", en: "Diagnosify" }, subtitle: {}, checks: [] };
  function $(id) { return document.getElementById(id); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var lang = get(LANG_KEY) === "en" ? "en" : "he";
  var theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  function t() { return L[lang]; }
  function nm(o) { if (typeof o === "string") return o; return (o && (o[lang] || o.he || o.en)) || ""; }

  var openId = null;
  function renderChecks() {
    var main = $("checks"); main.innerHTML = "";
    (D.checks || []).forEach(function (c, i) {
      var el = document.createElement("section");
      var isOpen = openId === c.id;
      el.className = "chk" + (isOpen ? " open" : ""); el.id = "chk-" + c.id;
      var body = nm(c.content) ? '<p style="margin:0">' + esc(nm(c.content)) + "</p>" : '<div class="soon">' + esc(t().soon) + "</div>";
      el.innerHTML = '<button type="button" aria-expanded="' + isOpen + '" aria-controls="p-' + esc(c.id) + '">' +
        '<span class="num" aria-hidden="true">' + (i + 1) + '</span><span class="ttl">' + esc(nm(c.title)) +
        '</span><span class="chev" aria-hidden="true">▼</span></button>' +
        '<div class="panel" id="p-' + esc(c.id) + '"' + (isOpen ? "" : " hidden") + ">" + body + "</div>";
      el.querySelector("button").onclick = function () { openId = openId === c.id ? null : c.id; renderChecks(); };
      main.appendChild(el);
    });
  }

  function applyTheme() {
    document.documentElement.setAttribute("data-theme", theme);
    var m = document.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute("content", theme === "light" ? "#f4f7ff" : "#0f2366");
    var b = $("theme-btn");
    b.querySelector(".ti").innerHTML = theme === "light" ? MOON : SUN;
    b.querySelector(".tl").textContent = theme === "light" ? t().dark : t().light;
    b.setAttribute("aria-label", theme === "light" ? t().toDark : t().toLight);
  }

  function renderAll() {
    var he = lang === "he";
    document.documentElement.lang = lang;
    document.documentElement.dir = he ? "rtl" : "ltr";
    document.title = t().doc;
    $("lang-he").setAttribute("aria-pressed", he ? "true" : "false");
    $("lang-en").setAttribute("aria-pressed", he ? "false" : "true");
    $("back").textContent = t().back;
    $("title").textContent = nm(D.APP_NAME);
    $("tagline").textContent = nm(D.subtitle);
    $("install-btn").textContent = t().install;
    if (!$("install-hint").hidden) $("install-hint").textContent = t()[isIOS ? "ios" : "other"];
    $("intro").textContent = nm(D.intro);
    $("disc").textContent = nm(D.disclaimer);
    applyTheme(); renderChecks();
  }

  $("lang-he").onclick = function () { lang = "he"; set(LANG_KEY, "he"); renderAll(); };
  $("lang-en").onclick = function () { lang = "en"; set(LANG_KEY, "en"); renderAll(); };
  $("theme-btn").onclick = function () { theme = theme === "light" ? "dark" : "light"; set(THEME_KEY, theme); applyTheme(); };

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
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  }
})();
