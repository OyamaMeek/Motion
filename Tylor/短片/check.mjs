// 成片检查：规格、音画起点、切点卡拍（切点帧画面变化为前后 3 帧最大）、空白帧（按每帧自己的底色）、
// 合成层重音的起音偏差、切点重音强度、bgm 拍格、响度、真峰值、削顶、爆音、中断；结果写 输出/检查.json，波形图写 输出/波形.png。
// 用法：node check.mjs              检查
//      node check.mjs --frames 目录  抽帧：每个场景每 2 拍一张拼成联系表，每个切点前 3 帧到后 2 帧拼成一条
import {spawnSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BEATS, BEAT_FRAMES, CUT_BEATS, CUT_FRAMES, FPS, FRAME_COUNT, HIT_BEATS, SCENES, SECONDS} from './timeline.js';
import {OUT, VIDEO} from './render.mjs';
import {loadBgm, synthStem, toWav} from './audio.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SR = 48000;
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, {maxBuffer: 2 ** 31});
  if (r.status !== 0) throw new Error(`${cmd} 退出 ${r.status}: ${r.stderr}`);
  return r;
};

function frames(dir) {
  mkdirSync(dir, {recursive: true});
  const grab = (list, file, tile) => run('ffmpeg', ['-y', '-v', 'error', '-i', VIDEO, '-vf', `select='${list.map(f => `eq(n\\,${f})`).join('+')}',scale=640:360,tile=${tile}:padding=6:color=gray`, '-frames:v', '1', '-q:v', '3', file]);
  for (const [i, s] of SCENES.entries()) {
    const list = [];
    for (let b = 0; b < s.beats; b += 2) list.push(s.start + b * BEAT_FRAMES + 7);
    list.push(s.end - 1);
    grab(list, path.join(dir, `${String(i).padStart(2, '0')}-${s.id}.jpg`), `4x${Math.ceil(list.length / 4)}`);
  }
  for (const f of [0, ...CUT_FRAMES]) grab([-3, -2, -1, 0, 1, 2].map(d => f + d).filter(n => n >= 0), path.join(dir, `切点-${String(f).padStart(4, '0')}.jpg`), '6x1');
  console.log(dir);
}

function verify() {
  const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', VIDEO]).stdout);
  const v = probe.streams.find(s => s.codec_type === 'video'), a = probe.streams.find(s => s.codec_type === 'audio');

  const SW = 480, SH = 270, PX = SW * SH;
  const raw = run('ffmpeg', ['-v', 'error', '-i', VIDEO, '-vf', `scale=${SW}:${SH}:flags=area,format=gray`, '-f', 'rawvideo', '-']).stdout;
  const n = raw.length / PX, ink = [], diff = [0], hist = new Uint32Array(256);
  for (let f = 0; f < n; f++) {
    hist.fill(0);
    for (let i = 0; i < PX; i++) hist[raw[f * PX + i]]++;
    const ground = hist.indexOf(Math.max(...hist));
    let c = 0;
    for (let i = 0; i < PX; i++) if (Math.abs(raw[f * PX + i] - ground) > 24) c++;
    ink.push(c / PX);
    if (f) { let s = 0; for (let i = 0; i < PX; i++) s += Math.abs(raw[f * PX + i] - raw[(f - 1) * PX + i]); diff.push(s / PX); }
  }
  const blank = ink.flatMap((x, f) => (x < 0.005 ? [f] : []));
  const perScene = SCENES.map(s => { const part = ink.slice(s.start, s.end), m = Math.min(...part); return {id: s.id, minInkPercent: Number((m * 100).toFixed(2)), atFrame: s.start + part.indexOf(m)}; });
  const cuts = CUT_FRAMES.map(f => {
    const near = [-3, -2, -1, 1, 2, 3].map(d => diff[f + d]);
    return {frame: f, beat: f / BEAT_FRAMES, diff: Number(diff[f].toFixed(2)), neighbourMax: Number(Math.max(...near).toFixed(2)), onBeat: diff[f] > Math.max(...near) && diff[f] >= 4};
  });

  const pcm = run('ffmpeg', ['-v', 'error', '-i', VIDEO, '-map', '0:a:0', '-ar', String(SR), '-f', 'f32le', '-']).stdout;
  const st = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4), mono = new Float32Array(st.length / 2);
  let peak = 0, clipped = 0, step = 0;
  for (let i = 0; i < mono.length; i++) {
    mono[i] = (st[2 * i] + st[2 * i + 1]) / 2;
    const m = Math.max(Math.abs(st[2 * i]), Math.abs(st[2 * i + 1]));
    peak = Math.max(peak, m);
    if (m >= 0.999) clipped++;
    if (i) step = Math.max(step, Math.abs(st[2 * i] - st[2 * i - 2]), Math.abs(st[2 * i + 1] - st[2 * i - 1]));
  }
  const rms = [];
  for (let s = 0; s + 1 <= SECONDS - 1.2; s++) { let e = 0; for (let i = s * SR; i < (s + 1) * SR; i++) e += mono[i] ** 2; rms.push(Math.sqrt(e / SR)); }
  // 起音：拍点 ±30 ms 内 5 ms 能量窗上升最大处
  const win = SR / 200;
  const onset = (x, t) => {
    const e = s => { let v = 0; for (let i = Math.max(0, s); i < s + win; i++) v += x[i] ** 2; return v; };
    const c = Math.round(t * SR);
    let best = c, rise = -Infinity;
    for (let s = c - SR * 0.03; s <= c + SR * 0.03; s += SR / 1000) { const r = e(s) - e(s - win); if (r > rise) { rise = r; best = s; } }
    return Math.round((best - c) / SR * 1000);
  };
  const syn = synthStem(), hp = new Float32Array(syn.left.length);
  { const k = Math.exp(-2 * Math.PI * 200 / SR); let lp = 0; for (let i = 0; i < hp.length; i++) { const m = (syn.left[i] + syn.right[i]) / 2; lp = (1 - k) * m + k * lp; hp[i] = m - lp; } }
  const synth = HIT_BEATS.map(b => ({beat: b, offsetMs: onset(hp, b * 0.5)}));
  const burst = t => { const s = Math.round(t * SR); let e = 0; for (let i = s; i < s + SR * 0.03; i++) e += mono[i] ** 2; return e; };
  const plain = [];
  for (let b = 1; b < BEATS; b++) if (!HIT_BEATS.includes(b)) plain.push(burst(b * 0.5));
  plain.sort((x, y) => x - y);
  const median = plain[plain.length >> 1];
  const cutAccents = [0, ...CUT_BEATS].map(b => ({beat: b, offsetMs: onset(mono, b * 0.5), vsPlainBeat: Number((burst(b * 0.5) / median).toFixed(1))}));

  const stem = path.join(OUT, 'bgm单轨.wav');
  writeFileSync(stem, toWav(loadBgm()));
  const grid = JSON.parse(run(path.resolve(here, '../../.agent/venv/bin/python'), [path.join(here, 'bgm-grid.py'), stem]).stdout);

  const loud = run('ffmpeg', ['-hide_banner', '-nostats', '-i', VIDEO, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
  const sum = loud.slice(loud.lastIndexOf('Summary:'));
  const num = re => Number(sum.match(re)?.[1]);
  run('ffmpeg', ['-y', '-v', 'error', '-i', VIDEO, '-filter_complex', 'showwavespic=s=1920x480:split_channels=1:colors=#161412|#FF5B14:scale=lin', '-frames:v', '1', path.join(OUT, '波形.png')]);

  const level = {integratedLUFS: num(/I:\s+(-?[\d.]+) LUFS/), rangeLU: num(/LRA:\s+(-?[\d.]+) LU/), truePeakDBFS: num(/Peak:\s+(-?[\d.]+) dBFS/),
    samplePeak: Number(peak.toFixed(3)), clippedSamples: clipped, maxSampleStep: Number(step.toFixed(3)), minSecondRms: Number(Math.min(...rms).toFixed(4))};
  const result = {
    video: {codec: v.codec_name, width: v.width, height: v.height, fps: v.r_frame_rate, frames: Number(v.nb_read_frames), start: Number(v.start_time)},
    audio: {codec: a.codec_name, rate: Number(a.sample_rate), channels: a.channels, start: Number(a.start_time), duration: Number(a.duration)},
    duration: Number(probe.format.duration), megabytes: Number((probe.format.size / 2 ** 20).toFixed(1)),
    blankFrames: blank, perScene, cuts, cutAccents, synthOffsetMs: [Math.min(...synth.map(x => x.offsetMs)), Math.max(...synth.map(x => x.offsetMs))], bgmGrid: grid, level,
  };
  result.checks = {
    spec: v.codec_name === 'h264' && a.codec_name === 'aac' && v.width === 1920 && v.height === 1080 && v.r_frame_rate === '30/1' && result.video.frames === FRAME_COUNT && Math.abs(result.duration - SECONDS) < 0.05,
    avStart: Math.abs(result.video.start) < 0.001 && Math.abs(result.audio.start) < 0.03 && Math.abs(result.audio.duration - SECONDS) < 0.05,
    noBlankFrames: blank.length === 0,
    cutsOnBeat: cuts.every(c => c.onBeat),
    synthAccentsOnBeat: synth.every(x => Math.abs(x.offsetMs) <= 5),
    cutAccentsStrong: cutAccents.every(x => Math.abs(x.offsetMs) <= 30 && x.vsPlainBeat >= 1.5),
    bgmOnGrid: Math.abs(grid.foldedOffsetMs) <= 10 && grid.downbeatOnBar,
    loudness: level.integratedLUFS >= -18 && level.integratedLUFS <= -14 && level.truePeakDBFS <= -1,
    noClipping: clipped === 0,
    noPops: step < 0.5,
    noDropouts: Math.min(...rms) > 0.01,
  };
  result.ok = Object.values(result.checks).every(Boolean);
  writeFileSync(path.join(OUT, '检查.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({checks: result.checks, ok: result.ok, cuts, cutAccents, synthOffsetMs: result.synthOffsetMs, bgmGrid: grid, level, perScene}, null, 1));
  if (!result.ok) process.exit(1);
}

if (process.argv[2] === '--frames') frames(path.resolve(process.argv[3]));
else verify();
