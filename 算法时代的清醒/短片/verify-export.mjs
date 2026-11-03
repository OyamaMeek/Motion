// 检查导出的 MP4：规格、每次翻页在哪一帧落定、解码后的音轨重音是否在同一拍点、响度。
// 用法：node verify-export.mjs
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {FPS, FLIP_FRAMES, FRAME_COUNT, PAGES} from './timeline.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const VIDEO = path.join(here, '输出/如何在算法时代保持清醒.mp4');
const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, {maxBuffer: 1 << 30, ...opts});
  if (r.status !== 0) throw new Error(`${cmd} 退出 ${r.status}: ${r.stderr}`);
  return r;
};

const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', VIDEO]).stdout);
const v = probe.streams.find(s => s.codec_type === 'video');
const a = probe.streams.find(s => s.codec_type === 'audio');

// 缩到 192×108 灰度，逐帧比较平均差。
const SW = 192, SH = 108;
const raw = run('ffmpeg', ['-v', 'error', '-i', VIDEO, '-vf', `scale=${SW}:${SH},format=gray`, '-f', 'rawvideo', '-']).stdout;
const frames = raw.length / (SW * SH);
const diff = [0];
for (let f = 1; f < frames; f++) {
  let s = 0;
  for (let i = 0; i < SW * SH; i++) s += Math.abs(raw[f * SW * SH + i] - raw[(f - 1) * SW * SH + i]);
  diff.push(s / (SW * SH));
}
// 翻页的最后几帧画面仍在大幅变化，拍点那一帧之后立即静止，才算落在拍上。
const flips = PAGES.slice(1).map(p => {
  const during = diff.slice(p.land - 4, p.land + 1);
  const after = diff.slice(p.land + 1, p.land + 4);
  let lastMoving = p.land - FLIP_FRAMES;
  for (let f = p.land - FLIP_FRAMES; f <= p.land + 3; f++) if (diff[f] > 1.5) lastMoving = f;
  return {page: p.id, land: p.land, seconds: p.land / FPS, lastMovingFrame: lastMoving,
    minDuring: Number(Math.min(...during).toFixed(2)), maxAfter: Number(Math.max(...after).toFixed(2)),
    settled: lastMoving === p.land && Math.min(...during) > 1.5 && Math.max(...after) < 1};
});

const SR = 48000;
const pcm = run('ffmpeg', ['-v', 'error', '-i', VIDEO, '-map', '0:a:0', '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-']).stdout;
const samples = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
const win = SR / 100;
const energy = s0 => { let e = 0; for (let i = s0; i < s0 + win; i++) e += samples[i] ** 2; return e; };
const onsets = PAGES.slice(1).map(p => {
  const center = Math.round(p.land / FPS * SR);
  let best = center, bestRise = -Infinity;
  for (let s = center - SR * 0.03; s <= center + SR * 0.03; s += SR / 1000) {
    const rise = energy(s) - energy(s - win);
    if (rise > bestRise) { bestRise = rise; best = s; }
  }
  return {page: p.id, offsetMs: Math.round((best - center) / SR * 1000)};
});

const loud = run('ffmpeg', ['-hide_banner', '-nostats', '-i', VIDEO, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
const summary = loud.slice(loud.lastIndexOf('Summary:'));
const num = re => Number(summary.match(re)?.[1]);

const result = {
  video: {width: v.width, height: v.height, fps: v.r_frame_rate, frames: Number(v.nb_read_frames), codec: v.codec_name, pix: v.pix_fmt},
  audio: {codec: a.codec_name, sampleRate: Number(a.sample_rate), channels: a.channels},
  duration: Number(probe.format.duration),
  flips,
  onsets,
  loudness: {integratedLUFS: num(/I:\s+(-?[\d.]+) LUFS/), truePeakDBFS: num(/Peak:\s+(-?[\d.]+) dBFS/)},
};
result.ok = result.video.width === 1920 && result.video.height === 1080 && result.video.fps === '30/1' && result.video.frames === FRAME_COUNT
  && Math.abs(result.duration - 30) < 0.05 && flips.every(f => f.settled) && onsets.every(o => Math.abs(o.offsetMs) <= 5)
  && result.loudness.integratedLUFS >= -18 && result.loudness.integratedLUFS <= -14 && result.loudness.truePeakDBFS <= -0.5;
writeFileSync(path.join(here, '输出/导出检查.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
