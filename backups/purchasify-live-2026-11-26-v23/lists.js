/* View of Purchasify categories and lists.
   Stored shape is unchanged: item.list is the old category (missing = "main").
   item.grp is an optional list id. Cats stay in the existing cats row.
   On screen, every old category (no real:1 flag) is a LIST inside one category, "קניות".
   A category the user creates later is marked real:1 and stays a category.
   This file never writes storage and never changes the maps it is given. */
(function (root) {
  "use strict";
  var HOME = "shop";

  function own(obj) {
    var out = [], k;
    if (!obj || typeof obj !== "object") return out;
    for (k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) out.push(k);
    return out;
  }
  function catIdOf(item) {
    return item && typeof item.list === "string" && item.list ? item.list : "main";
  }
  function defaultId(catId) {
    return "d:" + (catId || "main");
  }
  function isRealRec(r) {
    return !!(r && !r.deleted && !r.gone && r.type === "cat" && r.real === 1 && typeof r.cat === "string");
  }
  function realRec(catsMap, id) {
    var r = catsMap && catsMap["c:" + id];
    return isRealRec(r) ? r : null;
  }
  function byPos(a, b) {
    if (a.pos !== b.pos) return a.pos - b.pos;
    if ((a.created || 0) !== (b.created || 0)) return (a.created || 0) - (b.created || 0);
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  }
  /* Old categories, in their saved order, as lists. Built-ins come from `builtins`.
     A real:1 record is a new category and is not listed here. Gone categories drop out.
     No extra list is invented with the parent category's name. */
  function legacyLists(catsMap, builtins) {
    var map = {}, i, b, keys, r, id;
    catsMap = catsMap && typeof catsMap === "object" ? catsMap : {};
    builtins = builtins || [];
    for (i = 0; i < builtins.length; i++) {
      b = builtins[i];
      if (!b || !b.cat || b.gone) continue;
      map[b.cat] = { id: b.cat, name: b.name || b.cat, pos: typeof b.pos === "number" ? b.pos : i, created: 0, legacy: true };
    }
    keys = own(catsMap);
    for (i = 0; i < keys.length; i++) {
      r = catsMap[keys[i]];
      if (!r || r.deleted || r.type !== "cat" || typeof r.cat !== "string" || isRealRec(r)) continue;
      id = r.cat;
      if (r.gone) { delete map[id]; continue; }
      b = map[id] || { id: id, name: id, pos: typeof r.pos === "number" ? r.pos : 1000, created: r.created || 0, legacy: true };
      if (typeof r.name === "string" && r.name) b.name = r.name;
      if (typeof r.pos === "number") b.pos = r.pos;
      if (typeof r.created === "number") b.created = r.created;
      b.legacy = true;
      map[id] = b;
    }
    return own(map).map(function (k) { return map[k]; }).sort(byPos);
  }
  function grpLists(catsMap, catId) {
    var out = [], seen = {}, keys, i, r;
    keys = own(catsMap);
    for (i = 0; i < keys.length; i++) {
      r = catsMap[keys[i]];
      if (!r || r.deleted || r.gone || r.type !== "grp" || r.cat !== catId || typeof r.grp !== "string" || seen[r.grp]) continue;
      seen[r.grp] = 1;
      out.push({
        id: r.grp,
        name: typeof r.name === "string" && r.name ? r.name : "רשימה 1",
        pos: typeof r.pos === "number" ? r.pos : 0,
        created: typeof r.created === "number" ? r.created : 0,
        legacy: false,
        virtual: false
      });
    }
    return out;
  }
  /* Lists under one category. The home category's lists are the old categories.
     A newer category gets only the lists that were created in it, or one "רשימה 1"
     that is not named after the category. */
  function listsFor(catsMap, catId, builtins, fallbackName) {
    var extra, legacy, seen, i, out;
    catsMap = catsMap && typeof catsMap === "object" ? catsMap : {};
    fallbackName = fallbackName || "רשימה 1";
    if (!catId || catId === HOME) {
      legacy = legacyLists(catsMap, builtins);
      seen = {};
      legacy.forEach(function (l) { seen[l.id] = 1; });
      extra = [];
      own(catsMap).forEach(function (k) {
        var r = catsMap[k];
        if (!r || r.deleted || r.gone || r.type !== "grp" || typeof r.grp !== "string" || seen[r.grp]) return;
        if (realRec(catsMap, r.cat)) return;
        seen[r.grp] = 1;
        extra.push({
          id: r.grp,
          name: typeof r.name === "string" && r.name ? r.name : fallbackName,
          pos: typeof r.pos === "number" ? r.pos : 0,
          created: typeof r.created === "number" ? r.created : 0,
          legacy: false,
          virtual: false
        });
      });
      legacy.sort(byPos);
      extra.sort(byPos);
      return legacy.concat(extra);
    }
    out = grpLists(catsMap, catId);
    if (!out.length) out.push({ id: defaultId(catId), name: fallbackName, pos: -1, created: 0, legacy: false, virtual: true });
    return out.sort(byPos);
  }
  function categories(catsMap, homeName) {
    var out = [{ id: HOME, name: homeName || "קניות", pos: -1, home: true }], keys, i, r;
    catsMap = catsMap && typeof catsMap === "object" ? catsMap : {};
    keys = own(catsMap);
    for (i = 0; i < keys.length; i++) {
      r = catsMap[keys[i]];
      if (!isRealRec(r)) continue;
      out.push({
        id: r.cat,
        name: typeof r.name === "string" && r.name ? r.name : "…",
        pos: typeof r.pos === "number" ? r.pos : 0,
        created: typeof r.created === "number" ? r.created : 0,
        home: false
      });
    }
    return out.sort(function (a, b) {
      if (a.home !== b.home) return a.home ? -1 : 1;
      return byPos(a, b);
    });
  }
  function hasId(lists, id) {
    var i;
    for (i = 0; i < lists.length; i++) if (lists[i].id === id) return true;
    return false;
  }
  /* Where one item shows. Old rows keep their category id as the list id. */
  function viewOf(item, catsMap, builtins, fallbackName) {
    var raw = catIdOf(item), grp = item && typeof item.grp === "string" && item.grp ? item.grp : "", lists, lid;
    catsMap = catsMap && typeof catsMap === "object" ? catsMap : {};
    if (realRec(catsMap, raw)) {
      lists = listsFor(catsMap, raw, builtins, fallbackName);
      lid = grp && hasId(lists, grp) ? grp : (lists[0] ? lists[0].id : defaultId(raw));
      return { cat: raw, list: lid };
    }
    lists = listsFor(catsMap, HOME, builtins, fallbackName);
    if (grp && hasId(lists, grp)) return { cat: HOME, list: grp };
    if (hasId(lists, raw)) return { cat: HOME, list: raw };
    return { cat: HOME, list: lists[0] ? lists[0].id : "main" };
  }
  function place(items, catsMap, builtins, fallbackName) {
    var byCat = {}, seen = {}, keys, i, x, v, bucket, n = 0;
    items = items && typeof items === "object" ? items : {};
    keys = own(items);
    for (i = 0; i < keys.length; i++) {
      x = items[keys[i]];
      if (!x || x.deleted || x.type === "cat" || x.type === "grp" || x.type === "meta" || seen[x.id || keys[i]]) continue;
      seen[x.id || keys[i]] = 1;
      v = viewOf(x, catsMap, builtins, fallbackName);
      if (!byCat[v.cat]) byCat[v.cat] = { lists: {}, order: [] };
      bucket = byCat[v.cat];
      if (!bucket.lists[v.list]) { bucket.lists[v.list] = []; bucket.order.push(v.list); }
      bucket.lists[v.list].push(x);
      n++;
    }
    return { byCat: byCat, count: n, home: HOME };
  }
  function isSelected(item, checklist) {
    if (!item) return false;
    if (item.mark === "ok") return true;
    return !!(checklist && item.mark !== "no" && item.ck);
  }
  function totals(rows, checklist) {
    var all = 0, sel = 0, priceAll = 0, priceSel = 0, anyPrice = false, i, x, has, p;
    rows = rows || [];
    for (i = 0; i < rows.length; i++) {
      x = rows[i];
      if (!x || x.deleted) continue;
      all++;
      has = typeof x.price === "number" && isFinite(x.price);
      p = has ? x.price : 0;
      if (has) anyPrice = true;
      priceAll += p;
      if (isSelected(x, checklist)) { sel++; priceSel += p; }
    }
    return {
      all: all, sel: sel, unsel: all - sel, anyPrice: anyPrice,
      priceAll: priceAll, priceSel: priceSel, priceUnsel: priceAll - priceSel
    };
  }
  /* Shekel amount with a real decimal point, number then ₪, safe to place in an LTR isolate. */
  function fmtSum(n) {
    var sign = "";
    if (typeof n !== "number" || !isFinite(n)) n = 0;
    if (n < 0) { sign = "-"; n = -n; }
    return sign + (Math.round(n * 100) / 100).toFixed(2) + " \u20aa";
  }

  var api = {
    HOME: HOME,
    catIdOf: catIdOf,
    defaultId: defaultId,
    legacyLists: legacyLists,
    listsFor: listsFor,
    categories: categories,
    viewOf: viewOf,
    place: place,
    isSelected: isSelected,
    totals: totals,
    fmtSum: fmtSum
  };
  root.RGShopLists = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
