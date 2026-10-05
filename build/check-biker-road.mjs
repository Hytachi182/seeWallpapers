// node build/check-biker-road.mjs <folder containing the temporary Playwright install>
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const require = createRequire(path.resolve(process.argv[2], 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const url = pathToFileURL(path.resolve('templates/biker-road/index.html')).href;
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.callbacks = {};
    window.seeWallpaper = {
      getSettings: () => ({}),
      onSettingsChanged: cb => window.callbacks.settings = cb,
      onPause: cb => window.callbacks.pause = cb,
      onResume: cb => window.callbacks.resume = cb,
      onPerformanceChanged: cb => window.callbacks.fps = cb
    };
  });
  const heads = [], scenes = [];
  for (const time of [0, 5, 12, 24]) {
    await page.goto(`${url}?preview=${time}`);
    await page.evaluate(async () => { const art = new Image(); art.src = 'artwork.jpg'; await art.decode(); await new Promise(requestAnimationFrame); });
    heads.push(await page.screenshot({ clip: { x: 1250, y: 225, width: 240, height: 270 } }));
    scenes.push(await page.screenshot());
  }
  assert(heads.every(head => head.equals(heads[0])), 'Rider head and torso must remain stable');
  assert(scenes.some(scene => !scene.equals(scenes[0])), 'Atmosphere must animate');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url);
  await page.evaluate(async () => { const art = new Image(); art.src = 'artwork.jpg'; await art.decode(); await new Promise(requestAnimationFrame); });
  const still = await page.screenshot();
  await page.waitForTimeout(250);
  assert(still.equals(await page.screenshot()), 'Reduced motion must be still');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => window.callbacks.settings({ intensity: 0 }));
  const zero = await page.screenshot();
  await page.waitForTimeout(200);
  assert(zero.equals(await page.screenshot()), 'Zero intensity must show the unanimated artwork');
  await page.evaluate(() => { window.callbacks.settings({ intensity: 1 }); window.callbacks.pause(); });
  const paused = await page.screenshot();
  await page.evaluate(() => { window.callbacks.pause(); window.callbacks.fps(20); });
  await page.waitForTimeout(200);
  assert(paused.equals(await page.screenshot()), 'Repeated pause and FPS changes must preserve a paused frame');
  await page.evaluate(() => { window.callbacks.resume(); window.callbacks.resume(); });
  await page.waitForTimeout(250);
  assert(!paused.equals(await page.screenshot()), 'Repeated resume must restart animation');
  assert.deepEqual(errors, [], 'No browser errors');
  console.log('Biker Road: stable rider, animated atmosphere, reduced motion, zero intensity and repeated lifecycle verified');
} finally { await browser.close(); }
