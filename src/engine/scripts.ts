import { Condition, Instruction, Zone } from '../dta/types';

export type ScriptEvent = 'enter' | 'walk' | 'bump' | 'tick' | 'use';
export interface ScriptHost {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  usedItem: number;
  goalItem?: number;
  sectorRequiredItem?: number;
  sectorAdditionalRequiredItem?: number;
  sectorFindItem?: number;
  sectorSolved?: boolean;
  hasLeftDagobah?: boolean;
  health?: number;
  gamesWon?: number;
  hasItem(id: number): boolean;
  formatText?(text: string): string;
  speak(text: string, x?: number, y?: number): void | Promise<void>;
  delay?(milliseconds: number): void | Promise<void>;
  sound(id: number): void;
  move(x: number, y: number): void;
  setHeroVisible?(visible: boolean): void;
  changeZone?(zoneId: number, x: number, y: number): void;
  addHealth?(delta: number): void;
  solveSector?(): void;
  winGame?(): void;
  loseGame?(): void;
  addItem(id: number): void;
  removeItem(id: number): void;
  offerItem(id: number, x: number, y: number): void | boolean | Promise<void | boolean>;
}

// Recovered from Yodesk.exe 00407e90 (conditions) and 004087f0 (instructions).
// Runtime state belongs to a world instance, never to the immutable DTA catalog.
export class ZoneScripts {
  public initialized = false;
  public running = false;
  public disabled: number[] = [];
  public counter = 0;
  public random = 0;
  public sectorCounter = -1;
  public unsupported = new Set<number>();

  private tile(zone: Zone, x: number, y: number, layer: number): number {
    if (x < 0 || y < 0 || x >= zone.width || y >= zone.height || layer < 0 || layer > 2) return -1;
    return zone.tileIDs[(y * zone.width + x) * 3 + layer];
  }

  private matches(c: Condition, zone: Zone, event: ScriptEvent, host: ScriptHost): boolean {
    const [a,b,c1,d,e] = c.args;
    switch (c.opcode) {
      case 0: return event === 'enter' && !this.initialized;
      case 1: return event === 'enter';
      case 2: return event === 'bump' && host.targetX === a && host.targetY === b && (c1 < 0 || this.tile(zone,a,b,1) === c1);
      case 3: {
        if (event !== 'use') return false;
        const tx = a < 0 ? host.x : a;
        const ty = b < 0 ? host.y : b;
        const reqItem = e < 0 ? (host.sectorRequiredItem ?? -1) : e;
        return (a < 0 || host.x === a) && (b < 0 || host.y === b) && (d < 0 || this.tile(zone,tx,ty,c1) === d) && host.usedItem === reqItem;
      }
      case 4: return event === 'walk' && host.x === a && host.y === b && (c1 < 0 || this.tile(zone,a,b,0) === c1);
      case 5: return this.counter === a;
      case 6: return this.random === a;
      case 7: return this.random > a;
      case 8: return this.random < a;
      case 9: return event === 'tick';
      case 10: case 34: return this.tile(zone,b,c1,d) === a;
      case 11: {
        const m = zone.monsters?.[a];
        return !m || m.characterId < 0 || !m.enabled;
      }
      case 12: return (zone.monsters ?? []).every(m => m.characterId < 0 || !m.enabled);
      case 13: {
        const item = a < 0 ? (host.sectorFindItem ?? -1) : a;
        return item >= 0 && host.hasItem(item);
      }
      case 14: return host.sectorFindItem === a;
      case 15: return host.goalItem === a;
      case 16: return Boolean(host.sectorSolved);
      case 17: return !host.sectorSolved;
      case 18: return Boolean(host.hasLeftDagobah);
      case 19: return (host.health ?? 100) < a;
      case 20: return (host.health ?? 100) > a;
      case 22: return host.sectorRequiredItem !== a;
      case 23: {
        const item = a < 0 ? (host.sectorFindItem ?? -1) : a;
        return item < 0 || !host.hasItem(item);
      }
      case 24: return host.x === a && host.y === b;
      case 25: return this.sectorCounter === a;
      case 26: return this.sectorCounter < a;
      case 27: return this.sectorCounter > a;
      case 28: return (host.gamesWon ?? 0) === a;
      case 29: return zone.hotspots.some(h => h.type === 0 && h.enabled && h.x === a && h.y === b);
      case 30: return host.sectorAdditionalRequiredItem === a;
      case 31: return this.counter !== a;
      case 32: return this.random !== a;
      case 33: return this.sectorCounter !== a;
      case 35: return (host.gamesWon ?? 0) > a;
      default: return false;
    }
  }

  private supports(i: Instruction): boolean {
    return i.opcode >= 0 && i.opcode <= 37 && i.opcode !== 210;
  }

  public async run(zone: Zone, event: ScriptEvent, host: ScriptHost): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
    for (let index = 0; index < zone.actions.length; index++) {
      const action = zone.actions[index];
      if (this.disabled.includes(index) || !action.conditions.every(c => this.matches(c,zone,event,host))) continue;
      // Do not partially mutate an action whose behavior is not implemented.
      if (!action.instructions.every(i => this.supports(i))) {
        this.unsupported.add(index);
        continue;
      }
      instructionLoop: for (const instruction of action.instructions) {
        const [a,b,c,d,e] = instruction.args;
        const setTile = (x: number, y: number, layer: number, value: number) => {
          if (x >= 0 && y >= 0 && x < zone.width && y < zone.height && layer >= 0 && layer < 3) {
            zone.tileIDs[(y * zone.width + x) * 3 + layer] = value;
          }
        };
        let pending: void | Promise<any> = undefined;
        switch (instruction.opcode) {
          case 0: case 15: setTile(a,b,c,d); break;
          case 1: setTile(a,b,c,-1); break;
          case 2: {
            const tile = this.tile(zone,a,b,c);
            setTile(a,b,c,-1);setTile(d,e,c,tile);break;
          }
          case 3: break;
          case 4: pending = host.speak(host.formatText ? host.formatText(instruction.text || '') : (instruction.text || '')); break;
          case 5: pending = host.speak(host.formatText ? host.formatText(instruction.text || '') : (instruction.text || ''),a,b); break;
          // Canvas redraw is automatic; waits suspend without blocking the browser.
          case 6: case 7: case 8: case 11: break;
          case 9: pending = host.delay?.(Math.max(0,a)*100); break;
          case 10: host.sound(a); break;
          case 12: if (a > 0) this.random = Math.floor(Math.random()*a)+1; break;
          case 13: this.counter = a; break;
          case 14: this.counter += a; break;
          case 16: host.setHeroVisible?.(false); break;
          case 17: host.setHeroVisible?.(true); break;
          case 18: host.move(a,b); break;
          case 19: host.move(host.x + c, host.y + d); break;
          case 20: this.disabled.push(index); break;
          case 21: case 22: {
            const hotspot = zone.hotspots[a];
            if (hotspot) hotspot.enabled = instruction.opcode === 21;
            break;
          }
          case 23: case 24: {
            const m = zone.monsters?.[a];
            if (m) m.enabled = instruction.opcode === 23;
            break;
          }
          case 25: case 26: {
            for (const m of zone.monsters ?? []) m.enabled = instruction.opcode === 25;
            break;
          }
          case 27: {
            const itemId = a < 0 ? (host.sectorFindItem ?? -1) : a;
            if (itemId >= 0) {
              const res = host.offerItem(itemId,b,c);
              if (res instanceof Promise) {
                const outcome = await res;
                if (outcome === false) break instructionLoop;
              } else if (res === false) {
                break instructionLoop;
              }
            }
            break;
          }
          case 28: {
            const itemId = a < 0 ? (host.sectorFindItem ?? -1) : a;
            if (itemId >= 0) host.addItem(itemId);
            break;
          }
          case 29: {
            const itemId = a < 0 ? (host.sectorRequiredItem ?? -1) : a;
            if (itemId >= 0) host.removeItem(itemId);
            break;
          }
          case 30: host.solveSector?.(); break;
          case 31: host.winGame?.(); break;
          case 32: host.loseGame?.(); break;
          case 33: host.changeZone?.(a,b,c); break;
          case 34: this.sectorCounter = a; break;
          case 35: this.sectorCounter = ((this.sectorCounter + a) << 16) >> 16; break;
          case 36: this.random = a; break;
          case 37: host.addHealth?.(a); break;
        }
        if (pending) await pending;
      }
    }
    if (event === 'enter') this.initialized = true;
    } finally { this.running = false; }
  }
}
