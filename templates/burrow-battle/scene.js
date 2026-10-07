(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d'),api=window.seeWallpaper;
  let settings={...JSON.parse(document.getElementById('defaults').textContent),...api?.getSettings()};
  const W=960,H=540,SEA=460,G=180,STEP=1/120,preview=new URLSearchParams(location.search).get('preview');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),on=v=>v!==false&&v!=='false';
  let seed=72519;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  let terrain=[],worms=[],shot=null,particles=[],rings=[],time=0,phase='intro',age=0,team=0,active=null,aim=0,power=0,wind=0,turn=0,round=0,winner=-1;
  let matches=0,shots=0,impacts=0,damageDone=0,drownings=0,craters=0,wins=[0,0],rotation=[0,0];
  let paused=false,fps=30,last=0,accumulator=0,timer=0,frame=0,vw=W,vh=H,scale=1,ox=0,oy=0;
  const names=[['MOSS','PIP','FERN'],['RUST','BUD','CLAY']];
  function ground(x){return terrain[clamp(Math.round(x),0,W-1)];}
  function newRound(){
    round++;matches++;turn=0;rotation=[0,0];team=(round-1)%2;winner=-1;shot=null;particles=[];rings=[];
    terrain=Array.from({length:W},(_,x)=>{
      if(x<48||x>912||(x>431&&x<529))return H+40;
      return 328+26*Math.sin(x*.013)+13*Math.sin(x*.035)+8*Math.sin(x*.079);
    });
    worms=[];
    for(let t=0;t<2;t++)for(let i=0;i<3;i++){
      const x=110+i*122+t*444;
      worms.push({team:t,name:names[t][i],x,y:ground(x),vx:0,vy:0,hp:100,face:t?-1:1,blink:random()*5,flash:0});
    }
    phase='intro';age=0;active=null;
  }
  function beginTurn(){
    const available=worms.filter(w=>w.team===team&&w.hp>0);
    if(!available.length){finish();return;}
    active=available[rotation[team]++%available.length];turn++;wind=(random()-.5)*28;
    phase='move';age=0;active.face=team?-1:1;
  }
  function finish(){
    const sums=[0,1].map(t=>worms.filter(w=>w.team===t).reduce((n,w)=>n+w.hp,0));
    winner=sums[0]===sums[1]?-1:sums[0]>sums[1]?0:1;
    if(winner>=0)wins[winner]++;phase='result';age=0;shot=null;
  }
  // Use the same flight model for the AI's trajectory search and live shots.
  function flight(x,y,vx,vy,dt){return {x:x+vx*dt+.5*wind*dt*dt,y:y+vy*dt+.5*G*dt*dt,vx:vx+wind*dt,vy:vy+G*dt};}
  function plan(){
    const enemies=worms.filter(w=>w.team!==team&&w.hp>0);
    if(!enemies.length){finish();return;}
    const target=enemies.reduce((a,b)=>Math.abs(a.x-active.x)<Math.abs(b.x-active.x)?a:b);
    active.face=Math.sign(target.x-active.x)||1;
    let best=Infinity,bestAngle=-Math.PI/4,bestPower=260;
    for(let degrees=28;degrees<=76;degrees+=4)for(let v=190;v<=390;v+=10){
      const angle=-degrees*Math.PI/180;
      let p={x:active.x+active.face*18,y:active.y-23,vx:Math.cos(angle)*v*active.face,vy:Math.sin(angle)*v};
      for(let i=0;i<180;i++){
        p=flight(p.x,p.y,p.vx,p.vy,1/30);
        if(p.x<0||p.x>=W||p.y>SEA||p.y>=ground(p.x))break;
      }
      const cost=Math.hypot(p.x-target.x,p.y-(target.y-8));
      if(cost<best){best=cost;bestAngle=angle;bestPower=v;}
    }
    aim=bestAngle+(random()-.5)*.045;power=bestPower+(random()-.5)*12;phase='aim';age=0;
  }
  function fire(){
    const grenade=turn%3===0;
    shot={x:active.x+active.face*18,y:active.y-23,vx:Math.cos(aim)*power*active.face,vy:Math.sin(aim)*power,age:0,grenade,trail:[]};
    shots++;phase='flight';age=0;
  }
  function explode(x,y,radius){
    impacts++;craters++;
    for(let xx=Math.max(0,Math.floor(x-radius));xx<Math.min(W,Math.ceil(x+radius));xx++){
      const bottom=y+Math.sqrt(Math.max(0,radius*radius-(xx-x)*(xx-x)));
      // A height field removes soil down to the crater floor, including the turf.
      if(terrain[xx]<bottom)terrain[xx]=bottom;
    }
    for(const w of worms){
      if(w.hp<=0)continue;
      const d=Math.hypot(w.x-x,w.y-10-y),reach=radius+42;
      if(d<reach){
        const amount=Math.ceil(58*(1-d/reach)),before=w.hp;w.hp=Math.max(0,w.hp-amount);damageDone+=before-w.hp;
        w.vx=(Math.sign(w.x-x)||1)*(1-d/reach)*95;w.vy=-85*(1-d/reach)-22;w.flash=.55;
      }
    }
    rings.push({x,y,r:radius,life:.65});
    for(let i=0;i<44;i++){
      const a=random()*Math.PI*2,v=30+random()*135;
      particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-30,life:.6+random()*.8,color:i%3?'#f9c26c':'#734f40'});
    }
    particles=particles.slice(-160);shot=null;phase='settle';age=0;
  }
  function update(dt){
    time+=dt;age+=dt;
    for(const w of worms){
      w.flash=Math.max(0,w.flash-dt);if(w.hp<=0)continue;
      w.x+=w.vx*dt;w.vx*=Math.pow(.08,dt);w.vy+=G*dt;w.y+=w.vy*dt;
      const floor=ground(w.x);
      if(w.y>=floor&&w.vy>=0){w.y=floor;w.vy=0;}
      if(w.y>SEA+12||w.x<0||w.x>=W){w.hp=0;drownings++;rings.push({x:clamp(w.x,0,W),y:SEA+5,r:22,life:.7});}
    }
    for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=G*dt;}
    particles=particles.filter(p=>p.life>0);for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);
    if(phase==='intro'&&age>1.8)beginTurn();
    else if(phase==='move'){
      if(active.hp<=0){phase='settle';age=0;return;}
      // Only traverse safe turf: the agent never walks deliberately over a cliff.
      const next=active.x+active.face*12*dt,floor=ground(next);
      if(Math.abs(floor-active.y)<9&&floor<SEA-28){active.x=next;active.y=floor;}
      if(age>.85)plan();
    }else if(phase==='aim'&&age>1.1)fire();
    else if(phase==='flight'&&shot){
      Object.assign(shot,flight(shot.x,shot.y,shot.vx,shot.vy,dt));shot.age+=dt;
      if(shot.trail.length===0||Math.hypot(shot.x-shot.trail.at(-1).x,shot.y-shot.trail.at(-1).y)>5){shot.trail.push({x:shot.x,y:shot.y});if(shot.trail.length>45)shot.trail.shift();}
      const contact=worms.some(w=>w.hp>0&&w!==active&&Math.hypot(w.x-shot.x,w.y-10-shot.y)<12);
      if(shot.x<0||shot.x>=W||shot.y>SEA||shot.age>6){shot=null;phase='settle';age=0;}
      else if(contact||shot.y>=ground(shot.x))explode(shot.x,shot.y,shot.grenade?49:38);
    }else if(phase==='settle'&&age>1.5){
      if([0,1].some(t=>!worms.some(w=>w.team===t&&w.hp>0))||turn>=48)finish();
      else{team=1-team;beginTurn();}
    }else if(phase==='result'&&age>4)newRound();
  }
  function ellipse(x,y,rx,ry,color){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
  function line(x,y,xx,yy,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.stroke();}
  function text(value,x,y,size,color,align='left'){c.font=`600 ${size}px 'Segoe UI',sans-serif`;c.textAlign=align;c.fillStyle=color;c.fillText(value,x,y);}
  function teamColor(t){return t?'#f2a17e':settings.color;}
  function soilPath(){c.beginPath();c.moveTo(0,H+30);for(let x=0;x<W;x+=2)c.lineTo(x,terrain[x]);c.lineTo(W,H+30);c.closePath();}
  function drawWorm(w){
    if(w.hp<=0)return;
    const bounce=w===active&&phase==='move'?Math.sin(time*18)*1.3:Math.sin(time*3+w.x)*.65;
    c.save();c.translate(w.x,w.y+bounce);c.scale(w.face,1);
    ellipse(0,1,14,3,'#263b3b55');
    c.strokeStyle='#553e42';c.lineWidth=2;c.fillStyle=w.flash>0?'#fff3c9':'#efc3a2';
    c.beginPath();c.moveTo(-10,0);c.bezierCurveTo(-18,-5,-8,-9,-7,-17);c.bezierCurveTo(-10,-36,13,-37,13,-22);c.bezierCurveTo(14,-10,4,-7,11,-2);c.quadraticCurveTo(5,4,-10,0);c.fill();c.stroke();
    line(-7,-6,2,-6,'#c28a79',1.2);line(-7,-10,2,-10,'#c28a79',1.2);
    ellipse(4,-25,4.5,5,'#fff5db');ellipse(11,-25,4,4.6,'#fff5db');
    if(Math.sin(time*.8+w.blink)>.992)line(1,-25,15,-25,'#513e40',1.5);
    else{ellipse(6,-25,1.5,2.3,'#303b45');ellipse(13,-25,1.5,2.2,'#303b45');}
    c.fillStyle=teamColor(w.team);c.fillRect(-8,-33,19,5);
    c.beginPath();c.moveTo(-7,-30);c.lineTo(-18,-33+Math.sin(time*5)*2);c.lineTo(-14,-27);c.closePath();c.fill();
    line(6,-17,11,-18,'#694049',1.5);
    if(w===active&&(phase==='aim'||phase==='flight')){
      c.save();c.translate(7,-21);c.rotate(aim);
      c.fillStyle='#344e55';c.fillRect(-8,-5,28,10);c.fillStyle='#82978a';c.fillRect(-8,-5,5,10);c.fillStyle=teamColor(w.team);c.fillRect(5,-3,8,6);c.fillStyle='#1f343f';c.fillRect(19,-5,3,10);c.restore();
      ellipse(6,-18,4,3,'#efc3a2');
    }
    c.restore();
    if(on(settings.stats)){
      text(w.name,w.x,w.y-47,9,'#fff1cf','center');c.fillStyle='#304646';c.fillRect(w.x-15,w.y-42,30,3);c.fillStyle=teamColor(w.team);c.fillRect(w.x-15,w.y-42,30*w.hp/100,3);
    }
    if(w===active&&phase!=='result'&&phase!=='intro'){
      const y=w.y-61+Math.sin(time*4)*2;c.fillStyle=teamColor(w.team);c.beginPath();c.moveTo(w.x-4,y);c.lineTo(w.x+4,y);c.lineTo(w.x,y+5);c.fill();
    }
  }
  function draw(){
    const sky=c.createLinearGradient(0,0,0,vh);sky.addColorStop(0,'#344c68');sky.addColorStop(.65,'#c1a49a');sky.addColorStop(1,'#e5bd8a');c.fillStyle=sky;c.fillRect(0,0,vw,vh);
    const waterTop=oy+SEA*scale;
    c.fillStyle='#315e6a';c.fillRect(0,waterTop,vw,vh-waterTop);
    for(let row=0;row<12;row++)for(let i=0;i<12;i++){
      const x=(i*53+time*(row%2?3:-4)+row*19+vw*4)%(vw+60)-30,y=waterTop+row*18+Math.sin(time+i)*scale;
      line(x,y,x+12,y,'#89b6b333');
    }
    c.save();c.translate(ox,oy);c.scale(scale,scale);
    ellipse(715,162,48,48,'#f8dcac');ellipse(715,162,61,61,'#f8dcac18');
    // Layered distant headlands leave the battlefield sharply legible.
    for(let layer=0;layer<3;layer++){
      c.fillStyle=['#83999a','#6f8b8d','#587779'][layer];c.beginPath();c.moveTo(-100,SEA);
      for(let x=-100;x<=W+100;x+=10)c.lineTo(x,345+layer*31+Math.sin(x*.009+layer)*30+Math.sin(x*.027)*8);
      c.lineTo(W+100,H);c.lineTo(-100,H);c.fill();
    }
    if(on(settings.clouds))for(let i=0;i<7;i++){
      const x=(i*169+time*(3+i%3))%1160-100,y=106+i%3*43;
      ellipse(x,y,43,8,'#f9e4cd66');ellipse(x-14,y-5,20,10,'#f9e4cd66');ellipse(x+9,y-7,24,13,'#f9e4cd66');
    }
    // A drifting survey balloon and pennants belong to the little island world.
    const bx=470+Math.sin(time*.035)*170,by=127+Math.sin(time*.3)*3;
    line(bx-10,by+15,bx-6,by+39,'#56696b');line(bx+10,by+15,bx+6,by+39,'#56696b');
    ellipse(bx,by,22,28,'#bc8477');ellipse(bx,by,9,28,'#e5b68e');c.fillStyle='#59645b';c.fillRect(bx-9,by+36,18,10);
    c.save();soilPath();c.clip();
    const soil=c.createLinearGradient(0,310,0,H);soil.addColorStop(0,'#95674d');soil.addColorStop(1,'#453e46');c.fillStyle=soil;c.fillRect(0,260,W,300);
    for(let x=0;x<W;x+=3){c.fillStyle='#c9976555';c.fillRect(x,terrain[x]+24+Math.sin(x*.024)*8,3,7);c.fillStyle='#513f43';c.fillRect(x,terrain[x]+57+Math.sin(x*.04)*5,3,3);}
    for(let i=0;i<115;i++){const x=(i*83)%W,y=355+(i*47)%180;ellipse(x,y,2+i%4,1+i%3,i%2?'#ba8a6355':'#332f3955');}
    // Fossil arches visible only where surviving soil still contains them.
    c.strokeStyle='#d6b58b66';c.lineWidth=3;c.beginPath();c.arc(272,426,17,Math.PI,Math.PI*1.95);c.stroke();for(let i=0;i<4;i++)line(258+i*7,417,260+i*7,432,'#d6b58b66',2);
    c.restore();
    for(let x=1;x<W-2;x+=2)if(terrain[x]<SEA&&terrain[x+2]<SEA){
      line(x,terrain[x]+2,x+2,terrain[x+2]+2,'#4f6b48',7);line(x,terrain[x]-1,x+2,terrain[x+2]-1,'#abc174',2);
    }
    for(let x=60;x<910;x+=17)if(ground(x)<SEA-18){
      const y=ground(x);line(x,y,x+Math.sin(time*2+x)*2,y-7,'#839b58',1);
      if(x%3===0){ellipse(x,y-9,2.5,2,'#f6d087');ellipse(x,y-9,1,1,'#b7895d');}
    }
    for(const w of worms)drawWorm(w);
    if(phase==='aim'&&active){
      let p={x:active.x+active.face*18,y:active.y-23,vx:Math.cos(aim)*power*active.face,vy:Math.sin(aim)*power};
      for(let i=0;i<9;i++){p=flight(p.x,p.y,p.vx,p.vy,.07);ellipse(p.x,p.y,1.6,1.6,'#fff1cf88');}
    }
    if(shot){
      if(on(settings.effects))shot.trail.forEach((p,i)=>ellipse(p.x,p.y,1+i/shot.trail.length*2,1+i/shot.trail.length*2,`rgba(255,229,174,${i/shot.trail.length*.6})`));
      c.save();c.translate(shot.x,shot.y);c.rotate(Math.atan2(shot.vy,shot.vx));
      if(shot.grenade){ellipse(0,0,5,5,'#819c68');c.fillStyle='#e5dca4';c.fillRect(-2,-7,4,3);}
      else{c.fillStyle='#e9d8b5';c.fillRect(-7,-3,12,6);c.fillStyle='#df8c68';c.beginPath();c.moveTo(9,0);c.lineTo(3,-4);c.lineTo(3,4);c.fill();if(on(settings.effects))ellipse(-10,0,5+Math.sin(time*90)*2,2,'#f9ba65');}c.restore();
    }
    if(on(settings.effects)){
      for(const p of particles)ellipse(p.x,p.y,2,2,p.color);
      for(const r of rings){c.strokeStyle=`rgba(255,223,156,${clamp(r.life,0,1)})`;c.lineWidth=3;c.beginPath();c.arc(r.x,r.y,r.r*(1-r.life/.8),0,Math.PI*2);c.stroke();}
    }
    // Tide sits in front of the terrain and covers burrowers that have fallen in.
    c.fillStyle='#315e6add';c.fillRect(-100,SEA,W+200,H-SEA+100);
    for(let row=0;row<5;row++)for(let i=0;i<18;i++){
      const x=(i*63+time*(row%2?7:-9)+row*19+1200)%1200-110,y=SEA+6+row*17+Math.sin(time*1.4+i)*2;
      line(x,y,x+21+row*2,y,'#89b6b36b',row?1:2);
    }
    if(on(settings.stats)){
      for(let t=0;t<2;t++){
        const health=worms.filter(w=>w.team===t).reduce((n,w)=>n+w.hp,0),x=t?W-36:36;
        text(t?'EMBER CREW':'MEADOW CREW',x,37,13,'#fff1d7',t?'right':'left');
        text(`${health} HP  /  ${wins[t]} WINS`,x,55,10,teamColor(t),t?'right':'left');
        c.fillStyle='#334b54';c.fillRect(t?W-208:36,65,172,4);c.fillStyle=teamColor(t);c.fillRect(t?W-36-172*health/300:36,65,172*health/300,4);
      }
      text(`ROUND ${round}  /  TURN ${turn}`,W/2,36,11,'#fff1d7','center');
      const wx=W/2,wy=55;line(wx-21,wy,wx+21,wy,'#fff1d7',1.5);
      const end=wx+(wind>=0?21:-21);line(end,wy,end-Math.sign(wind||1)*5,wy-4,'#fff1d7',1.5);line(end,wy,end-Math.sign(wind||1)*5,wy+4,'#fff1d7',1.5);
      text(`WIND ${Math.abs(wind).toFixed(0)}`,wx,75,9,'#fff1d7','center');
      text('BURROW BATTLE',36,H-23,11,'#d5e5ce');text('AUTONOMOUS ARTILLERY',W-36,H-23,9,'#d5e5ce','right');
    }
    if(phase==='intro'||phase==='result'){
      const title=phase==='intro'?`ISLAND SKIRMISH ${round}`:winner<0?'A WELL FOUGHT DRAW':`${winner?'EMBER':'MEADOW'} TAKES THE ISLAND`;
      text(title,W/2,221,20,'#fff3d3','center');text(phase==='intro'?'Three burrowers. One island victory.':'A fresh battlefield is on its way.',W/2,244,11,'#fff3d3','center');
    }
    c.restore();
  }
  function resize(){
    // Retain the entire battlefield on portrait screens; paint sky around it.
    vh=540;vw=clamp(Math.round(vh*innerWidth/Math.max(1,innerHeight)),180,2560);
    const density=clamp(innerHeight/vh,1,2);canvas.width=Math.round(vw*density);canvas.height=Math.round(vh*density);c.setTransform(density,0,0,density,0,0);
    scale=Math.min(vw/W,vh/H);ox=(vw-W*scale)/2;oy=(vh-H*scale)/2;
  }
  function stop(){clearTimeout(timer);cancelAnimationFrame(frame);last=0;accumulator=0;}
  function animate(now){
    if(paused||document.hidden){stop();return;}
    const dt=last?Math.min(.15,(now-last)/1000):0;last=now;accumulator+=dt*clamp(Number(settings.speed)||1,.3,2);
    while(accumulator>=STEP){update(STEP);accumulator-=STEP;}draw();
    timer=setTimeout(()=>{frame=requestAnimationFrame(animate);},Math.max(0,1000/fps-4));
  }
  function start(){stop();if(!paused&&!document.hidden)frame=requestAnimationFrame(animate);}
  addEventListener('resize',()=>{resize();draw();});document.addEventListener('visibilitychange',start);
  api?.onSettingsChanged(v=>{settings={...settings,...v};draw();});api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});api?.onPerformanceChanged(v=>{fps=clamp(Number(v)||30,1,60);start();});
  resize();newRound();
  if(preview!==null||reduced){const target=clamp(Number(preview??12)||0,0,120);for(let i=0;i<target*120;i++)update(STEP);paused=true;draw();}else{draw();start();}
})();
