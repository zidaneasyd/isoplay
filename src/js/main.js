import { createCanvas } from "./canvas.js";
import { attachCameraControls, createCamera } from "./camera.js?v=camera-1";
import { createRenderScheduler } from "./animation.js?v=render-2";
import { preventBrowserZoom } from "./browser-controls.js";
import {
  createBoardGeometry,
  createTileBatchCache,
  drawBoard,
  drawCachedTileBatch,
  drawGrid,
  drawTile,
  drawTileBatch,
  drawTiles,
  countVisibleGridTiles,
  getVisibleTileBounds,
  isTileInBounds,
} from "./renderer.js?v=render-2";
import { gridToScreen, tileH } from "./isometric.js";
import { createInspector } from "./inspector.js?v=camera-1";
import { createRenderStats } from "./render-stats.js?v=stats-1";
import { createGridTiles } from "./grid-model.js";
import { createSelectionModel } from "./selection-model.js";
import { attachTileInteraction } from "./tile-interaction.js?v=camera-1";
import { createTileInfoPanel } from "./tile-info-panel.js";
import { createSandbox } from "./sandbox.js";
import { attachInspectorControls } from "./ui-controls.js";

const canvas = document.getElementById("canvas");
const { context, getSize, resize } = createCanvas(canvas);
const sizeInput = document.getElementById("grid-size");
const sizeValue = document.getElementById("grid-size-value");
const axesInput = document.getElementById("show-axes");
const gridInput = document.getElementById("show-grid");
const multiSelectInput = document.getElementById("tile-selection") ?? document.getElementById("multi-select");
const sandboxModeInput = document.getElementById("sandbox-mode");
const resetCameraButton = document.getElementById("reset-camera");
const inspector = createInspector(sizeInput, sizeValue, axesInput, gridInput, multiSelectInput);
attachInspectorControls({
  panel: document.getElementById("left-panel"),
  panelToggle: document.getElementById("panel-toggle"),
  worldToggle: document.getElementById("world-toggle"),
  worldInspectors: document.getElementById("world-inspectors"),
  stepper: document.getElementById("size-stepper"),
  decrementButton: document.getElementById("size-dec"),
  incrementButton: document.getElementById("size-inc"),
  sizeInput,
  sizeLabel: document.getElementById("size-label"),
});
const selection = createSelectionModel();
const selectionGeometryCache = createTileBatchCache();
const panel = createTileInfoPanel(
  document.getElementById("hover-coordinates"),
  document.getElementById("active-coordinates")
);
const renderStats = createRenderStats({
  tiles: document.getElementById("rendered-tiles"),
  visibleTiles: document.getElementById("visible-tiles"),
  gridLines: document.getElementById("rendered-grid-lines"),
  fps: document.getElementById("render-fps"),
  time: document.getElementById("render-time"),
});
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
  interaction.refreshHover();
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

resetCameraButton?.addEventListener("click", () => {
  camera.reset();
  interaction.refreshHover();
  requestRender();
});

let cachedGridSize = null;
let gridTiles = [];
let boardGeometry = null;
let visibleTileCountKey = null;
let visibleTileCount = 0;

function getVisibleGridTileCount(gridSize, bounds) {
  const key = JSON.stringify([
    gridSize, bounds.minCol, bounds.maxCol, bounds.minRow, bounds.maxRow,
    bounds.width, bounds.height, bounds.zoom, bounds.offsetX, bounds.offsetY,
  ]);
  if (key !== visibleTileCountKey) {
    visibleTileCount = countVisibleGridTiles(gridSize, gridSize, bounds);
    visibleTileCountKey = key;
  }
  return visibleTileCount;
}

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
    boardGeometry = typeof globalThis.Path2D === "function" ? createBoardGeometry(gridSize) : null;
  }
  if (selection.retainWithinGrid(gridSize)) panel.showActive(selection.getTiles());

  context.clearRect(0, 0, width, height);
  context.save();
  camera.applyToContext(context, width, height);
  let renderedTiles;
  let visibleTiles;
  let renderedGridLines = 0;
  const flatBoardColor = gridTiles.length > 0 ? (gridTiles[0].color ?? "#383838") : null;
  const canDrawBoard = boardGeometry !== null && flatBoardColor !== null
    && gridTiles.every((tile) => (tile.color ?? "#383838") === flatBoardColor && (tile.height ?? 0) === 0);
  if (canDrawBoard) {
    drawBoard(context, width, height, boardGeometry, {
      fillColor: flatBoardColor,
      strokeColor: showGrid ? "#484848" : null,
      strokeWidth: strokeScale,
    });
    renderedTiles = gridTiles.length;
    visibleTiles = getVisibleGridTileCount(gridSize, visibleBounds);
    renderedGridLines = showGrid ? boardGeometry.lineCount : 0;
    drawGrid(context, width, height, gridSize, gridSize, {
      showAxes: inspector.getShowAxes(),
      showGrid: false,
      strokeScale,
    });
  } else {
    renderedTiles = drawTiles(context, width, height, gridTiles, {
      alreadySorted: true,
      bounds: visibleBounds,
    });
    visibleTiles = renderedTiles;
    drawGrid(context, width, height, gridSize, gridSize, {
      showAxes: inspector.getShowAxes(),
      showGrid,
      strokeScale,
      bounds: visibleBounds,
      onGridLines(count) { renderedGridLines = count; },
    });
  }

  const hoveredTile = interaction.getHoveredTile();
  const canBatchSelection = selection.hasUniformHeight();
  const hoveredTileIsSelected = selection.has(hoveredTile);

  if (hoveredTile && !hoveredTileIsSelected) {
    const position = gridToScreen(hoveredTile.col, hoveredTile.row);
    drawTile(
      context,
      width / 2 + position.x,
      height / 2 + position.y - (hoveredTile.height ?? 0) * tileH / 2,
      "rgba(189, 121, 82, 0.5)",
      "rgba(255, 184, 138, 0.5)",
      2 * strokeScale
    );
    renderedTiles += 1;
  }

  if (canBatchSelection) {
    const selectionStyle = {
      fillColor: "rgba(153, 132, 194, 0.5)",
      strokeColor: "rgba(211, 198, 255, 0.5)",
      strokeWidth: 2 * strokeScale,
    };
    if (typeof globalThis.Path2D === "function") {
      const geometry = selectionGeometryCache.get(
        selection.getRevision(), width, height, selection.values(), { bounds: visibleBounds }
      );
      renderedTiles += drawCachedTileBatch(context, geometry, selectionStyle);
    } else {
      renderedTiles += drawTileBatch(context, width, height, selection.values(), {
        bounds: visibleBounds,
        ...selectionStyle,
      });
    }
  } else {
    for (const tile of selection.values()) {
      if (!isTileInBounds(tile, visibleBounds)) continue;
      const position = gridToScreen(tile.col, tile.row);
      drawTile(
        context,
        width / 2 + position.x,
        height / 2 + position.y - (tile.height ?? 0) * tileH / 2,
        "rgba(153, 132, 194, 0.5)",
        "rgba(211, 198, 255, 0.5)",
        2 * strokeScale
      );
      renderedTiles += 1;
    }
  }
  context.restore();

  renderStats.record({
    tiles: renderedTiles,
    visibleTiles,
    gridLines: renderedGridLines,
    renderMs: performance.now() - renderStartedAt,
  });
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
