function tileKey(tile) {
  return `${tile.col},${tile.row}`;
}

export function createSelectionModel() {
  const tiles = new Map();
  const heights = new Map();
  let revision = 0;

  function adjustHeight(tile, amount) {
    const height = tile.height ?? 0;
    const nextCount = (heights.get(height) ?? 0) + amount;
    if (nextCount === 0) heights.delete(height);
    else heights.set(height, nextCount);
  }

  function sameTile(a, b) {
    return a.col === b.col && a.row === b.row
      && (a.height ?? 0) === (b.height ?? 0)
      && (a.color ?? null) === (b.color ?? null);
  }

  return {
    selectOnly(tile) {
      const key = tile ? tileKey(tile) : null;
      const current = key === null ? null : tiles.get(key);
      if (tiles.size === (tile ? 1 : 0) && (!tile || (current && sameTile(current, tile)))) {
        if (tile) tiles.set(key, tile);
        return false;
      }
      tiles.clear();
      heights.clear();
      if (tile) {
        tiles.set(key, tile);
        adjustHeight(tile, 1);
      }
      revision += 1;
      return true;
    },
    add(tile) {
      if (!tile) return false;
      const key = tileKey(tile);
      const current = tiles.get(key);
      tiles.set(key, tile);
      if (current && sameTile(current, tile)) return false;
      if (current) adjustHeight(current, -1);
      adjustHeight(tile, 1);
      revision += 1;
      return true;
    },
    remove(tile) {
      if (!tile) return false;
      const key = tileKey(tile);
      const current = tiles.get(key);
      if (!current || !tiles.delete(key)) return false;
      adjustHeight(current, -1);
      revision += 1;
      return true;
    },
    clear() {
      if (tiles.size === 0) return false;
      tiles.clear();
      heights.clear();
      revision += 1;
      return true;
    },
    retainWithinGrid(gridSize) {
      const center = (gridSize - 1) / 2;
      let changed = false;
      for (const [key, tile] of tiles) {
        if (Math.abs(tile.col) > center || Math.abs(tile.row) > center) {
          tiles.delete(key);
          adjustHeight(tile, -1);
          changed = true;
        }
      }
      if (changed) revision += 1;
      return changed;
    },
    getTiles() {
      return [...tiles.values()];
    },
    values() {
      return tiles.values();
    },
    getRevision() {
      return revision;
    },
    has(tile) {
      if (!tile) return false;
      const selected = tiles.get(tileKey(tile));
      return Boolean(selected && (selected.height ?? 0) === (tile.height ?? 0));
    },
    hasUniformHeight() {
      return heights.size <= 1;
    },
    get size() {
      return tiles.size;
    },
  };
}
