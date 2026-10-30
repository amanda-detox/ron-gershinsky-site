/* Offline cache for Lightify · לייטיפיי (scope: this folder only). */
var CACHE = "rg-game-v5";
var FILES = ["./", "index.html", "game.js", "three.module.min.js", "fonts.css", "fonts/heebo-hebrew.woff2", "fonts/heebo-latin.woff2", "fonts/heebo-latin-ext.woff2",
  "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "../shared/rg-topbar.js"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-game-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Network first so updates show up; fall back to cache when offline.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copy = r.clone();
    if (r.ok) caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (m) {
      return m || (e.request.mode === "navigate" ? caches.match("./") : undefined);
    });
  }));
});
