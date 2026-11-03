// 输出成片：无头 Chrome 逐帧画 Canvas，ffmpeg 编码，再混入 music.mjs 合成的配乐。
// 用法：node render.mjs                     全片
//      node render.mjs --stills 0,90,135 目录   只输出指定帧号的 PNG
import {spawn, spawnSync} from 'node:child_process';
import {mkdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openChrome} from '../../會呼吸的痛/開場樣圖/v2/chrome.mjs';
import {FPS, FRAME_COUNT} from './timeline.js';
import {synthesize, toWav} from './music.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(here, '输出');
const PARTS = path.join(OUT_DIR, '分段');
const WAV = path.join(OUT_DIR, '配乐.wav');
const TARGET = path.join(OUT_DIR, '如何在算法时代保持清醒.mp4');
const WORKERS = 3;
const ENCODE = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-threads', '2', '-g', String(FPS), '-bf', '0',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-r', String(FPS)];
const IMAGE = `document.getElementById('stage').toDataURL('image/png').split(',')[1]`;

async function renderSegment(chrome, first, count, file) {
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', ...ENCODE, file], {stdio: ['pipe', 'inherit', 'inherit']});
  const finished = new Promise((ok, fail) => ffmpeg.once('exit', code => (code === 0 ? ok() : fail(new Error(`ffmpeg 退出 ${code}`)))));
  for (let n = first; n < first + count; n++) {
    await chrome.evaluate(`window.film.renderFrame(${n})`);
    const image = Buffer.from(await chrome.evaluate(IMAGE), 'base64');
    if (!ffmpeg.stdin.write(image)) await new Promise(ok => ffmpeg.stdin.once('drain', ok));
  }
  ffmpeg.stdin.end();
  await finished;
  const errors = await chrome.evaluate('window.renderErrors');
  if (errors.length) throw new Error(JSON.stringify(errors));
}

async function renderAll() {
  const started = Date.now();
  rmSync(PARTS, {recursive: true, force: true});
  mkdirSync(PARTS, {recursive: true});
  writeFileSync(WAV, toWav(synthesize()));
  const size = Math.ceil(FRAME_COUNT / WORKERS);
  const segments = Array.from({length: WORKERS}, (_, i) => ({first: i * size, count: Math.min(size, FRAME_COUNT - i * size), file: path.join(PARTS, `part-${i}.mp4`)}));
  await Promise.all(segments.map(async s => {
    const chrome = await openChrome();
    try {
      await chrome.openStyle('film', here);
      await renderSegment(chrome, s.first, s.count, s.file);
    } finally {
      await chrome.close();
    }
  }));
  const list = path.join(PARTS, 'list.txt');
  writeFileSync(list, segments.map(s => `file '${path.basename(s.file)}'`).join('\n') + '\n');
  const mux = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', WAV,
    '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
    '-map_metadata', '-1', '-movflags', '+faststart', '-t', '30', TARGET], {stdio: 'inherit'});
  if (mux.status !== 0) throw new Error(`拼接失败 ${mux.status}`);
  rmSync(PARTS, {recursive: true, force: true});
  const result = {frames: FRAME_COUNT, fps: FPS, megabytes: Number((statSync(TARGET).size / 1048576).toFixed(1)), seconds: Math.round((Date.now() - started) / 1000)};
  writeFileSync(path.join(OUT_DIR, '渲染结果.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
}

async function renderStills(frames, dir) {
  mkdirSync(dir, {recursive: true});
  const chrome = await openChrome();
  try {
    await chrome.openStyle('film', here);
    for (const n of frames) {
      await chrome.evaluate(`window.film.renderFrame(${n})`);
      writeFileSync(path.join(dir, `f${String(n).padStart(3, '0')}.png`), Buffer.from(await chrome.evaluate(IMAGE), 'base64'));
    }
    const errors = await chrome.evaluate('window.renderErrors');
    if (errors.length) throw new Error(JSON.stringify(errors));
  } finally {
    await chrome.close();
  }
}

const args = process.argv.slice(2);
if (args[0] === '--stills') await renderStills(args[1].split(',').map(Number), path.resolve(args[2]));
else await renderAll();
