/* Summarify (סיכומיפיי): full episode summaries. Data: summaries.json (see the fields there; newest first by date).
   Deep link: summarify/?item=<id> (or #item=<id>) opens that summary. Summaries are written in Hebrew only. */
(function () {
  "use strict";
  var T = {
    he: {
      doc: "סיכומיפיי", back: "← חזרה לאתר", title: "סיכומיפיי", tagline: "סיכומים מלאים של פרקים, בעברית",
      loading: "טוען סיכומים…", err: "לא הצלחנו לטעון את הסיכומים. בדוק את החיבור ונסה שוב.", empty: "עדיין אין כאן סיכומים.",
      read: "לסיכום המלא", toList: "→ כל הסיכומים", share: "שיתוף", shareAria: "שיתוף הסיכום", copied: "הלינק הועתק", copyFail: "לא הצלחנו להעתיק את הלינק",
      guest: "עם", episodeDate: "תאריך הפרק:", source: "למקור", heOnly: "", notFound: "הסיכום הזה לא נמצא. הנה כל הסיכומים.",
      install: "📲 התקנה למסך הבית", sheetTitle: "התקנה למסך הבית", close: "הבנתי",
      foot: "© כל הזכויות שמורות לחברת היליפיי בע\"מ 2026",
      iosSafari: "<ol><li>לוחצים על כפתור השיתוף <b>(□↑)</b> בסרגל של Safari.</li><li>גוללים ובוחרים <b>„הוסף למסך הבית”</b>.</li><li>לוחצים <b>„הוסף”</b>. האייקון של סיכומיפיי יופיע במסך הבית.</li></ol>",
      iosOther: "<ol><li>קודם פותחים את הדף ב־<b>Safari</b>: בתפריט של האפליקציה (⋯ או ⋮) בוחרים <b>„פתח ב־Safari”</b> או <b>„פתח בדפדפן”</b>.</li><li>ב־Safari לוחצים על כפתור השיתוף <b>(□↑)</b>.</li><li>בוחרים <b>„הוסף למסך הבית”</b> ואז <b>„הוסף”</b>.</li></ol>",
      android: "<ol><li>פותחים את תפריט הדפדפן: <b>⋮</b> למעלה ב־Chrome, או <b>☰</b> למטה ב־Samsung Internet.</li><li>בוחרים <b>„התקנת אפליקציה”</b> או <b>„הוספה למסך הבית”</b> (ב־Samsung: <b>„הוסף דף אל” ← „מסך הבית”</b>).</li><li>מאשרים, והאייקון יופיע במסך הבית.</li></ol><p class=note>פתחת מתוך וואטסאפ, אינסטגרם או פייסבוק? קודם בוחרים בתפריט <b>„פתח בדפדפן”</b> או <b>„פתח ב־Chrome”</b>.</p>",
      desktop: "<ol><li>ב־Chrome או Edge לוחצים על סמל ההתקנה בצד שורת הכתובת, או בתפריט <b>⋮</b> ← <b>„התקנה”</b>.</li><li>בטלפון: פותחים את הכתובת הזו בדפדפן ובוחרים <b>„הוספה למסך הבית”</b>.</li></ol>"
    },
    en: {
      doc: "Summarify", back: "← Back to site", title: "Summarify", tagline: "Full episode summaries, in Hebrew",
      loading: "Loading summaries…", err: "Couldn't load the summaries. Check your connection and try again.", empty: "No summaries here yet.",
      read: "Full summary", toList: "← All summaries", share: "Share", shareAria: "Share this summary", copied: "Link copied", copyFail: "Couldn't copy the link",
      guest: "with", episodeDate: "Episode date:", source: "Source", heOnly: "This summary is available in Hebrew.", notFound: "That summary wasn't found. Here are all the summaries.",
      install: "📲 Install to home screen", sheetTitle: "Install to home screen", close: "Got it",
      foot: "© 2026 Healify Ltd. All rights reserved.",
      iosSafari: "<ol><li>Tap the Share button <b>(□↑)</b> in Safari's toolbar.</li><li>Scroll and choose <b>“Add to Home Screen”</b>.</li><li>Tap <b>“Add”</b>. The Summarify icon will appear on your home screen.</li></ol>",
      iosOther: "<ol><li>First open this page in <b>Safari</b>: in this app's menu (⋯ or ⋮) choose <b>“Open in Safari”</b> or <b>“Open in browser”</b>.</li><li>In Safari, tap the Share button <b>(□↑)</b>.</li><li>Choose <b>“Add to Home Screen”</b>, then <b>“Add”</b>.</li></ol>",
      android: "<ol><li>Open the browser menu: <b>⋮</b> at the top in Chrome, or <b>☰</b> at the bottom in Samsung Internet.</li><li>Choose <b>“Install app”</b> or <b>“Add to Home screen”</b> (Samsung: <b>“Add page to” → “Home screen”</b>).</li><li>Confirm, and the icon will appear on your home screen.</li></ol><p class=note>Opened from WhatsApp, Instagram or Facebook? First choose <b>“Open in browser”</b> or <b>“Open in Chrome”</b> from its menu.</p>",
      desktop: "<ol><li>In Chrome or Edge, click the install icon at the end of the address bar, or menu <b>⋮</b> → <b>“Install”</b>.</li><li>On a phone: open this address in the browser and choose <b>“Add to Home screen”</b>.</li></ol>"
    }
  };
  var SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5.5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><path d="M8.3 10.8l7.4-4M8.3 13.2l7.4 4"/></svg>';
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var LANG_KEY = "rg-lang";
  var $ = function (id) { return document.getElementById(id); };
  var lang = "he";
  try { if (localStorage.getItem(LANG_KEY) === "en") lang = "en"; } catch (e) {}
  function t() { return T[lang]; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function loc(v) { return v && typeof v === "object" ? (v[lang] || v.he || "") : (v || ""); }

  /* ----- tiny markdown: # ## ###, - / * lists, 1. lists, **bold**, *italic*, [text](url), ---, paragraphs ----- */
  function inline(s) {
    s = esc(s);
    s = s.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,:;!?]|$)/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s;
  }
  function md(src, skipTitle) {
    var lines = String(src || "").replace(/\r\n?/g, "\n").split("\n"), out = [], para = [], list = null;
    function flushP() { if (para.length) { out.push("<p>" + inline(para.join(" ")) + "</p>"); para = []; } }
    function flushL() { if (list) { out.push("<" + list.tag + ">" + list.items.map(function (x) { return "<li>" + inline(x) + "</li>"; }).join("") + "</" + list.tag + ">"); list = null; } }
    var first = true;
    lines.forEach(function (ln) {
      var m;
      if (/^\s*$/.test(ln)) { flushP(); flushL(); return; }
      if ((m = /^(#{1,3})\s+(.*)$/.exec(ln))) {
        flushP(); flushL();
        if (first && m[1].length === 1 && skipTitle) { first = false; return; }
        var lv = Math.max(2, m[1].length); out.push("<h" + lv + ">" + inline(m[2]) + "</h" + lv + ">"); first = false; return;
      }
      first = false;
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(ln)) { flushP(); flushL(); out.push("<hr>"); return; }
      if ((m = /^\s*[-*•]\s+(.*)$/.exec(ln))) { flushP(); if (!list || list.tag !== "ul") { flushL(); list = { tag: "ul", items: [] }; } list.items.push(m[1]); return; }
      if ((m = /^\s*\d+[.)]\s+(.*)$/.exec(ln))) { flushP(); if (!list || list.tag !== "ol") { flushL(); list = { tag: "ol", items: [] }; } list.items.push(m[1]); return; }
      if (list && /^\s{2,}\S/.test(ln)) { list.items[list.items.length - 1] += " " + ln.trim(); return; }
      flushL(); para.push(ln.trim());
    });
    flushP(); flushL();
    return out.join("\n");
  }
  function excerpt(it) {
    var lines = String(it.body || "").split("\n");
    for (var i = 0; i < lines.length; i++) { var l = lines[i].trim(); if (l && !/^#/.test(l) && !/^[-*]\s/.test(l)) return l.replace(/\*\*/g, ""); }
    return "";
  }
  function fmtDate(s) {
    if (!s) return "";
    var d = new Date(s + (s.length === 10 ? "T12:00:00" : ""));
    if (isNaN(d)) return s;
    try { return d.toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return s; }
  }

  var items = null, loadErr = false, current = null;
  function findItem(id) { if (!items) return null; for (var i = 0; i < items.length; i++) if (items[i].id === id) return items[i]; return null; }
  function srcLine(it) {
    var g = loc(it.guest), sh = loc(it.show);
    return esc(sh) + (g ? " · " + esc(t().guest) + " " + esc(g) : "");
  }

  function renderList() {
    var box = $("list");
    if (loadErr) { box.innerHTML = '<p class="err">' + esc(t().err) + "</p>"; return; }
    if (!items) { box.innerHTML = '<p class="empty">' + esc(t().loading) + "</p>"; return; }
    if (!items.length) { box.innerHTML = '<p class="empty">' + esc(t().empty) + "</p>"; return; }
    box.innerHTML = items.map(function (it) {
      var he = (it.lang || "he") === "he";
      return '<article class="card" id="c-' + esc(it.id) + '" data-id="' + esc(it.id) + '">' +
        '<p class="src">' + srcLine(it) + "</p>" +
        '<h2 lang="he" dir="rtl">' + esc(it.title) + "</h2>" +
        '<p class="ex" lang="he" dir="rtl">' + esc(excerpt(it)) + "</p>" +
        (lang !== "he" && he ? '<p class="heonly">' + esc(t().heOnly) + "</p>" : "") +
        '<div class="meta"><span>' + esc(t().episodeDate) + " " + esc(fmtDate(it.date)) + "</span>" +
        '<span class="acts"><button type="button" class="sh" data-act="share" aria-label="' + esc(t().shareAria) + '" title="' + esc(t().shareAria) + '">' + SHARE + "<span>" + esc(t().share) + "</span></button>" +
        '<button type="button" class="more" data-act="open">' + esc(t().read) + ARROW + "</button></span></div></article>";
    }).join("");
  }
  function renderFull() {
    var it = current; if (!it) return;
    $("to-list").textContent = t().toList;
    var sb = $("full-share"); sb.innerHTML = SHARE + "<span>" + esc(t().share) + "</span>"; sb.setAttribute("aria-label", t().shareAria); sb.title = t().shareAria;
    var ho = $("full-heonly"); ho.textContent = t().heOnly; ho.hidden = !(lang !== "he" && (it.lang || "he") === "he");
    $("doc").innerHTML = '<p class="src">' + srcLine(it) + "</p>" +
      '<h1 class="t">' + esc(it.title) + "</h1>" +
      '<div class="md">' + md(it.body, true) + "</div>" +
      '<div class="foot" dir="' + (lang === "he" ? "rtl" : "ltr") + '" lang="' + lang + '"><span>' + esc(t().episodeDate) + " " + esc(fmtDate(it.date)) + "</span>" +
      (it.url ? '<a href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t().source) + " ↗</a>" : "") + "</div>";
  }
  function show(view) {
    $("list").hidden = view !== "list"; $("full").hidden = view !== "full";
  }
  function openItem(id, push) {
    var it = findItem(id); if (!it) return false;
    current = it; renderFull(); show("full"); window.scrollTo(0, 0);
    document.title = it.title + " · " + t().doc;
    if (push) { try { history.pushState({ item: id }, "", "?item=" + encodeURIComponent(id)); } catch (e) {} }
    return true;
  }
  function toList(push) {
    var was = current; current = null; show("list"); document.title = t().doc;
    if (push) { try { history.pushState({}, "", location.pathname); } catch (e) {} }
    if (was) { var c = $("c-" + was.id); if (c) try { c.scrollIntoView({ block: "center" }); } catch (e) {} }
  }

  function render() {
    var L = t(), d = document.documentElement;
    d.lang = lang; d.dir = lang === "he" ? "rtl" : "ltr";
    document.title = current ? current.title + " · " + L.doc : L.doc;
    $("back").textContent = L.back; $("title").textContent = L.title; $("tagline").textContent = L.tagline;
    $("lang-he").setAttribute("aria-pressed", String(lang === "he")); $("lang-en").setAttribute("aria-pressed", String(lang === "en"));
    $("install-btn").textContent = L.install; $("sheet-title").textContent = L.sheetTitle; $("sheet-close").textContent = L.close;
    $("sheet-body").innerHTML = L[installKey()];
    $("copyright").textContent = L.foot;
    renderList(); if (current) renderFull();
  }
  function setLang(l) { lang = l === "en" ? "en" : "he"; try { localStorage.setItem(LANG_KEY, lang); } catch (e) {} render(); }
  $("lang-he").onclick = function () { setLang("he"); };
  $("lang-en").onclick = function () { setLang("en"); };
  $("to-list").onclick = function () { toList(true); };
  $("full-share").onclick = function () { if (current) shareItem(current.id); };
  $("list").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]"), c = e.target.closest(".card"); if (!c) return;
    var id = c.getAttribute("data-id");
    if (b && b.getAttribute("data-act") === "share") { shareItem(id); return; }
    if (b && b.getAttribute("data-act") === "open") { openItem(id, true); return; }
    if (!e.target.closest("a,button")) openItem(id, true);
  });
  window.addEventListener("popstate", function () {
    var id = deepLink(); if (id && openItem(id, false)) return; toList(false);
  });

  /* ----- toast + share (deep link per summary) ----- */
  var toastTimer = null;
  function toast(msg) {
    var el = $("toast"); el.textContent = msg; el.hidden = false;
    el.classList.remove("show"); el.offsetWidth; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove("show"); setTimeout(function () { el.hidden = true; }, 250); }, 2400);
  }
  function itemLink(id) { var base = new URL("./", location.href); return base.origin + base.pathname + "?item=" + encodeURIComponent(id); }
  function legacyCopy(s) {
    return new Promise(function (ok, no) {
      var ta = document.createElement("textarea"); ta.value = s; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.top = "-1000px"; ta.style.opacity = "0"; document.body.appendChild(ta);
      ta.select(); var r = false; try { r = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); r ? ok() : no(new Error("copy"));
    });
  }
  function copyText(s) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) return navigator.clipboard.writeText(s).catch(function () { return legacyCopy(s); });
    return legacyCopy(s);
  }
  function shareItem(id) {
    var it = findItem(id); if (!it) return;
    var url = itemLink(id), title = it.title;
    function fallback() { copyText(url).then(function () { toast(t().copied); }, function () { toast(t().copyFail); }); }
    if (navigator.share) navigator.share({ title: title, text: title, url: url }).catch(function (e) { if (!e || e.name !== "AbortError") fallback(); });
    else fallback();
  }
  window.RGSummShare = { link: itemLink };
  function deepLink() {
    var v = null;
    try { v = new URLSearchParams(location.search).get("item"); } catch (e) {}
    if (!v) { var m = /(?:^#|&)item=([^&]+)/.exec(location.hash || ""); if (m) { try { v = decodeURIComponent(m[1]); } catch (e) { v = m[1]; } } }
    return v ? String(v).slice(0, 200) : null;
  }

  /* ----- install: visible whenever not running as an installed app ----- */
  var deferred = null, installedNow = false;
  function standalone() {
    return (window.matchMedia && (window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || window.matchMedia("(display-mode: minimal-ui)").matches)) || navigator.standalone === true;
  }
  function installKey() {
    var ua = navigator.userAgent || "";
    var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (ios) return (/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\/|YaBrowser|DuckDuckGo|FBAN|FBAV|Instagram|WhatsApp|Line\//.test(ua)) ? "iosSafari" : "iosOther";
    if (/Android/i.test(ua)) return "android";
    return "desktop";
  }
  function updateInstall() { var s = !standalone() && !installedNow; $("install-wrap").hidden = !s; if (!s) closeSheet(); }
  function openSheet() { $("sheet-body").innerHTML = t()[installKey()]; $("sheet").hidden = false; try { $("sheet-close").focus({ preventScroll: true }); } catch (e) {} }
  function closeSheet() { $("sheet").hidden = true; }
  $("install-btn").onclick = function () {
    if (deferred) { var d = deferred; deferred = null; try { d.prompt(); } catch (e) { openSheet(); return; } (d.userChoice || Promise.resolve()).then(updateInstall, updateInstall); return; }
    openSheet();
  };
  $("sheet-close").onclick = closeSheet;
  $("sheet").addEventListener("click", function (e) { if (e.target === $("sheet")) closeSheet(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheet(); });
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; updateInstall(); });
  window.addEventListener("appinstalled", function () { deferred = null; installedNow = true; updateInstall(); });
  if (window.matchMedia) { var mq = window.matchMedia("(display-mode: standalone)"); if (mq.addEventListener) mq.addEventListener("change", updateInstall); else if (mq.addListener) mq.addListener(updateInstall); }
  window.addEventListener("storage", function (e) { if (e.key === LANG_KEY && e.newValue) { lang = e.newValue === "en" ? "en" : "he"; render(); } });

  /* ----- load ----- */
  render(); updateInstall();
  fetch("summaries.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (data) {
    items = ((data && data.items) || []).filter(function (x) { return x && x.id && x.title; });
    items.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    renderList();
    var id = deepLink();
    if (id && !openItem(id, false)) toast(t().notFound);
  }).catch(function () { loadErr = true; renderList(); });
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
})();
