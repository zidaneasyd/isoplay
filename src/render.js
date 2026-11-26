import { PLANE } from "./config.js";
import { getTileElevation, getTileElevationPixels } from "./elevation.js";
import { isTileInRange } from "./geometry.js";

const SIDE_LEFT = "#303030";
const SIDE_RIGHT = "#272727";

function traceTile(context, row, column, verticalOffset = 0, plane = PLANE) {
  const halfWidth = plane.tileWidth / 2;
  const halfHeight = plane.tileHeight / 2;
  const x = (column - row) * halfWidth;
  const y = (column + row) * halfHeight + verticalOffset;
  context.moveTo(x, y);
  context.lineTo(x + halfWidth, y + halfHeight);
  context.lineTo(x, y + plane.tileHeight);
  context.lineTo(x - halfWidth, y + halfHeight);
  context.closePath();
}

function tracePlanePerimeter(context, plane) {
  context.moveTo(0, 0);
  context.lineTo(plane.width / 2, plane.height / 2);
  context.lineTo(0, plane.height);
  context.lineTo(-plane.width / 2, plane.height / 2);
  context.closePath();
}

function tracePolygon(context, points) {
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index++) context.lineTo(points[index].x, points[index].y);
  context.closePath();
}

function drawSideFace(context, points, color, safeZoom, plane, showGrid) {
  tracePolygon(context, points);
  context.fillStyle = color;
  context.fill();
  if (showGrid) {
    context.strokeStyle = plane.colors.grid;
    context.lineWidth = 1 / safeZoom;
    context.stroke();
  }
}

function drawElevatedTiles(context, elevations, hovered, active, sameHighlight, safeZoom, plane, showGrid) {
  const halfWidth = plane.tileWidth / 2;
  const halfHeight = plane.tileHeight / 2;
  // Paint back-to-front so front-facing side walls remain visible.
  for (let diagonal = 0; diagonal < plane.rows + plane.columns - 1; diagonal++) {
    for (let row = 0; row < plane.rows; row++) {
      const column = diagonal - row;
      if (column < 0 || column >= plane.columns) continue;

      const tile = { row, column };
      const level = getTileElevation(elevations, tile, plane);
      if (level === 0) continue;

      const x = (column - row) * halfWidth;
      const y = (column + row) * halfHeight;
      const currentHeight = getTileElevationPixels(level);
      const west = { x: x - halfWidth, y: y + halfHeight };
      const east = { x: x + halfWidth, y: y + halfHeight };
      const south = { x, y: y + plane.tileHeight };
      const westNeighbor = row + 1 < plane.rows
        ? getTileElevation(elevations, { row: row + 1, column }, plane) : 0;
      const eastNeighbor = column + 1 < plane.columns
        ? getTileElevation(elevations, { row, column: column + 1 }, plane) : 0;

      if (level > westNeighbor) {
        const lowerHeight = getTileElevationPixels(westNeighbor);
        drawSideFace(context, [
          { x: west.x, y: west.y - currentHeight },
          { x: south.x, y: south.y - currentHeight },
          { x: south.x, y: south.y - lowerHeight },
          { x: west.x, y: west.y - lowerHeight },
        ], SIDE_LEFT, safeZoom, plane, showGrid);
      }

      if (level > eastNeighbor) {
        const lowerHeight = getTileElevationPixels(eastNeighbor);
        drawSideFace(context, [
          { x: south.x, y: south.y - currentHeight },
          { x: east.x, y: east.y - currentHeight },
          { x: east.x, y: east.y - lowerHeight },
          { x: south.x, y: south.y - lowerHeight },
        ], SIDE_RIGHT, safeZoom, plane, showGrid);
      }

      const isHovered = hovered && hovered.row === row && hovered.column === column;
      const isActive = active && active.row === row && active.column === column;
      const fillColor = isActive ? plane.colors.active
        : isHovered && !sameHighlight ? plane.colors.hover : plane.colors.tile;
      const strokeColor = isActive ? plane.colors.activeStroke
        : isHovered ? plane.colors.hoverStroke : plane.colors.grid;

      context.beginPath();
      traceTile(context, row, column, -currentHeight, plane);
      context.fillStyle = fillColor;
      context.fill();
      if (showGrid || isActive || isHovered) {
        context.strokeStyle = strokeColor;
        context.lineWidth = (isActive || isHovered) ? 2 / safeZoom : 1 / safeZoom;
        context.stroke();
      }
    }
  }
}

function drawAxes(context, plane, safeZoom) {
  const halfX = plane.width / 4;
  const halfY = plane.height / 4;
  const centerY = plane.height / 2;
  context.save();
  context.lineWidth = 1 / safeZoom;
  context.beginPath();
  context.moveTo(-halfX, centerY - halfY);
  context.lineTo(halfX, centerY + halfY);
  context.strokeStyle = "#ed5963";
  context.stroke();
  context.beginPath();
  context.moveTo(-halfX, centerY + halfY);
  context.lineTo(halfX, centerY - halfY);
  context.strokeStyle = "#68c978";
  context.stroke();
  context.beginPath();
  context.moveTo(0, centerY);
  context.lineTo(0, centerY - 56);
  context.strokeStyle = "#42a5ff";
  context.stroke();
  context.beginPath();
  context.moveTo(0, centerY - 64);
  context.lineTo(-4, centerY - 56);
  context.lineTo(4, centerY - 56);
  context.closePath();
  context.fillStyle = "#42a5ff";
  context.fill();
  context.restore();
}

function drawCoordinates(context, plane, safeZoom) {
  const originColumn = Math.floor(plane.columns / 2);
  const originRow = Math.floor(plane.rows / 2);
  const halfWidth = plane.tileWidth / 2;
  const halfHeight = plane.tileHeight / 2;
  const angle = Math.atan2(halfHeight, halfWidth);
  context.save();
  context.font = `${7.5 / safeZoom}px ui-sans-serif, system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "rgba(220, 226, 234, .78)";
  for (let row = 0; row < plane.rows; row++) {
    for (let column = 0; column < plane.columns; column++) {
      const x = (column - row) * halfWidth;
      const y = (column + row + 1) * halfHeight;
      const coordinateX = column - originColumn;
      const coordinateY = originRow - row;
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.fillText(`${coordinateX},${coordinateY}`, 0, 0);
      context.restore();
    }
  }
  context.restore();
}

/** Draw the plane, optional axes/coordinates, and raised tile geometry. */
export function drawPlane(
  context,
  {
    hoveredTile = null,
    activeTile = null,
    elevations = null,
    topPadding = 0,
    plane = PLANE,
    showGrid = true,
    showAxes = false,
    showCoordinates = false,
  } = {},
  pixelRatio = 1,
  zoom = 1,
) {
  const safeRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  const safeTopPadding = Number.isFinite(topPadding) && topPadding > 0 ? topPadding : 0;
  const safePlane = plane && Number.isFinite(plane.width) && Number.isFinite(plane.height) ? plane : PLANE;
  const safeElevations = elevations instanceof Map ? elevations : null;
  const hovered = hoveredTile && isTileInRange(hoveredTile.row, hoveredTile.column, safePlane) ? hoveredTile : null;
  const active = activeTile && isTileInRange(activeTile.row, activeTile.column, safePlane) ? activeTile : null;
  const sameHighlight = hovered && active && hovered.row === active.row && hovered.column === active.column;

  context.setTransform(safeRatio, 0, 0, safeRatio, 0, 0);
  context.clearRect(0, 0, safePlane.width, safePlane.height + safeTopPadding);
  context.save();
  context.translate(safePlane.width / 2, safeTopPadding);

  context.beginPath();
  for (let row = 0; row < safePlane.rows; row++) {
    for (let column = 0; column < safePlane.columns; column++) {
      const tile = { row, column };
      const isHighlighted = ((hovered && hovered.row === row && hovered.column === column) ||
        (active && active.row === row && active.column === column)) &&
        getTileElevation(safeElevations, tile, safePlane) === 0;
      if (!isHighlighted) traceTile(context, row, column, 0, safePlane);
    }
  }
  context.fillStyle = safePlane.colors.tile;
  context.fill();

  for (const [tile, color] of [
    [hovered && !sameHighlight ? hovered : null, safePlane.colors.hover],
    [active, safePlane.colors.active],
  ]) {
    if (!tile || getTileElevation(safeElevations, tile, safePlane) > 0) continue;
    context.beginPath();
    traceTile(context, tile.row, tile.column, 0, safePlane);
    context.fillStyle = color;
    context.fill();
  }

  if (showGrid) {
    context.beginPath();
    for (let row = 0; row < safePlane.rows; row++) {
      for (let column = 0; column < safePlane.columns; column++) traceTile(context, row, column, 0, safePlane);
    }
    context.strokeStyle = safePlane.colors.grid;
    context.lineWidth = 1 / safeZoom;
    context.stroke();

    context.beginPath();
    tracePlanePerimeter(context, safePlane);
    context.strokeStyle = safePlane.colors.grid;
    context.lineWidth = 1 / safeZoom;
    context.stroke();
  }

  for (const [tile, color] of [
    [hovered, safePlane.colors.hoverStroke],
    [active, safePlane.colors.activeStroke],
  ]) {
    if (!tile || getTileElevation(safeElevations, tile, safePlane) > 0 ||
        (color === safePlane.colors.hoverStroke && sameHighlight)) continue;
    context.beginPath();
    traceTile(context, tile.row, tile.column, 0, safePlane);
    context.strokeStyle = color;
    context.lineWidth = 2 / safeZoom;
    context.stroke();
  }

  if (safeElevations?.size) drawElevatedTiles(context, safeElevations, hovered, active, sameHighlight, safeZoom, safePlane, showGrid);
  if (showAxes) drawAxes(context, safePlane, safeZoom);
  if (showCoordinates) drawCoordinates(context, safePlane, safeZoom);
  context.restore();
}
