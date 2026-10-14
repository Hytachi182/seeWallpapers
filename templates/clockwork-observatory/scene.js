/* Clockwork Observatory: original code-drawn steampunk observatory, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), main=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  const TAU=Math.PI*2, smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  let settings={speed:1,metal:0,dawn:0,realTime:true,meteors:true,steam:true,dome:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2), metalMix=()=>num('metal',0,0,2), dawn=()=>num('dawn',0,0,1);
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):12, paused=preview, fps=30;
  let c=main,w=1,h=1,u=1,L={},room=null,stars=null,builtKey='';
  const gearCache=new Map();
  // Previews use a fixed evening so they stay deterministic.
  const FIXED_DATE=new Date(2026,9,13,22,10,36);
  const now=()=>preview?FIXED_DATE:new Date();

  const css=(a,al=1)=>`rgba(${a[0]|0},${a[1]|0},${a[2]|0},${al})`;
  const mix=(a,b,f)=>a.map((v,i)=>v+(b[i]-v)*f);
  const shade=(a,f)=>a.map(v=>clamp(v*f,0,255));
  function ellipse(x,y,rx,ry,rot=0){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,TAU);}
  function soft(x,y,rx,ry,color,alpha){
    const g=c.createRadialGradient(x,y,0,x,y,rx);g.addColorStop(0,css(color,alpha));g.addColorStop(1,css(color,0));
    c.save();c.translate(x,y);c.scale(1,ry/rx);c.translate(-x,-y);c.fillStyle=g;c.fillRect(x-rx,y-rx,rx*2,rx*2);c.restore();
  }
  function into(target,fn){const prev=c;c=target.getContext('2d');fn();c=prev;}
  function layer(cw=w,ch=h){const cv=document.createElement('canvas');cv.width=Math.max(1,Math.ceil(cw));cv.height=Math.max(1,Math.ceil(ch));return cv;}
  function rrect(x,y,ww,hh,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+ww,y,x+ww,y+hh,r);c.arcTo(x+ww,y+hh,x,y+hh,r);c.arcTo(x,y+hh,x,y,r);c.arcTo(x,y,x+ww,y,r);c.closePath();}

  // Metal finish: brass (0) → copper (1) → blued steel (2), each as [light, base, dark].
  const FINISHES=[[[255,230,150],[205,158,72],[104,68,26]],[[248,186,146],[192,108,66],[96,44,24]],[[160,190,230],[72,98,146],[24,34,62]]];
  function metal(){
    const m=metalMix(),i=Math.min(1,Math.floor(m)),f=m-i;
    return FINISHES[i].map((col,k)=>mix(col,FINISHES[i+1][k],f));
  }
  function metalGrad(x0,y0,x1,y1,pal){const g=c.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,css(pal[0]));g.addColorStop(.45,css(pal[1]));g.addColorStop(1,css(pal[2]));return g;}

  function layout(){
    const P=w/h<1;
    u=P?Math.min(w/1080,h/1920):Math.min(w/1920,h/1080);
    L={portrait:P,cx:w/2,springY:h*(P?.34:.43),floorY:h*(P?.74:.79),R:w*(P?.95:.56),slitHalf:P?.22:.17,
      pivot:[w*(P?.66:.615),h*(P?.63:.6)],tele:P?1.15:1,
      gears:[w*(P?.17:.16),h*(P?.53:.6)],gearScale:P?1.35:1,
      clock:[w*(P?.83:.855),h*(P?.45:.37)],clockScale:P?1.3:1,
      orrery:[w*(P?.27:.33),h*(P?.86:.83)],orreryScale:P?1.55:1.2,
      desk:[w*(P?.78:.765),h*(P?.92:.88)],deskScale:P?1.2:.85,
      lantern:[w*(P?.36:.44),h*(P?.41:.5)],
      vent:[w*(P?.05:.045),h*(P?.43:.5)]};
  }

  // ---------- Gears: tooth counts set the radii, and meshing gears keep their teeth interleaved ----------
  function gearImage(n,m){
    const key=`${n}|${m.toFixed(2)}|${builtKey}`;if(gearCache.has(key))return gearCache.get(key);
    const pal=metal(),r=n*m/2,ro=r+m,rr=r-1.25*m,size=Math.ceil(ro*2+6),cv=layer(size,size),sh=layer(size,size);
    into(cv,()=>{
      c.translate(size/2,size/2);
      c.beginPath();
      for(let k=0;k<n;k++){
        const a=k*TAU/n,p=(rad,ang)=>[Math.cos(ang)*rad,Math.sin(ang)*rad],w1=Math.PI/n*.58,w2=Math.PI/n*.34;
        for(const [rad,ang] of [[rr,a-Math.PI/n],[rr,a-w1],[ro,a-w2],[ro,a+w2],[rr,a+w1]])c.lineTo(...p(rad,ang));
      }
      c.closePath();
      const g=c.createRadialGradient(-r*.45,-r*.45,r*.1,0,0,ro);g.addColorStop(0,css(pal[0]));g.addColorStop(.55,css(pal[1]));g.addColorStop(1,css(pal[2]));
      c.fillStyle=g;c.fill();c.strokeStyle=css(shade(pal[2],.7),.8);c.lineWidth=Math.max(1,m*.18);c.stroke();
      const hub=Math.max(6,r*.24),inner=rr-m*1.3;
      if(r>28*u){
        const spokes=r>70*u?6:4;
        c.globalCompositeOperation='destination-out';
        for(let k=0;k<spokes;k++){
          const a0=k*TAU/spokes+.16,a1=(k+1)*TAU/spokes-.16;
          c.beginPath();c.arc(0,0,inner,a0,a1);c.arc(0,0,hub*1.5,a1-.08,a0+.08,true);c.closePath();c.fill();
        }
        c.globalCompositeOperation='source-over';
        c.strokeStyle=css(shade(pal[2],.8),.7);c.lineWidth=Math.max(1,m*.25);
        c.beginPath();c.arc(0,0,inner,0,TAU);c.stroke();
      }
      const hg=c.createRadialGradient(-hub*.4,-hub*.4,0,0,0,hub);hg.addColorStop(0,css(pal[0]));hg.addColorStop(1,css(pal[2]));
      c.fillStyle=hg;c.beginPath();c.arc(0,0,hub,0,TAU);c.fill();
      c.fillStyle=css(shade(pal[2],.5));
      for(let k=0;k<5;k++){const a=k*TAU/5;c.beginPath();c.arc(Math.cos(a)*hub*.62,Math.sin(a)*hub*.62,Math.max(1,hub*.12),0,TAU);c.fill();}
      c.fillStyle='#14100c';c.beginPath();c.arc(0,0,Math.max(1.5,hub*.28),0,TAU);c.fill();
      c.strokeStyle=css(pal[0],.45);c.lineWidth=Math.max(1,m*.3);c.beginPath();c.arc(0,0,r*.92,Math.PI*1.05,Math.PI*1.45);c.stroke();
    });
    into(sh,()=>{c.drawImage(cv,0,0);c.globalCompositeOperation='source-in';c.fillStyle='#000';c.fillRect(0,0,size,size);});
    const out={cv,sh,size};gearCache.set(key,out);return out;
  }
  function drawGear(x,y,n,m,angle,shadow=true){
    const g=gearImage(n,m);
    if(shadow){c.save();c.globalAlpha=.4;c.translate(x+7*u,y+9*u);c.rotate(angle);c.drawImage(g.sh,-g.size/2,-g.size/2);c.restore();}
    c.save();c.translate(x,y);c.rotate(angle);c.drawImage(g.cv,-g.size/2,-g.size/2);c.restore();
  }
  // Angle of gear j meshing with gear i, whose centre lies in direction theta from i.
  const meshAngle=(ai,ni,nj,theta)=>theta+Math.PI-(ni/nj)*(ai-theta)+Math.PI/nj;
  function gearTrain(){
    const s=u*L.gearScale,m=5*s,[x0,y0]=L.gears,a0=time*.42;
    const at=(x,y,n1,n2,theta)=>[x+Math.cos(theta)*(n1+n2)*m/2,y+Math.sin(theta)*(n1+n2)*m/2];
    const G=[{x:x0,y:y0,n:36,a:a0}];
    const add=(i,n,theta)=>{const p=G[i],[x,y]=at(p.x,p.y,p.n,n,theta);G.push({x,y,n,a:meshAngle(p.a,p.n,n,theta)});return G.length-1;};
    const g1=add(0,14,-.75);
    const big={x:G[g1].x,y:G[g1].y,n:30,a:G[g1].a*1+.2,behind:true};
    const g3={n:18,theta:-1.95};[g3.x,g3.y]=at(big.x,big.y,30,18,g3.theta);g3.a=meshAngle(big.a,30,18,g3.theta);
    const g4=add(0,24,2.2);add(g4,10,1.25);add(0,12,.55);
    c.save();c.strokeStyle='#2a1f16';c.lineWidth=10*s;c.lineCap='round';
    for(const g of [G[0],big,g3]){c.beginPath();c.moveTo(g.x,g.y);c.lineTo(g.x-30*s,g.y+40*s);c.stroke();}
    c.restore();
    drawGear(big.x,big.y,30,m,big.a);
    drawGear(g3.x,g3.y,18,m,g3.a);
    for(const g of G)drawGear(g.x,g.y,g.n,m,g.a);
  }

  // ---------- Static room ----------
  function buildStars(){
    const sw=Math.ceil(w*1.8),sh=Math.ceil(L.springY);stars=layer(sw,sh);
    into(stars,()=>{
      for(let i=0;i<40;i++){const t=i/40,x=sw*t,y=sh*(.85-t*.7)+(hash(i)-.5)*60*u;soft(x,y,(90+hash(i*3)*80)*u,(50+hash(i*5)*40)*u,[140,130,190],.07);}
      for(let i=0;i<900;i++){
        const x=hash(i*1.7)*sw,y=hash(i*2.3)*sh,r=(.4+hash(i*3.1)**3*1.8)*u,t=hash(i*4.4);
        c.fillStyle=css(t<.15?[255,210,170]:t<.3?[180,200,255]:[240,240,255],.4+hash(i*5.9)*.6);ellipse(x,y,r,r);c.fill();
      }
    });
  }
  function buildRoom(){
    room=layer();
    const pal=metal();
    into(room,()=>{
      const {springY:sy,floorY:fy,cx}=L;
      // Brick wall of the observing room.
      const g=c.createLinearGradient(0,sy,0,fy);g.addColorStop(0,'#2a1d18');g.addColorStop(1,'#3a2a22');
      c.fillStyle=g;c.fillRect(0,sy,w,fy-sy);
      const bh=22*u,bw=64*u;
      for(let row=0,y=sy+40*u;y<fy;row++,y+=bh)for(let x=-(row%2)*bw/2;x<w;x+=bw){
        const t=hash(row*91+x*.13);c.fillStyle=`rgba(${70+t*40|0},${40+t*22|0},${30+t*14|0},.55)`;c.fillRect(x+1.5*u,y+1.5*u,bw-3*u,bh-3*u);
      }
      const sideShade=c.createLinearGradient(0,0,w,0);sideShade.addColorStop(0,'rgba(0,0,0,.55)');sideShade.addColorStop(.35,'rgba(0,0,0,0)');sideShade.addColorStop(.65,'rgba(0,0,0,0)');sideShade.addColorStop(1,'rgba(0,0,0,.55)');
      c.fillStyle=sideShade;c.fillRect(0,sy,w,fy-sy);
      // Dome rail frieze.
      c.fillStyle='#24180f';c.fillRect(0,sy,w,40*u);
      c.fillStyle=metalGrad(0,sy,0,sy+10*u,pal);c.fillRect(0,sy,w,8*u);c.fillRect(0,sy+32*u,w,6*u);
      for(let x=20*u;x<w;x+=90*u){c.fillStyle=css(pal[2]);ellipse(x,sy+20*u,9*u,9*u);c.fill();c.fillStyle=css(pal[1]);ellipse(x,sy+20*u,5*u,5*u);c.fill();}
      // Bookshelves on both sides.
      const shelf=(x0,x1,y0,y1,seed)=>{
        c.fillStyle='#1d130d';c.fillRect(x0-8*u,y0-10*u,x1-x0+16*u,y1-y0+20*u);
        const rows=4,rh=(y1-y0)/rows;
        for(let r=0;r<rows;r++){
          const base=y0+(r+1)*rh;let x=x0+4*u;
          while(x<x1-14*u){
            const k=seed+r*100+x*.07,bw2=(10+hash(k)*16)*u,bh2=rh*(.55+hash(k+1)*.38),lean=hash(k+2)<.08;
            if(hash(k+3)<.06){c.fillStyle=css(pal[1]);ellipse(x+14*u,base-16*u,13*u,13*u);c.fill();c.strokeStyle=css(pal[2]);c.lineWidth=2*u;c.beginPath();c.arc(x+14*u,base-16*u,17*u,Math.PI*.9,Math.PI*2.1);c.stroke();x+=32*u;continue;}
            const col=[[120,34,30],[40,70,52],[38,52,88],[110,80,40],[70,30,60],[150,120,70]][Math.floor(hash(k+4)*6)].map(v=>v*(.55+hash(k+5)*.45));
            c.save();c.translate(x,base);if(lean)c.rotate(.18);
            c.fillStyle=css(col);c.fillRect(0,-bh2,bw2-1.5*u,bh2);
            c.fillStyle=css(pal[0],.55);c.fillRect(1*u,-bh2*.82,bw2-3.5*u,2*u);c.fillRect(1*u,-bh2*.3,bw2-3.5*u,2*u);
            c.restore();x+=bw2;
          }
          c.fillStyle='#3a2617';c.fillRect(x0-8*u,base,x1-x0+16*u,8*u);
        }
      };
      if(L.portrait){shelf(w*.02,w*.3,sy+70*u,fy-10*u,1);shelf(w*.7,w*.98,sy+70*u,fy-10*u,7);}
      else{shelf(w*.02,w*.24,sy+70*u,fy-20*u,1);shelf(w*.74,w*.98,sy+70*u,fy-20*u,7);}
      // Framed star chart.
      const fx=L.portrait?w*.33:w*.27,fw=(L.portrait?150:200)*u,fh=fw*.72,fyy=sy+(L.portrait?70:80)*u;
      c.fillStyle=metalGrad(fx,fyy,fx+fw,fyy+fh,pal);c.fillRect(fx-8*u,fyy-8*u,fw+16*u,fh+16*u);
      c.fillStyle='#132036';c.fillRect(fx,fyy,fw,fh);
      c.strokeStyle='rgba(200,215,240,.35)';c.lineWidth=1*u;c.beginPath();c.arc(fx+fw/2,fyy+fh/2,fh*.42,0,TAU);c.stroke();
      const pts=[];for(let i=0;i<14;i++)pts.push([fx+fw*(.12+hash(i*7.1)*.76),fyy+fh*(.12+hash(i*3.3)*.76)]);
      c.beginPath();for(let i=0;i<13;i+=2){c.moveTo(...pts[i]);c.lineTo(...pts[i+1]);}c.stroke();
      c.fillStyle='rgba(240,230,190,.9)';for(const [x,y] of pts){ellipse(x,y,1.8*u,1.8*u);c.fill();}
      // Wooden floor in perspective.
      const fg=c.createLinearGradient(0,fy,0,h);fg.addColorStop(0,'#3b2617');fg.addColorStop(1,'#1c120b');
      c.fillStyle=fg;c.fillRect(0,fy,w,h-fy);
      c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=1.5*u;c.beginPath();
      for(let i=-24;i<=24;i++){const bx=cx+i*90*u;c.moveTo(cx+i*28*u,fy);c.lineTo(bx+(bx-cx)*.8,h);}
      for(let y=fy,k=6*u;y<h;y+=k,k*=1.25){c.moveTo(0,y);c.lineTo(w,y);}
      c.stroke();
      c.fillStyle='rgba(0,0,0,.4)';c.fillRect(0,fy,w,6*u);
      // Brass floor rail around the telescope.
      c.strokeStyle=css(pal[1],.8);c.lineWidth=5*u;ellipse(L.pivot[0],fy+(h-fy)*.45,240*u*L.tele,(h-fy)*.22);c.stroke();
      // Steam pipe with valve and gauge.
      const [vx,vy]=L.vent;
      c.fillStyle=metalGrad(vx-12*u,0,vx+12*u,0,pal);c.fillRect(vx-11*u,vy-20*u,22*u,fy-vy+20*u);
      c.fillRect(vx-11*u,vy-24*u,90*u,22*u);
      for(const y of [vy+60*u,vy+180*u])c.fillRect(vx-16*u,y,32*u,10*u);
      c.strokeStyle=css(pal[2]);c.lineWidth=7*u;c.beginPath();c.arc(vx,vy+120*u,24*u,0,TAU);c.stroke();
      c.lineWidth=3*u;c.beginPath();for(let k=0;k<4;k++){const a=k*Math.PI/4;c.moveTo(vx-Math.cos(a)*24*u,vy+120*u-Math.sin(a)*24*u);c.lineTo(vx+Math.cos(a)*24*u,vy+120*u+Math.sin(a)*24*u);}c.stroke();
      c.fillStyle=metalGrad(vx,vy-80*u,vx+40*u,vy-30*u,pal);ellipse(vx+30*u,vy-56*u,30*u,30*u);c.fill();
      c.fillStyle='#efe4c8';ellipse(vx+30*u,vy-56*u,23*u,23*u);c.fill();
      c.strokeStyle='#3a2a1a';c.lineWidth=1.2*u;c.beginPath();for(let k=0;k<=8;k++){const a=Math.PI*.75+k*Math.PI*1.5/8;c.moveTo(vx+30*u+Math.cos(a)*17*u,vy-56*u+Math.sin(a)*17*u);c.lineTo(vx+30*u+Math.cos(a)*21*u,vy-56*u+Math.sin(a)*21*u);}c.stroke();
      c.fillStyle=metalGrad(vx,vy-36*u,vx+20*u,vy-26*u,pal);c.fillRect(vx+22*u,vy-34*u,16*u,14*u);
      // Long-case clock body.
      const s=u*L.clockScale,[kx,ky]=L.clock,top=ky-170*s,bot=fy+14*u,cw=180*s;
      c.fillStyle='#000';c.globalAlpha=.3;c.fillRect(kx-cw/2+10*u,top+20*u,cw,L.floorY-top);c.globalAlpha=1;
      const wood=c.createLinearGradient(kx-cw/2,0,kx+cw/2,0);wood.addColorStop(0,'#3a1a0e');wood.addColorStop(.5,'#6a311a');wood.addColorStop(1,'#2e140a');
      c.fillStyle=wood;c.fillRect(kx-cw/2,top,cw,bot-top);
      c.beginPath();c.moveTo(kx-cw/2-10*s,top);c.quadraticCurveTo(kx,top-90*s,kx+cw/2+10*s,top);c.closePath();c.fill();
      c.fillStyle=css(pal[1]);c.fillRect(kx-cw/2-10*s,top-4*s,cw+20*s,8*s);c.fillRect(kx-cw/2,ky+118*s,cw,6*s);
      ellipse(kx,top-62*s,9*s,9*s);c.fill();
      c.fillStyle='#120a06';rrect(kx-48*s,top-58*s,96*s,48*s,20*s);c.fill();
      c.fillStyle='#0c0705';rrect(kx-cw/2+26*s,ky+140*s,cw-52*s,Math.min(330*s,bot-ky-170*s),10*s);c.fill();
      c.fillStyle=metalGrad(kx-110*s,ky-110*s,kx+110*s,ky+110*s,pal);ellipse(kx,ky,104*s,104*s);c.fill();
      // Orrery table.
      const os=u*L.orreryScale,[ox,oy]=L.orrery;
      c.fillStyle='#000';c.globalAlpha=.35;ellipse(ox+10*u,fy+(h-fy)*.6,150*os,26*os);c.fill();c.globalAlpha=1;
      c.fillStyle='#2e1a0e';c.fillRect(ox-14*os,oy,28*os,Math.max(10,h-oy));
      const tg=c.createLinearGradient(ox-170*os,0,ox+170*os,0);tg.addColorStop(0,'#3d1f10');tg.addColorStop(.5,'#6e3a1e');tg.addColorStop(1,'#3a1c0e');
      c.fillStyle='#24120a';ellipse(ox,oy+10*os,172*os,46*os);c.fill();c.fillStyle=tg;ellipse(ox,oy,172*os,44*os);c.fill();
      c.strokeStyle=css(pal[1],.7);c.lineWidth=3*os;ellipse(ox,oy,160*os,40*os);c.stroke();
      // Writing desk with a star chart, a book and an inkwell.
      const ds=u*L.deskScale,[dx,dy]=L.desk,dw=340*ds,dd=80*ds;
      c.fillStyle='#000';c.globalAlpha=.3;c.fillRect(dx-dw/2+10*u,dy+20*ds,dw,h-dy);c.globalAlpha=1;
      c.fillStyle='#2a160b';c.fillRect(dx-dw/2+10*ds,dy,22*ds,h-dy);c.fillRect(dx+dw/2-32*ds,dy,22*ds,h-dy);
      c.fillStyle='#4a2614';c.fillRect(dx-dw/2,dy,dw,24*ds);
      c.fillStyle='#6b3a1d';c.beginPath();c.moveTo(dx-dw/2,dy);c.lineTo(dx-dw/2+30*ds,dy-dd);c.lineTo(dx+dw/2-30*ds,dy-dd);c.lineTo(dx+dw/2,dy);c.closePath();c.fill();
      c.fillStyle='#d9ccaa';c.beginPath();c.moveTo(dx-110*ds,dy-8*ds);c.lineTo(dx-90*ds,dy-66*ds);c.lineTo(dx+40*ds,dy-66*ds);c.lineTo(dx+30*ds,dy-8*ds);c.closePath();c.fill();
      c.strokeStyle='rgba(40,50,90,.6)';c.lineWidth=1.2*ds;c.beginPath();c.ellipse(dx-36*ds,dy-37*ds,48*ds,20*ds,0,0,TAU);
      for(let i=0;i<6;i++){c.moveTo(dx-80*ds+hash(i)*90*ds,dy-60*ds+hash(i*2)*45*ds);c.lineTo(dx-80*ds+hash(i*3)*90*ds,dy-60*ds+hash(i*4)*45*ds);}c.stroke();
      c.fillStyle='#5a1e18';c.beginPath();c.moveTo(dx+60*ds,dy-14*ds);c.lineTo(dx+70*ds,dy-56*ds);c.lineTo(dx+140*ds,dy-56*ds);c.lineTo(dx+134*ds,dy-14*ds);c.closePath();c.fill();
      c.fillStyle='#e8dcc0';c.fillRect(dx+66*ds,dy-22*ds,66*ds,6*ds);
      c.fillStyle='#141820';ellipse(dx-150*ds,dy-26*ds,16*ds,12*ds);c.fill();c.fillStyle=css(pal[1]);ellipse(dx-150*ds,dy-36*ds,9*ds,4*ds);c.fill();
      c.strokeStyle='#e8e0d0';c.lineWidth=2*ds;c.beginPath();c.moveTo(dx-150*ds,dy-36*ds);c.quadraticCurveTo(dx-135*ds,dy-80*ds,dx-118*ds,dy-104*ds);c.stroke();
    });
  }

  // ---------- Animated parts ----------
  function domeAngle(){
    if(!on(settings.dome))return 0;
    const P=40,k=Math.floor(time/P),local=time-k*P,A=i=>.2*Math.sin(i*1.7+1);
    return A(k-1)+(A(k)-A(k-1))*smooth((local-4)/6);
  }
  const domeMoving=()=>{if(!on(settings.dome))return 0;const local=time%40;return local>4&&local<10?Math.sin((local-4)/6*Math.PI):0;};
  function slitPath(a){
    const {cx,R,springY:sy,slitHalf:d}=L,p=new Path2D();
    const edge=(ang,y)=>{const f=1-y/sy;return cx+R*Math.sin(ang)*(1-.55*f*f);};
    p.moveTo(edge(a-d,sy),sy);
    for(let i=1;i<=12;i++){const y=sy*(1-i/12)-(i===12?20*u:0);p.lineTo(edge(a-d*(1-.25*i/12),y),y);}
    for(let i=12;i>=0;i--){const y=sy*(1-i/12)-(i===12?20*u:0);p.lineTo(edge(a+d*(1-.25*i/12),y),y);}
    p.closePath();return p;
  }
  function moonPhase(){const days=(now()-Date.UTC(2000,0,6,18,14))/864e5;return((days%29.530588)+29.530588)%29.530588/29.530588;}
  function moon(x,y,r,phase,darkCol){
    c.fillStyle='#f3ecd6';ellipse(x,y,r,r);c.fill();
    c.fillStyle='rgba(180,170,150,.35)';for(let i=0;i<5;i++){ellipse(x+(hash(i)-.5)*r,y+(hash(i*2)-.5)*r,r*(.12+hash(i*3)*.14),r*(.1+hash(i*4)*.12));c.fill();}
    const k=Math.cos(phase*TAU),waxing=phase<.5;
    c.fillStyle=darkCol;c.beginPath();
    c.arc(x,y,r+.5,-Math.PI/2,Math.PI/2,!waxing);
    c.ellipse(x,y,Math.abs(k)*r+.5,r+.5,0,Math.PI/2,-Math.PI/2,(k>0)!==waxing);
    c.fill();
  }
  function sky(a){
    const {springY:sy,cx,R}=L,dw=dawn(),slit=slitPath(a),slitX=cx+R*Math.sin(a);
    c.save();c.clip(slit);
    const g=c.createLinearGradient(0,0,0,sy);
    g.addColorStop(0,css(mix([5,8,22],[52,70,140],dw)));g.addColorStop(.7,css(mix([12,18,44],[190,130,150],dw)));g.addColorStop(1,css(mix([22,28,60],[250,170,110],dw)));
    c.fillStyle=g;c.fillRect(0,-30*u,w,sy+30*u);
    const sw=stars.width,off=((time*4*u+a*R*.8)%sw+sw)%sw;
    c.globalAlpha=1-dw*.92;c.drawImage(stars,-off,0);c.drawImage(stars,sw-off,0);
    for(let i=0;i<30;i++){
      const x=((hash(i*9.1)*sw-off)%sw+sw)%sw,y=hash(i*4.7)*sy*.9,tw=.5+.5*Math.sin(time*(1.5+hash(i)*2)+i);
      soft(x,y,(3+tw*4)*u,(3+tw*4)*u,[230,236,255],.8*tw);
    }
    c.globalAlpha=1;
    moon(slitX+R*L.slitHalf*.12+Math.sin(time*.012)*20*u,sy*.3,30*u*(L.portrait?1.3:1),moonPhase(),css(mix([10,14,34],[110,100,150],dw)));
    soft(slitX+R*L.slitHalf*.12,sy*.3,120*u,120*u,[220,225,255],.1*(1-dw*.6));
    if(on(settings.meteors)){
      for(const [P,off2,len] of [[9,5.5,1.3],[13,2,1]]){
        const lt=time+off2,k=Math.floor(lt/P),f=(lt-k*P)/len;if(f>1)continue;
        const x0=slitX+L.R*L.slitHalf*(hash(k*3.3+P)*.6-.3),y0=sy*(.05+hash(k*5.1+P)*.25),dir=hash(k*7.7)<.5?-1:1;
        const dx=dir*200*u,dy=170*u,hx=x0+dx*f,hy=y0+dy*f,tail=.35;
        const gr=c.createLinearGradient(hx-dx*tail,hy-dy*tail,hx,hy);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,`rgba(255,250,235,${(1-f)*.95})`);
        c.strokeStyle=gr;c.lineWidth=2.5*u;c.lineCap='round';c.beginPath();c.moveTo(hx-dx*tail,hy-dy*tail);c.lineTo(hx,hy);c.stroke();
        soft(hx,hy,9*u,9*u,[255,250,230],.9*(1-f));
      }
    }
    c.restore();
    return slit;
  }
  function dome(a,slit){
    const {springY:sy,cx,R}=L,pal=metal();
    const shell=new Path2D();shell.rect(0,-2,w,sy+2);shell.addPath(slit);
    const g=c.createLinearGradient(0,0,0,sy);g.addColorStop(0,'#120c0a');g.addColorStop(1,'#2a1c15');
    c.fillStyle=g;c.fill(shell,'evenodd');
    const rib=ang=>{const p=[];for(let i=0;i<=12;i++){const y=sy*(1-i/12),f=1-y/sy;p.push([cx+R*Math.sin(ang)*(1-.55*f*f),y]);}return p;};
    for(let k=-12;k<=12;k++){
      const ang=k*.13+a%.13;if(Math.abs(ang)>1.45||Math.abs(ang-a)<L.slitHalf+.02)continue;
      const p=rib(ang);
      c.strokeStyle='rgba(0,0,0,.5)';c.lineWidth=12*u;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
      c.strokeStyle=css(shade(pal[1],.55));c.lineWidth=6*u;c.stroke();
      c.fillStyle=css(pal[0],.6);for(let i=1;i<12;i+=2){ellipse(p[i][0],p[i][1],2.2*u,2.2*u);c.fill();}
    }
    for(const side of [-1,1]){
      const p=rib(a+side*L.slitHalf);
      c.strokeStyle=css(pal[2]);c.lineWidth=14*u;c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
      c.strokeStyle=css(pal[1]);c.lineWidth=6*u;c.stroke();
    }
    const mv=domeMoving();
    if(mv>0)for(let i=0;i<24;i++){const p=((time*.9+hash(i))%1),x=hash(i*3.7)*w,y=sy+p*(L.floorY-sy);c.fillStyle=`rgba(200,180,150,${.5*mv*(1-p)})`;ellipse(x,y,1.5*u,1.5*u);c.fill();}
  }
  function moonbeam(a){
    const {springY:sy,cx,R}=L,dw=dawn(),x=cx+R*Math.sin(a),[px,py]=L.pivot;
    c.save();c.globalCompositeOperation='screen';
    const g=c.createLinearGradient(x,sy*.4,px,L.floorY);g.addColorStop(0,css(mix([150,170,230],[255,190,140],dw),.16));g.addColorStop(1,css(mix([150,170,230],[255,190,140],dw),0));
    c.fillStyle=g;c.beginPath();c.moveTo(x-R*L.slitHalf*.7,sy*.4);c.lineTo(x+R*L.slitHalf*.7,sy*.4);c.lineTo(px+220*u,L.floorY+40*u);c.lineTo(px-260*u,L.floorY+40*u);c.closePath();c.fill();
    for(let i=0;i<60;i++){
      const f=hash(i*2.3),y=sy*.45+f*(L.floorY-sy*.45),spread=(R*L.slitHalf*.7)*(1-f)+240*u*f,cxl=x+(px-x)*f;
      const xx=cxl+(hash(i*5.1)-.5)*2*spread+Math.sin(time*.3+i)*12*u,yy=y+Math.cos(time*.21+i*1.3)*14*u,tw=.5+.5*Math.sin(time*1.2+i*2.7);
      c.fillStyle=`rgba(255,245,220,${.45*tw})`;ellipse(xx,yy,1.4*u,1.4*u);c.fill();
    }
    c.restore();
  }
  function telescope(a){
    const pal=metal(),s=u*L.tele,[px,py]=L.pivot;
    const ang=-Math.PI/2-.42+Math.sin(a)*.9+.025*Math.sin(time*.05)+.008*Math.sin(time*.31);
    // Pier and fork.
    c.fillStyle=css(shade(pal[2],.6),.45);ellipse(px+30*u,L.floorY+(h-L.floorY)*.45,110*s,22*s);c.fill();
    const pier=c.createLinearGradient(px-40*s,0,px+40*s,0);pier.addColorStop(0,'#1d1610');pier.addColorStop(.45,'#4a3a2c');pier.addColorStop(1,'#16100b');
    c.fillStyle=pier;c.beginPath();c.moveTo(px-30*s,py+40*s);c.lineTo(px+30*s,py+40*s);c.lineTo(px+56*s,L.floorY+(h-L.floorY)*.45);c.lineTo(px-56*s,L.floorY+(h-L.floorY)*.45);c.closePath();c.fill();
    c.fillStyle=metalGrad(px-40*s,0,px+40*s,0,pal);c.fillRect(px-44*s,py+34*s,88*s,14*s);
    drawGear(px+62*s,py+44*s,12,3*s,meshAngle(ang*1,48,12,.6));
    drawGear(px,py,48,3*s,ang);
    // Tube with dew shield, rings, finder and eyepiece.
    c.save();c.translate(px,py);c.rotate(ang);
    const back=140*s,front=440*s,r0=34*s,r1=46*s;
    c.fillStyle='rgba(0,0,0,.35)';c.beginPath();c.moveTo(-back,r0+10*s);c.lineTo(front,r1+14*s);c.lineTo(front,r1+30*s);c.lineTo(-back,r0+22*s);c.fill();
    const tg=c.createLinearGradient(0,-r1,0,r1);tg.addColorStop(0,css(pal[0]));tg.addColorStop(.35,css(pal[1]));tg.addColorStop(1,css(pal[2]));
    c.fillStyle=tg;c.beginPath();c.moveTo(-back,-r0);c.lineTo(front-70*s,-r1);c.lineTo(front-70*s,r1);c.lineTo(-back,r0);c.closePath();c.fill();
    c.fillRect(front-74*s,-r1-6*s,74*s,(r1+6*s)*2);
    for(const x of [-back+10*s,40*s,260*s,front-74*s,front-4*s]){c.fillStyle=css(shade(pal[2],.8));c.fillRect(x-4*s,-r1-8*s,8*s,(r1+8*s)*2);c.fillStyle=css(pal[0],.6);c.fillRect(x-4*s,-r1-8*s,8*s,5*s);}
    c.fillStyle='#0a0d18';ellipse(front,0,8*s,r1+4*s);c.fill();
    c.fillStyle=`rgba(170,200,255,${.35+.15*Math.sin(time*.7)})`;ellipse(front+1*s,-r1*.35,3*s,r1*.35);c.fill();
    c.fillStyle=css(pal[2]);c.fillRect(90*s,-r1-8*s,8*s,12*s);c.fillRect(200*s,-r1-10*s,8*s,12*s);c.fillStyle=tg;c.fillRect(60*s,-r1-20*s,170*s,15*s);c.fillStyle=css(pal[2]);c.fillRect(228*s,-r1-22*s,8*s,19*s);
    c.fillStyle='#1a1410';c.fillRect(-back-46*s,-12*s,48*s,24*s);c.fillStyle=css(pal[1]);c.fillRect(-back-56*s,-15*s,12*s,30*s);
    c.fillStyle=css(pal[2]);c.fillRect(-back+40*s,r0,10*s,80*s);ellipse(-back+45*s,r0+90*s,22*s,22*s);c.fill();
    c.restore();
    c.fillStyle=metalGrad(px-16*s,py-16*s,px+16*s,py+16*s,pal);ellipse(px,py,16*s,16*s);c.fill();
  }
  function gauge(){
    const [vx,vy]=L.vent,a=Math.PI*.75+Math.PI*1.5*(.55+.12*Math.sin(time*.7)+.03*Math.sin(time*7.3)+(on(settings.steam)?.15:-.2));
    c.strokeStyle='#8a1a12';c.lineWidth=2*u;c.beginPath();c.moveTo(vx+30*u,vy-56*u);c.lineTo(vx+30*u+Math.cos(a)*18*u,vy-56*u+Math.sin(a)*18*u);c.stroke();
    c.fillStyle='#2a1a10';ellipse(vx+30*u,vy-56*u,3*u,3*u);c.fill();
  }
  function steam(){
    if(!on(settings.steam))return;
    const [vx,vy]=L.vent,ox=vx+80*u,oy=vy-14*u;
    c.save();c.globalCompositeOperation='screen';
    const burst=Math.max(0,Math.sin(time*TAU/11))**8;
    for(let i=0;i<28;i++){
      const life=3.5+hash(i)*2,p=((time+hash(i*3.1)*life)/life)%1,drift=(hash(i*5.3)-.5)*60*u;
      const x=ox+p*(70+burst*80)*u+drift*p+Math.sin(time*1.3+i)*8*u,y=oy-p*(220+burst*120)*u,r=(8+p*46)*u;
      soft(x,y,r,r,[215,212,205],(.22+burst*.15)*(1-p)*Math.min(1,p*6));
    }
    c.restore();
  }
  function flame(x,y,s,seed){
    const f=.85+.1*Math.sin(time*9+seed)+.06*Math.sin(time*23+seed*2),sway=Math.sin(time*3.1+seed)*2*s;
    c.save();c.globalCompositeOperation='screen';soft(x,y-8*s,170*s*f,150*s*f,[255,170,80],.32);soft(x,y-8*s,40*s,40*s,[255,210,140],.5*f);c.restore();
    c.fillStyle='rgba(255,190,90,.95)';c.beginPath();c.moveTo(x-6*s,y);c.quadraticCurveTo(x-7*s,y-12*s,x+sway,y-26*s*f);c.quadraticCurveTo(x+7*s,y-12*s,x+6*s,y);c.closePath();c.fill();
    c.fillStyle='rgba(255,250,220,.95)';ellipse(x,y-6*s,2.6*s,6*s);c.fill();
  }
  function lamps(){
    const pal=metal(),[lx,ly]=L.lantern,s=u*(L.portrait?1.2:1);
    c.strokeStyle='#1a120c';c.lineWidth=2*u;c.beginPath();c.moveTo(lx,L.springY+38*u);c.lineTo(lx,ly-40*s);c.stroke();
    c.fillStyle=metalGrad(lx-22*s,0,lx+22*s,0,pal);c.fillRect(lx-24*s,ly-44*s,48*s,10*s);c.fillRect(lx-26*s,ly+30*s,52*s,10*s);
    c.fillStyle='rgba(255,220,160,.18)';c.fillRect(lx-20*s,ly-34*s,40*s,64*s);
    c.strokeStyle=css(pal[2]);c.lineWidth=3*s;c.strokeRect(lx-20*s,ly-34*s,40*s,64*s);
    flame(lx,ly+22*s,s,1);
    const ds=u*L.deskScale,[dx,dy]=L.desk,bx=dx+110*ds,by=dy-36*ds;
    c.fillStyle=metalGrad(bx-20*ds,0,bx+20*ds,0,pal);ellipse(bx,by,26*ds,9*ds);c.fill();c.fillRect(bx-10*ds,by-22*ds,20*ds,22*ds);
    c.fillStyle='rgba(255,236,200,.22)';ellipse(bx,by-50*ds,16*ds,28*ds);c.fill();
    flame(bx,by-34*ds,ds*.9,4);
  }
  // Mean planetary longitudes (J2000 epoch, days per orbit) drive the orrery from today's sky.
  const PLANETS=[[252.25,87.969,38,4,[190,170,150]],[181.98,224.7,58,6,[235,205,140]],[100.46,365.256,80,6.5,[90,150,220]],[355.45,686.98,102,5,[210,100,60]],[34.4,4332.59,128,11,[220,180,130]],[49.94,10759.2,156,9,[230,205,150]]];
  function orrery(){
    const pal=metal(),s=u*L.orreryScale,[ox,oy]=L.orrery,top=oy-120*s;
    const base=on(settings.realTime)?(now()-Date.UTC(2000,0,1,12))/864e5:9000,d=base+time*6;
    c.fillStyle=metalGrad(ox-30*s,0,ox+30*s,0,pal);ellipse(ox,oy-6*s,40*s,12*s);c.fill();c.fillRect(ox-5*s,top,10*s,oy-top-6*s);
    c.strokeStyle=css(pal[1],.25);c.lineWidth=1*s;
    for(const p of PLANETS){ellipse(ox,top,p[2]*s,p[2]*s*.28);c.stroke();}
    const bodies=PLANETS.map((p,i)=>{const a=(p[0]+360*d/p[1])*Math.PI/180;return{i,p,a,x:ox+Math.cos(a)*p[2]*s,y:top+Math.sin(a)*p[2]*s*.28};});
    const drawBody=b=>{
      const [,,,r,col]=b.p;
      c.strokeStyle=css(pal[1]);c.lineWidth=2*s;c.beginPath();c.moveTo(ox,top);c.lineTo(b.x,b.y);c.lineTo(b.x,b.y-14*s);c.stroke();
      const g=c.createRadialGradient(b.x-r*.4*s,b.y-14*s-r*.4*s,0,b.x,b.y-14*s,r*s);g.addColorStop(0,css(col.map(v=>Math.min(255,v+50))));g.addColorStop(1,css(shade(col,.45)));
      c.fillStyle=g;ellipse(b.x,b.y-14*s,r*s,r*s);c.fill();
      if(b.i===5){c.strokeStyle='rgba(235,215,170,.8)';c.lineWidth=2*s;ellipse(b.x,b.y-14*s,r*1.9*s,r*.55*s,-.3);c.stroke();}
      if(b.i===2){const ma=d/27.32*TAU;c.fillStyle='#ddd';ellipse(b.x+Math.cos(ma)*12*s,b.y-14*s+Math.sin(ma)*4*s,2.2*s,2.2*s);c.fill();}
    };
    bodies.filter(b=>Math.sin(b.a)<0).forEach(drawBody);
    c.save();c.globalCompositeOperation='screen';soft(ox,top-4*s,60*s,60*s,[255,190,90],.35);c.restore();
    const sg=c.createRadialGradient(ox-5*s,top-9*s,0,ox,top-4*s,16*s);sg.addColorStop(0,'#fff6c8');sg.addColorStop(1,'#e08a20');
    c.fillStyle=sg;ellipse(ox,top-4*s,16*s,16*s);c.fill();
    bodies.filter(b=>Math.sin(b.a)>=0).forEach(drawBody);
  }
  function clockTime(){
    if(on(settings.realTime)){const d=now();return d.getHours()*3600+d.getMinutes()*60+d.getSeconds()+(preview?0:d.getMilliseconds()/1000);}
    return 21*3600+time*10;
  }
  function clock(){
    const pal=metal(),s=u*L.clockScale,[kx,ky]=L.clock,R=88*s,secs=clockTime();
    // Pendulum behind the glass window.
    const wy=ky+140*s,wh=Math.min(330*s,L.floorY+14*u-ky-170*s),swing=.13*Math.sin(Math.PI*time);
    c.save();c.beginPath();c.rect(kx-90*s+26*s,wy,180*s-52*s,wh);c.clip();
    c.save();c.translate(kx,wy-20*s);c.rotate(swing);
    c.fillStyle=css(pal[2]);c.fillRect(-2.5*s,0,5*s,wh-40*s);
    const bg=c.createRadialGradient(-10*s,wh-58*s,0,0,wh-48*s,32*s);bg.addColorStop(0,css(pal[0]));bg.addColorStop(1,css(pal[2]));
    c.fillStyle=bg;ellipse(0,wh-48*s,30*s,30*s);c.fill();
    c.restore();
    c.fillStyle='rgba(255,255,255,.05)';c.beginPath();c.moveTo(kx-60*s,wy);c.lineTo(kx-30*s,wy);c.lineTo(kx-70*s,wy+wh);c.lineTo(kx-90*s,wy+wh);c.fill();
    c.restore();
    // Dial.
    c.fillStyle='#efe3c4';ellipse(kx,ky,R,R);c.fill();
    c.strokeStyle='#3a2a1a';c.lineWidth=1.2*s;c.beginPath();
    for(let i=0;i<60;i++){const a=i/60*TAU,r1=R*(i%5?.9:.86);c.moveTo(kx+Math.cos(a)*r1,ky+Math.sin(a)*r1);c.lineTo(kx+Math.cos(a)*R*.95,ky+Math.sin(a)*R*.95);}c.stroke();
    c.fillStyle='#2a1c10';c.font=`600 ${R*.17}px Georgia, 'Times New Roman', serif`;c.textAlign='center';c.textBaseline='middle';
    ['XII','I','II','III','IIII','V','VI','VII','VIII','IX','X','XI'].forEach((t,i)=>{const a=i/12*TAU-Math.PI/2;c.fillText(t,kx+Math.cos(a)*R*.72,ky+Math.sin(a)*R*.72);});
    const hand=(ang,len,width,col,tail=0)=>{c.save();c.translate(kx,ky);c.rotate(ang);c.fillStyle=col;c.beginPath();c.moveTo(-width,tail);c.lineTo(0,-len);c.lineTo(width,tail);c.closePath();c.fill();c.restore();};
    const hr=(secs/3600)%12,mn=(secs/60)%60,sc=secs%60;
    hand(hr/12*TAU,R*.5,5*s,'#1b2233',10*s);hand(mn/60*TAU,R*.78,3.6*s,'#1b2233',12*s);
    c.save();c.translate(kx,ky);c.rotate(Math.floor(sc)/60*TAU);c.strokeStyle='#9a1e16';c.lineWidth=1.4*s;c.beginPath();c.moveTo(0,16*s);c.lineTo(0,-R*.86);c.stroke();c.restore();
    c.fillStyle=css(pal[1]);ellipse(kx,ky,6*s,6*s);c.fill();
    c.fillStyle='rgba(255,255,255,.08)';c.beginPath();c.ellipse(kx-R*.25,ky-R*.35,R*.55,R*.3,-.5,0,TAU);c.fill();
    // Moon-phase window and hourly automaton in the crown.
    const top=ky-170*s;
    c.save();rrect(kx-48*s,top-58*s,96*s,48*s,20*s);c.clip();
    c.fillStyle='#0d1530';c.fillRect(kx-48*s,top-58*s,96*s,48*s);
    moon(kx-22*s,top-34*s,13*s,moonPhase(),'#0d1530');
    const quarter=900,shown=secs,since=on(settings.realTime)?shown%quarter:(shown%quarter)/10,ringing=since<4.5;
    const strike=ringing?Math.max(0,Math.sin(since*Math.PI*2)):0;
    c.fillStyle=css(pal[1]);ellipse(kx+26*s,top-30*s,11*s,12*s);c.fill();c.fillRect(kx+24*s,top-48*s,4*s,8*s);
    c.fillStyle=css(pal[1]);ellipse(kx+4*s,top-38*s,5*s,5*s);c.fill();c.fillRect(kx,top-33*s,8*s,18*s);
    c.save();c.translate(kx+8*s,top-30*s);c.rotate(-.9+strike*.75);c.fillStyle=css(pal[2]);c.fillRect(0,-1.5*s,16*s,3*s);c.fillRect(13*s,-4*s,5*s,8*s);c.restore();
    c.restore();
    if(ringing&&strike>.6){c.strokeStyle=`rgba(255,230,170,${(strike-.6)*1.5})`;c.lineWidth=1.5*s;for(let k=1;k<=3;k++){c.beginPath();c.arc(kx+26*s,top-30*s,(12+k*9)*s,-.8,.8);c.stroke();}}
  }

  function draw(){
    const key=`${w}x${h}|${metalMix().toFixed(2)}`;
    if(key!==builtKey){builtKey=key;gearCache.clear();layout();buildStars();buildRoom();}
    const a=domeAngle(),shake=domeMoving()*Math.sin(time*40)*.8*u;
    c.save();c.translate(0,shake);
    const slit=sky(a);dome(a,slit);
    c.drawImage(room,0,0);
    moonbeam(a);
    gauge();gearTrain();clock();orrery();telescope(a);lamps();steam();
    c.restore();
    const dw=dawn();
    if(dw>0){c.save();c.globalCompositeOperation='screen';c.fillStyle=`rgba(255,150,90,${.12*dw})`;c.fillRect(0,0,w,h);c.restore();}
    const v=c.createRadialGradient(w*.5,h*.55,Math.min(w,h)*.3,w*.5,h*.55,Math.max(w,h)*.78);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(4,2,0,.6)');
    c.fillStyle=v;c.fillRect(0,0,w,h);
  }

  const moving=()=>!reduced.matches&&speed()>0;
  let frame=0,last=0,elapsed=0;
  const active=()=>!paused&&!document.hidden&&moving();
  function tick(now2){
    if(!active()){stop();return;}
    const dt=last?Math.min(.1,(now2-last)/1000):0;last=now2;elapsed+=dt;
    if(elapsed+1e-5>=1/clamp(fps,1,60)){time+=elapsed*speed();elapsed=0;draw();}
    frame=requestAnimationFrame(tick);
  }
  function stop(){cancelAnimationFrame(frame);frame=0;last=0;elapsed=0;}
  function start(){stop();if(active())frame=requestAnimationFrame(tick);}
  function resize(){
    const ratio=Math.min(devicePixelRatio||1,1920/Math.max(1,innerWidth),1080/Math.max(1,innerHeight));
    w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));
    builtKey='';draw();
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
