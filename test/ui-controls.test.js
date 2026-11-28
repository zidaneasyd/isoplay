import test from "node:test";
import assert from "node:assert/strict";
import { attachInspectorControls } from "../src/js/ui-controls.js";

function element(initial = {}) {
  const listeners = new Map();
  const classes = new Set();
  return {
    ...initial,
    listeners,
    classList: {
      toggle(name, force) {
        if (force ?? !classes.has(name)) classes.add(name);
        else classes.delete(name);
      },
      contains: (name) => classes.has(name),
    },
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(listener);
    },
    removeEventListener(name, listener) {
      listeners.set(name, (listeners.get(name) ?? []).filter((item) => item !== listener));
    },
    fire(name, event = {}) {
      for (const listener of listeners.get(name) ?? []) listener(event);
    },
    dispatchEvent(event) {
      this.fire(event.type, event);
      return true;
    },
    attributes: new Map(Object.entries(initial.attributes ?? {})),
    getAttribute(name) { return this.attributes.get(name) ?? null; },
    setAttribute(name, value) { this.attributes.set(name, value); },
  };
}

test("concept panel controls collapse, hide, and change odd grid sizes", () => {
  const panel = element();
  const panelToggle = element({ attributes: { "aria-expanded": "true" } });
  const worldToggle = element({ attributes: { "aria-expanded": "true" } });
  const worldInspectors = element();
  const stepper = element();
  const decrementButton = element();
  const incrementButton = element();
  const sizeInput = element({ value: "9" });
  const sizeLabel = { textContent: "9*" };
  const sizes = [];
  sizeInput.addEventListener("input", () => sizes.push(Number(sizeInput.value)));

  const controls = attachInspectorControls({
    panel, panelToggle, worldToggle, worldInspectors, stepper,
    decrementButton, incrementButton, sizeInput, sizeLabel,
  });

  panelToggle.fire("click");
  assert.equal(panel.classList.contains("is-hidden"), true);
  assert.equal(panelToggle.getAttribute("aria-expanded"), "false");
  panelToggle.fire("click");
  assert.equal(panel.classList.contains("is-hidden"), false);

  worldToggle.fire("click");
  assert.equal(worldInspectors.classList.contains("is-collapsed"), true);
  worldToggle.fire("click");
  assert.equal(worldInspectors.classList.contains("is-collapsed"), false);

  incrementButton.fire("click", { detail: 0 });
  assert.equal(sizeInput.value, "11");
  assert.equal(sizeLabel.textContent, "11*");
  assert.deepEqual(sizes, [11]);
  incrementButton.fire("pointerdown", { button: 0 });
  incrementButton.fire("pointerup");
  incrementButton.fire("click", { detail: 1, preventDefault() {} });
  assert.equal(sizeInput.value, "13", "a pointer click changes size only once");
  stepper.fire("keydown", { key: "ArrowUp", preventDefault() {} });
  assert.equal(sizeInput.value, "15");
  stepper.fire("wheel", { deltaY: 1, preventDefault() {} });
  assert.equal(sizeInput.value, "13");

  controls.dispose();
  assert.equal(panelToggle.listeners.get("click").length, 0);
});
