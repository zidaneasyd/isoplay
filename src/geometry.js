import { PLANE } from "./config.js";
import { getTileElevation, getTileElevationPixels } from "./elevation.js";

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

function pointInPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    const crosses = (a.y > y) !== (b.y > y) &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function tileSidePolygons(row, column, level, elevations) {
  const x = (column - row) * halfWidth;
  const y = (column + row) * halfHeight;
  const currentHeight = getTileElevationPixels(level);
  const west = { x: x - halfWidth, y: y + halfHeight };
  const east = { x: x + halfWidth, y: y + halfHeight };
  const south = { x, y: y + PLANE.tileHeight };
  const westNeighbor = row + 1 < PLANE.rows
    ? getTileElevation(elevations, { row: row + 1, column }) : 0;
  const eastNeighbor = column + 1 < PLANE.columns
    ? getTileElevation(elevations, { row, column: column + 1 }) : 0;
  const polygons = [];

  if (level > westNeighbor) {
    const lower = getTileElevationPixels(westNeighbor);
    polygons.push([
      { x: west.x, y: west.y - currentHeight },
      { x: south.x, y: south.y - currentHeight },
      { x: south.x, y: south.y - lower },
      { x: west.x, y: west.y - lower },
    ]);
  }
  if (level > eastNeighbor) {
    const lower = getTileElevationPixels(eastNeighbor);
    polygons.push([
      { x: south.x, y: south.y - currentHeight },
      { x: east.x, y: east.y - currentHeight },
      { x: east.x, y: east.y - lower },
      { x: south.x, y: south.y - lower },
    ]);
  }
  return polygons;
}

/** Hit-test elevated top faces and their two visible side faces before the base plane. */
export function hitTestTileAtElevations(planeX, planeY, elevations) {
  if (!Number.isFinite(planeX) || !Number.isFinite(planeY)) return null;
  if (!(elevations instanceof Map) || elevations.size === 0) return hitTestTile(planeX, planeY);

  // Reverse the render painter order so the visually front-most elevated tile wins.
  for (let diagonal = PLANE.rows + PLANE.columns - 2; diagonal >= 0; diagonal--) {
    for (let row = Math.min(PLANE.rows - 1, diagonal); row >= 0; row--) {
      const column = diagonal - row;
      if (column < 0 || column >= PLANE.columns) continue;
      const tile = { row, column };
      const level = getTileElevation(elevations, tile);
      if (level === 0) continue;

      const center = tileCenter(row, column);
      const topY = center.y - getTileElevationPixels(level);
      const distance = Math.abs(planeX - center.x) / halfWidth +
        Math.abs(planeY - topY) / halfHeight;
      if (distance <= 1 + 1 / halfWidth) return tile;

      for (const polygon of tileSidePolygons(row, column, level, elevations)) {
        if (pointInPolygon(planeX, planeY, polygon)) return tile;
      }
    }
  }

  return hitTestTile(planeX, planeY);
}

export function toggleActiveTile(current, tile) {
  if (!tile || !isTileInRange(tile.row, tile.column)) return current;
  if (current?.row === tile.row && current?.column === tile.column) return null;
  return { row: tile.row, column: tile.column };
}
