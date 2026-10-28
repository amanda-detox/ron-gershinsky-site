/* Youngify · יאנגיפיי (beta). 5 stages x pick 3 of 5 tasks x 20 points = 300. Progress in localStorage. */
(function () {
  "use strict";
  var KEY = "rg-young-progress";
  var PER = 20, NEED = 3, TOTAL = STAGES.length * NEED * PER;
  var COPY_HE = '© כל הזכויות שמורות לחברת היליפיי בע"מ 2026';
  var COPY_EN = '© 2026 Healify Ltd. All rights reserved.';
  var T = {
    he: {
      title: "יאנגיפיי", langBtn: "English", install: "📲 התקנה",
      tag: "המלצות פשוטות לבניית בסיס לחיים טובים, בריאים ומשגשגים. בכל שלב בוחרים 3 משימות מתוך 5, וכל משימה שווה 20 נקודות.",
      of300: "מתוך 300", path: "המסלול שלך", stage: "שלב", locked: "🔒 נפתח אחרי השלב הקודם",
      heroStart: "מתחילים מהשלב הראשון. <b>3 משימות</b> בכל שלב מספיקות כדי לעבור הלאה.",
      heroMid: "כל הכבוד! עוד <b>{n} נקודות</b> עד 300.", heroDone: "<b>הגעת ל־300!</b> השלמת את כל המסלול.",
      back: "→ חזרה למסלול", pick: "בוצעו {d} מתוך 3", pickDone: "השלב הושלם ✓",
      why: "למה זה עובד?", whyHide: "הסתרה", doIt: "ביצעתי ✓ +20", did: "בוצע ✓", undo: "ביטול",
      stageDoneT: "שלב הושלם!", stageDoneP: "צברת עוד 60 נקודות. השלב הבא נפתח.", next: "לשלב הבא",
      allDoneT: "300 נקודות!", allDoneP: "השלמת את כל חמשת השלבים. בנית בסיס אמיתי, ועכשיו הדבר החשוב הוא להמשיך את ההרגלים שאהבת.", great: "איזה יופי",
      disc: "המידע כאן כללי ואינו מהווה ייעוץ מקצועי, רפואי, נפשי או פיננסי. בכל שאלה אישית כדאי לפנות לאיש מקצוע.",
      reset: "איפוס התקדמות", resetQ: "לאפס את כל ההתקדמות ולהתחיל מחדש?", copy: COPY_HE
    },
    en: {
      title: "Youngify", langBtn: "עברית", install: "📲 Install",
      tag: "Simple tips for building a foundation for a good, healthy, thriving life. In each stage pick 3 of 5 tasks; each task is worth 20 points.",
      of300: "of 300", path: "Your path", stage: "Stage", locked: "🔒 Opens after the previous stage",
      heroStart: "Start with the first stage. <b>3 tasks</b> per stage are enough to move on.",
      heroMid: "Well done! <b>{n} more points</b> to 300.", heroDone: "<b>You reached 300!</b> You completed the whole path.",
      back: "← Back to path", pick: "{d} of 3 done", pickDone: "Stage complete ✓",
      why: "Why it works", whyHide: "Hide", doIt: "Done ✓ +20", did: "Done ✓", undo: "Undo",
      stageDoneT: "Stage complete!", stageDoneP: "You earned another 60 points. The next stage is open.", next: "Next stage",
      allDoneT: "300 points!", allDoneP: "You completed all five stages. You've built a real foundation; now the key is to keep the habits you liked.", great: "Wonderful",
      disc: "This is general information, not professional, medical, mental-health or financial advice. For personal questions, consult a professional.",
      reset: "Reset progress", resetQ: "Reset all progress and start over?", copy: COPY_EN
    }
  };
  var INST = {
    he: { android: '<ol><li>פותחים את תפריט הדפדפן: <b>⋮</b> למעלה ב־Chrome, או <b>☰</b> למטה ב־Samsung Internet.</li><li>בוחרים <b>„התקנת אפליקציה”</b> או <b>„הוספה למסך הבית”</b>.</li></ol>', ios: '<ol><li>ב־Safari לוחצים על כפתור השיתוף <b>(□↑)</b>.</li><li>בוחרים <b>„הוסף למסך הבית”</b> ואז <b>„הוסף”</b>.</li></ol>', desktop: '<ol><li>ב־Chrome או Edge: סמל ההתקנה בצד שורת הכתובת, או תפריט <b>⋮</b> ← <b>„התקנה”</b>.</li><li>בטלפון: פותחים את הכתובת בדפדפן ובוחרים <b>„הוספה למסך הבית”</b>.</li></ol>' },
    en: { android: '<ol><li>Open the browser menu: <b>⋮</b> at the top in Chrome, or <b>☰</b> at the bottom in Samsung Internet.</li><li>Choose <b>“Install app”</b> or <b>“Add to Home screen”</b>.</li></ol>', ios: '<ol><li>In Safari tap the Share button <b>(□↑)</b>.</li><li>Choose <b>“Add to Home Screen”</b>, then <b>“Add”</b>.</li></ol>', desktop: '<ol><li>In Chrome or Edge: click the install icon at the end of the address bar, or menu <b>⋮</b> → <b>“Install”</b>.</li><li>On a phone: open this address in the browser and choose <b>“Add to Home screen”</b>.</li></ol>' }
  };

  function $(id) { return document.getElementById(id); }
  function load() { try { var s = JSON.parse(localStorage.getItem(KEY)); if (s && s.done) return s; } catch (e) {} return { done: {}, lang: "he" }; }
  var S = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  var lang = S.lang === "en" ? "en" : "he";
  function t(k) { return T[lang][k]; }
  function doneOf(i) { return S.done[i] || []; }
  function stageComplete(i) { return doneOf(i).length >= NEED; }
  function unlocked(i) { return i === 0 || stageComplete(i - 1); }
  function points() { var p = 0; for (var i = 0; i < STAGES.length; i++) p += Math.min(doneOf(i).length, NEED) * PER; return p; }
  var current = -1, openWhy = {};

  function applyLang() {
    document.documentElement.lang = lang; document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    document.title = lang === "he" ? "יאנגיפיי · Youngify" : "Youngify · יאנגיפיי";
    document.querySelectorAll("[data-t]").forEach(function (el) { el.textContent = t(el.getAttribute("data-t")); });
    $("langBtn").textContent = t("langBtn"); $("backBtn").textContent = t("back");
    if (!$("installHint").classList.contains("hidden")) $("installHint").innerHTML = instHint();
    render();
  }

  function render() {
    var p = points();
    $("pts").textContent = p;
    $("ringArc").setAttribute("stroke-dashoffset", (314.16 * (1 - p / TOTAL)).toFixed(2));
    $("ringBox").setAttribute("aria-label", p + " / " + TOTAL);
    $("heroTxt").innerHTML = p === 0 ? t("heroStart") : p >= TOTAL ? t("heroDone") : t("heroMid").replace("{n}", TOTAL - p);
    var ul = $("stages"); ul.innerHTML = "";
    STAGES.forEach(function (st, i) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      var lock = !unlocked(i), comp = stageComplete(i);
      b.className = "stage" + (lock ? " locked" : "") + (comp ? " done" : "");
      b.disabled = lock;
      b.innerHTML = '<span class="n">' + (comp ? "✓" : (i + 1)) + '</span><span class="t"><b></b><span></span></span><span class="p"></span>';
      b.querySelector(".t b").textContent = t("stage") + " " + (i + 1) + ": " + st[lang];
      b.querySelector(".t span").textContent = lock ? t("locked") : st[lang + "Sub"];
      b.querySelector(".p").textContent = Math.min(doneOf(i).length, NEED) * PER + "/60";
      b.addEventListener("click", function () { openStage(i); });
      li.appendChild(b); ul.appendChild(li);
    });
    if (current >= 0) renderStage();
  }

  function openStage(i) { current = i; openWhy = {}; $("home").classList.add("hidden"); $("stageView").classList.remove("hidden"); renderStage(); window.scrollTo(0, 0); }
  function closeStage() { current = -1; $("stageView").classList.add("hidden"); $("home").classList.remove("hidden"); render(); window.scrollTo(0, 0); }

  function renderStage() {
    var i = current, st = STAGES[i], d = doneOf(i), comp = stageComplete(i);
    $("sTitle").textContent = t("stage") + " " + (i + 1) + ": " + st[lang];
    $("sSub").textContent = st[lang + "Sub"];
    $("sPick").textContent = comp ? t("pickDone") : t("pick").replace("{d}", d.length);
    $("sBar").style.width = (Math.min(d.length, NEED) / NEED * 100) + "%";
    var box = $("tasks"); box.innerHTML = "";
    st.tasks.forEach(function (tk, j) {
      var isDone = d.indexOf(j) !== -1, off = comp && !isDone;
      var c = document.createElement("article");
      c.className = "task" + (isDone ? " done" : "") + (off ? " off" : "");
      var dm = DOMAINS[tk.d];
      c.innerHTML = '<span class="chip"></span><h3></h3><p></p><div class="why hidden"></div><div class="row"><button class="link"></button><button class="btn"></button></div>';
      c.querySelector(".chip").textContent = dm.icon + " " + dm[lang];
      c.querySelector("h3").textContent = tk[lang];
      c.querySelector("p").textContent = tk[lang + "S"];
      var why = c.querySelector(".why"); why.textContent = tk[lang + "W"];
      var wl = c.querySelector(".link");
      if (openWhy[j]) why.classList.remove("hidden");
      wl.textContent = openWhy[j] ? t("whyHide") : t("why");
      wl.addEventListener("click", function () { openWhy[j] = !openWhy[j]; renderStage(); });
      var b = c.querySelector(".btn");
      if (isDone) { b.textContent = comp ? t("did") : t("did") + " · " + t("undo"); b.disabled = comp; }
      else { b.textContent = t("doIt"); b.className = "btn gold"; b.disabled = off; }
      b.addEventListener("click", function () { toggle(i, j); });
      box.appendChild(c);
    });
  }

  function toggle(i, j) {
    var d = doneOf(i).slice(), k = d.indexOf(j);
    if (stageComplete(i)) return;
    if (k !== -1) d.splice(k, 1); else d.push(j);
    S.done[i] = d; save(); render();
    if (stageComplete(i)) {
      if (points() >= TOTAL) celebrate(true);
      else celebrate(false);
    }
  }

  var nextAfter = false;
  function celebrate(all) {
    $("mIcon").textContent = all ? "🏆" : "⭐";
    $("mTitle").textContent = all ? t("allDoneT") : t("stageDoneT");
    $("mText").textContent = all ? t("allDoneP") : t("stageDoneP");
    $("mBtn").textContent = all ? t("great") : t("next");
    nextAfter = !all;
    $("modal").classList.remove("hidden");
    confetti(all ? 180 : 70);
  }
  $("mBtn").addEventListener("click", function () {
    $("modal").classList.add("hidden"); stopConfetti();
    if (nextAfter && current + 1 < STAGES.length) openStage(current + 1); else closeStage();
  });

  var raf = 0;
  function stopConfetti() { cancelAnimationFrame(raf); var cv = $("confetti"); cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); }
  function confetti(n) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var cv = $("confetti"), ctx = cv.getContext("2d"), W = cv.width = innerWidth, H = cv.height = innerHeight;
    var cols = ["#f3cf6b", "#ffe7a3", "#ffffff", "#8fb0ff", "#2c5cff"], ps = [];
    for (var i = 0; i < n; i++) ps.push({ x: Math.random() * W, y: -Math.random() * H * .6, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, r: 3 + Math.random() * 4, a: Math.random() * 6, c: cols[i % cols.length] });
    var t0 = performance.now();
    (function step(now) {
      ctx.clearRect(0, 0, W, H);
      ps.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.a += .1; ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore(); });
      if (now - t0 < 4000) raf = requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
    })(t0);
  }

  $("backBtn").addEventListener("click", closeStage);
  $("langBtn").addEventListener("click", function () { lang = lang === "he" ? "en" : "he"; S.lang = lang; save(); applyLang(); });
  $("resetBtn").addEventListener("click", function () { if (confirm(t("resetQ"))) { S.done = {}; save(); closeStage(); } });

  function instHint() { var ua = navigator.userAgent; var k = /iPhone|iPad|iPod/.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "desktop"; return INST[lang][k]; }
  var instDeferred = null;
  function standalone() { return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; }
  if (standalone()) $("installBtn").classList.add("hidden");
  addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); instDeferred = e; });
  addEventListener("appinstalled", function () { instDeferred = null; $("installBtn").classList.add("hidden"); $("installHint").classList.add("hidden"); });
  $("installBtn").addEventListener("click", function () {
    if (instDeferred) { var d = instDeferred; instDeferred = null; try { d.prompt(); return; } catch (e) {} }
    var h = $("installHint"); h.innerHTML = instHint(); h.classList.toggle("hidden");
  });
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});

  applyLang();
})();
