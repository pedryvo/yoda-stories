<div align="center">

# yoda-stories

**Reverse engineering and modern web port (TypeScript, HTML5 Canvas, WebAssembly & Web Audio API) of _Star Wars: Yoda Stories_ (LucasArts, 1997)**

[![TypeScript](https://img.shields.io/badge/typescript-5.5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-playable-success)](#-progress)
[![Phase](https://img.shields.io/badge/phase-6_%E2%80%94_web_port_%26_polish-blue)](docs/PLAN.md)
[![Platforms](https://img.shields.io/badge/platforms-Web_%7C_Vercel_%7C_Mobile-lightgrey)](#-running-the-game)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](LICENSE)

_The 1997 LucasArts Desktop Adventure classic by Hal Barwood,<br>re-engineered to run natively in any modern browser, desktop, and mobile phone._

**English** · [Português](README.pt-BR.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [中文](README.zh-CN.md) · [Русский](README.ru.md)

</div>

---

## ⚔️ About

**yoda-stories** studies the original _Star Wars: Yoda Stories_ executable (`Yodesk.exe`) and data archive (`YODESK.DTA`) (LucasArts / Lucasfilm Ltd., 1997) using **REA** (Reverse Engineer Anything) and Ghidra to understand every file format, window procedure, and game mechanic, and delivers a modern, clean web implementation.

Unlike heavyweight x86 emulators, this port runs natively in JavaScript, WebAssembly, and HTML5 Canvas with **zero emulation overhead**:

- 🌐 **Native HTML5 Window Commands**: The classic Windows 95 title bar, menu bar (File, Options, Window, Language, Help), toolbar, and dialogs are interactive, accessible HTML5 elements and buttons, rather than a flat bitmap or emulated container.
- 📱 **Mobile-Friendly & Touch-Ready**: Responsive layout optimized for smartphones and tablets, featuring an on-screen Virtual D-Pad, touch action buttons (Lightsaber attack, Use item), and swipe navigation.
- 🎨 **Pixel-Perfect 256-Color Graphics**: Real-time decoding of the 2,123 32×32 tiles from `YODESK.DTA` using the authentic 256-color palette with crisp nearest-neighbor upscaling.
- 🔊 **Web Audio Sound & Music**: Direct playback of all original 11025 Hz / 22050 Hz PCM `.wav` sound effects and musical stings (`opening.wav`, `saber.wav`, `blaster.wav`, `cantina.wav`, `r2d2.wav`, `youwin.wav`).
- 🌍 **Multilingual Localization (i18n)**: Real-time language switching between **English**, **Português do Brasil**, **简体中文**, **Русский**, and **Deutsch** for all UI commands, dialogs, item names, and quest hints.
- ⚡ **Instant Vercel Deployment**: Ultra-fast Vite build (<250ms) ready for deployment to Vercel, GitHub Pages, or any modern edge hosting.

---

## 📊 Progress

| Area | Status | Details |
|---|:---:|---|
| **Plan & Architecture** | ✅ | Full project breakdown and roadmap · [`docs/PLAN.md`](docs/PLAN.md) |
| **REA Reverse Engineering** | ✅ | PE analysis of `Yodesk.exe`, WM_COMMAND IDs, dialog tables · [`re/menu_commands.json`](re/menu_commands.json) |
| **`YODESK.DTA` Parser** | ✅ | Sequential binary chunk parser (`VERS`, `STUP`, `SNDS`, `TILE`, `ZONE`, `CHAR`, `TNAM`) · [spec](docs/formats/yodesk_dta.md) |
| **Tile & Palette Renderer** | ✅ | 2,123 32×32 8-bit indexed tiles rendered across 3 layers (Floor, Objects/Entities, Roof) |
| **Audio Engine** | ✅ | Web Audio API loader with touch-unlock, stereo panning, volume and sound/music toggles · [spec](docs/formats/sound.md) |
| **Simulation Core** | ✅ | Hero movement, walk cycles, 4-directional orientation, collision detection, weapon attacks |
| **Script & Opcode Engine** | 🟡 | Condition opcodes and action opcodes for puzzle chains and NPC dialogues · [spec](docs/formats/opcodes.md) |
| **HTML5 Native UI** | ✅ | Windows 95 retro theme, menu dropdowns, quick toolbar, status bar, and modal popups |
| **Equipment & Inventory** | ✅ | 3×4 interactive inventory grid, equipped weapon/item slots, locator compass radar |
| **Mobile Virtual Pad** | ✅ | On-screen touch D-Pad and action buttons for iOS and Android browsers |
| **Localization (i18n)** | ✅ | 5 full languages supported: EN, PT-BR, ZH-CN, RU, DE |
| **Vercel & PWA Ready** | ✅ | Optimized static build with edge caching headers (`vercel.json`) |

---

## 🎮 Running the Game

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- `npm`

### Local Development
```bash
# Clone the repository
git clone https://github.com/pedryvo/yoda-stories.git
cd yoda-stories

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser at `http://localhost:3000` to play immediately!

### Production Build
```bash
# Build optimized static distribution
npm run build

# Preview build locally
npm run preview
```

The resulting `dist/` folder is self-contained and ready to be deployed to Vercel, Netlify, or Cloudflare Pages.

---

## 🚀 Deploying to Vercel

Deploy with a single command via the Vercel CLI:
```bash
vercel
```

Or connect the repository `pedryvo/yoda-stories` to your [Vercel Dashboard](https://vercel.com/) for automatic deployments on every `git push`.

---

## 🕹️ Controls

| Action | Desktop Keyboard | Mobile Touch |
|---|---|---|
| **Move Luke** | Arrow Keys or `W`, `A`, `S`, `D` | Virtual D-Pad (▲, ◀, ▼, ▶) |
| **Attack (Weapon)** | `Spacebar` | ⚔️ Attack Button |
| **Use Equipped Item** | `Enter` | 🎒 Use Button |
| **Pause Game** | `P` | Pause Menu / Toolbar |
| **Toggle Sound** | `Ctrl + E` | 🔊 Toolbar Button |
| **Toggle Music** | `Ctrl + M` | 🎵 Toolbar Button |
| **New World** | `Ctrl + N` | 🚀 Toolbar Button |
| **Save World** | `Ctrl + S` | 💾 Toolbar Button |
| **Load World** | `Ctrl + L` | 📂 Toolbar Button |

---

## 🗂️ Project Layout

```
docs/
  PLAN.md              Development roadmap and task milestones
  formats/
    yodesk_dta.md      Binary container chunk specification (VERS, STUP, SNDS, TILE, ZONE)
    opcodes.md         Virtual machine condition & action opcode definitions
    sound.md           PCM WAV audio specifications
public/
  yodesk.dta           Original game data container (4.6 MB)
  sfx/                 LucasArts PCM sound effects
  bitmaps/             Reference interface artwork and palette source
re/
  menu_commands.json   Extracted WM_COMMAND IDs and menu hierarchies
  dialogs.json         Dialog template resource definitions
src/
  dta/                 Binary streaming parser for yodesk.dta
  audio/               Web Audio API sound manager
  render/              256-color palette decode and 3-layer 32x32 tile renderer
  engine/              Game state, Luke hero mechanics, combat, inventory, and metronome
  ui/                  HTML5 Windows 95 chrome, menus, dialogs, and mobile virtual pad
  i18n/                Translations (EN, PT-BR, ZH-CN, RU, DE)
  main.ts              Application bootstrap and game loop
```

---

## 🔬 Methodology

1. **Static Analysis & Ghidra Extraction**: The Windows PE executable `Yodesk.exe` was analyzed with Ghidra via the **REA** (Reverse Engineer Anything) MCP server to recover the Window Procedure (`WndProc`), message pump, and resource directory (Menus, Dialogs, Bitmaps, Accelerators).
2. **Container Analysis**: `YODESK.DTA` chunk structures (`VERS`, `STUP`, `SNDS`, `TILE`, `ZONE`, `CHAR`, `TNAM`) were mapped and verified using byte-level verification scripts.
3. **Clean-Room Implementation**: All simulation and rendering logic is written in modern TypeScript, executing directly on the browser's Canvas API and Web Audio subsystem without any legacy binary emulation.
4. **Accessible Web UI**: Rather than trapping menus inside an opaque canvas or canvas overlay, every menu bar command and dialog is implemented with accessible semantic HTML5 buttons.

---

## ⚖️ Legal Notice

_Star Wars_, _Yoda Stories_, characters, names, and related indicia are trademarks of and copyright © Lucasfilm Ltd. and LucasArts Entertainment Company.

This is an open-source non-profit educational fan project developed for preservation and interoperability. This project is not endorsed by or affiliated with Disney, Lucasfilm Ltd., or LucasArts.

The source code of **yoda-stories** is licensed under the [GNU General Public License v3.0 or later](LICENSE).
