// 输出成片：背景、角色、道具与歌词在同一张画布上逐帧绘制，音轨直接复制原曲。
// 用法：node render-film.mjs [pixel|paper|crayon]            全片
//      node render-film.mjs [画风] --stills 12.5,40,110 目录   只输出指定秒数的样张
import {spawn} from 'node:child_process';
import {mkdir, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {openChrome} from '../開場樣圖/v2/chrome.mjs';
import {FPS, SONG_SECONDS} from './shots.js';
import {OUTPUTS} from './outputs.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const AUDIO = path.join(here, '../會呼吸的痛.m4a');
const OUT_DIR = path.join(here, '輸出');
const args = process.argv.slice(2);
const style = FPS[args[0]] ? args.shift() : 'pixel';
const output = OUTPUTS[style];
const TARGET = path.join(OUT_DIR, output.video);
const fps = FPS[style], frameCount = Math.ceil(SONG_SECONDS * fps);
const COLORS_EVERY = 12;
const MAX_COLORS = 32;
const ENCODE = {
  pixel: ['-preset', 'slow', '-crf', '14', '-tune', 'animation', '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=neighbor+accurate_rnd+full_chroma_int,format=yuv420p'],
  paper: ['-preset', 'medium', '-crf', '18', '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p'],
  crayon: ['-preset', 'medium', '-crf', '21', '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p'],
}[style];

const COUNT_COLORS = `(() => {
  const c = window.art.native, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, set = new Set();
  for (let k = 0; k < d.length; k += 4) set.add(d[k] * 65536 + d[k + 1] * 256 + d[k + 2]);
  return set.size;
})()`;

function startEncoder() {
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-i', AUDIO,
    '-map', '0:v:0', '-map', '1:a:0', '-map_metadata', '-1', '-c:a', 'copy',
    '-c:v', 'libx264', ...ENCODE, '-g', String(fps * 2),
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(fps), '-movflags', '+faststart', TARGET], {stdio: ['pipe', 'inherit', 'inherit']});
  const finished = new Promise((ok, fail) => ffmpeg.once('exit', code => (code === 0 ? ok() : fail(new Error(`ffmpeg 退出 ${code}`)))));
  return {ffmpeg, finished};
}

const chrome = await openChrome();
try {
  const opened = Date.now();
  await chrome.openStyle(style, here);
  console.log(`画风 ${style} 准备 ${Math.round((Date.now() - opened) / 1000)} 秒`);
  if (style === 'crayon') assert.ok((await chrome.evaluate('window.art.brushes')).includes('wax'), '蜡笔贴图没有使用 p5.brush 的 wax');
  if (args[0] === '--stills') {
    const dir = path.resolve(args[2]);
    await mkdir(dir, {recursive: true});
    for (const t of args[1].split(',').map(Number)) {
      const started = Date.now();
      const png = await chrome.evaluate(`(() => { window.renderFilmFrame(${Math.round(t * fps)}); return window.art.canvas.toDataURL('image/png').split(',')[1]; })()`);
      await writeFile(path.join(dir, `${t.toFixed(2).padStart(7, '0')}.png`), Buffer.from(png, 'base64'));
      console.log(`${t} ${Date.now() - started}ms${style === 'pixel' ? ` colors=${await chrome.evaluate(COUNT_COLORS)}` : ''}`);
    }
  } else {
    await mkdir(OUT_DIR, {recursive: true});
    const started = Date.now();
    const {ffmpeg, finished} = startEncoder();
    let maxColors = 0;
    for (let i = 0; i < frameCount; i++) {
      const png = await chrome.evaluate(`(() => { window.renderFilmFrame(${i}); return window.art.canvas.toDataURL('image/png').split(',')[1]; })()`);
      if (style === 'pixel' && i % COLORS_EVERY === 0) {
        const colors = await chrome.evaluate(COUNT_COLORS);
        assert.ok(colors <= MAX_COLORS, `第 ${i} 帧用了 ${colors} 色`);
        maxColors = Math.max(maxColors, colors);
      }
      if (!ffmpeg.stdin.write(Buffer.from(png, 'base64'))) await new Promise(ok => ffmpeg.stdin.once('drain', ok));
      if (i % 240 === 0) console.log(`帧 ${i}/${frameCount} ${Math.round((Date.now() - started) / 1000)} 秒`);
    }
    ffmpeg.stdin.end();
    await finished;
    assert.deepEqual(await chrome.evaluate('window.renderErrors'), []);
    const size = (await stat(TARGET)).size;
    const result = {frames: frameCount, fps, ...(style === 'pixel' ? {maxColors} : {}), megabytes: Number((size / 1048576).toFixed(1)), seconds: Math.round((Date.now() - started) / 1000)};
    await writeFile(path.join(OUT_DIR, output.renderReport), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  }
  assert.deepEqual(await chrome.evaluate('window.renderErrors'), []);
} finally {
  await chrome.close();
}
