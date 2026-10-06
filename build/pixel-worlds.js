/* Original offline pixel worlds. Source for generate-pixel-worlds.mjs. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  const api = window.seeWallpaper, id = document.body.dataset.scene;
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...api?.getSettings() };
  const preview = new URLSearchParams(location.search).get('preview');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const on = v => v !== false && v !== 'false' && v !== 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  let seed = preview !== null ? 640187 : Date.now() >>> 0;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  let time = 0, vw = 640, vh = 360, scale = 1, ox = 0, oy = 0, sparks = [];
  let paused = reduced, fps = 30, last = 0, accumulator = 0, timer = 0, frame = 0;
  const metrics = { completed: 0, actions: 0 };
  const rect = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function line(x, y, xx, yy, color, width = 1) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(Math.round(x), Math.round(y)); c.lineTo(Math.round(xx), Math.round(yy)); c.stroke(); }
  function text(value, x, y, color = '#f6e9ce', size = 9) { c.fillStyle = color; c.font = `${size}px monospace`; c.textBaseline = 'top'; c.fillText(value, x, y); }
  function burst(x, y, color, count = 12) { if (!on(settings.particles)) return; for (let i = 0; i < count && sparks.length < 100; i++) sparks.push({ x, y, vx: (random() - .5) * 75, vy: -random() * 60, life: .4 + random() * .5, color }); }
  const sprites = {
    person: ['..hhh..', '.hhhhh.', '..sss..', '..sds..', '.aaaaa.', 's.aaa.s', '..aaa..', '..b.b..', '.bb.bb.'],
    knight: ['..hhh..', '.hhhhh.', '.hdddh.', '..sss..', 'aaabaa.', 'aaabaa.', '..aaa..', '..b.b..', '.bb.bb.'],
    drone: ['.a...a.', 'aaa.aaa', '.hhhhh.', '..ddd..', '.hhhhh.', '..a.a..'],
    robot: ['.hhhhh.', '.hdddh.', '.hhhhh.', '..aaa..', 'haaaah.', '..aaa..', '..b.b..', '.bb.bb.'],
    tree: ['...aa...', '..aaaa..', '.aaaaaa.', 'aaaaaaaa', '..aaaa..', '...hh...', '...hh...'],
    crystal: ['..d..', '.ddd.', 'ddadd', '.aaa.', '..a..']
  };
  function sprite(kind, x, y, accent, s = 2, step = 0) {
    const palette = { a: accent, h: kind === 'tree' ? '#8b6746' : '#bac5bd', s: '#ecc594', d: '#142d3a', b: '#384b56' };
    sprites[kind].forEach((row, j) => [...row].forEach((p, i) => { if (p !== '.') rect(x + i * s, y + j * s + (j > 6 ? Math.sin(step + i) * .7 : 0), s, s, palette[p]); }));
  }
  function stars(color = '#a1bac6') { for (let i = 0; i < 60; i++) rect((i * 137 + 19) % 640, (i * 53 + 9) % 205, i % 7 === 0 ? 2 : 1, 1, color); }
  function mountain(x, y, width, height, color) { for (let j = 0; j < height; j += 4) rect(x + width / 2 - j * width / height / 2, y + j, j * width / height, 4, color); }
  function cloud(x, y, color) { rect(x, y + 5, 44, 8, color); rect(x + 8, y, 21, 13, color); rect(x + 29, y + 3, 10, 10, color); }
  function ground(y, top = '#6c9a76', soil = '#354b48') { rect(0, y, 640, 360 - y, soil); rect(0, y, 640, 5, top); for (let i = 0; i < 72; i++) rect(i * 47 % 640, y + 9 + i * 29 % Math.max(1, 350 - y), 3, 2, '#ffffff12'); }
  function hud(title, detail) { if (!on(settings.stats)) return; rect(16, 15, 608, 28, '#0c1729e8'); text(title.toUpperCase(), 26, 24, settings.color); c.textAlign = 'right'; text(detail, 614, 24); c.textAlign = 'left'; }

  function defender() {
    const turrets = [110, 310, 510].map(x => ({ x, cooldown: 0, angle: -.8 }));
    let drones = [], shots = [], wave = 0, remaining = 0, spawn = 0, delay = 0, kills = 0, shield = 100;
    function next() { wave++; remaining = 9 + Math.min(wave, 12) * 2; shield = 100; metrics.completed++; }
    next();
    return {
      update(dt) {
        if (remaining === 0 && drones.length === 0) { delay += dt; if (delay > 2.5) { delay = 0; next(); } }
        spawn -= dt;
        if (remaining > 0 && spawn <= 0) { remaining--; spawn = .55; drones.push({ x: 665, y: 95 + random() * 100, hp: 2, speed: 24 + Math.min(wave, 20) * 2 + random() * 12, phase: random() * 6 }); }
        for (const d of drones) d.x -= d.speed * dt;
        for (const t of turrets) {
          t.cooldown -= dt;
          const target = drones.filter(d => d.hp > 0).sort((a, b) => Math.hypot(a.x - t.x, a.y - 276) - Math.hypot(b.x - t.x, b.y - 276))[0];
          if (target) { const dx = target.x - t.x, dy = target.y - 276, dist = Math.hypot(dx, dy); t.angle = Math.atan2(dy, dx); if (t.cooldown <= 0 && dist < 310) { shots.push({ x: t.x, y: 276, target, life: 2 }); t.cooldown = .26; metrics.actions++; } }
        }
        for (const b of shots) { const dx = b.target.x - b.x, dy = b.target.y - b.y, d = Math.hypot(dx, dy); if (d < 320 * dt + 7) { b.life = 0; if (b.target.hp > 0) { b.target.hp--; burst(b.x, b.y, settings.color, 4); if (b.target.hp === 0) { kills++; burst(b.target.x, b.target.y, '#f5bc70'); } } } else { b.x += dx / d * 320 * dt; b.y += dy / d * 320 * dt; b.life -= dt; } }
        for (const d of drones) if (d.x < -20 && d.hp > 0) { shield = Math.max(0, shield - 8); d.hp = 0; }
        drones = drones.filter(d => d.hp > 0); shots = shots.filter(b => b.life > 0 && b.target.hp > 0);
      },
      draw() {
        rect(0, 0, 640, 360, '#0e182c'); stars(); rect(478, 60, 34, 34, '#607b9b'); rect(486, 63, 28, 29, '#0e182c');
        for (let i = 0; i < 18; i++) { const x = i * 39, h = 15 + i * 17 % 58; rect(x, 235 - h, 31, h, '#182c41'); rect(x + 5, 243 - h, 4, 3, '#365b68'); }
        ground(300, '#3e6873', '#152939'); rect(0, 310, 640, 2, settings.color);
        for (const t of turrets) { rect(t.x - 18, 291, 36, 9, '#68818b'); rect(t.x - 13, 276, 26, 17, '#315064'); rect(t.x - 8, 270, 16, 12, settings.color); line(t.x, 276, t.x + Math.cos(t.angle) * 25, 276 + Math.sin(t.angle) * 25, '#d3e4d6', 5); rect(t.x - 20, 325, 40, 3, '#35515c'); rect(t.x - 20, 325, 40 * shield / 100, 3, settings.color); }
        for (const d of drones) { sprite('drone', d.x - 7, d.y + Math.sin(time * 5 + d.phase) * 3, '#ed977a', 2); rect(d.x - 5, d.y + 16, d.hp * 5, 2, '#ed977a'); }
        for (const b of shots) rect(b.x, b.y, 3, 5, settings.color);
        hud('Pixel Defender', `WAVE ${wave} / DRONES ${kills} / SHIELD ${shield}%`);
      }, state: () => ({ wave, kills, shield, objects: drones.length + shots.length })
    };
  }

  function castle() {
    let units = [], arrows = [], health = 100, raid = 1, victories = 0, spawn = 0, cooldown = 0, phase = 0;
    return {
      update(dt) {
        if (phase > 0) { phase -= dt; if (phase <= 0) { raid++; health = 100; units = []; arrows = []; } return; }
        spawn -= dt; cooldown -= dt;
        if (spawn <= 0 && units.length < 16) { units.push({ x: -20, y: 280 + random() * 13, hp: 3, attack: random(), speed: 23 + random() * 10 }); spawn = 1.3; }
        for (const u of units) { if (u.x < 456) u.x += u.speed * dt; else { u.attack -= dt; if (u.attack <= 0) { health -= 3; u.attack = .65; metrics.actions++; burst(479, u.y, '#f5d392', 4); } } }
        if (cooldown <= 0 && units.length) { const target = units.reduce((a, b) => a.x > b.x ? a : b); arrows.push({ x: 526, y: 177, target, life: 3 }); cooldown = 1.8; }
        for (const a of arrows) { const dx = a.target.x - a.x, dy = a.target.y - a.y, d = Math.hypot(dx, dy); if (d < 180 * dt + 5) { a.target.hp--; a.life = 0; burst(a.x, a.y, '#d6ba90', 4); } else { a.x += dx / d * 180 * dt; a.y += dy / d * 180 * dt; a.life -= dt; } }
        units = units.filter(u => u.hp > 0); arrows = arrows.filter(a => a.life > 0);
        if (health <= 0) { health = 0; victories++; metrics.completed++; phase = 3; burst(497, 250, settings.color, 45); }
      },
      draw() {
        rect(0, 0, 640, 360, '#263343'); rect(81, 69, 42, 42, '#eccb91');
        mountain(-60, 112, 310, 150, '#394855'); mountain(125, 138, 290, 125, '#485662'); cloud((time * 4) % 740 - 60, 67, '#657177');
        ground(300, '#91a17b', '#45594d'); rect(0, 307, 480, 18, '#9c896c');
        for (let i = 0; i < 8; i++) sprite('tree', i * 61 + 5, 262, '#536b57', 3);
        rect(448, 206, 144, 94, '#a29b8b'); rect(444, 174, 37, 126, '#b5ad99'); rect(558, 174, 37, 126, '#b5ad99');
        for (let x = 444; x < 600; x += 19) rect(x, x < 481 || x > 550 ? 162 : 196, 12, 18, '#b5ad99');
        for (let y = 189; y < 300; y += 12) { line(444, y, 595, y, '#7d8076'); for (let x = 452 + (y % 24 ? 0 : 8); x < 592; x += 22) rect(x, y, 1, 11, '#8d8d7d'); }
        rect(492, 253, 34, 47, health === 0 ? '#302c31' : '#615046'); for (let x = 495; x < 526; x += 6) rect(x, 255, 2, 45, '#99826a');
        rect(460, 186, 7, 15, '#333f45'); rect(571, 186, 7, 15, '#333f45');
        line(574, 115, 574, 162, '#d7c8a6', 2); rect(576, 118, 23 + Math.sin(time * 4) * 3, 14, settings.color);
        for (const u of units) { sprite('knight', u.x, u.y - 18, settings.color, 2, time * u.speed / 4); rect(u.x + 14, u.y - 13, 5, 11, '#d9bb83'); line(u.x + 18, u.y - 10, u.x + 24, u.y - 20 + Math.sin(time * 8) * 6, '#d9e0d2', 2); }
        for (const a of arrows) line(a.x - 4, a.y - 4, a.x + 4, a.y + 4, '#f4ddb4', 2);
        rect(480, 223, 63, 3, '#535959'); rect(480, 223, 63 * health / 100, 3, settings.color);
        if (phase > 0) text('FORTRESS TAKEN', 466, 239, '#ffe0a4');
        hud('Castle Raid', `RAID ${raid} / GATE ${health}% / VICTORIES ${victories}`);
      }, state: () => ({ raid, victories, health, objects: units.length + arrows.length })
    };
  }

  function city() {
    let cars = Array.from({ length: 12 }, (_, i) => ({ x: i * 59, lane: i % 2, speed: 25 + random() * 18, color: ['#e5a67c', '#8cafaa', '#d5c4a0'][i % 3] }));
    const buildings = Array.from({ length: 13 }, (_, i) => ({ x: i * 51 - 5, h: 48 + random() * 93, color: ['#6a6b78', '#897575', '#556c75', '#918274'][i % 4] }));
    return {
      update(dt) { for (const car of cars) { car.x += car.speed * dt * (car.lane ? -1 : 1); if (car.x > 670) { car.x = -30; metrics.actions++; } if (car.x < -35) { car.x = 660; metrics.actions++; } } metrics.completed = Math.floor(time / 80); },
      draw() {
        const night = (Math.sin(time / 80 * Math.PI * 2 - .7) + 1) / 2;
        rect(0, 0, 640, 360, night > .55 ? '#263854' : '#99b1b7');
        c.globalAlpha = night; stars('#d9dac7'); c.globalAlpha = 1;
        rect(526, 67, 23, 23, night > .55 ? '#eee0ae' : '#f2d4a0');
        for (let i = 0; i < 6; i++) cloud((i * 133 + time * 3) % 750 - 60, 72 + i % 3 * 20, night > .55 ? '#52647b' : '#d3d3c2');
        for (let i = 0; i < 22; i++) rect(i * 31, 185 - i * 13 % 50, 25, 160, night > .55 ? '#38495e' : '#7b949b');
        for (const [i, b] of buildings.entries()) { rect(b.x, 268 - b.h, 44, b.h, b.color); rect(b.x - 2, 263 - b.h, 48, 5, '#b4b0a0'); for (let yy = 277 - b.h; yy < 253; yy += 16) for (let xx = b.x + 5; xx < b.x + 39; xx += 12) { const lit = night > .35 && Math.sin(i * 7 + xx + yy + time * .12) > -.25; rect(xx, yy, 6, 9, lit ? '#edcb91' : '#374955'); rect(xx, yy + 9, 7, 1, '#c3b79c'); } rect(b.x + 17, 252, 10, 16, '#354653'); }
        ground(268, '#b5b3a0', '#344956'); rect(0, 280, 640, 49, '#3e4d59');
        for (let i = 0; i < 25; i++) rect(i * 28, 303, 14, 1, '#c8c3a4');
        for (const car of cars) { const y = car.lane ? 313 : 286; rect(car.x, y, 24, 10, car.color); rect(car.x + 5, y - 4, 12, 4, car.color); rect(car.x + 6, y - 3, 9, 4, '#bad0cf'); rect(car.x + 3, y + 8, 4, 4, '#202e3d'); rect(car.x + 18, y + 8, 4, 4, '#202e3d'); rect(car.x + (car.lane ? 0 : 22), y + 3, 2, 3, '#ffe3ac'); }
        for (let i = 0; i < 9; i++) { const x = (i * 79 + time * 8) % 660 - 10; sprite('person', x, 250, i % 2 ? settings.color : '#d0b096', 1, time * 7); }
        for (let i = 0; i < 7; i++) { const x = i * 97 + 18; rect(x, 243, 2, 33, '#485a60'); rect(x - 3, 242, 8, 3, settings.color); if (night > .5) { c.globalAlpha = .14; rect(x - 9, 245, 20, 31, '#ffe0a0'); c.globalAlpha = 1; } }
        const rain = Math.floor(time / 24) % 3 === 1;
        if (rain && on(settings.particles)) for (let i = 0; i < 90; i++) { const x = (i * 79 - time * 24) % 690, y = (i * 43 + time * 145) % 340; line(x, y, x - 3, y + 7, '#bed4d580'); }
        hud('Tiny City', `${night > .55 ? 'NIGHT' : 'DAY'} / ${rain ? 'RAIN' : 'CLEAR'} / CYCLE ${metrics.completed + 1}`);
      }, state: () => ({ cycles: metrics.completed, traffic: metrics.actions, objects: cars.length + buildings.length })
    };
  }

  function dungeon() {
    // Rooms connect through a serpentine corridor; the explorer follows real walkable tiles.
    const cols = 29, rows = 13, tile = 18, left = 59, top = 73;
    let path = [], map = [], hero = {}, enemies = [], chests = [], floor = 0, loot = 0, wait = 0;
    function setup() {
      floor++; path = []; map = Array.from({ length: rows }, () => Array(cols).fill(0));
      for (let r = 1; r <= 11; r += 2) { const reverse = ((r - 1) / 2) % 2 === 1; for (let j = 1; j <= 27; j++) { const x = reverse ? 28 - j : j; path.push({ x, y: r }); map[r][x] = 1; } if (r < 11) { const x = reverse ? 1 : 27; path.push({ x, y: r + 1 }); map[r + 1][x] = 1; } }
      // Carved alcoves make rooms while retaining a deterministic connected route.
      for (let r = 2; r < 11; r += 2) for (let x = 3; x < 26; x++) if (x % 7 < 3) map[r][x] = 1;
      hero = { x: 1, y: 1, index: 0, health: 100 }; wait = 0;
      enemies = path.filter((_, i) => i > 10 && i % 23 === 0).map(p => ({ ...p, hp: 3 }));
      chests = path.filter((_, i) => i > 0 && i % 31 === 0).map(p => ({ ...p, open: false }));
    }
    setup();
    return {
      update(dt) {
        if (wait > 0) { wait -= dt; if (wait <= 0) setup(); return; }
        const next = path[hero.index + 1]; if (!next) { metrics.completed++; wait = 2; return; }
        const enemy = enemies.find(e => e.hp > 0 && e.x === next.x && e.y === next.y);
        if (enemy && Math.hypot(hero.x - next.x, hero.y - next.y) < 1.1) { enemy.hp -= dt * 4; hero.health = Math.max(25, hero.health - dt * 3); if (enemy.hp <= 0) { metrics.actions++; burst(left + next.x * tile, top + next.y * tile, '#eaa17b'); } return; }
        const dx = next.x - hero.x, dy = next.y - hero.y, d = Math.hypot(dx, dy), step = dt * 3.4;
        if (d <= step) { hero.x = next.x; hero.y = next.y; hero.index++; const chest = chests.find(p => !p.open && p.x === hero.x && p.y === hero.y); if (chest) { chest.open = true; loot++; metrics.actions++; burst(left + hero.x * tile, top + hero.y * tile, settings.color); } } else { hero.x += dx / d * step; hero.y += dy / d * step; }
      },
      draw() {
        rect(0, 0, 640, 360, '#171b28');
        for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const xx = left + x * tile, yy = top + y * tile; rect(xx, yy, tile - 1, tile - 1, map[y][x] ? ((x + y) % 3 ? '#464347' : '#504a4c') : '#292b39'); if (!map[y][x]) { rect(xx, yy, tile - 1, 3, '#3d3c48'); rect(xx + 8, yy + 3, 1, 13, '#222535'); } else rect(xx + 3, yy + 13, 6, 1, '#39383f'); }
        for (let i = 0; i < 6; i++) { const x = left + (4 + i * 4) * tile, y = top + (i % 2 ? 12 : 0) * tile; rect(x, y + 6, 4, 8, '#967354'); rect(x - 1, y + 3, 6, 4, Math.sin(time * 9 + i) > 0 ? '#edc27d' : '#df9465'); }
        for (const p of chests) { const x = left + p.x * tile + 3, y = top + p.y * tile + 5; rect(x, y, 12, 9, p.open ? '#5c5244' : '#ba8b58'); rect(x, y, 12, 2, '#e6bd79'); rect(x + 5, y + 2, 2, 5, settings.color); }
        for (const e of enemies) if (e.hp > 0) { const x = left + e.x * tile + 3, y = top + e.y * tile + 7; rect(x, y + Math.sin(time * 4) * 2, 12, 8, '#93828e'); rect(x + 2, y + 2, 2, 2, '#ffcb9c'); rect(x + 8, y + 2, 2, 2, '#ffcb9c'); }
        const exit = path[path.length - 1]; rect(left + exit.x * tile + 2, top + exit.y * tile + 2, 14, 14, settings.color); rect(left + exit.x * tile + 5, top + exit.y * tile + 5, 8, 8, '#343947');
        sprite('person', left + hero.x * tile + 2, top + hero.y * tile, settings.color, 2, time * 8);
        hud('Dungeon Loop', `FLOOR ${floor} / LOOT ${loot} / HP ${Math.ceil(hero.health)}`);
      }, state: () => ({ floor, loot, hero, objects: enemies.length + chests.length, map, path })
    };
  }

  function island() {
    const sites = [{ x: 246, y: 185 }, { x: 326, y: 160 }, { x: 408, y: 203 }, { x: 297, y: 246 }, { x: 188, y: 229 }];
    let houses = sites.map(p => ({ ...p, progress: 0 })), cycle = 1, hold = 0, wood = 0;
    const people = Array.from({ length: 8 }, (_, i) => ({ x: 160 + i * 37, y: 195 + i % 3 * 24, target: 0, phase: 'gather', load: 0, wait: i * .2 }));
    const trees = [{ x: 152, y: 180 }, { x: 455, y: 177 }, { x: 379, y: 134 }];
    return {
      update(dt) {
        if (houses.every(h => h.progress >= 1)) { hold += dt; if (hold > 15) { cycle++; houses.forEach(h => h.progress = 0); hold = 0; metrics.completed++; } }
        for (const [i, p] of people.entries()) {
          p.wait -= dt; if (p.wait > 0) continue;
          const home = houses.findIndex(h => h.progress < 1), target = p.phase === 'gather' ? trees[i % trees.length] : houses[home < 0 ? i % houses.length : home];
          const dx = target.x - p.x, dy = target.y + 12 - p.y, d = Math.hypot(dx, dy);
          if (d > 3) { p.x += dx / d * 22 * dt; p.y += dy / d * 22 * dt; }
          else if (p.phase === 'gather') { p.phase = 'build'; p.load = 1; p.wait = 1.2; wood++; metrics.actions++; burst(p.x, p.y, '#cca375', 4); }
          else { if (home >= 0) houses[home].progress = Math.min(1, houses[home].progress + .09); p.phase = 'gather'; p.load = 0; p.wait = .8; }
        }
      },
      draw() {
        rect(0, 0, 640, 360, '#2e6678');
        for (let i = 0; i < 64; i++) rect((i * 83 + time * (i % 2 ? 3 : -2) + 640) % 640, 62 + i * 41 % 290, 8 + i % 3 * 6, 1, '#6fa0a7');
        // Terraced island shoreline, drawn on a low-resolution pixel grid.
        for (let y = 105; y < 293; y += 4) { const radius = 210 * Math.sqrt(Math.max(0, 1 - ((y - 199) / 94) ** 2)); rect(320 - radius, y + 6, radius * 2, 4, '#cbb68a'); if (radius > 16) rect(332 - radius, y, radius * 2 - 24, 4, '#7f9a71'); }
        for (let i = 0; i < 45; i++) rect(156 + i * 71 % 330, 160 + i * 29 % 78, 3, 2, '#aec18a');
        rect(504, 216, 52, 8, '#ad926e'); for (let x = 507; x < 555; x += 8) rect(x, 216, 1, 8, '#786b58'); rect(548, 221, 3, 17, '#ad926e');
        for (const tree of trees) { sprite('tree', tree.x - 12, tree.y - 25, '#476f56', 4); rect(tree.x + 3, tree.y + 3, 5, 4, '#bfa077'); }
        for (const h of houses) { const height = Math.round(h.progress * 27); rect(h.x - 17, h.y + 13, 38, 4, '#c4b28d'); if (height) { rect(h.x - 15, h.y + 13 - height, 32, height, '#d0bd92'); rect(h.x - 12, h.y + 15 - height, 26, 2, '#efe0b3'); } if (h.progress >= 1) { for (let j = 0; j < 11; j++) rect(h.x - 20 + j, h.y - 14 - j, 44 - j * 2, 2, settings.color); rect(h.x - 4, h.y - 1, 8, 14, '#655e4d'); rect(h.x + 7, h.y - 8, 6, 6, '#648b87'); } else { rect(h.x - 17, h.y + 22, 38, 2, '#486952'); rect(h.x - 17, h.y + 22, 38 * h.progress, 2, settings.color); } }
        for (const p of [...people].sort((a, b) => a.y - b.y)) { sprite('person', p.x, p.y - 14, settings.color, 1.5, time * 7); if (p.load) rect(p.x + 9, p.y - 8, 5, 6, '#d8b783'); }
        const boatX = 320 + Math.cos(time * .08) * 255, boatY = 285 + Math.sin(time * .08) * 25; rect(boatX, boatY, 26, 6, '#b79a74'); rect(boatX + 8, boatY - 21, 2, 22, '#e8d9ad'); for (let j = 0; j < 17; j++) rect(boatX + 10, boatY - 20 + j, j * .7 + 2, 1, '#eee2bc');
        hud('Pixel Island', `SETTLEMENT ${cycle} / HOMES ${houses.filter(h => h.progress >= 1).length}/5 / WOOD ${wood}`);
      }, state: () => ({ cycle, wood, houses, objects: people.length + houses.length })
    };
  }

  function factory() {
    let robots = [], spawn = 0, produced = 0;
    const stations = [185, 324, 461];
    return {
      update(dt) {
        spawn -= dt; if (spawn <= 0 && robots.length < 12) { robots.push({ x: -30, stage: 0, work: 0 }); spawn = 3.2; }
        for (const r of robots) {
          if (r.stage < 3 && r.x >= stations[r.stage] - 7) { r.work += dt; if (r.work >= 1.1) { r.stage++; r.work = 0; r.x += 10; metrics.actions++; burst(r.x, 235, settings.color, 9); } }
          else r.x += 40 * dt;
          if (r.x > 645) { produced++; metrics.completed++; }
        }
        robots = robots.filter(r => r.x <= 645);
      },
      draw() {
        rect(0, 0, 640, 360, '#202c3a');
        for (let x = 0; x < 640; x += 64) { rect(x, 52, 2, 260, '#344554'); rect(x + 7, 65, 49, 68, '#2c3c49'); rect(x + 11, 69, 41, 2, '#718387'); }
        rect(0, 100, 640, 7, '#52636a'); rect(0, 104, 640, 2, '#94a09b');
        rect(0, 264, 640, 18, '#667679'); rect(0, 266, 640, 12, '#172b36');
        for (let i = 0; i < 55; i++) { const x = (i * 14 + time * 40) % 660 - 10; rect(x, 268, 8, 8, '#50656a'); rect(x + 2, 270, 4, 4, '#7d8d86'); }
        ground(311, '#617274', '#273844'); for (let i = 0; i < 13; i++) rect(i * 53, 333, 28, 2, '#60716b');
        for (const [i, x] of stations.entries()) { rect(x - 23, 285, 46, 26, '#42565e'); rect(x - 16, 294, 32, 4, settings.color); rect(x - 25, 115, 50, 28, '#758583'); rect(x - 16, 120, 32, 4, settings.color); const active = robots.find(r => r.stage === i && r.work > 0); const extension = active ? 24 + Math.sin(active.work * 10) * 7 : 0; rect(x - 6, 143, 12, 58 + extension, '#b4b9a8'); rect(x - 14, 195 + extension, 28, 7, '#596e70'); rect(x - 14, 201 + extension, 4, 12, '#b5c0ad'); rect(x + 10, 201 + extension, 4, 12, '#b5c0ad'); text(['CHASSIS', 'CORE', 'ACTIVATE'][i], x - 23, 80, '#d3d7c1', 8); }
        for (const r of robots) { rect(r.x - 12, 256, 24, 7, '#879992'); if (r.stage > 0) { rect(r.x - 8, 233, 16, 23, '#b0b7a6'); rect(r.x - 5, 236, 10, 10, r.stage > 1 ? settings.color : '#3a505a'); rect(r.x - 13, 237, 5, 14, '#7c928f'); rect(r.x + 8, 237, 5, 14, '#7c928f'); } if (r.stage > 1) { rect(r.x - 9, 217, 18, 14, '#bac7b4'); rect(r.x - 6, 221, 12, 4, r.stage > 2 ? settings.color : '#253e4c'); } if (r.stage === 3) { line(r.x, 217, r.x, 210, '#aebca8', 2); rect(r.x - 1, 207, 3, 3, settings.color); } }
        hud('Robot Factory', `ASSEMBLED ${produced} / ON BELT ${robots.length} / AUTO PRODUCTION`);
      }, state: () => ({ produced, robots, objects: robots.length })
    };
  }

  function climber() {
    let platforms = [{ x: 293, y: 280, width: 68 }], hero = { x: 319, y: 262, vx: 0, vy: 0, grounded: true }, camera = 0, highest = 0, jumps = 0;
    function extend() { while (platforms.length < 14) { const p = platforms[platforms.length - 1]; platforms.push({ x: clamp(p.x + (random() - .5) * 165, 164, 408), y: p.y - 45 - random() * 10, width: 58 + random() * 15 }); } }
    extend();
    return {
      update(dt) {
        const current = platforms.find(p => Math.abs(p.y - (hero.y + 18)) < 2) || platforms[0];
        const target = platforms.find(p => p.y < current.y - 3 && p.y > current.y - 70) || platforms[1];
        if (hero.grounded) { hero.grounded = false; hero.vy = -225; const landingTime = (225 + Math.sqrt(225 * 225 - 2 * 360 * (current.y - target.y))) / 360; hero.vx = (target.x + target.width / 2 - hero.x) / landingTime; jumps++; metrics.actions++; }
        const oldBottom = hero.y + 18; hero.vy += 360 * dt; hero.x += hero.vx * dt; hero.y += hero.vy * dt;
        if (hero.vy > 0) for (const p of platforms) if (oldBottom <= p.y && hero.y + 18 >= p.y && hero.x + 6 >= p.x && hero.x - 6 <= p.x + p.width) { hero.y = p.y - 18; hero.vy = 0; hero.grounded = true; burst(hero.x, p.y, settings.color, 4); break; }
        highest = Math.max(highest, 262 - hero.y); metrics.completed = Math.floor(highest / 250); camera += (Math.min(0, hero.y - 190) - camera) * Math.min(1, dt * 4);
        platforms = platforms.filter(p => p.y < camera + 390); extend();
        // Safe recovery if a slow frame or future course tuning causes a missed ledge.
        if (hero.y > camera + 355) { const p = platforms.find(p => p.y > camera + 190) || platforms[0]; hero.x = p.x + p.width / 2; hero.y = p.y - 18; hero.vy = 0; hero.grounded = true; }
      },
      draw() {
        rect(0, 0, 640, 360, '#253345'); stars('#a0b0bd'); rect(507, 73, 30, 30, '#d5c8a7');
        mountain(-40, 218, 240, 170, '#3a4b58'); mountain(431, 174, 260, 200, '#3a4b58');
        for (let i = 0; i < 5; i++) cloud((i * 149 + time * 5) % 740 - 60, 105 + i * 43 + camera * .04, '#526574');
        rect(150, 0, 340, 360, '#4c555f'); rect(160, 0, 320, 360, '#626a6d');
        const offset = ((-camera) % 16 + 16) % 16;
        for (let y = -16 + offset; y < 360; y += 16) { rect(160, y, 320, 1, '#424c59'); for (let x = 160 + (Math.round((y + camera) / 16) % 2 ? 0 : 20); x < 480; x += 40) rect(x, y, 1, 16, '#4c555f'); }
        for (let i = Math.floor(camera / 130) - 1; i < Math.floor(camera / 130) + 5; i++) { const y = i * 130 - camera; rect(305, y, 29, 40, '#253747'); rect(310, y + 5, 19, 27, '#aac0bc'); rect(318, y + 5, 3, 27, '#3d5058'); rect(310, y + 17, 19, 3, '#3d5058'); }
        for (const p of platforms) { const y = p.y - camera; rect(p.x - 3, y, p.width + 6, 5, '#d2bca0'); rect(p.x, y + 5, p.width, 5, '#8d8274'); rect(p.x + 6, y + 10, 6, 6, '#3a4b56'); rect(p.x + p.width - 12, y + 10, 6, 6, '#3a4b56'); sprite('crystal', p.x + p.width / 2 - 3, y - 18 + Math.sin(time * 3 + p.x) * 2, settings.color, 1); }
        sprite('person', hero.x - 7, hero.y - camera, settings.color, 2, time * 8);
        hud('Tower Climber', `HEIGHT ${Math.floor(highest)} / JUMPS ${jumps} / INFINITE ASCENT`);
      }, state: () => ({ highest, jumps, hero, camera, objects: platforms.length })
    };
  }

  const scenes = { 'pixel-defender': defender, 'castle-raid': castle, 'tiny-city': city, 'dungeon-loop': dungeon, 'pixel-island': island, 'robot-factory': factory, 'tower-climber': climber };
  const scene = scenes[id]();
  function update(dt) { time += dt; scene.update(dt); for (const p of sparks) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 90 * dt; } sparks = sparks.filter(p => p.life > 0); }
  function draw() { rect(0, 0, vw, vh, '#111d2d'); c.save(); c.translate(ox, oy); c.scale(scale, scale); c.beginPath(); c.rect(0, 0, 640, 360); c.clip(); scene.draw(); if (on(settings.particles)) { c.globalAlpha = .45; for (let i = 0; i < 16; i++) rect((i * 127 + time * 3) % 620 + 10, 70 + (i * 41 + time * 2) % 245, 1, 1, settings.color); for (const p of sparks) { c.globalAlpha = Math.min(1, p.life * 2); rect(p.x, p.y, 2, 2, p.color); } } c.globalAlpha = 1; c.restore(); }
  function resize() { vh = 360; vw = Math.max(160, Math.min(1920, Math.round(360 * innerWidth / Math.max(1, innerHeight)))); canvas.width = vw; canvas.height = vh; c.imageSmoothingEnabled = false; scale = Math.min(vw / 640, vh / 360); ox = (vw - 640 * scale) / 2; oy = (vh - 360 * scale) / 2; }
  function stop() { clearTimeout(timer); cancelAnimationFrame(frame); last = 0; accumulator = 0; }
  function animate(now) { if (paused || document.hidden) { stop(); return; } const dt = last ? Math.min(.15, (now - last) / 1000) : 0; last = now; accumulator += dt * clamp(Number(settings.speed) || 1, .3, 2); while (accumulator >= 1 / 60) { update(1 / 60); accumulator -= 1 / 60; } draw(); timer = setTimeout(() => { frame = requestAnimationFrame(animate); }, Math.max(0, 1000 / fps - 4)); }
  function start() { stop(); if (!paused && !document.hidden) frame = requestAnimationFrame(animate); }
  addEventListener('resize', () => { resize(); draw(); }); document.addEventListener('visibilitychange', start);
  api?.onSettingsChanged(v => { settings = { ...settings, ...v }; if (!on(settings.particles)) sparks = []; draw(); });
  api?.onPause(() => { paused = true; stop(); }); api?.onResume(() => { paused = false; start(); });
  api?.onPerformanceChanged(v => { fps = clamp(Number(v) || 30, 1, 60); start(); });
  resize();
  if (preview !== null || reduced) { const target = clamp(Number(preview ?? 12) || 0, 0, 120); for (let i = 0; i < target * 60; i++) update(1 / 60); paused = true; draw(); } else { draw(); start(); }
})();
