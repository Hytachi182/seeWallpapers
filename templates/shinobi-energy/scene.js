/* Original offline anime artwork. Regenerate packages with generate-anime-templates.mjs. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  const scene = document.body.dataset.scene;
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...window.seeWallpaper?.getSettings?.() };
  let w, h, t = 0, last = 0, frame = 0, timer = 0, paused = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fps = reduced ? 15 : 30;
  const TAU = Math.PI * 2, rnd = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const tint = () => /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#8aa9ff';
  function rgba(hex, a) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a))})`; }
  function poly(points, fill, stroke) { c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; const m = c.getTransform(); c.lineWidth = 1.5 / Math.max(1, Math.hypot(m.a, m.b)); c.stroke(); } }
  function circle(x, y, r, fill) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = fill; c.fill(); }
  function line(points, color, weight = 1) { c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.strokeStyle = color; c.lineWidth = weight; c.lineCap = 'round'; c.stroke(); }
  function glow(x, y, r, color, alpha) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0)); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
  function sky(warm = false) {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, warm ? '#253b54' : '#080e22'); g.addColorStop(0.6, warm ? '#bf7967' : '#26344e'); g.addColorStop(1, warm ? '#f5b974' : '#586078'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 110; i++) circle(rnd(i) * w, rnd(i + 120) * h * 0.65, rnd(i + 2) + 0.3, rgba('#d8e5ff', warm ? 0.12 : 0.25 + Math.sin(t + i) * 0.12));
  }
  function moon(x, y, r, color) {
    glow(x, y, r * 2.8, color, 0.22 * settings.intensity); circle(x, y, r, color);
    c.save(); c.beginPath(); c.arc(x, y, r, 0, TAU); c.clip();
    for (let i = 0; i < 24; i++) circle(x + (rnd(i + 81) - 0.5) * r * 2, y + (rnd(i + 55) - 0.5) * r * 2, r * (0.04 + rnd(i + 14) * 0.16), rgba('#4e5277', 0.12)); c.restore();
  }
  function mountains(warm = false) {
    for (let layer = 0; layer < 4; layer++) {
      const points = [[0, h]];
      for (let i = 0; i <= 18; i++) points.push([i * w / 18, h * (0.51 + layer * 0.10) - rnd(i + layer * 61) * h * (0.18 - layer * 0.025)]);
      points.push([w, h]); poly(points, warm ? ['#827281', '#625d76', '#414b64', '#202c43'][layer] : ['#414459', '#2c344a', '#182438', '#0c1728'][layer]);
    }
  }
  function mist() {
    for (let i = 0; i < 6; i++) { c.save(); c.translate(w * (0.12 + i * 0.18) + Math.sin(t * 0.12 + i) * w * 0.04, h * (0.66 + i % 3 * 0.06)); c.scale(4, 0.25); glow(0, 0, h * 0.16, '#a5c2dc', 0.065 * settings.intensity); c.restore(); }
  }
  function particles(leaves = false) {
    const time = t * settings.speed;
    for (let i = 0; i < 70; i++) {
      const x = (rnd(i + 300) * (w + 80) + time * (12 + rnd(i) * 24)) % (w + 80) - 40;
      const y = (rnd(i + 500) * (h + 60) + time * (leaves ? 14 : -9) + (h + 60) * 100) % (h + 60) - 30;
      c.save(); c.translate(x, y + Math.sin(time + i) * 9); c.rotate(time * 0.5 + i); c.globalAlpha = (0.2 + rnd(i + 30) * 0.55) * Math.min(1, settings.intensity);
      if (leaves) poly([[0, -5], [5, -1], [2, 5], [-4, 2]], tint()); else { circle(0, 0, 1 + rnd(i) * 2, tint()); }
      c.restore();
    }
  }
  // Character coordinates are relative to the feet. Angular cel shading and an
  // unmarked headband keep these characters original rather than franchise copies.
  function ninja(x, y, size, orange = false, facing = 1, battle = false) {
    c.save(); c.translate(x, y + Math.sin(t * settings.speed * 1.4) * size * 0.006); c.scale(size * facing, size);
    const accent = orange ? tint() : '#263d58';
    const sway = Math.sin(t * settings.speed * 1.8) * 0.04;
    poly([[-0.07, -0.68], [0.18, -0.71], [0.44, -0.65 + sway], [0.63, -0.73 + sway], [0.52, -0.59 + sway], [0.25, -0.59], [0, -0.63]], orange ? '#292d43' : tint());
    poly([[-0.11, -0.35], [-0.17, -0.02], [-0.08, 0], [0.02, -0.32], [0.07, -0.02], [0.19, 0], [0.13, -0.36]], '#111b2c', '#314256');
    poly([[-0.15, -0.65], [0.08, -0.66], [0.18, -0.33], [-0.16, -0.32], [-0.23, -0.40]], accent, '#151f31');
    poly([[-0.14, -0.63], [-0.04, -0.61], [-0.01, -0.35], [-0.16, -0.35]], orange ? '#da6b32' : '#18293e');
    poly([[0.07, -0.62], [0.2, -0.55], [battle ? 0.39 : 0.17, battle ? -0.65 : -0.35], [battle ? 0.42 : 0.1, battle ? -0.59 : -0.33], [0.1, -0.5]], accent, '#141e30');
    poly([[-0.15, -0.61], [-0.27, -0.47], [-0.22, -0.29], [-0.15, -0.31], [-0.17, -0.45], [-0.04, -0.57]], accent);
    poly([[-0.16, -0.36], [0.14, -0.37], [0.13, -0.33], [-0.16, -0.32]], '#0e1729');
    circle(-0.01, -0.77, 0.12, '#c68e77');
    poly([[-0.13, -0.78], [-0.14, -0.86], [-0.08, -0.87], [-0.1, -0.95], [-0.03, -0.91], [0.02, -0.99], [0.06, -0.9], [0.13, -0.91], [0.1, -0.78]], orange ? '#e6ca91' : '#111a2b');
    poly([[-0.13, -0.82], [0.11, -0.82], [0.12, -0.77], [-0.13, -0.77]], '#343e55');
    poly([[-0.06, -0.815], [0.065, -0.815], [0.065, -0.78], [-0.06, -0.78]], '#a4b7c9');
    poly([[-0.12, -0.735], [0.11, -0.735], [0.075, -0.66], [-0.07, -0.66]], '#172439');
    line([[-0.07, -0.752], [-0.028, -0.745]], '#e8dcbd', 0.009); line([[0.026, -0.745], [0.072, -0.752]], '#e8dcbd', 0.009);
    // Steel blade, with a restrained rim highlight.
    line(battle ? [[0.4, -0.63], [0.69, -0.89]] : [[-0.2, -0.3], [-0.3, -0.75]], '#dce4ef', 0.014);
    line(battle ? [[0.37, -0.62], [0.44, -0.58]] : [[-0.25, -0.37], [-0.15, -0.39]], '#657289', 0.02);
    c.restore();
  }
  function roof(x, y, width, height, lit = false) {
    c.fillStyle = '#172438'; c.fillRect(x - width * 0.4, y, width * 0.8, height);
    if (lit) for (let j = 0; j < 4; j++) { c.fillStyle = rgba(tint(), 0.65 + Math.sin(t + j) * 0.1); c.fillRect(x - width * 0.27 + j * width * 0.15, y + height * 0.25, width * 0.07, height * 0.32); }
    poly([[x - width * 0.6, y + height * 0.06], [x - width * 0.36, y - height * 0.09], [x, y - height * 0.43], [x + width * 0.36, y - height * 0.09], [x + width * 0.6, y + height * 0.06]], '#23384c', '#516076');
    for (let j = -4; j <= 4; j++) line([[x + j * width * 0.06, y - height * 0.30], [x + j * width * 0.12, y]], '#354c60');
  }
  function draw() {
    const warm = scene === 'orange-ninja'; sky(warm);
    const s = Math.min(w * 0.8, h * 0.8), cx = w < h ? w * 0.5 : w * 0.68;
    if (scene === 'hidden-village') {
      moon(w * 0.72, h * 0.24, h * 0.065, '#f5d6a6'); mountains();
      // A flowing waterfall winds between the terraced houses.
      for (let i = 0; i < 14; i++) { const x = w * 0.48 + i * w * 0.003; line([[x, h * 0.50], [x + w * 0.015, h * 0.69], [x - w * 0.09, h * 0.94]], rgba('#97bdd3', 0.08 + Math.sin(t * settings.speed * 2 + i) * 0.04), w * 0.006); }
      for (let row = 0; row < 3; row++) for (let i = 0; i < 7; i++) { const size = Math.min(w / 7, h * 0.18) * (0.7 + row * 0.2); roof((i + 0.4 + row % 2 * 0.3) * w / 7, h * (0.59 + row * 0.14), size, size * 0.6, true); }
      mist(); glow(w * 0.5, h * 0.79, h * 0.35, tint(), 0.12 * settings.intensity);
      // Foreground gateway and hanging lanterns.
      c.fillStyle = '#111e2d'; c.fillRect(w * 0.13, h * 0.62, w * 0.014, h); c.fillRect(w * 0.85, h * 0.62, w * 0.014, h);
      poly([[w * 0.07, h * 0.61], [w * 0.5, h * 0.67], [w * 0.93, h * 0.61], [w * 0.90, h * 0.66], [w * 0.5, h * 0.71], [w * 0.1, h * 0.66]], '#142538');
      for (const x of [w * 0.2, w * 0.8]) { line([[x, h * 0.68], [x, h * 0.77]], '#141e2a', 2); glow(x, h * 0.79, h * 0.09, tint(), 0.35 * settings.intensity); c.fillStyle = tint(); c.fillRect(x - h * 0.013, h * 0.77, h * 0.026, h * 0.04); }
      particles();
    } else if (scene === 'shinobi-energy') {
      mountains(); const cy = h * 0.53; glow(cx, cy, s * 0.7, tint(), 0.25 * settings.intensity);
      for (let ring = 0; ring < 4; ring++) { const r = s * (0.25 + ring * 0.06); c.save(); c.translate(cx, cy); c.rotate(t * settings.speed * (ring % 2 ? -0.12 : 0.09));
        c.strokeStyle = rgba(tint(), 0.23 * settings.intensity); c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.stroke();
        for (let j = 0; j < 16; j++) { const a = j * TAU / 16; c.save(); c.rotate(a); line([[r - 4, 0], [r + 6, 0], [r + 6, 7], [r - 2, 7]], rgba(tint(), 0.65), 2); c.restore(); } c.restore(); }
      for (let k = 0; k < 3; k++) { const points = []; for (let j = 0; j <= 120; j++) { const a = j / 120 * TAU; points.push([cx + Math.cos(a + t * settings.speed * 0.2) * s * (0.34 + Math.sin(a * 3 + t + k) * 0.025), cy + Math.sin(a + k) * s * 0.19]); } line(points, rgba(tint(), 0.38 * settings.intensity), 2); }
      poly([[cx - s * 0.4, h * 0.87], [cx - s * 0.25, h * 0.78], [cx + s * 0.28, h * 0.77], [cx + s * 0.42, h * 0.9], [cx + s * 0.27, h], [cx - s * 0.35, h]], '#101c2b');
      ninja(cx, h * 0.82, s * 0.58); mist(); particles();
    } else if (scene === 'anime-moon-battle') {
      moon(w * 0.5, h * 0.31, Math.min(w * 0.3, h * 0.23), '#b8c9ec'); mountains();
      const mid = w * 0.5, cy = h * 0.61, unit = Math.min(w * 0.7, h * 0.8);
      for (let k = 0; k < 5; k++) { const points = []; for (let j = 0; j <= 70; j++) { const a = j / 70 * Math.PI; points.push([mid + Math.cos(a) * unit * (0.57 + k * 0.025), cy + Math.sin(a + t * settings.speed * 0.2 + k * 0.04) * unit * 0.16]); } line(points, rgba(tint(), (0.16 - k * 0.02) * settings.intensity), 2); }
      c.save(); c.translate(mid - unit * 0.30, cy + unit * 0.2); c.rotate(0.48); ninja(0, 0, unit * 0.46, false, 1, true); c.restore();
      c.save(); c.translate(mid + unit * 0.30, cy + unit * 0.18); c.rotate(-0.48); ninja(0, 0, unit * 0.46, false, -1, true); c.restore();
      glow(mid, cy - unit * 0.12, unit * 0.17, tint(), (0.24 + Math.sin(t * settings.speed * 3) * 0.06) * settings.intensity); particles(); mist();
    } else {
      moon(cx - s * 0.14, h * 0.27, h * 0.14, warm ? '#ffda9e' : '#eea4b2'); mountains(warm); mist();
      if (warm) poly([[cx - s * 0.32, h * 0.9], [cx - s * 0.16, h * 0.82], [cx + s * 0.2, h * 0.83], [cx + s * 0.48, h], [cx - s * 0.4, h]], '#182539');
      else { roof(cx, h * 0.88, s * 1.05, s * 0.26); roof(w * 0.12, h * 0.92, s * 0.4, s * 0.2, true); }
      ninja(cx, h * 0.82, s * 0.75, warm); glow(cx, h * 0.63, s * 0.5, tint(), 0.035 * settings.intensity); particles(true);
    }
    const shade = c.createLinearGradient(0, 0, w, 0); shade.addColorStop(0, '#050b1844'); shade.addColorStop(0.6, '#050b1800'); shade.addColorStop(1, '#050b1833'); c.fillStyle = shade; c.fillRect(0, 0, w, h);
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
