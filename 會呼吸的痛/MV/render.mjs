// 输出分镜：每镜一张 1920×1080 关键画面，以及带镜号与时间的总览图。
import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {openChrome} from '../開場樣圖/v2/chrome.mjs';
import {SHOTS} from './shots.js';
import {KEY_TIMES} from './film.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, '分鏡');
await mkdir(outDir, {recursive: true});
const chrome = await openChrome();

const clock = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(3).padStart(6, '0')}`;
const keyTime = shot => KEY_TIMES[shot.id] ?? shot.start + (shot.end - shot.start) * 0.72;
const savePng = async (expression, file) => writeFile(file, Buffer.from(await chrome.evaluate(`${expression}.toDataURL('image/png').split(',')[1]`), 'base64'));

const COLS = 6, TW = 480, TH = 270, ROWS = Math.ceil(SHOTS.length / COLS);

try {
  await chrome.openStyle('storyboard', here);
  await chrome.evaluate(`(() => {
    const sheet = document.createElement('canvas');
    sheet.width = ${COLS * TW}; sheet.height = ${ROWS * TH};
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#eee8d9'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.imageSmoothingEnabled = false;
    ctx.font = '18px Menlo, monospace';
    window.sheet = sheet;
    window.addToSheet = (i, label) => {
      const x = (i % ${COLS}) * ${TW}, y = Math.floor(i / ${COLS}) * ${TH};
      ctx.drawImage(window.art.canvas, x, y, ${TW - 4}, ${TH - 4});
      const width = ctx.measureText(label).width + 12;
      ctx.fillStyle = 'rgba(53,46,42,.82)'; ctx.fillRect(x, y, width, 26);
      ctx.fillStyle = '#fff'; ctx.fillText(label, x + 6, y + 19);
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
    await chrome.evaluate(`window.addToSheet(${i}, ${JSON.stringify(`${shot.id} ${clock(shot.start)}`)})`);
    frames.push({id: shot.id, start: clock(shot.start), end: clock(shot.end), keyTime: Number(t.toFixed(3)), colors});
  }
  assert.deepEqual(await chrome.evaluate('window.renderErrors'), []);
  await savePng('window.sheet', path.join(outDir, '分鏡總覽.png'));
  await writeFile(path.join(outDir, '驗證結果.json'), JSON.stringify(frames, null, 2) + '\n');
  console.log(`status=ok shots=${frames.length} maxColors=${Math.max(...frames.map(f => f.colors))}`);
} finally {
  await chrome.close();
}
