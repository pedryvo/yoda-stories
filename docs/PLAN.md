# Development Plan: Star Wars Yoda Stories Web Port

Porting LucasArts' 1997 classic *Star Wars: Yoda Stories* (Desktop Adventures engine by Hal Barwood) to the modern Web using WebAssembly, TypeScript, HTML5 Canvas, and Web Audio API.

## Phases

### Phase 1: Reverse Engineering & Binary Extraction (Completed)
- [x] Analyze `Yodesk.exe` with REA MCP & Ghidra (extract PE resources, menus, dialogs, strings).
- [x] Document menu items and WM_COMMAND IDs (`re/menu_commands.json`).
- [x] Document dialog resource IDs and layout (`re/dialogs.json`).
- [x] Analyze chunk-based `YODESK.DTA` format (`VERS`, `STUP`, `SNDS`, `TILE`, `ZONE`, `CHAR`, `TNAM`, `ACTN`, `COND`).
- [x] Document condition and action opcodes for script execution.

### Phase 2: Asset Parsing & Data Model (Completed)
- [x] Fast, zero-copy binary parser for `yodesk.dta`.
- [x] 256-color palette loader and 32x32 indexed pixel renderer.
- [x] Extraction and playback of WAV sound effects using Web Audio API.
- [x] Zone, Tile, Monster, Hotspot, and Character data models.

### Phase 3: Core Simulation & Mechanics (Completed)
- [x] Hero movement (Luke Skywalker) with 4-directional sprites and walk cycles.
- [x] 9x9 tile visible viewport with 3-layer rendering (floor, objects/actors, roofs).
- [x] Collision detection with obstacles, water, boundaries, and interactive objects.
- [x] Weapon attack animations (Lightsaber, Blaster) and damage calculations.
- [x] Procedural zone transitions and world map navigation.
- [x] Inventory management: red/blue keys, thermal detonator, locator compass, puzzle items.

### Phase 4: HTML5 Native UI & Window System (Completed)
- [x] Authentic Windows 95 / LucasArts retro window chrome.
- [x] All main window commands implemented as accessible HTML5 buttons:
  - **File**: New World, Replay Story, Load World, Save World, Exit.
  - **Options**: Combat Difficulty, Game Speed, World Control, Statistics, Sound On/Off, Music On/Off, Pause.
  - **Window**: Hide Me!, Fullscreen, Scale (1x, 2x, 3x, Fit).
  - **Help**: How to Play, About.
- [x] HTML5 sidebar: Luke's status portrait, health/force bars, equipped weapon, equipped item, locator radar, 3x4 inventory grid with HTML5 scroll buttons.
- [x] HTML5 dialog modals for About, Difficulty, Speed, World Size, Player Stats, and in-game NPC speech boxes.
- [x] Mobile-friendly responsive layout with on-screen virtual D-Pad and action buttons.

### Phase 5: Multi-Language Localization (i18n) (Completed)
- [x] Support 5 full languages:
  - English (EN)
  - Português Brasileiro (PT-BR)
  - 简体中文 (ZH-CN)
  - Русский (RU)
  - Deutsch (DE)
- [x] Runtime dynamic language switcher via HTML5 menu or toolbar.
- [x] Translated menus, dialogs, item names, character speeches, and hints.

### Phase 6: Vercel Deployment & Polish (Completed)
- [x] Vite build optimization with zero runtime bundle bloat.
- [x] `vercel.json` configuration with high-performance edge headers.
- [x] PWA manifest and mobile touch gesture support.
- [x] Automated build verification (`npm run build`).
