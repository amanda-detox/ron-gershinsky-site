/* Shared logic for Ron's private apps (my/): language (rg-lang), night/light (rg-home-theme), install button,
   data-i18n texts, and a sign-in gate. Each page sets window.RGMY_STRINGS = { he: {...}, en: {...} } before this file. */
(function () {
  "use strict";
  var d = document.documentElement;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var COMMON = {
    he: {
      back: "→ חזרה לדף הראשי", backHub: "→ האפליקציות הפרטיות שלי", langLabel: "שפה",
      dark: "לילה", light: "בהיר", toLight: "מעבר למצב בהיר", toDark: "מעבר למצב לילה",
      install: "📲 התקנה למסך הבית",
      ios: "באייפון או באייפד: לוחצים על כפתור השיתוף (□↑) בתחתית Safari, ואז בוחרים „הוסף למסך הבית”.",
      other: "פותחים את תפריט הדפדפן (⋮) ובוחרים „התקנת אפליקציה” או „הוספה למסך הבית”.",
      gateTitle: "האזור הפרטי שלך", gateText: "התחבר לחשבון שלך כדי לראות את האפליקציות הפרטיות שלך. הנתונים שלך שמורים בחשבון ונגישים רק לך.",
      privNote: "🔒 הנתונים באזור הזה נשמרים בחשבון שלך, ורק אתה יכול לראות אותם.",
      footer: "© כל הזכויות שמורות לחברת היליפיי בע\"מ 2026"
    },
    en: {
      back: "← Back to the main page", backHub: "← My private apps", langLabel: "Language",
      dark: "Night", light: "Light", toLight: "Switch to light mode", toDark: "Switch to night mode",
      install: "📲 Add to home screen",
      ios: "On iPhone or iPad: tap the Share button (□↑) at the bottom of Safari, then choose “Add to Home Screen”.",
      other: "Open your browser menu (⋮) and choose “Install app” or “Add to Home screen”.",
      gateTitle: "Your private area", gateText: "Sign in to your account to see your private apps. Your data is stored in your account and only you can see it.",
      privNote: "🔒 Data in this area is stored in your account, and only you can see it.",
      footer: "© 2026 Healify Ltd. All rights reserved."
    }
  };
  var PAGE = window.RGMY_STRINGS || { he: {}, en: {} };
  var lang = lsGet("rg-lang") === "en" ? "en" : "he";
  var theme = lsGet("rg-home-theme") === "light" ? "light" : "dark";
  var subs = [];
  function t(k) { var p = PAGE[lang] || {}; return k in p ? p[k] : COMMON[lang][k]; }
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"/></svg>';
  function $(id) { return document.getElementById(id); }
  function applyTheme() {
    d.setAttribute("data-theme", theme);
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute("content", theme === "light" ? "#f3efe6" : "#0a1a3f");
    var b = $("theme-btn"); if (!b) return;
    b.innerHTML = '<span class="ti" aria-hidden="true">' + (theme === "light" ? MOON : SUN) + '</span><span class="tl">' + (theme === "light" ? t("dark") : t("light")) + "</span>";
    b.setAttribute("aria-label", theme === "light" ? t("toDark") : t("toLight"));
  }
  function render() {
    d.lang = lang; d.dir = lang === "he" ? "rtl" : "ltr";
    if (t("doc")) document.title = t("doc");
    var all = document.querySelectorAll("[data-i18n]");
    for (var i = 0; i < all.length; i++) all[i].textContent = t(all[i].getAttribute("data-i18n"));
    var ph = document.querySelectorAll("[data-i18n-ph]");
    for (var j = 0; j < ph.length; j++) ph[j].setAttribute("placeholder", t(ph[j].getAttribute("data-i18n-ph")));
    var al = document.querySelectorAll("[data-i18n-label]");
    for (var k = 0; k < al.length; k++) al[k].setAttribute("aria-label", t(al[k].getAttribute("data-i18n-label")));
    var sel = $("lang-sel"); if (sel) { sel.value = lang; sel.setAttribute("aria-label", t("langLabel")); }
    var h = $("install-hint"); if (h && !h.hidden) h.textContent = t(isIOS ? "ios" : "other");
    applyTheme();
    subs.forEach(function (cb) { try { cb(lang); } catch (e) { setTimeout(function () { throw e; }); } });
  }
  function setLang(v) { lang = v === "en" ? "en" : "he"; lsSet("rg-lang", lang); render(); }
  function setTheme(v) { theme = v === "light" ? "light" : "dark"; lsSet("rg-home-theme", theme); applyTheme(); }

  /* install */
  var ua = navigator.userAgent || "", deferred = null;
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function standalone() { return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; }
  function updateInstall() { var w = $("install-wrap"); if (w) w.hidden = standalone(); }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; updateInstall(); });
  window.addEventListener("appinstalled", function () { deferred = null; var w = $("install-wrap"); if (w) w.hidden = true; });

  /* sign-in gate: [data-when="in"] shows only when signed in, [data-when="out"] only when signed out */
  function gate(u) {
    var ins = document.querySelectorAll('[data-when="in"]'), outs = document.querySelectorAll('[data-when="out"]');
    for (var i = 0; i < ins.length; i++) ins[i].hidden = !u;
    for (var j = 0; j < outs.length; j++) outs[j].hidden = !!u;
  }

  function boot() {
    var sel = $("lang-sel"); if (sel) sel.addEventListener("change", function (e) { setLang(e.target.value); });
    var tb = $("theme-btn"); if (tb) tb.addEventListener("click", function () { setTheme(theme === "light" ? "dark" : "light"); });
    var ib = $("install-btn");
    if (ib) ib.addEventListener("click", function () {
      if (deferred) { var x = deferred; deferred = null; try { x.prompt(); (x.userChoice || Promise.resolve()).then(updateInstall, updateInstall); return; } catch (e) {} }
      var h = $("install-hint"); h.textContent = t(isIOS ? "ios" : "other"); h.hidden = !h.hidden;
    });
    render(); updateInstall();
    var A = window.RGAccount;
    gate(A ? A.user() : null);
    if (A) {
      A.onChange(gate);
      A.ready.then(function () { gate(A.user()); });
      // language + night/light are the site-wide settings, synced with the account like on the landing page
      A.syncPrefs(["rg-lang", "rg-home-theme"].concat(window.RGBg ? RGBg.keys : []), function (c) {
        if (window.RGBg && RGBg.apply(c)) return true; // background (rg-my-bg / rg-my-bg-light) handled there
        if ("rg-lang" in c) lang = c["rg-lang"] === "en" ? "en" : "he";
        if ("rg-home-theme" in c) theme = c["rg-home-theme"] === "light" ? "light" : "dark";
        render(); return true;
      });
    }
    if ("serviceWorker" in navigator && location.protocol !== "file:" && window.RGMY_SW) {
      navigator.serviceWorker.register(window.RGMY_SW, { scope: window.RGMY_SW.replace(/sw\.js$/, "") }).catch(function () {});
    }
  }
  window.RGMy = { t: t, lang: function () { return lang; }, onLang: function (cb) { subs.push(cb); }, render: render };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
