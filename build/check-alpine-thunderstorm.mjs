import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const source=await readFile('templates/alpine-thunderstorm/scene.js','utf8');
const defaults={rain:1,speed:1,wind:.7,lightning:true,interval:14,flash:.55,mist:true,water:true};
const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});
function create(interval=14,reduced=false){
 const s={console,URLSearchParams,Image:class{},performance:{now:()=>0},location:{search:'?preview=12.08'},innerWidth:1920,innerHeight:1080,devicePixelRatio:1,
 document:{querySelector:()=>({getContext:()=>ctx}),getElementById:()=>({textContent:JSON.stringify({...defaults,interval})}),addEventListener(){}},window:{},matchMedia:()=>({matches:reduced}),addEventListener(){},clearTimeout(){},cancelAnimationFrame(){},setTimeout(){},requestAnimationFrame(){}};
 vm.createContext(s);vm.runInContext(source.replace(/\}\)\(\);\s*$/,'globalThis.stormTest={update,settings:v=>{settings={...settings,...v};syncRain();},state:()=>({time,renewals,flashes,nextStrike,bolt,rain})};})();'),s);return s.stormTest;
}
const a=create(),b=create();assert.equal(JSON.stringify(a.state()),JSON.stringify(b.state()));assert.ok(a.state().bolt);
assert.equal(a.state().rain.length,465);a.settings({rain:2.5});assert.equal(a.state().rain.length,1163);a.settings({rain:0});assert.equal(a.state().rain.length,0);a.settings({rain:1});
for(let i=0;i<30*600;i++){a.update(1/30);if(i%300===0){const s=a.state();assert.ok(s.rain.length===465&&s.rain.every(d=>[d.x,d.y,d.fall].every(Number.isFinite)&&d.x>=-.04&&d.x<=1.04&&d.y>=-.04&&d.y<=1.04));assert.ok(!s.bolt||(s.bolt.points.length<=70&&s.bolt.branches.length<=7&&s.bolt.branches.every(p=>p.length<=20)));}}
assert.ok(a.state().flashes>25&&a.state().renewals>50000);
const frequent=create(6),quiet=create(30);for(let i=0;i<30*300;i++){frequent.update(1/30);quiet.update(1/30);}assert.ok(frequent.state().flashes>quiet.state().flashes*3,'Interval controls true discharge frequency');
a.settings({lightning:false});const count=a.state().flashes;for(let i=0;i<3000;i++)a.update(1/30);assert.equal(a.state().flashes,count);
const gentle=create(6,true);for(let i=0;i<3000;i++)gentle.update(1/30);assert.equal(gentle.state().flashes,0,'Reduced motion prevents all generated flashes');
console.log(`Storm: deterministic preview, 10 minutes / ${count} flashes, ${a.state().renewals} rain renewals, bounded geometry/count, true frequency response and disabled/reduced-motion lightning verified`);
const require=createRequire(path.resolve(process.argv[2]||'.','package.json')),{chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),url=pathToFileURL(path.resolve('templates/alpine-thunderstorm/index.html')).href,errors=[];
try{
 const p=await browser.newPage({viewport:{width:1920,height:1080}});p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{window.callbacks={};window.seeWallpaper={getSettings:()=>({}),onPause:cb=>window.callbacks.pause=cb,onResume:cb=>window.callbacks.resume=cb,onSettingsChanged:cb=>window.callbacks.settings=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};});
 await p.goto(url+'?preview=12.08');assert.equal(await p.locator('#fallback').isVisible(),false);const first=await p.screenshot();await p.goto(url+'?preview=12.08');assert.ok(first.equals(await p.screenshot()));
 await p.evaluate(()=>window.callbacks.settings({speed:0}));const zero=await p.screenshot();await p.evaluate(()=>window.callbacks.resume());await p.waitForTimeout(200);await p.evaluate(()=>window.callbacks.pause());assert.ok(zero.equals(await p.screenshot()));
 await p.evaluate(()=>window.callbacks.settings({speed:1}));await p.evaluate(()=>window.callbacks.resume());await p.waitForTimeout(220);await p.evaluate(()=>window.callbacks.pause());assert.ok(!zero.equals(await p.screenshot()));
 await p.evaluate(()=>window.callbacks.fps(15));const eco=await p.screenshot();await p.waitForTimeout(160);assert.ok(eco.equals(await p.screenshot()));assert.ok(await p.evaluate(()=>{const c=document.querySelector('canvas');return c.width*c.height<=921600;}));
 await p.emulateMedia({reducedMotion:'reduce'});await p.goto(url+'?preview=12.08');const reduced=await p.screenshot();await p.waitForTimeout(180);assert.ok(reduced.equals(await p.screenshot()));await p.evaluate(()=>window.callbacks.settings({lightning:false}));assert.ok(reduced.equals(await p.screenshot()),'Reduced motion shows no lightning even at a flash preview timestamp');
 await p.close();assert.deepEqual(errors,[]);console.log('Edge: photo/rendering, speed zero, pause/resume, paused FPS cap and reduced-motion flash suppression verified');
}finally{await browser.close();}
