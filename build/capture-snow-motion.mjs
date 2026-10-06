import {createRequire} from 'node:module';
import {mkdir,rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const require=createRequire(path.resolve(process.argv[2]||'.','package.json')),{chromium}=require('playwright');
const output=path.resolve('build/visual-review');await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const p=await browser.newPage({viewport:{width:1280,height:720},recordVideo:{dir:output,size:{width:1280,height:720}}});
 await p.addInitScript(()=>{window.seeWallpaper={getSettings:()=>({}),onPause:()=>{},onResume:cb=>window.resumeSnow=cb,onSettingsChanged:()=>{},onPerformanceChanged:()=>{}};});
 await p.goto(pathToFileURL(path.resolve('templates/winter-snowfall/index.html')).href+'?preview=12');await p.evaluate(()=>window.resumeSnow());await p.waitForTimeout(8000);
 const video=p.video();await p.close();await rename(await video.path(),path.join(output,'winter-snowfall-motion.webm'));console.log('Winter Snowfall: eight seconds of actual three-layer snow motion recorded');
}finally{await browser.close();}
