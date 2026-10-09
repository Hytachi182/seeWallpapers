(() => {
  'use strict';
  const canvas=document.querySelector('canvas'), c=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, motion=window.seeLivingMotion;
  const background=new Image(), jet=new Image(), cloud=new Image();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'), params=new URLSearchParams(location.search);
  const preview=params.has('preview'), clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const enabled=v=>v!==false&&v!=='false';
  let settings={speed:1,formation:true,contrails:true,afterburners:true,clouds:true,banking:true,...api?.getSettings?.()};
  const speed=()=>Number.isFinite(Number(settings.speed))?clamp(Number(settings.speed),0,2):1;
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):0, paused=preview,ready=false,fps=30;
  let w=1,h=1,reference=1;
  const moving=()=>!reduced.matches&&speed()>0;

  function flight(t,squad,slot) {
    const phase=((t/26+.32+squad*.5)%1+1)%1;
    const scale=squad===0?1:.65;
    const offset=slot===0?0:.31;
    const turn=.47+(enabled(settings.banking)?Math.sin(phase*Math.PI*2)*.055:0);
    const y=(squad===0?.49:.28)+Math.sin(phase*Math.PI*2)*.055+(slot===1?-.265:slot===2?.265:0)*scale;
    return {x:(1.65-phase*2.3+offset*scale)*w,y:y*h,size:reference*(slot===0?.44:.235)*scale,angle:turn,phase};
  }
  function nozzle(p,index) {
    // Sprite-local engine anchors; calibrated against the original transparent art.
    const anchor=index===0?[.783,.282]:[.853,.345];
    const x=p.size*(anchor[0]-.5),y=p.size*(anchor[1]-.5)*jet.height/jet.width;
    return {x:p.x+x*Math.cos(p.angle)-y*Math.sin(p.angle),y:p.y+x*Math.sin(p.angle)+y*Math.cos(p.angle)};
  }
  function trails(squad,slot) {
    c.save(); c.lineCap='round';
    const current=flight(time,squad,slot);
    for(let engine=0;engine<2;engine++) {
      let previous=nozzle(current,engine);
      for(let k=1;k<=24;k++) {
        const age=k*.30, old=flight(time-age,squad,slot);
        if(Math.abs(old.x-current.x)>w*.9)break;
        const point=nozzle(old,engine);point.y+=Math.sin(time*.7+age*2+engine)*age*1.2;
        c.strokeStyle=`rgba(226,237,244,${.32*Math.pow(1-k/25,1.6)})`;
        c.lineWidth=Math.max(.7,current.size*(.0018+age*.0015));
        c.beginPath();c.moveTo(previous.x,previous.y);c.lineTo(point.x,point.y);c.stroke();previous=point;
      }
    } c.restore();
  }
  function exhaust(p) {
    c.save();c.translate(p.x,p.y);c.rotate(p.angle);c.globalCompositeOperation='screen';
    for(let engine=0;engine<2;engine++) {
      const anchor=engine===0?[.783,.282]:[.853,.345];
      const x=p.size*(anchor[0]-.5),y=p.size*(anchor[1]-.5)*jet.height/jet.width;
      const pulse=.82+Math.sin(time*9+engine)*.09+Math.sin(time*15+engine)*.04;
      const length=p.size*.074*pulse, radius=p.size*.006;
      c.save();c.translate(x,y);c.rotate(-.47);
      const gradient=c.createLinearGradient(0,0,length,0);
      gradient.addColorStop(0,'rgba(255,239,190,.68)');gradient.addColorStop(.28,'rgba(255,157,65,.42)');gradient.addColorStop(1,'rgba(255,140,54,0)');
      c.fillStyle=gradient;c.beginPath();c.moveTo(0,-radius);
      c.quadraticCurveTo(length*.6,-radius*.45,length,0);
      c.quadraticCurveTo(length*.6,radius*.45,0,radius);c.closePath();c.fill();c.restore();
    } c.restore();
  }
  function aircraft(squad,slot) {
    const p=flight(time,squad,slot), imageHeight=p.size*jet.height/jet.width;
    if(p.x+p.size<0||p.x-p.size>w)return;
    if(enabled(settings.contrails))trails(squad,slot);
    if(enabled(settings.afterburners)&&moving())exhaust(p);
    c.save();c.translate(p.x,p.y);c.rotate(p.angle);
    // Rigid sprite transform preserves the complete airframe and wing geometry.
    c.globalAlpha=squad===0?1:.78;
    c.drawImage(jet,-p.size*.5,-imageHeight*.5,p.size,imageHeight);c.restore();
  }
  function vapor() {
    c.save();
    for(let i=0;i<3;i++) {
      const phase=((time*(.023+i*.006)+i*.36)%1+1)%1;
      const size=reference*(.7+i*.15),x=(1.4-phase*2.25)*w;
      const y=h*(.62+i*.13)+Math.sin(time*.12+i)*h*.02;
      c.globalAlpha=.11+i*.035;
      c.drawImage(cloud,x-size*.5,y-size*cloud.height/cloud.width*.5,size,size*cloud.height/cloud.width);
    } c.restore();
  }
  function draw() {
    if(!ready)return;
    const scale=Math.max(w/background.width,h/background.height),bw=background.width*scale,bh=background.height*scale;
    c.drawImage(background,(w-bw)*.5,(h-bh)*.5,bw,bh);
    for(const squad of [1,0]) {
      if(enabled(settings.formation)){aircraft(squad,1);aircraft(squad,2);}
      aircraft(squad,0);
    }
    if(enabled(settings.clouds))vapor();
  }
  function resize() {
    const ratio=Math.min(devicePixelRatio||1,1920/Math.max(1,innerWidth),1080/Math.max(1,innerHeight));
    w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));
    reference=Math.max(w,Math.min(h*1.15,w*1.8));draw();
  }
  const animation=motion.clock({active:()=>ready&&!paused&&!document.hidden&&moving(),speed,fps:()=>fps,update:delta=>{time+=delta;draw();}});
  addEventListener('resize',resize);
  document.addEventListener('visibilitychange',()=>animation.start());
  reduced.addEventListener?.('change',()=>{draw();animation.start();});
  api?.onSettingsChanged(value=>{settings={...settings,...value};draw();animation.start();});
  api?.onPause(()=>{paused=true;animation.stop();});
  api?.onResume(()=>{paused=false;animation.start();});
  api?.onPerformanceChanged(value=>{fps=clamp(Number(value)||30,1,60);animation.start();});
  const load=image=>new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Stratos Flight asset failed to load'));});
  const loads=[load(background),load(jet),load(cloud)];
  background.src='background.jpg';jet.src='jet.png';cloud.src='cloud.png';
  Promise.all(loads).then(()=>{ready=true;resize();canvas.dataset.ready='true';animation.start();}).catch(error=>console.error(error.message));
  resize();
})();
