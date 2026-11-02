# Fidelity audit (2026-11-02)

The initial pass was blocked by approval policy `never` and used local file
inspection. After permissions changed, REA/Ghidra and browser observation worked.
The follow-up sections below supersede the initial gaps where explicitly noted.

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

## Gaps identified in the initial pass (see follow-up updates)

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

## REA follow-up after permissions were enabled

The REA MCP is now working with Ghidra 12.1.2. Executable SHA-256:
`4d9876339d494cab141c3f4178f37a2725d178e41c7785887c84d021a8e695e7`.

- `00426110`, evidence `ev_38f4f3911b2973555a59eea5f79761623bbd53b5bfb32a1475061d791570bed6`,
  identifies STUP and invokes `00426620` to load it before world creation.
- `00426620`, evidence `ev_7c30f00568029c140e33627be805dc73103eb297ae541b7b24b0cf954544e4b9`,
  reads 288 rows of 288 indexed pixels. Startup now displays this image and waits
  for New Game, Enter or a playfield click. Click/Enter are web conveniences.
- `004047d0`, evidence `ev_2ea0206fccf7a643dbd0f6df8938bf6cb1a532c6d86db52827105eb18a113459`,
  initializes a generated 10x10 world and calls the Dagobah setup `004286f0`.
- `004286f0`, evidence `ev_15b14cd6c2a1b48c70b2de04e87581772c3d514749a27a2e0602fcfc4a43494c`,
  places sectors 94/95/93/96 in Dagobah, sets starting world cell (4,5),
  and pixel coordinates (320,320). New Game now starts in sector 93 at (10,10),
  replacing random catalog selection. Full world/mission generation remains open.
- All 658 zones now retain their IACT conditions, instructions, five signed
  arguments and text. IZAX/IZX2/IZX3 include the header in their lengths; IZX4
  and IACT lengths count payload only. Zone 93 has 51 actions; zone 94 has 28.
  This preserves original story data; parsing alone does not execute it.
- Condition dispatcher `00407e90`, evidence
  `ev_f2f5dc36723b1d4111353984be2cbf8fbef9591fcabe5c04a030fcff6fe2938a`, and
  instruction dispatcher `004087f0`, evidence
  `ev_8a4e784f0e957ddb01b272740145feca3d56393976de3c9d893289dcf08fd588`,
  were decompiled. The old opcodes document is inaccurate: e.g. instruction 4
  speaks as Luke, 5 speaks at NPC coordinates, 20 disables the current action.

Browser verification through REA captured the original splash
(`ev_f9d41d740da0d301c1409e40bff496a790056752aa2a3ea40cd72668d320da2f`).
The controlled reload recorded no page errors or console warnings/errors;
network observation was incomplete at the capture boundary and must not be
interpreted as exhaustive network verification. Nine regression tests pass.

## Initial script execution and sector connections

The port now executes the supported subset documented in `docs/formats/opcodes.md`
on entry, movement, bump, item use and ticks. First-entry world-cell checks,
mission variables, placeholder substitution and cinematic timing remain partial.
Unsupported actions are skipped before mutation and retained by action index.

The landing dialogue trigger and the Artoo bump/pickup sequence execute from
original zone 93 scripts, replacing the generic Yoda greeting for all hotspots.
Dialogues block input until dismissed. Pickup uses confirmation rather than the
original flashing icon. Script commands currently execute before the queued
modals finish; this is a documented timing limitation. Tiles, hotspots, disabled
actions and script counters are persisted in saves, isolated from the DTA catalog.

The four known Dagobah world cells now connect spatially: 94 (4,4), 95 (5,4),
93 (4,5), 96 (5,5), as shown by record addresses in `004286f0`. Crossings preserve
the perpendicular coordinate and reject blocked destinations. Edges outside this
known layout are blocked instead of selecting the next catalog zone. This does
not reconstruct the generated mission graph or alternative sector 535.

REA browser scenario `ev_66328cdf3477558d310c63788cde4fcb3457ebffd5ea59872587bce4afb4c9a8`
started a game and bumped Artoo through the virtual pad. Screenshot
`ev_9b92734c22ff69aca2b8ee2f3e36206ca4f1afd6868e80e1f892699333ffa47f`
shows Luke's original opening line. A missing favicon request was found and
removed. Fifteen regression tests cover these behaviors, including one-time
landing dialogue, Artoo pickup/save/load, and reversible Dagobah crossings.

Remaining major work: reproduce mission/world generation and Yoda placement,
execute the remaining opcodes, parse characters/monsters, reproduce combat and
inventory initialization, and verify the complete original gameplay under Wine.
The port still does not reproduce a complete original story or win path.

Final REA browser scenario `ev_f567b851e25e4f14fc656cee1ffce6e125506f0aded7c7c0146d11d48de59d6e`
completed New Game, bump, both original dialogue lines, pickup acceptance and
modal dismissal with no observed page errors or console warnings/errors. Event
capture is marked incomplete by REA; all requested actions completed. A desktop
attempt could not click the hidden mobile pad; the successful scenario used a
600x900 viewport. Declining pickup is separately covered by a regression test.
