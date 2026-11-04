// 检查导出的 MP4：规格、每次翻页的关键动作是否落在预定帧、解码后的音轨重音是否在同一拍点、响度、削波与音画起点。
// 用法：node verify-export.mjs
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BEAT_FRAMES, CREED_SNAP_BEAT, FPS, FRAME_COUNT, OPEN_SNAP_BEAT, PAGES, SECONDS} from './timeline.js';
import {ACCENT_BEATS} from './music.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const VIDEO = path.join(here, '输出/八个字，一生的回答.mp4');
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, {maxBuffer: 2 ** 31});
  if (r.status !== 0) throw new Error(`${cmd} 退出 ${r.status}: ${r.stderr}`);
  return r;
};

const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', VIDEO]).stdout);
const v = probe.streams.find(s => s.codec_type === 'video');
const a = probe.streams.find(s => s.codec_type === 'audio');

// 缩到 192×108 灰度，逐帧比较平均差（0–255）。
const SW = 192, SH = 108;
const raw = run('ffmpeg', ['-v', 'error', '-i', VIDEO, '-vf', `scale=${SW}:${SH},format=gray`, '-f', 'rawvideo', '-']).stdout;
const frames = raw.length / (SW * SH);
const diff = [0];
for (let f = 1; f < frames; f++) {
  let s = 0;
  for (let i = 0; i < SW * SH; i++) s += Math.abs(raw[f * SW * SH + i] - raw[(f - 1) * SW * SH + i]);
  diff.push(s / (SW * SH));
}
// 关键动作落在预定帧：该帧的画面变化是前后 3 帧里最大的，且明显可见。
const keyFrame = (name, frame, min) => {
  const around = diff.slice(frame - 3, frame + 4);
  const peak = Math.max(...around);
  return {name, frame, seconds: frame / FPS, beat: frame / BEAT_FRAMES, diff: Number(diff[frame].toFixed(2)),
    neighborMax: Number(Math.max(...around.filter((_, i) => i !== 3)).toFixed(2)), onBeat: diff[frame] === peak && diff[frame] >= min};
};
const turns = PAGES.slice(1).map(p => keyFrame(p.id, p.land, 4));
const creed = PAGES.find(p => p.id === 'creed');
const snaps = [keyFrame('open 墨点聚成人名', OPEN_SNAP_BEAT * BEAT_FRAMES, 0.5), keyFrame('creed 八个字聚成', creed.land + CREED_SNAP_BEAT * BEAT_FRAMES, 0.5)];

const SR = 48000;
const pcmL = run('ffmpeg', ['-v', 'error', '-i', VIDEO, '-map', '0:a:0', '-ar', String(SR), '-f', 'f32le', '-']).stdout;
const st = new Float32Array(pcmL.buffer, pcmL.byteOffset, pcmL.length / 4);
const mono = new Float32Array(st.length / 2);
let clipped = 0, peak = 0;
for (let i = 0; i < mono.length; i++) {
  mono[i] = (st[2 * i] + st[2 * i + 1]) / 2;
  const m = Math.max(Math.abs(st[2 * i]), Math.abs(st[2 * i + 1]));
  peak = Math.max(peak, m);
  if (m >= 0.999) clipped++;
}
// 爆音：相邻采样的最大跳变；中断：0.5 秒到 87.5 秒之间逐秒 RMS 的最小值（最后 2.5 秒是设计好的淡出）。
let maxStep = 0;
for (let i = 1; i < mono.length; i++) maxStep = Math.max(maxStep, Math.abs(st[2 * i] - st[2 * i - 2]), Math.abs(st[2 * i + 1] - st[2 * i - 1]));
const secondRms = [];
for (let s = 0.5; s + 1 <= SECONDS - 2.5; s += 1) {
  let e = 0;
  for (let i = s * SR; i < (s + 1) * SR; i++) e += mono[i] ** 2;
  secondRms.push(Math.sqrt(e / SR));
}
const win = SR / 100;
const energy = s0 => { let e = 0; for (let i = s0; i < s0 + win; i++) e += mono[i] ** 2; return e; };
const onsetAt = t => {
  const center = Math.round(t * SR);
  let best = center, bestRise = -Infinity;
  for (let s = center - SR * 0.03; s <= center + SR * 0.03; s += SR / 1000) {
    const rise = energy(s) - energy(s - win);
    if (rise > bestRise) { bestRise = rise; best = s; }
  }
  return Math.round((best - center) / SR * 1000);
};
const burst = t => { const s = Math.round(t * SR); let e = 0; for (let i = s; i < s + SR * 0.03; i++) e += mono[i] ** 2; return e; };
const plain = [];
for (let beat = 1; beat < 180; beat++) if (!ACCENT_BEATS.includes(beat)) plain.push(burst(beat * 0.5));
plain.sort((x, y) => x - y);
const median = plain[Math.floor(plain.length / 2)];
const accents = ACCENT_BEATS.map(beat => ({beat, seconds: beat * 0.5, offsetMs: onsetAt(beat * 0.5), vsPlainBeat: Number((burst(beat * 0.5) / median).toFixed(1))}));

const loud = run('ffmpeg', ['-hide_banner', '-nostats', '-i', VIDEO, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
const summary = loud.slice(loud.lastIndexOf('Summary:'));
const num = re => Number(summary.match(re)?.[1]);

const result = {
  video: {codec: v.codec_name, profile: v.profile, width: v.width, height: v.height, fps: v.r_frame_rate, frames: Number(v.nb_read_frames), pix: v.pix_fmt, start: Number(v.start_time), duration: Number(v.duration)},
  audio: {codec: a.codec_name, sampleRate: Number(a.sample_rate), channels: a.channels, start: Number(a.start_time), duration: Number(a.duration)},
  container: {duration: Number(probe.format.duration), megabytes: Number((probe.format.size / 1048576).toFixed(1))},
  turns,
  snaps,
  accents,
  audioLevel: {integratedLUFS: num(/I:\s+(-?[\d.]+) LUFS/), truePeakDBFS: num(/Peak:\s+(-?[\d.]+) dBFS/), samplePeak: Number(peak.toFixed(3)), clippedSamples: clipped,
    maxSampleStep: Number(maxStep.toFixed(3)), minSecondRms: Number(Math.min(...secondRms).toFixed(4)), maxSecondRms: Number(Math.max(...secondRms).toFixed(4))},
};
const checks = {
  spec: result.video.codec === 'h264' && result.audio.codec === 'aac' && result.video.width === 1920 && result.video.height === 1080
    && result.video.fps === '30/1' && result.video.frames === FRAME_COUNT && Math.abs(result.container.duration - SECONDS) < 0.05,
  avStart: Math.abs(result.video.start) < 0.001 && Math.abs(result.audio.start) < 0.03 && Math.abs(result.audio.duration - SECONDS) < 0.05,
  turnsOnBeat: turns.every(t => t.onBeat),
  snapsOnBeat: snaps.every(t => t.onBeat),
  accentsOnBeat: accents.every(x => Math.abs(x.offsetMs) <= 5 && x.vsPlainBeat >= 1.5),
  loudness: result.audioLevel.integratedLUFS >= -18 && result.audioLevel.integratedLUFS <= -14 && result.audioLevel.truePeakDBFS <= -1,
  noClipping: clipped === 0,
  noPops: maxStep < 0.5,
  noDropouts: Math.min(...secondRms) > 0.01,
};
result.checks = checks;
result.ok = Object.values(checks).every(Boolean);
writeFileSync(path.join(here, '输出/导出检查.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({checks, ok: result.ok, audioLevel: result.audioLevel, video: result.video, audio: result.audio}, null, 2));
if (!result.ok) process.exit(1);
