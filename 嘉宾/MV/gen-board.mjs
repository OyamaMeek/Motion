// 由 shots.js 生成图像分镜页。用法：node 嘉宾/MV/gen-board.mjs
import {writeFileSync} from 'node:fs';
import {SHOTS} from './shots.js';

const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const clock = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(3).padStart(6, '0')}`;

let act = null;
const cards = SHOTS.map((s, i) => {
  const head = s.act !== act ? `</div>\n<section class="act">${escape(s.act)}</section>\n<div class="grid">` : '';
  act = s.act;
  return `${head}
<div class="frame">
  <img src="stills/frame-${String(i).padStart(2, '0')}.jpg" alt="" loading="lazy">
  <div class="title">${String(s.n).padStart(2, '0')}: ${escape(s.id)} ${escape(s.name)}</div>
  <div class="time">${clock(s.start)} to ${clock(s.end)}（${s.start.toFixed(1)} to ${s.end.toFixed(1)}s）</div>
  <p class="words">${escape(s.action)}</p>
</div>`;
}).join('\n');

writeFileSync(new URL('./boards/storyboard.html', import.meta.url), `<!doctype html>
<html lang="zh-Hans">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>嘉宾图像分镜</title>
<style>
  body { margin: 0; padding: 32px 16px; background: #f4f1ea; color: #2f2a24; font: 15px/1.5 Inter, -apple-system, "PingFang SC", sans-serif; }
  h1 { max-width: 1500px; margin: 0 auto 8px; font-size: 26px; }
  .act { max-width: 1500px; margin: 32px auto 12px; font-size: 18px; font-weight: 700; }
  .grid { max-width: 1500px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; }
  .frame { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(60,45,25,.14); }
  .frame img { display: block; width: 100%; aspect-ratio: 16 / 9; }
  .title { padding: 10px 14px 0; font-weight: 700; }
  .time { padding: 0 14px; color: #7b7063; font-size: 13px; font-variant-numeric: tabular-nums; }
  .words { margin: 6px 14px 14px; }
</style>
</head>
<body>
<h1>《嘉宾》图像分镜：52 镜</h1>
<div class="grid">
${cards}
</div>
</body>
</html>
`);
console.log('写入 boards/storyboard.html');
