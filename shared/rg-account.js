/* rg-account.js — one shared account for all of the Healify apps (Appwrite Cloud, no build step, no SDK).
   Drop in with one tag:  <script src="../shared/rg-account.js" defer></script>
   The account button mounts into every [data-rg-account] element (or floats at the top corner if there is none).
   Language follows <html lang> (he / en), live.

   API (window.RGAccount):
     ready              Promise<user|null>  (after the session check on load)
     user()             current user {id, email, name} or null (sync)
     onChange(cb)       cb(user|null) on sign-in / sign-out / name change, in this tab AND in other open tabs/apps. Returns unsubscribe.
     open()             opens the sign-in / account dialog
     sendCode(email)    Email OTP: 6-digit code to the inbox
     verifyCode(code)   -> Promise<user>
     loginPassword(email, password) -> Promise<user>   (email + password session)
     setPassword(newPassword, oldPassword?) -> Promise<user>  (oldPassword only when the account already has one)
     hasPassword()      true / false / null (unknown yet)
     setName(name)      -> Promise<user>
     logout()           -> Promise
     get(app, key)      -> Promise<value|null>   JSON in table ron/userdata, one row per (user, app, key). Rejects (err.code "signed_out") when signed out.
     set(app, key, v)   -> Promise<v>            upsert; the row is readable/writable by this user only
     exportAll()        -> Promise<{status: "ok"|"partial"|"offline", file}>  downloads ONE JSON file with all of this user's data:
                        every row of theirs in ron/userdata (all apps + cloud prefs) merged with this device's app keys in localStorage
     syncPrefs(keys, apply)  sync these localStorage keys (language, theme, background…) through the account;
                        newest change wins (per-key timestamps). apply(changes) may return true when it applied them itself;
                        otherwise a built-in handler clicks the app's own language/theme/background controls, else reloads once.

   Session across domains: the site is on github.io and the API on appwrite.io, so the session cookie is third-party
   (blocked by Safari, often by Chrome). Like the official SDK we keep Appwrite's "X-Fallback-Cookies" value in
   localStorage("cookieFallback") and send it back on every request. All apps share one origin, so they share the session. */
(function () {
  "use strict";
  if (window.RGAccount) return;
  var ENDPOINT = "https://fra.cloud.appwrite.io/v1", PROJECT = "6adef4a40004c12a1e9c";
  var DB = "ron", TABLE = "userdata";
  var FB_KEY = "cookieFallback", USER_KEY = "rg-account-user", PEND_KEY = "rg-account-pending", META_KEY = "rg-prefs-meta";
  var METHOD_KEY = "rg-account-method", HASPW_KEY = "rg-account-haspw", LAST_KEY = "rg-account-last-email"; // last sign-in method ("password" | "code"), whether the account has a password (never the password itself)
  var PEND_TTL = 15 * 60 * 1000;
  // the private hub (my/) sits next to shared/, so find it from this script's own URL (works on any host / sub-path)
  var MY_URL = (function () { try { var c = document.currentScript; return c && c.src ? new URL("../my/", c.src).href : ""; } catch (e) { return ""; } })();

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function jparse(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }

  /* ---------------- REST ---------------- */
  function req(method, path, body) {
    var h = { "X-Appwrite-Project": PROJECT, "accept": "application/json" };
    if (body !== undefined) h["content-type"] = "application/json";
    var fb = lsGet(FB_KEY); if (fb) h["X-Fallback-Cookies"] = fb;
    return fetch(ENDPOINT + path, { method: method, headers: h, credentials: "include", cache: "no-store", body: body !== undefined ? JSON.stringify(body) : undefined })
      .then(function (r) {
        var nf = r.headers && r.headers.get && r.headers.get("X-Fallback-Cookies");
        if (nf) lsSet(FB_KEY, nf);
        return r.text().then(function (txt) {
          var j = txt ? jparse(txt, null) : null;
          if (!r.ok) { var e = new Error((j && j.message) || ("HTTP " + r.status)); e.status = r.status; e.type = (j && j.type) || ""; throw e; }
          return j;
        });
      }, function (err) { var e = new Error("network"); e.status = 0; e.type = "network"; e.cause = err; throw e; });
  }

  /* ---------------- session state ---------------- */
  function norm(u) { return u && (u.$id || u.id) ? { id: u.$id || u.id, email: u.email || "", name: u.name || "" } : null; }
  function same(a, b) { return (!a && !b) || !!(a && b && a.id === b.id && a.email === b.email && a.name === b.name); }
  var cur = norm(jparse(lsGet(USER_KEY), null)), subs = [];
  var hasPw = (function () { var v = lsGet(HASPW_KEY); return v === "1" ? true : v === "0" ? false : null; })();
  function notePw(raw) {
    if (!raw) { hasPw = null; lsSet(HASPW_KEY, null); return; }
    if (typeof raw === "object" && "passwordUpdate" in raw) { hasPw = !!raw.passwordUpdate; lsSet(HASPW_KEY, hasPw ? "1" : "0"); }
  }
  function setUser(u, fromStorage) {
    if (!fromStorage) notePw(u);
    u = norm(u); if (same(u, cur)) return;
    var was = cur && cur.id; cur = u;
    if (!fromStorage) lsSet(USER_KEY, u ? JSON.stringify(u) : null);
    if (u && u.email) lsSet(LAST_KEY, u.email); // prefills the sign-in form next time
    if (!u || u.id !== was) rowKnown = {};
    subs.slice().forEach(function (cb) { try { cb(cur); } catch (e) { setTimeout(function () { throw e; }); } });
    renderAll();
    if (u && u.id !== was) prefsPull();
  }
  // other tabs and other apps (same origin = same localStorage)
  window.addEventListener("storage", function (e) {
    if (e.key === USER_KEY || e.key === null) setUser(jparse(lsGet(USER_KEY), null), true);
  });

  function check() {
    if (!cur && !lsGet(FB_KEY)) return Promise.resolve(null); // never signed in on this device: no request, no 401 noise
    return req("GET", "/account").then(function (u) { setUser(u); return cur; }, function (e) {
      if (e.status === 401) { lsSet(FB_KEY, null); setUser(null); }
      return cur; // offline: keep the cached user
    });
  }
  var lastCheck = 0;
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || !cur || Date.now() - lastCheck < 30000) return;
    lastCheck = Date.now(); check().then(function () { if (cur) prefsPull(); });
  });

  // pending code: localStorage (survives reloads / other tabs) plus an in-memory copy for browsers that block storage
  var memPend = null;
  function sendCode(email) {
    email = String(email || "").trim();
    return req("POST", "/account/tokens/email", { userId: "unique()", email: email }).then(function (tok) {
      memPend = { userId: tok.userId, email: email, at: Date.now() };
      lsSet(PEND_KEY, JSON.stringify(memPend));
      return tok.userId;
    });
  }
  function pending() {
    var p = jparse(lsGet(PEND_KEY), null) || memPend;
    return p && p.userId && Date.now() - p.at < PEND_TTL ? p : null;
  }
  function clearPending() { memPend = null; lsSet(PEND_KEY, null); }
  // the 6-digit code out of whatever was typed or pasted: Arabic/Persian/full-width digits, spaces, RTL marks, "Code: 123456 …"
  function cleanCode(v) {
    var s = String(v || "")
      .replace(/[\u0660-\u0669]/g, function (c) { return String(c.charCodeAt(0) - 0x660); })
      .replace(/[\u06F0-\u06F9]/g, function (c) { return String(c.charCodeAt(0) - 0x6F0); })
      .replace(/[\uFF10-\uFF19]/g, function (c) { return String(c.charCodeAt(0) - 0xFF10); });
    var m = s.match(/(?:^|\D)(\d{6})(?!\d)/);
    return m ? m[1] : s.replace(/\D/g, "");
  }
  function codeErr(type) { var e = new Error(type); e.type = type; return e; }
  // Appwrite refuses to create a session while this browser still carries a live one (401 user_session_already_exists),
  // e.g. a leftover cookie from an earlier sign-in that this page no longer knew about. That used to show up as "wrong code".
  function createSession(path, body, email) {
    return req("POST", path, body).catch(function (e) {
      if (e.type !== "user_session_already_exists") throw e;
      return req("GET", "/account").then(function (u) {
        if (u && email && String(u.email || "").toLowerCase() === String(email).toLowerCase()) return "same"; // already signed in as this person
        return req("DELETE", "/account/sessions/current").catch(function () {}).then(function () { lsSet(FB_KEY, null); return req("POST", path, body); });
      }, function () { lsSet(FB_KEY, null); return req("POST", path, body); });
    });
  }
  // the session was created; read the account with it. A 401 here means the browser didn't keep the session.
  function afterSession() {
    function get() { return req("GET", "/account"); }
    return get().catch(function (e) { if (e.status === 401) return new Promise(function (r) { setTimeout(r, 400); }).then(get); throw e; })
      .catch(function (e) { if (e.status === 401) throw codeErr("session_not_kept"); throw e; })
      .then(function (u) { setUser(u); return cur; });
  }
  function verifyCode(code) {
    var p = pending(); if (!p) return Promise.reject(codeErr("pending_expired"));
    var secret = cleanCode(code);
    if (secret.length !== 6) return Promise.reject(codeErr("code_len"));
    return createSession("/account/sessions/token", { userId: p.userId, secret: secret }, p.email)
      .then(afterSession)
      .then(function (u) { clearPending(); if (lsGet(METHOD_KEY) !== "password") lsSet(METHOD_KEY, "code"); return u; });
  }
  function loginPassword(email, password) {
    email = String(email || "").trim();
    return createSession("/account/sessions/email", { email: email, password: String(password || "") }, email)
      .then(afterSession)
      .then(function (u) { clearPending(); lsSet(METHOD_KEY, "password"); return u; });
  }
  function setPassword(password, oldPassword) {
    var body = { password: String(password || "") };
    if (oldPassword) body.oldPassword = String(oldPassword);
    return req("PATCH", "/account/password", body).then(function (u) {
      if (u && typeof u === "object" && !("passwordUpdate" in u)) u.passwordUpdate = "set";
      setUser(u); notePw(u); lsSet(METHOD_KEY, "password"); return cur;
    });
  }
  function setName(name) { return req("PATCH", "/account/name", { name: String(name || "").trim().slice(0, 128) }).then(function (u) { setUser(u); return cur; }); }
  function logout() {
    return req("DELETE", "/account/sessions/current").catch(function () {}).then(function () { lsSet(FB_KEY, null); setUser(null); notePw(null); });
  }

  /* ---------------- data: one row per (user, app, key), deterministic row id ---------------- */
  function h32(s, seed) {
    var h = (0x811c9dc5 ^ Math.imul(seed, 0x9e3779b1)) >>> 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }
  function rowId(uid, app, key) { var s = uid + "\u0001" + app + "\u0001" + key; return ("r" + h32(s, 1) + h32(s, 2) + h32(s, 3) + h32(s, 4)).slice(0, 32); }
  var rowKnown = {}, chains = {};
  function rowsPath(id) { return "/tablesdb/" + DB + "/tables/" + TABLE + "/rows" + (id ? "/" + encodeURIComponent(id) : ""); }
  function signedOut() { var e = new Error("signed_out"); e.code = "signed_out"; e.type = "signed_out"; return e; }
  function get(app, key) {
    if (!cur) return Promise.reject(signedOut());
    var id = rowId(cur.id, app, key);
    return req("GET", rowsPath(id)).then(function (row) {
      rowKnown[id] = 1; return row && row.value != null ? jparse(row.value, null) : null;
    }, function (err) { if (err.status === 404) { delete rowKnown[id]; return null; } throw err; });
  }
  function set(app, key, value) {
    if (!cur) return Promise.reject(signedOut());
    var uid = cur.id, id = rowId(uid, app, key), val = JSON.stringify(value);
    var perms = ['read("user:' + uid + '")', 'update("user:' + uid + '")', 'delete("user:' + uid + '")'];
    function update() { return req("PATCH", rowsPath(id), { data: { value: val } }); }
    function create() { return req("POST", rowsPath(), { rowId: id, data: { app: String(app), key: String(key), value: val }, permissions: perms }); }
    function run() {
      var p = rowKnown[id] ? update().catch(function (err) { if (err.status === 404) return create(); throw err; })
        : create().catch(function (err) { if (err.status === 409) return update(); throw err; });
      return p.then(function () { rowKnown[id] = 1; return value; });
    }
    var c = (chains[id] || Promise.resolve()).then(run, run); // one write at a time per row
    chains[id] = c.catch(function () {});
    return c;
  }

  /* ---------------- prefs sync (language / theme / background … of the current app) ---------------- */
  var P_APP = "prefs", P_KEY = "all";
  var pKeys = [], pApply = null, pSnap = {}, pTimer = 0, pBusy = false, pAgain = false;
  function meta() { return jparse(lsGet(META_KEY), {}) || {}; }
  function syncPrefs(keys, apply) {
    (keys || []).forEach(function (k) { if (pKeys.indexOf(k) < 0) { pKeys.push(k); pSnap[k] = lsGet(k); } });
    if (apply) pApply = apply;
    if (!pTimer) pTimer = setInterval(prefsPoll, 2000);
    window.addEventListener("pagehide", prefsPoll);
    if (cur) ready.then(prefsPull);
  }
  function prefsPoll() { // localStorage writes in this tab fire no event, so compare with the last snapshot
    var m = null;
    pKeys.forEach(function (k) { var v = lsGet(k); if (v !== pSnap[k]) { pSnap[k] = v; (m = m || meta())[k] = Date.now(); } });
    if (m) { lsSet(META_KEY, JSON.stringify(m)); if (cur) prefsSoon(); }
  }
  var pSoon = 0;
  function prefsSoon() { clearTimeout(pSoon); pSoon = setTimeout(prefsPull, 1200); }
  // pull the cloud copy, take the newer value per key, push back when this device had something newer
  function prefsPull() {
    if (!cur || !pKeys.length) return Promise.resolve();
    if (pBusy) { pAgain = true; return Promise.resolve(); }
    pBusy = true; prefsPoll();
    return get(P_APP, P_KEY).then(function (cloud) {
      cloud = cloud && typeof cloud === "object" ? cloud : {};
      var m = meta(), changes = {}, nChanges = 0, dirty = false;
      pKeys.forEach(function (k) {
        var c = cloud[k], lv = lsGet(k), lt = m[k] || 0;
        if (c && typeof c === "object" && (c.t || 0) >= lt && (c.t > lt || lv == null)) {
          if (c.v !== lv) { lsSet(k, c.v); pSnap[k] = c.v; changes[k] = c.v; nChanges++; }
          m[k] = c.t || 0;
        } else if (lv != null && (!c || lt > (c.t || 0))) { cloud[k] = { v: lv, t: lt }; dirty = true; }
      });
      lsSet(META_KEY, JSON.stringify(m));
      if (nChanges) applyChanges(changes);
      return dirty ? set(P_APP, P_KEY, cloud) : null;
    }).catch(function () {}).then(function () {
      pBusy = false; if (pAgain) { pAgain = false; prefsPull(); }
    });
  }
  function applyChanges(changes) {
    var handled = false;
    try { handled = pApply ? pApply(changes) === true : false; } catch (e) {}
    if (handled) return;
    var left = 0, d = document.documentElement;
    Object.keys(changes).forEach(function (k) {
      var v = changes[k], el = null;
      if (k === "rg-lang") {
        if ((d.lang || "").slice(0, 2) === v) return;
        el = document.getElementById("lang-" + v) || document.getElementById(v);
      } else if (/-theme$/.test(k)) {
        if (d.getAttribute("data-theme") === v || !v) return;
        el = document.getElementById("theme-btn");
      } else if (/-bg$/.test(k)) {
        if (d.getAttribute("data-bg") === v || !v) return;
        el = document.querySelector('.sw[data-bg="' + v + '"]');
      }
      if (el) el.click(); else left++;
    });
    if (left) { // nothing to click: reload once so the app reads the new values
      try { if (sessionStorage.getItem("rg-prefs-reloaded")) return; sessionStorage.setItem("rg-prefs-reloaded", "1"); setTimeout(function () { sessionStorage.removeItem("rg-prefs-reloaded"); }, 10000); } catch (e) {}
      location.reload();
    }
  }

  /* ---------------- export all my data ---------------- */
  // Cloud: every row of this user in ron/userdata (listed page by page; only rows whose id matches this user's own row id are kept),
  // plus a direct read of every known (app, key) the list didn't return. Device: this site's app keys in localStorage.
  // Never exported: the session (cookieFallback), the pending sign-in (rg-account-pending), the cached news feed (rg-news-cache).
  var KNOWN_ROWS = [["prefs", "all"], ["news", "read"], ["news", "saved"], ["shopping", "items"], ["myideas", "items"], ["myclock", "alarms"], ["myrehab", "items"], ["mycalm", "items"]];
  var APP_NAMES = { site: "Site settings", account: "Account", home: "Landing page", news: "Updatify", shopping: "Shopping list", myideas: "Checklist", myclock: "My alarm clock",
    myrehab: "Rehabify", mycalm: "Calmify", my: "My private apps", clockify: "Clockify", healify: "Healify", wealthify: "Wealthify", monthly: "Monthly", pumpify: "Pumpify",
    diagnosify: "Diagnosify", balancify: "Balancify", sounds: "Sounds", relax: "Relax", other: "Other" };
  var NO_EXPORT = { "cookieFallback": 1, "rg-account-pending": 1, "rg-news-cache": 1 };
  function appOfKey(k) { // localStorage key / prefs key -> app section
    if (k === "rg-lang" || k === "rg-prefs-meta") return "site";
    if (k === "quietNightMode") return "relax";
    var m = /^rg-([a-z0-9]+)(?:-([a-z0-9]+))?/.exec(k); if (!m) return "other";
    var a = m[1], b = m[2];
    if (a === "my") return b === "shopping" ? "shopping" : "my";
    if (a === "clock") return "myclock";
    if (a === "alarm" || a === "alarms") return "clockify";
    if (a === "wealth") return "wealthify";
    return APP_NAMES[a] ? a : "other";
  }
  function listRows() {
    var out = [], uid = cur.id;
    function page(after) {
      var q = ["queries[]=" + encodeURIComponent(JSON.stringify({ method: "limit", values: [100] }))];
      if (after) q.push("queries[]=" + encodeURIComponent(JSON.stringify({ method: "cursorAfter", values: [after] })));
      return req("GET", rowsPath() + "?" + q.join("&")).then(function (r) {
        var rows = (r && r.rows) || [];
        rows.forEach(function (row) { if (row && row.app != null && row.$id === rowId(uid, row.app, row.key)) out.push(row); });
        return rows.length === 100 && out.length < 5000 ? page(rows[rows.length - 1].$id) : out;
      });
    }
    return page(null);
  }
  function collectCloud() {
    var res = { rows: [], ok: true, offline: false };
    if (!cur) { res.ok = false; return Promise.resolve(res); }
    return listRows().catch(function (e) { res.listFailed = true; if (e && e.status === 0) res.offline = true; return []; }).then(function (rows) {
      res.rows = rows;
      if (res.offline) { res.ok = false; return res; }
      var have = {}; rows.forEach(function (r) { have[r.app + "\u0001" + r.key] = 1; });
      return Promise.all(KNOWN_ROWS.filter(function (x) { return !have[x[0] + "\u0001" + x[1]]; }).map(function (x) {
        var id = rowId(cur.id, x[0], x[1]);
        return req("GET", rowsPath(id)).then(function (row) { if (row) res.rows.push(row); }, function (e) {
          if (e.status === 404) return;
          res.ok = false; if (e.status === 0) res.offline = true;
        });
      })).then(function () { return res; });
    });
  }
  function parseVal(v) { if (typeof v !== "string") return v; var j = jparse(v, undefined); return j === undefined ? v : j; }
  function exportAll() {
    var u = cur; if (!u) return Promise.reject(signedOut());
    var now = new Date();
    return collectCloud().then(function (c) {
      var apps = {}, devCount = 0;
      function sec(a) { return apps[a] || (apps[a] = { name: APP_NAMES[a] || a, cloud: {}, device: {} }); }
      c.rows.forEach(function (row) {
        var v = parseVal(row.value), entry = { value: v, updatedAt: row.$updatedAt || null, createdAt: row.$createdAt || null };
        if (row.app === P_APP && v && typeof v === "object") { // cloud prefs: split per key into its app's section
          Object.keys(v).forEach(function (k) { var x = v[k] || {}; sec(appOfKey(k)).cloud["prefs:" + k] = { value: x.v, changedAt: x.t ? new Date(x.t).toISOString() : null }; });
        } else if (APP_NAMES[row.app]) sec(row.app).cloud[row.key] = entry;
        else sec("other").cloud[row.app + "/" + row.key] = entry;
      });
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i); if (!k || NO_EXPORT[k]) continue;
          if (k.indexOf("rg-") !== 0 && k !== "quietNightMode") continue;
          sec(appOfKey(k)).device[k] = parseVal(localStorage.getItem(k)); devCount++;
        }
      } catch (e) {}
      var status = c.offline ? "offline" : c.ok ? "ok" : "partial";
      var pad = function (n) { return String(n).padStart(2, "0"); };
      var day = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
      var data = {
        format: "healify-data-export", version: 1,
        exportedAt: now.toISOString(), exportedAtLocal: now.toLocaleString("en-GB", { hour12: false }) + " (UTC" + (now.getTimezoneOffset() <= 0 ? "+" : "-") + Math.abs(now.getTimezoneOffset() / 60) + ")",
        site: location.origin + "/ron-gershinsky-site/", exportedFrom: location.pathname,
        account: { id: u.id, email: u.email, name: u.name || "" },
        cloud: { status: status, rows: c.rows.length, method: c.listFailed ? "known rows read one by one (listing was not allowed)" : "all rows listed", note: status === "ok" ? (c.listFailed ? "Every known app row of this account in ron/userdata." : "All rows of this account in ron/userdata.") : status === "offline" ? "No connection: cloud data is NOT included, only this device's data." : "Some cloud rows could not be read; the cloud part may be incomplete." },
        device: { keys: devCount, note: "This browser's localStorage keys of the site's apps (session tokens and the cached news feed are left out)." },
        apps: apps
      };
      var file = "healify-data-" + day + ".json";
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = file; a.rel = "noopener"; a.style.display = "none";
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
      return { status: status, file: file, data: data };
    });
  }

  /* ---------------- UI ---------------- */
  var T = {
    he: {
      btn: "התחבר לחשבון שלך", btnShort: "התחבר",
      head: "התחבר לחשבון שלך וקבל גישה למידע המעודכן עבורך בכל האפליקציות",
      ben: ["מה שקראת, סימנת ושמרת – מסונכרן בין הנייד, הלפטופ וכל מכשיר", "חשבון אחד לכל משפחת האפליקציות", "ההיסטוריה והתוצאות שלך נשמרות ולא הולכות לאיבוד", "כניסה עם קוד חד־פעמי למייל, או עם סיסמה שתגדיר"],
      email: "כתובת המייל שלך", send: "שלח לי קוד", sending: "שולח…",
      codeHead: "הזן את הקוד שקיבלת במייל", codeSub: "שלחנו קוד בן 6 ספרות אל", code: "קוד בן 6 ספרות", verify: "אמת והתחבר", verifying: "מאמת…",
      fromNote: "הקוד נשלח משירות ההתחברות שלנו Appwrite, במייל עם הכותרת “OTP for Healify Apps Login”. לא רואה? בדוק בספאם. אם קיבלת כמה מיילים כאלה, הקוד הנכון הוא במייל האחרון.",
      resend: "שלח קוד חדש", resent: "נשלח קוד חדש. בדוק את המייל (גם בספאם).", other: "החלף מייל",
      nameHead: "איך לקרוא לך?", nameSub: "השם יוצג בכל האפליקציות במקום המייל. אפשר לדלג.", name: "השם שלך", save: "שמור", skip: "דלג",
      signedAs: "מחובר כ־", hello: "שלום", rename: "שינוי שם", my: "האפליקציות הפרטיות שלי", exp: "ייצוא כל המידע שלי", expBusy: "מכין את הקובץ…", expDone: "הקובץ {f} ירד למכשיר שלך. הוא כולל את כל המידע שלך מהענן ומהמכשיר הזה.", expOffline: "אין חיבור לאינטרנט, לכן הקובץ {f} כולל רק את המידע שנשמר במכשיר הזה. כדי לקבל גם את המידע מהענן, נסה שוב כשתחזור לרשת.", expPartial: "חלק מהמידע בענן לא נטען, לכן הקובץ {f} כולל רק חלק ממנו, וגם את המידע שבמכשיר הזה. כדאי לנסות שוב בעוד רגע.", out: "התנתק", close: "סגירה", account: "החשבון שלך",
      synced: "אתה מחובר בכל האפליקציות, והנתונים וההעדפות שלך מסונכרנים בין המכשירים.",
      eEmail: "כתובת המייל לא נראית תקינה. בדוק אותה ונסה שוב.", eCode: "הקוד לא תואם או שפג תוקפו (קוד תקף 15 דקות ולשימוש אחד). אם קיבלת כמה מיילים, הזן את הקוד מהמייל האחרון, או בקש קוד חדש.",
      eRate: "יותר מדי ניסיונות. חכה כמה דקות ונסה שוב.", eNet: "אין חיבור לאינטרנט. בדוק את החיבור ונסה שוב.",
      eExp: "פג תוקף הקוד. בקש קוד חדש.", eGen: "משהו השתבש. נסה שוב.",
      usePw: "כניסה עם סיסמה", useCode: "כניסה עם קוד למייל", or: "או",
      pwHead: "כניסה עם סיסמה", pw: "סיסמה", pwGo: "התחבר", pwGoing: "מתחבר…",
      forgot: "שכחת סיסמה? שלח לי קוד למייל",
      pwNote: "עדיין לא הגדרת סיסמה? היכנס פעם אחת עם קוד למייל, ואז בחר „הגדרת סיסמה” בחשבון שלך.",
      setPw: "הגדרת סיסמה", chPw: "שינוי סיסמה", setPwSub: "עם סיסמה תוכל להיכנס בכל מכשיר עם המייל והסיסמה, בלי לחכות לקוד במייל. הקוד למייל ימשיך לעבוד גם הוא.",
      oldPw: "הסיסמה הנוכחית", newPw: "סיסמה חדשה (לפחות 8 תווים)", newPw2: "הקלד שוב את הסיסמה החדשה", savePw: "שמור סיסמה", savingPw: "שומר…",
      pwSaved: "הסיסמה נשמרה. בפעם הבאה תוכל להיכנס איתה.", pwHint: "רוצה להיכנס בלי לחכות למייל? הגדר סיסמה.", back: "חזרה", show: "הצג סיסמה",
      eCodeLen: "הקוד צריך להכיל 6 ספרות. הזן רק את המספר מהמייל.",
      eSession: "הקוד אושר, אבל הדפדפן לא שמר את ההתחברות (כנראה חסימת עוגיות או אחסון, או גלישה בסתר). רענן את הדף, בקש קוד חדש ונסה שוב, או נסה דפדפן אחר.",
      eCred: "המייל או הסיסמה לא נכונים. אם עדיין לא הגדרת סיסמה, היכנס עם קוד למייל.",
      ePwShort: "הסיסמה צריכה להכיל לפחות 8 תווים.", ePwMatch: "שתי הסיסמאות החדשות לא זהות.", eOldPw: "הסיסמה הנוכחית לא נכונה.",
      ePwWeak: "אי אפשר להשתמש בסיסמה הזו (היא מופיעה בדליפות מידע, דומה לפרטים שלך או לסיסמה קודמת). בחר סיסמה אחרת.",
      eBlocked: "החשבון הזה חסום."
    },
    en: {
      btn: "Sign in to your account", btnShort: "Sign in",
      head: "Sign in to your account and get your up-to-date info in every app",
      ben: ["What you read, marked and saved – synced across your phone, laptop and every device", "One account for the whole family of apps", "Your history and results are saved and never get lost", "Sign in with a one-time code by email, or with a password you set"],
      email: "Your email address", send: "Send me a code", sending: "Sending…",
      codeHead: "Enter the code you got by email", codeSub: "We sent a 6-digit code to", code: "6-digit code", verify: "Verify and sign in", verifying: "Verifying…",
      fromNote: "The code is sent by our sign-in service, Appwrite, in an email titled “OTP for Healify Apps Login”. Don't see it? Check spam. If you got several of these emails, the right code is in the latest one.",
      resend: "Send a new code", resent: "A new code was sent. Check your email (and spam).", other: "Use another email",
      nameHead: "What should we call you?", nameSub: "Your name shows in every app instead of your email. You can skip this.", name: "Your name", save: "Save", skip: "Skip",
      signedAs: "Signed in as ", hello: "Hi", rename: "Change name", my: "My private apps", exp: "Export all my data", expBusy: "Preparing the file…", expDone: "{f} was downloaded to your device. It has all your data from the cloud and from this device.", expOffline: "You're offline, so {f} only has the data saved on this device. To include your cloud data too, try again when you're back online.", expPartial: "Some of your cloud data couldn't be loaded, so {f} has only part of it, plus this device's data. Try again in a moment.", out: "Sign out", close: "Close", account: "Your account",
      synced: "You're signed in across all the apps, and your data and preferences sync between your devices.",
      eEmail: "That email doesn't look right. Check it and try again.", eCode: "That code doesn't match or has expired (a code works for 15 minutes, once). If you got several emails, use the code from the latest one, or ask for a new code.",
      eRate: "Too many attempts. Wait a few minutes and try again.", eNet: "No internet connection. Check it and try again.",
      eExp: "The code expired. Ask for a new one.", eGen: "Something went wrong. Try again.",
      usePw: "Sign in with a password", useCode: "Sign in with an email code", or: "or",
      pwHead: "Sign in with a password", pw: "Password", pwGo: "Sign in", pwGoing: "Signing in…",
      forgot: "Forgot your password? Email me a code",
      pwNote: "Haven't set a password yet? Sign in once with an email code, then choose “Set a password” in your account.",
      setPw: "Set a password", chPw: "Change password", setPwSub: "With a password you can sign in on any device with your email and password, without waiting for an email code. The email code keeps working too.",
      oldPw: "Current password", newPw: "New password (at least 8 characters)", newPw2: "Type the new password again", savePw: "Save password", savingPw: "Saving…",
      pwSaved: "Password saved. Next time you can sign in with it.", pwHint: "Want to sign in without waiting for an email? Set a password.", back: "Back", show: "Show password",
      eCodeLen: "The code has 6 digits. Enter just the number from the email.",
      eSession: "The code was accepted, but your browser didn't keep the sign-in (probably blocked cookies or storage, or a private window). Reload the page, ask for a new code and try again, or try another browser.",
      eCred: "Wrong email or password. If you haven't set a password yet, sign in with an email code.",
      ePwShort: "The password needs at least 8 characters.", ePwMatch: "The two new passwords don't match.", eOldPw: "The current password is wrong.",
      ePwWeak: "That password can't be used (it appears in known data leaks, is too close to your details, or to a previous password). Choose another one.",
      eBlocked: "This account is blocked."
    }
  };
  function lang() { var l = (document.documentElement.lang || lsGet("rg-lang") || "he").slice(0, 2); return l === "en" ? "en" : "he"; }
  function t() { return T[lang()]; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function label(u) { return u ? (u.name || u.email || "") : ""; }
  function initial(u) { var s = label(u).trim(); return s ? s.charAt(0).toUpperCase() : "👤"; }
  function errMsg(e) {
    var L = t();
    if (!e) return L.eGen;
    var ty = e.type || "";
    if (ty === "network") return L.eNet;
    if (ty === "pending_expired") return L.eExp;
    if (ty === "code_len") return L.eCodeLen;
    if (ty === "session_not_kept" || ty === "user_unauthorized") return L.eSession;
    if (e.status === 429) return L.eRate;
    if (ty === "user_blocked") return L.eBlocked;
    if (ty === "user_invalid_token") return L.eCode;
    if (ty === "user_invalid_credentials") return step === "setpw" ? L.eOldPw : L.eCred;
    if (/^(user_)?password_/.test(ty) && ty !== "user_password_mismatch") return L.ePwWeak;
    if (step === "setpw" || step === "pw") { if (e.status === 400) return step === "pw" ? L.eCred : L.ePwShort; }
    if (step === "code" && e.status === 401) return L.eCode;
    if (e.status === 400) return L.eEmail;
    return L.eGen;
  }

  var CSS = [
    ".rgacc-btn{display:inline-flex;align-items:center;gap:6px;max-width:200px;font-family:inherit;font-size:13px;font-weight:700;line-height:1.2;color:#f5c542;background:#0b2a6b;border:1px solid rgba(245,197,66,.6);border-radius:999px;padding:7px 12px;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(6,17,43,.25);-webkit-tap-highlight-color:transparent;vertical-align:middle}",
    ".rgacc-btn:hover{border-color:#f5c542}.rgacc-btn:focus-visible{outline:3px solid rgba(245,197,66,.6);outline-offset:2px}",
    ".rgacc-btn .rgacc-i{flex:none;font-size:14px}.rgacc-btn .rgacc-l{overflow:hidden;text-overflow:ellipsis}",
    ".rgacc-btn.in{color:#fff;background:linear-gradient(135deg,#123a8c,#0b2a6b)}",
    ".rgacc-btn.in .rgacc-i{width:20px;height:20px;border-radius:50%;background:#f5c542;color:#0b2a6b;font-size:11.5px;font-weight:800;line-height:20px;text-align:center}",
    ".rgacc-float{position:fixed;top:calc(10px + env(safe-area-inset-top));inset-inline-end:10px;z-index:30}",
    "@media (max-width:420px){.rgacc-btn{max-width:118px;padding:7px 10px}.rgacc-btn .rgacc-full{display:none}}@media (min-width:421px){.rgacc-btn .rgacc-short{display:none}}",
    ".rgacc-back{position:fixed;inset:0;z-index:2147483000;background:rgba(4,10,28,.62);display:flex;align-items:center;justify-content:center;padding:16px;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}.rgacc-back[hidden]{display:none}",
    ".rgacc-dlg{position:relative;width:100%;max-width:420px;max-height:calc(100vh - 32px);overflow:auto;box-sizing:border-box;color:#fff;background:linear-gradient(160deg,#173a85 0%,#0f2760 45%,#0a1a3f 100%);border:1px solid rgba(245,197,66,.45);border-radius:20px;padding:22px 20px 20px;box-shadow:0 20px 60px rgba(0,0,0,.5);font-family:\"Assistant\",\"Heebo\",\"Rubik\",\"Segoe UI\",system-ui,-apple-system,Roboto,Arial,sans-serif;font-size:15.5px;line-height:1.5;text-align:start}",
    ".rgacc-dlg *{box-sizing:border-box}",
    ".rgacc-x{position:absolute;top:8px;inset-inline-end:8px;width:36px;height:36px;border:0;background:none;color:#cfd9f2;font-size:26px;line-height:1;cursor:pointer;border-radius:50%}.rgacc-x:hover{color:#fff;background:rgba(255,255,255,.08)}",
    ".rgacc-dlg h2{margin:0 0 12px;padding-inline-end:30px;font-size:19.5px;line-height:1.35;font-weight:800;color:#fff}",
    ".rgacc-dlg ul{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:7px}.rgacc-dlg li{display:flex;gap:9px;color:#dbe5fb;font-size:14.5px}.rgacc-dlg li::before{content:\"✓\";flex:none;color:#f5c542;font-weight:800}",
    ".rgacc-dlg p{margin:0 0 12px;color:#cfd9f2}.rgacc-dlg p b{color:#fff;direction:ltr;unicode-bidi:isolate}",
    ".rgacc-dlg label{display:block;font-size:13.5px;font-weight:700;color:#cfd9f2;margin:0 0 6px}",
    ".rgacc-dlg input{width:100%;font-family:inherit;font-size:17px;font-weight:600;color:#0b1f4d;background:#fff;border:2px solid transparent;border-radius:12px;padding:11px 13px;outline:none;margin:0}",
    ".rgacc-dlg input:focus{border-color:#f5c542}.rgacc-dlg input.code{letter-spacing:.4em;text-align:center;direction:ltr;font-size:22px}.rgacc-dlg input[type=email]{direction:ltr;text-align:left}",
    ".rgacc-go{display:block;width:100%;margin:12px 0 0;font-family:inherit;font-size:16px;font-weight:800;color:#0b2a6b;background:#f5c542;border:0;border-radius:999px;padding:12px 16px;cursor:pointer}.rgacc-go:hover{background:#ffd45c}.rgacc-go[disabled]{opacity:.65;cursor:default}",
    ".rgacc-dlg .rgacc-my{text-align:center;text-decoration:none;color:#ffd98a;border-color:rgba(245,197,66,.7);margin:4px 0 0}",
    ".rgacc-sec{display:block;width:100%;margin:10px 0 0;font-family:inherit;font-size:15px;font-weight:700;color:#fff;background:transparent;border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:10px 16px;cursor:pointer}.rgacc-sec:hover{border-color:#f5c542}",
    ".rgacc-links{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;margin-top:12px}.rgacc-lnk{background:none;border:0;padding:4px 0;font-family:inherit;font-size:14px;font-weight:700;color:#ffd98a;cursor:pointer}.rgacc-lnk:hover{text-decoration:underline}",
    ".rgacc-from{margin:0 0 14px;padding:10px 12px;border-radius:12px;background:rgba(245,197,66,.1);border:1px solid rgba(245,197,66,.35);color:#f3e6bf;font-size:13.5px;line-height:1.5}.rgacc-from bdi{color:#fff;font-weight:700}",
    ".rgacc-dlg input[type=password]{direction:ltr;text-align:left}.rgacc-dlg .rgacc-f2{margin-top:10px}",
    ".rgacc-dlg .rgacc-show{display:flex;align-items:center;gap:8px;margin:8px 0 0;font-size:13.5px;font-weight:600;color:#cfd9f2;cursor:pointer}.rgacc-dlg .rgacc-show input{width:auto;margin:0;padding:0;accent-color:#f5c542}",
    ".rgacc-or{display:flex;align-items:center;gap:10px;margin:14px 0 0;color:#cfd9f2;font-size:13px}.rgacc-or::before,.rgacc-or::after{content:\"\";flex:1;height:1px;background:rgba(255,255,255,.25)}",
    ".rgacc-dlg .rgacc-hint{margin:0 0 12px;padding:10px 12px;border-radius:12px;background:rgba(245,197,66,.1);border:1px solid rgba(245,197,66,.35);color:#f3e6bf;font-size:13.5px}",
    ".rgacc-err{min-height:1.2em;margin:8px 0 0;font-size:14px;color:#ffb4b4}.rgacc-err.ok{color:#ffd98a}",
    ".rgacc-who{display:flex;align-items:center;gap:12px;margin:0 0 12px}.rgacc-av{flex:none;width:46px;height:46px;border-radius:50%;background:#f5c542;color:#0b2a6b;font-size:20px;font-weight:800;line-height:46px;text-align:center}.rgacc-who b{display:block;font-size:17px}.rgacc-who span{color:#cfd9f2;font-size:14px;direction:ltr;unicode-bidi:isolate}",
    "@media (prefers-reduced-motion:no-preference){.rgacc-dlg{animation:rgacc-in .2s ease-out}}@keyframes rgacc-in{from{transform:translateY(12px);opacity:0}to{transform:none;opacity:1}}"
  ].join("\n");

  var buttons = [], back = null, step = "email", busy = false, msg = "", msgOk = false, emailDraft = "", lastFocus = null;
  function injectCss() { if (document.getElementById("rgacc-css")) return; var s = document.createElement("style"); s.id = "rgacc-css"; s.textContent = CSS; (document.head || document.documentElement).appendChild(s); }
  function renderBtn(b) {
    var u = cur, L = t();
    b.className = "rgacc-btn" + (u ? " in" : "");
    if (u) {
      b.innerHTML = '<span class="rgacc-i" aria-hidden="true">' + esc(initial(u)) + '</span><span class="rgacc-l">' + esc(label(u)) + "</span>";
      b.setAttribute("aria-label", L.account + ": " + label(u)); b.title = L.signedAs + (u.email || label(u));
    } else {
      b.innerHTML = '<span class="rgacc-i" aria-hidden="true">👤</span><span class="rgacc-l"><span class="rgacc-full">' + esc(L.btn) + '</span><span class="rgacc-short">' + esc(L.btnShort) + "</span></span>";
      b.setAttribute("aria-label", L.btn); b.title = L.btn;
    }
  }
  function mount(el) {
    injectCss();
    var b = document.createElement("button"); b.type = "button"; b.setAttribute("aria-haspopup", "dialog");
    b.onclick = function () { open(); };
    el.appendChild(b); buttons.push(b); renderBtn(b); return b;
  }
  function autoMount() {
    if (buttons.length) return;
    var slots = document.querySelectorAll("[data-rg-account]");
    if (slots.length) { for (var i = 0; i < slots.length; i++) mount(slots[i]); return; }
    if (document.body && !document.body.hasAttribute("data-rg-account-none")) { var f = document.createElement("div"); f.className = "rgacc-float"; document.body.appendChild(f); mount(f); }
  }

  function firstStep() { return cur ? "account" : (pending() ? "code" : (lsGet(METHOD_KEY) === "password" ? "pw" : "email")); }
  function open() {
    injectCss();
    if (!back) {
      back = document.createElement("div"); back.className = "rgacc-back"; back.hidden = true;
      back.addEventListener("click", function (e) { if (e.target === back) close(); else onClick(e); });
      back.addEventListener("submit", function (e) { e.preventDefault(); onSubmit(e.target); });
      back.addEventListener("input", function (e) { // keep only the 6 digits of a typed / pasted code
        var el = e.target; if (!el || el.id !== "rgacc-code") return;
        var c = cleanCode(el.value).slice(0, 6); if (c !== el.value) el.value = c;
      });
      back.addEventListener("change", function (e) { // "show password"
        var el = e.target; if (!el || el.getAttribute("data-a") !== "showpw") return;
        var ins = back.querySelectorAll("input[data-pw]"); for (var i = 0; i < ins.length; i++) ins[i].type = el.checked ? "text" : "password";
      });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && back && !back.hidden) close(); });
      document.body.appendChild(back);
    }
    lastFocus = document.activeElement;
    msg = ""; msgOk = false; busy = false; step = firstStep();
    back.hidden = false; renderDlg(true);
    if (cur && hasPw === null) refreshPw();
  }
  function refreshPw() { req("GET", "/account").then(function (u) { setUser(u); if (back && !back.hidden) renderDlg(false); }, function () {}); }
  function close() { if (back) back.hidden = true; busy = false; msg = ""; if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {} }
  function renderDlg(focus) {
    if (!back || back.hidden) return;
    var L = t(), p = pending(), u = cur, h = "";
    var keep = back.querySelector("input"), kept = keep && keep.id === "rgacc-code" ? keep.value : null;
    var note = '<div class="rgacc-err' + (msgOk ? " ok" : "") + '" role="status" aria-live="polite">' + esc(msg) + "</div>";
    var go = function (txt) { return '<button class="rgacc-go" type="submit"' + (busy ? " disabled" : "") + ">" + esc(txt) + "</button>"; };
    var emailIn = function (ac) { return '<label for="rgacc-email">' + esc(L.email) + '</label><input id="rgacc-email" type="email" inputmode="email" autocomplete="' + ac + '" autocapitalize="off" spellcheck="false" placeholder="name@example.com" value="' + esc(emailDraft || (p && p.email) || (u && u.email) || lsGet(LAST_KEY) || "") + '">'; };
    var pwIn = function (id, lab, ac, cls) { return '<div class="' + (cls || "") + '"><label for="' + id + '">' + esc(lab) + '</label><input id="' + id + '" data-pw type="password" autocomplete="' + ac + '" autocapitalize="off" spellcheck="false" dir="ltr"></div>'; };
    var showPw = '<label class="rgacc-show"><input type="checkbox" data-a="showpw">' + esc(L.show) + "</label>";
    if (step === "email") {
      h = '<h2 id="rgacc-h">' + esc(L.head) + "</h2><ul>" + L.ben.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
        '<form data-f="email" novalidate>' + emailIn("email") +
        note + go(busy ? L.sending : L.send) + "</form>" +
        '<div class="rgacc-or">' + esc(L.or) + '</div><button type="button" class="rgacc-sec" data-a="pw">🔑 ' + esc(L.usePw) + "</button>";
    } else if (step === "pw") {
      h = '<h2 id="rgacc-h">' + esc(L.pwHead) + "</h2>" +
        '<form data-f="pw" novalidate>' + emailIn("username") + pwIn("rgacc-pw", L.pw, "current-password", "rgacc-f2") + showPw +
        note + go(busy ? L.pwGoing : L.pwGo) + "</form>" +
        '<div class="rgacc-links"><button type="button" class="rgacc-lnk" data-a="forgot">' + esc(L.forgot) + "</button></div>" +
        '<p class="rgacc-hint" style="margin-top:12px">' + esc(L.pwNote) + "</p>" +
        '<button type="button" class="rgacc-sec" data-a="code">✉️ ' + esc(L.useCode) + "</button>";
    } else if (step === "code") {
      h = '<h2 id="rgacc-h">' + esc(L.codeHead) + "</h2><p>" + esc(L.codeSub) + " <b>" + esc(p ? p.email : emailDraft) + "</b></p>" +
        '<p class="rgacc-from">' + esc(L.fromNote).replace(/“([^”]+)”/, "<bdi dir=\"ltr\">“$1”</bdi>") + "</p>" +
        '<form data-f="code" novalidate><label for="rgacc-code">' + esc(L.code) + '</label><input id="rgacc-code" class="code" type="text" inputmode="numeric" autocomplete="one-time-code" dir="ltr" placeholder="••••••">' +
        note + go(busy ? L.verifying : L.verify) + "</form>" +
        '<div class="rgacc-links"><button type="button" class="rgacc-lnk" data-a="resend">' + esc(L.resend) + '</button><button type="button" class="rgacc-lnk" data-a="other">' + esc(L.other) + "</button></div>" +
        '<button type="button" class="rgacc-sec" data-a="pw">🔑 ' + esc(L.usePw) + "</button>";
    } else if (step === "name") {
      h = '<h2 id="rgacc-h">' + esc(L.nameHead) + "</h2><p>" + esc(L.nameSub) + "</p>" +
        '<form data-f="name" novalidate><label for="rgacc-name">' + esc(L.name) + '</label><input id="rgacc-name" type="text" autocomplete="name" maxlength="60" value="' + esc((u && u.name) || "") + '">' +
        note + go(L.save) + '</form><button type="button" class="rgacc-sec" data-a="skip">' + esc(L.skip) + "</button>";
    } else if (step === "setpw") {
      h = '<h2 id="rgacc-h">' + esc(hasPw ? L.chPw : L.setPw) + "</h2><p>" + esc(L.setPwSub) + "</p>" +
        '<form data-f="setpw" novalidate><input type="email" autocomplete="username" value="' + esc((u && u.email) || "") + '" readonly hidden tabindex="-1" aria-hidden="true">' +
        (hasPw ? pwIn("rgacc-oldpw", L.oldPw, "current-password", "") : "") +
        pwIn("rgacc-newpw", L.newPw, "new-password", hasPw ? "rgacc-f2" : "") + pwIn("rgacc-newpw2", L.newPw2, "new-password", "rgacc-f2") + showPw +
        note + go(busy ? L.savingPw : L.savePw) + '</form><button type="button" class="rgacc-sec" data-a="back">' + esc(L.back) + "</button>";
    } else {
      h = '<h2 id="rgacc-h">' + esc(L.account) + '</h2><div class="rgacc-who"><span class="rgacc-av" aria-hidden="true">' + esc(initial(u)) + "</span><div><b>" + esc(L.hello + ", " + label(u)) + "</b><span>" + esc((u && u.email) || "") + "</span></div></div>" +
        "<p>" + esc(L.synced) + "</p>" + (hasPw === false && !msgOk ? '<p class="rgacc-hint">' + esc(L.pwHint) + "</p>" : "") + note +
        (MY_URL ? '<a class="rgacc-sec rgacc-my" href="' + esc(MY_URL) + '"><span aria-hidden="true">🔒 </span>' + esc(L.my) + "</a>" : "") +
        '<button type="button" class="rgacc-sec" data-a="rename">' + esc(L.rename) + "</button>" +
        '<button type="button" class="rgacc-sec" data-a="setpw">🔑 ' + esc(hasPw ? L.chPw : L.setPw) + "</button>" +
        '<button type="button" class="rgacc-sec" data-a="export"' + (busy ? " disabled" : "") + '>📦 ' + esc(busy === "export" ? L.expBusy : L.exp) + "</button>" +
        '<button type="button" class="rgacc-go" data-a="out"' + (busy ? " disabled" : "") + ">" + esc(L.out) + "</button>";
    }
    back.innerHTML = '<div class="rgacc-dlg" role="dialog" aria-modal="true" aria-labelledby="rgacc-h" dir="' + (lang() === "he" ? "rtl" : "ltr") + '" lang="' + lang() + '"><button type="button" class="rgacc-x" data-a="close" aria-label="' + esc(L.close) + '">×</button>' + h + "</div>";
    var ci = back.querySelector("#rgacc-code"); if (ci && kept) ci.value = kept;
    if (focus) {
      var i = (step === "pw" && back.querySelector("#rgacc-email") && back.querySelector("#rgacc-email").value ? back.querySelector("#rgacc-pw") : null) ||
        back.querySelector("input:not([hidden]):not([type=checkbox])") || back.querySelector(".rgacc-go");
      if (i) setTimeout(function () { try { i.focus(); } catch (e) {} }, 30);
    }
  }
  function fail(e) { busy = false; msg = errMsg(e); msgOk = false; renderDlg(true); }
  function signedIn(u) {
    busy = false; emailDraft = ""; step = u && !u.name ? "name" : "account"; renderDlg(true);
    if (step === "account" && hasPw !== false) setTimeout(close, 1200);
  }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function val(f, sel) { var el = f.querySelector(sel); return el ? el.value : ""; }
  function onSubmit(f) {
    if (busy) return;
    var kind = f.getAttribute("data-f"), inp = f.querySelector("input"), v = ((inp && inp.value) || "").trim();
    msg = ""; msgOk = false;
    if (kind === "email") {
      emailDraft = v;
      if (!emailOk(v)) { msg = t().eEmail; renderDlg(true); return; }
      busy = true; renderDlg(false);
      sendCode(v).then(function () { busy = false; step = "code"; renderDlg(true); }, fail);
    } else if (kind === "pw") {
      emailDraft = v;
      var pw = val(f, "#rgacc-pw");
      if (!emailOk(v)) { msg = t().eEmail; renderDlg(true); return; }
      if (pw.length < 8) { msg = t().eCred; renderDlg(true); return; }
      busy = true; renderDlg(false);   // the form is re-rendered, so the password is gone from the page; it only goes to Appwrite
      loginPassword(v, pw).then(signedIn, fail); pw = "";
    } else if (kind === "code") {
      v = cleanCode(v);
      if (v.length !== 6) { msg = t().eCodeLen; renderDlg(true); return; }
      busy = true; renderDlg(false);
      verifyCode(v).then(signedIn, fail);
    } else if (kind === "name") {
      if (!v) { step = "account"; renderDlg(true); return; }
      busy = true; renderDlg(false);
      setName(v).then(function () { busy = false; step = "account"; renderDlg(true); if (hasPw !== false) setTimeout(close, 1200); }, fail);
    } else if (kind === "setpw") {
      var oldPw = hasPw ? val(f, "#rgacc-oldpw") : "", n1 = val(f, "#rgacc-newpw"), n2 = val(f, "#rgacc-newpw2");
      if (hasPw && !oldPw) { msg = t().eOldPw; renderDlg(true); return; }
      if (n1.length < 8) { msg = t().ePwShort; renderDlg(true); return; }
      if (n1 !== n2) { msg = t().ePwMatch; renderDlg(true); return; }
      busy = true; renderDlg(false);
      setPassword(n1, oldPw).then(function () { busy = false; step = "account"; msg = t().pwSaved; msgOk = true; renderDlg(true); }, fail);
      oldPw = n1 = n2 = "";
    }
  }
  function onClick(e) {
    var b = e.target.closest && e.target.closest("[data-a]"); if (!b || busy) return;
    var a = b.getAttribute("data-a"); if (a === "showpw") return;
    msg = ""; msgOk = false;
    var typed = back && back.querySelector("#rgacc-email"); if (typed && typed.value.trim()) emailDraft = typed.value.trim();
    if (a === "close") close();
    else if (a === "other") { clearPending(); step = "email"; renderDlg(true); }
    else if (a === "pw") { step = "pw"; renderDlg(true); }
    else if (a === "code") { step = pending() ? "code" : "email"; renderDlg(true); }
    else if (a === "forgot") { // forgot the password: fall back to a code by email
      var em = emailDraft;
      if (!emailOk(em)) { step = "email"; msg = em ? t().eEmail : ""; renderDlg(true); return; }
      busy = true; renderDlg(false);
      sendCode(em).then(function () { busy = false; step = "code"; renderDlg(true); }, function (err) { step = "email"; fail(err); });
    }
    else if (a === "resend") {
      var p = pending(); if (!p) { step = "email"; renderDlg(true); return; }
      busy = true; renderDlg(false);
      sendCode(p.email).then(function () { busy = false; msg = t().resent; msgOk = true; renderDlg(true); }, fail);
    }
    else if (a === "skip") { step = "account"; renderDlg(true); if (hasPw !== false) setTimeout(close, 700); }
    else if (a === "rename") { step = "name"; renderDlg(true); }
    else if (a === "setpw") { step = "setpw"; renderDlg(true); }
    else if (a === "back") { step = "account"; renderDlg(true); }
    else if (a === "export") {
      busy = "export"; renderDlg(false);
      exportAll().then(function (r) {
        busy = false; msg = t()[r.status === "ok" ? "expDone" : r.status === "offline" ? "expOffline" : "expPartial"].replace("{f}", r.file); msgOk = true; renderDlg(false);
      }, function (e) { if (e && e.code === "signed_out") { busy = false; step = firstStep(); renderDlg(true); } else fail(e); });
    }
    else if (a === "out") { busy = true; renderDlg(false); logout().then(function () { busy = false; close(); }); }
  }
  function renderAll() {
    buttons.forEach(renderBtn);
    if (back && !back.hidden) {
      if (cur && (step === "email" || step === "code" || step === "pw")) step = "account";   // signed in from another tab/app
      if (!cur && (step === "account" || step === "name" || step === "setpw")) step = firstStep();  // signed out from another tab/app
      renderDlg(false);
    }
  }
  // follow each app's language toggle (all of them set <html lang>)
  try { new MutationObserver(function () { buttons.forEach(renderBtn); if (back && !back.hidden) renderDlg(false); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] }); } catch (e) {}

  var ready = check();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoMount); else autoMount();

  window.RGAccount = {
    ready: ready,
    user: function () { return cur; },
    onChange: function (cb) { subs.push(cb); return function () { subs = subs.filter(function (x) { return x !== cb; }); }; },
    open: open, mount: mount, check: check,
    sendCode: sendCode, verifyCode: verifyCode, loginPassword: loginPassword, setPassword: setPassword,
    hasPassword: function () { return hasPw; }, setName: setName, logout: logout,
    get: get, set: set, syncPrefs: syncPrefs, exportAll: exportAll
  };
  try { window.dispatchEvent(new Event("rg-account-ready")); } catch (e) {}
})();
