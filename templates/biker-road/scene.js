/* Source artwork remains fixed: movement is confined to the sky, sea and road.
   Canvas drawing works from file:// without pixel reads or network requests. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas');
  const c = canvas.getContext('2d', { alpha: false });
  const art = new Image();
  const sdk = window.seeWallpaper;
  let settings = { speed: 1, intensity: 1, road: true, clouds: true, water: true, tailLight: true,
    ...sdk?.getSettings?.() };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const preview = Number(new URLSearchParams(location.search).get('preview'));
  const fixedPreview = new URLSearchParams(location.search).has('preview') && Number.isFinite(preview);
  let time = fixedPreview ? Math.max(0, preview) : 0;
  let paused = fixedPreview, ready = false, fps = 30, raf = 0, timer = 0, last = 0;
  let w = 0, h = 0, aw = 0, ah = 0, ox = 0, oy = 0;
  const sky = document.createElement('canvas');
  const sc = sky.getContext('2d');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const value = (key, fallback, a, b) => Number.isFinite(Number(settings[key]))
    ? clamp(Number(settings[key]), a, b) : fallback;
  const random = n => { const k = Math.sin(n * 127.1 + 311.7) * 43758.5453; return k - Math.floor(k); };
  const X = x => ox + x * aw, Y = y => oy + y * ah;

  function resize() {
    // Bound backing pixels on 4K displays; the original is 1672 x 941.
    const ratio = Math.min(devicePixelRatio || 1, 1920 / Math.max(1, innerWidth), 1080 / Math.max(1, innerHeight));
    w = canvas.width = Math.max(1, Math.round(innerWidth * ratio));
    h = canvas.height = Math.max(1, Math.round(innerHeight * ratio));
    if (!ready) return;
    const scale = Math.max(w / art.width, h / art.height);
    aw = art.width * scale; ah = art.height * scale;
    ox = (w - aw) * (w < h ? 0.82 : 0.5); oy = (h - ah) * 0.5;
    sky.width = art.width; sky.height = Math.ceil(art.height * 0.34);
    sc.drawImage(art, 0, 0);
    sc.globalCompositeOperation = 'destination-in';
    const fade = sc.createLinearGradient(0, 0, 0, sky.height);
    fade.addColorStop(0, '#fff'); fade.addColorStop(0.72, '#fff'); fade.addColorStop(1, '#fff0');
    sc.fillStyle = fade; sc.fillRect(0, 0, sky.width, sky.height);
    // End the sky effect before the foreground rider, including the hair.
    const sideFade = sc.createLinearGradient(0, 0, sky.width, 0);
    sideFade.addColorStop(0, '#fff'); sideFade.addColorStop(0.65, '#fff');
    sideFade.addColorStop(0.74, '#fff0'); sideFade.addColorStop(1, '#fff0');
    sc.fillStyle = sideFade; sc.fillRect(0, 0, sky.width, sky.height);
    sc.globalCompositeOperation = 'source-over';
    draw();
  }

  function glow(x, y, radius, color, alpha) {
    const g = c.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), aw * radius);
    g.addColorStop(0, `rgba(${color},${alpha})`); g.addColorStop(1, `rgba(${color},0)`);
    c.fillStyle = g; c.fillRect(X(x - radius), Y(y) - aw * radius, aw * radius * 2, aw * radius * 2);
  }

  function clouds(amount) {
    // Tiny horizontal texture motion, feathered before the mountain skyline.
    const step = 3;
    c.globalAlpha = 0.6;
    for (let y = 0; y < sky.height; y += step) {
      const height = Math.min(step, sky.height - y);
      const dx = (Math.sin(time * 0.12 + y * 0.009) + Math.sin(time * 0.07)) * 2.5 * amount;
      c.drawImage(sky, 0, y, sky.width, height, ox + dx * aw / art.width, oy + y * ah / art.height, aw, height * ah / art.height);
    }
    c.globalAlpha = 1;
  }

  function sea(amount) {
    // Water channels trace the supplied coastline; towns and islands stay still.
    c.save(); c.beginPath();
    const channels = [
      [[0.24,0.441],[0.31,0.44],[0.342,0.463],[0.265,0.47]],
      [[0.254,0.525],[0.303,0.522],[0.334,0.57],[0.282,0.602],[0.267,0.604]],
      [[0.027,0.529],[0.088,0.518],[0.128,0.536],[0.103,0.563],[0.08,0.608],[0.012,0.632]],
      [[0.338,0.49],[0.395,0.492],[0.408,0.506],[0.367,0.522]]
    ];
    for (const points of channels) {
      c.moveTo(X(points[0][0]), Y(points[0][1]));
      for (const [x,y] of points.slice(1)) c.lineTo(X(x), Y(y));
      c.closePath();
    }
    c.clip(); c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 110; i++) {
      const y = 0.435 + random(i + 20) * 0.2;
      const x = random(i + 50) * 0.43;
      const solar = Math.exp(-Math.pow((x - 0.278) / 0.045, 2));
      const pulse = 0.5 + 0.5 * Math.sin(time * (1.3 + random(i)) + i * 2.3);
      c.strokeStyle = `rgba(255,192,92,${(0.025 + solar * 0.19) * pulse * amount})`;
      c.lineWidth = Math.max(0.5, ah * 0.0007);
      const drift = Math.sin(time * 0.65 + i) * 0.0016;
      c.beginPath(); c.moveTo(X(x + drift), Y(y));
      c.lineTo(X(x + drift + 0.002 + random(i + 60) * 0.013), Y(y)); c.stroke();
    }
    c.restore();
  }

  function road(amount) {
    c.save(); c.beginPath();
    // Inside the left lane, away from the rider, guardrail and yellow markings.
    [[0.665,0.591],[0.691,0.595],[0.712,0.653],[0.622,0.775],[0.473,1],[0.19,1],[0.43,0.839],[0.612,0.675]]
      .forEach(([x,y], i) => i ? c.lineTo(X(x),Y(y)) : c.moveTo(X(x),Y(y)));
    c.closePath(); c.clip();
    for (let i = 0; i < 55; i++) {
      const p = (random(i) + time * (0.19 + random(i + 100) * 0.07)) % 1;
      const depth = p * p, end = 0.15 + random(i + 200) * 0.4;
      const x = 0.676 + (end - 0.676) * depth, y = 0.587 + depth * 0.48;
      const tail = Math.max(0, p - 0.025 - p * 0.035), d = tail * tail;
      c.strokeStyle = `rgba(255,195,131,${0.09 * Math.sin(p * Math.PI) * amount})`;
      c.lineWidth = Math.max(0.4, aw * (0.0002 + depth * 0.0008));
      c.beginPath(); c.moveTo(X(x),Y(y));
      c.lineTo(X(0.676 + (end - 0.676) * d),Y(0.587 + d * 0.48)); c.stroke();
    }
    c.restore();
  }

  function draw() {
    if (!ready) return;
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.drawImage(art, ox, oy, aw, ah);
    if (motion.matches) return;
    const amount = value('intensity',1,0,2);
    if (!amount) return;
    if (settings.clouds) clouds(amount);
    if (settings.water) sea(amount);
    if (settings.road) road(amount);
    c.globalCompositeOperation = 'screen';
    if (settings.tailLight) glow(0.888,0.616,0.018,'255,34,8',(0.13 + Math.sin(time * 2.4) * 0.035) * amount);
    glow(0.277,0.359,0.055,'255,155,53',(0.045 + Math.sin(time * 0.4) * 0.01) * amount);
    c.globalCompositeOperation = 'source-over';
  }

  function stop() { cancelAnimationFrame(raf); clearTimeout(timer); raf = timer = 0; last = 0; }
  function canRun() { return ready && !paused && !document.hidden && !motion.matches; }
  function tick(now) {
    raf = 0;
    if (!canRun()) return;
    if (last) time += Math.min((now - last) / 1000, 0.1) * value('speed',1,0.1,2);
    last = now; draw();
    timer = setTimeout(() => { timer = 0; if (canRun()) raf = requestAnimationFrame(tick); }, 1000 / fps);
  }
  function start() { if (canRun() && !raf && !timer) raf = requestAnimationFrame(tick); }
  sdk?.onSettingsChanged?.(next => { settings = { ...settings, ...next }; draw(); });
  sdk?.onPause?.(() => { paused = true; stop(); });
  sdk?.onResume?.(() => { paused = false; start(); });
  sdk?.onPerformanceChanged?.(target => {
    fps = Number.isFinite(Number(target)) ? clamp(Number(target), 10, 60) : 30;
    stop(); start();
  });
  document.addEventListener('visibilitychange', () => { stop(); start(); });
  motion.addEventListener('change', () => { stop(); draw(); start(); });
  window.addEventListener('resize', resize);
  window.addEventListener('pagehide', stop);
  art.onload = () => { ready = true; resize(); start(); };
  art.src = 'artwork.jpg';
  resize();
})();
