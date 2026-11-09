// 绘制工具：逐字形画盒子（带逐字变换）、安全区检查、字幕的逐字落下、按标签的字符重排、粒子取样、函数图像。
import {H, INK, ORANGE, PAPER, W, rich, tex} from './tex.js';

export const SAFE = {x0: 60, y0: 40, x1: W - 60, y1: H - 40};
export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (b, b0, b1) => clamp((b - b0) / (b1 - b0));
export const outCubic = x => 1 - (1 - x) ** 3;
export const outQuint = x => 1 - (1 - x) ** 5;
export const inOut = x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
export const outBack = (x, k = 1.9) => 1 + (k + 1) * (x - 1) ** 3 + k * (x - 1) ** 2;
// 弹簧：越过目标再回摆，1 处停住
export const spring = x => (x >= 1 ? 1 : 1 - Math.cos(4.2 * Math.PI * x) * Math.exp(-5.5 * x));

export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const state = {frame: 0, errors: []};
export function report(msg) { if (!state.errors.includes(msg)) state.errors.push(msg); }

// 墨迹包围盒经当前变换落到画面上，超出安全区记为错误
export function checkRect(g, r, label) {
  const m = g.getTransform();
  const pts = [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]].map(([x, y]) => m.transformPoint(new DOMPoint(x, y)));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  if (box[0] < SAFE.x0 - 0.5 || box[1] < SAFE.y0 - 0.5 || box[2] > SAFE.x1 + 0.5 || box[3] > SAFE.y1 + 0.5) {
    report(`第 ${state.frame} 帧文字出画：${label} [${box.map(v => v.toFixed(0)).join(',')}]`);
  }
}

const itemCenter = it => [it.x + (it.ink.x0 + it.ink.x1) / 2, it.y + (it.ink.y0 + it.ink.y1) / 2];

function paintItem(g, it, color) {
  g.fillStyle = color ?? it.color;
  if (it.t === 'g') { g.font = it.font; g.fillText(it.ch, it.x, it.y); }
  else g.fillRect(it.x + it.rx, it.y + it.ry, it.w, it.h);
}

// 画盒子。(x, y) 是基线上的锚点，align 决定锚点在左端、中间还是右端。
// anim(item, i) 返回 {dx, dy, s, sx, sy, rot} 或 null（不画）；check 为真时检查墨迹是否出画。
export function drawBox(g, box, x, y, {align = 'left', anim = null, check = true, color = null, scale = 1, label = box.src} = {}) {
  const ox = align === 'center' ? -box.w / 2 : align === 'right' ? -box.w : 0;
  // 砸下时的放大不让墨迹超出安全区：放大倍数压到锚点处放得下的最大值（不小于 1）
  if (check && scale > 1 && box.ink) {
    const m = g.getTransform(), ax = m.a * x + m.e, ay = m.d * y + m.f;
    const l = ox + box.ink.x0, r = ox + box.ink.x1, t = box.ink.y0, d = box.ink.y1;
    const lim = [l < 0 ? (ax - SAFE.x0) / -l : Infinity, r > 0 ? (SAFE.x1 - ax) / r : Infinity, t < 0 ? (ay - SAFE.y0) / -t : Infinity, d > 0 ? (SAFE.y1 - ay) / d : Infinity];
    scale = Math.max(1, Math.min(scale, ...lim));
  }
  g.save();
  g.translate(x, y);
  if (scale !== 1) g.scale(scale, scale);
  g.translate(ox, 0);
  g.textBaseline = 'alphabetic';
  g.textAlign = 'left';
  box.items.forEach((it, i) => {
    const a = anim ? anim(it, i) : {};
    if (a === null) return;
    const sx = (a.sx ?? 1) * (a.s ?? 1), sy = (a.sy ?? 1) * (a.s ?? 1);
    if (sx === 0 || sy === 0) return;
    if (a.dx || a.dy || sx !== 1 || sy !== 1 || a.rot) {
      const [cx, cy] = itemCenter(it);
      g.save();
      g.translate(cx + (a.dx ?? 0), cy + (a.dy ?? 0));
      if (a.rot) g.rotate(a.rot);
      g.scale(sx, sy);
      g.translate(-cx, -cy);
      paintItem(g, it, a.color ?? color);
      g.restore();
    } else paintItem(g, it, a.color ?? color);
  });
  if (check && box.ink) checkRect(g, box.ink, label);
  g.restore();
  return {x: x + ox * scale, w: box.w * scale};
}

// 盒子里某个标签在画面上的矩形
export function tagRect(box, tag, x, y, align = 'left', scale = 1) {
  const ox = align === 'center' ? -box.w / 2 : align === 'right' ? -box.w : 0;
  const r = box.tags[tag];
  return {x0: x + (ox + r.x0) * scale, x1: x + (ox + r.x1) * scale, y0: y + r.y0 * scale, y1: y + r.y1 * scale};
}

// 逐字落下：第 i 个字形晚 i·stagger 拍起落，dur 拍内从上方 drop 像素处弹到原位；out 为真时向下掉出并缩没
export function dropIn(b, b0, {stagger = 0.05, dur = 0.38, drop = 90} = {}) {
  return (it, i) => {
    const q = clamp((b - b0 - i * stagger) / dur);
    if (q <= 0) return null;
    return {dy: -drop * (1 - outBack(q, 2.2)), rot: (1 - outCubic(q)) * 0.25 * (i % 2 ? 1 : -1), s: 0.4 + 0.6 * outCubic(q)};
  };
}
export function dropOut(b, b0, {stagger = 0.02, dur = 0.3} = {}) {
  return (it, i) => {
    const q = clamp((b - b0 - i * stagger) / dur);
    if (q >= 1) return null;
    return {dy: 160 * q * q, rot: q * 0.6 * (i % 2 ? 1 : -1), s: 1 - q};
  };
}
// 砸下：从 1.35 倍缩回原大
export const slamScale = (b, b0, d = 0.28) => 1 + 0.35 * (1 - outCubic(seg(b, b0, b0 + d)));

// 字幕序列：list = [[入场拍, 文字], …]。新字幕逐字落下，旧字幕同时掉出。落定之后才检查出画。
export function captions(g, b, list, {x = 120, y = 200, size = 88, color = INK, until = Infinity} = {}) {
  let i = -1;
  for (const [k, [b0]] of list.entries()) if (b >= b0) i = k;
  if (i < 0) return;
  if (b >= until) {
    const box = rich(list[i][1], size, color);
    if (b - until < 0.4) drawBox(g, box, x, y, {anim: dropOut(b, until), check: false});
    return;
  }
  const [b0, text] = list[i];
  if (i > 0 && b - b0 < 0.4) drawBox(g, rich(list[i - 1][1], size, color), x, y, {anim: dropOut(b, b0), check: false});
  const box = rich(text, size, color);
  const settled = b - b0 >= box.items.length * 0.05 + 0.38;
  drawBox(g, box, x, y, {anim: settled ? null : dropIn(b, b0), check: settled, label: `字幕 ${text}`});
}

// 按标签重排：A 中与 B 同标签的字形组整体移动到 B 中的位置（可加抛物线跳起），
// 只在 A 中的标签缩没（mode=flip 时纵向翻折），只在 B 中的标签长出。q ∈ [0,1]。
export function morph(g, A, ax, ay, B, bx, by, q, {align = 'center', hop = 0, flip = false, check = true, hopOf = null, hideA = null} = {}) {
  const oa = align === 'center' ? -A.w / 2 : 0, ob = align === 'center' ? -B.w / 2 : 0;
  const centre = (box, tag) => { const r = box.tags[tag]; return [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2]; };
  const e = inOut(q);
  if (q >= 1) return drawBox(g, B, bx, by, {align, check});
  if (q <= 0) return drawBox(g, A, ax, ay, {align, check, anim: hideA ? it => (hideA.has(it.tag) ? null : {}) : null});
  // 只在 A 中的标签
  drawBox(g, A, ax, ay, {align, check: false, anim: it => {
    if (it.tag && B.tags[it.tag]) return null;
    if (hideA?.has(it.tag)) return null;
    const k = clamp(1 - q * 2);
    return flip ? {sy: k} : {s: k};
  }});
  drawBox(g, B, bx, by, {align, check: false, anim: it => {
    if (it.tag && A.tags[it.tag]) {
      const [cax, cay] = centre(A, it.tag), [cbx, cby] = centre(B, it.tag);
      const h = hopOf ? hopOf(it.tag) : hop;
      return {dx: (1 - e) * (ax + oa + cax - (bx + ob + cbx)), dy: (1 - e) * (ay + cay - (by + cby)) - h * Math.sin(Math.PI * q)};
    }
    const k = clamp(q * 2 - 1);
    return flip ? {sy: k} : {s: outBack(k)};
  }});
}

// 盒子墨迹取样成点（相对锚点，左端基线），供粒子用
const samples = new Map();
export function sampleBox(box, step = 4) {
  const key = `${box.src}|${box.items[0]?.size}|${step}`;
  if (samples.has(key)) return samples.get(key);
  const r = box.ink, pad = 4;
  const c = Object.assign(document.createElement('canvas'), {width: Math.ceil(r.x1 - r.x0 + 2 * pad), height: Math.ceil(r.y1 - r.y0 + 2 * pad)});
  const g = c.getContext('2d', {willReadFrequently: true});
  drawBox(g, box, pad - r.x0, pad - r.y0, {check: false, color: '#000'});
  const data = g.getImageData(0, 0, c.width, c.height).data, pts = [];
  for (let y = 0; y < c.height; y += step) for (let x = 0; x < c.width; x += step) if (data[(y * c.width + x) * 4 + 3] > 128) pts.push([x - pad + r.x0, y - pad + r.y0]);
  samples.set(key, pts);
  return pts;
}

// 函数图像的相机：世界坐标 (cx, cy) 落在画面 (ox, oy)，横向 sx、纵向 sy 像素每单位
export const camera = (cx, cy, sx, sy = sx, ox = W / 2, oy = H / 2) => ({cx, cy, sx, sy, ox, oy, X: x => ox + (x - cx) * sx, Y: y => oy - (y - cy) * sy, x: X => cx + (X - ox) / sx});

export function plot(g, f, cam, color, width, {X0 = 0, X1 = W, step = 2} = {}) {
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  let first = true;
  for (let X = X0; X <= X1 + 1e-6; X += step) {
    const Y = clamp(cam.Y(f(cam.x(X))), -3000, H + 3000);
    if (first) { g.moveTo(X, Y); first = false; } else g.lineTo(X, Y);
  }
  g.stroke();
}

export function line(g, x0, y0, x1, y1, color, width, cap = 'round') {
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = cap;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
}
export function disc(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.fill(); }
export function ring(g, x, y, r, color, width) { g.strokeStyle = color; g.lineWidth = width; g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI); g.stroke(); }
// x₀ 的橙点：外圈一道米白隔开下面的曲线
export function point(g, x, y, r = 22) { disc(g, x, y, r + 6, PAPER); disc(g, x, y, r, ORANGE); }

export {INK, ORANGE, PAPER, W, H, rich, tex};
