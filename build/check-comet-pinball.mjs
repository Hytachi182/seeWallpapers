import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const require=createRequire(path.resolve(process.argv[2]||'.','package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const url=pathToFileURL(path.resolve('templates/comet-pinball/index.html')).href;
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
  const set=value=>page.evaluate(v=>window.callbacks.settings(v),value);
  // Chromium's canvas rasteriser adds up to one level of noise to a few dozen pixels between page loads,
  // so two loads of the same preview are compared with that tolerance; a diverging simulation would differ far more.
  const pixels=()=>page.evaluate(()=>{const c=document.querySelector('canvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let s='';for(let i=0;i<d.length;i+=32768)s+=String.fromCharCode.apply(null,d.subarray(i,i+32768));return btoa(s);}).then(s=>Buffer.from(s,'base64'));
  const nearlySame=(a,b)=>{let n=0,max=0;for(let i=0;i<a.length;i+=4){const d=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));max=Math.max(max,d);if(d>2)n++;}return max<=2&&n<=a.length/4*0.001;};

  await load('?preview=20');const first=await page.screenshot();const firstPixels=await pixels();
  await load('?preview=20');assert.ok(nearlySame(firstPixels,await pixels()),'Previews are deterministic');
  await load('?preview=19');assert.ok(!first.equals(await page.screenshot()),'The ball and flippers move between preview times');
  await load('?preview=20');await set({color:'#ff5fd2'});assert.ok(!first.equals(await page.screenshot()),'The neon accent recolours the table');
  await load('?preview=20');await set({trail:false});assert.ok(!first.equals(await page.screenshot()),'The ball trail can be turned off');
  await load('?preview=20');await set({hud:false});assert.ok(!first.equals(await page.screenshot()),'The score and ball display can be hidden');
  await load('?preview=20');await set({multiball:false});assert.ok(!first.equals(await page.screenshot()),'Multiball can be switched off');
  await load('?preview=20');await set({speed:'fast',color:'nope',trail:'maybe',multiball:'x',hud:'yes'});
  assert.equal(await page.evaluate(()=>document.querySelector('canvas').dataset.ready),'true','Invalid values fall back without a crash');

  await page.emulateMedia({reducedMotion:'reduce'});await load('');
  const reducedShot=await page.screenshot();await page.waitForTimeout(220);
  assert.ok(reducedShot.equals(await page.screenshot()),'Reduced motion freezes the table');
  await page.emulateMedia({reducedMotion:'no-preference'});

  await load('');await page.waitForTimeout(1200);
  await set({speed:0});const zero=await page.screenshot();await page.waitForTimeout(220);
  assert.ok(zero.equals(await page.screenshot()),'Zero speed freezes the game');
  await set({speed:1});await page.waitForTimeout(1000);
  assert.ok(!zero.equals(await page.screenshot()),'Restoring speed resumes the game');
  await page.evaluate(()=>window.callbacks.pause());const held=await page.screenshot();await page.waitForTimeout(220);
  assert.ok(held.equals(await page.screenshot()),'Host pause stops the game');
  await page.evaluate(()=>window.callbacks.resume());

  await page.setViewportSize({width:3840,height:2160});
  await page.waitForFunction(()=>document.querySelector('canvas').width===1920&&document.querySelector('canvas').height===1080);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('canvas').width===390);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log('Comet Pinball: deterministic previews, physics and table motion, accent, trail, HUD, multiball, invalid settings, reduced motion, zero speed, pause, bounded 4K, portrait and offline loading verified');
} finally {await browser.close();}
