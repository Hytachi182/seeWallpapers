// Exercise actual combat rules through VM-only hooks.
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../templates/rooftop-rivals/scene.js',import.meta.url),'utf8');
const gradient={addColorStop(){}};
const ctx=new Proxy({}, {get:(_,name)=>name==='createLinearGradient'?()=>gradient:()=>{},set:()=>true});
function create(width=1920){
  const sandbox={console,URLSearchParams,Date,location:{search:'?preview=12'},innerWidth:width,innerHeight:1080,
    document:{querySelector:()=>({getContext:()=>ctx}),getElementById:()=>({textContent:'{"color":"#69e6ce","speed":1,"rain":true,"effects":true,"stats":true}'}),addEventListener(){}},
    window:{},matchMedia:()=>({matches:false}),addEventListener(){},clearTimeout(){},cancelAnimationFrame(){},setTimeout(){},requestAnimationFrame(){}};
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/\}\)\(\);\s*$/,`globalThis.game={update,draw,startRound,newMatch,
    hit:guard=>{phase='fight';fighters[1].hp=100;fighters[1].action=guard?'guard':'idle';damage(fighters[0],fighters[1],moves.punch);},
    knockout:()=>{phase='fight';fighters[1].hp=1;damage(fighters[0],fighters[1],moves.kick);},
    timeout:draw=>{phase='fight';clock=.001;fighters[0].hp=draw?100:90;fighters[1].hp=100;fighters.forEach(f=>{f.action='idle';f.think=99;});},
    melee:elevated=>{phase='fight';fighters=[fighter(0),fighter(1)];fighters[0].x=260;fighters[1].x=300;fighters[1].y=elevated?85:0;fighters[1].vy=0;fighters[1].think=99;act(fighters[0],'punch');fighters[0].age=.14;},
    state:()=>({fighters,bolts,sparks,wins,round,clock,phase,winner,matches,roundsDone,hits,blocks,projectileHits,jumps,combos})};})();`),sandbox);
  return sandbox.game;
}
const a=create(),b=create();assert.equal(JSON.stringify(a.state()),JSON.stringify(b.state()),'Preview must be deterministic');
for(let i=0;i<120*600;i++){
  a.update(1/120);
  if(i%600===0){a.draw();const s=a.state();assert.ok(s.bolts.length<=16&&s.sparks.length<=140);for(const f of s.fighters){assert.ok(f.hp>=0&&f.hp<=100);assert.ok(Number.isFinite(f.x)&&Number.isFinite(f.y));assert.ok(f.x>=20&&f.x<=620);}}
}
const s=a.state();assert.ok(s.matches>=5,`Matches must finish: ${s.matches}`);assert.ok(s.hits>150);assert.ok(s.blocks>10);assert.ok(s.projectileHits>5);assert.ok(s.jumps>10);assert.ok(s.combos>10);
const rules=create();rules.hit(false);assert.equal(rules.state().fighters[1].hp,91);assert.equal(rules.state().fighters[1].action,'stun');rules.hit(true);assert.equal(rules.state().fighters[1].hp,98,'Guard reduces damage');
const close=create();close.melee(false);close.update(.01);assert.equal(close.state().fighters[1].hp,91,'In-range punch must hit');
const airborne=create();airborne.melee(true);airborne.update(.01);assert.equal(airborne.state().fighters[1].hp,100,'Height must affect melee collision');
const knockout=create();knockout.newMatch();knockout.knockout();assert.equal(knockout.state().phase,'result');assert.equal(knockout.state().wins[0],1);knockout.update(2.6);assert.equal(knockout.state().round,2);assert.equal(knockout.state().fighters[1].hp,100);knockout.knockout();knockout.update(2.6);assert.equal(knockout.state().phase,'match');knockout.update(2.7);assert.equal(knockout.state().matches,3);assert.equal(knockout.state().wins[0],0);
const timeout=create();timeout.timeout(false);timeout.update(.01);assert.equal(timeout.state().winner,1,'Higher health wins timeout');const draw=create();draw.timeout(true);draw.update(.01);assert.equal(draw.state().winner,-1);assert.equal(draw.state().wins[0]+draw.state().wins[1],0,'Draw must not award a round');
create(390).draw();
console.log(`Rooftop Rivals: damage/guard, airborne evasion, knockout, timeout/draw, best-of-three and restart verified. Ten minutes: ${s.matches} matches, ${s.roundsDone} finished rounds, ${s.hits} hits, ${s.blocks} blocks, ${s.projectileHits} pulse hits, ${s.combos} combos.`);
