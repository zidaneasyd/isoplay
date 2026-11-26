export const PLANE = Object.freeze({
  columns: 12,
  rows: 12,
  tileWidth: 64,
  tileHeight: 32,
  width: 768,
  height: 384,
  colors: Object.freeze({
    background: "#141414",
    tile: "#383838",
    grid: "#484848",
    active: "#6f5a93",
    activeStroke: "#9a86bd",
    hover: "#8f7438",
    hoverStroke: "#c3a85f",
  }),
});

export const MIN_GRID_SIZE = 12;
export const MAX_GRID_SIZE = 64;
export const GRID_SIZE_STEP = 2;

export function normalizeGridSize(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return PLANE.columns;
  const bounded = Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, Math.round(numeric)));
  const stepped = Math.round((bounded - MIN_GRID_SIZE) / GRID_SIZE_STEP) * GRID_SIZE_STEP + MIN_GRID_SIZE;
  return Math.max(MIN_GRID_SIZE, Math.min(MAX_GRID_SIZE, stepped));
}

export function createPlaneConfig(size = PLANE.columns) {
  const gridSize = normalizeGridSize(size);
  return {
    ...PLANE,
    columns: gridSize,
    rows: gridSize,
    width: gridSize * PLANE.tileWidth,
    height: gridSize * PLANE.tileHeight,
  };
}

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1;
export const ELEVATION_STEP_PX = 8;
