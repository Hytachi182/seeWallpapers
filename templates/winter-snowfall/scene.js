/* Original offline photographic snowfall, with cached flake sprites and bounded depth layers. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d',{alpha:false}),api=window.seeWallpaper;
  const defaults=JSON.parse(document.getElementById('defaults').textContent);
  let settings={...defaults,...api?.getSettings?.()};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),num=(v,d,a,b)=>clamp(Number.isFinite(Number(v))?Number(v):d,a,b);
  const on=v=>v!==false&&v!=='false'&&v!==0;
  const preview=new URLSearchParams(location.search).get('preview'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seed=preview!==null?379841:Date.now()>>>0;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  let flakes=[],time=0,respawns=0,w=1920,h=1080,ready=false,failed=false;
  let paused=preview!==null||reduced,fps=reduced?15:30,timer=0,frame=0,last=0,accumulator=0;
  const photo=new Image(),baseCounts=[220,110,26];
  function makeFlake(layer){
    return {layer,x:random(),y:random(),r:layer===0?.55+random()*.65:layer===1?1.1+random()*1.4:2.8+random()*3.8,
      fall:layer===0?.025+random()*.025:layer===1?.048+random()*.048:.09+random()*.08,
      alpha:layer===0?.30+random()*.26:layer===1?.45+random()*.29:.25+random()*.25,
      phase:random()*Math.PI*2,rate:.6+random()*1.3,sway:random()*.7+.3};
  }
  function syncDensity(){
    const density=num(settings.density,1,.2,2.5),next=[];
    for(let layer=0;layer<3;layer++){
      const group=flakes.filter(f=>f.layer===layer),count=Math.round(baseCounts[layer]*density);
      while(group.length<count)group.push(makeFlake(layer));next.push(...group.slice(0,count));
    }flakes=next;
  }
  function sprite(blur){
    const s=document.createElement('canvas');s.width=s.height=64;const sc=s.getContext('2d');
    // Tiny uneven clumps look like photographed flakes, not decorative snowflake icons.
    sc.filter=`blur(${blur}px)`;sc.fillStyle='#f2f6fa';
    for(const [x,y,rx,ry] of [[32,32,12,11],[25,28,6,5],[39,34,5,7],[30,39,6,4]]){sc.beginPath();sc.ellipse(x,y,rx,ry,.3,0,Math.PI*2);sc.fill();}
    return s;
  }
  const crisp=sprite(0),soft=sprite(1.8),near=sprite(4.5);
  function update(dt){
    time+=dt;const wind=num(settings.wind,.35,-2,2),gust=Math.sin(time*.27)*.35+Math.sin(time*.71+1.3)*.12;
    for(const f of flakes){
      const depth=[.38,.7,1.15][f.layer];
      f.y+=f.fall*dt;
      f.x+=(wind*(.020+gust*.012)*depth+Math.sin(time*f.rate+f.phase)*.008*f.sway*depth)*dt;
      if(f.y>1.035){f.y=-.03;f.x=random();respawns++;}
      if(f.x<-.035)f.x=1.035;if(f.x>1.035)f.x=-.035;
    }
  }
  function resize(){
    const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt((fps<=15?921600:2073600)/Math.max(1,innerWidth*innerHeight)));
    w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));
  }
  function draw(){
    if(!ready||failed)return;c.globalAlpha=1;
    const cover=Math.max(w/photo.naturalWidth,h/photo.naturalHeight),aw=photo.naturalWidth*cover,ah=photo.naturalHeight*cover;
    c.drawImage(photo,(w-aw)/2,(h-ah)/2,aw,ah);
    if(on(settings.chalet))chalet((w-aw)/2,(h-ah)/2,aw,ah);
    const scale=Math.max(.35,Math.min(w,h)/1080),size=num(settings.size,1,.5,1.8),focus=on(settings.focus);
    for(const f of flakes){
      if(f.layer===2&&!on(settings.foreground))continue;
      // Edge feathering avoids abrupt appearance at the top and disappearance on the snowbank.
      const fade=clamp((f.y+.025)/.055,0,1)*clamp((1.025-f.y)/.065,0,1);
      c.globalAlpha=f.alpha*fade*(.88+.12*Math.sin(time*.5+f.phase));
      const r=f.r*scale*size,stamp=focus?(f.layer===2?near:f.layer===0?soft:crisp):crisp;
      c.drawImage(stamp,f.x*w-r*2,f.y*h-r*2,r*4,r*4);
    }c.globalAlpha=1;
  }
  // Chalet life, mapped onto the photograph: chimney top and lit window centres in image fractions.
  const CHIMNEY=[.481,.475],WINDOWS=[[.433,.599,.016,.032],[.502,.579,.012,.028],[.529,.575,.012,.028],[.502,.645,.019,.03],[.557,.635,.009,.028]];
  const BRANCHES=[[.09,.31],[.04,.6],[.93,.44],[.72,.33]];
  function chalet(ox,oy,aw,ah){
    const wind=num(settings.wind,.35,-2,2),X=x=>ox+x*aw,Y=y=>oy+y*ah;
    c.save();c.globalCompositeOperation='screen';
    WINDOWS.forEach(([x,y,ww,wh],i)=>{
      const flicker=.55+.25*Math.sin(time*6.3+i*2.1)+.15*Math.sin(time*11.7+i)+.1*Math.sin(time*2.1+i*4);
      const r=Math.max(ww,wh)*aw*1.6,g=c.createRadialGradient(X(x),Y(y),0,X(x),Y(y),r);
      g.addColorStop(0,`rgba(255,170,80,${.32*flicker})`);g.addColorStop(1,'rgba(255,150,60,0)');c.fillStyle=g;c.fillRect(X(x)-r,Y(y)-r,r*2,r*2);
    });
    // Valley mist drifting slowly across the lake.
    for(let i=0;i<4;i++){
      const phase=((time*(.012+i*.004)+i*.27)%1.4+1.4)%1.4-.2,mx=X(phase),my=Y(.455+i*.012),rx=aw*(.18+i*.05),ry=ah*.018;
      const g=c.createRadialGradient(mx,my,0,mx,my,rx);g.addColorStop(0,'rgba(170,190,220,.10)');g.addColorStop(1,'rgba(170,190,220,0)');
      c.fillStyle=g;c.save();c.translate(mx,my);c.scale(1,ry/rx);c.translate(-mx,-my);c.fillRect(mx-rx,my-rx,rx*2,rx*2);c.restore();
    }
    c.restore();
    const unit=ah/941;
    for(let j=0;j<14;j++){
      const p=((time*.09)+j/14)%1,r=(7+p*36)*unit;
      const sx=X(CHIMNEY[0])+(wind*.6+.25)*p*120*unit+Math.sin(time*.9+j*1.7)*6*unit*p,sy=Y(CHIMNEY[1])-p*190*unit;
      c.globalAlpha=.34*(1-p)*Math.min(1,p*8);c.fillStyle='#d3dbe8';c.beginPath();c.ellipse(sx,sy,r,r*.8,0,0,Math.PI*2);c.fill();
    }
    // Every few seconds a branch somewhere sheds a clump of snow.
    BRANCHES.forEach(([bx,by],i)=>{
      const period=9+i*2.7,p=((time+i*3.1)/period)%1;if(p>.3)return;
      const t=p*period;
      for(let k=0;k<22;k++){
        const a=(k*2.399)%6.283,spread=(.4+((k*37)%11)/11)*18*unit;
        const px=X(bx)+Math.cos(a)*spread*t+wind*t*12*unit,py=Y(by)+Math.sin(a)*spread*.4*t+t*t*140*unit;
        c.globalAlpha=Math.max(0,.75*(1-t/(period*.3)));c.fillStyle='#eef3fa';c.beginPath();c.arc(px,py,(1.2+(k%3))*unit*1.4,0,Math.PI*2);c.fill();
      }
    });
    c.globalAlpha=1;
  }
  function stop(){clearTimeout(timer);cancelAnimationFrame(frame);last=0;accumulator=0;}
  function animate(now){
    if(paused||!ready||failed||document.hidden){stop();return;}
    const begin=performance.now(),dt=last?Math.min(.15,(now-last)/1000):0;last=now;accumulator+=dt*num(settings.speed,1,0,2);
    while(accumulator>=1/60){update(1/60);accumulator-=1/60;}draw();timer=setTimeout(()=>{frame=requestAnimationFrame(animate);},Math.max(0,1000/fps-(performance.now()-begin)-3));
  }
  function start(){stop();if(!paused&&ready&&!failed&&!document.hidden)frame=requestAnimationFrame(animate);}
  addEventListener('resize',()=>{resize();draw();});document.addEventListener('visibilitychange',start);
  api?.onSettingsChanged(v=>{settings={...settings,...v};syncDensity();draw();});api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});
  api?.onPerformanceChanged(v=>{fps=num(v,30,1,reduced?15:60);resize();draw();start();});
  resize();syncDensity();if(preview!==null||reduced){const target=num(preview??12,12,0,120);for(let i=0;i<target*60;i++)update(1/60);}
  photo.onload=()=>{ready=true;document.getElementById('fallback').hidden=true;draw();start();};
  photo.onerror=()=>{failed=true;stop();document.getElementById('error').hidden=false;};photo.src='background.jpg';
})();
