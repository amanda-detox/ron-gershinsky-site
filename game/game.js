/* לייטיפיי · Lightify: 3D (Three.js r170, vendored, MIT). No build step. */
import * as THREE from './three.module.min.js';

/* ================= i18n ================= */
const COPY_HE = '© כל הזכויות שמורות לחברת היליפיי בע"מ 2026';
const COPY_EN = '© 2026 Healify Ltd. All rights reserved.';
const T = {
  he: {
    title: 'לייטיפיי', tag: 'שלח אור, יונים וברכות, ועזור לצללים להתמלא באור ולעלות לרקיע',
    start: 'התחל', angle: 'זווית מצלמה', soundOn: '🔊 צליל: פועל', soundOff: '🔈 צליל: כבוי', langBtn: 'English',
    install: '📲 התקנה', souls: 'נשמות שעלו', wave: 'גל', paused: 'הפסקה', resume: 'המשך', toMenu: 'לתפריט',
    overT: 'האור התעמעם לרגע', overS: 'אבל האור תמיד חוזר. רוצה לנסות שוב?', best: 'שיא', again: 'נסה שוב',
    copy: COPY_HE, nogl: 'הדפדפן הזה לא מציג תלת־ממד (WebGL). נסה לפתוח ב־Chrome.', auto: 'אוטומטי',
    waveB: 'גל {n}', ready: 'מוכן', boost: 'חיזוק', shieldB: 'מגן אור!', giftB: 'מתנת אור!',
    help: 'בטלפון: העיגול למטה מימין מזיז את הגיבור שבחרת, והחברים הולכים איתו. העיגול למטה משמאל מפעיל חמישה כוחות. גרירה בכל מקום אחר על המסך מכוונת (האור יוצא לבד). העיגולים למעלה מחליפים גיבור, וכפתור ∠ משנה את זווית המצלמה.<br>במחשב: WASD או חצים לתנועה, עכבר לכיוון, ‏1/2/3 להחלפת גיבור, ‏Z/Q/E/R/F לחמשת הכוחות (גם רווח לכוח הגדול), ‏P להפסקה.',
    heroes: [
      { p: ['קרן אור', 'יוני שלום', 'סופת ברכות מחשמלות', 'מגן אור', 'פרץ כוכבים'], s: ['קרן אור', 'יוני שלום', 'סופת ברכות', 'מגן אור', 'פרץ כוכבים'] },
      { p: ['חיבוק חמימות', 'גשר קשת', 'הספירות', 'גל רוגע', 'מתנת אור'], s: ['חיבוק חמימות', 'גשר קשת', 'הספירות', 'גל רוגע', 'מתנת אור'] },
      { p: ['פנס הלב', 'גשם כוכבים', 'זרעי אור', 'זריחה', 'מעגל חסד'], s: ['פנס הלב', 'גשם כוכבים', 'זרעי אור', 'זריחה', 'מעגל חסד'] }
    ]
  },
  en: {
    title: 'Lightify', tag: 'Send light, doves and blessings, and help the shadows fill with light and rise to the heavens',
    start: 'Start', angle: 'Camera angle', soundOn: '🔊 Sound: on', soundOff: '🔈 Sound: off', langBtn: 'עברית',
    install: '📲 Install', souls: 'Souls lifted', wave: 'Wave', paused: 'Paused', resume: 'Resume', toMenu: 'Menu',
    overT: 'The light dimmed for a moment', overS: 'But the light always returns. Try again?', best: 'Best', again: 'Try again',
    copy: COPY_EN, nogl: 'This browser can\'t show 3D (WebGL). Try opening it in Chrome.', auto: 'Auto',
    waveB: 'Wave {n}', ready: 'Ready', boost: 'boost', shieldB: 'Light shield!', giftB: 'Gift of light!',
    help: 'Phone: the circle at the bottom right moves the hero you picked, and the others walk with it. The circle at the bottom left fires five powers. Drag anywhere else on the screen to aim (the light flows on its own). The circles at the top switch hero, and the ∠ button changes the camera angle.<br>Desktop: WASD or arrows to move, mouse to aim, 1/2/3 to switch hero, Z/Q/E/R/F for the five powers (Space also fires the big one), P to pause.',
    heroes: [
      { p: ['Beam of light', 'Peace doves', 'Blizzard of electrifying blessings', 'Light shield', 'Star burst'], s: ['Light beam', 'Peace doves', 'Blessing storm', 'Light shield', 'Star burst'] },
      { p: ['Embrace of warmth', 'Rainbow bridge', 'The Sefirot', 'Calm wave', 'Gift of light'], s: ['Warm embrace', 'Rainbow bridge', 'The Sefirot', 'Calm wave', 'Gift of light'] },
      { p: ['Heart lantern', 'Rain of stars', 'Seeds of light', 'Sunrise', 'Circle of kindness'], s: ['Heart lantern', 'Star rain', 'Seeds of light', 'Sunrise', 'Circle of kindness'] }
    ]
  }
};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
let lang = store.get('rg-lang', 'he') === 'en' ? 'en' : 'he';
let angleDeg = Math.max(3, Math.min(70, parseInt(store.get('rg-game-angle', '55'), 10) || 55));
let soundOn = store.get('rg-game-sound', '0') === '1';
const $ = (id) => document.getElementById(id);

/* Small SVG icons (gold/white line art, no emoji colours) */
const IC = {
  beam: '<path d="M4 20 L18 6" stroke-width="3.2"/><path d="M18 6 l2-4 M18 6 l4 -1 M18 6 l3 3" stroke-width="1.8"/>',
  dove: '<path d="M3 13 C7 13 9 10 11 6 C12 10 14 12 18 11 L22 9 L19 13 C17 17 12 19 7 17 Z" fill="#fff" stroke="none"/>',
  storm: '<path d="M12 2v20M3 7l18 10M21 7L3 17" stroke-width="1.7"/><path d="M13 9l-3 4h4l-3 4" stroke="#ffe7a3" stroke-width="2"/>',
  warm: '<circle cx="12" cy="12" r="4.5" fill="#ffe7a3" stroke="none"/><circle cx="12" cy="12" r="8.5" stroke-width="1.6" opacity=".8"/>',
  bridge: '<path d="M2 19 A10 10 0 0 1 22 19" stroke="#fff" stroke-width="2.2"/><path d="M5 19 A7 7 0 0 1 19 19" stroke="#ffe7a3" stroke-width="2.2"/><path d="M8 19 A4 4 0 0 1 16 19" stroke="#9ec0ff" stroke-width="2.2"/>',
  sef: '<g stroke-width="1" opacity=".85"><path d="M12 2L7 5L17 5L12 2M7 5L7 11L17 11L17 5M12 2L12 22M7 5L12 9.5L17 5M7 11L12 9.5L17 11M7 11L7 17L17 17L17 11M7 17L12 19L17 17M12 19L12 22M7 11L12 15L17 11M7 17L12 15L17 17"/></g><g fill="#fff" stroke="none"><circle cx="12" cy="2.5" r="1.6"/><circle cx="7" cy="5" r="1.6"/><circle cx="17" cy="5" r="1.6"/><circle cx="7" cy="11" r="1.6"/><circle cx="17" cy="11" r="1.6"/><circle cx="12" cy="9.5" r="1.6"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/><circle cx="12" cy="19" r="1.6"/><circle cx="12" cy="22" r="1.6"/></g>',
  heart: '<path d="M12 20 C4 14 2 10 4.5 6.5 C7 3.5 10.5 5 12 8 C13.5 5 17 3.5 19.5 6.5 C22 10 20 14 12 20Z" fill="#ffe7a3" stroke="#fff" stroke-width="1"/>',
  stars: '<path d="M7 3l1.2 2.6 2.8.3-2.1 1.9.6 2.8L7 9.2 4.5 10.6l.6-2.8L3 5.9l2.8-.3z M16 9l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.4-2.5 1.4.6-2.8-2.1-1.9 2.8-.3z" fill="#ffe7a3" stroke="none"/><path d="M8 13l-2 6M18 18l-1.5 4" stroke-width="1.3" opacity=".7"/>',
  seeds: '<path d="M6 21V8M12 21V3M18 21V10" stroke-width="3" stroke="#fff" opacity=".9"/><circle cx="6" cy="21" r="1.8" fill="#ffe7a3" stroke="none"/><circle cx="12" cy="21" r="1.8" fill="#ffe7a3" stroke="none"/><circle cx="18" cy="21" r="1.8" fill="#ffe7a3" stroke="none"/>',
  h0: '<ellipse cx="12" cy="5" rx="6" ry="2.2" stroke="#ffe7a3" stroke-width="2"/><circle cx="12" cy="13" r="4.5" fill="#fff" stroke="none"/>',
  h1: '<path d="M4 14 A8 8 0 0 1 20 14" stroke="#9ec0ff" stroke-width="2.4"/><circle cx="12" cy="15" r="4.5" fill="#fff" stroke="none"/>',
  h2: '<path d="M12 1l1.3 2.7 3 .4-2.2 2 .6 3L12 7.7 9.3 9.1l.6-3-2.2-2 3-.4z" fill="#ffe7a3" stroke="none"/><circle cx="12" cy="16" r="4.5" fill="#fff" stroke="none"/>'
};
IC.shield = '<path d="M12 2 L20 5 V11 C20 16 16.5 19.5 12 22 C7.5 19.5 4 16 4 11 V5 Z" fill="#ffe7a3" fill-opacity=".25" stroke-width="2"/><path d="M12 7v9M7.5 11.5h9" stroke="#fff" stroke-width="2"/>';
IC.burst = '<circle cx="12" cy="12" r="3.2" fill="#fff" stroke="none"/><path d="M12 1v5M12 18v5M1 12h5M18 12h5M4.2 4.2l3.5 3.5M16.3 16.3l3.5 3.5M4.2 19.8l3.5-3.5M16.3 7.7l3.5-3.5" stroke-width="2.2"/>';
IC.calm = '<path d="M2 8 C5 5 8 11 12 8 S19 5 22 8" stroke="#9ec0ff" stroke-width="2.2"/><path d="M2 13 C5 10 8 16 12 13 S19 10 22 13" stroke="#fff" stroke-width="2.2"/><path d="M2 18 C5 15 8 21 12 18 S19 15 22 18" stroke-width="2.2"/>';
IC.gift = '<rect x="3.5" y="10" width="17" height="11" rx="1.5" fill="#ffe7a3" fill-opacity=".25" stroke-width="1.9"/><path d="M2.5 7h19v3h-19zM12 7v14" stroke-width="1.9"/><path d="M12 7 C9 2 5 4 8 7 M12 7 C15 2 19 4 16 7" stroke="#fff" stroke-width="1.8"/>';
IC.sunrise = '<path d="M5 17 A7 7 0 0 1 19 17" fill="#ffe7a3" stroke="none"/><path d="M2 20h20M12 3v4M4.5 8.5l2.6 2.6M19.5 8.5l-2.6 2.6M1.5 14h3M19.5 14h3" stroke="#fff" stroke-width="2"/>';
IC.kind = '<circle cx="12" cy="12" r="9" stroke-width="2.2" stroke-dasharray="3.2 2.4"/><path d="M12 17 C7 13.5 6.5 11 8 9.3 C9.4 7.8 11.2 8.6 12 10 C12.8 8.6 14.6 7.8 16 9.3 C17.5 11 17 13.5 12 17Z" fill="#fff" stroke="none"/>';
const svg = (k, s = 28) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#ffe7a3" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
const HERO_ICONS = [['beam', 'dove', 'storm', 'shield', 'burst'], ['warm', 'bridge', 'sef', 'calm', 'gift'], ['heart', 'stars', 'seeds', 'sunrise', 'kind']];

/* ================= renderer ================= */
const canvas = $('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
} catch (e) {
  $('nogl').classList.remove('hidden'); $('menu').classList.add('hidden');
  document.querySelectorAll('#nogl [data-t]').forEach((el) => { el.textContent = T[lang][el.dataset.t]; });
  throw e;
}
const DPR = Math.min(window.devicePixelRatio || 1, 2);
let quality = 0; // 0 high, 1 medium, 2 low
let qualityLocked = false;
const Q = [
  { pr: DPR, parts: 1400, enemies: 48 },
  { pr: Math.min(DPR, 1.5), parts: 800, enemies: 40 },
  { pr: 1, parts: 450, enemies: 32 }
];
renderer.setPixelRatio(Q[0].pr);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070d2e);
scene.fog = new THREE.Fog(0x070d2e, 36, 95);
const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 260);
scene.add(camera);
const hemi = new THREE.HemisphereLight(0xa9bcff, 0x101a50, 1.5);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0cf, 2.0);
sun.position.set(6, 18, 9);
scene.add(sun); scene.add(sun.target);

/* ================= textures & shared materials ================= */
function canvasTex(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const glowTex = canvasTex(128, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const shadowTex = canvasTex(64, (g, s) => {
  const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
});
const groundTex = canvasTex(512, (g, s) => {
  g.fillStyle = '#101b52'; g.fillRect(0, 0, s, s);
  const gr = g.createRadialGradient(s / 2, s / 2, 10, s / 2, s / 2, s * 0.7);
  gr.addColorStop(0, 'rgba(40,70,170,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  g.strokeStyle = 'rgba(130,160,255,.10)'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { const p = i * s / 4; g.beginPath(); g.moveTo(p, 0); g.lineTo(0, p); g.moveTo(p, s); g.lineTo(s, p); g.stroke(); g.beginPath(); g.moveTo(p, 0); g.lineTo(s, s - p); g.moveTo(0, p); g.lineTo(s - p, s); g.stroke(); }
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * s, y = Math.random() * s, r = Math.random() * 1.6 + 0.4;
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255,225,150,.35)' : 'rgba(180,200,255,.3)';
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
});
groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.repeat.set(14, 14); groundTex.anisotropy = 4;

const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
const fresnelMat = (color, a) => new THREE.ShaderMaterial({
  uniforms: { uC: { value: new THREE.Color(color) }, uA: { value: a } }, ...ADD,
  vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'uniform vec3 uC; uniform float uA; varying vec3 vN; varying vec3 vV; void main(){ float f=pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2); gl_FragColor=vec4(uC*(f*uA+uA*0.08),1.); }'
});
const PILLAR_VS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }';
const PILLAR_FS = 'uniform float uTime; uniform float uA; uniform vec3 uC; varying vec2 vUv; void main(){ float v=vUv.y; float s=0.55+0.45*sin(vUv.x*31.4+uTime*2.3)*sin(vUv.x*18.8-uTime*1.7+v*6.); float a=uA*pow(1.-v,1.3)*(0.35+0.65*s)*smoothstep(0.,0.06,v); gl_FragColor=vec4(uC*a,1.); }';
const pillarMat = (color) => new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uA: { value: 0 }, uC: { value: new THREE.Color(color) } }, ...ADD, side: THREE.FrontSide, vertexShader: PILLAR_VS, fragmentShader: PILLAR_FS });
const glowMat = (color, op) => new THREE.MeshBasicMaterial({ map: glowTex, color, opacity: op, ...ADD });
const flatGlowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

/* ================= world ================= */
const ARENA = 30;
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(160, 160).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ map: groundTex })));
{ // arena border: soft gold light lines
  const m = new THREE.MeshBasicMaterial({ color: 0xffd98a, opacity: 0.35, ...ADD });
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(ARENA * 2 + 0.6, 0.35).rotateX(-Math.PI / 2), m);
    b.position.y = 0.02;
    if (i < 2) b.position.z = i ? ARENA : -ARENA; else { b.rotation.y = Math.PI / 2; b.position.x = i === 2 ? ARENA : -ARENA; }
    scene.add(b);
  }
  // blue crystals (instanced)
  const cg = new THREE.OctahedronGeometry(0.6, 0); cg.scale(0.6, 1.6, 0.6);
  const cm = new THREE.MeshLambertMaterial({ color: 0x3a5bd6, emissive: 0x16245e, flatShading: true });
  const N = 34, inst = new THREE.InstancedMesh(cg, cm, N), d = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    let x, z; do { x = (Math.random() * 2 - 1) * (ARENA + 6); z = (Math.random() * 2 - 1) * (ARENA + 6); } while (Math.abs(x) < 9 && Math.abs(z) < 9);
    d.position.set(x, 0.7, z); d.rotation.set(Math.random() * 0.4, Math.random() * 6, Math.random() * 0.4); const s = 0.6 + Math.random() * 0.9; d.scale.set(s, s, s); d.updateMatrix(); inst.setMatrixAt(i, d.matrix);
  }
  scene.add(inst);
}

/* ---- aurora sky ribbons (camera-anchored so they stay in the sky at any tilt) ---- */
const auroraMats = [];
{
  const VS = 'uniform float uTime; uniform float uK; varying vec2 vUv; void main(){ vUv=uv; vec3 p=position; p.y+=sin(p.x*0.11+uTime*0.35+uK)*1.6+sin(p.x*0.045-uTime*0.22)*2.2; p.z+=sin(p.x*0.09+uTime*0.3+uK)*4.; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }';
  const FS = 'uniform float uTime; uniform float uInt; uniform float uK; uniform vec3 uC1; uniform vec3 uC2; varying vec2 vUv; void main(){ float x=vUv.x; float c=pow(0.5+0.5*sin(x*90.+uTime*0.8+sin(x*11.+uTime*0.45+uK)*3.),2.)*0.55+0.45; float e=smoothstep(0.,0.14,vUv.y)*pow(1.-vUv.y,1.7); float sd=smoothstep(0.,0.18,x)*smoothstep(1.,0.82,x); vec3 col=mix(uC1,uC2,vUv.y); gl_FragColor=vec4(col*uInt*c*e*sd,1.); }';
  const cfg = [[0, 13, 0xffffff, 0xa9c4ff, 0], [3, 15.5, 0xfff2cc, 0xffffff, 2.1], [-4, 17.5, 0xcfe0ff, 0xfff6dd, 4.2]];
  for (const [x, y, c1, c2, k] of cfg) {
    const m = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uInt: { value: 0.3 }, uK: { value: k }, uC1: { value: new THREE.Color(c1) }, uC2: { value: new THREE.Color(c2) } }, ...ADD, depthTest: false, side: THREE.DoubleSide, vertexShader: VS, fragmentShader: FS });
    const r = new THREE.Mesh(new THREE.PlaneGeometry(110, 7, 80, 1), m);
    r.position.set(x, y, -42); r.renderOrder = 5; r.frustumCulled = false;
    camera.add(r); auroraMats.push(m);
  }
}
let auroraBoost = 0;

/* ================= particles (one Points draw call, ring buffer) ================= */
const MAXP = 1400;
const P = {
  pos: new Float32Array(MAXP * 3), col: new Float32Array(MAXP * 3), size: new Float32Array(MAXP),
  vel: new Float32Array(MAXP * 3), life: new Float32Array(MAXP), max: new Float32Array(MAXP), base: new Float32Array(MAXP * 3), sz0: new Float32Array(MAXP), grav: new Float32Array(MAXP), idx: 0
};
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(P.pos, 3).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('pcol', new THREE.BufferAttribute(P.col, 3).setUsage(THREE.DynamicDrawUsage));
pGeo.setAttribute('psize', new THREE.BufferAttribute(P.size, 1).setUsage(THREE.DynamicDrawUsage));
const pMat = new THREE.ShaderMaterial({
  uniforms: { uScale: { value: 400 } }, ...ADD,
  vertexShader: 'uniform float uScale; attribute float psize; attribute vec3 pcol; varying vec3 vC; void main(){ vC=pcol; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=psize*uScale/max(-mv.z,0.5); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'varying vec3 vC; void main(){ float d=length(gl_PointCoord-0.5); float a=smoothstep(0.5,0.,d); a=a*a*1.3; gl_FragColor=vec4(vC*a,1.); }'
});
const points = new THREE.Points(pGeo, pMat); points.frustumCulled = false; points.renderOrder = 6; scene.add(points);
let partCap = Q[0].parts;
const C_WHITE = [1, 1, 1], C_GOLD = [1, 0.85, 0.45], C_BLUE = [0.6, 0.75, 1], C_PALE = [1, 0.95, 0.8];
function emit(x, y, z, vx, vy, vz, life, size, c, grav = 0) {
  const i = P.idx; P.idx = (P.idx + 1) % partCap;
  P.pos[i * 3] = x; P.pos[i * 3 + 1] = y; P.pos[i * 3 + 2] = z;
  P.vel[i * 3] = vx; P.vel[i * 3 + 1] = vy; P.vel[i * 3 + 2] = vz;
  P.life[i] = life; P.max[i] = life; P.sz0[i] = size; P.grav[i] = grav;
  P.base[i * 3] = c[0]; P.base[i * 3 + 1] = c[1]; P.base[i * 3 + 2] = c[2];
}
function updateParticles(dt) {
  for (let i = 0; i < MAXP; i++) {
    if (P.life[i] <= 0) { if (P.size[i] !== 0) P.size[i] = 0; continue; }
    P.life[i] -= dt;
    const k = Math.max(0, P.life[i] / P.max[i]), j = i * 3;
    P.vel[j + 1] -= P.grav[i] * dt;
    P.pos[j] += P.vel[j] * dt; P.pos[j + 1] += P.vel[j + 1] * dt; P.pos[j + 2] += P.vel[j + 2] * dt;
    const a = k < 0.7 ? k / 0.7 : 1;
    P.col[j] = P.base[j] * a; P.col[j + 1] = P.base[j + 1] * a; P.col[j + 2] = P.base[j + 2] * a;
    P.size[i] = P.sz0[i] * (0.5 + 0.5 * k);
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.pcol.needsUpdate = true; pGeo.attributes.psize.needsUpdate = true;
}

/* ================= blob shadows (instanced) ================= */
const MAXS = 96;
const shadowMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }), MAXS);
shadowMesh.frustumCulled = false; shadowMesh.renderOrder = 1; scene.add(shadowMesh);
let sCount = 0; const sDummy = new THREE.Object3D();
function shadowAt(x, z, r, h = 0) {
  if (sCount >= MAXS) return;
  const s = r * 2.2 * Math.max(0.3, 1 - h * 0.08);
  sDummy.position.set(x, 0.03, z); sDummy.scale.set(s, 1, s * 0.9); sDummy.updateMatrix();
  shadowMesh.setMatrixAt(sCount++, sDummy.matrix);
}

/* ================= character building (procedural low-poly) ================= */
const G = {
  sph: new THREE.IcosahedronGeometry(1, 1), sph2: new THREE.IcosahedronGeometry(1, 2),
  cone: new THREE.ConeGeometry(1, 1, 7), cyl: new THREE.CylinderGeometry(1, 1, 1, 7),
  cap: new THREE.CapsuleGeometry(0.5, 1, 2, 7), tor: new THREE.TorusGeometry(1, 0.12, 6, 20)
};
const lam = (c, e = 0x000000) => new THREE.MeshLambertMaterial({ color: c, emissive: e, flatShading: true });
const MAT = {
  skin: lam(0xf3d6b6), eye: new THREE.MeshBasicMaterial({ color: 0x141a33 }), blush: lam(0xf5c0a8),
  gold: lam(0xf3cf6b, 0x5a4210), white: lam(0xf7f5ff, 0x222233), eyeGlow: new THREE.MeshBasicMaterial({ color: 0xc9d8ff }),
  googly: new THREE.MeshBasicMaterial({ color: 0xf2f4ff }), haloMat: new THREE.MeshBasicMaterial({ color: 0xffe7a3 })
};
function part(geo, mat, x, y, z, sx, sy, sz, parent) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy ?? sx, sz ?? sx); if (parent) parent.add(m); return m;
}
function eyes(parent, y, z, r, sep, mat = MAT.eye) { part(G.sph, mat, -sep, y, z, r, r, r * 0.7, parent); part(G.sph, mat, sep, y, z, r, r, r * 0.7, parent); }

function makeHero(kind) {
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const robe = lam([0xf7f5ff, 0x5b8cff, 0x2b3f9e][kind], kind === 0 ? 0x2a2a3a : 0x0b1640);
  part(G.cone, robe, 0, 0.62, 0, 0.55, 1.15, 0.55, body);
  part(G.cyl, kind === 1 ? MAT.white : MAT.gold, 0, 0.78, 0, 0.36, 0.09, 0.36, body); // sash
  const head = new THREE.Group(); head.position.y = 1.42; body.add(head);
  part(G.sph2, MAT.skin, 0, 0, 0, 0.4, 0.4, 0.4, head);
  eyes(head, 0.02, 0.33, 0.065, 0.14);
  part(G.sph, MAT.blush, -0.24, -0.1, 0.27, 0.07, 0.04, 0.03, head); part(G.sph, MAT.blush, 0.24, -0.1, 0.27, 0.07, 0.04, 0.03, head);
  const armL = new THREE.Group(), armR = new THREE.Group(); armL.position.set(-0.36, 1.0, 0); armR.position.set(0.36, 1.0, 0); body.add(armL, armR);
  for (const a of [armL, armR]) { part(G.cap, robe, 0, -0.25, 0, 0.18, 0.32, 0.18, a); part(G.sph, MAT.skin, 0, -0.52, 0, 0.1, 0.1, 0.1, a); }
  if (kind === 0) { // golden hair + halo
    part(G.sph2, lam(0xf0d27a), 0, 0.12, -0.05, 0.42, 0.36, 0.42, head);
    const halo = part(G.tor, MAT.haloMat, 0, 0.62, 0, 0.32, 0.32, 0.32, head); halo.rotation.x = Math.PI / 2;
    const hg = new THREE.Mesh(flatGlowGeo, glowMat(0xffe7a3, 0.6)); hg.scale.set(1.3, 1, 1.3); hg.position.y = 0.6; head.add(hg);
  } else if (kind === 1) { // hair buns + tiara arcs (white / gold / blue)
    const hair = lam(0x4a3426);
    part(G.sph2, hair, 0, 0.1, -0.06, 0.42, 0.36, 0.42, head);
    part(G.sph, hair, -0.34, 0.25, -0.05, 0.16, 0.16, 0.16, head); part(G.sph, hair, 0.34, 0.25, -0.05, 0.16, 0.16, 0.16, head);
    [0xffffff, 0xffd97a, 0x8fb3ff].forEach((c, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(0.3 - i * 0.06, 0.035, 5, 16, Math.PI), new THREE.MeshBasicMaterial({ color: c })); t.position.set(0, 0.32, 0.08); head.add(t); });
  } else { // star hat + heart lantern
    const hat = lam(0x1d2c7a, 0x060c30);
    part(G.cyl, hat, 0, 0.26, 0, 0.5, 0.05, 0.5, head);
    part(G.cone, hat, 0, 0.62, 0, 0.32, 0.75, 0.32, head).rotation.z = 0.15;
    part(new THREE.OctahedronGeometry(1, 0), MAT.haloMat, -0.1, 1.02, 0, 0.12, 0.12, 0.12, head);
    const lan = new THREE.Group(); lan.position.set(0, -0.62, 0.12); armR.add(lan);
    part(G.sph, new THREE.MeshBasicMaterial({ color: 0xffe2a0 }), 0, 0, 0, 0.12, 0.12, 0.12, lan);
    part(G.tor, MAT.gold, 0, 0, 0, 0.14, 0.14, 0.14, lan);
  }
  const footM = lam(0x22305f);
  const fL = part(G.sph, footM, -0.17, 0.07, 0.06, 0.13, 0.08, 0.17, root), fR = part(G.sph, footM, 0.17, 0.07, 0.06, 0.13, 0.08, 0.17, root);
  root.userData = { body, head, armL, armR, fL, fR };
  return root;
}

const ETYPES = {
  human: { hp: 10, speed: 2.3, r: 0.5, h: 1.6 },
  cat: { hp: 7, speed: 3.4, r: 0.45, h: 0.9 },
  dino: { hp: 26, speed: 1.55, r: 0.85, h: 2.0 },
  demon: { hp: 15, speed: 2.6, r: 0.55, h: 1.5 }
};
const SHADOW_COLS = [0x5a6ad0, 0x6a5cc8, 0x4f66d8, 0x7468d6, 0x5872e0]; // brighter violet-blue so they stand out against the night ground
const ENEMY_SCALE = 1.35, enemyHaloMat = glowMat(0x8fa6ff, 0.55), enemyRingMat = new THREE.MeshBasicMaterial({ color: 0xc9d4ff, opacity: 0.75, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
const enemyRingGeo = new THREE.RingGeometry(0.82, 1, 28).rotateX(-Math.PI / 2);
function makeEnemy(type) {
  const base = new THREE.Color(SHADOW_COLS[(Math.random() * SHADOW_COLS.length) | 0]);
  const m = new THREE.MeshLambertMaterial({ color: base.clone(), flatShading: true, emissive: 0x1c2470 });
  const acc = new THREE.MeshLambertMaterial({ color: base.clone().multiplyScalar(0.7), flatShading: true, emissive: 0x141a55 });
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
  const u = { body, m, acc, base, accBase: acc.color.clone(), legs: [] };
  const R = ETYPES[type].r * 2.6;
  u.halo = new THREE.Mesh(flatGlowGeo, enemyHaloMat); u.halo.scale.set(R * 1.6, 1, R * 1.6); u.halo.position.y = 0.04; u.halo.renderOrder = 1; root.add(u.halo);
  u.ring = new THREE.Mesh(enemyRingGeo, enemyRingMat); u.ring.scale.setScalar(R * 0.5); u.ring.position.y = 0.06; root.add(u.ring);
  if (type === 'human') {
    part(G.cap, m, 0, 0.85, 0, 0.42, 0.55, 0.36, body);
    u.head = part(G.sph2, m, 0, 1.5, 0, 0.32, 0.32, 0.32, body);
    eyes(body, 1.53, 0.26, 0.06, 0.12, MAT.eyeGlow);
    part(G.cyl, acc, 0, 1.78, 0, 0.3, 0.08, 0.3, body); part(G.cyl, acc, 0, 1.88, 0, 0.22, 0.18, 0.22, body); // little hat
    for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.set(s * 0.15, 0.45, 0); root.add(l); part(G.cap, acc, 0, -0.22, 0, 0.16, 0.3, 0.16, l); u.legs.push(l); }
  } else if (type === 'cat') {
    part(G.sph, m, 0, 0.5, 0, 0.36, 0.32, 0.55, body);
    const head = new THREE.Group(); head.position.set(0, 0.82, 0.42); body.add(head); u.head = head;
    part(G.sph2, m, 0, 0, 0, 0.3, 0.27, 0.27, head);
    for (const s of [-1, 1]) part(G.cone, acc, s * 0.17, 0.28, 0, 0.1, 0.2, 0.08, head).rotation.z = -s * 0.25;
    eyes(head, 0.03, 0.24, 0.06, 0.11, MAT.eyeGlow);
    const tail = new THREE.Group(); tail.position.set(0, 0.6, -0.5); body.add(tail);
    u.tailSegs = []; let prev = tail;
    for (let i = 0; i < 4; i++) { const seg = new THREE.Group(); seg.position.set(0, i ? 0.16 : 0, i ? -0.04 : 0); prev.add(seg); part(G.sph, acc, 0, 0.08, 0, 0.07, 0.12, 0.07, seg); prev = seg; u.tailSegs.push(seg); }
    for (const [x, z] of [[-0.18, 0.28], [0.18, 0.28], [-0.18, -0.28], [0.18, -0.28]]) { const l = new THREE.Group(); l.position.set(x, 0.3, z); root.add(l); part(G.cyl, acc, 0, -0.14, 0, 0.07, 0.3, 0.07, l); u.legs.push(l); }
  } else if (type === 'dino') {
    part(G.sph, m, 0, 1.0, 0, 0.7, 0.62, 0.85, body);
    part(G.cap, m, 0, 1.55, 0.55, 0.3, 0.55, 0.3, body).rotation.x = 0.5;
    const head = new THREE.Group(); head.position.set(0, 2.0, 0.85); body.add(head); u.head = head;
    part(G.sph2, m, 0, 0, 0.1, 0.34, 0.3, 0.45, head);
    eyes(head, 0.1, 0.38, 0.07, 0.16, MAT.eyeGlow);
    const tail = new THREE.Group(); tail.position.set(0, 0.95, -0.6); body.add(tail); u.tail = tail;
    part(G.cone, m, 0, 0, -0.55, 0.4, 1.2, 0.4, tail).rotation.x = -Math.PI / 2 - 0.25;
    for (let i = 0; i < 4; i++) part(G.cone, acc, 0, 1.55 - i * 0.1, 0.25 - i * 0.38, 0.13, 0.3, 0.06, body).rotation.x = -0.3;
    for (const s of [-1, 1]) { const l = new THREE.Group(); l.position.set(s * 0.4, 0.55, 0); root.add(l); part(G.cyl, acc, 0, -0.27, 0, 0.2, 0.55, 0.22, l); u.legs.push(l); part(G.cap, acc, s * 0.42, 1.15, 0.62, 0.08, 0.2, 0.08, body); }
  } else { // silly demon: googly eyes, tiny horns, little bat wings, goofy grin
    u.head = part(G.sph2, m, 0, 0.95, 0, 0.55, 0.6, 0.5, body);
    u.wings = [];
    for (const s of [-1, 1]) {
      part(G.cone, acc, s * 0.28, 1.6, 0, 0.11, 0.3, 0.11, body).rotation.z = -s * 0.5;
      part(G.sph2, MAT.googly, s * 0.18, 1.12, 0.4, 0.16, 0.16, 0.08, body);
      part(G.sph, MAT.eye, s * 0.16 + (s > 0 ? 0.03 : -0.02), 1.08, 0.47, 0.07, 0.07, 0.04, body);
      const w = new THREE.Group(); w.position.set(s * 0.45, 1.05, -0.2); body.add(w);
      part(G.cone, acc, s * 0.25, 0, 0, 0.14, 0.5, 0.04, w).rotation.z = s * Math.PI / 2;
      u.wings.push(w);
      const l = new THREE.Group(); l.position.set(s * 0.22, 0.42, 0); root.add(l); part(G.cap, acc, 0, -0.14, 0, 0.14, 0.18, 0.14, l); u.legs.push(l);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 5, 12, Math.PI), MAT.googly); mouth.position.set(0, 0.88, 0.46); mouth.rotation.z = Math.PI; body.add(mouth);
    part(G.cyl, acc, 0, 0.7, -0.5, 0.04, 0.5, 0.04, body).rotation.x = -1.0;
    part(G.cone, acc, 0, 0.5, -0.75, 0.1, 0.16, 0.05, body).rotation.x = -2.2;
  }
  root.userData = u; root.scale.setScalar(ENEMY_SCALE);
  return root;
}

/* ================= game state ================= */
const heroes = [], enemies = [];
let lead = 0, score = 0, wave = 1, teamLight = 100, state = 'menu', god = false, spawnFrozen = false;
let toSpawn = 0, spawnTimer = 0, waveGap = 0, contactTimer = 0, gameTime = 0, fadeT = 0, testMove = null;
let best = parseInt(store.get('rg-game-best', '0'), 10) || 0;
const COOLDOWN = [[0, 5, 12], [0, 7, 15], [0, 6, 9]]; // [basic auto, special A, big special B] in seconds
const AI_CD = 1.5; // companions recharge a bit slower than the hero you control
const waveCount = (w) => 10 + w * 6;
const COOLDOWN2 = [[9, 14, 12], [9, 11, 18], [9, 10, 14]]; // [basic boost, power 4, power 5]

function newHero(kind) {
  const g = makeHero(kind); scene.add(g);
  const h = { kind, g, x: 0, z: 0, vx: 0, vz: 0, dirx: 0, dirz: -1, cdA: 0, cdB: 0, cdS: 0, cdC: 0, cdD: 0, surge: 0, kz: 0, walk: 0, basicT: 0, fx: {} };
  h.fx.shield = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 14), fresnelMat(0xffe7a3, 0.55)); h.fx.shield.visible = false; scene.add(h.fx.shield);
  h.fx.kind = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 6, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe3a0, opacity: 0.8, ...ADD })); h.fx.kind.visible = false; scene.add(h.fx.kind);
  if (kind === 0) {
    const beamGeo = new THREE.CylinderGeometry(0.16, 0.42, 1, 12, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
    const outer = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffe9b0, opacity: 0.45, ...ADD, side: THREE.DoubleSide }));
    const inner = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.8, ...ADD, side: THREE.DoubleSide })); inner.scale.set(0.4, 0.4, 1);
    const beam = new THREE.Group(); beam.add(outer, inner); beam.visible = false; scene.add(beam);
    h.fx.beam = beam; h.fx.beamOuter = outer;
  } else if (kind === 1) {
    const disc = new THREE.Mesh(flatGlowGeo, glowMat(0xffe2a0, 0.42)); scene.add(disc);
    const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), fresnelMat(0xfff0c8, 0.28)); scene.add(shell);
    h.fx.disc = disc; h.fx.shell = shell;
  }
  return h;
}

/* ================= enemies ================= */
function spawnEnemy(type, x, z) {
  if (!type) {
    const pool = ['human'];
    if (wave >= 2) pool.push('cat', 'cat');
    if (wave >= 3) pool.push('dino');
    if (wave >= 4) pool.push('demon', 'demon');
    if (wave >= 6) pool.push('dino', 'cat');
    type = pool[(Math.random() * pool.length) | 0];
  }
  if (x === undefined) {
    const L = heroes[lead]; let tries = 0;
    do { const a = Math.random() * Math.PI * 2, r = 15 + Math.random() * 5; x = THREE.MathUtils.clamp(L.x + Math.cos(a) * r, -ARENA + 1, ARENA - 1); z = THREE.MathUtils.clamp(L.z + Math.sin(a) * r, -ARENA + 1, ARENA - 1); }
    while (Math.hypot(x - L.x, z - L.z) < 11 && ++tries < 12);
  }
  const t = ETYPES[type], g = makeEnemy(type);
  const hpMul = 1 + (wave - 1) * 0.08, spMul = Math.min(1.45, 1 + (wave - 1) * 0.035);
  const e = { type, g, u: g.userData, x, z, y: 0, calm: 0, hp: t.hp * hpMul, light: 0, speed: t.speed * spMul * (0.9 + Math.random() * 0.2), r: t.r * ENEMY_SCALE, h: t.h * ENEMY_SCALE, ph: Math.random() * 6, slow: 1, state: 'walk', t: 0, pillar: null };
  g.position.set(x, 0, z); scene.add(g); enemies.push(e);
  for (let i = 0; i < 8; i++) emit(x, 0.3, z, (Math.random() - 0.5) * 2, Math.random() * 1.5, (Math.random() - 0.5) * 2, 0.8, 0.35, C_BLUE);
  return e;
}
function removeEnemy(e) {
  scene.remove(e.g); e.u.m.dispose(); e.u.acc.dispose();
  if (e.pillar) { e.pillar.busy = false; e.pillar.mesh.visible = false; e.pillar.ring.visible = false; e.pillar = null; }
}
const WHITE = new THREE.Color(1, 1, 1);
function fill(e, amt) {
  if (e.state !== 'walk') return;
  e.light += amt;
  if (Math.random() < amt * 0.6) emit(e.x + (Math.random() - 0.5) * e.r * 2, 0.4 + Math.random() * e.h, e.z + (Math.random() - 0.5) * e.r * 2, 0, 0.8 + Math.random(), 0, 0.7, 0.28, Math.random() < 0.5 ? C_WHITE : C_GOLD);
  if (e.light >= e.hp) ascend(e);
}
function tintEnemy(e) { // shadows brighten towards white as they fill with light
  const f = Math.min(1, e.light / e.hp);
  e.u.m.color.copy(e.u.base).lerp(WHITE, f * 0.82); e.u.acc.color.copy(e.u.accBase).lerp(WHITE, f * 0.8);
  e.u.m.emissive.setRGB(0.11 + f * 0.25, 0.14 + f * 0.2, 0.44 - f * 0.2); e.u.acc.emissive.copy(e.u.m.emissive);
}
/* soul pillars + rising rings (pool) */
const pillars = [];
{
  const geo = new THREE.CylinderGeometry(1.5, 0.5, 16, 20, 1, true).translate(0, 8, 0);
  const ringGeo = new THREE.TorusGeometry(1, 0.06, 6, 32).rotateX(Math.PI / 2);
  for (let i = 0; i < 10; i++) {
    const mesh = new THREE.Mesh(geo, pillarMat(0xfff6e2)); mesh.visible = false; mesh.renderOrder = 3; scene.add(mesh);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, ...ADD })); ring.visible = false; scene.add(ring);
    pillars.push({ mesh, ring, busy: false });
  }
}
function ascend(e) {
  e.state = 'ascend'; e.t = 0; score++; e.u.halo.visible = e.u.ring.visible = false;
  e.u.m.color.set(0xffffff); e.u.acc.color.set(0xfff6e0);
  e.u.m.emissive.setRGB(0.85, 0.85, 0.8); e.u.acc.emissive.setRGB(0.8, 0.76, 0.6);
  const halo = new THREE.Mesh(G.tor, MAT.haloMat); halo.rotation.x = Math.PI / 2; halo.scale.setScalar(0.32 * Math.max(1, e.r * 1.4)); halo.position.y = e.h + 0.35; e.g.add(halo);
  const p = pillars.find((q) => !q.busy);
  if (p) { p.busy = true; p.mesh.visible = p.ring.visible = true; p.mesh.position.set(e.x, 0, e.z); p.ring.position.set(e.x, 0.1, e.z); e.pillar = p; }
  for (let i = 0; i < 40; i++) { const a = Math.random() * 6.283, s = 1 + Math.random() * 3; emit(e.x, 0.5 + Math.random() * e.h, e.z, Math.cos(a) * s, 1 + Math.random() * 3, Math.sin(a) * s, 1.2 + Math.random(), 0.4, [C_WHITE, C_GOLD, C_BLUE][i % 3]); }
  auroraBoost = Math.min(1.6, auroraBoost + 0.7);
  chime(); updateHud();
}

/* ================= powers: Hero 1 ================= */
const doves = [];
{
  const bodyG = new THREE.SphereGeometry(1, 8, 6);
  const wingG = (() => { const w = new THREE.Shape(); w.moveTo(0, 0.12); w.quadraticCurveTo(0.35, 0.22, 0.7, 0.02); w.lineTo(0.6, -0.04); w.lineTo(0.5, -0.1); w.lineTo(0.38, -0.12); w.quadraticCurveTo(0.15, -0.16, 0, -0.12); return new THREE.ShapeGeometry(w).rotateX(-Math.PI / 2); })();
  const tailG = new THREE.BoxGeometry(0.22, 0.03, 0.24);
  const dm = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x6a6a78, side: THREE.DoubleSide });
  for (let i = 0; i < 18; i++) {
    const g = new THREE.Group();
    part(bodyG, dm, 0, 0, 0, 0.2, 0.18, 0.36, g); part(bodyG, dm, 0, 0.1, 0.3, 0.13, 0.13, 0.13, g);
    part(G.cone, MAT.gold, 0, 0.09, 0.46, 0.04, 0.1, 0.04, g).rotation.x = Math.PI / 2;
    part(tailG, dm, 0, 0.02, -0.38, 1, 1, 1, g);
    const wl = new THREE.Mesh(wingG, dm), wr = new THREE.Mesh(wingG, dm); wl.position.set(0.1, 0.05, 0); wr.position.set(-0.1, 0.05, 0); wr.scale.x = -1; g.add(wl, wr);
    const gl = new THREE.Mesh(flatGlowGeo, glowMat(0xffffff, 0.35)); gl.scale.set(1.6, 1, 1.6); g.add(gl);
    g.visible = false; scene.add(g);
    doves.push({ g, wl, wr, active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, hits: 0, target: null, ph: Math.random() * 6 });
  }
}
function castDoves(h) {
  let n = 0;
  for (const d of doves) {
    if (d.active || n >= 5) continue;
    const a = Math.atan2(h.dirz, h.dirx) + (n - 2) * 0.45;
    Object.assign(d, { active: true, t: 0, hits: 0, target: null, x: h.x, y: 1.3, z: h.z, vx: Math.cos(a) * 6, vz: Math.sin(a) * 6, vy: 2 }); d.g.visible = true; n++;
  }
}
function updateDoves(dt) {
  for (const d of doves) {
    if (!d.active) continue;
    d.t += dt;
    if (d.t > 6.5 || d.hits >= 3) { d.vy += 6 * dt; if (d.y > 14) { d.active = false; d.g.visible = false; continue; } }
    else {
      if (!d.target || d.target.state !== 'walk') d.target = nearestEnemy(d.x, d.z, 18);
      if (d.target) {
        const tx = d.target.x - d.x, ty = d.target.h * 0.6 - d.y, tz = d.target.z - d.z, L = Math.hypot(tx, ty, tz) || 1, sp = 9.5, k = Math.min(1, dt * 3.2);
        d.vx += (tx / L * sp - d.vx) * k; d.vy += (ty / L * sp - d.vy) * k; d.vz += (tz / L * sp - d.vz) * k;
        if (L < d.target.r + 0.4) {
          fill(d.target, 7 + d.target.hp * 0.15); d.hits++;
          for (let i = 0; i < 14; i++) emit(d.x, d.y, d.z, (Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4, 0.7, 0.3, i % 2 ? C_WHITE : C_PALE);
          d.target = null; d.vy += 3;
        }
      } else d.vy += (1.5 - d.y) * dt;
    }
    d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
    d.g.position.set(d.x, d.y, d.z); d.g.rotation.y = Math.atan2(d.vx, d.vz);
    const f = Math.sin(d.t * 17 + d.ph) * 0.75; d.wl.rotation.z = f; d.wr.rotation.z = -f;
    if (Math.random() < 0.5) emit(d.x, d.y, d.z, 0, 0.2, 0, 0.5, 0.2, C_WHITE);
  }
}
/* blizzard of electrifying blessings */
const blizzards = [];
const boltGeo = new THREE.BufferGeometry(); boltGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(10 * 7 * 2 * 3), 3));
const bolts = new THREE.LineSegments(boltGeo, new THREE.LineBasicMaterial({ color: 0xd8e6ff, ...ADD })); bolts.frustumCulled = false; bolts.visible = false; scene.add(bolts);
const blizRing = new THREE.Mesh(flatGlowGeo, glowMat(0x9fc0ff, 0.6)); blizRing.visible = false; scene.add(blizRing);
function castBlizzard(h) { blizzards.push({ h, t: 0, dur: 2.6, R: 7, bt: 0 }); for (const e of enemies) if (Math.hypot(e.x - h.x, e.z - h.z) < 7) fill(e, 6); }
function updateBlizzards(dt) {
  bolts.visible = blizRing.visible = false;
  for (let k = blizzards.length - 1; k >= 0; k--) {
    const b = blizzards[k]; b.t += dt; const h = b.h;
    if (b.t > b.dur) { blizzards.splice(k, 1); continue; }
    const R = b.R * Math.min(1, b.t / 0.35), fade = Math.min(1, (b.dur - b.t) / 0.5);
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * R, tx = -Math.sin(a), tz = Math.cos(a);
      emit(h.x + Math.cos(a) * r, 0.3 + Math.random() * 3, h.z + Math.sin(a) * r, tx * 5 + (Math.random() - 0.5), (Math.random() - 0.5) * 1.5, tz * 5 + (Math.random() - 0.5), 0.6 + Math.random() * 0.5, 0.22 + Math.random() * 0.25, [C_WHITE, C_BLUE, C_GOLD, C_WHITE][i % 4]);
    }
    blizRing.visible = true; blizRing.position.set(h.x, 0.06, h.z); blizRing.scale.set(R * 2.3, 1, R * 2.3); blizRing.material.opacity = 0.55 * fade;
    b.bt -= dt;
    if (b.bt <= 0) { // crackling bolts, rebuilt ~12x per second
      b.bt = 0.08; const arr = boltGeo.attributes.position.array; let v = 0;
      for (let i = 0; i < 10; i++) {
        let a = Math.random() * 6.283, r0 = Math.random() * R * 0.4, x = h.x + Math.cos(a) * r0, y = 2.5 + Math.random() * 1.5, z = h.z + Math.sin(a) * r0;
        const da = (Math.random() - 0.5) * 0.6, st = R / 7;
        for (let s = 0; s < 7; s++) {
          const nx = x + Math.cos(a) * st + (Math.random() - 0.5) * 0.8, ny = Math.max(0.1, y - 0.35 + (Math.random() - 0.5) * 0.6), nz = z + Math.sin(a) * st + (Math.random() - 0.5) * 0.8;
          arr[v++] = x; arr[v++] = y; arr[v++] = z; arr[v++] = nx; arr[v++] = ny; arr[v++] = nz; x = nx; y = ny; z = nz; a += da;
        }
      }
      boltGeo.attributes.position.needsUpdate = true;
    }
    bolts.visible = Math.random() < 0.85;
    for (const e of enemies) if (e.state === 'walk' && Math.hypot(e.x - h.x, e.z - h.z) < R + e.r) { fill(e, 17 * dt); e.slow = Math.min(e.slow, 0.3); }
  }
}

/* ================= powers: Hero 2 ================= */
const bridges = [];
const bridgeGeo = (() => { // an arched ribbon with soft stripes: pale blue · white · gold · white · pale blue (no green band)
  const R = 5.5, H = 2.3, W = 2.0, g = new THREE.PlaneGeometry(1, 1, 48, 10), pos = g.attributes.position, cols = [];
  const stripe = [[0.62, 0.76, 1], [1, 1, 1], [1, 0.86, 0.5], [1, 1, 1], [0.62, 0.76, 1]];
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) + 0.5, v = pos.getY(i) + 0.5;
    pos.setXYZ(i, (u - 0.5) * 2 * R, Math.sin(Math.PI * u) * H + 0.05, (v - 0.5) * W);
    const c = stripe[Math.min(4, Math.floor(v * 5))], edge = Math.sin(Math.PI * v) * 0.6 + 0.4, end = Math.min(1, Math.sin(Math.PI * u) * 3);
    cols.push(c[0] * edge * end, c[1] * edge * end, c[2] * edge * end);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); g.computeVertexNormals();
  return g;
})();
for (let i = 0; i < 3; i++) {
  const R = 5.5, arch = new THREE.Group();
  const deck = new THREE.Mesh(bridgeGeo, new THREE.MeshBasicMaterial({ vertexColors: true, opacity: 0.6, ...ADD, side: THREE.DoubleSide })); arch.add(deck);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(R, 0.06, 5, 40, Math.PI), new THREE.MeshBasicMaterial({ color: 0xfff3d0, opacity: 0.8, ...ADD }));
  rail.scale.y = 2.3 / R; const r1 = rail.clone(); rail.position.z = 1.0; r1.position.z = -1.0; arch.add(rail, r1);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(2 * R + 1, 2.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, color: 0xffe3a0, opacity: 0.5, ...ADD })); strip.position.y = 0.04;
  const root = new THREE.Group(); root.add(arch, strip); root.visible = false; scene.add(root);
  bridges.push({ root, arch, strip, bands: [deck, rail, r1], R, t: 99, dur: 5.5, x: 0, z: 0, dx: 1, dz: 0 });
}
function castBridge(h) {
  const b = bridges.find((q) => q.t >= q.dur) || bridges[0];
  b.t = 0; b.dx = h.dirx; b.dz = h.dirz; b.x = h.x + h.dirx * (b.R + 0.6); b.z = h.z + h.dirz * (b.R + 0.6);
  b.root.position.set(b.x, 0, b.z); b.root.rotation.y = Math.atan2(-b.dz, b.dx); b.root.visible = true;
}
function updateBridges(dt) {
  for (const b of bridges) {
    if (b.t >= b.dur) { b.root.visible = false; continue; }
    b.t += dt;
    const grow = Math.min(1, b.t / 0.6), fade = Math.min(1, (b.dur - b.t) / 0.6);
    b.arch.scale.set(1, grow, 1);
    b.bands.forEach((m, i) => (m.material.opacity = (i ? 0.7 : 0.55) * (0.85 + 0.15 * Math.sin(gameTime * 4 + i)) * fade));
    b.strip.material.opacity = 0.5 * fade;
    for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI, rr = b.R - Math.random(); const lx = Math.cos(a) * rr; const sv = (Math.random() - 0.5) * 2; emit(b.x + b.dx * lx - b.dz * sv, Math.sin(a) * 2.3 * grow + 0.1, b.z + b.dz * lx + b.dx * sv, 0, 0.5, 0, 0.9, 0.25, [C_WHITE, C_GOLD, C_BLUE][i]); }
    for (const e of enemies) {
      if (e.state !== 'walk') continue;
      const rx = e.x - b.x, rz = e.z - b.z, along = rx * b.dx + rz * b.dz, side = Math.abs(-rx * b.dz + rz * b.dx);
      if (Math.abs(along) < b.R + 0.4 && side < 1.0 + e.r) { fill(e, 22 * dt); e.slow = Math.min(e.slow, 0.55); }
    }
  }
}
/* The Sefirot: ten spheres and twenty-two luminous paths, lying on the ground (silent power) */
const SEF_NODES = [[0, 4], [1.5, 3.25], [-1.5, 3.25], [1.5, 1.75], [-1.5, 1.75], [0, 1], [1.5, -0.5], [-1.5, -0.5], [0, -1.5], [0, -3]];
const SEF_PATHS = [[0, 1], [0, 2], [0, 5], [1, 2], [1, 3], [1, 5], [2, 4], [2, 5], [3, 4], [3, 5], [3, 6], [4, 5], [4, 7], [5, 6], [5, 7], [5, 8], [6, 7], [6, 8], [6, 9], [7, 8], [7, 9], [8, 9]];
const sef = { t: 99, dur: 7.5, h: null, rot: 0, scale: 1, nodes: [], paths: [], root: new THREE.Group(), local: [] };
{
  const S = 1.35;
  sef.local = SEF_NODES.map(([x, y]) => [x * S, -(y - 1) * S]); // centred on the middle sphere
  const sphG = new THREE.SphereGeometry(0.42, 16, 12);
  const colOf = (i) => (i === 1 || i === 3 || i === 6) ? 0xbcd2ff : (i === 2 || i === 4 || i === 7) ? 0xffdc8a : 0xffffff;
  sef.local.forEach(([x, z], i) => {
    const c = colOf(i), g = new THREE.Group(); g.position.set(x, 0.75, z);
    g.add(new THREE.Mesh(sphG, new THREE.MeshBasicMaterial({ color: c })));
    const shell = new THREE.Mesh(sphG, fresnelMat(c, 1.0)); shell.scale.setScalar(1.7); g.add(shell);
    const gd = new THREE.Mesh(flatGlowGeo, glowMat(c, 0.7)); gd.scale.set(2.6, 1, 2.6); gd.position.y = -0.7; g.add(gd);
    sef.root.add(g); sef.nodes.push(g);
  });
  const pathG = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  for (const [a, b] of SEF_PATHS) {
    const [x1, z1] = sef.local[a], [x2, z2] = sef.local[b];
    const m = new THREE.Mesh(pathG, new THREE.MeshBasicMaterial({ color: 0xfff0c8, opacity: 0.6, ...ADD }));
    m.position.set((x1 + x2) / 2, 0.08, (z1 + z2) / 2); m.scale.set(0.2, 1, Math.hypot(x2 - x1, z2 - z1)); m.rotation.y = Math.atan2(x2 - x1, z2 - z1);
    sef.root.add(m); sef.paths.push(m);
  }
  sef.ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 64).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xcfdcff, opacity: 0.5, ...ADD }));
  sef.ring.scale.setScalar(6.6); sef.ring.position.y = 0.06; sef.root.add(sef.ring);
  sef.root.visible = false; scene.add(sef.root);
}
function castSefirot(h) { sef.h = h; sef.t = 0; sef.rot = Math.random() * 6; sef.root.visible = true; }
function distSeg(px, pz, ax, az, bx, bz) { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz; let t = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - t * dx, pz - az - t * dz); }
function updateSefirot(dt) {
  if (sef.t >= sef.dur) { sef.root.visible = false; return; }
  sef.t += dt; const h = sef.h;
  const grow = 1 - Math.pow(1 - Math.min(1, sef.t / 1.1), 3), fade = Math.min(1, (sef.dur - sef.t) / 0.8);
  sef.scale = Math.max(0.01, grow * (1 + 0.25 * (sef.t / sef.dur)) * (1 + 0.04 * Math.sin(sef.t * 5)));
  sef.rot += dt * 0.45;
  sef.root.position.set(h.x, 0, h.z); sef.root.rotation.y = sef.rot; sef.root.scale.set(sef.scale, 1, sef.scale);
  sef.nodes.forEach((n, i) => { n.position.y = 0.75 + Math.sin(sef.t * 2.2 + i * 0.7) * 0.15; const s = (0.8 + 0.25 * fade + 0.1 * Math.sin(sef.t * 4 + i)) * fade; n.scale.set(s / sef.scale, s, s / sef.scale); });
  sef.paths.forEach((p, i) => (p.material.opacity = (0.35 + 0.35 * (0.5 + 0.5 * Math.sin(sef.t * 4 - i * 0.6))) * fade));
  sef.ring.material.opacity = 0.45 * fade;
  const c = Math.cos(sef.rot), s = Math.sin(sef.rot), sc = sef.scale;
  for (let k = 0; k < 4; k++) { // light travelling along the paths
    const [a, b] = SEF_PATHS[(Math.random() * 22) | 0], u = Math.random();
    const lx = (sef.local[a][0] * (1 - u) + sef.local[b][0] * u) * sc, lz = (sef.local[a][1] * (1 - u) + sef.local[b][1] * u) * sc;
    emit(h.x + lx * c + lz * s, 0.2, h.z - lx * s + lz * c, 0, 0.9, 0, 0.9, 0.3, k % 2 ? C_GOLD : C_WHITE);
  }
  if (sef.t < 0.6) return;
  for (const e of enemies) {
    if (e.state !== 'walk') continue;
    const rx = e.x - h.x, rz = e.z - h.z, lx = (rx * c - rz * s) / sc, lz = (rx * s + rz * c) / sc, er = e.r / sc;
    let hit = false;
    for (const [nx, nz] of sef.local) if (Math.hypot(lx - nx, lz - nz) < 0.7 + er) { hit = true; break; }
    if (!hit) for (const [a, b] of SEF_PATHS) if (distSeg(lx, lz, sef.local[a][0], sef.local[a][1], sef.local[b][0], sef.local[b][1]) < 0.3 + er) { hit = true; break; }
    if (hit) { fill(e, 24 * dt); e.slow = Math.min(e.slow, 0.4); }
  }
}

/* ================= powers: Hero 3 ================= */
function heartShape() { const sh = new THREE.Shape(); sh.moveTo(0, 0.35); sh.bezierCurveTo(0, 0.62, -0.5, 0.95, -0.85, 0.6); sh.bezierCurveTo(-1.2, 0.2, -0.6, -0.4, 0, -0.95); sh.bezierCurveTo(0.6, -0.4, 1.2, 0.2, 0.85, 0.6); sh.bezierCurveTo(0.5, 0.95, 0, 0.62, 0, 0.35); return sh; }
const heartRingGeo = (() => {
  const outer = heartShape().getPoints(24);
  const s2 = new THREE.Shape(outer.map((p) => new THREE.Vector2(p.x, p.y)));
  s2.holes.push(new THREE.Path(outer.map((p) => new THREE.Vector2(p.x * 0.86, p.y * 0.86 + 0.02)).reverse()));
  return new THREE.ShapeGeometry(s2).rotateX(-Math.PI / 2);
})();
const heartFillGeo = new THREE.ShapeGeometry(heartShape(), 16).rotateX(-Math.PI / 2);
const hearts = [];
for (let i = 0; i < 8; i++) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(heartRingGeo, new THREE.MeshBasicMaterial({ color: 0xffe2a0, opacity: 0.9, ...ADD, side: THREE.DoubleSide }));
  const inner = new THREE.Mesh(heartFillGeo, new THREE.MeshBasicMaterial({ color: 0xffd27a, opacity: 0.15, ...ADD, side: THREE.DoubleSide }));
  g.add(ring, inner); g.visible = false; scene.add(g);
  hearts.push({ g, ring, inner, t: 99, dur: 1.3, power: 1, hit: new Set(), x: 0, z: 0 });
}
function castHeart(h, crowd) {
  const w = hearts.find((q) => q.t >= q.dur); if (!w) return;
  w.t = 0; w.power = 1 + 0.35 * Math.min(crowd, 6); w.hit.clear(); w.x = h.x; w.z = h.z; w.g.visible = true;
}
function updateHearts(dt) {
  for (const w of hearts) {
    if (w.t >= w.dur) { w.g.visible = false; continue; }
    w.t += dt; const k = w.t / w.dur, R = 0.8 + k * 6.2;
    w.g.position.set(w.x, 0.07 + k * 0.2, w.z); w.g.scale.set(R, 1, R);
    w.ring.material.opacity = 0.9 * (1 - k) * Math.min(1.4, 0.7 + w.power * 0.25); w.inner.material.opacity = 0.15 * (1 - k);
    for (const e of enemies) if (e.state === 'walk' && !w.hit.has(e) && Math.hypot(e.x - w.x, e.z - w.z) < R * 0.9 + e.r) { w.hit.add(e); fill(e, 2.6 * w.power); }
    if (Math.random() < 0.6) { const a = Math.random() * 6.28; emit(w.x + Math.cos(a) * R * 0.85, 0.2, w.z + Math.sin(a) * R * 0.85, 0, 0.6, 0, 0.5, 0.22, C_GOLD); }
  }
}
/* rain of stars (instanced) */
const starGeo = (() => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.16 : 0.38, a = i / 10 * Math.PI * 2 + Math.PI / 2; i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r); } return new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }).translate(0, 0, -0.06); })();
const MAXSTAR = 40;
const starMesh = new THREE.InstancedMesh(starGeo, new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), MAXSTAR); starMesh.frustumCulled = false; starMesh.count = 0; scene.add(starMesh);
const stars = []; for (let i = 0; i < MAXSTAR; i++) stars.push({ active: false });
const starZones = [];
const zoneMesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 48).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe3a0, opacity: 0.7, ...ADD })); zoneMesh.visible = false; scene.add(zoneMesh);
function castStars(h, tx, tz) { starZones.push({ x: tx, z: tz, t: 0, dur: 2.0, R: 3.6, acc: 0 }); }
const sd = new THREE.Object3D();
function updateStars(dt) {
  zoneMesh.visible = false;
  for (let k = starZones.length - 1; k >= 0; k--) {
    const zn = starZones[k]; zn.t += dt;
    if (zn.t > zn.dur + 1.2) { starZones.splice(k, 1); continue; }
    zoneMesh.visible = true; zoneMesh.position.set(zn.x, 0.08, zn.z); zoneMesh.scale.setScalar(zn.R * (0.95 + 0.05 * Math.sin(zn.t * 8)));
    zoneMesh.material.opacity = 0.7 * Math.min(1, zn.dur + 1.2 - zn.t);
    if (zn.t < zn.dur) {
      zn.acc += dt * 14;
      while (zn.acc >= 1) {
        zn.acc--; const s = stars.find((q) => !q.active); if (!s) break;
        const a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * zn.R, tx = zn.x + Math.cos(a) * r, tz = zn.z + Math.sin(a) * r, y = 13 + Math.random() * 3;
        Object.assign(s, { active: true, x: tx + 2, y, z: tz - 1.5, spin: Math.random() * 6, vy: -16 });
        const T0 = y / 16; s.vx = -2 / T0; s.vz = 1.5 / T0;
      }
    }
  }
  let n = 0;
  for (const s of stars) {
    if (!s.active) continue;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt; s.spin += dt * 8;
    if (Math.random() < 0.7) emit(s.x, s.y, s.z, 0, 0.5, 0, 0.45, 0.3, C_GOLD);
    if (s.y <= 0.15) {
      s.active = false;
      for (let i = 0; i < 12; i++) { const a = Math.random() * 6.283; emit(s.x, 0.25, s.z, Math.cos(a) * 3, 1 + Math.random() * 2.5, Math.sin(a) * 3, 0.6, 0.3, i % 2 ? C_WHITE : C_GOLD, 4); }
      for (const e of enemies) if (e.state === 'walk' && Math.hypot(e.x - s.x, e.z - s.z) < 1.5 + e.r) fill(e, 4.5);
      continue;
    }
    sd.position.set(s.x, s.y, s.z); sd.rotation.set(0.4, s.spin, 0); sd.scale.setScalar(1.15); sd.updateMatrix(); starMesh.setMatrixAt(n++, sd.matrix);
  }
  starMesh.count = n; starMesh.instanceMatrix.needsUpdate = true;
}
/* seeds of light → columns of light */
const seeds = [], columns = [];
{
  const sg = new THREE.SphereGeometry(0.16, 10, 8);
  for (let i = 0; i < 15; i++) {
    const g = new THREE.Group(); g.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0xfff0c0 })));
    const gl = new THREE.Mesh(flatGlowGeo, glowMat(0xffd98a, 0.8)); gl.scale.set(1.4, 1, 1.4); gl.position.y = -0.12; g.add(gl);
    g.visible = false; scene.add(g); seeds.push({ g, active: false, x: 0, z: 0, t: 0, born: 0 });
  }
  const cg = new THREE.CylinderGeometry(0.75, 0.75, 11, 16, 1, true).translate(0, 5.5, 0);
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(cg, pillarMat(0xffe7b0)); m.visible = false; m.renderOrder = 3; scene.add(m); columns.push({ m, t: 99, dur: 1.8, x: 0, z: 0 }); }
}
function castSeeds(h) {
  const base = Math.atan2(h.dirz, h.dirx);
  for (let i = 0; i < 5; i++) {
    let s = seeds.find((q) => !q.active);
    if (!s) s = seeds.reduce((a, b) => (a.born < b.born ? a : b));
    const a = base + (i - 2) * 0.55, r = 3.2;
    Object.assign(s, { active: true, x: THREE.MathUtils.clamp(h.x + Math.cos(a) * r, -ARENA, ARENA), z: THREE.MathUtils.clamp(h.z + Math.sin(a) * r, -ARENA, ARENA), t: 0, born: gameTime });
    s.g.position.set(s.x, 0.18, s.z); s.g.visible = true;
    for (let k = 0; k < 8; k++) emit(s.x, 0.3, s.z, (Math.random() - 0.5) * 1.5, 1.5, (Math.random() - 0.5) * 1.5, 0.6, 0.25, C_GOLD);
  }
}
function updateSeeds(dt) {
  for (const s of seeds) {
    if (!s.active) continue;
    s.t += dt; if (s.t > 28) { s.active = false; s.g.visible = false; continue; }
    s.g.scale.setScalar(1 + 0.2 * Math.sin(s.t * 4 + s.x));
    for (const e of enemies) if (e.state === 'walk' && Math.hypot(e.x - s.x, e.z - s.z) < 1.0 + e.r) {
      s.active = false; s.g.visible = false;
      const c = columns.find((q) => q.t >= q.dur) || columns[0]; c.t = 0; c.x = s.x; c.z = s.z; c.m.position.set(s.x, 0, s.z); c.m.visible = true;
      for (let k = 0; k < 24; k++) emit(s.x + (Math.random() - 0.5), 0.2, s.z + (Math.random() - 0.5), (Math.random() - 0.5) * 0.6, 3 + Math.random() * 5, (Math.random() - 0.5) * 0.6, 1.2, 0.35, k % 2 ? C_WHITE : C_GOLD);
      break;
    }
  }
  for (const c of columns) {
    if (c.t >= c.dur) { c.m.visible = false; continue; }
    c.t += dt; const k = c.t / c.dur;
    c.m.scale.set(1 + k * 0.4, Math.min(1, c.t / 0.25), 1 + k * 0.4);
    c.m.material.uniforms.uA.value = 0.75 * (1 - k * k); c.m.material.uniforms.uTime.value = gameTime;
    for (const e of enemies) if (e.state === 'walk' && Math.hypot(e.x - c.x, e.z - c.z) < 1.9 + e.r) { fill(e, 30 * dt); e.slow = Math.min(e.slow, 0.2); }
  }
}

/* ================= helpers ================= */
function nearestEnemy(x, z, maxD) {
  let b = null, bd = maxD;
  for (const e of enemies) { if (e.state !== 'walk') continue; const d = Math.hypot(e.x - x, e.z - z); if (d < bd) { bd = d; b = e; } }
  return b;
}
function countNear(x, z, R) { let n = 0; for (const e of enemies) if (e.state === 'walk' && Math.hypot(e.x - x, e.z - z) < R) n++; return n; }
function clusterCenter(x, z, R) {
  let sx = 0, sz = 0, n = 0; for (const e of enemies) if (e.state === 'walk' && Math.hypot(e.x - x, e.z - z) < R) { sx += e.x; sz += e.z; n++; }
  return n ? [sx / n, sz / n] : null;
}
/* ================= extra powers (4th and 5th button of each hero) ================= */
const waves = []; // expanding flat rings, pooled
{
  const geo = new THREE.RingGeometry(0.9, 1, 64).rotateX(-Math.PI / 2);
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0, ...ADD, side: THREE.DoubleSide })); m.visible = false; scene.add(m); waves.push({ m, t: 1, dur: 1, R: 1, x: 0, z: 0, hit: new Set(), fx: null }); }
}
function castWave(x, z, R, dur, color, fx) {
  const w = waves.find((q) => q.t >= q.dur) || waves[0];
  Object.assign(w, { t: 0, dur, R, x, z, fx }); w.hit.clear(); w.m.material.color.setHex(color); w.m.visible = true;
}
function updateWaves(dt) {
  for (const w of waves) {
    if (w.t >= w.dur) { w.m.visible = false; continue; }
    w.t += dt; const k = Math.min(1, w.t / w.dur), r = 0.5 + k * w.R;
    w.m.position.set(w.x, 0.12, w.z); w.m.scale.set(r, 1, r); w.m.material.opacity = 0.85 * (1 - k);
    if (w.fx) for (const e of enemies) if (e.state === 'walk' && !w.hit.has(e) && Math.hypot(e.x - w.x, e.z - w.z) < r + e.r) { w.hit.add(e); w.fx(e); }
  }
}
let shieldT = 0;
function castShield() { shieldT = 5; banner(T[lang].shieldB); for (const h of heroes) for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; emit(h.x + Math.cos(a) * 1.2, 1, h.z + Math.sin(a) * 1.2, Math.cos(a), 1.5, Math.sin(a), 0.9, 0.35, C_GOLD); } }
function castBurst(h) {
  castWave(h.x, h.z, 9, 0.9, 0xffe7a3, (e) => { fill(e, 9); e.calm = Math.max(e.calm, 0.6); });
  for (let i = 0; i < 36; i++) { const a = i / 36 * 6.283; emit(h.x, 1, h.z, Math.cos(a) * 9, 1 + Math.random() * 2, Math.sin(a) * 9, 0.9, 0.4, i % 2 ? C_WHITE : C_GOLD); }
}
function castCalm(h) { castWave(h.x, h.z, 12, 1.3, 0x9ec0ff, (e) => { e.calm = 3.5; fill(e, 3); }); }
function castGift(h) {
  teamLight = Math.min(100, teamLight + 35); banner(T[lang].giftB); updateHud();
  for (const q of heroes) for (let i = 0; i < 16; i++) { const a = Math.random() * 6.283; emit(q.x + Math.cos(a) * 0.6, 0.3, q.z + Math.sin(a) * 0.6, 0, 2 + Math.random() * 2, 0, 1.2, 0.35, i % 2 ? C_GOLD : C_PALE); }
  for (const e of enemies) if (e.state === 'walk' && Math.hypot(e.x - h.x, e.z - h.z) < 5 + e.r) fill(e, 5);
}
function castSunrise(h) {
  castWave(h.x, h.z, 15, 1.6, 0xffd98a, (e) => fill(e, 6)); auroraBoost = Math.min(1.6, auroraBoost + 0.8);
  for (let i = 0; i < 30; i++) { const a = Math.random() * 6.283, r = Math.random() * 12; emit(h.x + Math.cos(a) * r, 0.2, h.z + Math.sin(a) * r, 0, 2.5, 0, 1.3, 0.35, C_GOLD); }
}
function castKind(h) { h.kz = 6; }
const EXTRA = [[castShield, castBurst], [castCalm, castGift], [castSunrise, castKind]];
function powerCd(h, i) { return [h.cdS, h.cdA, h.cdB, h.cdC, h.cdD][i]; }
function powerMax(k, i) { return i === 0 ? COOLDOWN2[k][0] : i < 3 ? COOLDOWN[k][i] : COOLDOWN2[k][i - 2]; }
function usePower(h, i, ai = false) { // i: 0 boost basic, 1 A, 2 B, 3 & 4 extra
  if (i === 1) return useSpecial(h, 'A', ai); if (i === 2) return useSpecial(h, 'B', ai);
  if (state !== 'play' || powerCd(h, i) > 0) return false;
  const k = h.kind, m = ai ? AI_CD : 1;
  if (i === 0) { h.surge = 3.5; h.cdS = COOLDOWN2[k][0] * m; }
  else if (i === 3) { EXTRA[k][0](h); h.cdC = COOLDOWN2[k][1] * m; }
  else { EXTRA[k][1](h); h.cdD = COOLDOWN2[k][2] * m; }
  updatePowerBtns(); return true;
}
function useSpecial(h, which, ai = false) {
  if (state !== 'play') return false;
  if ((which === 'A' ? h.cdA : h.cdB) > 0) return false;
  const k = h.kind;
  if (which === 'A') {
    if (k === 0) castDoves(h); else if (k === 1) castBridge(h);
    else {
      let tx, tz;
      if (h === heroes[lead] && aim.active) { tx = h.x + aim.x * 6.5; tz = h.z + aim.z * 6.5; }
      else if (h === heroes[lead] && aim.mouse) { tx = aim.mx; tz = aim.mz; }
      else { const c = clusterCenter(h.x, h.z, 12); if (c) [tx, tz] = c; else { tx = h.x + h.dirx * 6; tz = h.z + h.dirz * 6; } }
      castStars(h, tx, tz);
    }
    h.cdA = COOLDOWN[k][1] * (ai ? AI_CD : 1);
  } else {
    if (k === 0) castBlizzard(h); else if (k === 1) { if (sef.t < sef.dur) return false; castSefirot(h); } else castSeeds(h);
    h.cdB = COOLDOWN[k][2] * (ai ? AI_CD : 1);
  }
  updatePowerBtns();
  return true;
}

/* ================= input ================= */
const keys = {};
const joy = { active: false, id: -1, x: 0, z: 0 };
const aim = { touch: false, active: false, id: -1, sx: 0, sy: 0, x: 0, z: -1, mouse: false, mx: 0, mz: 0 };
addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase(); keys[k] = true;
  if (state === 'play') {
    if (k === '1' || k === '2' || k === '3') setLead(+k - 1);
    if (k === 'tab') { e.preventDefault(); setLead((lead + 1) % 3); }
    if (k === 'z') usePower(heroes[lead], 0);
    if (k === 'q') useSpecial(heroes[lead], 'A');
    if (k === 'e' || k === ' ') { e.preventDefault(); useSpecial(heroes[lead], 'B'); }
    if (k === 'r') usePower(heroes[lead], 3);
    if (k === 'f') usePower(heroes[lead], 4);
    if (k === 'p' || k === 'escape') pause(true);
  } else if (state === 'pause' && (k === 'p' || k === 'escape')) pause(false);
});
addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), v2 = new THREE.Vector2(), v3 = new THREE.Vector3();
canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'play') return;
  if (e.pointerType === 'mouse') { aim.mouse = true; return; }
  try { canvas.setPointerCapture(e.pointerId); } catch (er) {}
  if (!aim.touch) Object.assign(aim, { touch: true, id: e.pointerId, sx: e.clientX, sy: e.clientY });
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') {
    aim.mouse = true;
    v2.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(v2, camera);
    if (ray.ray.intersectPlane(plane, v3)) { aim.mx = v3.x; aim.mz = v3.z; }
    return;
  }
  if (aim.touch && e.pointerId === aim.id) {
    const dx = e.clientX - aim.sx, dy = e.clientY - aim.sy, L = Math.hypot(dx, dy);
    if (L > 14) { aim.active = true; aim.x = dx / L; aim.z = dy / L; }
  }
});
const endPtr = (e) => {
  if (aim.touch && e.pointerId === aim.id) { aim.touch = false; aim.active = false; }
};
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
/* fixed movement joystick (bottom-right): analog, any direction; touch (multi-touch safe) and mouse */
{
  const el = $('joy'), knob = el.querySelector('i');
  const upd = (e) => {
    const r = el.getBoundingClientRect(), M = r.width * 0.36;
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2); const L = Math.hypot(dx, dy);
    if (L > M) { dx *= M / L; dy *= M / L; }
    const n = Math.hypot(dx, dy) / M; // small dead zone so a resting thumb doesn't drift
    joy.x = n < 0.12 ? 0 : dx / M; joy.z = n < 0.12 ? 0 : dy / M;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation(); if (joy.active || state !== 'play') return;
    joy.active = true; joy.id = e.pointerId; el.classList.add('act'); try { el.setPointerCapture(e.pointerId); } catch (er) {} upd(e);
  });
  el.addEventListener('pointermove', (e) => { if (joy.active && e.pointerId === joy.id) { e.preventDefault(); upd(e); } });
  const end = (e) => { if (joy.active && e.pointerId === joy.id) { joy.active = false; joy.id = -1; joy.x = joy.z = 0; knob.style.transform = ''; el.classList.remove('act'); } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end); el.addEventListener('lostpointercapture', end);
  el.addEventListener('contextmenu', (e) => e.preventDefault());
}

/* ================= sound (optional, off by default, WebAudio only) ================= */
let ac = null, pad = null, lastChime = 0;
function startSound() {
  if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
  if (ac.resume) ac.resume();
  if (pad) return;
  const out = ac.createGain(); out.gain.value = 0; out.connect(ac.destination);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.connect(out);
  const oscs = [130.81, 196, 261.63, 329.63].map((f, i) => { const o = ac.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (i - 1.5) * 6; const g = ac.createGain(); g.gain.value = 0.25 / (i + 1); o.connect(g); g.connect(lp); o.start(); return o; });
  const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 250; lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
  out.gain.linearRampToValueAtTime(0.05, ac.currentTime + 2.5);
  pad = { out, oscs, lfo };
}
function stopSound() { if (pad && ac) { const p = pad; pad = null; p.out.gain.linearRampToValueAtTime(0, ac.currentTime + 0.8); setTimeout(() => { p.oscs.forEach((o) => o.stop()); p.lfo.stop(); }, 900); } }
function chime() { // soft bell when a soul rises (powers themselves are silent)
  if (!soundOn || !ac || ac.currentTime - lastChime < 0.12) return; lastChime = ac.currentTime;
  const base = [523.25, 659.25, 783.99, 1046.5][(Math.random() * 4) | 0], t0 = ac.currentTime;
  [1, 1.5].forEach((m, i) => { const o = ac.createOscillator(), g = ac.createGain(), t = t0 + i * 0.09; o.type = 'sine'; o.frequency.value = base * m; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + 1.5); });
}

/* ================= UI ================= */
function applyLang() {
  const L = T[lang];
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  document.title = L.title + (lang === 'he' ? ' · Lightify' : ' · לייטיפיי');
  document.querySelectorAll('[data-t]').forEach((el) => { el.textContent = L[el.dataset.t]; });
  $('help').innerHTML = L.help; $('langBtn').textContent = L.langBtn;
  [$('soundBtn'), $('sound2Btn')].forEach((b) => (b.textContent = soundOn ? L.soundOn : L.soundOff));
  $('heroCards').innerHTML = L.heroes.map((h, i) => `<div class="hcard"><b>${svg('h' + i, 20)}</b>${h.p.map((p, j) => `<span class="p">${svg(HERO_ICONS[i][j], 14)} ${p}${j === 0 ? ` <i>(${L.auto})</i>` : ''}</span>`).join('')}</div>`).join('');
  $('angleBtn').setAttribute('aria-label', L.angle);
  if (!$('installHint').classList.contains('hidden')) $('installHint').innerHTML = instHint();
  buildHeroBtns(); updatePowerBtns();
}
function buildHeroBtns() {
  const box = $('hbtns');
  box.innerHTML = [0, 1, 2].map((i) => `<button class="hbtn${i === lead ? ' on' : ''}" data-h="${i}" aria-label="${i + 1}">${svg('h' + i, 26)}<small>${i + 1}</small></button>`).join('');
  box.querySelectorAll('.hbtn').forEach((b) => b.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); setLead(+b.dataset.h); }));
}
function setLead(i) { if (!heroes[i]) return; lead = i; buildHeroBtns(); updatePowerBtns(); }
/* power pad: 5 icon buttons on a circle (pentagon), cooldown shown as a dark sweep */
const PAD_POS = [-90, -18, 54, 126, 198].map((a) => [50 + 33 * Math.cos(a * Math.PI / 180), 50 + 33 * Math.sin(a * Math.PI / 180)]);
{
  const pad = $('pad');
  for (let i = 0; i < 5; i++) {
    const b = document.createElement('button'); b.className = 'pw'; b.id = 'pw' + i; b.dataset.i = i;
    b.style.left = PAD_POS[i][0] + '%'; b.style.top = PAD_POS[i][1] + '%';
    b.innerHTML = '<span class="ic"></span><div class="cd"></div>';
    b.addEventListener('pointerdown', (e) => { e.stopPropagation(); e.preventDefault(); usePower(heroes[lead], i); });
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    pad.appendChild(b);
  }
  pad.addEventListener('pointerdown', (e) => e.stopPropagation());
}
function updatePowerBtns() {
  const h = heroes[lead]; if (!h) return; const L = T[lang].heroes[h.kind], k = h.kind;
  for (let i = 0; i < 5; i++) {
    const b = $('pw' + i);
    if (b.dataset.k !== String(k) || b.dataset.l !== lang) {
      b.querySelector('.ic').innerHTML = svg(HERO_ICONS[k][i], i === 2 ? 32 : 28);
      const name = L.p[i] + (i === 0 ? ' (' + T[lang].boost + ')' : '');
      b.setAttribute('aria-label', name); b.title = name; b.dataset.k = k; b.dataset.l = lang;
      $('padHub').innerHTML = svg('h' + k, 26);
    }
    const cd = powerCd(h, i);
    b.querySelector('.cd').style.setProperty('--p', (cd > 0 ? Math.min(100, cd / powerMax(k, i) * 100) : 0) + '%');
    b.classList.toggle('ready', cd <= 0); b.classList.toggle('on', (i === 0 && h.surge > 0) || (i === 4 && k === 2 && h.kz > 0) || (i === 3 && k === 0 && shieldT > 0));
  }
}
function updateHud() { $('score').textContent = score; $('wave').textContent = wave; $('light').style.width = Math.max(0, teamLight) + '%'; }
let bannerTimer = 0;
function banner(txt) { const b = $('banner'); b.textContent = txt; b.style.opacity = 1; clearTimeout(bannerTimer); bannerTimer = setTimeout(() => (b.style.opacity = 0), 1800); }
function setAngle(v) {
  angleDeg = Math.max(3, Math.min(70, Math.round(v))); store.set('rg-game-angle', angleDeg);
  for (const [s, l] of [['angle', 'anglev'], ['angle2', 'angle2v'], ['angle3', 'angle3v']]) { $(s).value = angleDeg; $(l).textContent = angleDeg + '°'; }
  $('angleVal').textContent = angleDeg + '°';
}
['angle', 'angle2', 'angle3'].forEach((id) => $(id).addEventListener('input', (e) => setAngle(+e.target.value)));
$('angleBtn').addEventListener('click', () => $('anglePop').classList.toggle('hidden'));
['anglePop', 'angleBtn', 'pauseBtn'].forEach((id) => $(id).addEventListener('pointerdown', (e) => e.stopPropagation()));
function toggleSound() { soundOn = !soundOn; store.set('rg-game-sound', soundOn ? '1' : '0'); if (soundOn) startSound(); else stopSound(); applyLang(); }
$('soundBtn').addEventListener('click', toggleSound); $('sound2Btn').addEventListener('click', toggleSound);
$('langBtn').addEventListener('click', () => { lang = lang === 'he' ? 'en' : 'he'; store.set('rg-lang', lang); applyLang(); });
const show = (id, on) => $(id).classList.toggle('hidden', !on);

function resetGame() {
  for (const e of enemies) removeEnemy(e);
  enemies.length = 0;
  doves.forEach((d) => { d.active = false; d.g.visible = false; });
  bridges.forEach((b) => (b.t = b.dur)); sef.t = sef.dur; blizzards.length = 0; starZones.length = 0;
  seeds.forEach((s) => { s.active = false; s.g.visible = false; }); columns.forEach((c) => (c.t = c.dur)); stars.forEach((s) => (s.active = false)); hearts.forEach((w) => (w.t = w.dur));
  P.life.fill(0);
  heroes.forEach((h, i) => { h.x = (i - 1) * 2.2; h.z = i === 1 ? -0.5 : 1.2; h.cdA = 2; h.cdB = 6; h.cdS = 0; h.cdC = 3; h.cdD = 6; h.surge = 0; h.kz = 0; h.vx = h.vz = 0; h.fx.shield.visible = h.fx.kind.visible = false; });
  shieldT = 0; waves.forEach((w) => { w.t = w.dur; w.m.visible = false; }); joy.x = joy.z = 0;
  score = 0; wave = 1; teamLight = 100; toSpawn = waveCount(1); spawnTimer = 1.2; waveGap = 0; gameTime = 0; fadeT = 0; auroraBoost = 0;
  $('fade').style.opacity = 0;
  updateHud(); banner(T[lang].waveB.replace('{n}', 1));
}
function startGame() {
  show('menu', false); show('over', false); show('pause', false); show('hud', true);
  resetGame(); state = 'play'; setLead(lead); updateCamera(0, true);
  if (soundOn) startSound();
}
$('startBtn').addEventListener('click', startGame);
$('againBtn').addEventListener('click', startGame);
function toMenu() { state = 'menu'; show('pause', false); show('over', false); show('hud', false); show('menu', true); $('fade').style.opacity = 0; }
$('menuBtn').addEventListener('click', toMenu); $('menu2Btn').addEventListener('click', toMenu);
function pause(on) { if (on && state === 'play') { state = 'pause'; show('pause', true); } else if (!on && state === 'pause') { state = 'play'; show('pause', false); } }
$('pauseBtn').addEventListener('click', () => pause(true)); $('resumeBtn').addEventListener('click', () => pause(false));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });

/* install (same pattern as the other apps: native prompt, otherwise short instructions) */
const INST = {
  he: { android: '<ol><li>פותחים את תפריט הדפדפן: <b>⋮</b> למעלה ב־Chrome, או <b>☰</b> למטה ב־Samsung Internet.</li><li>בוחרים <b>„התקנת אפליקציה”</b> או <b>„הוספה למסך הבית”</b> (ב־Samsung: <b>„הוסף דף אל” ← „מסך הבית”</b>).</li></ol>', ios: '<ol><li>ב־Safari לוחצים על כפתור השיתוף <b>(□↑)</b>.</li><li>בוחרים <b>„הוסף למסך הבית”</b> ואז <b>„הוסף”</b>.</li></ol>', desktop: '<ol><li>ב־Chrome או Edge: סמל ההתקנה בצד שורת הכתובת, או תפריט <b>⋮</b> ← <b>„התקנה”</b>.</li><li>בטלפון: פותחים את הכתובת בדפדפן ובוחרים <b>„הוספה למסך הבית”</b>.</li></ol>' },
  en: { android: '<ol><li>Open the browser menu: <b>⋮</b> at the top in Chrome, or <b>☰</b> at the bottom in Samsung Internet.</li><li>Choose <b>“Install app”</b> or <b>“Add to Home screen”</b> (Samsung: <b>“Add page to” → “Home screen”</b>).</li></ol>', ios: '<ol><li>In Safari tap the Share button <b>(□↑)</b>.</li><li>Choose <b>“Add to Home Screen”</b>, then <b>“Add”</b>.</li></ol>', desktop: '<ol><li>In Chrome or Edge: click the install icon at the end of the address bar, or menu <b>⋮</b> → <b>“Install”</b>.</li><li>On a phone: open this address in the browser and choose <b>“Add to Home screen”</b>.</li></ol>' }
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

/* ================= camera & animation ================= */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.fov = camera.aspect < 1 ? 70 : 55; camera.updateProjectionMatrix();
  pMat.uniforms.uScale.value = (h * renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
}
addEventListener('resize', resize);
const camT = new THREE.Vector3();
function updateCamera(dt, snap) {
  const L = heroes[lead], k = snap ? 1 : 1 - Math.exp(-dt * 4);
  camT.x += (L.x - camT.x) * k; camT.z += (L.z - camT.z) * k;
  // elevation angle above the ground plane (3°..70°); pulled back for a wider view. At very low angles lift the eye a little so the heroes don't block everything.
  const a = THREE.MathUtils.degToRad(angleDeg), d = camera.aspect < 1 ? 24 : 19.5, low = Math.max(0, 1 - angleDeg / 20);
  camera.position.set(camT.x, Math.max(1.2, Math.sin(a) * d) + low * 1.4, camT.z + Math.cos(a) * d);
  camera.lookAt(camT.x, 0.6 + low * 0.6, camT.z - low * 2);
  sun.position.set(camT.x + 6, 18, camT.z + 9); sun.target.position.set(camT.x, 0, camT.z);
}
function animHero(h, dt, moving, t) {
  const u = h.g.userData; h.walk += dt * (moving ? 11 : 2.5);
  u.body.position.y = moving ? Math.abs(Math.sin(h.walk)) * 0.14 : Math.sin(h.walk) * 0.03;
  u.armL.rotation.x = moving ? Math.sin(h.walk) * 0.7 : 0; u.armR.rotation.x = moving ? -Math.sin(h.walk) * 0.7 : -0.15;
  u.fL.position.z = 0.06 + (moving ? Math.sin(h.walk) * 0.16 : 0); u.fR.position.z = 0.06 - (moving ? Math.sin(h.walk) * 0.16 : 0);
  u.head.rotation.z = Math.sin(t * 1.7 + h.kind) * 0.06;
  h.g.position.set(h.x, 0, h.z);
  let d = Math.atan2(h.dirx, h.dirz) - h.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); h.g.rotation.y += d * Math.min(1, dt * 10);
}
function animEnemy(e, dt, t) {
  const u = e.u, w = t * e.speed * 3.2 + e.ph;
  if (e.type === 'human') { u.legs[0].rotation.x = Math.sin(w) * 0.6; u.legs[1].rotation.x = -Math.sin(w) * 0.6; u.body.position.y = Math.abs(Math.sin(w)) * 0.08; }
  else if (e.type === 'cat') {
    u.legs.forEach((l, i) => (l.rotation.x = Math.sin(w * 1.3 + ((i === 0 || i === 3) ? 0 : Math.PI)) * 0.55));
    u.tailSegs.forEach((s, i) => { s.rotation.z = Math.sin(t * 3 + e.ph + i * 0.6) * 0.35; s.rotation.x = -0.25; });
    u.body.position.y = Math.abs(Math.sin(w * 1.3)) * 0.05; u.head.rotation.z = Math.sin(t * 2 + e.ph) * 0.12;
  } else if (e.type === 'dino') {
    const st = Math.sin(w * 0.8); u.legs[0].rotation.x = st * 0.45; u.legs[1].rotation.x = -st * 0.45;
    u.body.position.y = -Math.pow(Math.abs(Math.cos(w * 0.8)), 6) * 0.14 + 0.05; // heavy stomp
    u.body.rotation.z = st * 0.05; u.head.rotation.x = st * 0.08; u.tail.rotation.y = st * 0.25;
    if (e.state === 'walk' && Math.abs(Math.cos(w * 0.8)) > 0.995) for (let i = 0; i < 2; i++) emit(e.x + (Math.random() - 0.5), 0.1, e.z + (Math.random() - 0.5), (Math.random() - 0.5) * 2, 0.6, (Math.random() - 0.5) * 2, 0.5, 0.3, [0.45, 0.55, 0.9]);
  } else {
    u.body.rotation.z = Math.sin(t * 5 + e.ph) * 0.22; u.body.position.y = 0.15 + Math.sin(t * 3 + e.ph) * 0.12; // demon wobble
    u.wings.forEach((wg, i) => (wg.rotation.y = (i ? -1 : 1) * (0.3 + Math.sin(t * 14 + e.ph) * 0.45)));
    u.legs.forEach((l, i) => (l.rotation.x = Math.sin(w * 1.5 + i * Math.PI) * 0.5));
  }
}

/* ================= main loop ================= */
let last = performance.now(), fpsAcc = 0, fpsN = 0, fpsNow = 60, prevNow = 0;
function setQuality(q) { quality = q; renderer.setPixelRatio(Q[q].pr); partCap = Q[q].parts; P.idx %= partCap; resize(); }
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05; if (dt <= 0) dt = 0.001;
  // auto quality: if the average frame rate stays low, step down resolution / particles / enemy cap
  if (prevNow) { fpsAcc += now - prevNow; fpsN++; } prevNow = now;
  if (fpsAcc > 2500) { fpsNow = 1000 / (fpsAcc / fpsN); fpsAcc = fpsN = 0; if (!qualityLocked && state === 'play' && fpsNow < 45 && quality < 2) setQuality(quality + 1); }
  if (state === 'play' || state === 'fading') step(dt);
  else if (state === 'menu') menuIdle(dt);
  else heroes.forEach((h) => shadowAt(h.x, h.z, 0.55));
  render(dt);
}
function step(dt) {
  gameTime += dt;
  const L = heroes[lead], playing = state === 'play';
  if (playing) {
    let mx = (keys['d'] || keys['arrowright'] ? 1 : 0) - (keys['a'] || keys['arrowleft'] ? 1 : 0);
    let mz = (keys['s'] || keys['arrowdown'] ? 1 : 0) - (keys['w'] || keys['arrowup'] ? 1 : 0);
    if (joy.active) { mx = joy.x; mz = joy.z; }
    if (testMove) { mx = testMove[0]; mz = testMove[1]; }
    const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
    L.vx = mx * 5.6; L.vz = mz * 5.6;
  } else L.vx = L.vz = 0;
  heroes.forEach((h, i) => {
    if (i !== lead) { // companion AI: keep formation, step away from crowding, use powers when it helps
      const slot = (i - lead + 3) % 3 === 1 ? -1 : 1;
      const fx = L.x - L.dirz * slot * 2.4 - L.dirx * 1.6, fz = L.z + L.dirx * slot * 2.4 - L.dirz * 1.6;
      const tx = fx - h.x, tz = fz - h.z, d = Math.hypot(tx, tz);
      let vx = d > 0.4 ? tx / d * Math.min(7.5, d * 2.5) : 0, vz = d > 0.4 ? tz / d * Math.min(7.5, d * 2.5) : 0;
      for (const o of heroes) { if (o === h) continue; const ox = h.x - o.x, oz = h.z - o.z, od = Math.hypot(ox, oz); if (od < 1.5 && od > 1e-3) { vx += ox / od * (1.5 - od) * 6; vz += oz / od * (1.5 - od) * 6; } }
      const ne = nearestEnemy(h.x, h.z, 2.6);
      if (ne) { const ex = h.x - ne.x, ez = h.z - ne.z, el = Math.hypot(ex, ez) || 1; vx += ex / el * 4; vz += ez / el * 4; }
      h.vx = playing ? vx : 0; h.vz = playing ? vz : 0;
      if (playing && !testNoAI) {
        const near6 = countNear(h.x, h.z, 6.5), near11 = countNear(h.x, h.z, 11);
        if (h.cdA <= 0 && (h.kind === 1 ? near6 >= 2 : near11 >= 2) && Math.random() < dt * 1.5) useSpecial(h, 'A', true);
        if (h.cdB <= 0 && near6 >= (h.kind === 2 ? 2 : 4) && Math.random() < dt) useSpecial(h, 'B', true);
        if (h.cdC <= 0 && near6 >= 4 && Math.random() < dt * 0.5) usePower(h, 3, true);
        if (h.cdD <= 0 && near6 >= 5 && Math.random() < dt * 0.4) usePower(h, 4, true);
      }
    }
    h.x = THREE.MathUtils.clamp(h.x + h.vx * dt, -ARENA + 0.6, ARENA - 0.6); h.z = THREE.MathUtils.clamp(h.z + h.vz * dt, -ARENA + 0.6, ARENA - 0.6);
    if (i !== lead) { const lx = h.x - L.x, lz = h.z - L.z, ld = Math.hypot(lx, lz), MAXR = 4.2; if (ld > MAXR) { h.x = L.x + lx / ld * MAXR; h.z = L.z + lz / ld * MAXR; } } // never drift far from the hero you move
    h.cdS = Math.max(0, h.cdS - dt); h.cdC = Math.max(0, h.cdC - dt); h.cdD = Math.max(0, h.cdD - dt); h.surge = Math.max(0, h.surge - dt);
    h.fx.shield.visible = shieldT > 0 && !(testSolo && i !== lead); if (h.fx.shield.visible) { h.fx.shield.position.set(h.x, 0.9, h.z); h.fx.shield.scale.setScalar(1 + 0.05 * Math.sin(gameTime * 8)); }
    if (h.kz > 0) {
      h.kz -= dt; const R = 4.6; h.fx.kind.visible = true; h.fx.kind.position.set(h.x, 0.15, h.z); h.fx.kind.scale.setScalar(R * (1 + 0.04 * Math.sin(gameTime * 6))); h.fx.kind.rotation.y += dt;
      for (const e of enemies) if (e.state === 'walk' && Math.hypot(e.x - h.x, e.z - h.z) < R + e.r) { fill(e, 6 * dt); e.slow = Math.min(e.slow, 0.5); }
      if (Math.random() < 0.6) { const a = Math.random() * 6.283; emit(h.x + Math.cos(a) * R, 0.3, h.z + Math.sin(a) * R, 0, 1, 0, 0.8, 0.3, C_GOLD); }
    } else h.fx.kind.visible = false;
    let ax = 0, az = 0;
    if (i === lead && aim.active) { ax = aim.x; az = aim.z; }
    else if (i === lead && aim.mouse) { ax = aim.mx - h.x; az = aim.mz - h.z; }
    else { const t = nearestEnemy(h.x, h.z, 11); if (t) { ax = t.x - h.x; az = t.z - h.z; } else if (Math.hypot(h.vx, h.vz) > 0.5) { ax = h.vx; az = h.vz; } }
    const al = Math.hypot(ax, az); if (al > 0.01) { h.dirx = ax / al; h.dirz = az / al; }
    h.cdA = Math.max(0, h.cdA - dt); h.cdB = Math.max(0, h.cdB - dt);
    animHero(h, dt, Math.hypot(h.vx, h.vz) > 0.4, gameTime);
    const hide = testSolo && i !== lead;
    h.g.visible = !hide; if (h.fx.disc) h.fx.disc.visible = h.fx.shell.visible = !hide;
    if (!hide) shadowAt(h.x, h.z, 0.55);
    if (playing && !hide) basicPower(h, dt, i === lead);
    else if (h.fx.beam) h.fx.beam.visible = false;
  });
  // waves & spawning
  if (playing && !spawnFrozen) {
    let alive = 0; for (const e of enemies) if (e.state === 'walk') alive++;
    if (toSpawn > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0 && alive < Q[quality].enemies) {
        const grp = Math.min(toSpawn, Q[quality].enemies - alive, Math.random() < 0.35 + wave * 0.04 ? 2 + (Math.random() < 0.3 ? 1 : 0) : 1); // small groups arrive together
        for (let g = 0; g < grp; g++) { spawnEnemy(); toSpawn--; }
        spawnTimer = Math.max(0.22, 0.9 - wave * 0.06) * (0.6 + Math.random() * 0.8);
      }
    }
    else if (alive === 0) {
      waveGap += dt;
      if (waveGap > 2.2) { wave++; toSpawn = waveCount(wave); waveGap = 0; spawnTimer = 0.5; teamLight = Math.min(100, teamLight + 25); banner(T[lang].waveB.replace('{n}', wave)); updateHud(); }
    }
  }
  // enemies
  let touching = 0;
  for (let k = enemies.length - 1; k >= 0; k--) {
    const e = enemies[k];
    if (e.state === 'walk') {
      let tgt = L, bd = 1e9; for (const h of heroes) { const d = Math.hypot(h.x - e.x, h.z - e.z) * (h === L ? 0.85 : 1); if (d < bd) { bd = d; tgt = h; } }
      const dx = tgt.x - e.x, dz = tgt.z - e.z, dist = Math.hypot(dx, dz) || 1;
      let sx = 0, sz = 0;
      for (const o of enemies) { if (o === e || o.state !== 'walk') continue; const ox = e.x - o.x, oz = e.z - o.z, od = ox * ox + oz * oz, rr = (e.r + o.r) * 1.1; if (od < rr * rr && od > 1e-4) { const q = Math.sqrt(od); sx += ox / q * (rr - q); sz += oz / q * (rr - q); } }
      const sp = playing && !testHold ? e.speed * e.slow : 0;
      if (dist > e.r + 0.55) { e.x += (dx / dist * sp + sx * 3) * dt; e.z += (dz / dist * sp + sz * 3) * dt; }
      else { touching++; e.x -= dx / dist * 0.6 * dt; e.z -= dz / dist * 0.6 * dt; }
      e.slow = Math.min(1, e.slow + dt * 1.5); if (e.calm > 0) { e.calm -= dt; e.slow = Math.min(e.slow, 0.3); }
      if (shieldT > 0 && dist < e.r + 1.4) { e.x -= dx / dist * 4 * dt; e.z -= dz / dist * 4 * dt; fill(e, 3 * dt); }
      let dr = Math.atan2(dx, dz) - e.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); e.g.rotation.y += dr * Math.min(1, dt * 6);
      tintEnemy(e); e.g.position.set(e.x, 0, e.z); shadowAt(e.x, e.z, e.r);
    } else { // turned white, rising to the heavens
      e.t += dt; const t = e.t;
      e.y = t * 1.6 + t * t * 1.1;
      e.g.position.set(e.x, e.y, e.z); e.g.rotation.y += dt * 1.6;
      e.g.scale.setScalar((1 + 0.06 * Math.sin(t * 9)) * (t > 3.2 ? Math.max(0.01, 1 - (t - 3.2) / 1.3) : 1));
      for (let i = 0; i < 3; i++) { const a = Math.random() * 6.283, r = 0.5 + Math.random() * 0.6; emit(e.x + Math.cos(a) * r, e.y + Math.random() * e.h, e.z + Math.sin(a) * r, Math.cos(a + 1.6) * 1.2, 1.5 + Math.random() * 2, Math.sin(a + 1.6) * 1.2, 1.2, 0.32, [C_WHITE, C_PALE, C_BLUE][i]); }
      if (e.pillar) {
        const pa = t < 0.4 ? t / 0.4 : Math.max(0, 1 - (t - 2.6) / 1.9), pm = e.pillar.mesh.material.uniforms;
        pm.uA.value = 0.42 * pa; pm.uTime.value = gameTime;
        e.pillar.ring.scale.setScalar(0.6 + t * 1.6); e.pillar.ring.material.opacity = Math.max(0, 0.5 - t * 0.2); e.pillar.ring.position.y = 0.1 + t * 0.4;
      }
      shadowAt(e.x, e.z, e.r, e.y);
      if (t > 4.5) { removeEnemy(e); enemies.splice(k, 1); continue; }
    }
    animEnemy(e, dt, gameTime);
  }
  // team light: dims while shadows press in, slowly returns when they don't
  if (playing) {
    if (shieldT > 0) shieldT = Math.max(0, shieldT - dt);
    if (touching > 0 && !god && shieldT <= 0) { teamLight -= touching * 6.5 * dt; contactTimer = 0; }
    else { contactTimer += dt; if (contactTimer > 2) teamLight = Math.min(100, teamLight + 3 * dt); }
    if (teamLight <= 0) { teamLight = 0; state = 'fading'; fadeT = 0; $('fade').style.opacity = 0.72; }
    if ((gameTime * 10 | 0) !== hudTick) { hudTick = gameTime * 10 | 0; updateHud(); updatePowerBtns(); }
  } else if (state === 'fading') {
    fadeT += dt;
    if (fadeT > 1.8 && $('over').classList.contains('hidden')) {
      best = Math.max(best, score); store.set('rg-game-best', best);
      $('finalScore').textContent = score; $('best').textContent = best; show('over', true); show('hud', false);
    }
  }
  updateWaves(dt); enemyRingMat.opacity = 0.55 + 0.25 * Math.sin(gameTime * 4); updateDoves(dt); updateBlizzards(dt); updateBridges(dt); updateSefirot(dt); updateHearts(dt); updateStars(dt); updateSeeds(dt);
  for (const d of doves) if (d.active) shadowAt(d.x, d.z, 0.3, d.y);
  updateCamera(dt);
}
let hudTick = -1, testNoAI = false, testHold = false, testSolo = false;
function basicPower(h, dt, isLead) {
  if (h.kind === 0) { // beam of light, flows automatically when a shadow is in range
    const on = !!nearestEnemy(h.x, h.z, 10.5) || (isLead && aim.active);
    h.fx.beam.visible = on; if (!on) return;
    const sg = h.surge > 0 ? 1 : 0, len = 10 + sg * 4, pulse = (1 + 0.18 * Math.sin(gameTime * 18)) * (1 + sg * 0.6);
    h.fx.beam.position.set(h.x + h.dirx * 0.45, 1.05, h.z + h.dirz * 0.45); h.fx.beam.rotation.y = Math.atan2(h.dirx, h.dirz);
    h.fx.beam.scale.set(pulse, pulse, len); h.fx.beamOuter.material.opacity = 0.35 + 0.15 * Math.sin(gameTime * 9);
    for (const e of enemies) {
      if (e.state !== 'walk') continue;
      const rx = e.x - h.x, rz = e.z - h.z, along = rx * h.dirx + rz * h.dirz;
      if (along > 0 && along < len + e.r && Math.abs(-rx * h.dirz + rz * h.dirx) < 0.75 + sg * 0.6 + e.r) fill(e, 12 * (1 + sg * 1.2) * dt);
    }
    if (Math.random() < 0.8) { const u = Math.random() * len; emit(h.x + h.dirx * u, 1.05, h.z + h.dirz * u, h.dirx * 3, 0.3, h.dirz * 3, 0.4, 0.3, Math.random() < 0.5 ? C_WHITE : C_PALE); }
  } else if (h.kind === 1) { // embrace of warmth, an always-on golden aura
    const R = h.surge > 0 ? 5 : 3.3, br = 1 + 0.08 * Math.sin(gameTime * 3);
    h.fx.disc.position.set(h.x, 0.05, h.z); h.fx.disc.scale.set(R * 2.4 * br, 1, R * 2.4 * br);
    h.fx.shell.position.set(h.x, 0.9, h.z); h.fx.shell.scale.set(R * br, R * 0.75 * br, R * br);
    for (const e of enemies) if (e.state === 'walk' && Math.hypot(e.x - h.x, e.z - h.z) < R + e.r) { fill(e, (h.surge > 0 ? 15 : 7.5) * dt); e.slow = Math.min(e.slow, 0.7); }
    if (Math.random() < 0.5) { const a = Math.random() * 6.283, r = Math.random() * R; emit(h.x + Math.cos(a) * r, 0.2, h.z + Math.sin(a) * r, 0, 0.8, 0, 0.9, 0.25, C_GOLD); }
  } else { // heart lantern waves, stronger when surrounded
    h.basicT -= dt;
    const crowd = countNear(h.x, h.z, 6);
    if (h.basicT <= 0) { h.basicT = h.surge > 0 ? 0.45 : crowd ? 1.15 : 2.6; castHeart(h, crowd + (h.surge > 0 ? 3 : 0)); }
  }
}
function menuIdle(dt) {
  gameTime += dt;
  heroes.forEach((h) => { h.dirx = 0; h.dirz = 1; animHero(h, dt, false, gameTime); shadowAt(h.x, h.z, 0.55); if (h.fx.beam) h.fx.beam.visible = false; if (h.kind === 1) basicAura(h); });
  if (Math.random() < 0.3) { const a = Math.random() * 6.283, r = Math.random() * 8; emit(camT.x + Math.cos(a) * r, 0.2, camT.z + Math.sin(a) * r, 0, 0.6, 0, 2, 0.25, [C_WHITE, C_GOLD, C_BLUE][(Math.random() * 3) | 0]); }
  auroraBoost = 0.5 + 0.3 * Math.sin(gameTime * 0.5);
  updateCamera(dt);
}
function basicAura(h) { const R = 3.3; h.fx.disc.position.set(h.x, 0.05, h.z); h.fx.disc.scale.set(R * 2.4, 1, R * 2.4); h.fx.shell.position.set(h.x, 0.9, h.z); h.fx.shell.scale.set(R, R * 0.75, R); }
function render(dt) {
  updateParticles(dt);
  auroraBoost = Math.max(0, auroraBoost - dt * 0.18);
  const fadeK = state === 'fading' ? Math.max(0.25, 1 - fadeT * 0.5) : 1;
  auroraMats.forEach((m) => { m.uniforms.uTime.value = gameTime; m.uniforms.uInt.value = (0.16 + auroraBoost * 0.85) * fadeK; });
  hemi.intensity = 1.5 * fadeK; sun.intensity = 2.0 * fadeK;
  shadowMesh.count = sCount; shadowMesh.instanceMatrix.needsUpdate = true; sCount = 0;
  renderer.render(scene, camera);
}

/* ================= boot ================= */
for (let k = 0; k < 3; k++) heroes.push(newHero(k));
heroes.forEach((h, i) => { h.x = (i - 1) * 2.2; h.z = i === 1 ? -0.5 : 1.2; });
setAngle(angleDeg); applyLang(); resize(); updateCamera(0, true);
requestAnimationFrame(frame);

/* hooks for the automated screenshot tests only */
window.__game = {
  start() { testNoAI = testHold = testSolo = spawnFrozen = false; god = false; startGame(); }, setLead, setAngle, toMenu,
  setLang(l) { lang = l; store.set('rg-lang', l); applyLang(); },
  god(v = true) { god = v; }, freeze(v = true) { spawnFrozen = v; }, noAI(v = true) { testNoAI = v; }, solo(v = true) { testSolo = v; }, hold(v = true) { testHold = v; },
  lockQuality(v = true) { qualityLocked = v; if (v) setQuality(0); },
  spawn(type, dx, dz) { const L = heroes[lead]; return !!spawnEnemy(type, L.x + dx, L.z + dz); },
  clear() { for (const e of enemies) removeEnemy(e); enemies.length = 0; },
  power(which, i = lead) { const h = heroes[i]; if (which === 'A') h.cdA = 0; else h.cdB = 0; return useSpecial(h, which); },
  aimAt(dx, dz) { const l = Math.hypot(dx, dz); aim.active = true; aim.x = dx / l; aim.z = dz / l; },
  noAim() { aim.active = false; aim.mouse = false; },
  move(v) { testMove = v; }, usePower(i) { const h = heroes[lead]; h.cdS = h.cdA = h.cdB = h.cdC = h.cdD = 0; return usePower(h, i); },
  heroes() { return heroes.map((h) => ({ x: +h.x.toFixed(2), z: +h.z.toFixed(2) })); }, joy() { return { ...joy }; },
  place(i, x, z) { heroes[i].x = x; heroes[i].z = z; },
  fillAll(f) { for (const e of enemies) if (e.state === 'walk') { e.light = e.hp * f; tintEnemy(e); } },
  ascendNearest() { const e = nearestEnemy(heroes[lead].x, heroes[lead].z, 99); if (e) ascend(e); return !!e; },
  dim() { teamLight = -1; god = false; },
  info() { const gl = renderer.getContext(); return { state, score, wave, teamLight: Math.round(teamLight), enemies: enemies.length, fps: Math.round(fpsNow), quality, lead, angle: angleDeg, lang, pr: renderer.getPixelRatio(), gl: gl.getParameter(gl.VERSION) }; }
};
