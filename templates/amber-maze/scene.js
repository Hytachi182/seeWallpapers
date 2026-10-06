/* Amber Maze: original lantern robot, geometric sentinels and generated maps. No game assets. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d',{alpha:false}),api=window.seeWallpaper;
  let settings={...JSON.parse(document.getElementById('defaults').textContent),...api?.getSettings()};
  const preview=new URLSearchParams(location.search).get('preview'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const on=v=>v!==false&&v!=='false'&&v!==0,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const COLS=21,ROWS=19,TILE=18,W=414,H=422,MX=18,MY=62;
  let seed=preview!==null?53191:Date.now()>>>0;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  let grid=[],pellets=new Set(),powers=new Set(),enemies=[],player,history=[];
  let level=0,score=0,best=0,lives=3,games=0,collected=0,cleared=0,captures=0,hits=0,time=0,power=0,grace=0;
  let phase='play',phaseTime=0,playerClock=0,enemyClock=0,vw=640,vh=480,scale=1,ox=0,oy=0;
  let paused=reduced,fps=reduced?15:30,last=0,accumulator=0,timer=0,frame=0;
  try{best=Number(localStorage.getItem('amber-maze-best'))||0;}catch{}
  const id=(x,y)=>y*COLS+x,point=n=>({x:n%COLS,y:Math.floor(n/COLS)});
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  function neighbors(n){const {x,y}=point(n);return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>a>=0&&a<COLS&&b>=0&&b<ROWS&&grid[b][a]===0).map(([a,b])=>id(a,b));}
  function distances(start){const dist=new Map([[start,0]]),queue=[start];for(let i=0;i<queue.length;i++)for(const n of neighbors(queue[i]))if(!dist.has(n)){dist.set(n,dist.get(queue[i])+1);queue.push(n);}return dist;}
  function saveBest(){if(score>best){best=score;try{localStorage.setItem('amber-maze-best',String(best));}catch{}}}
  function entity(n){return {cell:n,previous:n,age:1,heading:1,stunned:0};}
  function spawnActors(){player=entity(id(1,1));enemies=[entity(id(COLS-2,ROWS-2)),entity(id(COLS-2,1)),entity(id(1,ROWS-2))];grace=3;history=[];playerClock=0;enemyClock=0;}
  function makeLevel(){
    level++;grid=Array.from({length:ROWS},()=>Array(COLS).fill(1));
    const stack=[[1,1]];grid[1][1]=0;
    while(stack.length){
      const [x,y]=stack.at(-1),choices=[[x+2,y],[x-2,y],[x,y+2],[x,y-2]].filter(([a,b])=>a>0&&a<COLS-1&&b>0&&b<ROWS-1&&grid[b][a]===1);
      if(!choices.length){stack.pop();continue;}
      const [nx,ny]=choices[Math.floor(random()*choices.length)];grid[(y+ny)/2][(x+nx)/2]=0;grid[ny][nx]=0;stack.push([nx,ny]);
    }
    // Open additional junctions: alternate routes for evasion, never isolate a room.
    for(let i=0;i<32;i++){const x=1+Math.floor(random()*(COLS-2)),y=1+Math.floor(random()*(ROWS-2));if(grid[y][x]===1&&((grid[y][x-1]===0&&grid[y][x+1]===0)||(grid[y-1][x]===0&&grid[y+1][x]===0)))grid[y][x]=0;}
    pellets=new Set();for(let y=1;y<ROWS-1;y++)for(let x=1;x<COLS-1;x++)if(!grid[y][x]&&(x!==1||y!==1))pellets.add(id(x,y));
    powers=new Set([id(1,ROWS-2),id(COLS-2,1),id(COLS-2,ROWS-2),id(11,9)]);
    for(const n of powers)pellets.delete(n);
    power=0;phase='play';phaseTime=0;spawnActors();
  }
  function newGame(){games++;level=0;score=0;lives=3;makeLevel();}
  function move(e,n){e.previous=e.cell;e.cell=n;e.age=0;const a=point(e.previous),b=point(n);e.heading=b.x>a.x?0:b.y>a.y?1:b.x<a.x?2:3;}
  function choosePlayer(){
    // Weighted shortest path to the next shard, with high costs around pursuers.
    const threats=power>0?[]:enemies.filter(e=>e.stunned<=0).map(e=>distances(e.cell));
    const costs=new Map([[player.cell,0]]),first=new Map(),open=[player.cell],done=new Set();
    while(open.length){
      let index=0;for(let i=1;i<open.length;i++)if(costs.get(open[i])<costs.get(open[index]))index=i;
      const n=open.splice(index,1)[0];if(done.has(n))continue;done.add(n);
      if(n!==player.cell&&(pellets.has(n)||powers.has(n)))return first.get(n);
      for(const next of neighbors(n)){
        let risk=0;for(const d of threats){const v=d.get(next)??99;risk+=v===0?70:v===1?24:v===2?7:v===3?2:0;}
        const cost=costs.get(n)+1+risk;
        if(cost<(costs.get(next)??Infinity)){costs.set(next,cost);first.set(next,n===player.cell?next:first.get(n));open.push(next);}
      }
    }
    return neighbors(player.cell)[0]??player.cell;
  }
  function collect(){
    if(pellets.delete(player.cell)){score+=10;collected++;saveBest();}
    if(powers.delete(player.cell)){score+=60;power=8;saveBest();}
    if(pellets.size+powers.size===0){cleared++;phase='clear';phaseTime=0;saveBest();}
  }
  function collide(oldPlayer=player.cell,oldEnemies=enemies.map(e=>e.cell)){
    if(phase!=='play')return;
    for(let i=0;i<enemies.length;i++){
      const e=enemies[i];if(e.stunned>0)continue;
      if(e.cell!==player.cell&&!(e.cell===oldPlayer&&oldEnemies[i]===player.cell))continue;
      if(power>0){captures++;score+=150;saveBest();e.stunned=4;}
      else if(grace<=0){hits++;lives--;if(lives<=0){phase='over';phaseTime=0;}else{power=0;spawnActors();}return;}
    }
  }
  function tickPlayer(){const old=player.cell,oldEnemies=enemies.map(e=>e.cell);history.push(old);if(history.length>12)history.shift();move(player,choosePlayer());collect();collide(old,oldEnemies);}
  function tickEnemies(){
    const oldPlayer=player.cell,old=enemies.map(e=>e.cell),toPlayer=distances(player.cell);
    for(let i=0;i<enemies.length;i++){
      const e=enemies[i];if(e.stunned>0)continue;
      const options=neighbors(e.cell);if(!options.length)continue;
      const scatter=Math.floor(time/10)%3===0;
      const goal=scatter?distances([id(COLS-2,ROWS-2),id(COLS-2,1),id(1,ROWS-2)][i]):toPlayer;
      options.sort((a,b)=>(goal.get(a)??99)-(goal.get(b)??99));
      let next=power>0?options.at(-1):options[0];
      if(random()<.15)next=options[Math.floor(random()*options.length)];
      move(e,next);
    }
    collide(oldPlayer,old);
  }
  function update(dt){
    time+=dt;player.age+=dt;for(const e of enemies){e.age+=dt;e.stunned=Math.max(0,e.stunned-dt);}
    if(phase!=='play'){phaseTime+=dt;if(phaseTime>2.4){if(phase==='clear')makeLevel();else newGame();}return;}
    power=Math.max(0,power-dt);grace=Math.max(0,grace-dt);
    playerClock+=dt;enemyClock+=dt;
    if(playerClock>=.13){playerClock-=.13;tickPlayer();}
    if(phase==='play'&&enemyClock>=.22){enemyClock-=.22;tickEnemies();}
  }
  function position(e,interval){const a=point(e.previous),b=point(e.cell),f=clamp(e.age/interval,0,1);return {x:MX+(a.x+(b.x-a.x)*f+.5)*TILE,y:MY+(a.y+(b.y-a.y)*f+.5)*TILE};}
  function diamond(x,y,r,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r,y);c.lineTo(x,y+r);c.lineTo(x-r,y);c.closePath();c.fill();}
  function lantern(x,y,size=1){
    c.save();c.translate(x,y);c.scale(size,size);
    rect(-5,-5,10,10,'#5e4337');rect(-3,-6,6,12,settings.color);rect(-5,-3,10,6,settings.color);rect(-2,-3,4,5,'#fff0c6');
    rect(-5,-9,2,4,'#f6ddb1');rect(3,-9,2,4,'#f6ddb1');rect(-7,4,3,3,'#b38b6a');rect(4,4,3,3,'#b38b6a');
    if(power>0){c.strokeStyle='#c3f4ed';c.lineWidth=1;c.strokeRect(-8,-10,16,19);}c.restore();
  }
  function draw(){
    rect(0,0,vw,vh,'#080f18');
    // A quiet copper circuit border around an otherwise uncluttered maze.
    c.strokeStyle='#20313a';c.lineWidth=1;
    for(const side of [-1,1]){const x=vw/2+side*(W*scale/2+18);c.beginPath();c.moveTo(x,70);c.lineTo(x,vh-70);c.lineTo(x+side*23,vh-47);c.stroke();for(let i=0;i<7;i++)rect(x-1,85+i*45,3,3,'#70513c');}
    c.save();c.translate(ox,oy);c.scale(scale,scale);
    rect(MX-2,MY-2,COLS*TILE+4,ROWS*TILE+4,'#111f28');
    for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(grid[y][x]){
      const px=MX+x*TILE,py=MY+y*TILE;rect(px+1,py+1,TILE-2,TILE-2,'#293b42');
      if(on(settings.glow)){
        c.globalAlpha=.65;
        if(y===0||!grid[y-1][x])rect(px,py,TILE,1,settings.color);
        if(y===ROWS-1||!grid[y+1][x])rect(px,py+TILE-1,TILE,1,settings.color);
        if(x===0||!grid[y][x-1])rect(px,py,1,TILE,settings.color);
        if(x===COLS-1||!grid[y][x+1])rect(px+TILE-1,py,1,TILE,settings.color);
        c.globalAlpha=1;
      }
      rect(px+4,py+4,3,3,'#3c5158');
    }
    for(const n of pellets){const p=point(n);rect(MX+p.x*TILE+8,MY+p.y*TILE+8,2,2,'#c3aa85');}
    for(const n of powers){const p=point(n),x=MX+(p.x+.5)*TILE,y=MY+(p.y+.5)*TILE;diamond(x,y,5+Math.sin(time*4)*.7,'#a3e6d5');rect(x-1,y-2,2,4,'#eaf9d6');}
    if(on(settings.trail))history.forEach((n,i)=>{const p=point(n);c.globalAlpha=(i+1)/history.length*.25;rect(MX+p.x*TILE+5,MY+p.y*TILE+5,8,8,settings.color);});c.globalAlpha=1;
    for(let i=0;i<enemies.length;i++){
      const e=enemies[i];if(e.stunned>0)continue;const p=position(e,.22),color=power>0?'#45677c':['#e5a0a7','#91bcdd','#b6a6dc'][i];
      diamond(p.x,p.y,7,color);diamond(p.x,p.y,4,'#213641');rect(p.x-3,p.y-2,2,2,'#eff5e7');rect(p.x+1,p.y-2,2,2,'#eff5e7');
      rect(p.x-9,p.y-1,2,3,color);rect(p.x+7,p.y-1,2,3,color);
    }
    const pos=position(player,.13);if(grace<=0||Math.floor(time*10)%2===0)lantern(pos.x,pos.y);
    if(on(settings.stats)){
      c.font='12px monospace';c.textBaseline='middle';c.textAlign='left';c.fillStyle='#e8d4b4';c.fillText('AMBER MAZE',MX,19);
      c.font='11px monospace';c.fillStyle=settings.color;c.fillText(String(score).padStart(6,'0'),MX,39);
      c.textAlign='right';c.fillStyle='#adcacb';c.fillText(`MAZE ${String(level).padStart(2,'0')}`,W-MX,19);c.fillStyle='#9eb4b6';c.fillText(`BEST ${String(best).padStart(6,'0')}`,W-MX,39);
      for(let i=0;i<lives;i++)lantern(172+i*22,37,.65);
      c.textAlign='left';c.font='9px monospace';c.fillStyle='#bfc7b9';c.fillText(`AUTO / ${pellets.size+powers.size} SHARDS LEFT`,MX,H-9);
      c.textAlign='right';c.fillStyle=power>0?'#a3e6d5':'#bfc7b9';c.fillText(power>0?`OVERCHARGE ${Math.ceil(power)}s`:`FLIGHT ${games}`,W-MX,H-9);c.textAlign='left';
    }
    if(phase!=='play'){rect(W/2-100,H/2-17,200,34,'#102730');c.textAlign='center';c.font='12px monospace';c.fillStyle='#f1e1bb';c.fillText(phase==='clear'?'LABYRINTH CLEARED':'RESTARTING',W/2,H/2+1);c.textAlign='left';}
    c.restore();
  }
  function resize(){const aspect=Math.max(.2,innerWidth/Math.max(1,innerHeight));vh=480;vw=Math.max(190,Math.min(1920,Math.round(vh*aspect)));canvas.width=vw;canvas.height=vh;c.imageSmoothingEnabled=false;scale=Math.min((vw-16)/W,(vh-12)/H);ox=(vw-W*scale)/2;oy=(vh-H*scale)/2;}
  function stop(){clearTimeout(timer);cancelAnimationFrame(frame);last=0;accumulator=0;}
  function animate(now){if(paused||document.hidden){stop();return;}const dt=last?Math.min(.15,(now-last)/1000):0;last=now;accumulator+=dt*clamp(Number(settings.speed)||1,.3,2);while(accumulator>=1/120){update(1/120);accumulator-=1/120;}draw();timer=setTimeout(()=>{frame=requestAnimationFrame(animate);},Math.max(0,1000/fps-4));}
  function start(){stop();if(!paused&&!document.hidden)frame=requestAnimationFrame(animate);}
  addEventListener('resize',()=>{resize();draw();});document.addEventListener('visibilitychange',start);
  api?.onSettingsChanged(v=>{settings={...settings,...v};draw();});api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});api?.onPerformanceChanged(v=>{fps=clamp(Number(v)||30,1,60);start();});
  resize();newGame();
  if(preview!==null||reduced){const target=clamp(Number(preview??12)||0,0,120);for(let i=0;i<target*120;i++)update(1/120);paused=true;draw();}else{draw();start();}
})();
