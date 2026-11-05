// 片中所有曲线的数学定义。画面和测试共用，保证画出来的极值点、ξ 和切线都是真的算出来的。

const derivative = (s, u, h = 1e-6) => (s(u + h) - s(u - h)) / (2 * h);

function bisect(fn, a, b) {
  let fa = fn(a);
  for (let i = 0; i < 60; i++) {
    const m = (a + b) / 2, fm = fn(m);
    if (fa * fm <= 0) b = m;
    else { a = m; fa = fm; }
  }
  return (a + b) / 2;
}

// 区间 (0,1) 内导数变号的点，即内部的极大、极小值点。导数恒为零的直线没有变号，返回空。
export function extrema(s, n = 601) {
  const out = [];
  let prev = derivative(s, 1e-4), prevU = 1e-4;
  for (let i = 1; i <= n; i++) {
    const u = Math.min(1 - 1e-4, i / n);
    const d = derivative(s, u);
    // 恰好为零的采样不更新符号，变号区间跨过它继续找
    if (d === 0) continue;
    if (prev * d < 0) out.push(bisect(x => derivative(s, x), prevU, u));
    prev = d; prevU = u;
  }
  return out;
}

export const FERMAT = {
  f: x => x ** 3 / 3 - x,
  df: x => x * x - 1,
  peak: -1,
  valley: 1,
  x0: -2.15,
  x1: 2.15,
};

const S = Math.sin, PI = Math.PI;
// 罗尔：端点都在 0，按顺序变形。第 0 个是直线，最后回到单峰用来讲“最高点用费马”。
export const ROLLE_SHAPES = [
  () => 0,
  u => 0.9 * S(PI * u),
  u => -0.75 * S(PI * u),
  u => 0.72 * S(2 * PI * u),
  u => 0.5 * S(3 * PI * u) + 0.22 * S(PI * u),
  u => 6 * u * (1 - u) ** 2,
  u => 0.9 * S(PI * u),
];

export const LAGRANGE = {phi: u => 0.8 * S(PI * u), xi: 0.5};

// 柯西：x = g(t)、y = f(t) 一起随 t 走；g′ 处处为正。
const cauchy = {
  g: t => t - 0.12 * S(2 * PI * t),
  dg: t => 1 - 0.24 * PI * Math.cos(2 * PI * t),
  f: t => 0.45 * S(1.3 * PI * t) + 0.75 * t,
  df: t => 0.45 * 1.3 * PI * Math.cos(1.3 * PI * t) + 0.75,
};
const dx = cauchy.g(1) - cauchy.g(0), dy = cauchy.f(1) - cauchy.f(0);
const cross = t => cauchy.df(t) * dx - dy * cauchy.dg(t);
const roots = [];
for (let i = 1; i <= 400; i++) {
  const a = (i - 1) / 400, b = i / 400;
  if (cross(a) * cross(b) < 0) roots.push(bisect(cross, a, b));
}
export const CAUCHY = {...cauchy, xi: roots.reduce((best, t) => (Math.abs(t - 0.5) < Math.abs(best - 0.5) ? t : best), roots[0]), roots};
