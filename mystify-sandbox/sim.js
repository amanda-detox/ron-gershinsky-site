/* Mystify sandbox combat rules. No DOM. Version A.
   Colors passed through MAPS are the site palette (navy, gold, blue, and the
   landing-page background presets). Rendering lives in game.js. */
(function (root) {
  "use strict";
  var W = 24, H = 16;
  var PAL = {
    navy: "#0a1238", navyDeep: "#050a24", navyInk: "#0b1f4d", navyBtn: "#0b2a6b",
    ink: "#eaf0ff", ink2: "#eef2ff", white: "#fff7d6", paper: "#f8fafc",
    muted: "#b9c8f5", blue: "#2c5cff", blue2: "#3b82f6", blue3: "#1d4fb8", blue4: "#143a8c",
    blueSoft: "#7fb6ff", blueMist: "#9fb4ff",
    gold: "#f3cf6b", gold2: "#ffe7a3", gold3: "#e3bd5b", gold4: "#d4af37", gold5: "#c9a227",
    cream: "#fff6dc", violet: "#8b5cf6",
    bgTeal: "#0b4d43", bgGreen: "#355e3b", bgWarm: "#3a1a0a", bgPlum: "#1a0c26",
    bgViolet: "#6d1a7e", bgNight: "#0a0610", bgSoil: "#14110a",
    bgSlate: "#0f172a", bgSlate2: "#1e293b", bgSlate3: "#334155",
    sand: "#fbf3e2", sand2: "#fff1d8", mist: "#e3eeff", sky: "#e5f4ff"
  };

  /* Future maps: push another object here. No price, no lock. */
  var MAPS = [
    { id: "dungeon", tier: "full", floor: PAL.bgSoil, floor2: PAL.bgWarm, accent: PAL.gold, mist: PAL.gold2,
      obstacles: [
        { x: 5, y: 4, r: 0.95, prop: "pillar" }, { x: 12, y: 3.6, r: 1.05, prop: "pillar" },
        { x: 19, y: 4.2, r: 0.95, prop: "pillar" }, { x: 6.5, y: 8.2, r: 0.9, prop: "pillar" },
        { x: 17.5, y: 8, r: 0.9, prop: "pillar" }, { x: 8, y: 11.5, r: 0.72, prop: "pillar" },
        { x: 16, y: 11.6, r: 0.72, prop: "pillar" }
      ] },
    { id: "island", tier: "full", floor: PAL.navy, floor2: PAL.bgTeal, accent: PAL.gold4, mist: PAL.sand2,
      obstacles: [
        { x: 4.2, y: 4, r: 1.5, prop: "rock" }, { x: 12, y: 5.2, r: 1.65, prop: "rock" },
        { x: 20, y: 4.4, r: 1.35, prop: "rock" }, { x: 5, y: 9.4, r: 1.1, prop: "rock" },
        { x: 19.2, y: 10, r: 1.2, prop: "rock" }
      ] },
    { id: "forest", tier: "full", floor: PAL.bgTeal, floor2: PAL.bgGreen, accent: PAL.blueSoft, mist: PAL.gold3,
      obstacles: [
        { x: 4, y: 3.5, r: 0.7, prop: "tree" }, { x: 7.5, y: 5, r: 0.75, prop: "tree" },
        { x: 12, y: 3.2, r: 0.8, prop: "tree" }, { x: 16.5, y: 4.6, r: 0.7, prop: "tree" },
        { x: 20.5, y: 3.4, r: 0.7, prop: "tree" }, { x: 5.5, y: 8.5, r: 0.75, prop: "tree" },
        { x: 10, y: 7.6, r: 0.65, prop: "tree" }, { x: 15, y: 8.2, r: 0.7, prop: "tree" },
        { x: 19.5, y: 8.8, r: 0.75, prop: "tree" }, { x: 8, y: 11.2, r: 0.58, prop: "tree" },
        { x: 16.5, y: 11.4, r: 0.58, prop: "tree" }
      ] },
    { id: "arena", tier: "full", floor: PAL.navy, floor2: PAL.blue4, accent: PAL.gold, mist: PAL.gold2,
      obstacles: [
        { x: 8, y: 6, r: 0.62, prop: "pillar" }, { x: 16, y: 6, r: 0.62, prop: "pillar" },
        { x: 8, y: 10.5, r: 0.62, prop: "pillar" }, { x: 16, y: 10.5, r: 0.62, prop: "pillar" }
      ] },
    { id: "area51", tier: "light", floor: PAL.bgSlate, floor2: PAL.bgSlate3, accent: PAL.blue2, mist: PAL.gold3,
      obstacles: [
        { x: 6, y: 5, r: 0.85, prop: "crate" }, { x: 9.2, y: 5, r: 0.85, prop: "crate" },
        { x: 15, y: 6.5, r: 0.85, prop: "crate" }, { x: 18.2, y: 6.5, r: 0.85, prop: "crate" },
        { x: 12, y: 9, r: 0.9, prop: "crate" }
      ] },
    { id: "atlantis", tier: "light", floor: PAL.navyDeep, floor2: PAL.bgPlum, accent: PAL.blueSoft, mist: PAL.gold4,
      obstacles: [
        { x: 6, y: 4.5, r: 0.8, prop: "column" }, { x: 12, y: 4, r: 0.85, prop: "column" },
        { x: 18, y: 4.6, r: 0.8, prop: "column" }, { x: 7, y: 9.5, r: 0.75, prop: "column" },
        { x: 17, y: 9.6, r: 0.75, prop: "column" }
      ] }
  ];

  var CLASSES = [
    { id: "sorcerer", skills: ["bolt", "nova", "meteor", "blink"] },
    { id: "elemental", skills: ["lightning", "hail", "sand", "fire"] },
    { id: "air", skills: ["blade", "gust", "lift", "spin"] },
    { id: "guardian", skills: ["vine", "mist", "friends", "hide"] },
    { id: "summoner", skills: ["spark", "call", "pulse", "big"] }
  ];

  var SKILL_CD = {
    bolt: 0.4, nova: 6.4, meteor: 7.6, blink: 5.8,
    lightning: 0.5, hail: 6.6, sand: 5.2, fire: 7.2,
    blade: 0.34, gust: 5.4, lift: 6.8, spin: 8.4,
    vine: 0.48, mist: 8, friends: 7.5, hide: 9.2,
    spark: 0.4, call: 3.4, pulse: 6, big: 11
  };

  var KIND = {
    blob: { hp: 34, speed: 1.62, touch: 8, r: 0.46 },
    hopper: { hp: 28, speed: 1.85, touch: 8, r: 0.42 },
    puff: { hp: 26, speed: 1.32, touch: 6, r: 0.44 },
    elite: { hp: 76, speed: 1.5, touch: 11, r: 0.58 },
    boss: { hp: 230, speed: 1.15, touch: 14, r: 0.95 }
  };

  function mulberry32(a) {
    a >>>= 0;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hypot(x, y) { return Math.sqrt(x * x + y * y); }
  function angleDiff(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function blocked(state, x, y, r) {
    if (x < r || y < r || x > W - r || y > H - r) return true;
    var obs = state.obstacles;
    for (var i = 0; i < obs.length; i++) {
      var o = obs[i];
      if (hypot(x - o.x, y - o.y) < r + o.r - 0.02) return true;
    }
    return false;
  }
  function moveBody(state, x, y, r, dx, dy) {
    var nx = x + dx;
    if (blocked(state, nx, y, r)) nx = x;
    var ny = y + dy;
    if (blocked(state, nx, ny, r)) ny = y;
    return { x: nx, y: ny };
  }
  function pushFloat(state, x, y, text) {
    if (state.floats.length > 28) state.floats.shift();
    state.floats.push({ x: x, y: y, text: text, life: 0.7, max: 0.7 });
  }
  function burst(state, x, y, n, kind) {
    for (var i = 0; i < n; i++) {
      if (state.particles.length > 96) state.particles.shift();
      var a = state.rng() * Math.PI * 2;
      var s = 0.5 + state.rng() * 2.4;
      var life = 0.35 + state.rng() * 0.4;
      state.particles.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life, max: life, kind: kind || "spark" });
    }
  }
  function ring(state, x, y, r, kind) {
    state.rings.push({ x: x, y: y, r: r, life: 0.38, max: 0.38, kind: kind || "gold" });
  }
  function nearest(list, x, y, maxDist, skipId) {
    var best = null, bestD = maxDist == null ? 1e9 : maxDist;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (!e || e.hp <= 0 || e.id === skipId) continue;
      var d = hypot(e.x - x, e.y - y);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }
  function hurtEnemy(state, e, dmg, fromPlayer) {
    if (!e || e.hp <= 0 || dmg <= 0) return;
    if (e.shield > 0) {
      e.shield = 0;
      e.hurt = 0.12;
      pushFloat(state, e.x, e.y - e.r, "0");
      ring(state, e.x, e.y, e.r + 0.3, "gold");
      return;
    }
    if (fromPlayer && state.player.bonusHit) {
      dmg *= 1.65;
      state.player.bonusHit = false;
      state.player.camouflage = 0;
    }
    e.hp -= dmg;
    e.hurt = 0.14;
    pushFloat(state, e.x, e.y - e.r, String(Math.round(dmg)));
  }
  function hurtPlayer(state, dmg) {
    var p = state.player;
    if (p.iframe > 0 || p.camouflage > 0 || p.hp <= 0 || dmg <= 0) return;
    p.hp -= dmg;
    p.hurt = 0.3;
    p.iframe = 0.34;
    state.shake = Math.min(7, (state.shake || 0) + 3.2);
    pushFloat(state, p.x, p.y - 0.6, String(Math.round(dmg)));
  }
  function damageCircle(state, x, y, r, dmg, slow) {
    var list = state.enemies;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e.hp <= 0) continue;
      if (hypot(e.x - x, e.y - y) <= r + e.r * 0.6) {
        hurtEnemy(state, e, dmg, true);
        if (slow) e.slow = Math.max(e.slow, slow);
      }
    }
  }
  function damageCone(state, range, arc, dmg, knock, root) {
    var p = state.player, f = p.facing;
    for (var i = 0; i < state.enemies.length; i++) {
      var e = state.enemies[i];
      if (e.hp <= 0) continue;
      var dx = e.x - p.x, dy = e.y - p.y;
      var d = hypot(dx, dy);
      if (d > range + e.r) continue;
      if (Math.abs(angleDiff(Math.atan2(dy, dx), f)) > arc) continue;
      hurtEnemy(state, e, dmg, true);
      if (root) e.root = Math.max(e.root, root);
      if (knock && d > 0.001) {
        var nx = dx / d, ny = dy / d;
        var moved = moveBody(state, e.x, e.y, e.r, nx * knock, ny * knock);
        e.x = moved.x; e.y = moved.y;
      }
    }
  }
  function shot(state, s) {
    s.hit = {};
    s.pierce = s.pierce || 1;
    s.team = s.team || "friend";
    state.shots.push(s);
  }
  function aimPoint(state, dist) {
    var p = state.player;
    var t = nearest(state.enemies, p.x, p.y, 9);
    if (t) return { x: t.x, y: t.y };
    return { x: p.x + Math.cos(p.facing) * dist, y: p.y + Math.sin(p.facing) * dist };
  }
  function spawnAlly(state, kind) {
    var p = state.player;
    var ang = p.facing + (state.allies.length % 2 ? 0.8 : -0.8);
    var hp = kind === "big" ? 90 : kind === "critter" ? 30 : 38;
    var ally = {
      id: state.nextId++, kind: kind,
      x: p.x + Math.cos(ang) * 0.75, y: p.y + Math.sin(ang) * 0.75,
      r: kind === "big" ? 0.56 : 0.36,
      hp: hp, maxHp: hp,
      speed: kind === "big" ? 2.05 : 2.6,
      dmg: kind === "big" ? 12 : kind === "critter" ? 6 : 8,
      touch: 0, hurt: 0,
      life: kind === "big" ? 16 : kind === "critter" ? 14 : 20
    };
    var guard = 0;
    while (blocked(state, ally.x, ally.y, ally.r) && guard++ < 8) {
      ally.x = p.x + (state.rng() - 0.5) * 1.6;
      ally.y = p.y + (state.rng() - 0.5) * 1.6;
    }
    state.allies.push(ally);
    burst(state, ally.x, ally.y, 6, "soft");
    return ally;
  }
  function countKind(state, kind) {
    var n = 0;
    for (var i = 0; i < state.allies.length; i++) if (state.allies[i].hp > 0 && state.allies[i].kind === kind) n++;
    return n;
  }
  function refreshKind(state, kind) {
    for (var i = 0; i < state.allies.length; i++) {
      var a = state.allies[i];
      if (a.kind === kind && a.hp > 0) a.life = Math.max(a.life, kind === "big" ? 16 : 14);
    }
  }

  function cast(state, index) {
    var cls = state.classId;
    var id = state.skills[index];
    var p = state.player;
    var f = p.facing;
    var cd = SKILL_CD[id] || 1;
    if (id === "bolt" || id === "blade" || id === "spark") {
      var fast = id === "blade";
      shot(state, {
        x: p.x + Math.cos(f) * 0.55, y: p.y + Math.sin(f) * 0.55,
        vx: Math.cos(f) * (fast ? 13 : 10.2), vy: Math.sin(f) * (fast ? 13 : 10.2),
        r: 0.2, dmg: id === "spark" ? 11 : fast ? 13 : 16,
        life: fast ? 0.55 : 0.9, pierce: fast ? 2 : 1,
        homing: id === "bolt" ? 2.4 : 0, kind: id
      });
      return cd;
    }
    if (id === "nova") {
      damageCircle(state, p.x, p.y, 2.4, 26, 2.1);
      ring(state, p.x, p.y, 2.4, "frost");
      return cd;
    }
    if (id === "meteor") {
      var m = aimPoint(state, 3.6);
      state.zones.push({ kind: "meteor", x: m.x, y: m.y, r: 2.15, delay: 0.7, life: 1.15, dmg: 48, every: 9, tick: 9, slow: 0.4, boom: 0 });
      return cd;
    }
    if (id === "blink") {
      dash(state, 3.35);
      p.iframe = Math.max(p.iframe, 0.28);
      ring(state, p.x, p.y, 0.7, "gold");
      return cd;
    }
    if (id === "lightning") {
      var t = nearest(state.enemies, p.x, p.y, 6.7);
      if (!t) {
        state.bolts.push({ x1: p.x, y1: p.y, x2: p.x + Math.cos(f) * 1.4, y2: p.y + Math.sin(f) * 1.4, life: 0.12 });
        return 0.16;
      }
      hurtEnemy(state, t, 20, true);
      state.bolts.push({ x1: p.x, y1: p.y, x2: t.x, y2: t.y, life: 0.16 });
      var t2 = nearest(state.enemies, t.x, t.y, 2.6, t.id);
      if (t2) {
        hurtEnemy(state, t2, 12, true);
        state.bolts.push({ x1: t.x, y1: t.y, x2: t2.x, y2: t2.y, life: 0.16 });
      }
      return cd;
    }
    if (id === "hail") {
      var h = aimPoint(state, 3.2);
      state.zones.push({ kind: "hail", x: h.x, y: h.y, r: 2.45, delay: 0, life: 2.3, dmg: 7, every: 0.32, tick: 0.05, slow: 0.45, boom: 0 });
      return cd;
    }
    if (id === "sand") {
      damageCone(state, 3.35, 0.72, 16, 1.7, 0);
      ring(state, p.x + Math.cos(f) * 1.4, p.y + Math.sin(f) * 1.4, 1.3, "sand");
      return cd;
    }
    if (id === "fire") {
      if (p.channel > 0) return 0;
      p.channel = 1.35;
      p.fireAcc = 0;
      return 0;
    }
    if (id === "gust") {
      for (var i = 0; i < state.enemies.length; i++) {
        var e = state.enemies[i];
        if (e.hp <= 0) continue;
        var dx = e.x - p.x, dy = e.y - p.y, d = hypot(dx, dy);
        if (d > 3.35 + e.r || d < 0.001) continue;
        hurtEnemy(state, e, 12, true);
        var moved = moveBody(state, e.x, e.y, e.r, dx / d * 2.15, dy / d * 2.15);
        e.x = moved.x; e.y = moved.y;
      }
      ring(state, p.x, p.y, 3.2, "air");
      return cd;
    }
    if (id === "lift") {
      p.haste = 2.25;
      p.iframe = Math.max(p.iframe, 0.42);
      dash(state, 1.65);
      ring(state, p.x, p.y, 1.1, "air");
      return cd;
    }
    if (id === "spin") {
      state.zones.push({ kind: "spin", x: p.x, y: p.y, r: 1.5, delay: 0, life: 4, dmg: 7, every: 0.25, tick: 0.05, slow: 0, follow: 1, boom: 0 });
      return cd;
    }
    if (id === "vine") {
      damageCone(state, 1.85, 0.95, 17, 0.2, 1.15);
      ring(state, p.x + Math.cos(f) * 0.8, p.y + Math.sin(f) * 0.8, 1.1, "vine");
      return cd;
    }
    if (id === "mist") {
      p.hp = Math.min(p.maxHp, p.hp + 16);
      p.mist = 3.4;
      p.healAcc = 0;
      for (var a = 0; a < state.allies.length; a++) {
        state.allies[a].hp = Math.min(state.allies[a].maxHp, state.allies[a].hp + 10);
      }
      ring(state, p.x, p.y, 1.8, "mist");
      return cd;
    }
    if (id === "friends") {
      if (countKind(state, "critter") >= 2) refreshKind(state, "critter");
      else {
        spawnAlly(state, "critter");
        if (countKind(state, "critter") < 2) spawnAlly(state, "critter");
      }
      return cd;
    }
    if (id === "hide") {
      p.camouflage = 3.6;
      p.bonusHit = true;
      ring(state, p.x, p.y, 1.2, "mist");
      return cd;
    }
    if (id === "call") {
      if (countKind(state, "small") >= 3) refreshKind(state, "small");
      else spawnAlly(state, "small");
      return cd;
    }
    if (id === "pulse") {
      var any = false;
      for (var k = 0; k < state.allies.length; k++) {
        var al = state.allies[k];
        if (al.hp <= 0) continue;
        any = true;
        damageCircle(state, al.x, al.y, 1.6, 18, 0);
        ring(state, al.x, al.y, 1.6, "gold");
      }
      if (!any) {
        damageCircle(state, p.x, p.y, 1.5, 12, 0);
        ring(state, p.x, p.y, 1.5, "gold");
      }
      return cd;
    }
    if (id === "big") {
      if (countKind(state, "big") >= 1) refreshKind(state, "big");
      else spawnAlly(state, "big");
      return cd;
    }
    return cd;
  }
  function dash(state, dist) {
    var p = state.player;
    var x = p.x, y = p.y;
    var step = 0.16;
    for (var d = step; d <= dist + 0.001; d += step) {
      var nx = p.x + Math.cos(p.facing) * d;
      var ny = p.y + Math.sin(p.facing) * d;
      if (blocked(state, nx, ny, p.r)) break;
      x = nx; y = ny;
    }
    p.x = x; p.y = y;
  }
  function trySkill(state, index, force) {
    var p = state.player;
    if (!force && p.cds[index] > 0) return;
    if (index === 3 && state.classId === "elemental" && p.channel > 0) return;
    var spent = cast(state, index);
    if (spent > 0) {
      p.cds[index] = spent;
      p.cdMax[index] = spent;
    }
  }

  function roster(state) {
    var light = state.tier === "light";
    if (state.mode === "clear") {
      return light
        ? ["blob", "blob", "hopper", "puff", "elite"]
        : ["blob", "blob", "blob", "hopper", "hopper", "puff", "elite", "elite"];
    }
    if (state.wave === 1) return light ? ["blob", "blob", "hopper"] : ["blob", "blob", "blob", "hopper"];
    if (state.wave === 2) return light ? ["blob", "puff", "elite"] : ["blob", "blob", "hopper", "puff", "elite", "elite"];
    return ["boss"];
  }
  function freeSpot(state, preferTop) {
    var rng = state.rng;
    var p = state.player;
    for (var i = 0; i < 48; i++) {
      var x = 1.6 + rng() * (W - 3.2);
      var y = preferTop ? 1.6 + rng() * 6.2 : 1.6 + rng() * (H - 3.2);
      if (hypot(x - p.x, y - p.y) < 3.6) continue;
      if (blocked(state, x, y, 0.7)) continue;
      var ok = true;
      for (var j = 0; j < state.enemies.length; j++) {
        if (hypot(x - state.enemies[j].x, y - state.enemies[j].y) < 1.35) ok = false;
      }
      if (ok) return { x: x, y: y };
    }
    var pads = [[3, 2.4], [8, 2.2], [12, 2], [16, 2.2], [21, 2.6], [4, 6], [20, 6]];
    for (var k = 0; k < pads.length; k++) {
      if (!blocked(state, pads[k][0], pads[k][1], 0.7)) return { x: pads[k][0], y: pads[k][1] };
    }
    return { x: 3, y: 3 };
  }
  function makeEnemy(state, kind, index) {
    var spec = KIND[kind];
    var spot = freeSpot(state, true);
    var hp = spec.hp * (state.tier === "light" ? 0.85 : 1);
    var elite = kind === "elite";
    var shield = elite && index % 2 === 0 ? 1 : 0;
    return {
      id: state.nextId++, kind: kind, x: spot.x, y: spot.y, r: spec.r,
      hp: hp, maxHp: hp, speed: spec.speed, touchDmg: spec.touch, touch: 0.4 + index * 0.05,
      slow: 0, root: 0, hurt: 0, shield: shield,
      elite: elite, boss: kind === "boss",
      leapT: 0.8 + index * 0.2, lunge: 0, lvx: 0, lvy: 0,
      shotT: 1 + index * 0.15,
      powerCd: 1.2 + index * 0.2, windup: 0, slam: null,
      wander: 0.4, wa: state.rng() * Math.PI * 2
    };
  }
  function spawnWave(state) {
    state.enemies.length = 0;
    var list = roster(state);
    for (var i = 0; i < list.length; i++) state.enemies.push(makeEnemy(state, list[i], i));
    var noteId = "wave";
    if (state.mode === "waves" && state.wave === 2) noteId = "strong";
    if (state.mode === "waves" && state.wave >= 3) noteId = "boss";
    state.note = { id: noteId, n: state.wave, t: 1.5 };
  }
  function onCleared(state) {
    if (state.mode === "clear" || (state.mode === "waves" && state.wave >= 3)) {
      state.phase = "win";
      state.note = { id: "win", t: 2 };
      return;
    }
    state.wave += 1;
    state.phase = "wavewait";
    state.phaseT = 1.55;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + 18);
    state.note = { id: state.wave >= 3 ? "boss" : "next", n: state.wave, t: 1.55 };
  }

  function step(state, dt, input) {
    var p = state.player;
    state.time += dt;
    if (input.moveX || input.moveY) p.facing = Math.atan2(input.moveY, input.moveX);
    var spd = 3.55;
    if (p.haste > 0) spd *= 1.62;
    if (p.channel > 0) spd *= 0.68;
    var moved = moveBody(state, p.x, p.y, p.r, input.moveX * spd * dt, input.moveY * spd * dt);
    p.x = moved.x; p.y = moved.y;
    if (!(input.moveX || input.moveY)) {
      var face = nearest(state.enemies, p.x, p.y, 9);
      if (face) p.facing = Math.atan2(face.y - p.y, face.x - p.x);
    }
    for (var c = 0; c < 4; c++) p.cds[c] = Math.max(0, p.cds[c] - dt);
    p.iframe = Math.max(0, p.iframe - dt);
    p.hurt = Math.max(0, p.hurt - dt);
    p.haste = Math.max(0, p.haste - dt);
    p.camouflage = Math.max(0, p.camouflage - dt);
    var wasCh = p.channel > 0;
    if (p.channel > 0) p.channel = Math.max(0, p.channel - dt);
    if (wasCh && p.channel <= 0 && state.classId === "elemental") {
      p.cds[3] = SKILL_CD.fire;
      p.cdMax[3] = SKILL_CD.fire;
      damageCircle(state, p.x + Math.cos(p.facing) * 1.6, p.y + Math.sin(p.facing) * 1.6, 1.7, 22, 0);
      ring(state, p.x + Math.cos(p.facing) * 1.6, p.y + Math.sin(p.facing) * 1.6, 1.7, "fire");
    }
    if (p.channel > 0) {
      p.fireAcc += dt;
      while (p.fireAcc > 0.09) {
        p.fireAcc -= 0.09;
        var ang = p.facing + (state.rng() - 0.5) * 0.55;
        var d = 1.05 + state.rng() * 1.55;
        state.zones.push({
          kind: "fire", x: p.x + Math.cos(ang) * d, y: p.y + Math.sin(ang) * d,
          r: 0.62, delay: 0, life: 0.55, dmg: 6, every: 0.16, tick: 0, slow: 0, boom: 0
        });
      }
    }
    if (p.mist > 0) {
      p.mist -= dt;
      p.healAcc += dt;
      if (p.healAcc >= 0.45) {
        p.healAcc = 0;
        p.hp = Math.min(p.maxHp, p.hp + 4);
        for (var hi = 0; hi < state.allies.length; hi++) {
          var al = state.allies[hi];
          al.hp = Math.min(al.maxHp, al.hp + 3);
        }
      }
    }
    if (state.phase === "play" || state.phase === "wavewait") {
      if (input.pressed[0] || input.held[0]) trySkill(state, 0);
      for (var s = 1; s < 4; s++) if (input.pressed[s]) trySkill(state, s);
    }

    for (var ai = state.allies.length - 1; ai >= 0; ai--) {
      var a = state.allies[ai];
      a.life -= dt;
      a.touch = Math.max(0, a.touch - dt);
      a.hurt = Math.max(0, a.hurt - dt);
      if (a.life <= 0 || a.hp <= 0) {
        burst(state, a.x, a.y, 7, "soft");
        state.allies.splice(ai, 1);
        continue;
      }
      var foe = nearest(state.enemies, a.x, a.y, 30);
      if (foe) {
        var dx = foe.x - a.x, dy = foe.y - a.y, dist = hypot(dx, dy) || 0.001;
        if (dist > a.r + foe.r * 0.8) {
          var am = moveBody(state, a.x, a.y, a.r, dx / dist * a.speed * dt, dy / dist * a.speed * dt);
          a.x = am.x; a.y = am.y;
        } else if (a.touch <= 0 && foe.hp > 0) {
          hurtEnemy(state, foe, a.dmg, false);
          a.touch = 0.55;
        }
      }
    }

    if (state.phase === "wavewait") {
      state.phaseT -= dt;
      if (state.phaseT <= 0) {
        state.phase = "play";
        spawnWave(state);
      }
    } else if (state.phase === "play") {
      for (var ei = 0; ei < state.enemies.length; ei++) {
        var e = state.enemies[ei];
        if (e.hp <= 0) continue;
        e.slow = Math.max(0, e.slow - dt);
        e.root = Math.max(0, e.root - dt);
        e.touch = Math.max(0, e.touch - dt);
        e.hurt = Math.max(0, e.hurt - dt);
        e.shotT = Math.max(0, e.shotT - dt);
        e.powerCd = Math.max(0, e.powerCd - dt);
        e.leapT = Math.max(0, e.leapT - dt);
        var options = [];
        for (var aj = 0; aj < state.allies.length; aj++) if (state.allies[aj].hp > 0) options.push(state.allies[aj]);
        if (p.camouflage <= 0 && p.hp > 0) options.push(p);
        var target = null, td = 1e9;
        for (var oi = 0; oi < options.length; oi++) {
          var dd = hypot(options[oi].x - e.x, options[oi].y - e.y);
          if (dd < td) { td = dd; target = options[oi]; }
        }
        var sp = e.speed * (e.slow > 0 ? 0.45 : 1) * (e.root > 0 ? 0 : 1);
        if (e.lunge > 0) {
          e.lunge -= dt;
          var lm = moveBody(state, e.x, e.y, e.r, e.lvx * dt, e.lvy * dt);
          e.x = lm.x; e.y = lm.y;
        } else if (target && e.kind !== "puff") {
          var mx = target.x - e.x, my = target.y - e.y, md = hypot(mx, my) || 0.001;
          if (md > e.r + (target.r || p.r) * 0.75) {
            var em = moveBody(state, e.x, e.y, e.r, mx / md * sp * dt, my / md * sp * dt);
            e.x = em.x; e.y = em.y;
          }
          if (e.kind === "hopper" && e.leapT <= 0 && md < 7) {
            e.leapT = 1.7;
            e.lunge = 0.22;
            e.lvx = mx / md * 7.1;
            e.lvy = my / md * 7.1;
          }
        } else if (target && e.kind === "puff") {
          var px = target.x - e.x, py = target.y - e.y, pd = hypot(px, py) || 0.001;
          var dir = pd < 3.1 ? -1 : pd > 6.4 ? 1 : 0;
          if (dir && e.root <= 0) {
            var pm = moveBody(state, e.x, e.y, e.r, px / pd * dir * sp * dt, py / pd * dir * sp * dt);
            e.x = pm.x; e.y = pm.y;
          }
          if (e.shotT <= 0 && pd < 8 && pd > 2.2) {
            e.shotT = 1.55;
            shot(state, {
              x: e.x, y: e.y, vx: px / pd * 4.3, vy: py / pd * 4.3,
              r: 0.2, dmg: 9, life: 1.6, pierce: 1, homing: 0, kind: "puff", team: "foe"
            });
          }
        } else {
          e.wander -= dt;
          if (e.wander <= 0) { e.wander = 1.3; e.wa = state.rng() * Math.PI * 2; }
          if (e.root <= 0) {
            var wm = moveBody(state, e.x, e.y, e.r, Math.cos(e.wa) * sp * 0.55 * dt, Math.sin(e.wa) * sp * 0.55 * dt);
            e.x = wm.x; e.y = wm.y;
          }
        }
        if ((e.elite && !e.shield) || e.boss) {
          if (!e.slam && e.powerCd <= 0 && target) {
            e.powerCd = e.boss ? 3.3 : 3.1;
            e.slam = { x: target.x, y: target.y, t: e.boss ? 0.85 : 0.62, r: e.boss ? 2.45 : 1.65, dmg: e.boss ? 20 : 12 };
          }
          if (e.slam) {
            e.slam.t -= dt;
            if (e.slam.t <= 0) {
              var sl = e.slam;
              if (hypot(p.x - sl.x, p.y - sl.y) < sl.r + p.r) hurtPlayer(state, sl.dmg);
              for (var sj = 0; sj < state.allies.length; sj++) {
                var sa = state.allies[sj];
                if (sa.hp > 0 && hypot(sa.x - sl.x, sa.y - sl.y) < sl.r + sa.r) sa.hp -= sl.dmg * 0.7;
              }
              ring(state, sl.x, sl.y, sl.r, "gold");
              e.slam = null;
            }
          }
        }
        if (e.touch <= 0 && p.camouflage <= 0 && hypot(e.x - p.x, e.y - p.y) < e.r + p.r) {
          hurtPlayer(state, e.touchDmg);
          e.touch = 0.78;
          var kx = p.x - e.x, ky = p.y - e.y, kd = hypot(kx, ky) || 1;
          var kb = moveBody(state, p.x, p.y, p.r, kx / kd * 0.28, ky / kd * 0.28);
          p.x = kb.x; p.y = kb.y;
        }
        if (e.touch <= 0) {
          for (var tj = 0; tj < state.allies.length; tj++) {
            var ta = state.allies[tj];
            if (ta.hp > 0 && hypot(e.x - ta.x, e.y - ta.y) < e.r + ta.r) {
              ta.hp -= e.touchDmg * 0.65;
              ta.hurt = 0.12;
              e.touch = 0.78;
              break;
            }
          }
        }
      }
      for (var sep = 0; sep < 2; sep++) {
        for (var i1 = 0; i1 < state.enemies.length; i1++) {
          for (var i2 = i1 + 1; i2 < state.enemies.length; i2++) {
            var a1 = state.enemies[i1], a2 = state.enemies[i2];
            if (a1.hp <= 0 || a2.hp <= 0) continue;
            var sx = a1.x - a2.x, sy = a1.y - a2.y, sd = hypot(sx, sy) || 0.001;
            var min = a1.r + a2.r + 0.06;
            if (sd < min) {
              var push = (min - sd) * 0.5;
              var m1 = moveBody(state, a1.x, a1.y, a1.r, sx / sd * push, sy / sd * push);
              var m2 = moveBody(state, a2.x, a2.y, a2.r, -sx / sd * push, -sy / sd * push);
              a1.x = m1.x; a1.y = m1.y; a2.x = m2.x; a2.y = m2.y;
            }
          }
        }
      }
    }

    for (var si = state.shots.length - 1; si >= 0; si--) {
      var sh = state.shots[si];
      if (sh.homing && sh.team === "friend") {
        var hm = nearest(state.enemies, sh.x, sh.y, 8);
        if (hm) {
          var want = Math.atan2(hm.y - sh.y, hm.x - sh.x);
          var cur = Math.atan2(sh.vy, sh.vx);
          var turn = clamp(angleDiff(want, cur), -sh.homing * dt, sh.homing * dt);
          var spv = hypot(sh.vx, sh.vy);
          var na = cur + turn;
          sh.vx = Math.cos(na) * spv;
          sh.vy = Math.sin(na) * spv;
        }
      }
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      sh.life -= dt;
      if (sh.life <= 0 || blocked(state, sh.x, sh.y, 0.05) || sh.x < 0 || sh.y < 0 || sh.x > W || sh.y > H) {
        state.shots.splice(si, 1);
        continue;
      }
      if (sh.team === "foe") {
        if (hypot(sh.x - p.x, sh.y - p.y) < sh.r + p.r) {
          hurtPlayer(state, sh.dmg);
          state.shots.splice(si, 1);
        }
        continue;
      }
      for (var hi2 = 0; hi2 < state.enemies.length; hi2++) {
        var en = state.enemies[hi2];
        if (en.hp <= 0 || sh.hit[en.id]) continue;
        if (hypot(sh.x - en.x, sh.y - en.y) < sh.r + en.r) {
          sh.hit[en.id] = 1;
          hurtEnemy(state, en, sh.dmg, true);
          sh.pierce -= 1;
          if (sh.pierce <= 0) { state.shots.splice(si, 1); break; }
        }
      }
    }

    var zones = [];
    for (var zi = 0; zi < state.zones.length; zi++) {
      var z = state.zones[zi];
      if (z.follow) {
        var oa = state.time * 3.1;
        z.x = p.x + Math.cos(oa) * 1.15;
        z.y = p.y + Math.sin(oa) * 1.15;
      }
      if (z.delay > 0) {
        z.delay -= dt;
        z.life -= dt;
        if (z.delay <= 0) {
          damageCircle(state, z.x, z.y, z.r, z.dmg, z.slow);
          z.boom = 1;
          z.dmg = 0;
          ring(state, z.x, z.y, z.r, "fire");
        }
        if (z.life > 0) zones.push(z);
        continue;
      }
      z.life -= dt;
      z.tick -= dt;
      if (z.tick <= 0 && z.dmg > 0) {
        z.tick = z.every;
        damageCircle(state, z.x, z.y, z.r, z.dmg, z.slow);
      }
      if (z.life > 0) zones.push(z);
    }
    state.zones = zones;

    var kept = [];
    for (var ri = 0; ri < state.enemies.length; ri++) {
      var re = state.enemies[ri];
      if (re.hp > 0) kept.push(re);
      else {
        state.fell++;
        burst(state, re.x, re.y, re.boss ? 18 : 8, re.boss ? "gold" : "spark");
      }
    }
    var had = state.enemies.length;
    state.enemies = kept;
    if (had && !kept.length && state.phase === "play") onCleared(state);

    for (var bi = state.bolts.length - 1; bi >= 0; bi--) {
      state.bolts[bi].life -= dt;
      if (state.bolts[bi].life <= 0) state.bolts.splice(bi, 1);
    }
    for (var ri2 = state.rings.length - 1; ri2 >= 0; ri2--) {
      state.rings[ri2].life -= dt;
      if (state.rings[ri2].life <= 0) state.rings.splice(ri2, 1);
    }
    for (var pi = state.particles.length - 1; pi >= 0; pi--) {
      var part = state.particles[pi];
      part.life -= dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      if (part.life <= 0) state.particles.splice(pi, 1);
    }
    for (var fi = state.floats.length - 1; fi >= 0; fi--) {
      state.floats[fi].life -= dt;
      state.floats[fi].y -= dt * 0.7;
      if (state.floats[fi].life <= 0) state.floats.splice(fi, 1);
    }
    if (state.note) {
      state.note.t -= dt;
      if (state.note.t <= 0) state.note = null;
    }
    state.shake = Math.max(0, (state.shake || 0) - dt * 12);
    if (p.hp <= 0 && (state.phase === "play" || state.phase === "wavewait")) {
      p.hp = 0;
      state.phase = "lose";
      state.note = { id: "lose", t: 2 };
    }
  }

  function tick(state, dt, input) {
    if (!state || state.phase === "win" || state.phase === "lose") return state;
    if (state.preview) {
      state.time += Math.min(dt, 2);
      return state;
    }
    input = input || {};
    var pressed = input.pressed || [];
    var held = input.held || [];
    var left = clamp(dt, 0, 2.5);
    var first = true;
    while (left > 0) {
      var stepDt = Math.min(0.05, left);
      left -= stepDt;
      var use = {
        moveX: clamp(+input.moveX || 0, -1, 1),
        moveY: clamp(+input.moveY || 0, -1, 1),
        pressed: first ? [pressed[0] ? 1 : 0, pressed[1] ? 1 : 0, pressed[2] ? 1 : 0, pressed[3] ? 1 : 0] : [0, 0, 0, 0],
        held: [held[0] ? 1 : 0, held[1] ? 1 : 0, held[2] ? 1 : 0, held[3] ? 1 : 0]
      };
      first = false;
      step(state, stepDt, use);
      if (state.phase === "win" || state.phase === "lose") break;
    }
    return state;
  }

  function createMatch(opts) {
    opts = opts || {};
    var map = byId(MAPS, opts.mapId) || MAPS[0];
    var cls = byId(CLASSES, opts.classId) || CLASSES[0];
    var mode = opts.mode === "waves" ? "waves" : "clear";
    var seed = opts.seed != null ? (opts.seed >>> 0) : ((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    var state = {
      W: W, H: H,
      mapId: map.id, classId: cls.id, mode: mode, tier: map.tier,
      skills: cls.skills.slice(),
      map: {
        id: map.id, floor: map.floor, floor2: map.floor2, accent: map.accent, mist: map.mist
      },
      obstacles: map.obstacles.map(function (o) { return { x: o.x, y: o.y, r: o.r, prop: o.prop }; }),
      preview: !!opts.preview,
      phase: opts.preview ? "preview" : "play",
      phaseT: 0, wave: 1, time: 0, fell: 0, shake: 0, note: null,
      rng: mulberry32(seed || 1), seed: seed || 1, nextId: 1,
      enemies: [], allies: [], shots: [], zones: [], bolts: [], rings: [], particles: [], floats: [],
      player: {
        x: 12, y: 13.45, r: 0.42, hp: 120, maxHp: 120, facing: -Math.PI / 2,
        cds: [0, 0, 0, 0], cdMax: [1, 1, 1, 1],
        channel: 0, fireAcc: 0, mist: 0, healAcc: 0, camouflage: 0, bonusHit: false,
        haste: 0, iframe: 0, hurt: 0
      }
    };
    var guard = 0;
    while (blocked(state, state.player.x, state.player.y, state.player.r) && guard++ < 12) {
      state.player.x += 0.4;
    }
    if (!state.preview) {
      spawnWave(state);
      state.note = { id: mode === "waves" ? "wave" : "clear", n: 1, t: 1.4 };
    }
    return state;
  }

  root.MystifySim = {
    version: "A",
    W: W, H: H, PAL: PAL, MAPS: MAPS, CLASSES: CLASSES, SKILL_CD: SKILL_CD,
    createMatch: createMatch, tick: tick, blocked: blocked
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
