/* Procedural ambient sounds for the Sound Mixer. No audio files and no licences: every sound is synthesized here.
   Each sound is rendered once as a seamless 72-second stereo loop. All processing is cyclic (filters and echoes are
   warmed up on the end of the loop, events wrap around), so the end flows into the start with no seam.
   Random events (thunder, birds, crackles...) are baked into the loop, so nothing depends on timers while playing.
   Runs as a Web Worker, on the main thread (window.RGSynth) or in node (module.exports). */
(function () {
  "use strict";
  var SR = 32000, LOOP = 72, N = SR * LOOP, CR = 32, M = N / CR, TAU = Math.PI * 2;
  var LP = 0, HP = 1, BP = 2;

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function white(r) { var a = new Float32Array(N); for (var i = 0; i < N; i++) a[i] = r() * 2 - 1; return a; }
  function pink(r) {
    var w = white(r), y = new Float32Array(N), b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (var k = -SR; k < N; k++) {
      var i = k < 0 ? k + N : k, x = w[i];
      b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
      var v = b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362; b6 = x * 0.115926;
      if (k >= 0) y[i] = v * 0.11;
    }
    return y;
  }
  function brown(r) {
    var w = white(r), y = new Float32Array(N), s = 0;
    for (var k = -SR; k < N; k++) { var i = k < 0 ? k + N : k; s = (s + 0.02 * w[i]) / 1.02; if (k >= 0) y[i] = s * 3.5; }
    return y;
  }
  function coefs(type, f, q, c) {
    var w = TAU * Math.min(Math.max(f, 10), SR * 0.45) / SR, cs = Math.cos(w), al = Math.sin(w) / (2 * q), a0 = 1 + al;
    if (type === LP) { c[0] = (1 - cs) / 2 / a0; c[1] = (1 - cs) / a0; c[2] = c[0]; }
    else if (type === HP) { c[0] = (1 + cs) / 2 / a0; c[1] = -(1 + cs) / a0; c[2] = c[0]; }
    else { c[0] = al / a0; c[1] = 0; c[2] = -al / a0; }
    c[3] = -2 * cs / a0; c[4] = (1 - al) / a0;
  }
  // Cyclic biquad. f is a number or a control-rate array (one value per CR samples).
  function bq(x, type, f, q) {
    var y = new Float32Array(N), c = [0, 0, 0, 0, 0], arr = typeof f !== "number", x1 = 0, x2 = 0, y1 = 0, y2 = 0, last = -1;
    q = q || 0.707;
    if (!arr) coefs(type, f, q, c);
    for (var k = -SR; k < N; k++) {
      var i = k < 0 ? k + N : k;
      if (arr && (i & 31) === 0) { var ff = f[i >> 5]; if (ff !== last) { coefs(type, ff, q, c); last = ff; } }
      var xi = x[i], yi = c[0] * xi + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
      x2 = x1; x1 = xi; y2 = y1; y1 = yi;
      if (k >= 0) y[i] = yi;
    }
    return y;
  }
  // Linear (non-cyclic) biquad for short event buffers. f is a number or a function of u in [0,1].
  function bqLin(x, type, f, q) {
    var n = x.length, y = new Float32Array(n), c = [0, 0, 0, 0, 0], fn = typeof f === "function", x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    q = q || 0.707;
    if (!fn) coefs(type, f, q, c);
    for (var i = 0; i < n; i++) {
      if (fn && (i & 31) === 0) coefs(type, f(i / n), q, c);
      var xi = x[i], yi = c[0] * xi + c[1] * x1 + c[2] * x2 - c[3] * y1 - c[4] * y2;
      x2 = x1; x1 = xi; y2 = y1; y1 = yi; y[i] = yi;
    }
    return y;
  }
  // Smooth cyclic random walk at control rate.
  function walk(r, pps, lo, hi) {
    var K = Math.max(2, Math.round(LOOP * pps)), v = [], g = new Float32Array(M);
    for (var i = 0; i < K; i++) v.push(lo + (hi - lo) * r());
    for (var j = 0; j < M; j++) {
      var p = j / M * K, i0 = Math.floor(p), fr = p - i0, s = (1 - Math.cos(Math.PI * fr)) / 2;
      g[j] = v[i0 % K] * (1 - s) + v[(i0 + 1) % K] * s;
    }
    return g;
  }
  function mulCtl(x, g) {
    for (var i = 0; i < N; i++) { var j = i >> 5, a = g[j], b = g[(j + 1) % M]; x[i] *= a + (b - a) * (i & 31) / 32; }
    return x;
  }
  function add(d, s, k) { for (var i = 0; i < N; i++) d[i] += s[i] * k; return d; }
  function scale(d, k) { for (var i = 0; i < N; i++) d[i] *= k; return d; }
  function S(t) { return ((Math.floor(t * SR) % N) + N) % N; }
  function panG(p) { var a = (p + 1) * Math.PI / 4; return [Math.cos(a) * Math.SQRT2, Math.sin(a) * Math.SQRT2]; }
  function put(L, R, s0, sig, pan, g) {
    var pg = panG(pan), gl = pg[0] * g, gr = pg[1] * g;
    for (var j = 0, n = sig.length; j < n; j++) { var i = (s0 + j) % N, v = sig[j]; L[i] += v * gl; R[i] += v * gr; }
  }
  function putCh(D, s0, sig, g) { for (var j = 0, n = sig.length; j < n; j++) D[(s0 + j) % N] += sig[j] * g; }
  function tone(dur, f, a, h2, h3) {
    var n = Math.max(1, Math.floor(dur * SR)), out = new Float32Array(n), ph = 0;
    h2 = h2 || 0; h3 = h3 || 0;
    for (var j = 0; j < n; j++) {
      var u = j / n; ph += TAU * f(u) / SR;
      out[j] = (Math.sin(ph) + h2 * Math.sin(2 * ph) + h3 * Math.sin(3 * ph)) * a(u);
    }
    return out;
  }
  function noiseBurst(r, dur) { var n = Math.max(1, Math.floor(dur * SR)), o = new Float32Array(n); for (var j = 0; j < n; j++) o[j] = r() * 2 - 1; return o; }
  function env(sig, fn) { for (var j = 0, n = sig.length; j < n; j++) sig[j] *= fn(j / n, j / SR); return sig; }
  // Cyclic stereo ping-pong echo with a lowpass in the loop, in place.
  function echo(L, R, dl, dr, fb, mix, lpHz) {
    var nl = Math.floor(dl * SR), nr = Math.floor(dr * SR), bl = new Float32Array(nl), br = new Float32Array(nr);
    var il = 0, ir = 0, zl = 0, zr = 0, k = 1 - Math.exp(-TAU * lpHz / SR), W = SR * 8;
    for (var kk = -W; kk < N; kk++) {
      var i = kk < 0 ? kk + N : kk, xl = L[i], xr = R[i];
      zl += k * (bl[il] - zl); zr += k * (br[ir] - zr);
      bl[il] = (xl + xr) * 0.5 + fb * zr; br[ir] = fb * zl;
      il = (il + 1) % nl; ir = (ir + 1) % nr;
      if (kk >= 0) { L[i] = xl + mix * zl; R[i] = xr + mix * zr; }
    }
  }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function expo(r, mean) { return -Math.log(1 - r()) * mean; }

  /* ------------------------------------------------------------ sounds */
  function ocean() {
    var r = rng(11), eL = new Float32Array(M), eR = new Float32Array(M), k = 7, ps = [], sum = 0, i, j;
    for (i = 0; i < k; i++) { ps.push(8 + r() * 6); sum += ps[i]; }
    function wave(e, t0, p, a) {
      var len = Math.floor(1.8 * p * SR / CR), rise = 0.45 * p, s0 = Math.floor(t0 * SR / CR);
      for (var j = 0; j < len; j++) {
        var tt = j * CR / SR, v = tt < rise ? (1 - Math.cos(Math.PI * tt / rise)) / 2 : Math.exp(-(tt - rise) / (0.3 * p));
        e[(s0 + j) % M] += a * v;
      }
    }
    var t = r() * LOOP;
    for (i = 0; i < k; i++) {
      var p = ps[i] * LOOP / sum, a = 0.55 + 0.45 * r();
      wave(eL, t, p, a); wave(eR, t + 0.3 + 0.7 * r(), p, a * (0.8 + 0.25 * r())); t += p;
    }
    function ch(e, seed) {
      var rr = rng(seed), cut = new Float32Array(M), g = new Float32Array(M), hs = new Float32Array(M);
      for (j = 0; j < M; j++) { var v = Math.min(e[j], 1.4); cut[j] = 250 + 2500 * v * v; g[j] = 0.15 + v; hs[j] = Math.pow(Math.max(0, v - 0.55), 2); }
      var x = mulCtl(bq(pink(rr), LP, cut, 0.6), g);
      add(x, mulCtl(bq(white(rr), HP, 2500, 0.7), hs), 0.5);
      add(x, mulCtl(brown(rr), g), 0.08);
      return x;
    }
    return { L: ch(eL, 101), R: ch(eR, 102) };
  }

  function river() {
    var r = rng(21), out = [];
    for (var c = 0; c < 2; c++) {
      var rr = rng(210 + c), x = scale(bq(brown(rr), LP, 450, 0.7), 0.3);
      add(x, mulCtl(bq(pink(rr), BP, walk(rr, 0.4, 500, 1600), 0.9), walk(rr, 0.6, 0.5, 1)), 1.6);
      add(x, mulCtl(bq(pink(rr), HP, 2800, 0.7), walk(rr, 1.2, 0.2, 1)), 0.6);
      out.push(x);
    }
    var L = out[0], R = out[1];
    for (var n = 0; n < LOOP * 45; n++) {
      var f0 = 300 + Math.pow(r(), 2) * 1300, kk = 1.3 + r() * 0.9, d = 0.012 + r() * 0.035, a = 0.018 + 0.075 * r() * r();
      var sig = tone(d, (function (f0, kk) { return function (u) { return f0 * Math.pow(kk, u); }; })(f0, kk),
        function (u) { return u < 0.08 ? u / 0.08 : Math.exp(-(u - 0.08) * 5); });
      put(L, R, S(r() * LOOP), sig, (r() * 2 - 1) * 0.8, a);
    }
    return { L: L, R: R };
  }

  function waterfall() {
    var out = [];
    for (var c = 0; c < 2; c++) {
      var rr = rng(310 + c), x = bq(pink(rr), LP, 2500, 0.5);
      add(x, bq(white(rr), LP, 6000, 0.6), 0.2);
      add(x, brown(rr), 0.35);
      mulCtl(x, walk(rr, 0.25, 0.85, 1.05));
      out.push(x);
    }
    return { L: out[0], R: out[1] };
  }

  function rain() {
    var r = rng(41), out = [];
    for (var c = 0; c < 2; c++) {
      var rr = rng(410 + c), x = bq(bq(pink(rr), HP, 400, 0.7), LP, 5000, 0.7);
      add(x, bq(white(rr), HP, 4500, 0.7), 0.05);
      mulCtl(x, walk(rr, 0.1, 0.75, 1.05));
      out.push(x);
    }
    var L = out[0], R = out[1], n, sig;
    function damped(f, tau) { return tone(tau * 6, function () { return f; }, function (u) { return Math.exp(-u * 6); }); }
    for (n = 0; n < LOOP * 50; n++) {
      sig = damped(1800 + r() * 4500, 0.0012 + r() * 0.003);
      put(L, R, S(r() * LOOP), sig, r() * 2 - 1, 0.03 + 0.22 * Math.pow(r(), 3));
    }
    for (n = 0; n < LOOP * 3; n++) {
      sig = damped(500 + r() * 700, 0.004 + r() * 0.004);
      put(L, R, S(r() * LOOP), sig, r() * 2 - 1, 0.05 + 0.12 * r());
    }
    return { L: L, R: R };
  }

  function thunder() {
    var r = rng(51), out = [], c, j;
    for (c = 0; c < 2; c++) {
      var rr = rng(510 + c), x = scale(bq(bq(pink(rr), HP, 500, 0.7), LP, 3200, 0.7), 0.45);
      add(x, mulCtl(brown(rr), walk(rr, 0.2, 0.1, 0.3)), 1);
      out.push(x);
    }
    var L = out[0], R = out[1], flashes = [], k = 4, gaps = [], sum = 0, i;
    for (i = 0; i < k; i++) { gaps.push(12 + r() * 12); sum += gaps[i]; }
    var t = 2 + r() * 3;
    for (i = 0; i < k; i++) {
      var d = r(), ft = t, ts = t + 0.4 + d * 2.5, dur = 5 + 4 * r() + (1 - d) * 1.5, pan = (r() * 2 - 1) * 0.7, nb = 3 + Math.floor(r() * 3), bumps = [];
      for (j = 0; j < nb; j++) bumps.push({ c: j === 0 ? 0.15 + d * 0.4 : 0.3 + r() * 0.6 * dur, w: 0.25 + r() * 0.7, h: j === 0 ? 1 : 0.35 + r() * 0.6 });
      var atk = 0.03 + d * 0.5, hi = 1400 - 800 * d, amp = 0.6 - 0.25 * d, pg = panG(pan);
      for (c = 0; c < 2; c++) {
        var rn = rng(5100 + i * 7 + c), n = Math.floor(dur * SR), b = new Float32Array(n), s = 0;
        for (j = 0; j < n; j++) { s = (s + 0.02 * (rn() * 2 - 1)) / 1.02; b[j] = s * 3.5; }
        b = bqLin(b, LP, function (u) { return hi * Math.pow(110 / hi, Math.min(1, u * 1.3)); }, 0.7);
        env(b, function (u, tt) {
          var e = 0; for (var q = 0; q < bumps.length; q++) { var z = (tt - bumps[q].c) / bumps[q].w; e += bumps[q].h * Math.exp(-z * z); }
          return Math.min(1, tt / atk) * e * Math.exp(-tt / (dur * 0.45)) * Math.min(1, (1 - u) * 6);
        });
        putCh(c ? R : L, S(ts), b, amp * pg[c]);
      }
      if (d < 0.35) {
        var cr = bqLin(noiseBurst(r, 0.3), HP, 1200, 0.7);
        env(cr, function (u) { return Math.exp(-u * 8); });
        put(L, R, S(ts - 0.05), cr, pan, 0.1);
      }
      flashes.push({ t: ft % LOOP, s: 1 - d * 0.6 });
      t += gaps[i] * LOOP / sum;
    }
    return { L: L, R: R, flashes: flashes };
  }

  function crickets() {
    var r = rng(61), L = scale(bq(pink(rng(610)), LP, 1500, 0.7), 0.25), R = scale(bq(pink(rng(611)), LP, 1500, 0.7), 0.25), c, i;
    for (c = 0; c < 6; c++) {
      var fc = 3700 + r() * 1300, np = 3 + (r() < 0.5 ? 0 : 1), P = 0.42 + r() * 0.45, A = 0.05 + 0.12 * r() * r(), pan = r() * 2 - 1;
      var pd = 0.016 + r() * 0.006, gap = pd * 0.9;
      var pulse = tone(pd, (function (fc) { return function (u) { return fc * (1 - 0.04 * u); }; })(fc), function (u) { var s = Math.sin(Math.PI * u); return s * s; }, 0.12);
      var t = r() * LOOP, end = t + LOOP, singing = true, segEnd = t + 6 + r() * 20;
      while (t < end) {
        if (t > segEnd) { singing = !singing; segEnd = t + (singing ? 6 + r() * 20 : 1.5 + r() * 6); }
        if (singing) { var a = A * (0.85 + 0.3 * r()); for (var p = 0; p < np; p++) put(L, R, S(t + p * (pd + gap)), pulse, pan, a * (p === 0 ? 0.75 : 1)); }
        t += P * (0.97 + 0.06 * r());
      }
    }
    for (c = 0; c < 2; c++) {
      var f = Math.round((2700 + r() * 500) * LOOP) / LOOP, am = Math.round((45 + r() * 15) * LOOP) / LOOP, w = walk(r, 0.08, 0, 1), pg = panG(c ? 0.6 : -0.5);
      for (i = 0; i < N; i++) {
        var tt = i / SR, g = Math.max(0, w[i >> 5] * 1.5 - 0.5);
        if (g <= 0) continue;
        var m = 0.5 - 0.5 * Math.cos(TAU * am * tt), v = Math.sin(TAU * f * tt) * m * m * g * 0.03;
        L[i] += v * pg[0]; R[i] += v * pg[1];
      }
    }
    echo(L, R, 0.09, 0.13, 0.2, 0.18, 3000);
    return { L: L, R: R };
  }

  function fireplace() {
    var r = rng(71), out = [], c;
    for (c = 0; c < 2; c++) {
      var rr = rng(710 + c), x = scale(mulCtl(bq(brown(rr), LP, 300, 0.6), walk(rr, 1.5, 0.55, 1.1)), 0.45);
      add(x, mulCtl(bq(pink(rr), BP, 500, 0.6), walk(rr, 2, 0.2, 1)), 0.6);
      add(x, mulCtl(bq(white(rr), HP, 3000, 0.7), walk(rr, 3, 0.1, 1)), 0.03);
      out.push(x);
    }
    var L = out[0], R = out[1], t = 0, j;
    while (t < LOOP) {
      t += expo(r, 1 / 2.6);
      var nc = 1 + Math.floor(r() * r() * 7), tc = t, pan = (r() * 2 - 1) * 0.45;
      for (var q = 0; q < nc; q++) {
        var tau = 0.0003 + r() * r() * 0.0025, n = Math.ceil(tau * 6 * SR) + 2, sig = new Float32Array(n), prev = 0;
        for (j = 0; j < n; j++) { var v = (r() * 2 - 1) * Math.exp(-j / (tau * SR)); sig[j] = v - prev; prev = v; }
        put(L, R, S(tc), sig, pan + (r() - 0.5) * 0.1, 0.05 + 0.4 * Math.pow(r(), 3));
        tc += 0.004 + r() * 0.05;
      }
    }
    for (t = r() * 4; t < LOOP; t += expo(r, 4)) {
      var f = 180 + r() * 270, pop = tone(0.06, function () { return f; }, function (u) { return Math.exp(-u * 6); });
      var nz = env(noiseBurst(r, 0.02), function (u) { return Math.exp(-u * 7); });
      for (j = 0; j < nz.length; j++) pop[j] += nz[j] * 0.6;
      put(L, R, S(t), pop, (r() * 2 - 1) * 0.4, 0.15 + 0.15 * r());
    }
    for (t = r() * 10; t < LOOP; t += expo(r, 12)) {
      var sz = bqLin(noiseBurst(r, 0.5 + r()), HP, 4000, 0.7);
      env(sz, function (u) { return Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(u * 40)); });
      put(L, R, S(t), sz, (r() * 2 - 1) * 0.3, 0.025);
    }
    return { L: L, R: R };
  }

  function birds() {
    var r = rng(81), out = [], c;
    for (c = 0; c < 2; c++) {
      var rr = rng(810 + c), x = scale(mulCtl(bq(pink(rr), LP, 600, 0.7), walk(rr, 0.3, 0.3, 1)), 0.8);
      add(x, bq(pink(rr), HP, 3500, 0.7), 0.04);
      out.push(x);
    }
    var L = out[0], R = out[1];
    function note(nt) {
      return tone(nt.d, function (u) { return (nt.f0 + (nt.f1 - nt.f0) * u) * (1 + nt.vd * Math.sin(TAU * nt.vr * u * nt.d)); },
        function (u) { return Math.pow(Math.sin(Math.PI * u), 0.8); }, nt.h2 || 0, nt.h3 || 0);
    }
    var SP = {
      chirps: function (b) { var n = 3 + Math.floor(r() * 4), o = [], t = 0, g = 0.06 + r() * 0.04;
        for (var i = 0; i < n; i++) { o.push({ t: t, d: 0.06, f0: b * 1.25, f1: b * 0.8, vr: 0, vd: 0, a: 1 - i * 0.08 }); t += 0.06 + g; } return o; },
      whistle: function (b) { var n = 3 + Math.floor(r() * 3), o = [], t = 0;
        for (var i = 0; i < n; i++) { var f = b * pick(r, [1, 1.125, 1.25, 1.5, 1.333, 0.9]), d = 0.12 + r() * 0.18;
          o.push({ t: t, d: d, f0: f, f1: f * (0.92 + r() * 0.2), vr: 22, vd: 0.012, a: 0.8 + r() * 0.2, h2: 0.1 }); t += d + 0.05 + r() * 0.07; } return o; },
      trill: function (b) { var n = 10 + Math.floor(r() * 12), o = [], t = 0;
        for (var i = 0; i < n; i++) { o.push({ t: t, d: 0.028, f0: b * 1.05, f1: b * 0.92, vr: 0, vd: 0, a: 0.5 + 0.5 * Math.sin(Math.PI * (i + 1) / (n + 1)) }); t += 0.046; } return o; },
      warble: function (b) { var n = 8 + Math.floor(r() * 7), o = [], t = 0;
        for (var i = 0; i < n; i++) { var f = b * (0.8 + r() * 0.7), d = 0.05 + r() * 0.06;
          o.push({ t: t, d: d, f0: f, f1: f * (0.85 + r() * 0.35), vr: 50, vd: 0.04, a: 0.6 + r() * 0.4 }); t += d + r() * 0.02; } return o; },
      dove: function (b) { var ds = [0.25, 0.25, 0.45, 0.25, 0.3], o = [], t = 0;
        for (var i = 0; i < 5; i++) { o.push({ t: t, d: ds[i], f0: b * (i === 2 ? 1.1 : 1.02), f1: b * 0.92, vr: 0, vd: 0, a: i === 2 ? 1 : 0.75, h2: 0.25, h3: 0.08 }); t += ds[i] + 0.12; } return o; }
    };
    var flock = [["chirps", 3200, 4200, 6], ["whistle", 1800, 2600, 9], ["trill", 4500, 6000, 11], ["warble", 2600, 3800, 7],
      ["dove", 480, 560, 14], ["chirps", 3600, 4600, 8], ["whistle", 2100, 2900, 12]];
    flock.forEach(function (sp) {
      var base = sp[1] + r() * (sp[2] - sp[1]), song = SP[sp[0]](base), pan = r() * 2 - 1, dist = 0.3 + 0.7 * r();
      var amp = (sp[0] === "dove" ? 0.35 : 0.22) * dist, songDur = song[song.length - 1].t + song[song.length - 1].d;
      var t = r() * LOOP, end = t + LOOP;
      while (t < end) {
        var pv = 0.98 + r() * 0.04, keep = song.length - (r() < 0.3 && song.length > 3 ? 1 : 0);
        for (var i = 0; i < keep; i++) {
          var nt = song[i], s = note({ d: nt.d, f0: nt.f0 * pv, f1: nt.f1 * pv, vr: nt.vr, vd: nt.vd, h2: nt.h2, h3: nt.h3 });
          put(L, R, S(t + nt.t), s, pan, amp * nt.a);
        }
        t += songDur + sp[3] * (0.5 + r());
      }
    });
    echo(L, R, 0.11, 0.17, 0.25, 0.22, 4000);
    return { L: L, R: R };
  }

  function dinosaurs() {
    var r = rng(91), out = [], c;
    for (c = 0; c < 2; c++) {
      var rr = rng(910 + c), x = scale(mulCtl(bq(brown(rr), LP, 250, 0.7), walk(rr, 0.2, 0.4, 1)), 0.5);
      add(x, mulCtl(bq(pink(rr), LP, 900, 0.7), walk(rr, 0.3, 0.2, 1)), 0.3);
      out.push(x);
    }
    var L = out[0], R = out[1];
    function slowNoise(n, hz) { var o = new Float32Array(n), z = 0, k = 1 - Math.exp(-TAU * hz / SR), m = 0, j;
      for (j = 0; j < n; j++) { z += k * ((r() * 2 - 1) - z); o[j] = z; if (Math.abs(z) > m) m = Math.abs(z); }
      for (j = 0; j < n; j++) o[j] /= m || 1; return o; }
    function roar(dur, fb) {
      var n = Math.floor(dur * SR), o = new Float32Array(n), g = slowNoise(n, 30), ph = 0;
      for (var j = 0; j < n; j++) {
        var u = j / n, f = fb * (0.8 + 0.6 * Math.sin(Math.PI * Math.min(1, u * 1.4)) * (1 - 0.3 * u)) * (1 + 0.03 * g[j]);
        ph += TAU * f / SR; var v = 0;
        for (var h = 1; h <= 10; h++) v += Math.sin(h * ph) / h;
        o[j] = v * Math.pow(Math.sin(Math.PI * u), 0.5) * Math.min(1, u * 12) * (1 + 0.45 * g[j]);
      }
      var bp = bqLin(o, BP, 450, 1.2), lp = bqLin(o, LP, 900, 0.7);
      for (j = 0; j < n; j++) o[j] = 0.9 * bp[j] + 0.35 * lp[j];
      return o;
    }
    function honk(dur, fb) {
      var hs = [1, 0.6, 0.45, 0.25, 0.15, 0.08];
      var o = tone(dur, function (u) { return fb * (1 + 0.15 * Math.sin(Math.PI * u)) * (1 + 0.01 * Math.sin(TAU * 5 * u * dur)); },
        function (u) { return Math.min(1, u / 0.15) * Math.min(1, (1 - u) / 0.3); });
      // add upper harmonics by phase-multiplying: cheap approach, render each harmonic as its own tone
      for (var h = 2; h <= hs.length; h++) {
        var t2 = tone(dur, (function (h) { return function (u) { return h * fb * (1 + 0.15 * Math.sin(Math.PI * u)) * (1 + 0.01 * Math.sin(TAU * 5 * u * dur)); }; })(h),
          function (u) { return Math.min(1, u / 0.15) * Math.min(1, (1 - u) / 0.3); });
        for (var j = 0; j < o.length; j++) o[j] += t2[j] * hs[h - 1];
      }
      var bp = bqLin(o, BP, 600, 0.8);
      for (j = 0; j < o.length; j++) o[j] = 0.5 * o[j] + 0.7 * bp[j];
      return o;
    }
    var t = 2 + r() * 3, end = LOOP + 2;
    while (t < end) {
      var kind = r(), pan = (r() * 2 - 1) * 0.8;
      if (kind < 0.35) put(L, R, S(t), roar(1.2 + r(), 90 + r() * 50), pan, 0.18);
      else if (kind < 0.65) {
        var fb = 150 + r() * 60, hd = 1.2 + r() * 0.8;
        put(L, R, S(t), honk(hd, fb), pan, 0.12);
        if (r() < 0.6) put(L, R, S(t + hd + 0.6 + r()), honk(hd * 0.9, fb * 1.12), -pan, 0.08);
      } else if (kind < 0.8) {
        var steps = 4 + Math.floor(r() * 3);
        for (var q = 0; q < steps; q++) {
          var st = tone(0.4, function (u) { return 48 - 16 * u; }, function (u) { return Math.exp(-u * 6); });
          put(L, R, S(t + q * 0.75), st, pan, 0.3 * (0.6 + 0.4 * q / steps));
        }
      } else {
        var nb = 3 + Math.floor(r() * 3), bf = 700 + r() * 300;
        for (q = 0; q < nb; q++) {
          var ch = tone(0.12, (function (f0) { return function (u) { return f0 * (1 + 0.4 * Math.sin(Math.PI * u)); }; })(bf * (0.9 + r() * 0.25)),
            function (u) { return Math.sin(Math.PI * u); }, 0.4, 0.2);
          put(L, R, S(t + q * 0.2), ch, pan, 0.08);
        }
      }
      t += 6 + r() * 7;
    }
    echo(L, R, 0.33, 0.47, 0.3, 0.3, 1500);
    return { L: L, R: R };
  }

  function aliens() {
    var r = rng(101), L = new Float32Array(N), R = new Float32Array(N), TS = 4096, SIN = new Float32Array(TS + 1), i, j;
    for (i = 0; i <= TS; i++) SIN[i] = Math.sin(TAU * i / TS);
    function q(f) { return Math.round(f * LOOP) / LOOP; }
    var notes = [110, 164.81, 246.94, 329.63];
    notes.forEach(function (nf, ni) {
      var w = walk(r, 0.12, 0.15, 1);
      for (var c = 0; c < 2; c++) {
        var f = q(nf) + (c ? 0.25 : -0.25) * (ni + 1) / 2, vr = q(0.15 + r() * 0.2), vd = 0.004 + r() * 0.004, ph = r(), D = c ? R : L;
        f = q(f);
        for (var i = 0; i < N; i++) {
          var tt = i / SR, inst = f * (1 + vd * Math.cos(TAU * vr * tt));
          ph += inst / SR; ph -= Math.floor(ph);
          var x = ph * TS, k = x | 0, s = SIN[k] + (SIN[k + 1] - SIN[k]) * (x - k);
          var p2 = ph * 2; p2 -= Math.floor(p2); var x2 = p2 * TS, k2 = x2 | 0, s2 = SIN[k2] + (SIN[k2 + 1] - SIN[k2]) * (x2 - k2);
          D[i] += (s + 0.3 * s2) * w[i >> 5] * 0.12;
        }
      }
    });
    L = bq(L, LP, walk(r, 0.15, 300, 1300), 2.2); R = bq(R, LP, walk(r, 0.15, 300, 1300), 2.2);
    var scaleR = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2], t = r() * 2;
    while (t < LOOP) {
      var kind = r(), pan = (r() * 2 - 1) * 0.8;
      if (kind < 0.4) {
        var n = 3 + Math.floor(r() * 6), tt2 = t, base = pick(r, [392, 440, 523.25, 587.33]);
        for (i = 0; i < n; i++) {
          var f = base * pick(r, scaleR), d = 0.07 + r() * 0.05;
          var s = tone(d, (function (f) { return function (u) { return f * (1 + 0.03 * u); }; })(f), function (u) { return Math.min(1, u * 20) * Math.pow(1 - u, 1.5); }, 0, 0.25);
          put(L, R, S(tt2), s, pan + (r() - 0.5) * 0.4, 0.22); tt2 += d + 0.04;
        }
      } else if (kind < 0.7) {
        var f0 = 600 + r() * 500, f1 = f0 * (0.6 + r()), dd = 1.5 + r() * 1.5, vr2 = 6 + r() * 2, vd2 = 0.04 + r() * 0.02;
        var th = tone(dd, function (u) { return (f0 + (f1 - f0) * (1 - Math.cos(Math.PI * u)) / 2) * (1 + vd2 * Math.sin(TAU * vr2 * u * dd)); },
          function (u) { return Math.pow(Math.sin(Math.PI * u), 0.7); }, 0.15);
        put(L, R, S(t), th, pan, 0.2);
      } else if (kind < 0.9) {
        var cf = 200 + r() * 300, mr = 1.5 + r() * 1.5, dur = 0.35, nn = Math.floor(dur * SR), o = new Float32Array(nn), pc = 0, pm = 0;
        for (j = 0; j < nn; j++) { var u = j / nn; pm += TAU * cf * mr / SR; pc += TAU * cf * (1 + 0.5 * u) / SR; o[j] = Math.sin(pc + 4 * (1 - u) * Math.sin(pm)) * Math.sin(Math.PI * u); }
        put(L, R, S(t), o, pan, 0.22);
      } else {
        var z = tone(0.3, function (u) { return 2400 * Math.pow(280 / 2400, u); }, function (u) { return Math.exp(-u * 3) * Math.min(1, u * 30); }, 0.2);
        put(L, R, S(t), z, pan, 0.1);
      }
      t += 2.5 + r() * 3.5;
    }
    echo(L, R, 0.28, 0.41, 0.45, 0.35, 3500);
    return { L: L, R: R };
  }

  var DEFS = {
    ocean: [ocean, 1], river: [river, 0.9], waterfall: [waterfall, 0.85], rain: [rain, 0.9], thunder: [thunder, 1],
    crickets: [crickets, 0.6], fireplace: [fireplace, 0.95], birds: [birds, 0.7], dinosaurs: [dinosaurs, 0.85], aliens: [aliens, 0.75]
  };

  // Loudness-match: scale so the 90th percentile of 0.5 s RMS hits a common target, then a soft limiter.
  function finish(res, factor) {
    var L = bq(res.L, HP, 25, 0.7), R = bq(res.R, HP, 25, 0.7), w = SR / 2, rms = [], i, j;
    for (i = 0; i + w <= N; i += w) { var s = 0; for (j = i; j < i + w; j++) s += L[j] * L[j] + R[j] * R[j]; rms.push(Math.sqrt(s / (2 * w))); }
    rms.sort(function (a, b) { return a - b; });
    var p90 = rms[Math.floor(rms.length * 0.9)] || 1e-6, g = 0.12 * factor / p90, oL = new Int16Array(N), oR = new Int16Array(N);
    function lim(x) { var a = Math.abs(x); if (a > 0.7) a = 0.7 + 0.3 * Math.tanh((a - 0.7) / 0.3); return (x < 0 ? -a : a) * 32767; }
    for (i = 0; i < N; i++) { oL[i] = lim(L[i] * g); oR[i] = lim(R[i] * g); }
    return { L: oL, R: oR, flashes: res.flashes || [] };
  }
  function render(id) { var d = DEFS[id]; if (!d) throw new Error("unknown sound " + id); return finish(d[0](), d[1]); }

  var API = { SR: SR, LOOP: LOOP, N: N, ids: Object.keys(DEFS), render: render };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  else if (typeof window !== "undefined") window.RGSynth = API;
  else if (typeof self !== "undefined") {
    self.onmessage = function (e) {
      var id = e.data && e.data.id;
      try { var o = render(id); self.postMessage({ id: id, L: o.L, R: o.R, flashes: o.flashes }, [o.L.buffer, o.R.buffer]); }
      catch (err) { self.postMessage({ id: id, error: String(err && err.message || err) }); }
    };
  }
})();
