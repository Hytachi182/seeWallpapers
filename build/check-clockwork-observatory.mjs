import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const require=createRequire(path.resolve(process.argv[2]||'.','package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const url=pathToFileURL(path.resolve('templates/clockwork-observatory/index.html')).href;
const errors=[],remote=[];
try {
  const page=await browser.newPage({viewport:{width:960,height:540}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(/^https?:/.test(request.url()))remote.push(request.url());});
  await page.addInitScript(()=>{
    window.callbacks={};window.seeWallpaper={getSettings:()=>({meteors:false,steam:false,dome:false,realTime:false}),
      onSettingsChanged:cb=>window.callbacks.settings=cb,onPause:cb=>window.callbacks.pause=cb,
      onResume:cb=>window.callbacks.resume=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};
  });
  const load=async suffix=>{await page.goto(url+suffix);await page.waitForSelector('canvas[data-ready="true"]');};
  await load('?preview=12');const first=await page.screenshot();
  await load('?preview=12.3');assert.ok(!first.equals(await page.screenshot()),'Gears, pendulum and sky move with meteors, steam and dome rotation disabled');
  await load('?preview=86400');
  for(const value of [{metal:2,dawn:1,meteors:true,steam:true,dome:true,realTime:true},{metal:1.3,dawn:.4},{metal:'oops',dawn:-3,speed:'fast'}])await page.evaluate(v=>window.callbacks.settings(v),value);
  await page.emulateMedia({reducedMotion:'reduce'});await load('');
  const reduced=await page.screenshot();await page.waitForTimeout(220);assert.ok(reduced.equals(await page.screenshot()),'Reduced motion freezes the observatory');
  await page.emulateMedia({reducedMotion:'no-preference'});await load('');
  await page.evaluate(()=>window.callbacks.settings({speed:0}));const zero=await page.screenshot();
  await page.waitForTimeout(220);assert.ok(zero.equals(await page.screenshot()),'Zero speed freezes the observatory');
  await page.evaluate(()=>window.callbacks.settings({speed:1}));await page.waitForTimeout(150);
  assert.ok(!zero.equals(await page.screenshot()),'Restoring speed resumes the animation');
  await page.evaluate(()=>window.callbacks.pause());const held=await page.screenshot();
  await page.waitForTimeout(220);assert.ok(held.equals(await page.screenshot()),'Host pause stops animation');
  await page.evaluate(()=>window.callbacks.resume());
  await page.setViewportSize({width:3840,height:2160});
  await page.waitForFunction(()=>document.querySelector('canvas').width===1920&&document.querySelector('canvas').height===1080);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('canvas').width===390);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log('Clockwork Observatory: mechanism motion without optional effects, settings, 24-hour preview, reduced motion, zero speed, pause, bounded 4K, portrait and offline loading verified');
} finally {await browser.close();}
