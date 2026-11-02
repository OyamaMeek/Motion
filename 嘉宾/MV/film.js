// 全片时间轴：只负责把时间换算成“画哪一镜、镜内第几秒、衔接进行到哪里”，不碰画布。
import {SHOTS, DURATION} from './shots.js';

export const FPS = 30;
export const TICK_HZ = 10;
export const FRAME_COUNT = Math.ceil(DURATION * FPS);
export const BEAT = 60 / 75.0109;

// 编号即分镜表的 T 编号：T(n) 是 SHOTS[n-1] → SHOTS[n]。
const COVER = new Set([1, 7, 8, 9, 10, 11, 14, 17, 18, 21, 24, 28, 29, 33, 35, 38, 46, 48, 50]);
const TEAR = new Set([19, 32]);
const FULL_AT_CUT = new Set([38, 48]);
export const TRANSITIONS = Object.fromEntries(SHOTS.slice(1).map((shot, i) => {
  const t = i + 1;
  return [shot.id, {t, kind: COVER.has(t) ? 'cover' : TEAR.has(t) ? 'tear' : 'same', fullAtCut: FULL_AT_CUT.has(t)}];
}));

const floorTick = u => Math.floor((u + 1e-9) * TICK_HZ) / TICK_HZ;

// 动作都以切点为零点量化，因此每次运动都正好从节拍开始。
export function locate(t) {
  let index = SHOTS.findIndex(s => t < s.end);
  if (index < 0) index = SHOTS.length - 1;
  const shot = SHOTS[index], u = t - shot.start, q = floorTick(u), info = TRANSITIONS[shot.id];
  const base = {id: shot.id, index, q, transition: null};
  if (!info || info.kind === 'same' || u >= BEAT) return base;
  const prev = SHOTS[index - 1], prevDur = prev.end - prev.start, p = q / BEAT;
  if (info.kind === 'tear' || info.fullAtCut) {
    return {...base, transition: {...info, p, from: prev.id, fromQ: prevDur}};
  }
  // 遮挡：半拍之前还在上一镜，盖满全屏的那一刻才换。
  if (u < BEAT / 2) return {id: prev.id, index: index - 1, q: prevDur + q, transition: {...info, p, role: 'leaving'}};
  return {...base, transition: {...info, p, role: 'arriving'}};
}

const smooth = v => { const c = Math.min(1, Math.max(0, v)); return c * c * (3 - 2 * c); };
const line = v => Math.min(1, Math.max(0, v));

export function makeClock(shot, q, transition = null) {
  const dur = shot.end - shot.start;
  return {
    u: q, b: q / BEAT, dur, rb: (dur - q) / BEAT, abs: shot.start + q, poster: shot.poster - shot.start,
    leaving: transition?.role === 'leaving' ? transition.p : null,
    arriving: transition?.role === 'arriving' ? transition.p : null,
    sec: (a, b) => smooth((q - a) / (b - a)),
    in: (a, b) => smooth((q / BEAT - a) / (b - a)),
    end: (a, b) => smooth((a - (dur - q) / BEAT) / (a - b)),
    linear: (a, b) => line((q - a) / (b - a)),
  };
}
