import {createKit} from './kit.js';
import {POSES} from './poses.js';
import {SHOTS} from './shots.js';

const canvas = document.getElementById('stage');
const kit = createKit(canvas);
const ctx = canvas.getContext('2d');

export function drawShot(shot) {
  kit.begin(shot.n * 7919);
  POSES[shot.id].draw(kit);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function measure() {
  const {data} = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0, sq = 0, purple = 0, opaque = true, count = 0, hash = 2166136261;
  for (let i = 0; i < data.length; i += 4 * 61) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += luma; sq += luma * luma; count += 1;
    if (a !== 255) opaque = false;
    if (b > g + 30 && r > g + 15) purple += 1;
    hash = Math.imul(hash ^ r, 16777619); hash = Math.imul(hash ^ g, 16777619); hash = Math.imul(hash ^ b, 16777619);
  }
  const meanLuma = sum / count;
  return {stats: {meanLuma, spread: Math.sqrt(Math.max(0, sq / count - meanLuma * meanLuma)), purplePct: purple / count * 100, opaque}, hash: hash >>> 0};
}

window.renderErrors = window.renderErrors || [];
window.stage = {
  inspectAll() {
    const shots = SHOTS.map(shot => {
      drawShot(shot);
      const {marks, me} = kit.state();
      return {id: shot.id, keys: POSES[shot.id].keys, marks, me, ...measure()};
    });
    return {shots, errors: window.renderErrors};
  },
};

// 图像分镜阶段：每镜全程停在关键画面，确认后再加入运动。
let current = null;
function seek(t) {
  const shot = SHOTS.find(s => t >= s.start && t < s.end) ?? SHOTS.at(-1);
  if (shot === current) return;
  current = shot;
  drawShot(shot);
}
window.addEventListener('hf-seek', e => seek(e.detail.time));

await document.fonts.load('700 64px "Songti SC"', '嘉宾囍');
seek(0);
window.artReady = true;
