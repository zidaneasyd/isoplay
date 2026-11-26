export const PLANE = Object.freeze({
  columns: 12,
  rows: 12,
  tileWidth: 64,
  tileHeight: 32,
  width: 768,
  height: 384,
  colors: Object.freeze({
    background: "#141414",
    tile: "#383838",
    grid: "#484848",
    active: "#6f5a93",
    activeStroke: "#9a86bd",
    hover: "#8f7438",
    hoverStroke: "#c3a85f",
  }),
});

const halfWidth = PLANE.tileWidth / 2;
const halfHeight = PLANE.tileHeight / 2;

export function tileCenter(row, column) {
  if (!Number.isInteger(row) || !Number.isInteger(column) ||
      row < 0 || row >= PLANE.rows || column < 0 || column >= PLANE.columns) {
    return null;
  }
  return {
    x: (column - row) * halfWidth,
    y: (column + row) * halfHeight + halfHeight,
  };
}

export function hitTestTile(planeX, planeY) {
  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      const center = tileCenter(row, column);
      const distance = Math.abs(planeX - center.x) / halfWidth +
        Math.abs(planeY - center.y) / halfHeight;
      if (distance <= 1 + 1 / halfWidth) return { row, column };
    }
  }
  return null;
}

export function toggleActiveTile(current, tile) {
  if (!tile) return current;
  if (current?.row === tile.row && current?.column === tile.column) return null;
  return { row: tile.row, column: tile.column };
}

export function drawPlane(context, { hoveredTile = null, activeTile = null } = {}, pixelRatio = 1) {
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
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

  // Draw every fill before any stroke, so neighboring cells cannot cover a
  // hover or active outline drawn earlier in the loop.
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
      context.lineWidth = 1;
      context.stroke();
    }
  }

  for (const [tile, color] of [
    [hoveredTile, PLANE.colors.hoverStroke],
    [activeTile, PLANE.colors.activeStroke],
  ]) {
    if (!tile) continue;
    traceTile(tile.row, tile.column);
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.stroke();
  }

  // Keep the outer boundary identical to the normal 1 px grid lines.
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(PLANE.width / 2, PLANE.height / 2);
  context.lineTo(0, PLANE.height);
  context.lineTo(-PLANE.width / 2, PLANE.height / 2);
  context.closePath();
  context.strokeStyle = PLANE.colors.grid;
  context.lineWidth = 1;
  context.stroke();
  context.restore();
}

export function initializePlane() {
  const canvas = document.querySelector("#plane");
  const context = canvas.getContext("2d");
  const readout = document.querySelector("#readout");
  let hoveredTile = null;
  let activeTile = null;

  function draw() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(PLANE.width * ratio);
    canvas.height = Math.round(PLANE.height * ratio);
    drawPlane(context, { hoveredTile, activeTile }, ratio);
  }

  function updateReadout() {
    if (hoveredTile) {
      readout.textContent = `Hover: Kolom ${hoveredTile.column + 1}, Baris ${hoveredTile.row + 1} [${hoveredTile.column}, ${hoveredTile.row}]`;
    } else if (activeTile) {
      readout.textContent = `Aktif: Kolom ${activeTile.column + 1}, Baris ${activeTile.row + 1} [${activeTile.column}, ${activeTile.row}]`;
    } else {
      readout.textContent = "Arahkan kursor ke tile";
    }
  }

  function updateHover(event) {
    const rect = canvas.getBoundingClientRect();
    const planeX = event.clientX - rect.left - rect.width / 2;
    const planeY = event.clientY - rect.top;
    const nextTile = hitTestTile(planeX, planeY);
    if (hoveredTile?.row !== nextTile?.row || hoveredTile?.column !== nextTile?.column) {
      hoveredTile = nextTile;
      updateReadout();
      draw();
    }
  }

  canvas.addEventListener("pointermove", updateHover);
  canvas.addEventListener("click", (event) => {
    updateHover(event);
    activeTile = toggleActiveTile(activeTile, hoveredTile);
    updateReadout();
    draw();
  });
  canvas.addEventListener("pointerleave", () => {
    if (hoveredTile) {
      hoveredTile = null;
      updateReadout();
      draw();
    }
  });

  draw();
}
