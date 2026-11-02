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
  k.cut(ellipse(960, y, 44, 30, 18), C.orange, {border: 5, lift: 0.8, name});
  k.line([[934, y - 8], [960, y + 10], [986, y - 8]], C.door, 7);
}
// 主角后面没有客人，前排也在他的正前方留出空位，所以最后一排的他始终看得到。
function hallRows(k, {clap = false, me: meOpts = {}} = {}) {
  S.hall(k, {door: true});
  S.guests(k, 470, 6.4, [300, 480, 660, 840, 1230], {clap, seed: 3});
  const a = me(k, 1035, 470, 6.4, meOpts);
  S.seatTable(k, 770, 462, 1100, 'lastRow', 30);
  S.guests(k, 670, 8.6, [190, 460, 730, 1320, 1580, 1780], {clap, seed: 5});
  S.seatTable(k, 980, 660, 1760, 'rowB', 34);
  S.guests(k, 880, 11, [170, 500, 830, 1250, 1580], {clap, seed: 7});
  S.seatTable(k, 900, 870, 1640, 'rowC', 40);
  return a;
}
// 最后一排的近景：同一张桌子、同一个位置。
function lastRow(k, {x = 960, u = 18, foot = 900, opts = {}, door = true, bell = false, neighbours = true, tableY = 800} = {}) {
  S.hall(k, {door, bell});
  if (neighbours) S.guests(k, foot, u, x > 700 ? [240] : [1500], {seed: 11});
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
    k.cut(rect(1040, 880, 740, 60), C.path, {lift: 1.5, border: 5, name: 'sill'});
    S.oldPhoto(k, 1300, 790, 240, -4);
  }},
  L03: {keys: ['phone', 'phoneSign', 'photo', 'me'], draw(k) {
    S.roomInside(k, {calendar: false});
    me(k, 240, 790, 11);
    k.vellum(0.42);
    k.cut(rect(120, 800, 1680, 90), C.wood, {lift: 1.5, border: 6, name: 'sill'});
    S.oldPhoto(k, 560, 690, 300, -5);
    S.phone(k, 1180, 560, 2.5, {deg: 7});
    [[920, 380, 880, 480], [1440, 410, 1486, 510], [920, 690, 880, 760], [1440, 680, 1486, 740]].forEach(([a, b, c, d]) => k.line([[a, b], [c, d]], C.red, 8, 3));
  }},
  L04: {keys: ['me', 'phone', 'roomWindow'], draw(k) {
    S.roomInside(k);
    const a = me(k, 860, 900, 19, {action: 'hold'});
    heldPhone(k, a, 1.15);
  }},
  L05: {keys: ['me', 'bubble'], draw(k) {
    k.torn(rect(30, 26, 1860, 1028), C.room, {tex: 'news', lift: 0.3});
    k.cut(rect(130, 80, 1660, 800), C.sky, {lift: 0.6, border: 12, name: 'bigWindow'});
    k.line([[960, 86], [960, 874]], C.wood, 16, 4);
    k.line([[136, 470], [1784, 470]], C.wood, 16, 4);
    const r = rng(41), spots = [[310, 200], [560, 170], [830, 150], [1090, 150], [1360, 170], [1610, 210], [260, 420], [500, 390], [1420, 390], [1680, 420], [300, 660], [530, 610], [1400, 610], [1660, 660], [760, 310], [1170, 310]];
    spots.forEach(([x, y], i) => S.bubble(k, x, y, 170 + r() * 90, [C.red, C.gold, C.cream][i % 3], {tail: i % 2 ? 1 : -1}));
    const a = me(k, 900, 950, 17, {expression: 'sad', action: 'hold'});
    heldPhone(k, a, 1);
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
    k.clawd(1420, 1010, 22, {role: 'staff', expression: 'happy', tint: S.guestTint(0)});
    const a = me(k, 900, 1010, 22, {expression: 'sad'});
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
    S.signTable(k, 1340, 800, 900);
    S.cake(k, 1340, 800, 1.7);
    const a = me(k, 500, 930, 18, {expression: 'sad', action: 'hold'});
    S.rosette(k, a);
    const y = 800 - 340 - 9 * 5.44;
    S.redLine(k, [a.grip, [1000, 560], [1234, y], [1446, y]]);
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
    S.placeCard(k, 1035, 478, 130);
  }},
  L17: {keys: ['me', 'bell', 'hallWindow'], draw(k) {
    const a = lastRow(k, {x: 960, u: 15, foot: 950, opts: {}, bell: true, door: false, tableY: 860, neighbours: true});
    S.rosette(k, a);
  }},
  L18: {keys: ['bride', 'groom', 'altar', 'carpet'], draw(k) {
    S.stage(k);
    S.bride(k, 1240, 840, 13, {expression: 'shy'});
    S.groom(k, 640, 905, 13, {facing: 'right', action: 'walk', frame: 1});
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
    S.hall(k, {door: true});
    const a = me(k, 960, 930, 20, {action: 'hold'});
    S.glass(k, a.grip[0] + 14, a.grip[1] + 14, 1.6);
    S.rosette(k, a);
  }},
  L24: {keys: ['me', 'exitDoor', 'exitSign', 'seatTable'], draw(k) {
    // 桌沿抬到手臂高度，手臂长度不变，两手自然压在桌面上。
    const a = lastRow(k, {x: 760, u: 16, foot: 850, opts: {expression: 'sad'}, neighbours: true, tableY: 708});
    S.rosette(k, {chest: [a.chest[0], a.chest[1] - 40], u: 16});
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
