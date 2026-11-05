// 配乐全部由代码合成：120 BPM，D 小调 Dm–B♭–F–C，每小节换一个和弦，结尾停在 F。
// 切点和场景内的锁定动作（HIT_BEATS）同拍起音；每个场景的配器跟着画面手法走。
// 用法：node music.mjs 输出路径.wav
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {BEATS, BPM, HIT_BEATS, KEYS, SAMPLE_RATE as SR, SCENES, SECONDS} from './timeline.js';

const BEAT = 60 / BPM;
const N = SR * SECONDS;
const midi = m => 440 * 2 ** ((m - 69) / 12);
const CHORDS = [[50, 53, 57], [50, 53, 58], [48, 53, 57], [48, 52, 55]];
const ROOTS = [38, 34, 41, 36];
const FINAL = [53, 57, 60, 65];
const FINAL_BEAT = SCENES.find(s => s.id === 'chain').beat + KEYS.chain.final;
const sceneAt = beat => SCENES.findLast(s => beat >= s.beat);
const at = (id, b) => SCENES.find(s => s.id === id).beat + b;

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

function addClap(out, t0, gain, seed) {
  for (const [d, g] of [[0, 0.6], [0.011, 0.8], [0.022, 1]]) {
    addSweep(out, t0 + d, d === 0.022 ? 0.22 : 0.012, gain * g, 1800, 1400, x => (d === 0.022 ? Math.exp(-x * 5) : 1), seed + d * 1000);
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
  addKick(dry, t, 0.75 * size, 0.18);
  addTone(dry, t, 1.8, [[midi(26), 0.3 * size], [midi(38), 0.08 * size]], 0.002, 0.45);
  addSweep(dry, t, 1.2 * size, 0.42 * size, 3600, 300, x => Math.exp(-x * 5) * Math.min(1, x * 400), seed);
  const top = midi(ROOTS[Math.floor(beat / 4) % 4] + 36);
  addTone(wet, t, 2.5, [[top, 0.09 * size], [top * 2.76, 0.025 * size], [top * 5.4, 0.008 * size]], 0.002, 0.7);
}

// 每个场景的配器。
const ARR = {
  fermat: b => (b < 8 ? {sub: 0.7, hat: 0.5} : {bass: 0.9, pluck: 1, kick: 0.5, hat: 0.7, pad: 0.8}),
  rolle: () => ({bass: 1, pluck: 1.1, kick: 0.8, clap: 1, hat: 1, pad: 0.7, sixteenth: true}),
  lagrange: b => (b < 8 ? {drone: 1, pad: 0.6} : b < 36 ? {bass: 0.9, half: 0.9, pad: 0.9, keys: 0.8, hat: 0.6} : {bass: 1, pluck: 1, kick: 0.8, clap: 1, hat: 1, pad: 0.7}),
  cauchy: b => (b < 8 ? {pad: 0.9, sparkle: 1.4, drone: 1.3} : {bass: 1, pluck: 0.9, kick: 0.85, clap: 1, hat: 1.1, pad: 0.7, sparkle: 1, sixteenth: true}),
  chain: b => (b < 6 ? {drone: 1.3} : b < 24 ? {pad: 1.1, keys: 1, kick: 0.35, bass: 0.6} : b < 36 ? {pad: 1, keys: 0.8, pulse: 1} : {}),
};

function sparkles(wet, panL, panR, b0, b1, density, seed) {
  const r = rng(seed);
  const scale = [74, 77, 79, 81, 84, 86, 89, 91];
  for (let s = b0 * 4; s < b1 * 4; s++) {
    if ((r() + 1) / 2 > density) continue;
    const m = scale[Math.floor((r() + 1) / 2 * scale.length) % scale.length];
    const t = s * BEAT / 4;
    const target = r() > 0 ? panL : panR;
    addTone(target, t, 0.3, [[midi(m), 0.022], [midi(m) * 3, 0.004]], 0.001, 0.07);
    addTone(wet, t, 0.3, [[midi(m), 0.012]], 0.001, 0.07);
  }
}

export function synthesize() {
  const dry = new Float32Array(N), wet = new Float32Array(N);
  const panL = new Float32Array(N), panR = new Float32Array(N);

  for (let beat = 0; beat < BEATS; beat++) {
    const t = beat * BEAT;
    const scene = sceneAt(beat);
    const local = beat - scene.beat;
    const arr = ARR[scene.id](local);
    const bar = beat % 4;
    const ci = Math.floor(beat / 4) % 4;
    const chord = CHORDS[ci], root = ROOTS[ci];
    if (beat >= FINAL_BEAT) continue;
    if (arr.pad && bar === 0) {
      const dur = Math.min(BEAT * 4, (FINAL_BEAT - beat) * BEAT) + 0.3;
      for (const m of chord) addTone(wet, t, dur, [[midi(m), 0.012 * arr.pad], [midi(m) * 1.005, 0.009 * arr.pad], [midi(m - 12), 0.008 * arr.pad]], 0.35, 2.6);
    }
    if (arr.sub) addTone(dry, t, BEAT * 0.9, [[midi(root - 12), 0.16 * arr.sub]], 0.004, 0.2);
    if (arr.drone && bar === 0) addTone(dry, t, BEAT * 4 + 0.1, [[midi(root - 12), 0.09 * arr.drone], [midi(root - 5), 0.025 * arr.drone]], 0.2, 3);
    if (arr.bass) {
      for (const half of [0, 1]) addTone(dry, t + half * BEAT / 2, BEAT * 0.42, [[midi(root - 12), 0.17 * arr.bass], [midi(root), 0.035 * arr.bass]], 0.004, 0.16);
    }
    if (arr.pulse) addTone(dry, t, BEAT * 0.8, [[midi(root - 12), 0.12], [midi(root), 0.03]], 0.004, 0.25);
    if (arr.pluck) {
      const notes = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24, chord[2] + 12, chord[0] + 24, chord[1] + 12, chord[2]];
      const steps = arr.sixteenth ? 4 : 2;
      for (let k = 0; k < steps; k++) {
        const idx = (bar * steps + k) % notes.length;
        const target = k % 2 ? panR : panL;
        const g = (arr.sixteenth ? 0.075 : 0.1) * arr.pluck * (k === 0 ? 1.2 : 1);
        addPluck(target, t + k * BEAT / steps, midi(notes[idx]), g);
        addPluck(wet, t + k * BEAT / steps, midi(notes[idx]), g * 0.3);
      }
    }
    if (arr.keys && bar % 2 === 0) {
      const m = [chord[2] + 12, chord[1] + 12][bar / 2];
      addTone(dry, t, 2, [[midi(m), 0.045 * arr.keys], [midi(m) * 2, 0.01 * arr.keys], [midi(m) * 3, 0.004 * arr.keys]], 0.004, 0.7);
      addTone(wet, t, 2, [[midi(m), 0.03 * arr.keys]], 0.004, 0.7);
    }
    if (arr.kick && !(arr.half)) addKick(dry, t, 0.5 * arr.kick);
    if (arr.half && bar === 0) addKick(dry, t, 0.55 * arr.half);
    if (arr.half && bar === 2) addClap(dry, t, 0.22 * arr.half, 700 + beat);
    if (arr.clap && bar % 2 === 1) addClap(dry, t, 0.2 * arr.clap, 500 + beat);
    if (arr.hat) {
      addHat(dry, t + BEAT / 2, 0.08 * arr.hat);
      if (arr.sixteenth) { addHat(dry, t + BEAT / 4, 0.03 * arr.hat); addHat(dry, t + 3 * BEAT / 4, 0.03 * arr.hat); }
    }
  }

  // 费马：切条飞入的两声风声，公式锁定前停住
  addSweep(dry, 0, 2 * BEAT - 0.05, 0.22, 3000, 700, x => (1 - x) ** 1.5, 11);
  addSweep(dry, at('fermat', KEYS.fermat.formOut), BEAT, 0.16, 800, 4000, x => Math.sin(Math.PI * x), 12);
  addSweep(dry, at('fermat', KEYS.fermat.formBack) - 1, BEAT - 0.05, 0.18, 600, 5000, x => x ** 2, 13);
  riser(dry, at('rolle', 0) - 2, at('rolle', 0), 0.2, 14);

  // 罗尔：每次变形前一拍的风声推到落定
  for (const [i, b] of KEYS.rolle.morphs.entries()) addSweep(dry, (at('rolle', b) - 1) * BEAT, BEAT - 0.05, 0.13, 500, 3500, x => x ** 1.6, 30 + i);
  riser(dry, at('lagrange', 0) - 4, at('lagrange', 0), 0.22, 15);

  // 拉格朗日：穿过每块文字平面时的风声；对齐前的上扬；俯冲进 ξ 的上扬
  for (const [i, b] of KEYS.lagrange.passes.entries()) {
    const t = at('lagrange', b) * BEAT;
    addSweep(dry, t - 0.45, 0.9, 0.22, 600, 6000, x => Math.sin(Math.PI * x) ** 2, 40 + i);
  }
  for (const [i, b] of KEYS.lagrange.swings.entries()) {
    const t = at('lagrange', b) * BEAT;
    addTone(wet, t, 1, [[midi(81 + i * 2), 0.05], [midi(81 + i * 2) * 2.76, 0.012]], 0.002, 0.3);
  }
  riser(dry, at('lagrange', KEYS.lagrange.align) - 8, at('lagrange', KEYS.lagrange.align), 0.24, 16);
  riser(dry, at('lagrange', KEYS.lagrange.dive) - 6, at('lagrange', KEYS.lagrange.dive), 0.3, 17);

  // 柯西：粒子的高音碎点
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

  for (const [i, beat] of HIT_BEATS.entries()) {
    const big = beat === 0 || SCENES.some(s => s.beat === beat) || beat === FINAL_BEAT || beat === at('chain', KEYS.chain.formula);
    impact(dry, wet, beat, big ? 1 : 0.6, 200 + i);
  }

  // 结尾和弦
  {
    const t = FINAL_BEAT * BEAT;
    for (const m of FINAL) addTone(wet, t, SECONDS - t, [[midi(m), 0.03], [midi(m) * 1.004, 0.02], [midi(m + 12), 0.008]], 0.01, 3.5);
    addTone(dry, t, SECONDS - t, [[midi(41 - 12), 0.14], [midi(41), 0.04]], 0.01, 2.5);
  }

  const verb = reverb(wet);
  const left = new Float32Array(N), right = new Float32Array(N);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const fade = Math.min(1, (N - i) / (SR * 1.5), i / (SR * 0.004));
    left[i] = (dry[i] + panL[i] + 0.45 * panR[i] + verb[i]) * fade;
    right[i] = (dry[i] + panR[i] + 0.45 * panL[i] + verb[i] * 0.94) * fade;
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  // 软限幅压住重音的瞬时峰值；AAC 编码后真峰值会比 WAV 高约 2 dB，输出峰值留在约 -3 dBFS。
  const drive = 3.2, norm = 0.72 / Math.tanh(drive);
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
