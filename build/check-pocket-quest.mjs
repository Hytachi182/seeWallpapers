import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const require=createRequire(path.resolve(process.argv[2]||'.','package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const url=pathToFileURL(path.resolve('templates/pocket-quest/index.html')).href;
const errors=[],remote=[];
try {
  const page=await browser.newPage({viewport:{width:960,height:540}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(/^https?:/.test(request.url()))remote.push(request.url());});
  await page.addInitScript(()=>{
    window.callbacks={};window.seeWallpaper={getSettings:()=>({grid:false,glow:false}),
      onSettingsChanged:cb=>window.callbacks.settings=cb,onPause:cb=>window.callbacks.pause=cb,
      onResume:cb=>window.callbacks.resume=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};
  });
  const load=async suffix=>{await page.goto(url+suffix);await page.waitForSelector('canvas[data-ready="true"]');};
  const shots={};
  // walking, wild encounter, menu, attacks, faint, second encounter, catch and the way home
  for(const [name,t] of Object.entries({walk:2.5,alert:5.0,flash:5.9,appear:9.9,menu:12.5,ember:16.8,faint:25.2,fainted:27.0,walk2:34,catch:60.3,caught:64.9,exit:73.5})){
    await load(`?preview=${t}`);shots[name]=await page.screenshot();
    await load(`?preview=${t}`);assert.ok(shots[name].equals(await page.screenshot()),`Preview ${name} is deterministic`);
  }
  const names=Object.keys(shots);
  for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++)assert.ok(!shots[names[i]].equals(shots[names[j]]),`${names[i]} and ${names[j]} are different moments of the game`);
  await load('?preview=0');const start=await page.screenshot();
  await load('?preview=74.82');assert.ok(start.equals(await page.screenshot()),'The game loops seamlessly every 74.82 seconds');
  for(const value of [{palette:3,frame:false,grid:true,glow:true},{palette:1},{palette:'odd',speed:'fast'}])await page.evaluate(v=>window.callbacks.settings(v),value);
  await page.emulateMedia({reducedMotion:'reduce'});await load('');
  const reduced=await page.screenshot();await page.waitForTimeout(220);assert.ok(reduced.equals(await page.screenshot()),'Reduced motion freezes the scene');
  await page.emulateMedia({reducedMotion:'no-preference'});await load('');
  await page.evaluate(()=>window.callbacks.settings({speed:0}));const zero=await page.screenshot();
  await page.waitForTimeout(220);assert.ok(zero.equals(await page.screenshot()),'Zero speed freezes the scene');
  await page.evaluate(()=>window.callbacks.settings({speed:2}));await page.waitForTimeout(700);
  assert.ok(!zero.equals(await page.screenshot()),'Restoring speed resumes the game');
  await page.evaluate(()=>window.callbacks.pause());const held=await page.screenshot();
  await page.waitForTimeout(220);assert.ok(held.equals(await page.screenshot()),'Host pause stops the game');
  await page.evaluate(()=>window.callbacks.resume());
  await page.setViewportSize({width:3840,height:2160});
  await page.waitForFunction(()=>document.querySelector('canvas').width===1920&&document.querySelector('canvas').height===1080);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('canvas').width===390);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log('Pocket Quest: whole game loop (walk, encounter, battle, faint, catch, home), deterministic previews, palettes, console frame, reduced motion, zero speed, pause, bounded 4K, portrait and offline loading verified');
} finally {await browser.close();}
