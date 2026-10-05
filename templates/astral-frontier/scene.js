/* Astral Frontier: the bundled illustration (artwork.jpg) animated with Canvas overlays. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...window.seeWallpaper?.getSettings?.() };
  let w, h, t = 0, last = 0, frame = 0, timer = 0, paused = false, ready = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fps = reduced ? 15 : 30;
  const TAU = Math.PI * 2, rnd = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const tint = () => /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#5fc8ff';
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const speed = () => num(settings.speed, 1), intensity = () => num(settings.intensity, 1);
  function rgba(hex, a) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a))})`; }

  const art = new Image();
  art.onload = () => { ready = true; draw(); };
  art.src = 'artwork.jpg';

  // Positions below are normalized artwork coordinates (0..1), measured on the painting.
  const LIMB = [[0.508, 0.769], [0.547, 0.667], [0.586, 0.583], [0.630, 0.509], [0.693, 0.454], [0.760, 0.417], [0.833, 0.394], [0.917, 0.375], [1.0, 0.369]];
  const SUN = [0.693, 0.449], CORE = [0.49, 0.225];
  const CITIES = [[0.74, 0.575], [0.698, 0.658], [0.764, 0.687], [0.66, 0.759], [0.71, 0.63], [0.702, 0.643], [0.7, 0.62], [0.666, 0.785], [0.694, 0.629], [0.69, 0.611], [0.757, 0.687], [0.828, 0.729], [0.682, 0.63], [0.759, 0.685], [0.776, 0.835], [0.739, 0.66], [0.679, 0.694], [0.728, 0.584], [0.682, 0.651], [0.66, 0.8], [0.779, 0.7], [0.763, 0.556], [0.78, 0.688], [0.767, 0.855], [0.738, 0.674], [0.781, 0.798], [0.739, 0.603], [0.685, 0.795], [0.699, 0.672], [0.788, 0.702], [0.771, 0.722], [0.711, 0.66], [0.724, 0.647], [0.757, 0.664], [0.754, 0.56], [0.66, 0.738], [0.831, 0.725], [0.752, 0.663], [0.693, 0.687], [0.674, 0.816], [0.766, 0.681], [0.813, 0.69], [0.701, 0.661], [0.8, 0.696], [0.804, 0.687], [0.691, 0.801], [0.702, 0.688], [0.709, 0.643], [0.767, 0.764], [0.831, 0.694], [0.802, 0.725], [0.688, 0.817], [0.84, 0.761], [0.731, 0.658], [0.684, 0.621], [0.697, 0.614], [0.943, 0.523], [0.968, 0.531], [0.905, 0.505]];
  const FLARES = [[0.645, 0.214], [0.282, 0.24], [0.178, 0.474], [0.406, 0.245], [0.719, 0.082], [0.757, 0.109], [0.155, 0.38], [0.101, 0.591], [0.65, 0.091], [0.475, 0.224], [0.558, 0.36], [0.83, 0.041], [0.87, 0.281], [0.362, 0.338], [0.29, 0.036], [0.554, 0.185], [0.125, 0.524], [0.054, 0.307], [0.598, 0.049], [0.95, 0.185], [0.056, 0.04], [0.236, 0.487], [0.767, 0.33], [0.582, 0.122], [0.262, 0.154], [0.453, 0.061], [0.029, 0.382]];
  const SUIT = { core: [0.362, 0.586], side: [[0.3486, 0.594], [0.3798, 0.595], [0.347, 0.636], [0.374, 0.639]], visor: [0.393, 0.534] };

  // Cover-fit with a slow drifting zoom.
  let ox = 0, oy = 0, aw = 1, ah = 1;
  function layout() {
    const iw = art.naturalWidth || 1672, ih = art.naturalHeight || 941;
    const zoom = 1.04 + Math.sin(t * speed() * 0.045) * 0.012;
    const scale = Math.max(w / iw, h / ih) * zoom;
    aw = iw * scale; ah = ih * scale;
    // Portrait screens frame the astronaut and the sunrise over the Earth.
    const focus = w < h ? 0.42 : 0.5;
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
  function spikes(x, y, len, color, a, angle = 0) {
    c.save(); c.translate(x, y); c.rotate(angle);
    for (const [sx, sy] of [[1, 0], [0, 1]]) {
      const g = c.createLinearGradient(-len * sx, -len * sy, len * sx, len * sy);
      g.addColorStop(0, rgba(color, 0)); g.addColorStop(0.5, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
      c.fillStyle = g; c.fillRect(sx ? -len : -0.75, sy ? -len : -0.75, sx ? len * 2 : 1.5, sy ? len * 2 : 1.5);
    }
    c.restore();
  }

  // The galaxy: a breathing core and stars circling along its arms.
  function galaxy(time) {
    const pulse = 0.8 + Math.sin(time * 0.45) * 0.2;
    glow(X(CORE[0]), Y(CORE[1]), S(0.05), '#ffe6c2', 0.38 * pulse * intensity());
    glow(X(CORE[0]), Y(CORE[1]), S(0.15), '#a77bff', 0.1 * pulse * intensity());
    c.save(); c.translate(X(CORE[0]), Y(CORE[1])); c.rotate(-0.35); c.scale(1, 0.6);
    for (let i = 0; i < 110; i++) {
      const arm = i % 2, along = rnd(i + 10), radius = S(0.012 + along * 0.17);
      const angle = arm * Math.PI + along * 5.4 + (rnd(i + 20) - 0.5) * 0.5 + time * 0.05 / (0.3 + along);
      const a = (0.3 + 0.5 * Math.max(0, Math.sin(time * (1 + rnd(i + 30) * 2) + i))) * (1 - along * 0.5) * intensity();
      glow(Math.cos(angle) * radius, Math.sin(angle) * radius, S(0.0025 + rnd(i + 40) * 0.003), i % 3 ? '#9fd8ff' : '#ffb7f0', a);
    }
    c.restore();
  }

  // Sunrise on the Earth's limb: pulsing core, rotating rays and an anamorphic streak.
  function sunrise(time) {
    const x = X(SUN[0]), y = Y(SUN[1]), flare = (0.85 + Math.sin(time * 0.7) * 0.12 + Math.sin(time * 3.1) * 0.03) * intensity();
    glow(x, y, S(0.11), '#fff1cf', 0.42 * flare); glow(x, y, S(0.25), '#ffb070', 0.12 * flare);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * TAU + time * 0.03, len = S(0.05 + rnd(i) * 0.07) * (0.8 + Math.sin(time * 0.9 + i) * 0.2);
      c.save(); c.translate(x, y); c.rotate(a);
      const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, rgba('#fff4dc', 0.35 * flare)); g.addColorStop(1, rgba('#fff4dc', 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -S(0.002)); c.lineTo(len, 0); c.lineTo(0, S(0.002)); c.fill(); c.restore();
    }
    // Anamorphic streak: long horizontally, short vertically.
    c.save(); c.translate(x, y); c.scale(1, 0.25); spikes(0, 0, S(0.3), '#bfe6ff', 0.35 * flare); c.restore();
    spikes(x, y, S(0.06), '#fff4dc', 0.4 * flare);
    // Lens ghosts along the line through the screen centre.
    const dx = w / 2 - x, dy = h / 2 - y;
    [[0.6, 0.012, '#7fd0ff'], [1.15, 0.02, '#c58bff'], [1.5, 0.008, '#ffd27f']].forEach(([k, r, col]) => glow(x + dx * k, y + dy * k, S(r), col, 0.16 * flare));
  }

  // Atmosphere: a glowing rim that breathes, with a light wave travelling along it.
  function atmosphere(time) {
    const pulse = 0.75 + Math.sin(time * 0.5) * 0.25;
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    const path = () => { c.beginPath(); c.moveTo(X(LIMB[0][0]), Y(LIMB[0][1])); for (let i = 1; i < LIMB.length - 1; i++) { const [x, y] = LIMB[i], [nx, ny] = LIMB[i + 1]; c.quadraticCurveTo(X(x), Y(y), X((x + nx) / 2), Y((y + ny) / 2)); } c.lineTo(X(1), Y(LIMB[LIMB.length - 1][1])); };
    path(); c.strokeStyle = rgba(tint(), 0.22 * pulse * intensity()); c.lineWidth = S(0.012); c.shadowColor = tint(); c.shadowBlur = S(0.02); c.stroke();
    path(); c.strokeStyle = rgba('#d8f3ff', 0.3 * pulse * intensity()); c.lineWidth = S(0.002); c.shadowBlur = 0; c.stroke();
    c.restore();
    // Travelling light along the limb.
    const p = (time * 0.04) % 1, seg = p * (LIMB.length - 1), i = Math.floor(seg), f = seg - i;
    const [x0, y0] = LIMB[i], [x1, y1] = LIMB[Math.min(i + 1, LIMB.length - 1)];
    glow(X(x0 + (x1 - x0) * f), Y(y0 + (y1 - y0) * f), S(0.03), tint(), 0.35 * Math.sin(p * Math.PI) * intensity());
  }

  function cities(time) {
    CITIES.forEach(([nx, ny], i) => {
      const a = (0.35 + 0.65 * Math.max(0, Math.sin(time * (0.4 + rnd(i) * 1.2) + i * 2.7)) ** 2) * intensity();
      glow(X(nx), Y(ny), S(0.004 + rnd(i + 5) * 0.004), '#ffb75e', 0.55 * a);
      if (rnd(i + 9) > 0.8) spikes(X(nx), Y(ny), S(0.008) * a, '#ffd9a0', 0.5 * a);
    });
  }

  function stars(time) {
    FLARES.forEach(([nx, ny], i) => {
      const a = Math.max(0, Math.sin(time * (0.5 + rnd(i) * 1.5) + i * 1.9)) ** 3 * intensity();
      if (a < 0.02) return;
      glow(X(nx), Y(ny), S(0.006), i % 3 ? '#a9dcff' : '#ffd0f4', 0.6 * a);
      spikes(X(nx), Y(ny), S(0.014 + rnd(i + 3) * 0.012) * a, '#e6f6ff', 0.75 * a, i % 4 ? 0 : Math.PI / 4);
    });
    const count = Math.round(140 * Math.max(0.1, num(settings.starDensity, 1)));
    for (let i = 0; i < count; i++) {
      const nx = rnd(i + 700), ny = rnd(i + 750) * 0.6;
      if (ny > 0.36 && nx > 0.5) continue;
      const a = Math.max(0, Math.sin(time * (0.6 + rnd(i + 760) * 2) + i * 1.7)) ** 2 * intensity();
      const r = Math.max(0.8, S(0.0007 + rnd(i + 770) * 0.0008));
      c.fillStyle = rgba('#e6f4ff', a * 0.8); c.fillRect(X(nx) - r / 2, Y(ny) - r / 2, r, r);
    }
  }

  function meteors(time) {
    for (let i = 0; i < 2; i++) {
      const cycle = 10 + i * 6, p = ((time + i * 4.3) % cycle) / 1.3;
      if (p > 1) continue;
      const seed = Math.floor((time + i * 4.3) / cycle) * 7 + i, sx = 0.05 + rnd(seed) * 0.55, sy = 0.02 + rnd(seed + 1) * 0.18;
      const hx = X(sx + p * 0.2), hy = Y(sy + p * 0.11), tx = hx - S(0.07), ty = hy - S(0.038), a = Math.sin(p * Math.PI) * intensity();
      const g = c.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, rgba('#ffffff', 0)); g.addColorStop(1, rgba('#ffffff', a * 0.9));
      c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.strokeStyle = g; c.lineWidth = Math.max(1, S(0.0012)); c.lineCap = 'round'; c.stroke();
      glow(hx, hy, S(0.005), '#bfe6ff', a * 0.7);
    }
  }

  // Asteroid stream glints drifting along the debris belt behind the astronaut.
  function belt(time) {
    for (let i = 0; i < 34; i++) {
      const p = ((time * 0.012 * (0.6 + rnd(i) * 0.8) + rnd(i + 40)) % 1);
      const nx = p * 0.52, ny = 0.42 + p * 0.27 + (rnd(i + 50) - 0.5) * 0.06;
      const a = Math.sin(p * Math.PI) * (0.3 + 0.7 * Math.max(0, Math.sin(time * 2 + i))) * intensity();
      glow(X(nx), Y(ny), S(0.002 + rnd(i + 60) * 0.002), '#cfe3ff', 0.5 * a);
    }
  }

  // Astronaut suit: pulsing backpack core, blinking status lights and a visor glint.
  function suit(time) {
    const pulse = (0.7 + Math.sin(time * 1.6) * 0.3) * intensity();
    glow(X(SUIT.core[0]), Y(SUIT.core[1]), S(0.018), tint(), 0.7 * pulse);
    glow(X(SUIT.core[0]), Y(SUIT.core[1]), S(0.005), '#ffffff', 0.8 * pulse);
    SUIT.side.forEach(([nx, ny], i) => {
      const on = Math.sin(time * 2.2 - i * 0.9) > 0.2 ? 1 : 0.25;
      glow(X(nx), Y(ny), S(0.008), tint(), 0.7 * on * intensity());
    });
    const g = ((time + 1) % 9) / 1.4;
    if (g < 1) { glow(X(SUIT.visor[0]), Y(SUIT.visor[1]), S(0.012), '#ffe1b0', Math.sin(g * Math.PI) * 0.8 * intensity()); spikes(X(SUIT.visor[0]), Y(SUIT.visor[1]), S(0.02) * Math.sin(g * Math.PI), '#fff3dc', 0.7, Math.PI / 4); }
  }

  function dust(time) {
    for (let i = 0; i < 40; i++) {
      const cycle = 16 + rnd(i + 500) * 12, p = ((time + rnd(i + 510) * cycle) % cycle) / cycle;
      const nx = rnd(i + 520) + p * 0.04, ny = 0.98 - rnd(i + 530) * 0.25 - p * 0.05;
      glow(X(nx), Y(ny), S(0.0015 + rnd(i + 540) * 0.0015), '#dfe9ff', Math.sin(p * Math.PI) * 0.35 * intensity());
    }
  }

  function draw() {
    if (!w) return;
    layout();
    if (!ready) { c.fillStyle = '#050a1a'; c.fillRect(0, 0, w, h); return; }
    c.drawImage(art, ox, oy, aw, ah);
    const time = t * speed();
    c.globalCompositeOperation = 'lighter';
    stars(time); galaxy(time); meteors(time); belt(time); atmosphere(time); cities(time); sunrise(time); suit(time); dust(time);
    c.globalCompositeOperation = 'source-over';
    const shade = c.createLinearGradient(0, 0, 0, h); shade.addColorStop(0, 'rgba(3,6,18,.06)'); shade.addColorStop(0.7, 'rgba(3,6,18,0)'); shade.addColorStop(1, 'rgba(3,6,18,.22)');
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
