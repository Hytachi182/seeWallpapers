/* Iron Vanguard: an original procedural military outpost at dusk. No external assets. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  const api = window.seeWallpaper;
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...api?.getSettings?.() };
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionQuery.matches;
  const on = v => v !== false && v !== 'false' && v !== 0;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const speed = () => clamp(Number(settings.speed ?? 1), 0, 2);
  const intensity = () => clamp(Number(settings.intensity ?? 1), 0, 2);
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  let T = 0, w = 0, h = 0, ratio = 1, sc = 1, ox = 0, oy = 0, paused = false, fps = 30, last = 0, timer = 0, frame = 0;

  function rgb(hex) { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); const n = parseInt(m ? m[1] : 'ff9a4d', 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  const glowRgb = () => rgb(settings.color);
  const rgba = (col, a) => `rgba(${col[0]},${col[1]},${col[2]},${clamp(a, 0, 1)})`;
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));

  // Terrain profiles in the 1920 x 1080 design space.
  const far = x => 655 + 38 * Math.sin(x * .004 + 1.3) + 22 * Math.sin(x * .011 + .4) + 9 * Math.sin(x * .031);
  const mid = x => 772 + 30 * Math.sin(x * .003 + 2.1) + 18 * Math.sin(x * .0087 + 1) + 6 * Math.sin(x * .027 + 3);
  const TX = 1120, TY = 846;
  const ridge = x => { const base = 872 + 30 * Math.sin(x * .0025 + .6) + 12 * Math.sin(x * .009 + 2) + 3 * Math.sin(x * .04); const k = smooth(420, 190, Math.abs(x - TX)); return base + (TY - base) * k; };
  const fg = x => 972 - 62 * Math.exp(-(((x - 520) / 330) ** 2)) + 7 * Math.sin(x * .02) + 4 * Math.sin(x * .053);
  function terrain(fn, color, step = 12) { c.fillStyle = color; c.beginPath(); c.moveTo(-60, 1140); for (let x = -60; x <= 1980; x += step) c.lineTo(x, fn(x)); c.lineTo(1980, 1140); c.closePath(); c.fill(); }
  function rim(fn, color, width, from = -60, to = 1980) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); for (let x = from; x <= to; x += 12) x === from ? c.moveTo(x, fn(x)) : c.lineTo(x, fn(x)); c.stroke(); }
  function glow(x, y, r, col, a) { if (a <= 0) return; const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }

  function sky() {
    const col = glowRgb(), k = intensity();
    const g = c.createLinearGradient(0, 0, 0, 760);
    g.addColorStop(0, '#0a1119'); g.addColorStop(.45, '#1b2430');
    g.addColorStop(.78, `rgb(${mix([52, 50, 54], col, .32 * Math.min(1.4, k)).join(',')})`);
    g.addColorStop(1, `rgb(${mix([88, 70, 58], col, .55 * Math.min(1.4, k)).join(',')})`);
    c.fillStyle = g; c.fillRect(0, 0, 1920, 1080);
    glow(980, 700, 900, col, .22 * k);
    for (let i = 0; i < 90; i++) {
      const x = hash(i) * 1920, y = hash(i + 90) * 420, tw = .45 + .55 * Math.sin(T * (1 + hash(i + 7) * 2) + i);
      c.fillStyle = `rgba(214,224,236,${(1 - y / 440) * .55 * tw})`; c.fillRect(x, y, hash(i + 3) > .9 ? 2 : 1.3, hash(i + 3) > .9 ? 2 : 1.3);
    }
    // Long drifting cloud bands, lit from below by the horizon.
    for (let i = 0; i < 7; i++) {
      const x = (hash(i + 40) * 2600 + T * (5 + i * 1.6)) % 2600 - 340, y = 220 + hash(i + 41) * 300, rw = 260 + hash(i + 42) * 320, rh = 18 + hash(i + 43) * 22;
      c.save(); c.translate(x, y); c.scale(1, rh / rw);
      const cg = c.createRadialGradient(0, 0, 0, 0, 0, rw); cg.addColorStop(0, rgba(mix([60, 62, 70], col, .35), .55)); cg.addColorStop(1, 'rgba(40,44,52,0)');
      c.fillStyle = cg; c.beginPath(); c.arc(0, 0, rw, 0, Math.PI * 2); c.fill(); c.restore();
    }
  }

  // Muffled artillery glow pulsing behind the far range.
  function horizonFlashes() {
    if (!on(settings.artillery)) return;
    const col = glowRgb(), n = Math.floor(T / 1.3);
    for (let s = n - 1; s <= n; s++) {
      if (hash(s * 3.1) < .35) continue;
      const age = T - s * 1.3 - hash(s * 5.7) * .5; if (age < 0 || age > .9) continue;
      const k = Math.exp(-age * 4) * (1 - age / .9);
      glow(hash(s * 2.3) * 1920, 670, 220 + hash(s) * 160, mix(col, [255, 236, 200], .3), .45 * k * intensity());
    }
  }

  const P = 9; // seconds between main gun shots
  function tankState() {
    const shot = Math.floor(T / P), age = T - shot * P;
    const elev = .075 + .045 * Math.sin(shot * 1.9) + .012 * Math.sin(T * .6);
    const recoil = age < 1.2 ? 26 * Math.exp(-age * 5) : 0;
    return { shot, age, elev, recoil };
  }
  function muzzle(st, shotElev = st.elev) { const len = 252 - st.recoil, lx = 100 + Math.cos(shotElev) * len, ly = -114 - Math.sin(shotElev) * len; return [TX - lx, TY + ly]; } // tank faces left

  function impacts() {
    if (!on(settings.artillery)) return;
    const col = glowRgb(), st = tankState();
    for (let s = st.shot - 1; s <= st.shot; s++) {
      const a = T - s * P - 1.4; if (a < 0 || a > 7) continue;
      const ix = 230 + hash(s * 9.1) * 560, iy = far(ix) + 4;
      if (a < .6) { const k = 1 - a / .6; glow(ix, iy - 20, 240, mix(col, [255, 240, 210], .4), .85 * k * intensity()); glow(ix, iy - 10, 60, [255, 246, 220], .9 * k * intensity()); }
      if (!on(settings.smoke)) continue;
      for (let j = 0; j < 9; j++) {
        const rise = a * (14 + j * 4), r = 10 + a * (5 + j * .8) + j * 3, alpha = .32 * Math.exp(-a / 2.6) * Math.min(1, a * 4);
        c.fillStyle = rgba(mix([92, 82, 74], col, .25 * Math.exp(-a)), alpha); c.beginPath(); c.arc(ix + (j - 4) * 5 + a * 6, iy - rise - j * 4, r, 0, Math.PI * 2); c.fill();
      }
    }
  }

  function tracers() {
    if (!on(settings.artillery)) return;
    const m = Math.floor(T / 4.2);
    for (let s = m - 1; s <= m; s++) {
      if (hash(s * 4.4) < .3) continue;
      const age = T - s * 4.2 - hash(s * 1.7) * 1.2; if (age < 0 || age > 2.4) continue;
      const left = hash(s * 6.6) < .55, x0 = left ? 120 + hash(s * 2.9) * 520 : 1380 + hash(s * 2.9) * 460, y0 = mid(x0) + 12;
      const vx = (left ? 1 : -1) * (180 + hash(s) * 160), vy = -(420 + hash(s * 8.8) * 160);
      for (let i = 0; i < 7; i++) {
        const p = (age - i * .1) / 1.2; if (p < 0 || p > 1) continue;
        const pt = q => [x0 + vx * q * 1.2, y0 + vy * q * 1.2 + 140 * q * q];
        const [ax, ay] = pt(p), [bx, by] = pt(Math.max(0, p - .05)), fade = 1 - p;
        c.strokeStyle = `rgba(255,214,140,${.85 * fade})`; c.lineWidth = 2.2; c.beginPath(); c.moveTo(bx, by); c.lineTo(ax, ay); c.stroke();
        glow(ax, ay, 10, [255, 190, 110], .5 * fade * intensity());
      }
    }
  }

  function searchlights() {
    if (!on(settings.searchlights)) return;
    const k = intensity(); c.save(); c.globalCompositeOperation = 'lighter';
    [[360, .0, .42], [1580, 2.2, .36], [880, 4.1, .3]].forEach(([x, ph, sweep], i) => {
      const y = mid(x) + 14, ang = -Math.PI / 2 + sweep * Math.sin(T * (.11 + i * .03) + ph) + (i === 1 ? -.18 : i === 0 ? .14 : 0);
      const len = 1300, spread = .045, dx = Math.cos(ang), dy = Math.sin(ang);
      const g = c.createLinearGradient(x, y, x + dx * len, y + dy * len);
      g.addColorStop(0, `rgba(226,236,255,${.2 * k})`); g.addColorStop(.5, `rgba(200,214,240,${.07 * k})`); g.addColorStop(1, 'rgba(190,205,235,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(x - 6, y);
      c.lineTo(x + Math.cos(ang - spread) * len, y + Math.sin(ang - spread) * len); c.lineTo(x + Math.cos(ang + spread) * len, y + Math.sin(ang + spread) * len); c.lineTo(x + 6, y); c.fill();
    });
    c.restore();
  }

  function transport() {
    if (!on(settings.aircraft)) return;
    const cycle = 46, n = Math.floor(T / cycle), a = T - n * cycle, px = tt => 2120 - tt * 150, py = 150;
    if (a < 16) {
      const x = px(a); c.save(); c.translate(x, py); c.fillStyle = '#151b22';
      c.beginPath(); c.ellipse(0, 0, 70, 9, 0, 0, Math.PI * 2); c.fill();
      c.fillRect(-12, -2, 30, 4); c.beginPath(); c.moveTo(-6, -2); c.lineTo(22, -2); c.lineTo(36, -46); c.lineTo(26, -46); c.closePath(); c.fill(); // high wing seen edge-on
      c.beginPath(); c.moveTo(54, -4); c.lineTo(78, -30); c.lineTo(86, -30); c.lineTo(76, 0); c.fill();
      c.fillRect(-20, 2, 34, 3);
      c.fillStyle = Math.sin(T * 9) > .6 ? 'rgba(255,80,70,.95)' : 'rgba(255,80,70,.15)'; c.fillRect(82, -32, 3, 3);
      c.restore();
    }
    for (let i = 0; i < 6; i++) {
      const drop = 4.6 + i * .75, age = a - drop; if (age < 0) continue;
      const open = smooth(0, 1.4, age), x = px(drop) + age * 9 + Math.sin(age * .9 + i) * 10 * open, y = py + 12 + Math.min(age, 1.4) * 70 * (1 - open * .5) + Math.max(0, age - 1.4) * 26;
      if (y > 820) continue;
      const sway = Math.sin(age * .9 + i) * .12 * open;
      c.save(); c.translate(x, y); c.rotate(sway); c.fillStyle = '#1a2028'; c.strokeStyle = 'rgba(26,32,40,.9)'; c.lineWidth = 1;
      if (open > .05) {
        c.beginPath(); c.ellipse(0, -34 * open, 24 * open, 15 * open, 0, Math.PI, 0); c.lineTo(24 * open, -34 * open + 2); c.quadraticCurveTo(0, -30 * open, -24 * open, -34 * open + 2); c.fill();
        c.beginPath(); c.moveTo(-22 * open, -33 * open); c.lineTo(0, 0); c.lineTo(22 * open, -33 * open); c.moveTo(-8 * open, -31 * open); c.lineTo(0, 0); c.lineTo(8 * open, -31 * open); c.stroke();
      }
      c.fillRect(-2.5, 0, 5, 11); c.beginPath(); c.arc(0, -1, 3, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }

  function helicopter(x, y, dir, s, phase) {
    c.save(); c.translate(x, y); c.scale(dir * s, s); c.rotate(.08 + .03 * Math.sin(T * .7 + phase));
    c.fillStyle = '#10151b';
    c.beginPath(); c.ellipse(0, 0, 46, 17, 0, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(30, -10); c.quadraticCurveTo(52, -2, 40, 10); c.lineTo(24, 6); c.fill();
    c.beginPath(); c.moveTo(-38, -6); c.lineTo(-118, -10); c.lineTo(-118, -2); c.lineTo(-36, 8); c.fill();
    c.beginPath(); c.moveTo(-112, -8); c.lineTo(-128, -32); c.lineTo(-120, -32); c.lineTo(-104, -6); c.fill();
    c.fillRect(-14, -24, 26, 8); c.fillRect(-2, -30, 4, 8);
    c.strokeStyle = '#10151b'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-34, 26); c.lineTo(30, 26); c.moveTo(-18, 14); c.lineTo(-20, 26); c.moveTo(14, 14); c.lineTo(16, 26); c.stroke();
    c.fillStyle = 'rgba(150,190,220,.18)'; c.beginPath(); c.ellipse(22, -4, 14, 7, 0, 0, Math.PI * 2); c.fill();
    const spin = T * 34 + phase, rl = 96 * Math.abs(Math.cos(spin));
    c.fillStyle = 'rgba(16,21,27,.22)'; c.beginPath(); c.ellipse(0, -31, 98, 4, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(16,21,27,.85)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-rl, -31); c.lineTo(rl, -31); c.stroke();
    const tr = 15 * Math.cos(spin * 1.6); c.lineWidth = 2; c.beginPath(); c.moveTo(-124, -22 - tr); c.lineTo(-124, -22 + tr); c.stroke();
    const blink = Math.sin(T * 6 + phase) > .7;
    c.fillStyle = blink ? 'rgba(255,72,64,1)' : 'rgba(255,72,64,.12)'; c.fillRect(-129, -34, 4, 4);
    c.restore();
    if (blink) glow(x - dir * s * 127, y - s * 30, 14, [255, 72, 64], .6);
  }
  function helicopters() {
    if (!on(settings.aircraft)) return;
    const span = 2500;
    helicopter(((T * 70) % span) - 290, 380 + 14 * Math.sin(T * .4), 1, .82, 0);
    helicopter(2210 - ((T * 52 + 1300) % span), 300 + 10 * Math.sin(T * .5 + 2), -1, .58, 1.7);
  }

  function plumes() {
    if (!on(settings.smoke)) return;
    const col = glowRgb();
    [[260, 1], [1700, .8]].forEach(([bx, sz], p) => {
      const by = mid(bx) + 6;
      glow(bx, by, 90 * sz, col, .45 * intensity() * (.85 + .15 * Math.sin(T * 7 + p)));
      for (let i = 0; i < 30; i++) {
        const life = 14, age = (T + i * life / 30 + p * 3) % life, q = age / life;
        const x = bx + age * 7 + (age * .9) ** 2 * 1.4 + Math.sin(age * .7 + i) * 8, y = by - age * 30 * sz, r = (14 + age * 7) * sz;
        c.fillStyle = rgba(mix([40, 38, 40], col, .45 * Math.exp(-age * .5)), .24 * Math.sin(Math.PI * Math.min(1, q * 1.25 + .06)) * (1 - q));
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
    });
  }

  function tank() {
    const col = glowRgb(), st = tankState(), fire = on(settings.artillery);
    const recoil = fire ? st.recoil : 0, age = fire ? st.age : 9, idle = .6 * Math.sin(T * 47);
    const rock = fire && age < 1.5 ? -.012 * Math.exp(-age * 3) * Math.cos(age * 10) : 0;
    c.save(); c.translate(TX, TY + idle * .5); c.scale(-1, 1); c.rotate(rock);
    const dark = '#0f1215', panel = '#151a1e';
    c.fillStyle = dark; c.beginPath(); c.roundRect(-178, -52, 356, 52, 26); c.fill();
    for (let i = 0; i < 7; i++) { const x = -138 + i * 46; c.fillStyle = '#191e23'; c.beginPath(); c.arc(x, -23, 18, 0, Math.PI * 2); c.fill(); c.strokeStyle = rgba(col, .12); c.lineWidth = 1.5; c.beginPath(); c.arc(x, -23, 7, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = dark; c.beginPath(); c.moveTo(-184, -50); c.lineTo(182, -50); c.lineTo(214, -76); c.lineTo(150, -94); c.lineTo(-172, -94); c.lineTo(-194, -72); c.closePath(); c.fill();
    c.fillStyle = panel; c.fillRect(-182, -76, 368, 24);
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 1; for (let i = 1; i < 6; i++) { c.beginPath(); c.moveTo(-182 + i * 61, -76); c.lineTo(-182 + i * 61, -52); c.stroke(); }
    // Turret, mantlet and main gun with recoil.
    c.fillStyle = dark; c.beginPath(); c.moveTo(-96, -94); c.lineTo(86, -94); c.lineTo(124, -114); c.lineTo(98, -144); c.lineTo(-62, -150); c.lineTo(-110, -130); c.closePath(); c.fill();
    c.fillStyle = panel; c.fillRect(-112, -132, 22, 28);
    c.save(); c.translate(100, -114); c.rotate(-st.elev); c.translate(-recoil, 0);
    c.fillStyle = '#12161a'; c.fillRect(0, -6, 252, 12); c.fillRect(96, -9, 40, 18); c.fillRect(236, -8, 20, 16);
    c.strokeStyle = rgba(col, .35 * intensity()); c.lineWidth = 1.5; c.beginPath(); c.moveTo(4, -6); c.lineTo(256, -6); c.stroke();
    c.restore();
    c.fillStyle = panel; c.beginPath(); c.roundRect(82, -128, 34, 30, 5); c.fill();
    c.fillStyle = dark; c.fillRect(-44, -164, 44, 16); c.fillRect(-36, -170, 28, 6);
    const sway = 12 * Math.sin(T * 1.6) + (fire && age < 2 ? -18 * Math.exp(-age * 2.5) * Math.cos(age * 9) : 0);
    c.strokeStyle = '#141a1f'; c.lineWidth = 2; c.beginPath(); c.moveTo(-84, -150); c.quadraticCurveTo(-86 + sway * .3, -240, -84 + sway, -318); c.stroke();
    c.strokeStyle = rgba(col, .45 * intensity()); c.lineWidth = 2;
    c.beginPath(); c.moveTo(-194, -72); c.lineTo(-172, -94); c.lineTo(150, -94); c.lineTo(214, -76); c.stroke();
    c.beginPath(); c.moveTo(-110, -130); c.lineTo(-62, -150); c.lineTo(98, -144); c.stroke();
    c.restore();
    // Rear exhaust shimmer.
    if (on(settings.smoke)) for (let i = 0; i < 8; i++) { const a = (T * .9 + i / 8) % 1; c.fillStyle = `rgba(60,60,64,${.22 * (1 - a)})`; c.beginPath(); c.arc(TX + 180 + a * 60, TY - 86 - a * 70, 8 + a * 22, 0, Math.PI * 2); c.fill(); }
    if (!fire) return;
    const [mx, my] = muzzle(st);
    if (age < .2) {
      const k = 1 - age / .2, I = intensity();
      c.save(); c.globalCompositeOperation = 'lighter';
      glow(mx - 30, my, 260 * k + 60, mix(col, [255, 220, 160], .5), .7 * k * I);
      glow(TX, TY - 40, 520, col, .35 * k * I);
      c.translate(mx, my); c.rotate(Math.PI + st.elev);
      c.fillStyle = `rgba(255,236,190,${.95 * k})`; c.beginPath(); c.ellipse(70 * k, 0, 90 * k + 10, 20 * k + 4, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = `rgba(255,170,90,${.7 * k})`; c.beginPath(); c.ellipse(20, -28 * k, 40 * k, 12 * k, -.5, 0, Math.PI * 2); c.ellipse(20, 28 * k, 40 * k, 12 * k, .5, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    if (!on(settings.smoke)) return;
    for (let s = st.shot - 1; s <= st.shot; s++) {
      const a = T - s * P; if (a < 0 || a > 8) continue;
      const elev = .075 + .045 * Math.sin(s * 1.9);
      const [sx, sy] = muzzle({ elev, recoil: 0 }, elev);
      for (let j = 0; j < 12; j++) {
        const out = (1 - Math.exp(-a * 2.6)) * (20 + j * 16), r = 14 + a * 16 + j * 2.5;
        const x = sx - Math.cos(elev) * out + a * a * 5 + a * 16, y = sy - Math.sin(elev) * out - a * 9 - j * 1.5 * a;
        c.fillStyle = rgba(mix([120, 116, 112], col, .35 * Math.exp(-a)), .34 * Math.exp(-a / 2.4) * Math.min(1, a * 8));
        c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
      for (let j = 0; j < 8; j++) { // ground dust thrown by the blast
        const r = 12 + a * 22, x = TX - 230 - j * 22 + a * 18, y = TY - 8 - a * 4 - (j % 3) * 6;
        c.fillStyle = `rgba(86,74,64,${.3 * Math.exp(-a / 1.8) * Math.min(1, a * 6)})`; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      }
    }
  }

  // Simple articulated silhouette; feet at (x, y), facing 1 or -1.
  function soldier(x, y, s, facing, walk, binoculars) {
    const col = glowRgb(); c.save(); c.translate(x, y); c.scale(s * facing, s);
    c.strokeStyle = '#090b0d'; c.fillStyle = '#090b0d'; c.lineCap = 'round'; c.lineJoin = 'round';
    const breathe = Math.sin(T * 1.8) * .8;
    const leg = (a, b) => { const kx = Math.sin(a) * 30, ky = -58 + Math.cos(a) * 30; c.lineWidth = 12; c.beginPath(); c.moveTo(0, -58); c.lineTo(kx, ky); c.lineTo(kx + Math.sin(a - b) * 30, ky + Math.cos(a - b) * 30); c.stroke(); c.fillRect(kx + Math.sin(a - b) * 30 - 5, ky + Math.cos(a - b) * 30 - 4, 15, 6); };
    const sw = Math.sin(walk);
    leg(walk ? sw * .42 : .06, walk ? Math.max(0, -sw) * .7 : .02); leg(walk ? -sw * .42 : -.08, walk ? Math.max(0, sw) * .7 : .02);
    c.beginPath(); c.moveTo(-11, -56); c.lineTo(-14, -100 + breathe); c.lineTo(13, -100 + breathe); c.lineTo(12, -56); c.closePath(); c.fill();
    c.beginPath(); c.roundRect(-27, -98 + breathe, 15, 36, 4); c.fill();
    c.beginPath(); c.arc(3, -110 + breathe, 9, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(2, -113 + breathe, 13, Math.PI, 0); c.fill(); c.fillRect(-12, -114 + breathe, 28, 3);
    c.lineWidth = 9;
    if (binoculars > 0) {
      const b = binoculars, hx = 6 + 8 * b, hy = -78 - 32 * b;
      c.beginPath(); c.moveTo(4, -96 + breathe); c.lineTo(14 + 4 * b, -84 - 10 * b); c.lineTo(hx, hy); c.stroke();
      c.fillRect(hx - 2, hy - 6, 14, 8);
      if (b > .9 && Math.sin(T * .8) > .7) glow(hx + 13, hy - 2, 8, [255, 230, 190], .7);
      c.lineWidth = 4; c.beginPath(); c.moveTo(-18, -52); c.lineTo(-2, -102); c.stroke(); // slung rifle
    } else {
      c.beginPath(); c.moveTo(4, -96 + breathe); c.lineTo(10, -76); c.lineTo(24, -76); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.moveTo(-8, -66); c.lineTo(44, -86); c.stroke(); c.fillRect(-12, -70, 14, 8);
    }
    c.strokeStyle = rgba(col, .3 * intensity()); c.lineWidth = 1.5; c.beginPath(); c.arc(2, -113 + breathe, 13, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    c.restore();
  }

  function flag() {
    const px = 236, py = fg(236) + 4, top = py - 300, col = glowRgb(), fw = 168, fh = 98, cols = 14;
    c.fillStyle = '#0b0d10'; c.fillRect(px - 3, top, 6, py - top); c.beginPath(); c.arc(px, top, 6, 0, Math.PI * 2); c.fill();
    const wave = on(settings.patrol) ? 1 : .2;
    const pt = (u, v) => { const ph = T * 3.4 - u * 5.5, amp = 14 * u * wave; return [px + u * fw * (1 - .05 * wave * Math.sin(ph) ** 2), top + 8 + v * fh + Math.sin(ph) * amp + u * u * 10]; };
    for (let i = 0; i < cols; i++) {
      const u0 = i / cols, u1 = (i + 1) / cols, shade = .75 + .25 * Math.cos(T * 3.4 - u0 * 5.5);
      const band = [[0, .38, [52, 60, 38]], [.38, .62, mix([150, 120, 70], col, .5)], [.62, 1, [52, 60, 38]]];
      for (const [v0, v1, base] of band) {
        const [ax, ay] = pt(u0, v0), [bx, by] = pt(u1, v0), [cx, cy] = pt(u1, v1), [dx, dy] = pt(u0, v1);
        c.fillStyle = `rgb(${base.map(v => Math.round(v * shade)).join(',')})`; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx + .6, by); c.lineTo(cx + .6, cy); c.lineTo(dx, dy); c.closePath(); c.fill();
      }
    }
  }

  function foreground() {
    const col = glowRgb(), patrol = on(settings.patrol);
    // Lookout behind the sandbag wall.
    const cyc = T % 15, raise = patrol ? smooth(1, 2.2, cyc) * (1 - smooth(8.5, 9.8, cyc)) : 1;
    soldier(560, fg(560) - 8, 1.05, -1, 0, raise);
    terrain(fg, '#0c0f12', 8);
    rim(fg, rgba(col, .18 * intensity()), 2);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 7 - r; i++) {
      const x = 380 + i * 66 + r * 33, y = fg(x) - 14 - r * 24;
      c.fillStyle = r % 2 ? '#13171b' : '#111418'; c.beginPath(); c.ellipse(x, y, 36, 15, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = rgba(col, .14 * intensity()); c.lineWidth = 1.5; c.beginPath(); c.ellipse(x, y, 34, 13, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    }
    flag();
    // Patrol walking along the near ridge.
    const lap = 30, q = (T % lap) / lap, back = q > .5, u = back ? (1 - q) * 2 : q * 2, x = 990 + 460 * (u * u * (3 - 2 * u));
    const moving = patrol && Math.abs(Math.sin(Math.PI * u)) > .02;
    soldier(x, fg(x) + 2, .95, back ? -1 : 1, patrol ? (moving ? T * 5.2 : 0) : 0, 0);
    // Barbed wire coils.
    c.strokeStyle = 'rgba(8,10,12,.95)'; c.lineWidth = 1.6;
    for (let x2 = 1500; x2 < 1960; x2 += 16) { const y = fg(x2) - 26; c.beginPath(); c.ellipse(x2, y, 15, 22, .25, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = '#0a0c0e'; for (let x2 = 1520; x2 < 1960; x2 += 150) c.fillRect(x2, fg(x2) - 60, 5, 62);
  }

  function particles() {
    const col = glowRgb(), I = intensity();
    for (let i = 0; i < 70; i++) {
      const life = 10 + hash(i + 200) * 8, q = ((T + hash(i + 210) * life) % life) / life;
      const x = (hash(i + 220) * 2100 + q * 260 - 90), y = 1080 - hash(i + 230) * 520 - q * 60 + Math.sin(T + i) * 6;
      c.fillStyle = `rgba(190,170,150,${.22 * Math.sin(Math.PI * q) * I})`; c.fillRect(x, y, 2, 2);
    }
    if (on(settings.smoke)) for (let i = 0; i < 26; i++) { // embers rising from the burning positions
      const src = i % 2 ? 1700 : 260, life = 4 + hash(i + 300) * 3, q = ((T + hash(i + 310) * life) % life) / life;
      const x = src + (hash(i + 320) - .5) * 60 + q * 70 + Math.sin(T * 2 + i) * 8, y = mid(src) - q * 200;
      c.fillStyle = rgba(mix(col, [255, 220, 150], .4), (1 - q) * .9 * Math.min(1, I)); c.fillRect(x, y, 2.2, 2.2);
    }
  }

  function vignette() {
    const g = c.createRadialGradient(960, 600, 300, 960, 600, 1250); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.55)');
    c.fillStyle = g; c.fillRect(0, 0, 1920, 1080);
  }

  function draw() {
    if (!w) return;
    c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#0a1119'; c.fillRect(0, 0, canvas.width, canvas.height);
    c.setTransform(ratio * sc, 0, 0, ratio * sc, ratio * ox, ratio * oy);
    const col = glowRgb();
    sky(); horizonFlashes();
    terrain(far, `rgb(${mix([46, 44, 50], col, .2).join(',')})`); rim(far, rgba(col, .22 * intensity()), 1.5);
    impacts(); searchlights(); transport(); helicopters(); tracers(); plumes();
    terrain(mid, `rgb(${mix([28, 29, 33], col, .1).join(',')})`); rim(mid, rgba(col, .16 * intensity()), 1.5);
    terrain(ridge, '#14171b'); rim(ridge, rgba(col, .2 * intensity()), 2);
    tank(); foreground(); particles(); vignette();
  }

  function resize() {
    w = innerWidth; h = innerHeight; ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(2073600 / Math.max(1, w * h)));
    canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
    sc = Math.max(w / 1920, h / 1080); const focus = w / h < 1.2 ? 1110 : 960;
    ox = clamp(w / 2 - focus * sc, w - 1920 * sc, 0); oy = (h - 1080 * sc) / 2;
  }
  function stop() { clearTimeout(timer); cancelAnimationFrame(frame); last = 0; }
  function animate(now) {
    if (paused || document.hidden || reduced || speed() === 0) { stop(); return; }
    if (last) T += Math.min(.1, (now - last) / 1000) * speed(); last = now;
    const begin = performance.now(); draw();
    timer = setTimeout(() => { frame = requestAnimationFrame(animate); }, Math.max(0, 1000 / fps - (performance.now() - begin) - 4));
  }
  function start() { stop(); if (!paused && !document.hidden && !reduced && speed() > 0) frame = requestAnimationFrame(animate); }
  addEventListener('resize', () => { resize(); draw(); }); document.addEventListener('visibilitychange', start);
  api?.onSettingsChanged?.(v => { settings = { ...settings, ...v }; draw(); start(); });
  api?.onPause?.(() => { paused = true; stop(); }); api?.onResume?.(() => { paused = false; start(); });
  api?.onPerformanceChanged?.(v => { fps = clamp(Number(v) || 30, 1, 60); start(); });
  motionQuery.addEventListener?.('change', () => { reduced = motionQuery.matches; draw(); start(); });
  resize(); T = 12;
  const preview = new URLSearchParams(location.search).get('preview');
  if (preview !== null) { paused = true; T = Number(preview) || 12; draw(); } else { draw(); start(); }
})();
