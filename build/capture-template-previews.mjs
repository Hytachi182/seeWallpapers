// npm install --prefix <temporary-folder> playwright
// node build/capture-template-previews.mjs <temporary-folder>
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.resolve(process.argv[2] || root, 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const output = path.join(root, 'build/visual-review');
await mkdir(output, { recursive: true });
const ids = process.argv.length > 3 ? process.argv.slice(3) : (await readdir(path.join(root, 'templates'), { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
const errors = [];
try {
  for (const id of ids) {
    const manifest = JSON.parse(await readFile(path.join(root, 'templates', id, 'manifest.json'), 'utf8'));
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(`${id}: ${e.message}`));
    await page.addInitScript(() => {
      window.callbacks = {};
      window.seeWallpaper = {
        getSettings: () => ({}), getSystemInfo: () => ({}),
        onSettingsChanged: cb => window.callbacks.settings = cb,
        onSystemInfoChanged: cb => window.callbacks.metrics = cb,
        onPause: cb => window.callbacks.pause = cb,
        onResume: cb => window.callbacks.resume = cb,
        onPerformanceChanged: cb => window.callbacks.fps = cb
      };
    });
    const url = pathToFileURL(path.join(root, 'templates', id, 'index.html')).href;
    const previewSeconds = { 'pixel-defender': 5, 'castle-raid': 22, 'pixel-island': 75, 'robot-factory': 24, 'meteor-shower': 6.1, 'alpine-thunderstorm': 12.08, 'stratos-flight': 4, 'emberwatch-knight': 12.8 }[id] ?? 12;
    await page.goto(`${url}?preview=${previewSeconds}`);
    if (await page.locator('#fallback').count()) assert.equal(await page.locator('#fallback').isVisible(), false, `${id}: WebGL renderer failed`);
    await page.screenshot({ path: path.join(output, `${id}-desktop.png`) });
    await page.setViewportSize({ width: 960, height: 540 });
    await page.screenshot({ path: path.join(root, 'templates', id, 'preview.jpg'), type: 'jpeg', quality: 90 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, `${id}-mobile.png`) });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${id}: horizontal overflow`);
    await page.setViewportSize({ width: 960, height: 540 });
    if (id === 'operations-center') {
      assert.equal(await page.locator('#power').textContent(), '—', 'Unavailable power must not imply AC');
      await page.evaluate(() => {
        window.callbacks.metrics({ cpuUsage: 14, memoryUsage: 44, uptime: '02:30:15', hostname: 'SDK-TEST', isOnBattery: false });
        window.callbacks.metrics({ cpuUsage: 51, memoryUsage: 48, uptime: '02:30:17', hostname: 'SDK-TEST', isOnBattery: true });
      });
      assert.equal(await page.locator('#cpu').textContent(), '51.0%');
      assert.equal(await page.locator('#power').textContent(), 'Battery');
      await page.evaluate(() => window.callbacks.settings({ showGraph: false }));
      assert.equal(await page.locator('.legend').isVisible(), false);
      await page.evaluate(() => window.callbacks.settings({ showGraph: true }));
    }
    for (const setting of manifest.settings) {
      if (id === 'alpine-thunderstorm' && ['lightning', 'flash'].includes(setting.id)) await page.goto(`${url}?preview=12.08`);
      if (id === 'particle-nexus' && setting.id === 'interactive') {
        await page.mouse.move(480, 270);
        await page.evaluate(() => window.callbacks.settings({ interactive: true }));
      }
      // Atmospheric trains only become visible after a bright meteor has completed its passage.
      if (id === 'meteor-shower' && setting.id === 'trains') {
        await page.evaluate(() => window.callbacks.resume());
        await page.waitForTimeout(1200);
        await page.evaluate(() => window.callbacks.pause());
      }
      const before = await page.screenshot();
      const alternative = setting.type === 'color' ? '#ff4455' : setting.type === 'boolean' ? !setting.default : setting.max;
      await page.evaluate(([id, value]) => window.callbacks.settings({ [id]: value }), [setting.id, alternative]);
      if (setting.id === 'speed' || (id === 'neon-tetris' && setting.id === 'skill') || (id === 'rain-on-glass' && setting.id === 'rain') || (id === 'meteor-shower' && setting.id === 'density') || (id === 'winter-snowfall' && setting.id === 'wind') || (id === 'alpine-thunderstorm' && setting.id === 'interval')) {
        await page.evaluate(() => window.callbacks.resume());
        await page.waitForTimeout(id === 'neon-tetris' || id === 'rain-on-glass' ? 350 : 120);
        await page.evaluate(() => window.callbacks.pause());
      }
      const after = await page.screenshot();
      assert.equal(before.equals(after), false, `${id}: setting ${setting.id} has no visible effect`);
      await page.evaluate(([id, value]) => window.callbacks.settings({ [id]: value }), [setting.id, setting.default]);
    }
    await page.goto(url);
    await page.waitForTimeout(150);
    await page.evaluate(() => window.callbacks.pause());
    const frozen = await page.screenshot();
    await page.waitForTimeout(120);
    assert.equal(frozen.equals(await page.screenshot()), true, `${id}: pause must freeze animation`);
    await page.evaluate(() => { window.callbacks.fps(15); window.callbacks.resume(); });
    await page.waitForTimeout(200);
    assert.equal(frozen.equals(await page.screenshot()), false, `${id}: resume must restart animation`);
    console.log(`${id}: rendered desktop/mobile, settings and lifecycle verified`);
    await page.close();
  }
  assert.deepEqual(errors, [], 'Browser script errors');
  const cards = ids.map(id => `<figure><img src="${id}-desktop.png"><figcaption>${id}</figcaption></figure>`).join('');
  const sheet = `<html><style>body{margin:0;padding:24px;background:#10151d;color:#e4eef7;font:18px system-ui;display:grid;grid-template-columns:repeat(2,1fr);gap:20px}figure{margin:0}img{width:100%;display:block}figcaption{padding:10px 0}</style>${cards}</html>`;
  await writeFile(path.join(output, 'contact-sheet.html'), sheet);
  const page = await browser.newPage({ viewport: { width: 1600, height: 2000 } });
  await page.goto(pathToFileURL(path.join(output, 'contact-sheet.html')).href);
  await page.screenshot({ path: path.join(output, 'contact-sheet.png'), fullPage: true });
  await page.close();
} finally { await browser.close(); }
