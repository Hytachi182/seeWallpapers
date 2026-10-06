// Exercise production simulations for ten minutes, with test hooks confined to this VM.
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const ids = ['pixel-defender', 'castle-raid', 'tiny-city', 'dungeon-loop', 'pixel-island', 'robot-factory', 'tower-climber'];
const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
function create(source, id, settings, width = 1920) {
  const sandbox = { console, URLSearchParams, location: { search: '?preview=12' }, innerWidth: width, innerHeight: 1080,
    document: { body: { dataset: { scene: id } }, querySelector: () => ({ getContext: () => ctx }), getElementById: () => ({ textContent: JSON.stringify(settings) }), addEventListener() {} },
    window: {}, matchMedia: () => ({ matches: false }), addEventListener() {}, clearTimeout() {}, cancelAnimationFrame() {}, setTimeout() {}, requestAnimationFrame() {} };
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, 'globalThis.game={update,draw,state:()=>({time,metrics,sparks:sparks.length,...scene.state()})};})();'), sandbox);
  return sandbox.game;
}
for (const id of ids) {
  const source = await readFile(new URL(`../templates/${id}/scene.js`, import.meta.url), 'utf8');
  const manifest = JSON.parse(await readFile(new URL(`../templates/${id}/manifest.json`, import.meta.url), 'utf8'));
  const settings = Object.fromEntries(manifest.settings.map(s => [s.id, s.default]));
  const a = create(source, id, settings), b = create(source, id, settings);
  assert.equal(JSON.stringify(a.state()), JSON.stringify(b.state()), `${id}: deterministic preview`);
  create(source, id, settings, 390).draw();
  for (let i = 0; i < 60 * 600; i++) {
    a.update(1 / 60);
    if (i % 600 === 0) { a.draw(); const s = a.state(); assert.ok(s.objects < 200 && s.sparks <= 100, `${id}: bounded objects`); if (s.hero) assert.ok(Number.isFinite(s.hero.x) && Number.isFinite(s.hero.y), `${id}: finite physics`); }
  }
  const s = a.state();
  assert.ok(s.metrics.completed >= 3, `${id}: automatic cycles must progress: ${JSON.stringify(s)}`);
  assert.ok(s.metrics.actions > 30, `${id}: real simulation activity`);
  if (id === 'pixel-defender') assert.ok(s.kills > 100);
  if (id === 'castle-raid') assert.ok(s.victories >= 3);
  if (id === 'dungeon-loop') {
    assert.ok(s.loot > 20);
    for (let i = 1; i < s.path.length; i++) { const p = s.path[i], prev = s.path[i - 1]; assert.equal(Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y), 1, 'Connected walkable route'); assert.equal(s.map[p.y][p.x], 1); }
  }
  if (id === 'tower-climber') assert.ok(s.highest > 10000, `Climber must keep ascending: ${s.highest}`);
  console.log(`${id}: deterministic preview, portrait draw, bounded state, 10-minute autoplay; ${s.metrics.completed} cycles, ${s.metrics.actions} actions`);
}
