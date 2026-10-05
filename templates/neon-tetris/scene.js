/* Neon Tetris: a self-playing Tetris. An AI chooses each placement with El-Tetris style heuristics. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...window.seeWallpaper?.getSettings?.() };
  let w, h, ratio = 1, t = 0, last = 0, frame = 0, timer = 0, paused = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fps = reduced ? 15 : 30;
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const on = (v, d = true) => v === undefined ? d : v === true || v === 'true';
  const accent = () => /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#b46bff';
  const speed = () => Math.max(0.1, num(settings.speed, 1)), intensity = () => num(settings.intensity, 1);
  const skill = () => Math.min(1, Math.max(0, num(settings.skill, 0.9)));
  function rgba(hex, a) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a))})`; }

  // Reproducible gallery captures; fresh entropy for every live game.
  const preview = new URLSearchParams(location.search).get('preview');
  let seed = 20261005;
  function reseed() {
    if (preview !== null) return;
    const entropy = new Uint32Array(1);
    if (globalThis.crypto?.getRandomValues) { crypto.getRandomValues(entropy); seed = entropy[0]; }
    else seed = (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
  }
  reseed();
  const random = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };

  // ---- Rules -------------------------------------------------------------
  const COLS = 10, ROWS = 22, HIDDEN = 2;
  const SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], O: [[1, 1], [1, 1]], T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]]
  };
  const COLORS = { I: '#38f3ff', O: '#ffe14d', T: '#c46bff', S: '#5dff8a', Z: '#ff4d6d', J: '#4d7bff', L: '#ff9a3d' };
  const ROT = {};
  for (const [k, m] of Object.entries(SHAPES)) {
    ROT[k] = []; let cur = m;
    for (let r = 0; r < (k === 'O' ? 1 : 4); r++) {
      const cells = []; cur.forEach((row, y) => row.forEach((v, x) => v && cells.push([x, y]))); ROT[k].push(cells);
      cur = cur[0].map((_, i) => cur.map(row => row[i]).reverse());
    }
  }
  const collide = (board, cells, px, py) => cells.some(([x, y]) => { const bx = px + x, by = py + y; return bx < 0 || bx >= COLS || by >= ROWS || (by >= 0 && board[by][bx]); });
  let bag = [];
  const nextPiece = () => { if (!bag.length) { bag = Object.keys(SHAPES); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } } return bag.pop(); };

  // ---- AI ----------------------------------------------------------------
  function evaluate(board, cells, px, py) {
    const b = board.map(r => r.slice());
    cells.forEach(([x, y]) => { b[py + y][px + x] = 1; });
    const full = []; b.forEach((r, y) => { if (r.every(Boolean)) full.push(y); });
    const kept = b.filter((_, y) => !full.includes(y)); while (kept.length < ROWS) kept.unshift(Array(COLS).fill(0));
    const ys = cells.map(([, y]) => y), landing = ROWS - (py + (Math.min(...ys) + Math.max(...ys)) / 2);
    let rowT = 0, colT = 0, holes = 0, wells = 0;
    for (let y = 0; y < ROWS; y++) { let prev = 1; for (let x = 0; x < COLS; x++) { const v = kept[y][x] ? 1 : 0; if (v !== prev) rowT++; prev = v; } if (!prev) rowT++; }
    for (let x = 0; x < COLS; x++) {
      let prev = 0, seen = false;
      for (let y = 0; y < ROWS; y++) { const v = kept[y][x] ? 1 : 0; if (v !== prev) colT++; prev = v; if (v) seen = true; else if (seen) holes++; }
      if (!prev) colT++;
      let depth = 0;
      for (let y = 0; y < ROWS; y++) {
        const left = x === 0 || kept[y][x - 1], right = x === COLS - 1 || kept[y][x + 1];
        if (!kept[y][x] && left && right) { depth++; wells += depth; } else depth = 0;
      }
    }
    return -4.5 * landing + 3.42 * full.length - 3.22 * rowT - 9.35 * colT - 7.9 * holes - 3.39 * wells;
  }
  function plan(board, type) {
    // Search actual legal moves, including rotations near walls or a tall stack.
    const options = [], pending = [{ r: 0, x: 3, actions: [] }], seen = new Set(['0:3']);
    for (let i = 0; i < pending.length; i++) {
      const node = pending[i], cells = ROT[type][node.r];
      let y = 0; while (!collide(board, cells, node.x, y + 1)) y++;
      options.push({ ...node, y, score: evaluate(board, cells, node.x, y) });
      for (const action of ['left', 'right', 'rotate']) {
        const r = action === 'rotate' ? (node.r + 1) % ROT[type].length : node.r;
        const x = node.x + (action === 'left' ? -1 : action === 'right' ? 1 : 0), key = `${r}:${x}`;
        if (!seen.has(key) && !collide(board, ROT[type][r], x, 0)) {
          seen.add(key); pending.push({ r, x, actions: [...node.actions, action] });
        }
      }
    }
    options.sort((a, b) => b.score - a.score);
    // Lower skill sometimes picks one of the next-best moves, so games eventually end.
    if (options.length > 1 && random() > skill()) return options[1 + Math.floor(random() * Math.min(3, options.length - 1))];
    return options[0];
  }

  // ---- Game state --------------------------------------------------------
  let board, piece, queue, score, lines, level, combo, best = 0, phase, phaseTime, actions, clearing, particles, banners, games = 0, impacts = [], pieces = 0;
  try { best = Number(localStorage.getItem('neon-tetris-best')) || 0; } catch { best = 0; }
  function reset() {
    reseed(); bag = []; clearing = null; impacts = []; pieces = 0;
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    queue = [nextPiece(), nextPiece(), nextPiece(), nextPiece()];
    score = 0; lines = 0; level = 1; combo = -1; particles = []; banners = []; games++;
    spawn();
  }
  function spawn() {
    const type = queue.shift(); queue.push(nextPiece());
    piece = { type, r: 0, x: 3, y: 0, vx: 3, vy: 0, fall: 0 };
    if (collide(board, ROT[type][0], 3, 0)) { phase = 'over'; phaseTime = 0; return; }
    const target = plan(board, type);
    if (!target) { phase = 'over'; phaseTime = 0; return; }
    actions = target.actions.slice();
    phase = 'move'; phaseTime = 0;
  }
  const gravity = () => (1.2 + (level - 1) * 0.35) * speed();
  function lock() {
    pieces++;
    impacts.push({ y: piece.y - HIDDEN + 1, life: 1, color: COLORS[piece.type] });
    const cells = ROT[piece.type][piece.r];
    cells.forEach(([x, y]) => { board[piece.y + y][piece.x + x] = piece.type; });
    const full = []; board.forEach((r, y) => { if (r.every(Boolean)) full.push(y); });
    if (full.length) {
      combo++;
      const pts = [0, 100, 300, 500, 800][full.length] * level + Math.max(0, combo) * 50 * level;
      score += pts; lines += full.length; level = 1 + Math.floor(lines / 10);
      clearing = full; phase = 'clear'; phaseTime = 0;
      full.forEach(y => board[y].forEach((type, x) => { for (let k = 0; k < 3; k++) particles.push({ x: x + 0.5, y: y - HIDDEN + 0.5, vx: (random() - 0.5) * 14, vy: (random() - 0.8) * 10, life: 1, color: COLORS[type] }); }));
      if (full.length === 4) banners.push({ text: 'TETRIS', life: 1.6, big: true });
      else if (combo > 0) banners.push({ text: `COMBO ×${combo + 1}`, life: 1.1 });
      if (score > best) { best = score; try { localStorage.setItem('neon-tetris-best', String(best)); } catch { } }
    } else { combo = -1; spawn(); }
  }

  function update(dt) {
    phaseTime += dt;
    impacts.forEach(p => p.life -= dt * 2.2); impacts = impacts.filter(p => p.life > 0);
    particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 22 * dt; p.life -= dt * 1.2; });
    particles = particles.filter(p => p.life > 0);
    banners.forEach(b => b.life -= dt); banners = banners.filter(b => b.life > 0);
    piece.vx += (piece.x - piece.vx) * Math.min(1, dt * 22);
    if (phase === 'move') {
      const delay = 0.09 / Math.min(3, speed());
      while (phaseTime > delay && actions.length) {
        phaseTime -= delay; const a = actions.shift(), cells = ROT[piece.type];
        // Gravity keeps acting while moving, so re-check each step against the stack.
        const r = a === 'rotate' ? (piece.r + 1) % cells.length : piece.r, x = piece.x + (a === 'right' ? 1 : a === 'left' ? -1 : 0);
        if (!collide(board, cells[r], x, piece.y)) { piece.r = r; piece.x = x; }
      }
      if (!actions.length) { phase = 'drop'; phaseTime = 0; }
      // Plan at spawn height, then drop: every animated move follows the legal path.
    } else if (phase === 'drop') {
      // Gravity accelerates into a soft drop once the piece is lined up.
      piece.fall += dt * (gravity() + Math.min(phaseTime * 30, 26) * speed());
    } else if (phase === 'clear') {
      if (phaseTime > 0.38) {
        const kept = board.filter((_, y) => !clearing.includes(y)); while (kept.length < ROWS) kept.unshift(Array(COLS).fill(0));
        board = kept; clearing = null; spawn();
      }
      return;
    } else if (phase === 'over') {
      if (phaseTime > 3.2) reset();
      return;
    }
    const cells = ROT[piece.type][piece.r];
    while (piece.fall >= 1) {
      piece.fall -= 1;
      if (collide(board, cells, piece.x, piece.y + 1)) { piece.fall = 0; if (phase === 'drop') { lock(); return; } break; }
      piece.y++;
    }
    piece.vy = collide(board, cells, piece.x, piece.y + 1) ? piece.y : piece.y + piece.fall;
  }

  // ---- Rendering ---------------------------------------------------------
  let cell = 20, bx = 0, by = 0, sprites = {}, spriteKey = '';
  function layout() {
    const portrait = w < h * 0.9;
    cell = Math.floor(Math.min((h * (portrait ? 0.62 : 0.84)) / 20, (w * (portrait ? 0.9 : 0.5)) / (COLS + (portrait ? 0 : 12))));
    bx = Math.round(w / 2 - (COLS * cell) / 2 + (portrait ? 0 : cell * 0.5));
    by = Math.round(portrait ? h * 0.3 : h / 2 - 10 * cell);
  }
  // One pre-rendered bevelled, glowing block per colour.
  function buildSprites() {
    const key = `${cell}|${ratio}|${on(settings.glow)}|${intensity()}`;
    if (key === spriteKey) return; spriteKey = key; sprites = {};
    const pad = Math.ceil(cell * 0.5), size = cell + pad * 2;
    for (const [type, col] of Object.entries(COLORS)) {
      const s = document.createElement('canvas'); s.width = Math.ceil(size * ratio); s.height = s.width;
      const x = s.getContext('2d'); x.scale(ratio, ratio);
      const inset = Math.max(1, cell * 0.06), r = cell * 0.18, ix = pad + inset, iy = pad + inset, iw = cell - inset * 2;
      if (on(settings.glow)) { x.shadowColor = col; x.shadowBlur = cell * 0.55 * intensity(); }
      x.fillStyle = col; x.beginPath(); x.roundRect(ix, iy, iw, iw, r); x.fill(); x.shadowBlur = 0;
      const g = x.createLinearGradient(ix, iy, ix + iw, iy + iw); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(0.45, 'rgba(255,255,255,.05)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
      x.fillStyle = g; x.beginPath(); x.roundRect(ix, iy, iw, iw, r); x.fill();
      x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.roundRect(ix + iw * 0.18, iy + iw * 0.14, iw * 0.4, iw * 0.12, iw * 0.06); x.fill();
      sprites[type] = { canvas: s, pad, size };
    }
  }
  const block = (type, gx, gy, alpha = 1, scale = cell) => {
    const s = sprites[type]; if (!s) return; const k = scale / cell;
    c.globalAlpha = alpha; c.drawImage(s.canvas, bx + gx * cell - s.pad * k + (cell - scale) / 2, by + gy * cell - s.pad * k + (cell - scale) / 2, s.size * k, s.size * k); c.globalAlpha = 1;
  };

  // Large translucent tetrominoes drifting upward behind the board.
  const floaters = Array.from({ length: 14 }, (_, i) => ({ type: Object.keys(SHAPES)[i % 7], x: random(), y: random(), s: 0.6 + random() * 1.6, v: 0.01 + random() * 0.02, r: random() * Math.PI * 2, vr: (random() - 0.5) * 0.2 }));
  function background(time) {
    const g = c.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.hypot(w, h) * 0.65);
    g.addColorStop(0, '#120a24'); g.addColorStop(1, '#03020a'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    // Perspective floor grid.
    c.strokeStyle = rgba(accent(), 0.12); c.lineWidth = 1; const horizon = h * 0.62, vx = w / 2;
    for (let i = -14; i <= 14; i++) { c.beginPath(); c.moveTo(vx + i * w * 0.02, horizon); c.lineTo(vx + i * w * 0.2, h); c.stroke(); }
    for (let i = 0; i < 12; i++) { const p = ((i + (time * 0.25) % 1) / 12) ** 2, y = horizon + (h - horizon) * p; c.globalAlpha = p; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.globalAlpha = 1;
    floaters.forEach(f => {
      const y = ((f.y - time * f.v) % 1.2 + 1.2) % 1.2 - 0.1, unit = Math.min(w, h) * 0.035 * f.s;
      c.save(); c.translate(f.x * w, y * h); c.rotate(f.r + time * f.vr); c.globalAlpha = 0.07 + f.s * 0.03;
      c.strokeStyle = COLORS[f.type]; c.lineWidth = 1.5;
      ROT[f.type][0].forEach(([x, yy]) => c.strokeRect((x - 1.5) * unit, (yy - 1) * unit, unit * 0.9, unit * 0.9));
      c.restore();
    });
    c.globalAlpha = 1;
  }
  function panel(x, y, pw, ph, title) {
    c.fillStyle = 'rgba(10,6,24,.72)'; c.strokeStyle = rgba(accent(), 0.55); c.lineWidth = 1.5;
    c.save(); c.shadowColor = accent(); c.shadowBlur = 14 * intensity(); c.beginPath(); c.roundRect(x, y, pw, ph, cell * 0.3); c.fill(); c.stroke(); c.restore();
    if (title) { c.fillStyle = rgba(accent(), 0.95); c.font = `600 ${Math.round(cell * 0.5)}px "Segoe UI", sans-serif`; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillText(title, x + cell * 0.45, y + cell * 0.35); }
  }
  function drawBoard(time) {
    const bw = COLS * cell, bh = 20 * cell, flash = phase === 'clear' ? 1 - phaseTime / 0.38 : 0;
    panel(bx - cell * 0.35, by - cell * 0.35, bw + cell * 0.7, bh + cell * 0.7);
    c.strokeStyle = 'rgba(255,255,255,.04)'; c.lineWidth = 1;
    for (let x = 1; x < COLS; x++) { c.beginPath(); c.moveTo(bx + x * cell, by); c.lineTo(bx + x * cell, by + bh); c.stroke(); }
    for (let y = 1; y < 20; y++) { c.beginPath(); c.moveTo(bx, by + y * cell); c.lineTo(bx + bw, by + y * cell); c.stroke(); }
    const over = phase === 'over' ? Math.min(1, phaseTime / 1.4) : 0;
    for (let y = HIDDEN; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const type = board[y][x]; if (!type) continue;
      if (clearing && clearing.includes(y)) {
        // Cleared rows collapse from the centre outward.
        const k = Math.max(0, 1 - phaseTime / 0.38 * (1 + Math.abs(x - 4.5) / 4.5));
        block(type, x, y - HIDDEN, 1, cell * k);
        continue;
      }
      const grey = over && (ROWS - y) / 20 < over;
      block(type, x, y - HIDDEN, grey ? 0.25 : 1);
    }
    if (clearing) clearing.forEach(y => { c.fillStyle = `rgba(255,255,255,${0.6 * flash})`; c.fillRect(bx, by + (y - HIDDEN) * cell, bw, cell); });
    if (phase === 'move' || phase === 'drop') {
      const cells = ROT[piece.type][piece.r];
      // Ghost piece where it will land.
      let gy = piece.y; while (!collide(board, cells, piece.x, gy + 1)) gy++;
      c.strokeStyle = rgba(COLORS[piece.type], 0.5); c.lineWidth = Math.max(1, cell * 0.06);
      cells.forEach(([x, y]) => { if (gy + y >= HIDDEN) { c.beginPath(); c.roundRect(bx + (piece.x + x) * cell + cell * 0.12, by + (gy + y - HIDDEN) * cell + cell * 0.12, cell * 0.76, cell * 0.76, cell * 0.15); c.stroke(); } });
      cells.forEach(([x, y]) => { const yy = piece.vy + y - HIDDEN; if (yy > -1) block(piece.type, piece.vx + x, yy); });
    }
    if (!reduced) particles.forEach(p => { c.fillStyle = rgba(p.color, p.life); const s = cell * 0.18 * p.life + 1; c.fillRect(bx + p.x * cell - s / 2, by + p.y * cell - s / 2, s, s); });
    if (phase === 'over') {
      c.fillStyle = `rgba(5,2,14,${0.55 * over})`; c.fillRect(bx, by, bw, bh);
      c.globalAlpha = over; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = `800 ${Math.round(cell * 1.1)}px "Segoe UI", sans-serif`; c.fillText('GAME OVER', bx + bw / 2, by + bh * 0.45);
      c.font = `500 ${Math.round(cell * 0.5)}px "Segoe UI", sans-serif`; c.fillStyle = rgba(accent(), 1); c.fillText('NEW GAME', bx + bw / 2, by + bh * 0.45 + cell * 1.1); c.globalAlpha = 1;
    }
    banners.forEach(b => {
      const k = b.life, s = b.big ? 1.6 : 0.9;
      c.save(); c.translate(bx + bw / 2, by + bh * 0.35); c.scale(1 + (1 - Math.min(1, k)) * 0.2, 1 + (1 - Math.min(1, k)) * 0.2);
      c.globalAlpha = Math.min(1, k); c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `900 ${Math.round(cell * s)}px "Segoe UI", sans-serif`;
      c.shadowColor = accent(); c.shadowBlur = cell * 0.8; c.fillStyle = '#ffffff'; c.fillText(b.text, 0, 0); c.restore();
    });
  }
  function drawSide() {
    if (!on(settings.stats)) return;
    const portrait = w < h * 0.9, pw = cell * (portrait ? 4.9 : 5.4);
    // Next queue.
    const nx = portrait ? bx + COLS * cell - pw + cell * 0.35 : bx + COLS * cell + cell * 1.2, ny = portrait ? by - cell * 6.6 : by - cell * 0.35;
    panel(nx, ny, pw, cell * (portrait ? 5.6 : 10.5), 'NEXT');
    queue.slice(0, portrait ? 1 : 3).forEach((type, i) => {
      const cells = ROT[type][0], xs = cells.map(([x]) => x), ys = cells.map(([, y]) => y), k = i ? 0.7 : 1, s = cell * k;
      const ox = nx + pw / 2 - ((Math.max(...xs) + Math.min(...xs) + 1) / 2) * s, oy = ny + cell * (1.6 + i * 3) + (2 - (Math.max(...ys) - Math.min(...ys) + 1)) * s / 2 - Math.min(...ys) * s;
      cells.forEach(([x, y]) => { const sp = sprites[type]; c.drawImage(sp.canvas, ox + x * s - sp.pad * k, oy + y * s - sp.pad * k, sp.size * k, sp.size * k); });
    });
    // Score panel.
    const sx = portrait ? bx - cell * 0.35 : bx - pw - cell * 1.2, sy = portrait ? by - cell * 6.6 : by - cell * 0.35;
    panel(sx, sy, pw, cell * (portrait ? 5.6 : 10.5));
    const rows = [['SCORE', score.toLocaleString('en-US')], ['LINES', lines], ['LEVEL', level], ['BEST', best.toLocaleString('en-US')]];
    rows.forEach(([label, value], i) => {
      const y = sy + cell * (0.5 + i * (portrait ? 1.25 : 2.5));
      c.textAlign = 'left'; c.textBaseline = 'top';
      c.fillStyle = rgba(accent(), 0.9); c.font = `600 ${Math.round(cell * 0.42)}px "Segoe UI", sans-serif`; c.fillText(label, sx + cell * 0.45, y);
      c.fillStyle = '#f1ecff'; c.font = `300 ${Math.round(cell * (portrait ? 0.5 : 0.85))}px "Segoe UI", sans-serif`;
      if (portrait) { c.textAlign = 'right'; c.fillText(String(value), sx + pw - cell * 0.45, y); } else c.fillText(String(value), sx + cell * 0.45, y + cell * 0.55);
    });
  }
  function draw() {
    if (!w) return;
    const time = t;
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    buildSprites();
    // A short shake on a four-line clear.
    const shake = banners.some(b => b.big && b.life > 1.3) && !reduced ? Math.sin(t * 117) * cell * 0.12 : 0;
    background(reduced ? 0 : time);
    c.save(); c.translate(shake, shake * 0.6); drawBoard(time); drawSide(); c.restore();
    // Locks send a brief pulse down the cabinet's two illuminated rails.
    if (!reduced) impacts.forEach(p => {
      c.strokeStyle = rgba(p.color, p.life * 0.7); c.lineWidth = cell * 0.06;
      for (const x of [bx - cell * 0.5, bx + COLS * cell + cell * 0.5]) {
        const y = by + Math.max(0, Math.min(20, p.y)) * cell;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, Math.min(by + 20 * cell, y + (1 - p.life) * cell * 7)); c.stroke();
      }
    });
    if (on(settings.stats)) {
      c.textBaseline = 'top'; c.font = `600 ${Math.max(10, Math.round(cell * 0.32))}px "Segoe UI", sans-serif`;
      c.fillStyle = rgba(accent(), 0.8); c.textAlign = 'left';
      c.fillText(`GAME ${String(games).padStart(2, '0')}`, bx, by + 20.65 * cell);
      c.textAlign = 'right'; c.fillText(`${pieces} BLOCKS / AUTO PLAY`, bx + COLS * cell, by + 20.65 * cell);
    }
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.hypot(w, h) * 0.65);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
  }

  function resize() {
    w = innerWidth; h = innerHeight; ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2073600 / (w * h)));
    canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); layout(); spriteKey = '';
  }
  function stop() { clearTimeout(timer); cancelAnimationFrame(frame); last = 0; }
  function animate(now) {
    if (paused || document.hidden) { stop(); return; }
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; t += dt; last = now;
    const start = performance.now(); update(dt); draw();
    timer = setTimeout(() => frame = requestAnimationFrame(animate), Math.max(0, 1000 / fps - (performance.now() - start) - 4));
  }
  function start() { stop(); if (!paused && !document.hidden) frame = requestAnimationFrame(animate); }
  addEventListener('resize', () => { resize(); draw(); }); document.addEventListener('visibilitychange', start);
  window.seeWallpaper?.onSettingsChanged(value => { settings = { ...settings, ...value }; spriteKey = ''; draw(); });
  window.seeWallpaper?.onPause(() => { paused = true; stop(); }); window.seeWallpaper?.onResume(() => { paused = false; start(); });
  window.seeWallpaper?.onPerformanceChanged(value => { fps = Math.max(1, Math.min(reduced ? 15 : 60, Number(value) || 30)); start(); });
  resize(); reset();
  if (preview !== null) {
    // Deterministic still: play the requested number of seconds instantly.
    paused = true; const target = Number(preview) || 12;
    for (let s = 0; s < target; s += 1 / 30) { t = s; update(1 / 30); }
    t = target; draw();
  } else start();
})();
