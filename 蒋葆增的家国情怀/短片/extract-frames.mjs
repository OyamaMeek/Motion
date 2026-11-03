// 从导出的 MP4 抽帧供逐页检查：每页落拍帧、中点、最后一帧各一张；每次翻页前 3 帧到后 2 帧拼成一条连续帧。
// 用法：node extract-frames.mjs 输出目录
import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PAGES} from './timeline.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const VIDEO = path.join(here, '输出/八个字，一生的回答.mp4');
const dir = path.resolve(process.argv[2]);
mkdirSync(dir, {recursive: true});

function grab(frames, file, filter = '') {
  const select = frames.map(f => `eq(n\\,${f})`).join('+');
  const vf = `select='${select}'${filter}`;
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', VIDEO, '-vf', vf, '-fps_mode', 'vfr', '-q:v', '3', file]);
  if (r.status !== 0) throw new Error(`ffmpeg 退出 ${r.status}: ${r.stderr}`);
}

for (const [i, p] of PAGES.entries()) {
  const name = `${String(i + 1).padStart(2, '0')}-${p.id}`;
  const frames = [p.land, Math.round((p.land + p.end) / 2), p.end - 1];
  grab(frames, path.join(dir, `${name}-%d.jpg`));
  if (i > 0) {
    const strip = [-3, -2, -1, 0, 1, 2].map(d => p.land + d);
    grab(strip, path.join(dir, `${name}-翻页.jpg`), ',scale=640:360,tile=6x1:padding=4:color=gray');
  }
}
console.log(dir);
