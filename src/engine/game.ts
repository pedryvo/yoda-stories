import { DtaData, Zone, Tile } from '../dta/types';
import { parseDta } from '../dta/parser';
import { AudioManager } from '../audio/audio-manager';
import { TileRenderer, CANVAS_WIDTH, CANVAS_HEIGHT } from '../render/renderer';
import { t } from '../i18n';
import { ZoneScripts, ScriptEvent, ScriptHost } from './scripts';
import { attackCells, outgoingDamage, weaponCharacter, applyMonsterDamage } from './combat';
import { generateWorld, GeneratedWorld, WorldSize, MissionPlanet } from './world';

export type Direction = 0 | 1 | 2 | 3; // 0: Up (North), 1: Right (East), 2: Down (South), 3: Left (West)

export interface InventoryItem {
  id: number;
  tileId: number;
  name: string;
  type: 'weapon' | 'key' | 'usable' | 'quest';
  count: number;
}

export interface GameState {
  currentZoneId: number;
  planet: number; // 0: Tatooine, 1: Hoth, 2: Dagobah
  planetName: string;
  heroX: number;
  heroY: number;
  direction: Direction;
  health: number;
  maxHealth: number;
  force: number;
  maxForce: number;
  equippedWeapon: InventoryItem | null;
  equippedItem: InventoryItem | null;
  inventory: InventoryItem[];
  locatorAngle: number; // in degrees, 0..360 pointing to goal
  isPaused: boolean;
  gameSpeed: 'slow' | 'normal' | 'fast';
  combatDifficulty: 'easy' | 'medium' | 'hard';
  worldControl: 'small' | 'medium' | 'large';
  score: number;
  highScore: number;
  gamesWon: number;
  gamesLost: number;
}

export class YodaGame {
  public dta: DtaData | null = null;
  public audio: AudioManager;
  public renderer: TileRenderer;

  public state: GameState;
  private currentZone: Zone | null = null;
  private isAttacking: boolean = false;
  private attackTimer: number = 0;
  private walkFrame: number = 0;
  private tickCount: number = 0;
  private worldZones = new Map<number, Zone>();
  private scripts = new Map<number, ZoneScripts>();
  private storyDialogue = false;
  private scriptTask: Promise<void> = Promise.resolve();
  public currentWorld: GeneratedWorld | null = null;

  // Callback hooks for HTML5 UI
  public onStateUpdate?: (state: GameState) => void;
  public onMessageDialog?: (title: string, text: string, avatarTileId?: number, onClose?: () => void) => void;
  public onPickupOffer?: (item: InventoryItem, accept: () => void, cancel: () => void) => void;

  constructor() {
    this.audio = new AudioManager();
    this.renderer = new TileRenderer();

    const storedHigh = parseInt(localStorage.getItem('yoda_high_score') || '0', 10);
    const storedWon = parseInt(localStorage.getItem('yoda_games_won') || '0', 10);
    const storedLost = parseInt(localStorage.getItem('yoda_games_lost') || '0', 10);

    this.state = {
      currentZoneId: -1,
      planet: 2, // Dagobah
      planetName: 'Dagobah',
      heroX: 4,
      heroY: 4,
      direction: 2, // South
      health: 100,
      maxHealth: 100,
      force: 100,
      maxForce: 100,
      equippedWeapon: null,
      equippedItem: null,
      inventory: [],
      locatorAngle: 45,
      isPaused: false,
      gameSpeed: 'normal',
      combatDifficulty: 'medium',
      worldControl: 'medium',
      score: 0,
      highScore: storedHigh,
      gamesWon: storedWon,
      gamesLost: storedLost,
    };
  }

  public async init(dtaBuffer?: ArrayBuffer): Promise<void> {
    if (!dtaBuffer) {
      const base = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
      const url = `${base}yodesk.dta`.replace(/\/{2,}/g, '/');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Could not load yodesk.dta (${res.status} ${res.statusText})`);
      dtaBuffer = await res.arrayBuffer();
    }

    this.dta = parseDta(dtaBuffer);
    console.log(
      `Yoda Stories DTA loaded: ${this.dta.tiles.length} tiles, ${this.dta.zones.length} zones.`
    );

    this.state.inventory = [];
    this.state.equippedWeapon = null;
    this.state.equippedItem = null;

    // The original loads STUP before a world is requested from the File menu.
    this.currentZone = null;
    this.state.currentZoneId = -1;
    this.notifyState();
  }

  public get showingStartup(): boolean {
    return this.dta !== null && this.currentZone === null;
  }

  public loadZone(zoneId: number, preservePosition = false): void {
    if (!this.dta || zoneId < 0 || zoneId >= this.dta.zones.length) return;
    if (!this.worldZones.has(zoneId)) {
      this.worldZones.set(zoneId, structuredClone(this.dta.zones[zoneId]));
    }
    this.currentZone = this.worldZones.get(zoneId)!;
    this.state.currentZoneId = zoneId;
    this.state.planet = this.currentZone.planet;
    const planetMap: Record<number, string> = {
      0: 'Space',
      1: 'Tatooine',
      2: 'Hoth',
      3: 'Endor',
      5: 'Dagobah',
    };
    this.state.planetName = planetMap[this.currentZone.planet] || 'Dagobah';

    if (!preservePosition) {
      const centerX = Math.floor(this.currentZone.width / 2);
      const centerY = Math.floor(this.currentZone.height / 2);
      let bestDist = Infinity;
      for (let y = 0; y < this.currentZone.height; y++) {
        for (let x = 0; x < this.currentZone.width; x++) {
          if (!this.isWalkable(x, y)) continue;
          const dist = Math.hypot(x - centerX, y - centerY);
          if (dist < bestDist) {
            bestDist = dist;
            this.state.heroX = x;
            this.state.heroY = y;
          }
        }
      }
    }

    if (!preservePosition) this.runScripts('enter');
    this.notifyState();
  }

  public moveHero(dx: number, dy: number): void {
    if (this.state.isPaused || this.storyDialogue || !this.currentZone) return;

    if (dy < 0) this.state.direction = 0; // Up
    else if (dx > 0) this.state.direction = 1; // Right
    else if (dy > 0) this.state.direction = 2; // Down
    else if (dx < 0) this.state.direction = 3; // Left

    const targetX = this.state.heroX + dx;
    const targetY = this.state.heroY + dy;

    // Check Zone boundaries
    if (
      targetX < 0 ||
      targetX >= this.currentZone.width ||
      targetY < 0 ||
      targetY >= this.currentZone.height
    ) {
      // Transition to neighbor zone if available
      this.handleZoneEdgeTransition(dx, dy);
      return;
    }

    if (!this.isWalkable(targetX, targetY)) {
      this.runScripts('bump', targetX, targetY);
      this.audio.playSound('nogo.wav');
      return;
    }

    this.state.heroX = targetX;
    this.state.heroY = targetY;
    this.walkFrame = (this.walkFrame + 1) % 4;

    // Check interactive hotspots in new position
    this.runScripts('walk', targetX, targetY);
    this.notifyState();
  }

  private isWalkable(x: number, y: number): boolean {
    if (!this.currentZone || !this.dta) return false;
    const { width, height, tileIDs } = this.currentZone;
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const offset = (y * width + x) * 3;
    const floor = this.dta.tiles[tileIDs[offset]];
    const object = this.dta.tiles[tileIDs[offset + 1]];
    // Ground is bit 1; foreground sprites and objects block. Roofs do not.
    if (!floor || (floor.attributes & 0x02) === 0 || (object && (object.attributes & 0x05) !== 0)) {
      return false;
    }
    const hasMonster = this.currentZone.monsters?.some(
      m => m.enabled && m.characterId >= 0 && m.x === x && m.y === y
    );
    return !hasMonster;
  }

  private handleZoneEdgeTransition(dx: number, dy: number): void {
    if (!this.dta || !this.currentZone) return;
    // Fixed Dagobah cells recovered from 004286f0. Other planets require
    // the procedural world graph; catalog order does not describe neighbors.
    const cells = [{ id:94,x:4,y:4 },{ id:95,x:5,y:4 },{ id:93,x:4,y:5 },{ id:96,x:5,y:5 }];
    const cell = cells.find(c => c.id === this.currentZone!.id);
    const neighbor = cell && cells.find(c => c.x === cell.x+dx && c.y === cell.y+dy);
    const index = neighbor ? this.dta.zones.findIndex(z => z.id === neighbor.id) : -1;
    if (index < 0) { this.audio.playSound('nogo.wav'); return; }
    const next = this.dta.zones[index];
    const x = dx > 0 ? 0 : dx < 0 ? next.width-1 : this.state.heroX;
    const y = dy > 0 ? 0 : dy < 0 ? next.height-1 : this.state.heroY;
    const old = this.state.currentZoneId;
    this.loadZone(index,true);
    if (!this.isWalkable(x,y)) { this.loadZone(old,true); return; }
    this.state.heroX = x;
    this.state.heroY = y;
    this.audio.playSound('truckin.wav');
    this.runScripts('enter');
    this.notifyState();
  }

  private addStoryItem(tileId: number): void {
    const tile = this.dta?.tiles[tileId];
    if (!tile) return;
    const existing = this.state.inventory.find(i => i.tileId === tileId);
    if (existing) existing.count++;
    else {
      const item: InventoryItem = { id:tileId, tileId, name:tile.name || `Item ${tileId}`, type: (tile.attributes & 0x40) !== 0 ? 'weapon' : 'quest', count:1 };
      this.state.inventory.push(item);
      if (item.type === 'weapon' && !this.state.equippedWeapon) this.state.equippedWeapon = item;
    }
    this.notifyState();
  }

  private runScripts(event: ScriptEvent, targetX = this.state.heroX, targetY = this.state.heroY): void {
    const zone = this.currentZone;
    if (!zone || !this.dta || this.storyDialogue) return;
    let runtime = this.scripts.get(this.state.currentZoneId);
    if (!runtime) {
      runtime = new ZoneScripts();
      runtime.sectorCounter = zone.sectorCounter ?? -1;
      this.scripts.set(this.state.currentZoneId, runtime);
    }
    const suspend = <T = void>(show: (resume: (value?: T) => void) => void): T | Promise<T> => {
      let done = false;
      let val: any;
      let resolve!: (value: any) => void;
      const pending = new Promise<T>(finish => { resolve = finish; });
      show((value?: T) => { done = true; val = value; resolve(value); });
      return done ? val : pending;
    };
    const host: ScriptHost = {
      x: this.state.heroX, y: this.state.heroY, targetX, targetY,
      usedItem: this.state.equippedItem?.tileId ?? -1,
      hasItem: id => this.state.inventory.some(i => i.tileId === id && i.count > 0),
      speak: (text, x, y) => {
        const tileId = x === undefined || y === undefined ? 799 : zone.tileIDs[(y*zone.width+x)*3+1];
        return suspend(next => this.onMessageDialog ? this.onMessageDialog(x === undefined ? 'Luke Skywalker' : this.dta!.tiles[tileId]?.name || 'Yoda Stories',text,tileId,next) : next());
      },
      delay: milliseconds => milliseconds ? new Promise(resolve => setTimeout(resolve,milliseconds)) : undefined,
      sound: id => {
        const sound = this.dta!.sounds[id];
        if (sound) this.audio.playSound(sound.replace(/^.*[\\/]/,''));
      },
      move: (x,y) => { this.state.heroX = host.x = x; this.state.heroY = host.y = y; },
      addItem: id => this.addStoryItem(id),
      removeItem: id => {
        const item = this.state.inventory.find(i => i.tileId === id);
        if (item && --item.count <= 0) {
          this.state.inventory = this.state.inventory.filter(i => i !== item);
          if (this.state.equippedItem === item) this.state.equippedItem = null;
          if (this.state.equippedWeapon === item) this.state.equippedWeapon = null;
        }
      },
      offerItem: (id,x,y) => {
        const tile = this.dta!.tiles[id];
        if (!tile) return false;
        return suspend<boolean>(next => {
          const item: InventoryItem = { id, tileId:id, name:tile.name || `Item ${id}`,type:'quest',count:1 };
          const cancel = () => {
            zone.tileIDs[(y*zone.width+x)*3+1] = id;
            // The web confirmation can be dismissed; keep the pickup's
            // originating action available rather than losing the quest item.
            runtime.disabled = runtime.disabled.filter(index => !zone.actions[index].instructions.some(i =>
              i.opcode === 27 && i.args[0] === id && i.args[1] === x && i.args[2] === y));
            next(false);
          };
          if (this.onPickupOffer) this.onPickupOffer(item,() => { this.addStoryItem(id);next(true); },cancel);
          else cancel();
        });
      },
    };
    const task = runtime.run(zone,event,host);
    this.storyDialogue = runtime.running;
    const tracked = task.finally(() => {
      if (this.scriptTask === tracked) { this.storyDialogue = false; this.notifyState(); }
    });
    this.scriptTask = tracked;
  }

  public waitForScene(): Promise<void> {
    return this.scriptTask;
  }

  public attack(): void {
    if (this.state.isPaused || this.storyDialogue || !this.currentZone || !this.state.equippedWeapon || this.isAttacking) return;
    this.isAttacking = true;
    this.attackTimer = 12; // 12 frames duration

    if ([18, 510].includes(this.state.equippedWeapon!.tileId)) {
      // Lightsaber
      const sounds = ['saberswg.wav', 'saberout.wav', 'schwing.wav'];
      const snd = sounds[Math.floor(Math.random() * sounds.length)];
      this.audio.playSound(snd);
    } else {
      // Blaster
      this.audio.playSound('blaster.wav');
    }

    // Check hit against nearby monsters
    this.checkAttackHit();
    this.notifyState();
  }

  private checkAttackHit(): void {
    if (!this.currentZone || !this.dta || !this.state.equippedWeapon) return;
    const weaponTile = this.state.equippedWeapon.tileId;
    const weaponChar = weaponCharacter(this.dta.characters, weaponTile);
    const baseDamage = weaponChar?.damage ?? 5;
    const diffMap: Record<string, number> = { easy: 25, medium: 50, hard: 75 };
    const diff = diffMap[this.state.combatDifficulty] ?? 50;
    const damage = outgoingDamage(baseDamage, diff);
    const cells = attackCells(this.state.direction, weaponTile);

    for (const cell of cells) {
      const hitX = this.state.heroX + cell.dx;
      const hitY = this.state.heroY + cell.dy;
      const hit = applyMonsterDamage(this.currentZone, this.dta.characters, hitX, hitY, damage);
      if (hit) {
        this.audio.playSound('bangmed.wav');
        if (hit.killed) {
          this.state.score += 50;
          if (this.state.score > this.state.highScore) {
            this.state.highScore = this.state.score;
            localStorage.setItem('yoda_high_score', this.state.highScore.toString());
          }
        }
        if (weaponTile !== 18 && weaponTile !== 510) break;
      }
    }
  }

  public useEquippedItem(): void {
    if (this.state.isPaused || this.storyDialogue || !this.currentZone || !this.state.equippedItem) return;
    this.runScripts('use');
    if (this.storyDialogue) return;
    const item = this.state.equippedItem;

    if (item.tileId === 505) {
      // Medkit: Heal Luke
      if (this.state.health < this.state.maxHealth) {
        this.state.health = Math.min(this.state.maxHealth, this.state.health + 40);
        this.audio.playSound('chirp.wav');
        item.count--;
        if (item.count <= 0) {
          this.state.inventory = this.state.inventory.filter((i) => i !== item);
          this.state.equippedItem = null;
        }
        this.notifyState();
      }
    } else if (item.tileId === 421) {
      // Locator: Compass ping
      this.audio.playSound('locator.wav');
      // Update angle towards goal
      this.state.locatorAngle = (this.state.locatorAngle + 45) % 360;
      this.notifyState();
    }
  }

  public equipWeapon(item: InventoryItem): void {
    this.state.equippedWeapon = item;
    this.audio.playSound('armed.wav');
    this.notifyState();
  }

  public equipItem(item: InventoryItem): void {
    this.state.equippedItem = item;
    this.audio.playSound('blip.wav');
    this.notifyState();
  }

  public togglePause(): boolean {
    this.state.isPaused = !this.state.isPaused;
    this.notifyState();
    return this.state.isPaused;
  }

  public newWorld(size: WorldSize = 'medium', planet?: MissionPlanet): void {
    if (!this.dta || this.storyDialogue) return;
    // Native setup (004286f0) starts at world cell (4,5), the southwest
    // Dagobah sector (93), with Luke at pixel (320,320).
    const startZone = this.dta.zones.findIndex(z => z.id === 93);
    if (startZone < 0) throw new Error('Missing Dagobah starting sector (93)');

    try {
      this.currentWorld = generateWorld(this.dta, {
        seed: Date.now() & 0x7fffffff,
        planet: planet ?? ((Math.floor(Math.random() * 3) + 1) as MissionPlanet),
        size,
        completedCount: this.state.gamesWon,
      });
    } catch {
      this.currentWorld = null;
    }

    this.state.health = 100;
    this.state.force = 100;
    this.state.score = 0;
    this.state.worldControl = size;
    this.state.isPaused = false;
    this.state.direction = 2;
    this.state.inventory = [];
    this.state.equippedWeapon = null;
    this.state.equippedItem = null;
    this.worldZones.clear();
    this.scripts.clear();
    this.storyDialogue = false;
    this.isAttacking = false;
    this.walkFrame = 0;

    if (this.currentWorld) {
      for (const [id, zone] of this.currentWorld.zones) {
        const idx = this.dta.zones.findIndex(z => z.id === id);
        if (idx >= 0) this.worldZones.set(idx, zone);
      }
    }

    this.audio.playSound('opening.wav');
    this.state.heroX = 10;
    this.state.heroY = 10;
    this.loadZone(startZone, true);
    this.runScripts('enter');
  }

  public saveWorld(): void {
    if (!this.currentZone || this.storyDialogue) return;
    const serialized = JSON.stringify({
      state: this.state,
      zones: [...this.worldZones].map(([index, zone]) => ({ index, tileIDs: Array.from(zone.tileIDs), hotspots: zone.hotspots, monsters: zone.monsters })),
      scripts: [...this.scripts].map(([index, script]) => ({ index, initialized: script.initialized, disabled: script.disabled, counter: script.counter, random: script.random, sectorCounter: script.sectorCounter })),
      date: new Date().toISOString(),
    });
    localStorage.setItem('yoda_save_game', serialized);
    this.audio.playSound('blip.wav');
    if (this.onMessageDialog) {
      this.onMessageDialog(t().menus.saveWorld, 'Game world successfully saved to browser storage!');
    }
  }

  public loadWorld(): void {
    const raw = localStorage.getItem('yoda_save_game');
    if (!raw) {
      this.audio.playSound('nogo.wav');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed.state) {
        this.worldZones.clear();
        this.scripts.clear();
        this.storyDialogue = false;
        for (const saved of parsed.zones || []) {
          const original = this.dta?.zones[saved.index];
          if (original && saved.tileIDs.length === original.tileIDs.length) {
            this.worldZones.set(saved.index, { ...structuredClone(original), tileIDs: Int16Array.from(saved.tileIDs), hotspots: saved.hotspots, monsters: saved.monsters });
          }
        }
        for (const saved of parsed.scripts || []) {
          const script = new ZoneScripts();
          Object.assign(script, { initialized:saved.initialized, disabled:saved.disabled, counter:saved.counter, random:saved.random, sectorCounter:saved.sectorCounter });
          this.scripts.set(saved.index,script);
        }
        this.state = parsed.state;
        this.state.equippedWeapon = this.state.inventory.find(i => i.id === this.state.equippedWeapon?.id) || null;
        this.state.equippedItem = this.state.inventory.find(i => i.id === this.state.equippedItem?.id) || null;
        this.loadZone(this.state.currentZoneId, true);
        this.audio.playSound('cantina.wav');
        if (this.onMessageDialog) {
          this.onMessageDialog(t().menus.loadWorld, 'Game world successfully loaded!');
        }
      }
    } catch (e) {
      console.warn('Could not load save:', e);
    }
  }

  public update(): void {
    if (this.state.isPaused || this.storyDialogue) return;

    this.tickCount++;
    if (this.tickCount % 8 === 0) this.runScripts('tick');
    if (this.isAttacking) {
      this.attackTimer--;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.notifyState();
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.dta && this.showingStartup) {
      this.renderer.renderStartupImage(ctx, this.dta.startupImage);
      return;
    }
    if (!this.dta || !this.currentZone) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      return;
    }

    const luke = this.dta.characters.find(c => c.id === 0);
    const frameGroup = [0, 1, 0, 2][this.walkFrame];
    // Direction: 0=Up (North: 1032), 1=Right (East: 1029), 2=Down (South: 799), 3=Left (West: 1026)
    // Character 0 frame offsets: 0=North, 6=East, 1=South, 3=West
    const facing = [0, 6, 1, 3][this.state.direction];
    const heroTileId = luke?.frames[frameGroup*8+facing] ?? 799;
    const weaponTileId = this.state.equippedWeapon?.tileId || 18;

    // Viewport camera centered on Luke (9x9 view)
    let camX = this.state.heroX - 4;
    let camY = this.state.heroY - 4;
    camX = Math.max(0, Math.min(camX, this.currentZone.width - 9));
    camY = Math.max(0, Math.min(camY, this.currentZone.height - 9));

    this.renderer.renderZone(
      ctx,
      this.currentZone,
      camX,
      camY,
      this.dta.tiles,
      heroTileId,
      this.state.heroX,
      this.state.heroY,
      this.isAttacking,
      weaponTileId,
      this.dta.characters
    );
  }

  private notifyState(): void {
    if (this.onStateUpdate) {
      this.onStateUpdate({ ...this.state });
    }
  }
}
