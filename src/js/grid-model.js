export function createGridTiles(gridSize, color = "#383838") {
  const center = (gridSize - 1) / 2;
  const tiles = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      tiles.push({
        col: col - center,
        row: row - center,
        height: 0,
        color,
      });
    }
  }

  return tiles.sort((a, b) =>
    (a.col + a.row) - (b.col + b.row)
    || a.height - b.height
    || a.col - b.col
    || a.row - b.row
  );
}
