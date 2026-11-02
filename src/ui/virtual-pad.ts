import { YodaGame } from '../engine/game';
import { t } from '../i18n';

export class VirtualPad {
  private game: YodaGame;
  private container: HTMLElement;
  private moveInterval: number | null = null;

  constructor(game: YodaGame, root: HTMLElement) {
    this.game = game;

    this.container = document.createElement('div');
    this.container.className = 'virtual-controls-container';
    this.container.innerHTML = `
      <!-- Virtual D-Pad (Game Boy Style Cross) -->
      <div class="virtual-dpad gb-dpad">
        <div class="gb-dpad-cross">
          <button class="dpad-btn dpad-up" data-dir="up" aria-label="Up">▲</button>
          <button class="dpad-btn dpad-left" data-dir="left" aria-label="Left">◀</button>
          <div class="dpad-center" aria-hidden="true"></div>
          <button class="dpad-btn dpad-right" data-dir="right" aria-label="Right">▶</button>
          <button class="dpad-btn dpad-down" data-dir="down" aria-label="Down">▼</button>
        </div>
      </div>

      <!-- Action Buttons (Game Boy Angled B & A) -->
      <div class="virtual-actions gb-actions">
        <div class="gb-action-wrap">
          <button class="action-btn btn-action-use" id="vbtn-use" title="${t().mobile.use}">
            <span class="action-icon">🎒</span>
          </button>
          <span class="gb-btn-letter">B</span>
        </div>
        <div class="gb-action-wrap">
          <button class="action-btn btn-action-attack" id="vbtn-attack" title="${t().mobile.attack}">
            <span class="action-icon">⚔️</span>
          </button>
          <span class="gb-btn-letter">A</span>
        </div>
      </div>
    `;

    root.appendChild(this.container);
    this.setupTouchListeners();
  }

  private setupTouchListeners(): void {
    const bindMove = (btn: HTMLElement, dx: number, dy: number) => {
      const start = (e: Event) => {
        e.preventDefault();
        this.game.audio.initOnGesture();
        this.game.moveHero(dx, dy);
        if (this.moveInterval) clearInterval(this.moveInterval);
        this.moveInterval = window.setInterval(() => {
          this.game.moveHero(dx, dy);
        }, 140);
      };

      const stop = (e: Event) => {
        e.preventDefault();
        if (this.moveInterval) {
          clearInterval(this.moveInterval);
          this.moveInterval = null;
        }
      };

      btn.addEventListener('touchstart', start, { passive: false });
      btn.addEventListener('touchend', stop, { passive: false });
      btn.addEventListener('touchcancel', stop, { passive: false });
      btn.addEventListener('mousedown', start);
      btn.addEventListener('mouseup', stop);
      btn.addEventListener('mouseleave', stop);
    };

    const btnUp = this.container.querySelector<HTMLElement>('.dpad-up')!;
    const btnDown = this.container.querySelector<HTMLElement>('.dpad-down')!;
    const btnLeft = this.container.querySelector<HTMLElement>('.dpad-left')!;
    const btnRight = this.container.querySelector<HTMLElement>('.dpad-right')!;

    bindMove(btnUp, 0, -1);
    bindMove(btnDown, 0, 1);
    bindMove(btnLeft, -1, 0);
    bindMove(btnRight, 1, 0);

    // Attack button
    const btnAttack = this.container.querySelector<HTMLElement>('#vbtn-attack')!;
    btnAttack.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.game.audio.initOnGesture();
      this.game.attack();
    }, { passive: false });
    btnAttack.addEventListener('click', () => {
      this.game.attack();
    });

    // Use Item button
    const btnUse = this.container.querySelector<HTMLElement>('#vbtn-use')!;
    btnUse.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.game.audio.initOnGesture();
      this.game.useEquippedItem();
    }, { passive: false });
    btnUse.addEventListener('click', () => {
      this.game.useEquippedItem();
    });
  }
}
