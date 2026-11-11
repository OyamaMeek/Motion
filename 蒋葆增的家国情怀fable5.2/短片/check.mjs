// 检查实际导出的 MP4，并保存抽帧。
//   node check.mjs        结果写到 ../检查/导出检查.json，抽帧写到 ../检查/抽帧/
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { W, H, FPS, FRAMES, FPB, PAGES } from './timeline.js';
import { TURNS, ACCENTS, SR, SPB, BGM } from './audio.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(ROOT, '..', '..');
const WORK = path.join(REPO, '.agent', 'work', '蒋葆增fable');
const MP4 = path.join(ROOT, '输出', '八个字，一生的回答.mp4');
const OUT = path.resolve(ROOT, '..', '检查');
const SHOTS = path.join(OUT, '抽帧');

const results = [];
const record = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? '通过' : '未通过'}  ${name}  ${detail}`);
};
const ff = (args, opt = {}) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', ...args], { maxBuffer: 1 << 30, ...opt });

// ── 1. 封装参数 ──
const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', MP4]).toString());
const v = probe.streams.find((s) => s.codec_type === 'video');
const a = probe.streams.find((s) => s.codec_type === 'audio');
record('视频流', v.codec_name === 'h264' && v.width === W && v.height === H && v.r_frame_rate === `${FPS}/1` && Number(v.nb_read_frames) === FRAMES,
  `${v.codec_name} ${v.width}×${v.height} ${v.r_frame_rate} 帧数 ${v.nb_read_frames} 像素格式 ${v.pix_fmt}`);
record('音频流', a.codec_name === 'aac' && Number(a.sample_rate) === SR && a.channels === 2 && Math.abs(Number(a.duration) - 90) < 0.05,
  `${a.codec_name} ${a.sample_rate} Hz ${a.channels} 声道 ${Number(a.duration).toFixed(3)} 秒`);
record('时长', Math.abs(Number(probe.format.duration) - 90) < 0.05, `${Number(probe.format.duration).toFixed(3)} 秒`);

// ── 2. 画面：逐帧缩小成灰度图，算相邻帧差 ──
const SW = 160;
const SH = 90;
const gray = ff(['-i', MP4, '-vf', `scale=${SW}:${SH},format=gray`, '-f', 'rawvideo', '-']);
const frames = gray.length / (SW * SH);
const diff = new Float64Array(frames);
const flat = [];
for (let f = 0; f < frames; f++) {
  const cur = gray.subarray(f * SW * SH, (f + 1) * SW * SH);
  let min = 255;
  let max = 0;
  for (const p of cur) {
    if (p < min) min = p;
    if (p > max) max = p;
  }
  if (max - min < 6) flat.push(f);
  if (!f) continue;
  const prev = gray.subarray((f - 1) * SW * SH, f * SW * SH);
  let d = 0;
  for (let i = 0; i < cur.length; i++) d += Math.abs(cur[i] - prev[i]);
  diff[f] = d / cur.length;
}
record('解码帧数', frames === FRAMES, `${frames} 帧`);
// 白场转场允许出现接近整屏单色的帧，其他位置不应有空白帧
const allowed = (f) => [780, 2400].some((t) => f >= t - 4 && f <= t + 1);
const blank = flat.filter((f) => !allowed(f));
record('空白帧', blank.length === 0, blank.length ? `第 ${blank.slice(0, 12).join('、')} 帧` : `整屏单色只出现在两次白场转场（${flat.join('、') || '无'}）`);

const turnRows = PAGES.slice(1).map((p) => {
  const f = p.frame;
  let best = f - 3;
  for (let k = f - 3; k <= f + 3; k++) if (diff[k] > diff[best]) best = k;
  const around = [];
  for (let k = f - 3; k <= f + 3; k++) around.push(Number(diff[k].toFixed(2)));
  return { 页: p.index, 标题: p.title, 落拍帧: f, 帧差最大处: best, 帧差: around };
});
const cutMiss = turnRows.filter((r) => r.帧差最大处 !== r.落拍帧);
record('翻页落拍帧', cutMiss.length === 0, cutMiss.length ? cutMiss.map((r) => `第 ${r.页} 页最大帧差在 ${r.帧差最大处}`).join('；') : '13 次翻页的最大帧差都在落拍帧上');

// ── 3. 声音 ──
const pcm = (file, extra = []) => {
  const b = ff(['-i', file, ...extra, '-ac', '2', '-ar', String(SR), '-f', 'f32le', '-']);
  return new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
};
const mix = pcm(MP4);
const n = mix.length / 2;
let peak = 0;
let clipped = 0;
let jump = 0;
for (let i = 0; i < mix.length; i++) {
  const x = Math.abs(mix[i]);
  if (x > peak) peak = x;
  if (x >= 0.999) clipped++;
  if (i >= 2) jump = Math.max(jump, Math.abs(mix[i] - mix[i - 2]));
}
record('音轨长度', Math.abs(n / SR - 90) < 0.05, `${(n / SR).toFixed(3)} 秒`);
record('削波', clipped === 0 && peak < 0.98, `样本峰值 ${peak.toFixed(3)}，达到满幅的采样 ${clipped} 个`);
record('爆音', jump < 0.6, `相邻采样最大跳变 ${jump.toFixed(3)}`);
const rms = [];
for (let s = 0; s < 90; s++) {
  let e = 0;
  for (let i = s * SR * 2; i < (s + 1) * SR * 2; i++) e += mix[i] ** 2;
  rms.push(Math.sqrt(e / (SR * 2)));
}
const quiet = rms.map((r, s) => [s, r]).filter(([s, r]) => r < 0.01 && s < 88);
record('音轨连续', quiet.length === 0, quiet.length ? `第 ${quiet.map((q) => q[0]).join('、')} 秒接近静音` : `逐秒 RMS 最小 ${Math.min(...rms.slice(0, 88)).toFixed(4)}`);

const ebu = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', MP4, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
const lufs = Number(/I:\s+(-?[\d.]+) LUFS/.exec(ebu.slice(ebu.lastIndexOf('Summary')))[1]);
const tp = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(ebu.slice(ebu.lastIndexOf('Summary')))[1]);
record('响度', lufs > -18 && lufs < -13 && tp <= -1, `积分响度 ${lufs} LUFS，真峰值 ${tp} dBFS`);

// 起音位置：在落拍前后 60 ms 内找能量上升最快的 5 ms 窗口
function onset(x, beat, hp = false) {
  const at = Math.round(beat * SPB);
  const win = Math.round(0.005 * SR);
  const e = (i) => {
    let s = 0;
    for (let k = i; k < i + win; k++) {
      const l = x[k * 2] ?? 0;
      const r = x[k * 2 + 1] ?? 0;
      s += l * l + r * r;
    }
    return s;
  };
  let best = 0;
  let bestAt = 0;
  for (let d = -Math.round(0.06 * SR); d <= Math.round(0.06 * SR); d += 24) {
    const rise = e(at + d) - e(at + d - win);
    if (rise > best) {
      best = rise;
      bestAt = d;
    }
  }
  return (bestAt / SR) * 1000;
}
const synthFile = path.join(WORK, '合成层.wav');
const synth = pcm(synthFile);
const synthOff = [...TURNS, ...ACCENTS].map((t) => ({ 拍: t.beat, 偏差毫秒: Number(onset(synth, t.beat).toFixed(1)) }));
const worst = Math.max(...synthOff.map((o) => Math.abs(o.偏差毫秒)));
// 一帧 33.3 毫秒，偏差不超过四分之一帧（8 毫秒）算对上
record('合成层重音对拍', worst <= 8, `翻页与页内重音共 ${synthOff.length} 处，最大偏差 ${worst} 毫秒`);

// 成片上：翻页落拍后 80 ms 的能量与落拍前 80 ms 相比
const ratio = TURNS.map((t) => {
  const at = Math.round(t.beat * SPB);
  const e = (from, to) => {
    let s = 0;
    for (let i = from * 2; i < to * 2; i++) s += mix[i] ** 2;
    return s;
  };
  const w = Math.round(0.08 * SR);
  return { 拍: t.beat, 倍数: Number((e(at, at + w) / Math.max(1e-9, e(at - w, at))).toFixed(2)) };
});
record('成片翻页重音', ratio.every((r) => r.倍数 > 1.5), `落拍后与落拍前能量之比 ${ratio.map((r) => r.倍数).join(' / ')}`);

// bgm 单轨的拍点：把每拍前后 40 ms 的起音包络叠加，看峰值相对拍格的偏移
const bgm = pcm(path.join(WORK, 'bgm单轨.wav'));
{
  const half = Math.round(0.04 * SR);
  const hop = 48;
  const acc = new Float64Array((2 * half) / hop);
  for (let beat = 8; beat < 172; beat++) {
    const at = Math.round(beat * SPB);
    for (let k = 0; k < acc.length; k++) {
      let s = 0;
      const i0 = at - half + k * hop;
      for (let i = i0; i < i0 + hop; i++) s += bgm[i * 2] ** 2 + bgm[i * 2 + 1] ** 2;
      acc[k] += s;
    }
  }
  let rise = 0;
  let riseAt = 0;
  for (let k = 3; k < acc.length; k++) {
    const d = acc[k] - acc[k - 3];
    if (d > rise) {
      rise = d;
      riseAt = k;
    }
  }
  const off = ((riseAt * hop - half) / SR) * 1000;
  record('bgm 对拍', Math.abs(off) <= 15, `拉伸比 ${BGM.ratio.toFixed(6)}，164 拍叠加后的起音相对拍格 ${off.toFixed(1)} 毫秒`);
}

// ── 4. 抽帧 ──
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const grab = (frame, file) => ff(['-y', '-i', MP4, '-vf', `select=eq(n\\,${frame})`, '-frames:v', '1', '-q:v', '2', path.join(SHOTS, file)]);
const shots = [];
for (const p of PAGES) {
  const end = p.endBeat * FPB;
  const picks = [p.frame + Math.round((end - p.frame) * 0.3), p.frame + Math.round((end - p.frame) * 0.62), end - 6];
  picks.forEach((f, k) => {
    const file = `第${String(p.index).padStart(2, '0')}页-${k + 1}-帧${String(f).padStart(4, '0')}.jpg`;
    grab(f, file);
    shots.push({ 页: p.index, 帧: f, 文件: file });
  });
}
// 每次翻页前后各 3 帧，拼成一条
for (const p of PAGES.slice(1)) {
  const file = `翻页-第${String(p.index).padStart(2, '0')}页-帧${p.frame - 3}至${p.frame + 3}.jpg`;
  ff(['-y', '-i', MP4, '-vf', `select=between(n\\,${p.frame - 3}\\,${p.frame + 3}),scale=640:-1,tile=7x1:padding=4:color=red`, '-frames:v', '1', '-q:v', '3', path.join(SHOTS, file)]);
}
grab(0, '开场-帧0000.jpg');
ff(['-y', '-i', MP4, '-filter_complex', 'showwavespic=s=1800x360:colors=0x2A2723', '-frames:v', '1', path.join(OUT, '波形.png')]);
record('抽帧', true, `每页 3 张共 ${shots.length} 张，翻页连续帧 ${PAGES.length - 1} 条，开场第 0 帧 1 张，波形图 1 张`);

fs.writeFileSync(path.join(OUT, '导出检查.json'), JSON.stringify({ 文件: path.relative(REPO, MP4), 结果: results, 翻页帧差: turnRows, 合成层重音: synthOff, 翻页能量比: ratio, 抽帧: shots }, null, 1));
const failed = results.filter((r) => !r.pass);
console.log(failed.length ? `未通过 ${failed.length} 项` : `全部 ${results.length} 项通过`);
if (failed.length) process.exitCode = 1;
