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
  const calls = { fills: [], strokes: [], transforms: [], clears: [], beginPaths: 0 };
  const context = {
    calls,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    setTransform(...args) { calls.transforms.push(args); },
    clearRect(...args) { calls.clears.push(args); },
    save() {}, restore() {}, translate() {}, beginPath() { calls.beginPaths++; }, moveTo() {}, lineTo() {}, closePath() {},
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
      const canvasHeight = Number.parseFloat(board.style.height) || PLANE.height;
      const origin = board.style.transformOrigin?.match(/([\d.]+)px\s+([\d.]+)px/);
      const originX = origin ? Number(origin[1]) : PLANE.width / 2;
      const originY = origin ? Number(origin[2]) : canvasHeight / 2;
      const centerX = window.innerWidth / 2 + panX;
      const centerY = window.innerHeight / 2 + panY;
      return {
        left: centerX - originX * zoom,
        top: centerY - originY * zoom,
        width: PLANE.width * zoom,
        height: canvasHeight * zoom,
      };
    },
  };
  const readout = { textContent: "" };
  const uiElements = new Map();
  const selectors = [
    "#inspector-panel", "#inspector-toggle", "#reset-camera", "#plane-size", "#tile-size",
    "#hover-value", "#selected-value", "#selection-summary", "#selection-hint", "#selected-index",
    "#selected-detail-coord", "#selected-center", "#selected-elevation", "#selected-rise",
    "#elevation-decrease", "#elevation-increase", "#camera-zoom", "#camera-pan",
    "#camera-mode", "#footer-selection", "#footer-zoom", "#objects-panel", "#objects-expand",
    "#selection-panel", "#selection-expand", "#object-count",
  ];
  for (const selector of selectors) {
    const handlers = new Map();
    const attributes = {};
    const classes = new Set();
    const element = {
      textContent: "",
      attributes,
      disabled: false,
      title: "",
      classList: {
        toggle(name, force) {
          if (force === true) { classes.add(name); return true; }
          if (force === false) { classes.delete(name); return false; }
          if (classes.has(name)) { classes.delete(name); return false; }
          classes.add(name); return true;
        },
        contains(name) { return classes.has(name); },
      },
      addEventListener(name, callback) {
        const callbacks = handlers.get(name) ?? [];
        callbacks.push(callback);
        handlers.set(name, callbacks);
      },
      dispatch(name, event = {}) { for (const callback of handlers.get(name) ?? []) callback(event); },
      setAttribute(name, value) { attributes[name] = value; },
    };
    uiElements.set(selector, element);
  }
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const bodyClasses = new Set();
  globalThis.document = {
    body: { classList: {
      toggle(name, force) {
        if (force === true) { bodyClasses.add(name); return true; }
        if (force === false) { bodyClasses.delete(name); return false; }
        if (bodyClasses.has(name)) { bodyClasses.delete(name); return false; }
        bodyClasses.add(name); return true;
      },
      contains(name) { return bodyClasses.has(name); },
    } },
    querySelector: (selector) => selector === "#plane" ? canvas : selector === "#readout" ? readout : uiElements.get(selector) ?? null,
  };
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
    canvas, board, readout, context, uiElements, bodyClasses,
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
  assert.equal(context.calls.fills.length, 1, "plain tiles are filled as one batched path");
  assert.ok(context.calls.fills.every((color) => color === PLANE.colors.tile));
  assert.equal(context.calls.strokes.length, 2, "grid and perimeter are each stroked once");
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

test("ground-plane screen coordinates remain fixed as top padding grows and shrinks", () => {
  const h = makeHarness({ width: 1280, height: 720, devicePixelRatio: 1.5 });
  try {
    const target = { row: 5, column: 5 };
    const center = tileCenter(target.row, target.column);
    const groundPoints = [
      { x: -PLANE.width / 2, y: 0 }, { x: 0, y: 0 },
      { x: PLANE.width / 2, y: PLANE.height / 2 },
      { x: 0, y: PLANE.height }, { x: -PLANE.width / 2, y: PLANE.height / 2 },
      { x: center.x, y: center.y },
    ];
    const screenPoints = () => {
      const rect = h.canvas.getBoundingClientRect();
      const { topPadding, zoom } = h.state.getState();
      return groundPoints.map(({ x, y }) => ({
        x: rect.left + (PLANE.width / 2 + x) * zoom,
        y: rect.top + (topPadding + y) * zoom,
      }));
    };
    const initialPoints = screenPoints();
    const rect = h.canvas.getBoundingClientRect();
    h.dispatch("click", {
      clientX: rect.left + (PLANE.width / 2 + center.x),
      clientY: rect.top + center.y,
      button: 0,
    });
    const increase = h.uiElements.get("#elevation-increase");
    const decrease = h.uiElements.get("#elevation-decrease");
    const expectedPadding = [8, 16, 24, 40, 80];
    const levels = [1, 2, 3, 5, 10];
    for (let i = 0; i < levels.length; i++) {
      while (h.state.getState().activeElevation < levels[i]) increase.dispatch("click");
      assert.equal(h.state.getState().topPadding, expectedPadding[i]);
      assert.equal(h.board.style.marginTop, `${-(PLANE.height / 2 + expectedPadding[i])}px`);
      assert.equal(h.board.style.transformOrigin, `${PLANE.width / 2}px ${PLANE.height / 2 + expectedPadding[i]}px`);
      screenPoints().forEach((point, index) => {
        assert.ok(Math.abs(point.x - initialPoints[index].x) <= 0.01, `ground point ${index} X at padding ${expectedPadding[i]}`);
        assert.ok(Math.abs(point.y - initialPoints[index].y) <= 0.01, `ground point ${index} Y at padding ${expectedPadding[i]}`);
      });
    }
    while (h.state.getState().activeElevation > 0) decrease.dispatch("click");
    assert.equal(h.state.getState().topPadding, 0);
    assert.deepEqual(screenPoints(), initialPoints);
  } finally { h.restore(); }
});

test("ground plane anchor stays consistent across camera, viewport and DPR matrix", () => {
  const environments = [
    { width: 390, height: 844, devicePixelRatio: 1 },
    { width: 768, height: 900, devicePixelRatio: 1.25 },
    { width: 1280, height: 720, devicePixelRatio: 1.5 },
    { width: 1920, height: 1080, devicePixelRatio: 2 },
  ];
  const zooms = [0.25, 0.5, 1, 2, 4];
  const pans = [{ x: 0, y: 0 }, { x: 73, y: -41 }, { x: -55, y: 92 }];
  for (const environment of environments) {
    const h = makeHarness(environment);
    try {
      const target = { row: 0, column: 0 };
      const center = tileCenter(target.row, target.column);
      let rect = h.canvas.getBoundingClientRect();
      h.dispatch("click", {
        clientX: rect.left + PLANE.width / 2 + center.x,
        clientY: rect.top + center.y,
        button: 0,
      });
      for (let level = 0; level < 10; level++) h.uiElements.get("#elevation-increase").dispatch("click");

      for (const zoom of zooms) {
        for (const pan of pans) {
          h.uiElements.get("#reset-camera").dispatch("click");
          const zoomDelta = -Math.log(zoom) / 0.001;
          wheelAt(h, environment.width / 2 + 17, environment.height / 2 - 23, zoomDelta);
          rect = h.canvas.getBoundingClientRect();
          h.dispatch("pointerdown", { button: 1, pointerId: 77, clientX: rect.left + 20, clientY: rect.top + 30, preventDefault() {} });
          h.dispatch("pointermove", { pointerId: 77, clientX: rect.left + 20 + pan.x, clientY: rect.top + 30 + pan.y });
          h.dispatch("pointerup", { pointerId: 77 });
          rect = h.canvas.getBoundingClientRect();
          const state = h.state.getState();
          assert.ok(Math.abs((rect.left + (PLANE.width / 2 + center.x) * state.zoom) -
            (environment.width / 2 + state.pan.x + center.x * state.zoom)) <= 0.01);
          assert.ok(Math.abs((rect.top + (state.topPadding + center.y) * state.zoom) -
            (environment.height / 2 + state.pan.y + (center.y - PLANE.height / 2) * state.zoom)) <= 0.01);
          assert.ok(Math.abs(state.zoom - zoom) < 1e-10, `zoom ${zoom} at ${environment.width}x${environment.height}`);
          assert.equal(h.canvas.height, Math.round((PLANE.height + 80) * environment.devicePixelRatio * state.zoom));
        }
      }
    } finally { h.restore(); }
  }
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


test("renderer batches grid drawing and ignores out-of-range hover/active highlights", () => {
  const context = createContext();
  drawPlane(context, {
    hoveredTile: { row: 99, column: 99 },
    activeTile: { row: -1, column: 2 },
  });
  assert.equal(context.calls.fills.length, 1, "invalid highlights must not add fill paths");
  assert.deepEqual(context.calls.fills, [PLANE.colors.tile]);
  assert.equal(context.calls.strokes.length, 2, "only the grid and perimeter should be drawn");

  context.calls.fills.length = 0;
  context.calls.strokes.length = 0;
  drawPlane(context, {
    hoveredTile: { row: 2, column: 3 },
    activeTile: { row: 2, column: 3 },
  });
  assert.deepEqual(context.calls.fills, [PLANE.colors.tile, PLANE.colors.active],
    "the active color takes precedence when hover and selection refer to the same tile");
  assert.equal(context.calls.strokes.length, 3, "same tile must receive one active outline, not duplicate focus strokes");
  assert.ok(context.calls.strokes.some(({ color }) => color === PLANE.colors.activeStroke));
  assert.ok(!context.calls.strokes.some(({ color }) => color === PLANE.colors.hoverStroke));
});

test("wheel zoom keeps the same hovered tile under a stationary cursor across viewport and DPR scenarios", () => {
  const scenarios = [
    { width: 390, height: 844, devicePixelRatio: 1 },
    { width: 800, height: 600, devicePixelRatio: 1.25 },
    { width: 1280, height: 720, devicePixelRatio: 1.5 },
    { width: 1920, height: 1080, devicePixelRatio: 2 },
  ];
  const tiles = [[5, 5], [6, 6], [4, 6], [7, 5]];
  const deltas = [...Array(8).fill(-300), ...Array(16).fill(300), ...Array(4).fill(-300)];

  for (const environment of scenarios) {
    for (const [row, column] of tiles) {
      const h = makeHarness(environment);
      try {
        const center = tileCenter(row, column);
        const rect = h.canvas.getBoundingClientRect();
        const pointer = {
          clientX: rect.left + rect.width / 2 + center.x,
          clientY: rect.top + center.y,
        };
        h.dispatch("pointermove", pointer);
        const expected = { row, column };
        assert.deepEqual(h.state.getState().hoveredTile, expected,
          `initial hover at ${environment.width}x${environment.height}, tile ${row},${column}`);

        for (const deltaY of deltas) {
          wheelAt(h, pointer.clientX, pointer.clientY, deltaY);
          assert.deepEqual(h.state.getState().hoveredTile, expected,
            `tile ${row},${column} drifted at ${environment.width}x${environment.height}, zoom ${h.state.getState().zoom}`);
        }
      } finally { h.restore(); }
    }
  }
});

test("the tile grabbed by middle-button pan remains under the moving pointer", () => {
  const h = makeHarness({ width: 1280, height: 720 });
  try {
    const center = tileCenter(5, 5);
    const rect = h.canvas.getBoundingClientRect();
    const pointer = {
      clientX: rect.left + rect.width / 2 + center.x,
      clientY: rect.top + center.y,
    };
    h.dispatch("pointermove", pointer);
    assert.deepEqual(h.state.getState().hoveredTile, { row: 5, column: 5 });
    h.dispatch("pointerdown", { button: 1, pointerId: 44, ...pointer, preventDefault() {} });
    for (const [dx, dy] of [[-32, -16], [-100, 40], [250, -180], [-5, 5]]) {
      h.dispatch("pointermove", {
        pointerId: 44,
        clientX: pointer.clientX + dx,
        clientY: pointer.clientY + dy,
      });
      assert.deepEqual(h.state.getState().hoveredTile, { row: 5, column: 5 }, `drag delta ${dx},${dy}`);
    }
    h.dispatch("pointerup", { pointerId: 44 });
  } finally { h.restore(); }
});

test("pointerleave during a middle-button drag preserves hover until the drag ends", () => {
  const h = makeHarness();
  try {
    const tile = tileCenter(4, 5);
    const rect = h.canvas.getBoundingClientRect();
    const pointer = { clientX: rect.left + rect.width / 2 + tile.x, clientY: rect.top + tile.y };
    h.dispatch("pointermove", pointer);
    h.dispatch("pointerdown", { button: 1, pointerId: 5, ...pointer, preventDefault() {} });
    h.dispatch("pointerleave");
    assert.deepEqual(h.state.getState().hoveredTile, { row: 4, column: 5 });
    h.dispatch("pointerup", { pointerId: 5 });
    h.dispatch("pointerleave");
    assert.equal(h.state.getState().hoveredTile, null);
  } finally { h.restore(); }
});

test("click without a preceding pointermove still selects the tile under the click", () => {
  const h = makeHarness();
  try {
    const center = tileCenter(6, 4);
    const rect = h.canvas.getBoundingClientRect();
    const pointer = {
      clientX: rect.left + rect.width / 2 + center.x,
      clientY: rect.top + center.y,
      button: 0,
    };
    h.dispatch("click", pointer);
    assert.deepEqual(h.state.getState().activeTile, { row: 6, column: 4 });
  } finally { h.restore(); }
});

test("equal line-mode and pixel-mode wheel travel produces the same camera zoom", () => {
  const pixels = makeHarness();
  const lines = makeHarness();
  try {
    const rect = pixels.canvas.getBoundingClientRect();
    const pointer = { clientX: rect.left + rect.width / 2 + 30, clientY: rect.top + 180 };
    wheelAt(pixels, pointer.clientX, pointer.clientY, -48, 0);
    wheelAt(lines, pointer.clientX, pointer.clientY, -3, 1);
    assertClose(lines.state.getState().zoom, pixels.state.getState().zoom, "line/pixel zoom equivalence");
  } finally {
    pixels.restore();
    lines.restore();
  }
});

test("wheel input is cancelled and invalid pointer coordinates cannot corrupt camera state", () => {
  const h = makeHarness();
  try {
    let prevented = 0;
    const before = h.state.getState();
    h.dispatch("wheel", {
      clientX: NaN, clientY: 200, deltaY: -400,
      preventDefault() { prevented++; },
    });
    assert.equal(prevented, 1);
    const after = h.state.getState();
    assert.equal(after.zoom, before.zoom);
    assert.deepEqual(after.pan, before.pan);
    assert.ok(Number.isFinite(after.zoom));
    assert.ok(Number.isFinite(after.pan.x) && Number.isFinite(after.pan.y));
  } finally { h.restore(); }
});

test("pointer events from another pointer cannot move or end an active pan", () => {
  const h = makeHarness();
  try {
    const rect = h.canvas.getBoundingClientRect();
    h.dispatch("pointerdown", {
      button: 1, pointerId: 31, clientX: rect.left + 100, clientY: rect.top + 100,
      preventDefault() {},
    });
    h.dispatch("pointermove", { pointerId: 32, clientX: rect.left + 900, clientY: rect.top + 900 });
    assert.deepEqual(h.state.getState().pan, { x: 0, y: 0 });
    h.dispatch("pointerup", { pointerId: 32 });
    assert.equal(h.state.getState().dragging, true);
    h.dispatch("pointermove", { pointerId: 31, clientX: rect.left + 120, clientY: rect.top + 70 });
    assert.deepEqual(h.state.getState().pan, { x: 20, y: -30 });
    h.dispatch("pointerup", { pointerId: 31 });
    assert.equal(h.state.getState().dragging, false);
  } finally { h.restore(); }
});

test("hover clears outside the plane, returns on re-entry, and an empty click keeps selection", () => {
  const h = makeHarness();
  try {
    const selectedCenter = tileCenter(3, 4);
    let rect = h.canvas.getBoundingClientRect();
    const selectedPointer = {
      clientX: rect.left + rect.width / 2 + selectedCenter.x,
      clientY: rect.top + selectedCenter.y,
      button: 0,
    };
    h.dispatch("click", selectedPointer);
    assert.deepEqual(h.state.getState().activeTile, { row: 3, column: 4 });

    h.dispatch("pointermove", { clientX: rect.left - 500, clientY: rect.top - 500 });
    assert.equal(h.state.getState().hoveredTile, null);
    assert.deepEqual(h.state.getState().activeTile, { row: 3, column: 4 });
    h.dispatch("click", { clientX: rect.left - 500, clientY: rect.top - 500, button: 0 });
    assert.deepEqual(h.state.getState().activeTile, { row: 3, column: 4 });

    rect = h.canvas.getBoundingClientRect();
    const nextCenter = tileCenter(6, 6);
    h.dispatch("pointermove", {
      clientX: rect.left + rect.width / 2 + nextCenter.x,
      clientY: rect.top + nextCenter.y,
    });
    assert.deepEqual(h.state.getState().hoveredTile, { row: 6, column: 6 });
  } finally { h.restore(); }
});

test("workspace inspector mirrors hover, selection, pan and zoom through varied viewport/DPR cases", () => {
  const environments = [
    { width: 390, height: 844, devicePixelRatio: 1 },
    { width: 800, height: 600, devicePixelRatio: 1.25 },
    { width: 1280, height: 720, devicePixelRatio: 2 },
    { width: 1920, height: 1080, devicePixelRatio: 3 },
  ];
  const targets = [[0, 0], [0, 11], [5, 5], [11, 0], [11, 11]];

  for (const environment of environments) {
    const h = makeHarness(environment);
    try {
      assert.equal(h.uiElements.get("#plane-size").textContent, `${PLANE.columns} × ${PLANE.rows} tile`);
      assert.equal(h.uiElements.get("#camera-zoom").textContent, "100%");

      for (const [row, column] of targets) {
        const center = tileCenter(row, column);
        const rect = h.canvas.getBoundingClientRect();
        const pointer = {
          clientX: rect.left + rect.width / 2 + center.x,
          clientY: rect.top + center.y,
        };
        h.dispatch("pointermove", pointer);
        assert.equal(h.uiElements.get("#hover-value").textContent,
          `Kolom ${column + 1}, Baris ${row + 1} · [${column}, ${row}]`);
        h.dispatch("click", { ...pointer, button: 0 });
        assert.equal(h.uiElements.get("#selected-index").textContent, `[${column}, ${row}]`);
        assert.equal(h.uiElements.get("#selection-summary").textContent, "Tile sedang dipilih");
      }

      const rect = h.canvas.getBoundingClientRect();
      const focusX = rect.left + rect.width * 0.72;
      const focusY = rect.top + rect.height * 0.36;
      wheelAt(h, focusX, focusY, -700);
      assert.equal(h.uiElements.get("#camera-zoom").textContent,
        `${Math.round(h.state.getState().zoom * 100)}%`);

      const panStart = h.canvas.getBoundingClientRect();
      const startX = panStart.left + panStart.width / 2;
      const startY = panStart.top + panStart.height / 2;
      h.dispatch("pointerdown", {
        button: 1, pointerId: 91, clientX: startX, clientY: startY, preventDefault() {},
      });
      assert.equal(h.uiElements.get("#camera-mode").textContent, "Menggeser");
      h.dispatch("pointermove", { pointerId: 91, clientX: startX + 37, clientY: startY - 19 });
      assert.equal(h.uiElements.get("#camera-pan").textContent,
        `${h.state.getState().pan.x >= 0 ? "+" : ""}${Math.round(h.state.getState().pan.x)}, ${h.state.getState().pan.y >= 0 ? "+" : ""}${Math.round(h.state.getState().pan.y)} px`);
      h.dispatch("pointerup", { pointerId: 91 });
      assert.equal(h.uiElements.get("#camera-mode").textContent, "Siap");

      h.uiElements.get("#reset-camera").dispatch("click");
      assert.deepEqual(h.state.getState().pan, { x: 0, y: 0 });
      assert.equal(h.state.getState().zoom, 1);
      assert.equal(h.uiElements.get("#camera-zoom").textContent, "100%");
      assert.equal(h.uiElements.get("#camera-pan").textContent, "+0, +0 px");
      assert.ok(h.state.getState().activeTile, "reset kamera tidak boleh menghapus tile terpilih");
    } finally { h.restore(); }
  }
});

test("right object and tile-selection panels expand independently and keep the action rail synchronized", () => {
  const h = makeHarness();
  try {
    const objectsPanel = h.uiElements.get("#objects-panel");
    const objectsExpand = h.uiElements.get("#objects-expand");
    const selectionPanel = h.uiElements.get("#selection-panel");
    const selectionExpand = h.uiElements.get("#selection-expand");

    assert.equal(objectsExpand.attributes["aria-expanded"], "false");
    assert.equal(selectionExpand.attributes["aria-expanded"], "false");
    assert.equal(h.bodyClasses.has("right-wide"), false);

    selectionExpand.dispatch("click");
    assert.equal(selectionPanel.classList.contains("is-expanded"), true);
    assert.equal(selectionExpand.attributes["aria-expanded"], "true");
    assert.equal(h.bodyClasses.has("right-wide"), false,
      "expanding the lower panel does not move the upper action rail");

    objectsExpand.dispatch("click");
    assert.equal(objectsPanel.classList.contains("is-expanded"), true);
    assert.equal(objectsExpand.classList.contains("is-expanded"), true);
    assert.equal(objectsExpand.attributes["aria-expanded"], "true");
    assert.equal(objectsExpand.attributes["aria-label"], "Perkecil panel daftar objek");
    assert.equal(h.bodyClasses.has("right-wide"), true,
      "the action rail follows the upper panel");

    objectsExpand.dispatch("click");
    assert.equal(objectsPanel.classList.contains("is-expanded"), false);
    assert.equal(h.bodyClasses.has("right-wide"), false,
      "the lower panel does not keep the action rail shifted");

    selectionExpand.dispatch("click");
    assert.equal(selectionPanel.classList.contains("is-expanded"), false);
    assert.equal(selectionExpand.attributes["aria-expanded"], "false");
    assert.equal(selectionExpand.attributes["aria-label"], "Perluas panel tile selection");
    assert.equal(h.bodyClasses.has("right-wide"), false,
      "the action rail returns only after both panels are collapsed");
  } finally { h.restore(); }
});

test("elevation controls activate only after selecting a tile and enforce level zero", () => {
  const h = makeHarness();
  try {
    const decrease = h.uiElements.get("#elevation-decrease");
    const increase = h.uiElements.get("#elevation-increase");
    assert.equal(decrease.disabled, true);
    assert.equal(increase.disabled, true);
    assert.match(h.uiElements.get("#selection-hint").textContent, /Klik tile/);

    const target = { row: 4, column: 5 };
    const center = tileCenter(target.row, target.column);
    const rect = h.canvas.getBoundingClientRect();
    const pointer = {
      clientX: rect.left + rect.width / 2 + center.x,
      clientY: rect.top + center.y,
      button: 0,
    };
    h.dispatch("click", pointer);
    assert.deepEqual(h.state.getState().activeTile, target);
    assert.equal(decrease.disabled, true, "decrease is disabled at the minimum level");
    assert.equal(increase.disabled, false);
    assert.match(h.uiElements.get("#selection-hint").textContent, /Gunakan/);

    increase.dispatch("click");
    assert.equal(h.state.getState().activeElevation, 1);
    assert.equal(h.state.getState().topPadding, 8);
    assert.equal(h.uiElements.get("#selected-elevation").textContent, "1");
    assert.equal(h.uiElements.get("#selected-rise").textContent, "8 px");
    assert.equal(h.uiElements.get("#selected-center").textContent, `${center.x}, ${center.y - 8} px`);
    assert.equal(decrease.disabled, false);

    decrease.dispatch("click");
    assert.equal(h.state.getState().activeElevation, 0);
    assert.equal(h.state.getState().topPadding, 0);
    assert.equal(h.uiElements.get("#selected-rise").textContent, "0 px");
    assert.equal(decrease.disabled, true);
    assert.equal(increase.disabled, false);
  } finally { h.restore(); }
});

test("elevation is per-tile, retained across selection changes, and does not enable controls without a selection", () => {
  const h = makeHarness({ width: 1440, height: 900, devicePixelRatio: 2 });
  try {
    const increase = h.uiElements.get("#elevation-increase");
    const decrease = h.uiElements.get("#elevation-decrease");
    const clickTile = (row, column) => {
      const state = h.state.getState();
      const center = tileCenter(row, column);
      const rect = h.canvas.getBoundingClientRect();
      const level = state.elevations.get(`${row},${column}`) ?? 0;
      h.dispatch("click", {
        clientX: rect.left + rect.width / 2 + center.x * state.zoom,
        clientY: rect.top + (state.topPadding + center.y - level * 8) * state.zoom,
        button: 0,
      });
    };

    clickTile(3, 7);
    increase.dispatch("click");
    increase.dispatch("click");
    increase.dispatch("click");
    assert.equal(h.state.getState().activeElevation, 3);
    assert.equal(h.state.getState().topPadding, 24);

    clickTile(8, 2);
    assert.deepEqual(h.state.getState().activeTile, { row: 8, column: 2 });
    assert.equal(h.state.getState().activeElevation, 0);
    assert.equal(increase.disabled, false);
    assert.equal(decrease.disabled, true);
    increase.dispatch("click");
    assert.equal(h.state.getState().activeElevation, 1);
    assert.equal(h.state.getState().elevations.get("3,7"), 3);
    assert.equal(h.state.getState().elevations.get("8,2"), 1);
    assert.equal(h.state.getState().topPadding, 24,
      "canvas padding follows the maximum elevation, not only the active tile");

    clickTile(8, 2);
    assert.equal(h.state.getState().activeTile, null);
    assert.equal(increase.disabled, true);
    assert.equal(decrease.disabled, true);
  } finally { h.restore(); }
});

test("elevated top faces remain selectable after canvas padding grows at varied zoom and viewport sizes", () => {
  const environments = [
    { width: 390, height: 844, devicePixelRatio: 1 },
    { width: 768, height: 900, devicePixelRatio: 1.25 },
    { width: 1280, height: 720, devicePixelRatio: 1.5 },
    { width: 1920, height: 1080, devicePixelRatio: 2 },
  ];
  const zoomDeltas = [-450, -150, 180, 600];
  for (const environment of environments) {
    const h = makeHarness(environment);
    try {
      const target = { row: 6, column: 4 };
      const baseCenter = tileCenter(target.row, target.column);
      let rect = h.canvas.getBoundingClientRect();
      let pointer = {
        clientX: rect.left + rect.width / 2 + baseCenter.x,
        clientY: rect.top + baseCenter.y,
        button: 0,
      };
      h.dispatch("click", pointer);
      assert.deepEqual(h.state.getState().activeTile, target);
      for (let level = 1; level <= 5; level++) {
        h.uiElements.get("#elevation-increase").dispatch("click");
        assert.equal(h.state.getState().activeElevation, level);
        assert.equal(h.state.getState().topPadding, level * 8);
        rect = h.canvas.getBoundingClientRect();
        const state = h.state.getState();
        pointer = {
          clientX: rect.left + rect.width / 2 + baseCenter.x * state.zoom,
          clientY: rect.top + (state.topPadding + baseCenter.y - level * 8) * state.zoom,
        };
        h.dispatch("pointermove", pointer);
        assert.deepEqual(h.state.getState().hoveredTile, target,
          `elevated tile remains under the pointer at ${environment.width}x${environment.height}, level ${level}`);
      }
      for (const deltaY of zoomDeltas) {
        rect = h.canvas.getBoundingClientRect();
        wheelAt(h, rect.left + rect.width * 0.61, rect.top + rect.height * 0.43, deltaY);
        assert.ok(Number.isFinite(h.state.getState().zoom));
        assert.ok(h.state.getState().zoom >= 0.25 && h.state.getState().zoom <= 4);
      }
    } finally { h.restore(); }
  }
});
