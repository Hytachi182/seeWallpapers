/* Midnight Drive: original code-drawn coupe and city, no external assets or network requests. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), c=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search), preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), on=v=>v!==false&&v!=='false'&&v!==0;
  const hash=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  let settings={color:'#c8102e',speed:1,night:false,traffic:true,headlights:true,lightTrails:true,reflections:true,rain:false,...api?.getSettings?.()};
  const speed=()=>Number.isFinite(Number(settings.speed))?clamp(Number(settings.speed),0,2):1;
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):12, paused=preview, fps=30;
  let w=1,h=1,u=1;

  // Colour helpers keep the paint setting coherent with sky and shading.
  function rgb(hex){
    const m=/^#?([0-9a-f]{6})$/i.exec(String(hex||'').trim());
    const n=m?parseInt(m[1],16):0xc8102e;return[n>>16&255,n>>8&255,n&255];
  }
  const mix=(a,b,t)=>a.map((v,i)=>Math.round(v+(b[i]-v)*t));
  const css=(a,alpha=1)=>`rgba(${a[0]},${a[1]},${a[2]},${alpha})`;
  const WHITE=[255,255,255], BLACK=[0,0,0];

  const PALETTES={
    dusk:{sky:['#1b1240','#4a2668','#c4506a','#ffad6e'],horizon:[255,173,110],mountain:'#3b1f4f',far:'#55305f',near:'#2a1838',
      windows:['#ffcf8a','#ffb366','#fff1c9'],lamp:[255,196,120],road:['#251a2c','#0d0a12'],barrier:'#33263d'},
    night:{sky:['#03050d','#081128','#14214a','#2c3f74'],horizon:[86,118,190],mountain:'#0b142c',far:'#111c3a',near:'#0a1124',
      windows:['#ffd48f','#9fd0ff','#e9f2ff'],lamp:[214,228,255],road:['#14161f','#07080c'],barrier:'#1c2030'}
  };
  const TRAFFIC=['#1f2a44','#e8e4dc','#2d2d33','#5a6b7a','#c9a227','#244c3c','#7a1f2b'];

  // Layout measured in viewport fractions so landscape and portrait both frame the car.
  const L=()=>({horizon:h*.58,barrier:h*.635,road:h*.668,lane:h*.752,dash:h*.80,ground:h*.885,edge:h*.94});
  const scroll=()=>time*2400*u;
  const carScale=()=>Math.min(w*.86,h*.78)/460;
  const lift=t=>(Math.sin(t*7.3)*1.1+Math.sin(t*13.1+1)*.55+Math.max(0,Math.sin(t*1.9))**24*2.2);

  function sky(p,g){
    const grad=c.createLinearGradient(0,0,0,g.horizon);
    grad.addColorStop(0,p.sky[0]);grad.addColorStop(.42,p.sky[1]);grad.addColorStop(.8,p.sky[2]);grad.addColorStop(1,p.sky[3]);
    c.fillStyle=grad;c.fillRect(0,0,w,g.barrier+2);
    if(on(settings.night)){
      for(let i=0;i<150;i++){
        const x=hash(i+3)*w,y=hash(i+71)*g.horizon*.82,tw=.55+.45*Math.sin(time*(.6+hash(i+9)*1.5)+i);
        c.fillStyle=`rgba(225,235,255,${(.25+hash(i+17)*.6)*tw})`;c.fillRect(x,y,1.6*u+hash(i)*u,1.6*u+hash(i)*u);
      }
      const mx=w*.78,my=h*.16,mr=34*u;
      const glow=c.createRadialGradient(mx,my,mr*.6,mx,my,mr*6);
      glow.addColorStop(0,'rgba(190,210,255,.28)');glow.addColorStop(1,'rgba(190,210,255,0)');
      c.fillStyle=glow;c.fillRect(mx-mr*6,my-mr*6,mr*12,mr*12);
      c.fillStyle='#eef2ff';c.beginPath();c.arc(mx,my,mr,0,Math.PI*2);c.fill();
      c.fillStyle='rgba(150,165,200,.35)';
      [[-.3,-.2,.22],[.25,.15,.16],[-.05,.38,.12]].forEach(([dx,dy,r])=>{c.beginPath();c.arc(mx+dx*mr,my+dy*mr,r*mr,0,Math.PI*2);c.fill();});
    } else {
      const sx=w*.7,sy=g.horizon-150*u,sr=105*u;
      const glow=c.createRadialGradient(sx,sy,sr*.4,sx,sy,sr*7);
      glow.addColorStop(0,'rgba(255,214,150,.55)');glow.addColorStop(.35,'rgba(255,140,110,.18)');glow.addColorStop(1,'rgba(255,120,110,0)');
      c.fillStyle=glow;c.fillRect(0,0,w,g.barrier);
      const disc=c.createLinearGradient(0,sy-sr,0,sy);disc.addColorStop(0,'#fff0c2');disc.addColorStop(1,'#ff9a62');
      c.fillStyle=disc;c.beginPath();c.arc(sx,sy,sr,Math.PI,0);c.fill();
      // Retro scan gaps across the lower half of the sun.
      c.fillStyle=p.sky[2];
      for(let k=0;k<6;k++){const y=sy-sr*.5+k*sr*.09;c.fillRect(sx-sr,y,sr*2,(1.5+k*1.3)*u);}
      for(let i=0;i<5;i++){
        const x=((hash(i+40)*w*1.4-time*(6+i*2)*u)%(w*1.4)+w*1.4)%(w*1.4)-w*.2,y=h*(.1+hash(i+50)*.3);
        c.fillStyle=`rgba(255,190,170,${.05+hash(i)*.05})`;
        c.beginPath();c.ellipse(x,y,(160+hash(i+5)*220)*u,(6+hash(i+8)*8)*u,0,0,Math.PI*2);c.fill();
      }
    }
  }
  function mountains(p,g){
    const off=scroll()*.012;c.fillStyle=p.mountain;c.beginPath();c.moveTo(0,g.barrier);
    for(let x=0;x<=w+8;x+=8){
      const X=(x+off)/u;
      c.lineTo(x,g.horizon-(46+34*Math.sin(X*.0042)+20*Math.sin(X*.011+1)+8*Math.sin(X*.031))*u);
    }
    c.lineTo(w,g.barrier);c.closePath();c.fill();
  }
  function skyline(p,g,factor,slot,minH,maxH,color,windows){
    const off=scroll()*factor,first=Math.floor(off/slot)-1,last=Math.ceil((off+w)/slot)+1;
    for(let i=first;i<=last;i++){
      const bw=slot*(.7+hash(i*3.1)*.28),bh=(minH+(maxH-minH)*hash(i*7.7)**1.4)*u,x=i*slot-off,top=g.barrier-bh;
      c.fillStyle=color;c.fillRect(x,top,bw,bh);
      if(hash(i*5.3)>.6){c.fillRect(x+bw*.42,top-18*u,bw*.16,18*u);}
      if(!windows)continue;
      if(hash(i*9.1)>.82){
        const blink=Math.sin(time*2.4+i)>.4?1:.25;c.fillStyle=`rgba(255,60,70,${blink})`;
        c.beginPath();c.arc(x+bw*.5,top-(hash(i*5.3)>.6?20:3)*u,2.6*u,0,Math.PI*2);c.fill();
      }
      const cols=Math.max(1,Math.floor((bw-10*u)/(13*u))),rows=Math.floor((bh-14*u)/(19*u));
      const tone=p.windows[Math.floor(hash(i*2.9)*p.windows.length)];c.fillStyle=tone;
      for(let r=0;r<rows;r++)for(let k=0;k<cols;k++){
        const id=i*977+r*31+k*7,epoch=Math.floor(time/(9+hash(id)*20)+hash(id+1)*5);
        if(hash(id+epoch*.37)<.64)continue;
        c.globalAlpha=.45+hash(id+3)*.5;c.fillRect(x+6*u+k*13*u,top+10*u+r*19*u,6*u,9*u);
      }
      c.globalAlpha=1;
    }
  }
  function haze(p,g){
    const grad=c.createLinearGradient(0,g.horizon-160*u,0,g.barrier);
    grad.addColorStop(0,css(p.horizon,0));grad.addColorStop(1,css(p.horizon,on(settings.night)?.22:.38));
    c.fillStyle=grad;c.fillRect(0,g.horizon-160*u,w,g.barrier-g.horizon+160*u);
  }
  // Broken horizontal glints read as light on wet asphalt rather than a solid smear.
  function ripple(x,top,bottom,color,alpha,width,seed){
    const rows=Math.max(6,Math.round((bottom-top)/(5*u)));
    for(let k=0;k<rows;k++){
      const f=k/rows,y=top+f*(bottom-top),n=Math.sin(time*4.1+k*1.3+seed)*.5+Math.sin(time*2.3-k*.7+seed*2)*.5;
      const half=width*(.35+f*.9)*(.65+.35*n);
      c.fillStyle=css(color,alpha*(1-f)**1.3*(.55+.45*Math.abs(n)));
      c.fillRect(x-half+n*3*u,y,half*2,1.6*u);
    }
  }
  function lamps(g){
    const sp=520*u,off=scroll()*.62,first=Math.floor(off/sp)-1,last=Math.ceil((off+w)/sp)+1,list=[];
    for(let i=first;i<=last;i++){const x=i*sp-off;list.push({x,lx:x+58*u,ly:h*.30+14*u});}
    return list;
  }
  function road(p,g,lampList){
    c.fillStyle=p.barrier;c.fillRect(0,g.barrier,w,g.road-g.barrier);
    c.fillStyle='rgba(255,255,255,.07)';c.fillRect(0,g.barrier,w,2*u);
    const joint=120*u,jo=(scroll()*.62)%joint;c.fillStyle='rgba(0,0,0,.28)';
    for(let x=-jo;x<w;x+=joint)c.fillRect(x,g.barrier,2*u,g.road-g.barrier);
    const grad=c.createLinearGradient(0,g.road,0,h);grad.addColorStop(0,p.road[0]);grad.addColorStop(1,p.road[1]);
    c.fillStyle=grad;c.fillRect(0,g.road,w,h-g.road);
    // Light pools and wet streak reflections under each lamp.
    c.save();c.globalCompositeOperation='screen';
    for(const l of lampList){
      const pool=c.createRadialGradient(l.lx,g.lane,0,l.lx,g.lane,170*u);
      pool.addColorStop(0,css(p.lamp,.16));pool.addColorStop(1,css(p.lamp,0));
      c.fillStyle=pool;c.beginPath();c.ellipse(l.lx,g.lane,240*u,60*u,0,0,Math.PI*2);c.fill();
      if(on(settings.reflections)){
        ripple(l.lx,g.road+4*u,g.edge,p.lamp,.38,9*u,l.x*.01);
      }
    }
    c.restore();
    c.fillStyle='rgba(235,225,200,.35)';c.fillRect(0,g.road+6*u,w,2.5*u);
    const dash=400*u,dl=190*u,doff=(scroll()*.9)%dash;
    c.fillStyle='rgba(245,236,214,.75)';
    for(let x=-doff;x<w;x+=dash)c.fillRect(x,g.dash,dl,5*u);
    c.fillStyle='rgba(245,236,214,.55)';c.fillRect(0,g.edge,w,5*u);
  }
  function lampPosts(p,g,lampList){
    for(const l of lampList){
      c.strokeStyle='#17121f';c.lineWidth=7*u;c.lineCap='round';
      c.beginPath();c.moveTo(l.x,g.barrier+2*u);c.lineTo(l.x,l.ly+30*u);c.quadraticCurveTo(l.x,l.ly,l.lx-10*u,l.ly);c.stroke();
      c.fillStyle='#17121f';c.fillRect(l.lx-26*u,l.ly-5*u,40*u,9*u);
      c.save();c.globalCompositeOperation='screen';
      const cone=c.createLinearGradient(0,l.ly,0,g.lane);cone.addColorStop(0,css(p.lamp,.22));cone.addColorStop(1,css(p.lamp,0));
      c.fillStyle=cone;c.beginPath();c.moveTo(l.lx-18*u,l.ly+4*u);c.lineTo(l.lx+10*u,l.ly+4*u);
      c.lineTo(l.lx+150*u,g.lane);c.lineTo(l.lx-170*u,g.lane);c.closePath();c.fill();
      const glow=c.createRadialGradient(l.lx-6*u,l.ly+5*u,0,l.lx-6*u,l.ly+5*u,60*u);
      glow.addColorStop(0,css(mix(p.lamp,WHITE,.6),.95));glow.addColorStop(.2,css(p.lamp,.45));glow.addColorStop(1,css(p.lamp,0));
      c.fillStyle=glow;c.fillRect(l.lx-66*u,l.ly-55*u,120*u,120*u);c.restore();
    }
  }

  // Side profile of an original fastback coupe; front faces right. Units: 460 long, ground at y=0.
  function bodyPath(){
    c.beginPath();c.moveTo(22,-22);c.quadraticCurveTo(4,-24,2,-40);c.lineTo(0,-70);c.quadraticCurveTo(2,-84,14,-88);
    c.lineTo(58,-92);c.bezierCurveTo(110,-100,150,-122,200,-126);c.quadraticCurveTo(236,-128,262,-120);
    c.bezierCurveTo(290,-104,312,-90,340,-84);c.bezierCurveTo(390,-78,430,-70,452,-60);c.quadraticCurveTo(462,-56,460,-44);
    c.quadraticCurveTo(458,-26,440,-22);c.lineTo(412.1,-22);c.arc(365,-44,52,.437,Math.PI-.437,true);
    c.lineTo(142.1,-22);c.arc(95,-44,52,.437,Math.PI-.437,true);c.closePath();
  }
  function windowPath(){
    c.beginPath();c.moveTo(74,-94);c.bezierCurveTo(122,-102,160,-117,203,-120);c.quadraticCurveTo(236,-122,256,-115);
    c.bezierCurveTo(280,-102,300,-93,324,-88);c.lineTo(80,-91);c.closePath();
  }
  function wheel(x,angle,main,blur){
    c.save();c.translate(x,-44);
    c.fillStyle='#0b0b0e';c.beginPath();c.arc(0,0,42,0,Math.PI*2);c.fill();
    c.strokeStyle='rgba(255,255,255,.06)';c.lineWidth=2;c.beginPath();c.arc(0,0,38,0,Math.PI*2);c.stroke();
    const rim=c.createRadialGradient(-6,-8,2,0,0,29);rim.addColorStop(0,'#c9ccd4');rim.addColorStop(.7,'#6c707b');rim.addColorStop(1,'#2c2e35');
    c.fillStyle=rim;c.beginPath();c.arc(0,0,29,0,Math.PI*2);c.fill();
    c.fillStyle='#16171c';c.beginPath();c.arc(0,0,25,0,Math.PI*2);c.fill();
    if(main){c.fillStyle='#b8202a';c.beginPath();c.arc(0,0,19,-2.5,-1.2);c.lineTo(0,0);c.fill();}
    // Several faded copies approximate motion blur instead of strobing spokes.
    const copies=blur>.25?4:1;
    for(let k=0;k<copies;k++){
      c.globalAlpha=copies>1?.38:1;c.save();c.rotate(angle-k*Math.min(blur,1.2)/copies);c.fillStyle='#a9adb7';
      for(let s=0;s<5;s++){c.rotate(Math.PI*2/5);c.beginPath();c.moveTo(-3.5,-5);c.lineTo(-2.2,-26);c.lineTo(2.2,-26);c.lineTo(3.5,-5);c.closePath();c.fill();}
      c.restore();
    }
    c.globalAlpha=1;c.fillStyle='#55585f';c.beginPath();c.arc(0,0,5,0,Math.PI*2);c.fill();c.restore();
  }
  function car(x0,gy,sc,paint,o){
    const p=o.palette,dark=mix(paint,BLACK,.62);
    c.save();c.translate(x0,gy);c.scale(sc,sc);
    const shadow=c.createRadialGradient(230,0,10,230,0,250);shadow.addColorStop(0,'rgba(0,0,0,.7)');shadow.addColorStop(1,'rgba(0,0,0,0)');
    c.fillStyle=shadow;c.save();c.scale(1,.06);c.beginPath();c.arc(230,0,250,0,Math.PI*2);c.fill();c.restore();
    c.save();c.translate(0,o.lift);
    c.save();c.beginPath();c.rect(-10,-140,480,118);c.clip();c.fillStyle='#050507';
    for(const x of [95,365]){c.beginPath();c.arc(x,-44,50,0,Math.PI*2);c.fill();}
    c.restore();c.restore();
    wheel(95,o.angle,o.main,o.blur);wheel(365,o.angle,o.main,o.blur);
    c.translate(0,o.lift);
    bodyPath();
    const g=c.createLinearGradient(0,-128,0,-22);
    g.addColorStop(0,css(mix(paint,WHITE,.42)));g.addColorStop(.22,css(mix(paint,p.horizon,.3)));g.addColorStop(.42,css(paint));
    g.addColorStop(.53,css(mix(paint,WHITE,.28)));g.addColorStop(.6,css(mix(paint,BLACK,.15)));g.addColorStop(1,css(dark));
    c.fillStyle=g;c.fill();
    c.save();bodyPath();c.clip();
    // Horizon reflected along the shoulder line, then streetlights sliding across the panels.
    const band=c.createLinearGradient(0,-78,0,-62);band.addColorStop(0,css(p.horizon,0));band.addColorStop(.5,css(p.horizon,.35));band.addColorStop(1,css(p.horizon,0));
    c.fillStyle=band;c.fillRect(0,-78,460,16);
    if(o.main&&on(settings.reflections)){
      c.globalCompositeOperation='screen';
      for(const l of o.lamps){
        const lx=(l.lx-x0)/sc;if(lx<-80||lx>540)continue;
        const hl=c.createLinearGradient(lx-40,0,lx+40,0);
        hl.addColorStop(0,css(p.lamp,0));hl.addColorStop(.5,css(mix(p.lamp,WHITE,.5),.55));hl.addColorStop(1,css(p.lamp,0));
        c.fillStyle=hl;c.beginPath();c.moveTo(lx-30,-130);c.lineTo(lx+40,-130);c.lineTo(lx+10,-20);c.lineTo(lx-60,-20);c.closePath();c.fill();
      }
      c.globalCompositeOperation='source-over';
    }
    c.strokeStyle=css(mix(paint,WHITE,.45),.55);c.lineWidth=1.4;
    c.beginPath();c.moveTo(30,-70);c.bezierCurveTo(140,-74,300,-72,440,-62);c.stroke();
    c.strokeStyle=css(BLACK,.45);c.lineWidth=1.2;
    c.beginPath();c.moveTo(206,-88);c.lineTo(214,-30);c.moveTo(312,-86);c.quadraticCurveTo(318,-56,316,-30);c.stroke();
    c.restore();
    c.fillStyle='#0a0a0d';c.beginPath();c.moveTo(152,-30);c.lineTo(318,-30);c.lineTo(316,-22);c.lineTo(146,-22);c.closePath();c.fill();
    c.fillStyle=css(mix(paint,BLACK,.75));
    c.beginPath();c.moveTo(150,-62);c.quadraticCurveTo(170,-66,192,-60);c.lineTo(188,-46);c.quadraticCurveTo(168,-44,154,-50);c.closePath();c.fill();
    windowPath();
    const glass=c.createLinearGradient(0,-122,0,-88);glass.addColorStop(0,css(mix(p.horizon,BLACK,.35)));glass.addColorStop(.5,'#141320');glass.addColorStop(1,'#07070b');
    c.fillStyle=glass;c.fill();
    c.save();windowPath();c.clip();c.fillStyle=css(p.horizon,.18);
    c.beginPath();c.moveTo(150,-130);c.lineTo(175,-130);c.lineTo(140,-80);c.lineTo(115,-80);c.closePath();c.fill();
    c.fillStyle='rgba(0,0,0,.85)';c.fillRect(204,-130,7,50);c.restore();
    c.fillStyle=css(dark);c.beginPath();c.moveTo(304,-92);c.quadraticCurveTo(300,-104,316,-104);c.lineTo(322,-94);c.closePath();c.fill();
    c.fillStyle='#1a1a20';c.beginPath();c.moveTo(4,-88);c.lineTo(24,-96);c.lineTo(46,-96);c.lineTo(52,-92);c.closePath();c.fill();
    c.fillStyle='#ff2738';c.fillRect(1,-82,18,5);
    c.fillStyle='#eef6ff';c.beginPath();c.moveTo(426,-68);c.lineTo(454,-61);c.lineTo(456,-56);c.lineTo(430,-61);c.closePath();c.fill();
    c.fillStyle='#08080b';c.fillRect(436,-40,18,6);
    c.globalCompositeOperation='screen';
    const tail=c.createRadialGradient(6,-79,0,6,-79,o.main?60:22);tail.addColorStop(0,'rgba(255,60,70,.9)');tail.addColorStop(1,'rgba(255,30,40,0)');
    c.fillStyle=tail;c.fillRect(-60,-140,130,120);
    const head=c.createRadialGradient(452,-60,0,452,-60,o.main?50:18);head.addColorStop(0,'rgba(235,245,255,.95)');head.addColorStop(1,'rgba(200,225,255,0)');
    c.fillStyle=head;c.fillRect(400,-110,110,100);
    c.restore();
  }
  function traffic(p,g,lampList){
    const sc=carScale()*.55,len=460*sc,span=w+len*2.4;
    for(let i=0;i<3;i++){
      const faster=i===2, rel=faster?.55:(.45+hash(i+1)*.3), vel=2400*u*.8*rel;
      const pos=time*vel+hash(i+11)*span, cycle=Math.floor(pos/span), along=pos-cycle*span;
      if(hash(cycle*13+i)<.25)continue;
      const x=faster?-len*1.2+along:w+len*.2-along;
      const color=rgb(TRAFFIC[Math.floor(hash(cycle*7+i*3)*TRAFFIC.length)]);
      car(x,g.lane,sc,mix(color,p.horizon,.12),{palette:p,main:false,angle:-pos/(40*sc)*(faster?1.6:.45),blur:.6,lift:lift(time+i*3)*.4,lamps:lampList});
      if(on(settings.reflections)){
        c.save();c.globalCompositeOperation='screen';
        ripple(x+6*sc,g.lane+3*u,g.lane+(h-g.lane)*.3,[255,40,55],.3,6*u,i);
        ripple(x+452*sc,g.lane+3*u,g.lane+(h-g.lane)*.3,[220,235,255],.22,6*u,i+4);c.restore();
      }
    }
  }
  function beams(p,g,x0,sc,dy){
    const hx=x0+452*sc,hy=g.ground+(-60+dy)*sc;
    c.save();c.globalCompositeOperation='screen';
    const grad=c.createLinearGradient(hx,0,hx+w*.6,0);grad.addColorStop(0,'rgba(225,238,255,.38)');grad.addColorStop(1,'rgba(225,238,255,0)');
    c.fillStyle=grad;c.beginPath();c.moveTo(hx,hy-3*sc);c.lineTo(hx+w*.7,hy-70*sc);c.lineTo(hx+w*.7,g.ground+30*sc);c.lineTo(hx,hy+4*sc);c.closePath();c.fill();
    const pool=c.createRadialGradient(hx+230*sc,g.ground,0,hx+230*sc,g.ground,260*sc);pool.addColorStop(0,'rgba(225,238,255,.22)');pool.addColorStop(1,'rgba(225,238,255,0)');
    c.fillStyle=pool;c.beginPath();c.ellipse(hx+230*sc,g.ground,280*sc,24*sc,0,0,Math.PI*2);c.fill();c.restore();
  }
  function trails(g,x0,sc){
    c.save();c.globalCompositeOperation='screen';c.lineCap='round';
    const tx=x0+6*sc,length=Math.min(w*.55,x0+20*sc),steps=36;
    for(const [width,alpha] of [[22,.1],[8,.4],[3,.9]]){
      c.lineWidth=width*sc*.5;
      for(let k=0;k<steps;k++){
        const a=tx-k*length/steps,b=tx-(k+1)*length/steps;
        const ya=g.ground+(-79+lift(time-k*.012))*sc,yb=g.ground+(-79+lift(time-(k+1)*.012))*sc;
        c.strokeStyle=`rgba(255,${40+k},${55+k},${alpha*(1-k/steps)**1.4})`;
        c.beginPath();c.moveTo(a,ya);c.lineTo(b,yb);c.stroke();
      }
    }
    c.restore();
  }
  function foreground(g){
    const sp=260*u,off=(scroll()*1.55)%sp,top=g.edge+16*u;
    c.fillStyle='#0b0910';c.fillRect(0,top+10*u,w,h-top);
    c.fillStyle='#2a2532';c.fillRect(0,top,w,13*u);c.fillStyle='rgba(255,255,255,.12)';c.fillRect(0,top,w,2*u);
    c.fillStyle='rgba(20,17,26,.85)';
    for(let x=-off;x<w+sp;x+=sp){c.fillRect(x,top-4*u,26*u,h-top+4*u);c.fillStyle='rgba(20,17,26,.35)';c.fillRect(x-30*u,top-4*u,86*u,h-top+4*u);c.fillStyle='rgba(20,17,26,.85)';}
  }
  function rain(g){
    c.save();c.strokeStyle='rgba(200,215,240,.35)';c.lineWidth=1.3*u;c.beginPath();
    for(let i=0;i<220;i++){
      const fall=(1100+hash(i+5)*700)*u,y=((hash(i+1)*h+time*fall)%(h+60*u))-30*u;
      const x=((hash(i+2)*w*1.3-time*fall*.45)%(w*1.3)+w*1.3)%(w*1.3)-w*.15;
      c.moveTo(x,y);c.lineTo(x-12*u,y+26*u);
    }
    c.stroke();c.fillStyle='rgba(210,225,250,.3)';
    for(let i=0;i<40;i++){
      const phase=(time*2.2+hash(i+90))%1,y=g.road+hash(i+91)*(h-g.road);
      const x=((hash(i+92)*w-scroll()*.9*(y/h))%w+w)%w;
      c.beginPath();c.ellipse(x,y,(2+phase*9)*u,(.8+phase*2)*u,0,0,Math.PI*2);c.globalAlpha=1-phase;c.fill();
    }
    c.restore();
  }
  function draw(){
    const p=on(settings.night)?PALETTES.night:PALETTES.dusk,g=L(),paint=rgb(settings.color);
    sky(p,g);mountains(p,g);
    skyline(p,g,.03,46*u,60,210,p.far,false);haze(p,g);
    skyline(p,g,.075,84*u,90,390,p.near,true);
    const lampList=lamps(g);
    road(p,g,lampList);lampPosts(p,g,lampList);
    if(on(settings.traffic))traffic(p,g,lampList);
    const sc=carScale(),x0=w*.5-230*sc,dy=lift(time)*speed()**.5;
    if(on(settings.lightTrails))trails(g,x0,sc);
    if(on(settings.headlights))beams(p,g,x0,sc,dy);
    const rotPerFrame=2400*u/(40*sc)/fps*speed();
    car(x0,g.ground,sc,paint,{palette:p,main:true,angle:scroll()/(40*sc),blur:moving()?rotPerFrame:0,lift:dy,lamps:lampList});
    if(on(settings.reflections)){
      c.save();c.globalCompositeOperation='screen';
      ripple(x0+8*sc,g.ground+3*u,g.edge+10*u,[255,40,55],.45,12*sc,1.7);
      ripple(x0+452*sc,g.ground+3*u,g.edge+10*u,[225,238,255],.4,14*sc,4.2);c.restore();
    }
    foreground(g);
    if(on(settings.rain))rain(g);
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
    u=Math.min(h/1080,w/600);draw();
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
