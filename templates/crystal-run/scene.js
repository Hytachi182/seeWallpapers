/* Crystal Run — original code-drawn art. No third-party sprites, fonts, music or characters. */
(() => {
  'use strict';
  const canvas = document.querySelector('canvas'), c = canvas.getContext('2d', { alpha: false });
  const api = window.seeWallpaper;
  let settings = { ...JSON.parse(document.getElementById('defaults').textContent), ...api?.getSettings() };
  const preview = new URLSearchParams(location.search).get('preview');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const on = v => v !== false && v !== 'false' && v !== 0;
  const palettes = [
    { sky:'#253b57', haze:'#b59086', sun:'#ffd0a0', far:'#595a73', mid:'#3b5264', rock:'#344355', edge:'#607184', grass:'#9bccc1', name:'AMBER DAWN' },
    { sky:'#242a49', haze:'#957a9c', sun:'#efb7c9', far:'#545175', mid:'#393e61', rock:'#30394f', edge:'#636a8b', grass:'#b9b6de', name:'VIOLET TRAIL' },
    { sky:'#101f36', haze:'#486882', sun:'#d2e6dd', far:'#2c405b', mid:'#25384a', rock:'#253849', edge:'#496779', grass:'#92c4c0', name:'MOON GARDEN' }
  ];
  const GROUND = 230, GRAVITY = 540, RUN = 90, JUMP = -310;
  let vw = 640, vh = 360, time = 0, camera = 0, level = 0, total = 0, jumps = 0, rescues = 0;
  let islands = [], blocks = [], crystals = [], enemies = [], sparks = [], player, finish, phase = 'run', phaseTime = 0;
  let paused = reduced, fps = reduced ? 15 : 30, last = 0, accumulator = 0, timer = 0, frame = 0;
  const rect = (x,y,w,h,color) => { c.fillStyle = color; c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); };
  function rng(seed) { return () => { seed = (Math.imul(seed,1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
  function makeLevel() {
    level++; const rand = rng(level * 9127); islands = []; blocks = []; crystals = []; enemies = []; sparks = [];
    let x = -160;
    for (let i = 0; i < 15; i++) {
      const length = i === 0 ? 430 : 190 + Math.floor(rand() * 100);
      islands.push({ x, end:x + length, y:GROUND, seed:Math.floor(rand()*1000) });
      if (i > 0 && i < 14) {
        const bx = x + 95;
        if (i % 3 === 1) blocks.push({ x:bx, y:GROUND - 23, w:24, h:23 });
        else enemies.push({ x:bx, origin:bx, y:GROUND, dead:false, phase:rand()*6 });
      }
      for (let j = 0; j < 4; j++) crystals.push({ x:x + 65 + j*29, y:GROUND - (j === 1 || j === 2 ? 67 : 51), taken:false });
      x += length + 52 + Math.floor(rand()*23);
    }
    finish = islands.at(-1).end - 65;
    player = { x:30, y:GROUND, vy:0, grounded:true, checkpoint:30, invincible:0 };
    camera = 0; phase = 'run'; phaseTime = 0;
  }
  function burst(x,y,color,n=8) {
    if (!on(settings.particles) || reduced) return;
    for(let i=0;i<n;i++) sparks.push({ x,y,vx:Math.cos(i*2.4)*28,vy:-18-Math.sin(i*1.8)*28,life:0.65,color });
    if(sparks.length>100) sparks.splice(0,sparks.length-100);
  }
  function jump() { player.vy=JUMP; player.grounded=false; jumps++; burst(player.x,player.y,'#bdd7ca',5); }
  function update(dt) {
    time += dt;
    for (const p of sparks) { p.life-=dt; p.x+=p.vx*dt; p.y+=p.vy*dt; p.vy+=100*dt; }
    sparks=sparks.filter(p=>p.life>0);
    if (phase !== 'run') { phaseTime+=dt; if(phaseTime>2.6) makeLevel(); return; }
    player.invincible=Math.max(0,player.invincible-dt);
    for (const e of enemies) e.x=e.origin+Math.sin(time*1.7+e.phase)*12;
    const surface = islands.find(p=>player.x>=p.x && player.x<p.end);
    if(player.grounded) {
      if(surface && surface.end-player.x<22 && surface.end<finish) jump();
      else if(blocks.some(b=>b.x-player.x>0 && b.x-player.x<46) || enemies.some(e=>!e.dead && e.x-player.x>0 && e.x-player.x<48)) jump();
      else if(surface && surface.end-player.x>145 && crystals.some(g=>!g.taken && g.x-player.x>18 && g.x-player.x<32)) jump();
    }
    const oldY=player.y;
    player.x+=RUN*dt; player.vy+=GRAVITY*dt; player.y+=player.vy*dt; player.grounded=false;
    if(player.vy>=0) {
      const floor=islands.find(p=>player.x+5>=p.x && player.x-5<p.end && oldY<=p.y+0.1 && player.y>=p.y);
      const block=blocks.find(b=>player.x+6>b.x && player.x-6<b.x+b.w && oldY<=b.y+0.1 && player.y>=b.y);
      const y=block ? block.y : floor?.y;
      if(y!==undefined) { player.y=y; player.vy=0; player.grounded=true; if(floor && !block && player.x>floor.x+24 && player.x<floor.end-50) player.checkpoint=player.x; }
    }
    for(const g of crystals) if(!g.taken && Math.abs(player.x-g.x)<13 && Math.abs(player.y-14-g.y)<20) { g.taken=true; total++; burst(g.x,g.y,settings.color); }
    for(const e of enemies) if(!e.dead && Math.abs(player.x-e.x)<14 && player.y>GROUND-18) {
      if(player.vy>0 && oldY<=GROUND-13) { e.dead=true; player.vy=-160; burst(e.x,GROUND-8,'#e9b48e'); }
      else if(player.invincible<=0) { rescues++; player.x=player.checkpoint; player.y=GROUND-45; player.vy=0; player.invincible=2; }
    }
    if(player.y>GROUND+100) { rescues++; player.x=player.checkpoint; player.y=GROUND-45; player.vy=0; player.invincible=2; }
    camera=Math.max(0,player.x-vw*0.32);
    if(player.x>=finish) { phase='complete'; phaseTime=0; burst(player.x,player.y-28,settings.color,22); }
    if(player.grounded && Math.floor(time*15)%3===0 && sparks.length<12) burst(player.x-7,player.y,'#8dadae',1);
  }
  // Hand-authored pixel sprite: a teal survey robot with one amber lens, antenna and a scarf.
  const robot = ['....aa......','.....a......','...hhhhhh...','..hHHHHHHh..','..hHllllHh..','..hHlkklHh..','..hHHHHHHh..','...hhhhhh...','..ssBBBB....','.ss.BBBB....','....BBBB....','...bBBBBb...','...bBBBBb...','....bbbb....'];
  function drawRobot(x,y) {
    const colors={a:'#ffe2a8',h:'#152f3b',H:settings.color,l:'#233b4c',k:'#ffe6ab',s:'#eeb492',B:'#cbd7c6',b:'#486d76'};
    const bob=player.grounded ? Math.sin(time*18)*0.6 : 0;
    robot.forEach((row,j)=>[...row].forEach((p,i)=>{ if(colors[p]) rect(x-12+i*2,y-34+j*2+bob,2,2,colors[p]); }));
    const stride=player.grounded ? Math.sin(time*18)*3 : 3;
    rect(x-6-stride,y-7,5,7,'#203b4a'); rect(x+2+stride,y-7,5,7,'#203b4a');
    rect(x-7-stride,y-2,7,3,settings.color); rect(x+1+stride,y-2,7,3,settings.color);
  }
  function diamond(x,y,size,color) { c.fillStyle=color; c.beginPath(); c.moveTo(x,y-size); c.lineTo(x+size*0.65,y); c.lineTo(x,y+size); c.lineTo(x-size*0.65,y); c.closePath(); c.fill(); }
  function mountainLayer(p,speed,base,height,color,seed) {
    const offset=on(settings.parallax) ? camera*speed : 0, rand=rng(seed);
    c.fillStyle=color; c.beginPath(); c.moveTo(-120,vh);
    for(let i=-2;i<Math.ceil(vw/100)+5;i++) { const x=i*100-(offset%100); c.lineTo(x,base-rand()*height); c.lineTo(x+50,base-rand()*height*0.6); }
    c.lineTo(vw+120,vh); c.closePath(); c.fill();
  }
  function draw() {
    const p=palettes[(level-1)%3], horizon=vh*0.58, gy=vh*0.77, oy=gy-GROUND;
    const grad=c.createLinearGradient(0,0,0,vh); grad.addColorStop(0,p.sky); grad.addColorStop(0.75,p.haze); grad.addColorStop(1,p.mid);
    c.fillStyle=grad; c.fillRect(0,0,vw,vh);
    const sunX=vw*0.74-(on(settings.parallax) ? Math.sin(camera/1600)*22 : 0);
    c.fillStyle=p.sun; c.beginPath(); c.arc(sunX,vh*0.28,25,0,Math.PI*2); c.fill();
    if((level-1)%3===2) { c.fillStyle=p.sky; c.beginPath(); c.arc(sunX+10,vh*0.28-6,22,0,Math.PI*2); c.fill(); }
    const skyRand=rng(211);
    for(let i=0;i<25;i++) { const x=skyRand()*vw,y=skyRand()*vh*0.5; rect(x,y,1,1,p.sun); }
    for(let i=0;i<6;i++) {
      const cx=((i*159-(on(settings.parallax)?camera*0.08:0))%(vw+180)+(vw+180))%(vw+180)-80, cy=vh*(0.13+i%3*0.09);
      c.globalAlpha=0.14; rect(cx,cy,70,4,p.sun); rect(cx+14,cy-4,42,4,p.sun); c.globalAlpha=1;
    }
    mountainLayer(p,0.1,horizon,65,p.far,19); mountainLayer(p,0.24,horizon+38,45,p.mid,42);
    // Distant broken observatories: geometry and warm windows, no borrowed scenery.
    for(let i=0;i<5;i++) {
      const x=((i*235-camera*(on(settings.parallax)?0.35:0))%(vw+240)+(vw+240))%(vw+240)-80;
      rect(x,horizon-25,18,66,p.mid); rect(x-4,horizon-28,26,5,p.grass); rect(x+6,horizon-15,5,10,p.sun);
      rect(x+22,horizon+2,8,39,p.mid);
    }
    c.save(); c.translate(-Math.floor(camera),Math.floor(oy));
    for(const island of islands) {
      if(island.end<camera-50 || island.x>camera+vw+50) continue;
      const length=island.end-island.x;
      rect(island.x,GROUND,length,13,p.edge); rect(island.x,GROUND,length,4,p.grass);
      c.fillStyle=p.rock; c.beginPath(); c.moveTo(island.x,GROUND+13); c.lineTo(island.end,GROUND+13); c.lineTo(island.end-18,GROUND+48); c.lineTo(island.x+length*0.64,GROUND+82); c.lineTo(island.x+length*0.25,GROUND+57); c.lineTo(island.x+8,GROUND+29); c.closePath(); c.fill();
      const r=rng(island.seed);
      for(let j=0;j<length/17;j++) { const x=island.x+j*17; rect(x,GROUND+17+r()*21,9,2,p.edge); if(j%4===0) { rect(x+5,GROUND-7,2,7,p.grass); rect(x+3,GROUND-5,6,2,p.grass); } }
      for(let j=0;j<3;j++) { const x=island.x+length*(j+1)/4; rect(x,GROUND+48+j*3,2,18,p.mid); rect(x-2,GROUND+61+j*3,5,4,p.grass); }
    }
    for(const b of blocks) { rect(b.x,b.y,b.w,b.h,p.edge); rect(b.x+3,b.y+3,b.w-6,b.h-3,p.rock); rect(b.x+8,b.y+7,8,8,p.grass); rect(b.x,b.y,b.w,3,p.grass); }
    for(const g of crystals) if(!g.taken && g.x>camera-15 && g.x<camera+vw+15) {
      const y=g.y+Math.sin(time*3+g.x)*2;
      diamond(g.x,y,6,settings.color); diamond(g.x-1,y-2,2,'#e7fff0');
      if(on(settings.particles)) { rect(g.x+10,y-9,1,3,p.sun); rect(g.x+9,y-8,3,1,p.sun); }
    }
    for(const e of enemies) if(!e.dead) {
      const x=e.x,y=e.y-8;
      for(let i=0;i<3;i++) { const shift=Math.sin(time*12+i)*2; rect(x-10+i*7+shift,y+5,2,4,'#152e3c'); }
      rect(x-10,y-5,20,9,'#aa808f'); rect(x-7,y-8,14,5,'#d0a295'); rect(x+4,y-4,4,3,'#fce1a7'); rect(x-1,y-7,2,9,'#654e6c');
    }
    // Destination: an original survey beacon with an orbiting crystal.
    rect(finish-4,GROUND-60,8,60,p.edge); rect(finish-12,GROUND-14,24,14,p.rock); rect(finish-10,GROUND-55,20,4,p.grass);
    diamond(finish,GROUND-70+Math.sin(time*2)*3,11,settings.color);
    if(player.invincible===0 || Math.floor(time*12)%2===0) drawRobot(player.x,player.y);
    for(const s of sparks) { c.globalAlpha=Math.max(0,s.life/0.65); rect(s.x,s.y,2,2,s.color); } c.globalAlpha=1; c.restore();
    // Foreground leaves frame the adventure without covering the route.
    for(let i=0;i<10;i++) { const x=i*81-(camera*0.65%81), y=vh-10+Math.sin(i)*5; rect(x,y,4,18,p.sky); rect(x-8,y+4,12,4,p.mid); rect(x+3,y-3,11,4,p.mid); }
    if(on(settings.stats)) {
      rect(16,16,Math.min(vw-32,270),34,'#172d40');
      c.font='10px monospace'; c.textBaseline='middle'; c.fillStyle='#ecedd8'; c.textAlign='left';
      c.fillText(`TRAIL ${String(level).padStart(2,'0')} / ${p.name}`,25,28);
      diamond(28,41,4,settings.color); c.fillStyle='#c2dbd5'; c.fillText(`${String(total).padStart(3,'0')}   AUTO ADVENTURE`,38,42);
      rect(16,55,110,2,'#243e50'); rect(16,55,110*Math.min(1,player.x/finish),2,settings.color);
    }
    if(phase==='complete') {
      c.textAlign='center'; c.font='12px monospace'; rect(vw/2-91,vh*0.37-14,182,29,'#172d40'); c.fillStyle='#eaf4df'; c.fillText('BEACON REACHED',vw/2,vh*0.37); c.textAlign='left';
    }
  }
  function resize() {
    // Fixed low-resolution art buffer: crisp pixels and bounded cost, also on 4K displays.
    const aspect=Math.max(0.2,innerWidth/Math.max(1,innerHeight));
    vh=360; vw=Math.max(190,Math.min(1440,Math.round(vh*aspect)));
    canvas.width=vw; canvas.height=vh; c.imageSmoothingEnabled=false;
    if(player) camera=Math.max(0,player.x-vw*0.32);
  }
  function stop() { clearTimeout(timer); cancelAnimationFrame(frame); last=0; accumulator=0; }
  function animate(now) {
    if(paused || document.hidden) { stop(); return; }
    const dt=last ? Math.min(0.15,(now-last)/1000) : 0; last=now;
    accumulator+=dt*Math.max(0.3,Math.min(2,Number(settings.speed)||1));
    while(accumulator>=1/120) { update(1/120); accumulator-=1/120; }
    draw(); timer=setTimeout(()=>{frame=requestAnimationFrame(animate);},Math.max(0,1000/fps-4));
  }
  function start() { stop(); if(!paused && !document.hidden) frame=requestAnimationFrame(animate); }
  addEventListener('resize',()=>{resize();draw();}); document.addEventListener('visibilitychange',start);
  api?.onSettingsChanged(v=>{settings={...settings,...v};draw();});
  api?.onPause(()=>{paused=true;stop();}); api?.onResume(()=>{paused=false;start();});
  api?.onPerformanceChanged(v=>{fps=Math.max(1,Math.min(60,Number(v)||30));start();});
  resize(); makeLevel();
  if(preview!==null || reduced) {
    const target=Math.min(120,Math.max(0,Number(preview ?? 12)||0));
    for(let i=0;i<target*120;i++) update(1/120);
    paused=true;draw();
  } else { draw();start(); }
})();
