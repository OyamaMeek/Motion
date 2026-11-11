// 配乐：合成层（重音、上扬、钟声、打字声等）全部由下面的代码生成，
// 再混入拉伸到 120 BPM 并按小节剪辑的根目录 bgm.mp3。
//   node audio.mjs        写出 输出/配乐.wav，并在工作目录留下只有合成层的单轨供检查
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BEATS, BPM, FPB, PAGES } from './timeline.js';
import { LINES } from './script.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(ROOT, '..', '..');
const WORK = path.join(REPO, '.agent', 'work', '蒋葆增fable');

export const SR = 48000;
export const SPB = (SR * 60) / BPM;
export const SECONDS = (BEATS * 60) / BPM;
export const N = SR * SECONDS;

// bgm.mp3 的拍点数据由 librosa 测得（112.904 BPM，首个小节起点 0.5387 秒，共 75 小节）。
// 成片 45 小节取 bgm 的三段：前奏到第一段、再现段、结尾四小节。
export const BGM = {
  file: path.join(REPO, 'bgm.mp3'),
  period: 0.5314254092954999,
  firstBar: 0.5387076073684782,
  bars: 75,
  // ffmpeg 解码出的波形比上面的拍点早 20 毫秒（check.mjs 把 164 拍叠加后测得），取样位置相应提前
  decodeLead: 0.02,
  segments: [
    { filmBar: 0, bgmBar: 1, bars: 37 },
    { filmBar: 37, bgmBar: 44, bars: 4 },
    { filmBar: 41, bgmBar: 71, bars: 4 },
  ],
};
BGM.ratio = BGM.period / (60 / BPM);

// 翻页重音。kind：dark 关灯，light 翻亮，soft 同为纸面的翻页。
export const TURNS = PAGES.slice(1).map((p, i) => ({
  beat: p.beat,
  kind: p.tone === '暗场' ? 'dark' : PAGES[i].tone === '暗场' ? 'light' : 'soft',
}));

// 页内的重音（与画面动作同帧）
export const ACCENTS = [
  { beat: 2, what: '墨滴落地' },
  { beat: 18, what: '人名聚成' },
  { beat: 25, what: '“遗训”' },
  { beat: 41, what: '“1930年代”' },
  { beat: 82, what: '文字崩塌' },
  { beat: 94.2, what: '“73”落地' },
  { beat: 120, what: '“第一”印章' },
  { beat: 168, what: '“尽力”变橙' },
  { beat: 176, what: '最后一滴墨' },
];

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });

function put(b, i, v, pan) {
  if (i < 0 || i >= N) return;
  const a = ((pan + 1) * Math.PI) / 4;
  b.L[i] += v * Math.cos(a);
  b.R[i] += v * Math.sin(a);
}

function tone(b, beat, { f0, f1 = f0, dur, amp, pan = 0, attack = 0.003, curve = 4, harm = 0 }) {
  const s0 = Math.round(beat * SPB);
  const n = Math.round(dur * SR);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    ph += (2 * Math.PI * f0 * Math.pow(f1 / f0, t)) / SR;
    const env = Math.min(1, i / (attack * SR)) * Math.exp(-curve * t) * Math.min(1, (n - i) / 200);
    put(b, s0 + i, amp * env * (Math.sin(ph) + harm * Math.sin(2 * ph)), pan);
  }
}

function noise(b, beat, { dur, amp, pan = 0, lp0 = 8000, lp1 = lp0, hp = 0, shape = 'decay', curve = 5, seed = 1 }) {
  const s0 = Math.round(beat * SPB);
  const n = Math.round(dur * SR);
  const r = rng(seed + Math.round(beat * 1000));
  let lo = 0;
  let hi = 0;
  const hk = hp ? Math.exp((-2 * Math.PI * hp) / SR) : 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const cut = lp0 * Math.pow(lp1 / lp0, t);
    const k = 1 - Math.exp((-2 * Math.PI * cut) / SR);
    lo += k * (r() * 2 - 1 - lo);
    let v = lo;
    if (hp) {
      hi = hk * hi + (1 - hk) * lo;
      v = lo - hi;
    }
    const env =
      shape === 'decay' ? Math.min(1, i / 60) * Math.exp(-curve * t) : shape === 'swell' ? Math.pow(t, curve) * Math.min(1, (n - i) / 300) : Math.sin(Math.PI * t) ** 2;
    put(b, s0 + i, amp * env * v, pan);
  }
}

function bell(b, beat, freq, amp, dur = 1.8, pan = 0) {
  const s0 = Math.round(beat * SPB);
  const n = Math.round(dur * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const idx = 2.4 * Math.exp(-7 * t);
    const env = Math.min(1, i / 96) * Math.exp((-3.6 * i) / n) * Math.min(1, (n - i) / 400);
    put(b, s0 + i, amp * env * Math.sin(2 * Math.PI * freq * t + idx * Math.sin(2 * Math.PI * freq * 3.01 * t)), pan);
  }
}

function click(b, beat, amp, pan, freq = 3200) {
  tone(b, beat, { f0: freq, f1: freq * 0.6, dur: 0.012, amp, pan, attack: 0.0005, curve: 6 });
}

const NOTE = (semi) => 440 * Math.pow(2, (semi - 9) / 12); // semi：相对 C4 的半音数
const F_MINOR = [5, 8, 12, 15, 17, 20, 24, 29]; // F4 Ab4 C5 Eb5 F5 Ab5 C6 F6

function reverb(wet) {
  const out = bus();
  const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => Math.round((d * SR) / 44100));
  for (const [ch, off] of [['L', 0], ['R', 23]]) {
    const src = wet[ch];
    const dst = out[ch];
    for (const d0 of combs) {
      const d = d0 + off;
      const buf = new Float32Array(d);
      let lp = 0;
      for (let i = 0; i < N; i++) {
        const y = buf[i % d];
        lp = y * 0.72 + lp * 0.28;
        buf[i % d] = src[i] + lp * 0.83;
        dst[i] += y * 0.16;
      }
    }
    for (const d0 of [225, 556]) {
      const d = Math.round((d0 * SR) / 44100) + off;
      const buf = new Float32Array(d);
      for (let i = 0; i < N; i++) {
        const x = dst[i];
        const y = buf[i % d];
        buf[i % d] = x + y * 0.5;
        dst[i] = y - x * 0.5;
      }
    }
  }
  return out;
}

export function synth() {
  const dry = bus();
  const wet = bus();

  // 开场：第 0 帧墨滴的水声，第 2 拍落地
  tone(dry, 0, { f0: 1500, f1: 620, dur: 0.11, amp: 0.3, curve: 3 });
  tone(wet, 0, { f0: 1500, f1: 620, dur: 0.11, amp: 0.25, curve: 3 });
  tone(dry, 0, { f0: 58, dur: 1.0, amp: 0.22, attack: 0.3, curve: 1.2 });
  tone(dry, 2, { f0: 120, f1: 42, dur: 0.75, amp: 0.85, curve: 5, harm: 0.2 });
  noise(dry, 2, { dur: 0.35, amp: 0.5, lp0: 5200, lp1: 900, curve: 7, seed: 3 });
  noise(wet, 2, { dur: 0.3, amp: 0.35, lp0: 7000, lp1: 1500, hp: 900, curve: 6, seed: 4 });
  // 墨迹沿晶格漫开：细碎的滴答
  const rr = rng(77);
  for (let b = 2.5; b < 8; b += 0.25) click(wet, b + (rr() - 0.5) * 0.06, 0.035 + rr() * 0.03, rr() * 1.6 - 0.8, 2400 + rr() * 2600);
  // 八个字逐个显影：钟声沿 F 小调上行
  F_MINOR.forEach((s, i) => {
    const beat = (120 + Math.round(i * 7.5)) / FPB;
    bell(wet, beat, NOTE(s), 0.2, 1.6, (i % 4) * 0.4 - 0.6);
    bell(dry, beat, NOTE(s), 0.12, 0.9, (i % 4) * 0.4 - 0.6);
  });

  // 翻页：前两拍反向噪声上扬，落拍处重音
  for (const t of TURNS) {
    noise(dry, t.beat - 2, { dur: 1.0, amp: t.kind === 'soft' ? 0.1 : 0.17, lp0: 500, lp1: 7000, hp: 300, shape: 'swell', curve: 2.6, seed: 11 });
    tone(dry, t.beat, { f0: 105, f1: 38, dur: 0.8, amp: t.kind === 'soft' ? 0.6 : 0.95, curve: 5, harm: 0.15 });
    noise(dry, t.beat, { dur: 0.22, amp: t.kind === 'soft' ? 0.3 : 0.5, lp0: 6500, lp1: 700, curve: 8, seed: 12 });
    if (t.kind === 'dark') {
      // 关灯：干而短的“咔”，后面留一声低鸣
      click(dry, t.beat, 0.4, 0, 1800);
      noise(dry, t.beat, { dur: 0.05, amp: 0.3, lp0: 6000, hp: 2000, curve: 9, seed: 13 });
      tone(wet, t.beat, { f0: NOTE(-19), dur: 1.6, amp: 0.2, attack: 0.02, curve: 2.2 });
    } else if (t.kind === 'light') {
      // 翻亮：高频的光晕和一组和弦钟声
      noise(wet, t.beat, { dur: 1.2, amp: 0.2, lp0: 12000, lp1: 5000, hp: 4000, curve: 4, seed: 14 });
      bell(wet, t.beat, NOTE(5), 0.15, 2.2, -0.4);
      bell(wet, t.beat, NOTE(12), 0.12, 2.2, 0.4);
      bell(wet, t.beat, NOTE(20), 0.08, 2.2, 0);
    } else {
      bell(wet, t.beat, NOTE(12), 0.1, 1.6, 0);
    }
  }

  // 页内重音
  bell(wet, 18, NOTE(-7), 0.3, 2.6, -0.2);
  bell(wet, 18, NOTE(0), 0.2, 2.6, 0.2);
  tone(dry, 18, { f0: 80, f1: 44, dur: 0.6, amp: 0.5, curve: 5 });
  tone(dry, 25, { f0: 110, f1: 40, dur: 0.7, amp: 0.8, curve: 5, harm: 0.2 });
  noise(dry, 25, { dur: 0.2, amp: 0.4, lp0: 6000, lp1: 800, curve: 8, seed: 21 });
  bell(wet, 25, NOTE(8), 0.16, 2.0, 0.3);
  tone(dry, 41, { f0: 100, f1: 42, dur: 0.6, amp: 0.7, curve: 5 });
  noise(dry, 41, { dur: 0.16, amp: 0.3, lp0: 5000, lp1: 800, curve: 8, seed: 22 });
  // 电子管的低鸣，推进灯丝时变强
  {
    const s0 = Math.round(40 * SPB);
    const n = Math.round(12 * SPB);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const env = Math.min(1, i / (0.5 * SR)) * (0.035 + 0.1 * Math.pow(t, 6)) * Math.min(1, (n - i) / 600);
      const ph = (2 * Math.PI * 87.3 * i) / SR;
      put(dry, s0 + i, env * (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph + 0.4)), 0.3);
    }
  }
  // 清单页：人名立起的轻敲，文件立起的纸声
  for (const b of [52.5, 56.2, 58.2, 58.7, 68.6]) tone(dry, b + 0.45, { f0: 620, f1: 420, dur: 0.06, amp: 0.2, curve: 5, pan: -0.2 });
  for (const b of [63.5, 64.5]) noise(dry, b, { dur: 0.3, amp: 0.2, lp0: 2500, lp1: 6500, hp: 1200, shape: 'bump', seed: 31, pan: 0.3 });
  // 文字崩塌
  tone(dry, 82, { f0: 160, f1: 36, dur: 1.0, amp: 0.7, curve: 3.5, harm: 0.25 });
  noise(dry, 82, { dur: 0.9, amp: 0.3, lp0: 3800, lp1: 300, curve: 3.5, seed: 32 });
  for (let k = 0; k < 22; k++) click(dry, 82 + rr() * 1.6, 0.06 + rr() * 0.08, rr() * 1.4 - 0.7, 900 + rr() * 2200);
  // 电子管逐个点亮
  for (let i = 0; i < 9; i++) {
    bell(wet, 84 + i * 0.5, NOTE(F_MINOR[i % 8] - 12), 0.11, 1.2, i * 0.15 - 0.2);
    tone(dry, 84 + i * 0.5, { f0: 1800, f1: 2400, dur: 0.04, amp: 0.07, curve: 3, pan: i * 0.15 - 0.2 });
  }
  // 年份滚动：越来越密的棘轮声
  for (let b = 90; b < 92; b += 0.125) click(dry, b, 0.09 + (b - 90) * 0.05, 0.1, 1400 + (b - 90) * 500);
  // “73”落地
  tone(dry, 94.2, { f0: 95, f1: 40, dur: 0.6, amp: 0.75, curve: 5, harm: 0.2 });
  noise(dry, 94.2, { dur: 0.15, amp: 0.3, lp0: 4000, lp1: 700, curve: 8, seed: 41 });
  // 58 个点依次落下
  for (let i = 0; i < 58; i++) {
    const beat = (1566 + i * 1.25 + 22) / FPB;
    tone(dry, beat, { f0: 900 + (i % 7) * 140, f1: 700, dur: 0.035, amp: 0.085, curve: 4, pan: 0.5 });
  }
  // 科目卡与印章
  for (const b of [116, 116.5, 117]) noise(dry, b, { dur: 0.28, amp: 0.16, lp0: 2500, lp1: 6500, hp: 1200, shape: 'bump', seed: 51, pan: 0.2 });
  tone(dry, 120, { f0: 130, f1: 40, dur: 0.7, amp: 0.95, curve: 5.5, harm: 0.25 });
  noise(dry, 120, { dur: 0.12, amp: 0.55, lp0: 5000, lp1: 900, curve: 9, seed: 52 });
  // 电路上的光点：十六分音符的琶音
  for (let b = 126; b < 134; b += 0.25) {
    const k = Math.round((b - 126) * 4);
    tone(wet, b, { f0: NOTE(F_MINOR[[0, 2, 4, 2, 1, 3, 5, 3][k % 8]] + 12), dur: 0.09, amp: 0.035, curve: 3, pan: (k % 4) * 0.4 - 0.6 });
  }
  bell(wet, 127, NOTE(17), 0.14, 2.0, 0.3);
  // 针脚：八分音符的拨弦
  for (let b = 137.75; b < 145.5; b += 0.5) tone(dry, b, { f0: 520 + ((b * 2) % 3) * 60, f1: 380, dur: 0.05, amp: 0.1, curve: 4, pan: 0.35 });
  // 无人机升空：缓慢升起的和声
  {
    const s0 = Math.round(148 * SPB);
    const n = Math.round(12 * SPB);
    const freqs = [NOTE(-7), NOTE(0), NOTE(5), NOTE(8), NOTE(12), NOTE(17)];
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const env = Math.pow(Math.min(1, t / 0.75), 2) * 0.03 * Math.min(1, (n - i) / 1200);
      let v = 0;
      freqs.forEach((fq, k) => (v += Math.sin((2 * Math.PI * fq * (1 + 0.0015 * Math.sin(k + i / 9000)) * i) / SR + k)));
      put(wet, s0 + i, env * v, Math.sin(i / 30000) * 0.5);
    }
  }
  // “尽力”变橙
  bell(wet, 168, NOTE(5), 0.22, 2.6, -0.3);
  bell(wet, 168, NOTE(12), 0.18, 2.6, 0.3);
  bell(wet, 168, NOTE(17), 0.12, 2.6, 0);
  tone(dry, 168, { f0: 90, f1: 42, dur: 0.6, amp: 0.6, curve: 5 });
  // 最后一滴墨，呼应开场
  tone(dry, 176, { f0: 1500, f1: 620, dur: 0.11, amp: 0.3, curve: 3 });
  tone(wet, 176, { f0: 1500, f1: 620, dur: 0.11, amp: 0.3, curve: 3 });
  tone(dry, 176, { f0: 100, f1: 44, dur: 0.6, amp: 0.5, curve: 5 });
  bell(wet, 176, NOTE(5), 0.16, 3.2, 0);

  // 逐字出现的打字声
  let side = 1;
  for (const line of Object.values(LINES)) {
    if (!line.per) continue;
    [...line.text].forEach((_, i) => {
      side = -side;
      click(dry, line.at + (i * line.per) / FPB, 0.03, side * 0.25, 2600);
    });
  }

  const rev = reverb(wet);
  for (let i = 0; i < N; i++) {
    dry.L[i] += wet.L[i] * 0.6 + rev.L[i];
    dry.R[i] += wet.R[i] * 0.6 + rev.R[i];
  }
  return dry;
}

// bgm 拉伸到 120 BPM 后的单声道间交错浮点数据
function stretchedBgm() {
  fs.mkdirSync(WORK, { recursive: true });
  const raw = path.join(WORK, 'bgm-120.f32');
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', BGM.file, '-af', `atempo=${BGM.ratio.toFixed(6)}`, '-ar', String(SR), '-ac', '2', '-f', 'f32le', raw]);
  const buf = fs.readFileSync(raw);
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

export function bgmTrack() {
  const src = stretchedBgm();
  const out = bus();
  const barSamples = 4 * SPB;
  const first = (BGM.firstBar / BGM.ratio - BGM.decodeLead) * SR;
  const fade = Math.round(0.03 * SR);
  const lead = Math.round(0.045 * SR); // 接缝放在落拍之前，保留新段的起音
  BGM.segments.forEach((seg, k) => {
    const from = Math.round(seg.filmBar * barSamples) - (k ? lead : 0);
    const to = Math.round((seg.filmBar + seg.bars) * barSamples) - (k + 1 < BGM.segments.length ? lead : 0);
    const offset = Math.round(first + seg.bgmBar * barSamples) - Math.round(seg.filmBar * barSamples);
    for (let i = from - (k ? fade : 0); i < Math.min(N, to + fade); i++) {
      if (i < 0) continue;
      const j = i + offset;
      if (j < 0 || j * 2 + 1 >= src.length) continue;
      let g = 1;
      if (k && i < from) g = (i - (from - fade)) / fade;
      if (k + 1 < BGM.segments.length && i >= to) g = 1 - (i - to) / fade;
      if (!k && i < 240) g = i / 240;
      out.L[i] += src[j * 2] * g;
      out.R[i] += src[j * 2 + 1] * g;
    }
  });
  return out;
}

function wav(file, L, R) {
  const data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), i * 4 + 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(SR, 24);
  head.writeUInt32LE(SR * 4, 28);
  head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([head, data]));
}

export function mixdown() {
  const s = synth();
  const m = bgmTrack();
  // 重音处压低 bgm，让合成层的重音在前
  const duck = new Float32Array(N).fill(1);
  for (const beat of [...TURNS.map((t) => t.beat), ...ACCENTS.map((a) => a.beat)]) {
    const s0 = Math.round(beat * SPB);
    for (let i = -480; i < SR * 0.5; i++) {
      const k = s0 + i;
      if (k < 0 || k >= N) continue;
      const depth = i < 0 ? (i + 480) / 480 : Math.exp((-5 * i) / (SR * 0.5));
      duck[k] = Math.min(duck[k], 1 - 0.5 * depth);
    }
  }
  // 结尾两拍淡出
  const tail = Math.round(2.4 * SPB);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  const bgmGain = 0.62;
  const synthGain = 0.8;
  const GAIN = 2.3; // 限幅前的增益，按成片积分响度约 -15 LUFS 取值
  const CEIL = 0.75;
  for (let i = 0; i < N; i++) {
    const end = Math.min(1, (N - 1 - i) / tail);
    const g = end * end * (3 - 2 * end) * GAIN;
    L[i] = (s.L[i] * synthGain + m.L[i] * bgmGain * duck[i]) * g;
    R[i] = (s.R[i] * synthGain + m.R[i] * bgmGain * duck[i]) * g;
  }
  // 前视限幅：提前 5 毫秒把增益降到位，80 毫秒释放，不产生削波失真
  const look = Math.round(0.005 * SR);
  const need = new Float32Array(N);
  for (let i = 0; i < N; i++) need[i] = Math.min(1, CEIL / Math.max(Math.abs(L[i]), Math.abs(R[i]), 1e-9));
  const held = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let v = 1;
    for (let k = i; k < Math.min(N, i + look); k++) if (need[k] < v) v = need[k];
    held[i] = v;
  }
  const up = 1 - Math.exp(-1 / (0.08 * SR));
  const down = 1 - Math.exp(-1 / (0.0012 * SR));
  let gain = 1;
  let peak = 0;
  for (let i = 0; i < N; i++) {
    gain += (held[i] - gain) * (held[i] < gain ? down : up);
    const g = Math.min(gain, need[i]);
    L[i] *= g;
    R[i] *= g;
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  return { L, R, synth: s, bgm: m, peak };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = path.join(ROOT, '输出');
  fs.mkdirSync(out, { recursive: true });
  const mix = mixdown();
  wav(path.join(out, '配乐.wav'), mix.L, mix.R);
  let sp = 0;
  for (let i = 0; i < N; i++) sp = Math.max(sp, Math.abs(mix.synth.L[i]), Math.abs(mix.synth.R[i]));
  const k = 0.8 / sp;
  wav(path.join(WORK, '合成层.wav'), mix.synth.L.map((v) => v * k), mix.synth.R.map((v) => v * k));
  let bp = 0;
  for (let i = 0; i < N; i++) bp = Math.max(bp, Math.abs(mix.bgm.L[i]), Math.abs(mix.bgm.R[i]));
  wav(path.join(WORK, 'bgm单轨.wav'), mix.bgm.L.map((v) => (v * 0.8) / bp), mix.bgm.R.map((v) => (v * 0.8) / bp));
  console.log(`已写出 ${path.join(out, '配乐.wav')}，${SECONDS} 秒`);
}
