import {BEAT_FRAMES, CREED_SNAP_BEAT, FRAME_COUNT, OPEN_BURST_BEAT, OPEN_DROP_BEAT, OPEN_REVEAL_BEAT, OPEN_SNAP_BEAT, OPEN_STAND_BEAT, PAGES, frameState} from './timeline.js';
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
const ctxOf = c => {
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.shadowBlur = 0;
  g.clearRect(0, 0, c.width, c.height);
  return g;
};

function report(message) {
  if (!window.renderErrors.includes(message)) window.renderErrors.push(message);
}

// ---------- 透视：相机与投影 ----------
// 世界坐标：X 向右，Y 向上，Z 向前。pitch 为俯角（向下看为正），yaw 为向右转的偏航角，f 为焦距（像素）。

function cam(x, y, z, pitch, yaw = 0, f = 1100) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cy = Math.cos(yaw), sy = Math.sin(yaw);
  return {x, y, z, f, yaw, r: [cy, 0, -sy], u: [sp * sy, cp, sp * cy], fw: [cp * sy, -sp, cp * cy]};
}

// 绕目标点的相机：从目标点沿视线反方向退 dist
function orbit(tx, ty, tz, dist, pitch, yaw = 0, f = 1100) {
  const c = cam(0, 0, 0, pitch, yaw, f);
  return cam(tx - c.fw[0] * dist, ty - c.fw[1] * dist, tz - c.fw[2] * dist, pitch, yaw, f);
}

const dot3 = (a, x, y, z) => a[0] * x + a[1] * y + a[2] * z;
const NEAR = 40;

function proj(c, X, Y, Z) {
  const dx = X - c.x, dy = Y - c.y, dz = Z - c.z;
  const z = dot3(c.fw, dx, dy, dz);
  return {x: 960 + c.f * dot3(c.r, dx, dy, dz) / z, y: 540 - c.f * dot3(c.u, dx, dy, dz) / z, z, s: c.f / z};
}

// 屏幕点沿视线落到 Z = zPlane 的世界点
function unproject(c, sx, sy, zPlane) {
  const a = (sx - 960) / c.f, b = (540 - sy) / c.f;
  const d = [0, 1, 2].map(i => c.r[i] * a + c.u[i] * b + c.fw[i]);
  const t = (zPlane - c.z) / d[2];
  return [c.x + d[0] * t, c.y + d[1] * t, zPlane];
}

// 贴图平面：贴图左上角在世界点 O，每列沿 X 走 su，每行走向量 V（V 的 X 分量为 0）。
// 只用于偏航为 0 的相机：这时贴图的每一行深度相同，按屏幕行反算贴图行，每行一次 drawImage，透视准确。
function plane(g, c, src, O, su, V, {alpha = 1, fade = null, wrap = false} = {}) {
  if (c.yaw !== 0) report('plane() 只支持偏航为 0 的相机');
  const ox = O[0] - c.x, oy = O[1] - c.y, oz = O[2] - c.z;
  const a = dot3(c.u, ox, oy, oz), b = dot3(c.u, V[0], V[1], V[2]);
  const c0 = dot3(c.fw, ox, oy, oz), d = dot3(c.fw, V[0], V[1], V[2]);
  const hs = src.height, ws = src.width;
  for (let ys = 0; ys < H; ys++) {
    const k = (540 - (ys + 0.5)) / c.f;
    const den = b - k * d;
    if (Math.abs(den) < 1e-9) continue;
    const v = (k * c0 - a) / den;
    if (!wrap && (v < 0 || v >= hs)) continue;
    const z = c0 + v * d;
    if (z < NEAR) continue;
    const al = alpha * (fade ? fade(z) : 1);
    if (al <= 0.004) continue;
    const x0 = 960 + c.f * ox / z, x1 = 960 + c.f * (ox + su * ws) / z;
    if (x1 < 0 || x0 > W) continue;
    const row = wrap ? ((Math.floor(v) % hs) + hs) % hs : Math.floor(v);
    g.globalAlpha = al;
    g.drawImage(src, 0, row, ws, 1, x0, ys, x1 - x0, 1.6);
  }
  g.globalAlpha = 1;
}

function poly(g, pts) {
  g.beginPath();
  pts.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)));
  g.closePath();
}

// 地面上的折线（世界 XZ 点列），upto 为沿线长度的截止位置；返回线头的投影点
function groundPath(g, c, path, upto = Infinity, y = 0) {
  let left = upto, head = null;
  g.beginPath();
  let started = false;
  for (let i = 0; i < path.pts.length; i++) {
    let [x, z] = path.pts[i];
    if (i > 0) {
      const [px, pz] = path.pts[i - 1], len = path.lens[i - 1];
      if (left < len) { const t = left / len; x = lerp(px, x, t); z = lerp(pz, z, t); }
      left -= len;
    }
    const p = proj(c, x, y, z);
    if (p.z < NEAR) { started = false; continue; }
    started ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y);
    started = true;
    head = p;
    if (left <= 0) break;
  }
  g.stroke();
  return head;
}

function makePath(pts) {
  const lens = pts.slice(1).map(([x, z], i) => Math.hypot(x - pts[i][0], z - pts[i][1]));
  return {pts, lens, total: lens.reduce((s, v) => s + v, 0)};
}

// 地面上的圆（世界坐标），返回投影点列
function groundCircle(c, cx, cz, r, n = 64, y = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2;
    const p = proj(c, cx + r * Math.cos(a), y, cz + r * Math.sin(a));
    if (p.z < NEAR) return null;
    pts.push(p);
  }
  return pts;
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

// 透视文字平原的贴图：一行行小字是 floor 里的释义和史实关键词；中间一条亮路通向灭点
function makeFloor() {
  const c = canvas(3072, 2048);
  const g = c.getContext('2d');
  const r = rng(12);
  const items = SCRIPT.floor;
  g.textBaseline = 'alphabetic';
  for (let y = 56, row = 0; y < c.height; y += 74, row++) {
    let x = -r() * 600;
    while (x < c.width) {
      const item = items[Math.floor(r() * items.length)];
      g.font = font(item.kind === 'view' ? 42 : 38, item.kind === 'view' ? 900 : 700);
      g.fillStyle = item.kind === 'view' ? '#6B645D' : row % 2 ? '#3A3531' : '#4B4541';
      g.fillText(item.text, x, y);
      x += g.measureText(item.text).width + 90;
    }
  }
  g.globalCompositeOperation = 'source-atop';
  const band = g.createLinearGradient(c.width / 2 - 300, 0, c.width / 2 + 300, 0);
  band.addColorStop(0, 'rgba(250,246,242,0)');
  band.addColorStop(0.5, 'rgba(250,246,242,0.75)');
  band.addColorStop(1, 'rgba(250,246,242,0)');
  g.fillStyle = band; g.fillRect(c.width / 2 - 300, 0, 600, c.height);
  g.globalCompositeOperation = 'destination-over';
  const road = g.createLinearGradient(c.width / 2 - 260, 0, c.width / 2 + 260, 0);
  road.addColorStop(0, 'rgba(250,246,242,0)');
  road.addColorStop(0.5, 'rgba(250,246,242,0.09)');
  road.addColorStop(1, 'rgba(250,246,242,0)');
  g.fillStyle = road; g.fillRect(c.width / 2 - 260, 0, 520, c.height);
  return c;
}

// 电子管小图标，用作年份字形里和“大”字方块面上的纹理
function makeTubeTile(color) {
  const c = canvas(56, 84);
  const g = c.getContext('2d');
  g.strokeStyle = color; g.lineWidth = 2; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(16, 62); g.lineTo(16, 26); g.arc(28, 26, 12, Math.PI, 0); g.lineTo(40, 62);
  g.rect(12, 62, 32, 8);
  g.moveTo(22, 58); g.lineTo(22, 30); g.lineTo(28, 24); g.lineTo(34, 30); g.lineTo(34, 58);
  g.moveTo(20, 70); g.lineTo(20, 78); g.moveTo(36, 70); g.lineTo(36, 78);
  g.stroke();
  return c;
}

// 晶格小图：横竖细线与结点，用来填开场显影的字形
function makeLatticeTile() {
  const c = canvas(44, 44);
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(250,246,242,0.6)'; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(22, 0); g.lineTo(22, 44); g.moveTo(0, 22); g.lineTo(44, 22); g.stroke();
  g.strokeStyle = 'rgba(250,246,242,0.32)'; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(22, 22); g.lineTo(44, 44); g.stroke();
  g.fillStyle = LIGHT;
  g.beginPath(); g.arc(22, 22, 4.5, 0, Math.PI * 2); g.fill();
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
    g.globalAlpha *= 1 - k * 0.8;
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

// 里程表式年份：from 与 to 位数相同，不同的位按 t 从上往下滚动
function odometer(g, x, y, size, from, to, t) {
  setFont(g, DIN(size)); g.textAlign = 'left'; g.fillStyle = LIGHT;
  const cell = g.measureText('0').width;
  [...to].forEach((digit, i) => {
    const fx = x + i * cell;
    if (from[i] === digit) { g.fillText(digit, fx, y); return; }
    const v = lerp(Number(from[i]), Number(digit), t), d = Math.floor(v), frac = v - d;
    const base = g.globalAlpha;
    g.save();
    g.beginPath(); g.rect(fx - 6, y - size * 0.78, cell + 12, size * 0.84); g.clip();
    for (const [n, off] of [[d, -frac], [Math.min(d + 1, Number(digit)), 1 - frac]]) {
      g.globalAlpha = base * (1 - Math.abs(off) * 0.6);
      g.fillText(String(n), fx, y + off * size * 0.8);
    }
    g.restore();
  });
  if (x < SAFE_L || x + cell * to.length > SAFE_R) report(`超出安全区：年份 ${to}`);
  return cell * to.length;
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
  return pickPoints(g.getImageData(0, 0, W, H).data, W, H, count, seed, accentFrom >= 0 ? boxes.slice(accentFrom, accentFrom + 2) : []);
}

function pickPoints(data, w, h, count, seed, accentBoxes = []) {
  let pts = [];
  for (let step = 14; step >= 2 && pts.length < count; step--) {
    pts = [];
    for (let y = 0; y < h; y += step) for (let x = (y / step % 2) * step / 2; x < w; x += step) if (data[(y * w + Math.round(x)) * 4 + 3] > 140) pts.push({x: Math.round(x), y});
  }
  if (pts.length < count) throw new Error(`字形取点不足：${pts.length} < ${count}`);
  const picked = Array.from({length: count}, (_, i) => pts[Math.floor(i * pts.length / count)]);
  const r = rng(seed);
  for (let i = picked.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [picked[i], picked[j]] = [picked[j], picked[i]]; }
  return picked.map(p => ({...p, accent: accentBoxes.some(bx => p.x >= bx.x0 && p.x < bx.x1 && p.y >= bx.y0 && p.y <= bx.y1)}));
}

function scatter(n, seed, box) {
  const r = rng(seed);
  return Array.from({length: n}, () => ({x: lerp(box[0], box[2], r()), y: lerp(box[1], box[3], r()), d: r()}));
}

// 找出某个字的字怀（例如“0”中间的空洞），供推进穿越时对准
function holeCenter(str, idx, x, y, size) {
  const c = canvas();
  const g = c.getContext('2d');
  g.font = font(size, 900); g.textBaseline = 'alphabetic'; g.fillStyle = '#000';
  const before = g.measureText(str.slice(0, idx)).width;
  const m = g.measureText(str[idx]);
  g.fillText(str[idx], x + before, y);
  const alpha = (px, py) => g.getImageData(px, py, 1, 1).data[3] >= 128;
  const midY = Math.round(y - (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2);
  const x0 = Math.round(x + before), x1 = Math.round(x + before + m.width);
  let i = x0;
  while (i < x1 && !alpha(i, midY)) i++;
  while (i < x1 && alpha(i, midY)) i++;
  const left = i;
  while (i < x1 && !alpha(i, midY)) i++;
  const right = i;
  if (right >= x1 || right - left < 4) throw new Error(`找不到“${str[idx]}”的字怀`);
  const hx = Math.round((left + right) / 2), y0 = Math.round(y - m.actualBoundingBoxAscent), y1 = Math.round(y + m.actualBoundingBoxDescent);
  let j = y0;
  while (j < y1 && !alpha(hx, j)) j++;
  while (j < y1 && alpha(hx, j)) j++;
  const top = j;
  while (j < y1 && !alpha(hx, j)) j++;
  if (j >= y1) throw new Error(`“${str[idx]}”的字怀没有下缘`);
  return {x: hx, y: (top + j) / 2, w: right - left, h: j - top};
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

// 关键动作时聚光瞬间变亮；key 为真时偏朱橙
function flash(g, amount, key = false, x = 960, y = 540) {
  if (amount <= 0) return;
  const c = key ? '253,96,42' : '250,240,225';
  const grad = g.createRadialGradient(x, y, 40, x, y, 1000);
  grad.addColorStop(0, `rgba(${c},${amount})`);
  grad.addColorStop(1, `rgba(${c},0)`);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
}

const shade = (c, k) => {
  const a = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)), t = [42, 35, 32];
  return `rgb(${a.map((v, i) => Math.round(lerp(v, t[i], 0.8 * k))).join(',')})`;
};

// 橙色方块（画面平面上的斜投影），正面白字，顶面受光、侧面背光、下方短软投影
function cube(g, x, y, s, ch, dim = 0, glow = 0) {
  const d = s * 0.2;
  g.save();
  g.fillStyle = 'rgba(0,0,0,0.45)';
  g.beginPath(); g.ellipse(x + s * 0.55, y + s + 10, s * 0.62, s * 0.12, 0, 0, Math.PI * 2); g.fill();
  if (glow) { g.shadowColor = ACCENT; g.shadowBlur = 40 * glow; }
  g.fillStyle = shade(ACCENT, dim); g.fillRect(x, y, s, s);
  g.shadowBlur = 0;
  g.fillStyle = shade(ACCENT_TOP, dim);
  g.beginPath(); g.moveTo(x, y); g.lineTo(x + d, y - d); g.lineTo(x + s + d, y - d); g.lineTo(x + s, y); g.fill();
  g.fillStyle = shade(ACCENT_SIDE, dim);
  g.beginPath(); g.moveTo(x + s, y); g.lineTo(x + s + d, y - d); g.lineTo(x + s + d, y + s - d); g.lineTo(x + s, y + s); g.fill();
  g.fillStyle = dim > 0 ? `rgba(250,246,242,${1 - 0.7 * dim})` : LIGHT;
  g.font = font(Math.round(s * 0.74), 900); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillText(ch, x + s / 2, y + s * 0.8);
  g.restore();
}

// 透视里的方块：(X, Y, Z) 为正面左下角，边长 s；正面的字与纹理用三个角点的仿射贴上
function cube3d(g, c, X, Y, Z, s, ch, dim = 0, glow = 0, face = 0) {
  const v = [[X, Y, Z], [X + s, Y, Z], [X + s, Y + s, Z], [X, Y + s, Z], [X, Y, Z + s], [X + s, Y, Z + s], [X + s, Y + s, Z + s], [X, Y + s, Z + s]].map(p => proj(c, ...p));
  if (v.some(p => p.z < NEAR)) return;
  const sh = [[X - 14, Z - 14], [X + s + 14, Z - 14], [X + s + 14, Z + s + 14], [X - 14, Z + s + 14]].map(([x, z]) => proj(c, x, 0, z));
  g.fillStyle = `rgba(0,0,0,${0.5 * clamp(1 - Y / 900)})`;
  poly(g, sh); g.fill();
  const fill = (idx, color) => { g.fillStyle = color; poly(g, idx.map(i => v[i])); g.fill(); };
  if (c.y > Y + s) fill([3, 2, 6, 7], shade(ACCENT_TOP, dim));
  if (c.x < X) fill([0, 3, 7, 4], shade(ACCENT_SIDE, dim));
  if (c.x > X + s) fill([1, 2, 6, 5], shade(ACCENT_SIDE, dim));
  if (c.z > Z) return;
  if (glow) { g.shadowColor = ACCENT; g.shadowBlur = 40 * glow; }
  fill([0, 1, 2, 3], shade(ACCENT, dim));
  g.shadowBlur = 0;
  g.save();
  g.transform((v[2].x - v[3].x) / 100, (v[2].y - v[3].y) / 100, (v[0].x - v[3].x) / 100, (v[0].y - v[3].y) / 100, v[3].x, v[3].y);
  if (face > 0) {
    g.globalAlpha = face;
    g.fillStyle = P.tubesLight; g.fillRect(0, 0, 100, 100);
    g.globalAlpha = 1;
  }
  g.fillStyle = dim > 0 ? `rgba(250,246,242,${1 - 0.7 * dim})` : LIGHT;
  g.font = font(74, 900); g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  g.fillText(ch, 50, 80);
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

// 地平线上一排仰望的人群剪影：只有头和肩，头微微后仰
const CROWD = (() => {
  const r = rng(63);
  const out = [];
  for (let x = 720; x < 1820; x += 18 + r() * 22) out.push({x, h: 34 + r() * 22, tilt: -0.15 - r() * 0.2});
  return out;
})();
function crowd(g, y) {
  g.fillStyle = '#0B0A09';
  for (const p of CROWD) {
    const u = p.h / 6;
    g.beginPath();
    g.moveTo(p.x - 2.2 * u, y + 2); g.quadraticCurveTo(p.x - 2.2 * u, y - 3.2 * u, p.x, y - 3.4 * u);
    g.quadraticCurveTo(p.x + 2.2 * u, y - 3.2 * u, p.x + 2.2 * u, y + 2); g.fill();
    g.beginPath(); g.ellipse(p.x + p.tilt * u, y - 4.6 * u, 1.05 * u, 1.25 * u, p.tilt, 0, Math.PI * 2); g.fill();
  }
}

// 电子管立体线框：玻壳、阳极、栅极螺旋、灯丝、管座与管脚，绕竖轴缓慢转动
const TUBE = (() => {
  const lines = [];
  const ring = (y, r, n = 36) => Array.from({length: n + 1}, (_, i) => { const a = i / n * Math.PI * 2; return [r * Math.cos(a), y, r * Math.sin(a)]; });
  for (const y of [-250, -130, -10, 110, 200]) lines.push({pts: ring(y, 120), kind: 'glass'});
  for (let m = 0; m < 10; m++) {
    const a = m / 10 * Math.PI * 2, pts = [];
    for (let k = 0; k <= 12; k++) pts.push([120 * Math.cos(a), -250 + k * 450 / 12, 120 * Math.sin(a)]);
    for (let k = 1; k <= 8; k++) { const t = k / 8 * Math.PI / 2; pts.push([120 * Math.cos(t) * Math.cos(a), 200 + 120 * Math.sin(t), 120 * Math.cos(t) * Math.sin(a)]); }
    lines.push({pts, kind: 'glass'});
  }
  lines.push({pts: [[0, 320, 0], [0, 352, 0]], kind: 'glass'});
  const box = [[-62, -26], [62, -26], [62, 26], [-62, 26], [-62, -26]];
  for (const y of [-150, 150]) lines.push({pts: box.map(([x, z]) => [x, y, z]), kind: 'plate'});
  for (const [x, z] of box.slice(0, 4)) lines.push({pts: [[x, -150, z], [x, 150, z]], kind: 'plate'});
  const hel = [];
  for (let k = 0; k <= 14 * 24; k++) { const a = k / 24 * Math.PI * 2; hel.push([40 * Math.cos(a), -130 + k * 260 / (14 * 24), 16 * Math.sin(a)]); }
  lines.push({pts: hel, kind: 'grid'});
  for (const x of [-42, 42]) lines.push({pts: [[x, -250, 0], [x, 170, 0]], kind: 'grid'});
  lines.push({pts: [[-10, -140, 0], [-10, 120, 0], [0, 135, 0], [10, 120, 0], [10, -140, 0]], kind: 'fil'});
  for (const y of [-250, -300]) lines.push({pts: ring(y, 130), kind: 'base'});
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + 0.4; lines.push({pts: [[60 * Math.cos(a), -300, 60 * Math.sin(a)], [60 * Math.cos(a), -370, 60 * Math.sin(a)]], kind: 'base'}); }
  return lines;
})();

// reveal 为自下而上显出的进度；glow 为灯丝亮度
function tube3d(g, cx, cy, sc, yaw, glow, alpha, reveal = 1) {
  if (alpha <= 0) return;
  const cyw = Math.cos(yaw), syw = Math.sin(yaw), ct = Math.cos(0.16), st = Math.sin(0.16), D = 1500;
  const top = -370 + 740 * reveal;
  const pr = ([x, y, z]) => {
    const xr = x * cyw + z * syw, zr = -x * syw + z * cyw;
    const yr = y * ct - zr * st, zz = y * st + zr * ct, k = D / (D + zz);
    return [cx + sc * xr * k, cy - sc * yr * k, zz];
  };
  g.save();
  g.lineCap = 'round';
  for (const ln of TUBE) {
    const pts = ln.pts.map(pr);
    g.strokeStyle = ln.kind === 'fil' ? ACCENT : LIGHT;
    g.lineWidth = ln.kind === 'fil' ? 3.5 : ln.kind === 'glass' ? 1.4 : 2;
    if (ln.kind === 'fil') { g.shadowColor = ACCENT; g.shadowBlur = 24 * glow; }
    for (let i = 1; i < pts.length; i++) {
      if (ln.pts[i][1] > top && ln.pts[i - 1][1] > top) continue;
      const front = clamp(0.55 - (pts[i][2] + pts[i - 1][2]) / 2 / 260);
      const base = {glass: 0.14 + 0.42 * front, plate: 0.35 + 0.45 * front, grid: 0.3 + 0.45 * front, base: 0.35, fil: 0.3 + 0.7 * glow}[ln.kind];
      g.globalAlpha = alpha * base;
      g.beginPath(); g.moveTo(pts[i - 1][0], pts[i - 1][1]); g.lineTo(pts[i][0], pts[i][1]); g.stroke();
    }
    g.shadowBlur = 0;
  }
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

// 带高光的球
function ball(g, x, y, rad, kind) {
  const base = {prof: ACCENT, assoc: LIGHT, lect: MIST, staff: DEEP}[kind];
  const grad = g.createRadialGradient(x - rad * 0.35, y - rad * 0.4, Math.max(1, rad * 0.1), x, y, rad + 1);
  grad.addColorStop(0, kind === 'prof' ? ACCENT_TOP : '#FFFFFF');
  grad.addColorStop(0.35, base);
  grad.addColorStop(1, kind === 'prof' ? ACCENT_SIDE : SHADE);
  g.fillStyle = grad;
  g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
}

// ---------- 开场：墨滴、晶格平原、显影的八个字 ----------

// 墨滴落点；八个字的贴图以它为中心平铺在地面上，近边在 Z = OT.near
const IMPACT = {x: 0, z: 2700};
const OT = {w: 2200, h: 1240, size: 500, near: 2080, rows: [{str: '国家大事', base: 560}, {str: '千万尽力', base: 1160}]};

const OPEN_LAT = (() => {
  const pts = [];
  for (let z = 600; z <= 9000; z += 150) for (let x = -3600; x <= 3600; x += 150) pts.push([x, z, Math.hypot(x - IMPACT.x, z - IMPACT.z)]);
  return pts;
})();

// 电路走线：从墨迹边缘出发，沿 150 的网格横竖转折向外
const OPEN_TRACES = (() => {
  const r = rng(17), list = [];
  for (let i = 0; i < 30; i++) {
    const ang = i / 30 * Math.PI * 2 + r() * 0.15;
    const sx = Math.sign(Math.cos(ang)) || 1, sz = Math.sign(Math.sin(ang)) || 1;
    let x = Math.round(Math.cos(ang) * 600 / 150) * 150, z = IMPACT.z + Math.round(Math.sin(ang) * 600 / 150) * 150;
    const pts = [[x, z]];
    const horizontalFirst = Math.abs(Math.cos(ang)) > Math.abs(Math.sin(ang));
    for (let k = 0; k < 8; k++) {
      const step = 150 * Math.round(2 + r() * 5);
      if ((k % 2 === 0) === horizontalFirst) x += sx * step; else z += sz * step;
      pts.push([x, z]);
    }
    list.push(makePath(pts));
  }
  return list;
})();

// 实验手稿线条：电子管特性曲线一类的坐标与曲线族、同心圆环、波形，按区域铺在地面上
const OPEN_SKETCH = (() => {
  const groups = [];
  const curves = [makePath([[1500, 3500], [1500, 4900]]), makePath([[1500, 3500], [3100, 3500]])];
  for (let n = 1; n <= 5; n++) {
    const pts = [];
    for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([1500 + 1600 * u, 3500 + 1300 * (n / 5) * (1 - Math.exp(-u * (1.2 + n * 0.9)))]); }
    curves.push(makePath(pts));
  }
  for (let i = 1; i <= 8; i++) curves.push(makePath([[1500 + i * 200, 3500], [1500 + i * 200, 3540]]));
  groups.push({cx: 2300, cz: 4200, paths: curves});
  const rings = [];
  for (let r = 180; r <= 900; r += 120) {
    const pts = [];
    for (let i = 0; i <= 72; i++) { const a = i / 72 * Math.PI * 2; pts.push([-2200 + r * Math.cos(a), 1900 + r * Math.sin(a)]); }
    rings.push(makePath(pts));
  }
  groups.push({cx: -2200, cz: 1900, paths: rings});
  const waves = [];
  for (let k = 0; k < 3; k++) {
    const pts = [];
    for (let i = 0; i <= 80; i++) { const x = -3300 + i * 25; pts.push([x, 4300 + k * 260 + 110 * Math.sin(i / 80 * Math.PI * 6 + k)]); }
    waves.push(makePath(pts));
  }
  groups.push({cx: -2300, cz: 4560, paths: waves});
  return groups;
})();

// 开场相机关键帧（拍 → 位置与俯角）：平视看墨滴下落，落地后升起俯瞰晶格平原，字立起时降回平视
const OPEN_KEYS = [
  [0, [0, 380, 0, 0.06]],
  [1, [0, 380, 0, 0.06]],
  [3, [0, 2000, 1150, 0.93]],
  [6.6, [0, 1850, 1300, 0.95]],
  [8, [0, 620, 250, 0.02]],
  [10, [0, 620, 420, 0.02]],
  [16, [0, 620, 420, 0.02]],
];
function keyed(keys, b) {
  let i = 0;
  while (i + 2 < keys.length && b >= keys[i + 1][0]) i++;
  const [b0, k0] = keys[i], [b1, k1] = keys[i + 1];
  const t = ease(seg(b, b0, b1));
  return k0.map((v, j) => lerp(v, k1[j], t));
}
const openCam = b => cam(...keyed(OPEN_KEYS, b));

// 八个字的贴图以近边为轴立起，phi 为立起的角度（0 平躺，π/2 直立）
function openPlaneAt(phi) {
  const s = Math.sin(phi), c = Math.cos(phi);
  return {O: [-OT.w / 2, OT.h * s, OT.near + OT.h * c], V: [0, -s, -c]};
}
function standAngle(b) {
  if (b < 6.9) return 0;
  if (b < OPEN_STAND_BEAT) return Math.PI / 2 * seg(b, 6.9, OPEN_STAND_BEAT) ** 2;
  return Math.PI / 2 - 0.06 * Math.sin(Math.PI * seg(b, OPEN_STAND_BEAT, OPEN_STAND_BEAT + 0.5));
}

// 显影：每个字自近向远扫出，字形里是发光晶格，字边描亮；“尽力”两字为朱橙
function openTexture(ks) {
  const key = ks.map(k => k.toFixed(3)).join(',');
  if (key === P.openKey) return;
  P.openKey = key;
  const m = ctxOf(P.openMask);
  m.font = font(OT.size, 900); m.textBaseline = 'alphabetic'; m.fillStyle = LIGHT;
  const clipTo = (g, bx, k) => { const h = bx.y1 - bx.y0; g.beginPath(); g.rect(bx.x0 - 30, bx.y1 - h * k, bx.x1 - bx.x0 + 60, h * k); g.clip(); };
  P.openBoxes.forEach((bx, i) => {
    if (ks[i] <= 0) return;
    m.save(); clipTo(m, bx, ks[i]); m.fillText(bx.ch, bx.x0, bx.base); m.restore();
  });
  const t = ctxOf(P.openTex);
  t.drawImage(P.openPat, 0, 0);
  t.globalCompositeOperation = 'destination-in'; t.drawImage(P.openMask, 0, 0);
  t.globalCompositeOperation = 'source-over';
  t.globalAlpha = 0.22; t.drawImage(P.openMask, 0, 0); t.globalAlpha = 1;
  t.font = font(OT.size, 900); t.textBaseline = 'alphabetic'; t.lineWidth = 5; t.strokeStyle = LIGHT; t.fillStyle = LIGHT;
  P.openBoxes.forEach((bx, i) => {
    const k = ks[i];
    if (k <= 0) return;
    t.save(); clipTo(t, bx, k); t.strokeText(bx.ch, bx.x0, bx.base); t.restore();
    if (k < 1) t.fillRect(bx.x0 - 30, bx.y1 - (bx.y1 - bx.y0) * k - 4, bx.x1 - bx.x0 + 60, 8);
  });
  t.globalCompositeOperation = 'source-atop'; t.fillStyle = ACCENT;
  for (const bx of P.openBoxes.slice(6)) t.fillRect(bx.x0 - 40, bx.y0 - 40, bx.x1 - bx.x0 + 80, bx.y1 - bx.y0 + 80);
  t.globalCompositeOperation = 'source-over';
}

// 地面：顶光照亮的一圈、晶格点、电路走线、手稿线条；墨迹前沿半径 R 以内点亮
function openGround(g, c, R, alpha) {
  if (alpha <= 0) return;
  const pool = groundCircle(c, IMPACT.x, IMPACT.z, 1300);
  if (pool) {
    g.globalAlpha = alpha;
    g.fillStyle = 'rgba(200,190,175,0.06)'; poly(g, pool); g.fill();
    const inner = groundCircle(c, IMPACT.x, IMPACT.z, 760);
    if (inner) { g.fillStyle = 'rgba(200,190,175,0.07)'; poly(g, inner); g.fill(); }
  }
  g.fillStyle = LIGHT;
  for (const [x, z, dist] of OPEN_LAT) {
    const p = proj(c, x, 0, z);
    if (p.z < NEAR || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
    const depth = clamp(1.25 - p.z / 9000);
    const front = Math.exp(-(((dist - R) / 260) ** 2));
    g.globalAlpha = alpha * depth * (0.05 + (dist < R ? 0.42 : 0) + 0.6 * front);
    const sz = Math.max(1.4, 10 * p.s);
    g.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
  }
  g.strokeStyle = LIGHT; g.lineWidth = 1.6;
  for (const tr of OPEN_TRACES) {
    const upto = R - 600;
    if (upto <= 0) break;
    g.globalAlpha = 0.45 * alpha;
    const head = groundPath(g, c, tr, upto);
    if (head && upto < tr.total) {
      g.globalAlpha = alpha;
      g.fillRect(head.x - 3, head.y - 3, 6, 6);
    }
  }
  g.lineWidth = 1.3;
  for (const grp of OPEN_SKETCH) {
    const k = clamp((R - Math.hypot(grp.cx - IMPACT.x, grp.cz - IMPACT.z) + 600) / 900);
    if (k <= 0) continue;
    g.globalAlpha = 0.4 * alpha * k;
    for (const p of grp.paths) groundPath(g, c, p, p.total * k);
  }
  g.globalAlpha = 1;
}

// 墨滴：顶光里一枚带亮边的黑色水滴，b 为 0–1
function inkDrop(g, c, b) {
  const Y = 1250 * (1 - b * b);
  const p = proj(c, IMPACT.x, Y, IMPACT.z), base = proj(c, IMPACT.x, 0, IMPACT.z);
  const cone = g.createLinearGradient(0, 0, 0, base.y);
  cone.addColorStop(0, 'rgba(250,240,225,0.0)');
  cone.addColorStop(1, 'rgba(250,240,225,0.09)');
  g.fillStyle = cone;
  g.beginPath(); g.moveTo(base.x - 60, 0); g.lineTo(base.x + 60, 0); g.lineTo(base.x + 260, base.y); g.lineTo(base.x - 260, base.y); g.fill();
  const r = Math.max(9, 58 * p.s), stretch = 1.15 + 0.9 * b;
  g.strokeStyle = 'rgba(250,246,242,0.25)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(p.x, p.y - r * stretch - 40 * b); g.lineTo(p.x, p.y - r * stretch - 160 * b); g.stroke();
  g.fillStyle = '#050403';
  g.beginPath(); g.ellipse(p.x, p.y, r * 0.82, r * stretch, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(250,246,242,0.8)'; g.lineWidth = 1.6; g.stroke();
  g.fillStyle = LIGHT;
  g.beginPath(); g.arc(p.x - r * 0.3, p.y - r * 0.45, r * 0.18, 0, Math.PI * 2); g.fill();
}

// 落地后：墨迹沿不规则边缘铺开，冲击环扩散，墨点向上溅起再落回
function splash(g, c, lb) {
  const r = rng(5);
  const wob = Array.from({length: 4}, () => r() * 6.28);
  const rad = 720 * out(seg(lb, 0, 1.3));
  if (rad > 1) {
    const pts = [];
    for (let i = 0; i < 90; i++) {
      const a = i / 90 * Math.PI * 2;
      const k = 1 + 0.16 * Math.sin(5 * a + wob[0]) + 0.08 * Math.sin(11 * a + wob[1]) + 0.05 * Math.sin(23 * a + wob[2]);
      const p = proj(c, IMPACT.x + rad * k * Math.cos(a), 0, IMPACT.z + rad * k * Math.sin(a));
      if (p.z < NEAR) return;
      pts.push(p);
    }
    g.fillStyle = 'rgba(5,4,3,0.92)'; poly(g, pts); g.fill();
    g.strokeStyle = `rgba(250,246,242,${0.55 - 0.25 * seg(lb, 1, 3)})`; g.lineWidth = 1.8; g.stroke();
  }
  const ring = out(seg(lb, 0, 1));
  if (ring < 1) {
    const pts = groundCircle(c, IMPACT.x, IMPACT.z, 200 + 3400 * ring);
    if (pts) {
      g.strokeStyle = `rgba(250,246,242,${0.85 * (1 - ring)})`; g.lineWidth = 2 + 10 * (1 - ring);
      poly(g, pts); g.stroke();
    }
  }
  const t = lb * 0.5;
  if (lb < 1) {
    g.fillStyle = LIGHT;
    for (let i = 0; i < 110; i++) {
      const a = r() * Math.PI * 2, sp = 500 + r() * 1300, up = 600 + r() * 1400;
      const y = up * t - 4200 * t * t;
      if (y < 0) continue;
      const p = proj(c, IMPACT.x + Math.cos(a) * sp * t, y, IMPACT.z + Math.sin(a) * sp * t);
      if (p.z < NEAR) continue;
      g.globalAlpha = 0.9 * (1 - lb);
      const sz = Math.max(2, (14 + r() * 18) * p.s);
      g.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    g.globalAlpha = 1;
  }
  flash(g, 0.32 * (1 - seg(lb, 0, 0.5)), false, 960, proj(c, IMPACT.x, 0, IMPACT.z).y);
}

// ---------- 第 9 页：俯瞰晶格平原，前几页的物件拼成“大” ----------

function makeIcons() {
  const draw = (fn, w = 120, h = 120) => { const c = canvas(w, h); const g = c.getContext('2d'); g.strokeStyle = LIGHT; g.fillStyle = LIGHT; g.lineWidth = 4; g.lineCap = 'round'; fn(g); return c; };
  return [
    draw(g => { g.beginPath(); g.moveTo(40, 96); g.lineTo(40, 44); g.arc(60, 44, 20, Math.PI, 0); g.lineTo(80, 96); g.rect(34, 96, 52, 12); g.stroke(); g.strokeStyle = ACCENT; g.beginPath(); g.moveTo(55, 92); g.lineTo(55, 50); g.lineTo(65, 50); g.lineTo(65, 92); g.stroke(); }),
    draw(g => { g.strokeRect(26, 14, 68, 92); for (let y = 34; y < 100; y += 14) { g.beginPath(); g.moveTo(36, y); g.lineTo(84, y); g.stroke(); } }),
    draw(g => { g.strokeRect(14, 26, 92, 68); g.fillStyle = ACCENT; g.fillRect(14, 40, 6, 16); g.fillStyle = LIGHT; for (const y of [48, 64, 80]) g.fillRect(30, y - 2, 64, 4); }),
    draw(g => { g.beginPath(); g.arc(60, 60, 30, 0, Math.PI * 2); g.fill(); }),
    draw(g => { g.beginPath(); g.arc(60, 60, 30, 0, Math.PI * 2); g.fillStyle = ACCENT; g.fill(); }),
    draw(g => { g.save(); g.translate(60, 60); g.rotate(-0.12); g.strokeRect(-34, -46, 68, 92); g.restore(); }),
    draw(g => { g.fillStyle = ACCENT; g.fillRect(30, 30, 60, 60); g.fillStyle = ACCENT_TOP; g.beginPath(); g.moveTo(30, 30); g.lineTo(42, 18); g.lineTo(102, 18); g.lineTo(90, 30); g.fill(); }),
  ];
}

const CREED_GRID = (() => {
  const pts = [];
  for (let z = -2400; z <= 2400; z += 150) for (let x = -3300; x <= 3300; x += 150) pts.push([x, z]);
  return pts;
})();
const CREED_DAI = {x: 900, scale: 2.1};
const creedCam = b => orbit(CREED_DAI.x * 0.55, 0, 0, lerp(2300, 3500, ease(seg(b, 0, 4))), lerp(1.47, 1.12, ease(seg(b, 0, 4))));

// ---------- 第 7 页：成都到杭州的立体地图 ----------

const AID = {C: [-1500, 0, 900], Hz: [1300, 0, 1100], ctrl: [0, 1700, 1000], pile: [1300, 0, -300], r: 46};
const aidCam = b => orbit(0, 0, 150, 3000, 0.5, lerp(-0.12, 0.1, ease(seg(b, 0, 12))));
const KINDS = [...Array(22).fill('staff'), ...Array(30).fill('lect'), ...Array(3).fill('assoc'), ...Array(3).fill('prof')];
const PILE = (() => {
  const r = rng(51), spots = [];
  let row = 0, i = 0;
  while (i < KINDS.length) {
    const n = Math.max(1, 12 - row);
    for (let c = 0; c < n && i < KINDS.length; c++, i++) spots.push([AID.pile[0] + (c - (n - 1) / 2) * 94 + (r() - 0.5) * 8, AID.r + row * 80, AID.pile[2] + (r() - 0.5) * 10]);
    row++;
  }
  return spots;
})();
const AID_GRID = (() => {
  const pts = [];
  for (let z = -1400; z <= 2800; z += 130) for (let x = -2800; x <= 2800; x += 130) pts.push([x, z]);
  return pts;
})();
const bez3 = (a, c, b, u) => a.map((v, i) => (1 - u) ** 2 * v + 2 * (1 - u) * u * c[i] + u * u * b[i]);

// ---------- 无人机 ----------

const DRONE_ZT = 4200;
const droneCam = b => cam(0, 260, 0, lerp(0.06, -0.06, ease(seg(b, 0, 8))));

// ---------- 版面与预先计算 ----------

const OPEN = {name: 300, nameY: 600};
const NEWARK = {x: LEFT - 10, y: 560, size: 300};
const L = {
  creed: {size: 150, x: LEFT, y: 680},
  drones: {size: 190, x: 900, y: [450, 690]},
  year: {size: 440, x: 110, y: 660},
  word: {size: 112, x: LEFT, y: 560},
};
const MOTTO_CUBES = (() => {
  const chars = [...MOTTO.lines[0], ...MOTTO.lines[1]];
  return chars.map((ch, i) => ({ch, i, X: -520 + (i % 4) * 270, Z: i < 4 ? 3200 : 2200, key: i >= 6}));
})();
const DAI = MOTTO_CUBES[2];
const CUBE = 240;
const ROSTER = {x: 1080, y: 330, w: 640, h: 560};
let P = {};

function prepare() {
  const m = canvas(10, 10).getContext('2d');
  // 开场八个字的贴图与字框
  P.openTex = canvas(OT.w, OT.h); P.openMask = canvas(OT.w, OT.h); P.openPat = canvas(OT.w, OT.h);
  const pg = P.openPat.getContext('2d');
  pg.fillStyle = pg.createPattern(makeLatticeTile(), 'repeat'); pg.fillRect(0, 0, OT.w, OT.h);
  m.font = font(OT.size, 900);
  P.openBoxes = [];
  for (const row of OT.rows) {
    let x = (OT.w - m.measureText(row.str).width) / 2;
    for (const ch of row.str) {
      const w = m.measureText(ch).width;
      P.openBoxes.push({ch, x0: x, x1: x + w, y0: row.base - OT.size * 0.9, y1: row.base + OT.size * 0.12, base: row.base});
      x += w;
    }
  }
  // 立定后的八个字在第 10 拍相机下的屏幕点：炸开的墨点从这里出发
  openTexture(P.openBoxes.map(() => 1));
  const md = P.openMask.getContext('2d').getImageData(0, 0, OT.w, OT.h).data;
  const tp = pickPoints(md, OT.w, OT.h, 1700, 2, P.openBoxes.slice(6));
  const bc = openCam(OPEN_BURST_BEAT), {O, V} = openPlaneAt(Math.PI / 2);
  P.openPts = tp.map(p => { const q = proj(bc, O[0] + p.x, O[1] + V[1] * p.y, O[2] + V[2] * p.y); return {x: q.x, y: q.y, accent: p.accent}; });
  P.openKey = '';
  m.font = font(OPEN.name, 900);
  OPEN.nameX = (W - m.measureText(SCRIPT.open.name.text).width) / 2;
  P.name = glyphPoints([{str: SCRIPT.open.name.text, x: OPEN.nameX, y: OPEN.nameY}], OPEN.name, 1700, 3);
  P.nameFrom = scatter(P.name.length, 21, [0, 0, 1, 1]);
  P.floor = makeFloor();
  P.hole = holeCenter(SCRIPT.newark.year.text, 3, NEWARK.x, NEWARK.y, NEWARK.size);
  P.holeScale = 1.7 * Math.max(W / P.hole.w, H / P.hole.h);
  P.tubes = canvas().getContext('2d').createPattern(makeTubeTile('rgba(14,13,11,0.62)'), 'repeat');
  P.tubesLight = canvas().getContext('2d').createPattern(makeTubeTile('rgba(250,246,242,0.55)'), 'repeat');
  P.tubesLight.setTransform(new DOMMatrix().scale(0.16));
  P.creed = glyphPoints([{str: MOTTO.text, x: L.creed.x, y: L.creed.y}], L.creed.size, 1700, 5, 7);
  // 第 9 页的“大”：字形取点换成地面坐标，前 70 个点放物件，其余是墨点
  const dai = glyphPoints([{str: '大', x: 960 - 450, y: 540 + 360}], 900, 1770, 6);
  P.dai = dai.map(p => ({x: CREED_DAI.x + (p.x - 960) * CREED_DAI.scale, z: (540 - p.y) * CREED_DAI.scale}));
  const sr = rng(26);
  P.daiFrom = P.dai.map(() => ({x: (sr() - 0.5) * 6200, z: (sr() - 0.5) * 4200, d: sr()}));
  const still = creedCam(4);
  P.daiScreen = P.dai.slice(70).map((p, i) => { const q = proj(still, p.x, 0, p.z); return {x: q.x, y: q.y, d: P.daiFrom[i + 70].d}; });
  P.icons = makeIcons();
  const fc = droneCam(8);
  P.drones = glyphPoints(MOTTO.lines.map((str, i) => ({str, x: L.drones.x, y: L.drones.y[i]})), L.drones.size, 2026, 9, 6)
    .map(p => ({...p, w: unproject(fc, p.x, p.y, DRONE_ZT)}));
  const dr = rng(23);
  P.dronesFrom = P.drones.map(() => ({x: -1700 + dr() * 3600, z: 1500 + dr() * 2200, d: dr()}));
  P.year = glyphPoints([{str: SCRIPT.y1979.year.text, x: L.year.x, y: L.year.y}], L.year.size, 900, 13);
  P.yearFall = scatter(P.year.length, 29, [-1, 0, 1, 1]);
  P.words = SCRIPT.plan.words.map((w, i) => glyphPoints([{str: w.text, x: L.word.x, y: L.word.y}], L.word.size, 1100, 40 + i));
  P.wordsFrom = scatter(1100, 24, [60, 380, 1300, 1000]);
  m.font = font(L.year.size, 900);
  P.yearW = m.measureText(SCRIPT.y1979.year.text).width;
  P.papers = SCRIPT.exam.subjects.map(sub => {
    const c = canvas(260, 350), g = c.getContext('2d');
    g.fillStyle = INK2; g.fillRect(0, 0, 260, 350);
    g.strokeStyle = FOG; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 257, 347);
    g.fillStyle = DEEP;
    for (let y = 135; y < 335; y += 26) g.fillRect(30, y, 200, 1.5);
    g.font = font(70, 900); g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = LIGHT;
    g.fillText(sub.text, 130, 95);
    return c;
  });
  P.work = canvas(); P.layer = canvas(); P.board = canvas(); P.roster = canvas(ROSTER.w, ROSTER.h);
}

// 正对画面的相机：Z = 0 的平面与屏幕一比一重合，用于贴图平面的翻转
const FLAT = cam(0, 0, -1100, 0, 0, 1100);
const flatO = (sx, sy) => [sx - 960, 540 - sy, 0];

// ---------- 各页 ----------

const DRAW = {
  open(g, s) {
    const b = s.b, a = SCRIPT.open;
    const c = openCam(b);
    const R = 700 + 5600 * out(seg(b, OPEN_DROP_BEAT + 0.15, OPEN_REVEAL_BEAT + 0.8));
    const groundAlpha = (1 - 0.5 * seg(b, OPEN_BURST_BEAT, OPEN_BURST_BEAT + 1)) * (1 - seg(b, 14.6, 16));
    openGround(g, c, b < OPEN_DROP_BEAT ? 0 : R, groundAlpha * (b < OPEN_DROP_BEAT ? 0.5 : 1));
    if (b < OPEN_DROP_BEAT) inkDrop(g, c, b);
    else if (b < OPEN_BURST_BEAT) splash(g, c, b - OPEN_DROP_BEAT);
    if (b >= OPEN_REVEAL_BEAT && b < OPEN_BURST_BEAT) {
      const ks = a.glyphs.map(l => out(seg(b, l.at, l.at + 0.42)));
      openTexture(ks);
      const {O, V} = openPlaneAt(standAngle(b));
      plane(g, c, P.openTex, O, 1, V, {fade: z => clamp(1.4 - z / 9000)});
      const i = a.glyphs.findLastIndex(l => b >= l.at);
      if (i >= 0 && b < OPEN_STAND_BEAT) flash(g, 0.14 * (1 - seg(b, a.glyphs[i].at, a.glyphs[i].at + 0.4)), i >= 6, 960, 520);
      if (b >= OPEN_STAND_BEAT) {
        // 立定：一圈尘土从字的底边向外扫开
        const k = out(seg(b, OPEN_STAND_BEAT, OPEN_STAND_BEAT + 0.9));
        flash(g, 0.3 * (1 - seg(b, OPEN_STAND_BEAT, OPEN_STAND_BEAT + 0.6)), false, 960, 700);
        const left = proj(c, -OT.w / 2 - 300 * k, 0, OT.near), right = proj(c, OT.w / 2 + 300 * k, 0, OT.near);
        const grad = g.createLinearGradient(0, left.y - 60, 0, left.y + 30);
        grad.addColorStop(0, 'rgba(250,246,242,0)');
        grad.addColorStop(1, `rgba(250,246,242,${0.35 * (1 - k)})`);
        g.fillStyle = grad; g.fillRect(left.x, left.y - 60, right.x - left.x, 90);
      }
    } else if (b < OPEN_SNAP_BEAT && b >= OPEN_BURST_BEAT) {
      // 立着的八个字炸成墨点，冲击环扩散，墨点再聚成人名
      const burst = out(seg(b, OPEN_BURST_BEAT, OPEN_BURST_BEAT + 1));
      flash(g, 0.22 * (1 - seg(b, OPEN_BURST_BEAT, OPEN_BURST_BEAT + 0.8)));
      const ring = out(seg(b, OPEN_BURST_BEAT, OPEN_BURST_BEAT + 1.1));
      g.save();
      g.strokeStyle = LIGHT; g.shadowColor = LIGHT; g.shadowBlur = 30;
      g.globalAlpha = 0.9 * (1 - ring); g.lineWidth = 3 + 16 * (1 - ring);
      g.beginPath(); g.ellipse(960, 540, 700 + 900 * ring, 380 + 500 * ring, 0, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = ACCENT; g.shadowColor = ACCENT; g.globalAlpha = 0.7 * (1 - ring); g.lineWidth = 2 + 6 * (1 - ring);
      g.beginPath(); g.ellipse(960, 540, 640 + 500 * ring, 330 + 300 * ring, 0, 0, Math.PI * 2); g.stroke();
      g.restore();
      for (let i = 0; i < P.openPts.length; i++) {
        const p = P.openPts[i], q = P.name[i], f = P.nameFrom[i];
        const dx = p.x - 960, dy = p.y - 540;
        const len = Math.hypot(dx, dy) || 1, ang = Math.atan2(dy, dx) + (f.x - 0.5) * 1.2;
        const dist = 220 + 620 * f.y;
        const bx = p.x + Math.cos(ang) * dist * (0.4 + 0.6 * len / 700), by = p.y + Math.sin(ang) * dist * 0.6;
        const back = ease(seg(b, OPEN_BURST_BEAT + 0.9 + f.d * 0.5, OPEN_SNAP_BEAT));
        g.globalAlpha = 0.75 + 0.25 * Math.max(1 - burst, back);
        g.fillStyle = p.accent && back < 0.85 ? ACCENT : LIGHT;
        const sz = 4 + 4 * (1 - back) * (0.5 + f.d);
        g.fillRect(lerp(lerp(p.x, bx, burst), q.x, back) - sz / 2, lerp(lerp(p.y, by, burst), q.y, back) - sz / 2, sz, sz);
      }
      g.globalAlpha = 1;
    } else if (b >= OPEN_SNAP_BEAT && b < 14.6) {
      const pop = 1 + 0.04 * (1 - out(seg(b, OPEN_SNAP_BEAT, OPEN_SNAP_BEAT + 0.6)));
      const push = pop * (1 + 0.03 * seg(b, OPEN_SNAP_BEAT, 14.6));
      flash(g, 0.25 * (1 - seg(b, OPEN_SNAP_BEAT, OPEN_SNAP_BEAT + 0.8)));
      g.save();
      g.translate(960, OPEN.nameY - 110); g.scale(push, push); g.translate(-960, -(OPEN.nameY - 110));
      text(g, a.name.text, OPEN.nameX, OPEN.nameY, font(OPEN.name, 900), LIGHT);
      g.restore();
    } else if (b >= 14.6) rain(g, P.name, seg(b, 14.6, 16), 4, LIGHT, 61);
    if (b >= OPEN_SNAP_BEAT) {
      const fade = 1 - seg(b, 14.4, 15.2);
      g.globalAlpha = fade;
      setFont(g, font(40), NARR_SPACING);
      typed(g, a.role, s, 960 - g.measureText(a.role.text).width / 2, 720, font(40), MIST);
      g.globalAlpha = fade * out(seg(b, a.term.at, a.term.at + 0.4));
      if (b >= a.term.at) text(g, a.term.text, 960, 790, MONO(30), FOG, 'center', '2px');
      g.globalAlpha = 1;
    }
  },

  motto(g, s) {
    const b = s.b, a = SCRIPT.motto;
    // 人名的墨点落到地面，文字平原从近处向远处点亮；末尾相机加速冲向变暗的“大”字方块
    const dive = seg(b, 13.4, 16), dv = inQ(dive);
    const z0 = 300 + 140 * seg(b, 0, 13.4);
    const pitch = lerp(0.38, 0, ease(dive));
    const c = cam(lerp(0, DAI.X + CUBE / 2, dv), lerp(1000, 58, dv), lerp(z0, DAI.Z - 52, dv), pitch);
    const wave = 2600 + 9000 * out(seg(b, 0, 0.9));
    plane(g, c, P.floor, [-P.floor.width * 0.7, 0, 16000], 1.4, [0, 0, -1.4], {wrap: true, fade: z => clamp(1.15 - z / 9500) * clamp((wave - z) / 600)});
    const hy = 540 - c.f * Math.tan(pitch);
    const fogBand = g.createLinearGradient(0, hy - 40, 0, hy + 140);
    fogBand.addColorStop(0, 'rgba(14,13,11,1)');
    fogBand.addColorStop(1, 'rgba(14,13,11,0)');
    g.fillStyle = fogBand; g.fillRect(0, hy - 40, W, 180);
    flash(g, 0.22 * (1 - seg(b, 0, 0.5)), false, 960, 700);
    const rise = ease(seg(b, 11, 13.6));
    const cubes = MOTTO_CUBES.map(q => {
      const t = clamp((b - (a.cubes.at + q.i * 0.5)) / 0.5);
      return {...q, t, Y: lerp(1500, 0, drop(t)) + (q.key ? 380 * rise : 0)};
    }).filter(q => q.t > 0).sort((p, q) => q.Z - p.Z || Math.abs(q.X) - Math.abs(p.X));
    for (const q of cubes) {
      // 冲向“大”时它继续压暗成暗红褐，盖满画面时只剩面上的电子管纹理
      const isDai = q.i === DAI.i;
      const face = isDai ? clamp((dv - 0.25) / 0.5) : 0;
      const dim = q.key ? 0 : Math.max(0.35 * rise, isDai ? clamp(dv * 2) : 0);
      cube3d(g, c, q.X, q.Y, q.Z, CUBE, q.ch, dim, q.key ? rise : 0, face);
    }
    const fade = 1 - seg(b, 13.4, 14.4);
    g.globalAlpha = fade;
    narration(g, a.lines[0], s, LEFT, 170, 99, 1);
    narration(g, a.lines[1], s, LEFT, 236, 99, 2);
    typed(g, a.question, s, LEFT, 350, font(66, 900), LIGHT, 'left', '6px');
    if (b >= 5) source(g, a.source);
    g.globalAlpha = 1;
  },

  newark(g, s) {
    const b = s.b, a = SCRIPT.newark;
    // 结尾推进穿过“1930”里“0”的字怀：其余元素先退场，字怀放大到盖满画面后停 7 帧，下一页在落拍帧进入雾中
    const fade = 1 - seg(b, 11.6, 12.2);
    const z = seg(b, 12, 13.5), e = ease(z);
    const sc = Math.exp(Math.log(P.holeScale) * inQ(z)) * (1 + 0.025 * (1 - out(seg(b, 0, 0.6))));
    flash(g, 0.2 * (1 - seg(b, 0, 0.5)), false, 600, 500);
    tube3d(g, 1590, 600, 0.95, -0.6 + s.local * 0.018, 0.5 + 0.5 * out(seg(b, 1, 4)), fade * out(seg(b, 0, 1.2)), out(seg(b, 0, 1.4)));
    g.globalAlpha = fade;
    keyCubes(g, 1560, 170 + Math.sin(s.local * 0.08) * 6, 62, 0.6);
    g.globalAlpha = 1;
    const wg = ctxOf(P.work);
    wg.save();
    wg.translate(lerp(P.hole.x, 960, e), lerp(P.hole.y, 540, e)); wg.scale(sc, sc); wg.translate(-P.hole.x, -P.hole.y);
    wg.font = font(NEWARK.size, 900); wg.textBaseline = 'alphabetic'; wg.textAlign = 'left'; wg.fillStyle = LIGHT;
    wg.fillText(a.year.text, NEWARK.x, NEWARK.y);
    wg.restore();
    if (z < 0.4) {
      // 字形里平铺电子管小图，与上一页“大”字方块面上的纹理相同，缓慢横移
      wg.globalCompositeOperation = 'source-atop'; wg.globalAlpha = 1 - z / 0.4;
      wg.translate(-((s.local * 0.5) % 56), 0);
      wg.fillStyle = P.tubes; wg.fillRect(0, 0, W + 56, H);
      wg.setTransform(1, 0, 0, 1, 0, 0);
      wg.globalCompositeOperation = 'source-over'; wg.globalAlpha = 1;
    }
    g.drawImage(P.work, 0, 0);
    g.globalAlpha = fade;
    typed(g, a.place, s, LEFT + 6, 700, font(72, 900), MIST, 'left', '8px');
    redCircle(g, LEFT + 260, 676, 300, 74, seg(b, 3, 3.8), 5);
    typed(g, a.lines[0], s, LEFT + 6, 860);
    if (b >= 1) source(g, a.source);
    g.globalAlpha = 1;
    corner(g, a.corner, fade);
  },

  plan(g, s) {
    const b = s.b, a = SCRIPT.plan;
    fogScene(g, s.local, 1);
    g.save();
    const push = 1 + 0.05 * ease(b / 14);
    g.translate(1300, 640); g.scale(push, push); g.translate(-1300, -640);
    tube3d(g, 1500, 545, 0.85, 0.2 + s.local * 0.012, 0.9 * out(seg(b, 1, 4)), 0.8 * out(seg(b, 0, 3)), out(seg(b, 0, 3)));
    figure(g, lerp(820, 1060, b / 14), 720, 150, s.local * 0.16);
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
      if (b < 13) cloud(g, P.words[1], P.wordsFrom, seg(b, w1.at, w1.at + 1), 4.2, LIGHT);
      else rain(g, P.words[1], seg(b, 13, 14), 4.2, LIGHT, 72);
    }
    corner(g, a.corner);
    if (b >= 1) { demo(g, a.demo, SAFE_R, 990); source(g, a.source); }
  },

  hire(g, s) {
    const b = s.b, a = SCRIPT.hire;
    const leave = 1 - seg(b, 11.8, 12.6);
    // 年份：落拍时 1930 满屏，0.6 拍内滚到 1937 并缩到左上；第 12 拍起放大并滚到 1979，交给下一页的特写
    const k = ease(seg(b, 0.6, 1.2)), k2 = ease(seg(b, 12, 13.6));
    const size = Math.round(lerp(lerp(560, 200, k), 600, k2));
    const yx = lerp(lerp(140, LEFT - 6, k), 330, k2), yy = lerp(lerp(780, 300, k), 800, k2);
    const late = b >= 12;
    const w = odometer(g, yx, yy, size, late ? '1937' : '1930', late ? '1979' : '1937', late ? ease(seg(b, 12.2, 13.8)) : out(seg(b, 0, 0.6)));
    g.fillStyle = DEEP; g.globalAlpha = leave;
    g.fillRect(yx, yy + size * 0.08, w * out(seg(b, 0, 0.8)), 3);
    narration(g, a.lines[0], s, LEFT, 420, 99, 6);
    narration(g, a.lines[1], s, LEFT, 486, 99, 7);
    narration(g, a.lines[2], s, LEFT, 580, 99, 8);
    typed(g, a.found, s, LEFT, 720, font(84, 900), LIGHT, 'left', '4px');
    g.globalAlpha = 1;
    // 名册：像一块挂牌从上沿翻下来；每半拍登记一行，扫描条跟着新行下移；“有蒋葆增”时扫描条退回第一行变成朱橙
    const swing = seg(b, a.names[0].at - 1, a.names[0].at);
    if (swing > 0 && leave > 0) {
      const rg = ctxOf(P.roster);
      const lx = 30, row0 = 140, rowH = 84, nx = lx + 96;
      rg.font = font(22); rg.fillStyle = FOG; rg.textBaseline = 'alphabetic'; rg.fillText(a.listHead.text, lx, 50);
      rg.strokeStyle = FOG; rg.lineWidth = 1.5;
      rg.beginPath(); rg.moveTo(lx, 70); rg.lineTo(lx + 560, 70); rg.stroke();
      rg.strokeStyle = INK2; rg.lineWidth = 1;
      for (let i = 1; i <= a.names.length; i++) { rg.beginPath(); rg.moveTo(lx, row0 - 64 + i * rowH); rg.lineTo(lx + 560, row0 - 64 + i * rowH); rg.stroke(); }
      const entered = a.names.filter(n => b >= n.at).length;
      const found = seg(b, a.found.at, a.found.at + 0.5);
      if (entered > 0) {
        const last = a.names[entered - 1].at;
        const from = entered > 1 ? entered - 2 : 0;
        const yScan = lerp(lerp(from, entered - 1, out(seg(b, last, last + 0.3))), 0, ease(found));
        const y = row0 - 54 + yScan * rowH;
        rg.fillStyle = found > 0 ? `rgba(253,96,42,${0.08 + 0.12 * found})` : 'rgba(250,246,242,0.07)';
        rg.fillRect(lx - 14, y, 588, rowH - 8);
        rg.fillStyle = found > 0 ? ACCENT : LIGHT;
        rg.fillRect(lx - 14, y, 4, rowH - 8);
      }
      a.names.forEach((n, i) => {
        if (b < n.at) return;
        const t = out(seg(b, n.at, n.at + 0.4));
        const hit = i === 0 && found > 0;
        rg.globalAlpha = t;
        rg.font = MONO(22); rg.letterSpacing = '0px'; rg.fillStyle = FOG; rg.fillText(String(i + 1).padStart(2, '0'), lx + 4, row0 + i * rowH);
        rg.font = font(52, hit ? 900 : 400); rg.letterSpacing = '6px'; rg.fillStyle = hit ? ACCENT : LIGHT;
        rg.fillText(n.text, nx + 60 * (1 - t), row0 + i * rowH);
        rg.letterSpacing = '0px';
        rg.globalAlpha = 1;
      });
      redCircle(rg, nx + 86, row0 - 18, 128, 46, seg(b, a.found.at + 1, a.found.at + 1.8), 8);
      const phi = 1.45 * (1 - drop(swing));
      g.globalAlpha = leave;
      if (phi > 0.001) plane(g, FLAT, P.roster, flatO(ROSTER.x, ROSTER.y), 1, [0, -Math.cos(phi), Math.sin(phi)], {alpha: leave});
      else g.drawImage(P.roster, ROSTER.x, ROSTER.y);
      g.globalAlpha = 1;
      if (ROSTER.x + 30 + 588 > SAFE_R) report('超出安全区：名册');
    }
    corner(g, a.corner, leave);
    if (b >= 1) { g.globalAlpha = leave; source(g, a.source); g.globalAlpha = 1; }
  },

  y1979(g, s) {
    const b = s.b, a = SCRIPT.y1979;
    const crumble = seg(b, 12, 14);
    // 落拍时是“9”的特写，一拍多拉远，露出年份下方顶光里的小人影；地面网格同时后退
    const cam1 = ease(seg(b, 0, 1.2)), sc = lerp(3.6, 1, cam1);
    const gc = cam(0, 300, lerp(2600, 0, cam1) - 40 * seg(b, 1.2, 14), 0.05);
    g.strokeStyle = LIGHT; g.lineWidth = 1.2;
    for (let x = -4200; x <= 4200; x += 350) {
      g.globalAlpha = 0.1 * (1 - crumble);
      const p0 = proj(gc, x, 0, 3200), p1 = proj(gc, x, 0, 14000);
      g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
    }
    for (let z = 3200; z <= 14000; z += 500) {
      const p0 = proj(gc, -4200, 0, z), p1 = proj(gc, 4200, 0, z);
      g.globalAlpha = 0.12 * clamp(1.2 - p0.z / 12000) * (1 - crumble);
      g.beginPath(); g.moveTo(p0.x, p0.y); g.lineTo(p1.x, p1.y); g.stroke();
    }
    g.globalAlpha = 1;
    const fx = L.year.x + 0.8 * P.yearW, fy = L.year.y - 170;
    const camera = c => { c.translate(fx, fy); c.scale(sc, sc); c.translate(-fx, -fy); };
    g.save();
    camera(g);
    const cone = g.createLinearGradient(0, 0, 0, 960);
    cone.addColorStop(0, 'rgba(250,240,225,0.0)');
    cone.addColorStop(1, 'rgba(250,240,225,0.10)');
    g.fillStyle = cone;
    g.beginPath(); g.moveTo(560, 0); g.lineTo(640, 0); g.lineTo(760, 960); g.lineTo(440, 960); g.fill();
    figure(g, 600, 950, 120, 0);
    g.restore();
    if (crumble < 1) {
      const wg = ctxOf(P.work);
      wg.save();
      camera(wg);
      wg.font = font(L.year.size, 900); wg.textBaseline = 'alphabetic'; wg.textAlign = 'left'; wg.fillStyle = LIGHT;
      wg.fillText(a.year.text, L.year.x, L.year.y);
      wg.restore();
      // 纹理线用 source-atop，只画在字形内；线距固定在画面座标，拉远时字里的线变密
      wg.globalCompositeOperation = 'source-atop';
      wg.fillStyle = 'rgba(14,13,11,0.5)';
      const shift = (s.local * 0.6) % 12;
      for (let y = shift; y < H; y += 12) wg.fillRect(0, y, W, 2);
      wg.globalCompositeOperation = 'source-over';
      g.globalAlpha = 1 - crumble;
      g.drawImage(P.work, 0, 0);
      g.globalAlpha = 1;
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
    const fade = 1 - seg(b, 11.6, 13);
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
    if (b >= 1) { g.globalAlpha = fade; demo(g, a.demo, 760, 1000, 'left'); source(g, a.source); g.globalAlpha = 1; }
  },

  aid(g, s) {
    const b = s.b, a = SCRIPT.aid;
    const c = aidCam(b);
    // 地图地面：晶格点与两座城市的标记环；镜头绕地图缓慢转动
    const lit = out(seg(b, 0, 1.5));
    g.fillStyle = LIGHT;
    for (const [x, z] of AID_GRID) {
      const p = proj(c, x, 0, z);
      if (p.z < NEAR) continue;
      g.globalAlpha = (0.08 + 0.16 * lit) * clamp(1.3 - p.z / 6000);
      const sz = Math.max(1.5, 7 * p.s);
      g.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    g.globalAlpha = 1;
    for (const [i, city] of [AID.C, AID.Hz].entries()) {
      if (b < a.places[i].at) continue;
      const k = out(seg(b, a.places[i].at, a.places[i].at + 0.8));
      for (const rr of [60, 160 * k + 60]) {
        const pts = groundCircle(c, city[0], city[2], rr, 48);
        if (!pts) continue;
        g.strokeStyle = i ? ACCENT : LIGHT; g.globalAlpha = rr > 100 ? 0.5 * (1 - 0.6 * k) : 0.9; g.lineWidth = 2;
        poly(g, pts); g.stroke();
      }
      g.globalAlpha = 1;
    }
    // 成都、杭州逐拍落在左右两半，再缩成地图上两城上方的标签
    const k = ease(seg(b, 1.6, 2.3));
    const size = lerp(300, 54, k);
    const anchors = [AID.C, AID.Hz].map(p => proj(c, p[0], 0, p[2]));
    const big = [{x: 500, y: 640}, {x: 1420, y: 640}];
    a.places.forEach((pl, i) => {
      if (b < pl.at) return;
      const pop = 1 + 0.05 * (1 - out(seg(b, pl.at, pl.at + 0.4)));
      setFont(g, font(Math.round(size * pop), 900), `${Math.round(lerp(10, 6, k))}px`);
      g.textAlign = 'center'; g.fillStyle = LIGHT;
      g.fillText(pl.text, lerp(big[i].x, anchors[i].x, k), lerp(big[i].y, anchors[i].y - 46, k));
      g.letterSpacing = '0px';
    });
    // 立体弧线：从成都升起，落到杭州上空
    const start = [AID.C[0], 60, AID.C[2]], end = [AID.Hz[0], 220, AID.Hz[2]];
    const drawn = out(seg(b, 1, 1.8));
    if (drawn > 0) {
      g.save();
      g.strokeStyle = MIST; g.lineWidth = 3; g.setLineDash([16, 12]); g.lineDashOffset = -s.local * 1.5;
      g.beginPath();
      for (let u = 0; u <= drawn + 1e-6; u += 0.02) { const p = proj(c, ...bez3(start, AID.ctrl, end, Math.min(u, drawn))); u === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y); }
      g.stroke();
      g.restore();
      const head = proj(c, ...bez3(start, AID.ctrl, end, drawn));
      g.fillStyle = LIGHT; g.beginPath(); g.arc(head.x, head.y, 7, 0, Math.PI * 2); g.fill();
    }
    // 58 颗球每帧出发一颗，沿弧线飞到杭州，再落进前方的小山；最后三颗朱橙球升起，汇成下一页的光轮
    const lift = ease(seg(b, 10.4, 12));
    let landed = 0;
    const flying = [];
    KINDS.forEach((kind, i) => {
      const t = clamp((s.local - 34 - i) / 24);
      if (t <= 0) return;
      if (t >= 1) landed++;
      let w;
      if (t < 0.6) w = bez3(start, AID.ctrl, end, ease(t / 0.6));
      else { const u = (t - 0.6) / 0.4; w = [lerp(end[0], PILE[i][0], u), lerp(end[1], PILE[i][1], drop(u)), lerp(end[2], PILE[i][2], u)]; }
      const p = proj(c, ...w);
      let x = p.x, y = p.y, rad = AID.r * p.s;
      if (kind === 'prof' && lift > 0) { x = lerp(x, 1480, lift); y = lerp(y, 250, lift); rad = lerp(rad, 40, lift); }
      flying.push({x, y, rad, kind, z: p.z, row: w[1]});
    });
    flying.sort((p, q) => q.z - p.z || p.row - q.row);
    for (const o of flying) ball(g, o.x, o.y, o.rad, o.kind);
    if (lift > 0) flash(g, 0.25 * lift, false, 1480, 250);
    if (b >= a.count.at) {
      const w = text(g, String(landed), LEFT - 6, 640, DIN(220), LIGHT);
      text(g, '人', LEFT + w + 10, 640, font(56, 900), LIGHT);
    }
    if (b >= a.legend.at) {
      g.globalAlpha = out(seg(b, a.legend.at, a.legend.at + 0.6));
      const items = [[ACCENT, '教授 3'], [LIGHT, '副教授 3'], [MIST, '讲师 30'], [DEEP, '干部职工 22']];
      let lx = 1060;
      for (const [col, lab] of items) {
        g.fillStyle = col; g.beginPath(); g.arc(lx + 9, 992, 9, 0, Math.PI * 2); g.fill();
        lx += 26 + text(g, lab, lx + 26, 1000, MONO(20), MIST) + 34;
      }
      g.globalAlpha = 1;
      demo(g, a.demo, SAFE_R, 1040);
    }
    narration(g, a.lines[0], s, LEFT, 760, 99, 9);
    narration(g, a.lines[1], s, LEFT, 830, 99, 10);
    corner(g, a.corner);
    if (b >= 1) source(g, a.source);
  },

  exam(g, s) {
    const b = s.b, a = SCRIPT.exam;
    // 最后一拍半整页缩向中心并淡出，像镜头升高拉远，下一页落拍时出现俯瞰的平原
    const zoom = seg(b, 10.5, 12);
    const L2 = zoom > 0 ? ctxOf(P.layer) : g;
    const step = a.subjects.filter(x => b >= x.at).length;
    const grow = step + (step ? out(seg(b, a.subjects[step - 1].at, a.subjects[step - 1].at + 0.4)) - 1 : 0);
    lightOrb(L2, 1480, 250, 40 + 20 * Math.max(0, grow), 0.22 + 0.2 * Math.max(0, grow));
    flash(L2, 0.3 * (1 - seg(b, 0, 0.5)), false, 1480, 250);
    // 三张深灰试卷从画面下方飞来，在空中由侧倾翻正，摊在光下
    const slips = [{x: 1300, y: 640}, {x: 1480, y: 600}, {x: 1660, y: 640}];
    a.subjects.forEach((sub, i) => {
      if (b < sub.at) return;
      const t = out(seg(b, sub.at, sub.at + 0.5));
      const sl = slips[i];
      const cx = lerp(sl.x - 260, sl.x, t), cy = lerp(H + 320, sl.y, t), phi = lerp(1.3, 0, t);
      const V = [0, -Math.cos(phi), Math.sin(phi)];
      const [ox, oy] = flatO(cx, cy);
      if (t > 0.85) { L2.fillStyle = 'rgba(0,0,0,0.45)'; L2.fillRect(cx - 122, cy - 162, 260, 350); }
      plane(L2, FLAT, P.papers[i], [ox - 130, oy + 175 * Math.cos(phi), -175 * Math.sin(phi)], 1, V);
      L2.globalAlpha = t;
      text(L2, sub.text, LEFT + i * 150, 250, font(54, 900), MIST);
      L2.globalAlpha = 1;
    });
    typed(L2, a.lines[0], s, LEFT, 420);
    typed(L2, a.lines[1], s, LEFT, 486);
    typed(L2, a.lines[2], s, LEFT, 600, font(52, 700));
    if (b >= a.first.at) {
      const t = seg(b, a.first.at, a.first.at + 0.5);
      text(L2, a.total.text, 1400, 920, font(40), MIST, 'right');
      cube(L2, 1420, lerp(-140, 800, drop(t)), 120, '第', 0, 0.4);
      cube(L2, 1556, lerp(-180, 800, drop(clamp(t * 1.15 - 0.15))), 120, '一', 0, 0.4);
    }
    corner(L2, a.corner);
    if (b >= 1) source(L2, a.source);
    if (zoom > 0) {
      const k = lerp(1, 0.22, ease(zoom));
      g.globalAlpha = 1 - seg(b, 11, 12);
      g.drawImage(P.layer, 960 * (1 - k), 540 * (1 - k), W * k, H * k);
      g.globalAlpha = 1;
    }
  },

  creed(g, s) {
    const b = s.b, a = SCRIPT.creed;
    const c = creedCam(b);
    const out2 = seg(b, 14, 16);
    const groundAlpha = (1 - 0.6 * seg(b, 7, 10)) * (1 - out2);
    // 俯瞰开场的晶格平原：地面铺着释义与史实的小字，前几页的物件从四处滑来拼成“大”
    plane(g, c, P.floor, [-P.floor.width * 0.7, 0, 3000], 1.4, [0, 0, -1.4], {wrap: true, alpha: 0.55 * groundAlpha, fade: z => clamp(1.4 - z / 7000)});
    g.fillStyle = LIGHT;
    for (const [x, z] of CREED_GRID) {
      const p = proj(c, x, 0, z);
      g.globalAlpha = 0.2 * groundAlpha;
      const sz = Math.max(1.5, 8 * p.s);
      g.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
    }
    g.globalAlpha = 1;
    flash(g, 0.25 * (1 - seg(b, 0, 0.5)));
    const glow = Math.sin(Math.PI * seg(b, 3.4, 5)) * 0.5;
    const iconsAlpha = 1 - seg(b, 7, 7.8);
    if (b < 7.6) {
      g.fillStyle = LIGHT;
      for (let i = 70; i < P.dai.length; i++) {
        const p = P.dai[i], f = P.daiFrom[i];
        const t = ease(seg(b, 0.2 + f.d * 1.4, 1.8 + f.d * 1.6));
        const q = proj(c, lerp(f.x, p.x, t), 0, lerp(f.z, p.z, t));
        g.globalAlpha = (0.25 + 0.6 * t + glow) * clamp(1.5 - seg(b, 7, 7.6) * 1.5);
        const sz = Math.max(2.5, 9 * q.s);
        g.fillRect(q.x - sz / 2, q.y - sz / 2, sz, sz);
      }
    }
    if (iconsAlpha > 0) {
      for (let i = 0; i < 70; i++) {
        const p = P.dai[i], f = P.daiFrom[i];
        const t = ease(seg(b, 0.2 + f.d * 1.4, 1.8 + f.d * 1.6));
        const q = proj(c, lerp(f.x, p.x, t), 0, lerp(f.z, p.z, t));
        const icon = P.icons[i % P.icons.length], sz = 150 * q.s;
        g.globalAlpha = iconsAlpha * (0.55 + 0.45 * t);
        g.drawImage(icon, q.x - sz / 2, q.y - sz * 0.45, sz, sz * 0.9);
      }
      g.globalAlpha = 1;
    }
    if (glow > 0) {
      const cc = proj(c, CREED_DAI.x, 0, 0);
      flash(g, 0.3 * glow, false, cc.x, cc.y);
    }
    // “大”的墨点升起，聚成一行八个字
    if (b >= 7.6) {
      const shrink = ease(out2);
      g.save();
      g.translate(lerp(0, 1440 - 830, shrink), lerp(0, 560 - 620, shrink));
      g.translate(830, 620); g.scale(lerp(1, 0.2, shrink), lerp(1, 0.2, shrink)); g.translate(-830, -620);
      if (b < CREED_SNAP_BEAT) cloud(g, P.creed, P.daiScreen, seg(b, 7.6, CREED_SNAP_BEAT), 3.6, LIGHT);
      else {
        setFont(g, font(L.creed.size, 900)); g.textAlign = 'left';
        const head = MOTTO.text.slice(0, 7);
        g.fillStyle = LIGHT; g.fillText(head, L.creed.x, L.creed.y);
        g.shadowColor = ACCENT; g.shadowBlur = 34;
        g.fillStyle = ACCENT; g.fillText(MOTTO.text.slice(7), L.creed.x + g.measureText(head).width, L.creed.y);
        g.shadowBlur = 0;
        if (g.measureText(MOTTO.text).width + L.creed.x > SAFE_R) report('超出安全区：第九页八个字');
      }
      g.restore();
    }
    g.globalAlpha = (1 - out2) * seg(b, a.lines[0].at - 0.8, a.lines[0].at);
    g.fillStyle = 'rgba(14,13,11,0.82)'; g.fillRect(LEFT - 30, 150, 640, 230);
    g.globalAlpha = 1 - out2;
    frameBox(g, LEFT - 30, 150, 640, 230, seg(b, a.lines[0].at - 0.8, a.lines[0].at + 0.2));
    typed(g, a.lines[0], s, LEFT, 220, font(40), MIST);
    typed(g, a.lines[1], s, LEFT, 280, font(40), MIST);
    typed(g, a.lines[2], s, LEFT, 340, font(40), MIST);
    typed(g, a.tail, s, 1500, 800, font(42), MIST, 'right');
    if (b >= 1) source(g, a.source);
    g.globalAlpha = 1;
  },

  notice(g, s) {
    const b = s.b, a = SCRIPT.notice;
    // 电路板画在离屏画布上；最后两拍以下沿为轴向后倒下，变成下一页的夜色地面
    const bg = ctxOf(P.board);
    bg.globalAlpha = 0.9; bg.drawImage(CIRCUIT, 0, 0); bg.globalAlpha = 1;
    const cx = 1440, cy = 560, half = 170;
    const bend = ease(seg(b, 0, 3.5));
    bg.save();
    bg.strokeStyle = MIST; bg.lineWidth = 2.5; bg.shadowColor = 'rgba(250,246,242,0.6)'; bg.shadowBlur = 8;
    for (let i = 0; i < 14; i++) {
      const y = 230 + i * 50;
      const pin = cy - half + 30 + (i % 7) * ((2 * half - 60) / 6);
      const leftSide = i < 7;
      const xs = leftSide ? [900, 1060, 1180, cx - half] : [SAFE_R - 40, 1770, 1700, cx + half];
      const yy = lerp(y, pin, bend);
      bg.globalAlpha = 0.4 + 0.6 * clamp(b / 3);
      const pts = [[xs[0], y], [lerp(xs[3], xs[1], bend), y], [lerp(xs[3], xs[2], bend), yy], [xs[3], yy]];
      bg.beginPath();
      pts.forEach(([px, py], j) => (j ? bg.lineTo(px, py) : bg.moveTo(px, py)));
      bg.stroke();
      bg.fillStyle = MIST; bg.beginPath(); bg.arc(xs[0], y, 5, 0, Math.PI * 2); bg.fill();
      // 走线弯好后，电流脉冲沿走线流进“芯”，每条错开相位
      const live = seg(b, 3, 4);
      if (live > 0) {
        const lens = pts.slice(1).map(([px, py], j) => Math.hypot(px - pts[j][0], py - pts[j][1]));
        const total = lens.reduce((x, v) => x + v, 0);
        let d = (((s.local - 45) * 0.045 + i * 0.37) % 1) * total;
        let j = 0;
        while (j < lens.length - 1 && d > lens[j]) d -= lens[j++];
        const u = lens[j] ? d / lens[j] : 0;
        bg.globalAlpha = live;
        bg.fillStyle = LIGHT; bg.shadowBlur = 18;
        bg.beginPath(); bg.arc(lerp(pts[j][0], pts[j + 1][0], u), lerp(pts[j][1], pts[j + 1][1], u), 5.5, 0, Math.PI * 2); bg.fill();
        bg.shadowBlur = 8;
      }
    }
    bg.restore();
    bg.fillStyle = SHADE; bg.fillRect(cx - half, cy - half, 2 * half, 2 * half);
    bg.save(); bg.shadowColor = ACCENT; bg.shadowBlur = 24;
    bg.strokeStyle = ACCENT; bg.lineWidth = 5; bg.strokeRect(cx - half, cy - half, 2 * half, 2 * half);
    bg.restore();
    bg.font = font(70, 900); bg.fillStyle = LIGHT; bg.textAlign = 'center'; bg.textBaseline = 'alphabetic';
    bg.fillText(MOTTO.lines[0], cx, cy - 12); bg.fillText(MOTTO.lines[1], cx, cy + 82);
    const tilt = seg(b, 10, 12);
    if (tilt <= 0) g.drawImage(P.board, 0, 0);
    else {
      const phi = 1.4 * inQ(tilt);
      plane(g, FLAT, P.board, [-960, -540 + H * Math.cos(phi), H * Math.sin(phi)], 1, [0, -Math.cos(phi), -Math.sin(phi)], {fade: z => clamp(1.6 - z / 3000)});
    }
    flash(g, 0.2 * (1 - seg(b, 0, 0.5)), true, cx, cy);
    g.fillStyle = 'rgba(14,13,11,0.8)'; g.fillRect(LEFT - 30, 330, 700, 280);
    frameBox(g, LEFT - 30, 330, 700, 280, seg(b, 0.2, 1.2) * (1 - seg(b, 10.2, 10.8)));
    narration(g, a.lines[0], s, LEFT, 410, 10.2, 11);
    narration(g, a.lines[1], s, LEFT, 480, 10.4, 12);
    narration(g, a.lines[2], s, LEFT, 550, 10.6, 13);
    const keep = 1 - seg(b, 10, 10.6);
    g.globalAlpha = keep;
    demo(g, a.demo, cx + half, cy + half + 56);
    corner(g, a.corner, keep);
    g.globalAlpha = keep;
    if (b >= 1) source(g, a.source);
    g.globalAlpha = 1;
  },

  drones(g, s) {
    const b = s.b, a = SCRIPT.drones;
    // 镜头慢慢上仰：电路纹理的地面、地平线雾带和前景的人群一起下沉；无人机从地面的过孔升起
    const c = droneCam(b);
    const pitch = lerp(0.06, -0.06, ease(seg(b, 0, 8)));
    const hy = 540 - c.f * Math.tan(pitch);
    plane(g, c, CIRCUIT, [-2400, 0, 9000], 2.5, [0, 0, -2.5], {wrap: true, alpha: 0.85, fade: z => clamp(1.3 - z / 7000)});
    const band = g.createLinearGradient(0, hy - 30, 0, hy + 200);
    band.addColorStop(0, 'rgba(60,56,52,0)');
    band.addColorStop(0.35, 'rgba(60,56,52,0.5)');
    band.addColorStop(1, 'rgba(24,22,20,0)');
    g.fillStyle = band; g.fillRect(0, hy - 30, W, 230);
    g.globalAlpha = 0.45; g.drawImage(FOG_A, -((s.local * 0.4) % 2400), hy - 260); g.drawImage(FOG_A, 2400 - ((s.local * 0.4) % 2400), hy - 260); g.globalAlpha = 1;
    flash(g, 0.18 * (1 - seg(b, 0, 0.5)), false, 960, hy);
    const bright = seg(b, 10, 12);
    for (let i = 0; i < P.drones.length; i++) {
      const p = P.drones[i], f = P.dronesFrom[i];
      const d = f.d * 3;
      const t = clamp((b - d) / (8 - d));
      const up = out(t), side = ease(t);
      const q = proj(c, lerp(f.x, p.w[0], side), lerp(0, p.w[1], up), lerp(f.z, p.w[2], side));
      if (q.z < NEAR) continue;
      const tw = 0.85 + 0.15 * Math.sin(i * 1.7 + s.local * 0.21);
      g.globalAlpha = Math.min(1, (t >= 1 ? tw : 0.35 + 0.4 * t) + 0.2 * bright);
      g.fillStyle = p.accent ? ACCENT : LIGHT;
      const r = (3.6 + 2.6 * bright) * clamp(q.s * DRONE_ZT / c.f, 0.6, 2.2);
      g.fillRect(q.x - r / 2, q.y - r / 2, r, r);
    }
    g.globalAlpha = 1;
    crowd(g, 900 + 132 * ease(seg(b, 0, 8)));
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
    if (b >= 1) { g.globalAlpha = fade; demo(g, a.demo, SAFE_R, 1030); source(g, a.source); g.globalAlpha = 1; }
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
  ctx.imageSmoothingQuality = 'high';
  const paper = PAPER_PAGES.has(s.page.id);
  ctx.drawImage(paper ? PAPER_GROUND : GROUND, 0, 0);
  DRAW[s.page.id](ctx, s);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
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
