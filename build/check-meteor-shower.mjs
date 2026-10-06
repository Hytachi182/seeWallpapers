import vm from 'node:vm';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=await readFile(path.join(root,'templates/meteor-shower/scene.js'),'utf8');
const manifest=JSON.parse(await readFile(path.join(root,'templates/meteor-shower/manifest.json'),'utf8'));
const defaults=Object.fromEntries(manifest.settings.map(s=>[s.id,s.default]));
const ctx=new Proxy({}, {get:(_,name)=>name.startsWith('create')?()=>({addColorStop(){}}):()=>{},set:()=>true});
function create(density=1) {
  const sandbox={console,URLSearchParams,Image:class{},performance:{now:()=>0},location:{search:'?preview=12'},innerWidth:1920,innerHeight:1080,devicePixelRatio:1,
    document:{querySelector:()=>({getContext:()=>ctx}),getElementById:()=>({textContent:JSON.stringify({...defaults,density})}),addEventListener(){}},
    window:{},matchMedia:()=>({matches:false}),addEventListener(){},clearTimeout(){},cancelAnimationFrame(){},setTimeout(){},requestAnimationFrame(){}};
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/\}\)\(\);\s*$/,'globalThis.meteorTest={update,state:()=>({time,stats,meteors,trains})};})();'),sandbox);
  return sandbox.meteorTest;
}
const a=create(), b=create();assert.equal(JSON.stringify(a.state()),JSON.stringify(b.state()),'Preview must be deterministic');
for(let i=0;i<120*600;i++) {
  a.update(1/120);
  if(i%1200===0) {const s=a.state();assert.ok(s.meteors.length<=18&&s.trains.length<=48);assert.ok(s.meteors.every(m=>[m.x,m.y,m.age,m.vx,m.vy].every(Number.isFinite)&&m.points.length<=75&&m.vx>0&&m.vy>0));}
}
const s=a.state();assert.ok(s.stats.spawned>400&&s.stats.finished>400&&s.stats.fireballs>10);
const low=create(.2),high=create(3);for(let i=0;i<120*120;i++){low.update(1/120);high.update(1/120);}assert.ok(high.state().stats.spawned>low.state().stats.spawned*6,'Density must affect actual meteor frequency');
console.log(`Meteor shower: deterministic preview, bounded paths, density response, 10-minute simulation: ${s.stats.spawned} meteors, ${s.stats.fireballs} fireballs`);

const require=createRequire(path.resolve(process.argv[2]||root,'package.json'));
const {chromium}=require('playwright');const browser=await chromium.launch({channel:'msedge',headless:true});
const url=pathToFileURL(path.join(root,'templates/meteor-shower/index.html')).href,errors=[];
try {
  const page=await browser.newPage({viewport:{width:1920,height:1080}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.callbacks={};window.seeWallpaper={getSettings:()=>({}),onPause:cb=>window.callbacks.pause=cb,onResume:cb=>window.callbacks.resume=cb,onSettingsChanged:cb=>window.callbacks.settings=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};});
  await page.goto(`${url}?preview=12`);assert.equal(await page.locator('#fallback').isVisible(),false);
  await page.evaluate(()=>window.callbacks.fps(15));assert.ok(await page.evaluate(()=>document.querySelector('canvas').width*document.querySelector('canvas').height<=921600));
  const paused=await page.screenshot();await page.waitForTimeout(180);assert.ok(paused.equals(await page.screenshot()),'Quality update preserves pause');
  await page.evaluate(()=>window.callbacks.resume());await page.waitForTimeout(350);await page.evaluate(()=>window.callbacks.pause());assert.ok(!paused.equals(await page.screenshot()),'Explicit resume animates sky');
  const frozen=await page.screenshot();await page.waitForTimeout(150);assert.ok(frozen.equals(await page.screenshot()));
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url);const reduced=await page.screenshot();await page.waitForTimeout(180);assert.ok(reduced.equals(await page.screenshot()),'Reduced motion still frame');
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.close();assert.deepEqual(errors,[]);console.log('Edge: actual file:// photograph, responsive cover, FPS pixel budget, pause/resume and reduced motion verified');
} finally {await browser.close();}
