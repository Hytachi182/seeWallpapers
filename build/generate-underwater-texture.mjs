import {readFile,writeFile} from 'node:fs/promises';
const dir=new URL('../templates/underwater-blue/',import.meta.url),jpeg=await readFile(new URL('background.jpg',dir));
const fish=await readFile(new URL('fish.png',dir));
await writeFile(new URL('background.js',dir),`// Original bundled photograph and transparent fish for safe offline image sampling.\nwindow.underwaterPhotograph='data:image/jpeg;base64,${jpeg.toString('base64')}';\nwindow.underwaterFish='data:image/png;base64,${fish.toString('base64')}';\n`);
console.log('Underwater photograph embedded for offline file:// texture sampling');
