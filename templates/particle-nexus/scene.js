/* Host adapter around the unmodified, bundled particles.js 2.0.0 (MIT). */
(() => {
  'use strict';
  const defaults=JSON.parse(document.getElementById('defaults').textContent),api=window.seeWallpaper;
  let settings={...defaults,...api?.getSettings?.()};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),num=(v,d,a,b)=>clamp(Number.isFinite(Number(v))?Number(v):d,a,b);
  const on=v=>v!==false&&v!=='false'&&v!==0,hex=(v,d)=>/^#[\da-f]{6}$/i.test(v)?v:d;
  const preview=new URLSearchParams(location.search).get('preview'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seed=preview!==null?448293:Date.now()>>>0;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  function seeded(action){const old=Math.random;try{Math.random=random;return action();}finally{Math.random=old;}}
  let paused=reduced||preview!==null,fps=reduced?15:30,last=0,timer=0,frame=0,ratio=1;
  const rangeScale=()=>ratio*Math.min(1,Math.min(innerWidth,innerHeight)/1080);
  seeded(()=>window.particlesJS('particles-js',{
    particles:{number:{value:0,density:{enable:false}},color:{value:defaults.color},shape:{type:'circle',stroke:{width:0}},opacity:{value:.65,random:false,anim:{enable:false}},size:{value:2.7,random:true,anim:{enable:false}},line_linked:{enable:true,distance:210,color:defaults.color,opacity:.30,width:.65},move:{enable:false,speed:.7,direction:'none',random:false,straight:false,out_mode:'out',bounce:false,attract:{enable:false}}},
    interactivity:{detect_on:'canvas',events:{onhover:{enable:true,mode:'grab'},onclick:{enable:false},resize:false},modes:{grab:{distance:170,line_linked:{opacity:.5}}}},retina_detect:false
  }));
  const p=window.pJSDom[window.pJSDom.length-1].pJS,canvas=p.canvas.el,c=p.canvas.ctx;
  // The library's own RAF loop never starts: initialization has move.enable=false.
  // The host adapter is the sole owner of movement, pause and FPS scheduling.
  function resize(){
    const oldW=p.canvas.w||1,oldH=p.canvas.h||1;
    ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt((fps<=15?921600:2073600)/Math.max(1,innerWidth*innerHeight)));
    canvas.width=Math.max(1,Math.round(innerWidth*ratio));canvas.height=Math.max(1,Math.round(innerHeight*ratio));p.canvas.w=canvas.width;p.canvas.h=canvas.height;
    for(const dot of p.particles.array){dot.x*=p.canvas.w/oldW;dot.y*=p.canvas.h/oldH;dot.radius=dot.nexusRadius*ratio;}
    p.particles.line_linked.distance=num(settings.distance,210,80,320)*rangeScale();p.particles.line_linked.width=.65*ratio;p.interactivity.modes.grab.distance=170*rangeScale();
  }
  function apply(){
    const color=hex(settings.color,defaults.color),rgb=window.hexToRgb(color);
    document.documentElement.style.setProperty('--background',hex(settings.background,defaults.background));document.documentElement.style.setProperty('--light',`${rgb.r},${rgb.g},${rgb.b}`);
    p.particles.color.value=color;p.particles.line_linked.color=color;p.particles.line_linked.color_rgb_line=rgb;
    p.particles.line_linked.enable=on(settings.links);p.particles.line_linked.distance=num(settings.distance,210,80,320)*rangeScale();
    p.interactivity.events.onhover.enable=on(settings.interactive);
    const count=Math.round(num(settings.density,110,35,180));
    while(p.particles.array.length>count)p.particles.array.pop();
    seeded(()=>{while(p.particles.array.length<count){const dot=new p.fn.particle(p.particles.color,p.particles.opacity.value);dot.nexusRadius=Math.max(.75,dot.radius);dot.radius=dot.nexusRadius*ratio;p.particles.array.push(dot);}});
    for(const dot of p.particles.array)dot.color.rgb={...rgb};
    draw();
  }
  function draw(dt=0){
    // particlesDraw updates positions once; scale its per-frame speed by actual elapsed time.
    p.particles.move.enable=dt>0;p.particles.move.speed=num(settings.speed,.7,0,2)*dt*60*ratio;
    seeded(()=>p.fn.particlesDraw());p.particles.move.enable=false;
    if(on(settings.glow)){
      const rgb=p.particles.line_linked.color_rgb_line;c.save();c.globalCompositeOperation='screen';
      for(const dot of p.particles.array){const r=Math.max(2,dot.radius*4.2),g=c.createRadialGradient(dot.x,dot.y,0,dot.x,dot.y,r);g.addColorStop(0,`rgba(${rgb.r},${rgb.g},${rgb.b},${dot.opacity*.15})`);g.addColorStop(.25,`rgba(${rgb.r},${rgb.g},${rgb.b},${dot.opacity*.06})`);g.addColorStop(1,`rgba(${rgb.r},${rgb.g},${rgb.b},0)`);c.fillStyle=g;c.beginPath();c.arc(dot.x,dot.y,r,0,Math.PI*2);c.fill();}
      c.restore();
    }
  }
  function stop(){clearTimeout(timer);cancelAnimationFrame(frame);last=0;}
  function animate(now){if(paused||document.hidden){stop();return;}const begin=performance.now(),dt=last?Math.min(.10,(now-last)/1000):0;last=now;draw(dt);timer=setTimeout(()=>{frame=requestAnimationFrame(animate);},Math.max(0,1000/fps-(performance.now()-begin)-3));}
  function start(){stop();if(!paused&&!document.hidden)frame=requestAnimationFrame(animate);}
  canvas.addEventListener('mousemove',e=>{const box=canvas.getBoundingClientRect();p.interactivity.mouse.pos_x=(e.clientX-box.left)*ratio;p.interactivity.mouse.pos_y=(e.clientY-box.top)*ratio;});
  canvas.addEventListener('mouseleave',()=>{p.interactivity.status='mouseleave';});
  addEventListener('resize',()=>{resize();draw();});document.addEventListener('visibilitychange',start);
  api?.onSettingsChanged(v=>{settings={...settings,...v};apply();});api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});
  api?.onPerformanceChanged(v=>{fps=num(v,30,1,reduced?15:60);resize();draw();start();});
  resize();apply();
  if(preview!==null||reduced){const seconds=num(preview??12,12,0,120);for(let i=0;i<seconds*60;i++)draw(1/60);draw();}else start();
})();
