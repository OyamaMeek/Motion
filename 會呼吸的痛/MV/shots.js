export const SONG_SECONDS = 273.043;
export const FPS = {pixel: 12, paper: 10, crayon: 8};

const row = (id, start, end) => ({id, start, end});
export const SHOTS = [
  row('P01', 0, 8.986), row('P02', 8.986, 18.088),
  row('L01', 18.088, 26.657), row('L02', 26.657, 35.225), row('L03', 35.225, 43.77), row('L04', 43.77, 50.225),
  row('L05', 50.225, 58.816), row('L06', 58.816, 67.315),
  row('L07', 67.315, 71.657), row('L08', 71.657, 75.929), row('L09', 75.929, 81.293), row('L10', 81.293, 84.521),
  row('L11', 84.521, 88.793), row('L12', 88.793, 93.089), row('L13', 93.089, 98.429), row('L14', 98.429, 102.702),
  row('I01', 102.702, 112.361), row('I02', 112.361, 123.066),
  row('L15', 123.066, 131.634), row('L16', 131.634, 140.225), row('L17', 140.225, 148.793), row('L18', 148.793, 155.202),
  row('L19', 155.202, 163.77), row('L20', 163.77, 172.362),
  row('L21', 172.362, 176.657), row('L22', 176.657, 180.93), row('L23', 180.93, 186.27), row('L24', 186.27, 189.498),
  row('L25', 189.498, 193.794), row('L26', 193.794, 198.066), row('L27', 198.066, 203.43), row('L28', 203.43, 210.93),
  row('L29', 210.93, 215.156), row('L30', 215.156, 219.521), row('L31', 219.521, 224.792), row('L32', 224.792, 228.09),
  row('L33', 228.09, 232.362), row('L34', 232.362, 236.658), row('L35', 236.658, 241.998), row('L36', 241.998, 250.868),
  row('L37', 250.868, SONG_SECONDS),
];

export function shotIndexAt(t) {
  const clamped = Math.min(t, SONG_SECONDS - 1e-6);
  const index = SHOTS.findIndex(s => clamped >= s.start && clamped < s.end);
  if (index < 0) throw new RangeError(`时间超出全片范围：${t}`);
  return index;
}

export function shotCaption(shot, storyboardText) {
  if (shot.id.startsWith('P')) return '前奏';
  if (shot.id.startsWith('I')) return '间奏';
  const line = storyboardText.split('\n').find(l => l.startsWith(`| ${shot.id} |`));
  if (!line) throw new RangeError(`分镜表没有 ${shot.id}`);
  return line.split('|')[3].trim();
}

export const frameTimes = fps => Array.from({length: Math.ceil(SONG_SECONDS * fps)}, (_, i) => i / fps);
