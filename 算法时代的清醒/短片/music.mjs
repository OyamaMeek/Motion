// 配乐全部由代码合成：120 BPM，D 大调 I–vi–IV–V 循环，翻页落定的拍点上有纸页落下的重音。
// 用法：node music.mjs 输出路径.wav
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {BPM, FPS, PAGES, FLIP_FRAMES, SAMPLE_RATE as SR} from './timeline.js';

const BEAT = 60 / BPM;
const SECONDS = 30;
const N = SR * SECONDS;
const midi = m => 440 * 2 ** ((m - 69) / 12);
// 每小节一个和弦：D、Bm、G、A，最后一小节回到 D。
const CHORDS = [[50, 54, 57], [47, 50, 54], [43, 47, 50], [45, 49, 52]];
const chordAt = t => (Math.floor(t / (BEAT * 4)) >= 14 ? CHORDS[0] : CHORDS[Math.floor(t / (BEAT * 4)) % 4]);
const LANDINGS = PAGES.slice(1).map(p => p.land / FPS);
const FLIP = FLIP_FRAMES / FPS;
const TICKS = [1, 2, 3, 4, 5].map(k => PAGES.at(-1).land / FPS + k * BEAT);

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296 * 2 - 1;
  };
}

function addPluck(out, t0, freq, gain, decay = 0.996) {
  const noise = rng(Math.round(freq * 1000 + t0 * 7));
  const period = Math.round(SR / freq);
  const ring = Float32Array.from({length: period}, () => noise());
  const start = Math.round(t0 * SR);
  const len = Math.min(Math.round(SR * 1.6), N - start);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const k = i % period;
    const v = ring[k];
    ring[k] = decay * 0.5 * (v + prev);
    prev = v;
    out[start + i] += v * gain * Math.min(1, i / 48);
  }
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

function addKick(out, t0, gain) {
  const start = Math.round(t0 * SR);
  let phase = 0;
  for (let i = 0; i < SR * 0.35 && start + i < N; i++) {
    const t = i / SR;
    phase += 2 * Math.PI * (45 + 75 * Math.exp(-t / 0.03)) / SR;
    out[start + i] += gain * Math.sin(phase) * Math.exp(-t / 0.11);
  }
}

function addNoise(out, t0, dur, gain, shape, seed, cutoff) {
  const noise = rng(seed);
  const start = Math.round(t0 * SR);
  const a = Math.exp(-2 * Math.PI * cutoff / SR);
  let low = 0;
  for (let i = 0; i < dur * SR && start + i < N; i++) {
    low = (1 - a) * noise() + a * low;
    out[start + i] += gain * low * shape(i / (dur * SR));
  }
}

function addHat(out, t0, gain) {
  const noise = rng(Math.round(t0 * 1000));
  const start = Math.round(t0 * SR);
  let last = 0;
  for (let i = 0; i < SR * 0.05 && start + i < N; i++) {
    const n = noise();
    out[start + i] += gain * (n - last) * Math.exp(-i / (SR * 0.012));
    last = n;
  }
}

function reverb(input) {
  const out = new Float32Array(N);
  for (const [ms, fb] of [[29.7, 0.78], [37.1, 0.76], [41.1, 0.74], [43.7, 0.72]]) {
    const d = Math.round(ms * SR / 1000);
    const buf = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      buf[i] = input[i] + (i >= d ? buf[i - d] * fb : 0);
      out[i] += buf[i] * 0.25;
    }
  }
  return out;
}

export function synthesize() {
  const dry = new Float32Array(N);
  const wet = new Float32Array(N);
  const panL = new Float32Array(N);
  const panR = new Float32Array(N);
  const groove = LANDINGS[0];

  for (let bar = 0; bar < 15; bar++) {
    const t0 = bar * BEAT * 4;
    const chord = chordAt(t0);
    for (const m of chord) addTone(dry, t0, BEAT * 4 + 0.3, [[midi(m), 0.018], [midi(m) * 1.003, 0.012]], 0.4, 3);
    if (bar === 14) {
      for (const m of [...chord, chord[0] + 12]) addTone(dry, t0, 2, [[midi(m + 12), 0.03]], 0.01, 0.9);
      continue;
    }
    const pattern = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24];
    for (let step = 0; step < 8; step++) {
      const t = t0 + step * BEAT / 2;
      const target = step % 2 ? panR : panL;
      addPluck(target, t, midi(pattern[step % 4]), 0.16);
      addPluck(wet, t, midi(pattern[step % 4]), 0.05);
    }
    if (t0 >= groove - 0.01) {
      for (let b = 0; b < 4; b++) {
        const t = t0 + b * BEAT;
        if (b % 2 === 0) addKick(dry, t, 0.5);
        addHat(dry, t + BEAT / 2, 0.08);
        addTone(dry, t, BEAT * 0.9, [[midi(chord[0] - 12), 0.22], [midi(chord[0]), 0.05]], 0.006, 0.35);
      }
    }
  }

  LANDINGS.forEach((t, i) => {
    addNoise(dry, t - FLIP, FLIP - 0.04, 0.12, x => Math.sin(Math.PI * Math.min(1, x)) ** 2, 900 + i, 3500);
    addNoise(dry, t, 0.06, 0.9, x => Math.exp(-x * 6), 100 + i, 900);
    addKick(dry, t, 0.55);
    const root = chordAt(t + 0.01)[0] + 24;
    addTone(wet, t, 1.2, [[midi(root), 0.12], [midi(root) * 2.76, 0.03]], 0.002, 0.35);
    addTone(dry, t, 1.2, [[midi(root), 0.1]], 0.002, 0.3);
  });

  [74, 76, 78, 81, 86].forEach((m, i) => {
    addTone(dry, TICKS[i], 0.5, [[midi(m), 0.09], [midi(m) * 3, 0.01]], 0.002, 0.12);
    addTone(wet, TICKS[i], 0.5, [[midi(m), 0.05]], 0.002, 0.12);
  });

  const verb = reverb(wet);
  const left = new Float32Array(N);
  const right = new Float32Array(N);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const fade = Math.min(1, (N - i) / (SR * 0.5), i / (SR * 0.01));
    left[i] = (dry[i] + panL[i] + 0.5 * panR[i] + verb[i]) * fade;
    right[i] = (dry[i] + panR[i] + 0.5 * panL[i] + verb[i] * 0.95) * fade;
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  // 软限幅压住纸页落下和底鼓的瞬时峰值，整体响度提到约 -16 LUFS。
  // 留出约 2 dB 给 AAC 编码后的真峰值。
  const drive = 2.4, norm = 0.79 / Math.tanh(drive);
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
