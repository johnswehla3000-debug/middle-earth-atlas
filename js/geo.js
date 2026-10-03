// Original, hand-authored approximate geography of Middle-earth (Third Age).
// Coordinates are in "map units": x grows east (0..W), y grows south (0..H).
// These vector outlines are our own rough approximations of relative positions,
// not traced from any published map.

export const MAP = { W: 1200, H: 1180 };

// Land outline (everything inside is land; outside is the Great Sea).
export const COAST = [
  [52, 0], [1200, 0], [1200, 1180], [905, 1180],
  [850, 1162], [815, 1145], [785, 1132], [762, 1112], [768, 1085], [786, 1048],
  [798, 1005], [806, 958], [808, 918], [801, 892],
  [776, 879], [736, 871], [696, 879], [656, 891], [627, 901], [606, 883], [591, 860],
  [562, 851], [522, 862], [472, 869], [422, 861], [386, 849], [377, 826],
  [394, 790], [409, 751], [417, 712], [420, 689], [405, 651], [386, 606], [366, 561],
  [348, 526], [311, 506], [266, 489], [216, 476], [171, 451], [131, 416], [96, 376],
  [66, 341], [44, 304], [88, 285], [120, 274], [141, 268], [146, 262], [141, 257],
  [118, 252], [85, 245], [42, 236], [30, 200], [35, 150], [44, 100], [50, 50]
];

// Inland waters: ellipses with gentle wobble.
export const LAKES = [
  { id: 'rhun', name: 'Sea of Rhûn', cx: 1075, cy: 352, rx: 76, ry: 50, rot: -0.35, wob: 0.16, seed: 3 },
  { id: 'nurnen', name: 'Sea of Núrnen', cx: 1082, cy: 832, rx: 56, ry: 22, rot: 0.1, wob: 0.15, seed: 7 },
  { id: 'longlake', name: 'Long Lake', cx: 905, cy: 190, rx: 7, ry: 22, rot: 0.08, wob: 0.08, seed: 11 },
  { id: 'evendim', name: 'Lake Evendim', cx: 228, cy: 148, rx: 24, ry: 15, rot: 0.2, wob: 0.15, seed: 5 },
  { id: 'nenhithoel', name: 'Nen Hithoel', cx: 772, cy: 608, rx: 5, ry: 13, rot: 0.15, wob: 0.06, seed: 9 }
];

// Mountain ranges as ridge polylines. h = peak height (world units), w = half-width (map units).
export const RANGES = [
  { id: 'misty', name: 'Misty Mountains', h: 4.6, w: 24, pts: [[600, 34], [606, 100], [600, 160], [606, 210], [610, 260], [607, 310], [602, 360], [604, 395], [592, 440], [582, 490], [576, 540], [574, 568]] },
  { id: 'luinN', name: 'Ered Luin', h: 3.0, w: 17, pts: [[136, 40], [128, 110], [134, 175], [142, 236]] },
  { id: 'luinS', name: 'Ered Luin', h: 2.8, w: 16, pts: [[142, 290], [128, 330], [112, 368]] },
  { id: 'grey', name: 'Grey Mountains', h: 3.4, w: 19, pts: [[620, 82], [680, 72], [750, 66], [820, 70], [880, 78], [905, 92]] },
  { id: 'angmar', name: 'Mountains of Angmar', h: 2.6, w: 18, pts: [[462, 24], [515, 55], [560, 52], [598, 40]] },
  { id: 'iron', name: 'Iron Hills', h: 2.1, w: 16, pts: [[995, 108], [1050, 100], [1105, 112]] },
  { id: 'whiteW', name: 'White Mountains', h: 3.8, w: 19, pts: [[392, 832], [430, 805], [470, 778], [508, 745], [534, 705], [548, 668], [553, 645]] },
  { id: 'whiteE', name: 'White Mountains', h: 4.4, w: 20, pts: [[540, 692], [582, 700], [632, 708], [682, 715], [732, 722], [770, 730], [792, 738]] },
  { id: 'ephel', name: 'Ephel Dúath', h: 3.6, w: 14, pts: [[884, 622], [887, 670], [889, 720], [893, 770], [893, 830], [902, 880], [932, 904], [1000, 912], [1080, 905], [1165, 895]] },
  { id: 'lithui', name: 'Ered Lithui', h: 3.6, w: 15, pts: [[888, 612], [950, 600], [1030, 601], [1110, 609], [1172, 632]] },
  // hills
  { id: 'weather', name: 'Weather Hills', h: 1.1, w: 10, pts: [[428, 215], [432, 262]] },
  { id: 'northdowns', name: 'North Downs', h: 0.9, w: 14, pts: [[300, 182], [345, 190], [380, 205]] },
  { id: 'southdowns', name: 'South Downs', h: 0.8, w: 13, pts: [[372, 300], [400, 318]] },
  { id: 'barrow', name: 'Barrow-downs', h: 0.75, w: 10, pts: [[318, 300], [338, 304]] },
  { id: 'evendimhills', name: 'Hills of Evendim', h: 0.8, w: 12, pts: [[195, 118], [250, 112]] },
  { id: 'towerhills', name: 'Tower Hills', h: 0.6, w: 8, pts: [[166, 250], [168, 276]] },
  { id: 'ettenmoors', name: 'Ettenmoors', h: 1.3, w: 16, pts: [[540, 160], [575, 195]] },
  { id: 'emynmuil', name: 'Emyn Muil', h: 1.0, w: 12, pts: [[758, 572], [782, 592], [808, 600]] },
  { id: 'dunland', name: 'Dunland foothills', h: 1.1, w: 14, pts: [[548, 470], [552, 520], [556, 560]] },
  { id: 'emynarnen', name: 'Emyn Arnen', h: 0.6, w: 9, pts: [[836, 752], [846, 765]] }
];

// Individual peaks (cones added on top of the ridges).
export const PEAKS = [
  { id: 'erebor', x: 922, y: 128, h: 4.3, r: 13 },
  { id: 'doom', x: 955, y: 718, h: 3.5, r: 13, crater: true },
  { id: 'caradhras', x: 606, y: 388, h: 1.2, r: 12 },
  { id: 'methedras', x: 574, y: 566, h: 0.8, r: 9 },
  { id: 'gundabad', x: 600, y: 40, h: 0.9, r: 10 },
  { id: 'dwimorberg', x: 632, y: 706, h: 0.6, r: 9 },
  { id: 'thrihyrne', x: 552, y: 645, h: 0.6, r: 8 },
  { id: 'mindolluin', x: 788, y: 738, h: 0.5, r: 8 },
  { id: 'amonhen', x: 762, y: 612, h: 0.45, r: 5 },
  { id: 'amonsul', x: 431, y: 262, h: 0.5, r: 5 },
  { id: 'carrock', x: 668, y: 238, h: 0.35, r: 2.5 }
];

// Rivers, source -> mouth. w = width at the mouth (map units).
export const RIVERS = [
  { id: 'anduin', name: 'Anduin', w: 3.4, pts: [[642, 74], [652, 130], [660, 190], [668, 238], [670, 290], [673, 335], [680, 390], [690, 440], [705, 480], [735, 525], [758, 560], [770, 590], [772, 607], [775, 628], [788, 648], [803, 668], [815, 700], [822, 735], [833, 780], [845, 828], [834, 862], [806, 892], [798, 900]] },
  { id: 'brandywine', name: 'Brandywine', w: 2.2, pts: [[236, 163], [255, 205], [272, 240], [281, 262], [285, 280], [286, 300], [282, 340], [268, 395], [245, 440], [215, 478], [210, 484]] },
  { id: 'lhun', name: 'Lhûn', w: 1.8, pts: [[192, 108], [178, 170], [164, 226], [146, 262]] },
  { id: 'hoarwell', name: 'Hoarwell', w: 1.6, pts: [[545, 150], [530, 210], [505, 258], [495, 300], [480, 350], [458, 393]] },
  { id: 'bruinen', name: 'Loudwater', w: 1.3, pts: [[606, 232], [586, 244], [562, 252], [540, 275], [515, 300], [492, 318]] },
  { id: 'glanduin', name: 'Glanduin', w: 1.2, pts: [[585, 415], [540, 412], [495, 402], [458, 393]] },
  { id: 'greyflood', name: 'Greyflood', w: 2.6, pts: [[458, 393], [440, 410], [415, 445], [385, 485], [355, 520], [344, 530]] },
  { id: 'isen', name: 'Isen', w: 2.0, pts: [[576, 582], [566, 600], [552, 613], [525, 640], [490, 662], [455, 680], [418, 692]] },
  { id: 'entwash', name: 'Entwash', w: 1.7, pts: [[632, 578], [660, 603], [700, 624], [745, 644], [790, 658], [803, 668]] },
  { id: 'snowbourn', name: 'Snowbourn', w: 1.0, pts: [[632, 700], [626, 672], [648, 642], [684, 622]] },
  { id: 'limlight', name: 'Limlight', w: 1.1, pts: [[628, 515], [670, 507], [705, 488]] },
  { id: 'silverlode', name: 'Silverlode', w: 1.2, pts: [[620, 410], [640, 428], [668, 436], [691, 442]] },
  { id: 'gladden', name: 'Gladden', w: 1.0, pts: [[612, 322], [645, 330], [673, 336]] },
  { id: 'celduin', name: 'Celduin', w: 1.8, pts: [[918, 148], [907, 170], [905, 190], [907, 212], [930, 250], [965, 285], [1003, 323]] },
  { id: 'forest', name: 'Forest River', w: 1.3, pts: [[852, 98], [846, 140], [845, 170], [866, 190], [900, 200]] },
  { id: 'carnen', name: 'Redwater', w: 1.3, pts: [[1042, 118], [1050, 190], [1032, 255], [990, 307]] },
  { id: 'poros', name: 'Poros', w: 1.3, pts: [[905, 902], [872, 882], [838, 852]] },
  { id: 'morthond', name: 'Morthond', w: 1.3, pts: [[590, 742], [596, 800], [598, 852], [596, 862]] }
];

// Forests (polygons). tone = tree color family.
export const FORESTS = [
  { id: 'mirkwood', name: 'Mirkwood', tone: 'dark', density: 1.0, pts: [[708, 118], [760, 104], [830, 110], [880, 122], [892, 170], [878, 220], [884, 270], [870, 320], [846, 360], [820, 382], [808, 412], [790, 450], [760, 480], [728, 478], [708, 452], [712, 410], [704, 360], [698, 300], [700, 240], [696, 180]] },
  { id: 'fangorn', name: 'Fangorn', tone: 'deep', density: 1.0, pts: [[585, 515], [636, 508], [660, 534], [652, 574], [616, 592], [590, 576]] },
  { id: 'lorien', name: 'Lothlórien', tone: 'gold', density: 1.0, pts: [[630, 428], [662, 420], [692, 440], [700, 462], [672, 476], [640, 470], [626, 450]] },
  { id: 'oldforest', name: 'Old Forest', tone: 'deep', density: 1.0, pts: [[292, 262], [322, 256], [338, 270], [334, 290], [306, 296], [292, 284]] },
  { id: 'chetwood', name: 'Chetwood', tone: 'green', density: 0.7, pts: [[352, 245], [378, 242], [384, 262], [360, 266]] },
  { id: 'woodyend', name: 'Woody End', tone: 'green', density: 0.6, pts: [[248, 278], [268, 274], [272, 288], [252, 292]] },
  { id: 'trollshaws', name: 'Trollshaws', tone: 'green', density: 0.7, pts: [[505, 232], [548, 228], [556, 250], [530, 266], [508, 258]] },
  { id: 'druadan', name: 'Drúadan Forest', tone: 'green', density: 0.8, pts: [[742, 700], [780, 696], [786, 716], [752, 722]] },
  { id: 'firien', name: 'Firien Wood', tone: 'green', density: 0.7, pts: [[700, 700], [722, 698], [724, 712], [702, 714]] },
  { id: 'ithilien', name: 'Ithilien', tone: 'green', density: 0.45, pts: [[832, 668], [864, 655], [872, 700], [870, 790], [848, 800], [836, 760], [830, 720]] },
  { id: 'greenwoodS', name: 'Eryn Vorn', tone: 'deep', density: 0.6, pts: [[236, 452], [262, 446], [270, 470], [246, 474]] },
  { id: 'eregion', name: 'Hollin holly-woods', tone: 'green', density: 0.35, pts: [[520, 345], [565, 340], [575, 380], [540, 390], [518, 372]] }
];

// Biome / color regions (polygons).
export const BIOMES = [
  { id: 'mordor', pts: [[880, 612], [1170, 612], [1190, 660], [1190, 905], [904, 912], [890, 820], [886, 700]] },
  { id: 'gorgoroth', pts: [[895, 625], [1060, 620], [1060, 700], [1000, 770], [905, 770]] },
  { id: 'nurn', pts: [[960, 790], [1180, 770], [1180, 890], [960, 890]] },
  { id: 'harad', pts: [[700, 905], [1200, 905], [1200, 1180], [700, 1180]] },
  { id: 'brownlands', pts: [[722, 488], [812, 478], [836, 524], [806, 566], [760, 562], [732, 530]] },
  { id: 'dagorlad', pts: [[820, 560], [900, 560], [890, 612], [850, 615], [818, 590]] },
  { id: 'deadmarshes', pts: [[812, 588], [852, 584], [866, 600], [846, 614], [816, 608]] },
  { id: 'rohan', pts: [[590, 598], [640, 584], [700, 562], [745, 560], [792, 640], [784, 700], [700, 712], [602, 690], [566, 652]] },
  { id: 'shire', pts: [[172, 244], [282, 236], [300, 262], [286, 300], [176, 300]] },
  { id: 'gondor', pts: [[560, 720], [800, 740], [850, 830], [800, 880], [560, 860], [430, 840], [470, 760]] },
  { id: 'rhun', pts: [[960, 140], [1200, 140], [1200, 560], [960, 480]] },
  { id: 'forochel', pts: [[52, 0], [460, 0], [420, 60], [52, 70]] }
];

// Old roads (drawn as faint dashed tracks).
export const ROADS = [
  { id: 'eastroad', pts: [[136, 255], [198, 272], [226, 262], [240, 268], [281, 262], [348, 268], [430, 262], [505, 258], [530, 255], [562, 252], [582, 246]] },
  { id: 'greenway', pts: [[336, 195], [348, 268], [372, 330], [420, 380], [440, 410], [500, 520], [552, 613]] },
  { id: 'westroad', pts: [[552, 613], [600, 650], [626, 668], [680, 690], [740, 708], [802, 733]] },
  { id: 'forestroad', pts: [[612, 245], [668, 238], [700, 255], [790, 258], [885, 262], [960, 270]] },
  { id: 'southroad', pts: [[855, 740], [866, 790], [878, 860], [900, 905], [930, 1000]] },
  { id: 'ithilienroad', pts: [[884, 622], [866, 660], [856, 700], [855, 740]] }
];

// Large labels for regions, waters and ranges (not tappable).
export const REGION_LABELS = [
  { t: 'Eriador', x: 400, y: 345, k: 'realm' },
  { t: 'Lindon', x: 82, y: 195, k: 'realm' },
  { t: 'The Shire', x: 222, y: 296, k: 'realmsm' },
  { t: 'Rhovanion', x: 930, y: 440, k: 'realm' },
  { t: 'Rohan', x: 690, y: 640, k: 'realm' },
  { t: 'Gondor', x: 700, y: 800, k: 'realm' },
  { t: 'Mordor', x: 1040, y: 760, k: 'realm' },
  { t: 'Rhûn', x: 1130, y: 230, k: 'realm' },
  { t: 'Harad', x: 990, y: 1060, k: 'realm' },
  { t: 'Enedwaith', x: 455, y: 545, k: 'realm' },
  { t: 'Minhiriath', x: 300, y: 430, k: 'realmsm' },
  { t: 'Forodwaith', x: 300, y: 40, k: 'realmsm' },
  { t: 'Ithilien', x: 858, y: 790, k: 'realmsm' },
  { t: 'Belegaer, the Great Sea', x: 190, y: 760, k: 'water' },
  { t: 'Bay of Belfalas', x: 600, y: 990, k: 'water' },
  { t: 'Sea of Rhûn', x: 1075, y: 352, k: 'watersm' },
  { t: 'Núrnen', x: 1082, y: 832, k: 'watersm' },
  { t: 'Gulf of Lune', x: 60, y: 268, k: 'watersm' },
  { t: 'Misty Mountains', x: 640, y: 300, k: 'range' },
  { t: 'Ered Luin', x: 100, y: 120, k: 'range' },
  { t: 'Grey Mountains', x: 760, y: 48, k: 'range' },
  { t: 'White Mountains', x: 680, y: 745, k: 'range' },
  { t: 'Ephel Dúath', x: 920, y: 860, k: 'range' },
  { t: 'Ered Lithui', x: 1060, y: 588, k: 'range' },
  { t: 'Brown Lands', x: 772, y: 520, k: 'rangesm' },
  { t: 'Anduin', x: 688, y: 380, k: 'river' }
];

// ---------- helpers shared by the baker and the app ----------

export function catmull(pts, step = 2) {
  // Centripetal-ish Catmull-Rom resample with roughly `step` map units spacing.
  if (pts.length < 3) {
    const out = [];
    const [a, b] = pts; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const n = Math.max(1, Math.ceil(L / step));
    for (let i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
    return out;
  }
  const out = [];
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(1, Math.ceil(L / step));
    for (let j = 0; j < n; j++) {
      const t = j / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}

export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

export function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const qx = ax + t * dx - px, qy = ay + t * dy - py;
  return [Math.sqrt(qx * qx + qy * qy), t];
}

export function lakePoly(L, n = 72) {
  const out = [];
  const c = Math.cos(L.rot), s = Math.sin(L.rot);
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const wob = 1 + L.wob * (0.6 * Math.sin(a * 3 + L.seed) + 0.4 * Math.sin(a * 5 + L.seed * 2.1));
    const ex = Math.cos(a) * L.rx * wob, ey = Math.sin(a) * L.ry * wob;
    out.push([L.cx + ex * c - ey * s, L.cy + ex * s + ey * c]);
  }
  return out;
}
