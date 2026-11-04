// 画面上的全部文字。kind：fact 可核实史实，quote 他人原话或学校的说法，view 本片作者的理解，label 片名、出处、示意标注。
// refs 指向 SOURCES；fact 和 quote 必须有来源。at 是这一行在本页出现的拍数；旁白逐字 0.1 秒打出，大字与名单在这一拍整体落下。
// 逐句原文与出处见 来源对照.md。

export const SOURCES = {
  S1: {org: '杭州电子科技大学', title: '历任校长', date: '查阅 2026-11-03', url: 'https://www.hdu.edu.cn/767/list.htm'},
  S2: {org: '杭州电子科技大学', title: '校史沿革', date: '查阅 2026-11-03', url: 'https://www.hdu.edu.cn/664/list.htm'},
  S3: {org: '杭州电子科技大学', title: '2026架无人机点亮杭电夜空 校友捐赠表演秀献礼建校70周年', date: '2026-10-19', url: 'https://www.hdu.edu.cn/news/2026/1019/c7511a301651/page.htm'},
  S4: {org: '杭州电子科技大学材料与环境工程学院', title: '探寻红色记忆 传承杭电精神', date: '2021-09-30', url: 'https://www.hdu.edu.cn/news/2021/0930/c7517a239408/page.htm'},
  S5: {org: '电子科技大学（新浪新闻转载）', title: '成电@杭电：携手四十年，共谋新发展', date: '2020-11-12', url: 'https://news.sina.cn/gn/2020-11-12/detail-iiznezxs1454521.d.html'},
  S6: {org: '《工程研究——跨学科视野中的工程》2022年第14卷第3期', title: '张耀轮、段海龙：中国电子管制造的起步(1933—1945)', date: '2022', url: 'https://pubs.cstam.org.cn/data/article/gcyj/preview/pdf/22100401.pdf'},
  S7: {org: '中国教育在线浙江站', title: '杭电首封新生录取通知书寄出 封面是“电路图” “芯”上写着“国家大事 千万尽力”', date: '2025-07-24', url: 'https://zhejiang.eol.cn/zhejiang_news/202507/t20250724_2682856.shtml'},
};

const fact = (text, at, ...refs) => ({text, at, refs, kind: 'fact'});
const quote = (text, at, ...refs) => ({text, at, refs, kind: 'quote'});
const view = (text, at) => ({text, at, refs: [], kind: 'view'});
const label = (text, at = 0) => ({text, at, refs: [], kind: 'label'});

export const MOTTO = {lines: ['国家大事', '千万尽力'], text: '国家大事，千万尽力', refs: ['S3', 'S4', 'S5', 'S7']};

export const SCRIPT = {
  open: {
    slam: [...MOTTO.lines.join('')].map((ch, i) => quote(ch, i * 0.5, ...MOTTO.refs)),
    name: fact('蒋葆增', 5, 'S1', 'S3'),
    role: fact('杭州电子工业学院首任院长', 7, 'S3'),
    term: fact('1980.5—1982.12', 8, 'S1'),
  },
  motto: {
    cubes: quote(MOTTO.text, 0.5, ...MOTTO.refs),
    lines: [quote('杭电把这八个字，', 5, 'S3', 'S4'), quote('称作蒋葆增老院长的遗训。', 7, 'S3', 'S4')],
    source: label('来源：杭州电子科技大学新闻网 2026-10-19、2021-09-30'),
  },
  newark: {
    corner: [fact('美国纽瓦克 · 1930年代 · 实习', 0, 'S6'), label('FEDERAL RADIO TUBE CO.')],
    year: fact('1930年代', 0, 'S6'),
    place: fact('联邦电子管厂', 1, 'S6'),
    lines: [fact('他在美国纽瓦克的这家电子管厂实习。', 5, 'S6')],
    source: label('来源：张耀轮、段海龙《中国电子管制造的起步（1933—1945）》，《工程研究》2022年第3期，第240页'),
  },
  plan: {
    corner: [fact('中央电工器材厂 · 1936—1937 · 技术引进', 0, 'S6'), label('朱其清 · 蔡金涛 · 蒋葆增')],
    lines: [fact('负责技术引进的朱其清，', 1, 'S6'), fact('联系上他和蔡金涛，', 4, 'S6'), fact('请两人一起拟定', 6, 'S6')],
    words: [fact('技术引进计划', 8, 'S6'), fact('设备购置清单', 11, 'S6')],
    demo: label('人物剪影与电子管 · 图形示意'),
    source: label('来源：《工程研究》2022年第3期，第239—240页'),
  },
  hire: {
    corner: [fact('中央电工器材厂第二厂 · 1937', 0, 'S6'), label('ARCTURUS RADIO TUBE CO.')],
    year: fact('1937', 0, 'S6'),
    lines: [fact('朱其清按两人推荐，', 1, 'S6'), fact('引进美国亚克屈勒公司的技术。', 3, 'S6'), fact('同期工厂聘请的留学生里，', 6, 'S6')],
    names: [fact('蒋葆增', 9, 'S6'), fact('刘卓钧', 10, 'S6'), fact('张朝汉', 11, 'S6'), fact('梅开基', 12, 'S6')],
    found: fact('有蒋葆增。', 13, 'S6'),
    listHead: label('论文所列留学生（部分）'),
    source: label('来源：《工程研究》2022年第3期，第239—240页'),
  },
  y1979: {
    corner: [fact('杭州 · 1979 · 筹建', 0, 'S5'), label('1979.02')],
    year: fact('1979', 0, 'S5'),
    lines: [fact('1979年2月，第四机械工业部', 1, 'S5'), fact('决定筹建杭州电子工业学院。', 4, 'S5')],
    thisYear: fact('当年，', 7, 'S5'),
    age: fact('73', 8, 'S5'),
    ageUnit: fact('岁', 8, 'S5'),
    went: fact('蒋葆增受命到杭州筹建。', 9, 'S5'),
    demo: label('人物剪影 · 图形示意'),
    source: label('来源：电子科技大学《成电@杭电：携手四十年，共谋新发展》，2020-11-12'),
  },
  aid: {
    corner: [fact('成都 → 杭州 · 对口支援', 0, 'S5'), label('58')],
    places: [fact('成都', 0, 'S5'), fact('杭州', 1, 'S5')],
    count: fact('58', 2, 'S5'),
    lines: [fact('成都电讯工程学院的58人前来援建，', 5, 'S5'), fact('3名教授中有蒋葆增。', 8, 'S5')],
    legend: fact('教授 3   副教授 3   讲师 30   干部职工 22', 3, 'S5'),
    demo: label('一颗代表一人 · 图形示意'),
    source: label('来源：电子科技大学《成电@杭电：携手四十年，共谋新发展》，2020-11-12'),
  },
  exam: {
    corner: [fact('杭州电子工业学院 · 建院第二年', 0, 'S5'), label('80级')],
    subjects: [fact('数学', 1, 'S5'), fact('物理', 2, 'S5'), fact('英语', 3, 'S5')],
    lines: [fact('在第四机械工业部所属高校的', 4, 'S5'), fact('校际教育质量检查中，', 7, 'S5'), fact('80级学生三门统考总成绩第一。', 9, 'S5')],
    total: fact('总成绩', 10, 'S5'),
    first: fact('第一', 10, 'S5'),
    source: label('来源：电子科技大学《成电@杭电：携手四十年，共谋新发展》，2020-11-12'),
  },
  creed: {
    lines: [quote('2020年，杭电校长朱泽飞', 1, 'S5'), quote('感谢援建者始终遵循', 4, 'S5'), quote('蒋葆增老院长所提倡的', 6, 'S5')],
    motto: quote(MOTTO.text, 4, 'S5'),
    tail: quote('的一贯作风。', 10, 'S5'),
    source: label('来源：电子科技大学《成电@杭电：携手四十年，共谋新发展》，2020-11-12'),
  },
  notice: {
    corner: [fact('杭州 · 2025 · 录取通知书', 0, 'S7'), label('2025.07')],
    lines: [fact('2025年杭电录取通知书', 1, 'S7'), fact('封面是“电路图”图形，', 4, 'S7'), fact('中心的“芯”上写着这八个字。', 6, 'S7')],
    demo: label('图形示意，非通知书原图'),
    source: label('来源：中国教育在线浙江站 2025-07-24'),
  },
  drones: {
    corner: [fact('杭电下沙校区 · 2026 · 建校70周年', 0, 'S3'), label('2026.10.16')],
    lines: [fact('2026年10月16日晚，', 1, 'S3'), fact('2026架无人机', 4, 'S3'), fact('在问鼎广场上空', 6, 'S3'), fact('组成这八个字。', 8, 'S3')],
    demo: label('2026 个点 · 图形示意，非现场画面'),
    source: label('来源：杭州电子科技大学新闻网 2026-10-19'),
  },
  ours: {
    tag: label('我们的理解'),
    question: view('这八个字，今天怎么接？', 1),
    lines: [view('把一门专业课学到能解决实际问题，', 5), view('把一次实验做到经得起复核。', 8)],
  },
  end: {
    title: [label('八个字，'), label('一生的回答')],
    credits: [
      label('资料：杭电官网、电子科技大学、中国教育在线、《工程研究》2022年第3期'),
      label('画面与配乐均由代码生成'),
      label('“我们的理解”为作者阐释'),
    ],
  },
};

export function allLines() {
  const out = [];
  const walk = v => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object' && 'kind' in v) out.push(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(SCRIPT);
  return out;
}
