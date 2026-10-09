/* Original offline scene motion. Sync copies with build/sync-living-scene-motion.py. */
(() => {
  'use strict';
  const random = n => { const k = Math.sin(n * 127.1 + 311.7) * 43758.5453; return k - Math.floor(k); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function world(c, geometry, action) {
    c.save(); c.translate(geometry.ox, geometry.oy); c.scale(geometry.aw, geometry.ah);
    action(); c.restore();
  }
  function outline(c, points) {
    c.beginPath(); points.forEach(([x,y], i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath();
  }
  function petals(c, g, time, density, color) {
    world(c, g, () => {
      const gust = Math.sin(time * .31) * .025 + Math.sin(time * .67) * .007;
      for (let i=0; i<Math.round(28*density); i++) {
        const depth=i%3, phase=(time*(.018+depth*.009)+random(i+31))%1;
        const x=1.12-phase*1.3+gust, y=.06+random(i+63)*.86+phase*.15+Math.sin(time*.55+i)*(.008+depth*.007);
        const r=.0013+depth*.0012, spin=time*(.45+random(i+81)*.3)+i;
        const fade=Math.min(1,phase*12,(1-phase)*12);
        c.save(); c.translate(x,y); c.rotate(Math.sin(spin)*.65+spin*.28);
        c.scale(.28+Math.abs(Math.sin(spin))*.72,g.aw/g.ah);
        c.globalAlpha=(.32+depth*.24)*fade; c.fillStyle=color;
        c.beginPath(); c.moveTo(-r,0); c.bezierCurveTo(-r*.8,-r,r*.4,-r*1.1,r,0);
        c.bezierCurveTo(r*.3,r*.8,-r*.6,r*.6,-r,0); c.fill();
        c.strokeStyle='rgba(255,235,214,.3)'; c.lineWidth=.00025;
        c.beginPath(); c.moveTo(-r*.6,0); c.quadraticCurveTo(0,-r*.2,r*.6,0); c.stroke(); c.restore();
      }
    });
  }
  function water(c,g,art,time,points,{strength=1,light='#dcfff5',caustics=false}={}) {
    const ys=points.map(p=>p[1]), lo=Math.min(...ys), hi=Math.max(...ys);
    world(c,g,()=>{
      outline(c,points); c.clip();
      // One source-pixel row per sample: continuous refraction, no wide strip jumps.
      for(let row=Math.floor(lo*art.height);row<Math.ceil(hi*art.height);row++){
        const y=row/art.height, depth=(y-lo)/(hi-lo);
        const dx=(Math.sin(y*89-time*1.4)*.0016+Math.sin(y*173+time*.85)*.0008)*strength;
        c.drawImage(art,0,row,art.width,1,dx,y,1,1/art.height+.00003);
        if(caustics && row%10===0){
          c.globalAlpha=.10; c.strokeStyle=light; c.lineWidth=.00065;
          c.beginPath();
          for(let j=0;j<=42;j++){
            const x=j/42, yy=y+Math.sin(x*35+y*61+time*.9)*.003+Math.sin(x*57-time*.7)*.001;
            j?c.lineTo(x,yy):c.moveTo(x,yy);
          } c.stroke(); c.globalAlpha=1;
        }
        // Coherent sunlight/moonlight glides with the waves instead of random sparkles.
        if(row%5===0){
          const x=.12+(.5+.5*Math.sin(y*107-time*.75))*.32;
          c.globalAlpha=(.035+.055*depth)*strength; c.fillStyle=light;
          c.fillRect(x,y,.004+depth*.014,.0008); c.globalAlpha=1;
        }
      }
    });
  }
  function lanterns(c,g,time,spots){
    world(c,g,()=>{
      c.globalCompositeOperation='screen';
      spots.forEach(([x,y,size=1],i)=>{
        const flicker=.7+.16*Math.sin(time*6.4+i*3.1)+.09*Math.sin(time*10.7+i);
        const lean=Math.sin(time*3.1+i)*.0008, r=.017*size;
        const glow=c.createRadialGradient(x,y,0,x,y,r);
        glow.addColorStop(0,`rgba(255,190,89,${.17*flicker})`); glow.addColorStop(1,'rgba(255,170,75,0)');
        c.fillStyle=glow; c.fillRect(x-r,y-r,r*2,r*2);
        c.save();c.translate(x,y);c.scale(1,g.aw/g.ah);
        c.fillStyle=`rgba(255,191,82,${.55*flicker})`;
        c.beginPath();c.moveTo(-.0016*size,0);
        c.bezierCurveTo(-.002*size,-.004*size,lean,-.008*size*flicker,lean,-.007*size*flicker);
        c.bezierCurveTo(.0025*size,-.004*size,.002*size,0,-.0016*size,0);c.fill();
        c.fillStyle=`rgba(255,245,197,${.8*flicker})`;c.beginPath();c.ellipse(0,-.002*size,.00065*size,.0021*size,0,0,Math.PI*2);c.fill();c.restore();
      });
    });
  }
  function birds(c,g,time,color){
    world(c,g,()=>{
      const phase=(time*.022)%1;
      c.strokeStyle=color;c.lineWidth=.0006;c.lineCap='round';
      for(let i=0;i<3;i++){
        const x=-.06+phase*.62-i*.021,y=.32-i*.011+Math.sin(time*.55+i)*.008;
        const flap=Math.sin(time*4.8+i)*.003;
        c.beginPath();c.moveTo(x-.004,y+flap);c.quadraticCurveTo(x-.002,y-.001,x,y);
        c.quadraticCurveTo(x+.002,y-.001,x+.004,y+flap);c.stroke();
      }
    });
  }
  function clock({active, speed, fps, update}) {
    let frame=0,last=0,elapsed=0;
    function tick(now){
      if(!active()){stop();return;}
      const dt=last?Math.min(.1,(now-last)/1000):0;last=now;elapsed+=dt;
      const step=1/clamp(fps(),1,60);
      if(elapsed+1e-5>=step){const advance=elapsed;elapsed=0;update(advance*speed());}
      frame=requestAnimationFrame(tick);
    }
    function stop(){cancelAnimationFrame(frame);frame=0;last=0;elapsed=0;}
    return {stop,start(){stop();if(active())frame=requestAnimationFrame(tick);}};
  }
  window.seeLivingMotion={petals,water,lanterns,birds,clock};
})();
