/* Live private Listify (my/ideas/). App id myideas, storage prefix rg-myideas-.
   Reads still abort after 15s. Uploads get 60s. A large deletion or a stale
   device asks before any upload and never deletes on its own. */
(function (root) {
  "use strict";
  var FAIL_LIMIT = 2;
  var READ_MS = 15000;
  var UPLOAD_MS = 60000;
  var REQ_MS = READ_MS;
  var BULK_MS = 60000;
  var APPWRITE = "https://fra.cloud.appwrite.io/v1";
  var LAST_PREFIX = "rg-myideas-lastsync:";
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
      F = {};
      if (y._f && typeof y._f === "object") for (fk in y._f) F[fk] = y._f[fk];
      F["~"] = at;
      if (c.type === "cat") F.gone = at;
      y._f = F;
      delete y.gone;
      delete y.deleted;
      out[k] = y;
    }
    return out;
  }

  /* Hide or show a list and stamp `gone` at this exact time, so an older hide cannot
     beat a later un-hide just because the visible copy never wrote the field. */
  function noteGone(rec, at, hidden) {
    var y = {}, k, F = {};
    rec = rec && typeof rec === "object" ? rec : {};
    for (k in rec) if (k !== "gone") y[k] = rec[k];
    if (y._f && typeof y._f === "object") for (k in y._f) F[k] = y._f[k];
    y.at = at;
    F.gone = at;
    F["~"] = at;
    y._f = F;
    if (hidden) y.gone = 1;
    return y;
  }
  /* Lists this device is showing get a visibility stamp once, at their own edit time
     or at `at` when they never had one. Hidden lists are left alone. */
  function assertVisible(items, at) {
    var k, x, y, f, F, stamp, changed = false;
    if (!items || typeof items !== "object") return false;
    for (k in items) {
      x = items[k];
      if (!x || x.deleted || x.type !== "cat" || x.gone) continue;
      stamp = x._f && typeof x._f.gone === "number" ? x._f.gone : 0;
      if (stamp > 0 && stamp >= (x.at || 0)) continue;
      y = {};
      for (f in x) y[f] = x[f];
      F = {};
      if (y._f && typeof y._f === "object") for (f in y._f) F[f] = y._f[f];
      F.gone = Math.max(stamp, y.at || 0, at || 0);
      F["~"] = Math.max(typeof F["~"] === "number" ? F["~"] : 0, y.at || 0, at || 0);
      y._f = F;
      if ((y.at || 0) < F.gone) y.at = F.gone;
      delete y.gone;
      items[k] = y;
      changed = true;
    }
    return changed;
  }

  var FM_META = { id: 1, at: 1, _f: 1 };
  function newerRec(a, b) {
    if (!a) return b;
    if (!b) return a;
    if ((a.at || 0) !== (b.at || 0)) return (a.at || 0) > (b.at || 0) ? a : b;
    if (!!a.deleted !== !!b.deleted) return a.deleted ? a : b;
    return JSON.stringify(a) >= JSON.stringify(b) ? a : b;
  }
  function fmOldRec(x) { var s = x._f; return !!(s && typeof s === "object" && typeof s["~"] === "number" && x.at > s["~"]); }
  function fmTimeRec(x, f, old) {
    var s = x._f && typeof x._f === "object" ? x._f : null, has = Object.prototype.hasOwnProperty.call(x, f);
    if (old) return (has || (s && f in s)) ? x.at : -1;
    if (s && typeof s[f] === "number") return s[f];
    return has ? x.at : -1;
  }
  function fmPlainRec(x) {
    var o = {}, l = Object.keys(x).filter(function (k) { return !FM_META[k]; }).sort();
    l.forEach(function (k) { o[k] = x[k]; });
    return JSON.stringify(o);
  }
  function mergeRecords(a, b) {
    if (JSON.stringify(a) === JSON.stringify(b)) return a;
    if (a.deleted || b.deleted) return newerRec(a, b);
    var oa = fmOldRec(a), ob = fmOldRec(b), keys = {}, o = { id: a.id }, F = {}, f, i, l, ta, tb, src, va, vb;
    [a, b, a._f || {}, b._f || {}].forEach(function (m) { for (var k in m) if (!FM_META[k] && k !== "~") keys[k] = 1; });
    l = Object.keys(keys).sort();
    for (i = 0; i < l.length; i++) {
      f = l[i]; ta = fmTimeRec(a, f, oa); tb = fmTimeRec(b, f, ob);
      if (ta !== tb) src = ta > tb ? a : b;
      else { va = JSON.stringify(a[f]); vb = JSON.stringify(b[f]); src = vb === undefined ? a : va === undefined ? b : va >= vb ? a : b; }
      if (Object.prototype.hasOwnProperty.call(src, f)) o[f] = src[f];
      if (Math.max(ta, tb) >= 0) F[f] = Math.max(ta, tb);
    }
    o.at = Math.max(a.at, b.at);
    if (fmPlainRec(o) !== fmPlainRec(a) && fmPlainRec(o) !== fmPlainRec(b)) o.at++;
    F["~"] = o.at;
    o._f = F;
    return o;
  }

  var BUILTINS = ["ideas", "tasks", "goals"];
  function listIds(items) {
    var gone = {}, custom = {}, k, x, id, ids = [], i;
    items = items && typeof items === "object" ? items : {};
    for (k in items) {
      x = items[k];
      if (!x || x.deleted || x.type !== "cat" || typeof x.cat !== "string") continue;
      custom[x.cat] = 1;
      if (x.gone) gone[x.cat] = 1;
    }
    for (i = 0; i < BUILTINS.length; i++) if (!gone[BUILTINS[i]]) ids.push(BUILTINS[i]);
    for (id in custom) if (!gone[id] && BUILTINS.indexOf(id) < 0) ids.push(id);
    return ids;
  }
  function itemIds(items) {
    var ids = [], k, x;
    items = items && typeof items === "object" ? items : {};
    for (k in items) {
      x = items[k];
      if (!x || x.deleted || x.gone || x.type === "cat" || x.type === "meta" || !x.sec) continue;
      ids.push(x.id || k);
    }
    return ids;
  }
  function summarize(items) { return { lists: listIds(items).length, items: itemIds(items).length }; }
  /* What an upload would remove compared with the cloud copy. */
  function dropReport(next, cloud) {
    var cloudLists = listIds(cloud), nextLists = listIds(next), i, set = {}, listsHidden = 0;
    var cloudItems = itemIds(cloud), nextItems = itemIds(next), itemsDeleted = 0, iset = {};
    for (i = 0; i < nextLists.length; i++) set[nextLists[i]] = 1;
    for (i = 0; i < cloudLists.length; i++) if (!set[cloudLists[i]]) listsHidden++;
    for (i = 0; i < nextItems.length; i++) iset[nextItems[i]] = 1;
    for (i = 0; i < cloudItems.length; i++) if (!iset[cloudItems[i]]) itemsDeleted++;
    var cloudLive = liveCount(cloud), nextLive = liveCount(next);
    return {
      listsHidden: listsHidden, itemsDeleted: itemsDeleted, liveDrop: cloudLive - nextLive,
      cloudLists: cloudLists.length, nextLists: nextLists.length,
      cloudItems: cloudItems.length, nextItems: nextItems.length,
      cloudLive: cloudLive, nextLive: nextLive
    };
  }
  var STALE_MS = 12 * 60 * 60 * 1000;
  /* Explicit overwrite (overwriteUntil) is the only bypass. A local delete's short
     bulkUntil window is ignored, so a stale device cannot ride it into the cloud. */
  function needsConfirm(report, meta) {
    report = report || {};
    meta = meta || {};
    var now = typeof meta.now === "number" ? meta.now : 0;
    if (typeof meta.overwriteUntil === "number" && now < meta.overwriteUntil) return { hold: false, reason: "" };
    var listsBig = report.listsHidden >= 2 || (report.cloudLists >= 4 && report.listsHidden >= 1 && report.listsHidden * 2 > report.cloudLists);
    var itemsBig = report.cloudItems >= 4 && report.itemsDeleted >= 3 && report.itemsDeleted * 2 > report.cloudItems;
    var countBig = report.cloudLive >= 4 && report.liveDrop >= 3 && report.liveDrop * 2 > report.cloudLive;
    if (listsBig || itemsBig || countBig) return { hold: true, reason: "drop" };
    var last = meta.lastSync || 0, cloudAt = meta.cloudUpdated || 0;
    var stale = last > 0 && cloudAt > last && now - last >= STALE_MS;
    var loss = report.listsHidden >= 1 || report.itemsDeleted >= 1 || report.liveDrop >= 1;
    if (stale && (loss || meta.differs)) return { hold: true, reason: "stale" };
    return { hold: false, reason: "" };
  }

  var HIST_MAX = 20, HIST_CLOUD_MAX = 12;
  function cloneDoc(items) {
    try { return JSON.parse(JSON.stringify(items || {})); } catch (e) { return items || {}; }
  }
  function pushHistory(list, items, t, force, meta) {
    list = Array.isArray(list) ? list.slice() : [];
    var sum = summarize(items), data = cloneDoc(items), last = list[list.length - 1];
    if (!force && last && JSON.stringify(last.data) === JSON.stringify(data) && !(meta && meta.label)) return list;
    var row = { id: String(t) + "-" + list.length, t: t, lists: sum.lists, items: sum.items, data: data };
    if (meta && meta.label) row.label = meta.label;
    if (meta && meta.id) row.id = meta.id;
    if (meta && meta.clash) row.clash = 1;
    list.push(row);
    var keep = meta && meta.keepId;
    while (list.length > HIST_MAX) {
      var dropAt = -1, j;
      for (j = 0; j < list.length; j++) {
        if (keep && list[j] && list[j].id === keep) continue;
        dropAt = j;
        break;
      }
      if (dropAt < 0) break;
      list.splice(dropAt, 1);
    }
    return list;
  }
  function planRestore(list, current, versionId, now) {
    var src = Array.isArray(list) ? list.slice() : [], hit = null, i;
    for (i = 0; i < src.length; i++) if (src[i] && src[i].id === versionId) hit = src[i];
    var saved = hit ? cloneDoc(hit.data) : null;
    var next = pushHistory(src, current, now, true, hit ? { keepId: hit.id } : null);
    return { history: next, items: saved, savedCurrent: true, found: !!hit };
  }
  /* A restored record must be newer than the cloud copy, or the next merge puts the cloud back. */
  function freshenRecord(rec, at) {
    var y = {}, k, f, F = {};
    rec = rec && typeof rec === "object" ? rec : {};
    for (k in rec) y[k] = rec[k];
    if (y._f && typeof y._f === "object") for (k in y._f) F[k] = y._f[k];
    y.at = at;
    if (!y.deleted) {
      for (f in y) if (!FM_META[f]) F[f] = at;
      if (y.type === "cat") F.gone = at;
    }
    F["~"] = at;
    y._f = F;
    return y;
  }
  function adoptRestore(snapshot, cloud, now) {
    var out = {}, k, x, c;
    snapshot = snapshot && typeof snapshot === "object" ? snapshot : {};
    cloud = cloud && typeof cloud === "object" ? cloud : {};
    for (k in snapshot) {
      x = snapshot[k];
      if (!x || typeof x !== "object" || typeof x.id !== "string") continue;
      out[k] = freshenRecord(x, now);
    }
    for (k in cloud) {
      c = cloud[k];
      if (!c || typeof c !== "object" || out[k]) continue;
      if (c.deleted || (c.type === "cat" && c.gone)) continue;
      if (c.type === "cat") out[k] = noteGone(c, now, true);
      else out[k] = { id: c.id || k, deleted: true, at: now, _f: { "~": now } };
    }
    return out;
  }
  /* A clash is the same field changed on both sides since the agreed base, or a
     published local edit that a later cloud value replaces. Different fields are not clashes.
     base/prevBase are item maps, not timestamps: a last-sync clock moves forward when the
     first device uploads and would hide the clash. */
  function fieldConflicts(local, cloud, base, prevBase) {
    var out = [], k, a, b, f, seen, ta, tb, oa, ob, bv, pv, lv, cv, localMoved, cloudMoved, replacedMine;
    if (!base || typeof base !== "object" || typeof base === "number") return [];
    local = local && typeof local === "object" ? local : {};
    cloud = cloud && typeof cloud === "object" ? cloud : {};
    prevBase = prevBase && typeof prevBase === "object" ? prevBase : null;
    for (k in local) {
      a = local[k]; b = cloud[k];
      if (!a || !b || a.deleted || b.deleted || a.type === "meta" || b.type === "meta") continue;
      oa = fmOldRec(a); ob = fmOldRec(b); seen = {};
      for (f in a) if (!FM_META[f] && Object.prototype.hasOwnProperty.call(b, f)) seen[f] = 1;
      for (f in seen) {
        lv = a[f]; cv = b[f];
        if (JSON.stringify(lv) === JSON.stringify(cv)) continue;
        ta = fmTimeRec(a, f, oa); tb = fmTimeRec(b, f, ob);
        if (ta < 0 || tb < 0) continue;
        bv = base[k] ? base[k][f] : undefined;
        pv = prevBase && prevBase[k] ? prevBase[k][f] : undefined;
        localMoved = JSON.stringify(lv) !== JSON.stringify(bv);
        cloudMoved = JSON.stringify(cv) !== JSON.stringify(bv);
        replacedMine = !!(prevBase && prevBase[k] && JSON.stringify(lv) === JSON.stringify(bv) && JSON.stringify(lv) !== JSON.stringify(pv) && JSON.stringify(cv) !== JSON.stringify(lv));
        if (!(localMoved && cloudMoved) && !replacedMine) continue;
        out.push({ key: k, id: a.id || k, field: f, localWins: ta >= tb, localText: lv, cloudText: cv });
      }
    }
    return out;
  }
  /* Both values were written by this device, one after another. That is one
     editing sequence, not a clash with another device. */
  function sameDeviceEdits(localText, cloudText, ownValues) {
    if (!ownValues || !ownValues.length) return false;
    var l = JSON.stringify(localText), c = JSON.stringify(cloudText), i, s, hitL = false, hitC = false;
    for (i = 0; i < ownValues.length; i++) {
      s = JSON.stringify(ownValues[i]);
      if (s === l) hitL = true;
      if (s === c) hitC = true;
    }
    return hitL && hitC;
  }
  function clashSnap(local, cloud, fights, now) {
    var data = cloneDoc(local), i, f, src, loser, sum;
    fights = fights || [];
    for (i = 0; i < fights.length; i++) {
      f = fights[i];
      src = f.localWins ? cloud : local;
      if (src && src[f.key]) data[f.key] = cloneDoc(src[f.key]);
    }
    f = fights[0] || {};
    loser = f.localWins ? f.cloudText : f.localText;
    sum = summarize(data);
    return {
      id: "clash-" + (f.key || "x") + "-" + (f.field || "f") + "-" + String(loser).length + "-" + String(loser).slice(0, 12),
      t: now,
      lists: sum.lists,
      items: sum.items,
      clash: 1,
      label: "התנגשות: " + String(loser == null ? "" : loser).slice(0, 80),
      data: data
    };
  }
  function rememberClash(list, snap) {
    var next = [], i, rest = [], clashes = [];
    list = Array.isArray(list) ? list : [];
    for (i = 0; i < list.length; i++) {
      if (snap && list[i].id === snap.id) return list.slice();
      next.push(list[i]);
    }
    if (snap) next.push(snap);
    for (i = 0; i < next.length; i++) (next[i].clash ? clashes : rest).push(next[i]);
    while (rest.length + clashes.length > HIST_MAX) {
      if (rest.length) rest.shift(); else break;
    }
    return rest.concat(clashes);
  }
  function signOutGate(opts) {
    opts = opts || {};
    if (!opts.pending) return "logout";
    if (opts.online && opts.pushed) return "logout";
    return "ask";
  }
  function unsyncedCount(items, since) {
    var n = 0, k, x;
    items = items && typeof items === "object" ? items : {};
    for (k in items) {
      x = items[k];
      if (!x || x.deleted || x.type === "meta") continue;
      if (!since || (x.at || 0) > since) n++;
    }
    return n;
  }
  function signOutPlan(cache) {
    var has = !!(cache && cache.items && typeof cache.items === "object");
    var pending = !!(cache && cache.pending);
    return { backup: has, dropCache: !!(has && !pending), keepCache: pending };
  }
  function historyFile(snap) {
    snap = snap || {};
    return { v: 1, t: snap.t || 0, lists: snap.lists || 0, items: snap.items || 0, savedAt: formatSyncTime(snap.t || 0), data: snap.data || {} };
  }
  function mergeHistory(localList, cloudDoc, max) {
    var map = {}, all = [], i, s, id;
    var L = Array.isArray(localList) ? localList : (localList && localList.snaps) || [];
    var C = cloudDoc && Array.isArray(cloudDoc.snaps) ? cloudDoc.snaps : [];
    function add(row) {
      if (!row || typeof row.t !== "number") return;
      id = row.id || String(row.t);
      if (map[id]) return;
      map[id] = 1;
      all.push(row);
    }
    for (i = 0; i < L.length; i++) add(L[i]);
    for (i = 0; i < C.length; i++) add(C[i]);
    all.sort(function (a, b) { return a.t - b.t; });
    max = max || HIST_CLOUD_MAX;
    while (all.length > max) all.shift();
    return { v: 1, snaps: all };
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

  var ASK_Q = "העותק במכשיר הזה ישן או מוחק רשימות מול הענן. להשאיר את הענן כמו שהוא?";
  var ASK_YES = "השאר את הענן";
  var ASK_NO = "העלה בכל זאת";
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
      if (id === "rg-delask-back") closeDeletion();
      else if (id === "rg-loadask-back") closeLoadAsk();
      else removeNode(id);
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
  function closeChoice() { removeNode("rg-choice-back"); }
  function openChoice(opts) {
    opts = opts || {};
    closeChoice();
    sheet("rg-choice-back", opts.question || "", opts.yes || "", opts.no || "", { onYes: opts.onYes, onNo: opts.onNo });
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
        return Promise.resolve(peekUpdated(url, opts, v)).then(function () { finish(null, v); });
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
      return res.clone().json().then(function (j) {
        if (!j || !j.$updatedAt) return;
        if (j.key && j.key !== "items") return;
        var appName = j.app || (j.data && j.data.app);
        if (appName && appName !== "myideas") return;
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
    noteGone: noteGone,
    assertVisible: assertVisible,
    mergeRecords: mergeRecords,
    summarize: summarize,
    dropReport: dropReport,
    needsConfirm: needsConfirm,
    STALE_MS: STALE_MS,
    HIST_MAX: HIST_MAX,
    HIST_CLOUD_MAX: HIST_CLOUD_MAX,
    pushHistory: pushHistory,
    planRestore: planRestore,
    adoptRestore: adoptRestore,
    fieldConflicts: fieldConflicts,
    sameDeviceEdits: sameDeviceEdits,
    clashSnap: clashSnap,
    rememberClash: rememberClash,
    signOutGate: signOutGate,
    unsyncedCount: unsyncedCount,
    signOutPlan: signOutPlan,
    openChoice: openChoice,
    closeChoice: closeChoice,
    historyFile: historyFile,
    mergeHistory: mergeHistory,
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
