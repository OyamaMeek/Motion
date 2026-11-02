import {createKit} from './kit.js';
import {POSES} from './poses.js';
import {SHOTS} from './shots.js';
import {COVERS, TEARS} from './covers.js';
import {BEAT, FPS, FRAME_COUNT, TICK_HZ, TRANSITIONS, locate, makeClock} from './film.js';
import {lyricTimeline, lyricAtFrame} from './lyrics.js';

const canvas = document.getElementById('stage');
const kit = createKit(canvas);
const ctx = canvas.getContext('2d', {willReadFrequently: true});
const byId = Object.fromEntries(SHOTS.map(s => [s.id, s]));

export function drawShot(shot) {
  kit.begin(null);
  kit.clock = shot.poster;
  POSES[shot.id].draw(kit, makeClock(shot, shot.poster - shot.start));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

// 一个 tick 的美术：背景、角色、道具和遮挡物都画在这一张画布上。boil 为 false 时不抖动，测试用来比较接缝。
function drawArt(state, boil = true) {
  const shot = byId[state.id], tr = state.transition;
  const tick = boil ? state.index * 1000 + Math.round(state.q * TICK_HZ) + 1 : null;
  if (tr?.kind === 'tear' || tr?.fullAtCut && tr.t === 48) {
    kit.begin(tick);
    const from = byId[tr.from];
    kit.clock = from.start + tr.fromQ;
    POSES[tr.from].draw(kit, makeClock(from, tr.fromQ));
    kit.snapshot();
  }
  kit.begin(tick);
  kit.clock = shot.start + state.q;
  POSES[state.id].draw(kit, makeClock(shot, state.q, tr));
  // 遮挡物在画面座标里画；screen 把上一镜世界里的位置换算过来。
  const [cx, cy, z] = kit.cameraState();
  const screen = pts => pts.map(([x, y]) => [(x - cx) * z + 960, (y - cy) * z + 540]);
  kit.camera(960, 540, 1);
  if (tr?.kind === 'tear' || tr?.fullAtCut && tr.t === 48) TEARS[state.id](kit, tr.p);
  else if (tr?.kind === 'cover') {
    const target = tr.role === 'leaving' ? SHOTS[state.index + 1].id : state.id;
    COVERS[target](kit, tr.p, {...tr, screen});
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
const artKey = s => `${s.id}|${s.q.toFixed(1)}|${s.transition?.t ?? ''}|${s.transition?.role ?? ''}`;

// 歌词贴纸只算一次：墨色字写在奶油色纸条上，在最上层，不经过相机，也不抖动。
const LYRIC_CORE = '#352e2a', LYRIC_PAPER = '#fbf5e6', LYRIC_Y = 1012;
const stickers = new Map();
function sticker(text) {
  if (!stickers.has(text)) {
    const c = document.createElement('canvas');
    c.width = 1920; c.height = 130;
    const t = c.getContext('2d', {willReadFrequently: true});
    t.font = '700 50px "Songti SC"'; t.textAlign = 'center'; t.textBaseline = 'alphabetic';
    const half = t.measureText(text).width / 2 + 34;
    t.save();
    t.shadowColor = 'rgba(58,42,24,.42)'; t.shadowBlur = 10; t.shadowOffsetY = 3;
    t.fillStyle = LYRIC_PAPER; t.fillRect(960 - half, 34, half * 2, 74);
    t.restore();
    t.fillStyle = LYRIC_CORE; t.fillText(text, 960, 90);
    stickers.set(text, c);
  }
  return stickers.get(text);
}

const base = document.createElement('canvas');
base.width = canvas.width; base.height = canvas.height;
const baseCtx = base.getContext('2d', {willReadFrequently: true});
let timeline = [], lastArt = null, lastLyric = undefined;

// 返回 true 表示这一帧和上一帧不同。
function renderFrame(n) {
  const state = locate(n / FPS), key = artKey(state), lyric = lyricAtFrame(timeline, n)?.text ?? null;
  const artChanged = key !== lastArt;
  if (!artChanged && lyric === lastLyric) return false;
  if (artChanged) {
    drawArt(state);
    baseCtx.globalCompositeOperation = 'copy';
    baseCtx.drawImage(canvas, 0, 0);
    lastArt = key;
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(base, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
  if (lyric) ctx.drawImage(sticker(lyric), 0, LYRIC_Y - 90);
  lastLyric = lyric;
  return true;
}

function measure() {
  const {data} = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sum = 0, sq = 0, purple = 0, opaque = true, count = 0, hash = 2166136261;
  for (let i = 0; i < data.length; i += 4 * 61) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += luma; sq += luma * luma; count += 1;
    if (a !== 255) opaque = false;
    if (b > g + 30 && r > g + 15) purple += 1;
    hash = Math.imul(hash ^ r, 16777619); hash = Math.imul(hash ^ g, 16777619); hash = Math.imul(hash ^ b, 16777619);
  }
  const meanLuma = sum / count;
  return {stats: {meanLuma, spread: Math.sqrt(Math.max(0, sq / count - meanLuma * meanLuma)), purplePct: purple / count * 100, opaque}, hash: hash >>> 0};
}

window.renderErrors = window.renderErrors || [];
window.stage = {
  inspectAll() {
    const shots = SHOTS.map(shot => {
      drawShot(shot);
      const {marks, me} = kit.state();
      return {id: shot.id, keys: POSES[shot.id].keys, marks, me, ...measure()};
    });
    return {shots, errors: window.renderErrors};
  },
};

// ---------- 测试：在缩小的灰度图上比较相邻 tick ----------
const small = document.createElement('canvas');
small.width = 192; small.height = 108;
const smallCtx = small.getContext('2d', {willReadFrequently: true});
function grab() {
  smallCtx.drawImage(canvas, 0, 0, 192, 108);
  const {data} = smallCtx.getImageData(0, 0, 192, 108), out = new Float32Array(192 * 108);
  for (let i = 0; i < out.length; i++) out[i] = 0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2];
  return out;
}
const diffOf = (a, b) => a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0) / a.length;
const artAt = (t, boil = false) => { const s = locate(t); drawArt(s, boil); return {pix: grab(), me: kit.state().meAnchor}; };
// 主角在画面上的脚底座标和 u 都比较，手臂和腿的姿势不算。
const boxDelta = (a, b) => (a && b ? Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) : null);

// 这些接缝的第一 tick 按分镜就有动作开始，允许的差异大一些。
const SEAM_LIMIT = {default: 5, L33: 7};
window.film = {
  FPS, FRAME_COUNT, renderFrame,
  resetCache() { lastArt = null; lastLyric = undefined; },
  seamReport() {
    const seams = SHOTS.slice(1).map(shot => {
      const info = TRANSITIONS[shot.id], before = artAt(shot.start - 1 / FPS), after = artAt(shot.start + 1e-4);
      const row = {to: shot.id, kind: info.kind, fullAtCut: info.fullAtCut, diff: Number(diffOf(before.pix, after.pix).toFixed(2)), limit: SEAM_LIMIT[shot.id] ?? SEAM_LIMIT.default,
        boxDelta: info.kind === 'same' ? boxDelta(before.me, after.me) : null, swapDiff: null};
      if (info.kind === 'cover' && !info.fullAtCut) {
        const a = artAt(shot.start + BEAT / 2 - 0.01), b = artAt(shot.start + BEAT / 2 + 0.001);
        row.swapDiff = Number(diffOf(a.pix, b.pix).toFixed(2));
      }
      return row;
    });
    return {seams, errors: window.renderErrors};
  },
  boilReport() {
    const shotAt = (id, q) => byId[id].start + q;
    const pair = (t, gap) => { drawArt(locate(t), true); const a = grab(); drawArt(locate(t + gap), true); return diffOf(a, grab()); };
    return {moving: pair(shotAt('L13', 3), 0.1), frozenL04: pair(shotAt('L04', 3), 0.1), frozenO02: pair(329.3, 0.1), maxShift: kit.offsetRange()};
  },
  popReport(from_ = 0, to_ = SHOTS.length) {
    const pops = [];
    for (const shot of SHOTS.slice(from_, to_)) {
      const info = TRANSITIONS[shot.id], from = info && info.kind !== 'same' ? BEAT : 0;
      let last = null;
      const steps = [];
      // 遮挡揭开后的第一个 tick 还带着遮挡物退场的最后一步，从第二个开始比较。
      for (let q = from + (from ? 1 / TICK_HZ : 0); q < shot.end - shot.start; q += 1 / TICK_HZ) {
        const {pix} = artAt(shot.start + q);
        if (last) steps.push({q, d: diffOf(last, pix)});
        last = pix;
      }
      // 相机移动时连续多个 tick 都有较大变化，只有孤立的尖峰才是突变。
      steps.forEach(({q, d}, i) => {
        const before = steps[i - 1]?.d ?? 0, after = steps[i + 1]?.d ?? 0;
        if (d > POP_LIMIT && d > before * POP_RATIO && d > after * POP_RATIO) pops.push({id: shot.id, q: Number(q.toFixed(2)), d: Number(d.toFixed(1))});
      });
    }
    return {pops, errors: window.renderErrors};
  },
};
const POP_LIMIT = 14, POP_RATIO = 2.5;

window.addEventListener('hf-seek', e => { if (timeline.length) renderFrame(Math.min(FRAME_COUNT - 1, Math.round(e.detail.time * FPS))); });

await document.fonts.load('700 64px "Songti SC"', '嘉宾囍');
timeline = lyricTimeline(await (await fetch('lib/song.lrc')).text(), FPS);
renderFrame(0);
window.artReady = true;
