/* global p5, brush */
import {W, H, U, rng, COLORS as C, TOWER, towerHalf, towerArch, SKYLINE, skylinePolygon, SUN, STARS, RAIL, BENCH,
  CLAWD_PARTS, TICKETS, SUITCASE, SHADOW, CASE_SHADOW, BRANCH, LEAVES, leafShape} from './scene.js';

const PX = W * U, PY = H * U;
const r = rng(7741);
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

function outline(points, color, weight = 0.5, name = 'wax', closed = true) {
  brush.set(name, color, weight);
  const pts = closed ? [...points, points[0]] : points;
  for (let i = 1; i < pts.length; i++) {
    const j = 1.6;
    brush.line(pts[i - 1][0] * U + (r() - 0.5) * j, pts[i - 1][1] * U + (r() - 0.5) * j, pts[i][0] * U + (r() - 0.5) * j, pts[i][1] * U + (r() - 0.5) * j);
  }
}

const inTower = (x, y) => y >= TOWER.top - 1 && y <= TOWER.base && Math.abs(x - TOWER.cx) <= towerHalf(y) + 1.2 && Math.abs(x - TOWER.cx) >= towerArch(y) - 0.5;
const inSun = (x, y) => Math.hypot(x - SUN.x, y - SUN.y) <= SUN.r + 0.5;
const inBox = (x, y, [bx, by, bw, bh], m = 1) => x >= bx - m && x <= bx + bw + m && y >= by - m && y <= by + bh + m;
const inFront = (x, y) => inBox(x, y, CLAWD_PARTS.body) || inBox(x, y, CLAWD_PARTS.arm) || inBox(x, y, CLAWD_PARTS.armBack)
  || inBox(x, y, [BENCH.x, BENCH.top, BENCH.w, BENCH.h]) || inBox(x, y, [177, 137, 25, 6]);
const inFloorThings = (x, y) => inBox(x, y, [BENCH.x, BENCH.top, BENCH.w, BENCH.h]) || BENCH.legs.some(l => inBox(x, y, l)) || inBox(x, y, BENCH.brace)
  || inBox(x, y, SUITCASE.body) || CLAWD_PARTS.legs.some(l => inBox(x, y, l));

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

function paint() {
  // 天空：长短不一的手涂短排线，颜色随高度渐变，笔与笔之间露出纸面。
  const SKY = ['#c9dcdd', '#deeae0', '#f8f2d8', '#fef4d2', '#fee5bf', '#fbd0a6'];
  freehand(0, 147, 1250, y => SKY[Math.round(Math.min(1, Math.max(0, y / 122 + (r() - 0.5) * 0.14)) * (SKY.length - 1))],
    (x, y) => inTower(x, y) || inSun(x, y));

  const sun = Array.from({length: 28}, (_, i) => [SUN.x + Math.cos(i / 28 * 6.283) * SUN.r, SUN.y + Math.sin(i / 28 * 6.283) * SUN.r]);
  scribble(sun, '#f9dc82', {angle: 30, gap: 4.5, weight: 1.6, over: 1});
  scribble(sun, C.sun, {angle: -40, gap: 8, weight: 1.2, over: 1});

  for (const [x, y, size] of STARS) {
    const a = (1.5 + size * 1.4) * U;
    brush.set('wax', '#dd9226', 0.9 + size * 0.3);
    brush.line(x * U - a, y * U, x * U + a, y * U);
    brush.line(x * U, y * U - a, x * U, y * U + a);
  }

  scribble(skylinePolygon(SKYLINE.far), '#e0d3b8', {angle: 88, gap: 6, weight: 1.6, over: 2, reserved: inTower});
  scribble(skylinePolygon(SKYLINE.mid), '#c1cdc5', {angle: 80, gap: 5, weight: 1.7, over: 2, reserved: inTower});
  scribble(skylinePolygon(SKYLINE.mid), '#a9b9b3', {angle: 62, gap: 18, weight: 1.1, over: 2, reserved: inTower});
  outline(skylinePolygon(SKYLINE.mid).slice(1, -1), '#90a29f', 0.8, 'wax', false);
  for (const l of SKYLINE.mid.lights) {
    brush.set('wax', l.warm ? '#f3cf74' : C.far, 0.8);
    brush.line(l.x * U, l.y * U, l.x * U + 5, l.y * U + 1);
  }

  // 铁塔分色涂满再压桁架，塔身是全图唯一接近满涂的地方。
  for (const [a, b, key] of TOWER.bands) {
    const rows = [];
    for (let y = a; y <= b; y++) rows.push(y);
    const leftSide = rows.map(y => [TOWER.cx - towerHalf(y), y]);
    const rightSide = rows.slice().reverse().map(y => [TOWER.cx + towerHalf(y), y]);
    if (a >= 117) {
      const lo = rows.map(y => [TOWER.cx - towerHalf(y), y]), inL = rows.slice().reverse().map(y => [TOWER.cx - Math.max(towerArch(y), 0.1), y]);
      const inR = rows.map(y => [TOWER.cx + Math.max(towerArch(y), 0.1), y]), ro = rows.slice().reverse().map(y => [TOWER.cx + towerHalf(y), y]);
      for (const leg of [[...lo, ...inL], [...inR, ...ro]]) {
        scribble(leg, '#e26f4d', {angle: 70, gap: 2.6, weight: 1.1, over: 1, wob: 1});
      }
      continue;
    }
    const band = [...leftSide, ...rightSide];
    const color = key === 'red' ? C.red : C.white;
    scribble(band, key === 'red' ? '#e26f4d' : color, {angle: 72, gap: key === 'red' ? 2.6 : 5, weight: 1, over: 1, wob: 1});
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
  outline(edgeL, '#7f2d1f', 1.6, 'wax', false);
  outline(edgeR, '#7f2d1f', 1.6, 'wax', false);
  for (const [a, b, half] of [TOWER.mainDeck, TOWER.topDeck]) {
    outline(rect(TOWER.cx - half, a, half * 2, b - a), '#6d4a3c', 1.6);
    brush.set('wax', C.rail, 1);
    for (let x = TOWER.cx - half + 1; x < TOWER.cx + half - 0.5; x += 2) brush.line(x * U, (a + 1) * U, x * U + 3, (a + 2) * U);
  }

  scribble(skylinePolygon(SKYLINE.near), '#a4b7ba', {angle: 76, gap: 4, weight: 2, over: 2, reserved: inFront});
  scribble(skylinePolygon(SKYLINE.near), '#8ca2a8', {angle: 52, gap: 12, weight: 1.4, over: 2, reserved: inFront});
  outline(skylinePolygon(SKYLINE.near).slice(1, -1), C.rail, 1.1, 'wax', false);
  for (const l of SKYLINE.near.lights) {
    brush.set('wax', '#f1b73f', 1.2);
    brush.line(l.x * U, l.y * U, l.x * U + 9, l.y * U + 1);
    brush.line(l.x * U + 1, l.y * U + 4, l.x * U + 8, l.y * U + 4);
  }

  brush.set('wax', C.rail, 1.9);
  brush.spline([[-20, RAIL.top * U + 2], [PX / 2, RAIL.top * U - 3], [PX + 20, RAIL.top * U + 2]], 0.3);
  brush.set('wax', C.nearDark, 1.3);
  brush.spline([[-20, RAIL.low * U], [PX / 2, RAIL.low * U + 3], [PX + 20, RAIL.low * U - 1]], 0.3);
  for (const x of RAIL.posts) {
    brush.set('wax', C.rail, 1.5);
    brush.line(x * U, RAIL.top * U, x * U + (r() - 0.5) * 3, RAIL.wall * U);
  }
  scribble(rect(-4, RAIL.wall, W + 8, RAIL.floor - RAIL.wall), '#88a0a6', {angle: 8, gap: 4, weight: 1.5, over: 6, reserved: inFront});

  freehand(RAIL.floor + 1, H + 2, 520, () => (r() < 0.72 ? '#ecdab2' : '#dcc698'), (x, y) => y < RAIL.floor || inFloorThings(x, y));
  for (const shade of [SHADOW, CASE_SHADOW]) scribble(shade, '#b5a58a', {angle: 32, gap: 5, weight: 1.7, over: 2});

  for (const leg of BENCH.legs) {
    scribble(rect(...leg), C.branch, {angle: 84, gap: 2.2, weight: 1.1, over: 1, wob: 1});
  }
  scribble(rect(...BENCH.brace), C.woodDark, {angle: 2, gap: 2.5, weight: 1, over: 2, wob: 1});

  const c = SUITCASE;
  outline([[c.handle[0], c.body[1]], [c.handle[0], c.handle[1]], [c.handle[0] + c.handle[2], c.handle[1]], [c.handle[0] + c.handle[2], c.body[1]]], C.branch, 1.6, 'wax', false);
  scribble(rect(...c.body), '#8fafa5', {angle: 75, gap: 3, weight: 1.6, over: 1, wob: 2});
  scribble(rect(c.body[0] + c.body[2] - 4, c.body[1], 4, c.body[3]), '#6f9087', {angle: 70, gap: 2.8, weight: 1.1, over: 1, wob: 1});
  for (const s of c.straps) { brush.set('wax', C.white, 0.9); brush.line(s[0] * U + 3, s[1] * U, s[0] * U + 3, (s[1] + s[3]) * U); }
  outline(rect(...c.body), '#3f5650', 1.5);

  // 主角按 32 格比例重画，涂得最满最深，是画面视线的落点。
  const p = CLAWD_PARTS;
  for (const leg of p.legs) scribble(rect(...leg), '#a84f3c', {angle: 88, gap: 2.2, weight: 1, over: 1, wob: 1});

  scribble(rect(BENCH.x, BENCH.top, BENCH.w, BENCH.h), '#cda172', {angle: 3, gap: 3, weight: 1.5, over: 5, wob: 2});
  scribble(rect(BENCH.x, BENCH.top + 3, BENCH.w, 2), '#a87d57', {angle: 1, gap: 2.5, weight: 1, over: 3, wob: 1});
  outline(rect(BENCH.x, BENCH.top, BENCH.w, BENCH.h), '#5c3f2e', 1.6);
  for (const leg of p.legs) scribble(rect(leg[0], leg[1] + 1, leg[2], 5), '#a84f3c', {angle: 88, gap: 2.2, weight: 1, over: 1, wob: 1});

  scribble(rect(...p.armBack), '#a84f3c', {angle: 10, gap: 2.4, weight: 1, over: 1, wob: 1});
  scribble(rect(...p.body), '#e58a68', {angle: 58, gap: 2.8, weight: 1.8, over: 1, wob: 2});
  scribble(rect(...p.body), '#d97c5a', {angle: -38, gap: 7, weight: 1.2, over: 1, wob: 2});
  scribble(rect(p.body[0], p.body[1] + 2, 3, p.body[3] - 2), '#a84f3c', {angle: 80, gap: 2.4, weight: 1, over: 1, wob: 1});
  scribble(rect(p.body[0] + 2, p.body[1], p.body[2] - 3, 1.5), '#f0a57f', {angle: 2, gap: 2.4, weight: 1, over: 1, wob: 1});
  outline(rect(...p.body), '#713f32', 2);
  scribble(rect(...p.arm), '#ed9b75', {angle: 10, gap: 2.2, weight: 1, over: 1, wob: 1});
  outline(rect(...p.arm), '#713f32', 1.6);
  scribble(rect(...p.eye), '#352e2a', {angle: 85, gap: 1.6, weight: 0.9, over: 0.5, wob: 0.5});

  TICKETS.forEach((t, i) => {
    scribble(t, C.white, {angle: 10, gap: 2.4, weight: 1, over: 1, wob: 1});
    const stub = i === 0 ? t[0][0] + 2 : t[1][0] - 3;
    scribble(rect(stub, Math.max(t[0][1], t[1][1]) + 0.3, 2, 4), C.red, {angle: 85, gap: 2, weight: 1, over: 0.5, wob: 1});
    outline(t, '#6d4a3c', 1.3);
  });

  for (const pts of BRANCH) outline(pts, C.branch, 2.2, 'wax', false);
  LEAVES.forEach(([x, y], i) => {
    const s = leafShape(x, y, i % 2 ? 1 : -1).map(([a, b]) => [x + (a - x) * 1.25, y + (b - y) * 1.25]);
    scribble(s, i % 3 === 0 ? '#dcaa41' : '#efc962', {angle: 40 + i * 13, gap: 2.2, weight: 1.1, over: 1, wob: 1});
  });
}

export function drawCrayon(done) {
  new p5(p => {
    brush.instance(p);
    p.setup = () => {
      const cnv = p.createCanvas(PX, PY, p.WEBGL);
      p.pixelDensity(1); p.randomSeed(7741); p.noiseSeed(7741); p.angleMode(p.DEGREES);
      // 以内置 crayon 为基础，加厚蜡层、收紧颗粒，让单笔能看清走向。
      brush.add('wax', {type: 'default', weight: 0.62, scatter: 1.15, sharpness: 0.75, grain: 1.5, opacity: 190, spacing: 0.06, pressure: [1.1, 0.9], rotate: 'natural', noise: true});
      p.noLoop();
      window.crayonSource = cnv.elt;
    };
    p.draw = () => {
      p.background('#f6efdf'); p.translate(-PX / 2, -PY / 2);
      brush.noField(); brush.noFill(); brush.noHatch();
      paint();
      requestAnimationFrame(() => {
        // 回到 2D 画布压上纸张纹理，纸面的纤维与颗粒透出每一笔。
        const out = document.createElement('canvas');
        out.width = PX; out.height = PY;
        const ctx = out.getContext('2d');
        ctx.drawImage(window.crayonSource, 0, 0, PX, PY);
        const tex = document.createElement('canvas');
        tex.width = 512; tex.height = 512;
        const t = tex.getContext('2d'), im = t.createImageData(512, 512);
        for (let i = 0; i < im.data.length; i += 4) {
          const light = r() > 0.72, v = light ? 255 : 70;
          im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = r() * (light ? 30 : 24);
        }
        t.putImageData(im, 0, 0);
        ctx.fillStyle = ctx.createPattern(tex, 'repeat'); ctx.fillRect(0, 0, PX, PY);
        window.crayonSource.style.display = 'none';
        document.body.append(out);
        done({canvas: out, brushes: brush.box()});
      });
    };
  });
}
