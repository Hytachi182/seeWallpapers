// Exercise the actual renderer's rules in a VM without adding runtime test hooks.
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';

const source = await readFile(new URL('../templates/neon-tetris/scene.js', import.meta.url), 'utf8');
const gradient = { addColorStop() {} };
const context = new Proxy({}, { get: (_, name) => name === 'createRadialGradient' || name === 'createLinearGradient' ? () => gradient : () => {}, set: () => true });
const canvas = () => ({ getContext: () => context });
const defaults = { color: '#b46bff', speed: 3, intensity: 1, skill: 0.9, glow: true, stats: true };
function create(search = '?preview=0.01') {
  const sandbox = { console, crypto: webcrypto, URLSearchParams, Uint32Array,
    document: { querySelector: canvas, getElementById: () => ({ textContent: JSON.stringify(defaults) }), createElement: canvas, addEventListener() {} },
    location: { search }, matchMedia: () => ({ matches: false }), innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 1,
    localStorage: { getItem: () => null, setItem() {} }, window: {}, addEventListener() {},
    requestAnimationFrame() {}, cancelAnimationFrame() {}, clearTimeout() {}, setTimeout() {}, performance: { now: () => 0 } };
  vm.createContext(sandbox);
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, `
    globalThis.game = {
      reset, update, draw, nextPiece,
      state: () => ({ board, piece, queue, score, lines, level, games, pieces, phase, clearing, actions }),
      prepareClear: n => {
        reset(); board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
        for(let y = ROWS-n; y < ROWS; y++) for(let x=0; x<COLS; x++) if(x!==5) board[y][x]='T';
        piece = {type:'I',r:1,x:3,y:18,vx:3,vy:18,fall:0}; lock();
      },
      topOut: () => { board = Array.from({length:ROWS},()=>Array(COLS).fill('Z')); spawn(); },
      bagSample: () => { bag=[]; return Array.from({length:14}, nextPiece); }
    };
  })();`), sandbox);
  return sandbox.game;
}
const a = create(), b = create();
assert.equal(JSON.stringify(a.state()), JSON.stringify(b.state()), 'Gallery preview must be reproducible');
const draws = a.bagSample();
assert.equal(new Set(draws.slice(0, 7)).size, 7);
assert.equal(new Set(draws.slice(7)).size, 7);
for (let n = 1; n <= 4; n++) {
  a.prepareClear(n);
  assert.equal(a.state().lines, n);
  assert.equal(a.state().score, [0,100,300,500,800][n]);
  a.update(0.4);
  assert.equal(a.state().clearing, null);
  assert.equal(a.state().board.length, 22);
  assert.ok(a.state().board.every(row => row.length === 10));
}
const before = a.state().games;
a.topOut(); assert.equal(a.state().phase, 'over');
a.update(3.3); assert.equal(a.state().games, before + 1);
assert.equal(a.state().score, 0); assert.equal(a.state().clearing, null);
let placements = 0, cleared = 0, previousPieces = 0, previousLines = 0;
for (let i = 0; i < 24000; i++) {
  a.update(0.05);
  const s = a.state();
  placements += Math.max(0, s.pieces - previousPieces); previousPieces = s.pieces;
  cleared += Math.max(0, s.lines - previousLines); previousLines = s.lines;
  assert.ok(s.board.every(row => row.length === 10));
  if (i % 100 === 0) a.draw();
}
assert.ok(placements > 200, 'Autoplay must keep placing pieces');
assert.ok(cleared > 30, 'AI must clear lines over sustained play');
const live = create(''), sequences = new Set();
for(let i = 0; i < 12; i++) { live.reset(); sequences.add(JSON.stringify(live.state().queue)); }
assert.ok(sequences.size > 1, 'Live games must have different randomized sequences');
console.log(`Neon Tetris: 7-bag, reproducible previews, random live games, 1–4 line clears, scoring, top-out/restart verified; ${placements} placements and ${cleared} lines in sustained autoplay.`);
