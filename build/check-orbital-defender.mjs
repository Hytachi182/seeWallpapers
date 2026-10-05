// Test actual gameplay through VM-only hooks, never shipped in the template.
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source=await readFile(new URL('../templates/orbital-defender/scene.js',import.meta.url),'utf8');
const ctx=new Proxy({}, {get:()=>()=>{},set:()=>true});
function create(width=1920) {
  const sandbox={console,URLSearchParams,Date,location:{search:'?preview=12'},innerWidth:width,innerHeight:1080,
    document:{querySelector:()=>({getContext:()=>ctx}),getElementById:()=>({textContent:'{"color":"#72f4d1","speed":1,"particles":true,"stars":true,"stats":true}'}),addEventListener(){}},
    window:{},matchMedia:()=>({matches:false}),addEventListener(){},clearTimeout(){},cancelAnimationFrame(){},setTimeout(){},requestAnimationFrame(){}};
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/\}\)\(\);\s*$/,`globalThis.game={update,draw,newGame,hurt,
    clear:()=>{aliens.forEach(a=>a.alive=false);},
    lose:()=>{ship.invincible=0;hurt();},
    shieldHit:()=>{bullets=[];const t=tiles.find(t=>t.hp===2);bullets.push({x:t.x+3,y:t.y-6,vy:120,owner:'enemy'});return t;},
    breach:()=>{baseY=SHIP_Y;positionAliens();stepTimer=1;},
    state:()=>({wave,score,best,lives,games,kills,cleared,shots,phase,ship:{...ship},aliens,bullets,tiles,sparks})};})();`),sandbox);
  return sandbox.game;
}
const a=create(),b=create();assert.equal(JSON.stringify(a.state()),JSON.stringify(b.state()),'Previews must match');
for(let i=0;i<120*600;i++) {
  a.update(1/120);
  if(i%600===0){a.draw();const s=a.state();assert.ok(s.bullets.length<=80&&s.sparks.length<=180);assert.equal(s.aliens.length,32);assert.ok(s.tiles.every(t=>t.hp>=0));assert.ok(Number.isFinite(s.ship.x));}
}
const s=a.state();
assert.ok(s.kills>150,`Autopilot must hit drones: ${s.kills}`);
assert.ok(s.cleared>=3,`Autopilot must clear waves: ${s.cleared}, games ${s.games}`);
assert.ok(s.shots>200);
const shield=create();const tile=shield.shieldHit();shield.update(.08);assert.equal(tile.hp,1,'Fire must erode shields');
const cleared=create();cleared.clear();cleared.update(.01);assert.equal(cleared.state().phase,'clear');cleared.update(2.5);assert.equal(cleared.state().wave,2);
const loss=create();for(let i=0;i<3;i++)loss.lose();assert.equal(loss.state().phase,'over');const before=loss.state().games;loss.update(2.5);assert.equal(loss.state().games,before+1);assert.equal(loss.state().lives,3);assert.equal(loss.state().score,0);
const breach=create();breach.breach();breach.update(.01);assert.equal(breach.state().phase,'over','Formation breach must end game');
create(390).draw();
console.log(`Orbital Defender: deterministic previews, shields, wave transition, death/restart and formation breach verified. Ten minutes: ${s.kills} drones destroyed, ${s.cleared} cleared waves, ${s.shots} shots, ${s.games} flights.`);
