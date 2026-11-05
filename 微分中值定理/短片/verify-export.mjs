// 检查导出的 MP4：规格、音画起点、4 个切点是否卡在拍上、有没有空白帧、配乐重音是否同拍、响度、真峰值、削顶、爆音、中断。
// 结果写入 输出/导出检查.json，波形图写入 输出/波形.png。
// 用法：node verify-export.mjs
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BEAT_FRAMES, CUT_FRAMES, FPS, FRAME_COUNT, HIT_BEATS, SCENES, SECONDS} from './timeline.js';
import {TARGET as VIDEO} from './render.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '输出');
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, {maxBuffer: 2 ** 31});
  if (r.status !== 0) throw new Error(`${cmd} 退出 ${r.status}: ${r.stderr}`);
  return r;
};

const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', VIDEO]).stdout);
const v = probe.streams.find(s => s.codec_type === 'video');
const a = probe.streams.find(s => s.codec_type === 'audio');

// 缩到 480×270 灰度逐帧分析
const SW = 480, SH = 270, PX = SW * SH;
const raw = run('ffmpeg', ['-v', 'error', '-i', VIDEO, '-vf', `scale=${SW}:${SH}:flags=area,format=gray`, '-f', 'rawvideo', '-']).stdout;
const frames = raw.length / PX;
// 底色取第一帧最常见的灰度
const hist = new Uint32Array(256);
for (let i = 0; i < PX; i++) hist[raw[i]]++;
const paper = hist.indexOf(Math.max(...hist));
// 空白帧：去掉右上角场景编号所在的顶部 100 像素，与底色差超过 24 灰阶的像素占比
const TOP = Math.round(100 * SH / 1080);
const ink = [], diff = [0];
for (let f = 0; f < frames; f++) {
  let n = 0;
  for (let i = TOP * SW; i < PX; i++) if (Math.abs(raw[f * PX + i] - paper) > 24) n++;
  ink.push(n / ((SH - TOP) * SW));
  if (f > 0) {
    let s = 0;
    for (let i = 0; i < PX; i++) s += Math.abs(raw[f * PX + i] - raw[(f - 1) * PX + i]);
    diff.push(s / PX);
  }
}
const minInk = Math.min(...ink);
const blank = ink.map((x, f) => [f, x]).filter(([, x]) => x < 0.005).map(([f]) => f);
const perScene = SCENES.map(s => ({id: s.id, minInkPercent: Number((Math.min(...ink.slice(s.start, s.end)) * 100).toFixed(2)), atFrame: s.start + ink.slice(s.start, s.end).indexOf(Math.min(...ink.slice(s.start, s.end)))}));
// 切点卡拍：切点帧的画面变化是前后 3 帧里最大的，且明显可见
const cuts = CUT_FRAMES.map(frame => {
  const around = diff.slice(frame - 3, frame + 4);
  return {frame, seconds: frame / FPS, beat: frame / BEAT_FRAMES, diff: Number(diff[frame].toFixed(2)),
    neighborMax: Number(Math.max(...around.filter((_, i) => i !== 3)).toFixed(2)), onBeat: diff[frame] === Math.max(...around) && diff[frame] >= 4};
});

const SR = 48000;
const pcm = run('ffmpeg', ['-v', 'error', '-i', VIDEO, '-map', '0:a:0', '-ar', String(SR), '-f', 'f32le', '-']).stdout;
const st = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
const mono = new Float32Array(st.length / 2);
let clipped = 0, peak = 0, maxStep = 0;
for (let i = 0; i < mono.length; i++) {
  mono[i] = (st[2 * i] + st[2 * i + 1]) / 2;
  const m = Math.max(Math.abs(st[2 * i]), Math.abs(st[2 * i + 1]));
  peak = Math.max(peak, m);
  if (m >= 0.999) clipped++;
  if (i > 0) maxStep = Math.max(maxStep, Math.abs(st[2 * i] - st[2 * i - 2]), Math.abs(st[2 * i + 1] - st[2 * i - 1]));
}
const secondRms = [];
for (let s = 0; s + 1 <= SECONDS - 1.5; s += 1) {
  let e = 0;
  for (let i = s * SR; i < (s + 1) * SR; i++) e += mono[i] ** 2;
  secondRms.push(Math.sqrt(e / SR));
}
const win = SR / 100;
const energy = s0 => { let e = 0; for (let i = Math.max(0, s0); i < s0 + win; i++) e += mono[i] ** 2; return e; };
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
for (let beat = 1; beat < 240; beat++) if (!HIT_BEATS.includes(beat)) plain.push(burst(beat * 0.5));
plain.sort((x, y) => x - y);
const median = plain[Math.floor(plain.length / 2)];
const accents = HIT_BEATS.map(beat => ({beat, seconds: beat * 0.5, offsetMs: onsetAt(beat * 0.5), vsPlainBeat: Number((burst(beat * 0.5) / median).toFixed(1))}));
const cutAccents = accents.filter(x => x.beat === 0 || CUT_FRAMES.includes(x.beat * BEAT_FRAMES));

const loud = run('ffmpeg', ['-hide_banner', '-nostats', '-i', VIDEO, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
const summary = loud.slice(loud.lastIndexOf('Summary:'));
const num = re => Number(summary.match(re)?.[1]);

run('ffmpeg', ['-y', '-v', 'error', '-i', VIDEO, '-filter_complex', 'showwavespic=s=1920x480:split_channels=1:colors=#161412|#FF5B14:scale=lin', '-frames:v', '1', path.join(OUT, '波形.png')]);

const result = {
  video: {codec: v.codec_name, width: v.width, height: v.height, fps: v.r_frame_rate, frames: Number(v.nb_read_frames), pix: v.pix_fmt, start: Number(v.start_time), duration: Number(v.duration)},
  audio: {codec: a.codec_name, sampleRate: Number(a.sample_rate), channels: a.channels, start: Number(a.start_time), duration: Number(a.duration)},
  container: {duration: Number(probe.format.duration), megabytes: Number((probe.format.size / 1048576).toFixed(1))},
  paperGray: paper,
  blankFrames: blank,
  minInkPercent: Number((minInk * 100).toFixed(2)),
  perScene,
  cuts,
  cutAccents,
  accents,
  audioLevel: {integratedLUFS: num(/I:\s+(-?[\d.]+) LUFS/), loudnessRangeLU: num(/LRA:\s+(-?[\d.]+) LU/), truePeakDBFS: num(/Peak:\s+(-?[\d.]+) dBFS/), samplePeak: Number(peak.toFixed(3)),
    clippedSamples: clipped, maxSampleStep: Number(maxStep.toFixed(3)), minSecondRms: Number(Math.min(...secondRms).toFixed(4)), maxSecondRms: Number(Math.max(...secondRms).toFixed(4))},
};
const checks = {
  spec: result.video.codec === 'h264' && result.audio.codec === 'aac' && result.video.width === 1920 && result.video.height === 1080
    && result.video.fps === '30/1' && result.video.frames === FRAME_COUNT && Math.abs(result.container.duration - SECONDS) < 0.05,
  avStart: Math.abs(result.video.start) < 0.001 && Math.abs(result.audio.start) < 0.03 && Math.abs(result.audio.duration - SECONDS) < 0.05,
  noBlankFrames: blank.length === 0,
  cutsOnBeat: cuts.every(c => c.onBeat),
  cutAccentsOnBeat: cutAccents.every(x => Math.abs(x.offsetMs) <= 5 && x.vsPlainBeat >= 1.5),
  accentsOnBeat: accents.every(x => Math.abs(x.offsetMs) <= 5),
  loudness: result.audioLevel.integratedLUFS >= -18 && result.audioLevel.integratedLUFS <= -14 && result.audioLevel.truePeakDBFS <= -1,
  noClipping: clipped === 0,
  noPops: maxStep < 0.5,
  noDropouts: Math.min(...secondRms) > 0.01,
};
result.checks = checks;
result.ok = Object.values(checks).every(Boolean);
writeFileSync(path.join(OUT, '导出检查.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({checks, ok: result.ok, cuts, perScene, minInkPercent: result.minInkPercent, audioLevel: result.audioLevel, video: result.video, audio: result.audio}, null, 2));
if (!result.ok) process.exit(1);
