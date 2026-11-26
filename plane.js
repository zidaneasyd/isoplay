// Public entry point retained for existing imports and external test harnesses.
export { PLANE, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM, ELEVATION_STEP_PX, MIN_GRID_SIZE, MAX_GRID_SIZE, GRID_SIZE_STEP, normalizeGridSize, createPlaneConfig } from "./src/config.js";
export { isTileInRange, tileCenter, hitTestTile, hitTestTileAtElevations, toggleActiveTile } from "./src/geometry.js";
export {
  normalizeElevationLevel,
  elevationKey,
  getTileElevation,
  setTileElevation,
  getMaximumElevationLevel,
  getTileElevationPixels,
  getMaximumElevationPixels,
} from "./src/elevation.js";
export { drawPlane } from "./src/render.js";
export { initializePlane } from "./src/interaction.js";
export {
  clampZoom,
  normalizeWheelDelta,
  zoomLevelForWheel,
  panToKeepZoomFocus,
  zoomFocusFromRect,
} from "./src/zoom.js";
