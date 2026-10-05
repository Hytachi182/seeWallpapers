/* Digital Rain 3D: hand-maintained Matrix rain with depth of field, a rain-revealed clock and glitches. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...window.seeWallpaper?.getSettings?.() };
  let w, h, ratio = 1, t = 0, last = 0, frame = 0, timer = 0, paused = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fps = reduced ? 15 : 30;
  const rnd = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const tint = () => /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#00ff66';
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const on = (v, d = true) => v === undefined ? d : v === true || v === 'true';
  const speed = () => num(settings.speed, 1), density = () => Math.min(1.5, Math.max(0.3, num(settings.density, 1)));
  const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const css = (v, a = 1) => `rgba(${v[0]},${v[1]},${v[2]},${a})`;

  // Half-width katakana (drawn mirrored, as in the films), digits and a few symbols.
  const GLYPHS = 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ012345789Z:・."=*+-<>¦';
  const N = GLYPHS.length;
  // Depth planes: far (soft, slow), focus plane, near (large, out of focus).
  const PLANES = [
    { size: 13, speed: 7, alpha: 0.42, blur: 1.1, fill: 0.85, trail: [10, 26], sway: 6 },
    { size: 20, speed: 12, alpha: 0.95, blur: 0, fill: 0.62, trail: [12, 32], sway: 14 },
    { size: 38, speed: 22, alpha: 0.75, blur: 3.2, fill: 0.16, trail: [6, 16], sway: 34 }
  ];

  // Glyph atlases: one row of trail glyphs, one of bright heads, per plane.
  // Rebuilt only when the colour, glow or screen scale change.
  let atlasKey = '';
  function buildAtlases() {
    const key = `${tint()}|${on(settings.glow)}|${ratio}`;
    if (key === atlasKey) return; atlasKey = key;
    const base = rgb(tint()), head = mix(base, [255, 255, 255], 0.82), glowOn = on(settings.glow);
    for (const plane of PLANES) {
      const cell = Math.ceil(plane.size * 1.6 * ratio), pad = Math.ceil(cell * 0.3);
      const a = plane.atlas || (plane.atlas = document.createElement('canvas'));
      a.width = (cell + pad * 2) * N; a.height = (cell + pad * 2) * 2;
      const x = a.getContext('2d'); x.clearRect(0, 0, a.width, a.height);
      x.font = `${Math.round(plane.size * ratio)}px "MS Gothic", "Yu Gothic", Consolas, monospace`; x.textAlign = 'center'; x.textBaseline = 'middle';
      if (plane.blur) x.filter = `blur(${plane.blur * ratio}px)`;
      for (let row = 0; row < 2; row++) for (let i = 0; i < N; i++) {
        const cx = i * (cell + pad * 2) + pad + cell / 2, cy = row * (cell + pad * 2) + pad + cell / 2;
        x.save(); x.translate(cx, cy); x.scale(-1, 1);
        x.shadowColor = css(row ? head : base, 0.9); x.shadowBlur = glowOn ? (row ? 14 : 5) * ratio : 0;
        x.fillStyle = css(row ? head : base); x.fillText(GLYPHS[i], 0, 0);
        if (row && glowOn) x.fillText(GLYPHS[i], 0, 0);
        x.restore();
      }
      plane.cell = cell; plane.pad = pad;
    }
  }

  // Columns hold a mutating glyph grid and one or two falling drops.
  function buildColumns() {
    for (const [p, plane] of PLANES.entries()) {
      const step = plane.size * 1.05, cols = Math.ceil((w + plane.sway * 2) / step) + 1, rows = Math.ceil(h / (plane.size * 1.12)) + 2;
      plane.step = step; plane.rows = rows; plane.lineH = plane.size * 1.12;
      plane.columns = Array.from({ length: cols }, (_, i) => {
        const seed = i * 13 + p * 1000;
        return {
          x: i * step - plane.sway, glyphs: Uint8Array.from({ length: rows }, (_, r) => Math.floor(rnd(seed + r) * N)),
          active: rnd(seed + 3), // Drops start spread over the screen so a resize never shows an empty frame.
          drops: [0, 1].map(k => ({ y: rnd(seed + 5 + k) * rows * (k ? 2.4 : 1.4) - rows * k, v: 0.7 + rnd(seed + 7 + k) * 0.6, len: 0 }))
        };
      });
      plane.columns.forEach((col, i) => col.drops.forEach((d, k) => d.len = plane.trail[0] + rnd(i * 7 + k + p) * (plane.trail[1] - plane.trail[0])));
    }
  }

  // The clock: a text mask sampled on the focus plane's grid; glyphs inside it stay lit.
  let clockMask = null, clockText = '', clockGlow = null;
  function buildClock() {
    const plane = PLANES[1];
    const now = new Date(), text = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (text === clockText && clockMask) return; clockText = text;
    const cols = plane.columns.length, rows = plane.rows, m = document.createElement('canvas');
    m.width = cols; m.height = rows; const x = m.getContext('2d');
    // Fit the text to ~60% of the width, in grid units (cells are taller than wide).
    const fontRows = Math.min(rows * 0.34, cols * 0.29 * plane.step / plane.lineH);
    x.save(); x.scale(plane.lineH / plane.step, 1);
    x.font = `900 ${fontRows}px "Segoe UI", Arial, sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = '#fff'; x.fillText(text, (cols / 2) * plane.step / plane.lineH, rows * 0.46); x.restore();
    const px = x.getImageData(0, 0, cols, rows).data;
    clockMask = new Uint8Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) clockMask[i] = px[i * 4 + 3] > 110 ? 1 : 0;
    // Soft halo behind the digits, in screen space, so the time reads at a glance.
    const g = clockGlow || (clockGlow = document.createElement('canvas'));
    g.width = Math.ceil(w * ratio); g.height = Math.ceil(h * ratio);
    const gx = g.getContext('2d'); gx.clearRect(0, 0, g.width, g.height); gx.scale(ratio, ratio);
    gx.filter = `blur(${Math.round(plane.lineH * 1.2)}px)`;
    gx.font = `900 ${fontRows * plane.lineH}px "Segoe UI", Arial, sans-serif`; gx.textAlign = 'center'; gx.textBaseline = 'middle';
    gx.fillStyle = tint(); gx.fillText(text, (cols / 2) * plane.step - plane.sway, rows * 0.46 * plane.lineH);
  }

  let lastTick = 0;
  function update(dt) {
    const sp = speed();
    for (const plane of PLANES) for (const [i, col] of plane.columns.entries()) {
      const enabled = col.active < plane.fill * density();
      for (const d of col.drops) {
        d.y += dt * plane.speed * d.v * sp;
        if (d.y - d.len > plane.rows) {
          d.y = -rnd(i + d.y) * plane.rows * (enabled ? 1.2 : 3); d.v = 0.7 + rnd(i * 3 + t) * 0.6;
          d.len = plane.trail[0] + rnd(i * 5 + t) * (plane.trail[1] - plane.trail[0]);
        }
      }
      // Glyphs flicker to new symbols, faster near the drop heads.
      const flips = Math.max(1, Math.round(plane.rows * dt * 0.6 * sp));
      for (let k = 0; k < flips; k++) if (Math.random() < 0.5) col.glyphs[Math.floor(Math.random() * plane.rows)] = Math.floor(Math.random() * N);
    }
  }

  function drawPlane(plane, p, time) {
    const { atlas, cell, pad, lineH } = plane, span = cell + pad * 2, dw = span / ratio;
    const sway = Math.sin(time * 0.05 + p) * plane.sway;
    const useClock = p === 1 && clockMask && on(settings.clock), cols = plane.columns.length;
    for (const [ci, col] of plane.columns.entries()) {
      const enabled = col.active < plane.fill * density();
      const x = col.x + sway;
      if (x < -plane.size * 2 || x > w + plane.size * 2) continue;
      // Clock cells glow steadily; brighter when a drop passes through.
      if (useClock) for (let r = 0; r < plane.rows; r++) {
        if (!clockMask[r * cols + ci]) continue;
        c.globalAlpha = 0.8 + 0.15 * Math.sin(time * 2 + ci * 0.7 + r);
        c.drawImage(atlas, col.glyphs[r] * span, span, span, span, x - dw / 2, r * lineH - dw / 2, dw, dw);
      }
      if (!enabled) continue;
      for (const d of col.drops) {
        const headRow = Math.floor(d.y);
        for (let k = 0; k < d.len; k++) {
          const r = headRow - k;
          if (r < 0 || r >= plane.rows || (k && useClock && clockMask[r * cols + ci])) continue;
          const fade = (1 - k / d.len) ** 1.7;
          c.globalAlpha = Math.min(1, plane.alpha * (k === 0 ? 1 : fade));
          c.drawImage(atlas, col.glyphs[r] * span, k === 0 ? span : 0, span, span, x - dw / 2, r * lineH - dw / 2, dw, dw);
        }
      }
    }
    c.globalAlpha = 1;
  }

  // Overlays: dark green grade, scanlines and vignette.
  let scan = null;
  function overlays() {
    if (!scan) { scan = document.createElement('canvas'); scan.width = 1; scan.height = 3; const x = scan.getContext('2d'); x.fillStyle = 'rgba(0,0,0,.22)'; x.fillRect(0, 2, 1, 1); }
    c.fillStyle = c.createPattern(scan, 'repeat'); c.fillRect(0, 0, w, h);
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,4,2,.78)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
  }

  // Occasional glitch: horizontal bands slip sideways with a colour split.
  function glitch(time) {
    if (reduced || !on(settings.glitch)) return;
    const cycle = 11, p = (time % cycle) / cycle, seed = Math.floor(time / cycle);
    if (p > 0.025) return;
    const bands = 3 + Math.floor(rnd(seed) * 4);
    for (let i = 0; i < bands; i++) {
      const y = rnd(seed * 9 + i) * h, bh = 4 + rnd(seed * 7 + i + Math.floor(time * 30)) * 38, dx = (rnd(seed + i * 3 + Math.floor(time * 30)) - 0.5) * 70;
      c.drawImage(canvas, 0, y * ratio, canvas.width, bh * ratio, dx, y, w, bh);
    }
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.18;
    c.drawImage(canvas, 0, 0, canvas.width, canvas.height, 4, 0, w, h);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }

  function draw() {
    if (!w) return;
    buildAtlases();
    if (on(settings.clock)) buildClock();
    const time = t * speed();
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    const base = rgb(tint()), g = c.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h * 0.45, Math.hypot(w, h) * 0.6);
    g.addColorStop(0, css(mix([2, 8, 5], base, 0.06))); g.addColorStop(1, '#010302');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    PLANES.forEach((plane, p) => {
      if (p === 1 && clockGlow && on(settings.clock)) {
        const dx = Math.sin(time * 0.05 + 1) * plane.sway;
        // Shade the far rain under the digits, then light them with a soft halo.
        c.filter = 'brightness(0)'; c.globalAlpha = 0.85; c.drawImage(clockGlow, dx, 0, w, h); c.filter = 'none';
        c.globalAlpha = 0.16 + 0.05 * Math.sin(time * 0.8);
        c.drawImage(clockGlow, dx, 0, w, h); c.globalAlpha = 1;
      }
      drawPlane(plane, p, time);
    });
    glitch(time);
    overlays();
  }

  function resize() {
    w = innerWidth; h = innerHeight; ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2073600 / (w * h)));
    canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); buildColumns(); clockMask = null; clockText = '';
    atlasKey = '';
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
  window.seeWallpaper?.onSettingsChanged(value => { settings = { ...settings, ...value }; draw(); });
  window.seeWallpaper?.onPause(() => { paused = true; stop(); }); window.seeWallpaper?.onResume(() => { paused = false; start(); });
  window.seeWallpaper?.onPerformanceChanged(value => { fps = Math.max(1, Math.min(reduced ? 15 : 60, Number(value) || 30)); start(); });
  resize(); const preview = new URLSearchParams(location.search).get('preview');
  if (preview !== null) {
    // Deterministic still: advance the simulation to the requested time.
    paused = true; const target = Number(preview) || 12;
    for (let s = 0; s < target; s += 1 / 30) { t = s; update(1 / 30); }
    t = target; draw();
  } else start();
})();
