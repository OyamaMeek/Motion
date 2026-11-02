/* global p5, brush */
import {rng} from '../開場樣圖/v2/scene.js';
import {posedRects, CHARACTER_COLORS} from './geometry.js';
import {PX, PY, LYRIC_BASELINE, roughen, boundsOf, skyBands, paintFrame, createPathCache, tracePath, shapeKey, hashId, boilVersion, darken} from './sheet.js';
import {P} from './film.js';

const PAPER = '#f6efdf';
const TILE = 1024;
const ANGLES = [-3, 62, 118];
const VERSIONS = [{strokes: 0, seed: 11, dx: 0, dy: 0}, {strokes: 0, seed: 23, dx: 2, dy: 0}, {strokes: 0, seed: 37, dx: 0, dy: 2}, {strokes: 1, seed: 53, dx: 0, dy: 0}];
const STROKES = 500;
const GAP_STRENGTH = 0.66;
const LYRIC_FONT = '600 60px "Hannotate TC","PingFang TC",sans-serif';

// 一张可无缝重复的蜡笔排线：越过边界的笔画在对边再画一次。
function paintWaxTile(angle, strokeSeed) {
  const r = rng(7741 + strokeSeed * 101 + angle * 13);
  for (let i = 0; i < STROKES; i++) {
    const x = r() * TILE, y = r() * TILE, len = 170 + r() * 620, a = (angle + (r() - 0.5) * 12) * Math.PI / 180;
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len, mx = (x + ex) / 2 + (r() - 0.5) * 12, my = (y + ey) / 2 + (r() - 0.5) * 14, weight = 2.8 + r() * 3.6;
    for (const ox of [-TILE, 0, TILE]) for (const oy of [-TILE, 0, TILE]) {
      if (Math.max(x, ex) + ox < -20 || Math.min(x, ex) + ox > TILE + 20 || Math.max(y, ey) + oy < -20 || Math.min(y, ey) + oy > TILE + 20) continue;
      brush.set('wax', '#000000', weight);
      brush.spline([[x + ox, y + oy, 0.7], [mx + ox, my + oy, 1], [ex + ox, ey + oy, 0.75]], 0.5);
    }
  }
}

// 把黑白笔触换成「没有上蜡的地方露出纸色」的贴图，所有颜色共用一组。
function toGapMask(source) {
  const c = document.createElement('canvas');
  c.width = c.height = TILE;
  const t = c.getContext('2d', {willReadFrequently: true});
  t.drawImage(source, 0, 0, TILE, TILE);
  const image = t.getImageData(0, 0, TILE, TILE), d = image.data;
  const [pr, pg, pb] = [parseInt(PAPER.slice(1, 3), 16), parseInt(PAPER.slice(3, 5), 16), parseInt(PAPER.slice(5, 7), 16)];
  for (let i = 0; i < d.length; i += 4) {
    const light = (d[i] + d[i + 1] + d[i + 2]) / 765;
    d[i] = pr; d[i + 1] = pg; d[i + 2] = pb;
    d[i + 3] = Math.round(Math.min(1, light * light) * GAP_STRENGTH * 255);
  }
  t.putImageData(image, 0, 0);
  return c;
}

function grainTile() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const t = c.getContext('2d'), im = t.createImageData(512, 512), grain = rng(911);
  for (let i = 0; i < im.data.length; i += 4) {
    const light = grain() > 0.72, v = light ? 255 : 70;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = grain() * (light ? 30 : 24);
  }
  t.putImageData(im, 0, 0);
  return c;
}

export function createCrayon(done) {
  let job = null;
  const instance = new p5(p => {
    brush.instance(p);
    p.setup = () => {
      const cnv = p.createCanvas(TILE, TILE, p.WEBGL);
      p.pixelDensity(1); p.noiseSeed(7741); p.angleMode(p.DEGREES);
      // 与开场样图相同的蜡层参数。
      brush.add('wax', {type: 'default', weight: 0.62, scatter: 1.15, sharpness: 0.75, grain: 1.5, opacity: 190, spacing: 0.06, pressure: [1.1, 0.9], rotate: 'natural', noise: true});
      p.noLoop();
      cnv.elt.style.display = 'none';
      instance.source = cnv.elt;
    };
    p.draw = () => {
      if (!job) return;
      const current = job;
      job = null;
      p.randomSeed(current.seed);
      p.background('#ffffff'); p.translate(-TILE / 2 + current.dx, -TILE / 2 + current.dy);
      brush.noField(); brush.noFill(); brush.noHatch();
      paintWaxTile(current.angle, current.strokes);
      requestAnimationFrame(() => current.resolve(toGapMask(instance.source)));
    };
  });
  const bake = spec => new Promise(resolve => {
    job = {...spec, resolve};
    instance.redraw();
  });

  async function build() {
    while (!instance.source) await new Promise(ok => setTimeout(ok, 20));
    const tiles = [];
    for (const angle of ANGLES) {
      const row = [];
      for (const version of VERSIONS) row.push(await bake({...version, angle}));
      tiles.push(row);
    }
    instance.remove();

    const canvas = document.createElement('canvas');
    canvas.width = PX; canvas.height = PY;
    document.body.append(canvas);
    const ctx = canvas.getContext('2d', {alpha: false, willReadFrequently: true});
    const gapPatterns = tiles.map(row => row.map(tile => ctx.createPattern(tile, 'repeat')));
    const grain = ctx.createPattern(grainTile(), 'repeat');
    const cached = createPathCache();

    // 笔触随相机放大得比物体慢，推近时仍是一笔一笔；锚点跟着物件，移动时纹理不打滑。
    const gaps = (angleIndex, version, cam, x0, y0, salt) => {
      const pattern = gapPatterns[angleIndex][version], k = 0.42 * Math.sqrt(cam.z) / (6 * cam.z);
      pattern.setTransform(new DOMMatrix([k, 0, 0, k, x0 + (salt % 97), y0 + (salt % 89)]));
      return pattern;
    };
    const waxFill = (path, color, cam, b, seed, version, angleIndex, alpha = 1) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fill(path);
      ctx.fillStyle = gaps(angleIndex, version, cam, b.x0, b.y0, seed);
      ctx.globalAlpha = alpha < 1 ? alpha * 0.3 : 1;
      ctx.fill(path);
      ctx.globalAlpha = 1;
    };
    const angleFor = (seed, big) => (big ? 0 : seed % ANGLES.length);

    const painter = {
      offset: () => ({dx: 0, dy: 0}),
      poly({id, pts, color, edge, density}, cam, layer, tick) {
        const b = boundsOf(pts), seed = hashId(id), version = boilVersion(layer, tick), stroke = version === 3 ? 1 : 0;
        if (density !== undefined) {
          const path = cached(shapeKey(id, pts, `s${stroke}`), () => tracePath(b.min > 2 ? roughen(pts, {step: 5, amp: 0.3, seed: seed + stroke}) : pts));
          waxFill(path, color, cam, b, seed, version, angleFor(seed, b.min > 40), Math.min(1, density * 0.85));
          return;
        }
        if (b.min < 1.2) {
          ctx.fillStyle = color;
          ctx.fill(cached(shapeKey(id, pts, 'bit'), () => tracePath(pts)));
          return;
        }
        const amp = edge === 'torn' ? 0.5 : Math.min(0.26, b.min * 0.06);
        const path = cached(shapeKey(id, pts, `w${stroke}`), () => tracePath(roughen(pts, {step: edge === 'torn' ? 3 : 5, amp, seed: seed + stroke})));
        waxFill(path, color, cam, b, seed, version, angleFor(seed, b.min > 60));
        if (b.min >= 2.4) {
          ctx.strokeStyle = darken(color, 0.62);
          ctx.lineJoin = 'round';
          ctx.lineWidth = 0.46 / Math.sqrt(cam.z);
          ctx.stroke(path);
          ctx.strokeStyle = gaps(1, version, cam, b.x0, b.y0, seed);
          ctx.stroke(path);
        }
      },
      line({pts, color, width}, cam, layer, tick) {
        const w = Math.max(1 / cam.z, width);
        const path = new Path2D();
        pts.forEach(([x, y], i) => (i ? path.lineTo(x, y) : path.moveTo(x, y)));
        ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = w;
        ctx.strokeStyle = color;
        ctx.stroke(path);
        if (width >= 0.6) {
          ctx.strokeStyle = gaps(1, boilVersion(layer, tick), cam, pts[0][0], pts[0][1], 5);
          ctx.stroke(path);
        }
      },
      dots({pts, color, size}, cam) {
        const s = Math.max(1 / cam.z, size);
        ctx.fillStyle = color;
        for (const [x, y] of pts) ctx.fillRect(x, y, s, s);
      },
      glow({id, x, y, r, color, strength}, cam, layer, tick) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r), n = parseInt(color.slice(1), 16), rgb = `${n >> 16},${n >> 8 & 255},${n & 255}`;
        g.addColorStop(0, `rgba(${rgb},${strength})`);
        g.addColorStop(0.55, `rgba(${rgb},${strength * 0.35})`);
        g.addColorStop(1, `rgba(${rgb},0)`);
        const path = new Path2D();
        path.arc(x, y, r, 0, 7);
        ctx.fillStyle = g;
        ctx.fill(path);
        ctx.globalAlpha = strength * 0.28;
        ctx.fillStyle = gaps(0, boilVersion(layer, tick), cam, x, y, hashId(id));
        ctx.fill(path);
        ctx.globalAlpha = 1;
      },
      sky(item, cam, layer, tick) {
        const {id, x, y, w} = item, version = boilVersion(layer, tick);
        skyBands(item).forEach(({stop, top, bottom}, k) => {
          const pts = [[x, top], [x + w, top], [x + w, bottom], [x, bottom]];
          const path = cached(shapeKey(id, pts, `sky${k}`), () => tracePath(roughen(pts, {step: 4, amp: 0.9, seed: hashId(id) + k})));
          waxFill(path, stop, cam, {x0: x, y0: y}, hashId(id) + k, version, 0);
        });
      },
      clawd(item, cam, layer, tick) {
        const u = item.unit ?? 1, version = boilVersion(layer, tick), seed = hashId(item.id);
        ctx.globalAlpha = item.density ?? 1;
        for (const [i, r] of posedRects(item).entries()) {
          const x = item.x + r.x * u, y = item.y + r.y * u, wobble = version === 3 ? 0.05 * u : 0;
          ctx.fillStyle = r.color;
          ctx.fillRect(x - wobble, y + wobble, r.w * u + wobble, r.h * u);
          if (r.color !== CHARACTER_COLORS.eyes && r.color !== CHARACTER_COLORS.outline && r.w * u > 2 && r.h * u > 2 && item.density === undefined) {
            ctx.fillStyle = gaps(1 + (i % 2), version, cam, item.x, item.y, seed);
            ctx.fillRect(x, y, r.w * u, r.h * u);
          }
        }
        ctx.globalAlpha = 1;
      },
      text({x, y, size, text, color}) {
        ctx.save();
        ctx.translate(x, y); ctx.scale(1 / 8, 1 / 8);
        ctx.fillStyle = color;
        ctx.font = `${size * 8}px "Hannotate TC","PingFang SC",sans-serif`;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(text, 0, 0);
        ctx.restore();
      },
    };

    // 歌词用蜡笔写在固定位置，四周擦出一圈纸白，不跟相机。
    const written = new Map();
    function writing(text) {
      if (written.has(text)) return written.get(text);
      const c = document.createElement('canvas');
      c.width = PX; c.height = 220;
      const t = c.getContext('2d');
      t.font = LYRIC_FONT; t.textAlign = 'center'; t.textBaseline = 'alphabetic'; t.lineJoin = 'round';
      t.strokeStyle = PAPER; t.lineWidth = 15;
      t.strokeText(text, PX / 2, 130);
      t.fillStyle = P.ink;
      t.fillText(text, PX / 2, 130);
      written.set(text, c);
      return c;
    }

    function render(frame, lyric = null, tick = 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, PX, PY);
      paintFrame(ctx, frame, painter, tick);
      if (lyric) {
        ctx.globalAlpha = lyric.fade;
        ctx.drawImage(writing(lyric.text), 0, LYRIC_BASELINE - 130);
        ctx.globalAlpha = 1;
      }
      const shift = (tick % 3) * 41;
      ctx.save();
      ctx.translate(shift, shift);
      ctx.fillStyle = grain;
      ctx.fillRect(-shift, -shift, PX, PY);
      ctx.restore();
    }
    return {canvas, native: canvas, render, brushes: brush.box()};
  }
  build().then(done);
}
