import { createCanvas } from "./canvas.js";
import { startRenderLoop } from "./animation.js";
import { preventBrowserZoom } from "./browser-controls.js";
import { drawGrid, drawTile, drawTiles } from "./renderer.js";
import { gridToScreen, tileH } from "./isometric.js";
import { createInspector } from "./inspector.js";
import { createGridTiles } from "./grid-model.js";
import { createSelectionModel } from "./selection-model.js";
import { attachTileInteraction } from "./tile-interaction.js";
import { createTileInfoPanel } from "./tile-info-panel.js";

const canvas = document.getElementById("canvas");
const { context, getSize, resize } = createCanvas(canvas);
const sizeInput = document.getElementById("grid-size");
const sizeValue = document.getElementById("grid-size-value");
const inspector = createInspector(
  sizeInput,
  sizeValue,
  document.getElementById("show-axes"),
  document.getElementById("show-grid")
);
const selection = createSelectionModel();
const panel = createTileInfoPanel(
  document.getElementById("hover-coordinates"),
  document.getElementById("active-coordinates")
);
const interaction = attachTileInteraction(canvas, {
  getCanvasSize: getSize,
  getGridSize: inspector.getGridSize,
  selection,
  onHover: panel.showHover,
  onSelectionChange: panel.showActive,
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
startRenderLoop(() => {
  const { width, height } = getSize();
  const gridSize = inspector.getGridSize();
  if (gridSize !== cachedGridSize) {
    cachedGridSize = gridSize;
    gridTiles = createGridTiles(gridSize);
  }
  if (selection.retainWithinGrid(gridSize)) panel.showActive(selection.getTiles());

  context.clearRect(0, 0, width, height);
  drawTiles(context, width, height, gridTiles, { alreadySorted: true });
  drawGrid(context, width, height, gridSize, gridSize, {
    showAxes: inspector.getShowAxes(),
    showGrid: inspector.getShowGrid(),
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
      2
    );
  }

  for (const tile of selection.getTiles()) {
    const position = gridToScreen(tile.col, tile.row);
    drawTile(
      context,
      width / 2 + position.x,
      height / 2 + position.y - tile.height * tileH / 2,
      "rgba(153, 132, 194, 0.5)",
      "rgba(211, 198, 255, 0.5)",
      2
    );
  }
});
