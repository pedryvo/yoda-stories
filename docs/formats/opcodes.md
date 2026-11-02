# Desktop Adventures Scripting & Opcodes

The game logic in *Star Wars: Yoda Stories* runs via a custom virtual machine executing condition checks and action opcodes attached to zones and hotspots.

## Condition Opcodes (`COND`)

Conditions evaluate world and hero state before executing associated actions:

| Opcode | Name | Arguments | Description |
|---|---|---|---|
| `0x00` | `ZoneNotSolved` | none | Zone objective is incomplete |
| `0x01` | `TileAtIs` | x, y, layer, tileID | Specific tile is located at (x, y) |
| `0x02` | `HeroAt` | x, y | Luke is at tile coordinate (x, y) |
| `0x03` | `HeroHasItem` | itemID | Luke holds item in inventory |
| `0x04` | `SectorCounterIs` | value | Progress counter matches value |
| `0x05` | `RandomIs` | percent | Random check probability (0-100) |
| `0x06` | `HotspotIsActive` | hotspotID | Hotspot trigger is enabled |
| `0x07` | `MonsterDead` | monsterID | Specified monster has been defeated |
| `0x08` | `ZoneTypeIs` | type | Zone matches type (Puzzle, Trade, Goal) |

## Action Opcodes (`ACTN`)

Actions manipulate the world, inventory, sound, and dialogs:

| Opcode | Name | Arguments | Description |
|---|---|---|---|
| `0x00` | `SpeakHero` | string | Display dialogue speech bubble from Luke or NPC |
| `0x01` | `PlaySound` | soundID | Trigger sound effect via audio engine |
| `0x02` | `AddItem` | itemID | Place item into Luke's inventory |
| `0x03` | `RemoveItem` | itemID | Take item from Luke's inventory |
| `0x04` | `SetTileAt` | x, y, layer, tileID | Change map tile dynamically (e.g. open door) |
| `0x05` | `ChangeZone` | zoneID, x, y | Transition Luke to new zone coordinate |
| `0x06` | `SpawnMonster` | monsterID, x, y | Spawn hostile entity |
| `0x07` | `SetHotspotState` | hotspotID, state | Activate or deactivate trigger zone |
| `0x08` | `MarkSolved` | none | Mark current zone puzzle complete |
| `0x09` | `WinGame` | none | Trigger Victory sequence (You Win music & cutscene) |
