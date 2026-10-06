import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const source=await readFile('templates/winter-snowfall/scene.js','utf8');
const defaults={density:1,speed:1,wind:.35,size:1,foreground:true,focus:true};
const ctx=new Proxy({},{get:()=>()=>{},set:()=>true}),makeCanvas=()=>({getContext:()=>ctx});
function simulation(){
 const s={console,URLSearchParams,Image:class{},performance:{now:()=>0},location:{search:'?preview=12'},innerWidth:1920,innerHeight:1080,devicePixelRatio:1,document:{querySelector:makeCanvas,createElement:makeCanvas,getElementById:()=>({textContent:JSON.stringify(defaults)}),addEventListener(){}},window:{},matchMedia:()=>({matches:false}),addEventListener(){},clearTimeout(){},cancelAnimationFrame(){},setTimeout(){},requestAnimationFrame(){}};
 vm.createContext(s);vm.runInContext(source.replace(/\}\)\(\);\s*$/,'globalThis.snowTest={update,settings:v=>{settings={...settings,...v};syncDensity();},state:()=>({time,respawns,flakes})};})();'),s);return s.snowTest;
}
const a=simulation(),b=simulation();assert.equal(JSON.stringify(a.state()),JSON.stringify(b.state()),'Deterministic preview');
assert.equal(a.state().flakes.length,356);a.settings({density:2.5});assert.equal(a.state().flakes.length,890);a.settings({density:.2});assert.equal(a.state().flakes.length,71);a.settings({density:1});
for(let i=0;i<30*600;i++){a.update(1/30);if(i%300===0)assert.ok(a.state().flakes.length===356&&a.state().flakes.every(f=>[f.x,f.y,f.r,f.fall].every(Number.isFinite)&&f.x>=-.035&&f.x<=1.035&&f.y>=-.03&&f.y<=1.035));}
assert.ok(a.state().respawns>10000);
const left=simulation(),right=simulation(),index=left.state().flakes.findIndex(f=>f.x>.35&&f.x<.65);left.settings({wind:-2});right.settings({wind:2});for(let i=0;i<60;i++){left.update(1/60);right.update(1/60);}assert.ok(left.state().flakes[index].x<right.state().flakes[index].x,'Wind direction affects motion');
console.log(`Snow simulation: 10 minutes, ${a.state().respawns} flake renewals, bounded 71–890 flakes, deterministic preview and directional wind verified`);
const require=createRequire(path.resolve(process.argv[2]||'.','package.json')),{chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),url=pathToFileURL(path.resolve('templates/winter-snowfall/index.html')).href,errors=[];
try{
 const p=await browser.newPage({viewport:{width:1920,height:1080}});p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.callbacks={};window.seeWallpaper={getSettings:()=>({}),onPause:cb=>window.callbacks.pause=cb,onResume:cb=>window.callbacks.resume=cb,onSettingsChanged:cb=>window.callbacks.settings=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};});
 await p.goto(url+'?preview=12');assert.equal(await p.locator('#fallback').isVisible(),false);const first=await p.screenshot();await p.goto(url+'?preview=12');assert.ok(first.equals(await p.screenshot()));
 await p.evaluate(()=>window.callbacks.settings({speed:0}));const zero=await p.screenshot();await p.evaluate(()=>window.callbacks.resume());await p.waitForTimeout(200);await p.evaluate(()=>window.callbacks.pause());assert.ok(zero.equals(await p.screenshot()),'Zero speed stops all snow changes');
 await p.evaluate(()=>window.callbacks.settings({speed:1}));await p.evaluate(()=>window.callbacks.resume());await p.waitForTimeout(220);await p.evaluate(()=>window.callbacks.pause());assert.ok(!zero.equals(await p.screenshot()));
 await p.evaluate(()=>window.callbacks.fps(15));const frozen=await p.screenshot();await p.waitForTimeout(180);assert.ok(frozen.equals(await p.screenshot()));assert.ok(await p.evaluate(()=>{const c=document.querySelector('canvas');return c.width*c.height<=921600;}));
 await p.emulateMedia({reducedMotion:'reduce'});await p.goto(url);const reduced=await p.screenshot();await p.waitForTimeout(180);assert.ok(reduced.equals(await p.screenshot()));
 await p.close();assert.deepEqual(errors,[]);console.log('Edge: real photograph, deterministic screenshot, speed zero, pause/resume, paused FPS cap and reduced-motion still verified');
}finally{await browser.close();}
