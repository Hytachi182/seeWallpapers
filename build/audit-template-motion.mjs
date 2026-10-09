// Usage: node build/audit-template-motion.mjs <playwright-folder> <output-folder> [theme-id ...]
import {createRequire} from 'node:module';
import {mkdir,readdir,writeFile,readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const require=createRequire(path.resolve(process.argv[2]||'.','package.json'));
const {chromium}=require('playwright');const browser=await chromium.launch({channel:'msedge',headless:true});
const root=process.cwd(),output=path.resolve(process.argv[3]||'build/visual-review/motion-audit');await mkdir(output,{recursive:true});
const ids=process.argv.length>4?process.argv.slice(4):(await readdir('templates',{withFileTypes:true})).filter(x=>x.isDirectory()).map(x=>x.name).sort(),results=[];let index=0;
async function worker(){while(index<ids.length){const id=ids[index++],errors=[],manifest=JSON.parse(await readFile(`templates/${id}/manifest.json`,'utf8'));
 const page=await browser.newPage({viewport:{width:640,height:360}});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.callbacks={};window.seeWallpaper={getSettings:()=>({}),getSystemInfo:()=>({}),onSettingsChanged:cb=>window.callbacks.settings=cb,onSystemInfoChanged:cb=>window.callbacks.metrics=cb,onPause:cb=>window.callbacks.pause=cb,onResume:cb=>window.callbacks.resume=cb,onPerformanceChanged:cb=>window.callbacks.fps=cb};});
 try{await page.goto(pathToFileURL(path.join(root,'templates',id,'index.html')).href);await page.waitForTimeout(500);
 }catch(e){errors.push(String(e));}
 try{for(let i=0;i<3;i++){if(i)await page.waitForTimeout(i===1?1200:1800);await page.screenshot({path:path.join(output,`${id}-${i}.png`)});}
 results.push({id,name:manifest.name,category:manifest.category,errors,visibility:await page.evaluate(()=>document.visibilityState)});console.log(`${id}: sampled`);
 }catch(e){results.push({id,errors:[...errors,String(e)]});}await page.close();}}
await Promise.all([worker(),worker(),worker()]);await browser.close();await writeFile(path.join(output,'samples.json'),JSON.stringify(results,null,2));console.log('Audit complete: '+results.length+' themes');
