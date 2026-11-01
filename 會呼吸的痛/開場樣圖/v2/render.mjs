// 用本机 Chrome 无头渲染静态样图并自检。用法：node render.mjs [pixel paper crayon]
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {openChrome, here} from './chrome.mjs';

const FILES = {pixel: '01-像素遊戲', paper: '02-紙藝拼貼', crayon: '03-蠟筆手繪'};
const styles = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FILES);
const chrome = await openChrome();

const results = [];
try {
  for (const style of styles) {
    const started = Date.now();
    await chrome.openStyle(style);
    const r = await chrome.evaluate(`(() => {
      const c = window.art.canvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const colors = new Set(); let opaque = true, blocks = true;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        colors.add(d[i] * 65536 + d[i + 1] * 256 + d[i + 2]);
        if (d[i + 3] !== 255) opaque = false;
        const j = ((y - y % 6) * c.width + (x - x % 6)) * 4;
        if (d[i] !== d[j] || d[i + 1] !== d[j + 1] || d[i + 2] !== d[j + 2]) blocks = false;
      }
      return {width: c.width, height: c.height, colors: colors.size, opaque, blocks,
        native: window.art.native ? [window.art.native.width, window.art.native.height] : null,
        brushes: window.art.brushes || null};
    })()`);
    assert.equal(r.width, 1920); assert.equal(r.height, 1080); assert.equal(r.opaque, true);
    if (style === 'pixel') {
      assert.deepEqual(r.native, [320, 180]);
      assert.ok(r.colors >= 16 && r.colors <= 32, `像素版 ${r.colors} 色超出 16–32`);
      assert.equal(r.blocks, true);
    }
    if (style === 'crayon') assert.ok(r.brushes.includes('crayon'));
    const png = await chrome.evaluate(`window.art.canvas.toDataURL('image/png').split(',')[1]`);
    await writeFile(path.join(here, `${FILES[style]}.png`), Buffer.from(png, 'base64'));
    results.push({style, ...r, brushes: undefined, errors: [], seconds: Math.round((Date.now() - started) / 1000)});
    console.log(JSON.stringify(results.at(-1)));
  }
} finally {
  await chrome.close();
}
if (styles.length === Object.keys(FILES).length) await writeFile(path.join(here, '驗證結果.json'), JSON.stringify(results, null, 2) + '\n');
