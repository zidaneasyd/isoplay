import { screenToGrid } from "./isometric.js";

function tilesOnLine(start, end) {
  const tiles = [];
  let col = start.col;
  let row = start.row;
  const dx = Math.abs(end.col - col);
  const sx = col < end.col ? 1 : -1;
  const dy = -Math.abs(end.row - row);
  const sy = row < end.row ? 1 : -1;
  let error = dx + dy;

  while (true) {
    tiles.push({ col, row, height: 0 });
    if (col === end.col && row === end.row) break;
    const doubledError = 2 * error;
    if (doubledError >= dy) {
      error += dy;
      col += sx;
    }
    if (doubledError <= dx) {
      error += dx;
      row += sy;
    }
  }

  return tiles;
}

function sameTile(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.col === b.col && a.row === b.row
    && (a.height ?? 0) === (b.height ?? 0)
    && (a.color ?? null) === (b.color ?? null);
}

export function getTileAtPoint(point, width, height, gridSize) {
  if (!point) return null;

  const center = (gridSize - 1) / 2;
  const gridPosition = screenToGrid(point.x - width / 2, point.y - height / 2);
  const col = Math.round(gridPosition.col);
  const row = Math.round(gridPosition.row);

  return col >= -center && col <= center && row >= -center && row <= center
    ? { col, row, height: 0 }
    : null;
}

export function attachTileInteraction(canvas, {
  getCanvasSize,
  getGridSize,
  camera = { screenToWorld: (point) => point },
  getMultiSelect = () => false,
  selection,
  onHover = () => {},
  onSelectionChange = () => {},
}) {
  let pointer = null;
  let hoveredTile = null;
  let dragMode = null;
  let lastDragTile = null;

  function tileAtPointer() {
    if (!pointer) return null;
    const { width, height } = getCanvasSize();
    return getTileAtPoint(camera.screenToWorld(pointer, width, height), width, height, getGridSize());
  }

  function updateHover() {
    const nextTile = tileAtPointer();
    const unchanged = sameTile(hoveredTile, nextTile);
    hoveredTile = nextTile;
    if (unchanged) return;
    onHover(hoveredTile);
  }

  function canvasPoint(event) {
    const bounds = canvas.getBoundingClientRect?.() ?? { left: 0, top: 0 };
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function applySelection(tile, mode) {
    if (mode === "add") selection.add(tile);
    else selection.remove(tile);
  }

  function updateSelection(mode) {
    applySelection(tileAtPointer(), mode);
    onSelectionChange(selection.getTiles());
  }

  function updateDragSelection(mode) {
    const tile = tileAtPointer();
    if (!tile) {
      lastDragTile = null;
      return;
    }
    const path = lastDragTile ? tilesOnLine(lastDragTile, tile) : [tile];
    for (const pathTile of path) applySelection(pathTile, mode);
    lastDragTile = tile;
    onSelectionChange(selection.getTiles());
  }

  const listeners = {
    pointermove(event) {
      pointer = canvasPoint(event);
      updateHover();
      if (dragMode === "add" && !getMultiSelect()) {
        dragMode = null;
        lastDragTile = null;
      }
      if (dragMode === "add" && (event.buttons & 1)) updateDragSelection("add");
      if (dragMode === "remove" && (event.buttons & 2)) updateDragSelection("remove");
    },
    pointerleave() {
      if (!dragMode) {
        pointer = null;
        updateHover();
      }
    },
    pointerdown(event) {
      pointer = canvasPoint(event);
      updateHover();

      if (event.button === 2 && !getMultiSelect()) return;

      if (event.button === 0 && !getMultiSelect()) {
        selection.selectOnly(tileAtPointer());
        onSelectionChange(selection.getTiles());
        return;
      }

      const mode = event.button === 0 ? "add" : event.button === 2 ? "remove" : null;
      if (!mode) return;

      event.preventDefault();
      dragMode = mode;
      canvas.setPointerCapture?.(event.pointerId);
      updateSelection(mode);
      lastDragTile = tileAtPointer();
    },
    pointerup(event) {
      pointer = canvasPoint(event);
      updateHover();
      dragMode = null;
      lastDragTile = null;
    },
    pointercancel() { dragMode = null; lastDragTile = null; },
    lostpointercapture() { dragMode = null; lastDragTile = null; },
    contextmenu(event) { event.preventDefault(); },
  };

  for (const [name, listener] of Object.entries(listeners)) {
    canvas.addEventListener?.(name, listener);
  }

  return {
    getHoveredTile: () => hoveredTile,
    refreshHover: updateHover,
    dispose() {
      for (const [name, listener] of Object.entries(listeners)) {
        canvas.removeEventListener?.(name, listener);
      }
    },
  };
}
