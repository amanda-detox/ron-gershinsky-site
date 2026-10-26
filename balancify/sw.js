/* Offline cache for Balancify (באלאנסיפיי). Scope: balancify/ only.
   Only the default background is precached; other backgrounds are cached when first used. */
var CACHE = "rg-balancify-v5";
var FILES = ["./", "index.html", "../shared/rg-account.js", "../shared/fonts/heebo.css", "../shared/rg-site.css", "../shared/fonts/heebo-hebrew.woff2", "../shared/fonts/heebo-latin.woff2", "../shared/fonts/heebo-latin-ext.woff2", "app.js", "data.js", "style.css", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "bg/sunset.webp"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-balancify-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  var isImg = /\/bg\/[^/]+\.webp$/.test(url.pathname);
  if (isImg) { // images: cache first (they never change), store on first use
    e.respondWith(caches.match(e.request).then(function (m) {
      return m || fetch(e.request).then(function (r) {
        if (r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
        return r;
      });
    }));
    return;
  }
  // everything else: network first, cache fallback offline
  e.respondWith(fetch(e.request).then(function (r) {
    if (r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(e.request, copy); }); }
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (m) {
      return m || (e.request.mode === "navigate" ? caches.match("./") : undefined);
    });
  }));
});
