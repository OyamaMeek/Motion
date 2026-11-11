# 《八个字，一生的回答》短片工程

90 秒，1920×1080，30 帧每秒，2700 帧；120 BPM，180 拍，14 页。画面用 Canvas 2D 逐帧绘制，没有外部图片或视频。成片在 `输出/八个字，一生的回答.mp4`（H.264 + AAC，只留本地，不进仓库）。

内容与出处见上一级的 [选题方案.md](../选题方案.md)、[脚本与时间表.md](../脚本与时间表.md)、[来源对照.md](../来源对照.md)，检查记录见 [检查/抽帧检查记录.md](../检查/抽帧检查记录.md)。

## 文件

| 文件 | 内容 |
| --- | --- |
| `timeline.js` | 规格、14 页的拍点与落拍帧 |
| `script.js` | 全部画面文字、出现与退场的拍点、类型和来源编号；角标；平原上的小字 |
| `lib.js` | 缓动、透视相机、任意平面上逐字排字、纸面与暗场底、逐字出现的横排文字、角标 |
| `world.js` | 蜂窝晶格与电路走线、电子管线框、人物剪影、平原小字 |
| `scenes1.js`—`scenes4.js` | 14 页场景，按页顺序分在四个文件 |
| `film.js`、`index.html` | 按帧号调用场景；页面入口 |
| `audio.mjs` | 配乐：合成层，加上拉伸到 120 BPM 并按小节剪辑的 `bgm.mp3`，前视限幅 |
| `render.mjs` | 起本地静态服务，经调试端口驱动本机无头 Chrome 逐帧导出，交给 ffmpeg 编码 |
| `check.mjs` | 检查导出的 MP4，保存抽帧与波形 |
| `film.test.mjs` | 时间表、文字、来源标注、阅读量、配乐的测试 |
| `sheet.sh` | 把指定帧拼成联系表，制作时预览用 |

## 运行

需要 Node 22 以上、ffmpeg、`/Applications/Google Chrome.app`，以及系统字体 Songti SC、Kaiti SC、Menlo、DIN Condensed。配乐要用仓库根目录的 `bgm.mp3`。中间文件写在仓库的 `.agent/work/蒋葆增fable/`。

```bash
node --test film.test.mjs
```

```bash
node render.mjs --scan
```

```bash
node audio.mjs
```

```bash
node render.mjs --video --workers 6
```

```bash
node check.mjs
```

只导出几帧：

```bash
node render.mjs --stills 0,240,1080 --out ../../.agent/work/蒋葆增fable/stills --jpg
```

## 说明

- 透视没有用 3D 库：`camera()` 把世界坐标投影到屏幕，`textOn()` 对每个字按它所在位置的局部透视做仿射变换，立着的字、铺在地面的字和翻转的板子都用它画。
- 翻页的关键动作都写在落拍帧上（第 n 拍是第 15n 帧），`check.mjs` 用导出文件的相邻帧差核对。
- 第 12 页的光点由八个字的字形网格采样得到，数量正好 2026 个。
- `bgm.mp3` 的拍点数据（112.904 BPM、首个小节起点 0.5387 秒、75 小节）是此前用 librosa 测得的；ffmpeg 解码出的波形比这组拍点早 20 毫秒，`audio.mjs` 里的 `decodeLead` 做了修正，`check.mjs` 的“bgm 对拍”一项核对结果。
