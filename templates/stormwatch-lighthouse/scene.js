/* Stormwatch Lighthouse: original code-drawn storm, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), c=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  let settings={speed:1,storm:1,beamColor:'#fff1c2',lightning:true,rain:true,spray:true,boat:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2), storm=()=>num('storm',1,.2,2);
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):12, paused=preview, fps=30;
  let w=1,h=1,u=1,L={},flash=0;

  function rgb(hex){
    const m=/^#?([0-9a-f]{6})$/i.exec(String(hex||'').trim());
    const n=m?parseInt(m[1],16):0xfff1c2;return[n>>16&255,n>>8&255,n&255];
  }
  const css=(a,alpha=1)=>`rgba(${a[0]},${a[1]},${a[2]},${alpha})`;
  function ellipse(x,y,rx,ry,rot=0){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,Math.PI*2);}
  function poly(points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
  function soft(x,y,rx,ry,color,alpha){
    const g=c.createRadialGradient(x,y,0,x,y,rx);g.addColorStop(0,css(color,alpha));g.addColorStop(1,css(color,0));
    c.save();c.translate(x,y);c.scale(1,ry/rx);c.translate(-x,-y);c.fillStyle=g;c.fillRect(x-rx,y-rx,rx*2,rx*2);c.restore();
  }

  function layout(){
    const portrait=w/h<1;
    u=portrait?Math.min(w/620,h/1200):Math.min(h/1080,w/1500);
    const horizon=h*.52, cliffX=portrait?w*.6:w*.72;
    L={portrait,horizon,cliffX,cliffTop:h*.6,tower:cliffX+(portrait?40:60)*u,
      bands:[.035,.15,.33,.6,.88].map(f=>horizon+(h-horizon)*f)};
    L.lamp={x:L.tower,y:L.cliffTop-330*u};
  }

  // Lightning: some 7-second windows hold one strike with a stuttering double flash.
  function strike(){
    if(!on(settings.lightning))return null;
    const E=7,epoch=Math.floor(time/E);
    for(const e of [epoch,epoch-1]){
      if(hash(e*3.7+1)<.3)continue;
      const dt=time-(e*E+hash(e*5.1)*4);
      if(dt<0||dt>1.1)continue;
      const level=dt<.07?1:dt<.15?.25:dt<.24?.85:.85*Math.exp(-(dt-.24)*6);
      return {e,level,dt};
    }
    return null;
  }
  function sky(s){
    const g=c.createLinearGradient(0,0,0,L.horizon);g.addColorStop(0,'#05080e');g.addColorStop(.7,'#121a26');g.addColorStop(1,'#1f2a38');
    c.fillStyle=g;c.fillRect(0,0,w,L.bands[1]);
    if(s){
      const bx=w*(.12+hash(s.e*2.3)*.5);
      soft(bx,L.horizon*.35,w*.5,L.horizon*.6,[150,170,220],.45*s.level);
    }
  }
  function clouds(layer,s){
    const st=storm(),n=layer?12:16,span=w*1.7;
    for(let i=0;i<n;i++){
      const id=i+layer*50,size=(140+hash(id+1)*200)*u*(layer?1.25:1),v=(14+layer*26)*u*(.5+st*.5);
      const x=((hash(id+2)*span+time*v)%span)-w*.35,y=L.horizon*(layer?.05+hash(id+3)*.45:.15+hash(id+3)*.65);
      const tone=layer?[22,29,40]:[33,41,55],lit=s?.5*s.level*(1-layer*.4):0;
      soft(x,y,size,size*.42,tone.map(v=>Math.round(v+lit*120)),.85);
      soft(x+size*.35,y-size*.12,size*.7,size*.32,tone.map(v=>Math.round(v+6+lit*140)),.75);
    }
  }
  function bolt(s){
    if(!s||s.dt>.32)return;
    const seed=s.e*11.3;let x=w*(.12+hash(s.e*2.3)*.5),y=L.horizon*.12;
    const points=[[x,y]],steps=14,drop=(L.horizon-y)/steps;
    for(let k=1;k<=steps;k++){x+=(hash(seed+k)-.5)*70*u;y+=drop*(.7+hash(seed+k*2)*.6);points.push([x,Math.min(y,L.horizon)]);}
    const branchAt=points[5],branch=[branchAt];let bx=branchAt[0],by=branchAt[1];
    for(let k=1;k<6;k++){bx+=(30+hash(seed+k*7)*40)*u;by+=drop*.8;branch.push([bx,by]);}
    c.save();c.lineCap='round';c.lineJoin='round';
    for(const [width,alpha] of [[14,.12],[5,.35],[2,1]]){
      c.strokeStyle=`rgba(220,230,255,${alpha*s.level})`;c.lineWidth=width*u;
      for(const path of [points,branch]){c.beginPath();path.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.stroke();}
    }
    c.restore();
  }
  // Swell layers: summed sines travelling towards the cliff, steeper and slower nearer the viewer.
  const AMP=[3,9,18,32,50],FREQ=[.021,.013,.0085,.0055,.0037],SPEED=[.9,1.1,1.3,1.5,1.7];
  function wave(k,x){
    const st=storm(),X=x/u,f=FREQ[k],s=SPEED[k]*(.6+st*.4),t=time;
    return L.bands[k]-AMP[k]*u*st*(.55*Math.sin(X*f-t*s)+.3*Math.sin(X*f*2.1-t*s*1.4+k)+.25*Math.sin(X*f*.45+t*.5+k*2));
  }
  function sea(k,s){
    const colors=[[30,44,60],[24,37,51],[18,30,42],[13,23,33],[9,16,24]],col=colors[k].map(v=>Math.round(v+(s?s.level*35:0)));
    c.fillStyle=css(col);c.beginPath();c.moveTo(-10,h+10);
    const step=Math.max(4,6*u);
    for(let x=-10;x<=w+10;x+=step)c.lineTo(x,wave(k,x));
    c.lineTo(w+10,h+10);c.closePath();c.fill();
    c.strokeStyle=`rgba(210,225,240,${.1+k*.06})`;c.lineWidth=(1+k*.6)*u;c.beginPath();
    for(let x=-10;x<=w+10;x+=step){const y=wave(k,x);x<=-10?c.moveTo(x,y):c.lineTo(x,y);}
    c.stroke();
    if(k<1)return;
    c.fillStyle=`rgba(225,235,245,${.25+k*.08})`;
    for(let x=0;x<w;x+=(22-k*3)*u){
      const y=wave(k,x),crest=(L.bands[k]-y)/(AMP[k]*u*storm());
      if(crest<.55)continue;
      const r=(1.5+k*1.2)*u*(.6+hash(Math.floor(x/u)+k)*.8);
      ellipse(x+hash(x+k)*8*u,y+r*.6,r*2.2,r*.8);c.fill();
    }
  }
  function beams(){
    const color=rgb(settings.beamColor),phi=time*.85,side=Math.cos(phi),strength=Math.abs(side),{x,y}=L.lamp;
    const reach=Math.max(w,h)*(.18+.85*strength),spread=reach*(.05+.22*(1-strength));
    c.save();c.globalCompositeOperation='screen';
    for(const dir of [Math.sign(side)||1,-(Math.sign(side)||1)]){
      const g=c.createLinearGradient(x,y,x+dir*reach,y);g.addColorStop(0,css(color,.42));g.addColorStop(.6,css(color,.12));g.addColorStop(1,css(color,0));
      c.fillStyle=g;poly([[x,y-4*u],[x+dir*reach,y-spread*.7+reach*.03],[x+dir*reach,y+spread*.9+reach*.03],[x,y+4*u]]);c.fill();
    }
    // Glitter where the beam grazes the swell on the sea side.
    const seaDir=-1,lit=side*seaDir>0?strength:0;
    if(lit>.15){
      c.fillStyle=css(color,.35*lit);
      for(let i=0;i<60;i++){
        const fx=x-(.1+hash(i+70)*.9)*reach,k=1+i%2,fy=wave(k,fx)+hash(i+71)*12*u;
        if(fx<0)continue;const tw=.4+.6*Math.abs(Math.sin(time*3+i));
        c.globalAlpha=tw;c.fillRect(fx,fy,(8+hash(i)*22)*u,1.4*u);
      }
      c.globalAlpha=1;
    }
    const flare=Math.max(0,Math.sin(phi))**10;
    soft(x,y,(60+flare*260)*u,(60+flare*260)*u,color,.55+flare*.4);
    c.restore();
    L.flare=flare;
  }
  function lighthouse(s){
    const {cliffX,cliffTop,tower:tx}=L,lift=s?s.level*40:0;
    const rock=[20+lift,26+lift,34+lift].map(Math.round);
    c.fillStyle=css(rock);
    poly([[cliffX-300*u,h+10],[cliffX-250*u,cliffTop+170*u],[cliffX-200*u,cliffTop+70*u],[cliffX-130*u,cliffTop+16*u],[cliffX-40*u,cliffTop],[w+10,cliffTop-14*u],[w+10,h+10]]);c.fill();
    c.strokeStyle=`rgba(120,140,170,${.12+(s?s.level*.4:0)})`;c.lineWidth=2*u;c.beginPath();
    c.moveTo(cliffX-250*u,cliffTop+170*u);c.lineTo(cliffX-200*u,cliffTop+70*u);c.lineTo(cliffX-130*u,cliffTop+16*u);c.lineTo(cliffX-40*u,cliffTop);c.stroke();
    c.fillStyle='rgba(0,0,0,.25)';for(let i=0;i<7;i++){const x=cliffX-180*u+i*70*u;poly([[x,cliffTop+40*u+hash(i)*60*u],[x+30*u,cliffTop+90*u+hash(i+3)*80*u],[x-10*u,h]]);c.fill();}
    c.fillStyle='#17241d';c.fillRect(cliffX-60*u,cliffTop-8*u,w-cliffX+80*u,12*u);
    const sway=Math.sin(time*2.2)*4*u*storm();
    c.strokeStyle='#1f3326';c.lineWidth=2*u;
    for(let i=0;i<40;i++){const gx=cliffX-50*u+i*14*u;if(gx>w)break;c.beginPath();c.moveTo(gx,cliffTop);c.lineTo(gx+sway+hash(i)*4*u,cliffTop-(10+hash(i+5)*12)*u);c.stroke();}
    const hx=tx+120*u,hy=cliffTop-6*u;
    c.fillStyle='#2b3038';c.fillRect(hx-55*u,hy-70*u,110*u,70*u);
    c.fillStyle='#1a1d24';poly([[hx-66*u,hy-68*u],[hx,hy-112*u],[hx+66*u,hy-68*u]]);c.fill();
    const fl=.8+.15*Math.sin(time*5.3)+.05*Math.sin(time*13);
    c.fillStyle=`rgba(255,196,110,${fl})`;c.fillRect(hx-30*u,hy-48*u,22*u,24*u);c.fillRect(hx+12*u,hy-48*u,22*u,24*u);
    soft(hx,hy-36*u,90*u,50*u,[255,180,90],.18*fl);
    c.fillStyle='#232830';c.fillRect(hx+28*u,hy-128*u,14*u,40*u);
    for(let j=0;j<6;j++){const p=((time*.5)+j/6)%1;c.fillStyle=`rgba(150,160,175,${.35*(1-p)})`;ellipse(hx+35*u+p*120*u*storm(),hy-132*u-p*26*u,(5+p*16)*u,(4+p*9)*u);c.fill();}
    const base=cliffTop,top=base-290*u,bw=44*u,tw=30*u;
    const shape=(y)=>bw+(tw-bw)*((base-y)/(base-top));
    c.save();poly([[tx-bw,base],[tx-tw,top],[tx+tw,top],[tx+bw,base]]);c.clip();
    const body=c.createLinearGradient(tx-bw,0,tx+bw,0);body.addColorStop(0,'#8c8f96');body.addColorStop(.45,'#e6e3dc');body.addColorStop(1,'#6d7078');
    c.fillStyle=body;c.fillRect(tx-bw,top,bw*2,base-top);
    c.fillStyle='rgba(176,32,40,.92)';for(let b=0;b<3;b++){const y=top+(b*2+1)*(base-top)/6;c.fillRect(tx-bw,y,bw*2,(base-top)/6);}
    c.fillStyle='rgba(0,0,0,.25)';c.fillRect(tx+tw*.35,top,bw,base-top);
    if(s){c.fillStyle=`rgba(200,215,255,${s.level*.35})`;c.fillRect(tx-bw,top,bw*2,base-top);}
    c.restore();
    for(const f of [.25,.55]){const y=base-(base-top)*f;c.fillStyle=`rgba(255,200,120,${fl*.9})`;c.fillRect(tx-5*u,y,10*u,16*u);}
    c.fillStyle='#1c2028';c.fillRect(tx-tw-14*u,top-8*u,(tw+14*u)*2,10*u);
    c.strokeStyle='#1c2028';c.lineWidth=2*u;c.beginPath();for(let i=0;i<=8;i++){const x=tx-tw-12*u+i*(tw+12*u)*2/8;c.moveTo(x,top-8*u);c.lineTo(x,top-22*u);}c.moveTo(tx-tw-12*u,top-22*u);c.lineTo(tx+tw+12*u,top-22*u);c.stroke();
    const color=rgb(settings.beamColor),lx=L.lamp.x,ly=L.lamp.y;
    c.fillStyle='#1c2028';c.fillRect(tx-tw+4*u,top-50*u,(tw-4*u)*2,42*u);
    c.fillStyle=css(color,.85);c.fillRect(tx-tw+8*u,top-46*u,(tw-8*u)*2,34*u);
    c.fillStyle='rgba(255,255,255,.95)';ellipse(lx+Math.sin(time*.85)*14*u,ly,7*u,9*u);c.fill();
    c.strokeStyle='#1c2028';c.lineWidth=2*u;c.beginPath();c.moveTo(tx-8*u,top-46*u);c.lineTo(tx-8*u,top-12*u);c.moveTo(tx+8*u,top-46*u);c.lineTo(tx+8*u,top-12*u);c.stroke();
    c.fillStyle='#7a1c22';c.beginPath();c.moveTo(tx-tw-2*u,top-50*u);c.quadraticCurveTo(tx,top-92*u,tx+tw+2*u,top-50*u);c.closePath();c.fill();
    c.strokeStyle='#1c2028';c.lineWidth=2.5*u;c.beginPath();c.moveTo(tx,top-80*u);c.lineTo(tx,top-100*u);c.stroke();
    L.shape=shape;
  }
  function boat(){
    if(!on(settings.boat))return;
    const x=w*(L.portrait?.28:.3)+Math.sin(time*.035)*w*.1,y=wave(1,x),tilt=Math.atan2(wave(1,x+20*u)-wave(1,x-20*u),40*u)*1.4,s=u*.9;
    c.save();c.translate(x,y+2*u);c.rotate(tilt);
    c.fillStyle='#0d1219';poly([[-46*s,-12*s],[46*s,-14*s],[34*s,4*s],[-36*s,4*s]]);c.fill();
    c.fillStyle='#1b222c';c.fillRect(-12*s,-30*s,26*s,18*s);
    c.fillStyle='rgba(255,200,120,.9)';c.fillRect(-6*s,-25*s,7*s,6*s);c.fillRect(4*s,-25*s,7*s,6*s);
    c.strokeStyle='#0d1219';c.lineWidth=2*s;c.beginPath();c.moveTo(-24*s,-12*s);c.lineTo(-24*s,-70*s);c.lineTo(30*s,-14*s);c.stroke();
    const blink=Math.sin(time*3)>.2;
    if(blink){c.fillStyle='#ff5050';ellipse(-24*s,-72*s,3*s,3*s);c.fill();c.globalCompositeOperation='screen';soft(-24*s,-72*s,16*s,16*s,[255,80,80],.5);}
    c.restore();
  }
  function rocks(s){
    const lift=s?Math.round(s.level*30):0;
    c.fillStyle=`rgb(${8+lift},${12+lift},${18+lift})`;
    const fx=L.portrait?0:0,base=h+10;
    poly([[fx-10,base],[fx-10,h*.86],[w*.06,h*.82],[w*.12,h*.85],[w*.16,h*.83],[w*.22,h*.89],[w*.28,h*.92],[w*.34,base]]);c.fill();
    c.strokeStyle=`rgba(120,140,170,${.1+(s?s.level*.3:0)})`;c.lineWidth=2*u;c.beginPath();c.moveTo(-10,h*.86);c.lineTo(w*.06,h*.82);c.lineTo(w*.12,h*.85);c.lineTo(w*.16,h*.83);c.stroke();
  }
  // Breaking waves: deterministic bursts of spray thrown up against the rocks.
  function spray(){
    if(!on(settings.spray))return;
    const st=storm(),sources=[[L.cliffX-245*u,L.bands[3]+10*u,3.8],[w*.1,h*.83,5.1],[L.cliffX-180*u,L.bands[4]-10*u,6.3]];
    sources.forEach(([sx,sy,period],i)=>{
      const p=((time+i*1.7)/period)%1,t=p*period;if(t>1.8)return;
      const fade=1-t/1.8;
      soft(sx,sy-t*80*u,(70+t*150)*u,(50+t*110)*u,[205,218,232],.32*fade*st);
      soft(sx,sy-t*160*u,(30+t*60)*u,(60+t*170)*u,[225,232,242],.28*fade*st);
      c.fillStyle='rgba(230,238,246,1)';
      for(let k=0;k<90;k++){
        const id=i*1000+k+Math.floor((time+i*1.7)/period)*7,ang=-Math.PI/2+(hash(id)-.5)*1.1,v=(260+hash(id+1)*520)*u*(.6+st*.4);
        const px=sx+Math.cos(ang)*v*t+24*u*t*st,py=sy+Math.sin(ang)*v*t+520*u*t*t;
        if(py>sy+20*u)continue;
        c.globalAlpha=fade*(.4+hash(id+2)*.5);ellipse(px,py,(1.5+hash(id+3)*4)*u,(1.5+hash(id+3)*4)*u);c.fill();
      }
      c.globalAlpha=1;
    });
  }
  function rain(){
    if(!on(settings.rain))return;
    const st=storm(),n=Math.round(260*st);
    c.strokeStyle='rgba(170,190,215,.32)';c.lineWidth=1.2*u;c.beginPath();
    for(let i=0;i<n;i++){
      const fall=(1300+hash(i+3)*700)*u,len=(18+hash(i+4)*20)*u,y=((hash(i+1)*(h+80*u)+time*fall)%(h+80*u))-40*u;
      const x=((hash(i+2)*w*1.4+time*fall*.38)%(w*1.4))-w*.2;
      c.moveTo(x,y);c.lineTo(x+len*.38,y+len);
    }
    c.stroke();
  }
  function draw(){
    layout();const s=strike();flash=s?s.level:0;
    sky(s);clouds(0,s);bolt(s);clouds(1,s);
    sea(0,s);sea(1,s);boat();sea(2,s);
    lighthouse(s);beams();
    sea(3,s);spray();sea(4,s);rocks(s);rain();
    if(flash){c.fillStyle=`rgba(190,205,240,${flash*.18})`;c.fillRect(0,0,w,h);}
    const v=c.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.3,w*.5,h*.5,Math.max(w,h)*.8);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.5)');
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
    draw();
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
