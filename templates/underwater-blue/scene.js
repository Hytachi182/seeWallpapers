/* Original offline underwater shader with bounded current-borne foreground particles. */
(() => {
  'use strict';
  const canvas=document.getElementById('sea'),overlay=document.getElementById('life'),c=overlay.getContext('2d'),fallback=document.getElementById('fallback'),api=window.seeWallpaper;
  const defaults=JSON.parse(document.getElementById('defaults').textContent);let settings={...defaults,...api?.getSettings?.()};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),num=(v,d,a,b)=>clamp(Number.isFinite(Number(v))?Number(v):d,a,b),on=v=>v!==false&&v!=='false'&&v!==0;
  const preview=new URLSearchParams(location.search).get('preview'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let seed=preview!==null?598721:Date.now()>>>0;
  function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
  const specks=Array.from({length:105},()=>({x:random(),y:random(),r:.3+random()*1.3,alpha:.06+random()*.16,rate:.15+random()*.35,phase:random()*Math.PI*2}));
  const bubbles=Array.from({length:54},(_,i)=>({x:[.17,.54,.86][i%3]+(random()-.5)*.025,phase:random(),rate:.078+random()*.042,r:1.5+random()*4.4}));
  const fish=[
    {phase:.14,rate:.021,dir:1,y:.53,size:156,depth:.12,stroke:.9},
    {phase:.71,rate:.017,dir:-1,y:.66,size:122,depth:.25,stroke:.1},
    {phase:.31,rate:.024,dir:1,y:.40,size:92,depth:.42,stroke:.4},
    {phase:.92,rate:.019,dir:-1,y:.49,size:106,depth:.32,stroke:.65}
  ];
  const shoal=Array.from({length:8},(_,i)=>({phase:.39+i*.014+(random()-.5)*.005,rate:.014,dir:-1,y:.285+(i%3)*.023+(random()-.5)*.012,size:38+random()*14,depth:.62,stroke:i*.13}));
  const fishArt=new Image(),fishFrames=[];
  let time=preview!==null?num(preview,12,0,120):0,paused=preview!==null||reduced,fps=reduced?15:30,last=0,timer=0,frame=0;
  let gl,program,texture,uniforms,ready=false,lost=false,failed=false,w=1920,h=1080,photoReady=false,fishReady=false;const photo=new Image();
  function prepareFish(){
    // Cached raster deformations keep the fish head stable while its rear body and tail beat.
    // The generated transparent source stays unchanged on disk.
    const fw=512,fh=Math.round(fw*fishArt.naturalHeight/fishArt.naturalWidth),columns=64;
    for(let frameIndex=0;frameIndex<24;frameIndex++){
      const atlas=document.createElement('canvas');atlas.width=fw;atlas.height=fh+32;const ac=atlas.getContext('2d'),phase=frameIndex/24*Math.PI*2;
      for(let i=0;i<columns;i++){
        const u=(i+.5)/columns,flex=Math.pow(Math.max(0,(.74-u)/.74),2),offset=Math.sin(phase+u*4.5)*flex*fh*.105;
        const sx=i*fishArt.naturalWidth/columns,sw=fishArt.naturalWidth/columns;
        ac.drawImage(fishArt,sx,0,Math.min(sw+1,fishArt.naturalWidth-sx),fishArt.naturalHeight,i*fw/columns,16+offset,fw/columns+.45,fh);
      }fishFrames.push(atlas);
    }
  }
  function fishPose(f,t=time){const phase=(f.phase+t*f.rate)%1;return {x:f.dir>0?phase*1.32-.16:1.16-phase*1.32,y:f.y+Math.sin(t*.72+f.stroke*6.28)*.008,tail:Math.floor(((t*(1.55-f.depth*.55)+f.stroke)%1)*24)};}
  function drawFish(f){
    const pose=fishPose(f),scale=Math.max(.46,Math.min(w,h)/1080),width=f.size*scale,height=width*fishArt.naturalHeight/fishArt.naturalWidth,pad=width/512*16;
    c.save();c.translate(pose.x*w,pose.y*h);c.scale(f.dir,1);c.rotate(Math.cos(time*.72+f.stroke*6.28)*.018);
    c.globalAlpha=.94-f.depth*.55;c.drawImage(fishFrames[pose.tail],-width/2,-height/2-pad,width,height+pad*2);c.restore();
  }
  function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw new Error(error);}return shader;}
  function initialize(){
    gl=canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl){showFallback('Enable graphics acceleration to animate this underwater scene.');return false;}
    const vs=compile(gl.VERTEX_SHADER,'attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}'),fs=compile(gl.FRAGMENT_SHADER,document.getElementById('fragment').textContent);
    program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
    const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    uniforms=Object.fromEntries(['photograph','resolution','imageSize','time','illumination','refraction','rays','caustics'].map(k=>[k,gl.getUniformLocation(program,k)]));
    texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,photo);gl.uniform1i(uniforms.photograph,0);
    fallback.hidden=true;overlay.hidden=false;return true;
  }
  function resize(){const ratio=Math.min(devicePixelRatio||1,1,Math.sqrt((fps<=15?921600:2073600)/Math.max(1,innerWidth*innerHeight)));w=Math.max(1,Math.round(innerWidth*ratio));h=Math.max(1,Math.round(innerHeight*ratio));canvas.width=overlay.width=w;canvas.height=overlay.height=h;if(gl&&!lost)gl.viewport(0,0,w,h);}
  function drawLife(){
    c.clearRect(0,0,w,h);const scale=Math.max(.35,Math.min(w,h)/1080);
    if(on(settings.school))for(const f of shoal)drawFish(f);
    if(on(settings.particles))for(const p of specks){const x=((p.x+time*.012*p.rate)%1)*w,y=((p.y+Math.sin(time*p.rate+p.phase)*.015+1)%1)*h,r=Math.max(.35,p.r*scale);c.fillStyle=`rgba(213,235,231,${p.alpha*1.2})`;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
    if(on(settings.fish))for(const f of [...fish].sort((a,b)=>b.depth-a.depth))drawFish(f);
    if(on(settings.bubbleStreams))for(const p of bubbles){const progress=(time*p.rate+p.phase)%1,x=(p.x+Math.sin(time*.7+p.phase*6.28)*.010)*w,y=(1.06-progress*1.12)*h,r=p.r*scale*(.8+progress*.65),fade=Math.sin(progress*Math.PI);const g=c.createRadialGradient(x-r*.3,y-r*.35,r*.1,x,y,r);g.addColorStop(0,`rgba(222,245,251,${.035*fade})`);g.addColorStop(.75,'rgba(213,240,248,0)');g.addColorStop(1,`rgba(207,237,247,${.10*fade})`);c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.strokeStyle=`rgba(204,236,243,${.30*fade})`;c.lineWidth=Math.max(.55,scale*.7);c.stroke();c.fillStyle=`rgba(239,253,255,${.55*fade})`;c.beginPath();c.arc(x-r*.33,y-r*.40,Math.max(.4,r*.20),0,Math.PI*2);c.fill();}
  }
  function draw(){if(!ready||lost||failed)return;gl.uniform2f(uniforms.resolution,w,h);gl.uniform2f(uniforms.imageSize,photo.naturalWidth,photo.naturalHeight);gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.illumination,num(settings.light,1,.3,1.8));gl.uniform1f(uniforms.refraction,num(settings.refraction,.6,0,2));gl.uniform1f(uniforms.rays,on(settings.rays)?1:0);gl.uniform1f(uniforms.caustics,on(settings.caustics)?1:0);gl.drawArrays(gl.TRIANGLES,0,6);drawLife();}
  function stop(){clearTimeout(timer);cancelAnimationFrame(frame);last=0;}
  function animate(now){if(paused||!ready||lost||failed||document.hidden){stop();return;}const startTime=performance.now();if(last)time+=Math.min(.15,(now-last)/1000)*num(settings.speed,1,0,2);last=now;draw();timer=setTimeout(()=>{frame=requestAnimationFrame(animate);},Math.max(0,1000/fps-(performance.now()-startTime)-3));}
  function start(){stop();if(!paused&&ready&&!lost&&!failed&&!document.hidden)frame=requestAnimationFrame(animate);}
  function showFallback(message){ready=false;failed=true;stop();overlay.hidden=true;fallback.hidden=false;document.getElementById('error').hidden=false;document.getElementById('error').textContent=message;}
  addEventListener('resize',()=>{resize();draw();});document.addEventListener('visibilitychange',start);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;stop();overlay.hidden=true;fallback.hidden=false;document.getElementById('error').hidden=false;});
  canvas.addEventListener('webglcontextrestored',()=>{lost=false;failed=false;try{ready=initialize();resize();draw();start();}catch(error){showFallback('Unable to restore underwater rendering. Reapply this wallpaper to retry.');console.error(error);}});
  api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});api?.onSettingsChanged(v=>{settings={...settings,...v};draw();});api?.onPerformanceChanged(v=>{fps=num(v,30,1,reduced?15:60);resize();draw();start();});
  function loadScene(){if(!photoReady||!fishReady)return;try{ready=initialize();resize();draw();start();}catch(error){showFallback('Unable to render this underwater scene. Reapply it to retry.');console.error(error);}}
  resize();photo.onload=()=>{photoReady=true;loadScene();};
  fishArt.onload=()=>{prepareFish();fishReady=true;loadScene();};fishArt.onerror=()=>showFallback('The fish artwork could not be loaded. Reinstall this wallpaper to restore it.');fishArt.src=window.underwaterFish||'fish.png';
  photo.onerror=()=>showFallback('The underwater photograph could not be loaded. Reinstall this wallpaper to restore it.');photo.src=window.underwaterPhotograph||'background.jpg';
})();
