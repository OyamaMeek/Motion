import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SHOTS, SONG_SECONDS, shotIndexAt, frameTimes, shotCaption} from './shots.js';

const storyboard = readFileSync(new URL('../會呼吸的痛storyboard.md', import.meta.url), 'utf8');
const beats = readFileSync(new URL('../節拍點.csv', import.meta.url), 'utf8').trim().split('\n').slice(1).map(l => Number(l.split(',')[1]));
const seconds = s => { const [m, r] = s.split(':'); return Number(m) * 60 + Number(r); };

test('41 镜的起止与分镜表逐项一致', () => {
  assert.equal(SHOTS.length, 41);
  for (const shot of SHOTS) {
    const line = storyboard.split('\n').find(l => l.startsWith(`| ${shot.id} |`));
    assert.ok(line, shot.id);
    const m = line.match(/(\d\d:\d\d\.\d{3})–(\d\d:\d\d\.\d{3})/);
    assert.ok(Math.abs(seconds(m[1]) - shot.start) < 0.0015, `${shot.id} 起点`);
    assert.ok(Math.abs(seconds(m[2]) - shot.end) < 0.0015, `${shot.id} 终点`);
  }
});

test('镜头连续覆盖全片，内部切点都是实测节拍', () => {
  assert.equal(SHOTS[0].start, 0);
  assert.equal(SHOTS.at(-1).end, SONG_SECONDS);
  for (let i = 1; i < SHOTS.length; i++) {
    assert.equal(SHOTS[i].start, SHOTS[i - 1].end);
    assert.ok(beats.some(b => Math.abs(b - SHOTS[i].start) < 0.001), `${SHOTS[i].id} 不是节拍点`);
  }
});

test('总览说明：歌词镜头取分镜表原文，前奏与间奏标明段落', () => {
  const lrc = readFileSync(new URL('../會呼吸的痛.lrc', import.meta.url), 'utf8').trim().split('\n').map(l => l.replace(/^\[[^\]]+\]/, ''));
  const lyricShots = SHOTS.filter(s => s.id.startsWith('L'));
  assert.deepEqual(lyricShots.map(s => shotCaption(s, storyboard)), lrc);
  assert.equal(shotCaption(SHOTS[0], storyboard), '前奏');
  assert.equal(shotCaption(SHOTS.find(s => s.id === 'I02'), storyboard), '间奏');
  assert.throws(() => shotCaption({id: 'L99'}, storyboard), RangeError);
});

test('任意时刻只属于一个镜头，超出范围明确失败', () => {
  assert.equal(SHOTS[shotIndexAt(0)].id, 'P01');
  assert.equal(SHOTS[shotIndexAt(18.1)].id, 'L01');
  assert.equal(SHOTS[shotIndexAt(SONG_SECONDS)].id, 'L37');
  assert.throws(() => shotIndexAt(-1), RangeError);
  assert.ok(frameTimes(12).length >= SONG_SECONDS * 12);
});
