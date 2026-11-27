import { gridToScreen, tileW, tileH } from "./isometric.js";

export function drawGrid(context, width, height, gridWidth, gridHeight = gridWidth) {
  const originX = width / 2;
  const originY = height / 2;
  // Cell coordinates are centered on the world origin; odd dimensions put (0, 0) on a cell.
  const colCenter = (gridWidth - 1) / 2;
  const rowCenter = (gridHeight - 1) / 2;

  // Draw from the far edge toward the near edge to keep tile borders tidy.
  for (let diagonal = 0; diagonal <= gridWidth + gridHeight - 2; diagonal += 1) {
    for (let col = 0; col < gridWidth; col += 1) {
      const row = diagonal - col;
      if (row < 0 || row >= gridHeight) continue;
      const position = gridToScreen(col - colCenter, row - rowCenter);
      const tileX = originX + position.x;
      const tileY = originY + position.y;

      context.beginPath();
      context.moveTo(tileX, tileY - tileH / 2);
      context.lineTo(tileX + tileW / 2, tileY);
      context.lineTo(tileX, tileY + tileH / 2);
      context.lineTo(tileX - tileW / 2, tileY);
      context.closePath();
      context.fillStyle = "#383838";
      context.fill();
      context.strokeStyle = "#484848";
      context.lineWidth = 1;
      context.stroke();
    }
  }

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
