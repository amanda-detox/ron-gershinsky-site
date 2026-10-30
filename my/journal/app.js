/* Journalify / יומןלי (my/journal/) — private, per-user journal. Data goes through ../store.js (Appwrite row
   app="myjournal", key="items", readable/writable by the signed-in user only); nothing personal is stored in the site's files.
   Item kinds:
     topic { name }                                   a topic the user created
     entry { text, topic?: <topic id>, day }          one paragraph; created = date/time it was written */
(function () {
  "use strict";
  var M = window.RGMy, t = M.t;
  function $(id) { return document.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clean(s, n) { return String(s || "").replace(/[ \t\u00a0]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, n); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function loc() { return M.lang() === "he" ? "he-IL" : "en-GB"; }

  var view = lsGet("rg-myjournal-view") === "topic" ? "topic" : "day";
  var filt = "", q = "", editId = null, msg = "", deferred = false, pickTopic = lsGet("rg-myjournal-topic") || "";
  var S = RGStore("myjournal", { onChange: function () { render(); }, onStatus: setStatus, busy: typing });
  function typing() { var a = document.activeElement; return !!(a && a.closest && a.closest("#panels") && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); }
  function setStatus() { var s = $("status"); if (!s) return; var st = S.state(); s.className = "status" + (st === "offline" ? " off" : ""); s.textContent = st ? t(st) : ""; }

  function topics() { return S.list("topic").sort(function (a, b) { return String(a.name).localeCompare(String(b.name), loc()); }); }
  function topicName(id) { var x = id && S.get(id); return x && x.kind === "topic" ? x.name : t("noTopic"); }
  function entries() { return S.list("entry").sort(function (a, b) { return b.created - a.created; }); }
  function dayLabel(k) {
    var y = dayKey(new Date(Date.now() - 86400000));
    if (k === dayKey()) return t("today"); if (k === y) return t("yesterday");
    var p = k.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString(loc(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }
  function timeOf(ts) { return new Date(ts).toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit" }); }
  function topicOptions(sel, withNew) {
    var o = '<option value="">' + esc(t("noTopic")) + "</option>";
    topics().forEach(function (x) { o += '<option value="' + esc(x.id) + '"' + (x.id === sel ? " selected" : "") + ">" + esc(x.name) + "</option>"; });
    if (withNew) o += '<option value="__new">' + esc(t("newTopicOpt")) + "</option>";
    return o;
  }

  function panelWrite() {
    if (pickTopic && !S.get(pickTopic)) pickTopic = "";
    return '<section class="card sec"><h2>' + esc(t("writeTitle")) + "</h2>" +
      '<form data-form="w"><label class="fld"><span>' + esc(t("para")) + '</span><textarea class="inp" name="text" rows="5" maxlength="5000" placeholder="' + esc(t("phPara")) + '"></textarea></label>' +
      '<label class="fld"><span>' + esc(t("topic")) + '</span><select class="inp sel" name="topic" data-a="pick">' + topicOptions(pickTopic, true) + "</select></label>" +
      '<label class="fld hidden" id="newTopicRow"><span>' + esc(t("newTopicName")) + '</span><input class="inp" name="newTopic" maxlength="60" placeholder="' + esc(t("phTopic")) + '"></label>' +
      '<button class="btn pri big" type="submit">' + esc(t("save")) + "</button></form>" +
      (msg ? '<div class="saved">' + esc(msg) + "</div>" : "") + "</section>";
  }
  function entryLi(x, showTopic) {
    if (editId === x.id) {
      return '<li class="jentry"><form data-form="e" data-id="' + esc(x.id) + '" class="grow">' +
        '<textarea class="inp" name="text" rows="5" maxlength="5000">' + esc(x.text) + "</textarea>" +
        '<label class="fld"><span>' + esc(t("topic")) + '</span><select class="inp sel" name="topic">' + topicOptions(x.topic || "", false) + "</select></label>" +
        '<div class="btns"><button class="btn pri sm" type="submit">' + esc(t("saveEdit")) + '</button><button class="btn sm" type="button" data-a="cancel">' + esc(t("cancel")) + "</button></div></form></li>";
    }
    var meta = timeOf(x.created) + (showTopic ? " · " + esc(topicName(x.topic)) : " · " + esc(dayLabel(x.day || dayKey(new Date(x.created)))));
    if (x.edited) meta += " · " + esc(t("edited"));
    return '<li class="jentry"><div class="grow"><span class="meta">' + meta + '</span><p class="jtext">' + esc(x.text) + "</p>" +
      '<div class="btns"><button class="btn sm" type="button" data-a="edit" data-id="' + esc(x.id) + '">✎ ' + esc(t("edit")) + '</button><button class="btn sm dng" type="button" data-a="del" data-id="' + esc(x.id) + '">🗑 ' + esc(t("del")) + "</button></div></div></li>";
  }
  function panelList() {
    var all = entries(), ql = q.trim().toLowerCase();
    var list = all.filter(function (x) { return (!filt || (filt === "__none" ? !x.topic || !S.get(x.topic) : x.topic === filt)) && (!ql || String(x.text).toLowerCase().indexOf(ql) > -1); });
    var h = '<section class="card sec"><h2>' + esc(t("myLog")) + " <small>(" + all.length + ")</small></h2>" +
      '<div class="chips" role="group"><button type="button" data-a="view" data-v="day" aria-pressed="' + (view === "day") + '">📅 ' + esc(t("byDay")) + '</button><button type="button" data-a="view" data-v="topic" aria-pressed="' + (view === "topic") + '">🏷 ' + esc(t("byTopic")) + "</button></div>" +
      '<div class="row2 jfilters"><select class="inp sel" data-a="filt"><option value="">' + esc(t("allTopics")) + "</option>";
    topics().forEach(function (x) { h += '<option value="' + esc(x.id) + '"' + (filt === x.id ? " selected" : "") + ">" + esc(x.name) + "</option>"; });
    h += '<option value="__none"' + (filt === "__none" ? " selected" : "") + ">" + esc(t("noTopic")) + "</option></select>" +
      '<input class="inp" type="search" data-a="q" value="' + esc(q) + '" placeholder="' + esc(t("search")) + '"></div>';
    if (!all.length) return h + '<p class="empty">' + esc(t("noEntries")) + "</p></section>";
    if (!list.length) return h + '<p class="empty">' + esc(t("noMatch")) + "</p></section>";
    var groups = [], idx = {};
    list.forEach(function (x) {
      var k = view === "day" ? (x.day || dayKey(new Date(x.created))) : (x.topic && S.get(x.topic) ? x.topic : "__none");
      if (!(k in idx)) { idx[k] = groups.length; groups.push({ k: k, items: [] }); }
      groups[idx[k]].items.push(x);
    });
    if (view === "topic") groups.sort(function (a, b) { if (a.k === "__none") return 1; if (b.k === "__none") return -1; return topicName(a.k).localeCompare(topicName(b.k), loc()); });
    groups.forEach(function (g) {
      var lab = view === "day" ? dayLabel(g.k) : (g.k === "__none" ? t("noTopic") : topicName(g.k));
      h += '<div class="day">' + esc(lab) + " · " + g.items.length + '</div><ul class="list">' + g.items.map(function (x) { return entryLi(x, view === "day"); }).join("") + "</ul>";
    });
    return h + "</section>";
  }
  function panelTopics() {
    var tp = topics(), cnt = {};
    S.list("entry").forEach(function (x) { if (x.topic) cnt[x.topic] = (cnt[x.topic] || 0) + 1; });
    var h = '<section class="card sec"><details class="jtopics"><summary><h2>' + esc(t("topicsTitle")) + " (" + tp.length + ")</h2></summary>" +
      '<form data-form="t" class="row2"><input class="inp" name="name" maxlength="60" placeholder="' + esc(t("phTopic")) + '"><button class="btn pri" type="submit">' + esc(t("add")) + "</button></form>";
    if (!tp.length) h += '<p class="empty">' + esc(t("noTopics")) + "</p>";
    else h += '<ul class="list">' + tp.map(function (x) {
      return '<li><span class="grow">' + esc(x.name) + '<span class="meta">' + (cnt[x.id] || 0) + " " + esc(t("entriesN")) + '</span></span><button class="btn sm" type="button" data-a="ren" data-id="' + esc(x.id) + '">✎</button><button class="btn sm dng" type="button" data-a="delT" data-id="' + esc(x.id) + '" aria-label="' + esc(t("del")) + '">🗑</button></li>';
    }).join("") + "</ul>";
    return h + '<div class="btns"><button class="btn sm" type="button" data-a="export">⬇ ' + esc(t("export")) + "</button></div></details></section>";
  }

  function render(force) {
    var panels = $("panels"); if (!panels) return;
    if (!S.uid()) { panels.innerHTML = ""; setStatus(); return; }
    if (!force && typing()) { deferred = true; setStatus(); return; }
    deferred = false;
    var keep = {}; panels.querySelectorAll("form [name]").forEach(function (i) { keep[i.closest("form").getAttribute("data-form") + "/" + i.name] = i.value; });
    var open = !!panels.querySelector("details.jtopics[open]");
    panels.innerHTML = panelWrite() + panelList() + panelTopics();
    panels.querySelectorAll("form [name]").forEach(function (i) { var v = keep[i.closest("form").getAttribute("data-form") + "/" + i.name]; if (v && i.tagName !== "SELECT") i.value = v; });
    if (open) panels.querySelector("details.jtopics").open = true;
    newRow(); setStatus();
  }
  function newRow() { var s = $("panels").querySelector('[data-a="pick"]'), r = $("newTopicRow"); if (s && r) r.classList.toggle("hidden", s.value !== "__new"); }
  function findTopic(name) { var n = name.toLowerCase(); return topics().filter(function (x) { return String(x.name).toLowerCase() === n; })[0]; }
  function addTopic(name) { name = clean(name, 60); if (!name) return ""; var ex = findTopic(name); return ex ? ex.id : S.add({ kind: "topic", name: name }); }

  function exportJson() {
    var data = { app: "Journalify", exported: new Date().toISOString(), topics: topics().map(function (x) { return { id: x.id, name: x.name }; }),
      entries: entries().map(function (x) { return { date: new Date(x.created).toISOString(), topic: x.topic ? topicName(x.topic) : "", text: x.text }; }) };
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    a.download = "journalify-" + dayKey() + ".json"; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function boot() {
    var panels = $("panels");
    panels.addEventListener("focusout", function () { setTimeout(function () { if (deferred && !typing()) render(); }, 0); });
    panels.addEventListener("change", function (e) {
      var a = e.target.getAttribute("data-a");
      if (a === "pick") { if (e.target.value !== "__new") { pickTopic = e.target.value; lsSet("rg-myjournal-topic", pickTopic); } newRow(); if (e.target.value === "__new") { var n = panels.querySelector('[name="newTopic"]'); if (n) n.focus(); } }
      if (a === "filt") { filt = e.target.value; render(true); }
    });
    panels.addEventListener("input", function (e) {
      if (e.target.getAttribute("data-a") === "q") { q = e.target.value; var pos = e.target.selectionStart; render(true); var n = panels.querySelector('[data-a="q"]'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (er) {} } }
    });
    panels.addEventListener("submit", function (e) {
      e.preventDefault();
      var f = e.target, kind = f.getAttribute("data-form");
      if (kind === "w") {
        var text = clean(f.text.value, 5000); if (!text) { f.text.focus(); return; }
        var tp = f.topic.value;
        if (tp === "__new") { tp = addTopic(f.newTopic.value); if (!tp) { f.newTopic.focus(); return; } }
        pickTopic = tp; lsSet("rg-myjournal-topic", tp);
        f.text.value = ""; if (f.newTopic) f.newTopic.value = "";
        S.add({ kind: "entry", text: text, topic: tp, day: dayKey() });
        msg = t("saved"); document.activeElement && document.activeElement.blur && document.activeElement.blur(); render(true);
        setTimeout(function () { msg = ""; if (!typing()) render(); }, 4000);
      } else if (kind === "e") {
        var id = f.getAttribute("data-id"), tx = clean(f.text.value, 5000); if (!tx) { f.text.focus(); return; }
        S.upd(id, { text: tx, topic: f.topic.value || null, edited: Date.now() }); editId = null; document.activeElement.blur(); render(true);
      } else if (kind === "t") {
        var nm = clean(f.name.value, 60); if (!nm) return;
        if (findTopic(nm)) { alert(t("topicExists")); return; }
        f.name.value = ""; addTopic(nm); document.activeElement.blur(); render(true);
      }
    });
    panels.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]"); if (!b || b.tagName === "SELECT" || b.tagName === "INPUT") return;
      var a = b.getAttribute("data-a"), id = b.getAttribute("data-id");
      if (a === "view") { view = b.getAttribute("data-v"); lsSet("rg-myjournal-view", view); render(true); }
      else if (a === "edit") { editId = id; render(true); var ta = panels.querySelector('form[data-form="e"] textarea'); if (ta) ta.focus(); }
      else if (a === "cancel") { editId = null; render(true); }
      else if (a === "del") { if (confirm(t("confirmDel"))) { S.del(id); if (editId === id) editId = null; render(true); } }
      else if (a === "delT") { if (confirm(t("confirmDelT").replace("{n}", topicName(id)))) { S.del(id); if (filt === id) filt = ""; render(true); } }
      else if (a === "ren") { var x = S.get(id); if (!x) return; var nm = prompt(t("renameQ"), x.name); nm = clean(nm, 60); if (nm && nm !== x.name) { var ex = findTopic(nm); if (ex && ex.id !== id) { alert(t("topicExists")); return; } S.upd(id, { name: nm }); render(true); } }
      else if (a === "export") exportJson();
    });
    M.onLang(function () { render(true); });
    render(true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
