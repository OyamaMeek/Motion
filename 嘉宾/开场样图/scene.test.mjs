import test from 'node:test';
import assert from 'node:assert/strict';
import {W, H, UPDATES_PER_SECOND, LAYERS, LABELS, COLORS, FEET, layerOffset, layerBounds, pieceBounds, overlaps, findLayer} from './scene.js';
import {clawdRects, CHARACTER_COLORS} from '../../會呼吸的痛/MV/geometry.js';

const box = id => layerBounds(findLayer(id));

test('动画每秒更新 8–12 次', () => {
  assert.ok(UPDATES_PER_SECOND >= 8 && UPDATES_PER_SECOND <= 12);
});

test('每个图层每次更新在两个轴上都抖动 1–2 像素', () => {
  for (const {id} of LAYERS) for (let tick = 0; tick < 200; tick++) {
    const {dx, dy} = layerOffset(id, tick);
    for (const v of [dx, dy]) assert.ok([1, 2].includes(Math.abs(v)), `${id}@${tick}: ${v}`);
  }
});

test('抖动序列随机变化，同一时刻不同图层不同步', () => {
  const seen = new Set(Array.from({length: 40}, (_, t) => JSON.stringify(layerOffset('figure', t))));
  assert.ok(seen.size >= 6);
  const same = Array.from({length: 40}, (_, t) => t).filter(t => JSON.stringify(layerOffset('figure', t)) === JSON.stringify(layerOffset('card', t)));
  assert.ok(same.length < 20);
});

test('未知图层明确报错', () => {
  assert.throws(() => layerOffset('nothing', 0));
  assert.throws(() => findLayer('nothing'));
});

test('所有纸片留在画幅内，四周露出牛皮纸底', () => {
  for (const layer of LAYERS) {
    const b = layerBounds(layer);
    assert.ok(b.x0 >= 24 && b.y0 >= 20 && b.x1 <= W - 24 && b.y1 <= H - 20, `${layer.id}: ${JSON.stringify(b)}`);
  }
});

test('主要元素互不遮挡，人物与礼堂之间留有空白', () => {
  const main = ['figure', 'chapel', 'card', 'sun', 'branch'];
  for (const a of main) for (const b of main) if (a < b) assert.equal(overlaps(box(a), box(b)), false, `${a} 与 ${b}`);
  assert.ok(box('chapel').x0 - box('figure').x1 >= 150);
});

test('主角是 Clawd 背影，几何全部来自角色模块，没有另画手臂', () => {
  const pieces = findLayer('figure').pieces, source = clawdRects({facing: 'back', expression: 'neutral', action: 'hold', frame: 0});
  assert.equal(pieces.length, 1);
  const [clawd] = pieces;
  assert.equal(clawd.kind, 'clawd');
  assert.equal(clawd.rects.length, source.length);
  const u = clawd.unit;
  clawd.rects.forEach((r, i) => {
    assert.deepEqual([r.x, r.y, r.w, r.h], [clawd.x + source[i].x * u, clawd.y + source[i].y * u, source[i].w * u, source[i].h * u]);
  });
  assert.equal(clawd.y + 27 * u, FEET[1]);
  assert.ok(!('hair' in COLORS) && !('coat' in COLORS) && !('skin' in COLORS));
});

test('Clawd 手中的票换成红色喜帖，其余部分保持角色配色', () => {
  const {rects} = findLayer('figure').pieces[0];
  assert.ok(rects.some(r => r.color === COLORS.red));
  assert.ok(!rects.some(r => r.color === CHARACTER_COLORS.paper));
  assert.ok(rects.some(r => r.color === CHARACTER_COLORS.body));
});

test('人物站在路上，且未被前景雪堆盖住', () => {
  const f = box('figure');
  assert.ok(f.y1 < box('bank').y0 + 40, '雪堆只压在脚下更低的位置');
  const path = pieceBounds(findLayer('path').pieces[0]);
  assert.ok(f.y1 > path.y0 && f.y1 < path.y1);
});

test('飘落物不遮挡人物、喜帖、席卡和礼堂', () => {
  const blocks = [box('figure'), box('card'), box('chapel')];
  for (const piece of findLayer('flakes').pieces) for (const b of blocks) assert.equal(overlaps(pieceBounds(piece), b), false);
});

test('画面文字不超过三个字', () => {
  assert.deepEqual(LABELS, {invite: '囍', title: '嘉宾'});
  assert.ok(Object.values(LABELS).join('').length <= 3);
});

test('底纹同时使用牛皮纸和旧报纸，并同时有撕边和剪纸白边', () => {
  const pieces = LAYERS.flatMap(l => l.pieces);
  assert.ok(pieces.some(p => p.tex === 'news' && p.edge === 'torn'));
  assert.ok(pieces.some(p => p.tex === 'kraft'));
  assert.ok(pieces.some(p => p.kind === 'piece' && p.edge === 'cut'));
  assert.ok(pieces.filter(p => p.kind === 'piece' && p.edge === 'cut').every(p => p.border > 0));
});
