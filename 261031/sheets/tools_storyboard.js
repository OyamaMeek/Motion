/* 由 shots.js 生成 storyboard.md（HyperFrames STORYBOARD 格式）与 storyboard.png 的排版页。node tools_storyboard.js <关键帧目录> */
const fs = require('fs');
const path = require('path');
global.window = global;
require('../data/timing.js');
const M = require('../shots.js');
const framesDir = process.argv[2];
const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(2).padStart(5, '0')}`;
const line = (s) => (s.lrc ? `L${String(s.lrc).padStart(2, '0')}` : '器乐');
const section = (t) => (t < 18 ? '钢琴前奏' : t < 67.5 ? '主歌一' : t < 103 ? '副歌一' : t < 123 ? '间奏' : t < 172.6 ? '主歌二' : t < 208 ? '副歌二' : t < 246.7 ? '尾段副歌' : '钢琴尾奏');

const head = `---
format: 1920x1080
fps: 24
duration: 273s
message: 一个人走完了和妈妈约好的路，才明白想念会跟着每一次呼吸
arc: 抵达 → 独自发痛 → 回家 → 暖色回忆 → 空屋 → 海边许诺 → 留白
audience: 听过这首歌、失去过至亲或所爱的人
mode: collaborative
---

# 《會呼吸的痛》分镜

歌词正文不重复写入本文件，L01 至 L37 对应 \`會呼吸的痛.lrc\` 的第 1 至 37 行，成片字幕在渲染时从该文件读取。

## 待你确认

- **第 4 项抽象歌词理解**：你发来的任务里这一项还是占位文字“(写在这里)”。我先按亲情线处理：“你”是妈妈蟹，依据是作词人谈过的《东京铁塔》背景（见 \`會呼吸的痛.md\`）。下面是我替你定的抽象句表现，要改只需告诉我镜头号。
- **确认的时序**：“分镜已确认”和“草图已确认”都是在分镜与草图生成之前发来的，请以本文件和 \`storyboard.png\` 为准再看一遍。

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

实现上全片只有一条摄像机路径。每个镜头的起点落在节拍上，摄像机从该节拍开始移动。切换场景只用四种手段：上摇穿过纸面天空、穿过房门、推进窗内、沿地面横移。角色和摄像机都是时间的连续函数，由 \`tools_check.js\` 逐帧校验，衔接帧前后不会瞬移，也没有硬切和整屏叠化。

每个镜头的 \`link\` 字段写明它与下一镜的衔接。

`;

const body = M.SHOTS.map((s, i) => {
  const dur = s.end - s.start;
  const next = M.SHOTS[i + 1];
  return `## Frame ${i + 1} — ${s.id} ${s.title}

- scene: ${s.scene}
- duration: ${dur.toFixed(2)}s
- poster: ${(s.start + (s.move || 0) + Math.max(0, dur - (s.move || 0)) * 0.6).toFixed(2)}
- transition_in: ${i === 0 ? '片头' : s.via === 'sky' ? '上摇穿天空（连续）' : s.via === 'portal' ? '穿窗推进（连续）' : '连续运镜'}
- status: animated
- time: ${fmt(s.start)} → ${fmt(s.end)}
- lyric: ${line(s)}${s.lrc ? `（LRC 起点对应节拍误差见 會呼吸的痛.md）` : ''}
- action: ${s.act}
- camera: ${s.shotType}
- reads: ${s.act}（0-${dur.toFixed(1)}s）
- sound: ${section(s.start)}
- link: ${next ? `${next.id} 起点 ${fmt(next.start)} 对齐节拍。${s.link}` : s.link}
`;
}).join('\n');
fs.writeFileSync('storyboard.md', head + body);

const cards = M.SHOTS.map((s) => `<div class="c"><img src="file://${path.resolve(framesDir, s.id + '.png')}"><div class="m"><b>${s.id}</b><span>${fmt(s.start)}</span><i>${line(s)}</i></div><div class="d">${s.act}</div></div>`).join('');
fs.writeFileSync(path.join(framesDir, 'board.html'), `<!doctype html><meta charset="utf-8"><style>
body{margin:0;width:3840px;background:#f8efdb;font-family:"PingFang TC",sans-serif;color:#2c1f14}
h1{margin:0;padding:36px 44px 8px;font-size:46px}p{margin:0;padding:0 44px 20px;font-size:26px}
.g{display:grid;grid-template-columns:repeat(6,1fr);gap:18px;padding:0 44px 44px}
.c{background:#fffaf0;border:2px solid #d8c8a6;border-radius:12px;overflow:hidden}.c img{width:100%;display:block}
.m{display:flex;gap:16px;padding:10px 14px 0;font-size:25px;align-items:baseline}.m b{font-size:29px}.m i{margin-left:auto;font-style:normal;color:#a0522d}
.d{padding:4px 14px 12px;font-size:23px;line-height:1.3;min-height:60px}</style>
<h1>《會呼吸的痛》分镜总览</h1><p>共 ${M.SHOTS.length} 镜，一镜到底，L 序号对应 會呼吸的痛.lrc 的行号，时间为镜头起点（对齐节拍）</p><div class="g">${cards}</div>`);
console.log('storyboard ok', M.SHOTS.length);
