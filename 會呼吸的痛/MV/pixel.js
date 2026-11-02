import {posedRects, toScreen} from './geometry.js';
import {P} from './film.js';

const W = 320, H = 180, U = 6;
const BAYER = [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]];
const rgba = hex => { const n = parseInt(hex.slice(1), 16); return (255 << 24 | (n & 255) << 16 | (n >> 8 & 255) << 8 | n >> 16) >>> 0; };
const known = new Map();
const c32 = hex => { if (!known.has(hex)) known.set(hex, rgba(hex)); return known.get(hex); };
const covered = (x, y, density) => (BAYER[y & 7][x & 7] + 0.5) / 64 < density;
const noise = n => { const v = Math.sin(n * 91.7) * 4375.5; return v - Math.floor(v); };

// 歌词在 640×360 的格子上取整，每格放大 3 倍，与画面同属像素质感但足够清晰。
const LYRIC_CELL = 3, LYRIC_W = 640, LYRIC_H = 40, LYRIC_FONT = 19, LYRIC_BOTTOM = 72;

export function createPixel() {
  const native = document.createElement('canvas');
  native.width = W; native.height = H;
  const ctx = native.getContext('2d');
  const image = ctx.createImageData(W, H);
  const buf = new Uint32Array(image.data.buffer);
  const glyph = document.createElement('canvas');
  glyph.width = W; glyph.height = 40;
  const glyphCtx = glyph.getContext('2d', {willReadFrequently: true});
  let clip = [0, 0, W, H];

  const put = (x, y, value, density) => {
    if (x < clip[0] || x >= clip[2] || y < clip[1] || y >= clip[3]) return;
    if (density === undefined || covered(x, y, density)) buf[y * W + x] = value;
  };
  const fillPoly = (pts, value, density) => {
    const ys = pts.map(p => p[1]);
    for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(H - 1, Math.ceil(Math.max(...ys))); y++) {
      const xs = [];
      pts.forEach(([ax, ay], i) => {
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= y + 0.5) !== (by <= y + 0.5)) xs.push(ax + (y + 0.5 - ay) * (bx - ax) / (by - ay));
      });
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(W, Math.round(xs[k + 1])); x++) put(x, y, value, density);
      }
    }
  };
  const fillRect = (x, y, w, h, value, density) => {
    const x0 = Math.max(0, Math.round(x)), x1 = Math.min(W, Math.round(x + w)), y0 = Math.max(0, Math.round(y)), y1 = Math.min(H, Math.round(y + h));
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) put(i, j, value, density);
  };

  // 远景跟随同一相机移动，只是位移和放大都打折，以窗口中央为支点。
  const viewFor = (cam, depth) => {
    if (depth === undefined) return cam;
    const pivot = [115, 90];
    return {cx: pivot[0] + (cam.cx - pivot[0]) * depth, cy: pivot[1] + (cam.cy - pivot[1]) * depth, z: 1 + (cam.z - 1) * depth};
  };

  function drawItem(item, frameCam) {
    const cam = viewFor(frameCam, item.depth);
    if (item.clip) {
      const [ax, ay] = toScreen(frameCam, item.clip[0], item.clip[1]), [bx, by] = toScreen(frameCam, item.clip[2], item.clip[3]);
      clip = [Math.max(0, Math.round(ax)), Math.max(0, Math.round(ay)), Math.min(W, Math.round(bx)), Math.min(H, Math.round(by))];
    } else clip = [0, 0, W, H];
    if (item.kind === 'poly') return fillPoly(item.pts.map(([x, y]) => toScreen(cam, x, y)), c32(item.color), item.density);
    if (item.kind === 'line') {
      const r = Math.max(0.5, item.width * cam.z / 2);
      for (let i = 1; i < item.pts.length; i++) {
        const [ax, ay] = toScreen(cam, ...item.pts[i - 1]), [bx, by] = toScreen(cam, ...item.pts[i]);
        const len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len * r, ny = (bx - ax) / len * r;
        fillPoly([[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]], c32(item.color));
      }
      return;
    }
    if (item.kind === 'dots') {
      const size = Math.max(1, Math.round(item.size * cam.z));
      for (const [x, y] of item.pts) { const [sx, sy] = toScreen(cam, x, y); fillRect(sx, sy, size, size, c32(item.color)); }
      return;
    }
    if (item.kind === 'glow') {
      const [sx, sy] = toScreen(cam, item.x, item.y), r = item.r * cam.z, value = c32(item.color);
      for (let y = Math.max(0, Math.floor(sy - r)); y < Math.min(H, Math.ceil(sy + r)); y++) for (let x = Math.max(0, Math.floor(sx - r)); x < Math.min(W, Math.ceil(sx + r)); x++) {
        const d = Math.hypot(x - sx, y - sy) / r;
        if (d < 1) put(x, y, value, item.strength * (1 - d) * (1 - d));
      }
      return;
    }
    if (item.kind === 'sky') {
      const [sx, sy] = toScreen(cam, item.x, item.y), [ex, ey] = toScreen(cam, item.x + item.w, item.y + item.h);
      // 五段色带只显示其中一段，shift 随夜色加深向暗端移动。
      const stops = item.stops.map(c32), span = stops.length > 4 ? stops.length - 2.6 : stops.length - 1;
      for (let y = Math.max(0, Math.round(sy)); y < Math.min(H, Math.round(ey)); y++) for (let x = Math.max(0, Math.round(sx)); x < Math.min(W, Math.round(ex)); x++) {
        const t = item.shift + ((y - sy) / (ey - sy)) * span, base = Math.min(stops.length - 1, Math.floor(t));
        const pick = t - base > (BAYER[y & 7][x & 7] + 0.5) / 64 ? Math.min(stops.length - 1, base + 1) : base;
        put(x, y, stops[pick]);
      }
      return;
    }
    if (item.kind === 'clawd') {
      const unit = (item.unit ?? 1) * cam.z, [ox, oy] = toScreen(cam, item.x, item.y);
      for (const rect of posedRects(item)) fillRect(ox + rect.x * unit, oy + rect.y * unit, rect.w * unit, rect.h * unit, c32(rect.color), item.density);
      return;
    }
    if (item.kind === 'text') {
      const px = Math.max(5, Math.round(item.size * cam.z)), [sx, sy] = toScreen(cam, item.x, item.y);
      glyphCtx.clearRect(0, 0, W, 40);
      glyphCtx.fillStyle = '#000'; glyphCtx.font = `${px}px "PingFang SC","Heiti SC",sans-serif`; glyphCtx.textBaseline = 'alphabetic';
      glyphCtx.fillText(item.text, 2, 30);
      const data = glyphCtx.getImageData(0, 0, W, 40).data, value = c32(item.color);
      for (let y = 0; y < 40; y++) for (let x = 0; x < W; x++) {
        if (data[(y * W + x) * 4 + 3] < 110) continue;
        const dx = Math.round(sx) + x - 2, dy = Math.round(sy) + y - 30;
        if (dx >= 0 && dy >= 0 && dx < W && dy < H) buf[dy * W + dx] = value;
      }
    }
  }

  const WIPE_BASE = {post: P.woodDark, envelope: P.paperShade, calendar: P.white, plan: P.white, scarf: P.scarf, phone: P.cityNear};

  // 换景的实物：每种都带材质，前缘投下一道点阵阴影。
  function drawWipe({x, width, kind}) {
    clip = [0, 0, W, H];
    const stripe = (at, w, hex, density) => fillRect(x + at, 0, w, H, c32(hex), density);
    fillRect(x - 14, 0, 14, H, c32(P.ink), 0.34);
    fillRect(x - 6, 0, 6, H, c32(P.ink), 0.5);
    fillRect(x, 0, width, H, c32(WIPE_BASE[kind]));
    if (kind === 'post') {
      for (let i = 0; i < 26; i++) stripe(6 + noise(i) * (width - 12), 1 + Math.round(noise(i + 40) * 3), noise(i + 80) > 0.5 ? P.wood : P.floorWarmDark, 0.55);
      stripe(0, 5, P.line); stripe(5, 3, P.wood); stripe(width - 5, 5, P.line); stripe(width - 8, 3, P.wood);
    } else if (kind === 'envelope') {
      for (let y = 0; y < H; y++) fillRect(x - Math.round(noise(y >> 1) * 4), y, 5, 1, c32(P.whiteDark));
      for (let i = 0; i < 160; i += 2) { fillRect(x + 40 + i, 30 + i * 0.6, 2, 1, c32(P.whiteDark)); fillRect(x + 340 - i, 30 + i * 0.6, 2, 1, c32(P.whiteDark)); }
      stripe(width - 6, 6, P.whiteDark);
    } else if (kind === 'calendar') {
      fillRect(x, 0, width, 34, c32(P.red));
      fillRect(x, 34, width, 2, c32(P.redDark));
      for (let r = 0; r < 5; r++) for (let c = 0; c < 11; c++) fillRect(x + 12 + c * 33, 46 + r * 27, 26, 20, c32(c === 6 && r === 2 ? P.scarf : P.paperShade));
      stripe(0, 3, P.whiteDark); stripe(width - 3, 3, P.whiteDark);
    } else if (kind === 'plan') {
      stripe(0, 3, P.whiteDark); stripe(190, 2, P.whiteDark); stripe(width - 3, 3, P.whiteDark);
      fillRect(x, 88, width, 2, c32(P.whiteDark));
      fillPoly([[x + 70, 170], [x + 118, 18], [x + 166, 170]], c32(P.red));
      for (let i = 0; i < 4; i++) fillRect(x + 104 - i * 10, 60 + i * 28, 28 + i * 20, 3, c32(P.white));
      for (let i = 0; i < 6; i++) fillRect(x + 220, 30 + i * 22, 120 - (i % 3) * 30, 3, c32(P.paperShade));
    } else if (kind === 'scarf') {
      for (let y = 0; y < H; y += 8) { fillRect(x, y, width, 2, c32(P.scarfDark)); fillRect(x, y + 2, width, 2, c32(P.scarfDark), 0.5); }
      for (let c = 0; c < width; c += 12) fillRect(x + c, 0, 2, H, c32(P.scarfDark), 0.4);
      for (let y = 0; y < H; y += 6) { fillRect(x - 12, y, 12, 3, c32(P.scarf)); fillRect(x - 12, y + 3, 7, 1, c32(P.scarfDark)); }
      for (let y = 3; y < H; y += 6) fillRect(x + width, y, 10, 3, c32(P.scarfDark));
    } else if (kind === 'phone') {
      stripe(0, 8, P.ink); stripe(8, 3, P.metal); stripe(width - 8, 8, P.ink); stripe(width - 11, 3, P.metal);
      fillRect(x + 60, 40, width - 120, 100, c32(P.nightDeep));
      fillPoly([[x + 90, 40], [x + 150, 40], [x + 90, 140], [x + 60, 140], [x + 60, 90]], c32(P.night), 0.6);
      fillRect(x + 186, 18, 10, 10, c32(P.ink));
      fillRect(x + 188, 20, 6, 6, c32(P.night));
      fillRect(x + 150, 22, 28, 3, c32(P.ink));
    }
  }

  function drawVignette({color, amount}) {
    clip = [0, 0, W, H];
    const value = c32(color);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = ((x - 160) / 160) ** 2 + ((y - 90) / 90) ** 2 * 0.9;
      if (d > 1.05) put(x, y, value, Math.min(0.55, (d - 1.05) * amount));
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = W * U; canvas.height = H * U; document.body.append(canvas);
  const out = canvas.getContext('2d');
  out.imageSmoothingEnabled = false;

  // 歌词是独立的最上层，固定在画面下方，不经过相机。
  const lyricCells = new Map();
  const measure = document.createElement('canvas');
  measure.width = LYRIC_W; measure.height = LYRIC_H;
  const measureCtx = measure.getContext('2d', {willReadFrequently: true});
  function lyricMask(text) {
    if (lyricCells.has(text)) return lyricCells.get(text);
    measureCtx.clearRect(0, 0, LYRIC_W, LYRIC_H);
    measureCtx.fillStyle = '#000';
    measureCtx.font = `600 ${LYRIC_FONT}px "PingFang TC","PingFang SC",sans-serif`;
    measureCtx.textBaseline = 'alphabetic'; measureCtx.textAlign = 'center';
    measureCtx.fillText(text, LYRIC_W / 2, LYRIC_H - 12);
    const data = measureCtx.getImageData(0, 0, LYRIC_W, LYRIC_H).data, cells = [];
    for (let y = 0; y < LYRIC_H; y++) for (let x = 0; x < LYRIC_W; x++) if (data[(y * LYRIC_W + x) * 4 + 3] >= 118) cells.push([x, y]);
    const on = new Set(cells.map(([x, y]) => y * LYRIC_W + x)), rim = new Set();
    for (const [x, y] of cells) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1], [1, 2], [0, 2], [2, 1]]) {
      const key = (y + dy) * LYRIC_W + x + dx;
      if (!on.has(key)) rim.add(key);
    }
    const mask = {cells, rim: [...rim].map(k => [k % LYRIC_W, Math.floor(k / LYRIC_W)])};
    lyricCells.set(text, mask);
    return mask;
  }

  function drawLyric({text, fade}) {
    const {cells, rim} = lyricMask(text), top = 1080 - LYRIC_BOTTOM - LYRIC_H * LYRIC_CELL;
    const paint = (list, hex) => {
      out.fillStyle = hex;
      for (const [x, y] of list) if (fade >= 1 || (BAYER[y & 7][x & 7] + 0.5) / 64 < fade) out.fillRect(x * LYRIC_CELL, top + y * LYRIC_CELL, LYRIC_CELL, LYRIC_CELL);
    };
    paint(rim, P.ink);
    paint(cells, P.white);
  }

  function render(frame, lyric = null) {
    clip = [0, 0, W, H];
    buf.fill(c32('#b7c6cb'));
    for (const item of frame.items) drawItem(item, frame.cam);
    if (frame.vignette) drawVignette(frame.vignette);
    if (frame.wipe) drawWipe(frame.wipe);
    ctx.putImageData(image, 0, 0);
    out.drawImage(native, 0, 0, canvas.width, canvas.height);
    if (lyric) drawLyric(lyric);
  }
  return {canvas, native, render, mime: 'image/png'};
}
