---
format: 1920x1080
fps: 24
duration: 273s
message: 一个人走完了和妈妈约好的路，才明白想念会跟着每一次呼吸
arc: 抵达 → 独自发痛 → 回家 → 暖色回忆 → 空屋 → 海边许诺 → 留白
audience: 听过这首歌、失去过至亲或所爱的人
mode: collaborative
---

# 《會呼吸的痛》分镜

歌词正文不重复写入本文件，L01 至 L37 对应 `會呼吸的痛.lrc` 的第 1 至 37 行，成片字幕在渲染时从该文件读取。

## 待你确认

- **第 4 项抽象歌词理解**：你发来的任务里这一项还是占位文字“(写在这里)”。我先按亲情线处理：“你”是妈妈蟹，依据是作词人谈过的《东京铁塔》背景（见 `會呼吸的痛.md`）。下面是我替你定的抽象句表现，要改只需告诉我镜头号。
- **确认的时序**：“分镜已确认”和“草图已确认”都是在分镜与草图生成之前发来的，请以本文件和 `storyboard.png` 为准再看一遍。

| 抽象歌词 | 观众看到的连续动作 |
| --- | --- |
| L07、L21 会呼吸的痛 | 胸口的红线团随呼吸鼓起、收缩 |
| L08、L22 活在所有角落 | 红线爬满全身；第二次连到屋里的杯子、相框、拖鞋 |
| L12 在血液中滚动 | 红珠沿身体里的红线转圈 |
| L26 第二次 | 红毛线球在地板上来回滚 |
| L17 拆了城墙 | 妈妈推倒沙墙，小蟹提箱走出去 |
| L18 把自己捆绑 | 妈妈织围巾，毛线一圈圈绕到自己身上 |
| L31 灵魂飘浮 | 虚线的小蟹从头顶飘走，本体还在笑 |
| L35 像贝壳 | 小蟹缩进大贝壳，只露出眼睛 |

## 转场方案：一镜到底（已选）

歌曲约 112 BPM、半拍感 56 BPM，一句歌词常占 4 到 8 秒，情绪靠持续累积；一台摄像机在同一张蜡笔长卷上慢慢走，最接近“痛随呼吸不断”的感觉，也最能让观众盯住小蟹的表情。卡点切换的甩镜会打断抒情，拼贴快切每 0.5 到 1 秒换画面，与慢歌和绘本的翻阅节奏都相悖。

实现上全片只有一条摄像机路径。每个镜头的起点落在节拍上，摄像机从该节拍开始移动。切换场景只用四种手段：上摇穿过纸面天空、穿过房门、推进窗内、沿地面横移。角色和摄像机都是时间的连续函数，由 `tools_check.js` 逐帧校验，衔接帧前后不会瞬移，也没有硬切和整屏叠化。

每个镜头的 `link` 字段写明它与下一镜的衔接。

## Frame 1 — S00 提箱走上观景台

- scene: 黄昏的东京塔观景台，纸面天空
- duration: 18.04s
- poster: 10.83
- transition_in: 片头
- status: animated
- time: 00:00.00 → 00:18.04
- lyric: 器乐
- action: 小蟹提着箱子沿栏杆走到中央，音乐停顿时站定
- camera: 全景，慢推
- reads: 小蟹提着箱子沿栏杆走到中央，音乐停顿时站定（0-18.0s）
- sound: 钢琴前奏
- link: S01 起点 00:18.04 对齐节拍。小蟹走到停顿处站定，下一镜从同一位置、同一大小接转身

## Frame 2 — S01 第一次眺望

- scene: 栏杆前，塔在右上方
- duration: 8.57s
- poster: 24.02
- transition_in: 连续运镜
- status: animated
- time: 00:18.04 → 00:26.61
- lyric: L01（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹放下箱子，背对观众抬头望塔
- camera: 全景推到中景
- reads: 小蟹放下箱子，背对观众抬头望塔（0-8.6s）
- sound: 主歌一
- link: S02 起点 00:26.61 对齐节拍。摄像机沿小蟹视线下摇到城市，小蟹保持背影不动

## Frame 3 — S02 灯火像坠落的星

- scene: 城市灯海
- duration: 8.57s
- poster: 32.59
- transition_in: 连续运镜
- status: animated
- time: 00:26.61 → 00:35.18
- lyric: L02（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 灯火一颗颗拖着尾巴往下掉，小蟹背对观众看着
- camera: 下摇
- reads: 灯火一颗颗拖着尾巴往下掉，小蟹背对观众看着（0-8.6s）
- sound: 主歌一
- link: S03 起点 00:35.18 对齐节拍。已落下的光继续落完，小蟹在原位转身，摄像机推近

## Frame 4 — S03 到了，却更难过

- scene: 栏杆前
- duration: 8.55s
- poster: 41.14
- transition_in: 连续运镜
- status: animated
- time: 00:35.18 → 00:43.72
- lyric: L03（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹转过身，耷拉下眉眼
- camera: 推近
- reads: 小蟹转过身，耷拉下眉眼（0-8.5s）
- sound: 主歌一
- link: S04 起点 00:43.72 对齐节拍。手部不动，从身侧把合影拿到胸前高度

## Frame 5 — S04 一个人完成约定

- scene: 栏杆前，城市虚在身后
- duration: 6.97s
- poster: 48.54
- transition_in: 连续运镜
- status: animated
- time: 00:43.72 → 00:50.69
- lyric: L04（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹举起和妈妈的合影，让照片也看看塔
- camera: 微推
- reads: 小蟹举起和妈妈的合影，让照片也看看塔（0-7.0s）
- sound: 主歌一
- link: S05 起点 00:50.69 对齐节拍。合影原位不动，摄像机上移腾出头顶空间，念头气泡从头顶升起

## Frame 6 — S05 “不急，我等你”

- scene: 气泡里的妈妈
- duration: 8.59s
- poster: 56.68
- transition_in: 连续运镜
- status: animated
- time: 00:50.69 → 00:59.28
- lyric: L05（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 气泡里妈妈笑着挥手，示意慢慢来
- camera: 镜头略升
- reads: 气泡里妈妈笑着挥手，示意慢慢来（0-8.6s）
- sound: 主歌一
- link: S06 起点 00:59.28 对齐节拍。气泡不动，妈妈旁边的日历接着出现

## Frame 7 — S06 明天不一定有

- scene: 气泡里的日历
- duration: 8.52s
- poster: 64.79
- transition_in: 连续运镜
- status: animated
- time: 00:59.28 → 01:07.80
- lyric: L06（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 日历一页页撕落，最后一页是空白
- camera: 静止微推
- reads: 日历一页页撕落，最后一页是空白（0-8.5s）
- sound: 主歌一
- link: S07 起点 01:07.80 对齐节拍。上摇至纸面天空，气泡升入天空消失在画外，再下摇进旅馆房间

## Frame 8 — S07 想念会呼吸

- scene: 东京旅馆房间，小蟹坐在床沿
- duration: 3.81s
- poster: 71.37
- transition_in: 上摇穿天空（连续）
- status: animated
- time: 01:07.80 → 01:11.61
- lyric: L07（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 每吸一口气，胸口的红线团就鼓一下
- camera: 上摇穿天空后下摇落入房间
- reads: 每吸一口气，胸口的红线团就鼓一下（0-3.8s）
- sound: 副歌一
- link: S08 起点 01:11.61 对齐节拍。线团位置不变，小蟹姿势不变，红线从线团向外长

## Frame 9 — S08 活在所有角落

- scene: 床沿
- duration: 4.81s
- poster: 75.21
- transition_in: 连续运镜
- status: animated
- time: 01:11.61 → 01:16.42
- lyric: L08（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 红线从胸口爬满身体、双手和小脚
- camera: 微推
- reads: 红线从胸口爬满身体、双手和小脚（0-4.8s）
- sound: 副歌一
- link: S09 起点 01:16.42 对齐节拍。红线保留，右手从身侧拿起信

## Frame 10 — S09 哼歌看信都痛

- scene: 床沿
- duration: 4.83s
- poster: 79.80
- transition_in: 连续运镜
- status: animated
- time: 01:16.42 → 01:21.25
- lyric: L09（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹捧着信轻哼，音符一升起线团就跳一下
- camera: 静止微推
- reads: 小蟹捧着信轻哼，音符一升起线团就跳一下（0-4.8s）
- sound: 副歌一
- link: S10 起点 01:21.25 对齐节拍。音符飘出画面后不再出现，摄像机从同一中心慢慢后拉

## Frame 11 — S10 沉默也痛

- scene: 整个房间，空空的
- duration: 3.74s
- poster: 84.77
- transition_in: 连续运镜
- status: animated
- time: 01:21.25 → 01:24.98
- lyric: L10（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹闭嘴不动，只有线团还在起伏
- camera: 慢拉到全景
- reads: 小蟹闭嘴不动，只有线团还在起伏（0-3.7s）
- sound: 副歌一
- link: S11 起点 01:24.98 对齐节拍。小蟹放下信，沿地板走向窗口，摄像机横移跟随

## Frame 12 — S11 遗憾也会呼吸

- scene: 窗前
- duration: 3.76s
- poster: 88.08
- transition_in: 连续运镜
- status: animated
- time: 01:24.98 → 01:28.75
- lyric: L11（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹对着窗玻璃呵气，雾气里浮出妈妈的轮廓
- camera: 横移
- reads: 小蟹对着窗玻璃呵气，雾气里浮出妈妈的轮廓（0-3.8s）
- sound: 副歌一
- link: S12 起点 01:28.75 对齐节拍。小蟹原位转回正面，摄像机沿身体推近

## Frame 13 — S12 在血液里滚动

- scene: 窗前特写
- duration: 4.81s
- poster: 92.47
- transition_in: 连续运镜
- status: animated
- time: 01:28.75 → 01:33.55
- lyric: L12（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 红珠子沿身体里的红线来回滚
- camera: 推到特写
- reads: 红珠子沿身体里的红线来回滚（0-4.8s）
- sound: 副歌一
- link: S13 起点 01:33.55 对齐节拍。红珠收回胸口，双手向胸前收拢接住围巾

## Frame 14 — S13 后悔与恨

- scene: 窗前
- duration: 4.83s
- poster: 97.17
- transition_in: 连续运镜
- status: animated
- time: 01:33.55 → 01:38.38
- lyric: L13（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹抱紧妈妈织的围巾，眼泪掉下来
- camera: 微拉
- reads: 小蟹抱紧妈妈织的围巾，眼泪掉下来（0-4.8s）
- sound: 副歌一
- link: S14 起点 01:38.38 对齐节拍。围巾留在胸前收在手里，小蟹转向窗，伸出右手

## Frame 15 — S14 想见不能见

- scene: 窗前，玻璃上是妈妈的影子
- duration: 4.81s
- poster: 102.11
- transition_in: 连续运镜
- status: animated
- time: 01:38.38 → 01:43.19
- lyric: L14（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹隔着玻璃伸手，碰不到窗上的妈妈
- camera: 横移微推
- reads: 小蟹隔着玻璃伸手，碰不到窗上的妈妈（0-4.8s）
- sound: 副歌一
- link: S15 起点 01:43.19 对齐节拍。影子随雾散去，小蟹转身走向房门，摄像机跟随

## Frame 16 — S15 搭船回家

- scene: 旅馆房门外，码头，渡轮，海
- duration: 17.69s
- poster: 114.69
- transition_in: 连续运镜
- status: animated
- time: 01:43.19 → 02:00.88
- lyric: 器乐
- action: 小蟹提箱走出房门，登上渡轮一路向右驶向海滩
- camera: 横移跟拍
- reads: 小蟹提箱走出房门，登上渡轮一路向右驶向海滩（0-17.7s）
- sound: 间奏
- link: S16 起点 02:00.88 对齐节拍。渡轮靠岸，小蟹走上沙滩继续向右，摄像机保持同一高度

## Frame 17 — S16 家门前站住

- scene: 海边小屋外
- duration: 2.14s
- poster: 122.96
- transition_in: 连续运镜
- status: animated
- time: 02:00.88 → 02:03.02
- lyric: 器乐
- action: 小蟹走到家门前站定，望着亮灯的窗
- camera: 横移收住
- reads: 小蟹走到家门前站定，望着亮灯的窗（0-2.1s）
- sound: 间奏
- link: S17 起点 02:03.02 对齐节拍。摄像机向窗内连续推进，窗框扩大到画面之外

## Frame 18 — S17 没见过你难过

- scene: 暖黄色回忆：门廊
- duration: 8.57s
- poster: 129.44
- transition_in: 穿窗推进（连续）
- status: animated
- time: 02:03.02 → 02:11.59
- lyric: L15（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 妈妈走进画面，对观众笑着
- camera: 穿窗推进
- reads: 妈妈走进画面，对观众笑着（0-8.6s）
- sound: 主歌二
- link: S18 起点 02:11.59 对齐节拍。妈妈站在原位转身，摄像机不动

## Frame 19 — S18 寂寞的倔强

- scene: 门廊
- duration: 8.59s
- poster: 137.38
- transition_in: 连续运镜
- status: animated
- time: 02:11.59 → 02:20.18
- lyric: L16（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 妈妈侧过身，笑容收起，一个人站着
- camera: 微推
- reads: 妈妈侧过身，笑容收起，一个人站着（0-8.6s）
- sound: 主歌二
- link: S19 起点 02:20.18 对齐节拍。妈妈向右走到沙墙边，摄像机横移跟随

## Frame 20 — S19 拆了城墙放我走

- scene: 沙堡围墙
- duration: 8.57s
- poster: 146.44
- transition_in: 连续运镜
- status: animated
- time: 02:20.18 → 02:28.75
- lyric: L17（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 妈妈推开沙墙，小蟹提箱走出去
- camera: 横移
- reads: 妈妈推开沙墙，小蟹提箱走出去（0-8.6s）
- sound: 主歌二
- link: S20 起点 02:28.75 对齐节拍。小蟹走出画面右侧，妈妈留下，摄像机左移回到木桩

## Frame 21 — S20 原地等着

- scene: 码头木桩旁
- duration: 6.94s
- poster: 153.95
- transition_in: 连续运镜
- status: animated
- time: 02:28.75 → 02:35.69
- lyric: L18（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 妈妈坐着织围巾，毛线一圈圈绕在自己身上
- camera: 横移
- reads: 妈妈坐着织围巾，毛线一圈圈绕在自己身上（0-6.9s）
- sound: 主歌二
- link: S21 起点 02:35.69 对齐节拍。毛线留在身上，妈妈的手放下，改拄拐杖

## Frame 22 — S21 没说自己也软弱

- scene: 木桩旁
- duration: 8.59s
- poster: 161.56
- transition_in: 连续运镜
- status: animated
- time: 02:35.69 → 02:44.28
- lyric: L19（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 妈妈拄着拐杖轻轻发抖，望着海
- camera: 推近
- reads: 妈妈拄着拐杖轻轻发抖，望着海（0-8.6s）
- sound: 主歌二
- link: S22 起点 02:44.28 对齐节拍。摄像机向右横移，沿海岸线掠到远方城市

## Frame 23 — S22 假装不知道

- scene: 远方城市，脚边未拆的信
- duration: 8.57s
- poster: 170.62
- transition_in: 连续运镜
- status: animated
- time: 02:44.28 → 02:52.85
- lyric: L20（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹开心地蹦跳，没回头看脚边那堆信
- camera: 长横移
- reads: 小蟹开心地蹦跳，没回头看脚边那堆信（0-8.6s）
- sound: 主歌二
- link: S23 起点 02:52.85 对齐节拍。上摇至纸面天空，横移，再下摇进家中

## Frame 24 — S23 空屋里的呼吸

- scene: 家中，妈妈的摇椅空着
- duration: 3.76s
- poster: 176.39
- transition_in: 上摇穿天空（连续）
- status: animated
- time: 02:52.85 → 02:56.61
- lyric: L21（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹坐在空摇椅旁，线团随呼吸起伏
- camera: 穿天空后下摇
- reads: 小蟹坐在空摇椅旁，线团随呼吸起伏（0-3.8s）
- sound: 副歌二
- link: S24 起点 02:56.61 对齐节拍。小蟹与摇椅不动，红线开始向屋内物件延伸

## Frame 25 — S24 满屋都是

- scene: 家中全景
- duration: 4.78s
- poster: 180.20
- transition_in: 连续运镜
- status: animated
- time: 02:56.61 → 03:01.39
- lyric: L22（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 红线从小蟹身上连到杯子、相框、拖鞋
- camera: 微拉
- reads: 红线从小蟹身上连到杯子、相框、拖鞋（0-4.8s）
- sound: 副歌二
- link: S25 起点 03:01.39 对齐节拍。红线慢慢收回小蟹身上，小蟹同时拿起桌边的信

## Frame 26 — S25 再哼一遍

- scene: 摇椅旁
- duration: 4.83s
- poster: 185.01
- transition_in: 连续运镜
- status: animated
- time: 03:01.39 → 03:06.22
- lyric: L23（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹捧着妈妈的信又哼起那首歌
- camera: 微推
- reads: 小蟹捧着妈妈的信又哼起那首歌（0-4.8s）
- sound: 副歌二
- link: S26 起点 03:06.22 对齐节拍。音符飘走，摄像机向摇椅横移

## Frame 27 — S26 摇椅停了

- scene: 摇椅
- duration: 3.76s
- poster: 189.16
- transition_in: 连续运镜
- status: animated
- time: 03:06.22 → 03:09.99
- lyric: L24（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 摇椅慢慢停下，屋里什么声音都没有
- camera: 横移
- reads: 摇椅慢慢停下，屋里什么声音都没有（0-3.8s）
- sound: 副歌二
- link: S27 起点 03:09.99 对齐节拍。小蟹收起信，走到摇椅前

## Frame 28 — S27 围巾放上椅子

- scene: 摇椅前
- duration: 3.76s
- poster: 192.88
- transition_in: 连续运镜
- status: animated
- time: 03:09.99 → 03:13.75
- lyric: L25（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹把围巾搭上空摇椅
- camera: 微推
- reads: 小蟹把围巾搭上空摇椅（0-3.8s）
- sound: 副歌二
- link: S28 起点 03:13.75 对齐节拍。围巾垂下时带落毛线球，球滚向地面

## Frame 29 — S28 来回滚动

- scene: 地板
- duration: 4.81s
- poster: 197.35
- transition_in: 连续运镜
- status: animated
- time: 03:13.75 → 03:18.55
- lyric: L26（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 毛线球在地板上滚来滚去，拖出一条红线
- camera: 微拉
- reads: 毛线球在地板上滚来滚去，拖出一条红线（0-4.8s）
- sound: 副歌二
- link: S29 起点 03:18.55 对齐节拍。毛线球和红线留在地板上，小蟹朝信盒走过去

## Frame 30 — S29 那些没回的信

- scene: 信盒前
- duration: 4.83s
- poster: 202.17
- transition_in: 连续运镜
- status: animated
- time: 03:18.55 → 03:23.38
- lyric: L27（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹从盒里拿出一封没拆的信，哭了
- camera: 横移
- reads: 小蟹从盒里拿出一封没拆的信，哭了（0-4.8s）
- sound: 副歌二
- link: S30 起点 03:23.38 对齐节拍。小蟹转向房门方向，摄像机沿地板横移到门

## Frame 31 — S30 想见不能见

- scene: 敞开的家门
- duration: 4.27s
- poster: 206.99
- transition_in: 连续运镜
- status: animated
- time: 03:23.38 → 03:27.66
- lyric: L28（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹冲到门口伸手，门外妈妈的虚影走远
- camera: 长横移
- reads: 小蟹冲到门口伸手，门外妈妈的虚影走远（0-4.3s）
- sound: 副歌二
- link: S31 起点 03:27.66 对齐节拍。虚影走出画外，小蟹穿过门洞，摄像机跟着穿门

## Frame 32 — S31 走到海边

- scene: 清晨海滩
- duration: 3.76s
- poster: 211.19
- transition_in: 连续运镜
- status: animated
- time: 03:27.66 → 03:31.42
- lyric: 器乐
- action: 小蟹穿过门洞，走到沙滩上
- camera: 穿门横移
- reads: 小蟹穿过门洞，走到沙滩上（0-3.8s）
- sound: 副歌二
- link: S32 起点 03:31.42 对齐节拍。小蟹站定，音乐停顿后右手在原位举起

## Frame 33 — S32 发誓

- scene: 海滩
- duration: 3.67s
- poster: 214.34
- transition_in: 连续运镜
- status: animated
- time: 03:31.42 → 03:35.09
- lyric: L29（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹举起右手发誓
- camera: 微推
- reads: 小蟹举起右手发誓（0-3.7s）
- sound: 尾段副歌
- link: S33 起点 03:35.09 对齐节拍。右手落下，小蟹走向妈妈的沙冢

## Frame 34 — S33 抱紧

- scene: 披着围巾的沙冢
- duration: 4.92s
- poster: 219.24
- transition_in: 连续运镜
- status: animated
- time: 03:35.09 → 03:40.01
- lyric: L30（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹张开双手紧紧抱住沙冢
- camera: 横移
- reads: 小蟹张开双手紧紧抱住沙冢（0-4.9s）
- sound: 尾段副歌
- link: S34 起点 03:40.01 对齐节拍。小蟹松开，在沙冢旁原位转向观众

## Frame 35 — S34 假笑，灵魂飘着

- scene: 沙冢旁
- duration: 4.81s
- poster: 223.53
- transition_in: 连续运镜
- status: animated
- time: 03:40.01 → 03:44.82
- lyric: L31（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹脸上在笑，一个虚线的自己从头顶飘起
- camera: 微移
- reads: 小蟹脸上在笑，一个虚线的自己从头顶飘起（0-4.8s）
- sound: 尾段副歌
- link: S35 起点 03:44.82 对齐节拍。飘起的虚线升出画面，妈妈的虚线从沙冢后走来

## Frame 36 — S35 要是你在

- scene: 沙冢旁
- duration: 3.76s
- poster: 227.71
- transition_in: 连续运镜
- status: animated
- time: 03:44.82 → 03:48.58
- lyric: L32（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 虚线的妈妈站到身边，小蟹朝她笑
- camera: 微移
- reads: 虚线的妈妈站到身边，小蟹朝她笑（0-3.8s）
- sound: 尾段副歌
- link: S36 起点 03:48.58 对齐节拍。两者原位不动，小蟹屈身坐下

## Frame 37 — S36 不再让你等

- scene: 沙冢旁
- duration: 3.74s
- poster: 231.22
- transition_in: 连续运镜
- status: animated
- time: 03:48.58 → 03:52.32
- lyric: L33（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹在妈妈身边坐下，不再走开
- camera: 静止
- reads: 小蟹在妈妈身边坐下，不再走开（0-3.7s）
- sound: 尾段副歌
- link: S37 起点 03:52.32 对齐节拍。小蟹与虚线妈妈一起向右起步，摄像机同速跟随

## Frame 38 — S37 陪你做想做的

- scene: 沿海边走
- duration: 4.29s
- poster: 236.33
- transition_in: 连续运镜
- status: animated
- time: 03:52.32 → 03:56.61
- lyric: L34（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹和虚线的妈妈并排散步
- camera: 横移跟拍
- reads: 小蟹和虚线的妈妈并排散步（0-4.3s）
- sound: 尾段副歌
- link: S38 起点 03:56.61 对齐节拍。虚线妈妈继续向右走出画外，小蟹在原位退进身后的大贝壳

## Frame 39 — S38 像贝壳

- scene: 大贝壳
- duration: 5.34s
- poster: 240.54
- transition_in: 连续运镜
- status: animated
- time: 03:56.61 → 04:01.95
- lyric: L35（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹缩进贝壳，只露出眼睛
- camera: 微推
- reads: 小蟹缩进贝壳，只露出眼睛（0-5.3s）
- sound: 尾段副歌
- link: S39 起点 04:01.95 对齐节拍。小蟹从贝壳里探出，贝壳留在原地

## Frame 40 — S39 你回来就好了

- scene: 朝向海平线
- duration: 8.87s
- poster: 248.31
- transition_in: 连续运镜
- status: animated
- time: 04:01.95 → 04:10.82
- lyric: L36（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹背对观众，朝海平线举手招呼
- camera: 慢拉到全景
- reads: 小蟹背对观众，朝海平线举手招呼（0-8.9s）
- sound: 尾段副歌
- link: S40 起点 04:10.82 对齐节拍。招手的手放下，小蟹蹲下，摄像机下移到沙面

## Frame 41 — S40 能重来就好了

- scene: 沙面
- duration: 6.83s
- poster: 255.72
- transition_in: 连续运镜
- status: animated
- time: 04:10.82 → 04:17.65
- lyric: L37（LRC 起点对应节拍误差见 會呼吸的痛.md）
- action: 小蟹在沙上画出妈妈和自己，海浪漫上来抹掉
- camera: 下移
- reads: 小蟹在沙上画出妈妈和自己，海浪漫上来抹掉（0-6.8s）
- sound: 钢琴尾奏
- link: S41 起点 04:17.65 对齐节拍。浪退下，小蟹站起，摄像机慢慢上摇，沙面始终在画内

## Frame 42 — S41 远处的塔

- scene: 海平线上一点小小的东京塔
- duration: 15.35s
- poster: 269.26
- transition_in: 连续运镜
- status: animated
- time: 04:17.65 → 04:33.00
- lyric: 器乐
- action: 小蟹拿着贝壳望海。最后一个重音时，一颗星落向远处的塔
- camera: 慢拉上摇后静止
- reads: 小蟹拿着贝壳望海。最后一个重音时，一颗星落向远处的塔（0-15.3s）
- sound: 钢琴尾奏
- link: 片尾静止，无下一镜
