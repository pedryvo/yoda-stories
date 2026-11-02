import { DtaData, Tile, Zone, Hotspot, Action, Monster, Character } from './types';

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

  // 2. STUP (Startup splash image)
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
  reader.skip(2); // count or header
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
    // Copy 1024 pixels (32x32)
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
    const planet = reader.readUint16();
    const zoneSize = reader.readUint32();
    const zoneIdx = reader.readUint16();
    const izonTag = reader.readFourCC();
    const izonSize = reader.readUint32();

    const width = reader.readUint16();
    const height = reader.readUint16();
    const zoneType = reader.readUint32();
    reader.skip(2); // sectorCounter
    reader.skip(2); // planetAgain

    // 3 layers of width * height
    const totalTiles = 3 * width * height;
    const tileIDs = new Int16Array(totalTiles);
    for (let t = 0; t < totalTiles; t++) {
      tileIDs[t] = reader.readInt16();
    }

    // Hotspots
    const hotspotCount = reader.readUint16();
    const hotspots: Hotspot[] = [];
    for (let h = 0; h < hotspotCount; h++) {
      const type = reader.readUint32();
      const x = reader.readUint32();
      const y = reader.readUint32();
      const enabled = reader.readUint32() !== 0;
      const arg = reader.readInt16();
      hotspots.push({ type, x, y, enabled, arg });
    }

    // IZAX
    reader.skip(8); // IZAX + size
    reader.skip(2); // unk
    const monsterCount = reader.readUint16();
    const monsters: Monster[] = [];
    for (let m = 0; m < monsterCount; m++) {
      const charId = reader.readInt16();
      const mx = reader.readInt16();
      const my = reader.readInt16();
      reader.skip(18); // rest of monster struct
      monsters.push({ id: m, characterId: charId, x: mx, y: my, damage: 10 });
    }

    const reqCount = reader.readUint16();
    const requiredItemIDs: number[] = [];
    for (let r = 0; r < reqCount; r++) requiredItemIDs.push(reader.readInt16());

    const goalCount = reader.readUint16();
    const goalItemIDs: number[] = [];
    for (let g = 0; g < goalCount; g++) goalItemIDs.push(reader.readInt16());

    // IZX2
    reader.skip(8);
    const provCount = reader.readUint16();
    const providedItemIDs: number[] = [];
    for (let p = 0; p < provCount; p++) providedItemIDs.push(reader.readInt16());

    // IZX3
    reader.skip(8);
    const npcCount = reader.readUint16();
    const npcIDs: number[] = [];
    for (let n = 0; n < npcCount; n++) npcIDs.push(reader.readInt16());

    // IZX4
    reader.skip(8);
    reader.skip(2); // unk

    // Actions
    const actionCount = reader.readUint16();
    const actions: Action[] = [];
    for (let a = 0; a < actionCount; a++) {
      // Condition count
      const condCount = reader.readUint16();
      const conditions = [];
      for (let c = 0; c < condCount; c++) {
        const opcode = reader.readUint16();
        const arg1 = reader.readInt16();
        const arg2 = reader.readInt16();
        const arg3 = reader.readInt16();
        const arg4 = reader.readInt16();
        const arg5 = reader.readInt16();
        conditions.push({ opcode, args: [arg1, arg2, arg3, arg4, arg5] });
      }

      // Instruction count
      const instCount = reader.readUint16();
      const instructions = [];
      for (let ins = 0; ins < instCount; ins++) {
        const opcode = reader.readUint16();
        const arg1 = reader.readInt16();
        const arg2 = reader.readInt16();
        const arg3 = reader.readInt16();
        const arg4 = reader.readInt16();
        const arg5 = reader.readInt16();
        let text: string | undefined;
        // Text action string
        if (opcode === 0x00) {
          const strLen = reader.readUint16();
          if (strLen > 0 && strLen < 1000) {
            text = reader.readCString(strLen);
          }
        }
        instructions.push({ opcode, args: [arg1, arg2, arg3, arg4, arg5], text });
      }

      actions.push({ conditions, instructions });
    }

    zones.push({
      id: zoneIdx,
      planet,
      width,
      height,
      zoneType,
      tileIDs,
      hotspots,
      monsters,
      actions,
      requiredItemIDs,
      goalItemIDs,
      providedItemIDs,
      npcIDs,
    });
  }

  // Parse Tile Names (TNAM) if present
  try {
    const tnamOffset = (function findTNAM(buffer: ArrayBuffer): number {
      const u8 = new Uint8Array(buffer);
      for (let i = 0; i < u8.length - 4; i++) {
        if (u8[i] === 0x54 && u8[i + 1] === 0x4e && u8[i + 2] === 0x41 && u8[i + 3] === 0x4d) {
          return i;
        }
      }
      return -1;
    })(buffer);

    if (tnamOffset !== -1) {
      reader.offset = tnamOffset + 8; // skip TNAM + size
      while (reader.remaining >= 26) {
        const tileIdx = reader.readInt16();
        if (tileIdx === -1 || tileIdx >= tiles.length) break;
        const name = reader.readCString(24);
        if (tiles[tileIdx]) {
          tiles[tileIdx].name = name;
        }
      }
    }
  } catch (e) {
    console.warn('Could not read TNAM block:', e);
  }

  return {
    version,
    startupImage,
    sounds,
    tiles,
    zones,
    characters: [],
  };
}
