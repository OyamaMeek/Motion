// 输出成片：背景、角色、道具与歌词在同一张画布上逐帧绘制，音轨直接复制原曲。
// 用法：node render-film.mjs            全片
//      node render-film.mjs --stills 12.5,40,110 目录   只输出指定秒数的样张
import {spawn} from 'node:child_process';
import {mkdir, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {openChrome} from '../開場樣圖/v2/chrome.mjs';
import {FPS, SONG_SECONDS} from './shots.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const AUDIO = path.join(here, '../會呼吸的痛.m4a');
const OUT_DIR = path.join(here, '輸出');
const TARGET = path.join(OUT_DIR, '會呼吸的痛_MV.mp4');
const fps = FPS.pixel, frameCount = Math.ceil(SONG_SECONDS * fps);
const COLORS_EVERY = 12;
const MAX_COLORS = 32;

const COUNT_COLORS = `(() => {
  const c = window.art.native, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, set = new Set();
  for (let k = 0; k < d.length; k += 4) set.add(d[k] * 65536 + d[k + 1] * 256 + d[k + 2]);
  return set.size;
})()`;

function startEncoder() {
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-i', AUDIO,
    '-map', '0:v:0', '-map', '1:a:0', '-map_metadata', '-1', '-c:a', 'copy',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-tune', 'animation', '-g', String(fps * 2),
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=neighbor+accurate_rnd+full_chroma_int,format=yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-r', String(fps), '-movflags', '+faststart', TARGET], {stdio: ['pipe', 'inherit', 'inherit']});
  const finished = new Promise((ok, fail) => ffmpeg.once('exit', code => (code === 0 ? ok() : fail(new Error(`ffmpeg 退出 ${code}`)))));
  return {ffmpeg, finished};
}

const chrome = await openChrome();
try {
  await chrome.openStyle('film', here);
  if (process.argv[2] === '--stills') {
    const dir = path.resolve(process.argv[4]);
    await mkdir(dir, {recursive: true});
    for (const t of process.argv[3].split(',').map(Number)) {
      const png = await chrome.evaluate(`(() => { window.renderFilmFrame(${Math.round(t * fps)}); return window.art.canvas.toDataURL('image/png').split(',')[1]; })()`);
      await writeFile(path.join(dir, `${t.toFixed(2).padStart(7, '0')}.png`), Buffer.from(png, 'base64'));
      console.log(`${t} colors=${await chrome.evaluate(COUNT_COLORS)}`);
    }
  } else {
    await mkdir(OUT_DIR, {recursive: true});
    const started = Date.now();
    const {ffmpeg, finished} = startEncoder();
    let maxColors = 0;
    for (let i = 0; i < frameCount; i++) {
      const png = await chrome.evaluate(`(() => { window.renderFilmFrame(${i}); return window.art.canvas.toDataURL('image/png').split(',')[1]; })()`);
      if (i % COLORS_EVERY === 0) {
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
    const result = {frames: frameCount, fps, maxColors, megabytes: Number((size / 1048576).toFixed(1)), seconds: Math.round((Date.now() - started) / 1000)};
    await writeFile(path.join(OUT_DIR, '渲染結果.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify(result));
  }
  assert.deepEqual(await chrome.evaluate('window.renderErrors'), []);
} finally {
  await chrome.close();
}
