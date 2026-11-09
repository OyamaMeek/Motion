// 片中所有曲线与数值。画面和测试共用：画出来的多项式、余项、范围和读数都是这里算出来的。

export const factorial = k => (k <= 1 ? 1 : k * factorial(k - 1));

// 由 x₀ 处的各阶导数 d(k) 造泰勒多项式 Tₙ；coef[k] = f⁽ᵏ⁾(x₀)/k!
export function taylor(d, x0, n) {
  const coef = Array.from({length: n + 1}, (_, k) => d(k) / factorial(k));
  const at = x => {
    let v = 0, p = 1;
    for (let k = 0; k <= n; k++) { v += coef[k] * p; p *= x - x0; }
    return v;
  };
  // 多项式自己的第 j 阶导数
  const deriv = (x, j) => {
    let v = 0;
    for (let k = j; k <= n; k++) v += coef[k] * (factorial(k) / factorial(k - j)) * (x - x0) ** (k - j);
    return v;
  };
  return {coef, at, deriv};
}

// 讲解用的曲线：f(x) = sin x + 0.35 sin 2x，任意阶导数都有闭式
const A = 0.35;
export const CURVE = {
  f: x => Math.sin(x) + A * Math.sin(2 * x),
  d: (k, x) => Math.sin(x + k * Math.PI / 2) + A * 2 ** k * Math.sin(2 * x + k * Math.PI / 2),
  x0: 0.6,
};
export const curveTaylor = n => taylor(k => CURVE.d(k, CURVE.x0), CURVE.x0, n);
// 开场逐拍取的阶数：多项式从 x₀ 长出，n = 40 时贴住 |x − x₀| ≤ 6 的整段
export const GROW_N = [1, 2, 3, 5, 8, 12, 18, 26, 40];

// sin x 在 0 处：导数按 0, 1, 0, −1 循环
export const sinD = k => [0, 1, 0, -1][k % 4];
export const sinTaylor = n => taylor(sinD, 0, n);

// 例 4：cos x 与 e^(−x²/2) 的麦克劳林系数（x⁰、x²、x⁴），差的 x⁴ 系数即极限
export const LIMIT = {
  cos: [1, -1 / 2, 1 / 24],
  gauss: [1, -1 / 2, 1 / 8],
  get answer() { return this.cos[2] - this.gauss[2]; },
};

// 例 6：e 的部分和，误差界 3/(n+1)!
export const eulerPartial = n => Array.from({length: n + 1}, (_, k) => 1 / factorial(k)).reduce((a, b) => a + b, 0);
export const eulerBound = n => 3 / factorial(n + 1);

// 例 7：sin x ≈ T₂ₘ₋₁，误差界 |x|^(2m+1)/(2m+1)! < 10⁻³ 的范围
export const sinRange = m => (1e-3 * factorial(2 * m + 1)) ** (1 / (2 * m + 1));

// 拉格朗日型余项：eˣ 在 0 处展开到 n 阶，x 处的余项 = e^ξ/(n+1)!·x^(n+1)，反解 ξ
export function expXi(n, x) {
  const r = Math.exp(x) - taylor(() => 1, 0, n).at(x);
  return Math.log(r * factorial(n + 1) / x ** (n + 1));
}
