import {drawCharacter, CHARACTER_COLORS} from './lib/character.js';

export const W = 1920, H = 1080;
export const C = {
  kraft: '#c4a176', sky: '#bfd3d6', skyDim: '#a9bdc4', newsSky: '#eceadb', sun: '#f7e8bd', hill: '#c6d3cf', snow: '#eef0e6', bank: '#f7f3e8',
  path: '#efe0c4', pine: '#6f8a7c', pineDark: '#5f7a6a', wall: '#f3e4c7', wallShade: '#ead8b8', roof: '#a24e3b', door: '#7c3b2c',
  gold: '#f2c14e', red: '#b8332a', petal: '#f0b7a4', cream: '#f6efe0', white: '#fbf8ef', branch: '#5a4334', ink: '#3a2f28', envelope: '#e9dcc0',
  room: '#b9c2bd', roomDim: '#94a39f', wood: '#8d6a4c', woodDark: '#6e5038', glass: '#d9e6e6', frost: '#e8f1f1', warm: '#f4d48b', hall: '#ecd5a4', carpet: '#a63a2e',
  old: '#ddd2b8', oldDark: '#b8ab8e', green: '#4f8a68', phone: '#39414a', tie: '#2f2b2a', orange: CHARACTER_COLORS.body,
};

export const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
export const ellipse = (cx, cy, rx, ry, n = 28) => Array.from({length: n}, (_, i) => [cx + Math.cos(i / n * 2 * Math.PI) * rx, cy + Math.sin(i / n * 2 * Math.PI) * ry]);
export const circle = (cx, cy, r, n = 28) => ellipse(cx, cy, r, r, n);
export function arch(x0, x1, top, base) {
  const r = (x1 - x0) / 2, cx = x0 + r;
  const curve = Array.from({length: 13}, (_, i) => [cx - Math.cos(i / 12 * Math.PI) * r, top + r - Math.sin(i / 12 * Math.PI) * r]);
  return [[x0, base], ...curve, [x1, base]];
}
export function rotated(cx, cy, w, h, deg) {
  const a = deg * Math.PI / 180;
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]
    .map(([x, y]) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
}

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const unit = n => { const v = Math.sin(n * 91.7) * 4375.5; return v - Math.floor(v); };
function roughen(pts, step, amp, seed) {
  const out = [];
  let n = seed % 9973, slow = unit(n) * 6, fast = unit(n + 1) * 6;
  pts.forEach(([x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length], len = Math.hypot(nx - x, ny - y) || 1, parts = Math.max(1, Math.ceil(len / step));
    for (let j = 0; j < parts; j++) {
      n += 1;
      slow += 0.22 + unit(n) * 0.1; fast += 0.9 + unit(n + 0.5) * 0.6;
      const d = Math.max(-1, Math.min(1, Math.sin(slow) * 0.6 + Math.sin(fast) * 0.3 + (unit(n + 0.25) - 0.5) * 0.5)) * amp, k = j / parts;
      out.push([x + (nx - x) * k - (ny - y) / len * d, y + (ny - y) * k + (nx - x) / len * d]);
    }
  });
  return out;
}

// 借 character.js 取得角色几何：录下每个色块，手臂和身体比例都不在这里改。
const rectCache = new Map();
function clawdRects(facing, expression, action, frame) {
  const key = `${facing}|${expression}|${action}|${frame}`;
  if (rectCache.has(key)) return rectCache.get(key);
  const rects = [];
  let sx = 1, ox = 0, stack = [], fill = null;
  const recorder = {
    canvas: {},
    save() { stack.push([sx, ox]); }, restore() { [sx, ox] = stack.pop(); },
    translate(x) { ox += x * sx; }, scale(x) { sx *= x; },
    set fillStyle(v) { fill = v; }, get fillStyle() { return fill; },
    imageSmoothingEnabled: false,
    fillRect(x, y, w, h) { rects.push({x: sx > 0 ? ox + x : ox - x - w, y, w, h, color: fill}); },
  };
  drawCharacter(recorder, {x: 0, y: 0, scale: 1, facing, expression, action, frame});
  rectCache.set(key, rects);
  return rects;
}
// hold 自带的车票只留手，道具由场景按握点另画。
const isTicket = r => r.y >= 24 && ((r.x === 28 && r.w === 8) || (r.x === 29 && r.w === 6) || (r.x === 33 && r.w === 1));

function texture(paint, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  return c;
}

export function createKit(canvas) {
  const out = canvas.getContext('2d', {willReadFrequently: true});
  const r = rng(1026);
  const fibre = texture((t, w, h) => {
    const grain = t.createImageData(w, h);
    for (let i = 0; i < grain.data.length; i += 4) {
      const v = 255 - r() * 16;
      grain.data[i] = grain.data[i + 1] = grain.data[i + 2] = v;
      grain.data[i + 3] = 255;
    }
    t.putImageData(grain, 0, 0);
    for (let i = 0; i < 2600; i++) {
      const x = r() * w, y = r() * h, a = r() * 6.3, l = 3 + r() * 14;
      t.strokeStyle = r() < 0.72 ? `rgba(90,70,45,${0.05 + r() * 0.12})` : 'rgba(255,255,255,.5)';
      t.lineWidth = 0.4 + r() * 0.7;
      t.beginPath(); t.moveTo(x, y); t.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); t.stroke();
    }
  }, 640, 640);
  const kraft = texture((t, w, h) => {
    t.fillStyle = C.kraft; t.fillRect(0, 0, w, h);
    for (let i = 0; i < 30000; i++) {
      const x = r() * w, y = r() * h, l = 4 + r() * 13, a = (r() - 0.5) * 1.6;
      t.strokeStyle = r() < 0.55 ? `rgba(95,66,36,${0.06 + r() * 0.16})` : `rgba(240,215,175,${0.08 + r() * 0.18})`;
      t.lineWidth = 0.4 + r() * 0.8;
      t.beginPath(); t.moveTo(x, y); t.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); t.stroke();
    }
  }, W, H);
  // 旧报纸只用假字条和半调网点，没有可读文字。
  const news = texture((t, w, h) => {
    t.fillStyle = '#eadfc8'; t.fillRect(0, 0, w, h);
    const cols = 6, cw = w / cols;
    for (let c = 0; c < cols; c++) {
      const x = c * cw + 10;
      for (let y = 8; y < h; y += 9) {
        let px = x;
        const end = x + cw - 20;
        while (px < end) {
          const len = 3 + r() * 13;
          t.fillStyle = `rgba(62,56,48,${0.2 + r() * 0.2})`;
          t.fillRect(px, y, Math.min(len, end - px), 3);
          px += len + 2.5;
        }
      }
    }
  }, 1080, 720);
  const TEX = {news, kraft};

  let cam = {cx: W / 2, cy: H / 2, z: 1}, serial = 0, marks = {}, me = null, seedBase = 0;
  const applyCam = () => out.setTransform(cam.z, 0, 0, cam.z, W / 2 - cam.cx * cam.z, H / 2 - cam.cy * cam.z);
  const screen = (x, y) => [(x - cam.cx) * cam.z + W / 2, (y - cam.cy) * cam.z + H / 2];
  const remember = (name, pts) => {
    if (!name) return;
    const sp = pts.map(([x, y]) => screen(x, y)), xs = sp.map(p => p[0]), ys = sp.map(p => p[1]);
    const box = {x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys)}, old = marks[name];
    marks[name] = old ? {x0: Math.min(old.x0, box.x0), y0: Math.min(old.y0, box.y0), x1: Math.max(old.x1, box.x1), y1: Math.max(old.y1, box.y1)} : box;
  };
  const trace = pts => { out.beginPath(); pts.forEach(([x, y], i) => (i ? out.lineTo(x, y) : out.moveTo(x, y))); out.closePath(); };
  const shadow = lift => {
    out.shadowColor = 'rgba(58,42,24,.42)'; out.shadowBlur = (7 + lift * 7) * cam.z;
    out.shadowOffsetX = (2 + lift * 2) * cam.z; out.shadowOffsetY = (3 + lift * 4) * cam.z;
  };
  const overlayFibre = () => {
    out.save();
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.globalCompositeOperation = 'multiply';
    out.fillStyle = out.createPattern(fibre, 'repeat');
    out.fillRect(0, 0, W, H);
    out.restore();
  };

  function piece(pts, color, {torn = false, tex = null, lift = 1, border = 6, name = null, alpha = 1} = {}) {
    serial += 1;
    const seed = seedBase + serial * 131;
    const edge = torn ? roughen(pts, 7, 7, seed) : roughen(pts, 34, 0.8, seed);
    const inner = torn ? roughen(pts, 7, 3.5, seed + 17) : edge;
    out.save();
    out.globalAlpha = alpha;
    shadow(lift);
    trace(edge);
    out.fillStyle = C.white; out.fill();
    if (!torn) { out.strokeStyle = C.white; out.lineWidth = border; out.lineJoin = 'round'; out.stroke(); }
    out.restore();
    out.save();
    out.globalAlpha = alpha;
    trace(inner); out.clip();
    out.setTransform(1, 0, 0, 1, 0, 0);
    if (tex) {
      out.fillStyle = out.createPattern(TEX[tex], 'repeat'); out.fillRect(0, 0, W, H);
      out.globalCompositeOperation = 'multiply';
    }
    out.fillStyle = color; out.fillRect(0, 0, W, H);
    out.globalCompositeOperation = 'source-over';
    out.restore();
    out.save();
    trace(inner); out.clip();
    overlayFibre();
    out.restore();
    remember(name, pts);
  }

  const kit = {
    C,
    begin(seed) {
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.globalAlpha = 1;
      out.drawImage(kraft, 0, 0);
      cam = {cx: W / 2, cy: H / 2, z: 1}; serial = 0; marks = {}; me = null; seedBase = seed;
      applyCam();
    },
    camera(cx, cy, z) { cam = {cx, cy, z}; applyCam(); },
    torn: (pts, color, opts = {}) => piece(pts, color, {torn: true, ...opts}),
    cut: (pts, color, opts = {}) => piece(pts, color, opts),
    line(pts, color, width, border = 0, name = null) {
      const path = () => { out.beginPath(); pts.forEach(([x, y], i) => (i ? out.lineTo(x, y) : out.moveTo(x, y))); };
      out.save();
      out.lineJoin = 'round'; out.lineCap = 'round';
      if (border) {
        shadow(0.6);
        path(); out.strokeStyle = C.white; out.lineWidth = width + border; out.stroke();
        out.shadowColor = 'transparent';
      }
      path(); out.strokeStyle = color; out.lineWidth = width; out.stroke();
      out.restore();
      remember(name, pts);
    },
    mark(pts, color, name = null) { trace(pts); out.fillStyle = color; out.fill(); remember(name, pts); },
    text(str, x, y, size, color, {deg = 0, name = null, spacing = 0} = {}) {
      out.save();
      out.translate(x, y); out.rotate(deg * Math.PI / 180);
      out.fillStyle = color; out.textAlign = 'center'; out.textBaseline = 'middle';
      out.font = `700 ${size}px "Songti SC"`;
      out.letterSpacing = `${spacing}px`;
      out.fillText(str, spacing / 2, 0);
      out.restore();
      const half = str.length * (size + spacing) / 2;
      remember(name, [[x - half, y - size / 2], [x + half, y + size / 2]]);
    },
    // 半透明硫酸纸，用来把背景压下去；纸艺没有景深，靠这层表现虚化。
    vellum(alpha, color = '#eef0e6') {
      out.save();
      out.setTransform(1, 0, 0, 1, 0, 0);
      out.fillStyle = color; out.globalAlpha = alpha; out.fillRect(0, 0, W, H);
      out.restore();
    },
    // (cx, footY) 是角色脚底中点，u 是每个设计像素的尺寸。返回手部握点等锚点。
    clawd(cx, footY, u, {facing = 'front', expression = 'neutral', action = 'idle', frame = 0, role = 'guest', name = null, tint = null, deg = 0} = {}) {
      const x0 = cx - 16 * u, y0 = footY - 27 * u;
      const rects = clawdRects(facing, expression, action, frame).filter(q => !isTicket(q));
      const shape = new Path2D();
      const box = q => [x0 + q.x * u, y0 + q.y * u, q.w * u, q.h * u];
      for (const q of rects) shape.rect(...box(q));
      out.save();
      if (deg) { out.translate(cx, footY); out.rotate(deg * Math.PI / 180); out.translate(-cx, -footY); }
      out.save();
      shadow(1.4);
      out.fillStyle = C.white; out.strokeStyle = C.white; out.lineJoin = 'round'; out.lineWidth = Math.max(4, u * 0.9);
      out.fill(shape); out.stroke(shape);
      out.restore();
      for (const q of rects) { out.fillStyle = tint?.[q.color] ?? q.color; out.fillRect(...box(q)); }
      out.save();
      out.clip(shape);
      overlayFibre();
      out.restore();
      out.restore();
      const points = rects.flatMap(q => { const [a, b, w, h] = box(q); return [[a, b], [a + w, b + h]]; });
      remember(name ?? role, points);
      if (role === 'me') { me = facing; remember('me', points); }
      const side = facing === 'left' || facing === 'right', sign = facing === 'left' ? -1 : 1;
      return {
        grip: [x0 + 29.5 * u, y0 + 24.5 * u], left: [x0 + (side ? 16 : 3) * u, y0 + 17 * u], right: [x0 + (side ? 16 + 12 * sign : 29) * u, y0 + 17 * u],
        chest: [cx, y0 + 18.5 * u], head: [cx, y0 + 7 * u], eye: [cx, y0 + 13 * u], foot: [cx, footY], u,
      };
    },
    state: () => ({marks, me}),
  };
  return kit;
}
