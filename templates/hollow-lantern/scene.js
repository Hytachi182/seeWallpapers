(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d',{alpha:false}),api=window.seeWallpaper,motion=window.seeLivingMotion;
  const background=new Image(),ghost=new Image(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const cloth=document.createElement('canvas'),clothContext=cloth.getContext('2d');
  const params=new URLSearchParams(location.search),preview=params.has('preview'),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const on=v=>v!==false&&v!=='false';
  const random=i=>{const k=Math.sin(i*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  let settings={speed:1,ghost:true,bats:true,pumpkins:true,mist:true,leaves:true,...api?.getSettings?.()};
  const speed=()=>Number.isFinite(Number(settings.speed))?clamp(Number(settings.speed),0,2):1;
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):0,paused=preview,ready=false,fps=30,w=1,h=1,bw=1,bh=1,ox=0,oy=0;
  const X=x=>ox+x*bw,Y=y=>oy+y*bh;
  function glow(x,y,r,alpha){
    const gradient=c.createRadialGradient(X(x),Y(y),0,X(x),Y(y),bw*r);
    gradient.addColorStop(0,`rgba(255,157,55,${alpha})`);gradient.addColorStop(.3,`rgba(246,121,40,${alpha*.28})`);gradient.addColorStop(1,'rgba(245,116,40,0)');
    c.fillStyle=gradient;c.fillRect(X(x)-bw*r,Y(y)-bw*r,bw*r*2,bw*r*2);
  }
  function pumpkins(){
    c.save();c.globalCompositeOperation='screen';
    const spots=[[.099,.807,.035],[.19,.832,.015],[.866,.832,.038]];
    spots.forEach(([x,y,r],i)=>{const pulse=.24+.07*Math.sin(time*5.2+i)+.04*Math.sin(time*8.7+i*3);glow(x,y,r,pulse);glow(x,y+.035,r*2.2,pulse*.22);});
    c.restore();
  }
  function bats(){
    c.save();c.fillStyle='#171323';
    for(let i=0;i<7;i++){
      const phase=(time*(.027+random(i+20)*.012)+random(i+2))%1;
      const x=(-.15+phase*1.3)*w,y=(.15+random(i+44)*.24)*h+Math.sin(time*.7+i)*h*.025;
      const size=Math.max(5,Math.min(w,h)*(.010+random(i+33)*.007)),flap=Math.sin(time*(6.2+random(i))+i)*size*.5;
      c.save();c.translate(x,y);c.rotate(Math.sin(time*.5+i)*.07);
      c.beginPath();c.moveTo(0,-size*.12);
      c.quadraticCurveTo(-size*.45,-size*.65+flap,-size*1.2,-size*.35+flap);
      c.quadraticCurveTo(-size*.8,size*.1,-size*.65,size*.24);
      c.quadraticCurveTo(-size*.35,-size*.07,-size*.2,size*.25);
      c.lineTo(0,size*.18);c.lineTo(size*.2,size*.25);
      c.quadraticCurveTo(size*.35,-size*.07,size*.65,size*.24);
      c.quadraticCurveTo(size*.8,size*.1,size*1.2,-size*.35+flap);
      c.quadraticCurveTo(size*.45,-size*.65+flap,0,-size*.12);c.fill();
      c.beginPath();c.ellipse(0,0,size*.15,size*.30,0,0,Math.PI*2);c.fill();c.restore();
    }c.restore();
  }
  function apparition(){
    const size=Math.round(Math.min(w*(w<h?.48:.24),h*.34)),height=Math.round(size*ghost.height/ghost.width),padding=Math.ceil(size*.03)+2;
    const x=w*(.5+Math.sin(time*.17)*(w<h?.12:.23)),y=h*(.49+Math.sin(time*.68)*.042);
    if(cloth.width!==size+padding*2||cloth.height!==height){cloth.width=size+padding*2;cloth.height=height;}
    clothContext.clearRect(0,0,cloth.width,cloth.height);
    // Compose on integer destination rows before applying the rigid transform:
    // translucent cloth cannot accumulate opacity along overlapping strip edges.
    const start=Math.floor(height*.65);
    clothContext.drawImage(ghost,0,0,ghost.width,start/height*ghost.height,padding,0,size,start);
    for(let row=start;row<height;row++){
      const depth=(row-start)/(height-start),shift=Math.sin(time*2.2-depth*5)*depth*depth*size*.021;
      clothContext.drawImage(ghost,0,row/height*ghost.height,ghost.width,ghost.height/height,padding+shift,row,size,1);
    }
    c.save();c.translate(x,y);c.rotate(Math.sin(time*.42)*.032);
    c.drawImage(cloth,-size*.5-padding,-height*.5);c.restore();
  }
  function mist(){
    c.save();c.beginPath();c.rect(0,h*.59,w,h*.34);c.clip();
    for(let i=0;i<7;i++){
      const phase=(time*.016+i*.17)%1,x=(-.25+phase*1.5)*w,y=h*(.68+i*.026),r=w*.22;
      c.save();c.translate(x,y);c.scale(1,.13);const gradient=c.createRadialGradient(0,0,0,0,0,r);
      gradient.addColorStop(0,'rgba(182,166,205,.10)');gradient.addColorStop(1,'rgba(182,166,205,0)');
      c.fillStyle=gradient;c.fillRect(-r,-r,r*2,r*2);c.restore();
    }c.restore();
  }
  function draw(){
    if(!ready)return;c.drawImage(background,ox,oy,bw,bh);
    if(on(settings.pumpkins))pumpkins();if(on(settings.bats))bats();if(on(settings.ghost))apparition();
    if(on(settings.mist))mist();
    if(on(settings.leaves))motion.petals(c,{aw:w,ah:h,ox:0,oy:0},time,.6,'#b7773d');
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
  const load=(image,url)=>new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Hollow Lantern asset failed to load'));image.src=url;});
  Promise.all([load(background,'background.jpg'),load(ghost,'ghost.png')]).then(()=>{ready=true;resize();canvas.dataset.ready='true';animation.start();}).catch(error=>console.error(error.message));
  resize();
})();
