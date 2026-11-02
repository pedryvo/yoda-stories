import './style.css';
import { YodaGame } from './engine/game';
import { GameWindow } from './ui/window';
import { VirtualPad } from './ui/virtual-pad';

async function bootstrap() {
  const root = document.getElementById('app');
  if (!root) throw new Error('Root element #app not found');

  const game = new YodaGame();
  const gameWindow = new GameWindow(game, root);
  new VirtualPad(game, root);

  // Keyboard Event Handling
  const keysPressed: Record<string, boolean> = {};

  window.addEventListener('keydown', (e) => {
    // Shortcuts with Ctrl
    if (e.ctrlKey) {
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        game.newWorld();
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        game.saveWorld();
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        game.loadWorld();
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        game.audio.toggleSound();
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        game.audio.toggleMusic();
        return;
      }
    }

    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      game.togglePause();
      return;
    }

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      game.attack();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      game.useEquippedItem();
      return;
    }

    keysPressed[e.key] = true;
  });

  window.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
  });

  // Movement ticker (fixed rate for fluid retro movement)
  let moveCooldown = 0;
  function handleMovementInput() {
    if (moveCooldown > 0) {
      moveCooldown--;
      return;
    }

    let dx = 0;
    let dy = 0;

    if (keysPressed['ArrowUp'] || keysPressed['w'] || keysPressed['W']) {
      dy -= 1;
    } else if (keysPressed['ArrowDown'] || keysPressed['s'] || keysPressed['S']) {
      dy += 1;
    } else if (keysPressed['ArrowLeft'] || keysPressed['a'] || keysPressed['A']) {
      dx -= 1;
    } else if (keysPressed['ArrowRight'] || keysPressed['d'] || keysPressed['D']) {
      dx += 1;
    }

    if (dx !== 0 || dy !== 0) {
      game.moveHero(dx, dy);
      moveCooldown = 9; // smooth movement step delay
    }
  }

  // Main 60 FPS Game Loop
  function gameLoop() {
    handleMovementInput();
    game.update();
    game.render(gameWindow.ctx);
    requestAnimationFrame(gameLoop);
  }

  try {
    console.log('Loading Yoda Stories...');
    await game.init();
    console.log('Game initialized successfully!');
  } catch (err) {
    console.error('Failed to load assets, starting in standalone mode:', err);
    gameWindow.showMessageModal('Notice', 'Loading assets from public storage...');
  }

  // Start the RAF render loop
  requestAnimationFrame(gameLoop);
}

window.addEventListener('DOMContentLoaded', bootstrap);
