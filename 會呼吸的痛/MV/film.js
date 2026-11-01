import {SHOTS, shotIndexAt} from './shots.js';
import {ENERGY} from './energy.js';

export const P = {
  nightDeep: '#465f76', night: '#587489', sky0: '#6f8ca6', sky1: '#8aa5b8', sky2: '#a9bdc6', cool: '#b7c6cb',
  cityFar: '#7d96a8', cityMid: '#64808f', cityNear: '#4f6873', lamp: '#f6c35e', lampHi: '#fbe8a8',
  red: '#d85a38', redDark: '#a8432f', white: '#f6efdf', whiteDark: '#d9cfbb',
  floorCool: '#94a9b0', metal: '#7f939c',
  wood: '#b98a5c', woodDark: '#8f6545',
  warm: '#f2dcb0', warmDark: '#e3c08a', floorWarm: '#c99b66', floorWarmDark: '#a97c50',
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
  layer = {};
  add(item) { this.items.push({...item, ...this.layer}); }
  within(layer, paint) { const old = this.layer; this.layer = {...old, ...layer}; paint(); this.layer = old; }
  poly(id, pts, color, edge = 'cut') { this.add({kind: 'poly', id, pts, color, edge}); }
  rect(id, x, y, w, h, color, edge = 'cut') { this.poly(id, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, edge); }
  disk(id, x, y, r, color, edge = 'cut') { this.poly(id, Array.from({length: 18}, (_, i) => [x + Math.cos(i / 18 * 6.2832) * r, y + Math.sin(i / 18 * 6.2832) * r]), color, edge); }
  line(id, pts, color, width) { this.add({kind: 'line', id, pts, color, width}); }
  dots(id, pts, color, size) { this.add({kind: 'dots', id, pts, color, size}); }
  text(id, x, y, size, text, color) { this.add({kind: 'text', id, x, y, size, text, color}); }
  sky(id, x, y, w, h, stops, shift = 0) { this.add({kind: 'sky', id, x, y, w, h, stops, shift}); }
  clawd(id, x, y, opts) { this.add({kind: 'clawd', id, x, y, ...opts}); }
  // 用点阵表现明暗：density 为 0–1 的覆盖比例。
  shade(id, pts, color, density) { this.add({kind: 'poly', id, pts, color, edge: 'cut', density}); }
  shadeRect(id, x, y, w, h, color, density) { this.shade(id, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, density); }
  oval(id, x, y, rx, ry, color, density) { this.shade(id, Array.from({length: 20}, (_, i) => [x + Math.cos(i / 20 * 6.2832) * rx, y + Math.sin(i / 20 * 6.2832) * ry]), color, density); }
  glow(id, x, y, r, color, strength) { this.add({kind: 'glow', id, x, y, r, color, strength}); }
}

const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const energyAt = t => ENERGY[Math.max(0, Math.min(ENERGY.length - 1, Math.round(t * 12)))] / 99;

function makeCity(seed, x0, x1, base, [lo, hi], [wLo, wHi], odds) {
  const r = rng(seed), out = [], lamps = [];
  for (let x = x0; x < x1;) {
    const w = Math.round(wLo + r() * (wHi - wLo)), top = Math.round(lo + r() * (hi - lo));
    out.push([x, top, w, base - top]);
    for (let y = top + 3; y < base - 1; y += 4) for (let lx = x + 2; lx < x + w - 1; lx += 3) if (r() < odds) lamps.push([lx, y, r()]);
    x += w;
  }
  return {out, lamps};
}
const WINDOW = {x0: 24, x1: 206, y0: 16, y1: 142};
const WINDOW_CLIP = [WINDOW.x0, WINDOW.y0, WINDOW.x1, WINDOW.y1];
const CITY = [makeCity(11, -260, 480, 300, [66, 92], [10, 22], 0.07), makeCity(23, -260, 480, 300, [84, 112], [9, 18], 0.15), makeCity(37, -260, 480, 300, [104, 126], [7, 15], 0.28)];
const CITY_DEPTH = [0.34, 0.52, 0.72];
const TOWN = [makeCity(41, -40, 700, 175, [100, 135], [14, 30], 0.08), makeCity(53, -40, 700, 175, [128, 152], [12, 24], 0.2)];
const BEACONS = [CITY[0].out[7], CITY[0].out[19], CITY[0].out[31]];

// 灯火亮起的比例跟随原曲响度；尾奏逐渐熄灭，只留电梯的光。
function lampShare(t) {
  const outro = 1 - span(t, 261.944, 272.6);
  return (0.62 + 0.38 * energyAt(t)) * outro * outro;
}
const lampLit = (lamp, share, t) => lamp[2] < share && Math.floor(t * 1.5 + lamp[2] * 97) % 29 !== 0;

function towerBody(d, cx, base, top, scale) {
  const half = y => { const k = (base - y) / (base - top); return (k < 0.33 ? 26 - 54 * k : k < 0.68 ? 8.2 - 12 * (k - 0.33) : 4 * (1 - k) + 0.6) * scale; };
  for (let i = 0; i < 7; i++) {
    const a = base - (base - top) * i / 7, b = base - (base - top) * (i + 1) / 7;
    d.poly(`towerband${i}`, [[cx - half(a), a], [cx + half(a), a], [cx + half(b), b], [cx - half(b), b]], i % 2 ? P.white : P.red);
    // 钢架的交叉斜撑：每节一组 X。
    const shade = i % 2 ? P.whiteDark : P.redDark;
    for (let j = 0; j < 3; j++) {
      const p = a + (b - a) * j / 3, q = a + (b - a) * (j + 1) / 3;
      d.line(`towerbrace${i}${j}`, [[cx - half(p), p], [cx + half(q), q]], shade, 0.5);
      d.line(`towerbraceB${i}${j}`, [[cx + half(p), p], [cx - half(q), q]], shade, 0.5);
    }
  }
  d.rect('towerdeck', cx - 12 * scale, base - (base - top) * 0.34 - 3, 24 * scale, 5, P.white);
  d.rect('towerdeckGlass', cx - 11 * scale, base - (base - top) * 0.34 - 2, 22 * scale, 2, P.lamp);
  d.rect('towerdeck2', cx - 5 * scale, base - (base - top) * 0.68 - 2, 10 * scale, 4, P.white);
  d.rect('towerdeck2Glass', cx - 4.5 * scale, base - (base - top) * 0.68 - 1, 9 * scale, 1.4, P.lampHi);
  d.poly('towerarch', [[cx - 12 * scale, base], [cx, base - 22 * scale], [cx + 12 * scale, base]], P.sky2);
}

function setTower(d, t) {
  d.within({depth: 0.08}, () => {
    d.sky('sky', -200, -40, 1100, 240, [P.night, P.sky0, P.sky1, P.sky2, P.cool]);
    const stars = [];
    for (let i = 0; i < 46; i++) if (Math.floor(t * 1.2 + i * 3) % 11) stars.push([-40 + hash(i) * 500, -30 + hash(i + 50) * 80]);
    d.dots('stars', stars, P.white, 0.6);
    for (let i = 0; i < 4; i++) {
      const x = ((hash(i + 9) * 520 + t * (0.5 + i * 0.2)) % 560) - 60, y = 18 + i * 13, w = 70 + i * 16;
      d.shadeRect(`cloud${i}`, x, y, w, 2, P.sky2, 0.45);
      d.shadeRect(`cloudTop${i}`, x + w * 0.22, y - 2, w * 0.45, 2, P.sky2, 0.3);
      d.shadeRect(`cloudLow${i}`, x + w * 0.4, y + 2, w * 0.5, 1.5, P.sky2, 0.28);
    }
  });
  const share = lampShare(t);
  for (const [i, c] of [[0, P.cityFar], [1, P.cityMid]]) d.within({depth: [0.3, 0.5][i]}, () => {
    d.poly(`town${i}`, [[-40, 175], ...TOWN[i].out.flatMap(([x, top, w]) => [[x, top], [x + w, top]]), [700, 175]], c);
    d.dots(`townlamps${i}`, TOWN[i].lamps.filter(l => lampLit(l, 0.45 + share * 0.5, t)), i ? P.lamp : P.lampHi, 1);
  });
  d.within({depth: 0.62}, () => towerBody(d, 180, 176, 8, 1.2));
  d.rect('street', -60, 172, 800, 80, P.floorCool, 'torn');
  d.rect('streetCurb', -60, 172, 800, 2, P.metal);
  for (let x = -60; x < 700; x += 26) d.rect(`paving${x}`, x, 176 + (x % 3), 14, 1, P.metal);
  d.rect('entry', 330, 92, 150, 84, P.white);
  for (let x = 336; x < 476; x += 8) d.rect(`entryRib${x}`, x, 96, 1, 22, P.whiteDark);
  d.rect('entryRoof', 322, 84, 166, 10, P.red);
  d.rect('entryRoofShade', 322, 92, 166, 2, P.redDark);
  d.rect('entryDoor', 365, 120, 44, 56, P.cityNear);
  d.rect('entryGlow', 368, 123, 38, 53, P.lamp);
  d.shadeRect('entryGlowEdge', 368, 123, 38, 53, P.lampHi, 0.5);
  d.shade('entrySpill', [[366, 176], [408, 176], [430, 200], [340, 200]], P.lamp, 0.42);
  d.rect('entryPost', 360, 116, 6, 60, P.woodDark);
  d.rect('entryPost2', 408, 116, 6, 60, P.woodDark);
  // 前景的路灯和灌木比角色更快掠过，拉出纵深。
  d.within({depth: 1.35}, () => {
    for (let x = 60; x < 620; x += 118) {
      d.rect(`lampPost${x}`, x, 110, 2, 80, P.cityNear);
      d.rect(`lampHead${x}`, x - 4, 108, 10, 3, P.cityNear);
      d.glow(`lampGlow${x}`, x + 1, 112, 16, P.lampHi, 0.5);
      d.rect(`lampBulb${x}`, x - 2, 111, 6, 1.4, P.lampHi);
    }
    for (let x = -20; x < 660; x += 34) d.oval(`bush${x}`, x, 198, 20 + (x % 7), 8, P.cityNear, 1);
  });
}

const LETTER = {x: 184, y: 152, w: 28, h: 26};
function letterFace(d, s) {
  const {x, y, w, h} = LETTER, mid = Math.abs(s.flip - 0.5) * 2 * (s.layLetter ?? 1);
  d.shadeRect('letterShadow', x + w / 2 - w / 2 * mid + 0.8, y + 0.8, w * mid, h, P.woodDark, 0.7);
  d.rect('letter', x + w / 2 - w / 2 * mid, y, w * mid, h, P.paper);
  if (mid < 0.5) return;
  if (s.flip < 0.5) {
    for (let i = 0; i < 4; i++) d.line(`letterline${i}`, [[x + 3, y + 8 + i * 4], [x + 25 - (i % 3) * 3, y + 8 + i * 4]], P.paperShade, 0.7);
    d.line('melody', [[x + 4, y + 4], [x + 10, y + 2.5], [x + 15, y + 4.5], [x + 22, y + 3]], P.line, 0.7);
    for (const [nx, ny] of [[4, 4], [10, 2.5], [15, 4.5], [22, 3]]) d.oval(`note${nx}`, x + nx, y + ny, 0.7, 0.5, P.line, 1);
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
  d.shadeRect('planShadow', x + 0.8, y + 0.8, 28 * (s.layPlan ?? 1), 26, P.woodDark, 0.7);
  d.rect('plan', x, y, 28 * (s.layPlan ?? 1), 26, P.white);
  if ((s.layPlan ?? 1) < 1) return;
  d.line('planCrease', [[x + 14, y], [x + 14, y + 26]], P.whiteDark, 0.35);
  d.line('planCrease2', [[x, y + 13], [x + 28, y + 13]], P.whiteDark, 0.35);
  d.poly('planTower', [[x + 16, y + 15], [x + 19, y + 3], [x + 22, y + 15]], P.red);
  d.line('planTowerBrace', [[x + 17.6, y + 9], [x + 20.4, y + 9]], P.white, 0.5);
  d.line('planTowerBrace2', [[x + 17, y + 12], [x + 21, y + 12]], P.white, 0.5);
  d.line('planRoute', [[x + 3, y + 7], [x + 7, y + 4], [x + 11, y + 6], [x + 15, y + 8]], P.scarfDark, 0.4);
  for (const [id, fx] of [['planFigA', 14], ['planFigB', 22]]) {
    d.rect(id, x + fx, y + 16, 3, 5, P.skinDark);
    d.disk(`${id}Head`, x + fx + 1.5, y + 15, 1.2, P.skin);
  }
  d.rect('planChair1', x + 2, y + 18, 3, 5, P.woodDark);
  d.rect('planChair2', x + 7, y + 18, 3, 5, P.woodDark);
  d.rect('planLonely', x + 2.4, y + 14.6, 2.2, 3.5, P.skinDark);
  d.disk('planLonelyHead', x + 3.5, y + 13.8, 1, P.skin);
  const open = s.planOpen;
  if (open < 1) d.poly('planFold', [[x, y + 26], [x + 13 * (1 - open) + 0.5, y + 26], [x, y + 26 - 15 * (1 - open) - 0.5]], P.whiteDark);
}

function ticket(d, id, [x, y], used) {
  d.shadeRect(`${id}Shadow`, x - 3.1, y - 1.6, 7, 4, P.woodDark, 0.6);
  d.rect(id, x - 3.5, y - 2, 7, 4, P.paper);
  d.rect(`${id}stub`, x + 1.5, y - 2, 1.6, 4, used ? P.redDark : P.red);
  d.line(`${id}Text`, [[x - 2.6, y - 0.7], [x + 0.6, y - 0.7]], P.line, 0.3);
  d.line(`${id}Text2`, [[x - 2.6, y + 0.6], [x - 0.2, y + 0.6]], P.paperShade, 0.3);
}

function table(d, s) {
  d.rect('tableTop', 150, 148, 64, 38, P.wood);
  d.rect('tableTopEdge', 150, 148, 64, 1, P.warmDark);
  for (let i = 0; i < 7; i++) {
    const from = 151 + hash(i) * 28;
    d.shadeRect(`grain${i}`, from, 151 + i * 5, Math.min(26 + hash(i + 5) * 34, 213 - from), 0.6, P.woodDark, 0.55);
  }
  d.rect('tableFront', 150, 186, 64, 6, P.woodDark);
  d.rect('tableFrontLip', 150, 186, 64, 1, P.floorWarmDark);
  d.rect('tableLegL', 155, 192, 6, 26, P.woodDark);
  d.rect('tableLegR', 203, 192, 6, 26, P.woodDark);
  if (s.past) {
    planFace(d, s);
    d.rect('cup', 196, 143, 6, 8, P.white);
    d.rect('cupWater', 196.8, 146, 4.4, 4, P.warmDark);
    return;
  }
  if (s.envelope) {
    d.rect('envelope', 156, 179, 20, 6, P.paperShade);
    d.line('envelopeFlap', [[156, 179], [166, 183], [176, 179]], P.whiteDark, 0.5);
  }
  planFace(d, s);
  letterFace(d, s);
  d.rect('cup', 196, 143, 6, 8, P.cool);
  d.rect('cupWater', 196.8, 146, 4.4, 4, P.sky1);
  d.rect('cupGleam', 197.2, 144, 1, 6, P.white);
  d.rect('phone', 204, 140, 7, 11, P.cityNear);
  d.rect('phoneGlass', 204.8, 141, 5.4, 9, P.sky2);
  d.shadeRect('phoneScreenCity', 204.8, 146, 5.4, 4, P.cityMid, 1);
  ticket(d, 'ticketA', s.ticketA, s.used);
  ticket(d, 'ticketB', s.ticketB, false);
  if (s.penAt) { const [x, y] = s.penAt; d.line('pen', [[x, y], [x + 4, y + 5]], P.ink, 1.1); }
}

function chairs(d, warm) {
  const c = warm ? P.woodDark : P.metal, seat = warm ? P.wood : P.cityFar, edge = warm ? P.warmDark : P.sky2;
  d.rect('chairABack', 122, 136, 5, 66, c);
  d.rect('chairABackGleam', 122, 136, 1, 44, edge);
  d.rect('chairASeat', 122, 180, 28, 5, seat);
  d.rect('chairASeatEdge', 122, 180, 28, 1, edge);
  d.rect('chairALeg', 124, 185, 4, 33, c);
  d.rect('chairALeg2', 144, 185, 4, 33, c);
  d.rect('chairBBack', 247, 136, 5, 66, c);
  d.rect('chairBBackGleam', 251, 136, 1, 44, edge);
  d.rect('chairBSeat', 218, 180, 34, 5, seat);
  d.rect('chairBSeatEdge', 218, 180, 34, 1, edge);
  d.rect('chairBLeg', 220, 185, 4, 33, c);
  d.rect('chairBLeg2', 246, 185, 4, 33, c);
}

function scarfOnChair(d, state) {
  if (state === 'draped') {
    d.poly('scarfDraped', [[242, 138], [250, 138], [251, 172], [241, 180], [224, 180], [228, 170], [242, 168]], P.scarf);
    d.line('scarfFold', [[244, 140], [245, 166]], P.scarfDark, 1);
    for (let y = 144; y < 166; y += 5) d.line(`scarfKnit${y}`, [[242.5, y], [250, y]], P.scarfDark, 0.4);
    for (let x = 226; x < 240; x += 3) d.line(`scarfFringe${x}`, [[x, 179.5], [x - 1, 184]], P.scarfDark, 0.6);
  } else if (state === 'gathered') {
    d.poly('scarfGathered', [[222, 166], [244, 164], [248, 180], [220, 181]], P.scarf);
    d.line('scarfCrease', [[226, 172], [242, 171]], P.scarfDark, 1.2);
    d.line('scarfCrease2', [[224, 177], [245, 176]], P.scarfDark, 0.6);
  }
}

function dustMotes(d, id, seed, t, [x0, y0, x1, y1], color) {
  const pts = [];
  for (let i = 0; i < 18; i++) {
    const w = x1 - x0, h = y1 - y0, drift = t * (0.8 + hash(seed + i) * 1.4);
    pts.push([x0 + ((hash(seed + i * 7) * w + drift) % w), y0 + ((hash(seed + i * 13) * h - drift * 0.45 + h * 40) % h) + Math.sin(t * 0.7 + i) * 1.4]);
  }
  d.dots(id, pts, color, 0.5);
}

function setDeck(d, s, t) {
  d.rect('wall', -40, -30, 400, 205, P.cool, 'torn');
  d.rect('wallDado', 206, 150, 170, 22, P.sky2);
  d.rect('wallDadoLine', 206, 150, 170, 1, P.metal);
  d.rect('wallLeft', -40, 150, 60, 22, P.sky2);
  d.rect('floor', -40, 172, 400, 90, P.floorCool, 'torn');
  for (let x = -40; x < 360; x += 26) d.line(`tile${x}`, [[x, 172], [x - (x - 150) * 0.28, 232]], P.metal, 0.35);
  for (const y of [180, 192, 208]) d.line(`tileRow${y}`, [[-40, y], [360, y]], P.metal, 0.35);
  d.rect('skirting', -40, 169, 400, 3, P.metal);

  const night = span(t, 18, 110);
  d.within({clip: WINDOW_CLIP}, () => {
    d.within({depth: 0.15}, () => d.sky('nightWindow', -240, 16, 700, 128, [P.nightDeep, P.night, P.sky0, P.sky1, P.sky2], mix(1.6, 0, night)));
    const share = lampShare(t);
    CITY.forEach((layer, i) => d.within({depth: CITY_DEPTH[i]}, () => {
      d.poly(`city${i}`, [[-260, 300], ...layer.out.flatMap(([x, top, w]) => [[x, top], [x + w, top]]), [480, 300]], [P.cityFar, P.cityMid, P.cityNear][i]);
      d.dots(`citylamps${i}`, layer.lamps.filter(l => lampLit(l, share, t)), i ? P.lamp : P.lampHi, i === 2 ? 1.2 : 0.9);
    }));
    d.within({depth: CITY_DEPTH[0]}, () => {
      const blink = Math.floor(t * 1.87) % 2 === 0;
      if (blink && share > 0.02) d.dots('beacons', BEACONS.map(([x, top, w]) => [x + w / 2, top - 1]), P.red, 1.2);
    });
    // L02：一道更亮的灯火由高楼沿视线落到街道。
    if (t >= 26.657 && t < 35.225) {
      const front = mix(84, 236, (t - 26.657) / 8.568);
      d.within({depth: CITY_DEPTH[2]}, () => d.dots('fallingLights', CITY[2].lamps.filter(l => Math.abs(l[1] - front) < 13 && l[2] < 0.82), P.lampHi, 1.5));
    }
    d.within({depth: 0.88}, () => {
      const cars = [];
      for (let i = 0; i < 16; i++) cars.push([-80 + ((hash(i) * 460 + t * (i % 2 ? 9 : -7) + 4600) % 460), 137.5 + (i % 2) * 2]);
      d.rect('road', -240, 136, 700, 7, P.nightDeep);
      if (t < 268) d.dots('carLights', cars, P.lampHi, 0.9);
    });
    // 面向窗外时，玻璃上有 A 的倒影和呼吸的雾气。
    if (s.reflect) {
      d.clawd('reflectionA', AX + 4, AY - 31, {facing: 'front', expression: t < 35 ? 'neutral' : 'sad', action: 'idle', frame: 0, unit: 0.9, density: 0.3, blink: blinkAt(t, 1.3)});
      d.glow('breathFog', AX + 18, AY - 12, 8 + 5 * lung(t, 1), P.white, 0.08 + 0.2 * lung(t, 1));
    }
  });
  d.rect('handrail', 20, 122, 190, 2, P.metal);
  d.rect('handrailGleam', 20, 122, 190, 0.7, P.cool);
  for (const x of [50, 113, 176]) d.rect(`railPost${x}`, x, 124, 1.4, 18, P.metal);
  d.rect('frameTop', 20, 12, 190, 5, P.metal);
  d.rect('frameBottom', 20, 142, 190, 6, P.metal);
  d.rect('frameBottomGleam', 20, 142, 190, 1, P.cool);
  d.rect('frameLeft', 20, 12, 5, 136, P.metal);
  d.rect('frameRight', 205, 12, 5, 136, P.metal);
  d.rect('mullion1', 80, 12, 3, 136, P.metal);
  d.rect('mullion2', 143, 12, 3, 136, P.metal);
  d.rect('mullion1Gleam', 80, 12, 1, 136, P.sky2);
  d.rect('mullion2Gleam', 143, 12, 1, 136, P.sky2);
  // 窗光落在地上，顺着窗格分成三块。
  for (const [i, [a, b]] of [[25, 80], [83, 143], [146, 205]].entries()) d.shade(`windowLight${i}`, [[a, 172], [b, 172], [b - 34, 204], [a - 42, 204]], P.sky2, 0.62 - 0.24 * night);
  d.oval('tableShadow', 182, 214, 48, 6, P.metal, 0.75);
  d.oval('chairAShadow', 136, 216, 22, 4, P.metal, 0.75);
  d.oval('chairBShadow', 234, 216, 24, 4, P.metal, 0.75);

  d.rect('elevFrame', 214, 72, 58, 100, P.metal);
  d.rect('elevFrameGleam', 214, 72, 58, 1, P.cool);
  const open = s.elevator;
  d.rect('elevInside', 218, 78, 50, 94, open > 0 ? P.white : P.cityFar);
  if (open > 0) {
    // 门开后看得见轿厢的进深：两侧壁向后收，后壁更亮，地面没有人。
    d.poly('elevSideL', [[218, 78], [229, 88], [229, 152], [218, 172]], P.paperShade);
    d.poly('elevSideR', [[268, 78], [257, 88], [257, 152], [268, 172]], P.paperShade);
    d.rect('elevBackWall', 229, 88, 28, 64, P.lampHi);
    d.poly('elevCeiling', [[218, 78], [268, 78], [257, 88], [229, 88]], P.white);
    d.rect('elevCeilingStrip', 232, 82, 22, 2, P.lampHi);
    d.poly('elevFloor', [[229, 152], [257, 152], [268, 172], [218, 172]], P.whiteDark);
    d.rect('elevRail', 229, 128, 28, 1.2, P.scarfDark);
  }
  const gap = 25 * open;
  d.rect('elevDoorL', 218, 78, 25 - gap, 94, P.whiteDark);
  d.rect('elevDoorR', 243 + gap, 78, 25 - gap, 94, P.whiteDark);
  d.rect('elevDoorSeam', 242.6 - gap, 78, 0.8, 94, P.metal);
  d.rect('elevDoorSeamR', 242.6 + gap, 78, 0.8, 94, P.metal);
  d.rect('elevJambL', 217, 78, 1.6, 94, P.metal);
  d.rect('elevJambR', 267.4, 78, 1.6, 94, P.metal);
  // 楼层指示灯在 L36 前走到本层，门才打开。
  d.rect('elevPanel', 233, 65, 20, 6, P.nightDeep);
  const arrive = span(t, 238.5, 242.556);
  for (let i = 0; i < 4; i++) d.rect(`elevDot${i}`, 235.5 + i * 4.2, 67, 2, 2, Math.round(arrive * 3) === i && t > 238.5 ? P.lampHi : P.metal);
  d.rect('elevLamp', 237, 66, 12, 4, P.nightDeep);
  d.rect('elevLampOn', 237 + (Math.round(arrive * 3)) * 4, 67, 3, 2, open > 0 ? P.lampHi : P.lamp);
  if (open > 0) d.shade('elevatorSpill', [[218, 172], [268, 172], [268, 222], [150, 222]], P.lampHi, 0.5 * open);
  chairs(d, false);
  scarfOnChair(d, s.scarf);
  dustMotes(d, 'dust', 3, t, [20, 40, 260, 170], P.white);
}

const stickerX = p => mix(225, 244, p);

function setHome(d, s, t) {
  const dim = s.dim ?? 0;
  d.rect('homeWall', -40, -30, 400, 205, P.warm, 'torn');
  for (let y = -24; y < 156; y += 9) for (let x = -36 + (y % 2) * 4; x < 360; x += 12) d.dots(`paper${x}${y}`, [[x, y]], P.warmDark, 0.7);
  d.rect('homeFloor', -40, 172, 400, 90, P.floorWarm, 'torn');
  for (let i = 0; i < 12; i++) d.line(`plank${i}`, [[-40 + i * 34, 172], [-40 + i * 34 - (i * 34 - 190) * 0.3, 232]], P.floorWarmDark, 0.4);
  d.rect('homeBand', -40, 156, 400, 16, P.warmDark);
  d.rect('homeBandTop', -40, 156, 400, 1, P.wood);
  d.rect('homeSkirt', -40, 170, 400, 2, P.woodDark);
  d.rect('homeDoor', 18, 66, 44, 106, P.woodDark);
  d.rect('homeDoorInset', 24, 74, 32, 42, P.wood);
  d.rect('homeDoorInset2', 24, 122, 32, 42, P.wood);
  d.disk('homeKnob', 54, 124, 2, P.lamp);
  d.rect('photoFrame', 88, 92, 20, 24, P.woodDark);
  d.rect('photoMat', 90, 94, 16, 20, P.paper);
  d.poly('photoTower', [[95, 112], [98, 97], [101, 112]], P.red);
  d.rect('shelf', 82, 124, 40, 2, P.woodDark);
  d.rect('shelfBook', 88, 114, 4, 10, P.redDark);
  d.rect('shelfBook2', 93, 116, 3, 8, P.scarfDark);
  d.rect('calendar', 216, 128, 36, 44, P.white);
  d.rect('calendarHead', 216, 128, 36, 8, P.red);
  d.rect('calendarRing', 233, 125, 2, 5, P.line);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) d.rect(`cal${r}${c}`, 218.5 + c * 6.5, 141 + r * 10, 5, 7, P.paperShade);
  d.rect('calSticker', stickerX(s.sticker), 161, 5, 7, P.scarf);
  d.rect('lampCord', 181, -30, 1.4, 60, P.line);
  d.glow('lampPool', 182, 72, 96 - 30 * dim, P.lampHi, 0.7 - 0.4 * dim);
  d.poly('lampShade', [[168, 30], [196, 30], [204, 44], [160, 44]], P.scarf);
  d.rect('lampRim', 160, 43, 44, 1.4, P.scarfDark);
  d.rect('lampBulb', 176, 44, 12, 2, P.lampHi);
  d.shade('lampCone', [[162, 46], [202, 46], [236, 148], [128, 148]], P.lampHi, 0.2 - 0.12 * dim);
  // 等得越久屋里越暗：四周压上地板的深色。
  if (dim > 0) { d.shadeRect('dusk', -40, -30, 170, 202, P.floorWarmDark, 0.32 * dim); d.shadeRect('dusk2', 236, -30, 130, 202, P.floorWarmDark, 0.32 * dim); }
  d.oval('tableShadow', 182, 214, 48, 6, P.floorWarmDark, 0.8);
  d.oval('chairAShadow', 136, 216, 22, 4, P.floorWarmDark, 0.8);
  d.oval('chairBShadow', 234, 216, 24, 4, P.floorWarmDark, 0.8);
  chairs(d, true);
  dustMotes(d, 'dust', 19, t, [120, 50, 250, 150], P.lampHi);
}

function setDoor(d, s, t) {
  d.rect('doorOutside', -60, -40, 230, 260, P.night, 'torn');
  d.within({clip: [-60, -40, 158, 145]}, () => {
    d.sky('doorSky', -60, -40, 230, 185, [P.nightDeep, P.night, P.sky0, P.sky1]);
    d.within({depth: 0.55}, () => {
      for (let i = 0; i < 9; i++) {
        const x = -70 + i * 30, top = 60 + hash(i + 2) * 40, c = i % 2 ? P.cityMid : P.cityNear;
        d.rect(`house${i}`, x, top, 28, 150 - top, c);
        d.poly(`roof${i}`, [[x - 2, top], [x + 14, top - 12], [x + 30, top]], P.nightDeep);
        if (hash(i + 30) > 0.3) d.rect(`houseLamp${i}`, x + 9, top + 12, 7, 8, Math.floor(t / 7 + i) % 5 ? P.lamp : P.cityFar);
      }
    });
    d.rect('fence', -60, 132, 230, 13, P.nightDeep);
    for (let x = -56; x < 160; x += 8) d.rect(`fencePost${x}`, x, 128, 3, 17, P.cityNear);
    d.rect('streetPole', 40, 44, 2, 101, P.nightDeep);
    d.glow('streetLampGlow', 41, 46, 30, P.lampHi, 0.5);
    d.rect('streetLampHead', 34, 42, 14, 3, P.nightDeep);
    d.rect('streetLampBulb', 36, 45, 10, 1.4, P.lampHi);
  });
  d.rect('doorStreet', -60, 145, 230, 80, P.floorCool, 'torn');
  d.rect('doorCurb', -60, 145, 230, 2, P.metal);
  for (let x = -56; x < 158; x += 22) d.rect(`street${x}`, x, 152 + (x % 4), 12, 1, P.metal);
  d.oval('streetLampPool', 41, 152, 34, 6, P.sky2, 0.65);
  d.rect('doorWall', 170, -40, 240, 260, P.warm, 'torn');
  for (let y = -30; y < 118; y += 9) for (let x = 174 + (y % 2) * 4; x < 400; x += 12) d.dots(`hallPaper${x}${y}`, [[x, y]], P.warmDark, 0.7);
  d.rect('hallDado', 170, 118, 240, 27, P.warmDark);
  d.rect('hallDadoLine', 170, 118, 240, 1, P.wood);
  d.rect('doorFloor', 170, 145, 240, 80, P.floorWarm, 'torn');
  for (let x = 170; x < 410; x += 18) d.line(`hallPlank${x}`, [[x, 145], [x + (x - 190) * 0.3, 225]], P.floorWarmDark, 0.35);
  d.rect('hook', 228, 74, 22, 2, P.woodDark);
  if (s.clock) {
    // 与回信草图相同的 19:00：时针指 7，分针随时间微微走动。
    d.disk('hallClock', 232, 52, 8, P.woodDark);
    d.disk('hallClockFace', 232, 52, 6.6, P.white);
    d.line('hallClockHour', [[232, 52], [229.2, 56.3]], P.ink, 0.8);
    const minute = (t % 60) / 60 * Math.PI / 5 - Math.PI / 2;
    d.line('hallClockMinute', [[232, 52], [232 + Math.cos(minute) * 5.4, 52 + Math.sin(minute) * 5.4]], P.ink, 0.55);
  }
  const open = s.doorOpen;
  if (open > 0) d.shade('doorSpill', [[158, 145], [202, 145], [122 - 90 * open, 225], [40 - 90 * open, 225]], P.lamp, 0.5 * open);
  d.rect('doorHead', 150, 24, 60, 10, P.woodDark);
  d.rect('doorJamb', 150, 24, 8, 121, P.woodDark);
  d.rect('doorJamb2', 202, 24, 8, 121, P.woodDark);
  d.rect('doorJambLine', 156, 34, 1, 111, P.line);
  d.rect('doorJambLine2', 203, 34, 1, 111, P.line);
  const w = 44 * (1 - open) + 7;
  d.rect('doorLeaf', 158, 34, w, 111, P.wood);
  if (w > 20) { d.rect('doorPanel', 162, 42, w - 8, 44, P.woodDark); d.rect('doorPanel2', 162, 92, w - 8, 44, P.woodDark); d.rect('doorPanelIn', 163.5, 43.5, w - 11, 41, P.wood); d.rect('doorPanelIn2', 163.5, 93.5, w - 11, 41, P.wood); }
  d.disk('doorKnob', 158 + w - 3.5, 135, 1.8, P.lamp);
}

function setPhone(d, s, t) {
  d.rect('phoneBack', -20, -20, 360, 220, P.wood, 'torn');
  d.rect('phoneWall', -20, -20, 360, 110, P.nightDeep);
  d.rect('phoneTableEdge', -20, 90, 360, 2, P.woodDark);
  for (let i = 0; i < 9; i++) d.glow(`bokeh${i}`, hash(i) * 340 - 10, 8 + hash(i + 20) * 72, 7 + hash(i + 40) * 6, i % 3 ? P.lamp : P.sky2, 0.5 + 0.3 * Math.sin(t * 0.6 + i) ** 2);
  for (let i = 0; i < 6; i++) d.shadeRect(`phoneGrain${i}`, -20 + hash(i + 3) * 150, 104 + i * 15, 90 + hash(i + 9) * 150, 1, P.woodDark, 0.55);
  d.shadeRect('phoneShadow', 94, -2, 152, 198, P.woodDark, 0.75);
  d.rect('phoneBody', 86, -8, 148, 196, P.ink);
  d.rect('phoneBodyEdge', 88, -6, 144, 192, P.cityNear);
  d.within({clip: [94, 2, 226, 178]}, () => {
    d.sky('phoneSky', 94, 2, 132, 176, [P.nightDeep, P.night, P.sky0, P.sky1]);
    d.poly('phoneCity', [[94, 130], [116, 118], [134, 126], [160, 110], [188, 124], [226, 112], [226, 178], [94, 178]], P.cityMid);
    const lamps = [];
    for (let i = 0; i < 34; i++) if (Math.floor(t * 1.5 + i * 2.3) % 9) lamps.push([94 + hash(i + 4) * 132, 128 + hash(i + 44) * 48]);
    d.dots('phoneLamps', lamps, P.lamp, 1.3);
    const shift = mix(0, -46, s.pan), u = mix(2.4, 3, s.grow), x = mix(138, 112, s.grow) + shift, y = mix(90, 72, s.grow);
    d.rect('phoneChairBack', 214 + shift, 88, 8, 90, P.metal);
    d.rect('phoneChairSeat', 176 + shift, 150, 44, 7, P.cityFar);
    d.clawd('selfie', x, y, {facing: 'front', expression: s.expr, action: 'hug', frame: 0, unit: u, breath: lung(t, 0.7), blink: blinkAt(t, 0.4)});
    d.poly('selfieScarf', [[x + 6 * u, y + 20.67 * u], [x + 22 * u, y + 20.67 * u], [x + 20.67 * u, y + 29.33 * u], [x + 7.33 * u, y + 29.33 * u]], P.scarf);
    d.line('selfieScarfKnit', [[x + 7 * u, y + 24 * u], [x + 21 * u, y + 24 * u]], P.scarfDark, 1);
    d.shade('phoneGlare', [[150, 2], [176, 2], [116, 178], [94, 178], [94, 150]], P.cool, 0.14);
  });
  d.rect('phoneNotch', 146, -6, 28, 6, P.ink);
  d.disk('phoneLens', 168, -3, 1.4, P.night);
}

const AX = 121, AY = 156, BX = 211, BY = 156, STAND = [196, 165];
const ARRIVE = {from: [210, 158], leave: 9.52, seat: 12.6};
const CAM = {wide: [150, 110, 1], plan: [167, 165, 6], letter: [198, 165, 6], wrist: [150, 173, 5]};
const PEN_REST = [205, 172], WALK_RATE = 3.75;

// 手只用 character.js 自带的长度；碰不到的东西由角色走过去。手尖位置取自模块的 32 格几何。
const handTip = c => [(c.x ?? AX) + (c.dx ?? 0) + (c.facing === 'left' ? 4 : 28), (c.y ?? AY) + (c.dy ?? 0) + 17.5];

function walkBetween(t, t0, t1, toChair) {
  const p = span(t, t0, t1), k = toChair ? p : 1 - p;
  return {x: Math.round(AX + (STAND[0] - AX) * ease(k)), y: Math.round(AY + (STAND[1] - AY) * Math.min(1, k * 6)), facing: toChair || k === 0 ? 'right' : 'left', expr: 'sad',
    action: p > 0 && p < 1 ? 'walk' : 'idle', frame: Math.floor(t * WALK_RATE) % 4, front: k > 0};
}

function hopTo(t, t0, t1, from, to, facing) {
  const p = span(t, t0, t1), moving = p > 0 && p < 1;
  return {x: Math.round(from[0] + (to[0] - from[0]) * p), y: Math.round(from[1] + (to[1] - from[1]) * p), facing, expr: 'sad',
    action: moving ? 'jump' : 'idle', frame: moving ? 1 + Math.floor(p * 3) : 0, front: true};
}

// A 走出电梯到座位的路径；走到之前车票都在手尖。
function arrivalAt(t) {
  const p = clamp01((t - ARRIVE.leave) / (ARRIVE.seat - ARRIVE.leave));
  return {x: Math.round(ARRIVE.from[0] + (AX - ARRIVE.from[0]) * p), y: Math.round(ARRIVE.from[1] + (AY - ARRIVE.from[1]) * p), facing: t < ARRIVE.leave ? 'right' : 'left', walking: t < ARRIVE.seat};
}

function tableState(t) {
  let ticketA = mixArr([161, 181], [165, 176], span(t, 44.2, 47)), ticketB = [177, 162];
  if (t < 13.4) {
    const {x, y, facing} = arrivalAt(t), land = span(t, ARRIVE.seat, 13.4), hand = facing === 'right' ? [31, 33] : [1, -1];
    ticketA = mixArr([x + hand[0], y + 19], ticketA, land); ticketB = mixArr([x + hand[1], y + 22], ticketB, land);
  }
  const finish = span(t, 251.4, 253.9);
  ticketA = mixArr(ticketA, [169, 176], finish); ticketB = mixArr(ticketB, [177, 176], finish);
  const writing = (t > 212.1 && t < 215.737) || (t >= 228.624 && t < 237.192);
  let scarf = 'draped';
  if (t >= 200.5) scarf = 'gathered';
  if (t >= 216.4) scarf = 'held';
  return {
    ticketA, ticketB, used: t > 44.2, penAt: writing ? null : PEN_REST, scarf,
    planOpen: span(t, 104.2, 108), flip: span(t, 211.4, 212.1),
    layPlan: span(t, ARRIVE.seat, 13.4), layLetter: span(t, 13.4, 14.2),
    words: Math.floor(6 * span(t, 212.6, 214.9)),
    drawn1: t > 230.6, drawn2: t > 234.9,
    elevator: span(t, 242.556, 246.5), envelope: t > ARRIVE.seat,
  };
}

const breath = (t, a, b) => (Math.sin(span(t, a, b) * Math.PI) > 0.45 ? -1 : 0);

// 半速约 56 BPM，两拍一次呼吸；副歌里呼吸更深。
const LUNG_SECONDS = 2 * 60 / 56;
function lung(t, amount) { return amount * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / LUNG_SECONDS)); }
const inChorus = t => (t >= 67.315 && t < 102.702) || (t >= 172.362 && t < 210.93);
function blinkAt(t, seed) {
  const slot = Math.floor((t + seed) / 3.7), at = slot * 3.7 + hash(slot + seed) * 2.6;
  return t + seed - at >= 0 && t + seed - at < 0.17;
}
const shake = t => (Math.floor(t * 8) % 2 ? 1 : 0);
const SAD = {expr: 'sad', facing: 'right'};

// 每镜返回场景、相机与角色状态；p 为本镜进度。
const SCRIPT = {
  P01: (p, t) => ({set: 'tower', cam: [mix(170, 280, p), 100, 1], walker: {x: Math.round(mix(40, 340, p)), frame: Math.floor(t * WALK_RATE) % 4}}),
  P02: (p, t) => {
    const {x, y, facing, walking} = arrivalAt(t);
    return {set: 'deck', cam: CAM.wide, a: walking ? {x, y, facing, expr: 'neutral', action: 'walk', frame: Math.floor(t * WALK_RATE) % 4, front: true} : {expr: 'neutral', facing: 'right'}};
  },
  L01: (p, t) => ({set: 'deck', cam: mixArr(CAM.wide, [130, 128, 1.6], p), a: {expr: 'neutral', facing: t < 18.646 ? 'right' : 'back'}}),
  L02: (p) => ({set: 'deck', cam: mixArr([130, 128, 1.6], [130, 126, 2.1], p), a: {expr: 'neutral', facing: 'back'}}),
  L03: (p, t) => ({set: 'deck', cam: mixArr([130, 126, 2.1], [170, 160, 1.7], p), a: t < 35.759 ? {expr: 'neutral', facing: 'back'} : {...SAD, dy: 1}}),
  L04: (p, t) => ({set: 'deck', cam: mixArr([170, 160, 1.7], CAM.plan, span(t, 43.77, 46)), a: {...SAD, dy: 1, dx: Math.round(18 * span(t, 43.8, 44.8))}}),
  L05: (p, t) => {
    const sticker = span(t, 53.5, 56.5), rise = span(t, 51.5, 52.8) * (1 - span(t, 56.7, 58.2)), onChair = [Math.round(stickerX(sticker) - 2), 151], back = 1 - span(t, 50.736, 53);
    return {set: 'home', cam: mixArr(CAM.plan, [170, 112, 1.15], span(t, 50.759, 53)), a: {expr: t < 50.736 ? 'sad' : 'happy', facing: 'right', dx: Math.round(18 * back), dy: t < 50.736 ? 1 : 0},
      b: {expr: 'happy', scarf: true, x: Math.round(BX + (onChair[0] - BX) * rise), y: Math.round(BY + (onChair[1] - BY) * rise)},
      sticker, suitcase: true, corner: true};
  },
  L06: (p, t) => ({set: 'home', cam: mixArr([170, 112, 1.15], [172, 160, 1.9], p), a: {expr: t < 59.327 ? 'happy' : 'sad', facing: 'right'}, b: {expr: t < 59.327 ? 'happy' : 'sad', scarf: true, dx: Math.round(mix(0, -17, span(t, 59.327, 60.3)))},
    key: mix(196, 160, span(t, 60.5, 64)), sticker: 1, corner: true}),
  L07: (p, t) => ({set: 'deck', cam: mixArr([172, 160, 1.9], [140, 168, 3], span(t, 67.849, 68.9)), a: {...SAD, dy: breath(t, 67.8, 70.6)}}),
  L08: (p, t) => ({set: 'deck', cam: mixArr([140, 168, 3], [150, 172, 1.7], p), a: {...SAD, dx: t < 71.74 ? 0 : shake(t)}}),
  L09: (p, t) => ({set: 'deck', cam: mixArr([150, 172, 1.7], [172, 165, 2.3], p), a: {...SAD, dx: shake(t), mouth: 'hum'}, notes: t}),
  L10: () => ({set: 'deck', cam: [172, 165, 2.3], a: {...SAD, mouth: 'bite'}}),
  L11: (p, t) => ({set: 'deck', cam: mixArr([172, 165, 2.3], [165, 168, 2.3], p), a: {...SAD, dy: breath(t, 84.9, 88)}}),
  L12: (p, t) => ({set: 'deck', cam: mixArr([165, 168, 2.3], CAM.wrist, span(t, 88.8, 90.2)), a: SAD, rub: Math.floor((t - 88.8) * WALK_RATE) % 2}),
  L13: (p, t) => ({set: 'home', cam: mixArr(CAM.wrist, [180, 152, 1.5], span(t, 93.623, 95.3)), a: {expr: t < 93.6 ? 'sad' : 'neutral', facing: 'right', phone: true}, b: {expr: 'shy', dx: Math.round(-17 * span(t, 93.623, 95.3))}, heldScarf: true, corner: true}),
  L14: (p, t) => ({set: 'deck', cam: [180, 152, 1.5], a: {expr: t < 98.963 ? 'neutral' : 'sad', facing: 'right', action: t >= 98.963 ? 'hug' : 'idle'}}),
  I01: (p, t) => ({set: 'deck', cam: mixArr([180, 152, 1.5], CAM.plan, span(t, 102.7, 104.5)), a: {...SAD, action: t < 103.259 ? 'hug' : 'idle', dx: Math.round(mix(mix(0, 11, span(t, 103.259, 104)), 0, span(t, 108, 109)))}}),
  I02: (p, t) => ({set: 'home', cam: mixArr(CAM.plan, [200, 160, 2.4], span(t, 112.7, 121)), b: {expr: 'sad', scarf: true, dx: Math.round(-11 * span(t, 112.7, 114))}, emptyA: true, planFolded: span(t, 114, 119)}),
  L15: (p, t) => {
    const settled = t >= 123.6;
    return {set: 'home', cam: mixArr([200, 160, 2.4], [185, 158, 1.7], p), a: {expr: 'neutral', facing: 'right', phone: true}, b: {expr: settled ? 'happy' : 'sad', scarf: true, tense: settled, dx: Math.round(-11 * (1 - span(t, 123.6, 124.7)))}, planFolded: 1};
  },
  L16: (p, t) => {
    const clenched = t >= 132.191;
    return {set: 'home', cam: mixArr([185, 158, 1.7], [222, 182, 4], span(t, 131.7, 134)), b: {expr: clenched ? 'sad' : 'happy', scarf: true, tense: !clenched}, a: {expr: 'neutral', facing: 'right', phone: true}, planFolded: 1,
      ...(clenched ? {fist: 1.6 + Math.abs(Math.sin((t - 134) * 2)) * 0.5, underEdge: span(t, 132.191, 134)} : {})};
  },
  L17: (p, t) => {
    const leave = span(t, 146.3, 148.2), x = Math.round(56 + (-50 - 56) * leave);
    return {set: 'door', cam: mixArr([214, 144, 4], [150, 92, 1], span(t, 140.759, 145)), a: {x, y: 118, facing: 'left', expr: 'neutral', action: leave > 0 && leave < 1 ? 'walk' : 'idle', frame: Math.floor(t * WALK_RATE) % 4}, b: {x: 203, y: 118, expr: 'sad', scarf: true}, doorOpen: span(t, 142, 146), suitcaseAt: x - 16, doorFist: t < 140.759};
  },
  L18: (p, t) => ({set: 'home', cam: mixArr([158, 130, 1], CAM.wide, span(t, 149.327, 150.4)), b: {expr: 'sad', scarf: true}, emptyA: true, dinner: true}),
  L19: (p, t) => ({set: 'door', cam: mixArr([115, 72, 1], [150, 100, 1.4], span(t, 155.736, 158)), a: {x: 118, y: 118, facing: 'left', expr: 'neutral'}, b: {x: 176, y: 118, expr: 'sad', scarf: true, action: t > 156 ? 'hug' : 'idle'}, doorOpen: 1, suitcaseAt: 102}),
  L20: (p, t) => {
    const walk = span(t, 164.328, 170), x = Math.round(118 + (-70 - 118) * walk);
    return {set: 'door', cam: [150, 100, 1.4], a: {x, y: 118, facing: 'left', expr: 'neutral', action: walk > 0 ? 'walk' : 'idle', frame: Math.floor(t * WALK_RATE) % 4}, b: {x: 176, y: 118, expr: 'sad', scarf: true, action: 'hug'}, doorOpen: 1, suitcaseAt: x - 16};
  },
  L21: (p, t) => ({set: 'deck', cam: mixArr([232, 158, 2], [160, 170, 1.9], p), a: {...SAD, dy: breath(t, 172.9, 176)}}),
  L22: (p, t) => ({set: 'deck', cam: [160, 170, 1.9], a: {...SAD, action: t < 177.191 ? 'idle' : 'hug', dy: Math.round(2 * span(t, 177.191, 179)), dx: t < 177.191 || t > 180.5 ? 0 : shake(t)}}),
  L23: (p, t) => ({set: 'deck', cam: mixArr([160, 170, 1.9], [172, 165, 2.3], span(t, 181, 183)), a: {...SAD, action: 'hug', dy: 2, mouth: 'hum'}, tear: span(t, 182.5, 185.5)}),
  L24: () => ({set: 'deck', cam: [172, 165, 2.3], a: {...SAD, action: 'hug', dy: 2}}),
  L25: (p, t) => ({set: 'deck', cam: mixArr([172, 165, 2.3], [168, 172, 2.3], span(t, 190.032, 193.794)), a: {...SAD, action: t < 190.032 ? 'hug' : 'idle', dy: 2 + breath(t, 190.032, 193)}}),
  L26: (p, t) => ({set: 'deck', cam: mixArr([168, 172, 2.3], CAM.wrist, span(t, 193.8, 195.2)), a: {...SAD, dy: t < 197.3 ? 2 : t < 197.7 ? 1 : 0}, rub: t < 197.3 ? Math.floor((t - 193.8) * 5) % 2 : undefined}),
  L27: (p, t) => ({set: 'deck', cam: mixArr(CAM.wrist, [205, 165, 2], span(t, 198.066, 200.3)), a: walkBetween(t, 198.1, 200.3, true)}),
  L28: (p, t) => {
    const a = walkBetween(t, 208.4, 210.7, false);
    return {set: 'deck', cam: mixArr([205, 165, 2], [185, 165, 2], span(t, 208.4, 210.9)), a: {...a, action: t > 203.8 && t < 208.4 ? 'hug' : a.action, facing: t < 208.4 ? 'right' : a.facing}};
  },
  L29: (p, t) => {
    const write = span(t, 212.6, 214.9), onLetter = [Math.round(186 + 22 * write), 140];
    const a = t < 212.1 ? hopTo(t, 211.464, 212.1, [AX, AY], [186, 140], 'right') : {x: onLetter[0], y: onLetter[1], facing: 'left', expr: 'sad', action: write > 0 && write < 1 ? 'walk' : 'idle', frame: Math.floor(t * WALK_RATE) % 4, front: true};
    return {set: 'deck', cam: mixArr([185, 165, 2], CAM.letter, span(t, 211.464, 212.4)), a, pen: t > 212.1 ? [onLetter[0] + 0.4, 156.5] : null};
  },
  L30: (p, t) => {
    const hop = hopTo(t, 215.737, 216.4, [208, 140], STAND, t < 215.737 ? 'left' : 'right');
    return {set: 'deck', cam: mixArr(CAM.letter, [205, 165, 2.4], span(t, 215.737, 216.9)), a: {...hop, action: t >= 216.4 ? 'hug' : hop.action},
      pen: t < 215.737 ? [208.4, 156.5] : null, holdScarf: t >= 216.4 ? Math.max(0.01, span(t, 216.4, 217)) : 0};
  },
  L31: (p, t) => ({set: 'phone', pan: 0, grow: span(t, 220.055, 221.1), expr: t < 220.079 ? 'sad' : 'happy'}),
  L32: (p, t) => ({set: 'phone', pan: span(t, 225, 227.5), grow: 1, expr: span(t, 225.396, 226.5) < 1 ? 'happy' : 'neutral'}),
  L33: (p, t) => {
    const ready = t >= 228.624;
    return {set: 'deck', cam: mixArr([219.3, 160, 3], [190, 165, 7], span(t, 228.624, 229.7)), a: {x: 188, y: 154, facing: ready ? 'left' : 'front', expr: ready ? 'sad' : 'neutral', action: ready ? 'idle' : 'hug', front: true}, holdScarf: 1, pen: ready ? [188 + Math.sin((t - 229) * 6), 170] : null};
  },
  L34: (p, t) => {
    const walk = span(t, 232.4, 233.2), x = Math.round(188 + 11 * walk);
    return {set: 'deck', cam: mixArr([190, 165, 7], [204, 165, 7], walk), a: {x, y: 154, facing: 'left', expr: 'sad', action: walk > 0 && walk < 1 ? 'walk' : 'idle', frame: Math.floor(t * WALK_RATE) % 4, front: true}, holdScarf: 1, pen: [x + Math.sin((t - 233) * 6), 170], sleeve: [229, 180]};
  },
  L35: (p, t) => {
    const set = t >= 237.192, a = hopTo(t, 237.192, 238.2, [199, 154], [AX, AY], set ? 'right' : 'left');
    return {set: 'deck', cam: mixArr([204, 165, 7], CAM.wide, span(t, 236.8, 240.6)), a: {...a, expr: set ? 'shy' : 'sad', action: t >= 238.2 ? 'hug' : a.action, front: t < 238.2, dy: t >= 238.2 ? Math.round(2 * span(t, 238.2, 239.2)) : 0}, holdScarf: 1,
      pen: set ? null : [199 + Math.sin((t - 233) * 6), 170], sleeve: mixArr([229, 180], [166, 190], span(t, 236.8, 238.8))};
  },
  L36: (p, t) => ({set: 'deck', cam: CAM.wide, a: {expr: t < 242.556 ? 'shy' : 'sad', facing: 'right', action: 'hug', dy: 2}, holdScarf: 1, sleeve: t < 245 ? mixArr([166, 190], [210, 260], span(t, 242, 245)) : null}),
  L37: (p, t) => {
    const moved = t >= 251.426;
    return {set: 'deck', cam: mixArr(mixArr(CAM.wide, [164, 170, 5], span(t, 250.9, 252.2)), CAM.wide, span(t, 254, 261.944)),
      a: {...SAD, dy: moved ? 1 : 2, action: !moved || t > 254.3 ? 'hug' : 'idle', dx: Math.round(mix(mix(0, 23, span(t, 251.426, 252.2)), 0, span(t, 254, 255.2)))}, holdScarf: 1};
  },
};

// 换景只发生在不透明实物完全遮住画面时；键为进入该镜的衔接。
const OCCLUDERS = {
  P02: 'post', L05: 'envelope', L06: 'calendar', L07: 'scarf', L13: 'scarf', L14: 'scarf', I02: 'plan',
  L15: 'post', L17: 'post', L18: 'post', L19: 'post', L21: 'post', L31: 'phone', L33: 'phone',
};
export const WIPE_SECONDS = 0.534;

// 分镜关键画面的取样时刻；未列出的镜头取本镜 72% 处。
export const KEY_TIMES = {
  P01: 3, L04: 48, L05: 55.5, L06: 61.5, L13: 96.5, L14: 101.8, I01: 107.5, L16: 137, L17: 146, L27: 202.5, L28: 206, L29: 214.5, L30: 218.5,
  L33: 231.6, L34: 235.8, L35: 240.8, L36: 248, L37: 268,
};

function clawdA(d, s) {
  const a = s.a, x = (a.x ?? AX) + (a.dx ?? 0), y = (a.y ?? AY) + (a.dy ?? 0);
  d.oval('shadowA', x + 16, y + 27.5, 12, 1.6, s.set === 'home' ? P.floorWarmDark : P.metal, 0.8);
  const still = (a.action ?? 'idle') === 'idle' || a.action === 'hug';
  d.clawd('A', x, y, {facing: a.facing ?? 'right', expression: a.expr ?? 'neutral', action: a.action ?? 'idle', frame: a.frame ?? 0,
    breath: still ? lung(s.t, inChorus(s.t) ? 1.9 : 1) : 0, blink: (a.facing ?? 'right') !== 'back' && blinkAt(s.t, 0)});
  if (a.mouth === 'hum') d.disk('mouthHum', x + 21.5, y + 18.5, 1.2, P.ink);
  if (a.mouth === 'bite') d.rect('mouthBite', x + 20, y + 18.5, 3, 0.9, P.ink);
  if (a.phone) d.rect('ownPhone', x + 27, y + 9, 4, 8, P.cityNear);
}

function clawdB(d, s) {
  const b = s.b, x = (b.x ?? BX) + (b.dx ?? 0), y = (b.y ?? BY) + (b.dy ?? 0);
  d.oval('shadowB', x + 16, y + 27.5, 12, 1.6, s.set === 'home' ? P.floorWarmDark : P.metal, 0.8);
  d.clawd('B', x, y, {facing: 'left', expression: b.expr ?? 'neutral', action: b.action ?? 'idle', frame: 0, breath: lung(s.t + 0.7, 0.9), blink: blinkAt(s.t, 1.9)});
  if (b.scarf) {
    d.rect('bScarf', x + 7, y + 20, 16, 3, P.scarf);
    d.rect('bScarfShade', x + 7, y + 22.4, 16, 0.6, P.scarfDark);
    d.poly('bScarfTail', [[x + 19, y + 22], [x + 23, y + 22], [x + 24, y + 29], [x + 20, y + 29]], P.scarf);
    d.line('bScarfTailKnit', [[x + 19.5, y + 25.5], [x + 23.5, y + 25.5]], P.scarfDark, 0.4);
  }
  if (b.tense) d.rect('bTense', x + 9, y + 11, 5, 0.9, P.ink);
}

export function frameAt(t) {
  const index = shotIndexAt(t), shot = SHOTS[index];
  let build = shot, buildT = t, wipe = null;
  const kind = OCCLUDERS[shot.id];
  if (kind && t - shot.start < WIPE_SECONDS) {
    const w = (t - shot.start) / WIPE_SECONDS;
    wipe = {x: 320 - 700 * w, width: 380, kind};
    if (w < 0.5) { build = SHOTS[index - 1]; buildT = build.end - 1e-4; }
  }
  const d = new Draw();
  const s = SCRIPT[build.id](span(buildT, build.start, build.end), buildT);
  s.t = buildT;
  const ts = tableState(buildT);
  const cam = s.cam ?? [160, 90, 1];

  if (s.set === 'tower') {
    setTower(d, buildT);
    const {x, frame} = s.walker;
    d.oval('shadowA', x + 16, 175.5, 12, 1.6, P.metal, 0.8);
    d.clawd('A', x, 148, {facing: 'right', expression: 'neutral', action: 'walk', frame, blink: blinkAt(buildT, 0)});
    ticket(d, 'handTicket', [x + 31, 167], false);
    ticket(d, 'handTicket2', [x + 33, 170], false);
  }
  if (s.set === 'phone') setPhone(d, s, buildT);
  if (s.set === 'door') {
    setDoor(d, {...s, clock: build.id === 'L19' || build.id === 'L20'}, buildT);
    if (s.suitcaseAt !== undefined) {
      d.rect('suitcase', s.suitcaseAt, 126, 16, 19, P.metal);
      d.rect('suitcaseStrap', s.suitcaseAt + 7, 126, 2, 19, P.whiteDark);
      d.rect('suitcaseHandle', s.suitcaseAt + 5, 123, 6, 3, P.cityNear);
      d.oval('suitcaseShadow', s.suitcaseAt + 8, 145, 10, 1.2, P.metal, 0.8);
    }
    if (s.a) clawdA(d, s);
    if (s.b) clawdB(d, s);
    if (s.doorFist) { d.disk('fistB', s.b.x + 5, s.b.y + 17.5, 2, P.skinLight); d.disk('fistA', s.b.x + 25, s.b.y + 17.5, 2, P.skinLight); }
  }
  if (s.set === 'deck' || s.set === 'home') {
    if (s.set === 'deck') setDeck(d, {...ts, reflect: s.a?.facing === 'back'}, buildT);
    else setHome(d, {sticker: s.sticker ?? 0, dim: s.dinner ? span(buildT, 148.793, 155.2) : 0}, buildT);
    if (s.suitcase) { d.rect('homeSuitcase', 96, 165, 18, 30, P.metal); d.rect('homeStrap', 104, 165, 2, 30, P.whiteDark); }
    const frontA = s.a && (s.a.front || (s.a.dx ?? 0) >= 4), frontB = (s.b?.dx ?? 0) < 0;
    if (s.a && !frontA) clawdA(d, s);
    if (s.b && !frontB) clawdB(d, s);
    table(d, s.set === 'home' ? {past: true, planOpen: s.corner ? 0 : 1 - (s.planFolded ?? 0), planShift: 24 * (s.planFolded ?? 0)} : ts);
    if (s.dinner) {
      d.rect('dinnerCover', 152, 151, 60, 30, P.wood);
      for (const [x, id] of [[166, 'dish1'], [198, 'dish2']]) { d.disk(id, x, 166, 9, P.white); d.disk(`${id}Rim`, x, 166, 7.4, P.whiteDark); d.disk(`${id}Food`, x, 166, 5, P.warmDark); d.disk(`${id}Top`, x - 1, 165, 2.4, P.scarfDark); }
      // 饭菜的热气在这一句的前段散尽。
      if (buildT < 152.5) d.dots('dinnerSteam', [166, 198].flatMap(x => [0, 1, 2].map(i => [x + Math.sin(buildT * 2 + i * 2) * 2, 158 - ((buildT * 5 + i * 5) % 15)])), P.white, 0.7);
    }
    if (s.key !== undefined) { d.disk('key', s.key, 171, 2.6, P.lamp); d.rect('keyStem', s.key + 2, 170.4, 6, 1.4, P.lamp); }
    if (frontA) clawdA(d, s);
    if (s.b && frontB) clawdB(d, s);
    if (s.heldScarf) {
      const [hx, hy] = handTip({x: BX, y: BY, ...s.b, facing: 'left'});
      d.poly('offeredScarf', [[hx - 26, hy - 5], [hx + 2, hy - 5], [hx + 2, hy + 6], [hx - 28, hy + 6]], P.scarf);
    }
    if (s.holdScarf) {
      const k = ease(s.holdScarf), ax = (s.a.x ?? AX) + (s.a.dx ?? 0), ay = (s.a.y ?? AY) + (s.a.dy ?? 0);
      const hx = mix(235, ax + 16, k), hy = mix(172, ay + 25, k);
      d.poly('heldScarf', [[hx - 8, hy - 4], [hx + 8, hy - 4], [hx + 8, hy + 4], [hx + 6, hy + 4], [hx + 6, hy + 11], [hx + 3, hy + 11], [hx + 3, hy + 4], [hx - 3, hy + 4], [hx - 3, hy + 9], [hx - 6, hy + 9], [hx - 6, hy + 4], [hx - 8, hy + 4]], P.scarf);
    }
    if (s.rub !== undefined) {
      const [tx, ty] = handTip(s.a);
      d.disk('thumb', tx - 3 + s.rub * 2, ty, 1.1, P.skinLight);
    }
    if (s.fist !== undefined) {
      d.disk('fistB', BX + 5, BY + 17.5, s.fist, P.skinLight);
      d.disk('fistA', BX + 25, BY + 17.5, s.fist, P.skinLight);
      if (s.underEdge > 0) d.rect('underEdge', 170, 128, 100, 42, P.woodDark);
    }
    if (s.pen) d.line('penInHand', [handTip(s.a), s.pen], P.ink, 1.1);
    if (s.notes !== undefined) d.dots('hummedNotes', [[151, 160 - (s.notes % 2) * 3], [156, 154 - ((s.notes + 1) % 2) * 3]], P.ink, 0.9);
    if (s.tear > 0 && s.tear < 1) d.disk('tearDrop', mix(141, 158, s.tear), mix(172, 168, s.tear), 1, P.tear);
    if (s.set === 'deck' && buildT > 184 && buildT < 211) d.disk('tearMark', 158, 168, 1.1, P.tear);
    if (s.sleeve) { const [x, y] = s.sleeve; d.line('sleeve', [[x + 22, y + 60], [x, y]], P.cityNear, 7); d.rect('tissue', x - 7, y - 6, 9, 8, P.white); }
  }
  const vignette = {color: s.set === 'home' ? P.floorWarmDark : P.nightDeep, amount: 0.42 + (inChorus(buildT) ? 0.14 : 0) + 0.26 * span(buildT, 262, 272)};
  return {shot: build.id, cam: {cx: cam[0], cy: cam[1], z: cam[2]}, items: d.items, wipe, vignette};
}
