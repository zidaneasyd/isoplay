import { PLANE } from "./config.js";
import { getTileElevation, getTileElevationPixels } from "./elevation.js";

function resolvePlane(plane) {
  return plane && Number.isFinite(plane.rows) && Number.isFinite(plane.columns) &&
    Number.isFinite(plane.tileWidth) && Number.isFinite(plane.tileHeight) ? plane : PLANE;
}

/** True only for an integer row/column that belongs to the supplied plane. */
export function isTileInRange(row, column, plane = PLANE) {
  const config = resolvePlane(plane);
  return Number.isInteger(row) && Number.isInteger(column) &&
    row >= 0 && row < config.rows && column >= 0 && column < config.columns;
}

export function tileCenter(row, column, plane = PLANE) {
  const config = resolvePlane(plane);
  if (!isTileInRange(row, column, config)) return null;
  const halfWidth = config.tileWidth / 2;
  const halfHeight = config.tileHeight / 2;
  return {
    x: (column - row) * halfWidth,
    y: (column + row) * halfHeight + halfHeight,
  };
}

/** Convert plane-local coordinates to a tile index. */
export function hitTestTile(planeX, planeY, plane = PLANE) {
  const config = resolvePlane(plane);
  if (!Number.isFinite(planeX) || !Number.isFinite(planeY)) return null;

  const halfWidth = config.tileWidth / 2;
  const halfHeight = config.tileHeight / 2;
  const normalizedX = planeX / halfWidth;
  const normalizedY = (planeY - halfHeight) / halfHeight;
  const columnCoordinate = (normalizedX + normalizedY) / 2;
  const rowCoordinate = (normalizedY - normalizedX) / 2;
  const tolerance = (1 + 1 / halfWidth) / 2;
  const candidatePadding = 1e-7;
  const candidateTolerance = tolerance + candidatePadding;

  const firstRow = Math.max(0, Math.ceil(rowCoordinate - candidateTolerance));
  const lastRow = Math.min(config.rows - 1, Math.floor(rowCoordinate + candidateTolerance));
  const firstColumn = Math.max(0, Math.ceil(columnCoordinate - candidateTolerance));
  const lastColumn = Math.min(config.columns - 1, Math.floor(columnCoordinate + candidateTolerance));

  // Preserve the original row-major tie-break for shared edges/corners.
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

function tileSidePolygons(row, column, level, elevations, plane) {
  const halfWidth = plane.tileWidth / 2;
  const halfHeight = plane.tileHeight / 2;
  const x = (column - row) * halfWidth;
  const y = (column + row) * halfHeight;
  const currentHeight = getTileElevationPixels(level);
  const west = { x: x - halfWidth, y: y + halfHeight };
  const east = { x: x + halfWidth, y: y + halfHeight };
  const south = { x, y: y + plane.tileHeight };
  const westNeighbor = row + 1 < plane.rows
    ? getTileElevation(elevations, { row: row + 1, column }, plane) : 0;
  const eastNeighbor = column + 1 < plane.columns
    ? getTileElevation(elevations, { row, column: column + 1 }, plane) : 0;
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

/** Hit-test elevated top faces and side faces before the base plane. */
export function hitTestTileAtElevations(planeX, planeY, elevations, plane = PLANE) {
  const config = resolvePlane(plane);
  if (!Number.isFinite(planeX) || !Number.isFinite(planeY)) return null;
  if (!(elevations instanceof Map) || elevations.size === 0) return hitTestTile(planeX, planeY, config);

  const halfWidth = config.tileWidth / 2;
  const halfHeight = config.tileHeight / 2;
  for (let diagonal = config.rows + config.columns - 2; diagonal >= 0; diagonal--) {
    for (let row = Math.min(config.rows - 1, diagonal); row >= 0; row--) {
      const column = diagonal - row;
      if (column < 0 || column >= config.columns) continue;
      const tile = { row, column };
      const level = getTileElevation(elevations, tile, config);
      if (level === 0) continue;

      const center = tileCenter(row, column, config);
      const topY = center.y - getTileElevationPixels(level);
      const distance = Math.abs(planeX - center.x) / halfWidth + Math.abs(planeY - topY) / halfHeight;
      if (distance <= 1 + 1 / halfWidth) return tile;

      for (const polygon of tileSidePolygons(row, column, level, elevations, config)) {
        if (pointInPolygon(planeX, planeY, polygon)) return tile;
      }
    }
  }
  return hitTestTile(planeX, planeY, config);
}

export function toggleActiveTile(current, tile, plane = PLANE) {
  if (!tile || !isTileInRange(tile.row, tile.column, plane)) return current;
  if (current?.row === tile.row && current?.column === tile.column) return null;
  return { row: tile.row, column: tile.column };
}
