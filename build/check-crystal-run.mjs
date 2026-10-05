// Exercise the actual physics and course generator without shipping debug hooks.
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const source = await readFile(new URL('../templates/crystal-run/scene.js', import.meta.url), 'utf8');
const gradient = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, name) => name === 'createLinearGradient' ? () => gradient : () => {}, set: () => true });
function create(width = 1920) {
  const sandbox = { console, URLSearchParams, location: { search: '?preview=12' }, innerWidth: width, innerHeight: 1080,
    document: { querySelector: () => ({ getContext: () => ctx }), getElementById: () => ({ textContent: '{"color":"#68ebcb","speed":1,"parallax":true,"particles":true,"stats":true}' }), addEventListener() {} },
    window: {}, matchMedia: () => ({ matches: false }), addEventListener() {}, clearTimeout() {}, cancelAnimationFrame() {}, setTimeout() {}, requestAnimationFrame() {} };
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, `globalThis.game={update,draw,makeLevel,fall:()=>{player.y=GROUND+110;player.grounded=false;},collide:()=>{player.x=enemies[0].x;player.y=GROUND;player.vy=0;player.grounded=false;},state:()=>({level,total,jumps,rescues,phase,player:{...player},islands,crystals,sparks,camera})};})();`),sandbox);
  return sandbox.game;
}
const a=create(), b=create();
assert.equal(JSON.stringify(a.state()),JSON.stringify(b.state()),'Preview must be deterministic');
for(let i=0;i<120*600;i++) {
  a.update(1/120);
  if(i%600===0) {
    a.draw(); const s=a.state();
    assert.ok(Number.isFinite(s.player.x) && Number.isFinite(s.player.y));
    assert.ok(s.sparks.length<=100,'Particles must remain bounded');
    assert.equal(s.islands.length,15,'Course objects must remain bounded');
  }
}
const s=a.state();
assert.ok(s.level>=6,`Autoplay must complete trails, got ${JSON.stringify(s.player)}, level ${s.level}, rescues ${s.rescues}`);
assert.ok(s.total>100,'Robot must collect crystals');
assert.ok(s.jumps>100,'Robot must jump');
const portrait=create(390); portrait.draw();
const recovery=create(); recovery.fall(); recovery.update(1/120);
assert.equal(recovery.state().rescues,1,'A fall must restore the safe checkpoint');
assert.ok(recovery.state().player.invincible>0,'Recovery must provide a grace period');
const collision=create(); collision.collide(); collision.update(1/120);
assert.equal(collision.state().rescues,1,'A side collision must recover');
console.log(`Crystal Run: deterministic preview, portrait rendering and 10 minutes of fixed-step autoplay verified: ${s.level} trails, ${s.total} crystals, ${s.jumps} jumps, ${s.rescues} rescues.`);
