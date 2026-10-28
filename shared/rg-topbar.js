/* One top bar, identical on every page of the site (home, public apps, private my/ apps).
   Order (start → end, RTL in Hebrew): Home · account · background · light/night · display size (zoom) · language (globe menu).
   Display size: 75–150%, saved on this device in localStorage "rg-zoom" (CSS zoom on <html>); pages also apply it from a
   one-line script in <head> so there is no jump on load.
   It never adds features: each button only clicks the page's own control (hidden), and a control the page
   doesn't have is shown dimmed. The account chip is the shared rg-account.js one (loaded here if the page lacks it).
   Usage: <script src=".../shared/rg-topbar.js" data-slot="header.top" [data-where="before|prepend"] [data-home="1"] defer></script>
   data-slot: the page's old top-bar container; the new bar goes before it (or inside it, first, with data-where="prepend").
   The old container is hidden once nothing visible is left in it. */
(function () {
  var me = document.currentScript || document.querySelector('script[src*="rg-topbar.js"]');
  var ds = (me && me.dataset) || {}, ROOT = new URL("../", me ? me.src : location.href).href;
  var SLOT = ds.slot || "header.top", WHERE = ds.where || "before", IS_HOME = ds.home === "1", PIN = ds.pin === "1"; // data-pin="1": pinned to the top of the slot (game overlays)
  var d = document.documentElement;
  var ZOOMS = [75, 90, 100, 110, 125, 150], ZKEY = "rg-zoom";
  function getZoom() { var z = 100; try { z = parseInt(localStorage.getItem(ZKEY), 10) || 100; } catch (e) {} return ZOOMS.indexOf(z) < 0 ? 100 : z; }
  function applyZoom(z) { d.style.zoom = z === 100 ? "" : String(z / 100); }
  applyZoom(getZoom());
  function $(s, r) { try { return (r || document).querySelector(s); } catch (e) { return null; } }
  function he() { return (d.lang || "he").slice(0, 2) !== "en"; }
  var SVG = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
    bg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="14.5" cy="7" r="1.2" fill="currentColor"/><circle cx="17.2" cy="10.6" r="1.2" fill="currentColor"/></svg>',
    sun: '<svg class="rgtb-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9s1.3-6.3 3.8-9z"/></svg>',
    zoom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.4 15.4L21 21M10.5 7.8v5.4M7.8 10.5h5.4"/></svg>',
    moon: '<svg class="rgtb-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
  };
  var T = {
    he: { home: "דף הבית", bg: "בחירת רקע", theme: "מעבר בין מצב לילה ליום", na: "לא זמין באפליקציה הזו", lang: "שפה", zoom: "גודל תצוגה" },
    en: { home: "Home", bg: "Choose background", theme: "Switch night / day", na: "Not available in this app", lang: "Language", zoom: "Display size" }
  };
  var CSS =
    ".rgtb{pointer-events:auto;display:flex;align-items:center;gap:6px;flex-wrap:nowrap;min-height:40px;margin:0 0 10px;position:relative;z-index:20;font-family:Heebo,system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:14px;line-height:1;text-align:start}" +
    ".rgtb-tools{display:flex;align-items:center;gap:6px;margin-inline-start:auto;min-width:0;flex-wrap:nowrap}" +
    ".rgtb-tools>*{flex:none}.rgtb-tools>.rgtb-acct{flex:0 1 auto;min-width:0;display:inline-flex}" +
    ".rgtb .rgacc-btn{max-width:104px;height:38px;padding-block:0;padding-inline:10px}" +
    ".rgtb-b{flex:none;box-sizing:border-box;width:38px;height:38px;margin:0;padding:0;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;text-decoration:none;" +
    "color:#eef2ff;background:rgba(11,26,63,.58);border:1px solid rgba(227,189,91,.45);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);-webkit-tap-highlight-color:transparent}" +
    ".rgtb-b svg{width:19px;height:19px;display:block}.rgtb-b:hover{border-color:#e3bd5b}" +
    ".rgtb-b[aria-current=page]{color:#fff6dc;background:linear-gradient(180deg,#1d4fb8,#143a8c);border-color:rgba(227,189,91,.85)}" +
    ".rgtb-b[aria-disabled=true]{opacity:.38;cursor:default}" +
    ".rgtb-moon{display:none!important}html[data-theme=light] .rgtb-moon{display:block!important}html[data-theme=light] .rgtb-sun{display:none!important}" +
    ".rgtb-dd{flex:none;position:relative;display:inline-flex}" +
    ".rgtb-dd>.rgtb-b{width:auto;min-width:38px;border-radius:999px;gap:3px;padding-inline:9px;font:600 13px Heebo,system-ui,sans-serif;color:#eef2ff}" +
    ".rgtb-zoom>.rgtb-b{padding-inline:0;width:38px}" +
    ".rgtb-dd>.rgtb-b svg{width:17px;height:17px}.rgtb-lang .rgtb-lab{color:#e3bd5b}" +
    ".rgtb-menu{position:absolute;top:calc(100% + 6px);inset-inline-end:0;z-index:70;min-width:96px;margin:0;padding:5px;list-style:none;box-sizing:border-box;border-radius:14px;background:rgba(11,26,63,.96);border:1px solid rgba(227,189,91,.55);box-shadow:0 10px 28px rgba(0,0,0,.4)}" +
    ".rgtb-menu[hidden]{display:none}" +
    ".rgtb-menu button{display:block;width:100%;box-sizing:border-box;margin:0;padding:9px 12px;border:0;border-radius:10px;background:none;color:#eef2ff;font:600 14px Heebo,system-ui,sans-serif;text-align:start;white-space:nowrap;cursor:pointer}" +
    ".rgtb-menu button:hover,.rgtb-menu button:focus-visible{background:rgba(227,189,91,.16);outline:none}" +
    ".rgtb-menu button[aria-checked=true]{background:#e3bd5b;color:#0b1f4d}" +
    ".rgtb-zoom .rgtb-menu button{direction:ltr;text-align:center}" +
    "html[data-theme=light] .rgtb-menu{background:rgba(255,255,255,.98);border-color:rgba(184,137,43,.6);box-shadow:0 10px 28px rgba(11,31,77,.2)}" +
    "html[data-theme=light] .rgtb-menu button{color:#0b2a6b}html[data-theme=light] .rgtb-menu button[aria-checked=true]{background:#e3bd5b;color:#0b1f4d}" +
    "html[data-theme=light] .rgtb-dd>.rgtb-b{color:#0b2a6b}html[data-theme=light] .rgtb-lang .rgtb-lab{color:#8a6414}" +
    "html[data-theme=light] .rgtb-b{color:#0b2a6b;background:rgba(255,255,255,.86);border-color:rgba(184,137,43,.55)}" +
    "html[data-theme=light] .rgtb-b[aria-current=page]{color:#fff6dc;background:linear-gradient(180deg,#1d4fb8,#143a8c)}" +
    ".rgtb-pin{z-index:60;position:absolute;top:max(12px,env(safe-area-inset-top));left:16px;right:16px;margin:0}" +
    "html .rgtb-orig.rgtb-orig.rgtb-orig{display:none!important}" +
    "@media (max-width:360px){.rgtb,.rgtb-tools{gap:4px}.rgtb-b{width:34px;height:34px}.rgtb .rgacc-btn{max-width:88px}.rgtb-dd>.rgtb-b{min-width:34px;padding-inline:7px}.rgtb-zoom>.rgtb-b{width:34px;padding-inline:0}}";

  // the page's own controls (first match wins); delegates look them up at click time
  var FIND = {
    bg: "#bg-btn, #rgbg-btn",
    theme: "#theme-btn, #themeBtn",
    langHe: "#lang-he, .top .langs #he",
    langEn: "#lang-en, .top .langs #en",
    langSel: "select#lang-sel",
    langTog: "#langBtn"
  };
  function langOrig() {
    var h = $(FIND.langHe), e = $(FIND.langEn), s = $(FIND.langSel), t = $(FIND.langTog);
    if (h && e) return { kind: "pair", h: h, e: e, hide: [h.closest(".lang, .langs") || h, h.closest(".lang, .langs") ? null : e] };
    if (s) return { kind: "sel", s: s, hide: [s.closest(".langsel") || s] };
    if (t) return { kind: "tog", t: t, hide: [t] };
    return null;
  }
  function setLang(to) {
    var o = langOrig(); if (!o) return;
    if (o.kind === "pair") (to === "en" ? o.e : o.h).click();
    else if (o.kind === "sel") { if (o.s.value !== to) { o.s.value = to; o.s.dispatchEvent(new Event("input", { bubbles: true })); o.s.dispatchEvent(new Event("change", { bubbles: true })); } }
    else if ((he() ? "he" : "en") !== to) o.t.click();
    setTimeout(paint, 0);
  }

  var bar, bHome, bBg, bTheme, gLang, bLang, lHe, lEn, gZoom, bZoom, zItems = [], acct, slotEl;
  function mk(tag, cls, html) { var x = document.createElement(tag); if (cls) x.className = cls; if (html) x.innerHTML = html; return x; }
  function build() {
    if (!document.getElementById("rgtb-css")) { var st = mk("style"); st.id = "rgtb-css"; st.textContent = CSS; (document.head || d).appendChild(st); }
    slotEl = $(SLOT);
    bar = mk("div", "rgtb" + (PIN ? " rgtb-pin" : "")); bar.setAttribute("role", "toolbar");
    bHome = mk("a", "rgtb-b rgtb-home", SVG.home);
    if (IS_HOME) { bHome.href = "#top"; bHome.setAttribute("aria-current", "page"); bHome.addEventListener("click", function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }); }
    else bHome.href = ROOT + "index.html";
    var tools = mk("div", "rgtb-tools");
    acct = document.querySelector("[data-rg-account]");
    var needAcct = !acct;
    if (!acct) { acct = mk("span"); acct.setAttribute("data-rg-account", ""); }
    acct.classList.add("rgtb-acct");
    bBg = mk("button", "rgtb-b rgtb-bg", SVG.bg); bBg.type = "button";
    bBg.addEventListener("click", function () { var o = $(FIND.bg); if (o) o.click(); });
    bTheme = mk("button", "rgtb-b rgtb-theme", SVG.sun + SVG.moon); bTheme.type = "button";
    bTheme.addEventListener("click", function () { var o = $(FIND.theme); if (o) o.click(); setTimeout(paint, 0); });
    // display size (zoom) menu
    gZoom = mk("div", "rgtb-dd rgtb-zoom");
    bZoom = mk("button", "rgtb-b", SVG.zoom); bZoom.type = "button";
    var zm = mk("div", "rgtb-menu"); zm.setAttribute("role", "menu"); zm.hidden = true;
    ZOOMS.forEach(function (z) {
      var it = mk("button"); it.type = "button"; it.setAttribute("role", "menuitemradio"); it.textContent = z + "%"; it.dataset.z = z;
      it.addEventListener("click", function () { try { localStorage.setItem(ZKEY, String(z)); } catch (e) {} applyZoom(z); closeMenus(); paint(); fitBar(); });
      zItems.push(it); zm.appendChild(it);
    });
    gZoom.appendChild(bZoom); gZoom.appendChild(zm);
    bZoom.addEventListener("click", function (e) { e.stopPropagation(); toggleMenu(gZoom); });
    // language menu
    gLang = mk("div", "rgtb-dd rgtb-lang");
    bLang = mk("button", "rgtb-b", SVG.globe + '<span class="rgtb-lab"></span>'); bLang.type = "button";
    var lm = mk("div", "rgtb-menu"); lm.setAttribute("role", "menu"); lm.hidden = true;
    lHe = mk("button"); lHe.type = "button"; lHe.setAttribute("role", "menuitemradio"); lHe.textContent = "עברית"; lHe.lang = "he"; lHe.dir = "rtl";
    lEn = mk("button"); lEn.type = "button"; lEn.setAttribute("role", "menuitemradio"); lEn.textContent = "English"; lEn.lang = "en"; lEn.dir = "ltr";
    lHe.addEventListener("click", function () { closeMenus(); setLang("he"); });
    lEn.addEventListener("click", function () { closeMenus(); setLang("en"); });
    lm.appendChild(lHe); lm.appendChild(lEn);
    gLang.appendChild(bLang); gLang.appendChild(lm);
    bLang.addEventListener("click", function (e) { e.stopPropagation(); if (bLang.getAttribute("aria-disabled") === "true") return; toggleMenu(gLang); });
    [bZoom, bLang].forEach(function (b) { b.setAttribute("aria-haspopup", "menu"); b.setAttribute("aria-expanded", "false"); });
    document.addEventListener("click", function (e) { if (!gZoom.contains(e.target) && !gLang.contains(e.target)) closeMenus(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenus(); });
    tools.appendChild(acct); tools.appendChild(bBg); tools.appendChild(bTheme); tools.appendChild(gZoom); tools.appendChild(gLang);
    bar.appendChild(bHome); bar.appendChild(tools);
    if (slotEl && WHERE === "prepend") slotEl.insertBefore(bar, slotEl.firstChild);
    else if (slotEl) slotEl.parentNode.insertBefore(bar, slotEl);
    else document.body.insertBefore(bar, document.body.firstChild);
    if (needAcct) {
      if (window.RGAccount && RGAccount.mount) { try { RGAccount.mount(acct); } catch (e) {} }
      else if (!document.querySelector('script[src*="rg-account.js"]')) { var s = mk("script"); s.src = ROOT + "shared/rg-account.js"; document.body.appendChild(s); }
    }
  }
  // Large display sizes on a narrow phone: shrink only the bar (never below what fits), so no button gets squeezed or lost.
  var fitting = false;
  function fitBar() {
    if (!bar || fitting) return;
    fitting = true;
    try {
      bar.style.zoom = "";
      var cs = getComputedStyle(bar), gap = parseFloat(cs.columnGap) || 6, need = bHome.offsetWidth, n = 0;
      var tools = bar.lastChild;
      Array.prototype.forEach.call(tools.children, function (c) { if (c.offsetWidth || c.offsetHeight) { need += (c === acct ? Math.max(c.offsetWidth, c.scrollWidth) : c.offsetWidth); n++; } });
      need += gap * n; // home↔tools + between tools children (approx.)
      var avail = bar.clientWidth;
      if (avail > 0 && need > avail + 1) bar.style.zoom = String(Math.max(0.5, Math.floor(avail / need * 100) / 100));
    } catch (e) {}
    fitting = false;
  }
  function closeMenus(except) {
    [gZoom, gLang].forEach(function (g) { if (!g || g === except) return; g.lastChild.hidden = true; g.firstChild.setAttribute("aria-expanded", "false"); });
  }
  function toggleMenu(g) {
    var m = g.lastChild, open = m.hidden;
    closeMenus(g); m.hidden = !open; g.firstChild.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function hide(el) { if (el && !bar.contains(el)) el.classList.add("rgtb-orig"); }
  function visibleKids(el) {
    for (var i = 0; i < el.children.length; i++) {
      var c = el.children[i];
      if (c === bar || c.tagName === "SCRIPT" || c.tagName === "STYLE") continue;
      if (c.offsetWidth > 0 || c.offsetHeight > 0) return true;
    }
    return false;
  }
  function paint() {
    if (!bar) return;
    var L = T[he() ? "he" : "en"];
    bHome.setAttribute("aria-label", L.home); bHome.title = L.home;
    var hasBg = !!$(FIND.bg), hasTh = !!$(FIND.theme), lo = langOrig();
    bBg.setAttribute("aria-label", hasBg ? L.bg : L.bg + " · " + L.na); bBg.title = hasBg ? L.bg : L.na;
    bBg.setAttribute("aria-disabled", hasBg ? "false" : "true");
    bTheme.setAttribute("aria-label", hasTh ? L.theme : L.theme + " · " + L.na); bTheme.title = hasTh ? L.theme : L.na;
    bTheme.setAttribute("aria-disabled", hasTh ? "false" : "true");
    bLang.setAttribute("aria-label", L.lang + (lo ? "" : " · " + L.na)); bLang.title = lo ? L.lang : L.na;
    bLang.setAttribute("aria-disabled", lo ? "false" : "true");
    bLang.lastChild.textContent = he() ? "עב" : "EN";
    lHe.setAttribute("aria-checked", he() ? "true" : "false"); lEn.setAttribute("aria-checked", he() ? "false" : "true");
    var z = getZoom();
    bZoom.setAttribute("aria-label", L.zoom + ": " + z + "%"); bZoom.title = L.zoom + " · " + z + "%";
    zItems.forEach(function (it) { it.setAttribute("aria-checked", +it.dataset.z === z ? "true" : "false"); });
  }
  function sweep() {
    if (!bar) return;
    hide($(FIND.bg)); hide($(FIND.theme));
    var lo = langOrig(); if (lo) lo.hide.forEach(hide);
    if (slotEl) {
      Array.prototype.forEach.call(slotEl.querySelectorAll("a.back, #back"), hide);
      var br = slotEl.nextElementSibling; if (br && br.classList.contains("backrow")) hide(br);
      var pb = slotEl.parentNode && slotEl.parentNode.querySelector(":scope > .backrow"); if (pb) hide(pb);
      // empty wrappers inside the old bar (e.g. .tools), then the old bar itself
      Array.prototype.forEach.call(slotEl.querySelectorAll(".tools, .langs, .lang, span, div"), function (w) { if (!bar.contains(w) && w.querySelector(".rgtb-orig") && !visibleKids(w)) hide(w); });
      if (WHERE !== "prepend" && !visibleKids(slotEl)) hide(slotEl);
    }
    paint(); fitBar();
  }
  function init() {
    if (bar) return;
    build(); sweep();
    try { new MutationObserver(function () { paint(); }).observe(d, { attributes: true, attributeFilter: ["lang", "data-theme"] }); } catch (e) {}
    // controls injected later (rg-bg.js picker, app scripts): keep sweeping for a few seconds
    var n = 0, iv = setInterval(function () { sweep(); if (++n > 20) clearInterval(iv); }, 200);
    window.addEventListener("load", sweep);
    window.addEventListener("resize", fitBar);
    try { var ro = new ResizeObserver(function () { requestAnimationFrame(fitBar); }); ro.observe(acct); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(init, 0); });
  else setTimeout(init, 0);
})();
