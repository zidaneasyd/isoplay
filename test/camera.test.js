import test from "node:test";
import assert from "node:assert/strict";
import { attachCameraControls, createCamera } from "../src/js/camera.js";

function makeCanvas() {
  const listeners = new Map();
  const captured = [];
  return {
    listeners,
    captured,
    style: {},
    addEventListener(name, listener, options) { listeners.set(name, { listener, options }); },
    removeEventListener(name) { listeners.delete(name); },
    setPointerCapture(id) { captured.push(id); },
    getBoundingClientRect() { return { left: 10, top: 20 }; },
  };
}

test("camera world and screen transforms round-trip through pan and zoom", () => {
  const camera = createCamera();
  const viewport = { width: 800, height: 600 };
  const point = { x: 475, y: 215 };

  camera.panBy(42, -18);
  camera.zoomAt(1.75, { x: 280, y: 360 }, viewport.width, viewport.height);

  const screen = camera.worldToScreen(point, viewport.width, viewport.height);
  const world = camera.screenToWorld(screen, viewport.width, viewport.height);
  assert.ok(Math.abs(world.x - point.x) < 1e-9);
  assert.ok(Math.abs(world.y - point.y) < 1e-9);
});

test("zoom stays anchored under the pointer and clamps to the configured range", () => {
  const camera = createCamera({ minZoom: 0.5, maxZoom: 3 });
  const viewport = { width: 800, height: 600 };
  const anchor = { x: 230, y: 170 };

  camera.zoomAt(2, anchor, viewport.width, viewport.height);
  assert.deepEqual(camera.worldToScreen(camera.screenToWorld(anchor, 800, 600), 800, 600), anchor);
  assert.equal(camera.zoomAt(20, anchor, 800, 600), 3);
  assert.equal(camera.zoomAt(0.1, anchor, 800, 600), 0.5);

  camera.reset();
  assert.deepEqual(camera.getState(), { offsetX: 0, offsetY: 0, zoom: 1 });
});

test("camera controls zoom with the wheel and pan with middle-button drag", () => {
  const canvas = makeCanvas();
  const camera = createCamera();
  const changes = [];
  const controls = attachCameraControls(canvas, {
    camera,
    getCanvasSize: () => ({ width: 800, height: 600 }),
    onChange: () => changes.push(camera.getState()),
    getDefaultCursor: () => "crosshair",
  });
  const fire = (name, event) => canvas.listeners.get(name).listener(event);
  const wheel = {
    clientX: 410,
    clientY: 320,
    deltaY: -100,
    preventDefault() { this.prevented = true; },
  };

  fire("wheel", wheel);
  assert.equal(wheel.prevented, true);
  assert.ok(camera.getState().zoom > 1);
  assert.deepEqual(canvas.listeners.get("wheel").options, { passive: false });

  fire("pointerdown", {
    button: 1,
    pointerId: 4,
    clientX: 410,
    clientY: 320,
    preventDefault() { this.prevented = true; },
  });
  assert.equal(canvas.style.cursor, "grabbing");
  fire("pointermove", { pointerId: 4, clientX: 430, clientY: 350 });
  assert.deepEqual(camera.getState(), { offsetX: 20, offsetY: 30, zoom: Math.exp(0.1) });
  assert.deepEqual(canvas.captured, [4]);

  fire("pointerup", { pointerId: 4 });
  assert.equal(canvas.style.cursor, "crosshair");
  assert.equal(changes.length, 2);
  controls.dispose();
  assert.equal(canvas.listeners.size, 0);
});
