(() => {
  'use strict';
  const canvas = document.querySelector('canvas');
  const c = canvas.getContext('2d', { alpha: false });
  const artwork = new Image(), api = window.seeWallpaper;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(location.search), preview = params.has('preview');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const random = n => { const k = Math.sin(n * 127.1 + 311.7) * 43758.5453; return k - Math.floor(k); };
  const enabled = value => value !== false && value !== 'false';
  let settings = { speed: 1, petals: 1, haze: true, lights: true, stars: true, ...api?.getSettings?.() };
  const number = (key, fallback, a, b) => Number.isFinite(Number(settings[key])) ? clamp(Number(settings[key]), a, b) : fallback;
  let time = preview ? clamp(Number(params.get('preview')) || 0, 0, 86400) : 0;
  let paused = preview, ready = false, fps = 30, frame = 0, timer = 0, last = 0;
  let w = 1, h = 1, aw = 1, ah = 1, ox = 0, oy = 0;
  const X = x => ox + x * aw, Y = y => oy + y * ah;

  function resize() {
    // Bound the render surface on 4K/ultrawide desktops while retaining portrait detail.
    const ratio = Math.min(devicePixelRatio || 1, 1920 / Math.max(1, innerWidth), 1080 / Math.max(1, innerHeight));
    w = canvas.width = Math.max(1, Math.round(innerWidth * ratio));
    h = canvas.height = Math.max(1, Math.round(innerHeight * ratio));
    if (!ready) return;
    const scale = Math.max(w / artwork.width, h / artwork.height);
    aw = artwork.width * scale; ah = artwork.height * scale;
    ox = (w - aw) * .66; oy = (h - ah) * .5;
    draw();
  }

  function petals() {
    const count = Math.round(46 * number('petals', 1, 0, 2));
    for (let i = 0; i < count; i++) {
      // Three depths, lateral breeze, slow tumbling; no random allocation per frame.
      const depth = i % 3, cycle = (time * (.018 + random(i + 9) * .014) + random(i + 1)) % 1;
      const x = 1.1 - cycle * 1.3;
      const y = .08 + random(i + 42) * .85 + Math.sin(time * .7 + i) * .022;
      const r = aw * (.0013 + depth * .0011), angle = time * (.45 + random(i + 66)) + i;
      c.save(); c.translate(X(x), Y(y)); c.rotate(angle);
      c.scale(.25 + Math.abs(Math.sin(angle)) * .75, 1);
      c.globalAlpha = .45 + depth * .2;
      c.fillStyle = i % 4 === 0 ? '#f1d9bc' : '#b95277';
      c.strokeStyle = '#724355'; c.lineWidth = Math.max(.4, aw * .00035);
      c.beginPath(); c.moveTo(-r, 0);
      c.bezierCurveTo(-r * .5, -r * 1.25, r * .6, -r, r, 0);
      c.bezierCurveTo(r * .5, r, -r * .8, r * .75, -r, 0);
      c.fill(); c.stroke(); c.restore();
    }
  }

  function stars() {
    // Tiny painted glimmers in the distant sky; never cover the figure.
    c.save(); c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 25; i++) {
      const x = .04 + random(i + 500) * .44, y = .03 + random(i + 510) * .25;
      const pulse = Math.pow(.5 + .5 * Math.sin(time * .65 + i * 1.8), 4);
      const r = aw * (.0008 + random(i + 520) * .0005);
      c.globalAlpha = .12 + pulse * .55; c.fillStyle = '#ffe5bb';
      c.beginPath(); c.arc(X(x), Y(y), r, 0, Math.PI * 2); c.fill();
      if (i % 4 === 0) {
        c.strokeStyle = '#ffe5bb'; c.lineWidth = Math.max(.45, aw * .0003);
        c.beginPath(); c.moveTo(X(x) - r * 2, Y(y)); c.lineTo(X(x) + r * 2, Y(y));
        c.moveTo(X(x), Y(y) - r * 2); c.lineTo(X(x), Y(y) + r * 2); c.stroke();
      }
    }
    c.restore();
  }

  function haze() {
    // Soft ribbons over the distant city only; never deform the foreground art.
    c.save();
    c.beginPath(); c.rect(X(0), Y(.27), aw * .49, ah * .19); c.clip();
    for (let i = 0; i < 7; i++) {
      const x = .22 + Math.sin(time * .085 + i * 2.1) * .1;
      const y = .30 + i * .023, radius = aw * .13;
      c.save(); c.translate(X(x), Y(y)); c.scale(1, .11);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, radius);
      g.addColorStop(0, `rgba(215,174,211,${.11 + .035 * Math.sin(time * .25 + i)})`);
      g.addColorStop(1, 'rgba(215,174,211,0)');
      c.fillStyle = g; c.fillRect(-radius, -radius, radius * 2, radius * 2); c.restore();
    }
    c.restore();
  }

  function lights() {
    // Candle locations follow the shipped illustration, away from the character.
    const lanterns = [[.101,.838],[.14,.777],[.191,.815],[.395,.433],[.963,.50]];
    c.save(); c.globalCompositeOperation = 'screen';
    lanterns.forEach(([x, y], i) => {
      const r = aw * .02, pulse = .12 + .23 * (.5 + .5 * Math.sin(time * 1.3 + i * 1.9));
      const g = c.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), r);
      g.addColorStop(0, `rgba(235,139,77,${pulse})`); g.addColorStop(1, 'rgba(235,139,77,0)');
      c.fillStyle = g; c.fillRect(X(x) - r, Y(y) - r, r * 2, r * 2);
    }); c.restore();
  }

  function draw() {
    if (!ready) return;
    c.drawImage(artwork, ox, oy, aw, ah);
    if (reduced.matches || number('speed', 1, 0, 2) === 0) return;
    if (enabled(settings.haze)) haze();
    if (enabled(settings.lights)) lights();
    if (enabled(settings.stars)) stars();
    petals();
  }

  function stop() { clearTimeout(timer); cancelAnimationFrame(frame); last = 0; }
  function animate(now) {
    if (paused || document.hidden || reduced.matches || number('speed', 1, 0, 2) === 0) { stop(); return; }
    if (last) time += Math.min(.1, (now - last) / 1000) * number('speed', 1, 0, 2);
    last = now; draw();
    timer = setTimeout(() => { frame = requestAnimationFrame(animate); }, Math.max(0, 1000 / fps - 4));
  }
  function start() {
    stop();
    if (ready && !paused && !document.hidden && !reduced.matches && number('speed', 1, 0, 2) > 0) frame = requestAnimationFrame(animate);
  }
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', start);
  reduced.addEventListener?.('change', () => { draw(); start(); });
  api?.onSettingsChanged(value => { settings = { ...settings, ...value }; draw(); start(); });
  api?.onPause(() => { paused = true; stop(); });
  api?.onResume(() => { paused = false; start(); });
  api?.onPerformanceChanged(value => { fps = clamp(Number(value) || 30, 1, 60); start(); });
  artwork.onload = () => { ready = true; resize(); canvas.dataset.ready = 'true'; start(); };
  artwork.onerror = () => { stop(); console.error('Satin Afterglow artwork could not be loaded'); };
  artwork.src = 'artwork.jpg'; resize();
})();
