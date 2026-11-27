import test from "node:test";
import assert from "node:assert/strict";
import { attachTileInteraction, getTileAtPoint } from "../src/js/tile-interaction.js";
import { createSelectionModel } from "../src/js/selection-model.js";

function makeCanvas() {
  const listeners = new Map();
  const captured = [];
  return {
    listeners,
    captured,
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name) { listeners.delete(name); },
    setPointerCapture(id) { captured.push(id); },
    getBoundingClientRect() { return { left: 10, top: 20 }; },
  };
}

function event(clientX, clientY, properties = {}) {
  return { clientX, clientY, preventDefault() { this.defaultPrevented = true; }, ...properties };
}

test("tile picking handles center, offset canvas, edges, and points outside the grid", () => {
  assert.deepEqual(getTileAtPoint({ x: 400, y: 300 }, 800, 600, 9), { col: 0, row: 0, height: 0 });
  assert.deepEqual(getTileAtPoint({ x: 432, y: 316 }, 800, 600, 9), { col: 1, row: 0, height: 0 });
  assert.equal(getTileAtPoint({ x: 570, y: 400 }, 800, 600, 9), null);
  assert.equal(getTileAtPoint(null, 800, 600, 9), null);
});

test("pointer interactions add by shift drag, erase by right drag, and preserve hover", () => {
  const canvas = makeCanvas();
  const selection = createSelectionModel();
  const hovers = [];
  const selectionCounts = [];
  const interaction = attachTileInteraction(canvas, {
    getCanvasSize: () => ({ width: 800, height: 600 }),
    getGridSize: () => 9,
    selection,
    onHover: (tile) => hovers.push(tile),
    onSelectionChange: (tiles) => selectionCounts.push(tiles.length),
  });
  const fire = (name, input) => canvas.listeners.get(name)(input);

  fire("pointermove", event(410, 320));
  assert.deepEqual(interaction.getHoveredTile(), { col: 0, row: 0, height: 0 });

  const start = event(410, 320, { button: 0, shiftKey: true, pointerId: 1 });
  fire("pointerdown", start);
  assert.equal(start.defaultPrevented, true);
  fire("pointermove", event(506, 368, { buttons: 1 }));
  fire("pointerup", event(506, 368));
  assert.deepEqual(selection.getTiles().map(({ col, row }) => [col, row]), [[0, 0], [1, 0], [2, 0], [3, 0]]);
  assert.deepEqual(canvas.captured, [1]);

  fire("pointerdown", event(410, 320, { button: 2, shiftKey: true, pointerId: 2 }));
  fire("pointermove", event(506, 368, { buttons: 2 }));
  fire("pointerup", event(506, 368));
  assert.deepEqual(selection.getTiles(), []);
  assert.equal(selectionCounts.at(-1), 0);

  fire("pointerleave", event(0, 0));
  assert.equal(interaction.getHoveredTile(), null);
  assert.equal(hovers.at(-1), null);

  const contextMenu = event(410, 320);
  fire("contextmenu", contextMenu);
  assert.equal(contextMenu.defaultPrevented, true);
  interaction.dispose();
  assert.equal(canvas.listeners.size, 0);
});

test("ordinary click replaces selection and right click removes a single tile", () => {
  const canvas = makeCanvas();
  const selection = createSelectionModel();
  attachTileInteraction(canvas, {
    getCanvasSize: () => ({ width: 800, height: 600 }),
    getGridSize: () => 9,
    selection,
  });
  const fire = (name, input) => canvas.listeners.get(name)(input);

  fire("pointerdown", event(410, 320, { button: 0 }));
  fire("pointerdown", event(442, 336, { button: 0 }));
  assert.deepEqual(selection.getTiles().map(({ col, row }) => [col, row]), [[1, 0]]);
  fire("pointerdown", event(442, 336, { button: 2 }));
  assert.equal(selection.size, 0);
});
