/* Rooftop Rivals: original articulated robot silhouettes and code-drawn scenery. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d',{alpha:false}),api=window.seeWallpaper;
  let settings={...JSON.parse(document.getElementById('defaults').textContent),...api?.getSettings()};
  const preview=new URLSearchParams(location.search).get('preview'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const on=v=>v!==false&&v!=='false'&&v!==0,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const W=640,H=360,FLOOR=286;
  let seed=preview!==null?94721:Date.now()>>>0;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const moves={punch:{duration:.4,active:.14,range:55,damage:9,stun:.21},kick:{duration:.62,active:.27,range:79,damage:14,stun:.3},dash:{duration:.6,active:.22,range:59,damage:11,stun:.26},pulse:{duration:.78,active:.3,range:0,damage:12,stun:.24}};
  let fighters=[],bolts=[],sparks=[],wins=[0,0],round=1,clock=45,time=0,phase='intro',phaseTime=0,winner=-1;
  let matches=0,roundsDone=0,hits=0,blocks=0,projectileHits=0,jumps=0,combos=0;
  let vw=640,vh=360,scale=1,ox=0,oy=0,paused=reduced,fps=reduced?15:30,last=0,accumulator=0,timer=0,frame=0;
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  function fighter(i){return {i,x:i?460:180,y:0,vy:0,hp:100,facing:i?-1:1,action:'idle',age:0,fired:false,think:.12+i*.2,cooldown:0,combo:0,comboTime:0,message:'',messageTime:0};}
  function startRound(){fighters=[fighter(0),fighter(1)];bolts=[];sparks=[];clock=45;phase='intro';phaseTime=0;winner=-1;}
  function newMatch(){matches++;wins=[0,0];round=1;startRound();}
  function act(f,action){f.action=action;f.age=0;f.fired=false;}
  function burst(x,y,color,n=12){if(!on(settings.effects)||reduced)return;for(let i=0;i<n;i++)sparks.push({x,y,vx:(random()-.5)*160,vy:(random()-.65)*125,life:.45,color});if(sparks.length>140)sparks.splice(0,sparks.length-140);}
  function damage(attacker,target,move,projectile=false){
    if(target.hp<=0||phase!=='fight')return;
    const guarded=target.action==='guard'&&target.y<4;
    if(guarded){blocks++;target.hp=Math.max(0,target.hp-2);target.x=clamp(target.x+attacker.facing*5,38,W-38);target.message='GUARD';target.messageTime=.55;burst(target.x,FLOOR-target.y-35,'#e9d6bc',5);}
    else{
      hits++;if(projectile)projectileHits++;
      target.hp=Math.max(0,target.hp-move.damage);target.x=clamp(target.x+attacker.facing*10,38,W-38);act(target,'stun');target.cooldown=move.stun;
      attacker.combo=attacker.comboTime>0?attacker.combo+1:1;attacker.comboTime=1.25;
      if(attacker.combo>=2){combos++;attacker.message=`${attacker.combo} HIT`;attacker.messageTime=.85;}
      burst(target.x,FLOOR-target.y-35,attacker.i?'#f4b18b':settings.color,18);
    }
    if(target.hp<=0)finishRound(attacker.i);
  }
  function finishRound(index){if(phase!=='fight')return;roundsDone++;winner=index;if(index>=0)wins[index]++;phase='result';phaseTime=0;bolts=[];for(const f of fighters)act(f,f.hp<=0?'down':f.i===index?'victory':'idle');}
  function decide(f,enemy){
    const gap=Math.abs(enemy.x-f.x),r=random();f.think=.18+random()*.2;
    if(f.y===0&&enemy.action in moves&&gap<95&&r<.27){act(f,'guard');f.cooldown=.35;return;}
    if(f.y===0&&gap>85&&r<.13){f.vy=235;jumps++;act(f,'walk');return;}
    if(f.cooldown<=0){
      if(gap<50&&r<.83){act(f,r<.55?'punch':'kick');return;}
      if(gap<77&&r<.85){act(f,'kick');return;}
      if(gap<150&&r<.38){act(f,'dash');return;}
      if(gap>95&&r<.4){act(f,'pulse');return;}
    }
    act(f,'walk');
  }
  function update(dt){
    time+=dt;for(const p of sparks){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=170*dt;}sparks=sparks.filter(p=>p.life>0);
    for(const f of fighters){f.age+=dt;f.messageTime=Math.max(0,f.messageTime-dt);f.comboTime=Math.max(0,f.comboTime-dt);if(!f.comboTime)f.combo=0;f.cooldown=Math.max(0,f.cooldown-dt);}
    if(phase!=='fight'){
      phaseTime+=dt;
      if(phase==='intro'&&phaseTime>=1.3){phase='fight';phaseTime=0;}
      else if(phase==='result'&&phaseTime>=2.5){if(wins.some(w=>w>=2)){phase='match';phaseTime=0;}else{round++;startRound();}}
      else if(phase==='match'&&phaseTime>=2.6)newMatch();return;
    }
    clock=Math.max(0,clock-dt);
    for(const f of fighters){
      const enemy=fighters[1-f.i];f.facing=enemy.x>=f.x?1:-1;
      if(f.y>0||f.vy>0){f.vy-=600*dt;f.y=Math.max(0,f.y+f.vy*dt);if(!f.y)f.vy=0;}
      if(f.action==='stun'){if(f.cooldown<=0){act(f,'idle');f.think=.05;}continue;}
      if(f.action==='guard'){if(f.cooldown<=0)act(f,'idle');continue;}
      const move=moves[f.action];
      if(move){
        if(f.action==='dash'&&f.age<move.active)f.x=clamp(f.x+f.facing*180*dt,38,W-38);
        if(!f.fired&&f.age>=move.active){
          f.fired=true;
          if(f.action==='pulse')bolts.push({x:f.x+f.facing*27,y:FLOOR-f.y-35,vx:f.facing*210,owner:f.i,life:3});
          else if(Math.abs(enemy.x-f.x)<=move.range&&Math.abs(enemy.y-f.y)<(f.action==='kick'?27:48))damage(f,enemy,move);
        }
        if(f.age>=move.duration){act(f,'idle');f.cooldown=.08;f.think=.05;}
      }else{
        f.think-=dt;if(f.think<=0)decide(f,enemy);
        if(f.action==='walk'){const gap=Math.abs(enemy.x-f.x),motion=gap>48?f.facing:-f.facing*.25;f.x=clamp(f.x+motion*73*dt,38,W-38);}
      }
      if(phase!=='fight')break;
    }
    // Resolve grounded body overlap so a rush cannot pass through the opponent.
    const [a,b]=fighters;
    if(Math.abs(a.y-b.y)<40&&Math.abs(a.x-b.x)<32){const middle=(a.x+b.x)/2;if(a.x<=b.x){a.x=middle-16;b.x=middle+16;}else{a.x=middle+16;b.x=middle-16;}}
    for(const bolt of bolts){
      const oldX=bolt.x;bolt.x+=bolt.vx*dt;bolt.life-=dt;const target=fighters[1-bolt.owner];
      if(Math.abs(bolt.y-(FLOOR-target.y-35))<30&&Math.min(oldX,bolt.x)<=target.x+15&&Math.max(oldX,bolt.x)>=target.x-15){bolt.life=0;damage(fighters[bolt.owner],target,moves.pulse,true);}
    }
    bolts=bolts.filter(b=>b.life>0&&b.x>-20&&b.x<W+20).slice(-16);
    if(phase==='fight'&&clock<=0)finishRound(a.hp===b.hp?-1:a.hp>b.hp?0:1);
  }
  function limb(x,y,ex,ey,width,color){c.strokeStyle='#142634';c.lineWidth=width+3;c.beginPath();c.moveTo(x,y);c.lineTo(ex,ey);c.stroke();c.strokeStyle=color;c.lineWidth=width;c.stroke();rect(ex-width/2,ey-width/2,width,width,color);}
  function drawFighter(f){
    const accent=f.i?'#e7a17e':settings.color,armor=f.i?'#9e6b6a':'#658d9c',dark=f.i?'#573e50':'#2e4c63';
    const ground=FLOOR-f.y,bob=f.action==='walk'?Math.sin(time*17)*1.5:Math.sin(time*5)*.7;
    c.fillStyle='rgba(4,10,20,.45)';c.beginPath();c.ellipse(f.x,FLOOR+2,24-f.y*.05,4,0,0,Math.PI*2);c.fill();
    c.save();c.translate(Math.round(f.x),Math.round(ground+bob));c.scale(f.facing,1);
    if(f.action==='down'){c.rotate(-Math.PI/2);c.translate(30,3);}
    const move=moves[f.action],extension=move?Math.sin(clamp(f.age/move.duration,0,1)*Math.PI):0;
    const kick=f.action==='kick',punch=f.action==='punch'||f.action==='dash',guard=f.action==='guard';
    const stride=f.action==='walk'?Math.sin(time*14)*9:0,air=f.y>0;
    limb(-7,-29,-12-stride,air?-12:-6,10,dark);rect(-20-stride,air?-11:-6,17,6,armor);
    limb(8,-28,kick?13+extension*39:12+stride,kick?-25-extension*12:air?-15:-6,11,armor);rect(kick?9+extension*39:8+stride,kick?-28-extension*12:air?-14:-6,20,7,accent);
    rect(-15,-56,29,30,dark);rect(-13,-54,25,20,armor);rect(-9,-50,17,7,accent);rect(-6,-48,10,3,'#dce9d6');rect(-12,-33,23,5,'#b6bec0');
    // Rivet's broad shoulder pads and Ion's antenna establish distinct silhouettes.
    rect(-19,-55,f.i?12:8,f.i?13:9,accent);rect(10,-55,f.i?12:8,f.i?13:9,accent);
    rect(-10,-76,21,18,dark);rect(-8,-75,18,14,armor);rect(0,-70,11,5,accent);rect(3,-69,8,2,'#f5e3c5');
    if(!f.i){rect(-9,-82,2,8,accent);rect(-11,-83,6,2,'#dce9d6');}else{rect(-11,-79,25,4,accent);rect(-13,-75,5,10,dark);}
    limb(-12,-48,-17,-28,8,armor);
    const hx=guard?20:punch?20+extension*34:19,hy=guard?-63:punch?-47: -34;
    limb(12,-49,hx,hy,10,armor);rect(hx-5,hy-6,13,13,accent);rect(hx+3,hy-4,6,9,'#d8ddcc');
    if(f.action==='victory'){limb(-12,-49,-19,-81,8,armor);rect(-25,-90,13,12,accent);}
    if(on(settings.effects)){rect(-16,-50,2,13,accent);rect(13,-45,2,9,accent);if(punch&&extension>.5){c.globalAlpha=.35;rect(hx-16,hy-3,18,4,accent);c.globalAlpha=1;}if(guard){c.strokeStyle='#dddece';c.lineWidth=1;c.strokeRect(18,-73,10,31);}}
    c.restore();
    if(f.messageTime>0&&on(settings.stats)){c.textAlign='center';c.font='9px monospace';c.fillStyle='#f5dec0';c.fillText(f.message,f.x,ground-97);c.textAlign='left';}
  }
  function draw(){
    const sky=c.createLinearGradient(0,0,0,vh);sky.addColorStop(0,'#19253d');sky.addColorStop(.65,'#987878');sky.addColorStop(1,'#263849');c.fillStyle=sky;c.fillRect(0,0,vw,vh);
    c.save();c.translate(ox,oy);c.scale(scale,scale);
    c.fillStyle='#eac29c';c.beginPath();c.arc(474,115,29,0,Math.PI*2);c.fill();
    for(let layer=0;layer<2;layer++)for(let i=0;i<19;i++){
      const x=i*39-25+layer*16,height=27+(i*71%75),y=222+layer*20-height;
      rect(x,y,31,height,'#'+(layer?'304052':'52536b'));rect(x+5,y-4,21,4,layer?'#304052':'#52536b');
      for(let j=0;j<5;j++)for(let k=0;k<3;k++)if((i+j+k)%3!==0)rect(x+6+k*7,y+9+j*13,2,4,layer?'#a69a8f':'#a2928e');
    }
    rect(0,249,W,4,'#172b3b');for(let i=0;i<15;i++){rect(i*47,236,3,40,'#263c4c');rect(i*47,236,19,2,'#536272');}
    rect(0,FLOOR,W,H-FLOOR,'#273849');rect(0,FLOOR,W,3,'#8b8a84');rect(0,FLOOR+3,W,5,'#475766');
    for(let i=0;i<12;i++){rect(i*57-15,FLOOR+26,40,2,'#35485a');rect(i*57+5,FLOOR+50,25,1,'#405164');}
    // Rooftop machinery and original arena markings.
    rect(24,260,41,26,'#415366');rect(29,254,31,7,'#647180');for(let i=0;i<5;i++)rect(33+i*5,265,2,14,'#233847');
    rect(574,251,40,35,'#3b4c5f');rect(580,248,28,4,'#697682');rect(584,259,19,13,'#263a4b');
    rect(W/2-40,FLOOR+41,80,2,'#657483');rect(W/2-25,FLOOR+45,50,1,'#50687a');
    for(const f of fighters)drawFighter(f);
    for(const b of bolts){const color=b.owner?'#f4b38d':settings.color;c.fillStyle=color;c.beginPath();c.moveTo(b.x+10*Math.sign(b.vx),b.y);c.lineTo(b.x,b.y-7);c.lineTo(b.x-10*Math.sign(b.vx),b.y);c.lineTo(b.x,b.y+7);c.closePath();c.fill();rect(b.x-2,b.y-3,4,6,'#eff0d3');if(on(settings.effects)){c.globalAlpha=.3;rect(b.x-24*Math.sign(b.vx),b.y-2,20*Math.sign(b.vx),4,color);c.globalAlpha=1;}}
    if(on(settings.effects))for(const p of sparks){c.globalAlpha=Math.max(0,p.life/.45);rect(p.x,p.y,2,2,p.color);}c.globalAlpha=1;
    if(on(settings.rain)&&!reduced){c.globalAlpha=.25;for(let i=0;i<75;i++){const x=(i*83+time*21)%W,y=(i*37+time*160)%H;rect(x,y,1,6,'#c0d7de');}c.globalAlpha=1;}
    if(on(settings.stats)){
      rect(24,26,241,9,'#263143');rect(375,26,241,9,'#263143');rect(25,27,239*fighters[0].hp/100,7,settings.color);rect(615-239*fighters[1].hp/100,27,239*fighters[1].hp/100,7,'#e7a17e');
      c.font='10px monospace';c.textBaseline='middle';c.fillStyle='#e7e4d3';c.textAlign='left';c.fillText('ION',24,16);c.textAlign='right';c.fillText('RIVET',616,16);c.textAlign='center';c.font='20px monospace';c.fillText(String(Math.ceil(clock)).padStart(2,'0'),W/2,29);
      for(let i=0;i<2;i++){rect(24+i*12,41,7,4,wins[0]>i?settings.color:'#455969');rect(609-i*12,41,7,4,wins[1]>i?'#e7a17e':'#455969');}
      c.font='9px monospace';c.fillStyle='#d7c9c0';c.fillText(`ROUND ${round} / MATCH ${matches} / AUTO FIGHT`,W/2,16);c.textAlign='left';c.fillText('ROOFTOP RIVALS',24,H-13);c.textAlign='right';c.fillText('FIRST TO TWO WINS',W-24,H-13);c.textAlign='left';
    }
    if(phase!=='fight'){
      const title=phase==='intro'?`ROUND ${round}`:phase==='match'?`${winner===0?'ION':'RIVET'} WINS MATCH`:winner<0?'DRAW':`${winner===0?'ION':'RIVET'} WINS ROUND`;
      rect(W/2-100,88,200,28,'#243448');c.font='12px monospace';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f2dfbd';c.fillText(title,W/2,103);c.textAlign='left';
    }
    c.restore();
  }
  function resize(){vh=360;vw=Math.max(190,Math.min(1920,Math.round(vh*Math.max(.2,innerWidth/Math.max(1,innerHeight)))));canvas.width=vw;canvas.height=vh;c.imageSmoothingEnabled=false;scale=Math.min(vw/W,vh/H);ox=(vw-W*scale)/2;oy=(vh-H*scale)/2;}
  function stop(){clearTimeout(timer);cancelAnimationFrame(frame);last=0;accumulator=0;}
  function animate(now){if(paused||document.hidden){stop();return;}const dt=last?Math.min(.15,(now-last)/1000):0;last=now;accumulator+=dt*clamp(Number(settings.speed)||1,.3,2);while(accumulator>=1/120){update(1/120);accumulator-=1/120;}draw();timer=setTimeout(()=>{frame=requestAnimationFrame(animate);},Math.max(0,1000/fps-4));}
  function start(){stop();if(!paused&&!document.hidden)frame=requestAnimationFrame(animate);}
  addEventListener('resize',()=>{resize();draw();});document.addEventListener('visibilitychange',start);
  api?.onSettingsChanged(v=>{settings={...settings,...v};draw();});api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});api?.onPerformanceChanged(v=>{fps=clamp(Number(v)||30,1,60);start();});
  resize();newMatch();
  if(preview!==null||reduced){const target=clamp(Number(preview??12)||0,0,120);for(let i=0;i<target*120;i++)update(1/120);paused=true;draw();}else{draw();start();}
})();
