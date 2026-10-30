/* פלייפיי · Flyify — relaxed 3D flying. three.js r170 (vendored, MIT). */
import * as THREE from './three.module.min.js';

const $ = (id) => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (k, dt) => 1 - Math.exp(-k * dt);

/* ================= texts ================= */
const T = {
  he: {
    title: 'פלייפיי', tag: 'עפים בחופשיות בעולמות של אור', choose: 'בוחרים דמות', world: 'עולם', view: 'זווית צפייה',
    start: 'להמריא ✨', install: '📲 התקנה למסך הבית', score: 'ניצוצות', up: 'למעלה', down: 'למטה', speed: 'מהירות',
    lang: 'English', themeDark: '☀️ מצב יום', themeLight: '🌙 מצב לילה',
    helpTouch: 'מימין למטה: ג׳ויסטיק – גוררים לכל כיוון. משמאל למטה: עיגול כלים – נגיעה מפעילה, החלקה מחליפה טבעת (כוחות, תעופה, אווירה), לחיצה ארוכה מראה את השם. אוספים ניצוצות ועוברים בטבעות הזהובות.',
    helpDesk: 'חיצים או WASD: פנייה, עלייה וירידה. רווח למעלה, Shift למטה, 1/2/3 או F למהירות. Z X C V: ארבעת הכלים בטבעת, Q / E: החלפת טבעת. Esc לתפריט. אוספים ניצוצות ועוברים בטבעות הזהובות.',
    tools: ['האצה', 'מגן', 'מגנט', 'האטת זמן', 'סלטה', 'נחיתה והליכה', 'שובל אור – נקודות כפולות', 'חבר למסע', 'מצב צילום', 'מוזיקה', 'צבע השובל', 'יום / לילה'],
    rings: ['כוחות', 'תעופה', 'אווירה'], on: 'פועל', off: 'כבוי', day: 'יום', night: 'לילה', saved: 'התמונה נשמרה',
    landing: 'נוחתים…', hover: 'ריחוף במקום', takeoff: 'ממריאים!', trailNames: ['כחול', 'זהב', 'לבן', 'סגול', 'ורוד', 'קשת'],
    buddy: 'חבר למסע', tutorial: '🎓 הדרכה', tSkip: 'דלג', tNext: 'הבא', tDone: 'יאללה!',
    tJoy: 'גוררים כאן כדי לעוף', tPow: 'נוגעים בכוח כדי להפעיל', tSwipe: 'מחליקים כדי להחליף טבעת', tFlight: 'טבעת תעופה: סלטה, נחיתה ועוד', tAtmo: 'טבעת אווירה: צילום, מוזיקה ועוד', tCam: 'כאן מחליפים זווית. תהנה!',
    photoHint: 'גוררים כדי לסובב',
    keys: 'חיצים / WASD · רווח ↑ · Shift ↓ · Z X C V כלים · Q E טבעת · Esc תפריט',
    copy: '© כל הזכויות שמורות לחברת היליפיי בע"מ 2026',
    nogl: 'הדפדפן הזה לא תומך בתלת־ממד (WebGL). כדאי לנסות ב־Chrome או ב־Safari מעודכנים.',
    ring: ['יפה!', 'נהדר!', 'איזה מעוף!', 'מעולה!', 'זוהר!'], back: 'חוזרים לאזור המעוף', best: 'שיא חדש!', mul: 'קצב', hole: '🕳️ חור שחור! +50', wh: '⚪ חור לבן! +100', whSub: 'עברת לגלקסיה אחרת', whSeen: '⚪ חור לבן לפניך! עוף לתוכו', bonus: '🎉 בונוס! +400', bonusSub: 'על כל 369 נקודות שצברת', lb: '🏆 טבלת אלופים', lbTitle: 'טבלת אלופים', lbTotal: 'סך הכול', lbBest: 'שיא', lbMine: 'הנקודות שלי', lbGames: 'משחקים', lbNext: 'לבונוס הבא', lbEmpty: 'עדיין אין שחקנים בטבלה', lbLoad: 'טוען…', lbErr: 'לא הצלחתי לטעון את הטבלה', lbSignIn: 'כדי להופיע בטבלה ולשמור נקודות בין מכשירים — מתחברים בתפריט למעלה', lbClose: 'סגירה', player: 'שחקן', combo: 'קומבו', comet: '☄️ שביט זהב! +200', cometSub: 'תפסת את השביט הנדיר', cometSeen: '☄️ שביט זהב! תפוס אותו', streak: '🔥 רצף ימים', streakDay: 'יום', streakBonus: (d, n) => d > 1 ? `🔥 רצף ${d} ימים! +${n}` : `🔥 יום ראשון ברצף! +${n}`, streakSub: 'בונוס יומי על משחק ברצף',
    spd: ['איטי', 'רגיל', 'מהיר'], resume: 'להמשיך לעוף ✨',
    chars: ['גבר', 'אישה', 'ילד', 'ילדה', 'חתול מכונף', 'רובוט ידידותי', 'אסטרונאוט עם תרמיל סילון', 'גיבור על בגלימה', 'קוסם על שטיח מעופף', 'לווייתן שמיים', 'גריפון'],
    envs: ['הרים מושלגים', 'מערכת השמש', 'גלקסיה אחרת', 'יקום ממימד אחר', 'אטלנטיס מתחת למים', 'ממלכת העננים', 'ציוויליזציה חוצנית מתקדמת'],
    cams: ['מאחורי הדמות', 'מבעד לעיניים', 'מהצד']
  },
  en: {
    title: 'Flyify', tag: 'Fly freely through worlds of light', choose: 'Choose a character', world: 'World', view: 'Camera view',
    start: 'Take off ✨', install: '📲 Install to home screen', score: 'Sparks', up: 'Up', down: 'Down', speed: 'Speed',
    lang: 'עברית', themeDark: '☀️ Day mode', themeLight: '🌙 Night mode',
    helpTouch: 'Bottom right: joystick – drag any way. Bottom left: tools circle – tap to use, swipe to switch ring (Powers, Flight, Atmosphere), long-press to see the name. Collect sparks and fly through the golden rings.',
    helpDesk: 'Arrows or WASD: turn, climb and dive. Space up, Shift down, 1/2/3 or F for speed. Z X C V: the four tools on the ring, Q / E: switch ring. Esc for the menu. Collect sparks and fly through the golden rings.',
    tools: ['Speed boost', 'Shield', 'Magnet', 'Slow time', 'Roll', 'Land & walk', 'Light trail – double points', 'Companion', 'Photo mode', 'Music', 'Trail color', 'Day / night'],
    rings: ['Powers', 'Flight', 'Atmosphere'], on: 'On', off: 'Off', day: 'Day', night: 'Night', saved: 'Photo saved',
    landing: 'Landing…', hover: 'Hovering in place', takeoff: 'Take off!', trailNames: ['Blue', 'Gold', 'White', 'Purple', 'Pink', 'Rainbow'],
    buddy: 'Companion', tutorial: '🎓 Tutorial', tSkip: 'Skip', tNext: 'Next', tDone: "Let's fly!",
    tJoy: 'Drag here to fly', tPow: 'Tap a power to use it', tSwipe: 'Swipe to switch rings', tFlight: 'Flight ring: roll, land and more', tAtmo: 'Atmosphere: photo, music and more', tCam: 'Change the view here. Enjoy!',
    photoHint: 'Drag to look around',
    keys: 'Arrows / WASD · Space ↑ · Shift ↓ · Z X C V tools · Q E ring · Esc menu',
    copy: '© 2026 Healify Ltd. All rights reserved.',
    nogl: 'This browser does not support 3D (WebGL). Please try an up-to-date Chrome or Safari.',
    ring: ['Lovely!', 'Wonderful!', 'What a flight!', 'Great!', 'Glowing!'], back: 'Heading back to the flying area', best: 'New best!', mul: 'Pace', hole: '🕳️ Black hole! +50', wh: '⚪ White hole! +100', whSub: 'You jumped to another galaxy', whSeen: '⚪ White hole ahead! Fly into it', bonus: '🎉 Bonus! +400', bonusSub: 'for every 369 points you collect', lb: '🏆 Leaderboard', lbTitle: 'Leaderboard', lbTotal: 'Total', lbBest: 'Best', lbMine: 'My points', lbGames: 'Games', lbNext: 'to next bonus', lbEmpty: 'No players on the board yet', lbLoad: 'Loading…', lbErr: 'Could not load the board', lbSignIn: 'Sign in (menu at the top) to join the board and keep points across devices', lbClose: 'Close', player: 'Player', combo: 'Combo', comet: '☄️ Golden comet! +200', cometSub: 'You caught the rare comet', cometSeen: '☄️ Golden comet! Catch it', streak: '🔥 Day streak', streakDay: 'day', streakBonus: (d, n) => d > 1 ? `🔥 ${d}-day streak! +${n}` : `🔥 Day 1 streak! +${n}`, streakSub: 'Daily bonus for playing in a row',
    spd: ['Slow', 'Normal', 'Fast'], resume: 'Keep flying ✨',
    chars: ['Man', 'Woman', 'Boy', 'Girl', 'Winged cat', 'Friendly robot', 'Jetpack Astronaut', 'Caped Hero', 'Wizard on a Flying Carpet', 'Sky Whale', 'Griffin'],
    envs: ['Snowy mountains', 'The solar system', 'Another galaxy', 'Universe from another dimension', 'Atlantis underwater', 'Cloud kingdom', 'Alien civilization'],
    cams: ['Behind the character', 'Through its eyes', 'Side view']
  }
};
const CHAR_EMOJI = ['🧑', '👩', '👦', '👧', '🐱', '🤖', '🧑‍🚀', '🦸', '🧙', '🐋', '🦅'];
const ENV_IDS = ['snow', 'solar', 'galaxy', 'dimension', 'atlantis', 'clouds', 'alien'];
const CAM_IDS = ['third', 'first', 'side'];

let lang = store.get('rg-lang', 'he') === 'en' ? 'en' : 'he';
let theme = store.get('rg-fly-theme', 'dark') === 'light' ? 'light' : 'dark';
// v3 characters are saved under a new key; an old saved choice is carried over (removed characters fall back to the first one)
let charIdx = parseInt(store.get('rg-fly-char3', ''), 10);
if (!(charIdx >= 0 && charIdx < CHAR_EMOJI.length)) { const old = parseInt(store.get('rg-fly-char', '0'), 10) || 0; charIdx = ({ 0: 0, 1: 1, 2: 2, 3: 3, 6: 4, 7: 5 })[old] ?? 0; }
let envIdx = clamp(parseInt(store.get('rg-fly-env', '0'), 10) || 0, 0, ENV_IDS.length - 1);
let camIdx = parseInt(store.get('rg-fly-cam', '0'), 10) || 0;
if (camIdx < 0 || camIdx >= CAM_IDS.length) camIdx = 0; // old saved top-down view (removed) falls back to behind the character
let best = parseInt(store.get('rg-fly-best', '0'), 10) || 0;
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0;

/* ================= renderer ================= */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('c'), antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  $('nogl').classList.remove('hidden'); $('menu').classList.add('hidden');
  document.querySelectorAll('#nogl [data-t]').forEach((el) => { el.textContent = T[lang][el.dataset.t]; });
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 2600);
const hemi = new THREE.HemisphereLight(0xffffff, 0x445577, 1.2);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
sunLight.position.set(0.5, 1, 0.3);
scene.add(hemi, sunLight, sunLight.target);

/* shared textures */
function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.75)'); r.addColorStop(0.6, 'rgba(255,255,255,.18)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = glowTex();
const glowSprite = (color, size, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.setScalar(size); return s;
};
const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, flatShading: true, roughness: 0.75, metalness: 0.05 }, o));
const E = (color, intensity = 1.2, o = {}) => M(color, Object.assign({ emissive: color, emissiveIntensity: intensity }, o));

/* sky dome */
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() } },
  vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: 'uniform vec3 top; uniform vec3 hor; uniform vec3 bot; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.55)) : mix(hor, bot, pow(-h, 0.55)); gl_FragColor = vec4(c, 1.0);\n#include <colorspace_fragment>\n}'
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(2000, 24, 12), skyMat);
sky.renderOrder = -1; sky.frustumCulled = false;
scene.add(sky);

/* ================= characters ================= */
function wingGeo(len, wid, feather) {
  const s = new THREE.Shape();
  s.moveTo(0, -wid * 0.35);
  if (feather) {
    s.lineTo(len * 0.55, -wid * 0.5); s.lineTo(len, -wid * 0.1);
    s.lineTo(len * 0.85, wid * 0.25); s.lineTo(len * 0.7, wid * 0.1); s.lineTo(len * 0.55, wid * 0.45); s.lineTo(len * 0.4, wid * 0.25); s.lineTo(len * 0.22, wid * 0.55); s.lineTo(0, wid * 0.4);
  } else {
    s.lineTo(len * 0.5, -wid * 0.55); s.lineTo(len, -wid * 0.25); s.lineTo(len * 0.8, wid * 0.05); s.lineTo(len * 0.62, wid * 0.4); s.lineTo(len * 0.38, wid * 0.15); s.lineTo(len * 0.2, wid * 0.5); s.lineTo(0, wid * 0.4);
  }
  const g = new THREE.ShapeGeometry(s); g.rotateX(Math.PI / 2); return g; // lies in XZ, +x outward
}
function addWings(root, geo, mat, x, y, z) {
  const R = new THREE.Group(), L = new THREE.Group();
  const mr = new THREE.Mesh(geo, mat), ml = new THREE.Mesh(geo, mat);
  ml.scale.x = -1; R.add(mr); L.add(ml);
  R.position.set(x, y, z); L.position.set(-x, y, z);
  root.add(R, L); return [R, L];
}
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const ball = (r, m, det = 1) => new THREE.Mesh(new THREE.IcosahedronGeometry(r, det), m);
const cone = (r, h, m, seg = 6) => new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m);
const cyl = (rt, rb, h, m, seg = 8) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);

/* humans and the robot are built standing (+y up, facing -z) and laid flat in superhero pose */
function human(o) {
  const st = new THREE.Group();
  const skin = M(o.skin), top = M(o.top), bottom = M(o.bottom), hair = M(o.hair), shoe = M(0x2a2f45);
  const torso = box(0.46, 0.62, 0.26, top); torso.position.y = 1.08; st.add(torso);
  const belt = box(0.47, 0.07, 0.27, M(0xf3cf6b, { metalness: 0.4 })); belt.position.y = 0.8; st.add(belt);
  const neck = cyl(0.07, 0.08, 0.1, skin); neck.position.y = 1.43; st.add(neck);
  const head = ball(o.kid ? 0.2 : 0.17, skin); head.position.y = o.kid ? 1.62 : 1.6; head.scale.set(1, 1.1, 1); st.add(head);
  const hy = head.position.y;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(o.kid ? 0.215 : 0.185, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  cap.position.set(0, hy + 0.02, 0.02); st.add(cap);
  if (o.long) { const lh = box(0.36, o.kid ? 0.34 : 0.48, 0.1, hair); lh.position.set(0, hy - 0.2, 0.15); st.add(lh); }
  if (o.pony) { const p = cone(0.07, 0.32, hair); p.position.set(0, hy - 0.05, 0.26); p.rotation.x = -2.3; st.add(p); }
  const eyeM = M(0x1a2040);
  for (const sx of [-1, 1]) { const e = ball(0.025, eyeM, 0); e.position.set(sx * 0.065, hy + 0.02, -0.16 - (o.kid ? 0.03 : 0)); st.add(e); }
  if (o.skirt) { const sk = cyl(0.25, 0.36, 0.34, bottom, 8); sk.position.y = 0.62; st.add(sk); }
  const legs = [];
  for (const sx of [-1, 1]) {
    const lg = new THREE.Group(); lg.position.set(sx * 0.12, 0.78, 0);
    const l = box(0.15, 0.68, 0.17, o.skirt ? skin : bottom); l.position.y = -0.36; lg.add(l);
    const f = box(0.16, 0.08, 0.26, shoe); f.position.set(0, -0.72, -0.04); lg.add(f);
    st.add(lg); legs.push(lg);
  }
  const arms = [];
  for (const sx of [-1, 1]) {
    const ag = new THREE.Group(); ag.position.set(sx * 0.3, 1.33, 0);
    const a = box(0.12, 0.6, 0.13, top); a.position.y = 0.3; ag.add(a);
    const h = ball(0.07, skin, 0); h.position.y = 0.64; ag.add(h);
    ag.rotation.z = -sx * 0.18; st.add(ag); arms.push(ag);
  }
  let cape = null;
  if (o.cape) {
    cape = new THREE.Group(); cape.position.set(0, 1.38, 0.15);
    const c = box(0.5, 1.05, 0.03, M(o.cape, { side: THREE.DoubleSide })); c.position.y = -0.52; cape.add(c); st.add(cape);
  }
  st.scale.setScalar(o.scale);
  st.position.y = -1.0 * o.scale;
  const pose = new THREE.Group(); pose.rotation.x = -Math.PI / 2 * 0.92; pose.add(st);
  const root = new THREE.Group(); root.add(pose);
  root.userData = {
    eye: new THREE.Vector3(0, 0.15, -0.75 * o.scale), size: o.scale, camDist: 4.2 * Math.max(o.scale, 0.85), stand: true,
    anim(t, s) {
      legs[0].rotation.x = Math.sin(t * 4) * 0.18 * (0.4 + s); legs[1].rotation.x = -Math.sin(t * 4) * 0.18 * (0.4 + s);
      if (cape) cape.rotation.x = -(0.25 + Math.sin(t * 9) * 0.1 + s * 0.2);
      arms[0].rotation.x = Math.sin(t * 1.3) * 0.06; arms[1].rotation.x = -Math.sin(t * 1.3) * 0.06;
      pose.position.y = Math.sin(t * 2) * 0.06;
    }
  };
  return root;
}
function robot() {
  const st = new THREE.Group();
  const metal = M(0x9fb3d9, { metalness: 0.55, roughness: 0.35 }), dark = M(0x3a4c7a, { metalness: 0.4 }), glow = E(0x6fe3ff, 1.6), gold = E(0xf3cf6b, 1.2);
  const body = box(0.6, 0.66, 0.4, metal); body.position.y = 1.05; st.add(body);
  const chest = ball(0.09, glow, 0); chest.position.set(0, 1.12, -0.21); st.add(chest);
  const head = box(0.44, 0.34, 0.38, metal); head.position.y = 1.6; st.add(head);
  const visor = box(0.36, 0.1, 0.02, glow); visor.position.set(0, 1.62, -0.2); st.add(visor);
  const smile = box(0.14, 0.03, 0.02, glow); smile.position.set(0, 1.51, -0.2); st.add(smile);
  const ant = cyl(0.015, 0.015, 0.2, dark); ant.position.y = 1.87; st.add(ant);
  const bulb = ball(0.05, gold, 0); bulb.position.y = 1.99; st.add(bulb);
  const flames = [];
  for (const sx of [-1, 1]) {
    const lg = box(0.18, 0.55, 0.2, dark); lg.position.set(sx * 0.16, 0.45, 0); st.add(lg);
    const jet = cyl(0.11, 0.08, 0.12, metal); jet.position.set(sx * 0.16, 0.12, 0); st.add(jet);
    const fl = cone(0.08, 0.4, E(0xffb347, 2), 6); fl.rotation.x = Math.PI; fl.position.set(sx * 0.16, -0.14, 0); st.add(fl); flames.push(fl);
    const ag = new THREE.Group(); ag.position.set(sx * 0.38, 1.3, 0);
    const a = box(0.13, 0.55, 0.14, metal); a.position.y = 0.28; ag.add(a);
    const hd = ball(0.08, dark, 0); hd.position.y = 0.6; ag.add(hd);
    ag.rotation.z = -sx * 0.2; st.add(ag);
  }
  st.position.y = -1.0;
  const pose = new THREE.Group(); pose.rotation.x = -Math.PI / 2 * 0.9; pose.add(st);
  const root = new THREE.Group(); root.add(pose);
  root.userData = {
    eye: new THREE.Vector3(0, 0.2, -0.8), size: 1, camDist: 4.4, stand: true,
    anim(t, s) { for (const f of flames) f.scale.set(1, 0.7 + Math.random() * 0.4 + s * 0.6, 1); bulb.material.emissiveIntensity = 0.8 + Math.sin(t * 5) * 0.6; pose.position.y = Math.sin(t * 2) * 0.06; }
  };
  return root;
}
/* creatures are built directly in flying orientation (forward -z, up +y) */
function cat() {
  const root = new THREE.Group();
  const fur = M(0xf0a35a), white = M(0xfff6e8), pink = M(0xff9fb0), black = M(0x1a1a28), gold = M(0xf3cf6b, { metalness: 0.3 }), wingM = M(0xffffff, { side: THREE.DoubleSide, emissive: 0x8899cc, emissiveIntensity: 0.15 });
  const body = ball(0.4, fur); body.scale.set(0.8, 0.75, 1.5); root.add(body);
  const belly = ball(0.33, white); belly.scale.set(0.7, 0.55, 1.3); belly.position.y = -0.12; root.add(belly);
  const head = ball(0.32, fur); head.position.set(0, 0.2, -0.7); root.add(head);
  const muzzle = ball(0.14, white); muzzle.scale.set(1.3, 0.8, 0.8); muzzle.position.set(0, 0.12, -0.97); root.add(muzzle);
  const nose = ball(0.04, pink, 0); nose.position.set(0, 0.18, -1.05); root.add(nose);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 6, 14), M(0x2c5cff)); collar.position.set(0, 0.05, -0.48); root.add(collar);
  const bell = ball(0.05, gold, 0); bell.position.set(0, -0.2, -0.5); root.add(bell);
  for (const sx of [-1, 1]) {
    const ear = cone(0.11, 0.24, fur, 4); ear.position.set(sx * 0.17, 0.48, -0.68); ear.rotation.z = -sx * 0.3; root.add(ear);
    const ein = cone(0.06, 0.14, pink, 4); ein.position.set(sx * 0.17, 0.47, -0.73); ein.rotation.z = -sx * 0.3; root.add(ein);
    const e = ball(0.06, black, 0); e.scale.y = 1.3; e.position.set(sx * 0.12, 0.27, -0.98); root.add(e);
    for (const z of [-0.35, 0.4]) { const l = box(0.1, 0.28, 0.1, fur); l.position.set(sx * 0.18, -0.32, z); l.rotation.x = z < 0 ? -0.7 : 0.7; root.add(l); }
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.1, 0.55); root.add(tail);
  const tc = cyl(0.05, 0.07, 0.7, fur, 6); tc.rotation.x = Math.PI / 2 - 0.5; tc.position.set(0, 0.15, 0.3); tail.add(tc);
  const wings = addWings(root, wingGeo(1.3, 0.8, true), wingM, 0.25, 0.25, -0.1);
  root.userData = {
    eye: new THREE.Vector3(0, 0.35, -1.0), size: 1, camDist: 4.3,
    anim(t, s) { const f = Math.sin(t * (4.5 + s * 3)) * 0.65; wings[0].rotation.z = f; wings[1].rotation.z = -f; tail.rotation.y = Math.sin(t * 2) * 0.4; }
  };
  return root;
}
/* --- new characters (v3) --- */
function astronaut() {
  const st = new THREE.Group();
  const suit = M(0xf2f5ff, { roughness: 0.6 }), trim = M(0x2c5cff), gold = M(0xf3cf6b, { metalness: 0.5, roughness: 0.35 }), dark = M(0x3a4c7a, { metalness: 0.4 });
  const visorM = M(0xf3cf6b, { metalness: 0.9, roughness: 0.15, emissive: 0x6a4a10, emissiveIntensity: 0.4 });
  const torso = box(0.52, 0.66, 0.34, suit); torso.position.y = 1.08; st.add(torso);
  const panel = box(0.22, 0.16, 0.02, trim); panel.position.set(0, 1.15, -0.18); st.add(panel);
  const lamp = ball(0.03, E(0x6fb4ff, 1.8), 0); lamp.position.set(0.06, 1.15, -0.2); st.add(lamp);
  const belt = box(0.53, 0.07, 0.35, trim); belt.position.y = 0.78; st.add(belt);
  const helmet = ball(0.27, suit, 2); helmet.position.y = 1.62; st.add(helmet);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10, -Math.PI * 0.75, Math.PI * 0.5, Math.PI * 0.28, Math.PI * 0.42), visorM);
  visor.position.set(0, 1.62, -0.06); st.add(visor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 16), trim); ring.rotation.x = Math.PI / 2; ring.position.y = 1.4; st.add(ring);
  // jetpack on the back (+z when standing; faces the sky while flying)
  const pack = box(0.46, 0.6, 0.24, M(0xc9d3ea, { metalness: 0.35, roughness: 0.45 })); pack.position.set(0, 1.1, 0.3); st.add(pack);
  const stripe = box(0.47, 0.06, 0.25, gold); stripe.position.set(0, 1.28, 0.3); st.add(stripe);
  const flames = [], puffs = [];
  for (const sx of [-1, 1]) {
    const tank = cyl(0.09, 0.09, 0.62, M(0x9fb3d9, { metalness: 0.5, roughness: 0.35 }), 10); tank.position.set(sx * 0.17, 1.12, 0.45); st.add(tank);
    const cap = ball(0.09, gold, 1); cap.position.set(sx * 0.17, 1.43, 0.45); st.add(cap);
    const noz = cyl(0.06, 0.1, 0.12, dark, 10); noz.position.set(sx * 0.17, 0.76, 0.45); st.add(noz);
    const fl = cone(0.085, 0.5, E(0xffb347, 2.2), 8); fl.rotation.x = Math.PI; fl.position.set(sx * 0.17, 0.46, 0.45); st.add(fl); flames.push(fl);
    const core = cone(0.045, 0.3, new THREE.MeshBasicMaterial({ color: 0xfff3c4 }), 8); core.rotation.x = Math.PI; core.position.set(sx * 0.17, 0.56, 0.45); st.add(core); flames.push(core);
    for (let i = 0; i < 6; i++) { const p = glowSprite(i % 2 ? 0xffd27a : 0xff9b4a, 0.3, 0.85); p.userData = { sx, ph: i / 6 }; st.add(p); puffs.push(p); }
  }
  const legs = [];
  for (const sx of [-1, 1]) {
    const lg = new THREE.Group(); lg.position.set(sx * 0.13, 0.78, 0);
    const l = box(0.17, 0.66, 0.19, suit); l.position.y = -0.35; lg.add(l);
    const b = box(0.19, 0.12, 0.28, trim); b.position.set(0, -0.72, -0.04); lg.add(b);
    st.add(lg); legs.push(lg);
    const ag = new THREE.Group(); ag.position.set(sx * 0.33, 1.33, 0);
    const a = box(0.14, 0.58, 0.15, suit); a.position.y = 0.29; ag.add(a);
    const g = ball(0.08, trim, 0); g.position.y = 0.62; ag.add(g);
    ag.rotation.z = -sx * 0.25; st.add(ag);
  }
  st.position.y = -1.0;
  const pose = new THREE.Group(); pose.rotation.x = -Math.PI / 2 * 0.9; pose.add(st);
  const root = new THREE.Group(); root.add(pose);
  root.userData = {
    eye: new THREE.Vector3(0, 0.2, -0.85), size: 1, camDist: 4.4, stand: true,
    anim(t, s) {
      flames.forEach((f, i) => f.scale.set(1, 0.75 + Math.random() * 0.35 + s * 0.7, 1));
      for (const p of puffs) { const u = p.userData, k = (t * (1.6 + s * 1.4) + u.ph) % 1; p.position.set(u.sx * 0.17 + Math.sin(k * 9 + u.ph * 20) * 0.05 * k, 0.3 - k * (1.1 + s * 0.8), 0.45 + Math.cos(k * 7) * 0.04 * k); p.scale.setScalar(0.2 + k * 0.45); p.material.opacity = 0.85 * (1 - k); }
      legs[0].rotation.x = Math.sin(t * 3) * 0.12; legs[1].rotation.x = -Math.sin(t * 3) * 0.12;
      lamp.material.emissiveIntensity = 1 + Math.sin(t * 4) * 0.8;
      pose.position.y = Math.sin(t * 2) * 0.06;
    }
  };
  return root;
}
function caped() {
  const st = new THREE.Group();
  const skin = M(0xd9a27e), suit = M(0x2c5cff, { roughness: 0.5 }), dark = M(0x1a2f8f), gold = M(0xf3cf6b, { metalness: 0.5, roughness: 0.3 }), hair = M(0x241a14);
  const torso = box(0.52, 0.66, 0.28, suit); torso.position.y = 1.08; st.add(torso);
  const chest = box(0.56, 0.22, 0.3, suit); chest.position.y = 1.3; st.add(chest);
  const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), E(0xf3cf6b, 0.6)); emblem.scale.set(1, 1.2, 0.3); emblem.position.set(0, 1.2, -0.16); st.add(emblem);
  const belt = box(0.53, 0.08, 0.29, gold); belt.position.y = 0.78; st.add(belt);
  const neck = cyl(0.08, 0.09, 0.1, skin); neck.position.y = 1.45; st.add(neck);
  const head = ball(0.17, skin); head.position.y = 1.62; head.scale.set(1, 1.1, 1); st.add(head);
  const capH = new THREE.Mesh(new THREE.SphereGeometry(0.185, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), hair); capH.position.set(0, 1.64, 0.02); st.add(capH);
  const mask = box(0.3, 0.07, 0.06, dark); mask.position.set(0, 1.64, -0.14); st.add(mask);
  for (const sx of [-1, 1]) { const e = ball(0.022, M(0xffffff), 0); e.position.set(sx * 0.065, 1.645, -0.175); st.add(e); }
  const legs = [];
  for (const sx of [-1, 1]) {
    const lg = new THREE.Group(); lg.position.set(sx * 0.13, 0.78, 0);
    const l = box(0.17, 0.66, 0.18, suit); l.position.y = -0.35; lg.add(l);
    const b = box(0.19, 0.24, 0.24, dark); b.position.set(0, -0.62, -0.02); lg.add(b);
    st.add(lg); legs.push(lg);
  }
  // arms reaching forward (above the head while standing = ahead while flying)
  const arms = [];
  for (const sx of [-1, 1]) {
    const ag = new THREE.Group(); ag.position.set(sx * 0.3, 1.38, 0);
    const a = box(0.13, 0.58, 0.14, suit); a.position.y = 0.29; ag.add(a);
    const c = box(0.15, 0.16, 0.16, gold); c.position.y = 0.5; ag.add(c);
    const f = ball(0.08, dark, 0); f.position.y = 0.64; ag.add(f);
    ag.rotation.z = sx > 0 ? -0.08 : 0.08; ag.rotation.x = 0; st.add(ag); arms.push(ag);
  }
  arms[0].rotation.set(0, 0, 0.1); // one fist reaching ahead
  arms[1].rotation.set(0, 0, -Math.PI + 0.35); // the other arm along the body
  // long cape in a chain of segments so it ripples
  const capeM = M(0xf3cf6b, { side: THREE.DoubleSide, roughness: 0.6 }), capeIn = M(0x1a2f8f, { side: THREE.DoubleSide });
  const cape = new THREE.Group(); cape.position.set(0, 1.42, 0.16); st.add(cape);
  const segs = []; let par = cape;
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group(); g.position.y = i === 0 ? 0 : -0.22; par.add(g);
    const w = 0.5 + i * 0.03, c = box(w, 0.23, 0.02, capeM); c.position.y = -0.11; g.add(c);
    const lin = box(w - 0.02, 0.22, 0.01, capeIn); lin.position.set(0, -0.11, -0.015); g.add(lin);
    segs.push(g); par = g;
  }
  st.position.y = -1.0;
  const pose = new THREE.Group(); pose.rotation.x = -Math.PI / 2 * 0.95; pose.add(st);
  const root = new THREE.Group(); root.add(pose);
  root.userData = {
    eye: new THREE.Vector3(0, 0.15, -0.8), size: 1, camDist: 4.4, stand: true,
    anim(t, s) {
      segs.forEach((g, i) => { g.rotation.x = (i === 0 ? -(0.35 + s * 0.2) : -0.04) - Math.abs(Math.sin(t * (7 + s * 4) - i * 0.9)) * (0.1 + i * 0.03); g.rotation.z = Math.sin(t * 3 - i) * 0.04; });
      legs[0].rotation.x = Math.sin(t * 3) * 0.1; legs[1].rotation.x = -Math.sin(t * 3) * 0.1;
      pose.position.y = Math.sin(t * 2) * 0.06;
    }
  };
  return root;
}
let CARPET_TEX = null;
function carpetTex() {
  if (CARPET_TEX) return CARPET_TEX;
  const c = document.createElement('canvas'); c.width = 128; c.height = 192; const g = c.getContext('2d');
  g.fillStyle = '#1d3aa8'; g.fillRect(0, 0, 128, 192);
  g.strokeStyle = '#f3cf6b'; g.lineWidth = 8; g.strokeRect(6, 6, 116, 180);
  g.lineWidth = 3; g.strokeStyle = '#ffe7a3'; g.strokeRect(16, 16, 96, 160);
  g.fillStyle = '#0f1d5c'; g.fillRect(19, 19, 90, 154);
  g.fillStyle = '#f3cf6b';
  const dia = (x, y, r) => { g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.7, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.7, y); g.closePath(); g.fill(); };
  dia(64, 96, 34); g.fillStyle = '#2c5cff'; dia(64, 96, 22); g.fillStyle = '#ffe7a3'; dia(64, 96, 9);
  g.fillStyle = '#f3cf6b'; for (const [x, y] of [[36, 42], [92, 42], [36, 150], [92, 150]]) dia(x, y, 9);
  CARPET_TEX = new THREE.CanvasTexture(c); CARPET_TEX.colorSpace = THREE.SRGBColorSpace; return CARPET_TEX;
}
function wizard() {
  const root = new THREE.Group();
  const geo = new THREE.PlaneGeometry(1.5, 2.3, 10, 16); geo.rotateX(-Math.PI / 2);
  const base = Float32Array.from(geo.attributes.position.array);
  const carpet = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: carpetTex(), side: THREE.DoubleSide, roughness: 0.85 }));
  carpet.position.y = -0.45; root.add(carpet);
  const tassels = [];
  for (const [x, z] of [[-0.75, -1.15], [0.75, -1.15], [-0.75, 1.15], [0.75, 1.15], [-0.25, 1.15], [0.25, 1.15], [-0.25, -1.15], [0.25, -1.15]]) {
    const ts = cone(0.04, 0.14, M(0xf3cf6b, { metalness: 0.3 }), 5); ts.rotation.x = z < 0 ? -Math.PI / 2 : Math.PI / 2; ts.userData = { x, z }; root.add(ts); tassels.push(ts);
  }
  const w = new THREE.Group(); root.add(w);
  const robe = M(0x3a57c9), robe2 = M(0x2c3f99), skin = M(0xf1c6a4), beardM = M(0xf4f4fa), gold = M(0xf3cf6b, { metalness: 0.4 });
  const lap = cyl(0.42, 0.5, 0.22, robe2, 10); lap.scale.z = 0.8; lap.position.set(0, -0.32, 0.05); w.add(lap);
  const body = cone(0.36, 0.95, robe, 10); body.position.set(0, 0.1, 0.1); w.add(body);
  const sash = cyl(0.26, 0.28, 0.06, gold, 10); sash.position.set(0, -0.05, 0.1); w.add(sash);
  const head = ball(0.17, skin); head.position.set(0, 0.62, 0.06); w.add(head);
  const beard = cone(0.15, 0.42, beardM, 7); beard.rotation.x = Math.PI; beard.position.set(0, 0.42, -0.06); w.add(beard);
  for (const sx of [-1, 1]) { const e = ball(0.022, M(0x1a2040), 0); e.position.set(sx * 0.06, 0.66, -0.1); w.add(e); }
  const brim = cyl(0.3, 0.3, 0.03, robe2, 14); brim.position.set(0, 0.75, 0.06); w.add(brim);
  const hat = new THREE.Group(); hat.position.set(0, 0.76, 0.06); w.add(hat);
  const hc = cone(0.2, 0.62, robe, 10); hc.position.y = 0.3; hc.rotation.x = 0.25; hat.add(hc);
  const band = cyl(0.19, 0.2, 0.05, gold, 10); band.position.y = 0.04; hat.add(band);
  for (let i = 0; i < 3; i++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), E(0xffe7a3, 1)); s.position.set(Math.sin(i * 2.1) * 0.12, 0.2 + i * 0.12, -0.12 + i * 0.02); hat.add(s); }
  for (const sx of [-1, 1]) { const a = cyl(0.07, 0.09, 0.45, robe, 7); a.position.set(sx * 0.3, 0.2, -0.05); a.rotation.x = 0.9; a.rotation.z = -sx * 0.3; w.add(a); }
  const staff = new THREE.Group(); staff.position.set(0.38, 0.0, -0.25); w.add(staff);
  const stick = cyl(0.025, 0.03, 1.3, M(0x8a5a2b), 6); stick.position.y = 0.3; staff.add(stick);
  const orb = ball(0.09, E(0xffe7a3, 2), 1); orb.position.y = 0.98; staff.add(orb);
  const orbGlow = glowSprite(0xffe7a3, 0.9, 0.85); orbGlow.position.y = 0.98; staff.add(orbGlow);
  root.userData = {
    eye: new THREE.Vector3(0, 0.75, -0.3), size: 1.1, camDist: 4.8,
    anim(t, s) {
      const a = geo.attributes.position, arr = a.array, sp = 5 + s * 4;
      for (let i = 0; i < arr.length; i += 3) { const x = base[i], z = base[i + 2]; arr[i + 1] = Math.sin(z * 2.6 + t * sp) * 0.07 * (0.6 + (z + 1.15) * 0.4) + Math.sin(x * 3 + t * 2) * 0.025; }
      a.needsUpdate = true; geo.computeVertexNormals();
      for (const ts of tassels) { const { x, z } = ts.userData; ts.position.set(x, -0.45 + Math.sin(z * 2.6 + t * sp) * 0.07 * (0.6 + (z + 1.15) * 0.4), z + Math.sign(z) * 0.07); }
      w.position.y = Math.sin(t * 2) * 0.03; beard.rotation.z = Math.sin(t * 3) * 0.05; hat.rotation.z = Math.sin(t * 2.2) * 0.06;
      const g = 1.6 + Math.sin(t * 4) * 0.6; orb.material.emissiveIntensity = g; orbGlow.scale.setScalar(0.8 + Math.sin(t * 4) * 0.15);
      root.children[0].rotation.z = Math.sin(t * 1.3) * 0.02;
    }
  };
  return root;
}
function skyWhale() {
  const root = new THREE.Group();
  const top = M(0x3f62a8, { roughness: 0.6 }), belly = M(0xdfe8fb), fin = M(0x34539a, { side: THREE.DoubleSide }), black = M(0x0d1430), glow = E(0xffe7a3, 1.2);
  const body = ball(0.8, top, 2); body.scale.set(1.0, 0.85, 2.0); root.add(body);
  const bel = ball(0.72, belly, 2); bel.scale.set(0.92, 0.6, 1.85); bel.position.set(0, -0.24, -0.08); root.add(bel);
  for (let i = 0; i < 5; i++) { const g = box(0.05, 0.02, 1.1, M(0xb9c8ea)); g.position.set((i - 2) * 0.13, -0.66, -0.75); root.add(g); }
  for (const sx of [-1, 1]) {
    const e = ball(0.07, black, 1); e.position.set(sx * 0.62, -0.05, -0.95); root.add(e);
    const hl = ball(0.025, M(0xffffff), 0); hl.position.set(sx * 0.67, -0.02, -0.99); root.add(hl);
  }
  for (let i = 0; i < 6; i++) { const sp = ball(0.05, glow, 0); sp.position.set((i % 2 ? 1 : -1) * (0.25 + (i % 3) * 0.12), 0.62 - (i % 3) * 0.08, -0.6 + i * 0.3); root.add(sp); }
  const finGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.25), new THREE.Vector3(1.1, -0.1, 0.25), new THREE.Vector3(0, 0, 0.3)]); finGeo.computeVertexNormals();
  const fins = [];
  for (const sx of [-1, 1]) { const g = new THREE.Group(); g.position.set(sx * 0.65, -0.3, -0.4); const m = new THREE.Mesh(finGeo, fin); m.scale.x = sx; g.add(m); root.add(g); fins.push(g); }
  const dorsal = cone(0.12, 0.3, top, 5); dorsal.scale.z = 2; dorsal.position.set(0, 0.7, 0.75); dorsal.rotation.x = 0.6; root.add(dorsal);
  const tail = []; let par = new THREE.Group(); par.position.set(0, 0, 1.4); root.add(par);
  for (let i = 0; i < 3; i++) { const g = new THREE.Group(); g.position.z = i === 0 ? 0 : 0.42; const c = ball(0.42 - i * 0.1, top, 1); c.scale.set(0.9, 0.75, 1.3); c.position.z = 0.2; g.add(c); par.add(g); par = g; tail.push(g); }
  const fluke = new THREE.Group(); fluke.position.z = 0.55; par.add(fluke);
  const flGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, -0.1), new THREE.Vector3(0.9, 0, 0.45), new THREE.Vector3(0.5, 0, 0.25), new THREE.Vector3(0, 0, 0.3)]);
  flGeo.setIndex([0, 1, 2, 0, 2, 3]); flGeo.computeVertexNormals();
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(flGeo, fin); m.scale.x = sx; fluke.add(m); }
  const mist = [];
  for (let i = 0; i < 5; i++) { const p = glowSprite(0xdfe8ff, 0.4, 0.6); p.userData.ph = i / 5; root.add(p); mist.push(p); }
  root.userData = {
    eye: new THREE.Vector3(0, 0.3, -1.8), size: 1.6, camDist: 6.6,
    anim(t, s) {
      const sp = 1.6 + s * 1.4;
      tail.forEach((g, i) => g.rotation.x = Math.sin(t * sp - i * 0.8) * (0.18 + i * 0.06));
      fluke.rotation.x = Math.sin(t * sp - 2.6) * 0.35;
      fins[0].rotation.z = Math.sin(t * sp * 0.8) * 0.25 - 0.1; fins[1].rotation.z = -fins[0].rotation.z;
      body.rotation.x = Math.sin(t * sp + 1) * 0.03;
      for (const p of mist) { const k = (t * 0.5 + p.userData.ph) % 1; p.position.set(Math.sin(k * 12) * 0.1, 0.8 + k * 1.2, -0.7 - k * 0.2); p.material.opacity = 0.55 * (1 - k); p.scale.setScalar(0.25 + k * 0.6); }
    }
  };
  return root;
}
function griffin() {
  const root = new THREE.Group();
  const white = M(0xf5f0e6), brown = M(0x8a5a2b), lion = M(0xd9a95b), lionD = M(0xb98a45), beakM = M(0xf3b43a, { metalness: 0.2 }), black = M(0x101018), gold = M(0xf3cf6b, { metalness: 0.4 });
  const wingM = M(0xa8743a, { side: THREE.DoubleSide }), wingTip = M(0xf5e6c8, { side: THREE.DoubleSide });
  // lion back half
  const hind = ball(0.48, lion, 1); hind.scale.set(0.9, 0.8, 1.2); hind.position.z = 0.35; root.add(hind);
  // eagle front half
  const chest = ball(0.46, brown, 1); chest.scale.set(0.95, 0.9, 1.1); chest.position.set(0, 0.06, -0.35); root.add(chest);
  const ruff = ball(0.4, white, 1); ruff.scale.set(0.9, 0.85, 0.7); ruff.position.set(0, 0.2, -0.68); root.add(ruff);
  const head = new THREE.Group(); head.position.set(0, 0.4, -0.95); root.add(head);
  head.add(ball(0.27, white, 1));
  const beak = cone(0.1, 0.3, beakM, 6); beak.rotation.x = -Math.PI / 2 - 0.4; beak.position.set(0, -0.05, -0.32); head.add(beak);
  for (const sx of [-1, 1]) {
    const e = ball(0.05, gold, 0); e.position.set(sx * 0.15, 0.06, -0.18); head.add(e);
    const p = ball(0.025, black, 0); p.position.set(sx * 0.17, 0.065, -0.22); head.add(p);
    const tuft = cone(0.05, 0.22, white, 4); tuft.position.set(sx * 0.13, 0.25, 0.08); tuft.rotation.x = 0.9; tuft.rotation.z = -sx * 0.3; head.add(tuft);
    // eagle talons in front, lion paws behind
    const leg = cyl(0.05, 0.04, 0.32, beakM, 6); leg.position.set(sx * 0.22, -0.45, -0.45); leg.rotation.x = -0.9; root.add(leg);
    for (let k = -1; k <= 1; k++) { const c = cone(0.02, 0.1, black, 4); c.position.set(sx * 0.22 + k * 0.035, -0.55, -0.62); c.rotation.x = -1.6; root.add(c); }
    const hl = box(0.14, 0.38, 0.16, lion); hl.position.set(sx * 0.24, -0.42, 0.6); hl.rotation.x = 0.9; root.add(hl);
    const paw = ball(0.09, lionD, 0); paw.position.set(sx * 0.24, -0.55, 0.8); root.add(paw);
  }
  const tail = new THREE.Group(); tail.position.set(0, 0.05, 0.85); root.add(tail);
  const tseg = []; let par = tail;
  for (let i = 0; i < 3; i++) { const g = new THREE.Group(); g.position.z = i === 0 ? 0 : 0.28; const c = cyl(0.04, 0.05, 0.3, lion, 6); c.rotation.x = Math.PI / 2; c.position.z = 0.14; g.add(c); par.add(g); par = g; tseg.push(g); }
  const tuftT = cone(0.1, 0.22, M(0x6b4220), 6); tuftT.rotation.x = Math.PI / 2; tuftT.position.z = 0.38; par.add(tuftT);
  const wings = addWings(root, wingGeo(1.8, 1.0, true), wingM, 0.32, 0.32, -0.3);
  for (const wg of wings) { const tip = new THREE.Mesh(wingGeo(0.9, 0.5, true), wingTip); tip.position.x = wg === wings[0] ? 0.85 : -0.85; tip.position.y = 0.01; if (wg === wings[1]) tip.scale.x = -1; wg.add(tip); }
  root.userData = {
    eye: new THREE.Vector3(0, 0.6, -1.3), size: 1.3, camDist: 5.2,
    anim(t, s) {
      const f = Math.sin(t * (4 + s * 3)) * 0.7; wings[0].rotation.z = f; wings[1].rotation.z = -f;
      tseg.forEach((g, i) => { g.rotation.y = Math.sin(t * 2.2 - i) * 0.3; g.rotation.x = -0.2; });
      head.rotation.y = Math.sin(t * 0.7) * 0.12;
      hind.position.y = Math.sin(t * (4 + s * 3) + 1) * 0.02;
    }
  };
  return root;
}
const CHAR_BUILD = [
  () => human({ scale: 1, skin: 0xe0ac85, top: 0x2c5cff, bottom: 0x1d2a5c, hair: 0x3b2618, cape: 0xf3cf6b }),
  () => human({ scale: 0.96, skin: 0xf1c6a4, top: 0xf3cf6b, bottom: 0x3a57c9, hair: 0x7a4a24, long: true, skirt: true, cape: 0x2c5cff }),
  () => human({ scale: 0.72, kid: true, skin: 0xc98e66, top: 0xff8a3d, bottom: 0x2d4b9a, hair: 0x1f1510, cape: 0x6fa8ff }),
  () => human({ scale: 0.7, kid: true, skin: 0xf4cfb2, top: 0xc77dff, bottom: 0x2c5cff, hair: 0xd89a3a, pony: true, skirt: true, cape: 0xf3cf6b }),
  cat, robot, astronaut, caped, wizard, skyWhale, griffin
];

/* ================= environments ================= */
function points(n, fill, size, o = {}) {
  const pos = new Float32Array(n * 3), col = o.colors ? new Float32Array(n * 3) : null;
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) { const p = fill(i); pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; if (col) { c.set(o.colors(i)); col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size, map: GLOW, color: o.color || 0xffffff, vertexColors: !!col, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: o.atten !== false, opacity: o.opacity ?? 1, fog: o.fog ?? true });
  return new THREE.Points(g, m);
}
const sphereShell = (r) => { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u); return [Math.cos(a) * s * r, u * r, Math.sin(a) * s * r]; };
/* particles that stay around the player (snow, bubbles) */
function localParticles(n, range, size, color, opacity) {
  const p = points(n, () => [rand(-range, range), rand(-range, range), rand(-range, range)], size, { color, opacity });
  p.frustumCulled = false; p.userData.range = range; return p;
}
function updateLocal(p, center, vy, dt, t, sway) {
  const a = p.geometry.attributes.position, r = p.userData.range, arr = a.array, cc = [center.x, center.y, center.z];
  for (let i = 0; i < arr.length; i += 3) {
    arr[i + 1] += vy * dt; arr[i] += Math.sin(t + i) * sway * dt;
    for (let k = 0; k < 3; k++) { const d = arr[i + k] - cc[k]; if (d > r) arr[i + k] -= 2 * r; else if (d < -r) arr[i + k] += 2 * r; }
  }
  a.needsUpdate = true;
}

const ENVS = {
  snow() {
    const g = new THREE.Group();
    const peaks = [];
    const rock = M(0x93a3c4), snowM = M(0xf4f8ff), pine = M(0x2f6b4f), trunk = M(0x6b4a2e);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1500, 40), M(0xe8f0fb)); ground.rotation.x = -Math.PI / 2; g.add(ground);
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2, d = i < 8 ? rand(170, 260) : rand(200, 700);
      const x = Math.cos(a) * d, z = Math.sin(a) * d, h = rand(50, i < 8 ? 110 : 190), r = h * rand(0.7, 1.1);
      const m = cone(r, h, rock, 7); m.position.set(x, h / 2, z); m.rotation.y = Math.random() * 3; g.add(m);
      const cap = cone(r * 0.55, h * 0.55, snowM, 7); cap.position.set(x, h - h * 0.275 + 0.3, z); cap.rotation.y = m.rotation.y; cap.scale.setScalar(1.03); g.add(cap);
      peaks.push([x, z, h, r]);
    }
    const geoP = new THREE.ConeGeometry(2.2, 7, 6), geoT = new THREE.CylinderGeometry(0.35, 0.45, 1.6, 5);
    const inst = new THREE.InstancedMesh(geoP, pine, 220), instT = new THREE.InstancedMesh(geoT, trunk, 220), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
    for (let i = 0; i < 220; i++) {
      const a = Math.random() * Math.PI * 2, d = rand(25, 600), x = Math.cos(a) * d, z = Math.sin(a) * d, s = rand(0.7, 1.6);
      sc.set(s, s, s); mm.compose(new THREE.Vector3(x, 4.2 * s, z), q, sc); inst.setMatrixAt(i, mm);
      mm.compose(new THREE.Vector3(x, 0.8 * s, z), q, sc); instT.setMatrixAt(i, mm);
    }
    g.add(inst, instT);
    const sun = glowSprite(0xfff2c8, 260, 0.9); sun.position.set(500, 380, -900); g.add(sun);
    const snowP = localParticles(700, 60, 0.45, 0xffffff, 0.9); g.add(snowP);
    const heightAt = (x, z) => { let h = 0; for (const p of peaks) { const d = Math.hypot(x - p[0], z - p[1]); if (d < p[3]) h = Math.max(h, p[2] * (1 - d / p[3])); } return h; };
    return { g, sky: [0x5d8fe0, 0xdbe9ff, 0xe8f0fb], fog: [0xdbe7f7, 120, 900], hemi: [0xeaf3ff, 0x8899bb, 1.5], sun: [0xfff4dd, 1.8, [0.4, 0.8, -0.5]],
      start: new THREE.Vector3(0, 45, 0), minY: 3, maxY: 320, R: 520, heightAt, spark: 0xffc93a,
      update(t, dt, p) { updateLocal(snowP, p, -4, dt, t, 2); } };
  },
  solar(gv = 0) {
    /* gv = which galaxy the white hole took you to (0 = home). Each one has its own stars, sun, nebula tints and planets — blue/gold only */
    const GV = [
      { n: 2200, st: [0xffffff, 0xdde6ff, 0xfff0d0, 0xbfd3ff], sun: 0xffd36b, sg: [0xffb340, 0xfff0b0], neb: [], sky: [0x02030c, 0x070a22, 0x02030c], pc: null },
      { n: 4200, st: [0xbfd3ff, 0x8fb0ff, 0xffffff, 0x6f8fff], sun: 0x9fc0ff, sg: [0x4f7dff, 0xd8e6ff], neb: [0x2d5bd8, 0x4f7dff, 0x1b3a9a, 0xf3cf6b], sky: [0x01041a, 0x0a1a4a, 0x020618], pc: [0x9fc0ff, 0x4a6df0, 0xe8c47a, 0x3d7fe0, 0xdfe8ff, 0xf3cf6b, 0x6f8fff, 0x2d5bd8] },
      { n: 3200, st: [0xfff0d0, 0xffe08a, 0xffffff, 0xf3cf6b], sun: 0xfff0b0, sg: [0xffc94a, 0xfff6e0], neb: [0xffb340, 0xf3cf6b, 0x4f7dff, 0xc9962a], sky: [0x0a0602, 0x1f1406, 0x060300], pc: [0xf3cf6b, 0xd9a95b, 0x4f7dff, 0xffe7a3, 0xb98a45, 0x8fb0ff, 0xe6d29c, 0x3f62a8] },
      { n: 5200, st: [0xffffff, 0xbfd3ff, 0xffe7a3], sun: 0xffffff, sg: [0x8fb0ff, 0xffe7a3], neb: [0x4f7dff, 0xffc94a, 0x2d5bd8, 0xfff0b0, 0x6f8fff], sky: [0x000208, 0x061036, 0x000208], pc: [0xdfe8ff, 0xffe08a, 0x6f8fff, 0x4a6df0, 0xf3cf6b, 0x9fe0f0, 0xbfd3ff, 0xc9962a] }
    ][gv % 4];
    const g = new THREE.Group();
    g.add(points(GV.n, () => sphereShell(rand(1300, 1800)), 2.2, { atten: false, colors: () => pick(GV.st), fog: false }));
    for (let i = 0; i < GV.neb.length * 5; i++) { const nb = glowSprite(GV.neb[i % GV.neb.length], rand(260, 620), rand(0.12, 0.26)); nb.position.copy(sphereShell(rand(700, 1100))); g.add(nb); }
    const sun = ball(42, new THREE.MeshBasicMaterial({ color: GV.sun }), 3); g.add(sun);
    g.add(glowSprite(GV.sg[0], 210, 0.85), glowSprite(GV.sg[1], 120, 0.9));
    const pl = new THREE.PointLight(0xfff1d8, 3.2, 0, 0); g.add(pl);
    const defs = [[75, 2.6, 0xb5a596], [105, 4.5, 0xe8c47a], [140, 5, 0x3d7fe0, 'earth'], [175, 3.6, 0xd2603b], [240, 13, 0xd9b08c], [310, 11, 0xe6d29c, 'ring'], [375, 8, 0x9fe0f0], [430, 7.5, 0x4a6df0]];
    if (GV.pc) defs.forEach((d, i) => { d[2] = GV.pc[i]; d[1] *= rand(0.7, 1.5); if (d[3] === 'earth') d[3] = ''; });
    const planets = [];
    for (const [r, s, c, k] of defs) {
      const piv = new THREE.Group(); piv.rotation.y = Math.random() * Math.PI * 2; g.add(piv);
      const p = ball(s, M(c, { flatShading: false, roughness: 0.9 }), 2); p.position.x = r; piv.add(p);
      if (k === 'ring') { const ring = new THREE.Mesh(new THREE.RingGeometry(s * 1.4, s * 2.3, 40), M(0xe9d7a8, { side: THREE.DoubleSide, transparent: true, opacity: 0.8 })); ring.rotation.x = -Math.PI / 2 + 0.4; p.add(ring); }
      if (k === 'earth') { const moon = ball(1.3, M(0xcfd3dc), 1); moon.position.set(10, 2, 0); p.add(moon); const cl = ball(s * 1.04, new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }), 2); p.add(cl); }
      const orbit = new THREE.Mesh(new THREE.RingGeometry(r - 0.25, r + 0.25, 128), new THREE.MeshBasicMaterial({ color: 0x8fb0ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      orbit.rotation.x = -Math.PI / 2; g.add(orbit);
      planets.push([piv, 1.2 / Math.sqrt(r), p]);
    }
    /* put the earth near the start so there is something to see right away */
    planets[2][0].rotation.y = -Math.PI / 2 + 0.25;
    /* black holes: fly into one for bonus points (+50 and a swirl) */
    const holes = [];
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + 0.6 + rand(-0.3, 0.3), r = rand(190, 380);
      const h = new THREE.Group(); h.position.set(Math.cos(a) * r, rand(-30, 50), Math.sin(a) * r);
      h.add(ball(7, new THREE.MeshBasicMaterial({ color: 0x000000 }), 3));
      const disk = new THREE.Mesh(new THREE.RingGeometry(9, 22, 64), new THREE.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: 0.75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      disk.rotation.x = -Math.PI / 2 + 0.35; h.add(disk);
      const disk2 = new THREE.Mesh(new THREE.RingGeometry(22, 30, 64), new THREE.MeshBasicMaterial({ color: 0x4f7dff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      disk2.rotation.x = -Math.PI / 2 + 0.35; h.add(disk2);
      h.add(glowSprite(0x6f8fff, 70, 0.5));
      g.add(h); holes.push({ g: h, disk, disk2, r: 11, cd: 0 });
    }
    return { g, gv, sky: GV.sky, fog: null, hemi: [0x8899cc, 0x111122, 0.35], sun: [0xffffff, 0.0, [0, 1, 0]],
      start: new THREE.Vector3(0, 25, 200), minY: -160, maxY: 160, R: 480, spark: 0xfff0b0,
      avoid: [[0, 0, 0, 52]], holes, update(t, dt) { for (const h of holes) { h.disk.rotation.z += dt * 1.6; h.disk2.rotation.z -= dt * 0.9; h.cd = Math.max(0, h.cd - dt); } for (const [piv, w, p] of planets) { piv.rotation.y += w * dt * 0.25; p.rotation.y += dt * 0.3; } sun.rotation.y += dt * 0.05; } };
  },
  galaxy() {
    const g = new THREE.Group();
    const cols = [0xff8fd8, 0x8fb0ff, 0xffe7a3, 0xc69bff, 0x7fe8ff, 0xffb38a, 0xffffff];
    g.add(points(1600, () => sphereShell(rand(1300, 1800)), 2.4, { atten: false, colors: () => pick(cols), fog: false }));
    const disk = points(5000, (i) => {
      const arm = i % 3, d = Math.pow(Math.random(), 0.7) * 520, a = arm * 2.094 + d * 0.012 + rand(-0.35, 0.35) * (1 - d / 700);
      return [Math.cos(a) * d + rand(-12, 12), rand(-8, 8) * (1 - d / 600), Math.sin(a) * d + rand(-12, 12)];
    }, 4.5, { colors: () => (Math.random() < 0.3 ? 0xffe7a3 : pick(cols)), opacity: 0.85 });
    disk.position.y = -90; g.add(disk);
    const coreG = glowSprite(0xffe2b0, 220, 0.9); coreG.position.y = -90; g.add(coreG);
    for (let i = 0; i < 30; i++) { const s = glowSprite(pick([0xff5fc0, 0x5f7fff, 0xb06bff, 0x4fd8ff, 0xff9f6b]), rand(140, 340), rand(0.18, 0.34)); s.position.set(rand(-600, 600), rand(-40, 220), rand(-600, 600)); g.add(s); }
    const bright = [];
    for (let i = 0; i < 40; i++) { const s = glowSprite(pick(cols), rand(6, 14)); s.position.set(rand(-450, 450), rand(-30, 150), rand(-450, 450)); g.add(s); bright.push(s); }
    return { g, sky: [0x0b0626, 0x241048, 0x07031a], fog: null, hemi: [0xd8c8ff, 0x332255, 0.9], sun: [0xffe7d0, 0.9, [0.2, 1, 0.3]],
      start: new THREE.Vector3(0, 40, 160), minY: -60, maxY: 220, R: 480, spark: 0xffffff,
      update(t, dt) { disk.rotation.y += dt * 0.01; bright.forEach((s, i) => s.material.opacity = 0.6 + Math.sin(t * 2 + i) * 0.4); } };
  },
  dimension() {
    const g = new THREE.Group();
    const grid = new THREE.GridHelper(1400, 70, 0xff6ad5, 0x6a5cff); grid.position.y = -40; grid.material.transparent = true; grid.material.opacity = 0.45; g.add(grid);
    const geos = [new THREE.TorusKnotGeometry(6, 1.6, 64, 8), new THREE.OctahedronGeometry(7), new THREE.IcosahedronGeometry(7, 0), new THREE.TorusGeometry(8, 1.2, 8, 30), new THREE.BoxGeometry(9, 9, 9), new THREE.TetrahedronGeometry(8), new THREE.DodecahedronGeometry(6)];
    const cols = [0xff6ad5, 0x7f6bff, 0x4fe3ff, 0xffd36b, 0xff9f6b, 0xb98bff];
    const wire = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.35 });
    const shapes = [];
    for (let i = 0; i < 70; i++) {
      const c = pick(cols), geo = pick(geos), s = rand(0.6, 2.6);
      const m = new THREE.Mesh(geo, M(c, { emissive: c, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.3 }));
      const w = new THREE.Mesh(geo, wire); w.scale.setScalar(1.04); m.add(w);
      const a = Math.random() * Math.PI * 2, d = rand(40, 520);
      m.position.set(Math.cos(a) * d, rand(-20, 200), Math.sin(a) * d); m.scale.setScalar(s);
      m.userData = { rx: rand(-0.5, 0.5), ry: rand(-0.5, 0.5), by: m.position.y, ph: Math.random() * 6 };
      g.add(m); shapes.push(m);
    }
    for (let i = 0; i < 9; i++) {
      const portal = new THREE.Mesh(new THREE.TorusGeometry(rand(25, 45), 1.5, 8, 48), new THREE.MeshBasicMaterial({ color: pick(cols) }));
      portal.position.set(rand(-450, 450), rand(30, 180), rand(-450, 450)); portal.rotation.set(Math.random(), Math.random() * 3, 0); g.add(portal); shapes.push(portal);
      portal.userData = { rx: 0.05, ry: 0.1, by: portal.position.y, ph: 0 };
    }
    const motes = points(900, () => [rand(-600, 600), rand(-30, 250), rand(-600, 600)], 1.8, { colors: () => pick(cols) }); g.add(motes);
    return { g, sky: [0x1a0640, 0x7a1f8c, 0x0c0430], fog: [0x3a1466, 200, 1100], hemi: [0xffb8f0, 0x3322aa, 1.1], sun: [0xbfe8ff, 1.2, [-0.3, 1, 0.4]],
      start: new THREE.Vector3(0, 60, 0), minY: -34, maxY: 260, R: 500, spark: 0xfff2b0,
      update(t, dt) { for (const s of shapes) { const u = s.userData; s.rotation.x += u.rx * dt; s.rotation.y += u.ry * dt; s.position.y = u.by + Math.sin(t * 0.6 + u.ph) * 4; } skyMat.uniforms.hor.value.setHSL(0.83 + Math.sin(t * 0.1) * 0.06, 0.6, 0.32); } };
  },
  atlantis() {
    const g = new THREE.Group();
    const pg = new THREE.PlaneGeometry(1600, 1600, 50, 50); pg.rotateX(-Math.PI / 2);
    const pa = pg.attributes.position; for (let i = 0; i < pa.count; i++) pa.setY(i, Math.sin(pa.getX(i) * 0.02) * 3 + Math.cos(pa.getZ(i) * 0.025) * 3 + rand(-1, 1));
    pg.computeVertexNormals(); g.add(new THREE.Mesh(pg, M(0xc9b78a)));
    const stone = M(0xd9dcef), roof = M(0x7fa6d9), glow = E(0x6fe3ff, 1.6), gold = E(0xf3cf6b, 1.1), coral = [M(0xff8f7a), M(0xffb36b), M(0xd88cff)];
    const temple = (x, z, s) => {
      const t = new THREE.Group(); t.position.set(x, 0, z); t.scale.setScalar(s); t.rotation.y = Math.random() * 3;
      const base = box(26, 3, 18, stone); base.position.y = 1.5; t.add(base);
      for (let i = 0; i < 6; i++) for (const zz of [-7, 7]) { const c = cyl(1, 1.1, 14, stone, 8); c.position.set(-11 + i * 4.4, 10, zz); t.add(c); }
      const top = box(26, 2, 18, stone); top.position.y = 18; t.add(top);
      const rf = cone(17, 7, roof, 4); rf.position.y = 22.5; rf.rotation.y = Math.PI / 4; rf.scale.z = 0.7; t.add(rf);
      const band = box(26.4, 0.6, 18.4, glow); band.position.y = 16.8; t.add(band);
      g.add(t);
    };
    const dome = (x, z, s) => {
      const d = new THREE.Mesh(new THREE.SphereGeometry(12, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M(0xbfd0ef, { metalness: 0.2 })); d.position.set(x, 0, z); d.scale.setScalar(s); g.add(d);
      for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(12 * Math.cos(0.3 + i * 0.35) * s, 0.25 * s, 4, 30), glow); r.rotation.x = Math.PI / 2; r.position.set(x, 12 * Math.sin(0.3 + i * 0.35) * s, z); g.add(r); }
    };
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; temple(Math.cos(a) * 120, Math.sin(a) * 120, rand(0.8, 1.3)); }
    for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, d = rand(60, 330); dome(Math.cos(a) * d, Math.sin(a) * d, rand(0.6, 1.5)); }
    const tower = cyl(5, 9, 90, stone, 8); tower.position.y = 45; g.add(tower);
    const crown = ball(7, gold, 1); crown.position.y = 96; g.add(crown);
    const crownG = glowSprite(0xffe7a3, 60, 0.8); crownG.position.y = 96; g.add(crownG);
    for (let i = 0; i < 4; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(14 + i * 6, 0.5, 4, 40), glow); r.rotation.x = Math.PI / 2; r.position.y = 20 + i * 18; g.add(r); }
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    for (let i = 0; i < 70; i++) { const c = new THREE.Mesh(rockGeo, pick(coral)); const s = rand(1.5, 5); c.position.set(rand(-500, 500), 1, rand(-500, 500)); c.scale.set(s, s * rand(1, 2.5), s); g.add(c); }
    const rayM = new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    for (let i = 0; i < 16; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(4, rand(16, 30), 240, 10, 1, true), rayM); r.position.set(rand(-350, 350), 110, rand(-350, 350)); r.rotation.z = 0.15; g.add(r); }
    const fishGeo = new THREE.ConeGeometry(0.6, 2.2, 5); fishGeo.rotateX(-Math.PI / 2);
    const schools = [];
    for (let s = 0; s < 5; s++) {
      const grp = new THREE.Group(); const fm = M(pick([0xffb347, 0x6fe3ff, 0xffe066, 0xff8fb3]));
      for (let i = 0; i < 12; i++) { const f = new THREE.Mesh(fishGeo, fm); f.position.set(rand(-6, 6), rand(-3, 3), rand(-6, 6)); grp.add(f); }
      grp.userData = { r: rand(60, 260), h: rand(15, 70), w: rand(0.08, 0.16) * (Math.random() < 0.5 ? -1 : 1), a: Math.random() * 6 };
      g.add(grp); schools.push(grp);
    }
    const bubbles = localParticles(260, 50, 0.7, 0xdff6ff, 0.8); g.add(bubbles);
    g.add(points(600, () => [rand(-600, 600), rand(5, 180), rand(-600, 600)], 1.2, { color: 0x9fe8ff, opacity: 0.6 }));
    return { g, sky: [0x2c7fc0, 0x0b4f8a, 0x062a50], fog: [0x0d4f86, 30, 420], hemi: [0x9fe0ff, 0x1a3c6a, 1.3], sun: [0xcff3ff, 1.1, [0.2, 1, 0.1]],
      start: new THREE.Vector3(0, 30, 200), minY: 5, maxY: 190, R: 480, spark: 0xffe7a3,
      update(t, dt, p) {
        updateLocal(bubbles, p, 5, dt, t, 1.5);
        for (const s of schools) { const u = s.userData; u.a += u.w * dt; s.position.set(Math.cos(u.a) * u.r, u.h + Math.sin(t + u.r) * 3, Math.sin(u.a) * u.r); s.rotation.y = -u.a + (u.w > 0 ? Math.PI : 0); }
        rayM.opacity = 0.06 + Math.sin(t * 0.7) * 0.02;
      } };
  },
  clouds() {
    const g = new THREE.Group();
    const cloudM = M(0xffffff, { roughness: 1 }), cloudP = M(0xffeef6, { roughness: 1 });
    const puffGeo = new THREE.IcosahedronGeometry(1, 1);
    const cloud = (x, y, z, s, m) => { const c = new THREE.Group(); const n = 4 + (Math.random() * 4 | 0); for (let i = 0; i < n; i++) { const p = new THREE.Mesh(puffGeo, m); p.position.set(rand(-1.6, 1.6) * s, rand(-0.3, 0.5) * s, rand(-0.8, 0.8) * s); p.scale.setScalar(rand(0.7, 1.3) * s); c.add(p); } c.position.set(x, y, z); g.add(c); return c; };
    const drift = [];
    for (let i = 0; i < 80; i++) drift.push(cloud(rand(-600, 600), rand(-10, 150), rand(-600, 600), rand(5, 14), Math.random() < 0.3 ? cloudP : cloudM));
    for (let i = 0; i < 60; i++) cloud(rand(-700, 700), -45, rand(-700, 700), rand(22, 40), cloudM);
    const seaPlane = new THREE.Mesh(new THREE.CircleGeometry(1500, 32), M(0xf2f4ff)); seaPlane.rotation.x = -Math.PI / 2; seaPlane.position.y = -50; g.add(seaPlane);
    const rockM = M(0xb59a7a), grass = M(0x7cc47a), wall = M(0xf7f2ff), roofB = M(0x3a6df0), roofG = M(0xf3cf6b, { metalness: 0.3 }), win = E(0xffe7a3, 1);
    const islands = [];
    for (let i = 0; i < 7; i++) {
      const isl = new THREE.Group(); const a = i / 7 * Math.PI * 2 + 0.3, d = i === 0 ? 0 : rand(150, 380);
      isl.position.set(Math.cos(a) * d, rand(10, 50), Math.sin(a) * d - (i === 0 ? 110 : 0));
      const r = rand(18, 30);
      const under = cone(r, r * 1.4, rockM, 7); under.rotation.x = Math.PI; under.position.y = -r * 0.7; isl.add(under);
      const top = cyl(r, r, 3, grass, 7); top.position.y = 1.5; isl.add(top);
      const keep = cyl(5, 5.5, 18, wall, 8); keep.position.y = 12; isl.add(keep);
      const kr = cone(6.5, 9, roofG, 8); kr.position.y = 25.5; isl.add(kr);
      for (let k = 0; k < 4; k++) {
        const ta = k / 4 * Math.PI * 2, tx = Math.cos(ta) * r * 0.55, tz = Math.sin(ta) * r * 0.55;
        const tw = cyl(2.5, 2.8, 12, wall, 8); tw.position.set(tx, 9, tz); isl.add(tw);
        const tr = cone(3.4, 6, k % 2 ? roofB : roofG, 8); tr.position.set(tx, 18, tz); isl.add(tr);
        const w = box(1, 1.6, 0.2, win); w.position.set(tx * 1.12, 10, tz * 1.12); w.rotation.y = -ta + Math.PI / 2; isl.add(w);
      }
      const flag = box(0.15, 3, 0.15, wall); flag.position.y = 31.5; isl.add(flag);
      g.add(isl); islands.push([isl, isl.position.y]);
    }
    const rb = [0xff6b6b, 0xffa94d, 0xffe066, 0x8ce99a, 0x74c0fc, 0x9775fa];
    rb.forEach((c, i) => { const arc = new THREE.Mesh(new THREE.TorusGeometry(160 - i * 4, 2, 4, 60, Math.PI), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, fog: false })); arc.position.set(0, -40, -520); g.add(arc); });
    const sun = glowSprite(0xfff6d8, 240, 0.95); sun.position.set(-500, 420, -700); g.add(sun);
    return { g, sky: [0x6fa4ff, 0xffe6f0, 0xffffff], fog: [0xf3e9ff, 200, 1000], hemi: [0xffffff, 0xb8c6f0, 1.5], sun: [0xfff2dd, 1.7, [-0.4, 0.8, -0.5]],
      start: new THREE.Vector3(0, 40, 60), minY: -30, maxY: 260, R: 500, spark: 0xffb020,
      update(t, dt) { for (const c of drift) { c.position.x += dt * 2; if (c.position.x > 620) c.position.x = -620; } islands.forEach(([s, y], i) => s.position.y = y + Math.sin(t * 0.5 + i) * 2); } };
  },
  alien() {
    const g = new THREE.Group();
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1500, 40), M(0x15183a, { roughness: 0.5, metalness: 0.4 })); ground.rotation.x = -Math.PI / 2; g.add(ground);
    const grid = new THREE.GridHelper(1400, 56, 0x4fe3ff, 0x3b3f8f); grid.position.y = 0.2; grid.material.transparent = true; grid.material.opacity = 0.35; g.add(grid);
    const shell = M(0x3c4478, { metalness: 0.6, roughness: 0.35 }), pale = M(0xc9d3ff, { metalness: 0.5, roughness: 0.3 });
    const glows = [E(0x4fe3ff, 1.6), E(0xff7ad9, 1.5), E(0xf3cf6b, 1.4), E(0xa58bff, 1.6)];
    const towers = [];
    for (let i = 0; i < 64; i++) {
      const a = Math.random() * Math.PI * 2, d = i < 10 ? rand(45, 120) : rand(90, 560), x = Math.cos(a) * d, z = Math.sin(a) * d;
      const h = rand(35, i < 6 ? 120 : 190), r = rand(4, 9), gm = pick(glows), t = new THREE.Group(); t.position.set(x, 0, z);
      const kind = i % 3;
      const body = kind === 0 ? cyl(r * 0.6, r, h, pick([shell, pale]), 8) : kind === 1 ? cyl(r, r, h, shell, 6) : cyl(r * 0.35, r * 0.9, h, pale, 10);
      body.position.y = h / 2; t.add(body);
      for (let b = 1; b < 5; b++) {
        const yy = h * b / 5, rr = kind === 0 ? r - (r * 0.4) * (yy / h) : kind === 1 ? r : r * 0.9 - r * 0.55 * (yy / h);
        const band = new THREE.Mesh(new THREE.TorusGeometry(rr + 0.3, 0.35, 4, 18), gm); band.rotation.x = Math.PI / 2; band.position.y = yy; t.add(band);
      }
      if (kind !== 1) { const orb = ball(r * 0.7, gm, 1); orb.position.y = h + r * 0.5; t.add(orb); }
      else { const disc = cyl(r * 2.2, r * 1.4, 2, pale, 16); disc.position.y = h; t.add(disc); const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 2.2, 0.4, 4, 24), gm); rim.rotation.x = Math.PI / 2; rim.position.y = h; t.add(rim); }
      const sp = cone(0.5, 12, gm, 5); sp.position.y = h + r + 6; t.add(sp);
      g.add(t); towers.push([x, z, (kind === 1 ? r * 2.2 : r) + 1.5, h + r + 2]);
    }
    const domeM = new THREE.MeshStandardMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.35, metalness: 0.2, roughness: 0.1 });
    for (let i = 0; i < 12; i++) { const dm = new THREE.Mesh(new THREE.SphereGeometry(rand(10, 22), 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), domeM); dm.position.set(rand(-450, 450), 0, rand(-450, 450)); g.add(dm); }
    /* friendly hovering ships with light trails */
    const ships = [], TR = 40;
    const cabM = new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x2a8fbf, emissiveIntensity: 0.6, transparent: true, opacity: 0.8 });
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Group();
      const hull = ball(3, pale, 1); hull.scale.set(1.6, 0.35, 1.6); s.add(hull);
      const cab = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), cabM); cab.position.y = 0.5; s.add(cab);
      const gm = pick(glows), rim = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.3, 4, 20), gm); rim.rotation.x = Math.PI / 2; s.add(rim);
      const under = glowSprite(gm.color.getHex(), 9, 0.7); under.position.y = -1.2; s.add(under);
      const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TR * 3), 3));
      const trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ color: gm.color.getHex(), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false }));
      trail.frustumCulled = false;
      s.userData = { r: rand(50, 420), h: rand(25, 160), w: rand(0.05, 0.14) * (Math.random() < 0.5 ? -1 : 1), a: Math.random() * 6, wob: rand(5, 25), cx: rand(-80, 80), cz: rand(-80, 80), trail, init: false, tick: 0 };
      g.add(s, trail); ships.push(s);
    }
    const lanes = points(1400, (i) => { const a = (i / 1400) * Math.PI * 2 * 3, r = 140 + (i % 3) * 120; return [Math.cos(a) * r, 40 + (i % 3) * 35 + Math.sin(a * 4) * 6, Math.sin(a) * r]; }, 1.6, { colors: (i) => [0x4fe3ff, 0xff7ad9, 0xf3cf6b][i % 3], opacity: 0.85 });
    g.add(lanes);
    g.add(points(900, () => sphereShell(rand(1300, 1800)), 2, { atten: false, colors: () => pick([0xffffff, 0xd6c8ff, 0x9fe8ff]), fog: false }));
    const moon = glowSprite(0xffc8f0, 300, 0.7); moon.position.set(-600, 500, -900); g.add(moon);
    const moon2 = ball(70, new THREE.MeshBasicMaterial({ color: 0xe8d6ff, fog: false }), 2); moon2.position.set(700, 420, -1100); g.add(moon2);
    return { g, sky: [0x0a0a2e, 0x3a1f6b, 0x0a0a2e], fog: [0x241a52, 150, 950], hemi: [0xb8c8ff, 0x2a1f55, 1.1], sun: [0xd8d0ff, 1.2, [0.3, 1, 0.2]],
      start: new THREE.Vector3(0, 70, 0), minY: 4, maxY: 300, R: 520, spark: 0xffe7a3, towers,
      update(t, dt) {
        lanes.rotation.y += dt * 0.03;
        for (const s of ships) {
          const u = s.userData; u.a += u.w * dt;
          s.position.set(u.cx + Math.cos(u.a) * u.r, u.h + Math.sin(t * 0.5 + u.r) * u.wob * 0.3, u.cz + Math.sin(u.a) * u.r);
          s.rotation.y += dt * 1.5;
          const arr = u.trail.geometry.attributes.position.array;
          if (!u.init) { for (let i = 0; i < arr.length; i += 3) { arr[i] = s.position.x; arr[i + 1] = s.position.y; arr[i + 2] = s.position.z; } u.init = true; }
          u.tick += dt; if (u.tick > 0.06) { u.tick = 0; arr.copyWithin(3, 0, arr.length - 3); }
          arr[0] = s.position.x; arr[1] = s.position.y; arr[2] = s.position.z;
          u.trail.geometry.attributes.position.needsUpdate = true;
        }
      } };
  }
};

let env = null;
function disposeTree(o) {
  o.traverse((n) => {
    if (n.geometry) n.geometry.dispose();
    if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => m.dispose());
  });
}

/* ================= player ================= */
const player = { pos: new THREE.Vector3(), yaw: 0, vy: 0, yawRate: 0, speed: 16, level: 1, model: null, mode: 'fly', hop: 0 };
const SPEEDS = [9, 16, 28];
const MULS = [0.1618, 0.2, 0.4, 1, 2.19, 4, 9, 15];
let speedMul = parseFloat(store.get('rg-fly-mul', '1')); if (MULS.indexOf(speedMul) < 0) speedMul = 1;
function setChar(i) {
  charIdx = i; store.set('rg-fly-char3', String(i));
  if (player.model) { scene.remove(player.model); disposeTree(player.model); }
  player.model = CHAR_BUILD[i](); scene.add(player.model);
  if (document.getElementById('charSel')) document.getElementById('charSel').value = String(i);
  snapCam = true;
  if (typeof buildBuddy === 'function' && buddyOn) buildBuddy();
}

/* ================= collectibles ================= */
const NS = 60, NR = 8;
const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffd76a });
const sparks = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.5, 0), sparkMat, NS); sparks.frustumCulled = false;
const sparkPos = Array.from({ length: NS }, () => new THREE.Vector3());
const sparkGlow = points(NS, () => [0, 0, 0], 3.4, { color: 0xffd76a, opacity: 0.9 }); sparkGlow.frustumCulled = false;
scene.add(sparks, sparkGlow);
const ringGeo = new THREE.TorusGeometry(3.6, 0.32, 8, 32), ringInner = new THREE.CircleGeometry(3.3, 24);
const rings = [];
for (let i = 0; i < NR; i++) {
  const r = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xf3cf6b, transparent: true, opacity: 0.95 }));
  r.add(new THREE.Mesh(ringInner, new THREE.MeshBasicMaterial({ color: 0xffe7a3, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })));
  r.userData = { flash: 0 }; scene.add(r); rings.push(r);
}
const fwd = new THREE.Vector3(), right = new THREE.Vector3(), tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function heading() { fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw)); }
function floorAt(x, z) { return env.heightAt ? env.heightAt(x, z) + env.minY : env.minY; }
function placeAhead(v, near, far, spread, ring) {
  heading();
  for (let k = 0; k < 8; k++) {
    v.copy(player.pos).addScaledVector(fwd, rand(near, far)).addScaledVector(right, rand(-spread, spread));
    v.y = player.pos.y + rand(-25, 25);
    if (Math.hypot(v.x, v.z) > env.R) { v.x *= 0.6; v.z *= 0.6; }
    v.y = clamp(v.y, floorAt(v.x, v.z) + (ring ? 6 : 2), env.maxY - 5);
    if (!env.avoid || env.avoid.every((a) => v.distanceTo(tmp2.set(a[0], a[1], a[2])) > a[3] + 6)) break;
  }
}
function faceRing(r) { r.lookAt(player.pos.x, r.position.y, player.pos.z); }
function resetCollectibles() {
  for (const v of sparkPos) placeAhead(v, -150, 220, 180);
  for (const r of rings) { placeAhead(r.position, 30, 230, 110, true); faceRing(r); }
  /* one ring and a trail of sparks straight ahead so the first seconds feel good */
  heading();
  rings[0].position.copy(player.pos).addScaledVector(fwd, 45); faceRing(rings[0]);
  for (let i = 0; i < 6; i++) sparkPos[i].copy(player.pos).addScaledVector(fwd, 14 + i * 5);
}
let score = 0;
/* combo: rings within COMBO_GAP seconds of each other raise the ring multiplier x2, then x3 */
const COMBO_GAP = 4; let comboN = 0, comboT = -99, comboMul = 1;
function comboHit() { comboN = time - comboT <= COMBO_GAP ? comboN + 1 : 1; comboT = time; comboMul = comboN >= 3 ? 3 : comboN >= 2 ? 2 : 1; comboHud(); return comboMul; }
function comboTick() { if (comboMul > 1 && time - comboT > COMBO_GAP) { comboN = 0; comboMul = 1; comboHud(); } }
function comboHud() { const el = $('combo'); if (!el) return; el.textContent = comboMul > 1 ? T[lang].combo + ' x' + comboMul : ''; el.classList.toggle('on', comboMul > 1); }
function resetCombo() { comboN = 0; comboT = -99; comboMul = 1; comboHud(); }
/* rare golden comet: crosses near the player for 10 s; catching it gives +200 */
const COMET_PTS = 200, COMET_LIFE = 10;
const comet = new THREE.Group();
comet.add(new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe08a })));
const cometGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xffd76a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); cometGlow.scale.setScalar(9); comet.add(cometGlow);
const cometTail = new THREE.Mesh(new THREE.ConeGeometry(1.2, 14, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xffc94a, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
cometTail.rotation.x = -Math.PI / 2; cometTail.position.z = 7.5; comet.add(cometTail);
comet.visible = false; scene.add(comet);
const cometVel = new THREE.Vector3(); let cometLeft = 0, cometWait = rand(30, 50);
function spawnComet() {
  heading(); const side = Math.random() < 0.5 ? -1 : 1;
  comet.position.copy(player.pos).addScaledVector(fwd, rand(70, 110)).addScaledVector(right, side * 55); comet.position.y = clamp(player.pos.y + rand(-4, 8), floorAt(comet.position.x, comet.position.z) + 6, env.maxY - 5);
  cometVel.copy(right).multiplyScalar(-side * 11).addScaledVector(fwd, -2); // drifts across the view, toward the player a little
  comet.lookAt(tmp.copy(comet.position).sub(cometVel)); comet.visible = true; cometLeft = COMET_LIFE; flash(T[lang].cometSeen);
}
function updateComet(dt, playing) {
  if (!playing) return;
  if (!comet.visible) { cometWait -= dt; if (cometWait <= 0) { spawnComet(); cometWait = rand(30, 50); } return; }
  cometLeft -= dt; comet.position.addScaledVector(cometVel, dt); cometGlow.material.rotation += dt * 2;
  if (powerOn('magnet') && comet.position.distanceTo(player.pos) < 40) comet.position.lerp(player.pos, damp(1.5, dt));
  if (comet.position.distanceTo(player.pos) < 4 + player.model.userData.size) { comet.visible = false; addScore(COMET_PTS); showCel(T[lang].comet, T[lang].cometSub); }
  else if (cometLeft <= 0) comet.visible = false;
}
function resetComet() { comet.visible = false; cometWait = rand(30, 50); }
function addScore(n, bonus) {
  score += n; stats.addPoints(n, !!bonus); const el = $('score'); el.textContent = stats.get().total; /* HUD shows the user's accumulated total */ el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  if (score > best) { if (best > 0 && score - n <= best) flash(T[lang].best); best = score; store.set('rg-fly-best', String(best)); }
}
let msgTimer = 0;
function flash(text) { const m = $('msg'); m.textContent = text; m.style.opacity = 1; clearTimeout(msgTimer); msgTimer = setTimeout(() => (m.style.opacity = 0), 1100); }
const mtx = new THREE.Matrix4(), qq = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), eul = new THREE.Euler();
function updateCollectibles(t, dt, playing) {
  const size = player.model.userData.size, ga = sparkGlow.geometry.attributes.position;
  for (let i = 0; i < NS; i++) {
    const v = sparkPos[i];
    const d = v.distanceTo(player.pos);
    if (playing && d < 2.3 * size + 0.6) { addScore(powerOn('double') ? 2 : 1); placeAhead(v, 80, 240, 150); }
    else if (playing && d < 45 && powerOn('magnet')) v.lerp(player.pos, damp(2.5 + (45 - d) * 0.08, dt));
    else if (d > 330) placeAhead(v, 120, 250, 160);
    eul.set(0, t * 1.5 + i, 0); qq.setFromEuler(eul); tmp.set(v.x, v.y + Math.sin(t * 2 + i) * 0.3, v.z);
    mtx.compose(tmp, qq, one); sparks.setMatrixAt(i, mtx); ga.setXYZ(i, tmp.x, tmp.y, tmp.z);
  }
  sparks.instanceMatrix.needsUpdate = true; ga.needsUpdate = true;
  for (const r of rings) {
    const u = r.userData;
    if (u.flash > 0) {
      u.flash -= dt; r.scale.setScalar(1 + (0.6 - u.flash) * 1.5); r.material.opacity = Math.max(0, u.flash / 0.6);
      if (u.flash <= 0) { placeAhead(r.position, 120, 260, 120, true); faceRing(r); r.scale.setScalar(1); r.material.opacity = 0.95; }
      continue;
    }
    const d = r.position.distanceTo(player.pos);
    if (playing && d < 3.6 + (powerOn('magnet') ? 1.5 : 0)) { const cm = comboHit(); addScore((powerOn('double') ? 10 : 5) * cm); u.flash = 0.6; flash(cm > 1 ? T[lang].combo + ' x' + cm + '!' : pick(T[lang].ring)); if (powerOn('double')) burst(14, 0xffd76a); }
    else if (playing && d < 60 && powerOn('magnet')) { r.position.lerp(player.pos, damp(1.2, dt)); faceRing(r); }
    else if (d > 340) { placeAhead(r.position, 120, 260, 120, true); faceRing(r); }
  }
}

/* ================= the tools pad (bottom-left): three swipeable rings of four icon buttons ================= */
const TOOLS = [
  { id: 'boost', ic: '⚡', dur: 5, cd: 12 }, { id: 'shield', ic: '🛡️', dur: 7, cd: 16 }, { id: 'magnet', ic: '🧲', dur: 8, cd: 14 }, { id: 'slow', ic: '⏳', dur: 6, cd: 18 },
  { id: 'roll', ic: '🌀', dur: 0.9, cd: 1.1 }, { id: 'land', ic: '🛬' }, { id: 'double', ic: '✨', dur: 8, cd: 20 }, { id: 'buddy', ic: '🤝' },
  { id: 'photo', ic: '📸' }, { id: 'music', ic: '🎵' }, { id: 'trail', ic: '🌈' }, { id: 'night', ic: '🌗' }
];
const TI = Object.fromEntries(TOOLS.map((x, i) => [x.id, i]));
const pw = TOOLS.map(() => ({ left: 0, cd: 0 }));
const powerOn = (id) => pw[TI[id]].left > 0;
let ringIdx = 0;
function useTool(i) {
  if (state !== 'play') return false;
  const P = TOOLS[i], L = T[lang];
  if (P.dur) {
    if (pw[i].cd > 0) return false;
    pw[i].left = P.dur; pw[i].cd = P.cd;
    if (P.id !== 'roll') flash(P.ic + ' ' + L.tools[i]);
    if (P.id === 'double') burst(28, 0xffd76a);
    if (P.id === 'roll' && player.mode === 'walk') player.hop = 1;
  } else if (P.id === 'land') toggleLand();
  else if (P.id === 'buddy') { buddyOn = !buddyOn; store.set('rg-fly-buddy', buddyOn ? '1' : '0'); buildBuddy(); flash(P.ic + ' ' + (buddyOn ? L.chars[buddyIdx()] : L.off)); }
  else if (P.id === 'photo') enterPhoto();
  else if (P.id === 'music') { setMusic(!musicOn); flash(P.ic + ' ' + (musicOn ? L.on : L.off)); }
  else if (P.id === 'trail') { trailIdx = (trailIdx + 1) % TRAIL_COLORS.length; store.set('rg-fly-trail', String(trailIdx)); flash(P.ic + ' ' + L.trailNames[trailIdx]); }
  else if (P.id === 'night') { nightOn = !nightOn; store.set('rg-fly-night', nightOn ? '1' : '0'); applyLighting(); flash(P.ic + ' ' + (nightOn ? L.night : L.day)); }
  tutDid('tool'); updatePowerBtns(); return true;
}
function resetPowers() { for (const p of pw) { p.left = 0; p.cd = 0; } player.mode = 'fly'; updatePowerBtns(); }
function tickPowers(dt) { for (const p of pw) { p.left = Math.max(0, p.left - dt); p.cd = Math.max(0, p.cd - dt); } }
function toolActive(id) {
  if (TOOLS[TI[id]].dur) return powerOn(id);
  return id === 'land' ? player.mode !== 'fly' : id === 'buddy' ? buddyOn : id === 'music' ? musicOn : id === 'night' ? nightOn : false;
}
function updatePowerBtns() {
  TOOLS.forEach((P, i) => {
    const b = $('pw' + i), p = pw[i];
    b.style.setProperty('--p', (P.dur && p.cd > 0 ? Math.min(100, p.cd / P.cd * 100) : 0).toFixed(1) + '%');
    b.style.setProperty('--a', (P.dur && p.left > 0 ? p.left / P.dur * 100 : toolActive(P.id) ? 100 : 0).toFixed(1) + '%');
    b.classList.toggle('act', toolActive(P.id)); b.classList.toggle('ready', !!P.dur && p.cd <= 0);
  });
  $('pw' + TI.trail).style.setProperty('--tc', trailCss());
  $('hud').classList.toggle('slowfx', powerOn('slow'));
}
function setRing(r, show) {
  const was = ringIdx; ringIdx = ((r % 3) + 3) % 3;
  document.querySelectorAll('#powers .ring').forEach((el, k) => { el.classList.toggle('cur', k === ringIdx); el.classList.toggle('prev', k === (ringIdx + 2) % 3); });
  document.querySelectorAll('#powers .dot').forEach((el, k) => el.classList.toggle('on', k === ringIdx));
  if (show !== false) { const l = $('ringLbl'); l.textContent = T[lang].rings[ringIdx]; l.classList.add('show'); clearTimeout(setRing.t); setRing.t = setTimeout(() => l.classList.remove('show'), 1300); }
  if (ringIdx !== was) tutDid('ringchg');
}
/* pad gestures: tap a button = use it, swipe anywhere on the pad = next/previous ring, long-press = name tooltip */
const pad = $('powers'), tips = $('tip'), padPtr = new Map();
pad.addEventListener('pointerdown', (e) => {
  if (state !== 'play') return;
  e.preventDefault(); e.stopPropagation();
  try { pad.setPointerCapture(e.pointerId); } catch (_) {}
  const btn = e.target.closest('.pw'), dot = e.target.closest('.dot');
  const p = { x: e.clientX, y: e.clientY, btn, dot, long: false, timer: 0 };
  if (btn) p.timer = setTimeout(() => { p.long = true; showTip(btn); }, 480);
  padPtr.set(e.pointerId, p);
});
pad.addEventListener('pointermove', (e) => {
  const p = padPtr.get(e.pointerId); if (!p) return;
  if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 14) clearTimeout(p.timer);
});
const padEnd = (e, cancel) => {
  const p = padPtr.get(e.pointerId); if (!p) return; padPtr.delete(e.pointerId); clearTimeout(p.timer);
  if (p.long) { setTimeout(() => tips.classList.remove('show'), 900); return; }
  if (cancel) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  if (Math.hypot(dx, dy) > 26) { const dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : -1) : (dy > 0 ? 1 : -1); setRing(ringIdx + dir); return; }
  if (p.dot) setRing(+p.dot.dataset.r);
  else if (p.btn) useTool(+p.btn.dataset.i);
};
pad.addEventListener('pointerup', (e) => padEnd(e, false)); pad.addEventListener('pointercancel', (e) => padEnd(e, true));
pad.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const b = e.target.closest('.pw'), d = e.target.closest('.dot'); if (b) { useTool(+b.dataset.i); e.preventDefault(); } else if (d) { setRing(+d.dataset.r); e.preventDefault(); } } });
function showTip(btn) {
  const r = btn.getBoundingClientRect(); tips.textContent = T[lang].tools[+btn.dataset.i];
  tips.style.left = Math.round(r.left + r.width / 2) + 'px'; tips.style.top = Math.round(r.top - 8) + 'px'; tips.classList.add('show');
}

/* ---- effects that follow the character: shield bubble, magnet waves, light trail ---- */
const fx = new THREE.Group(); scene.add(fx);
const bubble = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), new THREE.MeshBasicMaterial({ color: 0x8fb0ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
const bubbleEdge = new THREE.Mesh(new THREE.IcosahedronGeometry(1.02, 1), new THREE.MeshBasicMaterial({ color: 0xdfe8ff, wireframe: true, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
bubble.add(bubbleEdge); fx.add(bubble);
const magRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.035, 6, 48), new THREE.MeshBasicMaterial({ color: 0xf3cf6b, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
const magRing2 = magRing.clone(); magRing2.material = magRing.material.clone(); fx.add(magRing, magRing2);
const TRAIL_COLORS = [0x6f9cff, 0xffd76a, 0xffffff, 0xb07cff, 0xff8fc8, -1]; // blue, gold, white, purple, pink, rainbow (no green)
const RAINBOW = [0xff6b6b, 0xffa94d, 0xffe066, 0x74c0fc, 0x6f7bff, 0xb07cff, 0xff8fc8];
let trailIdx = clamp(parseInt(store.get('rg-fly-trail', '0'), 10) || 0, 0, TRAIL_COLORS.length - 1);
const trailColor = () => TRAIL_COLORS[trailIdx] >= 0 ? TRAIL_COLORS[trailIdx] : RAINBOW[(time * 6 | 0) % RAINBOW.length];
const trailCss = () => TRAIL_COLORS[trailIdx] >= 0 ? '#' + TRAIL_COLORS[trailIdx].toString(16).padStart(6, '0') : 'conic-gradient(#ff6b6b,#ffe066,#74c0fc,#b07cff,#ff8fc8,#ff6b6b)';
const TRAIL = [];
for (let i = 0; i < 90; i++) { const s = glowSprite(0xffffff, 1, 0); s.visible = false; s.userData = { life: 0, max: 1, v: new THREE.Vector3() }; scene.add(s); TRAIL.push(s); }
let trailI = 0, trailAcc = 0;
function emit(pos, color, size, life, vel) {
  const s = TRAIL[trailI = (trailI + 1) % TRAIL.length], u = s.userData;
  s.position.copy(pos); s.material.color.set(color); s.scale.setScalar(size); s.visible = true; u.life = u.max = life; u.size = size; u.v.copy(vel || tmp2.set(0, 0, 0));
}
function burst(n, color) { for (let i = 0; i < n; i++) emit(player.pos, color, rand(0.6, 1.4), rand(0.6, 1.1), tmp.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).setLength(rand(6, 12))); }
function updateFx(t, dt, playing) {
  const sz = player.model.userData.size;
  bubble.visible = playing && powerOn('shield');
  if (bubble.visible) {
    const fade = pw[TI.shield].left < 1.5 ? (Math.sin(t * 18) > 0 ? 1 : 0.35) : 1; // blinks just before it ends
    bubble.position.copy(player.pos); bubble.scale.setScalar(sz * 1.55 * (1 + Math.sin(t * 4) * 0.03));
    bubble.material.opacity = 0.2 * fade; bubbleEdge.material.opacity = 0.35 * fade; bubbleEdge.rotation.y = t * 0.6;
  }
  magRing.visible = magRing2.visible = playing && powerOn('magnet');
  if (magRing.visible) for (const [r, k] of [[magRing, 0], [magRing2, 0.5]]) {
    const ph = (t * 0.9 + k) % 1; r.position.copy(player.pos); r.rotation.set(Math.PI / 2, 0, 0); r.scale.setScalar(sz * (2 + ph * 7)); r.material.opacity = 0.7 * (1 - ph);
  }
  if (playing && player.mode === 'fly') {
    const strong = powerOn('boost') || powerOn('double');
    trailAcc += dt * (strong ? 40 : 12);
    while (trailAcc > 1) {
      trailAcc--;
      tmp.copy(player.pos).addScaledVector(fwd, -1.1 * sz).add(tmp2.set(rand(-0.3, 0.3), rand(-0.3, 0.3), rand(-0.3, 0.3)).multiplyScalar(sz));
      const c = powerOn('double') && Math.random() < 0.6 ? (Math.random() < 0.5 ? 0xffd76a : 0xfff3c4) : trailColor();
      emit(tmp, c, rand(0.45, 0.9) * sz * (strong ? 1.2 : 0.8), rand(0.5, strong ? 0.9 : 1.2));
    }
  }
  for (const s of TRAIL) {
    const u = s.userData; if (!s.visible) continue;
    u.life -= dt; if (u.life <= 0) { s.visible = false; continue; }
    const k = u.life / u.max; s.position.addScaledVector(u.v, dt); u.v.multiplyScalar(1 - dt * 2);
    s.material.opacity = k * 0.9; s.scale.setScalar(u.size * (0.4 + k * 0.6));
  }
}

/* ---- land & walk ---- */
const GROUND = { snow: 1, atlantis: 1, alien: 1, clouds: 1, dimension: 1 }; // worlds with a surface; in open space you stop and hover
function toggleLand() {
  const L = T[lang];
  if (player.mode === 'fly') {
    if (GROUND[ENV_IDS[envIdx]]) { player.mode = 'landing'; flash('🛬 ' + L.landing); }
    else { player.mode = 'hover'; flash('🛬 ' + L.hover); }
  } else { player.mode = 'fly'; player.vy = 9; flash('🛫 ' + L.takeoff); }
}
const groundH = () => { const u = player.model.userData; return u.stand ? u.size * 1.0 : u.size * 0.6; };

/* ---- companion ---- */
let buddyOn = store.get('rg-fly-buddy', '0') === '1', buddy = null, buddyChar = parseInt(store.get('rg-fly-buddy-char', '-1'), 10);
const buddyYaw = { v: 0 }, buddyPrev = new THREE.Vector3();
function buddyIdx() { let i = buddyChar >= 0 && buddyChar < CHAR_BUILD.length ? buddyChar : (charIdx + 4) % CHAR_BUILD.length; if (i === charIdx) i = (i + 1) % CHAR_BUILD.length; return i; }
function buildBuddy() {
  if (buddy) { scene.remove(buddy); disposeTree(buddy); buddy = null; }
  if (!buddyOn) return;
  buddy = CHAR_BUILD[buddyIdx()](); buddy.scale.setScalar(0.85); scene.add(buddy);
  heading(); buddy.position.copy(player.pos).addScaledVector(right, 4); buddyPrev.copy(buddy.position); buddyYaw.v = player.yaw;
}
function updateBuddy(t, dt, playing) {
  if (!buddy) return;
  const sz = player.model.userData.size;
  want.copy(player.pos).addScaledVector(right, 3.4 * sz + 1).addScaledVector(fwd, -1.6 * sz).add(tmp.set(0, player.mode === 'walk' ? 0 : 0.8 + Math.sin(t * 1.3) * 0.4, 0));
  if (player.mode === 'walk') want.y = floorAt(want.x, want.z) + (buddy.userData.stand ? 0.85 : 0.5);
  buddyPrev.copy(buddy.position);
  buddy.position.lerp(want, damp(playing ? 3 : 2, dt));
  let d = player.yaw - buddyYaw.v; d = Math.atan2(Math.sin(d), Math.cos(d)); buddyYaw.v += d * damp(3, dt);
  buddy.rotation.order = 'YXZ'; buddy.rotation.y = buddyYaw.v;
  const vy = (buddy.position.y - buddyPrev.y) / Math.max(dt, 1e-3);
  buddy.rotation.x = player.mode === 'walk' && buddy.userData.stand ? Math.PI / 2 * 0.92 : clamp(vy / 11, -1, 1) * 0.4;
  buddy.rotation.z = clamp(-d * 0.8, -0.5, 0.5);
  buddy.userData.anim(t + 1.7, playing ? 0.5 : 0.2);
}

/* ---- day / night inside the world ---- */
let nightOn = store.get('rg-fly-night', '0') === '1';
const NIGHT = new THREE.Color(0x030614), cc = new THREE.Color();
const stars = points(1400, () => { const v = new THREE.Vector3(rand(-1, 1), rand(0.02, 1), rand(-1, 1)).setLength(1500); return [v.x, v.y, v.z]; }, 2.2, { color: 0xffffff, opacity: 0.9 });
stars.frustumCulled = false; stars.material.fog = false; scene.add(stars);
const moon = glowSprite(0xe8eeff, 170, 0.95); moon.material.fog = false; scene.add(moon);
function applyLighting() {
  const n = nightOn, k = 0.8;
  const set = (u, c) => skyMat.uniforms[u].value.set(c).lerp(NIGHT, n ? k : 0);
  set('top', env.sky[0]); set('hor', env.sky[1]); set('bot', env.sky[2]);
  if (scene.fog) scene.fog.color.set(env.fog[0]).lerp(NIGHT, n ? k : 0);
  hemi.color.set(env.hemi[0]); hemi.groundColor.set(env.hemi[1]); hemi.intensity = env.hemi[2] * (n ? 0.45 : 1);
  if (n) hemi.color.lerp(cc.set(0x7f8fd0), 0.5);
  sunLight.color.set(n ? 0xb8c8ff : env.sun[0]); sunLight.intensity = env.sun[1] * (n ? 0.4 : 1) + (n && env.sun[1] < 0.2 ? 0.25 : 0);
  stars.visible = moon.visible = n && ENV_IDS[envIdx] !== 'atlantis';
}

/* ---- music: soft generated tunes per world (Web Audio, no files), off by default ---- */
let musicOn = store.get('rg-fly-music', '0') === '1', actx = null, mOut = null, mTimer = 0, mNext = 0, mStep = 0;
const SCALES = { snow: [60, 62, 64, 67, 69], solar: [62, 64, 66, 69, 71, 73], galaxy: [57, 60, 62, 64, 67], dimension: [64, 66, 67, 69, 71, 74], atlantis: [53, 57, 60, 64, 65], clouds: [67, 69, 71, 74, 76], alien: [58, 60, 62, 64, 66, 68] };
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
function tone(f, t0, dur, vol, type) {
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.9, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(mOut); o.start(t0); o.stop(t0 + dur + 0.05);
}
function musicTick() {
  if (!actx || !musicOn) return;
  const sc = SCALES[ENV_IDS[envIdx]] || SCALES.snow, beat = 0.55;
  while (mNext < actx.currentTime + 0.6) {
    if (mStep % 8 === 0) for (const k of [0, 2, 4]) tone(hz(sc[k % sc.length] - 12), mNext, beat * 8.5, 0.05, 'sine');
    if (Math.random() < 0.55) tone(hz(pick(sc) + (Math.random() < 0.3 ? 12 : 0)), mNext, 1.8, 0.07, 'triangle');
    mNext += beat; mStep++;
  }
}
function setMusic(onOff) {
  musicOn = onOff; store.set('rg-fly-music', onOff ? '1' : '0');
  if (onOff) {
    try {
      if (!actx) {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
        const dl = actx.createDelay(1); dl.delayTime.value = 0.36; const fb = actx.createGain(); fb.gain.value = 0.33;
        mOut = actx.createGain(); mOut.gain.value = 0; mOut.connect(lp); lp.connect(actx.destination); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(actx.destination);
      }
      actx.resume(); mOut.gain.cancelScheduledValues(actx.currentTime); mOut.gain.setTargetAtTime(0.9, actx.currentTime, 0.6);
      mNext = actx.currentTime + 0.1; clearInterval(mTimer); mTimer = setInterval(musicTick, 200);
    } catch (e) { musicOn = false; }
  } else if (actx) { mOut.gain.setTargetAtTime(0, actx.currentTime, 0.3); clearInterval(mTimer); }
}

/* ---- photo mode: game paused, HUD hidden, drag to orbit, save a PNG ---- */
const orbit = { yaw: 0, pitch: 0.25, dist: 8, ptr: null, x: 0, y: 0 };
function enterPhoto() {
  state = 'photo'; $('hud').classList.add('hidden'); $('photoUi').classList.remove('hidden');
  tmp.copy(camera.position).sub(player.pos); orbit.dist = clamp(tmp.length(), 3, 40);
  orbit.yaw = Math.atan2(tmp.x, tmp.z); orbit.pitch = Math.asin(clamp(tmp.y / (tmp.length() || 1), -0.9, 1.2));
  joyId = null; joyRest();
}
function exitPhoto() { state = 'play'; $('photoUi').classList.add('hidden'); showHud(); }
const cv = $('c');
cv.addEventListener('pointerdown', (e) => { if (state !== 'photo' || orbit.ptr !== null) return; orbit.ptr = e.pointerId; orbit.x = e.clientX; orbit.y = e.clientY; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
cv.addEventListener('pointermove', (e) => {
  if (e.pointerId !== orbit.ptr) return;
  orbit.yaw -= (e.clientX - orbit.x) * 0.008; orbit.pitch = clamp(orbit.pitch + (e.clientY - orbit.y) * 0.006, -0.6, 1.3); orbit.x = e.clientX; orbit.y = e.clientY;
});
const orbitEnd = (e) => { if (e.pointerId === orbit.ptr) orbit.ptr = null; };
cv.addEventListener('pointerup', orbitEnd); cv.addEventListener('pointercancel', orbitEnd);
cv.addEventListener('wheel', (e) => { if (state === 'photo') { orbit.dist = clamp(orbit.dist * (e.deltaY > 0 ? 1.1 : 0.9), 3, 40); e.preventDefault(); } }, { passive: false });
$('phZoomIn').addEventListener('click', () => { orbit.dist = clamp(orbit.dist * 0.8, 3, 40); });
$('phZoomOut').addEventListener('click', () => { orbit.dist = clamp(orbit.dist * 1.25, 3, 40); });
$('phExit').addEventListener('click', exitPhoto);
$('phSave').addEventListener('click', () => {
  renderer.render(scene, camera); // draw now so the picture can be read in the same moment
  const url = renderer.domElement.toDataURL('image/png');
  const a = document.createElement('a'); a.href = url; a.download = (lang === 'he' ? 'פלייפיי-צילום-' : 'playify-photo-') + Date.now() + '.png';
  document.body.appendChild(a); a.click(); a.remove();
  flash('📸 ' + T[lang].saved);
});

/* ---- short optional tutorial (first play only, or from the menu) ---- */
const TUT = [
  { sel: '#joy', key: 'tJoy', done: 'joy' },
  { sel: '#powers', key: 'tPow', done: 'tool', ring: 0 },
  { sel: '#powers', key: 'tSwipe', done: 'ringchg', ring: 0, rings: true },
  { sel: '#powers', key: 'tFlight', done: 'tool', ring: 1 },
  { sel: '#powers', key: 'tAtmo', done: null, ring: 2 },
  { sel: '#hud .r2', key: 'tCam', done: null },
  { sel: '#hud .r1', key: 'help', done: null }
];
let tutStep = -1;
function tutStart() { tutBusy = false; tutStep = 0; $('tut').classList.remove('hidden'); tutShow(); }
function tutEnd() { tutStep = -1; $('tut').classList.add('hidden'); store.set('rg-fly-tut', '1'); }
function tutShow() {
  const s = TUT[tutStep], L = T[lang];
  if (s.ring !== undefined && ringIdx !== s.ring) setRing(s.ring, false);
  const el = document.querySelector(s.sel), r = el.getBoundingClientRect(), pad = 8;
  const spot = $('tutSpot'); spot.style.left = (r.left - pad) + 'px'; spot.style.top = (r.top - pad) + 'px'; spot.style.width = (r.width + pad * 2) + 'px'; spot.style.height = (r.height + pad * 2) + 'px';
  spot.style.borderRadius = (s.sel === '#hud .r2' || s.sel === '#hud .r1') ? '16px' : '50%';
  const tx = $('tutTxt'); tx.innerHTML = (s.key === 'help' ? '<span style="font-size:14px;font-weight:500">' + (isTouch ? L.helpTouch : L.helpDesk) + '</span>' : L[s.key]) + (s.rings ? '<div class="rn">' + L.rings.map((n, i) => `<span>${i + 1}. ${n}</span>`).join('') + '</div>' : '');
  // put the text on the side of the screen away from the spotlight
  const bx = $('tutBox'), below = r.top < innerHeight / 2;
  bx.style.top = below ? Math.min(innerHeight - bx.offsetHeight - 8, r.bottom + 18) + 'px' : ''; bx.style.bottom = below ? '' : Math.min(innerHeight - bx.offsetHeight - 8, Math.max(8, innerHeight - r.top + 18)) + 'px';
  $('tutNext').textContent = tutStep === TUT.length - 1 ? L.tDone : L.tNext; $('tutStepN').textContent = (tutStep + 1) + ' / ' + TUT.length;
}
function tutNext() { if (tutStep < 0) return; tutStep++; if (tutStep >= TUT.length) tutEnd(); else tutShow(); }
let tutBusy = false;
function tutDid(what) { if (tutStep >= 0 && !tutBusy && TUT[tutStep].done === what) { tutBusy = true; setTimeout(() => { tutBusy = false; tutNext(); }, 450); } }
$('tutSkip').addEventListener('click', tutEnd);
$('tutNext').addEventListener('click', tutNext);
// a tap anywhere outside the highlighted control (and outside the tutorial box) also moves on
document.addEventListener('pointerdown', (e) => {
  if (tutStep < 0) return;
  const s = TUT[tutStep], el = document.querySelector(s.sel);
  if (e.target.closest('#tutBox') || (el && el.contains(e.target))) return;
  tutNext();
}, true);
$('tutBtn').addEventListener('click', () => { $('startBtn').click(); setTimeout(() => { if (tutStep < 0 && state === 'play') tutStart(); }, 350); });

function setEnv(i) {
  envIdx = i; store.set('rg-fly-env', String(i));
  if (env) { scene.remove(env.g); disposeTree(env.g); }
  env = ENVS[ENV_IDS[i]]();
  scene.add(env.g);
  scene.fog = env.fog ? new THREE.Fog(env.fog[0], env.fog[1], env.fog[2]) : null;
  sunLight.position.set(...env.sun[2]);
  applyLighting();
  sparkMat.color.set(env.spark); sparkGlow.material.color.set(env.spark);
  player.pos.copy(env.start); player.yaw = 0; player.vy = 0; player.yawRate = 0; player.mode = 'fly';
  resetCollectibles(); if (buddy) buildBuddy();
  snapCam = true;
  syncSelects();
}

/* ================= input ================= */
let state = 'menu';
const keys = {};
const input = { jx: 0, jy: 0, mx: 0, my: 0, up: 0, down: 0 };
addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'SELECT') return;
  keys[e.code] = true;
  if (state === 'photo') { if (e.code === 'Escape') exitPhoto(); return; }
  if (state === 'play') {
    if (e.code === 'Escape' || e.code === 'KeyP') { if (tutStep >= 0) tutEnd(); else toMenu(); }
    if (e.code === 'Digit1') setSpeed(0);
    if (e.code === 'Digit2') setSpeed(1);
    if (e.code === 'Digit3') setSpeed(2);
    if (e.code === 'KeyF') setSpeed((player.level + 1) % 3);
    const pk = ['KeyZ', 'KeyX', 'KeyC', 'KeyV'].indexOf(e.code); if (pk >= 0) useTool(ringIdx * 4 + pk);
    if (e.code === 'KeyQ') setRing(ringIdx - 1); if (e.code === 'KeyE') setRing(ringIdx + 1);
    if (/^(Arrow|Space)/.test(e.code)) e.preventDefault();
  } else if (state === 'menu' && e.code === 'Enter' && document.activeElement === document.body) $('startBtn').click();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const joy = $('joy'), knob = joy.querySelector('i'), touchEl = $('touch');
let joyId = null, mouseId = null, mouseX0 = 0, mouseY0 = 0;
function joyRest() { knob.style.transform = ''; joy.classList.remove('on'); input.jx = input.jy = 0; }
/* Fixed joystick: the knob follows the finger inside the ring; analog in every direction (right/left = turn, up/down = climb/dive). */
function joySet(e) {
  const r = joy.getBoundingClientRect(), max = r.width * 0.33;
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const l = Math.hypot(dx, dy);
  if (l > max) { dx *= max / l; dy *= max / l; }
  knob.style.transform = `translate(-50%, -50%) translate(${dx}px, ${dy}px)`;
  const m = Math.min(l, max) / max, dz = 0.1, k = m < dz ? 0 : (m - dz) / (1 - dz) / (m || 1);
  input.jx = dx / max * k; input.jy = dy / max * k;
  if (m > 0.6) tutDid('joy');
}
joy.addEventListener('pointerdown', (e) => {
  if (state !== 'play' || joyId !== null) return;
  e.preventDefault(); e.stopPropagation();
  joyId = e.pointerId; try { joy.setPointerCapture(e.pointerId); } catch (_) {}
  joy.classList.add('on'); joySet(e);
});
joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) { e.preventDefault(); joySet(e); } });
const joyEnd = (e) => { if (e.pointerId === joyId) { joyId = null; joyRest(); } };
joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd); joy.addEventListener('lostpointercapture', joyEnd);
/* Mouse drag anywhere else on the screen still steers on a computer. */
touchEl.addEventListener('pointerdown', (e) => {
  if (state !== 'play' || e.pointerType !== 'mouse') return;
  mouseId = e.pointerId; mouseX0 = e.clientX; mouseY0 = e.clientY; touchEl.setPointerCapture(e.pointerId);
});
touchEl.addEventListener('pointermove', (e) => {
  if (e.pointerId === mouseId) { input.mx = clamp((e.clientX - mouseX0) / 140, -1, 1); input.my = clamp((e.clientY - mouseY0) / 140, -1, 1); }
});
const endPtr = (e) => { if (e.pointerId === mouseId) { mouseId = null; input.mx = input.my = 0; } };
touchEl.addEventListener('pointerup', endPtr); touchEl.addEventListener('pointercancel', endPtr);
function setSpeed(l) { player.level = l; }
document.addEventListener('contextmenu', (e) => { if (state === 'play') e.preventDefault(); });

/* ================= flight ================= */
let boundaryMsg = 0;
function updatePlayer(dt) {
  const k = (a, b) => (keys[a] || keys[b] ? 1 : 0);
  const turn = clamp(input.jx + input.mx + k('ArrowRight', 'KeyD') - k('ArrowLeft', 'KeyA'), -1, 1);
  const climb = clamp(-input.jy - input.my + k('ArrowUp', 'KeyW') - k('ArrowDown', 'KeyS') + (input.up || keys.Space ? 1 : 0) - (input.down || keys.ShiftLeft || keys.ShiftRight ? 1 : 0), -1, 1);
  player.yawRate += (-turn * 1.5 - player.yawRate) * damp(5, dt);
  player.yaw += player.yawRate * dt;
  if (Math.hypot(player.pos.x, player.pos.z) > env.R) {
    let diff = Math.atan2(player.pos.x, player.pos.z) - player.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); player.yaw += diff * damp(1.2, dt);
    if (performance.now() - boundaryMsg > 4000) { boundaryMsg = performance.now(); flash(T[lang].back); }
  }
  heading();
  const fl = floorAt(player.pos.x, player.pos.z);
  if (player.mode === 'walk' || player.mode === 'landing') {
    // on foot: up/down on the joystick walks forward/back, left/right turns
    const walk = player.mode === 'walk' ? clamp(-input.jy - input.my + k('ArrowUp', 'KeyW') - k('ArrowDown', 'KeyS'), -1, 1) : 0;
    player.speed += ((player.mode === 'landing' ? 5 : walk * 6) - player.speed) * damp(4, dt);
    player.pos.addScaledVector(fwd, player.speed * dt);
    const gy = floorAt(player.pos.x, player.pos.z) + groundH();
    if (player.mode === 'landing') { player.vy += (-clamp((player.pos.y - gy) * 1.6, 6, 28) - player.vy) * damp(4, dt); player.pos.y += player.vy * dt; if (player.pos.y <= gy + 0.05) { player.mode = 'walk'; player.vy = 0; updatePowerBtns(); } }
    if (player.mode === 'walk') { player.pos.y = gy + (player.hop > 0 ? Math.sin((1 - player.hop) * Math.PI) * 2.2 : 0); player.hop = Math.max(0, player.hop - dt * 1.4); player.vy = 0; }
  } else {
    const hov = player.mode === 'hover';
    player.speed += ((hov ? 0 : SPEEDS[player.level] * speedMul * (powerOn('boost') ? 1.9 : 1)) - player.speed) * damp(powerOn('boost') || hov ? 4 : 2, dt);
    player.vy += (climb * (hov ? 6 : 11) - player.vy) * damp(4, dt);
    player.pos.addScaledVector(fwd, player.speed * dt);
    player.pos.y += player.vy * dt;
    if (player.pos.y < fl + 1.2) { player.pos.y += (fl + 1.2 - player.pos.y) * damp(8, dt); if (player.vy < 0) player.vy *= 0.5; }
  }
  if (player.pos.y > env.maxY) { player.pos.y = env.maxY; player.vy = Math.min(player.vy, 0); }
  const shielded = powerOn('shield'); // the shield bubble lets you glide straight through towers and big objects
  if (env.towers && !shielded) for (const tw of env.towers) {
    const dx = player.pos.x - tw[0], dz = player.pos.z - tw[1], dd = Math.hypot(dx, dz);
    if (dd < tw[2] && player.pos.y < tw[3]) { player.pos.x = tw[0] + dx / (dd || 1) * tw[2]; player.pos.z = tw[1] + dz / (dd || 1) * tw[2]; }
  }
  if (env.avoid && !shielded) for (const a of env.avoid) { tmp.set(a[0], a[1], a[2]); if (player.pos.distanceTo(tmp) < a[3]) player.pos.sub(tmp).setLength(a[3]).add(tmp); }
}
function placeModel(t, playing) {
  const m = player.model;
  m.position.copy(player.pos);
  m.rotation.order = 'YXZ';
  m.rotation.y = player.yaw;
  const walking = player.mode === 'walk';
  m.rotation.x = walking ? (m.userData.stand ? Math.PI / 2 * 0.92 : 0) : playing ? clamp(player.vy / 11, -1, 1) * 0.45 : Math.sin(t * 0.8) * 0.05;
  m.rotation.z = playing && !walking ? clamp(player.yawRate * 0.45, -0.6, 0.6) : 0;
  const rl = pw[TI.roll].left; // roll: one full barrel roll, eased
  if (rl > 0 && !walking) { const q = 1 - rl / TOOLS[TI.roll].dur; m.rotation.z += Math.PI * 2 * (q * q * (3 - 2 * q)); }
  m.userData.anim(t, walking ? 0.8 * Math.min(1, Math.abs(player.speed) / 3) : playing ? player.level / 2 : 0.2);
}

/* ================= camera ================= */
let snapCam = true;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), want = new THREE.Vector3(), look = new THREE.Vector3(), fpE = new THREE.Euler(), sideOff = new THREE.Vector3(), sideSm = new THREE.Vector3();
function updateCamera(t, dt, playing) {
  const m = player.model, u = m.userData, cam = CAM_IDS[camIdx];
  heading();
  camera.up.copy(UP);
  m.visible = true;
  if (state === 'photo') {
    want.set(Math.sin(orbit.yaw) * Math.cos(orbit.pitch), Math.sin(orbit.pitch), Math.cos(orbit.yaw) * Math.cos(orbit.pitch)).multiplyScalar(orbit.dist).add(player.pos);
    camPos.lerp(want, damp(10, dt)); camLook.copy(player.pos);
    camera.position.copy(camPos); camera.lookAt(camLook); sky.position.copy(camera.position);
    return;
  }
  if (!playing) {
    const a = t * 0.25 + 0.6, r = u.camDist * 1.2;
    want.set(player.pos.x + Math.sin(a) * r, player.pos.y + r * 0.22, player.pos.z + Math.cos(a) * r);
    look.copy(player.pos); look.y -= 1.0 * u.size;
  } else if (player.mode === 'walk' && cam !== 'first') {
    // on foot: a calm camera a little behind and above the head, never under the ground
    want.copy(player.pos).addScaledVector(fwd, -u.camDist * 0.95).add(tmp.set(0, u.size * 1.7, 0));
    want.y = Math.max(want.y, floorAt(want.x, want.z) + 1.2);
    look.copy(player.pos).addScaledVector(fwd, 2.5).add(tmp.set(0, u.size * 0.5, 0));
  } else if (cam === 'third') {
    want.copy(player.pos).addScaledVector(fwd, -u.camDist).add(tmp.set(0, u.camDist * 0.35 - player.vy * 0.06, 0));
    look.copy(player.pos).addScaledVector(fwd, 4).add(tmp.set(0, 0.6, 0));
  } else if (cam === 'first') {
    m.visible = false;
    m.updateMatrixWorld(); want.copy(u.eye).applyMatrix4(m.matrixWorld);
    fpE.set(m.rotation.x * 0.7, m.rotation.y, 0, 'YXZ');
    look.set(0, 0, -10).applyEuler(fpE).add(want);
  } else {
    // side view: the offset is smoothed relative to the character and the camera always looks straight at it,
    // so the character stays in the middle of the screen while turning, climbing or diving
    sideOff.copy(right).multiplyScalar(u.camDist * 1.9).add(tmp.set(0, 1.5, 0));
    if (snapCam) sideSm.copy(sideOff); else sideSm.lerp(sideOff, damp(5, dt));
    camPos.copy(player.pos).add(sideSm); camLook.copy(player.pos);
    snapCam = false;
    camera.position.copy(camPos); camera.lookAt(camLook); sky.position.copy(camera.position);
    return;
  }
  if (snapCam || (playing && cam === 'first')) { camPos.copy(want); camLook.copy(look); snapCam = false; }
  else { const k = damp(playing ? 6 : 3, dt); camPos.lerp(want, k); camLook.lerp(look, k); }
  camera.position.copy(camPos); camera.lookAt(camLook);
  sky.position.copy(camera.position);
}

/* ================= UI ================= */
function applyLang() {
  const L = T[lang], d = document.documentElement;
  d.lang = lang; d.dir = lang === 'he' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-t]').forEach((el) => { const v = L[el.dataset.t]; if (typeof v === 'string') el.textContent = v; });
  if (resumable) $('startBtn').textContent = L.resume;
  document.title = lang === 'he' ? 'פלייפיי · Flyify' : 'Flyify · פלייפיי';
  $('langBtn').textContent = L.lang;
  $('charSel').innerHTML = L.chars.map((n, i) => `<option value="${i}">${CHAR_EMOJI[i]} ${n}</option>`).join(''); $('charSel').value = String(charIdx); $('charSel').setAttribute('aria-label', L.choose);
  for (const id of ['envSel', 'envSel2']) $(id).innerHTML = L.envs.map((n, i) => `<option value="${i}">${n}</option>`).join('');
  for (const id of ['mulSel2']) { $(id).innerHTML = MULS.map((m) => `<option value="${m}">x${m}</option>`).join(''); $(id).value = String(speedMul); $(id).setAttribute('aria-label', L.mul); }
  $('lbBtn').textContent = L.lb;
  for (const id of ['camSel', 'camSel2']) $(id).innerHTML = L.cams.map((n, i) => `<option value="${i}">${n}</option>`).join('');
  syncSelects(); applyTheme(); setSpeed(player.level);
  TOOLS.forEach((P, i) => { const b = $('pw' + i); b.setAttribute('aria-label', L.tools[i]); });
  document.querySelectorAll('#powers .ring').forEach((el, k) => el.setAttribute('aria-label', L.rings[k]));
  document.querySelectorAll('#powers .dot').forEach((el, k) => el.setAttribute('aria-label', L.rings[k]));
  $('buddySel').innerHTML = L.chars.map((n, i) => `<option value="${i}">${CHAR_EMOJI[i]} ${n}</option>`).join(''); $('buddySel').value = String(buddyIdx());
  $('tutSkip').textContent = L.tSkip; $('tutBtn').textContent = L.tutorial; $('phHint').textContent = L.photoHint;
  if (tutStep >= 0) tutShow();
  if (!$('installHint').classList.contains('hidden')) $('installHint').innerHTML = instHint();
}
function syncSelects() { $('envSel').value = $('envSel2').value = String(envIdx); $('camSel').value = $('camSel2').value = String(camIdx); }
function applyTheme() {
  document.documentElement.setAttribute('data-theme', theme);
  $('themeBtn').textContent = theme === 'dark' ? T[lang].themeDark : T[lang].themeLight;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', theme === 'light' ? '#f3efe6' : '#0a1238');
}
$('langBtn').addEventListener('click', () => { lang = lang === 'he' ? 'en' : 'he'; store.set('rg-lang', lang); applyLang(); });
$('themeBtn').addEventListener('click', () => { theme = theme === 'dark' ? 'light' : 'dark'; store.set('rg-fly-theme', theme); applyTheme(); });
const onEnv = (e) => { setEnv(parseInt(e.target.value, 10)); e.target.blur(); };
const onCam = (e) => { camIdx = parseInt(e.target.value, 10); store.set('rg-fly-cam', String(camIdx)); snapCam = true; syncSelects(); e.target.blur(); };
$('envSel').addEventListener('change', onEnv); $('envSel2').addEventListener('change', onEnv);
const onMul = (e) => { speedMul = parseFloat(e.target.value); store.set('rg-fly-mul', String(speedMul)); $('mulSel2').value = String(speedMul); e.target.blur(); };
$('charSel').addEventListener('change', (e) => { setChar(parseInt(e.target.value, 10)); e.target.blur(); });
$('mulSel2').addEventListener('change', onMul);
$('camSel').addEventListener('change', onCam); $('camSel2').addEventListener('change', onCam);
$('buddySel').addEventListener('change', (e) => { buddyChar = parseInt(e.target.value, 10); store.set('rg-fly-buddy-char', String(buddyChar)); if (buddyOn) buildBuddy(); e.target.blur(); });
/* in-game icon pickers: 📷 view, 🗺️ world, 💨 pace. Each opens a readable list built from the hidden select. */
const PICK_SELS = { camPick: 'camSel2', envPick: 'envSel2', mulPick: 'mulSel2' };
function closePick() { $('pickMenu').classList.add('hidden'); }
function openPick(btnId) {
  const sel = $(PICK_SELS[btnId]), m = $('pickMenu'), L = T[lang];
  if (!m.classList.contains('hidden') && m.dataset.for === btnId) { closePick(); return; }
  m.dataset.for = btnId;
  const title = btnId === 'camPick' ? L.view : btnId === 'envPick' ? L.world : L.mul;
  m.innerHTML = '<div class="ph">' + $(btnId).textContent + ' ' + (title || '') + '</div>' + Array.from(sel.options).map((o) => `<button type="button" class="po${o.value === sel.value ? ' on' : ''}" data-v="${o.value}">${o.textContent}</button>`).join('');
  m.classList.remove('hidden');
}
for (const id of Object.keys(PICK_SELS)) $(id).addEventListener('click', (e) => { e.stopPropagation(); openPick(id); });
$('pickMenu').addEventListener('click', (e) => {
  e.stopPropagation(); const b = e.target.closest('.po'); if (!b) return;
  const sel = $(PICK_SELS[$('pickMenu').dataset.for]); sel.value = b.dataset.v; sel.dispatchEvent(new Event('change')); closePick();
});
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#pickMenu') && !e.target.closest('.pk')) closePick(); });
function showHud() {
  $('menu').classList.add('hidden'); $('hud').classList.remove('hidden');
  $('joy').classList.remove('hidden'); $('powers').classList.remove('hidden');
  joyRest(); snapCam = true; setRing(ringIdx, false); updatePowerBtns();
}
let resumable = false;
function start() {
  stats.newGame();
  state = 'play'; score = 0; $('score').textContent = String(stats.get().total);
  player.pos.copy(env.start); player.yaw = 0; player.vy = 0; player.yawRate = 0; player.speed = SPEEDS[player.level] * speedMul;
  resetCollectibles(); resetPowers(); resetCombo(); resetComet(); resetWhite(); showHud(); resumable = true;
  const sbn = stats.daily(); if (sbn > 0) setTimeout(() => { if (state !== 'play') return; addScore(sbn, true); showCel(T[lang].streakBonus(stats.get().streak, sbn), T[lang].streakSub); menuStreak(); }, 900);
  if (!isTouch) { $('keysHint').classList.remove('hidden'); setTimeout(() => $('keysHint').classList.add('hidden'), 9000); }
  if (store.get('rg-fly-tut', '0') !== '1') setTimeout(() => { if (state === 'play' && tutStep < 0) tutStart(); }, 300);
}
function toMenu() {
  stats.flush(); menuStreak(); comet.visible = false; wh.visible = false;
  if (tutStep >= 0) tutEnd();
  closePick(); state = 'menu'; $('hud').classList.add('hidden'); $('photoUi').classList.add('hidden'); $('menu').classList.remove('hidden');
  if (resumable) $('startBtn').textContent = T[lang].resume; snapCam = true;
  input.jx = input.jy = input.mx = input.my = input.up = input.down = 0; joyId = mouseId = null; joyRest();
}
$('startBtn').addEventListener('click', () => { if (resumable) { state = 'play'; showHud(); } else start(); if (musicOn && !mTimer) setMusic(true); });
$('pauseBtn').addEventListener('click', toMenu);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (state === 'play' || state === 'photo')) toMenu();
  if (actx && musicOn) { if (document.hidden) actx.suspend(); else actx.resume(); }
});

/* install (same pattern as the other apps: native prompt, otherwise short instructions) */
const INST = {
  he: { android: '<ol><li>פותחים את תפריט הדפדפן: <b>⋮</b> למעלה ב־Chrome, או <b>☰</b> למטה ב־Samsung Internet.</li><li>בוחרים <b>„התקנת אפליקציה”</b> או <b>„הוספה למסך הבית”</b>.</li></ol>', ios: '<ol><li>ב־Safari לוחצים על כפתור השיתוף <b>(□↑)</b>.</li><li>בוחרים <b>„הוסף למסך הבית”</b> ואז <b>„הוסף”</b>.</li></ol>', desktop: '<ol><li>ב־Chrome או Edge: סמל ההתקנה בצד שורת הכתובת, או תפריט <b>⋮</b> ← <b>„התקנה”</b>.</li><li>בטלפון: פותחים את הכתובת בדפדפן ובוחרים <b>„הוספה למסך הבית”</b>.</li></ol>' },
  en: { android: '<ol><li>Open the browser menu: <b>⋮</b> at the top in Chrome, or <b>☰</b> at the bottom in Samsung Internet.</li><li>Choose <b>“Install app”</b> or <b>“Add to Home screen”</b>.</li></ol>', ios: '<ol><li>In Safari tap the Share button <b>(□↑)</b>.</li><li>Choose <b>“Add to Home Screen”</b>, then <b>“Add”</b>.</li></ol>', desktop: '<ol><li>In Chrome or Edge: click the install icon at the end of the address bar, or menu <b>⋮</b> → <b>“Install”</b>.</li><li>On a phone: open this address in the browser and choose <b>“Add to Home screen”</b>.</li></ol>' }
};
function instHint() { const ua = navigator.userAgent; const k = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : 'desktop'; return INST[lang][k]; }
let instDeferred = null;
const standalone = () => (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true);
if (standalone()) $('installBtn').classList.add('hidden');
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); instDeferred = e; });
addEventListener('appinstalled', () => { instDeferred = null; $('installBtn').classList.add('hidden'); $('installHint').classList.add('hidden'); });
$('installBtn').addEventListener('click', () => {
  if (instDeferred) { const d = instDeferred; instDeferred = null; try { d.prompt(); return; } catch (e) {} }
  const h = $('installHint'); h.innerHTML = instHint(); h.classList.toggle('hidden');
});
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});

/* ================= loop ================= */
let baseFov = 62, wtime = 0, hudTick = -1;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; baseFov = camera.aspect < 1 ? 72 : 62; camera.fov = baseFov; camera.updateProjectionMatrix();
  if (joyId === null) joyRest();
}
addEventListener('resize', resize);
resize();
applyLang();
setChar(charIdx);
setEnv(envIdx);

/* ================= black holes ================= */
function checkHoles() {
  for (const h of env.holes) {
    if (h.cd > 0) continue;
    h.g.getWorldPosition(tmp);
    if (tmp.distanceTo(player.pos) < h.r + 2) {
      h.cd = 6; addScore(50); flash(T[lang].hole);
      player.yawRate += 7; burst(26, 0xffc94a); burst(18, 0x4f7dff);
      // spat out on the far side of the hole, heading away
      player.pos.copy(tmp).addScaledVector(fwd, h.r * 3 + 6); player.vy = 4;
    }
  }
}

/* ================= white hole (space world): a glowing white/gold portal that appears ahead of you every ~39 s; flying in takes you to another galaxy ================= */
const WH_EVERY = 39, WH_LIFE = 30;
const wh = new THREE.Group();
wh.add(new THREE.Mesh(new THREE.SphereGeometry(6, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffffff })));
const whDisk = new THREE.Mesh(new THREE.RingGeometry(8, 20, 64), new THREE.MeshBasicMaterial({ color: 0xffe7a3, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
const whDisk2 = new THREE.Mesh(new THREE.RingGeometry(20, 28, 64), new THREE.MeshBasicMaterial({ color: 0xf3cf6b, transparent: true, opacity: 0.45, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
const whGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: 0xfff6e0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); whGlow.scale.setScalar(80);
wh.add(whDisk, whDisk2, whGlow); wh.visible = false; scene.add(wh);
let whWait = WH_EVERY, whLeft = 0, galaxyN = 0;
const isSpace = () => ENV_IDS[envIdx] === 'solar';
function spawnWhite() {
  wh.position.copy(player.pos).addScaledVector(fwd, rand(110, 150)).addScaledVector(right, rand(-10, 10));
  wh.position.y = clamp(player.pos.y + rand(-5, 8), env.minY + 10, env.maxY - 10);
  wh.lookAt(player.pos); wh.visible = true; whLeft = WH_LIFE; flash(T[lang].whSeen);
}
function nextGalaxy() {
  galaxyN++; const keep = player.yaw;
  scene.remove(env.g); disposeTree(env.g);
  env = ENVS.solar(galaxyN); scene.add(env.g); applyLighting();
  sparkMat.color.set(env.spark); sparkGlow.material.color.set(env.spark);
  player.pos.copy(env.start); player.yaw = keep; player.vy = 0; resetCollectibles(); snapCam = true;
  addScore(100); showCel(T[lang].wh, T[lang].whSub); burst(30, 0xffffff); burst(24, 0xffd76a);
}
function updateWhite(dt) {
  if (!isSpace()) { wh.visible = false; return; }
  whWait -= dt; if (whWait <= 0) { whWait = WH_EVERY; spawnWhite(); } // a fresh one every 39 s, no matter the speed
  /* keep the black holes coming too: if none is near, move the farthest one ahead of you every ~45 s */
  holeWait -= dt;
  if (holeWait <= 0 && env.holes) {
    holeWait = 45; let far = null, fd = -1, near = false;
    for (const h of env.holes) { const hd = h.g.position.distanceTo(player.pos); if (hd < 160) near = true; if (hd > fd) { fd = hd; far = h; } }
    if (!near && far) { far.g.position.copy(player.pos).addScaledVector(fwd, rand(140, 180)).addScaledVector(right, rand(-40, 40)); far.g.position.y = clamp(far.g.position.y, env.minY + 15, env.maxY - 15); }
  }
  if (!wh.visible) return;
  whLeft -= dt; whDisk.rotation.z -= dt * 1.8; whDisk2.rotation.z += dt * 1; whGlow.material.rotation += dt;
  const d = wh.position.distanceTo(player.pos);
  if (d < 45) wh.position.lerp(player.pos, damp(1.2, dt)); // gentle pull once you are close
  if (d < 16 + player.model.userData.size) { wh.visible = false; nextGalaxy(); }
  else if (whLeft <= 0) wh.visible = false;
}
let holeWait = 45;
function resetWhite() { wh.visible = false; whWait = WH_EVERY; holeWait = 45; }

/* ================= points: saved per user, accumulated across games, +400 bonus every 369 points ================= */
const BONUS_EVERY = 369, BONUS = 400;
const stats = (() => {
  const A = window.RGAccount;
  const blank = () => ({ v: 1, total: 0, earned: 0, best: 0, games: 0, bonuses: 0, streak: 0, lastDay: '' });
  const dayStr = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const uid = () => (A && A.user && A.user() ? A.user().id : '');
  const lkey = () => 'rg-fly-stats:' + (uid() || 'guest');
  const load = () => { try { return Object.assign(blank(), JSON.parse(store.get(lkey(), '') || '{}')); } catch (e) { return blank(); } };
  let s = load(), dirty = false, timer = 0, lbSent = '';
  const legacyBest = best; if (legacyBest > s.best) s.best = legacyBest;
  const save = () => { store.set(lkey(), JSON.stringify(s)); };
  const merge = (a, b) => { const r = blank(); for (const k of ['total', 'earned', 'best', 'games', 'bonuses']) r[k] = Math.max(a[k] || 0, b[k] || 0); const sb = (b.lastDay || '') > (a.lastDay || '') ? b : a; r.streak = sb.streak || 0; r.lastDay = sb.lastDay || ''; return r; };
  function push() {
    timer = 0; if (!dirty || !uid()) return; dirty = false;
    A.set('fly', 'stats', s).catch(() => { dirty = true; });
    lbPost();
  }
  function later() { dirty = true; save(); if (uid() && !timer) timer = setTimeout(push, 6000); }
  function lbPost() {
    const u = A.user(); if (!u) return;
    const val = JSON.stringify({ n: (u.name || '').trim().slice(0, 30), t: s.total, b: s.best, g: s.games });
    if (val === lbSent) return; lbSent = val;
    lb.post(u.id, val).catch(() => { lbSent = ''; });
  }
  function pull() {
    if (!uid()) { s = load(); hudTotal(); return; }
    const guest = (() => { try { return JSON.parse(store.get('rg-fly-stats:guest', '') || 'null'); } catch (e) { return null; } })();
    A.get('fly', 'stats').then((cloud) => {
      s = merge(load(), cloud || blank());
      if (guest && guest.lastDay && guest.lastDay > (s.lastDay || '')) { s.streak = guest.streak || 0; s.lastDay = guest.lastDay; }
      if (guest && guest.total > 0) { // points collected while signed out move into the account once
        for (const k of ['total', 'earned', 'games', 'bonuses']) s[k] += guest[k] || 0; s.best = Math.max(s.best, guest.best || 0);
        store.set('rg-fly-stats:guest', '');
      }
      dirty = true; save(); push(); lbPost(); hudTotal();
    }).catch(() => {});
  }
  if (A) { (A.ready && A.ready.then ? A.ready : Promise.resolve()).then(pull, pull); if (A.onChange) A.onChange(pull); }
  function hudTotal() { const el = document.getElementById('score'); if (el) el.textContent = String(s.total); }
  addEventListener('pagehide', () => { save(); push(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { save(); push(); } });
  return {
    get: () => s,
    newGame() { s.games++; later(); },
    addPoints(n, isBonus) {
      s.total += n;
      if (score > s.best) s.best = score;
      if (!isBonus) {
        const before = Math.floor(s.earned / BONUS_EVERY); s.earned += n;
        const hits = Math.floor(s.earned / BONUS_EVERY) - before;
        if (hits > 0) setTimeout(() => { for (let i = 0; i < hits; i++) { s.bonuses++; addScore(BONUS, true); } celebrate(); }, 0);
      }
      later();
    },
    /* daily streak: once per day on the first game; +20 per consecutive day, capped at +300; a missed day restarts at 1. Counts as bonus (not toward 369). */
    daily() {
      const now = new Date(), today = dayStr(now), y = new Date(now); y.setDate(y.getDate() - 1);
      if (s.lastDay === today) return 0;
      s.streak = s.lastDay === dayStr(y) ? (s.streak || 0) + 1 : 1; s.lastDay = today;
      const n = Math.min(300, 20 * s.streak); later(); return n;
    },
    streakNow() { const y = new Date(); y.setDate(y.getDate() - 1); return s.lastDay === dayStr(new Date()) || s.lastDay === dayStr(y) ? s.streak || 0 : 0; },
    toNext: () => BONUS_EVERY - (s.earned % BONUS_EVERY),
    flush() { if (timer) { clearTimeout(timer); } push(); }
  };
})();
function celebrate() { showCel(T[lang].bonus, T[lang].bonusSub); }
function showCel(title, sub) {
  const c = $('celebrate'); c.querySelector('b').textContent = title; c.querySelector('span').textContent = sub;
  c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
  for (let i = 0; i < 4; i++) setTimeout(() => { burst(30, 0xffd76a); burst(20, 0x6f9bff); }, i * 220);
  if (navigator.vibrate) try { navigator.vibrate([60, 40, 120]); } catch (e) {}
}

/* ================= leaderboard: one public row per player (app "fly", key "lb"), readable by anyone, writable only by its owner ================= */
const lb = (() => {
  const EP = 'https://fra.cloud.appwrite.io/v1', PROJ = '6adef4a40004c12a1e9c', PATH = '/tablesdb/ron/tables/userdata/rows';
  function req(method, path, body) {
    const h = { 'X-Appwrite-Project': PROJ, accept: 'application/json' };
    if (body) h['content-type'] = 'application/json';
    try { const fb = localStorage.getItem('cookieFallback'); if (fb) h['X-Fallback-Cookies'] = fb; } catch (e) {}
    return fetch(EP + path, { method, headers: h, credentials: 'include', cache: 'no-store', body: body ? JSON.stringify(body) : undefined })
      .then((r) => r.text().then((t) => { const j = t ? JSON.parse(t) : null; if (!r.ok) { const e = new Error((j && j.message) || r.status); e.status = r.status; throw e; } return j; }));
  }
  const rid = (uid) => ('flylb' + uid).slice(0, 36);
  return {
    post(uid, val) {
      const perms = ['read("any")', `update("user:${uid}")`, `delete("user:${uid}")`];
      return req('PATCH', PATH + '/' + rid(uid), { data: { value: val } }).catch((e) => {
        if (e.status !== 404) throw e;
        return req('POST', PATH, { rowId: rid(uid), data: { app: 'fly', key: 'lb', value: val }, permissions: perms });
      });
    },
    top() {
      const q = (o) => 'queries[]=' + encodeURIComponent(JSON.stringify(o));
      const qs = [q({ method: 'equal', attribute: 'app', values: ['fly'] }), q({ method: 'equal', attribute: 'key', values: ['lb'] }), q({ method: 'limit', values: [200] })].join('&');
      return req('GET', PATH + '?' + qs).then((j) => (j.rows || []).map((r) => { let v = {}; try { v = JSON.parse(r.value); } catch (e) {} return { id: r.$id, n: v.n || '', t: v.t || 0, b: v.b || 0 }; })
        .sort((a, b) => b.t - a.t).slice(0, 20));
    }
  };
})();
function esc(x) { return String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
function openLb() {
  const L = T[lang], s = stats.get(), A = window.RGAccount, me = A && A.user && A.user();
  const box = $('lbBox'); $('lbPanel').classList.remove('hidden');
  const mine = `<div class="lbm"><b>${L.lbMine}</b> · ${L.lbTotal}: <b>${s.total}</b> · ${L.lbBest}: <b>${s.best}</b> · ${L.lbGames}: ${s.games} · ${L.streak}: <b>${stats.streakNow()}</b> · ${stats.toNext()} ${L.lbNext}</div>` + (me ? '' : `<p class="lbs">${L.lbSignIn}</p>`);
  box.innerHTML = `<h2>${L.lbTitle}</h2>${mine}<p>${L.lbLoad}</p>`;
  lb.top().then((rows) => {
    const body = rows.length ? `<ol>${rows.map((r, i) => `<li class="${me && r.id === 'flylb' + me.id ? 'me' : ''}"><span>${['🥇', '🥈', '🥉'][i] || i + 1}</span><span>${esc(r.n || L.player + ' ' + r.id.slice(-4))}</span><b>${r.t}</b></li>`).join('')}</ol>` : `<p>${L.lbEmpty}</p>`;
    box.innerHTML = `<h2>${L.lbTitle}</h2>${mine}${body}`;
  }, () => { box.innerHTML = `<h2>${L.lbTitle}</h2>${mine}<p>${L.lbErr}</p>`; });
}
$('lbBtn').addEventListener('click', openLb);
function menuStreak() { const el = $('streakLine'); if (el) { const n = stats.streakNow(); el.textContent = n > 0 ? T[lang].streak + ': ' + n + ' ' + T[lang].streakDay + (lang === 'en' && n > 1 ? 's' : lang === 'he' && n > 1 ? 'ים' : '') : ''; } }
menuStreak(); setTimeout(menuStreak, 3000);
$('lbClose').addEventListener('click', () => $('lbPanel').classList.add('hidden'));

const clock = new THREE.Clock();
let time = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05); time += dt;
  const playing = state === 'play';
  if (playing) updatePlayer(dt);
  if (playing) tickPowers(dt);
  if (playing && env.holes) checkHoles();
  if (playing) { comboTick(); updateComet(dt, playing); updateWhite(dt); }
  const wdt = state === 'photo' ? 0 : playing && powerOn('slow') ? dt * 0.3 : dt; wtime += wdt; // slow time: the world around you moves at 30%
  if (state !== 'photo') env.update(wtime, wdt, player.pos);
  if (nightOn && ENV_IDS[envIdx] === 'dimension') skyMat.uniforms.hor.value.lerp(NIGHT, 0.8);
  stars.position.copy(camera.position); moon.position.copy(camera.position).add(tmp.set(-600, 520, -800));
  if (state !== 'photo') placeModel(time, playing);
  if (state !== 'photo') { updateCollectibles(wtime, wdt, playing); updateFx(time, dt, playing); updateBuddy(time, dt, playing); }
  const fov = baseFov + (playing && powerOn('boost') ? 10 : 0); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * damp(4, dt); camera.updateProjectionMatrix(); }
  if (playing && (time * 10 | 0) !== hudTick) { hudTick = time * 10 | 0; updatePowerBtns(); }
  updateCamera(time, dt, playing);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* small hook for automated checks */
window.__fly = {
  setEnv, setChar, start, toMenu, spawnComet, spawnWhite, get galaxy() { return galaxyN; }, get whiteHole() { return { on: wh.visible, wait: whWait, pos: wh.position.toArray().map(Math.round) }; }, comboHit, stats,
  setCam(i) { camIdx = i; snapCam = true; syncSelects(); },
  setLang(l) { lang = l; store.set('rg-lang', l); applyLang(); },
  setTheme(t) { theme = t; applyTheme(); },
  steer(x, y) { input.jx = x; input.jy = y; },
  tool(id) { const i = TI[id]; pw[i].cd = 0; return useTool(i); }, setRing, tutStart, exitPhoto,
  get tools() { return { ring: ringIdx, mode: player.mode, buddy: buddyOn && !!buddy, music: musicOn, audio: actx ? actx.state : null, night: nightOn, trail: trailIdx, tut: tutStep, list: pw.map((p, i) => TOOLS[i].id + (toolActive(TOOLS[i].id) ? '*' : '') + (p.cd > 0 ? '(' + p.cd.toFixed(1) + ')' : '')).join(' ') }; },
  get info() { return { state, score, combo: comboMul, comet: comet.visible, streak: stats.get().streak, env: ENV_IDS[envIdx], char: charIdx, cam: CAM_IDS[camIdx], pos: player.pos.toArray().map((v) => Math.round(v)), calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; }
};
