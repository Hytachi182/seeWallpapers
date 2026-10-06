import vm from 'node:vm';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(root, 'templates/rain-on-glass/scene.js'), 'utf8');
const defaults = { rain: 1, speed: 1, refraction: 1, blur: 4, color: '#c9d5df', trails: true };
const ctx = new Proxy({}, { get: (_, name) => name === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
const makeCanvas = () => ({ width: 0, height: 0, getContext: () => ctx, addEventListener() {} });
function simulation(w = 1920, h = 1080) {
  const sandbox = { console, URLSearchParams, Math, Image: class {}, performance: { now: () => 0 }, location: { search: '?preview=12' }, innerWidth: w, innerHeight: h, devicePixelRatio: 1,
    document: { createElement: makeCanvas, querySelector: makeCanvas, getElementById: id => id === 'defaults' ? { textContent: JSON.stringify(defaults) } : { hidden: true }, addEventListener() {} },
    window: {}, matchMedia: () => ({ matches: false }), addEventListener() {}, clearTimeout() {}, cancelAnimationFrame() {}, setTimeout() {}, requestAnimationFrame() {} };
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, 'globalThis.rainTest={update,merge,makeDrop,resize,settings:v=>settings={...settings,...v},state:()=>({time,width,height,totals,drops,beads:beads.length})};})();'), sandbox);
  return sandbox.rainTest;
}
if (!process.argv.includes('--browser-only')) {
const a = simulation(), b = simulation();
assert.equal(JSON.stringify(a.state()), JSON.stringify(b.state()), 'Deterministic preview');
const d1 = a.makeDrop(10, 10, 3), d2 = a.makeDrop(12, 12, 4), volume = d1.r ** 3 + d2.r ** 3;
a.merge(d1, d2); assert.ok(Math.abs(d1.r ** 3 - volume) < 1e-10, 'Coalescence conserves volume'); assert.equal(d2.dead, true);
for (let i = 0; i < 60 * 600; i++) {
  a.update(1 / 60);
  if (i % 600 === 0) { const s = a.state(); assert.ok(s.drops.length <= 420 && s.beads <= 1200); assert.ok(s.drops.every(d => [d.x, d.y, d.r, d.v].every(Number.isFinite))); }
}
const s = a.state(); assert.ok(s.totals.merged > 100 && s.totals.drained > 100 && s.totals.trails > 100);
a.settings({ rain: 0 }); const born = a.state().totals.spawned; for (let i = 0; i < 600; i++) a.update(1 / 60); assert.equal(a.state().totals.spawned, born, 'Zero rain stops new drops while existing water drains');
const portrait = simulation(390, 844); assert.ok(portrait.state().height > portrait.state().width);
console.log(`Rain physics: 10 minutes, ${s.totals.merged} merges, ${s.totals.drained} drained, bounded state, conserved volume and zero rain verified`);
}

const require = createRequire(path.resolve(process.argv[2] || root, 'package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const url = pathToFileURL(path.join(root, 'templates/rain-on-glass/index.html')).href;
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    window.callbacks = {}; window.seeWallpaper = { getSettings: () => ({}), onPause: cb => window.callbacks.pause = cb, onResume: cb => window.callbacks.resume = cb, onSettingsChanged: cb => window.callbacks.settings = cb, onPerformanceChanged: cb => window.callbacks.fps = cb };
  });
  await page.goto(`${url}?preview=12`);
  assert.equal(await page.locator('#fallback').isVisible(), false);
  await page.evaluate(() => window.callbacks.fps(15));
  assert.ok(await page.evaluate(() => document.querySelector('canvas').width * document.querySelector('canvas').height <= 921600));
  const staticFrame = await page.screenshot(); await page.waitForTimeout(160); assert.ok(staticFrame.equals(await page.screenshot()), 'FPS change cannot resume a paused theme');
  const extension = await page.evaluate(() => {
    const gl = document.querySelector('canvas').getContext('webgl'), ext = gl.getExtension('WEBGL_lose_context');
    if (!ext) return false; window.restoreContext = () => ext.restoreContext(); ext.loseContext(); return true;
  });
  if (extension) {
    await page.waitForFunction(() => !document.getElementById('fallback').hidden);
    await page.evaluate(() => window.restoreContext());
    await page.waitForFunction(() => document.getElementById('fallback').hidden);
    assert.ok(staticFrame.equals(await page.screenshot()), 'Context restoration preserves the paused water state');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto(url);
  const reducedFrame = await page.screenshot(); await page.waitForTimeout(180); assert.ok(reducedFrame.equals(await page.screenshot()), 'Reduced motion opens a still frame');
  await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.goto(url);
  await page.evaluate(() => window.callbacks.pause());
  const dryPause = await page.screenshot(); await page.waitForTimeout(160); assert.ok(dryPause.equals(await page.screenshot()));
  await page.evaluate(() => window.callbacks.resume()); await page.waitForTimeout(400); await page.evaluate(() => window.callbacks.pause()); assert.ok(!dryPause.equals(await page.screenshot()));
  const unavailable = await browser.newPage();
  await unavailable.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type === 'webgl' ? null : original.call(this, type, ...args); }; });
  await unavailable.goto(url); assert.equal(await unavailable.locator('#fallback').isVisible(), true, 'Useful photograph fallback without WebGL');
  await unavailable.close(); await page.close(); assert.deepEqual(errors, []);
  console.log('Edge: shader compiled, FPS budget, pause/resume, reduced motion, context recovery and unavailable-WebGL fallback verified');
} finally { await browser.close(); }
