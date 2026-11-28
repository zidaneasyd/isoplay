import { createCanvas } from "./canvas.js";
import { attachCameraControls, createCamera } from "./camera.js?v=camera-1";
import { createRenderScheduler } from "./animation.js";
import { preventBrowserZoom } from "./browser-controls.js";
import { drawGrid, drawTile, drawTiles, getVisibleTileBounds, isTileInBounds } from "./renderer.js";
import { gridToScreen, tileH } from "./isometric.js";
import { createInspector } from "./inspector.js?v=camera-1";
import { createGridTiles } from "./grid-model.js";
import { createSelectionModel } from "./selection-model.js";
import { attachTileInteraction } from "./tile-interaction.js?v=camera-1";
import { createTileInfoPanel } from "./tile-info-panel.js";
import { createSandbox } from "./sandbox.js";

const canvas = document.getElementById("canvas");
const { context, getSize, resize } = createCanvas(canvas);
const sizeInput = document.getElementById("grid-size");
const sizeValue = document.getElementById("grid-size-value");
const axesInput = document.getElementById("show-axes");
const gridInput = document.getElementById("show-grid");
const multiSelectInput = document.getElementById("multi-select");
const sandboxModeInput = document.getElementById("sandbox-mode");
const inspector = createInspector(sizeInput, sizeValue, axesInput, gridInput, multiSelectInput);
const selection = createSelectionModel();
const panel = createTileInfoPanel(
  document.getElementById("hover-coordinates"),
  document.getElementById("active-coordinates")
);
const renderStats = {
  tiles: document.getElementById("rendered-tiles"),
  gridCells: document.getElementById("rendered-grid-cells"),
  fps: document.getElementById("render-fps"),
  time: document.getElementById("render-time"),
};
const camera = createCamera();
const sandbox = createSandbox();
let requestRender = () => {};
const interaction = attachTileInteraction(canvas, {
  getCanvasSize: getSize,
  getGridSize: inspector.getGridSize,
  camera,
  getMultiSelect: inspector.getMultiSelect,
  selection,
  onHover(tile) {
    panel.showHover(tile);
    requestRender();
  },
  onSelectionChange(tiles) {
    panel.showActive(tiles);
    requestRender();
  },
});

function updateSelectionMode() {
  canvas.style.cursor = inspector.getMultiSelect() ? "crosshair" : "";
  if (!inspector.getMultiSelect()) {
    selection.clear();
    panel.showActive(selection.getTiles());
  }
  requestRender();
}

multiSelectInput?.addEventListener("change", updateSelectionMode);
canvas.style.cursor = inspector.getMultiSelect() ? "crosshair" : "";

attachCameraControls(canvas, {
  camera,
  getCanvasSize: getSize,
  onChange() {
    interaction.refreshHover();
    requestRender();
  },
  getDefaultCursor: () => inspector.getMultiSelect() ? "crosshair" : "",
});

let cachedGridSize = null;
let gridTiles = [];
let fpsElapsed = 0;
let fpsFrames = 0;
let measuredFps = null;
function renderFrame(dt) {
  if (sandbox.isActive()) sandbox.update(dt);
  const renderStartedAt = performance.now();
  const { width, height } = getSize();
  const gridSize = inspector.getGridSize();
  const showGrid = inspector.getShowGrid();
  const visibleBounds = getVisibleTileBounds(camera, width, height);
  const strokeScale = 1 / camera.getState().zoom;
  if (gridSize !== cachedGridSize) {
    cachedGridSize = gridSize;
    gridTiles = createGridTiles(gridSize);
  }
  if (selection.retainWithinGrid(gridSize)) panel.showActive(selection.getTiles());

  context.clearRect(0, 0, width, height);
  context.save();
  camera.applyToContext(context, width, height);
  let renderedTiles = drawTiles(context, width, height, gridTiles, {
    alreadySorted: true,
    bounds: visibleBounds,
    strokeColor: showGrid ? "#484848" : null,
    strokeWidth: strokeScale,
  });
  const renderedGridCells = showGrid ? renderedTiles : 0;
  drawGrid(context, width, height, gridSize, gridSize, {
    showAxes: inspector.getShowAxes(),
    showGrid: false,
    strokeScale,
    bounds: visibleBounds,
  });

  const hoveredTile = interaction.getHoveredTile();
  if (hoveredTile) {
    const position = gridToScreen(hoveredTile.col, hoveredTile.row);
    drawTile(
      context,
      width / 2 + position.x,
      height / 2 + position.y - hoveredTile.height * tileH / 2,
      "rgba(189, 121, 82, 0.5)",
      "rgba(255, 184, 138, 0.5)",
      2 * strokeScale
    );
    renderedTiles += 1;
  }

  for (const tile of selection.getTiles()) {
    if (!isTileInBounds(tile, visibleBounds)) continue;
    const position = gridToScreen(tile.col, tile.row);
    drawTile(
      context,
      width / 2 + position.x,
      height / 2 + position.y - tile.height * tileH / 2,
      "rgba(153, 132, 194, 0.5)",
      "rgba(211, 198, 255, 0.5)",
      2 * strokeScale
    );
    renderedTiles += 1;
  }
  context.restore();

  const renderDuration = performance.now() - renderStartedAt;
  if (dt > 0) {
    fpsElapsed += dt;
    fpsFrames += 1;
    if (fpsElapsed >= 0.5) {
      measuredFps = Math.round(fpsFrames / fpsElapsed);
      fpsElapsed = 0;
      fpsFrames = 0;
    }
  }
  if (renderStats.tiles) renderStats.tiles.textContent = String(renderedTiles);
  if (renderStats.gridCells) renderStats.gridCells.textContent = String(renderedGridCells);
  if (renderStats.fps) renderStats.fps.textContent = measuredFps === null ? "—" : String(measuredFps);
  if (renderStats.time) renderStats.time.textContent = `${renderDuration.toFixed(2)} ms`;
}

const scheduler = createRenderScheduler(renderFrame);
requestRender = scheduler.invalidate;
function updateExecutionMode() {
  if (sandboxModeInput?.checked) {
    sandbox.start();
    scheduler.setContinuous(true);
  } else {
    sandbox.stop();
    scheduler.setContinuous(false);
    requestRender();
  }
}

sandboxModeInput?.addEventListener("change", updateExecutionMode);
sizeInput.addEventListener("input", requestRender);
sizeInput.addEventListener("change", requestRender);
axesInput?.addEventListener("change", requestRender);
gridInput?.addEventListener("change", requestRender);

function resizeCanvas() {
  resize();
  interaction.refreshHover();
  requestRender();
}

preventBrowserZoom();
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", resizeCanvas);
window.addEventListener("focus", requestRender);
window.addEventListener("pageshow", requestRender);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) requestRender();
});
canvas.addEventListener("contextrestored", requestRender);
resizeCanvas();
