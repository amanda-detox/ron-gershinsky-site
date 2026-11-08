/* Sandbox-only sync status. Live pages do not load this file.
   One status for each reason a list is not quietly "synced":
   saving, blocked large deletion, signed-out / local only, real offline, server/auth/timeout.
   Also the 15s fetch wrapper so a hung request cannot leave busy=true forever. */
(function (root) {
  "use strict";
  var FAIL_LIMIT = 2;
  var REQ_MS = 15000;
  var BULK_MS = 60000;

  function classifyError(e) {
    if (!e) return "network";
    if (e.code === "signed_out" || e.type === "signed_out") return "signed_out";
    if (e.timeout || e.type === "timeout") return "timeout";
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

  function liveCount(m) {
    var n = 0, k, x;
    if (!m || typeof m !== "object") return 0;
    for (k in m) { x = m[k]; if (x && !x.deleted && !x.gone) n++; }
    return n;
  }

  /* Same guard the live list apps use: a write that drops most of the cloud copy is refused
     unless this device just confirmed a large deletion (bulkUntil in the future). */
  function tooManyGone(next, cloud, now, bulkUntil) {
    if (typeof bulkUntil === "number" && now < bulkUntil) return false;
    var before = liveCount(cloud), gone = before - liveCount(next);
    return before >= 4 && gone >= 3 && gone * 2 > before;
  }

  function fillStatus(el, key, label, action) {
    if (!el) return;
    var attention = key === "offline" || key === "blocked" || (key && String(key).indexOf("syncError") === 0);
    el.className = "status" + (attention ? " off" : "");
    while (el.firstChild) el.removeChild(el.firstChild);
    if (!key) { el.title = ""; return; }
    var doc = el.ownerDocument || root.document;
    var span = doc.createElement("span");
    span.className = "status-txt";
    span.textContent = label || "";
    el.appendChild(span);
    el.title = label || "";
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
    fillStatus: fillStatus,
    fetchWithTimeout: fetchWithTimeout
  };
  root.RGSyncStatus = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
