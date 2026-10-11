/* Lofi Hideaway: original code-drawn room, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), c=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  let settings={speed:1,lampColor:'#ffb35c',catColor:'#d98a45',cat:true,rain:true,vinyl:true,steam:true,fairyLights:true,carLights:true,...api?.getSettings?.()};
  const speed=()=>Number.isFinite(Number(settings.speed))?clamp(Number(settings.speed),0,2):1;
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):8, paused=preview, fps=30;
  let w=1,h=1,u=1,L={};

  function rgb(hex,fallback){
    const m=/^#?([0-9a-f]{6})$/i.exec(String(hex||'').trim());
    const n=m?parseInt(m[1],16):fallback;return[n>>16&255,n>>8&255,n&255];
  }
  const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
  const css=(a,alpha=1)=>`rgba(${a[0]},${a[1]},${a[2]},${alpha})`;
  const NIGHT=[22,20,48], BLACK=[0,0,0], WHITE=[255,255,255];
  const lampRgb=()=>rgb(settings.lampColor,0xffb35c);
  // Everything in the room is lit by a dim blue night plus the warm lamp.
  const shade=(base,light=0)=>css(mix(mix(base,NIGHT,.45),mix(base,lampRgb(),.25),light));

  function ellipse(x,y,rx,ry,rot=0){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),rot,0,Math.PI*2);}
  function roundRect(x,y,rw,rh,r){c.beginPath();c.roundRect?c.roundRect(x,y,rw,rh,r):c.rect(x,y,rw,rh);}
  function glow(x,y,r,color,alpha){
    const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,css(color,alpha));g.addColorStop(1,css(color,0));
    c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
  }

  function layout(){
    const portrait=w/h<1;
    u=portrait?Math.min(w/620,h/1200):Math.min(h/1080,w/1500);
    const win=portrait?{x:w*.07,y:h*.07,w:w*.86,h:h*.42}:{x:w*.07,y:h*.09,w:w*.53,h:h*.5};
    const desk=portrait?h*.75:h*.74;
    L={portrait,win,sill:win.y+win.h,desk,front:desk+150*u,
      table:{x:portrait?w*.5:w*.56,y:desk+62*u},mug:{x:portrait?w*.13:w*.34,y:desk+78*u},
      lamp:{x:portrait?w*.86:w*.84,y:desk+52*u},cat:{x:portrait?w*.62:w*.44,y:win.y+win.h},
      shelf:portrait?null:{x:w*.68,y:h*.27,w:Math.min(420*u,w*.27)}};
  }

  function room(){
    const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#1b1834');g.addColorStop(1,'#120f22');
    c.fillStyle=g;c.fillRect(0,0,w,h);
    const lamp=lampRgb(),l=L.lamp;
    const warm=c.createRadialGradient(l.x,l.y-120*u,0,l.x,l.y-120*u,Math.max(w,h)*.7);
    warm.addColorStop(0,css(lamp,.34));warm.addColorStop(.35,css(lamp,.1));warm.addColorStop(1,css(lamp,0));
    c.fillStyle=warm;c.fillRect(0,0,w,h);
  }
  function outside(){
    const {x,y,w:ww,h:wh}=L.win;
    c.save();c.beginPath();c.rect(x,y,ww,wh);c.clip();
    const sky=c.createLinearGradient(0,y,0,y+wh);sky.addColorStop(0,'#0c1230');sky.addColorStop(.6,'#2a2550');sky.addColorStop(1,'#4b3160');
    c.fillStyle=sky;c.fillRect(x,y,ww,wh);
    for(let layer=0;layer<2;layer++){
      const count=layer?9:14;
      for(let i=0;i<count;i++){
        const bw=ww/count*(.8+hash(i+layer*40)*.5),bx=x+i*ww/count-bw*.1,bh=wh*(layer?.25+hash(i*3+7)*.35:.35+hash(i*5+1)*.35),by=y+wh-bh;
        c.fillStyle=layer?'#191530':'#242046';c.fillRect(bx,by,bw,bh);
        if(!layer)continue;
        for(let r=0;r<bh/(22*u)-1;r++)for(let k=0;k<bw/(18*u)-1;k++){
          const id=i*311+r*17+k*5,epoch=Math.floor(time/(14+hash(id)*30)+hash(id+2)*3);
          if(hash(id+epoch*.41)<.7)continue;
          c.fillStyle=hash(id+9)>.5?'rgba(255,200,130,.55)':'rgba(170,200,255,.45)';
          c.fillRect(bx+(8+k*18)*u,by+(10+r*22)*u,7*u,10*u);
        }
      }
    }
    // Out-of-focus city lights, as if the camera were focused on the room.
    c.globalCompositeOperation='screen';
    const colors=[[255,170,90],[255,110,140],[120,180,255],[255,220,150]];
    for(let i=0;i<26;i++){
      const bx=x+hash(i+60)*ww,by=y+wh*(.45+hash(i+61)*.55),r=(10+hash(i+62)*26)*u;
      const pulse=.6+.4*Math.sin(time*(.3+hash(i+63)*.6)+i);
      glow(bx,by,r,colors[i%colors.length],.18*pulse);
    }
    c.globalCompositeOperation='source-over';
    if(on(settings.rain)){
      c.strokeStyle='rgba(180,200,240,.18)';c.lineWidth=1.1*u;c.beginPath();
      for(let i=0;i<120;i++){
        const fall=(700+hash(i+4)*500)*u,sy=((hash(i+1)*wh+time*fall)%(wh+40*u))+y-20*u,sx=x+((hash(i+2)*ww-time*fall*.12)%ww+ww)%ww;
        c.moveTo(sx,sy);c.lineTo(sx-3*u,sy+18*u);
      }
      c.stroke();
    }
    const fog=c.createLinearGradient(0,y+wh*.55,0,y+wh);fog.addColorStop(0,'rgba(140,130,190,0)');fog.addColorStop(1,'rgba(140,130,190,.22)');
    c.fillStyle=fog;c.fillRect(x,y,ww,wh);
    if(on(settings.rain))droplets();
    c.restore();
  }
  function droplets(){
    const {x,y,w:ww,h:wh}=L.win,lamp=lampRgb();
    for(let i=0;i<46;i++){
      const period=7+hash(i+5)*9,pos=time/period+hash(i+6),cycle=Math.floor(pos),phase=pos-cycle;
      const dx=x+hash(i*13+cycle*7.3)*ww,dy0=y+hash(i*17+cycle*3.1)*wh*.7,r=(2+hash(i+cycle)*4)*u;
      const slide=phase<.55?0:((phase-.55)/.45)**2*(wh*1.1),dy=dy0+slide;
      const wobble=Math.sin(slide*.05+i)*3*u;
      if(slide>0){
        const trail=c.createLinearGradient(0,dy0,0,dy);trail.addColorStop(0,'rgba(200,215,255,0)');trail.addColorStop(1,'rgba(200,215,255,.22)');
        c.strokeStyle=trail;c.lineWidth=r*.7;c.beginPath();c.moveTo(dx,dy0);c.quadraticCurveTo(dx+wobble,(dy0+dy)/2,dx+wobble*.5,dy);c.stroke();
      }
      const fade=Math.min(1,phase*8);
      c.fillStyle=`rgba(190,205,245,${.35*fade})`;ellipse(dx+wobble*.5,dy,r,r*1.15);c.fill();
      c.fillStyle=css(lamp,.55*fade);ellipse(dx+wobble*.5+r*.35,dy-r*.4,r*.32,r*.32);c.fill();
    }
  }
  function windowFrame(){
    const {x,y,w:ww,h:wh}=L.win,f=16*u,wood=[92,62,48];
    c.fillStyle=shade(wood,.1);
    c.fillRect(x-f,y-f,ww+f*2,f);c.fillRect(x-f,y,f,wh);c.fillRect(x+ww,y,f,wh);
    c.fillRect(x+ww/2-f*.4,y,f*.8,wh);c.fillRect(x,y+wh*.48,ww,f*.7);
    c.fillStyle='rgba(255,255,255,.05)';c.fillRect(x-f,y-f,ww+f*2,2*u);
    c.fillStyle=shade([110,76,58],.35);c.fillRect(x-f*2.4,L.sill,ww+f*4.8,22*u);
    c.fillStyle=shade([70,46,36],.1);c.fillRect(x-f*2.4,L.sill+22*u,ww+f*4.8,12*u);
  }
  function carLights(){
    if(!on(settings.carLights))return;
    const period=17,phase=(time/period+.3)%1;if(phase>.22)return;
    const p=phase/.22,sweep=-w*.3+p*w*1.6,alpha=Math.sin(p*Math.PI)*.07;
    c.save();c.globalCompositeOperation='screen';c.fillStyle=`rgba(255,240,215,${alpha})`;
    c.beginPath();c.moveTo(sweep,0);c.lineTo(sweep+w*.22,0);c.lineTo(sweep+w*.05,h*.55);c.lineTo(sweep-w*.12,h*.55);c.closePath();c.fill();c.restore();
  }
  function fairyLights(){
    if(!on(settings.fairyLights))return;
    const {x,y,w:ww}=L.win,lamp=lampRgb(),x0=x-30*u,x1=x+ww+30*u,sag=40*u,n=Math.round(ww/(58*u));
    const at=t=>({x:x0+(x1-x0)*t,y:y-4*u+Math.sin(t*Math.PI)*sag+Math.sin(time*.6)*1.5*u});
    c.strokeStyle='rgba(40,34,50,.9)';c.lineWidth=1.6*u;c.beginPath();
    for(let k=0;k<=40;k++){const p=at(k/40);k?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}c.stroke();
    c.save();c.globalCompositeOperation='screen';
    for(let i=1;i<n;i++){
      const p=at(i/n),tw=.55+.45*Math.sin(time*1.4-i*.7)*Math.sin(time*.37+i*1.9);
      const tone=i%3===1?mix(lamp,[255,140,170],.5):i%3===2?mix(lamp,WHITE,.4):lamp;
      glow(p.x,p.y+6*u,26*u,tone,.35*tw);c.fillStyle=css(mix(tone,WHITE,.5),.6+.4*tw);ellipse(p.x,p.y+6*u,3.6*u,5*u);c.fill();
    }
    c.restore();
  }
  function plant(px,py,size,seed){
    const sway=Math.sin(time*.9+seed)*.05;
    c.fillStyle=shade([150,86,64],.15);c.beginPath();c.moveTo(px-34*size,py-58*size);c.lineTo(px+34*size,py-58*size);c.lineTo(px+26*size,py);c.lineTo(px-26*size,py);c.closePath();c.fill();
    c.fillStyle=shade([120,68,50],.1);c.fillRect(px-37*size,py-64*size,74*size,10*size);
    for(let i=0;i<9;i++){
      const a=-Math.PI/2+(i-4)*.32+sway*(1+i%3*.4),len=(70+hash(i+seed)*50)*size;
      c.save();c.translate(px,py-62*size);c.rotate(a+Math.PI/2);
      c.fillStyle=shade(i%2?[64,120,78]:[52,104,70],.2);
      c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-16*size,-len*.55,0,-len);c.quadraticCurveTo(16*size,-len*.55,0,0);c.fill();
      c.strokeStyle='rgba(20,40,30,.4)';c.lineWidth=1.2*size;c.beginPath();c.moveTo(0,0);c.lineTo(0,-len*.9);c.stroke();c.restore();
    }
  }
  function cat(){
    if(!on(settings.cat))return;
    const fur=rgb(settings.catColor,0xd98a45),k=u*(L.portrait?1.05:1.1),{x,y}=L.cat,lamp=lampRgb();
    const breath=1+Math.sin(time*1.55)*.035,flickPhase=(time/7.3)%1,flick=flickPhase<.06?Math.sin(flickPhase/.06*Math.PI*3)*.25:0;
    const twitch=Math.sin(time*.8)*Math.max(0,Math.sin(time*.23))**3;
    c.save();c.translate(x,y);c.scale(k,k);
    c.fillStyle='rgba(0,0,0,.35)';ellipse(0,-2,140,10);c.fill();
    const body=c.createLinearGradient(0,-110,0,0);body.addColorStop(0,shade(mix(fur,WHITE,.12),.45));body.addColorStop(1,shade(mix(fur,BLACK,.35),.1));
    c.fillStyle=body;c.save();c.translate(20,-2);c.scale(1,breath);ellipse(0,-50,118,50);c.fill();
    c.strokeStyle=shade(mix(fur,BLACK,.45),.2);c.lineWidth=7;c.lineCap='round';
    for(let i=0;i<4;i++){c.beginPath();c.arc(10+i*28,-30,52,-2.1,-1.5);c.stroke();}
    c.strokeStyle=css(lamp,.45);c.lineWidth=4;c.beginPath();c.ellipse(0,-50,116,48,0,-1.25,-.3);c.stroke();
    c.restore();
    c.strokeStyle=shade(fur,.3);c.lineWidth=22;c.lineCap='round';
    c.beginPath();c.moveTo(118,-22);c.quadraticCurveTo(70,10,-30,-2);c.quadraticCurveTo(-62,-6,-72+twitch*10,-16-twitch*10);c.stroke();
    c.strokeStyle=shade(mix(fur,WHITE,.55),.3);c.lineWidth=14;c.beginPath();c.moveTo(-66+twitch*8,-12-twitch*8);c.lineTo(-72+twitch*10,-16-twitch*10);c.stroke();
    const hy=-58-Math.sin(time*1.55)*1.5;
    c.save();c.translate(-82,hy);
    c.fillStyle=shade(fur,.35);
    c.beginPath();c.moveTo(-34,-22);c.lineTo(-30,-62);c.lineTo(-6,-36);c.closePath();c.fill();
    c.save();c.translate(18,-34);c.rotate(flick);c.beginPath();c.moveTo(-14,-2);c.lineTo(10,-28);c.lineTo(16,4);c.closePath();c.fill();c.restore();
    c.fillStyle='rgba(230,140,150,.45)';c.beginPath();c.moveTo(-28,-28);c.lineTo(-27,-50);c.lineTo(-14,-34);c.closePath();c.fill();
    const head=c.createRadialGradient(-10,-14,6,0,0,46);head.addColorStop(0,shade(mix(fur,WHITE,.18),.5));head.addColorStop(1,shade(mix(fur,BLACK,.2),.2));
    c.fillStyle=head;ellipse(0,0,44,38);c.fill();
    c.fillStyle=shade(mix(fur,WHITE,.7),.3);ellipse(-4,16,22,14);c.fill();
    c.strokeStyle='#2a1c18';c.lineWidth=2.6;c.lineCap='round';
    c.beginPath();c.arc(-18,-2,8,.25,Math.PI-.25);c.stroke();c.beginPath();c.arc(12,-2,8,.25,Math.PI-.25);c.stroke();
    c.fillStyle='#d77a86';ellipse(-3,10,4,3);c.fill();
    c.strokeStyle='rgba(255,240,220,.35)';c.lineWidth=1;
    for(const s of [-1,1]){for(let j=0;j<3;j++){c.beginPath();c.moveTo(-3+s*12,14+j*3);c.lineTo(-3+s*44,8+j*8);c.stroke();}}
    c.restore();
    c.fillStyle=shade(mix(fur,WHITE,.5),.35);ellipse(-52,-8,20,10);c.fill();ellipse(-22,-6,18,9);c.fill();
    c.restore();
    // Sleep "z" drawn from strokes, rising slowly above the head.
    c.save();c.strokeStyle='rgba(235,225,255,.5)';c.lineWidth=2*u;
    for(let i=0;i<3;i++){
      const p=((time*.12)+i/3)%1,zx=x-70*k+p*40*k+Math.sin(p*6)*8*k,zy=y-130*k-p*120*k,s=(7+p*9)*k;
      c.globalAlpha=Math.sin(p*Math.PI)*.8;c.beginPath();c.moveTo(zx-s,zy-s);c.lineTo(zx+s,zy-s);c.lineTo(zx-s,zy+s);c.lineTo(zx+s,zy+s);c.stroke();
    }
    c.restore();
  }
  function shelf(){
    const s=L.shelf;if(!s)return;
    c.fillStyle=shade([96,64,50],.45);c.fillRect(s.x,s.y,s.w,16*u);
    c.fillStyle='rgba(0,0,0,.25)';c.fillRect(s.x,s.y+16*u,s.w,10*u);
    const books=[[214,92,84],[86,120,160],[226,190,120],[110,150,110],[170,110,160],[230,150,100],[80,90,130]];
    let bx=s.x+14*u;
    for(let i=0;i<9&&bx<s.x+s.w*.62;i++){
      const bw=(18+hash(i+3)*16)*u,bh=(70+hash(i+8)*45)*u,lean=i===8?.18:0;
      c.save();c.translate(bx,s.y);c.rotate(lean);c.fillStyle=shade(books[i%books.length],.4);c.fillRect(0,-bh,bw,bh);
      c.fillStyle='rgba(255,240,210,.18)';c.fillRect(bw*.2,-bh*.8,bw*.6,3*u);c.fillRect(bw*.2,-bh*.3,bw*.6,3*u);c.restore();bx+=bw+2*u;
    }
    const px=s.x+s.w*.82,py=s.y;
    c.fillStyle=shade([200,190,180],.4);c.fillRect(px-30*u,py-50*u,60*u,50*u);
    for(let v=0;v<5;v++){
      const len=(120+hash(v+20)*170)*u,sx=px+(-24+v*12)*u;
      c.strokeStyle=shade([60,100,70],.2);c.lineWidth=2*u;c.beginPath();c.moveTo(sx,py-40*u);
      let lx=sx,ly=py;
      for(let j=1;j<=12;j++){
        const t=j/12,sway=Math.sin(time*.8+v+t*2)*14*u*t;lx=sx+sway+(v-2)*8*u*t;ly=py-30*u+len*t;c.lineTo(lx,ly);
      }
      c.stroke();
      for(let j=1;j<=12;j++){
        const t=j/12,sway=Math.sin(time*.8+v+t*2)*14*u*t,lx2=sx+sway+(v-2)*8*u*t,ly2=py-30*u+len*t;
        c.fillStyle=shade(j%2?[78,140,92]:[62,120,80],.25);ellipse(lx2+(j%2?7:-7)*u,ly2,8*u,5*u,j%2?.6:-.6);c.fill();
      }
    }
  }
  function desk(){
    const lamp=lampRgb(),top=c.createLinearGradient(0,L.desk,0,L.front);
    top.addColorStop(0,shade([120,80,58],.35));top.addColorStop(1,shade([96,62,46],.2));
    c.fillStyle=top;c.fillRect(0,L.desk,w,L.front-L.desk);
    c.fillStyle='rgba(255,230,200,.06)';for(let i=0;i<7;i++)c.fillRect(0,L.desk+(10+i*21)*u,w,1.2*u);
    c.fillStyle=shade([70,44,34],.1);c.fillRect(0,L.front,w,28*u);
    c.fillStyle='#0c0a16';c.fillRect(0,L.front+28*u,w,h);
    c.save();c.globalCompositeOperation='screen';
    const pool=c.createRadialGradient(L.lamp.x-140*u,L.desk+70*u,0,L.lamp.x-140*u,L.desk+70*u,520*u);
    pool.addColorStop(0,css(lamp,.32));pool.addColorStop(1,css(lamp,0));
    c.fillStyle=pool;c.fillRect(0,L.desk,w,L.front-L.desk);c.restore();
  }
  function mug(){
    const {x,y}=L.mug,s=u,lamp=lampRgb();
    c.fillStyle='rgba(0,0,0,.3)';ellipse(x,y+4*s,62*s,12*s);c.fill();
    c.strokeStyle=shade([210,200,190],.4);c.lineWidth=12*s;c.beginPath();c.arc(x+48*s,y-50*s,24*s,-1.2,1.2);c.stroke();
    const body=c.createLinearGradient(x-45*s,0,x+45*s,0);body.addColorStop(0,shade([200,190,185],.2));body.addColorStop(.7,shade([236,228,220],.6));body.addColorStop(1,shade([180,170,165],.3));
    c.fillStyle=body;c.beginPath();c.moveTo(x-45*s,y-96*s);c.lineTo(x-42*s,y-6*s);c.quadraticCurveTo(x,y+8*s,x+42*s,y-6*s);c.lineTo(x+45*s,y-96*s);c.closePath();c.fill();
    c.fillStyle=shade([214,96,84],.4);c.fillRect(x-44*s,y-62*s,88*s,10*s);
    c.fillStyle=shade([236,228,220],.5);ellipse(x,y-96*s,45*s,11*s);c.fill();
    c.fillStyle='#3b2318';ellipse(x,y-94*s,38*s,8*s);c.fill();
    c.fillStyle=css(lamp,.35);ellipse(x+12*s,y-95*s,10*s,2.5*s);c.fill();
    if(!on(settings.steam))return;
    c.save();c.lineCap='round';
    for(let i=0;i<3;i++){
      c.beginPath();
      for(let j=0;j<=24;j++){
        const t=j/24,yy=y-100*s-t*190*s,xx=x+(i-1)*14*s+Math.sin(t*5+time*1.3+i*2)*(8+t*20)*s;
        j?c.lineTo(xx,yy):c.moveTo(xx,yy);
      }
      const g=c.createLinearGradient(0,y-100*s,0,y-290*s);g.addColorStop(0,'rgba(240,235,255,.0)');g.addColorStop(.2,`rgba(240,235,255,${.22+.08*Math.sin(time+i)})`);g.addColorStop(1,'rgba(240,235,255,0)');
      c.strokeStyle=g;c.lineWidth=(9-i*2)*s;c.stroke();
    }
    c.restore();
  }
  function turntable(){
    const {x,y}=L.table,s=u*(L.portrait?1:1.05),lamp=lampRgb(),spin=on(settings.vinyl)?time*3.49:0;
    c.fillStyle='rgba(0,0,0,.35)';ellipse(x,y+40*s,230*s,22*s);c.fill();
    c.fillStyle=shade([70,46,36],.15);roundRect(x-210*s,y+8*s,420*s,26*s,6*s);c.fill();
    const top=c.createLinearGradient(0,y-80*s,0,y+10*s);top.addColorStop(0,shade([130,88,62],.5));top.addColorStop(1,shade([104,70,50],.3));
    c.fillStyle=top;c.beginPath();c.moveTo(x-190*s,y-82*s);c.lineTo(x+190*s,y-82*s);c.lineTo(x+210*s,y+10*s);c.lineTo(x-210*s,y+10*s);c.closePath();c.fill();
    const cx=x-36*s,cy=y-36*s;
    c.fillStyle='#1d1b22';ellipse(cx,cy+4*s,136*s,40*s);c.fill();
    c.fillStyle='#0d0c12';ellipse(cx,cy,130*s,38*s);c.fill();
    c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=1*s;
    for(let r=40;r<126;r+=9){ellipse(cx,cy,r*s,r*.29*s);c.stroke();}
    // Fixed specular arcs: the light stays put while the grooves turn beneath it.
    c.strokeStyle=css(lamp,.28);c.lineWidth=5*s;
    c.beginPath();c.ellipse(cx,cy,100*s,29*s,0,-.9,-.3);c.stroke();c.beginPath();c.ellipse(cx,cy,80*s,23*s,0,2.3,2.8);c.stroke();
    c.fillStyle=shade([214,96,84],.5);ellipse(cx,cy,34*s,10*s);c.fill();
    c.fillStyle='rgba(255,230,200,.85)';ellipse(cx+Math.cos(spin)*24*s,cy+Math.sin(spin)*7*s,4*s,1.6*s);c.fill();
    c.fillStyle='#c9c4bd';ellipse(cx,cy,3*s,1.2*s);c.fill();
    const wob=Math.sin(time*3.49)*.006;
    c.save();c.translate(x+150*s,y-62*s);
    c.fillStyle=shade([180,176,170],.5);ellipse(0,0,16*s,7*s);c.fill();
    c.rotate(2.62+wob);c.strokeStyle=shade([200,196,190],.6);c.lineWidth=4*s;c.lineCap='round';
    c.beginPath();c.moveTo(0,0);c.lineTo(150*s,0);c.lineTo(166*s,10*s);c.stroke();
    c.fillStyle='#2b2830';c.fillRect(158*s,4*s,16*s,10*s);c.restore();
    c.fillStyle=shade([180,176,170],.3);ellipse(x+170*s,y-6*s,10*s,4*s);c.fill();
    c.fillStyle=css([120,255,160],.7);ellipse(x+132*s,y-4*s,3*s,1.5*s);c.fill();
    const sleeveX=x-260*s;
    if(!L.portrait){c.save();c.translate(sleeveX,y+10*s);c.rotate(-.12);
    const art=c.createLinearGradient(-60*s,-150*s,60*s,0);art.addColorStop(0,shade([240,120,140],.4));art.addColorStop(1,shade([90,80,180],.3));
    c.fillStyle=art;c.fillRect(-70*s,-150*s,140*s,150*s);
    c.fillStyle='rgba(255,230,180,.6)';c.beginPath();c.arc(0,-85*s,30*s,Math.PI,0);c.fill();
    c.fillStyle='rgba(30,20,60,.5)';for(let i=0;i<4;i++)c.fillRect(-70*s,-80*s+i*12*s,140*s,4*s);c.restore();}
    if(!on(settings.vinyl))return;
    c.save();c.strokeStyle='rgba(255,235,210,.8)';c.fillStyle='rgba(255,235,210,.8)';c.lineWidth=2.4*s;
    for(let i=0;i<4;i++){
      const p=((time*.09)+i/4)%1,nx=cx+(-40+i*30)*s+Math.sin(p*7+i)*26*s,ny=cy-30*s-p*300*s,sz=(1+p*.4)*s;
      c.globalAlpha=Math.sin(p*Math.PI)*.75;
      ellipse(nx,ny,7*sz,5*sz,-.4);c.fill();c.beginPath();c.moveTo(nx+6*sz,ny);c.lineTo(nx+6*sz,ny-26*sz);
      if(i%2){c.lineTo(nx+24*sz,ny-30*sz);c.lineTo(nx+24*sz,ny-4*sz);c.stroke();ellipse(nx+18*sz,ny-4*sz,7*sz,5*sz,-.4);c.fill();}
      else{c.quadraticCurveTo(nx+16*sz,ny-18*sz,nx+14*sz,ny-10*sz);c.stroke();}
    }
    c.restore();
  }
  function lamp(){
    const {x,y}=L.lamp,s=u,lampC=lampRgb(),flicker=1+Math.sin(time*23)*.006+Math.sin(time*7.1)*.01;
    const metal='#2b2735';
    c.fillStyle='rgba(0,0,0,.35)';ellipse(x,y+6*s,80*s,12*s);c.fill();
    c.fillStyle=metal;ellipse(x,y,64*s,15*s);c.fill();c.fillRect(x-64*s,y-8*s,128*s,8*s);ellipse(x,y-8*s,64*s,15*s);c.fill();
    c.strokeStyle=metal;c.lineWidth=9*s;c.lineCap='round';
    const elbow={x:x+30*s,y:y-220*s},head={x:x-90*s,y:y-300*s};
    c.beginPath();c.moveTo(x,y-14*s);c.lineTo(elbow.x,elbow.y);c.lineTo(head.x,head.y);c.stroke();
    c.fillStyle='#3a3546';c.beginPath();c.arc(elbow.x,elbow.y,9*s,0,Math.PI*2);c.fill();
    c.save();c.globalCompositeOperation='screen';
    const cone=c.createLinearGradient(head.x,head.y,head.x-120*s,L.desk+60*s);cone.addColorStop(0,css(lampC,.32*flicker));cone.addColorStop(1,css(lampC,0));
    c.fillStyle=cone;c.beginPath();c.moveTo(head.x-30*s,head.y+40*s);c.lineTo(head.x+40*s,head.y+30*s);c.lineTo(head.x+60*s,L.desk+90*s);c.lineTo(head.x-330*s,L.desk+90*s);c.closePath();c.fill();
    c.restore();
    c.save();c.translate(head.x,head.y);c.rotate(.55);
    const shadeG=c.createLinearGradient(-60*s,0,60*s,0);shadeG.addColorStop(0,'#3d3550');shadeG.addColorStop(1,'#272235');
    c.fillStyle=shadeG;c.beginPath();c.moveTo(-22*s,-30*s);c.lineTo(22*s,-30*s);c.lineTo(62*s,40*s);c.lineTo(-62*s,40*s);c.closePath();c.fill();
    c.fillStyle=css(mix(lampC,WHITE,.6));ellipse(0,40*s,62*s,10*s);c.fill();c.restore();
    c.save();c.globalCompositeOperation='screen';glow(head.x-20*s,head.y+40*s,160*s,lampC,.5*flicker);c.restore();
  }
  function vignette(){
    const g=c.createRadialGradient(w*.5,h*.5,Math.min(w,h)*.35,w*.5,h*.5,Math.max(w,h)*.8);
    g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(5,3,15,.55)');c.fillStyle=g;c.fillRect(0,0,w,h);
  }
  function draw(){
    room();outside();windowFrame();carLights();fairyLights();
    plant(L.win.x+70*u,L.sill,u*.95,1);shelf();cat();
    desk();mug();turntable();lamp();vignette();
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
