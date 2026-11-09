// 《泰勒公式》十一个场景。米白底、墨黑、亮橙；中文 PingFang SC，公式与数字 STIX Two Text。
import {FRAME_COUNT, KEYS, SCENES, frameState} from './timeline.js';
import {TEXT} from './script.js';
import {CURVE, GROW_N, LIMIT, curveTaylor, eulerPartial, factorial, sinRange, sinTaylor} from './math.js';
import {REEL} from './reel.js';
import {
  H, INK, ORANGE, PAPER, W, camera, captions, clamp, disc, drawBox, dropIn, inOut, lerp, line, morph, outBack, outCubic, outQuint,
  plot, point, report, rich, ring, rng, sampleBox, seg, slamScale, spring, state, tagRect, tex,
} from './draw.js';

const K = KEYS, T = TEXT;
const X0 = CURVE.x0, Y0 = CURVE.f(X0), D1 = CURVE.d(1, X0);
const polys = new Map();
const TP = n => { if (!polys.has(n)) polys.set(n, curveTaylor(n)); return polys.get(n); };
const SP = n => { const k = `s${n}`; if (!polys.has(k)) polys.set(k, sinTaylor(n)); return polys.get(k); };
const last = (list, b) => { let i = -1; for (const [k, v] of list.entries()) if (b >= v) i = k; return i; };

function clipRect(g, x0, y0, x1, y1) { g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip(); }

// 曲线把画面分成上下两半：上米白、下亮橙；text 在分界上下各用墨黑、米白
function curvePath(cam, below) {
  const p = new Path2D();
  p.moveTo(0, below ? H + 10 : -10);
  for (let X = 0; X <= W; X += 4) p.lineTo(X, cam.Y(CURVE.f(cam.x(X))));
  p.lineTo(W, below ? H + 10 : -10);
  p.closePath();
  return p;
}
function splitScreen(g, cam, draws) {
  const lower = curvePath(cam, true), upper = curvePath(cam, false);
  g.fillStyle = ORANGE; g.fill(lower);
  for (const d of draws) {
    g.save(); g.clip(upper); d(INK); g.restore();
    g.save(); g.clip(lower); d(PAPER); g.restore();
  }
  plot(g, CURVE.f, cam, INK, 7, {step: 4});
}

// ---------- 0 开场：一个点长出整条曲线 ----------
function overture(g, b) {
  const O = K.overture;
  if (b < O.title) {
    const s = b < O.grow[0] ? 330 : lerp(330, 135, inOut(seg(b, O.grow[0], O.whole)));
    const cam = camera(X0, Y0, s);
    const reach = 0.3 + 9 * outQuint(seg(b, 0, 1.4));
    const L = Math.max(0, cam.X(X0 - reach)), R = Math.min(W, cam.X(X0 + reach));
    plot(g, CURVE.f, cam, INK, 9, {X0: L, X1: R});
    if (R < W) disc(g, R, cam.Y(CURVE.f(cam.x(R))), 9, INK);
    if (L > 0) disc(g, L, cam.Y(CURVE.f(cam.x(L))), 9, INK);
    const i = last(O.grow, b);
    if (i >= 0) {
      const q = spring(seg(b, O.grow[i], O.grow[i] + 0.7));
      const now = TP(GROW_N[i]);
      if (i === 0) {
        const r = 2.6 * outCubic(seg(b, O.grow[0], O.grow[0] + 0.5));
        plot(g, x => now.at(x), cam, ORANGE, 10, {X0: cam.X(X0 - r), X1: cam.X(X0 + r)});
      } else {
        const before = TP(GROW_N[i - 1]);
        plot(g, x => lerp(before.at(x), now.at(x), q), cam, ORANGE, 10);
      }
      drawBox(g, tex(`n = \\o{${GROW_N[i]}}`, 150), 1840, 1010, {align: 'right', scale: slamScale(b, O.grow[i], 0.2)});
    }
    // 第 0 帧橙点以三倍大小砸下，0.4 拍内缩回
    point(g, cam.X(X0), cam.Y(Y0), 24 * (1 + 2 * (1 - outCubic(seg(b, 0, 0.4)))));
    if (b < 1.4) { const q = seg(b, 0, 1.4); ring(g, cam.X(X0), cam.Y(Y0), 34 + 1100 * outCubic(q), ORANGE, 2 + 26 * (1 - q)); }
    captions(g, b, [[O.say, T.overture.say], [O.whole, T.overture.whole]], {size: 104, y: 210});
    return;
  }
  if (b < O.why) {
    const cam = camera(X0 + 0.22 * (b - O.title), 0, 135);
    const title = rich(T.overture.title, 330);
    const anim = (it, i) => { const q = seg(b, O.title + i * 0.1, O.title + i * 0.1 + 0.3); return q <= 0 ? null : {s: 1 + 0.7 * (1 - outCubic(q))}; };
    const settled = b >= O.title + 0.7;
    splitScreen(g, cam, [c => drawBox(g, title, W / 2, 655, {align: 'center', anim: settled ? null : anim, color: c, check: settled})]);
    if (b >= O.sub) {
      const sub = rich(T.overture.sub, 80, PAPER);
      const done = b >= O.sub + sub.items.length * 0.05 + 0.38;
      drawBox(g, sub, W / 2, 940, {align: 'center', anim: done ? null : dropIn(b, O.sub), check: done});
    }
    return;
  }
  if (b < O.dive) {
    const why = rich(T.overture.why, 330);
    const anim = (it, i) => { const t0 = O.why + i * 0.08, q = seg(b, t0, t0 + 0.25); return b < t0 ? null : {s: 1 + 0.6 * (1 - outCubic(q)), color: i === 3 ? ORANGE : null}; };
    drawBox(g, why, W / 2, 620, {align: 'center', anim: (it, i) => anim(it, i) ?? null, check: b >= O.why + 0.6});
    captions(g, b, [[O.ask, T.overture.ask]], {x: W / 2 - rich(T.overture.ask, 84).w / 2, y: 860, size: 84});
    return;
  }
  // 28—32 拍：回到这一点，切线从点里伸出来
  const cam = camera(X0, Y0, 330);
  plot(g, CURVE.f, cam, INK, 9);
  const r = 2.4 * outCubic(seg(b, O.dive, O.dive + 1.5));
  plot(g, x => Y0 + D1 * (x - X0), cam, ORANGE, 6, {X0: cam.X(X0 - r), X1: cam.X(X0 + r)});
  point(g, cam.X(X0), cam.Y(Y0), 22);
  captions(g, b, [[O.dive, T.overture.ask]], {size: 76});
}

// ---------- 1 切线：十进位连续放大 ----------
function tangent(g, b) {
  const k = K.tangent;
  let s;
  if (b < k.near) s = 480;
  else if (b < k.straight) s = 480 * 1000 ** ((b - k.near) / (k.straight - k.near));
  else if (b < k.back) s = 480000;
  else s = Math.exp(lerp(Math.log(480000), Math.log(200), outQuint(seg(b, k.back, k.back + 1))));
  const cam = camera(X0, Y0, s, s, W / 2, 560);
  // 十进位网格：间距是 10 的整数次幂，屏幕上落在 60—600 像素之间
  const d = 10 ** Math.ceil(Math.log10(60 / s));
  g.strokeStyle = INK; g.lineWidth = 2;
  for (let j = Math.ceil(cam.x(0) / d); j * d <= cam.x(W); j++) {
    const X = cam.X(j * d);
    g.beginPath(); g.moveTo(X, 300); g.lineTo(X, 330); g.moveTo(X, 790); g.lineTo(X, 820); g.stroke();
  }
  line(g, 0, 300, W, 300, INK, 2); line(g, 0, 820, W, 820, INK, 2);
  clipRect(g, 0, 300, W, 820);
  plot(g, CURVE.f, cam, INK, 12);
  plot(g, x => Y0 + D1 * (x - X0), cam, ORANGE, 5);
  if (b >= k.apart) {
    const q = outCubic(seg(b, k.apart, k.apart + 0.4));
    for (const x of [X0 - 1.9, X0 + 1.9]) {
      const ya = cam.Y(Y0 + D1 * (x - X0)), yb = cam.Y(CURVE.f(x));
      line(g, cam.X(x), ya, cam.X(x), lerp(ya, yb, q), ORANGE, 12, 'butt');
    }
  }
  point(g, cam.X(X0), cam.Y(Y0), 18);
  g.restore();
  if (b < k.back) {
    const z = Math.round(s / 480);
    drawBox(g, tex(`\\times~${z.toLocaleString('en-US')}`, 120), 1840, 1000, {align: 'right'});
  }
  if (b >= k.formula) {
    const A = tex("\\t{m}{f(x) \\approx f(x_0) + f'(x_0)(x - x_0)}", 92);
    const B = tex("\\t{m}{f(x) \\approx f(x_0) + f'(x_0)(x - x_0)} + \\t{e}{\\o{o(x - x_0)}}", 92);
    if (b < k.error) drawBox(g, A, W / 2, 985, {align: 'center', scale: slamScale(b, k.formula)});
    else morph(g, A, W / 2, 985, B, W / 2, 985, seg(b, k.error, k.error + 0.4));
  }
  captions(g, b, [[0, T.tangent.near], [k.straight, T.tangent.straight], [k.apart, T.tangent.apart], [k.formula, T.tangent.name], [k.error, T.tangent.error]]);
}

// ---------- 2 系数：指数一个个落下来 ----------
const POWER = [
  '\\t{x}{x}^{\\t{e3}{3}}',
  '\\t{e3}{3}\\t{x}{x}^{\\t{e2}{2}}',
  '\\t{e3}{3}\\t{d1}{\\cdot}\\t{e2}{2}\\t{x}{x}^{\\t{e1}{1}}',
  '\\t{e3}{3}\\t{d1}{\\cdot}\\t{e2}{2}\\t{d2}{\\cdot}\\t{e1}{1}',
  '\\o{\\t{f}{3!}}',
];
const POLY = '\\t{p}{p(x)}\\t{eq}{=}\\t{a0}{a_0}~\\t{a1}{+~a_1x}~\\t{a2}{+~a_2x^2}~\\t{pl}{+}~\\t{a3}{a_3x^3}~\\t{a4}{+~a_4x^4}';
const ONLY = "\\t{p}{p'''(0)}\\t{eq}{=}\\t{f}{\\o{3!}}\\,\\t{a3}{a_3}";
const SOLVED = "\\t{a3}{a_3}\\t{eq}{=}\\frac{\\t{p}{p'''(0)}}{\\t{f}{\\o{3!}}}";
function coeff(g, b) {
  const k = K.coeff;
  if (b < k.poly) {
    const steps = [...k.drops, k.fact];
    const i = last(steps, b - 0.001 + 0.45);
    const drop = ['e3', 'e2', 'e1', null];
    if (i < 0) drawBox(g, tex(POWER[0], 300), W / 2, 680, {align: 'center', scale: slamScale(b, 0)});
    else {
      const q = seg(b, steps[i] - 0.45, steps[i]);
      morph(g, tex(POWER[i], 300), W / 2, 680, tex(POWER[i + 1], 300), W / 2, 680, q, {hopOf: tag => (tag === drop[i] ? 260 : 0)});
    }
    captions(g, b, [[0, T.coeff.drop], [k.fact, T.coeff.fact]], {until: k.poly});
    return;
  }
  if (b < k.general) {
    const P = tex(POLY, 100), Q = tex(ONLY, 130), S = tex(SOLVED, 130);
    const falls = {a0: 17, a1: 17.3, a2: 17.6, a4: 18.2};
    const fallen = new Set(Object.keys(falls));
    if (b < k.only - 0.5) {
      drawBox(g, P, W / 2, 560, {align: 'center', scale: slamScale(b, k.poly), check: b < 17, anim: it => {
        const t0 = falls[it.tag];
        if (t0 === undefined || b < t0) return {};
        const t = (b - t0) * 0.5;
        return {dy: 2600 * t * t, rot: t * 3 * (it.tag === 'a4' ? -1 : 1)};
      }});
    } else if (b < k.solve - 0.5) {
      morph(g, P, W / 2, 560, Q, W / 2, 600, seg(b, k.only - 0.5, k.only), {hideA: fallen});
    } else {
      morph(g, Q, W / 2, 600, S, W / 2, 600, seg(b, k.solve - 0.5, k.solve), {hopOf: tag => (tag === 'p' ? -180 : tag === 'f' ? 160 : 0)});
    }
    captions(g, b, [[k.poly, T.coeff.apply], [k.only, T.coeff.only]], {until: k.general});
    return;
  }
  drawBox(g, tex('a_k = \\frac{f^{(k)}(x_0)}{\\o{k!}}', 170), W / 2, 650, {align: 'center', scale: slamScale(b, k.general)});
  captions(g, b, [[k.general, T.coeff.general]]);
}

// ---------- 3 泰勒多项式：弹性尺逐阶弯曲，两座导数塔逐层亮起 ----------
const TOWER = ['f', "f'", "f''", "f'''", 'f^{(4)}', 'f^{(5)}', 'f^{(6)}'];
function poly(g, b) {
  const k = K.poly;
  const cam = camera(X0, Y0, 220, 220, 740, 520);
  clipRect(g, 60, 250, 1440, 830);
  plot(g, CURVE.f, cam, INK, 9, {X0: 60, X1: 1440});
  const i = last(k.orders, b);
  if (i >= 0) {
    const q = spring(seg(b, k.orders[i], k.orders[i] + 1));
    const now = TP(i);
    if (i === 0) plot(g, x => now.at(x) + (1 - q) * 2.4, cam, ORANGE, 8, {X0: 60, X1: 1440});
    else { const before = TP(i - 1); plot(g, x => lerp(before.at(x), now.at(x), q), cam, ORANGE, 8, {X0: 60, X1: 1440}); }
  }
  point(g, cam.X(X0), cam.Y(Y0), 20);
  g.restore();
  // 导数塔：左列 f 的各阶导数，右列 Tₙ；对上一阶亮一格
  drawBox(g, tex('f', 70), 1560, 250, {align: 'center'});
  drawBox(g, tex('\\o{T_n}', 70), 1770, 250, {align: 'center'});
  for (let r = 0; r < TOWER.length; r++) {
    const y = 820 - r * 84;
    g.strokeStyle = INK; g.lineWidth = 4;
    g.strokeRect(1480, y - 37, 160, 74);
    g.strokeRect(1700, y - 37, 140, 74);
    drawBox(g, tex(TOWER[r], 54), 1560, y + 18, {align: 'center'});
    if (i >= r) {
      const q = outBack(seg(b, k.orders[r], k.orders[r] + 0.35));
      g.fillStyle = ORANGE;
      g.fillRect(1770 - 66 * q, y - 33 * q, 132 * q, 66 * q);
      if (q > 0.6) drawBox(g, tex('=', 50), 1670, y + 17, {align: 'center'});
    }
  }
  if (i >= 0) drawBox(g, tex(`n = \\o{${i}}`, 84), 1660, 1000, {align: 'center', scale: slamScale(b, k.orders[i], 0.2)});
  if (b >= k.formula) drawBox(g, tex('T_n(x) = \\sum_{k=0}^{n} \\frac{f^{(k)}(x_0)}{\\o{k!}}(x - x_0)^k', 78), 740, 975, {align: 'center', scale: slamScale(b, k.formula)});
  captions(g, b, [[k.orders[0], T.poly.orders[0]], [k.orders[1], T.poly.orders[1]], [k.orders[2], T.poly.orders[2]], [k.same, T.poly.orders[3]], [k.title, T.poly.title]], {y: 180});
}

// ---------- 4 佩亚诺：横向按 h、纵向按 h² 缩放的显微镜，再穿过洛必达的各层 ----------
const PLANES = [
  '\\lim_{x \\to x_0} \\frac{R_n(x)}{Q_n(x)}',
  "= \\frac{R_n'(x)}{Q_n'(x)}",
  "= \\frac{R_n''(x)}{Q_n''(x)}",
  '= \\frac{R_n^{(n-1)}(x)}{Q_n^{(n-1)}(x)}',
  '= \\o{0}',
];
const PLANE_X = [0, 280, -280, 220, 0];
function peano(g, b) {
  const k = K.peano;
  if (b < k.dive) {
    const h = 3 * (0.004 / 3) ** seg(b, 0.5, 11);
    const T2 = TP(2);
    const U = u => 960 + 760 * u, V = v => 640 - 330 * v;
    line(g, 180, 640, 1740, 640, INK, 3);
    line(g, 960, 625, 960, 655, INK, 3);
    clipRect(g, 150, 230, 1770, 900);
    const draw = (fn, color, width) => {
      g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath();
      for (let j = 0; j <= 400; j++) { const u = -1 + j / 200, y = clamp(V(fn(u)), -500, 1600); j ? g.lineTo(U(u), y) : g.moveTo(U(u), y); }
      g.stroke();
    };
    draw(u => u * u, INK, 9);
    draw(u => (CURVE.f(X0 + u * h) - T2.at(X0 + u * h)) / (h * h), ORANGE, 9);
    g.restore();
    drawBox(g, tex('x_0 - h', 48), U(-1), 710, {align: 'center'});
    drawBox(g, tex('x_0', 48), 960, 710, {align: 'center'});
    drawBox(g, tex('x_0 + h', 48), U(1), 710, {align: 'center'});
    line(g, 160, 960, 240, 960, INK, 9); drawBox(g, tex('(x - x_0)^2', 60), 270, 980);
    line(g, 700, 960, 780, 960, ORANGE, 9); drawBox(g, tex('R_2(x)', 60), 810, 980);
    drawBox(g, tex(`h = ${h < 0.1 ? h.toFixed(3) : h.toFixed(2)}`, 80), 1840, 985, {align: 'right'});
    captions(g, b, [[0, T.peano.approach], [k.claim, T.peano.claim]], {until: k.dive});
    return;
  }
  if (b < k.formula) {
    const reads = [...k.planes, k.zero], Z = j => 1300 * j, F = 900;
    const zRead = j => Z(j) - F;
    let z;
    if (b < reads[0]) z = lerp(zRead(0) - 600, zRead(0), outCubic(seg(b, k.dive, reads[0])));
    else {
      const j = last(reads, b);
      const hold = reads[j] + 0.9;
      if (j === reads.length - 1 || b < hold) z = zRead(j) + 80 * (b - reads[j]);
      else z = lerp(zRead(j) + 72, zRead(j + 1), inOut(seg(b, hold, reads[j + 1])));
    }
    // 只画眼前这一层和后面一层，更远的层不画，免得叠成一团小字
    const order = PLANES.map((_, j) => j).filter(j => Z(j) - z > 70 && Z(j) - z < 2300).sort((a, c) => Z(c) - Z(a));
    for (const j of order) {
      const sc = F / (Z(j) - z);
      const box = tex(PLANES[j], j === 4 ? 260 : 150);
      const cx = 960 + PLANE_X[j] * sc, cy = 600 + 40 * sc;
      const reading = Math.abs(sc - 1) < 0.12;
      drawBox(g, box, cx, cy, {align: 'center', scale: sc, check: reading});
      if (j === 0) drawBox(g, tex('R_n = f - T_n, ~ Q_n = (x - x_0)^n', 68), cx, cy + 250 * sc, {align: 'center', scale: sc, check: reading});
    }
    captions(g, b, [[k.dive, T.peano.proof]], {until: k.formula});
    return;
  }
  drawBox(g, tex('f(x) = T_n(x) + \\o{o((x - x_0)^n)}', 128), W / 2, 610, {align: 'center', scale: slamScale(b, k.formula)});
  drawBox(g, tex('x \\to x_0', 64), W / 2, 780, {align: 'center'});
  captions(g, b, [[k.title, T.peano.title]], {size: 96, y: 220});
}

// ---------- 5 麦克劳林：老虎机转轮 ----------
const MAC = [
  '\\o{e^x} = 1 + x + \\frac{x^2}{2!} + \\cdots + \\frac{x^n}{n!} + o(x^n)',
  '\\o{\\sin x} = x - \\frac{x^3}{3!} + \\frac{x^5}{5!} - \\cdots + o(x^{2m})',
  '\\o{\\cos x} = 1 - \\frac{x^2}{2!} + \\frac{x^4}{4!} - \\cdots + o(x^{2m+1})',
  '\\o{\\ln(1+x)} = x - \\frac{x^2}{2} + \\frac{x^3}{3} - \\cdots + o(x^n)',
  '\\o{(1+x)^\\alpha} = 1 + \\alpha x + \\frac{\\alpha(\\alpha - 1)}{2!}x^2 + \\cdots + o(x^n)',
  '\\o{\\frac{1}{1 - x}} = 1 + x + x^2 + \\cdots + x^n + o(x^n)',
];
const HEADS = ['e^x', '\\sin x', '\\cos x', '\\ln(1+x)', '(1+x)^\\alpha', '\\frac{1}{1 - x}'];
function maclaurin(g, b) {
  const k = K.maclaurin;
  if (b < k.spin) {
    const open = 0.6 + 0.4 * outQuint(seg(b, 0, 0.4));
    line(g, W / 2 - 900 * open, 400, W / 2 + 900 * open, 400, INK, 8, 'butt');
    line(g, W / 2 - 900 * open, 720, W / 2 + 900 * open, 720, INK, 8, 'butt');
    if (b >= k.faces[0] - 1.6) {
      const p = REEL.position(b), v = (REEL.position(b + 0.01) - REEL.position(b - 0.01)) / 0.02;
      clipRect(g, 0, 405, W, 715);
      for (let j = Math.floor(p) - 1; j <= Math.floor(p) + 2; j++) {
        const box = tex(MAC[((j % 6) + 6) % 6], 100);
        const y = 560 + (j - p) * 320 - (box.ink.y0 + box.ink.y1) / 2;
        const still = Math.abs(v) < 0.05 && Math.abs(j - p) < 0.02;
        drawBox(g, box, W / 2, y, {align: 'center', check: still, anim: () => ({sy: 1 + Math.min(2.2, Math.abs(v) * 0.05)})});
      }
      g.restore();
    }
    if (b >= 1) drawBox(g, tex("f(x) = f(0) + f'(0)x + \\frac{f''(0)}{2!}x^2 + \\cdots + \\frac{f^{(n)}(0)}{n!}x^n + o(x^n)", 68), W / 2, 895, {align: 'center', scale: slamScale(b, 1)});
    captions(g, b, [[0, T.maclaurin.title]], {until: k.spin});
    return;
  }
  // 转轮的两道线向上下拉开，让出六个函数的位置
  const part = outQuint(seg(b, k.spin, k.spin + 0.2));
  line(g, 60, lerp(400, 330, part), W - 60, lerp(400, 330, part), INK, 8, 'butt');
  line(g, 60, lerp(720, 960, part), W - 60, lerp(720, 960, part), INK, 8, 'butt');
  HEADS.forEach((h, j) => {
    const b0 = k.spin + j * 0.25;
    if (b < b0) return;
    drawBox(g, tex(j % 2 ? `\\o{${h}}` : h, 130), 480 + 480 * (j % 3), j < 3 ? 520 : 800, {align: 'center', scale: slamScale(b, b0, 0.22), check: b >= b0 + 0.22});
  });
  captions(g, b, [[k.spin, T.maclaurin.spin]]);
}

// ---------- 6 求极限：同项相撞抵消成粒子，剩下的项由粒子聚成 ----------
const PROBLEM = '\\lim_{x \\to 0} \\frac{\\cos x - e^{-x^2/2}}{x^4}';
const COLS = [870, 1110, 1400, 1690];
const ROWS = [
  {lhs: '\\cos x', terms: ['1', '- \\frac{x^2}{2}', '+ \\frac{x^4}{24}', '+ o(x^5)'], y: 520, at: K.limit.cos},
  {lhs: 'e^{-x^2/2}', terms: ['1', '- \\frac{x^2}{2}', '+ \\frac{x^4}{8}', '+ o(x^5)'], y: 740, at: K.limit.exp},
];
const MID = 630;
function burst(g, box, x, y, t, seed, color) {
  const r = rng(seed);
  for (const [px, py] of sampleBox(box, 5)) {
    const ang = r() * 2 * Math.PI, sp = 300 + 900 * r(), life = 0.5 + 0.6 * r();
    if (t > life) continue;
    const sz = 5 * (1 - t / life);
    disc(g, x + px + Math.cos(ang) * sp * t, y + py + Math.sin(ang) * sp * t + 900 * t * t, sz, r() < 0.2 ? ORANGE : color);
  }
}
function limit(g, b) {
  const k = K.limit;
  if (b >= k.answer) {
    drawBox(g, tex(`${PROBLEM} = \\o{-\\frac{1}{12}}`, 120), W / 2, 620, {align: 'center', scale: slamScale(b, k.answer)});
    return;
  }
  const pm = inOut(seg(b, 3, 3.6));
  drawBox(g, tex(PROBLEM, 120), lerp(W / 2, 1420, pm), lerp(600, 230, pm), {align: 'center', scale: lerp(1, 0.75, pm), check: pm === 0 || pm === 1});
  const merge = seg(b, 15, 15.8);
  ROWS.forEach((row, ri) => {
    if (b < row.at) return;
    const y = lerp(row.y, MID, inOut(merge));
    const lhs = tex(row.lhs, 96);
    if (b < 15) drawBox(g, lhs, 650, y, {align: 'right', anim: b < row.at + 0.5 ? dropIn(b, row.at) : null, check: b >= row.at + 0.5});
    if (b < 15) drawBox(g, tex('=', 96), 720, y, {align: 'center'});
    row.terms.forEach((src, c) => {
      const box = tex(src, 96), b0 = row.at + 0.15 * (c + 1);
      if (b < b0) return;
      const cancel = k.cancel[c];
      if (cancel !== undefined && b >= cancel - 0.5) {
        const q = seg(b, cancel - 0.5, cancel);
        if (b < cancel) drawBox(g, box, COLS[c], lerp(row.y, MID + (ri ? 30 : -30), q * q), {align: 'center', check: false});
        else burst(g, box, COLS[c] - box.w / 2, MID, (b - cancel) * 0.5, 700 + 10 * c + ri, INK);
        return;
      }
      if (c === 2 && b >= 15.4) return;
      if (c === 3 && b >= 15) return;
      drawBox(g, box, COLS[c], y, {align: 'center', anim: b < b0 + 0.4 ? dropIn(b, b0) : null, check: b >= b0 + 0.4 && merge === 0});
    });
  });
  if (b >= 15) {
    // 两边合成一行：cos x − e^(−x²/2) = … + o(x⁵)
    const lhs = tex('\\cos x - e^{-x^2/2}', 96);
    drawBox(g, lhs, 820, MID, {align: 'right', anim: b < 15.5 ? dropIn(b, 15) : null, check: b >= 15.6});
    drawBox(g, tex('=', 96), 890, MID, {align: 'center'});
    drawBox(g, tex('+ o(x^5)', 96), 1310, MID, {anim: b < 15.5 ? dropIn(b, 15) : null, check: b >= 15.6});
    const target = tex('\\o{-\\frac{x^4}{12}}', 110);
    const tx = 1110, ty = MID;
    if (b < k.left) {
      const src = [tex(ROWS[0].terms[2], 96), tex(ROWS[1].terms[2], 96)];
      const tp = sampleBox(target, 4);
      const r = rng(77);
      let j = 0;
      src.forEach((box, ri) => {
        for (const [px, py] of sampleBox(box, 5)) {
          const [qx, qy] = tp[(j * 7) % tp.length]; j++;
          const delay = 0.6 * r(), q = clamp((b - 15.4 - delay) / (k.left - 15.4 - delay));
          const sx = COLS[2] - box.w / 2 + px, sy = lerp(ROWS[ri].y, MID, inOut(merge)) + py;
          const e = inOut(q), lift = Math.sin(Math.PI * q) * (ri ? 140 : -140);
          disc(g, lerp(sx, tx - target.w / 2 + qx, e), lerp(sy, ty + qy, e) + lift, 3.6, q > 0 ? ORANGE : INK);
        }
      });
    } else drawBox(g, target, tx, ty, {align: 'center', scale: slamScale(b, k.left, 0.2)});
  }
  captions(g, b, [[k.exp, T.limit.sub], [10, T.limit.same], [k.left, T.limit.left]], {until: k.answer});
}

// ---------- 7 拉格朗日型余项：翻牌、折叠 ----------
const NEXT = (arg, lhs) => `${lhs ? '\\t{r}{R_n(x)}\\t{q}{=}' : ''}\\t{m}{\\frac{f^{(n+1)}(${arg})}{(n+1)!}(x - x_0)^{n+1}}`;
const FOLD = [
  "\\t{fx}{f(x)}\\t{eq}{=}\\t{T}{T_n(x)}~\\t{p}{+}~\\frac{\\t{f}{f}^{\\t{o}{(n+1)}}\\t{xi}{(\\o{\\xi})}}{\\t{F}{(n+1)!}}\\t{h}{(x - x_0)}^{\\t{e}{n+1}}",
  "\\t{fx}{f(x)}\\t{eq}{=}\\t{T0}{f(x_0)}~\\t{p}{+}~\\frac{\\t{f}{f}^{\\t{o}{(n+1)}}\\t{xi}{(\\o{\\xi})}}{\\t{F}{(n+1)!}}\\t{h}{(x - x_0)}^{\\t{e}{n+1}}",
  "\\t{fx}{f(x)}\\t{eq}{=}\\t{T0}{f(x_0)}~\\t{p}{+}~\\frac{\\t{f}{f}^{\\t{o1}{(1)}}\\t{xi}{(\\o{\\xi})}}{\\t{F1}{1!}}\\t{h}{(x - x_0)}^{\\t{e1}{1}}",
  "\\t{fx}{f(x)}\\t{eq}{=}\\t{T0}{f(x_0)}~\\t{p}{+}~\\t{f}{f}\\t{pr}{'}\\t{xi}{(\\o{\\xi})}\\t{h}{(x - x_0)}",
  "\\t{fx}{f(x)}~\\t{mi}{-}~\\t{T0}{f(x_0)}\\t{eq}{=}\\t{f}{f}\\t{pr}{'}\\t{xi}{(\\o{\\xi})}\\t{h}{(x - x_0)}",
];
function lagrange(g, b) {
  const k = K.lagrange;
  if (b < k.fold) {
    const A = tex(NEXT('\\t{x0}{x_0}', false), 120), B = tex(NEXT('\\t{xi}{\\o{\\xi}}', false), 120), C = tex(NEXT('\\t{xi}{\\o{\\xi}}', true), 120);
    if (b < k.flap - 0.35) drawBox(g, A, W / 2, 500, {align: 'center', scale: slamScale(b, 0)});
    else if (b < k.title - 0.4) morph(g, A, W / 2, 500, B, W / 2, 500, seg(b, k.flap - 0.35, k.flap), {flip: true});
    else morph(g, B, W / 2, 500, C, W / 2, 500, seg(b, k.title - 0.4, k.title));
    if (b >= k.xi) {
      const xa = 520, xb = 1400, theta = 0.42, q = outBack(seg(b, k.xi, k.xi + 0.6));
      line(g, xa, 830, xb, 830, INK, 6);
      line(g, xa, 805, xa, 855, INK, 6); line(g, xb, 805, xb, 855, INK, 6);
      drawBox(g, tex('x_0', 64), xa, 930, {align: 'center'});
      drawBox(g, tex('x', 64), xb, 930, {align: 'center'});
      const xx = lerp(xa, lerp(xa, xb, theta), q);
      disc(g, xx, 830, 18, ORANGE);
      drawBox(g, tex('\\o{\\xi}', 72), xx, 775, {align: 'center', check: q >= 1});
    }
    captions(g, b, [[0, T.lagrange.next], [k.flap, T.lagrange.xi], [k.xi, T.lagrange.between], [k.title, T.lagrange.title]], {until: k.fold});
    return;
  }
  const steps = [k.fold + 1, k.fold + 2, k.fold + 3, k.n0];
  const i = last(steps, b + 0.35);
  const box = j => tex(FOLD[j], 104);
  if (i < 0) drawBox(g, box(0), W / 2, 560, {align: 'center', scale: slamScale(b, k.fold)});
  else morph(g, box(i), W / 2, 560, box(i + 1), W / 2, 560, seg(b, steps[i] - 0.35, steps[i]), {flip: i < 3, hopOf: tag => (i === 3 && tag === 'T0' ? -150 : 0)});
  if (b >= k.mvt) {
    const B = box(4), q = outQuint(seg(b, k.mvt, k.mvt + 0.5));
    g.fillStyle = ORANGE;
    g.fillRect(W / 2 - B.w / 2, 620, B.w * q, 14);
  }
  captions(g, b, [[k.fold, T.lagrange.n0], [k.mvt, T.lagrange.mvt], [k.proof, T.lagrange.proof]]);
}

// ---------- 8 算 e：方块下落堆叠、数字滚轮、放大镜 ----------
const TOWER_X = 400, TOWER_W = 280, BASE = 970, UNIT = 290;
const S = k => eulerPartial(k);
function eulerTower(g, b, k) {
  for (let j = 0; j < 10; j++) {
    const land = k.blocks[j];
    if (b < land - 0.45) break;
    const top = BASE - UNIT * S(j), h = UNIT / factorial(j);
    const q = seg(b, land - 0.45, land);
    const dy = b < land ? -(1 - q * q) * 1000 : 0;
    const squash = j < 3 && b >= land ? 0.1 * Math.exp(-(b - land) * 9) * Math.cos((b - land) * 30) : 0;
    g.fillStyle = j % 2 ? ORANGE : INK;
    const hh = h * (1 - squash);
    g.fillRect(TOWER_X - TOWER_W / 2 * (1 + squash), top + dy + (h - hh), TOWER_W * (1 + squash), Math.max(hh, 0.0001));
  }
}
function euler(g, b) {
  const k = K.euler;
  line(g, 150, BASE + 4, 650, BASE + 4, INK, 8, 'butt');
  eulerTower(g, b, k);
  ['1', '1', '\\frac{1}{2!}'].forEach((src, j) => {
    if (b < k.blocks[j]) return;
    const mid = BASE - UNIT * S(j) + UNIT / factorial(j) / 2;
    drawBox(g, tex(src, 64), 580, mid + 22, {anim: b < k.blocks[j] + 0.4 ? dropIn(b, k.blocks[j]) : null});
  });
  if (b >= k.loupe) {
    // 放大镜：塔顶 ±2 像素放大 60 倍，看到越来越薄的几层
    const q = outBack(seg(b, k.loupe, k.loupe + 0.5));
    const cx = 720, cy = 340, R = 140 * q, M = 60;
    const top = BASE - UNIT * S(9);
    line(g, TOWER_X + TOWER_W / 2, top, cx - R * 0.95, cy - R * 0.3, INK, 3);
    g.save();
    g.beginPath(); g.arc(cx, cy, Math.max(R, 1), 0, 2 * Math.PI); g.fillStyle = PAPER; g.fill(); g.clip();
    g.translate(cx, cy); g.scale(M, M); g.translate(-(TOWER_X + TOWER_W / 2 - 2), -top);
    eulerTower(g, b, k);
    g.restore();
    ring(g, cx, cy, Math.max(R, 1), INK, 8);
    if (q > 0.9) drawBox(g, tex('\\times~60', 56), cx + 150, cy + 130);
  }
  // 数字滚轮：每一位从旧数字向上滚到新数字，从左到右错开；小数点只占窄位
  const j = last(k.blocks, b);
  const value = j < 0 ? 0 : S(j), old = j <= 0 ? 0 : S(j - 1);
  const ds = value.toFixed(6), os = old.toFixed(6);
  const size = 170, cw = tex('0', size).w;
  const colW = [...ds].map(ch => (ch === '.' ? cw * 0.45 : cw));
  const total = colW.reduce((a, w) => a + w, 0), x0 = 1400 - total / 2, y0 = 600;
  const color = b >= k.value ? ORANGE : INK;
  g.save();
  g.beginPath(); g.rect(x0 - 10, y0 - size * 0.9, total + 20, size * 1.15); g.clip();
  let cx0 = x0;
  for (let c = 0; c < ds.length; c++) {
    const x = cx0 + colW[c] / 2;
    cx0 += colW[c];
    if (ds[c] === '.') { drawBox(g, tex('.', size, color), x, y0, {align: 'center', check: false}); continue; }
    const a = Number(os[c]), z = Number(ds[c]);
    const steps = (z - a + 10) % 10;
    const q = j < 0 ? 1 : inOut(seg(b, k.blocks[j] + c * 0.03, k.blocks[j] + c * 0.03 + 0.4));
    const pos = a + steps * q;
    const lo = Math.floor(pos), fr = pos - lo;
    for (const [dig, off] of [[lo % 10, -fr], [(lo + 1) % 10, 1 - fr]]) {
      if (off >= 1 || off <= -1) continue;
      drawBox(g, tex(String(dig), size, color), x, y0 - off * size * 1.05, {align: 'center', check: false});
    }
  }
  g.restore();
  // 滚轮整体的出画检查（滚动中的数字逐个画，不单独检查）
  if (x0 - 10 < 60 || x0 + total + 10 > W - 60) report(`第 ${state.frame} 帧文字出画：滚轮读数`);
  if (b >= k.value) drawBox(g, tex('\\o{e \\approx}', 120), x0 - 30, y0, {align: 'right', scale: slamScale(b, k.value)});
  if (b >= 1) drawBox(g, tex('e = 1 + 1 + \\frac{1}{2!} + \\cdots + \\frac{1}{9!} + \\frac{e^\\theta}{10!}', 72), 1400, 870, {align: 'center', scale: slamScale(b, 1)});
  captions(g, b, [[0, T.euler.x1], [k.blocks[9], T.euler.add], [k.bound, T.euler.bound]], {x: 920, size: 84});
}

// ---------- 9 误差范围：括号伸展，镜头拉远 ----------
const SIN_TERMS = ['x', '- \\frac{x^3}{3!}', '+ \\frac{x^5}{5!}', '- \\frac{x^7}{7!}', '+ \\frac{x^9}{9!}'];
const shown = m => Math.floor(sinRange(m) * 1e4) / 1e4;
function range(g, b) {
  const k = K.range;
  const i = Math.max(0, last(k.m, b));
  const sOf = m => 330 / sinRange(m);
  let s = sOf(1);
  for (let m = 1; m < 5; m++) if (b >= k.m[m] - 0.7) s = Math.exp(lerp(Math.log(sOf(m)), Math.log(sOf(m + 1)), inOut(seg(b, k.m[m] - 0.7, k.m[m]))));
  const cam = camera(0, 0, s, s, W / 2, 560);
  clipRect(g, 60, 300, W - 60, 800);
  line(g, 0, 560, W, 560, INK, 2);
  plot(g, Math.sin, cam, INK, 9, {step: 3});
  if (b >= k.m[0]) {
    const q = spring(seg(b, k.m[i], k.m[i] + 0.9));
    const now = SP(2 * i + 1), before = i ? SP(2 * i - 1) : null;
    plot(g, x => (before ? lerp(before.at(x), now.at(x), q) : now.at(x)), cam, ORANGE, 8, {step: 3});
  }
  g.restore();
  for (let m = 0; m <= i && b >= k.m[0]; m++) {
    const r = sinRange(m + 1), cur = m === i;
    const q = cur ? outQuint(seg(b, k.m[m], k.m[m] + 0.5)) : 1;
    const xl = cam.X(-r * q), xr = cam.X(r * q), y = cur ? 880 : 905 + 18 * (i - 1 - m);
    if (xl < 20 || xr > W - 20) continue;
    line(g, xl, y, xr, y, cur ? ORANGE : INK, cur ? 10 : 4, 'butt');
    if (cur) { line(g, xl, y - 26, xl, y + 26, ORANGE, 10, 'butt'); line(g, xr, y - 26, xr, y + 26, ORANGE, 10, 'butt'); }
  }
  if (b >= k.m[0]) {
    drawBox(g, tex(`|x| < \\o{${shown(i + 1).toFixed(4)}}`, 64), W / 2, 845, {align: 'center', scale: slamScale(b, k.m[i], 0.2)});
    drawBox(g, tex(`\\sin x \\approx ${SIN_TERMS.slice(0, i + 1).join(' ')}`, 60), 1840, 215, {align: 'right', scale: slamScale(b, k.m[i], 0.2)});
  }
  captions(g, b, [[k.m[0], T.range.goal], [k.far, T.range.far]]);
}

// ---------- 10 收尾：碎片归位成公式，回到分屏 ----------
const PIECES = [
  [0, 'f(x)'], [0, '='], [0, 'f(x_0)', 'g'], [0, '+', 'g'], [0, "f'(x_0)(x - x_0)", 'g'], [0, '+'], [0, "\\frac{f''(x_0)}{\\o{2!}}(x - x_0)^2", 'k2'], [0, '+'], [0, '\\cdots'],
  [1, '+'], [1, '\\frac{f^{(n)}(x_0)}{\\o{n!}}(x - x_0)^n', 'kn'], [1, '+'], [1, '\\o{R_n(x)}', 'R'],
];
const LINE_Y = [380, 700], FS = 80;
function piecesLayout() {
  const out = [];
  for (const row of [0, 1]) {
    const items = PIECES.filter(p => p[0] === row).map(p => ({src: p[1], tag: p[2], box: tex(p[1], FS)}));
    const gap = 0.3 * FS, total = items.reduce((a, it) => a + it.box.w, 0) + gap * (items.length - 1);
    let x = W / 2 - total / 2 + (row ? 120 : 0);
    for (const it of items) { out.push({...it, row, x, y: LINE_Y[row]}); x += it.box.w + gap; }
  }
  return out;
}
let PIECE_POS = null;
function finale(g, b) {
  const k = K.finale;
  if (b < k.one) {
    PIECE_POS ??= piecesLayout();
    PIECE_POS.forEach((p, i) => {
      // 第 0 帧碎片散在画面各处，逐个在自己的拍上归位
      const arrive = 1.5 + (i * 6.5) / PIECE_POS.length;
      const r = rng(900 + i), ang = r() * 2 * Math.PI, dist = 380 + 420 * r();
      const q = seg(b, 0, arrive);
      const e = inOut(q);
      const x = lerp(p.x + Math.cos(ang) * dist, p.x, e), y = lerp(p.y + Math.sin(ang) * dist * 0.55, p.y, e);
      g.save(); g.translate(x, y); g.rotate((1 - e) * (r() - 0.5) * 2.4); g.translate(-x, -y);
      drawBox(g, p.box, x, y, {check: q >= 1});
      g.restore();
    });
    const span = tag => {
      const ps = PIECE_POS.filter(p => p.tag === tag);
      return {x0: Math.min(...ps.map(p => p.x)), x1: Math.max(...ps.map(p => p.x + p.box.w)), y: ps[0].y};
    };
    const labels = [['g', T.finale.labels[0], INK], ['kn', T.finale.labels[1], ORANGE], ['R', T.finale.labels[2], ORANGE]];
    labels.forEach(([tag, text, color], j) => {
      const b0 = k.labels[j];
      if (b < b0) return;
      const sp = span(tag), q = outQuint(seg(b, b0, b0 + 0.4)), y = sp.y + 75;
      line(g, sp.x0, y, lerp(sp.x0, sp.x1, q), y, color, 6, 'butt');
      const box = rich(text, 64);
      drawBox(g, box, (sp.x0 + sp.x1) / 2, y + 80, {align: 'center', anim: b < b0 + 0.6 ? dropIn(b, b0) : null, check: b >= b0 + 0.6});
    });
    return;
  }
  const cam = camera(X0 + 0.22 * (b - k.one), 0, 135);
  const one = rich(T.finale.one, 120), flat = rich(T.finale.flat, 120);
  const draws = [c => drawBox(g, one, W / 2, 260, {align: 'center', color: c, anim: b < k.one + 0.8 ? dropIn(b, k.one) : null, check: b >= k.one + 0.8})];
  if (b >= k.flat) draws.push(c => drawBox(g, flat, W / 2, 900, {align: 'center', color: c, anim: b < k.flat + 0.8 ? dropIn(b, k.flat) : null, check: b >= k.flat + 0.8}));
  splitScreen(g, cam, draws);
  if (b >= k.final) {
    const q = seg(b, k.final, k.final + 1.2);
    const px = cam.X(X0), py = cam.Y(Y0);
    // 收尾回到第 0 帧的橙点：点砸下，一圈墨线在 160 像素内收住
    if (q < 1) ring(g, px, py, 34 + 56 * outCubic(q), INK, 1 + 9 * (1 - q));
    point(g, px, py, 26 * (1 + 2 * (1 - outCubic(seg(b, k.final, k.final + 0.4)))));
  }
}

// ---------- 入口 ----------
const SCENE_FN = {overture, tangent, coeff, poly, peano, maclaurin, limit, lagrange, euler, range, finale};
const stage = document.getElementById('stage');
const ctx = stage.getContext('2d');

function frame(n) {
  state.frame = n;
  const st = frameState(n);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  SCENE_FN[st.scene.id](ctx, st.b);
}

async function init() {
  await document.fonts.load(`600 100px "PingFang SC"`, '泰勒公式');
  await document.fonts.load(`italic 400 100px "STIX Two Text"`, 'xf');
  // 系统字体是否真的被用上：与后备字体的墨迹量度比较
  const m = document.createElement('canvas').getContext('2d');
  const probe = (font, fallback, txt) => { m.font = `${font}, ${fallback}`; const a = m.measureText(txt); m.font = fallback; const z = m.measureText(txt); return a.width !== z.width || a.actualBoundingBoxAscent !== z.actualBoundingBoxAscent; };
  if (!probe('100px "STIX Two Text"', '100px monospace', 'xfξ')) report('字体未加载：STIX Two Text');
  if (!probe('600 100px "PingFang SC"', '600 100px "Songti SC"', '泰勒公式')) report('字体未加载：PingFang SC');
  window.film = {frame, FRAME_COUNT, SCENES, errors: state.errors, png: () => stage.toDataURL('image/png').split(',')[1]};
  window.filmReady = true;
}
init().catch(e => report(String(e.stack ?? e)));
window.addEventListener('error', e => report(e.error?.stack ?? e.message));
