/* global p5, brush */
import {isLit} from './clip.js';
import {W, H, U, rng, COLORS as C, TOWER, towerHalf, towerArch, SKYLINE, skylinePolygon, SUN, STARS, RAIL, BENCH, CLAWD,
  clawdParts, TICKETS, SUITCASE, SHADOW, CASE_SHADOW, BRANCH, LEAVES, leafShape} from './scene.js';

const PX = W * U, PY = H * U;
const PAPER = '#f6efdf';
let r = rng(7741);
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// 把多边形扫描成一组平行线段，线段就是一笔一笔的蜡笔排线。
function hatchSpans(points, angle, gap) {
  const a = angle * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
  const rot = points.map(([x, y]) => [x * cos + y * sin, -x * sin + y * cos]);
  const vs = rot.map(p => p[1]), spans = [];
  for (let v = Math.min(...vs) + gap * 0.4; v < Math.max(...vs); v += gap * (0.8 + r() * 0.4)) {
    const hits = [];
    rot.forEach(([x0, y0], i) => {
      const [x1, y1] = rot[(i + 1) % rot.length];
      if ((y0 <= v) !== (y1 <= v)) hits.push(x0 + (v - y0) * (x1 - x0) / (y1 - y0));
    });
    hits.sort((p, q) => p - q);
    for (let k = 0; k + 1 < hits.length; k += 2) {
      spans.push([[hits[k], v], [hits[k + 1], v]].map(([u, w]) => [u * cos - w * sin, u * sin + w * cos]));
    }
  }
  return spans;
}

// 蜡笔不能盖住底色，所以先给后画的物体留出纸白：reserved(x, y) 为真的位置不下笔。
function splitAround(span, reserved) {
  const [[x0, y0], [x1, y1]] = span, len = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(len / 8), out = [];
  let start = null;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, free = !reserved(x / U, y / U);
    if (free && !start) start = [x, y];
    if (start && (!free || i === n)) { out.push([start, [x, y]]); start = null; }
  }
  return out;
}

function scribble(points, color, {angle = 20, gap = 9, weight = 1, over = 3, alpha = 1, wob = 3, reserved = null, passes = 2} = {}) {
  for (let pass = 1; pass < passes; pass++) scribble(points, color, {angle: angle + 7 * pass, gap, weight, over, alpha, wob, reserved, passes: 1});
  const px = points.map(([x, y]) => [x * U, y * U]);
  brush.set('wax', color, weight);
  let spans = hatchSpans(px, angle + (r() - 0.5) * 3, gap);
  if (reserved) spans = spans.flatMap(s => splitAround(s, reserved));
  for (const [[x0, y0], [x1, y1]] of spans) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 2) continue;
    const ox = (x1 - x0) / len * (r() - 0.3) * over, oy = (y1 - y0) / len * (r() - 0.3) * over;
    const mx = (x0 + x1) / 2 + (r() - 0.5) * wob, my = (y0 + y1) / 2 + (r() - 0.5) * wob;
    if (len < 40) brush.line(x0 - ox, y0 - oy, x1 + ox, y1 + oy);
    else brush.spline([[x0 - ox, y0 - oy, 0.75 * alpha], [mx, my, alpha], [x1 + ox, y1 + oy, 0.8 * alpha]], 0.5);
  }
}

function outline(points, color, weight = 0.5, closed = true) {
  brush.set('wax', color, weight);
  const pts = closed ? [...points, points[0]] : points;
  for (let i = 1; i < pts.length; i++) {
    const j = 1.6;
    brush.line(pts[i - 1][0] * U + (r() - 0.5) * j, pts[i - 1][1] * U + (r() - 0.5) * j, pts[i][0] * U + (r() - 0.5) * j, pts[i][1] * U + (r() - 0.5) * j);
  }
}

const inTower = (x, y) => y >= TOWER.top - 1 && y <= TOWER.base && Math.abs(x - TOWER.cx) <= towerHalf(y) + 1.2 && Math.abs(x - TOWER.cx) >= towerArch(y) - 0.5;
const inSun = (x, y) => Math.hypot(x - SUN.x, y - SUN.y) <= SUN.r + 0.5;
const inBox = (x, y, [bx, by, bw, bh], m = 1) => x >= bx - m && x <= bx + bw + m && y >= by - m && y <= by + bh + m;
const inFront = (x, y) => inBox(x, y, [BENCH.x, BENCH.top, BENCH.w, BENCH.h]) || inBox(x, y, [177, 137, 25, 6]);
const inBench = (x, y) => inBox(x, y, [BENCH.x, BENCH.top, BENCH.w, BENCH.h]) || BENCH.legs.some(l => inBox(x, y, l)) || inBox(x, y, BENCH.brace);

// 一笔一笔地铺大面积，长度、角度、粗细都随机，避免规则条纹。
function freehand(top, bottom, count, colorAt, reserved) {
  for (let i = 0; i < count; i++) {
    const x = r() * (PX + 300) - 150, y = (top + r() * (bottom - top)) * U;
    const len = 150 + r() * 420, a = (-6 + r() * 7) * Math.PI / 180;
    const span = [[x, y], [x + Math.cos(a) * len, y + Math.sin(a) * len]];
    brush.set('wax', colorAt(y / U), 2.4 + r() * 2.2);
    for (const [[x0, y0], [x1, y1]] of splitAround(span, reserved)) {
      if (Math.hypot(x1 - x0, y1 - y0) < 8) continue;
      brush.spline([[x0, y0, 0.7], [(x0 + x1) / 2 + (r() - 0.5) * 8, (y0 + y1) / 2 + (r() - 0.5) * 10, 1], [x1, y1, 0.75]], 0.5);
    }
  }
}

function paintBackground() {
  const SKY = ['#c9dcdd', '#deeae0', '#f8f2d8', '#fef4d2', '#fee5bf', '#fbd0a6'];
  freehand(0, 147, 1250, y => SKY[Math.round(Math.min(1, Math.max(0, y / 122 + (r() - 0.5) * 0.14)) * (SKY.length - 1))],
    (x, y) => inTower(x, y) || inSun(x, y));

  const sun = Array.from({length: 28}, (_, i) => [SUN.x + Math.cos(i / 28 * 6.283) * SUN.r, SUN.y + Math.sin(i / 28 * 6.283) * SUN.r]);
  scribble(sun, '#f9dc82', {angle: 30, gap: 4.5, weight: 1.6, over: 1});
  scribble(sun, C.sun, {angle: -40, gap: 8, weight: 1.2, over: 1});

  scribble(skylinePolygon(SKYLINE.far), '#e0d3b8', {angle: 88, gap: 6, weight: 1.6, over: 2, reserved: inTower});
  scribble(skylinePolygon(SKYLINE.mid), '#c1cdc5', {angle: 80, gap: 5, weight: 1.7, over: 2, reserved: inTower});
  scribble(skylinePolygon(SKYLINE.mid), '#a9b9b3', {angle: 62, gap: 18, weight: 1.1, over: 2, reserved: inTower});
  outline(skylinePolygon(SKYLINE.mid).slice(1, -1), '#90a29f', 0.8, false);

  // 铁塔分色涂满再压桁架。
  for (const [a, b, key] of TOWER.bands) {
    const rows = [];
    for (let y = a; y <= b; y++) rows.push(y);
    if (a >= 117) {
      const lo = rows.map(y => [TOWER.cx - towerHalf(y), y]), inL = rows.slice().reverse().map(y => [TOWER.cx - Math.max(towerArch(y), 0.1), y]);
      const inR = rows.map(y => [TOWER.cx + Math.max(towerArch(y), 0.1), y]), ro = rows.slice().reverse().map(y => [TOWER.cx + towerHalf(y), y]);
      for (const leg of [[...lo, ...inL], [...inR, ...ro]]) {
        scribble(leg, '#e26f4d', {angle: 70, gap: 2.6, weight: 1.1, over: 1, wob: 1});
      }
      continue;
    }
    const band = [...rows.map(y => [TOWER.cx - towerHalf(y), y]), ...rows.slice().reverse().map(y => [TOWER.cx + towerHalf(y), y])];
    scribble(band, key === 'red' ? '#e26f4d' : C.white, {angle: 72, gap: key === 'red' ? 2.6 : 5, weight: 1, over: 1, wob: 1});
    if (key === 'white') scribble(band, '#c9b99d', {angle: -50, gap: 11, weight: 0.8, over: 1, wob: 1});
  }
  for (let y = 58; y < TOWER.base - 6; y += 6) {
    if (y >= TOWER.mainDeck[0] && y < TOWER.mainDeck[1]) continue;
    const h1 = towerHalf(y), h2 = towerHalf(y + 6), red = TOWER.bands.find(([a, b]) => y >= a && y < b)?.[2] === 'red';
    brush.set('wax', red ? '#7f2d1f' : '#8f8169', 0.9);
    brush.line((TOWER.cx - h1) * U, y * U, (TOWER.cx + h2) * U, (y + 6) * U);
    brush.line((TOWER.cx + h1) * U, y * U, (TOWER.cx - h2) * U, (y + 6) * U);
  }
  const edgeL = [], edgeR = [];
  for (let y = TOWER.top; y <= 128; y += 2) { edgeL.push([TOWER.cx - towerHalf(y), y]); edgeR.push([TOWER.cx + towerHalf(y), y]); }
  outline(edgeL, '#7f2d1f', 1.6, false);
  outline(edgeR, '#7f2d1f', 1.6, false);
  for (const [a, b, half] of [TOWER.mainDeck, TOWER.topDeck]) {
    outline(rect(TOWER.cx - half, a, half * 2, b - a), '#6d4a3c', 1.6);
    brush.set('wax', C.rail, 1);
    for (let x = TOWER.cx - half + 1; x < TOWER.cx + half - 0.5; x += 2) brush.line(x * U, (a + 1) * U, x * U + 3, (a + 2) * U);
  }

  scribble(skylinePolygon(SKYLINE.near), '#a4b7ba', {angle: 76, gap: 4, weight: 2, over: 2, reserved: inFront});
  scribble(skylinePolygon(SKYLINE.near), '#8ca2a8', {angle: 52, gap: 12, weight: 1.4, over: 2, reserved: inFront});
  outline(skylinePolygon(SKYLINE.near).slice(1, -1), C.rail, 1.1, false);

  brush.set('wax', C.rail, 1.9);
  brush.spline([[-20, RAIL.top * U + 2], [PX / 2, RAIL.top * U - 3], [PX + 20, RAIL.top * U + 2]], 0.3);
  brush.set('wax', C.nearDark, 1.3);
  brush.spline([[-20, RAIL.low * U], [PX / 2, RAIL.low * U + 3], [PX + 20, RAIL.low * U - 1]], 0.3);
  for (const x of RAIL.posts) {
    brush.set('wax', C.rail, 1.5);
    brush.line(x * U, RAIL.top * U, x * U + (r() - 0.5) * 3, RAIL.wall * U);
  }
  scribble(rect(-4, RAIL.wall, W + 8, RAIL.floor - RAIL.wall), '#88a0a6', {angle: 8, gap: 4, weight: 1.5, over: 6, reserved: inFront});

  freehand(RAIL.floor + 1, H + 2, 520, () => (r() < 0.72 ? '#ecdab2' : '#dcc698'), (x, y) => y < RAIL.floor || inBench(x, y));
  scribble(SHADOW, '#b5a58a', {angle: 32, gap: 5, weight: 1.7, over: 2});

  for (const leg of BENCH.legs) {
    scribble(rect(...leg), C.branch, {angle: 84, gap: 2.2, weight: 1.1, over: 1, wob: 1});
  }
  scribble(rect(...BENCH.brace), C.woodDark, {angle: 2, gap: 2.5, weight: 1, over: 2, wob: 1});

  scribble(rect(BENCH.x, BENCH.top, BENCH.w, BENCH.h), '#cda172', {angle: 3, gap: 3, weight: 1.5, over: 5, wob: 2});
  scribble(rect(BENCH.x, BENCH.top + 3, BENCH.w, 2), '#a87d57', {angle: 1, gap: 2.5, weight: 1, over: 3, wob: 1});
  outline(rect(BENCH.x, BENCH.top, BENCH.w, BENCH.h), '#5c3f2e', 1.6);

  TICKETS.forEach((t, i) => {
    scribble(t, C.white, {angle: 10, gap: 2.4, weight: 1, over: 1, wob: 1});
    const stub = i === 0 ? t[0][0] + 2 : t[1][0] - 3;
    scribble(rect(stub, Math.max(t[0][1], t[1][1]) + 0.3, 2, 4), C.red, {angle: 85, gap: 2, weight: 1, over: 0.5, wob: 1});
    outline(t, '#6d4a3c', 1.3);
  });

  for (const pts of BRANCH) outline(pts, C.branch, 2.2, false);
  LEAVES.forEach(([x, y], i) => {
    const s = leafShape(x, y, i % 2 ? 1 : -1).map(([a, b]) => [x + (a - x) * 1.25, y + (b - y) * 1.25]);
    scribble(s, i % 3 === 0 ? '#dcaa41' : '#efc962', {angle: 40 + i * 13, gap: 2.2, weight: 1.1, over: 1, wob: 1});
  });
}

// 灯和光点集中画在白底上，逐帧按区域取用。
const crayonLights = [
  ...SKYLINE.mid.lights.map((l, i) => ({...l, order: i, w: 6, h: 4})),
  ...SKYLINE.near.lights.map((l, i) => ({...l, order: i + 1000, w: 10, h: 7})),
].filter(l => l.y < RAIL.wall - 1 && !inFront(l.x, l.y));

function paintEffects() {
  for (const [x, y, size] of STARS) {
    const a = (1.5 + size * 1.4) * U;
    brush.set('wax', '#dd9226', 0.9 + size * 0.3);
    brush.line(x * U - a, y * U, x * U + a, y * U);
    brush.line(x * U, y * U - a, x * U, y * U + a);
  }
  for (const l of crayonLights) {
    brush.set('wax', l.w > 6 ? '#e8a020' : '#eab93f', 1.3);
    for (let y = 1; y < l.h; y += 2) brush.line(l.x * U, l.y * U + y, l.x * U + l.w, l.y * U + y);
  }
}

function paintSuitcase() {
  const c = SUITCASE;
  scribble(CASE_SHADOW, '#b5a58a', {angle: 32, gap: 5, weight: 1.7, over: 2});
  outline([[c.handle[0], c.body[1]], [c.handle[0], c.handle[1]], [c.handle[0] + c.handle[2], c.handle[1]], [c.handle[0] + c.handle[2], c.body[1]]], C.branch, 1.6, false);
  scribble(rect(...c.body), '#8fafa5', {angle: 75, gap: 3, weight: 1.6, over: 1, wob: 2});
  scribble(rect(c.body[0] + c.body[2] - 4, c.body[1], 4, c.body[3]), '#6f9087', {angle: 70, gap: 2.8, weight: 1.1, over: 1, wob: 1});
  for (const s of c.straps) { brush.set('wax', C.white, 0.9); brush.line(s[0] * U + 3, s[1] * U, s[0] * U + 3, (s[1] + s[3]) * U); }
  outline(rect(...c.body), '#3f5650', 1.5);
}

function paintClawd(p, walking) {
  if (walking) {
    scribble(rect(CLAWD.x + 7, CLAWD.y + 26, 18, 2), '#b5a58a', {angle: 4, gap: 3, weight: 1.2, over: 1, wob: 1});
  }
  for (const leg of p.legs) scribble(rect(...leg), '#a84f3c', {angle: 88, gap: 2.2, weight: 1, over: 1, wob: 1});
  scribble(rect(...p.armBack), '#a84f3c', {angle: 10, gap: 2.4, weight: 1, over: 1, wob: 1});
  scribble(rect(...p.body), '#e58a68', {angle: 58, gap: 2.8, weight: 1.8, over: 1, wob: 2});
  scribble(rect(...p.body), '#d97c5a', {angle: -38, gap: 7, weight: 1.2, over: 1, wob: 2});
  scribble(rect(p.body[0], p.body[1] + 2, 3, p.body[3] - 2), '#a84f3c', {angle: 80, gap: 2.4, weight: 1, over: 1, wob: 1});
  scribble(rect(p.body[0] + 2, p.body[1], p.body[2] - 3, 1.5), '#f0a57f', {angle: 2, gap: 2.4, weight: 1, over: 1, wob: 1});
  outline(rect(...p.body), '#713f32', 2);
  scribble(rect(...p.arm), '#ed9b75', {angle: 10, gap: 2.2, weight: 1, over: 1, wob: 1});
  outline(rect(...p.arm), '#713f32', 1.6);
  scribble(rect(...p.eye), '#352e2a', {angle: 85, gap: 1.6, weight: 0.9, over: 0.5, wob: 0.5});
}

const POSES = [['idle', 0], ['walk', 0], ['walk', 1], ['walk', 2], ['walk', 3], ['jump', 1], ['jump', 2], ['jump', 3]];
const BACKGROUND_VARIANTS = 3, SPRITE_VARIANTS = 2;

// 笔触抖动：背景各版本共用同一组笔画，只换颗粒和 1 像素偏移，避免整片天空闪烁。
export function createCrayon(done) {
  let job = null;
  const instance = new p5(p => {
    brush.instance(p);
    p.setup = () => {
      const cnv = p.createCanvas(PX, PY, p.WEBGL);
      p.pixelDensity(1); p.noiseSeed(7741); p.angleMode(p.DEGREES);
      // 以内置 crayon 为基础，加厚蜡层、收紧颗粒，让单笔能看清走向。
      brush.add('wax', {type: 'default', weight: 0.62, scatter: 1.15, sharpness: 0.75, grain: 1.5, opacity: 190, spacing: 0.06, pressure: [1.1, 0.9], rotate: 'natural', noise: true});
      p.noLoop();
      cnv.elt.style.display = 'none';
      instance.source = cnv.elt;
    };
    p.draw = () => {
      if (!job) return;
      const current = job;
      job = null;
      p.randomSeed(current.seed);
      r = rng(current.strokes);
      p.background(current.paper); p.translate(-PX / 2 + current.dx, -PY / 2 + current.dy);
      brush.noField(); brush.noFill(); brush.noHatch();
      current.paint();
      requestAnimationFrame(() => {
        const copy = document.createElement('canvas');
        copy.width = PX; copy.height = PY;
        copy.getContext('2d').drawImage(instance.source, 0, 0, PX, PY);
        current.resolve(copy);
      });
    };
  });
  const capture = (paint, {paper = '#ffffff', seed, strokes = seed, dx = 0, dy = 0}) => new Promise(resolve => {
    job = {paint, paper, seed, strokes, dx, dy, resolve};
    instance.redraw();
  });

  async function build() {
    while (!instance.source) await new Promise(ok => setTimeout(ok, 20));
    const backgrounds = [];
    for (let i = 0; i < BACKGROUND_VARIANTS; i++) {
      backgrounds.push(await capture(paintBackground, {paper: PAPER, seed: 7741 + i, strokes: 7741, dx: i === 1 ? 1 : 0, dy: i === 2 ? 1 : 0}));
    }
    const effects = await capture(paintEffects, {seed: 501});
    const suitcases = [], sprites = new Map();
    for (let v = 0; v < SPRITE_VARIANTS; v++) {
      suitcases.push(await capture(paintSuitcase, {seed: 601 + v}));
      for (const [action, frame] of POSES) {
        const p = clawdParts(CLAWD.x, CLAWD.y, action, frame);
        sprites.set(`${action}:${frame}:${v}`, {canvas: await capture(() => paintClawd(p, action === 'walk'), {seed: 701 + v * 31 + frame}), parts: p});
      }
    }

    const tex = document.createElement('canvas');
    tex.width = 512; tex.height = 512;
    const t = tex.getContext('2d'), im = t.createImageData(512, 512);
    const grain = rng(911);
    for (let i = 0; i < im.data.length; i += 4) {
      const light = grain() > 0.72, v = light ? 255 : 70;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = grain() * (light ? 30 : 24);
    }
    t.putImageData(im, 0, 0);

    const canvas = document.createElement('canvas');
    canvas.width = PX; canvas.height = PY;
    document.body.append(canvas);
    const ctx = canvas.getContext('2d');
    const knock = (x, y, w, h, m = 4) => { ctx.fillStyle = PAPER; ctx.fillRect(x * U - m, y * U - m, w * U + m * 2, h * U + m * 2); };
    const pigment = source => { ctx.globalCompositeOperation = 'multiply'; source(); ctx.globalCompositeOperation = 'source-over'; };

    function render(s, tick = 0) {
      const boil = tick ?? 0, variant = boil % SPRITE_VARIANTS;
      ctx.drawImage(backgrounds[Math.floor(boil / 2) % BACKGROUND_VARIANTS], 0, 0);

      pigment(() => STARS.slice(0, s.stars).forEach(([x, y, size]) => {
        const a = (2 + size * 1.4) * U + 4;
        ctx.drawImage(effects, x * U - a, y * U - a, a * 2, a * 2, x * U - a, y * U - a, a * 2, a * 2);
      }));
      for (const l of crayonLights) {
        if (!isLit(l.order, s.lit)) continue;
        ctx.fillStyle = PAPER; ctx.fillRect(l.x * U, l.y * U, l.w, l.h);
        pigment(() => ctx.drawImage(effects, l.x * U - 3, l.y * U - 4, l.w + 7, l.h + 7, l.x * U - 3, l.y * U - 4, l.w + 7, l.h + 7));
      }

      const dc = s.caseX - SUITCASE.body[0];
      knock(SUITCASE.body[0] + dc, SUITCASE.body[1], SUITCASE.body[2], SUITCASE.body[3]);
      pigment(() => ctx.drawImage(suitcases[variant], dc * U, 0));

      const sprite = sprites.get(`${s.action}:${s.frame}:${variant}`);
      const ox = s.x - CLAWD.x, oy = s.y - CLAWD.y, parts = sprite.parts;
      for (const box of [parts.body, parts.arm, parts.armBack, ...parts.legs]) knock(box[0] + ox, box[1] + oy, box[2], box[3], 3);
      pigment(() => ctx.drawImage(sprite.canvas, ox * U, oy * U));

      ctx.fillStyle = ctx.createPattern(tex, 'repeat'); ctx.fillRect(0, 0, PX, PY);
    }
    return {canvas, render, brushes: brush.box()};
  }
  build().then(done);
}
