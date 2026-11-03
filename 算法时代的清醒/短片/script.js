// 来源编号沿用《算法时代的清醒.md》的参考资料编号；doc 指报告正文，demo 指画面里的示意内容。
export const SOURCES = {
  2: {title: '国家互联网信息办公室等．互联网信息服务算法推荐管理规定', date: '2022-03-01', note: '自2022年3月1日起施行', url: 'https://www.cac.gov.cn/2022-01/04/c_1642894606364259.htm'},
  4: {title: '中央网信办．中央网信办持续加强信息推荐算法治理', date: '2025-05-22', url: 'https://www.cac.gov.cn/2025-05/22/c_1749536203490537.htm'},
  5: {title: 'Gauthier G 等．The political effects of X\'s feed algorithm．Nature 652, 416–423', date: '2026-02-18', note: '2026年2月18日在线刊发', url: 'https://doi.org/10.1038/s41586-026-10098-2'},
  6: {title: '哔哩哔哩社区小管家．哔哩哔哩个性化内容推荐算法新功能介绍', date: '2025-05-20', url: 'https://www.bilibili.com/opus/1069028574153932809'},
  7: {title: '中央网信办秘书局等．关于开展“清朗·网络平台算法典型问题治理”专项行动的通知', date: '2024-11-12', note: '文件落款2024年11月12日，网页2024年11月24日公布', url: 'https://www.cac.gov.cn/2024-11/24/c_1734143936205514.htm'},
  8: {title: '国家互联网信息办公室等．人工智能生成合成内容标识办法', date: '2025-09-01', note: '自2025年9月1日起施行', url: 'https://www.cac.gov.cn/2025-03/14/c_1743654684782215.htm'},
  13: {title: 'Nyhan B 等．Like-minded sources on Facebook are prevalent but not polarizing．Nature 620, 137–144', date: '2023-07-27', note: '2023年7月27日在线刊发', url: 'https://doi.org/10.1038/s41586-023-06297-w'},
  doc: {title: '《算法时代的清醒》实践报告正文', date: '2026-11-03'},
  demo: {title: '示意画面，账号和记录均为虚构', date: '2026-11-03'},
};

const L = (text, ...refs) => ({text, refs});

export const HEADER = L('算法时代的清醒', 'doc');

export const INTRO = {
  kicker: L('知识短片', 'doc'),
  title: L('如何在算法时代保持清醒', 'doc'),
  sub: L('五个动作，把选择权拿回来', 'doc'),
  basis: L('依据三份官方文件和两项 Nature 研究', 2, 8, 7, 13, 5),
};

export const NODES = [
  {
    id: 'n1', year: '2022', date: '2022-03-01', mark: '2022.03',
    dateline: L('3月1日起施行 ·《互联网信息服务算法推荐管理规定》', 2),
    fact: L('第十七条：\n平台要提供不针对个人特征的选项，\n或者便捷的关闭选项。', 2),
    action: L('在设置里搜“个性化”，\n找到推荐开关，关掉试一周。', 2, 'doc'),
    note: L('关闭推荐不等于删除历史数据；菜单名称和位置以当前版本为准。', 'doc', 6),
    art: {title: L('设置', 'demo'), query: L('个性化', 'demo'), row: L('个性化内容推荐', 'demo'), off: L('已关闭', 'demo')},
  },
  {
    id: 'n2', year: '2023', date: '2023-07-27', mark: '2023.07',
    dateline: L('7月27日 Nature 刊发 · Nyhan 等，美国 Facebook 2020 年数据', 13),
    fact: L('成年活跃用户的信息流里，\n来自政治立场相近来源的内容，\n占比中位数为 50.4%。', 13),
    action: L('连续三天，\n记下首页前 10 条来自哪些账号。', 'doc'),
    note: L('按来源统计，不等于一半内容都在谈政治。', 13, 'doc'),
    art: {days: [L('第一天', 'demo'), L('第二天', 'demo'), L('第三天', 'demo')], legend: L('甲、乙、丙……代表不同账号', 'demo')},
  },
  {
    id: 'n3', year: '2024', date: '2024-11-12', mark: '2024.11',
    dateline: L('11月12日落款\n关于开展“清朗·网络平台算法典型问题治理”专项行动的通知', 7),
    fact: L('通知提出：\n严禁推送高度同质化内容诱导用户沉迷。', 7),
    action: L('几个账号说同一件事，\n先看是不是用了同一段素材。', 'doc'),
    note: L('同一段素材只算一份依据，判断前回到原始文件。', 'doc'),
    art: {accounts: [L('账号甲', 'demo'), L('账号乙', 'demo'), L('账号丙', 'demo')], quote: L('奖学金人人可申', 'demo'),
      origin: L('学校原始通知', 'demo'), detail: L('限本科二年级，11月20日截止', 'demo'), sum: L('3 个账号 ＝ 1 份依据', 'doc')},
  },
  {
    id: 'n4', year: '2025', date: '2025-09-01', mark: '2025.09',
    dateline: L('9月1日起施行 ·《人工智能生成合成内容标识办法》', 8),
    fact: L('显式标识让用户能明显感知；\n隐式标识加在文件数据里，不易察觉。', 8),
    action: L('没看到“AI生成”提示，\n也别当成实拍：先查发布者。', 'doc'),
    note: L('标识说明内容怎样制作，事件真假还要另外查证。', 'doc', 8),
    art: {none: L('未见“AI生成”提示', 'demo'), author: L('发布者：账号丙', 'demo'), check: L('查主页 · 查原始出处', 'doc')},
  },
  {
    id: 'n5', year: '2026', date: '2026-02-18', mark: '2026.02',
    dateline: L('2月18日 Nature 刊发 · Gauthier 等，美国 X 平台 2023 年七周实验', 5),
    fact: L('接触算法推荐内容后，用户会关注\n保守派政治活动人士的账号；\n关掉算法以后，仍在继续关注。', 5),
    action: L('翻一遍关注列表，\n取消不想再看的账号。', 5, 'doc'),
    note: L('研究对象是美国 X 平台用户，不能直接套用到国内平台。', 'doc', 5),
    art: {title: L('我的关注', 'demo'), names: ['账号甲', '账号乙', '账号丙', '账号丁', '账号戊'].map(n => L(n, 'demo')),
      on: L('已关注', 'demo'), offLabel: L('关注', 'demo')},
  },
];

export const OUTRO = {
  title: L('把选择权拿回来', 'doc'),
  checklist: [
    L('搜“个性化”，关掉推荐试一周', 2, 'doc'),
    L('三天记下首页前 10 条的来源', 'doc'),
    L('同一段素材，只算一份依据', 'doc'),
    L('没有 AI 提示，也先查发布者', 'doc', 8),
    L('清理一遍关注列表', 5),
  ],
  sources: [
    L('资料：《互联网信息服务算法推荐管理规定》（2022）·《人工智能生成合成内容标识办法》（2025）', 2, 8),
    L('“清朗·网络平台算法典型问题治理”专项行动通知（2024）· Nyhan 等，Nature 2023 · Gauthier 等，Nature 2026', 7, 13, 5),
  ],
  made: L('制作于 2026.11', 'doc'),
};

function* walk(value) {
  if (value && typeof value === 'object' && 'text' in value && 'refs' in value) yield value;
  else if (Array.isArray(value)) for (const v of value) yield* walk(v);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) yield* walk(v);
}

export function allLines() {
  return [...walk([HEADER, INTRO, NODES, OUTRO])];
}
