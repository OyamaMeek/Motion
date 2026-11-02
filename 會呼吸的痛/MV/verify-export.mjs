// 对导出的 MP4 做独立检查：ffmpeg 抽帧核对歌词时间，ebur128 与解码 PCM 核对音轨。
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {lyricTimeline} from './lyrics.js';
import {FPS as STYLE_FPS, SONG_SECONDS} from './shots.js';
import {OUTPUTS} from './outputs.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const style = STYLE_FPS[args[0]] ? args.shift() : 'pixel';
const output = OUTPUTS[style];
const VIDEO = path.join(here, '輸出', output.video);
const SONG = path.join(here, '../會呼吸的痛.m4a');
const SHEET_DIR = args[0] ? path.resolve(args[0]) : path.join(here, '輸出', output.sheets);
const FPS = STYLE_FPS[style], FRAMES = Math.ceil(SONG_SECONDS * FPS), W = 1920, BAND_TOP = 880, BAND_H = 150, MAX_FRAME_ERROR = 0.5 / FPS, MIN_CELLS_PER_CHAR = 15;
const timeline = lyricTimeline(readFileSync(path.join(here, '../會呼吸的痛.lrc'), 'utf8'), JSON.parse(readFileSync(path.join(here, '人聲測量.json'), 'utf8')), FPS);
const measured = JSON.parse(readFileSync(path.join(here, '人聲測量.json'), 'utf8')).lines;

function run(cmd, args, big = false) {
  const r = spawnSync(cmd, args, {maxBuffer: big ? 2 ** 31 - 1 : 2 ** 28});
  assert.equal(r.status, 0, `${cmd} ${args.join(' ')}\n${r.stderr}`);
  return r;
}

// 歌词字芯和描边各是一种固定颜色：两者紧贴的像素才算字。
function lyricCellCount(frameIndex) {
  const raw = run('ffmpeg', ['-v', 'error', '-i', VIDEO, '-vf', `select=eq(n\\,${frameIndex}),crop=${W}:${BAND_H}:0:${BAND_TOP},format=rgb24`, '-frames:v', '1', '-f', 'rawvideo', '-']).stdout;
  assert.equal(raw.length, W * BAND_H * 3, `第 ${frameIndex} 帧读取失败`);
  const near = (i, r, g, b) => Math.abs(raw[i] - r) < 28 && Math.abs(raw[i + 1] - g) < 28 && Math.abs(raw[i + 2] - b) < 28;
  let cells = 0;
  for (let y = 0; y < BAND_H - 3; y += 3) for (let x = 0; x < W - 3; x += 3) {
    const i = (y * W + x) * 3;
    if (near(i, ...output.core) && near(i + 9, ...output.rim)) cells++;
  }
  return cells;
}

function loudness(file, map) {
  const log = run('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-map', map, '-af', 'ebur128=peak=true', '-f', 'null', '-']).stderr.toString();
  const tail = log.slice(log.lastIndexOf('Summary:'));
  const value = re => Number(tail.match(re)[1]);
  return {integratedLUFS: value(/I:\s+(-?[\d.]+) LUFS/), rangeLU: value(/LRA:\s+(-?[\d.]+) LU/), truePeakDBFS: value(/Peak:\s+(-?[\d.]+) dBFS/)};
}

const pcmHash = (file, map) => createHash('sha256').update(run('ffmpeg', ['-v', 'error', '-i', file, '-map', map, '-f', 's16le', '-acodec', 'pcm_s16le', '-'], true).stdout).digest('hex');
const probe = JSON.parse(run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', '-count_packets', VIDEO]).stdout);
const video = probe.streams.find(s => s.codec_type === 'video'), audio = probe.streams.find(s => s.codec_type === 'audio');
assert.equal(video.width, 1920); assert.equal(video.height, 1080); assert.equal(video.r_frame_rate, `${FPS}/1`); assert.equal(Number(video.nb_read_packets), FRAMES);

const rows = [];
for (const line of timeline) {
  const before = lyricCellCount(line.onFrame - 1), at = lyricCellCount(line.onFrame), mid = lyricCellCount(Math.floor((line.onFrame + line.offFrame) / 2));
  const m = measured[line.line - 1];
  rows.push({line: line.line, text: line.text, lrc: line.start, frame: line.onFrame, shownAt: Number((line.onFrame / FPS).toFixed(3)),
    frameError: Number((line.onFrame / FPS - line.start).toFixed(3)), pitchOnset: m.pitchOnset, leadBeforeVoice: m.offset, offAt: Number((line.offFrame / FPS).toFixed(3)),
    cellsBefore: before, cellsAt: at, cellsMid: mid});
  assert.ok(Math.abs(rows.at(-1).frameError) <= MAX_FRAME_ERROR + 1e-3, `L${line.line} 时间误差`);
  const required = [...line.text].filter(c => c.trim()).length * MIN_CELLS_PER_CHAR;
  assert.ok(at > required, `L${line.line} 第 ${line.onFrame} 帧没有歌词：${at}`);
  assert.ok(mid > required, `L${line.line} 中段没有歌词`);
}

// 长空档的中段不应检测到歌词，否则上面的计数也不足为证。
const gaps = timeline.filter(l => l.clears).map((l, i) => {
  const next = timeline[timeline.indexOf(l) + 1]?.onFrame ?? FRAMES;
  const frame = Math.floor((l.offFrame + next) / 2);
  return {afterLine: l.line, frame, cells: lyricCellCount(frame)};
});
for (const gap of gaps) assert.ok(gap.cells < 5 * MIN_CELLS_PER_CHAR, `L${gap.afterLine} 之后的空档第 ${gap.frame} 帧仍有歌词：${gap.cells}`);

mkdirSync(SHEET_DIR, {recursive: true});
const frames = timeline.map(l => `eq(n\\,${l.onFrame})`).join('+');
run('ffmpeg', ['-y', '-v', 'error', '-i', VIDEO, '-vf', `select='${frames}',scale=480:270:flags=neighbor,tile=6x7:padding=4`, '-frames:v', '1', '-fps_mode', 'passthrough', path.join(SHEET_DIR, '每句起點.png')]);
const every = Math.floor(FRAMES / 30);
run('ffmpeg', ['-y', '-v', 'error', '-i', VIDEO, '-vf', `select='not(mod(n\\,${every}))',scale=480:270,tile=6x5:padding=4`, '-frames:v', '1', '-fps_mode', 'passthrough', path.join(SHEET_DIR, '全片取樣.png')]);

const original = loudness(SONG, '0:a:0'), exported = loudness(VIDEO, '0:a:0');
const originalHash = pcmHash(SONG, '0:a:0'), exportedHash = pcmHash(VIDEO, '0:a:0');
const report = {video: {width: video.width, height: video.height, fps: video.r_frame_rate, frames: Number(video.nb_read_packets), codec: video.codec_name, pix_fmt: video.pix_fmt, duration: Number(video.duration)},
  audio: {codec: audio.codec_name, sampleRate: Number(audio.sample_rate), channels: audio.channels, duration: Number(audio.duration), startTime: Number(audio.start_time)},
  sizeMB: Number((Number(probe.format.size) / 1048576).toFixed(1)), loudness: {original, exported, integratedDiffLU: Number((exported.integratedLUFS - original.integratedLUFS).toFixed(2))},
  pcm: {original: originalHash, exported: exportedHash, identical: originalHash === exportedHash}, lyrics: rows, lyricFreeGaps: gaps};
writeFileSync(path.join(here, '輸出', output.exportReport), JSON.stringify(report, null, 1) + '\n');
console.log(JSON.stringify({video: report.video, audio: report.audio, sizeMB: report.sizeMB, loudness: report.loudness, pcmIdentical: report.pcm.identical}, null, 1));
for (const r of rows) console.log(`L${String(r.line).padStart(2, '0')} lrc=${r.lrc.toFixed(2)} shown=${r.shownAt.toFixed(3)} err=${r.frameError} pitch=${r.pitchOnset} off=${r.offAt} cells ${r.cellsBefore}->${r.cellsAt}/${r.cellsMid}`);
assert.equal(Math.abs(report.loudness.integratedDiffLU) <= 0.05, true);
assert.equal(report.pcm.identical, true);
