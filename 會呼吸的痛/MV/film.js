import {SHOTS, shotIndexAt} from './shots.js';

export const P = {
  sky0: '#6f8ca6', sky1: '#8aa5b8', sky2: '#a9bdc6', cool: '#b7c6cb',
  cityFar: '#7d96a8', cityMid: '#64808f', cityNear: '#4f6873', lamp: '#f6c35e', lampHi: '#fbe8a8',
  red: '#d85a38', redDark: '#a8432f', white: '#f6efdf', whiteDark: '#d9cfbb',
  floorCool: '#94a9b0', metal: '#7f939c',
  wood: '#b98a5c', woodDark: '#8f6545',
  warm: '#f2dcb0', warmDark: '#e3c08a', floorWarm: '#c99b66',
  paper: '#f5e7c9', paperShade: '#e0cfa8', scarf: '#e5b547', scarfDark: '#c9932f',
  ink: '#352e2a', tear: '#83bdcf', skin: '#da7758', skinLight: '#ed9b75', skinDark: '#b85d47', line: '#713f32',
};

const clamp01 = v => Math.min(1, Math.max(0, v));
const ease = v => { const x = clamp01(v); return x * x * (3 - 2 * x); };
const mix = (a, b, p) => a + (b - a) * ease(p);
const mixArr = (a, b, p) => a.map((v, i) => mix(v, b[i], p));
const span = (t, a, b) => clamp01((t - a) / (b - a));
const rng = seed => { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };

class Draw {
  items = [];
  poly(id, pts, color, edge = 'cut') { this.items.push({kind: 'poly', id, pts, color, edge}); }
  rect(id, x, y, w, h, color, edge = 'cut') { this.poly(id, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, edge); }
  disk(id, x, y, r, color, edge = 'cut') { this.poly(id, Array.from({length: 18}, (_, i) => [x + Math.cos(i / 18 * 6.2832) * r, y + Math.sin(i / 18 * 6.2832) * r]), color, edge); }
  line(id, pts, color, width) { this.items.push({kind: 'line', id, pts, color, width}); }
  dots(id, pts, color, size) { this.items.push({kind: 'dots', id, pts, color, size}); }
  text(id, x, y, size, text, color) { this.items.push({kind: 'text', id, x, y, size, text, color}); }
  sky(id, x, y, w, h, stops) { this.items.push({kind: 'sky', id, x, y, w, h, stops}); }
  clawd(id, x, y, opts) { this.items.push({kind: 'clawd', id, x, y, ...opts}); }
}

function makeCity(seed, x0, x1, base, [lo, hi], [wLo, wHi], odds) {
  const r = rng(seed), out = [], lamps = [];
  for (let x = x0; x < x1;) {
    const w = Math.round(wLo + r() * (wHi - wLo)), top = Math.round(lo + r() * (hi - lo));
    out.push([x, top, w, base - top]);
    for (let y = top + 3; y < base - 1; y += 4) for (let lx = x + 2; lx < x + w - 1; lx += 3) if (r() < odds) lamps.push([lx, y]);
    x += w;
  }
  return {out, lamps};
}
const WINDOW = {x0: 24, x1: 206};
const CITY = [makeCity(11, 20, 210, 142, [66, 92], [10, 22], 0.06), makeCity(23, 20, 210, 142, [84, 112], [9, 18], 0.14), makeCity(37, 20, 210, 142, [104, 126], [7, 15], 0.28)];
const TOWN = [makeCity(41, -40, 700, 175, [100, 135], [14, 30], 0.08), makeCity(53, -40, 700, 175, [128, 152], [12, 24], 0.2)];

function towerBody(d, cx, base, top, scale) {
  const half = y => { const k = (base - y) / (base - top); return (k < 0.33 ? 26 - 54 * k : k < 0.68 ? 8.2 - 12 * (k - 0.33) : 4 * (1 - k) + 0.6) * scale; };
  for (let i = 0; i < 7; i++) {
    const a = base - (base - top) * i / 7, b = base - (base - top) * (i + 1) / 7;
    d.poly(`towerband${i}`, [[cx - half(a), a], [cx + half(a), a], [cx + half(b), b], [cx - half(b), b]], i % 2 ? P.white : P.red);
  }
  d.rect('towerdeck', cx - 12 * scale, base - (base - top) * 0.34 - 3, 24 * scale, 5, P.white);
  d.rect('towerdeck2', cx - 5 * scale, base - (base - top) * 0.68 - 2, 10 * scale, 4, P.white);
  d.poly('towerarch', [[cx - 12 * scale, base], [cx, base - 22 * scale], [cx + 12 * scale, base]], P.sky2);
}

function setTower(d) {
  d.sky('sky', -60, -40, 800, 240, [P.sky0, P.sky1, P.sky2, P.cool]);
  for (const [i, c] of [[0, P.cityFar], [1, P.cityMid]]) {
    d.poly(`town${i}`, [[-40, 175], ...TOWN[i].out.flatMap(([x, top, w]) => [[x, top], [x + w, top]]), [700, 175]], c);
    d.dots(`townlamps${i}`, TOWN[i].lamps, i ? P.lamp : P.lampHi, 1);
  }
  towerBody(d, 180, 176, 8, 1.2);
  d.rect('street', -60, 172, 800, 80, P.floorCool, 'torn');
  d.rect('entry', 330, 92, 150, 84, P.white);
  d.rect('entryRoof', 322, 84, 166, 10, P.red);
  d.rect('entryDoor', 365, 120, 44, 56, P.cityNear);
  d.rect('entryPost', 360, 116, 6, 60, P.woodDark);
  d.rect('entryPost2', 408, 116, 6, 60, P.woodDark);
}

const LETTER = {x: 184, y: 152, w: 28, h: 26};
function letterFace(d, s) {
  const {x, y, w, h} = LETTER, mid = Math.abs(s.flip - 0.5) * 2;
  d.rect('letter', x + w / 2 - w / 2 * mid, y, w * mid, h, P.paper);
  if (mid < 0.5) return;
  if (s.flip < 0.5) {
    for (let i = 0; i < 4; i++) d.line(`letterline${i}`, [[x + 3, y + 8 + i * 4], [x + 25, y + 8 + i * 4]], P.paperShade, 0.7);
    d.line('melody', [[x + 4, y + 4], [x + 10, y + 2.5], [x + 15, y + 4.5], [x + 22, y + 3]], P.line, 0.7);
    return;
  }
  d.rect('sketchDoor', x + 2, y + 7, 11, 15, P.paperShade);
  d.disk('sketchClock', x + 7.5, y + 9.6, 1.8, P.white);
  d.text('clockText', x + 2, y + 25, 1.6, '19:00 18:50', P.line);
  d.rect('sketchTokyo', x + 15, y + 7, 11, 15, P.paperShade);
  d.poly('sketchTower', [[x + 21, y + 21], [x + 23, y + 9], [x + 25, y + 21]], P.red);
  d.rect('sketchBee', x + 16, y + 17, 2, 4, P.skinDark);
  if (s.drawn1) d.clawd('sketchA1', x + 3.5, y + 14.5, {facing: 'front', expression: 'neutral', action: 'idle', frame: 0, unit: 0.25});
  if (s.drawn2) d.clawd('sketchA2', x + 15.8, y + 14.5, {facing: 'back', expression: 'neutral', action: 'idle', frame: 0, unit: 0.17});
  if (s.words) d.text('confession', x + 2.4, y + 5, 3.6, '其实我很想你'.slice(0, s.words), P.ink);
}

function planFace(d, s) {
  const x = 153 + (s.planShift ?? 0), y = 152;
  d.rect('plan', x, y, 28, 26, P.white);
  d.poly('planTower', [[x + 16, y + 15], [x + 19, y + 3], [x + 22, y + 15]], P.red);
  d.rect('planFigA', x + 14, y + 16, 3, 5, P.skinDark);
  d.rect('planFigB', x + 22, y + 16, 3, 5, P.skinDark);
  d.rect('planChair1', x + 2, y + 7, 3, 5, P.woodDark);
  d.rect('planChair2', x + 7, y + 7, 3, 5, P.woodDark);
  d.rect('planLonely', x + 2.4, y + 3.6, 2.2, 3.5, P.skinDark);
  const open = s.planOpen;
  if (open < 1) d.poly('planFold', [[x, y], [x + 13 * (1 - open) + 0.5, y], [x, y + 15 * (1 - open) + 0.5]], P.whiteDark);
}

function ticket(d, id, [x, y], used) {
  d.rect(id, x - 3.5, y - 2, 7, 4, P.paper);
  d.rect(`${id}stub`, x + 1.5, y - 2, 1.6, 4, used ? P.redDark : P.red);
}

function table(d, s) {
  d.rect('tableTop', 150, 148, 64, 38, P.wood);
  d.rect('tableFront', 150, 186, 64, 6, P.woodDark);
  d.rect('tableLegL', 155, 192, 6, 26, P.woodDark);
  d.rect('tableLegR', 203, 192, 6, 26, P.woodDark);
  if (s.past) {
    planFace(d, s);
    d.rect('cup', 196, 143, 6, 8, P.white);
    return;
  }
  if (s.envelope) d.rect('envelope', 156, 179, 20, 6, P.paperShade);
  planFace(d, s);
  letterFace(d, s);
  d.rect('cup', 196, 143, 6, 8, P.cool);
  d.rect('phone', 204, 140, 7, 11, P.cityNear);
  d.rect('phoneGlass', 204.8, 141, 5.4, 9, P.sky2);
  ticket(d, 'ticketA', s.ticketA, s.used);
  ticket(d, 'ticketB', s.ticketB, false);
  if (s.penAt) { const [x, y] = s.penAt; d.line('pen', [[x, y], [x + 4, y + 5]], P.ink, 1.1); }
}

function chairs(d, warm) {
  const c = warm ? P.woodDark : P.metal, seat = warm ? P.wood : P.cityFar;
  d.rect('chairABack', 122, 136, 5, 66, c);
  d.rect('chairASeat', 122, 180, 28, 5, seat);
  d.rect('chairALeg', 124, 185, 4, 33, c);
  d.rect('chairALeg2', 144, 185, 4, 33, c);
  d.rect('chairBBack', 247, 136, 5, 66, c);
  d.rect('chairBSeat', 218, 180, 34, 5, seat);
  d.rect('chairBLeg', 220, 185, 4, 33, c);
  d.rect('chairBLeg2', 246, 185, 4, 33, c);
}

function scarfOnChair(d, state) {
  if (state === 'draped') {
    d.poly('scarfDraped', [[242, 138], [250, 138], [251, 172], [241, 180], [224, 180], [228, 170], [242, 168]], P.scarf);
    d.line('scarfFold', [[244, 140], [245, 166]], P.scarfDark, 1);
  } else if (state === 'gathered') {
    d.poly('scarfGathered', [[222, 166], [244, 164], [248, 180], [220, 181]], P.scarf);
    d.line('scarfCrease', [[226, 172], [242, 171]], P.scarfDark, 1.2);
  }
}

function setDeck(d, s) {
  d.rect('wall', -40, -30, 400, 205, P.cool, 'torn');
  d.rect('floor', -40, 172, 400, 90, P.floorCool, 'torn');
  d.sky('nightWindow', WINDOW.x0, 16, WINDOW.x1 - WINDOW.x0, 128, [P.sky0, P.sky1, P.sky2]);
  CITY.forEach((layer, i) => {
    d.poly(`city${i}`, [[WINDOW.x0, 142], ...layer.out.flatMap(([x, top, w]) => [[Math.max(WINDOW.x0, x), top], [Math.min(WINDOW.x1, x + w), top]]), [WINDOW.x1, 142]], [P.cityFar, P.cityMid, P.cityNear][i]);
    d.dots(`citylamps${i}`, layer.lamps.filter(([x]) => x > WINDOW.x0 + 2 && x < WINDOW.x1 - 2), i ? P.lamp : P.lampHi, i === 2 ? 1.2 : 0.9);
  });
  d.rect('frameTop', 20, 12, 190, 5, P.metal);
  d.rect('frameBottom', 20, 142, 190, 6, P.metal);
  d.rect('frameLeft', 20, 12, 5, 136, P.metal);
  d.rect('frameRight', 205, 12, 5, 136, P.metal);
  d.rect('mullion1', 80, 12, 3, 136, P.metal);
  d.rect('mullion2', 143, 12, 3, 136, P.metal);

  d.rect('elevFrame', 214, 72, 58, 100, P.metal);
  d.rect('elevInside', 218, 78, 50, 94, P.cityFar);
  const gap = 25 * s.elevator;
  d.rect('elevDoorL', 218, 78, 25 - gap, 94, P.whiteDark);
  d.rect('elevDoorR', 243 + gap, 78, 25 - gap, 94, P.whiteDark);
  d.rect('elevLamp', 237, 66, 12, 4, s.elevator > 0 ? P.lamp : P.sky2);
  chairs(d, false);
  scarfOnChair(d, s.scarf);
}

const stickerX = p => mix(228, 248, p);

function setHome(d, s) {
  d.rect('homeWall', -40, -30, 400, 205, P.warm, 'torn');
  d.rect('homeFloor', -40, 172, 400, 90, P.floorWarm, 'torn');
  d.rect('homeBand', -40, 156, 400, 16, P.warmDark);
  d.rect('homeDoor', 18, 66, 44, 106, P.woodDark);
  d.rect('homeDoorInset', 24, 74, 32, 42, P.wood);
  d.disk('homeKnob', 54, 124, 2, P.lamp);
  d.rect('calendar', 222, 108, 36, 42, P.white);
  d.rect('calendarHead', 222, 108, 36, 8, P.red);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) d.rect(`cal${r}${c}`, 224.5 + c * 6.5, 119 + r * 10, 5, 7, P.paperShade);
  d.rect('calSticker', stickerX(s.sticker), 139, 5, 7, P.scarf);
  d.rect('lampCord', 181, -30, 1.4, 60, P.line);
  d.poly('lampShade', [[168, 30], [196, 30], [204, 44], [160, 44]], P.scarf);
  chairs(d, true);
}

function setDoor(d, s) {
  d.rect('doorOutside', -60, -40, 230, 260, P.sky2, 'torn');
  d.rect('doorStreet', -60, 145, 230, 80, P.floorCool, 'torn');
  d.rect('doorWall', 170, -40, 240, 260, P.warm, 'torn');
  d.rect('doorFloor', 170, 145, 240, 80, P.floorWarm, 'torn');
  d.rect('doorHead', 150, 24, 60, 10, P.woodDark);
  d.rect('doorJamb', 150, 24, 8, 121, P.woodDark);
  d.rect('doorJamb2', 202, 24, 8, 121, P.woodDark);
  const w = 44 * (1 - s.doorOpen) + 7;
  d.rect('doorLeaf', 158, 34, w, 111, P.wood);
  d.disk('doorKnob', 158 + w - 3.5, 128, 1.8, P.lamp);
}

function setPhone(d, s) {
  d.rect('phoneBack', -20, -20, 360, 220, P.cool, 'torn');
  d.rect('phoneBody', 86, -8, 148, 196, P.cityNear);
  d.sky('phoneSky', 94, 2, 132, 176, [P.sky0, P.sky1, P.sky2]);
  d.poly('phoneCity', [[94, 130], [116, 118], [134, 126], [160, 110], [188, 124], [226, 112], [226, 178], [94, 178]], P.cityMid);
  d.dots('phoneLamps', [[108, 150], [124, 140], [150, 134], [168, 150], [194, 140], [212, 150], [140, 164], [186, 164], [120, 170], [206, 170]], P.lamp, 1.3);
  const shift = mix(0, -46, s.pan);
  d.rect('phoneChairBack', 214 + shift, 88, 8, 90, P.metal);
  d.rect('phoneChairSeat', 176 + shift, 150, 44, 7, P.cityFar);
  d.poly('phoneScarfChair', [[176 + shift, 150], [214 + shift, 150], [214 + shift, 154], [176 + shift, 154]], P.cityFar);
  d.clawd('selfie', 112 + shift, 72, {facing: 'front', expression: s.smile ? 'happy' : 'neutral', action: 'hug', frame: 0, unit: 3});
  d.poly('selfieScarf', [[130 + shift, 134], [178 + shift, 134], [174 + shift, 160], [134 + shift, 160]], P.scarf);
}

const AX = 126, AY = 156, BX = 208, BY = 156, STAND_X = 196, STAND_Y = 165;
const CAM = {wide: [150, 110, 1], plan: [167, 165, 6], letter: [198, 165, 6], wrist: [150, 176, 5]};
const CHEST = [145, 172], PEN_REST = [205, 172];

// 手臂只比身体略短；够不到的东西由角色凑近或走过去。
function arm(d, id, from, to) {
  d.line(`${id}Under`, [from, to], P.line, 5);
  d.line(`${id}Fill`, [from, to], P.skin, 3.4);
  d.disk(`${id}Hand`, to[0], to[1], 2.4, P.skinLight);
}
const shoulderA = a => [(a.x ?? AX) + (a.dx ?? 0) + 27, (a.y ?? AY) + (a.dy ?? 0) + 17];
const shoulderB = b => [(b.x ?? BX) + (b.dx ?? 0) + 7, (b.y ?? BY) + (b.dy ?? 0) + 17];

// A 在座位和空椅之间走动；走动时在桌子前方。
function walkBetween(t, t0, t1, toChair) {
  const p = span(t, t0, t1), k = toChair ? p : 1 - p;
  return {x: AX + (STAND_X - AX) * ease(k), y: AY + (STAND_Y - AY) * Math.min(1, k * 6), facing: toChair ? 'right' : 'left', expr: 'sad',
    action: p > 0 && p < 1 ? 'walk' : 'idle', frame: Math.floor(t * WALK_RATE) % 4, front: k > 0};
}

function tableState(t) {
  let ticketA = mixArr([161, 181], [164, 173], span(t, 44.2, 47)), ticketB = [177, 162];
  const finish = span(t, 251.4, 253.9);
  ticketA = mixArr(ticketA, [168, 176], finish); ticketB = mixArr(ticketB, [176, 176], finish);
  const writing = (t > 212.1 && t < 215.1) || (t > 228.5 && t < 236.8);
  let scarf = 'draped';
  if (t >= 200.5) scarf = 'gathered';
  if (t >= 216.2) scarf = 'held';
  return {
    ticketA, ticketB, used: t > 44.2, penAt: writing ? null : PEN_REST, scarf,
    planOpen: span(t, 104.2, 108), flip: span(t, 211.4, 212.3),
    words: Math.floor(6 * span(t, 212.6, 214.9)),
    drawn1: t > 230.6, drawn2: t > 234.9,
    elevator: span(t, 242.5, 246.5), envelope: t > 11,
  };
}

const breath = (t, a, b) => (Math.sin(span(t, a, b) * Math.PI) > 0.45 ? -1 : 0);
const shake = t => (Math.floor(t * 8) % 2 ? 1 : 0);
const SAD = {expr: 'sad', facing: 'right'};
const WALK_RATE = 3.75;

// 每镜返回场景、相机与角色状态；p 为本镜进度。
const SCRIPT = {
  P01: (p, t) => ({set: 'tower', cam: [mix(170, 280, p), 100, 1], walker: {x: mix(40, 340, p), frame: Math.floor(t * WALK_RATE) % 4}}),
  P02: (p, t) => ({set: 'deck', cam: mixArr([110, 140, 1.5], CAM.wide, span(t, 9.2, 14.21)), a: {expr: 'neutral', facing: 'right'},
    arm: mixArr([156, 172], [164, 170], span(t, 9.2, 13))}),
  L01: (p) => ({set: 'deck', cam: mixArr(CAM.wide, [130, 128, 1.6], p), a: {expr: 'neutral', facing: 'back'}}),
  L02: (p) => ({set: 'deck', cam: mixArr([130, 128, 1.6], [130, 126, 2.1], p), a: {expr: 'neutral', facing: 'back'}}),
  L03: (p) => ({set: 'deck', cam: mixArr([130, 126, 2.1], [170, 160, 1.7], p), a: {...SAD, dy: 1}}),
  L04: (p, t) => ({set: 'deck', cam: mixArr([170, 160, 1.7], CAM.plan, span(t, 43.77, 46)), a: {...SAD, dy: 1, dx: Math.round(8 * span(t, 43.8, 44.4))},
    arm: mixArr([166, 178], [165, 172], span(t, 44.2, 47))}),
  L05: (p, t) => {
    const sticker = span(t, 53.5, 56.5), rise = span(t, 51.5, 52.8);
    return {set: 'home', cam: mixArr(CAM.plan, [170, 112, 1.15], span(t, 50.5, 53)), a: {expr: 'happy', facing: 'right'},
      b: {expr: 'happy', scarf: true, dx: Math.round(mix(0, 8 + 20 * sticker, rise)), dy: Math.round(mix(0, -18, rise))},
      armB: rise < 1 ? null : [stickerX(sticker) + 2.5, 143], sticker, suitcase: true};
  },
  L06: (p, t) => ({set: 'home', cam: mixArr([170, 112, 1.15], [172, 160, 1.9], p), a: {expr: 'sad', facing: 'right'}, b: {expr: 'sad', scarf: true, dx: Math.round(mix(0, -14, span(t, 59, 60)))},
    armB: mixArr([200, 172], [190, 172], span(t, 60, 62)), key: mix(186, 160, span(t, 60, 64)), sticker: 1, armA: mixArr([156, 172], CHEST, span(t, 64.5, 66.8))}),
  L07: (p, t) => ({set: 'deck', cam: [140, 168, 3], a: {...SAD, dy: breath(t, 67.8, 70.6)}, arm: CHEST}),
  L08: (p, t) => ({set: 'deck', cam: mixArr([140, 168, 3], [150, 172, 1.7], p), a: {...SAD, dx: shake(t)}, arm: [CHEST[0] + shake(t), CHEST[1]]}),
  L09: (p, t) => ({set: 'deck', cam: mixArr([150, 172, 1.7], [172, 165, 2.3], p), a: {...SAD, dx: shake(t), mouth: 'hum'}, notes: t}),
  L10: () => ({set: 'deck', cam: [172, 165, 2.3], a: {...SAD, mouth: 'bite'}}),
  L11: (p, t) => ({set: 'deck', cam: mixArr([172, 165, 2.3], [165, 168, 2.3], p), a: {...SAD, dy: breath(t, 84.9, 88)}}),
  L12: (p, t) => ({set: 'deck', cam: mixArr([165, 168, 2.3], CAM.wrist, span(t, 88.8, 90.2)), a: SAD, wrist: Math.floor((t - 88.8) * WALK_RATE) % 2}),
  L13: (p, t) => ({set: 'home', cam: mixArr([190, 165, 2.2], [180, 152, 1.5], span(t, 93.3, 95.3)), a: {expr: 'neutral', facing: 'right', phone: true}, b: {expr: 'shy', dx: -14},
    armB: mixArr([198, 170], [189, 166], span(t, 93.5, 96)), heldScarf: true}),
  L14: (p, t) => ({set: 'deck', cam: [180, 152, 1.5], a: SAD, arm: mixArr([156, 172], [165, 163], span(t, 98.9, 101.5))}),
  I01: (p, t) => ({set: 'deck', cam: mixArr([180, 152, 1.5], CAM.plan, span(t, 102.7, 104.5)), a: {...SAD, dx: Math.round(8 * span(t, 102.7, 104))},
    arm: mixArr(mixArr([165, 163], [162, 159], span(t, 102.7, 104.2)), [161, 166], span(t, 104.3, 108))}),
  I02: (p, t) => ({set: 'home', cam: mixArr(CAM.plan, [200, 160, 2.4], span(t, 112.7, 121)), b: {expr: 'sad', scarf: true, dx: Math.round(-8 * span(t, 112.7, 114))}, emptyA: true,
    armB: mixArr([206, 170], [200, 166], span(t, 114, 119)), planFolded: span(t, 114, 119)}),
  L15: (p) => ({set: 'home', cam: mixArr([200, 160, 2.4], [185, 158, 1.7], p), a: {expr: 'neutral', facing: 'right', phone: true}, b: {expr: 'happy', scarf: true, tense: true}, planFolded: 1}),
  L16: (p, t) => ({set: 'home', cam: mixArr([185, 158, 1.7], [222, 182, 4], span(t, 131.7, 134)), b: {expr: 'sad', scarf: true}, a: {expr: 'neutral', facing: 'right', phone: true}, planFolded: 1,
    fist: 2 + Math.abs(Math.sin((t - 134) * 2)) * 0.7, underEdge: span(t, 132, 134)}),
  L17: (p, t) => ({set: 'door', cam: mixArr([200, 100, 2.4], [150, 92, 1], span(t, 141, 145)), a: {x: 56, y: 118, facing: 'left', expr: 'neutral'}, b: {x: 214, y: 118, expr: 'sad', scarf: true},
    doorOpen: span(t, 142, 146), suitcaseAt: 40, armB: mixArr([214, 132], [208, 128], span(t, 141, 142))}),
  L18: () => ({set: 'home', cam: CAM.wide, b: {expr: 'sad', scarf: true}, emptyA: true, dinner: true}),
  L19: (p, t) => ({set: 'door', cam: mixArr([175, 105, 2], [150, 100, 1.4], p), a: {x: 118, y: 118, facing: 'left', expr: 'neutral'}, b: {x: 176, y: 118, expr: 'sad', scarf: true},
    doorOpen: 1, suitcaseAt: 102, armB: mixArr([176, 134], [168, 133], span(t, 156, 160))}),
  L20: (p, t) => {
    const x = mix(118, -70, span(t, 164.2, 170));
    return {set: 'door', cam: [150, 100, 1.4], a: {x, y: 118, facing: 'left', expr: 'neutral', action: 'walk', frame: Math.floor(t * WALK_RATE) % 4}, b: {x: 176, y: 118, expr: 'sad', scarf: true},
      doorOpen: 1, suitcaseAt: x - 16, armB: [168, 133]};
  },
  L21: (p, t) => ({set: 'deck', cam: mixArr([232, 158, 2], [160, 170, 1.9], p), a: {...SAD, dy: breath(t, 172.9, 176)}}),
  L22: (p, t) => ({set: 'deck', cam: [160, 170, 1.9], a: {...SAD, action: 'hug', dy: Math.round(2 * span(t, 176.8, 179)), dx: shake(t)}}),
  L23: (p, t) => ({set: 'deck', cam: mixArr([160, 170, 1.9], [172, 165, 2.3], span(t, 181, 183)), a: {...SAD, action: 'hug', dy: 2, mouth: 'hum'}, tear: span(t, 182.5, 185.5)}),
  L24: (p, t) => ({set: 'deck', cam: [172, 165, 2.3], a: {...SAD, dy: 2}, arm: mixArr([156, 176], [150, 174], span(t, 186.3, 187.6))}),
  L25: (p, t) => ({set: 'deck', cam: mixArr([172, 165, 2.3], [168, 172, 2.3], p), a: {...SAD, dy: 2 + breath(t, 190, 193)}}),
  L26: (p, t) => ({set: 'deck', cam: mixArr([168, 172, 2.3], CAM.wrist, span(t, 193.8, 195.2)), a: {...SAD, dy: 2}, wrist: Math.floor((t - 193.8) * 5) % 2}),
  L27: (p, t) => ({set: 'deck', cam: mixArr([175, 165, 2], [205, 165, 2], span(t, 198.1, 200.3)), a: walkBetween(t, 198.1, 200.3, true),
    arm: t > 200.3 ? mixArr([226, 180], [232, 176], span(t, 200.3, 203)) : null}),
  L28: (p, t) => ({set: 'deck', cam: mixArr([205, 165, 2], [185, 165, 2], span(t, 208.4, 210.9)), a: walkBetween(t, 208.4, 210.7, false),
    arm: t < 208.2 ? mixArr([232, 176], [232, 170], span(t, 203.8, 206)) : null}),
  L29: (p, t) => ({set: 'deck', cam: mixArr([185, 165, 2], CAM.letter, span(t, 210.93, 212)), a: SAD,
    arm: t < 211.7 ? null : mixArr([192, 178], [188 + 18 * span(t, 212.6, 214.9), 172], span(t, 212.2, 212.6)), handIn: true,
    pen: t > 212.1 && t < 215.1 ? [186.4 + 21.6 * span(t, 212.6, 214.9), 157] : null}),
  L30: (p, t) => ({set: 'deck', cam: mixArr(CAM.letter, [205, 165, 2.4], span(t, 215.2, 216.6)),
    a: {...walkBetween(t, 215.2, 216.2, true), action: t > 216.3 ? 'hug' : walkBetween(t, 215.2, 216.2, true).action},
    holdScarf: t >= 216.2 ? Math.max(0.01, span(t, 216.2, 216.8)) : 0}),
  L31: () => ({set: 'phone', pan: 0, smile: true}),
  L32: (p, t) => ({set: 'phone', pan: span(t, 225, 227.5), smile: span(t, 225, 226.5) < 1}),
  L33: (p, t) => ({set: 'deck', cam: mixArr([198, 165, 4], [190, 165, 7], span(t, 228.2, 229.2)), a: {...SAD, action: 'hug'}, holdScarf: 1,
    arm: [188 + 2 * Math.sin((t - 229) * 6), 178], handIn: true, pen: [190 + Math.sin((t - 229) * 6), 170]}),
  L34: (p, t) => ({set: 'deck', cam: mixArr([190, 165, 7], [204, 165, 7], span(t, 232.4, 233.2)), a: {...SAD, action: 'hug'}, holdScarf: 1,
    arm: [202 + 2 * Math.sin((t - 233) * 6), 178], handIn: true, pen: [202 + Math.sin((t - 233) * 6), 170], sleeve: [222, 175]}),
  L35: (p, t) => ({set: 'deck', cam: mixArr([204, 165, 7], CAM.wide, span(t, 236.8, 240.6)), a: {expr: 'shy', facing: 'right', action: 'hug', dy: Math.round(2 * span(t, 237, 238.5))}, holdScarf: 1,
    sleeve: mixArr([222, 175], [166, 190], span(t, 236.8, 238.8))}),
  L36: (p, t) => ({set: 'deck', cam: CAM.wide, a: {...SAD, action: 'hug', dy: 2}, holdScarf: 1, sleeve: t < 245 ? mixArr([166, 190], [210, 260], span(t, 242, 245)) : null}),
  L37: (p, t) => ({set: 'deck', cam: mixArr(mixArr(CAM.wide, [164, 170, 5], span(t, 250.9, 252.2)), CAM.wide, span(t, 254, 261.944)), a: {...SAD, dy: 1, action: t > 254.3 ? 'hug' : 'idle', dx: Math.round(mix(mix(0, 12, span(t, 250.9, 251.4)), 0, span(t, 254, 255)))}, holdScarf: 1,
    arm: t > 251.4 && t < 254 ? mixArr([170, 178], [176, 178], span(t, 251.4, 253.9)) : null}),
};

// 换景只发生在不透明实物完全遮住画面时；键为进入该镜的衔接。
const OCCLUDERS = {
  P02: P.woodDark, L05: P.paperShade, L06: P.white, L07: P.scarf, L13: P.scarf, L14: P.scarf, I02: P.white,
  L15: P.woodDark, L17: P.woodDark, L18: P.woodDark, L19: P.woodDark, L21: P.woodDark, L31: P.cityNear, L33: P.cityNear,
};
export const WIPE_SECONDS = 0.534;

// 分镜关键画面的取样时刻；未列出的镜头取本镜 72% 处。
export const KEY_TIMES = {
  P01: 3, L05: 55.5, L06: 64, L13: 96.5, L14: 101.8, I01: 110, L16: 137, L27: 202.5, L28: 207, L29: 214.5, L30: 218.5,
  L33: 231.6, L34: 235.8, L35: 240.8, L36: 248, L37: 268,
};

function clawdA(d, s) {
  const a = s.a, x = (a.x ?? AX) + (a.dx ?? 0), y = (a.y ?? AY) + (a.dy ?? 0);
  d.clawd('A', x, y, {facing: a.facing ?? 'right', expression: a.expr ?? 'neutral', action: a.action ?? 'idle', frame: a.frame ?? 0});
  if (a.mouth === 'hum') d.disk('mouthHum', x + 21.5, y + 18.5, 1.2, P.ink);
  if (a.mouth === 'bite') d.rect('mouthBite', x + 20, y + 18.5, 3, 0.9, P.ink);
  if (a.phone) { d.rect('ownPhone', x + 29, y + 10, 4, 8, P.cityNear); d.rect('ownPhoneArm', x + 26, y + 16, 5, 2, P.skin); }
}

function clawdB(d, s) {
  const b = s.b, x = (b.x ?? BX) + (b.dx ?? 0), y = (b.y ?? BY) + (b.dy ?? 0);
  d.clawd('B', x, y, {facing: 'left', expression: b.expr ?? 'neutral', action: 'idle', frame: 0});
  if (b.scarf) { d.rect('bScarf', x + 7, y + 20, 16, 3, P.scarf); d.poly('bScarfTail', [[x + 19, y + 22], [x + 23, y + 22], [x + 24, y + 29], [x + 20, y + 29]], P.scarf); }
  if (b.tense) d.rect('bTense', x + 9, y + 11, 5, 0.9, P.ink);
}

export function frameAt(t) {
  const index = shotIndexAt(t), shot = SHOTS[index];
  let build = shot, buildT = t, wipe = null;
  const color = OCCLUDERS[shot.id];
  if (color && t - shot.start < WIPE_SECONDS) {
    const w = (t - shot.start) / WIPE_SECONDS;
    wipe = {x: 320 - 700 * w, width: 380, color};
    if (w < 0.5) { build = SHOTS[index - 1]; buildT = build.end - 1e-4; }
  }
  const d = new Draw();
  const s = SCRIPT[build.id](span(buildT, build.start, build.end), buildT);
  const ts = tableState(buildT);
  const cam = s.cam ?? [160, 90, 1];

  if (s.set === 'tower') {
    setTower(d);
    const {x, frame} = s.walker;
    d.clawd('A', x, 148, {facing: 'right', expression: 'neutral', action: 'walk', frame});
    ticket(d, 'handTicket', [x + 31, 172], false);
    ticket(d, 'handTicket2', [x + 34, 175], false);
  }
  if (s.set === 'phone') setPhone(d, s);
  if (s.set === 'door') {
    setDoor(d, s);
    if (s.suitcaseAt !== undefined) { d.rect('suitcase', s.suitcaseAt, 126, 16, 19, P.metal); d.rect('suitcaseStrap', s.suitcaseAt + 7, 126, 2, 19, P.whiteDark); }
    if (s.a) clawdA(d, s);
    if (s.b) clawdB(d, s);
    if (s.armB) arm(d, 'armB', [s.b.x + 6, 134], s.armB);
  }
  if (s.set === 'deck' || s.set === 'home') {
    if (s.set === 'deck') setDeck(d, ts); else setHome(d, {sticker: s.sticker ?? 0});
    if (s.suitcase) { d.rect('homeSuitcase', 96, 165, 18, 30, P.metal); d.rect('homeStrap', 104, 165, 2, 30, P.whiteDark); }
    if (s.a && !s.a.front) clawdA(d, s);
    const leaningB = (s.b?.dx ?? 0) < 0;
    if (s.b && !leaningB) clawdB(d, s);
    table(d, s.set === 'home' ? {past: true, planOpen: 1 - (s.planFolded ?? 0), planShift: 24 * (s.planFolded ?? 0)} : ts);
    if (s.a?.front) clawdA(d, s);
    if (s.b && leaningB) clawdB(d, s);
    if (s.dinner) {
      d.rect('dinnerCover', 152, 151, 60, 30, P.wood);
      for (const [x, id] of [[166, 'dish1'], [198, 'dish2']]) { d.disk(id, x, 166, 9, P.white); d.disk(`${id}Food`, x, 166, 5, P.warmDark); }
    }
    if (s.key !== undefined) { d.disk('key', s.key, 170, 2.6, P.lamp); d.rect('keyStem', s.key + 2, 169.4, 6, 1.4, P.lamp); }
    if (s.heldScarf) d.poly('offeredScarf', [[s.armB[0] - 26, s.armB[1] - 5], [s.armB[0] + 4, s.armB[1] - 5], [s.armB[0] + 3, s.armB[1] + 6], [s.armB[0] - 28, s.armB[1] + 6]], P.scarf);
    if (s.armB) arm(d, 'armB', shoulderB(s.b), s.armB);
    if (s.armA) arm(d, 'armA', shoulderA(s.a), s.armA);
    if (s.arm) arm(d, 'arm', s.handIn ? [s.arm[0] - 4, s.arm[1] + 44] : shoulderA(s.a), s.arm);
    if (s.holdScarf) {
      const k = ease(s.holdScarf), ax = (s.a.x ?? AX) + (s.a.dx ?? 0), ay = (s.a.y ?? AY) + (s.a.dy ?? 0);
      const hx = mix(235, ax + 20, k), hy = mix(172, ay + 20, k);
      d.poly('heldScarf', [[hx - 8, hy - 4], [hx + 8, hy - 4], [hx + 8, hy + 4], [hx + 6, hy + 4], [hx + 6, hy + 15], [hx + 3, hy + 15], [hx + 3, hy + 4], [hx - 3, hy + 4], [hx - 3, hy + 12], [hx - 6, hy + 12], [hx - 6, hy + 4], [hx - 8, hy + 4]], P.scarf);
    }
    if (s.wrist !== undefined) {
      const dy = s.a.dy ?? 0;
      d.line('wristBase', [[150, 173 + dy], [162, 176 + dy]], P.line, 5);
      d.line('wristFill', [[150, 173 + dy], [162, 176 + dy]], P.skin, 3.4);
      d.disk('thumb', 155 + s.wrist * 3.5, 174.5 + dy + s.wrist * 0.8, 1.6, P.skinLight);
    }
    if (s.fist !== undefined) {
      d.disk('fistB', 215, 178, s.fist, P.skinLight);
      d.disk('fistA', 220, 179, s.fist, P.skin);
      if (s.underEdge > 0) d.rect('underEdge', 170, 128, 100, 40, P.woodDark);
    }
    if (s.pen && s.arm) d.line('penInHand', [s.arm, s.pen], P.ink, 1.1);
    if (s.notes !== undefined) d.dots('hummedNotes', [[156, 160 - (s.notes % 2) * 3], [161, 154 - ((s.notes + 1) % 2) * 3]], P.ink, 0.9);
    if (s.tear > 0 && s.tear < 1) d.disk('tearDrop', mix(146, 158, s.tear), mix(172, 158, s.tear), 1, P.tear);
    if (s.set === 'deck' && buildT > 184 && buildT < 211) d.disk('tearMark', 158, 158, 1.1, P.tear);
    if (s.sleeve) { const [x, y] = s.sleeve; d.line('sleeve', [[x + 22, y + 60], [x, y]], P.cityNear, 7); d.rect('tissue', x - 7, y - 6, 9, 8, P.white); }
  }
  return {shot: build.id, cam: {cx: cam[0], cy: cam[1], z: cam[2]}, items: d.items, wipe};
}
