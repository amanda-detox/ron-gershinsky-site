/* Offline cache for the Journalify sandbox (my/journal-sandbox/). Scope: my/journal-sandbox/ only.
   Deletes only rg-sbx-journal- caches. The live journal cache is left alone.
   Personal data is not cached here. */
var CACHE = "rg-sbx-journal-v1";
var FILES = ["./", "index.html", "strings.js?v=1", "rg-sync-status.js?v=1", "rg-store.js?v=1", "bookmarks.js?v=1", "app.js?v=1", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "../common.css", "../common.js", "../care.css",
  "../../shared/rg-account.js", "../../shared/rg-topbar.js", "../../shared/fonts/heebo.css", "../../shared/rg-site.css", "../../shared/fonts/heebo-hebrew.woff2", "../../shared/fonts/heebo-latin.woff2", "../../shared/fonts/heebo-latin-ext.woff2", "../../shared/rg-bg.js"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-sbx-journal-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    var copy = r.clone();
    if (r.ok) caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (m) { return m || (e.request.mode === "navigate" ? caches.match("./") : m); });
  }));
});
