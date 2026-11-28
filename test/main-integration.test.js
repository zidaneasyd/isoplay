import test from "node:test";
import assert from "node:assert/strict";

test("application startup wires resize, grid input, and render loop", async () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalRaf = globalThis.requestAnimationFrame;
  const listeners = new Map();
  const frames = [];
  const calls = { transforms: [], clears: [], fills: 0, strokes: 0, fillStyles: [], strokeStyles: [] };
  const context = {
    setTransform: (...args) => calls.transforms.push(args),
    clearRect: (...args) => calls.clears.push(args),
    save() {}, restore() {}, translate() {}, scale() {},
    beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, arc() {},
    fill() { calls.fills += 1; calls.fillStyles.push(context.fillStyle); },
    stroke() { calls.strokes += 1; calls.strokeStyles.push(context.strokeStyle); },
  };
  const canvasListeners = new Map();
  const canvas = {
    width: 0,
    height: 0,
    style: {},
    addEventListener(name, listener) {
      if (!canvasListeners.has(name)) canvasListeners.set(name, []);
      canvasListeners.get(name).push(listener);
    },
    getBoundingClientRect() { return { left: 0, top: 0 }; },
    getContext(type) { assert.equal(type, "2d"); return context; },
  };
  const sliderListeners = new Map();
  const slider = {
    value: "9",
    addEventListener(name, listener) { sliderListeners.set(name, listener); },
  };
  const output = {};
  const hoverOutput = {};
  const activeOutput = {};
  const fireCanvas = (name, event = {}) => {
    for (const listener of canvasListeners.get(name) ?? []) listener(event);
  };
  function makeToggle(checked) {
    const listeners = new Map();
    return {
      checked,
      addEventListener(name, listener) { listeners.set(name, listener); },
      dispatch(name) { listeners.get(name)?.(); },
    };
  }
  const axesToggle = makeToggle(true);
  const gridToggle = makeToggle(true);
  const multiSelectToggle = makeToggle(false);
  globalThis.document = {
    getElementById(id) {
      return ({
        canvas,
        "grid-size": slider,
        "grid-size-value": output,
        "show-axes": axesToggle,
        "show-grid": gridToggle,
        "multi-select": multiSelectToggle,
        "hover-coordinates": hoverOutput,
        "active-coordinates": activeOutput,
      })[id];
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
    await import(`../src/js/main.js?test=${Date.now()}`);

    assert.deepEqual([canvas.width, canvas.height], [1600, 1200]);
    assert.deepEqual(calls.transforms, [[2, 0, 0, 2, 0, 0]]);
    assert.equal(output.value, "9 \u00d7 9");
    assert.equal(axesToggle.checked, true);
    assert.equal(gridToggle.checked, true);
    assert.equal(canvas.style.cursor, "");
    assert.ok(listeners.has("resize"));
    assert.ok(listeners.has("wheel"));
    assert.ok(canvasListeners.has("wheel"), "camera controls attach canvas zoom");
    assert.equal(frames.length, 1);

    frames.shift()(1000);
    assert.deepEqual(calls.clears[0], [0, 0, 800, 600]);
    assert.equal(calls.fills, 3, "base tile fills are batched, with the origin marker");

    fireCanvas("pointermove", { clientX: 400, clientY: 300 });
    frames.shift()(1008);
    assert.equal(hoverOutput.textContent, "(0, 0)");
    assert.equal(calls.fillStyles.at(-1), "rgba(189, 121, 82, 0.5)");

    axesToggle.checked = false;
    const strokesBeforeAxesToggle = calls.strokes;
    frames.shift()(1016);
    assert.equal(calls.strokes - strokesBeforeAxesToggle, 3, "visible tile outlines are batched while axes are hidden");
    assert.equal(calls.strokeStyles.at(-1), "rgba(255, 184, 138, 0.5)");

    gridToggle.checked = false;
    gridToggle.dispatch("change");
    const strokesBeforePlain = calls.strokes;
    frames.shift()(1024);
    assert.equal(calls.strokes - strokesBeforePlain, 1, "only the hover outline remains on a plain plane");

    multiSelectToggle.checked = true;
    multiSelectToggle.dispatch("change");
    assert.equal(canvas.style.cursor, "crosshair");
    fireCanvas("pointerdown", { clientX: 432, clientY: 316, button: 0, pointerId: 1, preventDefault() {} });
    fireCanvas("pointermove", { clientX: 400, clientY: 300, buttons: 1 });
    fireCanvas("pointerup", { clientX: 400, clientY: 300 });
    frames.shift()(1032);
    assert.equal(hoverOutput.textContent, "(0, 0)");
    assert.equal(activeOutput.textContent, "2 tile aktif");
    assert.equal(calls.fillStyles.at(-1), "rgba(153, 132, 194, 0.5)");
    assert.equal(calls.strokeStyles.at(-1), "rgba(211, 198, 255, 0.5)");

    fireCanvas("pointerdown", { clientX: 368, clientY: 284, button: 0, pointerId: 4, preventDefault() {} });
    fireCanvas("pointerup", { clientX: 368, clientY: 284 });
    frames.shift()(1034);
    assert.equal(activeOutput.textContent, "3 tile aktif", "multi-select click adds to the existing selection");

    fireCanvas("pointerdown", { clientX: 400, clientY: 300, button: 2, shiftKey: false, pointerId: 2, preventDefault() {} });
    fireCanvas("pointermove", { clientX: 432, clientY: 316, buttons: 2 });
    fireCanvas("pointerup", { clientX: 432, clientY: 316 });
    frames.shift()(1036);
    assert.equal(activeOutput.textContent, "1 tile aktif (-1, 0)", "right-drag removes only the tiles on its path");

    multiSelectToggle.checked = false;
    multiSelectToggle.dispatch("change");
    assert.equal(canvas.style.cursor, "");
    assert.equal(activeOutput.textContent, "0 tile aktif", "turning off multi-select clears its selection");
    fireCanvas("pointerdown", { clientX: 432, clientY: 316, button: 0, pointerId: 3 });
    fireCanvas("pointerup", { clientX: 432, clientY: 316 });
    frames.shift()(1038);
    assert.equal(activeOutput.textContent, "1 tile aktif (1, 0)");

    fireCanvas("pointerdown", { clientX: 400, clientY: 300, button: 2, pointerId: 5, preventDefault() {} });
    fireCanvas("pointerup", { clientX: 400, clientY: 300 });
    assert.equal(activeOutput.textContent, "1 tile aktif (1, 0)", "right click preserves a single selection outside multi-select mode");

    fireCanvas("pointerleave");
    frames.shift()(1040);
    assert.equal(hoverOutput.textContent, "—");
    assert.equal(activeOutput.textContent, "1 tile aktif (1, 0)");

    slider.value = "11";
    sliderListeners.get("input")();
    assert.equal(output.value, "11 \u00d7 11");
    window.innerWidth = 1024;
    window.innerHeight = 768;
    listeners.get("resize")();
    assert.deepEqual([canvas.width, canvas.height], [2048, 1536]);

    const fillsBeforeResizeFrame = calls.fills;
    frames.shift()(1056);
    assert.deepEqual(calls.clears[9], [0, 0, 1024, 768]);
    assert.equal(calls.fills - fillsBeforeResizeFrame, 3, "base tile fills are batched with the selected tile");
  } finally {
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalRaf === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = originalRaf;
  }
});
