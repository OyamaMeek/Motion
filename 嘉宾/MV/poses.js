// 52 个镜头各一个关键画面。动作、朝向和物件依据 storyboard.md，keys 是这一镜观众必须看到的物件。
import {C, rect, circle, ellipse, rotated, rng} from './kit.js';
import * as S from './sets.js';

const COLD = {'#da7758': '#bd8c79', '#ed9b75': '#c99f89', '#b85d47': '#9f7564'};
const OLD = {'#da7758': '#c0a98c', '#ed9b75': '#d1bea2', '#b85d47': '#a8947a', '#713f32': '#7c6b58', '#352e2a': '#5a5146'};
const me = (k, cx, foot, u, opts = {}) => k.clawd(cx, foot, u, {role: 'me', ...opts});
const snowy = (k, n, seed, area) => S.flakes(k, n, seed, area);
const heldInvite = (k, a, w = 120) => S.invitation(k, a.grip[0] + w * 0.32, a.grip[1] - w * 0.08, w, -6);
const heldPhone = (k, a, s = 0.62) => S.phone(k, a.grip[0] + 40 * s, a.grip[1] - 30 * s, s);
const FROST_ME = [1150, 820, 14];

function hookHands(k, y, name = 'hook', x = 960) {
  k.cut(ellipse(x, y, 44, 30, 18), C.orange, {border: 5, lift: 0.8, name});
  k.line([[x - 26, y - 8], [x, y + 10], [x + 26, y - 8]], C.door, 7);
}
// 走廊的世界座标 = 画面座标 + 相机偏移。L11 偏移 1320，L12–L14 偏移 2670。
const CORRIDOR = 2670;
const tiles = k => k.cut([[810, 820], [1110, 820], [1160, 1050], [760, 1050]].map(([x, y]) => [x + CORRIDOR, y]), C.bank, {lift: 0.1, border: 2, name: 'gapTiles'});
const longSill = k => k.cut(rect(1040, 880, 1400, 60), C.path, {lift: 1.5, border: 5, name: 'sill'});
function tally(k, third = false) {
  [1350, 1395].forEach(x => k.line([[x, 560], [x - 8, 690]], C.roomDim, 13, 4, 'tally'));
  if (third) k.line([[1442, 560], [1432, 690]], C.ink, 15, 5, 'tally');
}
const outerSill = k => {
  k.cut(rect(320, 800, 1280, 56), C.wood, {lift: 1.2, border: 5, name: 'sill'});
  S.sillThings(k, {x: -220});
  snowy(k, 20, 11, {x0: 60, y0: 60, x1: 1860, y1: 760});
};
// 礼堂只有这一个世界，近景都是同一批物件加相机。主角后面没有客人，前排也在他的正前方留出空位。
// 相机越过前排后 front 为 false，row 为 false 时左右没有邻座。
function hallRows(k, {clap = false, me: meOpts = {}, foot = 470, front = true, row = true, card = true, glass = true, rosette = true} = {}) {
  S.hall(k, {door: true, bell: true});
  if (row) S.guests(k, 470, 6.4, [300, 480, 660, 840, 1230], {clap, seed: 3});
  const a = me(k, 1035, foot, 6.4, meOpts);
  if (rosette) S.rosette(k, a);
  S.seatTable(k, 770, 462, 1100, 'lastRow', 30);
  if (card) S.placeCard(k, 1035, 478, 130);
  if (glass) S.glass(k, 1170, 462, 0.71);
  if (front) {
    S.guests(k, 670, 8.6, [190, 460, 730, 1320, 1580, 1780], {clap, seed: 5});
    S.seatTable(k, 980, 660, 1760, 'rowB', 34);
    S.guests(k, 880, 11, [170, 500, 830, 1250, 1580], {clap, seed: 7});
    S.seatTable(k, 900, 870, 1640, 'rowC', 40);
  }
  return a;
}
function outside(k, opts = {}) {
  S.outsideWindow(k, opts);
}

export const POSES = {
  P01: {keys: ['me', 'chapel', 'bigInvite', 'placeCard'], draw(k) {
    S.road(k, {prints: [0.77, 0.8, 0.83, 0.86, 0.89, 0.92]});
    const [x, y] = S.roadPoint(0.7);
    const a = me(k, Math.round(x), Math.round(y), 10, {facing: 'back', action: 'hold'});
    S.invitation(k, a.grip[0] + 30, a.grip[1], 76, -4, 'invite');
    S.roadForeground(k);
    snowy(k, 40, 2026);
    S.confetti(k, 12, 2027, {x0: 980, y0: 400, x1: 1530, y1: 640});
  }},
  P02: {keys: ['me', 'photo', 'dustMug'], draw(k) {
    S.windowOutside(k, () => { me(k, FROST_ME[0], FROST_ME[1], FROST_ME[2]); S.frost(k, [1150, 650, 250, 190]); tally(k); });
    outerSill(k);
  }},
  L01: {keys: ['me', 'tally'], draw(k) {
    S.windowOutside(k, () => { me(k, FROST_ME[0], FROST_ME[1], FROST_ME[2]); S.frost(k, [1150, 650, 250, 190]); tally(k, true); }, [1200, 540, 1.28]);
    outerSill(k);
  }},
  L02: {keys: ['me', 'photo', 'calendarPage', 'calendar'], draw(k) {
    S.roomInside(k);
    const a = me(k, 720, 860, 17, {expression: 'sad', action: 'hold'});
    k.cut(rotated(a.grip[0] + 90, a.grip[1] - 70, 150, 170, 24), C.cream, {lift: 1.4, border: 4, name: 'calendarPage'});
    longSill(k);
    S.oldPhoto(k, 1300, 790, 240, -4);
    S.phone(k, 1796, 686, 2, {lit: false, deg: 7});
  }},
  L03: {keys: ['phone', 'phoneSign', 'photo', 'me'], draw(k) {
    k.camera(1620, 670, 1.25);
    S.roomInside(k);
    me(k, 992, 860, 17);
    k.vellum(0.42);
    longSill(k);
    S.oldPhoto(k, 1300, 790, 240, -4);
    S.phone(k, 1796, 686, 2, {deg: 7});
    k.camera(960, 540, 1);
    [[920, 380, 880, 480], [1440, 410, 1486, 510], [920, 690, 880, 760], [1440, 680, 1486, 740]].forEach(([a, b, c, d]) => k.line([[a, b], [c, d]], C.red, 8, 3));
  }},
  L04: {keys: ['me', 'phone', 'roomWindow'], draw(k) {
    S.roomInside(k);
    const a = me(k, 860, 900, 19, {action: 'hold'});
    longSill(k);
    S.oldPhoto(k, 1300, 790, 240, -4);
    heldPhone(k, a, 1.15);
  }},
  L05: {keys: ['me', 'bubble'], draw(k) {
    k.torn(rect(30, 26, 1860, 1028), C.room, {tex: 'news', lift: 0.3});
    k.cut(rect(130, 80, 1660, 800), C.sky, {lift: 0.6, border: 12, name: 'bigWindow'});
    k.torn([[136, 576], [800, 528], [1784, 592], [1784, 874], [136, 874]], C.snow, {lift: 0.2});
    S.flakes(k, 22, 91, {x0: 226, y0: 144, x1: 1693, y1: 816, size: 28});
    k.line([[960, 86], [960, 874]], C.wood, 16, 4);
    k.line([[136, 480], [1784, 480]], C.wood, 16, 4);
    const r = rng(41), spots = [[310, 200], [560, 170], [830, 150], [1090, 150], [1360, 170], [1610, 210], [260, 420], [500, 390], [1420, 390], [1680, 420], [300, 660], [530, 610], [1400, 610], [1660, 660], [760, 310], [1170, 310]];
    spots.forEach(([x, y], i) => S.bubble(k, x, y, 170 + r() * 90, [C.red, C.gold, C.cream][i % 3], {tail: i % 2 ? 1 : -1}));
    const a = me(k, 860, 900, 19, {expression: 'sad', action: 'hold'});
    heldPhone(k, a, 1.15);
  }},
  L06: {keys: ['bride', 'groom', 'dress', 'scissors'], draw(k) {
    k.torn(rect(30, 26, 1860, 620), C.wallShade, {tex: 'news', lift: 0.3});
    S.bride(k, 330, 590, 16, {expression: 'shy'});
    S.groom(k, 1600, 590, 16);
    k.cut(rect(60, 540, 1800, 510), C.envelope, {lift: 1.1, border: 6, name: 'table'});
    k.cut(rotated(960, 690, 980, 650, -1), C.oldDark, {lift: 0.8, border: 5, name: 'dressPaper'});
    k.cut([[900, 400], [1020, 400], [1060, 470], [1010, 590], [1150, 930], [770, 930], [910, 590], [860, 470]], C.bank, {lift: 1.1, border: 5, name: 'dress'});
    for (let i = 0; i < 6; i++) k.line([[1158 - i * 8, 910 - i * 20], [1152 - i * 8, 896 - i * 20]], C.ink, 4);
    k.line([[1360, 690], [1140, 835]], C.ink, 15, 4, 'scissors');
    k.line([[1385, 850], [1120, 790]], C.ink, 15, 4, 'scissors');
    k.cut(circle(1395, 665, 36, 16), C.gold, {border: 4, name: 'scissors'});
    k.cut(circle(1425, 860, 36, 16), C.gold, {border: 4, name: 'scissors'});
  }},
  L07: {keys: ['me', 'invite'], draw(k) {
    S.roomInside(k, {calendar: false, windowBack: false});
    const a = me(k, 960, 930, 20, {action: 'hold'});
    heldInvite(k, a, 11.5 * 20);
    // 相机站在门口，两扇开着的门板在前景，T09 从这里关上。
    k.cut([[30, 26], [250, 70], [250, 1010], [30, 1054]], C.door, {lift: 1.6, border: 6, name: 'doorFront'});
    k.cut([[1890, 26], [1670, 70], [1670, 1010], [1890, 1054]], C.door, {lift: 1.6, border: 6, name: 'doorFront'});
  }},
  L08: {keys: ['me', 'doorLeaf'], draw(k) {
    S.doorOutside(k);
    const a = me(k, 960, 915, 17, {expression: 'sad', action: 'hold'});
    heldInvite(k, a, 11.5 * 17);
    const r = rng(9);
    for (let i = 0; i < 26; i++) { const x = 90 + r() * 1740, y = 80 + r() * 800; k.line([[x, y], [x + 70, y - 22]], C.white, 3); }
    snowy(k, 62, 8, {size: 15});
  }},
  L09: {keys: ['me', 'arch', 'bunting', 'invite'], draw(k) {
    S.approachRoad(k);
    const a = me(k, 960, 930, 14, {action: 'hold'});
    heldInvite(k, a, 11.5 * 14);
    snowy(k, 26, 4);
    // 更近一道花门的立柱，T11 由它扫过全屏。
    for (let j = 0; j < 10; j++) k.cut(circle(1860 + (j % 2) * 34, 40 + j * 112, j % 3 ? 62 : 80, 14), [C.cream, C.red, C.gold, C.petal][j % 4], {border: 4, lift: 1.6, name: 'archPost'});
  }},
  L10: {keys: ['me', 'rosette', 'rosetteWord', 'poster'], draw(k) {
    S.foyer(k);
    S.signTable(k, 420, 800, 680);
    S.invitation(k, 360, 760, 150, -8, 'invite');
    k.clawd(1420, 1010, 22, {role: 'staff', expression: 'happy', tint: S.guestTint(0)});
    const a = me(k, 900, 1010, 22, {expression: 'sad', action: 'hold'});
    S.rosette(k, a, {big: true});
    S.oldPhoto(k, a.grip[0] + 24, a.grip[1] - 36, 110, -5, {name: 'heldPhoto'});
  }},
  L11: {keys: ['me', 'giftBox', 'photoCorner'], draw(k) {
    k.camera(2280, 540, 1);
    S.foyer(k, {poster: false});
    const a = me(k, 2120, 910, 18, {expression: 'sad', action: 'hold'});
    S.giftBox(k, 2510, 930, 1.05, {photoCorner: true});
    S.rosette(k, a);
  }},
  L12: {keys: ['me', 'cake', 'redLine', 'toyBride', 'toyGroom'], draw(k) {
    k.camera(960 + CORRIDOR, 540, 1);
    S.foyer(k, {poster: false});
    S.signTable(k, 1340 + CORRIDOR, 800, 900);
    S.cake(k, 1340 + CORRIDOR, 800, 1.7);
    const a = me(k, 500 + CORRIDOR, 930, 18, {expression: 'sad', action: 'hold'});
    S.rosette(k, a);
    const y = 800 - 340 - 9 * 5.44;
    S.redLine(k, [a.grip, [1000 + CORRIDOR, 560], [1234 + CORRIDOR, y], [1446 + CORRIDOR, y]]);
  }},
  L13: {keys: ['me', 'bride', 'gapTiles'], draw(k) {
    k.camera(960 + CORRIDOR, 540, 1);
    S.foyer(k, {poster: false});
    tiles(k);
    const a = me(k, 470 + CORRIDOR, 900, 15, {expression: 'shy'});
    S.rosette(k, a);
    S.bride(k, 1450 + CORRIDOR, 900, 15, {expression: 'neutral'});
  }},
  L14: {keys: ['me', 'bride', 'hook'], draw(k) {
    k.camera(960 + CORRIDOR, 540, 1);
    S.foyer(k, {poster: false});
    tiles(k);
    const a = me(k, 726 + CORRIDOR, 930, 18, {expression: 'happy'});
    S.rosette(k, a);
    S.bride(k, 1194 + CORRIDOR, 930, 18);
    hookHands(k, 930 - 9.5 * 18, 'hook', 960 + CORRIDOR);
  }},
  L15: {keys: ['me', 'bride', 'groom'], draw(k) {
    k.camera(1362 + CORRIDOR, 486, 15 / 18);
    S.foyer(k, {poster: false});
    tiles(k);
    const a = me(k, 726 + CORRIDOR, 930, 18);
    S.rosette(k, a);
    const b = S.bride(k, 4092, 930, 18);
    k.cut(rotated(b.right[0] + 20, b.right[1] + 8, 120, 72, -6), C.red, {lift: 1, border: 4, name: 'envelope'});
    S.groom(k, 4680, 930, 18);
  }},
  L16: {keys: ['giftBox', 'envelope', 'bride', 'me'], draw(k) {
    S.foyer(k, {poster: false});
    me(k, 230, 900, 11, {expression: 'sad'});
    k.vellum(0.42, '#ecd5a4');
    S.signTable(k, 960, 860, 1180);
    S.bride(k, 1490, 950, 15, {expression: 'neutral'});
    S.giftBox(k, 880, 920, 1.75, {photoCorner: true, envelope: true});
  }},
  I01: {keys: ['me', 'bride', 'hook', 'prints'], draw(k) {
    S.pastSnow(k);
    [640, 680, 720, 760, 800].forEach((y, i) => {
      k.mark(ellipse(690 + i * 7, y, 10 + i, 5 + i * 0.5), 'rgba(150,110,70,.34)', 'prints');
      k.mark(ellipse(1230 - i * 7, y, 10 + i, 5 + i * 0.5), 'rgba(150,110,70,.34)', 'prints');
    });
    snowy(k, 22, 13, {size: 9});
    me(k, 726, 880, 18, {expression: 'happy'});
    S.bride(k, 1194, 880, 18, {gown: false});
    hookHands(k, 880 - 9.5 * 18);
  }},
  I02: {keys: ['me', 'placeCard', 'exitDoor'], draw(k) {
    k.camera(1000, 390, 1.5);
    hallRows(k);
  }},
  L17: {keys: ['me', 'bell', 'hallWindow'], draw(k) {
    k.camera(1035, 295.07, 15 / 6.4);
    hallRows(k, {front: false});
  }},
  L18: {keys: ['bride', 'groom', 'altar', 'carpet'], draw(k) {
    S.stage(k);
    S.bride(k, 1240, 840, 13, {expression: 'shy'});
    const a = S.groom(k, 640, 905, 13, {facing: 'right', action: 'walk', frame: 1});
    k.cut(rect(a.right[0] + 2, a.right[1] - 18, 58, 44), C.red, {lift: 1, border: 4, name: 'ringBox'});
  }},
  L19: {keys: ['bride', 'groom', 'altar', 'ringBox'], draw(k) {
    k.camera(1160, 560, 1.18);
    S.stage(k);
    S.bride(k, 1290, 840, 13, {expression: 'shy'});
    const a = S.groom(k, 990, 890, 13, {facing: 'right', deg: 7});
    k.cut(rect(a.right[0] + 2, a.right[1] - 18, 58, 44), C.red, {lift: 1, border: 4, name: 'ringBox'});
    k.mark(ellipse(a.right[0] + 31, a.right[1] - 22, 14, 14, 16), C.gold, 'ringBox');
  }},
  L20: {keys: ['ring'], draw(k) {
    // 白底是推近后充满画面的头纱。
    k.torn(rect(30, 26, 1860, 1028), C.white, {lift: 0.3});
    S.flakes(k, 18, 66, {color: C.petal, size: 34});
    k.camera(922, 502, 16);
    S.bride(k, 960, 540, 4, {gown: false});
    k.mark(ellipse(911, 502, 3, 9, 22), C.gold, 'ring');
    k.mark(ellipse(911.4, 502, 1.2, 6.8, 22), C.orange);
    k.cut([[911, 485], [914, 490], [911, 494], [908, 490]], C.cream, {border: 0.4, lift: 0.1, name: 'ring'});
  }},
  L21: {keys: ['me', 'guest'], draw(k) {
    k.camera(960, 520, 1.1);
    hallRows(k, {clap: true, me: {expression: 'sad'}});
    S.confetti(k, 58, 21, {x0: 90, y0: 500, x1: 1830, y1: 950});
  }},
  L22: {keys: ['me', 'redLine'], draw(k) {
    k.camera(960, 450, 1.14);
    hallRows(k, {me: {expression: 'sad'}});
    S.redLine(k, [[1040, 1050], [1040, 905], [90, 905], [1700, 905]], 9);
    S.redLine(k, [[1040, 905], [1040, 690], [90, 690], [1830, 690]], 8);
    S.redLine(k, [[560, 690], [560, 490], [230, 490], [870, 490]], 7);
    k.cut(circle(870, 490, 13, 12), C.red, {border: 3, lift: 0.4, name: 'redEnd'});
  }},
  L23: {keys: ['me', 'glass'], draw(k) {
    k.camera(1035, 345.2, 3.125);
    const a = hallRows(k, {front: false, glass: false, me: {action: 'hold'}});
    S.glass(k, a.grip[0] + 4.5, a.grip[1] + 4.5, 0.512);
  }},
  L24: {keys: ['me', 'exitDoor', 'exitSign'], draw(k) {
    // 他把自己按低，手臂正好到桌沿高度，手臂长度不变，两手自然压在桌面上。
    k.camera(1115, 402, 2.5);
    const a = hallRows(k, {front: false, foot: 526, rosette: false, me: {expression: 'sad'}});
    S.rosette(k, {chest: [a.chest[0], a.chest[1] - 16], u: a.u});
    k.camera(960, 540, 1);
    S.flakes(k, 9, 124, {x0: 1250, y0: 120, x1: 1860, y1: 760, color: C.petal, size: 26, name: 'petal'});
  }},
  L25: {keys: ['bride', 'me', 'peel'], draw(k) {
    k.torn(rect(30, 26, 1860, 1028), C.hall, {tex: 'news', lift: 0.3});
    S.flakes(k, 36, 25, {color: C.petal, size: 30});
    S.bride(k, 760, 1060, 28);
    k.torn(rect(1120, 30, 770, 1020), '#fff4dc', {lift: 1.4, name: 'peel'});
    k.cut(circle(1500, 240, 90, 30), C.sun, {lift: 0.5, border: 7});
    me(k, 1380, 930, 14, {action: 'hug', expression: 'happy'});
    S.bride(k, 1640, 930, 14, {action: 'hug', gown: false, name: 'pastBride'});
    k.cut([[1120, 30], [1040, 300], [1160, 340]], C.white, {lift: 1.5, border: 4, name: 'peel'});
  }},
  L26: {keys: ['placeCard', 'placeCardWord', 'me'], draw(k) {
    // 背景是 L27 的同一面墙，相机向右横移 540 像素后接上。
    k.camera(935.4, 349.1, 2.8125);
    S.hall(k, {door: true, bell: true});
    k.camera(960, 540, 1);
    me(k, 1240, 800, 13, {expression: 'sad'});
    k.vellum(0.3, '#ecd5a4');
    k.cut(rect(40, 730, 1840, 320), C.cream, {lift: 1.3, border: 6, name: 'seatTable'});
    S.placeCard(k, 700, 720, 660, -2);
    S.glass(k, 1620, 742, 2);
  }},
  L27: {keys: ['me', 'tickets', 'glass'], draw(k) {
    k.camera(1127.4, 349.1, 2.8125);
    hallRows(k, {front: false, row: false, card: false, me: {action: 'hold'}});
    S.ticketStubs(k, 1150, 466, 0.71);
    k.camera(960, 540, 1);
    S.placeCard(k, 160, 720, 660, -2, 'nearCard');
  }},
  L28: {keys: ['me', 'redLine'], draw(k) {
    const z = 3.5625, cx = 1079.8, cy = 353.4, world = (x, y) => [cx + (x - 960) / z, cy + (y - 540) / z];
    k.camera(cx, cy, z);
    const a = hallRows(k, {front: false, row: false, card: false, foot: 439.8, me: {expression: 'sad', action: 'hold', deg: -7}});
    S.ticketStubs(k, 1150, 466, 0.71);
    S.redLine(k, [world(1880, 960), world(1450, 870), a.grip], 12 / z);
    k.camera(960, 540, 1);
    S.placeCard(k, 116, 753, 836, -2, 'nearCard');
  }},
  L29: {keys: ['me', 'ripped'], draw(k) {
    S.pastSnow(k, {drain: true});
    me(k, 726, 880, 18, {expression: 'happy', tint: OLD});
    k.torn([[1000, 26], [1890, 26], [1890, 1054], [1000, 1054]], C.kraft, {tex: 'kraft', lift: 1.2, name: 'ripped'});
    k.cut(rotated(1500, 520, 460, 620, 17), C.old, {tex: 'news', lift: 1.8, border: 8, name: 'ripped'});
    k.clawd(1500, 730, 11, {role: 'torn', expression: 'happy', tint: OLD, deg: 17});
  }},
  L30: {keys: ['me', 'smilePaper'], draw(k) {
    S.hall(k, {door: true});
    const a = me(k, 960, 1020, 28, {expression: 'neutral'});
    const [cx, cy] = a.eye;
    k.cut(rotated(cx, cy, 460, 190, -2), C.orange, {lift: 1, border: 6, name: 'smilePaper'});
    [-110, 110].forEach(dx => k.line([[cx + dx - 42, cy + 18], [cx + dx, cy - 22], [cx + dx + 42, cy + 18]], C.ink, 15));
    k.cut([[cx + 232, cy - 96], [cx + 180, cy - 90], [cx + 226, cy - 44]], C.white, {lift: 0.5, border: 3});
  }},
  L31: {keys: ['me', 'smilePaper', 'tear'], draw(k) {
    S.hall(k, {door: true});
    const a = me(k, 960, 1020, 28, {expression: 'sad'});
    k.cut(rotated(450, 700, 400, 165, 28), C.orange, {lift: 1.8, border: 6, name: 'smilePaper'});
    [-100, 100].forEach(dx => k.line([[450 + dx - 36, 720 + dx * 0.53 + 16], [450 + dx, 720 + dx * 0.53 - 18], [450 + dx + 36, 720 + dx * 0.53 + 22]], C.ink, 13));
    [[-90, 90], [120, 74], [-96, 180], [120, 170]].forEach(([dx, dy]) => k.cut(ellipse(a.eye[0] + dx, a.eye[1] + dy, 15, 24, 14), '#83bdcf', {border: 3, lift: 0.3, name: 'tear'}));
  }},
  L32: {keys: ['me', 'exitDoor', 'warmDoor'], draw(k) {
    k.torn(rect(30, 26, 1860, 700), C.wallShade, {tex: 'news', lift: 0.3});
    k.cut(rect(610, 130, 700, 650), C.warm, {lift: 0.4, border: 9, name: 'warmDoor'});
    k.cut([[1310, 130], [1600, 90], [1600, 830], [1310, 780]], C.door, {lift: 1.2, border: 7, name: 'exitDoor'});
    k.torn([[30, 730], [640, 760], [1400, 740], [1890, 730], [1890, 1054], [30, 1054]], C.snow, {lift: 1});
    const a = me(k, 960, 930, 17, {expression: 'sad', action: 'walk', frame: 1, tint: COLD});
    S.rosette(k, a);
    snowy(k, 30, 32);
  }},
  L33: {keys: ['me', 'curtain', 'spotlight', 'stageFrame'], draw(k) {
    S.paperStage(k, 1);
    S.spotlight(k, 960);
    k.line([[915.5, 140], [915.5, 797.5]], C.gold, 6, 3, 'rope');
    const a = me(k, 960, 830, 13, {expression: 'sad', tint: COLD});
    S.rosette(k, a);
  }},
  L34: {keys: ['me', 'curtain', 'rope'], draw(k) {
    S.paperStage(k, 0.5);
    S.spotlight(k, 740);
    const a = me(k, 740, 830, 13, {expression: 'sad', action: 'hold', tint: COLD});
    S.rosette(k, a);
    k.line([[a.grip[0], 140], a.grip], C.gold, 6, 3, 'rope');
  }},
  L35: {keys: ['me', 'bride', 'groom'], draw(k) {
    outside(k);
    S.flakes(k, 16, 36, {x0: 70, y0: 70, x1: 1850, y1: 650});
    S.reflection(k, 1540, 560, 8);
    k.vellum(0.22, '#f4d48b');
    const a = me(k, 960, 930, 20, {expression: 'sad', tint: COLD});
    S.rosette(k, a);
    S.windowFrame(k);
  }},
  L36: {keys: ['rosette', 'ribbonLong', 'road', 'me'], draw(k) {
    outside(k);
    const a = me(k, 720, 980, 22, {tint: COLD});
    k.line([[a.chest[0] + 121, a.chest[1] + 60], [1010, 760], [1210, 790], [1400, 770], [1560, 820]], C.red, 16, 5, 'ribbonLong');
    S.rosette(k, a);
    S.windowFrame(k);
  }},
  L37: {keys: ['me', 'lightPatch'], draw(k) {
    outside(k);
    S.lightPatch(k, 440, 770, 1040, 270);
    const a = me(k, 960, 762, 16, {expression: 'sad', action: 'walk', frame: 1, tint: COLD});
    S.rosette(k, a);
    snowy(k, 22, 37, {y1: 720});
    S.windowFrame(k);
  }},
  L38: {keys: ['me', 'rosetteWord', 'bride', 'groom'], draw(k) {
    outside(k);
    S.reflection(k, 1400, 640, 12, {hug: true});
    S.confetti(k, 26, 38, {x0: 1090, y0: 200, x1: 1710, y1: 340});
    k.vellum(0.16, '#f4d48b');
    const a = me(k, 620, 1080, 26, {expression: 'sad', tint: COLD});
    S.rosette(k, a, {big: true});
    S.windowFrame(k);
  }},
  L39: {keys: ['me', 'tear', 'photo'], draw(k) {
    outside(k);
    const a = me(k, 960, 690, 18, {expression: 'sad', tint: COLD});
    S.rosette(k, a);
    [[-60, 180], [-54, 330], [60, 240], [74, 410]].forEach(([dx, dy]) => k.cut(ellipse(960 + dx, a.eye[1] + dy, 12, 19, 12), '#83bdcf', {border: 3, lift: 0.3, name: 'tear'}));
    [[440, 760, -18], [620, 860, 12], [800, 800, -7], [1140, 810, 9], [1300, 880, -14], [1490, 770, 16], [930, 910, 4]].forEach(([x, y, deg]) => S.oldPhoto(k, x, y, 150, deg));
    S.windowFrame(k);
  }},
  L40: {keys: ['me', 'bubble'], draw(k) {
    outside(k);
    const a = me(k, 1180, 930, 19, {expression: 'sad', tint: COLD});
    S.rosette(k, a);
    S.bubble(k, 700, 410, 520, C.white, {tail: 1});
    snowy(k, 14, 40, {y1: 650});
    S.windowFrame(k);
  }},
  L41: {keys: ['me', 'cloudLight'], draw(k) {
    S.outsideWindow(k, {sky: C.sky, cloud: true});
    const a = me(k, 960, 870, 18, {tint: COLD});
    S.rosette(k, a);
    S.windowFrame(k);
  }},
  L42: {keys: ['me', 'rosette'], draw(k) {
    S.outsideWindow(k, {sky: C.sky, cloud: true});
    me(k, 960, 880, 20, {action: 'jump', frame: 1});
    const chest = {chest: [1280, 880], u: 12};
    S.rosette(k, chest);
    const r = rng(42);
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 280 + r() * 240; k.cut(ellipse(960 + Math.cos(a) * d, 560 + Math.sin(a) * d * 0.72, 9 + r() * 8, 7 + r() * 5, 10), C.white, {border: 2, lift: 0.3}); }
    S.windowFrame(k);
  }},
  L43: {keys: ['me', 'bride', 'groom', 'guest'], draw(k) {
    S.steps(k);
    S.guests(k, 650, 7, [430, 560, 690, 1230, 1360], {seed: 43});
    S.groom(k, 880, 690, 8);
    S.bride(k, 1050, 690, 8);
    me(k, 1590, 730, 8, {action: 'walk', frame: 1});
  }},
  L44: {keys: ['me', 'bride', 'groom', 'photoFrame'], draw(k) {
    S.steps(k);
    S.guests(k, 650, 7, [430, 560, 690, 1230, 1360], {seed: 43});
    S.groom(k, 880, 690, 8);
    S.bride(k, 1050, 690, 8);
    me(k, 1520, 670, 8, {expression: 'shy'});
    [[0, 0, 1920, 70], [0, 870, 1920, 210], [0, 0, 70, 1080], [1850, 0, 70, 1080]].forEach(([x, y, w, h]) => k.cut(rect(x, y, w, h), C.white, {lift: 1.1, border: 0, name: 'photoFrame'}));
  }},
  L45: {keys: ['me', 'bride', 'groom', 'veilTuck'], draw(k) {
    S.steps(k);
    S.groom(k, 1020, 700, 11);
    S.bride(k, 1330, 700, 11);
    k.cut([[1240, 500], [1320, 492], [1160, 600]], C.cream, {lift: 0.9, border: 4, name: 'veilTuck'});
    me(k, 500, 1010, 23, {expression: 'shy', action: 'walk', frame: 1});
  }},
  L46: {keys: ['me', 'bride', 'groom', 'hookFar'], draw(k) {
    S.steps(k);
    S.groom(k, 1100, 690, 9);
    S.bride(k, 1334, 690, 9);
    k.cut(ellipse(1217, 690 - 9.5 * 9, 24, 17, 14), C.orange, {border: 4, lift: 0.6, name: 'hookFar'});
    me(k, 470, 1040, 27, {action: 'walk', frame: 1});
  }},
  O01: {keys: ['me', 'chapel', 'bigInvite', 'placeCard'], draw(k) {
    S.road(k, {prints: [0.2, 0.26, 0.32, 0.38, 0.44, 0.5, 0.56, 0.62, 0.68, 0.74]});
    const [x, y] = S.roadPoint(0.82);
    me(k, Math.round(x), Math.round(y), 14, {action: 'walk', frame: 1});
    S.roadForeground(k);
  }},
  O02: {keys: ['chapel', 'prints', 'placeCard', 'road'], draw(k) {
    S.road(k, {prints: [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.88, 0.94]});
    S.roadForeground(k, {wordCover: 1});
    snowy(k, 70, 52);
  }},
};
