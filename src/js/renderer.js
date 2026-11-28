import { gridToScreen, screenToGrid, tileW, tileH } from "./isometric.js";

const elevationStep = tileH / 2;
const tileBatchSize = 64;

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

export function createBoardGeometry(gridSize, PathClass = globalThis.Path2D) {
  if (typeof PathClass !== "function") {
    throw new Error("Path2D is required to create cached board geometry");
  }
  const half = gridSize / 2;
  const board = new PathClass();
  const lines = new PathClass();
  const corners = [[-half, -half], [half, -half], [half, half], [-half, half]]
    .map(([col, row]) => gridToScreen(col, row));

  board.moveTo(corners[0].x, corners[0].y);
  for (const corner of corners.slice(1)) board.lineTo(corner.x, corner.y);
  board.closePath();

  for (let step = 0; step <= gridSize; step += 1) {
    const offset = step - half;
    const colStart = gridToScreen(offset, -half);
    const colEnd = gridToScreen(offset, half);
    const rowStart = gridToScreen(-half, offset);
    const rowEnd = gridToScreen(half, offset);
    lines.moveTo(colStart.x, colStart.y);
    lines.lineTo(colEnd.x, colEnd.y);
    lines.moveTo(rowStart.x, rowStart.y);
    lines.lineTo(rowEnd.x, rowEnd.y);
  }

  return { gridSize, board, lines, lineCount: 2 * (gridSize + 1) };
}

export function drawBoard(context, width, height, geometry, {
  fillColor = "#383838",
  strokeColor = null,
  strokeWidth = 1,
} = {}) {
  context.save();
  context.translate(width / 2, height / 2);
  context.fillStyle = fillColor;
  context.fill(geometry.board);
  if (strokeColor) {
    context.strokeStyle = strokeColor;
    context.lineWidth = strokeWidth;
    context.stroke(geometry.lines);
  }
  context.restore();
}

export function drawTileBatch(context, width, height, tiles, {
  bounds = null,
  fillColor,
  strokeColor = null,
  strokeWidth = 1,
} = {}) {
  const originX = width / 2;
  const originY = height / 2;
  let count = 0;
  const edges = new Map();

  function addEdge(from, to) {
    const fromKey = `${from.x},${from.y}`;
    const toKey = `${to.x},${to.y}`;
    const key = fromKey < toKey ? `${fromKey}|${toKey}` : `${toKey}|${fromKey}`;
    if (!edges.has(key)) edges.set(key, [from, to]);
  }

  context.beginPath();
  for (const tile of tiles) {
    if (!isTileInBounds(tile, bounds)) continue;
    const position = gridToScreen(tile.col, tile.row);
    const centerX = originX + position.x;
    const centerY = originY + position.y - (tile.height ?? 0) * elevationStep;
    const corners = [
      { x: centerX, y: centerY - tileH / 2 },
      { x: centerX + tileW / 2, y: centerY },
      { x: centerX, y: centerY + tileH / 2 },
      { x: centerX - tileW / 2, y: centerY },
    ];
    context.moveTo(corners[0].x, corners[0].y);
    for (let index = 1; index < corners.length; index += 1) {
      context.lineTo(corners[index].x, corners[index].y);
    }
    context.closePath();
    for (let index = 0; index < corners.length; index += 1) {
      addEdge(corners[index], corners[(index + 1) % corners.length]);
    }
    count += 1;
  }
  if (count === 0) return 0;

  context.fillStyle = fillColor;
  context.fill();
  if (strokeColor) {
    context.beginPath();
    for (const [from, to] of edges.values()) {
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
    }
    context.strokeStyle = strokeColor;
    context.lineWidth = strokeWidth;
    context.stroke();
  }
  return count;
}

export function getVisibleTileBounds(camera, width, height) {
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ].map((point) => {
    const world = camera.screenToWorld(point, width, height);
    return screenToGrid(world.x - width / 2, world.y - height / 2);
  });
  const columns = corners.map(({ col }) => col);
  const rows = corners.map(({ row }) => row);
  const { zoom, offsetX, offsetY } = camera.getState();

  // A tile spans one grid unit along each projected axis. The margin keeps
  // diamonds intersecting a viewport edge from being culled by their centers.
  return {
    minCol: Math.floor(Math.min(...columns)) - 1,
    maxCol: Math.ceil(Math.max(...columns)) + 1,
    minRow: Math.floor(Math.min(...rows)) - 1,
    maxRow: Math.ceil(Math.max(...rows)) + 1,
    width,
    height,
    zoom,
    offsetX,
    offsetY,
  };
}

export function isTileInBounds(tile, bounds) {
  if (!bounds) return true;
  if (
    tile.col < bounds.minCol || tile.col > bounds.maxCol
    || tile.row < bounds.minRow || tile.row > bounds.maxRow
  ) return false;

  const centerX = bounds.width / 2 + bounds.offsetX
    + (tile.col - tile.row) * tileW / 2 * bounds.zoom;
  const centerY = bounds.height / 2 + bounds.offsetY
    + ((tile.col + tile.row) * tileH / 2 - (tile.height ?? 0) * elevationStep) * bounds.zoom;
  const halfWidth = tileW / 2 * bounds.zoom;
  const halfHeight = tileH / 2 * bounds.zoom;
  const overlapsX = centerX + halfWidth >= 0 && centerX - halfWidth <= bounds.width;
  const overlapsY = centerY + halfHeight >= 0 && centerY - halfHeight <= bounds.height;
  const diagonalExtent = Math.max(halfWidth, halfHeight);
  const diagonalSum = centerX + centerY;
  const diagonalDifference = centerX - centerY;

  return overlapsX && overlapsY
    && diagonalSum + diagonalExtent >= 0
    && diagonalSum - diagonalExtent <= bounds.width + bounds.height
    && diagonalDifference + diagonalExtent >= -bounds.height
    && diagonalDifference - diagonalExtent <= bounds.width;
}

export function drawTiles(context, width, height, tiles, {
  alreadySorted = false,
  bounds = null,
  strokeColor = null,
  strokeWidth = 1,
} = {}) {
  const originX = width / 2;
  const originY = height / 2;
  const sortedTiles = alreadySorted ? tiles : [...tiles].sort((a, b) =>
    (a.col + a.row) - (b.col + b.row)
    || a.height - b.height
    || a.col - b.col
    || a.row - b.row
  );

  let renderedTiles = 0;
  let currentColor = null;
  let batchCount = 0;
  const flushBatch = () => {
    if (batchCount === 0) return;
    context.fillStyle = currentColor;
    context.fill();
    if (strokeColor) {
      context.strokeStyle = strokeColor;
      context.lineWidth = strokeWidth;
      context.stroke();
    }
    batchCount = 0;
  };

  for (const tile of sortedTiles) {
    if (!isTileInBounds(tile, bounds)) continue;
    const color = tile.color ?? "#383838";
    const position = gridToScreen(tile.col, tile.row);
    const canBatch = color === "#383838" && (tile.height ?? 0) === 0;
    if (!canBatch) {
      flushBatch();
      drawTile(
        context,
        originX + position.x,
        originY + position.y - (tile.height ?? 0) * elevationStep,
        color,
        strokeColor,
        strokeWidth
      );
      currentColor = null;
      renderedTiles += 1;
      continue;
    }
    if (color !== currentColor || batchCount >= tileBatchSize) {
      flushBatch();
      currentColor = color;
      context.beginPath();
    }
    const centerX = originX + position.x;
    const centerY = originY + position.y - (tile.height ?? 0) * elevationStep;
    context.moveTo(centerX, centerY - tileH / 2);
    context.lineTo(centerX + tileW / 2, centerY);
    context.lineTo(centerX, centerY + tileH / 2);
    context.lineTo(centerX - tileW / 2, centerY);
    context.closePath();
    batchCount += 1;
    renderedTiles += 1;
  }
  flushBatch();
  return renderedTiles;
}

export function drawGrid(
  context,
  width,
  height,
  gridWidth,
  gridHeight = gridWidth,
  { showAxes = true, showGrid = true, strokeScale = 1, bounds = null, onGridLines = null } = {}
) {
  // Cell coordinates are centered on the world origin; odd dimensions put (0, 0) on a cell.
  const colCenter = (gridWidth - 1) / 2;
  const rowCenter = (gridHeight - 1) / 2;
  const originX = width / 2;
  const originY = height / 2;
  let renderedGridCells = 0;

  if (showGrid) {
    const firstRow = bounds ? Math.max(0, Math.ceil(bounds.minRow + rowCenter)) : 0;
    const lastRow = bounds ? Math.min(gridHeight - 1, Math.floor(bounds.maxRow + rowCenter)) : gridHeight - 1;
    const firstCol = bounds ? Math.max(0, Math.ceil(bounds.minCol + colCenter)) : 0;
    const lastCol = bounds ? Math.min(gridWidth - 1, Math.floor(bounds.maxCol + colCenter)) : gridWidth - 1;
    const edges = new Map();

    function addEdge(from, to) {
      const fromKey = `${from.x},${from.y}`;
      const toKey = `${to.x},${to.y}`;
      const key = fromKey < toKey ? `${fromKey}|${toKey}` : `${toKey}|${fromKey}`;
      if (!edges.has(key)) edges.set(key, [from, to]);
    }

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let col = firstCol; col <= lastCol; col += 1) {
        const tile = { col: col - colCenter, row: row - rowCenter };
        if (!isTileInBounds(tile, bounds)) continue;
        const position = gridToScreen(tile.col, tile.row);
        const tileX = originX + position.x;
        const tileY = originY + position.y;
        const corners = [
          { x: tileX, y: tileY - tileH / 2 },
          { x: tileX + tileW / 2, y: tileY },
          { x: tileX, y: tileY + tileH / 2 },
          { x: tileX - tileW / 2, y: tileY },
        ];
        for (let corner = 0; corner < corners.length; corner += 1) {
          addEdge(corners[corner], corners[(corner + 1) % corners.length]);
        }
        renderedGridCells += 1;
      }
    }

    if (edges.size > 0) {
      context.beginPath();
      for (const [from, to] of edges.values()) {
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
      }
      context.strokeStyle = "#484848";
      context.lineWidth = strokeScale;
      context.stroke();
    }
    onGridLines?.(edges.size);
  } else {
    onGridLines?.(0);
  }

  if (!showAxes) return renderedGridCells;

  const colAxisStart = gridToScreen(-gridWidth / 2, 0);
  const colAxisEnd = gridToScreen(gridWidth / 2, 0);
  const rowAxisStart = gridToScreen(0, -gridHeight / 2);
  const rowAxisEnd = gridToScreen(0, gridHeight / 2);

  context.beginPath();
  context.moveTo(originX + colAxisStart.x, originY + colAxisStart.y);
  context.lineTo(originX + colAxisEnd.x, originY + colAxisEnd.y);
  context.strokeStyle = "#3b82f6";
  context.lineWidth = strokeScale;
  context.stroke();

  context.beginPath();
  context.moveTo(originX + rowAxisStart.x, originY + rowAxisStart.y);
  context.lineTo(originX + rowAxisEnd.x, originY + rowAxisEnd.y);
  context.strokeStyle = "#ef4444";
  context.lineWidth = strokeScale;
  context.stroke();

  const yAxisTipX = originX;
  const yAxisTipY = originY - 40;
  const arrowSize = 4;
  context.beginPath();
  context.moveTo(originX, originY);
  context.lineTo(yAxisTipX, yAxisTipY);
  context.strokeStyle = "#22c55e";
  context.lineWidth = strokeScale;
  context.stroke();

  context.beginPath();
  context.moveTo(yAxisTipX, yAxisTipY);
  context.lineTo(yAxisTipX - arrowSize / 2, yAxisTipY + arrowSize);
  context.moveTo(yAxisTipX, yAxisTipY);
  context.lineTo(yAxisTipX + arrowSize / 2, yAxisTipY + arrowSize);
  context.strokeStyle = "#22c55e";
  context.lineWidth = strokeScale;
  context.stroke();

  // Mark the world origin where the two grid axes meet.
  context.beginPath();
  context.arc(originX, originY, 3 * strokeScale, 0, Math.PI * 2);
  context.fillStyle = "#f5f5f5";
  context.fill();

  return renderedGridCells;
}
