/* Pirate Cove: the bundled illustration (artwork.jpg) animated with isolated fabric textures and restrained harbour light. */
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
  art.onload = () => { ready = true; buildFabric(); draw(); };
  art.src = 'artwork.jpg';

  // Normalized artwork coordinates (0..1), measured on the painting.
  const SUN = [0.16, 0.377];
  // Only red fabric is sampled; the head, neck and fixed silhouette stay untouched.
  const LANTERN = [0.974, 0.186];
  const TOWN = [[0.6, 0.635], [0.62, 0.62], [0.57, 0.635], [0.66, 0.475], [0.64, 0.5], [0.6, 0.51], [0.55, 0.585], [0.67, 0.64], [0.54, 0.6], [0.63, 0.66], [0.585, 0.62], [0.65, 0.63]];
  const FALLS = [[0.088, 0.71, 0.82, 0.012], [0.658, 0.5, 0.585, 0.009], [0.52, 0.505, 0.55, 0.007]];

  // Stable cover-fit: the portrait crop keeps the pirate in view without camera sway.
  let ox = 0, oy = 0, aw = 1, ah = 1, iw = 1672, ih = 941;
  function layout() {
    iw = art.naturalWidth || 1672; ih = art.naturalHeight || 941;
    const zoom = 1.015;
    const scale = Math.max(w / iw, h / ih) * zoom;
    aw = iw * scale; ah = ih * scale;
    const focus = w < h ? 0.9 : 0.5;
    ox = (w - aw) * focus;
    oy = (h - ah) * 0.5;
    ox = Math.min(0, Math.max(w - aw, ox)); oy = Math.min(0, Math.max(h - ah, oy));
  }
  const X = nx => ox + nx * aw, Y = ny => oy + ny * ah, S = n => n * aw;

  function glow(x, y, r, color, alpha) {
    if (r <= 0 || alpha <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Texture motion stays INSIDE the original cloth. Moving rectangular crops
  // would duplicate painted edges and drag neighbouring hair, sky and rigging.
  const fabrics = [];
  function buildFabric() {
    iw = art.naturalWidth; ih = art.naturalHeight;
    for (const region of window.pirateFabricMasks) {
      const { sx, sy, sw, sh, runs } = region;
      const layer = document.createElement('canvas'); layer.width = sw; layer.height = sh;
      const mask = document.createElement('canvas'); mask.width = sw; mask.height = sh;
      const ctx = layer.getContext('2d'), m = mask.getContext('2d');
      // Artwork-derived alpha runs are bundled: file:// Canvas cannot read pixels.
      for (let i = 0; i < runs.length; i += 4) {
        m.fillStyle = `rgba(255,255,255,${runs[i + 3] / 255})`;
        m.fillRect(runs[i], runs[i + 1], runs[i + 2], 1);
      }
      fabrics.push({ region, layer, mask, ctx });
    }
  }
  function cloth(time) {
    const breeze = Math.min(2, wind());
    if (reduced || breeze === 0) return;
    fabrics.forEach(({ region, layer, mask, ctx }, index) => {
      const { sx, sy, sw, sh, amplitude, anchor } = region;
      ctx.clearRect(0, 0, sw, sh);
      ctx.globalCompositeOperation = 'source-over';
      // Narrow, blended slices carry a fold through the texture only.
      for (let y = 0; y < sh; y += 2) {
        const height = Math.min(2, sh - y), wave = Math.sin(time * 1.6 - y / sh * 5.5 + index * 1.9);
        const pinned = anchor === 'top' ? (y / sh) ** 2 : 1;
        const dx = wave * amplitude * breeze * pinned;
        ctx.drawImage(art, sx + dx, sy + y, sw, height, 0, y, sw, height);
        ctx.fillStyle = wave > 0 ? `rgba(255,213,174,${wave * 0.035 * breeze})` : `rgba(24,8,18,${-wave * 0.045 * breeze})`;
        ctx.fillRect(0, y, sw, height);
      }
      ctx.globalCompositeOperation = 'destination-in'; ctx.drawImage(mask, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      c.drawImage(layer, X(sx / iw), Y(sy / ih), sw / iw * aw, sh / ih * ah);
    });
  }

  function sun(time) {
    const x = X(SUN[0]), y = Y(SUN[1]), f = (0.85 + Math.sin(time * 0.5) * 0.12) * intensity();
    glow(x, y, S(0.07), '#fff2c6', 0.18 * f); glow(x, y, S(0.25), '#ff9a4a', 0.065 * f);
    for (let i = 0; i < 7; i++) {
      const a = i / 7 * TAU + time * 0.015, len = S(0.14 + rnd(i) * 0.18) * (0.8 + Math.sin(time * 0.6 + i * 1.7) * 0.2);
      c.save(); c.translate(x, y); c.rotate(a);
      const g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, rgba('#ffe0aa', 0.035 * f)); g.addColorStop(1, rgba('#ffe0aa', 0));
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -S(0.003)); c.lineTo(len, -S(0.01)); c.lineTo(len, S(0.01)); c.lineTo(0, S(0.003)); c.fill(); c.restore();
    }
  }
  // Glitter on the water: the sun's path, open-sea sparkles and the ship's wake.
  function sea(time) {
    c.save(); c.beginPath();
    const channels = [
      [[0.105,0.46],[0.27,0.46],[0.26,0.565],[0.21,0.60],[0.19,0.69],[0.155,0.74],[0.12,0.66]],
      [[0.35,0.745],[0.40,0.70],[0.47,0.73],[0.45,0.81],[0.38,0.88],[0.34,0.94],[0.29,0.95],[0.30,0.84]],
      [[0.48,0.685],[0.57,0.69],[0.61,0.72],[0.65,0.78],[0.56,0.86],[0.48,0.90],[0.48,0.82],[0.51,0.78]]
    ];
    for (const points of channels) {
      points.forEach(([x,y], i) => i ? c.lineTo(X(x),Y(y)) : c.moveTo(X(x),Y(y))); c.closePath();
    }
    c.clip();
    c.save();c.globalCompositeOperation='source-over';
    for(const points of channels)window.seeLivingMotion.water(c,{aw,ah,ox,oy},art,time,points,{strength:1.7,light:'#bcecff'});
    c.restore();
    for (let i = 0; i < 22; i++) {
      const ny = 0.45 + i * 0.01, wobble = Math.sin(time * 2 + i * 1.3) * 0.006, width = S(0.02 + Math.sin(time * 1.5 + i) * 0.006 + i * 0.002);
      c.fillStyle = rgba('#ffd59a', (0.2 - i * 0.007) * intensity()); c.fillRect(X(0.19 + wobble) - width / 2, Y(ny), width, Math.max(1, S(0.0015)));
    }
    for (let i = 0; i < 60; i++) {
      const nx = 0.12 + rnd(i + 900) * 0.5, ny = 0.47 + rnd(i + 950) * 0.4;
      const a = Math.max(0, Math.sin(time * (1 + rnd(i) * 1.8) + i * 2.3)) ** 4, len = S(0.003 + rnd(i + 3) * 0.006);
      c.fillStyle = rgba(ny < 0.62 ? '#ffd9a0' : '#bff7ff', a * 0.20 * intensity()); c.fillRect(X(nx) - len / 2, Y(ny), len, Math.max(1, S(0.001)));
    }
    for (let i = 0; i < 18; i++) {
      const p = ((time * 0.08 + rnd(i + 30)) % 1), nx = 0.33 + p * 0.09 + (rnd(i + 31) - 0.5) * 0.02 * p, ny = 0.705 + p * 0.06;
      glow(X(nx), Y(ny), S(0.003 + p * 0.004), '#f2fbff', (1 - p) * 0.16 * intensity());
    }
    c.restore();
  }
  function lights(time) {
    const f = 0.87 + Math.sin(time * 2.1) * 0.045 + Math.sin(time * 4.7) * 0.025;
    glow(X(LANTERN[0]), Y(LANTERN[1]), S(0.05), tint(), 0.45 * f * intensity());
    glow(X(LANTERN[0]), Y(LANTERN[1]), S(0.012), '#fff1c8', 0.6 * f * intensity());
    TOWN.forEach(([nx, ny], i) => glow(X(nx), Y(ny), S(0.008 + rnd(i) * 0.006), tint(), (0.22 + 0.045 * Math.sin(time * (0.6 + rnd(i + 3)) + i * 2)) * intensity()));
  }
  function waterfalls(time) {
    FALLS.forEach(([x, top, bottom, width], f) => {
      const len = Y(bottom) - Y(top), half = S(width) / 2;
      c.save(); c.beginPath(); c.rect(X(x) - half, Y(top), half * 2, len); c.clip();
      for (let i = 0; i < 7; i++) {
        const sx = X(x) - half + rnd(i + f * 17) * half * 2, phase = (time * (0.6 + rnd(i + 40) * 0.4) + rnd(i + f * 9)) % 1, sy = Y(top) + (phase * 1.4 - 0.3) * len;
        const g = c.createLinearGradient(0, sy, 0, sy + len * 0.3); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.6, `rgba(235,250,255,${0.12 * intensity()})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(sx, sy, Math.max(1, half * 0.4), len * 0.3);
      }
      c.restore();
      glow(X(x), Y(bottom), S(width * 2), '#ffffff', (0.15 + Math.sin(time * 3 + f) * 0.05) * intensity());
    });
  }
  // Seagulls gliding and flapping across the sky.
  function gulls(time) {
    for (let i = 0; i < 3; i++) {
      const cycle = 24 + rnd(i + 60) * 16, p = ((time + rnd(i + 70) * cycle) % cycle) / cycle, dir = i % 2 ? 1 : -1;
      const nx = dir > 0 ? -0.05 + p * 0.82 : 0.77 - p * 0.82, ny = 0.06 + rnd(i + 80) * 0.2 + Math.sin(p * TAU * 2 + i) * 0.015;
      const span = S(0.0045 + rnd(i + 90) * 0.0020), flap = Math.sin(time * 5 + i * 2) * span * 0.5;
      c.beginPath(); c.moveTo(X(nx) - span, Y(ny) - flap); c.quadraticCurveTo(X(nx) - span * 0.4, Y(ny) - span * 0.35, X(nx), Y(ny));
      c.quadraticCurveTo(X(nx) + span * 0.4, Y(ny) - span * 0.35, X(nx) + span, Y(ny) - flap);
      c.strokeStyle = 'rgba(34,45,57,.48)'; c.lineWidth = Math.max(0.65, span * 0.16); c.lineCap = 'round'; c.stroke();
    }
  }
  function draw() {
    if (!w) return;
    layout();
    if (!ready) { c.fillStyle = '#1b1426'; c.fillRect(0, 0, w, h); return; }
    const time = reduced ? 12 : t * speed();
    c.drawImage(art, ox, oy, aw, ah);
    cloth(time);
    c.globalCompositeOperation = 'lighter';
    sun(time); sea(time); waterfalls(time); lights(time);
    c.globalCompositeOperation = 'source-over';
    gulls(time);
    const v = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    v.addColorStop(0, 'rgba(12,6,20,0)'); v.addColorStop(1, 'rgba(12,6,20,.3)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
  }

  function resize() { w = innerWidth; h = innerHeight; ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2073600 / (w * h))); canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); c.setTransform(ratio, 0, 0, ratio, 0, 0); c.imageSmoothingQuality = 'high'; }
  function stop() { clearTimeout(timer); cancelAnimationFrame(frame); last = 0; }
  function animate(now) { if (paused || document.hidden) { stop(); return; } if (last) t += Math.min(0.1, (now - last) / 1000); last = now; const start = performance.now(); draw(); timer = setTimeout(() => frame = requestAnimationFrame(animate), Math.max(0, 1000 / fps - (performance.now() - start) - 4)); }
  function start() { stop(); if (!paused && !document.hidden && !reduced) frame = requestAnimationFrame(animate); }
  addEventListener('resize', () => { resize(); draw(); }); document.addEventListener('visibilitychange', start);
  window.seeWallpaper?.onSettingsChanged(value => { settings = { ...settings, ...value }; draw(); });
  window.seeWallpaper?.onPause(() => { paused = true; stop(); }); window.seeWallpaper?.onResume(() => { paused = false; start(); });
  window.seeWallpaper?.onPerformanceChanged(value => { fps = Math.max(1, Math.min(reduced ? 15 : 60, Number(value) || 30)); start(); });
  resize(); const preview = new URLSearchParams(location.search).get('preview');
  if (preview !== null) { paused = true; t = Number(preview) || 12; draw(); } else start();
})();
