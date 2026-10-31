/* Home page drag and drop (Ron 2026-10-31): a signed-in user can reorder the apps inside the featured group,
   inside "שאר האפליקציות", and move apps between the two. Touch: long-press ~350ms, then drag (taps and scrolling stay normal).
   Mouse: press and move. Order is saved per user in localStorage "rg-home-order" and synced through RGAccount.syncPrefs.
   Signed out: default order, no dragging. */
(function () {
  "use strict";
  var KEY = "rg-home-order", LONG = 350, MOVE_CANCEL = 10;
  function signedIn() { try { return !!(window.RGAccount && RGAccount.user()); } catch (e) { return false; } }
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); return o && Array.isArray(o.top) && Array.isArray(o.rest) ? o : null; } catch (e) { return null; } }
  function save(o) { try { if (o) localStorage.setItem(KEY, JSON.stringify(o)); else localStorage.removeItem(KEY); } catch (e) {} }
  // set = { top: [...apps, maybe {sep}], rest: [...] } -> same shape in the saved order; new apps keep their default group, at its end
  function apply(set) {
    var o = signedIn() ? load() : null;
    if (!o) return set;
    var all = set.top.concat(set.rest).filter(function (a) { return a && !a.sep && !a.hidden; });
    var used = [];
    function pick(hrefs) { var g = []; hrefs.forEach(function (h) { all.forEach(function (a) { if (a.href === h && used.indexOf(a) < 0) { g.push(a); used.push(a); } }); }); return g; }
    var top = pick(o.top), rest = pick(o.rest);
    set.top.forEach(function (a) { if (a && !a.sep && !a.hidden && used.indexOf(a) < 0) { top.push(a); used.push(a); } });
    set.rest.forEach(function (a) { if (a && !a.sep && !a.hidden && used.indexOf(a) < 0) { rest.push(a); used.push(a); } });
    return { top: top, rest: rest };
  }
  var rerender = function () {};
  function hrefsOf(ul) { return Array.prototype.map.call(ul.querySelectorAll("li[data-href]"), function (li) { return li.getAttribute("data-href"); }); }

  var st = null; // drag state
  function lists() { return [document.getElementById("app-grid"), document.getElementById("more-list")].filter(Boolean); }
  function clearTimer() { if (st && st.timer) { clearTimeout(st.timer); st.timer = 0; } }
  function onDown(e) {
    if (!signedIn() || st || (e.pointerType === "mouse" && e.button !== 0)) return;
    var li = e.target.closest && e.target.closest("li[data-href]");
    if (!li || lists().indexOf(li.parentNode) < 0) return;
    st = { li: li, id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, touch: e.pointerType !== "mouse", on: false, timer: 0 };
    if (st.touch) st.timer = setTimeout(function () { if (st && !st.on) start(); }, LONG);
  }
  function start() {
    var li = st.li, r = li.getBoundingClientRect();
    st.on = true; clearTimer();
    var g = li.cloneNode(true);
    g.className = "dnd-ghost"; g.removeAttribute("data-href");
    g.style.width = r.width + "px"; g.style.height = r.height + "px";
    st.dx = st.x - r.left; st.dy = st.y - r.top;
    document.body.appendChild(g); st.ghost = g;
    li.classList.add("dnd-place");
    document.documentElement.classList.add("dnd-active");
    if (navigator.vibrate) try { navigator.vibrate(15); } catch (e) {}
    moveGhost();
  }
  function moveGhost() { st.ghost.style.transform = "translate(" + (st.x - st.dx) + "px," + (st.y - st.dy) + "px) scale(1.06)"; }
  function onMove(e) {
    if (!st || e.pointerId !== st.id) return;
    st.x = e.clientX; st.y = e.clientY;
    if (!st.on) {
      var d = Math.abs(st.x - st.x0) + Math.abs(st.y - st.y0);
      if (st.touch) { if (d > MOVE_CANCEL) { clearTimer(); st = null; } } // a scroll, not a drag
      else if (d > 6) start();
      return;
    }
    e.preventDefault(); moveGhost();
    var el = document.elementFromPoint(st.x, st.y); if (!el) return;
    var t = el.closest && el.closest("li[data-href]"), ul;
    if (t && t !== st.li && lists().indexOf(t.parentNode) > -1) {
      var r = t.getBoundingClientRect(), rtl = getComputedStyle(t.parentNode).direction === "rtl";
      var after = (st.y > r.bottom - r.height / 4) || (st.y >= r.top + r.height / 4 && (rtl ? st.x < r.left + r.width / 2 : st.x > r.left + r.width / 2));
      t.parentNode.insertBefore(st.li, after ? t.nextSibling : t);
    } else if ((ul = el.closest && el.closest("#app-grid, #more-list, #more-apps")) && !t) {
      if (ul.id === "more-apps") ul = document.getElementById("more-list");
      if (st.li.parentNode !== ul || ul.lastElementChild !== st.li) ul.appendChild(st.li);
    }
  }
  function onUp(e) {
    if (!st || e.pointerId !== st.id) return;
    var s = st; st = null; clearTimer();
    if (!s.on) return;
    s.ghost.remove(); s.li.classList.remove("dnd-place");
    document.documentElement.classList.remove("dnd-active");
    var kill = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
    window.addEventListener("click", kill, true);
    setTimeout(function () { window.removeEventListener("click", kill, true); }, 350);
    if (e.type === "pointercancel") { rerender(); return; }
    var top = document.getElementById("app-grid"), more = document.getElementById("more-list");
    save({ top: hrefsOf(top), rest: hrefsOf(more) });
    rerender();
  }
  document.addEventListener("pointerdown", onDown);
  document.addEventListener("pointermove", onMove, { passive: false });
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
  document.addEventListener("touchmove", function (e) { if (st && (st.on || st.timer)) { if (st.on) e.preventDefault(); } }, { passive: false });
  document.addEventListener("contextmenu", function (e) { if (st || (signedIn() && e.target.closest && e.target.closest("li[data-href]"))) e.preventDefault(); });
  document.addEventListener("dragstart", function (e) { if (signedIn() && e.target.closest && e.target.closest("#app-grid, #more-list")) e.preventDefault(); });

  window.RGHomeDnd = {
    KEY: KEY, apply: apply,
    hasCustom: function () { return !!load(); },
    reset: function () { save(null); rerender(); },
    setRender: function (f) { rerender = f; },
    enabled: signedIn
  };
})();
