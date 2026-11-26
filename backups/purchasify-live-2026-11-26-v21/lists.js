/* Lists inside a Purchasify category.
   item.list stays the category (missing = "main"). Old apps already read that field.
   item.grp is the list inside the category. Missing grp = the default list "d:" + category.
   A default list has no record until someone renames, reorders, or deletes it.
   List records are type "grp" inside the existing cats row. Older apps skip any type
   other than "cat" and still merge the row by id, so the records are not dropped.
   Nothing here writes storage, stamps items, or removes an item. */
(function (root) {
  "use strict";

  function catIdOf(item) {
    return item && typeof item.list === "string" && item.list ? item.list : "main";
  }
  function defaultId(catId) {
    return "d:" + (catId || "main");
  }
  function own(obj) {
    var out = [], k;
    if (!obj || typeof obj !== "object") return out;
    for (k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) out.push(k);
    return out;
  }
  function defaultGone(catsMap, catId) {
    var def = defaultId(catId), keys = own(catsMap), i, r;
    for (i = 0; i < keys.length; i++) {
      r = catsMap[keys[i]];
      if (r && !r.deleted && r.type === "grp" && r.cat === catId && r.grp === def && r.gone) return true;
    }
    return false;
  }
  /* Visible lists for one category. The virtual default is first (pos -1) until a record exists. */
  function listsFor(catsMap, catId, fallbackName) {
    var def = defaultId(catId), out = [], seen = {}, keys, i, r, hasDef = false, name;
    catsMap = catsMap && typeof catsMap === "object" ? catsMap : {};
    catId = catId || "main";
    name = fallbackName || "רשימה 1";
    keys = own(catsMap);
    for (i = 0; i < keys.length; i++) {
      r = catsMap[keys[i]];
      if (!r || r.deleted || r.gone || r.type !== "grp" || r.cat !== catId || typeof r.grp !== "string" || seen[r.grp]) continue;
      seen[r.grp] = 1;
      if (r.grp === def) hasDef = true;
      out.push({
        id: r.grp,
        name: typeof r.name === "string" && r.name ? r.name : name,
        pos: typeof r.pos === "number" ? r.pos : 0,
        created: typeof r.created === "number" ? r.created : 0,
        virtual: false
      });
    }
    if (!hasDef && !defaultGone(catsMap, catId)) {
      out.push({ id: def, name: name, pos: -1, created: 0, virtual: true });
    }
    out.sort(function (a, b) {
      if (a.pos !== b.pos) return a.pos - b.pos;
      if (a.created !== b.created) return a.created - b.created;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });
    return out;
  }
  /* Where one item shows. Missing grp is the default list. An unknown grp still shows, once, on the first list. */
  function grpOf(item, lists) {
    var cid = catIdOf(item), def = defaultId(cid), want = item && typeof item.grp === "string" && item.grp ? item.grp : "", i;
    if (!lists || !lists.length) return want || def;
    if (!want) {
      for (i = 0; i < lists.length; i++) if (lists[i].id === def) return def;
      return lists[0].id;
    }
    for (i = 0; i < lists.length; i++) if (lists[i].id === want) return want;
    return lists[0].id;
  }
  /* One pass. Each live item is returned once, under its category and its list. Input maps are not changed. */
  function place(items, catsMap, nameOf) {
    var byCat = {}, seen = {}, keys, i, x, cid, lists, gid, bucket, n = 0;
    items = items && typeof items === "object" ? items : {};
    keys = own(items);
    for (i = 0; i < keys.length; i++) {
      x = items[keys[i]];
      if (!x || x.deleted || x.type === "cat" || x.type === "grp" || x.type === "meta" || seen[x.id || keys[i]]) continue;
      seen[x.id || keys[i]] = 1;
      cid = catIdOf(x);
      if (!byCat[cid]) byCat[cid] = { lists: {}, order: [] };
      lists = listsFor(catsMap, cid, nameOf ? nameOf(cid) : "");
      gid = grpOf(x, lists);
      bucket = byCat[cid];
      if (!bucket.lists[gid]) { bucket.lists[gid] = []; bucket.order.push(gid); }
      bucket.lists[gid].push(x);
      n++;
    }
    return { byCat: byCat, count: n };
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
      all: all,
      sel: sel,
      unsel: all - sel,
      anyPrice: anyPrice,
      priceAll: priceAll,
      priceSel: priceSel,
      priceUnsel: priceAll - priceSel
    };
  }

  var api = {
    catIdOf: catIdOf,
    defaultId: defaultId,
    listsFor: listsFor,
    grpOf: grpOf,
    place: place,
    isSelected: isSelected,
    totals: totals
  };
  root.RGShopLists = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
