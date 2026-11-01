export const CHARACTER_COLORS = Object.freeze({
  outline: '#713f32', body: '#da7758', light: '#ed9b75', shade: '#b85d47',
  eyes: '#352e2a', blush: '#f3b3a3', tear: '#83bdcf', paper: '#f5e7c9', green: '#738768',
});

export function drawCharacter(ctx, {
  x = 0, y = 0, scale = 1, facing = 'front', expression = 'neutral', action = 'idle', frame = 0,
  prop = action === 'hold' ? 'ticket' : null,
} = {}) {
  if (!ctx?.canvas || typeof ctx.fillRect !== 'function') throw new TypeError('需要 Canvas 2D context');
  for (const [name, value] of Object.entries({x, y, scale, frame})) {
    if (!Number.isSafeInteger(value)) throw new RangeError(`${name} 必须为安全整数`);
  }
  if (scale < 1 || frame < 0) throw new RangeError('scale 必须为正整数，frame 必须非负');
  if (!['front', 'right', 'left', 'back'].includes(facing)) throw new RangeError('未知朝向');
  if (!['neutral', 'happy', 'shy', 'sad'].includes(expression)) throw new RangeError('未知表情');
  if (!['idle', 'walk', 'jump', 'hug', 'hold'].includes(action)) throw new RangeError('未知动作');
  if (action === 'hold' ? !['ticket', 'flower', 'suitcase'].includes(prop) : prop !== null) {
    throw new RangeError('道具仅用于 hold，支持 ticket/flower/suitcase');
  }

  const colors = CHARACTER_COLORS;
  const phase = frame % 4;
  const side = facing === 'left' || facing === 'right';
  const mirror = facing === 'left';
  const lift = action === 'jump' ? [1, -3, -6, -3][phase] : action === 'walk' ? -(phase % 2) : 0;
  const bodyX = side ? 10 : 6;
  const bodyWidth = side ? 14 : 20;
  let bounds = null, propBounds = null, grip = null;
  function worldRect(px, py, width, height) {
    return {x: x + (mirror ? 32 - px - width : px) * scale, y: y + (py + lift) * scale,
      width: width * scale, height: height * scale};
  }
  function union(a, b) {
    if (!a) return b;
    const left = Math.min(a.x, b.x), top = Math.min(a.y, b.y);
    return {x: left, y: top, width: Math.max(a.x + a.width, b.x + b.width) - left,
      height: Math.max(a.y + a.height, b.y + b.height) - top};
  }
  function rect(px, py, width, height, color, isProp = false) {
    ctx.fillStyle = color;
    ctx.fillRect(px, py, width, height);
    const region = worldRect(px, py, width, height);
    bounds = union(bounds, region);
    if (isProp) propBounds = union(propBounds, region);
  }
  function hand(px, py) {
    rect(px - 1, py - 1, 3, 3, colors.outline);
    rect(px, py, 2, 2, colors.light);
  }
  function eye(px) {
    if (expression === 'happy') {
      rect(px, 12, 2, 1, colors.eyes);
      rect(px - 1, 13, 1, 1, colors.eyes);
      rect(px + 2, 13, 1, 1, colors.eyes);
    } else if (expression === 'shy') {
      rect(px, 14, 2, 1, colors.eyes);
      rect(px - 1, 16, 4, 2, colors.blush);
    } else if (expression === 'sad') {
      rect(px, 12, 1, 1, colors.eyes);
      rect(px + 1, 13, 2, 1, colors.eyes);
      rect(px + 1, 14, 1, 2, colors.eyes);
      rect(px + 2, 16, 1, 2, colors.tear);
    } else {
      rect(px, 12, 2, 3, colors.eyes);
    }
  }

  ctx.save();
  try {
    ctx.imageSmoothingEnabled = false;
    ctx.translate(x, y + lift * scale);
    ctx.scale(scale, scale);
    if (mirror) { ctx.translate(32, 0); ctx.scale(-1, 1); }

    for (const [index, legX] of (side ? [11, 14, 18, 21] : [8, 12, 19, 23]).entries()) {
      const step = action === 'walk' ? ((phase + index) % 2 ? -1 : 1) : 0;
      const tuck = action === 'jump' && phase === 2 ? -2 : 0;
      rect(legX, 21, 2, 6 + step + tuck, colors.outline);
      rect(legX, 22, 1, 4 + step + tuck, colors.body);
    }
    rect(bodyX + 1, 7, bodyWidth - 2, 1, colors.outline);
    rect(bodyX, 8, bodyWidth, 14, colors.outline);
    rect(bodyX + 1, 8, bodyWidth - 2, 13, colors.body);
    rect(bodyX + 2, 8, bodyWidth - 4, 1, colors.light);
    rect(bodyX + bodyWidth - 3, 10, 2, 11, colors.shade);
    rect(bodyX + 1, 21, bodyWidth - 2, 1, colors.shade);

    if (facing === 'back') {
      rect(10, 11, 9, 1, colors.light);
      rect(10, 12, 1, 2, colors.light);
    } else {
      if (side) eye(19);
      else { eye(10); eye(20); }
      if (expression === 'happy') {
        rect(side ? 21 : 15, 18, 2, 1, colors.eyes);
      } else if (expression === 'shy') {
        rect(side ? 21 : 15, 19, 2, 1, colors.shade);
      } else if (expression === 'sad') {
        rect(side ? 20 : 15, 19, 2, 1, colors.eyes);
      }
    }

    const armY = action === 'walk' ? 16 + (phase % 2) : 16;
    if (action === 'hug') {
      if (side) {
        rect(22, 19, 7, 3, colors.outline);
        rect(22, 19, 6, 2, colors.body);
        hand(28, 20);
        rect(23, 23, 6, 2, colors.shade);
        hand(28, 23);
      } else {
        rect(3, 17, 4, 6, colors.outline);
        rect(25, 17, 4, 6, colors.outline);
        rect(4, 20, 9, 3, colors.body);
        rect(19, 20, 9, 3, colors.body);
        hand(12, 21);
        hand(18, 21);
      }
    } else {
      rect(bodyX - 4, armY, 5, 3, colors.outline);
      rect(bodyX - 3, armY, 4, 2, colors.body);
      if (action !== 'hold') {
        rect(bodyX + bodyWidth - 1, armY, 5, 3, colors.outline);
        rect(bodyX + bodyWidth - 1, armY, 4, 2, colors.body);
      }
    }

    if (action === 'hold') {
      const handX = 29, handY = 24 + phase % 2;
      rect(bodyX + bodyWidth - 1, 17, 4, 3, colors.outline);
      rect(bodyX + bodyWidth + 1, 19, 2, handY - 18, colors.outline);
      rect(bodyX + bodyWidth - 1, 17, 3, 2, colors.body);
      rect(bodyX + bodyWidth + 1, handY - 1, handX - bodyX - bodyWidth, 2, colors.body);
      const item = (dx, dy, w, h, color) => rect(handX + dx, handY + dy, w, h, color, true);
      if (prop === 'ticket') {
        item(-1, 0, 8, 5, colors.outline);
        item(0, 1, 6, 3, colors.paper);
        item(4, 1, 1, 3, colors.shade);
      } else if (prop === 'flower') {
        item(0, -3, 1, 9, colors.green);
        item(1, 2, 2, 1, colors.green);
        item(-2, -3, 5, 2, colors.blush);
        item(-1, -4, 3, 4, colors.body);
        item(0, -3, 1, 1, colors.paper);
      } else {
        item(0, -2, 3, 1, colors.outline);
        item(0, -1, 1, 3, colors.outline);
        item(2, -1, 1, 3, colors.outline);
        item(-2, 1, 8, 6, colors.outline);
        item(-1, 2, 6, 4, colors.shade);
        item(3, 2, 1, 4, colors.paper);
      }
      hand(handX, handY);
      grip = {x: x + (mirror ? 31 - handX : handX) * scale, y: y + (handY + lift) * scale};
    }
  } finally {
    ctx.restore();
  }
  return {bounds, face: facing === 'back' ? null : worldRect(side ? 17 : 8, 11, side ? 6 : 16, 9),
    grip, propGrip: grip ? {...grip} : null, propBounds};
}
