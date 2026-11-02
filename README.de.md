<div align="center">

# yoda-stories

**Reverse Engineering und moderne Web-Portierung (TypeScript, HTML5 Canvas, WebAssembly & Web Audio API) von _Star Wars: Yoda Stories_ (LucasArts, 1997)**

[![TypeScript](https://img.shields.io/badge/typescript-5.5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-spielbar-success)](#-fortschritt)
[![Phase](https://img.shields.io/badge/phase-6_%E2%80%94_web_port_%26_politur-blue)](docs/PLAN.md)
[![Plattformen](https://img.shields.io/badge/plattformen-Web_%7C_Vercel_%7C_Mobil-lightgrey)](#-spielanleitung)
[![Lizenz: GPL-3.0](https://img.shields.io/badge/lizenz-GPL--3.0--or--later-blue)](LICENSE)

_Der LucasArts-Klassiker von 1997, neu implementiert für moderne Browser und Mobilgeräte._

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · **Deutsch** · [中文](README.zh-CN.md) · [Русский](README.ru.md)

</div>

---

## ⚔️ Über das Projekt

**yoda-stories** untersucht die originale Programmdatei (`Yodesk.exe`) und das Datenarchiv (`YODESK.DTA`) (LucasArts, 1997) mittels **REA** und Ghidra, um die interne Struktur und Spielregeln vollständig abzubilden und das Spiel für das moderne Web neu zu schreiben.

- 🌐 **HTML5-Fenstersteuerung**: Menüleiste, Symbolleiste und Dialoge sind interaktive HTML5-Schaltflächen.
- 📱 **Mobilfreundlich**: Bildschirm-Steuerkreuz (D-Pad) und Touch-Buttons für Smartphones und Tablets.
- 🎨 **Originale 256-Farben-Grafik**: Rendern aller 2.123 32×32-Kacheln mit pixelgenauer Skalierung.
- 🔊 **Web Audio API**: Wiedergabe der LucasArts PCM-WAV-Soundeffekte und Musikstücke.
- 🌍 **Mehrsprachig (i18n)**: Deutsch, Englisch, Portugiesisch, Chinesisch und Russisch.
- ⚡ **Vercel-bereit**: Optimierter statischer Build mit Vite.

---

## ⚖️ Rechtliche Hinweise

_Star Wars_ und _Yoda Stories_ sind Marken von Lucasfilm Ltd. und LucasArts. Dies ist ein freies Fan- und Bildungsprojekt unter der [GPL-3.0-Lizenz](LICENSE).
