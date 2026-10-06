/* Animate the supplied SVG without modifying its embedded image or moving the soldiers. */
(() => {
  'use strict';
  const canvas=document.querySelector('canvas'),c=canvas.getContext('2d',{alpha:false}),api=window.seeWallpaper;
  const defaults=JSON.parse(document.getElementById('defaults').textContent);
  let settings={...defaults,...api?.getSettings?.()};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const num=(v,d,a,b)=>clamp(Number.isFinite(Number(v))?Number(v):d,a,b);
  const on=v=>v!==false&&v!=='false'&&v!==0;
  const rnd=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  const preview=new URLSearchParams(location.search).get('preview'),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let time=preview!==null?num(preview,12,0,120):0,paused=preview!==null||reduced,ready=false,failed=false;
  let w=1920,h=1080,aw=1672,ah=941,ox=0,oy=0,fps=reduced?15:30,last=0,raf=0,timer=0;
  const art=new Image(),smokeLayers=[];
  const X=x=>ox+x*aw,Y=y=>oy+y*ah;
  const fires=[ [.184,.569,.014], [.580,.483,.020], [.606,.475,.010], [.721,.459,.012], [.761,.496,.011], [.890,.492,.025], [.944,.521,.020], [.851,.558,.010], [.685,.636,.009], [.540,.669,.010], [.451,.605,.006], [.265,.574,.005] ];
  // Crops contain smoke-only sky, feathered before slight translation; buildings remain outside.
  const smokeRegions=[ [.705,.322,.066,.098], [.856,.304,.115,.114], [.511,.328,.040,.087], [.443,.296,.054,.110], [.342,.293,.042,.085] ];
  function prepareSmoke() {
    for(const [x,y,sw,sh] of smokeRegions) {
      const layer=document.createElement('canvas');layer.width=Math.round(sw*1672);layer.height=Math.round(sh*941);
      const lc=layer.getContext('2d');lc.drawImage(art,x*1672,y*941,sw*1672,sh*941,0,0,layer.width,layer.height);
      lc.globalCompositeOperation='destination-in';
      const mask=lc.createRadialGradient(layer.width*.5,layer.height*.53,0,layer.width*.5,layer.height*.53,Math.max(layer.width,layer.height)*.51);
      mask.addColorStop(0,'#fff');mask.addColorStop(.35,'#fffd');mask.addColorStop(1,'#fff0');lc.fillStyle=mask;lc.fillRect(0,0,layer.width,layer.height);
      smokeLayers.push({layer,x,y,sw,sh});
    }
  }
  function resize() {
    const ratio=Math.min(devicePixelRatio||1,1.5,Math.sqrt((fps<=15?921600:2073600)/Math.max(1,innerWidth*innerHeight)));
    w=canvas.width=Math.max(1,Math.round(innerWidth*ratio));h=canvas.height=Math.max(1,Math.round(innerHeight*ratio));
    const scale=Math.max(w/1672,h/941);aw=1672*scale;ah=941*scale;
    // Narrow displays retain the main soldier and the adjacent harbour.
    ox=(w-aw)*(w<h?.36:.5);oy=(h-ah)*.5;
  }
  function polygon(points) {c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(X(x),Y(y)):c.moveTo(X(x),Y(y)));c.closePath();}
  function glow(x,y,r,strength,warm=true) {
    const g=c.createRadialGradient(X(x),Y(y),0,X(x),Y(y),r*aw);g.addColorStop(0,warm?`rgba(255,183,82,${strength})`:`rgba(216,224,233,${strength})`);g.addColorStop(.25,`rgba(255,137,48,${strength*.25})`);g.addColorStop(1,'rgba(255,113,38,0)');
    c.fillStyle=g;c.beginPath();c.arc(X(x),Y(y),r*aw,0,Math.PI*2);c.fill();
  }
  function smoke(amount) {
    c.save();
    smokeLayers.forEach((s,i)=>{
      for(let p=0;p<4;p++) {
        const phase=(time*(.13+i*.009)+p*.25+rnd(i+13))%1,fade=Math.sin(phase*Math.PI);
        const driftX=(Math.sin(time*.48+i+phase*3)*.008+phase*.030)*aw,driftY=-phase*.055*ah;
        c.globalAlpha=fade*.55*amount;
        c.drawImage(s.layer,X(s.x)+driftX,Y(s.y)+driftY,s.sw*aw*(1+phase*.18),s.sh*ah*(1+phase*.24));
      }
    });c.restore();
  }
  function fire(amount) {
    c.save();c.globalCompositeOperation='screen';
    for(const [i,[x,y,r]] of fires.entries()) {
      const pulse=.56+.16*Math.sin(time*7.1+i*3.1)+.14*Math.sin(time*13.3+i*7.2);
      glow(x,y,r*2.1,pulse*.49*amount);glow(x,y,r*.48,pulse*.65*amount);
      // Moving tongues remain attached to the burning districts in the painting.
      for(let tongue=0;tongue<7;tongue++) {
        const phase=(time*(.8+rnd(i*13+tongue)) + rnd(i*17+tongue+8))%1;
        const baseX=x+(rnd(i*23+tongue)-.5)*r*1.25,baseY=y+r*.15;
        const tipX=baseX+Math.sin(time*3.2+tongue)*r*.24,tipY=baseY-r*(.55+phase*1.9);
        const g=c.createLinearGradient(X(baseX),Y(baseY),X(tipX),Y(tipY));
        g.addColorStop(0,`rgba(255,230,133,${.65*amount*(1-phase)})`);
        g.addColorStop(.45,`rgba(255,115,26,${.5*amount*(1-phase)})`);g.addColorStop(1,'rgba(255,74,12,0)');
        c.strokeStyle=g;c.lineWidth=Math.max(1,r*aw*(.09+.08*(1-phase)));c.lineCap='round';
        c.beginPath();c.moveTo(X(baseX),Y(baseY));c.quadraticCurveTo(X(baseX-r*.12),Y(baseY-r*.7),X(tipX),Y(tipY));c.stroke();
      }
      // Ember streams have staggered phases and a bounded, deterministic particle count.
      for(let j=0;j<14;j++) {
        const phase=(time*(.15+rnd(i*9+j)*.15)+rnd(i*31+j+70))%1;
        const ex=x+(rnd(i*39+j+4)-.5)*r+Math.sin(time*.6+j)*phase*.008,ey=y-phase*(r*4.6+.035);
        const fade=Math.sin(phase*Math.PI);c.fillStyle=`rgba(255,${Math.round(130+rnd(j+27)*90)},65,${fade*.88*amount})`;
        c.beginPath();c.ellipse(X(ex),Y(ey),Math.max(.4,aw*.0005),Math.max(.7,ah*.0012),-.35,0,Math.PI*2);c.fill();
      }
    }c.restore();
  }
  function tracers(amount) {
    c.save();polygon([[.08,.02],[1,.02],[1,.59],[.48,.55],[.40,.48],[.36,.33],[.29,.21],[.18,.26],[.13,.49],[.08,.40]]);c.clip();c.globalCompositeOperation='screen';
    for(let i=0;i<18;i++) {
      const cycle=time*(.33+rnd(i+9)*.18)+rnd(i+18),phase=cycle%1;if(phase>.26)continue;
      const flight=phase/.26,x0=.16+rnd(i+37)*.76,y0=.19+rnd(i+42)*.32,dx=(rnd(i+12)>.5?1:-1)*(.10+rnd(i+19)*.18),dy=-.03-rnd(i+53)*.08;
      const x=x0+dx*flight,y=y0+dy*flight,fade=Math.sin(flight*Math.PI);
      const tailX=x-dx*.14,tailY=y-dy*.14,g=c.createLinearGradient(X(tailX),Y(tailY),X(x),Y(y));g.addColorStop(0,'rgba(255,138,64,0)');g.addColorStop(1,`rgba(255,218,155,${fade*.8*amount})`);
      c.strokeStyle=g;c.lineWidth=Math.max(.5,aw*.00085);c.beginPath();c.moveTo(X(tailX),Y(tailY));c.lineTo(X(x),Y(y));c.stroke();
    }c.restore();
  }
  const impactSites=[[.58,.49],[.89,.50],[.72,.47],[.54,.66],[.94,.53],[.69,.64]];
  function impactPose(i,t) {
    const phase=(t*.19+i*.173)%1;
    return {phase,blast:Math.max(0,1-phase/.19)**2};
  }
  function impacts(amount) {
    for(const [i,[x,y]] of impactSites.entries()) {
      const {phase,blast}=impactPose(i,time),radius=.013+phase*.10;
      c.save();c.globalCompositeOperation='screen';
      if(blast>0){glow(x,y,.065,blast*.8*amount);glow(x,y,.016,blast*.85*amount);}
      for(let j=0;j<18;j++) {
        const angle=rnd(i*71+j)*Math.PI*2,distance=phase*(.025+rnd(i*41+j)*.07);
        const px=x+Math.cos(angle)*distance,py=y+Math.sin(angle)*distance*.55+phase*phase*.028;
        c.strokeStyle=`rgba(255,${150+Math.round(rnd(j+4)*90)},82,${Math.max(0,1-phase*2.5)*.85*amount})`;
        c.lineWidth=Math.max(.6,aw*.00065);c.beginPath();c.moveTo(X(px),Y(py));
        c.lineTo(X(px-Math.cos(angle)*.004),Y(py-Math.sin(angle)*.002));c.stroke();
      }
      c.restore();
      // The smoke following an impact reuses photographed smoke, cached once.
      const layer=smokeLayers[i%smokeLayers.length].layer;
      c.save();c.globalAlpha=Math.sin(phase*Math.PI)*.50*amount;
      c.drawImage(layer,X(x-radius*.6+phase*.023),Y(y-radius-phase*.045),radius*aw*1.2,radius*ah*1.45);c.restore();
    }
  }
  function aircraft(amount) {
    c.save();c.globalCompositeOperation='screen';
    const pulse=.65+.12*Math.sin(time*23)+.08*Math.sin(time*37);
    glow(.387,.161,.013,pulse*.45*amount);
    // Engine plume follows the painted jet's exhaust; the airframe does not duplicate or drift.
    const nozzle=[.386,.160],tail=[.352-Math.sin(time*18)*.002,.149];
    const g=c.createLinearGradient(X(tail[0]),Y(tail[1]),X(nozzle[0]),Y(nozzle[1]));g.addColorStop(0,'rgba(255,99,31,0)');g.addColorStop(.6,`rgba(255,144,49,${pulse*.18*amount})`);g.addColorStop(1,`rgba(255,239,181,${pulse*.5*amount})`);
    c.strokeStyle=g;c.lineWidth=ah*.006;c.lineCap='round';c.beginPath();c.moveTo(X(tail[0]),Y(tail[1]));c.lineTo(X(nozzle[0]),Y(nozzle[1]));c.stroke();
    glow(.588,.273,.004,(.5+.2*Math.sin(time*21+4))*.45*amount);
    c.restore();
    // Short, low-opacity rotor sweeps sit on the existing hubs rather than spinning the aircraft.
    c.save();c.strokeStyle=`rgba(33,36,36,${.28*amount})`;c.lineCap='round';
    for(const [x,y,r] of [[.872,.108,.088],[.880,.324,.024]]) {
      c.lineWidth=Math.max(.6,ah*.0016);
      for(let j=0;j<3;j++) {const a=time*32+j*Math.PI/3,dx=Math.cos(a)*r,dy=Math.sin(a)*r*.20;c.beginPath();c.moveTo(X(x-dx),Y(y-dy));c.lineTo(X(x+dx),Y(y+dy));c.stroke();}
    }c.restore();
  }
  function water(amount) {
    c.save();polygon([[.421,.544],[.625,.526],[.792,.554],[.927,.580],[.901,.612],[.972,.656],[.941,.707],[.829,.669],[.748,.650],[.672,.619],[.594,.596],[.473,.575]]);c.clip();c.globalCompositeOperation='screen';
    for(let i=0;i<115;i++) {
      const x=.43+rnd(i+41)*.55,y=.544+rnd(i+150)*.17,solar=Math.exp(-(((x-.687)/.055)**2)),pulse=.5+.5*Math.sin(time*(1.5+rnd(i+1))+i*2.4),drift=Math.sin(time*.8+i)*.003;
      c.strokeStyle=`rgba(255,209,134,${(.06+solar*.24)*pulse*amount})`;c.lineWidth=Math.max(.5,ah*.0008);c.beginPath();c.moveTo(X(x+drift),Y(y));c.lineTo(X(x+drift+.002+rnd(i+250)*.012),Y(y));c.stroke();
    }c.restore();
  }
  function draw() {
    if(!ready||failed)return;
    c.globalAlpha=1;c.globalCompositeOperation='source-over';c.drawImage(art,ox,oy,aw,ah);
    const amount=num(settings.intensity,1,0,2);if(amount===0)return;
    c.save();c.beginPath();c.rect(0,0,w,h);
    // Protect original foreground silhouettes from every effect, including broad light blooms.
    const protectedAreas=[
      [[0,0],[.132,0],[.132,.43],[.123,.60],[0,.65]],
      [[.202,.361],[.22,.33],[.252,.316],[.269,.247],[.285,.223],[.321,.224],[.352,.27],[.346,.325],[.364,.365],[.376,.49],[.381,.626],[.369,.715],[.365,.82],[.294,.845],[.266,.823],[.216,.8],[.222,.684],[.221,.57],[.202,.498]],
      [[.076,.591],[.087,.493],[.115,.465],[.14,.44],[.165,.443],[.188,.487],[.20,.524],[.205,.635],[.177,.667],[.133,.675]],
      [[.365,.745],[.373,.658],[.397,.625],[.408,.590],[.435,.603],[.452,.632],[.466,.692],[.481,.768],[.474,.818],[.38,.802]]
    ];
    for(const points of protectedAreas){c.moveTo(X(points[0][0]),Y(points[0][1]));for(const [x,y]of points.slice(1))c.lineTo(X(x),Y(y));c.closePath();}
    c.clip('evenodd');
    if(on(settings.smoke))smoke(amount);if(on(settings.water))water(amount);if(on(settings.fires))fire(amount);if(on(settings.tracers))tracers(amount);if(on(settings.impacts))impacts(amount);if(on(settings.aircraft))aircraft(amount);
    c.restore();
  }
  function stop(){clearTimeout(timer);cancelAnimationFrame(raf);last=0;}
  function animate(now){if(paused||!ready||failed||document.hidden){stop();return;}const begin=performance.now();if(last)time+=Math.min(.15,(now-last)/1000)*num(settings.speed,1,0,2);last=now;draw();timer=setTimeout(()=>{raf=requestAnimationFrame(animate);},Math.max(0,1000/fps-(performance.now()-begin)-3));}
  function start(){stop();if(!paused&&ready&&!failed&&!document.hidden)raf=requestAnimationFrame(animate);}
  addEventListener('resize',()=>{resize();draw();});document.addEventListener('visibilitychange',start);
  api?.onPause(()=>{paused=true;stop();});api?.onResume(()=>{paused=false;start();});
  api?.onSettingsChanged(v=>{settings={...settings,...v};draw();});api?.onPerformanceChanged(v=>{fps=num(v,30,1,reduced?15:60);resize();draw();start();});
  art.onload=()=>{ready=true;prepareSmoke();resize();document.getElementById('fallback').hidden=true;draw();start();};
  art.onerror=()=>{failed=true;stop();document.getElementById('error').hidden=false;};
  resize();art.src='artwork.svg';
})();
