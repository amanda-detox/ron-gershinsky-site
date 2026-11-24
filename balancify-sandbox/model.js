/* Balancify sandbox data. Default lists in data.js become the first editable copy.
   An existing rg-sbx-balancify-user record is folded in once and never discarded.
   The working document is a Listify-style map: list records (type "cat") and item records (sec). */
(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.BALModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  var DOC_KEY = "rg-sbx-balancify-doc";
  var USER_KEY = "rg-sbx-balancify-user";
  var ORD_KEY = "rg-sbx-balancify-order";
  var CHK_PREFIX = "rg-sbx-balancify-checked-";
  var CLAIM_KEY = "rg-sbx-balancify-claimed";
  var APP = "sbxbalancify";
  var KEY = "items";
  var HIST_CLOUD = "history2";
  var SOON_HE = "ההסבר יצורף בקרוב";

  function cacheKey(uid) { return "rg-sbx-balancify-v1:" + uid; }
  function histKey(id) { return "rg-sbx-balancify-hist2:" + (id || "local"); }
  function lastKey(id) { return "rg-sbx-balancify-lastsync:" + id; }
  function noteKey(id) { return "rg-sbx-balancify-notefold:" + (id || "local"); }
  function versionLabel(cache) {
    var s = String(cache || "");
    return s.indexOf("rg-") === 0 ? s.slice(3) : s;
  }

  function clone(o) { return JSON.parse(JSON.stringify(o || {})); }
  function valid(x) { return !!(x && typeof x === "object" && typeof x.id === "string" && typeof x.at === "number" && isFinite(x.at)); }
  function builtinKey(listId, i) { return "b:" + listId + ":" + i; }
  function cloneNote(n) {
    if (!n) return { he: "", en: "" };
    if (typeof n === "string") return { he: n, en: "" };
    return { he: n.he || "", en: n.en || "" };
  }
  function isSoon(info) {
    if (!info) return false;
    var he = typeof info === "string" ? info : (info.he || "");
    return he === SOON_HE || he.indexOf(SOON_HE) === 0;
  }

  function touch(rec, at) {
    var y = {}, k, F = {};
    for (k in rec) if (k !== "_f" && k !== "at") y[k] = rec[k];
    y.at = at;
    for (k in y) if (k !== "id" && k !== "at") F[k] = at;
    F["~"] = at;
    y._f = F;
    return y;
  }
  function editRec(rec, patch, at) {
    var y = {}, k, F = {};
    rec = rec || {};
    for (k in rec) if (k !== "_f") y[k] = rec[k];
    if (rec._f && typeof rec._f === "object") for (k in rec._f) F[k] = rec._f[k];
    for (k in patch) {
      if (patch[k] === undefined) continue;
      if (patch[k] === null) delete y[k];
      else y[k] = patch[k];
      F[k] = at;
    }
    y.at = at;
    if (!y.id && rec.id) y.id = rec.id;
    F["~"] = at;
    y._f = F;
    return y;
  }

  function emptyUser() { return { v: 2, notes: {}, titles: {}, custom: {}, hidden: {}, loc: {}, order: {}, marks: {} }; }
  function normalize(u) {
    if (!u || typeof u !== "object") u = emptyUser();
    if (!u.notes || typeof u.notes !== "object") u.notes = {};
    if (!u.titles || typeof u.titles !== "object" || Array.isArray(u.titles)) u.titles = {};
    if (!u.custom || typeof u.custom !== "object") u.custom = {};
    if (!u.hidden || typeof u.hidden !== "object") u.hidden = {};
    if (!u.loc || typeof u.loc !== "object") u.loc = {};
    if (!u.order || typeof u.order !== "object") u.order = {};
    if (!u.marks || typeof u.marks !== "object" || Array.isArray(u.marks)) u.marks = {};
    u.v = 2;
    return u;
  }
  function catalog(data) {
    var out = [];
    (data.lists || []).forEach(function (list) {
      var flat = [];
      if (list.sections) {
        list.sections.forEach(function (sec, si) {
          (sec.items || []).forEach(function (it, ii) { flat.push({ it: it, section: si, seq: si * 1000 + ii, group: sec.title || null }); });
        });
      } else {
        (list.items || []).forEach(function (it, i) { flat.push({ it: it, section: null, seq: i, group: it.group || null }); });
      }
      flat.forEach(function (row, i) {
        out.push({
          id: builtinKey(list.id, i), origin: list.id, section: row.section, seq: row.seq,
          he: row.it.he || "", en: row.it.en || "", detail: row.it.detail || null,
          info: row.it.info || null, links: row.it.links || null, group: row.group || row.it.group || null,
          defaultNote: cloneNote(row.it.note)
        });
      });
    });
    return out;
  }
  function rawList(data, id) {
    var lists = data.lists || [];
    for (var i = 0; i < lists.length; i++) if (lists[i].id === id) return lists[i];
    return null;
  }
  function builtinsOf(data, listId) { return catalog(data).filter(function (b) { return b.origin === listId; }); }

  function migrate(data, get, raw) {
    var u = emptyUser();
    raw = raw || {};
    var powerDefaults = builtinsOf(data, "power");
    var used = {};
    if (Array.isArray(raw.power)) {
      var order = [];
      raw.power.forEach(function (it, n) {
        if (!it || !it.he) return;
        var m = /^d(\d+)$/.exec(String(it.id || ""));
        var def = null;
        if (m) {
          var idx = +m[1];
          if (powerDefaults[idx] && !used[powerDefaults[idx].id] && powerDefaults[idx].he === it.he) def = powerDefaults[idx];
        }
        if (!def) {
          for (var i = 0; i < powerDefaults.length; i++) {
            var d = powerDefaults[i];
            if (!used[d.id] && d.he === it.he && (d.defaultNote.he || "") === (it.note || "")) { def = d; break; }
          }
        }
        if (!def) {
          for (var j = 0; j < powerDefaults.length; j++) {
            if (!used[powerDefaults[j].id] && powerDefaults[j].he === it.he) { def = powerDefaults[j]; break; }
          }
        }
        if (def) {
          used[def.id] = 1;
          order.push(def.id);
          if ((it.note || "") !== (def.defaultNote.he || "")) u.notes[def.id] = { he: it.note || "", en: "" };
        } else {
          var cid = it.id && !/^d\d+$/.test(String(it.id)) ? String(it.id) : ("p" + n);
          var id = "u:" + cid;
          u.custom[id] = { id: id, list: "power", born: "power", he: it.he, en: it.he, note: { he: it.note || "", en: "" }, seq: 800000 + n };
          order.push(id);
        }
      });
      powerDefaults.forEach(function (d) { if (!used[d.id]) u.hidden[d.id] = 1; });
      u.order.power = order;
    }
    var ex = raw.extra || {};
    Object.keys(ex).forEach(function (listId) {
      if (!rawList(data, listId)) return;
      (ex[listId] || []).forEach(function (it, n) {
        if (!it || !it.he) return;
        var note = "";
        if (it.detail && typeof it.detail === "object") note = it.detail.he || "";
        else if (typeof it.note === "string") note = it.note;
        var def = null;
        powerDefaults.forEach(function (d) {
          if (def || !u.hidden[d.id]) return;
          if (d.he === it.he && (d.defaultNote.he || "") === note) def = d;
        });
        if (!def) powerDefaults.forEach(function (d) {
          if (def || !u.hidden[d.id]) return;
          if (d.he === it.he) def = d;
        });
        if (def) {
          delete u.hidden[def.id];
          u.loc[def.id] = listId;
          if (note !== (def.defaultNote.he || "")) u.notes[def.id] = { he: note, en: "" };
        } else {
          var id = "u:x:" + listId + ":" + n;
          u.custom[id] = { id: id, list: listId, born: "power", he: it.he, en: it.en || it.he, note: { he: note, en: "" }, seq: 900000 + n };
        }
      });
    });
    var ord = {};
    try { ord = JSON.parse(get(ORD_KEY) || "{}") || {}; } catch (e) { ord = {}; }
    (data.lists || []).forEach(function (list) {
      if (list.id === "power" && Array.isArray(raw.power)) return;
      var arr = ord[list.id];
      if (!Array.isArray(arr) || !arr.length) return;
      var defs = builtinsOf(data, list.id), seen = {}, ids = [];
      arr.forEach(function (he) {
        for (var i = 0; i < defs.length; i++) {
          if (!seen[defs[i].id] && defs[i].he === he) { seen[defs[i].id] = 1; ids.push(defs[i].id); break; }
        }
      });
      if (ids.length) u.order[list.id] = ids;
    });
    return u;
  }

  function loadUser(data, get) {
    var raw = {};
    try { raw = JSON.parse(get(USER_KEY) || "{}") || {}; } catch (e) { raw = {}; }
    if (raw && raw.v === 2) return normalize(raw);
    if (raw && (raw.power || raw.extra || raw.v)) return migrate(data, get, raw);
    return emptyUser();
  }

  function itemsIn(data, listId, u) {
    var arr = [];
    catalog(data).forEach(function (b) {
      if (u.hidden[b.id]) return;
      var dest = u.loc[b.id];
      if (dest && !rawList(data, dest)) dest = null;
      var where = dest || b.origin;
      if (where !== listId) return;
      var moved = !!dest && dest !== b.origin;
      var ov = u.notes[b.id];
      var tv = u.titles && u.titles[b.id];
      var he = b.he, en = b.en || "";
      if (tv && typeof tv === "object") {
        if (typeof tv.he === "string" && tv.he) he = tv.he;
        if (typeof tv.en === "string" && tv.en) en = tv.en;
      }
      arr.push({
        id: b.id, origin: b.origin, custom: false, list: listId,
        section: moved ? null : b.section, seq: moved ? 500000 + b.seq : b.seq,
        he: he, en: en, detail: moved ? null : b.detail, info: moved ? null : b.info,
        links: moved ? null : b.links, group: moved ? null : b.group,
        note: ov ? cloneNote(ov) : cloneNote(b.defaultNote)
      });
    });
    Object.keys(u.custom || {}).forEach(function (id) {
      var c = u.custom[id];
      if (!c || c.list !== listId || !c.he) return;
      arr.push({
        id: id, origin: c.born || listId, custom: true, list: listId, section: null,
        seq: c.seq || 0, he: c.he, en: c.en || c.he, detail: null, info: null, links: null,
        group: null, note: cloneNote(c.note)
      });
    });
    return arr;
  }
  function sortGroup(items, ord) {
    return items.slice().sort(function (a, b) {
      var ia = ord.indexOf(a.id), ib = ord.indexOf(b.id);
      if (ia === -1 && ib === -1) return a.seq - b.seq;
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }
  function orderedItems(data, list, user) {
    var items = itemsIn(data, list.id, user);
    var ord = (user.order && user.order[list.id]) || [];
    if (list.style !== "info") return sortGroup(items, ord);
    var out = [];
    (list.sections || []).forEach(function (sec, si) {
      sortGroup(items.filter(function (it) { return it.section === si; }), ord).forEach(function (it) { out.push(it); });
    });
    sortGroup(items.filter(function (it) { return it.section == null; }), ord).forEach(function (it) { out.push(it); });
    return out;
  }
  function readChecks(get, listId) {
    try {
      var a = JSON.parse(get(CHK_PREFIX + listId) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) { return []; }
  }
  function notePair(it) {
    var note = cloneNote(it.note);
    if ((note.he || note.en) && !isSoon(note)) return note;
    if (it.detail) return cloneNote(it.detail);
    if (it.info && !isSoon(it.info)) return cloneNote(it.info);
    return { he: "", en: "" };
  }

  function buildFromLegacy(data, get, at) {
    data = data || { lists: [] };
    get = get || function () { return null; };
    at = at || 1;
    var user = loadUser(data, get);
    var items = {};
    (data.lists || []).forEach(function (list, li) {
      var cat = touch({
        id: "c:" + list.id, type: "cat", cat: list.id,
        name: (list.title && list.title.he) || list.id,
        nameHe: (list.title && list.title.he) || "",
        nameEn: (list.title && list.title.en) || "",
        icon: list.icon || "",
        pos: li, created: at
      }, at);
      items[cat.id] = cat;
      var checks = readChecks(get, list.id);
      var rows = orderedItems(data, list, user);
      rows.forEach(function (it, n) {
        var note = notePair(it);
        var mark = user.marks && (user.marks[it.id] === "ok" || user.marks[it.id] === "no") ? user.marks[it.id] : "";
        if (!mark && checks.indexOf(it.he) !== -1) mark = "ok";
        var g = it.group || null;
        var rec = {
          id: it.id, sec: list.id, he: it.he || "", en: it.en || "",
          noteHe: note.he || "", noteEn: note.en || "",
          order: n, created: at + n + 1
        };
        if (g && (g.he || g.en)) { rec.groupHe = g.he || ""; rec.groupEn = g.en || ""; }
        if (it.links && it.links.length) rec.links = clone(it.links);
        if (mark) rec.mark = mark;
        items[rec.id] = touch(rec, at + n + 1);
      });
      if (list.questions && list.questions.items) {
        var qg = list.questions.title || {};
        var base = rows.length;
        list.questions.items.forEach(function (q, qi) {
          var id = builtinKey(list.id, "q" + qi);
          var rec = {
            id: id, sec: list.id, he: q.he || "", en: q.en || "",
            noteHe: "", noteEn: "",
            groupHe: qg.he || "", groupEn: qg.en || "",
            order: base + qi, created: at + 1000 + qi
          };
          items[id] = touch(rec, at + 1000 + qi);
        });
      }
    });
    return { v: 1, seeded: true, items: items };
  }

  function adopt(data, get) {
    var raw = get(DOC_KEY);
    if (raw) {
      try {
        var doc = JSON.parse(raw);
        if (doc && doc.v === 1 && doc.items && typeof doc.items === "object") return { doc: doc, fresh: false };
      } catch (e) {}
    }
    return { doc: buildFromLegacy(data, get, Date.now()), fresh: true };
  }

  function lists(items) {
    var arr = [], k, x;
    items = items || {};
    for (k in items) {
      x = items[k];
      if (!x || x.deleted || x.type !== "cat" || x.gone) continue;
      if (x.cat === "ideas" || x.cat === "tasks" || x.cat === "goals") continue;
      arr.push(x);
    }
    arr.sort(function (a, b) {
      return (a.pos - b.pos) || ((a.created || 0) - (b.created || 0)) || (a.cat < b.cat ? -1 : a.cat > b.cat ? 1 : 0);
    });
    return arr;
  }
  function itemsInList(items, sec) {
    var arr = [], k, x;
    items = items || {};
    for (k in items) {
      x = items[k];
      if (!x || x.deleted || x.type === "cat" || x.type === "box" || x.type === "meta" || x.sec !== sec) continue;
      arr.push(x);
    }
    arr.sort(function (a, b) {
      return ((a.order || 0) - (b.order || 0)) || ((a.created || 0) - (b.created || 0)) || (a.id < b.id ? -1 : 1);
    });
    return arr;
  }
  function textOf(rec, lang) {
    var he = (rec && (rec.he || rec.text)) || "";
    var en = (rec && rec.en) || "";
    if (lang === "en") return String(en || he).trim();
    return String(he || en).trim();
  }
  function noteOf(rec, lang) {
    if (!rec) return "";
    var he = rec.noteHe || "";
    var en = rec.noteEn || "";
    if (!he && !en && typeof rec.note === "string") he = rec.note;
    if (lang === "en") return String(en || he).trim();
    return String(he || en).trim();
  }
  function groupOf(rec, lang) {
    if (!rec) return "";
    var he = rec.groupHe || "";
    var en = rec.groupEn || "";
    if (lang === "en") return String(en || he).trim();
    return String(he || en).trim();
  }
  function nameOf(rec, lang) {
    if (!rec) return "";
    var he = rec.nameHe || rec.name || "";
    var en = rec.nameEn || "";
    if (lang === "en") return String(en || he).trim();
    return String(he || en).trim();
  }
  function liveCount(items) {
    var n = 0, k, x;
    items = items || {};
    for (k in items) {
      x = items[k];
      if (x && !x.deleted && !x.gone) n++;
    }
    return n;
  }
  function newerMerge(a, b) {
    if (!a) return b;
    if (!b) return a;
    return (a.at || 0) >= (b.at || 0) ? a : b;
  }
  function mergeMaps(local, cloud, mergeRecords) {
    var out = {}, k, join = mergeRecords || newerMerge;
    local = local || {};
    cloud = cloud || {};
    for (k in local) if (valid(local[k])) out[k] = local[k];
    for (k in cloud) if (valid(cloud[k])) out[k] = out[k] ? join(out[k], cloud[k]) : cloud[k];
    return out;
  }
  function localKept(local, merged) {
    var k, x, y;
    local = local || {};
    for (k in local) {
      x = local[k];
      if (!x || x.deleted || x.gone) continue;
      y = merged[k];
      if (!y || y.deleted) return false;
    }
    return true;
  }
  /* Empty or missing cloud never replaces a device that already has lists.
     upload is true whenever the merged copy is not already the cloud copy. */
  function planSync(localItems, cloudDoc, mergeRecords) {
    var hadCloud = !!(cloudDoc && cloudDoc.items && typeof cloudDoc.items === "object");
    var cloud = hadCloud ? cloudDoc.items : {};
    var merged = mergeMaps(localItems || {}, cloud, mergeRecords || newerMerge);
    var same = hadCloud && JSON.stringify(merged) === JSON.stringify(cloud);
    return { items: merged, upload: !same, keptLocal: localKept(localItems, merged) };
  }

  return {
    DOC_KEY: DOC_KEY, USER_KEY: USER_KEY, ORD_KEY: ORD_KEY, CHK_PREFIX: CHK_PREFIX, CLAIM_KEY: CLAIM_KEY,
    APP: APP, KEY: KEY, HIST_CLOUD: HIST_CLOUD, SOON_HE: SOON_HE,
    cacheKey: cacheKey, histKey: histKey, lastKey: lastKey, noteKey: noteKey, versionLabel: versionLabel,
    clone: clone, touch: touch, editRec: editRec, valid: valid,
    buildFromLegacy: buildFromLegacy, adopt: adopt, loadUser: loadUser,
    lists: lists, itemsInList: itemsInList, textOf: textOf, noteOf: noteOf, groupOf: groupOf, nameOf: nameOf,
    liveCount: liveCount, mergeMaps: mergeMaps, localKept: localKept, planSync: planSync
  };
});
