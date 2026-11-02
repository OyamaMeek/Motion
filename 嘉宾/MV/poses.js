// 52 个镜头：动作、朝向和物件依据 storyboard.md 的衔接表，T 是 film.js 的镜内时钟。
// 关键画面（poster）之前动作都已到位，所以在 poster 时刻绘制就是已确认的定格；keys 是这一镜观众必须看到的物件。
import {C, W, rect, circle, ellipse, rotated, rng} from './kit.js';
import * as S from './sets.js';

const COLD = {'#da7758': '#bd8c79', '#ed9b75': '#c99f89', '#b85d47': '#9f7564'};
const OLD = {'#da7758': '#c0a98c', '#ed9b75': '#d1bea2', '#b85d47': '#a8947a', '#713f32': '#7c6b58', '#352e2a': '#5a5146'};
const me = (k, cx, foot, u, opts = {}) => k.clawd(cx, foot, u, {role: 'me', ...opts});
const snowy = (k, n, seed, area = {}) => S.flakes(k, n, seed, {y1: 1050, fall: 46, ...area});
const heldInvite = (k, a, w = 120) => S.invitation(k, a.grip[0] + w * 0.32, a.grip[1] - w * 0.08, w, -6);
const heldPhone = (k, a, s = 0.62) => S.phone(k, a.grip[0] + 40 * s, a.grip[1] - 30 * s, s);
const FROST_ME = [1150, 820, 14];
const L = (a, b, e) => a + (b - a) * e;
const mix = (a, b, e) => a.map((v, i) => L(v, b[i], e));
// 画面方框 (x, y, u) 换算成相机 c 下的世界座标。
const toWorld = (c, [x, y, u]) => [c[0] + (x - 960) / c[2], c[1] + (y - 540) / c[2], u / c[2]];
const fromWorld = (c, [x, y, u = 1]) => [(x - c[0]) * c[2] + 960, (y - c[1]) * c[2] + 540, u * c[2]];
const beatStep = (T, rate = 1) => Math.floor(T.b * rate);
const sway = (T, amount, rate = 2) => (beatStep(T, rate) % 2 ? amount : -amount);

// L02 撕下的日历页落在合照旁，之后一直留在窗台上。
const PAGE = [1145, 815, -12];
const fallenPage = k => k.cut(rotated(PAGE[0], PAGE[1], 150, 170, PAGE[2]), C.cream, {lift: 1.4, border: 4, name: 'calendarPage'});
const roomSill = k => {
  longSill(k);
  S.oldPhoto(k, 1370, 790, 240, -4);
};

function hookHands(k, y, name = 'hook', x = 960) {
  k.layer(() => {
    k.cut(ellipse(x, y, 44, 30, 18), C.orange, {border: 5, lift: 0.8, name});
    k.line([[x - 26, y - 8], [x, y + 10], [x + 26, y - 8]], C.door, 7);
  });
}
// 走廊的世界座标 = 画面座标 + 相机偏移。L11 偏移 1320，L12–L14 偏移 2670。
const CORRIDOR = 2670;
const tiles = k => k.cut([[810, 820], [1110, 820], [1160, 1050], [760, 1050]].map(([x, y]) => [x + CORRIDOR, y]), C.bank, {lift: 0.1, border: 2, name: 'gapTiles'});
const longSill = k => k.cut(rect(1040, 880, 1400, 60), C.path, {lift: 1.5, border: 5, name: 'sill'});
function tally(k, third = 0) {
  [1350, 1395].forEach(x => k.line([[x, 560], [x - 8, 690]], C.roomDim, 13, 4, 'tally'));
  if (third > 0) k.line([[1442, 560], [L(1442, 1432, third), L(560, 690, third)]], C.ink, 15, 5, 'tally');
}
const outerSill = k => {
  k.cut(rect(320, 800, 1280, 56), C.wood, {lift: 1.2, border: 5, name: 'sill'});
  S.sillThings(k, {x: -220});
  snowy(k, 20, 11, {x0: 60, y0: 60, x1: 1860, y1: 790});
};
const heldEnvelope = (k, b, s = 1) => k.cut(rotated(b.right[0] + 20 * s, b.right[1] + 8 * s, 120 * s, 72 * s, -6), C.red, {lift: 1, border: 4, name: 'envelope'});

// 礼堂只有这一个世界，近景都是同一批物件加相机。主角后面没有客人，前排也在他的正前方留出空位。
// 相机越过前排后 front 为 false，row 为 false 时左右没有邻座。frontDy 让前排比相机更快地落出下缘，rise 是客人起立的程度。
function hallRows(k, {clap = false, clapFrame = 0, rise = 1, me: meOpts = {}, foot = 470, meU = 6.4, front = true, frontDy = 0, row = true, card = [1035, 478, 130, 0], glass = true, rosette = true, swing = 0, rings = []} = {}) {
  S.hall(k, {door: true, bell: true, swing, rings});
  const down = u => (1 - rise) * u * 3;
  if (row) S.guests(k, 470, 6.4, [300, 480, 660, 840, 1230], {clap, seed: 3, frame: clapFrame, dy: down(6.4)});
  const a = me(k, 1035, foot, meU, meOpts);
  if (rosette) S.rosette(k, a);
  S.seatTable(k, 770, 462, 1100, 'lastRow', 30);
  if (card) S.placeCard(k, ...card);
  if (glass) S.glass(k, 1170, 462, 0.71);
  if (front) {
    S.guests(k, 670 + frontDy, 8.6, [190, 460, 730, 1320, 1580, 1780], {clap, seed: 5, frame: clapFrame, dy: down(8.6)});
    S.seatTable(k, 980, 660 + frontDy, 1760, 'rowB', 34);
    S.guests(k, 880 + frontDy * 1.4, 11, [170, 500, 830, 1250, 1580], {clap, seed: 7, frame: clapFrame, dy: down(11)});
    S.seatTable(k, 900, 870 + frontDy * 1.4, 1640, 'rowC', 40);
  }
  return a;
}
function outside(k, opts = {}) {
  S.outsideWindow(k, opts);
}
const hallRedLines = (k, grow, dy = 0) => {
  const paths = [[[1040, 1050], [1040, 905], [90, 905], [1700, 905]], [[1040, 905], [1040, 690], [90, 690], [1830, 690]], [[560, 690], [560, 490], [230, 490], [870, 490]]];
  const widths = [9, 8, 7];
  paths.forEach((pts, i) => {
    const part = S.partial(pts.map(([x, y]) => [x, y + dy * (1.4 - i * 0.2)]), grow * 3 - i);
    if (part.length > 1) S.redLine(k, part, widths[i]);
  });
};
const pastPrints = k => [640, 680, 720, 760, 800].forEach((y, i) => {
  k.mark(ellipse(690 + i * 7, y, 10 + i, 5 + i * 0.5), 'rgba(150,110,70,.34)', 'prints');
  k.mark(ellipse(1230 - i * 7, y, 10 + i, 5 + i * 0.5), 'rgba(150,110,70,.34)', 'prints');
});
// 冷色纸片贴在身体上的位置（设计像素），L32 一片片贴上，L42 一片片掉下。
const COLD_PATCHES = (() => {
  const out = [];
  for (let y = 8; y < 22; y += 3.5) for (let x = 6; x < 26; x += 4) out.push([x, y]);
  return out;
})();
function coldPatch(k, a, foot, cx, index, off = [0, 0], turn = 0) {
  const [x, y] = COLD_PATCHES[index];
  const px = cx - 16 * a.u + (x + 2) * a.u + off[0], py = foot - 27 * a.u + (y + 1.75) * a.u + off[1];
  k.cut(rotated(px, py, 4.2 * a.u, 3.7 * a.u, turn), COLD[`#${index % 3 ? 'da7758' : 'ed9b75'}`], {lift: 0.2, border: 1});
}

export const POSES = {
  P01: {keys: ['me', 'chapel', 'bigInvite', 'placeCard'], draw(k, T) {
    k.camera(960, 540, L(0.97, 1, T.sec(0, 6.4)));
    S.road(k, {prints: [0.77, 0.8, 0.83, 0.86, 0.89, 0.92]});
    const [x, y] = S.roadPoint(0.7);
    const a = me(k, Math.round(x), Math.round(y), 10, {facing: 'back', action: 'hold'});
    S.invitation(k, a.grip[0] + 30, a.grip[1] + sway(T, 1.5, 3), 76, -4 + sway(T, 2.5, 3), 'invite');
    S.roadForeground(k, {bigInvite: T.leaving === null});
    snowy(k, 40, 2026);
    S.confetti(k, 12, 2027, {x0: 980, y0: 400, x1: 1530, y1: 640, fall: 18});
  }},
  P02: {keys: ['me', 'photo', 'dustMug'], draw(k, T) {
    const cam = mix([670, 700, 1.5], [960, 540, 1], T.sec(0.8, 5));
    const wipe = T.sec(5, 7.2), wiping = wipe > 0 && wipe < 1;
    S.windowOutside(k, () => {
      me(k, FROST_ME[0] + (wiping ? sway(T, 6) : 0), FROST_ME[1], FROST_ME[2]);
      S.frost(k, [1150, 650, 250 * wipe, 190 * wipe]);
      tally(k);
    }, cam);
    outerSill(k);
  }},
  L01: {keys: ['me', 'tally'], draw(k, T) {
    const cam = mix([960, 540, 1], [1200, 540, 1.28], T.in(0, 2));
    const stroke = T.sec(1.6, 2.4), writing = stroke > 0 && stroke < 1;
    S.windowOutside(k, () => {
      me(k, FROST_ME[0] + (writing ? sway(T, 4) : 0), FROST_ME[1], FROST_ME[2]);
      S.frost(k, [1150, 650, 250, 190]);
      tally(k, stroke);
    }, cam);
    outerSill(k);
  }},
  L02: {keys: ['me', 'photo', 'calendarPage', 'calendar'], draw(k, T) {
    S.roomInside(k);
    const walk = T.in(0, 2), tear = T.in(2, 3), drop = T.sec(6.2, 8.6);
    const [x, y, u] = mix([896, 898.4, 17.92], [720, 860, 17], walk);
    const a = me(k, x, y, u, {expression: T.b >= 3 ? 'sad' : 'neutral', action: walk < 1 ? 'walk' : 'hold', frame: beatStep(T, 2)});
    longSill(k);
    S.oldPhoto(k, 1370, 790, 240, -4);
    S.phone(k, 1796, 686, 2, {lit: false, deg: 7});
    if (tear > 0) {
      const inHand = [a.grip[0] + 90, a.grip[1] - 70];
      const [px, py] = drop > 0 ? [L(inHand[0], PAGE[0], drop), L(inHand[1], PAGE[1], drop) + Math.sin(drop * 9) * 14] : [L(400, inHand[0], tear), L(340, inHand[1], tear)];
      k.cut(rotated(px, py, 150, 170, L(24, PAGE[2], drop)), C.cream, {lift: 1.4, border: 4, name: 'calendarPage'});
    }
    if (walk < 1) {
      S.windowOverlay(k, [1200, 540, L(1.28, 7.4, walk * walk)], () => {
        S.frost(k, [1150, 650, 250, 190]);
        tally(k, 1);
        k.cut(rect(320, 800, 1280, 56), C.wood, {lift: 1.2, border: 5, name: 'sill'});
        S.sillThings(k, {x: -220});
      });
    }
  }},
  L03: {keys: ['phone', 'phoneSign', 'photo', 'me'], draw(k, T) {
    const push = T.in(0, 2), walkIn = T.end(1.7, 0.2);
    k.camera(...mix([960, 540, 1], [1620, 670, 1.25], push));
    S.roomInside(k);
    const moving = push < 1 || (walkIn > 0 && walkIn < 1);
    me(k, L(L(720, 992, push), 1476, walkIn), 860, 17, {action: moving ? 'walk' : 'idle', frame: beatStep(T, 2)});
    k.vellum(0.42, '#eef0e6', L(1920, 0, push));
    longSill(k);
    S.oldPhoto(k, 1370, 790, 240, -4);
    fallenPage(k);
    S.phone(k, 1796 + sway(T, 3) + T.u * 2, 686, 2, {deg: 7 + sway(T, 0.8)});
    if (push >= 1) {
      k.camera(960, 540, 1);
      if (beatStep(T, 2) % 2) [[920, 380, 880, 480], [1440, 410, 1486, 510], [920, 690, 880, 760], [1440, 680, 1486, 740]].forEach(([a, b, c, d]) => k.line([[a, b], [c, d]], C.red, 8, 3));
    }
  }},
  L04: {keys: ['me', 'phone', 'roomWindow'], draw(k, T) {
    const pull = T.in(0, 1), still = T.b >= 1;
    if (still) { k.freeze(); k.clock = T.abs - T.u + 0.8; }
    const cam = mix([1620, 670, 1.25], [960, 540, 1], pull);
    k.camera(...cam);
    S.roomInside(k);
    const [x, y, u] = toWorld(cam, mix([780, 777.5, 21.25], [860, 900, 19], pull));
    me(k, x, y, u, {action: 'hold'});
    if (pull < 1) k.vellum(0.42, '#eef0e6', 0, L(1920, 0, pull));
    roomSill(k);
    fallenPage(k);
    const a = {grip: [(x - 16 * u + 29.5 * u - cam[0]) * cam[2] + 960, (y - 27 * u + 24.5 * u - cam[1]) * cam[2] + 540]};
    k.camera(960, 540, 1);
    const hand = [a.grip[0] + 46, a.grip[1] - 34.5];
    S.phone(k, L(1180, hand[0], pull), L(560, hand[1], pull), L(2.5, 1.15, pull), {deg: L(7, 0, pull)});
  }},
  L05: {keys: ['me', 'bubble'], draw(k, T) {
    k.clock = T.abs - 7.884;
    k.camera(...mix([960, 540, 1], [1420, 314, 3.19], T.in(0, 2)));
    S.roomInside(k);
    k.note('bigWindow', rect(1160, 170, 520, 250));
    roomSill(k);
    fallenPage(k);
    k.camera(960, 540, 1);
    const r = rng(41), spots = [[310, 200], [560, 170], [830, 150], [1090, 150], [1360, 170], [1610, 210], [260, 420], [500, 390], [1420, 390], [1680, 420], [300, 660], [530, 610], [1400, 610], [1660, 660], [760, 310], [1170, 310]];
    spots.map(([x, y], i) => ({x, y, i, w: 170 + r() * 90})).reverse().forEach(({x, y, i, w}, order) => {
      const at = Math.ceil(order / 3);
      if (T.b < at) return;
      S.bubble(k, x, y, w * (1.3 - 0.3 * T.in(at, at + 0.3)), [C.red, C.gold, C.cream][i % 3], {tail: i % 2 ? 1 : -1});
    });
    const a = me(k, 860, 900, 19, {expression: T.b >= 1 ? 'sad' : 'neutral', action: 'hold'});
    heldPhone(k, a, 1.15);
  }},
  L06: {keys: ['bride', 'groom', 'dress', 'scissors'], draw(k, T) {
    const pull = T.sec(1, 4.2);
    k.camera(...mix([1160, 700, 2.1], [960, 540, 1], pull));
    k.torn(rect(30, 26, 1860, 620), C.wallShade, {tex: 'news', lift: 0.3});
    S.bride(k, 330, 590, 16, {expression: 'shy'});
    S.groom(k, 1600, 590, 16);
    k.cut(rect(60, 540, 1800, 510), C.envelope, {lift: 1.1, border: 6, name: 'table'});
    k.cut(rotated(960, 690, 980, 650, -1), C.oldDark, {lift: 0.8, border: 5, name: 'dressPaper'});
    k.cut([[900, 400], [1020, 400], [1060, 470], [1010, 590], [1150, 930], [770, 930], [910, 590], [860, 470]], C.bank, {lift: 1.1, border: 5, name: 'dress'});
    // 剪刀沿右侧虚线走，定格时停在最后 6 个虚线点之前，片尾走完。
    const path = [[1060, 470], [1010, 590], [1118, 810], [1158, 910]];
    const cut = L(0, 0.86, T.sec(0.4, 4.4)) + 0.14 * T.sec(4.7, 5.3);
    const done = S.partial(path, cut), tip = done.at(-1);
    const rest = S.partial([...path].reverse(), 1 - cut);
    for (let d = 0; d < rest.length - 1; d++) {
      const [ax, ay] = rest[d], [bx, by] = rest[d + 1], n = Math.floor(Math.hypot(bx - ax, by - ay) / 21);
      for (let i = 0; i < n; i++) { const f = i / n; k.line([[L(ax, bx, f), L(ay, by, f)], [L(ax, bx, f) - 6, L(ay, by, f) - 14]], C.ink, 4); }
    }
    const open = beatStep(T, 4) % 2 ? 14 : 0, dx = tip[0] - 1118, dy = tip[1] - 810;
    k.line([[1360 + dx, 690 + dy - open], [1140 + dx, 835 + dy]], C.ink, 15, 4, 'scissors');
    k.line([[1385 + dx, 850 + dy + open], [1120 + dx, 790 + dy]], C.ink, 15, 4, 'scissors');
    k.cut(circle(1395 + dx, 665 + dy - open, 36, 16), C.gold, {border: 4, name: 'scissors'});
    k.cut(circle(1425 + dx, 860 + dy + open, 36, 16), C.gold, {border: 4, name: 'scissors'});
  }},
  L07: {keys: ['me', 'invite'], draw(k, T) {
    // T08：相机从封面用两拍拉开，这张封面就是手里的喜帖，z=11.3 时它盖满全屏。
    const pull = Math.max(0, T.linear(0.4, 2)), ease = 1 - (1 - pull) ** 3, z = 11.3 ** (1 - ease);
    const nod = T.in(3.4, 4) * (1 - T.in(4, 4.6)) * 9;
    const center = [1303.6, 861.6 + nod];
    k.camera(L(center[0], 960, ease), L(center[1], 540, ease), z);
    S.roomInside(k, {calendar: false, windowBack: false});
    const a = me(k, 960, 930 + nod, 20, {action: 'hold'});
    heldInvite(k, a, 11.5 * 20);
    // 相机站在门口，两扇开着的门板在前景，T09 从这里关上。
    if (T.leaving === null) {
      k.cut([[30, 26], [250, 70], [250, 1010], [30, 1054]], C.door, {lift: 1.6, border: 6, name: 'doorFront'});
      k.cut([[1890, 26], [1670, 70], [1670, 1010], [1890, 1054]], C.door, {lift: 1.6, border: 6, name: 'doorFront'});
    }
  }},
  L08: {keys: ['me', 'doorLeaf'], draw(k, T) {
    const pull = T.in(0, 2);
    k.camera(960, L(583.4, 540, pull), L(20 / 17, 1, pull));
    S.doorOutside(k);
    const a = me(k, 960 + sway(T, 2.5), 915, 17, {expression: T.b >= 1 ? 'sad' : 'neutral', action: 'hold'});
    heldInvite(k, a, 11.5 * 17);
    const r = rng(9);
    for (let i = 0; i < 26; i++) {
      const x = ((90 + r() * 1740 + k.clock * 620) % 1760) + 80, y = 80 + r() * 800;
      k.line([[x, y], [x + 70, y - 22]], C.white, 3);
    }
    S.flakes(k, 62, 8, {size: 15, y1: 1050, fall: 70, wind: 170});
  }},
  L09: {keys: ['me', 'arch', 'bunting', 'invite'], draw(k, T) {
    const pull = T.in(0, 2), z = L(17 / 14, 1, pull);
    const base = [960, L(621, 540, pull), z];
    S.approachRoad(k, {base, bunting: L(4, 1, T.sec(1.6, 4.4)), arch: L(4, 1, T.sec(3.2, 5.6))});
    const walking = T.b >= 3 && T.u < 5.5;
    const a = me(k, 960, 930, 14, {action: walking || T.b < 3 ? 'walk' : 'hold', frame: walking ? beatStep(T) : 0});
    if (walking || T.b < 3) S.invitation(k, a.right[0] + 40, a.right[1] - 6, 11.5 * 14, -6);
    else heldInvite(k, a, 11.5 * 14);
    snowy(k, 26, 4);
    // 更近一道花门的立柱，T11 由它扫过全屏。
    if (T.leaving === null) {
      const inX = L(240, 0, T.sec(4.8, 5.4));
      for (let j = 0; j < 10; j++) k.cut(circle(1860 + inX + (j % 2) * 34, 40 + j * 112, j % 3 ? 62 : 80, 14), [C.cream, C.red, C.gold, C.petal][j % 4], {border: 4, lift: 1.6, name: 'archPost'});
    }
  }},
  L10: {keys: ['me', 'rosette', 'rosetteWord', 'poster'], draw(k, T) {
    S.foyer(k);
    S.signTable(k, 420, 800, 680);
    const walk = T.in(0, 4), slide = T.in(3.2, 4.6), pin = T.in(4.4, 5.2), staffIn = T.in(3.6, 4.6), staffOut = T.in(5.4, 6.4);
    const [x, y, u] = mix([960, 930, 14], [900, 1010, 22], walk);
    const staffX = L(L(1420, 1200, staffIn), 1420, staffOut);
    const staff = k.clawd(staffX, 1010, 22, {role: 'staff', expression: 'happy', tint: S.guestTint(0), action: staffIn > 0 && staffIn < 1 || staffOut > 0 && staffOut < 1 ? 'walk' : 'idle', frame: beatStep(T, 2)});
    const carrying = T.b < 3.2;
    const a = me(k, x, y, u, {expression: T.b >= 1 ? 'sad' : 'neutral', action: carrying ? 'walk' : 'hold', frame: beatStep(T)});
    const rosetteAt = {chest: mix([staff.left[0] - 100, staff.left[1] - 20], a.chest, pin), u: a.u};
    if (T.b >= 3.6) S.rosette(k, rosetteAt, {big: true});
    if (!carrying) S.oldPhoto(k, a.grip[0] + 24, a.grip[1] - 36, 110, -5, {name: 'heldPhoto'});
    const hand = carrying ? [a.right[0] + 40, a.right[1] - 6] : [a.grip[0] + 40, a.grip[1] - 18];
    S.invitation(k, L(hand[0], 360, slide), L(hand[1], 760, slide), L(11.5 * u, 150, slide), L(-6, -8, slide), 'invite');
  }},
  L11: {keys: ['me', 'giftBox', 'photoCorner'], draw(k, T) {
    const pan = T.in(0, 3), give = T.in(4, 5.6), done = give >= 1;
    k.camera(L(960, 2280, pan), 540, 1);
    S.foyer(k);
    S.signTable(k, 420, 800, 680);
    S.invitation(k, 360, 760, 150, -8, 'invite');
    if (T.b < 3) k.clawd(L(1420, -300, T.in(0, 2.6)), 1010, 22, {role: 'staff', expression: 'happy', facing: 'left', action: 'walk', frame: beatStep(T, 2), tint: S.guestTint(0)});
    const moving = pan > 0 && pan < 1;
    const worldX = L(900, 2120, pan), foot = L(1010, 910, pan), u = L(22, 18, pan);
    const a = me(k, worldX, foot, u, {expression: 'sad', action: moving ? 'walk' : 'hold', frame: beatStep(T, 2)});
    S.giftBox(k, 2510, 930, 1.05, {photoCorner: done});
    S.rosette(k, a);
    if (!done) {
      const hand = moving ? [a.right[0] + 24, a.right[1] - 36] : [a.grip[0] + 24, a.grip[1] - 36];
      S.oldPhoto(k, L(hand[0], 2514, give), L(hand[1], 700, give), L(110 * u / 22, 158, give), L(-5, -3, give), {name: 'heldPhoto'});
    }
  }},
  L12: {keys: ['me', 'cake', 'redLine', 'toyBride', 'toyGroom'], draw(k, T) {
    const pan = T.in(0, 3), pull = T.in(2.8, 4), slip = T.end(2, 0.6);
    k.camera(L(2280, 960 + CORRIDOR, pan), 540, 1);
    S.foyer(k, {poster: false});
    S.signTable(k, 1340 + CORRIDOR, 800, 900);
    S.cake(k, 1340 + CORRIDOR, 800, 1.7);
    const moving = pan > 0 && pan < 1;
    const a = me(k, L(2120, 500 + CORRIDOR, pan) - pull * (1 - slip) * sway(T, 5, 4), L(910, 930, pan), 18, {expression: 'sad', action: moving ? 'walk' : 'hold', frame: beatStep(T, 2)});
    S.rosette(k, a);
    if (T.b < 3.4) S.giftBox(k, 2510, 930, 1.05, {photoCorner: true});
    const y = 800 - 340 - 9 * 5.44;
    const toys = [[1234 + CORRIDOR, y], [1446 + CORRIDOR, y]];
    const hang = [1160 + CORRIDOR, 700];
    // 抓住之前红线垂在蛋糕边，抓住后绷紧；最后两拍脱手弹回。
    const hand = a.grip;
    const end = T.b < 2.8 ? hang : mix(hand, hang, slip);
    const mid = mix([1000 + CORRIDOR, T.b < 2.8 ? 700 : L(660, 560, pull)], [1200 + CORRIDOR, 600], T.b < 2.8 ? 1 : slip);
    S.redLine(k, [end, mid, ...toys]);
  }},
  L13: {keys: ['me', 'bride', 'gapTiles'], draw(k, T) {
    k.camera(960 + CORRIDOR, 540, 1);
    S.foyer(k, {poster: false});
    tiles(k);
    const back = T.in(1, 2);
    const a = me(k, L(500, 470, back) + CORRIDOR, L(930, 900, back), L(18, 15, back), {expression: T.b >= 1 ? 'shy' : 'sad', action: back > 0 && back < 1 ? 'walk' : 'idle', frame: beatStep(T, 2)});
    S.rosette(k, a);
    const enter = T.sec(0.7, 2.9);
    const b = S.bride(k, L(2340, 1450, enter) + CORRIDOR, 900, 15, {expression: 'neutral', action: enter > 0 && enter < 1 ? 'walk' : 'idle', frame: beatStep(T, 2)});
    heldEnvelope(k, b, 15 / 18);
  }},
  L14: {keys: ['me', 'bride', 'hook'], draw(k, T) {
    k.camera(960 + CORRIDOR, 540, 1);
    S.foyer(k, {poster: false});
    tiles(k);
    const walk = T.in(0, 2), step = walk > 0 && walk < 1;
    const a = me(k, L(470, 726, walk) + CORRIDOR, L(900, 930, walk), L(15, 18, walk), {expression: T.b >= 1 ? 'happy' : 'shy', action: step ? 'walk' : 'idle', frame: beatStep(T, 2)});
    S.rosette(k, a);
    const b = S.bride(k, L(1450, 1194, walk) + CORRIDOR, L(900, 930, walk), L(15, 18, walk), {expression: T.b >= 1 ? 'happy' : 'neutral', action: step ? 'walk' : 'idle', frame: beatStep(T, 2)});
    heldEnvelope(k, b, L(15, 18, walk) / 18);
    if (T.b >= 2) hookHands(k, 930 - 9.5 * 18 + sway(T, 9), 'hook', 960 + CORRIDOR);
  }},
  L15: {keys: ['me', 'bride', 'groom'], draw(k, T) {
    const wide = T.in(0, 2), part = T.in(2, 3), enter = T.in(0, 3);
    k.camera(...mix([960 + CORRIDOR, 540, 1], [1362 + CORRIDOR, 486, 15 / 18], wide));
    S.foyer(k, {poster: false});
    tiles(k);
    const a = me(k, 726 + CORRIDOR, 930, 18, {expression: T.b >= 1 ? 'neutral' : 'happy'});
    S.rosette(k, a);
    const b = S.bride(k, L(1194 + CORRIDOR, 4092, part), 930, 18, {action: part > 0 && part < 1 ? 'walk' : 'idle', frame: beatStep(T, 2)});
    if (T.leaving === null) heldEnvelope(k, b);
    S.groom(k, L(5400, 4680, enter), 930, 18, {action: enter > 0 && enter < 1 ? 'walk' : 'idle', frame: beatStep(T, 2)});
    if (T.b < 1) hookHands(k, 930 - 9.5 * 18, 'hook', 960 + CORRIDOR);
  }},
  L16: {keys: ['giftBox', 'envelope', 'bride', 'me'], draw(k, T) {
    const pull = Math.max(0, T.linear(0.4, 2)), ease = 1 - (1 - pull) ** 3, z = 8 ** (1 - ease), slide = T.in(3.4, 4.6);
    const push = T.leaving === null ? 0 : Math.min(1, T.leaving / 0.35);
    const cam = T.leaving === null ? [L(1275, 960, ease), L(770, 540, ease), z] : mix([960, 540, 1], [887, 556, 8], push * push);
    k.camera(...cam);
    S.foyer(k, {poster: false});
    me(k, 230, 900, 11, {expression: 'sad'});
    k.vellum(0.42, '#ecd5a4');
    S.signTable(k, 960, 860, 1180);
    S.bride(k, 1490, 950, 15, {expression: 'neutral'});
    S.giftBox(k, 880, 920, 1.75, {photoCorner: true});
    S.redEnvelope(k, L(1275, 887, slide), L(770, 556, slide), 1.75);
  }},
  I01: {keys: ['me', 'bride', 'hook', 'prints'], draw(k, T) {
    // 从勾住的手分段拉开，低能量区 01:54.683–01:56.866 相机不动。
    const pull = 0.45 * T.sec(0.8, 2.4) + 0.55 * T.sec(4.6, 7.5), z = 5 ** (1 - pull);
    k.camera(960, L(709, 540, pull), z);
    S.pastSnow(k);
    pastPrints(k);
    snowy(k, 22, 13, {size: 9});
    me(k, 726, 880, 18, {expression: 'happy'});
    S.bride(k, 1194, 880, 18, {gown: false});
    hookHands(k, 880 - 9.5 * 18 + sway(T, 3, 0.5));
  }},
  I02: {keys: ['me', 'placeCard', 'exitDoor'], draw(k, T) {
    k.camera(...mix([960, 540, 1], [1000, 390, 1.5], T.sec(0.8, 8.4)));
    hallRows(k, {foot: L(430, 470, T.sec(5.8, 6.8))});
  }},
  L17: {keys: ['me', 'bell', 'hallWindow'], draw(k, T) {
    const push = T.in(0, 2);
    k.camera(...mix([1000, 390, 1.5], [1035, 295.07, 15 / 6.4], push));
    const swinging = T.b >= 2, rings = swinging ? [[2, 0], [3.2, 1], [4.4, 2]].filter(([at]) => T.b >= at).map(([at]) => 118 + (T.b - at) * 200) : [];
    hallRows(k, {front: push < 1, frontDy: push * 700, foot: 470 - T.in(2.4, 3) * 4, swing: swinging ? Math.sin(T.b * Math.PI) * 16 : 0, rings});
  }},
  L18: {keys: ['bride', 'groom', 'altar', 'carpet'], draw(k, T) {
    S.stage(k);
    S.bride(k, 1240, 840, 13, {expression: 'shy'});
    const walk = T.sec(0.8, 6.3), last = T.end(3, 0.2);
    const a = S.groom(k, L(L(-140, 640, walk), 990, last), L(L(925, 905, walk), 890, last), 13, {facing: 'right', action: 'walk', frame: beatStep(T)});
    k.cut(rect(a.right[0] + 2, a.right[1] - 18, 58, 44), C.red, {lift: 1, border: 4, name: 'ringBox'});
  }},
  L19: {keys: ['bride', 'groom', 'altar', 'ringBox'], draw(k, T) {
    k.camera(...mix([960, 540, 1], [1160, 560, 1.18], T.in(0, 2)));
    S.stage(k);
    S.bride(k, L(1240, 1290, T.in(0, 2)), 840, 13, {expression: 'shy'});
    const kneel = T.in(3, 3.8);
    const a = S.groom(k, 990, 890, 13, {facing: 'right', deg: 7 * kneel});
    k.cut(rect(a.right[0] + 2, a.right[1] - 18, 58, 44), C.red, {lift: 1, border: 4, name: 'ringBox'});
    if (kneel > 0) k.mark(ellipse(a.right[0] + 31, a.right[1] - 22, 14 * kneel, 14 * kneel, 16), C.gold, 'ringBox');
  }},
  L20: {keys: ['ring'], draw(k, T) {
    // 相机在 L19 的同一世界里持续推到手，头纱这张白纸经花门前面滑过来，盖住新郎和背景。
    const push = T.linear(0, T.poster), ease = push * push * (3 - 2 * push);
    const z = 1.18 * (4.923 / 1.18) ** ease;
    k.camera(L(1160, 1166.5, ease), L(560, 716.5, ease), z);
    S.stage(k);
    const g = S.groom(k, 990, 890, 13, {facing: 'right', deg: 7});
    const boxAt = [g.right[0] + 2, g.right[1] - 18];
    k.cut(rect(boxAt[0], boxAt[1], 58, 44), C.red, {lift: 1, border: 4, name: 'ringBox'});
    const sheet = T.sec(1, 4.8);
    if (sheet > 0) k.torn([[L(1760, 700, sheet), 120], [1900, 120], [1900, 1000], [L(1760, 700, sheet), 1000]], C.white, {lift: 0.3});
    if (sheet >= 1) {
      k.camera(960, 540, 1);
      S.flakes(k, 18, 66, {color: C.petal, size: 34, y1: 1050, fall: 24});
      k.camera(L(1160, 1166.5, ease), L(560, 716.5, ease), z);
    }
    S.bride(k, 1290, 840, 13, {expression: 'happy'});
    // 戒指的大小按特写时的画面算：宽约 96 像素、高约 288 像素。
    const ring = T.sec(0.2, 6.3), [x, y] = [L(boxAt[0] + 29, 1130.75, ring), L(boxAt[1] - 4, 716.5, ring)];
    k.layer(() => {
      k.mark(ellipse(x, y, 9.75, 29.25, 22), C.gold, 'ring');
      k.mark(ellipse(x + 1.3, y, 3.9, 22, 22), C.orange);
      k.cut([[x, y - 55], [x + 9.75, y - 39], [x, y - 26], [x - 9.75, y - 39]], C.cream, {border: 1, lift: 0.1, name: 'ring'});
    });
  }},
  L21: {keys: ['me', 'guest'], draw(k, T) {
    k.camera(...mix([960, 540, 1], [960, 520, 1.1], T.sec(0.4, T.poster)));
    hallRows(k, {clap: T.b >= 0.5, clapFrame: beatStep(T, 2), rise: T.in(0.3, 1.5), me: {expression: 'sad'}});
    S.confetti(k, 58, 21, {x0: 90, y0: 500, x1: 1830, y1: 950, fall: 60});
  }},
  L22: {keys: ['me', 'redLine'], draw(k, T) {
    k.camera(...mix([960, 520, 1.1], [960, 450, 1.14], T.in(0, 2)));
    hallRows(k, {clap: T.b < 1, clapFrame: beatStep(T, 2), me: {expression: 'sad'}});
    hallRedLines(k, T.sec(0.1, 4.4));
    k.cut(circle(870, 490, 13 * T.sec(4.2, 4.5), 12), C.red, {border: 3, lift: 0.4, name: 'redEnd'});
    if (T.b < 4) S.confetti(k, 58, 21, {x0: 90, y0: 500, x1: 1830, y1: 950, fall: 60, dy: T.u * 340});
  }},
  L23: {keys: ['me', 'glass'], draw(k, T) {
    const push = T.in(0, 3), lift = T.in(1, 3);
    k.camera(...mix([960, 450, 1.14], [1035, 345.2, 3.125], push));
    const a = hallRows(k, {front: push < 1, frontDy: push * 700, glass: false, me: {action: 'hold', expression: T.b >= 1 ? 'neutral' : 'sad'}});
    if (push < 1) { hallRedLines(k, 1, push * 700); k.cut(circle(870, 490 + push * 700, 13, 12), C.red, {border: 3, lift: 0.4}); }
    S.glass(k, L(1170, a.grip[0] + 4.5, lift), L(462, a.grip[1] + 4.5, lift), L(0.71, 0.512, lift));
  }},
  L24: {keys: ['me', 'exitDoor', 'exitSign'], draw(k, T) {
    // 他把自己按低，手臂正好到桌沿高度，手臂长度不变，两手自然压在桌面上。按桌时席卡被碰歪滑开，L26 才有得扶。
    k.camera(...mix([1035, 345.2, 3.125], [1115, 402, 2.5], T.in(0, 2)));
    const press = T.in(2, 4), down = T.in(0, 1), slideCard = T.in(1.5, 3.4);
    const a = hallRows(k, {front: false, foot: L(470, 526, press), rosette: false, glass: down >= 1, card: [L(1035, 880, slideCard), 478, 130, -9 * slideCard], me: {expression: T.b >= 1 ? 'sad' : 'neutral', action: down < 1 ? 'hold' : 'idle'}});
    S.rosette(k, {chest: [a.chest[0], a.chest[1] - 16 * press], u: a.u});
    if (down < 1) S.glass(k, L(a.grip[0] + 4.5, 1170, down), L(a.grip[1] + 4.5, 462, down), L(0.512, 0.71, down));
    k.camera(960, 540, 1);
    const inX = L(900, 0, T.in(3.2, 4.4));
    if (inX < 900) S.flakes(k, 9, 124, {x0: 1250, y0: 120, x1: 1860, y1: 760, color: C.petal, size: 26, name: 'petal', dx: inX, dy: Math.sin(T.u * 2) * 8});
  }},
  L25: {keys: ['bride', 'me', 'peel'], draw(k, T) {
    k.camera(960, 540, L(0.97, 1, T.sec(0.4, 3.4)));
    k.torn(rect(30, 26, 1860, 1028), C.hall, {tex: 'news', lift: 0.3});
    S.flakes(k, 36, 25, {color: C.petal, size: 30, y1: 1050, fall: 18});
    S.bride(k, 760, 1060, 28);
    const peel = T.sec(3.6, 5.4), edge = L(1890, 1120, peel);
    k.camera(960, 540, 1);
    if (peel > 0) {
      k.clipped(rect(edge, 20, 1900 - edge, 1040), () => {
        k.torn(rect(1120, 30, 770, 1020), '#fff4dc', {lift: 1.4, name: 'peel'});
        k.cut(circle(1500, 240, 90, 30), C.sun, {lift: 0.5, border: 7});
        me(k, 1380, 930, 14, {action: 'hug', expression: 'happy'});
        S.bride(k, 1640, 930, 14, {action: 'hug', gown: false, name: 'pastBride'});
      });
      const d = edge - 1120;
      k.cut([[1120 + d, 30], [1040 + d, 300], [1160 + d, 340]], C.white, {lift: 1.5, border: 4, name: 'peel'});
    }
  }},
  L26: {keys: ['placeCard', 'placeCardWord', 'me'], draw(k, T) {
    // 背景是 L27 的同一面墙，相机向右横移 540 像素后接上。
    k.camera(935.4, 349.1, 2.8125);
    S.hall(k, {door: true, bell: true});
    k.camera(960, 540, 1);
    me(k, 1240, 800, 13, {expression: 'sad'});
    k.vellum(0.3, '#ecd5a4');
    k.cut(rect(40, 730, 1840, 320), C.cream, {lift: 1.3, border: 6, name: 'seatTable'});
    S.placeCard(k, 700, 720, 660, L(-13, -2, T.sec(1.4, 4)));
    S.glass(k, 1620, 742, 2);
  }},
  L27: {keys: ['me', 'tickets', 'glass'], draw(k, T) {
    const pan = T.in(0, 2), cam = [L(935.4, 1127.4, pan), 349.1, 2.8125], put = T.in(3, 5.4), line = T.end(2, 0.2);
    k.camera(...cam);
    const box = toWorld(cam, mix([1240, 800, 13], [700, 880, 18], pan));
    const near = pan < 1;
    const a = hallRows(k, {front: false, row: false, card: false, glass: !near, foot: box[1], meU: box[2], rosette: true, me: {action: T.b >= 2 ? 'hold' : 'idle', expression: T.b >= 1 ? 'neutral' : 'sad'}});
    if (T.b >= 2) S.ticketStubs(k, L(a.grip[0], 1150, put), L(a.grip[1], 466, put), 0.71);
    k.camera(960, 540, 1);
    if (near) {
      k.vellum(0.3, '#ecd5a4', 0, L(1920, 0, pan));
      const top = L(730, 857, pan), bottom = L(1050, 941, pan);
      k.cut(rect(40, top, 1840, bottom - top), C.cream, {lift: 1.3, border: 6});
      S.glass(k, L(1620, 1080, pan), L(742, 857, pan), 2);
    }
    if (line > 0) {
      const tip = fromWorld(cam, [a.grip[0], a.grip[1]]);
      S.redLine(k, [[1990, 985], [L(1990, 1450, line), L(985, 870, line)], [L(1990, tip[0], line), L(985, tip[1], line)]], 12 * 0.8);
    }
    S.placeCard(k, L(700, 160, pan), 720, 660, -2, 'nearCard');
  }},
  L28: {keys: ['me', 'redLine'], draw(k, T) {
    const push = T.sec(0, T.poster), cam = mix([1127.4, 349.1, 2.8125], [1079.8, 353.4, 3.5625], push), z = cam[2];
    const world = (x, y) => [cam[0] + (x - 960) / z, cam[1] + (y - 540) / z];
    k.camera(...cam);
    const a = hallRows(k, {front: false, row: false, card: false, foot: L(470, 439.8, T.in(0, 1.2)), me: {expression: T.b >= 1 ? 'sad' : 'neutral', action: 'hold', deg: L(0, -7, T.in(0, 1.5)) + (T.b > 1.5 ? sway(T, 1.6, 4) : 0)}});
    S.ticketStubs(k, 1150, 466, 0.71);
    S.redLine(k, [world(1990, 985), world(1450, 870), a.grip], 12 / z);
    k.camera(960, 540, 1);
    S.placeCard(k, L(160, 116, push), L(720, 753, push), L(660, 836, push), -2, 'nearCard');
  }},
  L29: {keys: ['me', 'ripped'], draw(k, T) {
    S.pastSnow(k, {drain: true});
    const rip = T.sec(1.5, 2.4);
    const a = me(k, 726, 880, 18, {expression: 'happy', tint: OLD});
    if (rip < 1) {
      S.bride(k, 1194, 880, 18, {gown: false, tint: OLD, name: 'oldBride'});
      hookHands(k, 880 - 9.5 * 18);
    } else k.line([[a.right[0], a.right[1]], [a.right[0] + 26, a.right[1] - 6]], C.door, 7);
    if (rip > 0) {
      k.clipped(rect(1000, 0, 920, L(0, 1080, rip)), () => k.torn([[1000, 26], [1890, 26], [1890, 1054], [1000, 1054]], C.kraft, {tex: 'kraft', lift: 1.2, name: 'ripped'}));
      const cx = L(1240, 1500, rip), cy = L(640, 520, rip), deg = 17 * rip;
      if (T.leaving === null) {
        k.layer(() => {
          k.cut(rotated(cx, cy, 460, 620, deg), C.old, {tex: 'news', lift: 1.8, border: 8, name: 'ripped'});
          k.clawd(cx, cy + 210, 11, {role: 'torn', expression: 'happy', tint: OLD, deg});
        });
      }
    }
  }},
  L30: {keys: ['me', 'smilePaper'], draw(k, T) {
    S.hall(k, {door: true});
    const a = me(k, 960, 1020, 28, {expression: 'neutral'});
    const [cx, cy] = a.eye, flip = T.in(1, 1.6);
    if (flip > 0) {
      k.cut(rotated(cx, cy, 460 * flip, 190, -2), C.orange, {lift: 1, border: 6, name: 'smilePaper'});
      if (flip >= 1) {
        [-110, 110].forEach(dx => k.line([[cx + dx - 42, cy + 18], [cx + dx, cy - 22], [cx + dx + 42, cy + 18]], C.ink, 15));
        k.cut([[cx + 232, cy - 96], [cx + 180, cy - 90], [cx + 226, cy - 44]], C.white, {lift: 0.5, border: 3});
      }
    }
  }},
  L31: {keys: ['me', 'smilePaper', 'tear'], draw(k, T) {
    S.hall(k, {door: true});
    const a = me(k, 960, 1020, 28, {expression: 'sad'});
    const slip = T.in(1, 2.8), out = T.sec(2.6, 3.8), [ex, ey] = a.eye;
    const tears = T.in(1.6, 2.6);
    if (tears > 0) [[-90, 90], [120, 74], [-96, 180], [120, 170]].forEach(([dx, dy], i) => {
      const drip = (T.u * 90 + i * 70) % 260;
      k.cut(ellipse(a.eye[0] + dx, a.eye[1] + L(40, dy, tears) + (T.u > 2.3 ? drip : 0), 15, 24, 14), '#83bdcf', {border: 3, lift: 0.3, name: 'tear'});
    });
    const px = L(L(ex, 450, slip), 260, out), py = L(L(ey, 700, slip), 1360, out), deg = L(-2, 28, slip) + 30 * out;
    k.layer(() => {
      k.cut(rotated(px, py, L(460, 400, slip), L(190, 165, slip), deg), C.orange, {lift: 1.8, border: 6, name: 'smilePaper'});
      [-100, 100].forEach(dx => k.line([[px + dx - 36, py + 20 + dx * 0.53 * slip + 16], [px + dx, py + 20 + dx * 0.53 * slip - 18], [px + dx + 36, py + 20 + dx * 0.53 * slip + 22]], C.ink, 13));
    });
  }},
  L32: {keys: ['me', 'exitDoor', 'warmDoor'], draw(k, T) {
    const pull = T.in(0, 3), z = L(28 / 17, 1, pull), close = T.sec(5.4, 6.6);
    k.camera(960, L(638.6, 540, pull), z);
    k.torn(rect(30, 26, 1860, 700), C.wallShade, {tex: 'news', lift: 0.3});
    k.cut(rect(610, 130, 700, 650), C.warm, {lift: 0.4, border: 9, name: 'warmDoor'});
    k.cut(mix2([[1310, 130], [1600, 90], [1600, 830], [1310, 780]], [[1310, 130], [610, 130], [610, 780], [1310, 780]], close), C.door, {lift: 1.2, border: 7, name: 'exitDoor'});
    k.torn([[30, 730], [640, 760], [1400, 740], [1890, 730], [1890, 1054], [30, 1054]], C.snow, {lift: 1});
    const stepping = close < 1;
    const a = me(k, 960, 930, 17, {expression: 'sad', action: T.b >= 1 && stepping ? 'walk' : 'idle', frame: beatStep(T), tint: T.u >= T.poster - 0.2 ? COLD : undefined});
    if (T.u < T.poster - 0.2) COLD_PATCHES.forEach((_, i) => { if (T.u > 2.6 + i * 0.09) coldPatch(k, a, 930, 960, i); });
    S.rosette(k, a);
    snowy(k, 30, 32);
  }},
  L33: {keys: ['me', 'curtain', 'spotlight', 'stageFrame'], draw(k, T) {
    const pull = T.sec(0, T.poster - 0.2), z = L(17 / 13, 1, pull), cam = [960, L(532, 540, pull), z];
    k.camera(...cam);
    // 雪地这张纸没有更换，它和门、墙都换算到舞台的世界座标；门和墙是景片，前两拍吊出上缘。
    const start = pts => pts.map(([x, y]) => [960 + (x - 960) * 13 / 17, 532 + (y - 540) * 13 / 17]);
    S.paperStage(k, 1, {enter: T.in(0, 4), floor: () => {
      const lift = T.in(0, 2) * -1100;
      if (lift > -1100) {
        k.torn(start(rect(30, 26 + lift, 1860, 700)), C.wallShade, {tex: 'news', lift: 0.3});
        k.cut(start(rect(610, 130 + lift, 700, 650)), C.warm, {lift: 0.4, border: 4});
        k.cut(start(rect(610, 130 + lift, 700, 650)), C.door, {lift: 1.2, border: 5});
      }
      k.torn(start([[30, 730], [640, 760], [1400, 740], [1890, 730], [1890, 1054], [30, 1054]]), C.snow, {lift: 1});
    }});
    if (T.b >= 4) S.spotlight(k, 960);
    if (T.b >= 2) k.line([[730, 140], [730, L(140, 797.5, T.in(2, 4))]], C.gold, 6, 3, 'rope');
    const a = me(k, 960, 830, 13, {expression: 'sad', tint: COLD});
    S.rosette(k, a);
    if (T.b < 4) snowy(k, 30, 32, {dy: T.u * 340});
  }},
  L34: {keys: ['me', 'curtain', 'rope'], draw(k, T) {
    const walk = T.in(0, 2), pull = T.in(2.4, 4.8), close = T.end(2, 0.3);
    k.camera(...mix([960, 540, 1], [960, 495, 1.52], close));
    const open = L(L(1, 0.5, pull), 0, close);
    S.paperStage(k, open, {floor: () => k.torn([[30, 730], [640, 760], [1400, 740], [1890, 730], [1890, 1054], [30, 1054]].map(([x, y]) => [960 + (x - 960) * 13 / 17, 532 + (y - 540) * 13 / 17]), C.snow, {lift: 1})});
    const x = L(960, 554.5, walk);
    S.spotlight(k, L(960, 555, walk));
    const holding = walk >= 1;
    const a = me(k, x, 830, 13, {expression: 'sad', action: holding ? 'hold' : 'walk', frame: holding ? 0 : beatStep(T, 2), tint: COLD});
    S.rosette(k, a);
    const bob = pull > 0 && pull < 1 ? sway(T, 7) : 0;
    k.line([[730, 140], holding ? [a.grip[0], a.grip[1] + bob] : [730, 797.5]], C.gold, 6, 3, 'rope');
    // 幕布合拢后红色铺满全屏，T38 从这里打开。
    if (close >= 1) {
      k.camera(960, 540, 1);
      k.torn(rect(-60, -60, W / 2 + 60, 1200), C.red, {lift: 1.5});
      k.torn(rect(W / 2, -60, W / 2 + 60, 1200), C.red, {lift: 1.5});
    }
  }},
  L35: {keys: ['me', 'bride', 'groom'], draw(k, T) {
    outside(k);
    S.flakes(k, 16, 36, {x0: 70, y0: 70, x1: 1850, y1: 650, fall: 36});
    S.reflection(k, 1540 + sway(T, 10, 1), 560, 8);
    k.vellum(0.22, '#f4d48b');
    const nod = T.in(3.4, 4) * (1 - T.in(4, 4.6)) * 10;
    const a = me(k, 960, 930 + nod, 20, {expression: 'sad', tint: COLD});
    S.rosette(k, a);
    S.windowFrame(k);
  }},
  L36: {keys: ['rosette', 'ribbonLong', 'road', 'me'], draw(k, T) {
    outside(k);
    const away = T.in(0, 2), walk = T.in(0, 2);
    if (away < 1) { S.reflection(k, L(1540, 2400, away), 560, 8); k.vellum(0.22, '#f4d48b', L(0, 1920, away)); }
    const [x, y, u] = mix([960, 930, 20], [720, 980, 22], walk);
    const a = me(k, x, y, u, {expression: T.b >= 1 ? 'neutral' : 'sad', action: walk > 0 && walk < 1 ? 'walk' : 'idle', frame: beatStep(T, 2), tint: COLD});
    const wave = i => Math.sin(T.u * 7 + i) * 12;
    const ribbon = S.partial([[a.chest[0] + 121 * u / 22, a.chest[1] + 60 * u / 22], [1010, 760 + wave(1)], [1210, 790 + wave(2)], [1400, 770 + wave(3)], [1560, 820 + wave(4)]], T.sec(0.1, 2.6));
    if (ribbon.length > 1) k.line(ribbon, C.red, 16, 5, 'ribbonLong');
    S.rosette(k, a);
    S.windowFrame(k);
  }},
  L37: {keys: ['me', 'lightPatch'], draw(k, T) {
    outside(k);
    S.lightPatch(k, 440, L(1090, 770, T.in(2.6, 5)), 1040, 270);
    const back = T.in(0, 3), forth = T.in(3, 4.2);
    const [x, y, u] = mix(mix([720, 980, 22], [1180, 720, 12], back), [960, 762, 16], forth);
    const a = me(k, x, y, u, {expression: 'sad', action: 'walk', frame: forth < 1 ? beatStep(T, 2) : 1, tint: COLD});
    const ribbon = S.partial([[a.chest[0] + 5 * a.u, a.chest[1] + 2 * a.u], [1010, 760], [1210, 790], [1400, 770], [1560, 820]], 1 - T.in(0, 3));
    if (ribbon.length > 1 && back < 1) k.line(ribbon, C.red, 16, 5);
    S.rosette(k, a);
    snowy(k, 22, 37, {y1: 720});
    S.windowFrame(k);
  }},
  L38: {keys: ['me', 'rosetteWord', 'bride', 'groom'], draw(k, T) {
    outside(k);
    const push = T.in(0, 3);
    S.reflection(k, L(2300, 1400, push), 640, 12, {hug: true});
    S.confetti(k, 26, 38, {x0: 1090, y0: 200, x1: 1710, y1: 620, fall: 44});
    k.vellum(0.16, '#f4d48b', L(1920, 0, push));
    if (push < 1) S.lightPatch(k, 440, L(770, 1100, push), 1040, 270);
    const [x, y, u] = mix([960, 762, 16], [620, 1080, 26], push);
    const a = me(k, x, y, u, {expression: 'sad', tint: COLD});
    S.rosette(k, a, {big: true});
    S.windowFrame(k);
  }},
  L39: {keys: ['me', 'tear', 'photo'], draw(k, T) {
    outside(k);
    const pull = T.in(0, 3);
    if (pull < 1) { S.reflection(k, L(1400, 2300, pull), 640, 12, {hug: true}); k.vellum(0.16, '#f4d48b', L(0, 1920, pull)); }
    const [x, y, u] = mix([620, 1080, 26], [960, 690, 18], pull);
    const a = me(k, x, y, u, {expression: 'sad', tint: COLD});
    S.rosette(k, a);
    const photos = [[440, 760, -18], [620, 860, 12], [800, 800, -7], [1140, 810, 9], [1300, 880, -14], [1490, 770, 16], [930, 910, 4]];
    const spots = [[-60, 180], [-54, 330], [60, 240], [74, 410]];
    photos.forEach(([px, py, deg], i) => {
      const at = 0.5 + i * 0.65, drop = T.in(at, at + 1);
      if (drop >= 1) S.oldPhoto(k, px, py, 150 * (0.6 + 0.4 * T.in(at + 1, at + 1.3)), deg);
    });
    // 泪滴一滴接一滴落下，第 7 滴之后落得更慢，留在画面里直到片尾。
    spots.forEach(([dx, dy], i) => {
      const period = 2.6, f = ((T.b + i * 0.65) % period) / period, drip = L(120, 460, f);
      const yy = T.b >= 5.6 ? a.eye[1] + dy : a.eye[1] + drip;
      k.cut(ellipse(x + dx * u / 18, yy, 12, 19, 12), '#83bdcf', {border: 3, lift: 0.3, name: 'tear'});
    });
    S.windowFrame(k);
  }},
  L40: {keys: ['me', 'bubble'], draw(k, T) {
    outside(k);
    const rise = T.in(0, 2), up = T.in(2.5, 3.7), down = T.in(4.5, 6.7);
    if (rise < 1) [[440, 760, -18], [620, 860, 12], [800, 800, -7], [1140, 810, 9], [1300, 880, -14], [1490, 770, 16], [930, 910, 4]].forEach(([px, py, deg]) => S.oldPhoto(k, px, py + rise * 500, 150, deg));
    const [x, y, u] = mix([960, 690, 18], [1180, 930, 19], rise);
    const a = me(k, x, y, u, {expression: 'sad', action: rise > 0 && rise < 1 ? 'walk' : 'idle', frame: beatStep(T, 2), tint: COLD});
    S.rosette(k, a);
    const w = 520 * up * (1 - down);
    if (w > 8) S.bubble(k, L(980, 700, up), L(760, 410, up), w, C.white, {tail: 1});
    snowy(k, 14, 40, {y1: 650});
    S.windowFrame(k);
  }},
  L41: {keys: ['me', 'cloudLight'], draw(k, T) {
    S.outsideWindow(k, {sky: C.sky, cloud: true, clouds: T.in(0, 3.6)});
    const walk = T.in(0, 2.6), [x, y, u] = mix([1180, 930, 19], [960, 870, 18], walk);
    const a = me(k, x, y - T.in(2.8, 3.4) * 8, u, {action: walk > 0 && walk < 1 ? 'walk' : 'idle', frame: beatStep(T, 2), tint: COLD, expression: T.b >= 1 ? 'neutral' : 'sad'});
    S.rosette(k, a);
    if (T.b < 3.6) S.flakes(k, 14, 40, {y1: 650, fall: 46, dy: T.u * 180});
    S.windowFrame(k);
  }},
  L42: {keys: ['me', 'rosette'], draw(k, T) {
    S.outsideWindow(k, {sky: C.sky, cloud: true});
    const close = T.in(0, 2), shake = T.b >= 2 && T.b < 5;
    const [x, y, u] = mix([960, 862, 18], [960, 880, 20], close);
    const cold = T.b < 2;
    const a = me(k, x, y, u, {action: shake ? 'jump' : T.b >= 5 ? 'jump' : 'idle', frame: shake ? beatStep(T, 4) : 1, tint: cold ? COLD : undefined});
    // 冷色纸片从 b=2 起一片片掉下来，露出橙色。
    if (!cold) COLD_PATCHES.forEach((_, i) => {
      const at = 2 + i * 0.09, off = T.in(at, at + 0.7);
      if (off >= 1) return;
      const side = i % 2 ? 1 : -1;
      coldPatch(k, a, y, x, i, [side * off * 220, off * off * 520], off * 80 * side);
    });
    const fall = T.in(2.6, 4.4);
    S.rosette(k, {chest: mix(a.chest, [1280, 880], fall), u: L(u, 12, fall)});
    const r = rng(42), spread = T.in(2, 5);
    for (let i = 0; i < 26; i++) {
      const ang = r() * 6.28, d = 280 + r() * 240, rx = 9 + r() * 8, ry = 7 + r() * 5;
      if (spread > 0) k.cut(ellipse(960 + Math.cos(ang) * d * spread, 560 + Math.sin(ang) * d * 0.72 * spread, rx, ry, 10), C.white, {border: 2, lift: 0.3});
    }
    S.windowFrame(k);
  }},
  L43: {keys: ['me', 'bride', 'groom', 'guest'], draw(k, T) {
    S.steps(k);
    S.guests(k, 650, 7, [430, 560, 690, 1230, 1360], {seed: 43});
    S.groom(k, 880, 690, 8);
    S.bride(k, 1050, 690, 8);
    const walk = T.sec(0.5, T.poster - 0.15), [x, y, u] = mix([1728, 552, 3], [1590, 730, 8], walk);
    me(k, x, y, u, {action: 'walk', frame: walk < 1 ? beatStep(T) : 1});
  }},
  L44: {keys: ['me', 'bride', 'groom', 'photoFrame'], draw(k, T) {
    S.steps(k);
    S.guests(k, 650, 7, [430, 560, 690, 1230, 1360], {seed: 43});
    S.groom(k, 880, 690, 8);
    S.bride(k, 1050, 690, 8);
    const walk = T.in(0, 2), [x, y] = mix([1590, 730], [1520, 670], walk);
    me(k, x, y, 8, {expression: T.b >= 4 ? 'shy' : 'neutral', action: walk < 1 ? 'walk' : 'idle', frame: beatStep(T)});
    const press = T.in(3, 4), sink = T.sec(T.poster - 0.2, T.dur) * 6;
    if (press > 0) {
      const s = 1 - press;
      [[0, 0 - 70 * s, 1920, 70], [0, 870 + 210 * s, 1920, 210], [-70 * s, 0, 70, 1080], [1850 + 70 * s, 0, 70, 1080]].forEach(([fx, fy, w, h]) => k.cut(rect(fx, fy + sink, w, h), C.white, {lift: 1.1, border: 0, name: 'photoFrame'}));
    }
  }},
  L45: {keys: ['me', 'bride', 'groom', 'veilTuck'], draw(k, T) {
    S.steps(k);
    const out = T.in(0, 2.6);
    if (out < 1) S.guests(k, 650, 7, [L(430, -200, out), L(560, -60, out), L(690, 120, out), L(1230, 1800, out), L(1360, 2020, out)], {seed: 43});
    const set = T.in(0, 3), [gx, gy, gu] = mix([880, 690, 8], [1020, 700, 11], set), [bx, by, bu] = mix([1050, 690, 8], [1330, 700, 11], set);
    S.groom(k, gx, gy, gu);
    S.bride(k, bx, by, bu);
    const blown = 1 - T.in(2, 3.4);
    if (set >= 0.6) k.cut([[1240, 500], [L(1320, 1450, blown), L(492, 420, blown)], [L(1160, 1400, blown), L(600, 560, blown)]], C.cream, {lift: 0.9, border: 4, name: 'veilTuck'});
    const walk = T.sec(0.3, T.poster - 0.1), [x, y, u] = mix([1520, 670, 8], [500, 1010, 23], walk);
    me(k, x, y, u, {expression: 'shy', action: 'walk', frame: walk < 1 ? beatStep(T, 2) : 1});
  }},
  L46: {keys: ['me', 'bride', 'groom', 'hookFar'], draw(k, T) {
    S.steps(k);
    const set = T.in(0, 1.6), [gx, gy, gu] = mix([1020, 700, 11], [1100, 690, 9], set), [bx, by, bu] = mix([1330, 700, 11], [1334, 690, 9], set);
    S.groom(k, gx, gy, gu);
    S.bride(k, bx, by, bu);
    const hook = T.in(1.6, 2.6);
    if (hook > 0) k.cut(ellipse(1217, 690 - 9.5 * 9, 24 * hook, 17 * hook, 14), C.orange, {border: 4, lift: 0.6, name: 'hookFar'});
    // 05:08.709 起低能量区内停步。
    const walk = T.in(0, 2), [x, y, u] = mix([500, 1010, 23], [470, 1040, 27], walk), stopped = T.u >= 4.48;
    if (T.leaving === null) me(k, x, y, u, {action: 'walk', frame: stopped ? 1 : beatStep(T)});
  }},
  O01: {keys: ['me', 'chapel', 'bigInvite', 'placeCard'], draw(k, T) {
    const toPoster = T.sec(0.4, T.poster - 0.1), out = T.sec(T.poster + 0.2, T.dur - 0.9);
    const s = L(L(0.7, 0.82, toPoster), 1, out);
    const list = [];
    for (let t = 0.2; t <= s - 0.08 + 1e-6 && t < 0.95; t += 0.06) list.push(t);
    S.road(k, {prints: list.length ? list : null});
    const [x, y] = S.roadPoint(s);
    const walking = out < 1;
    me(k, Math.round(x), Math.round(y + out * out * 1000), L(L(10, 14, toPoster), 34, out), {action: 'walk', frame: walking ? beatStep(T) : 1});
    S.roadForeground(k);
  }},
  O02: {keys: ['chapel', 'prints', 'placeCard', 'road'], draw(k, T) {
    // 05:29.166 起纸片和雪全部停住。
    const FREEZE = 329.166 - 319.948, still = T.u >= FREEZE;
    if (still) { k.freeze(); k.clock = T.abs - T.u + FREEZE; }
    const list = [];
    for (let t = 0.2; t < 0.95; t += 0.06) list.push(t);
    const q = Math.min(T.u, FREEZE);
    S.road(k, {prints: list, printCover: Math.min(1, q / 8.6)});
    S.roadForeground(k, {wordCover: Math.min(1, q / 6.037)});
    S.flakes(k, Math.min(70, 1 + Math.floor(q * 10)), 52, {y1: 1050, fall: 46});
  }},
};

function mix2(a, b, e) { return a.map((p, i) => [L(p[0], b[i][0], e), L(p[1], b[i][1], e)]); }
