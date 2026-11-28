import test from "node:test";
import assert from "node:assert/strict";
import { createSelectionModel } from "../src/js/selection-model.js";

const tile = (col, row) => ({ col, row, height: 0 });

test("selection supports replace, add without duplicates, and remove", () => {
  const selection = createSelectionModel();
  const first = tile(0, 0);
  const second = tile(1, 0);

  selection.selectOnly(first);
  selection.add(first);
  selection.add(second);
  assert.equal(selection.size, 2);
  selection.remove(first);
  assert.deepEqual(selection.getTiles(), [second]);
  selection.selectOnly(first);
  assert.deepEqual(selection.getTiles(), [first]);
  selection.selectOnly(null);
  assert.equal(selection.size, 0);
});

test("selection trims tiles outside a resized grid and reports whether it changed", () => {
  const selection = createSelectionModel();
  selection.add(tile(4, 0));
  selection.add(tile(2, -2));

  assert.equal(selection.retainWithinGrid(5), true);
  assert.deepEqual(selection.getTiles(), [tile(2, -2)]);
  assert.equal(selection.retainWithinGrid(5), false);
});

test("selection values iterates selected tiles without building an array", () => {
  const selection = createSelectionModel();
  selection.add(tile(0, 0));
  selection.add(tile(1, 0));
  assert.deepEqual([...selection.values()].map(({ col, row }) => [col, row]), [[0, 0], [1, 0]]);
});
