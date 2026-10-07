import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../templates/burrow-battle/scene.js',import.meta.url),'utf8');
const gradient={addColorStop(){}};
const ctx=new Proxy({}, {get:(_,name)=>name==='createLinearGradient'?()=>gradient:()=>{},set:()=>true});
function create(width=1920){
  const callbacks={};
  const sandbox={console,URLSearchParams,Math,location:{search:'?preview=12'},innerWidth:width,innerHeight:1080,
    document:{querySelector:()=>({getContext:()=>ctx}),getElementById:()=>({textContent:'{"color":"#79e0be","speed":1,"effects":true,"clouds":true,"stats":true}'}),addEventListener(){}},
    window:{seeWallpaper:{getSettings:()=>({}),onSettingsChanged:f=>callbacks.settings=f,onPause:f=>callbacks.pause=f,onResume:f=>callbacks.resume=f,onPerformanceChanged:f=>callbacks.fps=f}},
    matchMedia:()=>({matches:false}),addEventListener(){},clearTimeout(){},cancelAnimationFrame(){},setTimeout(){},requestAnimationFrame(){}};
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/\}\)\(\);\s*$/,`globalThis.game={update,draw,newRound,explode,flight,finish,beginTurn,
    state:()=>({terrain,worms,shot,particles,rings,phase,team,active,turn,round,matches,shots,impacts,damageDone,drownings,craters,wins,wind}),
    setWind:v=>wind=v,
    drown:()=>{worms[0].x=480;worms[0].y=461;worms[0].vy=30;},
    eliminate:t=>worms.filter(w=>w.team===t).forEach(w=>w.hp=0)};})();`),sandbox);
  return {game:sandbox.game,callbacks};
}
const {game:a}=create(),{game:b}=create();assert.equal(JSON.stringify(a.state()),JSON.stringify(b.state()),'Deterministic preview');
const initial=a.state();const x=initial.worms[0].x,y=initial.worms[0].y;
a.explode(x,y,38);assert.ok(a.state().terrain[Math.round(x)]>y+30,'Explosion removes soil');
assert.ok(a.state().worms[0].hp<100,'Blast damages nearby worm');assert.equal(a.state().worms[5].hp,100,'Distant worm is unharmed');
assert.ok(a.state().worms[0].vy<0,'Blast launches worm');
a.setWind(12);const windy=a.flight(0,0,100,-100,1);assert.equal(windy.x,106);assert.equal(windy.y,-10);assert.equal(windy.vx,112);
a.drown();a.update(.2);assert.equal(a.state().worms[0].hp,0);assert.equal(a.state().drownings,1);
const {game:rules}=create();rules.eliminate(1);rules.finish();assert.equal(rules.state().phase,'result');assert.equal(rules.state().wins[0],1);rules.update(4.1);assert.equal(rules.state().round,2);assert.ok(rules.state().worms.every(w=>w.hp===100));
rules.eliminate(0);rules.eliminate(1);rules.finish();assert.equal(rules.state().wins.reduce((n,v)=>n+v,0),1,'Draw awards no win');
const {game:long}=create();
for(let i=0;i<120*1200;i++){
  long.update(1/120);
  if(i%600===0){long.draw();const s=long.state();assert.ok(s.particles.length<=160&&s.rings.length<12);assert.ok(s.terrain.every(Number.isFinite));for(const w of s.worms){assert.ok(w.hp>=0&&w.hp<=100);assert.ok(Number.isFinite(w.x)&&Number.isFinite(w.y));}}
}
const s=long.state();assert.ok(s.matches>=5,`Automatic rematches: ${s.matches}`);assert.ok(s.shots>100);assert.ok(s.impacts>80);assert.ok(s.damageDone>1500);assert.ok(s.drownings>0);assert.ok(s.wins[0]+s.wins[1]>0);
const portrait=create(390);portrait.game.draw();portrait.callbacks.settings({color:'#ff4455',effects:false,stats:false,clouds:false,speed:2});portrait.game.draw();portrait.callbacks.pause();portrait.callbacks.fps(15);portrait.callbacks.resume();
console.log(`Burrow Battle: craters, blast damage/knockback, wind physics, drowning, draw scoring and rematches verified. Twenty minutes: ${s.matches} matches, ${s.shots} shots, ${s.impacts} impacts, ${s.damageDone} damage, ${s.drownings} drownings; wins ${s.wins}.`);
