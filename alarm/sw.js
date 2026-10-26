/* Clockify moved to ../clockify/. This worker replaces the old alarm/ one:
   it clears the old alarm/ caches, unregisters itself and sends open windows to the new address. */
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf("rg-alarm-") === 0; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.registration.unregister(); })
    .then(function () { return self.clients.matchAll({ type: "window" }); })
    .then(function (list) { list.forEach(function (c) { if ("navigate" in c) c.navigate(new URL("../clockify/", self.location).href).catch(function () {}); }); }));
});
