/* פלייפיי · Playify — relaxed 3D flying. three.js r170 (vendored, MIT). */
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
    helpTouch: 'אגודל שמאל על הג׳ויסטיק: פונים ועולים או יורדים. בצד ימין: ▲ למעלה, ▼ למטה, ⚡ מהירות. אוספים ניצוצות אור ועוברים דרך הטבעות הזהובות.',
    helpDesk: 'חיצים או WASD: פנייה, עלייה וירידה. רווח למעלה, Shift למטה, 1/2/3 או F למהירות. אפשר גם לגרור עם העכבר. Esc לתפריט. אוספים ניצוצות אור ועוברים דרך הטבעות הזהובות.',
    keys: 'חיצים / WASD · רווח ↑ · Shift ↓ · F מהירות · Esc תפריט',
    copy: '© כל הזכויות שמורות לחברת היליפיי בע"מ 2026',
    nogl: 'הדפדפן הזה לא תומך בתלת־ממד (WebGL). כדאי לנסות ב־Chrome או ב־Safari מעודכנים.',
    ring: ['יפה!', 'נהדר!', 'איזה מעוף!', 'מעולה!', 'זוהר!'], back: 'חוזרים לאזור המעוף', best: 'שיא חדש!',
    spd: ['איטי', 'רגיל', 'מהיר'], resume: 'להמשיך לעוף ✨',
    chars: ['גבר', 'אישה', 'ילד', 'ילדה', 'דרקון קטן וטוב', 'ינשוף חכם', 'חתול מכונף', 'רובוט ידידותי', 'יצור אור זוהר'],
    envs: ['הרים מושלגים', 'מערכת השמש', 'גלקסיה אחרת', 'יקום ממימד אחר', 'אטלנטיס מתחת למים', 'ממלכת העננים', 'ציוויליזציה חוצנית מתקדמת'],
    cams: ['מאחורי הדמות', 'מבעד לעיניים', 'מהצד', 'מלמעלה']
  },
  en: {
    title: 'Playify', tag: 'Fly freely through worlds of light', choose: 'Choose a character', world: 'World', view: 'Camera view',
    start: 'Take off ✨', install: '📲 Install to home screen', score: 'Sparks', up: 'Up', down: 'Down', speed: 'Speed',
    lang: 'עברית', themeDark: '☀️ Day mode', themeLight: '🌙 Night mode',
    helpTouch: 'Left thumb on the joystick: turn and climb or dive. On the right: ▲ up, ▼ down, ⚡ speed. Collect sparks of light and fly through the golden rings.',
    helpDesk: 'Arrows or WASD: turn, climb and dive. Space up, Shift down, 1/2/3 or F for speed. You can also drag with the mouse. Esc for the menu. Collect sparks of light and fly through the golden rings.',
    keys: 'Arrows / WASD · Space ↑ · Shift ↓ · F speed · Esc menu',
    copy: '© 2026 Healify Ltd. All rights reserved.',
    nogl: 'This browser does not support 3D (WebGL). Please try an up-to-date Chrome or Safari.',
    ring: ['Lovely!', 'Wonderful!', 'What a flight!', 'Great!', 'Glowing!'], back: 'Heading back to the flying area', best: 'New best!',
    spd: ['Slow', 'Normal', 'Fast'], resume: 'Keep flying ✨',
    chars: ['Man', 'Woman', 'Boy', 'Girl', 'Kind little dragon', 'Wise owl', 'Winged cat', 'Friendly robot', 'Glowing being of light'],
    envs: ['Snowy mountains', 'The solar system', 'Another galaxy', 'Universe from another dimension', 'Atlantis underwater', 'Cloud kingdom', 'Alien civilization'],
    cams: ['Behind the character', 'Through its eyes', 'Side view', 'Top-down']
  }
};
const CHAR_EMOJI = ['🧑', '👩', '👦', '👧', '🐉', '🦉', '🐱', '🤖', '✨'];
const ENV_IDS = ['snow', 'solar', 'galaxy', 'dimension', 'atlantis', 'clouds', 'alien'];
const CAM_IDS = ['third', 'first', 'side', 'top'];

let lang = store.get('rg-lang', 'he') === 'en' ? 'en' : 'he';
let theme = store.get('rg-fly-theme', 'dark') === 'light' ? 'light' : 'dark';
let charIdx = clamp(parseInt(store.get('rg-fly-char', '0'), 10) || 0, 0, 8);
let envIdx = clamp(parseInt(store.get('rg-fly-env', '0'), 10) || 0, 0, ENV_IDS.length - 1);
let camIdx = clamp(parseInt(store.get('rg-fly-cam', '0'), 10) || 0, 0, 3);
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
    eye: new THREE.Vector3(0, 0.15, -0.75 * o.scale), size: o.scale, camDist: 4.2 * Math.max(o.scale, 0.85),
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
    eye: new THREE.Vector3(0, 0.2, -0.8), size: 1, camDist: 4.4,
    anim(t, s) { for (const f of flames) f.scale.set(1, 0.7 + Math.random() * 0.4 + s * 0.6, 1); bulb.material.emissiveIntensity = 0.8 + Math.sin(t * 5) * 0.6; pose.position.y = Math.sin(t * 2) * 0.06; }
  };
  return root;
}
/* creatures are built directly in flying orientation (forward -z, up +y) */
function dragon() {
  const root = new THREE.Group();
  const skin = M(0x6fa8ff), belly = M(0xffe7a3), horn = M(0xf3cf6b, { metalness: 0.3 }), wingM = M(0x9cc4ff, { side: THREE.DoubleSide }), eyeW = M(0xffffff), eyeB = M(0x101830);
  const body = ball(0.5, skin); body.scale.set(0.85, 0.75, 1.4); root.add(body);
  const bel = ball(0.42, belly); bel.scale.set(0.75, 0.6, 1.25); bel.position.y = -0.12; root.add(bel);
  const head = ball(0.36, skin); head.position.set(0, 0.32, -0.85); root.add(head);
  const snout = ball(0.22, skin); snout.scale.set(1, 0.75, 1.1); snout.position.set(0, 0.24, -1.15); root.add(snout);
  for (const sx of [-1, 1]) {
    const e = ball(0.1, eyeW, 0); e.position.set(sx * 0.17, 0.45, -1.08); root.add(e);
    const p = ball(0.05, eyeB, 0); p.position.set(sx * 0.19, 0.46, -1.16); root.add(p);
    const h = cone(0.06, 0.28, horn); h.position.set(sx * 0.15, 0.68, -0.72); h.rotation.x = 0.5; root.add(h);
    const lg = ball(0.13, skin, 0); lg.scale.set(1, 1.3, 1); lg.position.set(sx * 0.28, -0.4, -0.25); root.add(lg);
  }
  for (let i = 0; i < 5; i++) { const sp = cone(0.07, 0.18, horn, 4); sp.position.set(0, 0.42 - i * 0.03, -0.3 + i * 0.25); root.add(sp); }
  const tail = new THREE.Group(); tail.position.set(0, 0, 0.6); root.add(tail);
  const tseg = [];
  let parent = tail;
  for (let i = 0; i < 4; i++) { const g = new THREE.Group(); g.position.z = i === 0 ? 0 : 0.32; const c = cone(0.2 - i * 0.04, 0.4, skin); c.rotation.x = Math.PI / 2; c.position.z = 0.18; g.add(c); parent.add(g); parent = g; tseg.push(g); }
  const tip = cone(0.1, 0.18, horn, 4); tip.rotation.x = Math.PI / 2; tip.position.z = 0.42; parent.add(tip);
  const wings = addWings(root, wingGeo(1.6, 1.0, false), wingM, 0.32, 0.25, -0.05);
  root.userData = {
    eye: new THREE.Vector3(0, 0.55, -1.2), size: 1.3, camDist: 5.2,
    anim(t, s) { const f = Math.sin(t * (5 + s * 3)) * 0.7; wings[0].rotation.z = f; wings[1].rotation.z = -f; tseg.forEach((g, i) => g.rotation.y = Math.sin(t * 2.5 - i) * 0.25); }
  };
  return root;
}
function owl() {
  const root = new THREE.Group();
  const fe = M(0x9a6a43), light = M(0xe9d3b0), wingM = M(0x7d5232, { side: THREE.DoubleSide }), gold = M(0xf3b43a), white = M(0xffffff), black = M(0x111111);
  const body = ball(0.5, fe); body.scale.set(0.9, 0.85, 1.15); root.add(body);
  const chest = ball(0.4, light); chest.scale.set(0.8, 0.7, 1); chest.position.set(0, -0.12, -0.15); root.add(chest);
  const head = new THREE.Group(); head.position.set(0, 0.35, -0.6); root.add(head);
  head.add(ball(0.42, fe));
  const face = ball(0.33, light); face.scale.set(1.05, 0.9, 0.5); face.position.set(0, 0, -0.26); head.add(face);
  for (const sx of [-1, 1]) {
    const ring = cyl(0.14, 0.14, 0.05, gold, 12); ring.rotation.x = Math.PI / 2; ring.position.set(sx * 0.15, 0.05, -0.4); head.add(ring);
    const e = cyl(0.1, 0.1, 0.06, white, 12); e.rotation.x = Math.PI / 2; e.position.set(sx * 0.15, 0.05, -0.42); head.add(e);
    const p = cyl(0.05, 0.05, 0.07, black, 10); p.rotation.x = Math.PI / 2; p.position.set(sx * 0.15, 0.05, -0.44); head.add(p);
    const tuft = cone(0.08, 0.26, fe, 4); tuft.position.set(sx * 0.25, 0.4, 0.05); tuft.rotation.z = -sx * 0.4; head.add(tuft);
    const claw = cone(0.06, 0.15, gold, 4); claw.position.set(sx * 0.15, -0.42, 0.25); claw.rotation.x = 2.4; root.add(claw);
  }
  const beak = cone(0.07, 0.2, gold, 4); beak.rotation.x = -2.2; beak.position.set(0, -0.09, -0.45); head.add(beak);
  const tail = cone(0.28, 0.5, fe, 5); tail.scale.set(1, 1, 0.25); tail.rotation.x = Math.PI / 2; tail.position.set(0, 0.05, 0.75); root.add(tail);
  const wings = addWings(root, wingGeo(1.5, 0.9, true), wingM, 0.35, 0.2, 0);
  root.userData = {
    eye: new THREE.Vector3(0, 0.45, -1.05), size: 1.1, camDist: 4.6,
    anim(t, s) { const f = Math.sin(t * (3.5 + s * 2.5)) * 0.6; wings[0].rotation.z = f; wings[1].rotation.z = -f; head.rotation.y = Math.sin(t * 0.7) * 0.15; }
  };
  return root;
}
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
function lightBeing() {
  const root = new THREE.Group();
  const core = ball(0.38, new THREE.MeshBasicMaterial({ color: 0xfff6d6 }), 2); root.add(core);
  const inner = glowSprite(0xffe7a3, 2.6, 0.9); root.add(inner);
  const outer = glowSprite(0x8fb0ff, 5, 0.45); root.add(outer);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.035, 6, 24), new THREE.MeshBasicMaterial({ color: 0xf3cf6b }));
  halo.position.set(0, 0.55, -0.1); halo.rotation.x = Math.PI / 2; root.add(halo);
  const wingM = new THREE.MeshBasicMaterial({ color: 0xbfd3ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false });
  const wings = addWings(root, wingGeo(1.7, 1.1, true), wingM, 0.2, 0.1, 0.05);
  const motes = [];
  for (let i = 0; i < 7; i++) { const m = glowSprite(i % 2 ? 0xffe7a3 : 0xbfd3ff, 0.35); root.add(m); motes.push(m); }
  const tailG = cone(0.3, 1.2, new THREE.MeshBasicMaterial({ color: 0xffeebb, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }), 10);
  tailG.rotation.x = -Math.PI / 2; tailG.position.z = 0.8; root.add(tailG);
  root.userData = {
    eye: new THREE.Vector3(0, 0.2, -0.5), size: 1.1, camDist: 4.6,
    anim(t) {
      const f = Math.sin(t * 2.6) * 0.45; wings[0].rotation.z = f; wings[1].rotation.z = -f;
      const p = 1 + Math.sin(t * 3) * 0.08; core.scale.setScalar(p); inner.scale.setScalar(2.6 * p);
      halo.rotation.z = t; motes.forEach((m, i) => { const a = t * 1.5 + i * 0.9; m.position.set(Math.cos(a) * 0.75, Math.sin(a * 1.3) * 0.4, Math.sin(a) * 0.75); });
    }
  };
  return root;
}
const CHAR_BUILD = [
  () => human({ scale: 1, skin: 0xe0ac85, top: 0x2c5cff, bottom: 0x1d2a5c, hair: 0x3b2618, cape: 0xf3cf6b }),
  () => human({ scale: 0.96, skin: 0xf1c6a4, top: 0xf3cf6b, bottom: 0x3a57c9, hair: 0x7a4a24, long: true, skirt: true, cape: 0x2c5cff }),
  () => human({ scale: 0.72, kid: true, skin: 0xc98e66, top: 0xff8a3d, bottom: 0x2d4b9a, hair: 0x1f1510, cape: 0x6fa8ff }),
  () => human({ scale: 0.7, kid: true, skin: 0xf4cfb2, top: 0xc77dff, bottom: 0x2c5cff, hair: 0xd89a3a, pony: true, skirt: true, cape: 0xf3cf6b }),
  dragon, owl, cat, robot, lightBeing
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
  solar() {
    const g = new THREE.Group();
    g.add(points(2200, () => sphereShell(rand(1300, 1800)), 2.2, { atten: false, colors: () => pick([0xffffff, 0xdde6ff, 0xfff0d0, 0xbfd3ff]), fog: false }));
    const sun = ball(42, new THREE.MeshBasicMaterial({ color: 0xffd36b }), 3); g.add(sun);
    g.add(glowSprite(0xffb340, 210, 0.85), glowSprite(0xfff0b0, 120, 0.9));
    const pl = new THREE.PointLight(0xfff1d8, 3.2, 0, 0); g.add(pl);
    const defs = [[75, 2.6, 0xb5a596], [105, 4.5, 0xe8c47a], [140, 5, 0x3d7fe0, 'earth'], [175, 3.6, 0xd2603b], [240, 13, 0xd9b08c], [310, 11, 0xe6d29c, 'ring'], [375, 8, 0x9fe0f0], [430, 7.5, 0x4a6df0]];
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
    return { g, sky: [0x02030c, 0x070a22, 0x02030c], fog: null, hemi: [0x8899cc, 0x111122, 0.35], sun: [0xffffff, 0.0, [0, 1, 0]],
      start: new THREE.Vector3(0, 25, 200), minY: -160, maxY: 160, R: 480, spark: 0xfff0b0,
      avoid: [[0, 0, 0, 52]], update(t, dt) { for (const [piv, w, p] of planets) { piv.rotation.y += w * dt * 0.25; p.rotation.y += dt * 0.3; } sun.rotation.y += dt * 0.05; } };
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
const player = { pos: new THREE.Vector3(), yaw: 0, vy: 0, yawRate: 0, speed: 16, level: 1, model: null };
const SPEEDS = [9, 16, 28];
function setChar(i) {
  charIdx = i; store.set('rg-fly-char', String(i));
  if (player.model) { scene.remove(player.model); disposeTree(player.model); }
  player.model = CHAR_BUILD[i](); scene.add(player.model);
  document.querySelectorAll('.ch').forEach((b, k) => b.classList.toggle('on', k === i));
  snapCam = true;
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
function addScore(n) {
  score += n; const el = $('score'); el.textContent = score; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
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
    if (playing && d < 2.3 * size + 0.6) { addScore(1); placeAhead(v, 80, 240, 150); }
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
    if (playing && d < 3.6) { addScore(5); u.flash = 0.6; flash(pick(T[lang].ring)); }
    else if (d > 340) { placeAhead(r.position, 120, 260, 120, true); faceRing(r); }
  }
}

function setEnv(i) {
  envIdx = i; store.set('rg-fly-env', String(i));
  if (env) { scene.remove(env.g); disposeTree(env.g); }
  env = ENVS[ENV_IDS[i]]();
  scene.add(env.g);
  skyMat.uniforms.top.value.set(env.sky[0]); skyMat.uniforms.hor.value.set(env.sky[1]); skyMat.uniforms.bot.value.set(env.sky[2]);
  scene.fog = env.fog ? new THREE.Fog(env.fog[0], env.fog[1], env.fog[2]) : null;
  hemi.color.set(env.hemi[0]); hemi.groundColor.set(env.hemi[1]); hemi.intensity = env.hemi[2];
  sunLight.color.set(env.sun[0]); sunLight.intensity = env.sun[1]; sunLight.position.set(...env.sun[2]);
  sparkMat.color.set(env.spark); sparkGlow.material.color.set(env.spark);
  player.pos.copy(env.start); player.yaw = 0; player.vy = 0; player.yawRate = 0;
  resetCollectibles();
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
  if (state === 'play') {
    if (e.code === 'Escape' || e.code === 'KeyP') toMenu();
    if (e.code === 'Digit1') setSpeed(0);
    if (e.code === 'Digit2') setSpeed(1);
    if (e.code === 'Digit3') setSpeed(2);
    if (e.code === 'KeyF') setSpeed((player.level + 1) % 3);
    if (/^(Arrow|Space)/.test(e.code)) e.preventDefault();
  } else if (state === 'menu' && e.code === 'Enter' && document.activeElement === document.body) $('startBtn').click();
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const joy = $('joy'), knob = joy.querySelector('i'), touchEl = $('touch');
let joyId = null, joyCx = 0, joyCy = 0, mouseId = null, mouseX0 = 0, mouseY0 = 0;
function joyRest() { joy.style.left = '86px'; joy.style.top = (innerHeight - 110) + 'px'; knob.style.transform = ''; }
touchEl.addEventListener('pointerdown', (e) => {
  if (state !== 'play') return;
  if (e.pointerType === 'mouse') { mouseId = e.pointerId; mouseX0 = e.clientX; mouseY0 = e.clientY; touchEl.setPointerCapture(e.pointerId); return; }
  if (joyId !== null) return;
  joyId = e.pointerId; touchEl.setPointerCapture(e.pointerId);
  joyCx = e.clientX; joyCy = e.clientY; joy.style.left = joyCx + 'px'; joy.style.top = joyCy + 'px';
});
touchEl.addEventListener('pointermove', (e) => {
  if (e.pointerId === mouseId) { input.mx = clamp((e.clientX - mouseX0) / 140, -1, 1); input.my = clamp((e.clientY - mouseY0) / 140, -1, 1); return; }
  if (e.pointerId !== joyId) return;
  let dx = e.clientX - joyCx, dy = e.clientY - joyCy; const l = Math.hypot(dx, dy), max = 50;
  if (l > max) { dx *= max / l; dy *= max / l; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`; input.jx = dx / max; input.jy = dy / max;
});
const endPtr = (e) => {
  if (e.pointerId === mouseId) { mouseId = null; input.mx = input.my = 0; }
  if (e.pointerId === joyId) { joyId = null; input.jx = input.jy = 0; joyRest(); }
};
touchEl.addEventListener('pointerup', endPtr); touchEl.addEventListener('pointercancel', endPtr);
function holdBtn(id, k) {
  const b = $(id);
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); input[k] = 1; b.classList.add('on'); try { b.setPointerCapture(e.pointerId); } catch (_) {} });
  const off = () => { input[k] = 0; b.classList.remove('on'); };
  b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
}
holdBtn('upBtn', 'up'); holdBtn('downBtn', 'down');
$('spdBtn').addEventListener('click', () => setSpeed((player.level + 1) % 3));
function setSpeed(l) { player.level = l; $('spdLbl').textContent = T[lang].spd[l]; $('spdBtn').classList.toggle('on', l === 2); }
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
  player.speed += (SPEEDS[player.level] - player.speed) * damp(2, dt);
  player.vy += (climb * 11 - player.vy) * damp(4, dt);
  heading();
  player.pos.addScaledVector(fwd, player.speed * dt);
  player.pos.y += player.vy * dt;
  const fl = floorAt(player.pos.x, player.pos.z) + 1.2;
  if (player.pos.y < fl) { player.pos.y += (fl - player.pos.y) * damp(8, dt); if (player.vy < 0) player.vy *= 0.5; }
  if (player.pos.y > env.maxY) { player.pos.y = env.maxY; player.vy = Math.min(player.vy, 0); }
  if (env.towers) for (const tw of env.towers) {
    const dx = player.pos.x - tw[0], dz = player.pos.z - tw[1], dd = Math.hypot(dx, dz);
    if (dd < tw[2] && player.pos.y < tw[3]) { player.pos.x = tw[0] + dx / (dd || 1) * tw[2]; player.pos.z = tw[1] + dz / (dd || 1) * tw[2]; }
  }
  if (env.avoid) for (const a of env.avoid) { tmp.set(a[0], a[1], a[2]); if (player.pos.distanceTo(tmp) < a[3]) player.pos.sub(tmp).setLength(a[3]).add(tmp); }
}
function placeModel(t, playing) {
  const m = player.model;
  m.position.copy(player.pos);
  m.rotation.order = 'YXZ';
  m.rotation.y = player.yaw;
  m.rotation.x = playing ? clamp(player.vy / 11, -1, 1) * 0.45 : Math.sin(t * 0.8) * 0.05;
  m.rotation.z = playing ? clamp(player.yawRate * 0.45, -0.6, 0.6) : 0;
  m.userData.anim(t, playing ? player.level / 2 : 0.2);
}

/* ================= camera ================= */
let snapCam = true;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), want = new THREE.Vector3(), look = new THREE.Vector3(), fpE = new THREE.Euler();
function updateCamera(t, dt, playing) {
  const m = player.model, u = m.userData, cam = CAM_IDS[camIdx];
  heading();
  camera.up.copy(UP);
  m.visible = true;
  if (!playing) {
    const a = t * 0.25 + 0.6, r = u.camDist * 1.2;
    want.set(player.pos.x + Math.sin(a) * r, player.pos.y + r * 0.22, player.pos.z + Math.cos(a) * r);
    look.copy(player.pos); look.y -= 1.0 * u.size;
  } else if (cam === 'third') {
    want.copy(player.pos).addScaledVector(fwd, -u.camDist).add(tmp.set(0, u.camDist * 0.35 - player.vy * 0.06, 0));
    look.copy(player.pos).addScaledVector(fwd, 4).add(tmp.set(0, 0.6, 0));
  } else if (cam === 'first') {
    m.visible = false;
    m.updateMatrixWorld(); want.copy(u.eye).applyMatrix4(m.matrixWorld);
    fpE.set(m.rotation.x * 0.7, m.rotation.y, 0, 'YXZ');
    look.set(0, 0, -10).applyEuler(fpE).add(want);
  } else if (cam === 'side') {
    want.copy(player.pos).addScaledVector(right, u.camDist * 1.9).add(tmp.set(0, 1.5, 0)).addScaledVector(fwd, 1.5);
    look.copy(player.pos).addScaledVector(fwd, 2);
  } else {
    want.copy(player.pos).add(tmp.set(0, u.camDist * 3.2, 0)).addScaledVector(fwd, -2);
    look.copy(player.pos).addScaledVector(fwd, 3);
    camera.up.copy(fwd);
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
  document.title = lang === 'he' ? 'פלייפיי · Playify' : 'Playify · פלייפיי';
  $('langBtn').textContent = L.lang;
  $('help').textContent = isTouch ? L.helpTouch : L.helpDesk;
  const chars = $('chars');
  if (!chars.children.length) CHAR_EMOJI.forEach((e, i) => {
    const b = document.createElement('button'); b.className = 'ch'; b.type = 'button';
    b.innerHTML = `<span class="e">${e}</span><span class="n"></span>`; b.addEventListener('click', () => setChar(i)); chars.appendChild(b);
  });
  [...chars.children].forEach((b, i) => { b.querySelector('.n').textContent = L.chars[i]; b.classList.toggle('on', i === charIdx); });
  for (const id of ['envSel', 'envSel2']) $(id).innerHTML = L.envs.map((n, i) => `<option value="${i}">${n}</option>`).join('');
  for (const id of ['camSel', 'camSel2']) $(id).innerHTML = L.cams.map((n, i) => `<option value="${i}">${n}</option>`).join('');
  syncSelects(); applyTheme(); setSpeed(player.level);
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
$('camSel').addEventListener('change', onCam); $('camSel2').addEventListener('change', onCam);
function showHud() {
  $('menu').classList.add('hidden'); $('hud').classList.remove('hidden');
  $('joy').classList.toggle('hidden', !isTouch); $('pads').classList.toggle('hidden', !isTouch);
  joyRest(); snapCam = true;
}
let resumable = false;
function start() {
  state = 'play'; score = 0; $('score').textContent = '0';
  player.pos.copy(env.start); player.yaw = 0; player.vy = 0; player.yawRate = 0; player.speed = SPEEDS[player.level];
  resetCollectibles(); showHud(); resumable = true;
  if (!isTouch) { $('keysHint').classList.remove('hidden'); setTimeout(() => $('keysHint').classList.add('hidden'), 9000); }
}
function toMenu() {
  state = 'menu'; $('hud').classList.add('hidden'); $('menu').classList.remove('hidden');
  if (resumable) $('startBtn').textContent = T[lang].resume; snapCam = true;
  input.jx = input.jy = input.mx = input.my = input.up = input.down = 0; joyId = mouseId = null;
}
$('startBtn').addEventListener('click', () => { if (resumable) { state = 'play'; showHud(); } else start(); });
$('pauseBtn').addEventListener('click', toMenu);
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') toMenu(); });

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
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = camera.aspect < 1 ? 72 : 62; camera.updateProjectionMatrix();
  if (joyId === null) joyRest();
}
addEventListener('resize', resize);
resize();
applyLang();
setChar(charIdx);
setEnv(envIdx);
const clock = new THREE.Clock();
let time = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05); time += dt;
  const playing = state === 'play';
  if (playing) updatePlayer(dt);
  env.update(time, dt, player.pos);
  placeModel(time, playing);
  updateCollectibles(time, dt, playing);
  updateCamera(time, dt, playing);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* small hook for automated checks */
window.__fly = {
  setEnv, setChar, start, toMenu,
  setCam(i) { camIdx = i; snapCam = true; syncSelects(); },
  setLang(l) { lang = l; store.set('rg-lang', l); applyLang(); },
  setTheme(t) { theme = t; applyTheme(); },
  steer(x, y) { input.jx = x; input.jy = y; },
  get info() { return { state, score, env: ENV_IDS[envIdx], char: charIdx, cam: CAM_IDS[camIdx], pos: player.pos.toArray().map((v) => Math.round(v)), calls: renderer.info.render.calls, tris: renderer.info.render.triangles }; }
};
