/* Lantern Fairground: original code-drawn night fair scene, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), c=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  const TAU=Math.PI*2, mod=(a,b)=>((a%b)+b)%b, mix=(a,b,t)=>a+(b-a)*t, mixc=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  let settings={speed:1,wheel:1,fireworks:1,lanterns:14,lights:'#ffc46b',reflection:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2), wheelSpeed=()=>num('wheel',1,0,2), fireRate=()=>num('fireworks',1,0,2), lanternCount=()=>Math.round(num('lanterns',14,0,30));
  const bulb=()=>{const m=/^#?([0-9a-f]{6})$/i.exec(String(settings.lights||''));const n=m?parseInt(m[1],16):0xffc46b;return [n>>16&255,n>>8&255,n&255];};
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):20, paused=preview, fps=30;
  let w=1,h=1,u=1,gy=1,wl=1,cx=0,bg=null,bgKey='';

  const css=(a,alpha=1)=>`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${clamp(alpha,0,1).toFixed(3)})`;
  const WHITE=[255,255,255], NIGHT=[18,14,36], RED=[196,44,58], CREAM=[240,226,200];
  const PAL=[[255,92,96],[255,204,92],[110,214,255],[150,255,160],[255,120,222],[196,150,255]];
  const FW=[[255,84,96],[255,214,110],[110,200,255],[170,255,140],[255,120,230],[205,165,255],[255,250,235]];
  // Stalls and garland poles in design units from the centre of the fair; off-screen ones are simply skipped by the canvas.
  const BOOTHS=[[-1420,2],[-1160,0],[-890,4],[-640,1],[440,3],[910,5],[1170,1],[1430,4]];
  const POLES=[-1560,-1290,-1030,-770,-520,-150,60,450,820,1060,1300,1560];
  const WALKERS=Array.from({length:18},(_,i)=>({dir:hash(i*3.1)>.5?1:-1,x0:hash(i*4.7),v:14+hash(i*5.3)*18,y:hash(i*6.1),s:.82+hash(i*7.9)*.35,
    kid:hash(i*8.3)>.78,balloon:hash(i*9.7)>.62?PAL[Math.floor(hash(i*2.2)*PAL.length)]:null,ph:hash(i*1.9)*TAU}));

  function layout(){
    u=w/h<1?h/1350:Math.min(h/1080,w/1500);
    gy=h*.745;wl=h*.8;cx=w/2-(w/h<1?180*u:0);
  }

  const hillY=(x,base,amp,seed)=>{const s=x/u;return base-amp*(.55+.25*Math.sin(s*.0021+seed)+.15*Math.sin(s*.0057+seed*2.3)+.05*Math.sin(s*.019+seed*4.1));};

  function background(){
    const k=`${w}x${h}|${bulb().join()}`;
    if(k===bgKey)return;bgKey=k;
    bg=document.createElement('canvas');bg.width=w;bg.height=h;
    const g=bg.getContext('2d'), b=bulb();
    const lg=g.createLinearGradient(0,0,0,gy);
    lg.addColorStop(0,'#050817');lg.addColorStop(.5,'#11123a');lg.addColorStop(.84,css(mixc([62,34,76],b,.12)));lg.addColorStop(1,css(mixc([118,56,62],b,.25)));
    g.fillStyle=lg;g.fillRect(0,0,w,h);
    // the fair lights the low clouds and haze above it
    const rg=g.createRadialGradient(cx+80*u,gy,0,cx+80*u,gy,Math.max(w,h)*.62);
    rg.addColorStop(0,css(b,.3));rg.addColorStop(.4,css(mixc(b,[255,90,80],.4),.08));rg.addColorStop(1,css(b,0));
    g.fillStyle=rg;g.fillRect(0,0,w,h);
    // crescent moon
    const mx=cx-(w/h<1?-60:520)*u, my=h*.15, mr=30*u, mg=g.createRadialGradient(mx,my,mr*.8,mx,my,mr*5);
    mg.addColorStop(0,'rgba(220,225,255,.16)');mg.addColorStop(1,'rgba(220,225,255,0)');g.fillStyle=mg;g.fillRect(mx-mr*5,my-mr*5,mr*10,mr*10);
    const m=document.createElement('canvas');m.width=m.height=Math.ceil(mr*2.4);const mc=m.getContext('2d'), o=m.width/2;
    mc.fillStyle='#f3f0dc';mc.beginPath();mc.arc(o,o,mr,0,TAU);mc.fill();
    mc.globalCompositeOperation='destination-out';mc.beginPath();mc.arc(o+mr*.42,o-mr*.18,mr*.9,0,TAU);mc.fill();
    g.drawImage(m,mx-o,my-o);
    // two ranges of distant hills, the near one dotted with village windows
    for(const [base,amp,seed,col] of [[gy-110*u,110*u,1.3,'#0c0e26'],[gy-36*u,70*u,2.1,'#100e22']]){
      g.fillStyle=col;g.beginPath();g.moveTo(0,h);
      for(let x=0;x<=w+8;x+=8)g.lineTo(x,hillY(x,base,amp,seed));
      g.lineTo(w,h);g.closePath();g.fill();
    }
    for(let i=0;i<70;i++){
      const x=hash(i*3.3)*w, y=hillY(x,gy-36*u,70*u,2.1)+(4+hash(i*5.1)*30)*u;
      if(y>gy)continue;
      g.fillStyle=css(mixc([255,200,130],b,.3),.35+hash(i*7.7)*.4);g.fillRect(x,y,Math.max(1,1.6*u),Math.max(1,1.6*u));
    }
    // fairground lawn between the rides and the pond
    const lawn=g.createLinearGradient(0,gy,0,wl);lawn.addColorStop(0,css(mixc([40,26,34],b,.18)));lawn.addColorStop(1,'#07060c');
    g.fillStyle=lawn;g.fillRect(0,gy,w,wl-gy);
  }

  function stars(t){
    for(let i=0;i<190;i++){
      const x=hash(i*1.7)*w, y=Math.pow(hash(i*2.9),1.4)*(gy-220*u);
      const a=(.25+.55*hash(i*4.3))*(.65+.35*Math.sin(t*(1+hash(i*6.6)*2)+i))*(1-y/gy);
      c.fillStyle=css([230,232,255],a);const s=Math.max(1,(.8+hash(i*8.8)*1.2)*u);c.fillRect(x,y,s,s);
    }
  }

  function fireworks(t){
    const r=fireRate();if(r<=0)return;
    const P=3.4/r;
    c.save();c.globalCompositeOperation='lighter';c.lineCap='round';
    for(let k=Math.floor((t-6)/P);k<=Math.floor(t/P);k++){
      for(let m=0;m<2;m++){
        if(m&&hash(k*7.1+3)>r*.35)continue;
        const sd=k*13.7+m*5.3, t0=k*P+hash(sd)*P*.7, rise=1+hash(sd+1)*.5, tb=t0+rise;
        if(t<t0)continue;
        const bx=cx+(hash(sd+2)-.5)*Math.min(w*.9,2000*u), by=h*(.1+hash(sd+3)*.2);
        const type=Math.floor(hash(sd+4)*3), col=FW[Math.floor(hash(sd+5)*FW.length)], col2=FW[Math.floor(hash(sd+6)*FW.length)];
        if(t<tb){
          // rising shell with a short spark trail
          const p=(t-t0)/rise, at=q=>gy-(gy-by)*(1-(1-q)*(1-q)), sx=bx+(hash(sd+7)-.5)*50*u*(1-p);
          c.strokeStyle=css([255,206,150],.55);c.lineWidth=Math.max(1,1.6*u);
          c.beginPath();c.moveTo(sx,at(Math.max(0,p-.1)));c.lineTo(sx,at(p));c.stroke();
          c.fillStyle='rgba(255,240,210,.9)';c.beginPath();c.arc(sx,at(p),Math.max(1,2*u),0,TAU);c.fill();
          continue;
        }
        const life=type===2?3.4:2.4, dt=t-tb;if(dt>life)continue;
        const fade=Math.pow(1-dt/life,1.4), n=type===1?44:64, V=(175+hash(sd+8)*110)*u, kd=type===2?1.8:1.4, grav=(type===2?72:38)*u;
        if(dt<.4){
          const fg=c.createRadialGradient(bx,by,0,bx,by,300*u);fg.addColorStop(0,css(col,.24*(1-dt/.4)));fg.addColorStop(1,css(col,0));
          c.fillStyle=fg;c.fillRect(bx-300*u,by-300*u,600*u,600*u);
        }
        const pos=(a,v,tt)=>{const s=v*(1-Math.exp(-kd*tt))/kd;return [bx+Math.cos(a)*s,by+Math.sin(a)*s+grav*tt*tt*.5];};
        c.lineWidth=Math.max(1,2.3*u);
        for(let ring=0;ring<(type===1?2:1);ring++){
          for(let i=0;i<n;i++){
            const a=i/n*TAU+hash(sd+i*.37)*.12, v=V*(type===1?(ring?.55:1):.45+hash(sd*1.3+i)*.55);
            const [x1,y1]=pos(a,v,dt), [x2,y2]=pos(a,v,Math.max(0,dt-(type===2?.4:.15)));
            const crackle=dt>life*.6?(hash(i+ring*91+Math.floor(t*12))>.5?1:.3):1;
            c.strokeStyle=css(type===2?[255,196,110]:(ring||i%2)?col2:col,.9*fade*crackle);
            c.beginPath();c.moveTo(x2,y2);c.lineTo(x1,y1);c.stroke();
          }
        }
      }
    }
    c.restore();
  }

  function gondola(x,y,sway,col,b){
    const s=u*1.15;
    c.save();c.translate(x,y);c.rotate(sway);
    c.strokeStyle='#2c2a3c';c.lineWidth=2*s;c.beginPath();c.moveTo(0,0);c.lineTo(0,13*s);c.stroke();
    c.fillStyle='#1c1a2a';c.beginPath();c.roundRect(-19*s,12*s,38*s,30*s,6*s);c.fill();
    c.fillStyle=css(mixc([255,214,150],b,.5),.88);c.fillRect(-15*s,18*s,30*s,13*s);
    c.fillStyle='#1c1a2a';c.beginPath();c.arc(-6*s,28*s,4.2*s,0,TAU);c.arc(6*s,27*s,4*s,0,TAU);c.fill();
    c.fillStyle=css(col);c.beginPath();c.moveTo(-21*s,14*s);c.quadraticCurveTo(0,1*s,21*s,14*s);c.closePath();c.fill();
    c.fillStyle=css(mixc(col,[0,0,0],.45));c.fillRect(-19*s,37*s,38*s,5*s);
    c.restore();
  }

  function wheel(t,b){
    const R=270*u, x0=cx+180*u, y0=gy-R-70*u, rot=t*.075*wheelSpeed()+.4, mode=Math.floor(t/9)%3;
    c.save();c.globalCompositeOperation='lighter';
    const hg=c.createRadialGradient(x0,y0,R*.2,x0,y0,R*1.35);hg.addColorStop(0,css(b,.1));hg.addColorStop(.7,css(b,.06));hg.addColorStop(1,css(b,0));
    c.fillStyle=hg;c.fillRect(x0-R*1.4,y0-R*1.4,R*2.8,R*2.8);c.restore();
    // A-frame legs and braces
    c.strokeStyle='#1d1c30';c.lineCap='round';c.lineWidth=9*u;
    c.beginPath();for(const sx of [-1,1]){c.moveTo(x0,y0);c.lineTo(x0+sx*R*.5,gy);}c.stroke();
    c.lineWidth=3*u;c.beginPath();for(const f of [.45,.75]){c.moveTo(x0-R*.5*f,y0+(gy-y0)*f);c.lineTo(x0+R*.5*f,y0+(gy-y0)*f);}c.stroke();
    // rims, truss and spokes
    const steel=css(mixc([70,66,104],b,.25));
    c.strokeStyle=steel;c.lineWidth=1.4*u;c.beginPath();
    for(let k=0;k<24;k++){const a=rot+k/24*TAU;c.moveTo(x0,y0);c.lineTo(x0+Math.cos(a)*R,y0+Math.sin(a)*R);}c.stroke();
    c.lineWidth=3*u;c.beginPath();c.arc(x0,y0,R,0,TAU);c.moveTo(x0+R*.92,y0);c.arc(x0,y0,R*.92,0,TAU);c.stroke();
    c.lineWidth=1.2*u;c.beginPath();
    for(let k=0;k<48;k++){const a=rot+k/48*TAU, a2=rot+(k+1)/48*TAU, r1=k%2?R:R*.92, r2=k%2?R*.92:R;c.moveTo(x0+Math.cos(a)*r1,y0+Math.sin(a)*r1);c.lineTo(x0+Math.cos(a2)*r2,y0+Math.sin(a2)*r2);}
    c.stroke();
    // spoke lights cycle through three patterns: radial pulse, sweeping beam and sparkle
    c.save();c.globalCompositeOperation='lighter';
    for(let k=0;k<24;k++){
      const a=rot+k/24*TAU, ca=Math.cos(a), sa=Math.sin(a), col=mixc(PAL[(k+mode*2)%PAL.length],b,.4), core=mixc(col,WHITE,.5);
      for(let j=0;j<7;j++){
        const r=R*(.17+.12*j);
        let br=mode===0?.5+.5*Math.sin(t*5-j*.9):mode===1?Math.pow(.5+.5*Math.cos(a-t*1.6),3):hash(k*13+j*7+Math.floor(t*5))>.5?1:.15;
        br=.2+.8*br;
        const px=x0+ca*r, py=y0+sa*r;
        c.fillStyle=css(col,.16*br);c.beginPath();c.arc(px,py,6*u,0,TAU);c.fill();
        c.fillStyle=css(core,.9*br);c.beginPath();c.arc(px,py,Math.max(1,2*u),0,TAU);c.fill();
      }
    }
    for(let k=0;k<48;k++){
      const a=rot+k/48*TAU, px=x0+Math.cos(a)*R, py=y0+Math.sin(a)*R, br=mod(k-Math.floor(t*6),4)===0?1:.35;
      c.fillStyle=css(b,.2*br);c.beginPath();c.arc(px,py,7*u,0,TAU);c.fill();
      c.fillStyle=css(mixc(b,WHITE,.5),.95*br);c.beginPath();c.arc(px,py,Math.max(1,2.4*u),0,TAU);c.fill();
    }
    const hub=c.createRadialGradient(x0,y0,0,x0,y0,40*u);hub.addColorStop(0,css(mixc(b,WHITE,.6),.9));hub.addColorStop(1,css(b,0));
    c.fillStyle=hub;c.fillRect(x0-40*u,y0-40*u,80*u,80*u);
    c.restore();
    c.fillStyle='#2a2638';c.beginPath();c.arc(x0,y0,13*u,0,TAU);c.fill();
    // gondolas hang from the rim and swing a little as the wheel turns
    for(let k=0;k<16;k++){
      const a=rot+k/16*TAU;
      gondola(x0+Math.cos(a)*R,y0+Math.sin(a)*R,Math.sin(t*1.3+k*1.7)*.05+Math.cos(a)*.04*wheelSpeed(),PAL[k%PAL.length],b);
    }
  }

  function horse(x,y,s,dir,shade,col,gallop){
    c.save();c.translate(x,y);c.scale(dir*s,s);
    const body=css(mixc(NIGHT,[244,232,214],shade)), mane=css(mixc(NIGHT,col,shade));
    c.strokeStyle=body;c.lineCap='round';c.lineWidth=4.5;
    c.beginPath();
    c.moveTo(14,4);c.lineTo(20+gallop*9,16);c.lineTo(22+gallop*14,26);
    c.moveTo(-14,4);c.lineTo(-22-gallop*9,15);c.lineTo(-26-gallop*12,24);
    c.moveTo(9,5);c.lineTo(12-gallop*4,25);c.moveTo(-9,5);c.lineTo(-10+gallop*4,25);
    c.stroke();
    c.fillStyle=body;c.beginPath();c.ellipse(0,0,24,10,0,0,TAU);c.fill();
    c.beginPath();c.moveTo(11,-5);c.lineTo(24,-25);c.lineTo(33,-22);c.lineTo(22,3);c.closePath();c.fill();
    c.beginPath();c.ellipse(33,-19,10,5.5,.55,0,TAU);c.fill();
    c.beginPath();c.moveTo(25,-27);c.lineTo(28,-35);c.lineTo(30,-25);c.fill();
    c.strokeStyle=mane;c.lineWidth=4;c.beginPath();c.moveTo(13,-8);c.lineTo(24,-27);c.moveTo(-22,-3);c.quadraticCurveTo(-34,0,-33,14);c.stroke();
    c.fillStyle=mane;c.fillRect(-7,-12,15,6);
    c.restore();
  }

  function carousel(t,b){
    const x0=cx-330*u, rx=150*u, ry=26*u, base=gy-14*u, roofY=gy-158*u, apex=gy-252*u, rot=t*.55, warm=mixc([255,200,130],b,.5);
    const ig=c.createLinearGradient(0,roofY,0,base);ig.addColorStop(0,css(warm,.6));ig.addColorStop(1,css([120,52,44],.6));
    c.fillStyle=ig;c.fillRect(x0-rx*.98,roofY,rx*1.96,base-roofY);
    const horses=Array.from({length:10},(_,i)=>{const a=rot+i/10*TAU;return {i,a,z:Math.sin(a)};}).sort((p,q)=>p.z-q.z);
    const drawHorse=hs=>{
      const x=x0+Math.cos(hs.a)*rx*.82, bob=.5+.5*Math.sin(t*2.4+hs.i*1.3), y=base-46*u-bob*22*u+hs.z*ry*.55, shade=hs.z<0?.45+.25*(1+hs.z):1;
      c.strokeStyle=css(mixc([90,70,40],[230,186,90],shade));c.lineWidth=2.4*u;c.beginPath();c.moveTo(x,roofY);c.lineTo(x,base+hs.z*ry*.55);c.stroke();
      horse(x,y,u*(.82+.18*(hs.z+1)/2),Math.sin(hs.a)>0?-1:1,shade,PAL[hs.i%PAL.length],Math.sin(t*2.4+hs.i*1.3));
    };
    horses.filter(hs=>hs.z<0).forEach(drawHorse);
    // mirrored centre drum
    c.fillStyle=css(mixc([150,96,60],b,.3));c.fillRect(x0-28*u,roofY,56*u,base-roofY-10*u);
    for(let i=0;i<4;i++){const ph=mod(rot*.4+i/4,1), mx=x0-24*u+ph*48*u;c.fillStyle=css(mixc(warm,WHITE,.4),.25+.35*Math.sin(ph*Math.PI));c.fillRect(mx-4*u,roofY+18*u,8*u,base-roofY-46*u);}
    horses.filter(hs=>hs.z>=0).forEach(drawHorse);
    // platform with a ring of bulbs
    c.fillStyle='#2a1a24';c.beginPath();c.ellipse(x0,base,rx,ry,0,0,TAU);c.fill();
    c.fillStyle='#3d2430';c.fillRect(x0-rx,base,rx*2,10*u);c.beginPath();c.ellipse(x0,base+10*u,rx,ry,0,0,Math.PI);c.fill();
    // striped cone roof turning with the ride
    c.fillStyle='#3a1c2a';c.beginPath();c.moveTo(x0,apex);c.lineTo(x0+rx*1.08,roofY);c.ellipse(x0,roofY,rx*1.08,ry*.9,0,0,Math.PI);c.closePath();c.fill();
    for(let s=0;s<16;s++){
      const p1=rot+s/16*TAU, p2=p1+TAU/16;
      if(Math.sin(p1+TAU/32)<=0)continue;
      c.fillStyle=css(mixc(NIGHT,s%2?RED:CREAM,.55+.3*Math.sin(p1+TAU/32)));
      c.beginPath();c.moveTo(x0,apex);c.lineTo(x0+Math.cos(p1)*rx*1.08,roofY+Math.sin(p1)*ry*.9);c.lineTo(x0+Math.cos(p2)*rx*1.08,roofY+Math.sin(p2)*ry*.9);c.closePath();c.fill();
    }
    c.fillStyle=css(mixc(NIGHT,RED,.7));c.beginPath();c.ellipse(x0,roofY,rx*1.08,ry*.9,0,0,Math.PI);c.ellipse(x0,roofY+16*u,rx*1.08,ry*.9,0,Math.PI,0,true);c.fill();
    c.save();c.globalCompositeOperation='lighter';
    for(let s=0;s<36;s++){
      const p=rot+s/36*TAU;if(Math.sin(p)<=-.05)continue;
      const br=mod(s-Math.floor(t*7),3)===0?1:.4, px=x0+Math.cos(p)*rx*1.08, py=roofY+Math.sin(p)*ry*.9+8*u;
      c.fillStyle=css(b,.22*br);c.beginPath();c.arc(px,py,7*u,0,TAU);c.fill();
      c.fillStyle=css(mixc(b,WHITE,.5),.95*br);c.beginPath();c.arc(px,py,Math.max(1,2.2*u),0,TAU);c.fill();
      const qx=x0+Math.cos(p)*rx, qy=base+Math.sin(p)*ry+6*u;
      c.fillStyle=css(mixc(b,WHITE,.4),.7*(mod(s+Math.floor(t*7),3)===0?1:.35));c.beginPath();c.arc(qx,qy,Math.max(1,1.8*u),0,TAU);c.fill();
    }
    c.restore();
    pennant(x0,apex,t,PAL[1]);
  }

  function pennant(x,y,t,col){
    c.strokeStyle='#2a2638';c.lineWidth=2*u;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-30*u);c.stroke();
    c.fillStyle=css(mixc(NIGHT,col,.8));c.beginPath();c.moveTo(x,y-30*u);
    for(let i=1;i<=6;i++){const f=i/6;c.lineTo(x+f*28*u,y-30*u+f*6*u+Math.sin(t*5-f*4+x)*4*u*f);}
    c.lineTo(x,y-18*u);c.closePath();c.fill();
  }

  function bigTop(t,b){
    const x0=cx+640*u, W=170*u, wallT=gy-90*u, peak=gy-232*u, stripes=12;
    for(let s=0;s<stripes;s++){
      c.fillStyle=css(mixc(NIGHT,s%2?RED:CREAM,.6+.15*Math.sin(s/stripes*Math.PI)));
      c.fillRect(x0-W+s*W*2/stripes,wallT,W*2/stripes+1,gy-wallT);
    }
    for(let s=0;s<stripes;s++){
      const xa=x0-W*1.06+s*W*2.12/stripes, xb=xa+W*2.12/stripes;
      c.fillStyle=css(mixc(NIGHT,s%2?CREAM:RED,.62));
      c.beginPath();c.moveTo(x0,peak);c.quadraticCurveTo(mix(x0,xa,.55),mix(peak,wallT,.62),xa,wallT);c.lineTo(xb,wallT);c.quadraticCurveTo(mix(x0,xb,.55),mix(peak,wallT,.62),x0,peak);c.fill();
    }
    c.fillStyle=css(mixc(NIGHT,RED,.75));
    for(let s=0;s<stripes;s++){const xa=x0-W*1.06+s*W*2.12/stripes, r=W*1.06/stripes;c.beginPath();c.arc(xa+r,wallT,r,0,Math.PI);c.fill();}
    const eg=c.createLinearGradient(0,gy-80*u,0,gy);eg.addColorStop(0,css(mixc([255,214,150],b,.5),.95));eg.addColorStop(1,css([255,120,60],.8));
    c.fillStyle=eg;c.beginPath();c.moveTo(x0-32*u,gy);c.quadraticCurveTo(x0-4*u,gy-50*u,x0,gy-82*u);c.quadraticCurveTo(x0+4*u,gy-50*u,x0+32*u,gy);c.fill();
    c.save();c.globalCompositeOperation='lighter';
    for(const side of [-1,1])for(let i=1;i<=12;i++){
      const f=i/12, px=mix(x0,x0+side*W*1.06,f), py=mix(peak,wallT,f)+Math.sin(f*Math.PI)*-10*u, br=mod(i+Math.floor(t*6),3)===0?1:.35;
      c.fillStyle=css(b,.2*br);c.beginPath();c.arc(px,py,7*u,0,TAU);c.fill();
      c.fillStyle=css(mixc(b,WHITE,.5),.95*br);c.beginPath();c.arc(px,py,Math.max(1,2.2*u),0,TAU);c.fill();
    }
    c.restore();
    pennant(x0,peak,t,PAL[0]);
  }

  function booth(x,ci,t,b){
    const bw=98*u, bh=78*u, top=gy-bh, col=PAL[ci], warm=mixc([255,206,140],b,.5);
    c.fillStyle='#1b1626';c.fillRect(x-bw/2,top,bw,bh);
    const lg=c.createLinearGradient(0,top+24*u,0,top+56*u);lg.addColorStop(0,css(warm,.95));lg.addColorStop(1,css([200,96,60],.85));
    c.fillStyle=lg;c.fillRect(x-bw/2+8*u,top+24*u,bw-16*u,32*u);
    // prizes on the back shelf
    for(let i=0;i<5;i++){c.fillStyle=css(mixc(NIGHT,PAL[(ci+i)%PAL.length],.7));c.beginPath();c.arc(x-bw/2+20*u+i*14.5*u,top+34*u,5*u,0,TAU);c.fill();}
    c.fillStyle='#120e1c';c.fillRect(x-bw/2+4*u,top+54*u,bw-8*u,6*u);
    // scalloped awning
    const n=7, sw=(bw+12*u)/n;
    for(let i=0;i<n;i++){
      const sx=x-bw/2-6*u+i*sw;c.fillStyle=css(mixc(NIGHT,i%2?col:CREAM,.68));
      c.fillRect(sx,top-6*u,sw+.5,18*u);c.beginPath();c.arc(sx+sw/2,top+12*u,sw/2,0,Math.PI);c.fill();
    }
    c.save();c.globalCompositeOperation='lighter';
    for(let i=0;i<9;i++){
      const px=x-bw/2+i*bw/8, br=mod(i-Math.floor(t*5+ci),2)===0?1:.35;
      c.fillStyle=css(b,.2*br);c.beginPath();c.arc(px,top-8*u,6*u,0,TAU);c.fill();
      c.fillStyle=css(mixc(b,WHITE,.5),.9*br);c.beginPath();c.arc(px,top-8*u,Math.max(1,2*u),0,TAU);c.fill();
    }
    c.restore();
  }

  function walkers(t){
    const span=w+200*u;
    for(const p of WALKERS){
      const x=mod(p.x0*span+p.dir*p.v*u*t,span)-100*u, y=gy+(6+p.y*(wl-gy-14*u)/u)*u, s=p.s*u*(p.kid?.7:1)*(.9+.2*p.y);
      const step=Math.sin(t*p.v*.32+p.ph);
      c.strokeStyle='#07060d';c.fillStyle='#07060d';c.lineCap='round';c.lineWidth=4*s;
      c.beginPath();c.moveTo(x,y-12*s);c.lineTo(x+step*4*s,y);c.moveTo(x,y-12*s);c.lineTo(x-step*4*s,y);c.stroke();
      c.beginPath();c.roundRect(x-4.5*s,y-27*s,9*s,16*s,4*s);c.fill();
      c.beginPath();c.arc(x,y-31*s,4*s,0,TAU);c.fill();
      if(p.balloon){
        const bx=x+p.dir*-4*s+Math.sin(t*1.4+p.ph)*2*s, by=y-58*s;
        c.lineWidth=.8*s;c.beginPath();c.moveTo(x+p.dir*-3*s,y-22*s);c.lineTo(bx,by+8*s);c.stroke();
        c.fillStyle=css(mixc(NIGHT,p.balloon,.85));c.beginPath();c.ellipse(bx,by,6.5*s,8*s,0,0,TAU);c.fill();
        c.fillStyle='rgba(255,255,255,.35)';c.beginPath();c.arc(bx-2*s,by-3*s,1.6*s,0,TAU);c.fill();
      }
    }
  }

  function garlands(t,b){
    const tops=POLES.map((p,i)=>gy-(118+hash(i*3.7)*34)*u);
    c.strokeStyle='#14121e';c.lineWidth=3*u;c.beginPath();
    POLES.forEach((p,i)=>{c.moveTo(cx+p*u,gy+4*u);c.lineTo(cx+p*u,tops[i]-4*u);});c.stroke();
    c.lineWidth=Math.max(1,u);c.strokeStyle='rgba(20,16,30,.9)';
    const at=(i,f)=>{const x1=cx+POLES[i]*u, x2=cx+POLES[i+1]*u, sag=(30+(x2-x1)/u*.06)*u;return [mix(x1,x2,f),mix(tops[i],tops[i+1],f)+sag*4*f*(1-f)];};
    c.beginPath();for(let i=0;i<POLES.length-1;i++)for(let m=0;m<=16;m++){const [x,y]=at(i,m/16);m?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();
    c.save();c.globalCompositeOperation='lighter';
    let idx=0;
    for(let i=0;i<POLES.length-1;i++){
      const n=Math.max(4,Math.round((POLES[i+1]-POLES[i])/24));
      for(let m=1;m<n;m++,idx++){
        const [x,y]=at(i,m/n), col=mixc(PAL[idx%PAL.length],b,.45), br=.3+.7*Math.pow(.5+.5*Math.sin(t*2.6-idx*.35),2);
        c.fillStyle=css(col,.2*br);c.beginPath();c.arc(x,y+3*u,7*u,0,TAU);c.fill();
        c.fillStyle=css(mixc(col,WHITE,.45),.95*br);c.beginPath();c.arc(x,y+3*u,Math.max(1,2.4*u),0,TAU);c.fill();
      }
    }
    c.restore();
  }

  function lanterns(t,b){
    const n=lanternCount();if(!n)return;
    c.save();c.globalCompositeOperation='lighter';
    for(let i=0;i<n;i++){
      const L=38+hash(i*3.1)*24, p=mod(t/L+hash(i*5.7),1), start=gy-40*u;
      const x=cx+(hash(i*2.3)-.5)*1500*u+p*(120+hash(i*4.4)*160)*u+Math.sin(t*.4+i)*14*u*p, y=start-(start+80*u)*p;
      const sz=(10-5*p)*u*(.8+hash(i*6.2)*.4), fade=Math.min(1,p/.04)*Math.min(1,(1-p)/.25);
      const flick=.8+.14*Math.sin(t*9+i*3)+.06*Math.sin(t*23+i), col=mixc([255,150,62],b,.3);
      const hg=c.createRadialGradient(x,y,0,x,y,sz*5);hg.addColorStop(0,css(col,.32*fade*flick));hg.addColorStop(1,css(col,0));
      c.fillStyle=hg;c.fillRect(x-sz*5,y-sz*5,sz*10,sz*10);
      c.fillStyle=css(mixc(col,[255,190,110],.5),.78*fade*flick);
      c.beginPath();c.moveTo(x-sz*.62,y-sz);c.lineTo(x+sz*.62,y-sz);c.lineTo(x+sz*.45,y+sz*.7);c.lineTo(x-sz*.45,y+sz*.7);c.closePath();c.fill();
      c.fillStyle=css([255,246,210],.9*fade*flick);c.beginPath();c.arc(x,y+sz*.55,sz*.24,0,TAU);c.fill();
    }
    c.restore();
  }

  function water(t,b){
    const depth=h-wl, k=1.45;
    c.fillStyle='#05060f';c.fillRect(0,wl,w,depth);
    if(on(settings.reflection)){
      // mirror the fair into the pond strip by strip, each strip shifted by a slow ripple
      const step=Math.max(2,Math.round(2*u));
      for(let y=wl;y<h;y+=step){
        const d=y-wl, sy=wl-(d+step)*k;if(sy<0)break;
        const off=(Math.sin(t*1.1+d*.06/u)*1.2+Math.sin(t*1.7-d*.11/u)*.6)*(1+d/(50*u))*u;
        c.globalAlpha=clamp(.82-d/depth*.45,0,1);
        c.drawImage(canvas,0,sy,w,step*k,off,y,w,step);
      }
      c.globalAlpha=1;
    }
    const g=c.createLinearGradient(0,wl,0,h);g.addColorStop(0,'rgba(6,8,24,.25)');g.addColorStop(1,'rgba(3,4,12,.72)');
    c.fillStyle=g;c.fillRect(0,wl,w,depth);
    c.save();c.globalCompositeOperation='lighter';
    for(let i=0;i<46;i++){
      const y=wl+Math.pow(hash(i*2.7),1.4)*depth, x=hash(i*1.3)*w+Math.sin(t*.5+i)*20*u, len=(20+hash(i*3.9)*70)*u*(1+(y-wl)/depth);
      c.fillStyle=css(mixc(b,PAL[i%PAL.length],.3),.05+.05*Math.sin(t*2+i*3));c.fillRect(x-len/2,y,len,Math.max(1,1.2*u));
    }
    c.restore();
    c.fillStyle='#08070f';c.fillRect(0,wl-1,w,Math.max(1,2*u));
  }

  function reeds(t){
    c.strokeStyle='#030308';c.fillStyle='#030308';c.lineCap='round';
    for(let i=0;i<46;i++){
      const left=i<23, x=left?hash(i*3.3)*Math.min(260*u,w*.16):w-hash(i*3.3)*Math.min(300*u,w*.18), len=(60+hash(i*5.9)*120)*u, lean=(left?.25:-.25)*hash(i*7.1);
      const sway=Math.sin(t*.9+i*1.7)*.06+lean, tx=x+Math.sin(sway)*len, ty=h-Math.cos(sway)*len;
      c.lineWidth=(2+hash(i*2.4)*2.5)*u;c.beginPath();c.moveTo(x,h+4*u);c.quadraticCurveTo(x+Math.sin(sway)*len*.3,h-len*.5,tx,ty);c.stroke();
      if(hash(i*8.8)>.7){c.beginPath();c.ellipse(tx,ty+8*u,3.5*u,11*u,sway,0,TAU);c.fill();}
    }
  }

  function draw(){
    background();c.drawImage(bg,0,0);
    const t=time, b=bulb();
    stars(t);fireworks(t);
    wheel(t,b);carousel(t,b);bigTop(t,b);
    for(const [dx,ci] of BOOTHS)booth(cx+dx*u,ci,t,b);
    walkers(t);garlands(t,b);lanterns(t,b);water(t,b);reeds(t);
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
