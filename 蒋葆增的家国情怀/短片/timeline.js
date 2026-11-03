export const FPS = 30;
export const BPM = 120;
export const BEAT_FRAMES = FPS * 60 / BPM;
export const BEATS = 180;
export const FRAME_COUNT = BEATS * BEAT_FRAMES;
export const SECONDS = FRAME_COUNT / FPS;
export const SAMPLE_RATE = 48000;

// 每页的拍数按阅读量安排；页面在 land 那一帧完成翻页的关键动作（关灯、换底色、白场落回纸面、标题落下）。
// tone 是这一页的底色：paper 米白纸面，warm 暖米纸，dark 墨黑暗场。
const LENGTHS = [
  ['open', 10, 'paper'],
  ['legacy', 16, 'dark'],
  ['newark', 14, 'paper'],
  ['plan', 14, 'warm'],
  ['hire', 18, 'paper'],
  ['y1979', 14, 'dark'],
  ['aid', 12, 'paper'],
  ['exam', 14, 'warm'],
  ['creed', 16, 'dark'],
  ['notice', 12, 'paper'],
  ['drones', 12, 'dark'],
  ['ours', 14, 'paper'],
  ['end', 14, 'warm'],
];

export const PAGES = (() => {
  let beat = 0;
  return LENGTHS.map(([id, beats, tone]) => {
    const page = {id, beats, tone, beat, land: beat * BEAT_FRAMES, end: (beat + beats) * BEAT_FRAMES};
    beat += beats;
    return page;
  });
})();

// 开场八个字由墨点聚成实字的那一拍，也是配乐的重音。
export const OPEN_SNAP_BEAT = 4;
// 第九页 58 个墨点重新聚成八个字的那一拍。
export const CREED_SNAP_BEAT = 8;

export function frameState(frame) {
  if (!Number.isInteger(frame) || frame < 0 || frame >= FRAME_COUNT) throw new Error(`帧号越界：${frame}`);
  let i = 0;
  while (i + 1 < PAGES.length && frame >= PAGES[i + 1].land) i++;
  const page = PAGES[i];
  const local = frame - page.land;
  return {index: i, page, local, b: local / BEAT_FRAMES, left: page.end - frame};
}
