/* Offline cache for the Rogali sandbox (rogali-sandbox/). Scope: rogali-sandbox/ only.
   Deletes only rg-sbx-rogali- caches. The live rogali cache (rg-pub-rogali-*) is left alone.
   Only the app shell is cached; personal data lives in the account (Appwrite, cross-origin, never cached here) and in localStorage. */
var CACHE = "rg-sbx-rogali-v1";
var FILES = ["./", "index.html", "app.js", "app.js?v=4", "topics.js", "topics.js?v=1", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-192.png?v=1", "icon-maskable-512.png?v=1", "../my/common.css", "../my/common.js", "../my/care.css", "../my/help-now.js", "../shared/rg-public-store.js?v=1",
  "rg-isolate.js", "../shared/rg-public.css", "../sandbox-shared/rg-account.js?v=3", "../shared/rg-topbar.js", "../shared/rg-topbar.js?v=5", "../shared/fonts/heebo.css", "../shared/rg-site.css", "../shared/fonts/heebo-hebrew.woff2", "../shared/fonts/heebo-latin.woff2", "../shared/fonts/heebo-latin-ext.woff2", "../shared/rg-bg.js"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-sbx-rogali-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Network first (updates show right away), cache when offline.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // Appwrite API etc.: network only, never cached
  e.respondWith(fetch(e.request).then(function (r) {
    var copy = r.clone();
    if (r.ok) caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (m) { return m || (e.request.mode === "navigate" ? caches.match("./") : m); });
  }));
});
