# Fidelity audit (2026-11-02)

REA MCP `binary_session` was rejected by the client: approval required, approval
policy never. No REA analysis was obtained. The findings below are local file
observations and code inspection, not decompilation or original runtime evidence.

## Corrected

- Zone 94 at the original DTA has floor tile 858 in layer 0 (244 cells),
  objects including 915 in layer 1, and canopy tiles including 875 in layer 2.
  Renderer had layers 0 and 2 reversed. Tile zero is valid; -1 is empty.
- Hotspot records are 12 bytes: uint32 type, uint16 x/y/enabled, int16 argument.
  Zone 94 contains (type=1,x=7,y=3,enabled=1,arg=-1) and
  (type=9,x=6,y=0,enabled=1,arg=266). The old 18-byte reader corrupted both.
- Ground tile 858 has attributes 0x2, object 915 has 0x4, canopy 875 has 0x11.
  Movement/spawn now use ground layer 0 and object layer 1 consistently.
  Exact collision behavior for all special tiles remains unverified against
  the original executable; these masks are an inference from tile data.
- Current palette matches all 256 BGR0 entries in Yodesk.exe starting at file
  offset 348400. No palette replacement needed. Removed scanline filter over
  the playfield because it darkens/changes these colors.
- Loading a save no longer resets Luke to the zone's spawn point.
- Pausing now also suspends equipped item use.

## Remaining fidelity gaps

These need executable analysis/runtime comparison before faithful implementation:

- Edge transitions currently select the next catalog zone in every direction;
  there is no generated world topology or reversible neighbor mapping.
- Every enabled hotspot currently displays the same Yoda greeting, regardless
  of its type/argument. Correct parsing alone does not implement its semantics.
- Zone action scripts and monsters are discarded by the parser. Character data
  is not parsed. Combat, missions, puzzle progression and character animation
  therefore cannot yet be claimed to reproduce the original.
- Locator rotates by a constant angle; new worlds choose a random catalog zone.
- Saves store player state, not a complete procedural world's mutable state.

## Verification

`node tests/regressions.mjs` (Node 26; uses installed TypeScript, no extra packages)
checks the original DTA hotspots, draw order, canopy traversal, solid objects,
missing floor, save coordinates and paused item use. `npm run build` checks
TypeScript and production bundling. Browser verification could not run: binding
Vite to 127.0.0.1:3000 returned EPERM in this session's sandbox.
