import { PLANE } from "./config.js";
import { isTileInRange } from "./geometry.js";

const halfWidth = PLANE.tileWidth / 2;
const halfHeight = PLANE.tileHeight / 2;

function traceTile(context, row, column) {
  const x = (column - row) * halfWidth;
  const y = (column + row) * halfHeight;
  context.moveTo(x, y);
  context.lineTo(x + halfWidth, y + halfHeight);
  context.lineTo(x, y + PLANE.tileHeight);
  context.lineTo(x - halfWidth, y + halfHeight);
  context.closePath();
}

function tracePlanePerimeter(context) {
  context.moveTo(0, 0);
  context.lineTo(PLANE.width / 2, PLANE.height / 2);
  context.lineTo(0, PLANE.height);
  context.lineTo(-PLANE.width / 2, PLANE.height / 2);
  context.closePath();
}

/**
 * Draw the isometric grid with batched paths. `pixelRatio` is the backing-store
 * scale and `zoom` is the visual camera scale; stroke widths are compensated so
 * lines remain a stable CSS-pixel width at every zoom level.
 */
export function drawPlane(
  context,
  { hoveredTile = null, activeTile = null } = {},
  pixelRatio = 1,
  zoom = 1,
) {
  const safeRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const hovered = hoveredTile && isTileInRange(hoveredTile.row, hoveredTile.column) ? hoveredTile : null;
  const active = activeTile && isTileInRange(activeTile.row, activeTile.column) ? activeTile : null;
  const sameHighlight = hovered && active &&
    hovered.row === active.row && hovered.column === active.column;

  context.setTransform(safeRatio, 0, 0, safeRatio, 0, 0);
  context.clearRect(0, 0, PLANE.width, PLANE.height);
  context.save();
  context.translate(PLANE.width / 2, 0);

  // Fill all ordinary tiles in one path. Selected/hovered tiles are filled
  // afterwards so they keep their own colors without 144 separate draw calls.
  context.beginPath();
  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      const isHighlighted = (hovered && hovered.row === row && hovered.column === column) ||
        (active && active.row === row && active.column === column);
      if (!isHighlighted) traceTile(context, row, column);
    }
  }
  context.fillStyle = PLANE.colors.tile;
  context.fill();

  for (const [tile, color] of [
    [hovered && !sameHighlight ? hovered : null, PLANE.colors.hover],
    [active, PLANE.colors.active],
  ]) {
    if (!tile) continue;
    context.beginPath();
    traceTile(context, tile.row, tile.column);
    context.fillStyle = color;
    context.fill();
  }

  // All internal tile edges are stroked in one operation; the perimeter stays
  // separate to preserve the original stronger outer outline.
  context.beginPath();
  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      traceTile(context, row, column);
    }
  }
  context.strokeStyle = PLANE.colors.grid;
  context.lineWidth = 1 / safeZoom;
  context.stroke();

  context.beginPath();
  tracePlanePerimeter(context);
  context.strokeStyle = PLANE.colors.grid;
  context.lineWidth = 1 / safeZoom;
  context.stroke();

  for (const [tile, color] of [
    [hovered, PLANE.colors.hoverStroke],
    [active, PLANE.colors.activeStroke],
  ]) {
    if (!tile || (color === PLANE.colors.hoverStroke && sameHighlight)) continue;
    context.beginPath();
    traceTile(context, tile.row, tile.column);
    context.strokeStyle = color;
    context.lineWidth = 2 / safeZoom;
    context.stroke();
  }

  context.restore();
}
