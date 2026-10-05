/* Neon Rally: original code-drawn court and type, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d',{alpha:false}),api=window.seeWallpaper;
  let settings={...JSON.parse(document.getElementById('defaults').textContent),...api?.getSettings()};
  const preview=new URLSearchParams(location.search).get('preview'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const on=v=>v!==false&&v!=='false'&&v!==0,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const W=640,H=360,TOP=89,BOTTOM=301,RADIUS=4,PADDLE_HALF=24,LEFT=43,RIGHT=597;
  let seed=preview!==null?120791:Date.now()>>>0;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  let ball,paddles=[],score=[0,0],wins=[0,0],match=0,points=0,returns=0,wallHits=0,longest=0,rally=0,time=0,trail=[],pulse=0;
  let phase='serve',phaseTime=0,server=0,winner=-1,vw=640,vh=360,scale=1,ox=0,oy=0;
  let paused=reduced,fps=reduced?15:30,last=0,accumulator=0,timer=0,frame=0;
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  function prepareServe(side){server=side;rally=0;trail=[];ball={x:W/2,y:(TOP+BOTTOM)/2,vx:0,vy:0};phase='serve';phaseTime=0;for(const p of paddles){p.error=(random()-.5)*84;p.reaction=0;p.target=(TOP+BOTTOM)/2;}}
  function newMatch(){match++;score=[0,0];paddles=[{y:195,velocity:0,target:195,error:0,reaction:0},{y:195,velocity:0,target:195,error:0,reaction:0}];winner=-1;prepareServe(Math.floor(random()*2));}
  function launch(){const angle=(random()-.5)*.95;ball.vx=(server===0?1:-1)*220*Math.cos(angle);ball.vy=220*Math.sin(angle);phase='play';phaseTime=0;}
  function predict(plane){
    const t=Math.max(0,(plane-ball.x)/ball.vx),span=BOTTOM-TOP-2*RADIUS;
    const unfolded=ball.y+ball.vy*t-(TOP+RADIUS),folded=((unfolded%(span*2))+(span*2))%(span*2);
    return TOP+RADIUS+(folded<=span?folded:2*span-folded);
  }
  function pointTo(i){points++;score[i]++;pulse=.6;longest=Math.max(longest,rally);if(score[i]>=7){winner=i;wins[i]++;phase='match';phaseTime=0;trail=[];}else prepareServe(1-i);}
  function rebound(i){
    const paddle=paddles[i],offset=clamp((ball.y-paddle.y)/PADDLE_HALF,-1,1),angle=clamp(offset*1.02+paddle.velocity*.00065,-1.12,1.12);
    rally++;returns++;longest=Math.max(longest,rally);pulse=.25;
    const speed=Math.min(490,220+rally*15);ball.vx=(i===0?1:-1)*speed*Math.cos(angle);ball.vy=speed*Math.sin(angle);
    paddles[1-i].error=(random()-.5)*84;paddles[1-i].reaction=0;
  }
  function update(dt){
    time+=dt;pulse=Math.max(0,pulse-dt);for(const p of trail)p.age+=dt;trail=trail.filter(p=>p.age<.22);
    if(phase==='match'){phaseTime+=dt;if(phaseTime>=2.6)newMatch();return;}
    for(let i=0;i<2;i++){
      const p=paddles[i];p.reaction-=dt;
      if(p.reaction<=0){const incoming=phase==='play'&&(i===0?ball.vx<0:ball.vx>0);p.target=incoming?predict(i===0?LEFT+RADIUS:RIGHT-RADIUS)+p.error:(TOP+BOTTOM)/2;p.reaction=.12+random()*.07;}
      const old=p.y;p.y=clamp(p.y+clamp(p.target-p.y,-270*dt,270*dt),TOP+PADDLE_HALF,BOTTOM-PADDLE_HALF);p.velocity=(p.y-old)/dt;
    }
    if(phase==='serve'){phaseTime+=dt;if(phaseTime>=1)launch();return;}
    const oldX=ball.x;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    if(ball.y<TOP+RADIUS){ball.y=2*(TOP+RADIUS)-ball.y;ball.vy=Math.abs(ball.vy);wallHits++;pulse=.15;}
    else if(ball.y>BOTTOM-RADIUS){ball.y=2*(BOTTOM-RADIUS)-ball.y;ball.vy=-Math.abs(ball.vy);wallHits++;pulse=.15;}
    for(let i=0;i<2;i++){
      const plane=i===0?LEFT+RADIUS:RIGHT-RADIUS,crossed=i===0?ball.vx<0&&oldX>=plane&&ball.x<=plane:ball.vx>0&&oldX<=plane&&ball.x>=plane;
      if(crossed&&Math.abs(ball.y-paddles[i].y)<=PADDLE_HALF+RADIUS){ball.x=plane;rebound(i);break;}
    }
    if(ball.x<-RADIUS){pointTo(1);return;}if(ball.x>W+RADIUS){pointTo(0);return;}
    trail.push({x:ball.x,y:ball.y,age:0});if(trail.length>28)trail.shift();
  }
  const digits=[['111','101','101','101','111'],['010','110','010','010','111'],['111','001','111','100','111'],['111','001','111','001','111'],['101','101','111','001','001'],['111','100','111','001','111'],['111','100','111','101','111'],['111','001','010','010','010'],['111','101','111','101','111'],['111','101','111','001','111']];
  function digit(n,x,y,color){digits[n].forEach((row,j)=>[...row].forEach((p,i)=>{if(p==='1')rect(x+i*9,y+j*9,7,7,color);}));}
  function draw(){
    rect(0,0,vw,vh,'#060f18');c.save();c.translate(ox,oy);c.scale(scale,scale);
    rect(18,TOP-10,W-36,BOTTOM-TOP+20,'#0b1c29');
    if(on(settings.glow)){
      const g=c.createLinearGradient(0,TOP,0,BOTTOM);g.addColorStop(0,'#173e46');g.addColorStop(.5,'#0c202c');g.addColorStop(1,'#183440');c.fillStyle=g;c.fillRect(18,TOP-10,W-36,BOTTOM-TOP+20);
      c.globalAlpha=.25;rect(18,TOP-8,W-36,2,settings.color);rect(18,BOTTOM+6,W-36,2,settings.color);c.globalAlpha=1;
    }
    rect(18,TOP-1,W-36,1,'#537785');rect(18,BOTTOM,W-36,1,'#537785');
    for(let y=TOP+7;y<BOTTOM-4;y+=15)rect(W/2-1,y,2,7,'#345260');
    for(const x of [18,W-19]){rect(x,TOP,1,20,'#7c9698');rect(x,BOTTOM-20,1,20,'#7c9698');}
    if(on(settings.trail)&&!reduced)for(const p of trail){c.globalAlpha=(1-p.age/.22)*.35;rect(p.x-RADIUS,p.y-RADIUS,RADIUS*2,RADIUS*2,settings.color);}c.globalAlpha=1;
    paddles.forEach((p,i)=>{
      const x=i===0?LEFT-7:RIGHT,color=i===0?settings.color:'#eeb29a';
      if(on(settings.glow)){c.globalAlpha=.12;rect(x-4,p.y-PADDLE_HALF-4,15,PADDLE_HALF*2+8,color);c.globalAlpha=1;}
      rect(x,p.y-PADDLE_HALF,7,PADDLE_HALF*2,color);rect(x+2,p.y-PADDLE_HALF+3,2,PADDLE_HALF*2-6,'#ecf1df');
    });
    if(phase!=='match'){
      if(on(settings.glow)){c.globalAlpha=.18;rect(ball.x-8,ball.y-8,16,16,'#e6f4dc');c.globalAlpha=1;}
      rect(ball.x-RADIUS,ball.y-RADIUS,RADIUS*2,RADIUS*2,'#f4edd4');rect(ball.x-2,ball.y-2,3,3,'#ffffff');
    }
    if(on(settings.stats)){
      digit(score[0],W/2-66,25,settings.color);digit(score[1],W/2+40,25,'#eeb29a');
      c.font='9px monospace';c.textBaseline='middle';c.fillStyle='#bed6d7';c.textAlign='left';c.fillText('NEON RALLY',24,25);c.fillText(`MINT / ${wins[0]} WINS`,24,43);
      c.textAlign='right';c.fillText(`MATCH ${String(match).padStart(2,'0')}`,W-24,25);c.fillText(`CORAL / ${wins[1]} WINS`,W-24,43);
      c.fillText(`LONGEST ${longest}`,W-24,331);c.textAlign='left';c.fillText('AUTO PLAY / FIRST TO SEVEN',24,331);
      c.textAlign='center';c.fillStyle='#d8dbbe';c.fillText(`${rally} RETURNS`,W/2,331);c.textAlign='left';
    }
    if(phase==='match'){
      rect(W/2-100,174,200,29,'#112b39');c.textAlign='center';c.font='12px monospace';c.textBaseline='middle';c.fillStyle=winner===0?settings.color:'#eeb29a';c.fillText(`${winner===0?'MINT':'CORAL'} WINS MATCH`,W/2,189);c.textAlign='left';
    }else if(phase==='serve'&&on(settings.stats)){
      c.font='9px monospace';c.textAlign='center';c.fillStyle='#abc1c5';c.fillText('SERVE',W/2,TOP+24);c.textAlign='left';
      rect(W/2-20,TOP+33,40,2,'#345260');rect(W/2-20,TOP+33,40*clamp(phaseTime,0,1),2,settings.color);
    }
    if(on(settings.glow)&&pulse>0){c.globalAlpha=pulse*.2;rect(18,TOP-2,W-36,2,settings.color);rect(18,BOTTOM,W-36,2,settings.color);c.globalAlpha=1;}
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
