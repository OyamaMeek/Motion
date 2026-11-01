// 用本机 Chrome 无头渲染样图并自检。用法：node render.mjs [pixel paper crayon]
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, mkdtemp, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const FILES = {pixel: '01-像素遊戲', paper: '02-紙藝拼貼', crayon: '03-蠟筆手繪'};
const styles = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FILES);
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript'};

const server = createServer(async (req, res) => {
  try {
    const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(root)) throw new Error('outside root');
    const body = await readFile(file);
    res.writeHead(200, {'content-type': MIME[path.extname(file)] || 'application/octet-stream'});
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const port = server.address().port;

await mkdir(path.join(root, '.agent/work'), {recursive: true});
const profile = await mkdtemp(path.join(root, '.agent/work/opening-chrome-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--window-size=1920,1080', '--force-device-scale-factor=1', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist', '--no-first-run', 'about:blank'], {stdio: ['ignore', 'ignore', 'pipe']});
const wsUrl = await new Promise((ok, fail) => {
  let log = '';
  chrome.stderr.on('data', d => { log += d; const m = log.match(/ws:\/\/\S+/); if (m) ok(m[0]); });
  chrome.on('exit', code => fail(new Error(`Chrome 退出 ${code}: ${log}`)));
});

const ws = new WebSocket(wsUrl);
await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
let id = 0;
const pending = new Map();
ws.onmessage = e => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
const send = (method, params = {}, sessionId) => new Promise((ok, fail) => {
  const n = ++id;
  pending.set(n, msg => (msg.error ? fail(new Error(`${method}: ${msg.error.message}`)) : ok(msg.result)));
  ws.send(JSON.stringify({id: n, method, params, sessionId}));
});

const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true});
const page = (method, params) => send(method, params, sessionId);
const evaluate = async expression => {
  const r = await page('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
await page('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false});

const results = [];
try {
  for (const style of styles) {
    const started = Date.now();
    await page('Page.navigate', {url: `http://127.0.0.1:${port}/${encodeURI(path.relative(root, here))}/index.html?style=${style}`});
    let state = {};
    for (let i = 0; i < 1200; i++) {
      await new Promise(ok => setTimeout(ok, 250));
      state = await evaluate('({ready: !!window.artReady, errors: window.renderErrors || []})').catch(() => ({ready: false, errors: []}));
      if (state.ready || state.errors.length) break;
    }
    assert.equal(state.ready, true, `${style} 未完成: ${JSON.stringify(state)}`);
    assert.deepEqual(state.errors, []);
    const r = await evaluate(`(() => {
      const c = window.artCanvas, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const colors = new Set(); let opaque = true, blocks = true;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        colors.add(d[i] * 65536 + d[i + 1] * 256 + d[i + 2]);
        if (d[i + 3] !== 255) opaque = false;
        const j = ((y - y % 6) * c.width + (x - x % 6)) * 4;
        if (d[i] !== d[j] || d[i + 1] !== d[j + 1] || d[i + 2] !== d[j + 2]) blocks = false;
      }
      return {width: c.width, height: c.height, colors: colors.size, opaque, blocks,
        native: window.pixelNative ? [window.pixelNative.width, window.pixelNative.height] : null,
        brushes: window.brushNames || null};
    })()`);
    assert.equal(r.width, 1920); assert.equal(r.height, 1080); assert.equal(r.opaque, true);
    if (style === 'pixel') {
      assert.deepEqual(r.native, [320, 180]);
      assert.ok(r.colors >= 16 && r.colors <= 32, `像素版 ${r.colors} 色超出 16–32`);
      assert.equal(r.blocks, true);
    }
    if (style === 'crayon') assert.ok(r.brushes.includes('crayon'));
    const png = await evaluate(`window.artCanvas.toDataURL('image/png').split(',')[1]`);
    await writeFile(path.join(here, `${FILES[style]}.png`), Buffer.from(png, 'base64'));
    results.push({style, ...r, brushes: undefined, errors: state.errors, seconds: Math.round((Date.now() - started) / 1000)});
    console.log(JSON.stringify(results.at(-1)));
  }
} finally {
  const exited = new Promise(ok => chrome.once('exit', ok));
  chrome.kill(); server.close(); ws.close();
  await exited;
  await rm(profile, {recursive: true, force: true});
}
if (styles.length === Object.keys(FILES).length) await writeFile(path.join(here, '驗證結果.json'), JSON.stringify(results, null, 2) + '\n');
