import { W, H, F } from './timeline.js';
import { LINES } from './script.js';
import {
  C, camera, paper, night, wash, say, textOn, line3, rgba, mix, font, MONO, rng, inkPoint,
  clamp, lerp, seg, eIO, eOut, eIn, eBack, add, mul,
} from './lib.js';
import { EIGHT, CHAR, charX, charZ, drawLattice, PAD_TRACES, tracePath, person, groundRows, eightStyle } from './world.js';

const B = (f) => f / 15;

// ───────── 第 1 页：一滴墨与八个字 ─────────

export function inkCam(f) {
  const b = B(f);
  const k1 = eIO(seg(b, 2, 11));
  const k2 = eIO(seg(b, 11.5, 16));
  const drift = Math.max(0, b - 16) * 0.05;
  return camera({
    pos: [0, lerp(lerp(8, 12.5, k1), 5.4, k2) + drift, lerp(lerp(-4, -7.5, k1), -4.6, k2) - drift],
    look: [0, 0.9 * k2, lerp(lerp(0.5, 5.4, k1), 9.2, k2)],
    fov: 50,
  });
}

const revealFrame = (i) => 120 + Math.round(i * 7.5);
const standAngle = (f, i) => eIO(seg(B(f), 12 + i * 0.35, 14.2 + i * 0.35)) * (Math.PI / 2);

export const TILT = 0.66;
// 八个字在第 1 页结尾的位置：前四个立起，后四个朝镜头略微抬起
export function eightPose(f, i) {
  const x = charX(i);
  const a = i >= 4 ? (standAngle(f, i - 4) / (Math.PI / 2)) * 0.2 : standAngle(f, i);
  const pivot = charZ(i) - CHAR / 2;
  const V = [0, Math.sin(a), Math.cos(a)];
  return { O: add([x, 0.01, pivot], mul(V, CHAR / 2)), U: [1, 0, 0], V, a };
}

const splash = (() => {
  const r = rng(5);
  return Array.from({ length: 46 }, () => ({ a: r() * Math.PI * 2, d: 1.5 + r() * 3.2, s: 0.04 + r() * 0.13, t: r() * 8 }));
})();

export function ink(ctx, f) {
  paper(ctx);
  const cam = inkCam(f);
  const front = (f - 34) * 0.105;
  drawLattice(ctx, cam, { front, traceLen: (f - 84) * 0.24 });

  // 通向八个字的走线，前沿在每个字显影的那一帧到达
  ctx.save();
  ctx.strokeStyle = rgba(C.ink, 0.85);
  ctx.lineCap = 'round';
  PAD_TRACES.forEach((tr, i) => {
    const p = cam.p([tr.pts[0][0], 0, tr.pts[0][1]]);
    ctx.lineWidth = p ? Math.max(1, p.s * 0.034) : 1;
    tracePath(ctx, cam, tr, tr.len * seg(f, 84, revealFrame(i)));
  });
  ctx.restore();

  // 墨滴下落与落点
  if (f < 30) {
    const y = 5.2 * (1 - (f / 30) ** 2);
    const sh = cam.p([0, 0, 0]);
    ctx.fillStyle = rgba(C.ink, 0.1 + 0.25 * (f / 30));
    ctx.beginPath();
    ctx.ellipse(sh.x, sh.y, sh.s * (0.5 - 0.3 * (f / 30)), sh.s * (0.3 - 0.18 * (f / 30)), 0, 0, Math.PI * 2);
    ctx.fill();
    const d = cam.p([0, y, 0]);
    const r = d.s * 0.2;
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y - r * 2.6);
    ctx.bezierCurveTo(d.x + r * 0.5, d.y - r * 1.2, d.x + r, d.y - r * 0.5, d.x + r, d.y);
    ctx.arc(d.x, d.y, r, 0, Math.PI);
    ctx.bezierCurveTo(d.x - r, d.y - r * 0.5, d.x - r * 0.5, d.y - r * 1.2, d.x, d.y - r * 2.6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.ellipse(d.x - r * 0.35, d.y - r * 0.2, r * 0.16, r * 0.3, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const R = 1.25 * eOut(seg(f, 30, 46)) + 0.25 * seg(f, 46, 240);
    ctx.fillStyle = C.ink;
    ctx.beginPath();
    for (let k = 0; k <= 72; k++) {
      const a = (k / 72) * Math.PI * 2;
      const rr = R * (1 + 0.15 * Math.sin(3 * a + 1) + 0.09 * Math.sin(7 * a + 2) + 0.05 * Math.sin(13 * a));
      const p = cam.p([Math.cos(a) * rr, 0, Math.sin(a) * rr]);
      k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.fill();
    for (const s of splash) {
      const k = eOut(seg(f, 30 + s.t * 0.4, 40 + s.t));
      if (k <= 0) continue;
      const p = cam.p([Math.cos(s.a) * s.d * k, 0, Math.sin(s.a) * s.d * k]);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.s * s.s, p.s * s.s * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 八个字沿走线显影；前四个随后立起
  EIGHT.forEach((ch, i) => {
    const t = seg(f, revealFrame(i), revealFrame(i) + 9);
    if (t <= 0) return;
    const pose = eightPose(f, i);
    if (pose.a > 0.02) {
      textOn(ctx, cam, ch, [charX(i), 0.005, charZ(i) - CHAR / 2 + (CHAR / 2) * (0.6 + 0.4 * Math.cos(pose.a))], [1, 0, 0], [0, 0, 0.6 + 0.4 * Math.cos(pose.a)], CHAR, {
        fill: rgba(C.ink, 0.13 * Math.sin(pose.a) + 0.0),
      });
    }
    const pop = 1 + 0.12 * (1 - eOut(t));
    textOn(ctx, cam, ch, pose.O, pose.U, pose.V, CHAR * pop, { fill: eightStyle(i, C.ink), alpha: clamp(t * 1.4), blur: t < 1 ? (1 - t) * 14 : 0 });
  });
}

// ───────── 第 2 页：蒋葆增 ─────────

const NAME = ['蒋', '葆', '增'];
const NAME_X = 150;
const NAME_Y = 250;
const NAME_PX = 300;

let dust;
function buildDust() {
  const r = rng(23);
  const cam = inkCam(240);
  dust = [];
  for (let n = 0; n < 6200; n++) {
    const i = n % 8;
    const [u, v] = inkPoint(EIGHT[i], r);
    const pose = eightPose(240, i);
    const P = add(add(pose.O, mul(pose.U, (u - 0.5) * CHAR)), mul(pose.V, (0.5 - v) * CHAR));
    const s = cam.p(P);
    const j = n % 3;
    const [tu, tv] = inkPoint(NAME[j], r);
    dust.push({
      sx: s.x, sy: s.y,
      tx: NAME_X + j * (NAME_PX + 14) + tu * NAME_PX,
      ty: NAME_Y + tv * NAME_PX,
      d: r() * 9, swirl: (r() - 0.5) * 260, lift: -60 - r() * 220, orange: i >= 6, size: 1.6 + r() * 1.6, stay: r() < 0.06,
      wob: r() * 6.28,
    });
  }
}

export function name(ctx, f) {
  if (!dust) buildDust();
  night(ctx, 420, -120);
  const cam = inkCam(f);
  drawLattice(ctx, cam, { color: C.white, alpha: 0.1 * (1 - 0.5 * seg(f, 240, 300)), nodes: false });

  // 墨点从八个字飞向人名
  for (const p of dust) {
    const t = eIO(seg(f, 246 + p.d, 246 + p.d + 24));
    const arc = Math.sin(Math.PI * t);
    let x = lerp(p.sx, p.tx, t) + p.swirl * arc;
    let y = lerp(p.sy, p.ty, t) + p.lift * arc;
    let a = 1;
    if (f > 272) {
      if (!p.stay) a = 1 - seg(f, 270, 284);
      else {
        const k = (f - 272) * 0.02;
        x += Math.sin(p.wob + k) * 40 * k;
        y -= 26 * k + Math.cos(p.wob) * 10 * k;
        a = 0.6 * (1 - seg(f, 300, 400));
      }
    }
    if (a <= 0) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.orange ? mix(C.orange, C.white, seg(t, 0.3, 1)) : C.white;
    ctx.fillRect(x - p.size / 2, y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  const lock = seg(f, 264, 272);
  if (lock > 0) {
    ctx.save();
    ctx.globalAlpha = lock;
    ctx.fillStyle = C.white;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = font(900, NAME_PX);
    NAME.forEach((ch, j) => ctx.fillText(ch, NAME_X + j * (NAME_PX + 14) + NAME_PX / 2, NAME_Y + NAME_PX / 2));
    ctx.restore();
  }

  const L = LINES;
  say(ctx, f, { ...L.nameTerm, x: 164, y: 640, px: 34, family: MONO, color: C.fog, track: 0.02, per: 2 });
  say(ctx, f, { ...L.nameRole, x: 160, y: 708, px: 44, color: C.white, track: 0.14 });
  say(ctx, f, { ...L.nameSchoolA, x: 1200, y: 470, px: 48, color: rgba(C.white, 0.86), track: 0.12 });
  say(ctx, f, { ...L.nameSchoolB, x: 1200, y: 548, px: 48, color: rgba(C.white, 0.86), track: 0.12 });
  const hit = F(L.nameWill.at);
  if (f >= hit) {
    const k = 1 + 0.2 * (1 - eOut(seg(f, hit, hit + 5)));
    ctx.save();
    ctx.translate(1196, 760);
    ctx.scale(k, k);
    ctx.font = font(900, 190);
    ctx.fillStyle = C.orange;
    ctx.shadowColor = rgba(C.orange, 0.55);
    ctx.shadowBlur = 40;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(L.nameWill.text, 0, 0);
    ctx.restore();
  }
}

// ───────── 第 3 页：有多远 ─────────

export const FAR_Z = 70;
export const FAR_SIZE = 9;
export const NEAR_X = [-2.4, -0.8, 0.8, 2.4];

// 平原上的公共部分：地平线、远处立着的“国家大事”、脚边的“千万尽力”、人
export function plain(ctx, cam, f, o) {
  const hz = cam.p([0, 0, cam.pos[2] + 4000]);
  const g = ctx.createLinearGradient(0, hz.y - 220, 0, hz.y + 160);
  g.addColorStop(0, 'rgba(231,225,217,0)');
  g.addColorStop(0.58, 'rgba(225,216,204,0.75)');
  g.addColorStop(1, 'rgba(231,225,217,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, hz.y - 220, W, 380);

  // 远处的四个字
  const farGap = o.farSize * 1.07;
  ['国', '家', '大', '事'].forEach((ch, i) => {
    const x = (i - 1.5) * farGap;
    const rise = o.rise ?? 1;
    const fogK = clamp((o.farZ - cam.pos[2]) / 95) * 0.72;
    textOn(ctx, cam, ch, [x, (o.farSize / 2) * rise, o.farZ], [1, 0, 0], [0, rise, 0], o.farSize, { fill: mix(C.ink, '#E1D8CC', fogK) });
  });

  groundRows(ctx, cam, f, { shift: o.shift ?? 0, reveal: o.reveal ?? 99, camZ: cam.pos[2] });

  // 路中间的虚线：从人到远处的字
  if (o.dash > 0) {
    ctx.strokeStyle = rgba(C.mid, 0.55);
    const end = lerp(5, o.farZ - 1, o.dash);
    for (let z = 5; z < end; z += 1.6) {
      const c = cam.clip([0, 0, z], [0, 0, Math.min(end, z + 0.8)]);
      if (!c) continue;
      ctx.lineWidth = Math.max(1, c[0].s * 0.04);
      ctx.beginPath();
      ctx.moveTo(c[0].x, c[0].y);
      ctx.lineTo(c[1].x, c[1].y);
      ctx.stroke();
    }
  }

  ['千', '万', '尽', '力'].forEach((ch, i) => {
    const show = o.near?.(i) ?? 1;
    if (show <= 0) return;
    const V = [0, Math.sin(TILT), Math.cos(TILT)];
    textOn(ctx, cam, ch, add([NEAR_X[i], 0.01, 0.8], mul(V, 0.7)), [1, 0, 0], V, 1.4, { fill: i >= 2 && o.accent ? C.orange : C.ink, alpha: show });
  });
  if (o.person !== 0) person(ctx, cam, [0, 0, 4], 1.25, C.deep, rgba(C.mid, 0.6));
}

export function ask(ctx, f) {
  paper(ctx);
  const b = B(f);
  const z = -9 + 56 * eIn(seg(b, 36, 40));
  const cam = camera({ pos: [0, 3.1 - 1.6 * eIn(seg(b, 36, 40)), z], look: [0, 1.5, z + 20], fov: 50 });
  plain(ctx, cam, f, {
    farZ: FAR_Z,
    farSize: FAR_SIZE,
    rise: eBack(seg(b, 29, 30.2)),
    reveal: (f - 420) * 0.9,
    dash: eIO(seg(b, 32.5, 36)),
    near: (i) => seg(f, 424 + i * 3, 430 + i * 3),
    accent: true,
  });
  say(ctx, f, { ...LINES.askTag, x: 154, y: 164, px: 27, color: rgba(C.mid, 0.8), track: 0.2 });
  say(ctx, f, { ...LINES.ask, x: 150, y: 250, px: 66, weight: 700, color: C.ink, track: 0.1 });
  wash(ctx, '#FFFFFF', 0.8 * (1 - seg(f, 420, 424)));
}
