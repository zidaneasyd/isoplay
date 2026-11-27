import test from "node:test";
import assert from "node:assert/strict";
import { drawGrid } from "../src/js/renderer.js";
import { tileH, tileW } from "../src/js/isometric.js";

function createContext() {
  const calls = { fills: 0, strokes: 0, paths: [], cellPaths: [], currentPath: [] };
  const context = {
    beginPath() {
      if (calls.currentPath.length) calls.paths.push(calls.currentPath);
      calls.currentPath = [];
    },
    moveTo(x, y) { calls.currentPath.push([x, y]); },
    lineTo(x, y) { calls.currentPath.push([x, y]); },
    closePath() { calls.cellPaths.push([...calls.currentPath]); },
    arc() {},
    fill() { calls.fills += 1; },
    stroke() { calls.strokes += 1; },
  };
  return { calls, context };
}

test("drawGrid draws the requested cell count for multiple sizes", () => {
  for (const size of [1, 9, 31, 63]) {
    const { calls, context } = createContext();
    drawGrid(context, 800, 600, size);
    assert.equal(calls.fills, size * size + 1, `${size}x${size} grid plus origin marker`);
    assert.equal(calls.strokes, size * size + 4, `${size}x${size} cell edges plus axes`);
  }
});

test("drawGrid centers odd sized grid on the origin cell", () => {
  const { calls, context } = createContext();
  drawGrid(context, 800, 600, 9);
  calls.paths.push(calls.currentPath);
  const centers = calls.cellPaths
    .map(([top, right]) => [right[0] - tileW / 2, top[1] + tileH / 2]);

  assert.equal(centers.length, 81);
  assert.ok(centers.some(([x, y]) => x === 400 && y === 300));
});

test("drawGrid supports rectangular grids and places their center cell at canvas center", () => {
  const { calls, context } = createContext();
  drawGrid(context, 800, 600, 5, 3);
  calls.paths.push(calls.currentPath);
  const centers = calls.cellPaths
    .map(([top, right]) => [right[0] - tileW / 2, top[1] + tileH / 2]);

  assert.equal(calls.fills, 16);
  assert.equal(calls.strokes, 19);
  assert.ok(centers.some(([x, y]) => x === 400 && y === 300));
});
