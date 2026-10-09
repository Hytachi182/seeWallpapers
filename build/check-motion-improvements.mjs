import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(path.resolve(process.argv[2]||'.','package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[];
try{
  for(const id of ['moonlit-dunes','satin-afterglow','inkbound-courier','pirate-cove','lunar-silence']){
    const page=await browser.newPage({viewport:{width:960,height:540}});
    page.on('pageerror',e=>errors.push(id+': '+e.message));
    await page.addInitScript(()=>{
      window.callbacks={};window.seeWallpaper={getSettings:()=>({}),
        onSettingsChanged:cb=>window.callbacks.settings=cb,onPause:cb=>window.callbacks.pause=cb,
        onResume:cb=>window.callbacks.resume=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};
    });
    const url=pathToFileURL(path.resolve('templates',id,'index.html')).href;
    await page.goto(url);await page.waitForTimeout(350);await page.evaluate(()=>window.callbacks.pause());
    const frozen=await page.screenshot();await page.waitForTimeout(200);assert.ok(frozen.equals(await page.screenshot()),id+': pause');
    await page.evaluate(()=>{window.callbacks.fps(15);window.callbacks.resume();});await page.waitForTimeout(500);
    assert.ok(!frozen.equals(await page.screenshot()),id+': animation resumes');
    await page.emulateMedia({reducedMotion:'reduce'});await page.goto(url);await page.waitForTimeout(250);
    const reduced=await page.screenshot();await page.waitForTimeout(220);assert.ok(reduced.equals(await page.screenshot()),id+': reduced motion');
    await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(url);await page.waitForTimeout(200);
    await page.evaluate(()=>window.callbacks.settings({speed:0}));const zero=await page.screenshot();await page.waitForTimeout(220);
    assert.ok(zero.equals(await page.screenshot()),id+': zero speed');
    console.log(id+': pause, 15 FPS resume, reduced motion and zero speed verified');await page.close();
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();}
