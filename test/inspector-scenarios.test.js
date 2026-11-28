import test from "node:test";
import assert from "node:assert/strict";
import { createInspector } from "../src/js/inspector.js";

function makeInput(value) {
  const listeners = new Map();
  return {
    value: String(value),
    addEventListener(name, callback) { listeners.set(name, callback); },
    dispatch(name) { listeners.get(name)?.(); },
  };
}

test("inspector reflects each valid slider value and each input event", () => {
  const input = makeInput(9);
  const output = {};
  const inspector = createInspector(input, output);

  for (let size = 9; size <= 63; size += 2) {
    input.value = String(size);
    input.dispatch("input");
    assert.equal(inspector.getGridSize(), size);
    assert.equal(output.value, `${size} \u00d7 ${size}`);
    assert.equal(output.textContent, output.value);
  }
});

test("inspector changes only when the input event fires", () => {
  const input = makeInput(9);
  const output = {};
  const inspector = createInspector(input, output);

  input.value = "13";
  assert.equal(inspector.getGridSize(), 9);
  assert.equal(output.value, "9 \u00d7 9");

  input.dispatch("input");
  assert.equal(inspector.getGridSize(), 13);
  assert.equal(output.value, "13 \u00d7 13");
});
