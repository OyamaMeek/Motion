// 导出拉伸、剪辑后的 bgm 单轨（未混合成配乐），供 check-bgm-grid.py 检查拍点是否落在成片的拍格上。
// 用法：node export-bgm-stem.mjs 输出路径.wav
import {writeFileSync} from 'node:fs';
import {loadBgm, toWav} from './music.mjs';

writeFileSync(process.argv[2], toWav(loadBgm()));
