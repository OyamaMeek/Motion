// 从导出的 MP4 抽帧供逐场景检查：每个场景每 2 拍一张；每个切点前 3 帧到后 2 帧拼成一条连续帧。
// 用法：node extract-frames.mjs 输出目录
import {spawnSync} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {BEAT_FRAMES, CUT_FRAMES, SCENES} from './timeline.js';
import {TARGET as VIDEO} from './render.mjs';

const dir = path.resolve(process.argv[2]);
mkdirSync(dir, {recursive: true});

function grab(frames, file, filter = '') {
  const select = frames.map(f => `eq(n\\,${f})`).join('+');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', VIDEO, '-vf', `select='${select}'${filter}`, '-fps_mode', 'vfr', '-q:v', '3', file]);
  if (r.status !== 0) throw new Error(`ffmpeg 退出 ${r.status}: ${r.stderr}`);
}

for (const [i, s] of SCENES.entries()) {
  const frames = [];
  for (let b = 0; b < s.beats; b += 2) frames.push(s.start + b * BEAT_FRAMES + 7);
  frames.push(s.end - 1);
  const sub = path.join(dir, `${i + 1}-${s.id}`);
  mkdirSync(sub, {recursive: true});
  grab(frames, path.join(sub, '%03d.jpg'));
}
for (const f of CUT_FRAMES) grab([-3, -2, -1, 0, 1, 2].map(d => f + d), path.join(dir, `切点-${f}.jpg`), ',scale=640:360,tile=6x1:padding=4:color=gray');
console.log(dir);
