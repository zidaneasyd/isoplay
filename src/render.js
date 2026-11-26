import { PLANE } from "./config.js";
import { getTileElevation, getTileElevationPixels } from "./elevation.js";
import { isTileInRange } from "./geometry.js";

const halfWidth = PLANE.tileWidth / 2;
const halfHeight = PLANE.tileHeight / 2;
const SIDE_LEFT = "#303030";
const SIDE_RIGHT = "#272727";

function traceTile(context, row, column, verticalOffset = 0) {
  const x = (column - row) * halfWidth;
  const y = (column + row) * halfHeight + verticalOffset;
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

function tracePolygon(context, points) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index++) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.closePath();
}

function drawSideFace(context, points, color, safeZoom) {
  tracePolygon(context, points);
  context.fillStyle = color;
  context.fill();
  context.strokeStyle = PLANE.colors.grid;
  context.lineWidth = 1 / safeZoom;
  context.stroke();
}

function drawElevatedTiles(context, elevations, hovered, active, sameHighlight, safeZoom) {
  // Paint from the back of the isometric plane towards the viewer. The two
  // front-facing sides are drawn before each top face, like a low-poly prism.
  for (let diagonal = 0; diagonal < PLANE.rows + PLANE.columns - 1; diagonal++) {
    for (let row = 0; row < PLANE.rows; row++) {
      const column = diagonal - row;
      if (column < 0 || column >= PLANE.columns) continue;

      const tile = { row, column };
      const level = getTileElevation(elevations, tile);
      if (level === 0) continue;

      const x = (column - row) * halfWidth;
      const y = (column + row) * halfHeight;
      const currentHeight = getTileElevationPixels(level);
      const west = { x: x - halfWidth, y: y + halfHeight };
      const east = { x: x + halfWidth, y: y + halfHeight };
      const south = { x, y: y + PLANE.tileHeight };
      const westNeighbor = row + 1 < PLANE.rows
        ? getTileElevation(elevations, { row: row + 1, column }) : 0;
      const eastNeighbor = column + 1 < PLANE.columns
        ? getTileElevation(elevations, { row, column: column + 1 }) : 0;

      if (level > westNeighbor) {
        const lowerHeight = getTileElevationPixels(westNeighbor);
        drawSideFace(context, [
          { x: west.x, y: west.y - currentHeight },
          { x: south.x, y: south.y - currentHeight },
          { x: south.x, y: south.y - lowerHeight },
          { x: west.x, y: west.y - lowerHeight },
        ], SIDE_LEFT, safeZoom);
      }

      if (level > eastNeighbor) {
        const lowerHeight = getTileElevationPixels(eastNeighbor);
        drawSideFace(context, [
          { x: south.x, y: south.y - currentHeight },
          { x: east.x, y: east.y - currentHeight },
          { x: east.x, y: east.y - lowerHeight },
          { x: south.x, y: south.y - lowerHeight },
        ], SIDE_RIGHT, safeZoom);
      }

      const isHovered = hovered && hovered.row === row && hovered.column === column;
      const isActive = active && active.row === row && active.column === column;
      const fillColor = isActive ? PLANE.colors.active
        : isHovered && !sameHighlight ? PLANE.colors.hover : PLANE.colors.tile;
      const strokeColor = isActive ? PLANE.colors.activeStroke
        : isHovered ? PLANE.colors.hoverStroke : PLANE.colors.grid;

      context.beginPath();
      traceTile(context, row, column, -currentHeight);
      context.fillStyle = fillColor;
      context.fill();
      context.strokeStyle = strokeColor;
      context.lineWidth = (isActive || isHovered) ? 2 / safeZoom : 1 / safeZoom;
      context.stroke();
    }
  }
}

/**
 * Draw the base isometric plane and any raised tiles. Each elevation level
 * moves the top face up by eight CSS pixels and exposes its left/right sides.
 */
export function drawPlane(
  context,
  { hoveredTile = null, activeTile = null, elevations = null, topPadding = 0 } = {},
  pixelRatio = 1,
  zoom = 1,
) {
  const safeRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const safeTopPadding = Number.isFinite(topPadding) && topPadding > 0 ? topPadding : 0;
  const safeElevations = elevations instanceof Map ? elevations : null;
  const hovered = hoveredTile && isTileInRange(hoveredTile.row, hoveredTile.column) ? hoveredTile : null;
  const active = activeTile && isTileInRange(activeTile.row, activeTile.column) ? activeTile : null;
  const sameHighlight = hovered && active &&
    hovered.row === active.row && hovered.column === active.column;

  context.setTransform(safeRatio, 0, 0, safeRatio, 0, 0);
  context.clearRect(0, 0, PLANE.width, PLANE.height + safeTopPadding);
  context.save();
  context.translate(PLANE.width / 2, safeTopPadding);

  // Keep the ground plane intact beneath raised geometry. A selected elevated
  // tile is highlighted on its raised top face rather than on the ground.
  context.beginPath();
  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      const tile = { row, column };
      const isHighlighted = ((hovered && hovered.row === row && hovered.column === column) ||
        (active && active.row === row && active.column === column)) &&
        getTileElevation(safeElevations, tile) === 0;
      if (!isHighlighted) traceTile(context, row, column);
    }
  }
  context.fillStyle = PLANE.colors.tile;
  context.fill();

  for (const [tile, color] of [
    [hovered && !sameHighlight ? hovered : null, PLANE.colors.hover],
    [active, PLANE.colors.active],
  ]) {
    if (!tile || getTileElevation(safeElevations, tile) > 0) continue;
    context.beginPath();
    traceTile(context, tile.row, tile.column);
    context.fillStyle = color;
    context.fill();
  }

  // Ground grid and its perimeter remain at level zero.
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
    if (!tile || getTileElevation(safeElevations, tile) > 0 ||
        (color === PLANE.colors.hoverStroke && sameHighlight)) continue;
    context.beginPath();
    traceTile(context, tile.row, tile.column);
    context.strokeStyle = color;
    context.lineWidth = 2 / safeZoom;
    context.stroke();
  }

  if (safeElevations?.size) {
    drawElevatedTiles(context, safeElevations, hovered, active, sameHighlight, safeZoom);
  }

  context.restore();
}
