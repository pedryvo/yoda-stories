import { Tile, Zone } from '../dta/types';
import { YODA_PALETTE_RGBA } from './palette';

export const TILE_SIZE = 32;
export const VIEW_TILES_X = 9;
export const VIEW_TILES_Y = 9;
export const CANVAS_WIDTH = VIEW_TILES_X * TILE_SIZE; // 288 px
export const CANVAS_HEIGHT = VIEW_TILES_Y * TILE_SIZE; // 288 px

export class TileRenderer {
  private tileCache: Map<number, HTMLCanvasElement> = new Map();
  private scratchCanvas: HTMLCanvasElement;
  private scratchCtx: CanvasRenderingContext2D;

  constructor() {
    this.scratchCanvas = document.createElement('canvas');
    this.scratchCanvas.width = CANVAS_WIDTH;
    this.scratchCanvas.height = CANVAS_HEIGHT;
    this.scratchCtx = this.scratchCanvas.getContext('2d', { willReadFrequently: true })!;
  }

  getTileCanvas(tile: Tile): HTMLCanvasElement {
    const cached = this.tileCache.get(tile.id);
    if (cached) return cached;

    const c = document.createElement('canvas');
    c.width = TILE_SIZE;
    c.height = TILE_SIZE;
    const ctx = c.getContext('2d')!;
    const imgData = ctx.createImageData(TILE_SIZE, TILE_SIZE);
    const buf32 = new Uint32Array(imgData.data.buffer);

    for (let i = 0; i < 1024; i++) {
      const palIdx = tile.pixels[i];
      buf32[i] = YODA_PALETTE_RGBA[palIdx];
    }
    ctx.putImageData(imgData, 0, 0);
    this.tileCache.set(tile.id, c);
    return c;
  }

  renderZone(
    targetCtx: CanvasRenderingContext2D,
    zone: Zone,
    cameraTileX: number,
    cameraTileY: number,
    tiles: Tile[],
    heroTileId: number,
    heroX: number,
    heroY: number,
    isAttacking: boolean = false,
    weaponTileId: number = -1
  ): void {
    targetCtx.imageSmoothingEnabled = false;
    targetCtx.fillStyle = '#000000';
    targetCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Helper to get tile from zone coordinates (tiles stored interleaved: layer 0, 1, 2)
    const getZoneTileId = (x: number, y: number, layer: number): number => {
      if (x < 0 || x >= zone.width || y < 0 || y >= zone.height) return -1;
      const idx = (y * zone.width + x) * 3 + layer;
      return zone.tileIDs[idx] ?? -1;
    };

    // Layer 0: Floor / Ground (drawn first as base terrain)
    for (let vy = 0; vy < VIEW_TILES_Y; vy++) {
      for (let vx = 0; vx < VIEW_TILES_X; vx++) {
        const zx = cameraTileX + vx;
        const zy = cameraTileY + vy;
        const tileId = getZoneTileId(zx, zy, 0);
        // -1 is empty; tile zero is a valid black tile.
        if (tileId >= 0 && tileId < tiles.length) {
          const tile = tiles[tileId];
          targetCtx.drawImage(this.getTileCanvas(tile), vx * TILE_SIZE, vy * TILE_SIZE);
        }
      }
    }

    // Layer 1: Objects & Monsters
    for (let vy = 0; vy < VIEW_TILES_Y; vy++) {
      for (let vx = 0; vx < VIEW_TILES_X; vx++) {
        const zx = cameraTileX + vx;
        const zy = cameraTileY + vy;
        const tileId = getZoneTileId(zx, zy, 1);
        if (tileId >= 0 && tileId < tiles.length) {
          const tile = tiles[tileId];
          targetCtx.drawImage(this.getTileCanvas(tile), vx * TILE_SIZE, vy * TILE_SIZE);
        }
      }
    }

    // Render Hero on Layer 1
    const heroScreenX = (heroX - cameraTileX) * TILE_SIZE;
    const heroScreenY = (heroY - cameraTileY) * TILE_SIZE;

    if (
      heroScreenX >= -TILE_SIZE &&
      heroScreenX <= CANVAS_WIDTH &&
      heroScreenY >= -TILE_SIZE &&
      heroScreenY <= CANVAS_HEIGHT
    ) {
      if (heroTileId > 0 && heroTileId < tiles.length) {
        targetCtx.drawImage(this.getTileCanvas(tiles[heroTileId]), heroScreenX, heroScreenY);
      }
      // Render attack weapon swing effect if attacking
      if (isAttacking && weaponTileId > 0 && weaponTileId < tiles.length) {
        targetCtx.drawImage(this.getTileCanvas(tiles[weaponTileId]), heroScreenX, heroScreenY);
      }
    }

    // Layer 2: Overhead Roofs / Tree Canopies (drawn on top of Hero)
    for (let vy = 0; vy < VIEW_TILES_Y; vy++) {
      for (let vx = 0; vx < VIEW_TILES_X; vx++) {
        const zx = cameraTileX + vx;
        const zy = cameraTileY + vy;
        const tileId = getZoneTileId(zx, zy, 2);
        if (tileId >= 0 && tileId < tiles.length) {
          const tile = tiles[tileId];
          targetCtx.drawImage(this.getTileCanvas(tile), vx * TILE_SIZE, vy * TILE_SIZE);
        }
      }
    }
  }

  renderStartupImage(targetCtx: CanvasRenderingContext2D, startupImage: Uint8Array): void {
    targetCtx.imageSmoothingEnabled = false;
    const imgData = targetCtx.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);
    const buf32 = new Uint32Array(imgData.data.buffer);
    for (let i = 0; i < CANVAS_WIDTH * CANVAS_HEIGHT; i++) {
      const palIdx = startupImage[i];
      buf32[i] = YODA_PALETTE_RGBA[palIdx] || 0xff000000;
    }
    targetCtx.putImageData(imgData, 0, 0);
  }
}
