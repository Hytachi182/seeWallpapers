import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const require=createRequire(path.resolve(process.argv[2]||'.','package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const url=pathToFileURL(path.resolve('templates/emberwatch-knight/index.html')).href;
const errors=[],remote=[];
try{
  const page=await browser.newPage({viewport:{width:960,height:540}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(/^https?:/.test(request.url()))remote.push(request.url());});
  await page.addInitScript(()=>{
    window.callbacks={};window.seeWallpaper={getSettings:()=>({cape:false,torches:false,mist:false,embers:false}),
      onSettingsChanged:cb=>window.callbacks.settings=cb,onPause:cb=>window.callbacks.pause=cb,
      onResume:cb=>window.callbacks.resume=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};
  });
  const load=async suffix=>{await page.goto(url+suffix);await page.waitForSelector('canvas[data-ready="true"]');};
  const poses=[];
  for(const time of [1,2,9.8,12.8,16,20,28.8,31.2,35,36.1,86400]){
    await load(`?preview=${time}`);poses.push({action:await page.locator('canvas').getAttribute('data-action'),image:await page.screenshot()});
  }
  assert.deepEqual([...new Set(poses.map(p=>p.action))].sort(),['guard','idle','sword','walk']);
  assert.ok(!poses[0].image.equals(poses[1].image),'The knight walks without any moving atmosphere');
  assert.ok(!poses[2].image.equals(poses[3].image),'Guard and sword use different actual character poses');
  await page.emulateMedia({reducedMotion:'reduce'});await load('');
  const reduced=await page.screenshot();await page.waitForTimeout(220);assert.ok(reduced.equals(await page.screenshot()),'Reduced motion freezes the knight');
  await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>window.callbacks.settings({speed:0}));
  const zero=await page.screenshot();await page.waitForTimeout(220);assert.ok(zero.equals(await page.screenshot()),'Speed zero freezes the complete scene');
  await page.setViewportSize({width:3840,height:2160});await page.waitForFunction(()=>document.querySelector('canvas').width===1920&&document.querySelector('canvas').height===1080);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('canvas').width===390);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log('Emberwatch Knight: articulated walk/guard/sword/idle poses without atmosphere, full routine, 24-hour preview, reduced motion, zero speed, bounded 4K, portrait and offline loading verified');
}finally{await browser.close();}
