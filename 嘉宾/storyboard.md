---
format: 1920x1080
fps: 30
duration: 333.677s
message: 一个人去参加旧爱的婚礼，从只能旁观，到把自己收回来，再把对方交给另一个人
arc: 走向礼堂 → 接到婚讯 → 克制到场 → 寒暄受伤 → 回忆 → 仪式 → 失控离席 → 自嘲 → 窗外清醒 → 合影边缘 → 独自离开
audience: 听过这首歌、在别人的幸福里当过旁观者的人
mode: collaborative
style: 纸艺拼贴，沿用 嘉宾/开场样图 的牛皮纸、旧报纸、撕边、白边和投影；纸片每秒更新 10 次，各层每轴抖动 1–2 像素
---

# 《嘉宾》MV 分镜

状态：等待确认。本稿只有文字分镜，尚未建立 HyperFrames 工程、草图、素材或动画。

歌词正文不写入本文件。L01–L46 对应 `嘉宾.lrc` 的第 1–46 行，`lrc` 字段是该句起唱时间，`meaning` 字段是我转述的句意；成片需要歌词时从 LRC 读取。

## 待你确认

1. **抽象歌词的表现**：任务第 4 项还是占位文字“(写在这里)”，下方“抽象歌词表”是我的理解。要改哪句，告诉我行号和你的理解。
2. **P01 的背面**：开场沿用已交付样图的背面 Clawd，结尾 O01 用同一构图改为正面离开，首尾因此形成对照。这是主角唯一的非正面镜头。
3. **歌词字幕**：任务没有提到。分镜暂按前几支 MV 的做法预留画面底部字幕区；不需要字幕时，构图不用改。

## 角色与贯穿物件

三个角色都调用 `assets/clawd/character.js`，手臂长度不变。够不到的物件由角色或物件移动过去。

| 角色 | 辨认方式 | 用法 |
| --- | --- | --- |
| 我 | 无配饰的 Clawd；L10 起胸前有“嘉宾”胸花，L42 抖落 | 全片主角 |
| 你（新娘） | 头顶一朵金色小花，旧合照里就有；婚礼上加白头纱 | 只在婚礼段穿婚纱 |
| 他（新郎） | 黑领结 | L06 首次出现 |

| 物件 | 来路与去向 | 作用 |
| --- | --- | --- |
| 旧合照 | P02 窗台 → L11 塞进礼金箱，露出一角 → L16 被红包盖住 | 关系存在过的证据；与 L44 的新合影对照 |
| 两张旧票根 | P02 窗台 → L27 压到酒杯下 | 第二次放下回忆 |
| 红喜帖 | L03 手机上出现 → L07 成为纸质 → L09 拿在手里 → L10 留在签到台 | 红色属于婚礼，O01 的 Clawd 手里已经没有红色 |
| 胸花与席卡 | L10 别上胸花，I02 看到席卡，L26 扶正席卡，L42 抖落胸花，O02 席卡被雪盖住 | 身份落差的三次递进 |
| 红线 | L12 连着蛋糕上的纸人 → L22 连遍全场，只漏掉 Clawd → L28 拉不动 | 命运与“没有关系”的具体画面 |
| 拉钩 | I01 两人拉钩 → L14 同样的并肩位置变成握手 → L29 另一半被撕走 → L46 新郎与新娘拉钩 | 全片情感主线 |
| 对话气泡 | L05 别人的祝福贴满窗户 → L40 Clawd 只有一个空白气泡 | 想祝福却说不出口 |
| 纸片抖动 | L04 全画面停止抖动表示愣住；O02 最后 4.5 秒再次停止 | 这是纸艺介质的语言，全片只用两次 |

## 时间与剪辑规则

1. LRC 起唱时间不改。切点取起唱前最近的实测节拍（`节拍点.csv`），因此每句都从自己的镜头内开始；46 句提前量为 0.074–0.727 秒，平均 0.368 秒。
2. 器乐切点同样取自 `节拍点.csv`。01:52.268 是报告列出的间奏起点最近节拍；05:09.801 位于末句后的低能量区内，05:10.195 的强起音因此落在 O01 开头；05:19.948 是最后一个节拍，也是最后明显重音的候选位置。其后不再切镜。
3. 节拍是算法结果，尚未经听辨校准，也不等于小节首拍。成片按 CSV 的完整精度定时，再取最近影格。
4. 全片 52 镜：46 个歌词镜头、2 个前奏镜头、2 个间奏镜头、2 个尾奏镜头。每镜一个主要动作，`action` 字段只写这一个动作。
5. 同一空间用“同场延续”，相机和角色位置在切点前后连续，动作从切点后开始。换空间用已在画面内的实物遮挡，或撕纸转场。全片没有甩镜、晃镜和整屏叠化。
6. 歌曲的主题依据、段落和节拍数据来自 `song.md`。歌词已经确定了人物和情节，因此没有另写三条候选故事线，纸艺画风沿用你已选定的样图。

## 情绪弧线

| 段落 | 时间 | 观众看到的变化 | 情绪 |
| --- | --- | --- | --- |
| 前奏、主歌一 | 00:00–00:46 | 停在路上的 Clawd；回到家中，婚讯打破平静 | 冷清 → 错愕 |
| 预副歌一、副歌一 | 00:46–01:35 | 别人的祝福，走进婚礼，被贴上“嘉宾”，放下合照 | 强撑 |
| 尾段、间奏 | 01:35–02:14 | 客气的握手，相片被盖住；旧日拉钩；坐到最后一排 | 刺痛 → 全片最暖 → 落回现实 |
| 主歌二 | 02:14–02:40 | 钟声、等待、下跪、戒指，全部从 Clawd 的视线看 | 安静地被压住 |
| 预副歌二、副歌二 | 02:40–03:47 | 红线漏掉他，举杯，笑脸掉落，离席 | 上升至失控 |
| 桥段 | 03:47–04:02 | 雪地变成纸舞台，幕布被他自己拉上 | 自嘲、难堪 |
| 终副歌 | 04:02–04:50 | 隔窗旁观，流尽回忆，说不出祝福，雪停，抖落胸花 | 最低点 → 转向自己 |
| 收束 | 04:50–05:10 | 走进合影最边缘；新人拉钩，他已转身 | 带着遗憾的体面 |
| 尾奏 | 05:10–05:33 | 同一条路，正面离开；雪盖住脚印和席卡 | 留白 |

## 抽象歌词表（我的理解，等你修改）

| 行号 | 我理解的句意 | 观众看到的连续动作 |
| --- | --- | --- |
| L01 | 分开已经好几年 | 霜窗上已有两道划痕，Clawd 划下第三道 |
| L02 | 日子模糊，偶尔想起对方 | 撕下的日历页滑落，盖到合照旁 |
| L04 | 愣在原地 | 全画面的纸片和雪同时停住 |
| L06 | 她的未来早有别人安排 | 新郎用剪刀沿虚线剪出一件白纸嫁衣 |
| L08、L24 | 强迫自己不要躲开 | 第一次顶着风雪站定；第二次按住桌沿，不让自己起身 |
| L12、L28 | 不肯接受这是命运 | 第一次拉蛋糕纸人之间的红线；第二次用全身向后拉 |
| L16 | 她隐瞒两人的过去 | 新娘把红包放到露出的旧合照上 |
| L22 | 两人的关系已彻底结束 | 红线一桌桌连开，停在 Clawd 前一桌 |
| L25 | 今天的美，曾经属于他的怀抱 | 新娘肖像像纸一样被揭开，下面是旧日相拥 |
| L29 | 约定成了过去 | 拉钩画面里，新娘那半张纸被撕走 |
| L30、L31 | 想祝福，却撑不住体面 | 脸上翻出一张笑脸纸片；随后纸片滑落 |
| L33、L34 | 嘲笑自己入戏太深 | 雪地露出是纸舞台，幕布拉开；他自己把幕布拉上 |
| L36 | 当客人也是一种命运 | 胸花的红绸带被风吹直，指向离开的路 |
| L37 | 他已无权再过问她的事 | 走到窗内透出的暖光边缘，脚尖停在光外 |
| L39 | 回忆全部流尽 | 泪滴碰到雪地后变成一张张旧照片碎片 |
| L40 | 说不出祝福 | 一个空白气泡冒起，没有字，又缩回去 |
| L41 | 终于清醒 | 雪渐渐停下，云缝的光落到他脸上 |
| L42 | 把自己要回来 | 抖落积雪和胸花，身体恢复原本的橙色 |
| L43、L44 | 还能以见证者身份在场 | 走进合影队伍最边上；快门定格 |

## 朝向说明

主角 Clawd 在 47 个入画镜头中有 46 个是正面，唯一例外是 P01。L18、L19 的新郎用侧面，因为要表现他走向新娘、在新娘面前下跪；主角在这两镜不入画。为了让主角一直正面，全片把相机放在他的前方：路上后退拍摄，礼堂内从舞台方向看嘉宾席，离席时从门外看他出门，窗外段从室内隔玻璃拍摄。

## Frame 1 — P01 停在半路

- act: 前奏
- scene: 雪地长路尽头是亮金色窗户的礼堂，前景是大喜帖和“嘉宾”席卡（开场样图构图）
- time: 00:00.000 → 00:10.612
- duration: 10.612s
- beat: 片头 → #12
- lrc: 器乐
- meaning: 先交代终点：有一场婚礼，有人走到一半停住了
- action: Clawd 背对画面停在路中央，手里的红喜帖随风轻抖，一步也没再往前
- clawd: back / neutral / hold（喜帖配色）
- camera: 全景，极慢地前推，礼堂始终在远处
- transition_in: 片头，首帧即完整画面
- poster: 6.5
- status: outline
- reads: 路尽头的婚礼和停住的 Clawd（0-6s）；身前没有脚印，身后有脚印（6-10.6s）
- sound: 原曲前奏；无附加音效

## Frame 2 — P02 窗台上的两个人

- act: 前奏
- scene: Clawd 的小屋，相机在屋外隔窗拍摄；窗台上有旧合照、两张票根、两只杯子，一只积灰
- time: 00:10.612 → 00:20.944
- duration: 10.332s
- beat: #12 → #25
- lrc: 器乐
- meaning: 同一人在婚礼之前的生活：曾经是两个人，现在是一个人
- action: Clawd 靠近窗户，用手擦开一块霜，露出自己的脸
- clawd: front / neutral / idle
- camera: 从窗台物件近景连续横移到霜窗，停在擦开的位置
- transition_in: 前景大喜帖向右横扫遮满全屏，背景此时换成小屋
- poster: 18.5
- status: outline
- reads: 合照里 Clawd 与戴金花的 Clawd 在一起（0-5s）；霜被擦开，屋里只有一人（5-10.3s）
- sound: 原曲前奏；无附加音效

## Frame 3 — L01 第三道划痕

- act: 主歌一
- scene: 同一扇霜窗，擦开处旁边有两道旧划痕
- time: 00:20.944 → 00:25.031
- duration: 4.087s
- beat: #25 → #30
- lrc: L01 @ 00:21.260
- meaning: 分开之后，又一个冬天
- action: Clawd 在霜上划下第三道
- clawd: front / neutral / idle
- camera: 窗面近景固定
- transition_in: 同场延续
- poster: 23.5
- status: outline
- reads: 三道划痕数着冬天（0.4-4s）
- sound: 原曲主歌一；无附加音效

## Frame 4 — L02 滑落的日历页

- act: 主歌一
- scene: 小屋室内，相机从窗台方向看 Clawd，背后是撕开的日历
- time: 00:25.031 → 00:33.831
- duration: 8.800s
- beat: #30 → #41
- lrc: L02 @ 00:25.480
- meaning: 日子过得不分星期，偶尔想起对方
- action: Clawd 发着呆，手里的日历页慢慢滑落，盖到合照旁边
- clawd: front / sad / hold（日历页）
- camera: 中景，沿下落的日历页缓慢下摇至前景合照，合照与 Clawd 同时入画
- transition_in: 霜窗被擦开的区域扩大至全屏，进入室内
- poster: 31.0
- status: outline
- reads: 他不知道今天星期几（0.5-4s）；纸页落到合照旁，他想起了谁（4-8.8s）
- sound: 原曲主歌一；无附加音效

## Frame 5 — L03 手机亮了

- act: 主歌一
- scene: 窗台，合照旁的手机
- time: 00:33.831 → 00:37.918
- duration: 4.087s
- beat: #41 → #46
- lrc: L03 @ 00:34.090
- meaning: 意外收到一条消息
- action: 手机亮起并震动，在窗台上挪动，屏幕上是红色的囍
- clawd: 背景虚化的 front / neutral / idle，抬起头
- camera: 手机近景固定，节拍上轻微震动只发生在手机纸片上
- transition_in: 同场延续，相机停在 Frame 4 的合照位置
- poster: 36.5
- status: outline
- reads: 手机震动（0.3-1.8s）；屏幕上的囍说明是喜事（1.8-4s）
- sound: 原曲主歌一；无附加音效

## Frame 6 — L04 全世界停住

- act: 主歌一
- scene: 小屋室内，窗外下雪，Clawd 拿着手机站在屋子中央
- time: 00:37.918 → 00:46.602
- duration: 8.684s
- beat: #46 → #57
- lrc: L04 @ 00:38.170
- meaning: 毫无准备，整个人愣住
- action: Clawd 定住，窗外雪片和全部纸层同时停止抖动
- clawd: front / neutral / hold（手机）
- camera: 第一拍后完全固定，全片第一次静止
- transition_in: 同场延续，相机拉到全景
- poster: 42.0
- status: outline
- reads: Clawd 和雪都停住（0.3-8.7s）
- sound: 原曲主歌一；无附加音效

## Frame 7 — L05 祝福贴满窗户

- act: 预副歌一
- scene: 小屋窗前，窗玻璃作为背景，Clawd 面向镜头
- time: 00:46.602 → 00:52.222
- duration: 5.620s
- beat: #57 → #64
- lrc: L05 @ 00:46.860
- meaning: 大家都在替她高兴，只有他这时才明白
- action: 红金色的祝福气泡一个接一个贴满窗户，只在 Clawd 周围留出空位
- clawd: front / sad / hold（手机）
- camera: 中景极慢前推，气泡每拍增加
- transition_in: 同场延续，纸片重新抖动，第一个气泡贴上时恢复
- poster: 51.0
- status: outline
- reads: 大家都在祝贺（0.3-3.5s）；只有他没有笑（3.5-5.6s）
- sound: 原曲预副歌一；无附加音效

## Frame 8 — L06 白纸嫁衣

- act: 预副歌一
- scene: 喜帖内页展开成的剪纸工作台，新娘和新郎站在桌后
- time: 00:52.222 → 00:57.841
- duration: 5.619s
- beat: #64 → #71
- lrc: L06 @ 00:52.550
- meaning: 早就有人为她准备好了婚纱
- action: 新郎用剪刀沿虚线剪出一件白纸嫁衣，新娘害羞地站在旁边
- clawd: 主角未入画；新娘 front / shy，新郎 front / happy
- camera: 俯角特写随剪刀走完虚线，最后露出两人
- transition_in: 一个红色气泡盖满全屏并打开，内页就是工作台
- poster: 56.8
- status: outline
- reads: 剪刀剪出嫁衣（0.3-4s）；戴金花的人站在别人身边（4-5.6s）
- sound: 原曲预副歌一；无附加音效

## Frame 9 — L07 举起喜帖

- act: 副歌一
- scene: 小屋门内，Clawd 面向镜头，胸前是喜帖
- time: 00:57.841 → 01:04.226
- duration: 6.385s
- beat: #71 → #79
- lrc: L07 @ 00:58.160
- meaning: 感谢对方邀请自己去见证
- action: Clawd 郑重地把喜帖举到胸前，点一次头
- clawd: front / neutral / hold（喜帖）
- camera: 工作台内页合起成喜帖，沿纸面拉到 Clawd 手中，正面中景固定
- transition_in: 内页合上，喜帖实物连接两个场景
- poster: 62.0
- status: outline
- reads: 手机里的邀请变成手里的喜帖（0.3-3s）；他礼貌地点头接受（3-6.3s）
- sound: 原曲副歌一；无附加音效

## Frame 10 — L08 顶着风雪

- act: 副歌一
- scene: 小屋门口，相机在门外，风雪朝他吹去
- time: 01:04.226 → 01:09.799
- duration: 5.573s
- beat: #79 → #86
- lrc: L08 @ 01:04.460
- meaning: 他一直告诫自己不要躲开
- action: Clawd 推开门，迎着扑面的风雪站定，没有后退
- clawd: front / sad / hold（喜帖）
- camera: 门外平视固定，门板向两侧打开时全画面变冷
- transition_in: 门板遮挡换景
- poster: 68.5
- status: outline
- reads: 风雪扑来（0.3-2.5s）；他站住不退（2.5-5.5s）
- sound: 原曲副歌一；无附加音效

## Frame 11 — L09 一步一拍

- act: 副歌一
- scene: 雪地长路通向礼堂，彩旗与花门从镜头两侧经过
- time: 01:09.799 → 01:17.021
- duration: 7.222s
- beat: #86 → #95
- lrc: L09 @ 01:10.330
- meaning: 他带着请柬，走向新郎布置好的会场
- action: Clawd 朝镜头一步一拍向前走，路边的布置越来越密
- clawd: front / neutral / walk 后段改 hold（喜帖）
- camera: 相机与他同速后退，花门从前景穿过，最后一拍越过他头顶
- transition_in: 扑面的雪片铺满全屏后散开
- poster: 75.5
- status: outline
- reads: 他走近婚礼（0.5-4s）；光秃的路变成花门和彩旗（4-7.2s）
- sound: 原曲副歌一；无附加音效

## Frame 12 — L10 别上胸花

- act: 副歌一
- scene: 礼堂门口签到台，背后立着新人婚纱照，暖金灯光
- time: 01:17.021 → 01:23.429
- duration: 6.408s
- beat: #95 → #103
- lrc: L10 @ 01:17.680
- meaning: 风景是她的，他的身份只是客人
- action: 工作人员 Clawd 把写着“嘉宾”的胸花别到他胸前
- clawd: front / sad / idle
- camera: 从婚纱照缓慢下摇到胸花，字可以清楚读出后固定
- transition_in: 花门从前景掠过，遮满全屏后换景
- poster: 82.5
- status: outline
- reads: 身后是别人的幸福（0.6-3.2s）；胸前的字定下他的身份（3.2-6.4s）
- sound: 原曲副歌一；无附加音效

## Frame 13 — L11 塞进礼金箱

- act: 副歌一
- scene: 签到台上的红色礼金箱，Clawd 站在箱后
- time: 01:23.429 → 01:29.838
- duration: 6.409s
- beat: #103 → #111
- lrc: L11 @ 01:23.670
- meaning: 放下回忆，成全对方
- action: Clawd 把旧合照塞进礼金箱的投递口，手短，相片的一角留在外面
- clawd: front / sad / hold（旧合照）
- camera: 同场推近成箱子与脸的中近景，随后固定
- transition_in: 同场延续
- poster: 88.5
- status: outline
- reads: 他认出来的旧合照（0.3-3s）；相片被投进红箱，一角露在外面（3-6.4s）
- sound: 原曲副歌一；无附加音效

## Frame 14 — L12 拉动红线

- act: 副歌一
- scene: 签到台旁的蛋糕，蛋糕顶的新郎新娘纸人之间连着红线，Clawd 在蛋糕后
- time: 01:29.838 → 01:35.411
- duration: 5.573s
- beat: #111 → #118
- lrc: L12 @ 01:30.060
- meaning: 他始终不肯相信这是命运
- action: Clawd 抓住红线往回拉，红线绷紧，纸人一动不动
- clawd: front / sad / hold（红线）
- camera: 沿红线横移到他手上，再固定成中景
- transition_in: 同场延续，横移越过箱子
- poster: 93.5
- status: outline
- reads: 红线连着两位新人（0.3-2.5s）；他拉不动（2.5-5.5s）
- sound: 原曲副歌一；无附加音效

## Frame 15 — L13 隔着两块地砖

- act: 副歌一尾段
- scene: 签到区走廊，新娘穿婚纱从拐角走出
- time: 01:35.411 → 01:39.381
- duration: 3.970s
- beat: #118 → #123
- lrc: L13 @ 01:35.820
- meaning: 久别重逢，对方却保持距离
- action: 新娘走到两块地砖外停住，没有再靠近
- clawd: front / shy / idle，松开红线；新娘 front / neutral / idle
- camera: 双人正面中景固定，两人之间的空地砖位于画面中央
- transition_in: 白头纱从前景掠过换景
- poster: 98.5
- status: outline
- reads: 金色小花认出她（0.4-2s）；两人之间空着两块地砖（2-3.9s）
- sound: 原曲副歌一尾段；无附加音效

## Frame 16 — L14 像拍照一样握手

- act: 副歌一尾段
- scene: 同一走廊，两人并肩面向镜头
- time: 01:39.381 → 01:42.563
- duration: 3.182s
- beat: #123 → #127
- lrc: L14 @ 01:39.620
- meaning: 寒暄和握手都很客气
- action: 两人挨近后，并肩面向镜头握手，上下摇动两拍，表情都很礼貌
- clawd: front / happy / idle；新娘 front / happy / idle
- camera: 正面固定，构图与 I01 的拉钩相同
- transition_in: 同场延续
- poster: 102.0
- status: outline
- reads: 像合影一样客气的握手（0.3-3.1s）
- sound: 原曲副歌一尾段；无附加音效

## Frame 17 — L15 挪开半步

- act: 副歌一尾段
- scene: 同一走廊，新郎走到新娘另一侧
- time: 01:42.563 → 01:46.626
- duration: 4.063s
- beat: #127 → #132
- lrc: L15 @ 01:43.290
- meaning: 当着新郎的面，她刻意保持分寸
- action: 新郎到场时，新娘松开手，朝新郎挪开半步
- clawd: front / neutral / idle；新娘 front / happy，新郎 front / happy
- camera: 向新郎一侧拉宽，三人同框
- transition_in: 同场延续
- poster: 105.5
- status: outline
- reads: 新郎到了（0.8-2.2s）；她离开 Clawd 半步（2.2-4s）
- sound: 原曲副歌一尾段；无附加音效

## Frame 18 — L16 红包盖住合照

- act: 副歌一尾段
- scene: 礼金箱近景，旧合照一角露在投递口
- time: 01:46.626 → 01:52.268
- duration: 5.642s
- beat: #132 → #139
- lrc: L16 @ 01:46.890
- meaning: 她要隐瞒两人的过去
- action: 新娘把一个红包平放到露出的相片角上，相片看不见了
- clawd: 背景虚化的 front / sad / idle；新娘 front / neutral
- camera: 从新娘下摇到箱口，近景固定
- transition_in: 同场延续
- poster: 110.5
- status: outline
- reads: 相片露在外面（0.3-2s）；红包盖住了它（2-5.6s）
- sound: 原曲副歌一尾段，末尾接间奏；无附加音效

## Frame 19 — I01 雪地拉钩

- act: 间奏
- scene: 过去的雪地，全片最暖的一段，太阳色纸层，两组脚印并排
- time: 01:52.268 → 02:03.437
- duration: 11.169s
- beat: #139 → #153
- lrc: 器乐
- meaning: 红包盖住的就是这段日子，以及两人当年的约定
- action: 年轻的两个人并肩面向镜头，手勾着手，慢慢拉钩
- clawd: front / happy / idle；她 front / happy / idle，头顶金花
- camera: 从勾住的手慢慢拉到全景，露出两人身后并排的脚印；01:54.683–01:56.866 的低能量区保持相机不动
- transition_in: 红包放大盖满全屏后被撕开，撕纸转场进入过去
- poster: 120.0
- status: outline
- reads: 两人曾经很亲近（0-5s）；手勾手是一个约定（5-11.1s）
- sound: 原曲间奏；无附加音效

## Frame 20 — I02 最后一排

- act: 间奏
- scene: 礼堂内，从舞台方向看嘉宾席，一排排客人面向镜头，桌上有席卡和酒杯
- time: 02:03.437 → 02:14.606
- duration: 11.169s
- beat: #153 → #167
- lrc: 器乐
- meaning: 回到现实：他的位置在最远的地方
- action: Clawd 在最后一排坐下，面前的席卡写着“嘉宾”，身后是亮着的侧门
- clawd: front / neutral / idle
- camera: 相机从第一排缓慢越过一排排客人，推到最后一排停住
- transition_in: 撕纸转场回到现在，暖色消失
- poster: 132.0
- status: outline
- reads: 满场喜庆的客人（0-6s）；最后一排的他和席卡（6-11.1s）
- sound: 原曲间奏；无附加音效

## Frame 21 — L17 钟响

- act: 主歌二
- scene: 最后一排，Clawd 身后的窗外能看到钟楼和金色小钟
- time: 02:14.606 → 02:18.600
- duration: 3.994s
- beat: #167 → #172
- lrc: L17 @ 02:14.880
- meaning: 他还没回过神，仪式已经开始
- action: 窗外的金钟开始摇摆，一圈纸环从钟扩散开，Clawd 抬起头
- clawd: front / neutral / idle
- camera: 同场中景，焦点从他移到窗外的钟后固定
- transition_in: 同场延续
- poster: 137.0
- status: outline
- reads: 钟在响，仪式开始（0.3-4s）
- sound: 原曲主歌二；无附加音效

## Frame 22 — L18 她等他走来

- act: 主歌二
- scene: 礼堂舞台，新娘站在花门下，红毯从左边延伸过来；这是 Clawd 看到的舞台
- time: 02:18.600 → 02:27.423
- duration: 8.823s
- beat: #172 → #183
- lrc: L18 @ 02:19.120
- meaning: 她留在原地，等待新郎靠近
- action: 新郎沿红毯一步一拍走向新娘，新娘站着不动
- clawd: 主角未入画；新娘 front / shy / idle；新郎 right / happy / walk
- camera: 舞台全景，随新郎缓慢横移，最后两人都在画面内
- transition_in: 反打切换，相机从 Clawd 的朝向接到他看见的舞台
- poster: 145.0
- status: outline
- reads: 她在等（0.5-4s）；他走近（4-8.8s）
- sound: 原曲主歌二；无附加音效

## Frame 23 — L19 单膝跪下

- act: 主歌二
- scene: 花门下
- time: 02:27.423 → 02:31.417
- duration: 3.994s
- beat: #183 → #188
- lrc: L19 @ 02:27.690
- meaning: 新郎温柔地跪下
- action: 新郎整片纸人倾斜并下沉，单膝跪在新娘面前
- clawd: 主角未入画；新娘 front / shy / idle；新郎 right / happy，几何不变，整片旋转约 12 度
- camera: 中景，随着他下沉轻微下摇
- transition_in: 同场延续
- poster: 151.0
- status: outline
- reads: 新郎跪下（0.3-4s）
- sound: 原曲主歌二；无附加音效

## Frame 24 — L20 戒指

- act: 主歌二
- scene: 新娘的手和戒指的大特写
- time: 02:31.417 → 02:40.218
- duration: 8.801s
- beat: #188 → #199
- lrc: L20 @ 02:31.860
- meaning: 戒指慢慢戴到她手上
- action: 金色戒指慢慢套上新娘的手
- clawd: 主角未入画；Clawd 的手没有手指，戒指直接套在手部方块上
- camera: 手部特写，极慢推近，戒指到位后固定
- transition_in: 同场延续，沿新郎的手臂推入
- poster: 158.0
- status: outline
- reads: 戒指正在戴上，过程很慢（0.5-6.5s）；到位（6.5-8.8s）
- sound: 原曲主歌二；无附加音效

## Frame 25 — L21 全场鼓掌

- act: 预副歌二
- scene: 礼堂内，从舞台看嘉宾席全景，红金纸屑飘落
- time: 02:40.218 → 02:45.814
- duration: 5.596s
- beat: #199 → #206
- lrc: L21 @ 02:40.510
- meaning: 全场都在高兴，只有他明白过来
- action: 全场客人同时站起鼓掌，只有最后一排的 Clawd 坐着不动
- clawd: front / sad / idle
- camera: 全景缓慢推向最后一排，纸屑只落在前排
- transition_in: 戒指的金色放大盖满全屏后变成纸屑散开
- poster: 164.0
- status: outline
- reads: 全场都在欢呼（0.3-3s）；只有他没站起来（3-5.6s）
- sound: 原曲预副歌二；无附加音效

## Frame 26 — L22 红线漏掉一桌

- act: 预副歌二
- scene: 同一嘉宾席，俯视全场
- time: 02:45.814 → 02:51.433
- duration: 5.619s
- beat: #206 → #213
- lrc: L22 @ 02:46.060
- meaning: 这段关系已经彻底结束
- action: 红线从舞台出发，一桌一桌把客人连起来，停在 Clawd 前一桌的桌脚
- clawd: front / sad / idle
- camera: 高位俯角沿红线向后移动，停在没有红线的最后一排
- transition_in: 同场延续，相机升高
- poster: 170.5
- status: outline
- reads: 红线连起全场（0.3-3.5s）；只有他没有被连上（3.5-5.6s）
- sound: 原曲预副歌二；无附加音效

## Frame 27 — L23 举杯

- act: 副歌二
- scene: 最后一排，回到平视
- time: 02:51.433 → 02:57.795
- duration: 6.362s
- beat: #213 → #221
- lrc: L23 @ 02:51.750
- meaning: 第二次感谢邀请，这次在现场
- action: Clawd 站起来，向舞台举起酒杯，姿势与 Frame 9 举喜帖相同
- clawd: front / neutral / hold（酒杯）
- camera: 正面中景固定，构图与 Frame 9 相同
- transition_in: 相机由俯角下降，经过前景的红线纸层后回到平视
- poster: 175.5
- status: outline
- reads: 同样的礼貌动作再做一遍（0.3-6.3s）
- sound: 原曲副歌二；无附加音效

## Frame 28 — L24 按住桌沿

- act: 副歌二
- scene: 最后一排，身后的侧门亮着绿色的出口灯
- time: 02:57.795 → 03:03.414
- duration: 5.619s
- beat: #221 → #228
- lrc: L24 @ 02:58.050
- meaning: 再次告诫自己不要躲开
- action: Clawd 两手按住桌沿，把自己按回座位
- clawd: front / sad / idle
- camera: 小幅后拉，侧门进入画面
- transition_in: 同场延续
- poster: 181.5
- status: outline
- reads: 出口就在身后（0.3-2.5s）；他把自己按住（2.5-5.6s）
- sound: 原曲副歌二；无附加音效

## Frame 29 — L25 揭开肖像

- act: 副歌二
- scene: 新娘正面肖像，满屏花和白纱；纸层下面是旧日雪地
- time: 03:03.414 → 03:10.613
- duration: 7.199s
- beat: #228 → #237
- lrc: L25 @ 03:03.880
- meaning: 今天她特别美，这份美他也曾拥有过
- action: 新娘肖像的右半边像纸一样被揭开，露出同样姿势下被 Clawd 抱着的她
- clawd: 肖像层中 hug；新娘 front / happy
- camera: 正面特写极慢推近，揭开时相机不动
- transition_in: 反打切换到他看见的舞台
- poster: 189.0
- status: outline
- reads: 今天的她（0.5-3.5s）；她曾被他抱着（3.5-7.1s）
- sound: 原曲副歌二；无附加音效

## Frame 30 — L26 扶正席卡

- act: 副歌二
- scene: 桌面席卡占前景，Clawd 在后方
- time: 03:10.613 → 03:17.021
- duration: 6.408s
- beat: #237 → #245
- lrc: L26 @ 03:11.320
- meaning: 这场仪式属于那两个人，他只是客人
- action: Clawd 把歪掉的席卡扶正，字朝向镜头
- clawd: front / sad / idle
- camera: 焦点由他移到席卡，文字读清后固定
- transition_in: 揭开的纸层翻回，翻折遮挡换景
- poster: 195.5
- status: outline
- reads: 他自己把“嘉宾”两字摆正（0.8-6.4s）
- sound: 原曲副歌二；无附加音效

## Frame 31 — L27 票根压杯底

- act: 副歌二
- scene: 同一桌面，酒杯在 Clawd 手边
- time: 03:17.021 → 03:23.407
- duration: 6.386s
- beat: #245 → #253
- lrc: L27 @ 03:17.260
- meaning: 第二次放下回忆
- action: Clawd 把两张旧票根压到酒杯下
- clawd: front / neutral / hold（票根）
- camera: 由席卡横移到酒杯，近景固定
- transition_in: 同场延续
- poster: 201.5
- status: outline
- reads: 窗台上的那两张票（0.3-3s）；他把它们留在桌上（3-6.3s）
- sound: 原曲副歌二；无附加音效

## Frame 32 — L28 全身拉红线

- act: 副歌二
- scene: 前一桌桌脚的红线就在 Clawd 手边，舞台方向暖光
- time: 03:23.407 → 03:29.026
- duration: 5.619s
- beat: #253 → #260
- lrc: L28 @ 03:23.610
- meaning: 依然不肯相信这是命运
- action: Clawd 抓住红线，用全身向后拉，红线不动，他反而被拖向前
- clawd: front / sad / hold（红线）
- camera: 相机向他拉近，他在画面里被拖得越来越大
- transition_in: 同场延续
- poster: 207.5
- status: outline
- reads: 比第一次更用力（0.2-3s）；被拖动的是他（3-5.6s）
- sound: 原曲副歌二；无附加音效

## Frame 33 — L29 撕走半张

- act: 副歌二尾段
- scene: I01 的雪地画面，色彩已经变成旧报纸
- time: 03:29.026 → 03:33.020
- duration: 3.994s
- beat: #260 → #265
- lrc: L29 @ 03:29.400
- meaning: 当年的约定已成过去
- action: 画面中新娘那半张纸被撕走，Clawd 的手还勾着空气
- clawd: front / happy / idle（旧照内的姿势）
- camera: 固定，构图与 I01 结尾相同
- transition_in: 红线绷直横过画面，换到旧雪地
- poster: 212.0
- status: outline
- reads: 认出拉钩（0.3-1.5s）；另一半没有了（1.5-4s）
- sound: 原曲副歌二尾段；无附加音效

## Frame 34 — L30 翻出笑脸

- act: 副歌二尾段
- scene: 最后一排，Clawd 脸部近景
- time: 03:33.020 → 03:36.224
- duration: 3.204s
- beat: #265 → #269
- lrc: L30 @ 03:33.230
- meaning: 他试着真心祝福
- action: 脸上的表情纸片一翻，变成笑脸，边缘翘起
- clawd: front / neutral → happy / idle
- camera: 正面近景固定
- transition_in: 撕下的纸片从前景落下，遮挡换景
- poster: 215.5
- status: outline
- reads: 笑容是贴上去的（0.3-3.2s）
- sound: 原曲副歌二尾段；无附加音效

## Frame 35 — L31 笑脸掉落

- act: 副歌二尾段
- scene: 同一近景
- time: 03:36.224 → 03:40.218
- duration: 3.994s
- beat: #269 → #274
- lrc: L31 @ 03:36.790
- meaning: 请原谅他失态
- action: 笑脸纸片从脸上滑落，露出流泪的脸
- clawd: front / happy → sad / idle
- camera: 不动，纸片从画面下缘离开
- transition_in: 同场延续
- poster: 218.5
- status: outline
- reads: 笑脸掉了（0.6-2.2s）；他在哭（2.2-4s）
- sound: 原曲副歌二尾段；无附加音效

## Frame 36 — L32 从侧门离开

- act: 副歌二尾段
- scene: 侧门外的雪地，相机在门外；门内是暖金色的礼堂
- time: 03:40.218 → 03:47.416
- duration: 7.198s
- beat: #274 → #283
- lrc: L32 @ 03:40.420
- meaning: 借口失陪，先离开座位
- action: Clawd 推开侧门，朝镜头走出，门在他身后合上，暖光消失
- clawd: front / sad / walk
- camera: 雪地平视，随他靠近缓慢后退，门合上后停住
- transition_in: 侧门的门板遮挡换景
- poster: 225.5
- status: outline
- reads: 他离开了喜庆的地方（0.3-5s）；门关上，只剩雪（5-7.1s）
- sound: 原曲副歌二尾段及句后过渡；无附加音效

## Frame 37 — L33 幕布拉开

- act: 桥段
- scene: 同一片雪地，拉远后露出它是一座纸板舞台
- time: 03:47.416 → 03:55.427
- duration: 8.011s
- beat: #283 → #293
- lrc: L33 @ 03:47.490
- meaning: 这又不是电视剧，他却演得太投入
- action: 红幕从两侧拉开，追光打在流泪的 Clawd 身上
- clawd: front / sad / idle
- camera: 持续后拉，雪地边缘露出纸板和台口
- transition_in: 同场延续，相机没有切换
- poster: 234.0
- status: outline
- reads: 他站在舞台上（0.2-4s）；刚才的一切像演戏（4-8s）
- sound: 原曲桥段；无附加音效

## Frame 38 — L34 自己拉上幕布

- act: 桥段
- scene: 同一纸舞台，台口一侧垂着幕绳
- time: 03:55.427 → 04:01.766
- duration: 6.339s
- beat: #293 → #301
- lrc: L34 @ 03:55.640
- meaning: 这段剧情难看得不想再看
- action: Clawd 走到台边，拉动幕绳，把幕布合上，盖住自己
- clawd: front / sad / hold（幕绳）
- camera: 正面全景固定，幕布合拢后红色铺满全屏
- transition_in: 同场延续
- poster: 239.5
- status: outline
- reads: 他不想再看（0.3-3s）；幕布由他自己合上（3-6.3s）
- sound: 原曲桥段；无附加音效

## Frame 39 — L35 隔窗点头

- act: 终副歌
- scene: 相机在礼堂内隔窗向外拍，Clawd 站在窗外雪地，玻璃上映着新人跳舞
- time: 04:01.766 → 04:08.221
- duration: 6.455s
- beat: #301 → #309
- lrc: L35 @ 04:02.050
- meaning: 第三次感谢邀请，这次只是观赏
- action: Clawd 空着手，隔着玻璃向里面点一次头
- clawd: front / sad / idle
- camera: 正面中景固定，第三次使用 Frame 9 的构图
- transition_in: 红幕像窗帘向两侧打开，后面就是窗户
- poster: 246.0
- status: outline
- reads: 他已经站在外面（0.3-3s）；空手完成同样的礼节（3-6.4s）
- sound: 原曲终副歌；无附加音效

## Frame 40 — L36 绸带指向路

- act: 终副歌
- scene: 同一扇窗外，胸花占画面中部
- time: 04:08.221 → 04:13.817
- duration: 5.596s
- beat: #309 → #316
- lrc: L36 @ 04:08.480
- meaning: 当客人或许也是一种命运
- action: 风把胸花的红绸带吹直，绸带指向离开礼堂的路
- clawd: front / neutral / idle
- camera: 从胸花沿绸带横移到路，再停住
- transition_in: 同场延续，相机推近胸花
- poster: 252.0
- status: outline
- reads: 他的红线没有连着任何人（0.3-3s）；它指向路（3-5.6s）
- sound: 原曲终副歌；无附加音效

## Frame 41 — L37 停在光外

- act: 终副歌
- scene: 窗内的暖光在雪地上投成一块金色的矩形，Clawd 在矩形外
- time: 04:13.817 → 04:21.016
- duration: 7.199s
- beat: #316 → #325
- lrc: L37 @ 04:14.360
- meaning: 已经离开的人，没有资格再关心
- action: Clawd 朝窗内挪了一步，脚尖停在光的边缘，没有踏进去
- clawd: front / sad / walk
- camera: 由中景下摇到脚和光的边缘，固定
- transition_in: 同场延续
- poster: 259.0
- status: outline
- reads: 他想靠近（0.6-3.5s）；光的边缘就是他的界限（3.5-7.1s）
- sound: 原曲终副歌；无附加音效

## Frame 42 — L38 胸花与合抱

- act: 终副歌
- scene: 窗前，胸花位于前景，玻璃上映出新人
- time: 04:21.016 → 04:27.424
- duration: 6.408s
- beat: #325 → #333
- lrc: L38 @ 04:21.620
- meaning: 走到一起的是那两个人，他只是客人
- action: 玻璃上的新人抱在一起，红金纸屑在玻璃内落下
- clawd: front / sad / idle
- camera: 由脸推到胸花，“嘉宾”两字与玻璃上的新人同框
- transition_in: 同场延续
- poster: 266.0
- status: outline
- reads: 他们抱在一起（0.6-3.5s）；他胸前依然写着身份（3.5-6.4s）
- sound: 原曲终副歌；无附加音效

## Frame 43 — L39 眼泪变成照片

- act: 终副歌
- scene: 窗外的雪地，Clawd 正面半身，脚下的雪地
- time: 04:27.424 → 04:33.833
- duration: 6.409s
- beat: #333 → #341
- lrc: L39 @ 04:27.610
- meaning: 把回忆全部流尽，来庆祝这场婚礼
- action: 泪滴一滴接一滴落下，碰到雪地后变成一张张小旧照片，散开如纸屑
- clawd: front / sad / idle
- camera: 沿泪滴缓慢下摇至雪地，照片铺开后停住
- transition_in: 同场延续
- poster: 272.0
- status: outline
- reads: 眼泪就是回忆（0.2-3.5s）；回忆散成他的纸屑（3.5-6.4s）
- sound: 原曲终副歌；无附加音效

## Frame 44 — L40 空白气泡

- act: 终副歌
- scene: 窗外，Clawd 正面，窗户占满背景
- time: 04:33.833 → 04:39.429
- duration: 5.596s
- beat: #341 → #348
- lrc: L40 @ 04:33.950
- meaning: 他依然不敢说出祝福
- action: 一个空白的对话气泡从他身边冒起，没有字，又缩回去
- clawd: front / sad / idle
- camera: 中景固定，气泡位于他和窗之间，与 Frame 7 的祝福气泡同形
- transition_in: 由雪地相机回升
- poster: 277.0
- status: outline
- reads: 他想说话（0.3-2.5s）；什么都没说出来（2.5-5.6s）
- sound: 原曲终副歌；无附加音效

## Frame 45 — L41 雪停

- act: 终副歌
- scene: 窗外，天空灰蓝，云层裂开一道缝
- time: 04:39.429 → 04:43.423
- duration: 3.994s
- beat: #348 → #353
- lrc: L41 @ 04:39.880
- meaning: 这场婚礼带给他最后的清醒
- action: 雪渐渐停下，云缝的光落到 Clawd 脸上，他抬起头
- clawd: front / neutral / idle
- camera: 向上小幅倾斜，把天空带入构图
- transition_in: 同场延续
- poster: 282.5
- status: outline
- reads: 雪停了，他抬头（0.5-3.9s）
- sound: 原曲终副歌；无附加音效

## Frame 46 — L42 抖落胸花

- act: 终副歌
- scene: 窗外雪地，光已铺开
- time: 04:43.423 → 04:49.762
- duration: 6.339s
- beat: #353 → #361
- lrc: L42 @ 04:43.710
- meaning: 他把自己要了回来
- action: Clawd 抖动全身，积雪和胸花一起落下，身体恢复原本的橙色
- clawd: front / neutral / jump（小幅，只用于抖动）
- camera: 正面全身固定，胸花掉到雪上时轻微下摇
- transition_in: 同场延续
- poster: 287.5
- status: outline
- reads: 他把自己抖干净（0.3-3.5s）；胸花留在雪上（3.5-6.3s）
- sound: 原曲终副歌，末尾能量回落；无附加音效

## Frame 47 — L43 走到队尾

- act: 收束
- scene: 礼堂前的台阶，全体人员面向镜头排成合影队伍，新人站在正中
- time: 04:49.762 → 04:53.570
- duration: 3.808s
- beat: #361 → #366
- lrc: L43 @ 04:50.460
- meaning: 至少他还能够站在这里
- action: Clawd 从队伍后方的小路朝镜头走来，停在队伍最边上
- clawd: front / neutral / walk，胸前已无胸花
- camera: 摄影师位置的全景固定
- transition_in: 抖落的雪扬起遮满全屏后散开
- poster: 293.0
- status: outline
- reads: 他是自己走回来的（0.7-3.8s）
- sound: 原曲收束段；无附加音效

## Frame 48 — L44 快门

- act: 收束
- scene: 同一合影，定格为一张带白边的相纸
- time: 04:53.570 → 05:00.257
- duration: 6.687s
- beat: #366 → #374
- lrc: L44 @ 04:54.290
- meaning: 他能成为见证这段爱情的客人
- action: 快门闪过，合影定格成相纸，Clawd 在最边缘露出很小的笑
- clawd: front / shy / idle
- camera: 不动，白边从四周压入，相纸在牛皮纸底上微微落下
- transition_in: 同场延续
- poster: 298.5
- status: outline
- reads: 新人在中央（0.7-3.5s）；他在边缘，构图与旧合照相反（3.5-6.6s）
- sound: 原曲收束段；无附加音效

## Frame 49 — L45 他在拢头纱

- act: 收束
- scene: 礼堂台阶，人群散开；Clawd 在前景朝镜头走，新人在他身后
- time: 05:00.257 → 05:04.228
- duration: 3.971s
- beat: #374 → #379
- lrc: L45 @ 05:00.870
- meaning: 遇到她的那个人真幸运
- action: 新郎替新娘拢好被风吹起的头纱
- clawd: front / shy / walk（前景，已转身离开）
- camera: 随他后退，焦点在身后的新人
- transition_in: 相纸被风吹走，后面是台阶
- poster: 303.5
- status: outline
- reads: 他看不到，观众能看到的温柔（0.6-3.9s）
- sound: 原曲收束段；无附加音效

## Frame 50 — L46 新的拉钩

- act: 收束
- scene: 同一台阶，Clawd 离镜头更近，新人更小
- time: 05:04.228 → 05:09.801
- duration: 5.573s
- beat: #379 → #386
- lrc: L46 @ 05:04.820
- meaning: 希望新郎比他更爱她
- action: 身后的新郎和新娘手勾手拉钩，姿势与 I01 相同
- clawd: front / neutral / walk（前景）
- camera: 继续后退；05:08.709 起低能量区内相机停下
- transition_in: 同场延续
- poster: 307.5
- status: outline
- reads: 约定换成了别人（0.7-5s）；他没有回头（5-5.5s）
- sound: 原曲末句及句后留白；无附加音效

## Frame 51 — O01 同一条路

- act: 尾奏
- scene: 与 P01 完全相同的路、礼堂和前景喜帖、席卡
- time: 05:09.801 → 05:19.948
- duration: 10.147s
- beat: #386 → #399
- lrc: 器乐
- meaning: 开场他停在这里朝礼堂走，现在从这里离开
- action: Clawd 空着手沿路正面走向镜头，从画面下缘走出
- clawd: front / neutral / walk
- camera: 全景固定，与 P01 的最终构图相同
- transition_in: 走过前景的他遮住画面下半部，切回路上；05:10.195 的强起音落在开头
- poster: 315.0
- status: outline
- reads: 同一条路，这次方向相反（0.4-5s）；手里已经没有红色（5-10.1s）
- sound: 原曲尾奏；无附加音效

## Frame 52 — O02 雪盖住席卡

- act: 尾奏
- scene: 同一路面，没有人；一串脚印，远处礼堂依然亮着
- time: 05:19.948 → 05:33.677
- duration: 13.729s
- beat: #399 → 片尾
- lrc: 器乐
- meaning: 留白：他走了，婚礼还在继续
- action: 雪重新落下，慢慢盖住脚印和前景的席卡，“嘉宾”两字在 05:25.985 被盖住
- clawd: 未入画
- camera: 不动；05:29.166 起纸片停止抖动，画面静止到片尾，不淡出到黑场
- transition_in: 同场延续；05:19.948 的重音落在第一片新雪
- poster: 330.0
- status: outline
- reads: 没有人的路（0-6s）；雪盖住了他的身份和足迹（6-13.7s）
- sound: 原曲尾奏，自然衰减至结束；无附加音效
