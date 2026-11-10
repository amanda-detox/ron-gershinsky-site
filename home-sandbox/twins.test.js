/* Home sandbox: one signed-in entry per app. Run: node home-sandbox/twins.test.js */
"use strict";
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var twins = require("./twins.js");
var root = path.join(__dirname, "..");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL " + msg); failed++; }
  else console.log("ok " + msg);
}

function extractArray(src, name) {
  var key = "var " + name + " = ";
  var i = src.indexOf(key);
  if (i < 0) throw new Error("missing " + name);
  i += key.length;
  var depth = 0, j = i, inStr = false, q = "", esc = false;
  for (; j < src.length; j++) {
    var c = src[j];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === q) inStr = false;
      continue;
    }
    if (c === "\"" || c === "'") { inStr = true; q = c; continue; }
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) { j++; break; } }
  }
  return Function("return (" + src.slice(i, j) + ");")();
}

var liveHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
var sbxHtml = fs.readFileSync(path.join(root, "home-sandbox/index.html"), "utf8");
var liveDnd = fs.readFileSync(path.join(root, "home-dnd.js"), "utf8");
var sbxDnd = fs.readFileSync(path.join(root, "home-sandbox/home-dnd.js"), "utf8");
var sw = fs.readFileSync(path.join(root, "home-sandbox/sw.js"), "utf8");
var liveSw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
var appsJs = fs.readFileSync(path.join(root, "my/apps.js"), "utf8");
var sandbox = { window: {} };
vm.runInNewContext(appsJs, sandbox);
var catalog = sandbox.window.RGMY_APPS;

var liveApps = extractArray(liveHtml, "apps");
var sbxApps = extractArray(sbxHtml, "apps");
var groups = extractArray(sbxHtml, "OWNER_GROUPS");
var after = extractArray(sbxHtml, "OWNER_AFTER");

assert(JSON.stringify(liveApps) === JSON.stringify(sbxApps), "sandbox public catalog matches the live home");
assert(JSON.stringify(extractArray(liveHtml, "OWNER_GROUPS")) === JSON.stringify(groups), "sandbox featured groups match live");
assert(liveHtml.indexOf("home-sandbox") === -1 && liveHtml.indexOf("rg-sbx-home") === -1 && /if \(signed && window\.RGHomeTwins/.test(liveHtml), "live home hides public twins when signed in and does not link the sandbox");
assert(liveDnd.indexOf('"rg-home-order"') !== -1 && liveDnd.indexOf("rg-sbx-home") === -1, "live drag-and-drop still uses rg-home-order");
assert(sbxDnd.indexOf('"rg-sbx-home-order"') !== -1 && sbxDnd.indexOf('"rg-home-order"') === -1 && sbxDnd.indexOf('"rg-sbx-home-hidden"') !== -1, "sandbox drag-and-drop uses rg-sbx-home keys");
assert(sw.indexOf('CACHE = "rg-sbx-home-v1"') !== -1 && sw.indexOf('indexOf("rg-sbx-home-")') !== -1 && sw.indexOf('indexOf("rg-home-")') === -1, "sandbox cache cannot delete the live home cache");
assert(liveSw.indexOf("rg-sbx-home") === -1, "live service worker does not mention the sandbox cache");
assert(sbxHtml.indexOf("syncPrefs(") === -1, "sandbox does not sync prefs into the account");
assert(!/localStorage\.setItem\(\s*["']rg-lang/.test(sbxHtml), "sandbox does not write rg-lang");
assert(!/localStorage\.setItem\(\s*["']rg-home-/.test(sbxHtml), "sandbox does not write rg-home-*");
assert(!/localStorage\.setItem\(\s*["']rg-my-/.test(sbxHtml) && sbxHtml.indexOf("rg-my-home-apps") === -1, "sandbox does not use the live private-catalog cache");
assert(/if \(signed && window\.RGHomeTwins/.test(sbxHtml), "twin filter runs only for a signed-in list");
assert(sbxHtml.indexOf("<title>Healify</title>") !== -1 && sbxHtml.indexOf('document.title = "Healify"') !== -1, "sandbox tab title stays English");

var map = twins.TWIN_PUBLIC_TO_PRIVATE;
var expect = {
  "listify/index.html": "my/ideas/",
  "yomanli/index.html": "my/journal/",
  "rehabify/index.html": "my/rehabify/",
  "rogali/index.html": "my/calmify/",
  "purchasify/index.html": "my/shopping/",
  "clockify/index.html": "my/clock/"
};
assert(JSON.stringify(map) === JSON.stringify(expect), "public path -> private path map is the six twins");
Object.keys(expect).forEach(function (pub) {
  assert(liveApps.some(function (a) { return a.href === pub; }), "live home lists " + pub);
  var tail = expect[pub].replace(/^my\//, "");
  assert(catalog.apps.some(function (a) { return a.href === tail; }), "private catalog lists " + tail);
});
assert(!catalog.apps.some(function (a) { return a.href === "smokify/" || a.href === "smokify"; }), "Smokify has no private twin");

function publicSet() {
  var top = [], used = [];
  groups.forEach(function (hrefs) {
    var g = [];
    hrefs.forEach(function (h) { sbxApps.forEach(function (a) { if (a.href === h && !a.hidden && used.indexOf(a) === -1) { g.push(a); used.push(a); } }); });
    if (g.length) { if (top.length) top.push({ sep: true }); top = top.concat(g); }
  });
  return { top: top, rest: sbxApps.filter(function (a) { return !a.hidden && used.indexOf(a) === -1; }) };
}
function ownerSet() {
  var all = sbxApps.slice();
  catalog.apps.forEach(function (app) {
    if (!app || app.hidden || typeof app.href !== "string") return;
    all.push({ href: "my/" + app.href, icon: "my/" + app.icon, he: app.he, en: app.en, heLine: app.heLine, enLine: app.enLine, priv: true });
  });
  var out = [], used = [];
  function pick(hrefs) { var g = []; hrefs.forEach(function (h) { all.forEach(function (a) { if (a.href === h && !a.hidden && used.indexOf(a) === -1) { g.push(a); used.push(a); } }); }); return g; }
  groups.forEach(function (hrefs) { var g = pick(hrefs); if (g.length) { if (out.length) out.push({ sep: true }); out = out.concat(g); } });
  var rest = pick(after).concat(all.filter(function (a) { return used.indexOf(a) === -1 && !a.hidden; }));
  return { top: out, rest: rest };
}
function tiles(set) { return (set.top || []).concat(set.rest || []).filter(function (a) { return a && !a.sep; }); }
function hrefs(set) { return tiles(set).map(function (a) { return a.href; }); }
function once(list) {
  var seen = {};
  return list.every(function (h) { if (seen[h]) return false; seen[h] = 1; return true; });
}

var signedOut = publicSet();
var outH = hrefs(signedOut);
assert(outH.indexOf("listify/index.html") !== -1 && outH.indexOf("my/ideas/") === -1, "signed-out list still shows public Listify and not the private copy");
assert(outH.indexOf("clockify/index.html") === -1 && outH.indexOf("my/clock/") === -1, "signed-out list still hides Clockify");
assert(outH.indexOf("smokify/index.html") !== -1, "signed-out list still shows Smokify");

var owner = twins.hidePublicTwins(ownerSet(), catalog);
var ownerH = hrefs(owner);
["my/ideas/", "my/journal/", "my/rehabify/", "my/calmify/", "my/shopping/"].forEach(function (h) {
  assert(ownerH.filter(function (x) { return x === h; }).length === 1, "owner signed-in list shows " + h + " once");
});
["listify/index.html", "yomanli/index.html", "rehabify/index.html", "rogali/index.html", "purchasify/index.html", "clockify/index.html", "my/clock/"].forEach(function (h) {
  assert(ownerH.indexOf(h) === -1, "owner signed-in list hides " + h);
});
assert(once(ownerH), "owner signed-in list has one href per app");
assert(ownerH[0] === "my/ideas/" && ownerH[1] === "my/journal/" && ownerH[2] === "fly/index.html", "owner featured row stays Listify, journal, Flyify");
var journal = tiles(owner).filter(function (a) { return a.href === "my/journal/"; })[0];
var calm = tiles(owner).filter(function (a) { return a.href === "my/calmify/"; })[0];
assert(journal && journal.en === "Journalify" && journal.priv === true, "journal tile is the private app");
assert(calm && calm.en === "Calmify" && calm.priv === true, "Rogali's signed-in tile is private Calmify");

var member = twins.hidePublicTwins(publicSet(), catalog);
var memberH = hrefs(member);
assert(memberH.length === outH.length, "a signed-in non-owner keeps the same number of tiles, with twins swapped in place");
assert(outH.indexOf("smokify/index.html") === memberH.indexOf("smokify/index.html"), "Smokify stays put when twins are swapped");
assert(memberH.indexOf("listify/index.html") === -1 && memberH.filter(function (h) { return h === "my/ideas/"; }).length === 1, "a signed-in non-owner sees private Listify instead of the public one");
assert(memberH.indexOf("purchasify/index.html") === -1 && memberH.indexOf("my/shopping/") !== -1, "a signed-in non-owner sees private Purchasify instead of the public one");
assert(memberH.indexOf("my/clock/") === -1 && memberH.indexOf("clockify/index.html") === -1, "hidden Clockify stays hidden for a signed-in non-owner");
assert(once(memberH), "signed-in non-owner list has one href per app");

var dup = twins.hidePublicTwins({ top: [{ href: "my/ideas/", en: "Listify", priv: true }], rest: [{ href: "listify/index.html", en: "Listify" }] }, catalog);
assert(hrefs(dup).length === 1 && hrefs(dup)[0] === "my/ideas/", "a public twin later in the list does not add a second Listify");

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("all passed");
