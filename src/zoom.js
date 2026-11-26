import { DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM } from "./config.js";

const WHEEL_SENSITIVITY = 0.001;
const WHEEL_LINE_PIXELS = 16;

export function clampZoom(zoom) {
  const value = Number.isFinite(zoom) ? zoom : DEFAULT_ZOOM;
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
}

/** Normalize WheelEvent.deltaY into CSS pixels across browser delta modes. */
export function normalizeWheelDelta(event, viewportHeight = 800) {
  const deltaY = Number.isFinite(event?.deltaY) ? event.deltaY : 0;
  if (event?.deltaMode === 1) return deltaY * WHEEL_LINE_PIXELS;
  if (event?.deltaMode === 2) return deltaY * Math.max(1, viewportHeight);
  return deltaY;
}

export function zoomLevelForWheel(currentZoom, deltaY) {
  const current = clampZoom(currentZoom);
  if (!Number.isFinite(deltaY) || deltaY === 0) return current;
  // Limit the exponent to avoid Infinity/underflow for synthetic extreme inputs.
  const exponent = Math.max(-50, Math.min(50, -deltaY * WHEEL_SENSITIVITY));
  return clampZoom(current * Math.exp(exponent));
}

/**
 * Keep one plane-local focus point at the same screen position while zooming.
 * focusX/focusY are measured from the supplied camera anchor in plane units.
 */
export function panToKeepZoomFocus(pan, oldZoom, nextZoom, focusX, focusY) {
  const safePan = {
    x: Number.isFinite(pan?.x) ? pan.x : 0,
    y: Number.isFinite(pan?.y) ? pan.y : 0,
  };
  const oldScale = clampZoom(oldZoom);
  const nextScale = clampZoom(nextZoom);
  if (!Number.isFinite(focusX) || !Number.isFinite(focusY)) return safePan;
  const zoomDelta = oldScale - nextScale;
  return {
    x: safePan.x + focusX * zoomDelta,
    y: safePan.y + focusY * zoomDelta,
  };
}

/** Read a pointer's plane-local offset from a canvas-local camera anchor. */
export function zoomFocusFromRect(rect, clientX, clientY, zoom, anchor) {
  const scale = clampZoom(zoom);
  if (!rect || !Number.isFinite(clientX) || !Number.isFinite(clientY) ||
      !Number.isFinite(rect.left) || !Number.isFinite(rect.top) ||
      !Number.isFinite(rect.width) || !Number.isFinite(rect.height) ||
      rect.width <= 0 || rect.height <= 0) return null;

  const anchorX = Number.isFinite(anchor?.x) ? anchor.x : rect.width / (2 * scale);
  const anchorY = Number.isFinite(anchor?.y) ? anchor.y : rect.height / (2 * scale);
  return {
    x: (clientX - (rect.left + anchorX * scale)) / scale,
    y: (clientY - (rect.top + anchorY * scale)) / scale,
  };
}
