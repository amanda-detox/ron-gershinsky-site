/* Sandbox copy of the live private Listify sync helper (my/ideas/rg-sync-status.js).
   App id and storage keys stay the sandbox's (sbxmyideas, rg-sbx-ideas-*).
   Reads still abort after 15s. A full-document upload gets 60s, then a visible
   cutoff and a retry with growing backoff. A large-deletion question stays up
   until it is answered and never deletes on its own. */
(function (root) {
  "use strict";
  var FAIL_LIMIT = 2;
  var READ_MS = 15000;
  var UPLOAD_MS = 60000;
  var REQ_MS = READ_MS;
  var BULK_MS = 60000;
  var APPWRITE = "https://fra.cloud.appwrite.io/v1";
  var LAST_PREFIX = "rg-sbx-ideas-lastsync:";
  var BAK_SUFFIX = "-bak";

  function methodOf(url, opts) {
    var m = opts && opts.method;
    if (!m && url && typeof url !== "string" && url.method) m = url.method;
    return String(m || "GET").toUpperCase();
  }
  function isWrite(url, opts) {
    var m = methodOf(url, opts);
    return m !== "GET" && m !== "HEAD";
  }
  /* Reads keep the caller's short limit. Writes ignore a 15s read limit so a
     slow mobile upload is not aborted and retried forever. */
  function timeoutFor(opts, ms, url) {
    if (isWrite(url, opts)) return UPLOAD_MS;
    return typeof ms === "number" ? ms : READ_MS;
  }
  function backoffMs(n) {
    n = n > 0 ? n : 1;
    var ms = 2000 * Math.pow(2, n - 1);
    if (ms > UPLOAD_MS) ms = UPLOAD_MS;
    return ms;
  }

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

  /* blocked wins over saving. An upload that was cut off stays visible while it retries. */
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
    if (f.uploadCut) return "uploadCut";
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

  /* A full success is a finished download plus an upload that landed, or a download
     that already matched so there was nothing to upload. A deletion hold does not count. */
  function shouldStampSync(info) {
    info = info || {};
    if (info.failed || info.blocked || info.held) return false;
    if (!info.downloaded) return false;
    if (info.pendingLeft) return false;
    return !!(info.uploaded || info.nothingToUpload);
  }
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function formatSyncTime(ms) {
    var d = new Date(ms);
    if (isNaN(d.getTime())) return "";
    return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }
  function lastSyncLabel(ms) { return "סונכרן לאחרונה ב-" + formatSyncTime(ms); }
  function cloudSyncLabel(ms) { return "עודכן בענן ב-" + formatSyncTime(ms); }

  function liveCount(m) {
    var n = 0, k, x;
    if (!m || typeof m !== "object") return 0;
    for (k in m) { x = m[k]; if (x && !x.deleted && !x.gone) n++; }
    return n;
  }

  function tooManyGone(next, cloud, now, bulkUntil) {
    if (typeof bulkUntil === "number" && now < bulkUntil) return false;
    var before = liveCount(cloud), gone = before - liveCount(next);
    return before >= 4 && gone >= 3 && gone * 2 > before;
  }

  function isLive(x) { return !!(x && !x.deleted && !x.gone); }

  /* Bring back cloud items that were deleted on this device. Live local items, including
     edits and additions, stay as they are. Nothing is removed from either side. */
  function restoreLive(local, cloud) {
    var out = {}, k, x, c, y, f, at, F, fk;
    local = local && typeof local === "object" ? local : {};
    cloud = cloud && typeof cloud === "object" ? cloud : {};
    for (k in local) out[k] = local[k];
    for (k in cloud) {
      c = cloud[k];
      if (!isLive(c)) continue;
      x = out[k];
      if (isLive(x)) continue;
      y = {};
      for (f in c) if (f !== "deleted" && f !== "gone") y[f] = c[f];
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

  /* Explicit «טען מהענן»: the device adopts the cloud document. writeCloud stays false. */
  function planCloudLoad(local, cloud) {
    var cl = (cloud && cloud.items && typeof cloud.items === "object") ? cloud.items : {};
    var next = {};
    try { next = JSON.parse(JSON.stringify(cl)); } catch (e) { var k; for (k in cl) next[k] = cl[k]; }
    return { backup: local || {}, next: next, seeded: !!(cloud && cloud.seeded), writeCloud: false };
  }
  function loadCloudCopy(opts) {
    opts = opts || {};
    var writes = 0;
    return Promise.resolve().then(function () {
      if (typeof opts.saveBak === "function") opts.saveBak(opts.local);
      if (typeof opts.get !== "function") throw new Error("no get");
      return opts.get();
    }).then(function (cloud) {
      var plan = planCloudLoad(opts.local, cloud);
      if (plan.writeCloud) {
        writes++;
        if (typeof opts.set === "function") {
          return Promise.resolve(opts.set(plan.next)).then(function () {
            return { items: plan.next, seeded: plan.seeded, wrote: true, writes: writes };
          });
        }
      }
      return { items: plan.next, seeded: plan.seeded, wrote: false, writes: writes };
    });
  }

  var ASK_Q = "זיהיתי הרבה מחיקות ורוצה לוודא שאתה בטוח לגבי זה?";
  var ASK_YES = "כן, העלי לענן";
  var ASK_NO = "לא, שחזרי מחיקות";
  var LOAD_Q = "להחליף את הרשימות שבמכשיר הזה בעותק מהענן? העותק הנוכחי יישמר כגיבוי במכשיר, והענן לא ייכתב.";
  var LOAD_YES = "טען מהענן";
  var LOAD_NO = "ביטול";
  var delOpts = null, loadOpts = null;

  function ensureAskCss(doc) {
    if (!doc || doc.getElementById("rg-delask-css")) return;
    var st = doc.createElement("style");
    st.id = "rg-delask-css";
    st.textContent = ""
      + ".rg-delask-back{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:flex-end;justify-content:center;padding:12px;background:color-mix(in srgb, var(--bg) 45%, transparent)}"
      + ".rg-delask{width:100%;max-width:440px;margin:0;box-sizing:border-box;background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:18px;padding:20px 16px calc(16px + env(safe-area-inset-bottom));box-shadow:var(--shadow);text-align:start}"
      + ".rg-delask p{margin:0 0 16px;font:700 18px/1.45 var(--sans);color:var(--fg)}"
      + ".rg-delask button{display:flex;width:100%;min-height:48px;align-items:center;justify-content:center;margin:8px 0 0;padding:0 16px;border-radius:14px;font:700 17px/1.2 var(--sans);cursor:pointer}"
      + ".rg-delask button.yes{background:var(--accent);color:var(--accentink);border:0}"
      + ".rg-delask button.no{background:var(--card);color:var(--fg);border:1px solid var(--line)}"
      + "@media (min-width:700px){.rg-delask-back{align-items:center}}";
    (doc.head || doc.documentElement).appendChild(st);
  }

  function removeNode(id) {
    var doc = root.document;
    if (!doc) return;
    var el = doc.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }
  function closeDeletion() {
    delOpts = null;
    removeNode("rg-delask-back");
  }
  function sheet(id, question, yesText, noText, opts) {
    var doc = root.document;
    if (!doc || !doc.body) return;
    if (doc.getElementById(id)) return;
    opts = opts || {};
    ensureAskCss(doc);
    var back = doc.createElement("div");
    back.id = id;
    back.className = "rg-delask-back";
    var box = doc.createElement("div");
    box.className = "rg-delask";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("dir", "rtl");
    box.setAttribute("aria-labelledby", id + "-q");
    var p = doc.createElement("p");
    p.id = id + "-q";
    p.textContent = question;
    var yes = doc.createElement("button");
    yes.type = "button";
    yes.className = "yes";
    yes.textContent = yesText;
    var no = doc.createElement("button");
    no.type = "button";
    no.className = "no";
    no.textContent = noText;
    function run(fn) {
      if (id === "rg-delask-back") closeDeletion(); else closeLoadAsk();
      if (typeof fn === "function") fn();
    }
    yes.addEventListener("click", function () { run(opts.onYes); });
    no.addEventListener("click", function () { run(opts.onNo); });
    back.addEventListener("click", function (e) { if (e.target === back && e.preventDefault) e.preventDefault(); });
    box.appendChild(p);
    box.appendChild(yes);
    box.appendChild(no);
    back.appendChild(box);
    doc.body.appendChild(back);
    try { yes.focus(); } catch (e) {}
  }
  function openDeletion(opts) {
    if (opts) delOpts = opts;
    var doc = root.document;
    if (!doc || !doc.body) return;
    if (doc.getElementById("rg-delask-back")) return;
    sheet("rg-delask-back", ASK_Q, ASK_YES, ASK_NO, delOpts || {});
  }
  /* Re-open when the question is still unanswered. Nothing here deletes or uploads. */
  function ensureDeletion(opts) {
    if (opts) delOpts = opts;
    var doc = root.document;
    if (!doc || !doc.body || !delOpts) return;
    if (doc.getElementById("rg-delask-back")) return;
    openDeletion(delOpts);
  }
  function closeLoadAsk() {
    loadOpts = null;
    removeNode("rg-loadask-back");
  }
  function openLoadAsk(opts) {
    if (opts) loadOpts = opts;
    var doc = root.document;
    if (!doc || !doc.body) return;
    if (doc.getElementById("rg-loadask-back")) return;
    sheet("rg-loadask-back", LOAD_Q, LOAD_YES, LOAD_NO, loadOpts || {});
  }

  function fillStatus(el, key, label, action) {
    if (!el) return;
    var attention = key === "offline" || key === "blocked" || key === "uploadCut" || (key && String(key).indexOf("syncError") === 0);
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
    var limit = timeoutFor(opts, ms, url);
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
      if (limit > 0) timer = setTimeout(function () {
        if (ctrl) { try { ctrl.abort(); } catch (e) {} }
        var e = new Error("timeout");
        e.status = 0; e.type = "timeout"; e.timeout = true;
        finish(e);
      }, limit);
      Promise.resolve().then(function () { return doFetch(url, opt); }).then(function (v) {
        peekUpdated(url, opts, v);
        finish(null, v);
      }, function (err) {
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

  var cloudUpdatedAt = "";
  var cloudWatch = [];
  function watchCloudUpdated(fn) { if (typeof fn === "function") cloudWatch.push(fn); }
  function noteCloud(iso) {
    if (!iso || iso === cloudUpdatedAt) return;
    cloudUpdatedAt = iso;
    if (api) api.cloudUpdatedAt = iso;
    var list = cloudWatch.slice(), i;
    for (i = 0; i < list.length; i++) { try { list[i](iso); } catch (e) {} }
  }
  function peekUpdated(url, opts, res) {
    try {
      if (isWrite(url, opts) || !res || typeof res.clone !== "function" || res.ok === false) return;
      var href = typeof url === "string" ? url : (url && url.url) || "";
      if (href.indexOf("/rows/") === -1 || href.indexOf("?") !== -1) return;
      res.clone().json().then(function (j) {
        if (!j || !j.$updatedAt) return;
        var app = j.app || (j.data && j.data.app);
        if (app && app !== "sbxmyideas") return;
        noteCloud(j.$updatedAt);
      }).catch(function () {});
    } catch (e) {}
  }

  /* Page-local. The sandbox account helper calls fetchWithTimeout with REQ_MS for every
     call; timeoutFor still gives uploads 60s. A request that already carries a signal
     keeps that outer limit instead of starting a second 15s abort. */
  function installPageTimeout() {
    if (typeof document === "undefined" || !root.fetch || root.fetch.__rgSbxIdeasTimeout) return;
    var orig = root.fetch.bind(root);
    function wrapped(url, opts) {
      var href = "";
      try {
        if (typeof url === "string") href = url;
        else if (url && typeof url.url === "string") href = url.url;
      } catch (e) {}
      if (href.indexOf(APPWRITE) === 0) {
        if (opts && opts.signal) return orig(url, opts);
        return fetchWithTimeout(orig, url, opts);
      }
      return orig(url, opts);
    }
    wrapped.__rgSbxIdeasTimeout = true;
    root.fetch = wrapped;
  }

  var api = {
    FAIL_LIMIT: FAIL_LIMIT,
    READ_MS: READ_MS,
    UPLOAD_MS: UPLOAD_MS,
    REQ_MS: REQ_MS,
    BULK_MS: BULK_MS,
    LAST_PREFIX: LAST_PREFIX,
    BAK_SUFFIX: BAK_SUFFIX,
    cloudUpdatedAt: cloudUpdatedAt,
    classifyError: classifyError,
    kind: kind,
    applyFailure: applyFailure,
    applySuccess: applySuccess,
    shouldStampSync: shouldStampSync,
    formatSyncTime: formatSyncTime,
    lastSyncLabel: lastSyncLabel,
    cloudSyncLabel: cloudSyncLabel,
    backoffMs: backoffMs,
    timeoutFor: timeoutFor,
    liveCount: liveCount,
    tooManyGone: tooManyGone,
    restoreLive: restoreLive,
    planCloudLoad: planCloudLoad,
    loadCloudCopy: loadCloudCopy,
    ASK_Q: ASK_Q,
    ASK_YES: ASK_YES,
    ASK_NO: ASK_NO,
    LOAD_Q: LOAD_Q,
    LOAD_YES: LOAD_YES,
    LOAD_NO: LOAD_NO,
    openDeletion: openDeletion,
    ensureDeletion: ensureDeletion,
    closeDeletion: closeDeletion,
    openLoadAsk: openLoadAsk,
    closeLoadAsk: closeLoadAsk,
    fillStatus: fillStatus,
    fetchWithTimeout: fetchWithTimeout,
    watchCloudUpdated: watchCloudUpdated
  };
  root.RGSyncStatus = api;
  installPageTimeout();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
