import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

// npm install --prefix <temporary-folder> playwright
// node build/check-satin-afterglow.mjs <temporary-folder>
const require = createRequire(path.resolve(process.argv[2] || '.', 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const url = pathToFileURL(path.resolve('templates/satin-afterglow/index.html')).href;
const errors = [], remote = [];
try {
  const page = await browser.newPage({ viewport: { width: 1672, height: 941 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', request => { if (/^https?:/.test(request.url())) remote.push(request.url()); });
  await page.addInitScript(() => {
    window.callbacks = {};
    window.seeWallpaper = {
      getSettings: () => ({ petals: 0 }),
      onSettingsChanged: cb => window.callbacks.settings = cb,
      onPause: cb => window.callbacks.pause = cb,
      onResume: cb => window.callbacks.resume = cb,
      onPerformanceChanged: cb => window.callbacks.fps = cb
    };
  });
  const stills = [], characters = [];
  for (const time of [0, 12, 75, 86400]) {
    await page.goto(`${url}?preview=${time}`);
    await page.waitForSelector('canvas[data-ready="true"]');
    characters.push(await page.screenshot({ clip: { x: 960, y: 65, width: 425, height: 865 } }));
    stills.push(await page.screenshot());
  }
  assert.ok(characters.every(v => v.equals(characters[0])), 'Atmosphere preserves the entire character');
  assert.ok(stills.some(v => !v.equals(stills[0])), 'Environment animates across time');
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto(url);
  await page.waitForSelector('canvas[data-ready="true"]');
  const reduced = await page.screenshot(); await page.waitForTimeout(220);
  assert.ok(reduced.equals(await page.screenshot()), 'Reduced motion freezes the scene');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(() => window.callbacks.settings({ speed: 0, petals: 2 }));
  const zero = await page.screenshot(); await page.waitForTimeout(220);
  assert.ok(zero.equals(await page.screenshot()), 'Speed zero freezes all effects');
  assert.ok(zero.equals(reduced), 'Both still modes preserve the source illustration');
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.waitForFunction(() => document.querySelector('canvas').width === 1920 && document.querySelector('canvas').height === 1080);
  assert.deepEqual(await page.evaluate(() => [document.querySelector('canvas').width, document.querySelector('canvas').height]), [1920, 1080], '4K rendering budget');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('canvas').width === 390);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []); assert.deepEqual(remote, []);
  console.log('Satin Afterglow: character preservation, 24-hour preview, reduced motion, zero speed, bounded 4K, portrait and offline loading verified');
} finally { await browser.close(); }
