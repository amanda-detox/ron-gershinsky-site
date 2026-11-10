/* Signed-in home list: one personal tile, no public twin. Run: node home-catalog.test.js */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var catalog = require("./home-catalog.js");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL " + msg); failed++; }
  else console.log("ok " + msg);
}

var root = __dirname;
var home = fs.readFileSync(path.join(root, "index.html"), "utf8");
var mySrc = fs.readFileSync(path.join(root, "my/apps.js"), "utf8");
var sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
var about = fs.readFileSync(path.join(root, "about/index.html"), "utf8");

function grab(name) {
  var re = new RegExp("var " + name + " = (\\[[\\s\\S]*?\\]);");
  var m = home.match(re);
  if (!m) throw new Error("missing " + name);
  return Function("return " + m[1])();
}
var apps = grab("apps");
var groups = grab("OWNER_GROUPS");
var after = grab("OWNER_AFTER");
var sandbox = { window: {} };
vm.runInNewContext(mySrc, sandbox);
var priv = sandbox.window.RGMY_APPS;

function hrefs(signedIn) {
  var list = catalog.listing(apps, signedIn ? priv : null, signedIn);
  var set = catalog.arrange(list, groups, signedIn ? after : []);
  return catalog.visible(set).map(function (a) { return a.href; });
}
function count(list, href) {
  var n = 0;
  list.forEach(function (h) { if (h === href) n++; });
  return n;
}

var guest = hrefs(false);
var signed = hrefs(true);
var twins = catalog.TWINS;

assert(guest.indexOf("listify/index.html") !== -1, "guest homepage still lists public Listify");
assert(guest.indexOf("yomanli/index.html") !== -1, "guest homepage still lists public Yomanli");
assert(guest.indexOf("rehabify/index.html") !== -1, "guest homepage still lists public Rehabify");
assert(guest.indexOf("rogali/index.html") !== -1, "guest homepage still lists public Rogali");
assert(guest.indexOf("purchasify/index.html") !== -1, "guest homepage still lists public Purchasify");
assert(guest.indexOf("smokify/index.html") !== -1, "guest homepage still lists Smokify");
assert(guest.indexOf("my/ideas/") === -1, "guest homepage does not list private Listify");
assert(guest.indexOf("clockify/index.html") === -1 && guest.indexOf("my/clock/") === -1, "guest homepage still hides both Clockify tiles");

Object.keys(twins).forEach(function (pub) {
  assert(signed.indexOf(pub) === -1, "signed-in account does not list public twin " + pub);
});
["my/ideas/", "my/journal/", "my/rehabify/", "my/calmify/", "my/shopping/"].forEach(function (href) {
  assert(count(signed, href) === 1, "signed-in account lists " + href + " once");
});
assert(signed.indexOf("my/clock/") === -1 && signed.indexOf("clockify/index.html") === -1, "signed-in account still hides both Clockify tiles");
assert(count(signed, "fly/index.html") === 1 && count(signed, "news/index.html") === 1 && count(signed, "smokify/index.html") === 1, "apps with no twin stay once");
assert(guest.length === signed.length, "signed-in list swaps twins for personal tiles instead of adding them");

var names = {};
catalog.visible(catalog.arrange(catalog.listing(apps, priv, true), groups, after)).forEach(function (a) {
  names[a.en] = (names[a.en] || 0) + 1;
});
["Listify", "Journalify", "Rehabify", "Calmify", "Purchasify", "Flyify", "Updatify", "Smokify"].forEach(function (en) {
  assert(names[en] === 1, "signed-in English name " + en + " appears once");
});
assert(!names.Yomanli && !names.Rogali, "signed-in list uses the personal journal and calm apps");

assert(home.indexOf("function accountApps()") !== -1, "home page builds a signed-in account list");
assert(home.indexOf("RGHomeCatalog.listing(apps, privData, true)") !== -1, "account list drops public twins");
assert(home.indexOf("if (!isOwner(u)) { privData = null") === -1, "personal tiles are not limited to the owner");
assert(home.indexOf('href: "listify/index.html"') !== -1, "public Listify stays in the guest catalog data");
assert(/\{\s*hidden:\s*true,\s*href:\s*"clockify\/index.html"/.test(home), "public Clockify stays hidden");
assert(/\{\s*hidden:\s*true,\s*href:\s*"clock\/"/.test(mySrc), "private Clockify stays hidden");
assert(home.indexOf("home-catalog.js?v=1") !== -1, "home page loads the catalog helper");
assert(sw.indexOf("home-catalog.js?v=1") !== -1, "home service worker caches the catalog helper");
assert(sw.indexOf("rg-home-v73") !== -1 && home.indexOf("sw.js?v=73") !== -1, "home cache bust is v73");
assert(about.indexOf("sw.js?v=73") !== -1, "about page registers the same home service worker");
assert(home.indexOf("my/ideas/app.js") === -1 && home.indexOf("publistify") === -1, "home catalog does not touch Listify sync");

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("all passed");
