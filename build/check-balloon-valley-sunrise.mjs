import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const require=createRequire(path.resolve(process.argv[2]||'.','package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const url=pathToFileURL(path.resolve('templates/balloon-valley-sunrise/index.html')).href;
const errors=[],remote=[];
try {
  const page=await browser.newPage({viewport:{width:960,height:540}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(/^https?:/.test(request.url()))remote.push(request.url());});
  await page.addInitScript(()=>{
    window.callbacks={};window.seeWallpaper={getSettings:()=>({mist:0,wind:0,rays:false}),
      onSettingsChanged:cb=>window.callbacks.settings=cb,onPause:cb=>window.callbacks.pause=cb,
      onResume:cb=>window.callbacks.resume=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};
  });
  const load=async suffix=>{await page.goto(url+suffix);await page.waitForSelector('canvas[data-ready="true"]');};
  await load('?preview=31');const first=await page.screenshot();
  await load('?preview=31');assert.ok(first.equals(await page.screenshot()),'Previews are deterministic');
  await load('?preview=33');assert.ok(!first.equals(await page.screenshot()),'Balloons rise, sink and fire burners with mist, wind and sun rays disabled');
  await load('?preview=31');
  await page.evaluate(()=>window.callbacks.settings({count:16}));assert.ok(!first.equals(await page.screenshot()),'The number of balloons changes the scene');
  await page.evaluate(()=>window.callbacks.settings({count:9,wind:2}));assert.ok(!first.equals(await page.screenshot()),'Wind carries the balloons');
  await page.evaluate(()=>window.callbacks.settings({wind:0,tod:0}));const dawn=await page.screenshot();
  await page.evaluate(()=>window.callbacks.settings({tod:1}));assert.ok(!dawn.equals(await page.screenshot()),'Time of day changes the light');
  await page.evaluate(()=>window.callbacks.settings({tod:.45,mist:2}));assert.ok(!first.equals(await page.screenshot()),'Valley mist appears');
  for(const value of [{mist:0,rays:true},{count:3},{count:'many',tod:'noon',mist:'thick',wind:'gale',speed:'fast'}])await page.evaluate(v=>window.callbacks.settings(v),value);
  await page.emulateMedia({reducedMotion:'reduce'});await load('');
  const reduced=await page.screenshot();await page.waitForTimeout(220);assert.ok(reduced.equals(await page.screenshot()),'Reduced motion freezes the scene');
  await page.emulateMedia({reducedMotion:'no-preference'});await load('');
  await page.evaluate(()=>window.callbacks.settings({speed:0}));const zero=await page.screenshot();
  await page.waitForTimeout(220);assert.ok(zero.equals(await page.screenshot()),'Zero speed freezes the scene');
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
  console.log('Balloon Valley Sunrise: core motion without optional effects, balloon count, wind, time of day, mist, deterministic previews, settings, reduced motion, zero speed, pause, bounded 4K, portrait and offline loading verified');
} finally {await browser.close();}
