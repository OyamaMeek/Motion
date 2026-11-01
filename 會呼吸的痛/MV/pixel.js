import {clawdRects, toScreen} from './geometry.js';

const W = 320, H = 180, U = 6;
const BAYER = [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]];
const rgba = hex => { const n = parseInt(hex.slice(1), 16); return (255 << 24 | (n & 255) << 16 | (n >> 8 & 255) << 8 | n >> 16) >>> 0; };
const known = new Map();
const c32 = hex => { if (!known.has(hex)) known.set(hex, rgba(hex)); return known.get(hex); };

export function createPixel() {
  const native = document.createElement('canvas');
  native.width = W; native.height = H;
  const ctx = native.getContext('2d');
  const image = ctx.createImageData(W, H);
  const buf = new Uint32Array(image.data.buffer);
  const glyph = document.createElement('canvas');
  glyph.width = W; glyph.height = 40;
  const glyphCtx = glyph.getContext('2d', {willReadFrequently: true});

  const fillPoly = (pts, value) => {
    const ys = pts.map(p => p[1]);
    for (let y = Math.max(0, Math.floor(Math.min(...ys))); y <= Math.min(H - 1, Math.ceil(Math.max(...ys))); y++) {
      const xs = [];
      pts.forEach(([ax, ay], i) => {
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= y + 0.5) !== (by <= y + 0.5)) xs.push(ax + (y + 0.5 - ay) * (bx - ax) / (by - ay));
      });
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(W, Math.round(xs[k + 1])); x++) buf[y * W + x] = value;
      }
    }
  };
  const fillRect = (x, y, w, h, value) => {
    const x0 = Math.max(0, Math.round(x)), x1 = Math.min(W, Math.round(x + w)), y0 = Math.max(0, Math.round(y)), y1 = Math.min(H, Math.round(y + h));
    for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) buf[j * W + i] = value;
  };

  function drawItem(item, cam) {
    if (item.kind === 'poly') return fillPoly(item.pts.map(([x, y]) => toScreen(cam, x, y)), c32(item.color));
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
    if (item.kind === 'sky') {
      const [sx, sy] = toScreen(cam, item.x, item.y), [ex, ey] = toScreen(cam, item.x + item.w, item.y + item.h);
      const stops = item.stops.map(c32);
      for (let y = Math.max(0, Math.round(sy)); y < Math.min(H, Math.round(ey)); y++) for (let x = Math.max(0, Math.round(sx)); x < Math.min(W, Math.round(ex)); x++) {
        const t = ((y - sy) / (ey - sy)) * (stops.length - 1), base = Math.min(stops.length - 1, Math.floor(t));
        const pick = t - base > (BAYER[y & 7][x & 7] + 0.5) / 64 ? Math.min(stops.length - 1, base + 1) : base;
        buf[y * W + x] = stops[pick];
      }
      return;
    }
    if (item.kind === 'clawd') {
      const unit = (item.unit ?? 1) * cam.z, [ox, oy] = toScreen(cam, item.x, item.y);
      for (const rect of clawdRects(item)) fillRect(ox + rect.x * unit, oy + rect.y * unit, rect.w * unit, rect.h * unit, c32(rect.color));
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

  const canvas = document.createElement('canvas');
  canvas.width = W * U; canvas.height = H * U; document.body.append(canvas);
  const out = canvas.getContext('2d');
  out.imageSmoothingEnabled = false;

  function render(frame) {
    buf.fill(c32('#b7c6cb'));
    for (const item of frame.items) drawItem(item, frame.cam);
    if (frame.wipe) {
      fillRect(frame.wipe.x, 0, frame.wipe.width, H, c32(frame.wipe.color));
      fillRect(frame.wipe.x, 0, 4, H, c32('#713f32'));
    }
    ctx.putImageData(image, 0, 0);
    out.drawImage(native, 0, 0, canvas.width, canvas.height);
  }
  return {canvas, native, render, mime: 'image/png'};
}
