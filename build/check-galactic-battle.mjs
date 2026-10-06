import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=await readFile('templates/galactic-battle/scene.js','utf8');
const manifest=JSON.parse(await readFile('templates/galactic-battle/manifest.json','utf8'));
const defaults=Object.fromEntries(manifest.settings.map(s=>[s.id,s.default]));
const drawing={createRadialGradient:()=>({addColorStop(){}}),fillRect(){}};
const box={document:{querySelector:()=>({getContext:()=>drawing}),getElementById:()=>({textContent:JSON.stringify(defaults)}),createElement:()=>({getContext:()=>drawing}),addEventListener(){}},window:{},Image:class{},URLSearchParams,location:{search:'?preview=12'},matchMedia:()=>({matches:false}),addEventListener(){}};
vm.runInNewContext(source.replace('bg.onload=fighter.onload=enemy.onload=imageReady','window.check={ships,bolts,bursts,debris,pose};bg.onload=fighter.onload=enemy.onload=imageReady'),box);
const scene=box.window.check;
assert.equal(scene.ships.length,9);assert.equal(scene.bolts.length,27);assert.equal(scene.bursts.length,4);assert.equal(scene.debris.length,40);
for(let t=0;t<=600;t+=.25)for(const ship of scene.ships){const p=scene.pose(ship,t);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=-480&&p.x<=2400&&p.y>=0&&p.y<=1080);}
assert.ok(Math.abs(scene.pose(scene.ships[0],4).x-scene.pose(scene.ships[0],0).x)>300,'Foreground fighter visibly crosses the viewport');
const require=createRequire(path.resolve(process.argv[2]||'.','package.json')),{chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),url=pathToFileURL(path.resolve('templates/galactic-battle/index.html')).href,errors=[],requests=[];
try{
 for(const viewport of [{width:1920,height:1080},{width:390,height:844}]){
  const p=await browser.newPage({viewport});p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await p.addInitScript(()=>{window.callbacks={};window.seeWallpaper={getSettings:()=>({}),onPause:cb=>window.callbacks.pause=cb,onResume:cb=>window.callbacks.resume=cb,onSettingsChanged:cb=>window.callbacks.settings=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};});
  await p.goto(url+'?preview=12');await p.waitForFunction(()=>document.getElementById('fallback').hidden);const first=await p.screenshot();
  await p.goto(url+'?preview=12');await p.waitForFunction(()=>document.getElementById('fallback').hidden);assert.ok(first.equals(await p.screenshot()),'Deterministic preview');
  for(const effect of ['fighters','lasers','explosions','engines']){
   await p.evaluate(v=>window.callbacks.settings(v),{fighters:effect==='fighters'||effect==='engines',engines:effect==='engines',lasers:effect==='lasers',explosions:effect==='explosions',stars:false,debris:false});
   const before=await p.screenshot();await p.evaluate(()=>window.callbacks.resume());await p.waitForTimeout(500);await p.evaluate(()=>window.callbacks.pause());assert.ok(!before.equals(await p.screenshot()),effect+' has real motion');
  }
  await p.evaluate(()=>window.callbacks.settings({speed:0}));const zero=await p.screenshot();await p.evaluate(()=>window.callbacks.resume());await p.waitForTimeout(180);await p.evaluate(()=>window.callbacks.pause());assert.ok(zero.equals(await p.screenshot()),'Zero speed');
  await p.evaluate(()=>window.callbacks.fps(15));const low=await p.screenshot();await p.waitForTimeout(160);assert.ok(low.equals(await p.screenshot()),'FPS change preserves pause');assert.ok(await p.evaluate(()=>document.querySelector('canvas').width*document.querySelector('canvas').height<=921600));
  await p.emulateMedia({reducedMotion:'reduce'});await p.goto(url);await p.waitForFunction(()=>document.getElementById('fallback').hidden);const reduced=await p.screenshot();await p.waitForTimeout(200);assert.ok(reduced.equals(await p.screenshot()));
  await p.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);
 console.log('Galactic Battle: nine fighters/27 bolts/four bursts/40 debris bounded over ten minutes; isolated motion, preview, zero speed, pause/FPS, reduced motion and offline checks passed.');
}finally{await browser.close();}
