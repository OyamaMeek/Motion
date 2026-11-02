// 把 52 个关键帧拼成一张分镜总览图 boards/storyboard.png。用法：node 嘉宾/MV/gen-sheet.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {SHOTS} from './shots.js';
import {openChrome} from '../../會呼吸的痛/開場樣圖/v2/chrome.mjs';

const clock = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(3).padStart(6, '0')}`;
const LAYOUT = {cols: 8, rows: 7, tw: 480, th: 270, label: 96, gap: 16, head: 96};

export function sheetLabels(text) {
  const links = [...text.matchAll(/^\| (T\d{2}) \| .+? \| .+? \| (实物遮挡|撕开|同场延续) \|/gm)].map(m => `${m[1]} ${m[2]}`);
  return SHOTS.map((s, i) => [
    `${String(s.n).padStart(2, '0')} ${s.id} ${s.name}`,
    `${clock(s.start)}–${clock(s.end)} ｜ 关键帧 ${clock(s.poster)}`,
    i ? links[i - 1] : '片头',
  ]);
}

export function buildSheet(chrome, text) {
  const labels = sheetLabels(text);
  return chrome.evaluate(`(async () => {
    const {drawShot} = await import(new URL('main.js', location));
    const {SHOTS} = await import(new URL('shots.js', location));
    const labels = ${JSON.stringify(labels)}, {cols, rows, tw, th, label, gap, head} = ${JSON.stringify(LAYOUT)};
    const stage = document.getElementById('stage');
    const sheet = document.createElement('canvas');
    sheet.width = cols * tw + (cols + 1) * gap;
    sheet.height = head + rows * (th + label) + (rows + 1) * gap;
    const ctx = sheet.getContext('2d');
    ctx.fillStyle = '#f4f1ea'; ctx.fillRect(0, 0, sheet.width, sheet.height);
    ctx.fillStyle = '#2f2a24'; ctx.textBaseline = 'alphabetic';
    ctx.font = '700 48px "PingFang SC"';
    ctx.fillText('《嘉宾》分镜总览：52 镜关键帧', gap, 66);
    ctx.imageSmoothingQuality = 'high';
    let widestLabel = 0;
    const hashes = [];
    SHOTS.forEach((shot, i) => {
      drawShot(shot);
      const x = gap + (i % cols) * (tw + gap), y = head + gap + Math.floor(i / cols) * (th + label + gap);
      ctx.drawImage(stage, x, y, tw, th);
      const {data} = ctx.getImageData(x, y, tw, th);
      let hash = 2166136261;
      for (let p = 0; p < data.length; p += 4 * 97) hash = Math.imul(hash ^ data[p] ^ (data[p + 1] << 8) ^ (data[p + 2] << 16), 16777619);
      hashes.push(hash >>> 0);
      [['700 26px "PingFang SC"', '#2f2a24', 30], ['20px "PingFang SC"', '#7b7063', 58], ['20px "PingFang SC"', '#a63a2e', 84]].forEach(([font, color, dy], line) => {
        ctx.font = font; ctx.fillStyle = color;
        ctx.fillText(labels[i][line], x, y + th + dy);
        widestLabel = Math.max(widestLabel, ctx.measureText(labels[i][line]).width);
      });
    });
    return {cells: SHOTS.length, hashes, widestLabel, cellWidth: tw, labels, width: sheet.width, height: sheet.height, png: sheet.toDataURL('image/png')};
  })()`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const chrome = await openChrome();
  try {
    await chrome.openStyle('paper', fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, ''));
    const sheet = await buildSheet(chrome, readFileSync(new URL('../storyboard.md', import.meta.url), 'utf8'));
    writeFileSync(new URL('./boards/storyboard.png', import.meta.url), Buffer.from(sheet.png.split(',')[1], 'base64'));
    console.log(`写入 boards/storyboard.png：${sheet.width}×${sheet.height}，${sheet.cells} 镜`);
  } finally {
    await chrome.close();
  }
}
