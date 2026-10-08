import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

// Exercise actual frame scheduling without drawing or relying on machine speed.
for (const fps of [15,30,60]) {
  const queued=new Map(), updates=[]; let serial=0, active=true;
  const context={window:{},requestAnimationFrame:cb=>{queued.set(++serial,cb);return serial;},cancelAnimationFrame:id=>queued.delete(id)};
  vm.runInNewContext(readFileSync(new URL('./living-scene-motion.js',import.meta.url),'utf8'),context);
  const animation=context.window.seeLivingMotion.clock({active:()=>active,speed:()=>1,fps:()=>fps,update:dt=>updates.push(dt)});
  animation.start();animation.start();assert.equal(queued.size,1,'Repeated starts keep one loop');
  for(let frame=1;frame<=121;frame++){
    const callbacks=[...queued.values()];queued.clear();callbacks.forEach(cb=>cb(frame*1000/60));
  }
  assert.ok(Math.abs(updates.length-fps*2)<=1,`${fps} FPS frame budget`);
  assert.ok(Math.abs(updates.reduce((a,b)=>a+b,0)-2)<.025,'Animation speed follows elapsed time, without recounting remainder');
  active=false;const callbacks=[...queued.values()];queued.clear();callbacks.forEach(cb=>cb(2100));
  assert.equal(queued.size,0,'Inactive scenes do not schedule frames');
  animation.stop();assert.equal(queued.size,0);
}
console.log('Living scene clock: 15/30/60 FPS, elapsed-time speed, repeated start and inactive suspension verified');
