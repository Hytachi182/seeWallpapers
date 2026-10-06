import { createRequire } from 'node:module';
import { mkdir, rename } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const require=createRequire(path.resolve(process.argv[2]||'.','package.json'));
const {chromium}=require('playwright');
const output=path.resolve('build/visual-review');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1280,height:720},recordVideo:{dir:output,size:{width:1280,height:720}}});
  await page.addInitScript(()=>{window.seeWallpaper={getSettings:()=>({}),onPause:()=>{},onResume:cb=>window.resumeMeteor=cb,onSettingsChanged:()=>{},onPerformanceChanged:()=>{}};});
  await page.goto(pathToFileURL(path.resolve('templates/meteor-shower/index.html')).href+'?preview=6.1');
  await page.evaluate(()=>window.resumeMeteor());await page.waitForTimeout(8000);
  const video=page.video();await page.close();await rename(await video.path(),path.join(output,'meteor-shower-motion.webm'));
  console.log('Eight-second meteor-shower-motion.webm captured from the actual animation');
} finally {await browser.close();}
