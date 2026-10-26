/* Shopping list (my/shopping/) — private, per-user, live-synced through RGAccount (Appwrite row app="shopping", key="items",
   readable/writable by the signed-in user only).
   Model: { v: 1, items: { <id>: { id, text, done, created, at, deleted? } } }
   Merge: per item id, the newer "at" wins (last write wins per item); deletions are tombstones (deleted: true), pruned after 30 days.
   Offline-first: everything is kept in localStorage per user and merged into the cloud copy on every sync. */
(function () {
  "use strict";
  var APP = "shopping", KEY = "items", POLL_MS = 10000, TOMB_MS = 30 * 24 * 3600 * 1000;
  var SUGGESTED = ["אבקת שוקו", "ממרח שוקולד נוטלה", "חלב עמיד", "רביולי גבינות", "גבינה עם שום שמיר למריחה"];
  var A = window.RGAccount, M = window.RGMy, t = M.t;
  var uid = null, items = {}, pending = false, busy = false, again = false, offline = false, lastT = 0, editing = null, soonT = 0, rendering = false;

  function $(id) { return document.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function jparse(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
  function cacheKey(id) { return "rg-my-shopping:" + id; }
  function now() { lastT = Math.max(Date.now(), lastT + 1); return lastT; }
  function newId() { return now().toString(36) + Math.random().toString(36).slice(2, 8); }

  /* ---------- local cache ---------- */
  function loadLocal() {
    var c = uid ? jparse(lsGet(cacheKey(uid)), null) : null;
    items = (c && c.items) || {}; pending = !!(c && c.pending);
  }
  function saveLocal() { if (uid) lsSet(cacheKey(uid), JSON.stringify({ items: items, pending: pending })); }
  // another tab of this app on the same device
  window.addEventListener("storage", function (e) { if (uid && e.key === cacheKey(uid)) { loadLocal(); render(); } });

  /* ---------- merge ---------- */
  function newer(a, b) { // the version that wins
    if (!a) return b; if (!b) return a;
    if ((a.at || 0) !== (b.at || 0)) return (a.at || 0) > (b.at || 0) ? a : b;
    if (!!a.deleted !== !!b.deleted) return a.deleted ? a : b; // same instant: deletion wins
    return JSON.stringify(a) >= JSON.stringify(b) ? a : b;     // deterministic on every device
  }
  function valid(x) { return x && typeof x === "object" && typeof x.id === "string" && typeof x.at === "number"; }
  function merge(a, b) {
    var out = {}, cut = Date.now() - TOMB_MS, k;
    for (k in a) if (valid(a[k])) out[k] = a[k];
    for (k in b) if (valid(b[k])) out[k] = newer(out[k], b[k]);
    for (k in out) if (out[k].deleted && out[k].at < cut) delete out[k];
    return out;
  }
  function same(a, b) {
    var ka = Object.keys(a), kb = Object.keys(b); if (ka.length !== kb.length) return false;
    for (var i = 0; i < ka.length; i++) { var x = a[ka[i]], y = b[ka[i]]; if (!y || JSON.stringify(x) !== JSON.stringify(y)) return false; }
    return true;
  }

  /* ---------- sync ---------- */
  function setStatus() {
    var s = $("status"); if (!s) return;
    s.className = "status" + (offline ? " off" : "");
    s.textContent = !uid ? "" : offline ? t("offline") : (pending || busy) ? t("saving") : t("synced");
  }
  function sync() {
    if (!uid || !A) return Promise.resolve();
    if (busy) { again = true; return Promise.resolve(); }
    busy = true; again = false; setStatus();
    var who = uid, sent = null;
    return A.get(APP, KEY).then(function (cloud) {
      if (who !== uid) return;
      var cl = (cloud && cloud.items && typeof cloud.items === "object") ? cloud.items : {};
      var merged = merge(items, cl);
      if (!same(merged, items)) { items = merged; saveLocal(); render(); }
      if (same(merged, cl)) return;
      sent = merged;
      return A.set(APP, KEY, { v: 1, items: merged });
    }).then(function () {
      if (who !== uid) return;
      offline = false;
      if (!sent || same(sent, items)) { pending = false; saveLocal(); } // nothing new was changed meanwhile
      else again = true;
    }, function (e) {
      if (e && e.code === "signed_out") return;
      offline = true; // network down (or server error): keep everything locally, retry on the next poll / when back online
    }).then(function () {
      busy = false; setStatus();
      if (again) { again = false; sync(); }
    });
  }
  function syncSoon() { clearTimeout(soonT); soonT = setTimeout(sync, 250); }
  function changed() { pending = true; saveLocal(); render(); syncSoon(); }

  setInterval(function () { if (uid && document.visibilityState === "visible") sync(); }, POLL_MS);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sync(); });
  window.addEventListener("focus", function () { sync(); });
  window.addEventListener("online", function () { sync(); });
  window.addEventListener("offline", function () { offline = true; setStatus(); });

  /* ---------- actions ---------- */
  function add(text) {
    text = String(text || "").replace(/\s+/g, " ").trim().slice(0, 200); if (!text) return;
    var id = newId(), at = now(); items[id] = { id: id, text: text, done: false, created: at, at: at };
  }
  function upd(id, patch) { var x = items[id]; if (!x || x.deleted) return; var y = {}; for (var k in x) y[k] = x[k]; for (k in patch) y[k] = patch[k]; y.at = now(); items[id] = y; }
  function del(id) { var x = items[id]; if (!x) return; items[id] = { id: id, deleted: true, at: now() }; }

  /* ---------- render ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function row(x) {
    var txt = editing === x.id
      ? '<input class="edit" data-edit="' + esc(x.id) + '" maxlength="200" enterkeyhint="done" value="' + esc(x.text) + '" aria-label="' + esc(t("edit")) + '">'
      : '<span class="txt" role="button" tabindex="0" data-a="edit" title="' + esc(t("edit")) + '">' + esc(x.text) + "</span>";
    return '<li data-id="' + esc(x.id) + '"' + (x.done ? ' class="done"' : "") + '><button type="button" class="chk" data-a="toggle" aria-pressed="' + (x.done ? "true" : "false") + '" aria-label="' + esc((x.done ? t("uncheck") : t("check")) + ": " + x.text) + '"><i aria-hidden="true">✓</i></button>' +
      txt + '<button type="button" class="del" data-a="del" aria-label="' + esc(t("del") + ": " + x.text) + '">×</button></li>';
  }
  function render() {
    if (!$("active")) return;
    var act = [], done = [];
    for (var k in items) { var x = items[k]; if (!x.deleted) (x.done ? done : act).push(x); }
    act.sort(function (a, b) { return (a.created || 0) - (b.created || 0); });
    done.sort(function (a, b) { return (a.at || 0) - (b.at || 0); }); // last checked goes to the very bottom
    var keep = null, ae = document.activeElement;
    if (editing && ae && ae.getAttribute && ae.getAttribute("data-edit") === editing) keep = { v: ae.value, s: ae.selectionStart, e: ae.selectionEnd };
    if (editing && (!items[editing] || items[editing].deleted)) editing = null;
    rendering = true; // replacing the rows blurs an open edit box; that blur must not count as "done editing"
    $("active").innerHTML = act.map(row).join("");
    $("active-card").hidden = !act.length;
    $("done").innerHTML = done.map(row).join("");
    $("done-wrap").hidden = !done.length;
    $("done-h").textContent = t("bought") + " (" + done.length + ")";
    $("empty").hidden = !!(act.length || done.length);
    if (editing) {
      var inp = document.querySelector('[data-edit="' + editing + '"]');
      if (inp) { if (keep) { inp.value = keep.v; } inp.focus(); try { if (keep) inp.setSelectionRange(keep.s, keep.e); } catch (e) {} }
    }
    rendering = false;
    setStatus();
  }

  function commitEdit(inp, cancel) {
    var id = inp.getAttribute("data-edit"); if (editing !== id) return;
    editing = null;
    var v = inp.value.replace(/\s+/g, " ").trim().slice(0, 200), x = items[id];
    if (!cancel && x && !x.deleted) {
      if (!v) { del(id); changed(); return; }
      if (v !== x.text) { upd(id, { text: v }); changed(); return; }
    }
    render();
  }
  function boot() {
    $("add-form").addEventListener("submit", function (e) {
      e.preventDefault(); var i = $("add-input"); if (!i.value.trim()) return;
      add(i.value); i.value = ""; changed(); i.focus();
    });
    $("suggest").addEventListener("click", function () { SUGGESTED.forEach(add); changed(); });
    $("clear").addEventListener("click", function () { for (var k in items) if (items[k].done && !items[k].deleted) del(k); changed(); });
    document.querySelector("main").addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]"); if (!b) return;
      var li = b.closest("li"), id = li && li.getAttribute("data-id"), x = id && items[id]; if (!x) return;
      var a = b.getAttribute("data-a");
      if (a === "toggle") { upd(id, { done: !x.done }); changed(); }
      else if (a === "del") { del(id); changed(); }
      else if (a === "edit") { editing = id; render(); var inp = document.querySelector('[data-edit="' + id + '"]'); if (inp) { var n = inp.value.length; try { inp.setSelectionRange(n, n); } catch (e2) {} } }
    });
    document.querySelector("main").addEventListener("keydown", function (e) {
      if (e.target.classList.contains("txt") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.target.click(); }
      if (e.target.getAttribute("data-edit")) {
        if (e.key === "Enter") { e.preventDefault(); commitEdit(e.target); }
        else if (e.key === "Escape") { e.preventDefault(); commitEdit(e.target, true); }
      }
    });
    document.querySelector("main").addEventListener("focusout", function (e) { if (!rendering && e.target.getAttribute && e.target.getAttribute("data-edit")) commitEdit(e.target); });
    M.onLang(render);
    function onUser(u) {
      var id = u ? u.id : null; if (id === uid) return;
      if (!id && uid) { // signed out: drop this device's copy unless it holds changes that never reached the cloud
        var c = jparse(lsGet(cacheKey(uid)), null); if (!c || !c.pending) lsSet(cacheKey(uid), null);
      }
      uid = id; editing = null; offline = false; loadLocal(); render();
      if (uid) sync();
    }
    onUser(A.user());
    A.onChange(onUser);
    A.ready.then(function () { onUser(A.user()); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
