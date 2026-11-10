/* Home catalog. Guests see the public apps. A signed-in account sees one tile per app:
   the personal copy, never the public twin. Public pages stay on their URLs.
   This file does not read or write storage and does not touch app data. */
(function (root) {
  "use strict";
  // Public href → personal href. Both Clockify copies stay hidden in their own lists.
  var TWINS = {
    "listify/index.html": "my/ideas/",
    "yomanli/index.html": "my/journal/",
    "rehabify/index.html": "my/rehabify/",
    "rogali/index.html": "my/calmify/",
    "purchasify/index.html": "my/shopping/",
    "clockify/index.html": "my/clock/"
  };

  function privateTiles(privData) {
    var out = [], list = privData && privData.apps;
    if (!list || !list.forEach) return out;
    list.forEach(function (app) {
      if (!app || app.hidden || typeof app.href !== "string" || /^[a-z]+:|^\/|\.\./i.test(app.href)) return;
      out.push({
        href: "my/" + app.href,
        icon: app.icon ? "my/" + app.icon : "",
        he: app.he,
        en: app.en,
        heLine: app.heLine,
        enLine: app.enLine,
        priv: true
      });
    });
    return out;
  }

  // signedIn: drop every public twin, then append the personal tiles (hidden personal apps stay out).
  function listing(publicApps, privData, signedIn) {
    var list = [];
    (publicApps || []).forEach(function (app) {
      if (!app) return;
      if (signedIn && app.href && Object.prototype.hasOwnProperty.call(TWINS, app.href)) return;
      list.push(app);
    });
    if (signedIn) privateTiles(privData).forEach(function (app) { list.push(app); });
    return list;
  }

  // Same grouping the home page used: featured groups, then `after`, then everything else.
  function arrange(all, groups, after) {
    var out = [], used = [];
    function pick(hrefs) {
      var g = [];
      (hrefs || []).forEach(function (h) {
        (all || []).forEach(function (a) {
          if (a && a.href === h && !a.hidden && used.indexOf(a) === -1) { g.push(a); used.push(a); }
        });
      });
      return g;
    }
    (groups || []).forEach(function (hrefs) {
      var g = pick(hrefs);
      if (g.length) { if (out.length) out.push({ sep: true }); out = out.concat(g); }
    });
    var rest = pick(after).concat((all || []).filter(function (a) { return a && used.indexOf(a) === -1 && !a.hidden && !a.sep; }));
    return { top: out, rest: rest };
  }

  function visible(set) {
    return (set.top || []).concat(set.rest || []).filter(function (a) { return a && !a.sep && a.href; });
  }

  var api = { TWINS: TWINS, privateTiles: privateTiles, listing: listing, arrange: arrange, visible: visible };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.RGHomeCatalog = api;
})(typeof window !== "undefined" ? window : global);
