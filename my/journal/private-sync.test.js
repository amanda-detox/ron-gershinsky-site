/* Private Journalify and Purchasify keep their own keys and gain the live sync status.
   Run: node my/journal/private-sync.test.js */
"use strict";
var fs = require("fs");
var path = require("path");
var SS = require("./rg-sync-status.js");
var failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL " + msg); failed++; }
  else console.log("ok " + msg);
}
assert(SS.ASK_Q === "זיהיתי הרבה מחיקות ורוצה לוודא שאתה בטוח לגבי זה?", "the private helper asks in the exact words");
assert(SS.ASK_YES === "כן, העלי לענן" && SS.ASK_NO === "לא, שחזרי מחיקות", "the private helper buttons use the exact wording");
assert(SS.REQ_MS === 15000, "hung requests still time out after 15s");

var root = path.join(__dirname, "../..");
var store = fs.readFileSync(path.join(root, "my/store.js"), "utf8");
var jStore = fs.readFileSync(path.join(__dirname, "rg-store.js"), "utf8");
var jApp = fs.readFileSync(path.join(__dirname, "app.js"), "utf8");
var jHtml = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
var jSw = fs.readFileSync(path.join(__dirname, "sw.js"), "utf8");
var jStr = fs.readFileSync(path.join(__dirname, "strings.js"), "utf8");
var sApp = fs.readFileSync(path.join(root, "my/shopping/app.js"), "utf8");
var sHtml = fs.readFileSync(path.join(root, "my/shopping/index.html"), "utf8");
var sSw = fs.readFileSync(path.join(root, "my/shopping/sw.js"), "utf8");
var jHelp = fs.readFileSync(path.join(__dirname, "rg-sync-status.js"), "utf8");
var sHelp = fs.readFileSync(path.join(root, "my/shopping/rg-sync-status.js"), "utf8");

assert(store.indexOf("tooManyGone") === -1, "the shared private store is unchanged");
assert(jHelp === sHelp, "both private apps load the same status helper");
assert(jStore.indexOf('return "rg-" + APP + "-v1:" + id') !== -1, "private journal keeps the rg-<app>-v1 storage key");
assert(jStore.indexOf("pubyomanli") === -1 && jStore.indexOf("rg-pub-yomanli") === -1, "private journal store does not use the public journal");
assert(jStore.indexOf("restoreLive") !== -1 && jStore.indexOf("confirmBulk") !== -1, "private journal can restore or upload a large deletion");
assert(jApp.indexOf('RGStore("myjournal"') !== -1, "private journal still opens myjournal");
assert(jApp.indexOf("pubyomanli") === -1 && jApp.indexOf("rg-pub-yomanli") === -1, "private journal app does not touch the public journal");
assert(jApp.indexOf("rg-myjournal-stat") !== -1 && jApp.indexOf('class="jhead"') !== -1, "the status sits beside היומן שלי and the fold is saved on the device");
assert(jHtml.indexOf("<title>Journalify</title>") !== -1, "the private journal tab title is Journalify");
assert(jHtml.indexOf('id="status"') === -1, "the private journal no longer parks the status under the page");
assert(jHtml.indexOf("rg-sync-status.js?v=1") < jHtml.indexOf("../../shared/rg-account.js"), "the helper loads before the account script");
assert(jHtml.indexOf("rg-store.js?v=1") !== -1 && jHtml.indexOf("../store.js") === -1, "the page uses its own store, not the shared one");
assert(jStr.indexOf('"doc": "Journalify"') !== -1 && jStr.indexOf('"title": "יומןלי"') !== -1, "Hebrew sessions keep the tab in English and the in-page name יומןלי");
assert(jStr.indexOf('"statusPeek": "שים לב"') !== -1, "a folded problem shows the short notice");
assert(jSw.indexOf('CACHE = "rg-myjournal-v19"') !== -1 && jSw.indexOf("app.js?v=4") !== -1, "the private journal cache was bumped");
assert(jApp.indexOf("לחתוך") === -1 && jStr.indexOf("לחתוך") === -1, "no violent Hebrew");

assert(sApp.indexOf('APP = "shopping"') !== -1 && sApp.indexOf('return "rg-my-shopping:" + id') !== -1, "private shopping keeps its app id and storage key");
assert(sApp.indexOf("pubpurchasify") === -1 && sApp.indexOf("rg-pub-purchasify") === -1, "private shopping does not use the public list");
assert(sApp.indexOf("rg-my-shopping-stat") !== -1 && sApp.indexOf("restoreBlocked") !== -1 && sApp.indexOf("keepGone: true") !== -1, "private shopping folds the status and can restore items or categories");
assert(sHtml.indexOf("<title>Purchasify</title>") !== -1, "the private shopping tab title is Purchasify");
assert(sHtml.indexOf('doc: "Purchasify"') !== -1 && sHtml.indexOf('title: "קניותיפיי"') !== -1, "Hebrew sessions keep the tab in English and the in-page name קניותיפיי");
assert(sHtml.indexOf('class="cathead"') !== -1 && sHtml.indexOf('id="status"') < sHtml.indexOf("</main>"), "the status sits beside the category heading");
assert(sHtml.indexOf('statusPeek: "שים לב"') !== -1, "private shopping uses the same short notice");
assert(sHtml.indexOf("rg-sync-status.js?v=1") < sHtml.indexOf("../../shared/rg-account.js"), "the shopping helper loads before the account script");
assert(sSw.indexOf('CACHE = "rg-myshop-v17"') !== -1 && sSw.indexOf("app.js?v=49") !== -1, "the private shopping cache was bumped");
assert(sApp.indexOf("לחתוך") === -1 && sHtml.indexOf("לחתוך") === -1, "shopping copy has no violent Hebrew");

if (failed) { console.error(failed + " failed"); process.exit(1); }
console.log("all private journal and shopping sync checks passed");
