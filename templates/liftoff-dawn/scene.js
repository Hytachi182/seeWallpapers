/* Liftoff Dawn: original code-drawn rocket launch, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), c=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  const TAU=Math.PI*2, mod=(a,b)=>((a%b)+b)%b, mix=(a,b,t)=>a+(b-a)*t, mixc=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  let settings={speed:1,daylight:.3,clouds:true,stars:true,clock:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2), daylight=()=>num('daylight',.3,0,1);
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):0, paused=preview, fps=30;
  let w=1,h=1,u=1,gy=0,px=0;

  const css=(a,alpha=1)=>`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${clamp(alpha,0,1).toFixed(3)})`;
  // One launch lasts CYCLE seconds: countdown, ignition, liftoff, stage separation, fade, repeat.
  const CYCLE=46, LIFT=16, IGN=11.5, SEP=LIFT+9;
  // Rocket altitude above the pad (world px) and lateral drift, as pure functions of seconds since liftoff.
  const alt=s=>s<0?0:14*s*s+(s>3?.6*Math.pow(s-3,3):0);
  const drift=a=>.045*Math.max(0,a-1000);
  const tilt=a=>.06*smooth((a-900)/1800);
  // Where the rocket base sits on screen (px above the pad): the camera rises with it, then lets it climb out of frame.
  const shown=(a,s)=>(a<250?a:250+230*(1-Math.exp(-(a-250)/700)))+30*Math.pow(Math.max(0,s-19),2);
  const day01=d=>smooth(d*1.4);

  function sky(d,a){
    const night=[[6,9,26],[24,28,64]], dawn=[[255,176,122],[64,96,168]], day=[[176,214,246],[58,128,214]];
    let hz,zn;
    if(d<.5){const t=d/.5;hz=mixc(night[0],dawn[0],t);zn=mixc(night[1],dawn[1],t);}
    else{const t=(d-.5)/.5;hz=mixc(dawn[0],day[0],t);zn=mixc(dawn[1],day[1],t);}
    const sp=smooth((a-1500)/7500);
    return {hz:mixc(hz,[4,6,16],sp*.96),zn:mixc(zn,[2,3,10],Math.min(1,sp*1.2)),space:sp};
  }

  function drawStars(t,sp,d,enabled){
    const vis=Math.max(enabled?Math.max(0,1-d*1.6):0,sp*.95);
    if(vis<.02)return;
    for(let i=0;i<190;i++){
      const x=hash(i*1.7)*w, y=hash(i*3.1)*h*(.9-.35*sp), tw=.6+.4*Math.sin(t*(.8+hash(i)*2)+i);
      c.fillStyle=css([235,240,255],vis*tw*(.35+hash(i*5.3)*.65));
      const s=(hash(i*9.7)>.9?2.2:1.2)*Math.max(1,u);
      c.fillRect(x,y,s,s);
    }
  }

  function earth(sp,d){
    const e=smooth((sp-.25)/.6); if(e<=.01)return;
    const r=w*2.4, cx=w*.42, cy=h*(1.12-.2*e)+r, dk=day01(d);
    const g=c.createRadialGradient(cx,cy,r*.985,cx,cy,r*1.012);g.addColorStop(0,css(mixc([30,70,150],[90,170,255],dk),0));g.addColorStop(.5,css(mixc([40,90,190],[120,200,255],dk),.9*e));g.addColorStop(1,css([120,200,255],0));
    c.fillStyle=g;c.fillRect(0,h*.4,w,h*.7);
    c.fillStyle=css(mixc([6,14,36],[14,40,96],dk),e);c.beginPath();c.arc(cx,cy,r*.99,0,TAU);c.fill();
    c.fillStyle=css([255,200,140],.16*e);c.beginPath();c.ellipse(w*.2,h*(1.12-.2*e)+8*u,w*.18,8*u,0,0,TAU);c.fill();
  }
  function drawClouds(t,cam,d,sp){
    if(sp>.97)return;
    const warm=mixc([255,196,160],[255,255,255],smooth((d-.2)/.6)), dim=mixc([34,40,70],warm,smooth(d*1.8));
    for(let i=0;i<22;i++){
      const wy=140+hash(i*4.1)*2600, sc=.7+hash(i*2.3)*1.4, par=.55+hash(i*7.7)*.35;
      const x=mod(hash(i*1.3)*(w+700)+t*(4+hash(i*8.8)*8)*u,w+700)-350;
      const y=gy-wy*u*par+cam*par-140*u;
      if(y<-200*u||y>h+100*u)continue;
      const alpha=.5*(1-sp)*(.5+.5*hash(i*6.1));
      for(let k=0;k<6;k++){
        const rx=(70+hash(i*10+k)*60)*sc*u, ry=rx*.38, ox=(k-2.5)*rx*.7;
        c.fillStyle=css(k%2?dim:mixc(dim,[255,255,255],.25),alpha);
        c.beginPath();c.ellipse(x+ox,y+Math.sin(k*1.7)*ry*.3,rx,ry,0,0,TAU);c.fill();
      }
    }
  }

  function ground(t,cam,d){
    const gTop=gy+cam, hz=gTop-100*u;
    if(hz>h+10)return;
    const night=1-smooth(d*1.5), dk=day01(d);
    const sea=mixc([20,30,56],[52,116,170],smooth(d*1.2)), glow=Math.max(0,1-Math.abs(d-.3)*2.2);
    let g=c.createLinearGradient(0,hz,0,gTop);g.addColorStop(0,css(mixc(sea,[255,190,150],.5*glow)));g.addColorStop(1,css(sea.map(v=>v*.7)));
    c.fillStyle=g;c.fillRect(0,hz,w,gTop-hz+2);
    for(let i=0;i<36;i++){
      const y=hz+hash(i*2.3)*(gTop-hz-6*u), wd=(18+hash(i)*60)*u*(1-(y-hz)/(gTop-hz)*.4);
      c.fillStyle=css([255,214,160],.28*glow*(.5+.5*Math.sin(t*1.5+i)));
      c.fillRect(w*.2+(hash(i*4.7)-.5)*220*u-wd/2,y,wd,1.5*u);
    }
    c.fillStyle=css(mixc([10,16,30],[60,90,100],dk));
    c.beginPath();c.moveTo(0,hz);c.quadraticCurveTo(w*.15,hz-60*u,w*.34,hz-14*u);c.quadraticCurveTo(w*.42,hz-4*u,w*.5,hz);c.fill();
    const land=mixc([14,22,26],[78,112,84],smooth(d*1.3));
    g=c.createLinearGradient(0,gTop,0,gTop+h*.6);g.addColorStop(0,css(land));g.addColorStop(1,css(land.map(v=>v*.55)));
    c.fillStyle=g;c.fillRect(0,gTop,w,h);
    c.fillStyle=css(mixc([40,44,52],[150,150,156],dk));c.fillRect(px-190*u,gTop,380*u,14*u);
    c.fillStyle=css(mixc([22,24,30],[88,88,96],dk));c.fillRect(px-190*u,gTop+14*u,380*u,30*u);
    c.fillStyle='rgba(0,0,0,.55)';c.fillRect(px-50*u,gTop,100*u,8*u);
    // launch tower with swing arms that retract at ignition
    const tx=px-130*u, th=520*u, tw=46*u, steel=css(mixc([30,34,44],[120,124,136],dk));
    c.strokeStyle=steel;c.fillStyle=steel;c.lineWidth=Math.max(1.5,3*u);
    c.strokeRect(tx-tw/2,gTop-th,tw,th);
    for(let i=0;i<14;i++){const y=gTop-th+i*th/14;c.beginPath();c.moveTo(tx-tw/2,y+(i%2?0:th/14));c.lineTo(tx+tw/2,y+(i%2?th/14:0));c.stroke();}
    for(let i=1;i<5;i++)c.fillRect(tx-tw/2-4*u,gTop-th+i*th/5,tw+8*u,5*u);
    const retract=smooth((tcNow-(IGN-1))/1.4);
    for(const ay of [.28,.62])c.fillRect(tx+tw/2,gTop-th*ay,(130-retract*126)*u,6*u);
    c.fillRect(tx-2*u,gTop-th-60*u,4*u,60*u);
    c.fillStyle=css([255,70,60],Math.sin(t*5)>.2?1:.15);c.beginPath();c.arc(tx,gTop-th-62*u,4*u,0,TAU);c.fill();
    if(night>.25){
      for(const fx of [px+170*u,px-200*u,px+60*u]){
        const gg=c.createRadialGradient(fx,gTop-54*u,0,fx,gTop-54*u,150*u);gg.addColorStop(0,css([255,244,200],.4*night));gg.addColorStop(1,css([255,244,200],0));
        c.fillStyle=gg;c.fillRect(fx-150*u,gTop-204*u,300*u,300*u);
        c.fillStyle='#222';c.fillRect(fx-1.5*u,gTop-54*u,3*u,54*u);c.fillStyle=css([255,250,215],.4+.6*night);c.fillRect(fx-8*u,gTop-58*u,16*u,5*u);
      }
    }
    c.fillStyle=css(mixc([16,18,24],[96,98,106],dk));c.fillRect(px+250*u,gTop-40*u,150*u,40*u);
    c.fillStyle=css([255,214,120],.2+.7*night);for(let i=0;i<5;i++)c.fillRect(px+262*u+i*26*u,gTop-28*u,12*u,8*u);
  }

  function puff(x,y,r,col,a){
    if(a<=.004)return;
    const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,css(col,a));g.addColorStop(.6,css(col,a*.6));g.addColorStop(1,css(col,0));
    c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
  }
  function padSmoke(tc,cam,d){
    const ts=tc-IGN; if(ts<0||ts>20)return;
    const gTop=gy+cam;
    for(let i=0;i<64;i++){
      const age=ts-i*.2; if(age<0||age>13)continue;
      const dir=i%2?1:-1, v=(60+hash(i*3.3)*220)*(1-age/16);
      const x=px+dir*(30+(1-Math.exp(-age*.55))*v*3.4)*u+(hash(i*7.7)-.5)*60*u;
      const y=gTop-(10+age*(18+hash(i)*20)+Math.sqrt(age)*14)*u;
      const r=(46+age*26+hash(i*5.1)*40)*u, glow=Math.max(0,1-age/2.5);
      const base=mixc([120,110,110],mixc([196,198,206],[255,255,255],smooth(d)),smooth(d*1.4+.2));
      puff(x,y,r,mixc(base,[255,170,90],glow*.5),Math.min(1,age*2)*(1-age/13)*.62);
    }
    const f=smooth((ts-.2)/1.5)*(1-smooth((ts-6)/5));
    if(f>0){const g=c.createRadialGradient(px,gTop,0,px,gTop,420*u);g.addColorStop(0,css([255,190,110],.5*f));g.addColorStop(1,css([255,190,110],0));c.fillStyle=g;c.fillRect(px-420*u,gTop-420*u,840*u,840*u);}
  }

  function trail(tc,cam,d,sp){
    const s=tc-LIFT; if(s<.3)return;
    for(let i=430;i>=0;i--){
      const te=s-i*.022; if(te<.15)continue;
      const age=i*.022, fade=1-age/9.5; if(fade<=0)continue;
      const a=alt(te), x=px+(drift(a)+(hash(i*2.9+Math.floor(te*10))-.5)*(8+age*22))*u, y=gy+cam-(a-6)*u+age*12*u;
      if(y>h+200*u)continue;
      const hot=Math.max(0,1-age/.8);
      puff(x,y,(20+age*20)*u,mixc(mixc([210,214,224],[255,255,255],smooth(d)),[255,190,110],hot*.8),.3*fade*(1-sp*.25));
    }
  }

  const W=46, NOSE=250;
  function lowerStage(a){
    c.fillStyle=css([238,240,244],a);c.fillRect(-W/2,-130,W,130);
    c.fillStyle=css([200,204,212],a);c.fillRect(W/2-9,-130,9,130);
    c.fillStyle=css([27,31,42],a);c.fillRect(-W/2,-130,W,10);c.fillRect(-W/2,-20,W,12);
    c.fillStyle=css([230,70,50],a);c.fillRect(-W/2,-52,W,16);
    c.fillStyle=css([150,154,166],a);c.fillRect(-W/2+14,0,W-28,10);
    c.fillStyle=css([230,70,50],a);
    c.beginPath();c.moveTo(-W/2,-62);c.lineTo(-W/2-30,2);c.lineTo(-W/2,-10);c.fill();
    c.beginPath();c.moveTo(W/2,-62);c.lineTo(W/2+30,2);c.lineTo(W/2,-10);c.fill();
  }
  function upperStage(){
    c.fillStyle='#eef0f4';c.fillRect(-W/2,-NOSE,W,120);
    c.fillStyle='#c8ccd6';c.fillRect(W/2-9,-NOSE,9,120);
    c.fillStyle='#1b1f2a';c.fillRect(-W/2,-NOSE+82,W,10);
    c.fillStyle='#e8412e';c.beginPath();c.moveTo(-W/2,-NOSE);c.bezierCurveTo(-W/2,-NOSE-60,-6,-NOSE-92,0,-NOSE-106);c.bezierCurveTo(6,-NOSE-92,W/2,-NOSE-60,W/2,-NOSE);c.fill();
    c.fillStyle='rgba(255,255,255,.22)';c.beginPath();c.moveTo(-W/2+6,-NOSE);c.bezierCurveTo(-W/2+6,-NOSE-50,-8,-NOSE-82,-2,-NOSE-96);c.lineTo(-6,-NOSE-60);c.lineTo(-W/2+14,-NOSE);c.fill();
    for(const y of [-NOSE+30,-NOSE+54]){
      c.fillStyle='#6fb6ec';c.beginPath();c.arc(-2,y,8,0,TAU);c.fill();c.strokeStyle='#1b1f2a';c.lineWidth=3;c.stroke();
      c.fillStyle='rgba(255,255,255,.55)';c.fillRect(-6,y-5,4,4);
    }
  }
  function flame(t,scale,len){
    const L=len*scale*(1+Math.sin(t*38)*.07+Math.sin(t*61)*.05), wd=30*Math.min(1,scale*1.2);
    c.save();c.globalCompositeOperation='lighter';
    for(const [wm,lm,col] of [[1.5,1,[255,110,40,.5]],[1,.78,[255,190,80,.8]],[.5,.5,[255,250,220,.95]]]){
      const g=c.createLinearGradient(0,0,0,L*lm);g.addColorStop(0,css(col,col[3]));g.addColorStop(1,css(col,0));
      c.fillStyle=g;c.beginPath();c.moveTo(-wd*wm*.5,0);c.quadraticCurveTo(-wd*wm*.6,L*lm*.5,0,L*lm);c.quadraticCurveTo(wd*wm*.6,L*lm*.5,wd*wm*.5,0);c.fill();
    }
    c.restore();
  }

  function rocket(t,tc,cam){
    const s=tc-LIFT, a=alt(s), thr=smooth((tc-IGN)/3.2), sepT=tc-SEP;
    c.save();c.translate(px+drift(a)*u,gy+cam-a*u);c.rotate(tilt(a));c.scale(u,u);
    if(sepT<0){
      if(thr>0){
        const g=c.createRadialGradient(0,0,0,0,0,170);g.addColorStop(0,css([255,200,120],.5*thr));g.addColorStop(1,css([255,200,120],0));c.fillStyle=g;c.fillRect(-170,-170,340,340);
        flame(t,thr,s<0?150:300+Math.min(240,a*.05));
      }
      lowerStage(1);upperStage();
    }else{
      upperStage();c.save();c.translate(0,-130);flame(t,1,150);c.restore();
    }
    c.restore();
    if(sepT>0&&sepT<9){
      const sa=alt(SEP-LIFT), sx=px+drift(sa)*u-sepT*34*u, sy=gy+cam-sa*u+(sepT*sepT*38-sepT*30)*u;
      c.save();c.translate(sx,sy);c.rotate(tilt(sa)-sepT*.45);c.scale(u,u);
      lowerStage(Math.max(0,1-sepT/8));
      c.restore();
    }
  }

  function exhaustGlow(tc,cam){
    const thr=smooth((tc-IGN)/3.2); if(thr<=0||tc>SEP+8)return;
    const a=alt(tc-LIFT), x=px+drift(a)*u, y=gy+cam-a*u;
    const g=c.createRadialGradient(x,y,0,x,y,520*u);g.addColorStop(0,css([255,190,120],.18*thr));g.addColorStop(1,css([255,190,120],0));
    c.fillStyle=g;c.fillRect(x-520*u,y-520*u,1040*u,1040*u);
  }

  function hud(tc){
    const s=tc-LIFT, lab=tc<LIFT?`T-00:${String(Math.min(99,Math.ceil(LIFT-tc))).padStart(2,'0')}`:`T+00:${String(Math.min(99,Math.floor(s))).padStart(2,'0')}`;
    const altitude=Math.round(alt(s)*.9), velocity=s<0?0:Math.round(Math.min(7600,alt(s)*.012*s+s*60));
    const fs=Math.max(14,20*u);c.font=`${fs}px ui-monospace,Consolas,monospace`;c.textBaseline='top';
    const x=Math.max(20,w*.04), y=Math.max(20,h*.05);
    c.fillStyle='rgba(8,12,24,.42)';c.fillRect(x-12,y-10,fs*12.5,fs*3.9);
    c.fillStyle=tc<LIFT?'#ffcf6a':'#9fe8ff';c.fillText(lab,x,y);
    c.fillStyle='rgba(220,230,255,.8)';c.fillText(`ALT ${String(altitude).padStart(6,' ')} M`,x,y+fs*1.2);
    c.fillText(`VEL ${String(velocity).padStart(6,' ')} KM/H`,x,y+fs*2.4);
  }

  let tcNow=0;
  function draw(){
    const tc=tcNow=mod(time,CYCLE), d=daylight(), a=alt(tc-LIFT);
    const cam=(a-shown(a,tc-LIFT))*u, sk=sky(d,a);
    const g=c.createLinearGradient(0,0,0,Math.max(1,gy+cam));g.addColorStop(0,css(sk.zn));g.addColorStop(1,css(sk.hz));
    c.fillStyle=g;c.fillRect(0,0,w,h);
    const sunA=(1-sk.space)*(1-smooth((d-.7)/.3));
    if(sunA>.01){
      const sx=w*.2, sy=gy+cam-100*u-Math.max(0,d-.2)*320*u;
      const gg=c.createRadialGradient(sx,sy,0,sx,sy,420*u);gg.addColorStop(0,css([255,222,170],.55*sunA));gg.addColorStop(.3,css([255,160,100],.22*sunA));gg.addColorStop(1,css([255,160,100],0));
      c.fillStyle=gg;c.fillRect(0,0,w,h);
    }
    drawStars(time,sk.space,d,on(settings.stars));
    earth(sk.space,d);
    if(on(settings.clouds))drawClouds(time,cam,d,sk.space);
    ground(time,cam,d);
    padSmoke(tc,cam,d);
    trail(tc,cam,d,sk.space);
    exhaustGlow(tc,cam);
    rocket(time,tc,cam);
    const flash=smooth((tc-IGN)/.4)*(1-smooth((tc-IGN)/3))*.12;
    if(flash>0){c.fillStyle=css([255,210,150],flash);c.fillRect(0,0,w,h);}
    if(on(settings.clock))hud(tc);
    const v=c.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.4,w*.5,h*.5,Math.max(w,h)*.8);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(4,6,14,.45)');
    c.fillStyle=v;c.fillRect(0,0,w,h);
    const fade=Math.max(smooth((tc-(CYCLE-3.5))/3),1-smooth(tc/1.6));
    if(fade>0){c.fillStyle=`rgba(4,6,14,${fade.toFixed(3)})`;c.fillRect(0,0,w,h);}
  }

  const moving=()=>!reduced.matches&&speed()>0;
  let frame=0,last=0,elapsed=0;
  const active=()=>!paused&&!document.hidden&&moving();
  function tick(now){
    if(!active()){stop();return;}
    const dt=last?Math.min(.1,(now-last)/1000):0;last=now;elapsed+=dt;
    if(elapsed+1e-5>=1/clamp(fps,1,60)){time+=elapsed*speed();elapsed=0;draw();}
    frame=requestAnimationFrame(tick);
  }
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;elapsed=0;}
  function start(){stop();if(active())frame=requestAnimationFrame(tick);}
  function layout(){
    const portrait=w/h<1;
    u=portrait?h/1500:Math.min(h/1080,w/1500);
    gy=h*(portrait?.86:.84);px=w*(portrait?.56:.6);
  }
  function resize(){
    const ratio=Math.min(devicePixelRatio||1,1920/Math.max(1,innerWidth),1080/Math.max(1,innerHeight));
    w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));
    layout();draw();
  }
  addEventListener('resize',resize);
  document.addEventListener('visibilitychange',start);
  reduced.addEventListener?.('change',()=>{draw();start();});
  api?.onSettingsChanged(value=>{settings={...settings,...value};draw();start();});
  api?.onPause(()=>{paused=true;stop();});
  api?.onResume(()=>{paused=false;start();});
  api?.onPerformanceChanged(value=>{fps=clamp(Number(value)||30,1,60);start();});
  resize();canvas.dataset.ready='true';start();
})();
