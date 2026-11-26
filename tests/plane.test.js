import test from "node:test";
import assert from "node:assert/strict";
import {
  PLANE,
  drawPlane,
  hitTestTile,
  initializePlane,
  tileCenter,
  toggleActiveTile,
} from "../plane.js";

function createContext() {
  const calls = { fills: [], strokes: [] };
  const context = {
    calls,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    setTransform() {},
    clearRect() {},
    save() {},
    restore() {},
    translate() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    closePath() {},
    fill() { calls.fills.push(this.fillStyle); },
    stroke() { calls.strokes.push({ color: this.strokeStyle, width: this.lineWidth }); },
  };
  return context;
}

test("plane uses the expected fixed grid dimensions and palette", () => {
  assert.deepEqual(
    [PLANE.columns, PLANE.rows, PLANE.tileWidth, PLANE.tileHeight, PLANE.width, PLANE.height],
    [12, 12, 64, 32, 768, 384],
  );
  assert.deepEqual(PLANE.colors, {
    background: "#141414",
    tile: "#383838",
    grid: "#484848",
    active: "#6f5a93",
    activeStroke: "#9a86bd",
    hover: "#8f7438",
    hoverStroke: "#c3a85f",
  });
});

test("tile centers and hit testing map all 144 cells to the right coordinates", () => {
  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      const center = tileCenter(row, column);
      assert.deepEqual(hitTestTile(center.x, center.y), { row, column });
    }
  }
});

test("hit testing rejects points outside the plane and tileCenter rejects invalid cells", () => {
  assert.equal(hitTestTile(1000, 1000), null);
  assert.equal(hitTestTile(-500, -500), null);
  assert.equal(tileCenter(-1, 0), null);
  assert.equal(tileCenter(0, PLANE.columns), null);
});

test("active tile can be selected, moved, toggled off, or left unchanged", () => {
  const first = { row: 3, column: 5 };
  const second = { row: 4, column: 6 };
  assert.deepEqual(toggleActiveTile(null, first), first);
  assert.deepEqual(toggleActiveTile(first, second), second);
  assert.equal(toggleActiveTile(first, first), null);
  assert.equal(toggleActiveTile(first, null), first);
});

test("render draws 144 base tiles with the matching fill and grid strokes", () => {
  const context = createContext();
  drawPlane(context);
  assert.equal(context.calls.fills.length, 144);
  assert.ok(context.calls.fills.every((color) => color === PLANE.colors.tile));
  assert.equal(context.calls.strokes.length, 145); // 144 tile outlines and plane perimeter
  assert.ok(context.calls.strokes.every(({ color, width }) => color === PLANE.colors.grid && width === 1));
});

test("render applies hover and active fill colors with brighter 2 px strokes", () => {
  const context = createContext();
  const hoveredTile = { row: 2, column: 3 };
  const activeTile = { row: 4, column: 5 };
  drawPlane(context, { hoveredTile, activeTile });

  assert.equal(context.calls.fills.filter((color) => color === PLANE.colors.hover).length, 1);
  assert.equal(context.calls.fills.filter((color) => color === PLANE.colors.active).length, 1);
  assert.ok(context.calls.strokes.some(({ color, width }) => color === PLANE.colors.hoverStroke && width === 2));
  assert.ok(context.calls.strokes.some(({ color, width }) => color === PLANE.colors.activeStroke && width === 2));
});

test("plane interaction updates hover, selection, readout, and device-pixel dimensions", () => {
  const context = createContext();
  const listeners = new Map();
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    addEventListener: (name, listener) => listeners.set(name, listener),
    getBoundingClientRect: () => ({ left: 10, top: 20, width: PLANE.width, height: PLANE.height }),
  };
  const readout = { textContent: "" };
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.document = { querySelector: (selector) => selector === "#plane" ? canvas : readout };
  globalThis.window = { devicePixelRatio: 2 };

  try {
    initializePlane();
    assert.equal(canvas.width, PLANE.width * 2);
    assert.equal(canvas.height, PLANE.height * 2);
    assert.equal(readout.textContent, "Arahkan kursor ke tile");

    const target = { row: 2, column: 3 };
    const center = tileCenter(target.row, target.column);
    const event = { clientX: 10 + PLANE.width / 2 + center.x, clientY: 20 + center.y };
    listeners.get("pointermove")(event);
    assert.match(readout.textContent, /Hover: Kolom 4, Baris 3/);

    listeners.get("click")(event);
    listeners.get("pointerleave")();
    assert.match(readout.textContent, /Aktif: Kolom 4, Baris 3/);

    listeners.get("pointermove")(event);
    listeners.get("click")(event);
    listeners.get("pointerleave")();
    assert.equal(readout.textContent, "Arahkan kursor ke tile");
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
  }
});
