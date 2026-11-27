import test from "node:test";
import assert from "node:assert/strict";
import { startRenderLoop } from "./src/js/animation.js";

function withAnimationFrame(callback) {
  const original = globalThis.requestAnimationFrame;
  const queued = [];
  globalThis.requestAnimationFrame = (frame) => { queued.push(frame); return queued.length; };
  try { callback(queued); }
  finally {
    if (original === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = original;
  }
}

test("render loop reports zero on its first frame and elapsed seconds afterward", () => {
  withAnimationFrame((queued) => {
    const deltas = [];
    assert.equal(startRenderLoop((dt) => deltas.push(dt)), 1);
    queued.shift()(1000);
    queued.shift()(1016);
    queued.shift()(1066);
    assert.deepEqual(deltas, [0, 0.016, 0.05]);
    assert.equal(queued.length, 1);
  });
});

test("render loop preserves a long frame gap in delta time", () => {
  withAnimationFrame((queued) => {
    const deltas = [];
    startRenderLoop((dt) => deltas.push(dt));
    queued.shift()(0);
    queued.shift()(2500);
    assert.deepEqual(deltas, [0, 2.5]);
  });
});
