import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const context={window:{}};
vm.runInNewContext(readFileSync(new URL('../templates/gilded-court/guards.js',import.meta.url),'utf8'),context);
const gait=context.window.seeRoyalGuard.gait;
for(const [width,height]of[[1920,1080],[960,540],[390,844]]){
  const scale=Math.min(height*.27,width*.50)/360,velocity=1.55*width/48;
  const period=gait(0,velocity,scale).period;
  for(const phase of[.08,.20,.40,.55]){
    const t=period*phase,dt=.005,a=gait(t,velocity,scale),b=gait(t+dt,velocity,scale);
    assert.ok(a.grounded&&b.grounded);
    assert.ok(Math.abs((b.x-a.x)*scale+velocity*dt)<1e-8,'Grounded foot cancels world translation');
    assert.equal(a.y,b.y);
  }
  const lift=gait(period*.80,velocity,scale);assert.ok(!lift.grounded&&lift.y<337,'Swing foot lifts');
  for(const boundary of[.62,1]){
    const before=gait(period*(boundary-1e-6),velocity,scale),after=gait(period*(boundary+1e-6),velocity,scale);
    assert.ok(Math.abs(before.x-after.x)<.002&&Math.abs(before.y-after.y)<.002,'Continuous foot placement at stance/swing boundaries');
  }
}
console.log('Royal gait: planted-foot cancellation, lifted swing and continuous stance transitions on desktop and portrait verified');
