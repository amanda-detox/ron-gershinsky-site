/* Rogali (רוגעלי) reading topics. Generic public text, not anyone's account data.
   Language follows the app toggle (rg-lang). */
(function () {
  "use strict";
  var UI = {
    he: { section: "נושאים", back: "→ חזרה לנושאים", onlyHe: "" },
    en: { section: "Topics", back: "← Back to topics", onlyHe: "The example itself is in Hebrew." }
  };
  var TOPICS = [
    {
      id: "breath",
      title: { he: "נשימה איטית", en: "Slow breathing" },
      note: { he: "דוגמה כללית. אפשר להתעלם ממנה.", en: "A generic example. You can ignore it." },
      body: {
        he: "שאיפה דרך האף בספירה עד 4, עצירה קצרה, ונשיפה ארוכה עד 6. חוזרים כמה פעמים, בקצב נוח. אם מרגישים סחרחורת, עוצרים וחוזרים לנשימה רגילה. זה לא תחליף לעזרה מקצועית.",
        en: "Breathe in through the nose for a count of 4, pause briefly, then breathe out slowly for a count of 6. Repeat a few times at a comfortable pace. If you feel dizzy, stop and return to normal breathing. This is not a substitute for professional help."
      }
    }
  ];
  window.CALM_TOPICS = TOPICS;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function lang() {
    try { if (localStorage.getItem("rg-lang") === "en") return "en"; } catch (e) {}
    return (window.RGMy && RGMy.lang() === "en") ? "en" : "he";
  }
  function text(obj) {
    var l = lang();
    if (obj && obj[l]) return { t: obj[l], l: l };
    if (obj && obj.he) return { t: obj.he, l: "he" };
    if (obj && obj.en) return { t: obj.en, l: "en" };
    return { t: "", l: l };
  }
  function topicById(id) {
    for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i].id === id) return TOPICS[i];
    return null;
  }
  function hashId() {
    var id = "";
    try { id = decodeURIComponent((location.hash || "").replace(/^#/, "")); } catch (e) { id = ""; }
    return topicById(id) ? id : "";
  }
  var open = "";

  function render() {
    var root = document.getElementById("read");
    if (!root) return;
    var L = UI[lang()] || UI.he;
    root.setAttribute("aria-label", L.section);
    var topic = topicById(open);
    if (!topic) {
      root.innerHTML = '<h2 id="read-h">' + esc(L.section) + "</h2>" + TOPICS.map(function (tp) {
        var title = text(tp.title), note = text(tp.note);
        return '<button type="button" class="topic" data-topic="' + esc(tp.id) + '"><b lang="' + title.l + '">' + esc(title.t) + "</b><small lang=\"" + note.l + "\">" + esc(note.t) + "</small></button>";
      }).join("");
      return;
    }
    var title = text(topic.title), note = text(topic.note), body = text(topic.body);
    var langNote = (body.l !== lang() && L.onlyHe) ? '<p class="topic-note">' + esc(L.onlyHe) + "</p>" : "";
    root.innerHTML = '<button type="button" class="btn sm backbtn" data-back="1">' + esc(L.back) + "</button>" +
      '<article class="card sec"><h2 lang="' + title.l + '">' + esc(title.t) + "</h2>" +
      '<p class="topic-note" lang="' + note.l + '">' + esc(note.t) + "</p>" + langNote +
      '<div class="psa" lang="' + body.l + '" dir="' + (body.l === "he" ? "rtl" : "ltr") + '">' + esc(body.t) + "</div></article>";
  }

  function show(id, push) {
    open = topicById(id) ? id : "";
    var base = location.pathname + location.search;
    if (push) {
      if (open) history.pushState({ topic: open }, "", "#" + encodeURIComponent(open));
      else history.pushState(null, "", base);
    }
    render();
    if (open) {
      var root = document.getElementById("read");
      if (root && root.scrollIntoView) root.scrollIntoView({ block: "start" });
    }
  }

  function boot() {
    var root = document.getElementById("read");
    if (!root || root.getAttribute("data-ready") === "1") return;
    root.setAttribute("data-ready", "1");
    open = hashId();
    root.addEventListener("click", function (e) {
      var b = e.target.closest("[data-topic]");
      if (b) { show(b.getAttribute("data-topic"), true); return; }
      if (e.target.closest("[data-back]")) {
        if (history.state && history.state.topic) history.back();
        else show("", true);
      }
    });
    window.addEventListener("popstate", function () { open = hashId(); render(); });
    window.addEventListener("hashchange", function () { open = hashId(); render(); });
    if (window.RGMy && RGMy.onLang) RGMy.onLang(function () { render(); });
    window.addEventListener("storage", function (e) { if (e.key === "rg-lang") render(); });
    render();
    if (open && root.scrollIntoView) root.scrollIntoView({ block: "start" });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
