import test from 'node:test';
import assert from 'node:assert/strict';
import {BEATS, BEAT_FRAMES, FPS, FRAME_COUNT, OPEN_ROW_BEAT, OPEN_SLAM_STEP, OPEN_SNAP_BEAT, PAGES, SAMPLE_RATE, SECONDS, frameState} from './timeline.js';
import {MOTTO, SCRIPT, SOURCES, allLines} from './script.js';
import {ACCENT_BEATS, synthesize} from './music.mjs';

test('90 秒、120 BPM、180 拍，每页在拍点落定', () => {
  assert.equal(FPS, 30);
  assert.equal(BEAT_FRAMES, 15);
  assert.equal(BEATS, 180);
  assert.equal(FRAME_COUNT, 2700);
  assert.equal(SECONDS, 90);
  assert.equal(PAGES.reduce((s, p) => s + p.beats, 0), BEATS);
  for (const [i, page] of PAGES.entries()) {
    assert.equal(page.land, page.beat * BEAT_FRAMES);
    assert.equal(frameState(page.land).index, i);
    assert.equal(frameState(page.land).local, 0);
    if (i > 0) assert.equal(frameState(page.land - 1).index, i - 1);
  }
  assert.throws(() => frameState(FRAME_COUNT));
});

test('每句事实和引语都有来源，来源都存在', () => {
  for (const line of allLines()) {
    if (line.kind === 'fact' || line.kind === 'quote') assert.ok(line.refs.length > 0, `缺来源：${line.text}`);
    for (const r of line.refs) assert.ok(SOURCES[r], `来源 ${r} 不存在`);
    if (line.kind === 'view') assert.equal(line.refs.length, 0);
  }
  for (const s of Object.values(SOURCES)) assert.match(s.url, /^https:\/\//);
});

test('人名、日期、职务与来源一致', () => {
  const all = allLines().map(l => l.text).join('\n');
  assert.ok(all.includes('1980.5—1982.12'));
  assert.ok(all.includes('杭州电子工业学院首任院长'));
  assert.ok(all.includes('1979年2月'));
  assert.ok(all.includes('2026年10月16日晚'));
  assert.ok(SCRIPT.y1979.age.text === '73');
  assert.ok(SCRIPT.aid.legend.text.match(/\d+/g).map(Number).reduce((a, b) => a + b) === 58);
  for (const wrong of ['1939年获', '1936年获', '病床', '绝笔', '临终', '五中全会', '头像']) assert.ok(!all.includes(wrong), `不应出现：${wrong}`);
});

test('逐字打出的行从整拍开始，打完后留够阅读时间', () => {
  for (const page of PAGES) {
    const lines = [];
    const walk = v => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object' && 'kind' in v) lines.push(v);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    // 右上角标是常驻的章节信息，不计入本页阅读量。年份、人名、地名、图例、科目和重复出现的八个字方块扫一眼即可。
    const {corner, legend, names, years, subjects, term, year, age, ageUnit, count, total, first, credits, places, cubes, slam, ...body} = SCRIPT[page.id];
    walk(body);
    const glance = [legend, names, years, subjects, term, year, age, ageUnit, count, total, first, credits, places, cubes, slam].flat().filter(Boolean);
    // 句子按每秒 6 字算阅读量；句子连同短标签合计不超过每秒 8.5 字。
    let chars = glance.reduce((s, l) => s + [...l.text.replace(/[\s，。、：；“”（）《》·—…]/g, '')].length, 0), sentence = 0;
    for (const l of lines) {
      if (l.kind === 'label' && /^来源|示意/.test(l.text)) continue;
      const n = [...l.text.replace(/[\s，。、：；“”（）《》·—…]/g, '')].length;
      chars += n;
      sentence += n;
      if (l.kind !== 'label' && l.at > 0 && l.text.length > 3) {
        assert.ok(Number.isInteger(l.at) || page.id === 'hire' || page.id === 'ours', `${page.id}「${l.text}」不在整拍`);
        const done = l.at + [...l.text].length * 3 / BEAT_FRAMES;
        assert.ok(done + 1.5 <= page.beats, `${page.id}「${l.text}」打完后不足 0.75 秒就翻页`);
      }
    }
    const seconds = page.beats / 2;
    assert.ok(sentence / seconds <= 6, `${page.id} 句子每秒 ${(sentence / seconds).toFixed(1)} 字，超过 6 字`);
    assert.ok(chars / seconds <= 8.5, `${page.id} 全部文字每秒 ${(chars / seconds).toFixed(1)} 字，超过 8.5 字`);
  }
});

test('不用口号和被禁的句式', () => {
  const banned = ['而是', '不是', '落地', '钉死', '对齐', '赋能', '伟大', '永远', '必将', '一定要'];
  for (const line of allLines()) for (const word of banned) assert.ok(!line.text.includes(word), `${line.text} 含 ${word}`);
});

test('开场从第 0 帧起每半拍砸下一个字，第 7 拍人名聚成', () => {
  assert.equal(PAGES[0].id, 'open');
  assert.equal(PAGES[0].beats, 12);
  assert.equal(OPEN_SNAP_BEAT, 7);
  assert.deepEqual(SCRIPT.open.slam.map(l => l.text), [...MOTTO.lines.join('')]);
  assert.equal(OPEN_SLAM_STEP * SCRIPT.open.slam.length, OPEN_ROW_BEAT);
  SCRIPT.open.slam.forEach((l, i) => {
    assert.equal(l.at, i * OPEN_SLAM_STEP);
    assert.deepEqual(l.refs, MOTTO.refs);
  });
  const {left, right} = synthesize();
  const win = Math.round(SAMPLE_RATE * 0.01);
  const energy = t => {
    const s = Math.round(t * SAMPLE_RATE);
    let e = 0;
    for (let i = s; i < s + win; i++) e += left[i] ** 2 + right[i] ** 2;
    return e;
  };
  assert.ok(energy(0) > 0.05, `第 0 帧没有重击：${energy(0)}`);
  for (const l of SCRIPT.open.slam.slice(1)) {
    const t = l.at * 0.5;
    assert.ok(energy(t) > 3 * energy(t - 0.03), `开场第 ${l.at} 拍没有重击`);
  }
});

test('配乐在每个落拍帧起音，没有削波', () => {
  const {left, right} = synthesize();
  assert.equal(left.length, SAMPLE_RATE * SECONDS);
  const win = Math.round(SAMPLE_RATE * 0.01);
  const energy = t => {
    const s = Math.round(t * SAMPLE_RATE);
    let e = 0;
    for (let i = s; i < s + win; i++) e += left[i] ** 2 + right[i] ** 2;
    return e;
  };
  for (const beat of ACCENT_BEATS) {
    const t = beat * 0.5;
    assert.ok(energy(t) > 3 * energy(t - 0.03), `第 ${beat} 拍 ${t}s 没有起音`);
  }
  for (const page of PAGES.slice(1)) assert.ok(ACCENT_BEATS.includes(page.beat));
  // 片尾和弦落在不在小节首拍的第 166 拍，淡出前每秒都要有声音。
  for (let s = 0; s + 1 <= SECONDS - 2.5; s++) {
    let e = 0;
    for (let i = s * SAMPLE_RATE; i < (s + 1) * SAMPLE_RATE; i++) e += left[i] ** 2;
    assert.ok(Math.sqrt(e / SAMPLE_RATE) > 0.01, `第 ${s} 秒没有声音`);
  }
  let peak = 0;
  for (let i = 0; i < left.length; i++) peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  assert.ok(peak < 0.9 && peak > 0.3, `峰值 ${peak}`);
});
