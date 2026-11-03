import {BEAT_FRAMES, CREED_SNAP_BEAT, FRAME_COUNT, OPEN_SNAP_BEAT, PAGES, frameState} from './timeline.js';
import {MOTTO, SCRIPT} from './script.js';

const W = 1920, H = 1080;
const PAPER = '#F6F3EB', WARM = '#E7DDCB', DARK = '#0E0D0B';
const INK = '#070300', DEEP = '#4B4541', GRAY = '#8A8681', MIST = '#C4BFBA', LIGHT = '#FAF6F2', ACCENT = '#FD602A';
const SONG = '"Songti SC"';
const font = (size, weight = 400) => `${weight} ${size}px ${SONG}`;
const MONO = size => `400 ${size}px Menlo`;
const DIN = size => `700 ${size}px "DIN Condensed"`;
const LEFT = 150, SAFE_L = 80, SAFE_R = W - 80;

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const out = x => 1 - (1 - x) ** 3;
const inQ = x => x * x * x;
const seg = (b, b0, b1) => clamp((b - b0) / (b1 - b0));

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
const canvas = () => Object.assign(document.createElement('canvas'), {width: W, height: H});

function report(message) {
  if (!window.renderErrors.includes(message)) window.renderErrors.push(message);
}

// 纸面中心略亮、四周略暗，带极淡的纸纹；暗场带顶部聚光。
function makeGround(tone) {
  const c = canvas();
  const g = c.getContext('2d');
  if (tone === 'dark') {
    g.fillStyle = DARK; g.fillRect(0, 0, W, H);
    const spot = g.createRadialGradient(W * 0.42, -120, 40, W * 0.42, -120, 1250);
    spot.addColorStop(0, 'rgba(250,240,225,0.10)');
    spot.addColorStop(1, 'rgba(250,240,225,0)');
    g.fillStyle = spot; g.fillRect(0, 0, W, H);
  } else {
    g.fillStyle = tone === 'warm' ? WARM : PAPER; g.fillRect(0, 0, W, H);
    const v = g.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1200);
    v.addColorStop(0, 'rgba(255,255,255,0.16)');
    v.addColorStop(1, 'rgba(90,70,40,0.10)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
  }
  const img = g.getImageData(0, 0, W, H);
  const r = rng(tone.length * 97 + 11);
  const amp = tone === 'dark' ? 5 : 7;
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * amp;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return c;
}
const GROUND = {paper: makeGround('paper'), warm: makeGround('warm'), dark: makeGround('dark')};

function text(g, str, x, y, f, color, align = 'left') {
  g.font = f; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic';
  const w = g.measureText(str).width;
  const x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  if (x0 < SAFE_L - 1 || x0 + w > SAFE_R + 1) report(`超出安全区：${str}`);
  g.fillText(str, x, y);
  return w;
}

// 逐字出现，每字 3 帧（0.1 秒），从 line.at 指定的拍点起打。
function shown(line, s) {
  const start = Math.round(line.at * BEAT_FRAMES);
  if (s.local < start) return '';
  const chars = [...line.text];
  return chars.slice(0, Math.min(chars.length, Math.floor((s.local - start) / 3) + 1)).join('');
}

function typed(g, line, s, x, y, f, color, align = 'left') {
  const str = shown(line, s);
  if (!str) return 0;
  g.font = f;
  const full = g.measureText(line.text).width;
  if (x < SAFE_L || x + full > SAFE_R) report(`超出安全区：${line.text}`);
  g.fillStyle = color; g.textAlign = align; g.textBaseline = 'alphabetic';
  g.fillText(str, x, y);
  return full;
}

// 一句里只有一个词用强调色。
function typedAccent(g, line, s, x, y, f, color, word) {
  const str = shown(line, s);
  if (!str) return;
  g.font = f; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  if (x + g.measureText(line.text).width > SAFE_R) report(`超出安全区：${line.text}`);
  const i = line.text.indexOf(word);
  const parts = [[line.text.slice(0, i), color], [word, ACCENT], [line.text.slice(i + word.length), color]];
  let left = str.length, cx = x;
  for (const [part, c] of parts) {
    const vis = part.slice(0, Math.max(0, left));
    if (vis) { g.fillStyle = c; g.fillText(vis, cx, y); }
    cx += g.measureText(part).width;
    left -= part.length;
  }
}

function corner(g, lines, tone, alpha = 1) {
  g.save();
  g.globalAlpha = alpha;
  const c = tone === 'dark' ? MIST : GRAY;
  text(g, lines[0].text, SAFE_R, 78, font(24), c, 'right');
  text(g, lines[1].text, SAFE_R, 110, MONO(19), c, 'right');
  g.strokeStyle = c; g.lineWidth = 1;
  g.beginPath(); g.moveTo(SAFE_R - 46, 126); g.lineTo(SAFE_R, 126); g.stroke();
  g.restore();
}

function source(g, line, tone) {
  text(g, line.text, LEFT, 1012, font(20), tone === 'dark' ? DEEP : GRAY);
}

function demo(g, line, x, y, tone, align = 'right') {
  text(g, line.text, x, y, font(20), tone === 'dark' ? DEEP : GRAY, align);
}

// ---------- 由字形取点：墨点聚成字、无人机组成字 ----------

function glyphPoints(rows, size, count, seed, accentFrom) {
  const c = canvas();
  const g = c.getContext('2d');
  g.font = font(size, 900); g.fillStyle = '#000'; g.textBaseline = 'alphabetic';
  const boxes = [];
  for (const {str, x, y} of rows) {
    let cx = x;
    for (const ch of str) {
      const w = g.measureText(ch).width;
      g.fillText(ch, cx, y);
      boxes.push({ch, x0: cx, x1: cx + w, y0: y - size, y1: y + size * 0.2});
      cx += w;
    }
  }
  const data = g.getImageData(0, 0, W, H).data;
  // 均匀网格取点：从粗到细找到点数刚够的网格，再等距抽取，点阵均匀、字形清楚。
  let pts = [];
  for (let step = 14; step >= 2 && pts.length < count; step--) {
    pts = [];
    for (let y = 0; y < H; y += step) for (let x = (y / step % 2) * step / 2; x < W; x += step) if (data[(y * W + Math.round(x)) * 4 + 3] > 140) pts.push({x: Math.round(x), y});
  }
  if (pts.length < count) throw new Error(`字形取点不足：${pts.length} < ${count}`);
  const picked = Array.from({length: count}, (_, i) => pts[Math.floor(i * pts.length / count)]);
  const r = rng(seed);
  for (let i = picked.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [picked[i], picked[j]] = [picked[j], picked[i]]; }
  const accentBoxes = boxes.slice(accentFrom, accentFrom + 2);
  return picked.map(p => ({...p, accent: accentBoxes.some(bx => p.x >= bx.x0 && p.x < bx.x1 && p.y >= bx.y0 && p.y <= bx.y1)}));
}

const OPEN_LAYOUT = {size: 200, x: 180, y: [470, 720]};
const CREED_LAYOUT = {size: 150, x: LEFT, y: 640};
const DRONE_LAYOUT = {size: 190, x: 900, y: [450, 690]};
const YEAR_LAYOUT = {size: 400, x: 120, y: 660};

function scatter(pts, seed, box) {
  const r = rng(seed);
  return pts.map(() => ({x: lerp(box[0], box[2], r()), y: lerp(box[1], box[3], r()), d: r()}));
}

// 字形取点依赖字体，在字体加载后计算。
let OPEN_PTS, CREED_PTS, DRONE_PTS, YEAR_PTS, OPEN_FROM, DRONE_FROM, YEAR_FALL, YEAR_MASK, YEAR_WORK;
function prepare() {
  OPEN_PTS = glyphPoints(MOTTO.lines.map((str, i) => ({str, x: OPEN_LAYOUT.x, y: OPEN_LAYOUT.y[i]})), OPEN_LAYOUT.size, 1500, 3, 6);
  CREED_PTS = glyphPoints([{str: MOTTO.text, x: CREED_LAYOUT.x, y: CREED_LAYOUT.y}], CREED_LAYOUT.size, 1600, 5, 7);
  DRONE_PTS = glyphPoints(MOTTO.lines.map((str, i) => ({str, x: DRONE_LAYOUT.x, y: DRONE_LAYOUT.y[i]})), DRONE_LAYOUT.size, 2026, 9, 6);
  YEAR_PTS = glyphPoints([{str: '1979', x: YEAR_LAYOUT.x, y: YEAR_LAYOUT.y}], YEAR_LAYOUT.size, 700, 13, 99);
  OPEN_FROM = scatter(OPEN_PTS, 21, [-200, -500, W + 200, -40]);
  DRONE_FROM = scatter(DRONE_PTS, 23, [760, H + 20, 1800, H + 260]);
  YEAR_FALL = scatter(YEAR_PTS, 29, [-1, 0, 1, 1]);
  YEAR_MASK = canvas();
  const mg = YEAR_MASK.getContext('2d');
  mg.font = font(YEAR_LAYOUT.size, 900); mg.textBaseline = 'alphabetic';
  mg.fillStyle = '#000'; mg.fillText('1979', YEAR_LAYOUT.x, YEAR_LAYOUT.y);
  YEAR_WORK = canvas();
}

// 开场和第二页共用的八个字实字
function mottoSolid(g, color, accentColor, scale = 1, glow = 0) {
  g.save();
  g.font = font(OPEN_LAYOUT.size, 900); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const cx = OPEN_LAYOUT.x + 400, cy = 600;
  g.translate(cx, cy); g.scale(scale, scale); g.translate(-cx, -cy);
  g.fillStyle = color;
  g.fillText(MOTTO.lines[0], OPEN_LAYOUT.x, OPEN_LAYOUT.y[0]);
  const head = MOTTO.lines[1].slice(0, 2);
  g.fillText(head, OPEN_LAYOUT.x, OPEN_LAYOUT.y[1]);
  const hx = OPEN_LAYOUT.x + g.measureText(head).width;
  if (glow) { g.shadowColor = ACCENT; g.shadowBlur = glow; }
  g.fillStyle = accentColor;
  g.fillText(MOTTO.lines[1].slice(2), hx, OPEN_LAYOUT.y[1]);
  g.restore();
  return {x: hx + OPEN_LAYOUT.size, y: OPEN_LAYOUT.y[1] - OPEN_LAYOUT.size * 0.4};
}

// ---------- 电子管（结构示意） ----------

function tube(g, cx, cy, s, reveal, glow, color) {
  g.save();
  g.translate(cx, cy); g.scale(s, s);
  g.beginPath(); g.rect(-200, 330 - 660 * reveal, 400, 700); g.clip();
  g.strokeStyle = color; g.lineWidth = 3 / s * Math.min(1, s * 1.4); g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(-120, 200); g.lineTo(-120, -160);
  g.bezierCurveTo(-120, -300, 120, -300, 120, -160);
  g.lineTo(120, 200); g.stroke();
  g.beginPath(); g.moveTo(-10, -262); g.lineTo(0, -292); g.lineTo(10, -262); g.stroke();
  g.strokeRect(-140, 200, 280, 80);
  for (const px of [-90, -30, 30, 90]) { g.beginPath(); g.moveTo(px, 280); g.lineTo(px, 330); g.stroke(); }
  g.strokeRect(-80, -150, 160, 270);
  g.beginPath();
  for (let i = 0; i <= 14; i++) {
    const y = -130 + i * 17;
    g.moveTo(-48, y); g.lineTo(48, y + 6);
  }
  g.moveTo(-48, -134); g.lineTo(-48, 112); g.moveTo(48, -128); g.lineTo(48, 118);
  g.stroke();
  for (const px of [-60, 60]) { g.beginPath(); g.moveTo(px, 120); g.lineTo(px, 200); g.stroke(); }
  g.restore();
  // 灯丝：整张图里唯一的强调色
  g.save();
  g.translate(cx, cy); g.scale(s, s);
  if (glow > 0) {
    g.strokeStyle = ACCENT; g.lineWidth = 5; g.shadowColor = ACCENT; g.shadowBlur = 28 * glow;
    g.globalAlpha = glow;
    g.beginPath(); g.moveTo(-18, 200); g.lineTo(-18, -110); g.lineTo(0, -126); g.lineTo(18, -110); g.lineTo(18, 200); g.stroke();
  }
  g.restore();
}

// ---------- 各页 ----------

const DRAW = {
  open(g, s) {
    const b = s.b;
    if (b < OPEN_SNAP_BEAT) {
      for (let i = 0; i < OPEN_PTS.length; i++) {
        const p = OPEN_PTS[i], f = OPEN_FROM[i];
        const d = f.d * 1.6;
        const t = out(clamp((b - d) / (OPEN_SNAP_BEAT - d)));
        if (b < d) continue;
        g.fillStyle = p.accent ? ACCENT : INK;
        g.globalAlpha = 0.35 + 0.65 * t;
        g.fillRect(lerp(f.x, p.x, t) - 2, lerp(f.y, p.y, t) - 2, 4.2, 4.2);
      }
      g.globalAlpha = 1;
    } else {
      mottoSolid(g, INK, ACCENT, 1 + 0.025 * (1 - out(seg(b, OPEN_SNAP_BEAT, OPEN_SNAP_BEAT + 0.6))));
    }
    const t = seg(b, SCRIPT.open.title.at, SCRIPT.open.title.at + 0.8);
    if (t > 0) {
      g.strokeStyle = INK; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(1200, 640); g.lineTo(1200 + 440 * out(t), 640); g.stroke();
      typed(g, SCRIPT.open.title, s, 1200, 700, font(40, 700), INK);
    }
  },

  legacy(g, s) {
    const a = SCRIPT.legacy, b = s.b;
    const hand = seg(b, 14, 16);
    const tip = mottoSolid(g, DEEP, ACCENT, 1, 18 + 40 * hand);
    // “尽力”的光在最后两拍移向下一页电子管灯丝的位置
    if (hand > 0) {
      const k = ease(hand);
      const x = lerp(tip.x - 200, 1380, k), y = lerp(tip.y, 470, k);
      const grad = g.createRadialGradient(x, y, 0, x, y, 120 + 60 * k);
      grad.addColorStop(0, `rgba(253,96,42,${0.55 * k})`);
      grad.addColorStop(1, 'rgba(253,96,42,0)');
      g.fillStyle = grad; g.fillRect(x - 200, y - 200, 400, 400);
    }
    const fade = 1 - seg(b, 14, 15.5);
    g.globalAlpha = fade;
    typed(g, a.lines[0], s, 1180, 360, font(44), LIGHT);
    typed(g, a.lines[1], s, 1180, 430, font(44), LIGHT);
    typed(g, a.name, s, 1176, 640, font(150, 900), LIGHT);
    typed(g, a.role, s, 1182, 720, font(36), MIST);
    typed(g, a.term, s, 1182, 775, MONO(32), MIST);
    if (b >= 2) source(g, a.source, 'dark');
    g.globalAlpha = 1;
  },

  newark(g, s) {
    const a = SCRIPT.newark, b = s.b;
    const shrink = ease(seg(b, 12.4, 14));
    const reveal = out(seg(b, 0, 4));
    tube(g, lerp(1380, 1214, shrink), lerp(560, 356, shrink), lerp(1, 0.13, shrink), reveal, 1, INK);
    const fade = 1 - seg(b, 12.4, 13.6);
    g.globalAlpha = fade;
    corner(g, a.corner, 'paper');
    typed(g, a.head, s, LEFT, 400, font(120, 900), INK);
    typed(g, a.lines[0], s, LEFT, 520, font(54), INK);
    typed(g, a.lines[1], s, LEFT, 600, font(54), INK);
    if (b >= 4) demo(g, a.demo, 1600, 940, 'paper');
    if (b >= 1) source(g, a.source, 'paper');
    g.globalAlpha = 1;
  },

  plan(g, s) {
    const a = SCRIPT.plan, b = s.b;
    corner(g, a.corner, 'warm');
    const x0 = 1150, x1 = 1760, y0 = 356, gap = 112;
    const lines = out(seg(b, 0, 1.2));
    for (let r = 0; r < 5; r++) {
      const y = y0 + r * gap;
      g.strokeStyle = INK; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x0 + 70, y + 30); g.lineTo(x0 + 70 + (x1 - x0 - 150) * lines, y + 30); g.stroke();
      g.strokeStyle = GRAY;
      g.setLineDash([6, 8]);
      g.beginPath(); g.moveTo(x0 + 70, y - 4); g.lineTo(x0 + 70 + (x1 - x0 - 220) * lines * 0.8, y - 4); g.stroke();
      g.setLineDash([]);
      if (r === 0) tube(g, x0 + 64, y0, 0.13, 1, 1, INK);
      else {
        g.strokeStyle = INK; g.lineWidth = 2.2;
        const k = out(seg(b, 0.4 + r * 0.3, 1 + r * 0.3));
        g.globalAlpha = k;
        if (r % 2) { g.beginPath(); g.arc(x0 + 20, y + 4, 18, 0, Math.PI * 2); g.stroke(); }
        else g.strokeRect(x0 + 2, y - 14, 36, 36);
        g.globalAlpha = 1;
      }
      g.strokeStyle = INK; g.lineWidth = 2;
      g.strokeRect(x1 - 44, y - 18, 40, 40);
      const tick = out(seg(b, 9.5 + r * 0.5, 9.9 + r * 0.5));
      if (tick > 0) {
        g.strokeStyle = ACCENT; g.lineWidth = 5; g.lineCap = 'round';
        g.beginPath();
        const p0 = [x1 - 36, y + 2], p1 = [x1 - 26, y + 14], p2 = [x1 - 4, y - 16];
        g.moveTo(...p0);
        if (tick < 0.4) g.lineTo(lerp(p0[0], p1[0], tick / 0.4), lerp(p0[1], p1[1], tick / 0.4));
        else { g.lineTo(...p1); g.lineTo(lerp(p1[0], p2[0], (tick - 0.4) / 0.6), lerp(p1[1], p2[1], (tick - 0.4) / 0.6)); }
        g.stroke(); g.lineCap = 'butt';
      }
    }
    if (b >= 1) demo(g, a.demo, x1, y0 + 4 * gap + 100, 'warm');
    typed(g, a.lines[0], s, LEFT, 380, font(50), INK);
    typed(g, a.lines[1], s, LEFT, 456, font(50), INK);
    typed(g, a.lines[2], s, LEFT, 620, font(60, 900), INK);
    typed(g, a.lines[3], s, LEFT, 704, font(60, 900), INK);
    if (b >= 1) source(g, a.source, 'warm');
  },

  hire(g, s) {
    const a = SCRIPT.hire, b = s.b;
    corner(g, a.corner, 'paper');
    typed(g, a.lines[0], s, LEFT, 360, font(50), INK);
    typed(g, a.lines[1], s, LEFT, 436, font(50), INK);
    typed(g, a.hired[0], s, LEFT, 600, font(50), INK);
    typed(g, a.hired[1], s, LEFT, 700, font(72, 900), INK);
    const x = 1300;
    const head = out(seg(b, 0, 1));
    g.strokeStyle = INK; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, 330); g.lineTo(x + 420 * head, 330); g.stroke();
    if (b >= 0.5) text(g, a.listHead.text, x, 310, font(26), GRAY);
    a.names.forEach((n, i) => {
      const k = out(seg(b, n.at, n.at + 0.4));
      if (k <= 0) return;
      g.globalAlpha = k;
      text(g, n.text, x, 420 + i * 92 - 24 * (1 - k), font(54, i === 0 ? 900 : 400), i === 0 ? ACCENT : INK);
      g.globalAlpha = 1;
    });
    if (b >= 12.8) text(g, '……', x, 420 + 4 * 92 - 30, font(40), GRAY);
    if (b >= 1) source(g, a.source, 'paper');
  },

  y1979(g, s) {
    const a = SCRIPT.y1979, b = s.b;
    const crumble = seg(b, 12, 14);
    // 年份字形当容器，里面是缓慢移动的细线；最后两拍散成墨点落下
    if (crumble < 1) {
      yearFill(g, b, 1 - crumble);
      g.save();
      g.globalAlpha = 1 - crumble;
      g.font = font(YEAR_LAYOUT.size, 900); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      g.strokeStyle = LIGHT; g.lineWidth = 2;
      g.strokeText(a.year.text, YEAR_LAYOUT.x, YEAR_LAYOUT.y);
      g.restore();
    }
    if (crumble > 0) {
      for (let i = 0; i < YEAR_PTS.length; i++) {
        const p = YEAR_PTS[i], f = YEAR_FALL[i];
        const t = clamp((crumble - f.d * 0.4) / 0.6);
        if (t <= 0) continue;
        g.fillStyle = LIGHT; g.globalAlpha = 0.8;
        g.fillRect(p.x + f.x * 40 * t, p.y + 700 * inQ(t), 3.6, 3.6);
      }
      g.globalAlpha = 1;
    }
    const fade = 1 - seg(b, 12, 13.4);
    g.globalAlpha = fade;
    corner(g, a.corner, 'dark');
    typed(g, a.lines[0], s, 1090, 330, font(46), LIGHT);
    typed(g, a.lines[1], s, 1090, 400, font(46), LIGHT);
    typed(g, a.thisYear, s, 1090, 560, font(42), MIST);
    if (b >= a.age.at) {
      const n = Math.round(73 * out(seg(b, a.age.at, a.age.at + 1)));
      const w = text(g, String(n), 1086, 790, DIN(230), ACCENT);
      g.font = DIN(230);
      text(g, a.ageUnit.text, 1086 + g.measureText('73').width + 18, 790, font(80, 900), ACCENT);
      void w;
    }
    typed(g, a.went, s, 1090, 880, font(46), LIGHT);
    if (b >= 1) source(g, a.source, 'dark');
    g.globalAlpha = 1;
  },

  aid(g, s) {
    const a = SCRIPT.aid, b = s.b;
    corner(g, a.corner, 'paper');
    const cols = 10, x0 = 1130, y0 = 300, step = 64;
    const kinds = Array.from({length: 58}, (_, k) => (k < 3 ? 'prof' : k < 6 ? 'assoc' : k < 36 ? 'lect' : 'staff'));
    let landed = 0;
    kinds.forEach((kind, k) => {
      const tx = x0 + (k % cols) * step, ty = y0 + Math.floor(k / cols) * step;
      const p = YEAR_PTS[k], f = YEAR_FALL[k];
      const fx = p.x + f.x * 40, fy = -40 - (k % 7) * 30;
      const t = out(clamp((s.local - k) / 12));
      if (t <= 0) return;
      if (t >= 1) landed++;
      const x = lerp(fx, tx, t), y = lerp(fy, ty, t);
      g.beginPath(); g.arc(x, y, 17, 0, Math.PI * 2);
      if (kind === 'prof') { g.fillStyle = ACCENT; g.fill(); }
      else if (kind === 'assoc') { g.fillStyle = INK; g.fill(); }
      else if (kind === 'lect') { g.strokeStyle = INK; g.lineWidth = 3; g.stroke(); }
      else { g.fillStyle = MIST; g.fill(); }
    });
    text(g, String(landed), LEFT - 6, 560, DIN(300), INK);
    g.font = DIN(300);
    if (b >= 0.2) text(g, '人', LEFT + g.measureText(String(landed)).width + 6, 560, font(60, 900), INK);
    if (b >= a.legend.at) {
      g.globalAlpha = out(seg(b, a.legend.at, a.legend.at + 0.6));
      const items = [['prof', '教授 3'], ['assoc', '副教授 3'], ['lect', '讲师 30'], ['staff', '干部职工 22']];
      let lx = x0 - 17;
      for (const [kind, lab] of items) {
        g.beginPath(); g.arc(lx + 9, 718, 9, 0, Math.PI * 2);
        if (kind === 'prof') { g.fillStyle = ACCENT; g.fill(); }
        else if (kind === 'assoc') { g.fillStyle = INK; g.fill(); }
        else if (kind === 'lect') { g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); }
        else { g.fillStyle = MIST; g.fill(); }
        lx += 26 + text(g, lab, lx + 26, 726, MONO(22), INK) + 36;
      }
      g.globalAlpha = 1;
      demo(g, a.demo, x0 - 17, 780, 'paper', 'left');
    }
    typed(g, a.lines[0], s, LEFT, 700, font(48), INK);
    typed(g, a.lines[1], s, LEFT, 780, font(48), INK);
    if (b >= 1) source(g, a.source, 'paper');
  },

  exam(g, s) {
    const a = SCRIPT.exam, b = s.b;
    corner(g, a.corner, 'warm');
    typed(g, a.lines[0], s, LEFT, 380, font(48), INK);
    typed(g, a.lines[1], s, LEFT, 454, font(48), INK);
    typed(g, a.lines[2], s, LEFT, 590, font(54, 700), INK);
    const sx = 1150;
    a.subjects.forEach((sub, i) => {
      const k = out(seg(b, sub.at, sub.at + 0.35));
      if (k <= 0) return;
      g.globalAlpha = k;
      text(g, sub.text, sx, 380 + i * 150 - 40 * (1 - k), font(96, 900), INK);
      g.globalAlpha = 1;
    });
    const br = out(seg(b, 8.4, 9));
    if (br > 0) {
      g.strokeStyle = INK; g.lineWidth = 3;
      const bx = 1380, top = 296, bot = 690, mid = (top + bot) / 2;
      g.beginPath();
      g.moveTo(bx, top); g.lineTo(bx + 30, top); g.lineTo(bx + 30, lerp(top, mid - 10, br));
      g.moveTo(bx, bot); g.lineTo(bx + 30, bot); g.lineTo(bx + 30, lerp(bot, mid + 10, br));
      if (br >= 1) { g.moveTo(bx + 30, mid - 10); g.lineTo(bx + 60, mid); g.lineTo(bx + 30, mid + 10); }
      g.stroke();
    }
    if (b >= a.total.at) text(g, a.total.text, 1470, 430, font(44), INK);
    if (b >= a.first.at) {
      const pop = 1 + 0.08 * (1 - out(seg(b, a.first.at, a.first.at + 0.5)));
      text(g, a.first.text, 1470, 600, font(Math.round(160 * pop), 900), ACCENT);
    }
    if (b >= 1) source(g, a.source, 'warm');
    // 进入下一页前一帧是单帧白闪，下一帧关灯
    if (s.left === 1) { g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H); }
  },

  creed(g, s) {
    const a = SCRIPT.creed, b = s.b;
    const shrink = ease(seg(b, 14, 16));
    const fade = 1 - seg(b, 13.6, 15);
    g.globalAlpha = fade;
    typed(g, a.lines[0], s, LEFT, 220, font(38), MIST);
    typed(g, a.lines[1], s, LEFT, 280, font(38), MIST);
    typed(g, a.lines[2], s, LEFT, 340, font(38), MIST);
    g.globalAlpha = 1;
    const cx = 1440, cy = 560;
    g.save();
    g.translate(lerp(0, cx - 830, shrink), lerp(0, cy - 590, shrink));
    g.translate(830, 590); g.scale(lerp(1, 0.2, shrink), lerp(1, 0.2, shrink)); g.translate(-830, -590);
    if (b < CREED_SNAP_BEAT) {
      if (b >= a.motto.at) {
        const r = rng(41);
        for (let i = 0; i < CREED_PTS.length; i++) {
          const p = CREED_PTS[i];
          const k = Math.floor(r() * 58);
          const sx = 1130 + (k % 10) * 64 + (r() - 0.5) * 30, sy = 300 + Math.floor(k / 10) * 64 + (r() - 0.5) * 30;
          const d = r() * 1.2;
          const t = ease(clamp((b - a.motto.at - d) / (CREED_SNAP_BEAT - a.motto.at - d)));
          g.fillStyle = p.accent ? ACCENT : LIGHT;
          g.globalAlpha = 0.4 + 0.6 * t;
          g.fillRect(lerp(sx, p.x, t) - 1.8, lerp(sy, p.y, t) - 1.8, 3.6, 3.6);
        }
        g.globalAlpha = 1;
      }
    } else {
      g.font = font(CREED_LAYOUT.size, 900); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      const head = MOTTO.text.slice(0, 7);
      g.fillStyle = LIGHT; g.fillText(head, CREED_LAYOUT.x, CREED_LAYOUT.y);
      g.shadowColor = ACCENT; g.shadowBlur = 30;
      g.fillStyle = ACCENT; g.fillText(MOTTO.text.slice(7), CREED_LAYOUT.x + g.measureText(head).width, CREED_LAYOUT.y);
      g.shadowBlur = 0;
      if (g.measureText(MOTTO.text).width + CREED_LAYOUT.x > SAFE_R) report('超出安全区：第九页八个字');
    }
    g.restore();
    g.globalAlpha = fade;
    typed(g, a.tail, s, 1500, 760, font(42), MIST, 'right');
    if (b >= 1) source(g, a.source, 'dark');
    g.globalAlpha = 1;
  },

  notice(g, s) {
    const a = SCRIPT.notice, b = s.b;
    corner(g, a.corner, 'paper');
    const cx = 1440, cy = 560, half = 170;
    const bend = ease(seg(b, 0.5, 4.5));
    // 书页横线弯成电路走线，接到“芯”的引脚上
    g.strokeStyle = INK; g.lineWidth = 2;
    for (let i = 0; i < 14; i++) {
      const y = 230 + i * 50;
      const pin = cy - half + 30 + (i % 7) * ((2 * half - 60) / 6);
      const leftSide = i < 7;
      const xs = leftSide ? [880, 1060, 1180, cx - half] : [SAFE_R - 40, 1770, 1700, cx + half];
      const yy = lerp(y, pin, bend);
      g.beginPath();
      g.moveTo(xs[0], y);
      g.lineTo(lerp(xs[3], xs[1], bend), y);
      g.lineTo(lerp(xs[3], xs[2], bend), yy);
      g.lineTo(xs[3], yy);
      g.globalAlpha = 0.35 + 0.65 * bend;
      g.stroke();
      g.beginPath(); g.arc(xs[0], y, 5, 0, Math.PI * 2); g.fillStyle = INK; g.fill();
      g.globalAlpha = 1;
    }
    g.fillStyle = PAPER; g.fillRect(cx - half, cy - half, 2 * half, 2 * half);
    g.strokeStyle = ACCENT; g.lineWidth = 5; g.strokeRect(cx - half, cy - half, 2 * half, 2 * half);
    g.font = font(70, 900); g.fillStyle = INK; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText(MOTTO.lines[0], cx, cy - 12); g.fillText(MOTTO.lines[1], cx, cy + 82);
    g.textAlign = 'left';
    if (b >= 1) demo(g, a.demo, cx + half, cy + half + 56, 'paper');
    typed(g, a.lines[0], s, LEFT, 400, font(48), INK);
    typed(g, a.lines[1], s, LEFT, 476, font(48), INK);
    typed(g, a.lines[2], s, LEFT, 552, font(48), INK);
    if (b >= 1) source(g, a.source, 'paper');
  },

  drones(g, s) {
    const a = SCRIPT.drones, b = s.b;
    const bright = seg(b, 10.4, 12);
    g.strokeStyle = DEEP; g.lineWidth = 1;
    g.beginPath(); g.moveTo(760, 960); g.lineTo(1840, 960); g.stroke();
    for (let i = 0; i < DRONE_PTS.length; i++) {
      const p = DRONE_PTS[i], f = DRONE_FROM[i];
      const d = f.d * 3;
      const t = ease(clamp((b - d) / (8 - d)));
      const x = lerp(f.x, p.x, t), y = lerp(f.y, p.y, t);
      const tw = 0.85 + 0.15 * Math.sin(i * 1.7 + s.local * 0.21);
      g.globalAlpha = Math.min(1, (t >= 1 ? tw : 0.6) + 0.2 * bright);
      g.fillStyle = p.accent ? ACCENT : LIGHT;
      const r = 3.6 + 2.4 * bright;
      g.fillRect(x - r / 2, y - r / 2, r, r);
    }
    g.globalAlpha = 1;
    if (bright > 0) {
      const glow = g.createRadialGradient(1270, 560, 50, 1270, 560, 900);
      glow.addColorStop(0, `rgba(250,246,242,${0.5 * inQ(bright)})`);
      glow.addColorStop(1, 'rgba(250,246,242,0)');
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
    }
    const fade = 1 - seg(b, 10.4, 11.6);
    g.globalAlpha = fade;
    corner(g, a.corner, 'dark');
    typed(g, a.lines[0], s, LEFT, 420, font(46), LIGHT);
    typed(g, a.lines[1], s, LEFT, 496, font(46), LIGHT);
    typed(g, a.lines[2], s, LEFT, 572, font(46), LIGHT);
    typed(g, a.lines[3], s, LEFT, 648, font(46), LIGHT);
    if (b >= 1) { demo(g, a.demo, 1840, 1012, 'dark'); source(g, a.source, 'dark'); }
    g.globalAlpha = 1;
  },

  ours(g, s) {
    const a = SCRIPT.ours, b = s.b;
    const gray = seg(b, 12, 13.6);
    const ink = gray > 0 ? `rgba(7,3,0,${1 - 0.75 * gray})` : INK;
    g.globalAlpha = 1 - 0.8 * gray;
    g.strokeStyle = GRAY; g.lineWidth = 1.5;
    g.strokeRect(LEFT, 196, 150, 46);
    text(g, a.tag.text, LEFT + 75, 230, font(26), GRAY, 'center');
    typedAccent(g, a.lines[0], s, LEFT, 400, font(64, 900), ink, '尽力');
    typed(g, a.lines[1], s, LEFT, 540, font(52), ink);
    typed(g, a.lines[2], s, LEFT, 630, font(52), ink);
    const tx = 1520;
    const line = out(seg(b, 0, 2.5));
    g.strokeStyle = MIST; g.lineWidth = 2;
    g.beginPath(); g.moveTo(tx, 260); g.lineTo(tx, 260 + 640 * line); g.stroke();
    a.years.forEach((yr, i) => {
      const k = out(seg(b, yr.at, yr.at + 0.4));
      if (k <= 0) return;
      g.globalAlpha = k * (1 - 0.8 * gray);
      g.beginPath(); g.arc(tx, 300 + i * 140, 9, 0, Math.PI * 2); g.fillStyle = GRAY; g.fill();
      text(g, yr.text, tx + 30, 310 + i * 140, MONO(28), GRAY);
    });
    g.globalAlpha = 1;
  },

  end(g, s) {
    const a = SCRIPT.end, b = s.b;
    text(g, a.title[0].text, LEFT, 470, font(130, 900), INK);
    text(g, a.title[1].text, LEFT, 640, font(130, 900), INK);
    g.fillStyle = ACCENT; g.fillRect(LEFT + 4, 700, 120 * out(seg(b, 0, 0.8)), 6);
    a.credits.forEach((c, i) => {
      const k = out(seg(b, 2 + i * 0.5, 2.6 + i * 0.5));
      if (k <= 0) return;
      g.globalAlpha = k;
      text(g, c.text, LEFT, 880 + i * 40, font(22), GRAY);
      g.globalAlpha = 1;
    });
  },
};

function yearFill(g, b, alpha) {
  const mg = YEAR_WORK.getContext('2d');
  mg.globalCompositeOperation = 'source-over';
  mg.clearRect(0, 0, W, H);
  mg.drawImage(YEAR_MASK, 0, 0);
  mg.globalCompositeOperation = 'source-in';
  mg.fillStyle = 'rgba(75,69,65,0.9)'; mg.fillRect(0, 0, W, H);
  mg.fillStyle = MIST;
  const shift = (b * 6) % 14;
  for (let y = 300 + shift; y < 720; y += 14) mg.fillRect(0, y, W, 2);
  g.globalAlpha = alpha;
  g.drawImage(YEAR_WORK, 0, 0);
  g.globalAlpha = 1;
}

// 上一页留下的关键物在关灯后保留半拍
function carry(g, s) {
  if (s.page.id === 'y1979' && s.b < 1) {
    g.globalAlpha = 1 - seg(s.b, 0, 1);
    text(g, '蒋葆增', 1300, 420, font(54, 900), ACCENT);
    g.globalAlpha = 1;
  }
}

export function renderFrame(n) {
  const s = frameState(n);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  ctx.drawImage(GROUND[s.page.tone], 0, 0);
  carry(ctx, s);
  DRAW[s.page.id](ctx, s);
  ctx.globalAlpha = 1;
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
