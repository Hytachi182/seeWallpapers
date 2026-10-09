(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d',{alpha:false}),api=window.seeWallpaper,motion=window.seeLivingMotion;
  const background=new Image(),sovereign=new Image(),armor=new Image(),cloth=document.createElement('canvas'),g=cloth.getContext('2d');
  const banner=document.createElement('canvas'),b= banner.getContext('2d');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),params=new URLSearchParams(location.search),preview=params.has('preview');
  const on=v=>v!==false&&v!=='false',clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const random=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
  let settings={speed:1,procession:true,sovereign:true,cloth:true,banners:true,fountain:true,lights:true,petals:1,...api?.getSettings?.()};
  const speed=()=>Number.isFinite(Number(settings.speed))?clamp(Number(settings.speed),0,2):1;
  const density=()=>Number.isFinite(Number(settings.petals))?clamp(Number(settings.petals),0,2):1;
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):0,paused=preview,ready=false,fps=30,w=1,h=1,bw=1,bh=1,ox=0,oy=0;
  const X=x=>ox+x*bw,Y=y=>oy+y*bh;
  function glow(x,y,r,alpha){
    const gradient=c.createRadialGradient(X(x),Y(y),0,X(x),Y(y),bw*r);
    gradient.addColorStop(0,`rgba(255,208,116,${alpha})`);gradient.addColorStop(1,'rgba(255,201,109,0)');
    c.fillStyle=gradient;c.fillRect(X(x)-bw*r,Y(y)-bw*r,bw*r*2,bw*r*2);
  }
  function lights(){
    c.save();c.globalCompositeOperation='screen';
    [[.157,.195],[.251,.243],[.386,.363],[.566,.286],[.615,.43],[.465,.343]].forEach(([x,y],i)=>glow(x,y,.017,.10+.09*(.5+.5*Math.sin(time*.65+i))));c.restore();
  }
  function banners(){
    for(const [px,py]of[[.719,.147],[.775,.158],[.822,.175]]){
      const x=X(px),y=Y(py),width=Math.round(bw*.028),height=Math.round(bh*.13),padding=Math.ceil(width*.20)+2;
      if(banner.width!==width+padding*2||banner.height!==height){banner.width=width+padding*2;banner.height=height;}
      b.clearRect(0,0,banner.width,banner.height);
      for(let row=0;row<height;row++){
        const depth=row/height,wind=Math.sin(time*1.7-depth*5+px*13)*depth*width*.17;
        const taper=depth>.88?1-(depth-.88)*2.5:1;
        const lighting=b.createLinearGradient(padding+wind,row,padding+wind+width*taper,row);
        const depthLight=.97+.025*Math.cos(depth*Math.PI),hem=depth>.95?.92:1;
        for(let stop=0;stop<=8;stop++){
          const across=stop/8,fold=Math.cos((across-.16)*Math.PI*2+Math.sin(time*.7+px)*.18);
          const intensity=(.82+fold*.16)*depthLight*hem;
          lighting.addColorStop(across,`rgb(${Math.round(28*intensity)},${Math.round(72*intensity)},${Math.round(108*intensity)})`);
        }
        b.fillStyle=lighting;b.fillRect(padding+wind,row,width*taper,1);
        b.fillStyle='rgba(217,185,114,.78)';b.fillRect(padding+wind+width*taper-2,row,1,1);
        if(depth>.96){b.fillStyle='rgba(165,131,70,.55)';b.fillRect(padding+wind,row,width*taper,1);}
      }c.drawImage(banner,x-padding,y);
    }
  }
  function fountain(){
    const pool=[[0,.626],[.07,.616],[.21,.613],[.34,.625],[.375,.639],[.34,.66],[.11,.671],[0,.664]];
    motion.water(c,{aw:bw,ah:bh,ox,oy},background,time,pool,{strength:.7,light:'#f3f7e6'});
    c.save();c.lineCap='round';
    for(let i=0;i<7;i++){
      const left=i%2?-1:1,spread=.023+Math.floor(i/2)*.010;
      c.strokeStyle=`rgba(211,238,242,${.14+.05*Math.sin(time*2+i)})`;c.lineWidth=Math.max(.7,bw*.0009);
      c.beginPath();c.moveTo(X(.149),Y(.542));c.quadraticCurveTo(X(.149+left*spread*.3),Y(.018),X(.149+left*spread),Y(.64));c.stroke();
      for(let n=0;n<7;n++){
        const phase=(time*.45+n/7+i*.08)%1,ax=.149+2*left*spread*.3*(1-phase)*phase+left*spread*phase*phase;
        const ay=.542*(1-phase)**2+2*.018*(1-phase)*phase+.64*phase*phase;
        c.fillStyle=`rgba(236,250,251,${.48*Math.sin(phase*Math.PI)})`;
        c.beginPath();c.ellipse(X(ax),Y(ay),Math.max(.7,bw*.00075),Math.max(1,bh*.0018),0,0,Math.PI*2);c.fill();
      }
    }c.restore();
  }
  function shadow(x,y,width){
    c.save();c.translate(x,y);c.scale(1,.17);const gradient=c.createRadialGradient(0,0,0,0,0,width);
    gradient.addColorStop(0,'rgba(24,35,34,.22)');gradient.addColorStop(1,'rgba(24,35,34,0)');c.fillStyle=gradient;c.fillRect(-width,-width,width*2,width*2);c.restore();
  }
  function procession(){
    const size=Math.min(h*.27,w*.50)/360;
    for(let i=0;i<3;i++){
      const phase=(time/48+i*.12+.10)%1,x=(-.23+phase*1.55)*w,ground=h*.80,velocity=1.55*w/48;
      shadow(x,ground,size*70);window.seeRoyalGuard.draw(c,armor,window.seeKnightParts,time+i*.4,x,ground,size,velocity);
    }
  }
  function royal(){
    const [sx,sy,sw,sh]=window.seeRoyalFigure;
    const height=Math.round(Math.min(h*.48,w*.94)),width=Math.round(height*sw/sh),padding=Math.ceil(width*.06)+2;
    const x=w*(.60+Math.sin(time*.13)*(w<h?.055:.10)),ground=h*.89+Math.sin(time*4)*.5;
    shadow(x,ground,width*.42);
    if(cloth.width!==width+padding*2||cloth.height!==height){cloth.width=width+padding*2;cloth.height=height;}
    g.clearRect(0,0,cloth.width,cloth.height);const start=Math.floor(height*.60);
    g.drawImage(sovereign,sx,sy,sw,start/height*sh,padding,0,width,start);
    for(let row=start;row<height;row++){
      const depth=(row-start)/(height-start),wind=on(settings.cloth)?Math.sin(time*1.8-depth*5)*depth*depth*width*.042:0;
      g.drawImage(sovereign,sx,sy+row/height*sh,sw,sh/height,padding+wind,row,width,1);
    }
    c.drawImage(cloth,x-width*.5-padding,ground-height);
  }
  function draw(){
    if(!ready)return;c.drawImage(background,ox,oy,bw,bh);
    if(on(settings.lights))lights();if(on(settings.banners))banners();if(on(settings.fountain))fountain();
    if(on(settings.procession))procession();if(on(settings.sovereign))royal();
    motion.petals(c,{aw:w,ah:h,ox:0,oy:0},time,density(),'#d38b98');
  }
  function resize(){
    const ratio=Math.min(devicePixelRatio||1,1920/Math.max(1,innerWidth),1080/Math.max(1,innerHeight));
    w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));
    if(ready){const scale=Math.max(w/background.width,h/background.height);bw=background.width*scale;bh=background.height*scale;ox=(w-bw)*.5;oy=(h-bh)*.5;draw();}
  }
  const animation=motion.clock({active:()=>ready&&!paused&&!document.hidden&&!reduced.matches&&speed()>0,speed,fps:()=>fps,update:dt=>{time+=dt;draw();}});
  addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>animation.start());
  reduced.addEventListener?.('change',()=>{draw();animation.start();});
  api?.onSettingsChanged(value=>{settings={...settings,...value};draw();animation.start();});
  api?.onPause(()=>{paused=true;animation.stop();});api?.onResume(()=>{paused=false;animation.start();});
  api?.onPerformanceChanged(value=>{fps=clamp(Number(value)||30,1,60);animation.start();});
  const load=(image,url)=>new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Gilded Court asset failed to load'));image.src=url;});
  Promise.all([load(background,'background.jpg'),load(sovereign,'sovereign.png'),load(armor,'armor.png')]).then(()=>{ready=true;resize();canvas.dataset.ready='true';animation.start();}).catch(error=>console.error(error.message));
  resize();
})();
