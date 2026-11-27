import test from "node:test";
import assert from "node:assert/strict";
import { gridToScreen, screenToGrid, tileW, tileH } from "../src/js/isometric.js";

test("grid and screen conversion round-trips every cell in a 4x4 grid", () => {
  for (let col = 0; col < 4; col += 1) {
    for (let row = 0; row < 4; row += 1) {
      const screen = gridToScreen(col, row);
      const grid = screenToGrid(screen.x, screen.y);

      assert.ok(Math.abs(grid.col - col) < 1e-9, `column mismatch at (${col}, ${row})`);
      assert.ok(Math.abs(grid.row - row) < 1e-9, `row mismatch at (${col}, ${row})`);
    }
  }
});

test("(3, 3) maps to the center line at the expected vertical offset", () => {
  assert.deepEqual(gridToScreen(3, 3), { x: 0, y: 96 });
  assert.deepEqual(screenToGrid(0, 96), { col: 3, row: 3 });
});

test("tile dimensions are 64 by 32 pixels", () => {
  assert.equal(tileW, 64);
  assert.equal(tileH, 32);
});
