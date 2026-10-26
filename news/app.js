/* Updates (עדכונים): news feed from news.json (regenerated 3 times a day), with read tracking. */
(function () {
  "use strict";
  var LANG_KEY = "rg-lang", THEME_KEY = "rg-news-theme", TOPIC_KEY = "rg-news-topic", BG_KEY = "rg-news-bg", READ_KEY = "rg-news-read";
  var READ_CAP = 1000, RELOAD_MS = 5 * 60 * 1000;
  var TZ = "Asia/Jerusalem";
  var L = {
    he: {
      title: "עדכוניפיי", doc: "עדכוניפיי · Updatify",
      tagline: "החדשות על האנשים והחברות שאתה עוקב אחריהם, מתעדכן 3 פעמים ביום",
      back: "← חזרה לאתר", updated: "עודכן לאחרונה:", loading: "טוען עדכונים…",
      all: "הכול", people: "אנשים", companies: "חברות ונושאים",
      read: "למקור", more: "קרא עוד", fullNA: "אין כרגע טקסט מלא לידיעה הזו. זה התקציר.", empty: "אין עדכונים בנושא הזה כרגע.",
      markRead: "✓ קראתי", markUnread: "↺ החזר לא נקרא", markAll: "✓ סמן הכל כנקרא", showRead: "הצג גם שנקראו", hideRead: "הסתר שנקראו",
      caught: "קראת הכל!", caughtSub: "עדכונים חדשים מגיעים 3 פעמים ביום",
      error: "לא הצלחנו לטעון את העדכונים. בדוק את החיבור ונסה שוב.",
      offline: "מוצגים עדכונים שמורים (אין חיבור)",
      note: "התקצירים והטקסט המלא נכתבו על סמך המקורות המקושרים. לחיצה על „קרא עוד” פותחת את הכול כאן באפליקציה. אין לראות בתוכן ייעוץ רפואי או פיננסי.",
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
      tagline: "News on the people and companies you follow, updated 3 times a day",
      back: "← Back to site", updated: "Last updated:", loading: "Loading updates…",
      all: "All", people: "People", companies: "Companies & topics",
      read: "Source", more: "Read more", fullNA: "There's no full text for this item yet. This is the summary.", empty: "No updates on this topic right now.",
      markRead: "✓ Read", markUnread: "↺ Mark unread", markAll: "✓ Mark all as read", showRead: "Show read", hideRead: "Hide read",
      caught: "All caught up!", caughtSub: "New updates arrive 3 times a day",
      error: "Couldn't load updates. Check your connection and try again.",
      offline: "Showing saved updates (offline)",
      note: "Summaries and full texts are based on the linked sources. Tap “Read more” to read everything here in the app. Nothing here is medical or financial advice.",
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
  var MORE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  var EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';

  function $(id) { return document.getElementById(id); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var lang = get(LANG_KEY) === "en" ? "en" : "he";
  var theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  var topic = get(TOPIC_KEY) || "all";
  var bg = document.documentElement.getAttribute("data-bg") || "2";
  var TC = window.RG_BG_TC || {};
  var data = null, offline = false, loading = false, lastFetch = 0, showRead = false;

  /* ----- read tracking: array of item ids in localStorage, oldest first, capped ----- */
  var readList = (function () { try { var a = JSON.parse(get(READ_KEY) || "[]"); return Array.isArray(a) ? a.filter(function (x) { return typeof x === "string"; }) : []; } catch (e) { return []; } })();
  var readSet = {}; readList.forEach(function (id) { readSet[id] = 1; });
  function isRead(id) { return readSet[id] === 1; }
  function saveRead() {
    if (readList.length > READ_CAP) { readList.splice(0, readList.length - READ_CAP).forEach(function (id) { delete readSet[id]; }); }
    set(READ_KEY, JSON.stringify(readList));
  }
  function markRead(ids) {
    var ch = false;
    ids.forEach(function (id) { if (id && !isRead(id)) { readSet[id] = 1; readList.push(id); noteChange(id, 1); ch = true; } });
    if (ch) { saveRead(); cloudSoon(); } return ch;
  }
  function markUnread(id) {
    if (!isRead(id)) return; delete readSet[id];
    readList = readList.filter(function (x) { return x !== id; }); noteChange(id, -1); saveRead(); cloudSoon();
  }

  /* ----- cloud sync of the read state (only when signed in via ../shared/rg-account.js; otherwise nothing changes) -----
     Cloud row (app "news", key "read"): { read: [ids], ch: { id: +time (marked read) / -time (marked unread) } }.
     Merge = union of both read lists, then the newest explicit change per item wins (so "mark unread" survives a merge). */
  var CH_KEY = "rg-news-readch", CH_CAP = 400;
  var ACC = window.RGAccount || null, syncing = false, syncAgain = false, syncTimer = 0, lastPull = 0;
  function loadCh() { var o = null; try { o = JSON.parse(get(CH_KEY) || "{}"); } catch (e) {} return o && typeof o === "object" && !Array.isArray(o) ? o : {}; }
  function capCh(ch) {
    var ids = Object.keys(ch); if (ids.length <= CH_CAP) return ch;
    ids.sort(function (a, b) { return Math.abs(ch[b]) - Math.abs(ch[a]); });
    var o = {}; ids.slice(0, CH_CAP).forEach(function (id) { o[id] = ch[id]; }); return o;
  }
  function noteChange(id, sign) { var ch = loadCh(); ch[id] = sign * Date.now(); set(CH_KEY, JSON.stringify(capCh(ch))); }
  // pure merge (exported for tests): local + cloud -> { read: [...], ch: {...} }
  function mergeRead(localRead, localCh, cloud) {
    cloud = cloud && typeof cloud === "object" ? cloud : {};
    var cRead = Array.isArray(cloud.read) ? cloud.read.filter(function (x) { return typeof x === "string"; }) : [];
    var cCh = cloud.ch && typeof cloud.ch === "object" ? cloud.ch : {};
    var ch = {}, k;
    for (k in localCh) if (typeof localCh[k] === "number") ch[k] = localCh[k];
    for (k in cCh) if (typeof cCh[k] === "number" && (!(k in ch) || Math.abs(cCh[k]) > Math.abs(ch[k]))) ch[k] = cCh[k];
    ch = capCh(ch);
    var seen = {}, out = [];
    function add(id) { if (!seen[id] && !(ch[id] < 0)) { seen[id] = 1; out.push(id); } }
    cRead.forEach(add); localRead.forEach(add);
    for (k in ch) if (ch[k] > 0) add(k);
    if (out.length > READ_CAP) out = out.slice(out.length - READ_CAP);
    return { read: out, ch: ch };
  }
  function sameList(a, b) { if (a.length !== b.length) return false; var s = {}; a.forEach(function (x) { s[x] = 1; }); return b.every(function (x) { return s[x]; }); }
  function sameCh(a, b) { var ka = Object.keys(a), kb = Object.keys(b); return ka.length === kb.length && ka.every(function (k) { return a[k] === b[k]; }); }
  function cloudSync() {
    if (!ACC || !ACC.user()) return;
    if (syncing) { syncAgain = true; return; }
    syncing = true; lastPull = Date.now();
    ACC.get("news", "read").then(function (cloud) {
      var localCh = loadCh(), m = mergeRead(readList, localCh, cloud);
      var localChanged = !sameList(m.read, readList);
      if (localChanged) {
        readList = m.read; readSet = {}; readList.forEach(function (id) { readSet[id] = 1; });
        set(READ_KEY, JSON.stringify(readList));
        if (data) { renderChips(); renderFeed(); }
      }
      if (!sameCh(m.ch, localCh)) set(CH_KEY, JSON.stringify(m.ch));
      var cRead = cloud && Array.isArray(cloud.read) ? cloud.read : null, cCh = cloud && cloud.ch && typeof cloud.ch === "object" ? cloud.ch : {};
      if (!cRead || !sameList(m.read, cRead) || !sameCh(m.ch, cCh)) return ACC.set("news", "read", { read: m.read, ch: m.ch, at: Date.now() });
    }).catch(function () {}).then(function () {
      syncing = false; if (syncAgain) { syncAgain = false; cloudSync(); }
    });
  }
  function cloudSoon() { if (!ACC || !ACC.user()) return; clearTimeout(syncTimer); syncTimer = setTimeout(cloudSync, 600); }
  window.RGNewsSync = { merge: mergeRead }; // for tests
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
    $("install-btn").textContent = t().install;
    if (!$("install-hint").hidden) $("install-hint").textContent = t()[isIOS ? "ios" : "other"];
    $("note").textContent = t().note;
    if (readerId) renderReader();
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

  // count = unread items per topic; total = all items per topic. Topics without unread are hidden unless showRead.
  function topicsWithItems() {
    var count = {}, total = {}, unread = 0, read = 0;
    data.items.forEach(function (it) {
      total[it.topic] = (total[it.topic] || 0) + 1;
      if (isRead(it.id)) read++; else { unread++; count[it.topic] = (count[it.topic] || 0) + 1; }
    });
    var list = data.topics.filter(function (tp) { return showRead ? total[tp.id] : count[tp.id]; });
    return { list: list, count: count, total: total, unread: unread, read: read };
  }
  function visible(tw) { return function (tp) { return topic === "all" || topic === tp.id; }; }

  function renderChips() {
    var nav = $("chips"); nav.innerHTML = "";
    if (!data) return;
    var tw = topicsWithItems();
    if (topic !== "all" && !(showRead ? tw.total[topic] : tw.count[topic])) topic = "all";
    function chip(id, label, n) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip";
      b.setAttribute("aria-pressed", topic === id ? "true" : "false");
      b.innerHTML = esc(label) + (n ? '<span class="n">' + n + "</span>" : "");
      b.onclick = function () { topic = id; set(TOPIC_KEY, id); renderChips(); renderFeed(); window.scrollTo({ top: 0, behavior: "smooth" }); };
      nav.appendChild(b);
      if (topic === id && b.scrollIntoView) setTimeout(function () { b.scrollIntoView({ block: "nearest", inline: "center" }); }, 0);
    }
    chip("all", t().all, tw.unread);
    var lastGroup = null;
    tw.list.forEach(function (tp) {
      if (lastGroup && tp.group !== lastGroup) { var s = document.createElement("span"); s.className = "sep"; nav.appendChild(s); }
      lastGroup = tp.group;
      chip(tp.id, tp[lang] || tp.he, tw.count[tp.id]);
    });
    setTimeout(updateArrows, 0);
  }

  function card(it) {
    var c = pick(it), r = isRead(it.id);
    return '<article class="card' + (r ? " isread" : "") + '" data-id="' + esc(it.id) + '"><h3>' + esc(c.title) + "</h3><p>" + esc(c.summary) +
      '</p><div class="meta"><span class="when">' + esc(rel(it.date)) + (it.source ? " · " + esc(it.source) : "") +
      '</span><span class="acts"><button type="button" class="rd" data-act="' + (r ? "unread" : "read") + '">' + esc(r ? t().markUnread : t().markRead) +
      '</button><button type="button" class="more" data-act="more" aria-haspopup="dialog">' + esc(t().more) + MORE + "</button></span></div></article>";
  }

  function renderFeed() {
    var feed = $("feed");
    if (!data) { feed.innerHTML = loading ? '<div class="empty">' + esc(t().loading) + "</div>" : '<div class="err">' + esc(t().error) + "</div>"; return; }
    var tw = topicsWithItems(), html = "", unreadShown = 0, readShown = 0;
    tw.list.filter(visible(tw)).forEach(function (tp) {
      var its = data.items.filter(function (it) { return it.topic === tp.id && (showRead || !isRead(it.id)); })
        .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      its.forEach(function (it) { if (isRead(it.id)) readShown++; else unreadShown++; });
      if (its.length) html += '<section class="group"><h2>' + esc(tp[lang] || tp.he) + "</h2>" + its.map(card).join("") + "</section>";
    });
    // read items in the current topic (for the "show read (N)" toggle)
    var readHere = data.items.filter(function (it) { return isRead(it.id) && (topic === "all" || it.topic === topic); }).length;
    var bar = "";
    if (unreadShown || readHere) {
      bar = '<div class="feedbar">' +
        (unreadShown ? '<button type="button" class="lnk" data-act="all">' + esc(t().markAll) + "</button>" : "<span></span>") +
        (readHere ? '<button type="button" class="lnk dim" data-act="toggle" aria-pressed="' + (showRead ? "true" : "false") + '">' +
          esc(showRead ? t().hideRead : t().showRead) + " (" + readHere + ")</button>" : "") + "</div>";
    }
    if (!html) {
      html = (data.items.length && !tw.unread)
        ? '<div class="caught"><div class="big">🎉</div><b>' + esc(t().caught) + "</b><span>" + esc(t().caughtSub) + "</span></div>"
        : '<div class="empty">' + esc(t().empty) + "</div>";
    }
    feed.innerHTML = bar + html;
  }

  // fade out the given cards, then re-render (chips + feed)
  function afterMark(cards) {
    if (showRead || !cards.length) { renderChips(); renderFeed(); return; }
    cards.forEach(function (c) { c.style.height = c.offsetHeight + "px"; c.offsetHeight; c.classList.add("gone"); });
    setTimeout(function () { renderChips(); renderFeed(); }, 380);
  }
  $("feed").addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-act], a.src"); if (!el) return;
    var c = el.closest(".card"), act = el.getAttribute("data-act");
    if (el.classList.contains("src")) { // opening the source counts as read; let the link open normally
      if (c && markRead([c.getAttribute("data-id")])) setTimeout(function () { afterMark([c]); }, 150);
      return;
    }
    if (act === "more" && c) { openReader(c.getAttribute("data-id")); return; }
    if (act === "read" && c) { markRead([c.getAttribute("data-id")]); afterMark([c]); }
    else if (act === "unread" && c) { markUnread(c.getAttribute("data-id")); renderChips(); renderFeed(); }
    else if (act === "all") {
      var cs = Array.prototype.slice.call($("feed").querySelectorAll(".card:not(.isread)"));
      markRead(cs.map(function (x) { return x.getAttribute("data-id"); })); afterMark(cs);
    } else if (act === "toggle") { showRead = !showRead; renderChips(); renderFeed(); }
  });

  function renderAll() { renderChrome(); renderStatus(); renderChips(); renderFeed(); }

  function load() {
    if (loading) return;
    loading = true; lastFetch = Date.now(); if (!data) { renderStatus(); renderFeed(); }
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
      loading = false; renderStatus(); renderChips(); renderFeed();
    });
  }


  /* ----- in-app reader: full text (full_he / full_en) so nothing needs X or another site ----- */
  var readerId = null, readerFrom = null;
  function findItem(id) { if (!data) return null; for (var i = 0; i < data.items.length; i++) if (data.items[i].id === id) return data.items[i]; return null; }
  function fullFor(it) { // full text in the UI language, else the other language, else null
    var other = lang === "he" ? "en" : "he", a = it["full_" + lang], b = it["full_" + other];
    if (typeof a === "string" && a.trim()) return { text: a, lang: lang };
    if (typeof b === "string" && b.trim()) return { text: b, lang: other };
    return null;
  }
  function richText(txt) { // plain text: blank line = paragraph, "• " lines = list, "1. " lines = numbered steps
    return String(txt).replace(/\r/g, "").split(/\n{2,}/).map(function (blk) {
      var out = "", ul = [];
      function flush() { if (ul.length) { out += "<ul>" + ul.join("") + "</ul>"; ul = []; } }
      var para = [];
      function flushP() { if (para.length) { out += "<p>" + para.join("<br>") + "</p>"; para = []; } }
      blk.split("\n").forEach(function (ln) {
        if (!ln.trim()) return;
        var m = /^\s*[•·\-]\s+(.*)$/.exec(ln), n = /^\s*(\d{1,2})[.)]\s+(.*)$/.exec(ln);
        if (m) { flushP(); ul.push("<li>" + esc(m[1]) + "</li>"); }
        else if (n) { flushP(); flush(); out += '<p class="step"><span class="sn">' + esc(n[1]) + "</span><span>" + esc(n[2]) + "</span></p>"; }
        else { flush(); para.push(esc(ln)); }
      });
      flushP(); flush(); return out;
    }).join("");
  }
  function renderReader() {
    var it = findItem(readerId); if (!it) return;
    var c = pick(it), f = fullFor(it), box = $("rd-body");
    var dir = f ? (f.lang === "he" ? "rtl" : "ltr") : document.documentElement.dir;
    $("rd-sheet").querySelector(".rdr").setAttribute("dir", dir);
    $("rd-sheet").querySelector(".rdr").setAttribute("lang", f ? f.lang : lang);
    $("rd-title").textContent = c.title || "";
    $("rd-meta").textContent = rel(it.date) + (it.source ? " · " + it.source : "");
    box.innerHTML = f ? richText(f.text) : '<p>' + esc(c.summary) + '</p><p class="na">' + esc(t().fullNA) + "</p>";
    var a = $("rd-src"); a.href = safeUrl(it.url); a.innerHTML = esc(t().read) + EXT;
    $("rd-close").setAttribute("aria-label", t().close); $("rd-close").title = t().close;
  }
  function openReader(id) {
    readerId = id; readerFrom = document.activeElement; renderReader();
    var s = $("rd-sheet"); s.hidden = false; document.documentElement.classList.add("noscroll");
    s.querySelector(".rdr-scroll").scrollTop = 0; setTimeout(function () { $("rd-close").focus(); }, 30);
  }
  function closeReader() {
    if ($("rd-sheet").hidden) return;
    $("rd-sheet").hidden = true; document.documentElement.classList.remove("noscroll");
    var id = readerId; readerId = null;
    var c = id && $("feed").querySelector('.card[data-id="' + id.replace(/"/g, "") + '"]');
    if (c && markRead([id])) afterMark([c]); // reading it in full counts as read, like opening the source did
    else if (readerFrom && readerFrom.focus) readerFrom.focus();
  }
  $("rd-close").onclick = closeReader;
  $("rd-sheet").addEventListener("click", function (e) { if (e.target === $("rd-sheet")) closeReader(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeReader(); });

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
  // auto-reload: on open (boot), and whenever the app comes back to the foreground (at most every ~5 min)
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && Date.now() - lastFetch > RELOAD_MS) load();
    if (document.visibilityState === "visible" && Date.now() - lastPull > 5000) cloudSync();
    if (document.visibilityState === "hidden" && syncTimer) { clearTimeout(syncTimer); syncTimer = 0; cloudSync(); }
  });
  window.addEventListener("pageshow", function (e) { if (e.persisted && Date.now() - lastFetch > RELOAD_MS) load(); });
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
  if (ACC) {
    ACC.ready.then(cloudSync);
    ACC.onChange(function (u) { if (u) cloudSync(); });
    // language, theme, background and topic follow the account across devices
    ACC.syncPrefs([LANG_KEY, THEME_KEY, BG_KEY, TOPIC_KEY], function (c) {
      if (LANG_KEY in c) lang = c[LANG_KEY] === "en" ? "en" : "he";
      if (THEME_KEY in c) theme = c[THEME_KEY] === "light" ? "light" : "dark";
      if (BG_KEY in c && /^([1-9]|10)$/.test(c[BG_KEY] || "")) { bg = c[BG_KEY]; document.documentElement.setAttribute("data-bg", bg); }
      if (TOPIC_KEY in c && c[TOPIC_KEY]) topic = c[TOPIC_KEY];
      renderAll(); return true;
    });
  }
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  }
})();
