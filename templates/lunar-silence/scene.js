/* Lunar Silence: vector layers (layers/*.svg) rasterized once per resize and animated with Canvas. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...window.seeWallpaper?.getSettings?.() };
  const stars = JSON.parse(document.getElementById('stars').textContent);
  let w, h, ratio = 1, t = 0, last = 0, frame = 0, timer = 0, paused = false;
  const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');let reduced=motionQuery.matches;
  let fps = reduced ? 15 : 30;
  const TAU = Math.PI * 2, rnd = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const tint = () => /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#64d2ee';
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const speed = () => num(settings.speed, 1), intensity = () => num(settings.intensity, 1);
  function rgba(hex, a) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a))})`; }
  function glow(x, y, r, color, alpha) {
    if (r <= 0 || alpha <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Each layer keeps the artwork's 1920x1080 coordinates; [x, y, width, height]
  // is the region rasterized into its own bitmap.
  const regions = { earth: [1150, 40, 480, 490], 'earth-surface': [1250, 140, 280, 290], 'earth-shade': [1260, 150, 260, 270], ground: [0, 630, 1920, 450], astronaut: [1160, 735, 110, 170] };
  const images = {}, bitmaps = {};
  let loaded = 0, ready = false;
  for (const name of Object.keys(regions)) {
    const img = new Image();
    img.onload = () => { if (++loaded === Object.keys(regions).length) { ready = true; rasterize(); draw(); } };
    img.src = `layers/${name}.svg`; images[name] = img;
  }

  // Cover-fit the 1920x1080 artwork. Portrait screens stay centered on the Earth and astronaut.
  let sc = 1, ox = 0, oy = 0;
  function layout() {
    sc = Math.max(w / 1920, h / 1080);
    const focus = w < h ? 1340 : 960;
    ox = Math.min(0, Math.max(w - 1920 * sc, w / 2 - focus * sc)); oy = (h - 1080 * sc) / 2;
  }
  function rasterize() {
    if (!ready || !w) return;
    const k = sc * ratio;
    for (const [name, [x, y, rw, rh]] of Object.entries(regions)) {
      const bitmap = bitmaps[name] || (bitmaps[name] = document.createElement('canvas'));
      bitmap.width = Math.ceil(rw * k); bitmap.height = Math.ceil(rh * k);
      const b = bitmap.getContext('2d'); b.clearRect(0, 0, bitmap.width, bitmap.height);
      b.drawImage(images[name], x, y, rw, rh, 0, 0, bitmap.width, bitmap.height);
    }
  }
  const layer = (name, dx = 0, dy = 0) => { const [x, y, rw, rh] = regions[name]; c.drawImage(bitmaps[name], x + dx, y + dy, rw, rh); };

  function sky() {
    const g = c.createLinearGradient(0, 0, 1536, 1080); g.addColorStop(0, '#02050c'); g.addColorStop(1, '#101c30');
    c.fillStyle = g; c.fillRect(-ox / sc, -oy / sc, w / sc, h / sc);
  }

  function starField() {
    const time = (reduced?0:t * speed()), count = Math.round(stars.length * Math.min(1, Math.max(0.1, num(settings.starDensity, 1))));
    const drift = time * 0.6;
    for (let i = 0; i < count; i++) {
      const [sx, y, r, a] = stars[i];
      const x = ((sx + drift * (0.5 + r * 0.3)) % 1920 + 1920) % 1920;
      const twinkle = 0.55 + 0.45 * Math.sin(time * (0.4 + rnd(i) * 1.8) + i * 2.3);
      c.fillStyle = `rgba(218,234,251,${a * twinkle})`;
      c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
      if (r > 1.5) glow(x, y, r * 5, '#daeafb', a * twinkle * 0.25 * intensity());
    }
    // Extra stars fill the field when density is raised above the original artwork.
    const extra = Math.round(stars.length * Math.max(0, num(settings.starDensity, 1) - 1));
    for (let i = 0; i < extra; i++) {
      const x = ((rnd(i + 3000) * 1920 + drift * 0.6) % 1920 + 1920) % 1920, y = rnd(i + 3100) * 720;
      c.fillStyle = `rgba(218,234,251,${(0.2 + rnd(i + 3200) * 0.5) * (0.55 + 0.45 * Math.sin(time * (0.5 + rnd(i) * 1.5) + i))})`;
      c.fillRect(x, y, 1.1, 1.1);
    }
  }

  function meteors() {
    const time = (reduced?0:t * speed());
    for (let i = 0; i < 2; i++) {
      const cycle = 11 + i * 6, p = ((time + i * 5) % cycle) / 1.2;
      if (p > 1) continue;
      const seed = Math.floor((time + i * 5) / cycle) * 5 + i;
      const sx = 150 + rnd(seed) * 1100, sy = 40 + rnd(seed + 1) * 260;
      const hx = sx + p * 380, hy = sy + p * 150, a = Math.sin(p * Math.PI) * intensity();
      const g = c.createLinearGradient(hx - 130, hy - 51, hx, hy); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(235,245,255,${Math.min(1, a * 0.9)})`);
      c.beginPath(); c.moveTo(hx - 130, hy - 51); c.lineTo(hx, hy); c.strokeStyle = g; c.lineWidth = 1.6; c.lineCap = 'round'; c.stroke();
    }
  }

  // A satellite crossing the sky with a blinking beacon.
  function satellite() {
    const time = (reduced?0:t * speed()), cycle = 60, p = (time % cycle) / cycle;
    const x = -40 + p * 2000, y = 330 - p * 220;
    c.fillStyle = 'rgba(220,230,240,.8)'; c.fillRect(x - 1.2, y - 1.2, 2.4, 2.4);
    if (Math.sin(time * 4) > 0.7) glow(x, y, 7, '#ff8a7a', 0.8);
  }

  function earth() {
    const time = (reduced?0:t * speed()), pulse = 0.8 + Math.sin(time * 0.5) * 0.2;
    glow(1390, 282, 235, tint(), 0.22 * pulse * intensity());
    glow(1390, 282, 150, tint(), 0.1 * pulse * intensity());
    layer('earth');
    // Rotation: the surface scrolls eastward under the clipped globe and wraps.
    const period = 240, dx = (time * 10) % period;
    c.save(); c.beginPath(); c.arc(1390, 282, 119, 0, TAU); c.clip();
    layer('earth-surface', dx); layer('earth-surface', dx - period);
    layer('earth-shade');
    c.restore();
  }

  function rover() {
    const line=(ax,ay,bx,by,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(ax,ay);c.lineTo(bx,by);c.stroke();};
    const circle=(x,y,r,color)=>{c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();};
    if(settings.rover===false||settings.rover==='false')return;
    const time=t*speed(),left=-ox/sc,view=w/sc,phase=time*.09;
    const x=left+view*(.5+.36*Math.sin(phase)),y=1016+Math.sin(phase*4)*4;
    c.save();c.translate(x,y);c.rotate(Math.cos(phase*4)*.025);
    c.fillStyle='rgba(8,15,25,.25)';c.beginPath();c.ellipse(0,21,91,12,0,0,TAU);c.fill();
    c.strokeStyle='#9caab8';c.lineWidth=7;c.beginPath();c.moveTo(-54,6);c.lineTo(-30,-12);c.lineTo(37,-12);c.lineTo(63,6);c.stroke();
    for(const wx of[-56,0,56]){
      c.save();c.translate(wx,10);c.fillStyle='#253344';c.beginPath();c.arc(0,0,18,0,TAU);c.fill();
      c.strokeStyle='#b9c9d8';c.lineWidth=3;c.beginPath();c.arc(0,0,13,0,TAU);c.stroke();
      c.rotate(Math.sin(phase)*view*.36/18);c.lineWidth=2;
      for(let i=0;i<4;i++){c.rotate(TAU/4);line(-10,0,10,0,'#73879c',2);}c.restore();
    }
    c.fillStyle='#c3ced6';c.beginPath();c.roundRect(-59,-44,118,41,7);c.fill();
    c.fillStyle='#496982';c.fillRect(-45,-34,42,20);c.fillStyle='#2b4963';c.fillRect(5,-34,39,20);
    line(-20,-43,-20,-80,'#b9c9d8',4);circle(-20,-82,7,rgba(tint(),.9));
    glow(-20,-82,16,tint(),(.3+.4*Math.max(0,Math.sin(time*2)))*intensity());c.restore();
  }

  function astronaut() {
    const time = (reduced?0:t * speed());
    // Breathing: a tiny vertical stretch anchored at the boots.
    const breath = 1 + Math.sin(time * 1.1) * 0.006;
    c.save(); c.translate(1212, 893); c.scale(1, breath); c.translate(-1212, -893);
    layer('astronaut');
    // Visor glint sweeping across the gold visor every few seconds.
    const p = ((time + 2) % 7) / 1.6;
    if (p < 1) {
      c.save(); c.beginPath(); c.roundRect(1197, 757, 39, 31, 14); c.clip();
      const x = 1185 + p * 70, g = c.createLinearGradient(x - 10, 0, x + 10, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,248,225,${0.75 * intensity()})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.translate(x, 772); c.rotate(0.45); c.fillRect(-10, -30, 20, 60); c.restore();
    }
    // Suit status light.
    const blink = Math.sin(time * 2.4) > 0 ? 1 : 0.25;
    glow(1211, 809, 9, tint(), 0.9 * blink * intensity());
    c.restore();
  }

  // Fine regolith dust drifting slowly in the low gravity.
  function dust() {
    const time = (reduced?0:t * speed());
    for (let i = 0; i < 45; i++) {
      const cycle = 18 + rnd(i + 500) * 14, p = ((time + rnd(i + 510) * cycle) % cycle) / cycle;
      const x = rnd(i + 520) * 1920 + Math.sin(time * 0.3 + i) * 12 + p * 40;
      const y = 1060 - rnd(i + 530) * 330 - p * 70;
      c.fillStyle = `rgba(200,212,224,${Math.sin(p * Math.PI) * (0.15 + rnd(i + 540) * 0.35) * intensity()})`;
      c.fillRect(x, y, 1.6, 1.6);
    }
  }

  function draw() {
    if (!w) return;
    c.setTransform(ratio * sc, 0, 0, ratio * sc, ratio * ox, ratio * oy);
    sky(); starField(); satellite(); meteors();
    if (ready) { earth(); layer('ground'); astronaut(); }
    rover();dust();
  }

  function resize() {
    w = innerWidth; h = innerHeight; ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2073600 / (w * h)));
    canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio); layout(); rasterize();
  }
  function stop() { clearTimeout(timer); cancelAnimationFrame(frame); last = 0; }
  function animate(now) { if (paused || document.hidden || reduced || speed()===0) { stop(); return; } if (last) t += Math.min(0.1, (now - last) / 1000); last = now; const start = performance.now(); draw(); timer = setTimeout(() => frame = requestAnimationFrame(animate), Math.max(0, 1000 / fps - (performance.now() - start) - 4)); }
  function start() { stop(); if (!paused && !document.hidden && !reduced && speed()>0) frame = requestAnimationFrame(animate); }
  addEventListener('resize', () => { resize(); draw(); }); document.addEventListener('visibilitychange', start);
  window.seeWallpaper?.onSettingsChanged(value => { settings = { ...settings, ...value }; draw(); start(); });
  window.seeWallpaper?.onPause(() => { paused = true; stop(); }); window.seeWallpaper?.onResume(() => { paused = false; start(); });
  window.seeWallpaper?.onPerformanceChanged(value => { fps = Math.max(1, Math.min(reduced ? 15 : 60, Number(value) || 30)); start(); });
  motionQuery.addEventListener?.('change',()=>{reduced=motionQuery.matches;draw();start();});
  resize(); const preview = new URLSearchParams(location.search).get('preview');
  if (preview !== null) { paused = true; t = Number(preview) || 12; draw(); } else start();
})();
