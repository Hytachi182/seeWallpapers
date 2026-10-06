/* Original offline rain-on-glass simulation and height-field refraction renderer. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), fallback = document.getElementById('fallback');
  const defaults = JSON.parse(document.getElementById('defaults').textContent), api = window.seeWallpaper;
  let settings = { ...defaults, ...api?.getSettings?.() };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const number = (v, fallbackValue, min, max) => clamp(Number.isFinite(Number(v)) ? Number(v) : fallbackValue, min, max);
  const on = v => v !== false && v !== 'false' && v !== 0;
  const preview = new URLSearchParams(location.search).get('preview');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seed = preview !== null ? 721931 : Date.now() >>> 0;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  let width = 960, height = 540, drops = [], beads = [], time = 0, spawn = 0, nextId = 0;
  const totals = { spawned: 0, merged: 0, drained: 0, trails: 0 };
  let gl, program, waterTexture, photoTexture, blurTexture, uniforms, ready = false, lost = false, failed = false, cachedBlur = -1;
  let paused = reduced || preview !== null, fps = reduced ? 15 : 30, timer = 0, frame = 0, last = 0, accumulator = 0;
  const waterMap = document.createElement('canvas'), waterCtx = waterMap.getContext('2d');
  const trails = document.createElement('canvas'), trailCtx = trails.getContext('2d');
  const blurredPhoto = document.createElement('canvas'), blurCtx = blurredPhoto.getContext('2d');
  const stamp = document.createElement('canvas'); stamp.width = stamp.height = 96;
  const stampCtx = stamp.getContext('2d'), dome = stampCtx.createRadialGradient(48, 48, 0, 48, 48, 46);
  dome.addColorStop(0, '#ffffff'); dome.addColorStop(.35, '#ebebeb'); dome.addColorStop(.65, '#b4b4b4'); dome.addColorStop(.85, '#6b6b6b'); dome.addColorStop(.98, '#222222'); dome.addColorStop(1, '#00000000');
  stampCtx.fillStyle = dome; stampCtx.fillRect(0, 0, 96, 96);
  const photo = new Image();

  function makeDrop(x = random() * width, y = random() * height, radius = .8 + Math.pow(random(), 2) * 4.8) {
    return { id: nextId++, x, y, r: radius, v: 0, phase: random() * Math.PI * 2, stick: 3.1 + random() * 1.8, dead: false };
  }
  function setup() {
    drops = Array.from({ length: Math.round(width * height / 2000) }, () => makeDrop());
    beads = Array.from({ length: Math.min(1200, Math.round(width * height / 650)) }, () => ({ x: random() * width, y: random() * height, r: .35 + random() * .55 }));
    // A few coalesced drops make the first frame feel already wet.
    for (let i = 0; i < 12; i++) drops.push(makeDrop(random() * width, random() * height, 4.5 + random() * 3));
  }
  function dimensions() {
    const aspect = Math.max(.15, innerWidth / Math.max(1, innerHeight));
    const area = 960 * 540;
    return [Math.round(Math.sqrt(area * aspect)), Math.round(Math.sqrt(area / aspect))];
  }
  function resize() {
    const [w, h] = dimensions(), sx = w / width, sy = h / height;
    for (const d of drops) { d.x *= sx; d.y *= sy; }
    for (const b of beads) { b.x *= sx; b.y *= sy; }
    // Preserve trails across display/quality resizing instead of clearing the wet glass.
    const old = document.createElement('canvas'); old.width = trails.width; old.height = trails.height;
    if (old.width && old.height) old.getContext('2d').drawImage(trails, 0, 0);
    width = w; height = h; waterMap.width = trails.width = width; waterMap.height = trails.height = height;
    if (old.width && old.height) trailCtx.drawImage(old, 0, 0, width, height);
    const budget = fps <= 15 ? 921600 : 2073600;
    const ratio = Math.min(devicePixelRatio || 1, 1, Math.sqrt(budget / Math.max(1, innerWidth * innerHeight)));
    canvas.width = Math.max(1, Math.round(innerWidth * ratio)); canvas.height = Math.max(1, Math.round(innerHeight * ratio));
    if (gl && !lost) gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function merge(a, b) {
    const va = a.r ** 3, vb = b.r ** 3, total = va + vb;
    a.x = (a.x * va + b.x * vb) / total; a.y = (a.y * va + b.y * vb) / total;
    a.r = Math.cbrt(total); a.v = Math.max(a.v, b.v); a.stick = Math.min(a.stick, b.stick);
    b.dead = true; totals.merged++;
  }
  function update(dt) {
    time += dt;
    trailCtx.globalCompositeOperation = 'destination-out'; trailCtx.fillStyle = `rgba(0,0,0,${1 - Math.exp(-dt * .085)})`; trailCtx.fillRect(0, 0, width, height); trailCtx.globalCompositeOperation = 'source-over';
    const rain = number(settings.rain, 1, 0, 2);
    spawn += dt * 28 * rain;
    while (spawn >= 1) { spawn--; if (drops.length < 420) { drops.push(makeDrop()); totals.spawned++; } }
    const grid = new Map(), cell = 32;
    for (const d of drops) {
      if (d.dead) continue;
      const oldX = d.x, oldY = d.y;
      if (d.r > d.stick) {
        // Adhesion competes with weight, giving intermittent slow slips and faster heavy runs.
        const slip = .65 + .35 * Math.sin(time * 1.8 + d.phase);
        d.v += ((d.r - d.stick) * 29 * slip - d.v * .75) * dt; d.v = clamp(d.v, 0, 160);
        d.x += Math.sin(d.y * .038 + d.phase) * Math.min(8, d.v * .075) * dt; d.y += d.v * dt;
        if (on(settings.trails) && d.v > 2) {
          trailCtx.strokeStyle = 'rgba(200,200,200,.17)'; trailCtx.lineWidth = Math.max(.7, d.r * .35); trailCtx.lineCap = 'round'; trailCtx.beginPath(); trailCtx.moveTo(oldX, oldY); trailCtx.lineTo(d.x, d.y); trailCtx.stroke(); totals.trails++;
        }
      }
      if (d.y > height + d.r * 3 || d.x < -20 || d.x > width + 20) { d.dead = true; totals.drained++; continue; }
      const gx = Math.floor(d.x / cell), gy = Math.floor(d.y / cell);
      for (let yy = gy - 1; yy <= gy + 1 && !d.dead; yy++) for (let xx = gx - 1; xx <= gx + 1 && !d.dead; xx++) for (const other of grid.get(`${xx},${yy}`) || []) {
        if (other.dead) continue;
        if (Math.hypot(d.x - other.x, d.y - other.y) < (d.r + other.r) * .72) { if (other.r > d.r) merge(other, d); else merge(d, other); }
      }
      if (!d.dead) { const key = `${Math.floor(d.x / cell)},${Math.floor(d.y / cell)}`; const bucket = grid.get(key) || []; bucket.push(d); grid.set(key, bucket); }
    }
    drops = drops.filter(d => !d.dead);
  }
  function heightField() {
    waterCtx.globalCompositeOperation = 'source-over'; waterCtx.fillStyle = '#000'; waterCtx.fillRect(0, 0, width, height);
    if (on(settings.trails)) { waterCtx.globalAlpha = .18; waterCtx.drawImage(trails, 0, 0); waterCtx.globalAlpha = 1; }
    waterCtx.globalCompositeOperation = 'lighter';
    for (const b of beads) { waterCtx.globalAlpha = .7; waterCtx.drawImage(stamp, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2); }
    waterCtx.globalAlpha = 1;
    for (const d of drops) {
      const stretch = 1 + Math.min(.48, d.v * .003), rx = d.r * .94, ry = d.r * stretch;
      waterCtx.drawImage(stamp, d.x - rx, d.y - ry, rx * 2, ry * 2);
    }
    waterCtx.globalCompositeOperation = 'source-over';
  }
  function compile(type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const message = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(message); }
    return shader;
  }
  function texture(unit) {
    const tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }
  function initialize() {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) { showFallback('Enable graphics acceleration to animate the water on this glass.'); return false; }
    const vs = compile(gl.VERTEX_SHADER, 'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}');
    const fs = compile(gl.FRAGMENT_SHADER, document.getElementById('fragment').textContent);
    program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    uniforms = Object.fromEntries(['backdrop', 'blurredBackdrop', 'water', 'resolution', 'waterSize', 'imageSize', 'softness', 'refraction', 'tint'].map(name => [name, gl.getUniformLocation(program, name)]));
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    photoTexture = texture(0); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, photo);
    waterTexture = texture(1); blurTexture = texture(2); cachedBlur = -1;
    gl.uniform1i(uniforms.backdrop, 0); gl.uniform1i(uniforms.water, 1); gl.uniform1i(uniforms.blurredBackdrop, 2);
    fallback.hidden = true; return true;
  }
  function draw() {
    if (!ready || lost || failed) return;
    const blur = number(settings.blur, 4, 0, 10);
    if (blur !== cachedBlur) {
      blurredPhoto.width = photo.naturalWidth; blurredPhoto.height = photo.naturalHeight;
      blurCtx.filter = `blur(${blur * 3}px)`;
      const pad = blur * 8;
      blurCtx.drawImage(photo, -pad, -pad, photo.naturalWidth + pad * 2, photo.naturalHeight + pad * 2);
      gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, blurTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, blurredPhoto); cachedBlur = blur;
    }
    heightField(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, waterTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, waterMap);
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height); gl.uniform2f(uniforms.waterSize, width, height); gl.uniform2f(uniforms.imageSize, photo.naturalWidth, photo.naturalHeight);
    gl.uniform1f(uniforms.softness, number(settings.blur, 4, 0, 10)); gl.uniform1f(uniforms.refraction, number(settings.refraction, 1, .3, 2));
    const hex = /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : defaults.color;
    gl.uniform3f(uniforms.tint, parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function stop() { clearTimeout(timer); cancelAnimationFrame(frame); last = 0; accumulator = 0; }
  function animate(now) {
    if (paused || lost || failed || document.hidden || !ready) { stop(); return; }
    const startTime = performance.now(), dt = last ? Math.min(.15, (now - last) / 1000) : 0; last = now;
    accumulator += dt * number(settings.speed, 1, .2, 2);
    while (accumulator >= 1 / 60) { update(1 / 60); accumulator -= 1 / 60; }
    draw(); timer = setTimeout(() => { frame = requestAnimationFrame(animate); }, Math.max(0, 1000 / fps - (performance.now() - startTime) - 3));
  }
  function start() { stop(); if (!paused && !lost && !failed && !document.hidden && ready) frame = requestAnimationFrame(animate); }
  function showFallback(message) { failed = true; ready = false; stop(); document.getElementById('error').textContent = message; fallback.hidden = false; }
  addEventListener('resize', () => { resize(); draw(); }); document.addEventListener('visibilitychange', start);
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; stop(); fallback.hidden = false; });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; failed = false; try { ready = initialize(); resize(); draw(); start(); } catch (error) { showFallback('Unable to restore the water renderer. Reapply this wallpaper to retry.'); console.error(error); } });
  api?.onPause(() => { paused = true; stop(); }); api?.onResume(() => { paused = false; start(); });
  api?.onPerformanceChanged(v => { fps = number(v, 30, 1, reduced ? 15 : 60); resize(); draw(); start(); });
  api?.onSettingsChanged(v => { settings = { ...settings, ...v }; draw(); });
  resize(); setup();
  if (preview !== null || reduced) { const target = number(preview ?? 12, 12, 0, 120); for (let i = 0; i < target * 60; i++) update(1 / 60); }
  photo.onload = () => { try { ready = initialize(); draw(); start(); } catch (error) { showFallback('Unable to render water on this device. Reapply this wallpaper to retry.'); console.error(error); } };
  photo.onerror = () => showFallback('The scene photograph could not be loaded. Reinstall this wallpaper to restore it.');
  // Data URL avoids Chromium file:// texture taint in the desktop host and standalone previews.
  photo.src = window.rainGlassPhoto || 'background.jpg';
})();
