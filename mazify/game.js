/* מבוכפיי · Mazify: daily maze (seeded by date) + free play. Keyboard, swipe, D-pad. */
(function () {
  "use strict";
  var T = {
    he: { title: "מבוכפיי", daily: "מבוך יומי", free: "משחק חופשי", newm: "מבוך חדש", time: "זמן:", best: "שיא:", size: ["קטן", "בינוני", "גדול"],
      win: "יצאת מהמבוך! ", rec: "שיא חדש! ⭐", hint: "חצים / WASD, החלקה על המבוך או הכפתורים. הגיעו לכוכב הזהוב.", lang: "EN", already: "את המבוך של היום כבר פתרת. אפשר לשפר את השיא!" },
    en: { title: "Mazify", daily: "Daily maze", free: "Free play", newm: "New maze", time: "Time:", best: "Best:", size: ["Small", "Medium", "Large"],
      win: "You escaped! ", rec: "New record! ⭐", hint: "Arrows / WASD, swipe on the maze or use the buttons. Reach the gold star.", lang: "עב", already: "You already solved today's maze. Try to beat your best!" }
  };
  var SIZES = [11, 17, 25];
  var lang = "he"; try { lang = localStorage.getItem("rg-lang") === "en" ? "en" : "he"; } catch (e) {}
  var mode = "daily", sizeIdx = 1, grid, N, px, py, t0 = 0, running = false, done = false, seedStr = "", trail = [];
  var $ = function (id) { return document.getElementById(id); };
  var cv = $("c"), ctx = cv.getContext("2d");

  function today() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function hash(s) { var h = 1779033703 ^ s.length; for (var i = 0; i < s.length; i++) { h = Math.imul(h ^ s.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; } return h >>> 0; }
  function rng(seed) { var a = seed; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  // grid of cells: 1 = wall, 0 = open; N odd. Recursive backtracker (iterative).
  function build(n, rand) {
    var g = []; for (var y = 0; y < n; y++) { g.push([]); for (var x = 0; x < n; x++) g[y].push(1); }
    var st = [[1, 1]]; g[1][1] = 0;
    while (st.length) {
      var c = st[st.length - 1], nb = [];
      [[2, 0], [-2, 0], [0, 2], [0, -2]].forEach(function (d) { var nx = c[0] + d[0], ny = c[1] + d[1]; if (nx > 0 && ny > 0 && nx < n - 1 && ny < n - 1 && g[ny][nx]) nb.push([nx, ny, d]); });
      if (!nb.length) { st.pop(); continue; }
      var k = nb[Math.floor(rand() * nb.length)];
      g[c[1] + k[2][1] / 2][c[0] + k[2][0] / 2] = 0; g[k[1]][k[0]] = 0; st.push([k[0], k[1]]);
    }
    return g;
  }
  function bestKey() { return "mazify-best-" + (mode === "daily" ? "daily-" + seedStr : "free-" + SIZES[sizeIdx]); }
  function getBest() { try { var v = +localStorage.getItem(bestKey()); return v > 0 ? v : 0; } catch (e) { return 0; } }
  function newMaze() {
    N = mode === "daily" ? 21 : SIZES[sizeIdx];
    seedStr = mode === "daily" ? today() : String(Date.now()) + Math.random();
    grid = build(N, rng(hash("mazify:" + seedStr)));
    px = 1; py = 1; trail = [[1, 1]]; running = false; done = false; t0 = 0;
    $("time").textContent = "0.0"; $("msg").textContent = mode === "daily" && getBest() ? T[lang].already : "";
    showBest(); draw();
  }
  function showBest() { var b = getBest(); $("best").textContent = b ? (b / 1000).toFixed(1) : "—"; }
  function move(dx, dy) {
    if (done) return;
    var nx = px + dx, ny = py + dy;
    if (!grid[ny] || grid[ny][nx] !== 0) return;
    if (!running) { running = true; t0 = performance.now(); }
    px = nx; py = ny; trail.push([px, py]); if (trail.length > 400) trail.shift();
    if (px === N - 2 && py === N - 2) win();
    draw();
  }
  function win() {
    done = true; running = false;
    var ms = performance.now() - t0, b = getBest(), L = T[lang];
    $("time").textContent = (ms / 1000).toFixed(1);
    var rec = !b || ms < b;
    if (rec) try { localStorage.setItem(bestKey(), Math.round(ms)); } catch (e) {}
    $("msg").textContent = L.win + (ms / 1000).toFixed(1) + "s" + (rec ? " · " + L.rec : "");
    showBest();
  }
  function draw() {
    var W = cv.width, s = W / N; ctx.clearRect(0, 0, W, W);
    ctx.fillStyle = "#081040"; ctx.fillRect(0, 0, W, W);
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (grid[y][x]) {
      ctx.fillStyle = (x + y) % 2 ? "#2c5cff" : "#2752e6"; ctx.fillRect(x * s, y * s, s + .5, s + .5);
    }
    ctx.fillStyle = "rgba(243,207,107,.25)"; trail.forEach(function (p) { ctx.fillRect(p[0] * s + s * .3, p[1] * s + s * .3, s * .4, s * .4); });
    star((N - 1.5) * s, (N - 1.5) * s, s * .42);
    ctx.beginPath(); ctx.arc((px + .5) * s, (py + .5) * s, s * .36, 0, 7);
    var g = ctx.createRadialGradient((px + .4) * s, (py + .4) * s, 1, (px + .5) * s, (py + .5) * s, s * .36);
    g.addColorStop(0, "#fff"); g.addColorStop(1, "#7fb0ff"); ctx.fillStyle = g; ctx.fill();
  }
  function star(cx, cy, r) {
    ctx.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = "#f3cf6b"; ctx.fill();
  }
  function tick() { if (running) $("time").textContent = ((performance.now() - t0) / 1000).toFixed(1); requestAnimationFrame(tick); }
  function applyLang() {
    var L = T[lang]; document.documentElement.lang = lang; document.documentElement.dir = lang === "he" ? "rtl" : "ltr";
    $("title").textContent = L.title; document.title = "מבוכפיי · Mazify";
    $("mDaily").textContent = L.daily; $("mFree").textContent = L.free; $("newBtn").textContent = L.newm;
    $("sizeBtn").textContent = L.size[sizeIdx]; $("lTime").textContent = L.time; $("lBest").textContent = L.best;
    $("hint").textContent = L.hint; $("langBtn").textContent = L.lang;
    $("sizeBtn").hidden = $("newBtn").hidden = mode === "daily";
  }
  function setMode(m) { mode = m; $("mDaily").classList.toggle("on", m === "daily"); $("mFree").classList.toggle("on", m === "free"); applyLang(); newMaze(); }

  $("langBtn").addEventListener("click", function () { lang = lang === "he" ? "en" : "he"; try { localStorage.setItem("rg-lang", lang); } catch (e) {} applyLang(); });
  $("mDaily").onclick = function () { setMode("daily"); };
  $("mFree").onclick = function () { setMode("free"); };
  $("newBtn").onclick = newMaze;
  $("sizeBtn").onclick = function () { sizeIdx = (sizeIdx + 1) % 3; applyLang(); newMaze(); };
  var KEYS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
  addEventListener("keydown", function (e) { var k = KEYS[e.key]; if (k) { e.preventDefault(); move(k[0], k[1]); } });
  Array.prototype.forEach.call(document.querySelectorAll(".pad button"), function (b) {
    var d = b.dataset.d.split(",").map(Number), iv = null;
    function stop() { clearInterval(iv); iv = null; }
    b.addEventListener("pointerdown", function (e) { e.preventDefault(); move(d[0], d[1]); stop(); iv = setInterval(function () { move(d[0], d[1]); }, 140); });
    ["pointerup", "pointerleave", "pointercancel"].forEach(function (ev) { b.addEventListener(ev, stop); });
  });
  // swipe / drag on the canvas: each ~cell of drag moves one step
  var sx = null, sy = null;
  cv.addEventListener("pointerdown", function (e) { sx = e.clientX; sy = e.clientY; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", function (e) {
    if (sx === null) return; var step = cv.getBoundingClientRect().width / N, dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) >= step || Math.abs(dy) >= step) {
      if (Math.abs(dx) > Math.abs(dy)) { move(dx > 0 ? 1 : -1, 0); sx += (dx > 0 ? step : -step); } else { move(0, dy > 0 ? 1 : -1); sy += (dy > 0 ? step : -step); }
    }
  });
  cv.addEventListener("pointerup", function () { sx = sy = null; });
  window.Mazify = { move: move, state: function () { return { N: N, px: px, py: py, done: done, mode: mode, grid: grid }; } };
  applyLang(); newMaze(); tick();
})();
