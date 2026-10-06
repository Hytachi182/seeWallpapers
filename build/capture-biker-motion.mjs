import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const require = createRequire(path.resolve(process.argv[2], 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const dir = path.resolve('build/visual-review/biker-motion');
await mkdir(dir, { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  await page.goto(pathToFileURL(path.resolve('templates/biker-road/index.html')).href);
  await page.evaluate(async () => { const art = new Image(); art.src = 'artwork.jpg'; await art.decode(); await new Promise(requestAnimationFrame); });
  for (let i = 0; i < 40; i++) {
    await page.screenshot({ path: path.join(dir, `${String(i).padStart(3, '0')}.png`) });
    await page.waitForTimeout(70);
  }
  console.log('Captured 40 live animation frames');
} finally { await browser.close(); }
