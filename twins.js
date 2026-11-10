/* Live home list rule. One map of public path -> private path.
   A signed-in list keeps the private app and drops the public twin.
   A signed-out list does not use this file. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RGHomeTwins = api;
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  // Paths are the hrefs the home grid already uses (public apps in index.html, private apps under my/).
  var TWIN_PUBLIC_TO_PRIVATE = {
    "listify/index.html": "my/ideas/",
    "yomanli/index.html": "my/journal/",
    "rehabify/index.html": "my/rehabify/",
    "rogali/index.html": "my/calmify/",
    "purchasify/index.html": "my/shopping/",
    "clockify/index.html": "my/clock/"
  };

  function normalizePriv(href) {
    href = String(href || "").replace(/^\//, "").split("?")[0];
    if (href.indexOf("my/") !== 0) href = "my/" + href;
    if (!/\.[a-z0-9]+$/i.test(href) && href.slice(-1) !== "/") href += "/";
    return href;
  }

  function indexPrivate(catalog) {
    var map = {}, apps = catalog && catalog.apps, i, app;
    if (!apps || !apps.forEach) return map;
    for (i = 0; i < apps.length; i++) {
      app = apps[i];
      if (!app || typeof app.href !== "string") continue;
      map[normalizePriv(app.href)] = app;
    }
    return map;
  }

  function privateTile(app) {
    var href = normalizePriv(app.href);
    var icon = typeof app.icon === "string" ? app.icon : "";
    if (icon && icon.indexOf("my/") !== 0 && !/^(?:[a-z]+:|\/\/)/i.test(icon)) icon = "my/" + icon.replace(/^\//, "");
    return { href: href, icon: icon, he: app.he, en: app.en, heLine: app.heLine, enLine: app.enLine, priv: true, hidden: !!app.hidden };
  }

  function cleanSeps(list) {
    var out = [], i, lastSep = true, a;
    for (i = 0; i < list.length; i++) {
      a = list[i];
      if (a && a.sep) {
        if (!lastSep) { out.push(a); lastSep = true; }
        continue;
      }
      out.push(a);
      lastSep = false;
    }
    if (out.length && out[out.length - 1] && out[out.length - 1].sep) out.pop();
    return out;
  }

  function fold(list, byHref, seen) {
    var out = [], i, a, dest, priv, next;
    list = list || [];
    for (i = 0; i < list.length; i++) {
      a = list[i];
      if (!a) continue;
      if (a.sep) { out.push(a); continue; }
      next = a;
      dest = TWIN_PUBLIC_TO_PRIVATE[a.href];
      if (dest) {
        priv = byHref[normalizePriv(dest)];
        // Signed in: the public path never stays. A hidden private copy stays off the grid too.
        if (!priv || priv.hidden) continue;
        next = privateTile(priv);
      }
      if (!next.href || seen[next.href]) continue;
      seen[next.href] = 1;
      out.push(next);
    }
    return cleanSeps(out);
  }

  /* set is { top, rest } from the home grid. catalog is my/apps.js (RGMY_APPS). */
  function hidePublicTwins(set, catalog) {
    var byHref = indexPrivate(catalog);
    var seen = {};
    set = set || {};
    return { top: fold(set.top, byHref, seen), rest: fold(set.rest, byHref, seen) };
  }

  return { TWIN_PUBLIC_TO_PRIVATE: TWIN_PUBLIC_TO_PRIVATE, hidePublicTwins: hidePublicTwins, normalizePriv: normalizePriv };
});
