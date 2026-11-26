/* Home screen and menu for Wealthify. Run: node wealthify/home.test.js */
var fs = require("fs");
var path = require("path");
var root = path.join(__dirname, "..");
var live = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
var sbx = fs.readFileSync(path.join(root, "wealthify-sandbox/index.html"), "utf8");
var liveSw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
var sbxSw = fs.readFileSync(path.join(root, "wealthify-sandbox/sw.js"), "utf8");
var backupSw = fs.readFileSync(path.join(root, "backups/wealthify-live-2026-11-26-v22/sw.js"), "utf8");
var fail = 0;
function assert(cond, msg) {
  if (!cond) { fail++; console.error("FAIL " + msg); }
  else console.log("ok " + msg);
}
var order = ["שפה", "זום", "מצב לילה", "ערכת נושא", "הדפסה", "שיחזור", "חיפוש", "הצג/הסתר הערות", "הוסף פריט", "היסטוריה", "גיבוי", "התקנה למסך הבית", "חשבון"];
var at = -1;
order.forEach(function (label) {
  var i = live.indexOf(">" + label + "<");
  assert(i > at, "menu keeps " + label + " in order");
  at = i;
});
assert(live.indexOf('ansKey: "rg-wealth-answers-v2"') !== -1, "live answers stay on rg-wealth-answers-v2");
assert(live.indexOf('data-theme-key="rg-wealthify-theme"') !== -1, "live theme key is unchanged");
assert(live.indexOf("פוטנציאל רווח: גדול מאוד") !== -1, "the questionnaire wording גדול מאוד is unchanged");
assert(live.indexOf("שאלון אבחון") < live.indexOf("דרכים ליצירת הון") && live.indexOf("דרכים ליצירת הון") < live.indexOf("דרכים ליצירת חופש"), "home options stay in order");
assert(live.indexOf('open: "flow"') !== -1 && live.indexOf('open: "soon"') !== -1, "tiles are data-driven, with the questionnaire and placeholders");
assert(live.indexOf("<title>Wealthify</title>") !== -1 && live.indexOf('doc: "Wealthify"') !== -1, "the live tab title stays Wealthify");
assert(live.indexOf('id="app-home"') !== -1 && live.indexOf('id="menu-btn"') !== -1 && live.indexOf('src="icon.svg"') !== -1, "the existing app icon is the home button");
assert(live.indexOf("icons-preview") === -1 && live.indexOf("wealthify/icons/") === -1, "no separate icon set or preview page");
assert(liveSw.indexOf('var CACHE = "rg-wealth-v23"') !== -1 && live.indexOf("sw.js?v=23") !== -1, "live cache is rg-wealth-v23");
assert(backupSw.indexOf('var CACHE = "rg-wealth-v22"') !== -1, "the backup keeps the previous live cache");
assert(sbx.indexOf('ansKey: "rg-wealth-sbx-answers-v1"') !== -1 && sbx.indexOf("rg-wealth-answers-v2") === -1, "sandbox answers stay on their own key");
assert(sbx.indexOf('data-theme-key="rg-wealth-sbx-theme"') !== -1 && sbx.indexOf("rg-wealthify-theme") === -1, "sandbox theme key stays separate");
assert(sbx.indexOf("<title>Wealthify Sandbox</title>") !== -1, "sandbox tab title still says Sandbox");
assert(sbxSw.indexOf('var CACHE = "rg-wealth-sbx-v3"') !== -1 && sbx.indexOf("sw.js?v=3") !== -1, "sandbox cache is the next sbx version");
assert(sbxSw.indexOf('k.indexOf("rg-wealth-sbx-")') !== -1, "sandbox cache cleanup does not target the live cache name");
assert(live.indexOf("validBackup") !== -1 && live.indexOf("restoreAsk") !== -1 && live.indexOf("downloadBackup") !== -1, "backup and restore ask before replacing answers");
var liveIcon = fs.readFileSync(path.join(__dirname, "icon.svg"));
var backupIcon = fs.readFileSync(path.join(root, "backups/wealthify-live-2026-11-26-v22/icon.svg"));
assert(liveIcon.equals(backupIcon), "the app icon file is unchanged");
if (fail) { console.error(fail + " failed"); process.exit(1); }
console.log("all checks passed");
