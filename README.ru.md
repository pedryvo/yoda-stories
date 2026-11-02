<div align="center">

# yoda-stories

**Реверс-инжиниринг и современный веб-порт (TypeScript, HTML5 Canvas, WebAssembly и Web Audio API) игры _Star Wars: Yoda Stories_ (LucasArts, 1997)**

[![TypeScript](https://img.shields.io/badge/typescript-5.5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-%D0%B8%D0%B3%D1%80%D0%B0%D0%B1%D0%B5%D0%BB%D1%8C%D0%BD%D0%BE-success)](#-%D0%BF%D1%80%D0%BE%D0%B3%D1%80%D0%B5%D1%81%D1%81)
[![Phase](https://img.shields.io/badge/phase-6_%E2%80%94_%D0%B2%D0%B5%D0%B1--%D0%BF%D0%BE%D1%80%D1%82-blue)](docs/PLAN.md)
[![Platforms](https://img.shields.io/badge/platforms-Web_%7C_Vercel_%7C_%D0%9C%D0%BE%D0%B1%D0%B8%D0%BB%D1%8C%D0%BD%D1%8B%D0%B5-lightgrey)](#-%D0%BA%D0%B0%D0%BA-%D0%B7%D0%B0%D0%BF%D1%83%D1%81%D1%82%D0%B8%D1%82%D1%8C)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](LICENSE)

_Классическая игра 1997 года от LucasArts, воссозданная для работы в современных браузерах и на смартфонах._

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Deutsch](README.de.md) · [中文](README.zh-CN.md) · **Русский**

</div>

---

## ⚔️ О проекте

**yoda-stories** исследует оригинальный файл `Yodesk.exe` и архив ресурсов `YODESK.DTA` (LucasArts, 1997) с помощью **REA** и Ghidra, полностью воссоздавая механику и формат файлов на современном стеке TypeScript и HTML5 Canvas без необходимости использования эмуляторов x86.

- 🌐 **Нативные HTML5-элементы окна**: Все пункты меню, панели инструментов и диалоговые окна выполнены в виде доступных HTML5-кнопок в стиле Windows 95.
- 📱 **Поддержка мобильных устройств**: Виртуальный D-Pad и сенсорные кнопки действий (удар мечом, использование предметов).
- 🎨 **Пиксельная графика в 256 цветах**: Рендеринг всех 2123 тайлов 32×32 в три слоя (земля, объекты, крыши).
- 🔊 **Звук через Web Audio API**: Воспроизведение оригинальных звуковых эффектов и музыки в формате WAV.
- 🌍 **Многоязычность (i18n)**: Русский, Английский, Португальский, Китайский и Немецкий языки с переключением на лету.
- ⚡ **Готов к публикации на Vercel**: Сборка на Vite (<250 мс).

---

## ⚖️ Правовая информация

_Star Wars_, _Yoda Stories_ и связанные персонажи являются товарными знаками Lucasfilm Ltd. и LucasArts. Проект является некоммерческим, образовательным и распространяется по лицензии [GPL-3.0](LICENSE).
