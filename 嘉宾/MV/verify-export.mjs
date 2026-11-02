// 对导出的 MP4 做独立检查：ffmpeg 抽帧核对歌词时间，ebur128 与解码 PCM 核对音轨。用法：node 嘉宾/MV/verify-export.mjs
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {lyricTimeline} from './lyrics.js';
import {FPS, FRAME_COUNT} from './film.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const VIDEO = path.join(here, '輸出/嘉宾_MV.mp4');
const SONG = path.join(here, '../嘉宾.m4a');
const SHEET_DIR = path.join(here, '輸出/抽帧');
const W = 1920, BAND_TOP = 950, BAND_H = 90, MAX_FRAME_ERROR = 0.5 / FPS, MIN_CELLS_PER_CHAR = 8, MAX_VOICE_GAP = 0.6;
const CORE = [53, 46, 42], PAPER = [251, 245, 230];
const timeline = lyricTimeline(readFileSync(path.join(here, '../嘉宾.lrc'), 'utf8'), FPS);
const measured = JSON.parse(readFileSync(path.join(here, '人声测量.json'), 'utf8')).lines;

function run(cmd, args, big = false) {
  const r = spawnSync(cmd, args, {maxBuffer: big ? 2 ** 31 - 1 : 2 ** 28});
  assert.equal(r.status, 0, `${cmd} ${args.join(' ')}\n${r.stderr}`);
  return r;
}

// 歌词是墨色字写在奶油色纸条上：两种颜色紧贴的格子才算字。
function lyricCellCount(frameIndex) {
  // -ss 精确定位时取时间不早于它的第一帧，所以要落在上一帧和这一帧之间。
  const time = (Math.max(0, frameIndex - 0.25) / FPS).toFixed(4);
  const raw = run('ffmpeg', ['-v', 'error', '-ss', time, '-i', VIDEO, '-vf', `crop=${W}:${BAND_H}:0:${BAND_TOP},format=rgb24`, '-frames:v', '1', '-f', 'rawvideo', '-']).stdout;
  assert.equal(raw.length, W * BAND_H * 3, `第 ${frameIndex} 帧读取失败`);
  const near = (i, [r, g, b]) => Math.abs(raw[i] - r) < 28 && Math.abs(raw[i + 1] - g) < 28 && Math.abs(raw[i + 2] - b) < 28;
  let cells = 0;
  for (let y = 0; y < BAND_H - 3; y += 3) for (let x = 0; x < W - 3; x += 3) {
    const i = (y * W + x) * 3;
    if (near(i, CORE) && (near(i + 9, PAPER) || near(i + 3 * W * 3, PAPER))) cells++;
  }
  return cells;
}

function loudness(file) {
  const log = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', '0:a:0', '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
  const tail = log.slice(log.lastIndexOf('Summary:'));
  const value = re => Number(tail.match(re)[1]);
  return {integratedLUFS: value(/I:\s+(-?[\d.]+) LUFS/), rangeLU: value(/LRA:\s+(-?[\d.]+) LU/), truePeakDBFS: value(/Peak:\s+(-?[\d.]+) dBFS/)};
}

const pcmHash = file => createHash('sha256').update(run('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:a:0', '-f', 's16le', '-acodec', 'pcm_s16le', '-'], true).stdout).digest('hex');
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', '-count_packets', VIDEO]).stdout);
const video = probe.streams.find(s => s.codec_type === 'video'), audio = probe.streams.find(s => s.codec_type === 'audio');
assert.equal(video.width, 1920); assert.equal(video.height, 1080); assert.equal(video.r_frame_rate, `${FPS}/1`); assert.equal(Number(video.nb_read_packets), FRAME_COUNT);

const rows = [];
for (const line of timeline) {
  const before = lyricCellCount(line.onFrame - 1), at = lyricCellCount(line.onFrame), mid = lyricCellCount(Math.floor((line.onFrame + line.offFrame) / 2));
  const m = measured[line.line - 1], shownAt = line.onFrame / FPS;
  const voiceGaps = [m.pitchOnset, m.bandOnset].filter(v => v !== null).map(v => Number((v - shownAt).toFixed(3)));
  const nearestVoice = voiceGaps.reduce((a, b) => (Math.abs(b) < Math.abs(a) ? b : a));
  rows.push({line: line.line, text: line.text, lrc: line.start, frame: line.onFrame, shownAt: Number(shownAt.toFixed(3)), frameError: Number((shownAt - line.start).toFixed(3)),
    pitchOnset: m.pitchOnset, bandOnset: m.bandOnset, nearestVoice, offAt: Number((line.offFrame / FPS).toFixed(3)), cellsBefore: before, cellsAt: at, cellsMid: mid});
  assert.ok(Math.abs(shownAt - line.start) <= MAX_FRAME_ERROR + 1e-3, `L${line.line} 时间误差`);
  const required = [...line.text].filter(c => c.trim()).length * MIN_CELLS_PER_CHAR;
  assert.ok(at > required, `L${line.line} 第 ${line.onFrame} 帧没有歌词：${at}`);
  assert.ok(mid > required, `L${line.line} 中段没有歌词：${mid}`);
  // 上一句和这一句的字不同，切换帧的上一帧也有字，所以只比较内容变化时的前后帧。
  if (line.line === 1 || timeline[line.line - 2].clears) assert.ok(before < required, `L${line.line} 前一帧已有歌词：${before}`);
}

// 空档中段不应检测到歌词，否则上面的计数也不足为证。
const gaps = [[0, timeline[0].onFrame], [timeline[15].offFrame, timeline[16].onFrame], [timeline[45].offFrame, FRAME_COUNT]].map(([a, b]) => {
  const frame = Math.floor((a + b) / 2);
  return {from: a / FPS, to: b / FPS, frame, cells: lyricCellCount(frame)};
});
for (const gap of gaps) assert.ok(gap.cells < 5 * MIN_CELLS_PER_CHAR, `第 ${gap.frame} 帧仍有歌词：${gap.cells}`);

mkdirSync(SHEET_DIR, {recursive: true});
const frames = timeline.map(l => `eq(n\\,${l.onFrame})`).join('+');
run('ffmpeg', ['-y', '-v', 'error', '-i', VIDEO, '-vf', `select='${frames}',scale=480:270,tile=6x8:padding=4`, '-frames:v', '1', '-fps_mode', 'passthrough', '-q:v', '3', path.join(SHEET_DIR, '每句起点.jpg')]);
const every = Math.floor(FRAME_COUNT / 48);
run('ffmpeg', ['-y', '-v', 'error', '-i', VIDEO, '-vf', `select='not(mod(n\\,${every}))',scale=480:270,tile=6x8:padding=4`, '-frames:v', '1', '-fps_mode', 'passthrough', '-q:v', '3', path.join(SHEET_DIR, '全片取样.jpg')]);

const original = loudness(SONG), exported = loudness(VIDEO);
const originalHash = pcmHash(SONG), exportedHash = pcmHash(VIDEO);
const report = {video: {width: video.width, height: video.height, fps: video.r_frame_rate, frames: Number(video.nb_read_packets), codec: video.codec_name, pix_fmt: video.pix_fmt, duration: Number(video.duration)},
  audio: {codec: audio.codec_name, sampleRate: Number(audio.sample_rate), channels: audio.channels, duration: Number(audio.duration), startTime: Number(audio.start_time)},
  sizeMB: Number((Number(probe.format.size) / 1048576).toFixed(1)), loudness: {original, exported, integratedDiffLU: Number((exported.integratedLUFS - original.integratedLUFS).toFixed(2))},
  pcm: {original: originalHash, exported: exportedHash, identical: originalHash === exportedHash}, lyrics: rows, lyricFreeGaps: gaps};
writeFileSync(path.join(here, '輸出/导出检查.json'), JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify({video: report.video, audio: report.audio, sizeMB: report.sizeMB, loudness: report.loudness, pcmIdentical: report.pcm.identical, lyricFreeGaps: gaps}, null, 1));
for (const r of rows) console.log(`L${String(r.line).padStart(2, '0')} lrc=${r.lrc.toFixed(2)} shown=${r.shownAt.toFixed(3)} err=${r.frameError} voice=${r.nearestVoice} off=${r.offAt} cells ${r.cellsBefore}->${r.cellsAt}/${r.cellsMid}`);
const far = rows.filter(r => Math.abs(r.nearestVoice) > MAX_VOICE_GAP).map(r => r.line);
console.log(`人声估计与歌词相差超过 ${MAX_VOICE_GAP} 秒的句子：${far.join(', ') || '无'}`);
assert.equal(Math.abs(report.loudness.integratedDiffLU) <= 0.05, true);
assert.equal(report.pcm.identical, true);
