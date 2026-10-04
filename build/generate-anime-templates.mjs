import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = await readFile(path.join(root, 'build/anime-scene.js'), 'utf8');
const scenes = [
  ['ninja-anime', 'Ninja Anime', 'A masked rooftop guardian, flowing scarf, crimson moon and drifting cherry blossoms.', '#f46b92'],
  ['hidden-village', 'Hidden Village', 'A lantern-lit mountain village with tiled rooftops, waterfall mist and floating fireflies.', '#ffbe75'],
  ['shinobi-energy', 'Shinobi Energy', 'A standing shinobi surrounded by rotating energy seals, rising sparks and luminous ribbons.', '#62efda'],
  ['orange-ninja', 'Orange Ninja', 'An original orange-cloaked ninja overlooking a golden mountain valley, with wind-blown leaves.', '#ffab48'],
  ['anime-moon-battle', 'Anime Moon Battle', 'Two airborne shinobi facing each other beneath a blue moon, with crossing blades and energy trails.', '#8aa9ff']
];
for (const [id, name, description, color] of scenes) {
  const directory = path.join(root, 'templates', id);
  await mkdir(directory, { recursive: true });
  const settings = [
    { id: 'color', type: 'color', label: 'Energy accent', default: color },
    { id: 'speed', type: 'slider', label: 'Animation speed', min: 0.1, max: 2, step: 0.1, default: 1 },
    { id: 'intensity', type: 'slider', label: 'Atmosphere intensity', min: 0.3, max: 2, step: 0.1, default: 1 }
  ];
  const manifest = { schemaVersion: 1, id, name, description, author: 'seeWallpaper', version: '1.0.0', category: 'Anime', engine: 'web', entry: 'index.html', preview: 'preview.jpg', performance: 'medium', settings };
  const defaults = Object.fromEntries(settings.map(s => [s.id, s.default]));
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  await writeFile(path.join(directory, 'scene.js'), runtime);
  await writeFile(path.join(directory, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${name}</title>
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#080e20}canvas{display:block;width:100%;height:100%}</style></head>
<body data-scene="${id}"><canvas aria-label="${name} animated wallpaper"></canvas><script type="application/json" id="defaults">${JSON.stringify(defaults)}</script><script src="scene.js"></script></body></html>\n`);
  console.log(`Generated ${name}`);
}
