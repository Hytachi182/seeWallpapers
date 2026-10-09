/* Local WebGL artwork; no network, textures or external dependencies. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas');
  const options = JSON.parse(document.getElementById('defaults').textContent);
  let settings = { ...options, ...window.seeWallpaper?.getSettings?.() };
  let gl, program, uniforms, buffer, timer, frame, last = 0, time = 0, paused = false, lost = false;
  const motionQuery=matchMedia('(prefers-reduced-motion: reduce)');let reducedMotion=motionQuery.matches;
  let fps = reducedMotion ? 15 : 30;
  const vertex = `attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
  function compile(type, source) {
    const shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
    return shader;
  }
  function initialize() {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
    if (!gl) { document.getElementById('fallback').hidden = false; return false; }
    const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, document.getElementById('fragment').textContent);
    program = gl.createProgram(); gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
    gl.deleteShader(vs); gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program); buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position'); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    uniforms = Object.fromEntries(['resolution', 'time', 'accent', 'intensity'].map(id => [id, gl.getUniformLocation(program, id)]));
    resize(); document.getElementById('fallback').hidden = true; return true;
  }
  function resize() {
    // Cap total fragments for multi-monitor desktops and battery-friendly profiles.
    const ratio = Math.min(devicePixelRatio || 1, fps <= 15 ? 0.75 : 1, Math.sqrt(2073600 / (innerWidth * innerHeight)));
    canvas.width = Math.round(innerWidth * ratio); canvas.height = Math.round(innerHeight * ratio);
    if (gl && !lost) gl.viewport(0, 0, canvas.width, canvas.height);
  }
  function draw() {
    if (!program || lost) return;
    const hex = /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : options.color;
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height); gl.uniform1f(uniforms.time, time);
    gl.uniform3f(uniforms.accent, parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
    gl.uniform1f(uniforms.intensity, Number(settings.intensity) || 1); gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  function stop() { clearTimeout(timer); cancelAnimationFrame(frame); last = 0; }
  function animate(timestamp) {
    if (paused || lost || document.hidden || reducedMotion || Number(settings.speed)===0) { stop(); return; }
    if (last) time += Math.min(0.2, (timestamp - last) / 1000) * settings.speed;
    last = timestamp;
    const begin = performance.now(); draw();
    timer = setTimeout(() => { frame = requestAnimationFrame(animate); }, Math.max(0, 1000 / fps - (performance.now() - begin) - 4));
  }
  function start() { stop(); if (!paused && !lost && !document.hidden && !reducedMotion && Number(settings.speed)>0 && program) frame = requestAnimationFrame(animate); }
  addEventListener('resize', () => { resize(); draw(); });
  document.addEventListener('visibilitychange', start);
  canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); lost = true; stop(); document.getElementById('fallback').hidden = false; });
  canvas.addEventListener('webglcontextrestored', () => { lost = false; if (initialize()) { draw(); start(); } });
  window.seeWallpaper?.onSettingsChanged(value => { settings = { ...settings, ...value }; draw(); start(); });
  window.seeWallpaper?.onPause(() => { paused = true; stop(); });
  window.seeWallpaper?.onResume(() => { paused = false; start(); });
  window.seeWallpaper?.onPerformanceChanged(value => { fps = Math.max(1, Math.min(reducedMotion ? 15 : 60, Number(value) || 30)); resize(); draw(); start(); });
  motionQuery.addEventListener?.('change',()=>{reducedMotion=motionQuery.matches;draw();start();});
  const preview = new URLSearchParams(location.search).get('preview');
  if (preview !== null) { paused = true; time = (Number(preview) || 12) * settings.speed; }
  try { if (initialize()) { draw(); start(); } }
  catch (error) { document.getElementById('fallback').hidden = false; console.error('Unable to render wallpaper:', error); }
})();
