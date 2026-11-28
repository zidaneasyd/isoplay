// Tile dimensions and projection coordinates use world units, independent of devicePixelRatio.
export const tileW = 64;
export const tileH = 32;

export function gridToScreen(col, row) {
  return {
    x: (col - row) * tileW / 2,
    y: (col + row) * tileH / 2
  };
}

export function screenToGrid(x, y) {
  return {
    col: x / tileW + y / tileH,
    row: y / tileH - x / tileW
  };
}
