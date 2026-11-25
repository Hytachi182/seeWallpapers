import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const require=createRequire(path.resolve(process.argv[2]||'.','package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const url=pathToFileURL(path.resolve('templates/harvest-hollow/index.html')).href;
const PREVIEW='?preview=670';   // day 8 (autumn), mid-morning: the farmer works a field of crops at every stage
const errors=[],remote=[];
try {
  const page=await browser.newPage({viewport:{width:960,height:540}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(/^https?:/.test(request.url()))remote.push(request.url());});
  await page.addInitScript(()=>{
    window.callbacks={};window.seeWallpaper={getSettings:()=>({}),
      onSettingsChanged:cb=>window.callbacks.settings=cb,onPause:cb=>window.callbacks.pause=cb,
      onResume:cb=>window.callbacks.resume=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};
  });
  const load=async suffix=>{await page.goto(url+suffix);await page.waitForSelector('canvas[data-ready="true"]');};
  const shot=()=>page.screenshot();
  // The GPU canvas rasteriser can shift a few pixels by one level between page loads, so separate loads are compared with a small tolerance.
  const pixels=()=>page.evaluate(()=>{const c=document.querySelector('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let s='';for(let i=0;i<d.length;i+=32768)s+=String.fromCharCode.apply(null,d.subarray(i,i+32768));return btoa(s);}).then(s=>Buffer.from(s,'base64'));
  const nearlySame=(a,b)=>{if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(Math.abs(a[i]-b[i])>2)return false;return true;};

  await load(PREVIEW);const first=await shot();const firstPixels=await pixels();
  await load(PREVIEW);assert.ok(nearlySame(firstPixels,await pixels()),'Previews are deterministic');
  await load('?preview=340');assert.ok(!first.equals(await shot()),'Time moves the farm: farmer, crops, light and clock change');
  await load(PREVIEW);
  await page.evaluate(()=>window.callbacks.settings({hud:false}));assert.ok(!first.equals(await shot()),'The HUD can be hidden');
  await page.evaluate(()=>window.callbacks.settings({hud:true,animals:false}));const noChickens=await shot();
  assert.ok(!first.equals(noChickens),'Chickens can be turned off');
  await page.evaluate(()=>window.callbacks.settings({animals:true,seasons:false,startSeason:0}));const spring=await shot();
  assert.ok(!first.equals(spring),'Turning off seasons fixes the season to spring');
  await page.evaluate(()=>window.callbacks.settings({seasons:true,startSeason:3}));const winterRotating=await shot();
  assert.ok(!spring.equals(winterRotating),'The starting season changes the palette');
  await page.evaluate(()=>window.callbacks.settings({seasons:false,startSeason:3}));assert.ok(!winterRotating.equals(await shot()),'Winter has its own snow, bare fields and roof');
  await page.evaluate(()=>window.callbacks.settings({startSeason:0,dayLength:60}));assert.ok(!first.equals(await shot()),'Day length changes the sun, night and crop pace');
  await page.evaluate(()=>window.callbacks.settings({dayLength:90}));
  await page.evaluate(()=>window.callbacks.settings({hud:true,animals:true,seasons:true,startSeason:0,dayLength:90}));
  for(const value of [{dayLength:'long',startSeason:'x',speed:'fast',seasons:'maybe',animals:'many',hud:'yes'},{dayLength:9000,startSeason:9,speed:-4}])
    await page.evaluate(v=>window.callbacks.settings(v),value);
  await page.evaluate(()=>window.callbacks.settings({speed:1,dayLength:90,startSeason:0}));

  await page.emulateMedia({reducedMotion:'reduce'});await load('');
  const reducedFrame=await shot();await page.waitForTimeout(250);assert.ok(reducedFrame.equals(await shot()),'Reduced motion freezes the scene');
  await page.emulateMedia({reducedMotion:'no-preference'});await load('');
  await page.evaluate(()=>window.callbacks.settings({speed:0}));const zero=await shot();
  await page.waitForTimeout(250);assert.ok(zero.equals(await shot()),'Zero speed freezes the scene');
  await page.evaluate(()=>window.callbacks.settings({speed:1}));await page.waitForTimeout(400);
  assert.ok(!zero.equals(await shot()),'Restoring speed resumes the animation');
  await page.evaluate(()=>window.callbacks.pause());const held=await shot();
  await page.waitForTimeout(250);assert.ok(held.equals(await shot()),'Host pause stops animation');
  await page.evaluate(()=>window.callbacks.resume());
  await page.setViewportSize({width:3840,height:2160});
  await page.waitForFunction(()=>document.querySelector('canvas').width===1920&&document.querySelector('canvas').height===1080);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('canvas').width===390);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow on portrait');
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log('Harvest Hollow: deterministic previews, time, HUD, chickens, seasons, day length, invalid settings, reduced motion, zero speed, pause, bounded 4K, portrait layout and offline loading verified');
} finally {await browser.close();}
