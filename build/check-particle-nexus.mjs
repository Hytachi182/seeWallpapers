import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(path.resolve(process.argv[2]||'.','package.json')),{chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),url=pathToFileURL(path.resolve('templates/particle-nexus/index.html')).href,errors=[],requests=[];
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}});
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.addInitScript(()=>{window.initialRandom=Math.random;window.callbacks={};window.seeWallpaper={getSettings:()=>({}),onPause:cb=>window.callbacks.pause=cb,onResume:cb=>window.callbacks.resume=cb,onSettingsChanged:cb=>window.callbacks.settings=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};});
 await page.goto(url+'?preview=12');const first=await page.screenshot();await page.goto(url+'?preview=12');assert.ok(first.equals(await page.screenshot()),'Deterministic native-library preview');
 assert.equal(await page.evaluate(()=>pJSDom[0].pJS.particles.array.length),110);assert.ok(await page.evaluate(()=>Math.random===window.initialRandom));
 const frozen=await page.screenshot();await page.mouse.move(800,500);await page.waitForTimeout(180);assert.ok(frozen.equals(await page.screenshot()),'Host pause freezes even pointer redrawing');
 await page.evaluate(()=>window.callbacks.settings({density:180}));assert.equal(await page.evaluate(()=>pJSDom[0].pJS.particles.array.length),180);
 await page.evaluate(()=>window.callbacks.settings({density:35}));assert.equal(await page.evaluate(()=>pJSDom[0].pJS.particles.array.length),35);
 await page.evaluate(()=>window.callbacks.settings({density:110,speed:0}));const zero=await page.screenshot();await page.evaluate(()=>window.callbacks.resume());await page.waitForTimeout(180);await page.evaluate(()=>window.callbacks.pause());assert.ok(zero.equals(await page.screenshot()),'Zero speed stops autonomous movement');
 await page.evaluate(()=>window.callbacks.settings({speed:.7}));const stopped=await page.screenshot();await page.evaluate(()=>window.callbacks.resume());await page.waitForTimeout(180);await page.evaluate(()=>window.callbacks.pause());assert.ok(!stopped.equals(await page.screenshot()),'Resume runs particles.js movement');
 await page.evaluate(()=>window.callbacks.fps(15));assert.ok(await page.evaluate(()=>{const c=document.querySelector('canvas');return c.width*c.height<=921600;}));const eco=await page.screenshot();await page.waitForTimeout(160);assert.ok(eco.equals(await page.screenshot()));
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url);const reduced=await page.screenshot();await page.waitForTimeout(180);assert.ok(reduced.equals(await page.screenshot()));
 assert.ok(await page.evaluate(()=>pJSDom[0].pJS.particles.move.enable===false&&!pJSDom[0].pJS.fn.drawAnimFrame),'Library RAF remains inactive');
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>pJSDom[0].pJS.particles.array.length),110);assert.ok(await page.evaluate(()=>pJSDom[0].pJS.particles.array.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y))));
 await page.close();assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);console.log('Particle Nexus: real particles.js, deterministic preview, bounded count, pause/pointer freeze, speed zero, resume, FPS cap, reduced motion, responsive state and no network requests verified');
}finally{await browser.close();}
