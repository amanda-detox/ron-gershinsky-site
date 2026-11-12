/* Sandbox install rules. Run: node sandbox-shared/rg-install.test.js */
"use strict";
var fs = require("fs");
var path = require("path");
var RG = require("./rg-install.js");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL " + msg); failed++; }
  else console.log("ok " + msg);
}
var root = path.join(__dirname, "..");

var prompted = RG.plan({ lang: "he", appName: "ליסטיפיי", platform: "android", standalone: false, hasPrompt: true, installed: false });
assert(prompted.action === "prompt" && prompted.show && prompted.text === "", "a real Chrome prompt is used and no menu instructions are shown");

var inside = RG.plan({ lang: "he", appName: "ליסטיפיי", platform: "android", standalone: true, hasPrompt: false, installed: false });
assert(inside.action === "hint" && inside.show && inside.openInBrowser, "inside an installed app the button stays and asks to open Chrome");
assert(inside.text.indexOf("היליפיי") >= 0 && inside.text.indexOf("טווח") >= 0, "the in-app hint names the parent app and its scope");
assert(inside.text.indexOf("תפריט הדפדפן (⋮) ובוחרים") < 0, "the in-app hint is not the old menu-only line");

var menu = RG.plan({ lang: "he", appName: "קניותיפיי", platform: "android", standalone: false, hasPrompt: false, installed: false, underMyHub: true });
assert(menu.action === "hint" && menu.text.indexOf("כבר קיימת") >= 0, "the browser hint explains why the menu says the app already exists");
assert(menu.text.indexOf("לא עושה כלום") >= 0 && menu.text.indexOf("נתוני האתר") >= 0, "the browser hint explains a silent Open and clearing site data");
assert(menu.text.indexOf("הפרטי שלי") >= 0, "Purchasify also mentions the private-hub scope");
assert(menu.openInBrowser === false, "a normal Chrome tab does not need the escape link");

var ideasHub = RG.plan({ lang: "he", appName: "ליסטיפיי", platform: "android", standalone: false, hasPrompt: false, installed: false });
assert(ideasHub.text.indexOf("הפרטי שלי") < 0, "Listify sandbox is not under my/ so the hub line stays off");

var desk = RG.plan({ lang: "en", appName: "Listify", platform: "desktop", standalone: false, hasPrompt: false, installed: false });
assert(desk.text.indexOf("address bar") >= 0 && desk.text.indexOf("/ron-gershinsky-site/") >= 0, "desktop hint names the address-bar icon and the parent scope");

var ios = RG.plan({ lang: "he", appName: "ליסטיפיי", platform: "ios", standalone: false, hasPrompt: false, installed: false });
assert(ios.text.indexOf("Safari") >= 0 && ios.text.indexOf("Chrome באייפון לא מתקין") >= 0, "iPhone instructions stay on Safari");

var done = RG.plan({ lang: "he", appName: "ליסטיפיי", installed: true, hasPrompt: true });
assert(done.show === false && done.action === "none", "after install the button is hidden even if a prompt was stored");

var intent = RG.openHref("https://amanda-detox.github.io/ron-gershinsky-site/ideas-sandbox/", { platform: "android", standalone: true });
assert(intent.indexOf("intent://amanda-detox.github.io/ron-gershinsky-site/ideas-sandbox/") === 0 && intent.indexOf("package=com.android.chrome") >= 0, "Android standalone opens the same page in Chrome");
var plain = RG.openHref("https://amanda-detox.github.io/ron-gershinsky-site/ideas-sandbox/#x", { platform: "android", standalone: false });
assert(plain === "https://amanda-detox.github.io/ron-gershinsky-site/ideas-sandbox/", "a Chrome tab keeps a normal https link");

function quotedFiles(swRel) {
  var src = fs.readFileSync(path.join(root, swRel), "utf8");
  var block = src.split("var FILES = [")[1].split("];")[0];
  return block.match(/"([^"]+)"/g).map(function (s) { return s.slice(1, -1); });
}
function assertCached(swRel) {
  var dir = path.dirname(path.join(root, swRel));
  quotedFiles(swRel).forEach(function (file) {
    var bare = file.split("?")[0];
    var abs = path.resolve(dir, bare);
    var ok = fs.existsSync(abs);
    assert(ok, swRel + " caches a real file: " + file);
  });
}
assert(fs.readFileSync(path.join(root, "ideas-sandbox/sw.js"), "utf8").indexOf("rg-sbx-ideas-v23") >= 0, "Listify sandbox cache is v23");
assert(fs.readFileSync(path.join(root, "my/shopping-sandbox/sw.js"), "utf8").indexOf("rg-sbx-shopping-v4") >= 0, "Purchasify sandbox cache is v4");
assert(fs.readFileSync(path.join(root, "content-sandbox/sw.js"), "utf8").indexOf("rg-sbx-content-v1") >= 0, "content sandbox cache is v1");
assertCached("ideas-sandbox/sw.js");
assertCached("my/shopping-sandbox/sw.js");
assertCached("content-sandbox/sw.js");

var ideasHtml = fs.readFileSync(path.join(root, "ideas-sandbox/index.html"), "utf8");
var shopHtml = fs.readFileSync(path.join(root, "my/shopping-sandbox/index.html"), "utf8");
var contentHtml = fs.readFileSync(path.join(root, "content-sandbox/index.html"), "utf8");
assert(ideasHtml.indexOf("rg-sbx-ideas-inst") >= 0, "Listify dismiss key is unchanged");
assert(shopHtml.indexOf("rg-sbx-shopping-inst") >= 0, "Purchasify dismiss key is unchanged");
assert(ideasHtml.indexOf("sandbox-shared/rg-install.js?v=1") >= 0 && shopHtml.indexOf("sandbox-shared/rg-install.js?v=1") >= 0, "both apps load the shared install helper");
assert(ideasHtml.indexOf("beforeinstallprompt") >= 0 && contentHtml.indexOf("RGInstall.attach") >= 0, "the prompt is captured and the button is attached");
assert(fs.readFileSync(path.join(root, "index.html"), "utf8").indexOf("content-sandbox") < 0, "the live home page does not link the content sandbox");

function within(scopeHref, targetHref) {
  var scope = new URL(scopeHref);
  var target = new URL(targetHref);
  if (scope.origin !== target.origin) return false;
  var sp = scope.pathname;
  if (sp.charAt(sp.length - 1) !== "/") sp += "/";
  return target.pathname === scope.pathname || target.pathname.indexOf(sp) === 0;
}
function manifestAt(rel, manifestUrl) {
  var m = JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
  var id = new URL(m.id, manifestUrl).href;
  var start = new URL(m.start_url, manifestUrl).href;
  var scope = new URL(m.scope, manifestUrl).href;
  assert(m.prefer_related_applications !== true, rel + " does not prefer another app over itself");
  assert(within(scope, start), rel + " start_url is inside its scope");
  assert(within(scope, id), rel + " id is inside its scope");
  assert(id.indexOf("https://amanda-detox.github.io/listify/") < 0 && id.indexOf("https://amanda-detox.github.io/purchasify/") < 0, rel + " id is not the short public id");
  return { id: id, start: start, scope: scope };
}
var origin = "https://amanda-detox.github.io";
var ideas = manifestAt("ideas-sandbox/manifest.json", origin + "/ron-gershinsky-site/ideas-sandbox/manifest.json");
var shop = manifestAt("my/shopping-sandbox/manifest.json", origin + "/ron-gershinsky-site/my/shopping-sandbox/manifest.json");
var content = manifestAt("content-sandbox/manifest.json", origin + "/ron-gershinsky-site/content-sandbox/manifest.json");
assert(ideas.id !== shop.id && ideas.id !== content.id && shop.id !== content.id, "sandbox ids are distinct");
var liveRoot = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
var parentScope = new URL(liveRoot.scope, origin + "/ron-gershinsky-site/manifest.json").href;
assert(within(parentScope, ideas.start) && within(parentScope, shop.start) && within(parentScope, content.start), "the live parent scope still covers these sandboxes, which is why the hint exists");
var liveIdeas = manifestAt("my/ideas/manifest.json", origin + "/ron-gershinsky-site/my/ideas/manifest.json");
var liveShop = manifestAt("my/shopping/manifest.json", origin + "/ron-gershinsky-site/my/shopping/manifest.json");
assert(liveIdeas.id !== ideas.id && liveShop.id !== shop.id, "sandbox ids do not collide with live Listify and Purchasify");
assert(within(parentScope, liveIdeas.start) && within(parentScope, liveShop.start), "live Listify and Purchasify are inside the parent scope");

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("all install checks passed");
