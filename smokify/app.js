/* Smokify — a gentle public log for cigarette moments and alternatives.
   Guests stay in rg-pub-smokify:guest and are never uploaded.
   Signed in: app "pubsmokify". The account row is readable and writable by that user only.
   Signing in does not copy the guest log into the account.
   Lists use Listify's physical gestures: swipe right removes, swipe left edits, ☰ drag reorders.
   A vertical move scrolls. It never reorders, except a vertical drag that starts on ☰.
   The week chart counts cigarettes only (the role saved on each log entry). */
(function () {
  "use strict";
  var APP = "pubsmokify";
  var HE_DAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
  var EN_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var SEED_TYPES = [
    { id: "t-cig", seed: "cig", role: "cig", order: 1, he: "עישון סיגריה אחת", en: "One cigarette" },
    { id: "t-breath", seed: "breath", role: "alt", order: 2, he: "הפסקת נשימה", en: "Breathing break" },
    { id: "t-other", seed: "other", role: "alt", order: 3, he: "משהו אחר", en: "Something else" }
  ];
  var SEED_ALTS = [
    { id: "a-pouch", seed: "pouch", order: 1, he: "פאוצ'ים", en: "Nicotine pouches" },
    { id: "a-patch", seed: "patch", order: 2, he: "פאצ'ים / מדבקות", en: "Patches" },
    { id: "a-organic", seed: "organic", order: 3, he: "טבק אורגני", en: "Organic tobacco" },
    { id: "a-damiana", seed: "damiana", order: 4, he: "דמיאנה", en: "Damiana" },
    { id: "a-snuff", seed: "snuff", order: 5, he: "סנוס להרחה", en: "Snuff" }
  ];

  var tab = "log", editing = null, openDays = {}, gesture = null, noClick = false, needRender = false, held = false, toastT = 0;
  var seedDone = false, seedLock = false, sawBusy = false, uidSeen = null;
  try { tab = localStorage.getItem("rg-smokify-tab") === "alt" ? "alt" : "log"; } catch (e) {}

  function $(id) { return document.getElementById(id); }
  function t(k) { return window.RGMy ? RGMy.t(k) : k; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clean(s, n) { return String(s || "").replace(/[ \t\u00a0]+/g, " ").replace(/\s*\n\s*/g, " ").trim().slice(0, n); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function dayKey(ts) { var d = new Date(ts); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function shiftKey(key, days) { var p = key.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]); d.setDate(d.getDate() + days); return dayKey(d.getTime()); }
  function weekKeys() { var today = dayKey(Date.now()), out = [], i; for (i = 6; i >= 0; i--) out.push(shiftKey(today, -i)); return out; }
  function langEn() { return window.RGMy && RGMy.lang() === "en"; }

  function userBusy() {
    if (gesture || editing || $("sheet")) return true;
    return focusedInPanels();
  }
  var S = window.RGStore(APP, { onChange: onStoreChange, onStatus: onStatus, busy: userBusy });

  function cloud() { return !!(window.RGIsolate && RGIsolate.maySync(S.uid())); }
  function list(kind) { return S.list(kind); }
  function get(id) { return S.get(id); }
  function add(obj) { S.add(obj); }
  function upd(id, patch) { S.upd(id, patch); }
  function del(id) { S.del(id); }
  function seedFlag() { return "rg-pub-smokify-seeded:" + (S.uid() || "guest"); }
  function writeSeed() {
    if (!list("type").length) SEED_TYPES.forEach(function (item) { add({ id: item.id, kind: "type", seed: item.seed, role: item.role, order: item.order, he: item.he, en: item.en }); });
    if (!list("alt").length) SEED_ALTS.forEach(function (item) { add({ id: item.id, kind: "alt", seed: item.seed, order: item.order, he: item.he, en: item.en }); });
    if (!get("m-seed")) add({ id: "m-seed", kind: "meta", seed: "v1" });
  }
  function seedGuest() {
    if (seedDone || seedLock || cloud()) return;
    if (lsGet(seedFlag()) === "1" || get("m-seed")) { seedDone = true; return; }
    seedLock = true;
    writeSeed();
    lsSet(seedFlag(), "1");
    seedDone = true;
    seedLock = false;
  }
  function onStoreChange() {
    if (S.uid() !== uidSeen) { uidSeen = S.uid(); seedDone = false; seedLock = false; sawBusy = false; editing = null; }
    if (!cloud()) seedGuest();
    render();
  }
  function onStatus() {
    var st = S.state();
    if (st === "saving") sawBusy = true;
    if (!cloud()) seedGuest();
    else if (sawBusy && (st === "synced" || st === "offline")) maybeSeed();
    paintStatus();
  }
  function paintStatus() {
    var el = $("status"); if (!el) return;
    var note = $("store-note");
    if (!cloud()) {
      el.textContent = t("localOnly");
      el.classList.remove("off");
      if (note) note.textContent = t("localNote");
      return;
    }
    var st = S.state();
    el.textContent = st === "offline" ? t("offline") : st === "saving" ? t("saving") : t("synced");
    el.classList.toggle("off", st === "offline");
    if (note) note.textContent = t("accountNote");
  }
  function maybeSeed() {
    var uid = S.uid();
    if (!cloud() || seedLock || seedDone) return;
    if (lsGet(seedFlag()) === "1" || get("m-seed")) { seedDone = true; render(); return; }
    var st = S.state();
    if (st !== "synced" && st !== "offline") return;
    seedLock = true;
    function finish() { seedDone = true; seedLock = false; lsSet(seedFlag(), "1"); render(true); }
    function writeSeed() {
      if (!list("type").length) SEED_TYPES.forEach(function (item) { add({ id: item.id, kind: "type", seed: item.seed, role: item.role, order: item.order, he: item.he, en: item.en }); });
      if (!list("alt").length) SEED_ALTS.forEach(function (item) { add({ id: item.id, kind: "alt", seed: item.seed, order: item.order, he: item.he, en: item.en }); });
      if (!get("m-seed")) add({ id: "m-seed", kind: "meta", seed: "v1" });
    }
    var A = window.RGAccount;
    if (st === "offline" || !A) { if (!list("type").length && !list("alt").length && !list("log").length) writeSeed(); finish(); return; }
    A.get(APP, "seeded").then(function (v) {
      if (S.uid() !== uid) { seedLock = false; return; }
      if (v && v.v) { finish(); return; }
      if (list("type").length || list("alt").length || list("log").length) { finish(); A.set(APP, "seeded", { v: 1 }).catch(function () {}); return; }
      writeSeed(); finish(); A.set(APP, "seeded", { v: 1 }).catch(function () {});
    }, function () {
      if (!list("type").length && !list("alt").length && !list("log").length) writeSeed();
      finish();
    });
  }

  function sorted(kind) {
    return list(kind).sort(function (a, b) { var d = (a.order || 0) - (b.order || 0); return d || ((a.created || 0) - (b.created || 0)); });
  }
  function label(x) {
    if (!x) return "";
    if (x.name) return x.name;
    return (langEn() ? (x.en || x.he) : (x.he || x.en)) || "";
  }
  function logLabel(x) {
    if (!x) return "";
    if (x.custom) return x.label || "";
    if (x.he || x.en) return langEn() ? (x.en || x.he) : (x.he || x.en);
    return x.label || "";
  }
  function display(x) { return x && x.kind === "log" ? logLabel(x) : label(x); }
  function isCig(x) { return !!(x && x.role === "cig"); }
  function countPhrase(n, oneKey, manyKey) { return n + " " + t(n === 1 ? oneKey : manyKey); }
  function formatTime(ts) {
    try { return new Date(ts).toLocaleTimeString(langEn() ? "en-GB" : "he-IL", { hour: "2-digit", minute: "2-digit" }); }
    catch (e) { return ""; }
  }
  function formatDay(key) {
    var p = key.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
    try { return d.toLocaleDateString(langEn() ? "en-GB" : "he-IL", { weekday: "long", day: "numeric", month: "numeric" }); }
    catch (e) { return key; }
  }
  function nextTop(kind) {
    var m = null;
    list(kind).forEach(function (x) { if (typeof x.order === "number" && (m === null || x.order < m)) m = x.order; });
    return m === null ? 1 : m - 1;
  }
  function waiting() {
    return !!(cloud() && !seedDone && !list("type").length && !list("alt").length && !list("log").length);
  }
  function cigsOn(key) {
    var n = 0;
    list("log").forEach(function (x) { if (isCig(x) && dayKey(x.when || 0) === key) n++; });
    return n;
  }

  function focusedInPanels() {
    var a = document.activeElement;
    return !!(a && a.closest && a.closest("#panels") && a.matches && a.matches("input, textarea, select"));
  }
  function render(force) {
    if (!$("panels")) return;
    if (!force && gesture) { needRender = true; return; }
    if (!force && focusedInPanels()) { held = true; return; }
    held = false; needRender = false;
    paint();
  }
  function paint() {
    var logTab = $("tab-log"), altTab = $("tab-alt");
    if (logTab) { logTab.textContent = t("tabLog"); logTab.setAttribute("aria-selected", tab === "log" ? "true" : "false"); }
    if (altTab) { altTab.textContent = t("tabAlt"); altTab.setAttribute("aria-selected", tab === "alt" ? "true" : "false"); }
    var panels = $("panels"); if (!panels) return;
    panels.innerHTML = waiting() ? '<p class="empty">' + esc(t("loading")) + "</p>" : (tab === "alt" ? altView() : logView());
    paintStatus();
  }

  function weekChart() {
    var keys = weekKeys(), counts = keys.map(cigsOn), max = 0, total = 0, i, today = keys[keys.length - 1];
    counts.forEach(function (n) { if (n > max) max = n; total += n; });
    var html = '<div class="week"><div class="weekhead"><h3>' + esc(t("week")) + '</h3><span class="weektot">' + esc(t("weekTotal").replace("{n}", String(total))) + "</span></div>";
    html += '<p class="cap">' + esc(t("weekCap")) + '</p><div class="bars" role="list" aria-label="' + esc(t("weekAria")) + '">';
    for (i = 0; i < keys.length; i++) {
      var key = keys[i], n = counts[i], p = key.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]);
      var h = n === 0 || max === 0 ? "0%" : "max(8px," + Math.round(n / max * 100) + "%)";
      var lab = key === today ? t("today") : (langEn() ? EN_DAYS : HE_DAYS)[d.getDay()];
      var aria = formatDay(key) + ", " + countPhrase(n, "cigOne", "cigMany");
      html += '<div class="bcol' + (key === today ? " is-today" : "") + '" role="listitem" data-day="' + esc(key) + '" data-cig="' + n + '" aria-label="' + esc(aria) + '" title="' + esc(aria) + '">';
      html += '<span class="bval">' + n + '</span><span class="btrack" aria-hidden="true"><i style="height:' + h + '"></i></span>';
      html += '<span class="blab">' + esc(lab) + '</span><span class="bdate">' + (+p[2]) + "</span></div>";
    }
    return html + "</div></div>";
  }
  function logView() {
    var today = dayKey(Date.now());
    var logs = list("log").slice().sort(function (a, b) { return (b.when || 0) - (a.when || 0); });
    var todays = logs.filter(function (x) { return dayKey(x.when || 0) === today; });
    var cigs = todays.filter(isCig).length, alts = todays.length - cigs;
    var html = '<button type="button" class="logbtn" id="logbtn">' + esc(t("logBtn")) + "</button>";
    html += '<section class="card summary" aria-label="' + esc(t("summary")) + '"><h2>' + esc(t("today")) + "</h2>";
    html += '<p class="sum" data-cigs="' + cigs + '" data-alts="' + alts + '"><span class="n-cig">' + esc(countPhrase(cigs, "cigOne", "cigMany")) + '</span><span class="dot">·</span><span class="n-alt">' + esc(countPhrase(alts, "altOne", "altMany")) + "</span></p>";
    html += weekChart() + "</section>";
    html += '<h2 class="sech">' + esc(t("todayEntries")) + "</h2>";
    if (!todays.length) html += '<p class="empty">' + esc(t("emptyToday")) + "</p>";
    else html += '<div class="card listcard"><ul class="list" data-swipe="1">' + todays.map(logRow).join("") + "</ul></div>";
    html += historyHtml(logs, today) + typesHtml();
    return html;
  }
  function historyHtml(logs, today) {
    var map = {}, keys;
    logs.forEach(function (x) { var k = dayKey(x.when || 0); if (k === today) return; (map[k] || (map[k] = [])).push(x); });
    keys = Object.keys(map).sort().reverse();
    var html = '<h2 class="sech">' + esc(t("history")) + "</h2>";
    if (!keys.length) return html + '<p class="hintline">' + esc(t("noHistory")) + "</p>";
    html += keys.map(function (k) {
      var rows = map[k], c = rows.filter(isCig).length, a = rows.length - c;
      return '<details class="card day" data-day="' + esc(k) + '"' + (openDays[k] ? " open" : "") + '><summary><span>' + esc(formatDay(k)) + '</span><span class="daycount">' + esc(countPhrase(c, "cigOne", "cigMany") + " · " + countPhrase(a, "altOne", "altMany")) + '</span></summary><ul class="list" data-swipe="1">' + rows.map(logRow).join("") + "</ul></details>";
    }).join("");
    return html;
  }
  function typesHtml() {
    var rows = sorted("type");
    var html = '<h2 class="sech">' + esc(t("types")) + '</h2><p class="hintline">' + esc(t("typesHint")) + "</p>";
    html += '<form class="addform" data-add="type" autocomplete="off"><div class="addrow"><input type="text" name="text" maxlength="80" enterkeyhint="done" placeholder="' + esc(t("typePh")) + '" aria-label="' + esc(t("typePh")) + '"><button type="submit">' + esc(t("add")) + "</button></div>";
    html += '<div class="kinds"><button type="button" class="kind" data-set-role="cig" aria-pressed="false">' + esc(t("asCig")) + '</button><button type="button" class="kind" data-set-role="alt" aria-pressed="true">' + esc(t("asAlt")) + "</button></div></form>";
    if (!rows.length) html += '<p class="empty">' + esc(t("noTypes")) + "</p>";
    else html += '<div class="card listcard"><ul class="list" data-swipe="1" data-reorder="1">' + rows.map(typeRow).join("") + "</ul></div>";
    return html;
  }
  function altView() {
    var rows = sorted("alt");
    var html = '<p class="hintline" style="margin-top:12px">' + esc(t("altIntro")) + "</p>";
    html += '<p class="hintline">' + esc(t("altHint")) + "</p>";
    html += '<form class="addform" data-add="alt" autocomplete="off"><div class="addrow"><input type="text" name="text" maxlength="80" enterkeyhint="done" placeholder="' + esc(t("altPh")) + '" aria-label="' + esc(t("altPh")) + '"><button type="submit">' + esc(t("add")) + '</button></div><div class="addextra"><input type="text" name="note" maxlength="200" enterkeyhint="done" placeholder="' + esc(t("notePh")) + '" aria-label="' + esc(t("notePh")) + '"></div></form>';
    if (!rows.length) html += '<p class="empty">' + esc(t("altEmpty")) + "</p>";
    else html += '<div class="card listcard"><ul class="list" data-swipe="1" data-reorder="1">' + rows.map(altRow).join("") + "</ul></div>";
    return html;
  }
  function handleHtml(x) {
    var n = label(x);
    return '<span class="handle ihandle" role="button" tabindex="0" title="' + esc(t("dragItem")) + '" aria-label="' + esc(t("dragItem") + ": " + n) + '">☰</span>';
  }
  function typeRow(x) {
    if (editing === x.id) return editRow(x);
    var n = label(x), role = x.role === "cig" ? t("roleCig") : t("roleAlt");
    return '<li data-id="' + esc(x.id) + '" data-kind="type">' + handleHtml(x) + '<div class="body" role="button" tabindex="0" data-a="edit" aria-label="' + esc(t("edit") + ": " + n) + '"><span class="txt">' + esc(n) + '</span><span class="note">' + esc(role) + "</span></div></li>";
  }
  function altRow(x) {
    if (editing === x.id) return editRow(x);
    var n = label(x);
    return '<li data-id="' + esc(x.id) + '" data-kind="alt">' + handleHtml(x) + '<div class="body" role="button" tabindex="0" data-a="edit" aria-label="' + esc(t("edit") + ": " + n) + '"><span class="txt">' + esc(n) + "</span>" + (x.note ? '<span class="note">' + esc(x.note) + "</span>" : "") + "</div></li>";
  }
  function logRow(x) {
    if (editing === x.id) return editRow(x);
    var n = logLabel(x);
    return '<li data-id="' + esc(x.id) + '" data-kind="log"><div class="body" role="button" tabindex="0" data-a="edit" aria-label="' + esc(t("edit") + ": " + n) + '"><span class="txt"><span class="when">' + esc(formatTime(x.when)) + "</span>" + esc(n) + "</span>" + (x.note ? '<span class="note">' + esc(x.note) + "</span>" : "") + "</div></li>";
  }
  function editButtons() {
    return '<div class="row"><button type="button" class="btn pri" data-a="save">' + esc(t("save")) + '</button><button type="button" class="btn" data-a="cancel">' + esc(t("cancel")) + '</button><button type="button" class="btn quiet" data-a="del">' + esc(t("del")) + "</button></div>";
  }
  function editRow(x) {
    var inner = "";
    if (x.kind === "log") {
      var types = sorted("type");
      if (x.typeId && !types.some(function (tp) { return tp.id === x.typeId; })) types = [{ id: x.typeId, name: logLabel(x) }].concat(types);
      inner = '<select class="e-type" aria-label="' + esc(t("types")) + '">' + types.map(function (tp) { return '<option value="' + esc(tp.id) + '"' + (tp.id === x.typeId ? " selected" : "") + ">" + esc(label(tp)) + "</option>"; }).join("") + "</select>";
      inner += '<input type="text" class="e-note" maxlength="200" value="' + esc(x.note || "") + '" placeholder="' + esc(t("notePh")) + '" aria-label="' + esc(t("notePh")) + '">';
    } else if (x.kind === "alt") {
      inner = '<input type="text" class="e-text" maxlength="80" value="' + esc(label(x)) + '" aria-label="' + esc(t("altPh")) + '">';
      inner += '<input type="text" class="e-note" maxlength="200" value="' + esc(x.note || "") + '" placeholder="' + esc(t("notePh")) + '" aria-label="' + esc(t("notePh")) + '">';
    } else {
      var cig = x.role === "cig";
      inner = '<input type="text" class="e-text" maxlength="80" value="' + esc(label(x)) + '" aria-label="' + esc(t("typePh")) + '">';
      inner += '<div class="kinds"><button type="button" class="kind" data-role="cig" aria-pressed="' + (cig ? "true" : "false") + '">' + esc(t("asCig")) + '</button><button type="button" class="kind" data-role="alt" aria-pressed="' + (!cig ? "true" : "false") + '">' + esc(t("asAlt")) + "</button></div>";
    }
    return '<li data-id="' + esc(x.id) + '" data-kind="' + esc(x.kind) + '"><div class="ed" data-ed="' + esc(x.id) + '">' + inner + editButtons() + "</div></li>";
  }

  function addItem(kind, text, extra) {
    var x = { kind: kind, order: nextTop(kind), name: clean(text, 80) };
    if (kind === "type") x.role = extra && extra.role === "cig" ? "cig" : "alt";
    if (extra && extra.note) x.note = clean(extra.note, 200);
    add(x);
  }
  function logMoment(typeId, note) {
    var tp = get(typeId); if (!tp) return;
    var x = { kind: "log", typeId: tp.id, role: tp.role === "cig" ? "cig" : "alt", when: Date.now(), label: label(tp) };
    if (tp.name) x.custom = 1;
    else { if (tp.he) x.he = tp.he; if (tp.en) x.en = tp.en; }
    if (note) x.note = note;
    add(x);
    toast(x.role === "cig" ? t("savedCig") : t("savedAlt"));
    if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {}
  }
  function saveEdit(id) {
    var x = get(id); if (!x) return;
    var ed = document.querySelector('.ed[data-ed="' + ((window.CSS && CSS.escape) ? CSS.escape(id) : id) + '"]');
    if (!ed) return;
    if (x.kind === "log") {
      var typeId = ed.querySelector(".e-type").value, tp = get(typeId);
      var note = clean(ed.querySelector(".e-note").value, 200);
      var patch = { note: note, typeId: typeId, role: tp && tp.role === "cig" ? "cig" : "alt", label: tp ? label(tp) : x.label };
      if (tp && tp.name) { patch.custom = 1; patch.he = null; patch.en = null; }
      else { patch.custom = null; patch.he = tp ? tp.he : null; patch.en = tp ? tp.en : null; }
      editing = null; upd(id, patch);
    } else {
      var name = clean(ed.querySelector(".e-text").value, 80);
      if (!name) { ed.querySelector(".e-text").focus(); return; }
      var patch2 = { name: name, seed: null };
      if (x.kind === "alt") patch2.note = clean(ed.querySelector(".e-note").value, 200);
      else { var roleBtn = ed.querySelector('.kind[aria-pressed="true"]'); patch2.role = roleBtn && roleBtn.getAttribute("data-role") === "cig" ? "cig" : "alt"; }
      editing = null; upd(id, patch2);
    }
    render(true);
  }
  function applyOrder(ids) {
    ids.forEach(function (id, n) { var x = get(id); if (x && x.order !== n + 1) upd(id, { order: n + 1 }); });
  }
  function delWithUndo(id) {
    var x = get(id); if (!x) return;
    var keep = {}, k;
    for (k in x) if (k !== "_f" && k !== "deleted") keep[k] = x[k];
    if (editing === id) editing = null;
    del(id);
    toast(t("deleted").replace("{x}", display(keep)), function () { delete keep.at; add(keep); });
  }
  function hideToast() { var el = $("toast"); if (el) el.classList.remove("on"); }
  function toast(msg, undo) {
    var el = $("toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.innerHTML = '<span class="tmsg">' + esc(msg) + "</span>" + (undo ? '<button type="button" class="tundo">' + esc(t("undo")) + "</button>" : "");
    el.classList.toggle("act", !!undo);
    if (undo) el.querySelector(".tundo").onclick = function () { hideToast(); undo(); };
    el.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(hideToast, undo ? 5000 : 2400);
  }
  function closeSheet() { var w = $("sheet"); if (w && w.parentNode) w.parentNode.removeChild(w); }
  function sheet(html, onClick) {
    closeSheet();
    var w = document.createElement("div"); w.className = "sheetwrap"; w.id = "sheet";
    w.innerHTML = '<div class="sheet card" role="dialog" aria-modal="true">' + html + "</div>";
    document.body.appendChild(w);
    w.addEventListener("click", function (e) {
      if (e.target === w) { closeSheet(); return; }
      var b = e.target.closest("[data-s]"); if (b) onClick(b.getAttribute("data-s"), w);
    });
    return w;
  }
  function openLogSheet() {
    var types = sorted("type");
    var html = "<h3>" + esc(t("pickTitle")) + "</h3>";
    if (!types.length) html += '<p class="mnote">' + esc(t("noTypes")) + '</p><button type="button" class="btn" data-s="x">' + esc(t("cancel")) + "</button>";
    else {
      html += '<input type="text" class="s-note" maxlength="200" enterkeyhint="done" placeholder="' + esc(t("notePh")) + '" aria-label="' + esc(t("notePh")) + '">';
      html += '<div class="mlist">' + types.map(function (tp) {
        return '<button type="button" class="mi" data-s="pick:' + esc(tp.id) + '"><span class="mn">' + esc(label(tp)) + '</span><span class="mc">' + esc(tp.role === "cig" ? t("roleCig") : t("roleAlt")) + "</span></button>";
      }).join("") + "</div>";
      html += '<button type="button" class="btn" data-s="x">' + esc(t("cancel")) + "</button>";
    }
    sheet(html, function (a, w) {
      if (a === "x") { closeSheet(); return; }
      if (a.indexOf("pick:") === 0) {
        var noteEl = w.querySelector(".s-note");
        var note = clean(noteEl ? noteEl.value : "", 200);
        closeSheet(); logMoment(a.slice(5), note);
      }
    });
  }
  function setPressed(btn) {
    var box = btn.parentNode; if (!box) return;
    var attr = btn.hasAttribute("data-role") ? "data-role" : "data-set-role";
    [].forEach.call(box.querySelectorAll("[" + attr + "]"), function (b) {
      var on = b === btn; b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  /* Drag-to-reorder. The lifted row follows the finger; the others slide aside. end() returns the new order. */
  function makeSorter(rows, el, y0) {
    function sy() { return window.scrollY || window.pageYOffset || 0; }
    var s0 = sy(), from = rows.indexOf(el), to = from, n = rows.length, lastY = y0, raf = 0, alive = true;
    var info = rows.map(function (r) { var b = r.getBoundingClientRect(); return { el: r, top: b.top + s0, h: b.height }; });
    var gap = from < n - 1 ? info[from + 1].top - info[from].top : from > 0 ? info[from].top - info[from - 1].top - info[from - 1].h + info[from].h : info[from].h;
    rows.forEach(function (r) { if (r !== el) r.style.transition = "transform .16s ease"; });
    el.style.transition = "none"; el.classList.add("sorting");
    function place() {
      var dy = lastY + sy() - (y0 + s0), c = info[from].top + info[from].h / 2 + dy, i;
      el.style.transform = "translateY(" + dy + "px)";
      to = from;
      for (i = 0; i < from; i++) if (c < info[i].top + info[i].h / 2) { to = i; break; }
      for (i = n - 1; i > from; i--) if (c > info[i].top + info[i].h / 2) { to = i; break; }
      info.forEach(function (o, k) {
        if (k === from) return;
        var sh = (from < to && k > from && k <= to) ? -gap : (to < from && k >= to && k < from) ? gap : 0;
        o.el.style.transform = sh ? "translateY(" + sh + "px)" : "";
      });
    }
    function tick() {
      if (!alive) return;
      var z = 70, sp = 0;
      if (lastY < z) sp = -Math.ceil((z - lastY) / 4);
      else if (lastY > window.innerHeight - z) sp = Math.ceil((lastY - (window.innerHeight - z)) / 4);
      if (sp) { var b = sy(); window.scrollBy(0, sp); if (sy() !== b) place(); }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return {
      move: function (y) { lastY = y; place(); },
      end: function () {
        alive = false; cancelAnimationFrame(raf);
        rows.forEach(function (r) { r.style.transition = "none"; r.style.transform = ""; r.classList.remove("sorting"); });
        var out = rows.slice(); out.splice(to, 0, out.splice(from, 1)[0]);
        return { order: out, moved: to !== from };
      }
    };
  }

  function clearGestureVisual(g) {
    if (g && g.li) { g.li.classList.remove("swiping", "sw-r", "sw-l", "sw-go"); g.li.style.removeProperty("--sx"); }
    var tip = $("drophint"); if (tip) tip.hidden = true;
    document.body.classList.remove("idragging");
  }
  function bootGestures() {
    var main = document.querySelector("main"); if (!main) return;
    var AXIS = 12, SWIPE = 0.35;
    function finish() {
      gesture = null;
      if (needRender) render(true);
    }
    function armH(g) {
      if (!g || g.swipe || g.lifted) return;
      g.swipe = true; g.axis = "h"; g.li.classList.add("swiping");
      try { (g.cap || g.li).setPointerCapture(g.pid); } catch (e) {}
    }
    function paintH(g, dx) {
      var w = g.li.offsetWidth || 1, go = Math.abs(dx) >= w * SWIPE;
      g.li.style.setProperty("--sx", dx + "px");
      g.li.classList.toggle("sw-r", dx > 0);
      g.li.classList.toggle("sw-l", dx < 0);
      g.li.classList.toggle("sw-go", go);
    }
    function beginLift(g) {
      if (!g || g.lifted || g.swipe) return;
      var ul = g.li.parentNode;
      if (!ul || !ul.getAttribute("data-reorder")) return;
      g.lifted = true; g.axis = "v";
      g.sorter = makeSorter([].slice.call(ul.children), g.li, g.y);
      document.body.classList.add("idragging");
      try { (g.cap || g.li).setPointerCapture(g.pid); } catch (e) {}
      if (navigator.vibrate) try { navigator.vibrate(10); } catch (e2) {}
      var tip = $("drophint"); if (tip) { tip.textContent = t("dropHint"); tip.hidden = false; }
    }
    function follow(g, dx, dy) {
      if (!g || g.handled) return "";
      g._dx = dx; g._dy = dy;
      if (g.lifted) return "v";
      if (g.swipe) { paintH(g, dx); return "h"; }
      var adx = Math.abs(dx), ady = Math.abs(dy);
      if (!g.axis) {
        if (adx < AXIS && ady < AXIS) return "";
        if (adx > ady * 1.5) g.axis = "h";
        else if (ady > adx * 1.5) g.axis = "v";
        else return "";
      }
      if (g.axis === "v") { if (g.fromHandle && !g.sawCancel) beginLift(g); return g.lifted ? "v" : ""; }
      armH(g); paintH(g, dx); return "h";
    }
    main.addEventListener("pointerdown", function (e) {
      var li = e.target.closest && e.target.closest(".list > li[data-id]");
      if (!li || li.querySelector(".ed") || editing) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (gesture) return;
      var fromHandle = !!e.target.closest(".ihandle");
      gesture = { li: li, id: li.getAttribute("data-id"), x: e.clientX, y: e.clientY, pid: e.pointerId, type: e.pointerType, fromHandle: fromHandle, cap: e.target && e.target.setPointerCapture ? e.target : li, axis: "", _dx: 0, _dy: 0 };
      if (fromHandle) e.preventDefault();
    });
    document.addEventListener("pointermove", function (e) {
      if (!gesture || e.pointerId !== gesture.pid || gesture.handled) return;
      if (gesture.sawCancel && !gesture.swipe && !gesture.lifted) return;
      if (gesture.lifted) { e.preventDefault(); if (gesture.sorter) gesture.sorter.move(e.clientY); return; }
      var act = follow(gesture, e.clientX - gesture.x, e.clientY - gesture.y);
      if (act === "h" || act === "v") e.preventDefault();
    });
    function endSwipe(g, dx) {
      if (!g || g.handled) return;
      g.handled = true; noClick = true; setTimeout(function () { noClick = false; }, 400);
      var w = (g.li && g.li.offsetWidth) || 1, id = g.id, go = Math.abs(dx) >= w * SWIPE, right = dx > 0;
      clearGestureVisual(g); finish();
      if (!go) return;
      if (right) delWithUndo(id);
      else { editing = id; render(true); var inp = document.querySelector(".ed input, .ed select"); if (inp) inp.focus(); }
    }
    function endLift(g) {
      if (!g || g.handled) return;
      g.handled = true; noClick = true; setTimeout(function () { noClick = false; }, 400);
      var r = g.sorter ? g.sorter.end() : { moved: false, order: [] };
      clearGestureVisual(g); finish();
      if (r.moved) applyOrder(r.order.map(function (li) { return li.getAttribute("data-id"); }));
      render(true);
    }
    function up(e) {
      if (!gesture || e.pointerId !== gesture.pid || gesture.handled) return;
      var g = gesture;
      if (g.type === "touch" && e.type === "pointercancel") { g.sawCancel = true; if (!g.swipe && !g.lifted) g.axis = "v"; return; }
      if (g.swipe || g.axis === "h") { endSwipe(g, (e.type === "pointerup" && typeof e.clientX === "number") ? e.clientX - g.x : (g._dx || 0)); return; }
      if (g.lifted) { endLift(g); return; }
      g.handled = true; clearGestureVisual(g); finish();
    }
    document.addEventListener("pointerup", up);
    document.addEventListener("pointercancel", up);
    document.addEventListener("touchend", function (e) {
      if (!gesture || gesture.handled) return;
      var tch = e.changedTouches && e.changedTouches[0]; if (!tch) return;
      var g = gesture, dx = tch.clientX - g.x, dy = tch.clientY - g.y;
      g._dx = dx; g._dy = dy;
      if (g.type !== "touch" && !g.sawCancel) return;
      if (g.lifted) { if (g.sawCancel) endLift(g); return; }
      if (g.swipe || g.axis === "h") { if (g.sawCancel) endSwipe(g, dx); return; }
      g.handled = true; clearGestureVisual(g); finish();
    }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (!gesture || gesture.handled || gesture.sawCancel) return;
      var tch = e.touches && e.touches[0]; if (!tch) return;
      if (gesture.lifted && gesture.sorter) { gesture.sorter.move(tch.clientY); return; }
      follow(gesture, tch.clientX - gesture.x, tch.clientY - gesture.y);
    }, { passive: true });
    document.addEventListener("selectstart", function (e) {
      if (gesture && (gesture.swipe || gesture.lifted || gesture.fromHandle)) e.preventDefault();
    }, true);
    main.addEventListener("contextmenu", function (e) {
      if (gesture && (gesture.swipe || gesture.lifted) && e.target.closest && e.target.closest(".list > li")) e.preventDefault();
    });
  }

  function boot() {
    var main = document.querySelector("main"); if (!main) return;
    bootGestures();
    main.addEventListener("click", function (e) {
      if (noClick && e.target.closest(".list")) { noClick = false; e.preventDefault(); return; }
      var tabBtn = e.target.closest("[data-tab]");
      if (tabBtn && tabBtn.closest(".tabs")) { tab = tabBtn.getAttribute("data-tab") === "alt" ? "alt" : "log"; editing = null; try { localStorage.setItem("rg-smokify-tab", tab); } catch (err) {} render(true); return; }
      if (e.target.closest("#logbtn")) { openLogSheet(); return; }
      var press = e.target.closest("[data-role], [data-set-role]");
      if (press) { setPressed(press); return; }
      var b = e.target.closest("[data-a]"); if (!b) return;
      var li = b.closest("[data-id]"); if (!li) return;
      var id = li.getAttribute("data-id"), act = b.getAttribute("data-a");
      if (act === "edit") { editing = id; render(true); var inp = document.querySelector(".ed input, .ed select"); if (inp) inp.focus(); }
      else if (act === "cancel") { editing = null; render(true); }
      else if (act === "save") saveEdit(id);
      else if (act === "del") delWithUndo(id);
    });
    main.addEventListener("submit", function (e) {
      var f = e.target.closest("[data-add]"); if (!f) return;
      e.preventDefault();
      var textEl = f.querySelector('[name="text"]'), text = clean(textEl.value, 80);
      if (!text) { textEl.focus(); return; }
      if (f.getAttribute("data-add") === "type") {
        var roleBtn = f.querySelector('[data-set-role][aria-pressed="true"]');
        addItem("type", text, { role: roleBtn ? roleBtn.getAttribute("data-set-role") : "alt" });
      } else addItem("alt", text, { note: clean((f.querySelector('[name="note"]') || {}).value, 200) });
      render(true);
    });
    main.addEventListener("keydown", function (e) {
      var h = e.target.closest && e.target.closest(".ihandle");
      if (h && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        var li = h.closest("li"), ul = li && li.parentNode;
        if (!ul || !ul.getAttribute("data-reorder")) return;
        e.preventDefault();
        var sib = e.key === "ArrowUp" ? li.previousElementSibling : li.nextElementSibling;
        if (!sib) return;
        var id = li.getAttribute("data-id");
        if (e.key === "ArrowUp") ul.insertBefore(li, sib); else ul.insertBefore(sib, li);
        applyOrder([].map.call(ul.children, function (row) { return row.getAttribute("data-id"); }));
        render(true);
        var again = document.querySelector('li[data-id="' + id + '"] .ihandle');
        if (again) again.focus();
        return;
      }
      if (e.key === "Enter" && e.target.closest && e.target.closest(".ed") && e.target.tagName === "INPUT") {
        var row = e.target.closest("[data-id]"); if (row) { e.preventDefault(); saveEdit(row.getAttribute("data-id")); }
      }
    });
    main.addEventListener("toggle", function (e) {
      var d = e.target.closest && e.target.closest("details.day");
      if (d) openDays[d.getAttribute("data-day")] = d.open;
    }, true);
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if ($("sheet")) { closeSheet(); return; }
      if (editing) { editing = null; render(true); }
    });
    document.addEventListener("focusout", function () {
      setTimeout(function () { if (held && !focusedInPanels()) render(); }, 220);
    });
    if (window.RGMy) RGMy.onLang(function () { render(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
