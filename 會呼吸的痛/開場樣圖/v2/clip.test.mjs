import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLIP, FINAL_STATE, clipState, clipTicks, jitter, isLit} from './clip.js';

const csv = readFileSync(new URL('../../節拍點.csv', import.meta.url), 'utf8');

test('节拍来自报告 CSV，只取试片范围内的点', () => {
  const expected = csv.trim().split('\n').slice(1).map(l => Number(l.split(',')[1]))
    .filter(t => t >= CLIP.start && t < CLIP.end).map(t => Number(t.toFixed(3)));
  assert.deepEqual(CLIP.beats, expected);
});

test('试片帧数符合各画风的更新频率', () => {
  assert.equal(clipTicks(12).length, 120);
  assert.equal(clipTicks(10).length, 100);
  assert.equal(clipTicks(8).length, 80);
  assert.equal(clipTicks(10)[0], CLIP.start);
});

test('Clawd 走入时位置和动作帧都是离散整数，没有补间', () => {
  const seen = new Set();
  for (const t of clipTicks(120)) {
    const s = clipState(t);
    for (const v of [s.x, s.y, s.frame, s.caseX, s.stars]) assert.ok(Number.isInteger(v), `${t}: ${v}`);
    seen.add(`${s.x},${s.frame},${s.action}`);
  }
  const walk = clipTicks(120).filter(t => clipState(t).action === 'walk').map(t => clipState(t));
  const distinctX = new Set(walk.map(s => s.x));
  assert.ok(distinctX.size <= 14, `走路位置 ${distinctX.size} 个`);
  for (const a of walk) assert.equal(Math.abs(a.x - walk[0].x) % 8, 0);
  assert.ok(new Set(walk.map(s => s.frame)).size === 4);
});

test('Clawd 从画外走入，L01 之前坐上长椅', () => {
  assert.ok(clipState(CLIP.start).x >= 320);
  assert.equal(clipState(17).action, 'walk');
  assert.equal(clipState(17.7).action, 'jump');
  const seated = clipState(18.16);
  assert.equal(seated.action, 'idle');
  assert.equal(seated.x, FINAL_STATE.x);
  assert.equal(seated.y, FINAL_STATE.y);
});

test('行李箱跟随 Clawd 并停在样图位置', () => {
  assert.equal(clipState(15).caseX, clipState(15).x + 35);
  assert.equal(clipState(18.16).caseX, FINAL_STATE.caseX);
});

test('灯和光点随节拍只增不减，结尾与静态样图一致', () => {
  let lit = 0, stars = 0;
  for (const t of clipTicks(24)) {
    const s = clipState(t);
    assert.ok(s.lit >= lit && s.stars >= stars);
    lit = s.lit; stars = s.stars;
  }
  const end = clipState(CLIP.end - 0.01);
  assert.equal(end.lit, FINAL_STATE.lit);
  assert.equal(end.stars, FINAL_STATE.stars);
});

test('纸艺抖动每次每轴都是 1–2 像素，相同输入结果相同', () => {
  for (let tick = 0; tick < 100; tick++) for (let layer = 0; layer < 30; layer++) {
    const {dx, dy} = jitter(layer, tick);
    assert.ok([1, 2].includes(Math.abs(dx)) && [1, 2].includes(Math.abs(dy)));
    assert.deepEqual(jitter(layer, tick), {dx, dy});
  }
  const moves = new Set(Array.from({length: 40}, (_, tick) => JSON.stringify(jitter(3, tick))));
  assert.ok(moves.size > 3);
});

test('灯的点亮顺序固定，比例为 1 时全亮', () => {
  for (let i = 0; i < 200; i++) {
    assert.equal(isLit(i, 1), true);
    assert.equal(isLit(i, 0), false);
    assert.equal(isLit(i, 0.5), isLit(i, 0.5));
  }
});
