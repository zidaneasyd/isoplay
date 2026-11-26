import { PLANE } from "./config.js";

const halfWidth = PLANE.tileWidth / 2;
const halfHeight = PLANE.tileHeight / 2;

export function tileCenter(row, column) {
  if (!Number.isInteger(row) || !Number.isInteger(column) ||
      row < 0 || row >= PLANE.rows || column < 0 || column >= PLANE.columns) {
    return null;
  }

  return {
    x: (column - row) * halfWidth,
    y: (column + row) * halfHeight + halfHeight,
  };
}

/** Convert plane-local coordinates to a tile index. */
export function hitTestTile(planeX, planeY) {
  if (!Number.isFinite(planeX) || !Number.isFinite(planeY)) return null;

  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      const center = tileCenter(row, column);
      const distance = Math.abs(planeX - center.x) / halfWidth +
        Math.abs(planeY - center.y) / halfHeight;
      // A small tolerance avoids hairline gaps caused by pointer rounding.
      if (distance <= 1 + 1 / halfWidth) return { row, column };
    }
  }
  return null;
}

export function toggleActiveTile(current, tile) {
  if (!tile) return current;
  if (current?.row === tile.row && current?.column === tile.column) return null;
  return { row: tile.row, column: tile.column };
}
