/* Healify (היליפיי) v1 · all data stays in localStorage on this device. Content lives in content.js. */
(function () {
  "use strict";
  var C = window.HEALIFY_CONTENT || {};
  var KEY = "rg-healify-v1", LANG_KEY = "rg-lang";
  var $ = function (id) { return document.getElementById(id); };
  var lang = "he";
  try { if (localStorage.getItem(LANG_KEY) === "en") lang = "en"; } catch (e) {}

  var CASES = ["autoimmune", "cancer", "mental", "other"];
  var FIELDS = ["diagnoses", "prognoses", "symptoms", "physical", "emotional", "mental", "consciousness"];
  var SCORES = ["emotional", "physical", "mental"];
  var VIEWS = ["a", "b", "c", "d", "sum"];
  var RECS = (Array.isArray(C.ronRecs) ? C.ronRecs : []).filter(function (r) { return r && r.id; });
  var RECIDS = RECS.map(function (r) { return r.id; });

  var T = {
    he: {
      doc: "היליפיי · Healify", back: "← חזרה לאתר",
      eyebrow: "Healify", title: "היליפיי", tagline: "מרחב אישי לדרך הריפוי השלם שלך",
      sub: "מתחילים בתיאור מה שעובר עליך, ממשיכים לבדיקות ולטכנולוגיות לריפוי עצמי, ומסיימים בהבחנה לפי המקרה שלך.",
      start: "בוא נתחיל", resume: "המשך מאיפה שעצרת",
      meta: "הכול נשמר אוטומטית ורק במכשיר שלך",
      install: "📲 התקנה למסך הבית",
      ios: "באייפון או באייפד: לוחצים על כפתור השיתוף <b>(□↑)</b> בתחתית Safari, ואז בוחרים <b>„הוסף למסך הבית”</b>.",
      other: "בתפריט הדפדפן (⋮) בוחרים <b>„התקנת אפליקציה”</b> או <b>„הוספה למסך הבית”</b>.",
      disc: "<b>חשוב:</b> היליפיי היא כלי אישי לארגון מידע ואינה מהווה ייעוץ רפואי. היא אינה מחליפה רופא, אבחון או טיפול רפואי. לפני כל שינוי בטיפול יש להתייעץ עם רופא.<span class=em><b>במצב חירום או סכנה:</b> מד״א <a href=\"tel:101\">101</a> · ער״ן, עזרה ראשונה נפשית <a href=\"tel:1201\">1201</a></span>",
      steps: ["א · הבעיה", "ב · בדיקות", "ג · טכנולוגיות", "ד · לפי מקרה", "סיכום"],
      stepnum: function (i, n) { return i <= 4 ? "שלב " + i + " מתוך 4" : "סיכום"; },
      prev: "→ הקודם", next: "הבא ←", toSum: "לסיכום ←", edit: "→ חזרה לעריכה", home: "→ למסך הפתיחה",
      saved: "✓ נשמר במכשיר", saving: "שומר…",
      aTitle: "א · מה הבעיה שלך?",
      aLead: "כתוב בפירוט, במילים שלך. כל השדות אופציונליים, ואפשר לחזור ולהשלים בכל זמן.",
      casesTitle: "סוג המקרה", casesHelp: "אפשר לבחור יותר מאחד. הבחירה קובעת מה יוצג בשלב ד.",
      cases: { autoimmune: "אוטואימון", cancer: "סרטן", mental: "מחלה נפשית", other: "אחר / צירוף" },
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
      bTitle: "ב · בדיקות מומלצות",
      bLead: "בדיקות שכדאי לעשות כדי לקבל תמונה ברורה וממוקדת יותר.",
      bGroups: { free: ["בדיקות חינמיות ואונליין", "חינמיות, אפשר לעשות אונליין"], home: ["ערכות בדיקה עד הבית", "מזמינים אונליין עד הבית ומבצעים לבד לפי ההנחיות"] },
      cTitle: "ג · טכנולוגיות מרפאות",
      cLead: "השקעה בטכנולוגיות לריפוי עצמי, בשלוש רמות.",
      cGroups: { free: ["חינמי", "טכנולוגיות חינמיות"], low: ["עלות נמוכה", "טכנולוגיות בעלות נמוכה"], premium: ["יוקרתי", "טכנולוגיות יקרות ויוקרתיות"] },
      tiers: { free: "0 ₪", low: "₪", premium: "₪₪₪" },
      dTitle: "ד · הבחנה לפי מקרים",
      dLead: "התאמה לפי סוג המקרה.",
      dCases: { autoimmune: ["אוטואימון", "אם יש מחלה אוטואימונית"], cancer: ["סרטן", "אם יש סרטן"], mental: ["מחלה נפשית", "אם יש מחלה נפשית"], combo: ["צירוף", "אם יש צירוף של כמה מצבים"] },
      dYours: "המקרים שבחרת בשלב א מסומנים ומוצגים ראשונים.",
      dNone: "עוד לא בחרת סוג מקרה בשלב א, ולכן מוצגים כל המקרים.",
      dOtherYou: "מה שכתבת:",
      dRest: "שאר המקרים",
      soon: "יצורף בקרוב",
      link: "לפרטים ←",
      sumTitle: "הסיכום שלך", sumLead: "כל מה שמילאת, במקום אחד.",
      sumScores: "מדדי סבל", sumCases: "סוג המקרה", sumDesc: "התיאור שלך", sumData: "הנתונים שלך",
      noCases: "לא נבחר", empty: "לא מולא",
      expTxt: "⬇ הורדה כקובץ טקסט", expJson: "⬇ הורדה כ-JSON", clear: "🗑 מחיקת הנתונים שלי",
      confirm: "למחוק את כל מה שמילאת בהיליפיי מהמכשיר הזה? אי אפשר לבטל את זה.",
      cleared: "הנתונים נמחקו", downloaded: "הקובץ ירד",
      privacy: "הנתונים נשמרים רק בדפדפן במכשיר הזה ולא נשלחים לשום מקום. מומלץ להוריד עותק מדי פעם.",
      recsTitle: "המלצות אישיות של רון", recsQ: "עם מה אתה מתמודד?",
      recsHelp: "אפשר לבחור יותר מאחד. לכל בחירה תיפתח ההמלצה שלי.",
      recsNone: "בחר נושא אחד או יותר כדי לראות את ההמלצות.",
      recsOpen: "המלצות אישיות של רון ←",
      recsDisc: "אין לראות במידע המוצג כאן ייעוץ רפואי. מומלץ להיוועץ ברופא פונקציונלי לפני תחילת תהליך משנה חיים. כל הטיפולים המומלצים כאן ניתנים במכונים וקליניקות עם השגחה רפואית.",
      foot: "היליפיי · Healify · גרסה 1",
      fileTitle: "היליפיי · הסיכום שלי", fileDate: "תאריך"
    },
    en: {
      doc: "Healify · היליפיי", back: "← Back to site",
      eyebrow: "היליפיי", title: "Healify", tagline: "A personal space for your complete healing journey",
      sub: "Start by describing what you're going through, continue to tests and self-healing technologies, and finish with guidance by case.",
      start: "Let's begin", resume: "Continue where you left off",
      meta: "Everything saves automatically, only on your device",
      install: "📲 Add to home screen",
      ios: "On iPhone or iPad: tap the Share button <b>(□↑)</b> at the bottom of Safari, then choose <b>“Add to Home Screen”</b>.",
      other: "Open your browser menu (⋮) and choose <b>“Install app”</b> or <b>“Add to Home screen”</b>.",
      disc: "<b>Important:</b> Healify is a personal tool for organizing information and is not medical advice. It does not replace a doctor, diagnosis or medical treatment. Always consult a doctor before changing any treatment.<span class=em><b>In an emergency or danger:</b> Israel: MDA <a href=\"tel:101\">101</a> · ERAN emotional first aid <a href=\"tel:1201\">1201</a> · elsewhere, your local emergency number</span>",
      steps: ["A · Problem", "B · Tests", "C · Tech", "D · By case", "Summary"],
      stepnum: function (i, n) { return i <= 4 ? "Step " + i + " of 4" : "Summary"; },
      prev: "← Back", next: "Next →", toSum: "To summary →", edit: "← Back to editing", home: "← Home",
      saved: "✓ Saved on this device", saving: "Saving…",
      aTitle: "A · What is your problem?",
      aLead: "Write in detail, in your own words. Every field is optional, and you can come back to it any time.",
      casesTitle: "Type of case", casesHelp: "You can pick more than one. Your choice shapes what you see in step D.",
      cases: { autoimmune: "Autoimmune", cancer: "Cancer", mental: "Mental illness", other: "Other / combination" },
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
      bTitle: "B · Recommended tests",
      bLead: "Tests worth doing to get a clearer, more focused picture.",
      bGroups: { free: ["Free & online tests", "Free, can be done online"], home: ["Home test kits", "Order online to your home and do it yourself per the instructions"] },
      cTitle: "C · Healing technologies",
      cLead: "Investing in self-healing technologies, in three levels.",
      cGroups: { free: ["Free", "Free technologies"], low: ["Low-cost", "Low-cost technologies"], premium: ["Luxury", "Expensive & luxurious technologies"] },
      tiers: { free: "$0", low: "$", premium: "$$$" },
      dTitle: "D · Distinction by case",
      dLead: "Guidance matched to the type of case.",
      dCases: { autoimmune: ["Autoimmune", "If there is an autoimmune condition"], cancer: ["Cancer", "If there is cancer"], mental: ["Mental illness", "If there is a mental illness"], combo: ["Combination", "If there is a combination of conditions"] },
      dYours: "The cases you chose in step A are highlighted and shown first.",
      dNone: "You haven't chosen a case type in step A yet, so all cases are shown.",
      dOtherYou: "What you wrote:",
      dRest: "Other cases",
      soon: "Coming soon",
      link: "Details →",
      sumTitle: "Your summary", sumLead: "Everything you filled in, in one place.",
      sumScores: "Suffering scales", sumCases: "Type of case", sumDesc: "Your description", sumData: "Your data",
      noCases: "None chosen", empty: "Not filled in",
      expTxt: "⬇ Download as text", expJson: "⬇ Download as JSON", clear: "🗑 Clear my data",
      confirm: "Delete everything you filled in Healify from this device? This can't be undone.",
      cleared: "Your data was cleared", downloaded: "File downloaded",
      privacy: "Your data is stored only in this browser on this device and is never sent anywhere. It's a good idea to download a copy now and then.",
      recsTitle: "Ron's personal recommendations", recsQ: "What are you dealing with?",
      recsHelp: "You can pick more than one. Each choice opens my recommendation.",
      recsNone: "Pick one or more topics to see the recommendations.",
      recsOpen: "Ron's personal recommendations →",
      recsDisc: "The information shown here is not medical advice. It's recommended to consult a functional medicine doctor before starting a life-changing process. All the treatments recommended here are provided at institutes and clinics with medical supervision.",
      foot: "Healify · היליפיי · version 1",
      fileTitle: "Healify · My summary", fileDate: "Date"
    }
  };
  function t() { return T[lang]; }

  var ICON_SOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';

  /* ----- state ----- */
  function blank() { return { v: 1, view: "welcome", cases: [], recs: null, otherText: "", text: {}, scores: {}, updated: null }; }
  var S = blank();
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && typeof s === "object") {
        S.view = (VIEWS.indexOf(s.view) >= 0 || s.view === "welcome") ? s.view : "welcome";
        S.cases = Array.isArray(s.cases) ? s.cases.filter(function (c) { return CASES.indexOf(c) >= 0; }) : [];
        S.recs = Array.isArray(s.recs) ? s.recs.filter(function (c) { return RECIDS.indexOf(c) >= 0; }) : null;
        S.otherText = typeof s.otherText === "string" ? s.otherText : "";
        S.text = {}; FIELDS.forEach(function (f) { if (s.text && typeof s.text[f] === "string") S.text[f] = s.text[f]; });
        S.scores = {}; SCORES.forEach(function (k) { var n = s.scores && +s.scores[k]; if (n >= 1 && n <= 10) S.scores[k] = Math.round(n); });
        S.updated = s.updated || null;
      }
    } catch (e) {}
  }
  var saveTimer = null;
  function save(now) {
    clearTimeout(saveTimer);
    var doit = function () {
      S.updated = new Date().toISOString();
      try { localStorage.setItem(KEY, JSON.stringify(S)); flashSaved(); } catch (e) {}
    };
    if (now) doit(); else { $("saved").textContent = t().saving; $("saved").className = "saved"; saveTimer = setTimeout(doit, 350); }
  }
  function flush() { if (saveTimer) save(true); }
  function flashSaved() { $("saved").textContent = t().saved; $("saved").className = "saved on"; }
  function hasData() { return S.cases.length || (S.recs && S.recs.length) || S.otherText || Object.keys(S.text).some(function (k) { return S.text[k]; }) || Object.keys(S.scores).length; }

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
      if (RECIDS.indexOf(c) >= 0) { var r = myRecs().filter(function (x) { return x !== c; }); if (i < 0) r.push(c); S.recs = r; }
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
    $("c-title").textContent = L.cTitle; $("c-lead").textContent = L.cLead;
    $("c-groups").innerHTML = ["free", "low", "premium"].map(function (g) {
      return group(L.cGroups[g][0], L.cGroups[g][1], list(tech[g]), g === "premium" ? "premium" : "", '<span class="tier ' + g + '">' + esc(L.tiers[g]) + "</span>");
    }).join("");
  }
  function fillD() {
    var L = t(), cs = C.cases || {}, combos = C.combos || {};
    $("d-title").textContent = L.dTitle; $("d-lead").textContent = L.dLead;
    var chosen = S.cases.slice(), wantCombo = chosen.length >= 2 || chosen.indexOf("other") >= 0;
    var mine = [], rest = [];
    ["autoimmune", "cancer", "mental", "combo"].forEach(function (id) {
      var sel = id === "combo" ? wantCombo : chosen.indexOf(id) >= 0;
      var body = "";
      if (id === "combo") {
        if (chosen.indexOf("other") >= 0 && S.otherText.trim()) body += '<p class="othertext">' + esc(L.dOtherYou) + " " + esc(S.otherText.trim()) + "</p>";
        var key = chosen.join("+"), specific = chosen.length >= 2 && Array.isArray(combos[key]) && combos[key].length ? combos[key] : null;
        body += list(specific ? specific.concat(cs.combo || []) : cs.combo);
      } else body = list(cs[id]);
      var html = group(L.dCases[id][0], L.dCases[id][1], body, sel ? "sel" : "");
      (sel || !chosen.length ? mine : rest).push(html);
    });
    var out = '<p class="note">' + esc(chosen.length ? L.dYours : L.dNone) + "</p>" + mine.join("");
    if (rest.length) out += '<details class="more" open><summary>' + esc(L.dRest) + "</summary>" + rest.join("") + "</details>";
    $("d-groups").innerHTML = recsHTML() + out;
  }

  /* ----- Ron's personal recommendations (inside step D) ----- */
  function myRecs() { return Array.isArray(S.recs) ? S.recs.slice() : S.cases.filter(function (c) { return RECIDS.indexOf(c) >= 0; }); }
  function recsHTML() {
    if (!RECS.length) return "";
    var L = t(), mine = myRecs();
    var chips = RECS.map(function (r) {
      var on = mine.indexOf(r.id) >= 0;
      return '<button type="button" class="chip" data-rec="' + esc(r.id) + '" aria-pressed="' + on + '"><span class="tick">✓</span><span class="cl">' + esc(pick(r).title) + "</span></button>";
    }).join("");
    var panels = RECS.filter(function (r) { return mine.indexOf(r.id) >= 0; }).map(function (r) {
      var p = pick(r), links = (Array.isArray(r.links) ? r.links : []).filter(function (k) { return k && /^https?:\/\//.test(k.url); }).map(function (k) {
        return '<a href="' + esc(k.url) + '" target="_blank" rel="noopener">' + esc(k[lang] || k.he || k.en || k.url) + ' <span aria-hidden="true">' + (lang === "he" ? "↖" : "↗") + "</span></a>";
      }).join("");
      var body = p.text ? '<div class="rd">' + esc(p.text) + "</div>" + (links ? '<div class="rl">' + links + "</div>" : "") : '<div class="soon">' + ICON_SOON + "<span>" + esc(L.soon) + "</span></div>";
      return '<div class="rec" id="rec-' + esc(r.id) + '"><div class="rt">' + esc(p.title) + "</div>" + body + "</div>";
    }).join("");
    return '<div class="card recs" id="recs"><h3><span class="ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/></svg></span><span>' + esc(L.recsTitle) + "</span></h3>" +
      '<p class="rq">' + esc(L.recsQ) + '</p><p class="help">' + esc(L.recsHelp) + "</p>" +
      '<div class="chips" id="rec-chips" role="group" aria-label="' + esc(L.recsQ) + '">' + chips + "</div>" +
      '<div class="recpanels" aria-live="polite">' + (panels || '<p class="note">' + esc(L.recsNone) + "</p>") + "</div>" +
      '<p class="recdisc">' + esc(L.recsDisc) + "</p></div>";
  }
  $("d-groups").addEventListener("click", function (e) {
    var b = e.target.closest("[data-rec]"); if (!b) return;
    var id = b.getAttribute("data-rec"), r = myRecs(), i = r.indexOf(id);
    if (i >= 0) r.splice(i, 1); else r.push(id);
    S.recs = r.sort(function (x, y) { return RECIDS.indexOf(x) - RECIDS.indexOf(y); });
    save(true); fillD();
    var nb = document.querySelector('#rec-chips [data-rec="' + id + '"]'); if (nb) nb.focus();
    if (i < 0) { var pn = $("rec-" + id); if (pn && pn.scrollIntoView) pn.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  });

  /* ----- summary ----- */
  function fillSum() {
    var L = t();
    $("sum-title").textContent = L.sumTitle; $("sum-lead").textContent = L.sumLead;
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
    $("exp-txt").textContent = L.expTxt; $("exp-json").textContent = L.expJson; $("clear").textContent = L.clear; $("privacy").textContent = L.privacy;
  }
  function asText() {
    var L = t(), out = [L.fileTitle, L.fileDate + ": " + new Date().toLocaleString(lang === "he" ? "he-IL" : "en-GB"), ""];
    out.push("== " + L.sumScores + " ==");
    SCORES.forEach(function (k) { out.push(L.scores[k] + ": " + (S.scores[k] ? S.scores[k] + "/10" : L.none)); });
    out.push("", "== " + L.sumCases + " ==", S.cases.map(function (c) { return L.cases[c]; }).join(", ") || L.noCases);
    if (S.cases.indexOf("other") >= 0 && S.otherText.trim()) out.push(L.cases.other + ": " + S.otherText.trim());
    out.push("", "== " + L.sumDesc + " ==");
    FIELDS.forEach(function (f) { out.push("", "- " + L.fields[f][0] + ":", (S.text[f] || "").trim() || L.empty); });
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
  $("exp-json").onclick = function () { flush(); download("healify-" + stamp() + ".json", JSON.stringify({ app: "healify", version: 1, exported: new Date().toISOString(), data: S }, null, 2), "application/json"); };
  $("clear").onclick = function () {
    if (!window.confirm(t().confirm)) return;
    clearTimeout(saveTimer); saveTimer = null;
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = blank(); fillA(); toast(t().cleared); go("welcome", true);
  };

  /* ----- navigation ----- */
  function go(v, noSave) {
    flush();
    S.view = v;
    $("s-welcome").hidden = v !== "welcome";
    $("flow").hidden = v === "welcome";
    VIEWS.forEach(function (x) { $("s-" + x).hidden = x !== v; });
    render();
    if (!noSave) save(true);
    window.scrollTo(0, 0);
  }
  $("start").onclick = function () { go(hasData() ? lastView : "a"); };
  var lastView = "a";
  if ($("recs-open")) $("recs-open").onclick = function () { go("d"); setTimeout(function () { var r = $("recs"); if (r) r.scrollIntoView({ block: "start" }); }, 30); };
  $("prev").onclick = function () { var i = VIEWS.indexOf(S.view); go(i > 0 ? VIEWS[i - 1] : "welcome"); };
  $("next").onclick = function () { var i = VIEWS.indexOf(S.view); if (i < VIEWS.length - 1) go(VIEWS[i + 1]); else go("a"); };
  $("steps").onclick = function (e) { var b = e.target.closest("[data-v]"); if (b) go(b.getAttribute("data-v")); };

  function renderSteps() {
    var L = t(), cur = VIEWS.indexOf(S.view);
    $("steps").innerHTML = VIEWS.map(function (v, i) {
      return '<li class="' + (i < cur ? "done" : i === cur ? "cur" : "") + '"><button type="button" data-v="' + v + '"' + (i === cur ? ' aria-current="step"' : "") + '><span class="bar"></span>' + esc(L.steps[i]) + "</button></li>";
    }).join("");
    $("stepnum").textContent = cur >= 0 ? L.stepnum(cur + 1) : "";
    $("prev").textContent = cur === 0 ? L.home : L.prev;
    $("next").textContent = cur === VIEWS.length - 1 ? L.edit : cur === VIEWS.length - 2 ? L.toSum : L.next;
  }

  function render() {
    var L = t();
    document.documentElement.lang = lang; document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    document.title = L.doc;
    $("lang-he").setAttribute("aria-pressed", lang === "he"); $("lang-en").setAttribute("aria-pressed", lang === "en");
    $("back").textContent = L.back;
    $("w-eyebrow").textContent = L.eyebrow; $("w-title").textContent = L.title; $("w-tagline").textContent = L.tagline; $("w-sub").textContent = L.sub;
    $("start").textContent = hasData() ? L.resume : L.start; $("w-meta").textContent = L.meta;
    $("install-btn").textContent = L.install;
    if ($("recs-open")) { $("recs-open").textContent = L.recsOpen; $("recs-open").hidden = !RECS.length; }
    if (!$("install-hint").hidden) $("install-hint").innerHTML = L[isIOS ? "ios" : "other"];
    $("disc-w").innerHTML = L.disc; $("disc-f").innerHTML = L.disc;
    $("foot").textContent = L.foot;
    if (S.view !== "welcome") lastView = S.view;
    fillA(); fillB(); fillC(); fillD(); fillSum(); renderSteps();
    if (S.updated && $("saved").textContent) flashSaved();
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

  /* ----- boot ----- */
  buildA();
  load();
  var startView = S.view;
  if (startView !== "welcome") lastView = startView;
  go(startView, true);
  updateInstall();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  }
})();
