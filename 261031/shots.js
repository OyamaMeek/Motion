/*
 * shots.js: 分镜数据与纯时间函数。世界坐标由 7 个相邻的布景组成，一台摄像机连续穿行。
 * evalCam(t) / evalActor(name, t) 只依赖 t，不依赖上一帧，符合 HyperFrames 的逐帧寻址。
 * 歌词正文不写在这里：画面只用 lrc 序号（L01...L37）引用 會呼吸的痛.lrc。
 */
(function (root) {
  const BEATS = root.MV_BEATS || (typeof require !== 'undefined' ? require('./data/timing.js') : []);
  const OX = { A: 0, B: 3200, C: 6400, D: 9600, P: 12800, E: 16000, F: 19200 };
  const SET_W = 3200, SET_H = 1900, GROUND = 1560, DUR = 272.996;
  const PORTAL = { set: 'D', x: 1250, y: 1130, w: 384, h: 216 };

  /* 钢琴尾奏没有稳定节拍网格，用测得的重音对齐 */
  const FREE_ACCENTS = [253.21, 257.65, 261.9];
  const snap = (t) => {
    if (t <= 0) return 0;
    if (t > 252.95) return FREE_ACCENTS.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));
    return BEATS.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));
  };

  const S = (o) => o;
  const RAW = [
    /* ---- 第一幕 东京塔 ---- */
    S({ id: 'S00', at: 0, set: 'A', cam: [1050, 0.98], move: 0, crab: { x: 500, facing: 'right', expr: 'neutral', action: 'walk', prop: 'suitcase', start: 500 }, crabPath: [[0, 500], [14, 1400]],
      title: '提箱走上观景台', scene: '黄昏的东京塔观景台，纸面天空', act: '小蟹提着箱子沿栏杆走到中央，音乐停顿时站定', shotType: '全景，慢推', link: '小蟹走到停顿处站定，下一镜从同一位置、同一大小接转身' }),
    S({ id: 'S01', lrc: 1, at: 18.16, set: 'A', cam: [1500, 1.02], move: 2.1, crab: { x: 1400, facing: 'back', expr: 'neutral', action: 'idle' },
      title: '第一次眺望', scene: '栏杆前，塔在右上方', act: '小蟹放下箱子，背对观众抬头望塔', shotType: '全景推到中景', link: '摄像机沿小蟹视线下摇到城市，小蟹保持背影不动' }),
    S({ id: 'S02', lrc: 2, at: 26.77, set: 'A', cam: [1320, 1.02, 1450], move: 2.1, crab: { x: 1400, facing: 'back', expr: 'neutral', action: 'idle' },
      title: '灯火像坠落的星', scene: '城市灯海', act: '灯火一颗颗拖着尾巴往下掉，小蟹背对观众看着', shotType: '下摇', link: '已落下的光继续落完，小蟹在原位转身，摄像机推近' }),
    S({ id: 'S03', lrc: 3, at: 35.27, set: 'A', cam: [1420, 1.12], move: 2.1, crab: { x: 1400, facing: 'front', expr: 'sad', action: 'idle' },
      title: '到了，却更难过', scene: '栏杆前', act: '小蟹转过身，耷拉下眉眼', shotType: '推近', link: '手部不动，从身侧把合影拿到胸前高度' }),
    S({ id: 'S04', lrc: 4, at: 43.88, set: 'A', cam: [1460, 1.18], move: 1.6, crab: { x: 1400, facing: 'front', expr: 'sad', action: 'hold', prop: 'photo' },
      title: '一个人完成约定', scene: '栏杆前，城市虚在身后', act: '小蟹举起和妈妈的合影，让照片也看看塔', shotType: '微推', link: '合影原位不动，摄像机上移腾出头顶空间，念头气泡从头顶升起' }),
    S({ id: 'S05', lrc: 5, at: 50.56, set: 'A', cam: [1460, 1.18, 1450], move: 2.1, crab: { x: 1400, facing: 'front', expr: 'neutral', action: 'hold', prop: 'photo' }, fx: 'bubbleMama',
      title: '“不急，我等你”', scene: '气泡里的妈妈', act: '气泡里妈妈笑着挥手，示意慢慢来', shotType: '镜头略升', link: '气泡不动，妈妈旁边的日历接着出现' }),
    S({ id: 'S06', lrc: 6, at: 59.17, set: 'A', cam: [1460, 1.18, 1450], move: 1, crab: { x: 1400, facing: 'front', expr: 'sad', action: 'hold', prop: 'photo' }, fx: 'bubbleCalendar',
      title: '明天不一定有', scene: '气泡里的日历', act: '日历一页页撕落，最后一页是空白', shotType: '静止微推', link: '上摇至纸面天空，气泡升入天空消失在画外，再下摇进旅馆房间' }),
    /* ---- 第一段副歌 旅馆 ---- */
    S({ id: 'S07', lrc: 7, at: 67.58, set: 'B', cam: [1400, 1.06], move: 3.2, via: 'sky', crab: { x: 1400, facing: 'front', expr: 'sad', action: 'sit', ache: 0.55, warp: true },
      title: '想念会呼吸', scene: '东京旅馆房间，小蟹坐在床沿', act: '每吸一口气，胸口的红线团就鼓一下', shotType: '上摇穿天空后下摇落入房间', link: '线团位置不变，小蟹姿势不变，红线从线团向外长' }),
    S({ id: 'S08', lrc: 8, at: 71.73, set: 'B', cam: [1400, 1.1], move: 1.8, crab: { x: 1400, facing: 'front', expr: 'sad', action: 'sit', ache: 0.7, spread: 1 },
      title: '活在所有角落', scene: '床沿', act: '红线从胸口爬满身体、双手和小脚', shotType: '微推', link: '红线保留，右手从身侧拿起信' }),
    S({ id: 'S09', lrc: 9, at: 76.31, set: 'B', cam: [1400, 1.14], move: 1.2, crab: { x: 1400, facing: 'front', expr: 'hum', action: 'hold', prop: 'letter', ache: 0.75, spread: 1 }, fx: 'notes',
      title: '哼歌看信都痛', scene: '床沿', act: '小蟹捧着信轻哼，音符一升起线团就跳一下', shotType: '静止微推', link: '音符飘出画面后不再出现，摄像机从同一中心慢慢后拉' }),
    S({ id: 'S10', lrc: 10, at: 81.38, set: 'B', cam: [1400, 0.98], move: 3.2, crab: { x: 1400, facing: 'front', expr: 'sad', action: 'hold', prop: 'letter', ache: 0.75, spread: 1 },
      title: '沉默也痛', scene: '整个房间，空空的', act: '小蟹闭嘴不动，只有线团还在起伏', shotType: '慢拉到全景', link: '小蟹放下信，沿地板走向窗口，摄像机横移跟随' }),
    S({ id: 'S11', lrc: 11, at: 84.85, set: 'B', cam: [860, 1.0], move: 2.1, crab: { x: 1180, facing: 'left', expr: 'sad', action: 'idle', ache: 0.6, spread: 0.4 }, fx: 'fog',
      title: '遗憾也会呼吸', scene: '窗前', act: '小蟹对着窗玻璃呵气，雾气里浮出妈妈的轮廓', shotType: '横移', link: '小蟹原位转回正面，摄像机沿身体推近' }),
    S({ id: 'S12', lrc: 12, at: 88.87, set: 'B', cam: [1180, 1.2, 1560], move: 2.1, crab: { x: 1180, facing: 'front', expr: 'sad', action: 'idle', ache: 0.9, spread: 1 }, fx: 'blood',
      title: '在血液里滚动', scene: '窗前特写', act: '红珠子沿身体里的红线来回滚', shotType: '推到特写', link: '红珠收回胸口，双手向胸前收拢接住围巾' }),
    S({ id: 'S13', lrc: 13, at: 93.38, set: 'B', cam: [1180, 1.2], move: 1.8, crab: { x: 1180, facing: 'front', expr: 'cry', action: 'hug', ache: 0.8, spread: 0.6, between: 'scarf' },
      title: '后悔与恨', scene: '窗前', act: '小蟹抱紧妈妈织的围巾，眼泪掉下来', shotType: '微拉', link: '围巾留在胸前收在手里，小蟹转向窗，伸出右手' }),
    S({ id: 'S14', lrc: 14, at: 98.44, set: 'B', cam: [830, 1.2], move: 2.1, crab: { x: 1100, facing: 'left', expr: 'cry', action: 'reach', ache: 0.9, spread: 0.6 }, fx: 'windowMama',
      title: '想见不能见', scene: '窗前，玻璃上是妈妈的影子', act: '小蟹隔着玻璃伸手，碰不到窗上的妈妈', shotType: '横移微推', link: '影子随雾散去，小蟹转身走向房门，摄像机跟随' }),
    /* ---- 间奏 回家 ---- */
    S({ id: 'S15', at: 103.07, set: 'C', cam: [0, 1.0], move: 2.2, follow: true, crab: { x: 2700, facing: 'right', expr: 'neutral', action: 'walk', prop: 'suitcase' },
      crabPath: [[103.3, 1100 - 6400 + 3200], [112.0, 680], [113.0, 1040], [118.2, 2300], [120.4, 2780]], crabRide: [113.0, 118.2], fx: 'ferry',
      title: '搭船回家', scene: '旅馆房门外，码头，渡轮，海', act: '小蟹提箱走出房门，登上渡轮一路向右驶向海滩', shotType: '横移跟拍', link: '渡轮靠岸，小蟹走上沙滩继续向右，摄像机保持同一高度' }),
    S({ id: 'S16', at: 120.81, set: 'D', cam: [700, 1.0], move: 2, crab: { x: 50, facing: 'back', expr: 'neutral', action: 'idle', walkFor: 1.6 },
      title: '家门前站住', scene: '海边小屋外', act: '小蟹走到家门前站定，望着亮灯的窗', shotType: '横移收住', link: '摄像机向窗内连续推进，窗框扩大到画面之外' }),
    /* ---- 第二段主歌 回忆（窗内） ---- */
    S({ id: 'S17', lrc: 15, at: 123.18, set: 'P', cam: [1000, 1], move: 3.2, via: 'portal', mama: { x: 900, from: -220, delay: 3.2, facing: 'front', expr: 'happy', action: 'idle', walkFor: 3.6 }, crab: { x: 2200, warp: true, facing: 'front', expr: 'happy', action: 'idle' },
      title: '没见过你难过', scene: '暖黄色回忆：门廊', act: '妈妈走进画面，对观众笑着', shotType: '穿窗推进', link: '妈妈站在原位转身，摄像机不动' }),
    S({ id: 'S18', lrc: 16, at: 131.74, set: 'P', cam: [1000, 1], move: 1.6, mama: { x: 900, facing: 'left', expr: 'sad', action: 'idle' },
      title: '寂寞的倔强', scene: '门廊', act: '妈妈侧过身，笑容收起，一个人站着', shotType: '微推', link: '妈妈向右走到沙墙边，摄像机横移跟随' }),
    S({ id: 'S19', lrc: 17, at: 140.24, set: 'P', cam: [2200, 1], move: 2.8, mama: { x: 1820, facing: 'right', expr: 'happy', action: 'reach', walkFor: 2.8 }, crab: { x: 2900, delay: 3, facing: 'right', expr: 'happy', action: 'idle', walkFor: 5, prop: 'suitcase' }, fx: 'wall',
      title: '拆了城墙放我走', scene: '沙堡围墙', act: '妈妈推开沙墙，小蟹提箱走出去', shotType: '横移', link: '小蟹走出画面右侧，妈妈留下，摄像机左移回到木桩' }),
    S({ id: 'S20', lrc: 18, at: 148.88, set: 'P', cam: [1250, 1.1], move: 2.6, mama: { x: 1250, facing: 'right', expr: 'neutral', action: 'sit', walkFor: 2.6 }, fx: 'yarnBind',
      title: '原地等着', scene: '码头木桩旁', act: '妈妈坐着织围巾，毛线一圈圈绕在自己身上', shotType: '横移', link: '毛线留在身上，妈妈的手放下，改拄拐杖' }),
    S({ id: 'S21', lrc: 19, at: 155.54, set: 'P', cam: [1250, 1.16], move: 1.8, mama: { x: 1250, facing: 'right', expr: 'sad', action: 'hold', prop: 'stick' }, fx: 'yarnBound',
      title: '没说自己也软弱', scene: '木桩旁', act: '妈妈拄着拐杖轻轻发抖，望着海', shotType: '推近', link: '摄像机向右横移，沿海岸线掠到远方城市' }),
    S({ id: 'S22', lrc: 20, at: 164.17, set: 'P', cam: [2370, 1.16], move: 3, crab: { x: 2900, facing: 'front', expr: 'happy', action: 'jump' }, mama: { x: 1250, facing: 'right', expr: 'sad', action: 'hold', prop: 'stick' }, fx: 'mailPile',
      title: '假装不知道', scene: '远方城市，脚边未拆的信', act: '小蟹开心地蹦跳，没回头看脚边那堆信', shotType: '长横移', link: '上摇至纸面天空，横移，再下摇进家中' }),
    /* ---- 第二段副歌 空屋 ---- */
    S({ id: 'S23', lrc: 21, at: 172.65, set: 'E', cam: [1300, 1.02], move: 3.2, via: 'sky', crab: { x: 1150, facing: 'front', expr: 'sad', action: 'sit', ache: 0.55, warp: true }, fx: 'chairRock',
      title: '空屋里的呼吸', scene: '家中，妈妈的摇椅空着', act: '小蟹坐在空摇椅旁，线团随呼吸起伏', shotType: '穿天空后下摇', link: '小蟹与摇椅不动，红线开始向屋内物件延伸' }),
    S({ id: 'S24', lrc: 22, at: 176.7, set: 'E', cam: [1300, 1.02], move: 1.8, crab: { x: 1150, facing: 'front', expr: 'sad', action: 'sit', ache: 0.7, spread: 1 }, fx: 'roomMarks',
      title: '满屋都是', scene: '家中全景', act: '红线从小蟹身上连到杯子、相框、拖鞋', shotType: '微拉', link: '红线慢慢收回小蟹身上，小蟹同时拿起桌边的信' }),
    S({ id: 'S25', lrc: 23, at: 181.2, set: 'E', cam: [1250, 1.1], move: 1.8, crab: { x: 1150, facing: 'front', expr: 'hum', action: 'hold', prop: 'letter', ache: 0.75, spread: 1 }, fx: 'marksBack',
      title: '再哼一遍', scene: '摇椅旁', act: '小蟹捧着妈妈的信又哼起那首歌', shotType: '微推', link: '音符飘走，摄像机向摇椅横移' }),
    S({ id: 'S26', lrc: 24, at: 186.38, set: 'E', cam: [1420, 1.1], move: 1.7, crab: { x: 1150, facing: 'right', expr: 'sad', action: 'hold', prop: 'letter', ache: 0.75, spread: 0.6 }, fx: 'chairStop',
      title: '摇椅停了', scene: '摇椅', act: '摇椅慢慢停下，屋里什么声音都没有', shotType: '横移', link: '小蟹收起信，走到摇椅前' }),
    S({ id: 'S27', lrc: 25, at: 189.8, set: 'E', cam: [1400, 1.1], move: 1.6, crab: { x: 1320, facing: 'right', expr: 'sad', action: 'hold', prop: 'scarf', walkFor: 1.1, ache: 0.7 }, fx: 'chairStill',
      title: '围巾放上椅子', scene: '摇椅前', act: '小蟹把围巾搭上空摇椅', shotType: '微推', link: '围巾垂下时带落毛线球，球滚向地面' }),
    S({ id: 'S28', lrc: 26, at: 193.84, set: 'E', cam: [1400, 1.1, 1560], move: 1.8, crab: { x: 1320, facing: 'front', expr: 'sad', action: 'idle', ache: 0.7 }, fx: 'yarnRoll',
      title: '来回滚动', scene: '地板', act: '毛线球在地板上滚来滚去，拖出一条红线', shotType: '微拉', link: '毛线球和红线留在地板上，小蟹朝信盒走过去' }),
    S({ id: 'S29', lrc: 27, at: 198.38, set: 'E', cam: [1000, 1.1], move: 1.8, crab: { x: 1000, facing: 'front', expr: 'cry', action: 'hold', prop: 'letter', walkFor: 1.6, ache: 0.8 }, fx: 'letterBox',
      title: '那些没回的信', scene: '信盒前', act: '小蟹从盒里拿出一封没拆的信，哭了', shotType: '横移', link: '小蟹转向房门方向，摄像机沿地板横移到门' }),
    S({ id: 'S30', lrc: 28, at: 203.49, set: 'E', cam: [2640, 1.1], move: 2.6, crab: { x: 2720, facing: 'right', expr: 'cry', action: 'reach', walkFor: 2.8, ache: 1, spread: 0.6 }, fx: 'doorGhost',
      title: '想见不能见', scene: '敞开的家门', act: '小蟹冲到门口伸手，门外妈妈的虚影走远', shotType: '长横移', link: '虚影走出画外，小蟹穿过门洞，摄像机跟着穿门' }),
    S({ id: 'S31', at: 207.56, set: 'F', cam: [520, 1.04], move: 3.2, crab: { x: 400, facing: 'front', expr: 'neutral', action: 'idle', walkFor: 3.1 },
      title: '走到海边', scene: '清晨海滩', act: '小蟹穿过门洞，走到沙滩上', shotType: '穿门横移', link: '小蟹站定，音乐停顿后右手在原位举起' }),
    /* ---- 第三段 海边 ---- */
    S({ id: 'S32', lrc: 29, at: 211.25, set: 'F', cam: [520, 1.08], move: 1.8, crab: { x: 400, facing: 'front', expr: 'sad', action: 'raise' },
      title: '发誓', scene: '海滩', act: '小蟹举起右手发誓', shotType: '微推', link: '右手落下，小蟹走向妈妈的沙冢' }),
    S({ id: 'S33', lrc: 30, at: 215.32, set: 'F', cam: [1400, 1.08], move: 3, crab: { x: 1320, facing: 'right', expr: 'cry', action: 'hug', walkFor: 3 }, fx: 'moundHug',
      title: '抱紧', scene: '披着围巾的沙冢', act: '小蟹张开双手紧紧抱住沙冢', shotType: '横移', link: '小蟹松开，在沙冢旁原位转向观众' }),
    S({ id: 'S34', lrc: 31, at: 219.95, set: 'F', cam: [1320, 1.08, 1500], move: 1.6, crab: { x: 1320, facing: 'front', expr: 'smileHurt', action: 'idle' }, fx: 'soulFloat',
      title: '假笑，灵魂飘着', scene: '沙冢旁', act: '小蟹脸上在笑，一个虚线的自己从头顶飘起', shotType: '微移', link: '飘起的虚线升出画面，妈妈的虚线从沙冢后走来' }),
    S({ id: 'S35', lrc: 32, at: 224.92, set: 'F', cam: [1400, 1.08], move: 1.6, crab: { x: 1320, facing: 'right', expr: 'happy', action: 'idle' }, ghostMama: { x: 1620, from: 2500, walkFor: 3 },
      title: '要是你在', scene: '沙冢旁', act: '虚线的妈妈站到身边，小蟹朝她笑', shotType: '微移', link: '两者原位不动，小蟹屈身坐下' }),
    S({ id: 'S36', lrc: 33, at: 228.47, set: 'F', cam: [1400, 1.08], move: 1, crab: { x: 1320, facing: 'right', expr: 'happy', action: 'sit' }, ghostMama: { x: 1620 },
      title: '不再让你等', scene: '沙冢旁', act: '小蟹在妈妈身边坐下，不再走开', shotType: '静止', link: '小蟹与虚线妈妈一起向右起步，摄像机同速跟随' }),
    S({ id: 'S37', lrc: 34, at: 232.49, set: 'F', cam: [2040, 1.08], move: 3.6, crab: { x: 2000, facing: 'right', expr: 'happy', action: 'idle', walkFor: 3.8 }, ghostMama: { x: 2280, from: 1620, walkFor: 3.8 },
      title: '陪你做想做的', scene: '沿海边走', act: '小蟹和虚线的妈妈并排散步', shotType: '横移跟拍', link: '虚线妈妈继续向右走出画外，小蟹在原位退进身后的大贝壳' }),
    S({ id: 'S38', lrc: 35, at: 236.72, set: 'F', cam: [2040, 1.12], move: 1.8, crab: { x: 2000, facing: 'front', expr: 'shy', action: 'idle' }, ghostMama: { x: 3050, from: 2280, walkFor: 2.4 }, fx: 'bigShell',
      title: '像贝壳', scene: '大贝壳', act: '小蟹缩进贝壳，只露出眼睛', shotType: '微推', link: '小蟹从贝壳里探出，贝壳留在原地' }),
    S({ id: 'S39', lrc: 36, at: 242.14, set: 'F', cam: [2150, 0.98], move: 2.6, crab: { x: 2000, facing: 'back', expr: 'neutral', action: 'raise' },
      title: '你回来就好了', scene: '朝向海平线', act: '小蟹背对观众，朝海平线举手招呼', shotType: '慢拉到全景', link: '招手的手放下，小蟹蹲下，摄像机下移到沙面' }),
    S({ id: 'S40', lrc: 37, at: 251.1, set: 'F', cam: [2120, 0.98, 1560], move: 2, crab: { x: 2000, facing: 'right', expr: 'sad', action: 'draw' }, fx: 'sandDraw',
      title: '能重来就好了', scene: '沙面', act: '小蟹在沙上画出妈妈和自己，海浪漫上来抹掉', shotType: '下移', link: '浪退下，小蟹站起，摄像机慢慢上摇，沙面始终在画内' }),
    S({ id: 'S41', at: 257.65, set: 'F', cam: [2150, 0.9, 1560, 972], move: 6, crab: { x: 2000, facing: 'back', expr: 'neutral', action: 'hold', prop: 'shell' }, fx: 'finalStar',
      title: '远处的塔', scene: '海平线上一点小小的东京塔', act: '小蟹拿着贝壳望海。最后一个重音时，一颗星落向远处的塔', shotType: '慢拉上摇后静止', link: '片尾静止，无下一镜' }),
  ];

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (u) => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };
  const YAW = { front: 0, right: 90, back: 180, left: -90 };
  const toYaw = (f) => (typeof f === 'number' ? f : YAW[f] === undefined ? 0 : YAW[f]);
  const nearestYaw = (from, to) => { let d = (to - from) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return from + d; };

  /* 摄像机：地面放在屏幕 y 处，留出下方歌词区 */
  const camTarget = (s) => {
    const [x, z, ground, sy] = s.cam;
    const g = ground === undefined ? GROUND : ground;
    const scr = sy === undefined ? 840 : sy;
    return { x: OX[s.set] + x, y: g - (scr - 540) / z, z };
  };

  const SHOTS = RAW.map((s) => ({ ...s, start: s.at === 0 ? 0 : snap(s.at) }));
  SHOTS.forEach((s, i) => { s.index = i; s.end = i + 1 < SHOTS.length ? SHOTS[i + 1].start : DUR; });
  const shotAt = (t) => { for (let i = SHOTS.length - 1; i >= 0; i--) if (t >= SHOTS[i].start) return SHOTS[i]; return SHOTS[0]; };

  /* ---------- 摄像机 ---------- */
  const SKY_TOP = 520;
  const followX = (t) => evalActor('crab', t).x + 180;
  /* 上一镜结束时摄像机必然停在目标上，因此不必递归 */
  function camEnd(i, at) {
    const s = SHOTS[i], T = camTarget(s);
    if (s.follow) T.x = followX(at);
    return T;
  }
  function camAtShot(i, t) {
    const s = SHOTS[i];
    const T = camEnd(i, t);
    if (i === 0) {
      const k = smooth((t - s.start) / (s.end - s.start));
      return { x: lerp(T.x - 120, T.x, k), y: T.y, z: lerp(T.z - 0.02, T.z, k) };
    }
    const P = camEnd(i - 1, s.start);
    const dur = s.end - s.start, move = s.move || 0.01;
    const u = (t - s.start) / move;
    /* 缩放铺满整镜，同一方向缓慢完成，不在镜内来回 */
    const z = lerp(P.z, T.z, smooth((t - s.start) / dur));
    if (s.via === 'sky' && u < 1) {
      const skyY = 80;
      const up = smooth(u / 0.34), across = smooth((u - 0.25) / 0.5), down = smooth((u - 0.66) / 0.34);
      const y = u < 0.66 ? lerp(P.y, skyY, up) : lerp(skyY, T.y, down);
      return { x: lerp(P.x, T.x, across), y, z };
    }
    if (s.via === 'portal' && u < 1) {
      const W = { x: OX[PORTAL.set] + PORTAL.x + PORTAL.w / 2, y: PORTAL.y + PORTAL.h / 2, z: 1920 / PORTAL.w };
      const k = smooth(u);
      /* 按画面缩放的对数插值，推进速度均匀 */
      const pz = Math.exp(lerp(Math.log(P.z), Math.log(W.z), k));
      const m = (1 / P.z - 1 / pz) / (1 / P.z - 1 / W.z || 1);
      return { x: lerp(P.x, W.x, m), y: lerp(P.y, W.y, m), z: pz, portal: true };
    }
    if (s.via === 'portal') return { x: T.x, y: T.y, z: T.z };
    const k = smooth(u);
    return { x: lerp(P.x, T.x, k), y: lerp(P.y, T.y, k), z };
  }
  function evalCam(t) { return camAtShot(shotAt(t).index, t); }

  /* ---------- 角色：每镜的起点来自上一镜的终点，保证不瞬移 ---------- */
  const SPEED = 190, STRIDE = 150;
  const RESOLVED = { crab: [], mama: [] };
  function resolve(name) {
    let prev = null;
    SHOTS.forEach((s, i) => {
      const spec = s[name];
      if (!spec && name === 'mama') { RESOLVED.mama[i] = null; prev = null; return; }
      const base = spec || {};
      const inherited = prev || {};
      const setName = base.set || s.set;
      const target = base.x !== undefined ? OX[setName] + base.x : inherited.x;
      const warp = !!base.warp;
      const start = base.from !== undefined ? OX[setName] + base.from : base.start !== undefined ? OX[setName] + base.start : warp ? target : inherited.x === undefined ? target : inherited.x;
      const dist = Math.abs(target - start);
      const walkFor = dist < 1 ? 0 : base.walkFor || Math.min(dist / SPEED, Math.max(0.4, s.end - s.start - 0.6));
      const r = {
        x: target, startX: start, walkFor, delay: base.delay || 0, warp, warpAt: warp ? s.start + (s.move || 0) * 0.5 : s.start,
        prevX: inherited.x === undefined ? start : inherited.x,
        yaw: nearestYaw(inherited.yaw === undefined ? toYaw(base.facing) : inherited.yaw, toYaw(base.facing === undefined ? inherited.facing : base.facing)),
        facing: base.facing === undefined ? inherited.facing : base.facing,
        prevYaw: inherited.yaw === undefined ? toYaw(base.facing) : inherited.yaw,
        expr: base.expr || inherited.expr || 'neutral',
        action: base.action || inherited.action || 'idle',
        prevAction: inherited.action || base.action || 'idle',
        prop: base.prop === undefined ? (spec ? null : inherited.prop) : base.prop,
        prevProp: inherited.prop || null,
        ache: base.ache || 0, prevAche: inherited.ache || 0,
        spread: base.spread || 0, prevSpread: inherited.spread || 0,
        between: base.between || null,
      };
      if (s.crabPath && name === 'crab') { r.path = s.crabPath; r.x = s.crabPath[s.crabPath.length - 1][1] + OX[setName]; r.walkFor = 999; }
      RESOLVED[name][i] = r;
      prev = r;
    });
  }

  function pathX(path, setName, t) {
    const n = path.length;
    if (t <= path[0][0]) return OX[setName] + path[0][1];
    for (let i = 1; i < n; i++) {
      if (t <= path[i][0]) return OX[setName] + lerp(path[i - 1][1], path[i][1], (t - path[i - 1][0]) / (path[i][0] - path[i - 1][0]));
    }
    return OX[setName] + path[n - 1][1];
  }

  function evalActor(name, t) {
    const s = shotAt(t);
    const r = RESOLVED[name][s.index];
    if (!r) return null;
    const rel = t - s.start;
    let x, walking = false, walkU = 1;
    const setName = s[name] && s[name].set ? s[name].set : s.set;
    if (r.path) {
      x = pathX(r.path, setName, t);
      walking = t < r.path[r.path.length - 1][0];
    } else if (r.warp && t < r.warpAt) {
      x = r.prevX;
    } else {
      const begin = (r.warp ? r.warpAt : s.start) + r.delay;
      walkU = r.walkFor ? clamp((t - begin) / r.walkFor, 0, 1) : 1;
      x = lerp(r.startX, r.x, walkU);
      walking = r.walkFor > 0 && walkU < 1;
    }
    const heading = r.path ? 90 : r.x >= r.startX ? 90 : -90;
    const prevYaw = r.warp && t >= r.warpAt ? toYaw(r.facing) : r.prevYaw;
    let yaw, action, from, blend, phase = 0;
    if (r.path) {
      yaw = lerp(prevYaw, nearestYaw(prevYaw, 90), smooth(rel / 0.4)); action = 'walk'; from = r.prevAction; blend = clamp(rel / 0.3, 0, 1);
      if (s.crabRide && t >= s.crabRide[0] && t < s.crabRide[1]) { action = 'idle'; from = 'walk'; blend = clamp((t - s.crabRide[0]) / 0.3, 0, 1); }
      else if (s.crabRide && t >= s.crabRide[1] && walking) { action = 'walk'; from = 'idle'; blend = clamp((t - s.crabRide[1]) / 0.3, 0, 1); }
      if (!walking) { yaw = 90; action = 'idle'; from = 'walk'; blend = clamp((t - r.path[r.path.length - 1][0]) / 0.4, 0, 1); }
    } else if (walking && rel >= r.delay) {
      yaw = lerp(prevYaw, nearestYaw(prevYaw, heading), smooth(rel / 0.35));
      action = 'walk'; from = r.prevAction; blend = clamp(rel / 0.3, 0, 1);
    } else if (r.walkFor > 0 && rel >= r.delay) {
      const after = (t - (r.warp ? r.warpAt : s.start)) - r.delay - r.walkFor;
      yaw = lerp(nearestYaw(prevYaw, heading), nearestYaw(heading, toYaw(r.facing)), smooth(after / 0.4));
      action = r.action; from = 'walk'; blend = clamp(after / 0.5, 0, 1);
    } else {
      yaw = lerp(prevYaw, r.yaw, smooth(rel / 0.5));
      action = r.action; from = r.prevAction; blend = clamp(rel / 0.6, 0, 1);
    }
    if (action === 'walk') phase = Math.abs((x - (r.path ? OX[setName] + r.path[0][1] : r.startX)) / STRIDE) % 1;
    if (action === 'jump') phase = (rel / 1.0714) % 1;
    const prop = rel < 0.35 && r.prevProp && r.prevProp !== r.prop ? r.prevProp : r.prop;
    const propScale = rel < 0.35 && r.prevProp && r.prevProp !== r.prop ? 1 - smooth(rel / 0.35)
      : r.prop && r.prop !== r.prevProp ? smooth((rel - 0.35 - (r.action === 'hold' ? r.walkFor + r.delay + 0.3 : 0)) / 0.4) : 1;
    return {
      x, y: GROUND, yaw, action, from, blend, phase, expr: r.expr, prop, propScale,
      ache: lerp(r.prevAche, r.ache, smooth(rel / 1)), spread: lerp(r.prevSpread, r.spread, smooth(rel / 1.4)),
      between: r.between, walking,
    };
  }

  resolve('crab');
  resolve('mama');

  const api = { SKY_TOP, SHOTS, OX, SET_W, SET_H, GROUND, DUR, PORTAL, evalCam, evalActor, shotAt, camTarget, snap, BEATS, FREE_ACCENTS, lerp, clamp, smooth };
  root.MV = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
