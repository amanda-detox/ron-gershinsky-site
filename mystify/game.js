// מיסטיפיי · Mystify: 3D sci-fi arena shooter on a floating space platform (inspired by classic twin-tower space maps).
import * as THREE from './three.module.min.js';

// ---------- Weapon table: add a new weapon by adding one entry ----------
// type: 'beam' (straight glowing beam) or 'lightning' (jagged sparkling bolt). Ammo is infinite, no reload.
const WEAPONS = [
  { id: 'laser', he: 'רובה לייזר כחול', en: 'Blue Laser Rifle', type: 'beam', color: 0x3d7bff, glow: 0x9cc0ff, cooldown: 0.16, damage: 18, range: 220, width: 0.09, life: 0.12 },
  { id: 'lightning', he: 'רובה ברק לבן', en: 'White Lightning Gun', type: 'lightning', color: 0xffffff, glow: 0xdfe8ff, cooldown: 0.9, damage: 70, range: 320, width: 0.05, life: 0.35 }
];

const T = {
  he: { title: 'מיסטיפיי', sub: 'יריות בחלל: שני מגדלים, פלטפורמה מרחפת, כבידה נמוכה ותחמושת אינסופית.', play: 'שחק', resume: 'המשך', bots: n => 'בוטים: ' + n, sens: s => 'רגישות: ' + s,
    help: 'מחשב: WASD לתנועה, עכבר לכיוון, קליק לירי, רווח לקפיצה, 1/2 או גלגלת להחלפת נשק, Esc לתפריט.<br>נייד: ג׳ויסטיק משמאל, גרירה בצד ימין לכיוון, כפתורי ירי וקפיצה.',
    hp: 'חיים', score: 'ניקוד', deaths: 'נפילות', fire: 'ירי', jump: 'קפיצה', you: 'אתה', fell: 'נפל לחלל', lang: 'English', killed: (a, b) => a + ' ⟵ ' + b },
  en: { title: 'Mystify', sub: 'Space arena: two towers, a floating platform, low gravity and infinite ammo.', play: 'Play', resume: 'Resume', bots: n => 'Bots: ' + n, sens: s => 'Sensitivity: ' + s,
    help: 'Desktop: WASD move, mouse aim, click fire, Space jump, 1/2 or wheel switch weapon, Esc menu.<br>Mobile: joystick on the left, drag on the right to aim, fire and jump buttons.',
    hp: 'Health', score: 'Score', deaths: 'Deaths', fire: 'FIRE', jump: 'JUMP', you: 'You', fell: 'fell into space', lang: 'עברית', killed: (a, b) => a + ' → ' + b }
};
const $ = id => document.getElementById(id);
let lang = (() => { try { return localStorage.getItem('rg-lang') === 'en' ? 'en' : 'he'; } catch (e) { return 'he'; } })();
let botCount = 3, sens = 2;
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

// ---------- Renderer / scene ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040f);
scene.fog = new THREE.Fog(0x02040f, 160, 420);
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
scene.add(new THREE.HemisphereLight(0x9cb8ff, 0x10183a, 0.9));
const sun = new THREE.DirectionalLight(0xfff1cc, 1.6); sun.position.set(80, 120, 40); scene.add(sun);

// stars
{
  const n = 3000, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(900 + Math.random() * 300); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false })));
}
// planet (blue with gold ring)
{
  const pc = document.createElement('canvas'); pc.width = 256; pc.height = 128; const x = pc.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#0b1d6b'); gr.addColorStop(.5, '#2c5cff'); gr.addColorStop(1, '#081040');
  x.fillStyle = gr; x.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(160,190,255,${Math.random() * .25})`; x.fillRect(0, Math.random() * 128, 256, 2 + Math.random() * 5); }
  const planet = new THREE.Mesh(new THREE.SphereGeometry(260, 48, 32), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(pc), roughness: 1, fog: false }));
  planet.position.set(-380, -320, -700); scene.add(planet);
  const ring = new THREE.Mesh(new THREE.RingGeometry(330, 420, 96), new THREE.MeshBasicMaterial({ color: 0xf3cf6b, transparent: true, opacity: .35, side: THREE.DoubleSide, fog: false }));
  ring.position.copy(planet.position); ring.rotation.x = 1.25; ring.rotation.y = .3; scene.add(ring);
}

// ---------- Level: long floating platform, two towers ----------
const solids = []; // { box: Box3, mesh }
const matPlat = new THREE.MeshStandardMaterial({ color: 0x24305e, roughness: .8, metalness: .3 });
const matTower = new THREE.MeshStandardMaterial({ color: 0x2c4aa8, roughness: .6, metalness: .4 });
const matGold = new THREE.MeshStandardMaterial({ color: 0xf3cf6b, emissive: 0x4a3510, roughness: .35, metalness: .8 });
function block(w, h, d, x, y, z, mat = matPlat, solid = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y + h / 2, z); scene.add(m);
  if (solid) solids.push({ box: new THREE.Box3().setFromObject(m), mesh: m });
  return m;
}
const L = 150; // platform length (z from -L/2 to L/2)
block(26, 2, L, 0, -2, 0);                                  // main deck, top at y=0
block(1, .4, L, -13, 0, 0, matGold, false); block(1, .4, L, 13, 0, 0, matGold, false); // gold edge strips
for (const s of [-1, 1]) {
  const z = s * (L / 2 - 12);
  // tower: hollow-ish square with a roof platform and a mid ledge
  block(14, 22, 2, 0, 0, z + s * 7, matTower);             // back wall
  block(2, 22, 14, -7, 0, z, matTower); block(2, 22, 14, 7, 0, z, matTower);
  block(16, 1.5, 16, 0, 22, z, matTower);                   // roof (sniper spot)
  block(16, .5, 1, 0, 23.5, z - s * 8, matGold, false);
  block(10, 1, 6, 0, 10, z + s * 3, matTower);              // inner ledge
  block(3, 30, 3, 0, 23.5, z + s * 5, matGold, false);       // antenna spire (decor)
  // steps to the ledge, then jump to the roof (low gravity makes it reachable)
  block(6, 3, 4, 0, 0, z - s * 12); block(6, 6, 4, -6, 0, z - s * 4);
  // side crates mid-field
  block(4, 4, 4, -8, 0, s * 25); block(4, 8, 4, 8, 0, s * 40);
}
block(8, 1, 22, 0, 6, 0); // floating centre bridge
const deckTop = 0;

// ---------- Effects ----------
const fx = [];
function addBeam(from, to, w) {
  const len = from.distanceTo(to), mid = from.clone().add(to).multiplyScalar(.5);
  const grp = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(w.width, w.width, len, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending }));
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(w.width * 4, w.width * 4, len, 8, 1, true), new THREE.MeshBasicMaterial({ color: w.color, transparent: true, opacity: .45, blending: THREE.AdditiveBlending, depthWrite: false }));
  grp.add(core, glow); grp.position.copy(mid); grp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  scene.add(grp); fx.push({ obj: grp, t: 0, life: w.life, mats: [core.material, glow.material] });
}
function addLightning(from, to, w) {
  const pts = [], n = Math.max(8, Math.floor(from.distanceTo(to) / 3)), dir = to.clone().sub(from);
  for (let i = 0; i <= n; i++) { const p = from.clone().addScaledVector(dir, i / n); if (i && i < n) p.add(new THREE.Vector3().randomDirection().multiplyScalar(.6 + Math.random() * .8)); pts.push(p); }
  const grp = new THREE.Group(), mats = [];
  for (let k = 0; k < 3; k++) {
    const jit = pts.map((p, i) => i && i < n ? p.clone().add(new THREE.Vector3().randomDirection().multiplyScalar(.35)) : p.clone());
    const m = new THREE.LineBasicMaterial({ color: k ? w.glow : 0xffffff, transparent: true, blending: THREE.AdditiveBlending });
    grp.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(jit), m)); mats.push(m);
  }
  // sparkles along the bolt
  const sp = new Float32Array(60 * 3);
  for (let i = 0; i < 60; i++) { const p = from.clone().addScaledVector(dir, Math.random()).add(new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 1.2)); sp.set([p.x, p.y, p.z], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sm = new THREE.PointsMaterial({ color: 0xffffff, size: .35, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  grp.add(new THREE.Points(sg, sm)); mats.push(sm);
  scene.add(grp); fx.push({ obj: grp, t: 0, life: w.life, mats, flicker: true });
  const flash = new THREE.PointLight(0xdfe8ff, 6, 30); flash.position.copy(to); scene.add(flash); fx.push({ obj: flash, t: 0, life: .15, mats: [], light: true });
}
function updateFx(dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t += dt; const k = 1 - f.t / f.life;
    if (f.light) f.obj.intensity = 6 * Math.max(0, k);
    f.mats.forEach(m => { m.opacity = Math.max(0, k) * (f.flicker ? .5 + Math.random() * .5 : 1); });
    if (f.t >= f.life) { scene.remove(f.obj); f.obj.traverse(o => { o.geometry && o.geometry.dispose(); o.material && o.material.dispose(); }); fx.splice(i, 1); }
  }
}

// ---------- Actors ----------
const GRAV = 11, JUMP = 15, SPEED = 11, RADIUS = .6, HEIGHT = 1.8, EYE = 1.6;
function spawnPoint() { const s = Math.random() < .5 ? -1 : 1; return new THREE.Vector3((Math.random() - .5) * 18, 1, s * (L / 2 - 30) + (Math.random() - .5) * 10); }
function makeActor(isBot, name) {
  const a = { isBot, name, pos: spawnPoint(), vel: new THREE.Vector3(), yaw: 0, pitch: 0, hp: 100, onGround: false, wpn: 0, cd: 0, score: 0, deaths: 0, mesh: null, ai: { t: 0, target: null, strafe: 1 } };
  if (isBot) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(.55, .9, 4, 10), new THREE.MeshStandardMaterial({ color: 0xf3cf6b, emissive: 0x3a2808, metalness: .7, roughness: .3 }));
    body.position.y = 1.0;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(.7, .18, .2), new THREE.MeshBasicMaterial({ color: 0x7fb0ff })); visor.position.set(0, 1.45, -.45);
    g.add(body, visor); scene.add(g); a.mesh = g; a.wpn = Math.random() < .5 ? 0 : 1;
  }
  return a;
}
const player = makeActor(false, 'you');
let bots = [];
function resetBots() { bots.forEach(b => scene.remove(b.mesh)); bots = []; for (let i = 0; i < botCount; i++) bots.push(makeActor(true, 'Bot ' + (i + 1))); }

function groundAt(x, z, y) { // highest solid top under (x,z) not above feet + step
  let g = -Infinity;
  for (const s of solids) { const b = s.box; if (x > b.min.x - RADIUS * .5 && x < b.max.x + RADIUS * .5 && z > b.min.z - RADIUS * .5 && z < b.max.z + RADIUS * .5 && b.max.y <= y + .6 && b.max.y > g) g = b.max.y; }
  return g;
}
function collideXZ(p) {
  for (const s of solids) {
    const b = s.box;
    if (p.y + HEIGHT <= b.min.y || p.y >= b.max.y - .05) continue;
    if (p.x > b.min.x - RADIUS && p.x < b.max.x + RADIUS && p.z > b.min.z - RADIUS && p.z < b.max.z + RADIUS) {
      const dx1 = p.x - (b.min.x - RADIUS), dx2 = (b.max.x + RADIUS) - p.x, dz1 = p.z - (b.min.z - RADIUS), dz2 = (b.max.z + RADIUS) - p.z;
      const m = Math.min(dx1, dx2, dz1, dz2);
      if (m === dx1) p.x -= dx1; else if (m === dx2) p.x += dx2; else if (m === dz1) p.z -= dz1; else p.z += dz2;
    }
  }
}
function ceilingHit(p) { for (const s of solids) { const b = s.box; if (p.x > b.min.x && p.x < b.max.x && p.z > b.min.z && p.z < b.max.z && p.y + HEIGHT > b.min.y && p.y < b.min.y) return b.min.y; } return null; }
function physics(a, wish, wantJump, dt) {
  const accel = a.onGround ? 12 : 3;
  a.vel.x += (wish.x * SPEED - a.vel.x) * Math.min(1, accel * dt);
  a.vel.z += (wish.z * SPEED - a.vel.z) * Math.min(1, accel * dt);
  if (wantJump && a.onGround) { a.vel.y = JUMP; a.onGround = false; }
  a.vel.y -= GRAV * dt;
  a.pos.x += a.vel.x * dt; a.pos.z += a.vel.z * dt; collideXZ(a.pos);
  const prevY = a.pos.y; a.pos.y += a.vel.y * dt;
  if (a.vel.y > 0) { const c = ceilingHit(a.pos); if (c !== null) { a.pos.y = c - HEIGHT; a.vel.y = 0; } }
  const g = groundAt(a.pos.x, a.pos.z, Math.max(prevY, a.pos.y));
  if (a.vel.y <= 0 && a.pos.y <= g) { a.pos.y = g; a.vel.y = 0; a.onGround = true; } else if (a.pos.y > g + .05) a.onGround = false;
  if (a.pos.y < -60) { kill(a, null); }
}

// ---------- Shooting ----------
const ray = new THREE.Raycaster(), tmp = new THREE.Vector3();
function eyeOf(a) { return a.pos.clone().add(new THREE.Vector3(0, EYE, 0)); }
function dirOf(a) { return new THREE.Vector3(-Math.sin(a.yaw) * Math.cos(a.pitch), Math.sin(a.pitch), -Math.cos(a.yaw) * Math.cos(a.pitch)); }
function fire(a, dirOverride) {
  const w = WEAPONS[a.wpn]; if (a.cd > 0 || a.hp <= 0) return; a.cd = w.cooldown;
  const from = eyeOf(a), dir = dirOverride || dirOf(a);
  ray.set(from, dir); ray.far = w.range;
  let best = w.range, hitActor = null;
  for (const s of solids) { const p = ray.ray.intersectBox(s.box, tmp); if (p) { const d = p.distanceTo(from); if (d < best) best = d; } }
  for (const t of [player, ...bots]) {
    if (t === a || t.hp <= 0) continue;
    const c = t.pos.clone().add(new THREE.Vector3(0, 1, 0));
    const sph = new THREE.Sphere(c, .9), p = ray.ray.intersectSphere(sph, tmp);
    if (p) { const d = p.distanceTo(from); if (d < best) { best = d; hitActor = t; } }
  }
  const muzzle = from.clone().add(dir.clone().multiplyScalar(.8)).add(new THREE.Vector3(0, -.25, 0));
  const end = from.clone().addScaledVector(dir, best);
  (w.type === 'lightning' ? addLightning : addBeam)(muzzle, end, w);
  sfx(w.type);
  if (hitActor) damage(hitActor, w.damage, a);
}
function damage(t, dmg, src) {
  t.hp -= dmg;
  if (t === player) { $('hurt').style.opacity = 1; setTimeout(() => $('hurt').style.opacity = 0, 180); }
  if (t.hp <= 0) kill(t, src);
}
function kill(t, src) {
  t.deaths++; if (src && src !== t) src.score++;
  feed(src ? T[lang].killed(nm(src), nm(t)) : nm(t) + ' ' + T[lang].fell);
  t.hp = 100; t.pos.copy(spawnPoint()); t.vel.set(0, 0, 0);
  if (t === player) { t.yaw = t.pos.z > 0 ? 0 : Math.PI; t.pitch = 0; }
}
function nm(a) { return a === player ? T[lang].you : a.name; }
let feedT = 0; function feed(s) { $('feed').textContent = s; feedT = 3; }

// ---------- Sound (WebAudio, generated) ----------
let ac = null;
function sfx(type) {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const t = ac.currentTime, g = ac.createGain(); g.connect(ac.destination);
    if (type === 'beam') { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(1400, t); o.frequency.exponentialRampToValueAtTime(300, t + .12); g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.001, t + .14); o.connect(g); o.start(t); o.stop(t + .15); }
    else { const n = ac.createBufferSource(), b = ac.createBuffer(1, ac.sampleRate * .35, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) * (Math.random() < .3 ? 1 : .2); n.buffer = b; g.gain.value = .12; n.connect(g); n.start(t); }
  } catch (e) {}
}

// ---------- Bot AI ----------
function botThink(b, dt) {
  const ai = b.ai; ai.t -= dt;
  const foes = [player, ...bots].filter(o => o !== b && o.hp > 0);
  if (!ai.target || ai.t <= 0 || ai.target.hp <= 0) {
    ai.target = foes.sort((p, q) => p.pos.distanceTo(b.pos) - q.pos.distanceTo(b.pos))[Math.random() < .6 ? 0 : Math.floor(Math.random() * foes.length)];
    ai.t = 2 + Math.random() * 3; ai.strafe = Math.random() < .5 ? -1 : 1;
  }
  const tg = ai.target, to = tg.pos.clone().sub(b.pos), dist = to.length();
  b.yaw = Math.atan2(-to.x, -to.z);
  const fwd = new THREE.Vector3(-Math.sin(b.yaw), 0, -Math.cos(b.yaw)), right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const wish = new THREE.Vector3().addScaledVector(fwd, dist > 18 ? 1 : dist < 8 ? -.6 : 0).addScaledVector(right, ai.strafe * .8);
  // stay on the deck
  if (Math.abs(b.pos.x) > 10) wish.x = -Math.sign(b.pos.x); if (Math.abs(b.pos.z) > L / 2 - 4) wish.z = -Math.sign(b.pos.z);
  if (wish.lengthSq() > 1) wish.normalize();
  physics(b, wish, Math.random() < .01, dt);
  b.cd -= dt;
  if (dist < 90 && b.cd <= 0) {
    const aim = eyeOf(tg).sub(eyeOf(b)).normalize().add(new THREE.Vector3().randomDirection().multiplyScalar(.07 + dist * .002)).normalize();
    fire(b, aim); b.cd += .4 + Math.random() * .8;
  }
  b.mesh.position.copy(b.pos); b.mesh.rotation.y = b.yaw;
}

// ---------- Input ----------
const keys = {}; let running = false, look = { dx: 0, dy: 0 }, firing = false, jumpReq = false, stick = { x: 0, y: 0 };
addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Digit1') player.wpn = 0; if (e.code === 'Digit2') player.wpn = 1;
  if (/^Digit\d$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (WEAPONS[i]) player.wpn = i; }
  if (e.code === 'KeyQ') swap(); if (e.code === 'Escape' && running && isTouch) pause();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('wheel', e => { if (running) swap(e.deltaY > 0 ? 1 : -1); });
function swap(d = 1) { player.wpn = (player.wpn + d + WEAPONS.length) % WEAPONS.length; hud(); }
canvas.addEventListener('mousedown', () => { if (running && !isTouch) { if (document.pointerLockElement !== canvas) canvas.requestPointerLock(); else firing = true; } });
addEventListener('mouseup', () => { if (!isTouch) firing = false; });
addEventListener('mousemove', e => { if (document.pointerLockElement === canvas) { look.dx += e.movementX; look.dy += e.movementY; } });
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && running && !isTouch) pause(); });

// touch: joystick (left), look-drag (anywhere else), buttons
const touchEl = $('touch'), stickEl = $('stick'), knob = $('knob'); let stickId = null, lookId = null, lx = 0, ly = 0;
touchEl.addEventListener('pointerdown', e => {
  const id = e.target.id;
  if (id === 'tFire') { firing = true; e.target.dataset.pid = e.pointerId; return; }
  if (id === 'tJump') { jumpReq = true; return; }
  if (id === 'tSwap') { swap(); return; }
  if (id === 'tMenu') { pause(); return; }
  if (e.clientX < innerWidth * .4 && stickId === null) { stickId = e.pointerId; moveStick(e); }
  else if (lookId === null) { lookId = e.pointerId; lx = e.clientX; ly = e.clientY; }
});
touchEl.addEventListener('pointermove', e => {
  if (e.pointerId === stickId) moveStick(e);
  else if (e.pointerId === lookId) { look.dx += (e.clientX - lx) * 2.2; look.dy += (e.clientY - ly) * 2.2; lx = e.clientX; ly = e.clientY; }
});
function endTouch(e) {
  if (e.pointerId === stickId) { stickId = null; stick.x = stick.y = 0; knob.style.transform = ''; }
  if (e.pointerId === lookId) lookId = null;
  if ($('tFire').dataset.pid == e.pointerId) { firing = false; $('tFire').dataset.pid = ''; }
}
['pointerup', 'pointercancel'].forEach(ev => touchEl.addEventListener(ev, endTouch));
function moveStick(e) {
  const r = stickEl.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy), max = r.width / 2;
  if (m > max) { dx *= max / m; dy *= max / m; }
  stick.x = dx / max; stick.y = dy / max; knob.style.transform = `translate(${dx}px,${dy}px)`;
}

// ---------- Menu / HUD ----------
function applyLang() {
  const t = T[lang]; document.documentElement.lang = lang; document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  $('title').textContent = t.title; $('sub').textContent = t.sub; $('play').textContent = started ? t.resume : t.play;
  $('bots').textContent = t.bots(botCount); $('sens').textContent = t.sens(sens); $('help').innerHTML = t.help;
  $('lHp').textContent = t.hp; $('lScore').textContent = t.score; $('lDeaths').textContent = t.deaths;
  $('tFire').textContent = t.fire; $('tJump').textContent = t.jump; $('langBtn').textContent = t.lang; hud();
}
function hud() {
  $('hp').textContent = Math.max(0, Math.round(player.hp)); $('score').textContent = player.score; $('deaths').textContent = player.deaths;
  const w = WEAPONS[player.wpn]; $('wpn').textContent = (player.wpn + 1) + ' · ' + w[lang] + ' · ∞';
}
let started = false;
function start() {
  if (!started) { resetBots(); started = true; player.pos.copy(spawnPoint()); player.yaw = player.pos.z > 0 ? 0 : Math.PI; }
  running = true; $('menu').classList.add('hidden'); $('hud').classList.remove('hidden');
  if (isTouch) { $('touch').classList.remove('hidden'); try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {} }
  else canvas.requestPointerLock && canvas.requestPointerLock();
  applyLang();
}
function pause() { running = false; firing = false; $('menu').classList.remove('hidden'); $('touch').classList.add('hidden'); applyLang(); }
$('play').onclick = start;
$('bots').onclick = () => { botCount = botCount % 6 + 1; if (started) resetBots(); applyLang(); };
$('sens').onclick = () => { sens = sens % 5 + 1; applyLang(); };
$('langBtn').addEventListener('click', () => { lang = lang === 'he' ? 'en' : 'he'; try { localStorage.setItem('rg-lang', lang); } catch (e) {} applyLang(); });

// ---------- Loop ----------
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const clock = new THREE.Clock(); let menuSpin = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  if (running) {
    const k = .0011 * sens; player.yaw -= look.dx * k; player.pitch = Math.max(-1.5, Math.min(1.5, player.pitch - look.dy * k)); look.dx = look.dy = 0;
    const fwd = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)), right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    let f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) - stick.y, r = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + stick.x;
    const wish = fwd.multiplyScalar(f).addScaledVector(right, r); if (wish.lengthSq() > 1) wish.normalize();
    physics(player, wish, keys.Space || jumpReq, dt); jumpReq = false;
    player.cd -= dt; if (firing) fire(player);
    bots.forEach(b => botThink(b, dt));
    if (feedT > 0 && (feedT -= dt) <= 0) $('feed').textContent = '';
    hud();
    camera.position.copy(eyeOf(player)); camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  } else {
    menuSpin += dt * .08; camera.position.set(Math.sin(menuSpin) * 70, 35, Math.cos(menuSpin) * 90); camera.lookAt(0, 8, 0);
  }
  updateFx(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
applyLang(); frame();
window.Mystify = { WEAPONS, player, get bots() { return bots; }, start, fire: () => fire(player), state: () => ({ running, hp: player.hp, score: player.score, bots: bots.length, fx: fx.length, y: player.pos.y }) };
