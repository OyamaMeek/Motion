# 《嘉宾》MV 工程

时间和内容依据已确认的 [storyboard.md](../storyboard.md)。成片是 `輸出/嘉宾_MV.mp4`：1920×1080、30 fps，纸片每秒更新 10 次，音轨直接复制 `嘉宾.m4a`。MP4 只留本地，不提交。

- `shots.js` 由 `gen-shots.mjs` 从分镜生成，是时间的唯一来源；`film.js` 把时间换算成镜头、镜内时间和衔接进度。
- `kit.js`：纸艺绘制与角色几何；`sets.js`：场景和物件；`poses.js`：52 个镜头的动作和相机；`covers.js`：实物遮挡和撕开。
- `main.js` 把背景、角色、道具和遮挡物画在同一张画布上，同一台相机；歌词（`lyrics.js`，来自 `lib/song.lrc`）最后画在最上层，不经过相机。
- `render-film.mjs`：多个无头 Chrome 分段渲染，拼接后混入原曲。中断后重新运行，已完成的分段不重画。
- `verify-export.mjs`：ffmpeg 抽帧核对歌词时间，测量响度，比较解码后的 PCM。
- `vocal_measure.py`：从原曲估计每句人声起点，结果在 `人声测量.json`。
- 图像分镜：[boards/storyboard.html](boards/storyboard.html)，总览图 [boards/storyboard.png](boards/storyboard.png)，定格由 `export-stills.sh` 导出。
- `lib/` 里是符号链接，指向 `assets/clawd/character.js`、`嘉宾/嘉宾.m4a` 和 `嘉宾/嘉宾.lrc`；音频和歌词不提交。

```bash
node --test 嘉宾/MV/stage.test.mjs
```

```bash
node --test 嘉宾/MV/film.test.mjs
```

```bash
node 嘉宾/MV/render-film.mjs
```

```bash
node 嘉宾/MV/verify-export.mjs
```
