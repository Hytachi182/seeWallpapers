(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d',{alpha:false});
  const api=window.seeWallpaper, motion=window.seeLivingMotion,parts=window.seeKnightParts;
  const background=new Image(),armor=new Image(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const params=new URLSearchParams(location.search),preview=params.has('preview');
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),on=v=>v!==false&&v!=='false';
  let settings={speed:1,training:true,cape:true,torches:true,mist:true,embers:true,...api?.getSettings?.()};
  const speed=()=>Number.isFinite(Number(settings.speed))?clamp(Number(settings.speed),0,2):1;
  let time=preview?clamp(Number(params.get('preview'))||0,0,86400):0,paused=preview,ready=false,fps=30,w=1,h=1,scale=1,bw=1,bh=1,ox=0,oy=0;
  const X=x=>ox+x*bw,Y=y=>oy+y*bh;
  const random=i=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
  const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
  function sprite(name,x,y,width,height,angle=0,pivot=.5){
    const source=parts[name];c.save();c.translate(x,y);c.rotate(angle);
    c.drawImage(armor,...source,-width*.5,-height*pivot,width,height);c.restore();
  }
  function bone(name,a,b,width,extra=0){
    const angle=Math.atan2(b.y-a.y,b.x-a.x)-Math.PI*.5;
    const length=Math.hypot(b.x-a.x,b.y-a.y);
    sprite(name,a.x,a.y,width,length+extra,angle,0);
  }
  const end=(p,angle,length)=>({x:p.x+Math.sin(angle)*length,y:p.y+Math.cos(angle)*length});
  function knee(hip,ankle){
    const upper=63,lower=66,dx=ankle.x-hip.x,dy=ankle.y-hip.y;
    const distance=clamp(Math.hypot(dx,dy),1,upper+lower-.01);
    const base=Math.atan2(dy,dx),angle=Math.acos(clamp((upper*upper+distance*distance-lower*lower)/(2*upper*distance),-1,1));
    return {x:hip.x+Math.cos(base-angle)*upper,y:hip.y+Math.sin(base-angle)*upper};
  }
  function cape(wind){
    const [sx,sy,sw,sh]=parts.cape;
    for(let row=0;row<sh;row+=4){
      const depth=row/sh,shift=wind*Math.sin(time*2.4-depth*5)*depth*depth*10;
      c.drawImage(armor,sx,sy+row,sw,Math.min(4,sh-row),-76+shift,102+depth*221,110,Math.min(4,sh-row)/sh*221+.15);
    }
  }
  function knight(){
    const phase=time%36,walking=phase<9||(phase>=18&&phase<27),returning=phase>=18&&phase<27;
    const walk=walking?(returning?phase-18:phase):0;
    const progress=phase<9?phase/9:phase<18?1:phase<27?1-(phase-18)/9:0;
    const span=w<h?.13:.36,px=w*(.5-span*.5+progress*span),ground=h*.86;
    const stride=walk*Math.PI*2/1.2,step=walking?Math.sin(stride):0,bob=walking?-(Math.sin(stride)**2)*2:Math.sin(time*1.5)*.5;
    const idle=phase>=9&&phase<18?phase-9:phase>=27?phase-27:-1;
    const guard=on(settings.training)&&idle>=0&&idle<2?smooth(idle/.4)*smooth((2-idle)/.4):0;
    const attack=on(settings.training)&&idle>=2&&idle<6?smooth((idle-2)/.35)*smooth((6-idle)/.35):0;
    const swing=Math.sin((idle-2)*Math.PI);
    canvas.dataset.action=walking?'walk':guard>.1?'guard':attack>.1?'sword':'idle';
    c.save();c.translate(px,ground);c.scale(scale,scale);c.translate(0,-360);
    // Feet land on the terrace; two-bone IK preserves the armor segment lengths.
    c.save();c.translate(0,bob);cape(on(settings.cape)?1:0);c.restore();
    for(const side of [-1,1]){
      const gait=step*side,hip={x:side*23,y:211+bob};
      const ankle={x:side*23+gait*22*(returning?-1:1),y:337-Math.max(0,gait)*17};
      const joint=knee(hip,ankle);bone('thigh',hip,joint,40);bone('shin',joint,ankle,42,20);
    }
    const farShoulder={x:-44,y:125+bob},nearShoulder={x:44,y:125+bob};
    const farElbow=end(farShoulder,-.28-step*.25-guard*.60,55);
    const farHand=end(farElbow,-.18-guard*.75,48);
    bone('upperArm',farShoulder,farElbow,36);bone('forearm',farElbow,farHand,34);
    sprite('chest',0,150+bob,108,114);sprite('hips',0,211+bob,106,59);
    sprite('helmet',0,65+bob,76,84);sprite('farShoulder',-47,124+bob,47,47);
    const upperAngle=.13+step*.30+attack*(-.55+.25*swing);
    const elbow=end(nearShoulder,upperAngle,55),hand=end(elbow,-.12+attack*(-.6+.2*swing),48);
    bone('upperArm',nearShoulder,elbow,36);bone('forearm',elbow,hand,34);sprite('shoulder',47,124+bob,53,51);
    sprite('shield',farHand.x-12,farHand.y-17,88,113,-.08-guard*.20);
    sprite('sword',hand.x,hand.y,30,141,.08+attack*(-.57+.46*swing),.88);
    c.restore();
  }
  function atmosphere(){
    if(on(settings.mist)){
      c.save();c.beginPath();c.rect(X(0),Y(.36),bw,bh*.30);c.clip();
      for(let i=0;i<5;i++){
        const x=X(.2+i*.16+Math.sin(time*.15+i)*.035),y=Y(.43+i*.025),r=bw*.16;
        c.save();c.translate(x,y);c.scale(1,.09);const gradient=c.createRadialGradient(0,0,0,0,0,r);
        gradient.addColorStop(0,`rgba(172,195,188,${.065+.018*Math.sin(time*.4+i)})`);gradient.addColorStop(1,'rgba(172,195,188,0)');
        c.fillStyle=gradient;c.fillRect(-r,-r,r*2,r*2);c.restore();
      }c.restore();
    }
    if(on(settings.torches))motion.lanterns(c,{aw:bw,ah:bh,ox,oy},time,[[.032,.478,2],[.965,.491,2]]);
    if(on(settings.embers))for(let i=0;i<26;i++){
      const cycle=(time*(.04+random(i)*.02)+random(i+50))%1;
      const x=X((i%2?.965:.032)+Math.sin(time*.5+i)*.025),y=Y((i%2?.491:.478)-cycle*.25);
      c.globalAlpha=Math.sin(cycle*Math.PI)*(.35+random(i+80)*.3);c.fillStyle=i%3?'#df9952':'#f8d69a';
      c.beginPath();c.arc(x,y,Math.max(.6,scale*(.5+random(i+30))),0,Math.PI*2);c.fill();
    }c.globalAlpha=1;
  }
  function draw(){
    if(!ready)return;c.drawImage(background,ox,oy,bw,bh);atmosphere();knight();
  }
  function resize(){
    const ratio=Math.min(devicePixelRatio||1,1920/Math.max(1,innerWidth),1080/Math.max(1,innerHeight));
    w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));
    scale=Math.min(h*.51,w*.98)/360;
    if(ready){const cover=Math.max(w/background.width,h/background.height);bw=background.width*cover;bh=background.height*cover;ox=(w-bw)*.5;oy=(h-bh)*.5;draw();}
  }
  const animation=motion.clock({active:()=>ready&&!paused&&!document.hidden&&!reduced.matches&&speed()>0,speed,fps:()=>fps,update:dt=>{time+=dt;draw();}});
  addEventListener('resize',resize);document.addEventListener('visibilitychange',()=>animation.start());
  reduced.addEventListener?.('change',()=>{draw();animation.start();});
  api?.onSettingsChanged(value=>{settings={...settings,...value};draw();animation.start();});
  api?.onPause(()=>{paused=true;animation.stop();});api?.onResume(()=>{paused=false;animation.start();});
  api?.onPerformanceChanged(value=>{fps=clamp(Number(value)||30,1,60);animation.start();});
  const load=(image,url)=>new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('Emberwatch Knight asset failed to load'));image.src=url;});
  Promise.all([load(background,'background.jpg'),load(armor,'armor.png')]).then(()=>{ready=true;resize();canvas.dataset.ready='true';animation.start();}).catch(error=>console.error(error.message));
  resize();
})();
