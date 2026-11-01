import {drawCharacter} from '../../../assets/clawd/character.js';
import {isLit} from './clip.js';
import {W, H, U, COLORS as C, TOWER, towerHalf, towerArch, SKYLINE, skylinePolygon, SUN, STARS, RAIL, BENCH,
  TICKETS, SUITCASE, SHADOW, CASE_SHADOW, BRANCH, LEAVES, leafShape} from './scene.js';

const BAYER = [[0, 32, 8, 40, 2, 34, 10, 42], [48, 16, 56, 24, 50, 18, 58, 26], [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22], [3, 35, 11, 43, 1, 33, 9, 41], [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37], [63, 31, 55, 23, 61, 29, 53, 21]];
const dither = (x, y) => (BAYER[y & 7][x & 7] + 0.5) / 64;

export function createPixel() {
  const native = document.createElement('canvas');
  native.width = W; native.height = H;
  const ctx = native.getContext('2d');
  const plot = (x, y, color) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1);
  };
  const box = (x, y, w, h, color) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) plot(i, j, color); };
  const poly = (pts, color) => {
    const ys = pts.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const xs = [];
      pts.forEach(([ax, ay], i) => {
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= y + 0.5) !== (by <= y + 0.5)) xs.push(ax + (y + 0.5 - ay) * (bx - ax) / (by - ay));
      });
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) plot(x, y, typeof color === 'function' ? color(x, y) : color);
    }
  };
  const line = (a, b, color) => {
    let [x, y] = a; const [tx, ty] = b;
    const dx = Math.abs(tx - x), dy = -Math.abs(ty - y), sx = x < tx ? 1 : -1, sy = y < ty ? 1 : -1;
    let err = dx + dy;
    while (true) {
      plot(x, y, color);
      if (x === tx && y === ty) break;
      const e = 2 * err;
      if (e >= dy) { err += dy; x += sx; }
      if (e <= dx) { err += dx; y += sy; }
    }
  };

  const canvas = document.createElement('canvas');
  canvas.width = W * U; canvas.height = H * U; document.body.append(canvas);
  const out = canvas.getContext('2d');
  out.imageSmoothingEnabled = false;

  function render(s) {
    for (let y = 0; y < 147; y++) for (let x = 0; x < W; x++) {
      const t = Math.pow(y / 118, 1.15) * (C.sky.length - 1);
      const base = Math.min(C.sky.length - 1, Math.floor(t));
      const pick = t - base > dither(x, y) ? Math.min(C.sky.length - 1, base + 1) : base;
      plot(x, y, C.sky[pick]);
    }
    for (let y = SUN.y - SUN.r; y <= SUN.y + SUN.r; y++) for (let x = SUN.x - SUN.r; x <= SUN.x + SUN.r; x++) {
      if (Math.hypot(x - SUN.x, y - SUN.y) <= SUN.r) plot(x, y, C.sun);
    }
    for (const [x, y, size] of STARS.slice(0, s.stars)) {
      plot(x, y, C.lamp);
      if (size >= 1) { plot(x - 1, y, C.lamp); plot(x + 1, y, C.lamp); plot(x, y - 1, C.lamp); plot(x, y + 1, C.lamp); }
      if (size >= 2) { plot(x, y, C.sun); plot(x - 2, y, C.lamp); plot(x + 2, y, C.lamp); plot(x, y - 2, C.lamp); plot(x, y + 2, C.lamp); }
    }

    poly(skylinePolygon(SKYLINE.far), C.far);
    poly(skylinePolygon(SKYLINE.mid), C.mid);
    SKYLINE.mid.lights.forEach((l, i) => { if (isLit(i, s.lit)) plot(l.x, l.y, l.warm ? C.sun : C.far); });

    const bandColor = y => TOWER.bands.find(([a, b]) => y >= a && y < b)?.[2] || 'red';
    for (let y = TOWER.top; y < TOWER.base; y++) {
      const half = towerHalf(y), arch = towerArch(y), key = bandColor(y);
      const hi = key === 'red' ? C.red : C.white, lo = key === 'red' ? C.redDark : C.whiteDark;
      const r = Math.round(half);
      for (let dx = -r; dx <= r; dx++) {
        const x = TOWER.cx + dx, abs = Math.abs(dx);
        if (arch && abs < arch) continue;
        const deck = (y >= TOWER.mainDeck[0] && y < TOWER.mainDeck[1]) || (y >= TOWER.topDeck[0] && y < TOWER.topDeck[1]);
        const edge = r - abs < 2, brace = (x + y) % 5 === 0 || (x - y + 500) % 5 === 0, girder = y % 6 === 0;
        if (deck || r <= 2 || edge || brace || girder) plot(x, y, dx > 0 && !deck ? lo : hi);
      }
    }
    for (const [a, b, half] of [TOWER.mainDeck, TOWER.topDeck]) {
      for (let x = TOWER.cx - half + 1; x < TOWER.cx + half; x += 2) plot(x, a + 1, C.rail);
      box(TOWER.cx - half, b - 1, half * 2 + 1, 1, C.redDark);
    }

    poly(skylinePolygon(SKYLINE.near), (x, y) => (y > 138 && (x + y) % 2 === 0 ? C.nearDark : C.near));
    SKYLINE.near.lights.forEach((l, i) => {
      if (!isLit(i + 1000, s.lit)) return;
      plot(l.x, l.y, l.warm ? C.lamp : C.sun); plot(l.x + 1, l.y, l.warm ? C.lamp : C.sun);
    });
    box(0, RAIL.top, W, 1, C.rail); box(0, RAIL.low, W, 1, C.nearDark);
    for (const x of RAIL.posts) box(x, RAIL.top, 1, RAIL.wall - RAIL.top, C.rail);
    box(0, RAIL.wall, W, RAIL.floor - RAIL.wall, C.nearDark);
    box(0, RAIL.wall, W, 1, C.rail);

    for (let y = RAIL.floor; y < H; y++) for (let x = 0; x < W; x++) {
      const glow = 1 - Math.min(1, Math.abs(x - SUN.x) / 150) - (y - RAIL.floor) / 90;
      plot(x, y, glow * 0.8 > dither(x, y) ? C.floor : C.floorDark);
    }
    for (const y of [152, 160, 171]) box(0, y, W, 1, C.floorShadow);

    const dappled = (x, y) => ((x + y) % 2 === 0 ? C.floorShadow : C.floorDark);
    const dc = s.caseX - SUITCASE.body[0];
    poly(SHADOW, dappled);
    poly(CASE_SHADOW.map(([x, y]) => [x + dc, y]), dappled);
    if (s.action === 'walk') box(s.x + 8, s.y + 26, 18, 2, dappled(s.x, s.y));

    for (const [x, y, w, h] of BENCH.legs) box(x, y, w, h, C.branch);
    box(...BENCH.brace, C.woodDark);

    const c = SUITCASE;
    box(c.handle[0] + dc, c.handle[1], c.handle[2], 1, C.branch);
    box(c.handle[0] + dc, c.handle[1], 1, c.handle[3], C.branch);
    box(c.handle[0] + c.handle[2] - 1 + dc, c.handle[1], 1, c.handle[3], C.branch);
    box(c.body[0] + dc, c.body[1], c.body[2], c.body[3], C.caseBody);
    box(c.body[0] + c.body[2] - 3 + dc, c.body[1], 3, c.body[3], C.caseDark);
    box(c.body[0] + dc, c.body[1] + c.body[3] - 1, c.body[2], 1, C.branch);
    for (const [x, y, w, h] of c.straps) box(x + dc, y, w, h, C.whiteDark);

    box(BENCH.x, BENCH.top, BENCH.w, BENCH.h - 1, C.wood);
    box(BENCH.x, BENCH.top + BENCH.h - 1, BENCH.w, 1, C.woodDark);
    for (let x = BENCH.x + 6; x < BENCH.x + BENCH.w; x += 9) plot(x, BENCH.top + 2, C.woodDark);

    drawCharacter(ctx, {x: s.x, y: s.y, scale: 1, facing: 'left', expression: 'neutral', action: s.action, frame: s.frame});

    TICKETS.forEach((t, i) => {
      const xs = t.map(q => q[0]), top = Math.max(t[0][1], t[1][1]);
      box(Math.min(...xs), top, Math.max(...xs) - Math.min(...xs), 143 - top, C.white);
      const stub = i === 0 ? t[0][0] + 2 : t[1][0] - 3;
      box(stub, Math.ceil(Math.max(t[0][1], t[1][1])), 2, 4, C.red);
    });

    for (const pts of BRANCH) for (let i = 1; i < pts.length; i++) line(pts[i - 1], pts[i], C.branch);
    LEAVES.forEach(([x, y], i) => poly(leafShape(x, y, i % 2 ? 1 : -1), i % 3 === 0 ? C.leafDark : C.leaf));

    out.drawImage(native, 0, 0, canvas.width, canvas.height);
  }
  return {canvas, native, render};
}
