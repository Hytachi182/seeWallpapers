/* Night Train Viaduct: original code-drawn night train on a stone viaduct, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), main=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  const TAU=Math.PI*2, mod=(a,b)=>((a%b)+b)%b, mix=(a,b,t)=>a+(b-a)*t, mixc=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
  const noise=x=>{const i=Math.floor(x),f=x-i,s=f*f*(3-2*f);return hash(i)*(1-s)+hash(i+1)*s;};
  const fbm=(x,seed)=>noise(x+seed)*.6+noise(x*2.1+seed*3)*.28+noise(x*4.3+seed*7)*.12;
  let settings={speed:1,cars:6,hour:0,steam:true,snow:false,village:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2), carCount=()=>Math.round(num('cars',6,3,10)), hour=()=>num('hour',0,0,1);
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):12, paused=preview, fps=30;
  let c=main,w=1,h=1,u=1,L={},sky=null,back=null,front=null,key='';

  const css=(a,alpha=1)=>`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${alpha})`;
  function ellipse(x,y,rx,ry,rot=0){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,TAU);}
  function soft(x,y,rx,ry,color,alpha){
    if(alpha<=0)return;
    const g=c.createRadialGradient(x,y,0,x,y,rx);g.addColorStop(0,css(color,alpha));g.addColorStop(1,css(color,0));
    c.save();c.translate(x,y);c.scale(1,ry/rx);c.translate(-x,-y);c.fillStyle=g;c.fillRect(x-rx,y-rx,rx*2,rx*2);c.restore();
  }
  function into(target,fn){const prev=c;c=target.getContext('2d');fn();c=prev;}
  function layer(){const cv=document.createElement('canvas');cv.width=w;cv.height=h;return cv;}
  const CAR=150, GAP=8, LOCO=276;
  const trainLength=()=>(LOCO+carCount()*(CAR+GAP))*u;

  function layout(){
    const portrait=w/h<1;
    u=portrait?Math.min(w/700,h/1250):Math.min(h/1080,w/1700);
    const deckY=h*(portrait?.52:.5), riverY=h*(portrait?.76:.8);
    L={portrait,deckY,riverY,S:200*u,P:46*u,v:250*u,D:w+2400*u,
      moon:[w*(portrait?.7:.79),h*(portrait?.15:.17),(portrait?40:36)*u],sigX:w*(portrait?.86:.9),
      far:x=>h*(portrait?.33:.36)-h*.15*fbm(x/(380*u),1.3),
      mid:x=>h*(portrait?.44:.42)-h*.06*fbm(x/(260*u),5.1),
      near:x=>h*(portrait?.6:.62)-h*.04*fbm(x/(160*u),9.7)};
    // The head of the train sits at 80 % of the width at t = 12 s, so previews always show it.
    L.off=mod((portrait?.95:.8)*w+300*u-12*L.v,L.D);
    const r=(L.S-L.P)/2, n=Math.ceil(w/L.S)+2;
    L.r=r;L.ys=deckY+56*u+r;L.arches=[];
    for(let k=-1;k<n;k++)L.arches.push(w/2+(k-Math.floor(n/2))*L.S+L.S/2);
    L.houses=[];L.windows=[];
    const x1=w*(portrait?.62:.36);
    for(let x=w*(portrait?.04:.05),i=0;x<x1;i++){
      const hw=(26+hash(i*12.7+3)*24)*u, hh=(18+hash(i*5.1)*18)*u, yb=L.mid(x+hw/2)+(8+hash(i*2.9)*22)*u;
      L.houses.push({x,yb,hw,hh,church:i===4});
      const nwin=1+Math.floor(hash(i*8.3)*2);
      for(let k=0;k<nwin;k++)L.windows.push({x:x+hw*(k+1)/(nwin+1)-2.5*u,y:yb-hh*.62,s:5*u,seed:hash(i*31+k*7)});
      if(i===4)L.windows.push({x:x+hw/2-2*u,y:yb-hh-26*u,s:4*u,seed:.93});
      x+=hw+(4+hash(i*4.4)*16)*u;
    }
  }
  const headX=t=>mod(t*L.v+L.off,L.D)-300*u;

  function path(f,bottom){c.beginPath();c.moveTo(0,bottom);for(let x=0;x<=w+4;x+=4)c.lineTo(x,f(x));c.lineTo(w+4,bottom);c.closePath();}
  function pine(x,y,s,col,snow){
    c.fillStyle=css(col);c.beginPath();
    for(let k=0;k<3;k++){const by=y-s*k*.28,hw=s*(.32-k*.07);c.moveTo(x,by-s*.47);c.lineTo(x+hw,by);c.lineTo(x-hw,by);}
    c.fill();c.fillRect(x-s*.03,y-s*.04,s*.06,s*.08);
    if(snow){c.fillStyle='rgba(226,234,248,.75)';c.beginPath();
      for(let k=0;k<3;k++){const by=y-s*k*.28,hw=s*(.32-k*.07),ay=by-s*.47;c.moveTo(x,ay);c.lineTo(x+hw*.45,ay+s*.2);c.lineTo(x-hw*.45,ay+s*.2);}
      c.fill();}
  }

  function buildSky(){
    sky=layer();into(sky,()=>{
      const hr=hour(), g=c.createLinearGradient(0,0,0,L.riverY);
      g.addColorStop(0,css(mixc([5,9,24],[22,40,92],hr)));
      g.addColorStop(.55,css(mixc([14,26,56],[78,100,156],hr)));
      g.addColorStop(1,css(mixc([36,50,86],[214,158,138],hr)));
      c.fillStyle=g;c.fillRect(0,0,w,h);
    });
  }

  function buildViaduct(){
    const v=layer();into(v,()=>{
      const {deckY:top,riverY:bot,r,ys}=L, hr=hour(), stone=mixc([62,60,68],[104,98,104],hr);
      const g=c.createLinearGradient(0,top,0,bot);
      g.addColorStop(0,css(stone.map(x=>x*1.3)));g.addColorStop(.3,css(stone));g.addColorStop(1,css(stone.map(x=>x*.42)));
      c.fillStyle=g;c.fillRect(0,top,w,bot-top);
      c.strokeStyle='rgba(0,0,0,.2)';c.lineWidth=Math.max(1,1.1*u);
      for(let row=0,y=top+34*u;y<bot;y+=16*u,row++){
        c.beginPath();c.moveTo(0,y);c.lineTo(w,y);
        for(let x=(row%2)*14*u+hash(row)*10*u;x<w;x+=28*u){c.moveTo(x,y);c.lineTo(x,y+16*u);}
        c.stroke();
      }
      for(let i=0;i<220;i++){c.fillStyle=`rgba(${hash(i)<.5?'0,0,0':'200,200,220'},${.05+hash(i*3.3)*.06})`;c.fillRect(hash(i*7.1)*w,top+34*u+hash(i*5.7)*(bot-top),(10+hash(i*2.2)*18)*u,8*u);}
      c.save();c.globalCompositeOperation='destination-out';c.fillStyle='#000';
      for(const cx of L.arches){c.beginPath();c.moveTo(cx-r,bot+1);c.lineTo(cx-r,ys);c.arc(cx,ys,r,Math.PI,0);c.lineTo(cx+r,bot+1);c.closePath();c.fill();}
      c.restore();
      for(const cx of L.arches){
        c.strokeStyle=css(stone.map(x=>x*1.12));c.lineWidth=15*u;c.beginPath();c.arc(cx,ys,r+7.5*u,Math.PI,0);c.stroke();
        c.strokeStyle='rgba(0,0,0,.32)';c.lineWidth=Math.max(1,u);c.beginPath();
        for(let a=0;a<=13;a++){const ang=Math.PI+a*Math.PI/13;c.moveTo(cx+Math.cos(ang)*r,ys+Math.sin(ang)*r);c.lineTo(cx+Math.cos(ang)*(r+15*u),ys+Math.sin(ang)*(r+15*u));}
        c.stroke();
        c.fillStyle=css(stone.map(x=>x*1.2));c.fillRect(cx-r-6*u,ys-3*u,6*u,5*u);c.fillRect(cx+r,ys-3*u,6*u,5*u);
      }
      c.fillStyle='rgb(22,20,24)';c.fillRect(0,top,w,8*u);
      c.fillStyle=css(stone.map(x=>x*1.45));c.fillRect(0,top+8*u,w,10*u);
      c.fillStyle=css(stone.map(x=>x*.55));c.fillRect(0,top+18*u,w,5*u);
      c.fillStyle=css(stone.map(x=>x*1.15));c.fillRect(0,top+23*u,w,6*u);
      for(let x=mod(L.arches[0]+L.S/2,L.S)-L.S;x<w+L.S;x+=L.S){c.fillStyle=css(stone.map(v=>v*1.3));c.fillRect(x-4*u,top+29*u,8*u,14*u);}
      if(on(settings.snow)){c.fillStyle='rgba(228,236,250,.85)';c.fillRect(0,top+6*u,w,3*u);c.fillRect(0,top+21*u,w,2*u);}
      const wl=c.createLinearGradient(0,bot-70*u,0,bot);wl.addColorStop(0,'rgba(4,8,16,0)');wl.addColorStop(1,'rgba(4,8,16,.6)');
      c.save();c.globalCompositeOperation='source-atop';c.fillStyle=wl;c.fillRect(0,bot-70*u,w,70*u);c.restore();
    });
    return v;
  }

  function buildBack(){
    back=layer();
    const via=buildViaduct();
    into(back,()=>{
      const hr=hour(), snow=on(settings.snow), {deckY,riverY}=L;
      const farCol=mixc([24,32,58],[76,86,124],hr);
      path(L.far,h);c.fillStyle=css(farCol);c.fill();
      const fg=c.createLinearGradient(0,h*.22,0,h*.5);fg.addColorStop(0,'rgba(160,180,230,.12)');fg.addColorStop(1,'rgba(160,180,230,0)');c.fillStyle=fg;c.fill();
      const base=h*(L.portrait?.33:.36), crest=base-h*.15*.5;
      c.fillStyle=snow?'rgba(226,234,250,.86)':'rgba(150,166,210,.2)';c.beginPath();
      const pts=[];for(let x=0;x<=w+4;x+=4){const y=L.far(x),d=Math.max(0,crest-y)*(snow?1.1:.7)*(.75+.5*noise(x/(70*u)));pts.push([x,y,d]);}
      pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));for(let i=pts.length-1;i>=0;i--)c.lineTo(pts[i][0],pts[i][1]+pts[i][2]);c.fill();
      const haze=c.createLinearGradient(0,h*.36,0,deckY);haze.addColorStop(0,'rgba(120,140,190,0)');haze.addColorStop(1,css(mixc([90,110,160],[200,160,150],hr),.25));
      c.fillStyle=haze;c.fillRect(0,h*.36,w,deckY-h*.36);
      const midCol=mixc([12,18,34],[42,50,78],hr);
      path(L.mid,h);c.fillStyle=css(midCol);c.fill();
      for(let x=0;x<w;x+=9*u){const s=(14+hash(x*.37)*18)*u;if(x>w*(L.portrait?.03:.04)&&x<w*(L.portrait?.64:.38)&&hash(x*.11)<.7)continue;pine(x+hash(x)*6*u,L.mid(x)+4*u,s,midCol.map(v=>v*.8),snow);}
      for(const p of L.houses){
        const col=mixc([20,22,32],[52,54,72],hr), {x,yb,hw,hh}=p;
        c.fillStyle=css(col);c.fillRect(x,yb-hh,hw,hh+30*u);
        c.beginPath();c.moveTo(x-3*u,yb-hh);c.lineTo(x+hw/2,yb-hh-hw*.42);c.lineTo(x+hw+3*u,yb-hh);c.fillStyle=css(col.map(v=>v*.8));c.fill();
        c.strokeStyle=snow?'rgba(230,238,252,.9)':'rgba(150,170,220,.35)';c.lineWidth=(snow?2.6:1.2)*u;
        c.beginPath();c.moveTo(x-3*u,yb-hh);c.lineTo(x+hw/2,yb-hh-hw*.42);c.lineTo(x+hw+3*u,yb-hh);c.stroke();
        if(p.church){c.fillStyle=css(col);c.fillRect(x+hw/2-5*u,yb-hh-34*u,10*u,30*u);c.beginPath();c.moveTo(x+hw/2-7*u,yb-hh-34*u);c.lineTo(x+hw/2,yb-hh-62*u);c.lineTo(x+hw/2+7*u,yb-hh-34*u);c.fill();}
        else{c.fillRect(x+hw*.7,yb-hh-hw*.3,4*u,hw*.2);}
      }
      const nearCol=mixc([7,11,20],[26,32,52],hr);
      path(L.near,riverY+2*u);c.fillStyle=css(nearCol);c.fill();
      for(let x=0;x<w;x+=7*u){const s=(16+hash(x*.53)*22)*u;pine(x+hash(x*1.7)*5*u,L.near(x)+6*u,s,nearCol.map(v=>v*.75),snow);}
      const mist=c.createLinearGradient(0,h*.56,0,riverY);mist.addColorStop(0,'rgba(140,160,210,0)');mist.addColorStop(.6,css(mixc([110,130,180],[200,170,170],hr),.16));mist.addColorStop(1,'rgba(140,160,210,0)');
      c.fillStyle=mist;c.fillRect(0,h*.56,w,riverY-h*.56);
      const rg=c.createLinearGradient(0,riverY,0,h);rg.addColorStop(0,css(mixc([28,40,70],[120,110,130],hr)));rg.addColorStop(1,css(mixc([4,8,16],[20,26,44],hr)));
      c.fillStyle=rg;c.fillRect(0,riverY,w,h-riverY);
      c.save();c.beginPath();c.rect(0,riverY,w,h-riverY);c.clip();c.globalAlpha=.34;c.translate(0,riverY*2);c.scale(1,-1);c.drawImage(via,0,0);c.restore();
      c.drawImage(via,0,0);
      for(const cx of L.arches){
        const px=cx+L.S/2;c.fillStyle='rgba(10,12,18,.9)';c.beginPath();c.moveTo(px-L.P/2-6*u,riverY+3*u);c.lineTo(px,riverY-16*u);c.lineTo(px+L.P/2+6*u,riverY+3*u);c.fill();
      }
      for(let i=0;i<40;i++){c.fillStyle=css(nearCol.map(v=>v*.7));ellipse(hash(i*9.3)*w,riverY+(2+hash(i)*5)*u,(10+hash(i*2.1)*26)*u,(4+hash(i*4.4)*5)*u);c.fill();}
      if(snow){c.fillStyle='rgba(220,230,248,.5)';for(let i=0;i<40;i++){ellipse(hash(i*9.3)*w,riverY-(1+hash(i)*2)*u,(8+hash(i*2.1)*20)*u,2.5*u);c.fill();}}
    });
  }

  function buildFront(){
    front=layer();into(front,()=>{
      const {deckY}=L, snow=on(settings.snow), hr=hour(), iron=mixc([14,14,18],[34,34,42],hr);
      c.fillStyle=css(iron);
      c.fillRect(0,deckY-17*u,w,3*u);c.fillRect(0,deckY-8*u,w,2*u);
      for(let x=0;x<w;x+=24*u)c.fillRect(x,deckY-17*u,2.4*u,17*u);
      c.fillStyle=snow?'rgba(232,238,250,.9)':'rgba(170,186,230,.32)';c.fillRect(0,deckY-18*u,w,snow?2*u:1*u);
      const sx=L.sigX;c.fillStyle=css(iron);c.fillRect(sx-2*u,deckY-150*u,4*u,150*u);c.fillRect(sx-9*u,deckY-160*u,18*u,30*u);
      c.fillRect(sx-14*u,deckY-112*u,28*u,3*u);
      const treeCol=mixc([4,7,12],[16,22,34],hr), n=L.portrait?4:7;
      for(let i=0;i<n;i++){
        pine(-20*u+i*30*u+hash(i*3.1)*14*u,h+8*u,h*(L.portrait?.16+hash(i*1.3)*.1:.3+hash(i*1.3)*.16),treeCol,snow);
        pine(w+20*u-i*30*u-hash(i*7.1)*14*u,h+8*u,h*(L.portrait?.15+hash(i*2.3)*.1:.28+hash(i*2.3)*.18),treeCol,snow);
      }
    });
  }

  function stars(t,hr){
    const a=1-hr*.85;
    for(let i=0;i<260;i++){
      const x=hash(i*3.1)*w, y=hash(i*7.7+1)*L.deckY*.92, s=(hash(i*5.3+2)<.9?1.2:2.2)*u;
      const tw=.55+.45*Math.sin(t*(1+hash(i*9.1)*2.5)+i);
      c.fillStyle=`rgba(225,232,255,${(a*(.2+.65*hash(i*2.3))*tw).toFixed(3)})`;c.fillRect(x,y,s,s);
    }
  }
  function moon(hr){
    const [x,y,r]=L.moon;
    soft(x,y,r*8,r*8,[140,164,220],.2*(1-hr*.5));soft(x,y,r*2.4,r*2.4,[220,228,255],.32);
    c.fillStyle=css(mixc([236,236,222],[250,242,226],hr));ellipse(x,y,r,r);c.fill();
    c.fillStyle='rgba(160,160,150,.32)';
    for(const [dx,dy,s] of [[-.3,-.2,.32],[.25,.1,.26],[-.05,.38,.2],[.35,-.35,.14]]){ellipse(x+dx*r,y+dy*r,s*r,s*r*.85);c.fill();}
  }
  function clouds(t,hr){
    const col=mixc([70,82,122],[160,140,168],hr);
    for(let i=0;i<5;i++){
      const span=w+900*u, x=mod(hash(i*4.4)*span+t*(5+hash(i)*6)*u,span)-450*u, y=h*(.07+hash(i*6.6)*.26);
      for(let j=0;j<6;j++)soft(x+(j-2.5)*70*u,y+Math.sin(j*1.7+i)*10*u,(90+hash(i*10+j)*70)*u,(20+hash(i*20+j)*16)*u,col,.15);
    }
  }
  function villageLights(t){
    if(!on(settings.village))return;
    c.save();c.globalCompositeOperation='lighter';
    for(const win of L.windows){
      const period=14+win.seed*20;
      if(hash(win.seed*91+Math.floor((t+win.seed*50)/period))<.16)continue;
      const fl=.88+.12*Math.sin(t*(2+win.seed*5)+win.seed*40);
      soft(win.x+win.s/2,win.y+win.s*.6,win.s*3.4,win.s*3.4,[255,160,70],.2*fl);
      c.fillStyle=`rgba(255,200,118,${(.92*fl).toFixed(3)})`;c.fillRect(win.x,win.y,win.s,win.s*1.2);
    }
    c.restore();
  }
  function river(t,hx,len){
    const {riverY,moon:[mx]}=L, depth=h-riverY;
    c.save();c.globalCompositeOperation='lighter';
    for(let i=0;i<46;i++){
      const y=riverY+5*u+i*depth/46, spread=(10+i*3)*u;
      const x=mx+Math.sin(t*1.3+i*1.7)*spread*.5+(hash(i)-.5)*spread, ln=(14+hash(i*3)*30)*u*(.6+.4*Math.sin(t*2+i));
      c.fillStyle=`rgba(200,214,255,${(.24*(1-i/60)).toFixed(3)})`;c.fillRect(x-ln/2,y,ln,Math.max(1,1.4*u));
    }
    for(let i=0;i<70;i++){
      const y=riverY+hash(i*2.2)*depth, x=mod(hash(i*5.5)*w+t*(8+hash(i)*10)*u,w);
      c.fillStyle=`rgba(140,160,210,${(.06+.05*Math.sin(t*1.5+i)).toFixed(3)})`;c.fillRect(x,y,(20+hash(i*7)*50)*u,Math.max(1,u));
    }
    for(let x=hx-len;x<hx;x+=26*u){
      if(x<-40*u||x>w+40*u)continue;
      const y=riverY+(30+hash(Math.floor(x/(26*u)))*30)*u;
      c.fillStyle=`rgba(255,170,90,${(.07+.04*Math.sin(t*3+x)).toFixed(3)})`;c.fillRect(x,y+Math.sin(t*2+x*.01)*3*u,18*u,Math.max(1,1.3*u));
    }
    for(const cx of L.arches){
      const px=cx+L.S/2;
      for(let k=0;k<3;k++){const ph=mod(t*.5+k/3,1);c.fillStyle=`rgba(190,205,240,${(.22*(1-ph)).toFixed(3)})`;c.fillRect(px-(L.P/2+8*u+ph*30*u),riverY+(4+ph*10)*u,(L.P+16*u+ph*60*u),Math.max(1,u));}
    }
    c.restore();
  }

  function wheel(x,y,r,dist,spokes=8){
    c.fillStyle='#101014';ellipse(x,y,r,r);c.fill();
    c.strokeStyle='rgba(150,150,166,.6)';c.lineWidth=Math.max(1,1.4*u);c.stroke();
    const a=dist/r;c.beginPath();
    for(let k=0;k<spokes;k++){const b=a+k*TAU/spokes;c.moveTo(x,y);c.lineTo(x+Math.cos(b)*r*.86,y+Math.sin(b)*r*.86);}
    c.lineWidth=Math.max(1,u);c.stroke();
  }
  const CAR_COLS=[[26,48,40],[64,26,30],[26,48,40],[30,38,62]];
  function carriage(l,r,base,i,dist,snow,t){
    const top=base-98*u, bodyTop=base-86*u, bodyBot=base-20*u, col=CAR_COLS[i%CAR_COLS.length];
    c.fillStyle='#0c0d10';c.fillRect(r,base-34*u,GAP*u,6*u);
    for(const b of [l+30*u,r-30*u]){c.fillStyle='#0b0b0e';c.fillRect(b-20*u,base-18*u,40*u,8*u);wheel(b-11*u,base-8*u,8*u,dist,6);wheel(b+11*u,base-8*u,8*u,dist,6);}
    c.fillStyle=css(col.map(v=>v*.55));c.beginPath();c.moveTo(l+3*u,bodyTop);c.quadraticCurveTo(l+3*u,top,l+22*u,top);c.lineTo(r-22*u,top);c.quadraticCurveTo(r-3*u,top,r-3*u,bodyTop);c.fill();
    if(snow){c.fillStyle='rgba(234,240,252,.92)';c.fillRect(l+12*u,top-2*u,r-l-24*u,4*u);}
    c.fillStyle=css(col);c.fillRect(l,bodyTop,r-l,bodyBot-bodyTop);
    c.fillStyle='rgba(170,190,240,.22)';c.fillRect(l,bodyTop,r-l,2*u);
    c.fillStyle='rgba(200,160,80,.55)';c.fillRect(l,base-42*u,r-l,2*u);
    c.fillStyle='rgba(0,0,0,.35)';c.fillRect(l,bodyBot-6*u,r-l,6*u);
    c.fillStyle='rgba(0,0,0,.28)';c.fillRect(l+6*u,bodyTop+6*u,12*u,bodyBot-bodyTop-12*u);c.fillRect(r-18*u,bodyTop+6*u,12*u,bodyBot-bodyTop-12*u);
    const nw=6, ww=14*u, wh=22*u, gap=(r-l-36*u-nw*ww)/(nw+1), wy=base-74*u;
    for(let j=0;j<nw;j++){
      const wx=l+18*u+gap+j*(ww+gap), seed=hash(i*17.3+j*3.1);
      if(seed<.07){c.fillStyle='rgba(20,22,30,1)';c.fillRect(wx,wy,ww,wh);continue;}
      const fl=.94+.06*Math.sin(t*20+seed*90);
      c.fillStyle=css(mixc([255,186,100],[255,220,160],seed).map(v=>v*fl));c.fillRect(wx,wy,ww,wh);
      if(seed>.52){
        const sway=Math.sin(t*9+i)*.6*u;c.fillStyle='rgba(44,26,20,.88)';
        ellipse(wx+ww*(.3+seed*.4)+sway,wy+wh*.42,4*u,4.6*u);c.fill();c.fillRect(wx+ww*(.3+seed*.4)-6*u+sway,wy+wh*.66,12*u,wh*.34);
      }
      c.fillStyle='rgba(0,0,0,.3)';c.fillRect(wx,wy+wh*.5,ww,1*u);
    }
    c.save();c.globalCompositeOperation='lighter';soft((l+r)/2,wy+wh/2,(r-l)*.55,26*u,[255,150,60],.13);c.restore();
  }
  function loco(hx,base,dist,t,snow){
    const X=v=>hx-v*u, Y=v=>base-v*u, body=[20,24,28];
    const fire=.75+.18*Math.sin(t*13)+.07*Math.sin(t*31);
    c.save();c.globalCompositeOperation='lighter';soft(X(150),Y(14),44*u,12*u,[255,110,30],.45*fire);c.restore();
    c.fillStyle='#0b0c0f';c.fillRect(X(206),Y(36),186*u,7*u);
    c.fillStyle='#0b0c0f';c.fillRect(X(276),Y(26),64*u,8*u);
    for(const x of [262,243,224])wheel(X(x),Y(9),9*u,dist,6);
    c.fillStyle=css(body.map(v=>v*.9));c.fillRect(X(276),Y(84),66*u,58*u);
    c.fillStyle='rgba(170,190,240,.2)';c.fillRect(X(276),Y(84),66*u,2*u);
    c.fillStyle='#08080a';c.beginPath();c.moveTo(X(272),Y(84));c.quadraticCurveTo(X(243),Y(104),X(214),Y(84));c.fill();
    if(snow){c.fillStyle='rgba(234,240,252,.9)';c.beginPath();c.moveTo(X(266),Y(85));c.quadraticCurveTo(X(243),Y(100),X(220),Y(85));c.fill();}
    c.fillStyle='#0c0d10';c.fillRect(X(210),Y(30),4*u,6*u);
    c.fillStyle=css(body);c.fillRect(X(206),Y(118),56*u,84*u);
    c.fillStyle=css(body.map(v=>v*.7));c.fillRect(X(212),Y(124),68*u,7*u);
    if(snow){c.fillStyle='rgba(234,240,252,.92)';c.fillRect(X(212),Y(127),68*u,3*u);}
    c.fillStyle=css([255,150,60].map(v=>v*fire));c.fillRect(X(198),Y(108),22*u,26*u);
    c.fillStyle='rgba(30,16,10,.92)';ellipse(X(186),Y(98),4.5*u,5*u);c.fill();c.fillRect(X(193),Y(92),12*u,10*u);
    c.fillStyle=css(body);c.fillRect(X(150),Y(76),132*u,44*u);
    ellipse(X(18),Y(54),6*u,22*u);c.fill();
    c.fillStyle='rgba(170,190,240,.22)';c.fillRect(X(150),Y(76),132*u,2*u);
    c.fillStyle='rgba(205,165,80,.7)';for(const x of [60,100,132])c.fillRect(X(x),Y(76),2*u,44*u);
    c.fillStyle=css(body);c.fillRect(X(46),Y(104),16*u,30*u);c.fillRect(X(50),Y(110),24*u,6*u);
    c.beginPath();c.arc(X(92),Y(76),12*u,Math.PI,0);c.fill();c.beginPath();c.arc(X(122),Y(76),8*u,Math.PI,0);c.fill();
    c.fillStyle='rgba(205,165,80,.8)';c.beginPath();c.arc(X(92),Y(76),12*u,Math.PI*1.2,Math.PI*1.5);c.lineTo(X(92),Y(76));c.fill();
    c.fillStyle='#14161a';c.fillRect(X(84),Y(34),28*u,18*u);
    c.fillStyle='#7a1c1c';c.fillRect(X(26),Y(34),8*u,10*u);
    c.fillStyle='#0b0c0f';c.beginPath();c.moveTo(X(0),Y(4));c.lineTo(X(20),Y(4));c.lineTo(X(20),Y(26));c.closePath();c.fill();
    wheel(X(40),Y(10),10*u,dist,6);
    const R=19*u, a=dist/R, pins=[70,108,146].map(x=>[X(x)+Math.cos(a)*9*u,Y(19)+Math.sin(a)*9*u]);
    for(const x of [70,108,146])wheel(X(x),Y(19),R,dist,10);
    c.strokeStyle='rgba(150,150,166,.9)';c.lineWidth=4*u;c.lineCap='round';
    c.beginPath();c.moveTo(pins[0][0],pins[0][1]);c.lineTo(pins[2][0],pins[2][1]);c.stroke();
    c.lineWidth=3*u;c.beginPath();c.moveTo(X(84),Y(25));c.lineTo(pins[0][0],pins[0][1]);c.stroke();c.lineCap='butt';
    c.fillStyle='#d8d0b8';c.fillRect(X(30),Y(90),9*u,10*u);
    const lx=X(24),ly=Y(85);
    c.save();c.globalCompositeOperation='lighter';
    const g=c.createLinearGradient(lx,0,lx+720*u,0);g.addColorStop(0,'rgba(255,226,160,.3)');g.addColorStop(1,'rgba(255,226,160,0)');
    c.fillStyle=g;c.beginPath();c.moveTo(lx,ly-4*u);c.lineTo(lx+720*u,ly-80*u);c.lineTo(lx+720*u,ly+86*u);c.lineTo(lx,ly+4*u);c.fill();
    soft(lx,ly,46*u,46*u,[255,230,170],.55);soft(lx+160*u,base-2*u,170*u,10*u,[255,220,150],.22);
    c.restore();
  }
  function train(hx,t){
    const base=L.deckY, n=carCount(), dist=t*L.v, snow=on(settings.snow);
    c.save();c.globalCompositeOperation='lighter';
    for(let x=hx-trainLength();x<hx;x+=(CAR+GAP)*u)if(x>-CAR*u&&x<w)soft(x+CAR*u/2,base+26*u,CAR*.7*u,22*u,[255,160,80],.16);
    c.restore();
    let x=hx-LOCO*u;
    for(let i=0;i<n;i++){const r=x-GAP*u,l=r-CAR*u;if(r>-20*u&&l<w+20*u)carriage(l,r,base+Math.sin(t*9+i*1.3)*.7*u,i,dist,snow,t);x=l;}
    if(hx>-20*u&&hx-LOCO*u<w+20*u)loco(hx,base,dist,t,snow);
  }
  function steam(t,hr){
    const dt=.075, n=Math.floor(t/dt);
    for(let k=58;k>=0;k--){
      const idx=n-k, te=idx*dt, a=t-te;if(a<0)continue;
      const ex=headX(te)-38*u;if(ex<-300*u||ex>w+500*u)continue;
      const chuff=.75+.5*hash(idx*1.37);
      const x=ex-a*34*u, y=L.deckY-108*u-(84*u*(1-Math.exp(-a*1.4))+16*u*a);
      const r=(9+26*Math.pow(a,.8))*u*chuff, alpha=.42*Math.exp(-a*.85)*(1-hr*.25);
      soft(x,y,r,r*.82,a<.35?[255,214,170]:mixc([176,186,214],[214,206,214],hr),alpha);
    }
  }
  function signal(hx){
    const s=L.sigX, busy=hx>s-20*u&&hx-trainLength()<s, col=busy?[255,60,50]:[90,255,150], y=L.deckY-145*u;
    c.save();c.globalCompositeOperation='lighter';soft(s,y,26*u,26*u,col,.5);c.restore();
    c.fillStyle=css(col);ellipse(s,y,3.5*u,3.5*u);c.fill();
  }
  function snowfall(t){
    c.fillStyle='rgb(235,240,255)';
    for(let i=0;i<240;i++){
      const sp=(28+hash(i*2.7)*50)*u, s=(1+hash(i*1.9)*2.4)*u;
      const y=mod(hash(i*3.3)*h+t*sp,h+20*u)-10*u, x=mod(hash(i*4.1)*w+Math.sin(t*.7+i)*18*u-t*12*u,w);
      c.globalAlpha=.35+.5*hash(i*8.1);c.fillRect(x,y,s,s);
    }
    c.globalAlpha=1;
  }

  function draw(){
    const hr=hour(), k=`${w}x${h}|${hr}|${on(settings.snow)}`;
    if(k!==key){key=k;buildSky();buildBack();buildFront();}
    c=main;const t=time, hx=headX(t);
    c.drawImage(sky,0,0);
    stars(t,hr);moon(hr);clouds(t,hr);
    c.drawImage(back,0,0);
    villageLights(t);
    river(t,hx,trainLength());
    train(hx,t);
    if(on(settings.steam))steam(t,hr);
    c.drawImage(front,0,0);
    signal(hx);
    if(on(settings.snow))snowfall(t);
    const v=c.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.35,w*.5,h*.5,Math.max(w,h)*.8);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(2,4,10,.55)');
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
