/*
 * scenes.js: 在同一张 p5 WEBGL 画布上画布景、角色、道具，全部共用一个摄像机矩阵。
 * 静态布景只用 p5.brush 烘焙一次到同画布的离屏缓冲，动态物与角色逐帧用笔刷绘制。
 */
(function (root) {
  const C = root.Clawdbot, M = root.MV;
  const { OX, SET_W, SET_H, GROUND, PORTAL, lerp, clamp, smooth } = M;
  const W = 1920, H = 1080;
  const baked = {};
  const seedFor = { A: 11, B: 22, C: 33, D: 44, P: 55, E: 66, F: 77 };

  /* ---------- 笔刷工具 ---------- */
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const line = (x0, y0, x1, y1, col, w) => { brush.set('crayon', col, w || 1); brush.line(x0, y0, x1, y1); };
  const curve = (pts, col, w, k) => C.stroke(pts, col, w, k);
  const shape = (pts, fill, ln, w, hatch) => C.blob(pts, fill, ln, w, hatch);
  const box = (x, y, w, h, fill, ln, lw, hatch) => {
    shape([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill, null, 1, hatch);
    if (ln) {
      line(x, y, x + w, y + 1, ln, lw);
      line(x + w, y, x + w - 1, y + h, ln, lw);
      line(x + w, y + h, x, y + h - 1, ln, lw);
      line(x, y + h, x + 1, y, ln, lw);
    }
  };
  const oval = (x, y, rx, ry, fill, ln, lw, hatch) => shape(C.ellipsePts(x, y, rx, ry, 0, 20), fill, ln, lw, hatch);
  const shift = (hex, d) => {
    const n = parseInt(hex.slice(1), 16);
    const c = (v) => clamp(v + d, 0, 255).toString(16).padStart(2, '0');
    return '#' + c((n >> 16) & 255) + c((n >> 8) & 255) + c(n & 255);
  };
  /* 先铺实色，再用宽蜡笔同色系来回横涂，色块边缘被笔触咬出毛边 */
  function wash(x0, x1, y0, y1, col, r, density) {
    C.blob([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], col, null);
    const step = (density || 34) + 14;
    for (let y = y0 - 8; y < y1 + 8; y += step) {
      let x = x0 - 30;
      while (x < x1) {
        const len = 420 + r() * 700;
        brush.set('crayonWide', r() > 0.45 ? shift(col, -4) : shift(col, 6), 1.05 + r() * 0.6);
        brush.line(Math.max(x, x0), y + r() * 14, Math.min(x + len, x1), y + r() * 18 - 5);
        x += len * (0.86 + r() * 0.34);
      }
    }
  }
  function paper(pg, tone) {
    pg.background(tone);
  }
  /* 云先铺一块浅色，再用白蜡笔扫几下 */
  function clouds(r, list, col) {
    list.forEach(([x, y, s]) => {
      const pts = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        pts.push([x + Math.cos(a) * 170 * s * (0.86 + r() * 0.28), y + Math.sin(a) * 46 * s * (0.8 + r() * 0.4)]);
      }
      C.blob(pts, col, null);
      for (let i = 0; i < 3; i++) {
        brush.set('crayon', shift(col, -14), 0.8);
        brush.line(x - 110 * s, y - 14 * s + i * 14 * s, x + 110 * s, y - 14 * s + i * 14 * s + r() * 6);
      }
    });
  }
  /* 所有布景顶部共用的纸面天空，摄像机上摇后从这里横穿，接缝看不出来 */
  function sharedSky(r, offset) {
    wash(0, SET_W, -M.SKY_TOP, 660, '#f5dcb8', r, 44);
    const list = [[260, 170, 1.6], [980, 300, 1.2], [1720, 140, 1.7], [2520, 300, 1.3], [3100, 190, 1.4], [600, -260, 1.5], [1500, -140, 1.2], [2400, -320, 1.6]];
    clouds(r, list, '#fff6e6');
  }

  /* ---------- 七个布景 ---------- */
  const SETS = {
    A(r) { /* 东京塔观景台，黄昏 */
      sharedSky(r);
      wash(0, SET_W, 620, 880, '#f6c8a0', r);
      wash(0, SET_W, 860, 1100, '#e9b6b8', r);
      wash(0, SET_W, 1080, 1330, '#c8b3d3', r);
      clouds(r, [[500, 800, 1.4], [1500, 900, 1.2], [2700, 760, 1.5]], '#fbe6d0');
      /* 东京塔 */
      const tx = 1960, top = 800, base = 1330;
      const seg = 7;
      for (let i = 0; i < seg; i++) {
        const y0 = lerp(top, base, i / seg), y1 = lerp(top, base, (i + 1) / seg);
        const w0 = lerp(10, 170, Math.pow(i / seg, 1.5)), w1 = lerp(10, 170, Math.pow((i + 1) / seg, 1.5));
        const col = i % 2 ? '#f6efe0' : '#d9482f';
        shape([[tx - w0, y0], [tx + w0, y0], [tx + w1, y1], [tx - w1, y1]], col, '#7c2a1e', 1.1, i % 2 ? null : '#b83420');
        line(tx - w0, y0, tx + w1, y1, '#7c2a1e', 0.7);
        line(tx + w0, y0, tx - w1, y1, '#7c2a1e', 0.7);
      }
      box(tx - 66, 1058, 132, 22, '#f6efe0', '#7c2a1e', 1);
      /* 城市 */
      let x = -30;
      while (x < SET_W) {
        const w = 60 + r() * 130, h = 60 + r() * 170;
        box(x, 1340 - h, w, h + 80, r() > 0.5 ? '#a596bd' : '#b6a4c4', '#6d5d86', 0.8);
        for (let i = 0; i < 5; i++) C.scribble(x + 12 + r() * (w - 24), 1350 - h + 12 + r() * (h - 18), 4, '#fff0a8', 0.9);
        x += w - 6;
      }
      box(0, 1400, SET_W, 200, '#8d80a8', null);
      for (let i = 0; i < 90; i++) C.scribble(r() * SET_W, 1405 + r() * 90, 4, r() > 0.4 ? '#ffe892' : '#ffc27a', 0.9);
      /* 观景台 */
      box(0, GROUND - 40, SET_W, SET_H - GROUND + 40, '#e6d8bf', '#7a6444', 1.2, '#cdbd9f');
      line(0, GROUND - 180, SET_W, GROUND - 180, '#5d4d3e', 2);
      line(0, GROUND - 110, SET_W, GROUND - 110, '#5d4d3e', 1.2);
      for (let px = 40; px < SET_W; px += 200) line(px, GROUND - 180, px + r() * 5, GROUND - 40, '#5d4d3e', 1.5);
    },
    B(r) { /* 东京旅馆房间，淡紫墙 */
      sharedSky(r);
      box(0, 660, SET_W, GROUND - 620, '#dcd4e4', '#6c5f7a', 1.2);
      wash(0, SET_W, 680, GROUND - 30, '#cdc3dc', r, 46);
      box(0, GROUND - 20, SET_W, SET_H, '#d9b98f', '#6d5033', 1.2, '#b9925f');
      for (let i = 1; i < 6; i++) line(0, GROUND + i * 62, SET_W, GROUND + i * 62, '#a07c50', 0.8);
      /* 窗 */
      box(380, 800, 660, 500, '#f5c7a6', '#5f4d3b', 2.2);
      wash(390, 1030, 810, 1040, '#f5c7a6', r);
      wash(390, 1030, 1040, 1280, '#cdb3d2', r, 40);
      for (let i = 0; i < 4; i++) {
        const y0 = 930 + i * 60, y1 = y0 + 60, w0 = 6 + i * 13, w1 = 6 + (i + 1) * 13;
        shape([[840 - w0, y0], [840 + w0, y0], [840 + w1, y1], [840 - w1, y1]], i % 2 ? '#f6efe0' : '#d9482f', '#7c2a1e', 0.8);
      }
      for (let i = 0; i < 26; i++) C.scribble(400 + r() * 620, 1200 + r() * 90, 3.5, '#ffe892', 0.8);
      line(710, 800, 710, 1300, '#5f4d3b', 1.6);
      line(380, 1050, 1040, 1050, '#5f4d3b', 1.6);
      shape([[340, 770], [460, 770], [420, 1340], [320, 1340]], '#b9a6c9', '#6c5f7a', 1, '#a08fb5');
      shape([[960, 770], [1080, 770], [1100, 1340], [1000, 1340]], '#b9a6c9', '#6c5f7a', 1, '#a08fb5');
      /* 床 */
      box(1090, 1330, 620, 230, '#f4ead4', '#7a6444', 1.6, '#dfcfae');
      box(1090, 1420, 620, 140, '#a9bfcf', '#546a7c', 1.3, '#8aa3b6');
      box(1090, 1240, 40, 320, '#8c6a46', '#553d27', 1.3);
      box(1670, 1240, 40, 320, '#8c6a46', '#553d27', 1.3);
      /* 台灯 */
      box(1880, 1400, 300, 160, '#a9825a', '#553d27', 1.4);
      line(2030, 1400, 2030, 1290, '#553d27', 1.5);
      shape([[1960, 1290], [2100, 1290], [2070, 1190], [1990, 1190]], '#fbe29a', '#a3792b', 1.2, '#f2c965');
      /* 房门，开着，通向下一布景的码头 */
      box(2880, 1000, 320, GROUND - 980, '#fbe9cd', '#553d27', 2.2);
      shape([[2640, 1020], [2880, 1000], [2880, GROUND - 16], [2640, GROUND - 8]], '#a8855f', '#553d27', 1.6, '#8e6c49');
      C.scribble(2680, 1300, 10, '#eac65a', 1);
    },
    C(r) { /* 码头、海 */
      sharedSky(r);
      wash(0, SET_W, 640, 1000, '#cfe6ef', r);
      wash(0, SET_W, 980, 1150, '#f4e8d0', r);
      clouds(r, [[400, 820, 1.5], [1300, 900, 1.2], [2300, 800, 1.5]], '#fffdf2');
      box(0, 1150, SET_W, SET_H, '#7fbcd2', null);
      wash(0, SET_W, 1160, SET_H, '#6aa8c6', r, 46);
      for (let i = 0; i < 55; i++) {
        const x = r() * SET_W, y = 1180 + r() * 680;
        curve([[x, y], [x + 34, y - 10], [x + 68, y], [x + 102, y - 8]], '#e7f4f6', 0.9);
      }
      /* 码头 */
      box(0, GROUND - 14, 760, 60, '#a57f55', '#553d27', 1.5, '#7f5f3d');
      for (let px = 40; px < 760; px += 140) box(px, GROUND + 40, 26, 260, '#7f5f3d', '#553d27', 1);
      /* 对岸沙滩 */
      shape([[2640, 1320], [SET_W + 10, 1320], [SET_W + 10, SET_H], [2500, SET_H], [2560, 1540]], '#f0d9a8', null, 1, '#dec08a');
      curve([[2500, SET_H], [2560, 1540], [2640, 1320]], '#a98d5c', 1.2, 0.3);
      line(2640, 1320, SET_W + 10, 1320, '#a98d5c', 1.2);
    },
    D(r) { /* 海滩小屋外 */
      sharedSky(r);
      wash(0, SET_W, 640, 1000, '#cfe6ef', r);
      wash(0, SET_W, 980, 1150, '#f4e8d0', r);
      clouds(r, [[300, 760, 1.3], [1000, 880, 1.1], [2600, 800, 1.5]], '#fffdf2');
      box(0, 1150, SET_W, 260, '#7fbcd2', null);
      wash(0, SET_W, 1160, 1390, '#6aa8c6', r, 46);
      box(-10, 1320, SET_W + 20, SET_H, '#f0d9a8', null, 1, '#dec08a');
      line(-10, 1320, SET_W + 10, 1320, '#a98d5c', 1.2);
      /* 小屋 */
      box(850, 1040, 1000, 520, '#f6e6c8', '#6e5238', 2, '#e6d1a8');
      shape([[790, 1060], [1350, 760], [1910, 1060]], '#c9644a', '#6e3a2c', 2, '#a94e38');
      box(900, 1220, 200, 340, '#8c6a46', '#553d27', 2, '#73553a');
      C.scribble(1070, 1400, 9, '#eac65a', 1);
      /* 亮着灯的窗（穿窗入口），框子画在动态层 */
      box(1560 + 90, 1160, 150, 150, '#f3d7a2', '#6e5238', 1.6);
      for (let i = 0; i < 7; i++) oval(2200 + i * 150, 1560 + (i % 2) * 80, 18, 10, '#d7bb86', '#9d7f4f', 0.8);
    },
    P(r) { /* 回忆：整片暖黄，沙堡、门廊、木桩、远方城市 */
      sharedSky(r);
      wash(0, SET_W, 640, 1000, '#f5deaa', r);
      wash(0, SET_W, 980, 1160, '#f7e6be', r);
      clouds(r, [[400, 800, 1.4], [1500, 860, 1.2], [2600, 780, 1.4]], '#fff4d8');
      box(0, 1150, SET_W, 260, '#d7c384', null);
      wash(0, SET_W, 1160, 1390, '#c8b172', r, 46);
      box(-10, 1320, SET_W + 20, SET_H, '#ecd498', null, 1, '#d8bb78');
      line(-10, 1320, SET_W + 10, 1320, '#a78a50', 1.2);
      /* 门廊 */
      box(0, 980, 560, 580, '#e7cda0', '#6e5238', 2, '#d4b681');
      box(160, 1220, 180, 340, '#9c7a50', '#553d27', 1.8);
      shape([[-40, 1000], [620, 1000], [520, 900], [-40, 900]], '#b86a3f', '#6e3a2c', 1.8, '#9b5430');
      /* 木桩 */
      box(1400, 1290, 60, 270, '#8a6a42', '#553d27', 1.6, '#6f5233');
      /* 远方城市（右端） */
      let x = 2440;
      while (x < SET_W) {
        const w = 90 + r() * 90, h = 180 + r() * 280;
        box(x, 1320 - h, w, h, r() > 0.5 ? '#d3b98a' : '#c7ab7a', '#7e6540', 0.9);
        for (let i = 0; i < 4; i++) C.scribble(x + 12 + r() * (w - 24), 1330 - h + r() * (h - 20), 5, '#fff2b8', 0.9);
        x += w - 4;
      }
    },
    E(r) { /* 家，妈妈不在了 */
      sharedSky(r);
      box(0, 660, SET_W, GROUND - 620, '#f4e6cb', '#6e5238', 1.3);
      wash(0, SET_W, 680, GROUND - 30, '#ecd9b6', r, 48);
      box(0, GROUND - 20, SET_W, SET_H, '#caa374', '#6d5033', 1.2, '#ab8455');
      for (let i = 1; i < 6; i++) line(0, GROUND + i * 62, SET_W, GROUND + i * 62, '#8f6c43', 0.8);
      /* 架子 */
      box(380, 1010, 520, 22, '#8c6a46', '#553d27', 1.4);
      box(460, 900, 110, 110, '#fff8e6', '#7a6444', 1.4);
      oval(495, 955, 22, 20, C.PALETTE.mama.body, null);
      oval(535, 965, 15, 13, C.PALETTE.clawdbot.body, null);
      box(660, 940, 80, 70, '#d9e3e6', '#566d78', 1.3);
      curve([[740, 950], [770, 970], [740, 992]], '#566d78', 1.2);
      box(790, 960, 72, 50, '#c7a06a', '#553d27', 1);
      /* 窗 */
      box(1780, 840, 420, 340, '#cfe6ef', '#6e5238', 2);
      wash(1790, 2190, 850, 1170, '#d9ecef', r, 40);
      line(1990, 840, 1990, 1180, '#6e5238', 1.5);
      /* 小桌和杯子 */
      box(2080, 1370, 300, 190, '#a9825a', '#553d27', 1.4);
      box(2180, 1310, 76, 60, '#efe3cc', '#7a6444', 1.2);
      /* 拖鞋 */
      oval(1690, GROUND + 40, 42, 20, '#c98f4a', '#6e5238', 1);
      oval(1770, GROUND + 58, 42, 20, '#c98f4a', '#6e5238', 1);
      /* 信盒，一进门就在 */
      box(670, GROUND - 80, 220, 96, '#b9834a', '#241812', 1.3);
      for (let i = 0; i < 4; i++) box(688 + i * 44, GROUND - 102 + (i % 2) * 8, 66, 40, '#fbf4dc', '#241812', 0.8);
      /* 门，开向海滩 */
      box(2880, 1000, 320, GROUND - 980, '#fff2d8', '#553d27', 2.2);
      shape([[2640, 1020], [2880, 1000], [2880, GROUND - 16], [2640, GROUND - 8]], '#9c7a50', '#553d27', 1.6, '#826240');
      C.scribble(2680, 1300, 10, '#eac65a', 1);
    },
    F(r) { /* 清晨海边 */
      sharedSky(r);
      wash(0, SET_W, 620, 900, '#fbd7c0', r);
      wash(0, SET_W, 880, 1110, '#fdeccf', r);
      clouds(r, [[600, 760, 1.5], [1500, 880, 1.1], [2600, 740, 1.5]], '#fff8ea');
      /* 海平线上极小的塔，呼应开场 */
      const tx = 2720;
      shape([[tx - 2, 1000], [tx + 2, 1000], [tx + 16, 1120], [tx - 16, 1120]], '#d9482f', '#7c2a1e', 0.8);
      box(tx - 9, 1050, 18, 6, '#f6efe0', null);
      box(0, 1115, SET_W, 300, '#9dcad6', null);
      wash(0, SET_W, 1120, 1390, '#87bccd', r, 44);
      for (let i = 0; i < 36; i++) {
        const x = r() * SET_W, y = 1140 + r() * 220;
        curve([[x, y], [x + 40, y - 8], [x + 80, y]], '#f1fafb', 0.8);
      }
      box(-10, 1370, SET_W + 20, SET_H, '#f4dfb4', null, 1, '#e3c893');
      line(-10, 1370, SET_W + 10, 1370, '#a98d5c', 1.2);
      /* 从门口往外的一串脚印 */
      for (let i = 0; i < 7; i++) oval(30 + i * 62, GROUND + 26 + (i % 2) * 24, 12, 7, '#d8bb88', null);
      /* 沙冢，围巾披在上面 */
      shape([[1490, GROUND + 10], [1520, 1450], [1610, 1400], [1720, 1430], [1790, GROUND + 10]], '#e3c893', '#8a6f42', 1.6, '#cfae72');
      shape([[1540, 1440], [1730, 1450], [1716, 1486], [1540, 1484]], C.PALETTE.mama.scarf, C.PALETTE.mama.scarf2, 1.2, C.PALETTE.mama.scarf2);
      shape([[1640, 1484], [1680, 1484], [1690, 1540], [1640, 1540]], C.PALETTE.mama.scarf, C.PALETTE.mama.scarf2, 1.2, C.PALETTE.mama.scarf2);
      /* 大贝壳（第 38 镜的藏身处，提前立在沙滩上） */
      shape(C.ellipsePts(2000, 1440, 190, 150, 0, 22), '#f4dec2', '#8a6a4a', 2, '#dcbb95');
      for (let i = -4; i <= 4; i++) line(2000, 1590, 2000 + i * 46, 1300 + Math.abs(i) * 20, '#b98c62', 1);
    },
  };

  function bake(name) {
    if (baked[name]) return baked[name];
    const pg = createGraphics(SET_W, SET_H + M.SKY_TOP, WEBGL);
    pg.pixelDensity(1);
    brush.load(pg);
    randomSeed(seedFor[name]);
    noiseSeed(seedFor[name]);
    pg.push();
    paper(pg, '#f8efdb');
    pg.translate(-SET_W / 2, -(SET_H + M.SKY_TOP) / 2 + M.SKY_TOP);
    const r = rng(seedFor[name]);
    paperFibres(r);
    SETS[name](r);
    pg.pop();
    brush.load();
    baked[name] = pg;
    return pg;
  }
  /* 纸纹：稀疏的细纤维和颗粒，压在所有颜料之下，蜡笔的留白处会透出来 */
  function paperFibres(r) {
    for (let i = 0; i < 520; i++) {
      const x = r() * SET_W, y = r() * SET_H - M.SKY_TOP, a = r() * 6.28, l = 14 + r() * 42;
      brush.set('crayon', r() > 0.5 ? '#d9c8a4' : '#e3d4b5', 0.34);
      brush.line(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
    }
  }

  /* ---------- 动态道具与特效 ---------- */
  const Xw = (set, x) => OX[set] + x;
  const FX = {
    caseDeck({ u }) {
      const x = Xw('A', 1560), y = GROUND - 6;
      box(x - 42, y - 62, 84, 62, '#a8743f', '#5b3a22', 1.2);
      line(x - 42, y - 34, x + 42, y - 34, '#5b3a22', 0.8);
      curve([[x - 18, y - 62], [x, y - 80], [x + 18, y - 62]], '#5b3a22', 1.1);
    },
    fallingLights({ t }) {
      const S2 = M.SHOTS[2];
      for (let i = 0; i < 12; i++) {
        const cyc = (t * 0.28 + i * 0.083) % 1, born = t - cyc / 0.28;
        if (born < S2.start || born >= S2.end) continue;
        const x = Xw('A', 280 + ((i * 197) % 1900) + cyc * 40), y = lerp(830, 1400, cyc * cyc);
        C.scribble(x, y, 7, '#ffe16b', 1.3);
        line(x - 12, y - 42, x, y, '#ffcf8f', 0.8);
      }
    },
    bubbleRise({ crab, rel }) { bubble(crab, 1, -smooth(rel / 1.5) * 900); },
    bubbleMama({ crab, u, rel }) { bubble(crab, smooth(rel / 1.4)); if (rel > 0.8) C.draw({ x: crab.x + 30, y: 1130, scale: 0.72, variant: 'mama', expression: 'happy', action: 'raise', facing: 'front', from: 'idle', blend: smooth((rel - 0.8) / 1) }); },
    bubbleCalendar({ crab, rel, shot }) {
      bubble(crab, 1);
      C.draw({ x: crab.x - 130, y: 1130, scale: 0.6, variant: 'mama', expression: 'neutral', action: 'idle', facing: 'right' });
      const cx = crab.x + 130, cy = 980;
      const pages = 6, left = Math.max(0, pages - Math.floor(rel / 1.1));
      box(cx - 70, cy - 74, 140, 150, '#fffdf0', '#7a6444', 1.2);
      box(cx - 70, cy - 74, 140, 30, '#d9482f', '#7c2a1e', 1);
      if (left > 0) for (let j = 0; j < left; j++) { C.scribble(cx - 46 + j * 18, cy - 8 + (j % 2) * 34, 7, '#6e5238', 0.9); }
      const f = (rel / 1.1) % 1;
      if (left > 0) shape([[cx - 66 + f * 90, cy - 40 + f * 170], [cx + 66 + f * 90, cy - 40 + f * 190], [cx + 56 + f * 90, cy + 70 + f * 190], [cx - 60 + f * 90, cy + 66 + f * 170]], '#fffdf0', '#a89470', 0.9);
    },
    notes({ t, crab, rel }) {
      for (let i = 0; i < 4; i++) {
        const c = (rel * 0.32 + i * 0.25) % 1;
        const x = crab.x + 60 + Math.sin(c * 6 + i) * 34 + c * 170, y = crab.y - 215 - c * 240;
        C.scribble(x, y, 9, '#7a4f2f', 1.2);
        line(x + 9, y, x + 9, y - 42, '#7a4f2f', 1.2);
      }
    },
    fog({ rel }) {
      fogPatch(smooth(rel / 2));
      fogMama(smooth((rel - 1) / 1.6));
    },
    fogOut({ rel }) { const k = 1 - smooth(rel / 1); if (k > 0) { fogPatch(k); fogMama(k); } },
    blood({ rel, crab }) {
      for (let i = 0; i < 3; i++) {
        const a = rel * 1.7 + i * 2.1;
        const x = crab.x + Math.cos(a) * 80, y = crab.y - 112 + Math.sin(a) * 52;
        C.scribble(x, y, 11, '#c7231f', 1.4);
      }
      const pts = C.ellipsePts(crab.x, crab.y - 112, 80, 52, 0, 18);
      curve(pts.concat([pts[0]]), '#c7231f', 0.8);
    },
    windowMama({ rel }) {
      fogPatch(smooth(rel / 1.6));
      fogMama(smooth(rel / 1.6));
    },
    ferry({ crab }) {
      /* 渡轮一直泊在码头边，小蟹上船后才开，靠岸后留在岸边 */
      const x = clamp(crab.x, Xw('C', 1040), Xw('C', 2300));
      shape([[x - 340, GROUND + 4], [x + 340, GROUND + 4], [x + 280, GROUND + 130], [x - 280, GROUND + 130]], '#f5f0e0', '#241812', 1.6, '#cfd3cd');
      box(x - 200, GROUND - 180, 60, 184, '#d9482f', '#241812', 1.1);
    },
    wall({ rel }) { wallBricks(smooth((rel - 2.6) / 1.2)); },
    wallStay() { wallBricks(1); },
    yarnBind({ rel, mama }) {
      const turns = Math.min(7, Math.floor(rel * 1.2));
      for (let i = 0; i < turns; i++) {
        const y = mama.y - 42 - i * 16;
        curve([[mama.x - 104, y], [mama.x, y + 18], [mama.x + 104, y]], '#c7231f', 0.9);
      }
    },
    yarnBound({ mama }) {
      mama = mama || { x: Xw('P', 1250), y: GROUND };
      for (let i = 0; i < 7; i++) {
        const y = mama.y - 42 - i * 16;
        curve([[mama.x - 104, y], [mama.x, y + 18], [mama.x + 104, y]], '#c7231f', 0.9);
      }
    },
    mailPile({ crab }) {
      for (let i = 0; i < 7; i++) {
        const x = Xw('P', 2560 + ((i * 53) % 150)), y = GROUND + 8 - (i % 3) * 16;
        box(x, y - 34, 74, 46, '#fbf4dc', '#7a6444', 0.9);
        line(x, y - 34, x + 37, y - 8, '#7a6444', 0.7);
        line(x + 74, y - 34, x + 37, y - 8, '#7a6444', 0.7);
      }
    },
    chairRock({ t }) { chair(Math.sin(t * 1.4) * 0.05); },
    roomMarks({ crab, rel, t }) {
      chair(Math.sin(t * 1.4) * 0.05);
      redLines(crab, (i) => smooth((rel - i * 0.7) / 1.1));
    },
    marksBack({ crab, rel, t }) {
      chair(Math.sin(t * 1.4) * 0.05);
      FX.notes({ crab, rel });
      redLines(crab, () => 1 - smooth(rel / 1.5));
    },
    chairStop({ rel, t }) { chair(Math.sin(t * 1.4) * 0.05 * (1 - smooth(rel / 2.4))); },
    chairStill() { chair(0); },
    yarnRoll({ rel }) {
      chair(0, true);
      yarn(rel);
    },
    letterBox() {
      chair(0, true);
      const S = M.SHOTS.find((x) => x.fx === 'yarnRoll');
      yarn(S.end - S.start);
    },
    doorGhost({ rel, shot }) {
      FX.letterBox();
      awayGhost(rel / (shot.end - shot.start));
    },
    ghostAway({ rel }) {
      const k = 1 + rel / 1.5;
      if (k < 2) awayGhost(k);
    },
    moundHug() {},
    soulFloat({ rel, crab }) {
      const k = clamp(rel / 4.2, 0, 1);
      C.draw({ x: crab.x + k * 40, y: crab.y - 120 - 900 * smooth(k), scale: 0.86, ghost: true, facing: 'front' });
    },
    bigShellFront({ rel, crab, hide }) {
      const dy = lerp(240, 56, smooth(hide));
      const x = Xw('F', 2000);
      shape([[x - 188, 1445 + dy], [x - 90, 1412 + dy], [x, 1400 + dy], [x + 90, 1412 + dy], [x + 188, 1445 + dy], [x + 150, 1582 + dy], [x - 150, 1582 + dy]], '#f4dec2', '#8a6a4a', 2, '#dcbb95');
    },
    sandDraw({ rel, shot }) {
      const dur = shot.end - shot.start;
      const k = smooth((rel - 0.6) / 3);
      const x0 = Xw('F', 2230), y0 = GROUND + 46;
      const erased = smooth((rel - dur + 1.2) / 0.5);
      if (erased >= 1) return wave(1);
      const a = C.ellipsePts(x0 + 100, y0, 72, 44, 0, 16).slice(0, Math.max(2, Math.floor(16 * k)));
      curve(a, '#8a6f42', 1.3);
      const b = C.ellipsePts(x0 + 260, y0 + 8, 46, 30, 0, 14).slice(0, Math.max(2, Math.floor(14 * clamp(k * 1.4 - 0.4, 0, 1))));
      if (k > 0.3) curve(b, '#8a6f42', 1.3);
      wave(smooth((rel - dur + 2.3) / 1.6));
    },
    waveBack({ rel, t }) {
      wave(1 - smooth(rel / 1.8));
    },
    finalStar({ t }) {
      /* 最后一个重音落下时星星到达海平线 */
      const k = clamp((t - 258.9) / 3, 0, 1);
      if (k <= 0) return;
      const tx = Xw('F', 2720), y1 = 1000;
      const x = lerp(tx - 520, tx, k), y = lerp(560, y1, k * k);
      if (k < 1) line(x - 56, y - 44, x, y, '#ffcf8f', 0.9);
      C.scribble(x, y, k < 1 ? 11 : 15, '#ffd34d', 1.5);
    },
  };

  /* 沙墙：妈妈一推，左右两摞都朝外倒，留出通路 */
  function wallBricks(f) {
    const by = GROUND;
    [[Xw('P', 1990), -1], [Xw('P', 2410), 1]].forEach(([x0, sign]) => {
      for (let i = 0; i < 4; i++) {
        const y0 = by - 66 - i * 62, x = x0 + sign * f * (20 + i * 76), y = lerp(y0, by - 40 + (i % 2) * 14, f);
        box(x, y, 90, 60, '#e4c683', '#241812', 1, '#c9a860');
      }
    });
  }
  function fogPatch(k) {
    brush.noStroke(); brush.noHatch(); brush.noFill();
    brush.wash('#f7f5ee', 170);
    brush.polygon(C.ellipsePts(Xw('B', 700), 1090, 180 * k, 150 * k, 0, 22));
    brush.noWash();
  }
  function fogMama(k) {
    if (k > 0.02) C.draw({ x: Xw('B', 700), y: 1220, scale: 0.62 * k, variant: 'mama', ghost: true, facing: 'front' });
  }
  function redLines(crab, kOf) {
    const targets = [[Xw('E', 700), 980], [Xw('E', 515), 950], [Xw('E', 1730), GROUND + 46], [Xw('E', 2218), 1340]];
    targets.forEach((p, i) => {
      const k = kOf(i);
      if (k <= 0) return;
      const sx = crab.x, sy = crab.y - 100;
      curve([[sx, sy], [lerp(sx, p[0], k * 0.5), lerp(sy, p[1], k * 0.5) - 40], [lerp(sx, p[0], k), lerp(sy, p[1], k)]], '#c7231f', 0.9);
      if (k > 0.98) C.scribble(p[0], p[1], 14, '#c7231f', 1);
    });
  }
  function yarn(rel) {
    const c = rel * 0.9;
    const x = Xw('E', 1500 + Math.sin(c) * 340), y = GROUND + 70;
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const q = (i / 16) * c;
      pts.push([Xw('E', 1500 + Math.sin(q) * 340), GROUND + 70 + Math.cos(q * 1.7) * 18]);
    }
    if (pts.length > 2) curve(pts, '#c7231f', 1);
    oval(x, y, 30, 28, '#c7231f', '#7a1612', 1);
    curve([[x - 18, y], [x, y - 14], [x + 18, y + 4]], '#7a1612', 0.7);
  }
  /* 妈妈的虚影走向门外，越走越小，k 为 0 到 2 */
  function awayGhost(k) {
    const a = Math.min(k, 1), b = Math.max(0, k - 1);
    const scale = lerp(0.92, 0.38, a) * (1 - b);
    if (scale < 0.02) return;
    C.draw({ x: Xw('E', 3000) + k * 260, y: GROUND - 150 * Math.min(k, 1.4), scale, variant: 'mama', ghost: true, facing: 'right' });
  }
  function wave(w) {
    if (w <= 0) return;
    const x0 = Xw('F', 2230), y0 = GROUND + 46;
    const wx = x0 + 640 - 860 * w;
    shape([[wx, GROUND + 136], [wx + 90, y0 - 80], [wx + 480, y0 - 104], [wx + 900, y0 - 90], [wx + 900, GROUND + 136]], '#9dcad6', '#e9f6f8', 1.2);
  }
  function bubble(crab, k, dy) {
    if (k <= 0) return;
    const x = crab.x, y = 1030 + (dy || 0);
    if (!dy) {
      oval(x - 40, crab.y - 226, 12 * k, 10 * k, '#fffdf4', '#241812', 1);
      oval(x - 14, crab.y - 268, 20 * k, 16 * k, '#fffdf4', '#241812', 1.1);
    }
    oval(x, y, 300 * k, 170 * k, '#fffdf4', '#8a7b5f', 1.5);
  }
  function chair(angle, still) {
    const x = Xw('E', 1560), y = GROUND + 6;
    push();
    translate(x, y);
    rotate(angle);
    translate(-x, -y);
    curve([[x - 140, y + 6], [x, y + 26], [x + 140, y + 6]], '#6e4a2a', 2.2);
    line(x - 92, y + 16, x - 92, y - 110, '#6e4a2a', 1.7);
    line(x + 92, y + 16, x + 92, y - 110, '#6e4a2a', 1.7);
    box(x - 100, y - 124, 200, 24, '#a9825a', '#553d27', 1.2);
    line(x + 92, y - 110, x + 118, y - 322, '#6e4a2a', 1.8);
    line(x + 34, y - 110, x + 58, y - 322, '#6e4a2a', 1.4);
    line(x + 58, y - 322, x + 118, y - 322, '#6e4a2a', 1.8);
    if (still) {
      shape([[x + 40, y - 250], [x + 112, y - 250], [x + 80, y - 120], [x + 20, y - 124]], C.PALETTE.mama.scarf, C.PALETTE.mama.scarf2, 1, C.PALETTE.mama.scarf2);
    }
    pop();
  }

  /* ---------- 帧 ---------- */
  function actorDraw(a, variant, between) {
    return C.draw({
      x: a.x, y: a.y, scale: 1, variant, facing: a.yaw, expression: a.expr, action: a.action, from: a.from, blend: a.blend, phase: a.phase,
      prop: a.prop, propScale: a.propScale, breath: (a.t || 0) / 4.286, ache: a.ache, spread: a.spread, between,
    });
  }

  function view(cam) {
    const hw = W / 2 / cam.z, hh = H / 2 / cam.z;
    return { x0: cam.x - hw, x1: cam.x + hw, y0: cam.y - hh, y1: cam.y + hh };
  }
  const onScreen = (x, v, m) => x + (m || 220) > v.x0 && x - (m || 220) < v.x1;

  function renderAt(t) {
    const cam = M.evalCam(t);
    const shot = M.shotAt(t);
    const rel = t - shot.start;
    const v = view(cam);
    /* 布景先烘焙，避免在摄像机矩阵内切换画布目标 */
    Object.keys(OX).forEach((n) => { if (OX[n] < v.x1 && OX[n] + SET_W > v.x0) bake(n); });
    if (cam.portal) bake('P');

    background('#f8efdb');
    push();
    translate(-W / 2, -H / 2);
    translate(W / 2, H / 2);
    scale(cam.z);
    translate(-cam.x, -cam.y);
    noStroke();
    Object.keys(OX).forEach((n) => {
      if (OX[n] < v.x1 && OX[n] + SET_W > v.x0) image(baked[n], OX[n], -M.SKY_TOP, SET_W, SET_H + M.SKY_TOP);
    });

    /* 穿窗：窗内贴回忆布景，放大到满屏时与下一镜的画面完全重合 */
    if (OX.D < v.x1 && OX.D + SET_W > v.x0) {
      const wx = OX.D + PORTAL.x, wy = PORTAL.y;
      const target = M.camTarget(M.SHOTS.find((s) => s.via === 'portal'));
      /* 贴图比窗洞多 pad，窗框外移同样距离：推满屏时笔触抖动已在画外，换布景没有东西突然消失 */
      const pad = 5, sx = W / PORTAL.w;
      image(baked.P || bake('P'), wx - pad, wy - pad, PORTAL.w + 2 * pad, PORTAL.h + 2 * pad, target.x - OX.P - W / 2 - pad * sx, target.y - H / 2 + M.SKY_TOP - pad * sx, W + 2 * pad * sx, H + 2 * pad * sx);
      const f = 14;
      [[wx - f - pad, wy - f - pad, PORTAL.w + 2 * f + 2 * pad, f], [wx - f - pad, wy + PORTAL.h + pad, PORTAL.w + 2 * f + 2 * pad, f], [wx - f - pad, wy - pad, f, PORTAL.h + 2 * pad], [wx + PORTAL.w + pad, wy - pad, f, PORTAL.h + 2 * pad]].forEach((b) => box(b[0], b[1], b[2], b[3], '#7c5a3a', '#553d27', 1));
    }

    /* 角色笔触按 8 fps 重描一次，保留手绘抖动；不随摄像机变化 */
    randomSeed(1000 + Math.floor(t * 8));
    noiseSeed(1000 + Math.floor(t * 8));
    const crab = M.evalActor('crab', t);
    const mama = M.evalActor('mama', t);
    if (crab) crab.t = t;
    if (mama) mama.t = t;
    const ctx = { t, rel, u: rel / (shot.end - shot.start), crab, mama, shot, v };

    const persistent = persistentFx(shot.id, rel);
    persistent.forEach((n) => FX[n] && FX[n](ctx));
    if (shot.fx && FX[shot.fx]) FX[shot.fx](ctx);
    if (shot.ghostMama) {
      const g = shot.ghostMama;
      const prevG = M.SHOTS[shot.index - 1].ghostMama;
      const from = g.from !== undefined ? g.from : prevG ? prevG.x : g.x;
      const x = Xw(shot.set, lerp(from, g.x, smooth(rel / (g.walkFor || 2))));
      if (onScreen(x, v)) C.draw({ x, y: GROUND, scale: 1, variant: 'mama', ghost: true, facing: x < crab.x ? 'right' : 'left' });
    }

    if (mama && onScreen(mama.x, v)) actorDraw(mama, 'mama');
    if (crab && onScreen(crab.x, v)) {
      const between = crab.between === 'scarf'
        ? (L) => box(L.clawL[0] - 8, L.clawR[1] - 20, L.clawR[0] - L.clawL[0] + 16, 58, C.PALETTE.mama.scarf, '#241812', 1, C.PALETTE.mama.scarf2)
        : null;
      actorDraw(crab, 'clawdbot', between);
    }
    if (shot.id === 'S38') FX.bigShellFront({ hide: rel / 1.4 });
    if (shot.id === 'S39' && rel < 1.4) FX.bigShellFront({ hide: 1 - rel / 1.4 });
    pop();
  }

  function persistentFx(id, rel) {
    const n = +id.slice(1);
    const out = [];
    if (n >= 1 && n <= 6 || (n === 7 && rel < 1.6)) out.push('caseDeck');
    if (n === 2 || n === 3) out.push('fallingLights');
    if (n === 7) out.push('bubbleRise');
    if (n === 12 || n === 15) out.push('fogOut');
    if (n >= 20 && n <= 22 || (n === 23 && rel < 1.7)) out.push('wallStay');
    if (n === 22 || (n === 23 && rel < 1.7)) out.push('yarnBound');
    if (n === 23 && rel < 1.7) out.push('mailPile');
    if (n === 16) out.push('ferry');
    if (n === 31) out.push('ghostAway');
    if (n === 41) out.push('waveBack');
    return out;
  }

  root.MVScene = { renderAt, bake, W, H };
})(window);
