/* rg-account.js — one shared account for all of Ron's apps (Appwrite Cloud, no build step, no SDK).
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
     setName(name)      -> Promise<user>
     logout()           -> Promise
     get(app, key)      -> Promise<value|null>   JSON in table ron/userdata, one row per (user, app, key). Rejects (err.code "signed_out") when signed out.
     set(app, key, v)   -> Promise<v>            upsert; the row is readable/writable by this user only
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
  function setUser(u, fromStorage) {
    u = norm(u); if (same(u, cur)) return;
    var was = cur && cur.id; cur = u;
    if (!fromStorage) lsSet(USER_KEY, u ? JSON.stringify(u) : null);
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

  function sendCode(email) {
    email = String(email || "").trim();
    return req("POST", "/account/tokens/email", { userId: "unique()", email: email }).then(function (tok) {
      lsSet(PEND_KEY, JSON.stringify({ userId: tok.userId, email: email, at: Date.now() }));
      return tok.userId;
    });
  }
  function pending() { var p = jparse(lsGet(PEND_KEY), null); return p && p.userId && Date.now() - p.at < PEND_TTL ? p : null; }
  function verifyCode(code) {
    var p = pending(); if (!p) { var e = new Error("expired"); e.type = "pending_expired"; return Promise.reject(e); }
    return req("POST", "/account/sessions/token", { userId: p.userId, secret: String(code || "").replace(/\D/g, "") })
      .then(function () { return req("GET", "/account"); })
      .then(function (u) { lsSet(PEND_KEY, null); setUser(u); return cur; });
  }
  function setName(name) { return req("PATCH", "/account/name", { name: String(name || "").trim().slice(0, 128) }).then(function (u) { setUser(u); return cur; }); }
  function logout() {
    return req("DELETE", "/account/sessions/current").catch(function () {}).then(function () { lsSet(FB_KEY, null); setUser(null); });
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

  /* ---------------- UI ---------------- */
  var T = {
    he: {
      btn: "התחבר לחשבון שלך", btnShort: "התחבר",
      head: "התחבר לחשבון שלך וקבל גישה למידע המעודכן עבורך בכל האפליקציות",
      ben: ["מה שקראת, סימנת ושמרת – מסונכרן בין הנייד, הלפטופ וכל מכשיר", "חשבון אחד לכל משפחת האפליקציות", "ההיסטוריה והתוצאות שלך נשמרות ולא הולכות לאיבוד", "בלי סיסמה – קוד חד־פעמי למייל"],
      email: "כתובת המייל שלך", send: "שלח לי קוד", sending: "שולח…",
      codeHead: "הזן את הקוד שקיבלת במייל", codeSub: "שלחנו קוד בן 6 ספרות אל", code: "קוד בן 6 ספרות", verify: "אמת והתחבר", verifying: "מאמת…",
      fromNote: "הקוד נשלח משירות ההתחברות שלנו Appwrite, במייל עם הכותרת “OTP for Ron Gershinsky Apps Login”. לא רואה? בדוק בספאם.",
      resend: "שלח קוד חדש", resent: "נשלח קוד חדש. בדוק את המייל (גם בספאם).", other: "החלף מייל",
      nameHead: "איך לקרוא לך?", nameSub: "השם יוצג בכל האפליקציות במקום המייל. אפשר לדלג.", name: "השם שלך", save: "שמור", skip: "דלג",
      signedAs: "מחובר כ־", hello: "שלום", rename: "שינוי שם", my: "האפליקציות הפרטיות שלי", out: "התנתק", close: "סגירה", account: "החשבון שלך",
      synced: "אתה מחובר בכל האפליקציות, והנתונים וההעדפות שלך מסונכרנים בין המכשירים.",
      eEmail: "כתובת המייל לא נראית תקינה. בדוק אותה ונסה שוב.", eCode: "הקוד שגוי או שפג תוקפו. נסה שוב או בקש קוד חדש.",
      eRate: "יותר מדי ניסיונות. חכה כמה דקות ונסה שוב.", eNet: "אין חיבור לאינטרנט. בדוק את החיבור ונסה שוב.",
      eExp: "פג תוקף הקוד. בקש קוד חדש.", eGen: "משהו השתבש. נסה שוב."
    },
    en: {
      btn: "Sign in to your account", btnShort: "Sign in",
      head: "Sign in to your account and get your up-to-date info in every app",
      ben: ["What you read, marked and saved – synced across your phone, laptop and every device", "One account for the whole family of apps", "Your history and results are saved and never get lost", "No password – a one-time code by email"],
      email: "Your email address", send: "Send me a code", sending: "Sending…",
      codeHead: "Enter the code you got by email", codeSub: "We sent a 6-digit code to", code: "6-digit code", verify: "Verify and sign in", verifying: "Verifying…",
      fromNote: "The code is sent by our sign-in service, Appwrite, in an email titled “OTP for Ron Gershinsky Apps Login”. Don't see it? Check spam.",
      resend: "Send a new code", resent: "A new code was sent. Check your email (and spam).", other: "Use another email",
      nameHead: "What should we call you?", nameSub: "Your name shows in every app instead of your email. You can skip this.", name: "Your name", save: "Save", skip: "Skip",
      signedAs: "Signed in as ", hello: "Hi", rename: "Change name", my: "My private apps", out: "Sign out", close: "Close", account: "Your account",
      synced: "You're signed in across all the apps, and your data and preferences sync between your devices.",
      eEmail: "That email doesn't look right. Check it and try again.", eCode: "Wrong or expired code. Try again or ask for a new one.",
      eRate: "Too many attempts. Wait a few minutes and try again.", eNet: "No internet connection. Check it and try again.",
      eExp: "The code expired. Ask for a new one.", eGen: "Something went wrong. Try again."
    }
  };
  function lang() { var l = (document.documentElement.lang || lsGet("rg-lang") || "he").slice(0, 2); return l === "en" ? "en" : "he"; }
  function t() { return T[lang()]; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function label(u) { return u ? (u.name || u.email || "") : ""; }
  function initial(u) { var s = label(u).trim(); return s ? s.charAt(0).toUpperCase() : "👤"; }
  function errMsg(e) {
    if (!e) return t().eGen;
    if (e.type === "network") return t().eNet;
    if (e.type === "pending_expired") return t().eExp;
    if (e.status === 429) return t().eRate;
    if (e.status === 401 || /token|credentials/i.test(e.type)) return t().eCode;
    if (e.status === 400) return t().eEmail;
    return t().eGen;
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

  function open() {
    injectCss();
    if (!back) {
      back = document.createElement("div"); back.className = "rgacc-back"; back.hidden = true;
      back.addEventListener("click", function (e) { if (e.target === back) close(); else onClick(e); });
      back.addEventListener("submit", function (e) { e.preventDefault(); onSubmit(e.target); });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && back && !back.hidden) close(); });
      document.body.appendChild(back);
    }
    lastFocus = document.activeElement;
    msg = ""; msgOk = false; busy = false; step = cur ? "account" : (pending() ? "code" : "email");
    back.hidden = false; renderDlg(true);
  }
  function close() { if (back) back.hidden = true; busy = false; msg = ""; if (lastFocus && lastFocus.focus) try { lastFocus.focus(); } catch (e) {} }
  function renderDlg(focus) {
    if (!back || back.hidden) return;
    var L = t(), p = pending(), u = cur, h = "";
    var keep = back.querySelector("input"), kept = keep && keep.id === "rgacc-code" ? keep.value : null;
    var note = '<div class="rgacc-err' + (msgOk ? " ok" : "") + '" role="status" aria-live="polite">' + esc(msg) + "</div>";
    var go = function (txt) { return '<button class="rgacc-go" type="submit"' + (busy ? " disabled" : "") + ">" + esc(txt) + "</button>"; };
    if (step === "email") {
      h = '<h2 id="rgacc-h">' + esc(L.head) + "</h2><ul>" + L.ben.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>" +
        '<form data-f="email" novalidate><label for="rgacc-email">' + esc(L.email) + '</label><input id="rgacc-email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="name@example.com" value="' + esc(emailDraft || (p && p.email) || "") + '">' +
        note + go(busy ? L.sending : L.send) + "</form>";
    } else if (step === "code") {
      h = '<h2 id="rgacc-h">' + esc(L.codeHead) + "</h2><p>" + esc(L.codeSub) + " <b>" + esc(p ? p.email : emailDraft) + "</b></p>" +
        '<p class="rgacc-from">' + esc(L.fromNote).replace(/“([^”]+)”/, "<bdi dir=\"ltr\">“$1”</bdi>") + "</p>" +
        '<form data-f="code" novalidate><label for="rgacc-code">' + esc(L.code) + '</label><input id="rgacc-code" class="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••">' +
        note + go(busy ? L.verifying : L.verify) + "</form>" +
        '<div class="rgacc-links"><button type="button" class="rgacc-lnk" data-a="resend">' + esc(L.resend) + '</button><button type="button" class="rgacc-lnk" data-a="other">' + esc(L.other) + "</button></div>";
    } else if (step === "name") {
      h = '<h2 id="rgacc-h">' + esc(L.nameHead) + "</h2><p>" + esc(L.nameSub) + "</p>" +
        '<form data-f="name" novalidate><label for="rgacc-name">' + esc(L.name) + '</label><input id="rgacc-name" type="text" autocomplete="name" maxlength="60" value="' + esc((u && u.name) || "") + '">' +
        note + go(L.save) + '</form><button type="button" class="rgacc-sec" data-a="skip">' + esc(L.skip) + "</button>";
    } else {
      h = '<h2 id="rgacc-h">' + esc(L.account) + '</h2><div class="rgacc-who"><span class="rgacc-av" aria-hidden="true">' + esc(initial(u)) + "</span><div><b>" + esc(L.hello + ", " + label(u)) + "</b><span>" + esc((u && u.email) || "") + "</span></div></div>" +
        "<p>" + esc(L.synced) + "</p>" + note +
        (MY_URL ? '<a class="rgacc-sec rgacc-my" href="' + esc(MY_URL) + '"><span aria-hidden="true">🔒 </span>' + esc(L.my) + "</a>" : "") +
        '<button type="button" class="rgacc-sec" data-a="rename">' + esc(L.rename) + '</button><button type="button" class="rgacc-go" data-a="out"' + (busy ? " disabled" : "") + ">" + esc(L.out) + "</button>";
    }
    back.innerHTML = '<div class="rgacc-dlg" role="dialog" aria-modal="true" aria-labelledby="rgacc-h" dir="' + (lang() === "he" ? "rtl" : "ltr") + '" lang="' + lang() + '"><button type="button" class="rgacc-x" data-a="close" aria-label="' + esc(L.close) + '">×</button>' + h + "</div>";
    var ci = back.querySelector("#rgacc-code"); if (ci && kept) ci.value = kept;
    if (focus) { var i = back.querySelector("input") || back.querySelector(".rgacc-go"); if (i) setTimeout(function () { try { i.focus(); } catch (e) {} }, 30); }
  }
  function fail(e) { busy = false; msg = errMsg(e); msgOk = false; renderDlg(true); }
  function onSubmit(f) {
    if (busy) return;
    var kind = f.getAttribute("data-f"), inp = f.querySelector("input"), v = ((inp && inp.value) || "").trim();
    msg = ""; msgOk = false;
    if (kind === "email") {
      emailDraft = v;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { msg = t().eEmail; renderDlg(true); return; }
      busy = true; renderDlg(false);
      sendCode(v).then(function () { busy = false; step = "code"; renderDlg(true); }, fail);
    } else if (kind === "code") {
      v = v.replace(/\D/g, "");
      if (v.length !== 6) { msg = t().eCode; renderDlg(true); return; }
      busy = true; renderDlg(false);
      verifyCode(v).then(function (u) {
        busy = false; emailDraft = ""; step = u && !u.name ? "name" : "account"; renderDlg(true);
        if (step === "account") setTimeout(close, 1200);
      }, fail);
    } else if (kind === "name") {
      if (!v) { step = "account"; renderDlg(true); return; }
      busy = true; renderDlg(false);
      setName(v).then(function () { busy = false; step = "account"; renderDlg(true); setTimeout(close, 1200); }, fail);
    }
  }
  function onClick(e) {
    var b = e.target.closest && e.target.closest("[data-a]"); if (!b || busy) return;
    var a = b.getAttribute("data-a"); msg = ""; msgOk = false;
    if (a === "close") close();
    else if (a === "other") { lsSet(PEND_KEY, null); step = "email"; renderDlg(true); }
    else if (a === "resend") {
      var p = pending(); if (!p) { step = "email"; renderDlg(true); return; }
      busy = true; renderDlg(false);
      sendCode(p.email).then(function () { busy = false; msg = t().resent; msgOk = true; renderDlg(true); }, fail);
    }
    else if (a === "skip") { step = "account"; renderDlg(true); setTimeout(close, 700); }
    else if (a === "rename") { step = "name"; renderDlg(true); }
    else if (a === "out") { busy = true; renderDlg(false); logout().then(function () { busy = false; close(); }); }
  }
  function renderAll() {
    buttons.forEach(renderBtn);
    if (back && !back.hidden) {
      if (cur && (step === "email" || step === "code")) step = "account";   // signed in from another tab/app
      if (!cur && (step === "account" || step === "name")) step = "email";  // signed out from another tab/app
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
    sendCode: sendCode, verifyCode: verifyCode, setName: setName, logout: logout,
    get: get, set: set, syncPrefs: syncPrefs
  };
  try { window.dispatchEvent(new Event("rg-account-ready")); } catch (e) {}
})();
