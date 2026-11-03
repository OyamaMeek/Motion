import test from 'node:test';
import assert from 'node:assert/strict';
import {BEAT_FRAMES, FLIP_FRAMES, FPS, FRAME_COUNT, PAGES, SAMPLE_RATE, frameState} from './timeline.js';
import {NODES, OUTRO, INTRO, SOURCES, allLines} from './script.js';
import {synthesize} from './music.mjs';

test('30 秒、120 BPM，每次翻页在拍点落定', () => {
  assert.equal(FPS, 30);
  assert.equal(FRAME_COUNT, 900);
  assert.equal(BEAT_FRAMES, 15);
  assert.equal(PAGES.reduce((s, p) => s + p.beats, 0), 60);
  for (const [i, page] of PAGES.entries()) {
    assert.equal(page.land % BEAT_FRAMES, 0, `${page.id} 落点不在拍上`);
    if (i === 0) continue;
    assert.deepEqual(frameState(page.land), {page: i, local: 0, flip: null});
    const before = frameState(page.land - 1);
    assert.equal(before.flip.to, i);
    assert.ok(before.flip.progress > 0.9 && before.flip.progress < 1);
    assert.equal(frameState(page.land - FLIP_FRAMES).flip.progress, 0);
    assert.equal(frameState(page.land - FLIP_FRAMES - 1).flip, null);
  }
});

test('每句文字都标了来源，日期、年份和时间尺标签一致', () => {
  for (const line of allLines()) {
    assert.ok(line.refs.length > 0, `缺来源：${line.text}`);
    for (const r of line.refs) assert.ok(SOURCES[r], `来源 ${r} 不存在`);
  }
  assert.equal(NODES.length, 5);
  assert.deepEqual(PAGES.map(p => p.id), ['intro', ...NODES.map(n => n.id), 'outro']);
  let last = '';
  for (const node of NODES) {
    const [y, m] = node.date.split('-');
    assert.equal(node.year, y);
    assert.equal(node.mark, `${y}.${m}`);
    assert.ok(node.date > last, '节点按时间顺序');
    last = node.date;
    const month = node.dateline.text.match(/^(\d+)月/);
    if (month) assert.equal(Number(month[1]), Number(m), `${node.id} 日期行月份`);
    else assert.ok(node.dateline.text.includes(y), `${node.id} 日期行年份`);
    assert.ok(SOURCES[node.dateline.refs[0]].date.startsWith(node.date.slice(0, 7)), `${node.id} 与来源日期`);
  }
  assert.equal(OUTRO.checklist.length, NODES.length);
  assert.ok(INTRO.title.text.length <= 12);
});

test('不用口号和夸张结论', () => {
  const banned = ['保持理性', '提高认知', '加强自律', '彻底摆脱', '读懂了你', '全部', '而是', '控制了你', '操控'];
  for (const line of allLines()) for (const word of banned) assert.ok(!line.text.includes(word), `${line.text} 含 ${word}`);
});

test('配乐的重音落在每个翻页拍点', () => {
  const {left, right} = synthesize();
  assert.equal(left.length, SAMPLE_RATE * 30);
  assert.equal(right.length, left.length);
  const win = Math.round(SAMPLE_RATE * 0.01);
  const energy = t => {
    const s = Math.round(t * SAMPLE_RATE);
    let e = 0;
    for (let i = s; i < s + win; i++) e += left[i] ** 2 + right[i] ** 2;
    return e;
  };
  for (const page of PAGES.slice(1)) {
    const t = page.land / FPS;
    assert.ok(energy(t) > 4 * energy(t - 0.03), `${page.id} 拍点 ${t}s 没有起音`);
  }
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  assert.ok(peak < 0.95 && peak > 0.3, `峰值 ${peak}`);
});
