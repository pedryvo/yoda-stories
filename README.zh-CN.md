<div align="center">

# yoda-stories

**《星球大战：尤达的故事》（LucasArts，1997）逆向工程与现代化网页移植（TypeScript、HTML5 Canvas、WebAssembly 与 Web Audio API）**

[![TypeScript](https://img.shields.io/badge/typescript-5.5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-%E5%8F%AF%E7%8E%A9-success)](#-进度)
[![Phase](https://img.shields.io/badge/phase-6_%E2%80%94_%E7%BD%91%E9%A1%B5%E7%A7%BB%E6%A4%8D-blue)](docs/PLAN.md)
[![Platforms](https://img.shields.io/badge/platforms-Web_%7C_Vercel_%7C_%E7%A7%BB%E5%8A%A8%E7%AB%AF-lightgrey)](#-运行游戏)
[![License: GPL-3.0](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](LICENSE)

_1997年 LucasArts 经典桌面冒险游戏，完全重构，可在任何现代浏览器、电脑及手机端原生流畅运行。_

[English](README.md) · [Português](README.pt-BR.md) · [Español](README.es.md) · [Deutsch](README.de.md) · **中文** · [Русский](README.ru.md)

</div>

---

## ⚔️ 关于本项目

**yoda-stories** 通过 **REA** MCP 和 Ghidra 逆向分析原版可执行文件 (`Yodesk.exe`) 与主数据包 (`YODESK.DTA`)，深入解析其文件格式、窗口消息泵与逻辑脚本，使用 TypeScript 和 HTML5 技术栈完全从零重写。

- 🌐 **原生 HTML5 窗口指令**：经典 Windows 95 标题栏、菜单栏、工具栏和对话框均为可交互的原生 HTML5 按钮。
- 📱 **移动端触摸适配**：专为手机和平板设计的自适应布局，提供虚拟十字方向键（D-Pad）与动作按键（光剑攻击、道具使用）。
- 🎨 **原汁原味 256 色像素渲染**：实时解码 `YODESK.DTA` 中 2,123 个 32×32 图块，采用三层图层（地面、物体/角色、遮罩房顶）合成。
- 🔊 **Web Audio 原始音效与音乐**：完整支持 LucasArts 原版 PCM WAV 音效。
- 🌍 **多语言本地化 (i18n)**：支持中文、英语、葡萄牙语、俄语与德语实时切换。
- ⚡ **Vercel 一键极速部署**：基于 Vite 构建，毫秒级出包并直接适配边缘 CDN。

---

## ⚖️ 法律声明

_Star Wars_、《星球大战：尤达的故事》及其角色均为 Lucasfilm Ltd. 与 LucasArts 的商标与版权所有。本项目为非盈利的粉丝教育与数字保存项目，源码遵循 [GPL-3.0 协议](LICENSE)。
