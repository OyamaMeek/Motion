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

function hookHands(k, y, name = 'hook') {
  k.line(Array.from({length: 13}, (_, i) => [960 + Math.cos(i / 12 * 6.283) * 28, y + Math.sin(i / 12 * 6.283) * 18]), C.white, 7, 3, name);
  k.cut(circle(960, y, 16, 12), C.orange, {border: 3, lift: 0.6, name});
}
function hallRows(k, {clap = false, me: meOpts = {}} = {}) {
  S.hall(k, {door: true});
  S.guests(k, 450, 5.6, [420, 620, 820, 1240, 1440], {clap, seed: 3});
  const a = me(k, 1030, 450, 5.6, meOpts);
  S.seatTable(k, 920, 450, 1320, 'lastRow');
  S.guests(k, 620, 8, [330, 590, 850, 1110, 1370, 1630], {clap, seed: 5});
  S.seatTable(k, 980, 620, 1560, 'rowB');
  S.guests(k, 830, 11, [230, 590, 950, 1310, 1670], {clap, seed: 7});
  S.seatTable(k, 950, 830, 1720, 'rowC');
  return a;
}
// 最后一排的近景：同一张桌子、同一个位置。
function lastRow(k, {x = 960, u = 18, foot = 900, opts = {}, door = true, bell = false, neighbours = true, tableY = 800} = {}) {
  S.hall(k, {door, bell});
  if (neighbours) S.guests(k, foot, u, x < 700 ? [1500] : [240], {seed: 11});
  const a = me(k, x, foot, u, opts);
  S.seatTable(k, 960, tableY, 1820);
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
    S.windowOutside(k, () => { me(k, FROST_ME[0], FROST_ME[1], FROST_ME[2]); S.frost(k, [1150, 650, 250, 190]); });
    k.cut(rect(320, 800, 1280, 56), C.wood, {lift: 1.2, border: 5, name: 'sill'});
    S.sillThings(k, {x: -220});
    snowy(k, 20, 11, {x0: 60, y0: 60, x1: 1860, y1: 760});
  }},
  L01: {keys: ['me', 'tally'], draw(k) {
    k.camera(1200, 540, 1.28);
    S.windowOutside(k, () => {
      me(k, FROST_ME[0], FROST_ME[1], FROST_ME[2]);
      S.frost(k, [1150, 650, 250, 190], 8);
      [1350, 1395].forEach(x => k.line([[x, 560], [x - 8, 690]], C.roomDim, 13, 4, 'tally'));
      k.line([[1442, 560], [1432, 690]], C.ink, 15, 5, 'tally');
    });
  }},
  L02: {keys: ['me', 'photo', 'calendarPage', 'calendar'], draw(k) {
    S.roomInside(k);
    const a = me(k, 720, 860, 17, {expression: 'sad', action: 'hold'});
    k.cut(rotated(a.grip[0] + 90, a.grip[1] - 70, 150, 170, 24), C.cream, {lift: 1.4, border: 4, name: 'calendarPage'});
    k.cut(rect(1080, 880, 680, 44), C.wood, {lift: 1.3, border: 4, name: 'sill'});
    S.oldPhoto(k, 1300, 800, 220, -4);
  }},
  L03: {keys: ['phone', 'phoneSign', 'photo', 'me'], draw(k) {
    S.roomInside(k, {calendar: false});
    me(k, 560, 720, 11);
    k.vellum(0.42);
    k.cut(rect(120, 800, 1680, 90), C.wood, {lift: 1.5, border: 6, name: 'sill'});
    S.oldPhoto(k, 560, 690, 300, -5);
    S.phone(k, 1180, 560, 2.5, {deg: 7});
    [[920, 380, 880, 480], [1440, 410, 1486, 510], [920, 690, 880, 760], [1440, 680, 1486, 740]].forEach(([a, b, c, d]) => k.line([[a, b], [c, d]], C.red, 8, 3));
  }},
  L04: {keys: ['me', 'phone', 'roomWindow'], draw(k) {
    S.roomInside(k);
    const a = me(k, 960, 900, 19, {action: 'hold'});
    heldPhone(k, a, 0.72);
  }},
  L05: {keys: ['me', 'bubble'], draw(k) {
    k.torn(rect(30, 26, 1860, 1028), C.room, {tex: 'news', lift: 0.3});
    k.cut(rect(130, 80, 1660, 800), C.sky, {lift: 0.6, border: 12, name: 'bigWindow'});
    const r = rng(41), spots = [[310, 200], [560, 170], [830, 150], [1090, 150], [1360, 170], [1610, 210], [260, 420], [500, 390], [1420, 390], [1680, 420], [300, 660], [530, 610], [1400, 610], [1660, 660], [760, 310], [1170, 310]];
    spots.forEach(([x, y], i) => S.bubble(k, x, y, 170 + r() * 90, [C.red, C.gold, C.cream][i % 3], {tail: i % 2 ? 1 : -1}));
    const a = me(k, 960, 950, 17, {expression: 'sad', action: 'hold'});
    heldPhone(k, a, 0.62);
  }},
  L06: {keys: ['bride', 'groom', 'dress', 'scissors'], draw(k) {
    k.torn(rect(30, 26, 1860, 520), C.wallShade, {tex: 'news', lift: 0.3});
    S.bride(k, 520, 540, 11, {expression: 'shy'});
    S.groom(k, 1400, 540, 11);
    k.cut(rect(60, 460, 1800, 590), C.envelope, {lift: 1.1, border: 6, name: 'table'});
    k.cut(rotated(960, 730, 880, 500, -2), C.white, {lift: 0.8, border: 5, name: 'dressPaper'});
    const dress = [[870, 530], [1050, 530], [1090, 660], [1200, 920], [720, 920], [830, 660]];
    k.cut(dress, C.cream, {lift: 0.5, border: 5, name: 'dress'});
    for (let i = 0; i < 12; i++) k.line([[1210 + i * 2, 908 - i * 23], [1214 + i * 2, 896 - i * 23]], C.ink, 3);
    k.line([[1290, 620], [1130, 720]], C.ink, 14, 4, 'scissors');
    k.line([[1290, 760], [1130, 690]], C.ink, 14, 4, 'scissors');
    k.cut(circle(1330, 600, 34, 16), C.gold, {border: 4, name: 'scissors'});
    k.cut(circle(1330, 780, 34, 16), C.gold, {border: 4, name: 'scissors'});
  }},
  L07: {keys: ['me', 'invite'], draw(k) {
    S.roomInside(k, {calendar: false, windowBack: false});
    k.cut(rect(680, 110, 560, 790), C.door, {lift: 0.8, border: 8, name: 'doorBack'});
    k.cut(circle(1180, 540, 18, 12), C.gold, {border: 3});
    const a = me(k, 960, 930, 20, {action: 'hold'});
    heldInvite(k, a, 230);
  }},
  L08: {keys: ['me', 'doorLeaf'], draw(k) {
    S.doorOutside(k);
    const a = me(k, 960, 915, 17, {expression: 'sad', action: 'hold'});
    heldInvite(k, a, 100);
    const r = rng(9);
    for (let i = 0; i < 26; i++) { const x = 90 + r() * 1740, y = 80 + r() * 800; k.line([[x, y], [x + 70, y - 22]], C.white, 3); }
    snowy(k, 62, 8, {size: 15});
  }},
  L09: {keys: ['me', 'arch', 'bunting', 'invite'], draw(k) {
    S.approachRoad(k);
    const a = me(k, 960, 930, 14, {action: 'hold'});
    heldInvite(k, a, 110);
    snowy(k, 26, 4);
  }},
  L10: {keys: ['me', 'rosette', 'rosetteWord', 'poster'], draw(k) {
    S.foyer(k);
    S.signTable(k, 420, 800, 680);
    S.invitation(k, 360, 760, 150, -8, 'invite');
    const a = me(k, 960, 1010, 22, {expression: 'sad'});
    k.clawd(1390, 1010, 22, {role: 'staff', expression: 'happy'});
    S.rosette(k, a, {big: true});
  }},
  L11: {keys: ['me', 'giftBox', 'photoCorner'], draw(k) {
    S.foyer(k, {poster: false});
    me(k, 800, 910, 18, {expression: 'sad', action: 'hold'});
    S.giftBox(k, 1190, 930, 1.05, {photoCorner: true});
    const a = {chest: [800, 910 - 8.5 * 18], u: 18};
    S.rosette(k, a);
  }},
  L12: {keys: ['me', 'cake', 'redLine', 'toyBride', 'toyGroom'], draw(k) {
    S.foyer(k, {poster: false});
    S.signTable(k, 1190, 840, 980);
    S.cake(k, 1190, 840, 1.45);
    const a = me(k, 520, 930, 18, {expression: 'sad', action: 'hold'});
    S.rosette(k, a);
    S.redLine(k, [a.grip, [980, 640], [1100, 480], [1280, 480]]);
  }},
  L13: {keys: ['me', 'bride', 'gapTiles'], draw(k) {
    S.foyer(k, {poster: false});
    k.cut([[810, 820], [1110, 820], [1160, 1050], [760, 1050]], C.bank, {lift: 0.1, border: 2, name: 'gapTiles'});
    const a = me(k, 470, 900, 15, {expression: 'shy'});
    S.rosette(k, a);
    S.bride(k, 1450, 900, 15, {expression: 'neutral'});
  }},
  L14: {keys: ['me', 'bride', 'hook'], draw(k) {
    S.foyer(k, {poster: false});
    const a = me(k, 726, 930, 18, {expression: 'happy'});
    S.rosette(k, a);
    S.bride(k, 1194, 930, 18);
    hookHands(k, 930 - 9.5 * 18);
  }},
  L15: {keys: ['me', 'bride', 'groom'], draw(k) {
    S.foyer(k, {poster: false});
    const a = me(k, 430, 910, 15);
    S.rosette(k, a);
    S.bride(k, 1010, 910, 15);
    S.groom(k, 1500, 910, 15);
  }},
  L16: {keys: ['giftBox', 'envelope', 'bride', 'me'], draw(k) {
    S.foyer(k, {poster: false});
    me(k, 300, 770, 11, {expression: 'sad'});
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
    me(k, 726, 880, 18, {expression: 'happy'});
    S.bride(k, 1194, 880, 18, {gown: false});
    hookHands(k, 880 - 9.5 * 18);
    snowy(k, 22, 13, {size: 9});
  }},
  I02: {keys: ['me', 'placeCard', 'exitDoor', 'guest'], draw(k) {
    k.camera(1080, 410, 1.42);
    hallRows(k);
    S.placeCard(k, 1030, 482, 120);
  }},
  L17: {keys: ['me', 'bell', 'hallWindow'], draw(k) {
    const a = lastRow(k, {x: 960, u: 16, foot: 880, opts: {}, bell: true, door: false, tableY: 830, neighbours: true});
    S.rosette(k, a);
  }},
  L18: {keys: ['bride', 'groom', 'altar', 'carpet'], draw(k) {
    S.stage(k);
    S.bride(k, 1240, 840, 13, {expression: 'shy'});
    S.groom(k, 640, 905, 13, {facing: 'right', action: 'walk', frame: 1});
  }},
  L19: {keys: ['bride', 'groom', 'altar'], draw(k) {
    k.camera(1160, 560, 1.18);
    S.stage(k);
    S.bride(k, 1270, 840, 13, {expression: 'shy'});
    S.groom(k, 1010, 880, 13, {facing: 'right', deg: 12});
  }},
  L20: {keys: ['ring'], draw(k) {
    k.torn(rect(30, 26, 1860, 1028), C.white, {lift: 0.3});
    S.flakes(k, 18, 66, {color: C.petal, size: 34});
    const a = S.bride(k, 960, 540, 4, {gown: false});
    const hx = a.left[0] + 0.6 * a.u, hy = a.left[1] + a.u;
    k.camera(hx + 20, hy, 16);
    k.mark(ellipse(hx + 1, hy, 3.4, 5.4, 22), C.gold, 'ring');
    k.mark(ellipse(hx + 1, hy, 2.2, 4.1, 22), C.orange);
    k.cut([[hx + 1, hy - 9.6], [hx + 3.6, hy - 6.8], [hx + 1, hy - 4.4], [hx - 1.6, hy - 6.8]], C.cream, {border: 0.4, lift: 0.1, name: 'ring'});
  }},
  L21: {keys: ['me', 'guest'], draw(k) {
    k.camera(960, 520, 1.1);
    hallRows(k, {clap: true, me: {expression: 'sad'}});
    S.confetti(k, 58, 21, {x0: 90, y0: 500, x1: 1830, y1: 950});
  }},
  L22: {keys: ['me', 'redLine'], draw(k) {
    k.camera(960, 450, 1.14);
    hallRows(k, {me: {expression: 'sad'}});
    S.redLine(k, [[960, 1050], [950, 905]], 10);
    S.redLine(k, [[160, 880], [1800, 880]], 8);
    S.redLine(k, [[950, 880], [950, 672], [300, 668], [1720, 668]], 8);
    S.redLine(k, [[720, 668], [760, 500]], 8);
  }},
  L23: {keys: ['me', 'glass'], draw(k) {
    S.hall(k, {door: true});
    const a = me(k, 960, 930, 20, {action: 'hold'});
    S.glass(k, a.grip[0] + 14, a.grip[1] + 14, 1.6);
    S.rosette(k, a);
  }},
  L24: {keys: ['me', 'exitDoor', 'exitSign', 'seatTable', 'pressHands'], draw(k) {
    const a = lastRow(k, {x: 760, u: 16, foot: 850, opts: {expression: 'sad'}, neighbours: true, tableY: 770});
    S.rosette(k, a);
    [a.left, a.right].forEach(([x]) => k.cut(rect(x - 20, 748, 40, 26), C.orange, {border: 3, lift: 0.5, name: 'pressHands'}));
  }},
  L25: {keys: ['bride', 'me', 'peel'], draw(k) {
    S.stage(k);
    S.flakes(k, 36, 25, {color: C.petal, size: 30});
    S.bride(k, 760, 1060, 28);
    k.torn(rect(1120, 30, 770, 1020), '#fff4dc', {lift: 1.4, name: 'peel'});
    k.cut(circle(1500, 240, 90, 30), C.sun, {lift: 0.5, border: 7});
    me(k, 1380, 930, 14, {action: 'hug', expression: 'happy'});
    S.bride(k, 1640, 930, 14, {action: 'hug', gown: false, name: 'pastBride'});
    k.cut([[1120, 30], [1040, 300], [1160, 340]], C.white, {lift: 1.5, border: 4, name: 'peel'});
  }},
  L26: {keys: ['placeCard', 'placeCardWord', 'me'], draw(k) {
    S.hall(k, {door: true});
    me(k, 1240, 800, 13, {expression: 'sad'});
    k.vellum(0.3, '#ecd5a4');
    k.cut(rect(40, 730, 1840, 320), C.cream, {lift: 1.3, border: 6, name: 'seatTable'});
    S.placeCard(k, 700, 720, 660, -2);
  }},
  L27: {keys: ['me', 'tickets', 'glass'], draw(k) {
    const a = lastRow(k, {x: 700, u: 18, foot: 880, opts: {action: 'hold'}, tableY: 790, neighbours: false});
    S.rosette(k, a);
    S.ticketStubs(k, 1060, 825, 2);
    S.glass(k, 1120, 830, 2);
  }},
  L28: {keys: ['me', 'redLine'], draw(k) {
    k.camera(860, 620, 1.14);
    S.hall(k, {door: true});
    const a = me(k, 720, 890, 20, {expression: 'sad', action: 'hold', deg: -7});
    S.rosette(k, a);
    S.redLine(k, [[1880, 960], [1450, 870], a.grip], 12);
    S.seatTable(k, 960, 960, 1820);
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
    const a = me(k, 960, 830, 13, {expression: 'sad', tint: COLD});
    S.rosette(k, a);
  }},
  L34: {keys: ['me', 'curtain', 'rope'], draw(k) {
    S.paperStage(k, 0.5);
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
    k.torn([[1160, 640], [1320, 640], [1880, 1050], [1420, 1050]], C.path, {tex: 'kraft', lift: 0.4, name: 'road'});
    const a = me(k, 720, 980, 22, {tint: COLD});
    k.line([[a.chest[0] + 88, a.chest[1] + 40], [1010, 760], [1210, 790], [1400, 770], [1560, 820]], C.red, 16, 5, 'ribbonLong');
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
    S.reflection(k, 1410, 640, 12, {hug: true});
    S.confetti(k, 26, 38, {x0: 1040, y0: 90, x1: 1830, y1: 640});
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
    const b = S.bride(k, 1330, 700, 11);
    k.cut([[1150, 500], [b.head[0] - 20, 500], [1220, 590]], C.white, {lift: 0.7, border: 4, alpha: 0.85, name: 'veilTuck'});
    me(k, 500, 1010, 23, {expression: 'shy', action: 'walk', frame: 1});
  }},
  L46: {keys: ['me', 'bride', 'groom', 'hookFar'], draw(k) {
    S.steps(k);
    S.groom(k, 1140, 680, 7);
    S.bride(k, 1320, 680, 7);
    k.cut(circle(1230, 680 - 9.5 * 7, 10, 10), C.gold, {border: 2, lift: 0.4, name: 'hookFar'});
    me(k, 470, 1060, 28, {action: 'walk', frame: 1});
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
