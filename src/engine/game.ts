import { DtaData, Zone, Tile } from '../dta/types';
import { parseDta } from '../dta/parser';
import { AudioManager } from '../audio/audio-manager';
import { TileRenderer, CANVAS_WIDTH, CANVAS_HEIGHT } from '../render/renderer';
import { t } from '../i18n';
import { ZoneScripts, ScriptEvent, ScriptHost } from './scripts';
import { attackCells, outgoingDamage, weaponCharacter, applyMonsterDamage } from './combat';
import { generateWorld, GeneratedWorld, WorldSize, MissionPlanet, WorldSector } from './world';

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
  public heroVisible: boolean = true;
  public hasLeftDagobah: boolean = false;
  private pendingPostEnter: boolean = false;
  private doorReturnStack: Array<{ zoneId: number; x: number; y: number }> = [];

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
      const bumpTile = this.currentZone.tileIDs[(targetY * this.currentZone.width + targetX) * 3 + 1];
      if (
        this.currentZone.id === 93 &&
        [952, 953, 954, 955].includes(bumpTile) &&
        this.currentWorld
      ) {
        const yodaSector = this.currentWorld.dagobah.find(s => s && s.type === 16);
        if (yodaSector && !yodaSector.solved) {
          this.showNativeDialog('Luke Skywalker', 'Wait, I hear Yoda calling...', 799);
          this.notifyState();
          return;
        }
      }
      this.runScripts('bump', targetX, targetY);
      if (!this.storyDialogue && this.handleNpcBump(targetX, targetY)) {
        this.notifyState();
        return;
      }
      this.audio.playSound('nogo.wav');
      return;
    }

    this.state.heroX = targetX;
    this.state.heroY = targetY;
    this.walkFrame = (this.walkFrame + 1) % 4;

    if (this.checkPositionHotspots(true)) {
      this.notifyState();
      return;
    }

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

  private findZoneIndexById(zoneId: number): number {
    return this.dta ? this.dta.zones.findIndex(z => z.id === zoneId) : -1;
  }

  private getCurrentSector(): WorldSector | null {
    if (!this.currentWorld || !this.currentZone) return null;
    const candidateIds = [
      this.currentZone.id,
      ...this.doorReturnStack.map(r => r.zoneId).reverse(),
    ];
    for (const id of candidateIds) {
      const dag = this.currentWorld.dagobah.find(s => s && s.zoneId === id);
      if (dag) return dag;
      const sec = this.currentWorld.sectors.find(s => s && s.zoneId === id);
      if (sec) return sec;
    }
    if (this.currentZone.id === 535) {
      return this.currentWorld.dagobah.find(s => s && s.type === 16) ?? null;
    }
    return null;
  }

  private handleZoneEdgeTransition(dx: number, dy: number): void {
    if (!this.dta || !this.currentZone) return;
    let targetZoneId = -1;
    if (this.currentZone.planet === 5) {
      // Fixed Dagobah cells recovered from 004286f0.
      const cells = [{ id:94,x:4,y:4 },{ id:95,x:5,y:4 },{ id:93,x:4,y:5 },{ id:96,x:5,y:5 }];
      const cell = cells.find(c => c.id === this.currentZone!.id);
      const neighbor = cell && cells.find(c => c.x === cell.x+dx && c.y === cell.y+dy);
      if (neighbor) targetZoneId = neighbor.id;
    } else if (this.currentWorld) {
      const secIdx = this.currentWorld.sectors.findIndex(s => s?.zoneId === this.currentZone!.id);
      if (secIdx >= 0) {
        const nx = (secIdx % 10) + dx;
        const ny = Math.floor(secIdx / 10) + dy;
        if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
          const neighbor = this.currentWorld.sectors[ny * 10 + nx];
          if (neighbor) targetZoneId = neighbor.zoneId;
        }
      }
    }
    const index = targetZoneId >= 0 ? this.findZoneIndexById(targetZoneId) : -1;
    if (index < 0) { this.audio.playSound('nogo.wav'); return; }
    const next = this.dta.zones[index];
    const x = dx > 0 ? 0 : dx < 0 ? next.width-1 : this.state.heroX;
    const y = dy > 0 ? 0 : dy < 0 ? next.height-1 : this.state.heroY;
    const old = this.state.currentZoneId;
    this.loadZone(index,true);
    if (!this.isWalkable(x,y)) { this.loadZone(old,true); return; }
    this.state.heroX = x;
    this.state.heroY = y;
    const sector = this.getCurrentSector();
    if (sector) sector.visited = true;
    this.audio.playSound('truckin.wav');
    this.runScripts('enter');
    this.notifyState();
  }

  private checkPositionHotspots(fromMove: boolean): boolean {
    if (!this.currentZone || !this.dta) return false;
    const x = this.state.heroX;
    const y = this.state.heroY;
    for (const h of this.currentZone.hotspots) {
      if (!h.enabled || h.x !== x || h.y !== y) continue;
      // Type 14: VehicleTo (X-Wing from Dagobah to mission planet)
      if (h.type === 14 && h.arg >= 0) {
        const targetIdx = this.findZoneIndexById(h.arg);
        if (targetIdx >= 0) {
          this.hasLeftDagobah = true;
          this.doorReturnStack = [];
          this.loadZone(targetIdx, true);
          const vf = this.currentZone.hotspots.find(spot => spot.type === 15);
          if (vf) {
            this.state.heroX = vf.x;
            this.state.heroY = vf.y;
          }
          const sector = this.getCurrentSector();
          if (sector) sector.visited = true;
          this.runScripts('enter');
          if (!this.storyDialogue) {
            this.pendingPostEnter = false;
            this.runScripts('walk', this.state.heroX, this.state.heroY);
            if (!this.storyDialogue) this.runScripts('tick');
          }
          return true;
        }
      }
      // Type 15: VehicleFrom (X-Wing from mission planet back to Dagobah)
      if (h.type === 15 && h.arg >= 0) {
        const targetIdx = this.findZoneIndexById(h.arg);
        if (targetIdx >= 0) {
          this.doorReturnStack = [];
          this.loadZone(targetIdx, true);
          const vt = this.currentZone.hotspots.find(spot => spot.type === 14 && spot.enabled) ??
            this.currentZone.hotspots.find(spot => spot.type === 14);
          this.state.heroX = vt ? vt.x : 6;
          this.state.heroY = vt ? vt.y + 2 : 12;
          const runtime = this.scripts.get(targetIdx);
          if (runtime) runtime.counter = 3;
          this.runScripts('enter');
          if (!this.storyDialogue) {
            this.pendingPostEnter = false;
            this.runScripts('walk', this.state.heroX, this.state.heroY);
            if (!this.storyDialogue) this.runScripts('tick');
          }
          return true;
        }
      }
      // Type 9: DoorIn (enter interior room)
      if (h.type === 9 && h.arg >= 0 && fromMove) {
        const targetIdx = this.findZoneIndexById(h.arg);
        if (targetIdx >= 0) {
          this.doorReturnStack.push({ zoneId: this.currentZone.id, x, y });
          this.loadZone(targetIdx, true);
          const doorOut = this.currentZone.hotspots.find(spot => spot.type === 10);
          if (doorOut) {
            this.state.heroX = doorOut.x;
            this.state.heroY = doorOut.y;
          }
          this.audio.playSound('door.wav');
          this.runScripts('enter');
          return true;
        }
      }
      // Type 10: DoorOut (exit interior room)
      if (h.type === 10 && fromMove) {
        const ret = this.doorReturnStack.pop() ?? (h.arg >= 0 ? { zoneId: h.arg, x: -1, y: -1 } : null);
        if (ret) {
          const targetIdx = this.findZoneIndexById(ret.zoneId);
          if (targetIdx >= 0) {
            const roomZoneId = this.currentZone.id;
            this.loadZone(targetIdx, true);
            if (ret.x >= 0 && ret.y >= 0) {
              this.state.heroX = ret.x;
              this.state.heroY = ret.y;
            } else {
              const doorIn = this.currentZone.hotspots.find(spot => spot.type === 9 && spot.arg === roomZoneId);
              if (doorIn) {
                this.state.heroX = doorIn.x;
                this.state.heroY = doorIn.y;
              }
            }
            this.audio.playSound('door.wav');
            this.runScripts('enter');
            return true;
          }
        }
      }
      // Type 3 / 4: TeleporterTo / TeleporterFrom
      if ((h.type === 3 || h.type === 4) && h.arg >= 0 && fromMove) {
        const targetIdx = this.findZoneIndexById(h.arg);
        if (targetIdx >= 0) {
          const pairedType = h.type === 3 ? 4 : 3;
          this.loadZone(targetIdx, true);
          const paired = this.currentZone.hotspots.find(spot => spot.type === pairedType);
          if (paired) {
            this.state.heroX = paired.x;
            this.state.heroY = paired.y;
          }
          const sector = this.getCurrentSector();
          if (sector) sector.visited = true;
          this.runScripts('enter');
          return true;
        }
      }
      // Type 0, 2, 5, 6, 8: Item pickup hotspot placed on ground
      if ([0, 2, 5, 6, 8].includes(h.type) && h.arg >= 0 && fromMove) {
        const idx = (y * this.currentZone.width + x) * 3 + 1;
        if (this.currentZone.tileIDs[idx] === h.arg) {
          this.currentZone.tileIDs[idx] = -1;
          h.enabled = false;
          this.offerOrAddQuestItem(h.arg, x, y, () => {
            this.currentZone!.tileIDs[idx] = h.arg;
            h.enabled = true;
          });
          return true;
        }
      }
    }
    return false;
  }

  private showNativeDialog(
    title: string,
    text: string,
    avatarTileId?: number,
    onClose?: () => void
  ): void {
    if (!this.onMessageDialog) {
      onClose?.();
      return;
    }
    this.storyDialogue = true;
    this.onMessageDialog(title, text, avatarTileId, () => {
      this.storyDialogue = false;
      onClose?.();
      this.notifyState();
    });
  }

  private offerOrAddQuestItem(
    tileId: number,
    x: number,
    y: number,
    onCancel?: () => void,
    onAccept?: () => void
  ): void {
    const tile = this.dta?.tiles[tileId];
    if (!tile) return;
    const item: InventoryItem = {
      id: tileId,
      tileId,
      name: tile.name || `Item ${tileId}`,
      type: (tile.attributes & 0x40) !== 0 ? 'weapon' : 'quest',
      count: 1,
    };
    if (this.onPickupOffer) {
      this.storyDialogue = true;
      this.onPickupOffer(
        item,
        () => {
          this.storyDialogue = false;
          this.addStoryItem(tileId);
          onAccept?.();
          this.notifyState();
        },
        () => {
          this.storyDialogue = false;
          onCancel?.();
          this.notifyState();
        }
      );
    } else {
      this.addStoryItem(tileId);
      onAccept?.();
    }
  }

  private handleNpcBump(targetX: number, targetY: number): boolean {
    if (!this.currentZone || !this.dta) return false;
    const tileId = this.currentZone.tileIDs[(targetY * this.currentZone.width + targetX) * 3 + 1];
    if (tileId < 0) return false;

    // 004128c0 Case A: Bumping into Yoda (780 or 2034) on Dagobah
    if ((tileId === 780 || tileId === 2034) && this.currentWorld) {
      const yodaSector =
        this.currentWorld.dagobah.find(s => s && s.type === 16) ?? this.getCurrentSector();
      const goalPuzzle = this.dta.puzzles.find(p => p.id === this.currentWorld!.story.goalId);
      if (yodaSector && goalPuzzle) {
        if (!yodaSector.solved) {
          const text = goalPuzzle.texts[3] || goalPuzzle.texts[0] || 'May the Force be with you.';
          const giftId =
            yodaSector.findItem >= 0 ? yodaSector.findItem : this.currentWorld.story.initialItem;
          const grantGift = () => {
            if (giftId >= 0) {
              this.offerOrAddQuestItem(
                giftId,
                targetX,
                targetY,
                () => {
                  yodaSector.solved = false;
                },
                () => {
                  yodaSector.solved = true;
                }
              );
            } else {
              yodaSector.solved = true;
            }
          };
          this.showNativeDialog('Yoda', text, tileId, grantGift);
        } else {
          const text = this.hasLeftDagobah
            ? 'You must complete your mission, Luke!'
            : goalPuzzle.texts[2] || goalPuzzle.texts[3] || 'May the Force be with you.';
          this.showNativeDialog('Yoda', text, tileId);
        }
        return true;
      }
    }

    // 004128c0 Case B: Bumping into a Puzzle NPC on the Mission Planet
    const sector = this.getCurrentSector();
    if (sector && sector.npc === tileId && sector.puzzleIndex >= 0 && this.currentWorld) {
      const chain = sector.alternate ? this.currentWorld.story.chain1 : this.currentWorld.story.chain2;
      const puzzle = this.dta.puzzles.find(p => p.id === chain[sector.puzzleIndex]);
      if (puzzle) {
        const npcName = this.dta.tiles[tileId]?.name || 'Yoda Stories';
        if (!sector.solved) {
          const nextPuzzle = this.dta.puzzles.find(p => p.id === chain[sector.puzzleIndex + 1]);
          const text = [puzzle.texts[0], nextPuzzle?.texts[2]].filter(Boolean).join(' ');
          if (text) {
            this.showNativeDialog(npcName, text, tileId);
          }
        } else {
          const text = puzzle.texts[1] || puzzle.texts[0] || '';
          if (text) {
            this.showNativeDialog(npcName, text, tileId);
          }
        }
        return true;
      }
    }

    return false;
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
    if (event === 'enter') this.pendingPostEnter = true;
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
    const sector = this.getCurrentSector();
    const goalPuzzle = this.currentWorld
      ? this.dta.puzzles.find(p => p.id === this.currentWorld!.story.goalId)
      : undefined;
    let hostMoved = false;
    let zoneChanged = false;
    const host: ScriptHost = {
      x: this.state.heroX, y: this.state.heroY, targetX, targetY,
      usedItem: this.state.equippedItem?.tileId ?? -1,
      goalItem: goalPuzzle?.item1 ?? -1,
      sectorRequiredItem: sector?.requiredItem ?? -1,
      sectorAdditionalRequiredItem: sector?.additionalRequiredItem ?? -1,
      sectorFindItem: sector?.findItem ?? -1,
      sectorSolved: sector?.solved ?? false,
      hasLeftDagobah: this.hasLeftDagobah,
      health: this.state.health,
      gamesWon: this.state.gamesWon,
      hasItem: id => this.state.inventory.some(i => i.tileId === id && i.count > 0),
      formatText: text => {
        if (!text.includes('@') && !text.includes('#')) return text;
        const reqName = (sector && sector.requiredItem >= 0 ? this.dta?.tiles[sector.requiredItem]?.name : '') || 'item';
        const findName = (sector && sector.findItem >= 0 ? this.dta?.tiles[sector.findItem]?.name : '') || 'item';
        return text.replace(/@/g, reqName).replace(/#/g, findName);
      },
      speak: (text, x, y) => {
        const tileId = x === undefined || y === undefined ? 799 : zone.tileIDs[(y*zone.width+x)*3+1];
        return suspend(next => this.onMessageDialog ? this.onMessageDialog(x === undefined ? 'Luke Skywalker' : this.dta!.tiles[tileId]?.name || 'Yoda Stories',text,tileId,next) : next());
      },
      delay: milliseconds => milliseconds ? new Promise(resolve => setTimeout(resolve,milliseconds)) : undefined,
      sound: id => {
        const sound = this.dta!.sounds[id];
        if (sound) this.audio.playSound(sound.replace(/^.*[\\/]/,''));
      },
      move: (x,y) => {
        this.state.heroX = host.x = x;
        this.state.heroY = host.y = y;
        hostMoved = true;
      },
      setHeroVisible: visible => {
        this.heroVisible = visible;
      },
      changeZone: (zoneId, x, y) => {
        const idx = this.findZoneIndexById(zoneId);
        if (idx >= 0) {
          zoneChanged = true;
          this.loadZone(idx, true);
          this.state.heroX = host.x = x;
          this.state.heroY = host.y = y;
        }
      },
      addHealth: delta => {
        this.state.health = Math.max(0, Math.min(this.state.maxHealth, this.state.health + delta));
      },
      solveSector: () => {
        if (sector) sector.solved = true;
        host.sectorSolved = true;
      },
      winGame: () => {
        if (sector) sector.solved = true;
        this.state.gamesWon++;
        this.state.score += 500;
        localStorage.setItem('yoda_games_won', this.state.gamesWon.toString());
        if (this.state.score > this.state.highScore) {
          this.state.highScore = this.state.score;
          localStorage.setItem('yoda_high_score', this.state.highScore.toString());
        }
      },
      loseGame: () => {
        this.state.gamesLost++;
        localStorage.setItem('yoda_games_lost', this.state.gamesLost.toString());
      },
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
              i.opcode === 27 && (i.args[0] === id || i.args[0] < 0) && i.args[1] === x && i.args[2] === y));
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
      if (this.scriptTask === tracked) {
        this.storyDialogue = false;
        if (zoneChanged) {
          this.runScripts('enter');
        } else if (hostMoved) {
          if (!this.checkPositionHotspots(false) && event === 'tick') {
            this.runScripts('walk', this.state.heroX, this.state.heroY);
          }
        }
        this.notifyState();
      }
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
    if (this.handlePuzzleItemUse(item)) return;

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

  private handlePuzzleItemUse(item: InventoryItem): boolean {
    if (!this.currentZone || !this.dta || !this.currentWorld) return false;
    const sector = this.getCurrentSector();
    if (!sector || sector.solved || sector.puzzleIndex < 0) return false;
    if (item.tileId !== sector.requiredItem && item.tileId !== sector.additionalRequiredItem) return false;

    const dirs = [[0, 0], [0, -1], [1, 0], [0, 1], [-1, 0]];
    const chain = sector.alternate ? this.currentWorld.story.chain1 : this.currentWorld.story.chain2;
    const puzzle = this.dta.puzzles.find(p => p.id === chain[sector.puzzleIndex]);

    for (const [dx, dy] of dirs) {
      const tx = this.state.heroX + dx;
      const ty = this.state.heroY + dy;
      if (tx < 0 || ty < 0 || tx >= this.currentZone.width || ty >= this.currentZone.height) continue;
      const l1Tile = this.currentZone.tileIDs[(ty * this.currentZone.width + tx) * 3 + 1];
      const hasUseHotspot = this.currentZone.hotspots.some(
        h => h.enabled && (h.type === 12 || h.type === 1) && h.x === tx && h.y === ty
      );
      if ((sector.npc >= 0 && l1Tile === sector.npc) || hasUseHotspot) {
        const usedFirst = item.tileId === sector.requiredItem;
        const rewardId = usedFirst ? sector.findItem : sector.additionalFindItem;
        item.count--;
        if (item.count <= 0) {
          this.state.inventory = this.state.inventory.filter(i => i !== item);
          if (this.state.equippedItem === item) this.state.equippedItem = null;
        }
        sector.solved = true;
        const grantReward = () => {
          if (rewardId >= 0) {
            this.offerOrAddQuestItem(rewardId, tx, ty);
          }
          this.notifyState();
        };
        const text = puzzle?.texts[1] || '';
        const speakerName = sector.npc >= 0 ? (this.dta.tiles[sector.npc]?.name || 'Yoda Stories') : 'Luke Skywalker';
        if (this.onMessageDialog && text) {
          this.onMessageDialog(speakerName, text, sector.npc >= 0 ? sector.npc : 799, grantReward);
        } else {
          grantReward();
        }
        return true;
      }
    }
    return false;
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
    this.tickCount = 0;
    this.heroVisible = true;
    this.hasLeftDagobah = false;
    this.doorReturnStack = [];

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
    if (this.pendingPostEnter) {
      this.pendingPostEnter = false;
      this.runScripts('walk', this.state.heroX, this.state.heroY);
      if (!this.storyDialogue) {
        this.runScripts('tick');
      }
    }
    if (this.tickCount % 8 === 0 && !this.storyDialogue) {
      this.updateMonsters();
    }
    if (this.isAttacking) {
      this.attackTimer--;
      if (this.attackTimer <= 0) {
        this.isAttacking = false;
        this.notifyState();
      }
    }
  }

  private updateMonsters(): void {
    if (!this.currentZone || !this.dta || !this.currentZone.monsters) return;
    for (const m of this.currentZone.monsters) {
      if (!m.enabled || m.characterId < 0) continue;
      const dx = Math.sign(this.state.heroX - m.x);
      const dy = Math.sign(this.state.heroY - m.y);
      const dist = Math.abs(this.state.heroX - m.x) + Math.abs(this.state.heroY - m.y);
      if (dist <= 1) {
        const char = this.dta.characters.find(c => c.id === m.characterId);
        const dmg = Math.max(1, (char?.damage ?? 2) * 2);
        this.state.health = Math.max(0, this.state.health - dmg);
        this.notifyState();
      } else if (dist <= 6) {
        const stepX = dx !== 0 && this.isWalkable(m.x + dx, m.y) && (m.x + dx !== this.state.heroX || m.y !== this.state.heroY) ? m.x + dx : m.x;
        const stepY = stepX === m.x && dy !== 0 && this.isWalkable(m.x, m.y + dy) && (m.x !== this.state.heroX || m.y + dy !== this.state.heroY) ? m.y + dy : m.y;
        m.x = stepX;
        m.y = stepY;
      }
    }
  }

  public getAttackRenderState(): {
    heroTileId: number;
    effectTileId: number;
    effectX: number;
    effectY: number;
  } | null {
    if (!this.isAttacking || !this.dta || !this.state.equippedWeapon) return null;
    const weaponTile = this.state.equippedWeapon.tileId;
    const weaponChar = weaponCharacter(this.dta.characters, weaponTile);
    const facing = [0, 6, 1, 3][this.state.direction];
    const stageGroup = this.attackTimer > 8 ? 1 : this.attackTimer > 4 ? 2 : 1;
    const heroTileId =
      weaponChar && weaponChar.frames[stageGroup * 8 + facing] > 0
        ? weaponChar.frames[stageGroup * 8 + facing]
        : -1;
    const [dx, dy] = [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ][this.state.direction];

    if (weaponTile === 18 || weaponTile === 510) {
      // Lightsaber blade extension tile is stored in the diagonal slots [2, 7, 4, 5] of group 1 & 2
      const bladeOffset = [2, 7, 4, 5][this.state.direction];
      const effectTileId = weaponChar?.frames[stageGroup * 8 + bladeOffset] ?? -1;
      return {
        heroTileId,
        effectTileId,
        effectX: this.state.heroX + dx,
        effectY: this.state.heroY + dy,
      };
    }

    // Ranged weapons (Blaster, Rifle, The Force, Thermal Detonator) use group 0 directional projectile frames
    const effectTileId = weaponChar?.frames[facing] ?? -1;
    const step = this.attackTimer > 8 ? 1 : this.attackTimer > 4 ? 2 : 3;
    return {
      heroTileId,
      effectTileId,
      effectX: this.state.heroX + dx * step,
      effectY: this.state.heroY + dy * step,
    };
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
    let heroTileId = this.heroVisible ? (luke?.frames[frameGroup*8+facing] ?? 799) : -1;
    let weaponTileId = -1;
    let weaponEffectX: number | undefined = undefined;
    let weaponEffectY: number | undefined = undefined;

    if (this.heroVisible && this.isAttacking) {
      const attackState = this.getAttackRenderState();
      if (attackState) {
        if (attackState.heroTileId > 0) heroTileId = attackState.heroTileId;
        weaponTileId = attackState.effectTileId;
        weaponEffectX = attackState.effectX;
        weaponEffectY = attackState.effectY;
      }
    }

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
      this.heroVisible && this.isAttacking,
      weaponTileId,
      this.dta.characters,
      weaponEffectX,
      weaponEffectY
    );
  }

  private notifyState(): void {
    if (this.onStateUpdate) {
      this.onStateUpdate({ ...this.state });
    }
  }
}
