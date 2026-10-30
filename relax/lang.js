/* Hebrew/English for the Relax games. Shares the "rg-lang" key with the main site and the alarm app.
   Text only: game mechanics are untouched. */
(function () {
  var KEY = "rg-lang";
  var HE = {
    "Quiet Night": "לילה שקט", "Still Pond": "בריכה שקטה", "Glow Garden": "גן זוהר", "Watercolor": "צבעי מים",
    "Back to all games": "חזרה לכל המשחקים", "Full screen": "מסך מלא",
    "Turn sound on": "הפעלת צליל", "Turn sound off": "כיבוי צליל",
    /* Quiet Night */
    "A quiet night sky. Tap anywhere to release glowing lights.": "שמי לילה שקטים. נוגעים בכל מקום כדי לשחרר אורות זוהרים.",
    "Mode": "מצב", "Breathe": "נשימה", "Play": "משחק",
    "Breathe in": "שאיפה", "Hold softly": "מחזיקים בעדינות", "Breathe out": "נשיפה", "Rest": "מנוחה",
    "You\u2019re doing well.": "הולך לך טוב.",
    "Nothing else needs you right now.": "שום דבר אחר לא צריך אותך עכשיו.",
    "Let your shoulders soften.": "הכתפיים מתרככות.",
    "This feeling will pass.": "התחושה הזאת תחלוף.",
    "You are safe in this moment.": "ברגע הזה, הכול בטוח.",
    "Just this breath.": "רק הנשימה הזאת.",
    "Be gentle with yourself.": "בעדינות עם עצמך.",
    "Let\u2019s breathe together": "נושמים יחד",
    "Tap anywhere. No rush.": "נוגעים איפה שרוצים. בלי למהר.",
    /* Still Pond */
    "A still pond. Touch the water to make ripples.": "בריכה שקטה. נוגעים במים כדי ליצור אדוות.",
    "Touch the water": "נוגעים במים", "Soft rain": "גשם עדין",
    /* Glow Garden */
    "A dusk meadow. Tap the ground to plant glowing flowers, tap the sky to place stars.": "אחו בדמדומים. נוגעים באדמה כדי לשתול פרחים זוהרים, ובשמיים כדי להציב כוכבים.",
    "Tap the ground to plant a flower": "נוגעים באדמה כדי לשתול פרח",
    "Tap the sky to place a star": "נוגעים בשמיים כדי להציב כוכב",
    "New evening": "ערב חדש",
    /* Watercolor */
    "Watercolor paper. Touch and drag to paint soft colors.": "נייר לצבעי מים. נוגעים וגוררים כדי לצבוע בצבעים רכים.",
    "Fresh paper": "דף חדש", "Touch the paper and let color bloom": "נוגעים בנייר ונותנים לצבע לפרוח",
    "Colors": "צבעים", "Drifting colors": "צבעים נודדים", "Color": "צבע"
  };
  var EN = {};
  for (var k in HE) EN[HE[k]] = k;

  var lang = "he";
  try { if (localStorage.getItem(KEY) === "en") lang = "en"; } catch (e) {}

  // Translate an English (or Hebrew) string into the current language. Keeps a trailing number ("Color 3").
  function tr(s) {
    if (s == null) return s;
    var m = /^([\s\S]*?)( \d+)?$/.exec(String(s)), base = m[1], num = m[2] || "";
    var en = HE[base] ? base : EN[base];
    if (!en) return s;
    return (lang === "he" ? HE[en] : en) + num;
  }
  window.RGT = tr;

  function translateTree(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) list.push(n);
    list.forEach(function (t) {
      var raw = t.nodeValue, trimmed = raw.trim();
      if (!trimmed) return;
      var out = tr(trimmed);
      if (out !== trimmed) t.nodeValue = raw.replace(trimmed, out);
    });
    var labeled = root.querySelectorAll("[aria-label]");
    for (var i = 0; i < labeled.length; i++) {
      if (labeled[i].id === "rg-lang-btn") continue;
      var a = labeled[i].getAttribute("aria-label"), b = tr(a);
      if (b !== a) labeled[i].setAttribute("aria-label", b);
    }
  }

  function apply() {
    var h = document.documentElement;
    h.lang = lang; h.dir = lang === "he" ? "rtl" : "ltr";
    if (document.title) document.title = tr(document.title);
    if (document.body) translateTree(document.body);
    var btn = document.getElementById("rg-lang-btn");
    if (btn) {
      btn.textContent = "🌐"; btn.title = "Language / שפה";
      btn.setAttribute("lang", lang === "he" ? "en" : "he");
      btn.setAttribute("aria-label", lang === "he" ? "Switch to English" : "מעבר לעברית");
    }
  }
  function setLang(l) {
    lang = l === "en" ? "en" : "he";
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    apply();
    try { window.dispatchEvent(new CustomEvent("rg-langchange", { detail: lang })); } catch (e) {}
  }
  window.RGLang = { get: function () { return lang; }, set: setLang, apply: apply };

  // Set direction early to avoid a flash.
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "he" ? "rtl" : "ltr";

  function init() {
    var css = document.createElement("style");
    css.textContent = "#rg-lang-btn{right:calc(14px + env(safe-area-inset-right,0px));left:auto;" +
      "top:calc(76px + env(safe-area-inset-top,0px));font-size:14px;font-weight:500;letter-spacing:.04em}";
    document.head.appendChild(css);
    var b = document.createElement("button");
    b.type = "button"; b.id = "rg-lang-btn"; b.className = "ui";
    b.addEventListener("click", function () { setLang(lang === "he" ? "en" : "he"); });
    var ref = document.getElementById("sound");
    if (ref && ref.parentNode) ref.parentNode.insertBefore(b, ref.nextSibling); else document.body.appendChild(b);
    apply();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  // Other tabs (menu/alarm) changing the language keep this page in sync.
  window.addEventListener("storage", function (e) { if (e.key === KEY && e.newValue && e.newValue !== lang) { lang = e.newValue === "en" ? "en" : "he"; apply(); } });
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    var v = "he"; try { if (localStorage.getItem(KEY) === "en") v = "en"; } catch (er) {}
    if (v !== lang) { lang = v; apply(); }
  });
})();
