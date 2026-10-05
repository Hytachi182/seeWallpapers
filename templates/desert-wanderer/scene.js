/* Desert Wanderer: the bundled illustration (artwork.jpg) animated with Canvas overlays and image warps. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...window.seeWallpaper?.getSettings?.() };
  let w, h, t = 0, last = 0, frame = 0, timer = 0, paused = false, ready = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fps = reduced ? 15 : 30;
  const TAU = Math.PI * 2, rnd = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const tint = () => /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#ffb04a';
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const speed = () => num(settings.speed, 1), intensity = () => num(settings.intensity, 1), wind = () => Math.max(0, num(settings.wind, 1));
  function rgba(hex, a) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a))})`; }

  const art = new Image();
  art.onload = () => { ready = true; draw(); };
  art.src = 'artwork.jpg';

  // Normalized artwork coordinates (0..1), measured on the painting.
  const SUN = [0.183, 0.414];
  const CAPE = { x0: 0.87, x1: 1.0, y0: 0.39, y1: 0.67 };       // loose part of the cloak
  const SCARF = { x0: 0.865, x1: 0.9, y0: 0.29, y1: 0.33 };
  const HAZE = { y0: 0.43, y1: 0.54, x1: 0.79 };                  // horizon band, left of the wanderer
  const MOONS = [[0.56, 0.17, 0.02], [0.905, 0.135, 0.008]];
  const PLANET = [0.615, 0.36];

  // Cover-fit with a slow drifting zoom; portrait screens keep the wanderer in view.
  let ox = 0, oy = 0, aw = 1, ah = 1, iw = 1672, ih = 941;
  function layout() {
    iw = art.naturalWidth || 1672; ih = art.naturalHeight || 941;
    const zoom = 1.035 + Math.sin(t * speed() * 0.04) * 0.012;
    const scale = Math.max(w / iw, h / ih) * zoom;
    aw = iw * scale; ah = ih * scale;
    const focus = w < h ? 0.92 : 0.5;
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

  // Redraws a region of the painting as a grid of cells, each displaced by fn(nx, ny, weight).
  function warp(region, cols, rows, fn) {
    const { x0, x1, y0, y1 } = region, cw = (x1 - x0) / cols, ch = (y1 - y0) / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const nx = x0 + i * cw, ny = y0 + j * ch, [dx, dy] = fn(nx + cw / 2, ny + ch / 2);
      c.drawImage(art, nx * iw, ny * ih, cw * iw, ch * ih, X(nx) + dx - 0.5, Y(ny) + dy - 0.5, S(cw) + 1, ch * ah + 1);
    }
  }
  // The cloak ripples in the wind: still at the shoulders, strongest at the torn tips.
  function cape(time) {
    const amp = S(0.0024) * Math.min(1.6, 0.4 + wind());
    warp(CAPE, 13, 16, (nx, ny) => {
      const k = Math.min(1, Math.max(0, (nx - CAPE.x0) / (CAPE.x1 - CAPE.x0))) ** 1.4;
      const gust = 0.75 + Math.sin(time * 0.7) * 0.25;
      return [amp * k * 0.6 * Math.sin(time * 2.4 - ny * 30) * gust, amp * k * Math.sin(time * 3.4 - nx * 45 + ny * 10) * gust];
    });
    warp(SCARF, 5, 4, (nx) => { const k = (nx - SCARF.x0) / (SCARF.x1 - SCARF.x0); return [0, S(0.0012) * k * Math.sin(time * 5 - nx * 80)]; });
  }
  // Heat haze: thin horizontal slices of the horizon wobble sideways.
  function haze(time) {
    const rows = Math.ceil((HAZE.y1 - HAZE.y0) * ah / 3), sh = (HAZE.y1 - HAZE.y0) / rows;
    for (let j = 0; j < rows; j++) {
      const ny = HAZE.y0 + j * sh, bell = Math.sin((j / rows) * Math.PI);
      const dx = Math.sin(time * 2.2 + ny * 420) * 1.3 * bell + Math.sin(time * 3.7 + ny * 900) * 0.6 * bell;
      c.drawImage(art, 0, ny * ih, HAZE.x1 * iw, sh * ih, X(0) + dx, Y(ny), S(HAZE.x1), sh * ah + 0.6);
    }
  }

  function sun(time) {
    const x = X(SUN[0]), y = Y(SUN[1]), f = (0.85 + Math.sin(time * 0.5) * 0.12) * intensity();
    glow(x, y, S(0.08), '#fff0c8', 0.4 * f); glow(x, y, S(0.3), tint(), 0.16 * f);
    // Slowly turning god rays.
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * TAU + time * 0.015, len = S(0.18 + rnd(i) * 0.25) * (0.8 + Math.sin(time * 0.6 + i * 1.7) * 0.2);
      c.save(); c.translate(x, y); c.rotate(a);
      const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, rgba('#ffd9a0', 0.12 * f)); g.addColorStop(1, rgba('#ffd9a0', 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -S(0.004)); c.lineTo(len, -S(0.012)); c.lineTo(len, S(0.012)); c.lineTo(0, S(0.004)); c.fill(); c.restore();
    }
  }
  function sky(time) {
    MOONS.forEach(([nx, ny, r], i) => glow(X(nx), Y(ny), S(r * 2.2), '#ffe7c9', (0.12 + Math.sin(time * 0.6 + i) * 0.04) * intensity()));
    // Warm light breathing on the giant planet's sunlit lower edge.
    glow(X(PLANET[0]), Y(PLANET[1]), S(0.09), '#ffc890', (0.1 + Math.sin(time * 0.5) * 0.04) * intensity());
  }

  // Sand: low drifting veils, streaks blown over the crests and fine motes in the light.
  function sand(time) {
    const amount = wind();
    if (!amount) return;
    for (let i = 0; i < 7; i++) {
      const y = 0.62 + i * 0.05, drift = ((time * 0.012 * (1 + i * 0.3) + rnd(i)) % 1.4) - 0.2;
      c.save(); c.translate(X(drift), Y(y)); c.scale(5, 0.5);
      glow(0, 0, S(0.07), '#f2b36b', 0.09 * amount * intensity()); c.restore();
    }
    const streaks = Math.round(90 * amount);
    for (let i = 0; i < streaks; i++) {
      const v = 0.05 + rnd(i) * 0.06, p = ((time * v + rnd(i + 100)) % 1.2) - 0.1;
      const nx = p, ny = 0.58 + rnd(i + 110) * 0.4 + Math.sin(time * 1.5 + i) * 0.004, len = S(0.02 + rnd(i + 120) * 0.04) * (0.5 + (ny - 0.58) * 2);
      c.strokeStyle = rgba('#ffd8a6', (0.08 + rnd(i + 130) * 0.12) * intensity()); c.lineWidth = 1;
      c.beginPath(); c.moveTo(X(nx), Y(ny)); c.lineTo(X(nx) - len, Y(ny) + len * 0.04); c.stroke();
    }
    for (let i = 0; i < Math.round(60 * amount); i++) {
      const p = ((time * (0.02 + rnd(i + 200) * 0.03) + rnd(i + 210)) % 1);
      const nx = p * 1.1 - 0.05, ny = 0.2 + rnd(i + 220) * 0.75 + Math.sin(time * 0.8 + i) * 0.01;
      glow(X(nx), Y(ny), S(0.0012 + rnd(i + 230) * 0.002), '#ffe2b8', (0.2 + rnd(i + 240) * 0.4) * Math.sin(p * Math.PI) * intensity());
    }
  }

  // Worm sign: now and then a dust wake races through the distant dunes.
  function wormSign(time) {
    const cycle = 34, p = (time % cycle) / 9;
    if (p > 1) return;
    const seed = Math.floor(time / cycle), y = 0.56 + rnd(seed) * 0.05;
    const head = 0.2 + p * 0.45, fade = Math.sin(p * Math.PI) * intensity();
    for (let k = 0; k < 18; k++) {
      const nx = head - k * 0.008, rise = Math.sin(time * 6 - k) * 0.003;
      glow(X(nx), Y(y - rise - k * 0.0006), S(0.012 + k * 0.0012), '#f6c17c', 0.18 * fade * (1 - k / 18));
    }
  }

  function draw() {
    if (!w) return;
    layout();
    if (!ready) { c.fillStyle = '#2a1408'; c.fillRect(0, 0, w, h); return; }
    const time = t * speed();
    c.drawImage(art, ox, oy, aw, ah);
    if (!reduced) haze(time);
    cape(time);
    c.globalCompositeOperation = 'lighter';
    sky(time); sun(time); wormSign(time); sand(time);
    c.globalCompositeOperation = 'source-over';
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    v.addColorStop(0, 'rgba(20,8,2,0)'); v.addColorStop(1, 'rgba(20,8,2,.35)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
  }

  function resize() { w = innerWidth; h = innerHeight; const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2073600 / (w * h))); canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); c.setTransform(ratio, 0, 0, ratio, 0, 0); c.imageSmoothingQuality = 'high'; }
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
