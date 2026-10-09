import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const require=createRequire(path.resolve(process.argv[2]||'.','package.json'));
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const url=pathToFileURL(path.resolve('templates/stratos-flight/index.html')).href;
const errors=[],remote=[];
try {
  const page=await browser.newPage({viewport:{width:960,height:540}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(/^https?:/.test(request.url()))remote.push(request.url());});
  await page.addInitScript(()=>{
    window.callbacks={};window.seeWallpaper={getSettings:()=>({clouds:false,contrails:false,afterburners:false}),
      onSettingsChanged:cb=>window.callbacks.settings=cb,onPause:cb=>window.callbacks.pause=cb,
      onResume:cb=>window.callbacks.resume=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};
  });
  const load=async suffix=>{await page.goto(url+suffix);await page.waitForSelector('canvas[data-ready="true"]');};
  await load('?preview=4');const first=await page.screenshot();
  await load('?preview=7');assert.ok(!first.equals(await page.screenshot()),'The aircraft themselves move, with every atmospheric effect disabled');
  await load('?preview=86400');
  const sources=['jet.png','cloud.png'].map(name=>({name,url:'data:image/png;base64,'+readFileSync(path.resolve('templates/stratos-flight',name)).toString('base64')}));
  const assets=await page.evaluate(async sources=>{
    const checks=[];
    for(const {name,url} of sources){
      const image=new Image();image.src=url;await image.decode();
      const test=document.createElement('canvas');test.width=image.width;test.height=image.height;
      const ctx=test.getContext('2d');ctx.drawImage(image,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height).data;
      let transparent=0,solid=0;for(let i=3;i<pixels.length;i+=4){if(pixels[i]<10)transparent++;if(pixels[i]>200)solid++;}
      checks.push({name,transparent,solid});
    }return checks;
  },sources);
  assert.ok(assets.every(asset=>asset.transparent>100&&asset.solid>100),'True alpha cutouts, with visible subject pixels');
  await page.emulateMedia({reducedMotion:'reduce'});await load('');
  const reduced=await page.screenshot();await page.waitForTimeout(220);assert.ok(reduced.equals(await page.screenshot()),'Reduced motion freezes flight');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>window.callbacks.settings({speed:0}));const zero=await page.screenshot();
  await page.waitForTimeout(220);assert.ok(zero.equals(await page.screenshot()),'Zero speed freezes aircraft and clouds');
  await page.setViewportSize({width:3840,height:2160});
  await page.waitForFunction(()=>document.querySelector('canvas').width===1920&&document.querySelector('canvas').height===1080);
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('canvas').width===390);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  console.log('Stratos Flight: actual aircraft movement without atmospheric effects, transparent sprites, 24-hour preview, reduced motion, zero speed, bounded 4K, portrait and offline loading verified');
} finally {await browser.close();}
