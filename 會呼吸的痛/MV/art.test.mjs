import test from 'node:test';
import assert from 'node:assert/strict';
import {SHOTS} from './shots.js';
import {frameAt, WIPE_SECONDS} from './film.js';

const items = (t, id) => frameAt(t).items.filter(i => i.id === id);
const one = (t, id) => { const found = items(t, id); assert.equal(found.length, 1, `${t} ${id}`); return found[0]; };

test('所有画面元素都在同一张绘制清单中，使用同一相机', () => {
  const frame = frameAt(40);
  for (const id of ['wall', 'tableTop', 'A', 'plan', 'ticketA']) assert.ok(frame.items.some(i => i.id === id), id);
  assert.deepEqual(Object.keys(frame.cam).sort(), ['cx', 'cy', 'z']);
});

test('窗外城市有视差，且裁切在窗内', () => {
  for (const id of ['city0', 'city1', 'city2']) {
    const city = one(40, id);
    assert.ok(city.depth > 0 && city.depth < 1, id);
    assert.deepEqual(city.clip, [24, 16, 206, 142]);
  }
  assert.ok(one(40, 'city0').depth < one(40, 'city2').depth);
});

test('城市灯火随原曲响度变化，尾奏逐渐熄灭', () => {
  const lamps = t => frameAt(t).items.filter(i => i.id.startsWith('citylamps')).reduce((n, i) => n + i.pts.length, 0);
  assert.ok(lamps(100) > lamps(14));
  assert.ok(lamps(272.5) < lamps(262) * 0.25);
});

test('L02 有一道灯火带由上向下落，只在这一句出现', () => {
  const band = t => {
    const pts = items(t, 'fallingLights')[0]?.pts ?? [];
    return pts.length ? pts.reduce((sum, p) => sum + p[1], 0) / pts.length : null;
  };
  assert.ok(band(28) < band(33));
  assert.equal(band(20), null);
  assert.equal(band(40), null);
});

test('角色持续呼吸且有眨眼，呼吸随时间连续', () => {
  const values = [];
  for (let t = 20; t < 24; t += 1 / 12) values.push(one(t, 'A').breath);
  assert.ok(Math.max(...values) - Math.min(...values) > 0.3);
  for (let i = 1; i < values.length; i++) assert.ok(Math.abs(values[i] - values[i - 1]) < 0.5);
  let blinks = 0;
  for (let t = 60; t < 90; t += 1 / 12) if (frameAt(t).items.find(i => i.id === 'A')?.blink) blinks++;
  assert.ok(blinks > 0 && blinks < 30);
  assert.ok(Math.max(...Array.from({length: 40}, (_, i) => one(70 + i / 12, 'A').breath)) > Math.max(...values));
});

test('换景遮挡物都是分镜写明的实物，有各自的材质', () => {
  const expected = {P02: 'post', L05: 'envelope', L06: 'calendar', L07: 'scarf', L13: 'scarf', L14: 'scarf', I02: 'plan', L15: 'post', L17: 'post', L18: 'post', L19: 'post', L21: 'post', L31: 'phone', L33: 'phone'};
  for (const shot of SHOTS) {
    const wipe = frameAt(shot.start + WIPE_SECONDS / 2).wipe;
    assert.equal(wipe?.kind, expected[shot.id], shot.id);
  }
});

test('L18 饭菜的热气消失；L36 电梯门开后灯光洒到地面', () => {
  assert.ok(items(149.5, 'dinnerSteam').length === 1);
  assert.equal(items(154, 'dinnerSteam').length, 0);
  assert.equal(items(240, 'elevatorSpill').length, 0);
  assert.ok(one(248, 'elevatorSpill').density > 0.2);
  assert.ok(one(272.9, 'elevatorSpill').density > 0.2);
});

test('玄关时钟与回信草图同为 19:00 附近，门开时暖光洒到门外', () => {
  assert.ok(items(150, 'hallClock').length === 0);
  assert.ok(items(158, 'hallClock').length === 1);
  assert.equal(items(140.3, 'doorSpill').length, 0);
  assert.ok(one(147, 'doorSpill').density > 0.2);
});

test('桌面木纹不超出桌子', () => {
  const grain = frameAt(40).items.filter(i => i.id.startsWith('grain'));
  assert.ok(grain.length > 0);
  for (const item of grain) for (const [x] of item.pts) assert.ok(x >= 150 && x <= 214, `${item.id} ${x}`);
});

test('L37 落定后相机静止，A、两张票、完整空椅都留在画面', () => {
  const a = frameAt(262.5), b = frameAt(273);
  assert.deepEqual(a.cam, b.cam);
  for (const id of ['A', 'ticketA', 'ticketB', 'chairBSeat', 'elevInside']) assert.ok(b.items.some(i => i.id === id), id);
});
