/* Updates (עדכונים): news feed from news.json (regenerated every hour), with read tracking and saved (bookmarked) updates. */
(function () {
  "use strict";
  var LANG_KEY = "rg-lang", THEME_KEY = "rg-news-theme", TOPIC_KEY = "rg-news-topic", BG_KEY = "rg-news-bg", LBG_KEY = "rg-news-bg-light", READ_KEY = "rg-news-read";
  var READ_CAP = 1000, RELOAD_MS = 5 * 60 * 1000;
  var TZ = "Asia/Jerusalem";
  var L = {
    he: {
      title: "עדכוניפיי", doc: "עדכוניפיי",
      tagline: "החדשות על האנשים והחברות שאתה עוקב אחריהם, מתעדכן כל שעה",
      back: "← חזרה לאתר", updated: "עודכן לאחרונה:", loading: "טוען עדכונים…",
      newEp: "פרק חדש", all: "הכול", people: "אנשים", companies: "חברות ונושאים",
      read: "למקור", more: "קרא עוד", fullNA: "אין כרגע טקסט מלא לידיעה הזו. זה התקציר.", empty: "אין עדכונים בנושא הזה כרגע.",
      markRead: "✓ קראתי", markUnread: "↺ החזר לא נקרא", markAll: "✓ סמן הכל כנקרא", showRead: "הצג גם שנקראו", hideRead: "הסתר שנקראו",
      caught: "קראת הכל!", caughtSub: "עדכונים חדשים מגיעים כל שעה",
      error: "לא הצלחנו לטעון את העדכונים. בדוק את החיבור ונסה שוב.",
      offline: "מוצגים עדכונים שמורים (אין חיבור)",
      note: "התקצירים והטקסט המלא נכתבו על סמך המקורות המקושרים. לחיצה על „קרא עוד” פותחת את הכול כאן באפליקציה. אין לראות בתוכן ייעוץ רפואי או פיננסי.",
      dark: "לילה", light: "בהיר", toLight: "מעבר למצב בהיר", toDark: "מעבר למצב לילה",
      install: "📲 התקנה למסך הבית",
      ios: "באייפון או באייפד: לוחצים על כפתור השיתוף (□↑) בתחתית Safari, ואז בוחרים „הוסף למסך הבית”.",
      other: "פותחים את תפריט הדפדפן (⋮) ובוחרים „התקנת אפליקציה” או „הוספה למסך הבית”.",
      bgTitle: "בחירת רקע", bgBtn: "בחירת רקע",
      lbgs: ["רקע מקורי", "שמי בוקר", "שמנת וזהב", "לבנדר", "אפרסק", "פנינה", "זריחה", "בריזה", "קוורץ ורוד", "שעת זהב", "עננים"],
      bgs: ["רקע מקורי", "זוהר צפוני", "שקיעה", "ניאון", "לגונה", "ערפילית", "גחלים", "יער בדמדומים", "פירות יער", "פריזמה", "זהב של חצות"],
      close: "סגירה", prev: "נושאים קודמים", next: "נושאים נוספים",
      saved: "שמורים", save: "שמור", unsave: "הסר משמורים", savedAt: "נשמר",
      savedEmpty: "עוד לא שמרת עדכונים", savedEmptySub: "לחץ על סימן השמירה שליד עדכון, והוא יחכה לך כאן גם אחרי שייעלם מהפיד.",
      savedCount: "עדכונים שמורים", savedOne: "עדכון שמור אחד",
      copy: "© כל הזכויות שמורות לחברת היליפיי בע\"מ 2026",
      summ: "📝 סכם לי", summSent: "✓ נשלח לסיכום", summDone: "📝 לסיכום", summFail: "אין חיבור, נשלח כשיחזור", summOk: "נשלח לסיכום. הסיכום יופיע בסיכומים", share: "שיתוף", shareAria: "שיתוף העדכון", copied: "הלינק הועתק", copyFail: "לא הצלחנו להעתיק את הלינק",
      sumTab: "סיכומים", sumTag: "סיכומים מלאים של פרקים, בעברית", sumLoading: "טוען סיכומים…", sumErr: "לא הצלחנו לטעון את הסיכומים. בדוק את החיבור ונסה שוב.", sumEmpty: "עדיין אין כאן סיכומים.",
      sumRead: "לסיכום המלא", sumToList: "→ כל הסיכומים", sumShareAria: "שיתוף הסיכום", sumGuest: "עם", sumEpisodeDate: "תאריך הפרק:", sumSource: "למקור", sumHeOnly: "",
      sumNotFound: "הסיכום הזה לא נמצא. הנה כל הסיכומים.", sumNew: "נוספו סיכומים חדשים", sumNoNew: "אין סיכומים חדשים כרגע",
      gone: "העדכון שביקשת כבר לא זמין. הנה כל העדכונים.",
      refresh: "רענון", refreshing: "מרענן…", newItems: "נוספו עדכונים חדשים", noNew: "אין עדכונים חדשים כרגע", noNet: "אין חיבור לאינטרנט", refreshFail: "הרענון לא הצליח, נסה שוב",
      locale: "he-IL"
    },
    en: {
      title: "Updatify", doc: "Updatify",
      tagline: "News on the people and companies you follow, updated every hour",
      back: "← Back to site", updated: "Last updated:", loading: "Loading updates…",
      newEp: "New episode", all: "All", people: "People", companies: "Companies & topics",
      read: "Source", more: "Read more", fullNA: "There's no full text for this item yet. This is the summary.", empty: "No updates on this topic right now.",
      markRead: "✓ Read", markUnread: "↺ Mark unread", markAll: "✓ Mark all as read", showRead: "Show read", hideRead: "Hide read",
      caught: "All caught up!", caughtSub: "New updates arrive every hour",
      error: "Couldn't load updates. Check your connection and try again.",
      offline: "Showing saved updates (offline)",
      note: "Summaries and full texts are based on the linked sources. Tap “Read more” to read everything here in the app. Nothing here is medical or financial advice.",
      dark: "Night", light: "Light", toLight: "Switch to light mode", toDark: "Switch to night mode",
      install: "📲 Add to home screen",
      ios: "On iPhone or iPad: tap the Share button (□↑) at the bottom of Safari, then choose “Add to Home Screen”.",
      other: "Open your browser menu (⋮) and choose “Install app” or “Add to Home screen”.",
      bgTitle: "Choose background", bgBtn: "Choose background",
      lbgs: ["Original", "Morning sky", "Cream & gold", "Lavender", "Peach", "Pearl", "Sunrise", "Sea breeze", "Rose quartz", "Golden hour", "Clouds"],
      bgs: ["Original", "Aurora", "Sunset", "Neon mesh", "Lagoon", "Nebula", "Ember", "Forest dusk", "Berry swirl", "Prism", "Midnight gold"],
      close: "Close", prev: "Previous topics", next: "More topics",
      saved: "Saved", save: "Save", unsave: "Remove from saved", savedAt: "Saved",
      savedEmpty: "No saved updates yet", savedEmptySub: "Tap the bookmark next to any update and it will wait for you here, even after it leaves the feed.",
      savedCount: "saved updates", savedOne: "1 saved update",
      copy: "© 2026 Healify Ltd. All rights reserved.",
      summ: "📝 Summarize", summSent: "✓ Sent for summary", summDone: "📝 Summary", summFail: "Offline, will send when back", summOk: "Sent. The summary will appear in Summaries", share: "Share", shareAria: "Share this update", copied: "Link copied", copyFail: "Couldn't copy the link",
      sumTab: "Summaries", sumTag: "Full episode summaries, in Hebrew", sumLoading: "Loading summaries…", sumErr: "Couldn't load the summaries. Check your connection and try again.", sumEmpty: "No summaries here yet.",
      sumRead: "Full summary", sumToList: "← All summaries", sumShareAria: "Share this summary", sumGuest: "with", sumEpisodeDate: "Episode date:", sumSource: "Source", sumHeOnly: "This summary is available in Hebrew.",
      sumNotFound: "That summary wasn't found. Here are all the summaries.", sumNew: "New summaries added", sumNoNew: "No new summaries right now",
      gone: "That update is no longer available. Here are all the updates.",
      refresh: "Refresh", refreshing: "Refreshing…", newItems: "New updates added", noNew: "No new updates right now", noNet: "No internet connection", refreshFail: "Refresh failed, please try again",
      locale: "en-GB"
    }
  };
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"/></svg>';
  var MORE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  var BMK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 0 1 1-1z"/></svg>';
  var BMKF = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 0 1 1-1z"/></svg>';
  var SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5.5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><path d="M8.3 10.8l7.4-4M8.3 13.2l7.4 4"/></svg>';
  var REFRESH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5A8 8 0 1 0 17.7 17"/><path d="M20.5 4.5v7h-7"/></svg>';
  var EXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M9 7h8v8"/></svg>';
  var SUMI = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3.5h6.5L19 9v11a1.2 1.2 0 0 1-1.2 1.2H7.2A1.2 1.2 0 0 1 6 20V4.7A1.2 1.2 0 0 1 7.2 3.5z"/><path d="M13.5 3.6V9H19"/><path d="M9 13h6M9 17h6"/></svg>';
  var SUMARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  var SUMMARIES_VIEW = "__summaries";

  function $(id) { return document.getElementById(id); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var lang = get(LANG_KEY) === "en" ? "en" : "he";
  var theme = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  var topic = get(TOPIC_KEY) || "all";
  var bg = document.documentElement.getAttribute("data-bg") || "2";
  var TC = window.RG_BG_TC || {}, LTC = window.RG_LBG_TC || {};
  var lbg = document.documentElement.getAttribute("data-lbg") || "0";
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

  /* ----- saved (bookmarked) updates -----
     localStorage "rg-news-saved-v1": { items: { id: { at: savedTime, it: full snapshot of the item } }, del: { id: removedTime } }.
     A full copy of each item is kept, so saved updates stay after they drop out of news.json.
     Cloud row (app "news", key "saved") holds the same shape; merge = union, newest add/remove per id wins. */
  var SAVED_KEY = "rg-news-saved-v1", SAVED_CAP = 300, DEL_CAP = 400, CLOUD_BUDGET = 60000, SAVED_VIEW = "__saved";
  var savedSyncing = false, savedAgain = false, savedTimer = 0;
  function hashId(s) { var h = 0x811c9dc5; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return "h" + (h >>> 0).toString(16); }
  function itemId(it) { return (it && typeof it.id === "string" && it.id) ? it.id : hashId((it && (it.url || "")) + "|" + JSON.stringify((it && (it.he || it.en || {}).title) || "")); }
  function cleanSaved(o) {
    o = o && typeof o === "object" ? o : {};
    var out = { items: {}, del: {} }, k, v;
    var its = o.items && typeof o.items === "object" ? o.items : {}, del = o.del && typeof o.del === "object" ? o.del : {};
    for (k in its) { v = its[k]; if (v && typeof v === "object" && typeof v.at === "number" && v.it && typeof v.it === "object") out.items[k] = v; }
    for (k in del) if (typeof del[k] === "number") out.del[k] = del[k];
    return out;
  }
  function capSaved(o) {
    var ids = Object.keys(o.items);
    if (ids.length > SAVED_CAP) { ids.sort(function (a, b) { return o.items[b].at - o.items[a].at; }); ids.slice(SAVED_CAP).forEach(function (id) { delete o.items[id]; }); }
    var ds = Object.keys(o.del);
    if (ds.length > DEL_CAP) { ds.sort(function (a, b) { return o.del[b] - o.del[a]; }); ds.slice(DEL_CAP).forEach(function (id) { delete o.del[id]; }); }
    return o;
  }
  var saved = (function () { var o = null; try { o = JSON.parse(get(SAVED_KEY) || "null"); } catch (e) {} return cleanSaved(o); })();
  function isSaved(id) { return !!saved.items[id]; }
  function storeSaved() { set(SAVED_KEY, JSON.stringify(capSaved(saved))); }
  function topicName(id) {
    if (data) for (var i = 0; i < data.topics.length; i++) if (data.topics[i].id === id) return { he: data.topics[i].he, en: data.topics[i].en };
    return null;
  }
  function snapshot(it) {
    var c = null; try { c = JSON.parse(JSON.stringify(it)); } catch (e) { c = {}; }
    c.id = itemId(it);
    var tn = topicName(it.topic); if (tn) c._topic = tn;
    return c;
  }
  function saveItem(it) {
    if (!it) return; var id = itemId(it);
    saved.items[id] = { at: Date.now(), it: snapshot(it) }; delete saved.del[id];
    storeSaved(); savedSoon();
  }
  function unsaveItem(id) {
    if (!saved.items[id]) return;
    delete saved.items[id]; saved.del[id] = Date.now();
    storeSaved(); savedSoon();
  }
  function savedList() { // newest saved first
    return Object.keys(saved.items).map(function (id) { return saved.items[id]; }).sort(function (a, b) { return b.at - a.at; });
  }
  // pure merge (exported for tests): two {items, del} copies -> one
  function mergeSaved(a, b) {
    a = cleanSaved(a); b = cleanSaved(b);
    var out = { items: {}, del: {} }, ids = {}, k;
    [a, b].forEach(function (o) { for (k in o.items) ids[k] = 1; for (k in o.del) ids[k] = 1; });
    for (k in ids) {
      var ia = a.items[k], ib = b.items[k], add = null;
      if (ia && ib) add = ia.at > ib.at ? ia : ib.at > ia.at ? ib : (JSON.stringify(ia.it).length >= JSON.stringify(ib.it).length ? ia : ib);
      else add = ia || ib;
      // keep the fuller snapshot (the cloud copy may have been trimmed of full texts)
      if (ia && ib && add.it && JSON.stringify(ia.it).length !== JSON.stringify(ib.it).length) {
        var fuller = JSON.stringify(ia.it).length > JSON.stringify(ib.it).length ? ia.it : ib.it;
        add = { at: add.at, it: fuller };
      }
      var d = Math.max(a.del[k] || 0, b.del[k] || 0);
      if (add && add.at >= d) out.items[k] = add; else if (d) out.del[k] = d;
    }
    return capSaved(out);
  }
  function cloudSavedCopy(o) { // trims full texts of the oldest saved items if the row would get too big
    var c = { items: {}, del: o.del, at: Date.now() }, k;
    for (k in o.items) c.items[k] = o.items[k];
    var list = Object.keys(c.items).sort(function (x, y) { return c.items[x].at - c.items[y].at; }), i = 0;
    while (JSON.stringify(c).length > CLOUD_BUDGET && i < list.length) {
      var e = c.items[list[i++]], it = {}, f;
      for (f in e.it) if (f.indexOf("full_") !== 0) it[f] = e.it[f];
      c.items[list[i - 1]] = { at: e.at, it: it };
    }
    return c;
  }
  function sameSaved(a, b) {
    var ka = Object.keys(a.items), kb = Object.keys(b.items), da = Object.keys(a.del), db = Object.keys(b.del);
    return ka.length === kb.length && da.length === db.length && ka.every(function (k) { return b.items[k] && b.items[k].at === a.items[k].at; }) && da.every(function (k) { return b.del[k] === a.del[k]; });
  }
  function savedSync() {
    if (!ACC || !ACC.user()) return;
    if (savedSyncing) { savedAgain = true; return; }
    savedSyncing = true;
    ACC.get("news", "saved").then(function (cloud) {
      var c = cleanSaved(cloud), m = mergeSaved(saved, c);
      if (!sameSaved(m, saved) || JSON.stringify(m) !== JSON.stringify(saved)) {
        var changedView = !sameSaved(m, saved);
        saved = m; storeSaved();
        if (changedView) { renderChips(); renderFeed(); }
      }
      if (!cloud || !sameSaved(m, c)) return ACC.set("news", "saved", cloudSavedCopy(m));
    }).catch(function () {}).then(function () {
      savedSyncing = false; if (savedAgain) { savedAgain = false; savedSync(); }
    });
  }
  function savedSoon() { if (!ACC || !ACC.user()) return; clearTimeout(savedTimer); savedTimer = setTimeout(savedSync, 600); }
  window.RGNewsSaved = { merge: mergeSaved, id: itemId, trim: cloudSavedCopy }; // for tests
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
    if (m) m.setAttribute("content", topic === SUMMARIES_VIEW ? (theme === "light" ? "#f3efe6" : "#0a1a3f") : (theme === "light" ? (LTC[lbg] || "#f3efe6") : (TC[bg] || "#e9506a")));
    document.documentElement.setAttribute("data-summ", topic === SUMMARIES_VIEW ? "1" : "0");
    if (!$("bg-sheet").hidden) renderSwatches(); // each mode shows its own backgrounds
    var b = $("theme-btn");
    b.querySelector(".ti").innerHTML = theme === "light" ? MOON : SUN;
    b.querySelector(".tl").textContent = theme === "light" ? t().dark : t().light;
    b.setAttribute("aria-label", theme === "light" ? t().toDark : t().toLight);
  }

  function renderChrome() {
    var he = lang === "he";
    document.documentElement.lang = lang;
    document.documentElement.dir = he ? "rtl" : "ltr";
    $("lang-he").setAttribute("aria-pressed", he ? "true" : "false");
    $("lang-en").setAttribute("aria-pressed", he ? "false" : "true");
    $("back").textContent = t().back;
    $("title").textContent = t().title;
    $("tagline").textContent = topic === SUMMARIES_VIEW ? t().sumTag : t().tagline;
    document.title = (topic === SUMMARIES_VIEW && summCurrent) ? summCurrent.title + " · " + t().doc : t().doc;
    $("install-btn").textContent = t().install;
    if (!$("install-hint").hidden) $("install-hint").textContent = t()[isIOS ? "ios" : "other"];
    $("note").textContent = t().note;
    renderRefreshBtn();
    $("copyright").textContent = t().copy;
    if (readerId) renderReader();
    $("bg-btn").setAttribute("aria-label", t().bgBtn); $("bg-btn").title = t().bgBtn;
    $("bg-title").textContent = t().bgTitle; $("bg-close").setAttribute("aria-label", t().close);
    $("chip-prev").setAttribute("aria-label", t().prev); $("chip-next").setAttribute("aria-label", t().next);
    renderSwatches();
    applyTheme();
  }

  function renderStatus() {
    var el = $("updated");
    if (topic === SUMMARIES_VIEW) {
      if (!sumItems && !sumErr) { el.textContent = t().sumLoading; return; }
      if (sumErr && !sumUpdated) { el.textContent = ""; return; }
      var sage = sumUpdated ? (Date.now() - new Date(sumUpdated)) / 3600000 : 0;
      var scls = navigator.onLine === false ? "off" : sage > 36 ? "stale" : "";
      el.innerHTML = '<span class="dot ' + scls + '"></span>' + esc(t().updated) + (sumUpdated ? " <b>" + esc(fmtDate(sumUpdated, true)) + "</b>" : "");
      return;
    }
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
    if (!data && topic !== SUMMARIES_VIEW) return;
    var tw = data ? topicsWithItems() : { list: [], count: {}, total: {}, unread: 0, read: 0 };
    if (data && topic !== "all" && topic !== SAVED_VIEW && topic !== SUMMARIES_VIEW && !(showRead ? tw.total[topic] : tw.count[topic])) topic = "all";
    function chip(id, label, n, cls, icon) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip" + (cls ? " " + cls : "");
      b.setAttribute("aria-pressed", topic === id ? "true" : "false");
      b.innerHTML = (icon || "") + esc(label) + (n ? '<span class="n">' + n + "</span>" : "");
      b.onclick = function () {
        if (topic === id) {
          if (id === SUMMARIES_VIEW && summCurrent) closeSummary(true);
          else window.scrollTo({ top: 0, behavior: smoothBehavior() });
          return;
        }
        var leaving = topic === SUMMARIES_VIEW;
        var prevTopic = topic;
        topic = id;
        if (id === SUMMARIES_VIEW) topicBeforeSumm = prevTopic;
        if (id !== SUMMARIES_VIEW) summCurrent = null;
        pinned = id === SUMMARIES_VIEW;
        if (id !== SAVED_VIEW && id !== SUMMARIES_VIEW) set(TOPIC_KEY, id);
        try {
          if (id === SUMMARIES_VIEW) history.pushState({ summ: 1 }, "", summPath(null));
          else if (leaving) history.pushState({ topic: id }, "", location.pathname);
        } catch (e) {}
        renderChips(); renderStatus(); renderFeed();
        if (id === SUMMARIES_VIEW && !sumItems && !sumLoading) loadSummaries();
        window.scrollTo({ top: 0, behavior: smoothBehavior() });
      };
      nav.appendChild(b);
      if (topic === id && b.scrollIntoView) setTimeout(function () { try { b.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" }); } catch (e) { b.scrollIntoView(); } }, 0);
    }
    chip("all", t().all, tw.unread);
    chip(SUMMARIES_VIEW, t().sumTab, sumItems ? sumItems.length : 0, "sumchip", '<span class="bi" aria-hidden="true">' + SUMI + "</span>");
    chip(SAVED_VIEW, t().saved, Object.keys(saved.items).length, "savedchip", '<span class="bi" aria-hidden="true">' + BMKF + "</span>");
    if (data) {
      var s0 = document.createElement("span"); s0.className = "sep"; nav.appendChild(s0);
      var lastGroup = null;
      tw.list.forEach(function (tp) {
        if (lastGroup && tp.group !== lastGroup) { var s = document.createElement("span"); s.className = "sep"; nav.appendChild(s); }
        lastGroup = tp.group;
        chip(tp.id, tp[lang] || tp.he, tw.count[tp.id]);
      });
    }
    setTimeout(updateArrows, 0);
  }

  // podcast episodes (kind "podcast"): a gold "🎙️ New episode · Show" line above the title
  function podBadge(it) {
    if (!it || it.kind !== "podcast") return "";
    return '<div class="pod"><span aria-hidden="true">🎙️</span> <b>' + esc(t().newEp) + "</b>" + (it.show ? " · " + esc(it.show) : "") + "</div>";
  }

  /* ----- "סכם לי": summary requests. A request = {id,url,title,kind,show,at} POSTed to a public ntfy.sh topic
     (free, no account, CORS open; no personal data, only the public item link). A routine polls the topic,
     writes summaries to ../summarify/summaries.json (entry.req = item id). Local state: rg-news-summ {id: time}.
     The same file feeds the סיכומים tab. Do not change the topic URL or the POST body. */
  var SUMM_KEY = "rg-news-summ", SUMM_Q = "rg-news-summ-q", SUMM_TOPIC = "https://ntfy.sh/rg-summ-req-e052dce29652", summDoneSet = {};
  function summMap() { var o = null; try { o = JSON.parse(get(SUMM_KEY) || "{}"); } catch (e) {} return o && typeof o === "object" ? o : {}; }
  function summQueue() { var a = null; try { a = JSON.parse(get(SUMM_Q) || "[]"); } catch (e) {} return Array.isArray(a) ? a : []; }
  function summPost(r) { return fetch(SUMM_TOPIC, { method: "POST", body: JSON.stringify(r) }).then(function (x) { if (!x.ok) throw new Error(x.status); }); }
  function summFlush() {
    var q = summQueue(); if (!q.length || !navigator.onLine) return;
    var r = q[0];
    summPost(r).then(function () { set(SUMM_Q, JSON.stringify(summQueue().filter(function (x) { return x.id !== r.id; }))); summFlush(); }, function () {});
  }
  function requestSummary(id) {
    var it = findItem(id); if (!it) return;
    var c = pick(it), m = summMap(); m[id] = Date.now(); set(SUMM_KEY, JSON.stringify(m));
    var r = { id: id, url: it.url || "", title: c.title || "", kind: it.kind || "", show: it.show || "", lang: lang, at: new Date().toISOString() };
    var q = summQueue().filter(function (x) { return x.id !== id; }); q.push(r); set(SUMM_Q, JSON.stringify(q));
    summFlush(); if (typeof toast === "function") toast(navigator.onLine ? t().summOk : t().summFail);
  }
  function summBtn(id) {
    if (summDoneSet[id]) return '<a class="sm done" data-act="summopen" href="?tab=summaries&item=' + encodeURIComponent(id) + '">' + esc(t().summDone) + "</a>";
    var sent = !!summMap()[id];
    return '<button type="button" class="sm' + (sent ? " sent" : "") + '" data-act="summ"' + (sent ? " disabled" : "") + ">" + esc(sent ? t().summSent : t().summ) + "</button>";
  }
  function loadSummDone() { loadSummaries(); }
  window.addEventListener("online", summFlush);
  function card(it, inSaved) {
    var id = itemId(it), c = pick(it), r = isRead(id), sv = isSaved(id);
    var tn = inSaved ? (topicName(it.topic) || it._topic) : null, tl = tn ? (tn[lang] || tn.he || tn.en) : "";
    return '<article class="card' + (r && !inSaved ? " isread" : "") + '" data-id="' + esc(id) + '">' +
      '<button type="button" class="bm" data-act="' + (sv ? "unsave" : "save") + '" aria-pressed="' + (sv ? "true" : "false") + '" aria-label="' + esc(sv ? t().unsave : t().save) + '" title="' + esc(sv ? t().unsave : t().save) + '">' + (sv ? BMKF : BMK) + "</button>" +
      podBadge(it) + "<h3>" + esc(c.title) + "</h3><p>" + esc(c.summary) +
      '</p><div class="meta"><span class="when">' + (tl ? '<b class="tp">' + esc(tl) + "</b> · " : "") + esc(rel(it.date)) + (it.source ? " · " + esc(it.source) : "") +
      '</span><span class="acts">' + summBtn(id) + '<button type="button" class="rd" data-act="' + (r ? "unread" : "read") + '">' + esc(r ? t().markUnread : t().markRead) + "</button>" +
      '<button type="button" class="sh" data-act="share" aria-label="' + esc(t().shareAria) + '" title="' + esc(t().shareAria) + '">' + SHARE + '<span>' + esc(t().share) + "</span></button>" +
      '<button type="button" class="more" data-act="more" aria-haspopup="dialog">' + esc(t().more) + MORE + "</button></span></div></article>";
  }
  function renderSaved() {
    var list = savedList(), feed = $("feed");
    if (!list.length) {
      feed.innerHTML = '<div class="caught savedempty"><div class="big bmbig" aria-hidden="true">' + BMK + "</div><b>" + esc(t().savedEmpty) + "</b><span>" + esc(t().savedEmptySub) + "</span></div>";
      return;
    }
    var n = list.length;
    feed.innerHTML = '<section class="group"><h2>' + esc(t().saved) + '</h2><div class="savedn">' + esc(n === 1 ? t().savedOne : n + " " + t().savedCount) + "</div>" +
      list.map(function (e) { return card(e.it, true); }).join("") + "</section>";
  }

  function renderFeed() {
    var feed = $("feed"), summBox = $("summ"), onSum = topic === SUMMARIES_VIEW;
    if (feed) feed.hidden = onSum;
    if (summBox) summBox.hidden = !onSum;
    syncSummChrome();
    if (onSum) { renderSummaries(); return; }
    if (topic === SAVED_VIEW) { renderSaved(); return; }
    if (!data) { feed.innerHTML = loading ? '<div class="empty">' + esc(t().loading) + "</div>" : '<div class="err">' + esc(t().error) + "</div>"; return; }
    var tw = topicsWithItems(), html = "", unreadShown = 0, readShown = 0;
    tw.list.filter(visible(tw)).forEach(function (tp) {
      var its = data.items.filter(function (it) { return it.topic === tp.id && (showRead || !isRead(it.id)); })
        .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      its.forEach(function (it) { if (isRead(it.id)) readShown++; else unreadShown++; });
      if (its.length) html += '<section class="group"><h2>' + esc(tp[lang] || tp.he) + "</h2>" + its.map(function (it) { return card(it, false); }).join("") + "</section>";
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
    if (el.classList.contains("src")) return; // opening the source doesn't mark it read; only the read button does
    if (act === "more" && c) { openReader(c.getAttribute("data-id")); return; }
    if (act === "summopen") {
      e.preventDefault();
      var sid = c ? c.getAttribute("data-id") : "";
      if (openSummary(sid, true)) return;
      topic = SUMMARIES_VIEW; pinned = true; summCurrent = null; summDeepId = sid;
      try { history.pushState({ summ: 1, summItem: sid }, "", summPath(sid)); } catch (err) {}
      renderChips(); renderStatus(); renderFeed();
      if (!sumItems && !sumLoading) loadSummaries();
      else if (sumItems) toast(t().sumNotFound);
      return;
    }
    if (act === "summ" && c) { requestSummary(c.getAttribute("data-id")); el.disabled = true; el.classList.add("sent"); el.textContent = t().summSent; return; }
    if (act === "share" && c) { shareItem(c.getAttribute("data-id")); return; }
    if (act === "save" && c) { saveItem(findItem(c.getAttribute("data-id"))); renderChips(); renderFeed(); return; }
    if (act === "unsave" && c) {
      unsaveItem(c.getAttribute("data-id"));
      if (topic === SAVED_VIEW) { c.style.height = c.offsetHeight + "px"; c.offsetHeight; c.classList.add("gone"); setTimeout(function () { renderChips(); renderFeed(); }, 380); }
      else { renderChips(); renderFeed(); }
      return;
    }
    if (act === "read" && c) { markRead([c.getAttribute("data-id")]); if (topic === SAVED_VIEW) { renderChips(); renderFeed(); } else afterMark([c]); }
    else if (act === "unread" && c) { markUnread(c.getAttribute("data-id")); renderChips(); renderFeed(); }
    else if (act === "all") {
      var cs = Array.prototype.slice.call($("feed").querySelectorAll(".card:not(.isread)"));
      markRead(cs.map(function (x) { return x.getAttribute("data-id"); })); afterMark(cs);
    } else if (act === "toggle") { showRead = !showRead; renderChips(); renderFeed(); }
  });

  setTimeout(function () { summFlush(); if (!sumItems && !sumLoading) loadSummaries(); }, 600);
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
      if (deepId !== null) handleDeepLink();
    });
  }

  /* ----- refresh button: re-fetch news.json past every cache, merge new items in, keep read/saved/tab/scroll ----- */
  var refreshing = false;
  function renderRefreshBtn() {
    var b = $("refresh-btn"); if (!b) return;
    b.innerHTML = '<span class="ri" aria-hidden="true">' + REFRESH + "</span><span>" + esc(refreshing ? t().refreshing : t().refresh) + "</span>";
    b.classList.toggle("spin", refreshing); b.disabled = refreshing;
    b.setAttribute("aria-busy", refreshing ? "true" : "false");
  }
  function mergeData(old, j) { // new items/topics win by id; items/topics only in the old copy stay in view
    if (!old) return j;
    var out = {}, k; for (k in j) out[k] = j[k];
    var ids = {}, items = j.items.slice();
    items.forEach(function (it) { ids[itemId(it)] = 1; });
    old.items.forEach(function (it) { if (!ids[itemId(it)]) items.push(it); });
    var tids = {}, topics = j.topics.slice();
    topics.forEach(function (tp) { tids[tp.id] = 1; });
    old.topics.forEach(function (tp) { if (!tids[tp.id]) topics.push(tp); });
    out.items = items; out.topics = topics;
    return out;
  }
  window.RGNewsRefresh = { merge: mergeData }; // for tests
  function refreshNow() {
    if (topic === SUMMARIES_VIEW) { refreshSummaries(); return; }
    if (refreshing) return;
    if (navigator.onLine === false) { toast(t().noNet); return; }
    refreshing = true; renderRefreshBtn();
    var before = {}; if (data) data.items.forEach(function (it) { before[itemId(it)] = 1; });
    var y = window.scrollY, failMsg = null, added = false;
    fetch("news.json?r=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) { failMsg = t().refreshFail; throw new Error(r.status); } return r.json();
    }).then(function (j) {
      if (!j || !Array.isArray(j.items) || !Array.isArray(j.topics)) { failMsg = t().refreshFail; throw new Error("bad"); }
      j.items.forEach(function (it) { if (!before[itemId(it)]) added = true; });
      data = mergeData(data, j); offline = false; lastFetch = Date.now();
      try { localStorage.setItem("rg-news-cache", JSON.stringify(data)); } catch (e) {}
      renderStatus(); renderChips(); renderFeed();
      window.scrollTo(0, y);
      setTimeout(function () { window.scrollTo(0, y); }, 0); // after the active chip's scrollIntoView (renderChips) runs
      if (readerId) renderReader();
      toast(added ? t().newItems : t().noNew);
    }).catch(function () {
      toast(failMsg || t().noNet);
    }).then(function () { refreshing = false; renderRefreshBtn(); });
  }
  $("refresh-btn").onclick = refreshNow;

  /* ----- toast ----- */
  var toastTimer = 0;
  function toast(msg) {
    var el = $("toast"); el.textContent = msg; el.hidden = false;
    el.classList.remove("show"); el.offsetWidth; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.classList.remove("show"); setTimeout(function () { el.hidden = true; }, 250); }, 2400);
  }

  /* ----- share: deep link to one item (news/?item=<id>) ----- */
  function itemLink(id) {
    var base = new URL("./", location.href); // the news/ folder, without index.html, query or hash
    return base.origin + base.pathname + "?item=" + encodeURIComponent(id);
  }
  function copyText(s) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(s).catch(function () { return legacyCopy(s); });
    }
    return legacyCopy(s);
  }
  function legacyCopy(s) {
    return new Promise(function (ok, no) {
      var ta = document.createElement("textarea"); ta.value = s; ta.setAttribute("readonly", "");
      ta.style.position = "fixed"; ta.style.top = "-1000px"; ta.style.opacity = "0"; document.body.appendChild(ta);
      ta.select(); var r = false; try { r = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta); r ? ok() : no(new Error("copy"));
    });
  }
  function shareItem(id) {
    var it = findItem(id); if (!id) return;
    var title = (it && pick(it).title) || t().title, url = itemLink(id);
    function fallback() { copyText(url).then(function () { toast(t().copied); }, function () { toast(t().copyFail); }); }
    if (navigator.share) {
      navigator.share({ title: title, text: title, url: url }).catch(function (e) { if (!e || e.name !== "AbortError") fallback(); });
    } else fallback();
  }
  window.RGNewsShare = { link: itemLink }; // for tests

  /* ----- deep link: ?item=<id> opens a news item. ?tab=summaries (&item=) opens the summaries tab. ----- */
  function readLocationQ() {
    var tab = null, item = null;
    try {
      var p = new URLSearchParams(location.search);
      tab = p.get("tab");
      item = p.get("item");
    } catch (e) {}
    if (!item) {
      var m = /(?:^#|&)item=([^&]+)/.exec(location.hash || "");
      if (m) { try { item = decodeURIComponent(m[1]); } catch (e2) { item = m[1]; } }
    }
    return { tab: tab, item: item ? String(item).slice(0, 200) : null };
  }
  var bootQ = readLocationQ();
  var deepId = bootQ.tab === "summaries" ? null : bootQ.item;
  var summDeepId = bootQ.tab === "summaries" ? bootQ.item : null;
  var pinned = false; // while true, a synced topic preference doesn't switch away from the deep-linked item or the summaries tab
  var topicBeforeSumm = null;
  if (bootQ.tab === "summaries") { topic = SUMMARIES_VIEW; pinned = true; }
  function cleanUrl() {
    try {
      var u = new URL(location.href); u.searchParams.delete("item");
      if (/(?:^#|&)item=/.test(u.hash)) u.hash = "";
      history.replaceState(history.state, "", u.pathname + u.search + u.hash);
    } catch (e) {}
  }
  function handleDeepLink() {
    var id = deepId; deepId = null; cleanUrl();
    if (!data) return; // nothing loaded at all: the normal error message stays
    var live = null;
    for (var i = 0; i < data.items.length; i++) if (itemId(data.items[i]) === id) { live = data.items[i]; break; }
    if (!live && !saved.items[id]) { if (topic === SAVED_VIEW) topic = "all"; renderChips(); renderFeed(); toast(t().gone); return; }
    if (live) {
      if (isRead(id)) showRead = true;
      if (topic !== "all" && topic !== live.topic) topic = topic === SAVED_VIEW && isSaved(id) ? SAVED_VIEW : live.topic;
    } else topic = SAVED_VIEW; // only kept as a saved copy
    pinned = true;
    renderChips(); renderFeed();
    var c = $("feed").querySelector('.card[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id.replace(/"/g, "")) + '"]');
    if (c) {
      c.classList.add("deep");
      c.scrollIntoView({ block: "center" });
      setTimeout(function () { c.classList.remove("deep"); }, 4000);
    }
    openReader(id);
  }


  /* ----- in-app reader: full text (full_he / full_en) so nothing needs X or another site ----- */
  var readerId = null, readerFrom = null;
  function findItem(id) {
    if (data) for (var i = 0; i < data.items.length; i++) if (itemId(data.items[i]) === id) return data.items[i];
    return saved.items[id] ? saved.items[id].it : null; // saved snapshot (also after it left news.json)
  }
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
    $("rd-meta").textContent = (it.kind === "podcast" ? "🎙️ " + t().newEp + (it.show ? " · " + it.show : "") + " · " : "") + rel(it.date) + (it.source && it.source !== it.show ? " · " + it.source : "");
    box.innerHTML = f ? richText(f.text) : '<p>' + esc(c.summary) + '</p><p class="na">' + esc(t().fullNA) + "</p>";
    var a = $("rd-src"); a.href = safeUrl(it.url); a.innerHTML = esc(t().read) + EXT;
    $("rd-close").setAttribute("aria-label", t().close); $("rd-close").title = t().close;
    var sb = $("rd-share"); sb.innerHTML = SHARE + "<span>" + esc(t().share) + "</span>"; sb.setAttribute("aria-label", t().shareAria); sb.title = t().shareAria;
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
    // items are marked read only manually, via the "read" button
    if (readerFrom && readerFrom.focus) readerFrom.focus();
  }
  $("rd-close").onclick = closeReader;
  $("rd-share").onclick = function () { if (readerId) shareItem(readerId); };
  $("rd-sheet").addEventListener("click", function (e) { if (e.target === $("rd-sheet")) closeReader(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeReader(); });

  /* ----- background picker: night 0-10 (rg-news-bg, 0 = original, as on the landing page), light 0-10 (rg-news-bg-light, 0 = original) ----- */
  function renderSwatches() {
    var box = $("swatches"), html = "", L = theme === "light";
    for (var i = 0; i <= 10; i++) {
      var pv = L ? (i === 0 ? "linear-gradient(180deg,#f6f2ea 0%,#f3efe6 50%,#ebe5d8 100%)" : "var(--lbgi-" + i + "),var(--lbgc-" + i + ")") : (i === 0 ? "linear-gradient(180deg,#0f172a 0%,#1e293b 100%)" : "var(--bgi-" + i + "),var(--bgc-" + i + ")");
      html += '<button type="button" class="sw" data-bg="' + i + '" aria-pressed="' + (String(i) === (L ? lbg : bg) ? "true" : "false") + '">' +
        '<span class="pv" style="background:' + pv + '"><span class="num">' + (i === 0 ? "★" : i) + '</span></span>' +
        '<span class="nm">' + esc(L ? t().lbgs[i] : t().bgs[i]) + "</span></button>";
    }
    box.innerHTML = html;
  }
  function setBg(v, mode) {
    if ((mode || theme) === "light") {
      lbg = /^([0-9]|10)$/.test(String(v)) ? String(v) : "0"; set(LBG_KEY, lbg);
      document.documentElement.setAttribute("data-lbg", lbg);
    } else {
      if (!/^([0-9]|10)$/.test(String(v))) return;
      bg = String(v); set(BG_KEY, bg);
      document.documentElement.setAttribute("data-bg", bg);
    }
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
    if (document.visibilityState === "visible" && Date.now() - lastPull > 5000) { cloudSync(); savedSync(); }
    if (document.visibilityState === "hidden" && syncTimer) { clearTimeout(syncTimer); syncTimer = 0; cloudSync(); }
    if (document.visibilityState === "hidden" && savedTimer) { clearTimeout(savedTimer); savedTimer = 0; savedSync(); }
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

  /* ----- summaries tab: same reader Summarify had, data stays at ../summarify/summaries.json ----- */
  var sumItems = null, sumErr = false, sumUpdated = "", sumLoading = false, summCurrent = null;
  function smoothBehavior() {
    try { if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "auto"; } catch (e) {}
    return "smooth";
  }
  function syncSummChrome() {
    var on = topic === SUMMARIES_VIEW;
    document.documentElement.setAttribute("data-summ", on ? "1" : "0");
    if ($("tagline")) $("tagline").textContent = on ? t().sumTag : t().tagline;
    if (!(on && summCurrent)) document.title = t().doc;
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) return;
    if (on) m.setAttribute("content", theme === "light" ? "#f3efe6" : "#0a1a3f");
    else m.setAttribute("content", theme === "light" ? (LTC[lbg] || "#f3efe6") : (TC[bg] || "#0a1a3f"));
  }
  function summPath(id) {
    var u = new URL("./", location.href);
    u.searchParams.set("tab", "summaries");
    if (id) u.searchParams.set("item", id);
    return u.pathname + u.search;
  }
  function summAbs(id) {
    var u = new URL("./", location.href);
    u.searchParams.set("tab", "summaries");
    if (id) u.searchParams.set("item", id);
    return u.origin + u.pathname + u.search;
  }
  function summLoc(v) { return v && typeof v === "object" ? (v[lang] || v.he || "") : (v || ""); }
  function summInline(s) {
    s = esc(s);
    s = s.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[\s(])\*([^*\s][^*]*?)\*(?=[\s).,:;!?]|$)/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return s;
  }
  function summMd(src, skipTitle) {
    var lines = String(src || "").replace(/\r\n?/g, "\n").split("\n"), out = [], para = [], list = null;
    function flushP() { if (para.length) { out.push("<p>" + summInline(para.join(" ")) + "</p>"); para = []; } }
    function flushL() { if (list) { out.push("<" + list.tag + ">" + list.items.map(function (x) { return "<li>" + summInline(x) + "</li>"; }).join("") + "</" + list.tag + ">"); list = null; } }
    var first = true;
    lines.forEach(function (ln) {
      var m;
      if (/^\s*$/.test(ln)) { flushP(); flushL(); return; }
      if ((m = /^(#{1,3})\s+(.*)$/.exec(ln))) {
        flushP(); flushL();
        if (first && m[1].length === 1 && skipTitle) { first = false; return; }
        var lv = Math.max(2, m[1].length); out.push("<h" + lv + ">" + summInline(m[2]) + "</h" + lv + ">"); first = false; return;
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
  function summExcerpt(it) {
    var lines = String(it.body || "").split("\n");
    for (var i = 0; i < lines.length; i++) { var l = lines[i].trim(); if (l && !/^#/.test(l) && !/^[-*]\s/.test(l)) return l.replace(/\*\*/g, ""); }
    return "";
  }
  function summFmtDate(s) {
    if (!s) return "";
    var d = new Date(s + (String(s).length === 10 ? "T12:00:00" : ""));
    if (isNaN(d)) return s;
    try { return d.toLocaleDateString(lang === "he" ? "he-IL" : "en-GB", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return s; }
  }
  function findSummary(key) {
    if (!sumItems || !key) return null;
    var i, it;
    for (i = 0; i < sumItems.length; i++) { it = sumItems[i]; if (it.id === key) return it; }
    for (i = 0; i < sumItems.length; i++) { it = sumItems[i]; if (it.req === key) return it; }
    return null;
  }
  function summSrc(it) {
    var g = summLoc(it.guest), sh = summLoc(it.show);
    return esc(sh) + (g ? " · " + esc(t().sumGuest) + " " + esc(g) : "");
  }
  function summCardHtml(it) {
    var heOnly = (it.lang || "he") === "he";
    return '<article class="scard" id="sc-' + esc(it.id) + '" data-id="' + esc(it.id) + '">' +
      '<p class="src">' + summSrc(it) + "</p>" +
      '<h2 lang="he" dir="rtl">' + esc(it.title) + "</h2>" +
      '<p class="ex" lang="he" dir="rtl">' + esc(summExcerpt(it)) + "</p>" +
      (lang !== "he" && heOnly && t().sumHeOnly ? '<p class="sheonly">' + esc(t().sumHeOnly) + "</p>" : "") +
      '<div class="smeta"><span>' + esc(t().sumEpisodeDate) + " " + esc(summFmtDate(it.date)) + "</span>" +
      '<span class="sacts"><button type="button" class="ssh" data-act="share" aria-label="' + esc(t().sumShareAria) + '" title="' + esc(t().sumShareAria) + '">' + SHARE + "<span>" + esc(t().share) + "</span></button>" +
      '<button type="button" class="smore" data-act="open">' + esc(t().sumRead) + SUMARROW + "</button></span></div></article>";
  }
  function renderFullSummary() {
    var it = summCurrent; if (!it || !$("sdoc")) return;
    $("sum-back").textContent = t().sumToList;
    var sb = $("sum-share");
    sb.innerHTML = SHARE + "<span>" + esc(t().share) + "</span>";
    sb.setAttribute("aria-label", t().sumShareAria);
    sb.title = t().sumShareAria;
    var ho = $("sum-heonly");
    ho.textContent = t().sumHeOnly;
    ho.hidden = !(lang !== "he" && (it.lang || "he") === "he" && t().sumHeOnly);
    $("sdoc").innerHTML = '<p class="src">' + summSrc(it) + "</p>" +
      '<h1 class="t">' + esc(it.title) + "</h1>" +
      '<div class="smd">' + summMd(it.body, true) + "</div>" +
      '<div class="sfoot" dir="' + (lang === "he" ? "rtl" : "ltr") + '" lang="' + lang + '"><span>' + esc(t().sumEpisodeDate) + " " + esc(summFmtDate(it.date)) + "</span>" +
      (it.url ? '<a href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t().sumSource) + " ↗</a>" : "") + "</div>";
  }
  function renderSummaries() {
    syncSummChrome();
    if (!$("slist")) return;
    if (summCurrent) {
      var fresh = findSummary(summCurrent.id) || (summCurrent.req && findSummary(summCurrent.req));
      if (fresh) summCurrent = fresh;
      else if (sumItems) summCurrent = null;
    }
    if (summCurrent) {
      renderFullSummary();
      $("slist").hidden = true;
      $("sfull").hidden = false;
      if ($("sumlead")) $("sumlead").hidden = true;
      document.title = summCurrent.title + " · " + t().doc;
      return;
    }
    $("sfull").hidden = true;
    $("slist").hidden = false;
    if ($("sumlead")) $("sumlead").hidden = true;
    document.title = t().doc;
    var box = $("slist");
    if (sumErr && !sumItems) { box.innerHTML = '<p class="serr">' + esc(t().sumErr) + "</p>"; return; }
    if (!sumItems) { box.innerHTML = '<p class="sempty">' + esc(t().sumLoading) + "</p>"; return; }
    if (!sumItems.length) { box.innerHTML = '<p class="sempty">' + esc(t().sumEmpty) + "</p>"; return; }
    box.innerHTML = sumItems.map(summCardHtml).join("");
  }
  function scrollToSummCard(it) {
    if (!it) return;
    var el = document.getElementById("sc-" + it.id);
    if (!el || !el.scrollIntoView) return;
    try { el.scrollIntoView({ block: "center", behavior: smoothBehavior() }); } catch (e) { el.scrollIntoView(); }
    el.classList.add("deep");
    setTimeout(function () { el.classList.remove("deep"); }, 4000);
  }
  function openSummary(id, push) {
    var it = findSummary(id); if (!it) return false;
    if (topic !== SUMMARIES_VIEW) topicBeforeSumm = topic;
    summCurrent = it;
    topic = SUMMARIES_VIEW;
    pinned = true;
    renderChips(); renderStatus(); renderFeed();
    try { window.scrollTo({ top: 0, behavior: smoothBehavior() }); } catch (e) { window.scrollTo(0, 0); }
    if (push) { try { history.pushState({ summ: 1, summItem: it.id }, "", summPath(it.id)); } catch (e2) {} }
    return true;
  }
  function closeSummary(fromBtn) {
    var was = summCurrent;
    if (fromBtn && history.state && history.state.summItem) { history.back(); return; }
    summCurrent = null;
    renderStatus(); renderFeed();
    if (fromBtn) { try { history.replaceState({ summ: 1 }, "", summPath(null)); } catch (e) {} }
    setTimeout(function () { scrollToSummCard(was); }, 40);
  }
  function shareSummary(it) {
    if (!it) return;
    var url = summAbs(it.id), title = it.title;
    function fallback() { copyText(url).then(function () { toast(t().copied); }, function () { toast(t().copyFail); }); }
    if (navigator.share) navigator.share({ title: title, text: title, url: url }).catch(function (e) { if (!e || e.name !== "AbortError") fallback(); });
    else fallback();
  }
  function applySummJson(j) {
    var items = ((j && j.items) || []).filter(function (x) { return x && x.id && x.title; });
    items.sort(function (a, b) { return String(b.date || "").localeCompare(String(a.date || "")); });
    sumItems = items;
    sumUpdated = (j && j.updated) || "";
    sumErr = false;
    var ch = false;
    items.forEach(function (x) {
      [x.req, x.id].forEach(function (k) { if (k && !summDoneSet[k]) { summDoneSet[k] = 1; ch = true; } });
    });
    return ch;
  }
  function consumeSummDeep() {
    if (!summDeepId || !sumItems) return;
    var id = summDeepId; summDeepId = null;
    if (!openSummary(id, false)) toast(t().sumNotFound);
  }
  function loadSummaries() {
    if (sumLoading) return;
    sumLoading = true;
    sumErr = false;
    if (topic === SUMMARIES_VIEW && !sumItems) { renderStatus(); renderSummaries(); }
    fetch("../summarify/summaries.json", { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error(r.status); return r.json();
    }).then(function (j) {
      var ch = applySummJson(j);
      sumLoading = false;
      if (topic === SUMMARIES_VIEW) { renderChips(); renderStatus(); renderSummaries(); }
      else if (ch && data) renderFeed();
      consumeSummDeep();
    }).catch(function () {
      sumLoading = false;
      if (!sumItems) sumErr = true;
      if (topic === SUMMARIES_VIEW) { renderStatus(); renderSummaries(); }
      if (summDeepId && !sumItems) toast(t().sumErr);
    });
  }
  function refreshSummaries() {
    if (refreshing) return;
    if (navigator.onLine === false) { toast(t().noNet); return; }
    refreshing = true; renderRefreshBtn();
    var before = {}, added = false, failMsg = null, y = window.scrollY;
    (sumItems || []).forEach(function (it) { before[it.id] = 1; });
    fetch("../summarify/summaries.json?r=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) { failMsg = t().refreshFail; throw new Error(r.status); } return r.json();
    }).then(function (j) {
      if (!j || !Array.isArray(j.items)) { failMsg = t().refreshFail; throw new Error("bad"); }
      j.items.forEach(function (it) { if (it && it.id && !before[it.id]) added = true; });
      applySummJson(j);
      renderChips(); renderStatus(); renderSummaries();
      if (!summCurrent) { window.scrollTo(0, y); setTimeout(function () { window.scrollTo(0, y); }, 0); }
      toast(added ? t().sumNew : t().sumNoNew);
    }).catch(function () { toast(failMsg || t().noNet); })
      .then(function () { refreshing = false; renderRefreshBtn(); });
  }
  function onSummPop() {
    var q = readLocationQ();
    var prev = summCurrent;
    if (q.tab === "summaries") {
      topic = SUMMARIES_VIEW;
      pinned = true;
      if (q.item) {
        var it = findSummary(q.item);
        summCurrent = it || null;
        if (!it && sumItems) toast(t().sumNotFound);
        if (!it && !sumItems) summDeepId = q.item;
      } else summCurrent = null;
      renderChips(); renderStatus(); renderFeed();
      if (!q.item && prev) setTimeout(function () { scrollToSummCard(prev); }, 40);
      return;
    }
    summCurrent = null;
    pinned = false;
    var next = topicBeforeSumm || get(TOPIC_KEY) || "all";
    topicBeforeSumm = null;
    if (!next || next === SUMMARIES_VIEW) next = "all";
    topic = next;
    renderChips(); renderStatus(); renderFeed();
  }
  window.addEventListener("popstate", onSummPop);
  if ($("sum-back")) $("sum-back").onclick = function () { closeSummary(true); };
  if ($("sum-share")) $("sum-share").onclick = function () { if (summCurrent) shareSummary(summCurrent); };
  if ($("slist")) $("slist").addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-act]");
    var c = e.target.closest && e.target.closest(".scard");
    if (!c) return;
    var id = c.getAttribute("data-id");
    if (b && b.getAttribute("data-act") === "share") { var it = findSummary(id); if (it) shareSummary(it); return; }
    if (b && b.getAttribute("data-act") === "open") { openSummary(id, true); return; }
    if (!e.target.closest("a,button")) openSummary(id, true);
  });
  loadSummaries();

  /* ----- boot ----- */
  renderAll();
  updateInstall();
  load();
  if (ACC) {
    ACC.ready.then(function () { cloudSync(); savedSync(); });
    ACC.onChange(function (u) { if (u) { cloudSync(); savedSync(); } });
    // language, theme, background and topic follow the account across devices
    ACC.syncPrefs([LANG_KEY, THEME_KEY, BG_KEY, LBG_KEY, TOPIC_KEY], function (c) {
      if (LANG_KEY in c) lang = c[LANG_KEY] === "en" ? "en" : "he";
      if (THEME_KEY in c) theme = c[THEME_KEY] === "light" ? "light" : "dark";
      if (BG_KEY in c && /^([0-9]|10)$/.test(c[BG_KEY] || "")) { bg = c[BG_KEY]; document.documentElement.setAttribute("data-bg", bg); }
      if (LBG_KEY in c && /^([0-9]|10)$/.test(c[LBG_KEY] || "")) { lbg = c[LBG_KEY]; document.documentElement.setAttribute("data-lbg", lbg); }
      if (TOPIC_KEY in c && c[TOPIC_KEY] && c[TOPIC_KEY] !== SUMMARIES_VIEW && c[TOPIC_KEY] !== SAVED_VIEW && !pinned && deepId === null && topic !== SUMMARIES_VIEW) topic = c[TOPIC_KEY];
      renderAll(); return true;
    });
  }
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  }
})();
