import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile, mkdir, mkdtemp, rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, '../../..');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MIME = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript'};

export async function openChrome() {
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
    chrome.once('exit', code => fail(new Error(`Chrome 退出 ${code}: ${log}`)));
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

  async function openStyle(style, dir = here) {
    await page('Page.navigate', {url: `http://127.0.0.1:${port}/${encodeURI(path.relative(root, dir))}/index.html?style=${style}`});
    let state = {};
    for (let i = 0; i < 2400; i++) {
      await new Promise(ok => setTimeout(ok, 250));
      state = await evaluate(`({ready: !!window.artReady && location.search.includes('style=${style}'), errors: window.renderErrors || []})`).catch(() => ({ready: false, errors: []}));
      if (state.ready || state.errors.length) break;
    }
    if (!state.ready || state.errors.length) throw new Error(`${style} 未完成: ${JSON.stringify(state)}`);
  }

  async function close() {
    const exited = new Promise(ok => chrome.once('exit', ok));
    chrome.kill(); server.close(); ws.close();
    await exited;
    await rm(profile, {recursive: true, force: true, maxRetries: 10, retryDelay: 200});
  }
  return {evaluate, openStyle, close};
}
