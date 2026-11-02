import {C, W, H, rect, circle, ellipse, arch, rotated, rng} from './kit.js';

const E = {torn: true};
const FRAME = {x0: 30, y0: 26, x1: 1890, y1: 1054};

export function flakes(k, count, seed, {x0 = 70, y0 = 60, x1 = 1850, y1 = 940, color = C.cream, size = 10, name = null} = {}) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), s = size * (0.45 + r() * 0.55);
    k.cut(ellipse(x, y, s, s * (0.65 + r() * 0.35), 9), typeof color === 'function' ? color(r()) : color, {border: 2, lift: 0.3, name});
  }
}
export const confetti = (k, count, seed, area) => flakes(k, count, seed, {...area, size: 11, color: v => (v < 0.55 ? C.red : C.gold)});

// ---------- 配饰：角色几何不变，配饰是贴在上面的纸片 ----------
export function goldFlower(k, a) {
  const u = a.u, [x, y] = [a.head[0] + 5 * u, a.head[1] + u * 0.3];
  for (let i = 0; i < 5; i++) k.cut(circle(x + Math.cos(i * 1.257) * u * 1.3, y + Math.sin(i * 1.257) * u * 1.3, u * 1, 12), C.gold, {border: 2, lift: 0.3, name: 'flower'});
  k.cut(circle(x, y, u * 0.75, 10), C.cream, {border: 1, lift: 0.1});
}
// 头纱在身后，裙子只盖腿，脸和手臂始终露出来。
export function bride(k, cx, foot, u, {gown = true, ...opts} = {}) {
  const top = foot - 21 * u;
  if (gown) k.cut([[cx - 8 * u, top], [cx + 8 * u, top], [cx + 15 * u, foot - 1 * u], [cx - 15 * u, foot - 1 * u]], C.white, {alpha: 0.8, lift: 0.3, border: 2, name: 'veil'});
  const a = k.clawd(cx, foot, u, {role: 'bride', expression: 'happy', ...opts});
  if (gown) k.cut([[cx - 9.5 * u, foot - 6 * u], [cx + 9.5 * u, foot - 6 * u], [cx + 12.5 * u, foot], [cx - 12.5 * u, foot]], C.cream, {lift: 0.5, border: 3, name: 'skirt'});
  goldFlower(k, a);
  return a;
}
const GUEST_TINTS = [
  {'#da7758': '#d8c4a3', '#ed9b75': '#e6d8bd', '#b85d47': '#bda98a', '#713f32': '#7c6c58'},
  {'#da7758': '#bcc7b6', '#ed9b75': '#cfd8ca', '#b85d47': '#9dab99', '#713f32': '#65705f'},
];
export function groom(k, cx, foot, u, opts = {}) {
  const a = k.clawd(cx, foot, u, {role: 'groom', expression: 'happy', ...opts});
  const [x, y] = [a.chest[0], a.chest[1] + a.u];
  const s = a.u;
  k.cut([[x - 3.4 * s, y - 1.6 * s], [x, y], [x - 3.4 * s, y + 1.6 * s]], C.tie, {border: 2, lift: 0.2, name: 'tie'});
  k.cut([[x + 3.4 * s, y - 1.6 * s], [x, y], [x + 3.4 * s, y + 1.6 * s]], C.tie, {border: 2, lift: 0.2, name: 'tie'});
  return a;
}
export function rosette(k, a, {big = false} = {}) {
  const u = a.u, [x, y] = [a.chest[0] + 5.5 * u, a.chest[1] + 1.5 * u];
  k.cut([[x - 1.5 * u, y], [x + 1.5 * u, y], [x + 2 * u, y + 6 * u], [x, y + 4.8 * u], [x - 2 * u, y + 6 * u]], C.red, {border: 2, lift: 0.3, name: 'rosette'});
  k.cut(circle(x, y, 2.7 * u, 16), C.red, {border: 3, lift: 0.5, name: 'rosette'});
  k.cut(circle(x, y, 1.85 * u, 14), C.cream, {border: 1, lift: 0.1});
  if (big) k.text('嘉宾', x, y, 1.3 * u, C.red, {name: 'rosetteWord'});
}
export function placeCard(k, x, y, w = 250, deg = 0, name = 'placeCard') {
  const h = w * 0.42;
  k.cut(rotated(x, y, w, h, deg), C.cream, {lift: 1.5, border: 6, name});
  k.text('嘉宾', x, y, w * 0.25, C.ink, {deg, spacing: w * 0.05, name: `${name}Word`});
}
export function invitation(k, x, y, w, deg = 0, name = 'invite') {
  const h = w * 0.67;
  k.cut(rotated(x, y, w, h, deg), C.red, {lift: 1.6, border: Math.max(3, w * 0.02), name});
  k.cut(rotated(x, y, w * 0.86, h * 0.8, deg), C.red, {lift: 0, border: Math.max(1, w * 0.008)});
  k.text('囍', x, y, w * 0.38, C.gold, {deg});
}
export function oldPhoto(k, x, y, w, deg = 0, {name = 'photo', fade = false} = {}) {
  const h = w * 0.78;
  k.cut(rotated(x, y, w, h, deg), C.cream, {lift: 1, border: 3, name});
  k.cut(rotated(x, y - h * 0.06, w * 0.86, h * 0.68, deg), fade ? C.old : C.sky, {lift: 0, border: 1});
  const u = w / 52, foot = y + h * 0.26;
  k.clawd(x - w * 0.16, foot, u, {role: 'photoMe', expression: 'happy'});
  goldFlower(k, k.clawd(x + w * 0.16, foot, u, {role: 'photoYou', expression: 'happy'}));
}
export function ticketStubs(k, x, y, s = 1, deg = -8, name = 'tickets') {
  k.cut(rotated(x - 6 * s, y, 92 * s, 44 * s, deg - 7), C.path, {lift: 0.6, border: 3, name});
  k.cut(rotated(x + 8 * s, y + 6 * s, 92 * s, 44 * s, deg + 5), C.envelope, {lift: 0.7, border: 3, name});
  k.line([[x + 26 * s, y - 14 * s], [x + 30 * s, y + 24 * s]], C.oldDark, 2 * s);
}
export function mug(k, x, y, s, color, {dust = false} = {}) {
  k.cut(rect(x - 34 * s, y - 62 * s, 68 * s, 62 * s), color, {lift: 0.8, border: 3, name: dust ? 'dustMug' : 'mug'});
  k.line([[x + 34 * s, y - 46 * s], [x + 56 * s, y - 40 * s], [x + 54 * s, y - 16 * s], [x + 34 * s, y - 14 * s]], color, 8 * s, 3);
  if (dust) k.mark(ellipse(x, y - 60 * s, 30 * s, 6 * s), 'rgba(120,110,95,.55)');
}
export function phone(k, x, y, s, {lit = true, deg = 0} = {}) {
  k.cut(rotated(x, y, 92 * s, 170 * s, deg), C.phone, {lift: 1, border: 4, name: 'phone'});
  if (lit) {
    k.cut(rotated(x, y, 76 * s, 146 * s, deg), C.cream, {lift: 0, border: 1});
    k.text('囍', x, y, 58 * s, C.red, {deg, name: 'phoneSign'});
  }
}
export function bubble(k, x, y, w, color, {name = 'bubble', tail = -1} = {}) {
  const h = w * 0.62;
  k.cut([...ellipse(x, y, w / 2, h / 2, 24)], color, {lift: 0.8, border: 4, name});
  k.cut([[x + tail * w * 0.15, y + h * 0.36], [x + tail * w * 0.34, y + h * 0.82], [x + tail * w * 0.02, y + h * 0.44]], color, {lift: 0.3, border: 3});
}
export function redLine(k, pts, width = 8, name = 'redLine') { k.line(pts, C.red, width, 3, name); }

// ---------- 雪路（与开场样图同构图） ----------
const PATH = [[1255, 652], [1240, 780], [560, 770], [640, 1060]];
function pathCenter(t) {
  const u = 1 - t, c = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  const at = i => c.reduce((s, v, j) => s + v * PATH[j][i], 0);
  return [at(0), at(1)];
}
function pathNormal(t) {
  const [ax, ay] = pathCenter(Math.max(0, t - 0.01)), [bx, by] = pathCenter(Math.min(1, t + 0.01)), len = Math.hypot(bx - ax, by - ay);
  return [-(by - ay) / len, (bx - ax) / len];
}
const halfWidth = t => 26 + 189 * t ** 1.6;
function pathOutline() {
  const side = sign => Array.from({length: 41}, (_, i) => {
    const t = i / 40, [x, y] = pathCenter(t), [nx, ny] = pathNormal(t), hw = halfWidth(t) * sign;
    return [x + nx * hw, Math.min(1056, y + ny * hw)];
  });
  return [...side(1), ...side(-1).reverse()];
}
export const roadPoint = pathCenter;
function pine(k, x, base, h, color) {
  const w = h * 0.4;
  [0, 0.28, 0.54].forEach((c, i) => k.cut([[x, base - h + c * h * 0.72], [x + w * (0.55 + i * 0.25), base - h * (0.46 - c * 0.8)], [x - w * (0.55 + i * 0.25), base - h * (0.46 - c * 0.8)]], color, {border: 3, lift: 0.4}));
}
function chapel(k) {
  k.cut(rect(1222, 288, 66, 120), C.wallShade, {border: 5});
  k.cut(arch(1236, 1274, 306, 366), C.door, {border: 2, lift: 0.2});
  k.cut(arch(1245, 1265, 328, 354), C.gold, {border: 2, lift: 0.3, name: 'bell'});
  k.cut([[1208, 292], [1255, 205], [1302, 292]], C.roof, {border: 5});
  k.cut(rect(1120, 478, 270, 177), C.wall, {border: 7, lift: 1.2, name: 'chapel'});
  k.cut([[1096, 486], [1255, 372], [1414, 486]], C.roof, {border: 7, lift: 1.2, name: 'chapel'});
  k.cut(circle(1255, 442, 22), C.gold, {border: 4, lift: 0.4});
  k.cut(arch(1148, 1188, 515, 610), C.gold, {border: 3, lift: 0.3});
  k.cut(arch(1322, 1362, 515, 610), C.gold, {border: 3, lift: 0.3});
  k.cut(arch(1224, 1286, 572, 655), C.door, {border: 4, lift: 0.5});
  const colors = [C.cream, C.red, C.gold, C.petal];
  for (let i = 0; i < 15; i++) {
    const a = Math.PI + i / 14 * Math.PI;
    k.cut(circle(1255 + Math.cos(a) * 62, 612 + Math.sin(a) * 62, i % 3 ? 13 : 17, 12), colors[i % 4], {border: 2, lift: 0.3});
  }
}
function bunting(k, from, to, sag) {
  const point = t => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * sag];
  k.line([[to[0], to[1] - 4], [to[0], 650]], C.branch, 6, 2);
  k.line(Array.from({length: 17}, (_, i) => point(i / 16)), C.ink, 2);
  const count = Math.round(Math.hypot(to[0] - from[0], to[1] - from[1]) / 40);
  for (let i = 0; i < count; i++) {
    const [x, y] = point((i + 0.5) / count);
    k.cut([[x - 13, y], [x + 13, y], [x, y + 30]], [C.red, C.gold, C.cream][i % 3], {border: 2, lift: 0.3, name: 'bunting'});
  }
}
export function snowScape(k, {sky = C.sky, sun = true} = {}) {
  k.torn([[32, 250], [420, 235], [1000, 262], [1500, 228], [1888, 250], [1888, 680], [32, 680]], C.newsSky, {tex: 'news', lift: 0.6});
  k.torn([[30, 28], [1890, 24], [1886, 330], [1400, 300], [800, 345], [320, 310], [34, 340]], sky, {lift: 0.9});
  if (sun) k.cut(circle(1590, 232, 118, 40), C.sun, {border: 8, lift: 0.7});
  k.torn([[30, 600], [250, 520], [520, 575], [820, 505], [1120, 560], [1430, 500], [1700, 560], [1890, 520], [1890, 700], [30, 700]], C.hill, {tex: 'news', lift: 0.8});
  [[120, 640, 130], [205, 650, 170], [300, 645, 120], [960, 648, 150], [1040, 652, 190], [1500, 650, 170], [1590, 655, 130], [1690, 648, 200], [1780, 650, 140]]
    .forEach(([x, b, h], i) => pine(k, x, b, h, i % 2 ? C.pineDark : C.pine));
  k.torn([[30, 628], [400, 612], [800, 640], [1250, 628], [1600, 640], [1890, 618], [1890, 1054], [30, 1052]], C.snow, {lift: 1.2});
}
export function road(k, {prints = null, hallDecor = true} = {}) {
  snowScape(k);
  k.torn(pathOutline(), C.path, {tex: 'kraft', lift: 0.5, name: 'road'});
  if (prints) prints.forEach(t => {
    const [x, y] = pathCenter(t), [nx, ny] = pathNormal(t), i = Math.round(t * 30), side = i % 2 ? 20 : -20, s = 1 + (t - 0.6) * 2;
    k.mark(ellipse(x + nx * side * 2 * s, y + ny * side * 2 * s, 13 * s, 7 * s, 14), 'rgba(92,68,44,.34)', 'prints');
  });
  chapel(k);
  if (hallDecor) { bunting(k, [1226, 372], [990, 520], 34); bunting(k, [1284, 372], [1500, 505], 30); }
}
// 样图前景：剪报、喜帖和席卡，是“同一张喜帖的两种尺度”。
export function roadForeground(k, {withInvite = true, wordCover = 0} = {}) {
  k.torn([[30, 1056], [30, 960], [170, 925], [360, 960], [560, 1000], [900, 1020], [1180, 1030], [1500, 1015], [1890, 985], [1890, 1056]], C.bank, {lift: 1.6});
  [[[34, 172], [210, 150], [400, 190], [560, 170]], [[210, 150], [290, 90], [360, 62]], [[400, 190], [470, 262]], [[100, 162], [132, 240]]]
    .forEach((line, i) => k.line(line, C.branch, i ? 9 : 15, 5));
  if (withInvite) {
    k.torn(rotated(1560, 790, 520, 300, -3), '#efe6cf', {tex: 'news', lift: 1.1});
    k.cut(rotated(1625, 770, 370, 250, 5), C.envelope, {lift: 1.3});
    invitation(k, 1600, 750, 360, -4, 'bigInvite');
  }
  placeCard(k, 1400, 860, 250, 5);
  if (wordCover > 0) k.torn([[1250, 905], [1290, 835], [1370, 812], [1470, 818], [1545, 850], [1570, 910]], C.bank, {lift: 0.5, name: 'snowOnCard'});
}

// ---------- 小屋 ----------
function sill(k, y = 800) { k.cut(rect(320, y, 1280, 56), C.wood, {lift: 1.2, border: 5, name: 'sill'}); }
export function sillThings(k, {photo = true, y = 800, x = 0} = {}) {
  if (photo) oldPhoto(k, 620 + x, y - 92, 190, -5);
  ticketStubs(k, 840 + x, y - 22, 0.95, -6);
  mug(k, 1060 + x, y, 1, C.pine);
  mug(k, 1210 + x, y, 1, C.oldDark, {dust: true});
}
// 屋外隔窗：相机在屋外，Clawd 在窗里面向镜头。窗内是屋内同一张纸，它不随相机缩放，穿窗时不用换背景。
export function windowOutside(k, draw, cam = [W / 2, H / 2, 1]) {
  roomInside(k);
  k.camera(...cam);
  [rect(30, 26, 1860, 130), rect(30, 804, 1860, 250), rect(30, 140, 396, 680), rect(1494, 140, 396, 680)].forEach(wall => k.torn(wall, C.woodDark, {lift: 0.3}));
  for (let x = 110; x < 1880; x += 170) if (x < 420 || x > 1500) k.line([[x, 30], [x + 4, 1050]], C.branch, 4);
  draw();
  k.line([[960, 150], [960, 810]], C.wood, 14, 4);
  k.line([[420, 480], [1500, 480]], C.wood, 14, 4);
  [[[420, 150], [1500, 150]], [[420, 810], [1500, 810]], [[420, 150], [420, 810]], [[1500, 150], [1500, 810]]].forEach(l => k.line(l, C.wood, 30, 6));
}
export function frost(k, hole, seed = 5) {
  const r = rng(seed);
  for (let i = 0; i < 170; i++) {
    const rx = 40 + r() * 40, ry = 30 + r() * 30, x = 425 + rx + r() * (1070 - 2 * rx), y = 155 + ry + r() * (650 - 2 * ry);
    if (Math.hypot((x - hole[0]) / hole[2], (y - hole[1]) / hole[3]) < 1) continue;
    k.mark(ellipse(x, y, rx, ry, 14), 'rgba(238,246,247,.34)');
  }
}
// 屋内：相机在窗台一侧看 Clawd，身后是墙和日历。墙和地板向右下延伸，L03 推近窗台时不露底纸。
export function roomInside(k, {calendar = true, windowBack = true} = {}) {
  k.torn([[30, 26], [2460, 26], [2460, 1130], [30, 1130]], C.room, {tex: 'news', lift: 0.3});
  k.cut(rect(30, 830, 2430, 300), C.wood, {lift: 0.6, border: 3});
  if (windowBack) {
    k.cut(rect(1160, 170, 520, 250), C.sky, {lift: 0.4, border: 10, name: 'roomWindow'});
    k.torn([[1165, 340], [1400, 325], [1676, 345], [1676, 416], [1165, 416]], C.snow, {lift: 0.2});
    flakes(k, 22, 91, {x0: 1190, y0: 190, x1: 1650, y1: 400, size: 9});
    k.line([[1420, 170], [1420, 420]], C.wood, 10, 3);
    k.line([[1160, 295], [1680, 295]], C.wood, 10, 3);
  }
  if (calendar) {
    k.cut(rect(250, 170, 300, 340), C.cream, {lift: 0.9, border: 5, name: 'calendar'});
    k.cut(rect(250, 170, 300, 72), C.red, {lift: 0, border: 1});
    for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) k.cut(rect(278 + col * 50, 268 + row * 56, 32, 34), C.path, {lift: 0, border: 1});
  }
}

// ---------- 门 ----------
export function doorOutside(k, snowy = true) {
  k.torn([[30, 26], [1890, 26], [1890, 1054], [30, 1054]], C.woodDark, {lift: 0.3});
  for (let x = 110; x < 1880; x += 170) k.line([[x, 30], [x + 4, 1050]], C.branch, 4);
  k.cut(rect(620, 130, 680, 780), C.room, {lift: 0.4, border: 8, name: 'doorway'});
  k.cut(rect(620, 700, 680, 210), C.roomDim, {lift: 0.1, border: 1});
  k.cut([[620, 130], [420, 180], [420, 920], [620, 910]], C.door, {lift: 1.2, border: 6, name: 'doorLeaf'});
  k.cut([[1300, 130], [1500, 180], [1500, 920], [1300, 910]], C.door, {lift: 1.2, border: 6, name: 'doorLeaf'});
  k.torn([[30, 900], [600, 880], [1300, 890], [1890, 870], [1890, 1054], [30, 1054]], C.snow, {lift: 1});
}

// ---------- 雪路上的走近布置 ----------
export function approachRoad(k) {
  snowScape(k, {sun: false});
  k.torn([[760, 640], [1160, 640], [1640, 1056], [280, 1056]], C.path, {tex: 'kraft', lift: 0.5, name: 'road'});
  [[150, 600], [1770, 600]].forEach(([x, y]) => k.line([[x, y], [x, 900]], C.branch, 14, 4));
  const point = t => [150 + t * 1620, 330 + Math.sin(t * Math.PI) * 110];
  k.line(Array.from({length: 25}, (_, i) => point(i / 24)), C.ink, 3);
  for (let i = 0; i < 26; i++) {
    const [x, y] = point((i + 0.5) / 26);
    k.cut([[x - 24, y], [x + 24, y], [x, y + 56]], [C.red, C.gold, C.cream][i % 3], {border: 3, lift: 0.5, name: 'bunting'});
  }
  floralArch(k, 960, 880, 660, 620);
}
export function floralArch(k, cx, foot, w, h, name = 'arch') {
  const colors = [C.cream, C.red, C.gold, C.petal];
  const n = 34;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + i / n * Math.PI;
    const x = cx + Math.cos(a) * w / 2, y = foot - h + w / 2 + Math.sin(a) * w / 2;
    k.cut(circle(x, y, i % 3 ? 26 : 36, 12), colors[i % 4], {border: 3, lift: 0.5, name});
  }
  for (const side of [-1, 1]) for (let j = 0; j < 7; j++) {
    k.cut(circle(cx + side * w / 2, foot - h + w / 2 + 60 + j * ((h - w / 2 - 60) / 7), j % 2 ? 26 : 34, 12), colors[(j + 1) % 4], {border: 3, lift: 0.5, name});
  }
}

// ---------- 礼堂签到区 ----------
// 一条长走廊，物件有固定的世界座标，L11–L15 靠相机横移经过。上下留出余量，L15 拉宽时不露底纸。
export function foyer(k, {poster = true} = {}) {
  k.torn(rect(30, -320, 6000, 1640), C.hall, {tex: 'news', lift: 0.3});
  for (let x = 240; x < 6000; x += 420) k.cut(rect(x, -320, 44, 1146), C.wall, {lift: 0.5, border: 3});
  k.cut(rect(30, 820, 6000, 500), C.wallShade, {lift: 0.5, border: 3});
  for (let x = 60; x < 6000; x += 240) k.line([[x, 822], [x - 150, 1318]], C.oldDark, 4);
  if (poster) {
    k.cut(rect(640, 90, 640, 480), C.gold, {lift: 1.2, border: 8, name: 'poster'});
    k.cut(rect(668, 118, 584, 424), C.cream, {lift: 0, border: 2});
    k.text('囍', 960, 190, 90, C.red);
    bride(k, 860, 520, 8);
    groom(k, 1060, 520, 8);
  }
}
export function signTable(k, x = 960, y = 760, w = 900) {
  k.cut(rect(x - w / 2, y, w, 240), C.red, {lift: 1.2, border: 7, name: 'table'});
  k.cut(rect(x - w / 2, y, w, 26), C.gold, {lift: 0.1, border: 1});
}
export function giftBox(k, x, base, s = 1, {photoCorner = false, envelope = false} = {}) {
  k.cut(rect(x - 150 * s, base - 200 * s, 300 * s, 200 * s), C.red, {lift: 1.1, border: 6 * s, name: 'giftBox'});
  k.text('囍', x, base - 92 * s, 104 * s, C.gold);
  k.cut(rect(x - 96 * s, base - 200 * s, 192 * s, 22 * s), C.door, {lift: 0, border: 1, name: 'slot'});
  if (photoCorner) {
    k.cut(rotated(x + 4 * s, base - 222 * s, 150 * s, 92 * s, -3), C.cream, {lift: 0.6, border: 3, name: 'photoCorner'});
    k.cut(rotated(x + 4 * s, base - 228 * s, 126 * s, 66 * s, -3), C.sky, {lift: 0, border: 1});
    k.clawd(x - 28 * s, base - 200 * s, 1.5 * s, {role: 'photoMe', expression: 'happy'});
    goldFlower(k, k.clawd(x + 34 * s, base - 200 * s, 1.5 * s, {role: 'photoYou', expression: 'happy'}));
    k.cut(rect(x - 100 * s, base - 192 * s, 200 * s, 60 * s), C.red, {lift: 0.2, border: 1});
    k.text('囍', x, base - 92 * s, 104 * s, C.gold);
  }
  if (envelope) {
    k.cut(rotated(x + 4 * s, base - 208 * s, 210 * s, 116 * s, -2), C.red, {lift: 1, border: 5 * s, name: 'envelope'});
    k.cut([[x - 96 * s, base - 262 * s], [x + 104 * s, base - 262 * s], [x + 4 * s, base - 212 * s]], '#9f2a22', {lift: 0.1, border: 2});
    k.text('囍', x + 4 * s, base - 186 * s, 50 * s, C.gold);
  }
}
export function cake(k, x, base, s = 1) {
  k.cut(rect(x - 170 * s, base - 110 * s, 340 * s, 110 * s), C.cream, {lift: 1, border: 5, name: 'cake'});
  k.cut(rect(x - 120 * s, base - 200 * s, 240 * s, 90 * s), C.bank, {lift: 1, border: 5, name: 'cake'});
  [-1, 1].forEach(side => k.clawd(x + side * 62 * s, base - 200 * s, 3.2 * s, {role: side < 0 ? 'toyGroom' : 'toyBride', expression: 'happy'}));
}

// ---------- 礼堂嘉宾席（从舞台方向看） ----------
export function hall(k, {rows = true, door = false, bell = false, clap = false, stand = false} = {}) {
  k.torn([[30, 26], [1890, 26], [1890, 1054], [30, 1054]], C.hall, {tex: 'news', lift: 0.3});
  k.cut(rect(30, 26, 1860, 120), C.wallShade, {lift: 0.5, border: 3});
  for (const x of [230, 650, 1270, 1690]) k.cut(rect(x - 60, 150, 120, 150), C.sky, {lift: 0.5, border: 8});
  if (bell) {
    // 高窗按 L17 的画面位置换算成世界座标，I02 拉远时也在同一处。
    const s = 0.4267, at = pts => pts.map(([x, y]) => [1035 + (x - 960) * s, 295.07 + (y - 540) * s]);
    k.cut(at(rect(740, 100, 440, 430)), C.sky, {lift: 0.5, border: 4, name: 'hallWindow'});
    k.torn(at([[750, 450], [1170, 435], [1170, 520], [750, 520]]), C.snow, {lift: 0.1});
    k.cut(at(rect(895, 240, 130, 240)), C.wallShade, {border: 2});
    k.cut(at([[870, 244], [960, 130], [1050, 244]]), C.roof, {border: 2});
    k.cut(at(arch(915, 1005, 262, 372)), C.door, {border: 1, lift: 0.2});
    k.cut(at(arch(932, 988, 285, 358)), C.gold, {border: 1, lift: 0.3, name: 'bell'});
    [78, 118].forEach(radius => k.line(at(Array.from({length: 25}, (_, i) => [960 + Math.cos(i / 24 * 6.283) * radius, 322 + Math.sin(i / 24 * 6.283) * radius])), C.gold, 2));
  }
  if (door) {
    k.cut(rect(1340, 240, 240, 270), C.door, {lift: 0.8, border: 7, name: 'exitDoor'});
    k.cut(rect(1390, 198, 140, 40), C.green, {lift: 0.4, border: 3, name: 'exitSign'});
  }
}
// 一排客人用低饱和纸色，全片只有主角和新人是橙色。
export const guestTint = i => GUEST_TINTS[i % 2];
export function guests(k, y, u, xs, {clap = false, seed = 1} = {}) {
  const r = rng(seed);
  xs.forEach((x, i) => {
    const expression = clap || r() < 0.7 ? 'happy' : 'neutral';
    k.clawd(x, y, u, {role: 'guest', expression, action: clap ? 'hug' : 'idle', frame: i % 4, tint: guestTint(i + seed)});
  });
}
export function seatTable(k, x, y, w, name = 'seatTable', h = 70) {
  k.cut(rect(x - w / 2, y, w, h), C.cream, {lift: 1.1, border: 5, name});
}
export function glass(k, x, y, s = 1, name = 'glass') {
  k.cut([[x - 26 * s, y - 92 * s], [x + 26 * s, y - 92 * s], [x + 14 * s, y - 40 * s], [x - 14 * s, y - 40 * s]], C.warm, {lift: 0.5, border: 3 * s, name});
  k.line([[x, y - 40 * s], [x, y - 8 * s]], C.white, 5 * s, 2);
  k.line([[x - 20 * s, y - 6 * s], [x + 20 * s, y - 6 * s]], C.white, 6 * s, 2);
}

// ---------- 舞台 ----------
export function stage(k) {
  k.torn([[30, 26], [1890, 26], [1890, 1054], [30, 1054]], C.hall, {tex: 'news', lift: 0.3});
  for (const x of [190, 520, 1400, 1730]) k.cut(rect(x - 50, 26, 100, 780), C.wall, {lift: 0.6, border: 3});
  k.cut(rect(30, 780, 1860, 274), C.wallShade, {lift: 0.6, border: 3});
  k.cut([[30, 840], [1890, 780], [1890, 870], [30, 980]], C.carpet, {lift: 0.6, border: 4, name: 'carpet'});
  floralArch(k, 1240, 840, 620, 720, 'altar');
}

// ---------- 过去的雪地 ----------
export function pastSnow(k, {drain = false} = {}) {
  const sky = drain ? C.old : '#f4dfae', ground = drain ? '#e6dcc4' : '#fff4dc';
  k.torn([[30, 26], [1890, 26], [1890, 640], [30, 660]], sky, {tex: drain ? 'news' : null, lift: 0.4});
  if (!drain) k.cut(circle(960, 240, 150, 44), C.sun, {border: 10, lift: 0.7, name: 'sun'});
  k.torn([[30, 540], [430, 460], [860, 530], [1290, 450], [1890, 520], [1890, 700], [30, 700]], drain ? C.oldDark : C.petal, {tex: 'news', lift: 0.7});
  k.torn([[30, 640], [640, 620], [1300, 650], [1890, 625], [1890, 1054], [30, 1054]], ground, {lift: 1});
}

// ---------- 纸舞台 ----------
export function paperStage(k, open = 1) {
  k.cut(rect(170, 90, 1580, 880), C.wood, {lift: 1.4, border: 8, name: 'stageFrame'});
  k.torn([[230, 140], [1690, 140], [1690, 720], [230, 720]], C.sky, {lift: 0.2});
  k.torn([[230, 620], [900, 600], [1690, 625], [1690, 850], [230, 850]], C.snow, {lift: 0.4});
  flakes(k, 26, 41, {x0: 260, y0: 170, x1: 1660, y1: 640});
  const inner = 230 + (1 - open) * 730, right = 1690 - (1 - open) * 730;
  k.torn([[230, 140], [inner + 90 * open, 140], [inner - 30, 830], [230, 850]], C.red, {lift: 1.5, name: 'curtain'});
  k.torn([[1690, 140], [right - 90 * open, 140], [right + 30, 830], [1690, 850]], C.red, {lift: 1.5, name: 'curtain'});
  k.cut(rect(170, 850, 1580, 120), C.woodDark, {lift: 1.1, border: 6});
}
export function spotlight(k, x) {
  k.mark([[x - 90, 90], [x + 90, 90], [x + 280, 840], [x - 280, 840]], 'rgba(255,240,180,.34)', 'spotlight');
}

// ---------- 从礼堂内隔窗向外 ----------
export function outsideWindow(k, {sky = C.skyDim, cloud = false} = {}) {
  k.torn([[30, 26], [1890, 26], [1890, 690], [30, 700]], sky, {lift: 0.3});
  if (cloud) {
    k.cut([[840, 26], [1080, 26], [1250, 690], [670, 690]], C.sun, {lift: 0.1, border: 2, alpha: 0.75, name: 'cloudLight'});
    [[320, 150, 360, 110], [1560, 170, 370, 120]].forEach(([x, y, a, b]) => k.torn(ellipse(x, y, a, b, 18), C.skyDim, {lift: 0.4}));
  }
  k.torn([[30, 640], [640, 610], [1300, 640], [1890, 620], [1890, 1054], [30, 1054]], C.snow, {lift: 1, name: 'outsideSnow'});
  k.torn([[1160, 640], [1320, 640], [1880, 1050], [1420, 1050]], C.path, {tex: 'kraft', lift: 0.4, name: 'road'});
}
// 玻璃上映出的礼堂是一块暖色面板，新人站在面板的地面上，不会看起来飘在天上。
export function reflection(k, x, foot, u, {hug = false} = {}) {
  k.cut(arch(x - 26 * u, x + 26 * u, foot - 38 * u, foot + 3 * u), C.warm, {alpha: 0.72, lift: 0.1, border: 2, name: 'reflectPanel'});
  const gap = hug ? 11 : 13;
  bride(k, x + gap * u, foot, u, {action: hug ? 'hug' : 'idle'});
  groom(k, x - gap * u, foot, u, {action: hug ? 'hug' : 'idle'});
}
export function windowFrame(k) {
  [[[30, 26], [1890, 26]], [[30, 1054], [1890, 1054]], [[30, 26], [30, 1054]], [[1890, 26], [1890, 1054]]].forEach(l => k.line(l, C.wood, 46, 8));
}
export function lightPatch(k, x, y, w, h) { k.cut([[x, y], [x + w, y], [x + w * 1.08, y + h], [x - w * 0.08, y + h]], C.warm, {lift: 0.1, border: 1, alpha: 0.85, name: 'lightPatch'}); }

// ---------- 台阶与合影 ----------
export function steps(k) {
  k.torn([[30, 26], [1890, 26], [1890, 430], [30, 430]], C.sky, {lift: 0.3});
  k.cut(rect(330, 90, 1260, 470), C.wall, {lift: 1.2, border: 7, name: 'hallFront'});
  k.cut(arch(800, 1120, 180, 560), C.door, {lift: 0.5, border: 5});
  for (let i = 0; i < 12; i++) k.cut(circle(960 + Math.cos(Math.PI + i / 11 * Math.PI) * 180, 330 + Math.sin(Math.PI + i / 11 * Math.PI) * 180, 24, 12), [C.cream, C.red, C.gold, C.petal][i % 4], {border: 3, lift: 0.4});
  k.torn([[30, 540], [1890, 530], [1890, 1054], [30, 1054]], C.snow, {lift: 1});
  k.cut(rect(420, 540, 1080, 80), C.bank, {lift: 0.8, border: 4});
  k.cut(rect(350, 620, 1220, 90), C.path, {lift: 0.8, border: 4, name: 'steps'});
  k.torn([[1690, 540], [1760, 540], [1560, 1054], [1450, 1054]], C.path, {tex: 'kraft', lift: 0.4});
}

export {W, H, FRAME, E};
