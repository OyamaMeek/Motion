// 输出分镜：每镜一张 1920×1080 关键画面，以及带镜号、时间与歌词的总览图 storyboard.png。
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {openChrome} from '../開場樣圖/v2/chrome.mjs';
import {SHOTS, shotCaption} from './shots.js';
import {KEY_TIMES} from './film.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '分鏡');
await mkdir(outDir, {recursive: true});
const chrome = await openChrome();

const clock = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(3).padStart(6, '0')}`;
const keyTime = shot => KEY_TIMES[shot.id] ?? shot.start + (shot.end - shot.start) * 0.72;
const savePng = async (expression, file) => writeFile(file, Buffer.from(await chrome.evaluate(`${expression}.toDataURL('image/png').split(',')[1]`), 'base64'));

// 总览用原生 320×180 的整数 2 倍，像素不会因缩放而不均匀。
const COLS = 6, TW = 640, TH = 360, CAPTION = 76, GAP = 8, ROWS = Math.ceil(SHOTS.length / COLS);
const storyboardText = await readFile(path.join(here, '../會呼吸的痛storyboard.md'), 'utf8');

try {
  await chrome.openStyle('storyboard', here);
  await chrome.evaluate(`(() => {
    const sheet = document.createElement('canvas');
    sheet.width = ${COLS * (TW + GAP) + GAP}; sheet.height = ${ROWS * (TH + CAPTION + GAP) + GAP};
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#eee8d9'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.imageSmoothingEnabled = false;
    window.sheet = sheet;
    window.addToSheet = (i, timing, caption) => {
      const x = ${GAP} + (i % ${COLS}) * ${TW + GAP}, y = ${GAP} + Math.floor(i / ${COLS}) * ${TH + CAPTION + GAP};
      ctx.drawImage(window.art.native, x, y, ${TW}, ${TH});
      ctx.fillStyle = '#352e2a';
      ctx.font = '20px Menlo, monospace';
      ctx.fillText(timing, x + 4, y + ${TH + 26});
      ctx.font = '26px "PingFang TC", sans-serif';
      ctx.fillText(caption, x + 4, y + ${TH + 62});
      return ctx.measureText(caption).width;
    };
  })()`);
  const frames = [];
  for (const [i, shot] of SHOTS.entries()) {
    const t = keyTime(shot);
    await chrome.evaluate(`window.renderAt(${t})`);
    const colors = await chrome.evaluate(`(() => {
      const c = window.art.native, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, set = new Set();
      for (let k = 0; k < d.length; k += 4) set.add(d[k] * 65536 + d[k + 1] * 256 + d[k + 2]);
      return set.size;
    })()`);
    assert.ok(colors <= 32, `${shot.id} 用了 ${colors} 色`);
    await savePng('window.art.canvas', path.join(outDir, `${shot.id}.png`));
    const timing = `${shot.id}  ${clock(shot.start)}–${clock(shot.end)}  关键帧 ${clock(t)}`;
    const captionWidth = await chrome.evaluate(`window.addToSheet(${i}, ${JSON.stringify(timing)}, ${JSON.stringify(shotCaption(shot, storyboardText))})`);
    assert.ok(captionWidth <= TW - 8, `${shot.id} 说明超出格宽：${captionWidth}`);
    frames.push({id: shot.id, start: clock(shot.start), end: clock(shot.end), keyTime: Number(t.toFixed(3)), colors});
  }
  assert.deepEqual(await chrome.evaluate('window.renderErrors'), []);
  await savePng('window.sheet', path.join(outDir, 'storyboard.png'));
  await writeFile(path.join(outDir, '驗證結果.json'), JSON.stringify(frames, null, 2) + '\n');
  console.log(`status=ok shots=${frames.length} maxColors=${Math.max(...frames.map(f => f.colors))}`);
} finally {
  await chrome.close();
}
