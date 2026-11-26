import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  normalizeWheelDelta,
  panToKeepZoomFocus,
  zoomFocusFromRect,
  zoomLevelForWheel,
} from "../plane.js";

const near = (actual, expected, message = "nilai tidak cocok") => {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${message}: ${actual} !== ${expected}`);
};

test("wheel zoom follows direction and clamps at both zoom limits", () => {
  assert.ok(zoomLevelForWheel(1, -500) > 1);
  assert.ok(zoomLevelForWheel(1, 500) < 1);
  assert.equal(zoomLevelForWheel(MAX_ZOOM, -1e6), MAX_ZOOM);
  assert.equal(zoomLevelForWheel(MIN_ZOOM, 1e6), MIN_ZOOM);
  assert.equal(zoomLevelForWheel(1, 0), 1);
});

test("zoom inputs are sanitized instead of producing NaN or Infinity", () => {
  assert.equal(clampZoom(NaN), 1);
  assert.equal(clampZoom(Infinity), 1);
  assert.equal(clampZoom(-10), MIN_ZOOM);
  assert.equal(clampZoom(100), MAX_ZOOM);
  assert.equal(zoomLevelForWheel(1, NaN), 1);
  assert.equal(zoomLevelForWheel(1, Infinity), 1);
  assert.ok(Number.isFinite(zoomLevelForWheel(1, -Number.MAX_VALUE)));
});

test("wheel delta normalization supports pixel, line, page and missing values", () => {
  assert.equal(normalizeWheelDelta({ deltaY: 10, deltaMode: 0 }), 10);
  assert.equal(normalizeWheelDelta({ deltaY: 2, deltaMode: 1 }), 32);
  assert.equal(normalizeWheelDelta({ deltaY: 1, deltaMode: 2 }, 720), 720);
  assert.equal(normalizeWheelDelta({ deltaY: NaN, deltaMode: 0 }), 0);
  assert.equal(normalizeWheelDelta(null), 0);
});

test("zoom pan preserves a selected focus point on screen", () => {
  const pan = { x: 83, y: -41 };
  const oldZoom = 1.25;
  const nextZoom = 2.1;
  const focus = { x: 74, y: -52 };
  const nextPan = panToKeepZoomFocus(pan, oldZoom, nextZoom, focus.x, focus.y);

  near(pan.x + focus.x * oldZoom, nextPan.x + focus.x * nextZoom);
  near(pan.y + focus.y * oldZoom, nextPan.y + focus.y * nextZoom);
});

test("zoom focus is measured from the transformed center, on both axes", () => {
  const rect = { left: 120, top: 70, width: 960, height: 480 };
  assert.deepEqual(zoomFocusFromRect(rect, 600, 310, 1.25), { x: 0, y: 0 });
  assert.deepEqual(zoomFocusFromRect(rect, 360, 190, 1.25), { x: -192, y: -96 });
  assert.equal(zoomFocusFromRect({ ...rect, width: 0 }, 600, 310, 1.25), null);
  assert.equal(zoomFocusFromRect(null, 0, 0, 1), null);
});

test("zoom pan does not mutate input and handles malformed pan safely", () => {
  const pan = { x: 10, y: 20 };
  panToKeepZoomFocus(pan, 1, 2, 5, -3);
  assert.deepEqual(pan, { x: 10, y: 20 });
  assert.deepEqual(panToKeepZoomFocus(null, 1, 2, 5, -3), { x: -5, y: 3 });
  assert.deepEqual(panToKeepZoomFocus(pan, 1, 2, NaN, 2), { x: 10, y: 20 });
});
