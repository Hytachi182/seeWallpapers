/* Orbital Earth: the bundled illustration (artwork.jpg) animated with Canvas overlays. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...window.seeWallpaper?.getSettings?.() };
  let w, h, t = 0, last = 0, frame = 0, timer = 0, paused = false, ready = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fps = reduced ? 15 : 30;
  const TAU = Math.PI * 2, rnd = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const tint = () => /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#6fd3ff';
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const speed = () => num(settings.speed, 1), intensity = () => num(settings.intensity, 1);
  function rgba(hex, a) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a))})`; }

  const art = new Image();
  art.onload = () => { ready = true; draw(); };
  art.src = 'artwork.jpg';

  // Normalized artwork coordinates (0..1), measured on the painting.
  const EARTH = { x: 0.4985, y: 0.5025, rx: 0.2655, ry: 0.4505 };
  const SUN = [0.2556, 0.315];
  const SATELLITES = [[0.1215, 0.13], [0.302, 0.084], [0.392, 0.04], [0.66, 0.068], [0.767, 0.12], [0.097, 0.395], [0.125, 0.442], [0.854, 0.574], [0.781, 0.667], [0.191, 0.722], [0.17, 0.864], [0.889, 0.79], [0.701, 0.899]];
  const DISHES = [[0.212, 0.827], [0.872, 0.759], [0.77, 0.09]];
  const CITIES = [[0.725, 0.392], [0.522, 0.257], [0.679, 0.372], [0.647, 0.401], [0.587, 0.702], [0.602, 0.615], [0.499, 0.291], [0.631, 0.387], [0.507, 0.234], [0.685, 0.315], [0.458, 0.301], [0.58, 0.324], [0.542, 0.317], [0.598, 0.388], [0.585, 0.358], [0.467, 0.291], [0.715, 0.488], [0.651, 0.401], [0.584, 0.372], [0.616, 0.458], [0.524, 0.777], [0.682, 0.312], [0.552, 0.8], [0.599, 0.598], [0.551, 0.272], [0.594, 0.629], [0.469, 0.315], [0.543, 0.301], [0.473, 0.329], [0.504, 0.286], [0.587, 0.717], [0.708, 0.531], [0.625, 0.358], [0.669, 0.315], [0.474, 0.284], [0.592, 0.557], [0.487, 0.272], [0.642, 0.375], [0.447, 0.286], [0.611, 0.748], [0.476, 0.23], [0.622, 0.452], [0.569, 0.758], [0.568, 0.715], [0.641, 0.365], [0.724, 0.37], [0.529, 0.243], [0.569, 0.606], [0.473, 0.202], [0.605, 0.588], [0.441, 0.322], [0.565, 0.787], [0.587, 0.273], [0.6, 0.416], [0.588, 0.55], [0.53, 0.176], [0.598, 0.272], [0.533, 0.165], [0.701, 0.429], [0.531, 0.303], [0.638, 0.689], [0.583, 0.258], [0.577, 0.197], [0.464, 0.215], [0.616, 0.301], [0.508, 0.355], [0.639, 0.315], [0.625, 0.401], [0.538, 0.355], [0.611, 0.443], [0.699, 0.431]];

  // Cover-fit with a slow drifting zoom; portrait screens stay on the Earth.
  let ox = 0, oy = 0, aw = 1, ah = 1;
  function layout() {
    const iw = art.naturalWidth || 1672, ih = art.naturalHeight || 941;
    const zoom = 1.035 + Math.sin(t * speed() * 0.04) * 0.012;
    const scale = Math.max(w / iw, h / ih) * zoom;
    aw = iw * scale; ah = ih * scale;
    ox = (w - aw) * 0.5 + Math.sin(t * speed() * 0.027) * (aw - w) * 0.06;
    oy = (h - ah) * 0.5 + Math.cos(t * speed() * 0.021) * Math.max(0, ah - h) * 0.2;
    ox = Math.min(0, Math.max(w - aw, ox)); oy = Math.min(0, Math.max(h - ah, oy));
  }
  const X = nx => ox + nx * aw, Y = ny => oy + ny * ah, S = n => n * aw;

  function glow(x, y, r, color, alpha) {
    if (r <= 0 || alpha <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  function spikes(x, y, len, color, a) {
    for (const [sx, sy] of [[1, 0], [0, 1]]) {
      const g = c.createLinearGradient(x - len * sx, y - len * sy, x + len * sx, y + len * sy);
      g.addColorStop(0, rgba(color, 0)); g.addColorStop(0.5, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
      c.fillStyle = g; c.fillRect(sx ? x - len : x - 0.75, sy ? y - len : y - 0.75, sx ? len * 2 : 1.5, sy ? len * 2 : 1.5);
    }
  }
  const earthClip = () => { c.beginPath(); c.ellipse(X(EARTH.x), Y(EARTH.y), S(EARTH.rx), EARTH.ry * ah, 0, 0, TAU); };

  function stars(time) {
    const count = Math.round(160 * Math.max(0.1, num(settings.starDensity, 1)));
    for (let i = 0; i < count; i++) {
      const nx = rnd(i + 700), ny = rnd(i + 750);
      if (((nx - EARTH.x) / EARTH.rx) ** 2 + ((ny - EARTH.y) / EARTH.ry) ** 2 < 1.05) continue;
      const a = Math.max(0, Math.sin(time * (0.5 + rnd(i + 760) * 2) + i * 1.7)) ** 3 * intensity();
      if (i % 11 === 0) { glow(X(nx), Y(ny), S(0.004), '#a9dcff', 0.6 * a); spikes(X(nx), Y(ny), S(0.012) * a, '#e6f6ff', 0.7 * a); }
      else { const r = Math.max(0.8, S(0.0008)); c.fillStyle = rgba('#e6f4ff', a * 0.8); c.fillRect(X(nx) - r / 2, Y(ny) - r / 2, r, r); }
    }
  }

  // Sunrise on the Earth's limb.
  function sun(time) {
    const x = X(SUN[0]), y = Y(SUN[1]), f = (0.85 + Math.sin(time * 0.6) * 0.12 + Math.sin(time * 2.7) * 0.03) * intensity();
    glow(x, y, S(0.06), '#fff1cf', 0.45 * f); glow(x, y, S(0.16), '#ff9b4a', 0.14 * f);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + time * 0.025, len = S(0.04 + rnd(i) * 0.06) * (0.8 + Math.sin(time * 0.8 + i) * 0.2);
      c.save(); c.translate(x, y); c.rotate(a);
      const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, rgba('#ffe4b8', 0.3 * f)); g.addColorStop(1, rgba('#ffe4b8', 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -S(0.0018)); c.lineTo(len, 0); c.lineTo(0, S(0.0018)); c.fill(); c.restore();
    }
    c.save(); c.translate(x, y); c.scale(1, 0.2); spikes(0, 0, S(0.22), '#ffd9a8', 0.35 * f); c.restore();
  }

  // Atmosphere rim and a light sweeping around it.
  function atmosphere(time) {
    const pulse = 0.75 + Math.sin(time * 0.5) * 0.25;
    c.save(); earthClip(); c.strokeStyle = rgba(tint(), 0.3 * pulse * intensity()); c.lineWidth = S(0.006); c.shadowColor = tint(); c.shadowBlur = S(0.02); c.stroke(); c.restore();
    const a = -2.2 + Math.sin(time * 0.08) * 1.1;
    glow(X(EARTH.x) + Math.cos(a) * S(EARTH.rx), Y(EARTH.y) + Math.sin(a) * EARTH.ry * ah, S(0.05), tint(), 0.25 * intensity());
  }

  function cities(time) {
    CITIES.forEach(([nx, ny], i) => {
      const a = (0.3 + 0.7 * Math.max(0, Math.sin(time * (0.4 + rnd(i) * 1.1) + i * 2.3)) ** 2) * intensity();
      glow(X(nx), Y(ny), S(0.0035 + rnd(i + 5) * 0.0035), '#ffc266', 0.55 * a);
    });
  }

  // Extra satellites circling on tilted orbits; hidden while behind the globe.
  const ORBITS = [[1.18, 0.32, -0.35, 0.05], [1.3, 0.22, 0.42, -0.04], [1.42, 0.4, 0.12, 0.03], [1.12, 0.5, -0.9, 0.06]];
  function orbiters(time) {
    const cx = X(EARTH.x), cy = Y(EARTH.y), R = S(EARTH.rx), RY = EARTH.ry * ah;
    ORBITS.forEach(([k, flat, tilt, rate], i) => {
      const rx = R * k, ry = R * k * flat, ct = Math.cos(tilt), st = Math.sin(tilt);
      const at = a => { const x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * ct - y * st, cy + x * st + y * ct]; };
      // Faint orbit path, front half only.
      c.save(); c.translate(cx, cy); c.rotate(tilt);
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, Math.PI); c.strokeStyle = rgba(tint(), 0.12 * intensity()); c.lineWidth = 1; c.setLineDash([2, 6]); c.stroke();
      c.restore();
      for (let j = 0; j < 2; j++) {
        const a = time * rate * 4 + i * 1.7 + j * Math.PI, [wx, wy] = at(a);
        if (Math.sin(a) < 0 && ((wx - cx) / R) ** 2 + ((wy - cy) / RY) ** 2 < 1) continue;
        for (let n = 1; n <= 10; n++) { const [tx, ty] = at(a - n * 0.02 * Math.sign(rate)); glow(tx, ty, S(0.0025), tint(), 0.25 * (1 - n / 10) * intensity()); }
        glow(wx, wy, S(0.006), '#ffffff', 0.85 * intensity());
        if (Math.sin(time * 5 + i * 2 + j) > 0.6) glow(wx, wy, S(0.012), '#ff6a5a', 0.7);
      }
    });
  }

  // Painted satellites: blinking beacons, panel glints and radar pings.
  function satellites(time) {
    SATELLITES.forEach(([nx, ny], i) => {
      const x = X(nx), y = Y(ny);
      if (Math.sin(time * 3 + i * 1.9) > 0.75) glow(x, y, S(0.006), i % 2 ? '#ff5f57' : '#7dffb0', 0.9 * intensity());
      const g = ((time + i * 1.3) % 8) / 0.8;
      if (g < 1) { glow(x, y, S(0.02), '#e6f4ff', Math.sin(g * Math.PI) * 0.45 * intensity()); spikes(x, y, S(0.03) * Math.sin(g * Math.PI), '#ffffff', 0.6); }
    });
    DISHES.forEach(([nx, ny], i) => {
      const p = ((time * 0.5 + i * 0.37) % 1);
      c.beginPath(); c.arc(X(nx), Y(ny), S(0.005 + p * 0.06), 0, TAU);
      c.strokeStyle = rgba(tint(), (1 - p) * 0.5 * intensity()); c.lineWidth = 1.5; c.stroke();
    });
  }

  // Data links: a beam from a satellite to a city, with a packet travelling down it.
  function links(time) {
    for (let k = 0; k < 3; k++) {
      const cycle = 5 + k * 1.7, p = ((time + k * 2.1) % cycle) / cycle, seed = Math.floor((time + k * 2.1) / cycle) * 3 + k;
      const [sx, sy] = SATELLITES[Math.floor(rnd(seed) * SATELLITES.length)], [ex, ey] = CITIES[Math.floor(rnd(seed + 1) * CITIES.length)];
      const fade = Math.sin(p * Math.PI) * intensity();
      const x0 = X(sx), y0 = Y(sy), x1 = X(ex), y1 = Y(ey);
      const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, rgba(tint(), 0.35 * fade)); g.addColorStop(1, rgba(tint(), 0.05 * fade));
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = g; c.lineWidth = 1.2; c.stroke();
      const q = (p * 2.5) % 1;
      glow(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, S(0.006), '#ffffff', 0.9 * fade);
      if (p > 0.35) glow(x1, y1, S(0.012), tint(), 0.6 * fade);
    }
  }

  function meteors(time) {
    const cycle = 13, p = (time % cycle) / 1.2;
    if (p > 1) return;
    const seed = Math.floor(time / cycle), sx = 0.72 + rnd(seed) * 0.2, sy = 0.03 + rnd(seed + 1) * 0.15;
    const hx = X(sx + p * 0.12), hy = Y(sy - p * 0.05), tx = hx - S(0.06), ty = hy + S(0.025), a = Math.sin(p * Math.PI) * intensity();
    const g = c.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, rgba('#ffffff', 0)); g.addColorStop(1, rgba('#ffffff', a * 0.9));
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.strokeStyle = g; c.lineWidth = 1.4; c.stroke();
  }

  function draw() {
    if (!w) return;
    layout();
    if (!ready) { c.fillStyle = '#02050c'; c.fillRect(0, 0, w, h); return; }
    c.drawImage(art, ox, oy, aw, ah);
    const time = t * speed();
    c.globalCompositeOperation = 'lighter';
    stars(time); meteors(time); atmosphere(time); cities(time); links(time); orbiters(time); satellites(time); sun(time);
    c.globalCompositeOperation = 'source-over';
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
