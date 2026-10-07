(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d',{alpha:false}),art=new Image(),api=window.seeWallpaper;
  let settings={speed:1,petals:1,water:true,lights:true,glints:true,...api?.getSettings?.()};
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),params=new URLSearchParams(location.search),fixed=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),on=v=>v!==false&&v!=='false';
  const number=(key,fallback,a,b)=>Number.isFinite(Number(settings[key]))?clamp(Number(settings[key]),a,b):fallback;
  const random=n=>{const k=Math.sin(n*127.1+311.7)*43758.5453;return k-Math.floor(k);};
  let time=fixed?clamp(Number(params.get('preview'))||0,0,3600):0,paused=fixed,ready=false,fps=30,frame=0,timer=0,last=0;
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
  function water(){
    c.save();c.beginPath();pool.forEach(([x,y],i)=>i?c.lineTo(X(x),Y(y)):c.moveTo(X(x),Y(y)));c.closePath();c.clip();
    // Small refraction offsets move existing caustics without moving the pool rim.
    for(let i=0;i<30;i++){
      const y=.62+i*.008,dy=Math.sin(time*.7+i*.8)*ah*.0011,dx=Math.sin(time*.8+i*.3)*aw*.0012;
      c.drawImage(art,0,y*art.height,art.width,art.height*.009,ox+dx,Y(y)+dy,aw,ah*.009);
    }
    c.globalCompositeOperation='screen';
    for(let i=0;i<100;i++){
      const x=.16+random(i+45)*.64,y=.61+random(i+93)*.22,pulse=.5+.5*Math.sin(time*1.2+i*2.3);
      c.strokeStyle=`rgba(219,255,247,${.035+pulse*.16})`;c.lineWidth=Math.max(.6,ah*.0008);
      const drift=Math.sin(time*.6+i)*.003;
      c.beginPath();c.moveTo(X(x+drift),Y(y));c.bezierCurveTo(X(x+.006+drift),Y(y-.0015),X(x+.012+drift),Y(y+.0015),X(x+.019+drift),Y(y));c.stroke();
    }
    c.restore();
  }
  function petals(){
    const count=Math.round(32*number('petals',1,0,2));
    for(let i=0;i<count;i++){
      const cycle=(time*(.022+random(i+19)*.017)+random(i+3))%1;
      const x=.12+random(i+60)*.93-cycle*.16+Math.sin(time*.45+i)*.012,y=-.05+cycle*1.15;
      const r=aw*(.0017+random(i+35)*.0016),turn=time*(.65+random(i))+i;
      c.save();c.translate(X(x),Y(y));c.rotate(turn);c.scale(.35+Math.abs(Math.sin(turn))*.65,1);
      c.globalAlpha=.42+random(i+12)*.35;c.fillStyle=i%3?'#e788aa':'#fff0df';
      c.beginPath();c.moveTo(-r,0);c.bezierCurveTo(-r,-r,r,-r*.6,r*.9,0);c.bezierCurveTo(r*.4,r*.8,-r*.7,r*.7,-r,0);c.fill();c.restore();
    }
  }
  function glints(){
    const spots=[[.669,.175],[.882,.68],[.748,.736],[.863,.786],[.55,.7],[.43,.76],[.587,.804],[.907,.765]];
    c.save();c.globalCompositeOperation='screen';
    spots.forEach(([x,y],i)=>{
      const pulse=Math.pow(.5+.5*Math.sin(time*.8+i*1.83),9),r=aw*(.001+random(i+3)*.0018);
      c.strokeStyle=`rgba(255,245,218,${pulse*.7})`;c.lineWidth=Math.max(.6,ah*.0008);
      c.beginPath();c.moveTo(X(x)-r*2,Y(y));c.lineTo(X(x)+r*2,Y(y));c.moveTo(X(x),Y(y)-r*2);c.lineTo(X(x),Y(y)+r*2);c.stroke();
      glow(x,y,.006,pulse*.14);
    });c.restore();
  }
  function draw(){
    if(!ready)return;c.drawImage(art,ox,oy,aw,ah);
    // Reduced motion and speed zero preserve the unmodified artwork.
    if(motion.matches||number('speed',1,0,2)===0)return;
    if(on(settings.water))water();
    if(on(settings.lights)){
      c.save();c.globalCompositeOperation='screen';
      [[.544,.385],[.722,.153],[.968,.366],[.454,.541],[.564,.824]].forEach(([x,y],i)=>glow(x,y,.018,.18+Math.sin(time*.6+i)*.035));c.restore();
    }
    petals();if(on(settings.glints))glints();
  }
  function stop(){clearTimeout(timer);cancelAnimationFrame(frame);last=0;}
  function animate(now){
    if(paused||document.hidden||motion.matches||number('speed',1,0,2)===0){stop();draw();return;}
    if(last)time+=Math.min(.1,(now-last)/1000)*number('speed',1,0,2);last=now;draw();
    timer=setTimeout(()=>{frame=requestAnimationFrame(animate);},Math.max(0,1000/fps-4));
  }
  function start(){stop();if(ready&&!paused&&!document.hidden&&!motion.matches&&number('speed',1,0,2)>0)frame=requestAnimationFrame(animate);}
  addEventListener('resize',resize);document.addEventListener('visibilitychange',start);motion.addEventListener?.('change',()=>{draw();start();});
  api?.onSettingsChanged(v=>{settings={...settings,...v};draw();start();});api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});api?.onPerformanceChanged(v=>{fps=clamp(Number(v)||30,1,60);start();});
  art.onload=()=>{ready=true;resize();start();};art.onerror=()=>{stop();console.error('Rose Riviera artwork could not be loaded');};art.src='artwork.jpg';resize();
})();
