import {BEAT_FRAMES, FRAME_COUNT, KEYS, SCENES, frameState} from './timeline.js';
import {TEXT} from './script.js';
import {CAUCHY, FERMAT, LAGRANGE, ROLLE_SHAPES, extrema} from './math.js';

const W = 1920, H = 1080;
const PAPER = '#F2EDE4', INK = '#161412', ORANGE = '#FF5B14';
const TITLE = s => `900 ${s}px "Songti SC"`;
const MONO = s => `400 ${s}px Menlo`;
const SAFE = {x0: 60, y0: 40, x1: W - 60, y1: H - 40};
const PAD = 24;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (b, b0, b1) => clamp((b - b0) / (b1 - b0));
const inOut = x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const outCubic = x => 1 - (1 - x) ** 3;
const outQuart = x => 1 - (1 - x) ** 4;
const outExpo = x => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));
const inExpo = x => (x <= 0 ? 0 : 2 ** (10 * x - 10));
const outBack = x => 1 + 2.70158 * (x - 1) ** 3 + 1.70158 * (x - 1) ** 2;

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function perm(seed, n) {
  const r = rng(seed), a = Array.from({length: n}, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const stage = document.getElementById('stage');
const ctx = stage.getContext('2d');
const canvas = (w = W, h = H) => Object.assign(document.createElement('canvas'), {width: w, height: h});
let FRAME = 0;

function report(message) {
  if (!window.renderErrors.includes(message)) window.renderErrors.push(message);
}

// 处于阅读位置的文字：墨迹边界经当前变换落到画面上，超出安全区即记为渲染错误。
function checkInk(g, r, label) {
  const m = g.getTransform();
  const pts = [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]].map(([x, y]) => m.transformPoint(new DOMPoint(x, y)));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  if (box[0] < SAFE.x0 - 0.5 || box[1] < SAFE.y0 - 0.5 || box[2] > SAFE.x1 + 0.5 || box[3] > SAFE.y1 + 0.5) {
    report(`第 ${FRAME} 帧文字出画：${label} [${box.map(v => v.toFixed(0)).join(',')}]`);
  }
}

// ---------- 排版：文字、下标、分式拼成一张贴图 ----------
const meas = canvas(8, 8).getContext('2d');
const union = (a, b) => (!a ? {...b} : !b ? {...a} : {x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1)});

function place(nd, x, y, sz, col, font, out, ids) {
  if (typeof nd === 'string') nd = {t: nd};
  const c = nd.c || col;
  let r;
  if (nd.t !== undefined) {
    const s = nd.sub || nd.sup ? sz * 0.6 : sz, yy = y + (nd.sub ? sz * 0.2 : nd.sup ? -sz * 0.42 : 0);
    const f = font(s);
    meas.font = f;
    const m = meas.measureText(nd.t);
    // 宋体里的 ′ 和 ξ 是全角字宽，tight 按墨迹宽度重新排字距
    const L = m.actualBoundingBoxLeft, R = m.actualBoundingBoxRight;
    const drawX = nd.tight ? x + s * 0.05 + L : x;
    out.push({k: 't', t: nd.t, x: drawX, y: yy, f, c});
    r = {adv: nd.tight ? L + R + s * 0.1 : m.width, ink: {x0: drawX - L, x1: drawX + R, y0: yy - m.actualBoundingBoxAscent, y1: yy + m.actualBoundingBoxDescent}};
  } else if (nd.g) {
    let adv = 0, ink = null;
    for (const ch of nd.g) { const q = place(ch, x + adv, y, sz, c, font, out, ids); adv += q.adv; ink = union(ink, q.ink); }
    r = {adv, ink};
  } else if (nd.frac) {
    const s2 = sz * 0.82;
    const nOut = [], dOut = [];
    const n = place({g: nd.frac[0]}, 0, 0, s2, c, font, nOut, ids), d = place({g: nd.frac[1]}, 0, 0, s2, c, font, dOut, ids);
    const width = Math.max(n.adv, d.adv) + sz * 0.36, axis = y - sz * 0.3, gap = sz * 0.13, th = sz * 0.065;
    const nb = axis - gap - n.ink.y1, db = axis + gap - d.ink.y0;
    const nx = x + (width - n.adv) / 2, dx = x + (width - d.adv) / 2;
    for (const it of nOut) out.push({...it, x: it.x + nx, y: it.y + nb});
    for (const it of dOut) out.push({...it, x: it.x + dx, y: it.y + db});
    out.push({k: 'bar', x: x + sz * 0.04, y: axis - th / 2, w: width - sz * 0.08, h: th, c});
    const numInk = {x0: n.ink.x0 + nx, x1: n.ink.x1 + nx, y0: n.ink.y0 + nb, y1: n.ink.y1 + nb};
    const denInk = {x0: d.ink.x0 + dx, x1: d.ink.x1 + dx, y0: d.ink.y0 + db, y1: d.ink.y1 + db};
    const barInk = {x0: x + sz * 0.04, x1: x + width - sz * 0.04, y0: axis - th / 2, y1: axis + th / 2};
    if (nd.ids) { ids[nd.ids[0]] = numInk; ids[nd.ids[1]] = barInk; ids[nd.ids[2]] = denInk; }
    r = {adv: width + sz * 0.06, ink: union(union(numInk, denInk), barInk)};
  }
  if (nd.id) ids[nd.id] = r.ink;
  return r;
}

function drawItems(g, items) {
  for (const it of items) {
    g.fillStyle = it.c;
    if (it.k === 't') { g.font = it.f; g.fillText(it.t, it.x, it.y); }
    else g.fillRect(it.x, it.y, it.w, it.h);
  }
}

const sprites = new Map();
function sprite(key, nodes, size, {font = TITLE, color = INK} = {}) {
  if (sprites.has(key)) return sprites.get(key);
  const items = [], ids = {};
  const {ink} = place({g: Array.isArray(nodes) ? nodes : [nodes]}, 0, 0, size, color, font, items, ids);
  const ox = PAD - ink.x0, oy = PAD - ink.y0;
  const c = canvas(Math.ceil(ink.x1 - ink.x0 + 2 * PAD), Math.ceil(ink.y1 - ink.y0 + 2 * PAD));
  const g = c.getContext('2d', {willReadFrequently: true});
  const vector = items.map(it => ({...it, x: it.x + ox, y: it.y + oy}));
  drawItems(g, vector);
  const shift = r => ({x0: r.x0 + ox, x1: r.x1 + ox, y0: r.y0 + oy, y1: r.y1 + oy});
  const sp = {key, c, vector, w: c.width, h: c.height, ids: Object.fromEntries(Object.entries(ids).map(([k, r]) => [k, shift(r)])), ink: shift(ink)};
  sprites.set(key, sp);
  return sp;
}

// 贴图中心放在 (cx, cy)；left 为真时 cx 是墨迹左缘。
function drawSprite(g, sp, cx, cy, {check = true, left = false, scale = 1} = {}) {
  const x = left ? cx + sp.w / 2 - PAD : cx;
  g.save();
  g.translate(x, cy);
  if (scale !== 1) {
    if (left) { g.translate(-sp.w / 2 + PAD, 0); g.scale(scale, scale); g.translate(sp.w / 2 - PAD, 0); }
    else g.scale(scale, scale);
  }
  g.drawImage(sp.c, -sp.w / 2, -sp.h / 2);
  if (check) checkInk(g, {x0: sp.ink.x0 - sp.w / 2, x1: sp.ink.x1 - sp.w / 2, y0: sp.ink.y0 - sp.h / 2, y1: sp.ink.y1 - sp.h / 2}, sp.key);
  g.restore();
}

// 贴图中某个节点在画面上的矩形
function spriteRect(sp, id, cx, cy) {
  const r = sp.ids[id];
  return {x0: cx - sp.w / 2 + r.x0, x1: cx - sp.w / 2 + r.x1, y0: cy - sp.h / 2 + r.y0, y1: cy - sp.h / 2 + r.y1};
}

// 砸下：前 4 帧从 1.22 倍缩回原大，之后才算处于阅读位置
const SLAM = 0.27;
function slam(g, sp, cx, cy, b, b0, opts = {}) {
  if (b < b0) return;
  const q = seg(b, b0, b0 + SLAM);
  drawSprite(g, sp, cx, cy, {...opts, scale: 1 + 0.22 * (1 - outCubic(q)), check: (opts.check ?? true) && q >= 1});
}

// 切条：贴图横切成 n 条，单双条从相反方向飞入，在 b1 拼合；mode 为 out 时从 b0 起飞出。
function slit(g, src, cx, cy, b, b0, b1, mode, seed, {n = 14, dist = 1500, check = true, left = false} = {}) {
  const isSprite = !!src.c;
  const img = isSprite ? src.c : src;
  const x = isSprite ? (left ? cx - PAD : cx - src.w / 2) : 0, y = isSprite ? cy - src.h / 2 : 0;
  if ((mode === 'in' && b >= b1) || (mode === 'out' && b <= b0)) {
    if (isSprite) drawSprite(g, src, cx, cy, {check, left});
    else g.drawImage(img, 0, 0);
    return;
  }
  if (mode === 'in' && b < b0) return;
  if (mode === 'out' && b >= b1) return;
  const h = img.height / n, order = perm(seed, n), span = b1 - b0, each = span * 0.6, stagger = span - each;
  for (let i = 0; i < n; i++) {
    const d = (order[i] / (n - 1)) * stagger;
    const q = clamp((b - b0 - d) / each);
    const dir = ((i + seed) % 2 ? 1 : -1);
    const far = dist * (0.75 + 0.25 * ((i * 7) % 3) / 2);
    const off = mode === 'in' ? dir * (1 - outExpo(q)) * far : dir * inExpo(q) * far;
    g.drawImage(img, 0, i * h, img.width, h, x + off, y + i * h, img.width, h);
  }
}

// 不进缓存的单行文字（逐字打出、计数这类每帧都变的内容）
function textLine(g, str, x, y, font, color, {align = 'left', check = true, label = str} = {}) {
  g.font = font;
  g.fillStyle = color;
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  g.fillText(str, x, y);
  if (check && str.length) {
    const m = g.measureText(str);
    checkInk(g, {x0: x - m.actualBoundingBoxLeft, x1: x + m.actualBoundingBoxRight, y0: y - m.actualBoundingBoxAscent, y1: y + m.actualBoundingBoxDescent}, label);
  }
  g.textAlign = 'left';
  return g.measureText(str).width;
}

function line(g, x0, y0, x1, y1, color, width, cap = 'round') {
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = cap;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
}
function dot(g, x, y, r, color) {
  g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
}
function polyline(g, pts, color, width) {
  g.strokeStyle = color; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
}
function dashed(g, x0, y0, x1, y1, color, width, offset = 0) {
  g.save(); g.setLineDash([18, 14]); g.lineDashOffset = offset; line(g, x0, y0, x1, y1, color, width, 'butt'); g.restore();
}
// 以 (x, y) 为中点、屏幕斜率 m、总长 len 的线段
function slopeSeg(g, x, y, m, len, color, width) {
  const k = len / 2 / Math.hypot(1, m);
  line(g, x - k, y - k * m, x + k, y + k * m, color, width);
}
const fmt = v => (Math.abs(v) < 0.005 ? '0.00' : v.toFixed(2));

// ---------- 纸面与场景编号 ----------
let grain;
function paper(g) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.fillStyle = PAPER;
  g.fillRect(0, 0, W, H);
  g.drawImage(grain, 0, 0);
}

function hud(g, scene) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  textLine(g, `${String(scene + 1).padStart(2, '0')} / 05`, W - 60, 72, MONO(28), INK, {align: 'right', label: 'HUD scene'});
}

const PR = {t: '′', tight: true};
const XI = c => ({t: 'ξ', tight: true, ...(c ? {c} : {})});

// ---------- 场景一 费马：大字切条拆开重组 ----------
const FX = x => 960 + x * 360, FY = y => 650 - y * 250;
const FM = x => -(250 / 360) * FERMAT.df(x);
let fermatLayer;
const fermatFormula = () => sprite('fermat-formula', ['f', PR, '(x', {t: '0', sub: true}, ') = ', {t: '0', c: ORANGE, id: 'zero'}], 250);
const FERMAT_EQ = () => sprite('fermat-eq', ['y = x', {t: '3', sup: true}, ' / 3 − x'], 84);
const FERMAT_POS = [960, 470];

function fermatDotX(b) {
  const K = KEYS.fermat;
  if (b < K.peak) return lerp(FERMAT.x0, FERMAT.peak, inOut(seg(b, K.curveDone, K.peak)));
  if (b < 26) return FERMAT.peak;
  return lerp(FERMAT.peak, FERMAT.valley, inOut(seg(b, 26, K.valley)));
}

function drawFermatGraph(g, b) {
  const K = KEYS.fermat;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  line(g, 120, 650, 1800, 650, INK, 3, 'butt');
  line(g, 960, 300, 960, 990, INK, 3, 'butt');
  g.fillStyle = INK;
  g.beginPath(); g.moveTo(1800, 650); g.lineTo(1776, 640); g.lineTo(1776, 660); g.fill();
  g.beginPath(); g.moveTo(960, 300); g.lineTo(950, 324); g.lineTo(970, 324); g.fill();
  const p = inOut(seg(b, K.formOut + 1, K.curveDone));
  if (p > 0) {
    const pts = [];
    const xEnd = lerp(FERMAT.x0, FERMAT.x1, p);
    for (let x = FERMAT.x0; x <= xEnd; x += 0.01) pts.push([FX(x), FY(FERMAT.f(x))]);
    pts.push([FX(xEnd), FY(FERMAT.f(xEnd))]);
    polyline(g, pts, INK, 7);
    // 笔头：正在画的那一点，十字线加坐标
    if (p < 1) {
      const X = FX(xEnd), Y = FY(FERMAT.f(xEnd));
      line(g, X - 28, Y, X + 28, Y, ORANGE, 3, 'butt');
      line(g, X, Y - 28, X, Y + 28, ORANGE, 3, 'butt');
      const right = xEnd > 0.9;
      textLine(g, `(${xEnd.toFixed(2)}, ${FERMAT.f(xEnd).toFixed(2)})`, X + (right ? -40 : 26), Y + (xEnd < 0 ? 52 : right ? 10 : -24), MONO(32), INK, {label: 'pen', align: right ? 'right' : 'left'});
    }
  }
  if (b >= K.curveDone) {
    const x = fermatDotX(b), X = FX(x), Y = FY(FERMAT.f(x));
    const since = Math.min(9, ...[b - K.peak, b - K.valley].filter(v => v >= 0));
    const len = 620 + 520 * Math.max(0, 1 - since / 0.6) ** 2;
    slopeSeg(g, X, Y, FM(x), len, ORANGE, 8);
    dot(g, X, Y, 15, ORANGE);
    dot(g, X, Y, 6, PAPER);
    // 斜率读数固定在右上角
    g.font = MONO(60);
    const val = fmt(FERMAT.df(x)), wv = g.measureText(val).width;
    textLine(g, val, 1800, 205, MONO(60), ORANGE, {align: 'right', label: 'slope'});
    textLine(g, '斜率 ', 1800 - wv, 205, TITLE(56), INK, {align: 'right', label: 'slope'});
  }
  // 函数式跟着笔头从左往右露出
  if (b >= K.formOut + 1 && b < K.peak - 0.6) {
    const sp = FERMAT_EQ(), q = seg(b, K.formOut + 1, 11);
    g.save();
    g.beginPath(); g.rect(0, 0, 140 - PAD + sp.w * q, H); g.clip();
    drawSprite(g, sp, 140, 180, {left: true});
    g.restore();
  }
}

function fermat(g, b) {
  const K = KEYS.fermat;
  const form = fermatFormula();
  const title = sprite('fermat-title', TEXT.fermat.title, 120);
  const law = sprite('fermat-law', TEXT.fermat.law, 96);
  const peak = sprite('fermat-peak', TEXT.fermat.peak, 100);
  const valley = sprite('fermat-valley', TEXT.fermat.valley, 100);
  const [fx, fy] = FERMAT_POS;
  // 第 0 帧：一道橙色横线从左扫过画面
  if (b < 2) {
    const a = outExpo(seg(b, -0.12, 0.8)), z = inOut(seg(b, 0.9, 2));
    g.fillStyle = ORANGE;
    g.fillRect(W * z, fy - 9, W * (a - z), 18);
  }
  if (b < K.formOut + 1.5) {
    if (b < K.formOut) slit(g, form, fx, fy, b, 0, K.formIn, 'in', 3, {dist: 1100});
    else slit(g, form, fx, fy, b, K.formOut, K.formOut + 1, 'out', 4, {dist: 2200});
    if (b < K.formOut) slam(g, title, 960, 760, b, K.title);
    else slit(g, title, 960, 760, b, K.formOut, K.formOut + 0.8, 'out', 5, {n: 6, dist: 2200});
  }
  if (b >= K.formOut && b < K.formBack) {
    drawFermatGraph(fermatLayer.getContext('2d'), b);
    if (b < 35) slit(g, fermatLayer, 0, 0, b, K.formOut, K.formOut + 1, 'in', 7, {n: 18, dist: 1600});
    else slit(g, fermatLayer, 0, 0, b, 35, K.formBack, 'out', 8, {n: 18, dist: 2400});
    // 最高点：函数式切走、句子切入；26 拍点开始移动时句子切走
    if (b < 26.6) {
      if (b < 26) slit(g, peak, 960, 190, b, K.peak - 0.6, K.peak, 'in', 9, {n: 8});
      else slit(g, peak, 960, 190, b, 26, 26.6, 'out', 10, {n: 8, dist: 2200});
    }
    if (b >= K.valley - 0.6 && b < 36) {
      if (b < 35) slit(g, valley, 960, 190, b, K.valley - 0.6, K.valley, 'in', 11, {n: 8});
      else slit(g, valley, 960, 190, b, 35, 36, 'out', 12, {n: 8, dist: 2400});
    }
  }
  if (b >= 34) {
    slit(g, form, fx, fy, b, 35, K.formBack, 'in', 13, {dist: 1300});
    slam(g, law, 960, 760, b, K.formTitle);
  }
}

// ---------- 场景二 罗尔：图形变形 ----------
const RA = 360, RB = 1560, RY = 680, RAMP = 290;
const RX = u => lerp(RA, RB, u), RYf = v => RY - v * RAMP;

function rolleShape(b) {
  const m = KEYS.rolle.morphs, S = ROLLE_SHAPES;
  for (let k = 0; k < m.length; k++) {
    if (b < m[k] - 1) return {fn: S[k], land: k ? m[k - 1] : -9};
    if (b < m[k]) {
      const e = outBack(seg(b, m[k] - 1, m[k]));
      return {fn: u => lerp(S[k](u), S[k + 1](u), e), land: k ? m[k - 1] : -9, moving: true};
    }
  }
  return {fn: S[m.length], land: m[m.length - 1]};
}


function rolle(g, b) {
  const K = KEYS.rolle;
  // 切点那一帧：上一场景的橙色“0”放大成画面中央的大圆环；0—3 拍压扁成两端等高的直线
  const e = inOut(seg(b, 0, K.ring));
  const {fn, land} = rolleShape(b);
  const M = 240, pts = [];
  const cx = 960, cy = 520, rx = 250, ry = 300;
  if (e < 1) {
    for (let j = 0; j <= M; j++) {
      const th = Math.PI - 2 * Math.PI * j / M;
      const u = j <= M / 2 ? 2 * j / M : 2 - 2 * j / M;
      pts.push([lerp(cx + rx * Math.cos(th), RX(u), e), lerp(cy - ry * Math.sin(th), RYf(0), e)]);
    }
    polyline(g, pts, ORANGE, lerp(40, 7, e));
  } else {
    for (let j = 0; j <= M; j++) pts.push([RX(j / M), RYf(fn(j / M))]);
  }
  // 两端的钉子和等高虚线
  if (b >= K.ring - 0.6) {
    const q = seg(b, K.ring - 0.6, K.ring);
    const y = lerp(-60, RY, q * q);
    if (b >= K.ring) dashed(g, RA, RY, RB, RY, INK, 3, -b * 12);
    // 变形留下的前两个形状：细线，说明“怎么弯都行”
    if (b < K.why) {
      const landed = K.morphs.filter(m => b >= m).length;
      g.globalAlpha = 0.2;
      for (let s = Math.max(1, landed - 2); s < landed; s++) {
        const ghost = [];
        for (let j = 0; j <= 120; j++) ghost.push([RX(j / 120), RYf(ROLLE_SHAPES[s](j / 120))]);
        polyline(g, ghost, INK, 3);
      }
      g.globalAlpha = 1;
    }
    if (e >= 1) polyline(g, pts, INK, 7);
    for (const x of [RA, RB]) { dot(g, x, y, 17, ORANGE); dot(g, x, y, 7, PAPER); }
    if (b >= K.ring) {
      textLine(g, 'f(a)', RA - 36, RY + 14, MONO(40), INK, {align: 'right'});
      textLine(g, 'f(b)', RB + 36, RY + 14, MONO(40), INK);
    }
  }
  // 平切线：对当前（包括正在变形的）曲线实时求极值
  if (b >= K.morphs[0] - 1) {
    const pop = Math.max(0, 1 - (b - land) / 0.35);
    for (const u of extrema(fn, 301)) {
      const X = RX(u), Y = RYf(fn(u));
      line(g, X - 110 * (1 + 0.5 * pop), Y, X + 110 * (1 + 0.5 * pop), Y, ORANGE, 8);
      dot(g, X, Y, 9, INK);
    }
  }
  if (b >= K.why) {
    const u = 0.5, X = RX(u), Y = RYf(fn(u));
    dashed(g, X, Y + 20, X, RY - 6, INK, 3);
    dot(g, X, Y, 20, ORANGE);
    dot(g, X, Y, 8, PAPER);
    slam(g, sprite('rolle-xi', {t: 'ξ', c: ORANGE}, 72), X, RY + 64, b, K.why + 0.5);
  }
  slam(g, sprite('rolle-title', TEXT.rolle.title, 120), 140, 170, b, K.title, {left: true});
  const subs = [[K.sub[0], TEXT.rolle.sub[0]], [K.sub[1], TEXT.rolle.sub[1]], [K.sub[2], TEXT.rolle.sub[2]], [K.why, TEXT.rolle.why], [K.fermat, TEXT.rolle.fermat]];
  const cur = subs.findLast(([s]) => b >= s);
  if (cur) slam(g, sprite(`rolle-sub-${cur[1]}`, cur[1], 76), 140, 300, b, cur[0], {left: true});
  if (b >= K.formula[0]) {
    const parts = [sprite('rolle-f1', 'f(a) = f(b)', 96), sprite('rolle-f2', '⇒', 96), sprite('rolle-f3', ['f', PR, '(', XI(ORANGE), ') = 0'], 96)];
    const widths = parts.map(p => p.ink.x1 - p.ink.x0), gap = 60;
    let x = 960 - (widths.reduce((a, c) => a + c, 0) + gap * 2) / 2;
    parts.forEach((p, i) => { slam(g, p, x, 935, b, K.formula[i], {left: true}); x += widths[i] + gap; });
  }
}

// ---------- 场景三 拉格朗日：镜头穿越 ----------
const F = 1000, NEAR = 20;
const CSTAR = {x: 1800, y: 0, z: 4300};
const GRAPH_Z = 5200;
const LAG_PIECES = [['lhs', 600], ['eq', 1500], ['num', 900], ['bar', 2000], ['den', 1250]];
const lagFormula = () => sprite('lag-formula', [{g: ['f', PR, '(', {...XI(ORANGE), id: 'xi'}, ')'], id: 'lhs'}, {t: ' = ', id: 'eq'}, {frac: [['f(b) − f(a)'], ['b − a']], ids: ['num', 'bar', 'den']}], 150);
const LAG_POS = [960, 470];

function lagShear(b) {
  const K = KEYS.lagrange;
  const steps = [[K.tilt - 2, K.tilt, 0, 0.55], [K.swings[0] - 2, K.swings[0], 0.55, -0.35], [K.swings[1] - 2, K.swings[1], -0.35, 0.8], [K.swings[2] - 2, K.swings[2], 0.8, 0.42]];
  let k = 0;
  for (const [b0, b1, from, to] of steps) if (b >= b0) k = lerp(from, to, outBack(seg(b, b0, b1)));
  return k;
}

function worldOf(sx, sy, d) {
  return {x: CSTAR.x + (sx - 960) * d / F, y: CSTAR.y - (sy - 540) * d / F, z: CSTAR.z + d};
}

function lagCamera(b) {
  const K = KEYS.lagrange;
  if (b < 6) return {x: 0, y: 0, z: 600 * b, roll: 0.05 * Math.sin(Math.PI * b / 3)};
  if (b < K.arrive) { const d = b - 6; return {x: 0, y: 0, z: 3600 + 600 * d - 150 * d * d, roll: 0}; }
  if (b < 28) return {x: 0, y: 0, z: 4200 + 100 * inOut(seg(b, K.arrive, 28)), roll: 0};
  if (b < K.align) { const q = seg(b, 28, K.align); return {x: CSTAR.x * inOut(q), y: 0, z: CSTAR.z - 400 * Math.sin(Math.PI * q), roll: q >= 1 ? 0 : -0.1 * Math.sin(Math.PI * q)}; }
  if (b < 48) return {...CSTAR, roll: 0};
  const sp = lagFormula(), r = spriteRect(sp, 'xi', ...LAG_POS);
  const w = worldOf((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, LAG_PIECES[0][1]);
  const q = seg(b, 48, K.dive);
  return {x: lerp(CSTAR.x, w.x, outCubic(q)), y: lerp(CSTAR.y, w.y, outCubic(q)), z: lerp(CSTAR.z, w.z - 34, inOut(q)), roll: 0};
}

// 把画布变换设成：世界点 (X, Y, Z) 处、正对镜头的平面，每个世界单位 scale 像素（在距离 F 处）
function planeAt(g, cam, X, Y, Z, scale = 1) {
  const d = Z - cam.z;
  if (d < NEAR) return null;
  const s = F / d * scale;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.translate(960, 540);
  g.rotate(cam.roll);
  g.translate(F * (X - cam.x) / d, -F * (Y - cam.y) / d);
  g.scale(s, s);
  return s;
}

function drawLagGraph(g, b, settled) {
  const K = KEYS.lagrange;
  const k = lagShear(b);
  const X = u => -600 + 1200 * u, Y = v => 200 - 300 * v;
  const y = u => LAGRANGE.phi(u) + k * u;
  const pts = [];
  for (let j = 0; j <= 200; j++) pts.push([X(j / 200), Y(y(j / 200))]);
  const xi = LAGRANGE.xi;
  if (b < K.tilt - 2) dashed(g, X(0), Y(y(0)), X(1), Y(y(1)), INK, 3);
  else line(g, X(0), Y(y(0)), X(1), Y(y(1)), ORANGE, 6);
  polyline(g, pts, INK, 7);
  const m = -k;
  slopeSeg(g, X(xi), Y(y(xi)), m, 540, ORANGE, 7);
  for (const u of [0, 1]) { dot(g, X(u), Y(y(u)), 16, ORANGE); dot(g, X(u), Y(y(u)), 6, PAPER); }
  dot(g, X(xi), Y(y(xi)), 14, INK);
  textLine(g, 'A', X(0) - 40, Y(y(0)) + 14, MONO(44), INK, {align: 'right', check: settled});
  textLine(g, 'B', X(1) + 40, Y(y(1)) + 14, MONO(44), INK, {check: settled});
  // 弦与切线的斜率读数固定在左下角，两个数始终相同
  if (b >= K.tilt) {
    const rows = [['弦斜率', fmt(k)], ['切线斜率', fmt((y(xi + 1e-6) - y(xi - 1e-6)) / 2e-6)]];
    rows.forEach(([name, v], i) => {
      const w = textLine(g, name + ' ', -600, 300 + i * 58, TITLE(40), INK, {check: settled});
      textLine(g, v, -600 + w, 300 + i * 58, MONO(44), ORANGE, {check: settled});
    });
  }
  if (b >= K.tilt && b < K.shear) slam(g, sprite('lag-parallel', TEXT.lagrange.parallel, 100), 0, -370, b, K.tilt, {check: settled});
  if (b >= K.shear) {
    slam(g, sprite('lag-shear', TEXT.lagrange.shear, 100), 0, -370, b, K.shear, {check: settled});
    slam(g, sprite('lag-eq', ['y = f(x) + ', {t: 'k', c: ORANGE}, 'x'], 80), 200, 330, b, K.shear + 0.5, {check: settled});
  }
}

function lagrange(g, b) {
  const K = KEYS.lagrange;
  const cam = lagCamera(b);
  const items = [];
  // 走廊：一串方框和三块文字平面，镜头在 2、4、6 拍各穿过一块
  for (let z = 600; z <= 3900; z += 300) items.push({z, draw: () => { if (planeAt(g, cam, 0, 0, z)) { g.globalAlpha = 0.28; g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(-1200, -675, 2400, 1350); g.globalAlpha = 1; } }});
  const offsets = [[-440, 170], [400, -170], [0, 40]];
  TEXT.lagrange.planes.forEach((t, i) => {
    const z = 1200 * (i + 1);
    // 只画离镜头 2500 以内的平面，远处的字不叠在近处的字后面
    items.push({z, draw: () => { if (z - cam.z <= 2500 && planeAt(g, cam, offsets[i][0], offsets[i][1], z)) drawSprite(g, sprite(`lag-plane-${i}`, t, 260), 0, 0, {check: false}); }});
  });
  const settledGraph = b >= K.arrive && b < 28;
  items.push({z: GRAPH_Z, draw: () => { if (planeAt(g, cam, 0, 0, GRAPH_Z)) drawLagGraph(g, b, settledGraph); }});
  // 公式拆成五块放在不同深度，只有在 CSTAR 机位看过去才拼成一行
  const sp = lagFormula();
  const aligned = b >= K.align && b < 48;
  for (const [id, d] of LAG_PIECES) {
    const r = spriteRect(sp, id, ...LAG_POS);
    const w = worldOf((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, d);
    const src = sp.ids[id];
    items.push({z: w.z, draw: () => {
      // 第 28 拍镜头开始横移时，五块都还在画外
      if (b < 28 || !planeAt(g, cam, w.x, w.y, w.z, d / F)) return;
      // 按矢量重画这一块：镜头冲到 ξ 跟前放大十几倍时字形仍然清楚
      const rw = src.x1 - src.x0 + 8, rh = src.y1 - src.y0 + 8;
      g.save();
      g.beginPath(); g.rect(-rw / 2, -rh / 2, rw, rh); g.clip();
      g.translate(-(src.x0 + src.x1) / 2, -(src.y0 + src.y1) / 2);
      drawItems(g, sp.vector);
      g.restore();
      if (aligned && id !== 'bar') checkInk(g, {x0: -rw / 2 + 4, x1: rw / 2 - 4, y0: -rh / 2 + 4, y1: rh / 2 - 4}, `lag-${id}`);
    }});
  }
  const flat = (key, txt, size, sy, b0) => {
    const w = worldOf(960, sy, F);
    items.push({z: w.z, draw: () => { if (b >= b0 && planeAt(g, cam, w.x, w.y, w.z)) slam(g, sprite(key, txt, size), 0, 0, b, b0, {check: aligned}); }});
  };
  flat('lag-title', TEXT.lagrange.title, 104, 790, K.title);
  flat('lag-meaning', TEXT.lagrange.meaning, 72, 915, K.meaning);
  items.sort((a, c) => c.z - a.z).forEach(it => it.draw());
  g.setTransform(1, 0, 0, 1, 0, 0);
}

// ---------- 场景四 柯西：粒子 ----------
const NP = 3200;
const CX = t => 380 + 1160 * CAUCHY.g(t), CY = t => 820 - 650 * CAUCHY.f(t);
const P = {};

function samplePoints(sp, cx, cy, seed) {
  const data = sp.c.getContext('2d', {willReadFrequently: true}).getImageData(0, 0, sp.w, sp.h).data;
  const pts = [];
  for (let y = 0; y < sp.h; y += 3) for (let x = 0; x < sp.w; x += 3) {
    const i = (y * sp.w + x) * 4;
    if (data[i + 3] > 150) pts.push([cx - sp.w / 2 + x, cy - sp.h / 2 + y, data[i] > 200 && data[i + 1] < 160 ? 1 : 0]);
  }
  const order = perm(seed, pts.length);
  const xy = new Float32Array(NP * 2), col = new Uint8Array(NP);
  for (let i = 0; i < NP; i++) { const p = pts[order[i % pts.length]]; xy[2 * i] = p[0]; xy[2 * i + 1] = p[1]; col[i] = p[2]; }
  return {xy, col};
}

const cauchyForm1 = () => sprite('cau-f1', [{frac: [['f', PR, '(', XI(), ')'], [{g: ['g', PR, '(', XI(), ')'], c: ORANGE}]]}, ' = ', {frac: [['f(b) − f(a)'], [{t: 'g(b) − g(a)', c: ORANGE}]]}], 136);
const cauchyForm2 = () => sprite('cau-f2', ['f', PR, '(', XI(), ') = ', {frac: [['f(b) − f(a)'], [{t: 'b − a', c: ORANGE}]]}], 136);
const cauchyTitle = () => sprite('cau-title', TEXT.cauchy.title, 180);

function initParticles() {
  const r = rng(77);
  P.delay = new Float32Array(NP); P.arc = new Float32Array(NP); P.phase = new Float32Array(NP); P.t = new Float32Array(NP);
  P.burst = {xy: new Float32Array(NP * 2), col: new Uint8Array(NP).fill(1)};
  P.curve = {xy: new Float32Array(NP * 2), col: new Uint8Array(NP)};
  for (let i = 0; i < NP; i++) {
    P.delay[i] = r(); P.arc[i] = (r() * 2 - 1) * 220; P.phase[i] = r() * Math.PI * 2;
    const a = r() * Math.PI * 2, rad = 140 + 820 * r() ** 0.8;
    P.burst.xy[2 * i] = 960 + Math.cos(a) * rad * 1.3; P.burst.xy[2 * i + 1] = 540 + Math.sin(a) * rad * 0.75;
    const t = (i + r()) / NP;
    P.t[i] = t;
    const dx = CAUCHY.dg(t) * 1160, dy = -CAUCHY.df(t) * 650, n = Math.hypot(dx, dy), j = (r() * 2 - 1) * 7;
    P.curve.xy[2 * i] = CX(t) - dy / n * j; P.curve.xy[2 * i + 1] = CY(t) + dx / n * j;
  }
  P.form1 = samplePoints(cauchyForm1(), 960, 480, 91);
  P.form2 = samplePoints(cauchyForm2(), 960, 480, 92);
  P.title = samplePoints(cauchyTitle(), 960, 500, 93);
}

// 从布局 A 飞到布局 B：每个粒子有自己的延迟和弧线，q 为整段进度
function flight(A, B, q, spread, delayOf, out) {
  for (let i = 0; i < NP; i++) {
    const d = delayOf ? delayOf(i) : P.delay[i];
    const qi = clamp((q - d * spread) / (1 - spread));
    const e = inOut(qi);
    const ax = A.xy[2 * i], ay = A.xy[2 * i + 1], bx = B.xy[2 * i], by = B.xy[2 * i + 1];
    const dx = bx - ax, dy = by - ay, n = Math.hypot(dx, dy) || 1, bump = P.arc[i] * Math.sin(Math.PI * e);
    out.xy[2 * i] = lerp(ax, bx, e) - dy / n * bump;
    out.xy[2 * i + 1] = lerp(ay, by, e) + dx / n * bump;
    out.col[i] = e < 0.5 ? A.col[i] : B.col[i];
  }
}

function drawParticles(g, L, size, b) {
  for (const [c, flag] of [[INK, 0], [ORANGE, 1]]) {
    g.fillStyle = c;
    for (let i = 0; i < NP; i++) {
      if (L.col[i] !== flag) continue;
      const x = L.xy[2 * i] + 2.5 * Math.sin(b * 2.1 + P.phase[i]), y = L.xy[2 * i + 1] + 2.5 * Math.cos(b * 1.7 + P.phase[i]);
      g.fillRect(x - size / 2, y - size / 2, size, size);
    }
  }
}

function cauchyCurveTangent(g, t, len) {
  const m = -(CAUCHY.df(t) * 650) / (CAUCHY.dg(t) * 1160);
  slopeSeg(g, CX(t), CY(t), m, len, ORANGE, 7);
}

function cauchy(g, b) {
  const K = KEYS.cauchy;
  const L = {xy: new Float32Array(NP * 2), col: new Uint8Array(NP)};
  const center = {xy: new Float32Array(NP * 2).map((_, i) => (i % 2 ? 540 : 960)), col: P.burst.col};
  let solid = null, size = 4;
  if (b < 3) { flight(center, P.burst, outExpo(seg(b, 0, 2.5)), 0, () => 0, L); size = 6; }
  else if (b < K.curve) flight(P.burst, P.curve, seg(b, 3, K.curve), 0.58, i => P.t[i], L);
  else if (b < 24) flight(P.curve, P.curve, 1, 0, null, L);
  else if (b < K.formula) flight(P.curve, P.form1, seg(b, 24, K.formula - 0.3), 0.4, null, L);
  else if (b < 36) solid = [cauchyForm1(), 960, 480];
  else if (b < K.lagrange) flight(P.form1, P.form2, seg(b, 36, K.lagrange - 0.3), 0.35, null, L);
  else if (b < 44) solid = [cauchyForm2(), 960, 480];
  else if (b < K.title) flight(P.form2, P.title, seg(b, 44, K.title - 0.3), 0.4, null, L);
  else if (b < 53) solid = [cauchyTitle(), 960, 500];
  else {
    for (let i = 0; i < NP; i++) {
      const q = Math.max(0, b - 53 - P.delay[i] * 2.2);
      L.xy[2 * i] = P.title.xy[2 * i] + 820 * q * q + 60 * q;
      L.xy[2 * i + 1] = P.title.xy[2 * i + 1];
      L.col[i] = P.title.col[i];
    }
  }
  // 两个函数一起随 t 走：轴、t 点在两轴上的投影、弦与切线
  if (b >= K.together && b < 24) {
    line(g, 300, 880, 1660, 880, INK, 3, 'butt');
    line(g, 300, 880, 300, 230, INK, 3, 'butt');
    textLine(g, 'g(t)', 1660, 940, MONO(40), INK, {align: 'right'});
    textLine(g, 'f(t)', 330, 250, MONO(40), INK);
    if (b >= K.chord) {
      const q = outCubic(seg(b, K.chord, K.chord + 1));
      line(g, CX(0), CY(0), lerp(CX(0), CX(1), q), lerp(CY(0), CY(1), q), ORANGE, 6);
    }
    const t = b < K.chord ? inOut(seg(b, K.curve, 15)) : lerp(0.06, CAUCHY.xi, inOut(seg(b, K.chord, K.parallel)));
    const X = CX(t), Y = CY(t);
    dashed(g, X, Y, X, 880, INK, 3);
    dashed(g, X, Y, 300, Y, INK, 3);
    line(g, X, 866, X, 894, ORANGE, 8, 'butt');
    line(g, 286, Y, 314, Y, ORANGE, 8, 'butt');
    if (b >= K.chord) {
      const since = b - K.parallel;
      cauchyCurveTangent(g, t, 640 + (since >= 0 ? 500 * Math.max(0, 1 - since / 0.6) ** 2 : 0));
    }
    dot(g, X, Y, 17, ORANGE); dot(g, X, Y, 7, PAPER);
    textLine(g, `t = ${t.toFixed(2)}`, 1660, 250, MONO(44), INK, {align: 'right'});
  }
  if (solid) drawSprite(g, ...solid);
  else drawParticles(g, L, size, b);
  // 切点那一拍：上一场景冲进的橙色 ξ 在这里是一个大圆点，半拍内炸开
  if (b < 0.6) dot(g, 960, 540, 150 * (1 - outCubic(seg(b, 0, 0.6))), ORANGE);
  if (b >= K.together && b < K.parallel) slam(g, sprite('cau-together', TEXT.cauchy.together, 84), 140, 150, b, K.together, {left: true});
  if (b >= K.parallel && b < 24) slam(g, sprite('cau-parallel', TEXT.cauchy.parallel, 84), 140, 150, b, K.parallel, {left: true});
  if (b >= K.lagrange && b < 44) slam(g, sprite('cau-lag', TEXT.cauchy.lagrange, 80), 960, 850, b, K.lagrange);
}

// ---------- 场景五 胶片条串起四个定理 ----------
const TW = 360, TH = 203, PITCH = 450, SLOT0 = 285, STRIP_Y = 470;
const CHAIN_FRAMES = [322, 1005, 1530, 2475];
const EXTRA_FRAMES = [40, 140, 240, 450, 700, 860, 1150, 1400, 1700, 1900, 2250, 2650, 2850];
let thumbs = null;

function drawStrip(g, b) {
  const K = KEYS.chain;
  const off = EXTRA_FRAMES.length * PITCH * (1 - outQuart(seg(b, 0, K.strip)));
  const top = STRIP_Y - TH / 2 - 40, bh = TH + 80;
  g.fillStyle = INK;
  g.fillRect(0, top, W, bh);
  g.fillStyle = PAPER;
  const hole = ((-off % 30) + 30) % 30;
  for (let x = -30 + hole; x < W; x += 30) { g.fillRect(x, top + 12, 16, 14); g.fillRect(x, top + bh - 26, 16, 14); }
  const all = [...EXTRA_FRAMES.map((f, i) => [f, i - EXTRA_FRAMES.length]), ...CHAIN_FRAMES.map((f, i) => [f, i])];
  for (const [f, slot] of all) {
    const x = SLOT0 + slot * PITCH + off;
    if (x < -TW || x > W + TW) continue;
    g.drawImage(thumbs.get(f), x - TW / 2, STRIP_Y - TH / 2, TW, TH);
  }
}

function chain(g, b) {
  const K = KEYS.chain;
  if (b < K.formula) {
    drawStrip(g, b);
    TEXT.chain.names.forEach((t, i) => slam(g, sprite(`chain-name-${i}`, t, 62), SLOT0 + i * PITCH, STRIP_Y + 200, b, K.names[i]));
    K.arrows.forEach((ab, i) => {
      if (b < ab) return;
      const x = SLOT0 + i * PITCH + PITCH / 2, q = outCubic(seg(b, ab, ab + 0.3));
      g.fillStyle = ORANGE;
      g.fillRect(x - 34, STRIP_Y - 6, 52 * q, 12);
      if (q > 0.6) { g.beginPath(); g.moveTo(x + 34, STRIP_Y); g.lineTo(x + 10, STRIP_Y - 20); g.lineTo(x + 10, STRIP_Y + 20); g.fill(); }
      slam(g, sprite(`chain-arrow-${i}`, {t: TEXT.chain.arrows[i], c: ORANGE}, 44), x, STRIP_Y - TH / 2 - 90, b, ab);
    });
    if (b >= K.root) {
      const q = outCubic(seg(b, K.root, K.root + 1));
      g.fillStyle = ORANGE;
      g.fillRect(SLOT0 - 60, STRIP_Y + 262, (3 * PITCH + 120) * q, 10);
      g.fillRect(SLOT0 - 60, STRIP_Y + 240, 10, 32);
      g.strokeStyle = ORANGE; g.lineWidth = 8; g.strokeRect(SLOT0 - TW / 2 - 4, STRIP_Y - TH / 2 - 4, TW + 8, TH + 8);
    }
    slam(g, sprite('chain-root', TEXT.chain.root, 88), 960, 900, b, K.rootText);
    return;
  }
  // 胶片条在第 24 拍硬切走，开场的费马公式切条拼回，四个定理收到同一个根源
  slit(g, fermatFormula(), 960, 420, b, K.formula, K.formula + 1, 'in', 21, {dist: 1300});
  slam(g, sprite('chain-one', TEXT.chain.one, 120), 960, 710, b, K.one);
  slam(g, sprite('chain-flat', TEXT.chain.flat, 84), 960, 880, b, K.flat);
  if (b >= K.final) {
    const q = outExpo(seg(b, K.final, K.final + 0.4));
    g.fillStyle = ORANGE;
    g.fillRect(0, 597, W * q, 16);
  }
}

// ---------- 渲染 ----------
const SCENE_FN = {fermat, rolle, lagrange, cauchy, chain};

function drawFrame(g, frame) {
  FRAME = frame;
  const st = frameState(frame);
  paper(g);
  SCENE_FN[st.scene.id](g, st.b);
  hud(g, st.index);
}

function renderFrame(frame) {
  drawFrame(ctx, frame);
}

async function init() {
  const faces = [TITLE(100), MONO(40)];
  await Promise.all(faces.map(f => document.fonts.load(f, '费马罗尔拉格朗日柯西四个定理根源ξ′⇒−＝³')));
  for (const f of faces) if (!document.fonts.check(f, '费马ξ')) report(`字体未加载：${f}`);
  grain = canvas();
  {
    const g = grain.getContext('2d'), r = rng(5);
    for (let i = 0; i < 90000; i++) {
      g.fillStyle = r() < 0.5 ? 'rgba(22,20,18,0.06)' : 'rgba(255,255,255,0.18)';
      g.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1 + (r() < 0.2), 1);
    }
  }
  fermatLayer = canvas();
  initParticles();
  thumbs = new Map();
  const full = canvas(), fg = full.getContext('2d');
  for (const f of [...EXTRA_FRAMES, ...CHAIN_FRAMES]) {
    drawFrame(fg, f);
    const t = canvas(TW, TH), tg = t.getContext('2d');
    tg.imageSmoothingQuality = 'high';
    tg.drawImage(full, 0, 0, TW, TH);
    thumbs.set(f, t);
  }
  window.film = {renderFrame, FRAME_COUNT, BEAT_FRAMES, SCENES};
  window.artReady = true;
}

init().catch(e => report(String(e.stack ?? e)));
