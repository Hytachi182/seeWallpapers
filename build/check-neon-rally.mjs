// Verify production physics through hooks added only inside this test VM.
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../templates/neon-rally/scene.js',import.meta.url),'utf8');
const gradient={addColorStop(){}};
const ctx=new Proxy({}, {get:(_,name)=>name==='createLinearGradient'?()=>gradient:()=>{},set:()=>true});
function create(width=1920){
  const sandbox={console,URLSearchParams,Date,location:{search:'?preview=12'},innerWidth:width,innerHeight:1080,
    document:{querySelector:()=>({getContext:()=>ctx}),getElementById:()=>({textContent:'{"color":"#77ead5","speed":1,"trail":true,"glow":true,"stats":true}'}),addEventListener(){}},
    window:{},matchMedia:()=>({matches:false}),addEventListener(){},clearTimeout(){},cancelAnimationFrame(){},setTimeout(){},requestAnimationFrame(){}};
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/\}\)\(\);\s*$/,`globalThis.game={update,draw,newMatch,predict,pointTo,
    setup:(x,y,vx,vy)=>{phase='play';rally=0;trail=[];ball={x,y,vx,vy};paddles.forEach(p=>{p.y=195;p.target=195;p.reaction=99;});},
    state:()=>({ball:{...ball},paddles,score,wins,match,points,returns,wallHits,longest,rally,trail,phase,server,winner})};})();`),sandbox);
  return sandbox.game;
}
const a=create(),b=create();assert.equal(JSON.stringify(a.state()),JSON.stringify(b.state()),'Preview must match');
for(let i=0;i<120*600;i++){
  a.update(1/120);
  if(i%600===0){a.draw();const s=a.state();assert.ok(s.trail.length<=28);assert.ok(Number.isFinite(s.ball.x)&&Number.isFinite(s.ball.y));for(const p of s.paddles)assert.ok(p.y>=113&&p.y<=277);assert.ok(Math.hypot(s.ball.vx,s.ball.vy)<=490.0001);}
}
const s=a.state();assert.ok(s.match>=5,`Matches must finish: ${s.match}`);assert.ok(s.points>50,`Games must keep scoring: ${s.points}`);assert.ok(s.returns>100);assert.ok(s.wallHits>100);assert.ok(s.longest>=3,'There must be real rallies');assert.ok(s.wins.every(x=>x>0),'Both players must be able to win');
const walls=create();walls.setup(320,94,100,-240);walls.update(1/120);assert.ok(walls.state().ball.vy>0);walls.setup(320,296,100,240);walls.update(1/120);assert.ok(walls.state().ball.vy<0);
const left=create();left.setup(48,195,-490,0);left.update(1/120);assert.ok(left.state().ball.vx>0,'Left paddle must return ball');assert.equal(left.state().rally,1);
const right=create();right.setup(592,195,490,0);right.update(1/120);assert.ok(right.state().ball.vx<0,'Right paddle must return ball');
const miss=create();miss.newMatch();miss.setup(-3,100,-240,0);miss.update(1/120);assert.equal(miss.state().score[1],1);assert.equal(miss.state().phase,'serve');miss.update(1.01);assert.equal(miss.state().phase,'play');
const finish=create();finish.newMatch();const previous=finish.state().match;for(let i=0;i<7;i++)finish.pointTo(0);assert.equal(finish.state().phase,'match');assert.equal(finish.state().winner,0);const wins=finish.state().wins[0];finish.update(2.7);assert.equal(finish.state().match,previous+1);assert.equal(finish.state().score[0]+finish.state().score[1],0);assert.equal(finish.state().wins[0],wins);
const prediction=create();prediction.setup(320,150,100,200);assert.ok(prediction.predict(593)>=93&&prediction.predict(593)<=297,'Prediction must fold multiple wall rebounds');
create(390).draw();
console.log(`Neon Rally: wall/paddle rebounds, misses, scoring, serve, first-to-seven and restart verified. Ten minutes: ${s.match} matches, ${s.points} points, ${s.returns} returns, ${s.wallHits} wall rebounds; longest rally ${s.longest}.`);
