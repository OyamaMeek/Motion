// 用本机 Chrome 无头模式渲染纸艺样图并做数值检查。用法：node 嘉宾/开场样图/render.mjs
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {openChrome} from '../../會呼吸的痛/開場樣圖/v2/chrome.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const chrome = await openChrome();
let report;
try {
  await chrome.openStyle('paper', here);
  report = await chrome.evaluate(`(async () => {
    const m = await import('./inspect.js');
    const {canvas} = art, ctx = canvas.getContext('2d', {willReadFrequently: true});
    const card = findLayer('card').pieces, invite = card.find(p => p.name === 'invite').frame, place = card.find(p => p.name === 'placeCard').frame;
    const still = document.createElement('canvas'); still.width = canvas.width; still.height = canvas.height;
    const baseline = still.getContext('2d', {willReadFrequently: true}); baseline.drawImage(canvas, 0, 0);

    const stats = m.paletteStats(ctx), probes = m.colorProbes(ctx, findLayer, COLORS), edge = m.edgeProfile(ctx, invite), ink = m.inkInCard(ctx, place, COLORS.ink);
    const fonts = {title: m.fontResolved('嘉宾', '"Songti SC"'), invite: m.fontResolved('囍', '"Songti SC"')};

    const shifts = [];
    for (const tick of [1, 2, 3, 4, 5]) {
      art.render(tick);
      shifts.push({tick, expected: layerOffset('card', tick), measured: m.measuredShift(ctx, baseline, {x: 1460, y: 760, w: 260, h: 180})});
    }
    const updatesPerSecond = await m.measureUpdates(art, ctx);
    art.render(null);
    const grain = {sky: m.surfaceGrain(ctx, 800, 100), snow: m.surfaceGrain(ctx, 1100, 880), card: m.surfaceGrain(ctx, 1440, 780)};
    return {stats, probes, edge, ink, place, fonts, shifts, updatesPerSecond, grain, errors: window.renderErrors};
  })()`);

  assert.deepEqual(report.errors, []);
  assert.equal(report.stats.width, 1920);
  assert.equal(report.stats.height, 1080);
  assert.equal(report.stats.opaque, true);
  assert.ok(report.stats.meanLuma > 150, `整体偏暗：${report.stats.meanLuma}`);
  assert.ok(report.stats.darkPct < 8, `暗部过多：${report.stats.darkPct}`);
  assert.ok(report.stats.purplePct < 0.1, `出现紫色：${report.stats.purplePct}`);
  assert.ok(report.stats.neonPct < 0.1, `出现霓虹色：${report.stats.neonPct}`);
  assert.ok(report.stats.redPct > 1 && report.stats.redPct < 8, `红色占比：${report.stats.redPct}`);
  for (const p of report.probes) assert.ok(p.pass, `${p.name}: ${JSON.stringify(p)}`);
  assert.ok(report.fonts.title.resolved && report.fonts.invite.resolved, JSON.stringify(report.fonts));
  assert.ok(report.ink.inside > 800, `席卡文字墨色过少：${report.ink.inside}`);
  assert.ok(Math.abs(report.ink.minX) < report.place.w / 2 - 8 && report.ink.maxX < report.place.w / 2 - 8, '文字超出席卡');

  assert.ok(Math.abs(report.ink.minY + report.ink.maxY) <= 6, `文字未垂直居中：${report.ink.minY}, ${report.ink.maxY}`);
  const {perSecond, renderMs} = report.updatesPerSecond;
  assert.ok(perSecond >= 8 && perSecond <= 12, `每秒更新 ${perSecond} 次，单帧绘制 ${renderMs} ms`);
  for (const [name, v] of Object.entries(report.grain)) assert.ok(v >= 1.5, `${name} 纸面颗粒不足：${v}`);

  const isRed =([r, g, b]) => r > 120 && g < 90 && b < 90;
  const isWhite = ([r, g, b]) => r > 225 && g > 215 && b > 190;
  const firstWhite = report.edge.findIndex(isWhite), lastRed = report.edge.findLastIndex(isRed);
  assert.ok(lastRed >= 0 && firstWhite > lastRed - 1, `喜帖白边顺序不对：${JSON.stringify(report.edge)}`);
  const beyond = report.edge.slice(firstWhite).filter(c => !isWhite(c));
  assert.ok(beyond.length > 0 && beyond[0].reduce((a, b) => a + b) < report.edge[firstWhite].reduce((a, b) => a + b) - 40, '白边外没有投影');
  for (const s of report.shifts) assert.deepEqual([s.measured.dx, s.measured.dy], [s.expected.dx, s.expected.dy], `tick ${s.tick}`);

  const png = await chrome.evaluate(`art.canvas.toDataURL('image/png').split(',')[1]`);
  const file = path.join(here, '02-纸艺拼贴.png');
  await writeFile(file, Buffer.from(png, 'base64'));
  console.log(JSON.stringify({stats: report.stats, probes: report.probes.map(p => [p.name, p.distance]), ink: report.ink, fonts: report.fonts, shifts: report.shifts.map(s => [s.measured.dx, s.measured.dy]), updatesPerSecond: report.updatesPerSecond, grain: report.grain}));
} finally {
  await chrome.close();
}
await writeFile(path.join(here, '验证结果.json'), JSON.stringify(report, null, 2) + '\n');
