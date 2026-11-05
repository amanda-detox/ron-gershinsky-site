/* Healify sandbox (healify-sandbox/). Not linked from the homepage.
   Guest answers stay in localStorage "rg-sbx-healify:guest". A signed-in user's answers are
   Appwrite app "sbxhealify", one row, readable only by that user.
   This copy never reads or deletes the live key rg-healify-v1, and it never opens pubhealify.
   Content lives in content.js. The score colors are the original blue-to-red scale. */
(function () {
  "use strict";
  var C = window.HEALIFY_CONTENT || {};
  var LANG_KEY = "rg-lang";
  var $ = function (id) { return document.getElementById(id); };
  var lang = "he";
  try { if (localStorage.getItem(LANG_KEY) === "en") lang = "en"; } catch (e) {}

  var CASES = ["autoimmune", "cancer", "mental", "bipolar", "depression", "addiction", "psychmeds", "other"];
  var BASECASES = ["autoimmune", "cancer", "mental", "other"]; // ids used by content.js cases/combos
  var FIELDS = ["diagnoses", "prognoses", "symptoms", "physical", "emotional", "mental", "consciousness"];
  var SCORES = ["emotional", "physical", "mental"];
  var VIEWS = ["a", "b", "c", "sum"];
  var RECS = (Array.isArray(C.recs) ? C.recs : []).filter(function (r) { return r && r.id; });
  var RECIDS = RECS.map(function (r) { return r.id; });

  var T = {
    he: {
      doc: "היליפיי", back: "← חזרה לאתר",
      eyebrow: "", title: "היליפיי", tagline: "אפליקציה להבנה כוללת של מצבך והצעת פתרונות בהתאם, אל עבר בריאות מלאה, כושר ושגשוג.",
      sub: "מתחילים בתיאור המצב הנוכחי, ממשיכים לאבחנה מלאה ולהמלצות, ומסיימים בסיכום.",
      start: "בוא נתחיל", resume: "המשך מאיפה שעצרת",
      meta: "הכול נשמר אוטומטית ורק במכשיר שלך",
      install: "📲 התקנה למסך הבית",
      ios: "באייפון או באייפד: לוחצים על כפתור השיתוף <b>(□↑)</b> בתחתית Safari, ואז בוחרים <b>„הוסף למסך הבית”</b>.",
      other: "בתפריט הדפדפן (⋮) בוחרים <b>„התקנת אפליקציה”</b> או <b>„הוספה למסך הבית”</b>.",
      disc: "<b>חשוב:</b> היליפיי אינה ייעוץ רפואי. היא אינה מחליפה רופא, אבחון או טיפול רפואי. לפני כל שינוי בטיפול יש להתייעץ עם רופא.<span class=em><b>במצב חירום או סכנה:</b> מד״א <a href=\"tel:101\">101</a> · ער״ן, עזרה ראשונה נפשית <a href=\"tel:1201\">1201</a></span>",
      steps: ["א · המצב הנוכחי", "ב · אבחנה מלאה", "ג · המלצות", "ד · סיכום"],
      stepnum: function (i) { return "שלב " + i + " מתוך 4"; },
      prev: "→ הקודם", next: "הבא ←", toSum: "לסיכום ←", edit: "→ חזרה לעריכה", home: "→ למסך הפתיחה", homeBack: "→ חזרה", homeBackLabel: "חזרה למסך הראשי של היליפיי",
      saved: "✓ נשמר במכשיר", saving: "שומר…",
      aTitle: "א · המצב הנוכחי",
      aLead: "כתוב בפירוט, במילים שלך. כל השדות אופציונליים, ואפשר לחזור ולהשלים בכל זמן.",
      casesTitle: "סוג המקרה", casesHelp: "אפשר לבחור יותר מאחד. הבחירה קובעת אילו המלצות יוצגו בשלב ג.",
      cases: { autoimmune: "אוטואימון", cancer: "סרטן", mental: "מחלה נפשית", bipolar: "ביפולר (דו קוטבי)", depression: "דיכאון", addiction: "התמכרות", psychmeds: "שימוש בכדורים פסיכיאטריים", other: "אחר / צירוף" },
      otherPh: "תאר במילים שלך את המקרה או את הצירוף",
      descTitle: "תיאור מפורט", descHelp: "מה ידוע, מה מרגישים, ואיך זה משפיע עליך.",
      opt: "(אופציונלי)",
      fields: {
        diagnoses: ["דיאגנוזות (אבחנות)", "אילו אבחנות קיבלת, ממי ומתי"],
        prognoses: ["פרוגנוזות (תחזית)", "מה נאמר לך על המשך הדרך"],
        symptoms: ["תסמינים", "מה התסמינים, מתי הם מופיעים ובאיזו עוצמה"],
        physical: ["החוויה הפיזית", "איך זה מרגיש בגוף"],
        emotional: ["החוויה הרגשית", "אילו רגשות עולים"],
        mental: ["החוויה המנטלית", "מחשבות, ריכוז, דפוסים"],
        consciousness: ["החוויה התודעתית", "תחושת משמעות, רוח, מודעות"]
      },
      scalesTitle: "מדדי סבל", scalesHelp: "דרג כל סוג סבל בנפרד: 1 = מעט מאוד, 10 = הכי קשה.",
      scores: { emotional: "סבל רגשי", physical: "סבל פיזי", mental: "סבל מנטלי" },
      low: "1 · מעט מאוד", high: "10 · קשה מאוד", none: "לא דורג", clearScore: "ניקוי",
      bTitle: "ב · אבחנה מלאה",
      bLead: "בדיקות שכדאי לעשות כדי לקבל תמונה ברורה וממוקדת יותר.",
      bGroups: { free: ["בדיקות חינמיות ואונליין", "חינמיות, אפשר לעשות אונליין"], home: ["ערכות בדיקה עד הבית", "מזמינים אונליין עד הבית ומבצעים לבד לפי ההנחיות"] },
      cTitle: "ג · המלצות", cTechTitle: "טכנולוגיות",
      cLead: "השקעה בטכנולוגיות, בשלוש רמות.",
      cGroups: { free: ["חינמי", "טכנולוגיות חינמיות"], low: ["עלות נמוכה", "טכנולוגיות בעלות נמוכה"], premium: ["יוקרתי", "טכנולוגיות יקרות ויוקרתיות"] },
      tiers: { free: "0 ₪", low: "₪", premium: "₪₪₪" },
      dCases: { autoimmune: ["אוטואימון", "אם יש מחלה אוטואימונית"], cancer: ["סרטן", "אם יש סרטן"], mental: ["מחלה נפשית", "אם יש מחלה נפשית"], combo: ["צירוף", "אם יש צירוף של כמה מצבים"] },
      soon: "יצורף בקרוב",
      link: "לפרטים ←",
      sumTitle: "ד · סיכום", sumLead: "כל מה שמילאת, במקום אחד.",
      sumHome: "הסיכום שלך", sumHomeLead: "אלה התשובות שנשמרו. אפשר לערוך אותן, או לרענן את ההמלצות.",
      editAnswers: "עריכת התשובות", refreshRecs: "רענון המלצות", refreshed: "ההמלצות עודכנו לפי התשובות",
      confirmRefresh: "לרענן את ההמלצות לפי התשובות? פריטים שהוספת או ערכת יישארו.",
      backSum: "→ לסיכום",
      savedAccount: "✓ נשמר בחשבון", savedOffline: "נשמר במכשיר. יסתנכרן כשהחיבור יחזור",
      metaAccount: "הכול נשמר בחשבון שלך",
      privacyAccount: "התשובות נשמרות בחשבון שלך, ורק אתה יכול לראות אותן.",
      recsHint: "לחיצה ארוכה בוחרת פריט ומסמנת אותו במסגרת זהובה. אחרי הבחירה, החלקה לצד מוחקת והחלקה למעלה או למטה משנה את הסדר.",
      recsSel: "הפריט נבחר. החלקה לצד מוחקת, החלקה למעלה או למטה מזיזה.",
      addRec: "הוספה", phRec: "המלצה או שיטת טיפול", phNote: "הערה (אופציונלי)", phLink: "קישור (אופציונלי)", phPrice: "מחיר (אופציונלי)",
      editItem: "עריכה", saveItem: "שמירה", cancelItem: "ביטול", delItem: "מחיקה", moveUp: "למעלה", moveDown: "למטה",
      deletedItem: "הפריט נמחק", undo: "ביטול", emptyRecs: "עוד אין כאן פריטים. אפשר להוסיף, או לרענן לפי התשובות.",
      badLink: "הקישור צריך להתחיל ב-http", badPrice: "המחיר לא נראה תקין", price: "מחיר",
      mantrasTitle: "מנטרות", mantrasLead: "אפשר להציג כל מנטרה גם ברוסית ובאנגלית.",
      langRu: "רוסית", langEn: "EN", showRu: "הצגת התרגום לרוסית", hideRu: "הסתרת התרגום לרוסית", showEn: "הצגת התרגום לאנגלית", hideEn: "הסתרת התרגום לאנגלית",
      sumScores: "מדדי סבל", sumCases: "סוג המקרה", sumDesc: "התיאור שלך", sumData: "הנתונים שלך",
      noCases: "לא נבחר", empty: "לא מולא",
      expTxt: "⬇ הורדה כקובץ טקסט", expJson: "⬇ הורדה כ-JSON", clear: "🗑 מחיקת הנתונים שלי",
      confirm: "למחוק את כל מה שמילאת בהיליפיי מהמכשיר הזה? אי אפשר לבטל את זה.",
      cleared: "הנתונים נמחקו", downloaded: "הקובץ ירד",
      privacy: "הנתונים נשמרים רק בדפדפן במכשיר הזה ולא נשלחים לשום מקום. מומלץ להוריד עותק מדי פעם.",
      recsTitle: "המלצות", recsLead: "לפי המצב שבחרת בשלב א.",
      recsAll: "עוד לא בחרת מצב בשלב א, ולכן מוצגות כל ההמלצות.",
      recsNoMatch: "עוד אין המלצות למצב שבחרת. אפשר לבחור מצב נוסף בשלב א.",
      sumRecs: "ההמלצות שהוצגו לך (שלב ג)", sumRecsNone: "לא הוצגו המלצות",
      recsDisc: "אין לראות במידע המוצג כאן ייעוץ רפואי. מומלץ להיוועץ ברופא פונקציונלי לפני תחילת תהליך משנה חיים. כל הטיפולים המומלצים כאן ניתנים במכונים וקליניקות עם השגחה רפואית.",
      foot: "היליפיי · Healify · גרסה 1",
      fileTitle: "היליפיי · הסיכום שלי", fileDate: "תאריך"
    },
    en: {
      doc: "Healify", back: "← Back to site",
      eyebrow: "", title: "Healify", tagline: "An app for a complete understanding of your condition and matching solutions, toward full health, fitness and flourishing.",
      sub: "Start with your current situation, continue to a full diagnosis and recommendations, and finish with a summary.",
      start: "Let's begin", resume: "Continue where you left off",
      meta: "Everything saves automatically, only on your device",
      install: "📲 Add to home screen",
      ios: "On iPhone or iPad: tap the Share button <b>(□↑)</b> at the bottom of Safari, then choose <b>“Add to Home Screen”</b>.",
      other: "Open your browser menu (⋮) and choose <b>“Install app”</b> or <b>“Add to Home screen”</b>.",
      disc: "<b>Important:</b> Healify is not medical advice. It does not replace a doctor, diagnosis, or medical treatment. Consult a doctor before any change in treatment.<span class=em><b>In an emergency or danger:</b> Israel: MDA <a href=\"tel:101\">101</a> · ERAN emotional first aid <a href=\"tel:1201\">1201</a> · elsewhere, your local emergency number</span>",
      steps: ["A · Current situation", "B · Full diagnosis", "C · Recommendations", "D · Summary"],
      stepnum: function (i) { return "Step " + i + " of 4"; },
      prev: "← Back", next: "Next →", toSum: "To summary →", edit: "← Back to editing", home: "← Home", homeBack: "← Back", homeBackLabel: "Back to the Healify main screen",
      saved: "✓ Saved on this device", saving: "Saving…",
      aTitle: "A · Current situation",
      aLead: "Write in detail, in your own words. Every field is optional, and you can come back to it any time.",
      casesTitle: "Type of case", casesHelp: "You can pick more than one. Your choice decides which recommendations you see in step C.",
      cases: { autoimmune: "Autoimmune", cancer: "Cancer", mental: "Mental illness", bipolar: "Bipolar disorder", depression: "Depression", addiction: "Addiction", psychmeds: "Use of psychiatric medication", other: "Other / combination" },
      otherPh: "Describe the case or combination in your own words",
      descTitle: "Detailed description", descHelp: "What is known, what you feel, and how it affects you.",
      opt: "(optional)",
      fields: {
        diagnoses: ["Diagnoses", "Which diagnoses you received, from whom and when"],
        prognoses: ["Prognoses", "What you were told about the road ahead"],
        symptoms: ["Symptoms", "What they are, when they appear and how strong"],
        physical: ["Physical experience", "How it feels in your body"],
        emotional: ["Emotional experience", "Which feelings come up"],
        mental: ["Mental experience", "Thoughts, focus, patterns"],
        consciousness: ["Consciousness experience", "Sense of meaning, spirit, awareness"]
      },
      scalesTitle: "Suffering scales", scalesHelp: "Rate each kind of suffering separately: 1 = very little, 10 = the hardest.",
      scores: { emotional: "Emotional suffering", physical: "Physical suffering", mental: "Mental suffering" },
      low: "1 · very little", high: "10 · very hard", none: "Not rated", clearScore: "Clear",
      bTitle: "B · Full diagnosis",
      bLead: "Tests worth doing to get a clearer, more focused picture.",
      bGroups: { free: ["Free & online tests", "Free, can be done online"], home: ["Home test kits", "Order online to your home and do it yourself per the instructions"] },
      cTitle: "C · Recommendations", cTechTitle: "Technologies",
      cLead: "Investing in technologies, in three levels.",
      cGroups: { free: ["Free", "Free technologies"], low: ["Low-cost", "Low-cost technologies"], premium: ["Luxury", "Expensive & luxurious technologies"] },
      tiers: { free: "$0", low: "$", premium: "$$$" },
      dCases: { autoimmune: ["Autoimmune", "If there is an autoimmune condition"], cancer: ["Cancer", "If there is cancer"], mental: ["Mental illness", "If there is a mental illness"], combo: ["Combination", "If there is a combination of conditions"] },
      soon: "Coming soon",
      link: "Details →",
      sumTitle: "D · Summary", sumLead: "Everything you filled in, in one place.",
      sumHome: "Your summary", sumHomeLead: "These are your saved answers. You can edit them, or refresh the recommendations.",
      editAnswers: "Edit answers", refreshRecs: "Refresh recommendations", refreshed: "Recommendations were refreshed from your answers",
      confirmRefresh: "Refresh the recommendations from your answers? Items you added or edited will stay.",
      backSum: "← Summary",
      savedAccount: "✓ Saved in your account", savedOffline: "Saved on this device. It will sync when the connection is back",
      metaAccount: "Everything is saved in your account",
      privacyAccount: "Your answers are saved in your account, and only you can see them.",
      recsHint: "A long press selects an item and outlines it in gold. After that, a sideways swipe deletes it and an up or down swipe changes the order.",
      recsSel: "Item selected. A sideways swipe deletes it, an up or down swipe moves it.",
      addRec: "Add", phRec: "A recommendation or treatment", phNote: "Note (optional)", phLink: "Link (optional)", phPrice: "Price (optional)",
      editItem: "Edit", saveItem: "Save", cancelItem: "Cancel", delItem: "Delete", moveUp: "Up", moveDown: "Down",
      deletedItem: "Item deleted", undo: "Undo", emptyRecs: "Nothing here yet. Add one, or refresh from your answers.",
      badLink: "The link needs to start with http", badPrice: "That price does not look right", price: "Price",
      mantrasTitle: "Mantras", mantrasLead: "Each mantra can also be shown in Russian and in English.",
      langRu: "RU", langEn: "EN", showRu: "Show the Russian translation", hideRu: "Hide the Russian translation", showEn: "Show the English translation", hideEn: "Hide the English translation",
      sumScores: "Suffering scales", sumCases: "Type of case", sumDesc: "Your description", sumData: "Your data",
      noCases: "None chosen", empty: "Not filled in",
      expTxt: "⬇ Download as text", expJson: "⬇ Download as JSON", clear: "🗑 Clear my data",
      confirm: "Delete everything you filled in Healify from this device? This can't be undone.",
      cleared: "Your data was cleared", downloaded: "File downloaded",
      privacy: "Your data is stored only in this browser on this device and is never sent anywhere. It's a good idea to download a copy now and then.",
      recsTitle: "Recommendations", recsLead: "Based on the situation you chose in step A.",
      recsAll: "You haven't chosen a situation in step A yet, so all recommendations are shown.",
      recsNoMatch: "There are no recommendations for the situation you chose yet. You can choose another situation in step A.",
      sumRecs: "Recommendations shown to you (step C)", sumRecsNone: "No recommendations were shown",
      recsDisc: "The information shown here is not medical advice. It's recommended to consult a functional medicine doctor before starting a life-changing process. All the treatments recommended here are provided at institutes and clinics with medical supervision.",
      foot: "Healify · היליפיי · version 1",
      fileTitle: "Healify · My summary", fileDate: "Date"
    }
  };
  function t() { return T[lang]; }

  var ICON_SOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

  /* ----- state (guest: this device only; signed in: that user's sbxhealify row) ----- */
  var APP = "sbxhealify";
  function blank() { return { v: 2, view: "welcome", cases: [], otherText: "", text: {}, scores: {}, updated: null, completed: false, seeded: false }; }
  var S = blank();
  var store = null, uidSeen = null, booted = false, selfWrite = false, saveTimer = null;
  var activeRec = null, editingRec = null, gesture = null, suppressClick = false, needRender = false, mantraOn = {};
  function cloud() { return !!(window.RGIsolate && store && RGIsolate.maySync(store.uid())); }
  function applyProfile(p) {
    S = blank();
    if (!p || typeof p !== "object") return;
    var v = p.view === "d" ? "c" : p.view;
    S.view = (VIEWS.indexOf(v) >= 0 || v === "welcome") ? v : "welcome";
    S.cases = Array.isArray(p.cases) ? p.cases.filter(function (c) { return CASES.indexOf(c) >= 0; }) : [];
    if (Array.isArray(p.recs)) p.recs.forEach(function (c) { if (typeof c === "string" && CASES.indexOf(c) >= 0 && S.cases.indexOf(c) < 0) S.cases.push(c); });
    S.cases.sort(function (x, y) { return CASES.indexOf(x) - CASES.indexOf(y); });
    S.otherText = typeof p.otherText === "string" ? p.otherText : "";
    S.text = {}; FIELDS.forEach(function (f) { if (p.text && typeof p.text[f] === "string") S.text[f] = p.text[f]; });
    S.scores = {}; SCORES.forEach(function (k) { var n = p.scores && +p.scores[k]; if (n >= 1 && n <= 10) S.scores[k] = Math.round(n); });
    S.updated = p.updated || null;
    S.completed = !!p.completed || S.view === "sum";
    S.seeded = !!p.seeded;
  }
  function loadProfileFromStore() { applyProfile(store && store.get("profile")); }
  function snapshot() {
    return {
      kind: "profile", v: 2, view: S.view, completed: !!S.completed, seeded: !!S.seeded,
      cases: S.cases.slice(), otherText: S.otherText || "",
      text: JSON.parse(JSON.stringify(S.text || {})), scores: JSON.parse(JSON.stringify(S.scores || {}))
    };
  }
  function mutate(fn) { selfWrite = true; try { fn(); } finally { selfWrite = false; } }
  function writeSnapshot(data) {
    if (!store || !store.uid()) return;
    mutate(function () {
      if (store.get("profile")) store.upd("profile", data);
      else store.add(Object.assign({ id: "profile" }, data));
    });
    paintSaved();
  }
  function writeProfile() { S.updated = new Date().toISOString(); writeSnapshot(snapshot()); }
  function save() { writeProfile(); }
  function flush() { clearTimeout(saveTimer); saveTimer = null; }
  function paintSaved(pending) {
    var el = $("saved"); if (!el) return;
    var L = t();
    if (pending) { el.textContent = L.saving; el.className = "saved"; return; }
    if (!store || !store.uid() || (!S.updated && !(store.get && store.get("profile")))) { el.textContent = ""; el.className = "saved"; return; }
    if (!cloud()) { el.textContent = L.saved; el.className = "saved on"; return; }
    var st = store.state();
    el.textContent = st === "offline" ? L.savedOffline : st === "saving" ? L.saving : L.savedAccount;
    el.className = "saved" + (st === "saving" ? "" : " on");
  }
  function flashSaved() { paintSaved(false); }
  function hasData() { return S.cases.length || S.otherText || Object.keys(S.text).some(function (k) { return S.text[k]; }) || Object.keys(S.scores).length; }
  function typing() {
    var a = document.activeElement;
    return !!(a && a.closest && a.closest("#fields, #other-wrap, .recform, .rec-edit"));
  }

  /* ----- helpers ----- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function scoreColor(n) { var h = 200 - (n - 1) * (200 / 9); return "hsl(" + h.toFixed(0) + ",88%,66%)"; } // 1 = calm blue … 10 = red
  function toast(msg) { var el = $("toast"); el.textContent = msg; el.hidden = false; clearTimeout(toast.tm); toast.tm = setTimeout(function () { el.hidden = true; }, 2200); }
  function pick(item) {
    var a = item && item[lang], b = item && item[lang === "he" ? "en" : "he"];
    return { title: (a && a.title) || (b && b.title) || "", text: (a && a.text) || (b && b.text) || "" };
  }
  function list(arr) {
    arr = Array.isArray(arr) ? arr.filter(function (x) { var p = pick(x); return p.title || p.text; }) : [];
    if (!arr.length) return '<div class="soon">' + ICON_SOON + '<span>' + esc(t().soon) + '</span></div>';
    return '<ul class="items">' + arr.map(function (x) {
      var p = pick(x), link = x.link && /^https?:\/\//.test(x.link) ? '<div><a href="' + esc(x.link) + '" target="_blank" rel="noopener">' + esc(t().link) + '</a></div>' : "";
      return "<li>" + (p.title ? '<div class="t">' + esc(p.title) + "</div>" : "") + (p.text ? '<div class="d">' + esc(p.text) + "</div>" : "") + link + "</li>";
    }).join("") + "</ul>";
  }
  function group(title, help, body, extraCls, badge) {
    return '<div class="card' + (extraCls ? " " + extraCls : "") + '"><h3><span>' + esc(title) + "</span>" + (badge || "") + "</h3>" + (help ? '<p class="help">' + esc(help) + "</p>" : "") + body + "</div>";
  }

  /* ----- build step A (once) ----- */
  function buildA() {
    $("cases").innerHTML = CASES.map(function (c) { return '<button type="button" class="chip" data-case="' + c + '" aria-pressed="false"><span class="tick">✓</span><span class="cl"></span></button>'; }).join("");
    $("cases").onclick = function (e) {
      var b = e.target.closest("[data-case]"); if (!b) return;
      var c = b.getAttribute("data-case"), i = S.cases.indexOf(c);
      if (i >= 0) S.cases.splice(i, 1); else S.cases.push(c);
      S.cases.sort(function (x, y) { return CASES.indexOf(x) - CASES.indexOf(y); });
      syncCases(); save(true);
    };
    $("other-text").oninput = function () { S.otherText = this.value; save(); };
    $("fields").innerHTML = FIELDS.map(function (f) {
      return '<div class="field"><label for="f-' + f + '"><span class="fl"></span> <span class="opt"></span></label><textarea id="f-' + f + '" data-f="' + f + '" rows="3"></textarea></div>';
    }).join("");
    $("fields").addEventListener("input", function (e) { var f = e.target.getAttribute("data-f"); if (!f) return; S.text[f] = e.target.value; save(); });
    $("scales").innerHTML = SCORES.map(function (k) {
      var dots = ""; for (var n = 1; n <= 10; n++) dots += '<button type="button" data-k="' + k + '" data-n="' + n + '" aria-pressed="false">' + n + "</button>";
      return '<div class="scale" id="sc-' + k + '" role="group"><div class="lab"><span class="sl" id="sl-' + k + '"></span><span class="val" id="sv-' + k + '"></span></div><div class="dots">' + dots + '</div><div class="ends"><span class="lo"></span><button type="button" class="clearscore" data-clear="' + k + '"></button><span class="hi"></span></div></div>';
    }).join("");
    $("scales").onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var k = b.getAttribute("data-k"), c = b.getAttribute("data-clear");
      if (k) { S.scores[k] = +b.getAttribute("data-n"); syncScores(); save(true); }
      else if (c) { delete S.scores[c]; syncScores(); save(true); }
    };
  }
  function syncCases() {
    Array.prototype.forEach.call($("cases").children, function (b) { b.setAttribute("aria-pressed", S.cases.indexOf(b.getAttribute("data-case")) >= 0 ? "true" : "false"); });
    $("other-wrap").hidden = S.cases.indexOf("other") < 0;
  }
  function syncScores() {
    SCORES.forEach(function (k) {
      var v = S.scores[k];
      Array.prototype.forEach.call(document.querySelectorAll('#sc-' + k + ' .dots button'), function (b) {
        var n = +b.getAttribute("data-n"), on = v && n <= v;
        b.classList.toggle("on", !!on); b.classList.toggle("sel", v === n);
        b.style.background = on ? scoreColor(n) : ""; b.setAttribute("aria-pressed", v === n ? "true" : "false");
      });
      var sv = $("sv-" + k); sv.textContent = v ? v + " / 10" : t().none; sv.className = "val" + (v ? "" : " none");
      document.querySelector('#sc-' + k + ' .clearscore').hidden = !v;
    });
  }
  function fillA() {
    var L = t();
    $("a-title").textContent = L.aTitle; $("a-lead").textContent = L.aLead;
    $("cases-title").textContent = L.casesTitle; $("cases-help").textContent = L.casesHelp;
    Array.prototype.forEach.call($("cases").children, function (b) { b.querySelector(".cl").textContent = L.cases[b.getAttribute("data-case")]; });
    $("other-text").placeholder = L.otherPh; $("other-text").setAttribute("aria-label", L.cases.other); $("other-text").value = S.otherText;
    $("desc-title").textContent = L.descTitle; $("desc-help").textContent = L.descHelp;
    FIELDS.forEach(function (f) {
      var lab = document.querySelector('label[for="f-' + f + '"]');
      lab.querySelector(".fl").textContent = L.fields[f][0]; lab.querySelector(".opt").textContent = L.opt;
      var ta = $("f-" + f); ta.placeholder = L.fields[f][1]; if (ta.value !== (S.text[f] || "")) ta.value = S.text[f] || "";
    });
    $("scales-title").textContent = L.scalesTitle; $("scales-help").textContent = L.scalesHelp;
    SCORES.forEach(function (k) {
      $("sl-" + k).textContent = L.scores[k];
      $("sc-" + k).setAttribute("aria-label", L.scores[k]);
      var sc = $("sc-" + k); sc.querySelector(".lo").textContent = L.low; sc.querySelector(".hi").textContent = L.high; sc.querySelector(".clearscore").textContent = L.clearScore;
    });
    syncCases(); syncScores();
  }

  /* ----- B, C, D ----- */
  function fillB() {
    var L = t(), tests = C.tests || {};
    $("b-title").textContent = L.bTitle; $("b-lead").textContent = L.bLead;
    $("b-groups").innerHTML = ["free", "home"].map(function (g) { return group(L.bGroups[g][0], L.bGroups[g][1], list(tests[g])); }).join("");
  }
  function fillC() {
    var L = t(), tech = C.tech || {};
    $("c-title").textContent = L.cTitle; $("c-tech-title").textContent = L.cTechTitle; $("c-lead").textContent = L.cLead;
    $("c-groups").innerHTML = ["free", "low", "premium"].map(function (g) {
      return group(L.cGroups[g][0], L.cGroups[g][1], list(tech[g]), g === "premium" ? "premium" : "", '<span class="tier ' + g + '">' + esc(L.tiers[g]) + "</span>");
    }).join("");
  }
  /* content.js "cases" / "combos" lists (by case): shown inside the recommendations of step C, only when they have items */
  function caseContent() {
    var L = t(), cs = C.cases || {}, combos = C.combos || {}, out = "";
    var chosen = S.cases.filter(function (c) { return BASECASES.indexOf(c) >= 0; }), wantCombo = S.cases.length >= 2 || chosen.indexOf("other") >= 0;
    ["autoimmune", "cancer", "mental", "combo"].forEach(function (id) {
      var arr = id === "combo" ? (wantCombo ? (Array.isArray(combos[chosen.join("+")]) ? combos[chosen.join("+")] : []).concat(cs.combo || []) : []) : (chosen.indexOf(id) >= 0 || !S.cases.length ? cs[id] || [] : []);
      arr = arr.filter(function (x) { var p = pick(x); return p.title || p.text; });
      if (arr.length) out += group(L.dCases[id][0], L.dCases[id][1], list(arr), "sel");
    });
    return out;
  }

  /* ----- Recommendations (top of step C), matched to the situation(s) chosen in step A ----- */
  function recsFor() {
    if (!S.cases.length) return RECS.slice(); // nothing chosen yet: show everything
    return RECS.filter(function (r) { var cs = Array.isArray(r.cases) ? r.cases : []; return !cs.length || cs.some(function (c) { return S.cases.indexOf(c) >= 0; }); });
  }
  function recsHTML() {
    var L = t(), mine = recsFor(), extra = caseContent();
    var panels = mine.map(function (r) {
      var p = pick(r), links = (Array.isArray(r.links) ? r.links : []).filter(function (k) { return k && /^https?:\/\//.test(k.url); }).map(function (k) {
        return '<a href="' + esc(k.url) + '" target="_blank" rel="noopener">' + esc(k[lang] || k.he || k.en || k.url) + ' <span aria-hidden="true">' + (lang === "he" ? "↖" : "↗") + "</span></a>";
      }).join("");
      var body = p.text ? '<div class="rd">' + esc(p.text) + "</div>" + (links ? '<div class="rl">' + links + "</div>" : "") : '<div class="soon">' + ICON_SOON + "<span>" + esc(L.soon) + "</span></div>";
      return '<div class="rec" id="rec-' + esc(r.id) + '"><div class="rt">' + esc(p.title) + "</div>" + body + "</div>";
    }).join("");
    return '<div class="card recs" id="recs"><h3><span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg></span><span>' + esc(L.recsTitle) + "</span></h3>" +
      '<p class="help">' + esc(S.cases.length ? L.recsLead : L.recsAll) + "</p>" +
      '<div class="recpanels">' + (panels || extra ? panels + extra : '<p class="note">' + esc(L.recsNoMatch) + "</p>") + "</div>" +
      '<p class="recdisc">' + esc(L.recsDisc) + "</p></div>";
  }

  /* ----- editable recommendations (add, edit, delete, reorder). Swipes arm only after a long-press. ----- */
  function recItems() {
    if (!store) return [];
    return store.list("rec").sort(function (a, b) { return (a.order || 0) - (b.order || 0) || ((a.at || 0) - (b.at || 0)); });
  }
  function userOwned(x) { return !!(x && (x.origin === "user" || x.edited)); }
  function safeUrl(u) { return /^https?:\/\//i.test(u || "") ? u : ""; }
  function textOf(item, l) { var a = item && item[l]; return { title: (a && a.title) || "", text: (a && a.text) || "" }; }
  function recTitle(x) {
    if (x.origin === "user" || x.edited || x.title) return x.title || x.heTitle || x.enTitle || "";
    return lang === "en" ? (x.enTitle || x.heTitle || "") : (x.heTitle || x.enTitle || "");
  }
  function recNote(x) {
    if (x.origin === "user" || x.edited) return x.note || "";
    return lang === "en" ? (x.enNote || x.heNote || "") : (x.heNote || x.enNote || "");
  }
  function recLinks(x) {
    var out = [];
    if (safeUrl(x.link)) out.push({ url: x.link, label: x.link });
    (Array.isArray(x.links) ? x.links : []).forEach(function (k) {
      if (!k || !safeUrl(k.url) || out.some(function (o) { return o.url === k.url; })) return;
      out.push({ url: k.url, label: (lang === "en" ? (k.en || k.he) : (k.he || k.en)) || k.url });
    });
    return out;
  }
  function parsePrice(v) {
    var s = String(v || "").replace(/[₪$\s]/g, "").replace(",", ".");
    if (!s) return null;
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
    return Math.round(parseFloat(s) * 100) / 100;
  }
  function nextOrder() {
    var m = 0;
    recItems().forEach(function (x) { if ((x.order || 0) > m) m = x.order; });
    return m + 1;
  }
  function generatedWanted() {
    return recsFor().map(function (r) {
      var he = textOf(r, "he"), en = textOf(r, "en");
      var links = (Array.isArray(r.links) ? r.links : []).filter(function (k) { return k && safeUrl(k.url); }).map(function (k) {
        return { he: k.he || "", en: k.en || "", url: k.url };
      });
      return { genId: r.id, heTitle: he.title, enTitle: en.title, heNote: he.text, enNote: en.text, links: links };
    });
  }
  function seedFromAnswers() {
    var order = 1;
    mutate(function () {
      generatedWanted().forEach(function (w) {
        store.add({ kind: "rec", origin: "gen", genId: w.genId, heTitle: w.heTitle, enTitle: w.enTitle, heNote: w.heNote, enNote: w.enNote, links: w.links, order: order++ });
      });
    });
  }
  function ensureSeed() {
    if (!store || !store.uid() || S.seeded) return;
    if (!recItems().length) seedFromAnswers();
    S.seeded = true;
    writeProfile();
  }
  function refreshRecs() {
    var owned = recItems().filter(userOwned);
    if (owned.length && !window.confirm(t().confirmRefresh)) return;
    var have = {}, want = {}, wanted = generatedWanted(), order = nextOrder();
    recItems().forEach(function (x) { if (x.genId) have[x.genId] = x; });
    wanted.forEach(function (w) { want[w.genId] = w; });
    mutate(function () {
      recItems().forEach(function (x) {
        if (x.genId && !userOwned(x) && !want[x.genId]) store.del(x.id);
      });
      wanted.forEach(function (w) {
        var cur = have[w.genId];
        if (cur && userOwned(cur)) return;
        if (cur) store.upd(cur.id, { heTitle: w.heTitle, enTitle: w.enTitle, heNote: w.heNote, enNote: w.enNote, links: w.links, origin: "gen" });
        else store.add({ kind: "rec", origin: "gen", genId: w.genId, heTitle: w.heTitle, enTitle: w.enTitle, heNote: w.heNote, enNote: w.enNote, links: w.links, order: order++ });
      });
    });
    S.seeded = true;
    writeProfile();
    render();
    toast(t().refreshed);
  }
  function copyRec(x) {
    return { kind: "rec", origin: x.origin || "user", title: x.title, note: x.note, link: x.link, heTitle: x.heTitle, enTitle: x.enTitle, heNote: x.heNote, enNote: x.enNote, links: x.links, price: x.price, order: x.order, edited: x.edited, genId: x.genId };
  }
  function deleteRec(id) {
    var x = store && store.get(id);
    if (!x) return;
    var copy = copyRec(x);
    mutate(function () { store.del(id); });
    if (activeRec === id) activeRec = null;
    if (editingRec === id) editingRec = null;
    render();
    var el = $("toast");
    el.textContent = "";
    el.appendChild(document.createTextNode(t().deletedItem + " "));
    var b = document.createElement("button");
    b.type = "button";
    b.textContent = t().undo;
    b.onclick = function () { mutate(function () { store.add(copy); }); el.hidden = true; render(); };
    el.appendChild(b);
    el.hidden = false;
    clearTimeout(toast.tm);
    toast.tm = setTimeout(function () { el.hidden = true; }, 5000);
  }
  function moveRec(id, dir) {
    var list = recItems(), i = -1, n;
    for (n = 0; n < list.length; n++) if (list[n].id === id) i = n;
    var j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
    mutate(function () { list.forEach(function (x, idx) { store.upd(x.id, { order: idx + 1 }); }); });
    activeRec = id;
    render();
    focusRec(id);
  }
  function focusRec(id) {
    var list = document.querySelector(".reclist");
    if (!list) return;
    Array.prototype.forEach.call(list.children, function (li) { if (li.getAttribute("data-id") === id) li.focus(); });
  }
  function readRecForm(form) {
    var titleEl = form.querySelector("[name=title], .e-title");
    var noteEl = form.querySelector("[name=note], .e-note");
    var linkEl = form.querySelector("[name=link], .e-link");
    var priceEl = form.querySelector("[name=price], .e-price");
    var title = (titleEl.value || "").replace(/\s+/g, " ").trim();
    var note = (noteEl.value || "").trim();
    var link = (linkEl.value || "").trim();
    var price = parsePrice(priceEl.value);
    linkEl.classList.remove("bad"); priceEl.classList.remove("bad");
    if (!title) { titleEl.focus(); return null; }
    if (link && !safeUrl(link)) { linkEl.classList.add("bad"); linkEl.focus(); toast(t().badLink); return null; }
    if (typeof price === "number" && isNaN(price)) { priceEl.classList.add("bad"); priceEl.focus(); toast(t().badPrice); return null; }
    return { title: title.slice(0, 200), note: note.slice(0, 4000), link: link, price: price };
  }
  function addRec(data) {
    mutate(function () { store.add({ kind: "rec", origin: "user", title: data.title, note: data.note, link: data.link, price: data.price, order: nextOrder() }); });
    S.seeded = true;
    writeProfile();
    render();
  }
  function saveRecEdit(id, data) {
    mutate(function () { store.upd(id, { title: data.title, note: data.note || "", link: data.link || "", price: data.price, edited: true }); });
    editingRec = null;
    render();
  }
  function recEditor(x) {
    var link = x.link || "";
    if (!link && Array.isArray(x.links) && x.links[0] && x.links[0].url) link = x.links[0].url;
    var L = t();
    return '<li data-id="' + esc(x.id) + '" class="editing"><form class="rec-edit" data-edit="' + esc(x.id) + '">' +
      '<input class="e-title" maxlength="200" value="' + esc(recTitle(x)) + '" aria-label="' + esc(L.phRec) + '">' +
      '<textarea class="e-note" maxlength="4000" aria-label="' + esc(L.phNote) + '">' + esc(recNote(x)) + "</textarea>" +
      '<div class="split"><input class="e-link" type="url" maxlength="500" value="' + esc(link) + '" placeholder="' + esc(L.phLink) + '" aria-label="' + esc(L.phLink) + '">' +
      '<input class="e-price" inputmode="decimal" maxlength="12" value="' + (typeof x.price === "number" ? esc(String(x.price)) : "") + '" placeholder="' + esc(L.phPrice) + '" aria-label="' + esc(L.phPrice) + '"></div>' +
      '<div class="row"><button type="submit" class="btn small">' + esc(L.saveItem) + '</button><button type="button" class="btn ghost small" data-a="cancel">' + esc(L.cancelItem) + '</button><button type="button" class="btn ghost small" data-a="del">' + esc(L.delItem) + "</button></div></form></li>";
  }
  function recRow(x) {
    if (editingRec === x.id) return recEditor(x);
    var L = t(), title = recTitle(x), note = recNote(x), links = recLinks(x), on = activeRec === x.id;
    var price = typeof x.price === "number" ? '<div class="rprice">' + esc(L.price) + " " + esc(String(x.price)) + "</div>" : "";
    var linkHtml = links.length ? '<div class="rlinks">' + links.map(function (k) {
      return '<a href="' + esc(k.url) + '" target="_blank" rel="noopener">' + esc(k.label) + "</a>";
    }).join("") + "</div>" : "";
    return '<li data-id="' + esc(x.id) + '"' + (on ? ' class="active"' : "") + ' tabindex="0" aria-selected="' + (on ? "true" : "false") + '">' +
      '<div class="rt">' + esc(title || L.empty) + "</div>" +
      (note ? '<div class="rd">' + esc(note) + "</div>" : "") + price + linkHtml +
      '<button type="button" class="rec-edit-btn" data-a="edit">' + esc(L.editItem) + "</button>" +
      '<div class="rec-actions"><button type="button" data-a="up">' + esc(L.moveUp) + '</button><button type="button" data-a="down">' + esc(L.moveDown) + '</button><button type="button" data-a="del">' + esc(L.delItem) + "</button></div></li>";
  }
  function recListHTML() {
    var L = t(), rows = recItems();
    return '<div class="card recs"><h3>' + esc(L.recsTitle) + '</h3><p class="help">' + esc(L.recsHint) + "</p>" +
      '<form class="recform" id="rec-add" autocomplete="off"><input name="title" maxlength="200" placeholder="' + esc(L.phRec) + '" aria-label="' + esc(L.phRec) + '">' +
      '<textarea name="note" maxlength="4000" placeholder="' + esc(L.phNote) + '" aria-label="' + esc(L.phNote) + '"></textarea>' +
      '<div class="split"><input name="link" type="url" maxlength="500" placeholder="' + esc(L.phLink) + '" aria-label="' + esc(L.phLink) + '">' +
      '<input name="price" inputmode="decimal" maxlength="12" placeholder="' + esc(L.phPrice) + '" aria-label="' + esc(L.phPrice) + '"></div>' +
      '<button type="submit" class="btn">' + esc(L.addRec) + "</button></form>" +
      '<p class="note" id="rec-sel-hint"' + (activeRec ? "" : " hidden") + ">" + esc(L.recsSel) + "</p>" +
      (rows.length ? '<ul class="reclist">' + rows.map(recRow).join("") + "</ul>" : '<p class="note">' + esc(L.emptyRecs) + "</p>") + "</div>";
  }
  function paintRecs() {
    if (gesture) { needRender = true; return; }
    var editor = S.view === "sum" || (S.view === "c" && (S.completed || S.seeded || recItems().length));
    if (S.view === "sum") { $("sum-recs").innerHTML = recListHTML(); $("c-recs").innerHTML = ""; }
    else if (S.view === "c" && editor) { $("c-recs").innerHTML = recListHTML(); $("sum-recs").innerHTML = ""; }
    else if (S.view === "c") { $("c-recs").innerHTML = recsHTML(); $("sum-recs").innerHTML = ""; }
    else { $("c-recs").innerHTML = ""; $("sum-recs").innerHTML = ""; }
    if (editingRec) { var ti = document.querySelector(".rec-edit .e-title"); if (ti) { ti.focus(); try { ti.setSelectionRange(ti.value.length, ti.value.length); } catch (e) {} } }
  }
  function setActive(id) {
    activeRec = id;
    var list = document.querySelector(".reclist");
    if (list) Array.prototype.forEach.call(list.children, function (li) {
      var on = !!id && li.getAttribute("data-id") === id;
      li.classList.toggle("active", on);
      li.setAttribute("aria-selected", on ? "true" : "false");
    });
    var hint = $("rec-sel-hint");
    if (hint) hint.hidden = !id;
  }

  /* ----- summary ----- */
  function fillSum() {
    var L = t();
    var homeSum = S.completed && S.view === "sum";
    $("sum-title").textContent = homeSum ? L.sumHome : L.sumTitle;
    $("sum-lead").textContent = homeSum ? L.sumHomeLead : L.sumLead;
    $("sum-scores-title").textContent = L.sumScores; $("sum-cases-title").textContent = L.sumCases;
    $("sum-desc-title").textContent = L.sumDesc; $("sum-data-title").textContent = L.sumData;
    $("sum-scores").innerHTML = SCORES.map(function (k) {
      var v = S.scores[k];
      return '<div class="score"><div class="n">' + (v ? v + "<small>/10</small>" : "–") + '</div><div class="l">' + esc(L.scores[k]) + '</div><div class="meter"><i style="width:' + (v ? v * 10 : 0) + "%;background:" + (v ? scoreColor(v) : "transparent") + '"></i></div></div>';
    }).join("");
    var cs = S.cases.map(function (c) { return L.cases[c]; }).join(" · ");
    $("sum-cases").innerHTML = '<div class="sumrow"><div class="v' + (cs ? "" : " empty") + '">' + esc(cs || L.noCases) + "</div></div>" +
      (S.cases.indexOf("other") >= 0 && S.otherText.trim() ? '<div class="sumrow"><div class="k">' + esc(L.cases.other) + '</div><div class="v">' + esc(S.otherText.trim()) + "</div></div>" : "");
    $("sum-desc").innerHTML = FIELDS.map(function (f) {
      var v = (S.text[f] || "").trim();
      return '<div class="sumrow"><div class="k">' + esc(L.fields[f][0]) + '</div><div class="v' + (v ? "" : " empty") + '">' + esc(v || L.empty) + "</div></div>";
    }).join("");
    $("edit-answers").textContent = L.editAnswers; $("refresh-recs").textContent = L.refreshRecs;
    $("exp-txt").textContent = L.expTxt; $("exp-json").textContent = L.expJson; $("clear").textContent = L.clear;
    $("privacy").textContent = cloud() ? L.privacyAccount : L.privacy;
  }
  function asText() {
    var L = t(), out = [L.fileTitle, L.fileDate + ": " + new Date().toLocaleString(lang === "he" ? "he-IL" : "en-GB"), ""];
    var items = function (arr) {
      arr = Array.isArray(arr) ? arr.filter(function (x) { var p = pick(x); return p.title || p.text; }) : [];
      if (!arr.length) { out.push(L.soon); return; }
      arr.forEach(function (x) { var p = pick(x); out.push("- " + [p.title, p.text].filter(Boolean).join(": ") + (x.link ? " (" + x.link + ")" : "")); });
    };
    /* A · current situation */
    out.push("== " + L.steps[0] + " ==", "", L.sumCases + ": " + (S.cases.map(function (c) { return L.cases[c]; }).join(", ") || L.noCases));
    if (S.cases.indexOf("other") >= 0 && S.otherText.trim()) out.push(L.cases.other + ": " + S.otherText.trim());
    out.push("", L.sumScores + ":");
    SCORES.forEach(function (k) { out.push(L.scores[k] + ": " + (S.scores[k] ? S.scores[k] + "/10" : L.none)); });
    out.push("", L.sumDesc + ":");
    FIELDS.forEach(function (f) { out.push("", "- " + L.fields[f][0] + ":", (S.text[f] || "").trim() || L.empty); });
    /* B · full diagnosis (recommended tests) */
    var tests = C.tests || {};
    out.push("", "== " + L.steps[1] + " ==");
    ["free", "home"].forEach(function (g) { out.push("", L.bGroups[g][0] + ":"); items(tests[g]); });
    /* C · recommendations, then technologies */
    out.push("", "== " + L.steps[2] + " ==", "", L.recsTitle);
    var savedRecs = recItems();
    if (savedRecs.length) {
      savedRecs.forEach(function (x) {
        out.push("", "* " + (recTitle(x) || L.empty));
        var note = recNote(x);
        if (note) out.push(note);
        recLinks(x).forEach(function (k) { out.push(k.label + ": " + k.url); });
        if (typeof x.price === "number") out.push(L.price + ": " + x.price);
      });
    } else {
      out.push("(" + (S.cases.length ? L.recsLead : L.recsAll).replace(/\.$/, "") + ")");
      var rs = recsFor();
      if (!rs.length) out.push(L.recsNoMatch);
      rs.forEach(function (r) {
        var p = pick(r);
        out.push("", "* " + p.title, p.text || L.soon);
        (Array.isArray(r.links) ? r.links : []).forEach(function (k) { if (k && /^https?:\/\//.test(k.url)) out.push((k[lang] || k.he || k.en) + ": " + k.url); });
      });
    }
    var cs = C.cases || {};
    ["autoimmune", "cancer", "mental"].forEach(function (id) {
      var arr = (S.cases.indexOf(id) >= 0 || !S.cases.length) && Array.isArray(cs[id]) ? cs[id].filter(function (x) { var p = pick(x); return p.title || p.text; }) : [];
      if (arr.length) { out.push("", "* " + L.dCases[id][0]); items(arr); }
    });
    out.push("", L.recsDisc);
    var tech = C.tech || {};
    out.push("", "-- " + L.cTechTitle + " --");
    ["free", "low", "premium"].forEach(function (g) { out.push("", L.cGroups[g][0] + ":"); items(tech[g]); });
    out.push("", "—", L.disc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    return out.join("\n");
  }
  function download(name, data, type) {
    var blob = new Blob([data], { type: type }), url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500); toast(t().downloaded);
  }
  function stamp() { var d = new Date(), p = function (n) { return String(n).padStart(2, "0"); }; return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()); }
  $("exp-txt").onclick = function () { flush(); download("healify-" + stamp() + ".txt", "\ufeff" + asText(), "text/plain;charset=utf-8"); };
  $("exp-json").onclick = function () { flush(); download("healify-" + stamp() + ".json", JSON.stringify({ app: "healify", version: 3, exported: new Date().toISOString(), data: snapshot(), recs: recItems().map(copyRec) }, null, 2), "application/json"); };
  $("edit-answers").onclick = function () { go("a"); };
  $("refresh-recs").onclick = function () { refreshRecs(); };
  $("clear").onclick = function () {
    if (!window.confirm(t().confirm)) return;
    clearTimeout(saveTimer); saveTimer = null;
    activeRec = null; editingRec = null;
    if (store) mutate(function () {
      ["rec", "profile"].forEach(function (k) { store.list(k).slice().forEach(function (x) { store.del(x.id); }); });
    });
    S = blank(); fillA(); toast(t().cleared); go("welcome", true);
  };

  /* ----- navigation ----- */
  /* in-app history: the welcome screen is the base entry, the whole flow (stages A-D + summary) is ONE entry above it,
     so the browser / phone back button and the Android back gesture return to Healify's main screen instead of leaving */
  var HIST = !!(window.history && history.pushState);
  function baseView() { return S.completed ? "sum" : "welcome"; }
  function syncHistory(v) {
    if (!HIST) return;
    var st = history.state || {};
    try {
      if (v === baseView()) { if (st.hv || !st.base) history.replaceState({ hv: null, base: 1 }, ""); }
      else if (st.hv) history.replaceState({ hv: v }, "");
      else { if (!st.base) history.replaceState({ hv: null, base: 1 }, ""); history.pushState({ hv: v }, ""); }
    } catch (e) {}
  }
  function goHome() { // leave the flow: step back over our own history entry when there is one
    var st = (HIST && history.state) || {};
    if (st.hv) history.back(); else go(baseView());
  }
  window.addEventListener("popstate", function (e) {
    var st = e.state || {}, v = st.hv && (VIEWS.indexOf(st.hv) >= 0) ? st.hv : baseView();
    if (v !== S.view) go(v, false, true);
  });
  function go(v, noSave, fromPop) {
    flush();
    if (v === "sum") S.completed = true;
    if (!fromPop) syncHistory(v);
    S.view = v;
    $("s-welcome").hidden = v !== "welcome";
    $("flow").hidden = v === "welcome";
    VIEWS.forEach(function (x) { $("s-" + x).hidden = x !== v; });
    if (v === "sum") ensureSeed();
    render();
    if (!noSave) save(true);
    window.scrollTo(0, 0);
  }
  $("start").onclick = function () { go(hasData() ? lastView : "a"); };
  var lastView = "a";
  $("prev").onclick = function () { var i = VIEWS.indexOf(S.view); if (i > 0) go(VIEWS[i - 1]); else goHome(); };
  $("flow-home").onclick = goHome;
  $("next").onclick = function () { var i = VIEWS.indexOf(S.view); if (i < VIEWS.length - 1) go(VIEWS[i + 1]); else go("a"); };
  $("steps").onclick = function (e) { var b = e.target.closest("[data-v]"); if (b) go(b.getAttribute("data-v")); };

  function renderSteps() {
    var L = t(), cur = VIEWS.indexOf(S.view);
    $("steps").innerHTML = VIEWS.map(function (v, i) {
      return '<li class="' + (i < cur ? "done" : i === cur ? "cur" : "") + '"><button type="button" data-v="' + v + '"' + (i === cur ? ' aria-current="step"' : "") + '><span class="bar"></span>' + esc(L.steps[i]) + "</button></li>";
    }).join("");
    $("stepnum").textContent = cur >= 0 ? L.stepnum(cur + 1) : "";
    $("prev").textContent = cur === 0 ? (S.completed ? L.backSum : L.home) : L.prev;
    $("next").textContent = cur === VIEWS.length - 1 ? L.edit : cur === VIEWS.length - 2 ? L.toSum : L.next;
    var homeSum = S.completed && S.view === "sum";
    $("steps").hidden = homeSum; $("stepnum").hidden = homeSum; $("flowtop").hidden = homeSum; $("flow-nav").hidden = homeSum;
  }

  function render() {
    var L = t();
    document.documentElement.lang = lang; document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    document.title = L.doc;
    $("lang-he").setAttribute("aria-pressed", lang === "he"); $("lang-en").setAttribute("aria-pressed", lang === "en");
    $("back").textContent = L.back;
    $("flow-home").textContent = S.completed ? L.backSum : L.homeBack; $("flow-home").setAttribute("aria-label", S.completed ? L.sumHome : L.homeBackLabel); $("flow-home").title = $("flow-home").getAttribute("aria-label");
    $("w-eyebrow").textContent = L.eyebrow; $("w-title").textContent = L.title; $("w-tagline").textContent = L.tagline; $("w-sub").textContent = L.sub;
    $("start").textContent = hasData() ? L.resume : L.start; $("w-meta").textContent = cloud() ? L.metaAccount : L.meta;
    $("install-btn").textContent = L.install;
    if (!$("install-hint").hidden) $("install-hint").innerHTML = L[isIOS ? "ios" : "other"];
    $("disc-w").innerHTML = L.disc; $("disc-f").innerHTML = L.disc;
    $("foot").textContent = L.foot;
    if (S.view !== "welcome") lastView = S.view;
    fillA(); fillB(); fillC(); fillSum(); paintRecs(); placeMantras(); renderMantras(); renderSteps();
    paintSaved(false);
  }
  function renderMantras() {
    var el = $("mantras"); if (!el) return;
    var L = t();
    $("mantras-title").textContent = L.mantrasTitle; $("mantras-lead").textContent = L.mantrasLead;
    Array.prototype.forEach.call(el.querySelectorAll("button[data-m]"), function (b) {
      var l = b.getAttribute("data-l"), on = !!mantraOn[b.getAttribute("data-m") + ":" + l];
      b.textContent = l === "ru" ? L.langRu : L.langEn;
      b.setAttribute("aria-pressed", on ? "true" : "false");
      b.setAttribute("aria-label", on ? (l === "ru" ? L.hideRu : L.hideEn) : (l === "ru" ? L.showRu : L.showEn));
    });
    Array.prototype.forEach.call(el.querySelectorAll(".mantra-tr"), function (p) {
      p.hidden = !mantraOn[p.getAttribute("data-for") + ":" + p.getAttribute("data-show")];
    });
  }
  function placeMantras() {
    var el = $("mantras"); if (!el) return;
    if (S.view === "welcome") { $("s-welcome").appendChild(el); el.hidden = false; }
    else if (S.view === "sum") {
      var anchor = $("sum-data-title"), card = anchor && anchor.closest(".card");
      if (card && card.parentNode) card.parentNode.insertBefore(el, card); else $("s-sum").appendChild(el);
      el.hidden = false;
    } else el.hidden = true;
  }
  function setLang(l) { lang = l === "en" ? "en" : "he"; try { localStorage.setItem(LANG_KEY, lang); } catch (e) {} render(); }
  $("lang-he").onclick = function () { setLang("he"); };
  $("lang-en").onclick = function () { setLang("en"); };
  window.addEventListener("storage", function (e) { if (e.key === LANG_KEY && e.newValue) { lang = e.newValue === "en" ? "en" : "he"; render(); } });
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", function () { if (document.hidden) flush(); });

  /* ----- install: always visible unless already installed ----- */
  var ua = navigator.userAgent || "";
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  function standalone() { return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; }
  var deferred = null;
  function updateInstall() { var s = !standalone(); $("install-wrap").hidden = !s; if (!s) $("install-hint").hidden = true; }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferred = e; updateInstall(); });
  window.addEventListener("appinstalled", function () { deferred = null; $("install-wrap").hidden = true; });
  $("install-btn").onclick = function () {
    if (deferred) { var d = deferred; deferred = null; d.prompt(); (d.userChoice || Promise.resolve()).then(updateInstall); return; }
    var h = $("install-hint"); h.innerHTML = t()[isIOS ? "ios" : "other"]; h.hidden = !h.hidden;
  };

  /* ----- recommendation gestures: long-press selects (gold outline); only then does a swipe delete or move ----- */
  var HOLD_MS = 460, SLOP = 14, SWIPE_X = 64, SWIPE_Y = 52;
  function finishGesture() {
    var g = gesture;
    if (!g) return;
    clearTimeout(g.holdT);
    gesture = null;
    if (g.li) g.li.style.transform = "";
    if (g.abandoned || !g.held) { if (needRender) { needRender = false; render(); } return; }
    var ax = Math.abs(g.dx), ay = Math.abs(g.dy);
    suppressClick = true;
    if (g.moved && ax >= SWIPE_X && ax > ay) { deleteRec(g.id); return; }
    if (g.moved && ay >= SWIPE_Y && ay > ax) { moveRec(g.id, g.dy < 0 ? -1 : 1); return; }
    setActive(g.id);
    if (needRender) { needRender = false; render(); }
  }
  document.addEventListener("pointerdown", function (e) {
    var li = e.target.closest && e.target.closest(".reclist > li");
    if (!li || (e.button != null && e.button !== 0)) return;
    if (e.target.closest("a,button,input,textarea,form")) return;
    if (gesture) finishGesture();
    gesture = { li: li, id: li.getAttribute("data-id"), x: e.clientX, y: e.clientY, pid: e.pointerId, dx: 0, dy: 0, held: li.classList.contains("active"), moved: false, abandoned: false };
    if (gesture.held) e.preventDefault();
    gesture.holdT = setTimeout(function () {
      if (!gesture || gesture.moved || gesture.abandoned) return;
      gesture.held = true;
      setActive(gesture.id);
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (err) {}
    }, HOLD_MS);
    try { li.setPointerCapture(e.pointerId); } catch (err) {}
  }, true);
  document.addEventListener("pointermove", function (e) {
    if (!gesture || e.pointerId !== gesture.pid) return;
    gesture.dx = e.clientX - gesture.x; gesture.dy = e.clientY - gesture.y;
    if (!gesture.moved && Math.hypot(gesture.dx, gesture.dy) > SLOP) {
      gesture.moved = true;
      if (!gesture.held) { clearTimeout(gesture.holdT); gesture.abandoned = true; return; }
    }
    if (gesture.held && gesture.moved) {
      e.preventDefault();
      gesture.li.style.transform = Math.abs(gesture.dx) > Math.abs(gesture.dy) ? "translateX(" + gesture.dx + "px)" : "translateY(" + Math.max(-32, Math.min(32, gesture.dy)) + "px)";
    }
  }, { passive: false });
  document.addEventListener("pointerup", function (e) { if (gesture && e.pointerId === gesture.pid) finishGesture(); });
  document.addEventListener("pointercancel", function (e) { if (gesture && e.pointerId === gesture.pid) { gesture.abandoned = true; finishGesture(); } });
  document.addEventListener("click", function (e) {
    if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
    var mbtn = e.target.closest && e.target.closest("#mantras [data-m]");
    if (mbtn) {
      var key = mbtn.getAttribute("data-m") + ":" + mbtn.getAttribute("data-l");
      mantraOn[key] = !mantraOn[key];
      renderMantras();
      return;
    }
    var act = e.target.closest && e.target.closest(".reclist [data-a], .rec-edit [data-a]");
    if (act) {
      var li = act.closest("li"), id = li && li.getAttribute("data-id"), a = act.getAttribute("data-a");
      if (a === "edit") { editingRec = id; activeRec = id; render(); }
      else if (a === "cancel") { editingRec = null; render(); }
      else if (a === "del" && id) deleteRec(id);
      else if (a === "up" && id) moveRec(id, -1);
      else if (a === "down" && id) moveRec(id, 1);
      return;
    }
    if (!e.target.closest(".reclist")) setActive(null);
  });
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (!form || (form.id !== "rec-add" && !form.classList.contains("rec-edit"))) return;
    e.preventDefault();
    var data = readRecForm(form);
    if (!data) return;
    if (form.id === "rec-add") addRec(data); else saveRecEdit(form.getAttribute("data-edit"), data);
  });
  document.addEventListener("keydown", function (e) {
    var li = e.target.closest && e.target.closest(".reclist > li");
    if (!li || e.target.closest("button,a,input,textarea")) return;
    var id = li.getAttribute("data-id");
    if (e.key === "Enter" || e.key === " ") { setActive(id); e.preventDefault(); return; }
    if (activeRec !== id) return;
    if (e.key === "Delete" || e.key === "Backspace") { deleteRec(id); e.preventDefault(); }
    else if (e.key === "ArrowUp") { moveRec(id, -1); e.preventDefault(); }
    else if (e.key === "ArrowDown") { moveRec(id, 1); e.preventDefault(); }
  });

  /* ----- boot ----- */
  function landingView() {
    if (S.completed) return "sum";
    var v = S.view === "d" ? "c" : S.view;
    return (VIEWS.indexOf(v) >= 0 || v === "welcome") ? v : "welcome";
  }
  function onStoreChange() {
    if (selfWrite) { paintSaved(); return; }
    var id = store && store.uid();
    if (!id) return;
    if (id !== uidSeen) {
      clearTimeout(saveTimer); saveTimer = null;
      uidSeen = id; activeRec = null; editingRec = null; gesture = null;
      loadProfileFromStore();
      var start = landingView();
      booted = true;
      if (start !== "welcome") lastView = start;
      go(start, true);
      return;
    }
    if (typing() || gesture) { if (gesture) needRender = true; return; }
    loadProfileFromStore();
    render();
  }
  buildA();
  updateInstall();
  if (window.RGStore) store = window.RGStore(APP, { onChange: onStoreChange, onStatus: function () { paintSaved(); }, busy: typing });
  setTimeout(function () { if (!booted) { booted = true; go(landingView(), true); } }, 1200);
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  }
})();
