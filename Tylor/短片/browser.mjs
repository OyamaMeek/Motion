// 无头 Chrome：本地 HTTP 服务本目录，经 --remote-debugging-pipe（fd 3 写、fd 4 读，消息以 \0 分隔）收发 CDP。
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtemp, readFile, rm, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const WORK = path.resolve(here, '../../.agent/work/taylor');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json'};

export async function openPage() {
  const server = createServer(async (req, res) => {
    const file = path.join(here, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(here)) { res.writeHead(403); res.end(); return; }
    try { const body = await readFile(file); res.writeHead(200, {'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream'}); res.end(body); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  await mkdir(WORK, {recursive: true});
  const profile = await mkdtemp(path.join(WORK, 'chrome-'));
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-pipe', `--user-data-dir=${profile}`, '--no-first-run',
    '--window-size=1920,1080', '--force-device-scale-factor=1', '--hide-scrollbars', 'about:blank'], {stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe']});
  const [toChrome, fromChrome] = [chrome.stdio[3], chrome.stdio[4]];
  let id = 0, buf = '';
  const waiting = new Map();
  fromChrome.on('data', chunk => {
    buf += chunk.toString('utf8');
    let k;
    while ((k = buf.indexOf('\0')) >= 0) {
      const msg = JSON.parse(buf.slice(0, k));
      buf = buf.slice(k + 1);
      if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); }
    }
  });
  const exited = new Promise(ok => chrome.once('exit', ok));
  const send = (method, params = {}, sessionId) => new Promise((ok, fail) => {
    const n = ++id;
    waiting.set(n, m => (m.error ? fail(new Error(`${method}: ${m.error.message}`)) : ok(m.result)));
    toChrome.write(JSON.stringify({id: n, method, params, sessionId}) + '\0');
  });
  const {targetId} = await send('Target.createTarget', {url: 'about:blank'});
  const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true});
  const page = (m, p) => send(m, p, sessionId);
  async function evaluate(expression) {
    const r = await page('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
  await page('Emulation.setDeviceMetricsOverride', {width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false});
  await page('Page.navigate', {url: `http://127.0.0.1:${server.address().port}/index.html`});
  for (let i = 0; ; i++) {
    await new Promise(ok => setTimeout(ok, 200));
    const s = await evaluate('({ready: !!window.filmReady, errors: window.film?.errors ?? []})').catch(() => ({ready: false, errors: []}));
    if (s.ready) { if (s.errors.length) throw new Error(`页面错误：${s.errors.join('\n')}`); break; }
    if (i > 300) throw new Error('页面 60 秒未就绪');
  }
  async function close() {
    chrome.kill();
    server.close();
    await exited;
    await rm(profile, {recursive: true, force: true, maxRetries: 10, retryDelay: 200});
  }
  return {evaluate, close};
}
