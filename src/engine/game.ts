import { DtaData, Zone, Tile } from '../dta/types';
import { parseDta } from '../dta/parser';
import { AudioManager } from '../audio/audio-manager';
import { TileRenderer, CANVAS_WIDTH, CANVAS_HEIGHT } from '../render/renderer';
import { t } from '../i18n';

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

  // Luke Skywalker Tile Frames (extracted from Character 0 in Yodesk.dta)
  // [Down, Up, Right, Left] x [Idle, Walk1, Walk2]
  private heroFrames: number[][] = [
    [1026, 1027, 1028], // North / Up
    [1029, 1030, 1031], // East / Right
    [799, 1024, 1025],  // South / Down
    [1032, 1033, 1034], // West / Left
  ];

  // Callback hooks for HTML5 UI
  public onStateUpdate?: (state: GameState) => void;
  public onMessageDialog?: (title: string, text: string, avatarTileId?: number) => void;

  constructor() {
    this.audio = new AudioManager();
    this.renderer = new TileRenderer();

    const storedHigh = parseInt(localStorage.getItem('yoda_high_score') || '1250', 10);
    const storedWon = parseInt(localStorage.getItem('yoda_games_won') || '3', 10);
    const storedLost = parseInt(localStorage.getItem('yoda_games_lost') || '1', 10);

    this.state = {
      currentZoneId: 0,
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

    // Initial Inventory with classic items
    const lightsaber: InventoryItem = {
      id: 1,
      tileId: 18, // LightsaberBlue
      name: t().items.lightsaber,
      type: 'weapon',
      count: 1,
    };
    const blaster: InventoryItem = {
      id: 2,
      tileId: 512, // Blaster
      name: t().items.blaster,
      type: 'weapon',
      count: 1,
    };
    const locatorItem: InventoryItem = {
      id: 3,
      tileId: 421, // Locator
      name: t().items.locator,
      type: 'usable',
      count: 1,
    };
    const medkitItem: InventoryItem = {
      id: 4,
      tileId: 505, // RebelFirstAidKit
      name: t().items.medkit,
      type: 'usable',
      count: 2,
    };

    this.state.inventory = [lightsaber, blaster, locatorItem, medkitItem];
    this.state.equippedWeapon = lightsaber;
    this.state.equippedItem = locatorItem;

    // Find Dagobah starting zone (Dagobah is Planet 5, Zone 94 DagobahNorthWest)
    let startZoneIdx = this.dta.zones.findIndex(
      (z) => z.id === 94 || (z.planet === 5 && z.tileIDs.length > 0)
    );
    if (startZoneIdx === -1) startZoneIdx = 0;

    this.loadZone(startZoneIdx);
    this.audio.playMusic('opening.wav', false);
  }

  public loadZone(zoneId: number, preservePosition = false): void {
    if (!this.dta || zoneId < 0 || zoneId >= this.dta.zones.length) return;
    this.currentZone = this.dta.zones[zoneId];
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

    this.notifyState();
  }

  public moveHero(dx: number, dy: number): void {
    if (this.state.isPaused || !this.currentZone) return;

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
      this.audio.playSound('nogo.wav');
      return;
    }

    this.state.heroX = targetX;
    this.state.heroY = targetY;
    this.walkFrame = (this.walkFrame + 1) % 3;

    // Check interactive hotspots in new position
    this.checkHotspots(targetX, targetY);
    this.notifyState();
  }

  private isWalkable(x: number, y: number): boolean {
    if (!this.currentZone || !this.dta) return false;
    const { width, height, tileIDs } = this.currentZone;
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const offset = (y * width + x) * 3;
    const floor = this.dta.tiles[tileIDs[offset]];
    const object = this.dta.tiles[tileIDs[offset + 1]];
    // Ground is bit 1; bit 2 identifies objects. Overhead tiles do not block Luke.
    return !!floor && (floor.attributes & 0x02) !== 0 &&
      (!object || (object.attributes & 0x04) === 0);
  }

  private handleZoneEdgeTransition(dx: number, dy: number): void {
    if (!this.dta) return;
    // Walk to next procedural zone
    const nextZoneId = (this.state.currentZoneId + 1) % this.dta.zones.length;
    this.audio.playSound('truckin.wav');
    this.loadZone(nextZoneId);

    // Position hero at opposite edge
    if (dx > 0) this.state.heroX = 0;
    else if (dx < 0) this.state.heroX = this.currentZone!.width - 1;
    if (dy > 0) this.state.heroY = 0;
    else if (dy < 0) this.state.heroY = this.currentZone!.height - 1;
  }

  private checkHotspots(x: number, y: number): void {
    if (!this.currentZone) return;
    for (const h of this.currentZone.hotspots) {
      if (h.enabled && h.x === x && h.y === y) {
        this.audio.playSound('locator.wav');
        if (this.onMessageDialog) {
          this.onMessageDialog('Dagobah', t().lore.yodaGreeting, 780);
        }
        break;
      }
    }
  }

  public attack(): void {
    if (this.state.isPaused || this.isAttacking) return;
    this.isAttacking = true;
    this.attackTimer = 12; // 12 frames duration

    if (this.state.equippedWeapon?.id === 1) {
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
    if (!this.currentZone) return;
    const dx = this.state.direction === 1 ? 1 : this.state.direction === 3 ? -1 : 0;
    const dy = this.state.direction === 2 ? 1 : this.state.direction === 0 ? -1 : 0;
    const hitX = this.state.heroX + dx;
    const hitY = this.state.heroY + dy;

    // Check monsters in range
    const monsterIdx = this.currentZone.monsters.findIndex((m) => m.x === hitX && m.y === hitY);
    if (monsterIdx !== -1) {
      this.audio.playSound('bangmed.wav');
      this.currentZone.monsters.splice(monsterIdx, 1);
      this.state.score += 50;
      if (this.state.score > this.state.highScore) {
        this.state.highScore = this.state.score;
        localStorage.setItem('yoda_high_score', this.state.highScore.toString());
      }
    }
  }

  public useEquippedItem(): void {
    if (this.state.isPaused || !this.state.equippedItem) return;
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

  public newWorld(size: 'small' | 'medium' | 'large' = 'medium'): void {
    this.state.health = 100;
    this.state.force = 100;
    this.state.score = 0;
    this.state.worldControl = size;
    this.audio.playSound('opening.wav');

    if (this.dta) {
      const randZone = Math.floor(Math.random() * this.dta.zones.length);
      this.loadZone(randZone);
    }
    if (this.onMessageDialog) {
      this.onMessageDialog(t().appName, t().lore.dagobahArrival, 780);
    }
  }

  public saveWorld(): void {
    const serialized = JSON.stringify({
      state: this.state,
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
        this.state = parsed.state;
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
    if (this.state.isPaused) return;

    this.tickCount++;
    if (this.isAttacking) {
      this.attackTimer--;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.notifyState();
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.dta || !this.currentZone) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      return;
    }

    const dirFrames = this.heroFrames[this.state.direction] || this.heroFrames[2];
    const heroTileId = dirFrames[this.walkFrame] || 799;
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
      weaponTileId
    );
  }

  private notifyState(): void {
    if (this.onStateUpdate) {
      this.onStateUpdate({ ...this.state });
    }
  }
}
