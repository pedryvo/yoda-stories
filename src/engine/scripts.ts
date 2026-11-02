import { Condition, Instruction, Zone } from '../dta/types';

export type ScriptEvent = 'enter' | 'walk' | 'bump' | 'tick' | 'use';
export interface ScriptHost {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  usedItem: number;
  hasItem(id: number): boolean;
  speak(text: string, x?: number, y?: number): void | Promise<void>;
  delay?(milliseconds: number): void | Promise<void>;
  sound(id: number): void;
  move(x: number, y: number): void;
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
      case 2: return event === 'bump' && host.targetX === a && host.targetY === b && this.tile(zone,a,b,1) === c1;
      case 3: return event === 'use' && host.x === a && host.y === b && this.tile(zone,a,b,c1) === d && host.usedItem === e;
      case 4: return event === 'walk' && host.x === a && host.y === b && this.tile(zone,a,b,0) === c1;
      case 5: return this.counter === a;
      case 6: return this.random === a;
      case 7: return this.random > a;
      case 8: return this.random < a;
      case 9: return event === 'tick';
      case 10: case 34: return this.tile(zone,b,c1,d) === a;
      case 13: return a >= 0 && host.hasItem(a);
      case 24: return host.x === a && host.y === b;
      case 25: return this.sectorCounter === a;
      case 26: return this.sectorCounter < a;
      case 27: return this.sectorCounter > a;
      case 29: return zone.hotspots.some(h => h.type === 0 && h.enabled && h.x === a && h.y === b);
      case 31: return this.counter !== a;
      case 32: return this.random !== a;
      case 33: return this.sectorCounter !== a;
      // Mission, combat and world-generation conditions require their real state.
      default: return false;
    }
  }

  private supports(i: Instruction): boolean {
    return [0,1,2,4,5,8,9,10,11,12,13,14,15,18,20,21,22,27,28,29,34,35,36].includes(i.opcode);
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
          case 4: pending = host.speak(instruction.text || ''); break;
          case 5: pending = host.speak(instruction.text || '',a,b); break;
          // Canvas redraw is automatic; waits suspend without blocking the browser.
          case 8: case 11: break;
          case 9: pending = host.delay?.(Math.max(0,a)*100); break;
          case 10: host.sound(a); break;
          case 12: if (a > 0) this.random = Math.floor(Math.random()*a)+1; break;
          case 13: this.counter = a; break;
          case 14: this.counter += a; break;
          case 18: host.move(a,b); break;
          case 20: this.disabled.push(index); break;
          case 21: case 22: {
            const hotspot = zone.hotspots[a];
            if (hotspot) hotspot.enabled = instruction.opcode === 21;
            break;
          }
          case 27:
            if (a >= 0) {
              const res = host.offerItem(a,b,c);
              if (res instanceof Promise) {
                const outcome = await res;
                if (outcome === false) break instructionLoop;
              } else if (res === false) {
                break instructionLoop;
              }
            }
            break;
          case 28: if (a >= 0) host.addItem(a); break;
          case 29: if (a >= 0) host.removeItem(a); break;
          case 34: this.sectorCounter = a; break;
          case 35: this.sectorCounter = ((this.sectorCounter + a) << 16) >> 16; break;
          case 36: this.random = a; break;
        }
        if (pending) await pending;
      }
    }
    if (event === 'enter') this.initialized = true;
    } finally { this.running = false; }
  }
}
