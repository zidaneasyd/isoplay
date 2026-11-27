export function createTileInfoPanel(hoverOutput, activeOutput) {
  let previousHover = null;
  let previousActive = null;

  function showHover(tile) {
    const value = tile ? `(${tile.col}, ${tile.row})` : "—";
    if (hoverOutput && value !== previousHover) hoverOutput.textContent = value;
    previousHover = value;
  }

  function showActive(tiles) {
    let value;
    if (tiles.length === 1) {
      const [tile] = tiles;
      value = `1 tile aktif (${tile.col}, ${tile.row})`;
    } else {
      value = `${tiles.length} tile aktif`;
    }
    if (activeOutput && value !== previousActive) activeOutput.textContent = value;
    previousActive = value;
  }

  showHover(null);
  showActive([]);
  return { showHover, showActive };
}
