// 配乐 = bgm.mp3（拉伸到 120 BPM、剪掉一句）+ 代码合成的一层。
// bgm 的测量在 bgm-analysis.json（analyze-bgm.py 生成）：112.9 BPM、F 小调、4 小节 Fm–Fm–D♭–E♭ 循环，
// 前 32 拍是前奏、第 144—176 拍是间奏。开场总起 32 拍正好盖住前奏，bgm 的正歌在费马切点进来，
// 间奏落在拉格朗日的公式拼合，第二段在柯西切点进来；剪掉第 192—224 拍一句，让结尾段落在片尾回顾。
// 合成层：开场的大鼓和铜管式低音重击、各场景的风声与上扬、切点和锁定动作的重音、粒子碎点；
// 有音高的部分按 bgm 当前小节的和弦根音取根音和五度，不叠 bgm 已有的鼓组和贝斯。
// 用法：node music.mjs 输出路径.wav
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BEATS, BPM, HIT_BEATS, KEYS, SAMPLE_RATE as SR, SCENES, SECONDS} from './timeline.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const BGM_FILE = path.resolve(here, '../../bgm.mp3');
export const BGM = JSON.parse(readFileSync(path.join(here, 'bgm-analysis.json'), 'utf8'));
const BEAT = 60 / BPM;
export const BGM_STRETCH = BGM.period / BEAT;
// bgm 拍号 [from, to) 放到成片拍号 at 起；to 为 null 表示放到 bgm 结束
export const BGM_SEGMENTS = [{from: 0, to: 192, at: 0}, {from: 224, to: null, at: 192}];
const N = SR * SECONDS;
const midi = m => 440 * 2 ** ((m - 69) / 12);
const FINAL_BEAT = SCENES.find(s => s.id === 'chain').beat + KEYS.chain.final;
const sceneAt = beat => SCENES.findLast(s => beat >= s.beat);
const at = (id, b) => SCENES.find(s => s.id === id).beat + b;

export function bgmBeatAt(filmBeat) {
  const s = BGM_SEGMENTS.findLast(x => filmBeat >= x.at);
  return s.from + (filmBeat - s.at);
}

// 成片某一拍时 bgm 的和弦根音（音级 0—11）。chroma 三和弦检测在几个小节把 Fm 认成 Dm（低音是 F），按 F 处理。
function rootAt(filmBeat) {
  const c = BGM.barChords[Math.min(BGM.barChords.length - 1, Math.floor(bgmBeatAt(Math.floor(filmBeat)) / 4))];
  return c.name === 'Dm' ? 5 : c.root;
}
// 不低于 base 的最近一个该音级的 MIDI 音
const pitch = (pc, base) => base + ((pc - base) % 12 + 12) % 12;

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1;
  };
}

function addTone(out, t0, dur, partials, attack, tau) {
  const start = Math.round(t0 * SR);
  const len = Math.min(Math.round(dur * SR), N - start);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * Math.exp(-t / tau) * Math.min(1, (len - i) / (SR * 0.02));
    let v = 0;
    for (const [f, a] of partials) v += a * Math.sin(2 * Math.PI * f * t);
    out[start + i] += v * env;
  }
}

function addPluck(out, t0, freq, gain, decay = 0.995) {
  const noise = rng(Math.round(freq * 1000 + t0 * 7));
  const period = Math.round(SR / freq);
  const ring = Float32Array.from({length: period}, () => noise());
  for (let pass = 0; pass < 2; pass++) {
    const copy = Float32Array.from(ring);
    for (let k = 0; k < period; k++) ring[k] = (copy[(k + period - 1) % period] + 2 * copy[k] + copy[(k + 1) % period]) / 4;
  }
  const start = Math.round(t0 * SR);
  const len = Math.min(Math.round(SR * 1.0), N - start);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const k = i % period;
    const v = ring[k];
    ring[k] = decay * 0.5 * (v + prev);
    prev = v;
    out[start + i] += v * gain * Math.min(1, i / 48);
  }
}

function addKick(out, t0, gain, tail = 0.13) {
  const start = Math.round(t0 * SR);
  let phase = 0;
  for (let i = 0; i < SR * 0.45 && start + i < N; i++) {
    const t = i / SR;
    phase += 2 * Math.PI * (46 + 110 * Math.exp(-t / 0.025)) / SR;
    out[start + i] += gain * Math.sin(phase) * Math.exp(-t / tail) * Math.min(1, i / 24);
  }
}

// 噪声经一阶低通，截止频率在 f0→f1 之间随时间变化；减去更慢的低通得到带通的“气声”。
function addSweep(out, t0, dur, gain, f0, f1, shape, seed) {
  const noise = rng(seed);
  const start = Math.round(t0 * SR);
  const len = Math.min(Math.round(dur * SR), N - start);
  let lo = 0, lo2 = 0;
  for (let i = 0; i < len; i++) {
    const x = i / len;
    const fc = f0 * (f1 / f0) ** x;
    const a = Math.exp(-2 * Math.PI * fc / SR), a2 = Math.exp(-2 * Math.PI * fc * 0.25 / SR);
    const n = noise();
    lo = (1 - a) * n + a * lo;
    lo2 = (1 - a2) * n + a2 * lo2;
    out[start + i] += gain * (lo - 0.7 * lo2) * shape(x);
  }
}

function addHat(out, t0, gain, len = 0.04) {
  const noise = rng(Math.round(t0 * 1000) + 7);
  const start = Math.round(t0 * SR);
  // 差分噪声再做两点平均，去掉相邻采样的大跳变
  let last = 0, lastD = 0;
  for (let i = 0; i < SR * len && start + i < N; i++) {
    const n = noise(), d = n - last;
    out[start + i] += gain * 0.5 * (d + lastD) * Math.exp(-i / (SR * len * 0.25)) * Math.min(1, i / 8);
    last = n; lastD = d;
  }
}

// 大鼓：音高从 110 Hz 落到 52 Hz，加一段低通噪声做鼓皮声，开头 12 ms 的亮噪声做鼓槌击打，让起音时间清楚
function addTaiko(out, t0, gain, seed) {
  const start = Math.round(t0 * SR);
  let phase = 0;
  for (let i = 0; i < SR * 0.9 && start + i < N; i++) {
    const t = i / SR;
    phase += 2 * Math.PI * (52 + 58 * Math.exp(-t / 0.05)) / SR;
    out[start + i] += gain * Math.sin(phase) * Math.exp(-t / 0.32) * Math.min(1, i / 30);
  }
  addSweep(out, t0, 0.25, gain * 0.55, 900, 200, x => Math.exp(-x * 6) * Math.min(1, x * 300), seed);
  addSweep(out, t0, 0.012, gain * 0.9, 5000, 2500, x => (1 - x) * Math.min(1, x * 40), seed + 1);
}

// 铜管式低音重击：根音、五度、高八度各两个微失谐的锯齿波（加法合成），泛音随包络先张开再收拢
function addBraam(out, t0, dur, pc, gain) {
  const root = pitch(pc, 29);
  const voices = [[root, 1], [root + 7, 0.7], [root + 12, 0.6]];
  const start = Math.round(t0 * SR);
  const len = Math.min(Math.round(dur * SR), N - start);
  const freqs = [], amps = [];
  for (const [m, a] of voices) for (const det of [0.997, 1.003]) for (let n = 1; n <= 22; n++) { freqs.push(midi(m) * det * n); amps.push(a / n); }
  const phases = new Float64Array(freqs.length);
  const step = freqs.map(f => 2 * Math.PI * f / SR);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const cutoff = 180 + 2600 * Math.min(1, t / 0.12) * Math.exp(-t / (dur * 0.45));
    const env = Math.min(1, t / 0.008) * Math.exp(-t / (dur * 0.5)) * Math.min(1, (len - i) / (SR * 0.05));
    let v = 0;
    for (let k = 0; k < freqs.length; k++) {
      phases[k] += step[k];
      if (freqs[k] > cutoff * 1.6) continue;
      const roll = freqs[k] < cutoff ? 1 : (cutoff * 1.6 - freqs[k]) / (cutoff * 0.6);
      v += amps[k] * roll * Math.sin(phases[k]);
    }
    out[start + i] += gain * v * env * 0.12;
  }
}

function reverb(input) {
  const outBuf = new Float32Array(N);
  for (const [ms, fb] of [[31.3, 0.82], [37.1, 0.8], [41.9, 0.78], [47.3, 0.76]]) {
    const d = Math.round(ms * SR / 1000);
    const buf = new Float32Array(N);
    let lp = 0;
    for (let i = 0; i < N; i++) {
      const back = i >= d ? buf[i - d] : 0;
      lp = 0.6 * back + 0.4 * lp;
      buf[i] = input[i] + lp * fb;
      outBuf[i] += buf[i] * 0.22;
    }
  }
  return outBuf;
}

// 上扬：截止频率与音量一起升高，在目标拍前 50 ms 停住，让重音的起音干净。
function riser(dry, b0, b1, gain, seed) {
  const t0 = b0 * BEAT, t1 = b1 * BEAT - 0.05;
  addSweep(dry, t0, t1 - t0, gain, 400, 6000, x => x ** 2.2, seed);
}

function impact(dry, wet, beat, size, seed) {
  const t = beat * BEAT;
  const pc = rootAt(beat);
  addKick(dry, t, 0.75 * size, 0.18);
  addTone(dry, t, 1.8, [[midi(pitch(pc, 24)), 0.3 * size], [midi(pitch(pc, 36)), 0.08 * size]], 0.002, 0.45);
  addSweep(dry, t, 1.2 * size, 0.42 * size, 3600, 300, x => Math.exp(-x * 5) * Math.min(1, x * 400), seed);
  const top = midi(pitch(pc, 72));
  addTone(wet, t, 2.5, [[top, 0.09 * size], [top * 2.76, 0.025 * size], [top * 5.4, 0.008 * size]], 0.002, 0.7);
}

// 每个场景的合成配器（只用根音和五度）。
const ARR = {
  overture: () => ({}),
  fermat: b => (b < 8 ? {} : {pluck: 0.55}),
  rolle: () => ({pluck: 0.5, sixteenth: true}),
  lagrange: b => (b < 8 ? {drone: 1} : {keys: 0.55}),
  cauchy: b => (b < 8 ? {drone: 1.2} : {}),
  chain: b => (b < 6 ? {drone: 1.2} : b < 36 ? {keys: 0.65} : {}),
};

function sparkles(wet, panL, panR, b0, b1, density, seed) {
  const r = rng(seed);
  const scale = [77, 80, 82, 84, 87, 89, 92, 94];
  for (let s = b0 * 4; s < b1 * 4; s++) {
    if ((r() + 1) / 2 > density) continue;
    const m = scale[Math.floor((r() + 1) / 2 * scale.length) % scale.length];
    const t = s * BEAT / 4;
    const target = r() > 0 ? panL : panR;
    addTone(target, t, 0.3, [[midi(m), 0.022], [midi(m) * 3, 0.004]], 0.001, 0.07);
    addTone(wet, t, 0.3, [[midi(m), 0.012]], 0.001, 0.07);
  }
}

// 开场总起：逐拍的大鼓与低音重击，标题一拍最重；28—32 拍鼓点加密、噪声上扬，推到费马切点。
function overture(dry, wet) {
  const O = KEYS.overture;
  const hits = [[O.curve, 3, 1.3], [O.ends, 1.2, 0.8], [O.point, 1.2, 0.8], [O.parallel, 1.6, 0.95],
    ...O.names.map((b, i) => [b, 0.9, 0.75 + 0.1 * i]), [O.chain, 1.8, 1], [O.title, 5, 1.5], [O.sub, 1.2, 0.7], [O.why, 1.8, 1.1], [O.ask, 1.6, 0.9]];
  hits.forEach(([b, dur, g], i) => {
    const t = at('overture', b) * BEAT;
    addTaiko(dry, t, 0.55 * g, 600 + i);
    addBraam(dry, t, dur, rootAt(at('overture', b)), g);
  });
  // 四个定理名：高音按根音、五度、八度、高五度逐拍升高
  O.names.forEach((b, i) => {
    const pc = rootAt(at('overture', b));
    const m = [pitch(pc, 72), pitch(pc, 72) + 7, pitch(pc, 72) + 12, pitch(pc, 72) + 19][i];
    addTone(wet, at('overture', b) * BEAT, 1.4, [[midi(m), 0.07], [midi(m) * 2.76, 0.02]], 0.002, 0.45);
  });
  addSweep(dry, at('overture', O.row) * BEAT, BEAT * 1.6, 0.2, 500, 5000, x => Math.sin(Math.PI * x), 610);
  // 标题之后四拍的鼓点推进
  for (const b of [20, 21, 22, 22.5, 23, 23.5]) addTaiko(dry, at('overture', b) * BEAT, 0.3 + 0.04 * (b - 20), 620 + b * 2);
  // 冲进橙点：鼓点从八分加密到三十二分，最后半拍空出来，让切点的重击前面有一口气
  for (let b = O.dive; b < 31.5 - 0.01; ) {
    const step = b < 30 ? 0.5 : b < 31 ? 0.25 : 0.125;
    addTaiko(dry, at('overture', b) * BEAT, 0.22 + 0.12 * (b - O.dive), 640 + b * 8);
    b += step;
  }
  riser(dry, at('overture', O.dive) - 2, at('overture', 31.7), 0.34, 650);
}

// bgm：解码、按 BGM_STRETCH 变速不变调、重采样到 48 kHz，再按 BGM_SEGMENTS 拼到成片时间上。
// 接缝前后各留 15 ms 交叉淡化，接缝放在拍点前 15 ms，不切掉起音。
export function loadBgm() {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', BGM_FILE, '-af', `atempo=${BGM_STRETCH}`, '-ar', String(SR), '-ac', '2', '-f', 'f32le', '-'], {maxBuffer: 2 ** 31});
  if (r.status !== 0) throw new Error(`bgm 解码失败 ${r.status}: ${r.stderr}`);
  const src = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
  const frames = src.length / 2;
  const left = new Float32Array(N), right = new Float32Array(N);
  const beat0 = BGM.firstBeat / BGM_STRETCH;
  const XF = Math.round(0.015 * SR);
  BGM_SEGMENTS.forEach((s, si) => {
    const srcStart = Math.round((beat0 + s.from * BEAT) * SR) - (si ? XF : 0);
    const dstStart = Math.round(s.at * BEAT * SR) - (si ? XF : 0);
    const end = s.to === null ? frames - srcStart : Math.round((s.to - s.from) * BEAT * SR) + (si ? XF : 0);
    const next = BGM_SEGMENTS[si + 1];
    for (let i = 0; i < end && dstStart + i < N && srcStart + i < frames; i++) {
      if (dstStart + i < 0) continue;
      let g = si ? Math.min(1, i / XF) : 1;
      if (next) { const tail = end - i; if (tail <= XF) g *= tail / XF; }
      left[dstStart + i] += src[2 * (srcStart + i)] * g;
      right[dstStart + i] += src[2 * (srcStart + i) + 1] * g;
    }
  });
  return {left, right};
}

// 合成层单轨（混入 bgm 之前）：重音的起音时间在这一轨上单独检查。
export function synthStem() {
  const dry = new Float32Array(N), wet = new Float32Array(N);
  const panL = new Float32Array(N), panR = new Float32Array(N);

  for (let beat = 0; beat < BEATS; beat++) {
    const t = beat * BEAT;
    const scene = sceneAt(beat);
    const arr = ARR[scene.id](beat - scene.beat);
    const bar = beat % 4;
    if (beat >= FINAL_BEAT) continue;
    const pc = rootAt(beat), r = pitch(pc, 53);
    if (arr.drone && bar === 0) addTone(dry, t, BEAT * 4 + 0.1, [[midi(pitch(pc, 29)), 0.09 * arr.drone], [midi(pitch(pc, 29) + 7), 0.025 * arr.drone]], 0.2, 3);
    if (arr.pluck) {
      const notes = [r, r + 7, r + 12, r + 19, r + 12, r + 7, r + 12, r + 24];
      const steps = arr.sixteenth ? 4 : 2;
      for (let k = 0; k < steps; k++) {
        const target = k % 2 ? panR : panL;
        const g = (arr.sixteenth ? 0.075 : 0.1) * arr.pluck * (k === 0 ? 1.2 : 1);
        const note = notes[(bar * steps + k) % notes.length];
        addPluck(target, t + k * BEAT / steps, midi(note), g);
        addPluck(wet, t + k * BEAT / steps, midi(note), g * 0.3);
      }
    }
    if (arr.keys && bar % 2 === 0) {
      const m = bar === 0 ? r + 12 : r + 7;
      addTone(dry, t, 2, [[midi(m), 0.045 * arr.keys], [midi(m) * 2, 0.01 * arr.keys], [midi(m) * 3, 0.004 * arr.keys]], 0.004, 0.7);
      addTone(wet, t, 2, [[midi(m), 0.03 * arr.keys]], 0.004, 0.7);
    }
  }

  overture(dry, wet);

  // 费马：切条飞入的两声风声，公式锁定前停住
  addSweep(dry, at('fermat', 0) * BEAT, 2 * BEAT - 0.05, 0.22, 3000, 700, x => (1 - x) ** 1.5, 11);
  addSweep(dry, at('fermat', KEYS.fermat.formOut) * BEAT, BEAT, 0.16, 800, 4000, x => Math.sin(Math.PI * x), 12);
  addSweep(dry, (at('fermat', KEYS.fermat.formBack) - 1) * BEAT, BEAT - 0.05, 0.18, 600, 5000, x => x ** 2, 13);
  riser(dry, at('rolle', 0) - 2, at('rolle', 0), 0.2, 14);

  // 罗尔：每次变形前一拍的风声推到落定
  for (const [i, b] of KEYS.rolle.morphs.entries()) addSweep(dry, (at('rolle', b) - 1) * BEAT, BEAT - 0.05, 0.13, 500, 3500, x => x ** 1.6, 30 + i);
  riser(dry, at('lagrange', 0) - 4, at('lagrange', 0), 0.22, 15);

  // 拉格朗日：穿过每块文字平面时的风声；斜率摆动时的钟声；对齐前的上扬；俯冲进 ξ 的上扬
  for (const [i, b] of KEYS.lagrange.passes.entries()) {
    const t = at('lagrange', b) * BEAT;
    addSweep(dry, t - 0.45, 0.9, 0.22, 600, 6000, x => Math.sin(Math.PI * x) ** 2, 40 + i);
  }
  for (const [i, b] of KEYS.lagrange.swings.entries()) {
    const t = at('lagrange', b) * BEAT;
    const m = [84, 87, 89][i];
    addTone(wet, t, 1, [[midi(m), 0.05], [midi(m) * 2.76, 0.012]], 0.002, 0.3);
  }
  riser(dry, at('lagrange', KEYS.lagrange.align) - 8, at('lagrange', KEYS.lagrange.align), 0.24, 16);
  riser(dry, at('lagrange', KEYS.lagrange.dive) - 6, at('lagrange', KEYS.lagrange.dive), 0.3, 17);

  // 柯西：粒子的高音碎点（F 小调五声音阶）
  sparkles(wet, panL, panR, at('cauchy', 0), at('cauchy', 8), 0.9, 51);
  sparkles(wet, panL, panR, at('cauchy', 8), at('cauchy', 56), 0.35, 52);
  for (const b of [KEYS.cauchy.formula, KEYS.cauchy.lagrange, KEYS.cauchy.title]) riser(dry, at('cauchy', b) - 2, at('cauchy', b), 0.14, 60 + b);
  riser(dry, at('chain', 0) - 4, at('chain', 0), 0.24, 18);

  // 结尾：胶片条急停的放映机声（间隔越来越大）；回到费马公式和最后一道横线前各一段上扬
  {
    let t = at('chain', 0) * BEAT, gap = 0.035;
    const stop = at('chain', KEYS.chain.strip) * BEAT - 0.06;
    while (t < stop) { addHat(dry, t, 0.11, 0.025); addTone(dry, t, 0.03, [[1800, 0.03]], 0.0005, 0.01); t += gap; gap *= 1.045; }
    riser(dry, at('chain', KEYS.chain.formula) - 2, at('chain', KEYS.chain.formula), 0.18, 19);
    riser(dry, at('chain', KEYS.chain.final) - 2, at('chain', KEYS.chain.final), 0.2, 20);
  }

  const bigBeats = new Set([...SCENES.map(s => s.beat), FINAL_BEAT, at('chain', KEYS.chain.formula), at('overture', KEYS.overture.title)]);
  for (const [i, beat] of HIT_BEATS.entries()) impact(dry, wet, beat, bigBeats.has(beat) ? 1 : 0.6, 200 + i);

  // 结尾和弦：F 小调主和弦
  {
    const t = FINAL_BEAT * BEAT;
    for (const m of [53, 56, 60, 65]) addTone(wet, t, SECONDS - t, [[midi(m), 0.03], [midi(m) * 1.004, 0.02], [midi(m + 12), 0.008]], 0.01, 3.5);
    addTone(dry, t, SECONDS - t, [[midi(29), 0.14], [midi(41), 0.04]], 0.01, 2.5);
  }

  const verb = reverb(wet);
  const left = new Float32Array(N), right = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    left[i] = dry[i] + panL[i] + 0.45 * panR[i] + verb[i];
    right[i] = dry[i] + panR[i] + 0.45 * panL[i] + verb[i] * 0.94;
  }
  return {left, right};
}

export function synthesize() {
  const syn = synthStem();
  const bgm = loadBgm();
  // bgm 在开场压低，让大鼓和低音重击在前；28 拍起随上扬回升，费马切点回到原音量
  const ov = at('overture', KEYS.overture.dive) * BEAT, full = at('fermat', 0) * BEAT;
  // 其余每个切点前 150 ms 也把 bgm 压下去，让切点重击和 bgm 自己的鼓拉开
  const cuts = SCENES.slice(2).map(s => s.beat * BEAT);
  const bgmGain = t => {
    if (t < ov) return 0.5;
    if (t < full - 0.2) return 0.5 + 0.5 * ((t - ov) / (full - ov)) ** 2;
    if (t < full) return 0.12;
    return cuts.some(c => t >= c - 0.15 && t < c) ? 0.3 : 1;
  };
  const SYN = 0.75, BG = 1.6;
  const left = new Float32Array(N), right = new Float32Array(N);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const fade = Math.min(1, (N - i) / (SR * 1.5), i / (SR * 0.004));
    const gb = BG * bgmGain(i / SR);
    left[i] = (SYN * syn.left[i] + gb * bgm.left[i]) * fade;
    right[i] = (SYN * syn.right[i] + gb * bgm.right[i]) * fade;
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  // 软限幅压住重击的瞬时峰值，bgm 所在的中低电平基本线性；AAC 编码后真峰值会比 WAV 高约 1 dB，输出峰值留在约 -2.5 dBFS。
  const drive = 2.3, norm = 0.75 / Math.tanh(drive);
  for (let i = 0; i < N; i++) {
    left[i] = Math.tanh(drive * left[i] / peak) * norm;
    right[i] = Math.tanh(drive * right[i] / peak) * norm;
  }
  return {left, right};
}

export function toWav({left, right}) {
  const data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8);
  head.write('fmt ', 12); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(2, 22);
  head.writeUInt32LE(SR, 24); head.writeUInt32LE(SR * 4, 28); head.writeUInt16LE(4, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) writeFileSync(process.argv[2], toWav(synthesize()));
