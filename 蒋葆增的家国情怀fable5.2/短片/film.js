import { W, H, FRAMES, pageAt } from './timeline.js';
import { corner } from './lib.js';
import { ink, name, ask } from './scenes1.js';
import { newark, list, turn } from './scenes2.js';
import { y1979, aid, exam } from './scenes3.js';
import { chip, stitch, drone, view, end, droneCount } from './scenes4.js';

const SCENES = { ink, name, ask, newark, list, turn, y1979, aid, exam, chip, stitch, drone, view, end };

export function draw(ctx, f) {
  if (!Number.isInteger(f) || f < 0 || f >= FRAMES) throw new Error(`帧号超出范围：${f}`);
  const page = pageAt(f);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.shadowBlur = 0;
  ctx.setLineDash([]);
  ctx.letterSpacing = '0px';
  ctx.clearRect(0, 0, W, H);
  SCENES[page.id](ctx, f);
  corner(ctx, f, page, page.tone === '暗场');
}

export { droneCount };
