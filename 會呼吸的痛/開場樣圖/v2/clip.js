import {CLAWD, STARS, SUITCASE, rng} from './scene.js';

export const CLIP = {
  start: 14, end: 24,
  beats: [14.327, 14.861, 15.395, 15.929, 16.463, 16.997, 17.531, 18.088, 18.646, 19.156, 19.691, 20.225, 20.759,
    21.293, 21.827, 22.361, 22.895, 23.429, 23.963],
};
export const CLIP_FPS = {pixel: 12, paper: 10, crayon: 8};

const HALF_BEAT = 0.267, WALK_START = CLIP.beats[0] - HALF_BEAT, WALK_STEPS = 13, WALK_END = CLIP.beats[6], SEATED = CLIP.beats[7];
const JUMP = [[216, 131, 1], [212, 125, 2], [208, 123, 3]];
const CASE_PARKED = SUITCASE.body[0];

export const FINAL_STATE = Object.freeze({x: CLAWD.x, y: CLAWD.y, action: 'idle', frame: 0, caseX: CASE_PARKED, stars: STARS.length, lit: 1});

export const clipTicks = fps => Array.from({length: Math.round((CLIP.end - CLIP.start) * fps)}, (_, i) => CLIP.start + i / fps);

export function clipState(t) {
  const beatsSeated = CLIP.beats.filter(b => b >= SEATED && b <= t).length;
  const stars = Math.min(STARS.length, Math.ceil(beatsSeated / 2));
  const lit = 0.15 + 0.85 * Math.min(1, beatsSeated / 11);
  if (t >= SEATED) return {...FINAL_STATE, stars, lit};
  if (t >= WALK_END) {
    const [x, y, frame] = JUMP[Math.min(2, Math.floor((t - WALK_END) / ((SEATED - WALK_END) / 3)))];
    return {x, y, action: 'jump', frame, caseX: CASE_PARKED, stars, lit};
  }
  const step = Math.max(0, Math.min(WALK_STEPS, Math.floor((t - WALK_START) / HALF_BEAT)));
  const x = 322 - 8 * step;
  return {x, y: 134, action: 'walk', frame: step % 4, caseX: x + 35, stars, lit};
}

export function jitter(layer, tick) {
  const r = rng(layer * 7919 + tick * 104729 + 1);
  const axis = () => (r() < 0.5 ? -1 : 1) * (r() < 0.5 ? 1 : 2);
  return {dx: axis(), dy: axis()};
}

export const isLit = (index, fraction) => rng(index * 2654435 + 17)() < fraction;
