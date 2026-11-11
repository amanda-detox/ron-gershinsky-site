/* Imagify sandbox only. Cache name stays versioned so a later sandbox can replace it
   without touching any other app's caches. Photos themselves are never cached here;
   they live in IndexedDB on the device. */
var CACHE = "rg-imagify-sbx-v2";
var FILES = [
  "./",
  "index.html",
  "app.css",
  "app.js",
  "manifest.json",
  "icons/favicon.ico",
  "icons/icon-32.png",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-192.png",
  "icons/maskable-512.png",
  "../shared/fonts/heebo.css",
  "../shared/rg-site.css",
  "../shared/fonts/heebo-hebrew.woff2",
  "../shared/fonts/heebo-latin.woff2",
  "../shared/fonts/heebo-latin-ext.woff2"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-imagify-sbx-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copy = r.clone();
    if (r.ok) caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (m) {
      return m || (e.request.mode === "navigate" ? caches.match("./") : m);
    });
  }));
});
