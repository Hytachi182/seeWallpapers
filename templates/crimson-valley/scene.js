/* Crimson Valley: the bundled illustration (artwork.jpg) animated with Canvas overlays. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...window.seeWallpaper?.getSettings?.() };
  let w, h, t = 0, last = 0, frame = 0, timer = 0, paused = false, ready = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fps = reduced ? 15 : 30;
  const TAU = Math.PI * 2, rnd = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const tint = () => /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#ff465d';
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const speed = () => num(settings.speed, 1), intensity = () => num(settings.intensity, 1);
  function rgba(hex, a) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a))})`; }

  const art = new Image();
  art.onload = () => { ready = true; draw(); };
  art.src = 'artwork.jpg';

  // The illustration is cover-fitted with a slow "breathing" zoom; every overlay
  // is placed in normalized artwork coordinates (0..1) so it tracks the painting.
  let ox = 0, oy = 0, aw = 1, ah = 1;
  function layout() {
    const iw = art.naturalWidth || 1672, ih = art.naturalHeight || 941;
    const zoom = 1.04 + Math.sin(t * speed() * 0.05) * 0.012;
    const scale = Math.max(w / iw, h / ih) * zoom;
    aw = iw * scale; ah = ih * scale;
    // Pan gently, and keep the seated warrior and the pagoda city in frame on narrow screens.
    const focus = w < h ? 0.42 : 0.5;
    ox = (w - aw) * focus + Math.sin(t * speed() * 0.031) * (aw - w) * 0.08;
    oy = (h - ah) * 0.5 + Math.cos(t * speed() * 0.027) * Math.max(0, ah - h) * 0.25;
    ox = Math.min(0, Math.max(w - aw, ox)); oy = Math.min(0, Math.max(h - ah, oy));
  }
  const X = nx => ox + nx * aw, Y = ny => oy + ny * ah, S = n => n * aw;

  function glow(x, y, r, color, alpha) {
    if (r <= 0 || alpha <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function sun() {
    const pulse = 0.85 + Math.sin(t * speed() * 0.6) * 0.15;
    glow(X(0.736), Y(0.258), S(0.16), '#ffd899', 0.20 * pulse * intensity());
    glow(X(0.736), Y(0.258), S(0.30), '#ff8a5a', 0.08 * pulse * intensity());
  }

  // Warm windows of the pagoda city flicker independently.
  const lanterns = [
    [0.872, 0.355, 1.4], [0.892, 0.405, 1.6], [0.865, 0.43, 1.2], [0.912, 0.44, 1.1], [0.84, 0.47, 1], [0.94, 0.47, 1],
    [0.805, 0.445, 0.9], [0.745, 0.54, 0.9], [0.66, 0.6, 1], [0.64, 0.66, 0.8], [0.57, 0.635, 0.8], [0.955, 0.77, 1.1], [0.93, 0.8, 0.8]
  ];
  function lights() {
    c.globalCompositeOperation = 'lighter';
    lanterns.forEach(([x, y, size], i) => {
      const flicker = 0.7 + Math.sin(t * speed() * (2.3 + rnd(i) * 2) + i * 3) * 0.18 + Math.sin(t * speed() * 7.1 + i) * 0.07;
      glow(X(x), Y(y), S(0.022 * size), '#ffb35c', 0.32 * flicker * intensity());
    });
    c.globalCompositeOperation = 'source-over';
  }

  // Falling water: bright streaks scroll down each waterfall, with foam at the base.
  const falls = [[0.797, 0.565, 0.75, 0.016], [0.925, 0.575, 0.735, 0.012], [0.8, 0.83, 0.885, 0.008]];
  function waterfalls() {
    c.globalCompositeOperation = 'lighter';
    falls.forEach(([x, top, bottom, width], f) => {
      const len = Y(bottom) - Y(top), half = S(width) / 2;
      c.save(); c.beginPath(); c.rect(X(x) - half, Y(top), half * 2, len); c.clip();
      for (let i = 0; i < 9; i++) {
        const sx = X(x) - half + rnd(i + f * 17) * half * 2;
        const phase = (t * speed() * (0.55 + rnd(i + 40) * 0.4) + rnd(i + f * 9)) % 1;
        const sy = Y(top) + (phase * 1.4 - 0.3) * len;
        const g = c.createLinearGradient(0, sy, 0, sy + len * 0.3);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, `rgba(230,240,255,${0.28 * intensity()})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(sx, sy, Math.max(1, half * 0.35), len * 0.3);
      }
      c.restore();
      glow(X(x), Y(bottom), S(width * 2.2), '#e9f1ff', (0.18 + Math.sin(t * speed() * 3 + f) * 0.05) * intensity());
    });
    c.globalCompositeOperation = 'source-over';
  }

  // Sparkles on the river reflecting the sunset.
  function river() {
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 46; i++) {
      const nx = 0.53 + rnd(i + 900) * 0.16, ny = 0.7 + rnd(i + 950) * 0.2;
      const a = Math.max(0, Math.sin(t * speed() * (1.2 + rnd(i) * 1.6) + i * 2.1)) ** 3;
      const len = S(0.006 + rnd(i + 3) * 0.01);
      c.fillStyle = rgba('#ffd7a1', a * 0.5 * intensity());
      c.fillRect(X(nx + Math.sin(t * 0.2 + i) * 0.003) - len / 2, Y(ny), len, Math.max(1, S(0.0012)));
    }
    c.globalCompositeOperation = 'source-over';
  }

  // Mist banks drifting through the valley and across the foreground.
  function mist() {
    const bands = [[0.58, 0.55, 0.10, 0.07], [0.82, 0.62, 0.09, 0.08], [0.62, 0.92, 0.12, 0.10], [0.95, 0.9, 0.12, 0.1], [0.4, 0.6, 0.08, 0.05]];
    bands.forEach(([x, y, r, a], i) => {
      const drift = Math.sin(t * speed() * 0.07 + i * 1.7) * 0.05 + ((t * speed() * 0.004 + i * 0.2) % 0.3) - 0.15;
      c.save(); c.translate(X(x + drift), Y(y)); c.scale(3.5, 0.55);
      glow(0, 0, S(r), '#e6e1ec', a * intensity()); c.restore();
    });
  }

  // A few distant birds gliding across the sky.
  function birds() {
    for (let i = 0; i < 5; i++) {
      const cycle = 70 + rnd(i + 60) * 40;
      const p = ((t * speed() + rnd(i + 70) * cycle) % cycle) / cycle;
      const x = X(-0.05 + p * 1.1), y = Y(0.08 + rnd(i + 80) * 0.14 + Math.sin(p * TAU * 2 + i) * 0.01);
      const span = S(0.006 + rnd(i + 90) * 0.004), flap = Math.sin(t * speed() * 6 + i * 2) * span * 0.6;
      c.beginPath(); c.moveTo(x - span, y - flap); c.quadraticCurveTo(x - span * 0.4, y - span * 0.3, x, y);
      c.quadraticCurveTo(x + span * 0.4, y - span * 0.3, x + span, y - flap);
      c.strokeStyle = 'rgba(245,232,225,0.75)'; c.lineWidth = Math.max(1, span * 0.18); c.lineCap = 'round'; c.stroke();
    }
  }

  // Wind lines trailing from the warrior's cloak.
  function wind() {
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const p = ((t * speed() * 0.35 + rnd(i + 200)) % 1);
      const x0 = 0.24 - p * 0.2, y0 = 0.36 + rnd(i + 210) * 0.12, len = 0.06 + rnd(i + 220) * 0.05;
      const a = Math.sin(p * Math.PI) * 0.22 * intensity();
      c.beginPath(); c.moveTo(X(x0), Y(y0));
      c.quadraticCurveTo(X(x0 - len * 0.5), Y(y0 - 0.015 + Math.sin(t * 2 + i) * 0.01), X(x0 - len), Y(y0 + 0.005));
      c.strokeStyle = rgba('#ffd2d2', a); c.lineWidth = Math.max(1, S(0.0015)); c.lineCap = 'round'; c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
  }

  // Maple leaves shed by the crimson tree, plus small glowing embers.
  function leaf(x, y, size, angle, flip, color, alpha) {
    c.save(); c.translate(x, y); c.rotate(angle); c.scale(1, flip); c.globalAlpha = alpha;
    // Five rounded lobes (long top and sides, short lower ones) and a stem.
    const lobes = [[-90, 1], [-25, 0.9], [40, 0.55], [140, 0.55], [205, 0.9]];
    c.beginPath(); c.moveTo(0, size * 0.15);
    lobes.forEach(([deg, r], k) => {
      const a = deg * Math.PI / 180, prev = (k ? lobes[k - 1][0] : deg - 72) * Math.PI / 180, mid = (a + prev) / 2;
      if (k) c.lineTo(Math.cos(mid) * size * 0.3, Math.sin(mid) * size * 0.3);
      c.quadraticCurveTo(Math.cos(a - 0.35) * size * r, Math.sin(a - 0.35) * size * r, Math.cos(a) * size * r, Math.sin(a) * size * r);
      c.quadraticCurveTo(Math.cos(a + 0.35) * size * r, Math.sin(a + 0.35) * size * r, Math.cos(a + 0.5) * size * r * 0.45, Math.sin(a + 0.5) * size * r * 0.45);
    });
    c.closePath(); c.fillStyle = color; c.fill();
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, size * 0.55); c.strokeStyle = color; c.lineWidth = Math.max(0.6, size * 0.08); c.stroke(); c.restore();
  }
  function leaves() {
    const time = t * speed(), count = Math.round(55 * Math.max(0.1, num(settings.leafDensity, 1)));
    for (let i = 0; i < count; i++) {
      const depth = rnd(i + 400), life = 14 + rnd(i + 410) * 10;
      const p = ((time + rnd(i + 420) * life) % life) / life;
      // Spawn under the canopy (upper left) and ride the wind toward the valley.
      const sx = rnd(i + 430) * 0.62 - 0.05, sy = rnd(i + 440) * 0.28 - 0.04;
      const nx = sx + p * (0.45 + depth * 0.4) + Math.sin(time * 0.8 + i) * 0.015;
      const ny = sy + p * (0.75 + depth * 0.3) + Math.sin(time * 1.3 + i * 2) * 0.012;
      const size = S(0.004 + depth * depth * 0.012);
      const fade = Math.min(1, p * 8, (1 - p) * 4);
      const flip = Math.cos(time * (1.5 + rnd(i + 450) * 2) + i);
      leaf(X(nx), Y(ny), size, time * (0.6 + rnd(i) * 1.2) + i, flip, i % 4 ? tint() : '#b3122e', (0.55 + depth * 0.4) * fade);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const p = ((time * 0.06 + rnd(i + 600)) % 1);
      const x = X(rnd(i + 610) * 0.9 + 0.05 + Math.sin(time * 0.5 + i) * 0.01), y = Y(1.02 - p * 0.6);
      glow(x, y, S(0.004 + rnd(i + 620) * 0.004), tint(), Math.sin(p * Math.PI) * 0.7 * intensity());
    }
    c.globalCompositeOperation = 'source-over';
  }

  function draw() {
    if (!w) return;
    layout();
    if (ready) c.drawImage(art, ox, oy, aw, ah); else { c.fillStyle = '#1a0d16'; c.fillRect(0, 0, w, h); }
    if (ready) { sun(); mist(); waterfalls(); river(); lights(); birds(); wind(); }
    leaves();
    const shade = c.createLinearGradient(0, 0, 0, h); shade.addColorStop(0, 'rgba(5,9,20,.14)'); shade.addColorStop(0.65, 'rgba(5,9,20,0)'); shade.addColorStop(1, 'rgba(5,9,20,.28)');
    c.fillStyle = shade; c.fillRect(0, 0, w, h);
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
