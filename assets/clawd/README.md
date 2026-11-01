# Clawd 小螃蟹角色与 MV 参考素材

更新日期：2026-11-01（Asia/Taipei）。包含统一的像素角色模块、角色设定图，以及已收集的社区风格参考。

## 当前角色模块

[角色设定图](角色設定圖.png) 为 1920×1440，包含正面、侧面、背面，平静、开心、害羞、难过表情，以及走、跳、拥抱与持物动作。图中所有角色均调用 [character.js](character.js)。用户已确认全片主角使用 Clawd。

后续所有 Clawd 镜头必须导入同一模块，通过参数切换姿势；角色、手部和道具的像素几何只在该模块内修改。

```js
import {drawCharacter} from './assets/clawd/character.js';

drawCharacter(ctx, {
  x: 100, y: 80, scale: 4,
  facing: 'right', expression: 'shy',
  action: 'hold', prop: 'flower', frame: 0,
});
```

| 参数 | 取值与约定 |
| --- | --- |
| `ctx` | Canvas 2D context |
| `x`, `y` | 32 px 基准网格的左上原点；整数，默认 0 |
| `scale` | 正整数像素倍率，默认 1 |
| `facing` | `front`、`right`、`left`、`back`；默认 `front` |
| `expression` | `neutral`、`happy`、`shy`、`sad`；默认 `neutral`；背面隐藏表情 |
| `action` | `idle`、`walk`、`jump`、`hug`、`hold`；默认 `idle` |
| `frame` | 非负整数，按 4 帧循环；使用固定离散姿势，不读取时钟或随机数 |
| `prop` | `hold` 时支持 `ticket`、`flower`、`suitcase`，默认 `ticket`；其他动作必须为空 |

函数返回 `bounds`、`face`、`grip`、`propGrip`、`propBounds`，坐标单位与输入相同，位于调用者当前画布变换之前。持物时道具可能超出 32 px 基准网格，排版使用实际 `bounds` 留出空间。手与道具共用握点并一起移动，所有道具位于面部下方。双角色拥抱使用两次调用，让左右侧 `hug` 姿势相向靠近；示例见 [character-sheet.html](character-sheet.html)。

从项目根目录运行 `python3 -m http.server 8765 --bind 127.0.0.1`，打开 [设定页](http://127.0.0.1:8765/assets/clawd/character-sheet.html)。模块无外部依赖；[character.test.js](character.test.js) 使用真实浏览器 Canvas，调用 `runCharacterTests()` 返回结果。[render.mjs](render.mjs) 导出 `renderCharacterSheet(task)`，可在 ego-browser 的当前 TaskSpace 中运行测试、导出 PNG 和保存截图。

实际验证：320 组姿势、192 组持物组合通过；检查像素连通、面部不被遮挡、确定性、镜像、整数倍像素、上下文恢复与非法参数。详见 [验证结果](character-verification.json)。尚未制作完整 MV。

## 风格参考图

已下载 6 种风格，每种保留原始动画 GIF，并用 ffmpeg 无缩放提取首帧 PNG。图片均为 200×200；PNG 可以直接作为图像生成工具的参考输入，适合识别造型，不适合作为高清 MV 成片画面。

| 风格 | PNG 样式图 | 原始动作 GIF | MV 使用方向（创作建议） |
| --- | --- | --- | --- |
| 像素 | [pixel.png](styles/pixel.png) | [pixel.gif](styles/pixel.gif) | 固定角色外形，制作逐帧动作 |
| 霓虹 | [sneon.png](styles/sneon.png) | [sneon.gif](styles/sneon.gif) | 城市夜景、电子音乐段落 |
| 低多边形 | [slowpoly.png](styles/slowpoly.png) | [slowpoly.gif](styles/slowpoly.gif) | 复古游戏与空间运动 |
| 浮世绘 | [sukiyoe.png](styles/sukiyoe.png) | [sukiyoe.gif](styles/sukiyoe.gif) | 海浪、旅行与回忆场景 |
| 剪纸剪影 | [ssil.png](styles/ssil.png) | [ssil.gif](styles/ssil.gif) | 侧影与情绪化留白 |
| Frutiger Aero | [eaero.png](styles/eaero.png) | [eaero.gif](styles/eaero.gif) | 通透、明亮的复古数码画面 |

来源：[Claude Mascot Style Gallery](https://github.com/henrik-thevibe/Claude-Mascot-Style-Gallery)，[在线浏览全部风格](https://henrik-thevibe.github.io/Claude-Mascot-Style-Gallery/)。作者说明这是非官方同人作品。下载固定于提交 `14d3a0b37688de75d02379c6f9382f1c1f484ade`，原始路径 `media/{文件名}.gif`。

## 表情与动作参考

8 个原始动画 SVG 保存在 `expressions/`，可以用浏览器打开：

| 状态 | 文件 |
| --- | --- |
| 待机 | [clawd-idle-living.svg](expressions/clawd-idle-living.svg) |
| 挥手 | [clawd-waving.svg](expressions/clawd-waving.svg) |
| 跳舞 | [clawd-dancing.svg](expressions/clawd-dancing.svg) |
| 难过 | [clawd-sad.svg](expressions/clawd-sad.svg) |
| 哭泣 | [clawd-crying.svg](expressions/clawd-crying.svg) |
| 爱心 | [clawd-love.svg](expressions/clawd-love.svg) |
| 睡觉 | [clawd-sleeping.svg](expressions/clawd-sleeping.svg) |
| 行走 | [clawd-crab-walking.svg](expressions/clawd-crab-walking.svg) |

来源：[abderrahimghazali/clawd-pet](https://github.com/abderrahimghazali/clawd-pet)，[在线动作图库](https://clawd-pet.vercel.app/)。下载固定于提交 `b208f0c04a4084a17f4e5f5adf5198a752be0b36`，原始路径 `public/pets/{文件名}.svg`。

## 后续生成使用

当前像素 MV 的角色绘制统一调用 `character.js`；其他风格图仅供材质和场景参考。

GIF 用于动作参考；SVG 的 CSS 动画需要兼容的渲染环境，不能假定视频编辑器导入后会自动播放。

两份仓库的 MIT 许可证原文保存在 `licenses/`。风格图库明确说明：代码许可证不授予 Clawd 角色及 Claude 品牌的权利。本素材包不构成角色或品牌的商用授权。

## 原始下载素材检查

- 下载请求均成功；6 个 GIF、6 个 PNG、8 个 SVG 及两份许可证均非空。
- ffmpeg 成功提取全部 6 张 PNG；`file` 确认 GIF/PNG 均为 200×200，SVG 为 SVG 格式。
- 原始下载图未进行高清放大。
