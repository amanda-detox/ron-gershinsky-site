/* Offline cache for Updatify (עדכוניפיי). Scope: news/ only. */
var CACHE = "rg-news-v21";
var FONT_CACHE = "rg-newsfonts-1"; // separate name so version bumps keep the fonts
var FILES = ["./", "index.html", "app.js", "../shared/rg-account.js", "../shared/rg-topbar.js", "../shared/fonts/heebo.css", "../shared/rg-site.css", "../shared/fonts/heebo-hebrew.woff2", "../shared/fonts/heebo-latin.woff2", "../shared/fonts/heebo-latin-ext.woff2", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "news.json"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-news-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Network first for everything (news.json included, so each hourly update shows right away).
// news.json is stored under one key regardless of the ?t= / ?r= cache-buster, for offline use.
// news.json?r=... comes from the Refresh button: network only, never answered from the cache (so offline shows "no connection").
// Page loads (navigations) are stored under the bare page URL, so share links like news/?item=<id> get the app (also offline).
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  // Google Fonts: font files cache-first (they never change), the CSS stale-while-revalidate.
  if (url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com") {
    e.respondWith(caches.open(FONT_CACHE).then(function (c) {
      return c.match(e.request).then(function (hit) {
        var net = fetch(e.request).then(function (r) { if (r.ok || r.type === "opaque") c.put(e.request, r.clone()); return r; });
        if (hit) { if (url.hostname === "fonts.googleapis.com") net.catch(function () {}); return hit; }
        return net;
      });
    }));
    return;
  }
  if (url.origin !== self.location.origin) return; // Appwrite API and every other cross-origin call: network only, never cached
  var isNews = /\/news\.json$/.test(url.pathname);
  var isNav = e.request.mode === "navigate";
  var forced = isNews && url.searchParams.has("r");
  var key = (isNews || isNav) ? new Request(url.origin + url.pathname) : e.request;
  e.respondWith(fetch(e.request, isNews ? { cache: "no-store" } : undefined).then(function (r) {
    var copy = r.clone();
    if (r.ok) caches.open(CACHE).then(function (c) { c.put(key, copy); });
    return r;
  }).catch(function (err) {
    if (forced) throw err;
    return caches.match(key, { ignoreSearch: true }).then(function (m) {
      return m || (e.request.mode === "navigate" ? caches.match("./") : undefined);
    });
  }));
});
