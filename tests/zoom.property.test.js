import test from "node:test";
import assert from "node:assert/strict";
import { MAX_ZOOM, MIN_ZOOM } from "../src/config.js";
import {
  clampZoom,
  normalizeWheelDelta,
  panToKeepZoomFocus,
  zoomFocusFromRect,
  zoomLevelForWheel,
} from "../src/zoom.js";

const near = (actual, expected, label) => {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${label}: ${actual} != ${expected}`);
};

test("wheel zoom is monotonic for a matrix of starting zooms and wheel deltas", () => {
  const starts = [MIN_ZOOM, 0.35, 0.5, 1, 1.7, 2.5, MAX_ZOOM];
  const deltas = [-5000, -1000, -250, -1, 0, 1, 250, 1000, 5000];
  for (const start of starts) {
    let previous = MAX_ZOOM;
    for (const delta of deltas) {
      const result = zoomLevelForWheel(start, delta);
      assert.ok(result >= MIN_ZOOM && result <= MAX_ZOOM);
      if (delta >= 0) assert.ok(result <= start + 1e-12, `positive delta ${delta} must not zoom in`);
      if (delta <= 0) assert.ok(result >= start - 1e-12, `negative delta ${delta} must not zoom out`);
      if (delta >= 0) assert.ok(result <= previous + 1e-12, "more positive wheel delta should not increase zoom");
      if (delta >= 0) previous = result;
    }
  }
});

test("equal pixel and line-mode wheel distances produce equal zoom", () => {
  const lineHeight = 16; // Must match the application's documented line-mode conversion.
  for (const lines of [-8, -3, -1, 1, 3, 8]) {
    const pixels = normalizeWheelDelta({ deltaY: lines * lineHeight, deltaMode: 0 });
    const linePixels = normalizeWheelDelta({ deltaY: lines, deltaMode: 1 });
    assert.equal(linePixels, pixels);
    near(zoomLevelForWheel(1.4, linePixels), zoomLevelForWheel(1.4, pixels), `${lineHeight}px × ${lines} lines`);
  }
});

test("zooming in and then out by equal wheel travel is reversible away from limits", () => {
  for (const start of [0.5, 0.75, 1, 1.4, 2]) {
    for (const delta of [30, 100, 250, 500]) {
      const zoomedIn = zoomLevelForWheel(start, -delta);
      const restored = zoomLevelForWheel(zoomedIn, delta);
      near(restored, start, `start ${start}, travel ${delta}`);
    }
  }
});

test("pan focus invariance holds across zoom, pan and focus parameter combinations", () => {
  const pans = [{ x: 0, y: 0 }, { x: 83, y: -41 }, { x: -900, y: 620 }];
  const zooms = [MIN_ZOOM, 0.5, 1, 1.8, MAX_ZOOM];
  const focuses = [[0, 0], [100, -70], [-384, -192], [500, 220]];
  for (const pan of pans) {
    for (const oldZoom of zooms) {
      for (const nextZoom of zooms) {
        for (const [focusX, focusY] of focuses) {
          const nextPan = panToKeepZoomFocus(pan, oldZoom, nextZoom, focusX, focusY);
          near(pan.x + focusX * oldZoom, nextPan.x + focusX * nextZoom, "screen focus X");
          near(pan.y + focusY * oldZoom, nextPan.y + focusY * nextZoom, "screen focus Y");
        }
      }
    }
  }
});

test("zoom focus extraction is stable across scaled rectangles and rejects bad coordinates", () => {
  const viewports = [[390, 844], [800, 600], [1366, 768], [1920, 1080], [3840, 2160]];
  const zooms = [MIN_ZOOM, 0.5, 1, 2.4, MAX_ZOOM];
  const points = [[0.1, 0.1], [0.5, 0.5], [0.9, 0.8]];
  for (const [width, height] of viewports) {
    for (const zoom of zooms) {
      const rect = { left: 30, top: 50, width: 768 * zoom, height: 384 * zoom };
      for (const [rx, ry] of points) {
        const x = rect.left + rect.width * rx;
        const y = rect.top + rect.height * ry;
        const focus = zoomFocusFromRect(rect, x, y, zoom);
        near(rect.left + rect.width / 2 + focus.x * zoom, x, `X @ ${width}x${height}/${zoom}`);
        near(rect.top + rect.height / 2 + focus.y * zoom, y, `Y @ ${width}x${height}/${zoom}`);
      }
    }
  }
  for (const value of [NaN, Infinity, -Infinity, undefined]) {
    assert.equal(zoomFocusFromRect({ left: 0, top: 0, width: 100, height: 100 }, value, 10, 1), null);
    assert.equal(zoomFocusFromRect({ left: 0, top: 0, width: 100, height: 100 }, 10, value, 1), null);
  }
});
