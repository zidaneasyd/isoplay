import test from "node:test";
import assert from "node:assert/strict";
import { preventBrowserZoom } from "../src/js/browser-controls.js";

function createWindowStub() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(name, listener, options) { listeners.set(name, { listener, options }); },
  };
}

function withWindow(value, callback) {
  const original = globalThis.window;
  globalThis.window = value;
  try { callback(); }
  finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
}

function makeEvent(properties = {}) {
  return { prevented: false, preventDefault() { this.prevented = true; }, ...properties };
}

test("zoom prevention registers wheel, key, and gesture listeners", () => {
  withWindow(createWindowStub(), () => {
    preventBrowserZoom();
    assert.deepEqual([...window.listeners.keys()], [
      "wheel", "keydown", "gesturestart", "gesturechange", "gestureend",
    ]);
    assert.deepEqual(window.listeners.get("wheel").options, { passive: false, capture: true });
    assert.equal(window.listeners.get("keydown").options, true);
    for (const name of ["gesturestart", "gesturechange", "gestureend"]) {
      assert.deepEqual(window.listeners.get(name).options, { passive: false });
    }
  });
});

test("wheel zoom is blocked for Ctrl or Meta while ordinary wheel is allowed", () => {
  withWindow(createWindowStub(), () => {
    preventBrowserZoom();
    const listener = window.listeners.get("wheel").listener;
    for (const props of [{ ctrlKey: true }, { metaKey: true }, { ctrlKey: true, metaKey: true }]) {
      const zoom = makeEvent(props);
      listener(zoom);
      assert.equal(zoom.prevented, true);
    }
    const ordinary = makeEvent({ ctrlKey: false, metaKey: false });
    listener(ordinary);
    assert.equal(ordinary.prevented, false);
  });
});

test("keyboard zoom shortcuts are blocked only when modified by Ctrl or Meta", () => {
  withWindow(createWindowStub(), () => {
    preventBrowserZoom();
    const listener = window.listeners.get("keydown").listener;
    for (const key of ["+", "=", "-", "_", "0"]) {
      for (const modifier of ["ctrlKey", "metaKey"]) {
        const zoom = makeEvent({ key, [modifier]: true });
        listener(zoom);
        assert.equal(zoom.prevented, true, `${modifier} + ${key}`);
      }
    }
    for (const props of [
      { key: "+" }, { key: "0" }, { key: "1", ctrlKey: true }, { key: "a", metaKey: true },
    ]) {
      const ordinary = makeEvent(props);
      listener(ordinary);
      assert.equal(ordinary.prevented, false, JSON.stringify(props));
    }
  });
});

test("all browser gesture events are prevented", () => {
  withWindow(createWindowStub(), () => {
    preventBrowserZoom();
    for (const name of ["gesturestart", "gesturechange", "gestureend"]) {
      const gesture = makeEvent();
      window.listeners.get(name).listener(gesture);
      assert.equal(gesture.prevented, true, name);
    }
  });
});
