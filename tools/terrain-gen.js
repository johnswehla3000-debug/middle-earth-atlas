// Procedural terrain + parchment texture baker (runs in a browser page).
import { MAP, COAST, LAKES, RANGES, PEAKS, RIVERS, FORESTS, BIOMES, ROADS, catmull, pointInPoly, segDist, lakePoly } from '../js/geo.js';

// ---------- noise ----------
function hash2(ix, iy, seed) {
  let h = ix * 374761393 + iy * 668265263 + seed * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967295;
}
function vnoise(x, y, seed = 1) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed), c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * 2 - 1;
}
function fbm(x, y, oct = 4, seed = 1) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, seed + i * 17); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
function ridged(x, y, oct = 4, seed = 9) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { let r = 1 - Math.abs(vnoise(x * f, y * f, seed + i * 31)); r *= r; s += a * r; n += a; a *= 0.5; f *= 2.1; }
  return s / n;
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function polySDF(x, y, poly) { // positive inside
  let m = 1e9;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [d] = segDist(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1]);
    if (d < m) m = d;
  }
  return pointInPoly(x, y, poly) ? m : -m;
}
function bbox(pts, pad) {
  let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); }
  return [a - pad, b - pad, c + pad, d + pad];
}
function polylineInfo(pts, step) {
  const P = catmull(pts, step);
  const cum = [0];
  for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  return { P, cum, len: cum[cum.length - 1] };
}
function distAlong(x, y, info) { // returns [dist, arcpos]
  const { P, cum } = info;
  let best = 1e9, pos = 0;
  for (let i = 1; i < P.length; i++) {
    const [d, t] = segDist(x, y, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1]);
    if (d < best) { best = d; pos = cum[i - 1] + t * (cum[i] - cum[i - 1]); }
  }
  return [best, pos];
}

export function generate(S = 2) {
  const GW = Math.round(MAP.W / S) + 1, GH = Math.round(MAP.H / S) + 1, N = GW * GH;
  const H = new Float32Array(N), SDF = new Float32Array(N);
  const masks = {};
  for (const b of BIOMES) masks[b.id] = new Float32Array(N);
  const forestM = new Float32Array(N);

  const lakes = LAKES.map(L => ({ ...L, poly: lakePoly(L), bb: bbox(lakePoly(L), 40) }));
  const ranges = RANGES.map(r => ({ ...r, info: polylineInfo(r.pts, 4), bb: bbox(r.pts, r.w * 2.6 + 10) }));
  const rivers = RIVERS.map(r => ({ ...r, info: polylineInfo(r.pts, 2), bb: bbox(r.pts, 40) }));
  const biomes = BIOMES.map(b => ({ ...b, bb: bbox(b.pts, 40) }));
  const forests = FORESTS.map(f => ({ ...f, bb: bbox(f.pts, 12) }));
  const lakeIn = new Float32Array(N);

  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const x = i * S, y = j * S, k = j * GW + i;
    // coastline distance (positive on land)
    let d = polySDF(x, y, COAST);
    // inland lakes
    let li = -1e9;
    for (const L of lakes) {
      if (x < L.bb[0] || y < L.bb[1] || x > L.bb[2] || y > L.bb[3]) continue;
      const s = polySDF(x, y, L.poly);
      if (s > li) li = s;
    }
    lakeIn[k] = li;
    const sdf = Math.min(d, li > -1e8 ? -li : 1e9);
    SDF[k] = sdf;

    // base relief
    let h;
    if (d < 0) {
      h = -0.12 - 1.4 * smooth(0, 70, -d) + 0.08 * fbm(x / 40, y / 40, 3, 4);
    } else {
      const inland = smooth(0, 26, d);
      h = 0.05 + 0.18 * inland + 0.32 * smooth(20, 260, d)
        + inland * (0.2 * (fbm(x / 70, y / 70, 4, 2) * 0.5 + 0.5) + 0.07 * fbm(x / 14, y / 14, 3, 6));
    }
    // biomes
    for (const b of biomes) {
      if (x < b.bb[0] || y < b.bb[1] || x > b.bb[2] || y > b.bb[3]) continue;
      const s = polySDF(x, y, b.pts);
      masks[b.id][k] = b.id === 'deadmarshes' ? smooth(-8, 8, s + 6 * fbm(x / 20, y / 20, 3, 13)) : smooth(-28, 28, s + 22 * fbm(x / 45, y / 45, 3, 13));
    }
    // forests
    let fm = 0;
    for (const f of forests) {
      if (x < f.bb[0] || y < f.bb[1] || x > f.bb[2] || y > f.bb[3]) continue;
      const s = polySDF(x, y, f.pts) + 7 * fbm(x / 14, y / 14, 3, 21);
      fm = Math.max(fm, smooth(-2, 3, s) * f.density);
    }
    forestM[k] = fm;

    if (d > 0) {
      // Mordor plateau & Gorgoroth
      h += 0.55 * masks.mordor[k] + 0.12 * masks.gorgoroth[k];
      h += 0.12 * masks.harad[k] * (fbm(x / 30, y / 30, 3, 33) * 0.5 + 0.5);
      // Mountains
      let m = 0;
      for (const r of ranges) {
        if (x < r.bb[0] || y < r.bb[1] || x > r.bb[2] || y > r.bb[3]) continue;
        const wx = x + 10 * fbm(x / 55, y / 55, 2, 61), wy = y + 10 * fbm(x / 55, y / 55, 2, 62);
        const [dd, pos] = distAlong(wx, wy, r.info);
        const along = 0.72 + 0.4 * (fbm(pos / 35, r.h * 7, 2, 71) * 0.5 + 0.5);
        const taper = smooth(-8, Math.min(40, r.info.len * 0.3), pos) * smooth(-8, Math.min(40, r.info.len * 0.3), r.info.len - pos);
        const wv = r.w * (0.85 + 0.3 * fbm(x / 30, y / 30, 2, 41));
        const prof = Math.exp(-(dd / wv) * (dd / wv) * 2.0);
        const foot = Math.exp(-(dd / (wv * 2.2)) * (dd / (wv * 2.2)) * 2.0);
        const rough = ridged(x / 16, y / 16, 4, 7);
        m += taper * along * (r.h * prof * (0.32 + 0.9 * rough) + r.h * 0.16 * foot * (0.4 + 0.6 * rough));
      }
      h += m;
      for (const p of PEAKS) {
        const dd = Math.hypot(x - p.x, y - p.y);
        if (dd > p.r * 3) continue;
        h += p.h * Math.exp(-(dd / p.r) * (dd / p.r) * 2.2) * (0.9 + 0.2 * ridged(x / 6, y / 6, 2, 3));
        if (p.crater) { const q = dd / (p.r * 0.16); h -= 0.45 * Math.exp(-q * q); }
      }
      // Rivers carve gentle valleys and a shallow channel
      for (const r of rivers) {
        if (x < r.bb[0] || y < r.bb[1] || x > r.bb[2] || y > r.bb[3]) continue;
        const [dd, pos] = distAlong(x, y, r.info);
        const t = pos / r.info.len;
        const w = r.w * (0.35 + 0.65 * t);
        const src = smooth(0, 0.12, t);
        const valley = (1 - smooth(w, w * 5 + 8, dd)) * src;
        h = lerp(h, 0.04 + (h - 0.04) * 0.45, valley * 0.8);
        const ch = (1 - smooth(w * 0.5, w * 1.3 + 0.6, dd)) * src;
        h = lerp(h, 0.03, ch);
      }
      // lakes shore & bed
      if (li > -1e8) {
        if (li > 0) h = -0.05 - 0.55 * smooth(0, 12, li);
        else h = lerp(h, 0.05, 1 - smooth(0, 10, -li));
      }
      if (li <= 0) h = Math.max(h, 0.025);
    }
    H[k] = h;
  }
  return { S, GW, GH, H, SDF, masks, forestM, lakeIn };
}

// ---------- colour ----------
const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const C = {
  parch: hex('#e6d6ad'), parchDark: hex('#d8c494'), green: hex('#cfcf98'), rohan: hex('#dccf8c'),
  shire: hex('#c8cd8e'), gondor: hex('#cdc996'), mordor: hex('#7a6a5a'), gorgoroth: hex('#4c423d'), nurn: hex('#8d8462'),
  harad: hex('#e8cb8e'), brown: hex('#bfa071'), dagor: hex('#a8987c'), marsh: hex('#9a9c7c'),
  rhun: hex('#dbc795'), north: hex('#e4e0d2'), rock: hex('#a39078'), rockDark: hex('#857563'),
  mrock: hex('#4a403b'), snow: hex('#f7f4ee'), seaS: hex('#bcd1c6'), seaD: hex('#90b1b1'), ink: hex('#5a4630'),
  forestFloor: hex('#9fa874')
};
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

export function bakeTexture(G, TW) {
  const { S, GW, GH, H, SDF, masks, forestM } = G;
  const TH = Math.round(TW * MAP.H / MAP.W);
  const px = TW / MAP.W; // pixels per map unit
  const N = GW * GH;
  // per-grid base colour + shade
  const base = new Float32Array(N * 3), shade = new Float32Array(N);
  for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
    const k = j * GW + i, x = i * S, y = j * S;
    let c = mix3(C.parch, C.parchDark, 0.5 + 0.5 * fbm(x / 45, y / 45, 3, 77));
    c = mix3(c, C.green, 0.35 * smooth(-0.2, 0.6, fbm(x / 90, y / 90, 3, 5)));
    c = mix3(c, C.shire, masks.shire[k] * 0.8);
    c = mix3(c, C.rohan, masks.rohan[k] * 0.75);
    c = mix3(c, C.gondor, masks.gondor[k] * 0.55);
    c = mix3(c, C.rhun, masks.rhun[k] * 0.5);
    c = mix3(c, C.north, masks.forochel[k] * 0.7);
    c = mix3(c, C.harad, masks.harad[k] * 0.85);
    c = mix3(c, C.brown, masks.brownlands[k] * 0.85);
    c = mix3(c, C.dagor, masks.dagorlad[k] * 0.7);
    c = mix3(c, C.marsh, masks.deadmarshes[k] * 0.9);
    c = mix3(c, C.mordor, masks.mordor[k] * 0.85);
    c = mix3(c, C.nurn, masks.nurn[k] * masks.mordor[k] * 0.8);
    c = mix3(c, C.gorgoroth, masks.gorgoroth[k] * 0.8);
    c = mix3(c, C.forestFloor, forestM[k] * 0.55);
    base[k * 3] = c[0]; base[k * 3 + 1] = c[1]; base[k * 3 + 2] = c[2];
    // hillshade (light from north-west)
    const hl = H[k - (i > 0 ? 1 : 0)], hr = H[k + (i < GW - 1 ? 1 : 0)];
    const hu = H[k - (j > 0 ? GW : 0)], hd = H[k + (j < GH - 1 ? GW : 0)];
    const gx = (hr - hl) / (2 * S * 0.1), gy = (hd - hu) / (2 * S * 0.1);
    const nx = -gx, ny = -gy, nz = 1; const nl = Math.hypot(nx, ny, nz);
    const L = [-0.55, -0.6, 0.58]; const Ll = Math.hypot(...L);
    const dot = (nx * L[0] + ny * L[1] + nz * L[2]) / (nl * Ll);
    shade[k] = 0.62 + 0.5 * dot;
  }
  const bil = (arr, fx, fy, stride = 1, o = 0) => {
    const i = Math.min(GW - 2, Math.floor(fx)), j = Math.min(GH - 2, Math.floor(fy));
    const tx = fx - i, ty = fy - j, k = j * GW + i;
    const a = arr[k * stride + o], b = arr[(k + 1) * stride + o], c = arr[(k + GW) * stride + o], d = arr[(k + GW + 1) * stride + o];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };

  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(TW, TH); const D = img.data;
  for (let py = 0; py < TH; py++) for (let pxi = 0; pxi < TW; pxi++) {
    const mx = (pxi + 0.5) / px, my = (py + 0.5) / px;
    const fx = mx / S, fy = my / S;
    const h = bil(H, fx, fy), sdf = bil(SDF, fx, fy);
    let c;
    const grain = (hash2(pxi, py, 99) - 0.5) * 0.055;
    if (sdf < 0) {
      const dep = -sdf;
      c = mix3(C.seaS, C.seaD, smooth(0, 90, dep));
      // classic offset ripple lines along the shore
      let rip = 0;
      const rings = [5, 11, 18, 27];
      for (let r = 0; r < rings.length; r++) {
        const dd = Math.abs(dep - rings[r]);
        rip = Math.max(rip, (1 - smooth(0.15, 0.75, dd)) * (1 - r * 0.2));
      }
      c = mix3(c, [96, 128, 132], rip * 0.35);
    } else {
      c = [bil(base, fx, fy, 3, 0), bil(base, fx, fy, 3, 1), bil(base, fx, fy, 3, 2)];
      const n = fbm(mx / 7, my / 7, 3, 55);
      const mord = bil(masks.mordor, fx, fy);
      const hh = h + n * 0.28;
      const rockT = smooth(0.95, 1.9, hh);
      c = mix3(c, mix3(mix3(C.rock, C.rockDark, smooth(2, 3, hh)), C.mrock, mord), rockT * 0.92);
      const north = 1 - smooth(0, MAP.H, my);
      const snowLine = 4.05 - 0.55 * north + 3.0 * mord;
      const snowT = smooth(snowLine - 0.2, snowLine + 0.25, h + n * 0.5);
      c = mix3(c, C.snow, snowT);
      // Mordor: ash blotches and dark lava fields
      if (mord > 0.01) {
        const bl = smooth(-0.1, 0.55, fbm(mx / 16, my / 16, 4, 91));
        c = mix3(c, [52, 44, 40], mord * bl * 0.45);
        const ash = smooth(0.25, 0.6, fbm(mx / 5, my / 40, 3, 92));
        c = mix3(c, [150, 138, 120], mord * ash * 0.18 * (1 - rockT));
      }
      // Mount Doom: lava streaks and glow
      const dd = Math.hypot(mx - 955, my - 718);
      if (dd < 26) {
        const ang = Math.atan2(my - 718, mx - 955);
        const streak = smooth(0.78, 0.98, Math.sin(ang * 6 + 3 * fbm(mx / 6, my / 6, 2, 93))) * (1 - smooth(3, 16, dd));
        c = mix3(c, [40, 28, 26], (1 - smooth(6, 26, dd)) * 0.5);
        c = mix3(c, [214, 74, 30], streak * 0.85);
        c = mix3(c, [255, 120, 40], (1 - smooth(0, 3.2, dd)) * 0.9);
      }
      // Shire patchwork of fields and hedgerows
      const shm = bil(masks.shire, fx, fy);
      if (shm > 0.05 && h < 1.2) {
        const ux = mx / 6 + 1.4 * fbm(mx / 16, my / 16, 2, 95), uy = my / 4.5 + 1.4 * fbm(mx / 16, my / 16, 2, 96);
        const cx = Math.floor(ux), cy = Math.floor(uy);
        const v = hash2(cx, cy, 97);
        const fieldC = v < 0.33 ? [200, 196, 132] : v < 0.66 ? [184, 190, 120] : [214, 200, 140];
        c = mix3(c, fieldC, shm * 0.32);
        const ex = Math.min(ux - cx, 1 - (ux - cx)), ey = Math.min(uy - cy, 1 - (uy - cy));
        const hedge = 1 - smooth(0.01, 0.07, Math.min(ex, ey));
        c = mix3(c, [110, 122, 76], hedge * shm * 0.22 * (0.5 + 0.5 * hash2(cx, cy, 98)));
      }
      const sh = bil(shade, fx, fy);
      c = [c[0] * sh, c[1] * sh, c[2] * sh];
    }
    // coastline ink
    const ad = Math.abs(sdf);
    if (ad < 1.1) c = mix3(c, C.ink, (1 - smooth(0.25, 1.1, ad)) * 0.8);
    const o = (py * TW + pxi) * 4;
    D[o] = Math.max(0, Math.min(255, c[0] * (1 + grain)));
    D[o + 1] = Math.max(0, Math.min(255, c[1] * (1 + grain)));
    D[o + 2] = Math.max(0, Math.min(255, c[2] * (1 + grain)));
    D[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  // ---- vector overlays ----
  ctx.save(); ctx.scale(px, px);
  // marsh tufts
  const tuft = (cx, cy, rx, ry, n, seed) => {
    ctx.strokeStyle = 'rgba(70,82,60,0.55)'; ctx.lineWidth = 0.35;
    for (let i = 0; i < n; i++) {
      const a = hash2(i, seed, 1) * Math.PI * 2, r = Math.sqrt(hash2(i, seed, 2));
      const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
      ctx.beginPath(); ctx.moveTo(x - 1.2, y); ctx.lineTo(x + 1.2, y);
      ctx.moveTo(x - 0.6, y); ctx.lineTo(x - 0.9, y - 1.1); ctx.moveTo(x, y); ctx.lineTo(x, y - 1.4); ctx.moveTo(x + 0.6, y); ctx.lineTo(x + 0.9, y - 1.1);
      ctx.stroke();
    }
  };
  tuft(838, 600, 26, 11, 150, 1); tuft(795, 656, 14, 8, 50, 2); tuft(668, 330, 12, 8, 45, 3); tuft(805, 885, 14, 7, 40, 4);

  // roads
  ctx.setLineDash([3.2, 2.4]); ctx.lineWidth = 0.75; ctx.strokeStyle = 'rgba(110,78,44,0.5)'; ctx.lineCap = 'round';
  for (const r of ROADS) {
    const P = catmull(r.pts, 2);
    ctx.beginPath(); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  }
  ctx.setLineDash([]);

  // rivers (outline then fill), tapered
  for (const pass of [0, 1]) {
    for (const r of RIVERS) {
      const P = catmull(r.pts, 1);
      const n = P.length;
      ctx.strokeStyle = pass === 0 ? 'rgba(62,98,110,0.9)' : 'rgb(140,180,188)';
      for (let i = 1; i < n; i++) {
        const t = i / (n - 1);
        const w = r.w * (0.3 + 0.7 * t);
        ctx.lineWidth = pass === 0 ? w * 1.25 + 0.8 : Math.max(0.2, w * 1.25 - 0.05);
        ctx.beginPath(); ctx.moveTo(P[i - 1][0], P[i - 1][1]); ctx.lineTo(P[i][0], P[i][1]); ctx.stroke();
      }
    }
  }

  // forests: tree stamps
  const tone = {
    dark: ['#2e4430', '#41593c', '#5f7550'], deep: ['#33502f', '#4a6a3e', '#6d8a58'],
    gold: ['#7a8a34', '#a3a845', '#d8c35a'], green: ['#4f6b3c', '#6a8650', '#8ea56d']
  };
  for (const f of FORESTS) {
    const bb = bbox(f.pts, 0); const sp = 2.3 / Math.sqrt(f.density);
    const T = tone[f.tone];
    let idx = 0;
    for (let y = bb[1]; y < bb[3]; y += sp) for (let x = bb[0]; x < bb[2]; x += sp) {
      idx++;
      const jx = x + (hash2(idx, 3, f.id.length) - 0.5) * sp, jy = y + (hash2(idx, 5, f.id.length) - 0.5) * sp;
      const s = polySDF(jx, jy, f.pts) + 7 * fbm(jx / 14, jy / 14, 3, 21);
      if (s < 0) continue;
      const r = 0.95 + hash2(idx, 7, 1) * 0.5;
      ctx.fillStyle = 'rgba(40,40,25,0.25)';
      ctx.beginPath(); ctx.arc(jx + 0.35, jy + 0.35, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = T[hash2(idx, 9, 2) < 0.5 ? 0 : 1];
      ctx.beginPath(); ctx.arc(jx, jy, r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = T[2];
      ctx.beginPath(); ctx.arc(jx - r * 0.3, jy - r * 0.35, r * 0.38, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // subtle vignette on texture edges
  const g = ctx.createRadialGradient(TW / 2, TH / 2, TW * 0.35, TW / 2, TH / 2, TW * 0.75);
  g.addColorStop(0, 'rgba(60,40,20,0)'); g.addColorStop(1, 'rgba(60,40,20,0.18)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, TW, TH);
  return cv;
}

export function encodeHeight(G) {
  const { GW, GH, H } = G;
  const cv = document.createElement('canvas'); cv.width = GW; cv.height = GH;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(GW, GH);
  for (let k = 0; k < GW * GH; k++) {
    const v = Math.max(0, Math.min(65535, Math.round((H[k] + 2) / 10 * 65535)));
    img.data[k * 4] = v >> 8; img.data[k * 4 + 1] = v & 255; img.data[k * 4 + 2] = 0; img.data[k * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}
