import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseLrc, lyricTimeline, lyricAtFrame} from './lyrics.js';

const lrc = readFileSync(new URL('../會呼吸的痛.lrc', import.meta.url), 'utf8');
const measured = JSON.parse(readFileSync(new URL('./人聲測量.json', import.meta.url), 'utf8'));
const FPS = 12;
const timeline = lyricTimeline(lrc, measured, FPS);

test('37 句歌词原文与时间直接读取 LRC', () => {
  const raw = lrc.trim().split('\n');
  assert.equal(timeline.length, 37);
  assert.deepEqual(timeline.map(l => l.text), raw.map(l => l.replace(/^\[[^\]]+\]/, '')));
  assert.equal(parseLrc(lrc)[0].start, 18.16);
  assert.throws(() => parseLrc('没有时间标签'), RangeError);
});

test('每句在最接近 LRC 起点的影格出现，误差不超过半帧', () => {
  for (const line of timeline) {
    assert.ok(Math.abs(line.onFrame / FPS - line.start) <= 0.5 / FPS + 1e-9, line.text);
    assert.equal(lyricAtFrame(timeline, line.onFrame).text, line.text);
    assert.notEqual(lyricAtFrame(timeline, line.onFrame - 1)?.text, line.text);
  }
});

test('歌词不重叠，至少停留 2 秒，人声结束后的长空档不留字', () => {
  for (const [i, line] of timeline.entries()) {
    assert.ok(line.offFrame - line.onFrame >= 2 * FPS, line.text);
    if (timeline[i + 1]) assert.ok(line.offFrame <= timeline[i + 1].onFrame, line.text);
  }
  assert.equal(lyricAtFrame(timeline, Math.round(110 * FPS)), null);
  assert.equal(lyricAtFrame(timeline, Math.round(209 * FPS)), null);
  assert.equal(lyricAtFrame(timeline, Math.round(249 * FPS)), null);
  assert.equal(lyricAtFrame(timeline, Math.round(270 * FPS)), null);
  assert.equal(lyricAtFrame(timeline, 0), null);
});

test('后面紧接下一句时不淡出，空档前用三帧退场', () => {
  assert.equal(lyricAtFrame(timeline, timeline[6].offFrame - 1).fade, 1);
  const beforeGap = timeline[13];
  assert.ok(lyricAtFrame(timeline, beforeGap.offFrame - 1).fade < 1);
  assert.equal(lyricAtFrame(timeline, beforeGap.offFrame - 4).fade, 1);
});
