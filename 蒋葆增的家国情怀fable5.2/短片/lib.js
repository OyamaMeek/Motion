import { W, H, FPB } from './timeline.js';
import { CORNERS } from './script.js';

export const C = {
  paper: '#F6F3EB',
  paperGray: '#E7E1D9',
  ink: '#070300',
  dark: '#0E0D0B',
  deep: '#2A2723',
  mid: '#4B4541',
  fog: '#8A8681',
  white: '#FAF6F2',
  orange: '#FD602A',
  orangeDark: '#BE3D24',
  red: '#A9321B',
};

export const SONG = '"Songti SC","STSong",serif';
export const KAI = '"Kaiti SC","STKaiti",serif';
export const MONO = 'Menlo,Monaco,monospace';
export const DIN = '"DIN Condensed","DIN Alternate",sans-serif';
export const font = (weight, px, family = SONG) => `${weight} ${px}px ${family}`;

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (x, a, b) => clamp((x - a) / (b - a));
export const eOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const eIn = (t) => Math.pow(clamp(t), 3);
export const eIO = (t) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const eBack = (t) => {
  t = clamp(t);
  if (t === 0) return 0;
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
export function mix(a, b, t, alpha = 1) {
  const p = hex(a);
  const q = hex(b);
  t = clamp(t);
  return `rgba(${Math.round(lerp(p[0], q[0], t))},${Math.round(lerp(p[1], q[1], t))},${Math.round(lerp(p[2], q[2], t))},${alpha})`;
}
export const rgba = (h, alpha) => mix(h, h, 0, alpha);

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a) => mul(a, 1 / Math.hypot(a[0], a[1], a[2]));
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
// 绕 x 轴旋转，用于整块平面翻面
export const rotX = (p, a) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
export const rotY = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];

const NEAR = 0.08;

// 世界坐标：x 向右，y 向上，z 向画面深处。
export function camera({ pos, look, fov = 50, cx = 0, cy = 0 }) {
  const focal = H / 2 / Math.tan((fov * Math.PI) / 360);
  const fw = norm(sub(look, pos));
  const right = norm(cross([0, 1, 0], fw));
  const up = cross(fw, right);
  const view = (P) => {
    const d = sub(P, pos);
    return [dot(d, right), dot(d, up), dot(d, fw)];
  };
  const screen = (v) => {
    const s = focal / v[2];
    return { x: W / 2 + cx + v[0] * s, y: H / 2 + cy - v[1] * s, s, z: v[2] };
  };
  return {
    pos,
    fw,
    focal,
    view,
    p(P) {
      const v = view(P);
      return v[2] < NEAR ? null : screen(v);
    },
    // 线段按近平面裁剪后的两个屏幕端点
    clip(A, B) {
      let a = view(A);
      let b = view(B);
      if (a[2] < NEAR && b[2] < NEAR) return null;
      if (a[2] < NEAR) a = lerp3(a, b, (NEAR - a[2]) / (b[2] - a[2]));
      if (b[2] < NEAR) b = lerp3(b, a, (NEAR - b[2]) / (a[2] - b[2]));
      return [screen(a), screen(b)];
    },
  };
}

export function line3(ctx, cam, A, B) {
  const c = cam.clip(A, B);
  if (!c) return;
  ctx.beginPath();
  ctx.moveTo(c[0].x, c[0].y);
  ctx.lineTo(c[1].x, c[1].y);
  ctx.stroke();
}

export function poly3(ctx, cam, pts, close = false) {
  ctx.beginPath();
  let started = false;
  for (let i = 0; i + 1 < pts.length + (close ? 1 : 0); i++) {
    const c = cam.clip(pts[i], pts[(i + 1) % pts.length]);
    if (!c) {
      started = false;
      continue;
    }
    if (!started) ctx.moveTo(c[0].x, c[0].y);
    ctx.lineTo(c[1].x, c[1].y);
    started = true;
  }
}

// 把多边形（都在相机前方）投影成一条封闭路径
export function quad3(ctx, cam, pts) {
  const q = pts.map((p) => cam.p(p));
  if (q.some((p) => !p)) return false;
  ctx.beginPath();
  q.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  return true;
}

// 在任意平面上逐字排字。O 是整行中心，U 是行方向，V 是字的上方向，size 是字高（世界单位）。
// 每个字按所在位置的局部透视做仿射变换。
export function textOn(ctx, cam, str, O, U, V, size, o = {}) {
  const chars = [...str];
  const gap = o.gap ?? 1.04;
  ctx.save();
  ctx.font = font(o.weight ?? 900, 100, o.family ?? SONG);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  if (o.blur) ctx.filter = `blur(${o.blur}px)`;
  const half = size / 2;
  const align = o.align ?? 'center';
  // 按实际字宽排，数字和西文不占整格
  const centers = [];
  let run = 0;
  for (const ch of chars) {
    const w = (ctx.measureText(ch).width / 100) * size;
    centers.push(run + w / 2);
    run += w + (gap - 1) * size;
  }
  run -= (gap - 1) * size;
  const start = align === 'center' ? -run / 2 : align === 'left' ? 0 : -run;
  chars.forEach((ch, i) => {
    if (ch === ' ') return;
    const P = add(O, mul(U, start + centers[i]));
    const pc = cam.p(P);
    const pu = cam.p(add(P, mul(U, half)));
    const pv = cam.p(add(P, mul(V, half)));
    if (!pc || !pu || !pv) return;
    ctx.setTransform((pu.x - pc.x) / 50, (pu.y - pc.y) / 50, -(pv.x - pc.x) / 50, -(pv.y - pc.y) / 50, pc.x, pc.y);
    const paint = typeof o.fill === 'function' ? o.fill(i, pc) : o.fill;
    if (o.stroke) {
      ctx.strokeStyle = typeof o.stroke === 'function' ? o.stroke(i, pc) : o.stroke;
      ctx.lineWidth = o.lineWidth ?? 4;
      ctx.lineCap = 'round';
      if (o.dash) ctx.setLineDash(typeof o.dash === 'function' ? o.dash(i) : o.dash);
      ctx.strokeText(ch, 0, 0);
    }
    if (paint) {
      ctx.fillStyle = paint;
      ctx.fillText(ch, 0, 0);
    }
  });
  ctx.restore();
}

let grain;
function paperGrain() {
  if (grain) return grain;
  grain = new OffscreenCanvas(W, H);
  const g = grain.getContext('2d');
  const r = rng(71);
  for (let i = 0; i < 30000; i++) {
    g.fillStyle = `rgba(70,50,25,${r() * 0.045})`;
    g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2);
  }
  g.strokeStyle = 'rgba(70,50,25,0.035)';
  for (let i = 0; i < 1100; i++) {
    const x = r() * W;
    const y = r() * H;
    const a = r() * Math.PI;
    const l = 8 + r() * 26;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  return grain;
}

export function paper(ctx) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H * 0.46, 200, W / 2, H * 0.5, 1250);
  g.addColorStop(0, 'rgba(255,255,255,0.4)');
  g.addColorStop(0.55, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(120,100,70,0.16)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(paperGrain(), 0, 0);
}

export function night(ctx, sx = W / 2, sy = -80, k = 1) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.dark;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 1250);
  g.addColorStop(0, `rgba(120,108,96,${0.34 * k})`);
  g.addColorStop(0.5, `rgba(70,62,56,${0.13 * k})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

export function wash(ctx, color, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = clamp(alpha);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

const layouts = new Map();
// 一行横排文字的逐字位置。accent: [{ word, color, weight, px }]
export function layout(ctx, o) {
  const key = [o.text, o.x, o.px, o.weight, o.family, o.track, o.align, JSON.stringify(o.accent ?? '')].join('|');
  if (layouts.has(key)) return layouts.get(key);
  const chars = [...o.text];
  const styles = chars.map(() => ({ weight: o.weight ?? 400, px: o.px, color: null }));
  for (const a of o.accent ?? []) {
    const at = o.text.indexOf(a.word);
    if (at < 0) throw new Error(`强调词不在文字里：${a.word}`);
    const from = [...o.text.slice(0, at)].length;
    for (let i = 0; i < [...a.word].length; i++) Object.assign(styles[from + i], { color: a.color, weight: a.weight ?? styles[from + i].weight });
  }
  const track = (o.track ?? 0.08) * o.px;
  let x = 0;
  const out = chars.map((ch, i) => {
    ctx.font = font(styles[i].weight, styles[i].px, o.family ?? SONG);
    const w = ctx.measureText(ch).width;
    const item = { ch, x, w, ...styles[i] };
    x += w + track;
    return item;
  });
  const width = x - track;
  const shift = o.align === 'right' ? -width : o.align === 'center' ? -width / 2 : 0;
  out.forEach((c) => (c.x += o.x + shift));
  out.width = width;
  layouts.set(key, out);
  return out;
}

// 逐字出现的横排文字。at、out 以拍为单位；没有 per 时整行同时出现。
export function say(ctx, f, o) {
  const start = Math.round(o.at * FPB);
  if (f < start) return;
  let alpha = o.alpha ?? 1;
  if (o.out != null) alpha *= 1 - seg(f, Math.round(o.out * FPB) - (o.fade ?? 8), Math.round(o.out * FPB));
  if (alpha <= 0) return;
  const cells = layout(ctx, o);
  const n = o.per ? Math.floor((f - start) / o.per) + 1 : cells.length;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  cells.forEach((c, i) => {
    if (i >= n) return;
    const age = o.per ? f - start - i * o.per : f - start;
    ctx.globalAlpha = alpha * clamp((age + 1) / 2);
    ctx.font = font(c.weight, c.px, o.family ?? SONG);
    ctx.fillStyle = c.color ?? o.color;
    ctx.fillText(c.ch, c.x, o.y);
  });
  ctx.restore();
}

export function corner(ctx, f, page, dark) {
  const lines = CORNERS[page.id];
  if (!lines) return;
  // 第 6 页最后两拍年份开始滚动，角标在滚动前收掉
  const end = (page.id === 'turn' ? 90 : page.endBeat) * FPB;
  const a = seg(f, page.frame + 6, page.frame + 16) * (1 - seg(f, end - 8, end - 1));
  if (a <= 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = a;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '3px';
  ctx.font = font(400, 27);
  ctx.fillStyle = dark ? rgba(C.white, 0.82) : rgba(C.ink, 0.78);
  ctx.fillText(lines[0], W - 96, 92);
  ctx.letterSpacing = '1px';
  ctx.font = font(400, 23, MONO);
  ctx.fillStyle = dark ? rgba(C.fog, 0.95) : rgba(C.mid, 0.8);
  ctx.fillText(lines[1], W - 98, 128);
  ctx.restore();
}

export function note(ctx, text, dark, alpha = 1, x = W - 98, y = H - 64) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '2px';
  ctx.font = font(400, 24);
  ctx.fillStyle = dark ? rgba(C.fog, 0.9) : rgba(C.mid, 0.7);
  ctx.fillText(text, x, y);
  ctx.restore();
}

const masks = new Map();
// 单字的墨迹掩模，u、v 在 0—1 之间，v 向下
export function mask(ch, weight = 900, family = SONG, N = 96) {
  const key = ch + weight + family + N;
  if (masks.has(key)) return masks.get(key);
  const c = new OffscreenCanvas(N, N);
  const g = c.getContext('2d', { willReadFrequently: true });
  g.font = font(weight, N, family);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(ch, N / 2, N / 2);
  const d = g.getImageData(0, 0, N, N).data;
  const m = { N, at: (u, v) => d[(Math.min(N - 1, Math.floor(v * N)) * N + Math.min(N - 1, Math.floor(u * N))) * 4 + 3] > 110 };
  masks.set(key, m);
  return m;
}

// 在字的墨迹内随机取点
export function inkPoint(ch, r, weight = 900) {
  const m = mask(ch, weight);
  for (let k = 0; k < 400; k++) {
    const u = r();
    const v = r();
    if (m.at(u, v)) return [u, v];
  }
  return [0.5, 0.5];
}
