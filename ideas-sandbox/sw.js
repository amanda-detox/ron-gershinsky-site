/* Offline cache for the private Listify sandbox only. Scope: ideas-sandbox/.
   Does not delete caches used by the live app. */
var CACHE = "rg-sbx-ideas-v21";
var FILES = ["./", "index.html", "rg-sync-status.js?v=7", "restore.js?v=1", "app.js?v=55", "manifest.json?v=20", "icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-192.png?v=20", "icon-maskable-512.png?v=20", "../my/common.css", "../my/common.js",
  "../sandbox-shared/rg-sync-status.js", "../sandbox-shared/rg-account.js?v=3", "../shared/rg-topbar.js", "../shared/fonts/heebo.css", "../shared/rg-site.css", "../shared/fonts/heebo-hebrew.woff2", "../shared/fonts/heebo-latin.woff2", "../shared/fonts/heebo-latin-ext.woff2", "../shared/rg-bg.js"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-sbx-ideas-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
function net(req) {
  var path = new URL(req.url).pathname;
  var fresh = req.mode === "navigate" || /\/$/.test(path) || /\.html$/i.test(path) || /\.js$/i.test(path);
  return fresh ? fetch(req, { cache: "no-cache" }) : fetch(req);
}
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(net(e.request).then(function (r) {
    var copy = r.clone();
    if (r.ok) caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
    return r;
  }).catch(function () {
    var exact = caches.match(e.request);
    var versioned = new URL(e.request.url).search;
    return exact.then(function (m) {
      if (m || versioned) return m || (e.request.mode === "navigate" ? caches.match("./") : m);
      return caches.match(e.request, { ignoreSearch: true }).then(function (hit) { return hit || (e.request.mode === "navigate" ? caches.match("./") : hit); });
    });
  }));
});
