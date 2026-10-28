/* Offline cache for the private "Listify" app (formerly Checklist) (my/ideas/). Scope: my/ideas/ only.
   Only the app shell is cached; personal data lives in the account (Appwrite, cross-origin, never cached here) and in localStorage. */
var CACHE = "rg-myideas-v13";
var FILES = ["./", "index.html", "app.js?v=12", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "../common.css", "../common.js",
  "../../shared/rg-account.js", "../../shared/rg-topbar.js", "../../shared/fonts/heebo.css", "../../shared/rg-site.css", "../../shared/fonts/heebo-hebrew.woff2", "../../shared/fonts/heebo-latin.woff2", "../../shared/fonts/heebo-latin-ext.woff2", "../../shared/rg-bg.js"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-myideas-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
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
