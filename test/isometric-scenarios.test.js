import test from "node:test";
import assert from "node:assert/strict";
import { gridToScreen, screenToGrid } from "../src/js/isometric.js";

test("grid and screen transforms round-trip negative, positive, and fractional coordinates", () => {
  const coordinates = [-31, -4.5, -1, 0, 2.25, 9, 31];
  for (const col of coordinates) {
    for (const row of coordinates) {
      const screen = gridToScreen(col, row);
      const grid = screenToGrid(screen.x, screen.y);
      assert.ok(Math.abs(grid.col - col) < 1e-9, `column mismatch at (${col}, ${row})`);
      assert.ok(Math.abs(grid.row - row) < 1e-9, `row mismatch at (${col}, ${row})`);
    }
  }
});

test("world origin maps to screen origin", () => {
  assert.deepEqual(gridToScreen(0, 0), { x: 0, y: 0 });
  assert.deepEqual(screenToGrid(0, 0), { col: 0, row: 0 });
});

test("isometric projection preserves expected axis directions", () => {
  assert.deepEqual(gridToScreen(1, 0), { x: 32, y: 16 });
  assert.deepEqual(gridToScreen(0, 1), { x: -32, y: 16 });
  assert.deepEqual(gridToScreen(-1, 0), { x: -32, y: -16 });
  assert.deepEqual(gridToScreen(0, -1), { x: 32, y: -16 });
});
