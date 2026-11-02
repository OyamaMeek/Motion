import {jitter} from '../開場樣圖/v2/clip.js';
import {rng} from '../開場樣圖/v2/scene.js';
import {posedRects} from './geometry.js';
import {PX, PY, LYRIC_BASELINE, roughen, boundsOf, skyBands, paintFrame, createPathCache, tracePath, shapeKey, hashId} from './sheet.js';
import {P} from './film.js';

const CORE = '#fbf5e6';
const SHADOW = 'rgba(58,42,24,.42)';
const LYRIC_FONT = '700 57px "Yuanti TC","PingFang TC",sans-serif';
const TEXTURED = {tableTop: 'kraft', floor: 'kraft', homeFloor: 'kraft', doorFloor: 'kraft', phoneBack: 'kraft', street: 'kraft', doorStreet: 'kraft', city0: 'news', town0: 'news', wipeCover: null};

function makeTexture(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  paint(c.getContext('2d'), w, h);
  return c;
}

// 贴图都比屏幕细一倍：相机推近时纤维才不会糊成一片。
function makeTextures() {
  const r = rng(5170);
  const fibre = makeTexture(1024, 1024, (t, w, h) => {
    t.fillStyle = '#fff'; t.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const x = r() * w, y = r() * h, a = r() * 6.3, l = 4 + r() * 18;
      t.strokeStyle = r() < 0.72 ? `rgba(90,70,45,${0.05 + r() * 0.13})` : 'rgba(255,255,255,.5)';
      t.lineWidth = 0.5 + r() * 0.9;
      t.beginPath(); t.moveTo(x, y); t.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); t.stroke();
    }
  });
  const kraft = makeTexture(1024, 1024, (t, w, h) => {
    t.fillStyle = '#efe2cc'; t.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) {
      const x = r() * w, y = r() * h, l = 5 + r() * 18, a = (r() - 0.5) * 1.6;
      t.strokeStyle = r() < 0.55 ? `rgba(95,66,36,${0.06 + r() * 0.16})` : `rgba(255,245,225,${0.08 + r() * 0.18})`;
      t.lineWidth = 0.5 + r() * 1;
      t.beginPath(); t.moveTo(x, y); t.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); t.stroke();
    }
  });
  // 旧报纸只有灰色假字条与半调方块，没有可读文字。
  const news = makeTexture(900, 720, (t, w, h) => {
    t.fillStyle = '#eadfc8'; t.fillRect(0, 0, w, h);
    const cols = 5, cw = w / cols;
    for (let c = 0; c < cols; c++) {
      const x = c * cw + 10;
      for (let y = 8; y < h; y += 9) {
        if (c === 1 && y > 180 && y < 320) continue;
        let px = x;
        const end = x + cw - 20;
        while (px < end) {
          const len = 3 + r() * 13;
          t.fillStyle = `rgba(62,56,48,${0.42 + r() * 0.3})`;
          t.fillRect(px, y, Math.min(len, end - px), 3);
          px += len + 2.5;
        }
      }
    }
    t.fillStyle = 'rgba(62,56,48,.55)';
    for (let y = 184; y < 316; y += 5) for (let x = cw + 12; x < 2 * cw - 12; x += 5) {
      t.beginPath(); t.arc(x, y, 0.8 + 1.5 * Math.abs(Math.sin(x / 26 + y / 40)), 0, 7); t.fill();
    }
  });
  return {fibre, kraft, news};
}

export function createPaper() {
  const canvas = document.createElement('canvas');
  canvas.width = PX; canvas.height = PY;
  document.body.append(canvas);
  const ctx = canvas.getContext('2d', {alpha: false, willReadFrequently: true});
  const textures = makeTextures();
  const patterns = Object.fromEntries(Object.entries(textures).map(([name, tex]) => {
    const pattern = ctx.createPattern(tex, 'repeat');
    pattern.setTransform(new DOMMatrix([1 / 12, 0, 0, 1 / 12, 0, 0]));
    return [name, pattern];
  }));
  const cached = createPathCache();

  const shadowOn = (z, lift) => {
    const k = Math.sqrt(z) * lift;
    ctx.shadowColor = SHADOW; ctx.shadowBlur = 7 * k; ctx.shadowOffsetX = 2.5 * k; ctx.shadowOffsetY = 4.5 * k;
  };
  const shadowOff = () => { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; };
  const overlay = (path, name) => {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = patterns[name];
    ctx.fill(path);
    ctx.globalCompositeOperation = 'source-over';
  };

  function piece(item, cam) {
    const {id, pts, color, edge, density} = item, b = boundsOf(pts);
    if (density !== undefined) {
      const path = cached(shapeKey(id, pts, 'tissue'), () => tracePath(b.min > 3 ? roughen(pts, {step: 7, amp: 0.25, seed: hashId(id)}) : pts));
      ctx.globalAlpha = Math.min(1, density * 0.82);
      ctx.fillStyle = color;
      ctx.fill(path);
      ctx.globalAlpha = 1;
      return;
    }
    if (b.min < 1.6) {
      ctx.fillStyle = color;
      ctx.fill(cached(shapeKey(id, pts, 'bit'), () => tracePath(pts)));
      return;
    }
    const torn = edge === 'torn', seed = hashId(id);
    const outer = cached(shapeKey(id, pts, 'outer'), () => tracePath(roughen(pts, torn ? {step: 1.6, amp: 1.25, seed} : {step: 9, amp: Math.min(0.16, b.min * 0.04), seed})));
    const inner = torn ? cached(shapeKey(id, pts, 'inner'), () => tracePath(roughen(pts, {step: 1.6, amp: 0.55, seed: seed + 3}))) : outer;
    const lift = b.min > 140 ? 0.9 : Math.min(1.25, 0.45 + b.min * 0.05);
    ctx.save();
    shadowOn(cam.z, lift);
    ctx.fillStyle = CORE;
    ctx.fill(outer);
    if (!torn) {
      ctx.strokeStyle = CORE; ctx.lineJoin = 'round';
      ctx.lineWidth = Math.min(0.85, Math.max(0.28, b.min * 0.1));
      ctx.stroke(outer);
    }
    ctx.restore();
    const material = TEXTURED[id];
    if (material) {
      ctx.fillStyle = patterns[material];
      ctx.fill(inner);
      ctx.globalCompositeOperation = 'multiply';
    }
    ctx.fillStyle = color;
    ctx.fill(inner);
    ctx.globalCompositeOperation = 'source-over';
    if (b.min > 2.5) overlay(inner, 'fibre');
  }

  const painter = {
    offset: (layer, tick) => jitter(hashId(layer) % 9973, tick),
    poly: piece,
    line({pts, color, width}, cam) {
      const w = Math.max(1 / cam.z, width);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      const path = new Path2D();
      pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
      if (width >= 1) {
        ctx.save();
        shadowOn(cam.z, 0.4);
        ctx.strokeStyle = CORE; ctx.lineWidth = w + 0.5;
        ctx.stroke(path);
        ctx.restore();
      }
      ctx.strokeStyle = color; ctx.lineWidth = w;
      ctx.stroke(path);
    },
    dots({pts, color, size}, cam) {
      const s = Math.max(1 / cam.z, size);
      ctx.fillStyle = color;
      for (const [x, y] of pts) ctx.fillRect(x, y, s, s);
    },
    // 光晕用三层叠起来的薄纸圆片。
    glow({x, y, r, color, strength}) {
      ctx.fillStyle = color;
      for (const [k, a] of [[1, 0.2], [0.68, 0.26], [0.36, 0.34]]) {
        ctx.globalAlpha = strength * a;
        ctx.beginPath(); ctx.arc(x, y, r * k, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
    // 每段天色是一条撕开的纸，夜色加深时整条往下滑。
    sky(item, cam) {
      const {id, x, y, w, h} = item;
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      skyBands(item).forEach(({stop, top}, k) => {
        const pts = [[x - 4, 0], [x + w + 4, 0], [x + w + 4, h + 60], [x - 4, h + 60]];
        const outer = cached(`${id}|sky${k}|outer`, () => tracePath(roughen(pts, {step: 2, amp: 1, seed: hashId(id) + k * 7})));
        const inner = cached(`${id}|sky${k}|inner`, () => tracePath(roughen(pts, {step: 2, amp: 0.45, seed: hashId(id) + k * 7 + 3})));
        ctx.save();
        ctx.translate(0, top);
        shadowOn(cam.z, 0.7);
        ctx.fillStyle = CORE; ctx.fill(outer);
        shadowOff();
        ctx.fillStyle = stop; ctx.fill(inner);
        overlay(inner, 'fibre');
        ctx.restore();
      });
      ctx.restore();
    },
    clawd(item, cam) {
      const u = item.unit ?? 1, rects = posedRects(item);
      const shape = new Path2D();
      for (const r of rects) shape.rect(item.x + r.x * u, item.y + r.y * u, r.w * u, r.h * u);
      if (item.density === undefined) {
        ctx.save();
        shadowOn(cam.z, 0.9);
        ctx.fillStyle = CORE; ctx.strokeStyle = CORE; ctx.lineJoin = 'round'; ctx.lineWidth = 0.75 * u;
        ctx.fill(shape); ctx.stroke(shape);
        ctx.restore();
      } else ctx.globalAlpha = item.density;
      for (const r of rects) {
        ctx.fillStyle = r.color;
        ctx.fillRect(item.x + r.x * u - 0.02, item.y + r.y * u - 0.02, r.w * u + 0.04, r.h * u + 0.04);
      }
      ctx.globalAlpha = 1;
      if (item.density === undefined && u >= 0.8) overlay(shape, 'fibre');
    },
    text({x, y, size, text, color}) {
      ctx.save();
      ctx.translate(x, y); ctx.scale(1 / 8, 1 / 8);
      ctx.fillStyle = color;
      ctx.font = `${size * 8}px "PingFang SC","Heiti SC",sans-serif`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(text, 0, 0);
      ctx.restore();
    },
  };

  // 歌词是一张剪下来的贴纸，最后贴在固定位置，不跟相机也不抖动。
  const stickers = new Map();
  function sticker(text) {
    if (stickers.has(text)) return stickers.get(text);
    const made = makeTexture(PX, 220, t => {
      t.font = LYRIC_FONT; t.textAlign = 'center'; t.textBaseline = 'alphabetic'; t.lineJoin = 'round';
      t.shadowColor = SHADOW; t.shadowBlur = 8; t.shadowOffsetX = 2; t.shadowOffsetY = 4;
      t.strokeStyle = CORE; t.lineWidth = 15;
      t.strokeText(text, PX / 2, 130);
      t.shadowColor = 'transparent';
      t.fillStyle = P.ink;
      t.fillText(text, PX / 2, 130);
    });
    stickers.set(text, made);
    return made;
  }

  function render(frame, lyric = null, tick = 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = patterns.kraft;
    ctx.fillRect(0, 0, PX, PY);
    paintFrame(ctx, frame, painter, tick);
    if (lyric) {
      ctx.globalAlpha = lyric.fade;
      ctx.drawImage(sticker(lyric.text), 0, LYRIC_BASELINE - 130);
      ctx.globalAlpha = 1;
    }
  }
  return {canvas, native: canvas, render, textures};
}
