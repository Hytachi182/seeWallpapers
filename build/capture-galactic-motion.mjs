import {createRequire} from 'node:module';
import {mkdir,rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const require=createRequire(path.resolve(process.argv[2]||'.','package.json')),{chromium}=require('playwright');
const output=path.resolve('build/visual-review');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720},recordVideo:{dir:output,size:{width:1280,height:720}}});
 await page.addInitScript(()=>{window.seeWallpaper={getSettings:()=>({}),onPause:()=>{},onResume:cb=>window.resumeGalactic=cb,onSettingsChanged:()=>{},onPerformanceChanged:()=>{}};});
 await page.goto(pathToFileURL(path.resolve('templates/galactic-battle/index.html')).href+'?preview=12');await page.evaluate(()=>window.resumeGalactic());await page.waitForTimeout(10000);
 const video=page.video();await page.close();await rename(await video.path(),path.join(output,'galactic-battle-original-motion.webm'));
 console.log('Galactic Battle: ten seconds of actual motion captured');
}finally{await browser.close();}
