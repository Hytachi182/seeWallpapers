(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d',{alpha:false}),art=new Image(),api=window.seeWallpaper,living=window.seeLivingMotion;
  const geometry=()=>({aw,ah,ox,oy});
  let settings={speed:1,petals:1,water:true,lights:true,glints:true,...api?.getSettings?.()};
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),params=new URLSearchParams(location.search),fixed=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),on=v=>v!==false&&v!=='false';
  const number=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const random=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  let time=fixed?clamp(Number(params.get('preview'))||0,0,3600):0,paused=fixed,ready=false,fps=30;
  let w=1,h=1,aw=1,ah=1,ox=0,oy=0;
  const X=x=>ox+x*aw,Y=y=>oy+y*ah;
  // Normalized water outline follows the generated image, not the pool surround.
  const pool=[[.17,.722],[.28,.696],[.39,.666],[.442,.64],[.443,.625],[.444,.617],[.48,.61],[.58,.618],[.68,.636],[.755,.657],[.791,.683],[.769,.701],[.72,.724],[.642,.764],[.55,.797],[.45,.817],[.356,.811],[.272,.784],[.212,.761],[.18,.742]];
  function resize(){
    const ratio=Math.min(devicePixelRatio||1,1920/Math.max(1,innerWidth),1080/Math.max(1,innerHeight));
    w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));
    if(!ready)return;
    const scale=Math.max(w/art.width,h/art.height);aw=art.width*scale;ah=art.height*scale;
    ox=(w-aw)*(w<h?.68:.5);oy=(h-ah)*.5;draw();
  }
  function glow(x,y,r,alpha){
    const g=c.createRadialGradient(X(x),Y(y),0,X(x),Y(y),aw*r);
    g.addColorStop(0,`rgba(255,223,157,${alpha})`);g.addColorStop(.3,`rgba(255,207,150,${alpha*.3})`);g.addColorStop(1,'rgba(255,207,150,0)');
    c.fillStyle=g;c.fillRect(X(x-r),Y(y)-aw*r,aw*r*2,aw*r*2);
  }
  function water(){ living.water(c,geometry(),art,time,pool,{strength:1.1,light:'#d8fff4',caustics:true});
    living.water(c,geometry(),art,time,[[.022,.398],[.345,.393],[.278,.451],[.12,.477],[.075,.554],[.019,.53]],{strength:.6,light:'#fff0cf'}); }
  function petals(){ living.petals(c,geometry(),time,number('petals',1,0,2),'#dc739e'); }
  function glints(){
    // A soft highlight follows the lacquered bonnet instead of floating star icons.
    c.save();c.beginPath();
    [[.757,.727],[.784,.694],[.866,.673],[.884,.713],[.837,.731],[.792,.75]].forEach(([x,y],i)=>i?c.lineTo(X(x),Y(y)):c.moveTo(X(x),Y(y)));
    c.closePath();c.clip();c.globalCompositeOperation='screen';
    const sweep=.75+(.5+.5*Math.sin(time*.42))*.14;
    const sheen=c.createLinearGradient(X(sweep-.024),Y(.7),X(sweep+.024),Y(.74));
    sheen.addColorStop(0,'rgba(255,245,220,0)');sheen.addColorStop(.5,'rgba(255,245,220,.15)');sheen.addColorStop(1,'rgba(255,245,220,0)');
    c.fillStyle=sheen;c.fillRect(X(.75),Y(.67),aw*.15,ah*.09);c.restore();
  }
  function draw(){
    if(!ready)return;c.drawImage(art,ox,oy,aw,ah);
    // Reduced motion and speed zero preserve the unmodified artwork.
    if(motion.matches||number('speed',1,0,2)===0)return;
    if(on(settings.water))water();
    if(on(settings.lights)){
      c.save();c.globalCompositeOperation='screen';
      c.restore();living.lanterns(c,geometry(),time,[[.146,.815,.7],[.23,.755,.65],[.458,.55,.5],[.572,.843,.7]]);
    }
    petals();if(on(settings.glints))glints();
  }
  const animation=living.clock({active:()=>ready&&!paused&&!document.hidden&&!motion.matches&&number('speed',1,0,2)>0,speed:()=>number('speed',1,0,2),fps:()=>fps,update:delta=>{time+=delta;draw();}});
  const stop=()=>animation.stop(),start=()=>animation.start();
  addEventListener('resize',resize);document.addEventListener('visibilitychange',start);motion.addEventListener?.('change',()=>{draw();start();});
  api?.onSettingsChanged(v=>{settings={...settings,...v};draw();start();});api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});api?.onPerformanceChanged(v=>{fps=clamp(Number(v)||30,1,60);start();});
  art.onload=()=>{ready=true;resize();canvas.dataset.ready='true';start();};art.onerror=()=>{stop();console.error('Rose Riviera artwork could not be loaded');};art.src='artwork.jpg';resize();
})();
