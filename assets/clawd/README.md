# Clawd 小螃蟹 MV 参考素材

收集日期：2026-11-01（Asia/Taipei）。本目录收录社区创作的角色与风格参考，供后续选定造型及生成 MV 使用。

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

建议先选定一张角色主参考，后续镜头持续附上同一张图，并固定身体比例、眼睛位置、肢体数量与主色；其他风格图用于说明画面材质。上述为制作建议，尚未执行图像或视频生成，也未验证跨镜头角色一致性。

GIF 用于动作参考；SVG 的 CSS 动画需要兼容的渲染环境，不能假定视频编辑器导入后会自动播放。

两份仓库的 MIT 许可证原文保存在 `licenses/`。风格图库明确说明：代码许可证不授予 Clawd 角色及 Claude 品牌的权利。本素材包不构成角色或品牌的商用授权。

## 已完成的文件检查

- 下载请求均成功；6 个 GIF、6 个 PNG、8 个 SVG 及两份许可证均非空。
- ffmpeg 成功提取全部 6 张 PNG；`file` 确认 GIF/PNG 均为 200×200，SVG 为 SVG 格式。
- 未进行高清放大、角色三视图制作或 MV 渲染。
