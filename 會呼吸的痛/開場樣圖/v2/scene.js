// 三种画风共用的开场场景。坐标单位为 320×180 原生格，纸艺与蜡笔版乘以 U 得到 1920×1080。
export const W = 320, H = 180, U = 6;

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const COLORS = {
  sky: ['#a8c0c4', '#c2d2cc', '#e2dfc6', '#f3e4c4', '#f5d3a8', '#eebc90'],
  sun: '#fbe8a8', lamp: '#f6c35e',
  far: '#dccfb8', mid: '#b7c0b8', near: '#8aa0a6', nearDark: '#6b848c', rail: '#4f6873',
  red: '#d85a38', redDark: '#a8432f', white: '#f6efdf', whiteDark: '#dccfb8',
  wood: '#b98a5c', woodDark: '#8f6545',
  floor: '#e6d3ae', floorDark: '#d3bc93', floorShadow: '#b8a98f',
  leaf: '#e5b547', leafDark: '#c9932f', branch: '#5f4a3e',
  caseBody: '#6f9087', caseDark: '#557269',
};

// 东京铁塔：中心 x=96，塔尖 y=14，塔基 y=131（被近景城市遮住）。
export const TOWER = {
  cx: 96, top: 14, base: 131,
  mainDeck: [88, 92, 11], topDeck: [52, 57, 4],
  bands: [[14, 24, 'red'], [24, 34, 'white'], [34, 52, 'red'], [52, 57, 'white'], [57, 68, 'white'], [68, 78, 'red'],
    [78, 88, 'white'], [88, 92, 'white'], [92, 104, 'red'], [104, 118, 'white'], [118, 131, 'red']],
};

export function towerHalf(y) {
  const [ma, mb, mw] = TOWER.mainDeck, [ta, tb, tw] = TOWER.topDeck;
  if (y >= mb) return 9 + 8 * Math.pow((y - mb) / (TOWER.base - mb), 1.8);
  if (y >= ma) return mw;
  if (y >= tb) return 3 + 5 * Math.pow((y - tb) / (ma - tb), 1.3);
  if (y >= ta) return tw;
  if (y >= 34) return 1 + (y - 34) / 18;
  return 0.5 + 0.5 * (y - 14) / 20;
}

// 塔脚之间的拱门内半宽；0 表示此高度没有开口。
export function towerArch(y) {
  if (y <= 116) return 0;
  return Math.max(0, (towerHalf(y) - 4) * Math.sqrt((y - 116) / 15));
}

// 三层城市，由固定种子生成：far、mid 在塔后，near 遮住塔基。
function buildSkyline(seed, [minTop, maxTop], [minW, maxW], lightOdds, clearTower = false) {
  const r = rng(seed), buildings = [], lights = [];
  for (let x = -4; x < W + 4;) {
    const w = Math.round(minW + r() * (maxW - minW));
    let top = Math.round(minTop + r() * (maxTop - minTop));
    // 塔脚附近压低楼房，让铁塔轮廓落在天空上。
    if (clearTower && x < 124 && x + w > 68) top = Math.max(top, 121);
    buildings.push({x, w, top});
    for (let wy = top + 3; wy < 145; wy += 4) {
      for (let wx = x + 2; wx < x + w - 1; wx += 3) {
        if (r() < lightOdds) lights.push({x: wx, y: wy, warm: r() < 0.7});
      }
    }
    x += w;
  }
  return {buildings, lights};
}
export const SKYLINE = {
  far: buildSkyline(1031, [103, 117], [8, 20], 0, true),
  mid: buildSkyline(2207, [109, 125], [7, 16], 0.08, true),
  near: buildSkyline(3119, [124, 134], [6, 14], 0.26),
};

// 把一层楼房合成为阶梯轮廓，底边落在露台矮墙后。
export function skylinePolygon(layer, bottom = 147) {
  const pts = [[-4, bottom]];
  for (const b of layer.buildings) { pts.push([b.x, b.top], [b.x + b.w, b.top]); }
  pts.push([W + 4, bottom]);
  return pts;
}

export const SUN = {x: 168, y: 103, r: 13};

// 从高空坠向城市的光点：呼应 L02「燈火模仿 墜落的星光」。
export const STARS = [[222, 16, 2], [208, 30, 2], [192, 46, 1], [176, 62, 1], [160, 78, 0], [146, 92, 0]];

export const RAIL = {top: 131, low: 137, wall: 141, floor: 146, posts: [12, 42, 72, 102, 132, 162, 192, 222, 252, 282, 312]};

// 无靠背长椅：右半坐着主角，左半空着，放两张车票。
export const BENCH = {
  x: 170, w: 76, top: 143, h: 5,
  legs: [[176, 148, 4, 14], [236, 148, 4, 14]],
  brace: [180, 154, 56, 2],
};
// 主角侧身坐，隔着空位望向铁塔。非像素画风按 character.js 的 32 格比例重画同一造型。
export const CLAWD = {x: 204, y: 121};
export function clawdParts(ox, oy, action = 'idle', frame = 0) {
  const phase = frame % 4;
  const lift = action === 'jump' ? [1, -3, -6, -3][phase] : action === 'walk' ? -(phase % 2) : 0;
  const armY = action === 'walk' ? 16 + phase % 2 : 16;
  const box = (x, y, w, h) => [ox + 32 - x - w, oy + lift + y, w, h];
  const legHeight = index => 6 + (action === 'walk' ? ((phase + index) % 2 ? -1 : 1) : 0) + (action === 'jump' && phase === 2 ? -2 : 0);
  return {
    legs: [11, 14, 18, 21].map((x, index) => box(x, 21, 2, legHeight(index))),
    body: box(10, 7, 14, 15),
    arm: box(6, armY, 5, 3),
    armBack: box(23, armY, 5, 3),
    eye: box(19, 12, 2, 3),
  };
}
export const TICKETS = [
  [[177, 138], [187, 137], [188, 143], [178, 143]],
  [[191, 137], [201, 139], [200, 143], [190, 143]],
];
export const SUITCASE = {
  body: [253, 146, 16, 17], handle: [257, 143, 8, 3], straps: [[257, 146, 1, 17], [264, 146, 1, 17]],
};
// 日落在主角左后方，影子落向画面右下。
export const SHADOW = [[172, 161], [246, 161], [288, 180], [204, 180]];
export const CASE_SHADOW = [[253, 163], [269, 163], [290, 174], [272, 174]];

// 画面右上角前景银杏枝。
export const BRANCH = [[[322, 5], [292, 9], [266, 16], [246, 19]], [[292, 9], [278, 2], [270, -2]], [[266, 16], [254, 26]]];
export const LEAVES = [[248, 19], [243, 23], [254, 26], [259, 29], [268, 18], [262, 12], [276, 13], [283, 6],
  [290, 15], [298, 9], [305, 14], [312, 11], [272, 2], [251, 13]];
export const leafShape = (x, y, flip = 1) => [[x, y - 2], [x + 3 * flip, y - 1], [x + 3 * flip, y + 1], [x, y + 2], [x - 1 * flip, y]];
