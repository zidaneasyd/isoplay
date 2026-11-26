import test from "node:test";
import assert from "node:assert/strict";
import { PLANE } from "../src/config.js";
import {
  formatPan,
  formatTile,
  formatTileCenter,
  formatZoom,
  initializeInspector,
} from "../src/ui.js";

function makeElement() {
  const listeners = new Map();
  const attributes = {};
  const classes = new Set();
  return {
    textContent: "",
    value: "",
    checked: false,
    attributes,
    listeners,
    addEventListener(type, callback) {
      const items = listeners.get(type) ?? [];
      items.push(callback);
      listeners.set(type, items);
    },
    dispatch(type, event = {}) {
      for (const callback of listeners.get(type) ?? []) callback(event);
    },
    setAttribute(name, value) { attributes[name] = value; },
    classList: {
      toggle(name) {
        if (classes.has(name)) { classes.delete(name); return false; }
        classes.add(name);
        return true;
      },
      contains(name) { return classes.has(name); },
    },
  };
}

function makeInspector() {
  const ids = [
    "#inspector-panel", "#inspector-toggle", "#reset-camera", "#plane-label", "#plane-size",
    "#plane-dimensions", "#tile-size", "#grid-size-slider", "#grid-size-value",
    "#axis-toggle", "#grid-toggle", "#coord-toggle", "#zoom-slider", "#hover-value", "#selected-value", "#selection-summary", "#selected-index",
    "#selected-detail-coord", "#selected-center", "#camera-zoom", "#camera-pan",
    "#camera-mode", "#footer-selection", "#footer-zoom",
  ];
  const elements = new Map(ids.map((id) => [id, makeElement()]));
  const documentRef = { querySelector: (selector) => elements.get(selector) ?? null };
  let resetCount = 0;
  const controls = { gridSize: [], zoom: [], visibility: [] };
  const inspector = initializeInspector(documentRef, {
    onResetCamera: () => resetCount++,
    onGridSizeChange: (value) => controls.gridSize.push(value),
    onZoomChange: (value) => controls.zoom.push(value),
    onVisibilityChange: (key, value) => controls.visibility.push([key, value]),
  });
  return { elements, inspector, controls, get resetCount() { return resetCount; } };
}

const element = (fixture, selector) => fixture.elements.get(selector);

test("inspector starts with project configuration and empty selection", () => {
  const h = makeInspector();
  h.inspector.render({ zoom: 1, pan: { x: 0, y: 0 } });
  assert.equal(element(h, "#plane-size").textContent, `${PLANE.columns} × ${PLANE.rows} tile`);
  assert.equal(element(h, "#tile-size").textContent, `${PLANE.tileWidth} × ${PLANE.tileHeight} px`);
  assert.equal(element(h, "#hover-value").textContent, "—");
  assert.equal(element(h, "#selected-value").textContent, "—");
  assert.equal(element(h, "#selection-summary").textContent, "Belum ada tile dipilih");
  assert.equal(element(h, "#selected-center").textContent, "—");
  assert.equal(element(h, "#camera-zoom").textContent, "100%");
  assert.equal(element(h, "#camera-pan").textContent, "+0, +0 px");
  assert.equal(element(h, "#camera-mode").textContent, "Siap");
});

test("every tile coordinate and center is rendered consistently (12 × 12 matrix)", () => {
  const h = makeInspector();
  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      const tile = { row, column };
      h.inspector.render({ zoom: 1, pan: { x: 0, y: 0 }, hoveredTile: tile, activeTile: tile });
      assert.equal(element(h, "#hover-value").textContent,
        `Kolom ${column + 1}, Baris ${row + 1} · [${column}, ${row}]`);
      assert.equal(element(h, "#selected-value").textContent,
        `Kolom ${column + 1}, Baris ${row + 1} · [${column}, ${row}]`);
      assert.equal(element(h, "#selected-detail-coord").textContent, `[${column}, ${row}]`);
      assert.equal(element(h, "#selected-index").textContent, `[${column}, ${row}]`);
      assert.equal(element(h, "#selected-center").textContent, formatTileCenter(tile));
      assert.equal(element(h, "#footer-selection").textContent, `Tile: ${column}, ${row}`);
    }
  }
});

test("camera fields remain finite and formatted across zoom and pan extremes", () => {
  const h = makeInspector();
  const zooms = [0.25, 0.3, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, NaN, Infinity, 0, -1];
  const pans = [
    { x: 0, y: 0 }, { x: 0.49, y: -0.49 }, { x: 12.8, y: -65.2 },
    { x: -4096, y: 8192 }, { x: 1e6, y: -1e6 }, { x: NaN, y: Infinity }, null,
  ];
  for (const zoom of zooms) {
    for (const pan of pans) {
      h.inspector.render({ zoom, pan, dragging: false });
      assert.equal(element(h, "#camera-zoom").textContent, formatZoom(zoom));
      assert.equal(element(h, "#camera-pan").textContent, formatPan(pan));
      assert.ok(!element(h, "#camera-zoom").textContent.includes("NaN"));
      assert.ok(!element(h, "#camera-pan").textContent.includes("NaN"));
    }
  }
});

test("invalid selection and hover values are safely represented as empty", () => {
  const h = makeInspector();
  for (const invalid of [null, undefined, { row: -1, column: 0 }, { row: 0, column: 12 },
    { row: 1.5, column: 2 }, { row: "2", column: 3 }, { row: 99, column: 99 }]) {
    h.inspector.render({ zoom: 1, pan: { x: 0, y: 0 }, hoveredTile: invalid, activeTile: invalid });
    assert.equal(element(h, "#hover-value").textContent, "—");
    assert.equal(element(h, "#selected-value").textContent, "—");
    assert.equal(element(h, "#selected-index").textContent, "—");
    assert.equal(element(h, "#selected-center").textContent, "—");
    assert.equal(element(h, "#selection-summary").textContent, "Belum ada tile dipilih");
  }
});

test("inspector toggle updates its state and accessible label on repeated use", () => {
  const h = makeInspector();
  element(h, "#inspector-toggle").dispatch("click");
  assert.equal(element(h, "#inspector-panel").classList.contains("is-hidden"), true);
  assert.equal(element(h, "#inspector-toggle").attributes["aria-expanded"], "false");
  assert.equal(element(h, "#inspector-toggle").attributes["aria-label"], "Tampilkan inspector");
  element(h, "#inspector-toggle").dispatch("click");
  assert.equal(element(h, "#inspector-panel").classList.contains("is-hidden"), false);
  assert.equal(element(h, "#inspector-toggle").attributes["aria-expanded"], "true");
  assert.equal(element(h, "#inspector-toggle").attributes["aria-label"], "Sembunyikan inspector");
});

test("reset camera control invokes the real camera reset callback", () => {
  const h = makeInspector();
  element(h, "#reset-camera").dispatch("click");
  element(h, "#reset-camera").dispatch("click");
  assert.equal(h.resetCount, 2);
});

test("format helpers reject bad inputs and preserve signed pan values", () => {
  assert.equal(formatTile(null), "—");
  assert.equal(formatTile({ row: 0, column: 0 }), "Kolom 1, Baris 1 · [0, 0]");
  assert.equal(formatTileCenter({ row: 0, column: 0 }), "0, 16 px");
  assert.equal(formatTileCenter({ row: 11, column: 11 }), "0, 368 px");
  assert.equal(formatZoom(2.5), "250%");
  assert.equal(formatZoom(NaN), "100%");
  assert.equal(formatPan({ x: -2.6, y: 4.4 }), "-3, +4 px");
  assert.equal(formatPan({ x: NaN, y: Infinity }), "+0, +0 px");
});


test("workspace controls forward validated grid, zoom and visibility changes", () => {
  const h = makeInspector();
  const grid = element(h, "#grid-size-slider");
  grid.value = "24";
  grid.dispatch("input", { target: grid });
  const zoom = element(h, "#zoom-slider");
  zoom.value = "175";
  zoom.dispatch("input", { target: zoom });
  const axis = element(h, "#axis-toggle");
  axis.checked = false;
  axis.dispatch("change", { target: axis });
  assert.deepEqual(h.controls.gridSize, [24]);
  assert.deepEqual(h.controls.zoom, [1.75]);
  assert.deepEqual(h.controls.visibility, [["showAxes", false]]);
});

test("inspector reflects runtime plane dimensions and display state", () => {
  const h = makeInspector();
  const plane = { ...PLANE, rows: 16, columns: 16, width: 1024, height: 512 };
  h.inspector.render({
    plane, zoom: 1.5, pan: { x: 0, y: 0 },
    visual: { showGrid: false, showAxes: true, showCoordinates: true },
  });
  assert.equal(element(h, "#plane-size").textContent, "16 × 16 tile");
  assert.equal(element(h, "#plane-dimensions").textContent, "1024 × 512 px");
  assert.equal(element(h, "#plane-label").textContent, "Plane · 16 × 16 tile");
  assert.equal(element(h, "#grid-size-value").textContent, "16 × 16");
  assert.equal(element(h, "#axis-toggle").checked, true);
  assert.equal(element(h, "#grid-toggle").checked, false);
  assert.equal(element(h, "#coord-toggle").checked, true);
  assert.equal(element(h, "#zoom-slider").value, "150");
});
