import test from 'node:test';
import assert from 'node:assert/strict';
import { W, H, FPS, BPM, FPB, BEATS, FRAMES, PAGES, pageAt } from './timeline.js';
import { LINES, CORNERS, GROUPS, GROUND, EIGHT } from './script.js';
import { BGM, TURNS, ACCENTS, N, SR, SPB, mixdown } from './audio.mjs';

test('规格：1920×1080、30 帧每秒、120 BPM、180 拍、2700 帧', () => {
  assert.deepEqual([W, H, FPS, BPM, FPB, BEATS, FRAMES], [1920, 1080, 30, 120, 15, 180, 2700]);
  assert.equal(FRAMES / FPS, 90);
});

test('每次翻页都落在小节首拍，落拍帧是整数', () => {
  assert.equal(PAGES.length, 14);
  PAGES.forEach((p, i) => {
    assert.equal(p.beat % 4, 0, `${p.id} 不在小节首拍`);
    assert.equal(p.frame, p.beat * 15);
    if (i) assert.ok(p.beat > PAGES[i - 1].beat);
  });
  assert.equal(PAGES.at(-1).endBeat, 180);
  assert.equal(pageAt(599).id, 'ask');
  assert.equal(pageAt(600).id, 'newark');
});

test('明暗交替：相邻暗场不连续，单段不超过 12 秒', () => {
  let run = 0;
  PAGES.forEach((p, i) => {
    if (p.tone === '暗场') assert.notEqual(PAGES[i - 1].tone, '暗场');
    run = i && p.tone === PAGES[i - 1].tone ? run + (p.endBeat - p.beat) / 2 : (p.endBeat - p.beat) / 2;
    assert.ok(p.tone === '纸面' ? run <= 16 : run <= 12, `${p.id} 所在段落 ${run} 秒`);
  });
});

test('每句文字都在所属页的时间内出现，逐字打完后至少停 1 拍', () => {
  for (const [key, l] of Object.entries(LINES)) {
    const page = PAGES.find((p) => p.id === l.page);
    assert.ok(page, `${key} 的页不存在`);
    assert.ok(l.at >= page.beat && l.out <= page.endBeat, `${key} 超出本页`);
    const typed = l.per ? ([...l.text].length * l.per) / FPB : 0;
    assert.ok(l.at + typed + 1 <= l.out, `${key} 打完后停留不足 1 拍`);
  }
});

test('阅读量：每页每秒不超过 7.5 个字，每句停留时间按每秒 9 个字计仍有余量', () => {
  for (const page of PAGES) {
    const lines = Object.values(LINES).filter((l) => l.page === page.id && l.kind !== 'note');
    const chars = lines.reduce((n, l) => n + [...l.text.replaceAll(' ', '')].length, 0);
    const seconds = (page.endBeat - page.beat) / 2;
    assert.ok(chars / seconds <= 7.5, `${page.id} 每秒 ${(chars / seconds).toFixed(1)} 字`);
    for (const l of lines) assert.ok((l.out - l.at) / 2 >= [...l.text.replaceAll(' ', '')].length / 9, `${l.text} 停留过短`);
  }
});

test('事实、引语和学校的说法都标了来源，本片作者的话不挂来源', () => {
  for (const [key, l] of Object.entries(LINES)) {
    if (['fact', 'quote', 'school'].includes(l.kind)) assert.ok(l.refs.length > 0, `${key} 没有来源`);
    if (l.kind === 'view') assert.equal(l.refs.length, 0);
  }
  assert.ok(GROUND.filter((g) => g.kind === 'view').length === 3);
});

test('数字与用字：八个字、58 人的构成、角标对应的页', () => {
  assert.equal(EIGHT.join(''), '国家大事千万尽力');
  assert.equal(GROUPS.reduce((n, g) => n + g.n, 0), 58);
  assert.equal(LINES.aidGroups.text, GROUPS.map((g) => `${g.name} ${g.n}`).join(' · '));
  for (const id of Object.keys(CORNERS)) assert.ok(PAGES.some((p) => p.id === id));
  for (const l of Object.values(LINES)) assert.ok(!/第一届|遗言|绝笔|硕士/.test(l.text), `未核实的说法：${l.text}`);
});

test('bgm 剪辑：三段首尾相接铺满 45 小节，取自原曲范围内，接缝在小节线上', () => {
  let bar = 0;
  for (const s of BGM.segments) {
    assert.equal(s.filmBar, bar);
    assert.ok(Number.isInteger(s.bgmBar) && s.bgmBar + s.bars <= BGM.bars);
    bar += s.bars;
  }
  assert.equal(bar, BEATS / 4);
  assert.ok(Math.abs(BGM.ratio - 1.062851) < 1e-5);
});

test('翻页重音与页表一致，页内重音都在整帧上', () => {
  assert.deepEqual(TURNS.map((t) => t.beat), PAGES.slice(1).map((p) => p.beat));
  for (const a of ACCENTS) assert.ok(Number.isInteger(a.beat * FPB));
});

test('配乐：长度 90 秒，峰值不超过 0.75，没有无效采样；合成层在每个翻页落拍处起音', () => {
  const mix = mixdown();
  assert.equal(mix.L.length, N);
  assert.equal(N / SR, 90);
  let peak = 0;
  for (let i = 0; i < N; i++) {
    assert.ok(Number.isFinite(mix.L[i]) && Number.isFinite(mix.R[i]));
    peak = Math.max(peak, Math.abs(mix.L[i]), Math.abs(mix.R[i]));
  }
  assert.ok(peak <= 0.7501 && peak > 0.7, `峰值 ${peak}`);
  const energy = (from, len) => {
    let e = 0;
    for (let i = from; i < from + len; i++) e += mix.synth.L[i] ** 2 + mix.synth.R[i] ** 2;
    return e;
  };
  for (const t of TURNS) {
    const at = Math.round(t.beat * SPB);
    const after = energy(at, 2400);
    const before = energy(at - 2400, 2400);
    assert.ok(after > before * 4, `第 ${t.beat} 拍：落拍后 ${after.toFixed(2)}，落拍前 ${before.toFixed(2)}`);
  }
});
