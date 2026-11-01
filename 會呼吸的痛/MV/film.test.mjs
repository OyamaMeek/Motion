import test from 'node:test';
import assert from 'node:assert/strict';
import {SHOTS, SONG_SECONDS, frameTimes} from './shots.js';
import {frameAt, WIPE_SECONDS} from './film.js';

const ids = frame => new Set(frame.items.map(i => i.id));
const armLength = item => Math.hypot(item.pts[1][0] - item.pts[0][0], item.pts[1][1] - item.pts[0][1]);

test('全片每个时刻都能生成画面，手只来自角色模块，不另画手臂', () => {
  for (const t of frameTimes(12)) {
    const frame = frameAt(t);
    assert.ok(frame.items.length > 0, `${t}`);
    for (const item of frame.items) {
      assert.ok(!/^(arm|wrist|ownPhoneArm)/.test(item.id), `${frame.shot} ${t} 另画了手臂 ${item.id}`);
      if (item.id === 'penInHand') assert.ok(armLength(item) <= 9, `${frame.shot} ${t} 笔过长`);
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

const roles = frame => {
  const {cx, cy, z} = frame.cam, found = new Map();
  for (const item of frame.items) {
    const role = item.id === 'selfie' ? 'A' : item.id;
    if (role !== 'A' && role !== 'B') continue;
    const x = (item.x - cx) * z + 160, y = (item.y - cy) * z + 90, size = 32 * z * (item.unit ?? 1);
    if (x + size > 0 && x < 320 && y + size > 0 && y < 180) found.set(role, {...item, x, y, size});
  }
  return found;
};
const seam = shot => {
  const before = frameAt(shot.start - 1e-3), wiped = frameAt(shot.start + 1e-3).wipe !== null;
  return {before, wiped, after: frameAt(shot.start + (wiped ? WIPE_SECONDS * 0.5 : 0) + 1e-3)};
};

test('同场衔接的相机连续，衔接前后角色的大小、位置、姿态一致', () => {
  for (const shot of SHOTS.slice(1)) {
    const {before, wiped, after} = seam(shot);
    if (!wiped) {
      assert.ok(Math.hypot(before.cam.cx - after.cam.cx, before.cam.cy - after.cam.cy) < 0.5, `${shot.id} 相机位置跳变`);
      assert.ok(Math.abs(before.cam.z - after.cam.z) < 0.02, `${shot.id} 相机倍数跳变`);
    }
    const a = roles(before), b = roles(after);
    for (const [role, x] of a) {
      const y = b.get(role);
      if (!y) continue;
      for (const key of ['x', 'y', 'size']) assert.ok(Math.abs(x[key] - y[key]) <= 1, `${shot.id} ${role} ${key} ${x[key]} -> ${y[key]}`);
      for (const key of ['action', 'expression']) assert.equal(x[key], y[key], `${shot.id} ${role} ${key}`);
      if (x.id === y.id) assert.equal(x.facing, y.facing, `${shot.id} ${role} facing`);
    }
  }
});

test('镜头移动连续，角色在同一场景内不瞬移', () => {
  let previous = frameAt(0);
  for (const t of frameTimes(12).slice(1)) {
    const frame = frameAt(t);
    if (!frame.wipe && !previous.wipe) {
      assert.ok(Math.abs(frame.cam.z - previous.cam.z) <= 0.75, `${t} 相机倍数跳变`);
      assert.ok(Math.hypot(frame.cam.cx - previous.cam.cx, frame.cam.cy - previous.cam.cy) <= 12, `${t} 相机位置跳变`);
      for (const id of ['A', 'B']) {
        const x = previous.items.find(i => i.id === id), y = frame.items.find(i => i.id === id);
        if (x && y) assert.ok(Math.hypot(x.x - y.x, x.y - y.y) <= 10, `${t} ${id} 瞬移 ${x.x},${x.y} -> ${y.x},${y.y}`);
      }
    }
    previous = frame;
  }
});

test('观景层始终只有一支笔', () => {
  for (const t of frameTimes(24)) {
    const have = ids(frameAt(t));
    if (have.has('wall')) assert.equal(['pen', 'penInHand'].filter(id => have.has(id)).length, 1, `${t}`);
  }
});

test('I01 揭开折角前，计划上的独坐小人不可见', () => {
  for (const shot of SHOTS.filter(s => ['L04', 'L05', 'L06', 'L13'].includes(s.id))) {
    const have = ids(frameAt(shot.end - 0.01));
    assert.ok(have.has('planFold'), `${shot.id} 没有折角`);
  }
});

test('结尾保留空椅、两张票和打开的电梯，时间到底仍可生成', () => {
  const last = frameAt(SONG_SECONDS);
  assert.equal(last.shot, 'L37');
  const have = ids(last);
  for (const id of ['chairBSeat', 'ticketA', 'ticketB', 'elevInside']) assert.ok(have.has(id), id);
  assert.ok(!have.has('B'));
});
