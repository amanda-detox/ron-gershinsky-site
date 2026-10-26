/* Offline cache for the main landing page only.
   Sub-apps (alarm/, relax/, sounds/, ...) have their own service workers with
   narrower scopes; this worker never touches their files, so it just lets those
   requests go straight to the network. */
var CACHE = "rg-home-v13";
var FILES = ["./", "index.html", "shared/rg-account.js", "assets/avatar.jpg", "manifest.json", "app-icon.svg", "app-icon-192.png", "app-icon-512.png"];
var BASE = new URL("./", self.location).pathname;          // e.g. /ron-gershinsky-site/
var OWN = FILES.map(function (f) { return new URL(f, self.location).pathname; });

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-home-") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
// Network first so updates show up; fall back to cache when offline.
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;                          // never touch POSTs (waitlist)
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // waitlist worker, FormSubmit, etc.
  if (OWN.indexOf(url.pathname) === -1) return;              // sub-apps and anything else: not ours
  e.respondWith(fetch(req).then(function (r) {
    if (r.ok) { var copy = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return r;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (m) {
      return m || (url.pathname === BASE || req.mode === "navigate" ? caches.match("./") : undefined);
    });
  }));
});
