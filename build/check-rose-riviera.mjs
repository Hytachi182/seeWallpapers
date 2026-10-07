import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const require=createRequire(path.resolve(process.argv[2], 'package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const url=pathToFileURL(path.resolve('templates/rose-riviera/index.html')).href;
const errors=[];
try{
  const page=await browser.newPage({viewport:{width:1672,height:941}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    window.callbacks={};window.seeWallpaper={getSettings:()=>({petals:0,lights:false,glints:false}),
      onSettingsChanged:cb=>window.callbacks.settings=cb,onPause:cb=>window.callbacks.pause=cb,
      onResume:cb=>window.callbacks.resume=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};
  });
  const stills=[],people=[];
  for(const time of [0,12,75,3600]){
    await page.goto(`${url}?preview=${time}`);
    await page.evaluate(async()=>{const image=new Image();image.src='artwork.jpg';await image.decode();await new Promise(requestAnimationFrame);});
    people.push(await page.screenshot({clip:{x:1180,y:430,width:200,height:128}}));stills.push(await page.screenshot());
  }
  assert.ok(people.every(v=>v.equals(people[0])),'Water animation must preserve the characters');
  assert.ok(stills.some(v=>!v.equals(stills[0])),'Pool water must animate');
  await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url);
  const reduced=await page.screenshot();await page.waitForTimeout(200);assert.ok(reduced.equals(await page.screenshot()),'Reduced motion freezes the scene');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>window.callbacks.settings({speed:0,petals:2,lights:true,glints:true}));
  const zero=await page.screenshot();await page.waitForTimeout(200);assert.ok(zero.equals(await page.screenshot()),'Speed zero remains still');assert.ok(zero.equals(reduced),'Speed zero and reduced motion show the unmodified artwork');
  await page.evaluate(()=>{window.callbacks.settings({speed:1});window.callbacks.pause();});
  const paused=await page.screenshot();await page.evaluate(()=>{window.callbacks.pause();window.callbacks.fps(15);});
  await page.waitForTimeout(200);assert.ok(paused.equals(await page.screenshot()),'Pause survives repeat and FPS changes');
  await page.evaluate(()=>{window.callbacks.resume();window.callbacks.resume();});await page.waitForTimeout(300);
  assert.ok(!paused.equals(await page.screenshot()),'Repeated resume restarts animation');
  assert.deepEqual(errors,[]);
  console.log('Rose Riviera: stable characters, pool animation, one-hour preview, reduced motion, speed zero and repeated lifecycle verified');
}finally{await browser.close();}
