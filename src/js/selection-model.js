function tileKey(tile) {
  return `${tile.col},${tile.row}`;
}

export function createSelectionModel() {
  const tiles = new Map();

  return {
    selectOnly(tile) {
      tiles.clear();
      if (tile) tiles.set(tileKey(tile), tile);
    },
    add(tile) {
      if (tile) tiles.set(tileKey(tile), tile);
    },
    remove(tile) {
      if (tile) tiles.delete(tileKey(tile));
    },
    clear() {
      tiles.clear();
    },
    retainWithinGrid(gridSize) {
      const center = (gridSize - 1) / 2;
      let changed = false;
      for (const [key, tile] of tiles) {
        if (Math.abs(tile.col) > center || Math.abs(tile.row) > center) {
          tiles.delete(key);
          changed = true;
        }
      }
      return changed;
    },
    getTiles() {
      return [...tiles.values()];
    },
    get size() {
      return tiles.size;
    },
  };
}
