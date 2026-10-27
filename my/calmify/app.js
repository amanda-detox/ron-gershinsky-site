/* Calmify (my/calmify/) — private, per-user mood check-ins and coping tools. Data goes through ../store.js (Appwrite row
   app="mycalm", key="items", readable/writable by the signed-in user only); nothing personal is stored in the site's files.
   Item kinds:
     mood    { mood: 1-5, anx: 0-10, en: 0-10, sleep?: hours, note?, day }               check-in
     thought { sit, thought, feel?, before?: 0-100, alt?, after?: 0-100, day }            thought record
     tool    { tool: "box" | "478" | "ground", rounds?, day }                            an exercise that was done
     plan    { sec: "signs" | "helps" | "places" | "people", text, phone? }               personal coping plan
   Grounding notes are never saved. */
(function () {
  "use strict";
  var M = window.RGMy, t = M.t;
  var TABS = [["check", "tabCheck"], ["tools", "tabTools"], ["plan", "tabPlan"], ["hist", "tabHist"]];
  var FACES = ["😞", "🙁", "😐", "🙂", "😄"], DAY = 86400000;
  var PATTERNS = { box: [["phIn", 4, 1], ["phHold", 4, 1], ["phOut", 4, 0.45], ["phHold", 4, 0.45]], "478": [["phIn", 4, 1], ["phHold", 7, 1], ["phOut", 8, 0.45]] };
  var PLAN = [["signs", "sSigns", "phSigns"], ["helps", "sHelps", "phHelps"], ["places", "sPlaces", "phPlaces"], ["people", "sPeople", ""]];
  function $(id) { return document.getElementById(id); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function clean(s, n) { return String(s || "").replace(/[ \t\u00a0]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, n); }
  function fmt(k, o) { return t(k).replace(/\{(\w+)\}/g, function (_, x) { return o[x]; }); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function loc() { return M.lang() === "he" ? "he-IL" : "en-GB"; }
  function phoneHref(p) { return "tel:" + String(p).replace(/[^\d+*#]/g, "").replace(/\*/g, "%2A").replace(/#/g, "%23"); }

  var tab = lsGet("rg-mycalm-tab") || "check"; if (!TABS.some(function (x) { return x[0] === tab; })) tab = "check";
  var ck = { mood: 0, anx: 0, en: 5, sleep: "", note: "" }, ckSaved = false, tool = null, msg = "", deferred = false;
  var tr = { sit: "", thought: "", feel: "", before: 50, alt: "", after: 50 };
  var pat = lsGet("rg-mycalm-breath") === "478" ? "478" : "box", br = null, gi = 0;

  var S = RGStore("mycalm", { onChange: function () { render(); }, onStatus: setStatus, busy: function () { return typing() || !!br; } });
  function typing() { var a = document.activeElement; return !!(a && a.closest && a.closest("#panels") && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.type !== "range"); }
  function setStatus() { var s = $("status"); if (!s) return; var st = S.state(); s.className = "status" + (st === "offline" ? " off" : ""); s.textContent = st ? t(st) : ""; }
  function when(ts) {
    var d = new Date(ts), k = dayKey(d), y = new Date(Date.now() - DAY);
    var day = k === dayKey() ? t("today") : k === dayKey(y) ? t("yesterday") : d.toLocaleDateString(loc(), { weekday: "short", day: "numeric", month: "short" });
    return { day: day, key: k, time: d.toLocaleTimeString(loc(), { hour: "2-digit", minute: "2-digit" }) };
  }
  function rangeF(cls, labelK, val, min, max, step, lo, hi) {
    var id = "r-" + cls;
    return '<div class="fld"><span class="fldl" id="' + id + '">' + esc(t(labelK)) + '</span><div class="range"><input type="range" class="' + cls + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '" aria-labelledby="' + id + '"><output>' + val + "</output></div>" +
      (lo ? '<div class="scale"><span>' + esc(t(lo)) + "</span><span>" + esc(t(hi)) + "</span></div>" : "") + "</div>";
  }

  /* ---------- panels ---------- */
  function panelCheck() {
    var td = S.list("mood").filter(function (x) { return x.day === dayKey(); }).length;
    return '<div class="card sec"><h2>' + esc(t("chkTitle")) + '</h2><p class="lead">' + esc(td ? fmt("todayDone", { n: td }) : t("chkLead")) + "</p>" +
      '<div class="fld"><span class="fldl">' + esc(t("mood")) + '</span><div class="faces" role="group" aria-label="' + esc(t("mood")) + '">' + FACES.map(function (f, i) {
        return '<button type="button" data-a="mood" data-v="' + (i + 1) + '" aria-pressed="' + (ck.mood === i + 1) + '"><i aria-hidden="true">' + f + "</i>" + esc(t("m" + (i + 1))) + "</button>"; }).join("") + "</div></div>" +
      rangeF("c-anx", "anx", ck.anx, 0, 10, 1, "low", "high") + rangeF("c-en", "energy", ck.en, 0, 10, 1, "low", "high") +
      '<label class="fld"><span>' + esc(t("sleep")) + '</span><div class="row2"><input type="number" class="inp c-sleep" min="0" max="16" step="0.5" inputmode="decimal" value="' + esc(ck.sleep) + '" style="max-width:8rem"><span style="flex:none;color:var(--muted)">' + esc(t("hrs")) + "</span></div></label>" +
      '<label class="fld"><span>' + esc(t("note")) + '</span><textarea class="inp c-note" maxlength="600" placeholder="' + esc(t("phNote")) + '">' + esc(ck.note) + "</textarea></label>" +
      '<button type="button" class="btn pri big" data-a="saveChk"' + (ck.mood ? "" : " disabled") + ">" + esc(t("saveChk")) + "</button>" +
      (ckSaved ? '<div class="saved" role="status">' + esc(t("chkSaved")) + "</div>" : "") + "</div>";
  }
  function panelTools() {
    var backB = '<button type="button" class="btn sm backbtn" data-a="tools">' + esc(t("back")) + "</button>";
    if (tool === "breath") {
      var ph = br ? PATTERNS[pat][br.i] : null;
      return backB + '<div class="card sec"><h2>' + esc(t("tBreath")) + "</h2>" +
        '<div class="fld"><span class="fldl">' + esc(t("pattern")) + '</span><div class="chips">' + [["box", "pBox"], ["478", "p478"]].map(function (p) {
          return '<button type="button" data-a="pat" data-v="' + p[0] + '" aria-pressed="' + (pat === p[0]) + '"' + (br ? " disabled" : "") + ">" + esc(t(p[1])) + "</button>"; }).join("") + "</div></div>" +
        '<p class="lead" style="margin-top:8px">' + esc(t(pat === "box" ? "pBoxD" : "p478D")) + "</p>" +
        '<div class="breath"><div class="orb"><i id="b-orb"' + (ph ? ' style="transform:scale(' + ph[2] + ')"' : "") + '></i><span id="b-num">' + (br ? br.left : "") + '</span></div><div class="ph" id="b-ph" aria-live="polite">' + (ph ? esc(t(ph[0])) : "") + '</div><div class="rd" id="b-rd">' + (br ? esc(fmt("rounds", { n: br.rounds })) : "") + "</div></div>" +
        '<button type="button" class="btn pri big" data-a="' + (br ? "bStop" : "bStart") + '">' + esc(t(br ? "stop" : "start")) + "</button>" +
        (msg ? '<div class="saved" role="status">' + esc(msg) + "</div>" : "") + '<p class="disclaim">' + esc(t("breathTip")) + "</p></div>";
    }
    if (tool === "ground") {
      var n = 5 - gi, fin = gi >= 5;
      return backB + '<div class="card sec"><h2>' + esc(t("tGround")) + "</h2>" + (fin ? '<div class="saved" role="status">' + esc(t("gFinished")) + "</div>" :
        '<div class="gstep"><span class="gn">' + n + "</span><h3>" + esc(t("g" + n)) + '</h3><p class="lead">' + esc(t("g" + n + "d")) + "</p></div>" +
        '<textarea class="inp" maxlength="300" placeholder="' + esc(t("phG")) + '" aria-label="' + esc(t("g" + n)) + '"></textarea>' +
        '<div class="gdots" aria-hidden="true">' + [0, 1, 2, 3, 4].map(function (i) { return "<i" + (i <= gi ? ' class="on"' : "") + "></i>"; }).join("") + "</div>" +
        '<div class="btns">' + (gi ? '<button type="button" class="btn" data-a="gPrev">' + esc(t("gPrev")) + "</button>" : "") + '<button type="button" class="btn pri" data-a="gNext" style="flex:1">' + esc(t(gi === 4 ? "gDone" : "gNext")) + "</button></div>") + "</div>";
    }
    if (tool === "thought") {
      function ta(k, lk, pk) { return '<label class="fld"><span>' + esc(t(lk)) + '</span><textarea class="inp" data-tr="' + k + '" maxlength="600" placeholder="' + esc(t(pk)) + '">' + esc(tr[k]) + "</textarea></label>"; }
      return backB + '<div class="card sec"><h2>' + esc(t("tThought")) + '</h2><p class="lead">' + esc(t("trLead")) + "</p>" +
        ta("sit", "trSit", "phSit") + ta("thought", "trThought", "phThought") +
        '<label class="fld"><span>' + esc(t("trFeel")) + '</span><input type="text" class="inp" data-tr="feel" maxlength="80" placeholder="' + esc(t("phFeel")) + '" value="' + esc(tr.feel) + '"></label>' +
        rangeF("t-before", "trBefore", tr.before, 0, 100, 5) + ta("alt", "trAlt", "phAlt") + rangeF("t-after", "trAfter", tr.after, 0, 100, 5) +
        '<button type="button" class="btn pri big" data-a="trSave"' + (tr.sit.trim() || tr.thought.trim() ? "" : " disabled") + ">" + esc(t("trSave")) + "</button>" +
        (msg ? '<div class="saved" role="status">' + esc(msg) + "</div>" : "") + "</div>";
    }
    return '<p class="lead" style="margin:14px 2px 0">' + esc(t("toolsLead")) + "</p>" +
      [["breath", "🌬️", "tBreath", "tBreathD"], ["ground", "🖐️", "tGround", "tGroundD"], ["thought", "📝", "tThought", "tThoughtD"]].map(function (x) {
        return '<button type="button" class="tool" data-a="open" data-v="' + x[0] + '"><i aria-hidden="true">' + x[1] + "</i><span><b>" + esc(t(x[2])) + "</b><small>" + esc(t(x[3])) + "</small></span></button>"; }).join("");
  }
  function panelPlan() {
    var all = S.list("plan").sort(function (a, b) { return a.created - b.created; });
    return '<div class="card sec"><p class="lead">' + esc(t("planLead")) + "</p>" + PLAN.map(function (p) {
      var l = all.filter(function (x) { return x.sec === p[0]; }), ppl = p[0] === "people";
      return '<div class="plansec"><h2>' + esc(t(p[1])) + "</h2>" +
        (l.length ? '<ul class="list">' + l.map(function (x) {
          return '<li data-id="' + esc(x.id) + '"><span class="grow">' + esc(x.text) + (x.phone ? '<span class="meta" dir="ltr" style="text-align:start">' + esc(x.phone) + "</span>" : "") + "</span>" +
            (x.phone ? '<a class="btn sm" href="' + esc(phoneHref(x.phone)) + '">📞 ' + esc(t("call")) + "</a>" : "") + '<button type="button" class="x" data-a="del" aria-label="' + esc(t("del")) + '">×</button></li>'; }).join("") + "</ul>" : "") +
        '<form data-form="' + p[0] + '" autocomplete="off" style="margin-top:8px">' + (ppl
          ? '<div class="row2"><input type="text" class="inp" name="text" maxlength="60" placeholder="' + esc(t("phName")) + '" aria-label="' + esc(t("phName")) + '"><input type="tel" class="inp" name="phone" maxlength="20" dir="ltr" placeholder="' + esc(t("phPhone")) + '" aria-label="' + esc(t("phPhone")) + '"><button type="submit" class="btn pri">' + esc(t("add")) + "</button></div>"
          : '<div class="row2"><input type="text" class="inp" name="text" maxlength="200" placeholder="' + esc(t(p[2])) + '" aria-label="' + esc(t(p[1])) + '"><button type="submit" class="btn pri">' + esc(t("add")) + "</button></div>") + "</form></div>";
    }).join("") + "</div>";
  }
  function panelHist() {
    var ev = S.list("mood").concat(S.list("thought"), S.list("tool")).sort(function (a, b) { return b.created - a.created; });
    var sum = {}, cnt = {}; S.list("mood").forEach(function (x) { sum[x.day] = (sum[x.day] || 0) + (x.mood || 0); cnt[x.day] = (cnt[x.day] || 0) + 1; });
    var bars = "";
    for (var i = 13; i >= 0; i--) {
      var d = new Date(Date.now() - i * DAY), k = dayKey(d), v = cnt[k] ? sum[k] / cnt[k] : null;
      bars += '<span class="' + (v == null ? "none" : "") + '" style="height:' + (v == null ? 2 : v * 20) + '%" title="' + esc(k + (v == null ? "" : " · " + v.toFixed(1) + "/5")) + '"><b>' + d.getDate() + "</b></span>";
    }
    var h = '<div class="card sec"><h2>' + esc(t("histTitle")) + '</h2><p class="lead">' + esc(t("histLead")) + '</p><div class="bars moodbars" aria-hidden="true">' + bars + "</div></div>";
    if (!ev.length) return h + '<div class="card sec"><p class="empty">' + esc(t("noHist")) + "</p></div>";
    var out = "", lastDay = null;
    ev.slice(0, 200).forEach(function (x) {
      var w = when(x.created), ico, title, body = [];
      if (w.key !== lastDay) { if (lastDay) out += "</ul>"; out += '<div class="day">' + esc(w.day) + '</div><ul class="list">'; lastDay = w.key; }
      if (x.kind === "mood") {
        ico = FACES[(x.mood || 3) - 1]; title = t("hMood") + " · " + t("m" + (x.mood || 3));
        body.push([fmt("hAnx", { n: x.anx || 0 }), fmt("hEn", { n: x.en || 0 })].concat(x.sleep != null ? [fmt("hSleep", { n: x.sleep })] : []).join(" · "));
        if (x.note) body.push(x.note);
      } else if (x.kind === "thought") {
        ico = "📝"; title = t("hThought");
        if (x.sit) body.push(x.sit); if (x.thought) body.push("💭 " + x.thought);
        if (x.feel || x.before != null) body.push(fmt("hFeel", { f: x.feel || "–", a: x.before != null ? x.before : "–", b: x.after != null ? x.after : "–" }));
        if (x.alt) body.push("💡 " + x.alt);
      } else { ico = x.tool === "ground" ? "🖐️" : "🌬️"; title = t("hTool"); body.push(x.tool === "ground" ? t("hGround") : fmt(x.tool === "478" ? "h478" : "hBox", { n: x.rounds || 0 })); }
      out += '<li data-id="' + esc(x.id) + '"><span class="ico" aria-hidden="true">' + ico + '</span><div class="grow"><b>' + esc(title) + '</b> <span class="meta" style="display:inline">' + esc(w.time) + "</span>" +
        body.map(function (b) { return "<p>" + esc(b) + "</p>"; }).join("") + '</div><button type="button" class="x" data-a="delHist" aria-label="' + esc(t("del")) + '">×</button></li>';
    });
    return h + '<div class="card sec hist">' + out + "</ul></div>";
  }

  /* ---------- breathing ---------- */
  function bPhase() {
    if (!br) return;
    var p = PATTERNS[pat][br.i], orb = $("b-orb"), ph = $("b-ph"), num = $("b-num");
    br.left = p[1];
    if (orb) { orb.style.transitionDuration = p[1] + "s"; orb.style.transform = "scale(" + p[2] + ")"; }
    if (ph) ph.textContent = t(p[0]); if (num) num.textContent = br.left;
    clearInterval(br.sec);
    br.sec = setInterval(function () {
      if (!br) return; br.left--;
      if (br.left > 0) { var n = $("b-num"); if (n) n.textContent = br.left; return; }
      clearInterval(br.sec); br.i++;
      if (br.i >= PATTERNS[pat].length) { br.i = 0; br.rounds++; var r = $("b-rd"); if (r) r.textContent = fmt("rounds", { n: br.rounds }); }
      bPhase();
    }, 1000);
  }
  function bStart() { msg = ""; br = { i: 0, left: 0, rounds: 0, sec: null }; render(true); requestAnimationFrame(function () { requestAnimationFrame(bPhase); }); }
  function bStop(save) {
    if (!br) return; clearInterval(br.sec); var r = br.rounds; br = null;
    if (save && r > 0) { S.add({ kind: "tool", tool: pat, rounds: r, day: dayKey() }); msg = fmt(pat === "478" ? "h478" : "hBox", { n: r }) + " ✓"; }
    render();
  }

  /* ---------- render ---------- */
  function render(force) {
    var tabs = $("tabs"), panels = $("panels"); if (!tabs || !panels) return;
    if (!S.uid()) { if (br) bStop(false); tabs.innerHTML = ""; panels.innerHTML = ""; setStatus(); return; }
    if (!force && (typing() || br)) { deferred = true; return; }
    deferred = false;
    var drafts = {}; panels.querySelectorAll("form [name]").forEach(function (i) { drafts[i.closest("form").getAttribute("data-form") + "/" + i.name] = i.value; });
    tabs.innerHTML = TABS.map(function (x) { return '<button type="button" class="tab" role="tab" data-tab="' + x[0] + '" aria-selected="' + (tab === x[0]) + '">' + esc(t(x[1])) + "</button>"; }).join("");
    panels.innerHTML = '<section role="tabpanel">' + (tab === "check" ? panelCheck() : tab === "tools" ? panelTools() : tab === "plan" ? panelPlan() : panelHist()) + "</section>";
    panels.querySelectorAll("form [name]").forEach(function (i) { var v = drafts[i.closest("form").getAttribute("data-form") + "/" + i.name]; if (v) i.value = v; });
    setStatus();
  }

  function boot() {
    var panels = $("panels");
    $("tabs").addEventListener("click", function (e) {
      var b = e.target.closest("[data-tab]"); if (!b) return;
      if (br) bStop(true);
      tab = b.getAttribute("data-tab"); lsSet("rg-mycalm-tab", tab); ckSaved = false; msg = ""; render();
    });
    panels.addEventListener("focusout", function () { setTimeout(function () { if (deferred && !typing() && !br) render(); }, 0); });
    panels.addEventListener("input", function (e) {
      var el = e.target, c = el.classList, o = el.type === "range" && el.parentNode.querySelector("output");
      if (o) o.textContent = el.value;
      if (c.contains("c-anx")) ck.anx = +el.value; else if (c.contains("c-en")) ck.en = +el.value;
      else if (c.contains("c-sleep")) ck.sleep = el.value; else if (c.contains("c-note")) ck.note = el.value;
      else if (c.contains("t-before")) tr.before = +el.value; else if (c.contains("t-after")) tr.after = +el.value;
      else if (el.hasAttribute("data-tr")) {
        tr[el.getAttribute("data-tr")] = el.value;
        var sb = panels.querySelector('[data-a="trSave"]'); if (sb) sb.disabled = !(tr.sit.trim() || tr.thought.trim());
      }
    });
    panels.addEventListener("submit", function (e) {
      var f = e.target.closest("[data-form]"); if (!f) return; e.preventDefault();
      var sec = f.getAttribute("data-form"), ti = f.querySelector('[name="text"]'), pi = f.querySelector('[name="phone"]');
      var tx = clean(ti.value, sec === "people" ? 60 : 200); if (!tx) { ti.focus(); return; }
      var ph = pi ? clean(pi.value, 20).replace(/[^\d+*# -]/g, "") : "";
      f.reset(); S.add({ kind: "plan", sec: sec, text: tx, phone: ph });
      if (document.activeElement) document.activeElement.blur(); render();
      var n = panels.querySelector('form[data-form="' + sec + '"] [name="text"]'); if (n) n.focus();
    });
    panels.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]"); if (!b) return;
      var a = b.getAttribute("data-a"), host = b.closest("[data-id]"), id = host && host.getAttribute("data-id"), x = id && S.get(id);
      if (a === "mood") { ck.mood = +b.getAttribute("data-v"); ckSaved = false; render(); }
      else if (a === "saveChk") {
        if (!ck.mood) return;
        var sl = parseFloat(ck.sleep); sl = isNaN(sl) ? null : Math.max(0, Math.min(16, Math.round(sl * 2) / 2));
        S.add({ kind: "mood", mood: ck.mood, anx: ck.anx, en: ck.en, sleep: sl, note: clean(ck.note, 600), day: dayKey() });
        ck = { mood: 0, anx: 0, en: 5, sleep: "", note: "" }; ckSaved = true; render();
      }
      else if (a === "open") { tool = b.getAttribute("data-v"); gi = 0; msg = ""; render(); window.scrollTo(0, 0); }
      else if (a === "tools") { if (br) bStop(true); tool = null; msg = ""; render(); }
      else if (a === "pat") { pat = b.getAttribute("data-v"); lsSet("rg-mycalm-breath", pat); render(); }
      else if (a === "bStart") bStart();
      else if (a === "bStop") bStop(true);
      else if (a === "gNext") { gi++; if (gi >= 5) S.add({ kind: "tool", tool: "ground", day: dayKey() }); render(); }
      else if (a === "gPrev") { gi = Math.max(0, gi - 1); render(); }
      else if (a === "trSave") {
        if (!(tr.sit.trim() || tr.thought.trim())) return;
        S.add({ kind: "thought", sit: clean(tr.sit, 600), thought: clean(tr.thought, 600), feel: clean(tr.feel, 80), before: tr.before, alt: clean(tr.alt, 600), after: tr.after, day: dayKey() });
        tr = { sit: "", thought: "", feel: "", before: 50, alt: "", after: 50 }; msg = t("trSaved"); render();
      }
      else if (!x) return;
      else if (a === "del") S.del(x.id);
      else if (a === "delHist") { if (window.confirm(t("confirmDelH"))) S.del(x.id); }
    });
    M.onLang(function () { render(true); if (br) bPhase(); });
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
