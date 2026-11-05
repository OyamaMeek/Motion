export const FPS = 30;
export const BPM = 120;
export const BEAT_FRAMES = FPS * 60 / BPM;
export const BEATS = 272;
export const FRAME_COUNT = BEATS * BEAT_FRAMES;
export const SECONDS = FRAME_COUNT / FPS;
export const SAMPLE_RATE = 48000;

const LENGTHS = [['overture', 32], ['fermat', 40], ['rolle', 48], ['lagrange', 56], ['cauchy', 56], ['chain', 40]];

export const SCENES = (() => {
  let beat = 0;
  return LENGTHS.map(([id, beats]) => {
    const s = {id, beats, beat, start: beat * BEAT_FRAMES, end: (beat + beats) * BEAT_FRAMES};
    beat += beats;
    return s;
  });
})();

export const CUT_BEATS = SCENES.slice(1).map(s => s.beat);
export const CUT_FRAMES = SCENES.slice(1).map(s => s.start);

// 场景内的关键拍（从场景第一拍起算）。画面在这些拍上完成动作，配乐在同一拍起音。
// 开场总起：逐拍硬切。0—8 拍搭出中值定理的整张图，8—11 拍四个定理名逐拍砸下，12—15 拍连成一条链，
// 16 拍大标题，24—27 拍发问，28—32 拍冲进橙色的点，32 拍切进费马。
export const KEYS = {
  overture: {curve: 0, ends: 2, point: 4, parallel: 6, names: [8, 9, 10, 11], row: 12, chain: 14, title: 16, sub: 18, why: 24, ask: 26, dive: 28},
  fermat: {formIn: 2, title: 4, formOut: 8, curveDone: 14, peak: 20, peakText: 20, valley: 32, formBack: 36, formTitle: 37},
  rolle: {ring: 3, title: 4, sub: [6, 16, 24], morphs: [9, 13, 17, 21, 25, 29], why: 32, fermat: 36, formula: [40, 42, 44]},
  lagrange: {passes: [2, 4, 6], arrive: 8, tilt: 12, swings: [18, 20, 22], shear: 24, align: 36, title: 38, meaning: 44, dive: 56},
  cauchy: {burst: 0, together: 8, curve: 9, chord: 16, parallel: 20, formula: 30, lagrange: 40, title: 48},
  chain: {strip: 6, names: [6, 6.5, 7, 7.5], arrows: [8, 10, 12], root: 16, rootText: 18, formula: 24, one: 28, flat: 32, final: 36},
};

// 全片重音（全局拍号）：开场、各切点和每个场景里的主要锁定动作。
export const HIT_BEATS = (() => {
  const O = KEYS.overture;
  const local = {
    overture: [O.curve, O.ends, O.point, O.parallel, ...O.names, O.chain, O.title, O.sub, O.why, O.ask],
    fermat: [0, KEYS.fermat.formIn, KEYS.fermat.title, KEYS.fermat.peak, KEYS.fermat.valley, KEYS.fermat.formBack],
    rolle: [0, KEYS.rolle.title, ...KEYS.rolle.morphs, KEYS.rolle.fermat, ...KEYS.rolle.formula],
    lagrange: [0, KEYS.lagrange.arrive, KEYS.lagrange.tilt, KEYS.lagrange.align],
    cauchy: [0, KEYS.cauchy.parallel, KEYS.cauchy.formula, KEYS.cauchy.lagrange, KEYS.cauchy.title],
    chain: [0, KEYS.chain.strip, KEYS.chain.root, KEYS.chain.formula, KEYS.chain.one, KEYS.chain.final],
  };
  const all = SCENES.flatMap(s => local[s.id].map(b => s.beat + b));
  return [...new Set(all)].sort((a, b) => a - b);
})();

export function frameState(frame) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= FRAME_COUNT) throw new Error(`帧号越界：${frame}`);
  let i = 0;
  while (i + 1 < SCENES.length && frame >= SCENES[i + 1].start) i++;
  const scene = SCENES[i];
  const local = frame - scene.start;
  return {index: i, scene, local, b: local / BEAT_FRAMES, left: scene.end - frame};
}
