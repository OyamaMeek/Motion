export const FPS = 30;
export const BPM = 120;
export const BEAT_FRAMES = FPS * 60 / BPM;
export const BEATS = 180;
export const FRAME_COUNT = BEATS * BEAT_FRAMES;
export const SECONDS = FRAME_COUNT / FPS;
export const SAMPLE_RATE = 48000;

// 每页的拍数按阅读量安排。全片暗场；每页在 land 那一帧完成翻页的关键动作：
// 新场景或大字在这一帧硬切进入，旧页的元素在之前一两拍散开、坠落或缩走。
const LENGTHS = [
  ['open', 12],
  ['motto', 14],
  ['newark', 14],
  ['plan', 14],
  ['hire', 16],
  ['y1979', 16],
  ['aid', 12],
  ['exam', 14],
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

// 开场八个字每半拍砸下一个，第 4 拍收成一行，第 5 拍炸成墨点，第 7 拍聚成“蒋葆增”，这一拍也是配乐的重音。
export const OPEN_SLAM_STEP = 0.5;
export const OPEN_ROW_BEAT = 4;
export const OPEN_BURST_BEAT = 5;
export const OPEN_SNAP_BEAT = 7;
// 第九页点阵重新聚成八个字的那一拍。
export const CREED_SNAP_BEAT = 8;

export function frameState(frame) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= FRAME_COUNT) throw new Error(`帧号越界：${frame}`);
  let i = 0;
  while (i + 1 < PAGES.length && frame >= PAGES[i + 1].land) i++;
  const page = PAGES[i];
  const local = frame - page.land;
  return {index: i, page, local, b: local / BEAT_FRAMES, left: page.end - frame};
}
