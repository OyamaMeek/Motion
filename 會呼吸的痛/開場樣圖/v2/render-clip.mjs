// 渲染 00:14–00:24 试片并混入原曲。用法：node render-clip.mjs [pixel paper crayon]
import {spawn} from 'node:child_process';
import {mkdir, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {openChrome, here, root} from './chrome.mjs';
import {CLIP, CLIP_FPS, clipTicks} from './clip.js';

const FILES = {pixel: '01-像素遊戲', paper: '02-紙藝拼貼', crayon: '03-蠟筆手繪'};
const AUDIO = path.join(root, '會呼吸的痛/會呼吸的痛.m4a');
const FULL_SONG_SECONDS = 273.043;
const outDir = path.join(here, '試片');
await mkdir(outDir, {recursive: true});
const styles = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FILES);
const chrome = await openChrome();

function startEncoder(fps, target) {
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
    '-ss', String(CLIP.start), '-t', String(CLIP.end - CLIP.start), '-i', AUDIO,
    '-map', '0:v', '-map', '1:a', '-r', '24', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', target], {stdio: ['pipe', 'inherit', 'inherit']});
  const finished = new Promise((ok, fail) => ffmpeg.once('exit', code => (code === 0 ? ok() : fail(new Error(`ffmpeg 退出 ${code}`)))));
  return {ffmpeg, finished};
}

const CHECK_PIXEL = `(() => {
  const c = window.art.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const colors = new Set(); let blocks = true;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4, j = ((y - y % 6) * c.width + (x - x % 6)) * 4;
    colors.add(d[i] * 65536 + d[i + 1] * 256 + d[i + 2]);
    if (d[i] !== d[j] || d[i + 1] !== d[j + 1] || d[i + 2] !== d[j + 2]) blocks = false;
  }
  return {colors: colors.size, blocks};
})()`;

const results = [];
try {
  for (const style of styles) {
    const fps = CLIP_FPS[style], ticks = clipTicks(fps), target = path.join(outDir, `${FILES[style]}.mp4`);
    const buildStart = Date.now();
    await chrome.openStyle(style);
    const buildSeconds = (Date.now() - buildStart) / 1000;

    const {ffmpeg, finished} = startEncoder(fps, target);
    const frameStart = Date.now();
    let maxColors = 0;
    for (let i = 0; i < ticks.length; i++) {
      const png = await chrome.evaluate(`(() => {
        window.art.render(window.clipState(${ticks[i]}), ${i});
        return window.art.canvas.toDataURL('image/png').split(',')[1];
      })()`);
      if (style === 'pixel' && i % 10 === 0) {
        const check = await chrome.evaluate(CHECK_PIXEL);
        assert.ok(check.colors <= 32, `第 ${i} 帧 ${check.colors} 色`);
        assert.equal(check.blocks, true, `第 ${i} 帧色块不完整`);
        maxColors = Math.max(maxColors, check.colors);
      }
      if (!ffmpeg.stdin.write(Buffer.from(png, 'base64'))) await new Promise(ok => ffmpeg.stdin.once('drain', ok));
    }
    ffmpeg.stdin.end();
    await finished;

    const frameSeconds = (Date.now() - frameStart) / 1000, perFrame = frameSeconds / ticks.length;
    const errors = await chrome.evaluate('window.renderErrors');
    assert.deepEqual(errors, []);
    const result = {style, fps, frames: ticks.length, buildSeconds: Math.round(buildSeconds), frameSeconds: Math.round(frameSeconds),
      secondsPerFrame: Number(perFrame.toFixed(2)), fullSongMinutes: Number(((buildSeconds + perFrame * FULL_SONG_SECONDS * fps) / 60).toFixed(1)),
      megabytes: Number(((await stat(target)).size / 1048576).toFixed(1)), maxColors: style === 'pixel' ? maxColors : undefined, errors};
    results.push(result);
    console.log(JSON.stringify(result));
  }
} finally {
  await chrome.close();
}
if (styles.length === Object.keys(FILES).length) await writeFile(path.join(outDir, '驗證結果.json'), JSON.stringify(results, null, 2) + '\n');
