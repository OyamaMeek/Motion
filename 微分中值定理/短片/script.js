// 画面上的全部文字。中文与公式用标题字体 Songti SC Black；数值读数用正文字体 Menlo。

export const TEXT = {
  fermat: {title: '费马引理', peak: '最高点，切线是平的', valley: '最低点，也是平的', law: '极值处，导数为零'},
  rolle: {title: '罗尔定理', sub: ['两端一样高', '怎么弯都行', '中间总有平切线'], why: '最高点在中间', fermat: '用费马引理'},
  lagrange: {planes: ['两端', '不一样高', '斜着看'], parallel: '切线和弦平行', shear: '罗尔，加一个倾斜', title: '拉格朗日中值定理', meaning: '弦的斜率＝某点切线斜率'},
  cauchy: {together: '两个函数，一起随 t 走', parallel: '还是：切线和弦平行', lagrange: '令 g(x)=x，就是拉格朗日', title: '柯西中值定理'},
  chain: {names: ['费马', '罗尔', '拉格朗日', '柯西'], arrows: ['两端等高', '加一个倾斜', '换成参数'], root: '后三个都建在费马上', one: '四个定理，一个根源', flat: '极值处，切线是平的'},
};

export function allText() {
  const out = [];
  const walk = v => (typeof v === 'string' ? out.push(v) : Object.values(v).forEach(walk));
  walk(TEXT);
  return out;
}
