/* Offline shell for the content-page install sandbox only. Scope: content-sandbox/.
   Does not delete live caches and does not answer for other apps. */
var CACHE = "rg-sbx-content-v1";
var FILES = ["./", "index.html", "manifest.json", "../sandbox-shared/rg-install.js?v=1", "../shared/rg-site.css", "../shared/fonts/heebo.css", "../app-icon-192.png?v=23", "../app-icon-512.png?v=23"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-sbx-content-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  var scope = new URL("./", self.location).pathname;
  if (url.pathname.indexOf(scope) !== 0) return;
  e.respondWith(fetch(req).then(function (r) {
    if (r.ok) {
      var copy = r.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
    }
    return r;
  }).catch(function () {
    return caches.match(req).then(function (m) { return m || caches.match("./index.html"); });
  }));
});
