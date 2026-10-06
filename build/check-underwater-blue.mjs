import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile('templates/underwater-blue/scene.js','utf8');
const defaults={speed:1,light:1,refraction:.6,rays:true,caustics:true,particles:true,bubbleStreams:true,fish:true,school:true};
const sandbox={console,URLSearchParams,location:{search:'?preview=12'},innerWidth:1920,innerHeight:1080,devicePixelRatio:1,Image:class{},window:{},document:{getElementById:id=>id==='defaults'?{textContent:JSON.stringify(defaults)}:{getContext:()=>({}),addEventListener(){}},addEventListener(){}},matchMedia:()=>({matches:false}),addEventListener(){}};
vm.createContext(sandbox);vm.runInContext(source.replace(/\}\)\(\);\s*$/,'globalThis.swimmers={fishPose,fish,shoal,bubbles,specks,fishFrames};})();'),sandbox);
const swim=sandbox.swimmers;assert.equal(swim.fish.length+swim.shoal.length,12);assert.equal(swim.bubbles.length,54);assert.equal(swim.specks.length,105);
for(let t=0;t<=600;t+=.25)for(const f of [...swim.fish,...swim.shoal]){const p=swim.fishPose(f,t);assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=-.16&&p.x<=1.16&&p.tail>=0&&p.tail<24);}
assert.ok(Math.abs(swim.fishPose(swim.fish[0],4).x-swim.fishPose(swim.fish[0],0).x)>.1,'Fish visibly traverse the scene within four seconds');
const require=createRequire(path.resolve(process.argv[2]||'.','package.json')),{chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),url=pathToFileURL(path.resolve('templates/underwater-blue/index.html')).href,errors=[],requests=[];
try{
 const p=await browser.newPage({viewport:{width:1920,height:1080}});p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await p.addInitScript(()=>{window.callbacks={};window.seeWallpaper={getSettings:()=>({}),onPause:cb=>window.callbacks.pause=cb,onResume:cb=>window.callbacks.resume=cb,onSettingsChanged:cb=>window.callbacks.settings=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};});
 await p.goto(url+'?preview=12');assert.equal(await p.locator('#fallback').isVisible(),false);const first=await p.screenshot();await p.goto(url+'?preview=12');assert.ok(first.equals(await p.screenshot()),'Deterministic shader and particles');
 await p.evaluate(()=>window.callbacks.settings({rays:false,caustics:false,refraction:0,particles:false,bubbleStreams:false,fish:true,school:false}));
 const fishOnly=await p.locator('#life').screenshot();await p.evaluate(()=>window.callbacks.resume());await p.waitForTimeout(700);await p.evaluate(()=>window.callbacks.pause());assert.ok(!fishOnly.equals(await p.locator('#life').screenshot()),'Actual fish layer must visibly animate without water effects');
 await p.evaluate(()=>window.callbacks.settings({fish:false,school:false,bubbleStreams:true}));const bubblesOnly=await p.locator('#life').screenshot();await p.evaluate(()=>window.callbacks.resume());await p.waitForTimeout(400);await p.evaluate(()=>window.callbacks.pause());assert.ok(!bubblesOnly.equals(await p.locator('#life').screenshot()),'Bubble streams visibly rise on their own');
 await p.evaluate(()=>window.callbacks.settings({rays:true,caustics:true,refraction:.6,particles:true,fish:true,school:true}));
 await p.evaluate(()=>window.callbacks.settings({speed:0}));const zero=await p.screenshot();await p.evaluate(()=>window.callbacks.resume());await p.waitForTimeout(200);await p.evaluate(()=>window.callbacks.pause());assert.ok(zero.equals(await p.screenshot()),'Zero speed freezes both canvas layers');
 await p.evaluate(()=>window.callbacks.settings({speed:.7}));await p.evaluate(()=>window.callbacks.resume());await p.waitForTimeout(220);await p.evaluate(()=>window.callbacks.pause());assert.ok(!zero.equals(await p.screenshot()));
 await p.evaluate(()=>window.callbacks.fps(15));assert.ok(await p.evaluate(()=>[...document.querySelectorAll('canvas')].every(c=>c.width*c.height<=921600)));const eco=await p.screenshot();await p.waitForTimeout(160);assert.ok(eco.equals(await p.screenshot()),'FPS change preserves host pause');
 const lost=await p.evaluate(()=>{const gl=document.getElementById('sea').getContext('webgl'),ext=gl.getExtension('WEBGL_lose_context');if(!ext)return false;window.restoreSea=()=>ext.restoreContext();ext.loseContext();return true;});
 if(lost){await p.waitForFunction(()=>!document.getElementById('fallback').hidden);assert.equal(await p.locator('#life').isVisible(),false);await p.evaluate(()=>window.restoreSea());await p.waitForFunction(()=>document.getElementById('fallback').hidden);assert.ok(eco.equals(await p.screenshot()),'Context restoration retains paused image and particle state');}
 await p.emulateMedia({reducedMotion:'reduce'});await p.goto(url);const still=await p.screenshot();await p.waitForTimeout(160);assert.ok(still.equals(await p.screenshot()));
 await p.close();const legacy=await browser.newPage({viewport:{width:1920,height:1080}});await legacy.addInitScript(()=>{window.seeWallpaper={getSettings:()=>({bubbles:false}),onPause:()=>{},onResume:()=>{},onSettingsChanged:()=>{},onPerformanceChanged:()=>{}};});await legacy.goto(url+'?preview=12');assert.ok(first.equals(await legacy.screenshot()),'Legacy default-off bubbles cannot hide new default bubble streams');await legacy.close();
 const unsupported=await browser.newPage();await unsupported.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:original.call(this,type,...args);};});await unsupported.goto(url);assert.equal(await unsupported.locator('#fallback').isVisible(),true);assert.equal(await unsupported.locator('#life').isVisible(),false);await unsupported.close();
 assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log('Underwater Blue: 12 moving fish/54 bubbles bounded over 10 minutes; real isolated fish/bubble motion, shader/lifecycle, speed zero, recovery, reduced motion and offline operation verified');
}finally{await browser.close();}
