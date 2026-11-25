/* Balancify checks. Run: node balancify/app.test.js */
var fs = require("fs");
var path = require("path");
var vm = require("vm");
var assert = require("assert");
var dir = __dirname;
function read(name) { return fs.readFileSync(path.join(dir, name), "utf8"); }
var ctx = { window: {} };
vm.runInNewContext(read("data.js"), ctx);
var data = ctx.window.BAL_DATA;
var M = require("./model.js");
var SS = require("./rg-sync-status.js");

assert.strictEqual(data.APP_NAME.he, "איזוניפיי");
assert.strictEqual(data.APP_NAME.en, "Balancify");

var fresh = M.buildFromLegacy(data, function () { return null; }, 1000);
var lists = M.lists(fresh.items);
assert.strictEqual(lists.length, 5, "five starting lists");
assert.strictEqual(M.nameOf(lists[0], "he"), "רמת סטרס גבוהה?");
assert.strictEqual(M.nameOf(lists[3], "he").indexOf("וולנס") > -1, true, "4th list is the wellness list");
var stress = M.itemsInList(fresh.items, "stress");
assert.strictEqual(M.textOf(stress[0], "he"), "תנועה");
assert.ok(M.noteOf(stress[0], "he").indexOf("קפיצות") !== -1, "detail becomes the note");
var air = M.itemsInList(fresh.items, "wellness").filter(function (x) { return M.textOf(x, "he") === "טיהור אוויר"; })[0];
assert.ok(air && M.noteOf(air, "he").indexOf("HEPA") !== -1, "info text becomes the note");
assert.ok(M.itemsInList(fresh.items, "power").some(function (x) { return M.textOf(x, "he").indexOf("מה אני מנסה") === 0; }), "research questions stay as items");
assert.ok(!M.itemsInList(fresh.items, "wellness").some(function (x) { return M.noteOf(x, "he") === M.SOON_HE; }), "placeholder explanations are not notes");

var hidden = { v: 2, notes: { "b:chaos:0": { he: "הערה שלי", en: "" } }, titles: { "b:stress:1": { he: "קול חדש", en: "New voice" } }, custom: { "u:mine": { id: "u:mine", list: "chaos", he: "פריט שלי", en: "Mine", note: { he: "נשמר", en: "" }, seq: 5 } }, hidden: { "b:stress:0": 1 }, loc: { "b:dissoc:0": "chaos" }, order: {}, marks: { "b:stress:2": "ok" } };
var kept = M.buildFromLegacy(data, function (k) {
  if (k === M.USER_KEY) return JSON.stringify(hidden);
  if (k === M.CHK_PREFIX + "chaos") return JSON.stringify(["תה"]);
  return null;
}, 1000);
assert.ok(!kept.items["b:stress:0"], "a hidden item stays out");
assert.strictEqual(M.textOf(kept.items["b:stress:1"], "he"), "קול חדש");
assert.strictEqual(M.noteOf(kept.items["b:chaos:0"], "he"), "הערה שלי");
assert.strictEqual(kept.items["u:mine"].sec, "chaos");
assert.strictEqual(M.noteOf(kept.items["u:mine"], "he"), "נשמר");
assert.strictEqual(kept.items["b:dissoc:0"].sec, "chaos", "moved item stays on the list it was moved to");
assert.strictEqual(kept.items["b:stress:2"].mark, "ok");
var tea = M.itemsInList(kept.items, "chaos").filter(function (x) { return x.he === "תה"; })[0];
assert.strictEqual(tea && tea.mark, "ok", "a checked guideline is kept as a mark");

var legacyRaw = getUserKey = null;
var plan = M.planSync(fresh.items, null, SS.mergeRecords);
assert.strictEqual(plan.upload, true, "first sync uploads");
assert.strictEqual(plan.keptLocal, true, "first sync keeps every local record");
assert.strictEqual(Object.keys(plan.items).length, Object.keys(fresh.items).length);
var cloud = { items: { extra: { id: "extra", sec: "stress", he: "מהענן", at: 50, order: 99, _f: { he: 50, "~": 50 } } } };
var both = M.planSync(fresh.items, cloud, SS.mergeRecords);
assert.ok(both.items.extra && both.items["b:stress:1"], "cloud and local records are both kept");
assert.strictEqual(both.keptLocal, true);
assert.strictEqual(M.versionLabel("rg-balancify-v33"), "balancify-v33");
assert.strictEqual(M.APP, "balancify");
assert.strictEqual(M.KEY, "items");

var html = read("index.html"), app = read("app.js"), css = read("style.css"), sw = read("sw.js"), man = read("manifest.json"), ver = read("version.js");
assert.ok(html.indexOf("איזוניפיי") !== -1 && man.indexOf("איזוניפיי") !== -1, "Hebrew name is in the title and the manifest");
assert.ok(html.indexOf("eran.org") === -1 && app.indexOf("eran.org") === -1 && app.indexOf("ער״ן") === -1, "the ERAN line is gone");
assert.ok(app.indexOf("החלק ימינה") === -1 && html.indexOf("החלק ימינה") === -1, "the swipe hint is gone");
assert.ok(app.indexOf("בחר אחת או כמה") === -1 && html.indexOf('id="instr"') === -1 && html.indexOf('id="list-title"') === -1, "the in-list heading and instruction are gone");
assert.ok(app.indexOf('class="notetog') !== -1 && app.indexOf('class="handle ihandle"') !== -1, "items have an i toggle and a reorder handle");
assert.ok(app.indexOf('class="lmore') !== -1 && app.indexOf("optMove") !== -1 && app.indexOf("אשפה") !== -1, "each list has a ⋮ menu");
assert.ok(app.indexOf("nbtn") === -1 && app.indexOf("M16.5 3.5") === -1, "the pencil edit button is gone");
assert.ok(html.indexOf('id="status"') !== -1 && html.indexOf('id="hist-btn"') !== -1 && html.indexOf('id="backup-link"') !== -1, "sync, history, and backup are on the page");
assert.ok(html.indexOf('class="histrow"') === -1, "history and backup left the footer");
assert.ok(app.indexOf("balancify") !== -1 && read("rg-sync-status.js").indexOf('appName !== "balancify"') !== -1, "cloud app id is balancify");
assert.ok(ver.indexOf("rg-balancify-v33") !== -1 && sw.indexOf("RG_BALANCIFY_CACHE") !== -1, "cache version is v33");
assert.ok(ver.indexOf("rg-balancify-v32") === -1, "the old cache name is not the current one");
assert.ok(html.indexOf("app.js?v=19") !== -1 && sw.indexOf("app.js?v=19") !== -1, "app cache param is bumped");
assert.ok(html.indexOf("style.css?v=18") !== -1 && sw.indexOf("style.css?v=18") !== -1, "style cache param is bumped");
assert.ok(html.indexOf("version.js?v=7") !== -1 && sw.indexOf("version.js?v=7") !== -1, "version.js cache param is bumped");
assert.ok(app.indexOf('x.mark === "ok" ? null : "ok"') !== -1, "a check toggles between chosen and empty");
assert.ok(app.indexOf('=== "ok" ? "no"') === -1 && app.indexOf("on-no") === -1 && app.indexOf('? "✕"') === -1, "the skipped X state is not rendered");
assert.ok(html.indexOf('id="menu-btn"') !== -1 && html.indexOf('id="appmenu"') !== -1, "one menu button opens the list tools");
["חזרה", "הערות", "הוספה", "הדפסה", "חיפוש", "היסטוריה", "גיבוי", "שפה", "זום", "תצוגה", "צבעים", "חשבון"].forEach(function (word) {
  assert.ok(html.indexOf(word) !== -1, "menu has " + word);
});
assert.ok(html.indexOf('class="hero"') < html.indexOf('id="menu-btn"') && html.indexOf('id="menu-btn"') < html.indexOf('id="home"'), "the menu button is in the app header, before either screen");
assert.ok(app.indexOf('clickBar(".rgacc-btn")') !== -1, "the account menu item clicks the shared pill");
assert.ok(css.indexOf("grid-template-columns:44px 44px minmax(0,1fr) 44px") !== -1, "every item row uses the same fixed columns");
assert.ok(css.indexOf(".irow.has-note{display:grid") === -1 && css.indexOf("margin-inline-end:-8px") === -1, "note rows and the handle margin no longer shift the checkbox");
assert.ok(html.indexOf('class="homebtn"') === -1 && html.indexOf('class="addform"') === -1, "the old list header is gone");
assert.ok(css.indexOf(".rgtb-bg") !== -1 && css.indexOf(".rgtb-theme") !== -1 && css.indexOf(".rgtb-zoom") !== -1 && css.indexOf(".rgtb-lang") !== -1, "the shared top-bar icons are hidden in this app");
assert.ok(css.indexOf(".txt{display:block;font-size:18px;font-weight:400") !== -1, "the item title is 18px and not bold");
assert.ok(css.indexOf(".note{display:block;margin:0 0 6px;padding:0 5px;") !== -1, "an open note has 5px of padding on each side");
assert.ok(app.indexOf('class="sec"') === -1, "group headings are not rendered");
assert.ok(read("model.js").indexOf("groupHe") !== -1, "group labels stay stored on the items");
assert.ok(css.indexOf("width:calc(100% - 24px)") !== -1 && css.indexOf("max-width:640px") !== -1, "the undo bar is full width");
assert.ok(css.indexOf(".tundo{flex:none;min-width:44px;min-height:44px") !== -1, "undo is a 44px target");
assert.ok(html.indexOf('id="title"') === -1 && html.indexOf('id="tagline"') === -1, "the header title and tagline are gone");
assert.ok(html.indexOf('id="app-home"') !== -1, "the app icon is a home button");
assert.ok(css.indexOf("@media print") !== -1, "printing has its own stylesheet");
assert.ok(app.indexOf('clickBar(".rgtb-theme")') !== -1 && app.indexOf('clickBar(".rgtb-bg")') !== -1 && app.indexOf('clickBar(".rgtb-lang > .rgtb-b")') !== -1 && app.indexOf('clickBar(".rgtb-zoom > .rgtb-b")') !== -1, "menu items call the top-bar buttons");
assert.ok(app.indexOf("AXIS = 12") !== -1 && app.indexOf("SWIPE = 0.35") !== -1, "swipe thresholds match Listify");
assert.ok(app.indexOf('closest(".notetog")') !== -1, "a swipe does not start on the note toggle");
assert.ok(app.indexOf("delWithUndo") !== -1 && app.indexOf("delListWithUndo") !== -1, "a destructive swipe keeps undo");
assert.ok(app.indexOf("rg-balancify") !== -1 && read("model.js").indexOf("balancify") !== -1, "storage keys and the app id stay");
assert.ok(css.indexOf("width:36px") !== -1 && css.indexOf("height:36px") !== -1 && css.indexOf("overflow-wrap:anywhere") !== -1, "the i target is 36px and text can wrap");
assert.ok(css.indexOf("#f4b183") === -1 && css.indexOf("#c4602e") === -1, "the old orange accents are gone");
["purple", "pink", "orange", "#888", "#999", "#ccc"].forEach(function (bad) {
  assert.ok(css.toLowerCase().indexOf(bad) === -1, "css has no " + bad);
});

var adopted = M.adopt(data, function (k) { return k === M.DOC_KEY ? JSON.stringify(fresh) : null; });
assert.strictEqual(adopted.fresh, false, "an existing document is kept");
assert.strictEqual(adopted.doc.items["b:stress:1"].he, fresh.items["b:stress:1"].he);

assert.strictEqual(M.USER_KEY, "rg-balancify-user");
assert.strictEqual(M.ORD_KEY, "rg-balancify-order");
assert.strictEqual(M.CHK_PREFIX, "rg-balancify-checked-");
assert.strictEqual(M.DOC_KEY, "rg-balancify-doc");
assert.strictEqual(M.CLAIM_KEY, "rg-balancify-claimed");
assert.strictEqual(M.cacheKey("u1"), "rg-balancify-v1:u1");
assert.strictEqual(M.histKey("u1"), "rg-balancify-hist2:u1");
assert.strictEqual(M.histKey(""), "rg-balancify-hist2:local");
assert.strictEqual(M.lastKey("u1"), "rg-balancify-lastsync:u1");
assert.strictEqual(M.noteKey("u1"), "rg-balancify-notefold:u1");
assert.strictEqual(M.noteKey(""), "rg-balancify-notefold:local");

/* The current live app stores a v2 user record (order lives inside it), plus the
   older order key and the checked lists. All three are read. None are removed. */
var liveUser = {
  v: 2,
  notes: { "b:chaos:0": { he: "הערה חיה", en: "" } },
  titles: { "b:stress:1": { he: "קול חי", en: "Live voice" } },
  custom: { "u:live": { id: "u:live", list: "stress", he: "פריט חי", en: "Live item", note: { he: "נשמר חי", en: "" }, seq: 4 } },
  hidden: { "b:stress:0": 1 },
  loc: { "b:dissoc:0": "chaos" },
  order: { chaos: ["b:chaos:0", "b:chaos:1"] },
  marks: { "b:stress:3": "no" }
};
var liveStore = {};
liveStore["rg-balancify-user"] = JSON.stringify(liveUser);
liveStore["rg-balancify-order"] = JSON.stringify({ chaos: ["שוקו", "תה"] });
liveStore["rg-balancify-checked-stress"] = JSON.stringify(["מגע"]);
var liveBefore = JSON.stringify(liveStore);
function liveGet(k) { return Object.prototype.hasOwnProperty.call(liveStore, k) ? liveStore[k] : null; }
var fromLive = M.adopt(data, liveGet);
assert.strictEqual(JSON.stringify(liveStore), liveBefore, "old live keys are left in place");
assert.strictEqual(fromLive.fresh, true, "the first load adopts the old live keys into a new document");
assert.ok(!fromLive.doc.items["b:stress:0"], "a hidden live item stays out");
assert.strictEqual(M.textOf(fromLive.doc.items["b:stress:1"], "he"), "קול חי");
assert.strictEqual(M.noteOf(fromLive.doc.items["b:chaos:0"], "he"), "הערה חיה");
assert.strictEqual(fromLive.doc.items["u:live"].sec, "stress");
assert.strictEqual(M.noteOf(fromLive.doc.items["u:live"], "he"), "נשמר חי");
assert.strictEqual(fromLive.doc.items["b:dissoc:0"].sec, "chaos", "a moved live item stays on the list it was moved to");
assert.strictEqual(fromLive.doc.items["b:stress:3"].mark, "no");
var liveChaos = M.itemsInList(fromLive.doc.items, "chaos");
assert.strictEqual(liveChaos[0].he, "תה", "order saved inside the live user record is kept");
assert.strictEqual(liveChaos[1].he, "שוקו");
var touch = M.itemsInList(fromLive.doc.items, "stress").filter(function (x) { return x.he === "מגע"; })[0];
assert.strictEqual(touch && touch.mark, "ok", "rg-balancify-checked-* is kept as a mark");
var liveUp = M.planSync(fromLive.doc.items, null, SS.mergeRecords);
assert.strictEqual(liveUp.upload, true, "adopted live data is uploaded on the first sync");
assert.strictEqual(liveUp.keptLocal, true, "the first sync keeps the adopted live records");
assert.ok(liveUp.items["u:live"]);
var emptyCloud = M.planSync(fromLive.doc.items, { v: 1, items: {} }, SS.mergeRecords);
assert.strictEqual(emptyCloud.upload, true, "an empty cloud copy is replaced by the adopted data");
assert.strictEqual(emptyCloud.keptLocal, true, "an empty cloud copy does not wipe adopted live data");
assert.ok(emptyCloud.items["u:live"] && emptyCloud.items["b:stress:1"], "local live records survive an empty cloud copy");

var fromOrder = M.buildFromLegacy(data, function (k) {
  if (k === "rg-balancify-user") return JSON.stringify({ v: 1 });
  if (k === "rg-balancify-order") return JSON.stringify({ chaos: ["שוקו", "תה"] });
  if (k === "rg-balancify-checked-chaos") return JSON.stringify(["תה"]);
  return null;
}, 1000);
var ordered = M.itemsInList(fromOrder.items, "chaos");
assert.strictEqual(ordered[0].he, "שוקו", "rg-balancify-order is adopted when the user record is still the older shape");
assert.strictEqual(ordered[1].he, "תה");
assert.strictEqual(ordered[1].mark, "ok", "a checked item on that older record is kept");

var manJson = JSON.parse(man);
assert.strictEqual(manJson.id, "/ron-gershinsky-site/balancify/");
assert.strictEqual(manJson.start_url, "./");
assert.strictEqual(manJson.scope, "./");
assert.ok(html.indexOf("rg-balancify-theme") !== -1 && html.indexOf("rg-balancify-bg") !== -1, "theme and background keys stay the live ones");
assert.ok(html.indexOf('syncPrefs(["rg-lang", "rg-balancify-theme", "rg-balancify-bg"])') !== -1, "theme and background still sync with the account");
assert.ok(html.indexOf("sandbox-tag") === -1, "the sandbox badge is gone");
assert.ok(read("model.js").indexOf("removeItem") === -1, "adopting the old keys never deletes them");
["app.js", "model.js", "rg-sync-status.js", "index.html", "sw.js", "version.js", "manifest.json", "style.css", "data.js"].forEach(function (name) {
  var s = read(name);
  assert.ok(s.toLowerCase().indexOf("sbx") === -1, name + " has no sandbox id");
  assert.ok(s.toLowerCase().indexOf("sandbox") === -1, name + " is not labeled as a sandbox");
});

console.log("balancify tests ok");
