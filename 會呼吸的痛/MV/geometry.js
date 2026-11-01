import {drawCharacter, CHARACTER_COLORS} from '../../assets/clawd/character.js';

// 借 character.js 取得角色几何：录下它的每个色块，三种画风都用同一份数据。
const cache = new Map();
export function clawdRects({facing, expression, action, frame}) {
  const key = `${facing}|${expression}|${action}|${frame}`;
  if (cache.has(key)) return cache.get(key);
  const rects = [];
  let sx = 1, ox = 0, stack = [], fill = null;
  const recorder = {
    canvas: {},
    save() { stack.push([sx, ox]); }, restore() { [sx, ox] = stack.pop(); },
    translate(x) { ox += x * sx; }, scale(x) { sx *= x; },
    set fillStyle(v) { fill = v; }, get fillStyle() { return fill; },
    imageSmoothingEnabled: false,
    fillRect(x, y, w, h) { rects.push({x: sx > 0 ? ox + x : ox - x - w, y, w, h, color: fill}); },
  };
  drawCharacter(recorder, {x: 0, y: 0, scale: 1, facing, expression, action, frame});
  cache.set(key, rects);
  return rects;
}
export {CHARACTER_COLORS};

export const toScreen = (cam, x, y) => [(x - cam.cx) * cam.z + 160, (y - cam.cy) * cam.z + 90];
