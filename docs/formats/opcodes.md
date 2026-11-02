# Original zone scripts

Verified against Yodesk.exe through REA/Ghidra on 2026-11-02. Conditions are
interpreted at `00407e90`; instructions at `004087f0`. Evidence IDs and remaining
fidelity gaps are recorded in `re/fidelity-audit.md`.

Each IACT payload contains a uint16 condition count, condition records, a uint16
instruction count, and instruction records. Each record contains a uint16 opcode,
five int16 arguments, a uint16 text length and that many Windows-1252 bytes.
Unused arguments can contain arbitrary historical memory contents; only arguments
used by the native opcode are meaningful. All integers are little endian.

## Implemented conditions

| Opcode | Meaning / arguments |
|---|---|
| 0 | First zone entry |
| 1 | Zone entry |
| 2 | Bump foreground tile: x, y, tile |
| 3 | Use item: x, y, layer, tile, item |
| 4 | Walk onto floor tile: x, y, tile |
| 5 | Local counter equals value |
| 6 / 7 / 8 | Local random equals / greater than / less than value |
| 9 | Tick |
| 10 / 34 | Tile equals: tile, x, y, layer |
| 13 | Inventory contains item |
| 24 | Hero at x, y |
| 25 / 26 / 27 | Sector counter equals / less than / greater than value |
| 29 | Enabled type-0 hotspot at x, y |
| 31 / 32 / 33 | Local counter / random / sector counter differs from value |

The native first-entry condition also checks world-cell state. The port currently
models first entry per zone instance. Mission-selected item references using -1
require the original generated-world state and are not implemented.

## Implemented instructions

| Opcode | Meaning / arguments |
|---|---|
| 0 / 15 | Set tile: x, y, layer, tile |
| 1 | Remove tile: x, y, layer |
| 2 | Move tile: x, y, layer, destination x, destination y |
| 4 | Luke speaks text |
| 5 | NPC at x, y speaks text |
| 8 | Redraw (automatic in the browser) |
| 9 | Native busy wait (currently omitted; timing is not faithful) |
| 10 | Play indexed sound |
| 11 | Native redraw/result flag (no extra browser operation) |
| 12 | Set local random to 1..argument |
| 13 / 14 | Set / add local counter |
| 18 | Set hero x, y |
| 20 | Disable this action after execution |
| 21 / 22 | Enable / disable hotspot by index |
| 27 | Offer item pickup: tile, x, y |
| 28 / 29 | Add / remove inventory item |
| 34 / 35 | Set / add signed 16-bit sector counter |
| 36 | Set local random |

Dialogue is shown sequentially in browser modals and blocks player input. Pickup
uses an explicit confirmation instead of the original flashing icon. Script
commands execute before the queued modals finish, so cinematic ordering/timing
is not yet equivalent to the original interpreter. Unsupported conditions fail
closed. An action with an unsupported instruction is skipped entirely and its
index is retained in `ZoneScripts.unsupported`, preventing partial puzzle changes.

Unimplemented parts include monster control, temporary tile/hero animation,
mission variables, generated destination selection, zone-change instructions,
victory/death flow, and dialogue placeholder substitution.
