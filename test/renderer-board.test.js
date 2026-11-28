import test from "node:test";
import assert from "node:assert/strict";
import { createBoardGeometry, drawBoard, drawTileBatch, getVisibleTileBounds } from "../src/js/renderer.js";
import { createCamera } from "../src/js/camera.js";

class FakePath {
  constructor() { this.commands = []; }
  moveTo(x, y) { this.commands.push(["M", x, y]); }
  lineTo(x, y) { this.commands.push(["L", x, y]); }
  closePath() { this.commands.push(["Z"]); }
}

function contextMock() {
  const calls = [];
  let lineCount = 0;
  return {
    calls,
    save() { calls.push(["save"]); },
    restore() { calls.push(["restore"]); },
    translate(x, y) { calls.push(["translate", x, y]); },
    beginPath() { lineCount = 0; calls.push(["beginPath"]); },
    moveTo(x, y) { calls.push(["moveTo", x, y]); },
    lineTo(x, y) { lineCount += 1; calls.push(["lineTo", x, y]); },
    closePath() { calls.push(["closePath"]); },
    fill(path) { calls.push(["fill", this.fillStyle, path ?? null]); },
    stroke(path) { calls.push(["stroke", this.strokeStyle, this.lineWidth, path ?? null, lineCount]); },
  };
}

test("cached board geometry scales with grid edges and is centered", () => {
  const { board, lines, lineCount } = createBoardGeometry(3, FakePath);
  assert.equal(lineCount, 8);
  assert.equal(lines.commands.filter(([command]) => command === "M").length, 8);
  assert.deepEqual(board.commands, [
    ["M", 0, -48], ["L", 96, 0], ["L", 0, 48], ["L", -96, 0], ["Z"],
  ]);
});

test("drawBoard paints the base and grid in one fill and one stroke", () => {
  const context = contextMock();
  const geometry = createBoardGeometry(5, FakePath);
  drawBoard(context, 800, 600, geometry, { fillColor: "stone", strokeColor: "#484848", strokeWidth: 0.5 });
  assert.deepEqual(context.calls.map(([name]) => name), ["save", "translate", "fill", "stroke", "restore"]);
  assert.deepEqual(context.calls[1], ["translate", 400, 300]);
  assert.equal(context.calls[2][1], "stone");
  assert.equal(context.calls[2][2], geometry.board);
  assert.equal(context.calls[3][2], 0.5);
  assert.equal(context.calls[3][3], geometry.lines);
});

test("selection tile batching culls offscreen entries and paints once", () => {
  const context = contextMock();
  const bounds = getVisibleTileBounds(createCamera(), 800, 600);
  const count = drawTileBatch(context, 800, 600, [
    { col: 0, row: 0 },
    { col: 500, row: 500 },
  ], { bounds, fillColor: "rgba(1, 2, 3, 0.5)", strokeColor: "white" });

  assert.equal(count, 1);
  assert.equal(context.calls.filter(([name]) => name === "fill").length, 1);
  assert.equal(context.calls.filter(([name]) => name === "stroke").length, 1);
  assert.equal(context.calls.filter(([name]) => name === "closePath").length, 1);
});

test("selection outlines stroke a shared edge between adjacent tiles only once", () => {
  const context = contextMock();
  const count = drawTileBatch(context, 800, 600, [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
  ], { fillColor: "purple", strokeColor: "white" });

  assert.equal(count, 2);
  const stroke = context.calls.findLast(([name]) => name === "stroke");
  assert.equal(stroke[4], 7, "two adjacent diamonds have seven unique edges, not eight");
});

test("drawTileBatch handles missing heights and skips painting when all tiles are culled", () => {
  const context = contextMock();
  assert.equal(drawTileBatch(context, 800, 600, [{ col: 0, row: 0 }], { fillColor: "x" }), 1);
  assert.equal(context.calls[1][2], 284);

  const bounds = getVisibleTileBounds(createCamera(), 800, 600);
  const empty = contextMock();
  assert.equal(drawTileBatch(empty, 800, 600, [{ col: 500, row: 500 }], { bounds, fillColor: "x" }), 0);
  assert.equal(empty.calls.some(([name]) => name === "fill"), false);
});
