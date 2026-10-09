import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const require=createRequire(path.resolve(process.argv[2]||'.','package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const url=pathToFileURL(path.resolve('templates/hollow-lantern/index.html')).href;
const errors=[],remote=[];
try{
  const page=await browser.newPage({viewport:{width:960,height:540}});
  page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/^https?:/.test(request.url()))remote.push(request.url());});
  await page.addInitScript(()=>{
    window.callbacks={};window.seeWallpaper={getSettings:()=>({bats:false,pumpkins:false,mist:false,leaves:false}),
      onSettingsChanged:cb=>window.callbacks.settings=cb,onPause:cb=>window.callbacks.pause=cb,
      onResume:cb=>window.callbacks.resume=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};
  });
  const load=async suffix=>{await page.goto(url+suffix);await page.waitForSelector('canvas[data-ready="true"]');};
  await load('?preview=4');const first=await page.screenshot();
  await load('?preview=10');assert.ok(!first.equals(await page.screenshot()),'The ghost itself moves with all atmosphere disabled');
  await load('?preview=86400');
  await page.emulateMedia({reducedMotion:'reduce'});await load('');
  const reduced=await page.screenshot();await page.waitForTimeout(220);assert.ok(reduced.equals(await page.screenshot()),'Reduced motion freezes the character');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>window.callbacks.settings({speed:0}));
  const zero=await page.screenshot();await page.waitForTimeout(220);assert.ok(zero.equals(await page.screenshot()),'Zero speed freezes all motion');
  await page.setViewportSize({width:3840,height:2160});await page.waitForFunction(()=>document.querySelector('canvas').width===1920&&document.querySelector('canvas').height===1080);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('canvas').width===390);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log('Hollow Lantern: ghost motion independent of atmosphere, 24-hour preview, reduced motion, zero speed, bounded 4K, portrait and offline loading verified');
}finally{await browser.close();}
