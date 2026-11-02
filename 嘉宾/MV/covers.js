// 19 处实物遮挡和 2 处撕开。p 从 0 到 1 走完一拍：p 到 0.35 时盖满，0.65 起揭开，中间换背景。
// 物件都在画面座标里画，不跟相机动，但从上一镜里已有的位置出发。
import {C, W, H, rect, circle, rotated, rng} from './kit.js';
import * as S from './sets.js';

const FULL = rect(-40, -40, W + 80, H + 80);
const L = (a, b, e) => a + (b - a) * e;
const ease = v => { const c = Math.min(1, Math.max(0, v)); return c * c * (3 - 2 * c); };
const grow = p => ease(p / 0.35);
const leave = p => ease((p - 0.65) / 0.35);
const morph = (a, b, e) => a.map((q, i) => [L(q[0], b[i][0], e), L(q[1], b[i][1], e)]);

// 一批纸片叠满全屏再被吹走：雪片、花瓣和纸屑共用。
function storm(k, p, {seed, colors, count = 150, sheet}) {
  const r = rng(seed), n = Math.ceil(count * grow(p)), off = leave(p);
  if (p >= 0.35 && p < 0.65) k.cut(FULL, sheet, {lift: 0.2, border: 0});
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, size = 90 + r() * 170, side = x < W / 2 ? -1 : 1, hue = colors[i % colors.length];
    k.cut(rotated(x + side * off * 1500, y + (r() - 0.5) * off * 320, size * (1 + r()), size, r() * 90), hue, {lift: 0.6, border: 3});
  }
}
function ribbonWall(k, x, w, colors, seed) {
  const r = rng(seed);
  k.cut(rect(x, -40, w, H + 80), colors[0], {lift: 1.4, border: 6});
  for (let i = 0; i < 28; i++) {
    const px = x + r() * w, py = -30 + r() * (H + 60);
    k.cut(circle(px, py, 70 + r() * 90, 14), colors[i % colors.length], {border: 4, lift: 0.8});
  }
}

export const COVERS = {
  // T01 前景大喜帖被风掀向镜头
  P02(k, p) {
    const e = grow(p);
    S.invitation(k, L(L(1600, 960, e), -1500, leave(p)), L(750, 540, e), L(360, 2700, e), L(-4, 0, e), 'cover');
  },
  // T07 窗上的红气泡胀满全屏，沿中线分开，里面就是喜帖内页
  L06(k, p) {
    if (p < 0.65) {
      const e = grow(p);
      S.bubble(k, 1170, 310, L(240, 3800, e), C.red, {name: 'cover', tail: -1});
      if (e >= 1) k.cut(FULL, C.red, {lift: 0, border: 0});
      return;
    }
    const off = leave(p);
    k.cut(rect(-40 - off * 1000, -40, W / 2 + 40, H + 80), C.red, {lift: 1.6, border: 6});
    k.cut(rect(W / 2 + off * 1000, -40, W / 2 + 40, H + 80), C.red, {lift: 1.6, border: 6});
  },
  // T08 内页沿中线合起，新人贴在纸上一起合进去，露出红色封面
  L07(k, p, ctx) {
    if (ctx.role !== 'leaving') return;
    const e = grow(p);
    k.snapshot();
    // 和 L07 第一帧同一张喜帖：宽 230、相机 11.3 倍，倾斜 6 度。
    S.invitation(k, W / 2, H / 2, 230 * 11.3, -6, 'cover');
    if (e < 1) k.pasteHalves(W / 2 * (1 - e));
  },
  // T09 前景门板向中线关上，紧接着被他从门外推开
  L08(k, p, ctx) {
    const closed = [morph([[30, 26], [250, 70], [250, 1010], [30, 1054]], [[-40, -40], [W / 2 + 4, -40], [W / 2 + 4, H + 40], [-40, H + 40]], grow(p)),
      morph([[1890, 26], [1670, 70], [1670, 1010], [1890, 1054]], [[W + 40, -40], [W / 2 - 4, -40], [W / 2 - 4, H + 40], [W + 40, H + 40]], grow(p))];
    if (p < 0.65) { closed.forEach(q => k.cut(q, C.door, {lift: 1.6, border: 6})); return; }
    const off = leave(p);
    const [leftLeaf, rightLeaf] = [ctx.screen([[620, 130], [420, 180], [420, 920], [620, 910]]), ctx.screen([[1300, 130], [1500, 180], [1500, 920], [1300, 910]])];
    k.cut(morph([[W / 2 + 4, -40], [-40, -40], [-40, H + 40], [W / 2 + 4, H + 40]], leftLeaf, off), C.door, {lift: 1.6, border: 6});
    k.cut(morph([[W / 2 - 4, -40], [W + 40, -40], [W + 40, H + 40], [W / 2 - 4, H + 40]], rightLeaf, off), C.door, {lift: 1.6, border: 6});
  },
  // T10 迎面的雪片叠满全屏，换成长路后向两侧吹散
  L09: (k, p) => storm(k, p, {seed: 901, colors: [C.cream, C.white, C.snow], sheet: C.cream}),
  // T11 花门立柱从右缘向左扫过
  L10(k, p) {
    const e = grow(p), off = leave(p), width = L(120, W + 500, e), x = L(W - 60, -250, e) - off * (W + 800);
    ribbonWall(k, x, width, [C.red, C.cream, C.gold, C.petal], 1101);
  },
  // T14 白头纱从右缘吹过全屏，再向右收回
  L13(k, p) {
    const left = p < 0.65 ? L(W + 40, -60, grow(p)) : L(-60, W + 60, leave(p));
    k.torn(rect(left, -60, W + 200, H + 120), C.white, {lift: 1.6});
  },
  // T17 新娘手里的红包举向镜头
  L16(k, p, ctx) {
    if (ctx.role !== 'leaving') return;
    const e = grow(p);
    // 终点和 L16 第一帧相同：s=1.75 的红包，相机 8 倍。
    S.redEnvelope(k, L(1222, 960, e), L(766, 540, e), L(0.5, 14, e), L(-6, -2, e));
  },
  // T18 相机推向红包，红纸从中间撕开，两半向左右出画
  I01(k, p) {
    if (p < 0.35) return;
    const off = leave(p);
    k.torn([[-200, -60], [W / 2 + 12, -60], [W / 2 - 18, 300], [W / 2 + 22, 640], [W / 2 - 10, H + 60], [-200, H + 60]].map(([x, y]) => [x - off * 1200, y]), C.red, {lift: 1.8});
    k.torn([[W + 200, -60], [W / 2 + 12, -60], [W / 2 - 18, 300], [W / 2 + 22, 640], [W / 2 - 10, H + 60], [W + 200, H + 60]].map(([x, y]) => [x + off * 1200, y]), C.red, {lift: 1.8});
  },
  // T21 从钟扩散的金色纸环，宽度超过全屏，继续向外露出舞台
  L18(k, p) {
    const [x, y] = [960, 322], big = 2300;
    if (p < 0.65) k.ring(x, y, L(280, big, grow(p)), L(240, 0, grow(p)), C.gold);
    else k.ring(x, y, big, L(0, big, leave(p)), C.gold);
  },
  // T24 戴好的戒指向镜头放大，金色碎成红金纸屑向下散开
  L21(k, p) {
    if (p < 0.65) { k.cut(circle(784, 540, L(50, 2200, grow(p)), 48), C.gold, {lift: 1.4, border: 8}); return; }
    const r = rng(2401), off = leave(p);
    for (let y = -60; y < H; y += 120) for (let x = -60; x < W; x += 120) {
      const delay = r() * 0.5, fall = Math.max(0, off * 1.5 - delay), dx = (r() - 0.5) * 160, hue = r() < 0.65 ? C.gold : C.red;
      if (fall >= 1) continue;
      k.cut(rotated(x + 60 + dx * fall, y + 60 + fall * fall * 1300, 130 * (1 - fall * 0.7), 130 * (1 - fall * 0.7), fall * 90), hue, {border: 1, lift: 0.3});
    }
  },
  // T28 花瓣团由右向左扫过
  L25(k, p) {
    const r = rng(2801), e = grow(p), off = leave(p);
    if (p >= 0.35 && p < 0.65) k.cut(FULL, C.petal, {lift: 0.2, border: 0});
    for (let i = 0; i < 90; i++) {
      const x = r() * (W + 900), y = r() * H, s = 110 + r() * 160;
      k.cut(rotated(x + L(W + 400, -450, e) - off * (W + 1500), y, s * 1.3, s, r() * 90), i % 3 ? C.petal : C.red, {lift: 0.6, border: 3});
    }
  },
  // T29 揭开的纸层翻回盖满，再倒下贴到画面下方成为桌面
  L26(k, p) {
    if (p < 0.65) {
      const e = grow(p), right = L(1120, W + 40, Math.min(1, e * 2)), left = L(1120, -40, Math.max(0, e * 2 - 1));
      if (right > left + 1) k.cut(rect(left, -40, right - left, H + 80), C.cream, {lift: 1.8, border: 6});
      return;
    }
    const off = leave(p);
    k.cut(morph(rect(-40, -40, W + 80, H + 80), rect(40, 730, 1840, 320), off), C.cream, {lift: 1.5, border: 6});
  },
  // T33 撕下的半张纸飘向镜头，盖满全屏后沿下缘落出
  L30(k, p) {
    const e = grow(p);
    k.cut(rotated(L(1500, 960, e), L(520, 540, e) + leave(p) * 1800, L(460, 2900, e), L(620, 2000, e), L(17, 0, e)), C.old, {tex: 'news', lift: 1.8, border: 8});
  },
  // T35 侧门门板飞到前景盖满全屏，换到门外后向右打开，缩回门框
  L32(k, p, ctx) {
    if (p < 0.65) { k.cut(morph(rect(1340, 240, 240, 270), rect(-40, -40, W + 80, H + 80), grow(p)), C.door, {lift: 1.8, border: 7}); return; }
    const target = ctx.screen([[1310, 130], [1600, 90], [1600, 830], [1310, 780]]);
    k.cut(morph([[-40, -40], [W + 40, -40], [W + 40, H + 40], [-40, H + 40]], target, leave(p)), C.door, {lift: 1.8, border: 7});
  },
  // T38 红幕在切点已铺满全屏，像窗帘向两侧打开，后面是窗户
  L35(k, p) {
    const off = ease(p);
    k.torn(rect(-60 - off * 1080, -60, W / 2 + 60, H + 120), C.red, {lift: 1.5});
    k.torn(rect(W / 2 + off * 1080, -60, W / 2 + 60, H + 120), C.red, {lift: 1.5});
  },
  // T46 抖落的雪扬起叠满全屏，换成台阶后向两侧散开
  L43: (k, p) => storm(k, p, {seed: 4601, colors: [C.white, C.snow, C.cream], sheet: C.snow}),
  // T50 他向镜头迈出最后一步，橙色盖满全屏，身体经下缘出画，露出同一条路
  O01(k, p) {
    const e = grow(p);
    const exit = leave(p), u = L(27, 100, e), foot = L(L(1040, 2070, e), 1090 + 27 * 100, exit), x = L(470, 960, e);
    k.clawd(x, foot, u, {action: 'walk', frame: 1, role: 'cover'});
    if (p >= 0.35 && p < 0.65) k.cut(FULL, C.orange, {lift: 0, border: 0});
  },
};

const tornDiagonal = c => {
  const edge = [];
  for (let y = -80; y <= H + 80; y += 60) edge.push([y + c + Math.sin(y * 0.07) * 22 + Math.sin(y * 0.19) * 11, y]);
  return edge;
};

// 撕开和相纸吹走：上层是上一镜的快照，下层的新画面已经铺好。
export const TEARS = {
  // T19 暖色雪地从右上角撕向左下
  I02(k, p) {
    const c = L(W + 200, -H - 200, ease(p)), edge = tornDiagonal(c);
    k.paste({clip: [...edge, [-300, H + 80], [-300, -80]]});
    k.line(edge, C.white, 14, 6);
  },
  // T32 红线绷成直线，画面沿它裁开，上半向上、下半向下抽走
  L29(k, p) {
    const y = 852, e = ease(p);
    k.paste({clip: rect(-10, -10 - e * H, W + 20, y + 10), dy: -e * y});
    k.paste({clip: rect(-10, y + e * (H - y), W + 20, H - y + 10), dy: e * (H - y)});
    if (p < 0.3) S.redLine(k, [[-20, y], [W + 20, y]], 12);
  },
  // T48 风从右下角掀起相纸，向左吹走
  L45(k, p) {
    const e = ease(p);
    k.paste({dx: -e * e * 2600, dy: -e * 160, deg: -e * 9, pivot: [W, H], lift: 2});
  },
};
