export const W = 1920;
export const H = 1080;
export const FPS = 30;
export const BPM = 120;
export const FPB = 15;
export const BEATS = 180;
export const FRAMES = BEATS * FPB;

export const PAGES = [
  { id: 'ink', title: '一滴墨与八个字', beat: 0, tone: '纸面', key: '第 0 帧墨滴已在画面内下落，第 2 拍落地' },
  { id: 'name', title: '蒋葆增', beat: 16, tone: '暗场', key: '关灯，八个字散成墨点' },
  { id: 'ask', title: '有多远', beat: 28, tone: '纸面', key: '暗场硬切为纸面透视平原' },
  { id: 'newark', title: '纽瓦克的电子管厂', beat: 40, tone: '暗场', key: '关灯，只留橙色灯丝' },
  { id: 'list', title: '计划与清单', beat: 52, tone: '纸面', key: '灯丝过曝成白场后进入纸面' },
  { id: 'turn', title: '1937 年的转折', beat: 72, tone: '暗场', key: '关灯，“1937”硬切进入' },
  { id: 'y1979', title: '1979 年，73 岁', beat: 92, tone: '纸面', key: '年份滚到 1979，底色翻亮' },
  { id: 'aid', title: '58 人', beat: 104, tone: '纸面', key: '镜头升到地图上方，橙点落在成都' },
  { id: 'exam', title: '统考第一', beat: 116, tone: '纸面', key: '三张科目卡立起' },
  { id: 'chip', title: '录取通知书上的“芯”', beat: 124, tone: '暗场', key: '关灯，只留橙色印章' },
  { id: 'stitch', title: '一针一线', beat: 136, tone: '纸面', key: '电路板翻面到侧立，底色翻亮成绣布' },
  { id: 'drone', title: '2026 架无人机', beat: 148, tone: '暗场', key: '关灯，针脚变成光点' },
  { id: 'view', title: '我们的理解', beat: 160, tone: '纸面', key: '光点过曝成白场后回到平原' },
  { id: 'end', title: '片名', beat: 172, tone: '纸面', key: '片名整行硬切进入' },
].map((p, i, all) => ({
  ...p,
  index: i + 1,
  frame: p.beat * FPB,
  endBeat: i + 1 < all.length ? all[i + 1].beat : BEATS,
}));

export const F = (beat) => Math.round(beat * FPB);

export function pageAt(frame) {
  let page = PAGES[0];
  for (const p of PAGES) if (frame >= p.frame) page = p;
  return page;
}
