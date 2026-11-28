import test from "node:test";
import assert from "node:assert/strict";
import { drawGrid, drawTiles, getVisibleTileBounds } from "../src/js/renderer.js";
import { tileH, tileW } from "../src/js/isometric.js";
import { createCamera } from "../src/js/camera.js";
import { createGridTiles } from "../src/js/grid-model.js";

function createContext() {
  const calls = { fills: 0, strokes: 0, strokePaths: [], currentPoints: [], currentLineCount: 0 };
  const context = {
    beginPath() {
      calls.currentPoints = [];
      calls.currentLineCount = 0;
    },
    moveTo(x, y) { calls.currentPoints.push([x, y]); },
    lineTo(x, y) {
      calls.currentPoints.push([x, y]);
      calls.currentLineCount += 1;
    },
    closePath() {},
    arc() {},
    fill() { calls.fills += 1; },
    stroke() {
      calls.strokes += 1;
      calls.strokePaths.push({ points: calls.currentPoints.slice(), lineCount: calls.currentLineCount });
    },
  };
  return { calls, context };
}

test("drawGrid strokes each shared tile edge only once", () => {
  for (const size of [1, 9, 31, 63]) {
    const { calls, context } = createContext();
    const rendered = drawGrid(context, 800, 600, size);
    const uniqueEdges = 2 * size * size + 2 * size;
    assert.equal(rendered, size * size);
    assert.equal(calls.fills, 1, `${size}x${size} grid has no tile fills`);
    assert.equal(calls.strokes, 5, `${size}x${size} grid has one grid stroke plus four axis strokes`);
    assert.equal(calls.strokePaths[0].lineCount, uniqueEdges);
  }
});

test("drawGrid centers the odd-sized grid at the canvas center", () => {
  const { calls, context } = createContext();
  drawGrid(context, 800, 600, 9);
  const points = calls.strokePaths[0].points;
  const centerCellCorners = [[400, 284], [432, 300], [400, 316], [368, 300]];

  assert.ok(centerCellCorners.every(([x, y]) => points.some((point) => point[0] === x && point[1] === y)));
});

test("drawGrid supports rectangular grids and draws each edge once", () => {
  const { calls, context } = createContext();
  const rendered = drawGrid(context, 800, 600, 5, 3);
  const points = calls.strokePaths[0].points;
  const centerCellCorners = [[400, 284], [432, 300], [400, 316], [368, 300]];

  assert.equal(rendered, 15);
  assert.equal(calls.fills, 1);
  assert.equal(calls.strokes, 5);
  assert.equal(calls.strokePaths[0].lineCount, 38);
  assert.ok(centerCellCorners.every(([x, y]) => points.some((point) => point[0] === x && point[1] === y)));
});

test("drawTiles paints solid diamonds from back to front by diagonal then height", () => {
  const fills = [];
  let center;
  const context = {
    beginPath() { center = null; },
    moveTo(x, y) { center = [x, y + tileH / 2]; },
    lineTo() {},
    closePath() {},
    fill() { fills.push({ center, color: context.fillStyle }); },
  };

  drawTiles(context, 400, 300, [
    { col: 1, row: 0, height: 0, color: "front" },
    { col: 0, row: 0, height: 1, color: "higher" },
    { col: 0, row: 0, height: 0, color: "back" },
  ]);

  assert.deepEqual(fills.map(({ color }) => color), ["back", "higher", "front"]);
  assert.deepEqual(fills[1].center, [200, 134]);
});

test("drawTiles can use pre-sorted tiles and falls back to the default color", () => {
  const fills = [];
  const context = {
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {},
    fill() { fills.push(context.fillStyle); },
  };
  const tiles = [
    { col: 1, row: 0, height: 0, color: "already first" },
    { col: 0, row: 0, height: 0 },
  ];

  drawTiles(context, 400, 300, tiles, { alreadySorted: true });

  assert.deepEqual(fills, ["already first", "#383838"]);
  assert.deepEqual(tiles.map(({ col, row }) => [col, row]), [[1, 0], [0, 0]]);
});

test("drawGrid hides axis guides and tile grid independently", () => {
  const gridOnly = createContext();
  const renderedGridCells = drawGrid(gridOnly.context, 800, 600, 3, 3, { showAxes: false, showGrid: true });
  assert.equal(renderedGridCells, 9);
  assert.equal(gridOnly.calls.strokes, 1);
  assert.equal(gridOnly.calls.strokePaths[0].lineCount, 24);
  assert.equal(gridOnly.calls.fills, 0);

  const axesOnly = createContext();
  drawGrid(axesOnly.context, 800, 600, 3, 3, { showAxes: true, showGrid: false });
  assert.equal(axesOnly.calls.strokes, 4);
  assert.equal(axesOnly.calls.fills, 1);

  const plain = createContext();
  drawGrid(plain.context, 800, 600, 3, 3, { showAxes: false, showGrid: false });
  assert.equal(plain.calls.strokes, 0);
  assert.equal(plain.calls.fills, 0);
});

test("drawGrid scales stroke width inversely to camera zoom", () => {
  const widths = [];
  const context = {
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, arc() {},
    fill() {},
    stroke() { widths.push(context.lineWidth); },
  };

  drawGrid(context, 800, 600, 3, 3, { strokeScale: 0.5 });

  assert.equal(widths.length, 5);
  assert.ok(widths.every((width) => width === 0.5));
});

test("drawTiles culls 100x100 tiles outside a zoomed viewport", () => {
  const camera = createCamera();
  const bounds = getVisibleTileBounds(camera, 800, 600);
  const { context } = createContext();
  const rendered = drawTiles(context, 800, 600, createGridTiles(100), {
    alreadySorted: true,
    bounds,
  });

  assert.ok(rendered > 0);
  assert.ok(rendered < 100 * 100);
});
