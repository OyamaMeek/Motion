import test from 'node:test';
import assert from 'node:assert/strict';
import {BEATS, BEAT_FRAMES, CUT_BEATS, CUT_FRAMES, FPS, FRAME_COUNT, HIT_BEATS, KEYS, SAMPLE_RATE, SCENES, SECONDS, frameState} from './timeline.js';
import {TEXT, allText, plain} from './script.js';
import {CURVE, GROW_N, LIMIT, curveTaylor, eulerBound, eulerPartial, expXi, factorial, sinRange, sinTaylor, taylor} from './math.js';
import {BGM, BGM_SEGMENTS, BGM_STRETCH, bgmBeatAt, synthesize} from './audio.mjs';
import {REEL} from './reel.js';

const MIX = synthesize();

test('152 秒、30 fps、120 BPM、304 拍', () => {
  assert.equal(FPS, 30);
  assert.equal(BEAT_FRAMES, 15);
  assert.equal(BEATS, 304);
  assert.equal(FRAME_COUNT, 4560);
  assert.equal(SECONDS, 152);
  assert.equal(SAMPLE_RATE, 48000);
});

test('11 个场景首尾相接，切点在小节首拍', () => {
  assert.deepEqual(SCENES.map(s => s.id), ['overture', 'tangent', 'coeff', 'poly', 'peano', 'maclaurin', 'limit', 'lagrange', 'euler', 'range', 'finale']);
  assert.equal(SCENES.reduce((s, x) => s + x.beats, 0), BEATS);
  assert.deepEqual(CUT_BEATS, [32, 56, 84, 116, 144, 176, 204, 236, 260, 280]);
  assert.deepEqual(CUT_FRAMES, CUT_BEATS.map(b => b * 15));
  for (const b of CUT_BEATS) assert.equal(b % 4, 0);
  for (const [i, s] of SCENES.entries()) {
    assert.equal(frameState(s.start).index, i);
    assert.equal(frameState(s.start).local, 0);
    if (i > 0) assert.equal(frameState(s.start - 1).index, i - 1);
  }
  assert.throws(() => frameState(FRAME_COUNT));
  assert.throws(() => frameState(-1));
});

test('关键拍都在场景长度之内，重音包含全部切点', () => {
  for (const s of SCENES) {
    const flat = Object.values(KEYS[s.id]).flat();
    assert.ok(flat.length > 0);
    for (const b of flat) assert.ok(b >= 0 && b <= s.beats, `${s.id} 关键拍 ${b} 越界`);
  }
  for (const b of [0, ...CUT_BEATS]) assert.ok(HIT_BEATS.includes(b), `缺少重音 ${b}`);
  assert.deepEqual(HIT_BEATS, [...HIT_BEATS].sort((a, b) => a - b));
});

test('字少而大：每条字幕不超过 14 字，不讲制作手段', () => {
  for (const s of SCENES) assert.ok(TEXT[s.id], `${s.id} 没有文字`);
  for (const t of allText()) {
    const n = [...plain(t).replace(/\s/g, '')].length;
    assert.ok(n <= 14, `过长（${n} 字）：${t}`);
  }
  const joined = allText().map(plain).join('\n');
  for (const banned of ['不是', '而是', '落地', '对齐', '钉死']) assert.ok(!joined.includes(banned), `出现禁用说法：${banned}`);
  for (const banned of ['代码', '每一帧', '帧', 'renderFrame']) assert.ok(!joined.includes(banned), `出现制作手段的说法：${banned}`);
  // Songti SC 缺上标数字字形，上标一律用 ^{}
  assert.ok(!/[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(allText().join('')));
});

test('泰勒多项式在 x₀ 处与曲线同值、直到 n 阶导数都相同', () => {
  for (const n of [0, 1, 2, 5, 8]) {
    const T = curveTaylor(n);
    for (let j = 0; j <= n; j++) assert.ok(Math.abs(T.deriv(CURVE.x0, j) - CURVE.d(j, CURVE.x0)) < 1e-9, `n=${n} 第 ${j} 阶`);
  }
  // 数值导数核对 CURVE.d 的闭式
  const h = 1e-5, x = 1.3;
  assert.ok(Math.abs((CURVE.f(x + h) - CURVE.f(x - h)) / (2 * h) - CURVE.d(1, x)) < 1e-8);
  assert.ok(Math.abs(CURVE.d(0, x) - CURVE.f(x)) < 1e-12);
});

test('系数：p(x)=Σaₖxᵏ 在 0 处的 k 阶导数是 k!·aₖ', () => {
  const a = [0.7, -1.2, 0.4, 2.5, -0.3];
  const p = taylor(k => a[k] * factorial(k), 0, 4);
  for (let k = 0; k <= 4; k++) {
    assert.ok(Math.abs(p.coef[k] - a[k]) < 1e-12);
    assert.ok(Math.abs(p.deriv(0, k) - factorial(k) * a[k]) < 1e-12);
  }
  assert.equal(factorial(3), 3 * 2 * 1);
});

test('佩亚诺：Rₙ(x)/(x−x₀)ⁿ 随 x→x₀ 趋于 0', () => {
  for (const n of [1, 2, 3]) {
    const T = curveTaylor(n);
    const ratio = h => Math.abs((CURVE.f(CURVE.x0 + h) - T.at(CURVE.x0 + h)) / h ** n);
    assert.ok(ratio(0.1) > ratio(0.01) && ratio(0.01) > ratio(0.001));
    assert.ok(ratio(0.001) < 0.01);
  }
});

test('开场：阶数逐拍升高，n = 40 时在 |x − x₀| ≤ 6 内贴住曲线', () => {
  assert.equal(GROW_N.length, KEYS.overture.grow.length);
  for (let i = 1; i < GROW_N.length; i++) assert.ok(GROW_N[i] > GROW_N[i - 1]);
  const T = curveTaylor(GROW_N.at(-1));
  for (let x = CURVE.x0 - 6; x <= CURVE.x0 + 6; x += 0.01) assert.ok(Math.abs(T.at(x) - CURVE.f(x)) < 0.005, `x=${x}`);
  // n = 1 时只贴住很小一段：离 x₀ 2 个单位就分开
  assert.ok(Math.abs(curveTaylor(1).at(CURVE.x0 + 2) - CURVE.f(CURVE.x0 + 2)) > 0.5);
});

test('转轮：每次停在 7j 格，停住时显示第 j 个公式', () => {
  for (const [j, b] of KEYS.maclaurin.faces.entries()) {
    assert.ok(Math.abs(REEL.position(b) - 7 * j) < 1e-9);
    assert.equal(((7 * j) % REEL.count + REEL.count) % REEL.count, j);
  }
  const ticks = REEL.ticks();
  assert.ok(ticks.length >= 6 * 7);
  for (let i = 1; i < ticks.length; i++) assert.ok(ticks[i] > ticks[i - 1]);
});

test('例 4：(cos x − e^(−x²/2))/x⁴ → −1/12', () => {
  assert.ok(Math.abs(LIMIT.answer + 1 / 12) < 1e-15);
  const x = 0.02;
  assert.ok(Math.abs((Math.cos(x) - Math.exp(-x * x / 2)) / x ** 4 + 1 / 12) < 1e-3);
});

test('例 6：加到 1/9! 时 e ≈ 2.718282，误差 < 3/10! < 10⁻⁶', () => {
  const s = eulerPartial(9);
  assert.equal(s.toFixed(6), '2.718282');
  assert.ok(Math.E - s > 0 && Math.E - s < eulerBound(9));
  assert.ok(eulerBound(9) < 1e-6);
  assert.ok(eulerBound(8) > 1e-6);
});

test('例 7：sin x 误差 < 10⁻³ 的范围 0.1817、0.6543，次数越高越宽', () => {
  const show = m => Math.floor(sinRange(m) * 1e4) / 1e4;
  assert.equal(show(1), 0.1817);
  assert.equal(show(2), 0.6543);
  for (let m = 1; m < 5; m++) assert.ok(sinRange(m + 1) > sinRange(m));
  for (let m = 1; m <= 5; m++) {
    const x = show(m), T = sinTaylor(2 * m - 1);
    assert.ok(Math.abs(Math.sin(x) - T.at(x)) < 1e-3);
  }
});

test('拉格朗日型余项：eˣ 的 ξ 在 (0, x) 内；n=0 即拉格朗日中值公式', () => {
  for (let n = 0; n <= 9; n++) {
    const xi = expXi(n, 1);
    assert.ok(xi > 0 && xi < 1, `n=${n} ξ=${xi}`);
  }
  const xi = expXi(0, 1);
  assert.ok(Math.abs(Math.E - 1 - Math.exp(xi) * 1) < 1e-12);
});

test('bgm：拉伸到 120 BPM，不剪辑，段落落在切点上', () => {
  assert.equal(BGM.downbeatPhase, 0);
  assert.ok(Math.abs(BGM_STRETCH - BGM.period / 0.5) < 1e-12);
  assert.deepEqual(BGM_SEGMENTS, [{from: 0, to: null, at: 0}]);
  assert.equal(BGM.key.name, 'F minor');
  const e = BGM.barEnergy, mean = a => a.reduce((x, y) => x + y, 0) / a.length;
  // bgm 第 8 小节（第 32 拍）正歌进来（切线），第 36—43 小节是间奏（麦克劳林），第 44 小节第二段进来（求极限）
  assert.ok(e[8] > 1.2 * mean(e.slice(0, 8)));
  assert.ok(mean(e.slice(36, 44)) < 0.85 * mean(e.slice(28, 36)));
  assert.ok(e[44] > 1.2 * mean(e.slice(36, 44)));
  assert.equal(bgmBeatAt(SCENES.find(s => s.id === 'tangent').beat), 32);
  assert.equal(SCENES.find(s => s.id === 'maclaurin').beat, 144);
  assert.equal(SCENES.find(s => s.id === 'limit').beat, 176);
  const endBeat = (BGM.duration - BGM.firstBar) / BGM.period;
  assert.ok(endBeat > BEATS - 8 && endBeat <= BEATS, `bgm 结束在第 ${endBeat} 拍`);
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
