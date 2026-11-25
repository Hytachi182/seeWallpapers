/* Harvest Hollow: an original code-drawn farm that runs itself. Pixel art, a seeded simulation and no external assets or network requests. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), main = canvas.getContext('2d', { alpha: false });
  let c = main; // the active 2D context; the static layer is built by temporarily pointing this at an off-screen canvas
  const api = window.seeWallpaper, reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(location.search), preview = params.has('preview');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), on = v => v !== false && v !== 'false' && v !== 0;
  const mix = (a, b, t) => a + (b - a) * t, mixc = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const mod = (a, b) => ((a % b) + b) % b, TAU = Math.PI * 2, WHITE = [255, 255, 255];
  const hash = n => { const k = Math.sin(n * 127.1 + 311.7) * 43758.5453; return k - Math.floor(k); };
  const css = (a, alpha = 1) => `rgba(${a[0] | 0},${a[1] | 0},${a[2] | 0},${clamp(alpha, 0, 1).toFixed(3)})`;
  // Randomness inside the simulation comes only from this seeded PRNG, consumed in step(), so equal settings replay identically.
  let seed = 20240611;
  const rand = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), seed | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  let settings = { speed: 1, dayLength: 90, seasons: true, startSeason: 0, animals: true, hud: true, ...api?.getSettings?.() };
  const num = (key, fallback, a, b) => Number.isFinite(Number(settings[key])) ? clamp(Number(settings[key]), a, b) : fallback;
  const flag = key => on(settings[key]);
  const speed = () => num('speed', 1, 0, 2), dayLen = () => num('dayLength', 90, 30, 240);
  const startSeason = () => Math.round(num('startSeason', 0, 0, 3));

  // ---- palettes ----
  const SEASONS = [
    { name: 'Spring', grass: [132, 192, 88], dark: [114, 174, 76], tuft: [176, 220, 128], canopy: [[124, 194, 96], [98, 168, 78], [166, 220, 126]], trunk: [104, 72, 50], shadow: [40, 70, 36], flowers: [[255, 236, 140], [250, 176, 214], [255, 250, 240]] },
    { name: 'Summer', grass: [104, 166, 70], dark: [88, 148, 58], tuft: [138, 192, 94], canopy: [[54, 130, 64], [38, 106, 52], [74, 152, 80]], trunk: [98, 66, 46], shadow: [30, 60, 30], flowers: [[255, 120, 80], [255, 236, 120]] },
    { name: 'Autumn', grass: [170, 150, 72], dark: [148, 126, 60], tuft: [198, 174, 88], canopy: [[226, 126, 48], [196, 88, 38], [244, 180, 74]], trunk: [96, 64, 44], shadow: [70, 54, 30], flowers: [[210, 96, 60]] },
    { name: 'Winter', grass: [226, 236, 240], dark: [204, 218, 228], tuft: [246, 250, 252], canopy: [[238, 244, 250], [210, 222, 234], [252, 254, 255]], trunk: [84, 68, 60], shadow: [120, 140, 160], flowers: [], snow: true }
  ];
  const WATER = [70, 146, 200], WATER_DEEP = [52, 118, 174], ICE = [178, 216, 236], SHORE = [218, 200, 146], SNOW = [250, 252, 255];
  const PATH = [210, 180, 124], SOIL = [142, 98, 64], WET = [96, 62, 42], FURROW = [104, 68, 44], STONE = [184, 180, 172];
  const WALL = [240, 220, 176], WALL_SHADE = [214, 188, 144], ROOF = [190, 76, 58], ROOF_DARK = [150, 54, 44], FRAME = [110, 74, 48];
  const WINDOW = [64, 84, 116], DOOR = [120, 72, 42], BRICK = [160, 70, 56], CRATE_WOOD = [184, 128, 72], CRATE_DARK = [134, 88, 46];
  const FENCE = [172, 122, 72], FENCE_DARK = [124, 82, 46];
  const FARMER_PAL = { H: '#e6b458', s: '#f2c6a2', e: '#2a1e1e', m: '#b86e64', b: '#3f78c2', p: '#5e4a3c', d: '#3c2a22', n: '#7a4a2a' };
  const CHICKEN_PAL = { W: '#f8f6ee', r: '#d83a3a', o: '#f0a834', y: '#e08a34' };

  // ---- the farm map, in design tiles (34 by 20), centred on the screen ----
  const DW = 34, DH = 20, DT = 1 / 30, SEASON_DAYS = 3;
  const DOOR_TILE = [5, 5], PORCH = [6, 6], CRATE = [26, 12], CRATE_STAND = [25, 12], FISH_SPOT = [25, 4];
  const inPond = (x, y) => ((x + 0.5 - 28.5) / 2.9) ** 2 + ((y + 0.5 - 4.5) / 2.7) ** 2 <= 1;
  const nearPond = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([a, b]) => inPond(x + a, y + b));
  const PLOTS = [];
  for (const y of [9, 11, 13, 15]) for (const x of [11, 13, 15, 17, 19, 21]) PLOTS.push({ x, y, state: 'grass', crop: null, wetUntil: 0 });
  const TREES = [[1, 0], [1, 2], [0, 6], [2, 10], [1, 14], [12, 1], [18, 2], [22, 3], [29, 1], [33, 4], [32, 11], [33, 15]];
  const isPlot = (x, y) => PLOTS.some(p => p.x === x && p.y === y);
  const isTree = (x, y) => TREES.some(([a, b]) => a === x && b === y);
  const isPath = (x, y) => (x === 5 && y >= 6 && y <= 12) || (y === 12 && x >= 5 && x <= 25);
  const blocked = (x, y) => {
    if (x < 0 || y < 0 || x >= DW || y >= DH) return true;
    if (x >= 3 && x <= 8 && y <= 4) return true;                         // farmhouse
    if (y === 5 && x >= 3 && x <= 8 && x !== DOOR_TILE[0]) return true;  // wall foot, the door is walkable
    if (inPond(x, y) || isPlot(x, y) || isTree(x, y)) return true;
    if ((x === 9 || x === 24) && y >= 7 && y <= 17 && y !== 12) return true; // fence sides, gates on row 12
    if ((y === 7 || y === 17) && x >= 9 && x <= 24) return true;             // fence top and bottom
    return x === CRATE[0] && y === CRATE[1];
  };
  const WALK = new Uint8Array(DW * DH);
  for (let y = 0; y < DH; y++) for (let x = 0; x < DW; x++) WALK[y * DW + x] = blocked(x, y) ? 0 : 1;
  // breadth-first routes over the walkable tiles
  function reach(sx, sy) {
    const dist = new Int16Array(DW * DH).fill(-1), par = new Int16Array(DW * DH), queue = [sy * DW + sx];
    dist[sy * DW + sx] = 0;
    for (let i = 0; i < queue.length; i++) {
      const k = queue[i], x = k % DW, y = (k - x) / DW;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= DW || ny >= DH) continue;
        const nk = ny * DW + nx;
        if (WALK[nk] && dist[nk] < 0) { dist[nk] = dist[k] + 1; par[nk] = k; queue.push(nk); }
      }
    }
    return { dist, par };
  }
  function routeTo(map, x, y) {
    let k = y * DW + x;
    if (map.dist[k] < 0) return null;
    const route = [];
    while (map.dist[k] > 0) { route.push([k % DW, (k - (k % DW)) / DW]); k = map.par[k]; }
    return route.reverse();
  }
  // the nearest walkable tile beside a plot: the farmer works from the aisle
  function standFor(map, p) {
    let best = null;
    for (const [x, y] of [[p.x, p.y - 1], [p.x, p.y + 1], [p.x - 1, p.y], [p.x + 1, p.y]]) {
      if (x < 0 || y < 0 || x >= DW || y >= DH) continue;
      const d = map.dist[y * DW + x];
      if (d >= 0 && (!best || d < best.d)) best = { x, y, d };
    }
    return best;
  }

  // ---- crops: each stage is a list of [x, y, w, h, colour key] rectangles on an 8 by 8 art grid ----
  const CROPS = {
    carrot: { grow: 1.6, value: 3, pal: { g: '#60b048', o: '#f0842c', w: '#faf8f0' }, art: [
      [[3, 5, 1, 2, 'g'], [2, 4, 1, 1, 'g'], [4, 4, 1, 1, 'g']],
      [[2, 3, 4, 4, 'g'], [3, 6, 2, 1, 'o']],
      [[1, 2, 6, 4, 'g'], [2, 0, 1, 1, 'w'], [5, 0, 1, 1, 'w'], [3, 1, 2, 1, 'w']],
      [[1, 1, 6, 4, 'g'], [3, 5, 2, 2, 'o'], [2, 5, 4, 1, 'o']]] },
    sunflower: { grow: 2.2, value: 4, pal: { g: '#54a040', G: '#387830', y: '#fccc32', d: '#5c3818' }, art: [
      [[3, 4, 1, 3, 'G'], [2, 4, 1, 1, 'g'], [4, 5, 1, 1, 'g']],
      [[3, 2, 2, 6, 'G'], [1, 3, 2, 2, 'g'], [5, 4, 2, 2, 'g']],
      [[2, 1, 4, 1, 'y'], [1, 2, 1, 4, 'y'], [6, 2, 1, 4, 'y'], [2, 6, 4, 1, 'y'], [2, 2, 4, 4, 'd']],
      [[1, 0, 6, 1, 'y'], [0, 1, 1, 6, 'y'], [7, 1, 1, 6, 'y'], [1, 7, 6, 1, 'y'], [2, 2, 4, 4, 'd']]] },
    pumpkin: { grow: 2.8, value: 6, pal: { g: '#58a03c', G: '#3c7c32', o: '#ec7826', O: '#bc5420', y: '#facd50', b: '#6e4c28' }, art: [
      [[3, 5, 2, 2, 'g'], [2, 6, 1, 1, 'G'], [5, 6, 1, 1, 'G']],
      [[0, 4, 8, 2, 'G'], [1, 3, 2, 2, 'g'], [5, 3, 2, 2, 'g']],
      [[1, 3, 6, 3, 'g'], [3, 1, 2, 2, 'y']],
      [[3, 0, 2, 2, 'b'], [1, 2, 6, 5, 'o'], [2, 2, 1, 4, 'O'], [5, 2, 1, 4, 'O']]] }
  };
  const CROP_PLAN = [['carrot', 'sunflower'], ['sunflower', 'pumpkin'], ['pumpkin', 'carrot']];
  const stageOf = prog => prog < 0.22 ? 0 : prog < 0.5 ? 1 : prog < 0.85 ? 2 : 3;
  function drawCrop(type, stage, x0, y0, s) {
    const k = CROPS[type];
    for (const [ax, ay, aw, ah, key] of k.art[stage]) { c.fillStyle = k.pal[key]; c.fillRect(Math.round(x0 + ax * s), Math.round(y0 + ay * s), aw * s, ah * s); }
  }

  // ---- sprites: strings of palette keys, one character per art pixel ----
  const HEAD = {
    front: ['..HHHHHH..', '.HHHHHHHH.', 'HHHHHHHHHH', '..ssssss..', '..sesses..', '..ssmmss..', '..bbbbbb..'],
    back: ['..HHHHHH..', '.HHHHHHHH.', 'HHHHHHHHHH', '..nnnnnn..', '..nnnnnn..', '..nnnnnn..', '..bbbbbb..'],
    side: ['..HHHHHH..', '.HHHHHHHH.', 'HHHHHHHHHH', '..ssssss..', '...sesss..', '...ssmss..', '..bbbbbb..']
  };
  const ARMS = {
    front: ['sbbbbbbbbs', 'sbbbbbbbbs', 'ssbbbbbbss'],
    side: ['..bbbbbbs.', '..bbbbbbs.', '..bbbbbbss']
  };
  const LEGS = { // stand, step, pass
    front: [['..pppppp..', '..pp..pp..', '..pp..pp..', '..dd..dd..'], ['..pppppp..', '..pp..pp..', '..pp..pp..', '.dd....dd.'], ['..pppppp..', '..pp..pp..', '..pp..pp..', '...dd.dd..']],
    side: [['...pppp...', '...pp.p...', '...pp.p...', '...dd.d...'], ['...pppp...', '..pp.pp...', '..pp.pp...', '..dd.dd...'], ['...pppp...', '...pp.pp..', '...pp.pp..', '...dd.dd..']]
  };
  const CHICKEN = ['...r...', '..WWW..', '.WWWWWo', '.WWWWW.', '..WWW..', '..y.y..'];
  function drawRows(rows, pal, x0, y0, s, flip) {
    rows.forEach((row, r) => {
      for (let i = 0; i < row.length; i++) {
        const col = pal[row[i]];
        if (!col) continue;
        const ix = flip ? row.length - 1 - i : i;
        c.fillStyle = col;
        c.fillRect(Math.round(x0 + ix * s), Math.round(y0 + r * s), s, s);
      }
    });
  }

  // ---- simulation state ----
  const farmer = { x: DOOR_TILE[0], y: DOOR_TILE[1], dir: 'down', walk: 0, mode: 'home', job: null, t: 0, carry: [], tidyDay: -1 };
  const chickens = [{ x: 8, y: 18.6, tx: 8, ty: 18.6, wait: 1.5, face: 1 }, { x: 19, y: 19, tx: 19, ty: 19, wait: 3.5, face: -1 }, { x: 27, y: 18.4, tx: 27, ty: 18.4, wait: 5, face: 1 }];
  const WALK_SPEED = 3.2, CHICKEN_SPEED = 0.9;
  const DUR = { till: 1.2, plant: 0.8, water: 1.3, harvest: 0.9, deliver: 1.0, fish: 9, tidy: 3.2, rest: 3, home: 0 };
  let simT = 0, coins = 0, parts = [], popups = [], pops = [];
  const dayOf = t => Math.floor(t / dayLen());
  const fracOf = t => mod(t, dayLen()) / dayLen();
  const seasonOf = day => flag('seasons') ? (startSeason() + Math.floor(day / SEASON_DAYS)) % 4 : startSeason();
  const isDay = fr => fr >= 0.2 && fr < 0.74;
  const nightOf = fr => fr >= 0.74 && fr < 0.84 ? (fr - 0.74) / 0.1 : fr >= 0.84 || fr < 0.12 ? 1 : fr < 0.2 ? (0.2 - fr) / 0.08 : 0;

  function planJob() {
    const f = farmer, day = dayOf(simT), season = seasonOf(day), map = reach(Math.round(f.x), Math.round(f.y));
    const make = (type, plot, goal) => { const path = routeTo(map, goal[0], goal[1]); return path ? { type, plot, goal, path, t: 0, dur: DUR[type] } : null; };
    const field = (type, p) => { const s = standFor(map, p); return s ? make(type, p, [s.x, s.y]) : null; };
    const pick = (test, type) => { for (const p of PLOTS) { const j = test(p) ? field(type, p) : null; if (j) return j; } return null; };
    const deliver = () => make('deliver', null, CRATE_STAND);
    if (!isDay(fracOf(simT))) return f.carry.length ? deliver() : make('home', null, DOOR_TILE);
    if (f.carry.length >= 3) return deliver();
    const harvest = pick(p => p.crop && p.crop.prog >= 1, 'harvest');
    if (harvest) return harvest;
    if (f.carry.length) return deliver();
    if (season === 3) return (f.tidyDay === day ? make('fish', null, FISH_SPOT) : make('tidy', null, CRATE_STAND)) || make('rest', null, PORCH);
    return pick(p => p.crop && p.wetUntil <= simT, 'water') || pick(p => p.state === 'tilled', 'plant') || pick(p => p.state === 'grass', 'till')
      || make('rest', null, PORCH) || { type: 'rest', plot: null, goal: PORCH, path: [], t: 0, dur: 2 };
  }

  function faceTo(x, y) {
    const f = farmer, dx = x - f.x, dy = y - f.y;
    if (Math.abs(dx) > Math.abs(dy)) f.dir = dx > 0 ? 'right' : 'left';
    else f.dir = dy > 0 ? 'down' : 'up';
  }
  function walkStep(j, dt) {
    const f = farmer, [tx, ty] = j.path[0], dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy), s = WALK_SPEED * dt;
    if (Math.abs(dx) >= Math.abs(dy)) { if (dx) f.dir = dx > 0 ? 'right' : 'left'; } else f.dir = dy > 0 ? 'down' : 'up';
    if (d <= s) { f.x = tx; f.y = ty; j.path.shift(); f.walk += d; }
    else { f.x += dx / d * s; f.y += dy / d * s; f.walk += s; }
  }
  const spawn = (x, y, vx, vy, life, col) => parts.push({ x, y, vx, vy, life, col });
  function actEffects(j, dt) {
    const p = j.plot, cx = p ? p.x + 0.5 : 0, cy = p ? p.y + 0.5 : 0;
    if (j.type === 'till' && rand() < dt * 16) spawn(cx + (rand() - 0.5) * 0.8, cy + (rand() - 0.5) * 0.8, (rand() - 0.5) * 1.4, -1 - rand() * 1.2, 0.5, [120, 82, 52]);
    if (j.type === 'plant' && rand() < dt * 8) spawn(cx + (rand() - 0.5) * 0.6, cy + (rand() - 0.5) * 0.6, 0, -0.5, 0.6, [236, 214, 150]);
    if (j.type === 'water' && rand() < dt * 22) spawn(cx + (rand() - 0.5) * 0.5, cy - 0.7, 0, 2.6, 0.35, [120, 186, 240]);
    if (j.type === 'tidy' && rand() < dt * 30) spawn(CRATE_STAND[0] - rand() * 3.5, CRATE_STAND[1] + 0.5 + (rand() - 0.5) * 0.8, -1 - rand(), -0.4, 0.6, [240, 246, 252]);
  }
  function finish(j) {
    const f = farmer, p = j.plot, day = dayOf(simT);
    if (j.type === 'till') p.state = 'tilled';
    else if (j.type === 'plant') { const plan = CROP_PLAN[Math.min(seasonOf(day), 2)]; p.state = 'planted'; p.crop = { type: plan[(PLOTS.indexOf(p) + day) % 2], prog: 0 }; }
    else if (j.type === 'water') p.wetUntil = simT + dayLen() * 2; // soil stays wet two days, which leaves the farmer time to work the whole field
    else if (j.type === 'harvest') { pops.push({ x: p.x + 0.5, y: p.y + 0.5, type: p.crop.type, t: 0 }); f.carry.push(p.crop.type); p.crop = null; p.state = 'tilled'; }
    else if (j.type === 'deliver') {
      const sum = f.carry.reduce((s, k) => s + CROPS[k].value, 0);
      coins += sum; f.carry = [];
      if (sum) popups.push({ x: CRATE[0] + 0.5, y: CRATE[1] + 0.1, text: `+${sum}`, t: 0 });
    }
    else if (j.type === 'fish') { coins += 2; popups.push({ x: FISH_SPOT[0] + 1.5, y: FISH_SPOT[1] + 0.2, text: '+2', t: 0 }); }
    else if (j.type === 'tidy') f.tidyDay = day;
  }
  function stepFarmer(dt) {
    const f = farmer;
    if (f.mode === 'home') { if (isDay(fracOf(simT))) { f.mode = 'emerge'; f.x = DOOR_TILE[0]; f.y = DOOR_TILE[1]; f.dir = 'down'; f.t = 1.2; } return; }
    if (f.mode === 'emerge') { f.t -= dt; if (f.t <= 0) f.mode = 'work'; return; }
    if (!f.job) f.job = planJob();
    const j = f.job;
    if (j.path.length) { walkStep(j, dt); return; }
    if (j.type === 'home') { f.mode = 'home'; f.job = null; return; }
    if (j.plot) faceTo(j.plot.x, j.plot.y);
    else if (j.type === 'fish') f.dir = 'right';
    j.t += dt;
    actEffects(j, dt);
    if (j.t >= j.dur) { finish(j); f.job = null; }
  }
  function stepChickens(dt) {
    for (const ch of chickens) {
      if (ch.wait > 0) { ch.wait -= dt; continue; }
      const dx = ch.tx - ch.x, dy = ch.ty - ch.y, d = Math.hypot(dx, dy), s = CHICKEN_SPEED * dt;
      if (d <= s) { ch.x = ch.tx; ch.y = ch.ty; ch.wait = 1.2 + rand() * 3; ch.tx = 1.5 + rand() * 30; ch.ty = 18.4 + rand() * 0.8; }
      else { ch.x += dx / d * s; ch.y += dy / d * s; ch.face = dx < 0 ? -1 : 1; }
    }
  }
  function step(dt) {
    simT += dt;
    stepFarmer(dt);
    if (flag('animals')) stepChickens(dt);
    const winter = seasonOf(dayOf(simT)) === 3, rate = 1 / dayLen();
    for (const p of PLOTS) if (p.crop) p.crop.prog = Math.min(1, p.crop.prog + (winter ? 0 : (p.wetUntil > simT ? 1 : 0.12)) * rate / CROPS[p.crop.type].grow * dt);
    parts = parts.filter(q => (q.life -= dt) > 0);
    for (const q of parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 3 * dt; }
    pops = pops.filter(q => (q.t += dt) < 0.9);
    popups = popups.filter(q => (q.t += dt) < 1.8);
  }
  // Fixed steps from t = 0, so a given time always produces the same scene.
  function advance(target) { const n = Math.round(target / DT); for (let i = 0; i < n; i++) step(DT); }

  // ---- layout and drawing helpers ----
  let w = 1, h = 1, T = 10, PX = 1, ox = 0, oy = 0;
  const X = x => ox + x * T, Y = y => oy + y * T;
  const R = (x, y, rw, rh, col) => { c.fillStyle = typeof col === 'string' ? col : css(col); c.fillRect(Math.round(x), Math.round(y), Math.round(rw), Math.round(rh)); };
  function layout() {
    T = Math.max(4, Math.floor(Math.min(w / DW, h / DH)));
    PX = Math.max(1, Math.floor(T / 10));
    ox = Math.round((w - DW * T) / 2); oy = Math.round((h - DH * T) / 2);
  }

  function tree(x, y, S, n) {
    const cx = x + T / 2, base = y + T * 0.8;
    R(cx - T * 0.07, y + T * 0.42, T * 0.14, T * 0.42, S.trunk);
    c.fillStyle = css(S.shadow, 0.35); c.beginPath(); c.ellipse(cx, base + T * 0.08, T * 0.36, T * 0.12, 0, 0, TAU); c.fill();
    [[0, -0.42, 0.36], [-0.24, -0.08, 0.3], [0.24, -0.08, 0.3], [0, 0.04, 0.3]].forEach(([dx, dy, r], i) => {
      const col = S.canopy[(i + n) % 3], bx = cx + dx * T, by = y + T * 0.5 + dy * T, rr = r * T;
      c.fillStyle = css(col); c.beginPath(); c.arc(bx, by, rr, 0, TAU); c.fill();
      c.fillStyle = css(mixc(col, WHITE, 0.28)); c.beginPath(); c.arc(bx - rr * 0.3, by - rr * 0.32, rr * 0.45, 0, TAU); c.fill();
    });
  }
  function bush(x, y, S) {
    c.fillStyle = css(S.canopy[1]);
    for (const [dx, dy, r] of [[0.35, 0.62, 0.22], [0.62, 0.6, 0.2], [0.5, 0.45, 0.2]]) { c.beginPath(); c.arc(x + dx * T, y + dy * T, r * T, 0, TAU); c.fill(); }
  }
  function rock(x, y) { c.fillStyle = css([150, 146, 140]); c.beginPath(); c.ellipse(x + T * 0.5, y + T * 0.6, T * 0.22, T * 0.14, 0, 0, TAU); c.fill(); }
  function fences() {
    for (let x = 9; x <= 24; x++) for (const y of [7, 17]) {
      R(X(x), Y(y) + T * 0.3, T, T * 0.12, FENCE); R(X(x), Y(y) + T * 0.62, T, T * 0.12, FENCE_DARK);
      if ((x - 9) % 3 === 0) R(X(x) + T * 0.42, Y(y) + T * 0.1, T * 0.16, T * 0.85, FENCE_DARK);
    }
    for (let y = 7; y <= 17; y++) for (const x of [9, 24]) {
      if (y !== 12) { R(X(x) + T * 0.3, Y(y), T * 0.12, T, FENCE); R(X(x) + T * 0.62, Y(y), T * 0.12, T, FENCE_DARK); }
      if ((y - 7) % 3 === 0 || y === 12) R(X(x) + T * 0.42, Y(y) + T * 0.1, T * 0.16, T * 0.85, FENCE_DARK);
    }
  }
  function house(S) {
    R(X(7.3), Y(0.2), T * 0.5, T * 1.1, BRICK);
    R(X(3), Y(2), 6 * T, 3 * T, WALL); R(X(3), Y(4.75), 6 * T, T * 0.25, WALL_SHADE);
    for (const wx of [3.6, 6.6]) { R(X(wx), Y(2.6), T * 0.8, T * 0.9, FRAME); R(X(wx) + T * 0.1, Y(2.7), T * 0.6, T * 0.7, WINDOW); R(X(wx) + T * 0.38, Y(2.7), T * 0.06, T * 0.7, FRAME); }
    R(X(5.15), Y(3.7), T * 0.7, T * 1.15, DOOR); R(X(5), Y(5), T, T, STONE);
    c.fillStyle = css(ROOF); c.beginPath(); c.moveTo(X(2.4), Y(2.2)); c.lineTo(X(6), Y(0.1)); c.lineTo(X(9.6), Y(2.2)); c.closePath(); c.fill();
    R(X(2.4), Y(2.05), T * 7.2, T * 0.2, ROOF_DARK);
    if (S.snow) {
      c.fillStyle = css(SNOW); c.beginPath(); c.moveTo(X(3.7), Y(1.2)); c.lineTo(X(6), Y(0.1)); c.lineTo(X(8.3), Y(1.2)); c.closePath(); c.fill();
      R(X(2.4), Y(2.0), T * 7.2, T * 0.12, SNOW);
    }
  }
  function crate() {
    const x = X(CRATE[0]), y = Y(CRATE[1]);
    R(x + T * 0.12, y + T * 0.22, T * 0.76, T * 0.6, CRATE_WOOD);
    R(x + T * 0.12, y + T * 0.46, T * 0.76, T * 0.06, CRATE_DARK); R(x + T * 0.12, y + T * 0.7, T * 0.76, T * 0.06, CRATE_DARK);
    c.fillStyle = css([236, 128, 44]); for (const dx of [0.3, 0.52, 0.72]) { c.beginPath(); c.arc(x + dx * T, y + T * 0.24, T * 0.09, 0, TAU); c.fill(); }
  }

  // The static layer holds ground, paths, pond, fences, house, crate and trees. It is rebuilt only when size or season changes.
  let layer = null, layerKey = '';
  function buildLayer(S) {
    const i0 = Math.floor(-ox / T) - 1, i1 = Math.ceil((w - ox) / T) + 1, j0 = Math.floor(-oy / T) - 1, j1 = Math.ceil((h - oy) / T) + 1;
    const inside = (x, y) => x >= 0 && y >= 0 && x < DW && y < DH;
    for (let y = j0; y <= j1; y++) for (let x = i0; x <= i1; x++) {
      const n = hash(x * 12.9898 + y * 78.233), inn = inside(x, y), pond = inn && inPond(x, y);
      let base = n > 0.72 ? S.dark : S.grass;
      if (pond) base = S.snow ? ICE : (n > 0.5 ? WATER : WATER_DEEP);
      else if (inn && nearPond(x, y)) base = S.snow ? SNOW : SHORE;
      else if (inn && isPath(x, y)) base = PATH;
      R(X(x), Y(y), T, T, base);
      if (!pond && n < 0.25) { R(X(x) + T * 0.2, Y(y) + T * 0.55, PX, T * 0.22, S.tuft); R(X(x) + T * 0.26, Y(y) + T * 0.62, PX, T * 0.16, S.tuft); }
      if (inn && !blocked(x, y) && !isPath(x, y) && n > 0.93 && S.flowers.length) R(X(x) + T * 0.42, Y(y) + T * 0.42, T * 0.16, T * 0.16, S.flowers[Math.floor(n * 97) % S.flowers.length]);
    }
    if (!S.snow) for (const [x, y] of [[27, 5], [29, 3], [29, 5]]) { c.fillStyle = css([96, 170, 96]); c.beginPath(); c.ellipse(X(x) + T * 0.5, Y(y) + T * 0.5, T * 0.2, T * 0.13, 0, 0, TAU); c.fill(); }
    fences(); house(S); crate();
    for (let y = j0; y <= j1; y++) for (let x = i0; x <= i1; x++) {
      const n = hash(x * 4.7 + y * 9.1);
      if (inside(x, y)) { if (isTree(x, y)) tree(X(x), Y(y), S, Math.floor(n * 3)); }
      else if (n > 0.96) tree(X(x), Y(y), S, Math.floor(n * 30) % 3);
      else if (n > 0.92) bush(X(x), Y(y), S);
      else if (n < 0.05) rock(X(x), Y(y));
    }
  }
  function ensureLayer(season) {
    const key = [w, h, T, ox, oy, season].join('|');
    if (key === layerKey) return;
    layerKey = key;
    layer = document.createElement('canvas'); layer.width = w; layer.height = h;
    const prev = c; c = layer.getContext('2d', { alpha: false });
    buildLayer(SEASONS[season]);
    c = prev;
  }

  const glowCache = {};
  function glow(x, y, rad, rgb, alpha) {
    const key = rgb.join(',');
    if (!glowCache[key]) {
      const s = document.createElement('canvas'); s.width = s.height = 64;
      const g = s.getContext('2d'), rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      rg.addColorStop(0, css(rgb, 1)); rg.addColorStop(0.45, css(rgb, 0.35)); rg.addColorStop(1, css(rgb, 0));
      g.fillStyle = rg; g.fillRect(0, 0, 64, 64); glowCache[key] = s;
    }
    c.globalAlpha = clamp(alpha, 0, 1); c.drawImage(glowCache[key], x - rad, y - rad, rad * 2, rad * 2); c.globalAlpha = 1;
  }

  function drawPond(season) {
    if (season === 3) return;
    for (let i = 0; i < 4; i++) {
      const px = 27 + (i % 2) * 1.6 + hash(i) * 0.3, py = 3 + hash(i * 3.3) * 2.2, p = mod(simT * 0.35 + i / 4, 1);
      c.strokeStyle = css([220, 240, 255], (1 - p) * 0.8); c.lineWidth = Math.max(1, PX * 0.6);
      c.beginPath(); c.ellipse(X(px), Y(py), p * T * 0.5, p * T * 0.22, 0, 0, TAU); c.stroke();
    }
  }
  function drawPlot(p, S) {
    const x = X(p.x), y = Y(p.y), wet = p.wetUntil > simT;
    if (p.state === 'grass') { c.strokeStyle = css(S.tuft, 0.55); c.lineWidth = Math.max(1, PX * 0.5); c.strokeRect(x + 1, y + 1, T - 2, T - 2); }
    else {
      R(x, y, T, T, wet ? WET : SOIL);
      for (const k of [0.25, 0.5, 0.75]) R(x, y + k * T, T, Math.max(1, PX), css(FURROW, 0.5));
    }
    if (p.crop) { const o = (T - 8 * PX) / 2; drawCrop(p.crop.type, stageOf(p.crop.prog), x + o, y + o, PX); }
  }
  function drawChickens() {
    if (!flag('animals')) return;
    for (const ch of chickens) {
      const cx = X(ch.x), cy = Y(ch.y), s = PX, bob = ch.wait > 0 ? 0 : (Math.floor(simT * 8 + ch.x) % 2) * -0.5 * s;
      c.fillStyle = css([24, 40, 20], 0.25); c.beginPath(); c.ellipse(cx, cy + 3 * s, 3.5 * s, s, 0, 0, TAU); c.fill();
      drawRows(CHICKEN, CHICKEN_PAL, Math.round(cx - 3.5 * s), Math.round(cy - 3 * s + bob), s, ch.face < 0);
    }
  }
  function zzz() {
    for (let i = 0; i < 3; i++) {
      const k = mod(simT * 0.4 + i / 3, 1);
      c.globalAlpha = Math.sin(k * Math.PI) * 0.9; c.font = `bold ${Math.round(T * (0.3 + 0.12 * i))}px sans-serif`; c.fillStyle = '#f4f0ff';
      c.fillText('z', X(7.4) + k * T * 0.6, Y(1.4) - k * T * 1.2);
    }
    c.globalAlpha = 1;
  }
  function drawFarmer() {
    const f = farmer, t = simT, s = PX, cx = X(f.x + 0.5), feet = Y(f.y + 0.5) + T * 0.28;
    if (f.mode === 'home') { zzz(); return; }
    const job = f.job, moving = !!job && job.path.length > 0, dirKey = f.dir === 'up' ? 'back' : f.dir === 'down' ? 'front' : 'side';
    const stepIdx = Math.floor(f.walk * 4) % 4, li = moving ? [0, 1, 0, 2][stepIdx] : 0, bob = moving && stepIdx % 2 ? -0.6 * s : 0;
    const body = dirKey === 'side' ? 'side' : 'front';
    c.fillStyle = css([28, 46, 28], 0.28); c.beginPath(); c.ellipse(cx, feet, 4.2 * s, 1.1 * s, 0, 0, TAU); c.fill();
    drawRows([...HEAD[dirKey], ...ARMS[body], ...LEGS[body][li]], FARMER_PAL, Math.round(cx - 5 * s), Math.round(feet - 14 * s + bob), s, dirKey === 'side' && f.dir === 'left');
    if (f.carry.length) { const k = Math.max(1, Math.round(s * 0.6)); drawCrop(f.carry[0], 3, Math.round(cx - 4 * k), Math.round(feet - 14 * s - 8 * k + bob), k); }
    if (job && job.plot && job.path.length === 0) {
      const fx = f.dir === 'right' ? 1 : f.dir === 'left' ? -1 : 0, fy = f.dir === 'down' ? 1 : f.dir === 'up' ? -1 : 0;
      const hx = cx + fx * 0.5 * T, hy = feet - 0.55 * T + fy * 0.5 * T + Math.sin(job.t * 9) * 0.08 * T;
      if (job.type === 'till') { R(hx, hy - 0.6 * T, s, 0.9 * T, [126, 88, 52]); R(hx - 2 * s, hy + 0.3 * T, 4 * s, 1.5 * s, [150, 156, 160]); }
      else if (job.type === 'water') { R(hx - 2 * s, hy - 0.2 * T, 4 * s, 3 * s, [96, 150, 214]); R(hx + 2 * s, hy - 0.2 * T - s, 2 * s, s, [96, 150, 214]); }
      else if (job.type === 'plant') R(hx - 2 * s, hy - 0.2 * T, 4 * s, 3 * s, [204, 170, 110]);
    }
    if (job && job.type === 'fish' && job.path.length === 0) {
      const bx = X(FISH_SPOT[0] + 1.5), bite = mod(job.t, 3.2) > 2.6, by = Y(FISH_SPOT[1] + 0.5) + Math.sin(t * 2.2) * s * 0.6 + (bite ? s * 2 : 0);
      c.strokeStyle = css([120, 84, 52]); c.lineWidth = Math.max(1, s * 0.5);
      c.beginPath(); c.moveTo(cx + 0.3 * T, feet - 0.6 * T); c.lineTo(bx, by); c.stroke();
      R(bx - s, by - s * 0.5, 2 * s, 2 * s, [236, 70, 60]);
    }
  }

  function drawPops() {
    for (const q of pops) {
      const k = q.t / 0.9, lift = Math.sin(k * Math.PI) * 0.45 * T;
      c.globalAlpha = 1 - k * k;
      drawCrop(q.type, 3, X(q.x) - 4 * PX, Y(q.y) - 4 * PX - lift, PX);
    }
    c.globalAlpha = 1;
  }
  function fireflies(night, t) {
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const lum = Math.pow(Math.max(0, Math.sin(t * 1.9 + i * 2.9)), 3) * night;
      if (lum < 0.02) continue;
      const x = hash(i * 5.1) * DW + Math.sin(t * 0.23 + i * 1.7) * 1.6, y = 8.5 + hash(i * 7.3) * 10.5 + Math.cos(t * 0.19 + i * 2.3) * 0.9;
      glow(X(x), Y(y), T * (0.18 + lum * 0.14), [220, 255, 120], lum);
    }
    c.globalCompositeOperation = 'source-over';
  }
  function weather(season, t) {
    if (season === 2) for (let i = 0; i < 16; i++) {
      const fy = mod(hash(i * 1.7) + t * (0.03 + hash(i * 2.9) * 0.03), 1), fx = mod(hash(i * 3.3) + Math.sin(t * 0.5 + i) * 0.02 + t * 0.006 * (1 + hash(i)), 1);
      c.save(); c.translate(fx * w, fy * h); c.rotate(t * 0.8 + i);
      c.fillStyle = css(i % 2 ? [226, 120, 48] : [196, 80, 36], 0.9); c.fillRect(-PX * 1.2, -PX * 0.6, PX * 2.4, PX * 1.2);
      c.restore();
    }
    if (season === 3) for (let i = 0; i < 60; i++) {
      const fy = mod(hash(i * 1.1) + t * (0.02 + hash(i * 2.2) * 0.025), 1), fx = mod(hash(i * 4.4) + Math.sin(t * 0.35 + i) * 0.015, 1);
      c.fillStyle = css(WHITE, 0.85); c.beginPath(); c.arc(fx * w, fy * h, Math.max(1.2, PX * 0.5) * (0.6 + hash(i) * 0.8), 0, TAU); c.fill();
    }
  }
  function drawHud(fr, season) {
    if (!flag('hud')) return;
    const s = clamp(T / 40, 0.7, 1.6), pad = Math.round(10 * s), fs = Math.round(15 * s), lh = Math.round(fs * 1.45);
    const hh = Math.floor(fr * 24), mm = Math.floor((fr * 24 - hh) * 60);
    const lines = [`Day ${dayOf(simT) + 1} - ${SEASONS[season].name}`, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${isDay(fr) ? 'daylight' : 'night'}`, `Coins ${coins}`];
    c.font = `600 ${fs}px sans-serif`;
    const width = Math.max(...lines.map(l => c.measureText(l).width)) + pad * 2, height = lh * lines.length + pad * 1.2;
    c.fillStyle = 'rgba(24,28,40,0.62)'; c.fillRect(pad, pad, width, height);
    c.fillStyle = '#fff6e0'; c.textBaseline = 'top';
    lines.forEach((l, i) => c.fillText(l, pad * 2, pad + pad * 0.6 + i * lh));
  }
  function draw() {
    const t = simT, fr = fracOf(t), season = seasonOf(dayOf(t)), S = SEASONS[season], night = nightOf(fr);
    const dusk = Math.max(0, 1 - Math.abs(fr - 0.8) / 0.09) * 0.7 + Math.max(0, 1 - Math.abs(fr - 0.2) / 0.08) * 0.4;
    ensureLayer(season);
    c = main;
    c.drawImage(layer, 0, 0);
    drawPond(season);
    for (const p of PLOTS) drawPlot(p, S);
    drawPops();
    drawChickens();
    drawFarmer();
    if (night > 0.01) {
      c.fillStyle = css([14, 20, 64], 0.6 * night); c.fillRect(0, 0, w, h);
      if (dusk > 0) { c.fillStyle = css([255, 140, 80], 0.22 * dusk); c.fillRect(0, 0, w, h); }
      c.globalCompositeOperation = 'lighter';
      for (const wx of [4, 7]) glow(X(wx), Y(3.05), T * 1.1, [255, 200, 110], night * 0.85);
      c.globalCompositeOperation = 'source-over';
      fireflies(night, t);
    } else if (dusk > 0) { c.fillStyle = css([255, 140, 80], 0.22 * dusk); c.fillRect(0, 0, w, h); }
    weather(season, t);
    for (const q of popups) {
      const k = q.t / 1.8, x = X(q.x), y = Y(q.y) - q.t * T * 0.9;
      c.globalAlpha = clamp((1 - k) * 1.5, 0, 1); c.font = `bold ${Math.max(12, Math.round(T * 0.42))}px sans-serif`; c.textAlign = 'center';
      c.lineWidth = Math.max(2, PX); c.strokeStyle = 'rgba(20,24,30,0.75)'; c.strokeText(q.text, x, y);
      c.fillStyle = '#ffe27a'; c.fillText(q.text, x, y);
    }
    c.globalAlpha = 1; c.textAlign = 'start';
    drawHud(fr, season);
  }

  // ---- playback: fixed simulation steps, scaled by speed, drawn at the frame rate ----
  let paused = preview, fps = 30, last = 0, elapsed = 0, acc = 0, frame = 0;
  const moving = () => !reduced.matches && speed() > 0;
  const active = () => !paused && !document.hidden && moving();
  function tick(now) {
    if (!active()) { stop(); return; }
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now; elapsed += dt;
    if (elapsed + 1e-5 >= 1 / clamp(fps, 1, 60)) {
      acc += elapsed * speed(); elapsed = 0;
      let n = 0;
      while (acc >= DT && n < 12) { step(DT); acc -= DT; n++; }
      if (n === 12) acc = 0;
      draw();
    }
    frame = requestAnimationFrame(tick);
  }
  function stop() { cancelAnimationFrame(frame); frame = 0; last = 0; elapsed = 0; }
  function start() { stop(); if (active()) frame = requestAnimationFrame(tick); }
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 1920 / Math.max(1, innerWidth), 1080 / Math.max(1, innerHeight));
    w = canvas.width = Math.max(1, Math.round(innerWidth * ratio));
    h = canvas.height = Math.max(1, Math.round(innerHeight * ratio));
    layout(); layerKey = ''; draw();
  }
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', start);
  reduced.addEventListener?.('change', () => { draw(); start(); });
  api?.onSettingsChanged?.(value => { settings = { ...settings, ...value }; draw(); start(); });
  api?.onPause?.(() => { paused = true; stop(); });
  api?.onResume?.(() => { paused = false; start(); });
  api?.onPerformanceChanged?.(value => { fps = clamp(Number(value) || 30, 1, 60); start(); });
  advance(preview ? clamp(Number(params.get('preview')) || 0, 0, 3600) : dayLen() * 0.3);
  resize(); canvas.dataset.ready = 'true'; start();
})();
