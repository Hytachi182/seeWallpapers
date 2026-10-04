import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = await readFile(path.join(root, 'build/template-scene.js'), 'utf8');
const descriptions = {
  'ai-core': 'A holographic reactor with a rotating spherical lattice, orbital machinery and a pulsing energy core.',
  'data-tunnel': 'An octagonal data tunnel with perspective, moving light trails and cyan / coral circuitry.',
  'digital-rain-3d': 'Three layers of animated Matrix glyphs with luminous heads, independent depth and dark desktop space.',
  'neural-network': 'A rotating three-dimensional neural constellation with connected nodes and traveling synaptic pulses.',
  'sakura-night': 'A moonlit Japanese landscape with a branching cherry canopy, mountain silhouettes, a torii and drifting petals.',
  'rainy-window': 'A cinematic neon skyline through rain-streaked glass, with refracted droplets and city reflections.',
  'operations-center': 'A holographic operations wallpaper with a live clock, real CPU / RAM history, uptime and power status.'
};
const hud = `<main aria-label="Live system metrics">
  <div class="identity"><span class="signal"></span><span id="host">Waiting for system metrics</span></div>
  <h1 id="time">—</h1><p id="date"></p>
  <dl><div><dt>CPU</dt><dd id="cpu">—</dd></div><div><dt>Memory</dt><dd id="ram">—</dd></div></dl>
  <dl class="secondary"><div><dt>Uptime</dt><dd id="uptime">—</dd></div><div><dt>Power</dt><dd id="power">—</dd></div></dl>
  <p class="legend"><span>CPU</span><span>Memory</span><small>Live history · 3 minutes</small></p>
</main>`;
for (const [id, description] of Object.entries(descriptions)) {
  const directory = path.join(root, 'templates', id);
  const manifest = JSON.parse(await readFile(path.join(directory, 'manifest.json'), 'utf8'));
  manifest.description = description; manifest.version = '1.1.0'; manifest.performance = 'medium';
  const defaults = Object.fromEntries(manifest.settings.map(setting => [setting.id, setting.default]));
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${manifest.name}</title>
<style>
:root{color-scheme:dark;--accent:#58d5ff}
*{box-sizing:border-box}html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#03060b}
canvas{display:block;width:100%;height:100%}::selection{background:var(--accent);color:#03060b}
main{position:absolute;top:17%;left:9%;width:32%;color:#eaf6ff;font-family:'Segoe UI',sans-serif;pointer-events:none}
.identity{display:flex;align-items:center;gap:10px;color:var(--accent);font:12px Consolas,monospace;overflow-wrap:anywhere}
.signal{width:5px;height:5px;background:var(--accent);flex:none}
h1{font-size:clamp(48px,7vw,116px);font-weight:200;letter-spacing:-.04em;font-variant-numeric:tabular-nums;line-height:1.15;margin:22px 0 4px}
#date{font-size:14px;color:#adc3d4;margin:0 0 42px;text-transform:capitalize}
dl{display:flex;gap:40px;margin:0 0 26px}dl>div{min-width:0}dt{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#adc3d4;margin-bottom:8px}
dd{margin:0;font-size:clamp(24px,2.7vw,44px);font-weight:300;font-variant-numeric:tabular-nums}
.secondary dd{font:14px Consolas,monospace;color:#c1d4e3}.legend{position:fixed;top:89%;left:9%;display:flex;gap:20px;font:10px Consolas,monospace;color:var(--accent)}
.legend span:nth-child(2){color:#ffe0ac}.legend small{color:#adc3d4;font-size:10px}
[hidden]{display:none!important}
@media(max-width:900px){dl{gap:24px}#date{margin-bottom:26px}.legend small{display:none}}
@media(max-width:699px){main{top:8%;left:7%;width:86%}h1{font-size:64px;margin-top:14px}#date{margin-bottom:22px}dl{gap:36px;margin-bottom:16px}dd{font-size:30px}.legend{display:none}}
@media(max-height:500px) and (min-width:700px){main{top:8%}h1{font-size:48px;margin:10px 0}#date{margin-bottom:16px}dl{margin-bottom:14px}dd{font-size:25px}}
</style></head>
<body data-scene="${id}"><canvas aria-label="${manifest.name} animated wallpaper"></canvas>
${id === 'operations-center' ? hud : ''}
<script type="application/json" id="defaults">${JSON.stringify(defaults)}</script>
<script src="scene.js"></script></body></html>
`;
  await writeFile(path.join(directory, 'index.html'), html);
  await writeFile(path.join(directory, 'scene.js'), runtime);
  await writeFile(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Generated ${manifest.name}`);
}
