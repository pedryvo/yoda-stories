import { Character, Monster, Zone } from '../dta/types';

export interface AttackCell {
  dx: number;
  dy: number;
}

export interface MonsterHit {
  monsterIndex: number;
  characterId: number;
  killed: boolean;
  lootTileId: number | null;
}

// Yodesk.exe 0041b1c0 checks three consecutive animation stages. Saber
// stages sweep across the three cells immediately in front of Luke;
// ordinary projectile stages travel one, two and three cells forward.
export function attackCells(direction: 0 | 1 | 2 | 3, weaponTile: number): AttackCell[] {
  const dx = direction === 1 ? 1 : direction === 3 ? -1 : 0;
  const dy = direction === 2 ? 1 : direction === 0 ? -1 : 0;
  if (weaponTile === 510 || weaponTile === 18) {
    return [-1, 0, 1].map(offset => dx ? { dx, dy: offset } : { dx: offset, dy });
  }
  // The Force uses native 004070e0 and is not an ordinary damaging shot.
  if (weaponTile === 511) return [];
  return [1, 2, 3].map(distance => ({ dx: dx * distance, dy: dy * distance }));
}

// The weapon's inventory graphic is entry 7 of its first eight-tile frame.
export function weaponCharacter(characters: Character[], inventoryTile: number): Character | undefined {
  return characters.find(character => character.type === 4 && character.frames[7] === inventoryTile);
}

// The original difficulty slider uses numeric values 1..100. 0041b1c0
// boosts outgoing damage below 50; 0041ab30 scales incoming damage by an
// integer divisor. Keep this separate from UI labels and heart bookkeeping.
export function outgoingDamage(baseDamage: number, difficulty: number): number {
  if (difficulty < 1 || difficulty > 100) throw new RangeError('Combat difficulty must be 1..100');
  const multiplier = difficulty < 50 ? 10 - Math.trunc(difficulty / 5) : 1;
  return Math.max(1, baseDamage * multiplier);
}

export function incomingDamage(baseDamage: number, difficulty: number): number {
  if (difficulty < 1 || difficulty > 100) throw new RangeError('Combat difficulty must be 1..100');
  return Math.max(1, Math.trunc(baseDamage / Math.trunc(100 / difficulty)));
}

// Native 00406e20 accumulates damage and marks a dead character as -1,
// preserving its slot for script MonsterDead(index) conditions. Health -1
// denotes an invulnerable character, not a one-hit opponent.
export function applyMonsterDamage(
  zone: Zone,
  characters: Character[],
  x: number,
  y: number,
  damage: number
): MonsterHit | null {
  const monsterIndex = zone.monsters.findIndex(monster =>
    monster.enabled && monster.characterId >= 0 && monster.x === x && monster.y === y);
  if (monsterIndex < 0) return null;
  const monster: Monster = zone.monsters[monsterIndex];
  const characterId = monster.characterId;
  const character = characters.find(candidate => candidate.id === characterId);
  if (!character || character.health === -1 || damage <= 0) return null;

  monster.damageTaken += damage;
  const killed = monster.damageTaken >= character.health;
  let lootTileId: number | null = null;
  if (killed) {
    monster.characterId = -1;
    if (x >= 0 && y >= 0 && x < zone.width && y < zone.height) {
      zone.tileIDs[(y * zone.width + x) * 3 + 1] = -1;
      if (monster.dropsLoot) {
        if (monster.loot > 0) lootTileId = monster.loot - 1;
        else if (monster.loot === 0) {
          lootTileId = zone.hotspots.find(hotspot => hotspot.type === 0 && hotspot.arg > 0)?.arg ?? null;
        }
        if (lootTileId !== null) {
          zone.hotspots.push({ type: 6, x, y, enabled: true, arg: lootTileId });
          zone.tileIDs[(y * zone.width + x) * 3 + 1] = lootTileId;
        }
      }
    }
  }
  return { monsterIndex, characterId, killed, lootTileId };
}
