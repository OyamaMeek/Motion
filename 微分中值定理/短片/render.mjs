// 输出成片：无头 Chrome 逐帧画 Canvas，ffmpeg 编码 H.264，再混入 music.mjs 合成的配乐（AAC）。
// 用法：node render.mjs                      全片
//      node render.mjs --stills 0,60,150 目录  只输出指定帧号的 PNG
//      node render.mjs --scan                  逐帧绘制不编码，只收集渲染错误（文字出画等）
//      node render.mjs --audio                 只重新合成配乐并替换成片音轨
import {spawn, spawnSync} from 'node:child_process';
import {mkdirSync, renameSync, rmSync, statSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openChrome} from '../../會呼吸的痛/開場樣圖/v2/chrome.mjs';
import {FPS, FRAME_COUNT, SECONDS} from './timeline.js';
import {synthesize, toWav} from './music.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(here, '输出');
const PARTS = path.join(OUT_DIR, '分段');
const WAV = path.join(OUT_DIR, '配乐.wav');
export const TARGET = path.join(OUT_DIR, '从费马到柯西.mp4');
const WORKERS = Math.max(2, Math.min(7, os.cpus().length - 2));
const ENCODE = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-threads', '2', '-g', String(FPS), '-bf', '0',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-r', String(FPS)];
const IMAGE = `document.getElementById('stage').toDataURL('image/png').split(',')[1]`;
const FRAME_TIMEOUT_MS = 60000;

// 系统睡眠唤醒后无头 Chrome 的读回可能永远不返回，超时即终止渲染
function withTimeout(promise, n) {
  let timer;
  const timeout = new Promise((ok, fail) => { timer = setTimeout(() => fail(new Error(`第 ${n} 帧 ${FRAME_TIMEOUT_MS / 1000} 秒未返回，渲染终止`)), FRAME_TIMEOUT_MS); });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const segments = () => {
  const size = Math.ceil(FRAME_COUNT / WORKERS);
  return Array.from({length: WORKERS}, (_, i) => ({first: i * size, count: Math.min(size, FRAME_COUNT - i * size), file: path.join(PARTS, `part-${i}.mp4`)}));
};

async function withPage(fn) {
  const chrome = await openChrome();
  try {
    await chrome.openStyle('film', here);
    return await fn(chrome);
  } finally {
    await chrome.close();
  }
}

async function renderSegment(chrome, first, count, file) {
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', ...ENCODE, file], {stdio: ['pipe', 'inherit', 'inherit']});
  const finished = new Promise((ok, fail) => ffmpeg.once('exit', code => (code === 0 ? ok() : fail(new Error(`ffmpeg 退出 ${code}`)))));
  for (let n = first; n < first + count; n++) {
    await withTimeout(chrome.evaluate(`window.film.renderFrame(${n})`), n);
    const image = Buffer.from(await withTimeout(chrome.evaluate(IMAGE), n), 'base64');
    if (!ffmpeg.stdin.write(image)) await new Promise(ok => ffmpeg.stdin.once('drain', ok));
  }
  ffmpeg.stdin.end();
  await finished;
  return chrome.evaluate('window.renderErrors');
}

async function renderAll() {
  const started = Date.now();
  rmSync(PARTS, {recursive: true, force: true});
  mkdirSync(PARTS, {recursive: true});
  writeFileSync(WAV, toWav(synthesize()));
  const segs = segments();
  const errors = (await Promise.all(segs.map(s => withPage(chrome => renderSegment(chrome, s.first, s.count, s.file))))).flat();
  if (errors.length) throw new Error(`渲染错误 ${errors.length} 条：\n${errors.slice(0, 40).join('\n')}`);
  const list = path.join(PARTS, 'list.txt');
  writeFileSync(list, segs.map(s => `file '${path.basename(s.file)}'`).join('\n') + '\n');
  const mux = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', WAV,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
    '-map_metadata', '-1', '-movflags', '+faststart', '-t', String(SECONDS), TARGET], {stdio: 'inherit'});
  if (mux.status !== 0) throw new Error(`拼接失败 ${mux.status}`);
  rmSync(PARTS, {recursive: true, force: true});
  const result = {frames: FRAME_COUNT, fps: FPS, workers: WORKERS, megabytes: Number((statSync(TARGET).size / 1048576).toFixed(1)), seconds: Math.round((Date.now() - started) / 1000)};
  writeFileSync(path.join(OUT_DIR, '渲染结果.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
}

async function scan() {
  const started = Date.now();
  const errors = (await Promise.all(segments().map(s => withPage(async chrome => {
    for (let n = s.first; n < s.first + s.count; n++) await withTimeout(chrome.evaluate(`window.film.renderFrame(${n})`), n);
    return chrome.evaluate('window.renderErrors');
  })))).flat();
  console.log(JSON.stringify({frames: FRAME_COUNT, errors: errors.length, seconds: Math.round((Date.now() - started) / 1000)}));
  for (const e of errors.slice(0, 60)) console.log(e);
  if (errors.length) process.exit(1);
}

async function renderStills(frames, dir) {
  mkdirSync(dir, {recursive: true});
  const errors = await withPage(async chrome => {
    for (const n of frames) {
      await chrome.evaluate(`window.film.renderFrame(${n})`);
      writeFileSync(path.join(dir, `f${String(n).padStart(4, '0')}.png`), Buffer.from(await chrome.evaluate(IMAGE), 'base64'));
    }
    return chrome.evaluate('window.renderErrors');
  });
  for (const e of errors) console.log(e);
  if (errors.length) process.exit(1);
}

// 只改配乐时：重新合成 WAV，复制成片的视频流，换上新的 AAC 音轨。
function remuxAudio() {
  writeFileSync(WAV, toWav(synthesize()));
  const tmp = path.join(OUT_DIR, '换音轨.mp4');
  const mux = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', TARGET, '-i', WAV, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-map_metadata', '-1', '-movflags', '+faststart', '-t', String(SECONDS), tmp], {stdio: 'inherit'});
  if (mux.status !== 0) throw new Error(`换音轨失败 ${mux.status}`);
  renameSync(tmp, TARGET);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  mkdirSync(OUT_DIR, {recursive: true});
  if (args[0] === '--stills') await renderStills(args[1].split(',').map(Number), path.resolve(args[2]));
  else if (args[0] === '--scan') await scan();
  else if (args[0] === '--audio') remuxAudio();
  else await renderAll();
}
