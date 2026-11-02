import {rng} from '../../會呼吸的痛/開場樣圖/v2/scene.js';
import {roughen, hashId} from '../../會呼吸的痛/MV/sheet.js';
import {W, H, UPDATES_PER_SECOND, LAYERS, LABELS, COLORS as C, layerOffset, layerBounds} from './scene.js';

const CORE = '#fbf5e6';
const FONT = '"Songti SC"';

function makeCanvas(w = W, h = H) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function makeTexture(paint, w = W, h = H) {
  const c = makeCanvas(w, h);
  paint(c.getContext('2d'), w, h);
  return c;
}

export function createPaper() {
  const r = rng(1026);
  const fibre = makeTexture((t, w, h) => {
    const grain = t.createImageData(w, h);
    for (let i = 0; i < grain.data.length; i += 4) {
      const v = 255 - r() * 16;
      grain.data[i] = grain.data[i + 1] = grain.data[i + 2] = v;
      grain.data[i + 3] = 255;
    }
    t.putImageData(grain, 0, 0);
    for (let i = 0; i < 9000; i++) {
      const x = r() * w, y = r() * h, a = r() * 6.3, l = 3 + r() * 14;
      t.strokeStyle = r() < 0.72 ? `rgba(90,70,45,${0.05 + r() * 0.12})` : 'rgba(255,255,255,.5)';
      t.lineWidth = 0.4 + r() * 0.7;
      t.beginPath(); t.moveTo(x, y); t.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); t.stroke();
    }
  });
  const kraft = makeTexture((t, w, h) => {
    t.fillStyle = C.kraft; t.fillRect(0, 0, w, h);
    for (let i = 0; i < 30000; i++) {
      const x = r() * w, y = r() * h, l = 4 + r() * 13, a = (r() - 0.5) * 1.6;
      t.strokeStyle = r() < 0.55 ? `rgba(95,66,36,${0.06 + r() * 0.16})` : `rgba(240,215,175,${0.08 + r() * 0.18})`;
      t.lineWidth = 0.4 + r() * 0.8;
      t.beginPath(); t.moveTo(x, y); t.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); t.stroke();
    }
  });
  // 旧报纸只用假字条和半调网点，不出现可读文字。
  const news = makeTexture((t, w, h) => {
    t.fillStyle = '#eadfc8'; t.fillRect(0, 0, w, h);
    const cols = 6, cw = w / cols;
    for (let c = 0; c < cols; c++) {
      const x = c * cw + 10;
      for (let y = 8; y < h; y += 9) {
        if (c === 2 && y > 180 && y < 320) continue;
        let px = x;
        const end = x + cw - 20;
        while (px < end) {
          const len = 3 + r() * 13;
          t.fillStyle = `rgba(62,56,48,${0.2 + r() * 0.2})`;
          t.fillRect(px, y, Math.min(len, end - px), 3);
          px += len + 2.5;
        }
      }
    }
    t.fillStyle = 'rgba(62,56,48,.3)';
    for (let y = 184; y < 316; y += 5) for (let x = 2 * cw + 12; x < 3 * cw - 12; x += 5) {
      t.beginPath(); t.arc(x, y, 0.8 + 1.5 * Math.abs(Math.sin(x / 26 + y / 40)), 0, 7); t.fill();
    }
  }, 1080, 720);
  const TEXTURES = {news, kraft};

  let ctx;
  const trace = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); };
  const overlayFibre = () => {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = ctx.createPattern(fibre, 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  };
  const DETAILS = {
    invite({w, h}) {
      ctx.strokeStyle = C.gold; ctx.lineWidth = 4;
      ctx.strokeRect(-w / 2 + 20, -h / 2 + 20, w - 40, h - 40);
      ctx.fillStyle = C.gold; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 150px ${FONT}`;
      ctx.fillText(LABELS.invite, 0, -7);
    },
    title() {
      ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `700 64px ${FONT}`;
      ctx.letterSpacing = '12px';
      ctx.fillText(LABELS.title, 6, -3);
      ctx.letterSpacing = '0px';
    },
  };

  function paintPiece(p, seed) {
    const torn = p.edge === 'torn';
    const outer = torn ? roughen(p.pts, {step: 7, amp: 7, seed}) : roughen(p.pts, {step: 34, amp: 0.8, seed});
    const inner = torn ? roughen(p.pts, {step: 7, amp: 3.5, seed: seed + 17}) : outer;
    ctx.save();
    ctx.shadowColor = 'rgba(58,42,24,.42)'; ctx.shadowBlur = 7 + p.lift * 7; ctx.shadowOffsetX = 2 + p.lift * 2; ctx.shadowOffsetY = 3 + p.lift * 4;
    trace(outer);
    ctx.fillStyle = CORE; ctx.fill();
    if (!torn) { ctx.strokeStyle = CORE; ctx.lineWidth = p.border; ctx.lineJoin = 'round'; ctx.stroke(); }
    ctx.restore();
    ctx.save();
    trace(inner); ctx.clip();
    if (p.tex) {
      ctx.fillStyle = ctx.createPattern(TEXTURES[p.tex], 'repeat'); ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'multiply';
    }
    ctx.fillStyle = p.color; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    overlayFibre();
    if (p.detail) {
      const {cx, cy, deg} = p.frame;
      ctx.translate(cx, cy); ctx.rotate(deg * Math.PI / 180);
      DETAILS[p.detail](p.frame);
    }
    ctx.restore();
  }
  function paintStripe(p) {
    const path = () => { ctx.beginPath(); p.line.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); };
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (p.border) {
      ctx.shadowColor = 'rgba(58,42,24,.4)'; ctx.shadowBlur = 7; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 4;
      path(); ctx.strokeStyle = CORE; ctx.lineWidth = p.width + p.border; ctx.stroke();
      ctx.shadowColor = 'transparent';
    }
    path(); ctx.strokeStyle = p.color; ctx.lineWidth = p.width; ctx.stroke();
    ctx.restore();
  }
  function paintMark(p) {
    trace(p.pts);
    ctx.fillStyle = p.color; ctx.fill();
  }

  const layers = LAYERS.map(layer => {
    const canvas = makeCanvas();
    ctx = canvas.getContext('2d');
    layer.pieces.forEach((p, i) => {
      if (p.kind === 'stripe') paintStripe(p);
      else if (p.kind === 'mark') paintMark(p);
      else paintPiece(p, hashId(`${layer.id}:${i}`));
    });
    // 裁到实际内容（含投影和白边），减少每次更新的合成面积。
    const b = layerBounds(layer), x = Math.max(0, Math.floor(b.x0) - 48), y = Math.max(0, Math.floor(b.y0) - 48);
    const cropped = makeCanvas(Math.min(W, Math.ceil(b.x1) + 48) - x, Math.min(H, Math.ceil(b.y1) + 48) - y);
    cropped.getContext('2d').drawImage(canvas, -x, -y);
    return {id: layer.id, canvas: cropped, x, y};
  });

  const canvas = makeCanvas();
  document.body.append(canvas);
  const out = canvas.getContext('2d');

  // tick 为 null 时输出静态样图；底层牛皮纸不动，其余各层独立抖动。
  function render(tick = null) {
    out.drawImage(kraft, 0, 0);
    for (const layer of layers) {
      const {dx, dy} = tick === null ? {dx: 0, dy: 0} : layerOffset(layer.id, tick);
      out.drawImage(layer.canvas, layer.x + dx, layer.y + dy);
    }
  }
  function play() {
    let tick = 0;
    return setInterval(() => render(tick++), 1000 / UPDATES_PER_SECOND);
  }
  return {canvas, render, play};
}
