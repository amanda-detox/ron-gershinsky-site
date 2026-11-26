/* Offline cache for the Balancify sandbox only. Scope: balancify-sandbox/.
   Does not delete rg-balancify-* caches used by the live app.
   The cache name lives in version.js. The on-screen label drops the leading "rg-". */
importScripts("version.js?v=8");
var CACHE = RG_SBX_BALANCIFY_CACHE;
var FILES = ["./", "index.html", "version.js?v=8", "model.js?v=5", "rg-sync-status.js?v=5", "app.js?v=19", "data.js?v=11", "style.css?v=19", "manifest.json?v=9", "icon.svg?v=8", "icon-192.png?v=8", "icon-512.png", "bg/sunset.webp", "../shared/rg-account.js", "../shared/rg-topbar.js?v=9", "../shared/fonts/heebo.css", "../shared/rg-site.css", "../shared/fonts/heebo-hebrew.woff2", "../shared/fonts/heebo-latin.woff2", "../shared/fonts/heebo-latin-ext.woff2"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-sbx-balancify-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  var isImg = /\/bg\/[^/]+\.webp$/.test(url.pathname);
  if (isImg) {
    e.respondWith(caches.match(e.request).then(function (m) {
      return m || fetch(e.request).then(function (r) {
        if (r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
        return r;
      });
    }));
    return;
  }
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (m) {
      return m || (e.request.mode === "navigate" ? caches.match("./") : undefined);
    });
  }));
});
