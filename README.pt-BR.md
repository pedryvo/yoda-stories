<div align="center">

# yoda-stories

**Engenharia reversa e porte moderno para a Web (TypeScript, HTML5 Canvas, WebAssembly e Web Audio API) de _Star Wars: Yoda Stories_ (LucasArts, 1997)**

[![TypeScript](https://img.shields.io/badge/typescript-5.5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-jog%C3%A1vel-success)](#-progresso)
[![Fase](https://img.shields.io/badge/fase-6_%E2%80%94_porte_web_%26_polimento-blue)](docs/PLAN.md)
[![Plataformas](https://img.shields.io/badge/plataformas-Web_%7C_Vercel_%7C_Mobile-lightgrey)](#-como-jogar)
[![Licença: GPL-3.0](https://img.shields.io/badge/licen%C3%A7a-GPL--3.0--or--later-blue)](LICENSE)

_O clássico "Desktop Adventure" de 1997 da LucasArts criado por Hal Barwood,<br>reimplementado para rodar nativamente em qualquer navegador moderno, computador e smartphone._

[English](README.md) · **Português** · [Español](README.es.md) · [Deutsch](README.de.md) · [中文](README.zh-CN.md) · [Русский](README.ru.md)

</div>

---

## ⚔️ Sobre o Projeto

**yoda-stories** estuda o executável original de _Star Wars: Yoda Stories_ (`Yodesk.exe`) e seu arquivo principal de dados (`YODESK.DTA`) (LucasArts / Lucasfilm Ltd., 1997) utilizando ferramentas de engenharia reversa (**REA** MCP e Ghidra) para mapear todos os formatos de arquivos, rotinas de janela e regras de simulação procedural, reescrevendo o jogo do zero para a web moderna.

Diferente de emuladores x86 pesados dentro do navegador, este porte roda nativamente em TypeScript, WebAssembly e HTML5 Canvas **sem overhead de emulação**:

- 🌐 **Comandos da Janela Principal em HTML5**: A barra de título estilo Windows 95, a barra de menus (Arquivo, Opções, Janela, Idioma, Ajuda), a barra de ferramentas e as caixas de diálogo são elementos e botões HTML5 reais e acessíveis, em vez de uma imagem estática ou emulação de janela.
- 📱 **Otimizado para Dispositivos Móveis (Mobile-Friendly)**: Layout responsivo preparado para smartphones e tablets, com D-Pad virtual na tela, botões de toque para ação (atacar com sabre de luz, usar item do inventário) e controles intuitivos por toque.
- 🎨 **Gráficos com Precisão de Pixel em 256 Cores**: Decodificação em tempo real dos 2.123 ladrilhos (tiles 32×32) do `YODESK.DTA` com a paleta autêntica de 256 cores da LucasArts e escala nítida sem borrões.
- 🔊 **Áudio e Trilha Sonora via Web Audio API**: Reprodução de todos os efeitos sonoros originais PCM `.wav` e trechos musicais da LucasArts (`opening.wav`, `saber.wav`, `blaster.wav`, `cantina.wav`, `r2d2.wav`, `youwin.wav`).
- 🌍 **Localização Multilíngue (i18n)**: Troca instantânea em tempo real entre **Português do Brasil**, **Inglês**, **Chinês Simplificado**, **Russo** e **Alemão** em menus, caixas de diálogo, nomes de itens e mensagens dos personagens.
- ⚡ **Pronto para Vercel**: Compilação ultra-rápida com Vite (<250ms), pronta para publicação automática na Vercel ou qualquer hospedagem estática.

---

## 📊 Progresso

| Área | Estado | Detalhes |
|---|:---:|---|
| **Plano e Arquitetura** | ✅ | Roteiro de desenvolvimento e marcos · [`docs/PLAN.md`](docs/PLAN.md) |
| **Engenharia Reversa (REA)** | ✅ | Análise PE do `Yodesk.exe`, IDs de WM_COMMAND e caixas de diálogo · [`re/menu_commands.json`](re/menu_commands.json) |
| **Leitor de `YODESK.DTA`** | ✅ | Parser binário dos blocos (`VERS`, `STUP`, `SNDS`, `TILE`, `ZONE`, `CHAR`, `TNAM`) · [especificação](docs/formats/yodesk_dta.md) |
| **Renderizador de Ladrilhos** | ✅ | 2.123 tiles 32×32 em 3 camadas (Chão, Objetos/Monstros, Telhado/Sobreposição) |
| **Motor de Áudio** | ✅ | Web Audio API com desbloqueio no primeiro toque, balanço estéreo e controle de som/música · [especificação](docs/formats/sound.md) |
| **Simulação do Luke Skywalker** | ✅ | Movimentação em 4 direções, ciclo de passos, detecção de colisão e golpes de armas |
| **Scripts e Opcodes** | 🟡 | Opcodes de condição e ação para cadeias de quebra-cabeças e diálogos · [especificação](docs/formats/opcodes.md) |
| **Interface Nativa HTML5** | ✅ | Tema retrô Windows 95, botões HTML5, dropdowns, barra de ferramentas e modais |
| **Inventário e Radar** | ✅ | Grade interativa 3×4, botões de rolagem, arma e item equipados, agulha do radar localizador |
| **Controles Móveis (Touch)** | ✅ | D-Pad virtual e botões de ação na tela para navegadores no Android e iOS |
| **Internacionalização (i18n)** | ✅ | Suporte completo a 5 idiomas: PT-BR, EN, ZH-CN, RU, DE |
| **Configuração Vercel** | ✅ | Build estático otimizado com cabeçalhos de borda (`vercel.json`) |

---

## 🎮 Como Executar Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- `npm`

### Desenvolvimento Local
```bash
# Clone o repositório
git clone https://github.com/pedryvo/yoda-stories.git
cd yoda-stories

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

Abra o navegador em `http://localhost:3000` para jogar!

### Compilação de Produção
```bash
# Compilar versão de produção
npm run build

# Testar prévia da compilação
npm run preview
```

A pasta `dist/` gerada contém todos os arquivos estáticos e está pronta para publicação imediata na Vercel.

---

## 🚀 Publicação na Vercel

Você pode publicar via terminal usando o CLI da Vercel:
```bash
vercel
```

Ou conectando o repositório `pedryvo/yoda-stories` diretamente no painel da [Vercel](https://vercel.com/) para deploys automáticos em cada `git push`.

---

## 🕹️ Controles

| Ação | Teclado no PC | Toque no Celular |
|---|---|---|
| **Mover Luke** | Teclas de Seta ou `W`, `A`, `S`, `D` | D-Pad Virtual (▲, ◀, ▼, ▶) |
| **Atacar (Arma)** | `Barra de Espaço` | Botão ⚔️ Atacar |
| **Usar Item Equipado** | `Enter` | Botão 🎒 Usar |
| **Pausar o Jogo** | `P` | Menu Opções / Barra de Ferramentas |
| **Ligar/Desligar Som** | `Ctrl + E` | Botão 🔊 na Barra de Ferramentas |
| **Ligar/Desligar Música** | `Ctrl + M` | Botão 🎵 na Barra de Ferramentas |
| **Novo Mundo** | `Ctrl + N` | Botão 🚀 na Barra de Ferramentas |
| **Salvar Jogo** | `Ctrl + S` | Botão 💾 na Barra de Ferramentas |
| **Carregar Jogo** | `Ctrl + L` | Botão 📂 na Barra de Ferramentas |

---

## 🔬 Metodologia

1. **Análise Estática com Ghidra**: O executável PE de 32 bits `Yodesk.exe` foi analisado através do servidor MCP **REA** (Reverse Engineer Anything) para identificar a função de janela (`WndProc`), filas de mensagens e tabela de recursos.
2. **Engenharia de Dados**: A estrutura dos blocos do `YODESK.DTA` foi validada com scripts de leitura direta a nível de bytes.
3. **Reimplementação Nativa**: Toda a lógica foi escrita em TypeScript moderno, rodando diretamente sobre a API Canvas do navegador e o subsistema Web Audio, sem necessidade de emular MS-DOS ou Windows 95.
4. **Interface em HTML5**: Os menus, comandos e diálogos foram construídos com botões e elementos HTML5 reais, oferecendo acessibilidade, alta nitidez e integração fluida com telas sensíveis ao toque.

---

## ⚖️ Aviso Legal

_Star Wars_, _Yoda Stories_, personagens e nomes associados são marcas registradas e pertencem à Lucasfilm Ltd. e LucasArts Entertainment Company.

Este é um projeto não-lucrativo, de fãs e com finalidade estritamente educacional e de preservação histórica. Não possui qualquer vínculo ou endosso de Disney, Lucasfilm Ltd. ou LucasArts.

O código fonte de **yoda-stories** é distribuído sob os termos da licença [GNU General Public License v3.0 ou posterior](LICENSE).
