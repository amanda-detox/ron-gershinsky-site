/* Offline cache for the private area (my/ and my/shopping/; my/clock/, my/ideas/, my/rehabify/ and my/calmify/ have their own workers). Scope: my/ only.
   Only the app shell is cached; personal data never goes through this cache (the Appwrite API is cross-origin and skipped). */
var CACHE = "rg-my-v44";
var FILES = ["./", "index.html", "common.css", "common.js", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png",
  "shopping/", "shopping/index.html", "shopping/app.js", "shopping/manifest.json", "shopping/icon.svg", "shopping/icon-192.png", "shopping/icon-512.png",
  "ideas/icon-192.png", "journal/icon-192.png?v=5", "clock/icon-192.png", "rehabify/icon-192.png", "calmify/icon-192.png",
  "../shared/rg-account.js", "../shared/rg-topbar.js", "../shared/fonts/heebo.css", "../shared/rg-site.css", "../shared/fonts/heebo-hebrew.woff2", "../shared/fonts/heebo-latin.woff2", "../shared/fonts/heebo-latin-ext.woff2", "../shared/rg-bg.js"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-my-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Network first (updates show right away), cache when offline.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // Appwrite API etc.: network only, never cached
  e.respondWith(fetch(e.request).then(function (r) {
    var copy = r.clone();
    if (r.ok) caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (m) {
      if (m || e.request.mode !== "navigate") return m;
      return caches.match(/\/shopping\//.test(url.pathname) ? "shopping/" : "./");
    });
  }));
});
