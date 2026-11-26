import test from "node:test";
import assert from "node:assert/strict";
import {
  PLANE,
  drawPlane,
  hitTestTile,
  initializePlane,
  tileCenter,
  toggleActiveTile,
  zoomLevelForWheel,
} from "../plane.js";

function createContext() {
  const calls = { fills: [], strokes: [], transforms: [], clears: [] };
  const context = {
    calls,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    setTransform(...args) { calls.transforms.push(args); },
    clearRect(...args) { calls.clears.push(args); },
    save() {}, restore() {}, translate() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {},
    fill() { calls.fills.push(this.fillStyle); },
    stroke() { calls.strokes.push({ color: this.strokeStyle, width: this.lineWidth }); },
  };
  return context;
}

function makeHarness({ width = 1280, height = 800, devicePixelRatio = 2 } = {}) {
  const context = createContext();
  const listeners = new Map();
  const windowListeners = new Map();
  const board = { style: {} };
  const canvas = {
    parentElement: board,
    style: {},
    width: 0,
    height: 0,
    getContext: () => context,
    addEventListener(name, listener) {
      const handlers = listeners.get(name) ?? [];
      handlers.push(listener);
      listeners.set(name, handlers);
    },
    setPointerCapture() {},
    getBoundingClientRect() {
      const match = board.style.transform?.match(/translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([-\d.]+)\)/);
      const [, x = "0", y = "0", z = "1"] = match ?? [];
      const panX = Number(x);
      const panY = Number(y);
      const zoom = Number(z);
      const centerX = window.innerWidth / 2 + panX;
      const centerY = window.innerHeight / 2 + panY;
      return {
        left: centerX - (PLANE.width * zoom) / 2,
        top: centerY - (PLANE.height * zoom) / 2,
        width: PLANE.width * zoom,
        height: PLANE.height * zoom,
      };
    },
  };
  const readout = { textContent: "" };
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.document = { querySelector: (selector) => selector === "#plane" ? canvas : readout };
  globalThis.window = {
    devicePixelRatio,
    innerWidth: width,
    innerHeight: height,
    addEventListener(name, listener) {
      const handlers = windowListeners.get(name) ?? [];
      handlers.push(listener);
      windowListeners.set(name, handlers);
    },
  };

  return {
    canvas, board, readout, context,
    state: initializePlane(),
    dispatch(name, event = {}) {
      for (const listener of listeners.get(name) ?? []) listener(event);
    },
    dispatchWindow(name, event = {}) {
      for (const listener of windowListeners.get(name) ?? []) listener(event);
    },
    restore() {
      globalThis.document = previousDocument;
      globalThis.window = previousWindow;
    },
  };
}

function wheelAt(harness, clientX, clientY, deltaY, deltaMode = 0) {
  harness.dispatch("wheel", { clientX, clientY, deltaY, deltaMode, preventDefault() {} });
}

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-7, `${message}: ${actual} !== ${expected}`);
}

test("plane has the expected dimensions, grid and palette", () => {
  assert.deepEqual(
    [PLANE.columns, PLANE.rows, PLANE.tileWidth, PLANE.tileHeight, PLANE.width, PLANE.height],
    [12, 12, 64, 32, 768, 384],
  );
  assert.deepEqual(PLANE.colors, {
    background: "#141414", tile: "#383838", grid: "#484848", active: "#6f5a93",
    activeStroke: "#9a86bd", hover: "#8f7438", hoverStroke: "#c3a85f",
  });
});

test("tile centers and hit testing map every one of 144 cells", () => {
  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      const center = tileCenter(row, column);
      assert.deepEqual(hitTestTile(center.x, center.y), { row, column });
    }
  }
});

test("geometry rejects out-of-range, non-finite and invalid coordinates", () => {
  assert.equal(hitTestTile(1000, 1000), null);
  assert.equal(hitTestTile(-500, -500), null);
  assert.equal(hitTestTile(NaN, 0), null);
  assert.equal(hitTestTile(Infinity, 0), null);
  assert.equal(tileCenter(-1, 0), null);
  assert.equal(tileCenter(0, PLANE.columns), null);
  assert.equal(tileCenter(1.5, 2), null);
});

test("active tile can be selected, replaced, toggled off and kept on empty click", () => {
  const first = { row: 3, column: 5 };
  const second = { row: 4, column: 6 };
  assert.deepEqual(toggleActiveTile(null, first), first);
  assert.deepEqual(toggleActiveTile(first, second), second);
  assert.equal(toggleActiveTile(first, first), null);
  assert.equal(toggleActiveTile(first, null), first);
});

test("renderer draws all base tiles and expected focus styles", () => {
  const context = createContext();
  drawPlane(context);
  assert.equal(context.calls.fills.length, 144);
  assert.ok(context.calls.fills.every((color) => color === PLANE.colors.tile));
  assert.equal(context.calls.strokes.length, 145);
  assert.ok(context.calls.strokes.every(({ color, width }) => color === PLANE.colors.grid && width === 1));

  context.calls.fills.length = 0;
  context.calls.strokes.length = 0;
  drawPlane(context, { hoveredTile: { row: 2, column: 3 }, activeTile: { row: 4, column: 5 } });
  assert.equal(context.calls.fills.filter((color) => color === PLANE.colors.hover).length, 1);
  assert.equal(context.calls.fills.filter((color) => color === PLANE.colors.active).length, 1);
  assert.ok(context.calls.strokes.some(({ color, width }) => color === PLANE.colors.hoverStroke && width === 2));
  assert.ok(context.calls.strokes.some(({ color, width }) => color === PLANE.colors.activeStroke && width === 2));
});

test("renderer keeps visual line width stable while zoom changes", () => {
  const context = createContext();
  drawPlane(context, {}, 3, 2);
  assert.equal(context.calls.transforms.at(-1)[0], 3);
  assert.ok(context.calls.strokes.every(({ width }) => width === 0.5));
  drawPlane(context, { activeTile: { row: 1, column: 1 } }, 6, 4);
  assert.equal(context.calls.transforms.at(-1)[0], 6);
  assert.ok(context.calls.strokes.every(({ width }) => width === 0.25 || width === 0.5));
});

test("initialization uses fixed layout dimensions and HiDPI backing resolution", () => {
  const h = makeHarness({ width: 800, height: 600, devicePixelRatio: 2 });
  try {
    assert.equal(h.canvas.width, PLANE.width * 2);
    assert.equal(h.canvas.height, PLANE.height * 2);
    assert.equal(h.board.style.width, `${PLANE.width}px`);
    assert.equal(h.board.style.height, `${PLANE.height}px`);
    assert.equal(h.canvas.style.width, `${PLANE.width}px`);
    assert.equal(h.canvas.style.height, `${PLANE.height}px`);
    assert.match(h.board.style.transform, /translate\(0px, 0px\) scale\(1\)$/);
    assert.equal(h.readout.textContent, "Arahkan kursor ke tile");
  } finally { h.restore(); }
});

test("hover, click, active state and pointer-leave work in canvas coordinates", () => {
  const h = makeHarness();
  try {
    const target = { row: 2, column: 3 };
    const center = tileCenter(target.row, target.column);
    const rect = h.canvas.getBoundingClientRect();
    const pointer = { clientX: rect.left + rect.width / 2 + center.x, clientY: rect.top + center.y };
    h.dispatch("pointermove", pointer);
    assert.match(h.readout.textContent, /Hover: Kolom 4, Baris 3/);
    h.dispatch("click", { ...pointer, button: 0 });
    h.dispatch("pointerleave");
    assert.match(h.readout.textContent, /Aktif: Kolom 4, Baris 3/);
    h.dispatch("pointermove", pointer);
    h.dispatch("click", { ...pointer, button: 0 });
    h.dispatch("pointerleave");
    assert.equal(h.readout.textContent, "Arahkan kursor ke tile");
  } finally { h.restore(); }
});

test("right and middle clicks do not select a tile", () => {
  const h = makeHarness();
  try {
    const rect = h.canvas.getBoundingClientRect();
    const pointer = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    h.dispatch("pointermove", pointer);
    h.dispatch("click", { ...pointer, button: 2 });
    assert.equal(h.state.getState().activeTile, null);
    h.dispatch("click", { ...pointer, button: 1 });
    assert.equal(h.state.getState().activeTile, null);
  } finally { h.restore(); }
});

test("zoom keeps the exact screen anchor stable at center, edges and corners", () => {
  const h = makeHarness({ width: 1440, height: 900, devicePixelRatio: 1.5 });
  try {
    // Offset the plane first to ensure panning and zooming compose correctly.
    const center = h.canvas.getBoundingClientRect();
    h.dispatch("pointerdown", { button: 1, pointerId: 3, clientX: center.left + 100, clientY: center.top + 100, preventDefault() {} });
    h.dispatch("pointermove", { button: 1, pointerId: 3, clientX: center.left + 147, clientY: center.top + 72 });
    h.dispatch("pointerup", { pointerId: 3 });

    const scenarios = [
      [720, 450, -450],
      [310, 260, -240],
      [1100, 650, 380],
      [530, 700, -180],
      [870, 330, 520],
    ];
    for (const [x, y, deltaY] of scenarios) {
      const beforeRect = h.canvas.getBoundingClientRect();
      const beforeZoom = h.state.getState().zoom;
      const beforeCenter = {
        x: beforeRect.left + beforeRect.width / 2,
        y: beforeRect.top + beforeRect.height / 2,
      };
      const local = { x: (x - beforeCenter.x) / beforeZoom, y: (y - beforeCenter.y) / beforeZoom };
      wheelAt(h, x, y, deltaY);
      const afterRect = h.canvas.getBoundingClientRect();
      const afterZoom = h.state.getState().zoom;
      assertClose(afterRect.left + afterRect.width / 2 + local.x * afterZoom, x, "anchor X");
      assertClose(afterRect.top + afterRect.height / 2 + local.y * afterZoom, y, "anchor Y");
      assert.ok(afterZoom >= 0.25 && afterZoom <= 4);
    }
  } finally { h.restore(); }
});

test("parameter matrix preserves zoom anchor across viewport and DPR combinations", () => {
  const environments = [
    { width: 800, height: 600, devicePixelRatio: 1 },
    { width: 1366, height: 768, devicePixelRatio: 1.25 },
    { width: 1920, height: 1080, devicePixelRatio: 1.5 },
    { width: 3840, height: 2160, devicePixelRatio: 2 },
  ];
  const positions = [
    [0.08, 0.12], [0.5, 0.5], [0.91, 0.18], [0.2, 0.86], [0.88, 0.9],
  ];

  for (const environment of environments) {
    const h = makeHarness(environment);
    try {
      const initialRect = h.canvas.getBoundingClientRect();
      h.dispatch("pointerdown", {
        button: 1, pointerId: 21, clientX: initialRect.left + 40,
        clientY: initialRect.top + 60, preventDefault() {},
      });
      h.dispatch("pointermove", {
        pointerId: 21, clientX: initialRect.left + 93, clientY: initialRect.top + 21,
      });
      h.dispatch("pointerup", { pointerId: 21 });

      wheelAt(h, environment.width / 2, environment.height / 2, -750);
      for (const [relativeX, relativeY] of positions) {
        const before = h.canvas.getBoundingClientRect();
        const oldZoom = h.state.getState().zoom;
        const x = before.left + before.width * relativeX;
        const y = before.top + before.height * relativeY;
        const centerX = before.left + before.width / 2;
        const centerY = before.top + before.height / 2;
        const focusX = (x - centerX) / oldZoom;
        const focusY = (y - centerY) / oldZoom;
        wheelAt(h, x, y, relativeX > 0.5 ? 240 : -180);
        const after = h.canvas.getBoundingClientRect();
        const nextZoom = h.state.getState().zoom;
        assertClose(after.left + after.width / 2 + focusX * nextZoom, x,
          `anchor X ${environment.width}x${environment.height} @ ${relativeX},${relativeY}`);
        assertClose(after.top + after.height / 2 + focusY * nextZoom, y,
          `anchor Y ${environment.width}x${environment.height} @ ${relativeX},${relativeY}`);
        assert.equal(h.canvas.style.width, `${PLANE.width}px`);
        assert.ok(Number.isFinite(h.state.getState().pan.x) && Number.isFinite(h.state.getState().pan.y));
      }

      const finalState = h.state.getState();
      assert.equal(h.canvas.width, Math.round(PLANE.width * environment.devicePixelRatio * finalState.zoom));
      assert.equal(h.canvas.height, Math.round(PLANE.height * environment.devicePixelRatio * finalState.zoom));
    } finally { h.restore(); }
  }
});

test("zoom preserves plane-local position while hover remains accurate", () => {
  const h = makeHarness();
  try {
    const tile = { row: 4, column: 6 };
    const tilePos = tileCenter(tile.row, tile.column);
    const rect = h.canvas.getBoundingClientRect();
    const pointer = {
      clientX: rect.left + rect.width / 2 + tilePos.x,
      clientY: rect.top + tilePos.y,
    };
    h.dispatch("pointermove", pointer);
    assert.match(h.readout.textContent, /Hover: Kolom 7, Baris 5/);
    wheelAt(h, pointer.clientX, pointer.clientY, -600);
    assert.match(h.readout.textContent, /Hover: Kolom 7, Baris 5/);
    assert.equal(h.canvas.style.width, `${PLANE.width}px`, "CSS layout size remains fixed after zoom");
    assert.ok(h.canvas.width > PLANE.width * 2, "backing resolution increases for sharp zoomed rendering");
  } finally { h.restore(); }
});

test("wheel line and page modes zoom in consistent directions", () => {
  const h = makeHarness({ height: 720 });
  try {
    const rect = h.canvas.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    wheelAt(h, x, y, -2, 1);
    assert.ok(h.state.getState().zoom > 1);
    const before = h.state.getState().zoom;
    wheelAt(h, x, y, 1, 2);
    assert.ok(h.state.getState().zoom < before);
  } finally { h.restore(); }
});

test("zoom clamps at both ends without moving the plane after the limit", () => {
  const h = makeHarness();
  try {
    const rect = h.canvas.getBoundingClientRect();
    const x = rect.left + 123;
    const y = rect.top + 111;
    wheelAt(h, x, y, -1e7);
    assert.equal(h.state.getState().zoom, 4);
    const atMax = h.state.getState();
    const transformAtMax = h.board.style.transform;
    wheelAt(h, x, y, -1e7);
    assert.equal(h.board.style.transform, transformAtMax);
    wheelAt(h, x, y, 1e7);
    assert.equal(h.state.getState().zoom, 0.25);
    const transformAtMin = h.board.style.transform;
    wheelAt(h, x, y, 1e7);
    assert.equal(h.board.style.transform, transformAtMin);
    assert.notDeepEqual(h.state.getState().pan, atMax.pan);
  } finally { h.restore(); }
});

test("middle-button pan tracks pointer delta and terminates on pointerup or cancel", () => {
  const h = makeHarness();
  try {
    const rect = h.canvas.getBoundingClientRect();
    const start = { clientX: rect.left + 100, clientY: rect.top + 80, button: 1, pointerId: 9, preventDefault() {} };
    h.dispatch("pointerdown", start);
    assert.equal(h.state.getState().dragging, true);
    h.dispatch("pointermove", { ...start, clientX: start.clientX + 40, clientY: start.clientY - 15 });
    assert.deepEqual(h.state.getState().pan, { x: 40, y: -15 });
    h.dispatch("pointerup", { pointerId: 9 });
    assert.equal(h.state.getState().dragging, false);
    h.dispatch("pointerdown", { ...start, pointerId: 10 });
    h.dispatch("pointercancel", { pointerId: 10 });
    assert.equal(h.state.getState().dragging, false);
  } finally { h.restore(); }
});

test("pointer capture loss also ends pan and clears grabbing cursor", () => {
  const h = makeHarness();
  try {
    const rect = h.canvas.getBoundingClientRect();
    h.dispatch("pointerdown", { button: 1, pointerId: 4, clientX: rect.left, clientY: rect.top, preventDefault() {} });
    h.canvas.style.cursor = "grabbing";
    h.dispatch("lostpointercapture", { pointerId: 4 });
    assert.equal(h.state.getState().dragging, false);
    assert.equal(h.canvas.style.cursor, "");
  } finally { h.restore(); }
});

test("resize redraws with updated device pixel ratio and retains interaction state", () => {
  const h = makeHarness({ width: 900, height: 700, devicePixelRatio: 1 });
  try {
    const rect = h.canvas.getBoundingClientRect();
    const point = { clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    h.dispatch("pointermove", point);
    globalThis.window.devicePixelRatio = 2;
    globalThis.window.innerWidth = 1000;
    globalThis.window.innerHeight = 800;
    h.dispatchWindow("resize");
    assert.equal(h.canvas.width, PLANE.width * 2);
    assert.equal(h.canvas.height, PLANE.height * 2);
    assert.ok(h.state.getState().hoveredTile);
  } finally { h.restore(); }
});
