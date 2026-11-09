/* Offline cache for the home sandbox only. Scope: home-sandbox/.
   Deletes only rg-sbx-home-* caches. The live home cache (rg-home-*) is not touched.
   Requests outside this folder (live pages, shared scripts, the apps themselves) are not cached here. */
var CACHE = "rg-sbx-home-v1";
var FILES = ["./index.html", "./twins.js", "./home-dnd.js", "./manifest.json"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-sbx-home-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
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
    return caches.match(req, { ignoreSearch: true }).then(function (m) {
      return m || (req.mode === "navigate" ? caches.match("./index.html") : undefined);
    });
  }));
});
