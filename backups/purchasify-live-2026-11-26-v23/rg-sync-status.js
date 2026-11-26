/* Live Journalify (yomanli/) and Purchasify (purchasify/) only. Other apps do not load this file.
   Same status rules as live Listify: saving, blocked large deletion,
   signed-out / this device only, real offline, auth, forbidden, paused, 5xx,
   and a repeated timeout. Also a 15s timeout around Appwrite fetches on this
   page, because shared/rg-account.js is shared with apps Ron has not approved
   changing. That file still turns a rejected fetch into type "network" and
   keeps the real failure on cause, so classifyError reads cause.timeout.
   Purchasify items pass { keepGone: true }: a "gone" flag hides a category, not a shopping item. */
(function (root) {
  "use strict";
  var FAIL_LIMIT = 2;
  var REQ_MS = 15000;
  var BULK_MS = 60000;
  var APPWRITE = "https://fra.cloud.appwrite.io/v1";

  function classifyError(e) {
    if (!e) return "network";
    if (e.code === "signed_out" || e.type === "signed_out") return "signed_out";
    if (e.timeout || e.type === "timeout") return "timeout";
    var cause = e.cause;
    if (cause && cause !== e && (cause.timeout || cause.type === "timeout")) return "timeout";
    var blob = String((e.type || "") + " " + (e.message || "")).toLowerCase();
    if (blob.indexOf("project_paused") !== -1) return "paused";
    var st = e.status;
    if (st === 401) return "auth";
    if (st === 403) return "denied";
    if (typeof st === "number" && st >= 400) return "server";
    if (st === 0 || e.type === "network") return "network";
    return "server";
  }

  /* What the status line should say. blocked wins over "saving" even while a read is in flight,
     because that is the state that used to sit on שומר… forever after a successful read. */
  function kind(f) {
    f = f || {};
    if (!f.maySync) return "localOnly";
    if (f.blocked && !(typeof f.bulkUntil === "number" && f.bulkUntil > Date.now())) return "blocked";
    if (f.err === "auth") return "syncErrorAuth";
    if (f.err === "denied") return "syncErrorDenied";
    if (f.err === "paused") return "syncErrorPaused";
    if (f.err === "server") return "syncErrorServer";
    if (f.err === "timeout") return "syncErrorTimeout";
    if (f.offline || f.onLine === false) return "offline";
    if (f.pending || f.busy) return "saving";
    return "synced";
  }

  function applyFailure(prev, e, onLine) {
    var c = classifyError(e);
    var failN = (prev && prev.failN) || 0;
    var out = { offline: false, syncErr: "", failN: failN };
    if (c === "signed_out") return out;
    if (c === "network" && onLine === false) { out.offline = true; return out; }
    out.failN = failN + 1;
    if (c === "auth" || c === "denied" || c === "paused" || c === "server") { out.syncErr = c; return out; }
    if (c === "timeout") { out.syncErr = out.failN >= FAIL_LIMIT ? "timeout" : ""; return out; }
    out.syncErr = out.failN >= FAIL_LIMIT ? "server" : "";
    return out;
  }

  function applySuccess(prev, opts) {
    var blocked = !!(opts && opts.blocked);
    var sentSame = !!(opts && opts.sentSame);
    return {
      offline: false,
      syncErr: "",
      failN: 0,
      holdBlocked: blocked,
      clearPending: !blocked && sentSame,
      again: !blocked && !sentSame
    };
  }

  function liveCount(m, opts) {
    var n = 0, k, x, keepGone = !!(opts && opts.keepGone);
    if (!m || typeof m !== "object") return 0;
    for (k in m) { x = m[k]; if (x && !x.deleted && (keepGone || !x.gone)) n++; }
    return n;
  }

  /* A write that drops most of the cloud copy is refused unless this device just
     confirmed a large deletion (bulkUntil in the future). opts.keepGone counts a
     gone flag as still live (Purchasify shopping items). Categories and journal
     entries do not pass it, so gone hides the record. */
  function tooManyGone(next, cloud, now, bulkUntil, opts) {
    if (typeof bulkUntil === "number" && now < bulkUntil) return false;
    var before = liveCount(cloud, opts), gone = before - liveCount(next, opts);
    return before >= 4 && gone >= 3 && gone * 2 > before;
  }

  function isLive(x, opts) {
    if (!x || x.deleted) return false;
    if (opts && opts.keepGone) return true;
    return !x.gone;
  }

  /* Bring back cloud items that were deleted on this device. Live local items, including
     edits and additions, stay as they are. */
  function restoreLive(local, cloud, opts) {
    var out = {}, k, x, c, y, f, at, F, fk, keepGone = !!(opts && opts.keepGone);
    local = local && typeof local === "object" ? local : {};
    cloud = cloud && typeof cloud === "object" ? cloud : {};
    for (k in local) out[k] = local[k];
    for (k in cloud) {
      c = cloud[k];
      if (!isLive(c, opts)) continue;
      x = out[k];
      if (isLive(x, opts)) continue;
      y = {};
      for (f in c) {
        if (f === "deleted") continue;
        if (f === "gone" && !keepGone) continue;
        y[f] = c[f];
      }
      at = Math.max(typeof c.at === "number" ? c.at : 0, x && typeof x.at === "number" ? x.at : 0) + 1;
      y.at = at;
      if (y._f && typeof y._f === "object") {
        F = {};
        for (fk in y._f) F[fk] = y._f[fk];
        F["~"] = at;
        y._f = F;
      }
      out[k] = y;
    }
    return out;
  }

  var ASK_Q = "זיהיתי הרבה מחיקות ורוצה לוודא שאתה בטוח לגבי זה?";
  var ASK_YES = "כן, העלי לענן";
  var ASK_NO = "לא, שחזרי מחיקות";

  function ensureAskCss(doc) {
    if (!doc || doc.getElementById("rg-delask-css")) return;
    var st = doc.createElement("style");
    st.id = "rg-delask-css";
    st.textContent = ""
      + ".rg-delask-back{position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-end;justify-content:center;padding:12px;background:color-mix(in srgb, var(--bg) 45%, transparent)}"
      + ".rg-delask{width:100%;max-width:440px;margin:0;box-sizing:border-box;background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:18px;padding:20px 16px calc(16px + env(safe-area-inset-bottom));box-shadow:var(--shadow);text-align:start}"
      + ".rg-delask p{margin:0 0 16px;font:700 18px/1.45 var(--sans);color:var(--fg)}"
      + ".rg-delask button{display:flex;width:100%;min-height:48px;align-items:center;justify-content:center;margin:8px 0 0;padding:0 16px;border-radius:14px;font:700 17px/1.2 var(--sans);cursor:pointer}"
      + ".rg-delask button.yes{background:var(--accent);color:var(--accentink);border:0}"
      + ".rg-delask button.no{background:var(--card);color:var(--fg);border:1px solid var(--line)}"
      + "@media (min-width:700px){.rg-delask-back{align-items:center}}";
    (doc.head || doc.documentElement).appendChild(st);
  }

  function closeDeletion() {
    var doc = root.document;
    if (!doc) return;
    var el = doc.getElementById("rg-delask-back");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function openDeletion(opts) {
    var doc = root.document;
    if (!doc || !doc.body) return;
    if (doc.getElementById("rg-delask-back")) return;
    opts = opts || {};
    ensureAskCss(doc);
    var back = doc.createElement("div");
    back.id = "rg-delask-back";
    back.className = "rg-delask-back";
    var box = doc.createElement("div");
    box.className = "rg-delask";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("dir", "rtl");
    box.setAttribute("aria-labelledby", "rg-delask-q");
    var p = doc.createElement("p");
    p.id = "rg-delask-q";
    p.textContent = ASK_Q;
    var yes = doc.createElement("button");
    yes.type = "button";
    yes.className = "yes";
    yes.textContent = ASK_YES;
    var no = doc.createElement("button");
    no.type = "button";
    no.className = "no";
    no.textContent = ASK_NO;
    function run(fn) {
      closeDeletion();
      if (typeof fn === "function") fn();
    }
    yes.addEventListener("click", function () { run(opts.onYes); });
    no.addEventListener("click", function () { run(opts.onNo); });
    box.appendChild(p);
    box.appendChild(yes);
    box.appendChild(no);
    back.appendChild(box);
    doc.body.appendChild(back);
    try { yes.focus(); } catch (e) {}
  }

  function fillStatus(el, key, label, action) {
    if (!el) return;
    var attention = key === "offline" || key === "blocked" || (key && String(key).indexOf("syncError") === 0);
    el.className = "status" + (attention ? " off" : "");
    while (el.firstChild) el.removeChild(el.firstChild);
    if (!key || !label) { el.title = ""; return; }
    var doc = el.ownerDocument || root.document;
    var span = doc.createElement("span");
    span.className = "status-txt";
    span.textContent = label;
    el.appendChild(span);
    el.title = label;
    if (key === "blocked" && action && typeof action.fn === "function") {
      var b = doc.createElement("button");
      b.type = "button";
      b.className = "status-act";
      b.textContent = action.label || "";
      b.addEventListener("click", function (ev) { if (ev && ev.preventDefault) ev.preventDefault(); action.fn(); });
      el.appendChild(b);
    }
  }

  function fetchWithTimeout(doFetch, url, opts, ms) {
    ms = typeof ms === "number" ? ms : REQ_MS;
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var opt = {};
    var src = opts || {};
    for (var k in src) opt[k] = src[k];
    if (ctrl) opt.signal = ctrl.signal;
    return new Promise(function (resolve, reject) {
      var done = false, timer = null;
      function finish(err, val) {
        if (done) return;
        done = true;
        if (timer) clearTimeout(timer);
        if (err) reject(err); else resolve(val);
      }
      timer = setTimeout(function () {
        if (ctrl) { try { ctrl.abort(); } catch (e) {} }
        var e = new Error("timeout");
        e.status = 0; e.type = "timeout"; e.timeout = true;
        finish(e);
      }, ms);
      Promise.resolve().then(function () { return doFetch(url, opt); }).then(function (v) { finish(null, v); }, function (err) {
        var aborted = !!(err && (err.name === "AbortError" || (ctrl && ctrl.signal && ctrl.signal.aborted)));
        if (aborted || (err && (err.timeout || err.type === "timeout"))) {
          var e = new Error("timeout");
          e.status = 0; e.type = "timeout"; e.timeout = true; e.cause = err;
          finish(e);
          return;
        }
        if (err && err.type) { finish(err); return; }
        var n = new Error("network");
        n.status = 0; n.type = "network"; n.cause = err;
        finish(n);
      });
    });
  }

  /* Page-local. shared/rg-account.js calls fetch() directly; patching it here
     gives those calls the 15s abort without changing the shared file. */
  function installPageTimeout() {
    if (typeof document === "undefined" || !root.fetch || root.fetch.__rgLiveSyncTimeout) return;
    var orig = root.fetch.bind(root);
    function wrapped(url, opts) {
      var href = "";
      try {
        if (typeof url === "string") href = url;
        else if (url && typeof url.url === "string") href = url.url;
      } catch (e) {}
      if (href.indexOf(APPWRITE) === 0) return fetchWithTimeout(orig, url, opts, REQ_MS);
      return orig(url, opts);
    }
    wrapped.__rgLiveSyncTimeout = true;
    root.fetch = wrapped;
  }

  var api = {
    FAIL_LIMIT: FAIL_LIMIT,
    REQ_MS: REQ_MS,
    BULK_MS: BULK_MS,
    classifyError: classifyError,
    kind: kind,
    applyFailure: applyFailure,
    applySuccess: applySuccess,
    liveCount: liveCount,
    tooManyGone: tooManyGone,
    restoreLive: restoreLive,
    ASK_Q: ASK_Q,
    ASK_YES: ASK_YES,
    ASK_NO: ASK_NO,
    openDeletion: openDeletion,
    closeDeletion: closeDeletion,
    fillStatus: fillStatus,
    fetchWithTimeout: fetchWithTimeout
  };
  root.RGSyncStatus = api;
  installPageTimeout();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
