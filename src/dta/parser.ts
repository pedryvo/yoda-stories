import { DtaData, Tile, Zone, Hotspot, Action, Monster, Character, Puzzle } from './types';

class BinaryReader {
  private view: DataView;
  public offset: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
  }

  get remaining(): number {
    return this.view.byteLength - this.offset;
  }

  readUint8(): number {
    const val = this.view.getUint8(this.offset);
    this.offset += 1;
    return val;
  }

  readUint16(): number {
    const val = this.view.getUint16(this.offset, true);
    this.offset += 2;
    return val;
  }

  readInt16(): number {
    const val = this.view.getInt16(this.offset, true);
    this.offset += 2;
    return val;
  }

  readUint32(): number {
    const val = this.view.getUint32(this.offset, true);
    this.offset += 4;
    return val;
  }

  readInt32(): number {
    const val = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return val;
  }

  readFourCC(): string {
    let str = '';
    for (let i = 0; i < 4; i++) {
      str += String.fromCharCode(this.readUint8());
    }
    return str;
  }

  readBytes(count: number): Uint8Array {
    const arr = new Uint8Array(this.view.buffer, this.view.byteOffset + this.offset, count);
    this.offset += count;
    return arr;
  }

  readCString(maxLen: number): string {
    const bytes = this.readBytes(maxLen);
    let len = 0;
    while (len < maxLen && bytes[len] !== 0) len++;
    return new TextDecoder('latin1').decode(bytes.subarray(0, len));
  }

  skip(count: number): void {
    this.offset += count;
  }
}

export function parseDta(buffer: ArrayBuffer): DtaData {
  const reader = new BinaryReader(buffer);

  // 1. VERS
  const versTag = reader.readFourCC();
  if (versTag !== 'VERS') {
    throw new Error(`Expected VERS chunk, found ${versTag}`);
  }
  const version = reader.readUint16();
  reader.skip(2); // padding

  // 2. STUP (Startup splash image: 288x288 = 82944 bytes)
  const stupTag = reader.readFourCC();
  if (stupTag !== 'STUP') {
    throw new Error(`Expected STUP chunk, found ${stupTag}`);
  }
  const stupSize = reader.readUint32();
  const startupImage = new Uint8Array(reader.readBytes(stupSize));

  // 3. SNDS (Sound catalogue)
  const sndsTag = reader.readFourCC();
  if (sndsTag !== 'SNDS') {
    throw new Error(`Expected SNDS chunk, found ${sndsTag}`);
  }
  const sndsSize = reader.readUint32();
  const sndsEnd = reader.offset + sndsSize;
  const sounds: string[] = [];
  reader.skip(2);
  while (reader.offset < sndsEnd) {
    const strLen = reader.readUint16();
    if (strLen === 0 || strLen > 256) break;
    const soundName = reader.readCString(strLen);
    if (soundName) sounds.push(soundName);
  }
  reader.offset = sndsEnd;

  // 4. TILE
  const tileTag = reader.readFourCC();
  if (tileTag !== 'TILE') {
    throw new Error(`Expected TILE chunk, found ${tileTag}`);
  }
  const tileSize = reader.readUint32();
  const tileCount = Math.floor(tileSize / (4 + 1024));
  const tiles: Tile[] = [];

  for (let i = 0; i < tileCount; i++) {
    const attributes = reader.readUint32();
    const pixels = new Uint8Array(reader.readBytes(1024));
    tiles.push({
      id: i,
      attributes,
      pixels,
      name: '',
    });
  }

  // 5. ZONE
  const zoneTag = reader.readFourCC();
  if (zoneTag !== 'ZONE') {
    throw new Error(`Expected ZONE chunk, found ${zoneTag}`);
  }
  const zoneCount = reader.readUint16();
  const zones: Zone[] = [];

  for (let z = 0; z < zoneCount; z++) {
    const zoneStart = reader.offset;
    const planet = reader.readUint16();
    const zoneSize = reader.readUint32();
    const nextZoneOffset = zoneStart + 6 + zoneSize;

    const zoneIdx = reader.readUint16();
    const izonTag = reader.readFourCC();
    if (izonTag !== 'IZON') {
      console.warn(`Zone ${z} invalid tag ${izonTag}`);
      reader.offset = nextZoneOffset;
      continue;
    }
    const izonSize = reader.readUint32();

    const width = reader.readUint16();
    const height = reader.readUint16();
    const zoneType = reader.readUint32();
    const sectorCounter = reader.readInt16();
    reader.skip(2); // planetAgain

    // 3 layers of width * height stored interleaved by (y * width + x) * 3 + layer
    const totalTiles = 3 * width * height;
    const tileIDs = new Int16Array(totalTiles);
    for (let t = 0; t < totalTiles; t++) {
      tileIDs[t] = reader.readInt16();
    }

    // Hotspots
    let hotspotCount = 0;
    const hotspots: Hotspot[] = [];
    if (reader.offset + 2 <= nextZoneOffset) {
      hotspotCount = reader.readUint16();
      for (let h = 0; h < hotspotCount; h++) {
        if (reader.offset + 12 > nextZoneOffset) break;
        const type = reader.readUint32();
        const x = reader.readUint16();
        const y = reader.readUint16();
        const enabled = reader.readUint16() !== 0;
        const arg = reader.readInt16();
        hotspots.push({ type, x, y, enabled, arg });
      }
    }

    // IZAX/IZX2/IZX3 sizes include their eight-byte header. IZX4's size
    // counts only its payload. Actions follow IZX4 as a counted IACT list.
    const monsters: Monster[] = [];
    let requiredItemIDs: number[] = [];
    let goalItemIDs: number[] = [];
    let providedItemIDs: number[] = [];
    let npcIDs: number[] = [];
    for (const tag of ['IZAX', 'IZX2', 'IZX3', 'IZX4']) {
      const start = reader.offset;
      if (reader.readFourCC() !== tag) throw new Error(`Zone ${zoneIdx}: expected ${tag}`);
      const size = reader.readUint32();
      const end = start + size + (tag === 'IZX4' ? 8 : 0);
      if (end < reader.offset || end > nextZoneOffset) throw new Error(`Zone ${zoneIdx}: invalid ${tag} size`);
      const readIDs = () => {
        const count = reader.readUint16();
        if (reader.offset + count*2 > end) throw new Error(`Zone ${zoneIdx}: truncated ${tag} list`);
        return Array.from({ length:count }, () => reader.readInt16());
      };
      if (tag === 'IZAX') {
        reader.skip(2);
        const count = reader.readUint16();
        if (reader.offset + count*44 > end) throw new Error(`Zone ${zoneIdx}: truncated monsters`);
        for (let i = 0; i < count; i++) {
          const characterId = reader.readInt16();
          const x = reader.readUint16();
          const y = reader.readUint16();
          const loot = reader.readInt16();
          const dropsLoot = reader.readUint32() !== 0;
          const waypoints = Array.from({ length:8 }, () => reader.readInt32());
          monsters.push({ id:i, characterId, x, y, loot, dropsLoot, waypoints, damageTaken:0, enabled:true });
        }
        requiredItemIDs = readIDs();
        goalItemIDs = readIDs();
      } else if (tag === 'IZX2') providedItemIDs = readIDs();
      else if (tag === 'IZX3') npcIDs = readIDs();
      reader.offset = end;
    }
    const actions: Action[] = [];
    const actionCount = reader.readUint16();
    for (let a = 0; a < actionCount; a++) {
      if (reader.readFourCC() !== 'IACT') throw new Error(`Zone ${zoneIdx}: expected IACT`);
      const size = reader.readUint32();
      const end = reader.offset + size;
      if (end > nextZoneOffset) throw new Error(`Zone ${zoneIdx}: invalid IACT size`);
      const readCommands = () => {
        const count = reader.readUint16();
        const commands = [];
        for (let c = 0; c < count; c++) {
          if (reader.offset + 14 > end) throw new Error(`Zone ${zoneIdx}: truncated command`);
          const opcode = reader.readUint16();
          const args = Array.from({ length: 5 }, () => reader.readInt16());
          const textLength = reader.readUint16();
          if (reader.offset + textLength > end) throw new Error(`Zone ${zoneIdx}: truncated dialogue`);
          const text = reader.readCString(textLength);
          commands.push({ opcode, args, text });
        }
        return commands;
      };
      actions.push({ conditions: readCommands(), instructions: readCommands() });
      if (reader.offset !== end) throw new Error(`Zone ${zoneIdx}: unexpected action payload`);
    }

    zones.push({
      id: zoneIdx,
      planet,
      width,
      height,
      zoneType,
      sectorCounter,
      tileIDs,
      hotspots,
      monsters,
      actions,
      requiredItemIDs,
      goalItemIDs,
      providedItemIDs,
      npcIDs,
    });

    // Jump reliably to the start of next zone
    reader.offset = nextZoneOffset;
  }

  const puzzles: Puzzle[] = [];
  const characters: Character[] = [];
  // Follow chunk boundaries; searching arbitrary byte offsets can mistake
  // dialogue text for a chunk marker and loses complete catalogs.
  while (reader.remaining >= 8) {
    const tag = reader.readFourCC();
    const size = reader.readUint32();
    const end = reader.offset + size;
    if (end > buffer.byteLength) throw new Error(`Invalid ${tag} chunk size`);
    if (tag === 'ENDF') break;
    if (tag === 'PUZ2') {
      while (reader.offset + 2 <= end) {
        const id = reader.readInt16();
        if (id === -1) break;
        if (reader.readFourCC() !== 'IPUZ') throw new Error(`Puzzle ${id}: expected IPUZ`);
        const recordSize = reader.readUint32();
        const recordEnd = reader.offset + recordSize;
        if (recordEnd > end) throw new Error(`Puzzle ${id}: invalid size`);
        const type = reader.readUint32();
        const item1Class = reader.readInt32();
        const item2Class = reader.readInt32();
        reader.skip(2);
        const texts = Array.from({ length: 5 }, () => {
          const length = reader.readUint16();
          if (reader.offset + length > recordEnd) throw new Error(`Puzzle ${id}: truncated text`);
          return reader.readCString(length);
        });
        const item1 = reader.readInt16();
        const item2 = reader.readInt16();
        if (reader.offset !== recordEnd) throw new Error(`Puzzle ${id}: unexpected payload`);
        puzzles.push({ id, type, item1Class, item2Class, texts, item1, item2 });
      }
    } else if (tag === 'CHAR') {
      while (reader.offset + 2 <= end) {
        const id = reader.readInt16();
        if (id === -1) break;
        if (reader.readFourCC() !== 'ICHA') throw new Error(`Character ${id}: expected ICHA`);
        const recordSize = reader.readUint32();
        const recordEnd = reader.offset + recordSize;
        if (recordEnd > end) throw new Error(`Character ${id}: invalid size`);
        const name = reader.readCString(16);
        const type = reader.readInt16();
        const movementType = reader.readInt16();
        reader.skip(6);
        const frames = Array.from({ length: 24 }, () => reader.readInt16());
        if (reader.offset !== recordEnd) throw new Error(`Character ${id}: unexpected payload`);
        characters.push({ id, name, type, movementType, frames, weaponId: -1, health: 0, damage: 0 });
      }
    } else if (tag === 'CHWP' || tag === 'CAUX') {
      while (reader.offset + 2 <= end) {
        const id = reader.readInt16();
        if (id === -1) break;
        const character = characters.find(c => c.id === id);
        const value = reader.readInt16();
        if (tag === 'CHWP') {
          const health = reader.readInt16();
          if (character) { character.weaponId = value; character.health = health; }
        } else if (character) character.damage = value;
      }
    } else if (tag === 'TNAM') {
      while (reader.offset + 2 <= end) {
        const id = reader.readInt16();
        if (id === -1) break;
        if (reader.offset + 24 > end) throw new Error('Truncated tile name');
        const name = reader.readCString(24);
        if (tiles[id]) tiles[id].name = name;
      }
    }
    reader.offset = end;
  }

  return {
    version,
    startupImage,
    sounds,
    tiles,
    zones,
    characters,
    puzzles,
  };
}
