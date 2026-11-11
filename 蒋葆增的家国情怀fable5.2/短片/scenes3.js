import { W, H, F } from './timeline.js';
import { LINES, NOTES } from './script.js';
import {
  C, camera, paper, wash, say, layout, textOn, line3, quad3, rgba, mix, font, note, DIN, MONO,
  clamp, lerp, lerp3, seg, eIO, eOut, eIn, eBack, add, mul,
} from './lib.js';
import { drawLattice } from './world.js';
import { turnYear } from './scenes2.js';

const B = (f) => f / 15;

// ───────── 第 8、9 页的地图场地 ─────────

const CD = [-9, 0, 0];
const HZ = [9, 0, 0];

const SLOTS = (() => {
  const out = [];
  const at = (col, row) => [5.6 + col * 0.58, 0, -0.9 - row * 0.64];
  for (let i = 0; i < 3; i++) out.push(at(i, 0));
  for (let i = 0; i < 3; i++) out.push(at(i + 4.5, 0));
  for (let i = 0; i < 30; i++) out.push(at(i % 10, 1 + Math.floor(i / 10)));
  for (let i = 0; i < 22; i++) out.push(at(i % 11, 4 + Math.floor(i / 11)));
  return out;
})();

const launch = (i) => 1566 + i * 1.25;
const FLIGHT = 22;

function aidCam(b) {
  const k = eIO(seg(b, 116, 118.2));
  return camera({
    pos: lerp3([1.2, 11, -15], [8.6, 6.4, -12], k),
    look: lerp3([1.2, 0, -0.6], [8.6, 0.6, -1.6], k),
    fov: 46,
    cy: lerp(70, 110, k),
  });
}

function dotAt(f, i) {
  const t = eIO(seg(f, launch(i), launch(i) + FLIGHT));
  const P = lerp3(CD, SLOTS[i], t);
  P[1] = 3.4 * Math.sin(Math.PI * t);
  return { P, t };
}

function mapWorld(ctx, cam, f, appear) {
  const b = B(f);
  // 两地之间的虚线
  ctx.strokeStyle = rgba(C.mid, 0.35 * appear);
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 30; i++) {
    const a = lerp3(CD, HZ, i / 30);
    const c = lerp3(CD, HZ, (i + 0.5) / 30);
    line3(ctx, cam, a, c);
  }
  const city = (name, sub, P, zLabel, show = 1) => {
    if (show > 0) textOn(ctx, cam, name, add(P, [0, 0.75 * appear, zLabel]), [1, 0, 0], [0, appear, 0], 1.25, { fill: rgba(C.ink, show) });
    textOn(ctx, cam, sub, add(P, [0, 0.01, zLabel - 1.0]), [1, 0, 0], [0, 0, 1], 0.4, { fill: rgba(C.mid, 0.9 * appear), weight: 700 });
    const p = cam.p(P);
    ctx.strokeStyle = rgba(C.ink, 0.7 * appear);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.s * 0.42, p.s * 0.42 * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
  };
  city('成都', '成都电讯工程学院', CD, 2.6);
  city('杭州', '杭州电子工业学院', HZ, 3.6, 1 - seg(b, 116, 116.8));

  // 58 个点：先画影子再画点
  const dots = SLOTS.map((_, i) => dotAt(f, i));
  dots.forEach(({ P, t }, i) => {
    if (f < launch(i) && i > 0) return;
    const s = cam.p([P[0], 0, P[2]]);
    ctx.fillStyle = `rgba(60,45,25,${0.16 - 0.1 * Math.sin(Math.PI * t)})`;
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.s * 0.2, s.s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  dots.forEach(({ P }, i) => {
    if (f < launch(i) && i > 0) return;
    const p = cam.p(add(P, [0, 0.17, 0]));
    ctx.fillStyle = i === 0 ? C.orange : C.ink;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.s * 0.17, 0, Math.PI * 2);
    ctx.fill();
  });
}

export const chengduDot = () => {
  const p = aidCam(104).p(add(CD, [0, 0.17, 0]));
  return { x: p.x, y: p.y, r: p.s * 0.17 };
};

// ───────── 第 7 页：1979 年，73 岁 ─────────

export function y1979(ctx, f) {
  const b = B(f);
  paper(ctx);
  const a = -0.5 + 0.04 * (b - 92);
  const cam = camera({ pos: [Math.sin(a) * 12.5, 3.3, -Math.cos(a) * 12.5], look: [0, 2.3, 0], fov: 46, cx: 420, cy: 60 });
  const leave = eIO(seg(b, 102, 103.6));
  drawLattice(ctx, cam, { color: C.ink, alpha: 0.14 * (1 - leave), nodes: false, traceLen: 0 });

  const drop = eOut(seg(b, 93.5, 94.2));
  if (b >= 93.5 && leave < 0.75) {
    const size = 4.6 * (1 - 0.94 * leave);
    const y = size / 2 + 7 * (1 - drop);
    const sh = cam.p([0, 0, 0.4]);
    ctx.fillStyle = `rgba(60,45,25,${0.14 * drop * (1 - leave)})`;
    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, sh.s * 2.6 * (1 - leave), sh.s * 0.5 * (1 - leave), 0, 0, Math.PI * 2);
    ctx.fill();
    for (let d = 1.0; d > 0.001; d -= 0.06) {
      textOn(ctx, cam, '73', [0, y, d * (1 - leave)], [1, 0, 0], [0, 1, 0], size, { fill: mix('#8E2A12', C.orangeDark, 1 - d), family: DIN, weight: 700, gap: 1.02 });
    }
    textOn(ctx, cam, '73', [0, y, 0], [1, 0, 0], [0, 1, 0], size, { fill: C.orange, family: DIN, weight: 700, gap: 1.02 });
  }
  // “73”收成一个橙点，移到下一页成都的位置
  if (leave > 0.6) {
    const from = cam.p([0, 0.3, 0]);
    const to = chengduDot();
    const k = eIO(seg(b, 102.9, 104));
    ctx.fillStyle = C.orange;
    ctx.beginPath();
    ctx.arc(lerp(from.x, to.x, k), lerp(from.y, to.y, k) - 120 * Math.sin(Math.PI * k), lerp(30, to.r, k) * seg(leave, 0.6, 1), 0, Math.PI * 2);
    ctx.fill();
  }

  turnYear(ctx, f, rgba(C.ink, 1 - seg(b, 102.6, 103.6)));
  const L = LINES;
  say(ctx, f, { ...L.y79a, x: 150, y: 478, px: 50, color: C.ink, track: 0.1, accent: [{ word: '73岁', color: C.ink, weight: 900 }] });
  say(ctx, f, { ...L.y79b, x: 150, y: 556, px: 50, color: C.ink, track: 0.1 });
  wash(ctx, '#FFFFFF', 0.8 * (1 - seg(f, 1380, 1384)));
}

// ───────── 第 8 页：58 人 ─────────

export function aid(ctx, f) {
  const b = B(f);
  paper(ctx);
  const cam = aidCam(b);
  // 地图在落拍帧整体出现，随后四帧内长到原大
  mapWorld(ctx, cam, f, 0.7 + 0.3 * eOut(seg(f, 1560, 1565)));

  const landed = SLOTS.filter((_, i) => f >= launch(i) + FLIGHT).length;
  if (landed > 0) {
    const p = cam.p([12.6, 0, 1.2]);
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.font = font(700, 170, DIN);
    ctx.fillStyle = C.ink;
    ctx.fillText(String(landed), p.x, p.y);
    ctx.font = font(700, 44);
    ctx.textAlign = 'left';
    ctx.fillText('人', p.x + 12, p.y - 26);
    ctx.restore();
  }
  const L = LINES;
  say(ctx, f, { ...L.aid1, x: 150, y: 176, px: 46, color: C.ink, track: 0.1 });
  say(ctx, f, { ...L.aid2, x: 150, y: 250, px: 46, color: C.ink, track: 0.1, accent: [{ word: '蒋葆增', color: C.orange, weight: 900 }] });
  say(ctx, f, { ...L.aidGroups, x: 150, y: 968, px: 30, color: rgba(C.mid, 0.95), track: 0.08, out: 116, fade: 6 });
  note(ctx, NOTES.map, false, seg(b, 105, 106) * (1 - seg(b, 115.4, 116)));
}

// ───────── 第 9 页：统考第一 ─────────

const SEAL = { size: 150, rot: -0.09 };
export function sealBox(ctx) {
  const cells = layout(ctx, { ...LINES.exam2, x: 150, px: 58, weight: 700, track: 0.1 });
  return { x: 150 + cells.width + 56 + SEAL.size / 2, y: 262 - 22, ...SEAL };
}

export function drawSeal(ctx, box, scale = 1, textAlpha = 1) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(box.x, box.y);
  ctx.rotate(box.rot);
  ctx.scale(scale, scale);
  ctx.fillStyle = C.orange;
  ctx.beginPath();
  ctx.roundRect(-box.size / 2, -box.size / 2, box.size, box.size, 12);
  ctx.fill();
  ctx.globalAlpha = textAlpha;
  ctx.fillStyle = C.white;
  ctx.font = font(900, 60);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(LINES.examSeal.text, 0, 2);
  ctx.restore();
}

export function examWorld(ctx, f, dark) {
  const b = B(f);
  const cam = aidCam(Math.min(b, 124));
  mapWorld(ctx, cam, f, 1);
  ['数学', '物理', '英语'].forEach((name, i) => {
    const rise = eBack(seg(b, 116 + i * 0.5, 117 + i * 0.5));
    if (rise <= 0) return;
    const x = 6.4 + i * 2.2;
    const z = 1.1;
    const a = (Math.PI / 2) * rise;
    const V = [0, Math.sin(a), -Math.cos(a)];
    const at = (u, v) => add([x + u * 1.9, 0.01, z], mul(V, v * 2.5));
    if (!quad3(ctx, cam, [at(-0.5, 0), at(0.5, 0), at(0.5, 1), at(-0.5, 1)])) return;
    ctx.fillStyle = '#FCFAF5';
    ctx.fill();
    ctx.strokeStyle = rgba(C.ink, 0.6);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    textOn(ctx, cam, name, at(0, 0.62), [1, 0, 0], V, 0.62, { fill: C.ink, gap: 1.1 });
    ctx.strokeStyle = rgba(C.ink, 0.2);
    for (let r = 0; r < 3; r++) line3(ctx, cam, at(-0.3, 0.36 - r * 0.09), at(0.3 - r * 0.12, 0.36 - r * 0.09));
  });
}

export function exam(ctx, f) {
  const b = B(f);
  paper(ctx);
  examWorld(ctx, f, false);
  const L = LINES;
  say(ctx, f, { ...L.exam1, x: 150, y: 176, px: 46, color: C.ink, track: 0.1 });
  say(ctx, f, { ...L.exam2, x: 150, y: 262, px: 58, weight: 700, color: C.ink, track: 0.1 });
  const hit = F(L.examSeal.at);
  if (f >= hit) drawSeal(ctx, sealBox(ctx), 1 + 0.75 * (1 - eOut(seg(f, hit, hit + 4))));
}
