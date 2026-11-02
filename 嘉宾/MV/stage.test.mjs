// 用法：node --test 嘉宾/MV/stage.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseStoryboard} from './gen-shots.mjs';
import {SHOTS, DURATION} from './shots.js';
import {openChrome} from '../../會呼吸的痛/開場樣圖/v2/chrome.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SUBTITLE_TOP = 950;

test('shots.js 与已确认的分镜一致', () => {
  const parsed = parseStoryboard(readFileSync(path.join(here, '../storyboard.md'), 'utf8'));
  assert.deepEqual(SHOTS, parsed);
  assert.equal(SHOTS.length, 52);
  assert.equal(DURATION, 333.677);
});

test('每个定格的关键物件都在画面内，主角朝向符合分镜', async () => {
  const chrome = await openChrome();
  try {
    await chrome.openStyle('paper', here);
    const report = await chrome.evaluate('window.stage.inspectAll()');
    const again = await chrome.evaluate('window.stage.inspectAll()');
    assert.deepEqual(report.errors, []);
    assert.equal(report.shots.length, 52);
    report.shots.forEach((shot, i) => {
      const plan = SHOTS[i];
      assert.equal(shot.id, plan.id);
      assert.ok(shot.keys.length > 0, `${shot.id} 没有声明关键物件`);
      for (const key of shot.keys) {
        const box = shot.marks[key];
        assert.ok(box, `${shot.id} 缺少 ${key}`);
        assert.ok(box.x1 > 0 && box.y1 > 0 && box.x0 < 1920 && box.y0 < 1080, `${shot.id} 的 ${key} 在画面外`);
        const w = Math.min(box.x1, 1920) - Math.max(box.x0, 0), h = Math.min(box.y1, 1080) - Math.max(box.y0, 0);
        assert.ok(w * h >= 0.6 * (box.x1 - box.x0) * (box.y1 - box.y0), `${shot.id} 的 ${key} 被裁掉过多`);
        assert.ok(box.y0 < SUBTITLE_TOP, `${shot.id} 的 ${key} 落在字幕区`);
      }
      if (plan.absent) assert.equal(shot.me, null, `${shot.id} 不应出现主角`);
      else if (plan.facing && plan.id !== 'L25') assert.equal(shot.me, plan.facing, `${shot.id} 主角朝向`);
      assert.ok(shot.stats.spread > 12, `${shot.id} 画面过于单调：${shot.stats.spread}`);
      assert.ok(shot.stats.meanLuma > 70, `${shot.id} 偏暗：${shot.stats.meanLuma}`);
      assert.ok(shot.stats.purplePct < 0.5, `${shot.id} 出现紫色：${shot.stats.purplePct}`);
      assert.equal(shot.stats.opaque, true);
      assert.equal(shot.hash, again.shots[i].hash, `${shot.id} 两次绘制不同`);
    });
    assert.deepEqual(report.shots.filter(s => s.me === 'back').map(s => s.id), ['P01']);
    assert.equal(new Set(report.shots.map(s => s.hash)).size, 52, '有重复画面');
  } finally {
    await chrome.close();
  }
});

// 衔接表要求这些物件在切点之前已经在画面或世界里，否则会凭空出现或消失。
const CARRIED = {
  P02: ['tally'], L01: ['sill', 'dustMug'], L02: ['phone'], L04: ['photo', 'sill'], L07: ['doorFront'], L09: ['archPost'], L10: ['heldPhoto'],
  L14: ['gapTiles'], L15: ['gapTiles', 'envelope'], I02: ['glass', 'hallWindow'], L17: ['exitDoor', 'placeCard'], L18: ['ringBox'],
  L21: ['glass', 'hallWindow'], L22: ['glass', 'hallWindow'], L23: ['lastRow', 'placeCard'], L24: ['glass', 'petal'], L26: ['glass'],
  L27: ['nearCard'], L28: ['glass', 'tickets', 'nearCard'], L33: ['rope'], L34: ['spotlight'], L35: ['road'], L37: ['road'],
};

test('定格符合衔接表', async () => {
  const chrome = await openChrome();
  try {
    await chrome.openStyle('paper', here);
    const {shots} = await chrome.evaluate('window.stage.inspectAll()');
    const at = Object.fromEntries(shots.map(s => [s.id, s.marks]));
    for (const [id, names] of Object.entries(CARRIED)) for (const name of names) assert.ok(at[id][name], `${id} 缺少 ${name}`);
    assert.equal(at.L07.doorBack, undefined, 'L07 身后不应再有门');
    const width = (id, name) => at[id][name].x1 - at[id][name].x0;
    for (const [id, u] of [['L07', 20], ['L08', 17], ['L09', 14]]) assert.ok(Math.abs(width(id, 'invite') / u - 11.5) < 1.2, `${id} 喜帖比例 ${width(id, 'invite') / u}`);
    assert.ok(Math.abs(at.L05.me.y1 - 900) < 1, `L05 脚底 ${at.L05.me.y1}`);
    assert.ok(Math.abs(at.L03.me.y1 - 777.5) < 1, `L03 脚底 ${at.L03.me.y1}`);
    const aspect = box => (box.x1 - box.x0) / (box.y1 - box.y0);
    assert.ok(Math.abs(aspect(at.L04.roomWindow) - aspect(at.L05.bigWindow)) < 0.1, 'L04 与 L05 的窗宽高比不同');
  } finally {
    await chrome.close();
  }
});
