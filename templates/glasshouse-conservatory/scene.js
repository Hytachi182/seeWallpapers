/* Glasshouse Conservatory: original code-drawn Victorian glasshouse in the rain, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), main=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  const TAU=Math.PI*2, mod=(a,b)=>((a%b)+b)%b, mix=(a,b,t)=>a+(b-a)*t, mixc=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  let settings={speed:1,rain:1,dusk:0,butterflies:true,mist:true,fountain:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2), rain=()=>num('rain',1,0,2), dusk=()=>num('dusk',0,0,1);
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):12, paused=preview, fps=30;
  let c=main,w=1,h=1,u=1,L={},outside=null,inside=null,key='';

  const css=(a,alpha=1)=>`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${clamp(alpha,0,1).toFixed(3)})`;
  function ellipse(x,y,rx,ry,rot=0){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,TAU);}
  function soft(x,y,rx,ry,color,alpha){
    if(alpha<=.002)return;
    const g=c.createRadialGradient(x,y,0,x,y,rx);g.addColorStop(0,css(color,alpha));g.addColorStop(1,css(color,0));
    c.save();c.translate(x,y);c.scale(1,ry/rx);c.translate(-x,-y);c.fillStyle=g;c.fillRect(x-rx,y-rx,rx*2,rx*2);c.restore();
  }
  function into(target,fn){const prev=c;c=target.getContext('2d');fn();c=prev;}
  function layer(){const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv;}

  // World units: one unit is one pixel at depth z = 1 on a 1080-pixel-high screen.
  const R=1100, FLOOR=560, SPRING=-60, ARCH=700, AISLE=250, BED=470, KNEE=420, END=4.5;
  const RIBS=[1,1.3,1.7,2.2,2.85,3.6,END];
  const P=(X,Y,z)=>[L.vx+X*u/z,L.vy+Y*u/z];
  const arch=(th,z,side=1)=>P(side*R*Math.cos(th),SPRING-ARCH*Math.sin(th),z);
  function layout(){
    const portrait=w/h<1;
    u=portrait?h/1350:Math.min(h/1080,w/1500);
    L={portrait,vx:w/2,vy:h*(portrait?.5:.47)};
    L.plants=[];
    for(const side of [-1,1])for(let i=0;i<24;i++){
      const z=1.02+Math.pow(hash(i*3.7+side),1.6)*(END-1.2), r=hash(i*5.9+side*2);
      L.plants.push({side,z,X:side*(AISLE+60+hash(i*1.7+side)*(R-AISLE-160)),type:Math.floor(r*5),seed:i*7.1+side*3});
    }
    L.plants.sort((a,b)=>b.z-a.z);
  }

  const GREENS=[[38,88,48],[58,118,58],[30,70,44],[84,128,58],[46,104,72]];
  const fogged=(col,z)=>mixc(col,L.fog,clamp((z-1)/(END-1),0,1)*.45);
  function blade(x,y,len,wid,ang,col,alpha=1){
    c.save();c.translate(x,y);c.rotate(ang);c.globalAlpha*=alpha;
    c.fillStyle=css(col);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(len*.4,-wid,len,0);c.quadraticCurveTo(len*.4,wid,0,0);c.fill();
    c.strokeStyle=css(col.map(v=>v*1.35),.6);c.lineWidth=Math.max(.6,wid*.08);c.beginPath();c.moveTo(0,0);c.lineTo(len*.95,0);c.stroke();
    c.restore();
  }
  function frond(x,y,len,ang,droop,col,leaf,sway=0){
    const n=Math.max(6,Math.round(len/(10*u))), pts=[];
    for(let i=0;i<=n;i++){const f=i/n,a=ang+(droop+sway)*f*f;pts.push([x,y,a,f]);if(i<n){x+=Math.cos(a)*len/n;y+=Math.sin(a)*len/n;}}
    c.strokeStyle=css(col.map(v=>v*.8));c.lineWidth=Math.max(1,len*.012);c.beginPath();pts.forEach(([px,py],i)=>i?c.lineTo(px,py):c.moveTo(px,py));c.stroke();
    for(const [px,py,a,f] of pts){if(f<.08)continue;const l=leaf*(1-f*.7);
      blade(px,py,l,l*.18,a-1.1,col);blade(px,py,l,l*.18,a+1.1,col.map(v=>v*.9));}
  }
  function bigLeaf(x,y,len,ang,col,holes){
    c.save();c.translate(x,y);c.rotate(ang);
    c.fillStyle=css(col);c.beginPath();c.moveTo(0,0);
    c.bezierCurveTo(len*.2,-len*.55,len*.85,-len*.5,len,0);c.bezierCurveTo(len*.85,len*.5,len*.2,len*.55,0,0);c.fill();
    c.strokeStyle=css(col.map(v=>v*1.3),.7);c.lineWidth=Math.max(1,len*.018);c.beginPath();c.moveTo(0,0);c.lineTo(len*.97,0);
    for(let k=1;k<7;k++){const f=k/7;c.moveTo(len*f,0);c.lineTo(len*(f+.1),-len*.32*Math.sin(f*Math.PI));c.moveTo(len*f,0);c.lineTo(len*(f+.1),len*.32*Math.sin(f*Math.PI));}
    c.stroke();
    if(holes){c.fillStyle='rgba(0,0,0,.55)';for(let k=1;k<5;k++){const f=k/5.5;for(const s of [-1,1]){ellipse(len*(f+.07),s*len*.26*Math.sin(f*Math.PI),len*.06,len*.022,s*.5);c.fill();}}}
    c.restore();
  }
  function plant(p){
    const [x,y]=P(p.X,BED,p.z), s=u/p.z, r=k=>hash(p.seed+k), col=fogged(GREENS[Math.floor(r(1)*GREENS.length)],p.z), out=p.side;
    if(p.type===0){
      const top=[x+out*40*s,y-(520+r(2)*260)*s];
      c.strokeStyle=css(fogged([86,70,52],p.z));c.lineWidth=18*s;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+out*60*s,y-280*s,top[0],top[1]);c.stroke();
      c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=2*s;for(let k=0;k<12;k++){const f=k/12;c.beginPath();c.moveTo(mix(x,top[0],f)-9*s,mix(y,top[1],f));c.lineTo(mix(x,top[0],f)+9*s,mix(y,top[1],f)-6*s);c.stroke();}
      for(let k=0;k<9;k++)frond(top[0],top[1],(240+r(k+3)*90)*s,-Math.PI/2+(k-4)*.42+(r(k+20)-.5)*.2,(k<4?-1:1)*1.1,col,26*s);
    }else if(p.type===1){
      for(let k=0;k<13;k++)frond(x+(r(k)-.5)*30*s,y,(160+r(k+5)*80)*s,-Math.PI/2+(k-6)*.22,(k<6?-1:1)*.9,col,15*s);
    }else if(p.type===2){
      c.strokeStyle=css(col.map(v=>v*.8));c.lineWidth=10*s;
      for(let k=0;k<6;k++){const a=-Math.PI/2+(k-2.5)*.32,l=(260+r(k)*170)*s, sx=x+Math.cos(a)*l*.6,sy=y+Math.sin(a)*l*.6;
        c.beginPath();c.moveTo(x,y);c.lineTo(sx,sy);c.stroke();
        c.save();c.translate(sx,sy);c.rotate(a);c.fillStyle=css(k%2?col:col.map(v=>v*1.12));c.beginPath();c.ellipse(l*.32,0,l*.34,l*.11,0,0,TAU);c.fill();
        c.strokeStyle='rgba(0,0,0,.2)';c.lineWidth=1.2*s;for(let j=0;j<9;j++){c.beginPath();c.moveTo(j*l*.07,0);c.lineTo(j*l*.07+l*.03,l*.1);c.moveTo(j*l*.07,0);c.lineTo(j*l*.07+l*.03,-l*.1);c.stroke();}
        c.restore();c.strokeStyle=css(col.map(v=>v*.8));c.lineWidth=10*s;}
    }else if(p.type===3){
      for(let k=0;k<7;k++){const a=-Math.PI/2+(k-3)*.42,l=(120+r(k)*60)*s,st=(90+r(k+9)*120)*s, sx=x+Math.cos(a)*st, sy=y+Math.sin(a)*st;
        c.strokeStyle=css(col.map(v=>v*.75));c.lineWidth=4*s;c.beginPath();c.moveTo(x,y);c.lineTo(sx,sy);c.stroke();
        bigLeaf(sx,sy,l,a+(r(k+4)-.5)*.6,k%2?col:col.map(v=>v*1.15),true);}
    }else{
      for(let k=0;k<22;k++){const a=r(k)*TAU,d=r(k+30)*110*s;c.fillStyle=css(col.map(v=>v*(.7+r(k+60)*.5)));ellipse(x+Math.cos(a)*d*1.3,y-90*s+Math.sin(a)*d*.8,(30+r(k+90)*26)*s,(22+r(k+120)*18)*s);c.fill();}
      const fl=fogged([[236,92,140],[250,160,70],[240,236,220],[190,90,220]][Math.floor(r(5)*4)],p.z);
      for(let k=0;k<26;k++){const a=r(k+150)*TAU,d=r(k+180)*120*s;c.fillStyle=css(fl);ellipse(x+Math.cos(a)*d*1.3,y-100*s+Math.sin(a)*d*.75,6*s,5*s);c.fill();}
    }
  }

  function buildOutside(){
    outside=layer();into(outside,()=>{
      const d=dusk(), g=c.createLinearGradient(0,0,0,h);
      g.addColorStop(0,css(mixc([150,166,180],[40,42,76],d)));g.addColorStop(.6,css(mixc([178,190,196],[92,70,104],d)));g.addColorStop(1,css(mixc([120,138,130],[40,36,52],d)));
      c.fillStyle=g;c.fillRect(0,0,w,h);
      for(let i=0;i<30;i++)soft(hash(i*3.3)*w,h*(.1+hash(i*4.1)*.4),(140+hash(i)*220)*u,(40+hash(i*2)*60)*u,mixc([210,216,222],[120,100,140],d),.25);
      const tree=mixc([70,96,86],[26,30,44],d);
      for(let i=0;i<26;i++){const x=hash(i*7.7)*w,y=L.vy+(40+hash(i*2.9)*90)*u,r=(50+hash(i*5.5)*90)*u;soft(x,y,r,r*1.2,tree,.75);}
    });
  }

  function poly(pts){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
  function buildInside(){
    inside=layer();
    const d=dusk(), iron=mixc([214,222,210],[64,66,78],d*.85), glassTint=mixc([200,226,210],[60,60,90],d);
    L.fog=mixc([176,196,186],[70,66,92],d);
    into(inside,()=>{
      c.fillStyle=css(glassTint,.16);c.fillRect(0,0,w,h);
      const ribW=z=>Math.max(1.5,30*u/z);
      for(let k=1;k<12;k++){
        const th=k*Math.PI/12;c.strokeStyle=css(iron,.7);c.lineWidth=Math.max(1,6*u/1.6);
        c.beginPath();for(let z=.9;z<=END;z+=.05){const [x,y]=arch(th,z);z===.9?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();
      }
      for(let k=0;k<36;k++){const th=k*Math.PI/36;c.strokeStyle=css(iron,.35);c.lineWidth=Math.max(.8,1.2*u);
        c.beginPath();for(let z=.9;z<=END;z+=.1){const [x,y]=arch(th,z);z===.9?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();}
      for(const side of [-1,1])for(const Y of [SPRING,100,260,KNEE]){c.strokeStyle=css(iron,.9);c.lineWidth=Math.max(1,(Y===SPRING?8:4)*u/1.5);c.beginPath();const a=P(side*R,Y,.9),b=P(side*R,Y,END);c.moveTo(...a);c.lineTo(...b);c.stroke();}
      for(const side of [-1,1]){
        c.fillStyle=css(mixc([130,64,46],[60,34,34],d));poly([P(side*R,KNEE,.9),P(side*R,KNEE,END),P(side*R,FLOOR,END),P(side*R,FLOOR,.9)]);c.fill();
        c.strokeStyle='rgba(0,0,0,.25)';c.lineWidth=Math.max(.6,u);
        for(let Y=KNEE+20;Y<FLOOR;Y+=20){c.beginPath();c.moveTo(...P(side*R,Y,.9));c.lineTo(...P(side*R,Y,END));c.stroke();}
      }
      const [ex0,ey0]=P(-R,FLOOR,END),[ex1]=P(R,FLOOR,END);
      c.strokeStyle=css(iron,.9);c.lineWidth=Math.max(1,3*u);
      for(let X=-R;X<=R;X+=110){c.beginPath();const top=Math.abs(X)<R?SPRING-ARCH*Math.sqrt(1-(X/R)**2):SPRING;c.moveTo(...P(X,KNEE,END));c.lineTo(...P(X,top,END));c.stroke();}
      for(const Y of [SPRING,140,KNEE]){c.beginPath();c.moveTo(...P(-R,Y,END));c.lineTo(...P(R,Y,END));c.stroke();}
      c.fillStyle=css(mixc([130,64,46],[60,34,34],d));c.fillRect(ex0,P(0,KNEE,END)[1],ex1-ex0,ey0-P(0,KNEE,END)[1]);
      const dl=P(-90,FLOOR,END),dr=P(90,200,END),[dcx,dcy]=P(0,200,END);
      c.fillStyle=css(glassTint,.35);c.beginPath();c.moveTo(dl[0],dl[1]);c.lineTo(dl[0],dr[1]);c.arc(dcx,dcy,dr[0]-dcx,Math.PI,0);c.lineTo(dr[0],dl[1]);c.fill();
      c.lineWidth=Math.max(1,4*u);c.stroke();c.beginPath();c.moveTo(dcx,dcy-(dr[0]-dcx));c.lineTo(dcx,dl[1]);c.stroke();
      for(const z of RIBS){
        c.strokeStyle=css(iron);c.lineWidth=ribW(z);c.beginPath();
        c.moveTo(...P(-R,KNEE,z));c.lineTo(...P(-R,SPRING,z));
        for(let th=Math.PI;th>=0;th-=.04)c.lineTo(...arch(th,z));
        c.lineTo(...P(R,KNEE,z));c.stroke();
        c.lineWidth=ribW(z)*.35;c.beginPath();
        for(const side of [-1,1]){const a=P(side*R,SPRING,z),b=arch(side>0?.5:Math.PI-.5,z),m=P(side*(R-150),SPRING+40,z);c.moveTo(...a);c.quadraticCurveTo(m[0],m[1],b[0],b[1]);}
        c.stroke();
      }
      const fl=c.createLinearGradient(0,L.vy,0,h);fl.addColorStop(0,css(mixc([150,140,120],[60,56,60],d)));fl.addColorStop(1,css(mixc([110,96,80],[40,36,40],d)));
      c.fillStyle=fl;poly([P(-R,FLOOR,.7),P(-R,FLOOR,END),P(R,FLOOR,END),P(R,FLOOR,.7)]);c.fill();
      const zs=[];for(let z=.7;z<END;z*=1.09)zs.push(z);zs.push(END);
      for(let i=0;i<zs.length-1;i++)for(let j=0;j<8;j++){
        const X0=-AISLE+j*AISLE/4, X1=X0+AISLE/4, odd=(i+j)%2;
        c.fillStyle=css(odd?mixc([196,110,72],[80,48,44],d):mixc([226,214,190],[96,92,96],d));
        poly([P(X0,FLOOR,zs[i]),P(X1,FLOOR,zs[i]),P(X1,FLOOR,zs[i+1]),P(X0,FLOOR,zs[i+1])]);c.fill();
      }
      for(const side of [-1,1]){
        c.fillStyle=css(mixc([52,40,30],[24,20,20],d));poly([P(side*AISLE,BED,.7),P(side*AISLE,BED,END),P(side*R,BED,END),P(side*R,BED,.7)]);c.fill();
        c.fillStyle=css(mixc([150,80,56],[64,38,36],d));poly([P(side*AISLE,BED,.7),P(side*AISLE,BED,END),P(side*AISLE,FLOOR,END),P(side*AISLE,FLOOR,.7)]);c.fill();
        c.fillStyle=css(mixc([190,186,170],[80,78,80],d));poly([P(side*AISLE,BED-8,.7),P(side*AISLE,BED-8,END),P(side*AISLE,BED+6,END),P(side*AISLE,BED+6,.7)]);c.fill();
      }
      const [fx,fy]=P(0,FLOOR,2.5), frx=150*u/2.5;
      c.fillStyle=css(mixc([170,166,150],[70,68,72],d));ellipse(fx,fy-14*u/2.5,frx,frx*.3);c.fill();c.fillRect(fx-frx,fy-40*u/2.5,frx*2,26*u/2.5);ellipse(fx,fy-40*u/2.5,frx,frx*.3);c.fill();
      c.fillStyle=css(mixc([70,110,110],[30,40,60],d));ellipse(fx,fy-42*u/2.5,frx*.86,frx*.24);c.fill();
      c.fillStyle=css(mixc([180,176,160],[76,74,78],d));c.fillRect(fx-8*u/2.5,fy-150*u/2.5,16*u/2.5,110*u/2.5);ellipse(fx,fy-150*u/2.5,34*u/2.5,9*u/2.5);c.fill();
      L.fountain=[fx,fy-42*u/2.5,frx,fy-156*u/2.5];
      for(const side of [-1,1])for(let i=0;i<260;i++){
        const z=.75+Math.pow(hash(i*2.3+side*9),1.3)*(END-.8), X=side*(AISLE+30+hash(i*5.1+side)*(R-AISLE-40)), [x,y]=P(X,BED,z), s=u/z;
        c.fillStyle=css(fogged(GREENS[i%GREENS.length].map(v=>v*(.6+hash(i*7.3)*.4)),z));ellipse(x,y-6*s,(14+hash(i)*16)*s,(6+hash(i*3)*6)*s,(hash(i*4)-.5));c.fill();
      }
      for(const p of L.plants)plant(p);
      const haze=c.createLinearGradient(0,L.vy-200*u,0,L.vy+200*u);haze.addColorStop(0,css(L.fog,0));haze.addColorStop(.5,css(L.fog,.18));haze.addColorStop(1,css(L.fog,0));
      c.fillStyle=haze;c.fillRect(0,L.vy-200*u,w,400*u);
      if(d>0){c.globalCompositeOperation='source-atop';c.fillStyle=`rgba(18,14,40,${(d*.5).toFixed(3)})`;c.fillRect(0,0,w,h);c.globalCompositeOperation='source-over';}
    });
  }

  function rainOutside(t,r){
    c.strokeStyle='rgba(225,232,240,.22)';c.lineWidth=Math.max(1,u);c.beginPath();
    for(let i=0;i<Math.round(220*r);i++){const x=mod(hash(i*2.1)*w-t*60*u,w),y=mod(hash(i*3.7)*h+t*(700+hash(i)*300)*u,h+40*u)-40*u;c.moveTo(x,y);c.lineTo(x-4*u,y+26*u);}
    c.stroke();
  }
  function rainOnGlass(t,r){
    if(r<=0)return;
    for(let i=0;i<Math.round(260*r);i++){
      const z=1.2+hash(i*1.3)*(END-1.4), th=.15+hash(i*2.7)*(Math.PI-.3), side=1, [x,y]=arch(th,z,side);
      if(y<0||y>h)continue;
      c.fillStyle=`rgba(235,245,250,${(.18+.2*Math.sin(t*2+i)).toFixed(3)})`;c.fillRect(x,y,2*u/z*1.5,2*u/z*1.5);
    }
    c.lineCap='round';
    for(let i=0;i<Math.round(110*r);i++){
      const life=3+hash(i*4.1)*4, f=mod(t/life+hash(i*5.3),1), z=1.15+hash(i*6.9)*(END-1.3), side=hash(i*7.7)<.5?-1:1;
      const th0=Math.PI/2-side*(.12+f*1.25), th1=th0+side*.08*(1+f);
      const [x0,y0]=arch(th0,z), [x1,y1]=arch(th1,z);
      if(y0<-20||y0>h)continue;
      c.strokeStyle=`rgba(240,248,255,${(.55*Math.sin(f*Math.PI)).toFixed(3)})`;c.lineWidth=Math.max(1,3.2*u/z);
      c.beginPath();c.moveTo(x1,y1);c.lineTo(x0,y0);c.stroke();
    }
    c.lineCap='butt';
  }
  function sunBeams(t,r,d){
    const sun=smooth(.5+.8*Math.sin(t*.09+1.2))*(1-d)*(1-.3*r);
    if(sun<.02)return;
    c.save();c.globalCompositeOperation='lighter';
    for(let i=0;i<5;i++){
      const z=1.4+i*.55, [x0,y0]=arch(1.05+i*.06,z), [x1,y1]=P(-300+i*120,FLOOR,z+.4), wd=(70+i*12)*u/z;
      const g=c.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,`rgba(255,240,200,${(.09*sun).toFixed(3)})`);g.addColorStop(1,'rgba(255,240,200,0)');
      c.fillStyle=g;for(const k of [1,1.8]){c.beginPath();c.moveTo(x0-wd*k,y0);c.lineTo(x0+wd*k,y0);c.lineTo(x1+wd*(1.4+.8*k),y1);c.lineTo(x1-wd*(.8*k),y1);c.fill();}
      soft(x1+wd*.7,y1,wd*2.6,wd*.6,[255,236,190],.25*sun);
    }
    for(let i=0;i<60;i++){const b=i%5,f=hash(i*3.1),z=1.4+b*.55,[x0,y0]=arch(1.05+b*.06,z),[x1,y1]=P(-300+b*120,FLOOR,z+.4);
      const x=mix(x0,x1,f)+Math.sin(t*.4+i)*30*u/z,y=mix(y0,y1,f)+Math.cos(t*.3+i*2)*20*u;
      c.fillStyle=`rgba(255,246,220,${(.6*sun*(.4+.6*Math.sin(t*1.5+i))).toFixed(3)})`;c.fillRect(x,y,1.6*u,1.6*u);}
    c.restore();
  }
  function lamps(t,d){
    for(const z of [1.7,2.85,3.6]){
      const [ax,ay]=arch(Math.PI/2,z), [lx,ly]=P(0,-150,z), r=34*u/z;
      c.strokeStyle='rgba(40,40,40,.8)';c.lineWidth=Math.max(1,2.4*u/z);c.beginPath();c.moveTo(ax,ay);c.lineTo(lx,ly-r);c.stroke();
      c.fillStyle='rgb(44,52,40)';c.beginPath();c.moveTo(lx-r*1.1,ly-r*.1);c.lineTo(lx-r*.4,ly-r);c.lineTo(lx+r*.4,ly-r);c.lineTo(lx+r*1.1,ly-r*.1);c.fill();
      const fl=.92+.08*Math.sin(t*9+z*7), k=(.35+.65*d)*fl;
      c.save();c.globalCompositeOperation='lighter';
      soft(lx,ly+r*.2,r*8,r*8,[255,180,90],.3*k);soft(lx,ly+r*.2,r*1.6,r*1.6,[255,226,170],.7*k);
      const [px,py]=P(0,FLOOR,z);soft(px,py,260*u/z,64*u/z,[255,190,110],.3*k);
      c.restore();
      c.fillStyle=css([255,230,180],.6+.4*k);ellipse(lx,ly+r*.1,r*.45,r*.35);c.fill();
    }
  }
  function fountainWater(t){
    const [fx,fy,frx,top]=L.fountain;
    c.save();
    for(let k=0;k<4;k++){const ph=mod(t*.6+k/4,1);c.strokeStyle=`rgba(220,240,240,${(.35*(1-ph)).toFixed(3)})`;c.lineWidth=Math.max(1,u*.8);ellipse(fx,fy,frx*.2+frx*.62*ph,(frx*.2+frx*.62*ph)*.28);c.stroke();}
    c.globalCompositeOperation='lighter';
    for(let j=0;j<6;j++){
      const a=j/6*TAU+t*.2, dx=Math.cos(a)*frx*.7, dy=Math.sin(a)*frx*.2;
      c.strokeStyle='rgba(210,236,240,.35)';c.lineWidth=Math.max(1,1.6*u);c.beginPath();c.moveTo(fx,top);c.quadraticCurveTo(fx+dx*.5,top-40*u,fx+dx,fy+dy);c.stroke();
      for(let k=0;k<5;k++){const f=mod(t*1.4+k/5+j*.13,1),x=mix(mix(fx,fx+dx*.5,f),mix(fx+dx*.5,fx+dx,f),f),y=mix(mix(top,top-40*u,f),mix(top-40*u,fy+dy,f),f);c.fillStyle='rgba(235,250,255,.75)';c.fillRect(x,y,2*u,2*u);}
    }
    c.restore();
  }
  function mist(t,d){
    const col=mixc([230,240,232],[150,150,180],d);
    for(let i=0;i<14;i++){
      const side=i%2?1:-1, z=1.2+hash(i*2.3)*2.8, X=side*(AISLE+100+hash(i*4.4)*500)+Math.sin(t*.07+i)*160;
      const [x,y]=P(X,BED-80-Math.sin(t*.11+i*2)*40,z);
      soft(x,y,260*u/z,70*u/z,col,.1+.05*Math.sin(t*.2+i));
    }
  }
  const BFLY=[[[40,110,230],[20,40,90]],[[240,140,30],[30,20,10]],[[250,220,80],[60,50,10]],[[230,90,140],[60,20,40]],[[120,200,255],[20,50,80]]];
  function butterflies(t){
    for(let i=0;i<5;i++){
      const cx=w*(.22+i*.14), cy=h*(.42+hash(i*3.1)*.2);
      const x=cx+Math.sin(t*(.23+hash(i)*.15)+i*2)*180*u+Math.sin(t*.9+i)*30*u, y=cy+Math.sin(t*(.31+hash(i*2)*.2)+i)*90*u+Math.sin(t*2.3+i*3)*12*u;
      const vx=Math.cos(t*(.23+hash(i)*.15)+i*2), s=(9+hash(i*4.4)*7)*u, flap=Math.abs(Math.cos(t*(13+i*1.7)+i));
      const [col,edge]=BFLY[i];
      c.save();c.translate(x,y);c.scale(vx<0?-1:1,1);c.rotate(-.25);
      for(const up of [1,-1]){
        c.fillStyle=css(up>0?col:col.map(v=>v*.8));
        c.save();c.scale(.25+.75*flap,1);
        c.beginPath();c.ellipse(-s*.55,-s*.5*up,s*.75,s*.5,up*-.5,0,TAU);c.fill();
        c.strokeStyle=css(edge,.9);c.lineWidth=Math.max(1,s*.12);c.stroke();
        c.beginPath();c.ellipse(s*.45,-s*.45*up,s*.55,s*.4,up*.6,0,TAU);c.fill();c.stroke();
        c.restore();
      }
      c.fillStyle='rgb(26,20,16)';c.beginPath();c.ellipse(0,0,s*.6,s*.11,0,0,TAU);c.fill();
      c.restore();
    }
  }
  function foreground(t,d){
    const dark=d*.5, col=k=>mixc(GREENS[k%GREENS.length].map(v=>v*.75),[12,16,22],dark);
    for(let i=0;i<5;i++){
      const sway=Math.sin(t*.55+i*1.3)*.035, a=-.95+i*.24+sway, st=(260+i*60)*u, x0=-30*u, y0=h+20*u;
      const sx=x0+Math.cos(a)*st, sy=y0+Math.sin(a)*st;
      c.strokeStyle=css(col(i).map(v=>v*.8));c.lineWidth=7*u;c.beginPath();c.moveTo(x0,y0);c.quadraticCurveTo(x0+st*.3,y0-st*.6,sx,sy);c.stroke();
      bigLeaf(sx,sy,(200+hash(i*3.3)*60)*u,a+.35+sway*2,col(i),true);
    }
    for(let i=0;i<4;i++){const sway=Math.sin(t*.5+i*2)*.05;frond(w+30*u,h*(.78+i*.06),(380+i*40)*u,Math.PI+(-.55+i*.2),-.9-i*.15,col(i+2),34*u,sway);}
    const [bx,by]=[w*(L.portrait?.22:.32),h*(L.portrait?.16:.14)], sw=Math.sin(t*.4)*.04;
    c.strokeStyle='rgba(30,30,30,.9)';c.lineWidth=1.5*u;c.beginPath();c.moveTo(bx,0);c.lineTo(bx+Math.sin(sw)*h*.2,by);c.stroke();
    c.save();c.translate(bx+Math.sin(sw)*h*.2,by);c.rotate(sw);
    for(let k=0;k<9;k++)frond(0,0,(150+hash(k*2.7)*90)*u,Math.PI/2+(k-4)*.32,(k<4?1:-1)*.6,col(k),13*u,Math.sin(t*.7+k)*.06);
    c.fillStyle=css(mixc([110,74,48],[40,30,26],dark));c.beginPath();c.ellipse(0,0,52*u,22*u,0,0,Math.PI);c.fill();
    c.fillStyle=css(mixc([140,96,60],[50,38,30],dark));c.fillRect(-54*u,-6*u,108*u,8*u);
    c.restore();
  }

  function draw(){
    const d=dusk(), r=rain(), k=`${w}x${h}|${d}`;
    if(k!==key){key=k;buildOutside();buildInside();}
    c=main;const t=time;
    c.drawImage(outside,0,0);
    rainOutside(t,r);
    c.drawImage(inside,0,0);
    rainOnGlass(t,r);
    if(on(settings.fountain))fountainWater(t);
    if(on(settings.mist))mist(t,d);
    sunBeams(t,r,d);
    lamps(t,d);
    if(on(settings.butterflies))butterflies(t);
    foreground(t,d);
    const v=c.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.35,w*.5,h*.5,Math.max(w,h)*.8);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(8,14,10,${(.4+d*.25).toFixed(3)})`);
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
