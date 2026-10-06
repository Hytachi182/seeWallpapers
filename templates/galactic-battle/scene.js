/* Generated photographic assets, bounded actors and one host-owned animation loop. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d',{alpha:false}),api=window.seeWallpaper;
  const defaults=JSON.parse(document.getElementById('defaults').textContent);
  let settings={...defaults,...api?.getSettings?.()};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const num=(v,d,a,b)=>clamp(Number.isFinite(Number(v))?Number(v):d,a,b);
  const on=v=>v!==false&&v!=='false'&&v!==0;
  const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,preview=new URLSearchParams(location.search).get('preview');
  let time=preview!==null?num(preview,12,0,120):0,paused=preview!==null||reduced,ready=false,failed=false;
  let w=1920,h=1080,aw=w,ah=h,ox=0,oy=0,fps=reduced?15:30,last=0,timer=0,raf=0,loaded=0;
  const bg=new Image(),fighter=new Image(),enemy=new Image();
  const ships=[{phase:.19,rate:.053,y:.32,size:.15,dir:1},{phase:.56,rate:.037,y:.51,size:.11,dir:-1},{phase:.84,rate:.065,y:.65,size:.18,dir:1},
    {phase:.08,rate:.031,y:.44,size:.055,dir:1},{phase:.73,rate:.046,y:.22,size:.044,dir:-1},{phase:.39,rate:.042,y:.72,size:.064,dir:1},{phase:.31,rate:.057,y:.40,size:.095,dir:-1,enemy:true},{phase:.67,rate:.042,y:.60,size:.075,dir:-1,enemy:true},{phase:.88,rate:.035,y:.29,size:.045,dir:-1,enemy:true}];
  const bolts=Array.from({length:27},(_,i)=>({ship:i%ships.length,phase:rnd(i+50),green:!!ships[i%ships.length].enemy}));
  const sortedShips=[...ships].sort((a,b)=>a.size-b.size);
  const bursts=Array.from({length:4},(_,i)=>({x:.36+rnd(i+88)*.5,y:.37+rnd(i+97)*.30,phase:i*.25}));
  const debris=Array.from({length:40},(_,i)=>({x:rnd(i+90),y:.38+rnd(i+17)*.43,rate:.007+rnd(i+9)*.01,size:1+rnd(i+36)*2}));
  function glowSprite(rgb){const a=document.createElement('canvas');a.width=a.height=256;const g=a.getContext('2d'),r=g.createRadialGradient(128,128,0,128,128,128);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.08,`rgba(${rgb},.9)`);r.addColorStop(.3,`rgba(${rgb},.25)`);r.addColorStop(1,`rgba(${rgb},0)`);g.fillStyle=r;g.fillRect(0,0,256,256);return a;}
  const blueGlow=glowSprite('83,184,255'),orangeGlow=glowSprite('255,143,50');
  function resize(){const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt((fps<=15?921600:2073600)/Math.max(1,innerWidth*innerHeight)));w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));const scale=Math.max(w/bg.width,h/bg.height);aw=bg.width*scale;ah=bg.height*scale;ox=(w-aw)*.5;oy=(h-ah)*.5;}
  function pose(ship,t){const phase=(ship.phase+t*ship.rate)%1;return{x:((ship.dir>0?phase:1-phase)*1.5-.25)*w,y:(ship.y+Math.sin(t*.7+ship.phase*9)*.025)*h,angle:Math.sin(t*.8+ship.phase*12)*.085,depth:ship.size};}
  function light(sprite,x,y,r,alpha){c.save();c.globalCompositeOperation='screen';c.globalAlpha=clamp(alpha,0,1);c.drawImage(sprite,x-r,y-r,r*2,r*2);c.restore();}
  function drawShips(){for(const s of sortedShips){const p=pose(s,time),size=Math.min(w*1.4,Math.max(w,Math.min(h,1080)*1.45))*s.size;c.save();c.translate(p.x,p.y);c.rotate(p.angle);const texture=s.enemy?enemy:fighter;c.scale(s.enemy?-s.dir:s.dir,1);const sh=size*texture.height/texture.width;if(on(settings.engines)&&!s.enemy){const flicker=.75+.15*Math.sin(time*19+s.phase*17);light(blueGlow,-size*.36,-sh*.03,size*.13,flicker*.8);}c.drawImage(texture,-size*.5,-sh*.5,size,sh);c.restore();}}
  function drawBolts(){c.save();c.globalCompositeOperation='screen';for(const [i,b]of bolts.entries()){const age=(time+b.phase*2.4)%2.4;if(age>1.25)continue;const s=ships[b.ship],launch=pose(s,time-age),dir=s.dir;const distance=age*w*.55,x=launch.x+dir*distance,y=launch.y-age*h*(b.green?.09:.02);const tail=x-dir*w*.035,fade=Math.min(1,age*15,(1.25-age)*8)*num(settings.light,1,.3,1.6);c.strokeStyle=b.green?`rgba(105,255,118,${fade})`:`rgba(255,88,70,${fade})`;c.lineWidth=Math.max(1,w*.0013);c.shadowBlur=w*.006;c.shadowColor=b.green?'#65ff78':'#ff6548';c.beginPath();c.moveTo(tail,y);c.lineTo(x,y);c.stroke();c.shadowBlur=0;c.strokeStyle=`rgba(255,248,222,${fade*.9})`;c.lineWidth=Math.max(.5,w*.00045);c.stroke();}c.restore();}
  function drawBursts(){for(const [i,b]of bursts.entries()){const phase=(time*.22+b.phase)%1;if(phase>.48)continue;const life=phase/.48,x=b.x*w,y=b.y*h,fade=(1-life)**2;light(orangeGlow,x,y,(.016+life*.08)*w,fade*num(settings.light,1,.3,1.6));c.save();c.globalCompositeOperation='screen';for(let j=0;j<28;j++){const a=rnd(i*59+j)*Math.PI*2,r=life*(.014+rnd(j+75)*.046)*w,px=x+Math.cos(a)*r,py=y+Math.sin(a)*r*.65;c.strokeStyle=`rgba(255,${130+Math.round(rnd(j+9)*110)},70,${fade})`;c.lineWidth=Math.max(.5,w*.0006);c.beginPath();c.moveTo(px,py);c.lineTo(px-Math.cos(a)*w*.003,py-Math.sin(a)*w*.003);c.stroke();}c.restore();}}
  function draw(){if(!ready||failed)return;c.globalAlpha=1;c.globalCompositeOperation='source-over';c.drawImage(bg,ox,oy,aw,ah);
    if(on(settings.stars)){for(let i=0;i<70;i++){const x=(.67+rnd(i+8)*.31)*w,y=rnd(i+15)*.35*h,alpha=.14+.12*Math.sin(time*(.7+rnd(i+37))+i);c.fillStyle=`rgba(175,211,255,${alpha})`;c.fillRect(x,y,Math.max(.5,w*.0007),Math.max(.5,w*.0007));}}
    if(on(settings.debris)){c.save();for(const d of debris){const x=((d.x+time*d.rate)%1)*w,y=d.y*h;c.strokeStyle='#92a8b766';c.lineWidth=Math.max(.6,w*.0007);c.beginPath();c.moveTo(x,y);c.lineTo(x+d.size*w*.0018,y+d.size*h*.001);c.stroke();}c.restore();}
    if(on(settings.fighters))drawShips();if(on(settings.lasers))drawBolts();if(on(settings.explosions))drawBursts();
  }
  function stop(){clearTimeout(timer);cancelAnimationFrame(raf);last=0;}
  function animate(now){if(paused||!ready||failed||document.hidden){stop();return;}const begin=performance.now();if(last)time+=Math.min(.15,(now-last)/1000)*num(settings.speed,1,0,2);last=now;draw();timer=setTimeout(()=>{raf=requestAnimationFrame(animate);},Math.max(0,1000/fps-(performance.now()-begin)-3));}
  function start(){stop();if(!paused&&ready&&!failed&&!document.hidden)raf=requestAnimationFrame(animate);}
  addEventListener('resize',()=>{if(ready){resize();draw();}});document.addEventListener('visibilitychange',start);
  api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});api?.onSettingsChanged(v=>{settings={...settings,...v};draw();});api?.onPerformanceChanged(v=>{fps=num(v,30,1,reduced?15:60);if(ready){resize();draw();start();}});
  function imageReady(){if(++loaded!==3)return;ready=true;resize();document.getElementById('fallback').hidden=true;draw();start();}
  bg.onload=fighter.onload=enemy.onload=imageReady;bg.onerror=fighter.onerror=enemy.onerror=()=>{failed=true;stop();document.getElementById('error').hidden=false;};bg.src='background.jpg';fighter.src='fighter.png';enemy.src='enemy.png';
})();
