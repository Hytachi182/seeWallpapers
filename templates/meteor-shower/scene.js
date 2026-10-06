/* Original offline photographic meteor shower; all moving lights are procedural. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  const defaults = JSON.parse(document.getElementById('defaults').textContent), api = window.seeWallpaper;
  let settings = { ...defaults, ...api?.getSettings?.() };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const num = (v, d, a, b) => clamp(Number.isFinite(Number(v)) ? Number(v) : d, a, b);
  const on = v => v !== false && v !== 'false' && v !== 0;
  const preview = new URLSearchParams(location.search).get('preview'), reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seed = preview !== null ? 847291 : Date.now() >>> 0;
  function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
  let w = 1920, h = 1080, ratio = 1, time = 0, meteors = [], trains = [], spawnIn = .2, fireballIn = 5.5;
  let paused = reduced || preview !== null, ready = false, failed = false, fps = reduced ? 15 : 30, last = 0, timer = 0, frame = 0, accumulator = 0;
  const stats = { spawned: 0, finished: 0, fireballs: 0 };
  const photo = new Image(), scintillation = Array.from({ length: 115 }, () => ({ x: random(), y: random() * .76, r: .35 + random() * .6, phase: random() * Math.PI * 2, rate: .3 + random() * 1.2 }));
  function tint(alpha) { const hex = /^#[\da-f]{6}$/i.test(settings.color) ? settings.color : defaults.color; return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${clamp(alpha,0,1)})`; }
  function meteor(bright = false) {
    // A shared radiant gives the shower consistent perspective rather than random laser lines.
    const x = .18 + random() * .70, y = .025 + random() * .47, radiant = { x: -.35, y: -.65 };
    const dx = x - radiant.x, dy = y - radiant.y, len = Math.hypot(dx, dy);
    const velocity = .20 + random() * .18;
    return { x, y, startX: x, startY: y, vx: dx / len * velocity, vy: dy / len * velocity, age: 0, duration: bright ? 1.25 : .5 + random() * .7, length: bright ? .20 : .055 + random() * .11, strength: bright ? 1.6 : .45 + random() * .65, bright, phase: random() * 6.28, points: [{ x, y }] };
  }
  function launch(bright = false) { if (meteors.length >= 18) return; meteors.push(meteor(bright)); stats.spawned++; if (bright) stats.fireballs++; }
  function update(dt) {
    time += dt; spawnIn -= dt; fireballIn -= dt;
    const density = num(settings.density, 1, .2, 3);
    if (spawnIn <= 0) { launch(); spawnIn += (.45 + random() * 1.05) / density; }
    if (fireballIn <= 0) { launch(true); fireballIn += (22 + random() * 22) / Math.sqrt(density); }
    for (const m of meteors) {
      m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt;
      m.points.push({ x: m.x, y: m.y }); if (m.points.length > 75) m.points.shift();
      if (m.age >= m.duration || m.y > .81 || m.x > 1.16) {
        m.dead = true; stats.finished++;
        if (trains.length < 48) trains.push({ x: m.x, y: m.y, vx: m.vx, vy: m.vy, length: Math.min(m.length, Math.hypot(m.x - m.startX, m.y - m.startY)), age: 0, duration: m.bright ? 3.8 : 1.4, bright: m.bright, phase: m.phase });
      }
    }
    meteors = meteors.filter(m => !m.dead);
    for (const t of trains) t.age += dt;
    trains = trains.filter(t => t.age < t.duration);
  }
  function resize() {
    w = Math.max(1, innerWidth); h = Math.max(1, innerHeight);
    ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt((fps <= 15 ? 921600 : 2073600) / (w * h)));
    canvas.width = Math.max(1, Math.round(w * ratio)); canvas.height = Math.max(1, Math.round(h * ratio));
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function glow(x, y, radius, strength, warm = false) {
    const g = c.createRadialGradient(x,y,0,x,y,radius); g.addColorStop(0, warm ? `rgba(255,233,196,${strength})` : tint(strength)); g.addColorStop(.15, tint(strength*.25)); g.addColorStop(1, tint(0)); c.fillStyle = g; c.beginPath(); c.arc(x,y,radius,0,Math.PI*2); c.fill();
  }
  function stroke(x,y,xx,yy,width,color) { c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.beginPath(); c.moveTo(x,y); c.lineTo(xx,yy); c.stroke(); }
  function drawMeteor(m) {
    const scale = Math.min(w,h), velocity = Math.hypot(m.vx,m.vy), ux = m.vx/velocity, uy = m.vy/velocity;
    const x = m.x*w, y = m.y*h, available = Math.hypot((m.x-m.startX)*w,(m.y-m.startY)*h);
    const len = Math.min(m.length*scale,available), fadeIn = clamp(m.age/.06,0,1), fadeOut = clamp((m.duration-m.age)/.18,0,1), horizonFade = clamp((.81-m.y)/.055,0,1);
    const alpha = fadeIn*fadeOut*horizonFade*num(settings.intensity,1,.3,2)*m.strength;
    // Transform the unit vector to the display's aspect ratio so the head and tail align exactly.
    const pixelLength = Math.hypot(ux*w,uy*h), px = ux*w/pixelLength, py = uy*h/pixelLength;
    const tx = x-px*len, ty = y-py*len;
    const g = c.createLinearGradient(tx,ty,x,y); g.addColorStop(0,tint(0)); g.addColorStop(.35,tint(alpha*.05)); g.addColorStop(.8,tint(alpha*.45)); g.addColorStop(1,tint(alpha*.95));
    const core = Math.max(.45,scale/1080*(m.bright?1.6:.72));
    // A tapered luminous train with a restrained bloom surrounding the subpixel core.
    stroke(tx,ty,x,y,core*5,tint(alpha*.025));
    c.strokeStyle = g; c.lineWidth = core; c.beginPath(); c.moveTo(tx,ty); c.lineTo(x,y); c.stroke();
    stroke(x-px*Math.min(11,len*.13),y-py*Math.min(11,len*.13),x,y,core*.55,`rgba(255,253,244,${clamp(alpha*.95,0,1)})`);
    glow(x,y,Math.max(3,scale/1080*(m.bright?18:8)),Math.min(.48,alpha*.28),m.bright);
    if (m.bright) {
      const pulse = 1+.10*Math.sin(m.age*39+m.phase);
      glow(x,y,Math.max(2,scale/1080*4),Math.min(.9,alpha*.55)*pulse,true);
      for(let i=1;i<=3;i++) { const offset = i*7*scale/1080; glow(x-px*offset-py*i*.9,y-py*offset+px*i*.9,Math.max(1,scale/1080*2),alpha*.11/i,true); }
    }
  }
  function draw() {
    if (!ready || failed) return;
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    const cover = Math.max(w/photo.naturalWidth,h/photo.naturalHeight), aw = photo.naturalWidth*cover, ah = photo.naturalHeight*cover;
    const ox = (w-aw)/2, oy = (h-ah)/2; c.drawImage(photo,ox,oy,aw,ah);
    const horizon = Math.min(h*.84,oy+ah*.82);
    c.save(); c.beginPath(); c.rect(0,0,w,Math.max(0,horizon)); c.clip(); c.globalCompositeOperation = 'screen';
    if (on(settings.twinkle)) for (const s of scintillation) {
      const x = s.x*w, y = s.y*h, opacity = .13+.10*Math.sin(time*s.rate+s.phase);
      c.fillStyle = tint(opacity); c.beginPath(); c.arc(x,y,Math.max(.4,s.r*Math.min(w,h)/1080),0,Math.PI*2); c.fill();
      if(s.r>.86) glow(x,y,3*Math.min(w,h)/1080,opacity*.25);
    }
    if (on(settings.trains)) for (const t of trains) {
      const speed = Math.hypot(t.vx*w,t.vy*h), px=t.vx*w/speed,py=t.vy*h/speed,len=t.length*Math.min(w,h);
      const drift = Math.sin(t.phase+t.age*.45)*t.age*1.2, x=t.x*w+drift,y=t.y*h;
      const alpha = (1-t.age/t.duration)**2*(t.bright?.13:.035)*num(settings.intensity,1,.3,2);
      const g=c.createLinearGradient(x-px*len,y-py*len,x,y);g.addColorStop(0,tint(0));g.addColorStop(.45,tint(alpha));g.addColorStop(1,tint(alpha*.3));
      stroke(x-px*len,y-py*len,x,y,Math.max(.6,Math.min(w,h)/1080*(t.bright?1.5:.7)),g);
    }
    for (const m of meteors) drawMeteor(m);
    c.restore();
  }
  function stop() { clearTimeout(timer); cancelAnimationFrame(frame); last=0; accumulator=0; }
  function animate(now) {
    if(paused||!ready||failed||document.hidden){stop();return;}
    const began=performance.now(),dt=last?Math.min(.15,(now-last)/1000):0;last=now;accumulator+=dt*num(settings.speed,1,.3,2);
    while(accumulator>=1/120){update(1/120);accumulator-=1/120;}draw();timer=setTimeout(()=>{frame=requestAnimationFrame(animate);},Math.max(0,1000/fps-(performance.now()-began)-3));
  }
  function start(){stop();if(!paused&&ready&&!failed&&!document.hidden)frame=requestAnimationFrame(animate);}
  addEventListener('resize',()=>{resize();draw();});document.addEventListener('visibilitychange',start);
  api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});
  api?.onPerformanceChanged(v=>{fps=num(v,30,1,reduced?15:60);resize();draw();start();});
  api?.onSettingsChanged(v=>{settings={...settings,...v};draw();});
  resize();
  if(preview!==null||reduced){const target=num(preview??12,12,0,120);for(let i=0;i<target*120;i++)update(1/120);}
  photo.onload=()=>{ready=true;document.getElementById('fallback').hidden=true;draw();start();};
  photo.onerror=()=>{failed=true;stop();document.getElementById('fallback').hidden=false;document.getElementById('error').hidden=false;};
  photo.src='background.jpg';
})();
