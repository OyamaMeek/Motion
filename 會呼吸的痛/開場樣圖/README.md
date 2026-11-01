# 《會呼吸的痛》开场画风样图

三张均为 **1920×1080 PNG**，由代码绘制，未使用图像生成模型。

共同开场为「独自抵达约定的海边」：背对镜头的主角坐在长椅右端，空位上留着两张旧车票，旅行箱停在身旁，远处是海、港口与灯塔。大片天空和空座呼应报告主歌一的克制、空落与孤独；这里的海边属于本次美术设计，不作为歌词中的具体地点事实。

| 样图 | 绘制方式 | 适配理由 |
| --- | --- | --- |
| [01-像素遊戲.png](01-像素遊戲.png) | Canvas 2D 原生 320×180，固定 24 色，扫描线填充、整数像素线条、Bayer 点阵；关闭平滑后放大 6 倍 | 有限色与停驻的小人物，让「共同心愿变成独自抵达」带着旧游戏存档般的距离感。 |
| [02-紙藝拼貼.png](02-紙藝拼貼.png) | Canvas 2D 分层剪纸，白色剪边与细碎撕边、投影、牛皮纸色底与纤维纹理 | 层层叠放的纸片像被保存的旅行纪念，空座与旧车票把失恋后的缺席变成可触摸的物件。 |
| [03-蠟筆手繪.png](03-蠟筆手繪.png) | p5.js 2.2.0 + p5.brush 3.0.0，`crayon` 干性填色、`2B` 细节、纸张颗粒 | 露纸的蜡笔笔触保留脆弱和迟疑，适合承接歌曲由克制想念逐渐走向自责的情绪。 |

后续动画规则：像素角色逐帧换画，不做补间，全片沿用当前 24 色调色板；纸艺以 10 fps（位于 8–12 fps 范围内）更新，各层每次随机抖动 1–2 个最终输出像素。当前仅为静态选图，尚未制作或验证动画。等待选定画风后再继续。

## 重现

依赖为官方发布文件，保存在 Git 忽略的 `.agent/work/art-libs/`。在项目根目录执行一次：

```bash
mkdir -p .agent/work/art-libs
curl -fsSL https://cdn.jsdelivr.net/npm/p5@2.2.0/lib/p5.min.js -o .agent/work/art-libs/p5-2.2.0.min.js
curl -fsSL https://cdn.jsdelivr.net/npm/p5.brush@3.0.0/dist/p5.brush.js -o .agent/work/art-libs/p5.brush-3.0.0.js
python3 -m http.server 8765 --bind 127.0.0.1
```

打开 `http://127.0.0.1:8765/會呼吸的痛/開場樣圖/index.html?style=pixel`，将 `style` 换成 `paper` 或 `crayon` 查看另两版。蜡笔版需要 WebGL2。源码 `scene.js` 共享场景几何，使用三个独立绘制函数。

在已连接的 ego-browser TaskSpace 2 运行渲染与自检（`render.mjs` 的项目绝对路径需与 checkout 一致）：

```bash
ego-browser nodejs -e 'const {renderSamples}=await import("file:///Users/oyamahappa/Documents/GitHub/Motion/會呼吸的痛/開場樣圖/render.mjs");await renderSamples(await taskSpace(2));'
```

检查真实浏览器错误、画布尺寸、不透明度、色彩非空、像素版调色板成员与全部 6×6 色块一致性；输出三张 PNG、`驗證結果.json` 和 `.agent/visual/` 浏览器截图。材质、构图和裁切另对导出原图作视觉检查。

API 依据：[p5.brush 官方说明](https://github.com/acamposuribe/p5.brush/blob/main/llms.txt)、[p5.js createCanvas](https://p5js.org/reference/p5/createCanvas/)。
