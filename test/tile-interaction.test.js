import test from "node:test";
import assert from "node:assert/strict";
import { createCamera } from "../src/js/camera.js";
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

test("multi-select mode adds by left drag, erases by right drag, and preserves hover", () => {
  const canvas = makeCanvas();
  const selection = createSelectionModel();
  const hovers = [];
  const selectionCounts = [];
  const interaction = attachTileInteraction(canvas, {
    getCanvasSize: () => ({ width: 800, height: 600 }),
    getGridSize: () => 9,
    getMultiSelect: () => true,
    selection,
    onHover: (tile) => hovers.push(tile),
    onSelectionChange: (tiles) => selectionCounts.push(tiles.length),
  });
  const fire = (name, input) => canvas.listeners.get(name)(input);

  fire("pointermove", event(410, 320));
  assert.deepEqual(interaction.getHoveredTile(), { col: 0, row: 0, height: 0 });

  const start = event(410, 320, { button: 0, pointerId: 1 });
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

test("disabling tile selection blocks hover and every selection gesture", () => {
  const canvas = makeCanvas();
  const selection = createSelectionModel();
  let multiSelect = false;
  attachTileInteraction(canvas, {
    getCanvasSize: () => ({ width: 800, height: 600 }),
    getGridSize: () => 9,
    getMultiSelect: () => multiSelect,
    selection,
  });
  const fire = (name, input) => canvas.listeners.get(name)(input);

  fire("pointerdown", event(410, 320, { button: 0 }));
  fire("pointerdown", event(442, 336, { button: 0 }));
  assert.deepEqual(selection.getTiles(), []);
  fire("pointerdown", event(410, 320, { button: 2 }));
  assert.deepEqual(selection.getTiles(), []);

  multiSelect = true;
  fire("pointerdown", event(442, 336, { button: 0 }));
  assert.equal(selection.size, 1);
  fire("pointerdown", event(442, 336, { button: 2 }));
  assert.equal(selection.size, 0);
});

test("multi-select clicks add tiles while Shift has no effect", () => {
  const canvas = makeCanvas();
  const selection = createSelectionModel();
  let multiSelect = true;
  attachTileInteraction(canvas, {
    getCanvasSize: () => ({ width: 800, height: 600 }),
    getGridSize: () => 9,
    getMultiSelect: () => multiSelect,
    selection,
  });
  const fire = (name, input) => canvas.listeners.get(name)(input);

  fire("pointerdown", event(410, 320, { button: 0, pointerId: 9 }));
  fire("pointerdown", event(442, 336, { button: 0, pointerId: 10 }));
  assert.deepEqual(selection.getTiles().map(({ col, row }) => [col, row]), [
    [0, 0], [1, 0],
  ]);

  multiSelect = false;
  fire("pointerdown", event(474, 352, { button: 0, shiftKey: true, pointerId: 11 }));
  assert.deepEqual(selection.getTiles().map(({ col, row }) => [col, row]), [
    [0, 0], [1, 0],
  ]);
});

test("cancelled drag stops changing the selection on later pointer moves", () => {
  const canvas = makeCanvas();
  const selection = createSelectionModel();
  attachTileInteraction(canvas, {
    getCanvasSize: () => ({ width: 800, height: 600 }),
    getGridSize: () => 9,
    getMultiSelect: () => true,
    selection,
  });
  const fire = (name, input = event(0, 0)) => canvas.listeners.get(name)(input);

  fire("pointerdown", event(410, 320, { button: 0, shiftKey: true, pointerId: 7 }));
  fire("pointermove", event(442, 336, { buttons: 1 }));
  assert.deepEqual(selection.getTiles().map(({ col, row }) => [col, row]), [[0, 0], [1, 0]]);

  fire("pointercancel");
  fire("pointermove", event(474, 352, { buttons: 1 }));
  assert.deepEqual(selection.getTiles().map(({ col, row }) => [col, row]), [[0, 0], [1, 0]]);
});

test("refreshHover recalculates the remembered pointer after the canvas resizes", () => {
  const canvas = makeCanvas();
  const selection = createSelectionModel();
  let size = { width: 800, height: 600 };
  const interaction = attachTileInteraction(canvas, {
    getCanvasSize: () => size,
    getGridSize: () => 9,
    selection,
  });

  canvas.listeners.get("pointermove")(event(410, 320));
  assert.deepEqual(interaction.getHoveredTile(), { col: 0, row: 0, height: 0 });

  size = { width: 896, height: 600 };
  interaction.refreshHover();
  assert.deepEqual(interaction.getHoveredTile(), { col: -1, row: 1, height: 0 });
});

test("hover changes notify once per tile rather than once per pointer event", () => {
  const canvas = makeCanvas();
  const hovers = [];
  const interaction = attachTileInteraction(canvas, {
    getCanvasSize: () => ({ width: 800, height: 600 }),
    getGridSize: () => 9,
    selection: createSelectionModel(),
    onHover: (tile) => hovers.push(tile),
  });

  canvas.listeners.get("pointermove")(event(410, 320));
  canvas.listeners.get("pointermove")(event(411, 321));
  interaction.refreshHover();
  assert.equal(hovers.length, 1);
  canvas.listeners.get("pointermove")(event(442, 336));
  assert.equal(hovers.length, 2);
  assert.deepEqual(hovers.at(-1), { col: 1, row: 0, height: 0 });
});

test("selection callbacks fire only when selection contents actually change", () => {
  const canvas = makeCanvas();
  const changes = [];
  attachTileInteraction(canvas, {
    getCanvasSize: () => ({ width: 800, height: 600 }),
    getGridSize: () => 9,
    selection: createSelectionModel(),
    onSelectionChange: (tiles) => changes.push(tiles.length),
  });

  canvas.listeners.get("pointerdown")(event(410, 320, { button: 0 }));
  canvas.listeners.get("pointerdown")(event(410, 320, { button: 0 }));
  assert.deepEqual(changes, [1]);
});

test("tile picking follows camera pan and zoom transforms", () => {
  const canvas = makeCanvas();
  const camera = createCamera();
  const selection = createSelectionModel();
  attachTileInteraction(canvas, {
    getCanvasSize: () => ({ width: 800, height: 600 }),
    getGridSize: () => 9,
    camera,
    selection,
  });
  const fire = (name, input) => canvas.listeners.get(name)(input);

  camera.panBy(20, 10);
  camera.zoomAt(2, { x: 400, y: 300 }, 800, 600);
  const tileScreenPoint = camera.worldToScreen({ x: 432, y: 316 }, 800, 600);
  fire("pointerdown", event(tileScreenPoint.x + 10, tileScreenPoint.y + 20, { button: 0 }));

  assert.deepEqual(selection.getTiles().map(({ col, row }) => [col, row]), [[1, 0]]);
});
