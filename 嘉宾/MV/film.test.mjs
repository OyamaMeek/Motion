// 用法：node --test 嘉宾/MV/film.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {openChrome} from '../../會呼吸的痛/開場樣圖/v2/chrome.mjs';
import {parseLrc, lyricTimeline, lyricAtFrame} from './lyrics.js';
import {FPS, FRAME_COUNT, TICK_HZ, BEAT, TRANSITIONS, locate} from './film.js';
import {SHOTS} from './shots.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const LRC = readFileSync(path.join(here, '../嘉宾.lrc'), 'utf8');
const STORY = readFileSync(path.join(here, '../storyboard.md'), 'utf8');
const TABLE = [...STORY.matchAll(/^\| T(\d+) \| (\w+) → (\w+) \| ([\d:.]+) #\d+ \| (实物遮挡|撕开|同场延续) \|/gm)]
  .map(m => ({n: Number(m[1]), from: m[2], to: m[3], kind: {实物遮挡: 'cover', 撕开: 'tear', 同场延续: 'same'}[m[5]]}));

test('歌词来自 LRC：46 句，起点取最近影格，只在两处长空档提前消失', () => {
  const lines = parseLrc(LRC), timeline = lyricTimeline(LRC, FPS);
  assert.equal(lines.length, 46);
  assert.equal(timeline.length, 46);
  for (const row of timeline) assert.ok(Math.abs(row.onFrame / FPS - row.start) <= 0.5 / FPS + 1e-9, `L${row.line}`);
  assert.deepEqual(timeline.filter(r => r.clears).map(r => r.line), [16, 46]);
  assert.equal(lyricAtFrame(timeline, 0), null);
  assert.equal(lyricAtFrame(timeline, Math.round(21.26 * FPS)).line, 1);
  assert.equal(lyricAtFrame(timeline, Math.round(120 * FPS)), null);
  assert.equal(lyricAtFrame(timeline, Math.round(200 * FPS)).line, 27);
  assert.equal(lyricAtFrame(timeline, FRAME_COUNT - 1), null);
});

test('时间轴：30 fps，纸片每秒更新 10 次，衔接方式与分镜表一致', () => {
  assert.equal(FPS, 30);
  assert.equal(TICK_HZ, 10);
  assert.equal(FRAME_COUNT, 10011);
  assert.equal(TABLE.length, 51);
  for (const row of TABLE) {
    const to = SHOTS.findIndex(s => s.id === row.to);
    assert.equal(SHOTS[to - 1].id, row.from);
    assert.equal(TRANSITIONS[row.to].kind, row.kind, `T${row.n}`);
    assert.equal(TRANSITIONS[row.to].t, row.n);
  }
  // 遮挡：半拍之内画上一镜，半拍之后画下一镜。
  const cut = SHOTS.find(s => s.id === 'P02').start;
  assert.equal(locate(cut + 0.1).id, 'P01');
  assert.equal(locate(cut + BEAT / 2 + 0.02).id, 'P02');
  assert.ok(locate(cut + BEAT + 0.1).transition === null);
  // 每个镜头的动作节奏从切点算起，切点那一帧已经属于下一镜。
  const same = SHOTS.find(s => s.id === 'L01');
  assert.equal(locate(same.start + 0.001).id, 'L01');
  assert.equal(locate(same.start + 0.001).q, 0);
  assert.equal(locate(same.start + 0.25).q, 0.2);
});

test('全片：51 处接缝没有可见跳变，定格帧符合分镜，抖动规则正确', {timeout: 600000}, async () => {
  const chrome = await openChrome();
  try {
    await chrome.openStyle('paper', here);
    const report = await chrome.evaluate('window.film.seamReport()');
    assert.deepEqual(report.errors, []);
    assert.equal(report.seams.length, 51);
    const bad = report.seams.filter(s => s.diff > s.limit);
    assert.deepEqual(bad, [], `接缝跳变：${JSON.stringify(bad)}`);
    // 遮挡盖满时，换背景不能露出来：盖满前后的画面几乎相同。
    for (const s of report.seams.filter(x => x.kind === 'cover' && !x.fullAtCut)) assert.ok(s.swapDiff < 2.5, `${s.to} 换背景时露出：${s.swapDiff}`);
    // 同场延续：切点前后主角方框不变。
    for (const s of report.seams.filter(x => x.kind === 'same' && x.boxDelta !== null)) assert.ok(s.boxDelta < 3, `${s.to} 主角方框跳了 ${s.boxDelta}`);
    const boil = await chrome.evaluate('window.film.boilReport()');
    assert.ok(boil.moving > 0, '平时纸片应当抖动');
    assert.equal(boil.frozenL04, 0, 'L04 第二拍起应当完全静止');
    assert.equal(boil.frozenO02, 0, 'O02 05:29.166 起应当完全静止');
    assert.ok(boil.maxShift[0] >= 1 && boil.maxShift[1] <= 2, `抖动幅度 ${boil.maxShift}`);
  } finally {
    await chrome.close();
  }
});

// 逐镜逐 tick 比较，全片约需 10 分钟；分四个 Chrome 并行。
test('物件不凭空出现：每镜内部相邻 tick 没有大面积突变', {timeout: 1200000}, async () => {
  const queue = SHOTS.map((_, i) => i), pops = [], errors = [];
  await Promise.all(Array.from({length: 4}, async () => {
    const chrome = await openChrome();
    try {
      await chrome.openStyle('paper', here);
      for (let i = queue.shift(); i !== undefined; i = queue.shift()) {
        const part = await chrome.evaluate(`window.film.popReport(${i}, ${i + 1})`);
        pops.push(...part.pops); errors.push(...part.errors);
        console.log(`${SHOTS[i].id} ${JSON.stringify(part.pops)}`);
      }
    } finally {
      await chrome.close();
    }
  }));
  assert.deepEqual(errors, []);
  assert.deepEqual(pops, [], `镜头内部跳变：${JSON.stringify(pops)}`);
});
