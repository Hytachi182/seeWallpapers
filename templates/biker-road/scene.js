/* Source artwork remains fixed: movement is confined to the sky, sea and road.
   Canvas drawing works from file:// without pixel reads or network requests. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas');
  const c = canvas.getContext('2d', { alpha: false });
  const art = new Image();
  const sdk = window.seeWallpaper;
  let settings = { speed: 1, intensity: 1, road: true, clouds: true, water: true, tailLight: true,
    birds: true, exhaust: true, dust: true, sunRays: true,
    ...sdk?.getSettings?.() };
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const preview = Number(new URLSearchParams(location.search).get('preview'));
  const fixedPreview = new URLSearchParams(location.search).has('preview') && Number.isFinite(preview);
  let time = fixedPreview ? Math.max(0, preview) : 0;
  let paused = fixedPreview, ready = false, fps = 30, raf = 0, timer = 0, last = 0;
  let w = 0, h = 0, aw = 0, ah = 0, ox = 0, oy = 0;
  const sky = document.createElement('canvas');
  const sc = sky.getContext('2d');
  const roadMask = document.createElement('canvas');
  const roadFrame = document.createElement('canvas');
  const rc = roadFrame.getContext('2d');
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
    sideFade.addColorStop(0.70, '#fff0'); sideFade.addColorStop(1, '#fff0');
    sc.fillStyle = sideFade; sc.fillRect(0, 0, sky.width, sky.height);
    sc.globalCompositeOperation = 'source-over';
    roadMask.width = roadFrame.width = art.width;
    roadMask.height = roadFrame.height = art.height;
    const mc = roadMask.getContext('2d');
    mc.filter = 'blur(10px)'; mc.fillStyle = '#fff'; mc.beginPath();
    [[0.665,0.591],[0.691,0.595],[0.708,0.65],[0.622,0.775],[0.473,1.03],[0.16,1.03],[0.43,0.839],[0.612,0.675]]
      .forEach(([x,y], i) => i ? mc.lineTo(x*art.width,y*art.height) : mc.moveTo(x*art.width,y*art.height));
    mc.closePath(); mc.fill(); mc.filter = 'none';
    draw();
  }

  function glow(x, y, radius, color, alpha) {
    const g = c.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), aw * radius);
    g.addColorStop(0, `rgba(${color},${alpha})`); g.addColorStop(1, `rgba(${color},0)`);
    c.fillStyle = g; c.fillRect(X(x - radius), Y(y) - aw * radius, aw * radius * 2, aw * radius * 2);
  }

  function clouds(amount) {
    // Move a single feathered sky layer to avoid seams between texture strips.
    c.globalAlpha = 0.95;
    const dx = Math.sin(time * 0.3) * 24 * amount;
    const dy = Math.sin(time * 0.2) * 3 * amount;
    c.drawImage(sky, ox + dx * aw / art.width, oy + dy * ah / art.height, aw, sky.height * ah / art.height);
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
      c.strokeStyle = `rgba(255,211,128,${(0.1 + solar * 0.5) * pulse * amount})`;
      c.lineWidth = Math.max(0.8, ah * 0.0013);
      const drift = Math.sin(time * 1.2 + i) * 0.005;
      c.beginPath(); c.moveTo(X(x + drift), Y(y));
      c.lineTo(X(x + drift + 0.002 + random(i + 60) * 0.013), Y(y)); c.stroke();
    }
    c.restore();
  }

  function road(amount) {
    // Move the painted asphalt itself outward from the road's vanishing point.
    // Overlapping zoom passes crossfade seamlessly; the feathered mask keeps
    // the rider, guardrail and lane markings outside the moving texture.
    rc.clearRect(0,0,art.width,art.height);
    rc.globalCompositeOperation = 'source-over';
    rc.globalAlpha = 1; rc.drawImage(art,0,0);
    for (let pass = 0; pass < 2; pass++) {
      const phase = (time * 0.65 + pass * 0.5) % 1;
      const scale = 1 + phase * 0.16;
      rc.globalAlpha = Math.pow(Math.sin(phase * Math.PI),2) * Math.min(1,amount);
      rc.drawImage(art,art.width*0.676*(1-scale),art.height*0.587*(1-scale),art.width*scale,art.height*scale);
    }
    rc.globalAlpha = 1; rc.globalCompositeOperation = 'destination-in';
    rc.drawImage(roadMask,0,0);
    rc.globalCompositeOperation = 'source-over';
    c.drawImage(roadFrame,ox,oy,aw,ah);
    c.save(); c.beginPath();
    // Inside the left lane, away from the rider, guardrail and yellow markings.
    [[0.665,0.591],[0.691,0.595],[0.712,0.653],[0.622,0.775],[0.473,1],[0.19,1],[0.43,0.839],[0.612,0.675]]
      .forEach(([x,y], i) => i ? c.lineTo(X(x),Y(y)) : c.moveTo(X(x),Y(y)));
    c.closePath(); c.clip();
    for (let i = 0; i < 85; i++) {
      const p = (random(i) + time * (0.35 + random(i + 100) * 0.12)) % 1;
      const depth = p * p, end = 0.15 + random(i + 200) * 0.4;
      const x = 0.676 + (end - 0.676) * depth, y = 0.587 + depth * 0.48;
      const tail = Math.max(0, p - 0.025 - p * 0.035), d = tail * tail;
      c.strokeStyle = `rgba(255,195,131,${0.3 * Math.sin(p * Math.PI) * amount})`;
      c.lineWidth = Math.max(0.6, aw * (0.0003 + depth * 0.0012));
      c.beginPath(); c.moveTo(X(x),Y(y));
      c.lineTo(X(0.676 + (end - 0.676) * d),Y(0.587 + d * 0.48)); c.stroke();
    }
    c.restore();
  }

  function birds(amount) {
    // A small flock passes above the bay, with staggered wing beats.
    c.save(); c.strokeStyle = `rgba(39,27,29,${Math.min(0.85,amount*0.7)})`;
    c.lineCap = 'round';
    const journey = (time * 0.016) % 1;
    for (let i = 0; i < 7; i++) {
      const p = (journey + i * 0.018) % 1;
      const x = 0.08 + p * 0.6;
      const y = 0.275 + Math.sin(p * Math.PI * 2) * 0.025 + i * 0.006;
      const wing = aw * (0.004 + random(i+450)*0.002);
      const flap = Math.sin(time * 6 + i * 0.8) * ah * 0.006;
      c.lineWidth = Math.max(0.8,aw*0.00075);
      c.beginPath(); c.moveTo(X(x)-wing,Y(y)-flap);
      c.quadraticCurveTo(X(x)-wing*0.45,Y(y)-flap*0.8,X(x),Y(y));
      c.quadraticCurveTo(X(x)+wing*0.45,Y(y)-flap*0.8,X(x)+wing,Y(y)-flap);
      c.stroke();
    }
    c.restore();
  }

  function exhaust(amount) {
    // Each puff emerges from a pipe, expands, trails behind and fades out.
    c.save();
    for (let pipe = 0; pipe < 2; pipe++) {
      for (let i = 0; i < 14; i++) {
        const age = (time * 0.72 + i / 14 + pipe * 0.13) % 1;
        const x = 0.794 + pipe*0.007 - age*0.075;
        const y = 0.754 - pipe*0.028 + age*0.045 + Math.sin(time*2+i)*age*0.006;
        const opacity = Math.sin(age*Math.PI) * 0.075 * amount;
        glow(x,y,0.0025+age*0.015,'194,177,155',opacity);
      }
    }
    c.restore();
  }

  function dust(amount) {
    c.save();
    // Warm roadside dust moves toward the viewer in the motorcycle's wake.
    for (let i = 0; i < 42; i++) {
      const age = (time*(0.22+random(i+530)*0.15)+random(i+540))%1;
      const x = 0.69 + (0.32+random(i+550)*0.4-0.69)*age*age;
      const y = 0.72 + age*age*0.34;
      const alpha = Math.sin(age*Math.PI)*0.55*amount;
      c.fillStyle = `rgba(255,209,151,${alpha})`;
      c.beginPath(); c.ellipse(X(x),Y(y),aw*(0.0004+age*0.0012),ah*0.0009,0,0,Math.PI*2); c.fill();
    }
    c.restore();
  }

  function sunRays(amount) {
    c.save(); c.beginPath(); c.rect(X(0),Y(0),aw*0.72,ah*0.68); c.clip();
    c.translate(X(0.277),Y(0.359)); c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 5; i++) {
      const angle = 0.15 + i*0.43 + Math.sin(time*0.18+i)*0.09;
      const length = aw*(0.21+random(i+620)*0.15);
      c.save(); c.rotate(angle);
      const beam = c.createLinearGradient(0,0,length,0);
      beam.addColorStop(0,`rgba(255,179,83,${(0.05+0.035*Math.sin(time*0.9+i))*amount})`);
      beam.addColorStop(1,'rgba(255,179,83,0)'); c.fillStyle=beam;
      c.beginPath(); c.moveTo(0,0); c.lineTo(length,-length*0.065); c.lineTo(length,length*0.065); c.closePath(); c.fill();
      c.restore();
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
    if (settings.sunRays) sunRays(amount);
    if (settings.birds) birds(amount);
    if (settings.exhaust) exhaust(amount);
    if (settings.dust) dust(amount);
    c.globalCompositeOperation = 'screen';
    if (settings.tailLight) glow(0.888,0.616,0.024,'255,34,8',(0.3 + Math.sin(time * 3.2) * 0.16) * amount);
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
