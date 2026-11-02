import { registerHooks } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { test } from 'node:test';
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const url = new URL(specifier, context.parentURL);
      for (const suffix of ['.ts', '/index.ts']) {
        if (existsSync(new URL(url.href + suffix))) return { url: url.href + suffix, shortCircuit: true };
      }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('.ts')) return { format: 'module', source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText, shortCircuit: true };
    return next(url, context);
  }
});
const { parseDta } = await import('../src/dta/parser.ts');
const { TileRenderer } = await import('../src/render/renderer.ts');
const { YodaGame } = await import('../src/engine/game.ts');
const bytes = readFileSync(new URL('../yodesk.dta', import.meta.url));
const dta = parseDta(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null, setItem() {} }, configurable: true });
function game() {
 const g = new YodaGame(); g.dta = dta; g.audio.playSound = () => {}; return g;
}
test('original zone 94 hotspots retain 16-bit coordinates and arguments', () => {
 assert.deepEqual(dta.zones.find(z => z.id === 94).hotspots, [
 { type: 1, x: 7, y: 3, enabled: true, arg: -1 },
 { type: 9, x: 6, y: 0, enabled: true, arg: 266 }
 ]);
});
test('draw floor, objects, hero, then roof; tile zero is a valid floor', () => {
 const r = new TileRenderer(); r.getTileCanvas = tile => tile.id;
 const draws = []; const ctx = { fillRect() {}, drawImage(id) { draws.push(id); } };
 r.renderZone(ctx, { width: 1, height: 1, tileIDs: [0, 1, 2] }, 0, 0, [0,1,2,3].map(id => ({id})), 3, 0, 0);
 assert.deepEqual(draws, [0,1,3,2]);
});
test('can walk under a canopy on an unobstructed floor', () => {
 const g = game(); g.dta = { ...dta, zones: [{ planet: 5, width: 2, height: 1, tileIDs: [858,-1,-1,858,-1,875], hotspots: [] }] };
 g.loadZone(0); g.state.heroX = 0; g.moveHero(1,0); assert.equal(g.state.heroX,1);
});
test('loading a saved world preserves hero coordinates', () => {
 const g = game(); g.loadZone(94); g.state.heroX = 3; g.state.heroY = 7;
 const saved = JSON.stringify({ state: g.state }); globalThis.localStorage.getItem = key => key === 'yoda_save_game' ? saved : null;
 g.loadWorld(); assert.equal(g.state.heroX,3); assert.equal(g.state.heroY,7);
});
test('solid objects block movement and empty floor cannot be entered', () => {
 const g = game();
 g.dta = { ...dta, zones: [{ planet: 5, width: 3, height: 1, tileIDs: [858,-1,-1,858,915,-1,-1,-1,-1], hotspots: [] }] };
 g.loadZone(0); g.state.heroX = 0; g.moveHero(1,0); assert.equal(g.state.heroX,0);
 g.state.heroX = 1; g.moveHero(1,0); assert.equal(g.state.heroX,1);
});
test('item use is suspended while paused', () => {
 const g = game(); g.state.isPaused = true; g.state.health = 10;
 g.state.equippedItem = { tileId: 505, count: 2 };
 g.useEquippedItem(); assert.equal(g.state.health,10); assert.equal(g.state.equippedItem.count,2);
});
test('zone scripts preserve original Dagobah dialogue and command arguments', () => {
 const zone = dta.zones.find(z => z.id === 93);
 assert.equal(zone.actions.length,51);
 const intro = zone.actions[29];
 assert.deepEqual(intro.conditions[0].args.slice(0,3),[6,13,858]);
 assert.equal(intro.instructions.find(i => i.opcode === 4).text,
 "Dagobah! Yoda must be around here somewhere. I better find him and see what's on his mind...");
 assert.equal(dta.zones.find(z => z.id === 94).actions.length,28);
});
test('initialization displays the original splash before a world is started', async () => {
 const g = game(); g.audio.playMusic = () => {};
 await g.init(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 let splash = false; g.renderer.renderStartupImage = (_ctx, image) => { splash = image.length === 288*288; };
 g.render({}); assert.equal(splash,true);
 const before = [g.state.heroX,g.state.heroY];g.moveHero(1,0);
 assert.deepEqual([g.state.heroX,g.state.heroY],before);
});
test('new worlds start in the Dagobah opening sector rather than a random catalog zone', () => {
 const g = game(); g.state.isPaused = true;g.newWorld();
 assert.equal(dta.zones[g.state.currentZoneId].id,93);
 assert.equal(g.state.isPaused,false);
});
