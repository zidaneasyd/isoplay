import test from "node:test";
import assert from "node:assert/strict";

test("application startup wires resize, grid input, and render loop", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalRaf = globalThis.requestAnimationFrame;
  const listeners = new Map();
  const frames = [];
  const calls = { transforms: [], clears: [], fills: 0, strokes: 0 };
  const context = {
    setTransform: (...args) => calls.transforms.push(args),
    clearRect: (...args) => calls.clears.push(args),
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, arc() {},
    fill() { calls.fills += 1; },
    stroke() { calls.strokes += 1; },
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext(type) { assert.equal(type, "2d"); return context; },
  };
  const sliderListeners = new Map();
  const slider = {
    value: "9",
    addEventListener(name, listener) { sliderListeners.set(name, listener); },
  };
  const output = {};
  globalThis.document = {
    getElementById(id) {
      return ({ canvas, "grid-size": slider, "grid-size-value": output })[id];
    },
  };
  globalThis.window = {
    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 2,
    addEventListener(name, listener) { listeners.set(name, listener); },
  };
  globalThis.requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };

  try {
    await import(`./src/js/main.js?test=${Date.now()}`);

    assert.deepEqual([canvas.width, canvas.height], [1600, 1200]);
    assert.deepEqual(calls.transforms, [[2, 0, 0, 2, 0, 0]]);
    assert.equal(output.value, "9 \u00d7 9");
    assert.ok(listeners.has("resize"));
    assert.ok(listeners.has("wheel"));
    assert.equal(frames.length, 1);

    frames.shift()(1000);
    assert.deepEqual(calls.clears[0], [0, 0, 800, 600]);
    assert.equal(calls.fills, 9 * 9 + 1);

    slider.value = "11";
    sliderListeners.get("input")();
    assert.equal(output.value, "11 \u00d7 11");
    window.innerWidth = 1024;
    window.innerHeight = 768;
    listeners.get("resize")();
    assert.deepEqual([canvas.width, canvas.height], [2048, 1536]);

    frames.shift()(1016);
    assert.deepEqual(calls.clears[1], [0, 0, 1024, 768]);
    assert.equal(calls.fills, (9 * 9 + 1) + (11 * 11 + 1));
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalRaf === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = originalRaf;
  }
});
