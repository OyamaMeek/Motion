// 在页面内运行的数值检查：不查看图片，只读取画布像素。
const hex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));

function mean(d, width, x, y, size = 5) {
  const sum = [0, 0, 0];
  for (let j = -size; j <= size; j++) for (let i = -size; i <= size; i++) {
    const k = ((y + j) * width + x + i) * 4;
    for (let c = 0; c < 3; c++) sum[c] += d[k + c];
  }
  return sum.map(v => v / (2 * size + 1) ** 2);
}
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

function hsv([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = 0;
  if (delta) h = max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return {h: h * 60, s: max ? delta / max : 0, v: max / 255};
}

// 中心点取实际几何，颜色误差上限 60：纸纤维正片叠底后会比色标略暗。
export function colorProbes(ctx, findLayer, C, figure) {
  const {width, data} = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  const center = (layer, name) => {
    const {pts} = findLayer(layer).pieces.find(p => p.name === name);
    return pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]).map(Math.round);
  };
  const [wx, wy] = center('chapel', 'window'), [rx, ry] = center('chapel', 'rose');
  const list = [
    ['牛皮纸外框', 12, 12, C.kraft], ['牛皮纸下框', 960, 1072, C.kraft], ['天空', 800, 120, C.sky], ['太阳', 1590, 232, C.sun],
    ['Clawd 身体', ...figure.body, C.clawdBody], ['手中喜帖', ...figure.invite, C.red],
    ['礼堂窗', wx, wy, C.gold], ['玫瑰窗', rx, ry, C.gold], ['喜帖红底', 1450, 800, C.red], ['席卡留白', 1305, 960, C.cream],
    ['雪地空白', 1100, 900, C.ground],
  ];
  return list.map(([name, x, y, want]) => {
    const got = mean(data, width, x, y, 4), d = distance(got, hex(want));
    return {name, x, y, want, got: got.map(Math.round), distance: Math.round(d), pass: d < 60};
  });
}

export function paletteStats(ctx) {
  const {data} = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height), n = data.length / 4;
  let opaque = true, luma = 0, dark = 0, purple = 0, neon = 0, red = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] !== 255) opaque = false;
    const l = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2], c = hsv([data[i], data[i + 1], data[i + 2]]);
    luma += l;
    if (l < 60) dark++;
    if (c.h >= 255 && c.h <= 325 && c.s > 0.2) purple++;
    if (c.s > 0.9 && c.v > 0.9) neon++;
    if ((c.h < 12 || c.h > 350) && c.s > 0.55 && c.v > 0.45 && c.v < 0.85) red++;
  }
  const pct = v => +(v / n * 100).toFixed(3);
  return {width: ctx.canvas.width, height: ctx.canvas.height, opaque, meanLuma: +(luma / n).toFixed(1), darkPct: pct(dark), purplePct: pct(purple), neonPct: pct(neon), redPct: pct(red)};
}

export function surfaceGrain(ctx, x, y, size = 40) {
  const {data} = ctx.getImageData(x, y, size, size), lumas = [];
  for (let i = 0; i < data.length; i += 4) lumas.push(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
  const avg = lumas.reduce((a, b) => a + b) / lumas.length;
  return +Math.sqrt(lumas.reduce((s, v) => s + (v - avg) ** 2, 0) / lumas.length).toFixed(2);
}

// 统计两秒内画面实际变化的次数，换算每秒更新次数。
export async function measureUpdates(art, ctx, seconds = 2) {
  // 只读一行：大块读回会占用绘制时间，测到的是检测本身的开销。
  const row = () => ctx.getImageData(0, 760, 1920, 1).data;
  const costs = [];
  for (let tick = 0; tick < 10; tick++) {
    const t0 = performance.now();
    art.render(tick); row();
    costs.push(performance.now() - t0);
  }
  let last = row(), changes = 0;
  const started = performance.now(), timer = art.play();
  while (performance.now() - started < seconds * 1000) {
    await new Promise(ok => setTimeout(ok, 15));
    const now = row();
    if (now.some((v, i) => v !== last[i])) changes++;
    last = now;
  }
  clearInterval(timer);
  return {perSecond: +(changes / seconds).toFixed(1), renderMs: Math.round(Math.max(...costs))};
}

// 从喜帖下边缘向外走，应依次出现红纸、白边、比信封更暗的投影。
export function edgeProfile(ctx, frame) {
  const a = frame.deg * Math.PI / 180, {width, data} = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  return Array.from({length: 26}, (_, i) => {
    const local = frame.h / 2 - 6 + i * 2, x = Math.round(frame.cx - local * Math.sin(a) + 40 * Math.cos(a)), y = Math.round(frame.cy + local * Math.cos(a) + 40 * Math.sin(a));
    return mean(data, width, x, y, 0).map(Math.round);
  });
}

// 比较席卡内墨色像素，确认文字真的绘制且没有超出卡片。
export function inkInCard(ctx, frame, ink) {
  const {width, height, data} = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height), a = frame.deg * Math.PI / 180, want = hex(ink);
  let inside = 0, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (let v = -frame.h / 2 - 20; v < frame.h / 2 + 20; v++) for (let u = -frame.w / 2 - 20; u < frame.w / 2 + 20; u++) {
    const x = Math.round(frame.cx + u * Math.cos(a) - v * Math.sin(a)), y = Math.round(frame.cy + u * Math.sin(a) + v * Math.cos(a));
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const k = (y * width + x) * 4;
    if (distance([data[k], data[k + 1], data[k + 2]], want) > 40) continue;
    inside++; minX = Math.min(minX, u); maxX = Math.max(maxX, u); minY = Math.min(minY, v); maxY = Math.max(maxY, v);
  }
  return {inside, minX, maxX, minY, maxY};
}

// 系统没有该字体时 Canvas 会回退，字形像素与无衬线版本相同。
export function fontResolved(sample, font, size = 80) {
  const shot = family => {
    const c = document.createElement('canvas'); c.width = c.height = 200;
    const t = c.getContext('2d', {willReadFrequently: true});
    t.font = `700 ${size}px ${family}`; t.textBaseline = 'top'; t.fillText(sample, 10, 10);
    return t.getImageData(0, 0, 200, 200).data;
  };
  const a = shot(font), b = shot('sans-serif');
  let diff = 0, ink = 0;
  for (let i = 3; i < a.length; i += 4) { if (a[i] > 128) ink++; if (Math.abs(a[i] - b[i]) > 64) diff++; }
  return {ink, diff, resolved: ink > 200 && diff > 100};
}

// 在喜帖内部搜索最佳位移，确认画面真的按图层偏移量移动。
export function measuredShift(ctx, baseline, box) {
  const now = ctx.getImageData(box.x, box.y, box.w, box.h).data;
  const grab = (x, y) => baseline.getImageData(box.x + x, box.y + y, box.w, box.h).data;
  let best = {sad: Infinity};
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const was = grab(-dx, -dy);
    let sad = 0;
    for (let i = 0; i < now.length; i += 4) sad += Math.abs(now[i] - was[i]);
    if (sad < best.sad) best = {dx, dy, sad};
  }
  return best;
}
