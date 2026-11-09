// 画面上的全部中文字幕。标记：^{…} 上标，_{…} 下标，[…] 亮橙色；排版时由 kit.js 的 rich() 解析。
// 公式本体在 main.js 里按节点排版，不在这里。

export const TEXT = {
  overture: {say: '只给你一个点', whole: '长出了整条曲线', title: '泰勒公式', sub: '一个点的导数，长出整条曲线', why: '凭什么？', ask: '从一条切线说起'},
  tangent: {near: '放大到足够近', straight: '曲线就是一条直线', apart: '离远了，就分开', name: '一阶近似：切线', error: '误差比 x − x_{0} 小得快'},
  coeff: {drop: '求一次导，指数落下来', fact: '求三次导：3·2·1 = [3!]', apply: '求三次导，再令 x = 0', only: '只剩下这一项', general: '系数由各阶导数决定'},
  poly: {orders: ['同一个值', '同一个斜率', '同一个弯曲', '直到 n 阶，都一样'], title: '泰勒多项式'},
  peano: {approach: 'x 靠近 x_{0}', claim: '误差比 (x−x_{0})^{n} 消失得快', proof: '洛必达，连用 n − 1 次', title: '佩亚诺型余项'},
  maclaurin: {title: 'x_{0} = 0：麦克劳林公式', spin: '六个最常用的展开'},
  limit: {sub: '把 −x^{2}/2 代进 e^{x} 的展开', same: '相同的项，抵消', left: '剩下第一个不同的项'},
  lagrange: {next: '长得像下一项', xi: '只是导数取在 [ξ] 处', between: 'ξ 在 x_{0} 与 x 之间', title: '拉格朗日型余项', n0: '取 n = 0', mvt: '就是拉格朗日中值定理', proof: '证明靠柯西中值定理'},
  euler: {x1: '令 x = 1，算 e', add: '加到 1/9!', bound: '误差 < 3/10! < 10^{−6}'},
  range: {goal: '误差 < 10^{−3} 的范围', far: '次数越高，管得越远'},
  finale: {labels: ['切线', '[k!] 来自求导', '余项'], one: '导数，造出多项式', flat: '余项，管住误差'},
};

// 去掉标记后的纯文字，用于字数检查
export const plain = s => s.replace(/[\^_]\{([^}]*)\}/g, '$1').replace(/[[\]]/g, '');

export function allText() {
  const out = [];
  const walk = v => (typeof v === 'string' ? out.push(v) : Object.values(v).forEach(walk));
  walk(TEXT);
  return out;
}
