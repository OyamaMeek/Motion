export const FPS = 30;
export const BPM = 120;
export const BEAT_FRAMES = FPS * 60 / BPM;
export const BEATS = 304;
export const FRAME_COUNT = BEATS * BEAT_FRAMES;
export const SECONDS = FRAME_COUNT / FPS;
export const SAMPLE_RATE = 48000;

const LENGTHS = [['overture', 32], ['tangent', 24], ['coeff', 28], ['poly', 32], ['peano', 28], ['maclaurin', 32],
  ['limit', 28], ['lagrange', 32], ['euler', 24], ['range', 20], ['finale', 24]];

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
export const KEYS = {
  // 0 拍橙点砸下、曲线画出；2 拍“只给你一个点”；4—12 拍逐拍取更高阶（n 见 GROW_N），多项式从点长出；
  // 13 拍长满整条曲线；16 拍分屏大标题；20 拍副标题；24、26 拍发问；28—32 拍回到切线
  overture: {ring: 0, say: 2, grow: [4, 5, 6, 7, 8, 9, 10, 11, 12], whole: 13, title: 16, sub: 20, why: 24, ask: 26, dive: 28},
  // 2—10 拍连续放大到 1000 倍；14 拍急退；18 拍公式
  tangent: {near: 2, straight: 10, back: 14, apart: 15, formula: 18, error: 21},
  // x³ 求三次导，三个指数逐个落下；16 拍整条多项式；19 拍只剩一项；22 拍字符重排成 a₃；25 拍推广到 aₖ
  coeff: {drops: [3, 6, 9], fact: 12, poly: 16, only: 19, solve: 22, general: 25},
  // 0—6 阶逐阶变形；24 拍公式；28 拍名称
  poly: {orders: [2, 6, 10, 14, 16, 18, 20], same: 14, formula: 24, title: 28},
  // 0—11 拍误差与 (x−x₀)ⁿ 比赛缩小；12 拍起镜头穿过洛必达的各层；21 拍到 0；24 拍公式
  peano: {ratio: 2, claim: 7, dive: 12, planes: [13, 15, 17, 19], zero: 21, formula: 24, title: 26},
  // 转鼓每 4 拍停一面
  maclaurin: {title: 0, faces: [4, 8, 12, 16, 20, 24], spin: 28},
  // 4、7 拍两条展开；12、14 拍同项相撞抵消；17 拍剩下的项聚成；21 拍极限
  limit: {problem: 0, cos: 4, exp: 7, cancel: [12, 14], left: 17, answer: 21, note: 25},
  // 0 拍余项；4 拍翻牌 x₀→ξ；8 拍 ξ 的位置；12 拍名称；16 拍完整公式，17、18、19 拍三次翻折到 n=0；20 拍移项；24 拍拉格朗日中值定理
  lagrange: {next: 0, flap: 4, xi: 8, title: 12, fold: 16, n0: 20, mvt: 24, proof: 28},
  // 2—11 拍十块逐拍落下；13 拍放大镜；17 拍误差界；20 拍 e 的值
  euler: {x1: 0, blocks: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], loupe: 13, bound: 17, value: 20},
  // 1、5、9、11、13 拍 m=1—5 的范围；16 拍结论
  range: {m: [1, 5, 9, 11, 13], far: 16},
  // 0—8 拍碎片归位成公式；10 拍三处标注；14、17 拍分屏两行结论；20 拍回到橙点，留 4 拍让和弦收尾
  finale: {gather: 0, formula: 8, labels: [10, 11, 12], one: 14, flat: 17, final: 20},
};

// 全片重音（全局拍号）：开场、各切点和每个场景里的主要锁定动作。
export const HIT_BEATS = (() => {
  const K = KEYS;
  const local = {
    overture: [K.overture.ring, K.overture.say, ...K.overture.grow, K.overture.title, K.overture.sub, K.overture.why, K.overture.ask],
    tangent: [0, K.tangent.straight, K.tangent.apart, K.tangent.formula],
    coeff: [0, ...K.coeff.drops, K.coeff.fact, K.coeff.only, K.coeff.general],
    poly: [0, ...K.poly.orders.slice(0, 3), K.poly.formula, K.poly.title],
    peano: [0, K.peano.claim, ...K.peano.planes, K.peano.zero, K.peano.formula],
    maclaurin: [0, ...K.maclaurin.faces],
    limit: [0, K.limit.cos, K.limit.exp, ...K.limit.cancel, K.limit.left, K.limit.answer],
    lagrange: [0, K.lagrange.flap, K.lagrange.title, K.lagrange.n0, K.lagrange.mvt],
    euler: [0, K.euler.loupe, K.euler.bound, K.euler.value],
    range: [0, ...K.range.m, K.range.far],
    finale: [0, K.finale.formula, K.finale.one, K.finale.flat, K.finale.final],
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
