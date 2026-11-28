import test from "node:test";
import assert from "node:assert/strict";
import { drawGrid } from "../src/js/renderer.js";

test("drawGrid draws only grid lines, axes, and the origin marker", () => {
  const calls = { fills: 0, strokes: 0 };
  const context = {
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    arc() {},
    fill() { calls.fills += 1; },
    stroke() { calls.strokes += 1; },
  };

  drawGrid(context, 640, 480, 4);

  assert.equal(calls.fills, 1);
  assert.equal(calls.strokes, 5);
});
