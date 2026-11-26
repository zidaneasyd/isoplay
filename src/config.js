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

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const DEFAULT_ZOOM = 1;
