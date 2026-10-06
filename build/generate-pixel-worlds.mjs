import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(new URL('./pixel-worlds.js', import.meta.url), 'utf8');
const themes = [
  ['pixel-defender', 'Pixel Defender', '#80dfce', 'Futuristic turrets automatically track and intercept waves of drones over a pixel outpost. Guided shots, shield damage and endless escalating waves.'],
  ['castle-raid', 'Castle Raid', '#d99a78', 'Original tiny pixel knights march on a fortress, brave defensive arrows and break the gate. Each victory launches a fresh automatic raid.'],
  ['tiny-city', 'Tiny City', '#f3cf91', 'A living pixel city with two-way traffic, walking residents, illuminated windows, drifting clouds, rain and a continuous day/night cycle.'],
  ['dungeon-loop', 'Dungeon Loop', '#bba4e7', 'An original adventurer automatically explores connected dungeon corridors, fights stone sentries, opens treasure chests and descends to the next floor.'],
  ['pixel-island', 'Pixel Island', '#d8866d', 'Tiny island settlers gather wood and carry it to construction sites. Five homes rise from foundations, a sailboat circles the coast and settlement cycles repeat.'],
  ['robot-factory', 'Robot Factory', '#86ded0', 'A self-running robot assembly line. Mechanical stations fit chassis, install cores and activate robots on moving conveyor belts in continuous production.'],
  ['tower-climber', 'Tower Climber', '#e9b878', 'An original pixel explorer automatically jumps between procedurally generated ledges on an endless tower. A scrolling camera follows the ascent with safe fall recovery.']
];
for (const [id, name, color, description] of themes) {
  const dir = path.join(root, 'templates', id); await mkdir(dir, { recursive: true });
  const defaults = { color, speed: 1, particles: true, stats: true };
  const manifest = { schemaVersion: 1, id, name, description: `${description} Procedural artwork, entirely offline.`, author: 'seeWallpaper', version: '1.0.0', category: 'Games', engine: 'web', entry: 'index.html', preview: 'preview.jpg', performance: 'low', settings: [
    { id: 'color', type: 'color', label: 'Scene accent', default: color },
    { id: 'speed', type: 'slider', label: 'Simulation speed', min: .3, max: 2, step: .1, default: 1 },
    { id: 'particles', type: 'boolean', label: id === 'tiny-city' ? 'Weather particles' : 'Action particles', default: true },
    { id: 'stats', type: 'boolean', label: 'Show simulation progress', default: true }
  ] };
  await writeFile(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(path.join(dir, 'scene.js'), source);
  await writeFile(path.join(dir, 'index.html'), `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${name}</title>\n<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#111d2d}canvas{display:block;width:100%;height:100%;image-rendering:pixelated}</style></head>\n<body data-scene="${id}"><canvas aria-label="${name}: an original automatic pixel world"></canvas><script id="defaults" type="application/json">${JSON.stringify(defaults)}</script><script src="scene.js"></script></body></html>\n`);
  console.log(`${id}: generated`);
}
