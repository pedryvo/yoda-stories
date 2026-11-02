import { YodaGame, InventoryItem } from '../engine/game';
import { t, getLanguage, setLanguage, SupportedLanguage, onLanguageChange } from '../i18n';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../render/renderer';

export class GameWindow {
  private game: YodaGame;
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  // UI Elements
  private activeDropdown: HTMLElement | null = null;
  private modalContainer: HTMLElement;

  constructor(game: YodaGame, root: HTMLElement) {
    this.game = game;
    this.container = root;

    root.innerHTML = '';
    root.className = 'desktop-environment';

    // Modal overlay container
    this.modalContainer = document.createElement('div');
    this.modalContainer.className = 'modal-backdrop hidden';
    document.body.appendChild(this.modalContainer);

    // Build Windows 95 Chrome
    const win = document.createElement('div');
    win.className = 'win95-window';

    // 1. Title bar
    const titleBar = document.createElement('div');
    titleBar.className = 'win95-titlebar';
    titleBar.innerHTML = `
      <div class="title-content">
        <span class="app-icon">⚔️</span>
        <span class="app-title" id="lbl-app-title">${t().appName}</span>
      </div>
      <div class="titlebar-buttons">
        <button class="win95-btn title-btn" id="btn-min" title="Minimize">_</button>
        <button class="win95-btn title-btn" id="btn-max" title="Maximize">□</button>
        <button class="win95-btn title-btn" id="btn-close" title="Close">×</button>
      </div>
    `;
    win.appendChild(titleBar);

    // 2. Menu Bar (HTML5 buttons & dropdown menus)
    const menuBar = document.createElement('nav');
    menuBar.className = 'win95-menubar';
    menuBar.innerHTML = `
      <div class="menu-item" data-menu="file">
        <button class="win95-menubtn" id="menu-btn-file">${t().menus.file}</button>
        <div class="win95-dropdown hidden" id="dropdown-file">
          <button class="dropdown-item" id="mi-new-world">${t().menus.newWorld}</button>
          <button class="dropdown-item" id="mi-replay-story">${t().menus.replayStory}</button>
          <button class="dropdown-item" id="mi-load-world">${t().menus.loadWorld}</button>
          <button class="dropdown-item" id="mi-save-world">${t().menus.saveWorld}</button>
          <div class="dropdown-separator"></div>
          <button class="dropdown-item" id="mi-exit">${t().menus.exit}</button>
        </div>
      </div>

      <div class="menu-item" data-menu="options">
        <button class="win95-menubtn" id="menu-btn-options">${t().menus.options}</button>
        <div class="win95-dropdown hidden" id="dropdown-options">
          <button class="dropdown-item" id="mi-difficulty">${t().menus.combatDifficulty}</button>
          <button class="dropdown-item" id="mi-speed">${t().menus.gameSpeed}</button>
          <button class="dropdown-item" id="mi-world-control">${t().menus.worldControl}</button>
          <button class="dropdown-item" id="mi-statistics">${t().menus.statistics}</button>
          <div class="dropdown-separator"></div>
          <button class="dropdown-item" id="mi-sound">${t().menus.soundOn}</button>
          <button class="dropdown-item" id="mi-music">${t().menus.musicOn}</button>
          <div class="dropdown-separator"></div>
          <button class="dropdown-item" id="mi-pause">${t().menus.pause}</button>
        </div>
      </div>

      <div class="menu-item" data-menu="window">
        <button class="win95-menubtn" id="menu-btn-window">${t().menus.window}</button>
        <div class="win95-dropdown hidden" id="dropdown-window">
          <button class="dropdown-item" id="mi-hide">${t().menus.hideMe}</button>
          <button class="dropdown-item" id="mi-fullscreen">${t().menus.fullscreen}</button>
          <button class="dropdown-item" id="mi-scale-1x">Scale 1x (Original 288px)</button>
          <button class="dropdown-item" id="mi-scale-2x">Scale 2x (576px)</button>
          <button class="dropdown-item" id="mi-scale-fit">Scale Fit Screen</button>
        </div>
      </div>

      <div class="menu-item" data-menu="language">
        <button class="win95-menubtn" id="menu-btn-language">🌐 ${t().menus.language}</button>
        <div class="win95-dropdown hidden" id="dropdown-language">
          <button class="dropdown-item" data-lang="en">🇺🇸 English</button>
          <button class="dropdown-item" data-lang="pt-BR">🇧🇷 Português (Brasil)</button>
          <button class="dropdown-item" data-lang="zh-CN">🇨🇳 简体中文</button>
          <button class="dropdown-item" data-lang="ru">🇷🇺 Русский</button>
          <button class="dropdown-item" data-lang="de">🇩🇪 Deutsch</button>
        </div>
      </div>

      <div class="menu-item" data-menu="help">
        <button class="win95-menubtn" id="menu-btn-help">${t().menus.help}</button>
        <div class="win95-dropdown hidden" id="dropdown-help">
          <button class="dropdown-item" id="mi-how-to-play">${t().menus.howToPlay}</button>
          <button class="dropdown-item" id="mi-about">${t().menus.about}</button>
        </div>
      </div>
    `;
    win.appendChild(menuBar);

    // 3. Quick Toolbar (HTML5 buttons)
    const toolbar = document.createElement('div');
    toolbar.className = 'win95-toolbar';
    toolbar.innerHTML = `
      <button class="win95-toolbtn" id="tb-new" title="${t().toolbar.newGame}">🚀 <span>${t().toolbar.newGame}</span></button>
      <button class="win95-toolbtn" id="tb-save" title="${t().toolbar.save}">💾 <span>${t().toolbar.save}</span></button>
      <button class="win95-toolbtn" id="tb-load" title="${t().toolbar.load}">📂 <span>${t().toolbar.load}</span></button>
      <div class="toolbar-separator"></div>
      <button class="win95-toolbtn" id="tb-pause" title="${t().toolbar.pause}">⏸️ <span>${t().toolbar.pause}</span></button>
      <button class="win95-toolbtn active" id="tb-sound" title="${t().toolbar.sound}">🔊 <span>${t().toolbar.sound}</span></button>
      <button class="win95-toolbtn active" id="tb-music" title="${t().toolbar.music}">🎵 <span>${t().toolbar.music}</span></button>
      <div class="toolbar-separator"></div>
      <button class="win95-toolbtn" id="tb-locator" title="${t().toolbar.locator}">🧭 <span>${t().toolbar.locator}</span></button>
      <button class="win95-toolbtn" id="tb-help" title="${t().toolbar.help}">❓ <span>${t().toolbar.help}</span></button>
    `;
    win.appendChild(toolbar);

    // 4. Main Client Area: Game Canvas + Retro Sidebar
    const clientArea = document.createElement('div');
    clientArea.className = 'win95-client-area';

    // Canvas container
    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'canvas-wrapper';
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.className = 'game-canvas';
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    canvasWrap.appendChild(this.canvas);
    clientArea.appendChild(canvasWrap);

    // Sidebar
    const sidebar = document.createElement('aside');
    sidebar.className = 'win95-sidebar';
    sidebar.innerHTML = `
      <!-- Luke Skywalker Health & Portrait -->
      <div class="sidebar-section hero-status-card">
        <div class="hero-avatar-box">
          <div class="hero-portrait" id="hero-portrait">
            <canvas id="cvs-hero-portrait" width="32" height="32"></canvas>
          </div>
          <div class="meters-col">
            <div class="meter-group">
              <span class="meter-label">${t().sidebar.health}:</span>
              <div class="progress-bar-wrap">
                <div class="progress-bar-fill health" id="bar-health" style="width: 100%;"></div>
              </div>
            </div>
            <div class="meter-group">
              <span class="meter-label">${t().sidebar.force}:</span>
              <div class="progress-bar-wrap">
                <div class="progress-bar-fill force" id="bar-force" style="width: 100%;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Equipment Slots -->
      <div class="sidebar-section equip-section">
        <div class="equip-box" id="slot-weapon">
          <span class="equip-label">${t().sidebar.weapon}</span>
          <button class="slot-display-btn" id="btn-equip-weapon" title="Equipped Weapon (Click to attack)">
            <canvas id="cvs-weapon-icon" width="32" height="32"></canvas>
            <span class="slot-name" id="lbl-weapon-name">${t().items.lightsaber}</span>
          </button>
        </div>

        <div class="equip-box" id="slot-item">
          <span class="equip-label">${t().sidebar.item}</span>
          <button class="slot-display-btn" id="btn-equip-item" title="Equipped Item (Click to use)">
            <canvas id="cvs-item-icon" width="32" height="32"></canvas>
            <span class="slot-name" id="lbl-item-name">${t().items.locator}</span>
          </button>
        </div>
      </div>

      <!-- Locator Radar / Compass -->
      <div class="sidebar-section locator-section">
        <span class="section-title">${t().sidebar.locator}</span>
        <button class="locator-compass-btn" id="btn-locator-radar" title="Locator Radar (Click to ping)">
          <div class="compass-dial">
            <div class="compass-needle" id="compass-needle">▲</div>
          </div>
        </button>
      </div>

      <!-- Inventory Grid (3 x 4) with HTML5 scroll buttons -->
      <div class="sidebar-section inventory-section">
        <div class="inv-header">
          <span class="section-title">${t().sidebar.inventory}</span>
          <div class="inv-scroll-btns">
            <button class="win95-btn inv-scroll-btn" id="btn-inv-up" title="Scroll Up">▲</button>
            <button class="win95-btn inv-scroll-btn" id="btn-inv-down" title="Scroll Down">▼</button>
          </div>
        </div>
        <div class="inventory-grid" id="inventory-grid">
          <!-- 12 slots dynamically populated -->
        </div>
      </div>

      <!-- Location / Coordinates Footer -->
      <div class="sidebar-section zone-info-section">
        <span id="lbl-planet-zone">${t().sidebar.planet}: Dagobah (Zone 0)</span>
      </div>
    `;
    clientArea.appendChild(sidebar);
    win.appendChild(clientArea);

    // 5. Status Bar
    const statusBar = document.createElement('div');
    statusBar.className = 'win95-statusbar';
    statusBar.innerHTML = `
      <div class="status-cell" id="sb-status">Ready</div>
      <div class="status-cell score-cell" id="sb-score">Score: 0</div>
      <div class="status-cell" id="sb-speed">Speed: Normal</div>
      <div class="status-cell" id="sb-diff">Difficulty: Medium</div>
    `;
    win.appendChild(statusBar);

    root.appendChild(win);

    // Setup Event Listeners
    this.setupMenus();
    this.setupToolbar();
    this.setupInventory();
    this.setupGameHooks();

    // Listen for language changes
    onLanguageChange(() => this.updateLanguageTexts());
  }

  private setupMenus(): void {
    // Dropdown toggles
    const menuButtons = this.container.querySelectorAll<HTMLButtonElement>('.win95-menubtn');
    menuButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const parent = btn.parentElement!;
        const dropdown = parent.querySelector<HTMLElement>('.win95-dropdown')!;
        if (this.activeDropdown && this.activeDropdown !== dropdown) {
          this.activeDropdown.classList.add('hidden');
        }
        dropdown.classList.toggle('hidden');
        this.activeDropdown = dropdown.classList.contains('hidden') ? null : dropdown;
      });
    });

    document.addEventListener('click', () => {
      if (this.activeDropdown) {
        this.activeDropdown.classList.add('hidden');
        this.activeDropdown = null;
      }
    });

    // File Menu Actions
    this.container.querySelector('#mi-new-world')?.addEventListener('click', () => {
      this.game.newWorld();
    });
    this.container.querySelector('#mi-replay-story')?.addEventListener('click', () => {
      this.game.loadZone(this.game.state.currentZoneId);
    });
    this.container.querySelector('#mi-save-world')?.addEventListener('click', () => {
      this.game.saveWorld();
    });
    this.container.querySelector('#mi-load-world')?.addEventListener('click', () => {
      this.game.loadWorld();
    });
    this.container.querySelector('#mi-exit')?.addEventListener('click', () => {
      if (confirm('Exit Star Wars: Yoda Stories?')) {
        window.close();
      }
    });

    // Options Menu Actions
    this.container.querySelector('#mi-difficulty')?.addEventListener('click', () => {
      this.showDifficultyModal();
    });
    this.container.querySelector('#mi-speed')?.addEventListener('click', () => {
      this.showSpeedModal();
    });
    this.container.querySelector('#mi-world-control')?.addEventListener('click', () => {
      this.showWorldControlModal();
    });
    this.container.querySelector('#mi-statistics')?.addEventListener('click', () => {
      this.showStatisticsModal();
    });
    this.container.querySelector('#mi-sound')?.addEventListener('click', () => {
      const on = this.game.audio.toggleSound();
      this.updateAudioButtons(on, this.game.audio.isMusicOn());
    });
    this.container.querySelector('#mi-music')?.addEventListener('click', () => {
      const on = this.game.audio.toggleMusic();
      this.updateAudioButtons(this.game.audio.isSoundOn(), on);
    });
    this.container.querySelector('#mi-pause')?.addEventListener('click', () => {
      this.game.togglePause();
    });

    // Window Actions
    this.container.querySelector('#mi-hide')?.addEventListener('click', () => {
      this.container.style.opacity = this.container.style.opacity === '0.1' ? '1' : '0.1';
    });
    this.container.querySelector('#mi-fullscreen')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });
    this.container.querySelector('#mi-scale-1x')?.addEventListener('click', () => {
      this.canvas.style.width = `${CANVAS_WIDTH}px`;
      this.canvas.style.height = `${CANVAS_HEIGHT}px`;
    });
    this.container.querySelector('#mi-scale-2x')?.addEventListener('click', () => {
      this.canvas.style.width = `${CANVAS_WIDTH * 2}px`;
      this.canvas.style.height = `${CANVAS_HEIGHT * 2}px`;
    });
    this.container.querySelector('#mi-scale-fit')?.addEventListener('click', () => {
      this.canvas.style.width = '100%';
      this.canvas.style.height = 'auto';
    });

    // Language selector
    const langBtns = this.container.querySelectorAll<HTMLButtonElement>('[data-lang]');
    langBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang as SupportedLanguage;
        if (lang) setLanguage(lang);
      });
    });

    // Help Actions
    this.container.querySelector('#mi-how-to-play')?.addEventListener('click', () => {
      this.showHelpModal();
    });
    this.container.querySelector('#mi-about')?.addEventListener('click', () => {
      this.showAboutModal();
    });
  }

  private setupToolbar(): void {
    this.container.querySelector('#tb-new')?.addEventListener('click', () => this.game.newWorld());
    this.container.querySelector('#tb-save')?.addEventListener('click', () => this.game.saveWorld());
    this.container.querySelector('#tb-load')?.addEventListener('click', () => this.game.loadWorld());
    this.container.querySelector('#tb-pause')?.addEventListener('click', () => this.game.togglePause());
    this.container.querySelector('#tb-sound')?.addEventListener('click', () => {
      const on = this.game.audio.toggleSound();
      this.updateAudioButtons(on, this.game.audio.isMusicOn());
    });
    this.container.querySelector('#tb-music')?.addEventListener('click', () => {
      const on = this.game.audio.toggleMusic();
      this.updateAudioButtons(this.game.audio.isSoundOn(), on);
    });
    this.container.querySelector('#tb-locator')?.addEventListener('click', () => {
      this.game.useEquippedItem();
    });
    this.container.querySelector('#tb-help')?.addEventListener('click', () => this.showHelpModal());

    // Equipment click
    this.container.querySelector('#btn-equip-weapon')?.addEventListener('click', () => {
      this.game.attack();
    });
    this.container.querySelector('#btn-equip-item')?.addEventListener('click', () => {
      this.game.useEquippedItem();
    });
    this.container.querySelector('#btn-locator-radar')?.addEventListener('click', () => {
      this.game.useEquippedItem();
    });
  }

  private setupInventory(): void {
    const grid = this.container.querySelector('#inventory-grid')!;
    grid.innerHTML = '';
    for (let i = 0; i < 12; i++) {
      const slot = document.createElement('button');
      slot.className = 'inv-slot-btn';
      slot.dataset.slotIndex = i.toString();
      slot.innerHTML = `<canvas class="inv-slot-canvas" width="32" height="32"></canvas>`;
      slot.addEventListener('click', () => {
        const item = this.game.state.inventory[i];
        if (item) {
          if (item.type === 'weapon') this.game.equipWeapon(item);
          else this.game.equipItem(item);
        }
      });
      grid.appendChild(slot);
    }
  }

  private setupGameHooks(): void {
    this.game.onStateUpdate = (st) => this.renderState(st);
    this.game.onMessageDialog = (title, text, avatarTileId) => {
      this.showMessageModal(title, text, avatarTileId);
    };
  }

  public renderState(st: YodaGame['state']): void {
    // Health & Force
    const barHealth = this.container.querySelector<HTMLElement>('#bar-health');
    if (barHealth) barHealth.style.width = `${Math.max(0, Math.min(100, st.health))}%`;
    const barForce = this.container.querySelector<HTMLElement>('#bar-force');
    if (barForce) barForce.style.width = `${Math.max(0, Math.min(100, st.force))}%`;

    // Weapon & Item labels
    const lblWeapon = this.container.querySelector('#lbl-weapon-name');
    if (lblWeapon) lblWeapon.textContent = st.equippedWeapon?.name || t().sidebar.noneEquipped;
    const lblItem = this.container.querySelector('#lbl-item-name');
    if (lblItem) lblItem.textContent = st.equippedItem?.name || t().sidebar.noneEquipped;

    // Draw Weapon & Item icons
    if (this.game.dta) {
      // Draw Luke's face portrait
      const portraitCvs = this.container.querySelector<HTMLCanvasElement>('#cvs-hero-portrait');
      if (portraitCvs) {
        const heroTile = this.game.dta.tiles[799];
        if (heroTile) {
          const pCtx = portraitCvs.getContext('2d')!;
          pCtx.clearRect(0, 0, 32, 32);
          pCtx.drawImage(this.game.renderer.getTileCanvas(heroTile), 0, 0);
        }
      }

      if (st.equippedWeapon) {
        const cvs = this.container.querySelector<HTMLCanvasElement>('#cvs-weapon-icon');
        if (cvs) {
          const tile = this.game.dta.tiles[st.equippedWeapon.tileId];
          if (tile) {
            const ctx = cvs.getContext('2d')!;
            ctx.clearRect(0, 0, 32, 32);
            ctx.drawImage(this.game.renderer.getTileCanvas(tile), 0, 0);
          }
        }
      }
      if (st.equippedItem) {
        const cvs = this.container.querySelector<HTMLCanvasElement>('#cvs-item-icon');
        if (cvs) {
          const tile = this.game.dta.tiles[st.equippedItem.tileId];
          if (tile) {
            const ctx = cvs.getContext('2d')!;
            ctx.clearRect(0, 0, 32, 32);
            ctx.drawImage(this.game.renderer.getTileCanvas(tile), 0, 0);
          }
        }
      }

      // Update Inventory Slots
      const slotCanvases = this.container.querySelectorAll<HTMLCanvasElement>('.inv-slot-canvas');
      slotCanvases.forEach((cvs, idx) => {
        const ctx = cvs.getContext('2d')!;
        ctx.clearRect(0, 0, 32, 32);
        const item = st.inventory[idx];
        if (item) {
          const tile = this.game.dta!.tiles[item.tileId];
          if (tile) {
            ctx.drawImage(this.game.renderer.getTileCanvas(tile), 0, 0);
          }
        }
      });
    }

    // Locator compass needle rotation
    const needle = this.container.querySelector<HTMLElement>('#compass-needle');
    if (needle) {
      needle.style.transform = `rotate(${st.locatorAngle}deg)`;
    }

    // Zone & Score
    const lblZone = this.container.querySelector('#lbl-planet-zone');
    if (lblZone) {
      lblZone.textContent = `${t().sidebar.planet}: ${st.planetName} (Zone ${st.currentZoneId})`;
    }
    const sbScore = this.container.querySelector('#sb-score');
    if (sbScore) sbScore.textContent = `Score: ${st.score}`;
    const sbStatus = this.container.querySelector('#sb-status');
    if (sbStatus) sbStatus.textContent = st.isPaused ? 'PAUSED' : 'Ready';
  }

  private updateAudioButtons(soundOn: boolean, musicOn: boolean): void {
    const btnSound = this.container.querySelector('#tb-sound');
    if (btnSound) btnSound.classList.toggle('active', soundOn);
    const btnMusic = this.container.querySelector('#tb-music');
    if (btnMusic) btnMusic.classList.toggle('active', musicOn);
  }

  private updateLanguageTexts(): void {
    const dict = t();
    const appTitle = this.container.querySelector('#lbl-app-title');
    if (appTitle) appTitle.textContent = dict.appName;

    const btnFile = this.container.querySelector('#menu-btn-file');
    if (btnFile) btnFile.textContent = dict.menus.file;
    const btnOptions = this.container.querySelector('#menu-btn-options');
    if (btnOptions) btnOptions.textContent = dict.menus.options;
    const btnWindow = this.container.querySelector('#menu-btn-window');
    if (btnWindow) btnWindow.textContent = dict.menus.window;
    const btnHelp = this.container.querySelector('#menu-btn-help');
    if (btnHelp) btnHelp.textContent = dict.menus.help;

    // Refresh state labels
    this.renderState(this.game.state);
  }

  // --- Modal Dialog System (HTML5 Modals) ---

  public showModal(title: string, bodyContent: HTMLElement | string, buttons: Array<{ text: string; primary?: boolean; onClick: () => void }>): void {
    this.modalContainer.innerHTML = '';
    this.modalContainer.classList.remove('hidden');

    const dlg = document.createElement('div');
    dlg.className = 'win95-dialog';

    const header = document.createElement('div');
    header.className = 'win95-titlebar dialog-titlebar';
    header.innerHTML = `
      <span class="dialog-title">${title}</span>
      <button class="win95-btn title-btn dlg-close">×</button>
    `;
    dlg.appendChild(header);

    header.querySelector('.dlg-close')?.addEventListener('click', () => {
      this.closeModal();
    });

    const body = document.createElement('div');
    body.className = 'dialog-body';
    if (typeof bodyContent === 'string') {
      body.innerHTML = `<p style="white-space: pre-wrap;">${bodyContent}</p>`;
    } else {
      body.appendChild(bodyContent);
    }
    dlg.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'dialog-footer';
    buttons.forEach((b) => {
      const btn = document.createElement('button');
      btn.className = `win95-btn dialog-action-btn ${b.primary ? 'primary' : ''}`;
      btn.textContent = b.text;
      btn.addEventListener('click', () => {
        b.onClick();
        this.closeModal();
      });
      footer.appendChild(btn);
    });
    dlg.appendChild(footer);

    this.modalContainer.appendChild(dlg);
  }

  public closeModal(): void {
    this.modalContainer.classList.add('hidden');
    this.modalContainer.innerHTML = '';
  }

  public showMessageModal(title: string, message: string, avatarTileId?: number): void {
    const wrap = document.createElement('div');
    wrap.className = 'message-dialog-content';
    if (avatarTileId && this.game.dta) {
      const tile = this.game.dta.tiles[avatarTileId];
      if (tile) {
        const cvs = document.createElement('canvas');
        cvs.width = 32;
        cvs.height = 32;
        cvs.className = 'dialog-avatar-canvas';
        const ctx = cvs.getContext('2d')!;
        ctx.drawImage(this.game.renderer.getTileCanvas(tile), 0, 0);
        wrap.appendChild(cvs);
      }
    }
    const p = document.createElement('p');
    p.className = 'dialog-message-text';
    p.textContent = message;
    wrap.appendChild(p);

    this.showModal(title, wrap, [{ text: t().dialogs.ok, primary: true, onClick: () => {} }]);
  }

  public showAboutModal(): void {
    this.showModal(t().dialogs.aboutTitle, t().dialogs.aboutText, [
      { text: t().dialogs.ok, primary: true, onClick: () => {} },
    ]);
  }

  public showHelpModal(): void {
    this.showModal(t().dialogs.helpTitle, t().dialogs.helpText, [
      { text: t().dialogs.ok, primary: true, onClick: () => {} },
    ]);
  }

  public showDifficultyModal(): void {
    const form = document.createElement('div');
    form.className = 'dialog-form';
    form.innerHTML = `
      <label><input type="radio" name="diff" value="easy" ${this.game.state.combatDifficulty === 'easy' ? 'checked' : ''}> ${t().dialogs.difficultyEasy}</label><br>
      <label><input type="radio" name="diff" value="medium" ${this.game.state.combatDifficulty === 'medium' ? 'checked' : ''}> ${t().dialogs.difficultyMedium}</label><br>
      <label><input type="radio" name="diff" value="hard" ${this.game.state.combatDifficulty === 'hard' ? 'checked' : ''}> ${t().dialogs.difficultyHard}</label>
    `;
    this.showModal(t().dialogs.difficultyTitle, form, [
      {
        text: t().dialogs.ok,
        primary: true,
        onClick: () => {
          const val = form.querySelector<HTMLInputElement>('input[name="diff"]:checked')?.value as any;
          if (val) this.game.state.combatDifficulty = val;
        },
      },
      { text: t().dialogs.cancel, onClick: () => {} },
    ]);
  }

  public showSpeedModal(): void {
    const form = document.createElement('div');
    form.className = 'dialog-form';
    form.innerHTML = `
      <label><input type="radio" name="speed" value="slow" ${this.game.state.gameSpeed === 'slow' ? 'checked' : ''}> ${t().dialogs.speedSlow}</label><br>
      <label><input type="radio" name="speed" value="normal" ${this.game.state.gameSpeed === 'normal' ? 'checked' : ''}> ${t().dialogs.speedNormal}</label><br>
      <label><input type="radio" name="speed" value="fast" ${this.game.state.gameSpeed === 'fast' ? 'checked' : ''}> ${t().dialogs.speedFast}</label>
    `;
    this.showModal(t().dialogs.speedTitle, form, [
      {
        text: t().dialogs.ok,
        primary: true,
        onClick: () => {
          const val = form.querySelector<HTMLInputElement>('input[name="speed"]:checked')?.value as any;
          if (val) this.game.state.gameSpeed = val;
        },
      },
      { text: t().dialogs.cancel, onClick: () => {} },
    ]);
  }

  public showWorldControlModal(): void {
    const form = document.createElement('div');
    form.className = 'dialog-form';
    form.innerHTML = `
      <p>${t().dialogs.worldControlPrompt}</p>
      <label><input type="radio" name="wsize" value="small"> ${t().dialogs.worldSmall}</label><br>
      <label><input type="radio" name="wsize" value="medium" checked> ${t().dialogs.worldMedium}</label><br>
      <label><input type="radio" name="wsize" value="large"> ${t().dialogs.worldLarge}</label>
    `;
    this.showModal(t().dialogs.worldControlTitle, form, [
      {
        text: t().dialogs.ok,
        primary: true,
        onClick: () => {
          const val = form.querySelector<HTMLInputElement>('input[name="wsize"]:checked')?.value as any;
          this.game.newWorld(val || 'medium');
        },
      },
      { text: t().dialogs.cancel, onClick: () => {} },
    ]);
  }

  public showStatisticsModal(): void {
    const form = document.createElement('div');
    form.className = 'stats-view';
    form.innerHTML = `
      <p><b>${t().dialogs.lastScore}</b> ${this.game.state.score}</p>
      <p><b>${t().dialogs.highScore}</b> ${this.game.state.highScore}</p>
      <p><b>${t().dialogs.gamesWon}</b> ${this.game.state.gamesWon}</p>
      <p><b>${t().dialogs.gamesLost}</b> ${this.game.state.gamesLost}</p>
    `;
    this.showModal(t().dialogs.statsTitle, form, [
      { text: t().dialogs.ok, primary: true, onClick: () => {} },
    ]);
  }
}
