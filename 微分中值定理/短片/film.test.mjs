import test from 'node:test';
import assert from 'node:assert/strict';
import {BEATS, BEAT_FRAMES, CUT_BEATS, CUT_FRAMES, FPS, FRAME_COUNT, HIT_BEATS, KEYS, SAMPLE_RATE, SCENES, SECONDS, frameState} from './timeline.js';
import {TEXT, allText} from './script.js';
import {CAUCHY, FERMAT, LAGRANGE, ROLLE_SHAPES, extrema} from './math.js';
import {synthesize} from './music.mjs';

const MIX = synthesize();

test('120 秒、30 fps、120 BPM、240 拍', () => {
  assert.equal(FPS, 30);
  assert.equal(BEAT_FRAMES, 15);
  assert.equal(BEATS, 240);
  assert.equal(FRAME_COUNT, 3600);
  assert.equal(SECONDS, 120);
  assert.equal(SAMPLE_RATE, 48000);
});

test('5 个场景首尾相接，切点在小节首拍', () => {
  assert.deepEqual(SCENES.map(s => [s.id, s.beats]), [['fermat', 40], ['rolle', 48], ['lagrange', 56], ['cauchy', 56], ['chain', 40]]);
  assert.equal(SCENES.reduce((s, x) => s + x.beats, 0), BEATS);
  assert.deepEqual(CUT_BEATS, [40, 88, 144, 200]);
  assert.deepEqual(CUT_FRAMES, [600, 1320, 2160, 3000]);
  for (const b of CUT_BEATS) assert.equal(b % 4, 0);
  for (const [i, s] of SCENES.entries()) {
    assert.equal(frameState(s.start).index, i);
    assert.equal(frameState(s.start).local, 0);
    if (i > 0) assert.equal(frameState(s.start - 1).index, i - 1);
  }
  assert.throws(() => frameState(FRAME_COUNT));
  assert.throws(() => frameState(-1));
});

test('场景内的关键拍都在场景长度之内，重音包含全部切点', () => {
  for (const s of SCENES) {
    const flat = Object.values(KEYS[s.id]).flat();
    assert.ok(flat.length > 0);
    for (const b of flat) assert.ok(b >= 0 && b <= s.beats, `${s.id} 关键拍 ${b} 越界`);
  }
  for (const b of [0, ...CUT_BEATS]) assert.ok(HIT_BEATS.includes(b), `缺少重音 ${b}`);
  assert.deepEqual(HIT_BEATS, [...HIT_BEATS].sort((a, b) => a - b));
});

test('字少而大：每条屏幕文字不超过 14 字，每个场景都有文字', () => {
  for (const s of SCENES) assert.ok(TEXT[s.id], `${s.id} 没有文字`);
  for (const t of allText()) {
    const n = [...t.replace(/\s/g, '')].length;
    assert.ok(n <= 14, `过长（${n} 字）：${t}`);
  }
  const joined = allText().join('\n');
  for (const banned of ['不是', '而是', '落地', '对齐', '钉死']) assert.ok(!joined.includes(banned), `出现禁用说法：${banned}`);
  // 用户确认片子只讲数学，不讲“用代码做视频”
  for (const banned of ['代码', '每一帧', '帧', 'renderFrame']) assert.ok(!joined.includes(banned), `出现制作手段的说法：${banned}`);
  assert.ok(TEXT.chain.one.includes('根源'));
});

test('费马：极值点导数为零，-1 是极大、1 是极小', () => {
  assert.equal(FERMAT.df(FERMAT.peak), 0);
  assert.equal(FERMAT.df(FERMAT.valley), 0);
  const h = 1e-3;
  assert.ok(FERMAT.f(FERMAT.peak) > FERMAT.f(FERMAT.peak - h) && FERMAT.f(FERMAT.peak) > FERMAT.f(FERMAT.peak + h));
  assert.ok(FERMAT.f(FERMAT.valley) < FERMAT.f(FERMAT.valley - h) && FERMAT.f(FERMAT.valley) < FERMAT.f(FERMAT.valley + h));
});

test('罗尔：每个形状两端等高，弯曲的形状内部都有导数为零的点', () => {
  for (const [i, s] of ROLLE_SHAPES.entries()) {
    assert.ok(Math.abs(s(0)) < 1e-12 && Math.abs(s(1)) < 1e-12, `形状 ${i} 端点不等高`);
    const xs = extrema(s);
    if (i === 0) assert.equal(xs.length, 0);
    else assert.ok(xs.length >= 1, `形状 ${i} 没有平切线`);
    for (const u of xs) {
      assert.ok(u > 0 && u < 1);
      assert.ok(Math.abs((s(u + 1e-6) - s(u - 1e-6)) / 2e-6) < 1e-4, `形状 ${i} 在 ${u} 导数不为零`);
    }
  }
});

test('拉格朗日：加上任意倾斜 k，ξ 处切线斜率等于弦的斜率', () => {
  for (const k of [-0.6, -0.2, 0, 0.35, 0.8]) {
    const y = u => LAGRANGE.phi(u) + k * u;
    const chord = y(1) - y(0);
    const slope = (y(LAGRANGE.xi + 1e-6) - y(LAGRANGE.xi - 1e-6)) / 2e-6;
    assert.ok(Math.abs(slope - chord) < 1e-6);
  }
});

test('柯西：g′ 处处不为零，ξ 在区间内部，切线与弦平行', () => {
  for (let t = 0; t <= 1; t += 0.001) assert.ok(CAUCHY.dg(t) > 0.1);
  const t = CAUCHY.xi;
  assert.ok(t > 0.05 && t < 0.95);
  const dx = CAUCHY.g(1) - CAUCHY.g(0), dy = CAUCHY.f(1) - CAUCHY.f(0);
  assert.ok(Math.abs(CAUCHY.df(t) / CAUCHY.dg(t) - dy / dx) < 1e-6);
});

const energy = (t, ms) => {
  const s = Math.round(t * SAMPLE_RATE), n = Math.round(ms * SAMPLE_RATE / 1000);
  let e = 0;
  for (let i = s; i < s + n; i++) e += MIX.left[i] ** 2 + MIX.right[i] ** 2;
  return e / n;
};

test('配乐：长度正确，不削顶，切点有明显起音，全程不断', () => {
  assert.equal(MIX.left.length, SAMPLE_RATE * SECONDS);
  let peak = 0;
  for (let i = 0; i < MIX.left.length; i++) peak = Math.max(peak, Math.abs(MIX.left[i]), Math.abs(MIX.right[i]));
  assert.ok(peak < 0.9, `峰值 ${peak}`);
  for (const b of [0, ...CUT_BEATS]) {
    const t = b * 0.5;
    const after = energy(t, 15);
    const before = t >= 0.05 ? energy(t - 0.035, 30) : 0;
    assert.ok(after > 3 * before, `第 ${b} 拍起音不明显：${after} vs ${before}`);
  }
  for (let s = 0; s < SECONDS - 1.5; s += 1) assert.ok(Math.sqrt(energy(s, 1000)) > 0.01, `第 ${s} 秒过静`);
});
