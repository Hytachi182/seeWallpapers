/* Orbital Defender. Original geometry, drones and spacecraft; no third-party game assets. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), c=canvas.getContext('2d',{alpha:false}), api=window.seeWallpaper;
  let settings={...JSON.parse(document.getElementById('defaults').textContent),...api?.getSettings()};
  const preview=new URLSearchParams(location.search).get('preview'), reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const on=v=>v!==false && v!=='false' && v!==0;
  let seed=preview!==null ? 87131 : (Date.now()>>>0);
  function random() { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }
  const W=420,H=500,SHIP_Y=461;
  let vw=640,vh=360,scale=1,ox=0,oy=0,time=0;
  let wave=0,score=0,best=0,lives=3,games=0,kills=0,cleared=0,shots=0;
  let aliens=[],bullets=[],tiles=[],sparks=[],ship,shuttle=null,phase='play',phaseTime=0;
  let baseX=0,baseY=0,direction=1,stepTimer=0,fireTimer=0,shotTimer=0,bonusTimer=0;
  let paused=reduced,fps=reduced?15:30,last=0,accumulator=0,timer=0,frame=0;
  try { best=Number(localStorage.getItem('orbital-defender-best'))||0; } catch {}
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function burst(x,y,color,n=12) {
    if(!on(settings.particles)||reduced) return;
    for(let i=0;i<n;i++) sparks.push({x,y,vx:(random()-.5)*95,vy:(random()-.5)*95,life:.65,color});
    if(sparks.length>180) sparks.splice(0,sparks.length-180);
  }
  function saveBest() { if(score>best) {best=score;try{localStorage.setItem('orbital-defender-best',String(best));}catch{}} }
  function shields() {
    tiles=[];
    for(const x of [72,184,296]) for(let row=0;row<5;row++) for(let col=0;col<7;col++) {
      if((row===0&&(col===0||col===6))||(row>=3&&col>=2&&col<=4)) continue;
      tiles.push({x:x+col*7,y:405+row*6,hp:2});
    }
  }
  function nextWave() {
    wave++;baseX=55;baseY=90;direction=1;stepTimer=0;fireTimer=.8;shotTimer=.1;bonusTimer=8;
    aliens=[];bullets=[];shuttle=null;phase='play';phaseTime=0;shields();
    for(let row=0;row<4;row++) for(let col=0;col<8;col++) aliens.push({col,row,alive:true,x:0,y:0});
    positionAliens();ship={x:W/2,invincible:1};
  }
  function newGame() { games++;wave=0;score=0;lives=3;sparks=[];nextWave(); }
  function positionAliens() { for(const a of aliens) {a.x=baseX+a.col*39;a.y=baseY+a.row*34;} }
  function hurt() {
    if(ship.invincible>0||phase!=='play') return;
    lives--;burst(ship.x,SHIP_Y,'#ffbc9d',24);ship.invincible=2;bullets=bullets.filter(b=>b.owner==='ship');
    if(lives<=0) {phase='over';phaseTime=0;saveBest();}
  }
  function update(dt) {
    time+=dt;
    for(const p of sparks) {p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;} sparks=sparks.filter(p=>p.life>0);
    if(phase!=='play') { phaseTime+=dt;if(phaseTime>2.4) {if(phase==='clear')nextWave();else newGame();}return; }
    ship.invincible=Math.max(0,ship.invincible-dt);
    const alive=aliens.filter(a=>a.alive);
    if(!alive.length) {cleared++;phase='clear';phaseTime=0;bullets=[];saveBest();return;}
    const interval=Math.max(.07,.55-(32-alive.length)*.012-Math.min(wave-1,8)*.025);
    stepTimer+=dt;
    if(stepTimer>=interval) {
      stepTimer-=interval;
      const edge=alive.some(a=>a.x+direction*7<23||a.x+direction*7>W-23);
      if(edge) {direction*=-1;baseY+=13;} else baseX+=direction*7;
      positionAliens();
      for(const tile of tiles) if(tile.hp>0&&alive.some(a=>Math.abs(a.x-tile.x)<15&&Math.abs(a.y-tile.y)<12)) tile.hp=0;
      if(alive.some(a=>a.y>=SHIP_Y-18)) {lives=0;phase='over';phaseTime=0;saveBest();return;}
    }
    // Choose a bottom-most drone, lead its motion, then dodge imminent incoming fire.
    const bottom=alive.filter(a=>!alive.some(b=>b.col===a.col&&b.row>a.row));
    let target=bottom[0],distance=Infinity;
    for(const a of bottom) {const d=Math.abs(a.x-ship.x);if(d<distance){target=a;distance=d;}}
    const lead=direction*7/interval*(SHIP_Y-target.y)/340;
    let aim=clamp(target.x+lead,20,W-20),danger=null;
    for(const b of bullets) if(b.owner==='enemy'&&b.y>SHIP_Y-125&&b.y<SHIP_Y&&Math.abs(b.x-ship.x)<24) {danger=b;break;}
    if(danger) aim=clamp(danger.x+(ship.x<danger.x?-43:43),20,W-20);
    ship.x+=clamp(aim-ship.x,-170*dt,170*dt);
    shotTimer-=dt;
    if(shotTimer<=0&&Math.abs(ship.x-(target.x+lead))<18) {
      bullets.push({x:ship.x,y:SHIP_Y-15,vy:-340,owner:'ship'});shots++;shotTimer=.23;
    }
    fireTimer-=dt;
    if(fireTimer<=0) { const a=bottom[Math.floor(random()*bottom.length)];bullets.push({x:a.x,y:a.y+12,vy:120+Math.min(80,wave*6),owner:'enemy'});fireTimer=Math.max(.26,.85-wave*.045); }
    bonusTimer-=dt;
    if(bonusTimer<=0&&!shuttle) {shuttle={x:-30,y:62};bonusTimer=18;}
    if(shuttle) {shuttle.x+=55*dt;if(shuttle.x>W+35)shuttle=null;}
    for(const b of bullets) {
      const oldY=b.y;b.y+=b.vy*dt;
      const hitY=(y,pad)=>Math.min(oldY,b.y)<=y+pad&&Math.max(oldY,b.y)>=y-pad;
      const tile=tiles.find(t=>t.hp>0&&b.x>=t.x-1&&b.x<=t.x+7&&hitY(t.y+3,4));
      if(tile) {tile.hp--;b.dead=true;burst(b.x,tile.y,'#759dad',3);continue;}
      if(b.owner==='ship') {
        const a=aliens.find(a=>a.alive&&Math.abs(a.x-b.x)<14&&hitY(a.y,10));
        if(a) {a.alive=false;b.dead=true;kills++;score+=(4-a.row)*25;saveBest();burst(a.x,a.y,['#bba0ff','#f8b38b','#79bbf9','#86e4c5'][a.row]);}
        else if(shuttle&&Math.abs(shuttle.x-b.x)<20&&hitY(shuttle.y,8)) {score+=200;b.dead=true;burst(shuttle.x,shuttle.y,'#ffdca6',20);shuttle=null;saveBest();}
      } else if(Math.abs(b.x-ship.x)<12&&hitY(SHIP_Y,10)) {b.dead=true;hurt();}
    }
    bullets=bullets.filter(b=>!b.dead&&b.y>-15&&b.y<H+15).slice(-80);
  }
  // Three original drone silhouettes, deliberately distinct from classic alien sprites.
  const patterns=[
    ['....11....','...1221...','..122221..','.12233221.','1123333211','..122221..','...1221...','....11....'],
    ['1........1','11..22..11','.11233211.','..123321..','...2332...','..123321..','.11.22.11.','1........1'],
    ['..11..11..','.12211221.','1232332321','.12233221.','..123321..','...1221...','..11..11..','.11....11.']
  ];
  function drone(a) {
    const colors=['#bba0ff','#f8b38b','#79bbf9','#86e4c5'],color=colors[a.row];
    patterns[a.row%3].forEach((row,j)=>[...row].forEach((p,i)=>{if(p!=='.')rect(a.x-10+i*2,a.y-8+j*2,2,2,p==='1'?color:p==='2'?'#20344b':'#f7efd9');}));
    if(Math.floor(time*3)%2===0) {rect(a.x-14,a.y-2,2,4,color);rect(a.x+12,a.y-2,2,4,color);}
  }
  function drawShip(x,y,small=false) {
    c.save();c.translate(x,y);if(small)c.scale(.55,.55);
    rect(-2,-16,4,12,'#edf8ed');rect(-6,-7,12,13,settings.color);rect(-3,-6,6,6,'#16374d');rect(-2,-5,4,3,'#eef3d5');
    rect(-12,0,6,8,'#97b8c8');rect(6,0,6,8,'#97b8c8');rect(-15,5,5,5,settings.color);rect(10,5,5,5,settings.color);
    rect(-7,7,4,5,'#eaaa83');rect(3,7,4,5,'#eaaa83');rect(-6,12,2,3+Math.floor(time*18)%4,'#ffdca6');rect(4,12,2,3+Math.floor(time*18)%4,'#ffdca6');c.restore();
  }
  function draw() {
    rect(0,0,vw,vh,'#060e1c');
    if(on(settings.stars)) {
      let s=1721;const rand=()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};
      for(let i=0;i<125;i++) {const x=rand()*vw,y=(rand()*vh+time*(i%3+1)*2)%vh;rect(x,y,i%11===0?2:1,1,i%3===0?'#68869d':'#243951');}
    }
    // Quiet planetary backdrop, with the combat field kept clear.
    const px=vw*.84,py=vh*.44,r=Math.min(vw*.17,vh*.3);
    c.fillStyle='#101e32';c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.fill();
    c.save();c.beginPath();c.arc(px,py,r,0,Math.PI*2);c.clip();
    for(let i=0;i<12;i++) rect(px-r,py-r+i*r/6,r*2,3,i%2?'#172941':'#132439');c.restore();
    c.strokeStyle='#29445e';c.lineWidth=1;c.beginPath();c.ellipse(px,py,r*1.45,r*.29,-.35,0,Math.PI*2);c.stroke();
    c.save();c.translate(ox,oy);c.scale(scale,scale);
    // Subtle field brackets frame the game instead of introducing an app panel.
    for(const x of [8,W-8]) {rect(x,80,1,24,'#29445e');rect(x,80,x<10?12:-12,1,'#29445e');rect(x,474,1,16,'#29445e');}
    for(const a of aliens) if(a.alive) drone(a);
    for(const t of tiles) if(t.hp>0) {rect(t.x,t.y,6,5,t.hp===2?'#507f92':'#2c475c');if(t.hp===2)rect(t.x,t.y,6,1,'#93c0c4');}
    if(shuttle) {rect(shuttle.x-18,shuttle.y-3,36,6,'#d5a0b2');rect(shuttle.x-9,shuttle.y-8,18,5,'#f2c69e');rect(shuttle.x-5,shuttle.y-6,10,3,'#3d405d');rect(shuttle.x-24,shuttle.y,6,3,settings.color);}
    for(const b of bullets) {rect(b.x-1,b.y-4,2,9,b.owner==='ship'?settings.color:'#f9b698');rect(b.x,b.y-4,1,3,'#f4f1d8');}
    if(phase!=='over'&&(ship.invincible<=0||Math.floor(time*10)%2===0))drawShip(ship.x,SHIP_Y);
    if(on(settings.particles)) for(const p of sparks) {c.globalAlpha=Math.max(0,p.life/.65);rect(p.x,p.y,2,2,p.color);}c.globalAlpha=1;
    rect(24,490,W-48,1,'#29445e');
    if(on(settings.stats)) {
      c.font='12px monospace';c.textBaseline='middle';c.fillStyle='#cce1e6';c.textAlign='left';c.fillText('ORBITAL DEFENDER',24,20);
      c.font='11px monospace';c.fillStyle=settings.color;c.fillText(String(score).padStart(6,'0'),24,42);
      c.textAlign='right';c.fillStyle='#cad2e5';c.fillText(`WAVE ${String(wave).padStart(2,'0')}`,W-24,20);c.fillStyle='#819fb8';c.fillText(`BEST ${String(best).padStart(6,'0')}`,W-24,42);
      for(let i=0;i<lives;i++)drawShip(180+i*22,42,true);
      c.textAlign='left';c.font='9px monospace';c.fillStyle='#a1b9cb';c.fillText(`AUTO PILOT / FLIGHT ${String(games).padStart(2,'0')}`,24,480);
    }
    if(phase!=='play') {rect(99,238,222,35,'#10253a');c.textAlign='center';c.font='13px monospace';c.fillStyle='#edf0dc';c.fillText(phase==='clear'?'SECTOR SECURED':'RELAUNCHING',W/2,256);c.textAlign='left';}
    c.restore();
  }
  function resize() {
    const aspect=Math.max(.2,innerWidth/Math.max(1,innerHeight));vh=480;vw=Math.max(190,Math.min(1920,Math.round(vh*aspect)));
    canvas.width=vw;canvas.height=vh;c.imageSmoothingEnabled=false;scale=Math.min((vw-16)/W,(vh-12)/H);ox=(vw-W*scale)/2;oy=(vh-H*scale)/2;
  }
  function stop() {clearTimeout(timer);cancelAnimationFrame(frame);last=0;accumulator=0;}
  function animate(now) {
    if(paused||document.hidden){stop();return;}
    const dt=last?Math.min(.15,(now-last)/1000):0;last=now;accumulator+=dt*clamp(Number(settings.speed)||1,.3,2);
    while(accumulator>=1/120){update(1/120);accumulator-=1/120;}draw();timer=setTimeout(()=>{frame=requestAnimationFrame(animate);},Math.max(0,1000/fps-4));
  }
  function start(){stop();if(!paused&&!document.hidden)frame=requestAnimationFrame(animate);}
  addEventListener('resize',()=>{resize();draw();});document.addEventListener('visibilitychange',start);
  api?.onSettingsChanged(v=>{settings={...settings,...v};draw();});api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});
  api?.onPerformanceChanged(v=>{fps=clamp(Number(v)||30,1,60);start();});
  resize();newGame();
  if(preview!==null||reduced){const target=clamp(Number(preview??12)||0,0,120);for(let i=0;i<target*120;i++)update(1/120);paused=true;draw();}else{draw();start();}
})();
