/* Neon Ronin: the bundled illustration (artwork.jpg) animated with Canvas overlays. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...window.seeWallpaper?.getSettings?.() };
  let w, h, t = 0, last = 0, frame = 0, timer = 0, paused = false, ready = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fps = reduced ? 15 : 30;
  const TAU = Math.PI * 2, rnd = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const tint = () => /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#ff2e88';
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const speed = () => num(settings.speed, 1), intensity = () => num(settings.intensity, 1), rain = () => Math.max(0, num(settings.rain, 1));
  function rgba(hex, a) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a))})`; }

  const art = new Image();
  art.onload = () => { ready = true; draw(); };
  art.src = 'artwork.jpg';

  // Normalized artwork coordinates (0..1), measured on the painting.
  const MOON = [0.52, 0.33], FLOOR = 0.795;
  const RETICLES = [[0.524, 0.299, 0.022], [0.425, 0.397, 0.014]];
  // Neon signs: [x, y, radius, color, flicker style]
  const SIGNS = [[0.145, 0.40, 0.05, '#4fe6ff', 0], [0.76, 0.40, 0.045, '#7ad7ff', 1], [0.425, 0.40, 0.02, '#ff4fd8', 2], [0.02, 0.33, 0.02, '#ff3f8f', 3], [0.845, 0.27, 0.025, '#ffaa4a', 4], [0.16, 0.16, 0.02, '#4fe6ff', 5], [0.98, 0.27, 0.03, '#ff3f9f', 6], [0.88, 0.35, 0.015, '#4fb8ff', 7]];
  const LANTERNS = [[0.081, 0.675], [0.948, 0.72]];
  const BLADE = [[0.474, 0.64], [0.506, 0.80]];
  const KANJI = [0.51, 0.665];
  // Light trails on the elevated highways, as polylines.
  const TRAILS = [[[0.12, 0.69], [0.18, 0.67], [0.24, 0.645], [0.28, 0.615], [0.285, 0.595]], [[0.69, 0.555], [0.72, 0.565], [0.745, 0.585], [0.76, 0.6]]];
  const FALLS = [[0.858, 0.61, 0.72, 0.012], [0.876, 0.61, 0.72, 0.01], [0.31, 0.665, 0.70, 0.008]];
  // Sky lanes for passing flying cars: [y, direction, speed, scale]
  const LANES = [[0.13, 1, 0.045, 1], [0.24, -1, 0.03, 0.7], [0.36, 1, 0.022, 0.5], [0.19, -1, 0.06, 1.2]];

  // Cover-fit with a slow drifting zoom; portrait screens stay on the ronin and the cat.
  let ox = 0, oy = 0, aw = 1, ah = 1;
  function layout() {
    const iw = art.naturalWidth || 1672, ih = art.naturalHeight || 941;
    const zoom = 1.035 + Math.sin(t * speed() * 0.04) * 0.012;
    const scale = Math.max(w / iw, h / ih) * zoom;
    aw = iw * scale; ah = ih * scale;
    const focus = w < h ? 0.56 : 0.5;
    ox = (w - aw) * focus + Math.sin(t * speed() * 0.027) * (aw - w) * 0.06;
    oy = (h - ah) * 0.5 + Math.cos(t * speed() * 0.021) * Math.max(0, ah - h) * 0.2;
    ox = Math.min(0, Math.max(w - aw, ox)); oy = Math.min(0, Math.max(h - ah, oy));
  }
  const X = nx => ox + nx * aw, Y = ny => oy + ny * ah, S = n => n * aw;

  function glow(x, y, r, color, alpha) {
    if (r <= 0 || alpha <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Neon tubes: mostly steady, with short stutters on a per-sign rhythm.
  function flicker(time, k) {
    const slot = Math.floor(time * 14 + k * 37), burst = rnd(Math.floor(time / 3 + k * 11)) > 0.72;
    return burst && rnd(slot) > 0.55 ? 0.15 : 0.85 + Math.sin(time * 1.3 + k) * 0.15;
  }

  function moon(time) {
    const p = 0.85 + Math.sin(time * 0.4) * 0.15;
    glow(X(MOON[0]), Y(MOON[1]), S(0.2), '#ff5fa8', 0.16 * p * intensity());
  }
  function reticles(time) {
    RETICLES.forEach(([nx, ny, r], i) => {
      const x = X(nx), y = Y(ny), R = S(r), p = 0.7 + Math.sin(time * 2 + i) * 0.3;
      glow(x, y, R * 2.5, '#b46bff', 0.35 * p * intensity());
      c.save(); c.translate(x, y); c.rotate(time * (i ? -0.8 : 0.5));
      c.strokeStyle = rgba('#e3b6ff', 0.7 * p * intensity()); c.lineWidth = Math.max(1, S(0.0012));
      for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(0, 0, R * 1.35, k * Math.PI / 2 + 0.25, k * Math.PI / 2 + 1.2); c.stroke(); }
      c.restore();
      // A scan pulse expanding from the tower's reticle.
      if (!i) { const q = (time * 0.35) % 1; c.beginPath(); c.arc(x, y, R * (1 + q * 6), 0, TAU); c.strokeStyle = rgba('#c58bff', (1 - q) * 0.35 * intensity()); c.lineWidth = 1.5; c.stroke(); }
    });
  }
  function signs(time) {
    SIGNS.forEach(([nx, ny, r, col, k]) => glow(X(nx), Y(ny), S(r), col, 0.28 * flicker(time, k) * intensity()));
    LANTERNS.forEach(([nx, ny], i) => {
      const f = 0.8 + Math.sin(time * 3 + i * 2) * 0.1 + rnd(Math.floor(time * 10) + i) * 0.1;
      glow(X(nx), Y(ny), S(0.05), '#ff4a5a', 0.3 * f * intensity());
    });
  }
  function blade(time) {
    const [[x0, y0], [x1, y1]] = BLADE, p = 0.75 + Math.sin(time * 1.4) * 0.25;
    c.save(); c.lineCap = 'round';
    c.beginPath(); c.moveTo(X(x0), Y(y0)); c.lineTo(X(x1), Y(y1));
    c.strokeStyle = rgba(tint(), 0.45 * p * intensity()); c.lineWidth = S(0.006); c.shadowColor = tint(); c.shadowBlur = S(0.02); c.stroke();
    c.restore();
    // A glint running down the edge.
    const q = ((time * 0.4) % 1.6);
    if (q < 1) glow(X(x0 + (x1 - x0) * q), Y(y0 + (y1 - y0) * q), S(0.012), '#ffd0e4', Math.sin(q * Math.PI) * 0.8 * intensity());
    glow(X(KANJI[0]), Y(KANJI[1]), S(0.035), tint(), (0.18 + Math.sin(time * 1.4) * 0.06) * intensity());
    // Reflection of the blade on the wet floor.
    glow(X(0.49), Y(0.88), S(0.03), tint(), (0.15 + Math.sin(time * 1.4 + 0.5) * 0.05) * intensity());
  }
  function trails(time) {
    TRAILS.forEach((pts, ti) => {
      for (let k = 0; k < 6; k++) {
        const p = ((time * 0.18 + k / 6 + ti * 0.3) % 1), seg = p * (pts.length - 1), i = Math.floor(seg), f = seg - i;
        const [ax, ay] = pts[i], [bx, by] = pts[Math.min(i + 1, pts.length - 1)];
        glow(X(ax + (bx - ax) * f), Y(ay + (by - ay) * f), S(0.006), k % 2 ? '#ff4fa0' : '#7fe8ff', 0.8 * intensity());
      }
    });
  }
  function waterfalls(time) {
    FALLS.forEach(([x, top, bottom, width], f) => {
      const len = Y(bottom) - Y(top), half = S(width) / 2;
      c.save(); c.beginPath(); c.rect(X(x) - half, Y(top), half * 2, len); c.clip();
      for (let i = 0; i < 7; i++) {
        const sx = X(x) - half + rnd(i + f * 17) * half * 2, phase = (time * (0.6 + rnd(i + 40) * 0.4) + rnd(i + f * 9)) % 1, sy = Y(top) + (phase * 1.4 - 0.3) * len;
        const g = c.createLinearGradient(0, sy, 0, sy + len * 0.3); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, `rgba(180,240,255,${0.35 * intensity()})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(sx, sy, Math.max(1, half * 0.4), len * 0.3);
      }
      c.restore();
    });
  }
  // Passing flying cars: a body light, a tail streak and a blinking marker.
  function traffic(time) {
    LANES.forEach(([ny, dir, v, scale], i) => {
      for (let j = 0; j < 2; j++) {
        const p = ((time * v + j * 0.5 + rnd(i) ) % 1.2) - 0.1, nx = dir > 0 ? p : 1 - p;
        const x = X(nx), y = Y(ny + Math.sin(time * 0.3 + i + j) * 0.01), len = S(0.05 * scale);
        const g = c.createLinearGradient(x, y, x - dir * len, y); g.addColorStop(0, rgba(i % 2 ? '#7fe8ff' : '#ff4fa0', 0.7 * intensity())); g.addColorStop(1, rgba('#ff4fa0', 0));
        c.fillStyle = g; c.fillRect(Math.min(x, x - dir * len), y - S(0.0012 * scale), len, S(0.0024 * scale));
        glow(x, y, S(0.007 * scale), '#ffffff', 0.7 * intensity());
        if (Math.sin(time * 6 + i * 3 + j) > 0.5) glow(x - dir * S(0.008 * scale), y - S(0.002), S(0.004 * scale), '#ff3b3b', 0.9);
      }
    });
  }
  function mist(time) {
    [[0.3, 0.69, 0.12, 0.12], [0.72, 0.72, 0.12, 0.1], [0.55, 0.62, 0.1, 0.06]].forEach(([x, y, r, a], i) => {
      c.save(); c.translate(X(x + Math.sin(time * 0.05 + i * 2) * 0.05), Y(y)); c.scale(3, 0.5);
      glow(0, 0, S(r), '#c79bff', a * intensity()); c.restore();
    });
  }
  // Floor: neon reflections shimmer and raindrops ripple on the puddles.
  function floor(time) {
    for (let i = 0; i < 26; i++) {
      const nx = rnd(i + 900), ny = FLOOR + 0.02 + rnd(i + 910) * 0.18, a = Math.max(0, Math.sin(time * (1 + rnd(i) * 2) + i * 2)) ** 3;
      const len = S(0.01 + rnd(i + 920) * 0.02);
      c.fillStyle = rgba(i % 3 ? '#ff6ab8' : '#7fe8ff', a * 0.35 * intensity()); c.fillRect(X(nx) - len / 2, Y(ny), len, Math.max(1, S(0.0012)));
    }
    if (!rain()) return;
    const count = Math.round(28 * rain());
    for (let i = 0; i < count; i++) {
      const cycle = 1.2 + rnd(i + 30) * 1.2, p = ((time + rnd(i + 31) * cycle) % cycle) / cycle, seed = Math.floor((time + rnd(i + 31) * cycle) / cycle) * 7 + i;
      const x = X(rnd(seed)), y = Y(FLOOR + 0.01 + rnd(seed + 1) * 0.19), depth = (y - Y(FLOOR)) / (Y(1) - Y(FLOOR));
      const r = S(0.004 + p * 0.02) * (0.4 + depth);
      c.beginPath(); c.ellipse(x, y, r, r * 0.25, 0, 0, TAU); c.strokeStyle = rgba('#d6c4ff', (1 - p) * 0.4 * intensity()); c.lineWidth = 1; c.stroke();
    }
  }
  // Rain streaks in two depths, slanted by the wind.
  function rainfall(time) {
    const count = Math.round(170 * rain());
    for (let i = 0; i < count; i++) {
      const near = i % 4 === 0, v = near ? 1.6 : 1.05, len = S(near ? 0.035 : 0.018);
      const p = ((time * v * (0.9 + rnd(i) * 0.2) + rnd(i + 200)) % 1);
      const x = X(rnd(i + 210) * 1.1 - 0.05 + p * 0.03), y = Y(-0.05 + p * 1.1);
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - len * 0.18, y - len);
      c.strokeStyle = rgba(near ? '#f1dcff' : '#b9a6ff', (near ? 0.4 : 0.26) * intensity()); c.lineWidth = near ? 1.4 : 1; c.stroke();
    }
  }
  // Sakura petals blown from both trees.
  function petals(time) {
    for (let i = 0; i < 26; i++) {
      const life = 10 + rnd(i + 400) * 8, p = ((time + rnd(i + 410) * life) % life) / life, left = i % 3 !== 0;
      const sx = left ? rnd(i + 420) * 0.15 : 0.88 + rnd(i + 420) * 0.1, sy = left ? rnd(i + 430) * 0.2 : 0.45 + rnd(i + 430) * 0.1;
      const nx = sx + (left ? 1 : -1) * p * (0.25 + rnd(i) * 0.25) + Math.sin(time + i) * 0.01, ny = sy + p * 0.75;
      const size = S(0.003 + rnd(i + 440) * 0.004), fade = Math.min(1, p * 8, (1 - p) * 4);
      c.save(); c.translate(X(nx), Y(ny)); c.rotate(time * (1 + rnd(i)) + i); c.scale(1, Math.cos(time * 2 + i));
      c.beginPath(); c.ellipse(0, 0, size, size * 0.6, 0, 0, TAU); c.fillStyle = rgba('#ff7fb6', 0.8 * fade); c.fill(); c.restore();
    }
  }
  // Occasional lightning flash far behind the skyline.
  function lightning(time) {
    const cycle = 17, p = (time % cycle) / cycle;
    if (p > 0.02) return;
    const k = Math.sin(p / 0.02 * Math.PI) * (rnd(Math.floor(time * 20)) > 0.4 ? 1 : 0.3);
    c.fillStyle = rgba('#d9b8ff', 0.12 * k * intensity()); c.fillRect(0, 0, w, Y(0.45));
  }

  function draw() {
    if (!w) return;
    layout();
    if (!ready) { c.fillStyle = '#12061f'; c.fillRect(0, 0, w, h); return; }
    c.drawImage(art, ox, oy, aw, ah);
    const time = t * speed();
    c.globalCompositeOperation = 'lighter';
    lightning(time); moon(time); traffic(time); reticles(time); signs(time); trails(time); waterfalls(time); mist(time); blade(time); floor(time);
    c.globalCompositeOperation = 'source-over';
    rainfall(time); petals(time);
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.6);
    v.addColorStop(0, 'rgba(8,2,16,0)'); v.addColorStop(1, 'rgba(8,2,16,.45)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
  }

  function resize() { w = innerWidth; h = innerHeight; const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2073600 / (w * h))); canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); c.setTransform(ratio, 0, 0, ratio, 0, 0); }
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
