/* rg-bg.js: the landing page's background picker for every app (night + light, each mode remembers its own choice).
   Usage (in <head>, after the app's own theme script):
     <script src="../shared/rg-bg.js" data-app="healify" data-slot=".tools" data-before="#theme-btn"></script>
   Keys: rg-<app>-bg (night) and rg-<app>-bg-light (light); 0 = the app's original look (default), 1-10 = presets.
   Mode = html[data-theme="light"] ? light : night (apps without a light mode are always night).
   Account sync: add RGBg.keys to the app's RGAccount.syncPrefs list and call RGBg.apply(changes) in its callback
   (it handles + removes its own keys and returns true when nothing else is left).
   Apps without their own light/night switch add data-theme-key="rg-<app>-theme": this file then sets html[data-theme]
   before first paint (night = default) and puts a sun/moon toggle next to the picker; the app supplies the light CSS. */
(function () {
  "use strict";
  var me = document.currentScript, d = document.documentElement, ds = (me && me.dataset) || {};
  var app = ds.app || "app", slot = ds.slot || "", before = ds.before || "", TK = ds.themeKey || "";
  var NK = "rg-" + app + "-bg", LK = "rg-" + app + "-bg-light";
  var TC = {"1":"#07090f","2":"#e9506a","3":"#1a0c26","4":"#0b4d43","5":"#0a0610","6":"#3a1a0a","7":"#355e3b","8":"#6d1a7e","9":"#1a1416","10":"#14110a"};
  var LTC = {"1":"#e3eeff","2":"#fbf3e2","3":"#ece6ff","4":"#ffe9dc","5":"#f6f4fb","6":"#fff1d8","7":"#e5f4ff","8":"#feebf1","9":"#fdf2dd","10":"#e7eef8"};
  var SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>';
  var MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2z"/></svg>';
  var NAMES = {
    he: { title: "בחירת רקע", close: "סגירה", toLight: "מעבר למצב בהיר", toDark: "מעבר למצב לילה",
      n: ["רקע מקורי", "זוהר צפוני", "שקיעה", "ניאון", "לגונה", "ערפילית", "גחלים", "יער בדמדומים", "פירות יער", "פריזמה", "זהב של חצות"],
      l: ["רקע מקורי", "שמי בוקר", "שמנת וזהב", "לבנדר", "אפרסק", "פנינה", "זריחה", "בריזה", "קוורץ ורוד", "שעת זהב", "עננים"] },
    en: { title: "Choose background", close: "Close", toLight: "Switch to light mode", toDark: "Switch to night mode",
      n: ["Original", "Aurora", "Sunset", "Neon mesh", "Lagoon", "Nebula", "Ember", "Forest dusk", "Berry swirl", "Prism", "Midnight gold"],
      l: ["Original", "Morning sky", "Cream & gold", "Lavender", "Peach", "Pearl", "Sunrise", "Sea breeze", "Rose quartz", "Golden hour", "Clouds"] }
  };
  function ok(v) { return /^([0-9]|10)$/.test(v || "") ? String(v) : "0"; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var nb = ok(lsGet(NK)), lb = ok(lsGet(LK));
  var TCOL = { dark: ds.darkColor || "", light: ds.lightColor || "#f3efe6" };
  if (TK) d.setAttribute("data-theme", lsGet(TK) === "light" ? "light" : "dark");
  (function () { var m = document.querySelector('meta[name="theme-color"]'); if (m && !TCOL.dark) TCOL.dark = m.getAttribute("content"); })();
  function light() { return d.getAttribute("data-theme") === "light"; }
  function cur() { return light() ? lb : nb; }
  function lang() { return (d.lang || "").slice(0, 2) === "en" ? "en" : "he"; }
  function paint() {
    d.setAttribute("data-rgbg", nb); d.setAttribute("data-rglbg", lb);
    var c = cur(), m = document.querySelector('meta[name="theme-color"]');
    if (!m) return;
    if (c !== "0") m.setAttribute("content", (light() ? LTC : TC)[c]);
    else if (TK) { if (!TCOL.dark) TCOL.dark = m.getAttribute("content") || "#0f172a"; m.setAttribute("content", light() ? TCOL.light : TCOL.dark); }
  }
  /* ---- CSS (same presets + sheet as the landing page) ---- */
  var css = ":root{--rgbgi-1:radial-gradient(60% 45% at 15% 10%,rgba(0,214,170,.55),transparent 70%),radial-gradient(55% 40% at 85% 25%,rgba(126,87,255,.55),transparent 70%),radial-gradient(70% 50% at 50% 95%,rgba(0,170,120,.45),transparent 70%);--rgbgc-1:#07090f;--rgbgi-2:linear-gradient(165deg,#ff5f6d 0%,#c2185b 30%,#6a1b9a 62%,#2a0a2e 100%);--rgbgc-2:#2a0a2e;--rgbgi-3:radial-gradient(45% 35% at 10% 15%,#ff2e93 0,transparent 70%),radial-gradient(45% 35% at 90% 40%,#00e5ff 0,transparent 70%),radial-gradient(50% 40% at 30% 85%,#8a2be2 0,transparent 70%);--rgbgc-3:#120a1f;--rgbgi-4:radial-gradient(55% 40% at 80% 10%,rgba(170,255,120,.45),transparent 70%),radial-gradient(60% 50% at 10% 60%,rgba(0,200,190,.55),transparent 70%),linear-gradient(180deg,#0b4d43 0%,#063a33 50%,#03201c 100%);--rgbgc-4:#03201c;--rgbgi-5:radial-gradient(40% 30% at 70% 12%,rgba(255,120,200,.6),transparent 70%),radial-gradient(55% 40% at 20% 45%,rgba(140,60,255,.55),transparent 70%),radial-gradient(35% 25% at 80% 80%,rgba(255,190,90,.45),transparent 70%);--rgbgc-5:#050308;--rgbgi-6:radial-gradient(60% 40% at 50% 0%,rgba(255,140,40,.65),transparent 70%),radial-gradient(45% 35% at 0% 60%,rgba(220,40,40,.5),transparent 70%),radial-gradient(45% 35% at 100% 85%,rgba(255,200,60,.4),transparent 70%);--rgbgc-6:#140b08;--rgbgi-7:radial-gradient(60% 45% at 90% 5%,rgba(255,180,70,.5),transparent 70%),linear-gradient(170deg,#355e3b 0%,#1f3d2a 45%,#0c1a10 100%);--rgbgc-7:#0c1a10;--rgbgi-8:radial-gradient(circle at 50% 40%,transparent 0,rgba(27,8,32,.55) 75%),conic-gradient(from 210deg at 60% 35%,#7b1fa2,#d81b60,#ff7043,#8e24aa,#4a148c,#7b1fa2);--rgbgc-8:#1b0820;--rgbgi-9:radial-gradient(30% 22% at 12% 8%,rgba(255,80,80,.5),transparent 70%),radial-gradient(30% 22% at 88% 22%,rgba(255,200,0,.45),transparent 70%),radial-gradient(32% 24% at 15% 50%,rgba(0,220,130,.4),transparent 70%),radial-gradient(32% 24% at 85% 68%,rgba(0,170,255,.42),transparent 70%),radial-gradient(32% 24% at 30% 92%,rgba(190,80,255,.45),transparent 70%);--rgbgc-9:#121214;--rgbgi-10:radial-gradient(50% 35% at 85% 8%,rgba(212,175,55,.55),transparent 70%),radial-gradient(45% 35% at 5% 55%,rgba(184,92,56,.45),transparent 70%),radial-gradient(45% 35% at 80% 95%,rgba(0,150,140,.4),transparent 70%);--rgbgc-10:#0a0a0a;}:root{--rglbgi-1: linear-gradient(180deg,#eef5ff 0%,#d6e6ff 55%,#c2d8fb 100%); --rglbgc-1: #c2d8fb; --rglbgi-2: radial-gradient(70% 50% at 85% 0%,rgba(245,197,66,.42),transparent 70%),linear-gradient(180deg,#fffaee 0%,#f6ecd6 100%); --rglbgc-2: #f6ecd6; --rglbgi-3: linear-gradient(165deg,#f4f0ff 0%,#e6defd 55%,#d9cff7 100%); --rglbgc-3: #d9cff7; --rglbgi-4: linear-gradient(170deg,#fff4ec 0%,#ffe1cf 60%,#fdd2bc 100%); --rglbgc-4: #fdd2bc; --rglbgi-5: radial-gradient(60% 45% at 15% 10%,rgba(255,214,231,.85),transparent 70%),radial-gradient(55% 40% at 85% 35%,rgba(204,226,255,.9),transparent 70%),radial-gradient(50% 40% at 40% 90%,rgba(232,220,255,.85),transparent 70%),linear-gradient(180deg,#fbfaff 0%,#f1f0f8 100%); --rglbgc-5: #f1f0f8; --rglbgi-6: linear-gradient(180deg,#fff5d9 0%,#ffe3c6 45%,#f9d6e2 100%); --rglbgc-6: #f9d6e2; --rglbgi-7: linear-gradient(160deg,#eef8ff 0%,#d3ecfc 50%,#c1dbf7 100%); --rglbgc-7: #c1dbf7; --rglbgi-8: linear-gradient(170deg,#fff2f6 0%,#fbdfe9 55%,#f0d3e8 100%); --rglbgc-8: #f0d3e8; --rglbgi-9: radial-gradient(60% 45% at 80% 5%,rgba(255,200,90,.5),transparent 70%),radial-gradient(55% 40% at 10% 70%,rgba(176,198,255,.45),transparent 70%),linear-gradient(180deg,#fff9ec 0%,#f3ead8 100%); --rglbgc-9: #f3ead8; --rglbgi-10: radial-gradient(50% 32% at 20% 14%,#ffffff 0%,transparent 70%),radial-gradient(55% 34% at 82% 46%,rgba(255,255,255,.95) 0%,transparent 70%),radial-gradient(45% 30% at 30% 82%,rgba(255,255,255,.85) 0%,transparent 70%),linear-gradient(180deg,#e7eef8 0%,#d5dfee 100%); --rglbgc-10: #d5dfee;}";
  for (var i = 1; i <= 10; i++) {
    css += 'html:not([data-theme="light"])[data-rgbg="' + i + '"] body{background:var(--rgbgi-' + i + '),var(--rgbgc-' + i + ') !important;background-attachment:fixed !important}';
    css += 'html:not([data-theme="light"])[data-rgbg="' + i + '"]{background:var(--rgbgc-' + i + ') !important}';
    css += 'html[data-theme="light"][data-rglbg="' + i + '"] body{background:var(--rglbgi-' + i + '),var(--rglbgc-' + i + ') !important;background-attachment:fixed !important}';
    css += 'html[data-theme="light"][data-rglbg="' + i + '"]{background:var(--rglbgc-' + i + ') !important}';
  }
  css += '.rgbg-btn{display:inline-flex;align-items:center;justify-content:center;flex:none;width:36px;height:36px;padding:0;margin:0;border-radius:999px;cursor:pointer;color:#f1edf8;background:rgba(12,10,24,.45);border:1px solid rgba(255,255,255,.2);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);font:inherit}' +
    '.rgbg-btn svg{width:18px;height:18px}' +
    '.rgbg-btn:hover{border-color:rgba(227,189,91,.85)}' +
    '.rgbg-btn:focus-visible{outline:3px solid rgba(227,189,91,.7);outline-offset:2px}' +
    'html[data-theme="light"] .rgbg-btn{color:#0b2a6b;background:rgba(255,255,255,.82);border-color:rgba(11,42,107,.18)}' +
    '.rgbg-back{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:1000;display:flex;align-items:flex-end;justify-content:center}' +
    '.rgbg-back[hidden]{display:none}' +
    '.rgbg-sheet{width:100%;max-width:520px;background:rgba(20,14,30,.9);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);color:#fff;border:1px solid rgba(255,255,255,.14);border-bottom:0;border-radius:20px 20px 0 0;padding:14px 16px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -10px 40px rgba(0,0,0,.4);animation:rgbgup .25s ease-out;text-align:start;box-sizing:border-box;max-height:92vh;overflow-y:auto}' +
    '@keyframes rgbgup{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}' +
    '.rgbg-sheet .grab{width:42px;height:5px;border-radius:9px;background:rgba(255,255,255,.3);margin:0 auto 10px}' +
    '.rgbg-sheet .hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}' +
    '.rgbg-sheet h2{margin:0;font-size:18px;font-weight:800;color:inherit}' +
    '.rgbg-sheet .x{background:none;border:0;color:#ddd;font-size:26px;line-height:1;padding:2px 8px;cursor:pointer}' +
    '.rgbg-sws{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}' +
    '@media (min-width:440px){.rgbg-sws{grid-template-columns:repeat(6,1fr)}}' +
    '.rgbg-sw{border:0;background:none;padding:0;color:#e9e4f3;font-size:12px;font-weight:600;text-align:center;cursor:pointer;font-family:inherit}' +
    '.rgbg-sw .pv{position:relative;display:block;aspect-ratio:3/4;border-radius:12px;border:2px solid rgba(255,255,255,.18);overflow:hidden}' +
    '.rgbg-sw .num{position:absolute;top:5px;inset-inline-start:5px;min-width:22px;height:22px;border-radius:11px;background:rgba(0,0,0,.55);color:#fff;font-size:12.5px;font-weight:800;line-height:22px;padding:0 5px;box-sizing:border-box}' +
    '.rgbg-sw[aria-pressed="true"] .pv{border-color:#fff;outline:3px solid rgba(255,214,160,.75);outline-offset:1px}' +
    '.rgbg-sw[aria-pressed="true"] .pv::after{content:"✓";position:absolute;bottom:5px;inset-inline-end:6px;width:22px;height:22px;border-radius:50%;background:#fff;color:#2a0a2e;font-size:13px;font-weight:800;line-height:22px}' +
    '.rgbg-sw:focus-visible{outline:none}.rgbg-sw:focus-visible .pv{outline:3px solid rgba(255,214,160,.8);outline-offset:2px}' +
    '.rgbg-sw .nm{display:block;margin-top:5px;line-height:1.25}' +
    'html[data-theme="light"] .rgbg-sheet{background:rgba(255,253,248,.94);color:#0b1f4d;border-color:rgba(11,42,107,.14);box-shadow:0 -10px 40px rgba(11,31,77,.18)}' +
    'html[data-theme="light"] .rgbg-sheet .grab{background:rgba(11,42,107,.25)}' +
    'html[data-theme="light"] .rgbg-sheet .x{color:#22396b}' +
    'html[data-theme="light"] .rgbg-sw{color:#22396b}' +
    'html[data-theme="light"] .rgbg-sw .pv{border-color:rgba(11,42,107,.18)}' +
    'html[data-theme="light"] .rgbg-sw[aria-pressed="true"] .pv{border-color:#0b2a6b;outline-color:rgba(201,162,39,.85)}' +
    'html[data-theme="light"] .rgbg-sw[aria-pressed="true"] .pv::after{background:#0b2a6b;color:#fff}' +
    'html[data-theme="light"] .rgbg-sw .num{background:rgba(11,42,107,.7)}' +
    '@media (prefers-reduced-motion:reduce){.rgbg-sheet{animation:none}}';
  var st = document.createElement("style"); st.id = "rgbg-css"; st.textContent = css;
  (document.head || d).appendChild(st);
  paint();

  /* ---- UI ---- */
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="14.5" cy="7" r="1.2" fill="currentColor"/><circle cx="17.2" cy="10.6" r="1.2" fill="currentColor"/></svg>';
  var btn = null, back = null;
  function origPreview() { // the app's own look for this mode, read with the picked background switched off
    var b = document.body, cs, img, col, out;
    d.setAttribute("data-rgbg", "0"); d.setAttribute("data-rglbg", "0");
    cs = getComputedStyle(b); img = cs.backgroundImage; col = cs.backgroundColor;
    if ((!img || img === "none") && (/rgba\(.*,\s*0\)$/.test(col) || col === "transparent")) { cs = getComputedStyle(d); img = cs.backgroundImage; col = cs.backgroundColor; }
    out = (img && img !== "none" ? img + "," : "") + col;
    d.setAttribute("data-rgbg", nb); d.setAttribute("data-rglbg", lb);
    return out;
  }
  function render() {
    if (!back) return;
    var t = NAMES[lang()], L = light(), c = cur(), names = L ? t.l : t.n, html = "", o = origPreview();
    for (var i = 0; i <= 10; i++) {
      var pv = i === 0 ? o : L ? "var(--rglbgi-" + i + "),var(--rglbgc-" + i + ")" : "var(--rgbgi-" + i + "),var(--rgbgc-" + i + ")";
      html += '<button type="button" class="rgbg-sw" data-i="' + i + '" aria-pressed="' + (String(i) === c ? "true" : "false") + '">' +
        '<span class="pv" style="background:' + pv.replace(/"/g, "'") + '"><span class="num">' + (i === 0 ? "★" : i) + "</span></span>" +
        '<span class="nm">' + names[i] + "</span></button>";
    }
    back.querySelector(".rgbg-sws").innerHTML = html;
    back.querySelector("h2").textContent = t.title;
    back.querySelector(".x").setAttribute("aria-label", t.close);
  }
  var tbtn = null;
  function label() {
    var N = NAMES[lang()];
    if (btn) { btn.setAttribute("aria-label", N.title); btn.title = N.title; }
    if (tbtn) { var L = light(); tbtn.innerHTML = L ? MOON : SUN; tbtn.setAttribute("aria-label", L ? N.toDark : N.toLight); tbtn.title = L ? N.toDark : N.toLight; }
  }
  function setTheme(v) { if (!TK) return; v = v === "light" ? "light" : "dark"; lsSet(TK, v); d.setAttribute("data-theme", v); }
  function set(v, mode) {
    v = ok(v);
    if ((mode || (light() ? "light" : "dark")) === "light") { lb = v; lsSet(LK, v); } else { nb = v; lsSet(NK, v); }
    paint(); render();
  }
  function open() { render(); back.hidden = false; var s = back.querySelector('[aria-pressed="true"]'); if (s) try { s.focus({ preventScroll: true }); } catch (e) {} }
  function close() { if (back && !back.hidden) { back.hidden = true; if (btn) btn.focus(); } }
  function mount() {
    var host = slot ? document.querySelector(slot) : null;
    btn = document.createElement("button");
    btn.type = "button"; btn.className = "rgbg-btn"; btn.id = "rgbg-btn"; btn.setAttribute("aria-haspopup", "dialog"); btn.innerHTML = ICON;
    var ref = before ? document.querySelector(before) : null;
    if (host) { if (ref && ref.parentNode === host) host.insertBefore(btn, ref); else host.appendChild(btn); }
    else { btn.style.cssText = "position:fixed;top:calc(10px + env(safe-area-inset-top));inset-inline-end:10px;z-index:50"; document.body.appendChild(btn); }
    if (TK) { // light/night toggle right after the picker
      tbtn = document.createElement("button");
      tbtn.type = "button"; tbtn.className = "rgbg-btn rgbg-theme"; tbtn.id = "theme-btn";
      btn.parentNode.insertBefore(tbtn, btn.nextSibling);
      tbtn.addEventListener("click", function () { setTheme(light() ? "dark" : "light"); });
    }
    back = document.createElement("div");
    back.className = "rgbg-back"; back.id = "rgbg-sheet"; back.hidden = true;
    back.innerHTML = '<div class="rgbg-sheet" role="dialog" aria-modal="true" aria-labelledby="rgbg-title"><div class="grab"></div><div class="hd"><h2 id="rgbg-title"></h2><button type="button" class="x">×</button></div><div class="rgbg-sws"></div></div>';
    document.body.appendChild(back);
    btn.addEventListener("click", open);
    back.querySelector(".x").addEventListener("click", close);
    back.addEventListener("click", function (e) {
      if (e.target === back) { close(); return; }
      var b = e.target.closest && e.target.closest(".rgbg-sw"); if (b) set(b.getAttribute("data-i"));
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    label();
    // theme or language switched by the app: repaint, keep the right theme-color, relabel, re-render an open sheet
    new MutationObserver(function () { paint(); label(); if (!back.hidden) render(); }).observe(d, { attributes: true, attributeFilter: ["data-theme", "lang"] });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();

  window.RGBg = {
    keys: TK ? [NK, LK, TK] : [NK, LK],
    setTheme: setTheme,
    set: set,
    get: function () { return { night: nb, light: lb }; },
    apply: function (c) { // RGAccount.syncPrefs changes: take ours, leave the rest
      if (!c) return false;
      if (NK in c) { set(c[NK], "dark"); delete c[NK]; }
      if (LK in c) { set(c[LK], "light"); delete c[LK]; }
      if (TK && TK in c) { setTheme(c[TK]); delete c[TK]; }
      return Object.keys(c).length === 0;
    }
  };
})();
