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
Object.defineProperty(globalThis, 'localStorage', { value: { getItem: () => null, setItem() {} }, configurable: true });
const { parseDta } = await import('../src/dta/parser.ts');
const { TileRenderer } = await import('../src/render/renderer.ts');
const { YodaGame } = await import('../src/engine/game.ts');
const bytes = readFileSync(new URL('../yodesk.dta', import.meta.url));
const dta = parseDta(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
globalThis.document = { createElement: () => ({ getContext: () => ({}) }) };

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
 const g = game(); g.dta = { ...dta, zones: [{ planet: 5, width: 2, height: 1, tileIDs: [858,-1,-1,858,-1,875], hotspots: [], actions: [] }] };
 g.loadZone(0); g.state.heroX = 0; g.moveHero(1,0); assert.equal(g.state.heroX,1);
});
test('loading a saved world preserves hero coordinates', () => {
 const g = game(); g.loadZone(94); g.state.heroX = 3; g.state.heroY = 7;
 const saved = JSON.stringify({ state: g.state }); globalThis.localStorage.getItem = key => key === 'yoda_save_game' ? saved : null;
 g.loadWorld(); assert.equal(g.state.heroX,3); assert.equal(g.state.heroY,7);
});
test('solid objects block movement and empty floor cannot be entered', () => {
 const g = game();
 g.dta = { ...dta, zones: [{ planet: 5, width: 3, height: 1, tileIDs: [858,-1,-1,858,915,-1,-1,-1,-1], hotspots: [], actions: [] }] };
 g.loadZone(0); g.state.heroX = 0; g.moveHero(1,0); assert.equal(g.state.heroX,0);
 g.state.heroX = 1; g.moveHero(1,0); assert.equal(g.state.heroX,1);
});
test('item use is suspended while paused', () => {
 const g = game(); g.loadZone(94); g.state.isPaused = true; g.state.health = 10;
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
const { ZoneScripts } = await import('../src/engine/scripts.ts');
test('the original landing script runs on stepping onto its trigger and only once', () => {
 const zone = structuredClone(dta.zones.find(z => z.id === 93));
 const scripts = new ZoneScripts(); const messages = [];
 const host = { x:6,y:13,targetX:6,targetY:13,usedItem:-1,hasItem:()=>false,
 speak:text=>messages.push(text),sound(){},move(){},addItem(){},removeItem(){},offerItem(){} };
 scripts.run(zone,'walk',host);
 assert.ok(messages.some(m => m.startsWith('Dagobah! Yoda must be around')));
 const count = messages.length;scripts.run(zone,'walk',host);assert.equal(messages.length,count);
});
test('unsupported action instructions cannot cause partial story mutations', () => {
 const zone = { width:1,height:1,tileIDs:new Int16Array([858,-1,-1]),hotspots:[],
 actions:[{conditions:[],instructions:[{opcode:0,args:[0,0,0,0,0]},{opcode:999,args:[]}]}] };
 const scripts = new ZoneScripts();scripts.run(zone,'tick',{});
 assert.equal(zone.tileIDs[0],858);assert.ok(scripts.unsupported.has(0));
});
test('bumping Artoo runs his original dialogue instead of walking through him', () => {
 const g = game();g.newWorld();g.state.heroX=10;g.state.heroY=10;
 const messages=[];g.onMessageDialog=(title,text)=>messages.push({title,text});g.moveHero(-1,0);
 assert.equal(g.state.heroX,10);assert.equal(messages[0]?.text,'Artoo! What are you doing here?');
});
test('Artoo dialogue, pickup and saved script state survive loading without modifying the catalog', () => {
 const g=game();g.newWorld();g.state.heroX=10;g.state.heroY=10;
 const lines=[];g.onMessageDialog=(_title,text,_avatar,close)=>{lines.push(text);close?.();};
 g.onPickupOffer=(_item,accept)=>accept();g.moveHero(-1,0);
 assert.ok(lines.some(text=>text.includes("I'm here to HELP!")));
 assert.ok(g.state.inventory.some(i=>i.tileId===794));
 assert.equal(dta.zones.find(z=>z.id===93).tileIDs[(10*18+9)*3+1],794);
 let saved;globalThis.localStorage.setItem=(key,value)=>{if(key==='yoda_save_game')saved=value;};
 g.saveWorld();assert.ok(saved);
 const restored=game();globalThis.localStorage.getItem=key=>key==='yoda_save_game'?saved:null;
 restored.loadWorld();const after=[];restored.onMessageDialog=(_title,text)=>after.push(text);
 restored.moveHero(-1,0);assert.equal(restored.state.heroX,9);assert.deepEqual(after,[]);
 assert.ok(restored.state.inventory.some(i=>i.tileId===794));
});
test('Dagobah sector edges follow spatial neighbors and allow returning', () => {
 const g=game();g.dta={...dta,zones:[93,94,95,96].map(id=>({id,planet:5,width:18,height:18,tileIDs:Int16Array.from({length:18*18*3},(_,i)=>i%3===0?858:-1),hotspots:[],actions:[]}))};
 g.loadZone(0);g.state.heroX=17;g.state.heroY=8;g.moveHero(1,0);
 assert.equal(g.dta.zones[g.state.currentZoneId].id,96);assert.equal(g.state.heroX,0);assert.equal(g.state.heroY,8);
 g.moveHero(-1,0);assert.equal(g.dta.zones[g.state.currentZoneId].id,93);assert.equal(g.state.heroX,17);
});
test('declining Artoo pickup leaves the encounter available to retry', () => {
 const g=game();g.newWorld();g.state.heroX=10;g.state.heroY=10;
 g.onMessageDialog=(_title,_text,_avatar,close)=>close?.();
 g.onPickupOffer=(_item,_accept,cancel)=>cancel();g.moveHero(-1,0);
 assert.ok(!g.state.inventory.some(i=>i.tileId===794));
 g.onPickupOffer=(_item,accept)=>accept();g.moveHero(-1,0);
 assert.ok(g.state.inventory.some(i=>i.tileId===794));
});
test('original puzzle catalog preserves mission briefs and objective items', () => {
 assert.equal(dta.puzzles.length,205);
 const mission=dta.puzzles.find(p=>p.id===85);
 assert.equal(mission.type,3);assert.equal(mission.item1,810);assert.equal(mission.item2,816);
 assert.ok(mission.texts[3].startsWith('Hello, Luke!\r\n\r\nTroubled I am.'));
 assert.equal(dta.puzzles.filter(p=>p.type===3).length,15);
});
test('character animation and weapon metadata come from original CHAR/CHWP/CAUX', () => {
 assert.equal(dta.characters.length,77);
 const luke=dta.characters.find(c=>c.id===0);assert.equal(luke.name,'Luke Skywalker');
 assert.deepEqual(luke.frames.slice(0,8),[1032,799,1032,1026,799,1032,1029,799]);
 const saber=dta.characters.find(c=>c.id===14);assert.equal(saber.frames[7],510);
 assert.equal(dta.tiles[510].name,'Lightsaber');
});
test('zone metadata retains monster instances and quest item lists', () => {
 const zone=dta.zones.find(z=>z.id===2);assert.equal(zone.monsters.length,4);
 assert.equal(zone.monsters[0].characterId,2);assert.equal(zone.monsters[0].x,13);assert.equal(zone.monsters[0].y,4);
 assert.deepEqual(zone.monsters[0].waypoints,Array(8).fill(-1));
 assert.ok(dta.zones.some(z=>z.requiredItemIDs.length && z.providedItemIDs.length));
 assert.ok(dta.zones.find(z=>z.id===93).npcIDs.includes(780));
});
test('a new player starts without invented statistics or free equipment', async () => {
 globalThis.localStorage.getItem=()=>null;
 const g=game();await g.init(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 assert.deepEqual(g.state.inventory,[]);assert.equal(g.state.equippedWeapon,null);
 assert.equal(g.state.highScore,0);assert.equal(g.state.gamesWon,0);assert.equal(g.state.gamesLost,0);
});
