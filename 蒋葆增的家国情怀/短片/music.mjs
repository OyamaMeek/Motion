// 配乐全部由代码合成：120 BPM，A 小调 Am–F–C–G 循环，结尾停在 C。
// 每次翻页的落拍帧上有底鼓、纸声和钟声组成的重音；段落密度随画面明暗变化。
// 用法：node music.mjs 输出路径.wav
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {BEATS, BPM, CREED_SNAP_BEAT, OPEN_BURST_BEAT, OPEN_DROP_BEAT, OPEN_REVEAL_BEAT, OPEN_REVEAL_STEP, OPEN_SNAP_BEAT, OPEN_STAND_BEAT, PAGES, SAMPLE_RATE as SR, SECONDS} from './timeline.js';

const BEAT = 60 / BPM;
const N = SR * SECONDS;
const midi = m => 440 * 2 ** ((m - 69) / 12);
const CHORDS = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]];
const FINAL = [48, 52, 55];
const FINAL_BEAT = PAGES.find(p => p.id === 'end').beat;
const chordAt = beat => (beat >= FINAL_BEAT ? FINAL : CHORDS[Math.floor(beat / 4) % 4]);
const pageAt = beat => PAGES.findLast(p => beat >= p.beat);

// 每页的配器：pad 铺底，keys 钢琴分解和弦，pluck 八分音符拨弦，bass 低音，kick/hat 鼓。
const ARR = {
  open: {pad: 1, keys: 1},
  motto: {pad: 1, keys: 1, bass: 0.6, kick: 0.4},
  newark: {pad: 0.8, pluck: 1, bass: 1, kick: 0.5},
  plan: {pad: 0.8, pluck: 1, bass: 1, kick: 0.6, hat: 0.6},
  hire: {pad: 0.8, pluck: 1, bass: 1, kick: 0.6, hat: 0.8},
  y1979: {pad: 1, bass: 1.2, pulse: 1, kick: 0.5},
  aid: {pad: 0.8, pluck: 1.1, bass: 1, kick: 0.8, hat: 1},
  exam: {pad: 0.8, pluck: 1.1, bass: 1, kick: 0.8, hat: 1},
  creed: {pad: 0.7, keys: 0.7},
  notice: {pad: 0.8, pluck: 1.1, high: 1, bass: 1, kick: 0.8, hat: 1},
  drones: {pad: 1, pluck: 1, high: 1.2, bass: 1.1, kick: 0.9, hat: 1},
  ours: {pad: 0.8, keys: 0.9, bass: 0.8, kick: 0.4},
  end: {pad: 1.2, keys: 0.5},
};

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
  // 激励先做两遍环形平滑，去掉白噪声起音的刺耳高频和采样跳变。
  for (let pass = 0; pass < 2; pass++) {
    const copy = Float32Array.from(ring);
    for (let k = 0; k < period; k++) ring[k] = (copy[(k + period - 1) % period] + 2 * copy[k] + copy[(k + 1) % period]) / 4;
  }
  const start = Math.round(t0 * SR);
  const len = Math.min(Math.round(SR * 1.4), N - start);
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
    const env = Math.min(1, t / attack) * Math.exp(-t / tau) * Math.min(1, (len - i) / (SR * 0.03));
    let v = 0;
    for (const [f, a] of partials) v += a * Math.sin(2 * Math.PI * f * t);
    out[start + i] += v * env;
  }
}

function addKick(out, t0, gain) {
  const start = Math.round(t0 * SR);
  let phase = 0;
  for (let i = 0; i < SR * 0.4 && start + i < N; i++) {
    const t = i / SR;
    phase += 2 * Math.PI * (44 + 80 * Math.exp(-t / 0.03)) / SR;
    out[start + i] += gain * Math.sin(phase) * Math.exp(-t / 0.12);
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
    out[start + i] += gain * (n - last) * Math.exp(-i / (SR * 0.011));
    last = n;
  }
}

function reverb(input) {
  const outBuf = new Float32Array(N);
  for (const [ms, fb] of [[29.7, 0.8], [37.1, 0.78], [41.1, 0.76], [43.7, 0.74]]) {
    const d = Math.round(ms * SR / 1000);
    const buf = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      buf[i] = input[i] + (i >= d ? buf[i - d] * fb : 0);
      outBuf[i] += buf[i] * 0.25;
    }
  }
  return outBuf;
}

// 噪声上扬，在 end 前 60 ms 停住，让下一记重音的起音清楚。
function riser(dry, startBeat, endBeat, gain, seed) {
  const t0 = startBeat * BEAT, t1 = endBeat * BEAT - 0.06;
  addNoise(dry, t0, t1 - t0, gain, x => x ** 2.5, seed, 5000);
}

// 开场：第 0 帧一记轻的低频心跳，墨滴下落时一声高音水滴；第 1 拍墨滴落地，大重击加水花噪声；
// 墨迹流开时低音持续，第 3 拍起八个字每半拍显影一记短击，“尽”“力”加钟声；第 8 拍八个字立定、
// 第 10 拍炸开各一记大重击，之后上扬推到第 12 拍人名聚成。
function coldOpen(dry, wet) {
  addKick(dry, 0, 0.42);
  addTone(dry, 0, 0.6, [[midi(33), 0.16], [midi(40), 0.04]], 0.002, 0.18);
  addTone(wet, OPEN_DROP_BEAT * BEAT - 0.3, 0.9, [[midi(93), 0.03], [midi(93) * 1.5, 0.008]], 0.004, 0.2);
  addTone(dry, OPEN_DROP_BEAT * BEAT, (OPEN_SNAP_BEAT - OPEN_DROP_BEAT) * BEAT + 0.05, [[midi(33), 0.05], [midi(40), 0.022]], 0.02, 100);
  for (const [beat, wash, seed] of [[OPEN_DROP_BEAT, 1.6, 401], [OPEN_STAND_BEAT, 0.8, 402], [OPEN_BURST_BEAT, 1.4, 403]]) {
    const t = beat * BEAT;
    addKick(dry, t, 0.66);
    addTone(dry, t, 1.2, [[midi(33), 0.22], [midi(21), 0.12]], 0.002, 0.3);
    addNoise(dry, t, wash, 0.36, x => Math.exp(-x * 4), seed, 3500);
    addTone(wet, t, 2, [[midi(69), 0.1], [midi(69) * 2.76, 0.03], [midi(69) * 5.4, 0.01]], 0.002, 0.6);
  }
  // 墨迹沿晶格流开：一段缓慢起伏的低通噪声，停在第一个字显影前
  addNoise(dry, OPEN_DROP_BEAT * BEAT + 0.4, (OPEN_REVEAL_BEAT - OPEN_DROP_BEAT) * BEAT - 0.46, 0.12, x => Math.sin(Math.PI * x) ** 2, 420, 1200);
  for (let i = 0; i < 8; i++) {
    const t = (OPEN_REVEAL_BEAT + i * OPEN_REVEAL_STEP) * BEAT;
    const key = i >= 6;
    addKick(dry, t, key ? 0.55 : 0.45);
    addTone(dry, t, 0.5, [[midi(33), 0.18], [midi(45), 0.05]], 0.002, 0.11);
    addNoise(dry, t, 0.06, key ? 0.6 : 0.45, x => Math.exp(-x * 5), 300 + i, 2400);
    addTone(wet, t, 1.2, [[midi(key ? 81 : 76), 0.05], [midi(key ? 81 : 76) * 2.76, 0.012]], 0.002, 0.35);
  }
  riser(dry, OPEN_STAND_BEAT - 1, OPEN_STAND_BEAT, 0.16, 440);
  riser(dry, OPEN_BURST_BEAT + 0.7, OPEN_SNAP_BEAT, 0.22, 450);
}

// 落拍的重音：页面翻转、开场八个字聚成实字、第九页八个字重新聚成。
export const ACCENT_BEATS = [...PAGES.slice(1).map(p => p.beat), OPEN_SNAP_BEAT, PAGES.find(p => p.id === 'creed').beat + CREED_SNAP_BEAT].sort((a, b) => a - b);

export function synthesize() {
  const dry = new Float32Array(N), wet = new Float32Array(N);
  const panL = new Float32Array(N), panR = new Float32Array(N);

  coldOpen(dry, wet);

  for (let beat = 0; beat < BEATS; beat++) {
    const t = beat * BEAT;
    const chord = chordAt(beat);
    const arr = ARR[pageAt(beat).id];
    // 开场重击段不铺和声，人名聚成那一拍起才进钢琴。
    if (beat < OPEN_SNAP_BEAT) continue;
    const bar = beat % 4;
    // 结尾和弦落在片尾页的第一拍（不一定是小节首拍），之前的铺底在它起音时让开。
    if (arr.pad && ((bar === 0 && beat < FINAL_BEAT) || beat === FINAL_BEAT)) {
      const final = beat === FINAL_BEAT;
      const dur = final ? SECONDS - t : Math.min(BEAT * 4, (FINAL_BEAT - beat) * BEAT) + 0.4;
      for (const m of chord) {
        addTone(dry, t, dur, [[midi(m), 0.016 * arr.pad], [midi(m) * 1.004, 0.011 * arr.pad], [midi(m + 12), 0.005 * arr.pad]], 0.5, final ? 6 : 3.2);
      }
    }
    if (arr.keys) {
      const notes = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[1] + 24];
      const m = notes[bar];
      addTone(dry, t, 1.6, [[midi(m), 0.05 * arr.keys], [midi(m) * 2, 0.012 * arr.keys], [midi(m) * 3, 0.004 * arr.keys]], 0.004, 0.55);
      addTone(wet, t, 1.6, [[midi(m), 0.03 * arr.keys]], 0.004, 0.55);
    }
    if (arr.pluck) {
      const pattern = [chord[0] + 12, chord[2] + 12, chord[1] + 24, chord[2] + 12];
      for (const half of [0, 1]) {
        const k = bar * 2 + half;
        const target = k % 2 ? panR : panL;
        addPluck(target, t + half * BEAT / 2, midi(pattern[k % 4]), 0.12 * arr.pluck);
        addPluck(wet, t + half * BEAT / 2, midi(pattern[k % 4]), 0.035 * arr.pluck);
      }
    }
    if (arr.high) {
      const m = [chord[0] + 36, chord[2] + 24, chord[1] + 36, chord[2] + 24][bar];
      addTone(wet, t + BEAT / 2, 0.8, [[midi(m), 0.02 * arr.high]], 0.003, 0.25);
    }
    if (arr.bass) addTone(dry, t, BEAT * 0.92, [[midi(chord[0] - 12), 0.2 * arr.bass], [midi(chord[0]), 0.04 * arr.bass]], 0.008, 0.38);
    if (arr.pulse) addTone(dry, t + BEAT / 2, BEAT * 0.45, [[midi(chord[0] - 12), 0.12], [midi(chord[0] - 24), 0.08]], 0.006, 0.12);
    if (arr.kick && bar % 2 === 0) addKick(dry, t, 0.42 * arr.kick);
    if (arr.hat) addHat(dry, t + BEAT / 2, 0.07 * arr.hat);
  }

  // 翻页：落拍前 0.4 秒纸声渐起，落拍时纸页落下、底鼓与钟声同时起音。
  for (const [i, beat] of ACCENT_BEATS.entries()) {
    const t = beat * BEAT;
    const turn = PAGES.some(p => p.beat === beat);
    if (turn) addNoise(dry, t - 0.4, 0.38, 0.1, x => Math.sin(Math.PI * Math.min(1, x)) ** 2 * x, 900 + i, 3800);
    addNoise(dry, t, 0.07, 0.8, x => Math.exp(-x * 6), 100 + i, 1100);
    addKick(dry, t, 0.62);
    const root = chordAt(beat)[0] + 36;
    addTone(wet, t, 2, [[midi(root), 0.11], [midi(root) * 2.76, 0.03], [midi(root) * 5.4, 0.01]], 0.002, 0.5);
    addTone(dry, t, 1.6, [[midi(root), 0.08], [midi(root) * 2.01, 0.02]], 0.002, 0.4);
  }

  const verb = reverb(wet);
  const left = new Float32Array(N), right = new Float32Array(N);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const fade = Math.min(1, (N - i) / (SR * 2.5), i / (SR * 0.01));
    left[i] = (dry[i] + panL[i] + 0.5 * panR[i] + verb[i]) * fade;
    right[i] = (dry[i] + panR[i] + 0.5 * panL[i] + verb[i] * 0.95) * fade;
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  // 软限幅压住重音的瞬时峰值；AAC 编码后真峰值会比 WAV 高约 2 dB，输出峰值留到约 -3.2 dBFS。
  const drive = 2.9, norm = 0.69 / Math.tanh(drive);
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
