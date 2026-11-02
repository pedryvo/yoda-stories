<div align="center">

# yoda-stories

**Ingeniería inversa y adaptación moderna para la Web (TypeScript, HTML5 Canvas, WebAssembly y Web Audio API) de _Star Wars: Yoda Stories_ (LucasArts, 1997)**

[![TypeScript](https://img.shields.io/badge/typescript-5.5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-jugable-success)](#-progreso)
[![Fase](https://img.shields.io/badge/fase-6_%E2%80%94_adaptaci%C3%B3n_web-blue)](docs/PLAN.md)
[![Plataformas](https://img.shields.io/badge/plataformas-Web_%7C_Vercel_%7C_M%C3%B3vil-lightgrey)](#-c%C3%B3mo-jugar)
[![Licencia: GPL-3.0](https://img.shields.io/badge/licencia-GPL--3.0--or--later-blue)](LICENSE)

_El clásico juego de aventuras de 1997 de LucasArts creado por Hal Barwood,<br>reconstruido para ejecutarse de forma nativa en navegadores web y dispositivos móviles._

[English](README.md) · [Português](README.pt-BR.md) · **Español** · [Deutsch](README.de.md) · [中文](README.zh-CN.md) · [Русский](README.ru.md)

</div>

---

## ⚔️ Acerca del Proyecto

**yoda-stories** analiza el ejecutable original de _Star Wars: Yoda Stories_ (`Yodesk.exe`) y su contenedor de datos (`YODESK.DTA`) (LucasArts / Lucasfilm Ltd., 1997) utilizando herramientas de ingeniería inversa (**REA** y Ghidra) para estudiar la arquitectura de archivos, procedimientos de ventana y generación procedimental, reescribiendo el juego desde cero para la web moderna.

- 🌐 **Comandos de Ventana en HTML5 Nativo**: La barra de menús, botones de barra de herramientas y diálogos son botones y elementos HTML5 interactivos.
- 📱 **Diseño Adaptable para Móviles**: D-Pad táctil virtual y botones en pantalla para jugar en teléfonos y tabletas.
- 🎨 **Gráficos en 256 Colores Auténticos**: Descodificación en tiempo real de los 2.123 tiles en capas (suelo, objetos, techos).
- 🔊 **Efectos de Sonido con Web Audio API**: Música y sonidos originales de LucasArts en formato WAV.
- 🌍 **Soporte Multilingüe (i18n)**: Español, Inglés, Portugués, Chino, Ruso y Alemán.
- ⚡ **Listo para Desplegar en Vercel**: Construcción estática instantánea con Vite.

---

## ⚖️ Aviso Legal

_Star Wars_, _Yoda Stories_ y sus personajes son marcas registradas de Lucasfilm Ltd. y LucasArts. Este es un proyecto libre y educativo sin fines de lucro bajo la licencia [GPL-3.0](LICENSE).
