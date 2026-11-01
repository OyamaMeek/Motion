import test from 'node:test';
import assert from 'node:assert/strict';
import {SHOTS, SONG_SECONDS, frameTimes} from './shots.js';
import {frameAt, WIPE_SECONDS} from './film.js';

const ids = frame => new Set(frame.items.map(i => i.id));
const armLength = item => Math.hypot(item.pts[1][0] - item.pts[0][0], item.pts[1][1] - item.pts[0][1]);

test('全片每个时刻都能生成画面，手臂长度合理', () => {
  for (const t of frameTimes(12)) {
    const frame = frameAt(t);
    assert.ok(frame.items.length > 0, `${t}`);
    for (const item of frame.items) {
      if (!/^(arm.*Fill|wristFill)$/.test(item.id)) continue;
      const [ox, oy] = item.pts[0], {cx, cy, z} = frame.cam;
      const shoulderVisible = Math.abs((ox - cx) * z) < 160 && Math.abs((oy - cy) * z) < 90;
      if (shoulderVisible) assert.ok(armLength(item) <= 16, `${frame.shot} ${t} 手臂长 ${armLength(item).toFixed(0)}`);
    }
  }
});

test('换景时实物完全遮住画面', () => {
  for (const [i, shot] of SHOTS.entries()) {
    if (i === 0) continue;
    const before = frameAt(shot.start + WIPE_SECONDS * 0.49), after = frameAt(shot.start + WIPE_SECONDS * 0.51);
    const setChanged = JSON.stringify([...ids(before)].filter(id => /^(wall|homeWall|doorWall|phoneBack|sky)$/.test(id)))
      !== JSON.stringify([...ids(after)].filter(id => /^(wall|homeWall|doorWall|phoneBack|sky)$/.test(id)));
    if (setChanged) {
      assert.ok(after.wipe, `${shot.id} 换景没有遮挡`);
      assert.ok(after.wipe.x <= 0 && after.wipe.x + after.wipe.width >= 320, `${shot.id} 遮挡未盖满`);
    }
  }
  for (let i = 1; i < SHOTS.length; i++) {
    const a = frameAt(SHOTS[i].start - 0.01), b = frameAt(SHOTS[i].start + 0.01);
    const set = f => [...ids(f)].find(id => /^(wall|homeWall|doorWall|phoneBack|sky)$/.test(id));
    if (set(a) !== set(b)) assert.fail(`${SHOTS[i].id} 在边界瞬间硬切`);
  }
});

test('观景层的物件全程存在，不凭空增减', () => {
  for (const t of frameTimes(4)) {
    const frame = frameAt(t), have = ids(frame);
    if (!have.has('wall')) continue;
    for (const id of ['tableTop', 'plan', 'letter', 'ticketA', 'ticketB', 'phone', 'cup', 'chairBSeat', 'elevFrame']) {
      assert.ok(have.has(id), `${frame.shot} ${t} 缺 ${id}`);
    }
    const scarves = [...have].filter(id => /^scarfDraped$|^scarfGathered$|^heldScarf$/.test(id));
    assert.equal(scarves.length, 1, `${frame.shot} ${t} 围巾数量 ${scarves.length}`);
  }
});

test('住处场景没有之后才写的信，P01 首帧有塔和两张票', () => {
  for (const t of frameTimes(4)) {
    const frame = frameAt(t);
    if (ids(frame).has('homeWall')) assert.ok(!ids(frame).has('letter'), `${frame.shot} ${t}`);
  }
  const first = ids(frameAt(0));
  assert.ok(first.has('towerband0') && first.has('handTicket') && first.has('handTicket2'));
});

test('结尾保留空椅、两张票和打开的电梯，时间到底仍可生成', () => {
  const last = frameAt(SONG_SECONDS);
  assert.equal(last.shot, 'L37');
  const have = ids(last);
  for (const id of ['chairBSeat', 'ticketA', 'ticketB', 'elevInside']) assert.ok(have.has(id), id);
  assert.ok(!have.has('B'));
});
