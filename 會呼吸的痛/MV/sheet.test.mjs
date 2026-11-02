import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FPS} from './shots.js';
import {frameAt} from './film.js';
import {lyricTimeline} from './lyrics.js';
import {posedRects, clawdRects, CHARACTER_COLORS} from './geometry.js';
import {roughen, skyBands, wipeItems, layerOf, viewFor, worldMatrix, boilVersion} from './sheet.js';

const square = [[10, 10], [50, 10], [50, 40], [10, 40]];

test('撕边按 id 固定：同一物件平移后形状不变，不同物件不同', () => {
  const a = roughen(square, {step: 3, amp: 0.8, seed: 7});
  const moved = roughen(square.map(([x, y]) => [x + 100, y - 5]), {step: 3, amp: 0.8, seed: 7});
  assert.equal(a.length, moved.length);
  a.forEach(([x, y], i) => {
    assert.ok(Math.abs(moved[i][0] - x - 100) < 1e-9);
    assert.ok(Math.abs(moved[i][1] - y + 5) < 1e-9);
  });
  assert.notDeepEqual(a, roughen(square, {step: 3, amp: 0.8, seed: 8}));
});

test('撕边的起伏不超过 amp，且确实有起伏', () => {
  const edge = roughen(square, {step: 2, amp: 0.8, seed: 3});
  const off = edge.map(([x, y]) => Math.min(Math.abs(x - 10), Math.abs(x - 50), Math.abs(y - 10), Math.abs(y - 40)));
  assert.ok(Math.max(...off) <= 0.8 + 1e-9);
  assert.ok(Math.max(...off) > 0.2);
});

test('天空色带连续盖满，夜色加深时分界线下移', () => {
  const item = {y: 16, h: 128, stops: ['#1', '#2', '#3', '#4', '#5']};
  for (const shift of [0, 0.7, 1.6]) {
    const bands = skyBands({...item, shift});
    assert.equal(bands[0].top, 16);
    assert.equal(bands.at(-1).bottom, 144);
    for (let i = 1; i < bands.length; i++) assert.equal(bands[i].top, bands[i - 1].bottom);
  }
  const edge = shift => skyBands({...item, shift}).find(b => b.stop === '#3').top;
  assert.ok(edge(0) > edge(1.6));
});

test('六种换景实物都盖满全高，从 x 到 x + width', () => {
  for (const kind of ['post', 'envelope', 'calendar', 'plan', 'scarf', 'phone']) {
    const items = wipeItems({x: -30, width: 380, kind});
    const solid = items.find(i => i.kind === 'poly' && i.density === undefined && i.cover);
    assert.ok(solid, kind);
    const xs = solid.pts.map(p => p[0]), ys = solid.pts.map(p => p[1]);
    assert.ok(Math.min(...xs) <= -30 && Math.max(...xs) >= 350, kind);
    assert.ok(Math.min(...ys) <= 0 && Math.max(...ys) >= 180, kind);
    assert.ok(items.length > 2, `${kind} 需要材质`);
  }
});

test('角色和身上的物件在同一抖动层；不同物体分层', () => {
  assert.equal(layerOf({id: 'A'}), layerOf({id: 'mouthHum'}));
  assert.equal(layerOf({id: 'B'}), layerOf({id: 'bScarfTail'}));
  assert.notEqual(layerOf({id: 'A'}), layerOf({id: 'B'}));
  assert.equal(layerOf({id: 'tableTop'}), layerOf({id: 'ticketA'}));
  assert.notEqual(layerOf({id: 'wall'}), layerOf({id: 'tableTop'}));
  assert.notEqual(layerOf({id: 'city0', depth: 0.34}), layerOf({id: 'city1', depth: 0.52}));
});

test('全片每个物件都能归层，层数不多', () => {
  const layers = new Set();
  for (let t = 0; t < 273; t += 3) for (const item of frameAt(t).items) layers.add(layerOf(item));
  assert.ok(layers.size >= 6 && layers.size < 40, String(layers.size));
});

test('世界坐标到 1920×1080 的换算与像素版相机一致', () => {
  const m = worldMatrix({cx: 150, cy: 110, z: 2}, 1, -2);
  assert.equal(m.a, 12);
  assert.equal(m.d, 12);
  assert.equal(m.a * 150 + m.e, 960 + 1);
  assert.equal(m.d * 110 + m.f, 540 - 2);
  const far = viewFor({cx: 215, cy: 90, z: 3}, 0.5);
  assert.equal(far.z, 2);
  assert.equal(far.cx, 165);
  assert.equal(viewFor({cx: 1, cy: 2, z: 3}, undefined).z, 3);
});

test('呼吸只伸缩腰线以上，腿不动；眨眼把眼睛压成一线', () => {
  const pose = {facing: 'right', expression: 'neutral', action: 'idle', frame: 0};
  const base = clawdRects(pose), lifted = posedRects({...pose, breath: 1});
  assert.equal(base.length, lifted.length);
  base.forEach((r, i) => {
    if (r.y >= 21) assert.deepEqual([lifted[i].y, lifted[i].h], [r.y, r.h]);
  });
  assert.ok(lifted.some((r, i) => r.y < base[i].y));
  const eyes = rects => rects.filter(r => r.color === CHARACTER_COLORS.eyes && r.y < 16);
  const open = eyes(posedRects(pose)), shut = eyes(posedRects({...pose, blink: true}));
  assert.ok(open.length > 0 && shut.length > 0);
  for (const r of shut) assert.equal(r.h, 1);
});

test('蜡笔更新规则：背景每两次换一版，角色每次在两版之间切换', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(t => boilVersion('set', t)), [0, 0, 1, 1, 2, 2, 0]);
  assert.deepEqual([0, 1, 2, 3].map(t => boilVersion('A', t)), [0, 3, 0, 3]);
});

test('纸艺 10 fps、蜡笔 8 fps 的歌词起点都不超过半帧误差', () => {
  const dir = new URL('./', import.meta.url);
  const lrc = readFileSync(new URL('../會呼吸的痛.lrc', dir), 'utf8');
  const measured = JSON.parse(readFileSync(new URL('人聲測量.json', dir), 'utf8'));
  for (const fps of [FPS.paper, FPS.crayon]) {
    const timeline = lyricTimeline(lrc, measured, fps);
    assert.equal(timeline.length, 37);
    for (const line of timeline) {
      assert.ok(Math.abs(line.onFrame / fps - line.start) <= 0.5 / fps + 1e-9, line.text);
      assert.ok(line.offFrame > line.onFrame, line.text);
    }
  }
});
