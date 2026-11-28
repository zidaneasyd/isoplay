import { createCanvas } from "./canvas.js";
import { attachCameraControls, createCamera } from "./camera.js?v=camera-1";
import { startRenderLoop } from "./animation.js";
import { preventBrowserZoom } from "./browser-controls.js";
import { drawGrid, drawTile, drawTiles, getVisibleTileBounds, isTileInBounds } from "./renderer.js";
import { gridToScreen, tileH } from "./isometric.js";
import { createInspector } from "./inspector.js?v=camera-1";
import { createGridTiles } from "./grid-model.js";
import { createSelectionModel } from "./selection-model.js";
import { attachTileInteraction } from "./tile-interaction.js?v=camera-1";
import { createTileInfoPanel } from "./tile-info-panel.js";

const canvas = document.getElementById("canvas");
const { context, getSize, resize } = createCanvas(canvas);
const sizeInput = document.getElementById("grid-size");
const sizeValue = document.getElementById("grid-size-value");
const inspector = createInspector(
  sizeInput,
  sizeValue,
  document.getElementById("show-axes"),
  document.getElementById("show-grid"),
  document.getElementById("multi-select")
);
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
const interaction = attachTileInteraction(canvas, {
  getCanvasSize: getSize,
  getGridSize: inspector.getGridSize,
  camera,
  getMultiSelect: inspector.getMultiSelect,
  selection,
  onHover: panel.showHover,
  onSelectionChange: panel.showActive,
});

function updateSelectionMode() {
  canvas.style.cursor = inspector.getMultiSelect() ? "crosshair" : "";
  if (!inspector.getMultiSelect()) {
    selection.clear();
    panel.showActive(selection.getTiles());
  }
}

document.getElementById("multi-select")?.addEventListener("change", updateSelectionMode);
canvas.style.cursor = inspector.getMultiSelect() ? "crosshair" : "";

attachCameraControls(canvas, {
  camera,
  getCanvasSize: getSize,
  onChange: interaction.refreshHover,
  getDefaultCursor: () => inspector.getMultiSelect() ? "crosshair" : "",
});

function resizeCanvas() {
  resize();
  interaction.refreshHover();
}

preventBrowserZoom();
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

let cachedGridSize = null;
let gridTiles = [];
let fpsElapsed = 0;
let fpsFrames = 0;
let measuredFps = null;
startRenderLoop((dt) => {
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
  if (renderStats.tiles) {
    renderStats.tiles.textContent = String(renderedTiles);
  }
  if (renderStats.gridCells) {
    renderStats.gridCells.textContent = String(renderedGridCells);
  }
  if (renderStats.fps) {
    renderStats.fps.textContent = measuredFps === null ? "—" : String(measuredFps);
  }
  if (renderStats.time) renderStats.time.textContent = `${renderDuration.toFixed(2)} ms`;
});
