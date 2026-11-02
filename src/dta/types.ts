export interface Tile {
  id: number;
  attributes: number;
  pixels: Uint8Array;
  name: string;
}

export interface Hotspot {
  type: number;
  x: number;
  y: number;
  enabled: boolean;
  arg: number;
}

export interface Condition {
  opcode: number;
  args: number[];
  text?: string;
}

export interface Instruction {
  opcode: number;
  args: number[];
  text?: string;
}

export interface Action {
  conditions: Condition[];
  instructions: Instruction[];
}

export interface Monster {
  id: number;
  characterId: number;
  x: number;
  y: number;
  damage: number;
}

export interface Zone {
  id: number;
  planet: number;
  width: number;
  height: number;
  zoneType: number;
  tileIDs: Int16Array; // 3 * width * height: layer 0, layer 1, layer 2
  hotspots: Hotspot[];
  monsters: Monster[];
  actions: Action[];
  requiredItemIDs: number[];
  goalItemIDs: number[];
  providedItemIDs: number[];
  npcIDs: number[];
}

export interface Character {
  id: number;
  name: string;
  type: number;
  movementType: number;
  frames: number[];
}

export interface DtaData {
  version: number;
  startupImage: Uint8Array;
  sounds: string[];
  tiles: Tile[];
  zones: Zone[];
  characters: Character[];
}
