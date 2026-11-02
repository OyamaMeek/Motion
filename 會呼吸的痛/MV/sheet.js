import {P} from './film.js';

export const U = 6, W = 320, H = 180, PX = W * U, PY = H * U;
export const LYRIC_BASELINE = 972;

export const hashId = text => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};
const unit = n => { const v = Math.sin(n * 91.7) * 4375.5; return v - Math.floor(v); };

// 沿边重采样并加起伏；噪声只取决于 seed 和采样序号，所以同一物件移动时边缘形状不变。
export function roughen(pts, {step, amp, seed}) {
  const out = [];
  let n = seed % 9973, slow = unit(n) * 6, fast = unit(n + 1) * 6;
  pts.forEach(([x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length], len = Math.hypot(nx - x, ny - y) || 1, parts = Math.max(1, Math.ceil(len / step));
    for (let j = 0; j < parts; j++) {
      n += 1;
      slow += 0.22 + unit(n) * 0.1; fast += 0.9 + unit(n + 0.5) * 0.6;
      const d = Math.max(-1, Math.min(1, Math.sin(slow) * 0.6 + Math.sin(fast) * 0.3 + (unit(n + 0.25) - 0.5) * 0.5)) * amp, k = j / parts;
      out.push([x + (nx - x) * k - (ny - y) / len * d, y + (ny - y) * k + (nx - x) / len * d]);
    }
  });
  return out;
}

export const boundsOf = pts => {
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...xs), y1 = Math.max(...ys);
  return {x0, y0, x1, y1, min: Math.min(x1 - x0, y1 - y0)};
};

// 与像素版相同的色带算法，只把点阵过渡换成明确的分界。
export function skyBands({y, h, stops, shift}) {
  const span = stops.length > 4 ? stops.length - 2.6 : stops.length - 1, bottom = y + h;
  const edge = k => Math.max(y, Math.min(bottom, y + (k - 0.5 - shift) / span * h));
  const bands = stops.map((stop, k) => ({stop, top: k === 0 ? y : edge(k), bottom: k === stops.length - 1 ? bottom : edge(k + 1)}));
  return bands.filter(b => b.bottom > b.top);
}

// 远景跟随同一相机，位移和放大都打折，支点与像素版相同。
export function viewFor(cam, depth) {
  if (depth === undefined) return cam;
  const pivot = [115, 90];
  return {cx: pivot[0] + (cam.cx - pivot[0]) * depth, cy: pivot[1] + (cam.cy - pivot[1]) * depth, z: 1 + (cam.z - 1) * depth};
}

export const worldMatrix = (cam, dx = 0, dy = 0) => ({a: U * cam.z, b: 0, c: 0, d: U * cam.z, e: (W / 2 - cam.cx * cam.z) * U + dx, f: (H / 2 - cam.cy * cam.z) * U + dy});

const LAYERS = [
  ['A', /^(A|shadowA|mouth\w*|ownPhone|thumb|penInHand|heldScarf|tearDrop)$/],
  ['B', /^(B|shadowB|bScarf\w*|bTense|fist[AB]|offeredScarf|underEdge)$/],
  ['selfie', /^(selfie\w*|phoneChair\w*)$/],
  ['table', /^(table|grain|plan|letter|note|melody|sketch|clock|confession|envelope|ticket|handTicket|cup|pen$|dish|dinner|key|tearMark|phone$|phoneGlass$|phoneScreenCity$|tissue|sleeve)/],
  ['chair', /^(chair|scarf)/],
  ['elevator', /^elev/],
  ['door', /^door(Head|Jamb|Leaf|Panel|Knob)/],
  ['suitcase', /^(suitcase|homeSuitcase|homeStrap)/],
  ['handset', /^phone(Body|Notch|Lens|Shadow)/],
];
export function layerOf({id, depth}) {
  if (depth !== undefined) return `depth${depth}`;
  return LAYERS.find(([, pattern]) => pattern.test(id))?.[0] ?? 'set';
}
const FIGURES = new Set(['A', 'B', 'selfie']);

// 蜡笔更新规则：背景同一组笔画三版，每两次更新换一版；角色在两组笔画之间切换。
export const boilVersion = (layer, tick) => (FIGURES.has(layer) ? (tick % 2 ? 3 : 0) : Math.floor(tick / 2) % 3);

const box = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// 换景实物的形状，坐标是原生 320×180 的屏幕坐标。第一块标记 cover 的纸盖满全高。
export function wipeItems({x, width, kind}) {
  const items = [];
  const rect = (id, rx, ry, w, h, color, extra = {}) => items.push({kind: 'poly', id: `wipe${id}`, pts: box(rx, ry, w, h), color, edge: 'cut', ...extra});
  const shape = (id, pts, color, extra = {}) => items.push({kind: 'poly', id: `wipe${id}`, pts, color, edge: 'cut', ...extra});
  const stripe = (id, at, w, color, extra) => rect(id, x + at, -8, w, H + 16, color, extra);
  rect('Shadow', x - 14, -8, 14, H + 16, P.ink, {density: 0.34});
  const base = {post: P.woodDark, envelope: P.paperShade, calendar: P.white, plan: P.white, scarf: P.scarf, phone: P.cityNear}[kind];
  rect('Cover', x, -8, width, H + 16, base, {cover: true, edge: kind === 'envelope' || kind === 'plan' ? 'torn' : 'cut'});
  if (kind === 'post') {
    for (let i = 0; i < 26; i++) stripe(`Grain${i}`, 6 + unit(i) * (width - 12), 1 + Math.round(unit(i + 40) * 3), unit(i + 80) > 0.5 ? P.wood : P.floorWarmDark, {density: 0.55});
    stripe('EdgeL', 0, 5, P.line); stripe('LightL', 5, 3, P.wood); stripe('EdgeR', width - 5, 5, P.line); stripe('LightR', width - 8, 3, P.wood);
  } else if (kind === 'envelope') {
    shape('FlapL', [[x + 40, 26], [x + 190, 112], [x + 190, 118], [x + 40, 32]], P.whiteDark);
    shape('FlapR', [[x + 340, 26], [x + 190, 112], [x + 190, 118], [x + 340, 32]], P.whiteDark);
    stripe('Rim', width - 6, 6, P.whiteDark);
  } else if (kind === 'calendar') {
    rect('Head', x, -8, width, 42, P.red);
    rect('HeadShade', x, 34, width, 2, P.redDark);
    for (let r = 0; r < 5; r++) for (let c = 0; c < 11; c++) rect(`Day${r}${c}`, x + 12 + c * 33, 46 + r * 27, 26, 20, c === 6 && r === 2 ? P.scarf : P.paperShade);
    stripe('EdgeL', 0, 3, P.whiteDark); stripe('EdgeR', width - 3, 3, P.whiteDark);
  } else if (kind === 'plan') {
    stripe('EdgeL', 0, 3, P.whiteDark); stripe('Crease', 190, 2, P.whiteDark); stripe('EdgeR', width - 3, 3, P.whiteDark);
    rect('Fold', x, 88, width, 2, P.whiteDark);
    shape('Tower', [[x + 70, 170], [x + 118, 18], [x + 166, 170]], P.red);
    for (let i = 0; i < 4; i++) rect(`Brace${i}`, x + 104 - i * 10, 60 + i * 28, 28 + i * 20, 3, P.white);
    for (let i = 0; i < 6; i++) rect(`Note${i}`, x + 220, 30 + i * 22, 120 - (i % 3) * 30, 3, P.paperShade);
  } else if (kind === 'scarf') {
    for (let y = 0; y < H; y += 8) { rect(`Rib${y}`, x, y, width, 2, P.scarfDark); rect(`RibSoft${y}`, x, y + 2, width, 2, P.scarfDark, {density: 0.5}); }
    for (let c = 0; c < width; c += 12) rect(`Knit${c}`, x + c, -8, 2, H + 16, P.scarfDark, {density: 0.4});
    for (let y = 0; y < H; y += 6) rect(`FringeL${y}`, x - 12, y, 12, 3, P.scarf);
    for (let y = 3; y < H; y += 6) rect(`FringeR${y}`, x + width, y, 10, 3, P.scarfDark);
  } else if (kind === 'phone') {
    stripe('RimL', 0, 8, P.ink); stripe('MetalL', 8, 3, P.metal); stripe('RimR', width - 8, 8, P.ink); stripe('MetalR', width - 11, 3, P.metal);
    rect('Screen', x + 60, 40, width - 120, 100, P.nightDeep);
    shape('Glare', [[x + 90, 40], [x + 150, 40], [x + 90, 140], [x + 60, 140], [x + 60, 90]], P.night, {density: 0.6});
    rect('Lens', x + 186, 18, 10, 10, P.ink);
    rect('LensGlass', x + 188, 20, 6, 6, P.night);
    rect('Speaker', x + 150, 22, 28, 3, P.ink);
  }
  return items;
}

const WIPE_CAM = {cx: W / 2, cy: H / 2, z: 1};

// 两种画风共用的遍历：同一清单、同一相机，只把绘制方式交给 painter。
export function paintFrame(ctx, frame, painter, tick) {
  const paint = (item, cam, frameCam) => {
    const layer = item.cover !== undefined || item.id.startsWith('wipe') ? 'wipe' : layerOf(item);
    const {dx, dy} = painter.offset(layer, tick);
    const view = viewFor(cam, item.depth);
    if (item.clip) {
      ctx.save();
      ctx.setTransform(worldMatrix(frameCam));
      ctx.beginPath();
      ctx.rect(item.clip[0], item.clip[1], item.clip[2] - item.clip[0], item.clip[3] - item.clip[1]);
      ctx.clip();
    }
    ctx.setTransform(worldMatrix(view, dx, dy));
    painter[item.kind](item, view, layer, tick);
    if (item.clip) ctx.restore();
  };
  for (const item of frame.items) paint(item, frame.cam, frame.cam);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (frame.vignette) paintVignette(ctx, frame.vignette);
  if (frame.wipe) for (const item of wipeItems(frame.wipe)) paint(item, WIPE_CAM, WIPE_CAM);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

export const withAlpha = (hex, alpha) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${alpha})`;
};

export const darken = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.round((n >> 16) * k)},${Math.round((n >> 8 & 255) * k)},${Math.round((n & 255) * k)})`;
};

function paintVignette(ctx, {color, amount}) {
  ctx.save();
  ctx.translate(PX / 2, PY / 2);
  ctx.scale(PX / 2, PY / 2 * 1.05);
  const g = ctx.createRadialGradient(0, 0, 0.98, 0, 0, 1.42);
  g.addColorStop(0, withAlpha(color, 0));
  g.addColorStop(1, withAlpha(color, Math.min(0.55, amount * 0.9)));
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

// 路径按 id 和形状缓存：静止的布景不用每帧重算边缘。
export function createPathCache() {
  const paths = new Map();
  return (key, build) => {
    if (!paths.has(key)) {
      if (paths.size > 20000) paths.clear();
      paths.set(key, build());
    }
    return paths.get(key);
  };
}

export function tracePath(pts) {
  const path = new Path2D();
  pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
  path.closePath();
  return path;
}

export const shapeKey = (id, pts, extra = '') => `${id}|${extra}|${pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(';')}`;
