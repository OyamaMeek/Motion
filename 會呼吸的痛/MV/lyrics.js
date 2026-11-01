// 这四句之后是长空档，自动测量会把伴奏算进去；取人声音高实际结束的时刻（秒）。
const TAIL_ENDS = {14: 100.98, 28: 205.98, 36: 246.9, 37: 257.5};
const HOLD_AFTER_VOICE = 1;
const MIN_GAP_TO_CLEAR = 2;
const MAX_ONSET_ERROR = 0.6;
const FADE_FRAMES = 3;

export function parseLrc(text) {
  return text.trim().split('\n').map(row => {
    const m = row.match(/^\[(\d+):(\d+\.\d+)\](.+)$/);
    if (!m) throw new RangeError(`无法解析 LRC：${row}`);
    return {start: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim()};
  });
}

export function lyricTimeline(lrcText, measured, fps) {
  const lines = parseLrc(lrcText);
  if (measured.lines.length !== lines.length) throw new RangeError('人声测量与 LRC 行数不一致');
  return lines.map((line, i) => {
    const m = measured.lines[i], next = lines[i + 1]?.start ?? m.nextLrc;
    const voiceEnd = TAIL_ENDS[i + 1] ?? (Math.abs(m.offset ?? Infinity) <= MAX_ONSET_ERROR ? m.pitchEnd : null);
    const clears = voiceEnd !== null && next - voiceEnd >= MIN_GAP_TO_CLEAR;
    const off = clears ? voiceEnd + HOLD_AFTER_VOICE : next;
    return {line: i + 1, text: line.text, start: line.start, onFrame: Math.round(line.start * fps), offFrame: Math.round(off * fps), clears};
  });
}

export function lyricAtFrame(timeline, frame) {
  const line = timeline.find(l => frame >= l.onFrame && frame < l.offFrame);
  if (!line) return null;
  const left = line.offFrame - frame;
  return {text: line.text, line: line.line, fade: line.clears && left <= FADE_FRAMES ? left / (FADE_FRAMES + 1) : 1};
}
