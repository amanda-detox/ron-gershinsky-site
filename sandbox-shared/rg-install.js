/* Sandbox install button.
   Calls beforeinstallprompt.prompt() when Chrome offers it.
   Otherwise explains, in Hebrew or English, why the menu cannot install this app:
   the installed היליפיי בע"מ manifest scope covers the whole site, so Chrome
   treats this URL as that app. Standalone (inside that app) never gets a prompt.
   Dismiss keys are chosen by the caller and are not renamed here. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RGInstall = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function fill(text, name) {
    return String(text).replace(/\{name\}/g, name);
  }

  function plan(state) {
    var s = state || {};
    var he = s.lang !== "en";
    var name = s.appName || (he ? "האפליקציה" : "This app");
    if (s.installed) {
      return {
        show: false,
        action: "none",
        text: he
          ? name + " כבר מותקנת על המכשיר. פותחים אותה מהאייקון במסך הבית."
          : name + " is already installed. Open it from the home-screen icon.",
        openInBrowser: false
      };
    }
    if (s.hasPrompt) return { show: true, action: "prompt", text: "", openInBrowser: false };
    var hub = s.underMyHub
      ? (he
        ? " אם מותקנת גם „הפרטי שלי”, הטווח שלה על my/ חוסם את אותה התקנה."
        : " If “My private apps” is installed too, its my/ scope blocks the same install.")
      : "";
    var text;
    if (s.platform === "ios") {
      text = he
        ? "באייפון מתקינים רק מ־Safari: כפתור השיתוף למטה, ואז „הוסף למסך הבית”. Chrome באייפון לא מתקין את {name}."
        : "On iPhone, install only from Safari: the Share button, then “Add to Home Screen”. Chrome on iPhone does not install {name}.";
    } else if (s.standalone) {
      text = he
        ? "{name} לא מקבלת כאן חלון התקנה: הדף רץ בתוך אפליקציה מותקנת (היליפיי בע״מ). הטווח שלה מכסה את כל האתר, ו־Chrome לא מציע התקנה מתוך המסך המלא. פתחו את הכתובת ב־Chrome עצמו, לא מתוך היליפיי, ואז לחצו שוב על התקנה." + hub
        : "{name} cannot show an install dialog here: this page is running inside an installed app (Healify Ltd.). Its scope covers the whole site, so Chrome does not offer install from the full-screen app. Open this address in Chrome itself, then tap install again." + hub;
    } else if (s.platform === "desktop") {
      text = he
        ? "ב־Chrome במחשב: סמל ההתקנה בקצה שורת הכתובת. אם אין סמל, היליפיי בע״מ כבר מותקנת והטווח שלה (/ron-gershinsky-site/) מכסה את הדף, אז אין התקנה נפרדת ל־{name}. הסירו את היליפיי, רעננו, ולחצו כאן שוב." + hub
        : "In Chrome on a computer: the install icon at the end of the address bar. If it is missing, Healify Ltd. is already installed and its scope (/ron-gershinsky-site/) covers this page, so there is no separate install for {name}. Remove Healify, reload, and tap here again." + hub;
    } else {
      text = he
        ? "Chrome לא פותח התקנה ל־{name}. היליפיי בע״מ מותקנת, והטווח שלה (/ron-gershinsky-site/) כולל את הדף הזה, אז הדפדפן חושב שהאפליקציה כבר קיימת. בתפריט ⋮ „פתיחה” שייכת להיליפיי ולא מתקינה את {name}. אם החבילה הישנה נמחקה מהמסך, „פתיחה” לא עושה כלום. כדי להתקין בנפרד: הסירו את היליפיי ממסך הבית, פתחו שוב את הדף ב־Chrome ולחצו התקנה. אם „פתיחה” שותקת: Chrome ← פרטי האתר ← מחקו את נתוני האתר, ואז רעננו." + hub
        : "Chrome is not offering to install {name}. Healify Ltd. is installed, and its scope (/ron-gershinsky-site/) includes this page, so the browser treats the app as already there. In the ⋮ menu, Open belongs to Healify and does not install {name}. If the old package was removed from the home screen, Open does nothing. To install separately: remove Healify from the home screen, open this page in Chrome again, and tap install. If Open stays silent: Chrome → site settings → clear this site’s data, then reload." + hub;
    }
    return { show: true, action: "hint", text: fill(text, name), openInBrowser: !!s.standalone };
  }

  function openHref(absUrl, state) {
    var clean = String(absUrl || "").split("#")[0];
    var s = state || {};
    if (s.standalone && s.platform === "android") {
      var u = new URL(clean);
      return "intent://" + u.host + u.pathname + u.search + "#Intent;scheme=" + u.protocol.replace(":", "") + ";package=com.android.chrome;end";
    }
    return clean;
  }

  function attach(opts) {
    var o = opts || {};
    var doc = document;
    var dp = (typeof window !== "undefined" && window.__rgBip) || null;
    var installed = false;
    var hintOn = false;
    var pageWrap = doc.getElementById(o.pageWrap || "install-wrap");
    var pageBtn = doc.getElementById(o.pageButton || "install-btn");
    var pageHint = doc.getElementById(o.pageHint || "install-hint");
    var fixedWrap = doc.getElementById(o.fixedWrap || "rg-inst-w");
    var fixedBtn = doc.getElementById(o.fixedButton || "rg-inst");
    var fixedHint = doc.getElementById(o.fixedHint || "rg-inst-h");
    var fixedClose = doc.getElementById(o.fixedClose || "rg-inst-x");

    function lang() {
      var l = "";
      try { l = localStorage.getItem("rg-lang") || ""; } catch (e) {}
      if (l !== "en" && l !== "he") l = /^en/i.test(doc.documentElement.lang || "") ? "en" : "he";
      return l;
    }
    function platform() {
      var ua = navigator.userAgent || "";
      var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (ios) return "ios";
      if (/Android/i.test(ua)) return "android";
      return "desktop";
    }
    function standalone() {
      try {
        if (navigator.standalone === true) return true;
        if (!window.matchMedia) return false;
        return ["standalone", "fullscreen", "minimal-ui"].some(function (mode) {
          return window.matchMedia("(display-mode: " + mode + ")").matches;
        });
      } catch (e) { return false; }
    }
    function dismissed() {
      if (!o.dismissKey) return false;
      try { return localStorage.getItem(o.dismissKey) === "1"; } catch (e) { return false; }
    }
    function appName() { return lang() === "en" ? (o.nameEn || "This app") : (o.nameHe || "האפליקציה"); }
    function current(hasPrompt) {
      return plan({
        lang: lang(),
        appName: appName(),
        platform: platform(),
        standalone: standalone(),
        hasPrompt: !!hasPrompt,
        installed: installed,
        underMyHub: !!o.underMyHub
      });
    }
    function label() { return lang() === "en" ? "📲 Install app" : "📲 התקנה למסך הבית"; }
    function closeLabel() { return lang() === "en" ? "Close" : "סגירה"; }
    function writeHint(el, result) {
      if (!el) return;
      el.textContent = "";
      if (!hintOn || !result.text) { el.hidden = true; return; }
      el.hidden = false;
      el.appendChild(doc.createTextNode(result.text));
      if (result.openInBrowser) {
        var a = doc.createElement("a");
        a.href = openHref(location.href, { platform: platform(), standalone: true });
        if (platform() !== "android") { a.target = "_blank"; a.rel = "noopener"; }
        a.textContent = lang() === "en" ? "Open in Chrome" : "פתיחה ב־Chrome";
        el.appendChild(doc.createElement("br"));
        el.appendChild(a);
      }
    }
    function paintHints() {
      var result = current(false);
      writeHint(pageHint, result);
      writeHint(fixedHint, result);
    }
    function place() {
      var result = current(dp);
      var useFixed = !!(fixedWrap && standalone() && !dismissed());
      if (fixedBtn) fixedBtn.textContent = label();
      if (fixedClose) {
        fixedClose.title = closeLabel();
        fixedClose.setAttribute("aria-label", closeLabel());
      }
      if (fixedWrap) fixedWrap.hidden = !result.show || !useFixed;
      if (pageWrap) pageWrap.hidden = !result.show || useFixed;
      if (pageBtn) pageBtn.hidden = !!(pageWrap && pageWrap.hidden);
      if (!result.show) hintOn = false;
      paintHints();
    }
    function onClick(ev) {
      if (ev) {
        ev.preventDefault();
        if (ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      }
      if (dp && typeof dp.prompt === "function") {
        var d = dp;
        dp = null;
        try { window.__rgBip = null; } catch (e) {}
        hintOn = false;
        try { d.prompt(); } catch (err) { hintOn = true; }
        place();
        return;
      }
      hintOn = true;
      place();
    }
    [pageBtn, fixedBtn].forEach(function (btn) {
      if (btn) btn.addEventListener("click", onClick, true);
    });
    if (fixedClose) fixedClose.addEventListener("click", function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      try { if (o.dismissKey) localStorage.setItem(o.dismissKey, "1"); } catch (e) {}
      hintOn = false;
      place();
    });
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      dp = e;
      hintOn = false;
      try { window.__rgBip = e; } catch (err) {}
      place();
    });
    window.addEventListener("appinstalled", function () {
      dp = null;
      installed = true;
      hintOn = false;
      place();
    });
    window.addEventListener("storage", function (e) {
      if (e && (e.key === "rg-lang" || e.key === o.dismissKey)) place();
    });
    window.addEventListener("rg-lang", place);
    if (window.MutationObserver) {
      new MutationObserver(place).observe(doc.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] });
    }
    if (window.matchMedia) {
      ["standalone", "fullscreen", "minimal-ui"].forEach(function (mode) {
        var mq = window.matchMedia("(display-mode: " + mode + ")");
        if (mq.addEventListener) mq.addEventListener("change", place);
        else if (mq.addListener) mq.addListener(place);
      });
    }
    place();
    return { click: onClick, place: place };
  }

  function wireOpenLinks(items) {
    function platform() {
      var ua = navigator.userAgent || "";
      var ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      if (ios) return "ios";
      if (/Android/i.test(ua)) return "android";
      return "desktop";
    }
    function standalone() {
      try {
        if (navigator.standalone === true) return true;
        if (!window.matchMedia) return false;
        return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches;
      } catch (e) { return false; }
    }
    function apply() {
      var stand = standalone();
      var plat = platform();
      (items || []).forEach(function (item) {
        var el = document.getElementById(item.id);
        if (!el) return;
        el.href = openHref(item.url, { platform: plat, standalone: stand });
        if (stand && plat !== "android") {
          el.target = "_blank";
          el.rel = "noopener";
        } else {
          el.removeAttribute("target");
        }
      });
    }
    apply();
    if (window.matchMedia) {
      var mq = window.matchMedia("(display-mode: standalone)");
      if (mq.addEventListener) mq.addEventListener("change", apply);
      else if (mq.addListener) mq.addListener(apply);
    }
  }

  return { plan: plan, openHref: openHref, attach: attach, wireOpenLinks: wireOpenLinks };
});
