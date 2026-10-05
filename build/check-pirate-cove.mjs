// Run with the same temporary Playwright dependency as capture-template-previews.mjs.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.resolve(process.argv[2] || root, 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const url = pathToFileURL(path.join(root, 'templates/pirate-cove/index.html')).href;
const errors = [];
function clip(viewport, bounds) {
  const aw = 1672 * Math.max(viewport.width / 1672, viewport.height / 941) * 1.015;
  const ah = aw * 941 / 1672;
  const ox = (viewport.width - aw) * (viewport.width < viewport.height ? 0.9 : 0.5);
  const oy = (viewport.height - ah) * 0.5;
  return { x: ox + bounds[0] * aw, y: oy + bounds[1] * ah,
    width: (bounds[2] - bounds[0]) * aw, height: (bounds[3] - bounds[1]) * ah };
}
try {
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.callbacks = {};
      window.seeWallpaper = { getSettings: () => ({ wind: 2 }),
        onSettingsChanged: cb => window.callbacks.settings = cb,
        onPause: cb => window.callbacks.pause = cb,
        onResume: cb => window.callbacks.resume = cb,
        onPerformanceChanged: cb => window.callbacks.fps = cb };
    });
    const head = clip(viewport, [0.800, 0.258, 0.862, 0.345]);
    const scarf = clip(viewport, [0.874, 0.295, 0.917, 0.351]);
    const snapshots = [];
    for (const time of [1, 5, 12, 24, 60]) {
      await page.goto(`${url}?preview=${time}`);
      await page.waitForFunction(() => document.images.length === 0 && window.pirateFabricMasks);
      // The Image is created in JS; screenshot after its load and the first draw.
      await page.evaluate(async () => {
        const art = new Image(); art.src = 'artwork.jpg'; await art.decode();
        await new Promise(requestAnimationFrame);
      });
      snapshots.push({ head: await page.screenshot({ clip: head }), scarf: await page.screenshot({ clip: scarf }) });
    }
    assert(snapshots.every(s => s.head.equals(snapshots[0].head)), 'Head/neck must remain pixel-stable across the animation at maximum wind');
    assert(snapshots.some(s => !s.scarf.equals(snapshots[0].scarf)), 'Free scarf must still animate');
    await page.evaluate(() => window.callbacks.settings({ wind: 0 }));
    const calmScarf = await page.screenshot({ clip: scarf });
    await page.evaluate(() => window.callbacks.resume());
    await page.waitForTimeout(250);
    await page.evaluate(() => window.callbacks.pause());
    assert(calmScarf.equals(await page.screenshot({ clip: scarf })), 'Wind zero must stop cloth motion');
    console.log(`${viewport.width}x${viewport.height}: head stable at five times, scarf animated, zero wind respected`);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 960, height: 540 }, reducedMotion: 'reduce' });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.evaluate(async () => { const art = new Image(); art.src = 'artwork.jpg'; await art.decode(); });
  const still = await page.screenshot();
  await page.waitForTimeout(250);
  assert(still.equals(await page.screenshot()), 'Reduced motion must keep the scene still');
  await page.close();
  assert.deepEqual(errors, [], 'Local-file renderer must not throw browser errors');
  console.log('Reduced motion and local-file rendering verified');
} finally { await browser.close(); }
