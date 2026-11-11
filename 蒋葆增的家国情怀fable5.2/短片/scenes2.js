import { W, H, F } from './timeline.js';
import { LINES, NOTES } from './script.js';
import {
  C, camera, paper, night, wash, say, layout, textOn, line3, quad3, rgba, mix, font, note, rng,
  clamp, lerp, lerp3, seg, eIO, eOut, eIn, eBack, add, mul,
} from './lib.js';
import { tube } from './world.js';

const B = (f) => f / 15;

// ───────── 第 4 页：纽瓦克的电子管厂 ─────────

export function newark(ctx, f) {
  const b = B(f);
  night(ctx, 1250, -160);
  const push = eIn(seg(b, 49.5, 52));
  const a = 0.5 + (b - 40) * 0.07;
  const dist = lerp(9.5, 1.3, push);
  const cam = camera({
    pos: [Math.sin(a) * dist, lerp(2.3, 1.75, push), -Math.cos(a) * dist],
    look: [0, lerp(1.8, 1.6, push), 0],
    fov: 42,
    cx: lerp(330, 0, push),
    cy: 20,
  });
  // 台面的两圈细线
  ctx.strokeStyle = rgba(C.white, 0.1);
  ctx.lineWidth = 1;
  for (const r of [1.7, 2.8]) {
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const p = cam.p([Math.cos((i / 60) * 6.283) * r, -0.3, Math.sin((i / 60) * 6.283) * r]);
      if (!p) continue;
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.stroke();
  }
  tube(ctx, cam, { base: [0, 0, 0], rot: (b - 40) * 0.16, grow: eIO(seg(b, 40.2, 42.5)), glow: 0.75 + 0.25 * Math.sin(f * 0.5) * 0.3 + push });

  const L = LINES;
  const hit = F(L.newarkYear.at);
  if (f >= hit) {
    const k = 1 + 0.14 * (1 - eOut(seg(f, hit, hit + 5)));
    ctx.save();
    ctx.globalAlpha = 1 - seg(b, 50.4, 51);
    ctx.translate(146, 430);
    ctx.scale(k, k);
    ctx.font = font(900, 176);
    ctx.fillStyle = C.white;
    ctx.fillText(L.newarkYear.text, 0, 0);
    ctx.restore();
  }
  say(ctx, f, { ...L.newarkA, x: 156, y: 548, px: 54, color: rgba(C.white, 0.92), track: 0.12 });
  say(ctx, f, { ...L.newarkB, x: 156, y: 632, px: 54, color: rgba(C.white, 0.92), track: 0.12 });
  note(ctx, NOTES.tube, true, seg(b, 42.5, 43.5) * (1 - seg(b, 50, 51)));

  // 推进灯丝，过曝成白场
  if (push > 0) {
    const p = cam.p([0, 1.6, 0]);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 200 + 2600 * push);
    g.addColorStop(0, `rgba(255,236,214,${clamp(push * 1.6)})`);
    g.addColorStop(0.45, `rgba(253,120,60,${clamp(push * 1.1) * 0.5})`);
    g.addColorStop(1, 'rgba(120,40,10,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    // 落拍前只亮到一半，整屏白场留给第 52 拍的落拍帧
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3 * seg(b, 50.6, 51.9);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// ───────── 第 5、6 页共用的场地 ─────────

const A = [-7, 0, 0];
const MID = [0, 0, 4];
const CN = [7, 0, 8];
const D = [13, 0, 11];
const E = [20, 0, 13];
const ROUTE = [A, MID, CN, D, E];

function along(points, t) {
  const n = points.length - 1;
  const k = clamp(t, 0, n);
  const i = Math.min(n - 1, Math.floor(k));
  return lerp3(points[i], points[i + 1], k - i);
}

function listFocus(b) {
  // 镜头依次停在朱其清、两位留学生、两份文件
  const t = eIO(seg(b, 55.5, 59.5)) * 2 + eIO(seg(b, 62.3, 64.3)) * 0.6 + eIO(seg(b, 67, 69.5)) * 0.94;
  return { t, P: along(ROUTE, t) };
}

function listPose(b) {
  // 停在两位留学生和两份文件时镜头退远，人名和文件都留在画面内
  const { P, t } = listFocus(b);
  const far = 1 + 0.45 * seg(t, 2, 2.6);
  return { pos: add(P, mul([-1.6, 4.3, -9.6], far)), look: add(P, [0.6, 1.1, 0]) };
}

function listCam(b) {
  return camera({ ...listPose(b), fov: 48, cy: 70 });
}

function card(ctx, cam, x, rise, title, o) {
  if (rise <= 0) return;
  const a = (Math.PI / 2) * rise;
  const w = 2.5;
  const h = 3.3;
  const z = D[2] + 0.6;
  const V = [0, Math.sin(a), -Math.cos(a)];
  const base = [x, 0.01, z];
  const at = (u, v) => add(add(base, [u * w, 0, 0]), mul(V, v * h));
  // 影子
  if (quad3(ctx, cam, [[x - w / 2, 0, z], [x + w / 2, 0, z], [x + w / 2 + 0.5, 0, z + 1.4 * rise], [x - w / 2 + 0.5, 0, z + 1.4 * rise]])) {
    ctx.fillStyle = o.dark ? 'rgba(0,0,0,0.35)' : 'rgba(60,45,25,0.12)';
    ctx.fill();
  }
  if (!quad3(ctx, cam, [at(-0.5, 0), at(0.5, 0), at(0.5, 1), at(-0.5, 1)])) return;
  ctx.fillStyle = o.dark ? '#221F1B' : '#FCFAF5';
  ctx.fill();
  ctx.strokeStyle = o.dark ? rgba(C.white, 0.22) : rgba(C.ink, 0.6);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  textOn(ctx, cam, title, at(0, 0.84), [1, 0, 0], V, 0.36, { fill: o.accent ? C.orange : o.dark ? rgba(C.white, 0.5) : C.ink, weight: 900, gap: 1.06 });
  ctx.strokeStyle = o.dark ? rgba(C.white, 0.13) : rgba(C.ink, 0.22);
  ctx.lineWidth = 1.4;
  const rr = rng(o.seed);
  for (let i = 0; i < 7; i++) line3(ctx, cam, at(-0.38, 0.68 - i * 0.075), at(-0.38 + 0.35 + rr() * 0.4, 0.68 - i * 0.075));
  textOn(ctx, cam, '示意', at(0.3, 0.08), [1, 0, 0], V, 0.15, { fill: o.dark ? rgba(C.white, 0.3) : rgba(C.mid, 0.7), weight: 400 });
}

// 场地上的人名、连线与两份文件。dark 为第 6 页关灯后的样子。
function listWorld(ctx, cam, b, dark) {
  const inkC = dark ? rgba(C.white, 0.34) : C.ink;
  const soft = dark ? rgba(C.white, 0.2) : rgba(C.mid, 0.9);
  const { t } = listFocus(b);
  // 墨线
  const drawn = clamp(t + 0.55 * seg(b, 52.6, 54.5) + 0.2, 0, 4) * (b < 52.6 ? 0 : 1);
  ctx.strokeStyle = dark ? rgba(C.white, 0.22) : rgba(C.ink, 0.85);
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const k = clamp(drawn - i);
    if (k <= 0) break;
    const c = cam.clip(ROUTE[i], lerp3(ROUTE[i], ROUTE[i + 1], k));
    if (!c) continue;
    ctx.lineWidth = Math.max(1.5, c[0].s * 0.05);
    ctx.beginPath();
    ctx.moveTo(c[0].x, c[0].y);
    ctx.lineTo(c[1].x, c[1].y);
    ctx.stroke();
  }
  ROUTE.forEach((P, i) => {
    if (drawn < i - 0.02) return;
    const p = cam.p(P);
    if (!p) return;
    ctx.fillStyle = dark ? rgba(C.white, 0.3) : C.ink;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.s * 0.17, p.s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // 镜头移向文件之后，两位留学生的名字淡出，不让画面边缘裁到半个字
  const gone = 1 - seg(t, 3.0, 3.35);
  const stand = (str, P, size, at, color, weight = 900, alpha = 1) => {
    const k = eBack(seg(b, at, at + 0.9));
    if (k <= 0 || alpha <= 0) return;
    textOn(ctx, cam, str, add(P, [0, (size / 2 + 0.12) * k, 0.5]), [1, 0, 0], [0, k, 0], size, { fill: color, weight, alpha });
  };
  const flat = (str, P, at, alpha = 1) => {
    const k = seg(b, at, at + 0.8) * alpha;
    if (k <= 0) return;
    textOn(ctx, cam, str, add(P, [0, 0.01, -0.75]), [1, 0, 0], [0, 0, 1], 0.36, { fill: soft, weight: 700, alpha: k });
  };
  stand('朱其清', A, 1.3, 52.5, inkC);
  flat('中央电工器材厂 · 负责电子管技术引进', A, 53.2);
  stand('吴有训', MID, 0.8, 56.2, soft);
  flat('清华大学无线电学研究所', MID, 56.6);
  stand('蒋葆增', add(CN, [-2.3, 0, 0]), 1.3, 58.2, dark ? rgba(C.white, 0.8) : C.ink, 900, gone);
  stand('蔡金涛', add(CN, [2.3, 0, 0]), 1.3, 58.7, inkC, 900, gone);
  flat('正在美国学习电子管技术', CN, 59.3, gone);
  stand('亚克屈勒', add(E, [0.4, 0, 0]), 1.1, 68.6, inkC);
  flat('美国亚克屈勒电子管公司', add(E, [0.4, 0, 0]), 69.2);

  card(ctx, cam, D[0] - 1.5, eBack(seg(b, 63.5, 64.6)), '技术引进计划', { dark, seed: 3 });
  card(ctx, cam, D[0] + 1.4, eBack(seg(b, 64.5, 65.6)), '设备购置清单', { dark, seed: 9, accent: true });

  // 批注红圈：圈住蒋葆增
  const ring = seg(b, 60.3, 61.4);
  if (ring > 0 && !dark) {
    const p = cam.p(add(CN, [-2.3, 0.78, 0.5]));
    if (p) {
      ctx.strokeStyle = C.red;
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i <= 64 * ring; i++) {
        const a = -2.2 + (i / 64) * 6.6;
        const wob = 1 + 0.03 * Math.sin(i * 0.9) + i * 0.0012;
        const x = p.x + Math.cos(a) * p.s * 2.35 * wob;
        const y = p.y + Math.sin(a) * p.s * 0.95 * wob;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
}

export function list(ctx, f) {
  const b = B(f);
  paper(ctx);
  const cam = listCam(b);
  listWorld(ctx, cam, b, false);
  const L = LINES;
  const style = { x: 150, px: 46, color: C.ink, track: 0.1 };
  say(ctx, f, { ...L.list1, ...style, y: 176 });
  say(ctx, f, { ...L.list2, ...style, y: 250, accent: [{ word: '蒋葆增', weight: 900 }] });
  say(ctx, f, { ...L.list3, ...style, y: 176 });
  say(ctx, f, { ...L.list4, ...style, y: 250 });
  note(ctx, NOTES.list, false, seg(b, 54, 55));
  wash(ctx, '#FFFFFF', 1 - seg(f, 780, 792));
}

// ───────── 第 6 页：1937 年的转折 ─────────

const TUBES = Array.from({ length: 9 }, (_, i) => [24 + i * 1.3, 0, 22 + i * 1.7]);

function collapse(ctx, f, line, y, seed) {
  // 文字断裂、倾倒、掉出画面
  const start = F(82);
  const cells = layout(ctx, line);
  const r = rng(seed);
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  cells.forEach((c, i) => {
    const delay = r() * 8 + (cells.length - i) * 0.25;
    const vx = (r() - 0.5) * 9;
    const spin = (r() - 0.5) * 0.14;
    const t = Math.max(0, f - start - delay);
    const yy = y + 0.9 * t * t + (t > 0 ? -5 * t : 0);
    if (yy > H + 80) return;
    ctx.save();
    ctx.translate(c.x + c.w / 2 + vx * t, yy);
    ctx.rotate(spin * t);
    ctx.font = font(c.weight, c.px);
    ctx.fillStyle = line.color;
    ctx.textAlign = 'center';
    ctx.fillText(c.ch, 0, 0);
    ctx.restore();
  });
  ctx.restore();
}

export function turnYear(ctx, f, color) {
  // “1937”在第 90—92 拍滚到“1979”，两页共用同一位置
  const b = B(f);
  const k = eIO(seg(b, 90, 92));
  const year = Math.round(lerp(1937, 1979, k));
  ctx.save();
  ctx.font = font(900, 250);
  ctx.textBaseline = 'alphabetic';
  const moving = b > 90 && b < 92;
  const digits = String(year);
  let x = 140;
  [...digits].forEach((d, i) => {
    const w = ctx.measureText(d).width;
    if (moving && i >= 2) {
      for (let g = 3; g >= 0; g--) {
        ctx.globalAlpha = g ? 0.16 : 1;
        ctx.fillStyle = color;
        ctx.fillText(d, x, 360 + g * 26 * Math.sin(Math.PI * k));
      }
    } else {
      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.fillText(d, x, 360);
    }
    x += w + 4;
  });
  ctx.restore();
}

export function turn(ctx, f) {
  const b = B(f);
  night(ctx, 300, -120);
  const from = listPose(72);
  const k = eIO(seg(b, 73, 77.5));
  const cam = camera({
    pos: lerp3(from.pos, [22.8, 2.2, 17], k),
    look: lerp3(from.look, [23.4, 1.5, 36], k),
    fov: 48,
    cy: lerp(70, 40, k),
  });
  listWorld(ctx, cam, 72, true);

  // 一排电子管：第 84 拍起由近到远逐个点亮
  TUBES.forEach((base, i) => {
    const on = seg(b, 84 + i * 0.5, 84.4 + i * 0.5);
    const show = seg(b, 75.5 + i * 0.2, 77 + i * 0.2);
    if (show <= 0) return;
    tube(ctx, cam, { base, k: 0.62, rot: i * 0.7 + b * 0.05, grow: show, glow: on * (0.8 + 0.2 * Math.sin(f * 0.4 + i)), alpha: 0.2 + 0.25 * on, detail: 0 });
  });

  turnYear(ctx, f, C.white);
  const L = LINES;
  const style = { x: 150, px: 46, color: rgba(C.white, 0.92), track: 0.1 };
  if (f < F(82)) {
    say(ctx, f, { ...L.turn1a, ...style, y: 478, out: null });
    say(ctx, f, { ...L.turn1b, ...style, y: 552, out: null });
  } else {
    collapse(ctx, f, { ...L.turn1a, ...style }, 478, 31);
    collapse(ctx, f, { ...L.turn1b, ...style }, 552, 47);
  }
  const fade = { out: 90.6, fade: 8 };
  say(ctx, f, { ...L.turn2a, ...style, y: 478, ...fade });
  say(ctx, f, { ...L.turn2b, ...style, y: 552, ...fade });
  say(ctx, f, { ...L.turn3, ...style, y: 650, color: rgba(C.white, 0.72), accent: [{ word: '蒋葆增', weight: 900, color: C.white }], ...fade });
  note(ctx, '电子管 · 图形示意，数量不代表产量', true, seg(b, 78, 79) * (1 - seg(b, 90, 91)));
}
