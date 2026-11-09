/* Mystify sandbox, version A. Overhead action RPG.
   The camera stays screen-aligned (stick-up moves the hero up the screen) because a
   rotated isometric plane makes a phone stick feel diagonal. Sprites stand on
   elliptical shadows so the ground still reads as a Diablo-style stage.
   Saves use rg-sbx-mystify-* only, plus the site-wide rg-lang / rg-zoom keys. */
(function () {
  "use strict";
  var Sim = globalThis.MystifySim;
  var C = Sim.PAL;
  var STORE = "rg-sbx-mystify-";
  var SQUASH = 0.86;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  var COPY = {
    he: {
      studio: "מיסטיפיי סטודיו",
      tag: "משחק פעולה ותפקידים מלמעלה",
      classLabel: "דמות",
      modeLabel: "מצב",
      mapLabel: "מפה",
      start: "התחלה",
      again: "עוד ניסיון",
      menu: "לתפריט",
      resume: "המשך",
      pause: "השהיה",
      soundOn: "קול פעיל",
      soundOff: "קול כבוי",
      winTitle: "ניצחון",
      loseTitle: "נעצרנו",
      winBody: "הזירה פנויה",
      loseBody: "אפשר לנסות שוב",
      left: "נותרו {n}",
      wave: "גל {n} מתוך 3",
      boss: "בוס",
      rest: "רגע של מנוחה",
      time: "זמן {t}",
      best: "שיא {t}",
      newBest: "שיא חדש",
      install: "התקנה למסך הבית",
      keys: "מקלדת: WASD לזוז, J K L I לכוחות",
      joy: "הזזת הדמות",
      laterT: "עוד מפות",
      laterS: "יגיעו בהמשך",
      help: "גררו את העיגול כדי לזוז. ארבעת הכפתורים הם הכוחות. פנו את כולם, או עמדו בגלים עד הבוס.",
      note: { clear: "פנו את הזירה", wave: "גל {n}", strong: "גל חזק יותר", next: "הגל הבא", boss: "הבוס מגיע", win: "ניצחון", lose: "נעצרנו" },
      mode: { clear: "פינוי הזירה", waves: "גלים ובוס" },
      modeKit: { clear: "פנו את כל מי שבזירה", waves: "גל, גל חזק יותר, ואז בוס" },
      cls: { sorcerer: "קוסם", elemental: "אלמנטל", air: "קוסם אוויר", guardian: "שומר היער", summoner: "מזמן" },
      kit: {
        sorcerer: "ניצוץ, הילה קרה, מטאור וקפיצת אור",
        elemental: "ברק, ברד, חול וחומת אש",
        air: "להב רוח, משב, רום ומערבולת",
        guardian: "גפן, ערפל מרפא, חיות קטנות והסוואה",
        summoner: "זיק, זימון, פעימה וחבר גדול"
      },
      map: { dungeon: "צינוק", island: "אי", forest: "יער זוהר", arena: "זירה מיוחדת", area51: "אזור 51", atlantis: "אטלנטיס" },
      mapKit: {
        dungeon: "אבן, עמודים ואור לפיד",
        island: "חול, מים וסלעים",
        forest: "צמחייה חיה ואור רך",
        arena: "טבעת זהב פתוחה",
        area51: "מסדרון וארגזים",
        atlantis: "עמודים ובועות"
      },
      skill: {
        bolt: "ניצוץ", nova: "הילה", meteor: "מטאור", blink: "קפיצה",
        lightning: "ברק", hail: "ברד", sand: "חול", fire: "אש",
        blade: "להב", gust: "משב", lift: "רום", spin: "סיבוב",
        vine: "גפן", mist: "ערפל", friends: "חבר", hide: "מסווה",
        spark: "זיק", call: "זימון", pulse: "פעימה", big: "גדול"
      },
      skillFull: {
        bolt: "ניצוץ קסום", nova: "הילה קרה", meteor: "מטאור", blink: "קפיצת אור",
        lightning: "ברק", hail: "ברד", sand: "חול", fire: "חומת אש",
        blade: "להב רוח", gust: "משב", lift: "רום", spin: "מערבולת",
        vine: "גפן", mist: "ערפל מרפא", friends: "חיות עזר", hide: "הסוואה",
        spark: "זיק", call: "זימון חבר", pulse: "פעימה", big: "חבר גדול"
      }
    },
    en: {
      studio: "Mystify Studio",
      tag: "An overhead action RPG",
      classLabel: "Hero",
      modeLabel: "Mode",
      mapLabel: "Map",
      start: "Start",
      again: "Try again",
      menu: "Menu",
      resume: "Resume",
      pause: "Pause",
      soundOn: "Sound on",
      soundOff: "Sound off",
      winTitle: "Victory",
      loseTitle: "We stopped",
      winBody: "The stage is clear",
      loseBody: "You can try again",
      left: "{n} left",
      wave: "Wave {n} of 3",
      boss: "Boss",
      rest: "A short rest",
      time: "Time {t}",
      best: "Best {t}",
      newBest: "New best",
      install: "Install app",
      keys: "Keyboard: WASD to move, J K L I for powers",
      joy: "Move",
      laterT: "More maps",
      laterS: "Coming later",
      help: "Drag the circle to move. The four buttons are your powers. Clear everyone, or last through the waves to the boss.",
      note: { clear: "Clear the stage", wave: "Wave {n}", strong: "A stronger wave", next: "Next wave", boss: "The boss arrives", win: "Victory", lose: "We stopped" },
      mode: { clear: "Clear the stage", waves: "Waves and a boss" },
      modeKit: { clear: "Clear everyone here", waves: "A wave, a stronger wave, then a boss" },
      cls: { sorcerer: "Sorcerer", elemental: "Elemental", air: "Air mage", guardian: "Forest guardian", summoner: "Summoner" },
      kit: {
        sorcerer: "Bolt, frost nova, meteor, and a blink",
        elemental: "Lightning, hail, sand, and a fire wall",
        air: "Wind blade, gust, lift, and a cyclone",
        guardian: "Vine, healing mist, small animals, camouflage",
        summoner: "Spark, a call, a pulse, and a big friend"
      },
      map: { dungeon: "Dungeon", island: "Island", forest: "Glowing wilds", arena: "Special arena", area51: "Area 51", atlantis: "Atlantis" },
      mapKit: {
        dungeon: "Stone, pillars, and torchlight",
        island: "Sand, water, and rocks",
        forest: "Living plants and soft light",
        arena: "An open gold ring",
        area51: "A hall and crates",
        atlantis: "Columns and bubbles"
      },
      skill: {
        bolt: "Bolt", nova: "Nova", meteor: "Meteor", blink: "Blink",
        lightning: "Bolt", hail: "Hail", sand: "Sand", fire: "Fire",
        blade: "Blade", gust: "Gust", lift: "Lift", spin: "Spin",
        vine: "Vine", mist: "Mist", friends: "Friend", hide: "Hide",
        spark: "Spark", call: "Call", pulse: "Pulse", big: "Big"
      },
      skillFull: {
        bolt: "Arcane bolt", nova: "Frost nova", meteor: "Meteor", blink: "Blink",
        lightning: "Lightning", hail: "Hail", sand: "Sand", fire: "Fire wall",
        blade: "Wind blade", gust: "Gust", lift: "Updraft", spin: "Cyclone",
        vine: "Vine", mist: "Healing mist", friends: "Helper animals", hide: "Camouflage",
        spark: "Spark", call: "Call a friend", pulse: "Pulse", big: "Big friend"
      }
    }
  };

  var ICONS = {
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    nova: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    meteor: '<circle cx="8" cy="16" r="4"/><path d="M10 12l9-9M14 6l2 2M16 8l2 2"/>',
    blink: '<path d="M4 12h10M10 8l4 4-4 4M14 12h6"/>',
    lightning: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    hail: '<circle cx="7" cy="8" r="1.4"/><circle cx="12" cy="6" r="1.4"/><circle cx="17" cy="9" r="1.4"/><circle cx="8" cy="14" r="1.4"/><circle cx="14" cy="16" r="1.4"/>',
    sand: '<path d="M3 16c3-4 6-4 9 0s6 4 9 0M3 10c3-4 6-4 9 0s6 4 9 0"/>',
    fire: '<path d="M12 3c2 4 6 5 6 10a6 6 0 1 1-12 0c0-3 2-5 3-7 1 2 2 2 3-3z"/>',
    blade: '<path d="M4 16c6-2 10-8 16-12-2 8-6 12-12 14"/>',
    gust: '<path d="M4 8h12M4 12h16M4 16h10"/>',
    lift: '<path d="M12 20V6M7 10l5-5 5 5"/>',
    spin: '<path d="M12 4a8 8 0 1 0 8 8"/><path d="M16 4h4v4"/>',
    vine: '<path d="M6 20c2-6 4-8 6-14 2 4 4 6 6 10"/>',
    mist: '<path d="M6 15a4 4 0 0 1 1-7 5 5 0 0 1 9-1 4 4 0 0 1 1 8z"/>',
    friends: '<circle cx="8" cy="14" r="3"/><circle cx="16" cy="13" r="3.4"/>',
    hide: '<path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z"/><path d="M4 5l16 16"/>',
    spark: '<path d="M12 3l1.5 6L20 12l-6.5 2L12 21l-1.5-7L4 12l6.5-3z"/>',
    call: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    pulse: '<circle cx="12" cy="12" r="2"/><path d="M6 12a6 6 0 0 1 12 0M3 12a9 9 0 0 1 18 0"/>',
    big: '<circle cx="12" cy="13" r="6"/><path d="M8 8l-2-3M16 8l2-3"/>'
  };

  function load(k, d) {
    try { var v = localStorage.getItem(STORE + k); return v == null ? d : v; } catch (e) { return d; }
  }
  function save(k, v) {
    try { localStorage.setItem(STORE + k, String(v)); } catch (e) {}
  }
  function lang() { return document.documentElement.lang === "en" ? "en" : "he"; }
  function L() { return COPY[lang()] || COPY.he; }
  function fill(s, map) {
    return String(s).replace(/\{(\w+)\}/g, function (_, k) { return map[k] != null ? map[k] : ""; });
  }
  function fmt(t) {
    t = Math.max(0, Math.floor(t));
    var m = Math.floor(t / 60), s = t % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function $(id) { return document.getElementById(id); }

  var canvas = $("c"), ctx = canvas.getContext("2d");
  if (ctx && !ctx.roundRect) {
    ctx.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); return this; };
  }
  var menu = $("menu"), hud = $("hud"), pauseEl = $("pause"), endEl = $("end");
  var classesEl = $("classes"), modesEl = $("modes"), mapsEl = $("maps");
  var skillsEl = $("skills"), joy = $("joy"), knob = joy.querySelector("i");
  var live = $("live"), banner = $("banner");
  var screen = "menu";
  var match = null, preview = null;
  var pick = {
    classId: load("class", "sorcerer"),
    mode: load("mode", "clear"),
    mapId: load("map", "dungeon")
  };
  if (!Sim.CLASSES.some(function (c) { return c.id === pick.classId; })) pick.classId = "sorcerer";
  if (pick.mode !== "waves") pick.mode = "clear";
  if (!Sim.MAPS.some(function (m) { return m.id === pick.mapId; })) pick.mapId = "dungeon";
  var held = [0, 0, 0, 0], pressed = [0, 0, 0, 0], keys = {};
  var jx = 0, jy = 0, joyId = null;
  var endArm = 0, outcomeNoted = false, lastHurt = 0, lastAnnounce = "";
  var soundOn = load("sound", "1") !== "0";
  var ac = null;
  var skillBtns = [];
  var viewW = 1, viewH = 1;

  function stripeFor(id) {
    return { sorcerer: C.gold, elemental: C.gold2, air: C.blueSoft, guardian: C.bgGreen, summoner: C.violet }[id] || C.gold;
  }
  function icon(id) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[id] || ICONS.spark) + "</svg>";
  }
  function makePick(parent, id, stripe, onPick) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "pick";
    b.dataset.id = id;
    b.style.setProperty("--stripe", stripe);
    b.innerHTML = "<b></b><span></span>";
    b.addEventListener("click", function () { onPick(id); });
    parent.appendChild(b);
    return b;
  }
  var classBtns = [], modeBtns = [], mapBtns = [], laterEl = null;
  function buildPicks() {
    Sim.CLASSES.forEach(function (c) {
      classBtns.push(makePick(classesEl, c.id, stripeFor(c.id), function (id) {
        pick.classId = id; save("class", id); syncPreview(); paintPicks();
      }));
    });
    ["clear", "waves"].forEach(function (id) {
      modeBtns.push(makePick(modesEl, id, id === "waves" ? C.blueSoft : C.gold, function (next) {
        pick.mode = next; save("mode", next); syncPreview(); paintPicks();
      }));
    });
    Sim.MAPS.forEach(function (m) {
      mapBtns.push(makePick(mapsEl, m.id, m.accent, function (id) {
        pick.mapId = id; save("map", id); syncPreview(); paintPicks();
      }));
    });
    /* Add a future map on Sim.MAPS. This note is not a purchase. */
    laterEl = document.createElement("div");
    laterEl.className = "later";
    laterEl.setAttribute("aria-disabled", "true");
    laterEl.innerHTML = "<b></b><span></span>";
    mapsEl.appendChild(laterEl);
    for (var i = 0; i < 4; i++) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sk";
      btn.innerHTML = '<span class="ic"></span><span class="lb"></span><i class="cd"></i>';
      bindSkill(btn, i);
      skillsEl.appendChild(btn);
      skillBtns.push(btn);
    }
  }
  function paintPicks() {
    var t = L();
    classBtns.forEach(function (b) {
      b.querySelector("b").textContent = t.cls[b.dataset.id];
      b.querySelector("span").textContent = t.kit[b.dataset.id];
      b.setAttribute("aria-pressed", pick.classId === b.dataset.id ? "true" : "false");
      b.setAttribute("aria-label", t.cls[b.dataset.id] + ". " + t.kit[b.dataset.id]);
    });
    modeBtns.forEach(function (b) {
      b.querySelector("b").textContent = t.mode[b.dataset.id];
      b.querySelector("span").textContent = t.modeKit[b.dataset.id];
      b.setAttribute("aria-pressed", pick.mode === b.dataset.id ? "true" : "false");
    });
    mapBtns.forEach(function (b) {
      b.querySelector("b").textContent = t.map[b.dataset.id];
      b.querySelector("span").textContent = t.mapKit[b.dataset.id];
      b.setAttribute("aria-pressed", pick.mapId === b.dataset.id ? "true" : "false");
    });
    laterEl.querySelector("b").textContent = t.laterT;
    laterEl.querySelector("span").textContent = t.laterS;
  }
  function applyLang() {
    var t = L();
    $("studio").textContent = t.studio;
    $("tag").textContent = t.tag;
    $("classLabel").textContent = t.classLabel;
    $("modeLabel").textContent = t.modeLabel;
    $("mapLabel").textContent = t.mapLabel;
    $("help").textContent = t.help;
    $("foot").textContent = (lang() === "en" ? "Version A · " : "גרסה א׳ · ") + t.studio;
    $("start").textContent = t.start;
    $("again").textContent = t.again;
    $("resume").textContent = t.resume;
    $("pauseMenu").textContent = t.menu;
    $("endMenu").textContent = t.menu;
    $("pauseTitle").textContent = t.pause;
    $("pauseBtn").setAttribute("aria-label", t.pause);
    $("soundBtn").textContent = soundOn ? t.soundOn : t.soundOff;
    $("keys").textContent = t.keys;
    joy.setAttribute("aria-label", t.joy);
    $("install-btn").textContent = t.install;
    paintPicks();
    paintSkills();
  }
  function setLang(next) {
    document.documentElement.lang = next;
    document.documentElement.dir = next === "en" ? "ltr" : "rtl";
    try { localStorage.setItem("rg-lang", next); } catch (e) {}
    applyLang();
    try { document.dispatchEvent(new Event("rg-lang")); } catch (e2) {}
  }

  function syncPreview() {
    preview = Sim.createMatch({ classId: pick.classId, mode: pick.mode, mapId: pick.mapId, seed: 7, preview: true });
  }
  function setScreen(next) {
    screen = next;
    document.body.classList.toggle("playing", next !== "menu");
    menu.classList.toggle("hidden", next !== "menu");
    hud.classList.toggle("hidden", next === "menu");
    pauseEl.classList.toggle("hidden", next !== "pause");
    endEl.classList.toggle("hidden", next !== "end");
    if (next === "menu") syncPreview();
    if (next === "end") { try { $("again").focus(); } catch (e) {} }
    if (next === "pause") { try { $("resume").focus(); } catch (e2) {} }
  }
  function startRun() {
    ensureAudio();
    outcomeNoted = false;
    endArm = 0;
    lastHurt = 0;
    lastAnnounce = "";
    held = [0, 0, 0, 0];
    pressed = [0, 0, 0, 0];
    jx = 0; jy = 0;
    match = Sim.createMatch({
      classId: pick.classId, mode: pick.mode, mapId: pick.mapId,
      seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0
    });
    setScreen("play");
    tone(520, 0.08, "sine", 0.04);
  }
  function toMenu() {
    match = null;
    jx = 0; jy = 0;
    held = [0, 0, 0, 0];
    setScreen("menu");
  }
  function saveBest() {
    var key = match.mode + ":" + match.mapId + ":" + match.classId;
    var all = {};
    try { all = JSON.parse(load("best", "{}")) || {}; } catch (e) { all = {}; }
    var prev = all[key];
    if (prev == null || match.time < prev) {
      all[key] = Math.round(match.time * 10) / 10;
      save("best", JSON.stringify(all));
      match.bestNew = true;
    }
    match.best = all[key];
  }
  function showEnd() {
    if (!match || screen === "end") return;
    var t = L();
    var win = match.phase === "win";
    $("endTitle").textContent = win ? t.winTitle : t.loseTitle;
    $("endBody").textContent = win ? t.winBody : t.loseBody;
    var line = fill(t.time, { t: fmt(match.time) });
    if (win && match.best != null) line += " · " + fill(t.best, { t: fmt(match.best) });
    if (win && match.bestNew) line += " · " + t.newBest;
    $("endTime").textContent = line;
    announce(win ? t.winTitle : t.loseTitle);
    setScreen("end");
  }
  function announce(text) {
    if (!text || text === lastAnnounce) return;
    lastAnnounce = text;
    live.textContent = text;
  }

  function bindSkill(btn, i) {
    function down(e) {
      if (screen !== "play") return;
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch (err) {}
      held[i] = 1;
      pressed[i] = 1;
      if (!reduced && navigator.vibrate) { try { navigator.vibrate(8); } catch (err2) {} }
    }
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", function () { held[i] = 0; });
    btn.addEventListener("pointercancel", function () { held[i] = 0; });
  }
  joy.addEventListener("pointerdown", function (e) {
    if (screen !== "play") return;
    joyId = e.pointerId;
    try { joy.setPointerCapture(e.pointerId); } catch (err) {}
    joy.classList.add("on");
    moveJoy(e);
  });
  joy.addEventListener("pointermove", function (e) { if (e.pointerId === joyId) moveJoy(e); });
  function endJoy(e) {
    if (e.pointerId !== joyId) return;
    joyId = null; jx = 0; jy = 0;
    joy.classList.remove("on");
    knob.style.setProperty("--x", "0px");
    knob.style.setProperty("--y", "0px");
  }
  joy.addEventListener("pointerup", endJoy);
  joy.addEventListener("pointercancel", endJoy);
  function moveJoy(e) {
    var r = joy.getBoundingClientRect();
    var dx = e.clientX - (r.left + r.width / 2);
    var dy = e.clientY - (r.top + r.height / 2);
    var max = r.width * 0.34;
    var dist = Math.hypot(dx, dy) || 1;
    var k = Math.min(1, dist / max);
    jx = dx / dist * k;
    jy = dy / dist * k;
    if (Math.hypot(jx, jy) < 0.12) { jx = 0; jy = 0; }
    knob.style.setProperty("--x", (jx * max) + "px");
    knob.style.setProperty("--y", (jy * max) + "px");
  }
  addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    keys[k] = true;
    if (k === "escape") {
      if (screen === "play") setScreen("pause");
      else if (screen === "pause") setScreen("play");
      else if (screen === "end") toMenu();
      return;
    }
    if (screen !== "play" || e.repeat) return;
    if (k === "arrowup" || k === "arrowdown" || k === "arrowleft" || k === "arrowright" || k === " ") e.preventDefault();
    if (k === "j" || k === " " || k === "1") pressed[0] = 1;
    if (k === "k" || k === "2") pressed[1] = 1;
    if (k === "l" || k === "3") pressed[2] = 1;
    if (k === "i" || k === "4") pressed[3] = 1;
  });
  addEventListener("keyup", function (e) { keys[e.key.toLowerCase()] = false; });
  addEventListener("blur", function () {
    keys = {}; held = [0, 0, 0, 0]; jx = 0; jy = 0; joyId = null;
  });
  function moveInput() {
    var mx = jx, my = jy;
    if (keys.a || keys.arrowleft) mx -= 1;
    if (keys.d || keys.arrowright) mx += 1;
    if (keys.w || keys.arrowup) my -= 1;
    if (keys.s || keys.arrowdown) my += 1;
    var m = Math.hypot(mx, my);
    if (m > 1) { mx /= m; my /= m; }
    return { x: mx, y: my };
  }
  function gather() {
    var mv = moveInput();
    var h = held.slice();
    if (keys.j || keys[" "] || keys["1"]) h[0] = 1;
    return { moveX: mv.x, moveY: mv.y, pressed: pressed.slice(), held: h };
  }

  function tone(freq, dur, type, gain) {
    if (!soundOn) return;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || "sine";
      o.frequency.value = freq;
      g.gain.value = gain || 0.035;
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + dur);
    } catch (e) {}
  }
  function ensureAudio() {
    if (!soundOn) return;
    try {
      if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
    } catch (e) {}
  }

  function resize() {
    var dpr = Math.min(2, devicePixelRatio || 1);
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = Math.max(1, Math.floor(viewW * dpr));
    canvas.height = Math.max(1, Math.floor(viewH * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function project(x, y, camX, camY, scale, fx, fy) {
    return { x: fx + (x - camX) * scale, y: fy + (y - camY) * scale * SQUASH };
  }
  function ellipse(x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2);
  }
  function eye(x, y, look) {
    ctx.fillStyle = C.cream;
    ellipse(x, y, 3.2, 3.6); ctx.fill();
    ctx.fillStyle = C.navyDeep;
    ellipse(x + look, y, 1.5, 1.8); ctx.fill();
  }
  function smile(y) {
    ctx.strokeStyle = C.navyInk;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, y, 4, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  function shadow(r) {
    ctx.save();
    ctx.fillStyle = "rgba(5,10,36,.45)";
    ellipse(0, 6, r, r * 0.55); ctx.fill();
    ctx.restore();
  }
  function drawHero(classId, facing, camouflage, hurt, time) {
    ctx.save();
    ctx.globalAlpha = camouflage > 0 ? 0.32 : 1;
    shadow(16);
    ctx.translate(0, -16);
    ctx.rotate(facing);
    if (classId === "sorcerer") {
      ctx.fillStyle = C.blue4;
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(14, 16); ctx.lineTo(-14, 16); ctx.fill();
      ctx.fillStyle = C.gold; ctx.fillRect(-14, 12, 28, 4);
      ctx.strokeStyle = C.gold3; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(20, -8); ctx.stroke();
      ctx.fillStyle = C.cream; ellipse(20, -8, 5, 5); ctx.fill();
      ctx.fillStyle = C.blue; ellipse(20, -8, 2, 2); ctx.fill();
    } else if (classId === "elemental") {
      ctx.strokeStyle = C.gold; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 2, 12, time * 3, time * 3 + 2); ctx.stroke();
      ctx.strokeStyle = C.blueSoft;
      ctx.beginPath(); ctx.arc(0, 2, 8, -time * 4, -time * 4 + 2.4); ctx.stroke();
      ctx.fillStyle = C.gold2; ellipse(0, 2, 5, 5); ctx.fill();
    } else if (classId === "air") {
      ctx.strokeStyle = C.mist; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(-18, 8, -8, 16); ctx.stroke();
      ctx.fillStyle = C.mist;
      ctx.beginPath(); ctx.ellipse(2, 2, 10, 14, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.blueSoft; ellipse(6, -2, 4, 4); ctx.fill();
    } else if (classId === "guardian") {
      ctx.fillStyle = C.cream;
      ctx.strokeStyle = C.bgGreen;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 4, 12, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = C.bgGreen;
      ctx.beginPath(); ctx.ellipse(-9, -8, 7, 3.2, -0.7, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9, -9, 7, 3.2, 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.gold; ellipse(-3.2, 1, 2, 2); ctx.fill(); ellipse(3.2, 1, 2, 2); ctx.fill();
    } else {
      ctx.fillStyle = C.blue3;
      ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(14, 16); ctx.lineTo(-14, 16); ctx.fill();
      ctx.strokeStyle = C.violet; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, -6, 9, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = C.gold; ctx.fillRect(-14, 12, 28, 4);
      ctx.fillStyle = C.gold2; ellipse(0, 2, 5, 4); ctx.fill();
    }
    if (hurt > 0.08) {
      ctx.fillStyle = "rgba(255,247,214,.45)";
      ellipse(0, 2, 12, 14); ctx.fill();
    }
    ctx.restore();
  }
  function drawCreature(kind, r, facing, boss, friend) {
    shadow(r);
    ctx.save();
    ctx.translate(0, -r * 0.45);
    var body = friend ? C.gold2 : kind === "puff" ? C.mist : boss ? C.blue3 : C.blueSoft;
    ctx.fillStyle = body;
    ctx.strokeStyle = C.navyDeep;
    ctx.lineWidth = 2;
    if (kind === "puff") {
      ellipse(-r * 0.35, 2, r * 0.45, r * 0.4); ctx.fill(); ctx.stroke();
      ellipse(r * 0.35, 2, r * 0.45, r * 0.4); ctx.fill(); ctx.stroke();
      ellipse(0, -2, r * 0.5, r * 0.48); ctx.fill(); ctx.stroke();
    } else {
      ellipse(0, 0, r * 0.72, r * 0.62); ctx.fill(); ctx.stroke();
      if (kind === "hopper") {
        ctx.fillStyle = C.gold3;
        ellipse(-r * 0.28, r * 0.55, r * 0.16, r * 0.1); ctx.fill();
        ellipse(r * 0.28, r * 0.55, r * 0.16, r * 0.1); ctx.fill();
      } else {
        ctx.fillStyle = C.gold;
        ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.35); ctx.lineTo(-r * 0.2, -r * 0.7); ctx.lineTo(-r * 0.05, -r * 0.3); ctx.fill();
        ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.35); ctx.lineTo(r * 0.2, -r * 0.7); ctx.lineTo(r * 0.05, -r * 0.3); ctx.fill();
      }
    }
    ctx.fillStyle = C.cream;
    ellipse(0, r * 0.12, r * 0.32, r * 0.22); ctx.fill();
    var look = Math.cos(facing) * 1.4;
    eye(-r * 0.18, -r * 0.08, look);
    eye(r * 0.18, -r * 0.08, look);
    smile(r * 0.02);
    if (kind === "elite" || boss) {
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      ellipse(0, 0, r * 0.86, r * 0.74); ctx.stroke();
    }
    ctx.restore();
  }
  function drawProp(o, p, scale) {
    var rw = o.r * scale, rh = o.r * scale * SQUASH;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (o.prop === "tree") {
      ctx.fillStyle = C.bgWarm;
      ctx.fillRect(-rw * 0.22, -rh * 1.1, rw * 0.44, rh * 1.15);
      ctx.fillStyle = C.bgGreen;
      ellipse(0, -rh * 1.35, rw * 1.15, rh * 0.85); ctx.fill();
      ctx.fillStyle = C.blueSoft;
      ctx.globalAlpha = 0.85;
      ellipse(-rw * 0.3, -rh * 1.5, rw * 0.28, rh * 0.2); ctx.fill();
      ctx.fillStyle = C.gold3;
      ellipse(rw * 0.35, -rh * 1.2, rw * 0.2, rh * 0.16); ctx.fill();
    } else if (o.prop === "rock") {
      ctx.fillStyle = C.gold4;
      ellipse(0, 0, rw, rh * 0.7); ctx.fill();
      ctx.fillStyle = C.sand2;
      ctx.globalAlpha = 0.8;
      ellipse(-rw * 0.2, -rh * 0.1, rw * 0.45, rh * 0.28); ctx.fill();
    } else if (o.prop === "crate") {
      ctx.fillStyle = C.bgSlate3;
      ctx.strokeStyle = C.blue2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-rw * 0.7, -rh * 0.9, rw * 1.4, rh * 1.15, 6);
      ctx.fill(); ctx.stroke();
    } else if (o.prop === "column") {
      ctx.fillStyle = C.blueSoft;
      ctx.fillRect(-rw * 0.28, -rh * 1.7, rw * 0.56, rh * 1.75);
      ctx.fillStyle = C.gold4;
      ctx.fillRect(-rw * 0.4, -rh * 1.85, rw * 0.8, rh * 0.22);
      ctx.fillRect(-rw * 0.36, -rh * 0.12, rw * 0.72, rh * 0.18);
    } else {
      ctx.fillStyle = C.bgSlate2;
      ctx.beginPath();
      ctx.roundRect(-rw * 0.45, -rh * 1.3, rw * 0.9, rh * 1.35, 8);
      ctx.fill();
      ctx.fillStyle = C.gold;
      ctx.fillRect(-rw * 0.45, -rh * 0.35, rw * 0.9, rh * 0.16);
      var g = ctx.createRadialGradient(0, -rh * 1.5, 2, 0, -rh * 1.15, rw);
      g.addColorStop(0, "rgba(243,207,107,.9)");
      g.addColorStop(1, "rgba(243,207,107,0)");
      ctx.fillStyle = g;
      ellipse(0, -rh * 1.2, rw * 0.7, rh * 0.55); ctx.fill();
    }
    ctx.restore();
  }
  function drawDecor(world, projectAt, scale, time) {
    var id = world.mapId;
    ctx.save();
    if (id === "island") {
      ctx.fillStyle = C.bgTeal;
      ctx.globalAlpha = 0.35;
      var a = projectAt(3, 13), b = projectAt(21, 14.5);
      ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) * 0.55, 28); ctx.fill();
    }
    if (id === "forest") {
      for (var i = 0; i < 16; i++) {
        var px = (i * 3.1) % Sim.W, py = (i * 2.3 + Math.sin(time + i) * 0.4) % Sim.H;
        var pt = projectAt(px, py);
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = i % 2 ? C.blueSoft : C.gold3;
        ellipse(pt.x, pt.y, 3 + (i % 3), 2); ctx.fill();
      }
    }
    if (id === "arena") {
      var c = projectAt(Sim.W / 2, Sim.H / 2);
      ctx.strokeStyle = C.gold;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 3;
      ellipse(c.x, c.y, scale * 4.2, scale * 4.2 * SQUASH); ctx.stroke();
    }
    if (id === "area51") {
      ctx.strokeStyle = C.blue2;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      for (var y = 2; y < Sim.H; y += 2) {
        var p1 = projectAt(1, y), p2 = projectAt(Sim.W - 1, y);
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      }
    }
    if (id === "atlantis") {
      for (var n = 0; n < 10; n++) {
        var bx = (n * 2.4 + 1) % Sim.W;
        var by = Sim.H - ((time * 0.7 + n) % Sim.H);
        var bp = projectAt(bx, by);
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = C.ink2;
        ellipse(bp.x, bp.y, 4 + n % 3, 3); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function render(world, follow) {
    var w = viewW, h = viewH;
    var playTop = h < 520 ? 64 : 118;
    var playBot = h < 520 ? 128 : 188;
    var availH = Math.max(120, h - playTop - playBot);
    var fitH = availH / (Sim.H * SQUASH);
    var fitW = w / 11.5;
    var scale = Math.max(26, Math.min(fitH, fitW));
    var worldPxH = Sim.H * scale * SQUASH;
    var fx = w * 0.5;
    var fy = playTop + Math.min(availH, worldPxH) / 2;
    var viewWW = w / scale;
    var viewWH = worldPxH <= availH + 2 ? Sim.H : (h / (scale * SQUASH));
    function clampCam(v, view, limit) {
      if (view >= limit) return limit / 2;
      return Math.max(view / 2, Math.min(limit - view / 2, v));
    }
    var camX = clampCam(follow ? world.player.x : Sim.W / 2, viewWW, Sim.W);
    var camY = worldPxH <= availH + 2 ? Sim.H / 2 : clampCam(follow ? world.player.y : Sim.H * 0.55, viewWH, Sim.H);
    function projectAt(x, y) { return project(x, y, camX, camY, scale, fx, fy); }
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = world.map.floor;
    ctx.fillRect(0, 0, w, h);
    if (follow && world.shake && !reduced) {
      ctx.save();
      ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
    }
    ctx.fillStyle = world.map.floor;
    ctx.beginPath();
    var c0 = projectAt(0, 0), c1 = projectAt(Sim.W, 0), c2 = projectAt(Sim.W, Sim.H), c3 = projectAt(0, Sim.H);
    ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y); ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = world.map.floor2;
    for (var tx = 0; tx < Sim.W; tx += 1.25) {
      for (var ty = 0; ty < Sim.H; ty += 1.25) {
        if (((tx + ty) | 0) % 2) continue;
        var tp = projectAt(tx + 0.6, ty + 0.6);
        ellipse(tp.x, tp.y, scale * 0.55, scale * 0.55 * SQUASH); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    drawDecor(world, projectAt, scale, world.time || 0);
    world.zones.forEach(function (z) {
      var zp = projectAt(z.x, z.y);
      ctx.globalAlpha = z.kind === "meteor" && z.delay > 0 ? 0.45 : 0.7;
      ctx.fillStyle = z.kind === "hail" ? C.mist : z.kind === "spin" ? C.blueSoft : C.gold;
      ellipse(zp.x, zp.y, z.r * scale, z.r * scale * SQUASH); ctx.fill();
      ctx.globalAlpha = 1;
    });
    var sprites = [];
    world.obstacles.forEach(function (o) { sprites.push({ y: o.y, draw: function () { drawProp(o, projectAt(o.x, o.y), scale); } }); });
    world.enemies.forEach(function (e) {
      sprites.push({ y: e.y, draw: function () {
        if (e.slam) {
          var sp = projectAt(e.slam.x, e.slam.y);
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = C.gold2;
          ellipse(sp.x, sp.y, e.slam.r * scale, e.slam.r * scale * SQUASH); ctx.fill();
          ctx.globalAlpha = 0.9;
          ctx.strokeStyle = C.gold;
          ctx.lineWidth = 2;
          ellipse(sp.x, sp.y, e.slam.r * scale, e.slam.r * scale * SQUASH); ctx.stroke();
          ctx.globalAlpha = 1;
        }
        var ep = projectAt(e.x, e.y);
        var bob = reduced ? 0 : Math.sin((world.time || 0) * 4 + e.id) * 2;
        ctx.save();
        ctx.translate(ep.x, ep.y + bob);
        drawCreature(e.kind, e.boss ? 40 : e.elite ? 28 : 22, world.player ? Math.atan2(world.player.y - e.y, world.player.x - e.x) : 0, e.boss);
        ctx.restore();
        var bw = (e.boss ? 46 : 28);
        var by = ep.y - (e.boss ? 48 : 32);
        ctx.fillStyle = C.navyDeep;
        ctx.fillRect(ep.x - bw / 2, by, bw, 4);
        ctx.fillStyle = e.boss ? C.gold : C.blueSoft;
        ctx.fillRect(ep.x - bw / 2, by, bw * Math.max(0, e.hp / e.maxHp), 4);
      } });
    });
    world.allies.forEach(function (a) {
      sprites.push({ y: a.y, draw: function () {
        var ap = projectAt(a.x, a.y);
        ctx.save();
        ctx.translate(ap.x, ap.y);
        drawCreature(a.kind === "big" ? "elite" : "blob", a.kind === "big" ? 22 : 14, 0, false, true);
        ctx.restore();
      } });
    });
    sprites.push({ y: world.player.y, draw: function () {
      var pp = projectAt(world.player.x, world.player.y);
      if (world.player.channel > 0) {
        ctx.save();
        ctx.translate(pp.x, pp.y - 12);
        ctx.rotate(world.player.facing);
        var grd = ctx.createLinearGradient(0, 0, 86, 0);
        grd.addColorStop(0, "rgba(255,247,214,.05)");
        grd.addColorStop(1, "rgba(243,207,107,.9)");
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(88, -26); ctx.lineTo(88, 26); ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(pp.x, pp.y);
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2;
      ellipse(0, 2, 20, 9); ctx.stroke();
      ctx.scale(1.28, 1.28);
      drawHero(world.classId, world.player.facing, world.player.camouflage, world.player.hurt, world.time || 0);
      ctx.restore();
    } });
    sprites.sort(function (a, b) { return a.y - b.y; });
    sprites.forEach(function (s) { s.draw(); });
    world.shots.forEach(function (sh) {
      var sp = projectAt(sh.x, sh.y);
      ctx.fillStyle = sh.kind === "blade" ? C.mist : sh.team === "foe" ? C.blueSoft : C.gold2;
      ellipse(sp.x, sp.y, sh.kind === "blade" ? 10 : 6, sh.kind === "blade" ? 4 : 6); ctx.fill();
    });
    world.bolts.forEach(function (b) {
      var a = projectAt(b.x1, b.y1), d = projectAt(b.x2, b.y2);
      ctx.strokeStyle = C.ink2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo((a.x + d.x) / 2 + 8, (a.y + d.y) / 2 - 6);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();
    });
    world.rings.forEach(function (r) {
      var rp = projectAt(r.x, r.y);
      ctx.globalAlpha = Math.max(0, r.life / r.max);
      ctx.strokeStyle = r.kind === "air" || r.kind === "frost" ? C.blueSoft : r.kind === "vine" || r.kind === "mist" ? C.bgGreen : C.gold;
      ctx.lineWidth = 3;
      ellipse(rp.x, rp.y, r.r * scale * (1.15 - r.life / r.max), r.r * scale * SQUASH); ctx.stroke();
      ctx.globalAlpha = 1;
    });
    world.particles.forEach(function (p) {
      var pp = projectAt(p.x, p.y);
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.kind === "gold" ? C.gold : p.kind === "soft" ? C.mist : C.gold2;
      ellipse(pp.x, pp.y, 3, 3); ctx.fill();
      ctx.globalAlpha = 1;
    });
    ctx.font = "700 13px Heebo, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = C.cream;
    world.floats.forEach(function (f) {
      var fp = projectAt(f.x, f.y);
      ctx.globalAlpha = Math.max(0, f.life / f.max);
      ctx.fillText(f.text, fp.x, fp.y);
      ctx.globalAlpha = 1;
    });
    if (follow) {
      world.enemies.forEach(function (e) {
        var ep = projectAt(e.x, e.y);
        var m = 36, bottom = h - 150;
        if (ep.x > m && ep.x < w - m && ep.y > m && ep.y < bottom) return;
        var cx = w * 0.5, cy = fy, dx = ep.x - cx, dy = ep.y - cy;
        var t = 1;
        if (dx > 0) t = Math.min(t, (w - m - cx) / dx);
        if (dx < 0) t = Math.min(t, (m - cx) / dx);
        if (dy > 0) t = Math.min(t, (bottom - cy) / dy);
        if (dy < 0) t = Math.min(t, (m - cy) / dy);
        if (!isFinite(t) || t <= 0) return;
        ctx.fillStyle = C.gold;
        ellipse(cx + dx * t, cy + dy * t, 6, 6); ctx.fill();
      });
    }
    if (follow && world.player.hurt > 0.02) {
      ctx.strokeStyle = "rgba(127,182,255," + Math.min(0.8, world.player.hurt) + ")";
      ctx.lineWidth = 14;
      ctx.strokeRect(6, 6, w - 12, h - 12);
    }
    if (follow && world.shake && !reduced) ctx.restore();
  }

  function paintSkills() {
    if (!match) return;
    var t = L();
    var p = match.player;
    for (var i = 0; i < 4; i++) {
      var id = match.skills[i];
      var btn = skillBtns[i];
      btn.querySelector(".ic").innerHTML = icon(id);
      btn.querySelector(".lb").textContent = t.skill[id];
      var max = p.cdMax[i] || 1;
      var left = p.cds[i] || 0;
      btn.style.setProperty("--p", (Math.max(0, Math.min(1, left / max)) * 100) + "%");
      var hot = i === 3 && match.classId === "elemental" && p.channel > 0;
      btn.classList.toggle("ready", left <= 0 && !hot);
      btn.classList.toggle("hot", hot);
      btn.setAttribute("aria-label", t.skillFull[id] + (left > 0.15 ? " " + left.toFixed(1) : ""));
    }
  }
  function paintHud() {
    if (!match || screen === "menu") return;
    var t = L();
    var p = match.player;
    var pct = Math.max(0, p.hp / p.maxHp);
    $("hpFill").style.setProperty("--hp", String(pct));
    $("hpNum").textContent = String(Math.max(0, Math.ceil(p.hp)));
    $("hpWrap").classList.toggle("low", pct < 0.3);
    $("hpWrap").setAttribute("aria-label", $("hpNum").textContent + " / " + p.maxHp);
    var obj = t.left;
    if (match.phase === "wavewait") obj = t.rest;
    else if (match.mode === "waves" && match.wave >= 3) obj = t.boss;
    else if (match.mode === "waves") obj = fill(t.wave, { n: match.wave });
    else obj = fill(t.left, { n: match.enemies.length });
    $("obj").textContent = obj;
    $("who").textContent = t.cls[match.classId] + " · " + t.map[match.mapId];
    if (match.note && t.note[match.note.id]) {
      banner.textContent = fill(t.note[match.note.id], { n: match.note.n || match.wave });
      banner.classList.add("on");
      announce(banner.textContent);
    } else banner.classList.remove("on");
    paintSkills();
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - (frame.last || now)) / 1000 || 0.016);
    frame.last = now;
    if (screen === "play" && match) {
      Sim.tick(match, dt, gather());
      pressed = [0, 0, 0, 0];
      if (match.player.hurt > lastHurt + 0.05) tone(150, 0.07, "triangle", 0.04);
      lastHurt = match.player.hurt;
      if ((match.phase === "win" || match.phase === "lose") && !outcomeNoted) {
        outcomeNoted = true;
        endArm = 0.6;
        if (match.phase === "win") saveBest();
        tone(match.phase === "win" ? 660 : 180, 0.22, "sine", 0.05);
      }
      if (outcomeNoted && endArm > 0) {
        endArm -= dt;
        if (endArm <= 0) showEnd();
      }
    } else if (screen === "menu" && preview) {
      Sim.tick(preview, dt, { moveX: 0, moveY: 0, pressed: [0, 0, 0, 0], held: [0, 0, 0, 0] });
    }
    var world = (screen === "menu" ? preview : match) || preview;
    if (world) render(world, screen !== "menu");
    if (screen !== "menu") paintHud();
    requestAnimationFrame(frame);
  }

  function bootInstall() {
    var dp = null, wrap = $("install-wrap"), btn = $("install-btn");
    function standalone() {
      return (matchMedia && (matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches)) || navigator.standalone === true;
    }
    function dismissed() { return load("inst-off", "") === "1"; }
    function show() { wrap.hidden = !(dp && !standalone() && !dismissed()); }
    btn.addEventListener("click", function () {
      if (!dp) return;
      var d = dp; dp = null; show(); d.prompt();
    });
    addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); dp = e; show(); });
    addEventListener("appinstalled", function () { dp = null; show(); });
    show();
  }

  $("langBtn").addEventListener("click", function () { setLang(lang() === "he" ? "en" : "he"); });
  $("theme-btn").addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    save("theme", next);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "light" ? "#f3efe6" : "#0a1238");
  });
  $("start").addEventListener("click", startRun);
  $("again").addEventListener("click", startRun);
  $("pauseBtn").addEventListener("click", function () { if (screen === "play") setScreen("pause"); });
  $("resume").addEventListener("click", function () { if (match && match.phase !== "win" && match.phase !== "lose") setScreen("play"); });
  $("pauseMenu").addEventListener("click", toMenu);
  $("endMenu").addEventListener("click", toMenu);
  $("soundBtn").addEventListener("click", function () {
    soundOn = !soundOn;
    save("sound", soundOn ? "1" : "0");
    $("soundBtn").textContent = soundOn ? L().soundOn : L().soundOff;
    if (soundOn) ensureAudio();
  });
  addEventListener("contextmenu", function (e) { e.preventDefault(); });

  buildPicks();
  applyLang();
  syncPreview();
  resize();
  addEventListener("resize", resize);
  bootInstall();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {});
  globalThis.__mystify = {
    version: "A",
    sim: Sim,
    get screen() { return screen; },
    get match() { return match; },
    get preview() { return preview; },
    get pick() { return pick; },
    start: startRun,
    setLang: setLang
  };
  requestAnimationFrame(frame);
})();
