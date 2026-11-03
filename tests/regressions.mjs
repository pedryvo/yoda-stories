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
test('Artoo dialogue, pickup and saved script state survive loading without modifying the catalog', async () => {
 const g=game();g.newWorld();g.state.heroX=10;g.state.heroY=10;
 const lines=[];g.onMessageDialog=(_title,text,_avatar,close)=>{lines.push(text);close?.();};
 g.onPickupOffer=(_item,accept)=>accept();g.moveHero(-1,0);await g.waitForScene();
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
test('declining Artoo pickup leaves the encounter available to retry', async () => {
 const g=game();g.newWorld();g.state.heroX=10;g.state.heroY=10;
 g.onMessageDialog=(_title,_text,_avatar,close)=>close?.();
 g.onPickupOffer=(_item,_accept,cancel)=>cancel();g.moveHero(-1,0);await g.waitForScene();
 assert.ok(!g.state.inventory.some(i=>i.tileId===794));
 g.onPickupOffer=(_item,accept)=>accept();g.moveHero(-1,0);await g.waitForScene();
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
test('story mutations wait until the current original dialogue has been dismissed', async () => {
 const zone={width:1,height:1,tileIDs:new Int16Array([858,-1,-1]),hotspots:[],actions:[{conditions:[],instructions:[{opcode:4,args:[],text:'Wait for me.'},{opcode:0,args:[0,0,1,780,0]}]}]};
 let dismiss;const runtime=new ZoneScripts();
 const pending=runtime.run(zone,'bump',{speak:()=>new Promise(resolve=>{dismiss=resolve;})});
 assert.equal(runtime.running,true);assert.equal(zone.tileIDs[1],-1);
 dismiss();await pending;assert.equal(zone.tileIDs[1],780);assert.equal(runtime.running,false);
});
const { attackCells, outgoingDamage, incomingDamage, applyMonsterDamage, weaponCharacter } = await import('../src/engine/combat.ts');
const { generateWorld } = await import('../src/engine/world.ts');
test('combat difficulty scales outgoing and incoming damage using original formulas', () => {
 assert.equal(outgoingDamage(5, 25), 25);
 assert.equal(outgoingDamage(5, 50), 5);
 assert.equal(incomingDamage(100, 50), 50);
 assert.equal(incomingDamage(100, 25), 25);
});
test('lightsaber sweeps adjacent cells while blaster projects three cells forward', () => {
 const saberCells = attackCells(1, 18);
 assert.deepEqual(saberCells, [{ dx: 1, dy: -1 }, { dx: 1, dy: 0 }, { dx: 1, dy: 1 }]);
 const blasterCells = attackCells(2, 512);
 assert.deepEqual(blasterCells, [{ dx: 0, dy: 1 }, { dx: 0, dy: 2 }, { dx: 0, dy: 3 }]);
});
test('applying monster damage marks character as -1, clears tile and drops loot', () => {
 const zone = {
   width: 5, height: 5,
   tileIDs: new Int16Array(5 * 5 * 3).fill(-1),
   hotspots: [],
   monsters: [{
     id: 0, characterId: 2, x: 2, y: 2, loot: 422, dropsLoot: true,
     waypoints: Array(8).fill(-1), damageTaken: 0, enabled: true
   }]
 };
 zone.tileIDs[(2 * 5 + 2) * 3 + 1] = 999;
 const hit = applyMonsterDamage(zone, dta.characters, 2, 2, 100);
 assert.ok(hit);
 assert.equal(hit.killed, true);
 assert.equal(zone.monsters[0].characterId, -1);
 assert.equal(zone.tileIDs[(2 * 5 + 2) * 3 + 1], 421);
 assert.ok(zone.hotspots.some(h => h.type === 6 && h.arg === 421));
});
test('native procedural generation produces complete mission worlds for all three planets', () => {
 for (const planet of [1, 2, 3]) {
   const world = generateWorld(dta, { seed: 42, planet, size: 'small', completedCount: 0 });
   assert.equal(world.planet, planet);
   assert.ok(world.story.goalId > 0);
   assert.ok(world.story.chain1.length > 0);
   assert.ok(world.story.chain2.length > 0);
   assert.ok(world.story.initialItem > 0);
   assert.ok(world.sectors.filter(Boolean).length >= 10);
   assert.ok(world.dagobah.filter(Boolean).length >= 4);
 }
});
test('hero facing direction corresponds to correct standing tile frames', () => {
 const luke = dta.characters.find(c => c.id === 0);
 // Direction: 0=Up (North: 1032), 1=Right (East: 1029), 2=Down (South: 799), 3=Left (West: 1026)
 const facingMap = [0, 6, 1, 3];
 assert.equal(luke.frames[facingMap[0]], 1032); // Up / North
 assert.equal(luke.frames[facingMap[1]], 1029); // Right / East
 assert.equal(luke.frames[facingMap[2]], 799);  // Down / South
 assert.equal(luke.frames[facingMap[3]], 1026); // Left / West
});
test('active monsters are rendered on layer 1 and obstruct movement', () => {
 const r = new TileRenderer();
 const drawn = [];
 const fakeCtx = {
   imageSmoothingEnabled: false,
   fillStyle: '',
   fillRect() {},
   drawImage(_img, x, y) { drawn.push({ x, y }); }
 };
 r.getTileCanvas = () => ({});
 const testZone = {
   width: 5, height: 5,
   tileIDs: new Int16Array(5 * 5 * 3).fill(-1),
   hotspots: [],
   actions: [],
   monsters: [{ id: 0, characterId: 56, x: 2, y: 2, loot: -1, dropsLoot: false, waypoints: [], damageTaken: 0, enabled: true }]
 };
 r.renderZone(fakeCtx, testZone, 0, 0, dta.tiles, 799, 0, 0, false, -1, dta.characters);
 // Monster at (2, 2) drawn at screen pixel (64, 64)
 assert.ok(drawn.some(d => d.x === 64 && d.y === 64));

 const g = game();
 g.currentZone = testZone;
 g.state.heroX = 1;
 g.state.heroY = 2;
 // Walking into the monster at (2, 2) should be obstructed
 testZone.tileIDs[(2 * 5 + 1) * 3] = 858;
 testZone.tileIDs[(2 * 5 + 2) * 3] = 858;
 g.moveHero(1, 0);
 assert.equal(g.state.heroX, 1);
});

test('Dagobah opening tick runs the X-Wing arrival animation and steps Luke out at (6, 13)', async () => {
 const g = game();
 g.newWorld('small', 1);
 assert.ok(g.state.inventory.some(i => i.tileId === 18)); // Starts with lightsaber from Action #22
 g.update();
 await g.waitForScene();
 assert.equal(g.state.heroX, 6);
 assert.equal(g.state.heroY, 13);
 assert.equal(g.heroVisible, true);
 const z93 = g.worldZones.get(dta.zones.findIndex(z => z.id === 93));
 assert.equal(z93.tileIDs[(11 * 18 + 6) * 3 + 1], 953);

 // Stepping up to (6, 12) near the X-Wing must NOT re-trigger the landing animation on subsequent updates
 g.moveHero(0, -1);
 assert.equal(g.state.heroX, 6);
 assert.equal(g.state.heroY, 12);
 for (let i = 0; i < 16; i++) g.update();
 await g.waitForScene();
 assert.equal(g.state.heroX, 6);
 assert.equal(g.state.heroY, 12);
 assert.equal(g.heroVisible, true);
});

test('bumping Yoda delivers mission briefing and grants initial quest item', () => {
 const g = game();
 g.newWorld('small', 1);
 const yodaSector = g.currentWorld.dagobah.find(s => s && s.type === 16);
 assert.ok(yodaSector);
 const zIdx = dta.zones.findIndex(z => z.id === yodaSector.zoneId);
 g.loadZone(zIdx, true);
 const zone = g.worldZones.get(zIdx);
 // Place Yoda (780) at (5, 5) and Luke at (5, 6)
 zone.tileIDs[(5 * zone.width + 5) * 3 + 1] = 780;
 g.state.heroX = 5;
 g.state.heroY = 6;
 const dialogs = [];
 g.onMessageDialog = (title, text, _avatar, close) => {
   dialogs.push({ title, text });
   close?.();
 };
 g.onPickupOffer = (_item, accept) => accept();
 g.moveHero(0, -1);
 assert.equal(dialogs[0]?.title, 'Yoda');
 assert.ok(dialogs[0]?.text.length > 10);
 assert.ok(g.state.inventory.some(i => i.tileId === g.currentWorld.story.initialItem));
});

test('lightsaber attack animation uses CHAR swing body frames and places blade tile in front of Luke', () => {
 const g = game();
 g.newWorld('small', 1);
 g.state.heroX = 8;
 g.state.heroY = 8;
 g.state.direction = 1; // Right / East
 g.attack();
 const state = g.getAttackRenderState();
 assert.ok(state);
 assert.equal(state.heroTileId, 2050);
 assert.equal(state.effectTileId, 2051);
 assert.equal(state.effectX, 9);
 assert.equal(state.effectY, 8);
});

test('arriving at medical clinic (zone 642) in bed makes Luke visible, heals him and clears bed blocker', async () => {
 const g = game();
 g.newWorld('small', 1);
 const z642Idx = dta.zones.findIndex(z => z.id === 642);
 assert.ok(z642Idx >= 0);

 // Simulate space battle shoot-down ending with changeZone(642, 5, 3) and hero invisible
 g.heroVisible = false;
 g.state.health = 50;
 g.loadZone(z642Idx, true);
 g.state.heroX = 5;
 g.state.heroY = 3;

 // Initially in bed, exit (4, 3) has an obstacle tile and is not walkable
 assert.equal(g.heroVisible, false);
 assert.equal(g.isWalkable(4, 3), false);

 const dialogs = [];
 g.onMessageDialog = (title, text, _avatar, close) => {
   dialogs.push({ title, text });
   close?.();
 };

 // Run enter script and then update()
 g.runScripts('enter');
 g.update();
 await g.waitForScene();

 // Action 0 should have executed:
 // 1. Luke is healed (+300 health)
 assert.equal(g.state.health, g.state.maxHealth);
 // 2. Luke is visible
 assert.equal(g.heroVisible, true);
 // 3. Waking dialogue triggered
 assert.ok(dialogs.some(d => d.text.includes('aching head')));
 // 4. Bed blocker at (4, 3) cleared to -1, making tile walkable
 assert.equal(g.isWalkable(4, 3), true);
});

test('killing monster drops loot (e.g. blaster pistol tile 512) which is walkable and collectible into inventory', () => {
 const g = game();
 const testZone = {
   id: 1,
   planet: 2,
   width: 5,
   height: 5,
   tileIDs: new Int16Array(5 * 5 * 3).fill(-1),
   hotspots: [],
   actions: [],
   monsters: [{
     id: 0,
     characterId: 2,
     x: 2,
     y: 2,
     loot: 513, // Blaster drop (513 - 1 = 512)
     dropsLoot: true,
     waypoints: Array(8).fill(-1),
     damageTaken: 0,
     enabled: true
   }]
 };
 for (let y = 0; y < 5; y++) {
   for (let x = 0; x < 5; x++) {
     testZone.tileIDs[(y * 5 + x) * 3] = 858;
   }
 }
 g.currentZone = testZone;
 g.state.heroX = 1;
 g.state.heroY = 2;

 // Kill monster at (2, 2)
 const hit = applyMonsterDamage(testZone, dta.characters, 2, 2, 100);
 assert.ok(hit && hit.killed);
 assert.equal(testZone.tileIDs[(2 * 5 + 2) * 3 + 1], 512);
 assert.ok(testZone.hotspots.some(h => h.type === 6 && h.x === 2 && h.y === 2 && h.arg === 512));

 // Tile 512 has attribute bit 0 set (0x10041), but is walkable because of pickup hotspot
 assert.equal(g.isWalkable(2, 2), true);

 // Move Luke onto (2, 2)
 g.moveHero(1, 0);
 assert.equal(g.state.heroX, 2);
 assert.equal(g.state.heroY, 2);

 // Blaster added to inventory and map tile removed
 assert.ok(g.state.inventory.some(item => item.id === 512));
 assert.equal(testZone.tileIDs[(2 * 5 + 2) * 3 + 1], -1);
});

test('when player health is depleted to 0, defeat is triggered, game is paused and Luke cannot move', () => {
 const g = game();
 const testZone = {
   id: 1,
   planet: 2,
   width: 5,
   height: 5,
   tileIDs: new Int16Array(5 * 5 * 3).fill(-1),
   hotspots: [],
   actions: [],
   monsters: []
 };
 for (let y = 0; y < 5; y++) {
   for (let x = 0; x < 5; x++) {
     testZone.tileIDs[(y * 5 + x) * 3] = 858;
   }
 }
 g.currentZone = testZone;
 g.state.heroX = 1;
 g.state.heroY = 1;
 g.state.health = 2;
 g.state.gamesLost = 0;

 let defeatDialogShown = false;
 g.onMessageDialog = (title, text) => {
   defeatDialogShown = true;
 };

 testZone.monsters = [{
   id: 0,
   characterId: 56,
   x: 2,
   y: 1,
   loot: -1,
   dropsLoot: false,
   waypoints: [],
   damageTaken: 0,
   enabled: true
 }];

 for (let i = 0; i < 8; i++) g.update();

 assert.equal(g.state.health, 0);
 assert.equal(g.state.isPaused, true);
 assert.equal(g.state.gamesLost, 1);
 assert.equal(defeatDialogShown, true);

 // Actions are locked when dead
 g.moveHero(0, 1);
 assert.equal(g.state.heroX, 1);
 assert.equal(g.state.heroY, 1);
});





