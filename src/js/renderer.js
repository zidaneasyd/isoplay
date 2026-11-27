import { gridToScreen, tileW, tileH } from "./isometric.js";

const elevationStep = tileH / 2;

export function drawTile(context, centerX, centerY, color, strokeColor = null, strokeWidth = 1) {
  context.beginPath();
  context.moveTo(centerX, centerY - tileH / 2);
  context.lineTo(centerX + tileW / 2, centerY);
  context.lineTo(centerX, centerY + tileH / 2);
  context.lineTo(centerX - tileW / 2, centerY);
  context.closePath();
  context.fillStyle = color;
  context.fill();
  if (strokeColor) {
    context.strokeStyle = strokeColor;
    context.lineWidth = strokeWidth;
    context.stroke();
  }
}

export function drawTiles(context, width, height, tiles, { alreadySorted = false } = {}) {
  const originX = width / 2;
  const originY = height / 2;
  const sortedTiles = alreadySorted ? tiles : [...tiles].sort((a, b) =>
    (a.col + a.row) - (b.col + b.row)
    || a.height - b.height
    || a.col - b.col
    || a.row - b.row
  );

  for (const tile of sortedTiles) {
    const position = gridToScreen(tile.col, tile.row);
    drawTile(
      context,
      originX + position.x,
      originY + position.y - tile.height * elevationStep,
      tile.color ?? "#383838"
    );
  }
}

export function drawGrid(
  context,
  width,
  height,
  gridWidth,
  gridHeight = gridWidth,
  { showAxes = true, showGrid = true } = {}
) {
  // Cell coordinates are centered on the world origin; odd dimensions put (0, 0) on a cell.
  const colCenter = (gridWidth - 1) / 2;
  const rowCenter = (gridHeight - 1) / 2;
  const originX = width / 2;
  const originY = height / 2;

  if (showGrid) {
    // Grid lines are guides only; tile surfaces are drawn independently by drawTiles.
    for (let row = 0; row < gridHeight; row += 1) {
      for (let col = 0; col < gridWidth; col += 1) {
        const position = gridToScreen(col - colCenter, row - rowCenter);
        const tileX = originX + position.x;
        const tileY = originY + position.y;
        context.beginPath();
        context.moveTo(tileX, tileY - tileH / 2);
        context.lineTo(tileX + tileW / 2, tileY);
        context.lineTo(tileX, tileY + tileH / 2);
        context.lineTo(tileX - tileW / 2, tileY);
        context.closePath();
        context.strokeStyle = "#484848";
        context.lineWidth = 1;
        context.stroke();
      }
    }
  }

  if (!showAxes) return;

  const colAxisStart = gridToScreen(-gridWidth / 2, 0);
  const colAxisEnd = gridToScreen(gridWidth / 2, 0);
  const rowAxisStart = gridToScreen(0, -gridHeight / 2);
  const rowAxisEnd = gridToScreen(0, gridHeight / 2);

  context.beginPath();
  context.moveTo(originX + colAxisStart.x, originY + colAxisStart.y);
  context.lineTo(originX + colAxisEnd.x, originY + colAxisEnd.y);
  context.strokeStyle = "#3b82f6";
  context.lineWidth = 1;
  context.stroke();

  context.beginPath();
  context.moveTo(originX + rowAxisStart.x, originY + rowAxisStart.y);
  context.lineTo(originX + rowAxisEnd.x, originY + rowAxisEnd.y);
  context.strokeStyle = "#ef4444";
  context.lineWidth = 1;
  context.stroke();

  const yAxisTipX = originX;
  const yAxisTipY = originY - 40;
  const arrowSize = 4;
  context.beginPath();
  context.moveTo(originX, originY);
  context.lineTo(yAxisTipX, yAxisTipY);
  context.strokeStyle = "#22c55e";
  context.lineWidth = 1;
  context.stroke();

  context.beginPath();
  context.moveTo(yAxisTipX, yAxisTipY);
  context.lineTo(yAxisTipX - arrowSize / 2, yAxisTipY + arrowSize);
  context.moveTo(yAxisTipX, yAxisTipY);
  context.lineTo(yAxisTipX + arrowSize / 2, yAxisTipY + arrowSize);
  context.strokeStyle = "#22c55e";
  context.lineWidth = 1;
  context.stroke();

  // Mark the world origin where the two grid axes meet.
  context.beginPath();
  context.arc(originX, originY, 3, 0, Math.PI * 2);
  context.fillStyle = "#f5f5f5";
  context.fill();
}
