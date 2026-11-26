import { PLANE } from "./config.js";

const halfWidth = PLANE.tileWidth / 2;
const halfHeight = PLANE.tileHeight / 2;

/** True only for an integer row/column that belongs to the plane. */
export function isTileInRange(row, column) {
  return Number.isInteger(row) && Number.isInteger(column) &&
    row >= 0 && row < PLANE.rows && column >= 0 && column < PLANE.columns;
}

export function tileCenter(row, column) {
  if (!isTileInRange(row, column)) return null;

  return {
    x: (column - row) * halfWidth,
    y: (column + row) * halfHeight + halfHeight,
  };
}

/** Convert plane-local coordinates to a tile index. */
export function hitTestTile(planeX, planeY) {
  if (!Number.isFinite(planeX) || !Number.isFinite(planeY)) return null;

  // In isometric (column,row) coordinates, the original diamond distance
  // |dx|/halfWidth + |dy|/halfHeight equals twice the Chebyshev distance.
  // That bounds each candidate axis to a tiny interval (at most two values),
  // avoiding a full scan of all 144 tiles on every pointer move.
  const normalizedX = planeX / halfWidth;
  const normalizedY = (planeY - halfHeight) / halfHeight;
  const columnCoordinate = (normalizedX + normalizedY) / 2;
  const rowCoordinate = (normalizedY - normalizedX) / 2;
  const tolerance = (1 + 1 / halfWidth) / 2;
  // Candidate padding only protects interval rounding; final acceptance uses
  // the legacy diamond-distance expression below to preserve edge semantics.
  const candidatePadding = 1e-7;
  const candidateTolerance = tolerance + candidatePadding;

  const firstRow = Math.max(0, Math.ceil(rowCoordinate - candidateTolerance));
  const lastRow = Math.min(PLANE.rows - 1, Math.floor(rowCoordinate + candidateTolerance));
  const firstColumn = Math.max(0, Math.ceil(columnCoordinate - candidateTolerance));
  const lastColumn = Math.min(PLANE.columns - 1, Math.floor(columnCoordinate + candidateTolerance));

  // Keep row-major ordering identical to the former exhaustive scan when
  // adjacent tiles both accept a shared edge because of the small tolerance.
  for (let row = firstRow; row <= lastRow; row++) {
    for (let column = firstColumn; column <= lastColumn; column++) {
      const centerX = (column - row) * halfWidth;
      const centerY = (column + row) * halfHeight + halfHeight;
      const distance = Math.abs(planeX - centerX) / halfWidth +
        Math.abs(planeY - centerY) / halfHeight;
      if (distance <= 1 + 1 / halfWidth) return { row, column };
    }
  }
  return null;
}

export function toggleActiveTile(current, tile) {
  if (!tile || !isTileInRange(tile.row, tile.column)) return current;
  if (current?.row === tile.row && current?.column === tile.column) return null;
  return { row: tile.row, column: tile.column };
}
