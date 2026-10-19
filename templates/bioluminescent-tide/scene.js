/* Bioluminescent Tide: original code-drawn night beach with glowing surf, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), main=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  const TAU=Math.PI*2, mod=(a,b)=>((a%b)+b)%b, mix=(a,b,t)=>a+(b-a)*t, mixc=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  const noise=x=>{const i=Math.floor(x),f=x-i,s=f*f*(3-2*f);return hash(i)*(1-s)+hash(i+1)*s;};
  const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  let settings={speed:1,glow:1,hue:0,footprints:true,jellyfish:true,milkyway:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2), glow=()=>num('glow',1,.2,2), hue=()=>num('hue',0,0,2);
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):12, paused=preview, fps=30;
  let c=main,w=1,h=1,u=1,L={},base=null,cliff=null,key='';

  const css=(a,alpha=1)=>`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${clamp(alpha,0,1).toFixed(3)})`;
  function ellipse(x,y,rx,ry,rot=0){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,TAU);}
  function soft(x,y,rx,ry,color,alpha){
    if(alpha<=.002)return;
    const g=c.createRadialGradient(x,y,0,x,y,rx);g.addColorStop(0,css(color,alpha));g.addColorStop(1,css(color,0));
    c.save();c.translate(x,y);c.scale(1,ry/rx);c.translate(-x,-y);c.fillStyle=g;c.fillRect(x-rx,y-rx,rx*2,rx*2);c.restore();
  }
  function into(target,fn){const prev=c;c=target.getContext('2d');fn();c=prev;}
  function layer(){const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv;}
  const HUES=[[70,226,255],[80,255,176],[176,118,255]];
  const glowCol=()=>{const k=hue();return k<=1?mixc(HUES[0],HUES[1],k):mixc(HUES[1],HUES[2],k-1);};

  // Waves: one is born every PERIOD seconds at the horizon and breaks after BREAK seconds.
  const PERIOD=5.5, BREAK=19, LIFE=BREAK+12;
  function layout(){
    const portrait=w/h<1;
    u=portrait?Math.min(w/700,h/1250):Math.min(h/1080,w/1700);
    L=portrait?{portrait,H:h*.4,breakY:h*.6,shore:h*.67,run:h*.75}:{portrait,H:h*.44,breakY:h*.64,shore:h*.71,run:h*.8};
    L.cliffX=w*(portrait?.7:.8);L.step=.55;L.vx=70*u;L.walkP=1.1*w/L.vx+6;
    L.walkOff=(portrait?.35:.3)*w/L.vx+.05*w/L.vx-12;
    L.boat=[w*(portrait?.25:.36),L.H-2*u];
  }
  const cliffTop=x=>{const f=(x-L.cliffX)/(w-L.cliffX);return L.H-h*(.04+.2*smooth(f*1.6))-h*.03*noise(x/(40*u))-h*.02*noise(x/(11*u));};

  function buildBase(){
    base=layer();into(base,()=>{
      const {H,shore,run}=L, g=c.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'rgb(2,4,12)');g.addColorStop(.7,'rgb(8,14,30)');g.addColorStop(1,'rgb(18,32,52)');
      c.fillStyle=g;c.fillRect(0,0,w,H);
      if(on(settings.milkyway)){
        const ax=w*-.05, ay=H*.95, bx=w*1.05, by=H*-.15, len=Math.hypot(bx-ax,by-ay), ang=Math.atan2(by-ay,bx-ax);
        c.save();c.translate(ax,ay);c.rotate(ang);
        for(let i=0;i<180;i++){
          const s=hash(i*1.7)*len, off=(hash(i*2.9)-.5)*90*u*(1+.6*Math.sin(s/(300*u)));
          const col=hash(i*4.1)<.5?[150,160,210]:[210,190,180];
          soft(s,off,(50+hash(i*3.3)*110)*u,(14+hash(i*5.1)*30)*u,col,.05+.05*hash(i*6.2));
        }
        for(let i=0;i<40;i++){const s=hash(i*8.3+1)*len;soft(s,(hash(i*9.1)-.5)*30*u,(30+hash(i)*70)*u,(5+hash(i*2)*9)*u,[2,4,12],.35);}
        for(let i=0;i<1400;i++){
          const s=hash(i*1.13+5)*len, off=(hash(i*2.71)+hash(i*3.37)+hash(i*5.11)-1.5)*110*u;
          c.fillStyle=`rgba(235,238,255,${(.15+.55*hash(i*7.7)).toFixed(3)})`;c.fillRect(s,off,(hash(i*4.4)<.94?1:1.8)*u,(hash(i*4.4)<.94?1:1.8)*u);
        }
        c.restore();
      }
      for(let i=0;i<420;i++){
        const s=(hash(i*6.1)<.95?1:2)*u;
        c.fillStyle=`rgba(225,232,255,${(.12+.5*hash(i*3.9)).toFixed(3)})`;c.fillRect(hash(i*2.3)*w,hash(i*5.7)*H*.98,s,s);
      }
      const hz=c.createLinearGradient(0,H-60*u,0,H);hz.addColorStop(0,'rgba(40,90,110,0)');hz.addColorStop(1,'rgba(40,90,110,.28)');c.fillStyle=hz;c.fillRect(0,H-60*u,w,60*u);
      const sea=c.createLinearGradient(0,H,0,shore);
      sea.addColorStop(0,'rgb(14,26,42)');sea.addColorStop(.4,'rgb(6,14,26)');sea.addColorStop(1,'rgb(3,8,16)');
      c.fillStyle=sea;c.fillRect(0,H,w,shore-H+2*u);
      for(let i=0;i<260;i++){
        const y=H+Math.pow(hash(i*3.1),2)*(shore-H), x=hash(i*7.3)*w, ln=(4+hash(i)*20)*u*(1-(y-H)/(shore-H)*.5);
        c.fillStyle=`rgba(170,190,230,${(.05+.08*hash(i*2.2)).toFixed(3)})`;c.fillRect(x,y,ln,Math.max(1,.8*u));
      }
      const sand=c.createLinearGradient(0,shore,0,h);
      sand.addColorStop(0,'rgb(10,14,22)');sand.addColorStop((run-shore)/(h-shore),'rgb(16,18,26)');sand.addColorStop(Math.min(1,(run-shore)/(h-shore)+.05),'rgb(26,25,30)');sand.addColorStop(1,'rgb(32,29,32)');
      c.fillStyle=sand;c.fillRect(0,shore,w,h-shore);
      c.save();c.beginPath();c.rect(0,shore,w,run+20*u-shore);c.clip();c.globalAlpha=.16;c.translate(0,shore*2);c.scale(1,-1);c.drawImage(base,0,0,w,shore,0,0,w,shore);c.restore();
      for(let i=0;i<1600;i++){
        const y=shore+hash(i*1.9)*(h-shore), x=hash(i*3.7)*w, dry=y>run;
        c.fillStyle=`rgba(${dry?'200,190,180':'120,140,170'},${(.03+.05*hash(i*5.3)).toFixed(3)})`;c.fillRect(x,y,(1+hash(i*7.1)*2)*u,u);
      }
      for(let i=0;i<9;i++){
        const x=hash(i*11.3)*w*.7, y=run+(20+hash(i*4.9)*(h-run-40*u)), s=(10+hash(i*2.5)*24)*u*(y/h);
        c.fillStyle='rgb(12,12,16)';ellipse(x,y,s,s*.45);c.fill();c.fillStyle='rgba(120,140,170,.12)';ellipse(x-s*.2,y-s*.18,s*.6,s*.18);c.fill();
      }
    });
    cliff=layer();into(cliff,()=>{
      const {cliffX,shore}=L, foot=shore+(L.portrait?30:20)*u;
      c.fillStyle='rgb(6,8,14)';c.beginPath();c.moveTo(cliffX-60*u,foot);
      for(let x=cliffX-60*u;x<=w+4;x+=4)c.lineTo(x,Math.min(foot,cliffTop(x)+(x<cliffX?(cliffX-x)*(foot-L.H)/(60*u):0)));
      c.lineTo(w+4,foot);c.closePath();const cg=c.createLinearGradient(cliffX,0,w,0);cg.addColorStop(0,'rgb(14,18,28)');cg.addColorStop(.25,'rgb(8,10,17)');cg.addColorStop(1,'rgb(4,6,11)');c.fillStyle=cg;c.fill();
      c.save();c.clip();for(let i=0;i<34;i++){const y=L.H*.5+hash(i*2.7)*(foot-L.H*.5);c.strokeStyle=`rgba(${hash(i)<.5?'0,0,0':'90,110,150'},${(.08+.1*hash(i*5.1)).toFixed(3)})`;c.lineWidth=(1+hash(i*3.9)*2)*u;c.beginPath();c.moveTo(cliffX-60*u,y);for(let x=cliffX-60*u;x<w;x+=30*u)c.lineTo(x,y+(noise(x/(60*u)+i)-.5)*24*u+(x-cliffX)*.08);c.stroke();}
      const fg=c.createLinearGradient(0,foot-80*u,0,foot);fg.addColorStop(0,'rgba(60,120,150,0)');fg.addColorStop(1,'rgba(60,120,150,.12)');c.fillStyle=fg;c.fillRect(cliffX-60*u,foot-80*u,w,80*u);c.restore();
      c.strokeStyle='rgba(120,140,190,.16)';c.lineWidth=1.5*u;c.beginPath();
      for(let x=cliffX;x<=w+4;x+=4){const y=cliffTop(x);x===cliffX?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();
      c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=u;
      for(let i=0;i<22;i++){const x=cliffX+hash(i*3.3)*(w-cliffX),y0=cliffTop(x)+10*u;c.beginPath();c.moveTo(x,y0);c.lineTo(x+(hash(i)-.5)*30*u,y0+(30+hash(i*2.2)*90)*u);c.stroke();}
      for(const [fx,fy,s] of [[.72,.0,1],[.66,.01,.55]]){
        const x=w*(L.portrait?fx-.12:fx), y=L.H+fy*h, r=s*40*u;
        c.fillStyle='rgb(5,7,12)';c.beginPath();c.moveTo(x-r,y+r*.2);c.lineTo(x-r*.7,y-r*1.3);c.lineTo(x-r*.1,y-r*1.9);c.lineTo(x+r*.6,y-r*1.4);c.lineTo(x+r,y+r*.2);c.fill();
      }
    });
  }

  // Per-wave state at horizontal position x: front position and glow, deterministic in time.
  function waveAt(id,a,x){
    const {H,breakY,shore,run}=L, sx=x/(260*u);
    const tb=BREAK+(noise(sx+id*7.3)-.5)*5, wob=Math.sin(x/(170*u)+id*2.1+a*.05)+.6*Math.sin(x/(83*u)+id*5.3)+.8*(noise(x/(400*u)+id*1.9)-.5);
    if(a<tb){
      const p=clamp(a/BREAK,0,1.2), y=H+(breakY-H)*Math.pow(p,1.6)+wob*(1.5+16*p*p)*u;
      return {y,g:.12*Math.pow(clamp(p,0,1),5),p,broken:false};
    }
    const e=a-tb, yb=H+(breakY-H)*Math.pow(tb/BREAK,1.6)+wob*(1.5+16*Math.pow(tb/BREAK,2))*u;
    const reach=run-(run-shore)*.6*noise(sx*1.7+id*3.1)-(id%3)*12*u;
    let y=yb+(reach-yb)*(1-Math.exp(-e/1.5));
    if(e>3.6)y=mix(y,shore+wob*8*u,smooth((e-3.6)/3));
    return {y,g:clamp(e/.3,0,1)*(.12+.88*Math.exp(-e/2.2))*(1-.85*smooth((e-4)/4)),e,broken:true};
  }

  function drawWave(id,a,col,gl){
    const step=Math.max(6,10*u), xs=[];for(let x=-step;x<=w+step;x+=step)xs.push(x);
    const pts=xs.map(x=>({x,...waveAt(id,a,x)}));
    const p=clamp(a/BREAK,0,1), {H,shore}=L;
    const face=(2+26*p*p)*u;
    c.fillStyle=css([20,44,62],.1+.3*p*p);c.beginPath();
    pts.forEach((q,i)=>i?c.lineTo(q.x,q.y-face*(q.broken?mix(1,.4,clamp(q.e,0,1)):1)):c.moveTo(q.x,q.y-face));
    for(let i=pts.length-1;i>=0;i--)c.lineTo(pts[i].x,pts[i].y);c.fill();
    const grad=c.createLinearGradient(-step,0,w+step,0);
    const span=w+2*step;
    for(let i=0;i<pts.length;i+=Math.max(1,Math.floor(pts.length/40)))grad.addColorStop(clamp((pts[i].x+step)/span,0,1),css(col,clamp(pts[i].g*gl,0,1)));
    const trail=(8+46*clamp(a-BREAK+2,0,4)/4)*u;
    c.save();c.globalCompositeOperation='lighter';
    c.strokeStyle=grad;c.lineJoin='round';
    const tail=pts.map(q=>q.broken?trail*clamp(1.4-q.e/5,.15,1)*clamp(q.e/.6+.3,0,1):face*.3);
    c.lineWidth=Math.max(2*u,trail/5);
    for(let k=1;k<=7;k++){
      c.globalAlpha=.3*(1-k/8);c.beginPath();
      pts.forEach((q,i)=>{const y=q.y-tail[i]*k/7;i?c.lineTo(q.x,y):c.moveTo(q.x,y);});c.stroke();
    }
    for(const [lw,al] of [[22,.12],[9,.3],[3,.8],[1.2,1]]){
      c.globalAlpha=al;c.lineWidth=lw*u*(.4+.6*p);c.beginPath();pts.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));c.stroke();
    }
    c.globalAlpha=1;
    if(a>BREAK-3)for(let x=0;x<w;x+=56*u){const q=waveAt(id,a,x);if(q.broken&&q.g>.05)soft(x,q.y-trail*.3,52*u,trail*.6+10*u,col,.2*q.g*gl);}
    if(a>BREAK-3){
      const white=mixc(col,[255,255,255],.55);
      for(let j=0;j<150;j++){
        const x=hash(id*31.1+j*1.7)*w, q=waveAt(id,a,x);if(!q.broken)continue;
        const tw=.5+.5*Math.sin(time*(3+hash(j)*6)+j), y=q.y-hash(j*2.3+id)*trail*clamp(1.2-q.e/5,.1,1);
        const al=q.g*gl*tw*(.4+.6*hash(j*5.5));c.fillStyle=css(white,al);c.fillRect(x,y,(1+hash(j*3.1)*2)*u,(1+hash(j*3.1)*2)*u);
      }
    }
    if(a>BREAK+3){
      for(let j=0;j<120;j++){
        const x=hash(id*17.9+j*2.9)*w, q=waveAt(id,BREAK+4,x), y=mix(shore,q.y,hash(j*4.7+id)), e=a-BREAK-3;
        const al=.55*gl*Math.exp(-e/2.8)*(.5+.5*Math.sin(time*5+j*3.3));
        if(al>.01&&y>waveAt(id,a,x).y){c.fillStyle=css(col,al);c.fillRect(x,y,1.6*u,1.6*u);}
      }
    }
    c.restore();
  }

  function jellyfish(t,col,gl){
    const {H,breakY}=L;
    c.save();c.globalCompositeOperation='lighter';
    for(let i=0;i<6;i++){
      const depth=.25+hash(i*3.7)*.6, y=H+(breakY-H-30*u)*depth+Math.sin(t*.3+i)*6*u;
      const x=mod(hash(i*5.1)*L.cliffX+t*(4+hash(i)*5)*u*(i%2?1:-1),L.cliffX)-20*u, s=(6+14*depth)*u;
      const pulse=.5+.5*Math.sin(t*(1.6+hash(i*2.2))+i*2), bw=s*(1-.18*pulse), bh=s*(.7+.15*pulse);
      soft(x,y,s*3,s*2.2,col,.09*gl);
      c.fillStyle=css(mixc(col,[255,255,255],.3),.24*gl);c.beginPath();c.ellipse(x,y,bw,bh,0,Math.PI,0);c.closePath();c.fill();
      c.strokeStyle=css(col,.28*gl);c.lineWidth=Math.max(1,1.1*u);
      for(let k=0;k<5;k++){
        const ox=x+(k-2)*bw*.36;c.beginPath();c.moveTo(ox,y);
        for(let j=1;j<=8;j++)c.lineTo(ox+Math.sin(t*2+j*.8+k)*3*u*j/8,y+j*s*.32);
        c.stroke();
      }
    }
    c.restore();
  }

  function walker(t,col,gl){
    const tw=mod(t+L.walkOff,L.walkP), x=-.05*w+tw*L.vx, steps=Math.floor(tw/L.step), y0=mix(L.run,h,.42);
    const fy=x=>y0+Math.sin(x/(220*u))*10*u;
    c.save();c.globalCompositeOperation='lighter';
    for(let k=Math.max(0,steps-26);k<=steps;k++){
      const sx=-.05*w+k*L.step*L.vx, age=tw-k*L.step, side=k%2?1:-1, fx=sx, fyy=fy(sx)+side*5*u;
      if(fx<-20*u||fx>w+20*u)continue;
      const al=gl*(.25+.75*Math.exp(-age*1.4))*Math.exp(-age/14);
      soft(fx,fyy,16*u,7*u,col,.35*al);
      c.fillStyle=css(mixc(col,[255,255,255],.4),.9*al);ellipse(fx,fyy,5*u,2.2*u);c.fill();
      if(age<1.2){c.strokeStyle=css(col,.5*(1-age/1.2)*gl);c.lineWidth=u;ellipse(fx,fyy,(6+age*26)*u,(2.5+age*10)*u);c.stroke();}
    }
    c.restore();
    if(x<-30*u||x>w+30*u)return;
    const ph=(tw/L.step)*Math.PI, hip=fy(x)-36*u, s=u, bob=Math.abs(Math.sin(ph))*2*u;
    c.strokeStyle='rgb(4,5,9)';c.lineCap='round';c.lineWidth=5*s;
    const leg=d=>{const sw=Math.sin(ph)*d;c.beginPath();c.moveTo(x,hip-bob);c.lineTo(x+sw*12*s,fy(x)-2*u);c.stroke();};
    leg(1);leg(-1);
    c.lineWidth=7*s;c.beginPath();c.moveTo(x,hip-bob);c.lineTo(x+1*s,hip-30*s-bob);c.stroke();
    c.lineWidth=3.5*s;for(const d of [1,-1]){const sw=-Math.sin(ph)*d;c.beginPath();c.moveTo(x+1*s,hip-27*s-bob);c.lineTo(x+sw*9*s,hip-8*s-bob);c.stroke();}
    c.fillStyle='rgb(4,5,9)';ellipse(x+1.5*s,hip-37*s-bob,4.6*s,5.2*s);c.fill();
    c.lineCap='butt';
    c.save();c.globalCompositeOperation='lighter';soft(x,fy(x),40*u,12*u,col,.2*gl);
    c.strokeStyle=css(col,.35*gl);c.lineWidth=1.2*u;c.beginPath();c.moveTo(x-3*u,hip-bob);c.lineTo(x-2*u,hip-28*u-bob);c.stroke();c.restore();
  }

  function boat(t){
    const [x,y]=L.boat, b=Math.sin(t*.9)*1.2*u, r=Math.sin(t*.7)*.04;
    c.save();c.translate(x,y+b);c.rotate(r);
    c.fillStyle='rgb(4,6,12)';c.beginPath();c.moveTo(-22*u,0);c.lineTo(22*u,0);c.lineTo(16*u,6*u);c.lineTo(-16*u,6*u);c.fill();
    c.fillRect(-1*u,-30*u,2*u,30*u);c.fillRect(-12*u,-9*u,12*u,9*u);
    c.restore();
    c.save();c.globalCompositeOperation='lighter';
    const fl=.85+.15*Math.sin(t*7);soft(x-6*u,y+b-12*u,22*u,22*u,[255,190,110],.35*fl);c.fillStyle='rgba(255,214,150,.95)';c.fillRect(x-7*u,y+b-13*u,3*u,3*u);
    for(let i=0;i<10;i++){c.fillStyle=`rgba(255,180,100,${(.18*(1-i/10)).toFixed(3)})`;const ln=(10-i)*1.6*u*(.6+.4*Math.sin(t*2+i));c.fillRect(x-6*u-ln/2+Math.sin(t*1.7+i)*2*u,y+8*u+i*3*u,ln,u);}
    c.restore();
  }
  function cliffGlow(t,col,gl){
    const {cliffX,shore}=L;
    c.save();c.globalCompositeOperation='lighter';
    for(let i=0;i<8;i++){
      const x=cliffX-40*u+i*(w-cliffX+60*u)/8, a=mod(t+i*.7,PERIOD), k=Math.exp(-a*1.2);
      soft(x,shore+14*u,60*u,18*u,col,.4*gl*k);
      for(let j=0;j<8;j++){const sa=a*(1+hash(i*9+j)),sy=shore+14*u-sa*60*u+sa*sa*45*u;if(sa<1.4){c.fillStyle=css(col,.8*gl*k);c.fillRect(x+(hash(i*3+j)-.5)*50*u+sa*(hash(j)-.5)*40*u,sy,2*u,2*u);}}
    }
    c.restore();
  }
  function twinkle(t){
    for(let i=0;i<40;i++){
      const x=hash(i*9.7+3)*w, y=hash(i*4.3+8)*L.H*.9, a=Math.max(0,Math.sin(t*(.8+hash(i)*1.8)+i*2));
      c.fillStyle=`rgba(240,244,255,${(.7*a).toFixed(3)})`;c.fillRect(x,y,1.6*u,1.6*u);
    }
  }

  function draw(){
    const k=`${w}x${h}|${on(settings.milkyway)}`;
    if(k!==key){key=k;buildBase();}
    c=main;const t=time, col=glowCol(), gl=glow();
    c.drawImage(base,0,0);
    twinkle(t);
    boat(t);
    if(on(settings.jellyfish))jellyfish(t,col,gl);
    const n=Math.floor(t/PERIOD);
    for(let id=n-Math.ceil(LIFE/PERIOD);id<=n;id++){const a=t-id*PERIOD;if(a>=0&&a<LIFE)drawWave(id,a,col,gl);}
    if(on(settings.footprints))walker(t,col,gl);
    c.drawImage(cliff,0,0);
    cliffGlow(t,col,gl);
    const v=c.createRadialGradient(w*.5,h*.55,Math.min(w,h)*.35,w*.5,h*.55,Math.max(w,h)*.8);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,2,6,.6)');
    c.fillStyle=v;c.fillRect(0,0,w,h);
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
    key='';layout();draw();
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
