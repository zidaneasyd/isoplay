// Public entry point retained for existing imports and external test harnesses.
export { PLANE, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM } from "./src/config.js";
export { isTileInRange, tileCenter, hitTestTile, toggleActiveTile } from "./src/geometry.js";
export { drawPlane } from "./src/render.js";
export { initializePlane } from "./src/interaction.js";
export {
  clampZoom,
  normalizeWheelDelta,
  zoomLevelForWheel,
  panToKeepZoomFocus,
  zoomFocusFromRect,
} from "./src/zoom.js";
