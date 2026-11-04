/* Jetpack trail for live Flyify (continuous ribbon / aurora behind the character).
   The drawing code in this file is the full trail. It is kept on purpose.
   To bring it back:
     1. Set TRAIL_ENABLED to true.
     2. Bump CACHE in fly/sw.js to the next rg-fly-vN, and the game.js?v= query in fly/index.html,
        so phones already running the app pick the trail up.
   fly-sandbox/ is a separate copy and does not read this flag. */
export const TRAIL_ENABLED = false;

export function installJetpackTrail(ctx) {
  const { THREE, scene, camera, store, $, T, player, fwd, heading, flash, powerOn } = ctx;
  if (!TRAIL_ENABLED) {
    // The help line mentions the center button. Drop that sentence only while the trail is hidden;
    // the original strings stay in game.js and come back when TRAIL_ENABLED is true.
    T.he.helpTouch = T.he.helpTouch.replace(' הכפתור העגול במרכז מחליף את השובל.', '');
    T.en.helpTouch = T.en.helpTouch.replace(' The round button in the center switches the trail.', '');
  }

  /* v17: continuous exhaust. A strip mesh through recent positions, so the trail stays solid at any speed or frame rate. */
  let exhaustStyle = store.get('rg-fly-exhaust', 'ribbon') === 'aurora' ? 'aurora' : 'ribbon';
  function paintNozzle() {
    for (const obj of [player.model, ctx.buddy]) {
      const n = obj && obj.userData.nozzle;
      if (!n) continue;
      if (exhaustStyle === 'aurora') {
        n.flame.color.setHex(0x3dffc0); n.flame.emissive.setHex(0x2ee6b0); n.core.color.setHex(0xd8fff6);
      } else {
        n.flame.color.setHex(0x4d7dff); n.flame.emissive.setHex(0x3d6bff); n.core.color.setHex(0xffe7a3);
      }
    }
  }
  function applyExhaustStyle(style, persist) {
    exhaustStyle = style === 'aurora' ? 'aurora' : 'ribbon';
    if (persist) store.set('rg-fly-exhaust', exhaustStyle);
    const b = $('exhaustToggle');
    if (b) {
      const aurora = exhaustStyle === 'aurora';
      b.classList.toggle('aurora', aurora); b.classList.toggle('ribbon', !aurora);
      b.dataset.style = exhaustStyle;
      b.setAttribute('aria-label', T[ctx.lang][aurora ? 'exhaustAurora' : 'exhaustRibbon']);
      b.hidden = !TRAIL_ENABLED;
    }
    paintNozzle();
  }
  function cycleExhaust() {
    if (!TRAIL_ENABLED) return;
    const next = exhaustStyle === 'aurora' ? 'ribbon' : 'aurora';
    applyExhaustStyle(next, true);
    flash((next === 'aurora' ? '∿ ' : '✧ ') + T[ctx.lang][next === 'aurora' ? 'exhaustAurora' : 'exhaustRibbon']);
  }
  const RN = 64, RVERTS = 5, ROFF = [-1, -0.5, 0, 0.5, 1];
  const rCenters = new Float32Array(RN * 3);
  let rHead = 0, rCount = 0, ribbonFade = 0;
  const rPos = new Float32Array(RN * RVERTS * 3), rCol = new Float32Array(RN * RVERTS * 4);
  const rIdx = new Uint16Array((RN - 1) * 24);
  for (let i = 0, p = 0; i < RN - 1; i++) {
    for (let v = 0; v < 4; v++) {
      const a = i * RVERTS + v, b = a + RVERTS;
      rIdx[p++] = a; rIdx[p++] = b; rIdx[p++] = a + 1; rIdx[p++] = b; rIdx[p++] = b + 1; rIdx[p++] = a + 1;
    }
  }
  const ribbonGeo = new THREE.BufferGeometry();
  const rPosAttr = new THREE.BufferAttribute(rPos, 3); rPosAttr.setUsage(THREE.DynamicDrawUsage);
  const rColAttr = new THREE.BufferAttribute(rCol, 4); rColAttr.setUsage(THREE.DynamicDrawUsage);
  ribbonGeo.setAttribute('position', rPosAttr); ribbonGeo.setAttribute('color', rColAttr);
  ribbonGeo.setIndex(new THREE.BufferAttribute(rIdx, 1)); ribbonGeo.setDrawRange(0, 0);
  const ribbonMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false });
  const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat);
  ribbonMesh.frustumCulled = false; ribbonMesh.visible = false; ribbonMesh.renderOrder = 3; scene.add(ribbonMesh);
  const exP = new THREE.Vector3(), rA = new THREE.Vector3(), rB = new THREE.Vector3(), rC = new THREE.Vector3();
  const rDir = new THREE.Vector3(), rSide = new THREE.Vector3(), rSpan = new THREE.Vector3(), rWave = new THREE.Vector3();
  const rRight = new THREE.Vector3(), rCamUp = new THREE.Vector3(), rCamFwd = new THREE.Vector3(), rUp = new THREE.Vector3(0, 1, 0);
  function ribbonReset(x, y, z) { rCenters[0] = x; rCenters[1] = y; rCenters[2] = z; rHead = 0; rCount = 1; }
  function clearRibbon() { ribbonFade = 0; rCount = 0; ribbonMesh.visible = false; }
  function ribbonPush(x, y, z) {
    if (rCount < 1) { ribbonReset(x, y, z); return; }
    const o = rHead * 3, px = rCenters[o], py = rCenters[o + 1], pz = rCenters[o + 2];
    const dx = x - px, dy = y - py, dz = z - pz, dist = Math.hypot(dx, dy, dz);
    if (dist > 80) { ribbonReset(x, y, z); return; } /* real teleports only; fast frames stay one continuous strip */
    let steps = dist < 0.001 ? 1 : Math.ceil(dist / 0.62);
    if (steps > RN - 1) steps = RN - 1;
    const inv = 1 / steps;
    for (let s = 1; s <= steps; s++) {
      const tt = s * inv; rHead = (rHead + 1) % RN; const j = rHead * 3;
      rCenters[j] = px + dx * tt; rCenters[j + 1] = py + dy * tt; rCenters[j + 2] = pz + dz * tt;
      if (rCount < RN) rCount++;
    }
  }
  function putVert(vi, x, y, z, r, g, b, a) {
    const p = vi * 3, c = vi * 4;
    rPos[p] = x; rPos[p + 1] = y; rPos[p + 2] = z;
    rCol[c] = r; rCol[c + 1] = g; rCol[c + 2] = b; rCol[c + 3] = a;
  }
  function updateRibbon(t, dt, playing) {
    if (!TRAIL_ENABLED) { ribbonMesh.visible = false; return; }
    const m = player.model; if (!m) return;
    m.updateMatrixWorld(true);
    const u = m.userData, sz = u.size || 1;
    if (u.exhaust) u.exhaust.getWorldPosition(exP);
    else { heading(); exP.copy(m.position).addScaledVector(fwd, -1.05 * sz); }
    const extend = playing && player.mode === 'fly';
    if (extend) ribbonPush(exP.x, exP.y, exP.z);
    if (extend) ribbonFade = Math.min(1, ribbonFade + dt * 5);
    else if (ctx.state !== 'pause') ribbonFade = Math.max(0, ribbonFade - dt * 1.7);
    if (!extend && ctx.state !== 'pause' && ribbonFade <= 0) { ribbonReset(exP.x, exP.y, exP.z); ribbonMesh.visible = false; return; }
    if (rCount < 2 || ribbonFade < 0.03) { ribbonMesh.visible = false; return; }
    const oldest = ((rHead - (rCount - 1)) % RN + RN) % RN;
    const at = (k) => (oldest + (k < 0 ? 0 : k >= rCount ? rCount - 1 : k)) % RN;
    let span = 0;
    for (let k = 1; k < rCount; k++) {
      const o0 = at(k - 1) * 3, o1 = at(k) * 3;
      span += Math.hypot(rCenters[o1] - rCenters[o0], rCenters[o1 + 1] - rCenters[o0 + 1], rCenters[o1 + 2] - rCenters[o0 + 2]);
    }
    if (span < 0.35) { ribbonMesh.visible = false; return; }
    camera.updateMatrixWorld(true);
    const e = camera.matrixWorld.elements;
    rRight.set(e[0], e[1], e[2]); rCamUp.set(e[4], e[5], e[6]); rCamFwd.set(-e[8], -e[9], -e[10]);
    const aurora = exhaustStyle === 'aurora';
    const punch = (powerOn('boost') || powerOn('double')) ? 1.35 : 1;
    const edge = aurora ? [0.72, 0.88, 0.8, 0.88, 0.62] : [0.72, 0.95, 0.4, 0.98, 0.8];
    let psx = 0, psy = 1, psz = 0, have = false;
    for (let k = 0; k < rCount; k++) {
      const o = at(k) * 3, op = at(k - 1) * 3, on = at(k + 1) * 3;
      rB.set(rCenters[o], rCenters[o + 1], rCenters[o + 2]);
      rA.set(rCenters[op], rCenters[op + 1], rCenters[op + 2]);
      rC.set(rCenters[on], rCenters[on + 1], rCenters[on + 2]);
      rDir.subVectors(rC, rA);
      if (rDir.lengthSq() < 1e-8) rDir.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); else rDir.normalize();
      const along = k / (rCount - 1);
      const fade = Math.pow(along, 0.6) * ribbonFade;
      let axis = rSide;
      if (aurora) {
        const envAmp = Math.sin(along * Math.PI);
        rWave.copy(rRight); rWave.y = 0;
        if (rWave.lengthSq() < 1e-4) rWave.crossVectors(rDir, rUp);
        if (rWave.lengthSq() > 1e-8) rWave.normalize();
        const sway = Math.sin(t * 1.05 + k * 0.62) * 0.9 * sz * envAmp;
        const lift = Math.sin(t * 1.35 + k * 0.75) * 0.55 * sz * envAmp;
        rB.x += rWave.x * sway; rB.z += rWave.z * sway; rB.y += lift * 0.45;
        rSpan.copy(rUp).multiplyScalar(0.92 + 0.28 * Math.sin(t * 1.4 + k * 0.8)).addScaledVector(rRight, 0.28);
        const d = rSpan.dot(rDir); rSpan.addScaledVector(rDir, -d);
        if (rSpan.lengthSq() < 1e-6) rSpan.copy(rUp); else rSpan.normalize();
        axis = rSpan;
      } else {
        rSide.crossVectors(rDir, rCamFwd);
        if (rSide.lengthSq() < 1e-6) rSide.copy(rCamUp); else rSide.normalize();
      }
      if (have && axis.x * psx + axis.y * psy + axis.z * psz < 0) axis.negate();
      psx = axis.x; psy = axis.y; psz = axis.z; have = true;
      const base = (aurora ? 0.55 + 1.15 * Math.sin(along * Math.PI) : 0.16 + 0.3 * along) * sz * punch;
      const shift = 0.5 + 0.5 * Math.sin(t * 0.55 + k * 0.2);
      const cols = aurora ? [
        [0.02, 1, 0.22],
        [0.04, 1, 0.4 + 0.1 * shift],
        [0.06, 0.95, 0.72],
        [0.05, 0.72, 1],
        [0.03, 0.42, 1]
      ] : [
        [0.04, 0.18, 1],
        [0.08, 0.32, 1],
        [0.55, 0.7, 0.9],
        [1, 0.92, 0.12],
        [1, 0.78, 0.02]
      ];
      const aScale = Math.min(1, (aurora ? 0.58 : 0.82) * (punch > 1 ? 1.12 : 1));
      for (let v = 0; v < 5; v++) {
        const w = ROFF[v] * base, col = cols[v];
        putVert(k * 5 + v, rB.x + axis.x * w, rB.y + axis.y * w, rB.z + axis.z * w, col[0], col[1], col[2], edge[v] * fade * aScale);
      }
    }
    ribbonGeo.setDrawRange(0, (rCount - 1) * 24);
    rPosAttr.needsUpdate = true; rColAttr.needsUpdate = true; ribbonMesh.visible = true;
  }

  (function () {
    const b = $('exhaustToggle'); if (!b) return;
    b.hidden = !TRAIL_ENABLED;
    let id = null, x = 0, y = 0;
    b.addEventListener('pointerdown', (e) => { if (!TRAIL_ENABLED) return; id = e.pointerId; x = e.clientX; y = e.clientY; e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch (_) {} });
    b.addEventListener('pointerup', (e) => { if (!TRAIL_ENABLED || e.pointerId !== id) return; id = null; e.stopPropagation(); if (Math.hypot(e.clientX - x, e.clientY - y) > 10) return; cycleExhaust(); });
  })();

  return {
    paintNozzle, applyExhaustStyle, clearRibbon, updateRibbon,
    get exhaust() { return exhaustStyle; },
    ribbon() { return { on: ribbonMesh.visible, n: rCount, fade: +ribbonFade.toFixed(2) }; },
  };
}
