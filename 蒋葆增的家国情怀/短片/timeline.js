export const FPS = 30;
export const BPM = 120;
export const BEAT_FRAMES = FPS * 60 / BPM;
export const BEATS = 180;
export const FRAME_COUNT = BEATS * BEAT_FRAMES;
export const SECONDS = FRAME_COUNT / FPS;
export const SAMPLE_RATE = 48000;

// 每页的拍数按阅读量安排。第 1—11 页暗场；上一页的元素在最后一两拍变成下一页的起点（墨点落地、纹理、
// 年份滚动、球升起、镜头拉远），每页在 land 那一帧发生一个明确的动作：大字落下、场景点亮或物件定格。
const LENGTHS = [
  ['open', 16],
  ['motto', 16],
  ['newark', 14],
  ['plan', 14],
  ['hire', 14],
  ['y1979', 14],
  ['aid', 12],
  ['exam', 12],
  ['creed', 16],
  ['notice', 12],
  ['drones', 12],
  ['ours', 14],
  ['end', 14],
];

export const PAGES = (() => {
  let beat = 0;
  return LENGTHS.map(([id, beats]) => {
    const page = {id, beats, beat, land: beat * BEAT_FRAMES, end: (beat + beats) * BEAT_FRAMES};
    beat += beats;
    return page;
  });
})();

// 开场：第 0 帧墨滴已在下落，第 1 拍落地炸开；第 3 拍起八个字每半拍在晶格地面上显影一个；
// 第 8 拍八个字立定；第 10 拍炸成墨点；第 12 拍聚成“蒋葆增”，这一拍也是配乐的重音。
export const OPEN_DROP_BEAT = 1;
export const OPEN_REVEAL_BEAT = 3;
export const OPEN_REVEAL_STEP = 0.5;
export const OPEN_STAND_BEAT = 8;
export const OPEN_BURST_BEAT = 10;
export const OPEN_SNAP_BEAT = 12;
// 第九页点阵重新聚成八个字的那一拍。
export const CREED_SNAP_BEAT = 11;

export function frameState(frame) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= FRAME_COUNT) throw new Error(`帧号越界：${frame}`);
  let i = 0;
  while (i + 1 < PAGES.length && frame >= PAGES[i + 1].land) i++;
  const page = PAGES[i];
  const local = frame - page.land;
  return {index: i, page, local, b: local / BEAT_FRAMES, left: page.end - frame};
}
