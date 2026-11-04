/* 逐帧校验：节拍对齐、角色与摄像机连续、瞬移只发生在画外、道具不挡脸且不离手。node tools_check.js */
global.window = global;
require('../data/timing.js');
const C = require('../character.js');
const M = require('../shots.js');
const FPS = 24, issues = [];
const v = (c, m = 0) => ({ x0: c.x - 960 / c.z - m, x1: c.x + 960 / c.z + m, y0: c.y - 540 / c.z - m, y1: c.y + 540 / c.z + m });
const seen = (a, c) => { const w = v(c); return a.x + 200 > w.x0 && a.x - 200 < w.x1 && a.y > w.y0 && a.y - 230 < w.y1; };
const beat = (t) => Math.min(...M.BEATS.concat(M.FREE_ACCENTS).map((b) => Math.abs(b - t)));
M.SHOTS.forEach((s) => { if (s.index && beat(s.start) > 0.001) issues.push(`${s.id} 起点不在节拍 ${s.start}`); });
let maxCam = 0, maxCrab = 0, warps = 0, prev = null, zdir = 0, zflips = 0;
const n = Math.floor(M.DUR * FPS);
for (let f = 0; f < n; f++) {
  const t = f / FPS, c = M.evalCam(t), a = M.evalActor('crab', t), m = M.evalActor('mama', t);
  const w = v(c);
  if (w.y0 < -M.SKY_TOP - 1 || w.y1 > M.SET_H + 1) issues.push(`t=${t.toFixed(2)} 摄像机超出布景 y ${w.y0.toFixed(0)}..${w.y1.toFixed(0)}`);
  if (a.prop && a.action === 'hold' && a.propScale > 0.05) {
    const L = C.layout({ facing: a.yaw, action: 'hold', prop: a.prop });
    if (L.face && L.propBox && L.propBox[0] < L.face[2] && L.propBox[2] > L.face[0] && L.propBox[1] < L.face[3] && L.propBox[3] > L.face[1]) issues.push(`t=${t.toFixed(2)} ${a.prop} 遮挡面部`);
  }
  if (prev) {
    const portal = prev.c.portal && !c.portal;
    const dc = Math.hypot(c.x - prev.c.x, c.y - prev.c.y) * c.z;
    if (!portal) { maxCam = Math.max(maxCam, dc); if (dc > (M.shotAt(t).via === 'sky' ? 145 : 60)) issues.push(`t=${t.toFixed(2)} 摄像机跳变 ${dc.toFixed(0)}px`); }
    const dz = c.z - prev.c.z;
    if (!portal && Math.abs(dz) > 0.0006) { const d = Math.sign(dz); if (zdir && d !== zdir) zflips++; zdir = d; }
    const dx = Math.abs(a.x - prev.a.x);
    if (dx > 40) {
      warps++;
      if (seen(a, c) || seen(prev.a, prev.c)) issues.push(`t=${t.toFixed(2)} 小蟹在画内瞬移 ${dx.toFixed(0)}`);
    } else maxCrab = Math.max(maxCrab, dx);
    if (Math.abs(a.yaw - prev.a.yaw) > 40 && !(dx > 40)) issues.push(`t=${t.toFixed(2)} 小蟹转向突变`);
    if (!!m !== !!prev.m && ((m && seen(m, c)) || (prev.m && seen(prev.m, prev.c)))) issues.push(`t=${t.toFixed(2)} 妈妈在画内突现或消失`);
    if (m && prev.m && Math.abs(m.x - prev.m.x) > 40 && (seen(m, c) || seen(prev.m, prev.c))) issues.push(`t=${t.toFixed(2)} 妈妈在画内瞬移`);
  }
  prev = { c, a, m };
}
const lrcShots = M.SHOTS.filter((s) => s.lrc).length;
console.log(`镜头 ${M.SHOTS.length}，歌词镜头 ${lrcShots}，帧 ${n}，单帧摄像机最大位移 ${maxCam.toFixed(1)}px，小蟹最大 ${maxCrab.toFixed(1)}px/帧，画外换位 ${warps} 次，推拉换向 ${zflips} 次`);
console.log(issues.length ? [...new Set(issues)].slice(0, 30).join('\n') + `\n问题 ${issues.length}` : '全部通过');
