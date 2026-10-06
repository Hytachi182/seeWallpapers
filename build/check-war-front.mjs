import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(path.resolve(process.argv[2]||'.','package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const url=pathToFileURL(path.resolve('templates/war-front/index.html')).href,errors=[];
function clip(v,bounds){const s=Math.max(v.width/1672,v.height/941),aw=1672*s,ah=941*s,ox=(v.width-aw)*(v.width<v.height?.36:.5),oy=(v.height-ah)*.5;return{x:ox+bounds[0]*aw,y:oy+bounds[1]*ah,width:(bounds[2]-bounds[0])*aw,height:(bounds[3]-bounds[1])*ah};}
try {
 for(const v of [{width:1920,height:1080},{width:390,height:844}]) {
  const p=await browser.newPage({viewport:v});p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(()=>{window.callbacks={};window.seeWallpaper={getSettings:()=>({}),onPause:cb=>window.callbacks.pause=cb,onResume:cb=>window.callbacks.resume=cb,onSettingsChanged:cb=>window.callbacks.settings=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};});
  const head=clip(v,[.284,.245,.325,.308]),torso=clip(v,[.265,.37,.332,.54]);
  const shots=[];
  for(const t of [2,12,28]){await p.goto(`${url}?preview=${t}`);assert.equal(await p.locator('#fallback').isVisible(),false);shots.push({head:await p.screenshot({clip:head}),torso:await p.screenshot({clip:torso}),whole:await p.screenshot()});}
  assert.ok(shots.every(s=>s.head.equals(shots[0].head)&&s.torso.equals(shots[0].torso)),'Original soldier head and torso stay pixel-stable');
  assert.ok(shots.some(s=>!s.whole.equals(shots[0].whole)),'Scene animates around fixed soldiers');
  // Canvas contains file-origin artwork, so use actual screenshots for isolated layers.
  for(const effect of ['smoke','fires','tracers','impacts']) {
    const settings={smoke:false,fires:false,tracers:false,aircraft:false,water:false,impacts:false,intensity:1,speed:1,[effect]:true};
    await p.evaluate(v=>window.callbacks.settings(v),settings);const before=await p.screenshot();
    await p.evaluate(()=>window.callbacks.resume());await p.waitForTimeout(600);await p.evaluate(()=>window.callbacks.pause());
    assert.ok(!before.equals(await p.screenshot()),`${effect} moves independently`);
  }
  await p.evaluate(()=>window.callbacks.settings({speed:0}));const zeroSpeed=await p.screenshot();
  await p.evaluate(()=>window.callbacks.resume());await p.waitForTimeout(180);await p.evaluate(()=>window.callbacks.pause());
  assert.ok(zeroSpeed.equals(await p.screenshot()),'Zero speed freezes active effects');
  await p.evaluate(()=>window.callbacks.settings({speed:1,smoke:true,fires:true,tracers:true,impacts:true,aircraft:true,water:true}));
  await p.evaluate(()=>window.callbacks.settings({intensity:0}));const still=await p.screenshot();await p.evaluate(()=>window.callbacks.resume());await p.waitForTimeout(220);await p.evaluate(()=>window.callbacks.pause());assert.ok(still.equals(await p.screenshot()),'Zero atmosphere restores unchanged original');
  await p.evaluate(()=>window.callbacks.settings({intensity:1}));const paused=await p.screenshot();await p.evaluate(()=>window.callbacks.fps(15));const qualityFrame=await p.screenshot();await p.waitForTimeout(150);assert.ok(qualityFrame.equals(await p.screenshot()),'Quality change cannot resume a paused theme');assert.ok(await p.evaluate(()=>document.querySelector('canvas').width*document.querySelector('canvas').height<=921600));
  await p.emulateMedia({reducedMotion:'reduce'});await p.goto(url);const reduced=await p.screenshot();await p.waitForTimeout(180);assert.ok(reduced.equals(await p.screenshot()));
  await p.close();console.log(`${v.width}x${v.height}: fixed original soldier, scene motion, zero intensity, paused FPS budget and reduced motion verified`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
