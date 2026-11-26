import { ELEVATION_STEP_PX, PLANE } from "./config.js";

function isValidTile(tile) {
  return tile && Number.isInteger(tile.row) && Number.isInteger(tile.column) &&
    tile.row >= 0 && tile.row < PLANE.rows && tile.column >= 0 && tile.column < PLANE.columns;
}

export function normalizeElevationLevel(level) {
  if (!Number.isFinite(level)) return 0;
  return Math.max(0, Math.floor(level));
}

export function elevationKey(row, column) {
  return `${row},${column}`;
}

export function getTileElevation(elevations, tile) {
  if (!isValidTile(tile) || !(elevations instanceof Map)) return 0;
  return normalizeElevationLevel(elevations.get(elevationKey(tile.row, tile.column)) ?? 0);
}

export function setTileElevation(elevations, tile, level) {
  if (!(elevations instanceof Map) || !isValidTile(tile)) return 0;
  const normalized = normalizeElevationLevel(level);
  const key = elevationKey(tile.row, tile.column);
  if (normalized === 0) elevations.delete(key);
  else elevations.set(key, normalized);
  return normalized;
}

export function getMaximumElevationLevel(elevations) {
  if (!(elevations instanceof Map) || elevations.size === 0) return 0;
  let maximum = 0;
  for (const value of elevations.values()) maximum = Math.max(maximum, normalizeElevationLevel(value));
  return maximum;
}

export function getTileElevationPixels(level) {
  return normalizeElevationLevel(level) * ELEVATION_STEP_PX;
}

export function getMaximumElevationPixels(elevations) {
  return getMaximumElevationLevel(elevations) * ELEVATION_STEP_PX;
}
