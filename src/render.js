import { PLANE } from "./config.js";

const halfWidth = PLANE.tileWidth / 2;
const halfHeight = PLANE.tileHeight / 2;

export function drawPlane(
  context,
  { hoveredTile = null, activeTile = null } = {},
  pixelRatio = 1,
  zoom = 1,
) {
  const safeRatio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  context.setTransform(safeRatio, 0, 0, safeRatio, 0, 0);
  context.clearRect(0, 0, PLANE.width, PLANE.height);
  context.save();
  context.translate(PLANE.width / 2, 0);

  function traceTile(row, column) {
    const x = (column - row) * halfWidth;
    const y = (column + row) * halfHeight;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + halfWidth, y + halfHeight);
    context.lineTo(x, y + PLANE.tileHeight);
    context.lineTo(x - halfWidth, y + halfHeight);
    context.closePath();
  }

  // Draw all fills first so neighboring tiles never cover focus strokes.
  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      const isActive = activeTile?.row === row && activeTile?.column === column;
      const isHovered = hoveredTile?.row === row && hoveredTile?.column === column;
      traceTile(row, column);
      context.fillStyle = isActive ? PLANE.colors.active
        : isHovered ? PLANE.colors.hover
          : PLANE.colors.tile;
      context.fill();
    }
  }

  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      traceTile(row, column);
      context.strokeStyle = PLANE.colors.grid;
      context.lineWidth = 1 / safeZoom;
      context.stroke();
    }
  }

  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(PLANE.width / 2, PLANE.height / 2);
  context.lineTo(0, PLANE.height);
  context.lineTo(-PLANE.width / 2, PLANE.height / 2);
  context.closePath();
  context.strokeStyle = PLANE.colors.grid;
  context.lineWidth = 1 / safeZoom;
  context.stroke();

  for (const [tile, color] of [
    [hoveredTile, PLANE.colors.hoverStroke],
    [activeTile, PLANE.colors.activeStroke],
  ]) {
    if (!tile) continue;
    traceTile(tile.row, tile.column);
    context.strokeStyle = color;
    context.lineWidth = 2 / safeZoom;
    context.stroke();
  }
  context.restore();
}
