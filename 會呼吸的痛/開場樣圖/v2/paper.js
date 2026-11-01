import {W, H, U, rng, COLORS as C, TOWER, towerHalf, towerArch, SKYLINE, skylinePolygon, SUN, STARS, RAIL, BENCH,
  CLAWD_PARTS, TICKETS, SUITCASE, SHADOW, CASE_SHADOW, BRANCH, LEAVES, leafShape} from './scene.js';

const PX = W * U, PY = H * U;
const CORE = '#fbf5e6';
const r = rng(5170);
const scale = pts => pts.map(([x, y]) => [x * U, y * U]);
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

// 沿边重采样并加噪声：撕纸用多尺度起伏，剪纸只留微小手抖。
function roughen(pts, step, amp) {
  const out = [];
  let slow = r() * 6, fast = r() * 6;
  pts.forEach(([x, y], i) => {
    const [nx, ny] = pts[(i + 1) % pts.length], len = Math.hypot(nx - x, ny - y) || 1, n = Math.max(1, Math.ceil(len / step));
    for (let j = 0; j < n; j++) {
      slow += 0.22 + r() * 0.1; fast += 0.9 + r() * 0.6;
      const d = (Math.sin(slow) * 0.6 + Math.sin(fast) * 0.3 + (r() - 0.5) * 0.5) * amp, t = j / n;
      out.push([x + (nx - x) * t - (ny - y) / len * d, y + (ny - y) * t + (nx - x) / len * d]);
    }
  });
  return out;
}

function makeTexture(paint, w = PX, h = PY) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  return c;
}
const fibre = makeTexture((t, w, h) => {
  t.fillStyle = '#fff'; t.fillRect(0, 0, w, h);
  for (let i = 0; i < 9000; i++) {
    const x = r() * w, y = r() * h, a = r() * 6.3, l = 3 + r() * 14;
    t.strokeStyle = r() < 0.72 ? `rgba(90,70,45,${0.05 + r() * 0.12})` : 'rgba(255,255,255,.5)';
    t.lineWidth = 0.4 + r() * 0.7;
    t.beginPath(); t.moveTo(x, y); t.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); t.stroke();
  }
});
const kraft = makeTexture((t, w, h) => {
  t.fillStyle = '#c4a176'; t.fillRect(0, 0, w, h);
  for (let i = 0; i < 30000; i++) {
    const x = r() * w, y = r() * h, l = 4 + r() * 13, a = (r() - 0.5) * 1.6;
    t.strokeStyle = r() < 0.55 ? `rgba(95,66,36,${0.06 + r() * 0.16})` : `rgba(240,215,175,${0.08 + r() * 0.18})`;
    t.lineWidth = 0.4 + r() * 0.8;
    t.beginPath(); t.moveTo(x, y); t.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); t.stroke();
  }
});
// 旧报纸：只有灰色的假字条与半调方块，没有可读文字。
const news = makeTexture((t, w, h) => {
  t.fillStyle = '#eadfc8'; t.fillRect(0, 0, w, h);
  const cols = 5, cw = w / cols;
  for (let c = 0; c < cols; c++) {
    const x = c * cw + 10;
    for (let y = 8; y < h; y += 9) {
      if (c === 1 && y > 180 && y < 320) continue;
      let px = x;
      const end = x + cw - 20;
      while (px < end) {
        const len = 3 + r() * 13;
        t.fillStyle = `rgba(62,56,48,${0.42 + r() * 0.3})`;
        t.fillRect(px, y, Math.min(len, end - px), 3);
        px += len + 2.5;
      }
    }
  }
  t.fillStyle = 'rgba(62,56,48,.55)';
  for (let y = 184; y < 316; y += 5) for (let x = cw + 12; x < 2 * cw - 12; x += 5) {
    t.beginPath(); t.arc(x, y, 0.8 + 1.5 * Math.abs(Math.sin(x / 26 + y / 40)), 0, 7); t.fill();
  }
}, 900, 720);

export function drawPaper() {
  const canvas = document.createElement('canvas');
  canvas.width = PX; canvas.height = PY; document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const trace = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
  const overlay = (tex, mode = 'multiply') => {
    ctx.globalCompositeOperation = mode;
    ctx.fillStyle = ctx.createPattern(tex, 'repeat');
    ctx.fillRect(0, 0, PX, PY);
    ctx.globalCompositeOperation = 'source-over';
  };

  // 一张纸片：先画带投影的白色纸芯或白边，再把上色面叠上去并压纹理。
  function piece(points, {color, edge = 'cut', border = 7, lift = 1, tex = null, detail = null}) {
    const base = scale(points);
    const outer = edge === 'torn' ? roughen(base, 7, 7) : roughen(base, 34, 0.9);
    const inner = edge === 'torn' ? roughen(base, 7, 3.5) : outer;
    ctx.save();
    ctx.shadowColor = 'rgba(58,42,24,.42)'; ctx.shadowBlur = 7 + lift * 7; ctx.shadowOffsetX = 2 + lift * 2; ctx.shadowOffsetY = 3 + lift * 4;
    trace(outer);
    ctx.fillStyle = CORE; ctx.fill();
    if (edge === 'cut' && border) { ctx.strokeStyle = CORE; ctx.lineWidth = border; ctx.lineJoin = 'round'; ctx.stroke(); }
    ctx.restore();
    ctx.save();
    trace(inner); ctx.clip();
    if (tex) { ctx.fillStyle = ctx.createPattern(tex, 'repeat'); ctx.fillRect(0, 0, PX, PY); }
    if (color) {
      ctx.globalCompositeOperation = tex ? 'multiply' : 'source-over';
      ctx.fillStyle = color; ctx.fillRect(0, 0, PX, PY);
      ctx.globalCompositeOperation = 'source-over';
    }
    overlay(fibre);
    detail?.();
    ctx.restore();
  }
  const stripe = (pts, color, width, border = 4) => {
    const line = scale(pts);
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(58,42,24,.4)'; ctx.shadowBlur = 7; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 4;
    const path = () => { ctx.beginPath(); line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); };
    path(); ctx.strokeStyle = CORE; ctx.lineWidth = width + border; ctx.stroke();
    ctx.shadowColor = 'transparent';
    path(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
    ctx.restore();
  };

  // 牛皮纸底，四边露出，天空是三张撕开的色纸。
  ctx.fillStyle = ctx.createPattern(kraft, 'repeat'); ctx.fillRect(0, 0, PX, PY);
  piece([[3, 62], [317, 58], [316, 148], [4, 148]], {color: '#f3c99c', edge: 'torn', lift: 0.6});
  piece([[4, 30], [316, 27], [317, 72], [210, 80], [110, 72], [4, 78]], {color: '#f2e6c8', edge: 'torn', lift: 0.8});
  piece([[3, 3], [317, 4], [316, 34], [230, 41], [120, 33], [3, 42]], {color: '#b4c9ca', edge: 'torn', lift: 1});

  piece(Array.from({length: 40}, (_, i) => [SUN.x + Math.cos(i / 40 * 6.283) * SUN.r, SUN.y + Math.sin(i / 40 * 6.283) * SUN.r]), {color: '#f9dd8e', lift: 0.7});
  for (const [x, y, size] of STARS) {
    const a = 1.6 + size * 1.5, b = a * 0.3;
    piece([[x, y - a], [x + b, y - b], [x + a, y], [x + b, y + b], [x, y + a], [x - b, y + b], [x - a, y], [x - b, y - b]], {color: C.lamp, border: 4, lift: 0.3});
  }

  // 远景是撕开的旧报纸，中景是一栋栋微斜的色纸。
  piece(skylinePolygon(SKYLINE.far), {tex: news, color: '#efe2c9', edge: 'torn', lift: 0.8});
  const building = (b, color, lift, bottom = 147) => {
    const tilt = (r() - 0.5) * 0.9;
    piece([[b.x, b.top + tilt], [b.x + b.w, b.top - tilt], [b.x + b.w + tilt, bottom], [b.x, bottom]], {color, border: 3.5, lift});
  };
  SKYLINE.mid.buildings.forEach((b, i) => building(b, i % 2 ? C.mid : '#a9b6b0', 0.5));
  for (const l of SKYLINE.mid.lights) {
    ctx.fillStyle = l.warm ? C.sun : CORE; ctx.fillRect(l.x * U, l.y * U, 7, 8);
  }

  // 铁塔：外轮廓一刀剪下，再按高度分色，桁架用细线压在纸面上。
  const left = [], right = [];
  for (let y = TOWER.top; y <= TOWER.base; y++) { left.push([TOWER.cx - towerHalf(y), y]); right.unshift([TOWER.cx + towerHalf(y), y]); }
  const archPts = [];
  for (let y = TOWER.base; y >= 117; y--) archPts.push([TOWER.cx - towerArch(y), y]);
  for (let y = 117; y <= TOWER.base; y++) archPts.push([TOWER.cx + towerArch(y), y]);
  const towerOutline = [...left, ...archPts, ...right.slice(0)];
  piece(towerOutline, {color: C.white, border: 6, lift: 1.2, detail: () => {
    for (const [a, b, key] of TOWER.bands) {
      if (key !== 'red') continue;
      ctx.fillStyle = C.red; ctx.fillRect(0, a * U, PX, (b - a) * U);
    }
    ctx.lineCap = 'round';
    for (let y = 58; y < TOWER.base; y += 6) {
      if (y >= TOWER.mainDeck[0] && y < TOWER.mainDeck[1]) continue;
      const h1 = towerHalf(y), h2 = towerHalf(y + 6);
      const dark = TOWER.bands.find(([a, b]) => y >= a && y < b)?.[2] === 'red' ? C.redDark : '#b9ac94';
      ctx.strokeStyle = dark; ctx.lineWidth = 3;
      const seg = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1 * U, y1 * U); ctx.lineTo(x2 * U, y2 * U); ctx.stroke(); };
      seg(TOWER.cx - h1, y, TOWER.cx + h2, y + 6); seg(TOWER.cx + h1, y, TOWER.cx - h2, y + 6);
      seg(TOWER.cx - h1, y, TOWER.cx + h1, y);
    }
  }});
  for (const [a, b, half] of [TOWER.mainDeck, TOWER.topDeck]) {
    piece(rect(TOWER.cx - half, a, half * 2, b - a), {color: C.white, border: 4, lift: 0.7, detail: () => {
      ctx.fillStyle = C.rail;
      for (let x = TOWER.cx - half + 1; x < TOWER.cx + half - 0.5; x += 2) ctx.fillRect(x * U, (a + 1) * U, 5, 8);
      ctx.fillStyle = C.redDark; ctx.fillRect(0, (b - 1) * U, PX, U);
    }});
  }

  SKYLINE.near.buildings.forEach((b, i) => building(b, i % 3 === 0 ? C.nearDark : C.near, 0.7));
  for (const l of SKYLINE.near.lights) {
    ctx.save();
    ctx.shadowColor = 'rgba(40,40,30,.35)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
    ctx.fillStyle = l.warm ? C.lamp : C.sun; ctx.fillRect(l.x * U, l.y * U, 10, 8);
    ctx.restore();
  }

  stripe([[-2, RAIL.low], [W + 2, RAIL.low]], C.nearDark, 5, 3);
  for (const x of RAIL.posts) stripe([[x, RAIL.top], [x, RAIL.wall]], C.rail, 6, 3);
  stripe([[-2, RAIL.top], [W + 2, RAIL.top]], C.rail, 8, 3);
  piece([[-3, RAIL.wall], [W + 3, RAIL.wall], [W + 3, RAIL.floor + 3], [-3, RAIL.floor + 3]], {color: C.nearDark, edge: 'torn', lift: 0.9});

  // 地面用同一张牛皮纸的另一块，地缝是撕痕的阴影。
  piece([[-4, RAIL.floor], [W + 4, RAIL.floor], [W + 4, H + 4], [-4, H + 4]], {tex: kraft, color: '#efe0c4', edge: 'torn', lift: 1.2, detail: () => {
    ctx.strokeStyle = 'rgba(90,66,40,.2)'; ctx.lineWidth = 3;
    for (const y of [152, 160, 171]) { ctx.beginPath(); ctx.moveTo(0, y * U); ctx.lineTo(PX, y * U + (r() - 0.5) * 8); ctx.stroke(); }
  }});
  for (const shade of [SHADOW, CASE_SHADOW]) {
    trace(roughen(scale(shade), 14, 2)); ctx.fillStyle = 'rgba(84,62,42,.3)'; ctx.fill();
  }

  for (const [x, y, w, h] of BENCH.legs) piece(rect(x, y, w, h), {color: C.branch, border: 5, lift: 0.8});
  piece(rect(...BENCH.brace), {color: C.woodDark, border: 4, lift: 0.5});
  const c = SUITCASE;
  stripe([[c.handle[0], c.body[1]], [c.handle[0], c.handle[1]], [c.handle[0] + c.handle[2], c.handle[1]], [c.handle[0] + c.handle[2], c.body[1]]], C.branch, 6, 3);
  piece(rect(...c.body), {color: C.caseBody, lift: 1.1, detail: () => {
    ctx.fillStyle = C.caseDark; ctx.fillRect((c.body[0] + c.body[2] - 3) * U, 0, 3 * U, PY);
  }});
  for (const s of c.straps) piece(rect(...s), {color: C.whiteDark, border: 2, lift: 0.2});

  piece(rect(BENCH.x, BENCH.top, BENCH.w, BENCH.h), {color: C.wood, lift: 1.2, detail: () => {
    for (let i = 0; i < 26; i++) {
      const y = (BENCH.top + r() * BENCH.h) * U, x = (BENCH.x + r() * BENCH.w * 0.8) * U;
      ctx.strokeStyle = 'rgba(92,62,38,.4)'; ctx.lineWidth = 1 + r() * 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 40, y + 2, x + 80, y - 2, x + 90 + r() * 70, y + 1); ctx.stroke();
    }
  }});

  // 主角：与像素版同比例的一组纸片，侧身望向左侧。
  const p = CLAWD_PARTS;
  piece(rect(...p.armBack), {color: '#b85d47', border: 5, lift: 0.5});
  for (const leg of p.legs) piece(rect(...leg), {color: '#b85d47', border: 4, lift: 0.5});
  piece(rect(...p.body), {color: '#da7758', lift: 1.5, detail: () => {
    ctx.fillStyle = '#b85d47'; ctx.fillRect((p.body[0]) * U, 0, 2.2 * U, PY); // 背光面在远离太阳一侧
    ctx.fillStyle = '#ed9b75'; ctx.fillRect(p.body[0] * U, p.body[1] * U, p.body[2] * U, 1.3 * U);
  }});
  piece(rect(...p.arm), {color: '#ed9b75', border: 5, lift: 0.8});
  piece(rect(...p.eye), {color: '#352e2a', border: 3, lift: 0.2});

  TICKETS.forEach((t, i) => piece(t, {color: C.white, border: 4, lift: 0.8, detail: () => {
    const stub = i === 0 ? t[0][0] + 2 : t[1][0] - 3;
    ctx.fillStyle = C.red; ctx.fillRect(stub * U, 0, 2 * U, PY);
  }}));

  for (const pts of BRANCH) stripe(pts, C.branch, 7, 4);
  LEAVES.forEach(([x, y], i) => {
    const s = leafShape(x, y, i % 2 ? 1 : -1).map(([a, b]) => [x + (a - x) * 1.25, y + (b - y) * 1.25]);
    piece(s, {color: i % 3 === 0 ? C.leafDark : C.leaf, border: 3, lift: 0.6});
  });

  return {canvas};
}
