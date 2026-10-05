/* Original offline WebGL particle renderer, inspired by prisoner849's
   https://codepen.io/prisoner849/pen/RwyzrVj. No third-party runtime. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas');
  const fallback = document.getElementById('fallback');
  const defaults = { color: '#6432ff', speed: 1, intensity: 1 };
  let settings = { ...defaults, ...window.seeWallpaper?.getSettings?.() };
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let gl, program, uniforms, frame, timer, last = 0, time = 0;
  let paused = false, lost = false, fps = reducedMotion ? 15 : 30;
  const count = 150000;
  // Interleave shell and disk particles so lower frame-rate profiles retain both.
  const particles = new Float32Array(count * 8);
  let seed = 849;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  for (let i = 0; i < count; i++) {
    const offset = i * 8, angle = random() * Math.PI * 2;
    if (i % 3 === 0) {
      const height = random() * 2 - 1, radius = 9.5 + random() * 0.5;
      const equator = Math.sqrt(1 - height * height);
      particles[offset] = Math.cos(angle) * equator * radius;
      particles[offset + 1] = height * radius;
      particles[offset + 2] = Math.sin(angle) * equator * radius;
    } else {
      const radius = Math.sqrt(100 + 1500 * Math.pow(random(), 1.5));
      particles[offset] = Math.cos(angle) * radius;
      particles[offset + 1] = random() * 2 - 1;
      particles[offset + 2] = Math.sin(angle) * radius;
    }
    particles[offset + 3] = 0.5 + random() * 1.5;
    particles[offset + 4] = random() * Math.PI * 2;
    particles[offset + 5] = random() * Math.PI * 2;
    particles[offset + 6] = 0.016 + random() * 0.14;
    particles[offset + 7] = 0.1 + random() * 0.9;
  }
  const vertex = `
    precision highp float;
    attribute vec3 position;
    attribute float size;
    attribute vec4 drift;
    uniform float time, aspect, pixels, pointScale, pointLimit;
    uniform vec3 accent;
    varying vec3 tint;
    void main() {
      float distanceMix = clamp(length(position / vec3(40.0, 10.0, 40.0)), 0.0, 1.0);
      tint = mix(vec3(0.89, 0.608, 0.0), accent, distanceMix);
      float a = drift.x + time * drift.z, b = drift.y + time * drift.z;
      vec3 p = position + drift.w * vec3(sin(a)*cos(b), cos(a), sin(a)*sin(b));
      float turn = time * 0.025, c = cos(turn), s = sin(turn);
      p.xz = mat2(c, s, -s, c) * p.xz;
      float tilt = 0.2;
      p.xy = mat2(cos(tilt), sin(tilt), -sin(tilt), cos(tilt)) * p.xy;
      // Look from (0, 4, 21) toward the origin, with a 60-degree lens.
      float elevation = 0.188222;
      p.yz = mat2(cos(elevation), sin(elevation), -sin(elevation), cos(elevation)) * p.yz;
      float depth = 21.37756 - p.z;
      gl_Position = vec4(p.x * 1.73205 / aspect, p.y * 1.73205,
        1.002002 * depth - 2.002002, depth);
      gl_PointSize = clamp(size * pixels * 0.0625 / max(depth, 1.0) * pointScale, 1.0, pointLimit);
    }
  `;
  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  function initialize() {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) { fallback.hidden = false; return false; }
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, document.getElementById('fragment').textContent);
    program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, particles, gl.STATIC_DRAW);
    for (const [name, components, offset] of [['position', 3, 0], ['size', 1, 3], ['drift', 4, 4]]) {
      const index = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(index); gl.vertexAttribPointer(index, components, gl.FLOAT, false, 32, offset * 4);
    }
    uniforms = Object.fromEntries(['time', 'aspect', 'pixels', 'accent', 'intensity', 'pointScale', 'pointLimit']
      .map(name => [name, gl.getUniformLocation(program, name)]));
    gl.uniform1f(uniforms.pointLimit, gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1]);
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE); gl.disable(gl.DEPTH_TEST);
    gl.clearColor(22 / 255, 0, 22 / 255, 1);
    resize(); fallback.hidden = true; return true;
  }
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, fps <= 15 ? 0.75 : 1,
      Math.sqrt(2073600 / Math.max(1, innerWidth * innerHeight)));
    canvas.width = Math.max(1, Math.round(innerWidth * ratio));
    canvas.height = Math.max(1, Math.round(innerHeight * ratio));
    if (gl && !lost) gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function bounded(value, low, high, backup) {
    return Number.isFinite(Number(value)) ? Math.max(low, Math.min(high, Number(value))) : backup;
  }
  function draw() {
    if (!program || lost) return;
    const hex = /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : defaults.color;
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(uniforms.time, time);
    gl.uniform1f(uniforms.aspect, canvas.width / canvas.height);
    gl.uniform1f(uniforms.pixels, canvas.height);
    gl.uniform3f(uniforms.accent, ...[1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255));
    gl.uniform1f(uniforms.intensity, bounded(settings.intensity, 0.3, 2, 1));
    // Preserve brightness when reducing particle count on economical profiles.
    gl.uniform1f(uniforms.pointScale, fps <= 15 ? Math.sqrt(2) : 1);
    gl.drawArrays(gl.POINTS, 0, fps <= 15 ? count / 2 : count);
  }
  function stop() { clearTimeout(timer); cancelAnimationFrame(frame); last = 0; }
  function animate(timestamp) {
    if (paused || lost || document.hidden) { stop(); return; }
    if (last) time += Math.min(0.2, (timestamp - last) / 1000) * bounded(settings.speed, 0.1, 2, 1);
    last = timestamp;
    const begin = performance.now(); draw();
    timer = setTimeout(() => { frame = requestAnimationFrame(animate); },
      Math.max(0, 1000 / fps - (performance.now() - begin) - 4));
  }
  function start() {
    stop(); if (!paused && !lost && !document.hidden && program) frame = requestAnimationFrame(animate);
  }
  addEventListener('resize', () => { resize(); draw(); });
  document.addEventListener('visibilitychange', start);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; stop(); fallback.hidden = false;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
    try { if (initialize()) { draw(); start(); } }
    catch (error) { fallback.hidden = false; console.error('Unable to restore Stellar Drift:', error); }
  });
  window.seeWallpaper?.onSettingsChanged(value => { settings = { ...settings, ...value }; draw(); });
  window.seeWallpaper?.onPause(() => { paused = true; stop(); });
  window.seeWallpaper?.onResume(() => { paused = false; start(); });
  window.seeWallpaper?.onPerformanceChanged(value => {
    fps = bounded(value, 1, reducedMotion ? 15 : 60, 30); resize(); draw(); start();
  });
  const preview = new URLSearchParams(location.search).get('preview');
  if (preview !== null) { paused = true; time = (Number(preview) || 12) * bounded(settings.speed, 0.1, 2, 1); }
  try { if (initialize()) { draw(); start(); } }
  catch (error) { fallback.hidden = false; console.error('Unable to render Stellar Drift:', error); }
})();
