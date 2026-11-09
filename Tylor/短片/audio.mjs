// 配乐 = bgm.mp3（变速不变调到 120 BPM，第一小节首拍对上成片第 0 拍，整首不剪）+ 代码合成的“精密仪器”层。
// 合成层：每个重音一记次低音下沉 + 钟表滴答 + 和弦根音上的 FM 玻璃钟；各场景各有自己的声音
// （开场逐阶上行的钟声、放大时的上扬音、指数落下的滑音、转轮的棘轮声、粒子的碎钟、翻牌声、方块的木块声）。
// bgm 经旁链压低，让重音在前；母带软限幅。
// 用法：node audio.mjs 输出.wav
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {BPM, HIT_BEATS, KEYS, SAMPLE_RATE as SR, SCENES, SECONDS, CUT_BEATS} from './timeline.js';
import {GROW_N} from './math.js';
import {REEL} from './reel.js';

const here = path.dirname(fileURLToPath(import.meta.url));
export const BGM_FILE = path.resolve(here, '../../bgm.mp3');
export const BGM = JSON.parse(readFileSync(path.join(here, 'bgm.json'), 'utf8'));
const BEAT = 60 / BPM;
export const BGM_STRETCH = BGM.period / BEAT;
// bgm 拍号 [from, to) 放到成片拍号 at 起；整首不剪
export const BGM_SEGMENTS = [{from: 0, to: null, at: 0}];
export const bgmBeatAt = filmBeat => filmBeat;
const N = SR * SECONDS;
const at = (id, b) => (SCENES.find(s => s.id === id).beat + b) * BEAT;
const hz = m => 440 * 2 ** ((m - 69) / 12);
// F 小调自然音阶（MIDI，F4 起）
const SCALE = [65, 67, 68, 70, 72, 73, 75];
const degree = i => SCALE[((i % 7) + 7) % 7] + 12 * Math.floor(i / 7);
// 成片某一拍时 bgm 当前小节的和弦根音；chroma 偶尔把 Fm 判成 Dm、F，一律按 F
function rootAt(beat) {
  const c = BGM.barChords[Math.min(BGM.barChords.length - 1, Math.max(0, Math.floor(bgmBeatAt(beat) / 4)))];
  return ['Dm', 'F'].includes(c.name) ? 5 : c.root;
}
const above = (pc, base) => base + (((pc - base) % 12) + 12) % 12;

function noiseGen(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 2147483648 - 1; };
}

// 二阶带通（RBJ），给噪声塑形；set 可在运行中改中心频率而保留滤波器状态
function bandpass(f, q) {
  let b0, b2, a1, a2, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const run = x => { const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
  run.set = freq => {
    const w = 2 * Math.PI * freq / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al;
    b0 = al / a0; b2 = -al / a0; a1 = -2 * Math.cos(w) / a0; a2 = (1 - al) / a0;
  };
  run.set(f);
  return run;
}

class Bus {
  constructor() { this.l = new Float32Array(N); this.r = new Float32Array(N); }
  add(i, v, pan = 0) { if (i >= 0 && i < N) { this.l[i] += v * (1 - Math.max(0, pan)); this.r[i] += v * (1 + Math.min(0, pan)); } }
}

// 次低音下沉：90 Hz 落到 38 Hz，1 ms 起音
function sub(bus, t, g, len = 0.7) {
  const s = Math.round(t * SR);
  let ph = 0;
  for (let i = 0; i < len * SR; i++) {
    const x = i / SR;
    ph += 2 * Math.PI * (38 + 52 * Math.exp(-x / 0.06)) / SR;
    bus.add(s + i, g * Math.sin(ph) * Math.min(1, i / 48) * Math.exp(-x / (len * 0.4)));
  }
}

// 钟表滴答：4 ms 噪声经 7 kHz 窄带通
function tick(bus, t, g, f = 7000, pan = 0, seed = 1) {
  const s = Math.round(t * SR), n = noiseGen(seed + s), bp = bandpass(f, 6);
  // 0.5 ms 起音斜坡，避免相邻采样的大跳变
  for (let i = 0; i < 0.03 * SR; i++) bus.add(s + i, g * 6 * bp(n() * Math.exp(-i / (0.004 * SR)) * Math.min(1, i / 24)), pan);
}

// FM 玻璃钟：调制比 3.5，调制指数随时间衰减
function bell(bus, t, f, g, decay = 1.2, pan = 0) {
  const s = Math.round(t * SR);
  for (let i = 0; i < decay * 3 * SR; i++) {
    const x = i / SR, idx = 2.6 * Math.exp(-x / 0.25);
    const v = Math.sin(2 * Math.PI * f * x + idx * Math.sin(2 * Math.PI * f * 3.5 * x));
    bus.add(s + i, g * v * Math.min(1, i / 24) * Math.exp(-x / decay), pan);
  }
}

// 滑音：正弦从 f0 指数滑到 f1
function glide(bus, t, dur, f0, f1, g, pan = 0) {
  const s = Math.round(t * SR);
  let ph = 0;
  for (let i = 0; i < dur * SR; i++) {
    const q = i / (dur * SR);
    ph += 2 * Math.PI * f0 * (f1 / f0) ** q / SR;
    bus.add(s + i, g * Math.sin(ph) * Math.sin(Math.PI * Math.min(1, q * 1.15)) ** 2, pan);
  }
}

// 噪声扫频：带通中心 f0→f1，shape 给包络；用于呼啸、涌起
function sweep(bus, t, dur, f0, f1, g, shape, seed, pan = 0) {
  const s = Math.round(t * SR), n = noiseGen(seed);
  const bp = bandpass(f0, 1.4);
  for (let i = 0; i < dur * SR; i++) {
    const q = i / (dur * SR);
    if (i % 32 === 0) bp.set(f0 * (f1 / f0) ** q);
    bus.add(s + i, g * bp(n()) * shape(q), pan);
  }
}
// 反向涌起：在 t1 前 12 ms 戛然而止，让切点的重音干净
const swell = (bus, t1, beats, g, seed) => sweep(bus, t1 - beats * BEAT, beats * BEAT - 0.012, 300, 5000, g, q => q ** 3, seed);

// 木块：两个非谐泛音的短促正弦加一点噪声
function block(bus, t, f, g, pan = 0) {
  const s = Math.round(t * SR), n = noiseGen(s);
  for (let i = 0; i < 0.25 * SR; i++) {
    const x = i / SR;
    const v = Math.sin(2 * Math.PI * f * x) * Math.exp(-x / 0.05) + 0.5 * Math.sin(2 * Math.PI * f * 2.71 * x) * Math.exp(-x / 0.02) + 0.3 * n() * Math.exp(-x / 0.003);
    bus.add(s + i, g * v * Math.min(1, i / 16), pan);
  }
}

// 翻牌：两下相隔 22 ms 的低沉噪声
function flap(bus, t, g) {
  for (const [d, k] of [[0, 1], [0.022, 0.7]]) {
    const s = Math.round((t + d) * SR), n = noiseGen(s), bp = bandpass(1800, 2);
    for (let i = 0; i < 0.02 * SR; i++) bus.add(s + i, g * k * 4 * bp(n() * Math.exp(-i / (0.003 * SR))));
  }
}

// 失谐锯齿铺底，经一阶低通，缓起缓收
function pad(bus, t, dur, notes, g, cutoff = 1400) {
  const s = Math.round(t * SR), len = Math.round(dur * SR);
  const a = Math.exp(-2 * Math.PI * cutoff / SR);
  const osc = notes.flatMap((m, j) => [0.995, 1.005].map((d, k) => ({f: hz(m) * d, ph: ((j * 2 + k) * 0.37) % 1})));
  let lp = 0;
  for (let i = 0; i < len; i++) {
    let v = 0;
    for (const o of osc) { o.ph = (o.ph + o.f / SR) % 1; v += 2 * o.ph - 1; }
    lp = (1 - a) * v + a * lp;
    const env = Math.min(1, i / (0.04 * SR)) * Math.min(1, (len - i) / (0.4 * SR)) * Math.exp(-i / SR / (dur * 0.8));
    bus.add(s + i, g * lp * env / osc.length);
  }
}

// Schroeder 混响：4 个并联梳状 + 2 个串联全通
function reverb(input) {
  const out = new Float32Array(N);
  for (const [ms, fb] of [[29.7, 0.84], [37.1, 0.83], [41.1, 0.82], [43.7, 0.81]]) {
    const d = Math.round(ms * SR / 1000), buf = new Float32Array(N);
    let damp = 0;
    for (let i = 0; i < N; i++) {
      const y = i >= d ? buf[i - d] : 0;
      damp = 0.55 * y + 0.45 * damp;
      buf[i] = input[i] + fb * damp;
      out[i] += y * 0.25;
    }
  }
  for (const ms of [5, 1.7]) {
    const d = Math.round(ms * SR / 1000), buf = Float32Array.from(out);
    for (let i = 0; i < N; i++) out[i] = -0.7 * buf[i] + (i >= d ? buf[i - d] + 0.7 * out[i - d] : 0);
  }
  return out;
}

// 重音：次低音 + 滴答 + 根音玻璃钟。size 区分大小
function accent(dry, wet, beat, size, seed) {
  const t = beat * BEAT, pc = rootAt(beat);
  sub(dry, t, 0.9 * size);
  tick(dry, t, 0.2 * size, 4200, 0, seed);
  bell(wet, t, hz(above(pc, 77)), 0.06 * size, 0.9);
  bell(dry, t, hz(above(pc, 53)), 0.05 * size, 0.6);
}

// 合成层单轨（混入 bgm 之前）：重音的起音时间在这一轨上单独检查
export function synthStem() {
  const dry = new Bus(), wet = new Bus();
  const K = KEYS;

  // 全片底层：每个场景以十六分音符的滴答垫着，强拍稍重，左右交替；开场 4 拍前、收尾最后一句不垫
  for (const s of SCENES) {
    if (['maclaurin'].includes(s.id)) continue;
    const from = s.id === 'overture' ? K.overture.grow[0] : 0, to = s.id === 'finale' ? K.finale.final : s.beats;
    for (let q = from * 4; q < to * 4; q++) {
      const t = (s.beat + q / 4) * BEAT;
      tick(dry, t, q % 4 === 0 ? 0.07 : 0.035, q % 2 ? 9000 : 7500, q % 2 ? 0.5 : -0.5, q);
    }
  }

  // 开场：第 0 拍大重击加冲击环的噪声；笔头画曲线的呼啸；逐阶取导数时钟声沿音阶上行
  const O = K.overture;
  sweep(dry, at('overture', 0), 0.9, 6000, 400, 0.5, q => Math.exp(-q * 4), 3);
  sweep(dry, at('overture', 0.05), 1.4, 800, 3000, 0.16, q => Math.sin(Math.PI * q), 4, -0.3);
  O.grow.forEach((b, i) => {
    bell(wet, at('overture', b), hz(degree(i)), 0.11, 1.4, i % 2 ? 0.4 : -0.4);
    bell(dry, at('overture', b), hz(degree(i) + 12), 0.03, 0.4);
  });
  swell(dry, at('overture', O.title), 2, 0.3, 5);
  pad(dry, at('overture', O.title), 8 * BEAT, [41, 48, 53, 56, 60], 0.5, 1100);
  swell(dry, at('tangent', 0), 4, 0.32, 6);

  // 切线：放大时一条上扬的正弦；每过一个十倍一声钟；急退时向下的呼啸
  glide(dry, at('tangent', K.tangent.near), (K.tangent.straight - K.tangent.near) * BEAT - 0.02, 220, 1760, 0.06);
  [4.67, 7.33, 10].forEach((b, i) => bell(wet, at('tangent', b), hz(degree(7 + 2 * i)), 0.07, 1));
  sweep(dry, at('tangent', K.tangent.back), BEAT * 1.1, 5000, 300, 0.4, q => Math.sin(Math.PI * q) ** 0.5, 7);

  // 系数：指数落下的滑音，落地一声木块；字符重排的呼啸
  K.coeff.drops.forEach((b, i) => {
    // 滑音在落地前 30 ms 停住，木块的起音才干净
    glide(dry, at('coeff', b) - 0.32, 0.29, 1400 - 200 * i, 330, 0.07);
    block(dry, at('coeff', b), hz(degree(4 - i)), 0.26);
  });
  pad(wet, at('coeff', K.coeff.fact), 3 * BEAT, [65, 68, 72], 0.25, 2500);
  for (let i = 0; i < 4; i++) sweep(dry, at('coeff', K.coeff.only) + i * 0.09, 0.5, 2500, 200, 0.12, q => Math.exp(-q * 3), 20 + i, i % 2 ? 0.5 : -0.5);
  sweep(dry, at('coeff', K.coeff.solve), 2 * BEAT, 500, 4000, 0.15, q => Math.sin(Math.PI * q), 8);

  // 泰勒多项式：每升一阶一声钟（主和弦琶音上行），形变时轻呼啸
  K.poly.orders.forEach((b, i) => {
    bell(wet, at('poly', b), hz(degree([0, 2, 4, 7, 9, 11, 14][i])), 0.1, 1.3, i % 2 ? 0.35 : -0.35);
    sweep(dry, at('poly', b) - 0.05, 0.6, 600, 2400, 0.08, q => Math.sin(Math.PI * q), 30 + i);
  });

  // 佩亚诺：显微镜推进时向下的长滑音；穿过每一层的呼啸；到 0 之前涌起
  glide(dry, at('peano', 0.5), 11 * BEAT, 900, 140, 0.05);
  K.peano.planes.forEach((b, i) => sweep(dry, at('peano', b) - 0.35, 0.7, 500, 6000, 0.3, q => Math.sin(Math.PI * q) ** 2, 40 + i, i % 2 ? 0.4 : -0.4));
  swell(dry, at('peano', K.peano.zero), 2, 0.25, 45);

  // 麦克劳林：转轮每过一格一声棘轮，停住时翻牌声
  for (const t of REEL.ticks()) tick(dry, at('maclaurin', 0) + t * BEAT, 0.2, 3800, 0, Math.round(t * 1000));
  for (const b of K.maclaurin.faces) flap(dry, at('maclaurin', b), 0.5);
  pad(wet, at('maclaurin', 0), 32 * BEAT, [53, 60, 65], 0.12, 900);

  // 求极限：抵消时的噪声炸开与碎钟；聚合前涌起
  for (const b of K.limit.cancel) {
    sweep(dry, at('limit', b), 0.6, 7000, 900, 0.4, q => Math.exp(-q * 6), 50 + b);
    for (let j = 0; j < 14; j++) bell(wet, at('limit', b) + 0.02 + j * 0.035, hz(degree(7 + ((j * 5) % 9))), 0.02, 0.25, (j % 3 - 1) * 0.6);
  }
  swell(dry, at('limit', K.limit.left), 2, 0.25, 55);

  // 拉格朗日型余项：翻牌、折叠
  flap(dry, at('lagrange', K.lagrange.flap), 0.7);
  for (const d of [1, 2, 3]) flap(dry, at('lagrange', K.lagrange.fold + d), 0.5);
  swell(dry, at('lagrange', K.lagrange.mvt), 2, 0.2, 60);

  // 算 e：每块落下一声木块，块越小音越高越轻；放大镜一声玻璃钟
  K.euler.blocks.forEach((b, i) => block(dry, at('euler', b), hz(degree(i) - 12), 0.34 * 0.86 ** i, i % 2 ? 0.3 : -0.3));
  bell(wet, at('euler', K.euler.loupe), hz(89), 0.08, 1.6);

  // 误差范围：括号张开的短上扬
  K.range.m.forEach((b, i) => glide(dry, at('range', b) - 0.25, 0.25, 300 * (i + 1), 900 * (i + 1), 0.06));
  swell(dry, at('finale', 0), 2, 0.25, 70);

  // 收尾：碎片归位的呼啸；两行结论的铺底；最后一拍 F 小调主和弦
  for (let i = 0; i < 6; i++) sweep(dry, at('finale', 0.4 + i), 0.8, 4000, 500, 0.12, q => Math.sin(Math.PI * q), 80 + i, (i % 2 ? 1 : -1) * 0.5);
  pad(dry, at('finale', K.finale.one), 6 * BEAT, [41, 48, 53, 56, 60], 0.4, 1200);
  pad(dry, at('finale', K.finale.final), SECONDS - at('finale', K.finale.final), [41, 48, 53, 56, 60, 65], 0.45, 900);
  for (const m of [65, 68, 72, 77]) bell(wet, at('finale', K.finale.final), hz(m), 0.05, 2.5);

  const bigBeats = new Set([0, ...CUT_BEATS, SCENES[0].beat + O.title, SCENES.at(-1).beat + K.finale.final]);
  HIT_BEATS.forEach((b, i) => accent(dry, wet, b, bigBeats.has(b) ? 1 : 0.55, 100 + i));

  const verbL = reverb(wet.l), verbR = reverb(wet.r);
  const l = new Float32Array(N), r = new Float32Array(N);
  for (let i = 0; i < N; i++) { l[i] = dry.l[i] + wet.l[i] * 0.6 + verbL[i]; r[i] = dry.r[i] + wet.r[i] * 0.6 + verbR[i] * 0.95; }
  return {left: l, right: r};
}

// bgm：变速不变调到 120 BPM、48 kHz，第一小节首拍放到 0 秒
export function loadBgm() {
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', BGM_FILE, '-af', `atempo=${BGM_STRETCH}`, '-ar', String(SR), '-ac', '2', '-f', 'f32le', '-'], {maxBuffer: 2 ** 31});
  if (r.status !== 0) throw new Error(`bgm 解码失败 ${r.status}: ${r.stderr}`);
  const src = new Float32Array(r.stdout.buffer, r.stdout.byteOffset, r.stdout.length / 4);
  const offset = Math.round(BGM.firstBar / BGM_STRETCH * SR);
  const left = new Float32Array(N), right = new Float32Array(N);
  for (let i = 0; i < N && 2 * (i + offset) + 1 < src.length; i++) {
    left[i] = src[2 * (i + offset)];
    right[i] = src[2 * (i + offset) + 1];
  }
  return {left, right};
}

// 旁链：每个重音处 bgm 压低到 duck，280 ms 内回到 1
function duckCurve() {
  const g = new Float32Array(N).fill(1);
  for (const b of HIT_BEATS) {
    const s = Math.round(b * BEAT * SR), pre = Math.round(0.012 * SR);
    const depth = CUT_BEATS.includes(b) || b === 0 ? 0.35 : 0.6;
    for (let i = -pre; i < 0.28 * SR; i++) {
      const v = i < 0 ? 1 - (1 - depth) * (i + pre) / pre : depth + (1 - depth) * (i / (0.28 * SR)) ** 2;
      if (s + i >= 0 && s + i < N) g[s + i] = Math.min(g[s + i], v);
    }
  }
  return g;
}

export const MASTER = {synth: 0.8, bgm: 1.25, drive: 1.8, out: 0.78};

export function synthesize() {
  const syn = synthStem(), bgm = loadBgm(), duck = duckCurve();
  const intro = KEYS.overture.title * BEAT;
  const l = new Float32Array(N), r = new Float32Array(N);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    // bgm 在开场前 16 拍压低一半，让橙点与逐阶钟声在前
    const gb = MASTER.bgm * duck[i] * (t < intro ? 0.55 : 1);
    const fade = Math.min(1, (N - i) / (SR * 1.2), i / (SR * 0.003));
    l[i] = (MASTER.synth * syn.left[i] + gb * bgm.left[i]) * fade;
    r[i] = (MASTER.synth * syn.right[i] + gb * bgm.right[i]) * fade;
    peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  }
  const k = MASTER.out / Math.tanh(MASTER.drive);
  for (let i = 0; i < N; i++) { l[i] = Math.tanh(MASTER.drive * l[i] / peak) * k; r[i] = Math.tanh(MASTER.drive * r[i] / peak) * k; }
  return {left: l, right: r};
}

export function toWav({left, right}) {
  const data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left[i])) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right[i])) * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) writeFileSync(process.argv[2], toWav(synthesize()));
