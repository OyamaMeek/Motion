// 麦克劳林转轮的位置（单位：格），画面和配乐的棘轮声共用。
// 第 j 次停在 7j 格：每次多转一整圈（6 个公式）再进一格，停下后有一次小回弹。
import {KEYS} from './timeline.js';

const STOPS = KEYS.maclaurin.faces;
const SPIN = 1.6;

function position(b) {
  let p = -7;
  for (const [j, stop] of STOPS.entries()) {
    const from = 7 * (j - 1), to = 7 * j;
    if (b < stop - SPIN) return p;
    if (b < stop) return from + (to - from) * (1 - (1 - (b - (stop - SPIN)) / SPIN) ** 3);
    const u = b - stop;
    p = to - (u < 0.6 ? 0.14 * Math.sin(Math.PI * u / 0.6) * (1 - u / 0.6) : 0);
    if (j + 1 < STOPS.length && b < STOPS[j + 1] - SPIN) return p;
  }
  return p;
}

// 每过一格的边界（格中心 ±0.5）一声棘轮，返回场景内的拍号
function ticks() {
  const out = [];
  let last = Math.floor(position(0) + 0.5);
  for (let b = 0; b < KEYS.maclaurin.spin; b += 1 / 1200) {
    const cell = Math.floor(position(b) + 0.5);
    if (cell !== last) { out.push(b); last = cell; }
  }
  return out;
}

export const REEL = {position, ticks, count: 6};
