import {FPS, FRAME_COUNT, PAGES, frameState} from './timeline.js';
import {HEADER, INTRO, NODES, OUTRO} from './script.js';

const W = 1920, H = 1080;
const INK = '#1b1916', GRAY = '#6e675c', FAINT = '#c9c0b0', PAPER = '#f4efe4', CARD = '#fbf8f1', ACCENT = '#c8361d';
const CN = '"Songti SC"';
const YEAR_FONT = '700 260px Didot';
const RULER = {x0: 120, x1: 1800, y: 1000, from: Date.UTC(2022, 0, 1), to: Date.UTC(2027, 0, 1)};
const TODAY = '2026-11-03';

const stage = document.getElementById('stage');
const ctx = stage.getContext('2d');
const leaf = Object.assign(document.createElement('canvas'), {width: W, height: H});
const leafCtx = leaf.getContext('2d');
const grain = makeGrain();

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const out = x => 1 - (1 - x) ** 3;
const seg = (b, b0, b1) => clamp((b - b0) / (b1 - b0));
const font = (size, weight = 400) => `${weight} ${size}px ${CN}`;

function makeGrain() {
  const c = Object.assign(document.createElement('canvas'), {width: W, height: H});
  const g = c.getContext('2d');
  const img = g.createImageData(W, H);
  let s = 7;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = (s >>> 24) - 128;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v > 0 ? 255 : 60;
    img.data[i + 3] = Math.abs(v) / 128 * 10;
  }
  g.putImageData(img, 0, 0);
  return c;
}

// 中文按字断行，英文和数字整词不拆；句读不放行首，开引号不放行末。
function wrap(g, text, width) {
  const tokens = text.match(/[A-Za-z0-9.%]+|\s+|./gu);
  const lines = [];
  let line = '';
  for (const tok of tokens) {
    const next = line + tok;
    if (g.measureText(next).width > width && line.trim()) {
      if (/^[，。、；：？！”）》%]/.test(tok)) { lines.push(next); line = ''; continue; }
      let carry = '';
      while (/[“（《]$/.test(line)) { carry = line.slice(-1) + carry; line = line.slice(0, -1); }
      lines.push(line.trimEnd());
      line = (carry + tok).trimStart();
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

// 脚本里的 \n 是按语义定好的换行位置，超宽时才再按字断行。
function paragraph(g, text, x, y, width, lineHeight, chars = Infinity) {
  const lines = text.split('\n').flatMap(part => {
    const parts = wrap(g, part, width);
    if (parts.length > 1 && !window.renderErrors.includes(`超出版心：${part}`)) window.renderErrors.push(`超出版心：${part}`);
    return parts;
  });
  let left = chars;
  lines.forEach((l, i) => {
    if (left <= 0) return;
    g.fillText(left >= l.length ? l : l.slice(0, Math.floor(left)), x, y + i * lineHeight);
    left -= l.length;
  });
  return y + lines.length * lineHeight;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function card(g, x, y, w, h) {
  g.save();
  g.fillStyle = 'rgba(60,45,25,0.08)';
  roundRect(g, x + 6, y + 8, w, h, 10); g.fill();
  g.fillStyle = CARD;
  roundRect(g, x, y, w, h, 10); g.fill();
  g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
  g.restore();
}

function ripple(g, x, y, b, at) {
  const k = seg(b, at, at + 0.7);
  const near = seg(b, at - 0.8, at) * (1 - seg(b, at + 0.4, at + 0.9));
  if (near > 0) {
    g.fillStyle = `rgba(200,54,29,${0.35 * near})`;
    g.beginPath(); g.arc(x, y, 16, 0, Math.PI * 2); g.fill();
  }
  if (k > 0 && k < 1) {
    g.strokeStyle = `rgba(200,54,29,${1 - k})`; g.lineWidth = 3;
    g.beginPath(); g.arc(x, y, 16 + 34 * out(k), 0, Math.PI * 2); g.stroke();
  }
}

function paperBase(g, folio) {
  g.fillStyle = PAPER; g.fillRect(0, 0, W, H);
  g.drawImage(grain, 0, 0);
  g.fillStyle = GRAY; g.font = font(24); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  g.fillText(HEADER.text, 120, 78);
  if (folio) { g.textAlign = 'right'; g.font = '400 26px Didot'; g.fillText(folio, 1800, 78); g.textAlign = 'left'; }
  g.strokeStyle = INK; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(120, 98); g.lineTo(1800, 98); g.stroke();
}

function drawIntro(g, b) {
  paperBase(g, '');
  g.fillStyle = GRAY; g.font = font(30);
  g.fillText(INTRO.kicker.text, 124, 330);
  g.save();
  g.beginPath(); g.rect(0, 360, 120 + 1300 * out(seg(b, 0.4, 1.2)), 200); g.clip();
  g.fillStyle = INK; g.font = font(112, 700);
  g.fillText(INTRO.title.text, 116, 500);
  g.restore();
  g.fillStyle = ACCENT; g.font = font(52, 700);
  g.fillText(INTRO.sub.text.slice(0, Math.floor(INTRO.sub.text.length * seg(b, 2, 2.8))), 120, 610);
  if (b >= 3.5) { g.fillStyle = GRAY; g.font = font(28); g.fillText(INTRO.basis.text, 122, 690); }
}

function drawNodeText(g, node, i, b) {
  paperBase(g, `${i + 1} / ${NODES.length}`);
  g.fillStyle = INK; g.font = YEAR_FONT;
  g.fillText(node.year, 108, 372);
  g.fillStyle = GRAY; g.font = font(28);
  const after = paragraph(g, node.dateline.text, 120, 434, 820, 40);
  g.fillStyle = INK; g.font = font(44, 700);
  paragraph(g, node.fact.text, 120, after + 44, 820, 60);

  const stamp = seg(b, 1, 1.25);
  if (stamp > 0) {
    g.fillStyle = ACCENT; g.font = font(26, 700);
    g.fillText(`动作 ${i + 1}`, 120, 716);
    g.fillRect(120, 728, 72 * out(stamp), 3);
    g.fillStyle = INK; g.font = font(48, 700);
    paragraph(g, node.action.text, 120, 786, 820, 62, node.action.text.length * seg(b, 1.1, 2.1));
  }
  g.fillStyle = GRAY; g.font = font(22);
  g.fillText(node.note.text, 120, 900);
}

function toggle(g, x, y, on) {
  const w = 104, h = 56;
  roundRect(g, x, y, w, h, h / 2);
  g.fillStyle = on > 0.5 ? INK : CARD; g.fill();
  g.strokeStyle = INK; g.lineWidth = 3; g.stroke();
  g.fillStyle = on > 0.5 ? CARD : INK;
  g.beginPath(); g.arc(x + h / 2 + (w - h) * on, y + h / 2, h / 2 - 7, 0, Math.PI * 2); g.fill();
}

function demoTag(g, x, y) {
  g.fillStyle = GRAY; g.font = font(20); g.textAlign = 'right';
  g.fillText('示意', x, y); g.textAlign = 'left';
}

const ART = {
  n1(g, a, b) {
    card(g, 1080, 170, 660, 600);
    g.fillStyle = INK; g.font = font(38, 700); g.fillText(a.title.text, 1124, 236);
    roundRect(g, 1120, 270, 580, 72, 36); g.strokeStyle = INK; g.lineWidth = 2.5; g.stroke();
    g.beginPath(); g.arc(1160, 304, 13, 0, Math.PI * 2); g.moveTo(1170, 314); g.lineTo(1182, 326); g.stroke();
    const typed = Math.floor(clamp((b - 2) / 0.5 + 1, 0, 3)) * (b >= 2 ? 1 : 0);
    g.font = font(34); g.fillText(a.query.text.slice(0, typed), 1200, 318);
    if (b < 3.4 && Math.floor(b * 4) % 2 === 0) g.fillRect(1200 + g.measureText(a.query.text.slice(0, typed)).width + 4, 290, 3, 38);
    ripple(g, 1400, 306, b, 1.7);
    if (b >= 3.5) {
      const k = out(seg(b, 3.5, 3.8));
      g.globalAlpha = k;
      g.strokeStyle = FAINT; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(1120, 400); g.lineTo(1700, 400); g.moveTo(1120, 520); g.lineTo(1700, 520); g.stroke();
      g.fillStyle = INK; g.font = font(36, 700); g.fillText(a.row.text, 1124, 474);
      toggle(g, 1592, 432, 1 - ease(seg(b, 5, 5.3)));
      g.globalAlpha = 1;
    }
    ripple(g, 1644, 460, b, 5);
    if (b >= 5.5) { g.fillStyle = ACCENT; g.font = font(30, 700); g.fillText(a.off.text, 1124, 580); }
    demoTag(g, 1740, 808);
  },

  n2(g, a, b) {
    const rows = ['甲乙甲丙甲丁甲乙戊丙', '乙甲甲丙丁甲乙甲戊甲', '甲丙甲乙甲甲丁乙甲丙'];
    const x0 = 1210, y0 = 300, cw = 54;
    card(g, 1040, 200, 740, 470);
    g.fillStyle = GRAY; g.font = '400 24px Didot'; g.textAlign = 'center';
    for (let c = 0; c < 10; c++) g.fillText(String(c + 1), x0 + c * cw + cw / 2, 262);
    g.textAlign = 'left';
    rows.forEach((row, r) => {
      const y = y0 + r * 110;
      g.fillStyle = INK; g.font = font(28, 700); g.fillText(a.days[r].text, 1072, y + 46);
      g.strokeStyle = FAINT; g.lineWidth = 1.5;
      for (let c = 0; c <= 10; c++) { g.beginPath(); g.moveTo(x0 + c * cw, y); g.lineTo(x0 + c * cw, y + 70); g.stroke(); }
      g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 + 10 * cw, y); g.moveTo(x0, y + 70); g.lineTo(x0 + 10 * cw, y + 70); g.stroke();
      [...row].forEach((ch, c) => {
        const at = 2 + (r * 10 + c) * 0.13;
        if (b < at) return;
        g.globalAlpha = out(seg(b, at, at + 0.12));
        g.fillStyle = INK; g.font = font(30); g.textAlign = 'center';
        g.fillText(ch, x0 + c * cw + cw / 2, y + 46);
        g.textAlign = 'left'; g.globalAlpha = 1;
        if (ch === '甲' && b >= 6.2) {
          g.strokeStyle = ACCENT; g.lineWidth = 3;
          g.beginPath(); g.arc(x0 + c * cw + cw / 2, y + 36, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * out(seg(b, 6.2, 6.6))); g.stroke();
        }
      });
      if (b >= 6.7) { g.fillStyle = ACCENT; g.font = font(26, 700); g.fillText(`甲 ×${[...row].filter(c => c === '甲').length}`, x0 + 10 * cw + 14, y + 46); }
    });
    g.fillStyle = GRAY; g.font = font(24); g.fillText(a.legend.text, 1072, 640);
    demoTag(g, 1780, 708);
  },

  n3(g, a, b) {
    const cards = a.accounts.map((acc, k) => ({acc, x: 1040, y: 190 + k * 190}));
    for (const [k, c] of cards.entries()) {
      card(g, c.x, c.y, 360, 150);
      g.fillStyle = GRAY; g.font = font(24); g.fillText(c.acc.text, c.x + 26, c.y + 46);
      g.fillStyle = INK; g.font = font(34, 700); g.fillText(`“${a.quote.text}”`, c.x + 14, c.y + 106);
      const hl = out(seg(b, 2 + k * 0.5, 2.35 + k * 0.5));
      if (hl > 0) { g.fillStyle = ACCENT; g.fillRect(c.x + 30, c.y + 118, 280 * hl, 4); }
      const k2 = ease(seg(b, 3.6, 4.4));
      if (k2 > 0) {
        g.strokeStyle = INK; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(c.x + 360, c.y + 75);
        const ex = 1490, ey = 470;
        g.lineTo(c.x + 360 + (ex - c.x - 360) * k2, c.y + 75 + (ey - c.y - 75) * k2); g.stroke();
      }
    }
    if (b >= 4.4) {
      g.globalAlpha = out(seg(b, 4.4, 4.7));
      card(g, 1490, 290, 300, 380);
      g.fillStyle = INK; g.font = font(28, 700); g.fillText(a.origin.text, 1516, 340);
      g.fillStyle = FAINT;
      for (let k = 0; k < 4; k++) g.fillRect(1516, 372 + k * 30, 240 - (k % 2) * 60, 10);
      g.fillStyle = INK; g.font = font(24, 700); g.fillText(a.quote.text, 1516, 520);
      g.font = font(22);
      const parts = a.detail.text.split('，');
      parts.forEach((p, k) => g.fillText(k < parts.length - 1 ? `${p}，` : p, 1516, 562 + k * 34));
      g.globalAlpha = 1;
      const hl = out(seg(b, 5.4, 5.8));
      if (hl > 0) {
        g.fillStyle = ACCENT;
        parts.forEach((p, k) => g.fillRect(1516, 574 + k * 34, g.measureText(p).width * hl, 3));
      }
    }
    if (b >= 6) { g.fillStyle = ACCENT; g.font = font(36, 700); g.fillText(a.sum.text, 1490, 740); }
    demoTag(g, 1790, 790);
  },

  n4(g, a, b) {
    card(g, 1060, 180, 700, 420);
    g.save(); g.beginPath(); g.rect(1062, 182, 696, 416); g.clip();
    g.strokeStyle = GRAY; g.lineWidth = 3;
    g.beginPath(); g.arc(1600, 290, 44, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(1060, 520); g.lineTo(1220, 380); g.lineTo(1330, 470); g.lineTo(1460, 340); g.lineTo(1640, 520); g.lineTo(1760, 450); g.stroke();
    g.beginPath(); g.moveTo(1060, 540); g.lineTo(1760, 540); g.stroke();
    g.restore();
    g.fillStyle = CARD; g.strokeStyle = INK; g.lineWidth = 3;
    g.beginPath(); g.arc(1410, 470, 46, 0, Math.PI * 2); g.fill(); g.stroke();
    g.fillStyle = INK; g.beginPath(); g.moveTo(1396, 446); g.lineTo(1396, 494); g.lineTo(1436, 470); g.closePath(); g.fill();

    const path = [[1660, 520], [1130, 240], [1690, 250], [1700, 560], [1160, 680]];
    const stops = [2, 2.7, 3.3, 4.2];
    let p = path[0];
    for (let k = 0; k < stops.length; k++) {
      const t = ease(seg(b, stops[k] - 0.5, stops[k]));
      if (t > 0) p = [path[k][0] + (path[k + 1][0] - path[k][0]) * t, path[k][1] + (path[k + 1][1] - path[k][1]) * t];
    }
    if (b >= 3.6) { g.fillStyle = GRAY; g.font = font(28); g.fillText(a.none.text, 1060, 642); }
    if (b >= 4.2) {
      g.fillStyle = INK; g.font = font(32, 700); g.fillText(a.author.text, 1060, 712);
      const k = out(seg(b, 4.5, 5));
      g.strokeStyle = ACCENT; g.lineWidth = 3.5;
      g.beginPath(); g.ellipse(1180, 700, 150, 40, -0.04, -2.6, -2.6 + Math.PI * 2.1 * k); g.stroke();
    }
    if (b >= 5.5) {
      g.fillStyle = ACCENT; g.font = font(30, 700); g.fillText(`→ ${a.check.text}`, 1360, 712);
    }
    if (b >= 1.5 && b < 4.6) {
      g.globalAlpha = out(seg(b, 1.5, 1.8)) * (1 - seg(b, 4.3, 4.6));
      g.strokeStyle = INK; g.lineWidth = 5; g.fillStyle = 'rgba(251,248,241,0.35)';
      g.beginPath(); g.arc(p[0], p[1], 46, 0, Math.PI * 2); g.fill(); g.stroke();
      g.lineWidth = 9; g.beginPath(); g.moveTo(p[0] + 33, p[1] + 33); g.lineTo(p[0] + 72, p[1] + 72); g.stroke();
      g.globalAlpha = 1;
    }
    demoTag(g, 1760, 808);
  },

  n5(g, a, b) {
    card(g, 1080, 150, 660, 690);
    g.fillStyle = INK; g.font = font(36, 700); g.fillText(a.title.text, 1120, 214);
    const taps = {1: 3, 3: 5};
    a.names.forEach((n, k) => {
      const y = 250 + k * 112;
      g.strokeStyle = FAINT; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(1120, y + 104); g.lineTo(1700, y + 104); g.stroke();
      const gone = taps[k] !== undefined && b >= taps[k] + 0.1;
      g.strokeStyle = gone ? FAINT : INK; g.lineWidth = 2.5;
      g.beginPath(); g.arc(1156, y + 52, 32, 0, Math.PI * 2); g.stroke();
      g.fillStyle = gone ? FAINT : INK; g.font = font(28, 700); g.textAlign = 'center';
      g.fillText(n.text.slice(-1), 1156, y + 62); g.textAlign = 'left';
      g.fillStyle = gone ? GRAY : INK; g.font = font(32, 700); g.fillText(n.text, 1216, y + 64);
      if (gone) {
        g.fillStyle = ACCENT; g.fillRect(1212, y + 52, 110 * out(seg(b, taps[k] + 0.1, taps[k] + 0.4)), 4);
      }
      roundRect(g, 1560, y + 28, 140, 50, 25);
      g.strokeStyle = gone ? GRAY : INK; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = gone ? GRAY : INK; g.font = font(26, gone ? 400 : 700); g.textAlign = 'center';
      g.fillText(gone ? a.offLabel.text : a.on.text, 1630, y + 62); g.textAlign = 'left';
      if (taps[k] !== undefined) ripple(g, 1630, y + 53, b, taps[k]);
    });
    demoTag(g, 1740, 878);
  },
};

function drawNode(g, i, b) {
  const node = NODES[i];
  drawNodeText(g, node, i, b);
  ART[node.id](g, node.art, b);
}

function check(g, x, y, k) {
  if (k <= 0) return;
  g.strokeStyle = ACCENT; g.lineWidth = 6; g.lineCap = 'round'; g.lineJoin = 'round';
  const pts = [[x + 6, y + 22], [x + 18, y + 36], [x + 46, y - 4]];
  const total = 0.4, first = clamp(k / total), second = clamp((k - total) / (1 - total));
  g.beginPath(); g.moveTo(...pts[0]);
  g.lineTo(pts[0][0] + (pts[1][0] - pts[0][0]) * first, pts[0][1] + (pts[1][1] - pts[0][1]) * first);
  if (second > 0) g.lineTo(pts[1][0] + (pts[2][0] - pts[1][0]) * second, pts[1][1] + (pts[2][1] - pts[1][1]) * second);
  g.stroke(); g.lineCap = 'butt'; g.lineJoin = 'miter';
}

function drawOutro(g, b) {
  paperBase(g, '');
  g.fillStyle = INK; g.font = font(96, 700);
  g.fillText(OUTRO.title.text, 116, 252);
  g.fillStyle = ACCENT; g.fillRect(120, 282, 680 * out(seg(b, 0.2, 0.8)), 5);
  OUTRO.checklist.forEach((item, k) => {
    const y = 380 + k * 96;
    g.strokeStyle = INK; g.lineWidth = 3; g.strokeRect(124, y, 42, 42);
    g.fillStyle = GRAY; g.font = '400 32px Didot'; g.fillText(String(k + 1), 196, y + 36);
    g.fillStyle = INK; g.font = font(44, 700); g.fillText(item.text, 236, y + 38);
    check(g, 122, y, seg(b, k + 1, k + 1.35));
  });
  g.fillStyle = GRAY; g.font = font(21);
  OUTRO.sources.forEach((s, k) => g.fillText(s.text, 124, 880 + k * 34));
}

function drawPage(g, index, b) {
  const id = PAGES[index].id;
  if (id === 'intro') drawIntro(g, b);
  else if (id === 'outro') drawOutro(g, b);
  else drawNode(g, NODES.findIndex(n => n.id === id), b);
}

const dateX = iso => {
  const [y, m, d] = iso.split('-').map(Number);
  return RULER.x0 + (RULER.x1 - RULER.x0) * (Date.UTC(y, m - 1, d) - RULER.from) / (RULER.to - RULER.from);
};
const MARKS = [{x: RULER.x0, label: ''}, ...NODES.map(n => ({x: dateX(n.date), label: n.mark})), {x: dateX(TODAY), label: OUTRO.made.text}];

function drawRuler(g, state, frame) {
  const {x0, x1, y} = RULER;
  const grow = frame < PAGES[1].land ? out(seg(frame / FPS, 0.1, 1.6)) : 1;
  const xe = x0 + (x1 - x0) * grow;
  g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x0, y); g.lineTo(xe, y); g.stroke();
  g.lineWidth = 1.2; g.fillStyle = INK; g.font = '400 26px Didot';
  for (let yr = 2022; yr <= 2027; yr++) {
    for (let m = 0; m < 12; m++) {
      const x = x0 + (x1 - x0) * (Date.UTC(yr, m, 1) - RULER.from) / (RULER.to - RULER.from);
      if (x > xe + 0.5 || (yr === 2027 && m > 0)) continue;
      const major = m === 0;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + (major ? 20 : 8)); g.stroke();
      if (major && yr < 2027) g.fillText(String(yr), x + 8, y + 40);
    }
  }
  let from = state.page, to = state.page, k = 0;
  if (state.flip) { to = state.flip.to; k = ease(state.flip.progress); }
  const mx = MARKS[from].x + (MARKS[to].x - MARKS[from].x) * k;
  g.fillStyle = ACCENT;
  for (let i = 1; i < MARKS.length - 1; i++) {
    if (MARKS[i].x <= mx + 0.5) { g.beginPath(); g.arc(MARKS[i].x, y, 6, 0, Math.PI * 2); g.fill(); }
  }
  g.fillRect(x0, y - 2, mx - x0, 4);
  g.beginPath(); g.moveTo(mx - 12, y - 26); g.lineTo(mx + 12, y - 26); g.lineTo(mx, y - 6); g.closePath(); g.fill();
  const label = k < 0.5 ? MARKS[from].label : MARKS[to].label;
  if (label) {
    g.font = font(24, 700); g.textAlign = mx > 1650 ? 'right' : 'center';
    g.fillText(label, mx > 1650 ? mx + 12 : mx, y - 36); g.textAlign = 'left';
  }
}

// 旧页以左缘为轴朝观众翻起，按竖条做透视投影。翻页一路加速，最后一帧仍在画面里，拍点那一帧才完全离开。
function drawFlip(g, progress) {
  const theta = progress ** 2 * Math.PI / 2;
  const F = 5000, S = 96;
  const project = u => {
    const s = F / (F - u * W * Math.sin(theta));
    return {x: W / 2 + (u * W * Math.cos(theta) - W / 2) * s, s};
  };
  const shade = leafCtx.createLinearGradient(0, 0, W, 0);
  shade.addColorStop(0, `rgba(30,22,10,${0.04 * Math.sin(theta)})`);
  shade.addColorStop(1, `rgba(30,22,10,${0.22 * Math.sin(theta)})`);
  leafCtx.fillStyle = shade; leafCtx.fillRect(0, 0, W, H);
  const edge = project(1).x;
  const shadow = g.createLinearGradient(edge, 0, edge + 260, 0);
  shadow.addColorStop(0, `rgba(40,28,12,${0.28 * Math.sin(theta)})`);
  shadow.addColorStop(1, 'rgba(40,28,12,0)');
  g.fillStyle = shadow; g.fillRect(edge, 0, 260, H);
  for (let j = 0; j < S; j++) {
    const a = project(j / S), c = project((j + 1) / S), mid = project((j + 0.5) / S);
    const h = H * mid.s, top = H / 2 - H / 2 * mid.s;
    g.drawImage(leaf, j * W / S, 0, W / S, H, a.x, top, c.x - a.x + 1, h);
  }
}

function renderFrame(n) {
  const frame = clamp(n, 0, FRAME_COUNT - 1);
  const state = frameState(frame);
  const b = state.local / (FPS / 2);
  if (state.flip) {
    drawPage(ctx, state.flip.to, 0);
    drawPage(leafCtx, state.page, b);
    drawFlip(ctx, state.flip.progress);
  } else drawPage(ctx, state.page, b);
  drawRuler(ctx, state, frame);
  return true;
}

window.film = {renderFrame, resetCache() {}, FRAME_COUNT, FPS};

await Promise.all([font(100, 700), font(30, 400), YEAR_FONT, '400 26px Didot'].map(f => document.fonts.load(f, '如何算法2026')));
renderFrame(0);
window.artReady = true;
