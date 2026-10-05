/* Solar System: vector layers (layers/*.svg) rasterized once per resize and animated with Canvas. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...window.seeWallpaper?.getSettings?.() };
  const data = JSON.parse(document.getElementById('scene-data').textContent);
  let w, h, ratio = 1, t = 0, last = 0, frame = 0, timer = 0, paused = false;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fps = reduced ? 15 : 30;
  const TAU = Math.PI * 2, rnd = n => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
  const tint = () => /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : '#8fb8ff';
  const num = (v, d) => Number.isFinite(Number(v)) ? Number(v) : d;
  const speed = () => num(settings.speed, 1), intensity = () => num(settings.intensity, 1);
  function rgba(hex, a) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${Math.max(0, Math.min(1, a))})`; }
  function glow(x, y, r, color, alpha) {
    if (r <= 0 || alpha <= 0) return;
    const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, alpha)); g.addColorStop(1, rgba(color, 0));
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Orbits share one tilted ellipse family, as in the source artwork.
  const ORBIT = { x: -120, y: 630, tilt: -19 * Math.PI / 180, flat: 0.48, radii: [350, 465, 590, 725, 945, 1175, 1440, 1660] };
  const cosT = Math.cos(ORBIT.tilt), sinT = Math.sin(ORBIT.tilt);
  const onOrbit = (rx, a) => { const x = Math.cos(a) * rx, y = Math.sin(a) * rx * ORBIT.flat; return [ORBIT.x + x * cosT - y * sinT, ORBIT.y + x * sinT + y * cosT]; };
  const toOrbit = (px, py) => { const dx = px - ORBIT.x, dy = py - ORBIT.y, x = dx * cosT + dy * sinT, y = (-dx * sinT + dy * cosT) / ORBIT.flat; return [Math.hypot(x, y), Math.atan2(y, x)]; };
  // Visible angular range of each orbit, so travelling lights stay on screen.
  const arcs = ORBIT.radii.map(rx => {
    let lo = Infinity, hi = -Infinity;
    for (let a = -Math.PI; a < Math.PI; a += 0.005) { const [x, y] = onOrbit(rx, a); if (x > -20 && x < 1940 && y > -20 && y < 1100) { lo = Math.min(lo, a); hi = Math.max(hi, a); } }
    return [lo, hi];
  });
  const belt = data.belt.map(([x, y, r, a]) => { const [k, angle] = toOrbit(x, y); return { k, angle, r, a }; });
  const beltLo = Math.min(...belt.map(b => b.angle)), beltHi = Math.max(...belt.map(b => b.angle));

  // Layer regions [x, y, width, height] in artwork coordinates.
  const regions = { backdrop: [0, 0, 1920, 1080], sun: [-330, 360, 510, 510], 'sun-surface': [-330, 360, 510, 510] };
  for (const p of data.planets) {
    const reach = p.id === 'saturn' ? 175 : p.id === 'uranus' ? 75 : p.r + 4;
    regions[p.id] = regions[`${p.id}-top`] = [p.cx - reach, p.cy - reach, reach * 2, reach * 2];
    if (p.rotating) regions[`${p.id}-surface`] = [p.cx - p.r * 1.3, p.cy - p.r * 1.3, p.r * 2.6, p.r * 2.6];
  }
  regions['jupiter-spot'] = [940, 440, 100, 70];
  // Gas giants keep their bands still (scrolling would show seams); drifting
  // cloud wisps and Jupiter's spot convey the rotation instead.
  const banded = { venus: '#f3e2c2', jupiter: '#f5deba', saturn: '#f1e1bd', neptune: '#7fa8ff' };
  const images = {}, bitmaps = {};
  let loaded = 0, ready = false;
  const names = Object.keys(regions);
  for (const name of names) {
    const img = new Image();
    img.onload = () => { if (++loaded === names.length) { ready = true; rasterize(); draw(); } };
    img.src = `layers/${name}.svg`; images[name] = img;
  }

  // Cover-fit; portrait screens center on Jupiter and Saturn.
  let sc = 1, ox = 0, oy = 0;
  function layout() {
    sc = Math.max(w / 1920, h / 1080);
    const focus = w < h ? 1060 : 960;
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

  const starColors = ['200,223,255', '255,240,208', '231,238,255'];
  function stars() {
    const time = t * speed(), count = Math.round(data.stars.length * Math.min(1, Math.max(0.1, num(settings.starDensity, 1))));
    for (let i = 0; i < count; i++) {
      const [x, y, r, a, col] = data.stars[i];
      const tw = 0.5 + 0.5 * Math.sin(time * (0.5 + rnd(i) * 2) + i * 1.9);
      c.fillStyle = `rgba(${starColors[col]},${Math.min(1, a * (0.4 + tw * 0.9))})`;
      c.fillRect(x - r, y - r, r * 2, r * 2);
      if (r > 1.2 && tw > 0.8) glow(x, y, r * 5, '#e7eeff', (tw - 0.8) * a * intensity());
    }
    const extra = Math.round(data.stars.length * Math.max(0, num(settings.starDensity, 1) - 1));
    for (let i = 0; i < extra; i++) {
      c.fillStyle = `rgba(${starColors[i % 3]},${(0.15 + rnd(i + 4000) * 0.4) * (0.5 + 0.5 * Math.sin(time * (0.4 + rnd(i) * 1.5) + i))})`;
      c.fillRect(rnd(i + 4100) * 1920, rnd(i + 4200) * 1080, 1, 1);
    }
  }

  // A soft light travels along each visible orbit, inner orbits faster.
  function orbitLights() {
    const time = t * speed();
    ORBIT.radii.forEach((rx, i) => {
      const [lo, hi] = arcs[i], span = hi - lo, period = 14 + i * 5;
      const p = ((time + rnd(i + 70) * period) % period) / period, fade = Math.sin(p * Math.PI) * intensity();
      const head = lo + span * p, trail = Math.min(0.35, 140 / rx);
      // Continuous fading trail behind the head.
      let [px, py] = onOrbit(rx, head);
      for (let k = 1; k <= 24; k++) {
        const [x, y] = onOrbit(rx, head - trail * k / 24);
        c.beginPath(); c.moveTo(px, py); c.lineTo(x, y);
        c.strokeStyle = rgba(tint(), 0.5 * fade * (1 - k / 24)); c.lineWidth = 1.6; c.stroke();
        px = x; py = y;
      }
      const [hx, hy] = onOrbit(rx, head);
      glow(hx, hy, 10, tint(), 0.6 * fade);
    });
  }

  function sun() {
    const time = t * speed(), pulse = 1 + Math.sin(time * 0.7) * 0.03 + Math.sin(time * 1.9) * 0.01;
    const g = c.createRadialGradient(-75, 615, 0, -75, 615, 515 * pulse);
    g.addColorStop(0, `rgba(255,180,72,${0.45 * Math.min(1.5, intensity())})`); g.addColorStop(0.45, `rgba(245,140,42,${0.15 * intensity()})`); g.addColorStop(1, 'rgba(236,100,33,0)');
    c.fillStyle = g; c.fillRect(-600, 90, 1050, 1050);
    layer('sun');
    // The photosphere turns slowly; spots are clipped to the disc.
    c.save(); c.beginPath(); c.arc(-75, 615, 250, 0, TAU); c.clip();
    c.translate(-75, 615); c.rotate(time * 0.015); c.translate(75, -615); layer('sun-surface');
    c.restore();
    c.save(); c.beginPath(); c.arc(-75, 615, 250, 0, TAU); c.clip();
    glow(-30, 580, 200, '#fff6c8', (0.12 + Math.sin(time * 1.3) * 0.05) * intensity());
    c.restore();
    // Prominences rise from the limb and fade.
    for (let i = 0; i < 4; i++) {
      const cycle = 9 + i * 2.3, p = ((time + i * 2.7) % cycle) / cycle;
      const seed = Math.floor((time + i * 2.7) / cycle) * 4 + i;
      const a = -1.25 + rnd(seed) * 2.3, height = 25 + rnd(seed + 1) * 45;
      const x0 = -75 + Math.cos(a - 0.05) * 250, y0 = 615 + Math.sin(a - 0.05) * 250;
      const x1 = -75 + Math.cos(a + 0.05) * 250, y1 = 615 + Math.sin(a + 0.05) * 250;
      const lift = height * Math.sin(p * Math.PI);
      c.beginPath(); c.moveTo(x0, y0);
      c.bezierCurveTo(-75 + Math.cos(a - 0.08) * (250 + lift * 1.6), 615 + Math.sin(a - 0.08) * (250 + lift * 1.6), -75 + Math.cos(a + 0.08) * (250 + lift * 1.6), 615 + Math.sin(a + 0.08) * (250 + lift * 1.6), x1, y1);
      c.save(); c.shadowColor = '#ff9a3c'; c.shadowBlur = 14;
      c.strokeStyle = `rgba(255,170,80,${0.2 * Math.sin(p * Math.PI) * intensity()})`; c.lineWidth = 10; c.lineCap = 'round'; c.stroke();
      c.restore();
    }
  }

  // Moons orbit some planets; they pass behind (back) or in front (front) of the disc.
  const moons = {
    earth: [[62, 0.35, 0.55, 4, '#c9c9c9']],
    jupiter: [[128, 0.22, 0.9, 4, '#e8d9a8'], [145, 0.22, 0.6, 3.6, '#d9c7a4'], [170, 0.22, 0.38, 5, '#b9a78f'], [196, 0.22, 0.24, 4.6, '#9c958d']],
    saturn: [[205, 0.32, 0.32, 5.5, '#e2b77a']],
    neptune: [[72, 0.45, 0.5, 3.4, '#cdbfb8']]
  };
  function moonPass(p, front) {
    for (const [i, [radius, flat, rate, size, color]] of (moons[p.id] || []).entries()) {
      const a = t * speed() * rate + i * 2.1 + p.cx;
      const depth = Math.sin(a);
      if ((depth > 0) !== front) continue;
      const x = p.cx + Math.cos(a) * radius, y = p.cy + depth * radius * flat - Math.cos(a) * radius * 0.18;
      c.beginPath(); c.arc(x, y, size, 0, TAU); c.fillStyle = color; c.fill();
      const g = c.createRadialGradient(x - size * 0.4, y - size * 0.4, 0, x, y, size);
      g.addColorStop(0, 'rgba(255,255,255,.25)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(1,3,11,.7)');
      c.fillStyle = g; c.fill();
    }
  }
  function planets() {
    const time = t * speed();
    for (const p of data.planets) {
      moonPass(p, false);
      layer(p.id);
      if (p.rotating) {
        c.save(); c.beginPath(); c.arc(p.cx, p.cy, p.r, 0, TAU); c.clip();
        if (banded[p.id]) {
          layer(`${p.id}-surface`);
          for (let i = 0; i < 5; i++) {
            const rate = (6 + rnd(i + p.r) * 10) * (i % 2 ? 1 : -0.7), span = p.r * 3;
            const x = p.cx - p.r * 1.5 + ((time * rate + rnd(i + p.cx) * span) % span + span) % span;
            const y = p.cy + (rnd(i * 3 + p.cy) - 0.5) * p.r * 1.5;
            c.save(); c.translate(x, y); c.scale(1, 0.12); glow(0, 0, p.r * (0.35 + rnd(i + 9) * 0.3), banded[p.id], 0.22); c.restore();
          }
          if (p.id === 'jupiter') {
            const period = p.r * 2.6, dx = ((time * 2.5) % period) - p.r * 0.35;
            layer('jupiter-spot', dx); layer('jupiter-spot', dx - period);
          }
        } else {
          // Surface detail scrolls across the disc and wraps: a turning planet.
          const period = p.r * 2.2, rate = { earth: 4, mars: 3.5 }[p.id] || 1.2;
          const dx = (time * rate) % period;
          layer(`${p.id}-surface`, dx); layer(`${p.id}-surface`, dx - period);
        }
        c.restore();
      }
      layer(`${p.id}-top`);
      moonPass(p, true);
    }
  }

  // The asteroid belt drifts along its orbit; inner rocks move faster.
  function asteroids() {
    const time = t * speed(), span = beltHi - beltLo;
    belt.forEach((b, i) => {
      const angle = beltLo + ((b.angle - beltLo + time * 0.012 * Math.pow(820 / b.k, 1.5)) % span + span) % span;
      const edge = Math.min(1, (angle - beltLo) / (span * 0.1), (beltHi - angle) / (span * 0.1));
      const [x, y] = onOrbit(b.k, angle);
      c.fillStyle = `rgba(187,171,153,${b.a * edge * 1.4})`;
      c.beginPath(); c.arc(x, y, b.r, 0, TAU); c.fill();
    });
  }

  // An occasional comet whose tail points away from the Sun.
  function comet() {
    const time = t * speed(), cycle = 26, p = (time % cycle) / 7;
    if (p > 1) return;
    const seed = Math.floor(time / cycle);
    const x = 1950 - p * 900, y = 40 + rnd(seed) * 120 + p * 420;
    const dx = x + 75, dy = y - 615, len = Math.hypot(dx, dy), tail = 140 * Math.sin(p * Math.PI);
    const tx = x + dx / len * tail, ty = y + dy / len * tail, a = Math.sin(p * Math.PI) * intensity();
    const g = c.createLinearGradient(x, y, tx, ty); g.addColorStop(0, `rgba(220,240,255,${Math.min(1, 0.8 * a)})`); g.addColorStop(1, 'rgba(160,200,255,0)');
    c.beginPath(); c.moveTo(x, y); c.lineTo(tx - dy / len * 6, ty + dx / len * 6); c.lineTo(tx + dy / len * 6, ty - dx / len * 6); c.closePath(); c.fillStyle = g; c.fill();
    glow(x, y, 9, '#e6f4ff', 0.9 * a);
  }

  function draw() {
    if (!w) return;
    c.setTransform(ratio * sc, 0, 0, ratio * sc, ratio * ox, ratio * oy);
    if (!ready) { c.fillStyle = '#080f21'; c.fillRect(0, 0, 1920, 1080); return; }
    layer('backdrop');
    stars(); orbitLights(); comet(); asteroids(); sun(); planets();
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
