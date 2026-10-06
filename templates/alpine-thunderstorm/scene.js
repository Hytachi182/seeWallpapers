/* Original offline storm: bounded rain, generated electrical branches and photographic light. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d',{alpha:false}),api=window.seeWallpaper;
  const defaults=JSON.parse(document.getElementById('defaults').textContent);
  let settings={...defaults,...api?.getSettings?.()};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),num=(v,d,a,b)=>clamp(Number.isFinite(Number(v))?Number(v):d,a,b);
  const on=v=>v!==false&&v!=='false'&&v!==0;
  const preview=new URLSearchParams(location.search).get('preview'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seed=preview!==null?873281:Date.now()>>>0;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const rnd=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  let rain=[],time=0,renewals=0,flashes=0,nextStrike=12,bolt=null;
  let ready=false,failed=false,paused=preview!==null||reduced,fps=reduced?15:30,last=0,timer=0,frame=0,accumulator=0;
  let w=1920,h=1080,aw=1920,ah=1080,ox=0,oy=0;
  const photo=new Image(),counts=[250,150,65],X=x=>ox+x*aw,Y=y=>oy+y*ah;
  function drop(layer){return {layer,x:random(),y:random(),fall:.19+layer*.22+random()*.15,len:layer===0?2+random()*3:layer===1?5+random()*7:12+random()*13,alpha:.08+layer*.06+random()*.09};}
  function syncRain(){const amount=num(settings.rain,1,0,2.5),next=[];for(let layer=0;layer<3;layer++){const group=rain.filter(d=>d.layer===layer),count=Math.round(counts[layer]*amount);while(group.length<count)group.push(drop(layer));next.push(...group.slice(0,count));}rain=next;}
  function strike(){
    const x=flashes===0?.49:.29+random()*.42,branches=[];
    function channel(a,b,roughness,depth){
      if(depth===0)return[a,b];
      const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),offset=(random()-.5)*roughness;
      const mid={x:(a.x+b.x)/2-dy/length*offset,y:(a.y+b.y)/2+dx/length*offset};
      return [...channel(a,mid,roughness*.52,depth-1).slice(0,-1),...channel(mid,b,roughness*.52,depth-1)];
    }
    // Hierarchical displacement creates irregular stepped leaders, rather than an even zigzag.
    const points=channel({x,y:.085+random()*.035},{x:x+(random()-.5)*.06,y:.435},.10,6);
    for(let i=0;i<5;i++){const start=points[9+Math.floor(random()*41)],side=random()>.5?1:-1;branches.push(channel(start,{x:clamp(start.x+side*(.025+random()*.09),.18,.84),y:Math.min(.45,start.y+.025+random()*.055)},.026,3));}
    bolt={points,branches,age:0,x};flashes++;nextStrike=time+num(settings.interval,14,6,30)*(.8+random()*.4);
  }
  function update(dt){
    time+=dt;if(bolt){bolt.age+=dt;if(bolt.age>.9)bolt=null;}
    if(on(settings.lightning)&&!reduced&&time>=nextStrike)strike();
    const wind=num(settings.wind,.7,-2,2),gust=.85+.22*Math.sin(time*.31)+.10*Math.sin(time*.83);
    for(const d of rain){d.y+=d.fall*dt;d.x+=wind*gust*d.fall*.18*dt;if(d.y>1.04){d.y=-.04;d.x=random();renewals++;}if(d.x<-.04)d.x=1.04;if(d.x>1.04)d.x=-.04;}
  }
  function resize(){const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt((fps<=15?921600:2073600)/Math.max(1,innerWidth*innerHeight)));w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));if(photo.naturalWidth){const scale=Math.max(w/photo.naturalWidth,h/photo.naturalHeight);aw=photo.naturalWidth*scale;ah=photo.naturalHeight*scale;ox=(w-aw)/2;oy=(h-ah)/2;}}
  function waterClip(){c.beginPath();const points=[[.13,.738],[.94,.738],[.91,.82],[.90,.90],[.85,1],[.265,1],[.23,.865],[.20,.817]];points.forEach(([x,y],i)=>i?c.lineTo(X(x),Y(y)):c.moveTo(X(x),Y(y)));c.closePath();c.clip();}
  function drawWater(energy){
    c.save();waterClip();c.globalCompositeOperation='screen';const amount=num(settings.rain,1,0,2.5);
    for(let i=0;i<55;i++){const phase=(time*(.32+rnd(i)*.20)+rnd(i+44))%1,x=.23+rnd(i+200)*.63,y=.755+rnd(i+270)*.24,r=(.001+phase*.006)*aw;c.strokeStyle=`rgba(173,192,210,${(1-phase)*.09*Math.min(1.5,amount)})`;c.lineWidth=Math.max(.45,aw*.00035);c.beginPath();c.ellipse(X(x),Y(y),r,r*.15,0,0,Math.PI*2);c.stroke();}
    if(energy>0&&bolt)for(let i=0;i<45;i++){const y=.748+i*.0056,x=bolt.x+Math.sin(i*2.1+time*6)*(.002+i*.00012),alpha=energy*.13*(1-i/52);c.strokeStyle=`rgba(208,227,252,${alpha})`;c.lineWidth=Math.max(.7,ah*.001);c.beginPath();c.moveTo(X(x-.007-rnd(i+8)*.011),Y(y));c.lineTo(X(x+.007+rnd(i+10)*.011),Y(y));c.stroke();}c.restore();
  }
  function haze(){c.save();for(let i=0;i<4;i++){const x=.20+i*.19+Math.sin(time*.035+i)*.012,y=.688+Math.sin(time*.045+i)*.008;c.translate(X(x),Y(y));c.scale(1,.13);const r=aw*.20,g=c.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'rgba(137,161,180,.047)');g.addColorStop(1,'rgba(137,161,180,0)');c.fillStyle=g;c.fillRect(-r,-r,r*2,r*2);c.setTransform(1,0,0,1,0,0);}c.restore();}
  function lightning(energy){
    if(!bolt||energy<=0)return;c.save();c.globalCompositeOperation='screen';
    // Cloud light is broad; the whole landscape only receives a restrained short lift.
    c.fillStyle=`rgba(196,213,239,${energy*.11})`;c.fillRect(0,0,w,h);
    const g=c.createRadialGradient(X(bolt.x),Y(.23),0,X(bolt.x),Y(.23),aw*.27);g.addColorStop(0,`rgba(184,207,242,${energy*.30})`);g.addColorStop(1,'rgba(184,207,242,0)');c.fillStyle=g;c.fillRect(0,0,w,h);
    c.beginPath();c.rect(X(.17),Y(0),aw*.69,ah*.47);c.clip();c.lineJoin='round';c.lineCap='round';
    for(const [index,path] of [bolt.points,...bolt.branches].entries())for(const [width,alpha] of [[8,.09],[3,.30],[.85,3.2]]){
      c.strokeStyle=`rgba(231,242,255,${Math.min(.95,energy*alpha*(index===0?1:.34))})`;c.lineWidth=Math.max(.45,width*aw/1672)*(index===0?1:.65);c.beginPath();path.forEach((p,i)=>i?c.lineTo(X(p.x),Y(p.y)):c.moveTo(X(p.x),Y(p.y)));c.stroke();
    }c.restore();
  }
  function draw(){
    if(!ready||failed)return;c.globalAlpha=1;c.globalCompositeOperation='source-over';c.drawImage(photo,ox,oy,aw,ah);
    const visible=on(settings.lightning)&&!reduced&&bolt;
    const energy=visible?(Math.exp(-bolt.age/.14)+.27*Math.exp(-Math.pow((bolt.age-.25)/.055,2)))*num(settings.flash,.55,.1,1):0;
    if(on(settings.mist))haze();lightning(energy);if(on(settings.water))drawWater(energy);
    const scale=Math.max(.35,Math.min(w,h)/1080),wind=num(settings.wind,.7,-2,2),gust=.85+.22*Math.sin(time*.31)+.10*Math.sin(time*.83);
    for(const d of rain){const x=d.x*w,y=d.y*h,len=d.len*scale,dx=wind*gust*len*.28,alpha=d.alpha*(d.layer===2?.8:1),fade=clamp((1.03-d.y)/.055,0,1);c.strokeStyle=`rgba(193,211,227,${alpha*fade})`;c.lineWidth=Math.max(.35,(d.layer===0?.45:d.layer===1?.7:1.05)*scale);c.beginPath();c.moveTo(x-dx,y-len);c.lineTo(x,y);c.stroke();}
  }
  function stop(){clearTimeout(timer);cancelAnimationFrame(frame);last=0;accumulator=0;}
  function animate(now){if(paused||!ready||failed||document.hidden){stop();return;}const begin=performance.now(),dt=last?Math.min(.15,(now-last)/1000):0;last=now;accumulator+=dt*num(settings.speed,1,0,2);while(accumulator>=1/60){update(1/60);accumulator-=1/60;}draw();timer=setTimeout(()=>{frame=requestAnimationFrame(animate);},Math.max(0,1000/fps-(performance.now()-begin)-3));}
  function start(){stop();if(!paused&&ready&&!failed&&!document.hidden)frame=requestAnimationFrame(animate);}
  addEventListener('resize',()=>{resize();draw();});document.addEventListener('visibilitychange',start);
  api?.onSettingsChanged(v=>{const old=settings.interval;settings={...settings,...v};if(settings.interval!==old)nextStrike=time+num(settings.interval,14,6,30);syncRain();draw();});
  api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});api?.onPerformanceChanged(v=>{fps=num(v,30,1,reduced?15:60);resize();draw();start();});
  resize();syncRain();if(preview!==null){const target=num(preview,12.08,0,120);for(let i=0;i<target*60;i++)update(1/60);}
  photo.onload=()=>{ready=true;resize();document.getElementById('fallback').hidden=true;draw();start();};photo.onerror=()=>{failed=true;stop();document.getElementById('error').hidden=false;};photo.src='background.jpg';
})();
