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
assert(live.indexOf('open: "flow"') !== -1 && live.indexOf('open: "list"') !== -1, "tiles are data-driven, with the questionnaire and the lists");
assert(live.indexOf("<title>Wealthify</title>") !== -1 && live.indexOf('doc: "Wealthify"') !== -1, "the live tab title stays Wealthify");
assert(live.indexOf('id="app-home"') !== -1 && live.indexOf('id="menu-btn"') !== -1 && live.indexOf('src="icon-192.png?v=26"') !== -1, "the home button uses the app icon");
assert(live.indexOf(".hero-home,.menubtn{width:56px;height:56px;min-width:56px;min-height:56px;box-sizing:border-box}") !== -1 && sbx.indexOf(".hero-home,.menubtn{width:56px;height:56px;min-width:56px;min-height:56px;box-sizing:border-box}") !== -1, "the home icon and the hamburger are the same 56px box");
assert(live.indexOf("icons-preview") === -1 && live.indexOf("wealthify/icons/") === -1, "no separate icon set or preview page");
assert(liveSw.indexOf('var CACHE = "rg-wealth-v26"') !== -1 && live.indexOf("sw.js?v=26") !== -1 && live.indexOf('cache: "rg-wealth-v26"') !== -1, "live cache is rg-wealth-v26");
assert(backupSw.indexOf('var CACHE = "rg-wealth-v22"') !== -1, "the backup keeps the previous live cache");
assert(sbx.indexOf('ansKey: "rg-wealth-sbx-answers-v1"') !== -1 && sbx.indexOf("rg-wealth-answers-v2") === -1, "sandbox answers stay on their own key");
assert(sbx.indexOf('data-theme-key="rg-wealth-sbx-theme"') !== -1 && sbx.indexOf("rg-wealthify-theme") === -1, "sandbox theme key stays separate");
assert(sbx.indexOf("<title>Wealthify Sandbox</title>") !== -1, "sandbox tab title still says Sandbox");
assert(sbxSw.indexOf('var CACHE = "rg-wealth-sbx-v6"') !== -1 && sbx.indexOf("sw.js?v=6") !== -1 && sbx.indexOf('cache: "rg-wealth-sbx-v6"') !== -1, "sandbox cache is the next sbx version");
assert(live.indexOf('cloudApp: "wealthify"') !== -1 && sbx.indexOf('cloudApp: "sbxwealthify"') !== -1 && sbx.indexOf('A.set(app, "answers"') !== -1 && live.indexOf('A.set(app, "lists"') !== -1, "live and sandbox sync through their own Appwrite app ids");
assert(live.indexOf('listsKey: "rg-wealth-lists"') !== -1 && live.indexOf('listPrefix: "rg-wealth-list-"') !== -1 && live.indexOf('id="add-list"') !== -1 && live.indexOf('"+ רשימה חדשה"') !== -1, "home can add a list stored on an rg-wealth index");
assert(sbx.indexOf('listsKey: "rg-wealth-sbx-lists"') !== -1 && sbx.indexOf('listPrefix: "rg-wealth-sbx-list-"') !== -1 && sbx.indexOf('listsKey: "rg-wealth-lists"') === -1, "sandbox lists stay in the sandbox namespace");
assert(live.indexOf('className = "lmore"') !== -1 && live.indexOf('opt.id !== "diagnosis"') !== -1 && live.indexOf("optMove") !== -1, "each tile has a menu and the questionnaire cannot be deleted");
assert(sbxSw.indexOf('k.indexOf("rg-wealth-sbx-")') !== -1, "sandbox cache cleanup does not target the live cache name");
assert(live.indexOf("validBackup") !== -1 && live.indexOf("restoreAsk") !== -1 && live.indexOf("downloadBackup") !== -1, "backup and restore ask before replacing answers");
["icon-192.png", "icon-512.png"].forEach(function (name) {
  var a = fs.readFileSync(path.join(__dirname, name));
  var b = fs.readFileSync(path.join(root, "wealthify-sandbox", name));
  var old = fs.readFileSync(path.join(root, "backups/wealthify-live-2026-11-26-v22", name));
  assert(a.equals(b), name + " matches on live and sandbox");
  assert(!a.equals(old), name + " replaces the previous app icon");
});
var liveManifest = JSON.parse(fs.readFileSync(path.join(__dirname, "manifest.json"), "utf8"));
assert(live.indexOf("מסחר במימון מלא") !== -1 && live.indexOf("למידת סקיל של הכנסה גבוהה") !== -1 && live.indexOf("להציע שירות או מוצר או פלטפורמה או אפליקציה") !== -1, "wealth list seeds the three items");
assert(live.indexOf("הורדת תשלומי מס ל-0% חוקית לגמרי") < live.indexOf("הקמת מבנה ארגוני שמגן על נכסיך") && live.indexOf("השגת מגוון כרטיסי אשראי איכותיים עם הטבות מהממות") > live.indexOf("השגת ויזות, דרכונים ואזרחויות נוספות"), "freedom list seeds the five items in order");
assert(live.indexOf('wealth: "rg-wealth-list-wealth-v1"') !== -1 && live.indexOf('freedom: "rg-wealth-list-freedom-v1"') !== -1 && live.indexOf('ansKey: "rg-wealth-answers-v2"') !== -1, "new list keys stay beside the existing answers key");
assert(sbx.indexOf('wealth: "rg-wealth-sbx-list-wealth-v1"') !== -1 && sbx.indexOf("rg-wealth-list-wealth-v1") === -1, "sandbox lists use their own keys");
assert(live.indexOf("הנתונים באזור הזה נשמרים בחשבון שלך, ורק אתה יכול לראות אותם.") !== -1 && live.indexOf('בע\\"מ 2026') !== -1, "footer lock line and copyright are the new wording");
assert(live.indexOf('id="status"') !== -1 && live.indexOf('id="lastsync"') !== -1 && live.indexOf('id="cloudat"') !== -1 && live.indexOf('id="build"') !== -1, "sync status has the four Listify lines");
assert(live.indexOf("נחתך") === -1 && live.indexOf("לחתוך") === -1, "the page does not use those words");
assert(liveManifest.id === "/ron-gershinsky-site/wealthify/" && liveManifest.name === "שפעלי" && liveManifest.start_url === "./", "live manifest name, id, and start_url stay");
var sbxManifest = JSON.parse(fs.readFileSync(path.join(root, "wealthify-sandbox/manifest.json"), "utf8"));
assert(sbxManifest.id === "/ron-gershinsky-site/wealthify-sandbox/" && sbxManifest.start_url === "/ron-gershinsky-site/wealthify-sandbox/", "sandbox manifest id and start_url stay");
if (fail) { console.error(fail + " failed"); process.exit(1); }
console.log("all checks passed");
