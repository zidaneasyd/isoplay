import test from "node:test";
import assert from "node:assert/strict";
import { createInspector } from "../src/js/inspector.js";

function createInput(value) {
  const listeners = new Map();
  return {
    value: String(value),
    addEventListener(name, listener) { listeners.set(name, listener); },
    dispatch(name) { listeners.get(name)?.(); },
  };
}

test("inspector initializes its reported size from the slider", () => {
  const input = createInput(9);
  const output = {};
  const inspector = createInspector(input, output);

  assert.equal(inspector.getGridSize(), 9);
  assert.equal(output.value, "9 \u00d7 9");
  assert.equal(output.textContent, "9 \u00d7 9");
});

test("inspector updates the grid size and output when the slider changes", () => {
  const input = createInput(9);
  const output = {};
  const inspector = createInspector(input, output);

  for (const size of [11, 31, 63]) {
    input.value = String(size);
    input.dispatch("input");
    assert.equal(inspector.getGridSize(), size);
    assert.equal(output.value, `${size} \u00d7 ${size}`);
    assert.equal(output.textContent, output.value);
  }
});
