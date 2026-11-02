// 输出成片：背景、角色、道具和歌词都画在同一张画布上，逐帧编码；音轨直接复制原曲。
// 用法：node render-film.mjs                        全片（多个 Chrome 并行，分段编码后拼接）
//      node render-film.mjs --stills 12.5,40 目录    只输出指定秒数的样张
import {spawn, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, renameSync, rmSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openChrome} from '../../會呼吸的痛/開場樣圖/v2/chrome.mjs';
import {FPS, FRAME_COUNT} from './film.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const AUDIO = path.join(here, '../嘉宾.m4a');
const OUT_DIR = path.join(here, '輸出');
const PARTS = path.join(OUT_DIR, '分段');
const TARGET = path.join(OUT_DIR, '嘉宾_MV.mp4');
const SEGMENT_FRAMES = 900;
const WORKERS = 7;
const ENCODE = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-threads', '2', '-g', String(FPS * 2), '-bf', '0',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-r', String(FPS)];
const IMAGE = `window.document.getElementById('stage').toDataURL('image/png').split(',')[1]`;

async function renderSegment(chrome, first, count, file) {
  const temp = `${file}.tmp.mp4`;
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-', ...ENCODE, temp], {stdio: ['pipe', 'inherit', 'inherit']});
  const finished = new Promise((ok, fail) => ffmpeg.once('exit', code => (code === 0 ? ok() : fail(new Error(`ffmpeg 退出 ${code}`)))));
  let image = null;
  // 分段的第一帧之前要把上一帧的缓存清掉：同一 Chrome 会接着渲染不相邻的分段。
  await chrome.evaluate('window.film.resetCache()');
  for (let n = first; n < first + count; n++) {
    const changed = await chrome.evaluate(`window.film.renderFrame(${n})`);
    if (changed || !image) image = Buffer.from(await chrome.evaluate(IMAGE), 'base64');
    if (!ffmpeg.stdin.write(image)) await new Promise(ok => ffmpeg.stdin.once('drain', ok));
  }
  ffmpeg.stdin.end();
  await finished;
  const errors = await chrome.evaluate('window.renderErrors');
  if (errors.length) throw new Error(JSON.stringify(errors));
  renameSync(temp, file);
}

async function renderAll() {
  mkdirSync(PARTS, {recursive: true});
  const segments = [];
  for (let first = 0, i = 0; first < FRAME_COUNT; first += SEGMENT_FRAMES, i++) {
    segments.push({first, count: Math.min(SEGMENT_FRAMES, FRAME_COUNT - first), file: path.join(PARTS, `part-${String(i).padStart(3, '0')}.mp4`)});
  }
  const pending = segments.filter(s => !existsSync(s.file));
  const started = Date.now();
  console.log(`共 ${segments.length} 段，待渲染 ${pending.length} 段`);
  await Promise.all(Array.from({length: WORKERS}, async () => {
    const chrome = await openChrome();
    try {
      await chrome.openStyle('paper', here);
      for (let job = pending.shift(); job; job = pending.shift()) {
        await renderSegment(chrome, job.first, job.count, job.file);
        console.log(`${path.basename(job.file)} 完成，已用 ${Math.round((Date.now() - started) / 1000)} 秒，剩余 ${pending.length} 段待领取`);
      }
    } finally {
      await chrome.close();
    }
  }));
  const list = path.join(PARTS, 'list.txt');
  writeFileSync(list, segments.map(s => `file '${path.basename(s.file)}'`).join('\n') + '\n');
  const mux = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', AUDIO, '-map', '0:v:0', '-map', '1:a:0', '-map_metadata', '-1', '-c', 'copy', '-movflags', '+faststart', TARGET], {stdio: 'inherit'});
  if (mux.status !== 0) throw new Error(`拼接失败 ${mux.status}`);
  const result = {frames: FRAME_COUNT, fps: FPS, megabytes: Number((statSync(TARGET).size / 1048576).toFixed(1)), seconds: Math.round((Date.now() - started) / 1000)};
  writeFileSync(path.join(OUT_DIR, '渲染结果.json'), JSON.stringify(result, null, 2) + '\n');
  rmSync(PARTS, {recursive: true, force: true});
  console.log(JSON.stringify(result));
}

async function renderStills(times, dir) {
  mkdirSync(dir, {recursive: true});
  const chrome = await openChrome();
  try {
    await chrome.openStyle('paper', here);
    for (const t of times) {
      await chrome.evaluate(`window.film.resetCache(); window.film.renderFrame(${Math.round(t * FPS)})`);
      writeFileSync(path.join(dir, `${t.toFixed(2).padStart(7, '0')}.png`), Buffer.from(await chrome.evaluate(IMAGE), 'base64'));
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
