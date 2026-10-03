import * as THREE from '../vendor/three.bundle.min.js';
import { MAP, FORESTS, REGION_LABELS, catmull, pointInPoly } from './geo.js';
import { PLACES, KINDS } from './places.js';
import { JOURNEYS, MODE_LABEL } from './journeys.js';

// ---------------------------------------------------------------- setup
const $ = (s) => document.querySelector(s);
const SC = 0.1;                                   // world units per map unit
const COARSE = matchMedia('(pointer: coarse)').matches;
const SMALL = Math.min(innerWidth, innerHeight) < 720;
const LOW = COARSE || SMALL;
const PLACE = Object.fromEntries(PLACES.map((p) => [p.id, p]));
const wx = (x) => (x - MAP.W / 2) * SC, wz = (y) => (y - MAP.H / 2) * SC;
const toMapX = (X) => X / SC + MAP.W / 2, toMapY = (Z) => Z / SC + MAP.H / 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const hex3 = (h) => new THREE.Vector3(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);

let HF = null;
function hAt(x, y) {
  const { GW, GH, S, data } = HF;
  const fx = clamp(x / S, 0, GW - 1.001), fy = clamp(y / S, 0, GH - 1.001);
  const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j, k = j * GW + i;
  return (data[k] * (1 - tx) + data[k + 1] * tx) * (1 - ty) + (data[k + GW] * (1 - tx) + data[k + GW + 1] * tx) * ty;
}
const groundAt = (x, y) => Math.max(0, hAt(x, y));

async function loadHeight() {
  const meta = await (await fetch('assets/height.json')).json();
  const blob = await (await fetch('assets/height.png')).blob();
  let src;
  try { src = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }); }
  catch (e) {
    src = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(blob); });
  }
  const cv = document.createElement('canvas'); cv.width = meta.GW; cv.height = meta.GH;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(src, 0, 0);
  const d = ctx.getImageData(0, 0, meta.GW, meta.GH).data;
  const data = new Float32Array(meta.GW * meta.GH);
  for (let k = 0; k < data.length; k++) data[k] = (((d[k * 4] << 8) | d[k * 4 + 1]) / 65535) * (meta.max - meta.min) + meta.min;
  HF = { ...meta, data };
}

const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !(LOW && devicePixelRatio >= 2), alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const FOG = new THREE.Color('#2a2630');
scene.fog = new THREE.Fog(FOG, 100, 400);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.5, 2000);

const hemi = new THREE.HemisphereLight('#fff6e6', '#6b5844', 1.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff0d4', 2.3);
sun.position.set(-60, 70, -40);
scene.add(sun);

const controls = new THREE.MapControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.085;
controls.screenSpacePanning = false;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = 1.22;
controls.minDistance = 4;
controls.zoomToCursor = true;
controls.rotateSpeed = 0.55;
controls.zoomSpeed = 1.15;
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };

// ---------------------------------------------------------------- terrain
function buildTerrain(tex) {
  const stride = LOW ? 2 : 1;
  const segX = Math.floor((HF.GW - 1) / stride), segY = Math.floor((HF.GH - 1) / stride);
  const geo = new THREE.PlaneGeometry(MAP.W * SC, MAP.H * SC, segX, segY);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, hAt(toMapX(pos.getX(i)), toMapY(pos.getZ(i))));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  // sea surface
  const wgeo = new THREE.PlaneGeometry(MAP.W * SC, MAP.H * SC, 1, 1); wgeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(wgeo, new THREE.MeshPhongMaterial({ color: '#7fa6ac', specular: '#4a5a60', shininess: 40, transparent: true, opacity: 0.42, depthWrite: false }));
  water.position.y = 0.0; water.renderOrder = 2;
  scene.add(water);

  // diorama skirt around the edges
  const ring = [];
  const n = 240;
  for (let i = 0; i < n; i++) ring.push([MAP.W * i / n, 0]);
  for (let i = 0; i < n; i++) ring.push([MAP.W, MAP.H * i / n]);
  for (let i = 0; i < n; i++) ring.push([MAP.W * (1 - i / n), MAP.H]);
  for (let i = 0; i <= n; i++) ring.push([0, MAP.H * (1 - i / n)]);
  const sp = [], si = [], sc = [];
  const top = new THREE.Color('#6d5536'), bot = new THREE.Color('#1d1712');
  ring.forEach(([x, y], k) => {
    const X = wx(clamp(x, 0, MAP.W)), Z = wz(clamp(y, 0, MAP.H));
    sp.push(X, groundAt(x, y), Z, X, -2.6, Z);
    sc.push(top.r, top.g, top.b, bot.r, bot.g, bot.b);
    if (k > 0) { const a = (k - 1) * 2; si.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
  sg.setIndex(si);
  scene.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true })));

  // soft shadow under the map
  const sh = document.createElement('canvas'); sh.width = sh.height = 128;
  const g = sh.getContext('2d'); const gr = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(MAP.W * SC * 1.6, MAP.H * SC * 1.6).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false, fog: false }));
  shadow.position.y = -3.2; scene.add(shadow);
  return mesh;
}

// ---------------------------------------------------------------- trees
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function polyArea(p) { let a = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) a += (p[j][0] + p[i][0]) * (p[j][1] - p[i][1]); return Math.abs(a / 2); }
function buildTrees() {
  const total = LOW ? 3200 : 7500;
  const weights = FORESTS.map((f) => polyArea(f.pts) * f.density);
  const wsum = weights.reduce((a, b) => a + b, 0);
  const cone = new THREE.ConeGeometry(0.1, 0.36, 5); cone.translate(0, 0.18, 0);
  const blob = new THREE.IcosahedronGeometry(0.13, 0); blob.scale(1, 1.25, 1); blob.translate(0, 0.2, 0);
  const coneM = new THREE.InstancedMesh(cone, new THREE.MeshLambertMaterial({ flatShading: true }), total);
  const blobM = new THREE.InstancedMesh(blob, new THREE.MeshLambertMaterial({ flatShading: true }), total);
  const tones = {
    dark: ['#24402a', '#2f4d31', '#1d3324'], deep: ['#2f5530', '#3c6537', '#29472b'],
    gold: ['#c9a93a', '#d9bf4f', '#a9a23c'], green: ['#4f7a3c', '#5f8a45', '#46703a']
  };
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  let nc = 0, nb = 0;
  const r = rng(42);
  FORESTS.forEach((f, fi) => {
    const want = Math.round(total * weights[fi] / wsum);
    let xs = 1e9, ys = 1e9, xe = -1e9, ye = -1e9;
    for (const [x, y] of f.pts) { xs = Math.min(xs, x); ys = Math.min(ys, y); xe = Math.max(xe, x); ye = Math.max(ye, y); }
    let got = 0, tries = 0;
    const isBlob = f.tone === 'gold' || f.tone === 'green';
    while (got < want && tries < want * 6) {
      tries++;
      const x = xs + r() * (xe - xs), y = ys + r() * (ye - ys);
      if (!pointInPoly(x, y, f.pts)) continue;
      const h = hAt(x, y);
      if (h < 0.06 || h > 2.4) continue;
      const k = 0.7 + r() * 0.7;
      s.set(k, k * (0.85 + r() * 0.4), k);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * 6.28);
      p.set(wx(x), h - 0.02, wz(y));
      m.compose(p, q, s);
      const T = tones[f.tone];
      c.set(T[(r() * T.length) | 0]);
      if (isBlob) { blobM.setMatrixAt(nb, m); blobM.setColorAt(nb, c); nb++; }
      else { coneM.setMatrixAt(nc, m); coneM.setColorAt(nc, c); nc++; }
      got++;
    }
  });
  coneM.count = nc; blobM.count = nb;
  coneM.instanceMatrix.needsUpdate = blobM.instanceMatrix.needsUpdate = true;
  scene.add(coneM, blobM);
}

// ---------------------------------------------------------------- landmarks
function glowTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const GLOW = glowTexture();
const glows = [];
function addGlow(x, y, lift, color, size, pulse = 0) {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sp.position.set(wx(x), groundAt(x, y) + lift, wz(y)); sp.scale.setScalar(size); sp.renderOrder = 5;
  scene.add(sp); glows.push({ sp, size, pulse }); return sp;
}
function buildLandmarks() {
  const dark = new THREE.MeshLambertMaterial({ color: '#1e1b1f', flatShading: true });
  const white = new THREE.MeshLambertMaterial({ color: '#f3efe6', flatShading: true });
  const at = (id, obj, dy = 0) => { const P = PLACE[id]; obj.position.set(wx(P.x), groundAt(P.x, P.y) + dy, wz(P.y)); scene.add(obj); return obj; };
  // Orthanc
  const orth = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.9, 6).translate(0, 0.45, 0), dark); at('isengard', orth);
  const wall = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 4, 24).rotateX(Math.PI / 2), dark); at('isengard', wall, 0.03);
  // Barad-dûr
  const bd = new THREE.Group();
  bd.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.32, 1.5, 6).translate(0, 0.75, 0), dark));
  bd.add(new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6).translate(0, 1.65, 0), dark));
  at('baraddur', bd);
  addGlow(PLACE.baraddur.x, PLACE.baraddur.y, 1.95, '#ff6a1a', 1.1, 1);
  // Mount Doom fire
  addGlow(955, 718, hAt(955, 718) > 0 ? 0.25 : 0.25, '#ff4a12', 2.2, 2);
  // Minas Tirith tiers
  const mt = new THREE.Group();
  for (let i = 0; i < 5; i++) mt.add(new THREE.Mesh(new THREE.CylinderGeometry(0.34 - i * 0.06, 0.36 - i * 0.06, 0.1, 14).translate(0, 0.05 + i * 0.1, 0), white));
  mt.add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.5, 6).translate(0, 0.72, 0), white));
  at('minastirith', mt, -0.05);
  // Minas Morgul eerie glow
  addGlow(PLACE.minasmorgul.x, PLACE.minasmorgul.y, 0.35, '#7dffb0', 0.8, 3);
  // Argonath pillars
  [[-0.18, 0], [0.18, 0]].forEach(([dx]) => {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.07).translate(0, 0.21, 0), new THREE.MeshLambertMaterial({ color: '#8f8a80' }));
    pil.position.set(wx(770) + dx, 0.05, wz(591)); scene.add(pil);
  });
  // Grey Havens light, Rivendell & Lórien soft lights
  addGlow(PLACE.greyhavens.x, PLACE.greyhavens.y, 0.3, '#cfe9ff', 0.6, 0);
  addGlow(PLACE.lorien.x, PLACE.lorien.y, 0.6, '#ffe7a0', 1.2, 0);
}

// ---------------------------------------------------------------- journeys
const PATH_VS = `
attribute vec3 side; attribute float along; attribute float across;
uniform float uWidth; varying float vAlong; varying float vAcross;
void main() {
  vec3 p = position + side * uWidth;
  vAlong = along; vAcross = across;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const PATH_FS = `
precision highp float;
uniform vec3 uColor; uniform vec3 uHalo; uniform float uTime; uniform float uOpacity; uniform float uDash; uniform float uPpu;
varying float vAlong; varying float vAcross;
void main() {
  float a = abs(vAcross);
  float core = 1.0 - smoothstep(0.2, 0.42, a);
  float halo = 1.0 - smoothstep(0.32, 1.0, a);
  float px = vAlong * uPpu;               // distance in screen pixels (approx.)
  if (uDash > 0.5) { float d = fract(px / 11.0); if (d > 0.58) { core = 0.0; halo *= 0.25; } }
  float flow = fract(px / 140.0 - uTime * 0.45);
  float pulse = smoothstep(0.0, 0.05, flow) * (1.0 - smoothstep(0.05, 0.32, flow));
  vec3 col = mix(uHalo, uColor, core);
  col = mix(col, vec3(1.0, 0.98, 0.9), pulse * core * 0.55);
  float alpha = max(core, halo * halo * 0.75) * uOpacity;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}`;

const paths = [];
function resolvePts(list) { return list.map((p) => (typeof p === 'string' ? [PLACE[p].x, PLACE[p].y] : p)); }
function offsetLine(P, off) {
  const out = [], nrm = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 2)], b = P[Math.min(P.length - 1, i + 2)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    const nx = -ty, ny = tx;
    out.push([P[i][0] + nx * off, P[i][1] + ny * off]); nrm.push([nx, ny]);
  }
  return { pts: out, nrm };
}
function buildJourneys() {
  JOURNEYS.forEach((J) => {
    const group = new THREE.Group();
    const uniforms = {
      uColor: { value: hex3(J.color) }, uHalo: { value: hex3(J.halo) }, uTime: { value: 0 }, uOpacity: { value: 1 },
      uDash: { value: 0 }, uWidth: { value: 0.3 }, uPpu: { value: 8 }
    };
    const samples = []; // world positions for picking & playback
    const modes = [], mapPts = [];
    const stops = [];
    let total = 0;
    const mats = [];
    J.segments.forEach((seg) => {
      const raw = resolvePts(seg.pts).filter((p, i, a) => i === 0 || Math.hypot(p[0] - a[i - 1][0], p[1] - a[i - 1][1]) > 0.5);
      const sm = catmull(raw, 1.2);
      const { pts, nrm } = offsetLine(sm, J.lane * 1.25);
      const N = pts.length;
      const pos = [], side = [], along = [], across = [], idx = [];
      let dist = 0;
      const segLen = (() => { let L = 0; for (let i = 1; i < N; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; })();
      let acc = 0;
      for (let i = 0; i < N; i++) {
        const [x, y] = pts[i], [nx, ny] = nrm[i];
        if (i > 0) { const d = Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]); acc += d; dist += d * SC; }
        let h = Math.max(groundAt(x, y), groundAt(x + nx * 2, y + ny * 2), groundAt(x - nx * 2, y - ny * 2)) + 0.12;
        if (seg.mode === 'flight') h += Math.sin(Math.PI * acc / segLen) * (1.5 + segLen * 0.012);
        if (seg.mode === 'boat' || seg.mode === 'funeral') h = Math.max(groundAt(x, y), 0) + 0.1;
        const X = wx(x), Z = wz(y);
        for (const s of [-1, 1]) { pos.push(X, h, Z); side.push(nx * s, 0, ny * s); along.push(total + dist); across.push(s); }
        if (i > 0) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        samples.push(new THREE.Vector3(X, h, Z));
        modes.push(seg.mode); mapPts.push([x, y, groundAt(x, y)]);
      }
      // named stops along this segment
      seg.pts.forEach((p) => {
        if (typeof p !== 'string') return;
        let best = 0, bd = 1e9; const P = PLACE[p];
        const base = samples.length - N;
        for (let i = 0; i < N; i++) { const d = Math.hypot(pts[i][0] - P.x, pts[i][1] - P.y); if (d < bd) { bd = d; best = i; } }
        if (!stops.length || stops[stops.length - 1].id !== p) stops.push({ id: p, i: base + best });
      });
      total += dist;
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('side', new THREE.Float32BufferAttribute(side, 3));
      geo.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
      geo.setAttribute('across', new THREE.Float32BufferAttribute(across, 1));
      geo.setIndex(idx);
      geo.computeBoundingSphere();
      geo.boundingSphere.radius += 3;
      const dash = seg.mode === 'walk' || seg.mode === 'boat' ? 0 : 1;
      const u = { ...uniforms, uDash: { value: dash } };
      const main = new THREE.ShaderMaterial({ vertexShader: PATH_VS, fragmentShader: PATH_FS, uniforms: u, transparent: true, depthWrite: false });
      const xu = { ...u, uOpacity: { value: 0.25 } };
      const xray = new THREE.ShaderMaterial({ vertexShader: PATH_VS, fragmentShader: PATH_FS, uniforms: xu, transparent: true, depthWrite: false, depthTest: false });
      const m1 = new THREE.Mesh(geo, xray); m1.renderOrder = 8; m1.frustumCulled = false;
      const m2 = new THREE.Mesh(geo, main); m2.renderOrder = 9; m2.frustumCulled = false;
      group.add(m1, m2);
      mats.push({ main: u, xray: xu });
    });
    scene.add(group);
    paths.push({ J, group, uniforms, mats, samples, modes, mapPts, stops, length: total, visible: true });
  });
}

// ---------------------------------------------------------------- labels
const labelLayer = $('#labels');
const markers = PLACES.map((p) => {
  const el = document.createElement('div');
  el.className = `mk t${p.tier}`;
  el.innerHTML = `<span class="dot k-${p.kind}"></span><span class="lb">${p.name.replace('&', '&amp;')}</span>`;
  labelLayer.appendChild(el);
  return { p, el, lb: el.lastChild, w: 0, h: 0, sx: -1e4, sy: -1e4, vis: false, lab: false, left: false };
});
const regionEls = REGION_LABELS.map((r) => {
  const el = document.createElement('div');
  el.className = `rl ${r.k}`; el.textContent = r.t; labelLayer.appendChild(el);
  return { r, el, w: 0, h: 0 };
});
function measureLabels() {
  markers.forEach((m) => { m.measured = false; });
  regionEls.forEach((m) => { m.measured = false; });
}
function ensureMeasured(m, el) {
  if (m.measured) return;
  const off = el.classList.contains('off');
  if (off) el.classList.remove('off');
  const t = el === m.el && m.lb ? m.lb : el;
  m.w = t.offsetWidth; m.h = t.offsetHeight;
  if (off) el.classList.add('off');
  if (m.w > 0) m.measured = true;
}
document.fonts?.addEventListener?.('loadingdone', () => measureLabels());
const RANK = ['minastirith', 'mountdoom', 'rivendell', 'bagend', 'isengard', 'moria', 'lorien', 'edoras', 'blackgate', 'erebor', 'helmsdeep', 'baraddur', 'bree', 'greyhavens', 'mirkwood', 'dolguldur', 'fangorn'];
const rankOf = (p) => { const i = RANK.indexOf(p.id); return i < 0 ? 99 : i; };
const tmpV = new THREE.Vector3();
let selectedPlace = null;
function ppuAt(dist) { return (innerHeight / 2) / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist); }
function project(X, Y, Z) {
  tmpV.set(X, Y, Z).project(camera);
  return [(tmpV.x * 0.5 + 0.5) * innerWidth, (-tmpV.y * 0.5 + 0.5) * innerHeight, tmpV.z];
}
function updateLabels() {
  const W = innerWidth, H = innerHeight;
  const rects = [];
  const hit = (a) => { for (const b of rects) if (a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1]) return true; return false; };
  // UI keep-out zones
  const keep = [];
  const t = $('#title').getBoundingClientRect(); keep.push([t.left - 4, t.top - 4, t.right + 10, t.bottom + 4]);
  const tl = $('#tools').getBoundingClientRect(); keep.push([tl.left - 6, tl.top - 6, tl.right + 6, tl.bottom + 6]);
  rects.push(...keep);
  const items = [];
  for (const m of markers) {
    const P = m.p;
    const X = wx(P.x), Z = wz(P.y), Y = groundAt(P.x, P.y) + 0.08;
    const [sx, sy, sz] = project(X, Y, Z);
    const dist = camera.position.distanceTo(tmpV.set(X, Y, Z));
    const ppu = ppuAt(dist);
    const tierOK = P.tier === 1 || (P.tier === 2 && ppu > 6.5) || (P.tier === 3 && ppu > 13) || P === selectedPlace;
    m.vis = sz < 1 && tierOK && sx > -40 && sx < W + 40 && sy > -20 && sy < H + 20;
    m.sx = sx; m.sy = sy; m.ppu = ppu;
    if (m.vis) { ensureMeasured(m, m.el); items.push(m); }
  }
  items.sort((a, b) => (b.p === selectedPlace) - (a.p === selectedPlace) || a.p.tier - b.p.tier || rankOf(a.p) - rankOf(b.p) || a.sy - b.sy);
  // dots first, so labels avoid covering other dots
  for (const m of items) if (m.p.tier === 1 || m.p === selectedPlace) rects.push([m.sx - 6, m.sy - 6, m.sx + 6, m.sy + 6]);
  const placeLabel = (m) => {
    const s = clamp(0.84 + m.ppu * 0.012, 0.86, 1.22);
    m.s = s;
    const w = m.w * s, h = m.h * s;
    const R = [m.sx + 8, m.sy - h / 2, m.sx + 10 + w, m.sy + h / 2];
    const L = [m.sx - 10 - w, m.sy - h / 2, m.sx - 8, m.sy + h / 2];
    const own = [m.sx - 6, m.sy - 6, m.sx + 6, m.sy + 6];
    const idx = rects.findIndex((r) => r[0] === own[0] && r[1] === own[1] && r[2] === own[2]);
    const saved = idx >= 0 ? rects.splice(idx, 1)[0] : null;
    let ok = false;
    if (!hit(R) && R[0] > 2 && R[2] < W - 2) { rects.push(R); m.left = false; ok = true; }
    else if (!hit(L) && L[0] > 2 && L[2] < W - 2) { rects.push(L); m.left = true; ok = true; }
    rects.push(saved || own);
    m.lab = ok;
  };
  const t12 = items.filter((m) => m.p.tier <= 2 || m.p === selectedPlace);
  t12.forEach(placeLabel);
  // region labels
  const camD = camera.position.distanceTo(controls.target);
  const ppuC = ppuAt(camD);
  for (const g of regionEls) {
    const r = g.r;
    const X = wx(r.x), Z = wz(r.y), Y = Math.max(0, groundAt(r.x, r.y)) + 0.3;
    const [sx, sy, sz] = project(X, Y, Z);
    const big = r.k === 'realm' || r.k === 'water';
    const show = sz < 1 && (big ? ppuC < 16 : (ppuC > 2.6 && ppuC < 40));
    let on = false;
    if (show) {
      ensureMeasured(g, g.el);
      const s = clamp(ppuC / 7, 0.72, 1.25);
      const w = g.w * s, h = g.h * s;
      const R = [sx - w / 2, sy - h / 2, sx + w / 2, sy + h / 2];
      if (!hit(R) && R[0] > 0 && R[2] < W) { rects.push(R); on = true; }
      g.el.style.transform = `translate3d(${sx - g.w / 2}px, ${sy - g.h / 2}px, 0) scale(${s})`;
    }
    g.el.classList.toggle('off', !on);
  }
  items.filter((m) => m.p.tier === 3 && m.p !== selectedPlace).forEach(placeLabel);
  for (const m of markers) {
    if (!m.vis) { if (!m.el.classList.contains('off')) m.el.classList.add('off'); continue; }
    m.el.classList.remove('off');
    m.el.style.transform = `translate3d(${m.sx.toFixed(1)}px, ${m.sy.toFixed(1)}px, 0)`;
    m.el.style.setProperty('--s', (m.s || 1).toFixed(3));
    m.el.classList.toggle('nolabel', !m.lab);
    m.el.classList.toggle('left', m.left);
    m.el.classList.toggle('sel', m.p === selectedPlace);
  }
}

// ---------------------------------------------------------------- camera helpers
let DEFAULT = null;
function computeDefault() {
  const aspect = innerWidth / innerHeight;
  camera.fov = aspect < 0.8 ? 50 : 40;
  camera.aspect = aspect; camera.updateProjectionMatrix();
  const vf = THREE.MathUtils.degToRad(camera.fov);
  const hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
  const polar = aspect < 0.8 ? 0.58 : 0.72;
  const fitW = aspect < 0.8 ? 60 : 122;
  const dW = (fitW / 2) / Math.tan(hf / 2);
  const dH = (MAP.H * SC * 0.5 * Math.cos(polar) + 6) / Math.tan(vf / 2);
  const dist = Math.max(dW, aspect < 0.8 ? 0 : dH);
  controls.maxDistance = dist * 1.7;
  const target = new THREE.Vector3(aspect < 0.8 ? 6 : 2, 0, aspect < 0.8 ? -9 : 1);
  DEFAULT = { target, dist, polar, az: 0 };
}
function sphericalOf() {
  const off = camera.position.clone().sub(controls.target);
  const s = new THREE.Spherical().setFromVector3(off);
  return s;
}
let tween = null;
function flyTo({ target, dist, polar, az }, dur = 1.6) {
  const s = sphericalOf();
  let azFrom = s.theta, azTo = az ?? s.theta;
  while (azTo - azFrom > Math.PI) azTo -= Math.PI * 2;
  while (azTo - azFrom < -Math.PI) azTo += Math.PI * 2;
  tween = { t: 0, dur, from: { target: controls.target.clone(), dist: s.radius, polar: s.phi, az: azFrom },
    to: { target: target.clone(), dist: dist ?? s.radius, polar: polar ?? s.phi, az: azTo } };
}
function applyTween(dt) {
  if (!tween) return;
  tween.t = Math.min(1, tween.t + dt / tween.dur);
  const k = ease(tween.t), A = tween.from, B = tween.to;
  controls.target.lerpVectors(A.target, B.target, k);
  // zoom out a little in the middle of long flights
  const travel = A.target.distanceTo(B.target);
  const bump = Math.sin(Math.PI * k) * Math.min(travel * 0.35, 40);
  const r = A.dist + (B.dist - A.dist) * k + bump;
  const s = new THREE.Spherical(r, A.polar + (B.polar - A.polar) * k, A.az + (B.az - A.az) * k);
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));
  if (tween.t >= 1) tween = null;
}
function resetView() { stopPlay(); flyTo(DEFAULT, 1.8); }

// view offset so the focus stays visible beside / above the card
let viewOff = 0, viewOffTarget = 0;
function cardOffset() {
  const card = $('#card');
  if (card.hidden) return 0;
  return SMALL || innerWidth < 720 ? Math.min(card.offsetHeight, innerHeight * 0.56) : card.offsetWidth + 16;
}
function applyViewOffset() {
  viewOff += (viewOffTarget - viewOff) * 0.12;
  const W = innerWidth, H = innerHeight;
  if (viewOff < 0.5) { if (camera.view && camera.view.enabled) camera.clearViewOffset(); return; }
  if (innerWidth < 720) camera.setViewOffset(W, H + viewOff, 0, viewOff, W, H);
  else camera.setViewOffset(W + viewOff, H, viewOff, 0, W, H);
}

// ---------------------------------------------------------------- UI: cards
const card = $('#card'), cardBody = $('#card-body');
const ORN = '<svg class="orn" viewBox="0 0 300 14" preserveAspectRatio="none"><path d="M0 7h128M172 7h128" stroke="#8a6a32" stroke-width="1"/><path d="M150 1l7 6-7 6-7-6z" fill="none" stroke="#8a6a32"/><circle cx="135" cy="7" r="1.6" fill="#8a6a32"/><circle cx="165" cy="7" r="1.6" fill="#8a6a32"/></svg>';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
function journeysAt(id) { return paths.filter((P) => P.J.segments.some((s) => s.pts.includes(id))); }
function openCard(html) {
  cardBody.innerHTML = html; card.hidden = false; card.scrollTop = 0;
  requestAnimationFrame(() => { viewOffTarget = cardOffset(); });
}
function closeCard() {
  card.hidden = true; viewOffTarget = 0; selectedPlace = null; selectPath(null);
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
}
function openPlace(p, fly = true) {
  stopPlay(false);
  selectedPlace = p; selectPath(null, true);
  const js = journeysAt(p.id);
  openCard(`
    <p class="kicker">${esc(KINDS[p.kind] || '')} · ${esc(p.region)}</p>
    <h3 id="card-title">${esc(p.name)}</h3>
    ${p.alt ? `<p class="alt">${esc(p.alt)}</p>` : ''}
    ${ORN}
    <p class="what">${esc(p.what)}</p>
    <p class="hist">${esc(p.history)}</p>
    ${js.length ? `<p class="meta">Journeys through here</p><div class="chips">${js.map((P) => `<button class="chip" data-j="${P.J.id}"><i style="background:${P.J.color};box-shadow:0 0 0 1px ${P.J.halo}"></i>${esc(P.J.name)}</button>`).join('')}</div>` : ''}
  `);
  history.replaceState(null, '', '#' + p.id);
  if (fly) {
    const s = sphericalOf();
    const d = Math.min(s.radius, p.tier === 1 ? 38 : 30);
    flyTo({ target: new THREE.Vector3(wx(p.x), 0, wz(p.y)), dist: d, polar: Math.min(s.phi, 0.95) });
  }
}
let selected = null;
function selectPath(P, keepCard) {
  selected = P;
  for (const Q of paths) {
    const on = !P || Q === P;
    Q.mats.forEach((m) => { m.main.uOpacity.value = on ? 1 : 0.32; m.xray.uOpacity.value = on ? (P ? 0.45 : 0.25) : 0.08; });
    Q.sel = Q === P;
    if (Q === P && !Q.visible) setPathVisible(Q, true);
  }
  document.querySelectorAll('.lg-name').forEach((b) => b.classList.toggle('active', !!P && b.dataset.j === P.J.id));
}
function openJourney(P, fly = true) {
  stopPlay(false);
  selectedPlace = null;
  selectPath(P);
  const J = P.J;
  const stops = P.stops.map((s) => s.id).filter((id, i, a) => a.indexOf(id) === i);
  const modes = [...new Set(J.segments.map((s) => s.mode))].filter((m) => m !== 'walk' && m !== 'boat').map((m) => MODE_LABEL[m]);
  openCard(`
    <p class="kicker">Journey</p>
    <h3 id="card-title">${esc(J.name)}</h3>
    <p class="alt">${esc(J.sub)}</p>
    <div class="colorbar" style="background:linear-gradient(90deg, ${J.halo}, ${J.color} 30%, ${J.color} 70%, ${J.halo})"></div>
    <button class="play" id="play"><svg viewBox="0 0 10 10"><path d="M2 1l7 4-7 4z" fill="currentColor"/></svg><span>Play journey</span><span class="bar"><b></b></span></button>
    <p class="hist">${esc(J.summary)}</p>
    ${modes.length ? `<p class="what" style="font-size:15px">Dashed stretches: ${esc(modes.join(', '))}.</p>` : ''}
    <p class="meta">Stops along the way</p>
    <div class="chips">${stops.map((id) => `<button class="chip" data-p="${id}">${esc(PLACE[id].name)}</button>`).join('')}</div>
  `);
  history.replaceState(null, '', '#journey-' + J.id);
  if (fly) fitPath(P);
}
function fitPath(P) {
  const box = new THREE.Box3().setFromPoints(P.samples);
  const c = box.getCenter(new THREE.Vector3()); c.y = 0;
  const size = box.getSize(new THREE.Vector3());
  const off = cardOffset(), W = innerWidth, H = innerHeight;
  const hx = size.x * 0.5 + 3, hz = size.z * 0.5 * 0.85 + 3; // half extents (z foreshortened by the tilt)
  // with setViewOffset the frustum spans the card too, so only part of it is visible
  const need = W < 720 ? Math.max(hx * (H + off) / W, hz * (H + off) / Math.max(H - off, 120)) : Math.max(hx * H / Math.max(W - off, 200), hz);
  const d = clamp((need / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.08, 18, controls.maxDistance);
  flyTo({ target: c, dist: d, polar: 0.62 });
}
card.addEventListener('click', (e) => {
  const j = e.target.closest('[data-j]'), p = e.target.closest('[data-p]');
  if (j) openJourney(paths.find((P) => P.J.id === j.dataset.j));
  else if (p) openPlace(PLACE[p.dataset.p]);
  else if (e.target.closest('#play')) togglePlay();
});
$('#card-close').addEventListener('click', () => { stopPlay(); closeCard(); });

// ---------------------------------------------------------------- UI: legend
const legend = $('#legend'), legendBtn = $('#btn-journeys');
const EYE = '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>';
function setPathVisible(P, v) {
  P.visible = v; P.group.visible = v;
  const b = document.querySelector(`.eye[data-j="${P.J.id}"]`); if (b) b.setAttribute('aria-pressed', String(v));
}
function buildLegend() {
  $('#legend-list').innerHTML = paths.map((P) => `
    <li><button class="lg-name" data-j="${P.J.id}"><span class="swatch" style="color:${P.J.color}"></span><span>${esc(P.J.name)}<small>${esc(P.J.sub)}</small></span></button>
    <button class="eye" data-j="${P.J.id}" aria-pressed="true" aria-label="Show or hide ${esc(P.J.name)}">${EYE}</button></li>`).join('');
  $('#legend-list').addEventListener('click', (e) => {
    const n = e.target.closest('.lg-name'), eye = e.target.closest('.eye');
    if (eye) { const P = paths.find((q) => q.J.id === eye.dataset.j); setPathVisible(P, !P.visible); if (!P.visible && selected === P) closeCard(); }
    else if (n) { const P = paths.find((q) => q.J.id === n.dataset.j); if (innerWidth < 720) toggleLegend(false); openJourney(P); }
  });
  $('#show-all').onclick = () => paths.forEach((P) => setPathVisible(P, true));
  $('#hide-all').onclick = () => { paths.forEach((P) => setPathVisible(P, false)); if (selected) closeCard(); };
}
function toggleLegend(force) {
  const open = force ?? legend.hidden;
  legend.hidden = !open; legendBtn.setAttribute('aria-expanded', String(open));
  if (open && innerWidth < 720 && !card.hidden) { stopPlay(); closeCard(); }
}
legendBtn.addEventListener('click', () => toggleLegend());
$('#legend-close').addEventListener('click', () => toggleLegend(false));
$('#btn-reset').addEventListener('click', () => { closeCard(); toggleLegend(false); resetView(); });
$('#btn-compass').addEventListener('click', () => flyTo({ target: controls.target.clone(), az: 0 }, 1.0));
addEventListener('keydown', (e) => { if (e.key === 'Escape') { stopPlay(); closeCard(); toggleLegend(false); } });

// ---------------------------------------------------------------- toast
let toastTimer = 0;
function toast(msg, ms = 2200) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), ms); }

// ---------------------------------------------------------------- play journey
let play = null;
const marker = new THREE.Group();
function discTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d');
  g.beginPath(); g.arc(32, 32, 26, 0, Math.PI * 2); g.fillStyle = '#2a1a0c'; g.fill();
  g.beginPath(); g.arc(32, 32, 19, 0, Math.PI * 2); g.fillStyle = '#fff8e6'; g.fill();
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const markerGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, transparent: true, opacity: 0.9, depthWrite: false, depthTest: false, fog: false }));
const markerCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: discTexture(), transparent: true, depthWrite: false, depthTest: false, fog: false }));
marker.add(markerGlow, markerCore); marker.visible = false; marker.renderOrder = 20; markerGlow.renderOrder = 20; markerCore.renderOrder = 21;
scene.add(marker);
function togglePlay() { if (play) stopPlay(); else if (selected) startPlay(selected); }
function startPlay(P) {
  const cum = [0];
  for (let i = 1; i < P.samples.length; i++) cum.push(cum[i - 1] + Math.min(P.samples[i].distanceTo(P.samples[i - 1]), 3));
  const L = cum[cum.length - 1];
  play = { P, cum, L, t: 0, dur: clamp(L / 6, 22, 55), nextStop: 0 };
  markerGlow.material.color.set(P.J.color);
  marker.visible = true;
  const b = $('#play'); if (b) b.querySelector('span').textContent = 'Stop';
  const s = sphericalOf();
  flyTo({ target: P.samples[0].clone().setY(0), dist: Math.min(s.radius, 34), polar: 0.8 }, 1.2);
}
function stopPlay(hideMarker = true) {
  if (!play) return;
  play = null; if (hideMarker) marker.visible = false;
  const b = $('#play'); if (b) { b.querySelector('span').textContent = 'Play journey'; b.querySelector('.bar b').style.width = '0'; }
}
function updatePlay(dt) {
  if (!play) return;
  if (tween) return; // wait for the camera to arrive
  play.t += dt;
  const f = clamp(play.t / play.dur, 0, 1);
  const target = f * play.L;
  const { cum, P } = play;
  let i = 1; while (i < cum.length - 1 && cum[i] < target) i++;
  const a = P.samples[i - 1], b = P.samples[i];
  const k = cum[i] > cum[i - 1] ? (target - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0;
  marker.position.lerpVectors(a, b, k); marker.position.y += 0.15;
  const ft = marker.position.clone(); ft.y = 0;
  controls.target.lerp(ft, 1 - Math.exp(-dt * 4));
  while (play.nextStop < P.stops.length && P.stops[play.nextStop].i <= i) { toast(PLACE[P.stops[play.nextStop].id].name); play.nextStop++; }
  const bar = document.querySelector('#play .bar b'); if (bar) bar.style.width = (f * 100).toFixed(1) + '%';
  if (f >= 1) { const keep = P; stopPlay(false); setTimeout(() => { if (!play) marker.visible = false; }, 2500); if (selected === keep) toast('Journey\u2019s end'); }
}

// ---------------------------------------------------------------- picking
function pickAt(x, y) {
  // places (dots + visible labels)
  let best = null, bd = COARSE ? 22 : 14;
  for (const m of markers) {
    if (!m.vis) continue;
    const d = Math.hypot(m.sx - x, m.sy - y);
    if (d < bd) { bd = d; best = { place: m.p }; }
    if (m.lab) {
      const w = m.w * (m.s || 1), h = m.h * (m.s || 1);
      const x0 = m.left ? m.sx - 10 - w : m.sx + 6, x1 = m.left ? m.sx - 6 : m.sx + 10 + w;
      if (x > x0 && x < x1 && y > m.sy - h / 2 - 3 && y < m.sy + h / 2 + 3 && bd > 6) { bd = 6; best = { place: m.p }; }
    }
  }
  if (best) return best;
  // journeys
  let pb = null, pd = COARSE ? 20 : 12;
  for (const P of paths) {
    if (!P.visible) continue;
    for (let i = 0; i < P.samples.length; i += 2) {
      const s = P.samples[i];
      const [sx, sy, sz] = project(s.x, s.y, s.z);
      if (sz > 1) continue;
      const d = Math.hypot(sx - x, sy - y);
      if (d < pd) { pd = d; pb = P; }
    }
  }
  return pb ? { path: pb } : null;
}
let down = null, lastInteract = performance.now();
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now(), n: (down?.n || 0) + 1 }; lastInteract = performance.now(); tween = null; hideHint(); });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
  down = null;
  if (moved > 8 || dt > 600) return;
  const r = pickAt(e.clientX, e.clientY);
  if (r?.place) openPlace(r.place);
  else if (r?.path) openJourney(r.path);
  else if (!card.hidden && !play) closeCard();
});
canvas.addEventListener('pointercancel', () => { down = null; });
let hoverEl = null;
canvas.addEventListener('pointermove', (e) => {
  if (COARSE || e.buttons) return;
  const r = pickAt(e.clientX, e.clientY);
  canvas.style.cursor = r ? 'pointer' : '';
  const el = r?.place ? markers.find((m) => m.p === r.place).el : null;
  if (el !== hoverEl) { hoverEl?.classList.remove('hover'); el?.classList.add('hover'); hoverEl = el; }
});
controls.addEventListener('start', () => { lastInteract = performance.now(); tween = null; });
controls.addEventListener('end', () => { lastInteract = performance.now(); });
canvas.addEventListener('wheel', () => { lastInteract = performance.now(); tween = null; hideHint(); }, { passive: true });

let hintHidden = false;
function hideHint() { if (hintHidden) return; hintHidden = true; $('#hint').classList.add('gone'); }
setTimeout(hideHint, 9000);

// ---------------------------------------------------------------- resize
function resize() {
  const W = innerWidth, H = innerHeight;
  renderer.setSize(W, H, false);
  const oldFov = camera.fov;
  camera.aspect = W / H; camera.fov = W / H < 0.8 ? 50 : 40;
  if (oldFov !== camera.fov) camera.updateProjectionMatrix();
  camera.updateProjectionMatrix();
  computeDefault();
  viewOffTarget = cardOffset();
  measureLabels();
}
addEventListener('resize', resize);

// ---------------------------------------------------------------- loop
let lastT = performance.now();
let elapsed = 0;
const LIMIT_X = MAP.W * SC / 2, LIMIT_Z = MAP.H * SC / 2;
function frame() {
  const now = performance.now();
  const rdt = Math.min((now - lastT) / 1000, 0.5); lastT = now;
  const dt = Math.min(rdt, 0.1);
  elapsed += dt;
  // idle drift
  const idle = (performance.now() - lastInteract) / 1000;
  const drift = idle > 10 && !tween && !play && card.hidden;
  controls.autoRotate = drift;
  controls.autoRotateSpeed = 0.22 * Math.sin((idle - 10) * 0.09);
  applyTween(rdt);
  updatePlay(rdt);
  controls.update(dt);
  // keep the focus on the map
  const t = controls.target;
  const cx = clamp(t.x, -LIMIT_X, LIMIT_X), cz = clamp(t.z, -LIMIT_Z, LIMIT_Z);
  if (cx !== t.x || cz !== t.z || t.y !== 0) { const d = new THREE.Vector3(cx - t.x, -t.y, cz - t.z); t.add(d); camera.position.add(d); }
  applyViewOffset();
  // fog follows the zoom
  const dist = camera.position.distanceTo(t);
  scene.fog.near = dist * 0.9; scene.fog.far = dist * 2.6 + 40;
  // path widths in screen pixels
  const ppu = ppuAt(dist);
  for (const P of paths) {
    const px = P.sel ? 6.5 : 4.2;
    const w = Math.max(px / ppu, 0.07);
    P.mats.forEach((m) => { m.main.uWidth.value = w; m.main.uTime.value = elapsed; m.main.uPpu.value = ppu; m.xray.uWidth.value = w; m.xray.uTime.value = elapsed; m.xray.uPpu.value = ppu; });
  }
  for (const g of glows) {
    const f = g.pulse === 1 ? 0.85 + 0.25 * Math.sin(elapsed * 2.2) : g.pulse === 2 ? 0.9 + 0.15 * Math.sin(elapsed * 3.1) + 0.05 * Math.sin(elapsed * 7.3) : g.pulse === 3 ? 0.8 + 0.2 * Math.sin(elapsed * 1.3) : 1;
    g.sp.scale.setScalar(g.size * f * clamp(10 / ppu, 0.6, 3));
  }
  if (marker.visible) {
    const s = (40 + 8 * Math.sin(elapsed * 5)) / ppu; markerGlow.scale.setScalar(s); markerCore.scale.setScalar(16 / ppu);
  }
  // compass
  const az = sphericalOf().theta;
  $('#compass-needle').style.transform = `rotate(${(az * 180 / Math.PI).toFixed(1)}deg)`;
  renderer.render(scene, camera);
  updateLabels();
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- boot
async function boot() {
  try {
    const texP = new THREE.TextureLoader().loadAsync('assets/terrain.jpg');
    await loadHeight();
    const tex = await texP;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter;
    buildTerrain(tex);
    buildTrees();
    buildLandmarks();
    buildJourneys();
    buildLegend();
    if (document.fonts?.load) await Promise.all(['500 13px Cinzel', '600 13px Cinzel', '15px "EB Garamond"', 'italic 15px "EB Garamond"'].map((f) => document.fonts.load(f))).catch(() => {});
    resize();
    // intro: start high and settle into the default view
    const D = DEFAULT;
    controls.target.copy(D.target);
    camera.position.copy(D.target).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(D.dist * 1.35, 0.25, -0.35)));
    controls.update();
    const hash = decodeURIComponent(location.hash.slice(1));
    const params = new URLSearchParams(location.search);
    if (params.has('nointro')) {
      camera.position.copy(D.target).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(D.dist, D.polar, D.az)));
    } else flyTo(D, 2.8);
    lastInteract = performance.now() + 2800;
    if (hash.startsWith('journey-')) { const P = paths.find((q) => q.J.id === hash.slice(8)); if (P) openJourney(P, !params.has('nointro') || true); }
    else if (PLACE[hash]) openPlace(PLACE[hash]);
    if (params.has('legend')) toggleLegend(true);
    renderer.compile(scene, camera);
    requestAnimationFrame(frame);
    setTimeout(() => $('#loading').classList.add('done'), 150);
    window.__atlasReady = true;
  } catch (err) {
    console.error(err);
    $('#loading').innerHTML = '<p class="err">Sorry — the map could not be drawn on this device (WebGL is required).</p>';
  }
}
boot();
// expose a tiny API for automated checks
window.__atlas = { openPlace: (id) => openPlace(PLACE[id]), openJourney: (id) => openJourney(paths.find((q) => q.J.id === id)), resetView, toggleLegend, closeCard, places: PLACES.length, journeys: JOURNEYS.length, startPlay: () => selected && startPlay(selected),
  screenPos: (id) => { const m = markers.find((q) => q.p.id === id); return m && m.vis ? [m.sx, m.sy] : null; },
  cardTitle: () => (card.hidden ? null : $('#card-title')?.textContent),
  audit: (thr = 1.5) => paths.map((P) => ({ id: P.J.id, high: P.mapPts.map((p, i) => [Math.round(p[0]), Math.round(p[1]), +p[2].toFixed(2), P.modes[i]]).filter((q) => q[2] > thr && q[3] !== 'flight' && q[3] !== 'under') })),
  dbgLabels: () => markers.filter((m) => m.vis).map((m) => [m.p.id, Math.round(m.sx), Math.round(m.sy), m.w, m.h, +(m.s || 0).toFixed(2), m.lab]),
  cam: () => ({ d: camera.position.distanceTo(controls.target), t: controls.target.toArray() }) };
