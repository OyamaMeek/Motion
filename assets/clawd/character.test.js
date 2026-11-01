import {drawCharacter} from './character.js';

export function runCharacterTests() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 160;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  let checks = 0;
  function check(condition, message) {
    if (!condition) throw new Error(message);
    checks++;
  }
  const render = options => {
    ctx.clearRect(0, 0, 160, 160);
    return drawCharacter(ctx, {x: 32, y: 32, ...options});
  };
  const bytes = () => [...ctx.getImageData(0, 0, 160, 160).data].join(',');
  const alpha = (x, y) => ctx.getImageData(x, y, 1, 1).data[3];
  function connectedTo(grip) {
    const image = ctx.getImageData(0, 0, 160, 160).data;
    const remaining = new Uint8Array(160 * 160);
    for (let i = 0; i < remaining.length; i++) remaining[i] = image[i * 4 + 3] > 0 ? 1 : 0;
    const queue = [grip.y * 160 + grip.x];
    while (queue.length) {
      const point = queue.pop();
      if (!remaining[point]) continue;
      remaining[point] = 0;
      if (point % 160 > 0) queue.push(point - 1);
      if (point % 160 < 159) queue.push(point + 1);
      if (point >= 160) queue.push(point - 160);
      if (point < 160 * 159) queue.push(point + 160);
    }
    return !remaining.some(value => value !== 0);
  }
  const fingerprints = new Map();
  for (const facing of ['front', 'right', 'left', 'back']) {
    for (const expression of ['neutral', 'happy', 'shy', 'sad']) {
      for (const action of ['idle', 'walk', 'jump', 'hug', 'hold']) {
        const frames = new Set();
        for (let frame = 0; frame < 4; frame++) {
          const options = {facing, expression, action, frame};
          const result = render(options);
          const first = bytes();
          check(result.bounds.width > 0 && result.bounds.height > 0, '角色必须有像素');
          check(result.bounds.x >= 0 && result.bounds.y >= 0, '角色超出测试画布');
          render(options);
          check(bytes() === first, '相同参数必须逐像素相同');
          frames.add(first);
        }
        if (action === 'walk' || action === 'jump') check(frames.size > 1, `${action} 必须有不同姿势`);
      }
      render({facing, expression});
      fingerprints.set(`${facing}:${expression}`, bytes());
    }
    if (facing !== 'back') {
      check(new Set(['neutral', 'happy', 'shy', 'sad'].map(e => fingerprints.get(`${facing}:${e}`))).size === 4,
        `${facing} 的表情必须不同`);
    }
    for (const expression of ['neutral', 'happy', 'shy', 'sad']) for (const prop of ['ticket', 'flower', 'suitcase']) {
      for (let frame = 0; frame < 4; frame++) {
        const result = render({facing, expression, action: 'hold', prop, frame});
        check(result.grip.x === result.propGrip.x && result.grip.y === result.propGrip.y, '道具与手必须共用握点');
        check(alpha(result.grip.x, result.grip.y) > 0, '握点必须有手部像素');
        check(alpha(result.grip.x, result.grip.y + 1) > 0, '道具必须与握点相接');
        check(connectedTo(result.grip), '身体、手臂、手与道具必须像素连通');
        if (result.face) {
          const {x, y, width, height} = result.face;
          const held = [...ctx.getImageData(x, y, width, height).data].join(',');
          render({facing, expression});
          check([...ctx.getImageData(x, y, width, height).data].join(',') === held, '道具或手遮挡面部');
          check(result.propBounds.y >= result.face.y + result.face.height, '道具必须位于面部下方');
        }
      }
    }
  }
  check(fingerprints.get('front:neutral') !== fingerprints.get('back:neutral'), '前后视图必须不同');
  render({facing: 'right'});
  const right = ctx.getImageData(32, 32, 32, 32).data;
  render({facing: 'left'});
  const left = ctx.getImageData(32, 32, 32, 32).data;
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) for (let c = 0; c < 4; c++) {
    check(right[(y * 32 + x) * 4 + c] === left[(y * 32 + 31 - x) * 4 + c], '左右视图必须镜像');
  }
  render({scale: 3, expression: 'shy', action: 'hold', prop: 'flower'});
  const pixels = ctx.getImageData(32, 32, 120, 120).data;
  for (let y = 0; y < 120; y++) for (let x = 0; x < 120; x++) for (let c = 0; c < 4; c++) {
    const origin = ((y - y % 3) * 120 + x - x % 3) * 4 + c;
    check(pixels[(y * 120 + x) * 4 + c] === pixels[origin], '像素放大不得产生插值或半格');
  }
  ctx.fillStyle = '#123456';
  ctx.imageSmoothingEnabled = true;
  const before = ctx.getTransform().toString();
  drawCharacter(ctx, {scale: 2});
  check(ctx.fillStyle === '#123456' && ctx.imageSmoothingEnabled && ctx.getTransform().toString() === before,
    '绘制必须恢复画布状态');
  for (const options of [
    {facing: 'up'}, {expression: 'missing'}, {action: 'missing'}, {scale: 0}, {scale: 1.5},
    {x: NaN}, {y: 0.5}, {frame: -1}, {frame: 0.5}, {action: 'hold', prop: 'unknown'}, {prop: 'ticket'},
  ]) {
    let threw = false;
    try { drawCharacter(ctx, options); } catch (error) { threw = error instanceof TypeError || error instanceof RangeError; }
    check(threw, `非法参数必须失败：${JSON.stringify(options)}`);
  }
  return {status: 'passed', checks, combinations: 320, propCases: 192, canvas: 'real browser Canvas 2D'};
}
