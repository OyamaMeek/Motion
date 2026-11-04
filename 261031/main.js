/* 歌词只从 LRC 读取。人声已唱完的长间奏里提前收起（键为 LRC 行号，值为测得的结束秒数）。 */
const LYRIC_END = { 14: 103.0, 28: 208.0, 36: 249.4, 37: 257.0 };
let lines = [], T = 0, resolveReady;
window.__hf = window.__hf || {};
window.__hf.buildReady = window.__hf.buildReady || {};
window.__hf.buildReady.mv = new Promise((r) => { resolveReady = r; });
const lyricsReady = fetch('會呼吸的痛.lrc').then((r) => r.text()).then((txt) => {
  txt.split(/\r?\n/).forEach((row) => {
    const m = row.match(/^\[(\d+):(\d+\.\d+)\](.*)$/);
    if (m) lines.push({ t: +m[1] * 60 + +m[2], text: m[3].trim() });
  });
  lines.forEach((l, i) => { l.end = LYRIC_END[i + 1] || (lines[i + 1] ? lines[i + 1].t : 272.996); });
});
function showLyric(t) {
  const hit = lines.find((l) => t >= l.t && t < l.end);
  const el = document.getElementById('lyric');
  const text = hit ? hit.text : '';
  if (el.textContent !== text) el.textContent = text;
}
window.setup = function () {
  pixelDensity(1);
  createCanvas(1920, 1080, WEBGL).parent('stage');
  Clawdbot.setup();
  noLoop();
  lyricsReady.then(() => { showLyric(0); resolveReady(); });
};
window.draw = function () { MVScene.renderAt(T); };
window.addEventListener('hf-seek', (e) => {
  T = e.detail.time;
  showLyric(T);
  if (typeof window.redraw === 'function') e.detail.waitUntil(Promise.resolve(window.redraw()));
});
/* 时间线占位：全部运动由 hf-seek 里的 t 决定，这里只把总时长告诉 HyperFrames */
window.__timelines = window.__timelines || {};
window.__timelines.main = { paused: () => window.__timelines.main, pause() { return this; }, play() { return this; }, seek() { return this; }, time() { return 0; }, totalTime() { return 0; }, duration: () => 272.996, totalDuration: () => 272.996, progress() { return 0; }, getChildren: () => [] };
