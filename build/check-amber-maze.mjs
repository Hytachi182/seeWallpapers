// VM-only gameplay hooks: production templates contain no test API.
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../templates/amber-maze/scene.js',import.meta.url),'utf8');
const ctx=new Proxy({}, {get:()=>()=>{},set:()=>true});
function create(width=1920){
  const sandbox={console,URLSearchParams,Date,location:{search:'?preview=12'},innerWidth:width,innerHeight:1080,
    document:{querySelector:()=>({getContext:()=>ctx}),getElementById:()=>({textContent:'{"color":"#f2bc76","speed":1,"glow":true,"trail":true,"stats":true}'}),addEventListener(){}},
    window:{},matchMedia:()=>({matches:false}),addEventListener(){},clearTimeout(){},cancelAnimationFrame(){},setTimeout(){},requestAnimationFrame(){}};
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/\}\)\(\);\s*$/,`globalThis.game={update,draw,makeLevel,distances,
    collectPower:()=>{player.cell=[...powers][0];collect();},
    collide:powered=>{grace=0;power=powered?8:0;enemies[0].cell=player.cell;enemies[0].stunned=0;collide();},
    clear:()=>{pellets.clear();powers.clear();collect();},
    state:()=>({level,score,best,lives,games,collected,cleared,captures,hits,phase,power,grace,grid,pellets:[...pellets],powers:[...powers],player:{...player},enemies,history})};})();`),sandbox);
  return sandbox.game;
}
function checkMaze(g){const s=g.state(),reachable=g.distances(22);let paths=0;for(const row of s.grid)paths+=row.filter(x=>x===0).length;assert.equal(reachable.size,paths,'All corridors must connect');for(const n of [...s.pellets,...s.powers])assert.ok(reachable.has(n),'Every collectible must be reachable');}
const a=create(),b=create();assert.equal(JSON.stringify(a.state()),JSON.stringify(b.state()),'Seeded previews must match');
checkMaze(a);
for(let i=0;i<120*600;i++){
  a.update(1/120);
  if(i%1200===0){a.draw();checkMaze(a);const s=a.state();assert.ok(s.history.length<=12);assert.equal(s.enemies.length,3);assert.equal(s.grid[pointY(s.player.cell)][s.player.cell%21],0,'Player must stay in a corridor');for(const e of s.enemies)assert.equal(s.grid[pointY(e.cell)][e.cell%21],0);}
}
function pointY(n){return Math.floor(n/21);}
const s=a.state();assert.ok(s.collected>500,`Autopilot must collect shards: ${s.collected}`);assert.ok(s.cleared>=3,`Autopilot must clear mazes: ${s.cleared}, games ${s.games}, collected ${s.collected}`);
const maps=new Set();for(let i=0;i<20;i++){b.makeLevel();checkMaze(b);maps.add(JSON.stringify(b.state().grid));}assert.equal(maps.size,20,'New levels must change layout');
const powered=create();powered.collectPower();assert.equal(powered.state().power,8);const captureBefore=powered.state().captures;powered.collide(true);assert.equal(powered.state().captures,captureBefore+1);assert.equal(powered.state().enemies[0].stunned,4);
const hit=create(),pelletsBefore=hit.state().pellets.length;hit.collide(false);assert.equal(hit.state().lives,2);assert.equal(hit.state().pellets.length,pelletsBefore,'Collected progress survives a life loss');hit.collide(false);hit.collide(false);assert.equal(hit.state().phase,'over');const flights=hit.state().games;hit.update(2.5);assert.equal(hit.state().games,flights+1);assert.equal(hit.state().lives,3);assert.equal(hit.state().score,0);
const clear=create();clear.clear();assert.equal(clear.state().phase,'clear');clear.update(2.5);assert.equal(clear.state().level,2);
create(390).draw();
console.log(`Amber Maze: connected changing maps, reachable collectibles, overcharge/capture, lives/restart and level transition verified. Ten minutes: ${s.collected} shards, ${s.cleared} cleared mazes, ${s.captures} captures, ${s.games} flights.`);
