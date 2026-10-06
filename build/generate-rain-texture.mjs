import { readFile, writeFile } from 'node:fs/promises';
const dir = new URL('../templates/rain-on-glass/', import.meta.url);
const jpeg = await readFile(new URL('background.jpg', dir));
await writeFile(new URL('background.js', dir), `// Original generated photograph embedded for safe offline WebGL file-origin sampling.\nwindow.rainGlassPhoto = 'data:image/jpeg;base64,${jpeg.toString('base64')}';\n`);
console.log('Rain photograph embedded for the file:// desktop host');
