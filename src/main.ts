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

  // Render initial loading screen so canvas is never a blank black screen
  const ctx = gameWindow.ctx;
  ctx.fillStyle = '#000080';
  ctx.fillRect(0, 0, 288, 288);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 15px "MS Sans Serif", Tahoma, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Star Wars: Yoda Stories', 144, 120);
  ctx.font = '12px "MS Sans Serif", Tahoma, sans-serif';
  ctx.fillStyle = '#ffff00';
  ctx.fillText('Loading adventure assets...', 144, 150);

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

  // Movement ticker
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
      moveCooldown = 8;
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
    console.log('Loading Yoda Stories yodesk.dta...');
    await game.init();
    console.log('Game initialized successfully!');
    requestAnimationFrame(gameLoop);
  } catch (err: any) {
    console.error('Failed to load yodesk.dta:', err);
    ctx.fillStyle = '#800000';
    ctx.fillRect(0, 0, 288, 288);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "MS Sans Serif", Tahoma, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Error loading assets', 144, 120);
    ctx.font = '10px "MS Sans Serif", Tahoma, sans-serif';
    ctx.fillText(String(err?.message || err), 144, 150);
  }
}

window.addEventListener('DOMContentLoaded', bootstrap);
