import { W, H, F } from './timeline.js';
import { LINES, NOTES } from './script.js';
import {
  C, camera, paper, night, wash, say, layout, textOn, line3, quad3, rgba, mix, font, note, rng, mask, KAI, MONO,
  clamp, lerp, lerp3, seg, eIO, eOut, eIn, eBack, add, mul, rotX,
} from './lib.js';
import { EIGHT, person, pointOnTrace, eightStyle } from './world.js';
import { sealBox, drawSeal } from './scenes3.js';
import { plain, FAR_Z, FAR_SIZE } from './scenes1.js';

const B = (f) => f / 15;

// ───────── 第 10、11 页共用的一块板：正面是电路，翻过来是绣布 ─────────

function boardCam(b, flip = 0) {
  const k1 = eIO(seg(b, 124, 134));
  const k2 = eIO(seg(b, 136, 147));
  const cam = camera({
    pos: lerp3(lerp3([0, 8.6, -7.6], [0, 6.3, -5.7], k1), [0, 15.5, -9.2], k2),
    look: [0, 0, 0.2],
    fov: 46,
    cx: lerp(270, 230, k2),
    cy: lerp(96, 76, k2),
  });
  if (!flip) return cam;
  return { ...cam, p: (P) => cam.p(rotX(P, flip)), clip: (A, Bq) => cam.clip(rotX(A, flip), rotX(Bq, flip)) };
}

// 第 136 拍时板子正好侧对镜头（镜头在 [0, 6.3, -5.7] 看向原点），只剩一条线；
// 电路面转到这个角度为止，绣布面从同一个平面接着转回平放。
const EDGE_ON = Math.atan2(6.3, 5.7);
const CHIP = 1.6;
const BOARD_TRACES = (() => {
  const r = rng(41);
  const out = [];
  for (let side = 0; side < 4; side++) {
    for (let k = 0; k < 8; k++) {
      const o = (k - 3.5) * 0.37;
      const run = 0.7 + Math.abs(k - 3.5) * 0.45 + r() * 0.5;
      const jog = (k < 4 ? -1 : 1) * (0.6 + Math.abs(k - 3.5) * 0.75 + r() * 0.8);
      const far = 15 + r() * 4;
      const local = [[CHIP, o], [CHIP + run, o], [CHIP + run + Math.abs(jog), o + jog], [far, o + jog]];
      const pts = local
        .map(([u, v]) => (side === 0 ? [u, v] : side === 1 ? [-u, v] : side === 2 ? [v, u] : [v, -u]))
        .reverse();
      let len = 0;
      const acc = [0];
      for (let i = 1; i < pts.length; i++) {
        len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
        acc.push(len);
      }
      out.push({ pts, acc, len, phase: r(), speed: 0.2 + r() * 0.1 });
    }
  }
  return out;
})();

const chipRow = (i) => [((i % 4) - 1.5) * 0.68, 0.03, i < 4 ? 0.42 : -0.42];

export function chip(ctx, f) {
  const b = B(f);
  night(ctx, 1230, -200, 0.8);
  const flip = eIn(seg(b, 134.5, 136)) * EDGE_ON;
  const cam = boardCam(b, flip);
  const grow = eOut(seg(b, 124, 126.5));

  // 走线从四周汇向中心
  ctx.lineCap = 'round';
  for (const tr of BOARD_TRACES) {
    const start = tr.len * (1 - grow);
    ctx.strokeStyle = rgba(C.white, 0.2);
    ctx.lineWidth = 1.4;
    for (let i = 1; i < tr.pts.length; i++) {
      if (tr.acc[i] <= start) continue;
      const t = clamp((start - tr.acc[i - 1]) / (tr.acc[i] - tr.acc[i - 1]));
      const A0 = [lerp(tr.pts[i - 1][0], tr.pts[i][0], t), 0, lerp(tr.pts[i - 1][1], tr.pts[i][1], t)];
      line3(ctx, cam, A0, [tr.pts[i][0], 0, tr.pts[i][1]]);
    }
    // 沿线流向芯片的光点
    if (b > 125.5) {
      const d = ((b * tr.speed + tr.phase) % 1) * tr.len;
      for (let g = 0; g < 5; g++) {
        const q = pointOnTrace(tr, d - g * 0.22);
        const p = cam.p([q[0], 0.01, q[1]]);
        if (!p) continue;
        ctx.fillStyle = rgba(C.white, (0.75 - g * 0.15) * seg(b, 125.5, 126.5));
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, p.s * 0.035 * (1 - g * 0.12)), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 橙色印章移到中心，变成“芯”
  const seal = sealBox(ctx);
  const c0 = cam.p([0, 0, 0]);
  const cw = Math.abs(cam.p([CHIP, 0, 0]).x - cam.p([-CHIP, 0, 0]).x);
  const move = eIO(seg(b, 124.2, 125.4));
  const swap = seg(b, 125.2, 125.8);
  if (swap < 1) {
    ctx.globalAlpha = 1 - swap;
    drawSeal(ctx, { x: lerp(seal.x, c0.x, move), y: lerp(seal.y, c0.y, move), size: lerp(seal.size, cw, move), rot: seal.rot * (1 - move) }, 1, 1 - seg(b, 124, 124.6));
    ctx.globalAlpha = 1;
  }
  if (swap > 0) {
    ctx.save();
    ctx.globalAlpha = swap;
    if (quad3(ctx, cam, [[-CHIP, 0.02, -CHIP], [CHIP, 0.02, -CHIP], [CHIP, 0.02, CHIP], [-CHIP, 0.02, CHIP]])) {
      ctx.fillStyle = '#17130F';
      ctx.fill();
      ctx.shadowColor = C.orange;
      ctx.shadowBlur = 26 + 8 * Math.sin(f * 0.21);
      ctx.strokeStyle = C.orange;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    ctx.restore();
    const dev = seg(b, 126.6, 127.8);
    if (dev > 0) {
      EIGHT.forEach((ch, i) => {
        textOn(ctx, cam, ch, chipRow(i), [1, 0, 0], [0, 0, 1], 0.6, { fill: C.white, alpha: dev, blur: dev < 1 ? (1 - dev) * 8 : 0 });
      });
    }
  }

  const L = LINES;
  say(ctx, f, { ...L.chip1, x: 150, y: 176, px: 46, color: rgba(C.white, 0.92), track: 0.1 });
  say(ctx, f, { ...L.chip2, x: 150, y: 250, px: 46, color: rgba(C.white, 0.92), track: 0.1, accent: [{ word: '芯', color: C.orange, weight: 900 }] });
  note(ctx, NOTES.chip, true, seg(b, 126, 127) * (1 - seg(b, 134, 135)));
}

// ───────── 第 11 页：一针一线 ─────────

const CLOTH = 4.7;
const clothChar = (i) => [((i % 4) - 1.5) * 2.08, 0.02, i < 4 ? 1.35 : -1.35];
const STITCH = 1.85;

export function stitch(ctx, f) {
  const b = B(f);
  paper(ctx);
  const flip = -(1 - eOut(seg(b, 136, 137.7))) * (Math.PI - EDGE_ON);
  const cam = boardCam(b, flip);
  if (quad3(ctx, cam, [[-CLOTH, 0, -CLOTH], [CLOTH, 0, -CLOTH], [CLOTH, 0, CLOTH], [-CLOTH, 0, CLOTH]])) {
    ctx.save();
    ctx.shadowColor = 'rgba(60,45,25,0.25)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = '#EFE8D8';
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = rgba(C.ink, 0.45);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(90,70,40,0.07)';
  ctx.lineWidth = 1;
  for (let u = -CLOTH + 0.235; u < CLOTH; u += 0.235) {
    line3(ctx, cam, [u, 0.005, -CLOTH], [u, 0.005, CLOTH]);
    line3(ctx, cam, [-CLOTH, 0.005, u], [CLOTH, 0.005, u]);
  }
  // 尺寸标注
  const dim = seg(b, 138, 139);
  if (dim > 0) {
    ctx.strokeStyle = rgba(C.mid, 0.7 * dim);
    ctx.lineWidth = 1.5;
    line3(ctx, cam, [-CLOTH, 0, -CLOTH - 0.4], [CLOTH, 0, -CLOTH - 0.4]);
    line3(ctx, cam, [-CLOTH, 0, -CLOTH - 0.25], [-CLOTH, 0, -CLOTH - 0.55]);
    line3(ctx, cam, [CLOTH, 0, -CLOTH - 0.25], [CLOTH, 0, -CLOTH - 0.55]);
    line3(ctx, cam, [CLOTH + 0.4, 0, -CLOTH], [CLOTH + 0.4, 0, CLOTH]);
    line3(ctx, cam, [CLOTH + 0.25, 0, -CLOTH], [CLOTH + 0.55, 0, -CLOTH]);
    line3(ctx, cam, [CLOTH + 0.25, 0, CLOTH], [CLOTH + 0.55, 0, CLOTH]);
    textOn(ctx, cam, '60 cm', [0, 0, -CLOTH - 0.85], [1, 0, 0], [0, 0, 1], 0.36, { fill: rgba(C.mid, 0.9 * dim), family: MONO, weight: 400 });
    textOn(ctx, cam, '60 cm', [CLOTH + 0.85, 0, 0], [0, 0, 1], [-1, 0, 0], 0.36, { fill: rgba(C.mid, 0.9 * dim), family: MONO, weight: 400 });
  }
  // 八个字的针脚：沿字的轮廓一针一针走出来
  EIGHT.forEach((ch, i) => {
    const p = seg(b, 137.7 + i * 0.42, 142.2 + i * 0.42);
    if (p <= 0) return;
    const n = Math.floor(p * 150);
    const dash = [];
    for (let k = 0; k < n; k++) dash.push(10, 7);
    dash.push(0, 9000);
    textOn(ctx, cam, ch, clothChar(i), [1, 0, 0], [0, 0, 1], STITCH, { fill: rgba(C.ink, 0.045), stroke: i >= 6 ? C.orange : C.deep, lineWidth: 4.6, dash: p >= 1 ? [10, 7] : dash });
  });

  const L = LINES;
  say(ctx, f, { ...L.stitch1, x: 150, y: 176, px: 46, color: C.ink, track: 0.1 });
  say(ctx, f, { ...L.stitch2, x: 150, y: 250, px: 46, color: C.ink, track: 0.1 });
  say(ctx, f, { ...L.stitchQuote, x: 128, y: 420, px: 40, family: KAI, color: C.ink, track: 0.04 });
  say(ctx, f, { ...L.stitchBy, x: 152, y: 474, px: 25, color: rgba(C.mid, 0.9), track: 0.12, out: null });
  note(ctx, NOTES.cloth, false, seg(b, 138, 139) * (1 - seg(b, 147.4, 148)), 430, H - 64);
}

// ───────── 第 12 页：2026 架无人机 ─────────

const DRONES = 2026;
let swarm;
function buildSwarm() {
  let cells;
  for (let g = 20; g < 80; g++) {
    cells = [];
    EIGHT.forEach((ch, i) => {
      const m = mask(ch);
      for (let y = 0; y < g; y++) for (let x = 0; x < g; x++) if (m.at((x + 0.5) / g, (y + 0.5) / g)) cells.push({ i, u: (x + 0.5) / g, v: (y + 0.5) / g });
    });
    if (cells.length >= DRONES) break;
  }
  const r = rng(2026);
  while (cells.length > DRONES) cells.splice(Math.floor(r() * cells.length), 1);
  swarm = cells.map((c) => {
    const g0 = clothChar(c.i);
    const sx = ((c.i % 4) - 1.5) * 4.15;
    const sy = c.i < 4 ? 10.8 : 6.3;
    return {
      i: c.i,
      ground: [g0[0] + (c.u - 0.5) * STITCH, 0.02, g0[2] + (0.5 - c.v) * STITCH],
      sky: [sx + (c.u - 0.5) * 3.8, sy + (0.5 - c.v) * 3.8, 15],
      delay: ((sx + (c.u - 0.5) * 3.8 + 8.2) / 16.4) * 1.3 + r() * 0.7,
      tw: r() * 6.28,
    };
  });
}
export const droneCount = () => {
  if (!swarm) buildSwarm();
  return swarm.length;
};

export function drone(ctx, f) {
  if (!swarm) buildSwarm();
  const b = B(f);
  night(ctx, 1100, 1300, 0.5);
  const k = eIO(seg(b, 148, 152.6));
  const from = boardCam(148);
  const cam = camera({
    pos: lerp3(from.pos, [-2.4 + (b - 148) * 0.36, 1.35, -10.5], k),
    look: lerp3([0, 0, 0.2], [0, 6.6, 15], k),
    fov: 46,
    cx: lerp(230, 150, k),
    cy: lerp(76, 70, k),
  });
  // 广场地面的网格
  ctx.strokeStyle = rgba(C.white, 0.07 * k);
  ctx.lineWidth = 1;
  for (let u = -24; u <= 24; u += 2) {
    line3(ctx, cam, [u, 0, -8], [u, 0, 40]);
    line3(ctx, cam, [-24, 0, u + 16], [24, 0, u + 16]);
  }
  person(ctx, cam, [3.6, 0, 2], 1.25, rgba('#5A534B', k), rgba(C.fog, 0.5 * k));

  const out = eIn(seg(b, 158.4, 160));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const d of swarm) {
    const e = eIO(seg(b, 148.3 + d.delay, 151.4 + d.delay));
    const P = lerp3(d.ground, d.sky, e);
    P[2] -= 3.2 * Math.sin(Math.PI * e);
    const p = cam.p(P);
    if (!p) continue;
    const r = clamp(p.s * 0.034, 1.4, 3) * (1 + 3 * out);
    const tw = 0.82 + 0.18 * Math.sin(f * 0.35 + d.tw);
    const col = d.i >= 6 ? C.orange : C.white;
    ctx.fillStyle = rgba(col, 0.1 * tw);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(col, tw);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  const L = LINES;
  say(ctx, f, { ...L.drone1, x: 150, y: 176, px: 46, color: rgba(C.white, 0.92), track: 0.1 });
  say(ctx, f, { ...L.drone2, x: 150, y: 250, px: 46, color: rgba(C.white, 0.92), track: 0.1 });
  note(ctx, NOTES.drone, true, seg(b, 152, 153) * (1 - seg(b, 158, 158.6)));
  // 落拍前只亮到一半，整屏白场留给第 160 拍的落拍帧
  wash(ctx, '#FFFFFF', 0.22 * eIn(seg(b, 158.8, 159.93)));
}

// ───────── 第 13 页：我们的理解 ─────────

function viewWorld(ctx, f, b) {
  const k = eIO(seg(b, 160.5, 164.5));
  const farZ = lerp(FAR_Z, 6.5, k);
  const cam = camera({ pos: [0, 3.1, -9.5], look: [0, 1.5, 10.5], fov: 50, cy: 60 });
  plain(ctx, cam, f, { farZ, farSize: lerp(FAR_SIZE, 3, k), shift: FAR_Z - farZ, dash: 1, accent: b >= 168 });
  if (b >= 168) {
    const p = cam.p([1.6, 0.4, 1.2]);
    const t = seg(b, 168, 169.2);
    ctx.strokeStyle = rgba(C.orange, 0.7 * (1 - t));
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.s * (1.8 + 2.4 * eOut(t)), p.s * (0.5 + 0.6 * eOut(t)), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function view(ctx, f) {
  const b = B(f);
  paper(ctx);
  viewWorld(ctx, f, b);
  const L = LINES;
  say(ctx, f, { ...L.viewTag, x: 154, y: 148, px: 27, color: rgba(C.mid, 0.8), track: 0.2 });
  say(ctx, f, { ...L.viewAsk, x: 150, y: 212, px: 40, color: rgba(C.fog, 1), track: 0.1 });
  say(ctx, f, { ...L.view1, x: 150, y: 300, px: 52, color: C.ink, track: 0.1 });
  say(ctx, f, { ...L.view2, x: 150, y: 384, px: 62, weight: 900, color: C.ink, track: 0.08 });
  wash(ctx, '#FFFFFF', 1 - seg(f, 2400, 2410));
}

// ───────── 第 14 页：片名 ─────────

export function end(ctx, f) {
  const b = B(f);
  paper(ctx);
  viewWorld(ctx, f, 172);
  wash(ctx, C.paper, 0.6 + 0.385 * eOut(seg(b, 172, 173.2)));
  const L = LINES;
  const k = 1 + 0.1 * (1 - eOut(seg(f, 2580, 2585)));
  const cells = layout(ctx, { ...L.title, x: 0, px: 124, weight: 900, track: 0.06 });
  ctx.save();
  ctx.translate(150, 480);
  ctx.scale(k, k);
  ctx.font = font(900, 124);
  ctx.fillStyle = C.ink;
  ctx.textBaseline = 'alphabetic';
  cells.forEach((c) => ctx.fillText(c.ch, c.x, 0));
  ctx.restore();
  const cs = { x: 154, px: 27, color: rgba(C.mid, 0.92), track: 0.08, out: null };
  say(ctx, f, { ...L.credit1, ...cs, y: 600 });
  say(ctx, f, { ...L.credit2, ...cs, y: 642 });
  say(ctx, f, { ...L.credit3, ...cs, y: 700 });

  // 最后一滴墨落在片名后面
  const x = 150 + cells.width + 46;
  const land = F(176);
  if (f >= land - 12 && f < land) {
    const t = (f - (land - 12)) / 12;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.ellipse(x, lerp(-40, 462, t * t), 9, 16, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (f >= land) {
    const t = eOut(seg(f, land, land + 8));
    const r = rng(8);
    ctx.fillStyle = C.orange;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const rr = 19 * t * (1 + 0.14 * Math.sin(3 * a + 1) + 0.08 * Math.sin(7 * a));
      i ? ctx.lineTo(x + Math.cos(a) * rr, 462 + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, 462 + Math.sin(a) * rr);
    }
    ctx.fill();
    for (let i = 0; i < 9; i++) {
      const a = r() * 6.28;
      const d = (26 + r() * 40) * t;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, 462 + Math.sin(a) * d * 0.8, 1.5 + r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
