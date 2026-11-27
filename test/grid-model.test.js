import test from "node:test";
import assert from "node:assert/strict";
import { createGridTiles } from "../src/js/grid-model.js";

test("createGridTiles centers odd grids and gives every tile a solid base", () => {
  const tiles = createGridTiles(3, "slate");
  assert.equal(tiles.length, 9);
  assert.deepEqual(tiles[0], { col: -1, row: -1, height: 0, color: "slate" });
  assert.ok(tiles.some(({ col, row }) => col === 0 && row === 0));
  assert.deepEqual(tiles.at(-1), { col: 1, row: 1, height: 0, color: "slate" });
});

test("createGridTiles handles one cell and the maximum configured grid", () => {
  assert.deepEqual(createGridTiles(1), [{ col: 0, row: 0, height: 0, color: "#383838" }]);
  assert.equal(createGridTiles(63).length, 3969);
});
