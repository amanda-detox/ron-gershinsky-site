/* Pumpify (פַּאמְפִּיפַיי): inspiring media. Content is in data.js. */
(function () {
  "use strict";
  var LANG_KEY = "rg-lang", THEME_KEY = "rg-pumpify-theme";
  var L = {
    he: {
      doc: "פאמפיפיי · Pumpify", back: "← חזרה לאתר", soon: "יצורף בקרוב",
      note: "תוכן חדש יתווסף כאן מדי פעם.", open: "צפייה ביוטיוב", listen: "האזנה",
      dark: "לילה", light: "בהיר", toLight: "מעבר למצב בהיר", toDark: "מעבר למצב לילה",
      install: "📲 התקנה למסך הבית",
      ios: "באייפון או באייפד: לוחצים על כפתור השיתוף (□↑) בתחתית Safari, ואז בוחרים „הוסף למסך הבית”.",
      other: "פותחים את תפריט הדפדפן (⋮) ובוחרים „התקנת אפליקציה” או „הוספה למסך הבית”."
    },
    en: {
      doc: "Pumpify · פאמפיפיי", back: "← Back to site", soon: "Coming soon",
      note: "New content will be added here from time to time.", open: "Watch on YouTube", listen: "Listen",
      dark: "Night", light: "Light", toLight: "Switch to light mode", toDark: "Switch to night mode",
      install: "📲 Add to home screen",
      ios: "On iPhone or iPad: tap the Share button (□↑) at the bottom of Safari, then choose “Add to Home Screen”.",
      other: "Open your browser menu (⋮) and choose “Install app” or “Add to Home screen”."
    }
  };
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"/></svg>';

  var D = window.PUMP_DATA || { APP_NAME: { he: "פַּאמְפִּיפַיי", en: "Pumpify" }, subtitle: {}, sections: [] };
  function $(id) { return document.getElementById(id); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  /* local media path (e.g. media/x.mp3) or http(s) URL; nothing else */
  function safeSrc(u) { u = String(u || ""); return safeUrl(u) || (/^[\w./-]+$/.test(u) && u.indexOf("..") === -1 ? u : ""); }
  var lang = get(LANG_KEY) === "en" ? "en" : "he";
  var theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  function t() { return L[lang]; }
  function nm(o) { if (typeof o === "string") return o; return (o && (o[lang] || o.he || o.en)) || ""; }

  function ytId(it) {
    if (it.id && /^[\w-]{6,20}$/.test(it.id)) return it.id;
    var m = String(it.url || "").match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{6,20})/);
    return m ? m[1] : "";
  }
  function textBlock(it) {
    var h = "";
    if (nm(it.title)) h += '<div class="ttl">' + esc(nm(it.title)) + "</div>";
    if (nm(it.note)) h += '<div class="nt">' + esc(nm(it.note)) + "</div>";
    return h;
  }
  function linkCard(url, it, fallback) {
    return '<a class="lnk" href="' + esc(url) + '" target="_blank" rel="noopener"><span class="pl">▶</span><span>' +
      (textBlock(it) || '<div class="ttl">' + esc(fallback) + "</div>") + '</span><span class="ar">↗</span></a>';
  }
  function renderItem(it) {
    var type = it.type || "link", h = "";
    if (type === "youtube") {
      var id = ytId(it);
      if (!id) return "";
      if (it.embed === false) return '<div class="item">' + linkCard("https://www.youtube.com/watch?v=" + id, it, t().open) + "</div>";
      h = '<div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/' + esc(id) + '" title="' + esc(nm(it.title) || "YouTube") +
        '" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>';
      var tb = textBlock(it);
      return '<div class="item">' + h + (tb ? '<div class="body">' + tb + "</div>" : "") + "</div>";
    }
    if (type === "link") {
      var u = safeUrl(it.url);
      return u ? '<div class="item">' + linkCard(u, it, u) + "</div>" : "";
    }
    if (type === "quote") {
      if (!nm(it.text)) return "";
      return '<div class="item"><blockquote class="q"><p>' + esc(nm(it.text)) + "</p>" +
        (nm(it.author) ? "<footer>— " + esc(nm(it.author)) + "</footer>" : "") + "</blockquote></div>";
    }
    if (type === "image") {
      var s = safeSrc(it.src);
      if (!s) return "";
      return '<div class="item"><img src="' + esc(s) + '" alt="' + esc(nm(it.alt) || nm(it.caption)) + '" loading="lazy">' +
        (nm(it.caption) || nm(it.title) ? '<div class="body">' + textBlock({ title: it.title, note: it.caption }) + "</div>" : "") + "</div>";
    }
    if (type === "audio") {
      var a = safeSrc(it.src);
      if (!a) return "";
      return '<div class="item"><div class="body">' + (textBlock(it) || '<div class="ttl">' + esc(t().listen) + "</div>") +
        '<audio controls preload="none" src="' + esc(a) + '"></audio></div></div>';
    }
    return "";
  }

  function renderSections() {
    var main = $("secs"); main.innerHTML = "";
    (D.sections || []).forEach(function (sec) {
      var el = document.createElement("section");
      el.className = "sec"; el.id = sec.id || "";
      el.style.setProperty("--c", sec.color || "#ffb23f");
      var items = (sec.items || []).map(renderItem).filter(Boolean);
      var h = '<h2><span class="ic" aria-hidden="true">' + esc(sec.icon || "✨") + "</span><span>" + esc(nm(sec.title)) + "</span>" +
        (items.length ? '<span class="cnt">' + items.length + "</span>" : "") + "</h2>";
      h += items.length ? '<div class="items">' + items.join("") + "</div>" : '<div class="soon">' + esc(t().soon) + "</div>";
      el.innerHTML = h;
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
    if ($("idea")) $("idea").textContent = D.idea ? nm(D.idea) : "";
    $("install-btn").textContent = t().install;
    if (!$("install-hint").hidden) $("install-hint").textContent = t()[isIOS ? "ios" : "other"];
    $("note").textContent = t().note;
    applyTheme(); renderSections();
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
