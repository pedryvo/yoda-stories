# YODESK.DTA File Format Specification

The `YODESK.DTA` file (approx. 4.6 MB) is the master container for assets, procedural map zones, puzzles, tile graphics, and scripts for *Star Wars: Yoda Stories* (LucasArts, 1997).

## Chunk Architecture

The file consists of sequential 4-byte ASCII tagged chunks:

| Chunk Tag | Description | Payload Structure |
|---|---|---|
| `VERS` | Engine Version | 2 bytes: `0x0200` (Version 2.00) + 2 bytes padding |
| `STUP` | Startup Image | 4-byte size (`0x00014400` = 82,944 bytes) for 288x288 8-bit indexed splash screen |
| `SNDS` | Sound Catalog | Sound count + sound name strings (`.wav`) |
| `TILE` | Graphics Tiles | 4-byte size (`2,182,444` bytes) = 2,123 tiles of 1028 bytes (4 bytes flags + 1024 bytes 32x32 raw pixel indices) |
| `ZONE` | World Zones | Zone records containing dimensions (width, height), 3-layer tile grids, hotspots, and actions |
| `IZON` | Individual Zone | Markers for zone structures, planet type (0: Desert/Tatooine, 1: Snow/Hoth, 2: Swamp/Dagobah), monster lists, item requirements |
| `CHAR` | Character Definitions | Hero and NPC definitions (Luke, Yoda, R2-D2, Stormtroopers, Jawas, Vader) |
| `CHWP` | Character Weapons | Weapon animations and damage metrics |
| `CAUX` | Character Aux | Sound mapping and behavioral flags |
| `TNAM` | Tile Names | Array of 16-bit tile index + null-terminated ASCII string (item/tile names) |

## Tile Structure
Each tile is 32x32 pixels, 8-bit indexed color into a 256-color palette:
```
struct Tile {
    uint32_t attributes;  // bitflags: opaque, obstacle, water, animation, etc.
    uint8_t  pixels[1024]; // 32 * 32 bytes (0 = transparent in overlay layers)
};
```

## Layers
Each Zone tile map consists of 3 layers:
- **Layer 0 (Background / Floor)**: Dirt, sand, snow, metal flooring, water.
- **Layer 1 (Objects / Entities)**: Obstacles, walls, trees, Luke, monsters, items, interactive furniture.
- **Layer 2 (Overhead / Roof)**: Canopy, upper doorway arches, structures Luke walks under.

## Verified zone subrecords (2026-11-02)

Hotspots use 12-byte records: uint32 type, uint16 x, uint16 y, uint16 enabled,
int16 argument. Empty tiles are -1; tile 0 is valid. IZAX, IZX2 and IZX3 sizes
include their eight-byte header. IZX4's size counts only payload bytes. A uint16
action count follows IZX4, followed by IACT records whose sizes count payload.
See `opcodes.md` for the decoded command layout and current interpreter coverage.
