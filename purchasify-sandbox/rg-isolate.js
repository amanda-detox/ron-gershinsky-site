/* Sandbox copy for purchasify-sandbox/ only. Opens sbxpurchasify, stored as rg-sbx-purchasify:<user>. */
(function (root) {
  "use strict";
  var GUEST = "guest";
  var PRIVATE_APPS = ["myideas", "shopping", "myjournal", "myrehab", "mycalm", "myclock"];
  var PUBLIC = { sbxpurchasify: "rg-sbx-purchasify" };

  function scopeId(user) {
    var id = user && (user.id || user.$id);
    if (!id || id === GUEST) return GUEST;
    return String(id);
  }
  function maySync(userOrId) {
    if (userOrId == null || userOrId === "") return false;
    var id = typeof userOrId === "string" ? userOrId : scopeId(userOrId);
    if (!id || id === GUEST) return false;
    return /^[A-Za-z0-9]{1,36}$/.test(id);
  }
  function assertPublicApp(app) {
    if (PRIVATE_APPS.indexOf(app) !== -1) throw new Error("refusing private app id " + app);
    if (!PUBLIC[app]) throw new Error("unknown public app " + app);
  }
  function cacheKey(app, id) {
    assertPublicApp(app);
    return PUBLIC[app] + ":" + (id && id !== GUEST ? id : GUEST);
  }
  function perms(uid) {
    if (!maySync(uid)) throw new Error("no cloud permissions for a guest");
    return ['read("user:' + uid + '")', 'update("user:' + uid + '")', 'delete("user:' + uid + '")'];
  }
  function permsAreUserOnly(list, uid) {
    if (!list || list.length !== 3) return false;
    var need = { read: 1, update: 1, delete: 1 };
    for (var i = 0; i < list.length; i++) {
      var m = /^(\w+)\("user:([^"]+)"\)$/.exec(list[i]);
      if (!m || !need[m[1]] || m[2] !== uid) return false;
      delete need[m[1]];
    }
    return !need.read && !need.update && !need.delete;
  }
  function loadBucket(get, app, user) {
    var id = scopeId(user);
    var key = cacheKey(app, id);
    var c = get(key);
    var items = (c && c.items && typeof c.items === "object") ? c.items : {};
    return { id: id, key: key, items: items, pending: !!(c && c.pending), sync: maySync(id) };
  }
  function h32(s, seed) {
    var h = (0x811c9dc5 ^ Math.imul(seed, 0x9e3779b1)) >>> 0, i;
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function rowId(uid, app, key) {
    var s = uid + "\u0001" + app + "\u0001" + key;
    return ("r" + h32(s, 1) + h32(s, 2) + h32(s, 3) + h32(s, 4)).slice(0, 32);
  }
  var api = { GUEST: GUEST, PRIVATE_APPS: PRIVATE_APPS, PUBLIC: PUBLIC, scopeId: scopeId, maySync: maySync, assertPublicApp: assertPublicApp, cacheKey: cacheKey, perms: perms, permsAreUserOnly: permsAreUserOnly, loadBucket: loadBucket, rowId: rowId };
  root.RGIsolate = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
