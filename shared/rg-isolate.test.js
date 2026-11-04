/* Isolation checks for the five public apps. Run: node shared/rg-isolate.test.js */
"use strict";
var fs = require("fs");
var path = require("path");
var iso = require("./rg-isolate.js");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL " + msg); failed++; }
  else console.log("ok " + msg);
}

var RON = "6adefcf6c9d7f919e779";
var A = "userAaaaaaaaaaaaaaaa1";
var B = "userBbbbbbbbbbbbbbbb2";
var PRIVATE = { publistify: "myideas", pubyomanli: "myjournal", pubrehabify: "myrehab", pubrogali: "mycalm", pubpurchasify: "shopping" };

assert(iso.scopeId(null) === "guest", "signed out is the guest namespace");
assert(iso.maySync(null) === false && iso.maySync("guest") === false && iso.maySync({ id: "guest" }) === false, "a guest never syncs");
assert(iso.cacheKey("publistify", null) === "rg-pub-listify:guest", "guest key is namespaced");
assert(iso.cacheKey("publistify", A) !== iso.cacheKey("publistify", B), "two users get two keys");
assert(iso.cacheKey("publistify", A) !== iso.cacheKey("publistify", "guest"), "a user key is not the guest key");

var storage = {};
storage[iso.cacheKey("publistify", "guest")] = { items: { g1: { id: "g1", text: "guest only", at: 1 } }, pending: true };
storage[iso.cacheKey("publistify", A)] = { items: { a1: { id: "a1", text: "user A", at: 2 } }, pending: false };
storage[iso.cacheKey("publistify", RON)] = { items: { r1: { id: "r1", text: "ron public copy", at: 3 } }, pending: false };
function get(k) { return storage[k] || null; }

var guest = iso.loadBucket(get, "publistify", null);
var userA = iso.loadBucket(get, "publistify", { id: A });
var userB = iso.loadBucket(get, "publistify", { id: B });
var ronPub = iso.loadBucket(get, "publistify", { id: RON });
assert(guest.items.g1 && !guest.items.a1 && guest.sync === false, "guest sees only guest items and does not sync");
assert(userA.items.a1 && !userA.items.g1 && userA.sync === true, "user A does not receive the guest list");
assert(!userB.items.a1 && !userB.items.g1 && Object.keys(userB.items).length === 0, "user B starts empty");
assert(ronPub.items.r1 && !ronPub.items.a1 && !ronPub.items.g1, "Ron's public namespace is not user A and not the guest");
assert(storage[iso.cacheKey("publistify", "guest")].items.g1.text === "guest only", "opening another user left the guest bucket unchanged");
assert(storage[iso.cacheKey("publistify", A)].items.a1.text === "user A", "opening the guest left user A unchanged");

Object.keys(PRIVATE).forEach(function (app) {
  iso.assertPublicApp(app);
  var perms = iso.perms(A);
  assert(iso.permsAreUserOnly(perms, A), app + " document permissions are user A only");
  assert(!perms.some(function (x) { return /any|users|guests/.test(x); }), app + " permissions do not grant any or users");
  assert(iso.rowId(A, app, "items") !== iso.rowId(B, app, "items"), app + " row ids differ between users");
  assert(iso.rowId(RON, app, "items") !== iso.rowId(RON, PRIVATE[app], "items"), app + " does not use Ron's private row");
  assert(iso.rowId(RON, app, "items") !== iso.rowId(A, app, "items"), app + " Ron and user A do not share a row");
});
["pubsmokify"].forEach(function (app) {
  iso.assertPublicApp(app);
  var perms = iso.perms(A);
  assert(iso.permsAreUserOnly(perms, A), app + " document permissions are user A only");
  assert(iso.rowId(A, app, "items") !== iso.rowId(B, app, "items"), app + " row ids differ between users");
  assert(iso.cacheKey(app, A) === "rg-pub-smokify:" + A, app + " stays in its own namespace");
});
var refused = false;
try { iso.assertPublicApp("myideas"); } catch (e) { refused = true; }
assert(refused, "a private app id is refused");
refused = false;
try { iso.perms("guest"); } catch (e) { refused = true; }
assert(refused, "a guest is not given cloud permissions");

var acc = fs.readFileSync(path.join(__dirname, "rg-account.js"), "utf8");
var setFn = acc.slice(acc.indexOf("function set(app, key, value)"), acc.indexOf("/* ---------------- prefs sync"));
assert(setFn.indexOf('read("user:\' + uid + \'")') !== -1, "account rows are readable by that user only");
assert(setFn.indexOf('update("user:\' + uid + \'")') !== -1, "account rows are writable by that user only");
assert(setFn.indexOf('delete("user:\' + uid + \'")') !== -1, "account rows are deletable by that user only");
assert(!/"(?:read|update|delete)\("(?:any|users|guests)"\)"/.test(setFn) && !/read\("any"\)|read\("users"\)|update\("any"\)|update\("users"\)|delete\("any"\)|delete\("users"\)/.test(setFn), "account set() does not grant any or users");

var store = fs.readFileSync(path.join(__dirname, "rg-public-store.js"), "utf8");
assert(store.indexOf("Guest items are not copied") !== -1, "public store documents the no-merge switch");
assert(store.indexOf("lsSet(cacheKey(uid), null)") === -1, "public store does not delete another namespace on sign-out");
assert(store.indexOf("RGIsolate.maySync(uid)") !== -1, "public store syncs only a real account");

var root = path.join(__dirname, "..");
var dirs = ["listify", "yomanli", "rehabify", "rogali", "purchasify", "smokify"];
var banned = ["מאיה", "Moshe", "nattokinase", "lorivan", "seraquel", "trazodil", "אמנדה", "לבקר במרקטפלייס", "הרגלים שלי", "ניקויים", "נוטלה", "m:shopimport", "myideas", "myjournal", "myrehab", "mycalm", "rg-myideas", "rg-my-shopping", "rg-myjournal", "rg-myrehab", "rg-mycalm", "rg-myshop"];
function walk(dir, out) {
  fs.readdirSync(dir).forEach(function (name) {
    var p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|html|css|json)$/.test(name)) out.push(p);
  });
  return out;
}
dirs.forEach(function (d) {
  walk(path.join(root, d), []).forEach(function (file) {
    var text = fs.readFileSync(file, "utf8");
    banned.forEach(function (w) {
      if (text.indexOf(w) !== -1) assert(false, path.relative(root, file) + " contains " + w);
    });
    if (file.slice(-3) === ".js") {
      if (/RGStore\("my/.test(text)) assert(false, path.relative(root, file) + " calls a private store id");
      if (/APP = "(?:myideas|shopping|myjournal|myrehab|mycalm|myclock)"/.test(text)) assert(false, path.relative(root, file) + " uses a private app id");
    }
  });
});

var home = fs.readFileSync(path.join(root, "index.html"), "utf8");
["listify/index.html", "yomanli/index.html", "rehabify/index.html", "rogali/index.html", "purchasify/index.html", "smokify/index.html"].forEach(function (href) {
  assert(home.indexOf('href: "' + href + '"') !== -1, "homepage lists " + href);
});
assert(/\{\s*hidden:\s*true,\s*href:\s*"clockify\/index.html"/.test(home), "the public Clockify tile stays hidden");
var myApps = fs.readFileSync(path.join(root, "my/apps.js"), "utf8");
assert(/\{\s*hidden:\s*true,\s*href:\s*"clock\/"/.test(myApps), "the private clock stays hidden");
var sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
assert(sw.indexOf("rg-home-v70") !== -1, "home service worker cache is bumped");
assert(home.indexOf("sw.js?v=70") !== -1, "home page registers the bumped service worker");

if (failed) {
  console.error(failed + " failed");
  process.exit(1);
}
console.log("all isolation checks passed");
