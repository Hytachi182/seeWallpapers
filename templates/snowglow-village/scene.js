/* Snowglow Village: original code-drawn Christmas scene, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), c=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  let settings={speed:1,snowfall:1,multicolor:true,train:true,sleigh:true,smoke:true,...api?.getSettings?.()};
  const num=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const speed=()=>num('speed',1,0,2);
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):12, paused=preview, fps=30;
  let w=1,h=1,u=1,L={};

  const MULTI=['#ff4d5e','#ffd166','#4dd2ff','#7cff8a','#ff9ff3'], WARM=['#ffe2a8','#ffd58a','#fff0cc'];
  const bulbColor=i=>{const set=on(settings.multicolor)?MULTI:WARM;return set[((i%set.length)+set.length)%set.length];};
  // Houses: offset from the tree in layout units, wall width/height, wall colour.
  const HOUSES=[[-860,230,190,'#7a3b3b'],[-385,250,205,'#3f5a6e'],[-175,210,250,'#6e5a3a'],[185,220,235,'#5a3f5e'],[405,255,200,'#3b6a55'],[650,210,255,'#7a5236'],[880,240,195,'#45506e']];
  const CHURCH=-620;

  function ellipse(x,y,rx,ry,rot=0){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,Math.PI*2);}
  function poly(points){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();}
  function bulb(x,y,r,color,level){
    c.globalAlpha=.16*level;c.fillStyle=color;ellipse(x,y,r*4,r*4);c.fill();
    c.globalAlpha=.35+.65*level;ellipse(x,y,r,r);c.fill();c.globalAlpha=1;
  }

  function layout(){
    const portrait=w/h<1;
    u=portrait?Math.min(w/520,h/1150):Math.min(h/1080,w/1500);
    const base=portrait?h*.8:h*.83;
    L={portrait,cx:w/2,ground:portrait?h*.68:h*.7,base,rx:270*u,ry:52*u};
  }

  function sky(){
    const g=c.createLinearGradient(0,0,0,L.ground);
    g.addColorStop(0,'#040a1c');g.addColorStop(.6,'#11214a');g.addColorStop(1,'#2d4274');
    c.fillStyle=g;c.fillRect(0,0,w,L.ground);
    for(let i=0;i<170;i++){
      const tw=.5+.5*Math.sin(time*(.7+hash(i+4)*1.8)+i*2.1),s=(1+hash(i+2)*1.4)*u;
      c.fillStyle=`rgba(230,238,255,${(.2+hash(i+6)*.7)*tw})`;c.fillRect(hash(i)*w,hash(i+1)*L.ground*.8,s,s);
    }
    const mx=L.portrait?w*.22:w*.18,my=h*.17,mr=58*u;
    const halo=c.createRadialGradient(mx,my,mr,mx,my,mr*6);halo.addColorStop(0,'rgba(200,215,255,.25)');halo.addColorStop(1,'rgba(200,215,255,0)');
    c.fillStyle=halo;c.fillRect(mx-mr*6,my-mr*6,mr*12,mr*12);
    c.fillStyle='#f3f1e6';ellipse(mx,my,mr,mr);c.fill();
    c.fillStyle='rgba(180,180,200,.3)';[[-.3,-.2,.22],[.28,.18,.15],[-.1,.4,.12],[.35,-.35,.09]].forEach(([dx,dy,r])=>{ellipse(mx+dx*mr,my+dy*mr,r*mr,r*mr);c.fill();});
    L.moon={x:mx,y:my};
  }
  function hills(){
    const layers=[[L.ground-150*u,'#4b5f8c',.003,.4],[L.ground-70*u,'#7286b2',.0045,.7]];
    layers.forEach(([y,color,f,amp],li)=>{
      c.fillStyle=color;c.beginPath();c.moveTo(0,L.ground);
      for(let x=0;x<=w+10;x+=10)c.lineTo(x,y-(Math.sin(x/u*f+li*2)*50+Math.sin(x/u*f*2.7+1)*22)*u*amp);
      c.lineTo(w,L.ground);c.closePath();c.fill();
      for(let i=0;i<34;i++){
        const x=hash(i*7+li*50)*w,hy=y-(Math.sin(x/u*f+li*2)*50+Math.sin(x/u*f*2.7+1)*22)*u*amp,s=(14+hash(i+li)*16)*u*(li?1:.7);
        c.fillStyle=li?'#1c2c4a':'#2a3a5e';poly([[x,hy-s*2.2],[x-s*.7,hy+2*u],[x+s*.7,hy+2*u]]);c.fill();
        c.fillStyle='rgba(230,238,255,.55)';poly([[x,hy-s*2.2],[x-s*.25,hy-s*1.4],[x+s*.25,hy-s*1.4]]);c.fill();
        if(hash(i+li*9)>.7){const fl=.7+.3*Math.sin(time*2+i);c.fillStyle=`rgba(255,205,120,${fl})`;c.fillRect(x+s,hy-4*u,3*u*(li?1.4:1),3*u*(li?1.4:1));}
      }
    });
  }
  function smoke(x,y,seed){
    if(!on(settings.smoke))return;
    for(let j=0;j<7;j++){
      const p=((time*.13)+j/7+hash(seed))%1,r=(8+p*26)*u;
      c.fillStyle=`rgba(200,210,235,${.13*(1-p)*Math.min(1,p*6)})`;
      ellipse(x+p*70*u+Math.sin(time*.8+j+seed)*8*u,y-p*170*u,r,r*.85);c.fill();
    }
  }
  function roofLights(points,seed){
    // Bulbs along the eaves chase forward one position at a time.
    const step=Math.floor(time*3.2);let index=0;
    for(let s=0;s<points.length-1;s++){
      const [ax,ay]=points[s],[bx,by]=points[s+1],len=Math.hypot(bx-ax,by-ay),n=Math.max(1,Math.round(len/(24*u)));
      c.strokeStyle='rgba(20,20,30,.7)';c.lineWidth=1.2*u;c.beginPath();c.moveTo(ax,ay);c.lineTo(bx,by);c.stroke();
      for(let k=0;k<n;k++,index++){
        const t=(k+.5)/n,level=((index+step)%4===0)?1:.45+.2*Math.sin(time*3+index);
        bulb(ax+(bx-ax)*t,ay+(by-ay)*t+4*u,3.4*u,bulbColor(index+seed),level);
      }
    }
  }
  function windowLight(x,y,ww,wh,seed){
    const flicker=.82+.1*Math.sin(time*7+seed*3)+.08*Math.sin(time*13.3+seed);
    const halo=c.createRadialGradient(x+ww/2,y+wh/2,0,x+ww/2,y+wh/2,ww*1.5);halo.addColorStop(0,`rgba(255,190,90,${.22*flicker})`);halo.addColorStop(1,'rgba(255,190,90,0)');
    c.fillStyle=halo;c.fillRect(x-ww,y-ww,ww*3,wh+ww*2);
    const g=c.createLinearGradient(0,y,0,y+wh);g.addColorStop(0,`rgba(255,226,150,${flicker})`);g.addColorStop(1,`rgba(255,160,70,${flicker})`);
    c.fillStyle=g;c.fillRect(x,y,ww,wh);
    c.fillStyle='#2a1a1a';c.fillRect(x+ww/2-1.5*u,y,3*u,wh);c.fillRect(x,y+wh*.45,ww,3*u);
    c.fillStyle='#f4f7ff';c.fillRect(x-4*u,y+wh,ww+8*u,6*u);
  }
  function house([dx,hw,hh,color],i){
    const x=L.cx+dx*u,bw=hw*u,bh=hh*u,top=L.ground-bh,roof=(110+hash(i)*40)*u,over=18*u,x0=x-bw/2,x1=x+bw/2;
    if(x1+over<-50||x0-over>w+50)return;
    c.fillStyle='rgba(255,190,100,.12)';ellipse(x,L.ground+30*u,bw*.8,40*u);c.fill();
    c.fillStyle=color;c.fillRect(x0,top,bw,bh);
    c.fillStyle='rgba(0,0,0,.18)';c.fillRect(x0,top,bw*.12,bh);
    const chx=x+bw*.22,chTop=top-roof*.62-40*u;
    c.fillStyle='#5b3a32';c.fillRect(chx,chTop,28*u,roof*.62+40*u);
    c.fillStyle='#eef3ff';ellipse(chx+14*u,chTop,20*u,7*u);c.fill();
    smoke(chx+14*u,chTop-6*u,i);
    c.fillStyle='#2e2433';poly([[x0-over,top+6*u],[x,top-roof],[x1+over,top+6*u]]);c.fill();
    c.fillStyle='#f2f6ff';
    poly([[x0-over-4*u,top+8*u],[x,top-roof-8*u],[x1+over+4*u,top+8*u],[x1+over-8*u,top+14*u],[x,top-roof+12*u],[x0-over+8*u,top+14*u]]);c.fill();
    for(let k=0;k<5;k++){const t=(k+.5)/5;ellipse(x0-over+(x-x0+over)*t,top+10*u-(roof+4*u)*t+6*u,9*u,6*u);c.fill();ellipse(x1+over-(x1+over-x)*t,top+10*u-(roof+4*u)*t+6*u,9*u,6*u);c.fill();}
    const cols=bw>215*u?3:2,rows=bh>220*u?2:1,ww=34*u,wh=42*u;
    for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){
      if(r===rows-1&&cols===3&&k===1)continue;
      const wx=x0+bw*(k+.5)/cols-ww/2,wy=top+30*u+r*(bh-110*u)/(rows>1?1:2);
      windowLight(wx,wy,ww,wh,i*10+r*3+k);
    }
    if(cols===3){
      const dw=40*u,dh=70*u,dxx=x-dw/2,dy=L.ground-dh;
      c.fillStyle='#4a2a22';c.fillRect(dxx,dy,dw,dh);c.fillStyle='rgba(255,200,120,.6)';c.fillRect(dxx+dw*.7,dy+dh*.5,4*u,4*u);
      c.strokeStyle='#2f6b3e';c.lineWidth=6*u;ellipse(x,dy+20*u,11*u,11*u);c.stroke();
      c.fillStyle='#d6283a';poly([[x-6*u,dy+31*u],[x+6*u,dy+31*u],[x,dy+25*u]]);c.fill();
    }
    roofLights([[x0-over,top+6*u],[x,top-roof],[x1+over,top+6*u]],i*7);
    c.fillStyle='#f2f6ff';ellipse(x,L.ground+2*u,bw*.62,9*u);c.fill();
  }
  function church(){
    const x=L.cx+CHURCH*u,bw=200*u,bh=270*u,top=L.ground-bh,x0=x-bw/2;
    if(x+bw<-50||x-bw>w+50)return;
    c.fillStyle='#5d5a70';c.fillRect(x0,top,bw,bh);
    const tw=74*u,tt=top-150*u;
    c.fillStyle='#6a6680';c.fillRect(x-tw/2,tt,tw,bh+150*u);
    c.fillStyle='#2e2a3e';poly([[x-tw/2-10*u,tt+4*u],[x,tt-150*u],[x+tw/2+10*u,tt+4*u]]);c.fill();
    c.fillStyle='#f2f6ff';poly([[x-tw/2-12*u,tt+6*u],[x,tt-152*u],[x-4*u,tt-110*u],[x-tw/2+4*u,tt+12*u]]);c.fill();
    c.strokeStyle='#d8c89a';c.lineWidth=4*u;c.beginPath();c.moveTo(x,tt-150*u);c.lineTo(x,tt-185*u);c.moveTo(x-11*u,tt-172*u);c.lineTo(x+11*u,tt-172*u);c.stroke();
    const glowLevel=.75+.15*Math.sin(time*1.3);
    c.fillStyle=`rgba(255,214,140,${glowLevel})`;c.beginPath();c.arc(x,tt+50*u,18*u,0,Math.PI*2);c.fill();
    const stained=['#ff6b6b','#ffd166','#5ec8ff','#9cff8a'];
    for(const side of [-1,1]){
      const wx=x+side*65*u-14*u,wy=top+60*u;
      for(let k=0;k<4;k++){c.fillStyle=stained[k];c.globalAlpha=.75*glowLevel;c.fillRect(wx+(k%2)*14*u,wy+Math.floor(k/2)*30*u,14*u,30*u);}
      c.globalAlpha=1;c.fillStyle='#5d5a70';c.beginPath();c.moveTo(wx,wy);c.arc(wx+14*u,wy,14*u,Math.PI,0);c.lineTo(wx+28*u,wy);c.fill();
      c.fillStyle=stained[1];c.globalAlpha=.6*glowLevel;c.beginPath();c.arc(wx+14*u,wy,12*u,Math.PI,0);c.fill();c.globalAlpha=1;
    }
    c.fillStyle='#3a2a2a';c.beginPath();c.moveTo(x-22*u,L.ground);c.lineTo(x-22*u,L.ground-55*u);c.arc(x,L.ground-55*u,22*u,Math.PI,0);c.lineTo(x+22*u,L.ground);c.fill();
    c.fillStyle='#2e2433';poly([[x0-12*u,top+4*u],[x0+bw*.25,top-60*u],[x0+bw*.25,top+4*u]]);c.fill();poly([[x0+bw+12*u,top+4*u],[x0+bw*.75,top-60*u],[x0+bw*.75,top+4*u]]);c.fill();
    c.fillStyle='#f2f6ff';c.fillRect(x0-12*u,top-2*u,bw+24*u,8*u);
    c.fillStyle='#f2f6ff';ellipse(x,L.ground+2*u,bw*.62,9*u);c.fill();
  }
  function ground(){
    const g=c.createLinearGradient(0,L.ground,0,h);g.addColorStop(0,'#b9c7e6');g.addColorStop(1,'#e3eaf8');
    c.fillStyle=g;c.fillRect(0,L.ground,w,h-L.ground);
    const pool=c.createRadialGradient(L.cx,L.base,0,L.cx,L.base,420*u);pool.addColorStop(0,'rgba(255,200,120,.35)');pool.addColorStop(1,'rgba(255,200,120,0)');
    c.fillStyle=pool;c.fillRect(L.cx-420*u,L.base-420*u,840*u,840*u);
    for(let i=0;i<90;i++){
      const x=hash(i+300)*w,y=L.ground+hash(i+301)*(h-L.ground),tw=Math.max(0,Math.sin(time*(1+hash(i)*2)+i*3));
      c.fillStyle=`rgba(255,255,255,${tw*.9})`;c.fillRect(x,y,2*u,2*u);
    }
  }
  function lampPost(x){
    if(x<-60||x>w+60)return;
    const y=L.ground+40*u,top=y-190*u;
    c.fillStyle='rgba(255,205,130,.22)';ellipse(x,y+4*u,90*u,22*u);c.fill();
    c.fillStyle='#1d2233';c.fillRect(x-4*u,top,8*u,190*u);c.fillRect(x-12*u,y-10*u,24*u,10*u);
    const g=c.createRadialGradient(x,top-16*u,0,x,top-16*u,110*u);g.addColorStop(0,'rgba(255,214,140,.55)');g.addColorStop(1,'rgba(255,214,140,0)');
    c.fillStyle=g;c.fillRect(x-110*u,top-126*u,220*u,220*u);
    c.fillStyle='#ffe1a0';c.fillRect(x-10*u,top-32*u,20*u,30*u);
    c.fillStyle='#1d2233';poly([[x-17*u,top-32*u],[x,top-48*u],[x+17*u,top-32*u]]);c.fill();c.fillRect(x-12*u,top-4*u,24*u,5*u);
    c.fillStyle='#f2f6ff';ellipse(x,top-44*u,13*u,5*u);c.fill();
    c.strokeStyle='#2f6b3e';c.lineWidth=5*u;c.beginPath();c.moveTo(x-4*u,top+30*u);c.quadraticCurveTo(x+20*u,top+44*u,x+4*u,top+70*u);c.stroke();
    c.fillStyle='#d6283a';ellipse(x+6*u,top+30*u,7*u,5*u);c.fill();
  }
  function snowman(x){
    if(x<-80||x>w+80)return;
    const y=L.ground+(L.portrait?70:60)*u,s=u;
    c.fillStyle='rgba(60,80,130,.25)';ellipse(x+10*s,y+4*s,70*s,12*s);c.fill();
    for(const [dy,r] of [[-42,48],[-112,36],[-166,26]]){
      const g=c.createRadialGradient(x-r*.4,y+dy*s-r*.4,r*.2,x,y+dy*s,r*s);g.addColorStop(0,'#ffffff');g.addColorStop(1,'#c3cfe8');
      c.fillStyle=g;ellipse(x,y+dy*s,r*s,r*s*.95);c.fill();
    }
    c.fillStyle='#1b1b24';[[-9,-172],[9,-172],[0,-125],[0,-108],[0,-91]].forEach(([dx,dy])=>{ellipse(x+dx*s,y+dy*s,3.5*s,3.5*s);c.fill();});
    c.fillStyle='#f08a2c';poly([[x,y-166*s],[x+30*s,y-161*s],[x,y-160*s]]);c.fill();
    c.strokeStyle='#5a3a26';c.lineWidth=4*s;c.lineCap='round';
    const wave=Math.sin(time*1.1)*.12;
    c.beginPath();c.moveTo(x-32*s,y-118*s);c.lineTo(x-80*s,y-150*s+wave*40*s);c.moveTo(x-64*s,y-140*s);c.lineTo(x-74*s,y-160*s);
    c.moveTo(x+32*s,y-118*s);c.lineTo(x+78*s,y-140*s);c.stroke();
    c.fillStyle='#1b1b24';c.fillRect(x-28*s,y-194*s,56*s,7*s);c.fillRect(x-18*s,y-236*s,36*s,44*s);
    c.fillStyle='#c8283a';c.fillRect(x-18*s,y-200*s,36*s,7*s);
    c.fillStyle='#d6283a';c.fillRect(x-26*s,y-146*s,52*s,12*s);
    const flap=Math.sin(time*3.1)*6*s;
    poly([[x+12*s,y-140*s],[x+24*s,y-138*s],[x+34*s+flap,y-96*s],[x+20*s+flap,y-98*s]]);c.fill();
    c.fillStyle='#f2f6ff';ellipse(x,y-195*s,30*s,4*s);c.fill();
  }
  // Toy train: boxes on a circular track seen from above, projected onto an ellipse.
  const P=(t,r,up)=>[L.cx+r*Math.cos(t),L.base+r*(L.ry/L.rx)*Math.sin(t)-up];
  function track(){
    c.strokeStyle='#4a3a35';c.lineWidth=5*u;
    for(let i=0;i<56;i++){const t=i/56*Math.PI*2;c.beginPath();c.moveTo(...P(t,L.rx-16*u,0));c.lineTo(...P(t,L.rx+16*u,0));c.stroke();}
    c.strokeStyle='#8e96a8';c.lineWidth=2.5*u;
    for(const r of [L.rx-9*u,L.rx+9*u]){ellipse(L.cx,L.base,r,r*L.ry/L.rx);c.stroke();}
  }
  function box(t,half,rIn,rOut,H,color){
    const side=Math.sin(t)>0?rOut:rIn,endT=Math.cos(t)>0?t+half:t-half;
    c.fillStyle=color[2];poly([P(endT,rIn,0),P(endT,rOut,0),P(endT,rOut,H),P(endT,rIn,H)]);c.fill();
    c.fillStyle=color[0];poly([P(t-half,side,0),P(t+half,side,0),P(t+half,side,H),P(t-half,side,H)]);c.fill();
    c.fillStyle=color[1];poly([P(t-half,rIn,H),P(t+half,rIn,H),P(t+half,rOut,H),P(t-half,rOut,H)]);c.fill();
  }
  function trainParts(){
    if(!on(settings.train))return[];
    const head=time*.42,gap=82*u/L.rx,half=36*u/L.rx,R=L.rx,parts=[];
    const colors=[['#b3202e','#d8404c','#7a1420'],['#2f6b3e','#3f8a52','#1f4a2b'],['#c99a2e','#e2b84a','#8a6a1f'],['#2c4d8a','#4068b0','#1d3460']];
    parts.push({t:head,draw:()=>{
      const t=head;
      box(t,half,R-12*u,R+12*u,26*u,['#1d1d26','#33333f','#111118']);
      box(t-half*.55,half*.42,R-13*u,R+13*u,46*u,colors[0]);
      box(t+half*.6,half*.12,R-5*u,R+5*u,48*u,['#1d1d26','#3a3a46','#111118']);
      const [lx,ly]=P(t+half,R,16*u);c.fillStyle='rgba(255,236,170,.35)';ellipse(lx,ly,22*u,16*u);c.fill();c.fillStyle='#fff3c4';ellipse(lx,ly,4*u,4*u);c.fill();
      if(on(settings.smoke))for(let j=0;j<6;j++){
        const age=j*.22+(time*1.8%.22),[sx,sy]=P(head-age*.42,R,50*u),r=(5+age*14)*u;
        c.fillStyle=`rgba(235,240,250,${.5*(1-age/1.4)})`;ellipse(sx,sy-age*60*u,r,r*.8);c.fill();
      }
    }});
    for(let k=1;k<=3;k++){
      const t=head-k*gap;
      parts.push({t,draw:()=>{
        box(t,half,R-12*u,R+12*u,30*u,colors[k]);
        if(k===2){box(t,half*.45,R-8*u,R+8*u,44*u,['#d6283a','#ff5566','#8a1420']);}
        const [wx,wy]=P(t,Math.sin(t)>0?R+12*u:R-12*u,16*u);c.fillStyle='rgba(255,226,150,.9)';ellipse(wx,wy,6*u,5*u);c.fill();
      }});
    }
    for(const p of parts)p.depth=Math.sin(p.t);
    return parts;
  }
  function presents(){
    const items=[[-120,30,'#d6283a','#ffd166'],[-70,22,'#2c4d8a','#e8eef9'],[90,34,'#2f6b3e','#d6283a'],[140,20,'#c99a2e','#2f6b3e'],[30,26,'#8a4fbf','#ffd166']];
    for(const [dx,s,col,rib] of items){
      const x=L.cx+dx*u,y=L.base+8*u,b=s*u;
      c.fillStyle=col;c.fillRect(x-b,y-b*1.6,b*2,b*1.6);c.fillStyle=rib;c.fillRect(x-b*.15,y-b*1.6,b*.3,b*1.6);c.fillRect(x-b,y-b*.95,b*2,b*.25);
      ellipse(x-b*.3,y-b*1.7,b*.3,b*.18,-.4);c.fill();ellipse(x+b*.3,y-b*1.7,b*.3,b*.18,.4);c.fill();
    }
  }
  function tree(){
    const x=L.cx,b=L.base;
    c.fillStyle='#4a2f22';c.fillRect(x-22*u,b-60*u,44*u,60*u);
    const tiers=5;
    for(let i=0;i<tiers;i++){
      const bottom=b-40*u-i*92*u,top=bottom-160*u,half=(235-i*42)*u;
      const g=c.createLinearGradient(x-half,0,x+half,0);g.addColorStop(0,'#0f3a26');g.addColorStop(.55,'#1d5a3a');g.addColorStop(1,'#123f2a');
      c.fillStyle=g;c.beginPath();c.moveTo(x,top);c.lineTo(x+half,bottom);
      for(let k=4;k>=0;k--){const sx=x-half+half*2*k/5;c.quadraticCurveTo(sx+half/5,bottom+16*u,sx,bottom);}
      c.closePath();c.fill();
      c.strokeStyle='rgba(240,246,255,.85)';c.lineWidth=5*u;c.lineCap='round';c.beginPath();c.moveTo(x+half,bottom);
      for(let k=4;k>=0;k--){const sx=x-half+half*2*k/5;c.quadraticCurveTo(sx+half/5,bottom+16*u,sx,bottom);}
      c.stroke();
    }
    for(let i=0;i<26;i++){
      const t=hash(i+40)*.9+.04,y=b-50*u-t*470*u,halfAt=(230*(1-t)+8)*u,ox=(hash(i+41)*2-1)*halfAt*.75;
      const col=['#d6283a','#ffd166','#5ec8ff','#e8eef9','#b04fd6'][i%5];
      c.fillStyle=col;ellipse(x+ox,y,9*u,9*u);c.fill();c.fillStyle='rgba(255,255,255,.7)';ellipse(x+ox-3*u,y-3*u,2.5*u,2.5*u);c.fill();
    }
    // Spiral of lights: only the half facing the viewer is drawn.
    const n=90;
    for(let k=0;k<n;k++){
      const t=k/n,phi=t*Math.PI*2*5.5,front=Math.cos(phi);if(front<-.1)continue;
      const y=b-55*u-t*455*u+front*10*u,halfAt=(228*(1-t)+6)*u,lx=x+Math.sin(phi)*halfAt;
      const level=(.5+.5*Math.sin(time*2.6+k*1.7))*(.5+.5*front);
      bulb(lx,y,3.6*u,bulbColor(k),level);
    }
    const sy=b-560*u,pulse=.85+.15*Math.sin(time*2);
    const g=c.createRadialGradient(x,sy,0,x,sy,120*u);g.addColorStop(0,`rgba(255,230,140,${.6*pulse})`);g.addColorStop(1,'rgba(255,230,140,0)');
    c.fillStyle=g;c.fillRect(x-120*u,sy-120*u,240*u,240*u);
    c.save();c.translate(x,sy);c.rotate(time*.25);c.strokeStyle=`rgba(255,240,190,${.35*pulse})`;c.lineWidth=2*u;
    for(let r=0;r<8;r++){c.rotate(Math.PI/4);c.beginPath();c.moveTo(0,30*u);c.lineTo(0,(r%2?70:95)*u);c.stroke();}
    c.restore();
    c.fillStyle='#ffd966';c.beginPath();
    for(let k=0;k<10;k++){const a=-Math.PI/2+k*Math.PI/5,r=(k%2?14:34)*u;c.lineTo(x+Math.cos(a)*r,sy+Math.sin(a)*r);}
    c.closePath();c.fill();
  }
  function reindeer(x,y,s,i,lead){
    const g=Math.sin(time*11+i*1.3);
    c.strokeStyle='#0a1124';c.fillStyle='#0a1124';c.lineWidth=3*s;c.lineCap='round';
    ellipse(x,y,22*s,9*s,-.05);c.fill();
    c.beginPath();c.moveTo(x-16*s,y-4*s);c.lineTo(x-26*s,y-16*s);c.stroke();
    ellipse(x-30*s,y-17*s,8*s,5*s,-.3);c.fill();
    c.lineWidth=1.8*s;c.beginPath();c.moveTo(x-28*s,y-21*s);c.lineTo(x-24*s,y-33*s);c.lineTo(x-30*s,y-38*s);c.moveTo(x-25*s,y-29*s);c.lineTo(x-18*s,y-34*s);c.stroke();
    c.lineWidth=2.6*s;c.beginPath();
    c.moveTo(x-14*s,y+5*s);c.lineTo(x-20*s-g*8*s,y+18*s);c.moveTo(x-8*s,y+5*s);c.lineTo(x-4*s-g*6*s,y+19*s);
    c.moveTo(x+12*s,y+5*s);c.lineTo(x+20*s+g*8*s,y+17*s);c.moveTo(x+17*s,y+4*s);c.lineTo(x+26*s+g*5*s,y+12*s);c.stroke();
    if(lead){c.fillStyle='rgba(255,60,60,.35)';ellipse(x-38*s,y-16*s,9*s,9*s);c.fill();c.fillStyle='#ff4040';ellipse(x-38*s,y-16*s,3*s,3*s);c.fill();}
  }
  function sleigh(){
    if(!on(settings.sleigh))return;
    const period=42,phase=((time/period)+.62)%1;if(phase>.32)return;
    const p=phase/.32,s=u*(L.portrait?.8:1),x=w+260*s-p*(w+700*s),y=L.moon.y+Math.sin(p*Math.PI)*h*.03+Math.sin(time*3)*4*s;
    for(let k=0;k<26;k++){
      const age=k*.012,tx=x+60*s+age*(w+700*s)/(period*.32)*period*.32,ty=y+10*s+Math.sin((p-age)*Math.PI)*0+k*.6*s;
      const tw=Math.max(0,Math.sin(time*9+k*2.3));c.fillStyle=`rgba(255,226,140,${(1-k/26)*.8*tw})`;
      ellipse(tx+hash(k)*20*s,ty+(hash(k+5)-.5)*16*s,2.2*s,2.2*s);c.fill();
    }
    const aura=c.createRadialGradient(x-80*s,y,0,x-80*s,y,260*s);aura.addColorStop(0,'rgba(170,195,255,.22)');aura.addColorStop(1,'rgba(170,195,255,0)');
    c.fillStyle=aura;c.fillRect(x-340*s,y-260*s,520*s,520*s);
    c.strokeStyle='rgba(10,17,36,.9)';c.lineWidth=1.4*s;c.beginPath();c.moveTo(x-10*s,y);c.lineTo(x-200*s,y-6*s);c.stroke();
    for(let i=0;i<4;i++)reindeer(x-70*s-Math.floor(i/2)*62*s+(i%2)*10*s,y-6*s+(i%2)*4*s,s*.85,i,i===2);
    c.fillStyle='#0a1124';c.beginPath();c.moveTo(x-10*s,y-14*s);c.quadraticCurveTo(x-6*s,y+10*s,x+30*s,y+8*s);c.lineTo(x+52*s,y-22*s);c.lineTo(x+44*s,y-2*s);c.lineTo(x+4*s,y-2*s);c.closePath();c.fill();
    c.strokeStyle='#0a1124';c.lineWidth=2.4*s;c.beginPath();c.moveTo(x-18*s,y+8*s);c.quadraticCurveTo(x-22*s,y+16*s,x-8*s,y+16*s);c.lineTo(x+46*s,y+16*s);c.stroke();
    c.fillStyle='#b81e2c';ellipse(x+22*s,y-14*s,12*s,12*s);c.fill();c.fillStyle='#f0e8e0';ellipse(x+16*s,y-22*s,6*s,6*s);c.fill();
    c.fillStyle='#b81e2c';poly([[x+12*s,y-27*s],[x+26*s,y-27*s],[x+30*s,y-40*s]]);c.fill();c.fillStyle='#f0e8e0';ellipse(x+31*s,y-40*s,3*s,3*s);c.fill();
    c.fillStyle='#5a3a26';ellipse(x+38*s,y-18*s,9*s,8*s);c.fill();
  }
  function snow(layer,count,size,fall,alpha){
    const density=num('snowfall',1,0,2),n=Math.round(count*density);
    c.fillStyle=`rgba(255,255,255,${alpha})`;
    for(let i=0;i<n;i++){
      const id=i+layer*1000,r=size*(.6+hash(id+1)*.8)*u,v=fall*(.7+hash(id+2)*.6)*u;
      const y=((hash(id+3)*(h+40*u)+time*v)%(h+40*u))-20*u;
      const x=((hash(id+4)*w+Math.sin(time*.6+id)*30*u+time*v*.15)%(w+20*u)+w+20*u)%(w+20*u)-10*u;
      ellipse(x,y,r,r);c.fill();
    }
  }
  function draw(){
    sky();sleigh();snow(0,150,1.2,40,.55);hills();
    church();HOUSES.forEach(house);
    ground();
    lampPost(L.cx-(L.portrait?210:380)*u);lampPost(L.cx+(L.portrait?210:380)*u);
    track();
    const parts=trainParts().sort((a,b)=>a.depth-b.depth);
    parts.filter(p=>p.depth<0).forEach(p=>p.draw());
    tree();presents();
    parts.filter(p=>p.depth>=0).forEach(p=>p.draw());
    if(!L.portrait)snowman(L.cx+560*u);
    snow(1,90,2.4,70,.75);snow(2,26,5,120,.5);
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
