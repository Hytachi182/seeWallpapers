/* Comet Pinball: an original neon space pinball table that plays itself. Deterministic fixed-step physics, code-drawn art, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), c=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  const TAU=Math.PI*2, mix=(a,b,t)=>a+(b-a)*t, mixc=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  const rgba=(a,alpha=1)=>`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${clamp(alpha,0,1).toFixed(3)})`;
  const WHITE=[255,255,255], MAGENTA=[255,95,210], AMBER=[255,196,92];
  let settings={speed:1,color:'#5ee7ff',trail:true,multiball:true,hud:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2);
  function accent(){const m=/^#?([0-9a-f]{6})$/i.exec(String(settings.color??'').trim());if(!m)return [94,231,255];const n=parseInt(m[1],16);return [n>>16&255,n>>8&255,n&255];}

  // Table units: 560 x 900, playfield x 30..470, plunger lane x 470..530. Gravity points down the table.
  const TW=560, TH=900, G=950, STEP=1/120, SUBS=4, DT=STEP/SUBS;
  const BR=9, RF=9, FL=72, MAXW=18, REST=.5, UP=-.45, LANE_X=500, DRAIN_Y=852;
  // [x1,y1,x2,y2,restitution]: outer walls, top, outlane slopes, lane divider, lane floor and the ramp that feeds the playfield
  const WALLS=[[30,130,30,650,.5],[30,130,70,50,.5],[70,50,470,50,.5],[30,650,140,754,.45],[360,754,470,650,.45],[470,110,470,840,.5],[470,840,530,840,.4],[530,110,530,840,.5],[470,50,530,110,.45]];
  // curved orbit lane in the upper left: nine short segments of a circle
  const ARC={cx:120,cy:460,r:90};
  const ARC_SEGS=Array.from({length:9},(_,i)=>{const a0=-Math.PI/2+i*Math.PI/18,a1=a0+Math.PI/18;return [ARC.cx+ARC.r*Math.cos(a0),ARC.cy+ARC.r*Math.sin(a0),ARC.cx+ARC.r*Math.cos(a1),ARC.cy+ARC.r*Math.sin(a1),.45];});
  const SOLIDS=[...WALLS,...ARC_SEGS];
  const SLINGS=[{x1:80,y1:560,x2:150,y2:660,kick:true},{x1:150,y1:660,x2:80,y2:660},{x1:80,y1:660,x2:80,y2:560},{x1:420,y1:560,x2:350,y2:660,kick:true},{x1:350,y1:660,x2:420,y2:660},{x1:420,y1:660,x2:420,y2:560}].map(s=>({hitAt:-9,...s}));
  const BUMPERS=[{x:104,y:296,r:22,hitAt:-9},{x:270,y:200,r:22,hitAt:-9},{x:360,y:330,r:22,hitAt:-9}];
  const TARGETS=[290,340,390,440].map(y=>({x1:436,y1:y,x2:436,y2:y+30,down:false,hitAt:-9}));
  const LAMPS=[120,180,240].map(x=>({x,y:86,lit:false}));
  const FLIPPER_DEFS=[{s:1,pivot:[150,760]},{s:-1,pivot:[350,760]}];

  // Simulation state, advanced only in fixed steps so previews are identical
  let seed=0x2f6e2b1;
  function rnd(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}
  let simTime=0, balls=[], sparks=[], popups=[], score=0, best=0, reserve=2, gameOver=false, goTimer=0;
  let respawnTimer=0, waiting=false, resetAt=-1, orbitCool=0, completePending=false;
  const flippers=FLIPPER_DEFS.map(d=>({...d,a:REST,w:0,tx:0,ty:0,up:false,armed:false,armAt:0,miss:false,upUntil:0,cool:0}));

  // Drawing state
  let w=1,h=1,ts=1,ox=0,oy=0,ui=1,bg=null,bgKey='',tableCanvas=null,tableKey='';
  let pending=0,frame=0,last=0,elapsed=0,fps=30,paused=preview;
  const flashOf=o=>clamp(1-(simTime-o.hitAt)/.3,0,1);

  function addScore(p,x,y,color=WHITE){score+=p;best=Math.max(best,score);if(x!==undefined)popup(`+${p}`,x,y,color);}
  function popup(text,x,y,color=WHITE){popups.push({text,x,y,t:0,life:.9,color});if(popups.length>10)popups.shift();}
  function burst(x,y,color,n){for(let i=0;i<n;i++){const a=rnd()*TAU,sp=50+rnd()*190;sparks.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,t:0,life:.3+rnd()*.35,color});}if(sparks.length>220)sparks.splice(0,sparks.length-220);}

  function spawnLane(){balls.push({x:LANE_X,y:700,vx:0,vy:0,trail:[],rest:0});}
  // a ball that comes to rest at the bottom of the plunger lane is fired again after a short pause
  const inLane=b=>b.x>LANE_X-30&&b.y>760;
  function newGame(){
    score=0;reserve=2;gameOver=false;balls=[];sparks=[];popups=[];waiting=false;resetAt=-1;orbitCool=0;completePending=false;
    for(const t of TARGETS)t.down=false;for(const l of LAMPS)l.lit=false;
    spawnLane();updateFlippers();
  }

  // Flippers swing toward their target at a limited angular speed; the tip is recomputed every substep.
  function updateFlippers(){
    for(const f of flippers){
      const target=f.up?UP:REST, lim=MAXW*DT, d=clamp(target-f.a,-lim,lim);
      f.a+=d;f.w=d/DT;
      f.tx=f.pivot[0]+f.s*FL*Math.cos(f.a);f.ty=f.pivot[1]+FL*Math.sin(f.a);
    }
  }

  // Shared contact resolution: push the ball out, then reflect its velocity relative to the surface.
  function resolve(b,px,py,nx,ny,min,e,surface){
    b.x=px+nx*min;b.y=py+ny*min;
    const sx=surface?surface[0]:0, sy=surface?surface[1]:0;
    const vn=(b.vx-sx)*nx+(b.vy-sy)*ny;
    if(vn<0){const j=-(1+e)*vn;b.vx+=nx*j;b.vy+=ny*j;}
  }
  function segContact(b,x1,y1,x2,y2,r,e,surface){
    const dx=x2-x1,dy=y2-y1,len2=dx*dx+dy*dy||1;
    const t=clamp(((b.x-x1)*dx+(b.y-y1)*dy)/len2,0,1), px=x1+dx*t, py=y1+dy*t;
    let nx=b.x-px, ny=b.y-py;const d=Math.hypot(nx,ny), min=BR+r;
    if(d>=min)return null;
    if(d<1e-6){const l=Math.sqrt(len2);nx=-dy/l;ny=dx/l;}else{nx/=d;ny/=d;}
    resolve(b,px,py,nx,ny,min,e,surface?surface(px,py):null);
    return {nx,ny,px,py};
  }
  function circleContact(b,cx,cy,r,e){
    let nx=b.x-cx,ny=b.y-cy;const d=Math.hypot(nx,ny),min=BR+r;
    if(d>=min)return null;
    if(d<1e-6){nx=0;ny=-1;}else{nx/=d;ny/=d;}
    resolve(b,cx,cy,nx,ny,min,e,null);
    return {nx,ny,px:cx,py:cy};
  }
  // Bumpers and slingshots score and kick once per short cooldown, so resting contact cannot farm points.
  function hitFx(obj,b,hit,points,kick,color){
    if(simTime-obj.hitAt<.12)return;
    obj.hitAt=simTime;
    // after ten kicks without the ball returning to the flippers the kickers go passive, so no loop can feed itself forever
    b.kicks=(b.kicks||0)+1;if(b.kicks>10)kick=0;
    // a small seeded deflection keeps the ball from settling into a perfect sling-to-sling loop
    const a=(rnd()-.5)*.6, kx=hit.nx*Math.cos(a)-hit.ny*Math.sin(a), ky=hit.nx*Math.sin(a)+hit.ny*Math.cos(a);
    b.vx+=kx*kick;b.vy+=ky*kick;
    addScore(points,hit.px,hit.py,color);
    burst(hit.px,hit.py,color,8);
  }
  // Equal-mass ball to ball collision with a little energy loss.
  function ballPair(p,q){
    const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy),min=BR*2;
    if(d>=min||d<1e-6)return;
    const nx=dx/d,ny=dy/d,ov=(min-d)/2;
    p.x-=nx*ov;p.y-=ny*ov;q.x+=nx*ov;q.y+=ny*ov;
    const vn=(q.vx-p.vx)*nx+(q.vy-p.vy)*ny;
    if(vn<0){const j=-(1+.8)*vn/2;p.vx-=nx*j;p.vy-=ny*j;q.vx+=nx*j;q.vy+=ny*j;}
  }

  function physics(){
    updateFlippers();
    for(const b of balls){
      b.vy+=G*DT;b.x+=b.vx*DT;b.y+=b.vy*DT;
      for(const w of SOLIDS)segContact(b,w[0],w[1],w[2],w[3],0,w[4],null);
      for(const sg of SLINGS){const hit=segContact(b,sg.x1,sg.y1,sg.x2,sg.y2,0,.5,null);if(hit&&sg.kick)hitFx(sg,b,hit,10,270,MAGENTA);}
      for(const f of flippers){const px=f.pivot[0],py=f.pivot[1];segContact(b,px,py,f.tx,f.ty,RF,.3,(x,y)=>[-f.s*f.w*(y-py),f.s*f.w*(x-px)]);}
      for(const bu of BUMPERS){const hit=circleContact(b,bu.x,bu.y,bu.r,1);if(hit)hitFx(bu,b,hit,100,320,MAGENTA);}
      for(const t of TARGETS){
        if(!t.down&&segContact(b,t.x1,t.y1,t.x2,t.y2,4,.4,null)){
          const my=(t.y1+t.y2)/2;t.down=true;t.hitAt=simTime;
          addScore(250,t.x1,my,AMBER);burst(t.x1,my,AMBER,8);
          if(TARGETS.every(x=>x.down))completePending=true;
        }
      }
      if(b.y>700)b.kicks=0;
      const sp=Math.hypot(b.vx,b.vy);if(sp>1500){b.vx*=1500/sp;b.vy*=1500/sp;}
    }
    for(let i=0;i<balls.length;i++)for(let j=i+1;j<balls.length;j++)ballPair(balls[i],balls[j]);
  }

  // Full drop-target bank: bonus, extra balls when multiball is enabled, and the bank resets shortly after.
  function completeTargets(){
    const mb=on(settings.multiball);
    addScore(1000,250,330,AMBER);
    popup(mb?'MULTIBALL':'TARGET BANK',250,300,AMBER);
    if(mb){for(let k=0;k<2&&balls.length<3;k++)balls.push({x:250+(k?36:-36),y:150,vx:(k?-1:1)*(40+rnd()*30),vy:0,trail:[],rest:0});}
    resetAt=simTime+1.4;
  }

  function aiFlippers(){
    for(const f of flippers){
      if(f.cool>0)f.cool-=STEP;
      if(f.up&&simTime>=f.upUntil){f.up=false;f.cool=.12;}
      const side=f.s>0?270:230;
      // falling toward the flipper, or resting on it at the base
      const threat=balls.some(b=>b.vy>-40&&b.y>600&&b.y<790&&(f.s>0?b.x<side:b.x>side));
      // imperfect play: slightly late timing, and one swing in ten is simply missed
      if(!f.up&&!f.armed&&f.cool<=0&&threat){f.armed=true;f.armAt=simTime+.05+rnd()*.12;f.miss=rnd()<.1;}
      if(f.armed&&simTime>=f.armAt){f.armed=false;if(!f.miss){f.up=true;f.upUntil=simTime+.16;}}
    }
  }

  function flow(){
    if(gameOver){goTimer-=STEP;if(goTimer<=0)newGame();return;}
    for(const b of balls){
      if(inLane(b)&&b.y>815&&Math.abs(b.vy)<25){b.rest+=STEP;if(b.rest>=.7){b.rest=0;b.vy=-(1200+rnd()*80);}}
      else b.rest=0;
      // table nudge: a ball wedged anywhere on the playfield for two seconds is shaken loose
      if(!inLane(b)&&Math.hypot(b.vx,b.vy)<20){b.still=(b.still||0)+STEP;if(b.still>=2){b.still=0;b.vx+=(rnd()<.5?-1:1)*(120+rnd()*80);b.vy-=260+rnd()*120;popup('NUDGE',b.x,b.y-20);}}
      else b.still=0;
    }
    if(resetAt>=0&&simTime>=resetAt){resetAt=-1;for(const t of TARGETS)t.down=false;}
    if(balls.length===0){
      if(reserve<=0){gameOver=true;goTimer=4;return;}
      if(!waiting){waiting=true;respawnTimer=1;}
      respawnTimer-=STEP;
      if(respawnTimer<=0){waiting=false;reserve--;spawnLane();}
    }
  }

  function sensors(){
    if(completePending){completePending=false;completeTargets();}
    if(orbitCool>0)orbitCool-=STEP;
    for(const b of balls){
      for(const l of LAMPS)if(!l.lit&&Math.hypot(b.x-l.x,b.y-l.y)<16){l.lit=true;addScore(50,l.x,l.y-14);}
      if(LAMPS.every(l=>l.lit)){for(const l of LAMPS)l.lit=false;addScore(1000,240,60,AMBER);}
      const dx=b.x-ARC.cx,dy=b.y-ARC.cy,dist=Math.hypot(dx,dy),ang=Math.atan2(dy,dx);
      if(orbitCool<=0&&dist>ARC.r-8&&dist<ARC.r+12&&ang>-1.5&&ang<-.2&&b.vx>0){orbitCool=1.2;addScore(500,b.x,b.y-16,MAGENTA);}
    }
    balls=balls.filter(b=>b.y<DRAIN_Y&&b.x>-40&&b.x<TW+40&&b.y>-60);
    for(const p of sparks){p.t+=STEP;p.x+=p.vx*STEP;p.y+=p.vy*STEP;p.vy+=260*STEP;p.vx*=.97;}
    sparks=sparks.filter(p=>p.t<p.life);
    for(const p of popups)p.t+=STEP;
    popups=popups.filter(p=>p.t<p.life);
  }

  function step(){
    simTime+=STEP;
    aiFlippers();
    flow();
    for(let i=0;i<SUBS;i++)physics();
    sensors();
    for(const b of balls){b.trail.push({x:b.x,y:b.y});if(b.trail.length>11)b.trail.shift();}
  }
  function advanceTo(t){while(simTime+STEP*.5<t)step();}

  // ---- drawing ----
  function layout(){
    ui=clamp(Math.sqrt(w*h)/1200,.4,2);
    ts=Math.min(h*.92/TH,w*.9/TW);
    ox=(w-TW*ts)/2;oy=(h-TH*ts)/2;
  }

  function background(){
    const key=`${w}x${h}`;
    if(key===bgKey)return;bgKey=key;
    bg=document.createElement('canvas');bg.width=w;bg.height=h;
    const g=bg.getContext('2d');
    const lg=g.createLinearGradient(0,0,0,h);lg.addColorStop(0,'#04050f');lg.addColorStop(1,'#120a26');
    g.fillStyle=lg;g.fillRect(0,0,w,h);
    const nebulae=[[.18,.3,.5,[120,60,220]],[.82,.7,.55,[40,160,220]],[.7,.2,.35,[220,70,170]]];
    for(const [fx,fy,fr,col] of nebulae){
      const rg=g.createRadialGradient(w*fx,h*fy,0,w*fx,h*fy,Math.max(w,h)*fr);
      rg.addColorStop(0,rgba(col,.22));rg.addColorStop(1,rgba(col,0));
      g.fillStyle=rg;g.fillRect(0,0,w,h);
    }
    for(let i=0;i<320;i++){
      const x=hash(i*1.7)*w, y=hash(i*2.9+.3)*h, r=(.3+hash(i*4.1)*1.4)*Math.max(.7,ui), a=.25+hash(i*6.3)*.7;
      g.fillStyle=`rgba(230,240,255,${a.toFixed(3)})`;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();
    }
  }

  // Static table art (felt, grid, glowing rails) is rendered once per size and colour.
  function tableLayer(acc){
    const key=`${ts.toFixed(4)}|${acc.join(',')}`;
    if(key===tableKey)return tableCanvas;
    tableKey=key;
    const t=document.createElement('canvas');t.width=Math.ceil(TW*ts);t.height=Math.ceil(TH*ts);
    const g=t.getContext('2d');g.setTransform(ts,0,0,ts,0,0);
    const felt=g.createLinearGradient(0,50,0,840);felt.addColorStop(0,'#0c1a33');felt.addColorStop(1,'#060d1d');
    g.fillStyle=felt;g.fillRect(30,50,500,790);
    const rad=g.createRadialGradient(250,430,20,250,430,300);rad.addColorStop(0,rgba(acc,.14));rad.addColorStop(1,rgba(acc,0));
    g.fillStyle=rad;g.fillRect(30,50,500,790);
    g.strokeStyle=rgba(acc,.07);g.lineWidth=1;
    for(let x=70;x<470;x+=40){g.beginPath();g.moveTo(x,50);g.lineTo(x,840);g.stroke();}
    for(let y=90;y<840;y+=40){g.beginPath();g.moveTo(30,y);g.lineTo(470,y);g.stroke();}
    g.fillStyle=rgba(acc,.06);g.fillRect(470,110,60,730);
    g.strokeStyle=rgba(acc,.16);g.lineWidth=2;g.beginPath();g.arc(250,470,48,0,TAU);g.stroke();
    g.strokeStyle=rgba(AMBER,.35);g.lineWidth=2;
    for(let i=0;i<3;i++){const y=660+i*22;g.beginPath();g.moveTo(480,y+10);g.lineTo(500,y);g.lineTo(520,y+10);g.stroke();}
    // neon rails: three stacked translucent strokes stand in for a blur, which keeps previews pixel-identical
    g.lineCap='round';g.lineJoin='round';
    const rails=[...SOLIDS.map(s=>[s[0],s[1],s[2],s[3],acc]),...SLINGS.map(s=>[s.x1,s.y1,s.x2,s.y2,s.kick?MAGENTA:acc])];
    for(const [x1,y1,x2,y2,col] of rails){
      g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);
      g.strokeStyle=rgba(col,.12);g.lineWidth=12;g.stroke();
      g.strokeStyle=rgba(col,.3);g.lineWidth=6;g.stroke();
      g.strokeStyle=rgba(mixc(col,WHITE,.25),1);g.lineWidth=3;g.stroke();
    }
    tableCanvas=t;
    return t;
  }

  const line=(x1,y1,x2,y2)=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();};

  function drawTable(acc){
    const light=mixc(acc,WHITE,.45);
    for(const bu of BUMPERS){
      const f=flashOf(bu);
      const glow=c.createRadialGradient(bu.x,bu.y,bu.r*.4,bu.x,bu.y,bu.r*2.4);
      glow.addColorStop(0,rgba(MAGENTA,.25+.55*f));glow.addColorStop(1,rgba(MAGENTA,0));
      c.fillStyle=glow;c.beginPath();c.arc(bu.x,bu.y,bu.r*2.4,0,TAU);c.fill();
      c.fillStyle=f>.05?rgba(mixc(MAGENTA,WHITE,.6*f),1):'#241033';
      c.beginPath();c.arc(bu.x,bu.y,bu.r,0,TAU);c.fill();
      c.strokeStyle=rgba(MAGENTA,.95);c.lineWidth=3;c.beginPath();c.arc(bu.x,bu.y,bu.r,0,TAU);c.stroke();
    }
    c.lineCap='round';
    for(const sg of SLINGS){if(!sg.kick)continue;const f=flashOf(sg);if(f<=0)continue;c.strokeStyle=rgba(MAGENTA,.7*f);c.lineWidth=12;line(sg.x1,sg.y1,sg.x2,sg.y2);}
    for(const t of TARGETS){c.strokeStyle=t.down?rgba(AMBER,.14):rgba(AMBER,.95);c.lineWidth=8;line(t.x1,t.y1,t.x2,t.y2);}
    for(const l of LAMPS){
      c.fillStyle=l.lit?rgba(light,1):'#14243a';c.beginPath();c.arc(l.x,l.y,7,0,TAU);c.fill();
      c.strokeStyle=rgba(acc,.7);c.lineWidth=2;c.beginPath();c.arc(l.x,l.y,7,0,TAU);c.stroke();
    }
    for(const f of flippers){
      const [px,py]=f.pivot;
      c.strokeStyle=rgba(acc,.28);c.lineWidth=RF*2+12;line(px,py,f.tx,f.ty);
      c.strokeStyle=rgba(mixc(acc,WHITE,.15),1);c.lineWidth=RF*2;line(px,py,f.tx,f.ty);
      c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=2.5;line(px,py,f.tx,f.ty);
      c.fillStyle='#0b1220';c.beginPath();c.arc(px,py,6,0,TAU);c.fill();
    }
    // plunger rod under the waiting ball
    const waitingBall=balls.find(inLane), top=waitingBall?waitingBall.y+BR:830;
    c.strokeStyle=rgba(acc,.5);c.lineWidth=4;line(LANE_X,top,LANE_X,852);
    c.fillStyle=rgba(light,.9);c.fillRect(LANE_X-12,850,24,8);
    const trail=on(settings.trail);
    for(const b of balls){
      if(trail&&b.trail.length>1){
        for(let i=1;i<b.trail.length;i++){
          const p=b.trail[i-1],q=b.trail[i],k=i/b.trail.length;
          c.strokeStyle=rgba(acc,.55*k);c.lineWidth=BR*1.7*k;line(p.x,p.y,q.x,q.y);
        }
      }
      const g=c.createRadialGradient(b.x,b.y,0,b.x,b.y,BR*3.2);g.addColorStop(0,rgba(acc,.55));g.addColorStop(1,rgba(acc,0));
      c.fillStyle=g;c.beginPath();c.arc(b.x,b.y,BR*3.2,0,TAU);c.fill();
      const body=c.createRadialGradient(b.x-3,b.y-3,1,b.x,b.y,BR);body.addColorStop(0,'#ffffff');body.addColorStop(.45,rgba(light,1));body.addColorStop(1,rgba(acc,1));
      c.fillStyle=body;c.beginPath();c.arc(b.x,b.y,BR,0,TAU);c.fill();
    }
    for(const p of sparks){c.fillStyle=rgba(p.color,1-p.t/p.life);c.fillRect(p.x-1.5,p.y-1.5,3,3);}
    c.textAlign='center';c.textBaseline='middle';c.font='700 15px system-ui, sans-serif';
    for(const p of popups){c.fillStyle=rgba(p.color,1-p.t/p.life);c.fillText(p.text,p.x,p.y);}
    c.textAlign='left';c.textBaseline='alphabetic';
  }

  function drawHud(acc){
    const light=mixc(acc,WHITE,.5), fs=(n,min=10)=>Math.max(min,Math.round(n*ui));
    const x0=Math.max(16,Math.round(26*ui)), y0=Math.round(18*ui), step=k=>y0+Math.round(k*ui);
    const mb=on(settings.multiball), hit=TARGETS.filter(t=>t.down).length, live=reserve+balls.length;
    c.textBaseline='top';c.textAlign='left';
    c.fillStyle=rgba(acc,.85);c.font=`600 ${fs(13)}px system-ui, sans-serif`;c.fillText('SCORE',x0,step(0));
    c.fillStyle='#f4fbff';c.font=`700 ${fs(36,16)}px system-ui, sans-serif`;c.fillText(score.toLocaleString('en-US'),x0,step(16));
    c.fillStyle=rgba(acc,.85);c.font=`600 ${fs(14)}px system-ui, sans-serif`;c.fillText(`HIGH ${best.toLocaleString('en-US')}`,x0,step(62));
    c.fillText('BALLS',x0,step(88));
    for(let i=0;i<3;i++){c.fillStyle=i<live?rgba(light,1):'rgba(120,140,180,.25)';c.beginPath();c.arc(x0+fs(72)+i*fs(20),step(94)+fs(6,4),fs(6,4),0,TAU);c.fill();}
    c.fillStyle=rgba(AMBER,1);c.fillText(`TARGETS ${hit}/4`,x0,step(116));
    c.fillStyle=mb?rgba(AMBER,1):'rgba(160,170,190,.5)';c.fillText(mb?'MULTIBALL ON':'MULTIBALL OFF',x0,step(138));
    if(gameOver){
      c.textAlign='center';c.textBaseline='middle';
      c.font=`800 ${fs(56,20)}px system-ui, sans-serif`;c.fillStyle=rgba(MAGENTA,1);c.fillText('GAME OVER',w/2,h/2);
      c.font=`600 ${fs(18,11)}px system-ui, sans-serif`;c.fillStyle=rgba(acc,.9);c.fillText('NEW GAME STARTING',w/2,h/2+fs(48,22));
    }
  }

  function draw(){
    background();
    const acc=accent(), layer=tableLayer(acc);
    c.setTransform(1,0,0,1,0,0);c.drawImage(bg,0,0);c.drawImage(layer,ox,oy);
    c.setTransform(ts,0,0,ts,ox,oy);
    drawTable(acc);
    c.setTransform(1,0,0,1,0,0);
    if(on(settings.hud))drawHud(acc);
  }

  // ---- loop, host API and sizing ----
  const moving=()=>!reduced.matches&&speed()>0;
  const active=()=>!paused&&!document.hidden&&moving();
  function tick(now){
    if(!active()){stop();return;}
    const dt=last?Math.min(.1,(now-last)/1000):0;last=now;
    pending+=dt*speed();
    let n=0;while(pending>=STEP&&n<12){step();pending-=STEP;n++;}
    if(n===12)pending=0;
    elapsed+=dt;
    if(elapsed+1e-5>=1/clamp(fps,1,60)){elapsed=0;draw();}
    frame=requestAnimationFrame(tick);
  }
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;elapsed=0;pending=0;}
  function start(){stop();if(active())frame=requestAnimationFrame(tick);}
  function resize(){
    const ratio=Math.min(devicePixelRatio||1,1920/Math.max(1,innerWidth),1080/Math.max(1,innerHeight));
    w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));
    layout();draw();
  }

  newGame();
  // a preview fast-forwards the same fixed steps from t=0; reduced motion shows the same still moment
  advanceTo(preview?clamp(Number(params.get('preview'))||0,0,86400):(reduced.matches?20:0));
  addEventListener('resize',resize);
  document.addEventListener('visibilitychange',start);
  reduced.addEventListener?.('change',()=>{draw();start();});
  api?.onSettingsChanged(value=>{settings={...settings,...value};draw();start();});
  api?.onPause(()=>{paused=true;stop();});
  api?.onResume(()=>{paused=false;start();});
  api?.onPerformanceChanged(value=>{fps=clamp(Number(value)||30,1,60);start();});
  resize();canvas.dataset.ready='true';start();
})();
