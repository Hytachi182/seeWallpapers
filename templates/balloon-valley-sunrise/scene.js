/* Balloon Valley Sunrise: original code-drawn dawn valley with hot-air balloons, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), c=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  const TAU=Math.PI*2, mod=(a,b)=>((a%b)+b)%b, wrap=a=>mod(a+Math.PI,TAU)-Math.PI, mix=(a,b,t)=>a+(b-a)*t, mixc=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  let settings={speed:1,count:9,tod:.45,mist:1,wind:1,rays:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2), count=()=>Math.round(num('count',9,3,16)), tod=()=>num('tod',.45,0,1), mist=()=>num('mist',1,0,2), wind=()=>num('wind',1,0,2);
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):20, paused=preview, fps=30;
  let w=1,h=1,u=1,hy=1,bg=null,bgKey='',sky=null,blob=null,cloudBlob=null;

  const css=(a,alpha=1)=>`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${clamp(alpha,0,1).toFixed(3)})`;
  const WHITE=[255,255,255];
  // Sky keys for pre-dawn, sunrise and early morning; the time-of-day setting blends between them.
  const KEYS=[
    {top:[20,22,60],mid:[78,56,116],hor:[236,132,120],sun:[255,122,82],near:[26,26,54]},
    {top:[66,86,158],mid:[192,150,192],hor:[255,198,142],sun:[255,192,112],near:[50,50,84]},
    {top:[106,164,226],mid:[186,212,236],hor:[255,238,204],sun:[255,246,222],near:[44,70,72]}];
  const palette=v=>{const f=v*2, i=Math.min(1,Math.floor(f)), k=f-i, a=KEYS[i], b=KEYS[i+1], o={};for(const key in a)o[key]=mixc(a[key],b[key],k);o.haze=mixc(o.mid,o.hor,.5);return o;};
  const COLOURS=[[[226,60,64],[255,206,86]],[[44,110,196],[250,246,236]],[[255,140,40],[120,40,120]],[[40,150,110],[250,220,90]],[[200,60,150],[90,200,230]],[[250,250,240],[226,60,64]],[[120,70,190],[255,170,60]],[[30,60,120],[230,90,60],[250,220,90]]];
  // Sixteen fixed balloons sorted far to near; the count setting shows the first N so the scene stays stable.
  const BALLOONS=Array.from({length:16},(_,i)=>{
    const d=.18+hash(i*3.7+.5)*.82;
    return {i,d,x0:hash(i*2.3),y0:mix(.08,.34,1-d)+hash(i*4.9)*.2,v:6+hash(i*5.5)*8,ph:hash(i*6.7)*TAU,f:.05+hash(i*7.3)*.04,
      col:COLOURS[Math.floor(hash(i*1.7)*COLOURS.length)],belt:hash(i*8.1)>.55,spin:(hash(i*9.2)-.5)*.2,gores:12+2*Math.floor(hash(i*2.9)*3)};
  }).sort((a,b)=>a.d-b.d);
  const RIDGES=[{d:.15,y:.57,amp:150,peak:1,seed:1.1},{d:.3,y:.63,amp:110,peak:.7,seed:2.7},{d:.5,y:.71,amp:92,peak:.3,seed:4.2},{d:.72,y:.81,amp:104,peak:0,seed:5.9},{d:.95,y:.93,amp:126,peak:0,seed:7.3}];

  function layout(){u=w/h<1?h/1350:Math.min(h/1080,w/1500);hy=h*.56;}
  const sunPos=()=>{const p=Math.pow(tod(),.8);return [w*(w/h<1?.62:.66),mix(hy+34*u,h*.2,p)];};
  // far ridges add sharp crests for mountains; near ones stay rolling hills
  const ridgeY=(r,x)=>{const s=x/u, crest=Math.pow(1-Math.abs(Math.sin(s*.0023+r.seed*1.7)),3)*.6+Math.pow(1-Math.abs(Math.sin(s*.0061+r.seed)),4)*.25;
    return h*r.y-r.amp*u*(.35+.2*Math.sin(s*.0019+r.seed)+.12*Math.sin(s*.0051+r.seed*2.3)+.05*Math.sin(s*.017+r.seed*4.1)+r.peak*crest);};

  function sprite(col){
    const s=document.createElement('canvas');s.width=s.height=128;const g=s.getContext('2d'), rg=g.createRadialGradient(64,64,0,64,64,64);
    rg.addColorStop(0,css(col,1));rg.addColorStop(.5,css(col,.45));rg.addColorStop(1,css(col,0));g.fillStyle=rg;g.fillRect(0,0,128,128);return s;
  }

  function background(){
    const k=`${w}x${h}|${tod().toFixed(3)}`;
    if(k===bgKey)return;bgKey=k;
    sky=palette(tod());
    bg=document.createElement('canvas');bg.width=w;bg.height=h;
    const g=bg.getContext('2d'), [sx,sy]=sunPos();
    const lg=g.createLinearGradient(0,0,0,hy);lg.addColorStop(0,css(sky.top));lg.addColorStop(.55,css(sky.mid));lg.addColorStop(1,css(sky.hor));
    g.fillStyle=lg;g.fillRect(0,0,w,h);
    const sg=g.createRadialGradient(sx,sy,0,sx,sy,Math.max(w,h)*.7);sg.addColorStop(0,css(sky.sun,.55));sg.addColorStop(.25,css(sky.sun,.18));sg.addColorStop(1,css(sky.sun,0));
    g.fillStyle=sg;g.fillRect(0,0,w,h);
    // stars fade out as the sky brightens
    const sa=clamp(1-tod()*2.6,0,1);
    for(let i=0;sa>0&&i<140;i++){const x=hash(i*1.9)*w, y=Math.pow(hash(i*3.1),1.6)*hy*.6;g.fillStyle=css([240,240,255],sa*(.3+.5*hash(i*5.3))*(1-y/hy));g.fillRect(x,y,Math.max(1,1.3*u),Math.max(1,1.3*u));}
    // sun disc
    g.fillStyle=css(mixc(sky.sun,WHITE,.6));g.beginPath();g.arc(sx,sy,34*u,0,TAU);g.fill();
    blob=sprite(mixc(sky.hor,WHITE,.55));cloudBlob=sprite(mixc(mixc(sky.hor,sky.mid,.4),WHITE,.3));
  }

  function clouds(t){
    c.save();
    for(let i=0;i<9;i++){
      const span=w+900*u, x=mod(hash(i*4.1)*span+t*(3+hash(i*2.2)*4)*u*(.5+wind()*.5),span)-450*u, y=h*(.06+hash(i*3.3)*.3), sc=(.6+hash(i*5.7)*.8)*u;
      c.globalAlpha=.35+.25*hash(i*6.6);
      for(let p=0;p<6;p++){const bw=(160+hash(i*9+p)*200)*sc, bh=bw*(.22+hash(i*7+p)*.12);c.drawImage(cloudBlob,x+(p-2.5)*90*sc-bw/2,y+(hash(i*11+p)-.5)*30*sc-bh/2,bw,bh);}
    }
    c.restore();
  }

  function rays(t){
    const [sx,sy]=sunPos(), a0=.16*(1-Math.abs(tod()-.4)*1.2);if(a0<=0)return;
    c.save();c.globalCompositeOperation='lighter';
    for(let i=0;i<9;i++){
      const ang=-Math.PI*(.06+i/8*.88)+Math.sin(t*.05+i*1.3)*.04, len=Math.max(w,h)*1.1, wd=(.025+hash(i*4.4)*.035)*(1+.2*Math.sin(t*.13+i));
      const a=a0*(.4+.6*hash(i*2.8))*(.7+.3*Math.sin(t*.21+i*2));
      const g=c.createRadialGradient(sx,sy,0,sx,sy,len);g.addColorStop(0,css(sky.sun,a*.5));g.addColorStop(1,css(sky.sun,0));
      c.fillStyle=g;c.beginPath();c.moveTo(sx,sy);c.arc(sx,sy,len,ang-wd,ang+wd);c.closePath();c.fill();
    }
    c.restore();
  }

  function ridge(r,idx,t){
    const col=mixc(sky.haze,sky.near,Math.pow(r.d,.8)), top=mixc(col,sky.hor,.25*(1-r.d));
    const g=c.createLinearGradient(0,h*r.y-r.amp*u,0,h);g.addColorStop(0,css(top));g.addColorStop(1,css(mixc(col,[10,12,26],.25*r.d)));
    c.fillStyle=g;c.beginPath();c.moveTo(0,h);
    for(let x=0;x<=w+8;x+=8)c.lineTo(x,ridgeY(r,x));
    c.lineTo(w,h);c.closePath();c.fill();
    // low sun catches the crest of the far ridges
    if(r.d<.6){
      c.strokeStyle=css(sky.sun,.35*(1-r.d)*(1-tod()*.6));c.lineWidth=Math.max(1,1.5*u);c.beginPath();
      for(let x=0;x<=w+8;x+=8){const y=ridgeY(r,x);x?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
    }
    // trees along the nearer crests, denser and taller in front
    if(r.d>.6){
      const n=Math.round(w/(r.d>.9?14:30)/u), tc=css(mixc(col,[8,14,22],.35));c.fillStyle=tc;
      for(let i=0;i<n;i++){
        if(hash(i*3.3+idx)<(r.d>.9?.15:.45))continue;
        const x=(i+hash(i*5.1+idx)*.8)*w/n, y=ridgeY(r,x)+(2+hash(i*1.7)*6)*u, th=(r.d>.9?22+hash(i*2.9+idx)*40:10+hash(i*2.9)*14)*u, sway=r.d>.9?Math.sin(t*.8+i)*1.5*u:0;
        if(hash(i*6.3+idx)>.3){c.beginPath();c.moveTo(x-th*.24,y);c.lineTo(x+sway,y-th);c.lineTo(x+th*.24,y);c.fill();}
        else{c.beginPath();c.arc(x+sway*.5,y-th*.45,th*.36,0,TAU);c.fill();c.fillRect(x-th*.04,y-th*.2,th*.08,th*.2);}
      }
    }
  }

  function mistLayer(r,idx,t){
    const m=mist();if(m<=0||r.d>.9)return;
    c.save();c.globalAlpha=clamp(.32*m*(1-r.d*.4)*(1-tod()*.35),0,1);
    for(let i=0;i<10;i++){
      const span=w+1000*u, x=mod(hash(i*3.1+idx*7)*span+t*(2+hash(i*4.7)*3)*u*(i%2?1:-1)*(.4+wind()*.6),span)-500*u;
      const y=h*r.y-r.amp*u*.15+(hash(i*2.3+idx)-.3)*40*u+Math.sin(t*.07+i)*6*u, bw=(380+hash(i*5.9)*420)*u, bh=(40+hash(i*6.1)*50)*u*(.6+r.d);
      c.drawImage(blob,x-bw/2,y-bh/2,bw,bh);
    }
    c.restore();
  }

  // half-width of the envelope at height y, for radius R: a sphere above, tapering to the mouth below
  const halfWidth=(y,R)=>y<=R*.35?Math.sqrt(Math.max(0,R*R-y*y)):mix(R*.18,R*.937,Math.cos(clamp((y-R*.35)/(R*.9),0,1)*Math.PI/2));

  function balloon(b,t){
    const R=(14+b.d*b.d*118)*u, span=w+R*6;
    const x=mod(b.x0*span+wind()*b.v*b.d*u*t*1.6,span)-R*3, th=t*b.f*TAU+b.ph;
    const y=h*b.y0-Math.sin(th)*h*.035;
    const burning=Math.cos(th)>.2&&mod(t*.7+b.ph,1)<.7, flick=burning?.75+.25*Math.sin(t*31+b.i)*Math.sin(t*17):0;
    const haze=(1-b.d)*.55, cols=b.col.map(cl=>mixc(cl,sky.haze,haze)), spin=t*b.spin+b.ph;
    c.save();c.translate(x,y);c.rotate(Math.sin(t*.4+b.ph)*.025);
    // ropes and basket
    const mouth=R*1.25, bt=R*1.48, bh=R*.17, bwid=R*.15, dark=css(mixc([62,40,32],sky.haze,haze));
    c.strokeStyle=css(mixc([50,40,40],sky.haze,haze),.8);c.lineWidth=Math.max(.6,R*.012);
    c.beginPath();for(const s of [-1,1]){c.moveTo(s*R*.17,mouth);c.lineTo(s*bwid,bt);}c.stroke();
    c.fillStyle=dark;c.fillRect(-bwid,bt,bwid*2,bh);
    c.fillStyle=css(mixc([120,84,52],sky.haze,haze));c.fillRect(-bwid,bt,bwid*2,bh*.22);
    if(flick>0){
      c.save();c.globalCompositeOperation='lighter';
      const fl=R*.32*flick, fg=c.createLinearGradient(0,bt-fl,0,bt);fg.addColorStop(0,'rgba(255,240,200,0)');fg.addColorStop(.4,css([255,220,140],.9));fg.addColorStop(1,css([255,120,40],.8));
      c.fillStyle=fg;c.beginPath();c.moveTo(-R*.05,bt-R*.02);c.quadraticCurveTo(-R*.07,bt-fl*.5,0,bt-fl);c.quadraticCurveTo(R*.07,bt-fl*.5,R*.05,bt-R*.02);c.fill();
      c.restore();
    }
    // envelope outline
    const path=new Path2D(), steps=26;
    for(let s=0;s<=steps;s++){const y_=mix(-R,mouth,s/steps);path[s?'lineTo':'moveTo'](halfWidth(y_,R),y_);}
    for(let s=steps;s>=0;s--){const y_=mix(-R,mouth,s/steps);path.lineTo(-halfWidth(y_,R),y_);}
    path.closePath();
    c.save();c.clip(path);
    c.fillStyle=css(cols[0]);c.fillRect(-R,-R,R*2,mouth+R);
    // gores wrap around the envelope and turn slowly
    for(let k=0;k<b.gores;k++){
      const p1=k/b.gores*TAU+spin, p2=p1+TAU/b.gores;
      if(k%2===0||Math.cos((p1+p2)/2)<=0)continue;
      const e1=Math.sin(clamp(wrap(p1),-Math.PI/2,Math.PI/2)), e2=Math.sin(clamp(wrap(p2),-Math.PI/2,Math.PI/2));
      c.fillStyle=css(cols[1]);c.beginPath();
      for(let s=0;s<=steps;s++){const y_=mix(-R,mouth,s/steps);c[s?'lineTo':'moveTo'](halfWidth(y_,R)*e1,y_);}
      for(let s=steps;s>=0;s--){const y_=mix(-R,mouth,s/steps);c.lineTo(halfWidth(y_,R)*e2,y_);}
      c.fill();
    }
    if(b.belt){c.fillStyle=css(cols[2]||mixc(cols[1],cols[0],.5));c.fillRect(-R,R*.1,R*2,R*.16);c.fillRect(-R,-R*.86,R*2,R*.08);}
    // seams
    c.strokeStyle='rgba(30,20,30,.18)';c.lineWidth=Math.max(.5,R*.008);
    for(let k=0;k<b.gores;k++){
      const p=wrap(k/b.gores*TAU+spin);if(Math.abs(p)>Math.PI/2)continue;
      c.beginPath();for(let s=0;s<=steps;s++){const y_=mix(-R,mouth,s/steps);c[s?'lineTo':'moveTo'](halfWidth(y_,R)*Math.sin(p),y_);}c.stroke();
    }
    // light from the sun side and shade on the other
    const [sx]=sunPos(), side=sx>x?1:-1;
    const sh=c.createLinearGradient(-R*side,0,R*side,0);sh.addColorStop(0,`rgba(28,18,48,${(.5*b.d+.15).toFixed(3)})`);sh.addColorStop(.6,'rgba(28,18,48,0)');
    c.fillStyle=sh;c.fillRect(-R,-R,R*2,mouth+R);
    const hl=c.createRadialGradient(side*R*.45,-R*.45,0,side*R*.45,-R*.45,R*.9);hl.addColorStop(0,css(mixc(sky.sun,WHITE,.5),.42));hl.addColorStop(1,css(sky.sun,0));
    c.fillStyle=hl;c.fillRect(-R,-R,R*2,mouth+R);
    if(flick>0){
      c.globalCompositeOperation='lighter';
      const gg=c.createRadialGradient(0,mouth,0,0,mouth*.3,R*1.3);gg.addColorStop(0,css([255,170,70],.55*flick));gg.addColorStop(1,css([255,120,40],0));
      c.fillStyle=gg;c.fillRect(-R,-R,R*2,mouth+R);
    }
    c.restore();
    c.restore();
  }

  function birds(t){
    const P=46, k=Math.floor(t/P), p=(t-k*P)/P;if(hash(k*3.3)>.75)return;
    const dir=hash(k*5.1)>.5?1:-1, x0=dir>0?mix(-200*u,w+200*u,p):mix(w+200*u,-200*u,p), y0=h*(.22+hash(k*7.7)*.18)+Math.sin(t*.3)*10*u;
    c.strokeStyle=css(mixc([40,34,60],sky.haze,.3),.8);c.lineWidth=Math.max(1,1.6*u);c.lineCap='round';
    for(let i=0;i<7;i++){
      const row=Math.ceil(i/2), side=i%2?1:-1, x=x0-dir*row*26*u, y=y0+side*row*14*u+Math.sin(t*.9+i)*3*u, f=Math.sin(t*9+i*1.3)*5*u, s=7*u;
      c.beginPath();c.moveTo(x-s,y-f);c.quadraticCurveTo(x-s*.4,y-f*.2-2*u,x,y);c.quadraticCurveTo(x+s*.4,y-f*.2-2*u,x+s,y-f);c.stroke();
    }
  }

  function draw(){
    background();c.drawImage(bg,0,0);
    const t=time, n=count(), shown=BALLOONS.filter(b=>b.i<n);
    clouds(t);
    if(on(settings.rays))rays(t);
    let bi=0;
    RIDGES.forEach((r,idx)=>{
      while(bi<shown.length&&shown[bi].d<r.d)balloon(shown[bi++],t);
      ridge(r,idx,t);
      if(idx===2)birds(t);
      mistLayer(r,idx,t);
    });
    while(bi<shown.length)balloon(shown[bi++],t);
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
