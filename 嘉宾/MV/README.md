# 《嘉宾》MV 工程

HyperFrames 工程，时间和内容依据已确认的 [storyboard.md](../storyboard.md)。当前阶段：图像分镜，等待确认；每镜全程停在关键画面，还没有运动。

- 图像分镜：[boards/storyboard.html](boards/storyboard.html)，总览 [boards/总览.jpg](boards/总览.jpg)。
- `kit.js`：纸艺绘制与角色几何；`sets.js`：场景和物件；`poses.js`：52 个关键画面；`main.js`：按 `hf-seek` 时间绘制。
- `shots.js` 由 `gen-shots.mjs` 从分镜生成，`boards/storyboard.html` 由 `gen-board.mjs` 生成。
- `lib/character.js` 和 `lib/song.m4a` 是符号链接，指向 `assets/clawd/character.js` 和 `嘉宾/嘉宾.m4a`，音频不提交。

```bash
node --test 嘉宾/MV/stage.test.mjs
```

```bash
hyperframes check 嘉宾/MV
```
