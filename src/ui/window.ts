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
  private selectedInventoryIndex: number = 0;
  private missionSeconds: number = 0;
  private missionTimerInterval: number | null = null;
  private toastTimeout: number | null = null;
  private modalOnClose?: () => void;

  constructor(game: YodaGame, root: HTMLElement) {
    this.game = game;
    this.container = root;

    root.innerHTML = '';
    root.className = 'hud-environment';

    // Modal overlay container
    this.modalContainer = document.createElement('div');
    this.modalContainer.className = 'modal-backdrop hidden';
    document.body.appendChild(this.modalContainer);

    // 1. Topbar Command Console
    const header = document.createElement('header');
    header.className = 'hud-header';
    header.innerHTML = `
      <div class="hud-header-content">
        <!-- Star Wars Brand & Engine Meta -->
        <div class="sw-brand">
          <div class="sw-emblem">
            <svg class="sw-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15 8H9L12 2Z" fill="#ffe81f"/>
              <path d="M12 22L8 15H16L12 22Z" fill="#00f0ff"/>
              <circle cx="12" cy="11.5" r="3.5" fill="#00ff88"/>
            </svg>
          </div>
          <div>
            <div class="sw-title-row">
              <span class="sw-logo-text">${t().appName}</span>
              <span class="sw-badge font-mono-tech">REMASTER // WASM CORE</span>
            </div>
            <div class="sw-meta-text">
              <span class="sw-pulse-dot"></span>
              <span>CORE: WASM ENGINE v3.4.1</span>
              <span class="sw-sep">|</span>
              <span class="sw-status-text">DAG_SYS_ONLINE</span>
            </div>
          </div>
        </div>

        <!-- Quick Actions Bar (HTML5 Buttons) -->
        <div class="hud-actions">
          <button class="hud-btn" id="tb-new" title="${t().toolbar.newGame}">
            <span>🚀</span>
            <label>${t().toolbar.newGame}</label>
          </button>

          <button class="hud-btn" id="tb-save" title="${t().toolbar.save}">
            <span>💾</span>
            <label>${t().toolbar.save}</label>
          </button>

          <button class="hud-btn" id="tb-load" title="${t().toolbar.load}">
            <span>📂</span>
            <label>${t().toolbar.load}</label>
          </button>

          <button class="hud-btn active" id="tb-sound" title="${t().toolbar.sound}">
            <span id="icon-sound">🔊</span>
            <label id="lbl-sound">SFX: ON</label>
          </button>

          <button class="hud-btn active" id="tb-music" title="${t().toolbar.music}">
            <span id="icon-music">🎵</span>
            <label id="lbl-music">MUSIC: ON</label>
          </button>

          <button class="hud-btn btn-pause" id="tb-pause" title="${t().toolbar.pause}">
            <span id="icon-pause">⏸️</span>
            <label id="lbl-pause">PAUSE</label>
          </button>

          <!-- Language Dropdown -->
          <div class="hud-dropdown-wrap">
            <button class="hud-btn" id="btn-language" title="${t().toolbar.language}">
              <span>🌐</span>
              <label id="lbl-current-lang">${this.getLangLabel(getLanguage())}</label>
            </button>
            <div class="hud-dropdown hidden" id="dropdown-language">
              <button class="hud-dropdown-item" data-lang="en">🇺🇸 English</button>
              <button class="hud-dropdown-item" data-lang="pt-BR">🇧🇷 Português (Brasil)</button>
              <button class="hud-dropdown-item" data-lang="zh-CN">🇨🇳 简体中文</button>
              <button class="hud-dropdown-item" data-lang="ru">🇷🇺 Русский</button>
              <button class="hud-dropdown-item" data-lang="de">🇩🇪 Deutsch</button>
            </div>
          </div>

          <!-- Options Dropdown -->
          <div class="hud-dropdown-wrap">
            <button class="hud-btn" id="btn-options" title="${t().menus.options}">
              <span>⚙️</span>
              <label>${t().menus.options}</label>
            </button>
            <div class="hud-dropdown hidden" id="dropdown-options">
              <button class="hud-dropdown-item" id="mi-difficulty">${t().menus.combatDifficulty}</button>
              <button class="hud-dropdown-item" id="mi-speed">${t().menus.gameSpeed}</button>
              <button class="hud-dropdown-item" id="mi-world-control">${t().menus.worldControl}</button>
              <button class="hud-dropdown-item" id="mi-statistics">${t().menus.statistics}</button>
              <div class="hud-dropdown-separator"></div>
              <button class="hud-dropdown-item" id="mi-scale-1x">Scale 1x (Original 288px)</button>
              <button class="hud-dropdown-item" id="mi-scale-fit">Scale Fit Viewport</button>
              <button class="hud-dropdown-item" id="mi-fullscreen">${t().menus.fullscreen}</button>
            </div>
          </div>

          <button class="hud-btn" id="tb-help" title="${t().toolbar.help}">
            <span>❓</span>
            <label>${t().toolbar.help}</label>
          </button>
        </div>
      </div>
    `;
    root.appendChild(header);

    // 2. Main Body: 2 Columns (Tactical Viewport + Holo HUD Sidebar)
    const main = document.createElement('main');
    main.className = 'hud-main';

    // Left Column: Tactical Viewport Card
    const viewportCard = document.createElement('section');
    viewportCard.className = 'hud-viewport-card';
    viewportCard.innerHTML = `
      <!-- Viewport Header -->
      <div class="viewport-header">
        <div class="viewport-title-group">
          <span class="sw-pulse-dot"></span>
          <span class="font-orbitron" style="font-weight: 700; letter-spacing: 0.08em;">TACTICAL VIEWPORT</span>
          <span style="color: #64748b;">|</span>
          <span id="lbl-sector-tag" style="color: #94a3b8;">SECTOR_DAG_01.RAW</span>
        </div>
        <div class="viewport-status-badges">
          <span class="fps-badge" id="lbl-fps">60 FPS</span>
          <span style="color: #94a3b8; font-size: 11px;">ZOOM: 100%</span>
        </div>
      </div>

      <!-- Viewport Screen Area -->
      <div class="viewport-screen">
        <div class="canvas-wrapper">
          <!-- Canvas injected here -->
        </div>

        <!-- Pause Overlay -->
        <div class="pause-overlay hidden" id="pause-overlay">
          <div class="pause-box">
            <h2 class="pause-title">SISTEMA EM PAUSA</h2>
            <p class="pause-desc">Pressione [ESPAÇO] ou clique abaixo para retomar a missão.</p>
            <button class="pause-resume-btn" id="btn-resume-overlay">CONTINUAR</button>
          </div>
        </div>

        <!-- In-game Toast Notification -->
        <div class="hud-toast" id="game-toast">
          <span>📡</span>
          <span id="toast-text">Sinal recebido</span>
        </div>
      </div>

      <!-- Viewport Footer -->
      <div class="viewport-footer">
        <div class="hotkeys-hint">
          <span>🎮</span>
          <span>[W,A,S,D / SETAS] Mover Luke | [ESPAÇO] Sabre | [ENTER] Usar Item</span>
        </div>
        <div class="coords-telemetry font-mono-tech" id="lbl-coords">
          <span>🧭</span>
          <span>COORD: X: 0 | Y: 0</span>
        </div>
      </div>
    `;

    // Inject canvas into viewport screen
    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.className = 'game-canvas';
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    viewportCard.querySelector('.canvas-wrapper')!.appendChild(this.canvas);
    main.appendChild(viewportCard);

    // Right Column: Tactical HUD Holo-Panel
    const sidebar = document.createElement('aside');
    sidebar.className = 'hud-sidebar';
    sidebar.innerHTML = `
      <!-- CARD 1: Pilot Status & Vital Bars -->
      <div class="hud-card cut-corner-tl">
        <div class="hud-card-corner"></div>
        <div class="pilot-status-row">
          <!-- Luke Skywalker Holographic Avatar -->
          <div class="pilot-avatar-box">
            <canvas id="cvs-hero-portrait" class="pilot-portrait-cvs" width="32" height="32"></canvas>
            <div class="pilot-scan-line"></div>
            <span class="pilot-lvl-badge">LVL 4</span>
          </div>

          <div class="pilot-info-col">
            <div class="pilot-name-row">
              <h3 class="pilot-name">LUKE SKYWALKER</h3>
              <span class="pilot-rank">JEDI PADAWAN</span>
            </div>

            <!-- Health Meter -->
            <div class="meter-row">
              <div class="meter-header">
                <span style="color: var(--sw-green);">❤️ ${t().sidebar.health}</span>
                <span id="hp-val" style="color: #6ee7b7; font-weight: bold;">100 / 100</span>
              </div>
              <div class="meter-bar-track">
                <div class="meter-bar-fill health" id="bar-health" style="width: 100%;"></div>
              </div>
            </div>

            <!-- Force Meter -->
            <div class="meter-row">
              <div class="meter-header">
                <span style="color: var(--sw-cyan);">⚡ ${t().sidebar.force}</span>
                <span id="force-val" style="color: #7dd3fc; font-weight: bold;">100 / 100</span>
              </div>
              <div class="meter-bar-track">
                <div class="meter-bar-fill force" id="bar-force" style="width: 100%;"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CARD 2: Quick Equipment & Radar -->
      <div class="equip-radar-grid">
        <!-- Equipment Slots -->
        <div class="hud-subcard">
          <div class="subcard-header">
            <span>EQUIPAMENTO</span>
            <span style="color: #64748b;">HOTKEYS 1 & 2</span>
          </div>
          <div class="equip-slots-wrap">
            <div class="equip-slot-box" id="btn-equip-weapon" title="Arma Principal (Clique para Atacar)">
              <span class="equip-slot-label">ARMA</span>
              <canvas id="cvs-weapon-icon" class="equip-icon-cvs saber-glow" width="32" height="32"></canvas>
              <span class="equip-slot-name" id="lbl-weapon-name">${t().items.lightsaber}</span>
            </div>

            <div class="equip-slot-box" id="btn-equip-item" title="Item Ativo (Clique para Usar)">
              <span class="equip-slot-label">ITEM</span>
              <canvas id="cvs-item-icon" class="equip-icon-cvs" width="32" height="32"></canvas>
              <span class="equip-slot-name" id="lbl-item-name">${t().items.locator}</span>
            </div>
          </div>
        </div>

        <!-- Tactical Radar -->
        <div class="hud-subcard radar-wrap">
          <div class="subcard-header" style="width: 100%;">
            <span>RADAR LOCATOR</span>
            <span style="color: var(--sw-green); font-size: 9px;" id="lbl-target-badge">ALVO: YODA</span>
          </div>

          <div class="radar-screen" id="btn-locator-radar" title="Radar Tático (Clique para pingar)">
            <div class="radar-ring-1"></div>
            <div class="radar-ring-2"></div>
            <div class="radar-cross-h"></div>
            <div class="radar-cross-v"></div>
            <div class="radar-sweep-beam radar-sweep"></div>
            <div class="radar-center-blip"></div>
            <div class="radar-needle" id="compass-needle">▲</div>
            <span class="radar-compass-n">N</span>
          </div>

          <div class="radar-target-text" id="lbl-radar-info">
            <span class="sw-pulse-dot" style="width: 5px; height: 5px;"></span>
            <span>ALVO: 120m SW</span>
          </div>
        </div>
      </div>

      <!-- CARD 3: Rebel Tactical Inventory -->
      <div class="hud-card cut-corner-br" style="flex: 1; display: flex; flex-direction: column;">
        <div class="subcard-header" style="padding-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>🎒</span>
            <span class="font-orbitron" style="font-weight: 700; letter-spacing: 0.06em;">${t().sidebar.inventory}</span>
          </div>
          <span class="font-mono-tech" id="inv-count" style="color: var(--sw-yellow);">4 / 12 SLOTS</span>
        </div>

        <!-- 12 Slot Inventory Grid -->
        <div class="inventory-grid-wrap" id="inventory-grid">
          <!-- Dynamically populated -->
        </div>

        <!-- Selected Item Detail Box -->
        <div class="item-detail-panel" id="item-details-box">
          <div class="detail-info">
            <div class="detail-icon-box" id="detail-icon-box">
              <canvas id="cvs-detail-icon" width="32" height="32" style="width: 28px; height: 28px; image-rendering: pixelated;"></canvas>
            </div>
            <div>
              <p class="detail-name" id="detail-name">${t().items.lightsaber}</p>
              <p class="detail-desc" id="detail-desc">Arma elegante para uma era mais civilizada.</p>
            </div>
          </div>
          <button class="btn-use-detail" id="btn-use-detail">USAR</button>
        </div>

        <!-- Current Planet Info -->
        <div class="planet-footer">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span>🪐</span>
            <span>${t().sidebar.planet}: <span class="planet-name-text" id="lbl-planet-name">Dagobah</span></span>
          </div>
          <span id="lbl-zone-tag" style="color: var(--sw-cyan);">ZONA 94</span>
        </div>
      </div>
    `;

    main.appendChild(sidebar);
    root.appendChild(main);

    // 3. Footer Minimalist Status Bar
    const footer = document.createElement('footer');
    footer.className = 'hud-footer';
    footer.innerHTML = `
      <div class="footer-stats-group">
        <div class="footer-cell">
          <span>STATUS:</span>
          <span class="footer-val-green flex items-center gap-1">
            <span class="sw-pulse-dot" style="width: 5px; height: 5px;"></span>
            <span id="sb-status">SISTEMAS OPERACIONAIS</span>
          </span>
        </div>
        <div class="footer-cell">
          <span>SCORE:</span>
          <span class="footer-val-yellow" id="sb-score">000000</span>
        </div>
        <div class="footer-cell">
          <span>DIFICULDADE:</span>
          <span style="color: var(--sw-cyan);" id="sb-diff">CAVALEIRO JEDI (MÉDIO)</span>
        </div>
        <div class="footer-cell">
          <span>TEMPO DE MISSÃO:</span>
          <span style="color: #ffffff;" id="mission-timer">00:00:00</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 14px; font-size: 11px;">
        <span>[M] Som</span>
        <span>[P] Pausar</span>
        <span style="color: var(--sw-yellow); font-weight: bold;">HOLO-TERMINAL v3.4</span>
      </div>
    `;
    root.appendChild(footer);

    // Setup Event Listeners & Hooks
    this.setupMenus();
    this.setupToolbar();
    this.setupInventory();
    this.setupGameHooks();
    this.startMissionTimer();

    // Listen for language changes
    onLanguageChange(() => this.updateLanguageTexts());
  }

  private startMissionTimer(): void {
    if (this.missionTimerInterval) clearInterval(this.missionTimerInterval);
    this.missionTimerInterval = window.setInterval(() => {
      this.missionSeconds++;
      const hrs = Math.floor(this.missionSeconds / 3600);
      const mins = Math.floor((this.missionSeconds % 3600) / 60);
      const secs = this.missionSeconds % 60;
      const fmt = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      const el = this.container.querySelector('#mission-timer');
      if (el) el.textContent = fmt;
    }, 1000);
  }

  public showToast(msg: string): void {
    const toast = this.container.querySelector<HTMLElement>('#game-toast');
    const toastText = this.container.querySelector<HTMLElement>('#toast-text');
    if (!toast || !toastText) return;

    toastText.textContent = msg;
    toast.classList.add('show');
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = window.setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  private getLangLabel(lang: SupportedLanguage): string {
    switch (lang) {
      case 'pt-BR': return '🇧🇷 PT-BR';
      case 'zh-CN': return '🇨🇳 中文';
      case 'ru': return '🇷🇺 RU';
      case 'de': return '🇩🇪 DE';
      default: return '🇺🇸 EN';
    }
  }

  private setupMenus(): void {
    // Dropdown toggles
    const dropdownWraps = this.container.querySelectorAll<HTMLElement>('.hud-dropdown-wrap');
    dropdownWraps.forEach((wrap) => {
      const btn = wrap.querySelector<HTMLButtonElement>('.hud-btn')!;
      const dropdown = wrap.querySelector<HTMLElement>('.hud-dropdown')!;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
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

    // Options dropdown actions
    this.container.querySelector('#mi-difficulty')?.addEventListener('click', () => this.showDifficultyModal());
    this.container.querySelector('#mi-speed')?.addEventListener('click', () => this.showSpeedModal());
    this.container.querySelector('#mi-world-control')?.addEventListener('click', () => this.showWorldControlModal());
    this.container.querySelector('#mi-statistics')?.addEventListener('click', () => this.showStatisticsModal());

    this.container.querySelector('#mi-scale-1x')?.addEventListener('click', () => {
      this.canvas.style.width = `${CANVAS_WIDTH}px`;
      this.canvas.style.height = `${CANVAS_HEIGHT}px`;
      this.showToast('Escala 1x (288px) definida');
    });

    this.container.querySelector('#mi-scale-fit')?.addEventListener('click', () => {
      this.canvas.style.width = '100%';
      this.canvas.style.height = 'auto';
      this.showToast('Escala ajustada à tela');
    });

    this.container.querySelector('#mi-fullscreen')?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    });

    // Language selector
    const langBtns = this.container.querySelectorAll<HTMLButtonElement>('[data-lang]');
    langBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang as SupportedLanguage;
        if (lang) {
          setLanguage(lang);
          const lbl = this.container.querySelector('#lbl-current-lang');
          if (lbl) lbl.textContent = this.getLangLabel(lang);
          this.showToast(`Idioma alterado: ${this.getLangLabel(lang)}`);
        }
      });
    });
  }

  private setupToolbar(): void {
    this.container.querySelector('#tb-new')?.addEventListener('click', () => {
      this.game.newWorld();
      this.showToast('Nova missão iniciada em Dagobah!');
    });

    this.container.querySelector('#tb-save')?.addEventListener('click', () => {
      this.game.saveWorld();
      this.showToast('Progresso salvo no Holocron local!');
    });

    this.container.querySelector('#tb-load')?.addEventListener('click', () => {
      this.game.loadWorld();
      this.showToast('Mundo restaurado do Holocron!');
    });

    this.container.querySelector('#tb-sound')?.addEventListener('click', () => {
      const on = this.game.audio.toggleSound();
      this.updateAudioButtons(on, this.game.audio.isMusicOn());
      this.showToast(`Efeitos sonoros: ${on ? 'LIGADOS' : 'DESLIGADOS'}`);
    });

    this.container.querySelector('#tb-music')?.addEventListener('click', () => {
      const on = this.game.audio.toggleMusic();
      this.updateAudioButtons(this.game.audio.isSoundOn(), on);
      this.showToast(`Trilha musical: ${on ? 'LIGADA' : 'DESLIGADA'}`);
    });

    this.container.querySelector('#tb-pause')?.addEventListener('click', () => {
      const isPaused = this.game.togglePause();
      this.updatePauseOverlay(isPaused);
    });

    this.container.querySelector('#btn-resume-overlay')?.addEventListener('click', () => {
      this.game.togglePause();
      this.updatePauseOverlay(false);
    });

    this.container.querySelector('#tb-help')?.addEventListener('click', () => {
      this.showHelpModal();
    });

    // Equipment shortcuts
    this.container.querySelector('#btn-equip-weapon')?.addEventListener('click', () => {
      this.game.attack();
    });

    this.container.querySelector('#btn-equip-item')?.addEventListener('click', () => {
      this.game.useEquippedItem();
    });

    this.container.querySelector('#btn-locator-radar')?.addEventListener('click', () => {
      this.game.useEquippedItem();
      this.showToast('Radar efetuando varredura...');
    });

    this.container.querySelector('#btn-use-detail')?.addEventListener('click', () => {
      this.useSelectedItem();
    });
  }

  private updatePauseOverlay(isPaused: boolean): void {
    const overlay = this.container.querySelector('#pause-overlay');
    if (overlay) overlay.classList.toggle('hidden', !isPaused);
    const lblPause = this.container.querySelector('#lbl-pause');
    if (lblPause) lblPause.textContent = isPaused ? 'RESUME' : 'PAUSE';
  }

  private setupInventory(): void {
    const grid = this.container.querySelector('#inventory-grid')!;
    grid.innerHTML = '';
    for (let i = 0; i < 12; i++) {
      const slot = document.createElement('button');
      slot.className = `inv-slot-btn ${i === 0 ? 'selected' : ''}`;
      slot.dataset.slotIndex = i.toString();
      slot.innerHTML = `
        <canvas class="inv-slot-canvas" width="32" height="32"></canvas>
        <span class="inv-item-badge hidden"></span>
      `;
      slot.addEventListener('click', () => {
        this.selectInventorySlot(i);
      });
      grid.appendChild(slot);
    }
  }

  private selectInventorySlot(index: number): void {
    this.selectedInventoryIndex = index;
    const allSlots = this.container.querySelectorAll('.inv-slot-btn');
    allSlots.forEach((s, idx) => s.classList.toggle('selected', idx === index));

    const item = this.game.state.inventory[index];
    this.updateDetailPanel(item);
  }

  private useSelectedItem(): void {
    const item = this.game.state.inventory[this.selectedInventoryIndex];
    if (item) {
      if (item.type === 'weapon') {
        this.game.equipWeapon(item);
        this.showToast(`${item.name} equipado como arma principal!`);
      } else {
        this.game.equipItem(item);
        this.game.useEquippedItem();
        this.showToast(`Item ${item.name} utilizado!`);
      }
    }
  }

  private updateDetailPanel(item?: InventoryItem): void {
    const lblName = this.container.querySelector('#detail-name');
    const lblDesc = this.container.querySelector('#detail-desc');
    const cvsDetail = this.container.querySelector<HTMLCanvasElement>('#cvs-detail-icon');

    if (!item) {
      if (lblName) lblName.textContent = t().sidebar.noneEquipped;
      if (lblDesc) lblDesc.textContent = 'Slot vazio. Explore o terreno para coletar recursos.';
      if (cvsDetail) {
        const ctx = cvsDetail.getContext('2d')!;
        ctx.clearRect(0, 0, 32, 32);
      }
      return;
    }

    if (lblName) lblName.textContent = item.name;
    if (lblDesc) {
      if (item.tileId === 18) lblDesc.textContent = 'Arma elegante para uma era mais civilizada. Dano: +45';
      else if (item.tileId === 512) lblDesc.textContent = 'Pistola Blaster militar da Aliança Rebelde. Dano à distância.';
      else if (item.tileId === 421) lblDesc.textContent = 'Localizador e radar de pulso magnético para navegação.';
      else if (item.tileId === 505) lblDesc.textContent = 'Kit médico rebelde de regeneração imediata de vitalidade.';
      else lblDesc.textContent = 'Item tático recuperado na superfície do planeta.';
    }

    if (cvsDetail && this.game.dta) {
      const tile = this.game.dta.tiles[item.tileId];
      if (tile) {
        const ctx = cvsDetail.getContext('2d')!;
        ctx.clearRect(0, 0, 32, 32);
        ctx.drawImage(this.game.renderer.getTileCanvas(tile), 0, 0);
      }
    }
  }

  private setupGameHooks(): void {
    this.game.onStateUpdate = (st) => this.renderState(st);
    this.game.onMessageDialog = (title, text, avatarTileId, onClose) => {
      this.showMessageModal(title, text, avatarTileId, onClose);
    };
    this.game.onPickupOffer = (item, accept, cancel) => {
      const text = document.createElement('p');
      text.textContent = item.name;
      let accepted = false;
      this.showModal(item.name,text,[
        { text: t().dialogs.ok, primary: true, onClick: () => { accepted = true; } },
        { text: t().dialogs.cancel, onClick: () => {} },
      ],() => accepted ? accept() : cancel());
    };
  }

  public renderState(st: YodaGame['state']): void {
    // Health & Force Bars & Values
    const barHealth = this.container.querySelector<HTMLElement>('#bar-health');
    if (barHealth) barHealth.style.width = `${Math.max(0, Math.min(100, st.health))}%`;
    const hpVal = this.container.querySelector('#hp-val');
    if (hpVal) hpVal.textContent = `${Math.round(st.health)} / 100`;

    const barForce = this.container.querySelector<HTMLElement>('#bar-force');
    if (barForce) barForce.style.width = `${Math.max(0, Math.min(100, st.force))}%`;
    const forceVal = this.container.querySelector('#force-val');
    if (forceVal) forceVal.textContent = `${Math.round(st.force)} / 100`;

    // Weapon & Item Labels
    const lblWeapon = this.container.querySelector('#lbl-weapon-name');
    if (lblWeapon) lblWeapon.textContent = st.equippedWeapon?.name || t().sidebar.noneEquipped;
    const lblItem = this.container.querySelector('#lbl-item-name');
    if (lblItem) lblItem.textContent = st.equippedItem?.name || t().sidebar.noneEquipped;

    // Draw Weapon, Item & Luke Avatar
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

      // Draw Equipped Weapon Icon
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

      // Draw Equipped Item Icon
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
      const slotBadges = this.container.querySelectorAll<HTMLElement>('.inv-item-badge');

      slotCanvases.forEach((cvs, idx) => {
        const ctx = cvs.getContext('2d')!;
        ctx.clearRect(0, 0, 32, 32);
        const item = st.inventory[idx];
        const badge = slotBadges[idx];

        if (item) {
          const tile = this.game.dta!.tiles[item.tileId];
          if (tile) {
            ctx.drawImage(this.game.renderer.getTileCanvas(tile), 0, 0);
          }
          if (badge) {
            if (item.count > 1) {
              badge.textContent = `x${item.count}`;
              badge.classList.remove('hidden');
            } else {
              badge.classList.add('hidden');
            }
          }
        } else {
          if (badge) badge.classList.add('hidden');
        }
      });
    }

    // Refresh selected item details
    this.updateDetailPanel(st.inventory[this.selectedInventoryIndex]);

    // Inventory Count Badge
    const invCount = this.container.querySelector('#inv-count');
    if (invCount) invCount.textContent = `${st.inventory.length} / 12 SLOTS`;

    // Radar needle rotation & telemetry
    const needle = this.container.querySelector<HTMLElement>('#compass-needle');
    if (needle) {
      needle.style.transform = `rotate(${st.locatorAngle}deg)`;
    }

    // Coords & Sector tags
    const lblCoords = this.container.querySelector('#lbl-coords');
    if (lblCoords) {
      lblCoords.innerHTML = `<span>🧭</span><span>COORD: X: ${st.heroX} | Y: ${st.heroY}</span>`;
    }

    const lblSector = this.container.querySelector('#lbl-sector-tag');
    if (lblSector) {
      lblSector.textContent = `SECTOR_${st.planetName.toUpperCase()}_${st.currentZoneId.toString().padStart(2, '0')}.RAW`;
    }

    const lblPlanet = this.container.querySelector('#lbl-planet-name');
    if (lblPlanet) lblPlanet.textContent = st.planetName;

    const lblZoneTag = this.container.querySelector('#lbl-zone-tag');
    if (lblZoneTag) lblZoneTag.textContent = `ZONA ${st.currentZoneId}`;

    // Score & Status
    const sbScore = this.container.querySelector('#sb-score');
    if (sbScore) sbScore.textContent = st.score.toString().padStart(6, '0');

    const sbStatus = this.container.querySelector('#sb-status');
    if (sbStatus) sbStatus.textContent = st.isPaused ? 'SISTEMA EM PAUSA' : 'SISTEMAS OPERACIONAIS';

    const sbDiff = this.container.querySelector('#sb-diff');
    if (sbDiff) {
      const diffMap: Record<string, string> = {
        easy: 'PADAWAN (FÁCIL)',
        medium: 'CAVALEIRO JEDI (MÉDIO)',
        hard: 'MESTRE JEDI (DIFÍCIL)',
      };
      sbDiff.textContent = diffMap[st.combatDifficulty] || 'CAVALEIRO JEDI (MÉDIO)';
    }

    this.updatePauseOverlay(st.isPaused);
  }

  private updateAudioButtons(soundOn: boolean, musicOn: boolean): void {
    const btnSound = this.container.querySelector('#tb-sound');
    if (btnSound) {
      btnSound.classList.toggle('active', soundOn);
      const lbl = btnSound.querySelector('#lbl-sound');
      if (lbl) lbl.textContent = `SFX: ${soundOn ? 'ON' : 'MUTE'}`;
    }

    const btnMusic = this.container.querySelector('#tb-music');
    if (btnMusic) {
      btnMusic.classList.toggle('active', musicOn);
      const lbl = btnMusic.querySelector('#lbl-music');
      if (lbl) lbl.textContent = `MUSIC: ${musicOn ? 'ON' : 'MUTE'}`;
    }
  }

  private updateLanguageTexts(): void {
    const dict = t();
    const appTitle = this.container.querySelector('.sw-logo-text');
    if (appTitle) appTitle.textContent = dict.appName;

    const btnNew = this.container.querySelector('#tb-new label');
    if (btnNew) btnNew.textContent = dict.toolbar.newGame;
    const btnSave = this.container.querySelector('#tb-save label');
    if (btnSave) btnSave.textContent = dict.toolbar.save;
    const btnLoad = this.container.querySelector('#tb-load label');
    if (btnLoad) btnLoad.textContent = dict.toolbar.load;
    const btnHelp = this.container.querySelector('#tb-help label');
    if (btnHelp) btnHelp.textContent = dict.toolbar.help;
    const btnOpt = this.container.querySelector('#btn-options label');
    if (btnOpt) btnOpt.textContent = dict.menus.options;

    // Refresh state
    this.renderState(this.game.state);
  }

  // --- Modal Dialog System (Star Wars Sci-Fi Holo Modals) ---

  public showModal(
    title: string,
    bodyContent: HTMLElement | string,
    buttons: Array<{ text: string; primary?: boolean; onClick: () => void }>,
    onClose?: () => void
  ): void {
    this.modalOnClose = onClose;
    this.modalContainer.innerHTML = '';
    this.modalContainer.classList.remove('hidden');

    const dlg = document.createElement('div');
    dlg.className = 'hud-dialog cut-corners-both';

    const header = document.createElement('div');
    header.className = 'dialog-header';
    header.innerHTML = `
      <span class="dialog-title"></span>
      <button class="dialog-close-btn" id="dlg-close">×</button>
    `;
    header.querySelector('.dialog-title')!.textContent = title;
    dlg.appendChild(header);

    header.querySelector('#dlg-close')?.addEventListener('click', () => {
      this.closeModal();
    });

    const body = document.createElement('div');
    body.className = 'dialog-body';
    if (typeof bodyContent === 'string') {
      body.innerHTML = `<p style="white-space: pre-wrap; font-family: var(--font-rajdhani); font-size: 14px;">${bodyContent}</p>`;
    } else {
      body.appendChild(bodyContent);
    }
    dlg.appendChild(body);

    const footer = document.createElement('div');
    footer.className = 'dialog-footer';
    buttons.forEach((b) => {
      const btn = document.createElement('button');
      btn.className = `dialog-action-btn ${b.primary ? 'primary' : ''}`;
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
    const onClose = this.modalOnClose;
    this.modalOnClose = undefined;
    onClose?.();
  }

  public showMessageModal(title: string, text: string, avatarTileId?: number, onClose?: () => void): void {
    const wrap = document.createElement('div');

    if (avatarTileId && this.game.dta) {
      const avatarRow = document.createElement('div');
      avatarRow.className = 'dialog-avatar-row';

      const cvs = document.createElement('canvas');
      cvs.width = 32;
      cvs.height = 32;
      cvs.className = 'dialog-avatar-canvas';
      const ctx = cvs.getContext('2d')!;
      const tile = this.game.dta.tiles[avatarTileId];
      if (tile) {
        ctx.drawImage(this.game.renderer.getTileCanvas(tile), 0, 0);
      }
      avatarRow.appendChild(cvs);

      const titleCol = document.createElement('div');
      titleCol.textContent = title;
      avatarRow.appendChild(titleCol);
      wrap.appendChild(avatarRow);
    }

    const p = document.createElement('p');
    p.style.fontFamily = 'var(--font-rajdhani)';
    p.style.fontSize = '14px';
    p.style.color = '#e2e8f0';
    p.style.lineHeight = '1.6';
    p.style.whiteSpace = 'pre-wrap';
    p.textContent = text;
    wrap.appendChild(p);

    this.showModal(title, wrap, [
      {
        text: 'ENTENDIDO, COMANDO',
        primary: true,
        onClick: () => {},
      },
    ],onClose);
  }

  public showDifficultyModal(): void {
    const dict = t();
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <p style="margin-bottom: 12px; font-family: var(--font-mono); color: var(--sw-yellow);">${dict.dialogs.difficultyTitle}:</p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="radio" name="hud_diff" value="easy" ${this.game.state.combatDifficulty === 'easy' ? 'checked' : ''}>
          <span>🟢 ${dict.dialogs.difficultyEasy}</span>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="radio" name="hud_diff" value="medium" ${this.game.state.combatDifficulty === 'medium' ? 'checked' : ''}>
          <span>🟡 ${dict.dialogs.difficultyMedium}</span>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="radio" name="hud_diff" value="hard" ${this.game.state.combatDifficulty === 'hard' ? 'checked' : ''}>
          <span>🔴 ${dict.dialogs.difficultyHard}</span>
        </label>
      </div>
    `;

    this.showModal(dict.menus.combatDifficulty, wrap, [
      {
        text: dict.dialogs.ok,
        primary: true,
        onClick: () => {
          const selected = wrap.querySelector<HTMLInputElement>('input[name="hud_diff"]:checked');
          if (selected) {
            this.game.state.combatDifficulty = selected.value as any;
            this.renderState(this.game.state);
            this.showToast(`Dificuldade: ${selected.value.toUpperCase()}`);
          }
        },
      },
      {
        text: dict.dialogs.cancel,
        onClick: () => {},
      },
    ]);
  }

  public showSpeedModal(): void {
    const dict = t();
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <p style="margin-bottom: 12px; font-family: var(--font-mono); color: var(--sw-yellow);">${dict.dialogs.speedTitle}:</p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="radio" name="hud_speed" value="slow" ${this.game.state.gameSpeed === 'slow' ? 'checked' : ''}>
          <span>🐢 ${dict.dialogs.speedSlow}</span>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="radio" name="hud_speed" value="normal" ${this.game.state.gameSpeed === 'normal' ? 'checked' : ''}>
          <span>⚡ ${dict.dialogs.speedNormal}</span>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="radio" name="hud_speed" value="fast" ${this.game.state.gameSpeed === 'fast' ? 'checked' : ''}>
          <span>🚀 ${dict.dialogs.speedFast}</span>
        </label>
      </div>
    `;

    this.showModal(dict.menus.gameSpeed, wrap, [
      {
        text: dict.dialogs.ok,
        primary: true,
        onClick: () => {
          const selected = wrap.querySelector<HTMLInputElement>('input[name="hud_speed"]:checked');
          if (selected) {
            this.game.state.gameSpeed = selected.value as any;
            this.renderState(this.game.state);
            this.showToast(`Velocidade: ${selected.value.toUpperCase()}`);
          }
        },
      },
      {
        text: dict.dialogs.cancel,
        onClick: () => {},
      },
    ]);
  }

  public showWorldControlModal(): void {
    const dict = t();
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <p style="margin-bottom: 12px; font-family: var(--font-mono); color: var(--sw-yellow);">${dict.dialogs.worldControlPrompt}</p>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="radio" name="hud_world" value="small" ${this.game.state.worldControl === 'small' ? 'checked' : ''}>
          <span>🪐 ${dict.dialogs.worldSmall}</span>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="radio" name="hud_world" value="medium" ${this.game.state.worldControl === 'medium' ? 'checked' : ''}>
          <span>🌌 ${dict.dialogs.worldMedium}</span>
        </label>
        <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
          <input type="radio" name="hud_world" value="large" ${this.game.state.worldControl === 'large' ? 'checked' : ''}>
          <span>✨ ${dict.dialogs.worldLarge}</span>
        </label>
      </div>
    `;

    this.showModal(dict.menus.worldControl, wrap, [
      {
        text: dict.dialogs.ok,
        primary: true,
        onClick: () => {
          const selected = wrap.querySelector<HTMLInputElement>('input[name="hud_world"]:checked');
          if (selected) {
            this.game.newWorld(selected.value as any);
            this.showToast(`Novo mundo ${selected.value.toUpperCase()} gerado!`);
          }
        },
      },
      {
        text: dict.dialogs.cancel,
        onClick: () => {},
      },
    ]);
  }

  public showStatisticsModal(): void {
    const dict = t();
    const st = this.game.state;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 10px; font-family: var(--font-mono);">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 4px;">
          <span>${dict.dialogs.lastScore}:</span>
          <span style="color: var(--sw-yellow); font-weight: bold;">${st.score}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 4px;">
          <span>${dict.dialogs.highScore}:</span>
          <span style="color: var(--sw-green); font-weight: bold;">${st.highScore}</span>
        </div>
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 4px;">
          <span>${dict.dialogs.gamesWon}:</span>
          <span style="color: var(--sw-cyan); font-weight: bold;">${st.gamesWon}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span>${dict.dialogs.gamesLost}:</span>
          <span style="color: var(--sw-red); font-weight: bold;">${st.gamesLost}</span>
        </div>
      </div>
    `;

    this.showModal(dict.dialogs.statsTitle, wrap, [
      {
        text: dict.dialogs.close,
        primary: true,
        onClick: () => {},
      },
    ]);
  }

  public showHelpModal(): void {
    const dict = t();
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div style="space-y: 12px; font-size: 13px; line-height: 1.6;">
        <p><strong style="color: var(--sw-yellow);">Objetivo da Missão:</strong> Desembarque em Dagobah com a X-Wing danificada. Localize a cabana do Mestre Yoda utilizando o radar holográfico e restaure a Força.</p>
        <div style="background: rgba(0,0,0,0.4); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,232,31,0.25); margin: 10px 0; font-family: var(--font-mono); font-size: 11px;">
          <p style="color: var(--sw-yellow); font-weight: bold;">COMANDOS:</p>
          <p>• [W, A, S, D] ou [Setas]: Mover Luke pelo pântano</p>
          <p>• [Espaço]: Brandir o Sabre de Luz / Disparar Blaster</p>
          <p>• [Enter / U]: Usar item equipado (Medkit, Radar)</p>
          <p>• [1 a 4]: Acessar slots rápidos de inventário</p>
          <p>• [P]: Pausar / Retomar missão</p>
          <p>• [M]: Alternar áudio e efeitos sonoros</p>
        </div>
        <p style="font-size: 11px; color: #94a3b8;">Port Web moderno com suporte a WebAssembly, Canvas 2D, Web Audio API e controles táteis para dispositivos móveis.</p>
      </div>
    `;

    this.showModal(dict.dialogs.helpTitle, wrap, [
      {
        text: 'ENTENDIDO, COMANDO',
        primary: true,
        onClick: () => {},
      },
    ]);
  }
}
