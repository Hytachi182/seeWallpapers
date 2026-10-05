/* Pirate Cove: the bundled illustration (artwork.jpg) animated with Canvas overlays and image warps. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...window.seeWallpaper?.getSettings?.() };
  let w, h, ratio = 1, t = 0, last = 0, frame = 0, timer = 0, paused = false, ready = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fps = reduced ? 15 : 30;
  const TAU = Math.PI * 2, rnd = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const tint = () => /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#ffb24d';
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const speed = () => num(settings.speed, 1), intensity = () => num(settings.intensity, 1), wind = () => Math.max(0, num(settings.wind, 1));
  function rgba(hex, a) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a))})`; }

  const art = new Image();
  art.onload = () => { ready = true; buildShip(); draw(); };
  art.src = 'artwork.jpg';

  // Normalized artwork coordinates (0..1), measured on the painting.
  const SUN = [0.16, 0.377];
  const SHIP = { x0: 0.262, x1: 0.368, y0: 0.425, y1: 0.745, pivot: [0.31, 0.7] };
  const FLAG = { x0: 0.815, x1: 0.975, y0: 0.03, y1: 0.32 };
  const CAPE = { x0: 0.905, x1: 1.0, y0: 0.42, y1: 0.68 };
  const SCARF = { x0: 0.877, x1: 0.925, y0: 0.29, y1: 0.34 };
  const LEAVES = { x0: 0.68, x1: 0.86, y0: 0.0, y1: 0.12 };
  const PLANTS = [{ x0: 0.905, x1: 1.0, y0: 0.6, y1: 0.77 }, { x0: 0.55, x1: 0.68, y0: 0.86, y1: 1.0 }];
  const LANTERN = [0.974, 0.186];
  const TOWN = [[0.6, 0.635], [0.62, 0.62], [0.57, 0.635], [0.66, 0.475], [0.64, 0.5], [0.6, 0.51], [0.55, 0.585], [0.67, 0.64], [0.54, 0.6], [0.63, 0.66], [0.585, 0.62], [0.65, 0.63]];
  const FALLS = [[0.088, 0.71, 0.82, 0.012], [0.658, 0.5, 0.585, 0.009], [0.52, 0.505, 0.55, 0.007]];

  // Cover-fit with a slow drifting zoom; portrait screens keep the pirate in view.
  let ox = 0, oy = 0, aw = 1, ah = 1, iw = 1672, ih = 941;
  function layout() {
    iw = art.naturalWidth || 1672; ih = art.naturalHeight || 941;
    const zoom = 1.035 + Math.sin(t * speed() * 0.04) * 0.012;
    const scale = Math.max(w / iw, h / ih) * zoom;
    aw = iw * scale; ah = ih * scale;
    const focus = w < h ? 0.9 : 0.5;
    ox = (w - aw) * focus + Math.sin(t * speed() * 0.027) * (aw - w) * 0.05;
    oy = (h - ah) * 0.5 + Math.cos(t * speed() * 0.021) * Math.max(0, ah - h) * 0.2;
    ox = Math.min(0, Math.max(w - aw, ox)); oy = Math.min(0, Math.max(h - ah, oy));
  }
  const X = nx => ox + nx * aw, Y = ny => oy + ny * ah, S = n => n * aw;

  function glow(x, y, r, color, alpha) {
    if (r <= 0 || alpha <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Redraws a region of the painting as a grid of cells, each displaced by fn(nx, ny).
  function warp(region, cols, rows, fn) {
    const { x0, x1, y0, y1 } = region, cw = (x1 - x0) / cols, ch = (y1 - y0) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const nx = x0 + i * cw, ny = y0 + j * ch, [dx, dy] = fn(nx + cw / 2, ny + ch / 2);
      c.drawImage(art, nx * iw, ny * ih, cw * iw, ch * ih, X(nx) + dx - 0.5, Y(ny) + dy - 0.5, S(cw) + 1, ch * ah + 1);
    }
  }
  const along = (v, a, b) => Math.min(1, Math.max(0, (v - a) / (b - a)));

  // The ship is cut out once with feathered edges, then rocked around its waterline.
  let ship = null;
  function buildShip() {
    const { x0, x1, y0, y1 } = SHIP, sw = Math.round((x1 - x0) * iw), sh = Math.round((y1 - y0) * ih);
    ship = document.createElement('canvas'); ship.width = sw; ship.height = sh;
    const s = ship.getContext('2d');
    s.drawImage(art, x0 * iw, y0 * ih, sw, sh, 0, 0, sw, sh);
    s.globalCompositeOperation = 'destination-in';
    const g = s.createRadialGradient(sw / 2, sh / 2, Math.min(sw, sh) * 0.32, sw / 2, sh / 2, Math.max(sw, sh) * 0.52);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    s.save(); s.translate(sw / 2, sh / 2); s.scale(1, sh / sw); s.translate(-sw / 2, -sh / 2); s.fillStyle = g; s.fillRect(-sw, -sh, sw * 3, sh * 3); s.restore();
  }
  function rockShip(time) {
    if (!ship) return;
    const [px, py] = SHIP.pivot, roll = Math.sin(time * 0.9) * 0.006 * (0.5 + wind() * 0.5), bob = Math.sin(time * 0.9 + 1.2) * S(0.0008);
    c.save(); c.translate(X(px), Y(py) + bob); c.rotate(roll); c.translate(-X(px), -Y(py));
    c.drawImage(ship, X(SHIP.x0), Y(SHIP.y0), S(SHIP.x1 - SHIP.x0), (SHIP.y1 - SHIP.y0) * ah); c.restore();
  }

  function cloth(time) {
    const gust = (0.7 + Math.sin(time * 0.6) * 0.3) * Math.min(1.8, 0.3 + wind());
    // Banner: pinned along its top, flapping more toward the torn end.
    warp(FLAG, 10, 14, (nx, ny) => { const k = along(ny, FLAG.y0, FLAG.y1) ** 1.2; return [S(0.004) * k * Math.sin(time * 2.6 - ny * 30) * gust, S(0.0015) * k * Math.sin(time * 3.1 - nx * 40) * gust]; });
    warp(CAPE, 9, 12, (nx, ny) => { const k = along(nx, CAPE.x0, CAPE.x1) ** 1.3; return [S(0.0012) * k * Math.sin(time * 2.2 - ny * 25) * gust, S(0.0026) * k * Math.sin(time * 3.2 - nx * 50) * gust]; });
    warp(SCARF, 6, 4, (nx) => { const k = along(nx, SCARF.x0, SCARF.x1); return [0, S(0.0018) * k * Math.sin(time * 5 - nx * 90) * gust]; });
    // Foliage sways from where it is attached.
    warp(LEAVES, 10, 5, (nx, ny) => { const k = along(ny, LEAVES.y0, LEAVES.y1); return [S(0.0018) * k * Math.sin(time * 1.4 + nx * 12) * gust, 0]; });
    PLANTS.forEach((p, i) => warp(p, 7, 7, (nx, ny) => { const k = 1 - along(ny, p.y0, p.y1); return [S(0.002) * k * k * Math.sin(time * 1.6 + nx * 15 + i) * gust, 0]; }));
  }

  function sun(time) {
    const x = X(SUN[0]), y = Y(SUN[1]), f = (0.85 + Math.sin(time * 0.5) * 0.12) * intensity();
    glow(x, y, S(0.07), '#fff2c6', 0.4 * f); glow(x, y, S(0.25), '#ff9a4a', 0.14 * f);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + time * 0.015, len = S(0.14 + rnd(i) * 0.18) * (0.8 + Math.sin(time * 0.6 + i * 1.7) * 0.2);
      c.save(); c.translate(x, y); c.rotate(a);
      const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, rgba('#ffe0aa', 0.1 * f)); g.addColorStop(1, rgba('#ffe0aa', 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -S(0.003)); c.lineTo(len, -S(0.01)); c.lineTo(len, S(0.01)); c.lineTo(0, S(0.003)); c.fill(); c.restore();
    }
  }
  // Glitter on the water: the sun's path, open-sea sparkles and the ship's wake.
  function sea(time) {
    for (let i = 0; i < 22; i++) {
      const ny = 0.45 + i * 0.01, wobble = Math.sin(time * 2 + i * 1.3) * 0.006, width = S(0.02 + Math.sin(time * 1.5 + i) * 0.006 + i * 0.002);
      c.fillStyle = rgba('#ffd59a', (0.2 - i * 0.007) * intensity()); c.fillRect(X(0.19 + wobble) - width / 2, Y(ny), width, Math.max(1, S(0.0015)));
    }
    for (let i = 0; i < 60; i++) {
      const nx = 0.12 + rnd(i + 900) * 0.5, ny = 0.47 + rnd(i + 950) * 0.4;
      const a = Math.max(0, Math.sin(time * (1 + rnd(i) * 1.8) + i * 2.3)) ** 4, len = S(0.003 + rnd(i + 3) * 0.006);
      c.fillStyle = rgba(ny < 0.62 ? '#ffd9a0' : '#bff7ff', a * 0.55 * intensity()); c.fillRect(X(nx) - len / 2, Y(ny), len, Math.max(1, S(0.001)));
    }
    for (let i = 0; i < 18; i++) {
      const p = ((time * 0.08 + rnd(i + 30)) % 1), nx = 0.33 + p * 0.09 + (rnd(i + 31) - 0.5) * 0.02 * p, ny = 0.705 + p * 0.06;
      glow(X(nx), Y(ny), S(0.003 + p * 0.004), '#f2fbff', (1 - p) * 0.45 * intensity());
    }
  }
  function lights(time) {
    const f = 0.8 + Math.sin(time * 3.1) * 0.08 + rnd(Math.floor(time * 12)) * 0.12;
    glow(X(LANTERN[0]), Y(LANTERN[1]), S(0.05), tint(), 0.45 * f * intensity());
    glow(X(LANTERN[0]), Y(LANTERN[1]), S(0.012), '#fff1c8', 0.6 * f * intensity());
    TOWN.forEach(([nx, ny], i) => glow(X(nx), Y(ny), S(0.008 + rnd(i) * 0.006), tint(), (0.3 + 0.2 * Math.sin(time * (1 + rnd(i + 3) * 2) + i * 2)) * intensity()));
  }
  function waterfalls(time) {
    FALLS.forEach(([x, top, bottom, width], f) => {
      const len = Y(bottom) - Y(top), half = S(width) / 2;
      c.save(); c.beginPath(); c.rect(X(x) - half, Y(top), half * 2, len); c.clip();
      for (let i = 0; i < 7; i++) {
        const sx = X(x) - half + rnd(i + f * 17) * half * 2, phase = (time * (0.6 + rnd(i + 40) * 0.4) + rnd(i + f * 9)) % 1, sy = Y(top) + (phase * 1.4 - 0.3) * len;
        const g = c.createLinearGradient(0, sy, 0, sy + len * 0.3); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, `rgba(235,250,255,${0.3 * intensity()})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(sx, sy, Math.max(1, half * 0.4), len * 0.3);
      }
      c.restore();
      glow(X(x), Y(bottom), S(width * 2), '#ffffff', (0.15 + Math.sin(time * 3 + f) * 0.05) * intensity());
    });
  }
  // Seagulls gliding and flapping across the sky.
  function gulls(time) {
    for (let i = 0; i < 6; i++) {
      const cycle = 40 + rnd(i + 60) * 30, p = ((time + rnd(i + 70) * cycle) % cycle) / cycle, dir = i % 2 ? 1 : -1;
      const nx = dir > 0 ? -0.05 + p * 1.1 : 1.05 - p * 1.1, ny = 0.06 + rnd(i + 80) * 0.2 + Math.sin(p * TAU * 2 + i) * 0.015;
      const span = S(0.007 + rnd(i + 90) * 0.005), flap = Math.sin(time * 5 + i * 2) * span * 0.5;
      c.beginPath(); c.moveTo(X(nx) - span, Y(ny) - flap); c.quadraticCurveTo(X(nx) - span * 0.4, Y(ny) - span * 0.35, X(nx), Y(ny));
      c.quadraticCurveTo(X(nx) + span * 0.4, Y(ny) - span * 0.35, X(nx) + span, Y(ny) - flap);
      c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = Math.max(1.2, span * 0.2); c.lineCap = 'round'; c.stroke();
    }
  }
  function motes(time) {
    for (let i = 0; i < 30; i++) {
      const cycle = 14 + rnd(i + 500) * 10, p = ((time + rnd(i + 510) * cycle) % cycle) / cycle;
      const nx = 0.55 + rnd(i + 520) * 0.45 + Math.sin(time * 0.4 + i) * 0.01, ny = 0.95 - rnd(i + 530) * 0.4 - p * 0.08;
      glow(X(nx), Y(ny), S(0.002 + rnd(i + 540) * 0.002), '#ffe3a8', Math.sin(p * Math.PI) * 0.5 * intensity());
    }
  }

  function draw() {
    if (!w) return;
    layout();
    if (!ready) { c.fillStyle = '#1b1426'; c.fillRect(0, 0, w, h); return; }
    const time = t * speed();
    c.drawImage(art, ox, oy, aw, ah);
    rockShip(time); cloth(time);
    c.globalCompositeOperation = 'lighter';
    sun(time); sea(time); waterfalls(time); lights(time); motes(time);
    c.globalCompositeOperation = 'source-over';
    gulls(time);
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    v.addColorStop(0, 'rgba(12,6,20,0)'); v.addColorStop(1, 'rgba(12,6,20,.3)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
  }

  function resize() { w = innerWidth; h = innerHeight; ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2073600 / (w * h))); canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); c.setTransform(ratio, 0, 0, ratio, 0, 0); c.imageSmoothingQuality = 'high'; }
  function stop() { clearTimeout(timer); cancelAnimationFrame(frame); last = 0; }
  function animate(now) { if (paused || document.hidden) { stop(); return; } if (last) t += Math.min(0.1, (now - last) / 1000); last = now; const start = performance.now(); draw(); timer = setTimeout(() => frame = requestAnimationFrame(animate), Math.max(0, 1000 / fps - (performance.now() - start) - 4)); }
  function start() { stop(); if (!paused && !document.hidden) frame = requestAnimationFrame(animate); }
  addEventListener('resize', () => { resize(); draw(); }); document.addEventListener('visibilitychange', start);
  window.seeWallpaper?.onSettingsChanged(value => { settings = { ...settings, ...value }; draw(); });
  window.seeWallpaper?.onPause(() => { paused = true; stop(); }); window.seeWallpaper?.onResume(() => { paused = false; start(); });
  window.seeWallpaper?.onPerformanceChanged(value => { fps = Math.max(1, Math.min(reduced ? 15 : 60, Number(value) || 30)); start(); });
  resize(); const preview = new URLSearchParams(location.search).get('preview');
  if (preview !== null) { paused = true; t = Number(preview) || 12; draw(); } else start();
})();
