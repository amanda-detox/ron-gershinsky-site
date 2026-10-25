/* Offline cache for Updates (עדכונים). Scope: news/ only. */
var CACHE = "rg-news-v3";
var FILES = ["./", "index.html", "app.js", "manifest.json", "icon.svg", "icon-192.png", "icon-512.png", "news.json"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-news-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Network first for everything (news.json included, so the daily update shows right away).
// news.json is stored under one key regardless of the ?t= cache-buster, for offline use.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  var isNews = /\/news\.json$/.test(url.pathname);
  var key = isNews ? new Request(url.origin + url.pathname) : e.request;
  e.respondWith(fetch(e.request, isNews ? { cache: "no-store" } : undefined).then(function (r) {
    var copy = r.clone();
    if (r.ok) caches.open(CACHE).then(function (c) { c.put(key, copy); });
    return r;
  }).catch(function () {
    return caches.match(key, { ignoreSearch: true }).then(function (m) {
      return m || (e.request.mode === "navigate" ? caches.match("./") : undefined);
    });
  }));
});
