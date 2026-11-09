// 公式与字幕排版：TeX 子集解析成节点，排成逐字形的列表。每个字形带标签，供逐字动画、字符重排与粒子取样。
// 支持：\frac{}{}、^ _（单字或 {}）、\sum、\lim（上下限）、\o{} 亮橙、\t{标签}{} 标签组、\sin \cos \ln、
// \xi \theta \alpha、\cdots \to \approx \cdot、~ 空格、' 撇号（自动合成 ″ ‴）、中文字符。
export const W = 1920, H = 1080;
export const PAPER = '#F2EDE4', INK = '#161412', ORANGE = '#FF5B14';
export const SERIF = '"STIX Two Text"', CJK = '"PingFang SC"';
const fontOf = (cls, s) => (cls === 'cjk' ? `600 ${s}px ${CJK}` : cls === 'var' ? `italic 400 ${s}px ${SERIF}` : `400 ${s}px ${SERIF}`);

const SYMBOL = {xi: ['ξ', 'var'], theta: ['θ', 'var'], alpha: ['α', 'var'], cdots: ['⋯', 'ord'], to: ['→', 'rel'], approx: ['≈', 'rel'], cdot: ['·', 'bin'], times: ['×', 'ord'], le: ['≤', 'rel'], infty: ['∞', 'ord']};
const NAMES = new Set(['sin', 'cos', 'ln', 'lim']);
const isCJK = ch => /[　-鿿＀-￯]/.test(ch);

function parse(src) {
  let i = 0;
  const group = () => {
    if (src[i] !== '{') { const n = one(); return n ? [n] : []; }
    i++;
    const out = seq('}');
    i++;
    return out;
  };
  const word = () => { const m = /^[a-zA-Z]+/.exec(src.slice(i)); i += m[0].length; return m[0]; };
  function one() {
    const ch = src[i];
    if (ch === undefined) return null;
    if (ch === '\\') {
      i++;
      if (src[i] === ',') { i++; return {k: 'space', em: 0.17}; }
      const w = word();
      if (w === 'frac') { const num = group(), den = group(); return {k: 'frac', num, den}; }
      if (w === 'o') return {k: 'group', items: group(), color: ORANGE};
      if (w === 't') { i++; const end = src.indexOf('}', i), tag = src.slice(i, end); i = end + 1; return {k: 'group', items: group(), tag}; }
      if (w === 'sum') return {k: 'bigop', ch: '∑'};
      if (w === 'lim') return {k: 'bigop', ch: 'lim', name: true};
      if (NAMES.has(w)) return {k: 'atom', ch: w, cls: 'name'};
      if (SYMBOL[w]) return {k: 'atom', ch: SYMBOL[w][0], cls: SYMBOL[w][1]};
      throw new Error(`未知命令 \\${w}`);
    }
    i++;
    if (ch === '{') { i--; return {k: 'group', items: group()}; }
    if (ch === '~') return {k: 'space', em: 0.28};
    if (ch === ' ') return null;
    if (ch === "'") {
      let n = 1;
      while (src[i] === "'") { n++; i++; }
      return {k: 'atom', ch: ['′', '″', '‴'][n - 1], cls: 'prime'};
    }
    if (/[a-zA-Z]/.test(ch)) return {k: 'atom', ch, cls: 'var'};
    if (/[0-9.]/.test(ch)) return {k: 'atom', ch, cls: 'num'};
    if (ch === '-' || ch === '−') return {k: 'atom', ch: '−', cls: 'bin'};
    if (ch === '+') return {k: 'atom', ch: '+', cls: 'bin'};
    if ('=<>≈'.includes(ch)) return {k: 'atom', ch, cls: 'rel'};
    if (ch === '(' || ch === '[') return {k: 'atom', ch, cls: 'open'};
    if (ch === ')' || ch === ']') return {k: 'atom', ch, cls: 'close'};
    if (ch === ',') return {k: 'atom', ch, cls: 'punct'};
    if (ch === '·') return {k: 'atom', ch, cls: 'bin'};
    if (isCJK(ch)) return {k: 'atom', ch, cls: 'cjk'};
    return {k: 'atom', ch, cls: 'ord'};
  }
  function seq(stop) {
    const out = [];
    while (i < src.length && src[i] !== stop) {
      if (src[i] === '^' || src[i] === '_') {
        const which = src[i] === '^' ? 'sup' : 'sub';
        i++;
        const arg = group();
        let base = out.pop() ?? {k: 'atom', ch: '', cls: 'ord'};
        if (base.k !== 'script') base = {k: 'script', base};
        base[which] = arg;
        out.push(base);
        continue;
      }
      const n = one();
      if (n) out.push(n);
    }
    return out;
  }
  return seq(undefined);
}

const meas = (typeof document !== 'undefined' ? document.createElement('canvas') : null)?.getContext('2d');
function measure(ch, font) {
  meas.font = font;
  const m = meas.measureText(ch);
  return {w: m.width, a: m.actualBoundingBoxAscent, d: m.actualBoundingBoxDescent, l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight};
}

// 一个盒子：原点在左端基线，items 里的坐标相对原点；ink 是墨迹包围盒
function emptyBox() { return {w: 0, a: 0, d: 0, items: [], ink: null}; }
const unite = (a, b) => (!a ? b && {...b} : !b ? {...a} : {x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1)});
function append(box, child, dx, dy = 0) {
  for (const it of child.items) box.items.push({...it, x: it.x + dx, y: it.y + dy});
  if (child.ink) box.ink = unite(box.ink, {x0: child.ink.x0 + dx, x1: child.ink.x1 + dx, y0: child.ink.y0 + dy, y1: child.ink.y1 + dy});
  box.a = Math.max(box.a, child.a - dy);
  box.d = Math.max(box.d, child.d + dy);
}

function glyph(ch, cls, s, color, tag) {
  const font = fontOf(cls, s), m = measure(ch, font);
  const b = emptyBox();
  b.w = m.w; b.a = m.a; b.d = m.d;
  b.items.push({t: 'g', ch, x: 0, y: 0, font, size: s, color, tag, ink: {x0: -m.l, x1: m.r, y0: -m.a, y1: m.d}});
  b.ink = {x0: -m.l, x1: m.r, y0: -m.a, y1: m.d};
  return b;
}

function layoutSeq(nodes, s, color, tag) {
  const box = emptyBox();
  let prev = null;
  for (const [idx, n] of nodes.entries()) {
    let cls = n.k === 'atom' ? n.cls : n.k;
    // 开头、左括号、运算符之后的加减号是正负号，不加两侧空隙
    if (cls === 'bin' && (!prev || ['bin', 'rel', 'open', 'punct', 'bigop'].includes(prev))) cls = 'ord';
    const gapBefore = cls === 'rel' ? 0.28 : cls === 'bin' ? (n.ch === '·' ? 0.08 : 0.22) : 0;
    const gapAfter = cls === 'rel' ? 0.28 : cls === 'bin' ? (n.ch === '·' ? 0.08 : 0.22) : cls === 'punct' ? 0.2 : 0;
    if (prev === 'var' && !['var', 'script', 'prime', 'bin', 'rel'].includes(cls)) box.w += 0.03 * s;
    // sin x、cos x：函数名与自变量之间留细空
    if (prev === 'name' && ['var', 'num', 'script'].includes(cls)) box.w += 0.17 * s;
    if (n.k === 'space') {
      const next = nodes[idx + 1];
      const nextCls = next?.k === 'atom' ? next.cls : null;
      if (!['bin', 'rel'].includes(prev) && !['bin', 'rel'].includes(nextCls)) box.w += n.em * s;
      continue;
    }
    box.w += gapBefore * s;
    const child = layout(n, s, color, tag);
    append(box, child, box.w);
    box.w += child.w + gapAfter * s;
    prev = cls === 'ord' && n.k === 'atom' && n.cls === 'bin' ? 'ord' : cls;
  }
  return box;
}

function layout(n, s, color, tag) {
  if (n.k === 'atom') return glyph(n.ch, n.cls, s, color, tag);
  if (n.k === 'group') return layoutSeq(n.items, s, n.color ?? color, n.tag ?? tag);
  if (n.k === 'script') {
    if (n.base.k === 'bigop') return bigop(n.base, n.sub, n.sup, s, color, tag);
    const base = layout(n.base, s, color, tag);
    const box = emptyBox();
    append(box, base, 0);
    const ss = Math.max(s * 0.68, 14);
    let w = 0;
    if (n.sup) {
      const sup = layoutSeq(n.sup, ss, color, tag);
      const lift = Math.max(0.42 * s, base.a - 0.38 * ss);
      // 斜体 f 的右上角外伸到下一个字的位置，上标要让开
      const last = base.items.at(-1);
      const italic = last?.t === 'g' && last.ch === 'f' && last.font.startsWith('italic') ? 0.1 * s : 0.02 * s;
      append(box, sup, base.w + italic, -lift);
      w = Math.max(w, sup.w + italic - 0.02 * s);
    }
    if (n.sub) {
      const sub = layoutSeq(n.sub, ss, color, tag);
      append(box, sub, base.w + 0.01 * s, 0.2 * s);
      w = Math.max(w, sub.w);
    }
    box.w = base.w + w + 0.04 * s;
    return box;
  }
  if (n.k === 'frac') {
    const fs = s * 0.86;
    const num = layoutSeq(n.num, fs, color, tag), den = layoutSeq(n.den, fs, color, tag);
    const width = Math.max(num.w, den.w) + 0.24 * s, axis = 0.27 * s, th = 0.055 * s, gap = 0.13 * s;
    const box = emptyBox();
    append(box, num, (width - num.w) / 2, -(axis + th / 2 + gap + (num.ink?.y1 ?? 0)));
    append(box, den, (width - den.w) / 2, -(axis - th / 2 - gap) - (den.ink?.y0 ?? 0));
    const bar = {x0: 0.05 * s, x1: width - 0.05 * s, y0: -axis - th / 2, y1: -axis + th / 2};
    box.items.push({t: 'r', x: 0, y: 0, w: bar.x1 - bar.x0, h: th, rx: bar.x0, ry: bar.y0, color, tag, ink: bar});
    box.ink = unite(box.ink, bar);
    box.w = width + 0.04 * s;
    return box;
  }
  if (n.k === 'bigop') return bigop(n, null, null, s, color, tag);
  throw new Error(`未知节点 ${n.k}`);
}

function bigop(n, sub, sup, s, color, tag) {
  const op = n.name ? glyph(n.ch, 'name', s, color, tag) : glyph(n.ch, 'ord', s * 1.45, color, tag);
  const ls = s * 0.6;
  const subB = sub && layoutSeq(sub, ls, color, tag), supB = sup && layoutSeq(sup, ls, color, tag);
  const width = Math.max(op.w, subB?.w ?? 0, supB?.w ?? 0);
  const box = emptyBox();
  const opY = n.name ? 0 : 0.18 * s;
  append(box, op, (width - op.w) / 2, opY);
  if (subB) append(box, subB, (width - subB.w) / 2, opY + op.d + 0.12 * s - (subB.ink?.y0 ?? 0));
  if (supB) append(box, supB, (width - supB.w) / 2, opY - op.a - 0.1 * s - (supB.ink?.y1 ?? 0));
  box.w = width + 0.12 * s;
  return box;
}

const cache = new Map();
// 排版并缓存。tags：标签 → 该标签全部字形的墨迹包围盒
export function tex(src, size, color = INK) {
  const key = `${src}|${size}|${color}`;
  if (cache.has(key)) return cache.get(key);
  const box = layoutSeq(parse(src), size, color, undefined);
  box.src = src;
  box.tags = {};
  for (const it of box.items) {
    const r = {x0: it.x + it.ink.x0, x1: it.x + it.ink.x1, y0: it.y + it.ink.y0, y1: it.y + it.ink.y1};
    if (it.tag) box.tags[it.tag] = unite(box.tags[it.tag], r);
  }
  cache.set(key, box);
  return box;
}

// 字幕标记（script.js）：^{} 上标、_{} 下标、[…] 亮橙，空格保留为空隙
export const rich = (str, size, color = INK) => tex(str.replace(/\[/g, '\\o{').replace(/\]/g, '}').replace(/ /g, '~'), size, color);
