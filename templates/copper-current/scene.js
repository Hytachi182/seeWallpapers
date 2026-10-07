(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),ctx=canvas.getContext('2d',{alpha:false}),api=window.seeWallpaper;
  let settings={...JSON.parse(document.getElementById('defaults').textContent),...api?.getSettings?.()};
  const base=document.createElement('canvas');base.width=1600;base.height=1000;
  const c=base.getContext('2d',{alpha:false}),W=1600,H=1000,motion=matchMedia('(prefers-reduced-motion: reduce)'),params=new URLSearchParams(location.search);
  const fixed=params.has('preview'),on=v=>v!==false&&v!=='false',clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const random=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  let time=fixed?clamp(Number(params.get('preview'))||0,0,3600):0,paused=fixed,fps=30,last=0,timer=0,frame=0,w=1,h=1,scale=1,ox=0,oy=0;
  const routes=[],labels=[],leds=[[745,669],[768,669],[791,669],[1209,335],[1233,335],[1257,335],[352,742],[376,742]];
  function route(points,index){
    const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
    routes.push({points,lengths,length:lengths.at(-1),index});
  }
  for(let i=0;i<18;i++){
    const y=385+i*12,targetY=190+i*32,left=748-i*5,right=1092+i*5;
    route([[790,y],[left,y],[left-Math.abs(targetY-y),targetY],[143+i%3*14,targetY]],i);
    route([[1050,y],[right,y],[right+Math.abs(targetY-y),targetY],[1450-i%3*14,targetY]],18+i);
    const x=810+i*12,tx=650+i*22,top=321-i*5;
    route([[x,365],[x,top],[tx,top-Math.abs(tx-x)],[tx,83]],36+i);
    const bx=647+i*25,bottom=659+i*5;
    route([[x,615],[x,bottom],[bx,bottom+Math.abs(bx-x)],[bx,913]],54+i);
  }
  function stroke(points,color,width){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();}
  function rect(x,y,w,h,r,fill){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();}
  function circle(x,y,r,fill){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=fill;c.fill();}
  function print(value,x,y,size=9,align='left'){labels.push({value,x,y,size,align});}
  function via(x,y,r=4){circle(x+1,y+1,r+1,'#061812');circle(x,y,r,'#b0925e');circle(x,y,r-1,'#5b6e57');circle(x,y,r-2,'#081e1a');}
  function chip(x,y,width,height,name,small=false){
    c.save();c.shadowColor='#0008';c.shadowBlur=9;c.shadowOffsetX=4;c.shadowOffsetY=7;rect(x,y,width,height,4,'#0a1012');c.restore();
    const metal=c.createLinearGradient(x,y,x+12,y+12);metal.addColorStop(0,'#dde0bc');metal.addColorStop(.3,'#7f948b');metal.addColorStop(.65,'#d1d6bc');metal.addColorStop(1,'#455d56');
    const pitch=small?10:12;
    for(let i=14;i<height-10;i+=pitch){rect(x-14,y+i,16,5,1,metal);rect(x+width-2,y+i,16,5,1,metal);}
    for(let i=20;i<width-14;i+=pitch){rect(x+i,y-13,5,16,1,metal);rect(x+i,y+height-2,5,16,1,metal);}
    const surface=c.createLinearGradient(x,y,x+width,y+height);surface.addColorStop(0,'#3c4649');surface.addColorStop(.25,'#222b2e');surface.addColorStop(1,'#11191d');
    rect(x,y,width,height,4,'#0c1517');rect(x+3,y+3,width-6,height-6,3,surface);
    stroke([[x+5,y+height-5],[x+5,y+5],[x+width-5,y+5]],'#69707188',1);
    stroke([[x+width-4,y+6],[x+width-4,y+height-4],[x+5,y+height-4]],'#050c10',2);
    for(let i=0;i<22;i++){const yy=y+8+random(i+width)*Math.max(1,height-16);stroke([[x+10,yy],[x+width-10,yy]],'#c5d2c703',.5);}
    circle(x+12,y+height-13,3,'#111719');circle(x+11,y+height-14,2,'#5f666255');
    print(name,x+width/2,y+height*.47,small?10:20,'center');print(small?'CC / REV 01':'SIGNAL PROCESSOR',x+width/2,y+height*.57,small?7:11,'center');
    if(!small){print('COPPER CURRENT',x+width/2,y+height*.7,10,'center');print('CC LAB / REV 01',x+width/2,y+height*.78,7,'center');}
  }
  function smd(x,y,orientation=0,ceramic=false){
    c.save();c.translate(x,y);c.rotate(orientation);c.shadowColor='#0005';c.shadowBlur=3;c.shadowOffsetY=2;
    rect(-12,-5,24,10,2,ceramic?'#b89c72':'#25302b');c.shadowColor='transparent';
    const metal=c.createLinearGradient(0,-5,0,5);metal.addColorStop(0,'#e0dcba');metal.addColorStop(.5,'#798f82');metal.addColorStop(1,'#465b51');rect(-14,-5,5,10,1,metal);rect(9,-5,5,10,1,metal);
    if(!ceramic){c.fillStyle='#9bb59c55';c.font='5px monospace';c.textAlign='center';c.fillText('103',0,2);}c.restore();
  }
  function capacitor(x,y,r=15){
    c.save();c.shadowColor='#0008';c.shadowBlur=6;c.shadowOffsetY=6;circle(x,y,r+2,'#142a26');c.restore();
    const cap=c.createRadialGradient(x-r*.4,y-r*.5,1,x,y,r);cap.addColorStop(0,'#dde6d3');cap.addColorStop(.45,'#9bada4');cap.addColorStop(.8,'#526e66');cap.addColorStop(1,'#223d34');circle(x,y,r,cap);
    stroke([[x-r*.5,y-r*.4],[x+r*.5,y+r*.4]],'#41584d',1);stroke([[x-r*.5,y+r*.4],[x+r*.5,y-r*.4]],'#41584d',1);
  }
  function renderBase(){
    labels.length=0;
    const board=c.createLinearGradient(0,0,W,H);board.addColorStop(0,'#123c32');board.addColorStop(.5,'#153b31');board.addColorStop(1,'#08231f');c.fillStyle=board;c.fillRect(0,0,W,H);
    // Fixed solder-mask grain belongs to the board material and never flickers.
    for(let i=0;i<12500;i++){c.fillStyle=i%2?'#c5e3bd05':'#001e150b';c.fillRect(random(i+5)*W,random(i+110)*H,1+random(i+220),.7);}
    for(const r of routes){stroke(r.points,'#031c16',7);stroke(r.points,'#355b37',5);stroke(r.points,'#a17b48',2.6);stroke(r.points,'#d3b47d55',.75);}
    for(const r of routes){const p=r.points.at(-1);via(p[0],p[1],4.5);const d=r.index<18?[-35,0]:r.index<36?[35,0]:r.index<54?[0,-27]:[0,28];smd(p[0]+d[0],p[1]+d[1],r.index>=36?Math.PI/2:0,r.index%4===0);}
    // Secondary grounded areas and routed copper around the component clusters.
    for(let i=0;i<10;i++){
      stroke([[40+i*10,85],[40+i*10,805+i*7],[125+i*8,890],[435,890]],'#56815c33',1.2);
      stroke([[1518+i*6,100],[1518+i*6,807],[1425,903+i*5],[1160,903+i*5]],'#91a86f33',1.2);
    }
    for(let i=0;i<150;i++){
      const x=30+random(i+220)*1540,y=25+random(i+480)*950;
      if(x>720&&x<1130&&y>310&&y<780)continue;via(x,y,2.6);
    }
    chip(790,365,260,250,'CC-01');chip(300,604,162,96,'FLASH / 02',true);chip(1150,195,184,99,'I/O CONTROLLER',true);chip(379,161,128,91,'POWER / 03',true);
    // Surrounding passive components and capacitor banks anchor the macro scale.
    for(let i=0;i<8;i++){smd(745,404+i*22,Math.PI/2,i%2===0);smd(1098,397+i*25,Math.PI/2,i%3===0);}
    for(let i=0;i<7;i++){smd(814+i*34,329,0,true);smd(824+i*31,705,0,i%2===0);}
    for(let i=0;i<5;i++){capacitor(559+i*40,779,14+i%2*2);smd(556+i*40,825,Math.PI/2,true);}
    for(let i=0;i<3;i++){capacitor(295+i*48,421,18);print(`C${21+i}`,287+i*48,450,8);}
    for(let i=0;i<4;i++){
      const x=1181+i*36;rect(x,629,26,44,3,'#081b18');rect(x+2,631,22,40,2,'#32473b');
      for(let j=0;j<6;j++)stroke([[x+4,636+j*5],[x+22,638+j*5]],j%2?'#b88448':'#d3a669',2);
      print(`L${i+1}`,x+13,689,8,'center');
    }
    // Plated mounting holes, small connectors and silkscreen registration marks.
    for(const [x,y] of [[81,77],[1512,73],[81,928],[1508,930]]){
      circle(x,y,22,'#355847');circle(x,y,17,'#ada679');circle(x,y,12,'#1e322a');circle(x+1,y+2,9,'#040e0b');stroke([[x-26,y],[x-21,y]],'#a6c2a666',1);stroke([[x,y-26],[x,y-21]],'#a6c2a666',1);
    }
    for(const [x,y] of [[580,141],[1391,814]]){
      rect(x,y,33,101,3,'#13221b');rect(x+3,y+3,27,95,2,'#283a2b');for(let i=0;i<8;i++){rect(x+8,y+9+i*11,17,5,1,'#bca77a');rect(x+10,y+10+i*11,13,1,1,'#f0d7a1');}
    }
    leds.forEach(([x,y],i)=>{rect(x-7,y-5,14,10,2,'#061b14');rect(x-9,y-2,3,4,1,'#8da389');rect(x+6,y-2,3,4,1,'#8da389');rect(x-4,y-3,8,6,1,'#50725a');print(`D${i+1}`,x-6,y+15,7);});
    print('COPPER CURRENT',222,91,16);print('REV 01  /  SIGNAL BOARD',222,111,9);print('J1',574,255,9);print('I/O',1391,806,9);print('U1',776,353,9);print('U2',288,595,9);print('POWER',526,855,9);
    // Subtle edge falloff and soft light bring out the solder-mask material.
    const shade=c.createRadialGradient(890,460,180,890,460,1050);shade.addColorStop(0,'#0000');shade.addColorStop(.6,'#00000012');shade.addColorStop(1,'#00000099');c.fillStyle=shade;c.fillRect(0,0,W,H);
  }
  function pointAt(r,d){
    const distance=clamp(d,0,r.length);
    let i=1;while(i<r.lengths.length-1&&r.lengths[i]<distance)i++;
    const t=(distance-r.lengths[i-1])/Math.max(.001,r.lengths[i]-r.lengths[i-1]);
    return {x:r.points[i-1][0]+(r.points[i][0]-r.points[i-1][0])*t,y:r.points[i-1][1]+(r.points[i][1]-r.points[i-1][1])*t};
  }
  function pulse(r){
    const cycle=(time*(43+r.index%5*5)+random(r.index+100)*r.length)% (r.length+140)-70;
    if(cycle<0||cycle>r.length)return;
    const points=[];for(let d=Math.max(0,cycle-44);d<=cycle;d+=4){const p=pointAt(r,d);points.push(p);}points.push(pointAt(r,cycle));
    ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle=settings.color;ctx.lineWidth=2.2;ctx.lineCap='round';ctx.globalAlpha=.68;
    ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
    const head=pointAt(r,cycle),g=ctx.createRadialGradient(head.x,head.y,0,head.x,head.y,12);g.addColorStop(0,settings.color);g.addColorStop(1,'#0000');ctx.fillStyle=g;ctx.globalAlpha=.28;ctx.fillRect(head.x-12,head.y-12,24,24);ctx.restore();
  }
  function draw(){
    ctx.drawImage(base,ox,oy,W*scale,H*scale);ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale);
    if(on(settings.pulses)){
      // Signals run on exposed traces only; packages occlude the copper underneath.
      ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);
      for(const [x,y,width,height] of [[788,363,264,254],[298,602,166,100],[1148,193,188,103],[377,159,132,95],[578,139,37,105],[1389,812,37,105]])ctx.rect(x,y,width,height);
      for(const [x,y,r] of [[295,421,20],[343,421,20],[391,421,20],[559,779,17],[599,779,19],[639,779,17],[679,779,19],[719,779,17]]){ctx.moveTo(x+r,y);ctx.arc(x,y,r,0,Math.PI*2);}
      ctx.clip('evenodd');routes.forEach(pulse);ctx.restore();
    }
    if(on(settings.leds))leds.forEach(([x,y],i)=>{
      const intensity=.25+.5*Math.pow(.5+.5*Math.sin(time*(.6+i%3*.15)+i*1.8),2);
      ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(x,y,0,x,y,17);g.addColorStop(0,settings.color);g.addColorStop(1,'#0000');ctx.globalAlpha=intensity*.5;ctx.fillStyle=g;ctx.fillRect(x-17,y-17,34,34);ctx.globalAlpha=.8;ctx.fillStyle=settings.color;ctx.fillRect(x-3,y-2,6,4);ctx.restore();
    });
    if(on(settings.details)){
      ctx.fillStyle='#b1c4acaa';labels.forEach(l=>{ctx.font=`${l.size}px Consolas,monospace`;ctx.textAlign=l.align;ctx.fillText(l.value,l.x,l.y);});
    }
    ctx.restore();
  }
  function resize(){
    const ratio=Math.min(devicePixelRatio||1,1920/Math.max(1,innerWidth),1080/Math.max(1,innerHeight));
    w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));scale=Math.max(w/W,h/H);ox=(w-W*scale)*.59;oy=(h-H*scale)*.5;draw();
  }
  function stop(){clearTimeout(timer);cancelAnimationFrame(frame);last=0;}
  function speed(){return clamp(Number.isFinite(Number(settings.speed))?Number(settings.speed):1,0,2);}
  function animate(now){
    if(paused||document.hidden||motion.matches||speed()===0){stop();return;}
    if(last)time+=Math.min(.1,(now-last)/1000)*speed();last=now;draw();timer=setTimeout(()=>{frame=requestAnimationFrame(animate);},Math.max(0,1000/fps-4));
  }
  function start(){stop();if(!paused&&!document.hidden&&!motion.matches&&speed()>0)frame=requestAnimationFrame(animate);}
  addEventListener('resize',resize);document.addEventListener('visibilitychange',start);motion.addEventListener?.('change',start);
  api?.onSettingsChanged(v=>{settings={...settings,...v};draw();start();});api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});api?.onPerformanceChanged(v=>{fps=clamp(Number(v)||30,1,60);start();});
  renderBase();resize();start();
})();
