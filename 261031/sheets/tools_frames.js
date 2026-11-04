/* 用法：node tools_frames.js <输出目录> <t1,t2,...|keys>，把指定时刻（或每镜关键帧）存成 PNG */
const path = require('path');
const pp = require(process.env.PPT || 'puppeteer-core');
const [, , out, spec] = process.argv;
global.window = global;
require('../data/timing.js');
const M = require('../shots.js');
const times = spec === 'keys' ? M.SHOTS.map((s) => [s.id, s.start + (s.move || 0) + Math.max(0, s.end - s.start - (s.move || 0)) * 0.6]) : spec.split(',').map((t) => ['t' + t, +t]);
(async () => {
  const b = await pp.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--allow-file-access-from-files', '--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080 });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, 'frame.html'));
  await p.waitForFunction('window.__done===true', { timeout: 180000 });
  for (const [id, t] of times) {
    await p.evaluate((x) => window.go(x), t);
    await p.waitForFunction('window.__done===true', { timeout: 180000 });
    await p.screenshot({ path: path.join(out, id + '.png') });
  }
  console.log('frames', times.length, 'lastMs', await p.evaluate('window.__ms'), errs.slice(0, 5).join(' | '));
  await b.close();
})();
