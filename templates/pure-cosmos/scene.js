/* Pure Cosmos: the bundled illustration (artwork.jpg) animated with Canvas overlays. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...window.seeWallpaper?.getSettings?.() };
  let w, h, t = 0, last = 0, frame = 0, timer = 0, paused = false, ready = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fps = reduced ? 15 : 30;
  const TAU = Math.PI * 2, rnd = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const tint = () => /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#c77dff';
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const speed = () => num(settings.speed, 1), intensity = () => num(settings.intensity, 1);
  function rgba(hex, a) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a))})`; }

  const art = new Image();
  art.onload = () => { ready = true; draw(); };
  art.src = 'artwork.jpg';

  // The illustration is cover-fitted with a slow drifting zoom; every overlay is
  // placed in normalized artwork coordinates (0..1) so it tracks the painting.
  let ox = 0, oy = 0, aw = 1, ah = 1;
  function layout() {
    const iw = art.naturalWidth || 1672, ih = art.naturalHeight || 941;
    const zoom = 1.04 + Math.sin(t * speed() * 0.045) * 0.012;
    const scale = Math.max(w / iw, h / ih) * zoom;
    aw = iw * scale; ah = ih * scale;
    // On portrait screens keep the galaxy core and the planet's horizon in view.
    const focus = w < h ? 0.45 : 0.5;
    ox = (w - aw) * focus + Math.sin(t * speed() * 0.029) * (aw - w) * 0.08;
    oy = (h - ah) * 0.5 + Math.cos(t * speed() * 0.023) * Math.max(0, ah - h) * 0.25;
    ox = Math.min(0, Math.max(w - aw, ox)); oy = Math.min(0, Math.max(h - ah, oy));
  }
  const X = nx => ox + nx * aw, Y = ny => oy + ny * ah, S = n => n * aw;

  function glow(x, y, r, color, alpha) {
    if (r <= 0 || alpha <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function sparkle(x, y, r, color, a) {
    glow(x, y, r * 3, color, a * 0.5);
    c.fillStyle = rgba('#ffffff', a); c.fillRect(x - r * 3, y - 0.5, r * 6, 1); c.fillRect(x - 0.5, y - r * 3, 1, r * 6);
  }

  // The spiral galaxy: a breathing core and stars that orbit along its arms.
  const core = [0.315, 0.21];
  function galaxy() {
    const time = t * speed(), pulse = 0.8 + Math.sin(time * 0.5) * 0.2;
    glow(X(core[0]), Y(core[1]), S(0.06), '#ffe2b0', 0.35 * pulse * intensity());
    glow(X(core[0]), Y(core[1]), S(0.16), tint(), 0.10 * pulse * intensity());
    c.save(); c.translate(X(core[0]), Y(core[1])); c.rotate(-0.25); c.scale(1, 0.62);
    for (let i = 0; i < 120; i++) {
      const arm = i % 2, along = rnd(i + 10);
      const radius = S(0.015 + along * 0.2);
      // Inner stars orbit faster, which slowly winds the arms.
      const angle = arm * Math.PI + along * 5.2 + (rnd(i + 20) - 0.5) * 0.5 + time * 0.05 / (0.3 + along);
      const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius;
      const a = (0.25 + 0.5 * Math.max(0, Math.sin(time * (1 + rnd(i + 30) * 2) + i))) * (1 - along * 0.5) * intensity();
      glow(x, y, S(0.002 + rnd(i + 40) * 0.003), i % 3 ? '#9fd8ff' : tint(), a);
    }
    c.restore();
    glow(X(0.878), Y(0.115), S(0.05), '#f4b8ff', (0.14 + Math.sin(time * 0.7 + 2) * 0.05) * intensity());
    glow(X(0.565), Y(0.325), S(0.03), '#ff7ad9', (0.14 + Math.sin(time * 0.9) * 0.06) * intensity());
  }

  function stars() {
    const time = t * speed(), count = Math.round(110 * Math.max(0.1, num(settings.starDensity, 1)));
    for (let i = 0; i < count; i++) {
      const nx = rnd(i + 700), ny = rnd(i + 750) * 0.6;
      // Keep stars off the planet's face.
      if (Math.hypot(nx - 0.799, (ny - 0.537) * 0.563) < 0.23) continue;
      const a = Math.max(0, Math.sin(time * (0.6 + rnd(i + 760) * 2.2) + i * 1.7)) ** 2 * intensity();
      if (i % 9 === 0) sparkle(X(nx), Y(ny), S(0.0012), tint(), a * 0.8);
      else { c.fillStyle = rgba('#e6f4ff', a * 0.85); const r = Math.max(0.8, S(0.0008 + rnd(i + 770) * 0.0008)); c.fillRect(X(nx) - r / 2, Y(ny) - r / 2, r, r); }
    }
  }

  // Occasional shooting stars streak down to the right.
  function meteors() {
    const time = t * speed();
    for (let i = 0; i < 3; i++) {
      const cycle = 9 + i * 4.5, p = ((time + i * 3.7) % cycle) / 1.4;
      if (p > 1) continue;
      const seed = Math.floor((time + i * 3.7) / cycle) * 7 + i;
      const sx = 0.1 + rnd(seed) * 0.6, sy = 0.03 + rnd(seed + 1) * 0.2;
      const hx = X(sx + p * 0.22), hy = Y(sy + p * 0.12), tx = hx - S(0.07), ty = hy - S(0.038);
      const a = Math.sin(p * Math.PI) * intensity();
      const g = c.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, rgba('#ffffff', 0)); g.addColorStop(1, rgba('#ffffff', a * 0.9));
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.strokeStyle = g; c.lineWidth = Math.max(1, S(0.0012)); c.lineCap = 'round'; c.stroke();
      glow(hx, hy, S(0.006), '#bfe6ff', a * 0.7);
    }
  }

  // The giant planet: a breathing atmosphere rim and the sunrise on its horizon.
  function planet() {
    // Limb fitted to the painting; the arc stops at the sea horizon.
    const time = t * speed(), cx = X(0.799), cy = Y(0.537), r = S(0.2248);
    const pulse = 0.75 + Math.sin(time * 0.6) * 0.25;
    const rim = c.createLinearGradient(cx - r, cy, cx, cy - r);
    rim.addColorStop(0, rgba('#9fdcff', 0.4 * pulse * intensity())); rim.addColorStop(1, rgba('#9fdcff', 0));
    c.save(); c.beginPath(); c.arc(cx, cy, r, Math.PI - 0.2, Math.PI * 1.62);
    c.strokeStyle = rim; c.lineWidth = S(0.004); c.shadowColor = '#7fc4ff'; c.shadowBlur = S(0.015); c.stroke(); c.restore();
    const flare = 0.8 + Math.sin(time * 0.8) * 0.2 + Math.sin(time * 2.9) * 0.05;
    glow(X(0.548), Y(0.638), S(0.09), '#ffd38a', 0.45 * flare * intensity());
    glow(X(0.548), Y(0.638), S(0.24), '#ff8ad8', 0.10 * flare * intensity());
    c.fillStyle = rgba('#fff1d6', 0.35 * flare * intensity());
    c.fillRect(X(0.548) - S(0.18) * flare, Y(0.638) - 0.75, S(0.36) * flare, 1.5);
  }

  // Shimmer on the mirror-like sea: a rippling sun column and scattered glints.
  function sea() {
    const time = t * speed();
    for (let i = 0; i < 18; i++) {
      const ny = 0.7 + i * 0.012, wobble = Math.sin(time * 2 + i * 1.3) * 0.006;
      const width = S(0.012 + Math.sin(time * 1.5 + i) * 0.004 + i * 0.0015);
      c.fillStyle = rgba('#ffd9a0', (0.18 - i * 0.008) * intensity());
      c.fillRect(X(0.548 + wobble) - width / 2, Y(ny), width, Math.max(1, S(0.0018)));
    }
    for (let i = 0; i < 50; i++) {
      const nx = 0.3 + rnd(i + 900) * 0.68, ny = 0.71 + rnd(i + 950) * 0.2;
      const a = Math.max(0, Math.sin(time * (1 + rnd(i) * 1.8) + i * 2.3)) ** 4;
      const len = S(0.004 + rnd(i + 3) * 0.008);
      c.fillStyle = rgba(i % 3 ? '#cfe4ff' : tint(), a * 0.5 * intensity());
      c.fillRect(X(nx) - len / 2, Y(ny), len, Math.max(1, S(0.001)));
    }
  }

  function mist() {
    const bands = [[0.42, 0.72, 0.1, 0.07], [0.72, 0.71, 0.1, 0.06], [0.95, 0.93, 0.1, 0.09], [0.18, 0.7, 0.08, 0.06]];
    bands.forEach(([x, y, r, a], i) => {
      const drift = Math.sin(t * speed() * 0.06 + i * 1.9) * 0.05;
      c.save(); c.translate(X(x + drift), Y(y)); c.scale(3.5, 0.45);
      glow(0, 0, S(r), i % 2 ? '#ffc7ec' : '#c9d3ff', a * intensity()); c.restore();
    });
  }

  // Fine cosmic dust drifting slowly across the scene.
  function dust() {
    const time = t * speed();
    for (let i = 0; i < 40; i++) {
      const depth = rnd(i + 300), cycle = 90 - depth * 50;
      const p = ((time + rnd(i + 310) * cycle) % cycle) / cycle;
      const nx = -0.03 + p * 1.06, ny = 0.05 + rnd(i + 320) * 0.85 + Math.sin(time * 0.4 + i) * 0.008;
      glow(X(nx), Y(ny), S(0.0015 + depth * 0.003), depth > 0.5 ? tint() : '#bcd8ff', Math.sin(p * Math.PI) * (0.25 + depth * 0.35) * intensity());
    }
  }

  function draw() {
    if (!w) return;
    layout();
    if (ready) c.drawImage(art, ox, oy, aw, ah); else { c.fillStyle = '#0a0620'; c.fillRect(0, 0, w, h); }
    c.globalCompositeOperation = 'lighter';
    stars();
    if (ready) { galaxy(); planet(); sea(); mist(); }
    meteors(); dust();
    c.globalCompositeOperation = 'source-over';
    const shade = c.createLinearGradient(0, 0, 0, h); shade.addColorStop(0, 'rgba(3,6,18,.08)'); shade.addColorStop(0.72, 'rgba(3,6,18,0)'); shade.addColorStop(1, 'rgba(3,6,18,.26)');
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
