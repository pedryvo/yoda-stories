import { DtaData, Puzzle, Zone } from '../dta/types';
import { generateLayout } from './layout';

export type WorldSize = 'small' | 'medium' | 'large';
export type MissionPlanet = 1 | 2 | 3;
export interface WorldOptions {
  seed: number;
  planet: MissionPlanet;
  size: WorldSize;
  completedCount: number;
  previousGoals?: number[];
  goalId?: number;
  maxAttempts?: number;
}
export interface WorldSector {
  zoneId: number;
  type: number;
  requiredItem: number;
  findItem: number;
  additionalRequiredItem: number;
  additionalFindItem: number;
  npc: number;
  puzzleIndex: number;
  alternate: boolean;
  visited: boolean;
  solved: boolean;
}
export interface WorldStory {
  goalId: number;
  chain1: number[];
  chain2: number[];
  initialItem: number;
}
export interface GeneratedWorld {
  seed: number;
  requestedSeed: number;
  planet: MissionPlanet;
  size: WorldSize;
  story: WorldStory;
  sectors: Array<WorldSector | null>;
  dagobah: Array<WorldSector | null>;
  zones: Map<number, Zone>;
  goalHistory: number[];
  rngState: number;
}
export class WorldGenerationError extends Error {}

// MSVCRT rand/srand recovered at 0042aee0/0042aed0. Arithmetic must wrap at 32 bits.
export class NativeRandom {
  public state: number;
  constructor(seed: number) { this.state = Math.abs(seed | 0) >>> 0; }
  next(): number {
    this.state = (Math.imul(this.state, 214013) + 2531011) >>> 0;
    return (this.state >>> 16) & 0x7fff;
  }
  modulo(count: number): number {
    if (!Number.isInteger(count) || count <= 0) throw new WorldGenerationError('Empty generation candidate set');
    return this.next() % count;
  }
  // 00421840 scatters entries into random empty slots in two passes. It is
  // deliberately not Fisher-Yates: changing it changes every following draw.
  shuffle<T>(values: readonly T[]): T[] {
    const remaining = [...values];
    const occupied = new Set<number>();
    const moved = new Set<number>();
    const result = new Array<T>(values.length);
    for (let i = 0; i < values.length; i++) {
      const destination = this.modulo(values.length);
      if (!occupied.has(destination)) {
        result[destination] = remaining[i]; occupied.add(destination); moved.add(i);
      }
    }
    for (let i = values.length - 1; i >= 0; i--) {
      if (moved.has(i)) continue;
      let destination: number;
      do { destination = this.modulo(values.length); } while (occupied.has(destination));
      result[destination] = remaining[i]; occupied.add(destination);
    }
    return result;
  }
}

// 00421360's mission whitelist. The planet values are the original DTA IDs.
export const MISSION_GOALS: Readonly<Record<MissionPlanet, readonly number[]>> = {
  1: [85, 115, 185, 199, 201],
  2: [103, 108, 135, 189, 197],
  3: [131, 132, 133, 134, 198],
};
export function eligibleMissionGoals(data: DtaData, options: WorldOptions): Puzzle[] {
  const history = [...(options.previousGoals || [])];
  if (history.length > 3) history.shift();
  return data.puzzles.filter(p => p.type === 3 && MISSION_GOALS[options.planet].includes(p.id) &&
    (options.goalId === p.id || !history.includes(p.id)) &&
    (p.id !== 189 || options.completedCount >= 1) &&
    (p.id !== 197 || options.completedCount >= 10) &&
    (options.goalId === undefined || p.id === options.goalId));
}
export const distanceToCenter = (x: number, y: number): number =>
  Math.max(Math.abs(x - 4.5), Math.abs(y - 4.5)) + 0.5;

const sector = (zoneId: number, type: number): WorldSector => ({
  zoneId, type, requiredItem:-1, findItem:-1, additionalRequiredItem:-1,
  additionalFindItem:-1, npc:-1, puzzleIndex:-1, alternate:false, visited:false, solved:false,
});

class Builder {
  private random: NativeRandom;
  private catalog: Map<number, Zone>;
  private zones = new Map<number, Zone>();
  private usedZones = new Set<number>();
  private usedPuzzles = new Set<number>();
  private reservedItems = new Set<number>();
  private finds = new Map<number, number>();
  private sectors: Array<WorldSector | null> = Array(100).fill(null);
  private chain1: number[] = [];
  private chain2: number[] = [];
  private typeMap: number[] = [];
  private orderMap: number[] = [];
  constructor(private data: DtaData, private options: WorldOptions) {
    this.random = new NativeRandom(options.seed);
    this.catalog = new Map(data.zones.map(z => [z.id,z]));
  }
  private roomIDs(id: number, visited = new Set<number>()): number[] {
    if (visited.has(id) || !this.catalog.has(id)) return [];
    visited.add(id);
    return [id,...this.catalog.get(id)!.hotspots.flatMap(h => h.type === 9 && h.arg >= 0 ? this.roomIDs(h.arg,visited) : [])];
  }
  private zone(id: number): Zone {
    if (!this.zones.has(id)) {
      const original = this.catalog.get(id);
      if (!original) throw new WorldGenerationError(`Missing zone ${id}`);
      this.zones.set(id,structuredClone(original));
    }
    return this.zones.get(id)!;
  }
  private list(id: number, key: 'requiredItemIDs' | 'goalItemIDs' | 'providedItemIDs' | 'npcIDs'): number[] {
    return [...new Set(this.roomIDs(id).flatMap(room => this.catalog.get(room)![key]))];
  }
  private hasProvided(id: number, item: number): boolean {
    return item < 0 || this.list(id,'providedItemIDs').includes(item);
  }
  private chooseRequired(id: number, goal: boolean): number {
    // 004211d0 chooses from the first room with eligible entries, then recurses.
    for (const room of this.roomIDs(id)) {
      const candidates = this.catalog.get(room)![goal ? 'goalItemIDs' : 'requiredItemIDs']
        .filter(item => item >= 0 && !this.reservedItems.has(item));
      if (candidates.length) return candidates[this.random.modulo(candidates.length)];
    }
    return -1;
  }
  private puzzle(item: number, type: number): Puzzle | undefined {
    return this.random.shuffle(this.data.puzzles.filter(p => p.type === type && p.item1 === item && !this.usedPuzzles.has(p.id)))[0];
  }
  private candidates(type: number): Zone[] {
    return this.random.shuffle(this.data.zones.filter(z => z.planet === this.options.planet &&
      (type === 17 ? z.zoneType === 17 || z.zoneType === 18 : z.zoneType === type) && !this.usedZones.has(z.id)));
  }
  private putAtHotspot(id: number, item: number, type: number, list?: 'requiredItemIDs' | 'goalItemIDs' | 'providedItemIDs' | 'npcIDs'): boolean {
    if (item < 0) return true;
    for (const room of this.roomIDs(id)) {
      const zone = this.zone(room);
      if (list && !zone[list].includes(item)) continue;
      const candidates = zone.hotspots.filter(h => h.type === type && (type === 12 || h.arg < 0 || h.arg === item));
      if (!candidates.length) continue;
      const hotspot = candidates[type === 12 ? 0 : this.random.modulo(candidates.length)];
      hotspot.enabled = true; hotspot.arg = item;
      return true;
    }
    return false;
  }
  private noteFind(item: number, distance: number): void {
    if (item < 0) return;
    this.finds.set(item,Math.min(this.finds.get(item) ?? Infinity,distance));
  }
  private place(index: number, zone: Zone, options: Partial<WorldSector> = {}): WorldSector {
    if (index < 0 || index >= 100 || this.sectors[index]) throw new WorldGenerationError('Occupied world sector');
    const result = { ...sector(zone.id,zone.zoneType === 18 ? 17 : zone.zoneType),...options };
    this.sectors[index] = result; this.usedZones.add(zone.id);
    for (const room of this.roomIDs(zone.id)) {
      const instance = this.zone(room);
      for (const h of instance.hotspots) if ([6,7,8].includes(h.type) && h.arg >= 0) this.reservedItems.add(h.arg);
    }
    return result;
  }
  private position(order: number): number {
    const index = this.orderMap.indexOf(order);
    if (index < 0) throw new WorldGenerationError(`Missing puzzle position ${order}`);
    return index;
  }
  private buildGoal(goal: Puzzle, index1: number, index2: number, order: number): void {
    for (const zone of this.candidates(10)) {
      if (!this.hasProvided(zone.id,goal.item1) || !this.hasProvided(zone.id,goal.item2)) continue;
      const required = this.chooseRequired(zone.id,false), additional = this.chooseRequired(zone.id,true);
      if (required < 0 || additional < 0 || required === additional) continue;
      const first = this.puzzle(required,2);
      if (!first) continue;
      this.usedPuzzles.add(first.id);
      const second = this.puzzle(additional,2);
      if (!second) { this.usedPuzzles.delete(first.id); continue; }
      const npc = this.list(zone.id,'npcIDs').find(id => id >= 0 && !this.reservedItems.has(id)) ?? -1;
      const placed = npc >= 0
        ? this.putAtHotspot(zone.id,npc,1,'npcIDs')
        : this.putAtHotspot(zone.id,goal.item1,0,'providedItemIDs') && this.putAtHotspot(zone.id,goal.item2,0,'providedItemIDs');
      if (!placed) { this.usedPuzzles.delete(first.id); continue; }
      this.usedPuzzles.add(second.id);
      this.chain1[index1] = first.id; this.chain2[index2] = second.id;
      this.reservedItems.add(required); this.reservedItems.add(additional);
      if (npc >= 0) this.reservedItems.add(npc);
      this.place(this.position(order),zone,{ requiredItem:required, additionalRequiredItem:additional, findItem:goal.item1,
        additionalFindItem:goal.item2, npc, puzzleIndex:index1, alternate:true });
      return;
    }
    throw new WorldGenerationError('No compatible goal zone and two goal puzzles');
  }
  private buildStep(chain: number[], index: number, order: number, alternate: boolean): void {
    const next = this.data.puzzles.find(p => p.id === chain[index+1]);
    if (!next) throw new WorldGenerationError('Missing next puzzle');
    const preferred = this.random.modulo(2) ? 16 : 15;
    for (const type of [preferred,preferred === 16 ? 15 : 16]) {
      for (const zone of this.candidates(type)) {
        if (!this.hasProvided(zone.id,next.item1)) continue;
        const required = this.chooseRequired(zone.id,false);
        const puzzle = this.puzzle(required,type === 16 ? 0 : 1);
        if (!puzzle) continue;
        const npcs = this.list(zone.id,'npcIDs').filter(id => id >= 0 && !this.reservedItems.has(id));
        const npc = type === 16 && npcs.length ? npcs[this.random.modulo(npcs.length)] : -1;
        if (type === 16 ? npc < 0 || !this.putAtHotspot(zone.id,npc,1,'npcIDs') :
          !this.putAtHotspot(zone.id,required,12,'requiredItemIDs') || !this.putAtHotspot(zone.id,next.item1,0,'providedItemIDs')) continue;
        chain[index] = puzzle.id; this.usedPuzzles.add(puzzle.id); this.reservedItems.add(required);
        if (npc >= 0) this.reservedItems.add(npc);
        this.place(this.position(order),zone,{ requiredItem:required,findItem:next.item1,npc,puzzleIndex:index,alternate });
        return;
      }
    }
    throw new WorldGenerationError('No compatible use/trade puzzle zone');
  }
  private fillStructure(): void {
    const types: Record<number, number> = { 201:11,301:5,302:4,303:2,304:3,101:6 };
    for (let index=0;index<100;index++) {
      const type = types[this.typeMap[index]];
      if (!type || this.sectors[index]) continue;
      const distance = distanceToCenter(index%10,Math.floor(index/10));
      let selected: Zone | undefined;
      let required = -1;
      for (const zone of this.candidates(type)) {
        if (type === 11) { selected=zone;break; }
        const item = this.chooseRequired(zone.id,false);
        if (item >= 0) { selected=zone;required=item;break; }
      }
      if (!selected && type !== 6) selected=this.candidates(1)[0];
      if (!selected) throw new WorldGenerationError('No structural zone');
      this.place(index,selected,{ requiredItem:required });
      if (required >= 0) { this.reservedItems.add(required);this.noteFind(required,type === 6 ? 5 : distance); }
      if (type === 6) {
        const link = selected.hotspots.find(h => h.type === 3 && h.arg >= 0);
        const target = link && this.catalog.get(link.arg);
        const targetIndex = this.typeMap.findIndex((t,i) => t === 102 && !this.sectors[i]);
        if (!target || targetIndex < 0 || this.usedZones.has(target.id)) throw new WorldGenerationError('Unpaired travel zone');
        this.place(targetIndex,target,{ requiredItem:required });
      }
    }
  }
  private findPosition(maximumDistance: number): number {
    const preferred: number[] = [], nearby: number[] = [], far: number[] = [];
    for (let i=0;i<100;i++) {
      if (this.sectors[i]) continue;
      const type=this.typeMap[i],distance=distanceToCenter(i%10,Math.floor(i/10));
      if (distance>maximumDistance) { if (type === 1) far.push(i); continue; }
      if (type !== 1 && type !== 300) continue;
      const adjacent=[i%10>0?i-1:-1,i%10<9?i+1:-1,i>=10?i-10:-1,i<90?i+10:-1].some(n=>n>=0&&this.typeMap[n]===306);
      (adjacent ? nearby : preferred).push(i);
    }
    const candidates=preferred.length?preferred:nearby.length?nearby:far;
    if (!candidates.length) throw new WorldGenerationError('No free sector for required find item');
    return candidates[this.random.modulo(candidates.length)];
  }
  private placeFinds(): void {
    this.noteFind(511,2); this.noteFind(421,1);
    for (const [item,distance] of this.finds) {
      const index=this.findPosition(distance);
      let selected: Zone | undefined;
      const candidateTypes = item === 511 ? [2] : item === 421 ? [2, 5] : [0, 2, 5];
      for (const zone of this.candidates(17)) {
        if (!this.hasProvided(zone.id,item)) continue;
        for (const t of candidateTypes) {
          if (this.putAtHotspot(zone.id,item,t,'providedItemIDs')) { selected=zone;break; }
        }
        if (selected) break;
      }
      if (!selected) throw new WorldGenerationError(`No find zone for item ${item}`);
      this.place(index,selected,{findItem:item}); this.reservedItems.add(item);this.typeMap[index]=306;
    }
    for (let index=0;index<100;index++) {
      if (this.sectors[index] || ![1,300,104].includes(this.typeMap[index])) continue;
      const candidates=this.candidates(1).filter(z=>!z.hotspots.some(h=>h.type===13));
      if (!candidates.length) throw new WorldGenerationError('No unused empty zone');
      this.place(index,candidates[0]);
    }
  }
  private prepareDagobah(goal: Puzzle, gift: number): Array<WorldSector | null> {
    const result: Array<WorldSector | null>=Array(100).fill(null);
    for (const [index,id] of [[44,94],[45,95],[54,93],[55,96]]) {
      this.zone(id);result[index]=sector(id,this.sectors[index]?.type ?? 1);
    }
    const choice=goal.id===132?3:goal.id===189?4:this.random.modulo(4);
    const index=[44,45,55,54,45][choice];
    const place=result[index]!;
    place.type=16;place.findItem=gift;place.npc=choice===4?2034:780;
    if (choice===1 || choice===4) {
      const hut=this.zone(535);
      const h=hut.hotspots.find(h=>h.x===3&&h.y===(choice===4?2:3));
      if (!h) throw new WorldGenerationError('Missing Yoda hut spawn');
      h.enabled=true;h.arg=place.npc;
    } else if (!this.putAtHotspot(place.zoneId,780,1,'npcIDs')) throw new WorldGenerationError('Missing Yoda spawn');
    return result;
  }
  private activateHotspots(): void {
    for (const zone of this.zones.values()) for (const h of zone.hotspots) {
      if (h.enabled && h.type >= 0 && h.type <= 8 && h.arg >= 0) {
        const index=(h.y*zone.width+h.x)*3+1;
        if (zone.tileIDs[index]<0) zone.tileIDs[index]=h.arg;
      }
    }
  }
  build(): GeneratedWorld {
    const layout=generateLayout(this.random,this.options.size);
    this.typeMap=[...layout.typeMap];this.orderMap=[...layout.orderMap];
    const count=layout.puzzleCount;
    if (count<2) throw new WorldGenerationError('Too few puzzle positions');
    const goals=this.random.shuffle(eligibleMissionGoals(this.data,this.options));
    const goal=goals[0];if (!goal) throw new WorldGenerationError('No eligible mission');
    const first=count%2 ? (count+1)/2 : count/2+1;
    const second=count%2 ? (count+1)/2 : count/2;
    this.chain1=Array(first+1).fill(-1);this.chain2=Array(second+1).fill(-1);
    this.chain1[first]=goal.id;this.chain2[second]=goal.id;this.usedPuzzles.add(goal.id);
    this.fillStructure();
    this.buildGoal(goal,first-1,second-1,count-1);
    let order=count-2;
    for (let index=first-2;index>=0;index--) this.buildStep(this.chain1,index,order--,true);
    for (let index=second-2;index>=0;index--) this.buildStep(this.chain2,index,index,false);
    const initial1=this.data.puzzles.find(p=>p.id===this.chain1[0])!.item1;
    const initial2=this.data.puzzles.find(p=>p.id===this.chain2[0])!.item1;
    this.noteFind(initial1,2);this.noteFind(initial2,2);this.placeFinds();
    this.random.next();
    const dagobah=this.prepareDagobah(goal,initial1);this.activateHotspots();
    const history=[...(this.options.previousGoals||[])];if(history.length>3)history.shift();history.push(goal.id);
    return { seed:this.options.seed,requestedSeed:this.options.seed,planet:this.options.planet,size:this.options.size,
      story:{goalId:goal.id,chain1:this.chain1,chain2:this.chain2,initialItem:initial1},sectors:this.sectors,dagobah,
      zones:this.zones,goalHistory:history,rngState:this.random.state };
  }
}

// Like the original 004047d0 caller, retry failed constraint assignments with a
// new seed. The effective seed is retained so a successful world can be replayed.
export function generateWorld(data: DtaData, options: WorldOptions): GeneratedWorld {
  let failure: unknown;
  const attempts=options.maxAttempts ?? 64;
  for(let attempt=0;attempt<attempts;attempt++) {
    try {
      const result=new Builder(data,{...options,seed:(options.seed+attempt)|0}).build();
      result.requestedSeed=options.seed;return result;
    } catch(error) { if (!(error instanceof WorldGenerationError)) throw error; failure=error; }
  }
  throw new WorldGenerationError(`Could not generate a compatible world: ${failure instanceof Error?failure.message:String(failure)}`);
}
