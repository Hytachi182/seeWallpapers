import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../templates/velvet-circuit/scene.js',import.meta.url),'utf8');
const gradient={addColorStop(){}};
const ctx=new Proxy({}, {get:(_,name)=>['createLinearGradient','createRadialGradient'].includes(name)?()=>gradient:()=>{},set:()=>true});
function create(width=1920){
  const callbacks={};
  const sandbox={console,URLSearchParams,location:{search:'?preview=12'},innerWidth:width,innerHeight:1080,devicePixelRatio:1,
    document:{querySelector:()=>({getContext:()=>ctx}),getElementById:()=>({textContent:'{"color":"#efb969","speed":1,"lights":true,"glass":true,"stats":true}'}),addEventListener(){}},
    window:{seeWallpaper:{getSettings:()=>({}),onSettingsChanged:f=>callbacks.settings=f,onPause:f=>callbacks.pause=f,onResume:f=>callbacks.resume=f,onPerformanceChanged:f=>callbacks.fps=f}},
    matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},clearTimeout(){},cancelAnimationFrame(){},setTimeout(){},requestAnimationFrame(){}};
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/\}\)\(\);\s*$/,`globalThis.game={update,draw,launch,prepare,newGame,drain,segmentContact,circleContact,driveFlippers,addScore,
    state:()=>({ball,phase,age,ballNumber,score,high,games,multiplier,bumperHits,flipperHits,slingHits,targetHits,launches,drains,nudges,collisions,particles,flippers,targets,rollovers,bumpers}),
    place:(x,y,vx,vy)=>{phase='play';ball={x,y,vx,vy,spin:0};},
    resetBumper:()=>{bumpers[0].cool=0;},
    bank:()=>{targets.forEach(t=>t.down=true);},
    resetFlippers:()=>flippers.forEach(f=>{f.angle=f.rest;f.hold=0;f.cool=0;f.omega=0;})};})();`),sandbox);
  return {game:sandbox.game,callbacks};
}
const {game:a}=create(),{game:b}=create();assert.equal(JSON.stringify(a.state()),JSON.stringify(b.state()),'Preview must be deterministic');
const bats=a.state().flippers;
const tipGap=bats[1].x+Math.cos(bats[1].rest)*bats[1].length-(bats[0].x+Math.cos(bats[0].rest)*bats[0].length)-bats[0].radius-bats[1].radius;
assert.ok(tipGap>20,'Resting bat tips must allow a full-diameter ball to drain');
const {game:rules}=create();
rules.place(9,500,-100,0);rules.segmentContact({ax:0,ay:400,bx:0,by:600,radius:4,e:.8});assert.ok(rules.state().ball.x>=14&&rules.state().ball.vx>0,'Rail collision resolves penetration and reflects velocity');
rules.resetBumper();const bumper=rules.state().bumpers[0],before=rules.state().score;
rules.place(bumper.x+40,bumper.y,-100,0);rules.circleContact(bumper,true);assert.ok(rules.state().ball.vx>200,'Powered bumper adds an outward impulse');assert.equal(rules.state().score-before,100*rules.state().multiplier);
const same=rules.state().score;rules.place(bumper.x+40,bumper.y,-100,0);rules.circleContact(bumper,true);assert.equal(rules.state().score,same,'Bumper cooldown prevents score duplication');
rules.resetFlippers();rules.place(-49,810,0,260);const initial=rules.state().flipperHits;for(let i=0;i<30;i++)rules.update(1/240);assert.ok(rules.state().flipperHits>initial,'Reactive flipper must contact an incoming ball');assert.ok(rules.state().ball.vy<0,'Moving flipper sends the ball upwards');
const high=rules.state().high;rules.prepare();assert.equal(rules.state().phase,'ready');rules.update(1.4);assert.equal(rules.state().phase,'play');assert.ok(rules.state().ball.vy<-1000,'Spring launcher produces an upward physical velocity');
rules.place(0,950,0,200);rules.update(1/240);assert.equal(rules.state().phase,'drain');rules.update(1.6);assert.equal(rules.state().ballNumber,2);assert.equal(rules.state().phase,'ready');
rules.addScore(12345);rules.newGame();assert.equal(rules.state().score,0);assert.ok(rules.state().high>=high+12345);assert.equal(rules.state().ballNumber,1,'New game resets to three-ball sequence');
rules.bank();const old=rules.state().multiplier;rules.place(0,580,0,30);rules.update(1/240);assert.equal(rules.state().multiplier,Math.min(5,old+1),'Completed target bank increases bonus multiplier');
const {game:long}=create();
let longestFlight=0,maxSpeed=0,restDuration=0,longestRest=0;
for(let i=0;i<240*1200;i++){
  long.update(1/240);
  const current=long.state();restDuration=current.phase==='play'&&Math.hypot(current.ball.vx,current.ball.vy)<28?restDuration+1/240:0;longestRest=Math.max(longestRest,restDuration);
  if(i%240===0){const s=long.state();longestFlight=Math.max(longestFlight,s.phase==='play'?s.age:0);maxSpeed=Math.max(maxSpeed,Math.hypot(s.ball.vx,s.ball.vy));}
  if(i%1200===0){long.draw();const s=long.state();assert.ok(Number.isFinite(s.ball.x)&&Number.isFinite(s.ball.y)&&Number.isFinite(s.ball.vx)&&Number.isFinite(s.ball.vy));assert.ok(s.particles.length<=64);assert.ok(s.ballNumber>=1&&s.ballNumber<=3);assert.ok(s.multiplier>=1&&s.multiplier<=5);}
}
const s=long.state();console.log(JSON.stringify({games:s.games,launches:s.launches,drains:s.drains,bumperHits:s.bumperHits,flipperHits:s.flipperHits,slingHits:s.slingHits,targetHits:s.targetHits,high:s.high,nudges:s.nudges,longestFlight,maxSpeed}));
assert.ok(s.games>=5,`Games restart: ${s.games}`);assert.ok(s.flipperHits>30,`Flipper contacts: ${s.flipperHits}`);assert.ok(s.bumperHits>50,`Bumper contacts: ${s.bumperHits}`);assert.ok(s.targetHits>20);assert.ok(s.high>1000);assert.ok(maxSpeed<=1450.01);assert.ok(longestRest<3,'No indefinitely resting ball');
const portrait=create(390);portrait.game.draw();portrait.callbacks.settings({color:'#ff4455',glass:false,lights:false,stats:false,speed:0});portrait.game.draw();
console.log('Velvet Circuit: rail reflection, pop-bumper impulse and cooldown, physical flipper hit, spring launch, drain/relaunch, score/high score, bonus bank and twenty-minute autonomous play verified.');
