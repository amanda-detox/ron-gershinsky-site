/* help-now.js: the always-visible "need help now" button + sheet with Israeli support lines, for the private apps
   that deal with addiction and emotional wellbeing (my/rehabify/, my/calmify/). Public information only, no personal data.
   Usage: <div id="help-now" data-extra="addiction"></div> ... <script src="../help-now.js"></script> (after common.js).
   Numbers were checked on each organisation's own site in October 2026 (see SOURCES). Re-check before changing. */
(function () {
  "use strict";
  var S = {
    he: { btn: "🆘 צריך עזרה עכשיו", title: "עזרה עכשיו", close: "סגירה",
      intro: "אם אתה או מישהו לידך בסכנה מיידית, חייג עכשיו 101 (מד״א) או 100 (משטרה). אתה לא לבד, ויש מי שיקשיב לך בכל שעה.",
      emerg: "חירום", talk: "שיחה ותמיכה רגשית", add: "התמכרויות",
      mda: "מד״א – חירום רפואי", police: "משטרה", h247: "24/7",
      eran: "ער״ן – עזרה ראשונה נפשית", eranWa: "ער״ן בוואטסאפ", eranWaH: "08:00–02:00",
      sahar: "סה״ר – סיוע והקשבה ברשת (וואטסאפ)", saharChat: "סה״ר – צ׳אט אנונימי באתר", chat: "לצ׳אט",
      aguda: "הקו החם לטיפול בהתמכרויות – האגודה לבריאות הציבור", agudaH: "א׳–ה׳ 08:00–16:00",
      malki: "הקו החם של נוה מלכישוע – התמכרויות",
      note: "המספרים נבדקו באתרי הארגונים באוקטובר 2026. האפליקציה הזו אינה תחליף לעזרה מקצועית." },
    en: { btn: "🆘 I need help now", title: "Help now", close: "Close",
      intro: "If you or someone near you is in immediate danger, call 101 (MDA ambulance) or 100 (police) now. You are not alone – someone is there to listen at any hour.",
      emerg: "Emergency", talk: "Talk and emotional support", add: "Addiction",
      mda: "MDA – medical emergency", police: "Police", h247: "24/7",
      eran: "ERAN – emotional first aid", eranWa: "ERAN on WhatsApp", eranWaH: "08:00–02:00",
      sahar: "SAHAR – online support (WhatsApp)", saharChat: "SAHAR – anonymous chat on the website", chat: "Open chat",
      aguda: "Addiction treatment hotline – Israel Public Health Association", agudaH: "Sun–Thu 08:00–16:00",
      malki: "Neve Malkishua hotline – addiction",
      note: "Numbers were checked on each organisation's website in October 2026. This app is not a substitute for professional help." }
  };
  /* label key, number shown, link, hours key */
  var GROUPS = [
    ["emerg", [["mda", "101", "tel:101", "h247"], ["police", "100", "tel:100", "h247"]]],
    ["talk", [["eran", "1201", "tel:1201", "h247"], ["eranWa", "052-8451201", "https://wa.me/972528451201", "eranWaH"],
              ["sahar", "055-9571399", "https://wa.me/972559571399", "h247"], ["saharChat", "chat", "https://sahar.org.il/help/", "h247"]]],
    ["add", [["aguda", "*6271", "tel:%2A6271", "agudaH"], ["malki", "052-3081133", "tel:0523081133", "h247"]], "addiction"]
  ];
  var host = document.getElementById("help-now"); if (!host) return;
  var extra = host.getAttribute("data-extra") || "";
  function L() { return window.RGMy && RGMy.lang() === "en" ? "en" : "he"; }
  function t(k) { return S[L()][k]; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var dlg = document.createElement("dialog"); dlg.className = "helpdlg"; dlg.setAttribute("aria-labelledby", "help-title");
  document.body.appendChild(dlg);
  function draw() {
    host.innerHTML = '<button type="button" class="helpbtn" aria-haspopup="dialog">' + esc(t("btn")) + "</button>";
    var h = '<button type="button" class="helpx" data-close aria-label="' + esc(t("close")) + '">×</button><h2 id="help-title">' + esc(t("title")) + "</h2><p class=\"helpintro\">" + esc(t("intro")) + "</p>";
    GROUPS.forEach(function (g) {
      if (g[2] && g[2] !== extra) return;
      h += "<h3>" + esc(t(g[0])) + '</h3><ul class="helplist">' + g[1].map(function (x) {
        var web = /^https/.test(x[2]);
        return '<li><a href="' + x[2] + '"' + (web ? ' target="_blank" rel="noopener"' : "") + '><span class="hl-n">' + esc(t(x[0])) + '</span><span class="hl-h">' + esc(t(x[3])).replace(/(\d\d:\d\d–\d\d:\d\d)/g, '<span dir="ltr">$1</span>') + '</span><b class="hl-num" dir="ltr">' + esc(x[1] === "chat" ? t("chat") : x[1]) + "</b></a></li>";
      }).join("") + "</ul>";
    });
    dlg.innerHTML = h + '<p class="helpnote">' + esc(t("note")) + "</p>";
  }
  host.addEventListener("click", function (e) { if (e.target.closest(".helpbtn")) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); } });
  dlg.addEventListener("click", function (e) { if (e.target === dlg || e.target.closest("[data-close]")) { if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); } });
  window.RGHelp = { open: function () { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); } };
  draw();
  if (window.RGMy) RGMy.onLang(draw);
})();
