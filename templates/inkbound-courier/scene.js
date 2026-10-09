(() => {
  'use strict';
  const canvas = document.querySelector('canvas');
  const c = canvas.getContext('2d', { alpha: false });
  const artwork = new Image(), api = window.seeWallpaper, motion = window.seeLivingMotion;
  const geometry = () => ({aw,ah,ox,oy});
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(location.search), preview = params.has('preview');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const random = n => { const k = Math.sin(n * 127.1 + 311.7) * 43758.5453; return k - Math.floor(k); };
  const enabled = value => value !== false && value !== 'false';
  let settings = { speed: 1, petals: 1, water: true, mist: true, lights: true, wind: true, ...api?.getSettings?.() };
  const number = (key, fallback, a, b) => Number.isFinite(Number(settings[key])) ? clamp(Number(settings[key]), a, b) : fallback;
  let time = preview ? clamp(Number(params.get('preview')) || 0, 0, 86400) : 0;
  let paused = preview, ready = false, fps = 30;
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
    ox = (w - aw) * .65; oy = (h - ah) * .5;
    draw();
  }

  function petals() { motion.petals(c,geometry(),time,number('petals',1,0,2),'#a94035'); }

  function wind() { motion.birds(c,geometry(),time*1.5,'rgba(34,39,48,.85)'); }
  function harbor() { motion.water(c,geometry(),artwork,time,[[0,.526],[.33,.512],[.39,.532],[.31,.582],[.05,.595],[0,.58]],{strength:2.4,light:'#e4d3aa'}); }

  function mist() {
    // Soft ribbons over the distant harbor only; never deform the foreground art.
    c.save();
    c.beginPath(); c.rect(X(0), Y(.44), aw * .49, ah * .27); c.clip();
    for (let i = 0; i < 7; i++) {
      const x = .22 + Math.sin(time * .27 + i * 2.1) * .14;
      const y = .5 + i * .024, radius = aw * .13;
      c.save(); c.translate(X(x), Y(y)); c.scale(1, .18);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, radius);
      g.addColorStop(0, `rgba(241,233,214,${.17 + .06 * Math.sin(time * .55 + i)})`);
      g.addColorStop(1, 'rgba(241,233,214,0)');
      c.fillStyle = g; c.fillRect(-radius, -radius, radius * 2, radius * 2); c.restore();
    }
    c.restore();
  }

  function lights() {
    // Actual window positions are aligned to the shipped illustration.
    const windows = [[.405,.804],[.446,.797],[.482,.726],[.554,.423],[.532,.443],[.495,.735]];
    c.save(); c.globalCompositeOperation = 'screen';
    windows.forEach(([x, y], i) => {
      const r = aw * .006, pulse = .10 + .16 * (.5 + .5 * Math.sin(time * .8 + i * 1.9));
      const g = c.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), r);
      g.addColorStop(0, `rgba(235,139,77,${pulse})`); g.addColorStop(1, 'rgba(235,139,77,0)');
      c.fillStyle = g; c.fillRect(X(x) - r, Y(y) - r, r * 2, r * 2);
    }); c.restore();
  }

  function draw() {
    if (!ready) return;
    c.drawImage(artwork, ox, oy, aw, ah);
    if (reduced.matches || number('speed', 1, 0, 2) === 0) return;
    if (enabled(settings.water)) harbor();
    if (enabled(settings.mist)) mist();
    if (enabled(settings.lights)) lights();
    if (enabled(settings.wind)) wind();
    petals();
  }

  const animation = motion.clock({active:()=>ready&&!paused&&!document.hidden&&!reduced.matches&&number('speed',1,0,2)>0,speed:()=>number('speed',1,0,2),fps:()=>fps,update:delta=>{time+=delta;draw();}});
  const stop = () => animation.stop(), start = () => animation.start();
  addEventListener('resize', resize);
  document.addEventListener('visibilitychange', start);
  reduced.addEventListener?.('change', () => { draw(); start(); });
  api?.onSettingsChanged(value => { settings = { ...settings, ...value }; draw(); start(); });
  api?.onPause(() => { paused = true; stop(); });
  api?.onResume(() => { paused = false; start(); });
  api?.onPerformanceChanged(value => { fps = clamp(Number(value) || 30, 1, 60); start(); });
  artwork.onload = () => { ready = true; resize(); canvas.dataset.ready = 'true'; start(); };
  artwork.onerror = () => { stop(); console.error('Inkbound Courier artwork could not be loaded'); };
  artwork.src = 'artwork.jpg'; resize();
})();
