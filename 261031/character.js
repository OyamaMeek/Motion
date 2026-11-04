/*
 * character.js: 主角 Clawd 小螃蟹的唯一造型来源（橙色方块身体、黑色轮廓、小短脚、脸画在身体上）。
 *
 *   Clawdbot.draw({ x, y, scale, facing, expression, action, phase, prop, variant, ... })
 *   Clawdbot.layout(opts)  不绘制，只返回关节与脸、道具的包围盒（供校验）
 *
 * facing      'front' | 'back' | 'left' | 'right' 或偏航角（度，0 正面，90 朝右）
 * expression  'neutral' | 'happy' | 'shy' | 'sad' | 'cry' | 'hum' | 'smileHurt'
 * action      'idle' | 'walk' | 'jump' | 'hug' | 'hold' | 'sit' | 'reach' | 'raise' | 'draw'
 * phase       动作相位 0..1（走路一个周期、跳跃一次）
 * from/blend  从 from 动作过渡到 action，blend 0..1，用于无跳变衔接
 * prop        'letter' | 'photo' | 'suitcase' | 'scarf' | 'shell' | 'stick' | null
 * variant     'clawdbot' | 'mama'（同一骨架，只换配色和围巾）
 * breath      呼吸相位 0..1，身体随之起伏
 * ache        胸口红色线团的大小 0..1；spread 为线团扩散到全身的比例 0..1
 * ghost       true 时只画虚线幻影
 * propScale   道具比例 0..1，从手中长出时不跳变
 * between     回调，在身体与前手之间绘制（被抱物），保证手压在物体上
 *
 * 坐标原点在脚底中心，y 向上为负。依赖全局 brush（p5.brush）与 p5 的 push/pop/translate/scale。
 */
(function (root) {
  const INK = '#241812';
  const PALETTE = {
    clawdbot: { body: '#e27b3b', shade: '#cc662b', hand: '#e27b3b', line: INK, spot: '#c75f27' },
    mama: { body: '#e8907f', shade: '#d27468', hand: '#e8907f', line: INK, spot: '#cc6b60', scarf: '#f3e3b4', scarf2: '#c98f4a' },
  };
  const YAW = { front: 0, right: 90, back: 180, left: -90 };
  const ACHE = '#c7231f';
  const LEG = 36, HW = 104, HH = 84;

  const POSES = {
    idle: { lift: 0, lean: 0, squash: 1, armR: [130, -92], armL: [-130, -92] },
    walk: { lift: 0, lean: 0.03, squash: 1, armR: [128, -98], armL: [-128, -98] },
    jump: { lift: 0, lean: 0, squash: 1, armR: [138, -176], armL: [-138, -176] },
    hug: { lift: 0, lean: 0.04, squash: 1, armR: [62, -62], armL: [-62, -62] },
    hold: { lift: 0, lean: 0, squash: 1, armR: [142, -96], armL: [-128, -88] },
    sit: { lift: -24, lean: 0, squash: 0.95, armR: [128, -70], armL: [-128, -70] },
    reach: { lift: 0, lean: 0.08, squash: 1, armR: [168, -124], armL: [-126, -90] },
    raise: { lift: 0, lean: 0, squash: 1, armR: [136, -188], armL: [-128, -90] },
    draw: { lift: -14, lean: 0.12, squash: 0.97, armR: [142, -38], armL: [-126, -72] },
  };
  /* 道具包围盒相对手的位置，全部朝外延伸，不会伸到脸前 */
  const PROPS = {
    letter: { box: [8, -30, 88, 30] },
    photo: { box: [8, -38, 88, 32] },
    suitcase: { box: [-34, 0, 34, 66] },
    scarf: { box: [-14, 0, 40, 86] },
    shell: { box: [8, -30, 72, 30] },
    stick: { box: [-6, -26, 6, 92] },
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerpPoint = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
  const toYaw = (f) => (typeof f === 'number' ? f : YAW[f] === undefined ? 0 : YAW[f]);

  function pose(opts) {
    const to = POSES[opts.action] || POSES.idle;
    const from = POSES[opts.from] || to;
    const b = opts.from ? clamp(opts.blend === undefined ? 1 : opts.blend, 0, 1) : 1;
    const out = {
      lift: lerp(from.lift, to.lift, b),
      lean: lerp(from.lean, to.lean, b),
      squash: lerp(from.squash, to.squash, b),
      armR: lerpPoint(from.armR, to.armR, b),
      armL: lerpPoint(from.armL, to.armL, b),
    };
    const ph = opts.phase || 0;
    if (opts.action === 'walk') {
      const s = Math.sin(ph * Math.PI * 2);
      out.lift += Math.abs(s) * 7 * b;
      out.armR[1] += s * 12 * b;
      out.armL[1] -= s * 12 * b;
    }
    if (opts.action === 'jump') {
      const arc = Math.sin(clamp(ph, 0, 1) * Math.PI);
      out.lift += arc * 150 * b;
      out.squash = lerp(out.squash, 0.86 + 0.2 * arc, b);
    }
    return out;
  }

  /* 偏航后把左右手放到屏幕坐标：侧面时身体变窄，两只手都偏向朝向一侧 */
  function layout(opts) {
    const yaw = (toYaw(opts.facing) * Math.PI) / 180;
    const s = Math.sin(yaw), c = Math.cos(yaw), ac = Math.abs(c);
    const P = pose(opts);
    const breath = Math.sin((opts.breath || 0) * Math.PI * 2);
    const rx = HW * (0.76 + 0.24 * ac) * (1 + breath * 0.02);
    const ry = HH * P.squash * (1 + breath * 0.03);
    const cy = -LEG - ry - P.lift;
    const place = (arm) => {
      const sideways = s * 84 * (1 - ac);
      return [arm[0] * (0.3 + 0.7 * ac) + sideways, arm[1] - P.lift];
    };
    const clawR = place(P.armR), clawL = place(P.armL);
    const faceX = s * rx * 0.34;
    const faceShown = c > -0.12;
    const eyeGap = 42 * (0.62 + 0.38 * ac);
    const eyeY = cy - 22;
    const face = faceShown ? [faceX - eyeGap - 22, eyeY - 22, faceX + eyeGap + 22, cy + 36] : null;
    let propBox = null, gripDir = 1;
    if (opts.prop && PROPS[opts.prop]) {
      gripDir = clawR[0] >= 0 ? 1 : -1;
      const b = PROPS[opts.prop].box;
      propBox = gripDir > 0
        ? [clawR[0] + b[0], clawR[1] + b[1], clawR[0] + b[2], clawR[1] + b[3]]
        : [clawR[0] - b[2], clawR[1] + b[1], clawR[0] - b[0], clawR[1] + b[3]];
    }
    return { yaw, s, c, ac, P, rx, ry, cy, clawR, clawL, faceX, faceShown, eyeGap, eyeY, face, propBox, gripDir, breath };
  }

  /* ---------- 笔触工具 ---------- */
  const ellipsePts = (x, y, rx, ry, rot, n) => {
    const out = [], k = Math.cos(rot || 0), q = Math.sin(rot || 0), m = n || 18;
    for (let i = 0; i < m; i++) {
      const a = (i / m) * Math.PI * 2, u = Math.cos(a) * rx, v = Math.sin(a) * ry;
      out.push([x + u * k - v * q, y + u * q + v * k]);
    }
    return out;
  };
  /* 圆角方块，转角只圆一点，保留方方正正的轮廓 */
  const squarePts = (x, y, hw, hh, r) => {
    const out = [];
    [[hw - r, -hh + r, -90], [hw - r, hh - r, 0], [-hw + r, hh - r, 90], [-hw + r, -hh + r, 180]].forEach(([cx, cy, a0]) => {
      for (let i = 0; i <= 3; i++) {
        const a = ((a0 + i * 30) * Math.PI) / 180;
        out.push([x + cx + Math.cos(a) * r, y + cy + Math.sin(a) * r]);
      }
    });
    return out;
  };
  function blob(pts, fill, line, weight, hatch) {
    brush.noHatch();
    brush.noStroke();
    brush.noField();
    brush.noFill();
    brush.wash(fill, 255);
    brush.polygon(pts);
    brush.noWash();
    if (hatch) {
      brush.hatchStyle('crayon', hatch, 0.75);
      brush.hatch(15, 0.9 + (pts[0][0] % 3) * 0.08, { rand: 0.25, gradient: 0.15 });
      brush.polygon(pts);
      brush.noHatch();
    }
    if (line) {
      brush.set('crayon', line, weight || 1);
      brush.spline(pts.concat([pts[0]]), 0.25);
    }
  }
  /* 小面积实心块用来回涂抹，保证眼睛、泪滴够实 */
  const scribble = (x, y, r, col, w) => {
    const pts = [];
    for (let i = 0; i < 22; i++) {
      const a = i * 2.2, k = r * (0.25 + 0.75 * (i % 4) / 3);
      pts.push([x + Math.cos(a) * k, y + Math.sin(a) * k]);
    }
    stroke(pts, col, w || 1.2, 0.3);
  };
  const stroke = (pts, col, w, curv) => {
    brush.set('crayon', col, w || 1);
    if (pts.length === 2) brush.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1]);
    else brush.spline(pts, curv === undefined ? 0.6 : curv);
  };

  function shadow(L) {
    const k = clamp(1 - Math.max(0, L.P.lift) / 220, 0.5, 1);
    brush.noStroke();
    brush.noHatch();
    brush.noFill();
    brush.wash('#8a8078', 60);
    brush.polygon(ellipsePts(0, 4, L.rx * 1.02 * k, 13 * k, 0, 16));
    brush.noWash();
  }

  /* 小短脚：两只，走路时一前一后，坐下时折短 */
  function legs(L, pal, opts) {
    const ph = opts.action === 'walk' ? opts.phase || 0 : 0;
    const bottom = L.cy + L.ry;
    for (const side of [-1, 1]) {
      const swing = Math.sin((ph + (side > 0 ? 0.5 : 0)) * Math.PI * 2);
      const hipX = side * L.rx * 0.48 + L.s * (1 - L.ac) * side * -18;
      const footX = hipX + swing * 13 * (1 - L.ac * 0.5);
      const footY = L.P.lift > 30 ? bottom + LEG * 0.8 : Math.min(0, -Math.max(0, swing) * 9);
      if (footY - bottom < 4) continue;
      stroke([[hipX, bottom - 2], [footX, footY]], pal.line, 3);
      stroke([[hipX, bottom + 2], [footX, footY - 3]], pal.body, 1.3);
    }
  }

  /* 短手臂加一只小圆手 */
  function arm(L, pal, hand, side) {
    const shoulderX = side * L.rx * 0.94 * L.ac + L.s * (1 - L.ac) * L.rx * 0.94;
    const shoulderY = L.cy + 2;
    stroke([[shoulderX, shoulderY], [hand[0], hand[1]]], pal.line, 3);
    stroke([[shoulderX, shoulderY], [hand[0], hand[1]]], pal.body, 1.3);
    blob(ellipsePts(hand[0], hand[1], 16, 15, 0, 10), pal.hand, pal.line, 1.25);
  }

  function face(L, pal, opts) {
    const expr = opts.expression || 'neutral';
    const ink = pal.line, x = L.faceX, ey = L.eyeY, my = L.cy + 18;
    for (const side of [-1, 1]) {
      const ex = x + side * L.eyeGap;
      if (expr === 'happy' || expr === 'hum' || expr === 'smileHurt') {
        stroke([[ex - 17, ey + 7], [ex, ey - 11], [ex + 17, ey + 7]], ink, 2.1, 0.9);
      } else if (expr === 'shy') {
        scribble(ex + L.s * 6 - 8, ey + 4, 9, ink, 1.5);
      } else {
        scribble(ex + L.s * 5, ey + (expr === 'neutral' ? 0 : 5), 10, ink, 1.6);
      }
      if (expr === 'sad' || expr === 'cry') stroke([[ex - side * 16, ey - 24], [ex + side * 18, ey - 9]], ink, 1.5);
    }
    if (expr === 'happy') {
      blob([[x - 25, my - 6], [x + 25, my - 6], [x + 15, my + 14], [x, my + 21], [x - 15, my + 14]], '#7a2b18', ink, 1.5);
    } else if (expr === 'smileHurt') {
      stroke([[x - 26, my - 6], [x, my + 10], [x + 26, my - 6]], ink, 1.9);
      scribble(x + L.eyeGap + 14, ey + 30, 8, '#4f9ccc', 1.1);
    } else if (expr === 'shy') {
      stroke([[x - 16, my + 2], [x - 6, my + 9], [x + 5, my + 2], [x + 16, my + 8]], ink, 1.6);
    } else if (expr === 'sad' || expr === 'cry') {
      stroke([[x - 24, my + 12], [x, my - 6], [x + 24, my + 12]], ink, 1.9);
    } else if (expr === 'hum') {
      scribble(x, my + 3, 10, '#7a2b18', 1.3);
    } else {
      stroke([[x - 15, my + 3], [x + 15, my + 3]], ink, 1.7);
    }
    if (expr === 'shy' || expr === 'happy') {
      for (const side of [-1, 1]) {
        const bx = x + side * (L.eyeGap + 24) * (0.7 + 0.3 * L.ac), by = ey + 32;
        const col = expr === 'shy' ? '#c92f26' : '#d84f35';
        for (let i = -1; i <= 1; i++) stroke([[bx + i * 9 - 3, by + 8], [bx + i * 9 + 3, by - 8]], col, 1.1);
      }
    }
    if (expr === 'cry') {
      for (const side of [-1, 1]) {
        const tx = x + side * (L.eyeGap + 3);
        scribble(tx, ey + 28, 9, '#4f9ccc', 1.2);
        scribble(tx + side, ey + 52, 7, '#4f9ccc', 1);
      }
    }
  }

  function propDraw(name, L) {
    const [gx, gy] = L.clawR, d = L.gripDir;
    const R = (x0, y0, x1, y1) => [[gx + d * x0, gy + y0], [gx + d * x1, gy + y0], [gx + d * x1, gy + y1], [gx + d * x0, gy + y1]];
    if (name === 'letter') {
      blob(R(8, -28, 88, 28), '#fbf4dc', INK, 1.1);
      stroke([[gx + d * 8, gy - 28], [gx + d * 48, gy + 3], [gx + d * 88, gy - 28]], INK, 0.9);
      scribble(gx + d * 48, gy + 3, 7, ACHE, 1);
    } else if (name === 'photo') {
      blob(R(8, -36, 88, 30), '#fffdf0', INK, 1.1);
      blob(R(15, -29, 81, 12), '#f3cf9a', null);
      blob(squarePts(gx + d * 34, gy - 5, 13, 11, 3), PALETTE.mama.body, INK, 0.7);
      blob(squarePts(gx + d * 60, gy - 2, 9, 8, 2), PALETTE.clawdbot.body, INK, 0.7);
    } else if (name === 'suitcase') {
      stroke([[gx - 11, gy + 1], [gx - 11, gy + 13]], INK, 1.1);
      stroke([[gx + 11, gy + 1], [gx + 11, gy + 13]], INK, 1.1);
      blob([[gx - 33, gy + 13], [gx + 33, gy + 13], [gx + 33, gy + 64], [gx - 33, gy + 64]], '#a8743f', INK, 1.1);
      stroke([[gx - 33, gy + 34], [gx + 33, gy + 34]], INK, 0.8);
    } else if (name === 'scarf') {
      blob([[gx - 12, gy + 2], [gx + 14, gy + 3], [gx + 26, gy + 42], [gx + 36, gy + 84], [gx + 6, gy + 84], [gx + 2, gy + 44]], PALETTE.mama.scarf, INK, 1, PALETTE.mama.scarf2);
    } else if (name === 'shell') {
      blob(ellipsePts(gx + d * 40, gy, 32, 26, 0, 14), '#f4dec2', INK, 1.1);
      for (let i = -2; i <= 2; i++) stroke([[gx + d * 14, gy + i * 2], [gx + d * 68, gy + i * 11]], '#b98c62', 0.7);
    } else if (name === 'stick') {
      stroke([[gx, gy - 24], [gx + 1, gy + 90 + L.P.lift]], '#6f4a2a', 2.2);
    }
  }

  function scarf(L, pal) {
    const y = L.cy + L.ry * 0.62, w = L.rx + 3;
    blob([[-w, y - 12], [w, y - 12], [w, y + 13], [-w, y + 13]], pal.scarf, pal.line, 1.2, pal.scarf2);
    const tx = L.s > 0.2 ? -w * 0.5 : w * 0.45;
    blob([[tx - 13, y + 9], [tx + 13, y + 9], [tx + 16, y + 42], [tx - 16, y + 42]], pal.scarf, pal.line, 1.1, pal.scarf2);
  }

  function ache(L, opts) {
    const a = clamp(opts.ache || 0, 0, 1);
    if (a <= 0.01) return;
    const pulse = 1 + L.breath * 0.18;
    const r = (9 + 22 * a) * pulse, cx = L.faceX * 0.5, cy = L.cy + 48;
    const pts = [];
    for (let i = 0; i < 28; i++) {
      const an = i * 2.399, rr = r * (0.25 + 0.75 * (((i * 7) % 11) / 11));
      pts.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * 0.7]);
    }
    stroke(pts, ACHE, 1.3, 0.8);
    const sp = clamp(opts.spread || 0, 0, 1);
    if (sp > 0.01) {
      const targets = [L.clawR, L.clawL, [-L.rx * 0.5, L.cy + L.ry + 16], [L.rx * 0.5, L.cy + L.ry + 16], [-L.rx * 0.8, L.cy - L.ry * 0.82], [L.rx * 0.8, L.cy - L.ry * 0.82]];
      targets.forEach((t, i) => {
        const k = clamp(sp * 1.6 - i * 0.1, 0, 1);
        if (k <= 0) return;
        const ex = lerp(cx, t[0], k), ey = lerp(cy, t[1], k);
        stroke([[cx, cy], [(cx + ex) / 2 + (i % 2 ? 10 : -10), (cy + ey) / 2 + 6], [ex, ey]], ACHE, 0.9);
      });
    }
  }

  function draw(opts) {
    const o = Object.assign({ x: 0, y: 0, scale: 1, facing: 'front', expression: 'neutral', action: 'idle', phase: 0, variant: 'clawdbot' }, opts);
    const pal = PALETTE[o.variant] || PALETTE.clawdbot;
    const L = layout(o);
    push();
    translate(o.x, o.y);
    scale(o.scale);
    if (o.ghost) {
      drawGhost(L, pal);
      pop();
      return L;
    }
    shadow(L);
    if (L.P.lean) rotate(L.P.lean * (L.s >= 0 ? 1 : -1));
    const farIsR = L.s < 0;
    const isSide = L.ac < 0.5;
    const isBack = L.c < -0.12;
    legs(L, pal, o);
    if (isBack) { arm(L, pal, L.clawR, 1); arm(L, pal, L.clawL, -1); }
    else if (isSide) arm(L, pal, farIsR ? L.clawR : L.clawL, farIsR ? 1 : -1);
    blob(squarePts(0, L.cy, L.rx, L.ry, 15), pal.body, pal.line, 1.6, pal.shade);
    if (isBack) {
      /* 背面没有脸：两道缝线和一小块补丁，三视图一眼可分 */
      stroke([[-L.rx * 0.55, L.cy - L.ry * 0.5], [L.rx * 0.55, L.cy - L.ry * 0.5]], pal.spot, 1.3);
      blob(squarePts(0, L.cy + 14, 24, 19, 5), pal.spot, pal.line, 1);
    }
    if (o.variant === 'mama') scarf(L, pal);
    if (L.faceShown) face(L, pal, o);
    ache(L, o);
    if (o.between) o.between(L);
    if (o.prop && (o.propScale === undefined || o.propScale > 0.02)) {
      const k = o.propScale === undefined ? 1 : o.propScale;
      push();
      translate(L.clawR[0], L.clawR[1]);
      scale(k);
      translate(-L.clawR[0], -L.clawR[1]);
      propDraw(o.prop, L);
      pop();
    }
    if (!isBack) {
      if (isSide) arm(L, pal, farIsR ? L.clawL : L.clawR, farIsR ? -1 : 1);
      else { arm(L, pal, L.clawL, -1); arm(L, pal, L.clawR, 1); }
    }
    pop();
    return L;
  }

  function drawGhost(L, pal) {
    const dash = (pts) => {
      for (let i = 0; i < pts.length; i += 2) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        stroke([a, b], pal.line, 1.1);
      }
    };
    const edge = [];
    const sq = squarePts(0, L.cy, L.rx, L.ry, 15);
    sq.forEach((p, i) => {
      const q = sq[(i + 1) % sq.length];
      const n = Math.max(1, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / 22));
      for (let j = 0; j < n; j++) edge.push([lerp(p[0], q[0], j / n), lerp(p[1], q[1], j / n)]);
    });
    dash(edge);
    dash(ellipsePts(L.clawR[0], L.clawR[1], 16, 15, 0, 10));
    dash(ellipsePts(L.clawL[0], L.clawL[1], 16, 15, 0, 10));
    for (const side of [-1, 1]) {
      stroke([[side * L.rx * 0.48, -LEG], [side * L.rx * 0.48, 0]], pal.line, 1);
      if (L.faceShown) scribble(L.faceX + side * L.eyeGap, L.eyeY, 8, pal.line, 1.1);
    }
    if (pal.scarf2) stroke([[-L.rx, L.cy + L.ry * 0.62], [L.rx, L.cy + L.ry * 0.62]], pal.scarf2, 1.1);
  }

  /* 注册蜡笔笔刷，每个画布只需一次 */
  function setup() {
    brush.add('crayon', { type: 'default', weight: 3.4, scatter: 0.9, sharpness: 0.32, grain: 0.42, opacity: 215, spacing: 0.45, pressure: [0.95, 1.1, 0.85], noise: 0.5 });
    brush.add('crayonWide', { type: 'default', weight: 15, scatter: 2.6, sharpness: 0.18, grain: 0.22, opacity: 70, spacing: 0.4, pressure: [0.85, 1.1, 0.85], noise: 0.6 });
  }

  root.Clawdbot = { draw, layout, setup, stroke, blob, scribble, ellipsePts, squarePts, PALETTE, POSES, PROPS, ACHE };
  if (typeof module !== 'undefined') module.exports = root.Clawdbot;
})(typeof window !== 'undefined' ? window : globalThis);
