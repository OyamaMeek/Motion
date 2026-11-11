import { C, rng, add, mul, line3, poly3, rgba, clamp, lerp, seg, textOn, mix, eOut } from './lib.js';
import { EIGHT, GROUND } from './script.js';

export const CHAR = 2.2;
export const charX = (i) => [-4.5, -1.5, 1.5, 4.5][i % 4];
export const charZ = (i) => (i < 4 ? 11.5 : 8);

// 蜂窝晶格：以墨滴落点为中心
function buildLattice() {
  const s = 0.8;
  const R = 5.6;
  const key = (p) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
  const nodes = new Map();
  const edges = new Map();
  for (let q = -9; q <= 9; q++) {
    for (let r = -9; r <= 9; r++) {
      const cx = s * Math.sqrt(3) * (q + r / 2);
      const cz = s * 1.5 * r;
      if (Math.hypot(cx, cz) > R) continue;
      const cs = [];
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 180) * (60 * k + 30);
        cs.push([cx + s * Math.cos(a), cz + s * Math.sin(a)]);
      }
      for (let k = 0; k < 6; k++) {
        const A = cs[k];
        const B = cs[(k + 1) % 6];
        nodes.set(key(A), A);
        const ek = [key(A), key(B)].sort().join('|');
        edges.set(ek, [A, B]);
      }
    }
  }
  return {
    nodes: [...nodes.values()].map(([x, z]) => ({ x, z, d: Math.hypot(x, z) })),
    edges: [...edges.values()].map(([A, B]) => {
      const da = Math.hypot(A[0], A[1]);
      const db = Math.hypot(B[0], B[1]);
      return da <= db ? { A, B, d: da } : { A: B, B: A, d: db };
    }),
  };
}
export const LATTICE = buildLattice();

const DIRS = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => [Math.cos((k * Math.PI) / 4), Math.sin((k * Math.PI) / 4)]);

function withLength(pts) {
  let len = 0;
  const acc = [0];
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    acc.push(len);
  }
  return { pts, acc, len };
}

// 晶格边缘向外延伸的电路走线：只走 0°、45°、90° 方向
function buildTraces() {
  const r = rng(11);
  const out = [];
  for (let i = 0; i < 44; i++) {
    const th = (i / 44) * Math.PI * 2 + (r() - 0.5) * 0.08;
    let p = [6.1 * Math.cos(th), 6.1 * Math.sin(th)];
    let di = Math.round(th / (Math.PI / 4)) & 7;
    const pts = [p];
    const total = 6 + r() * 16;
    let len = 0;
    while (len < total) {
      const l = 1.2 + r() * 3.2;
      p = [p[0] + DIRS[di][0] * l, p[1] + DIRS[di][1] * l];
      pts.push(p);
      len += l;
      const radial = Math.round(Math.atan2(p[1], p[0]) / (Math.PI / 4)) & 7;
      di = r() < 0.55 ? radial : (radial + (r() < 0.5 ? 1 : 7)) & 7;
    }
    if (pts.some((q) => Math.abs(q[0]) < 6.4 && q[1] > 5.4 && q[1] < 13.4)) continue;
    out.push(withLength(pts));
  }
  return out;
}
export const TRACES = buildTraces();

// 通向八个字的八条走线
export const PAD_TRACES = EIGHT.map((_, i) => {
  const x = charX(i);
  if (i >= 4) return withLength([[x * 0.55, 5.0], [x * 0.55, 5.6], [x, 5.6 + Math.abs(x) * 0.45], [x, 6.75]]);
  const lane = [-6, -3, 3, 6][i];
  return withLength([[lane * 0.5, 5.0], [lane * 0.5, 5.4], [lane, 5.4 + Math.abs(lane) * 0.5], [lane, 8.7], [x, 8.7 + Math.abs(lane - x)], [x, 10.25]]);
});

// 沿走线画出前 drawn 个单位长度
export function tracePath(ctx, cam, tr, drawn, y = 0) {
  if (drawn <= 0) return null;
  let tip = null;
  for (let i = 1; i < tr.pts.length; i++) {
    if (tr.acc[i - 1] >= drawn) break;
    const t = clamp((drawn - tr.acc[i - 1]) / (tr.acc[i] - tr.acc[i - 1]));
    const A = [tr.pts[i - 1][0], y, tr.pts[i - 1][1]];
    const B = [lerp(tr.pts[i - 1][0], tr.pts[i][0], t), y, lerp(tr.pts[i - 1][1], tr.pts[i][1], t)];
    line3(ctx, cam, A, B);
    tip = B;
  }
  return tip;
}

export function pointOnTrace(tr, d) {
  d = clamp(d, 0, tr.len);
  for (let i = 1; i < tr.pts.length; i++) {
    if (tr.acc[i] >= d) {
      const t = (d - tr.acc[i - 1]) / (tr.acc[i] - tr.acc[i - 1] || 1);
      return [lerp(tr.pts[i - 1][0], tr.pts[i][0], t), lerp(tr.pts[i - 1][1], tr.pts[i][1], t)];
    }
  }
  return tr.pts[tr.pts.length - 1];
}

// 晶格与走线。front 是墨迹前沿到落点的距离，traceLen 是普通走线已画出的长度。
export function drawLattice(ctx, cam, { front = 99, traceLen = 99, color = C.ink, alpha = 0.85, nodes = true }) {
  ctx.save();
  ctx.strokeStyle = rgba(color, alpha);
  ctx.fillStyle = rgba(color, alpha);
  ctx.lineCap = 'round';
  for (const e of LATTICE.edges) {
    if (front <= e.d) continue;
    const t = clamp((front - e.d) / 0.9);
    const A = [e.A[0], 0, e.A[1]];
    const B = [lerp(e.A[0], e.B[0], t), 0, lerp(e.A[1], e.B[1], t)];
    const c = cam.clip(A, B);
    if (!c) continue;
    ctx.lineWidth = Math.max(0.8, c[0].s * 0.028);
    ctx.beginPath();
    ctx.moveTo(c[0].x, c[0].y);
    ctx.lineTo(c[1].x, c[1].y);
    ctx.stroke();
  }
  if (nodes) {
    for (const n of LATTICE.nodes) {
      if (front <= n.d) continue;
      const p = cam.p([n.x, 0, n.z]);
      if (!p) continue;
      const k = eOut(clamp((front - n.d) / 0.5));
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.s * 0.075 * k, p.s * 0.075 * k * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const tr of TRACES) {
    if (traceLen <= 0) break;
    const head = cam.p([tr.pts[0][0], 0, tr.pts[0][1]]);
    ctx.lineWidth = head ? Math.max(0.8, head.s * 0.03) : 1;
    const tip = tracePath(ctx, cam, tr, Math.min(traceLen, tr.len));
    if (tip && traceLen >= tr.len) {
      const p = cam.p(tip);
      if (p) {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.s * 0.13, p.s * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}

// 无脸的人物剪影，站在 P 点，高 h
export function person(ctx, cam, P, h, color, ring = null) {
  const a = cam.p(P);
  const b = cam.p(add(P, [0, h, 0]));
  if (!a || !b) return;
  const hp = a.y - b.y;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (ring) {
    ctx.strokeStyle = ring;
    ctx.lineWidth = Math.max(1.2, hp * 0.018);
    ctx.beginPath();
    ctx.ellipse(a.x, a.y, hp * 0.34, hp * 0.09, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(a.x, b.y + hp * 0.09, hp * 0.085, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(a.x - hp * 0.1, b.y + hp * 0.2);
  ctx.quadraticCurveTo(a.x, b.y + hp * 0.15, a.x + hp * 0.1, b.y + hp * 0.2);
  ctx.lineTo(a.x + hp * 0.17, a.y);
  ctx.lineTo(a.x - hp * 0.17, a.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const GLASS = [[0.5, 0.72], [0.85, 0.8], [1.3, 1.0], [1.8, 1.05], [2.3, 0.95], [2.7, 0.72], [3.0, 0.62], [3.25, 0.45], [3.4, 0.22]];

// 电子管线框。base 是管座底部中心，k 是整体比例，rot 是绕竖轴的转角，
// grow 0—1 控制线框自下而上画出，glow 0—1 控制灯丝亮度。
export function tube(ctx, cam, { base, k = 1, rot = 0, grow = 1, glow = 1, color = C.white, alpha = 0.4, detail = 1 }) {
  const P = (r, y, a) => add(base, [Math.cos(a + rot) * r * k, y * k, Math.sin(a + rot) * r * k]);
  const ringN = detail ? 36 : 14;
  const ring = (r, y) => {
    const pts = [];
    for (let i = 0; i < ringN; i++) pts.push(P(r, y, (i / ringN) * Math.PI * 2));
    poly3(ctx, cam, pts, true);
    ctx.stroke();
  };
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = rgba(color, alpha);
  ctx.lineWidth = detail ? 1.5 : 1;
  const top = grow * 3.5;
  if (grow > 0) {
    ring(0.7, 0);
    if (top > 0.5) ring(0.7, 0.5);
    for (let m = 0; m < (detail ? 8 : 4); m++) {
      const a = (m / (detail ? 8 : 4)) * Math.PI * 2;
      line3(ctx, cam, P(0.7, 0, a), P(0.7, Math.min(0.5, top), a));
      if (detail) line3(ctx, cam, P(0.34, 0, a), P(0.34, -0.3, a));
    }
    for (const [y, r] of GLASS) if (y <= top && (detail || y === 1.8 || y === 3.0)) ring(r, y);
    const mer = detail ? 10 : 6;
    for (let m = 0; m < mer; m++) {
      const a = (m / mer) * Math.PI * 2;
      const pts = GLASS.filter(([y]) => y <= top).map(([y, r]) => P(r, y, a));
      if (top >= 3.4) pts.push(P(0, 3.47, a));
      if (pts.length > 1) {
        poly3(ctx, cam, pts);
        ctx.stroke();
      }
    }
    // 屏极
    if (top > 2.2) {
      ctx.strokeStyle = rgba(color, alpha * 1.25);
      ring(0.42, 1.0);
      ring(0.42, 2.2);
      for (let m = 0; m < (detail ? 12 : 6); m++) {
        const a = (m / (detail ? 12 : 6)) * Math.PI * 2;
        line3(ctx, cam, P(0.42, 1.0, a), P(0.42, 2.2, a));
      }
      if (detail) {
        const helix = [];
        for (let i = 0; i <= 150; i++) helix.push(P(0.25, 1.05 + (i / 150) * 1.1, (i / 150) * Math.PI * 2 * 9));
        ctx.strokeStyle = rgba(color, alpha * 0.8);
        ctx.lineWidth = 1;
        poly3(ctx, cam, helix);
        ctx.stroke();
      }
    }
  }
  if (glow > 0) {
    const a = cam.p(P(0.08, 1.0, 0));
    const b = cam.p(P(0, 2.1, 0));
    const c = cam.p(P(0.08, 1.0, Math.PI));
    if (a && b && c) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.shadowColor = C.orange;
      ctx.shadowBlur = b.s * 0.5 * k * glow;
      ctx.strokeStyle = rgba(C.orange, clamp(glow));
      ctx.lineWidth = Math.max(1.5, b.s * 0.035 * k);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
      ctx.stroke();
    }
  }
  ctx.restore();
}

// 透视平原：路两侧浮动的小字。shift 把整片小字沿 z 向镜头方向平移。
export function groundRows(ctx, cam, f, { shift = 0, reveal = 99, tint = '#8F867A', back = C.paper, alpha = 1, camZ = 0 }) {
  for (let j = 0; j < 52; j++) {
    const z = -8 + ((((j * 1.5 - shift) % 78) + 78) % 78);
    if (z < camZ - 1 || z - camZ > 78) continue;
    const show = seg(reveal, (j * 1.5) * 0.12, (j * 1.5) * 0.12 + 1.2);
    if (show <= 0) continue;
    const depth = clamp((z - camZ) / 74);
    for (const side of [-1, 1]) {
      const item = GROUND[(j * 2 + (side > 0 ? 1 : 0) + 3 * ((j / 7) | 0)) % GROUND.length];
      const drift = Math.sin(f * 0.012 + j * 1.7 + side) * 0.5;
      const bob = 0.03 + 0.03 * Math.sin(f * 0.03 + j);
      const x = side * (2.3 + ((j * 37) % 5) * 0.5) + drift;
      const color = mix(item.kind === 'view' ? '#5A534B' : tint, back, 0.15 + depth * 0.85, alpha * show);
      textOn(ctx, cam, item.text, [x, bob, z], [1, 0, 0], [0, 0, 1], 0.5, { weight: 700, fill: color, align: side > 0 ? 'left' : 'right', gap: 1.02 });
    }
  }
}

export const eightStyle = (i, base) => (i >= 6 ? C.orange : base);
export { EIGHT };
