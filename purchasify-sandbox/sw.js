/* Offline cache for the Purchasify sandbox only. Does not delete the live purchasify cache. */
var CACHE = "rg-sbx-purchasify-v1";
var FILES = ["./", "index.html", "app.js?v=1", "rg-isolate.js", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "../my/common.css", "../my/common.js",
  "../sandbox-shared/rg-sync-status.js", "../sandbox-shared/rg-account.js", "../shared/rg-topbar.js", "../shared/fonts/heebo.css", "../shared/rg-site.css", "../shared/fonts/heebo-hebrew.woff2", "../shared/fonts/heebo-latin.woff2", "../shared/fonts/heebo-latin-ext.woff2", "../shared/rg-bg.js", "../shared/rg-public.css"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-sbx-purchasify-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
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
