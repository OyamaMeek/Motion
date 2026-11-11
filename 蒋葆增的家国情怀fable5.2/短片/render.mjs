// 用本机无头 Chrome 逐帧绘制。
//   node render.mjs --stills 0,30,120 --out <目录> [--jpg]     只导出指定帧
//   node render.mjs --video [--workers 6] [--audio <wav>]      渲染全片并合成声音
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FRAMES, FPS } from './timeline.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(ROOT, '..', '..');
const WORK = path.join(REPO, '.agent', 'work', '蒋葆增fable');
const OUT = path.join(ROOT, '输出');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FRAME_TIMEOUT = 40000;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name, fallback) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : fallback);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8' };

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function openPage(url, tag) {
  const profile = path.join(WORK, `chrome-${tag}`);
  fs.rmSync(profile, { recursive: true, force: true });
  fs.mkdirSync(profile, { recursive: true });
  const proc = spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--window-size=1920,1080', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', 'about:blank',
  ], { stdio: 'ignore' });
  const portFile = path.join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await sleep(100);
  if (!fs.existsSync(portFile)) throw new Error('Chrome 没有写出调试端口');
  const [port, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error('连接 Chrome 调试端口失败'));
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject, timer } = pending.get(msg.id);
    clearTimeout(timer);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      const timer = setTimeout(() => {
        pending.delete(n);
        reject(new Error(`${method} 超过 ${FRAME_TIMEOUT} ms 没有返回`));
      }, FRAME_TIMEOUT);
      pending.set(n, { resolve, reject, timer });
      ws.send(JSON.stringify({ id: n, method, params, sessionId }));
    });
  const { targetId } = await send('Target.createTarget', { url });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
    return r.result.value;
  };
  for (let i = 0; i < 100; i++) {
    if (await evaluate('window.ready === true')) break;
    if (i === 99) throw new Error('页面没有就绪，检查模块是否报错');
    await sleep(100);
  }
  return {
    evaluate,
    close() {
      ws.close();
      proc.kill();
    },
  };
}

async function frameBytes(page, f, type = 'image/png', quality = 0.92) {
  const url = await page.evaluate(`window.renderFrame(${f}, '${type}', ${quality})`);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
}

async function stills(base) {
  const frames = value('stills').split(',').map(Number);
  const out = path.resolve(value('out', path.join(WORK, 'stills')));
  fs.mkdirSync(out, { recursive: true });
  const page = await openPage(base, 'stills');
  try {
    for (const f of frames) {
      const jpg = flag('jpg');
      const buf = await frameBytes(page, f, jpg ? 'image/jpeg' : 'image/png');
      fs.writeFileSync(path.join(out, `f${String(f).padStart(4, '0')}.${jpg ? 'jpg' : 'png'}`), buf);
    }
    console.log(`已导出 ${frames.length} 帧到 ${out}`);
  } finally {
    page.close();
  }
}

async function scan(base) {
  // 每一帧都画一遍，只检查有没有抛出错误
  const page = await openPage(base, 'scan');
  try {
    const bad = [];
    for (let from = 0; from < FRAMES; from += 300) {
      bad.push(...(await page.evaluate(`window.scanFrames(${from}, ${Math.min(FRAMES, from + 300)})`)));
    }
    console.log(`扫描 ${FRAMES} 帧，出错 ${bad.length} 帧`);
    for (const b of bad.slice(0, 20)) console.log(b);
    if (bad.length) process.exitCode = 1;
  } finally {
    page.close();
  }
}

async function video(base) {
  const workers = Number(value('workers', '6'));
  const audio = path.resolve(value('audio', path.join(OUT, '配乐.wav')));
  if (!fs.existsSync(audio)) throw new Error(`没有找到配乐：${audio}，先运行 node audio.mjs`);
  fs.mkdirSync(OUT, { recursive: true });
  const segDir = path.join(WORK, 'segments');
  fs.rmSync(segDir, { recursive: true, force: true });
  fs.mkdirSync(segDir, { recursive: true });
  const per = Math.ceil(FRAMES / workers);
  const started = Date.now();
  let done = 0;
  const report = setInterval(() => console.log(`已绘制 ${done}/${FRAMES} 帧，${((Date.now() - started) / 1000).toFixed(0)} 秒`), 10000);
  const segments = await Promise.all(
    Array.from({ length: workers }, async (_, w) => {
      const from = w * per;
      const to = Math.min(FRAMES, from + per);
      const file = path.join(segDir, `seg-${String(w).padStart(2, '0')}.mp4`);
      const ff = spawn('ffmpeg', [
        '-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
        '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-r', String(FPS), file,
      ], { stdio: ['pipe', 'inherit', 'inherit'] });
      const closed = new Promise((resolve, reject) => ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg 分段 ${w} 退出码 ${code}`)))));
      const page = await openPage(base, `w${w}`);
      try {
        for (let f = from; f < to; f++) {
          const buf = await frameBytes(page, f);
          if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
          done++;
        }
      } finally {
        page.close();
        ff.stdin.end();
      }
      await closed;
      return file;
    }),
  );
  clearInterval(report);
  const listFile = path.join(segDir, 'list.txt');
  fs.writeFileSync(listFile, segments.map((s) => `file '${s}'`).join('\n'));
  const final = path.join(OUT, '八个字，一生的回答.mp4');
  execFileSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-i', audio,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', final,
  ], { stdio: 'inherit' });
  console.log(`完成：${final}，用时 ${((Date.now() - started) / 1000).toFixed(0)} 秒`);
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}/index.html`;
try {
  if (flag('stills')) await stills(base);
  else if (flag('scan')) await scan(base);
  else if (flag('video')) await video(base);
  else throw new Error('需要 --stills、--scan 或 --video');
} finally {
  server.close();
}
