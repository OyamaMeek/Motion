export const FPS = 30;
export const BPM = 120;
export const BEAT_FRAMES = FPS * 60 / BPM;
export const FRAME_COUNT = 900;
export const SAMPLE_RATE = 48000;
// 翻页 0.4 秒，最后一帧之后的那一帧正好是拍点，新页在拍点完全露出。
export const FLIP_FRAMES = 12;

const LENGTHS = [['intro', 6], ['n1', 9], ['n2', 9], ['n3', 9], ['n4', 9], ['n5', 9], ['outro', 9]];

export const PAGES = (() => {
  let beat = 0;
  return LENGTHS.map(([id, beats]) => {
    const page = {id, beats, beat, land: beat * BEAT_FRAMES};
    beat += beats;
    return page;
  });
})();

export function frameState(frame) {
  let page = 0;
  while (page + 1 < PAGES.length && frame >= PAGES[page + 1].land) page++;
  const next = PAGES[page + 1];
  if (next && frame >= next.land - FLIP_FRAMES) {
    return {page, local: frame - PAGES[page].land, flip: {to: page + 1, progress: (frame - (next.land - FLIP_FRAMES)) / FLIP_FRAMES}};
  }
  return {page, local: frame - PAGES[page].land, flip: null};
}
