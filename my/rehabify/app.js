/* Rehabify (my/rehabify/) — private, per-user recovery tracker. Data goes through ../store.js (Appwrite row app="myrehab",
   key="items", readable/writable by the signed-in user only); nothing personal is stored in the site's files.
   Item kinds:
     add   { name, since: "YYYY-MM-DDTHH:MM" (local), best?: days }           one per addiction, with its clean-time count
     chk   { add?: id, crave: 0-10, mood: 1-5, trig?: [keys], note?, day }    daily check-in
     crv   { add?: id, mins, outcome: "passed" | "still", day }               a craving-timer session
     slip  { add: id, name, days, day }                                       a restart of the count
     why   { text }                                                           reasons to stay clean
     ppl   { name, phone? }                                                   people to call
   The running craving timer lives in this device's localStorage only (rg-myrehab-timer). */
(function () {
  "use strict";
  var M = window.RGMy, t = M.t;
  var TABS = [["clean", "tabClean"], ["check", "tabCheck"], ["crave", "tabCrave"], ["why", "tabWhy"], ["hist", "tabHist"]];
  var MS = [1, 3, 7, 14, 30, 60, 90, 180, 365, 730, 1095, 1825, 3650];
  var TRIG = ["stress", "bored", "lonely", "tired", "anger", "sad", "people", "place", "party", "pain", "other"];
  var FACES = ["😞", "🙁", "😐", "🙂", "😄"];
  var DAY = 86400000;
  function $(id) { return document.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function jparse(s, d) { try { var v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clean(s, n) { return String(s || "").replace(/[ \t\u00a0]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, n); }
  function fmt(k, o) { return t(k).replace(/\{(\w+)\}/g, function (_, x) { return o[x]; }); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function localDT(d) { return dayKey(d) + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function loc() { return M.lang() === "he" ? "he-IL" : "en-GB"; }
  function list(s) { return t(s).split("|"); }
  function phoneHref(p) { return "tel:" + String(p).replace(/[^\d+*#]/g, "").replace(/\*/g, "%2A").replace(/#/g, "%23"); }

  var tab = lsGet("rg-myrehab-tab") || "clean"; if (!TABS.some(function (x) { return x[0] === tab; })) tab = "clean";
  var ck = { add: "", crave: 0, mood: 0, trig: [], note: "" }, ckSaved = false, editDate = null, crMsg = "", deferred = false;
  var timer = jparse(lsGet("rg-myrehab-timer"), null), crSel = { add: "", mins: 15 };

  var S = RGStore("myrehab", { onChange: function () { render(); }, onStatus: setStatus, busy: typing });
  function typing() { var a = document.activeElement; return !!(a && a.closest && a.closest("#panels") && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== "range"); }
  function setStatus() { var s = $("status"); if (!s) return; var st = S.state(); s.className = "status" + (st === "offline" ? " off" : ""); s.textContent = st ? t(st) : ""; }

  function adds() { return S.list("add").sort(function (a, b) { return (a.created || 0) - (b.created || 0); }); }
  function cleanMs(x) { var s = new Date(x.since).getTime(); return isNaN(s) ? 0 : Math.max(0, Date.now() - s); }
  function msLabel(n) { return n >= 365 && n % 365 === 0 ? (n === 365 ? t("msY1") : fmt("msYN", { n: n / 365 })) : n === 1 ? t("ms1") : fmt("msN", { n: n }); }
  function addName(id) { var a = id && S.get(id); return a ? a.name : t("general"); }
  function when(ts) {
    var d = new Date(ts), k = dayKey(d), y = new Date(Date.now() - DAY);
    var day = k === dayKey() ? t("today") : k === dayKey(y) ? t("yesterday") : d.toLocaleDateString(loc(), { weekday: "short", day: "numeric", month: "short" });
    return { day: day, key: k, time: d.toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit" }) };
  }

  /* ---------- panels ---------- */
  function addSelect(cls, val, withGeneral) {
    var l = adds(); if (!l.length && !withGeneral) return "";
    return '<select class="sel ' + cls + '">' + (withGeneral ? '<option value="">' + esc(t("general")) + "</option>" : "") +
      l.map(function (a) { return '<option value="' + esc(a.id) + '"' + (val === a.id ? " selected" : "") + ">" + esc(a.name) + "</option>"; }).join("") + "</select>";
  }
  function counterCard(a) {
    var ms = cleanMs(a), days = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / 3600000), m = Math.floor((ms % 3600000) / 60000);
    var next = MS.filter(function (n) { return n > days; })[0], prev = MS.filter(function (n) { return n <= days; });
    var lo = prev.length ? prev[prev.length - 1] : 0, pct = next ? Math.min(100, ((ms / DAY) - lo) / (next - lo) * 100) : 100;
    var sinceD = new Date(a.since).toLocaleString(loc(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    var h1 = '<div class="card counter" data-id="' + esc(a.id) + '"><div class="top"><b>' + esc(a.name) + "</b></div>" +
      '<div class="big"><strong>' + days + "</strong><span>" + esc(days === 1 ? t("days1") : t("daysN")) + "</span></div>" +
      '<div class="sub2">' + esc(fmt("andH", { h: h, m: m })) + " · " + esc(fmt("sinceTxt", { d: sinceD })) + "</div>";
    if (next) h1 += '<div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(pct) + '"><i style="width:' + pct.toFixed(1) + '%"></i></div>' +
      '<div class="next"><span>' + esc(fmt("nextMs", { n: msLabel(next) })) + "</span><span>" + esc(fmt("left", { n: msLabel(Math.max(1, Math.ceil(next - ms / DAY))) })) + "</span></div>";
    else h1 += '<div class="next"><span>' + esc(t("allMs")) + "</span></div>";
    if (prev.length) h1 += '<div class="badges">' + prev.slice(-5).map(function (n) { return "<span>🏅 " + esc(msLabel(n)) + "</span>"; }).join("") + "</div>";
    if (a.best && a.best > days) h1 += '<div class="sub2">' + esc(fmt("best", { n: a.best })) + "</div>";
    if (editDate === a.id) h1 += '<div class="fld"><span>' + esc(t("since")) + '</span><input type="datetime-local" class="inp e-since" value="' + esc(a.since) + '" max="' + localDT(new Date()) + '"></div>' +
      '<div class="btns"><button type="button" class="btn pri" data-a="saveDate">' + esc(t("save")) + '</button><button type="button" class="btn" data-a="cancelDate">' + esc(t("cancel")) + "</button></div>";
    else h1 += '<div class="btns"><button type="button" class="btn sm" data-a="slip">' + esc(t("slip")) + '</button><button type="button" class="btn sm" data-a="editDate">' + esc(t("editDate")) +
      '</button><button type="button" class="btn sm dng" data-a="delAdd">' + esc(t("del")) + "</button></div>";
    return h1 + "</div>";
  }
  function panelClean() {
    var l = adds();
    return l.map(counterCard).join("") + (l.length ? "" : '<div class="card sec"><p class="empty">' + esc(t("noAdd")) + "</p></div>") +
      '<form class="card sec" data-form="add" autocomplete="off"><h2>' + esc(t("addTitle")) + '</h2><p class="lead">' + esc(t("addLead")) + "</p>" +
      '<input type="text" class="inp" name="name" maxlength="60" list="add-sugg" placeholder="' + esc(t("phAdd")) + '" aria-label="' + esc(t("addTitle")) + '">' +
      '<datalist id="add-sugg">' + list("sugg").map(function (s) { return '<option value="' + esc(s) + '">'; }).join("") + "</datalist>" +
      '<label class="fld"><span>' + esc(t("since")) + '</span><input type="datetime-local" class="inp" name="since" value="' + localDT(new Date()) + '" max="' + localDT(new Date()) + '"></label>' +
      '<button type="submit" class="btn pri big">' + esc(t("add")) + "</button></form>";
  }
  function faces(val) {
    return '<div class="faces" role="group" aria-label="' + esc(t("mood")) + '">' + FACES.map(function (f, i) {
      return '<button type="button" data-a="mood" data-v="' + (i + 1) + '" aria-pressed="' + (val === i + 1) + '"><i aria-hidden="true">' + f + "</i>" + esc(t("m" + (i + 1))) + "</button>"; }).join("") + "</div>";
  }
  function panelCheck() {
    var td = S.list("chk").filter(function (x) { return x.day === dayKey(); }).length;
    var tl = list("trigs");
    return '<div class="card sec" data-form="chk"><h2>' + esc(t("chkTitle")) + '</h2><p class="lead">' + esc(td ? fmt("todayDone", { n: td }) : t("chkLead")) + "</p>" +
      (adds().length ? '<label class="fld"><span>' + esc(t("chkFor")) + "</span>" + addSelect("c-add", ck.add, true) + "</label>" : "") +
      '<div class="fld"><span class="fldl" id="crl">' + esc(t("crave")) + '</span><div class="range"><input type="range" class="c-crave" min="0" max="10" step="1" value="' + ck.crave + '" aria-labelledby="crl"><output class="c-out">' + ck.crave + "</output></div>" +
      '<div class="scale"><span>' + esc(t("none")) + "</span><span>" + esc(t("strong")) + "</span></div></div>" +
      '<div class="fld"><span class="fldl">' + esc(t("mood")) + "</span>" + faces(ck.mood) + "</div>" +
      '<div class="fld"><span class="fldl">' + esc(t("trig")) + '</span><div class="chips">' + TRIG.map(function (k, i) {
        return '<button type="button" data-a="trig" data-v="' + k + '" aria-pressed="' + (ck.trig.indexOf(k) >= 0) + '">' + esc(tl[i]) + "</button>"; }).join("") + "</div></div>" +
      '<label class="fld"><span>' + esc(t("note")) + '</span><textarea class="inp c-note" maxlength="600" placeholder="' + esc(t("phNote")) + '">' + esc(ck.note) + "</textarea></label>" +
      '<button type="button" class="btn pri big" data-a="saveChk"' + (ck.mood ? "" : " disabled") + ">" + esc(t("saveChk")) + "</button>" +
      (ckSaved ? '<div class="saved" role="status">' + esc(t("chkSaved")) + "</div>" : "") + "</div>";
  }
  function timeLeft() { return timer ? Math.max(0, timer.end - Date.now()) : 0; }
  function mmss(ms) { var s = Math.ceil(ms / 1000); return pad(Math.floor(s / 60)) + ":" + pad(s % 60); }
  function panelCrave() {
    var why = S.list("why").sort(function (a, b) { return a.created - b.created; }), ppl = S.list("ppl").sort(function (a, b) { return a.created - b.created; });
    if (!timer) {
      return '<div class="card sec"><h2>' + esc(t("crTitle")) + '</h2><p class="lead">' + esc(t("crLead")) + "</p>" +
        (adds().length ? '<label class="fld"><span>' + esc(t("crFor")) + "</span>" + addSelect("r-add", crSel.add, true) + "</label>" : "") +
        '<div class="fld"><span class="fldl">' + esc(t("wait")) + '</span><div class="chips">' + [5, 10, 15, 20].map(function (n) {
          return '<button type="button" data-a="mins" data-v="' + n + '" aria-pressed="' + (crSel.mins === n) + '">' + esc(fmt("minsW", { n: n })) + "</button>"; }).join("") + "</div></div>" +
        '<button type="button" class="btn pri big" data-a="startT">' + esc(t("start")) + "</button>" +
        (crMsg ? '<div class="saved" role="status">' + esc(crMsg) + "</div>" : "") + "</div>";
    }
    var left = timeLeft(), tot = timer.mins * 60000, C = 2 * Math.PI * 82, done = left <= 0;
    return '<div class="card sec"><h2>' + esc(done ? t("crEnd") : t("crRun")) + "</h2>" +
      '<div class="timer"><svg viewBox="0 0 190 190" aria-hidden="true"><circle class="bg" cx="95" cy="95" r="82"/><circle class="fg" id="t-ring" cx="95" cy="95" r="82" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - left / tot)).toFixed(1) + '"/></svg>' +
      '<div class="tt" id="t-left" role="timer" style="display:flex;align-items:center">' + mmss(left) + "</div></div>" +
      '<div class="btns" style="justify-content:center"><button type="button" class="btn pri" data-a="passed">' + esc(t("passed")) + "</button>" +
      (done ? '<button type="button" class="btn" data-a="still">' + esc(t("still")) + "</button>" : '<button type="button" class="btn" data-a="stopT">' + esc(t("stop")) + "</button>") + "</div>" +
      '<ol class="steps">' +
      '<li><b><span class="pulse" aria-hidden="true"></span>' + esc(t("st1")) + "</b>" + esc(t("st1t")) + "</li>" +
      "<li><b>" + esc(t("st2")) + "</b>" + esc(t("st2t")) + "</li>" +
      "<li><b>" + esc(t("st3")) + "</b>" + esc(t("st3t")) + "<div>" + (ppl.length ? ppl.map(function (p) {
        return p.phone ? '<a class="btn sm call" href="' + esc(phoneHref(p.phone)) + '">📞 ' + esc(p.name) + "</a>" : '<span class="btn sm call">' + esc(p.name) + "</span>"; }).join("") : '<p class="empty">' + esc(t("noPpl")) + "</p>") +
      '<button type="button" class="btn sm call" data-a="help">🆘 ' + esc(t("helpLines")) + "</button></div></li>" +
      "<li><b>" + esc(t("st4")) + "</b>" + (why.length ? '<div class="reasonsbox">' + why.map(function (w) { return "<p>💙 " + esc(w.text) + "</p>"; }).join("") + "</div>" : esc(t("noWhy"))) + "</li>" +
      "<li><b>" + esc(t("st5")) + "</b>" + esc(t("st5t")) + "</li></ol></div>";
  }
  function panelWhy() {
    var why = S.list("why").sort(function (a, b) { return a.created - b.created; }), ppl = S.list("ppl").sort(function (a, b) { return a.created - b.created; });
    return '<div class="card sec"><h2>' + esc(t("whyTitle")) + '</h2><p class="lead">' + esc(t("whyLead")) + "</p>" +
      (why.length ? '<ul class="list">' + why.map(function (w) { return '<li data-id="' + esc(w.id) + '"><span class="grow">💙 ' + esc(w.text) + '</span><button type="button" class="x" data-a="delItem" aria-label="' + esc(t("del")) + '">×</button></li>'; }).join("") + "</ul>" : "") +
      '<form class="row2" data-form="why" autocomplete="off" style="margin-top:10px"><input type="text" class="inp" name="text" maxlength="200" placeholder="' + esc(t("phWhy")) + '" aria-label="' + esc(t("whyTitle")) + '"><button type="submit" class="btn pri">' + esc(t("add")) + "</button></form></div>" +
      '<div class="card sec"><h2>' + esc(t("pplTitle")) + '</h2><p class="lead">' + esc(t("pplLead")) + "</p>" +
      (ppl.length ? '<ul class="list">' + ppl.map(function (p) { return '<li data-id="' + esc(p.id) + '"><span class="grow">' + esc(p.name) + (p.phone ? '<span class="meta" dir="ltr" style="text-align:start">' + esc(p.phone) + "</span>" : "") + "</span>" +
        (p.phone ? '<a class="btn sm" href="' + esc(phoneHref(p.phone)) + '">📞 ' + esc(t("call")) + "</a>" : "") + '<button type="button" class="x" data-a="delItem" aria-label="' + esc(t("del")) + '">×</button></li>'; }).join("") + "</ul>" : "") +
      '<form data-form="ppl" autocomplete="off" style="margin-top:10px"><div class="row2"><input type="text" class="inp" name="name" maxlength="60" placeholder="' + esc(t("phName")) + '" aria-label="' + esc(t("phName")) + '">' +
      '<input type="tel" class="inp" name="phone" maxlength="20" dir="ltr" placeholder="' + esc(t("phPhone")) + '" aria-label="' + esc(t("phPhone")) + '"></div><button type="submit" class="btn pri big">' + esc(t("add")) + "</button></form></div>";
  }
  function panelHist() {
    var ev = S.list("chk").concat(S.list("crv"), S.list("slip")).sort(function (a, b) { return b.created - a.created; });
    var max = {}; S.list("chk").forEach(function (x) { max[x.day] = Math.max(max[x.day] == null ? -1 : max[x.day], x.crave || 0); });
    var bars = "";
    for (var i = 13; i >= 0; i--) {
      var d = new Date(Date.now() - i * DAY), k = dayKey(d), v = max[k];
      bars += '<span class="' + (v == null ? "none" : "") + '" style="height:' + (v == null ? 2 : Math.max(4, v * 10)) + '%" title="' + esc(k + (v == null ? "" : " · " + v + "/10")) + '"><b>' + d.getDate() + "</b></span>";
    }
    var h = '<div class="card sec"><h2>' + esc(t("histTitle")) + '</h2><p class="lead">' + esc(t("histLead")) + '</p><div class="bars" aria-hidden="true">' + bars + "</div></div>";
    if (!ev.length) return h + '<div class="card sec"><p class="empty">' + esc(t("noHist")) + "</p></div>";
    var out = "", lastDay = null, tl = list("trigs");
    ev.slice(0, 200).forEach(function (x) {
      var w = when(x.created);
      if (w.key !== lastDay) { if (lastDay) out += "</ul>"; out += '<div class="day">' + esc(w.day) + '</div><ul class="list">'; lastDay = w.key; }
      var ico, title, body = [];
      if (x.kind === "chk") {
        ico = FACES[(x.mood || 3) - 1]; title = t("hChk") + " · " + addName(x.add);
        body.push(t("m" + (x.mood || 3)) + " · " + fmt("hCrave", { n: x.crave || 0 }) + (x.trig && x.trig.length ? " · " + x.trig.map(function (k) { return tl[TRIG.indexOf(k)] || k; }).join(", ") : ""));
        if (x.note) body.push(x.note);
      } else if (x.kind === "crv") {
        ico = "⏳"; title = t("hCrv") + " · " + addName(x.add); body.push(fmt("hMins", { n: x.mins }) + " · " + t(x.outcome === "passed" ? "hPassed" : "hStill"));
      } else { ico = "🔄"; title = t("hSlip") + " · " + x.name; body.push(fmt("hSlipD", { n: x.days })); }
      out += '<li data-id="' + esc(x.id) + '"><span class="ico" aria-hidden="true">' + ico + '</span><div class="grow"><b>' + esc(title) + '</b> <span class="meta" style="display:inline">' + esc(w.time) + "</span>" +
        body.map(function (b) { return "<p>" + esc(b) + "</p>"; }).join("") + '</div><button type="button" class="x" data-a="delHist" aria-label="' + esc(t("del")) + '">×</button></li>';
    });
    return h + '<div class="card sec hist">' + out + "</ul></div>";
  }

  /* ---------- render ---------- */
  function render() {
    var tabs = $("tabs"), panels = $("panels"); if (!tabs || !panels) return;
    if (!S.uid()) { tabs.innerHTML = ""; panels.innerHTML = ""; setStatus(); return; }
    if (typing()) { deferred = true; return; } // don't wipe what the user is typing; render on blur
    deferred = false;
    var drafts = {}; panels.querySelectorAll("form [name]").forEach(function (i) { drafts[i.closest("form").getAttribute("data-form") + "/" + i.name] = i.value; });
    tabs.innerHTML = TABS.map(function (x) { return '<button type="button" class="tab" role="tab" data-tab="' + x[0] + '" aria-selected="' + (tab === x[0]) + '">' + esc(t(x[1])) + "</button>"; }).join("");
    panels.innerHTML = '<section role="tabpanel">' + (tab === "clean" ? panelClean() : tab === "check" ? panelCheck() : tab === "crave" ? panelCrave() : tab === "why" ? panelWhy() : panelHist()) + "</section>";
    panels.querySelectorAll("form [name]").forEach(function (i) { var v = drafts[i.closest("form").getAttribute("data-form") + "/" + i.name]; if (v && i.name !== "since") i.value = v; });
    setStatus();
  }
  function tick() {
    if (!S.uid()) return;
    if (timer && tab === "crave") {
      var left = timeLeft(), el = $("t-left"), ring = $("t-ring");
      if (left <= 0 && !timer.rang) { timer.rang = 1; lsSet("rg-myrehab-timer", JSON.stringify(timer)); try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} render(); return; }
      if (el) el.textContent = mmss(left);
      if (ring) { var C = 2 * Math.PI * 82; ring.setAttribute("stroke-dashoffset", (C * (1 - left / (timer.mins * 60000))).toFixed(1)); }
    }
  }
  setInterval(tick, 1000);
  setInterval(function () { if (tab === "clean" && S.uid() && !editDate) render(); }, 30000);

  function endTimer(outcome) {
    if (!timer) return;
    var mins = Math.max(1, Math.round((Math.min(Date.now(), timer.end) - timer.start) / 60000));
    S.add({ kind: "crv", add: timer.add || "", mins: mins, outcome: outcome, day: dayKey() });
    crMsg = t(outcome === "passed" ? "crPassed" : "crStill");
    timer = null; lsSet("rg-myrehab-timer", null); render();
  }

  function boot() {
    var panels = $("panels");
    $("tabs").addEventListener("click", function (e) {
      var b = e.target.closest("[data-tab]"); if (!b) return;
      tab = b.getAttribute("data-tab"); lsSet("rg-myrehab-tab", tab); editDate = null; ckSaved = false; crMsg = ""; render();
    });
    panels.addEventListener("focusout", function () { setTimeout(function () { if (deferred && !typing()) render(); }, 0); });
    panels.addEventListener("input", function (e) {
      var c = e.target.classList;
      if (c.contains("c-crave")) { ck.crave = +e.target.value; var o = e.target.parentNode.querySelector(".c-out"); if (o) o.textContent = e.target.value; }
      else if (c.contains("c-note")) ck.note = e.target.value;
    });
    panels.addEventListener("change", function (e) {
      var c = e.target.classList;
      if (c.contains("c-add")) ck.add = e.target.value;
      else if (c.contains("r-add")) crSel.add = e.target.value;
    });
    panels.addEventListener("submit", function (e) {
      var f = e.target.closest("[data-form]"); if (!f) return; e.preventDefault();
      var k = f.getAttribute("data-form"), v = function (n) { var i = f.querySelector('[name="' + n + '"]'); return i ? i.value : ""; };
      if (k === "add") {
        var name = clean(v("name"), 60); if (!name) { f.querySelector('[name="name"]').focus(); return; }
        var since = v("since") || localDT(new Date()); if (new Date(since).getTime() > Date.now()) since = localDT(new Date());
        f.reset(); S.add({ kind: "add", name: name, since: since });
      } else if (k === "why") {
        var tx = clean(v("text"), 200); if (!tx) return; f.reset(); S.add({ kind: "why", text: tx });
      } else if (k === "ppl") {
        var nm = clean(v("name"), 60); if (!nm) { f.querySelector('[name="name"]').focus(); return; }
        var ph = clean(v("phone"), 20).replace(/[^\d+*# -]/g, ""); f.reset(); S.add({ kind: "ppl", name: nm, phone: ph });
      }
      if (document.activeElement) document.activeElement.blur(); render();
    });
    panels.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]"); if (!b) return;
      var a = b.getAttribute("data-a"), host = b.closest("[data-id]"), id = host && host.getAttribute("data-id"), x = id && S.get(id);
      if (a === "help") { if (window.RGHelp) RGHelp.open(); return; }
      if (a === "mood") { ck.mood = +b.getAttribute("data-v"); ckSaved = false; render(); return; }
      if (a === "trig") { var tv = b.getAttribute("data-v"), i = ck.trig.indexOf(tv); if (i >= 0) ck.trig.splice(i, 1); else ck.trig.push(tv); render(); return; }
      if (a === "saveChk") {
        if (!ck.mood) return;
        S.add({ kind: "chk", add: ck.add || "", crave: ck.crave, mood: ck.mood, trig: ck.trig.length ? ck.trig.slice() : null, note: clean(ck.note, 600), day: dayKey() });
        ck = { add: ck.add, crave: 0, mood: 0, trig: [], note: "" }; ckSaved = true; render(); return;
      }
      if (a === "mins") { crSel.mins = +b.getAttribute("data-v"); render(); return; }
      if (a === "startT") { crMsg = ""; timer = { start: Date.now(), end: Date.now() + crSel.mins * 60000, mins: crSel.mins, add: crSel.add || "" }; lsSet("rg-myrehab-timer", JSON.stringify(timer)); render(); return; }
      if (a === "passed") { endTimer("passed"); return; }
      if (a === "still") { endTimer("still"); return; }
      if (a === "stopT") { timer = null; lsSet("rg-myrehab-timer", null); render(); return; }
      if (!x) return;
      if (a === "slip") {
        if (!window.confirm(t("confirmSlip"))) return;
        var days = Math.floor(cleanMs(x) / DAY);
        S.add({ kind: "slip", add: x.id, name: x.name, days: days, day: dayKey() });
        S.upd(x.id, { since: localDT(new Date()), best: Math.max(x.best || 0, days) || null });
      } else if (a === "editDate") { editDate = x.id; render(); }
      else if (a === "cancelDate") { editDate = null; render(); }
      else if (a === "saveDate") {
        var inp = host.querySelector(".e-since"), nv = inp && inp.value; editDate = null;
        if (nv && new Date(nv).getTime() <= Date.now() && nv !== x.since) S.upd(x.id, { since: nv }); else render();
      } else if (a === "delAdd") { if (window.confirm(t("confirmDel").replace("{x}", x.name))) S.del(x.id); }
      else if (a === "delItem") S.del(x.id);
      else if (a === "delHist") { if (window.confirm(t("confirmDelH"))) S.del(x.id); }
    });
    M.onLang(render);
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
