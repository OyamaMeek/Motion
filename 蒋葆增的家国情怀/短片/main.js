import {BEAT_FRAMES, CREED_SNAP_BEAT, FRAME_COUNT, OPEN_SNAP_BEAT, PAGES, frameState} from './timeline.js';
import {MOTTO, SCRIPT} from './script.js';

const W = 1920, H = 1080;
const DARK = '#0E0D0B', SHADE = '#1A1816', INK2 = '#2A2723', DEEP = '#4B4541', FOG = '#8A8681', MIST = '#C4BFBA', LIGHT = '#FAF6F2';
const ACCENT = '#FD602A', ACCENT_TOP = '#F3815A', ACCENT_SIDE = '#BE3D24', RED = '#A9321B';
const SONG = '"Songti SC"';
const font = (size, weight = 400) => `${weight} ${size}px ${SONG}`;
const MONO = size => `400 ${size}px Menlo`;
const DIN = size => `700 ${size}px "DIN Condensed"`;
const LEFT = 150, SAFE_L = 80, SAFE_R = W - 80;
const NARR = font(44), NARR_SPACING = '5px';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const out = x => 1 - (1 - x) ** 3;
const inQ = x => x * x * x;
const seg = (b, b0, b1) => clamp((b - b0) / (b1 - b0));
// 落下后带一次回弹
const drop = x => (x < 0.7 ? (x / 0.7) ** 2 : 1 - 0.06 * Math.sin(Math.PI * (x - 0.7) / 0.3));

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const stage = document.getElementById('stage');
const ctx = stage.getContext('2d');
const canvas = (w = W, h = H) => Object.assign(document.createElement('canvas'), {width: w, height: h});

function report(message) {
  if (!window.renderErrors.includes(message)) window.renderErrors.push(message);
}

// ---------- 底：暗场、顶部聚光、暗角、浮尘、胶片颗粒 ----------

function makeGround() {
  const c = canvas();
  const g = c.getContext('2d');
  g.fillStyle = DARK; g.fillRect(0, 0, W, H);
  const spot = g.createRadialGradient(W * 0.45, -160, 60, W * 0.45, -160, 1300);
  spot.addColorStop(0, 'rgba(250,240,225,0.11)');
  spot.addColorStop(1, 'rgba(250,240,225,0)');
  g.fillStyle = spot; g.fillRect(0, 0, W, H);
  const v = g.createRadialGradient(W / 2, H / 2, 420, W / 2, H / 2, 1150);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  return c;
}

function makeGrain() {
  const c = canvas(512, 512);
  const g = c.getContext('2d');
  const img = g.createImageData(512, 512);
  const r = rng(7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = r() > 0.5 ? 255 : 0;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = r() * 16;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// 雾：模糊的随机团块，横向可平铺
function makeFog(seed) {
  const c = canvas(2400, 700);
  const g = c.getContext('2d');
  const r = rng(seed);
  g.filter = 'blur(40px)';
  for (let i = 0; i < 90; i++) {
    const x = r() * 2400, y = 150 + r() * 400, rad = 80 + r() * 220;
    for (const dx of [-2400, 0, 2400]) {
      const grad = g.createRadialGradient(x + dx, y, 0, x + dx, y, rad);
      grad.addColorStop(0, `rgba(200,194,186,${0.08 + r() * 0.1})`);
      grad.addColorStop(1, 'rgba(200,194,186,0)');
      g.fillStyle = grad; g.fillRect(x + dx - rad, y - rad, rad * 2, rad * 2);
    }
  }
  return c;
}

// 电路板底纹：只有横竖走线和过孔，不仿任何真实电路
function makeCircuit() {
  const c = canvas();
  const g = c.getContext('2d');
  const r = rng(31);
  g.strokeStyle = '#2C2825'; g.lineWidth = 2; g.fillStyle = '#2C2825';
  for (let i = 0; i < 120; i++) {
    let x = Math.round(r() * 48) * 40, y = Math.round(r() * 27) * 40;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      if (r() > 0.5) x += (r() > 0.5 ? 1 : -1) * Math.round(1 + r() * 5) * 40;
      else y += (r() > 0.5 ? 1 : -1) * Math.round(1 + r() * 4) * 40;
      g.lineTo(x, y);
    }
    g.stroke();
    g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill();
  }
  return c;
}

// 收尾两页的米白纸面：中心略亮、四周略暗。全片只在这里翻转一次亮暗。
const PAPER = '#F6F3EB', INK = '#070300', PAPER_PAGES = new Set(['ours', 'end']);
function makePaper() {
  const c = canvas();
  const g = c.getContext('2d');
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  const v = g.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1200);
  v.addColorStop(0, 'rgba(255,255,255,0.16)');
  v.addColorStop(1, 'rgba(90,70,40,0.12)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  return c;
}
const GROUND = makeGround(), PAPER_GROUND = makePaper(), GRAIN = makeGrain(), FOG_A = makeFog(3), FOG_B = makeFog(9), CIRCUIT = makeCircuit();
const DUST = (() => {
  const r = rng(77);
  return Array.from({length: 150}, () => ({x: r() * W, y: r() * H, z: 0.3 + r() * 0.7, p: r() * 6.28}));
})();

function dust(g, n, amount = 1) {
  for (const d of DUST) {
    const x = (d.x + n * 0.25 * d.z) % W, y = (d.y + n * 0.12 * d.z + Math.sin(n * 0.02 + d.p) * 8) % H;
    g.globalAlpha = amount * (0.12 + 0.3 * d.z) * (0.7 + 0.3 * Math.sin(n * 0.05 + d.p));
    g.fillStyle = LIGHT;
    g.fillRect(x, y, 1.2 + 1.8 * d.z, 1.2 + 1.8 * d.z);
  }
  g.globalAlpha = 1;
}

function grain(g, n) {
  const r = rng(n + 1);
  const ox = Math.floor(r() * 512), oy = Math.floor(r() * 512);
  g.globalCompositeOperation = 'overlay';
  for (let y = -oy; y < H; y += 512) for (let x = -ox; x < W; x += 512) g.drawImage(GRAIN, x, y);
  g.globalCompositeOperation = 'source-over';
}

// ---------- 文字 ----------

function setFont(g, f, spacing = '0px') {
  g.font = f; g.letterSpacing = spacing; g.textBaseline = 'alphabetic';
}

function text(g, str, x, y, f, color, align = 'left', spacing = '0px') {
  setFont(g, f, spacing);
  g.fillStyle = color; g.textAlign = align;
  const w = g.measureText(str).width;
  const x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  if (x0 < SAFE_L - 1 || x0 + w > SAFE_R + 1) report(`超出安全区：${str}`);
  g.fillText(str, x, y);
  g.letterSpacing = '0px';
  return w;
}

// 逐字出现，每字 3 帧（0.1 秒），从 line.at 指定的拍点起打。
function shown(line, s) {
  const start = Math.round(line.at * BEAT_FRAMES);
  if (s.local < start) return '';
  const chars = [...line.text];
  return chars.slice(0, Math.min(chars.length, Math.floor((s.local - start) / 3) + 1)).join('');
}

function typed(g, line, s, x, y, f = NARR, color = LIGHT, align = 'left', spacing = NARR_SPACING) {
  const str = shown(line, s);
  if (!str) return 0;
  setFont(g, f, spacing);
  const full = g.measureText(line.text).width;
  const x0 = align === 'right' ? x - full : x;
  if (x0 < SAFE_L || x0 + full > SAFE_R) report(`超出安全区：${line.text}`);
  g.fillStyle = color; g.textAlign = align;
  g.fillText(align === 'right' ? line.text.slice(0, str.length) : str, x, y);
  g.letterSpacing = '0px';
  return full;
}

// 文字崩塌：每个字带一点旋转向下坠落，t 从 0 到 1
function collapse(g, str, x, y, f, color, t, seed, spacing = NARR_SPACING) {
  setFont(g, f, spacing);
  g.textAlign = 'left';
  const r = rng(seed);
  let cx = x;
  for (const ch of str) {
    const w = g.measureText(ch).width;
    const delay = r() * 0.35, k = clamp((t - delay) / (1 - delay));
    g.save();
    g.translate(cx + w / 2, y + 900 * inQ(k));
    g.rotate((r() - 0.5) * 1.6 * k);
    g.globalAlpha = 1 - k * 0.8;
    g.fillStyle = color;
    g.fillText(ch, -w / 2, 0);
    g.restore();
    cx += w;
  }
  g.letterSpacing = '0px';
}

function narration(g, line, s, x, y, endFall, seed, f = NARR, color = LIGHT) {
  if (s.b >= endFall) collapse(g, line.text, x, y, f, color, seg(s.b, endFall, endFall + 1.6), seed);
  else typed(g, line, s, x, y, f, color);
}

function corner(g, lines, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  text(g, lines[0].text, SAFE_R, 78, font(24), MIST, 'right');
  text(g, lines[1].text, SAFE_R, 110, MONO(19), FOG, 'right');
  g.strokeStyle = FOG; g.lineWidth = 1;
  g.beginPath(); g.moveTo(SAFE_R - 46, 126); g.lineTo(SAFE_R, 126); g.stroke();
  g.restore();
}

function source(g, line) {
  text(g, line.text, LEFT, 1030, font(18), DEEP);
}

function demo(g, line, x, y, align = 'right') {
  text(g, line.text, x, y, font(20), DEEP, align);
}

// 手绘红圈：抖动的椭圆，按进度画出
function redCircle(g, cx, cy, rx, ry, k, seed) {
  if (k <= 0) return;
  const r = rng(seed);
  const wob = Array.from({length: 9}, () => r());
  g.save();
  g.strokeStyle = RED; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath();
  const total = Math.PI * 2.15 * k;
  for (let a = 0; a <= total; a += 0.05) {
    const j = 1 + 0.05 * Math.sin(a * 3 + wob[0] * 6) + 0.03 * Math.sin(a * 7 + wob[1] * 6);
    const x = cx + rx * j * Math.cos(a - 2.4), y = cy + ry * j * Math.sin(a - 2.4) + a * 2;
    a === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.stroke();
  g.restore();
}

function frameBox(g, x, y, w, h, k) {
  if (k <= 0) return;
  g.strokeStyle = FOG; g.lineWidth = 1.5;
  const p = 2 * (w + h) * k;
  g.beginPath(); g.moveTo(x, y);
  const pts = [[x + w, y], [x + w, y + h], [x, y + h], [x, y]];
  let left = p, cx = x, cy = y;
  for (const [px, py] of pts) {
    const d = Math.hypot(px - cx, py - cy);
    if (left >= d) { g.lineTo(px, py); left -= d; cx = px; cy = py; }
    else { g.lineTo(cx + (px - cx) * left / d, cy + (py - cy) * left / d); break; }
  }
  g.stroke();
}

// ---------- 由字形均匀取点 ----------

function glyphPoints(rows, size, count, seed, accentFrom = -1) {
  const c = canvas();
  const g = c.getContext('2d');
  g.font = font(size, 900); g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
  const boxes = [];
  for (const {str, x, y} of rows) {
    let cx = x;
    for (const ch of str) {
      const w = g.measureText(ch).width;
      g.fillText(ch, cx, y);
      boxes.push({x0: cx, x1: cx + w, y0: y - size, y1: y + size * 0.2});
      cx += w;
    }
  }
  const data = g.getImageData(0, 0, W, H).data;
  let pts = [];
  for (let step = 14; step >= 2 && pts.length < count; step--) {
    pts = [];
    for (let y = 0; y < H; y += step) for (let x = (y / step % 2) * step / 2; x < W; x += step) if (data[(y * W + Math.round(x)) * 4 + 3] > 140) pts.push({x: Math.round(x), y});
  }
  if (pts.length < count) throw new Error(`字形取点不足：${pts.length} < ${count}`);
  const picked = Array.from({length: count}, (_, i) => pts[Math.floor(i * pts.length / count)]);
  const r = rng(seed);
  for (let i = picked.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [picked[i], picked[j]] = [picked[j], picked[i]]; }
  const acc = accentFrom >= 0 ? boxes.slice(accentFrom, accentFrom + 2) : [];
  return picked.map(p => ({...p, accent: acc.some(bx => p.x >= bx.x0 && p.x < bx.x1 && p.y >= bx.y0 && p.y <= bx.y1)}));
}

function scatter(n, seed, box) {
  const r = rng(seed);
  return Array.from({length: n}, () => ({x: lerp(box[0], box[2], r()), y: lerp(box[1], box[3], r()), d: r()}));
}

const L = {
  name: {size: 260, x: 250, y: 600},
  creed: {size: 150, x: LEFT, y: 680},
  drones: {size: 190, x: 900, y: [450, 690]},
  year: {size: 440, x: 110, y: 660},
  word: {size: 112, x: LEFT, y: 560},
};
let P = {};
function prepare() {
  P.name = glyphPoints([{str: SCRIPT.open.name.text, x: L.name.x, y: L.name.y}], L.name.size, 1700, 3);
  P.nameFrom = scatter(P.name.length, 21, [0, 0, 1, 1]);
  P.creed = glyphPoints([{str: MOTTO.text, x: L.creed.x, y: L.creed.y}], L.creed.size, 1700, 5, 7);
  P.creedFrom = scatter(P.creed.length, 22, [80, 150, 1840, 980]);
  P.drones = glyphPoints(MOTTO.lines.map((str, i) => ({str, x: L.drones.x, y: L.drones.y[i]})), L.drones.size, 2026, 9, 6);
  P.dronesFrom = scatter(P.drones.length, 23, [760, H + 20, 1800, H + 280]);
  P.year = glyphPoints([{str: SCRIPT.y1979.year.text, x: L.year.x, y: L.year.y}], L.year.size, 900, 13);
  P.yearFall = scatter(P.year.length, 29, [-1, 0, 1, 1]);
  P.words = SCRIPT.plan.words.map((w, i) => glyphPoints([{str: w.text, x: L.word.x, y: L.word.y}], L.word.size, 1100, 40 + i));
  P.wordsFrom = scatter(1100, 24, [60, 380, 1300, 1000]);
  P.yearMask = canvas();
  const mg = P.yearMask.getContext('2d');
  mg.font = font(L.year.size, 900); mg.textBaseline = 'alphabetic'; mg.fillStyle = '#000';
  mg.fillText(SCRIPT.y1979.year.text, L.year.x, L.year.y);
  P.work = canvas();
}

// 点阵：从起点飞向字形，t 为 0–1
function cloud(g, pts, from, t, size, color, accent = ACCENT, delay = 0.4) {
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], f = from[i % from.length];
    const k = ease(clamp((t - f.d * delay) / (1 - delay)));
    g.globalAlpha = 0.35 + 0.65 * k;
    g.fillStyle = p.accent ? accent : color;
    g.fillRect(lerp(f.x, p.x, k) - size / 2, lerp(f.y, p.y, k) - size / 2, size, size);
  }
  g.globalAlpha = 1;
}

// 点阵散开下落，t 为 0–1
function rain(g, pts, t, size, color, seed) {
  const r = rng(seed);
  for (const p of pts) {
    const d = r() * 0.5, k = clamp((t - d) / (1 - d)), drift = (r() - 0.5) * 60;
    if (k <= 0) { g.globalAlpha = 1; g.fillStyle = color; g.fillRect(p.x - size / 2, p.y - size / 2, size, size); continue; }
    g.globalAlpha = 0.9 * (1 - k);
    g.fillStyle = p.accent ? ACCENT : color;
    g.fillRect(p.x + drift * k, p.y + 520 * inQ(k), size * 0.8, size * (1 + 3 * k));
  }
  g.globalAlpha = 1;
}

// ---------- 物件 ----------

// 橙色方块，正面白字，顶面受光、侧面背光、下方短软投影
function cube(g, x, y, s, ch, dim = 0, glow = 0) {
  const d = s * 0.2;
  // dim 为 0–1：方块向暗红褐退色，用于“关灯”后的其余方块
  const mix = (c, k) => {
    const a = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), t = [42, 35, 32];
    return `rgb(${a.map((v, i) => Math.round(lerp(v, t[i], 0.8 * k))).join(',')})`;
  };
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.beginPath(); g.ellipse(x + s * 0.55, y + s + 10, s * 0.62, s * 0.12, 0, 0, Math.PI * 2); g.fill();
  if (glow) { g.shadowColor = ACCENT; g.shadowBlur = 40 * glow; }
  g.fillStyle = mix(ACCENT, dim); g.fillRect(x, y, s, s);
  g.shadowBlur = 0;
  g.fillStyle = mix(ACCENT_TOP, dim);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + d, y - d); g.lineTo(x + s + d, y - d); g.lineTo(x + s, y); g.fill();
  g.fillStyle = mix(ACCENT_SIDE, dim);
  g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + s + d, y - d); g.lineTo(x + s + d, y + s - d); g.lineTo(x + s, y + s); g.fill();
  g.fillStyle = dim > 0 ? `rgba(250,246,242,${1 - 0.7 * dim})` : LIGHT;
  g.font = font(Math.round(s * 0.74), 900); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillText(ch, x + s / 2, y + s * 0.8);
  g.restore();
}

// “尽力”两块小方块：贯穿全片的关键物
function keyCubes(g, x, y, s, glow = 0) {
  cube(g, x, y, s, '尽', 0, glow);
  cube(g, x + s * 1.12, y, s, '力', 0, glow);
}

// 无脸剪影：长外套，只有缓慢行走或站立
function figure(g, x, y, h, walk, color = '#151311') {
  const u = h / 10;
  const sw = Math.sin(walk) * u * 0.9;
  g.save();
  g.fillStyle = color; g.strokeStyle = color; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y - 9.1 * u, u * 0.75, 0, Math.PI * 2); g.fill();
  g.beginPath();
  g.moveTo(x - 0.9 * u, y - 8.1 * u); g.lineTo(x + 0.9 * u, y - 8.1 * u);
  g.lineTo(x + 1.5 * u, y - 3 * u); g.lineTo(x - 1.5 * u, y - 3 * u); g.closePath(); g.fill();
  g.lineWidth = u * 0.7;
  g.beginPath(); g.moveTo(x - 0.5 * u, y - 3.2 * u); g.lineTo(x - 0.5 * u + sw, y);
  g.moveTo(x + 0.5 * u, y - 3.2 * u); g.lineTo(x + 0.5 * u - sw, y); g.stroke();
  g.restore();
  g.strokeStyle = 'rgba(196,191,186,0.35)'; g.lineWidth = 1.5;
  g.beginPath(); g.ellipse(x, y + 4, u * 3, u * 0.6, 0, 0, Math.PI * 2); g.stroke();
}

// 电子管结构示意，reveal 为自下而上画出的进度
function tube(g, cx, cy, s, reveal, glow, color) {
  g.save();
  g.translate(cx, cy); g.scale(s, s);
  g.beginPath(); g.rect(-200, 330 - 660 * reveal, 400, 700); g.clip();
  g.strokeStyle = color; g.lineWidth = 3 / s; g.lineCap = 'round'; g.lineJoin = 'round';
  g.shadowColor = color; g.shadowBlur = 12;
  g.beginPath();
  g.moveTo(-120, 200); g.lineTo(-120, -160);
  g.bezierCurveTo(-120, -300, 120, -300, 120, -160);
  g.lineTo(120, 200); g.stroke();
  g.beginPath(); g.moveTo(-10, -262); g.lineTo(0, -292); g.lineTo(10, -262); g.stroke();
  g.strokeRect(-140, 200, 280, 80);
  for (const px of [-90, -30, 30, 90]) { g.beginPath(); g.moveTo(px, 280); g.lineTo(px, 330); g.stroke(); }
  g.strokeRect(-80, -150, 160, 270);
  g.beginPath();
  for (let i = 0; i <= 14; i++) { const y = -130 + i * 17; g.moveTo(-48, y); g.lineTo(48, y + 6); }
  g.moveTo(-48, -134); g.lineTo(-48, 112); g.moveTo(48, -128); g.lineTo(48, 118);
  g.stroke();
  for (const px of [-60, 60]) { g.beginPath(); g.moveTo(px, 120); g.lineTo(px, 200); g.stroke(); }
  g.restore();
  if (glow > 0) {
    g.save();
    g.translate(cx, cy); g.scale(s, s);
    g.strokeStyle = ACCENT; g.lineWidth = 5; g.shadowColor = ACCENT; g.shadowBlur = 30 * glow; g.globalAlpha = glow;
    g.beginPath(); g.moveTo(-18, 200); g.lineTo(-18, -110); g.lineTo(0, -126); g.lineTo(18, -110); g.lineTo(18, 200); g.stroke();
    g.restore();
  }
}

// 透视文字平原：小字铺成地面，中间一条亮路通向灭点；z 越大越远
const PLAIN_ROW = '国家大事千万尽力'.repeat(14);
function plain(g, b, alpha, speed = 0.55) {
  const hy = 360, vx = 960;
  g.save();
  const road = g.createLinearGradient(0, hy, 0, H);
  road.addColorStop(0, 'rgba(250,246,242,0.25)');
  road.addColorStop(1, 'rgba(250,246,242,0.07)');
  g.globalAlpha = alpha;
  g.fillStyle = road;
  g.beginPath(); g.moveTo(vx - 6, hy); g.lineTo(vx + 6, hy); g.lineTo(vx + 260, H); g.lineTo(vx - 260, H); g.fill();
  for (let k = 0; k < 34; k++) {
    const z = 1 + ((k * 0.9 - b * speed) % 30.6 + 30.6) % 30.6;
    const y = hy + 720 / z;
    if (y > H + 40) continue;
    const size = Math.max(3, 70 / z);
    g.globalAlpha = alpha * clamp(1.2 - z / 26) * 0.9;
    g.fillStyle = z < 6 ? DEEP : INK2;
    g.font = font(Math.round(size), 700); g.textBaseline = 'alphabetic';
    const gap = 280 / z;
    g.textAlign = 'right'; g.fillText(PLAIN_ROW, vx - gap, y);
    g.textAlign = 'left'; g.fillText(PLAIN_ROW, vx + gap, y);
  }
  const fog = g.createLinearGradient(0, hy - 30, 0, hy + 120);
  fog.addColorStop(0, 'rgba(14,13,11,1)');
  fog.addColorStop(1, 'rgba(14,13,11,0)');
  g.globalAlpha = 1;
  g.fillStyle = fog; g.fillRect(0, hy - 30, W, 150);
  g.restore();
}

function fogScene(g, n, alpha) {
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, 'rgba(14,13,11,0)');
  sky.addColorStop(0.58, `rgba(66,61,56,${0.85 * alpha})`);
  sky.addColorStop(0.66, `rgba(40,37,34,${0.9 * alpha})`);
  sky.addColorStop(1, `rgba(16,15,13,${alpha})`);
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.globalAlpha = 0.9 * alpha;
  const xa = -((n * 0.6) % 2400), xb = -((n * 0.25) % 2400);
  g.drawImage(FOG_B, xb, 220); g.drawImage(FOG_B, xb + 2400, 220);
  g.drawImage(FOG_A, xa, 420); g.drawImage(FOG_A, xa + 2400, 420);
  g.globalAlpha = 1;
}

function lightOrb(g, x, y, r, a) {
  const halo = g.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2);
  halo.addColorStop(0, `rgba(250,240,225,${0.35 * a})`);
  halo.addColorStop(1, 'rgba(250,240,225,0)');
  g.fillStyle = halo; g.fillRect(x - r * 3.3, y - r * 3.3, r * 6.6, r * 6.6);
  g.fillStyle = `rgba(250,246,242,${a})`;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  const road = g.createLinearGradient(0, 760, 0, H);
  road.addColorStop(0, `rgba(250,246,242,${0.55 * a})`);
  road.addColorStop(1, `rgba(250,246,242,${0.08 * a})`);
  g.fillStyle = road;
  g.beginPath(); g.moveTo(x - r * 0.08, 760); g.lineTo(x + r * 0.08, 760); g.lineTo(x + r * 1.1, H); g.lineTo(x - r * 1.1, H); g.fill();
  g.fillStyle = 'rgba(42,39,35,0.9)'; g.fillRect(0, 758, W, 2);
}

// 一个大字竖排满屏，下一拍缩进左侧列表
function bigVertical(g, str, x, k, color) {
  const size = 280;
  setFont(g, font(size, 900)); g.textAlign = 'center';
  [...str].forEach((ch, i) => {
    g.globalAlpha = 1 - k;
    g.fillStyle = color;
    g.fillText(ch, x, 400 + i * (size + 10) - 40 * k);
  });
  g.globalAlpha = 1;
}

function orbs(g, s, kinds, x0, y0) {
  const r = rng(51);
  const spots = [];
  let row = 0, i = 0;
  while (i < kinds.length) {
    const n = 12 - row;
    for (let c = 0; c < n && i < kinds.length; c++, i++) spots.push({x: x0 + (row * 0.5 + c) * 56 + (r() - 0.5) * 8, y: y0 - row * 50 + (r() - 0.5) * 6});
    row++;
  }
  let landed = 0;
  kinds.forEach((kind, k) => {
    const start = 30 + k;
    const t = clamp((s.local - start) / 14);
    if (t <= 0) return;
    if (t >= 1) landed++;
    const p = spots[k];
    const x = lerp(p.x + 220, p.x, t), y = lerp(-80, p.y, drop(t));
    const base = {prof: ACCENT, assoc: LIGHT, lect: MIST, staff: DEEP}[kind];
    const grad = g.createRadialGradient(x - 9, y - 10, 3, x, y, 27);
    grad.addColorStop(0, kind === 'prof' ? ACCENT_TOP : '#FFFFFF');
    grad.addColorStop(0.35, base);
    grad.addColorStop(1, kind === 'prof' ? ACCENT_SIDE : SHADE);
    g.fillStyle = grad;
    g.beginPath(); g.arc(x, y, 26, 0, Math.PI * 2); g.fill();
  });
  return landed;
}

// ---------- 各页 ----------

const KINDS = [...Array(22).fill('staff'), ...Array(30).fill('lect'), ...Array(3).fill('assoc'), ...Array(3).fill('prof')];

const DRAW = {
  open(g, s) {
    const b = s.b, a = SCRIPT.open;
    if (b < OPEN_SNAP_BEAT) {
      // 墨点从中心炸开，再聚成人名
      for (let i = 0; i < P.name.length; i++) {
        const p = P.name[i], f = P.nameFrom[i];
        const ang = f.x * Math.PI * 2, rad = 120 + 560 * f.y;
        const bx = 960 + Math.cos(ang) * rad, by = 540 + Math.sin(ang) * rad * 0.6;
        const burst = out(seg(b, 0, 1.2)), back = ease(seg(b, 1.2 + f.d * 0.6, OPEN_SNAP_BEAT));
        const x = lerp(lerp(960, bx, burst), p.x, back), y = lerp(lerp(540, by, burst), p.y, back);
        g.globalAlpha = 0.4 + 0.6 * back;
        g.fillStyle = LIGHT;
        g.fillRect(x - 2, y - 2, 4, 4);
      }
      g.globalAlpha = 1;
    } else if (b < 8.6) {
      const pop = 1 + 0.03 * (1 - out(seg(b, OPEN_SNAP_BEAT, OPEN_SNAP_BEAT + 0.6)));
      text(g, a.name.text, L.name.x, L.name.y, font(Math.round(L.name.size * pop), 900), LIGHT);
    } else rain(g, P.name, seg(b, 8.6, 10), 4, LIGHT, 61);
    const fade = 1 - seg(b, 8.4, 9.4);
    g.globalAlpha = fade;
    typed(g, a.role, s, L.name.x + 12, 700, font(38), MIST);
    typed(g, a.term, s, L.name.x + 12, 760, MONO(30), FOG, 'left', '2px');
    g.globalAlpha = 1;
  },

  motto(g, s) {
    const b = s.b, a = SCRIPT.motto;
    plain(g, b, 1);
    const chars = [...MOTTO.lines[0], ...MOTTO.lines[1]];
    const rise = ease(seg(b, 11, 13.6));
    chars.forEach((ch, i) => {
      const at = a.cubes.at + i * 0.5;
      const t = clamp((b - at) / 0.5);
      if (t <= 0) return;
      const row = i < 4 ? 0 : 1, col = i % 4;
      const size = row ? 124 : 112;
      const x = (row ? 690 : 716) + col * (size + 16), y = (row ? 600 : 450);
      const key = i >= 6;
      const yy = lerp(y - 600, y, drop(t)) - (key ? 230 * rise : 0);
      cube(g, x, yy, size, ch, key ? 0 : 0.35 * rise, key ? rise : 0);
    });
    narration(g, a.lines[0], s, LEFT, 190, 99, 1);
    narration(g, a.lines[1], s, LEFT, 256, 99, 2);
    if (b >= 5) source(g, a.source);
  },

  newark(g, s) {
    const b = s.b, a = SCRIPT.newark;
    plain(g, 0, 0.22, 0);
    keyCubes(g, 1560, 170 + Math.sin(s.local * 0.08) * 6, 62, 0.6);
    const fade = 1 - seg(b, 12.6, 14);
    g.globalAlpha = fade;
    const pop = 1 + 0.025 * (1 - out(seg(b, 0, 0.6)));
    text(g, a.year.text, LEFT - 10, 560, font(Math.round(300 * pop), 900), LIGHT);
    typed(g, a.place, s, LEFT + 6, 700, font(72, 900), MIST, 'left', '8px');
    redCircle(g, LEFT + 260, 676, 300, 74, seg(b, 3, 3.8), 5);
    typed(g, a.lines[0], s, LEFT + 6, 860);
    g.globalAlpha = 1;
    corner(g, a.corner, fade);
    if (b >= 1) source(g, a.source);
  },

  plan(g, s) {
    const b = s.b, a = SCRIPT.plan;
    fogScene(g, s.local, 1);
    g.save();
    const push = 1 + 0.05 * ease(b / 16);
    g.translate(1300, 640); g.scale(push, push); g.translate(-1300, -640);
    tube(g, 1500, 470, 0.95, 1, 0.9 * out(seg(b, 1, 4)), `rgba(196,191,186,${0.75 * out(seg(b, 0, 3))})`);
    figure(g, lerp(820, 1080, b / 16), 720, 150, s.local * 0.16);
    g.restore();
    keyCubes(g, 1560, 170, 50, 0.4);
    narration(g, a.lines[0], s, LEFT, 200, 99, 3);
    narration(g, a.lines[1], s, LEFT, 266, 99, 4);
    narration(g, a.lines[2], s, LEFT, 332, 99, 5);
    // 粒子聚成第一组词，一拍后散成向下的粒子雨，第二组词再聚起
    const w0 = a.words[0], w1 = a.words[1];
    if (b >= w0.at && b < w1.at) {
      if (b < w1.at - 0.6) cloud(g, P.words[0], P.wordsFrom, seg(b, w0.at, w0.at + 1), 4.2, LIGHT);
      else rain(g, P.words[0], seg(b, w1.at - 0.6, w1.at), 4.2, LIGHT, 71);
    }
    if (b >= w1.at) {
      if (b < 15) cloud(g, P.words[1], P.wordsFrom, seg(b, w1.at, w1.at + 1), 4.2, LIGHT);
      else rain(g, P.words[1], seg(b, 15, 16), 4.2, LIGHT, 72);
    }
    corner(g, a.corner);
    if (b >= 1) { demo(g, a.demo, SAFE_R, 990); source(g, a.source); }
  },

  hire(g, s) {
    const b = s.b, a = SCRIPT.hire;
    // 年份落拍满屏，之后缩到左上
    const k = ease(seg(b, 0.6, 1.6));
    const size = Math.round(lerp(440, 190, k));
    g.save();
    setFont(g, font(size, 900)); g.textAlign = 'left';
    const yx = lerp(110, LEFT - 6, k), yy = lerp(700, 300, k);
    g.fillStyle = LIGHT; g.fillText(a.year.text, yx, yy);
    g.fillStyle = 'rgba(14,13,11,0.55)';
    const wYear = g.measureText(a.year.text).width;
    for (let y = yy - size * 0.75; y < yy; y += Math.max(6, size / 26)) g.fillRect(yx, y, wYear, 1.5);
    g.restore();
    narration(g, a.lines[0], s, LEFT, 420, 99, 6);
    narration(g, a.lines[1], s, LEFT, 486, 99, 7);
    narration(g, a.lines[2], s, LEFT, 580, 99, 8);
    typed(g, a.found, s, LEFT, 720, font(84, 900), LIGHT, 'left', '4px');
    const lx = 1110;
    if (b >= a.names[0].at) {
      text(g, a.listHead.text, lx, 350, font(22), FOG);
      g.strokeStyle = DEEP; g.lineWidth = 1; g.beginPath(); g.moveTo(lx, 366); g.lineTo(lx + 230, 366); g.stroke();
    }
    a.names.forEach((n, i) => {
      if (b < n.at) return;
      const color = i === 0 ? ACCENT : LIGHT;
      const t = seg(b, n.at + 0.55, n.at + 1);
      if (t < 1) bigVertical(g, n.text, 1600, t, color);
      if (t > 0) {
        g.globalAlpha = t;
        text(g, n.text, lx, 430 + i * 70, font(48, i === 0 ? 900 : 400), color);
        g.globalAlpha = 1;
      }
    });
    redCircle(g, lx + 74, 414, 112, 42, seg(b, 14, 14.8), 8);
    corner(g, a.corner);
    if (b >= 1) source(g, a.source);
  },

  y1979(g, s) {
    const b = s.b, a = SCRIPT.y1979;
    const crumble = seg(b, 14, 16);
    // 顶光照在剪影上
    const cone = g.createLinearGradient(0, 0, 0, 960);
    cone.addColorStop(0, 'rgba(250,240,225,0.0)');
    cone.addColorStop(1, 'rgba(250,240,225,0.10)');
    g.fillStyle = cone;
    g.beginPath(); g.moveTo(560, 0); g.lineTo(640, 0); g.lineTo(760, 960); g.lineTo(440, 960); g.fill();
    figure(g, 600, 950, 120, 0);
    if (crumble < 1) {
      const pop = 1 + 0.02 * (1 - out(seg(b, 0, 0.6)));
      g.save();
      g.globalAlpha = 1 - crumble;
      g.translate(L.year.x, L.year.y); g.scale(pop, pop); g.translate(-L.year.x, -L.year.y);
      const wg = P.work.getContext('2d');
      wg.globalCompositeOperation = 'source-over';
      wg.clearRect(0, 0, W, H);
      wg.drawImage(P.yearMask, 0, 0);
      wg.globalCompositeOperation = 'source-in';
      wg.fillStyle = LIGHT; wg.fillRect(0, 0, W, H);
      // source-in 会清掉线条以外的像素，纹理线改用 source-atop，只画在字形内
      wg.globalCompositeOperation = 'source-atop';
      wg.fillStyle = 'rgba(14,13,11,0.5)';
      const shift = (s.local * 0.6) % 12;
      for (let y = 250 + shift; y < 700; y += 12) wg.fillRect(0, y, W, 2);
      g.drawImage(P.work, 0, 0);
      g.restore();
    }
    if (crumble > 0) {
      for (let i = 0; i < P.year.length; i++) {
        const p = P.year[i], f = P.yearFall[i];
        const t = clamp((crumble - f.d * 0.4) / 0.6);
        if (t <= 0) continue;
        g.fillStyle = LIGHT; g.globalAlpha = 0.85 * (1 - 0.5 * t);
        g.fillRect(p.x + f.x * 40 * t, p.y + 760 * inQ(t), 4, 4);
      }
      g.globalAlpha = 1;
    }
    const fade = 1 - seg(b, 13.6, 15);
    g.globalAlpha = fade;
    typed(g, a.lines[0], s, 1110, 330);
    typed(g, a.lines[1], s, 1110, 400);
    typed(g, a.thisYear, s, 1110, 560, font(40), MIST);
    if (b >= a.age.at) {
      const n = Math.round(73 * out(seg(b, a.age.at, a.age.at + 1)));
      text(g, String(n), 1104, 780, DIN(230), ACCENT);
      setFont(g, DIN(230));
      text(g, a.ageUnit.text, 1104 + g.measureText('73').width + 18, 780, font(80, 900), ACCENT);
    }
    typed(g, a.went, s, 1110, 870);
    g.globalAlpha = 1;
    corner(g, a.corner, fade);
    if (b >= 1) { demo(g, a.demo, 760, 1000, 'left'); source(g, a.source); }
  },

  aid(g, s) {
    const b = s.b, a = SCRIPT.aid;
    a.places.forEach((pl, i) => {
      if (b < pl.at) return;
      const t = seg(b, pl.at + 0.55, pl.at + 1);
      if (t < 1) bigVertical(g, pl.text, 1600, t, LIGHT);
    });
    if (b >= 1.55) {
      g.globalAlpha = seg(b, 1.55, 2);
      text(g, '成都 → 杭州', LEFT, 250, font(46, 900), MIST, 'left', '4px');
      g.globalAlpha = 1;
    }
    const landed = orbs(g, s, KINDS, 1060, 900);
    if (b >= a.count.at) {
      const w = text(g, String(landed), LEFT - 6, 560, DIN(260), LIGHT);
      text(g, '人', LEFT + w + 10, 560, font(60, 900), LIGHT);
    }
    if (b >= a.legend.at) {
      g.globalAlpha = out(seg(b, a.legend.at, a.legend.at + 0.6));
      const items = [[ACCENT, '教授 3'], [LIGHT, '副教授 3'], [MIST, '讲师 30'], [DEEP, '干部职工 22']];
      let lx = 1060;
      for (const [c, lab] of items) {
        g.fillStyle = c; g.beginPath(); g.arc(lx + 9, 992, 9, 0, Math.PI * 2); g.fill();
        lx += 26 + text(g, lab, lx + 26, 1000, MONO(20), MIST) + 34;
      }
      g.globalAlpha = 1;
      demo(g, a.demo, SAFE_R, 1040);
    }
    narration(g, a.lines[0], s, LEFT, 700, 99, 9);
    narration(g, a.lines[1], s, LEFT, 770, 99, 10);
    corner(g, a.corner);
    if (b >= 1) source(g, a.source);
  },

  exam(g, s) {
    const b = s.b, a = SCRIPT.exam;
    const step = a.subjects.filter(x => b >= x.at).length;
    const grow = step + (step ? out(seg(b, a.subjects[step - 1].at, a.subjects[step - 1].at + 0.4)) - 1 : 0);
    const fade = 1 - seg(b, 12.8, 14);
    g.globalAlpha = fade;
    lightOrb(g, 1000, 300, 46 + 22 * Math.max(0, grow), 0.25 + 0.2 * Math.max(0, grow));
    g.globalAlpha = 1;
    a.subjects.forEach((sub, i) => {
      if (b < sub.at) return;
      const t = seg(b, sub.at + 0.55, sub.at + 1);
      if (t < 1) bigVertical(g, sub.text, 1600, t, LIGHT);
      if (t > 0) {
        g.globalAlpha = t * fade;
        text(g, sub.text, LEFT + i * 150, 250, font(54, 900), MIST);
        g.globalAlpha = 1;
      }
    });
    g.globalAlpha = fade;
    typed(g, a.lines[0], s, LEFT, 420);
    typed(g, a.lines[1], s, LEFT, 486);
    typed(g, a.lines[2], s, LEFT, 600, font(52, 700));
    if (b >= a.first.at) {
      const t = seg(b, a.first.at, a.first.at + 0.5);
      text(g, a.total.text, 1430, 640, font(40), MIST);
      cube(g, 1430, lerp(80, 690, drop(t)), 120, '第', 0, 0.4);
      cube(g, 1566, lerp(40, 690, drop(clamp(t * 1.15 - 0.15))), 120, '一', 0, 0.4);
    }
    g.globalAlpha = 1;
    corner(g, a.corner, fade);
    if (b >= 1) source(g, a.source);
  },

  creed(g, s) {
    const b = s.b, a = SCRIPT.creed;
    const out2 = seg(b, 14, 16);
    // 暗灰字墙铺满背景，缓慢上移
    g.save();
    g.globalAlpha = 1 - out2;
    setFont(g, font(34, 700)); g.textAlign = 'left'; g.fillStyle = '#2E2A27';
    const shift = (s.local * 0.4) % 52;
    for (let y = 30 - shift, r = 0; y < H + 40; y += 52, r++) g.fillText(PLAIN_ROW.slice(r % 8), -20, y);
    g.restore();
    g.fillStyle = 'rgba(14,13,11,0.82)'; g.fillRect(LEFT - 30, 150, 640, 230);
    frameBox(g, LEFT - 30, 150, 640, 230, seg(b, 0.2, 1.2) * (1 - out2));
    g.globalAlpha = 1 - out2;
    typed(g, a.lines[0], s, LEFT, 220, font(40), MIST);
    typed(g, a.lines[1], s, LEFT, 280, font(40), MIST);
    typed(g, a.lines[2], s, LEFT, 340, font(40), MIST);
    g.globalAlpha = 1;
    const shrink = ease(out2);
    g.save();
    g.translate(lerp(0, 1440 - 830, shrink), lerp(0, 560 - 620, shrink));
    g.translate(830, 620); g.scale(lerp(1, 0.2, shrink), lerp(1, 0.2, shrink)); g.translate(-830, -620);
    if (b < CREED_SNAP_BEAT) {
      if (b >= a.motto.at) cloud(g, P.creed, P.creedFrom, seg(b, a.motto.at, CREED_SNAP_BEAT), 3.6, LIGHT);
    } else {
      setFont(g, font(L.creed.size, 900)); g.textAlign = 'left';
      const head = MOTTO.text.slice(0, 7);
      g.fillStyle = LIGHT; g.fillText(head, L.creed.x, L.creed.y);
      g.shadowColor = ACCENT; g.shadowBlur = 34;
      g.fillStyle = ACCENT; g.fillText(MOTTO.text.slice(7), L.creed.x + g.measureText(head).width, L.creed.y);
      g.shadowBlur = 0;
      if (g.measureText(MOTTO.text).width + L.creed.x > SAFE_R) report('超出安全区：第九页八个字');
    }
    g.restore();
    g.globalAlpha = 1 - out2;
    typed(g, a.tail, s, 1500, 800, font(42), MIST, 'right');
    if (b >= 1) source(g, a.source);
    g.globalAlpha = 1;
  },

  notice(g, s) {
    const b = s.b, a = SCRIPT.notice;
    g.globalAlpha = 0.9; g.drawImage(CIRCUIT, 0, 0); g.globalAlpha = 1;
    const cx = 1440, cy = 560, half = 170;
    const bend = ease(seg(b, 0, 3.5));
    g.save();
    g.strokeStyle = MIST; g.lineWidth = 2.5; g.shadowColor = 'rgba(250,246,242,0.6)'; g.shadowBlur = 8;
    for (let i = 0; i < 14; i++) {
      const y = 230 + i * 50;
      const pin = cy - half + 30 + (i % 7) * ((2 * half - 60) / 6);
      const leftSide = i < 7;
      const xs = leftSide ? [900, 1060, 1180, cx - half] : [SAFE_R - 40, 1770, 1700, cx + half];
      const yy = lerp(y, pin, bend);
      const flow = clamp(b / 3);
      g.globalAlpha = 0.4 + 0.6 * flow;
      g.beginPath();
      g.moveTo(xs[0], y); g.lineTo(lerp(xs[3], xs[1], bend), y); g.lineTo(lerp(xs[3], xs[2], bend), yy); g.lineTo(xs[3], yy);
      g.stroke();
      g.fillStyle = MIST; g.beginPath(); g.arc(xs[0], y, 5, 0, Math.PI * 2); g.fill();
    }
    g.restore();
    g.globalAlpha = 1;
    g.fillStyle = SHADE; g.fillRect(cx - half, cy - half, 2 * half, 2 * half);
    g.save(); g.shadowColor = ACCENT; g.shadowBlur = 24;
    g.strokeStyle = ACCENT; g.lineWidth = 5; g.strokeRect(cx - half, cy - half, 2 * half, 2 * half);
    g.restore();
    setFont(g, font(70, 900)); g.fillStyle = LIGHT; g.textAlign = 'center';
    g.fillText(MOTTO.lines[0], cx, cy - 12); g.fillText(MOTTO.lines[1], cx, cy + 82);
    g.fillStyle = 'rgba(14,13,11,0.8)'; g.fillRect(LEFT - 30, 330, 700, 280);
    frameBox(g, LEFT - 30, 330, 700, 280, seg(b, 0.2, 1.2) * (1 - seg(b, 10.2, 10.8)));
    narration(g, a.lines[0], s, LEFT, 410, 10.2, 11);
    narration(g, a.lines[1], s, LEFT, 480, 10.4, 12);
    narration(g, a.lines[2], s, LEFT, 550, 10.6, 13);
    demo(g, a.demo, cx + half, cy + half + 56);
    corner(g, a.corner);
    if (b >= 1) source(g, a.source);
  },

  drones(g, s) {
    const b = s.b, a = SCRIPT.drones;
    const band = g.createLinearGradient(0, 760, 0, H);
    band.addColorStop(0, 'rgba(60,56,52,0)');
    band.addColorStop(0.5, 'rgba(60,56,52,0.55)');
    band.addColorStop(1, 'rgba(24,22,20,0.9)');
    g.fillStyle = band; g.fillRect(0, 760, W, H - 760);
    g.globalAlpha = 0.5; g.drawImage(FOG_A, -((s.local * 0.4) % 2400), 640); g.globalAlpha = 1;
    g.fillStyle = 'rgba(42,39,35,1)'; g.fillRect(700, 958, 1140, 2);
    const bright = seg(b, 10, 12);
    for (let i = 0; i < P.drones.length; i++) {
      const p = P.drones[i], f = P.dronesFrom[i];
      const d = f.d * 3;
      const t = ease(clamp((b - d) / (8 - d)));
      const x = lerp(f.x, p.x, t), y = lerp(f.y, p.y, t);
      const tw = 0.85 + 0.15 * Math.sin(i * 1.7 + s.local * 0.21);
      g.globalAlpha = Math.min(1, (t >= 1 ? tw : 0.6) + 0.2 * bright);
      g.fillStyle = p.accent ? ACCENT : LIGHT;
      const r = 3.6 + 2.6 * bright;
      g.fillRect(x - r / 2, y - r / 2, r, r);
    }
    g.globalAlpha = 1;
    if (bright > 0) {
      const glow = g.createRadialGradient(1270, 570, 60, 1270, 570, 760);
      glow.addColorStop(0, `rgba(250,246,242,${0.38 * inQ(bright)})`);
      glow.addColorStop(1, 'rgba(250,246,242,0)');
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
    }
    const fade = 1 - seg(b, 10.2, 11.4);
    g.globalAlpha = fade;
    typed(g, a.lines[0], s, LEFT, 420);
    typed(g, a.lines[1], s, LEFT, 490);
    typed(g, a.lines[2], s, LEFT, 560);
    typed(g, a.lines[3], s, LEFT, 630);
    g.globalAlpha = 1;
    corner(g, a.corner, fade);
    if (b >= 1) { demo(g, a.demo, SAFE_R, 1030); source(g, a.source); }
  },

  ours(g, s) {
    const b = s.b, a = SCRIPT.ours;
    keyCubes(g, LEFT, 150, 58, 0);
    g.strokeStyle = FOG; g.lineWidth = 1.2; g.strokeRect(LEFT + 150, 168, 150, 44);
    text(g, a.tag.text, LEFT + 225, 200, font(24), FOG, 'center');
    narration(g, a.question, s, LEFT, 430, 12, 14, font(96, 900), INK);
    narration(g, a.lines[0], s, LEFT, 580, 12.2, 15, NARR, INK);
    narration(g, a.lines[1], s, LEFT, 650, 12.4, 16, NARR, INK);
  },

  end(g, s) {
    const b = s.b, a = SCRIPT.end;
    // 墨点飞溅：落拍时从标题向外迸出
    const r = rng(91);
    const sp = out(seg(b, 0, 1.4));
    for (let i = 0; i < 260; i++) {
      const ang = r() * Math.PI * 2, dist = 80 + r() * 520, sz = 2 + r() * 6;
      g.globalAlpha = 0.7 * (1 - seg(b, 0.8, 3)) * (0.4 + r() * 0.6);
      g.fillStyle = r() > 0.92 ? ACCENT : INK;
      g.fillRect(480 + Math.cos(ang) * dist * sp, 560 + Math.sin(ang) * dist * 0.6 * sp + 140 * sp * sp, sz, sz);
    }
    g.globalAlpha = 1;
    const pop = 1 + 0.03 * (1 - out(seg(b, 0, 0.6)));
    text(g, a.title[0].text, LEFT, 470, font(Math.round(140 * pop), 900), INK);
    text(g, a.title[1].text, LEFT, 650, font(Math.round(140 * pop), 900), INK);
    keyCubes(g, 900, 560, 70, 0);
    a.credits.forEach((c, i) => {
      const k = out(seg(b, 2 + i * 0.5, 2.6 + i * 0.5));
      if (k <= 0) return;
      g.globalAlpha = k;
      text(g, c.text, LEFT, 880 + i * 40, font(22), FOG);
      g.globalAlpha = 1;
    });
  },
};

export function renderFrame(n) {
  const s = frameState(n);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.letterSpacing = '0px';
  const paper = PAPER_PAGES.has(s.page.id);
  ctx.drawImage(paper ? PAPER_GROUND : GROUND, 0, 0);
  DRAW[s.page.id](ctx, s);
  ctx.globalAlpha = 1;
  if (!paper) dust(ctx, n, s.page.id === 'drones' ? 0.4 : 1);
  grain(ctx, n);
}

async function ready() {
  const faces = [font(40, 900), font(40, 700), font(40, 400), DIN(40), MONO(20)];
  await Promise.all(faces.map(f => document.fonts.load(f, '国家大事千万尽力1979')));
  for (const f of faces) if (!document.fonts.check(f, '国家大事')) report(`字体未加载：${f}`);
  for (const p of PAGES) if (!DRAW[p.id]) report(`缺少页面：${p.id}`);
  prepare();
  renderFrame(0);
  window.film = {renderFrame, FRAME_COUNT};
  window.artReady = true;
}
ready();
