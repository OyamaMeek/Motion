// 成片：多个无头 Chrome 分段逐帧画 Canvas，PNG 经管道交给 ffmpeg 编 H.264，最后拼接并混入 audio.mjs 的配乐（AAC）。
// 用法：node render.mjs                     全片
//      node render.mjs --stills 0,60,150 目录  只输出这些帧的 PNG
//      node render.mjs --scan                 逐帧绘制不编码，只收集渲染错误（文字出画等）
//      node render.mjs --audio                只重做配乐并替换成片音轨
import {spawn, spawnSync} from 'node:child_process';
import {mkdirSync, renameSync, rmSync, statSync, writeFileSync} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openPage} from './browser.mjs';
import {FPS, FRAME_COUNT, SECONDS} from './timeline.js';
import {synthesize, toWav} from './audio.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export const OUT = path.join(here, '输出');
export const VIDEO = path.join(OUT, '泰勒公式.mp4');
const WAV = path.join(OUT, '配乐.wav');
const PARTS = path.join(OUT, '分段');
const WORKERS = Math.max(2, Math.min(8, os.cpus().length - 2));
const LIMIT_MS = 60000;
const X264 = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'animation', '-g', String(FPS * 2), '-pix_fmt', 'yuv420p',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv'];

// 无头 Chrome 在系统睡眠后可能不再返回，单帧超过 60 秒即终止
const timed = (p, n) => Promise.race([p, new Promise((_, fail) => setTimeout(() => fail(new Error(`第 ${n} 帧 60 秒未返回`)), LIMIT_MS).unref())]);

function ranges() {
  const size = Math.ceil(FRAME_COUNT / WORKERS);
  return Array.from({length: WORKERS}, (_, i) => ({from: i * size, to: Math.min(FRAME_COUNT, (i + 1) * size), file: path.join(PARTS, `${i}.mp4`)}));
}

async function withPage(fn) {
  const page = await openPage();
  try { return await fn(page); } finally { await page.close(); }
}

async function encodeRange(page, {from, to, file}) {
  const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', ...X264, '-r', String(FPS), file], {stdio: ['pipe', 'inherit', 'inherit']});
  const done = new Promise((ok, fail) => ff.once('exit', c => (c === 0 ? ok() : fail(new Error(`ffmpeg 退出 ${c}`)))));
  for (let n = from; n < to; n++) {
    const png = await timed(page.evaluate(`(film.frame(${n}), film.png())`), n);
    if (!ff.stdin.write(Buffer.from(png, 'base64'))) await new Promise(ok => ff.stdin.once('drain', ok));
    if (n % 300 === 0) console.log(`帧 ${n}`);
  }
  ff.stdin.end();
  await done;
  return page.evaluate('film.errors');
}

function mux(video, out) {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...video, '-i', WAV, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
    '-map_metadata', '-1', '-movflags', '+faststart', '-t', String(SECONDS), out], {stdio: 'inherit'});
  if (r.status !== 0) throw new Error(`封装失败 ${r.status}`);
}

async function full() {
  const t0 = Date.now();
  rmSync(PARTS, {recursive: true, force: true});
  mkdirSync(PARTS, {recursive: true});
  writeFileSync(WAV, toWav(synthesize()));
  const segs = ranges();
  const errors = (await Promise.all(segs.map(s => withPage(p => encodeRange(p, s))))).flat();
  if (errors.length) throw new Error(`渲染错误 ${errors.length} 条：\n${errors.slice(0, 40).join('\n')}`);
  const list = path.join(PARTS, 'list.txt');
  writeFileSync(list, segs.map(s => `file '${path.basename(s.file)}'`).join('\n') + '\n');
  mux(['-f', 'concat', '-safe', '0', '-i', list], VIDEO);
  rmSync(PARTS, {recursive: true, force: true});
  const info = {frames: FRAME_COUNT, workers: WORKERS, megabytes: Number((statSync(VIDEO).size / 2 ** 20).toFixed(1)), seconds: Math.round((Date.now() - t0) / 1000)};
  writeFileSync(path.join(OUT, '渲染结果.json'), JSON.stringify(info, null, 2) + '\n');
  console.log(JSON.stringify(info));
}

async function scan() {
  const t0 = Date.now();
  const errors = (await Promise.all(ranges().map(s => withPage(async p => {
    for (let n = s.from; n < s.to; n++) await timed(p.evaluate(`film.frame(${n})`), n);
    return p.evaluate('film.errors');
  })))).flat();
  console.log(JSON.stringify({frames: FRAME_COUNT, errors: errors.length, seconds: Math.round((Date.now() - t0) / 1000)}));
  for (const e of errors.slice(0, 80)) console.log(e);
  if (errors.length) process.exit(1);
}

async function stills(frames, dir) {
  mkdirSync(dir, {recursive: true});
  const errors = await withPage(async p => {
    for (const n of frames) writeFileSync(path.join(dir, `f${String(n).padStart(4, '0')}.png`), Buffer.from(await p.evaluate(`(film.frame(${n}), film.png())`), 'base64'));
    return p.evaluate('film.errors');
  });
  for (const e of errors) console.log(e);
  if (errors.length) process.exit(1);
}

function audioOnly() {
  writeFileSync(WAV, toWav(synthesize()));
  const tmp = path.join(OUT, '换音轨.mp4');
  mux(['-i', VIDEO], tmp);
  renameSync(tmp, VIDEO);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [mode, a, b] = process.argv.slice(2);
  mkdirSync(OUT, {recursive: true});
  if (mode === '--stills') await stills(a.split(',').map(Number), path.resolve(b));
  else if (mode === '--scan') await scan();
  else if (mode === '--audio') audioOnly();
  else await full();
}
