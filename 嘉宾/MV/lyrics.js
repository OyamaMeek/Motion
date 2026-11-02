// 这两句之后是长空档，取人声音高实际结束的时刻（秒），见 vocal_measure.py 和 人声测量.json。
// L32 之后也有约 7 秒过渡，但音高跟踪测不到句尾，歌词保留到下一句。
const VOICE_ENDS = {16: 112.01, 46: 308.28};
const HOLD_AFTER_VOICE = 1;

export function parseLrc(text) {
  return text.trim().split('\n').map(row => {
    const m = row.match(/^\[(\d+):(\d+\.\d+)\](.+)$/);
    if (!m) throw new RangeError(`无法解析 LRC：${row}`);
    return {start: Number(m[1]) * 60 + Number(m[2]), text: m[3].trim()};
  });
}

export function lyricTimeline(text, fps) {
  const lines = parseLrc(text);
  return lines.map((line, i) => {
    const end = VOICE_ENDS[i + 1];
    const off = end === undefined ? lines[i + 1].start : end + HOLD_AFTER_VOICE;
    return {line: i + 1, text: line.text, start: line.start, onFrame: Math.round(line.start * fps), offFrame: Math.round(off * fps), clears: end !== undefined};
  });
}

export const lyricAtFrame = (timeline, frame) => timeline.find(l => frame >= l.onFrame && frame < l.offFrame) ?? null;
