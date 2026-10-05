/* Robot Workshop: vector layers (layers/*.svg) with three articulated robots, animated with Canvas. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...window.seeWallpaper?.getSettings?.() };
  const dust = JSON.parse(document.getElementById('dust').textContent);
  let w, h, ratio = 1, t = 0, last = 0, frame = 0, timer = 0, paused = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fps = reduced ? 15 : 30;
  const TAU = Math.PI * 2, rnd = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const tint = () => /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#8ae6ff';
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const speed = () => num(settings.speed, 1), intensity = () => num(settings.intensity, 1);
  function rgba(hex, a) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a))})`; }
  function glow(x, y, r, color, alpha) {
    if (r <= 0 || alpha <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const ease = p => p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;

  // Scene layers use 1920x1080 artwork coordinates; robot parts share a
  // 360x780 box whose origin (0, 0) is the robot's local origin.
  const sceneLayers = ['hall', 'beams', 'floor'], parts = ['base', 'torso', 'arm-left', 'arm-right', 'head'];
  // Same placement as the artwork: translate(x y) scale(s).
  const robots = [
    { id: 'back', x: 800, y: 550, s: 0.39, alpha: 0.55, seed: 3 },
    { id: 'mid', x: 1040, y: 430, s: 0.63, alpha: 1, seed: 7, shadow: [1040, 909, 92, 14, 0.5] },
    { id: 'main', x: 1500, y: 105, s: 1.24, alpha: 1, seed: 11, shadow: [1500, 1050, 210, 26, 0.65] }
  ];
  const PIVOT = { 'arm-left': [-91, 167], 'arm-right': [94, 168], head: [0, 135] };
  const images = {}, bitmaps = {};
  const sources = [...sceneLayers, ...parts.map(p => `robot-${p}`)];
  let loaded = 0, ready = false;
  for (const name of sources) {
    const img = new Image();
    img.onload = () => { if (++loaded === sources.length) { ready = true; rasterize(); draw(); } };
    img.src = `layers/${name}.svg`; images[name] = img;
  }

  // Cover-fit; portrait screens center on the main robot.
  let sc = 1, ox = 0, oy = 0;
  function layout() {
    sc = Math.max(w / 1920, h / 1080);
    const focus = w < h ? 1470 : 960;
    ox = Math.min(0, Math.max(w - 1920 * sc, w / 2 - focus * sc)); oy = (h - 1080 * sc) / 2;
  }
  function bitmap(key, img, sx, sy, sw, sh, k) {
    const b = bitmaps[key] || (bitmaps[key] = document.createElement('canvas'));
    b.width = Math.max(1, Math.ceil(sw * k)); b.height = Math.max(1, Math.ceil(sh * k));
    const x = b.getContext('2d'); x.clearRect(0, 0, b.width, b.height); x.drawImage(img, sx, sy, sw, sh, 0, 0, b.width, b.height);
  }
  function rasterize() {
    if (!ready || !w) return;
    const k = sc * ratio;
    for (const name of sceneLayers) bitmap(name, images[name], 0, 0, 1920, 1080, k);
    // Each robot gets parts rasterized at its own size, so every scale stays crisp.
    for (const r of robots) {
      for (const p of parts) bitmap(`${r.id}-${p}`, images[`robot-${p}`], 0, 0, 360, 780, k * r.s);
      if (r.alpha < 1) { const b = bitmaps[`${r.id}-composite`] || (bitmaps[`${r.id}-composite`] = document.createElement('canvas')); b.width = Math.ceil(360 * k * r.s); b.height = Math.ceil(800 * k * r.s); }
    }
  }

  // Poses: per-robot behaviour, all in radians around the part pivots.
  function pose(r, time) {
    const breathe = Math.sin(time * TAU / 9 + r.seed) * 3;
    const p = { lift: breathe < 0 ? breathe : breathe * 0.4, head: 0, headX: 0, left: Math.sin(time * 0.5 + r.seed) * 0.025, right: Math.sin(time * 0.45 + r.seed + 1) * 0.025, blink: 1, work: 0 };
    if (r.id === 'main') {
      // Slowly looks toward the workshop, then back.
      const cycle = (time % 22) / 22, look = cycle < 0.15 ? ease(cycle / 0.15) : cycle < 0.55 ? 1 : cycle < 0.7 ? 1 - ease((cycle - 0.55) / 0.15) : 0;
      p.head = -0.11 * look; p.headX = -4 * look; p.left += 0.05 * look;
    } else if (r.id === 'mid') {
      // Works at an unseen bench: raises the right forearm, holds, and sparks fly.
      const cycle = (time % 7) / 7, raise = cycle < 0.25 ? ease(cycle / 0.25) : cycle < 0.7 ? 1 : cycle < 0.9 ? 1 - ease((cycle - 0.7) / 0.2) : 0;
      p.right = -0.48 * raise + Math.sin(time * 9) * 0.015 * raise; p.work = cycle > 0.3 && cycle < 0.68 ? 1 : 0; p.head = 0.07 * raise;
    } else {
      // Scans the hangar from side to side.
      p.head = Math.sin(time * 0.35) * 0.13; p.headX = Math.sin(time * 0.35) * 5;
    }
    const b = (time + r.seed * 1.7) % 6.5; if (b < 0.16) p.blink = Math.abs(b - 0.08) / 0.08;
    return p;
  }
  function drawRobot(ctx, r, p, dx = 0, dy = 0, scale = r.s) {
    const part = (name, angle = 0, shift = 0) => {
      ctx.save();
      if (angle || shift) { const [px, py] = PIVOT[name]; ctx.translate(px + shift, py); ctx.rotate(angle); ctx.translate(-px, -py); }
      ctx.drawImage(bitmaps[`${r.id}-${name}`], -180, 0, 360, 780); ctx.restore();
    };
    ctx.save(); ctx.translate(dx, dy); ctx.scale(scale, scale);
    part('base'); ctx.translate(0, p.lift); part('torso'); part('arm-left', p.left); part('arm-right', p.right); part('head', p.head, p.headX);
    ctx.restore();
  }
  // Eye and chest-light glow, plus eyelid blink, drawn over the rasterized robot.
  function eyes(r, p, time) {
    const pulse = (0.75 + Math.sin(time * TAU / 5 + r.seed) * 0.25) * intensity() * r.alpha;
    c.save(); c.translate(r.x, r.y); c.scale(r.s, r.s); c.translate(0, p.lift);
    glow(0, 196, 22, tint(), 0.55 * pulse);
    const [hx, hy] = PIVOT.head; c.translate(hx + p.headX, hy); c.rotate(p.head); c.translate(-hx, -hy);
    for (const [x, y] of [[-19, 53], [20, 50]]) {
      if (p.blink < 1) { c.fillStyle = '#08131b'; c.fillRect(x - 12, y - 12, 24, 24 * (1 - p.blink)); c.fillRect(x - 12, y + 12 - 24 * (1 - p.blink) * 0.5, 24, 24 * (1 - p.blink) * 0.5); }
      glow(x, y, 26, tint(), 0.6 * pulse * p.blink);
    }
    c.restore();
  }

  // Welding sparks from the mid robot's right hand.
  function sparks(r, p, time) {
    if (!p.work) return;
    const [px, py] = PIVOT['arm-right'], hx = 150, hy = 495;
    const ca = Math.cos(p.right), sa = Math.sin(p.right);
    const x = r.x + r.s * (px + (hx - px) * ca - (hy - py) * sa), y = r.y + r.s * (py + p.lift + (hx - px) * sa + (hy - py) * ca);
    const flash = 0.6 + rnd(Math.floor(time * 20)) * 0.4;
    glow(x, y, 90, "#9fe9ff", 0.4 * flash * intensity()); glow(x, y, 18, "#ffffff", 0.95 * flash);
    for (let i = 0; i < 40; i++) {
      const life = 0.7, age = ((time + rnd(i) * life) % life) / life, seed = Math.floor((time + rnd(i) * life) / life) * 31 + i;
      const vx = (rnd(seed) - 0.3) * 160, vy = -40 - rnd(seed + 1) * 90;
      const sx = x + vx * age * life, sy = y + vy * age * life + 260 * (age * life) ** 2;
      c.strokeStyle = `rgba(255,${190 + Math.round(rnd(seed + 2) * 60)},120,${(1 - age) * intensity()})`; c.lineWidth = 1.8;
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - vx * 0.02, sy - (vy + 520 * age * life) * 0.02); c.stroke();
    }
  }

  function windows(time) {
    // Overhead panels: a few brighten and flicker like failing tubes.
    for (let col = 0; col < 10; col++) for (let row = 0; row < 4; row++) {
      const i = col * 4 + row, wave = Math.sin(time * (0.3 + rnd(i) * 0.6) + i * 2.1);
      let a = Math.max(0, wave) * 0.08;
      if (rnd(i + 50) > 0.85 && rnd(Math.floor(time * 12) + i) > 0.7) a += 0.12;
      if (a > 0.005) { c.fillStyle = rgba('#a8d4e6', a * intensity()); c.fillRect(500 + col * 140, 30 + row * 60, 104, 45); }
    }
    // Amber guide light running along the wall rail.
    const x = ((time * 90) % 2400) - 240;
    c.save(); c.translate(x, 726); c.scale(4, 1); glow(0, 0, 40, '#e0a060', 0.35 * intensity()); c.restore();
  }
  function beams(time) {
    c.globalAlpha = Math.max(0, Math.min(1, (0.75 + Math.sin(time * 0.4) * 0.15 + Math.sin(time * 1.7) * 0.05) * intensity()));
    c.drawImage(bitmaps.beams, 0, 0, 1920, 1080); c.globalAlpha = 1;
  }
  function mist(time) {
    const drift = (Math.sin(time * Math.PI / 24) + 1) / 2 * 65;
    for (const [x, y, rx, ry] of [[720, 858, 740, 140], [1300, 1000, 740, 95]]) {
      c.save(); c.translate(x + drift, y); c.scale(rx / ry, 1); glow(0, 0, ry, '#9dbcc9', 0.14 * intensity()); c.restore();
    }
  }
  function particles(time) {
    const count = Math.round(dust.length * Math.max(0.2, num(settings.dustDensity, 1)));
    for (let i = 0; i < count; i++) {
      const [bx, by, r, a] = dust[i % dust.length], extra = i >= dust.length;
      const x = (extra ? rnd(i) * 1920 : bx) + Math.sin(time * 0.2 + i) * 18 + time * 3 % 40;
      const y = ((extra ? rnd(i + 9) * 1000 : by) - time * (4 + rnd(i + 3) * 6)) % 1080;
      const shimmer = 0.55 + 0.45 * Math.sin(time * TAU / 16 + i);
      c.fillStyle = `rgba(197,221,230,${Math.min(1, a * 1.6 * shimmer)})`;
      c.beginPath(); c.arc(x, y < 0 ? y + 1080 : y, r * 1.2, 0, TAU); c.fill();
    }
  }

  function draw() {
    if (!w) return;
    c.setTransform(ratio * sc, 0, 0, ratio * sc, ratio * ox, ratio * oy);
    if (!ready) { c.fillStyle = '#0b141b'; c.fillRect(0, 0, 1920, 1080); return; }
    const time = t * speed();
    c.drawImage(bitmaps.hall, 0, 0, 1920, 1080); windows(time); beams(time);
    c.drawImage(bitmaps.floor, 0, 0, 1920, 1080);
    for (const r of robots) {
      const p = pose(r, time);
      if (r.shadow) { const [x, y, rx, ry, a] = r.shadow; c.save(); c.translate(x, y); c.scale(1, ry / rx); c.beginPath(); c.arc(0, 0, rx * (1 - p.lift * 0.004), 0, TAU); c.fillStyle = `rgba(0,0,0,${a})`; c.fill(); c.restore(); }
      if (r.alpha < 1) {
        // Composite the translucent robot first so overlapping parts do not show through.
        const b = bitmaps[`${r.id}-composite`], x = b.getContext('2d'), k = sc * ratio * r.s;
        x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, b.width, b.height); x.setTransform(k, 0, 0, k, 180 * k, 10 * k);
        drawRobot(x, r, p, 0, 0, 1);
        c.globalAlpha = r.alpha; c.drawImage(b, r.x - 180 * r.s, r.y - 10 * r.s, 360 * r.s, 800 * r.s); c.globalAlpha = 1;
      } else drawRobot(c, r, p, r.x, r.y);
      eyes(r, p, time);
      if (r.id === 'mid') sparks(r, p, time);
    }
    mist(time); particles(time);
  }

  function resize() {
    w = innerWidth; h = innerHeight; ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2073600 / (w * h)));
    canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); layout(); rasterize();
  }
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
