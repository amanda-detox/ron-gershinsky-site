/* One top bar, identical on every page of the site (home, public apps, private my/ apps).
   Order (start → end, RTL in Hebrew): Home · account · background · light/night · language (עב | EN).
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
  function $(s, r) { try { return (r || document).querySelector(s); } catch (e) { return null; } }
  function he() { return (d.lang || "he").slice(0, 2) !== "en"; }
  var SVG = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h5v-6h4v6h5V10"/></svg>',
    bg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.9 1.8-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.8-.5-1.3 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10" cy="7" r="1.2" fill="currentColor"/><circle cx="14.5" cy="7" r="1.2" fill="currentColor"/><circle cx="17.2" cy="10.6" r="1.2" fill="currentColor"/></svg>',
    sun: '<svg class="rgtb-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg class="rgtb-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
  };
  var T = {
    he: { home: "דף הבית", bg: "בחירת רקע", theme: "מעבר בין מצב לילה ליום", na: "לא זמין באפליקציה הזו", lang: "שפה" },
    en: { home: "Home", bg: "Choose background", theme: "Switch night / day", na: "Not available in this app", lang: "Language" }
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
    ".rgtb-lang{flex:none;display:inline-flex;align-items:center;height:38px;box-sizing:border-box;padding:3px;border-radius:999px;background:rgba(11,26,63,.58);border:1px solid rgba(227,189,91,.45);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}" +
    ".rgtb-lang button{font:600 13px Heebo,system-ui,sans-serif;height:30px;min-width:34px;padding:0 9px;margin:0;border:0;border-radius:999px;background:none;color:#c9d4f2;cursor:pointer}" +
    ".rgtb-lang button[aria-pressed=true]{background:#e3bd5b;color:#0b1f4d}" +
    ".rgtb-lang[aria-disabled=true]{opacity:.38}.rgtb-lang[aria-disabled=true] button{cursor:default}" +
    "html[data-theme=light] .rgtb-b,html[data-theme=light] .rgtb-lang{color:#0b2a6b;background:rgba(255,255,255,.86);border-color:rgba(184,137,43,.55)}" +
    "html[data-theme=light] .rgtb-b[aria-current=page]{color:#fff6dc;background:linear-gradient(180deg,#1d4fb8,#143a8c)}" +
    "html[data-theme=light] .rgtb-lang button{color:#3a4a72}html[data-theme=light] .rgtb-lang button[aria-pressed=true]{background:#e3bd5b;color:#0b1f4d}" +
    ".rgtb-pin{z-index:60;position:absolute;top:max(12px,env(safe-area-inset-top));left:16px;right:16px;margin:0}" +
    "html .rgtb-orig.rgtb-orig.rgtb-orig{display:none!important}" +
    "@media (max-width:360px){.rgtb,.rgtb-tools{gap:4px}.rgtb-b{width:34px;height:34px}.rgtb .rgacc-btn{max-width:88px}}";

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

  var bar, bHome, bBg, bTheme, gLang, lHe, lEn, acct, slotEl;
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
    gLang = mk("div", "rgtb-lang"); gLang.setAttribute("role", "group");
    lHe = mk("button"); lHe.type = "button"; lHe.textContent = "עב"; lHe.lang = "he";
    lEn = mk("button"); lEn.type = "button"; lEn.textContent = "EN"; lEn.lang = "en";
    lHe.addEventListener("click", function () { setLang("he"); });
    lEn.addEventListener("click", function () { setLang("en"); });
    gLang.appendChild(lHe); gLang.appendChild(lEn);
    tools.appendChild(acct); tools.appendChild(bBg); tools.appendChild(bTheme); tools.appendChild(gLang);
    bar.appendChild(bHome); bar.appendChild(tools);
    if (slotEl && WHERE === "prepend") slotEl.insertBefore(bar, slotEl.firstChild);
    else if (slotEl) slotEl.parentNode.insertBefore(bar, slotEl);
    else document.body.insertBefore(bar, document.body.firstChild);
    if (needAcct) {
      if (window.RGAccount && RGAccount.mount) { try { RGAccount.mount(acct); } catch (e) {} }
      else if (!document.querySelector('script[src*="rg-account.js"]')) { var s = mk("script"); s.src = ROOT + "shared/rg-account.js"; document.body.appendChild(s); }
    }
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
    gLang.setAttribute("aria-label", L.lang); gLang.setAttribute("aria-disabled", lo ? "false" : "true"); if (!lo) gLang.title = L.na;
    lHe.setAttribute("aria-pressed", he() ? "true" : "false"); lEn.setAttribute("aria-pressed", he() ? "false" : "true");
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
    paint();
  }
  function init() {
    if (bar) return;
    build(); sweep();
    try { new MutationObserver(function () { paint(); }).observe(d, { attributes: true, attributeFilter: ["lang", "data-theme"] }); } catch (e) {}
    // controls injected later (rg-bg.js picker, app scripts): keep sweeping for a few seconds
    var n = 0, iv = setInterval(function () { sweep(); if (++n > 20) clearInterval(iv); }, 200);
    window.addEventListener("load", sweep);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(init, 0); });
  else setTimeout(init, 0);
})();
