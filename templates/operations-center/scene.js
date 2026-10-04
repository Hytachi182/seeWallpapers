/* Offline procedural scenes. Distributed inside each package by generate-template-scenes.mjs. */
(() => {
  'use strict';
  const scene = document.body.dataset.scene;
  const canvas = document.querySelector('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const defaults = JSON.parse(document.getElementById('defaults').textContent);
  let settings = { ...defaults, ...window.seeWallpaper?.getSettings?.() };
  let width = 0, height = 0, ratio = 1, elapsed = 0, last = 0, timer = 0, frame = 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = false, fps = reducedMotion ? 15 : 60;
  let metrics = window.seeWallpaper?.getSystemInfo?.() || {};
  const TAU = Math.PI * 2;
  const random = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const color = () => settings.color || settings.accent || '#7ceaff';
  const rgba = (hex, a) => { const h = /^#[\da-f]{6}$/i.test(hex) ? hex : '#7ceaff'; return `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${a})`; };
  function resize() {
    width = innerWidth; height = innerHeight; ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  const line = (ax, ay, bx, by, stroke, weight = 1) => {
    ctx.strokeStyle = stroke; ctx.lineWidth = weight; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  };
  const circle = (x, y, r, fill) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); ctx.fill(); };
  function glow(x, y, radius, tint, strength = 0.2) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, rgba(tint, strength)); g.addColorStop(0.35, rgba(tint, strength * 0.4)); g.addColorStop(1, rgba(tint, 0));
    ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  function background(tint = '#0b1924') {
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#03060b'; ctx.fillRect(0, 0, width, height);
    glow(width * 0.64, height * 0.47, Math.max(width, height) * 0.7, tint, 0.45);
  }
  function stars(t, count = 160, tint = '#b4d5ed') {
    for (let i = 0; i < count; i++) {
      const x = random(i + 10) * width, y = random(i + 1100) * height;
      circle(x, y, random(i + 20) > 0.97 ? 1.4 : 0.6, rgba(tint, 0.1 + random(i + 140) * 0.35 + Math.sin(t * 0.3 + i) * 0.08));
    }
  }
  function project(p, cx, cy, size, turn = 0, tilt = 0.3) {
    let x = p[0] * Math.cos(turn) - p[2] * Math.sin(turn), z = p[0] * Math.sin(turn) + p[2] * Math.cos(turn);
    const y = p[1] * Math.cos(tilt) - z * Math.sin(tilt); z = p[1] * Math.sin(tilt) + z * Math.cos(tilt);
    const scale = 3.5 / (3.5 + z);
    return { x: cx + x * size * scale, y: cy + y * size * scale, z, scale };
  }
  function reactor(t, operations = false) {
    const tint = color(), cx = width * (operations ? 0.71 : 0.60), cy = height * 0.49;
    const size = Math.min(width * (operations ? 0.23 : 0.28), height * 0.36);
    background('#18263f'); stars(t); glow(cx, cy, size * 2.4, tint, 0.28);
    // Segmented industrial rings, rotating in three distinct orbital planes.
    for (let ring = 0; ring < 5; ring++) {
      const r = 0.8 + ring * 0.16;
      for (let j = 0; j < 150; j++) {
        if ((j + ring * 4) % 31 < 5) continue;
        const a = j / 150 * TAU + t * (ring % 2 ? -0.09 : 0.07);
        const b = a + TAU / 150 * 0.75;
        const p = project([Math.cos(a) * r, Math.sin(a) * r, 0], cx, cy, size * 0.82, ring * 0.45, 0.18 + ring * 0.23);
        const q = project([Math.cos(b) * r, Math.sin(b) * r, 0], cx, cy, size * 0.82, ring * 0.45, 0.18 + ring * 0.23);
        line(p.x, p.y, q.x, q.y, rgba(ring === 2 ? '#ffbe83' : tint, p.z > 0 ? 0.3 : 0.85), ring === 3 ? 2 : 1);
      }
    }
    // A slowly turning spherical lattice, with energy moving along its meridians.
    const turn = t * 0.10;
    for (let meridian = 0; meridian < 24; meridian++) {
      const longitude = meridian / 24 * TAU;
      let prev;
      for (let j = 0; j <= 36; j++) {
        const a = j / 36 * Math.PI;
        const p = project([Math.sin(a) * Math.cos(longitude) * 0.7, Math.cos(a) * 0.7, Math.sin(a) * Math.sin(longitude) * 0.7], cx, cy, size, turn);
        if (prev) line(prev.x, prev.y, p.x, p.y, rgba(tint, p.z < 0 ? 0.56 : 0.16), 0.75);
        if (j % 3 === 0 && meridian % 2 === 0) circle(p.x, p.y, p.z < 0 ? 1.8 : 0.9, rgba(tint, p.z < 0 ? 0.9 : 0.24));
        prev = p;
      }
    }
    for (let lat = 1; lat < 12; lat++) {
      const a = lat / 12 * Math.PI; let prev;
      for (let j = 0; j <= 96; j++) {
        const b = j / 96 * TAU;
        const p = project([Math.sin(a) * Math.cos(b) * 0.7, Math.cos(a) * 0.7, Math.sin(a) * Math.sin(b) * 0.7], cx, cy, size, turn);
        if (prev) line(prev.x, prev.y, p.x, p.y, rgba(tint, p.z < 0 ? 0.42 : 0.12), 0.75);
        prev = p;
      }
    }
    glow(cx, cy, size * 0.48, tint, 0.25 + Math.sin(t * 1.5) * 0.05 * (settings.intensity || 1));
    circle(cx, cy, size * 0.038, '#e8faff'); glow(cx, cy, size * 0.12, tint, 0.8);
    for (let i = 0; i < 100; i++) {
      const a = i / 100 * TAU, r = size * 1.52;
      line(cx + Math.cos(a) * r, cy + Math.sin(a) * r, cx + Math.cos(a) * (r + (i % 5 ? 4 : 12)), cy + Math.sin(a) * (r + (i % 5 ? 4 : 12)), rgba(tint, 0.32));
    }
    if (!operations) {
      ctx.font = '10px Consolas, monospace'; ctx.fillStyle = rgba(tint, 0.55);
      ctx.fillText('PROCEDURAL / NEURAL REACTOR', cx - size * 1.4, cy + size * 1.75);
      line(cx - size * 1.4, cy + size * 1.65, cx + size * 1.4, cy + size * 1.65, rgba(tint, 0.2));
    }
  }
  function tunnel(t) {
    const tint = color(), cx = width * 0.60, cy = height * 0.46, unit = Math.min(width, height) * 0.32;
    background('#0c2937'); glow(cx, cy, height * 0.45, tint, 0.30);
    const speed = t * 0.35 * settings.speed;
    function point(a, z) {
      const twist = z * 0.045 + Math.sin(t * 0.12) * 0.15;
      return [cx + Math.cos(a + twist) * unit * 2.6 / z, cy + Math.sin(a + twist) * unit * 2.6 / z];
    }
    for (let ring = 0; ring < 36; ring++) {
      const z = 0.45 + ((ring * 0.39 - speed % 0.39 + 0.39) % 14), alpha = Math.min(0.8, 1.5 / z);
      for (let side = 0; side < 8; side++) {
        const p = point(side / 8 * TAU, z), q = point((side + 1) / 8 * TAU, z);
        line(...p, ...q, rgba(side % 3 === 0 ? '#ff647d' : tint, alpha * (ring % 4 === 0 ? 1 : 0.48)), ring % 4 === 0 ? 2 : 0.8);
        if (ring < 35) { const n = point(side / 8 * TAU, z + 0.39); line(...p, ...n, rgba(tint, alpha * 0.35)); }
      }
    }
    for (let i = 0; i < 170; i++) {
      const a = random(i + 7) * TAU, z = 0.25 + ((random(i + 301) * 12 - speed * (0.7 + random(i)) % 12 + 12) % 12);
      const p = point(a, z), q = point(a, z + 0.05 + 0.05 / z);
      line(...p, ...q, rgba(i % 9 ? tint : '#ff9cba', Math.min(0.9, 1 / z)), 1.4);
    }
    glow(cx, cy, unit * 0.13, tint, 0.42); circle(cx, cy, 2, '#dbfcff');
  }
  function rain(t) {
    const tint = color(); background('#052119');
    const glyphs = 'アイウエカキクケコサシスセソタチツテトナニヌネノ012345789';
    for (let layer = 0; layer < 3; layer++) {
      const fontSize = [11, 17, 25][layer], spacing = fontSize * 1.65;
      ctx.font = `${fontSize}px Consolas, monospace`;
      const columns = Math.ceil(width / spacing);
      for (let col = 0; col < columns; col++) {
        const seed = col + layer * 180, cycle = height + 550;
        const head = (random(seed + 75) * cycle + t * (30 + random(seed) * 48) * settings.speed * (layer + 1) * 0.6) % cycle - 90;
        const x = col * spacing + Math.sin(t * 0.06) * (layer * 4);
        for (let j = 0; j < 24; j++) {
          const y = head - j * fontSize * 1.25;
          if (y < -fontSize || y > height + fontSize) continue;
          const alpha = (1 - j / 24) ** 2 * [0.20, 0.42, 0.82][layer];
          ctx.fillStyle = j === 0 ? rgba('#e5ffed', layer === 2 ? 0.9 : 0.4) : rgba(tint, alpha);
          ctx.shadowBlur = settings.glow && layer === 2 && j < 2 ? 8 : 0; ctx.shadowColor = tint;
          ctx.fillText(glyphs[Math.floor(random(seed * 31 + j + Math.floor(t * 4)) * glyphs.length)], x, y);
        }
      }
    }
    ctx.shadowBlur = 0;
    const shade = ctx.createLinearGradient(0, 0, width, 0); shade.addColorStop(0, '#020906c4'); shade.addColorStop(0.4, '#02090600'); shade.addColorStop(1, '#02090644'); ctx.fillStyle = shade; ctx.fillRect(0, 0, width, height);
  }
  const nodes = Array.from({ length: 135 }, (_, i) => {
    const a = random(i + 42) * TAU, z = random(i + 190) * 2 - 1, r = Math.sqrt(1 - z * z) * (0.6 + random(i + 14) * 0.65);
    return [Math.cos(a) * r, Math.sin(a) * r, z * 1.25];
  });
  const edges = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    if (Math.hypot(...nodes[i].map((v, k) => v - nodes[j][k])) < 0.55) edges.push([i, j]);
  }
  function neural(t) {
    const tint = color(); background('#171229'); stars(t, 200); const size = Math.min(width * 0.33, height * 0.40);
    const cx = width * 0.59, cy = height * 0.49; glow(cx, cy, size * 1.8, tint, 0.12);
    const points = nodes.map(n => project(n, cx, cy, size, t * 0.055, 0.2 + Math.sin(t * 0.12) * 0.12));
    edges.forEach(([i, j], index) => {
      const p = points[i], q = points[j], depth = Math.max(0.08, 0.55 - (p.z + q.z) * 0.16);
      line(p.x, p.y, q.x, q.y, rgba(tint, depth * 0.72), 0.8);
      const u = (t * 0.22 * settings.intensity + random(index)) % 1;
      if (index % 5 === 0) circle(p.x + (q.x - p.x) * u, p.y + (q.y - p.y) * u, 1.5, rgba('#e7e2ff', depth));
    });
    points.sort((a, b) => b.z - a.z).forEach((p, i) => {
      circle(p.x, p.y, 2.4 * p.scale, rgba(tint, Math.max(0.2, 0.7 - p.z * 0.3)));
      if (i % 8 === 0) { glow(p.x, p.y, 18 * p.scale, tint, 0.22); circle(p.x, p.y, p.scale, '#f1eaff'); }
    });
  }
  function skyline(t, rainy = false) {
    const horizon = height * (rainy ? 0.74 : 0.80), tint = rainy ? settings.warmth : settings.moonlight;
    for (let layer = 0; layer < 3; layer++) {
      const count = 28 + layer * 8, bw = width / count;
      for (let i = 0; i < count; i++) {
        const bh = (0.07 + random(i + layer * 80) * 0.27) * height * (0.5 + layer * 0.2);
        const bx = i * bw, by = horizon - bh + layer * height * 0.055;
        ctx.fillStyle = ['#111a31', '#0b1425', '#060d19'][layer]; ctx.fillRect(bx, by, bw - 3, height - by);
        if (rainy) for (let row = 0; row < bh / 13; row++) for (let col = 0; col < bw / 10 - 1; col++) {
          if (random(i * 313 + row * 21 + col + layer) < 0.54) continue;
          ctx.fillStyle = rgba((i + col) % 4 ? tint : '#68d4e4', 0.12 + random(i + row * 17) * 0.4); ctx.fillRect(bx + 6 + col * 10, by + 7 + row * 13, 3, 5);
        }
        if (rainy && i % 7 === 0) {
          ctx.fillStyle = rgba(i % 2 ? '#f05c99' : '#7dd7ff', 0.7); ctx.fillRect(bx + bw * 0.6, by + 12, 3, bh * 0.55);
          glow(bx + bw * 0.6, by + bh * 0.3, bw * 1.5, i % 2 ? '#f05c99' : '#7dd7ff', 0.1);
        }
      }
    }
    if (rainy) for (let i = 0; i < 80; i++) {
      const x = random(i + 723) * width, y = horizon + random(i + 500) * (height - horizon);
      line(x - 4, y, x + 4 + random(i) * 45, y, rgba(i % 3 ? tint : '#91cfea', 0.05 + random(i) * 0.15), 1 + random(i) * 2);
    }
  }
  function rainy(t) {
    background('#1b2a48'); const tint = settings.warmth;
    glow(width * 0.70, height * 0.45, height * 0.6, tint, 0.24); skyline(t, true);
    for (let i = 0; i < 24; i++) {
      const bx = width * (0.3 + random(i + 710) * 0.7), by = height * (0.66 + random(i + 902) * 0.20), r = 4 + random(i + 502) * 24;
      glow(bx, by, r * 3, i % 3 ? tint : '#70dded', 0.22);
      circle(bx, by, r, rgba(i % 3 ? tint : '#70dded', 0.045));
    }
    // Condensation and refracted droplets on the near plane of the window.
    for (let i = 0; i < 210 * settings.rain; i++) {
      const x = random(i + 381) * width, y = (random(i + 83) * height + t * (3 + random(i + 4) * 22)) % (height + 60) - 30;
      const r = 1 + random(i + 77) * 3.5;
      line(x, y - r * 8, x - r * 0.3, y, '#c3e5f017', r * 0.6);
      ctx.strokeStyle = '#b4dff044'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.ellipse(x, y, r * 0.7, r, 0.1, 0, TAU); ctx.stroke();
      circle(x + r * 0.25, y - r * 0.3, r * 0.20, '#e3faff80');
    }
    ctx.fillStyle = '#030812'; ctx.fillRect(width * 0.22, 0, width * 0.012, height); ctx.fillRect(0, height * 0.84, width, height * 0.018);
    line(width * 0.232, 0, width * 0.232, height, '#638aa32c', 2);
    const v = ctx.createRadialGradient(width * 0.6, height * 0.4, height * 0.1, width * 0.6, height * 0.4, width * 0.85); v.addColorStop(0, '#02071100'); v.addColorStop(1, '#020711d9'); ctx.fillStyle = v; ctx.fillRect(0, 0, width, height);
  }
  function sakura(t) {
    const tint = settings.moonlight; background('#2a2246'); stars(t, 100, tint);
    const mx = width * 0.70, my = height * 0.25, mr = Math.min(width, height) * 0.095;
    glow(mx, my, mr * 5, tint, 0.18); circle(mx, my, mr, tint);
    for (let i = 0; i < 24; i++) circle(mx + (random(i + 3) - 0.5) * mr * 1.4, my + (random(i + 9) - 0.5) * mr * 1.4, mr * (0.02 + random(i + 70) * 0.13), '#40395b12');
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = ['#1c1d36', '#14192c', '#0a1425'][layer]; ctx.beginPath(); ctx.moveTo(0, height);
      for (let x = 0; x <= width + 20; x += 20) ctx.lineTo(x, height * (0.61 + layer * 0.09) + Math.sin(x / (width * 0.13) + layer * 2) * height * 0.06 + Math.cos(x / (width * 0.28) + layer) * height * 0.05);
      ctx.lineTo(width, height); ctx.fill();
    }
    // A torii silhouette anchors the landscape in the moon's reflection.
    const tx = width * 0.69, ty = height * 0.69, tw = Math.min(width * 0.13, height * 0.2);
    ctx.strokeStyle = '#080d1b'; ctx.lineWidth = Math.max(5, tw * 0.07);
    line(tx - tw * 0.60, ty, tx - tw * 0.52, ty + tw * 0.95, '#080d1b', tw * 0.07);
    line(tx + tw * 0.60, ty, tx + tw * 0.52, ty + tw * 0.95, '#080d1b', tw * 0.07);
    line(tx - tw * 0.85, ty - tw * 0.09, tx + tw * 0.85, ty - tw * 0.09, '#080d1b', tw * 0.10);
    line(tx - tw * 0.73, ty + tw * 0.13, tx + tw * 0.73, ty + tw * 0.13, '#080d1b', tw * 0.06);
    // Deterministic branching canopy: the branches are never regenerated on a frame.
    function branch(x, y, len, a, depth, seed) {
      const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
      line(x, y, ex, ey, depth > 2 ? '#090e1c' : '#282033', Math.max(1, depth * depth * 0.7));
      if (depth > 0) {
        branch(ex, ey, len * 0.73, a - 0.30 - random(seed) * 0.28, depth - 1, seed + 7);
        branch(ex, ey, len * 0.64, a + 0.4 + random(seed + 1) * 0.24, depth - 1, seed + 13);
      } else for (let i = 0; i < 12; i++) {
        const bx = ex + (random(seed + i * 6) - 0.5) * len * 2.5, by = ey + (random(seed + i * 8) - 0.5) * len * 1.5;
        circle(bx, by, 2 + random(seed + i) * 4, rgba(i % 4 ? '#d992b8' : tint, 0.45 + random(i + seed) * 0.30));
      }
    }
    branch(-width * 0.04, height * 1.03, height * 0.37, -0.91, 6, 12);
    for (let i = 0; i < 90 * settings.petalDensity; i++) {
      const x = (random(i + 300) * (width + 60) + t * (9 + random(i) * 12)) % (width + 60) - 30;
      const y = (random(i + 100) * (height + 60) + t * (6 + random(i + 2) * 12)) % (height + 60) - 30;
      ctx.save(); ctx.translate(x + Math.sin(t * 0.7 + i) * 16, y); ctx.rotate(t * 0.5 + i); ctx.fillStyle = rgba('#efb8d2', 0.25 + random(i) * 0.55); ctx.beginPath(); ctx.ellipse(0, 0, 2 + random(i) * 4, 1.3 + random(i) * 1.5, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  const hud = document.querySelector('main');
  const cpuHistory = [], ramHistory = [];
  function systemInfo(value) {
    metrics = value || {};
    const cpu = Number(metrics.cpuUsage), ram = Number(metrics.memoryUsage);
    cpuHistory.push(metrics.cpuUsage == null || !Number.isFinite(cpu) ? null : Math.max(0, Math.min(100, cpu)));
    ramHistory.push(metrics.memoryUsage == null || !Number.isFinite(ram) ? null : Math.max(0, Math.min(100, ram)));
    if (cpuHistory.length > 90) { cpuHistory.shift(); ramHistory.shift(); }
    updateHud();
  }
  function updateHud() {
    if (!hud) return;
    const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
    const now = new Date(); set('time', now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    set('date', now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }));
    set('cpu', metrics.cpuUsage == null ? '—' : `${Number(metrics.cpuUsage).toFixed(1)}%`);
    set('ram', metrics.memoryUsage == null ? '—' : `${Number(metrics.memoryUsage).toFixed(1)}%`);
    set('uptime', metrics.uptime ? String(metrics.uptime).split('.')[0] : '—');
    set('power', metrics.isOnBattery == null ? '—' : metrics.isOnBattery ? 'Battery' : 'AC power');
    set('host', metrics.hostname || 'Waiting for system metrics');
    document.documentElement.style.setProperty('--accent', color());
    document.querySelector('.legend').hidden = !settings.showGraph;
  }
  function graphs() {
    if (!settings.showGraph) return;
    const left = width * 0.09, top = height * 0.78, gw = width * 0.31, gh = height * 0.10;
    for (let j = 0; j < 4; j++) line(left, top + j * gh / 3, left + gw, top + j * gh / 3, rgba(color(), 0.10));
    [cpuHistory, ramHistory].forEach((values, index) => {
      ctx.strokeStyle = index ? '#ffe0ac' : color(); ctx.lineWidth = 1.5; ctx.beginPath(); let started = false;
      values.forEach((v, i) => { if (v == null) { started = false; return; } const x = left + gw * i / 89, y = top + gh * (1 - v / 100); if (started) ctx.lineTo(x, y); else ctx.moveTo(x, y); started = true; }); ctx.stroke();
    });
  }
  function draw(t) {
    if (scene === 'ai-core') reactor(t);
    else if (scene === 'operations-center') { reactor(t, true); if (width >= 700) graphs(); updateHud(); }
    else if (scene === 'data-tunnel') tunnel(t);
    else if (scene === 'digital-rain-3d') rain(t);
    else if (scene === 'neural-network') neural(t);
    else if (scene === 'rainy-window') rainy(t);
    else if (scene === 'sakura-night') sakura(t);
  }
  function stop() { clearTimeout(timer); cancelAnimationFrame(frame); timer = 0; frame = 0; last = 0; }
  function animate(timestamp) {
    if (paused || document.hidden) { stop(); return; }
    if (last) elapsed += Math.min(0.1, (timestamp - last) / 1000);
    last = timestamp;
    const start = performance.now(); draw(elapsed);
    timer = setTimeout(() => { frame = requestAnimationFrame(animate); }, Math.max(0, 1000 / fps - (performance.now() - start) - 4));
  }
  function start() { stop(); if (!paused && !document.hidden) frame = requestAnimationFrame(animate); }
  addEventListener('resize', () => { resize(); if (paused) draw(elapsed); });
  document.addEventListener('visibilitychange', start);
  window.seeWallpaper?.onSettingsChanged(value => { settings = { ...settings, ...value }; updateHud(); if (paused) draw(elapsed); });
  window.seeWallpaper?.onSystemInfoChanged(systemInfo);
  window.seeWallpaper?.onPause(() => { paused = true; stop(); });
  window.seeWallpaper?.onResume(() => { paused = false; start(); });
  window.seeWallpaper?.onPerformanceChanged(value => { fps = Math.max(1, Math.min(reducedMotion ? 15 : 60, Number(value) || 30)); start(); });
  // Fixed-time rendering is used only by the preview capture tool, never the wallpaper host.
  const preview = new URLSearchParams(location.search).get('preview');
  resize(); systemInfo(metrics);
  if (preview !== null) { paused = true; elapsed = Number(preview) || 12; draw(elapsed); }
  else start();
})();
