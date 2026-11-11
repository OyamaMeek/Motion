// 画面文字。at、out 的单位是拍；per 是每个字占的帧数。
// kind：fact 可核实史实，quote 他人原话，school 学校的说法，view 本片作者的提问或理解，note 画面说明。
// refs 对应《来源对照.md》的来源编号。

export const EIGHT = ['国', '家', '大', '事', '千', '万', '尽', '力'];

export const LINES = {
  nameTerm: { page: 'name', text: '1980.5 — 1982.12', at: 19, out: 28, kind: 'fact', refs: ['S1'] },
  nameRole: { page: 'name', text: '杭州电子工业学院 首任院长', at: 19.5, out: 28, per: 3, kind: 'fact', refs: ['S3', 'S5'] },
  nameSchoolA: { page: 'name', text: '杭电把这八个字', at: 22, out: 28, per: 3, kind: 'school', refs: ['S3', 'S4'] },
  nameSchoolB: { page: 'name', text: '称作老院长的', at: 23.5, out: 28, per: 3, kind: 'school', refs: ['S3', 'S4'] },
  nameWill: { page: 'name', text: '遗训', at: 25, out: 28, kind: 'school', refs: ['S3', 'S4', 'S7'] },

  askTag: { page: 'ask', text: '本片的提问', at: 30, out: 37, kind: 'note', refs: [] },
  ask: { page: 'ask', text: '国家大事，离一个人有多远？', at: 30, out: 37, per: 3, kind: 'view', refs: [] },

  newarkYear: { page: 'newark', text: '1930年代', at: 41, out: 51, kind: 'fact', refs: ['S6'] },
  newarkA: { page: 'newark', text: '他在美国纽瓦克的', at: 43, out: 51, per: 3, kind: 'fact', refs: ['S6'] },
  newarkB: { page: 'newark', text: '联邦电子管厂实习。', at: 45, out: 51, per: 3, kind: 'fact', refs: ['S6'] },

  list1: { page: 'list', text: '朱其清赴欧美寻找技术合作方。', at: 53, out: 62.5, per: 2, kind: 'fact', refs: ['S6'] },
  list2: { page: 'list', text: '他联系上在美国实习的蒋葆增和蔡金涛，', at: 57.5, out: 67, per: 2, kind: 'fact', refs: ['S6'] },
  list3: { page: 'list', text: '请两人共同拟定引进计划和设备清单。', at: 63, out: 72, per: 2, kind: 'fact', refs: ['S6'] },
  list4: { page: 'list', text: '又按两人的推荐，选定亚克屈勒公司。', at: 67.5, out: 72, per: 2, kind: 'fact', refs: ['S6'] },

  turnYear: { page: 'turn', text: '1937', at: 72, out: 92, kind: 'fact', refs: ['S6'] },
  turn1a: { page: 'turn', text: '按协议来华协助建厂的工程师，', at: 75, out: 83.5, per: 2, kind: 'fact', refs: ['S6'] },
  turn1b: { page: 'turn', text: '因“八一三”事变没能成行。', at: 77.5, out: 83.5, per: 2, kind: 'fact', refs: ['S6'] },
  turn2a: { page: 'turn', text: '电子管的生产，由留学归来的工程师', at: 84, out: 92, per: 2, kind: 'fact', refs: ['S6'] },
  turn2b: { page: 'turn', text: '和国内技术人员探索完成。', at: 86.3, out: 92, per: 2, kind: 'fact', refs: ['S6'] },
  turn3: { page: 'turn', text: '工厂聘请的留学生中，有蒋葆增。', at: 88.5, out: 92, per: 2, kind: 'fact', refs: ['S6'] },

  y79Year: { page: 'y1979', text: '1979', at: 92, out: 104, kind: 'fact', refs: ['S5'] },
  y79a: { page: 'y1979', text: '这一年，他73岁，', at: 93.5, out: 102.5, per: 3, kind: 'fact', refs: ['S5'] },
  y79b: { page: 'y1979', text: '受命到杭州，筹建杭州电子工业学院。', at: 96, out: 102.5, per: 2, kind: 'fact', refs: ['S5'] },

  aid1: { page: 'aid', text: '58人从成都来杭援建，', at: 105.5, out: 116, per: 2, kind: 'fact', refs: ['S5'] },
  aid2: { page: 'aid', text: '3名教授中，有蒋葆增。', at: 109.5, out: 116, per: 2, kind: 'fact', refs: ['S5'] },
  aidGroups: { page: 'aid', text: '教授 3 · 副教授 3 · 讲师 30 · 干部职工 22', at: 110.5, out: 116, kind: 'fact', refs: ['S5'] },

  exam1: { page: 'exam', text: '建院第二年，', at: 116.3, out: 124, per: 2, kind: 'fact', refs: ['S5'] },
  exam2: { page: 'exam', text: '80级学生三门统考总成绩', at: 117.3, out: 124, per: 2, kind: 'fact', refs: ['S5'] },
  examSeal: { page: 'exam', text: '第一', at: 120, out: 124, kind: 'fact', refs: ['S5'] },

  chip1: { page: 'chip', text: '2025年，杭电录取通知书的封面是电路图，', at: 125.5, out: 135, per: 2, kind: 'fact', refs: ['S7'] },
  chip2: { page: 'chip', text: '中心的“芯”上写着这八个字。', at: 130, out: 135, per: 2, kind: 'fact', refs: ['S7'] },

  stitch1: { page: 'stitch', text: '五名大一女生用两个多月，', at: 137.5, out: 148, per: 2, kind: 'fact', refs: ['S8', 'S9'] },
  stitch2: { page: 'stitch', text: '把这八个字绣进校庆礼物。', at: 140.5, out: 148, per: 2, kind: 'fact', refs: ['S8', 'S9'] },
  stitchQuote: { page: 'stitch', text: '“一针一线地绣，感觉像刻进了心里。”', at: 143.3, out: 148, per: 2, kind: 'quote', refs: ['S8'] },
  stitchBy: { page: 'stitch', text: '刘馨，五名学生之一 · 杭州网 2026-07-09 报道', at: 145.5, out: 148, kind: 'note', refs: ['S8'] },

  drone1: { page: 'drone', text: '2026年10月16日晚，', at: 149.5, out: 158.5, per: 2, kind: 'fact', refs: ['S3'] },
  drone2: { page: 'drone', text: '2026架无人机在问鼎广场上空组成这八个字。', at: 152, out: 158.5, per: 2, kind: 'fact', refs: ['S3'] },

  viewTag: { page: 'view', text: '本片作者的理解', at: 160, out: 172, kind: 'note', refs: [] },
  viewAsk: { page: 'view', text: '国家大事，离一个人有多远？', at: 160, out: 172, kind: 'view', refs: [] },
  view1: { page: 'view', text: '一张清单，一所学校，一针一线。', at: 162, out: 172, per: 2, kind: 'view', refs: [] },
  view2: { page: 'view', text: '近到手上的这一件事。', at: 165.5, out: 172, per: 3, kind: 'view', refs: [] },

  title: { page: 'end', text: '八个字，一生的回答', at: 172, out: 180, kind: 'note', refs: [] },
  credit1: { page: 'end', text: '史实依据：杭州电子科技大学官网与新闻网、电子科技大学2020年报道、', at: 173.5, out: 180, kind: 'note', refs: [] },
  credit2: { page: 'end', text: '《工程研究》2022年第3期论文、中国教育在线、杭州网与潮新闻的报道。', at: 173.5, out: 180, kind: 'note', refs: [] },
  credit3: { page: 'end', text: '全片画面为代码绘制的图形示意，不是历史原件或现场影像。', at: 174.5, out: 180, kind: 'note', refs: [] },
};

// 右上角角标：第一行“地点 · 年份 · 事件”，第二行等宽补充。
export const CORNERS = {
  newark: ['美国 纽瓦克 · 1930年代 · 实习', '1930s'],
  list: ['中央电工器材厂 · 1936—1937 · 技术引进', '1936 冬 — 1937'],
  turn: ['中央电工器材厂第二厂 · 1937 · 建厂', '1937'],
  y1979: ['杭州 · 1979 · 筹建', '1979.02 第四机械工业部决定筹建'],
  aid: ['成都 → 杭州 · 对口支援', '58'],
  exam: ['杭州电子工业学院 · 建院第二年', '四机部部属高校校际教育质量检查'],
  chip: ['杭州 · 2025 · 录取通知书', '2025.07'],
  stitch: ['杭州 · 2026 · 建校70周年', '2026.07'],
  drone: ['杭电下沙校区 · 2026 · 建校70周年', '2026.10.16'],
};

// 透视平原上浮动的小字：前三条是本片作者对八个字的释义，其余是后文史实的关键词。
export const GROUND = [
  { text: '国家大事 · 关系一国兴衰的事', kind: 'view' },
  { text: '千万 · 务必，一定', kind: 'view' },
  { text: '尽力 · 用尽全部力量', kind: 'view' },
  { text: '1930年代 · 纽瓦克 · 电子管厂实习', kind: 'fact' },
  { text: '技术引进计划', kind: 'fact' },
  { text: '设备购置清单', kind: 'fact' },
  { text: '1937 · 亚克屈勒', kind: 'fact' },
  { text: '中央电工器材厂第二厂', kind: 'fact' },
  { text: '1979 · 七十三岁 · 杭州', kind: 'fact' },
  { text: '成都 → 杭州 · 58人', kind: 'fact' },
  { text: '80级 · 三门统考 · 总成绩第一', kind: 'fact' },
  { text: '1980.5—1982.12 · 首任院长', kind: 'fact' },
  { text: '2025 · 录取通知书 · 芯', kind: 'fact' },
  { text: '2026.7 · 一针一线', kind: 'fact' },
  { text: '2026.10.16 · 2026架无人机 · 问鼎广场', kind: 'fact' },
];

export const NOTES = {
  tube: '电子管 · 图形示意',
  list: '人物关系与文件 · 图形示意，非原件',
  map: '图形示意 · 位置不按比例',
  chip: '图形示意 · 非通知书原样',
  cloth: '图形示意 · 非刺绣原作',
  drone: '点阵 · 图形示意',
};

export const GROUPS = [
  { name: '教授', n: 3 },
  { name: '副教授', n: 3 },
  { name: '讲师', n: 30 },
  { name: '干部职工', n: 22 },
];
