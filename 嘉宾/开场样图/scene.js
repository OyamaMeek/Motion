import {jitter} from '../../會呼吸的痛/開場樣圖/v2/clip.js';
import {rng} from '../../會呼吸的痛/開場樣圖/v2/scene.js';
import {clawdRects, CHARACTER_COLORS} from '../../會呼吸的痛/MV/geometry.js';

export const W = 1920, H = 1080;
export const UPDATES_PER_SECOND = 10;
export const LABELS = {invite: '囍', title: '嘉宾'};

export const COLORS = {
  kraft: '#c4a176', sky: '#bfd3d6', newsSky: '#eceadb', sun: '#f7e8bd', hillFar: '#c6d3cf', ground: '#eef0e6', bank: '#f7f3e8',
  pathTint: '#efe0c4', pine: '#6f8a7c', pineDark: '#5f7a6a', wall: '#f3e4c7', wallShade: '#ead8b8', roof: '#a24e3b', door: '#7c3b2c',
  gold: '#f2c14e', red: '#b8332a', petal: '#f0b7a4', cream: '#f6efe0', clawdBody: CHARACTER_COLORS.body,
  branch: '#5a4334', envelope: '#e9dcc0', ink: '#3a2f28',
};
const C = COLORS;

const piece = (pts, opts = {}) => ({kind: 'piece', pts, edge: 'cut', border: 6, lift: 1, ...opts});
const mark = (pts, color) => ({kind: 'mark', pts, color});
const stripe = (line, color, width, border = 4) => ({kind: 'stripe', line, color, width, border});
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const ellipse = (cx, cy, rx, ry, n = 32) => Array.from({length: n}, (_, i) => [cx + Math.cos(i / n * 2 * Math.PI) * rx, cy + Math.sin(i / n * 2 * Math.PI) * ry]);
const circle = (cx, cy, r, n = 32) => ellipse(cx, cy, r, r, n);
const arch = (x0, x1, top, base) => {
  const r = (x1 - x0) / 2, cx = x0 + r, curve = Array.from({length: 13}, (_, i) => [cx - Math.cos(i / 12 * Math.PI) * r, top + r - Math.sin(i / 12 * Math.PI) * r]);
  return [[x0, base], ...curve, [x1, base]];
};
function rotated(cx, cy, w, h, deg) {
  const a = deg * Math.PI / 180;
  const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
    .map(([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
  return {pts, frame: {cx, cy, w, h, deg}};
}

const PATH = [[1255, 652], [1240, 780], [560, 770], [640, 1060]];
export function pathCenter(t) {
  const u = 1 - t, k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  const at = i => k.reduce((sum, v, j) => sum + v * PATH[j][i], 0);
  return [at(0), at(1)];
}
function pathNormal(t) {
  const [ax, ay] = pathCenter(Math.max(0, t - 0.01)), [bx, by] = pathCenter(Math.min(1, t + 0.01)), len = Math.hypot(bx - ax, by - ay);
  return [-(by - ay) / len, (bx - ax) / len];
}
const pathHalfWidth = t => 26 + 189 * t ** 1.6;
function pathOutline() {
  const side = sign => Array.from({length: 41}, (_, i) => {
    const t = i / 40, [x, y] = pathCenter(t), [nx, ny] = pathNormal(t), hw = pathHalfWidth(t) * sign;
    return [x + nx * hw, Math.min(1056, y + ny * hw)];
  });
  return [...side(1), ...side(-1).reverse()];
}

function pine(x, base, h, color) {
  const w = h * 0.4;
  return [0, 0.28, 0.54].map((k, i) => piece([[x, base - h + k * h * 0.72], [x + w * (0.55 + i * 0.25), base - h * (0.46 - k * 0.8)], [x - w * (0.55 + i * 0.25), base - h * (0.46 - k * 0.8)]], {color, border: 3, lift: 0.4}));
}
const PINES = [[120, 640, 130], [205, 650, 170], [300, 645, 120], [960, 648, 150], [1040, 652, 190], [1500, 650, 170], [1590, 655, 130], [1690, 648, 200], [1780, 650, 140]];

const footprints = Array.from({length: 7}, (_, i) => {
  const t = 0.77 + i * 0.033, [x, y] = pathCenter(t), [nx, ny] = pathNormal(t), side = i % 2 ? 20 : -20, s = 1 + (t - 0.77) * 2;
  return mark(ellipse(x + nx * side * 2 * s, y + ny * side * 2 * s, 13 * s, 7 * s, 16), 'rgba(92,68,44,.34)');
});

const FLOWER_COLORS = [C.cream, C.red, C.gold, C.petal];
const flowers = Array.from({length: 15}, (_, i) => {
  const a = Math.PI + i / 14 * Math.PI;
  return piece(circle(1255 + Math.cos(a) * 62, 612 + Math.sin(a) * 62, i % 3 ? 13 : 17, 14), {color: FLOWER_COLORS[i % 4], border: 2, lift: 0.3});
});
const chapel = [
  piece(rect(1222, 288, 66, 120), {color: C.wallShade, border: 5, name: 'tower'}),
  piece(arch(1236, 1274, 306, 366), {color: C.door, border: 2, lift: 0.2}),
  piece(arch(1245, 1265, 328, 354), {color: C.gold, border: 2, lift: 0.3, name: 'bell'}),
  piece([[1208, 292], [1255, 205], [1302, 292]], {color: C.roof, border: 5}),
  piece(rect(1120, 478, 270, 177), {color: C.wall, border: 7, lift: 1.2, name: 'wall'}),
  piece([[1096, 486], [1255, 372], [1414, 486]], {color: C.roof, border: 7, lift: 1.2, name: 'gable'}),
  piece(circle(1255, 442, 22), {color: C.gold, border: 4, lift: 0.4, name: 'rose'}),
  piece(arch(1148, 1188, 515, 610), {color: C.gold, border: 3, lift: 0.3, name: 'window'}),
  piece(arch(1322, 1362, 515, 610), {color: C.gold, border: 3, lift: 0.3}),
  piece(arch(1224, 1286, 572, 655), {color: C.door, border: 4, lift: 0.5, name: 'door'}),
  stripe([[1255, 590], [1255, 652]], C.gold, 2, 0),
  ...flowers,
];

function bunting(from, to, sag) {
  const point = t => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * sag];
  const line = Array.from({length: 17}, (_, i) => point(i / 16));
  const count = Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / 40);
  const flags = Array.from({length: count}, (_, i) => {
    const [x, y] = point((i + 0.5) / count);
    return piece([[x - 13, y], [x + 13, y], [x, y + 30]], {color: [C.red, C.gold, C.cream][i % 3], border: 2, lift: 0.3});
  });
  return [stripe([[to[0], to[1] - 4], [to[0], 650]], C.branch, 6, 2), stripe(line, C.ink, 2, 0), ...flags];
}

export const FEET = pathCenter(0.7).map(Math.round);
const CLAWD_UNIT = 10;
const CLAWD_X = FEET[0] - 16 * CLAWD_UNIT, CLAWD_Y = FEET[1] - 27 * CLAWD_UNIT;
// 角色模块的 hold 道具是车票，这里只换配色，让它成为喜帖。
const clawdColor = r => (r.color === CHARACTER_COLORS.paper ? C.red : r.color === CHARACTER_COLORS.shade && r.x >= 30 ? C.gold : r.color);
const figure = [{
  kind: 'clawd', x: CLAWD_X, y: CLAWD_Y, unit: CLAWD_UNIT,
  rects: clawdRects({facing: 'back', expression: 'neutral', action: 'hold', frame: 0}).map(r => ({
    x: CLAWD_X + r.x * CLAWD_UNIT, y: CLAWD_Y + r.y * CLAWD_UNIT, w: r.w * CLAWD_UNIT, h: r.h * CLAWD_UNIT, color: clawdColor(r),
  })),
}];
export const FIGURE_PROBES = {body: [CLAWD_X + 14 * CLAWD_UNIT, CLAWD_Y + 18 * CLAWD_UNIT], invite: [CLAWD_X + 32 * CLAWD_UNIT - 5, CLAWD_Y + 26 * CLAWD_UNIT]};

const BRANCHES = [
  [[34, 172], [210, 150], [400, 190], [560, 170]],
  [[210, 150], [290, 90], [360, 62]],
  [[400, 190], [470, 262]],
  [[100, 162], [132, 240]],
  [[290, 90], [262, 44]],
];
const branch = [
  ...BRANCHES.map((line, i) => stripe(line, C.branch, i ? 9 : 15, 5)),
  ...[[120, 158, 40, 11], [280, 158, 56, 12], [448, 172, 44, 10], [322, 70, 30, 9]].map(([x, y, rx, ry]) => piece(ellipse(x, y, rx, ry, 18), {color: C.bank, edge: 'torn', lift: 0.3})),
];

const envelope = rotated(1625, 880, 400, 270, 5);
const invite = rotated(1600, 860, 390, 262, -4);
const tape = rotated(1480, 738, 120, 38, -28);
const placeCard = rotated(1400, 975, 250, 104, 5);
const cardLayer = [
  piece(envelope.pts, {color: C.envelope, lift: 1.3}),
  piece(invite.pts, {color: C.red, lift: 1.8, border: 8, detail: 'invite', frame: invite.frame, name: 'invite'}),
  mark(tape.pts, 'rgba(226,206,160,.84)'),
  piece(placeCard.pts, {color: C.cream, lift: 1.6, border: 6, detail: 'title', frame: placeCard.frame, name: 'placeCard'}),
];

export const LAYERS = [
  {id: 'sky', pieces: [
    piece([[32, 250], [420, 235], [1000, 262], [1500, 228], [1888, 250], [1888, 680], [32, 680]], {tex: 'news', color: C.newsSky, edge: 'torn', lift: 0.6, name: 'news'}),
    piece([[30, 28], [1890, 24], [1886, 330], [1400, 300], [800, 345], [320, 310], [34, 340]], {color: C.sky, edge: 'torn', lift: 0.9, name: 'top'}),
  ]},
  {id: 'sun', pieces: [piece(circle(1590, 232, 118, 44), {color: C.sun, border: 8, lift: 0.7})]},
  {id: 'hills', pieces: [piece([[30, 600], [250, 520], [520, 575], [820, 505], [1120, 560], [1430, 500], [1700, 560], [1890, 520], [1890, 700], [30, 700]], {tex: 'news', color: C.hillFar, edge: 'torn', lift: 0.8})]},
  {id: 'pines', pieces: PINES.flatMap(([x, base, h], i) => pine(x, base, h, i % 2 ? C.pineDark : C.pine))},
  {id: 'ground', pieces: [piece([[30, 628], [400, 612], [800, 640], [1250, 628], [1600, 640], [1890, 618], [1890, 1054], [30, 1052]], {color: C.ground, edge: 'torn', lift: 1.2})]},
  {id: 'path', pieces: [piece(pathOutline(), {tex: 'kraft', color: C.pathTint, edge: 'torn', lift: 0.5})]},
  {id: 'footprints', pieces: footprints},
  {id: 'chapel', pieces: chapel},
  {id: 'bunting', pieces: [...bunting([1226, 372], [990, 520], 34), ...bunting([1284, 372], [1500, 505], 30)]},
  {id: 'figureShadow', pieces: [mark([[FEET[0] - 85, FEET[1] - 6], [FEET[0] + 95, FEET[1] - 2], [FEET[0] - 200, FEET[1] + 72], [FEET[0] - 370, FEET[1] + 40]], 'rgba(60,70,84,.24)')]},
  {id: 'figure', pieces: figure},
  {id: 'bank', pieces: [piece([[30, 1056], [30, 960], [170, 925], [360, 960], [560, 1000], [900, 1020], [1180, 1030], [1500, 1015], [1890, 985], [1890, 1056]], {color: C.bank, edge: 'torn', lift: 1.6})]},
  {id: 'clipping', pieces: [piece(rotated(1560, 890, 560, 310, -3).pts, {tex: 'news', color: '#efe6cf', edge: 'torn', lift: 1.1})]},
  {id: 'branch', pieces: branch},
];

export const findLayer = id => {
  const layer = LAYERS.find(l => l.id === id);
  if (!layer) throw new Error(`未知图层：${id}`);
  return layer;
};

export function pieceBounds(p) {
  const pts = p.kind === 'clawd' ? p.rects.flatMap(r => [[r.x, r.y], [r.x + r.w, r.y + r.h]]) : p.kind === 'stripe' ? p.line : p.pts;
  const pad = p.kind === 'stripe' ? (p.width + p.border) / 2 : 0;
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  return {x0: Math.min(...xs) - pad, y0: Math.min(...ys) - pad, x1: Math.max(...xs) + pad, y1: Math.max(...ys) + pad};
}
export function layerBounds(layer) {
  const all = layer.pieces.map(pieceBounds);
  return {x0: Math.min(...all.map(b => b.x0)), y0: Math.min(...all.map(b => b.y0)), x1: Math.max(...all.map(b => b.x1)), y1: Math.max(...all.map(b => b.y1))};
}
export const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

// 喜宴的红金纸屑从礼堂一侧飘出，越往人物方向越只剩雪片。
function flakes() {
  const r = rng(2026), out = [];
  const blocks = [layerBounds(findLayer('figure')), layerBounds({pieces: cardLayer}), layerBounds(findLayer('chapel'))]
    .map(b => ({x0: b.x0 - 12, y0: b.y0 - 12, x1: b.x1 + 12, y1: b.y1 + 12}));
  const scatter = (count, zone, color) => {
    let placed = 0;
    while (placed < count) {
      const x = zone.x0 + r() * (zone.x1 - zone.x0), y = zone.y0 + r() * (zone.y1 - zone.y0), size = 4 + r() * 6;
      const shape = ellipse(x, y, size, size * (0.65 + r() * 0.35), 9);
      if (blocks.some(b => overlaps(pieceBounds({kind: 'piece', pts: shape}), b))) continue;
      out.push(piece(shape, {color: color(r()), edge: 'cut', border: 2, lift: 0.3}));
      placed++;
    }
  };
  scatter(14, {x0: 980, y0: 400, x1: 1530, y1: 700}, k => (k < 0.55 ? C.red : C.gold));
  scatter(44, {x0: 70, y0: 70, x1: 1850, y1: 960}, () => C.cream);
  return out;
}
LAYERS.push({id: 'flakes', pieces: flakes()}, {id: 'card', pieces: cardLayer});

export function layerOffset(id, tick) {
  const index = LAYERS.indexOf(findLayer(id));
  return jitter(index + 1, tick);
}
