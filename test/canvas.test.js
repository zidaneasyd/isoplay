import test from "node:test";
import assert from "node:assert/strict";
import { createCanvas } from "../src/js/canvas.js";

function withWindow(value, callback) {
  const original = globalThis.window;
  globalThis.window = value;
  try { callback(); }
  finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
}

function makeCanvas() {
  const transforms = [];
  const context = { setTransform: (...args) => transforms.push(args) };
  return {
    context,
    transforms,
    canvas: { width: 0, height: 0, getContext: (type) => {
      assert.equal(type, "2d");
      return context;
    } },
  };
}

test("canvas size and backing store scale with device pixel ratio", () => {
  withWindow({ innerWidth: 800, innerHeight: 600, devicePixelRatio: 2 }, () => {
    const { canvas, context, transforms } = makeCanvas();
    const result = createCanvas(canvas);
    assert.deepEqual(result.getSize(), { width: 0, height: 0 });
    result.resize();
    assert.equal(result.context, context);
    assert.equal(canvas.width, 1600);
    assert.equal(canvas.height, 1200);
    assert.deepEqual(result.getSize(), { width: 800, height: 600 });
    assert.deepEqual(transforms, [[2, 0, 0, 2, 0, 0]]);
  });
});

test("canvas rounds fractional backing sizes and refreshes on resize", () => {
  withWindow({ innerWidth: 801, innerHeight: 599, devicePixelRatio: 1.5 }, () => {
    const { canvas, transforms } = makeCanvas();
    const result = createCanvas(canvas);
    result.resize();
    assert.deepEqual([canvas.width, canvas.height], [1202, 899]);
    window.innerWidth = 320;
    window.innerHeight = 240;
    result.resize();
    assert.deepEqual(result.getSize(), { width: 320, height: 240 });
    assert.deepEqual([canvas.width, canvas.height], [480, 360]);
    assert.equal(transforms.length, 2);
  });
});

test("canvas uses a pixel ratio of one when it is missing or zero", () => {
  for (const ratio of [undefined, 0]) {
    withWindow({ innerWidth: 400, innerHeight: 300, devicePixelRatio: ratio }, () => {
      const { canvas, transforms } = makeCanvas();
      createCanvas(canvas).resize();
      assert.deepEqual([canvas.width, canvas.height], [400, 300]);
      assert.deepEqual(transforms, [[1, 0, 0, 1, 0, 0]]);
    });
  }
});
