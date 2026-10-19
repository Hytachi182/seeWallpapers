/* Drifting Jellyfish: original code-drawn deep-sea scene, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), c=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  const TAU=Math.PI*2, mod=(a,b)=>((a%b)+b)%b, mix=(a,b,t)=>a+(b-a)*t, mixc=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  let settings={speed:1,count:11,glow:1,tint:'#5fd8ff',snow:true,rays:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2), count=()=>Math.round(num('count',11,3,18)), glow=()=>num('glow',1,0,2);
  const tint=()=>{const m=/^#?([0-9a-f]{6})$/i.exec(String(settings.tint||''));const n=m?parseInt(m[1],16):0x5fd8ff;return [n>>16&255,n>>8&255,n&255];};
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):20, paused=preview, fps=30;
  let w=1,h=1,u=1,bg=null,bgKey='';

  const css=(a,alpha=1)=>`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${clamp(alpha,0,1).toFixed(3)})`;
  const PALETTE=[[110,215,255],[255,140,210],[175,150,255],[110,255,200],[255,185,120],[235,245,255],[255,120,150],[150,235,120]];
  // Eighteen fixed jellyfish, drawn far to near; the count setting simply shows the first N so the scene stays stable.
  const JELLIES=Array.from({length:18},(_,i)=>{
    const depth=.38+hash(i*3.3+1)*.95;
    return {i,depth,size:(34+hash(i*5.1)*40)*(.5+depth*.8)*1.55,dir:hash(i*7.7)>.35?1:-1,x0:hash(i*2.9),y0:.1+hash(i*4.4)*.78,
      vx:(8+hash(i*6.6)*18)*depth,hz:.38+hash(i*8.8)*.32,ph:hash(i*9.9)*TAU,col:PALETTE[Math.floor(hash(i*1.9)*PALETTE.length)],arms:3+Math.floor(hash(i*2.2)*3),
      tent:Math.round(8+hash(i*3.8)*10),len:2.3+hash(i*4.7)*1.6,wob:hash(i*6.1)*TAU};
  }).sort((a,b)=>a.depth-b.depth);

  function layout(){u=w/h<1?h/1350:Math.min(h/1080,w/1500);}

  function background(){
    const k=`${w}x${h}|${tint().join()}`;
    if(k===bgKey)return;bgKey=k;
    bg=document.createElement('canvas');bg.width=w;bg.height=h;
    const g=bg.getContext('2d'), t=tint(), top=mixc([6,64,104],t.map(v=>v*.35),.22);
    const lg=g.createLinearGradient(0,0,0,h);lg.addColorStop(0,css(top));lg.addColorStop(.45,css([3,28,54]));lg.addColorStop(1,css([1,6,16]));
    g.fillStyle=lg;g.fillRect(0,0,w,h);
    const rg=g.createRadialGradient(w*.5,-h*.1,0,w*.5,-h*.1,h*1.1);rg.addColorStop(0,css(mixc([90,190,230],t,.4),.28));rg.addColorStop(1,css([20,90,140],0));
    g.fillStyle=rg;g.fillRect(0,0,w,h);
    const dg=g.createRadialGradient(w*.5,h*.55,Math.min(w,h)*.2,w*.5,h*.55,Math.max(w,h)*.75);dg.addColorStop(0,'rgba(0,0,0,0)');dg.addColorStop(1,'rgba(0,4,10,.6)');
    g.fillStyle=dg;g.fillRect(0,0,w,h);
  }

  function rays(t){
    c.save();c.globalCompositeOperation='lighter';
    for(let i=0;i<7;i++){
      const x0=w*(.04+hash(i*3.7)*.92)+Math.sin(t*.07+i*2)*w*.04, wd=(50+hash(i*5.5)*110)*u, sk=(.18+hash(i*2.1)*.22)*(i%2?1:-1)+Math.sin(t*.05+i)*.05;
      const a=.032*(.55+.45*Math.sin(t*.16+i*1.7));
      const g=c.createLinearGradient(0,0,0,h*.95);g.addColorStop(0,css([130,210,240],a*1.6));g.addColorStop(1,css([130,210,240],0));
      c.fillStyle=g;c.beginPath();c.moveTo(x0-wd*.3,-10);c.lineTo(x0+wd*.3,-10);c.lineTo(x0+wd*1.6+sk*h,h);c.lineTo(x0-wd*1.2+sk*h,h);c.closePath();c.fill();
    }
    c.restore();
  }

  function snow(t){
    for(let i=0;i<150;i++){
      const z=.3+hash(i*1.3)*.9, y=mod(hash(i*2.7)*h+t*(6+hash(i*4.1)*10)*z*u,h+30)-15;
      const x=mod(hash(i*3.9)*w+Math.sin(t*.25+i*1.7)*18*u*z+t*3*z*u,w);
      c.fillStyle=css([190,225,245],(.1+.32*hash(i*6.3))*z*(.6+.4*Math.sin(t*.9+i)));
      c.beginPath();c.arc(x,y,Math.max(.6,(.7+hash(i*8.1)*1.6)*z*u),0,TAU);c.fill();
    }
  }

  function jelly(j,t,tn,g){
    const s=j.size*u, col=mixc(j.col,tn,.28), p=t*j.hz+j.ph/TAU, ang=p*TAU;
    const pulse=.5+.5*Math.sin(ang), span=w+s*7;
    const x=mod(j.x0*span+j.dir*j.vx*u*t,span)-s*3.5;
    const y=h*j.y0+Math.sin(t*.07+j.wob)*h*.05-Math.sin(ang)*s*.2;
    const rx=s*(1-.17*pulse), ry=s*.74*(1+.13*pulse);
    const lean=-j.dir*.07+Math.sin(t*.21+j.wob)*.08;
    const farFade=.55+.45*Math.min(1,j.depth/.9);
    c.save();c.translate(x,y);c.rotate(lean);
    // soft halo
    if(g>0){const hg=c.createRadialGradient(0,-ry*.2,0,0,-ry*.2,s*2.4);hg.addColorStop(0,css(col,.2*g*farFade));hg.addColorStop(1,css(col,0));c.fillStyle=hg;c.fillRect(-s*2.4,-s*2.6,s*4.8,s*5.2);}
    const len=s*j.len, tg=c.createLinearGradient(0,0,0,len);tg.addColorStop(0,css(col,.5*farFade));tg.addColorStop(1,css(col,0));
    // trailing tentacles behind the bell
    c.strokeStyle=tg;c.lineWidth=Math.max(.6,s*.013);c.lineCap='round';
    for(let k=0;k<j.tent;k++){
      const f0=(k/(j.tent-1)-.5)*2, steps=14;
      c.beginPath();
      for(let m=0;m<=steps;m++){
        const f=m/steps;
        const px=f0*rx*.85*(1-.3*f)+Math.sin(t*1.25-f*5+k*1.3+j.wob)*rx*.16*f+Math.sin(ang-f*5)*s*.07*f-j.dir*f*f*s*.3;
        const py=ry*.08+f*len*(1-.12*pulse*(1-f));
        m?c.lineTo(px,py):c.moveTo(px,py);
      }
      c.stroke();
    }
    // frilly oral arms
    c.lineWidth=Math.max(1,s*.075);
    const ag=c.createLinearGradient(0,0,0,len*.6);ag.addColorStop(0,css(mixc(col,[255,255,255],.35),.5*farFade));ag.addColorStop(1,css(col,0));c.strokeStyle=ag;
    for(let k=0;k<j.arms;k++){
      const f0=(k/(j.arms-1||1)-.5)*rx*.7;c.beginPath();
      for(let m=0;m<=12;m++){const f=m/12;const px=f0*(1-.4*f)+Math.sin(t*1.7-f*7+k*2.2+j.wob)*s*.12*f-j.dir*f*f*s*.2, py=f*len*.55;m?c.lineTo(px,py):c.moveTo(px,py);}
      c.stroke();
    }
    // bell
    const bg_=c.createRadialGradient(0,-ry*.35,rx*.1,0,-ry*.15,rx*1.15);
    bg_.addColorStop(0,css(col,.06+.08*g*.5));bg_.addColorStop(.7,css(col,.16*farFade));bg_.addColorStop(1,css(mixc(col,[255,255,255],.35),.62*farFade));
    c.fillStyle=bg_;c.beginPath();c.moveTo(-rx,0);c.bezierCurveTo(-rx*1.02,-ry*1.38,rx*1.02,-ry*1.38,rx,0);
    c.quadraticCurveTo(rx*.5,ry*.16,0,ry*.06);c.quadraticCurveTo(-rx*.5,ry*.16,-rx,0);c.fill();
    c.strokeStyle=css(mixc(col,[255,255,255],.5),.5*farFade);c.lineWidth=Math.max(.7,s*.02);c.stroke();
    // radial canals
    c.strokeStyle=css(col,.2*farFade);c.lineWidth=Math.max(.5,s*.008);
    for(let k=-5;k<=5;k++){c.beginPath();c.moveTo(k*rx*.03,-ry*1.02);c.quadraticCurveTo(k*rx*.15,-ry*.6,k*rx*.17,-ry*.02);c.stroke();}
    // glowing gonads
    c.fillStyle=css(mixc(col,[255,255,255],.5),(.18+.3*g*.6)*farFade);
    for(let k=0;k<4;k++){const a=k/4*TAU+.4;c.beginPath();c.ellipse(Math.cos(a)*rx*.16,-ry*.42+Math.sin(a)*ry*.1,rx*.11,ry*.08,0,0,TAU);c.fill();}
    // rim beads
    c.fillStyle=css(mixc(col,[255,255,255],.6),.55*farFade);
    for(let k=0;k<=12;k++){const a=k/12,px=(a-.5)*2*rx*.96;c.beginPath();c.arc(px,ry*.06*(1-Math.abs(a-.5)*1.6)+Math.abs(a-.5)*-ry*.02,Math.max(.6,s*.022),0,TAU);c.fill();}
    // top highlight
    const hl=c.createRadialGradient(-rx*.3,-ry*.95,0,-rx*.3,-ry*.95,rx*.5);hl.addColorStop(0,'rgba(255,255,255,.22)');hl.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=hl;c.fillRect(-rx,-ry*1.4,rx*2,ry*1.4);
    c.restore();
  }

  function draw(){
    background();c.drawImage(bg,0,0);
    const t=time, g=glow(), tn=tint(), n=count();
    if(on(settings.rays))rays(t);
    if(on(settings.snow))snow(t);
    c.save();c.globalCompositeOperation='lighter';
    // show the first n of the fixed set, but keep the depth order of the shown ones
    let shown=0;
    for(const j of JELLIES){if(j.i<n){jelly(j,t,tn,g);shown++;}}
    c.restore();
    void shown;
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
  function resize(){
    const ratio=Math.min(devicePixelRatio||1,1920/Math.max(1,innerWidth),1080/Math.max(1,innerHeight));
    w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));
    bgKey='';layout();draw();
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
