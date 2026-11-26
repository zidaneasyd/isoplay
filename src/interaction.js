import {
  DEFAULT_ZOOM,
  ELEVATION_STEP_PX,
  MAX_ZOOM,
  MIN_ZOOM,
  PLANE,
  createPlaneConfig,
  normalizeGridSize,
} from "./config.js";
import { getMaximumElevationPixels, getTileElevation, setTileElevation } from "./elevation.js";
import { hitTestTileAtElevations, isTileInRange, toggleActiveTile } from "./geometry.js";
import { drawPlane } from "./render.js";
import { initializeInspector } from "./ui.js";
import {
  clampZoom,
  normalizeWheelDelta,
  panToKeepZoomFocus,
  zoomFocusFromRect,
  zoomLevelForWheel,
} from "./zoom.js";

const MAX_CANVAS_PIXELS = 32_000_000;
const MAX_CANVAS_DIMENSION = 8192;

function sameTile(a, b) {
  return a?.row === b?.row && a?.column === b?.column;
}

export function initializePlane() {
  const canvas = document.querySelector("#plane");
  if (!canvas) throw new Error('Elemen canvas "#plane" tidak ditemukan.');
  const board = canvas.parentElement;
  const context = canvas.getContext("2d");
  const readout = document.querySelector("#readout");
  if (!board || !context) throw new Error("Canvas plane atau konteks 2D tidak tersedia.");

  const plane = createPlaneConfig();
  const visual = { showGrid: true, showAxes: true, showCoordinates: false };
  let hoveredTile = null;
  let activeTile = null;
  const elevations = new Map();
  let topPadding = 0;
  let zoom = DEFAULT_ZOOM;
  let pan = { x: 0, y: 0 };
  let drag = null;
  let lastPointer = null;
  let inspector;

  function inspectorState() {
    return {
      plane, visual, zoom, pan, hoveredTile, activeTile, elevations,
      activeElevation: getTileElevation(elevations, activeTile, plane),
      dragging: Boolean(drag),
    };
  }

  function updateTransform() {
    const canvasHeight = plane.height + topPadding;
    const anchorY = plane.height / 2 + topPadding;
    board.style.width = `${plane.width}px`;
    board.style.height = `${canvasHeight}px`;
    board.style.marginTop = `${-anchorY}px`;
    board.style.marginLeft = `${-plane.width / 2}px`;
    canvas.style.width = `${plane.width}px`;
    canvas.style.height = `${canvasHeight}px`;
    board.style.transformOrigin = `${plane.width / 2}px ${anchorY}px`;
    board.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
    inspector?.render(inspectorState());
  }

  function draw() {
    const deviceRatio = Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0
      ? window.devicePixelRatio : 1;
    const cssHeight = plane.height + topPadding;
    const desiredRatio = deviceRatio * zoom;
    const pixelBudgetRatio = Math.sqrt(MAX_CANVAS_PIXELS / (plane.width * cssHeight));
    const dimensionBudgetRatio = MAX_CANVAS_DIMENSION / Math.max(plane.width, cssHeight);
    const renderRatio = Math.min(desiredRatio, pixelBudgetRatio, dimensionBudgetRatio);
    const width = Math.max(1, Math.round(plane.width * renderRatio));
    const height = Math.max(1, Math.round(cssHeight * renderRatio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    drawPlane(context, { hoveredTile, activeTile, elevations, topPadding, plane, ...visual }, renderRatio, zoom);
  }

  function updateReadout() {
    inspector?.render(inspectorState());
    if (!readout) return;
    if (hoveredTile) {
      readout.textContent = `Hover: Kolom ${hoveredTile.column + 1}, Baris ${hoveredTile.row + 1} [${hoveredTile.column}, ${hoveredTile.row}]`;
    } else if (activeTile) {
      readout.textContent = `Aktif: Kolom ${activeTile.column + 1}, Baris ${activeTile.row + 1} [${activeTile.column}, ${activeTile.row}]`;
    } else {
      readout.textContent = "Arahkan kursor ke tile";
    }
  }

  function updateHover(event) {
    if (!event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const planeX = (event.clientX - rect.left) / zoom - plane.width / 2;
    const planeY = (event.clientY - rect.top) / zoom - topPadding;
    const nextTile = hitTestTileAtElevations(planeX, planeY, elevations, plane);
    if (!sameTile(hoveredTile, nextTile)) {
      hoveredTile = nextTile;
      updateReadout();
      draw();
    }
  }

  function resetCamera() {
    zoom = DEFAULT_ZOOM;
    pan = { x: 0, y: 0 };
    drag = null;
    canvas.style.cursor = "";
    updateTransform();
    draw();
    if (lastPointer) updateHover(lastPointer);
    else {
      hoveredTile = null;
      updateReadout();
    }
  }

  function changeActiveElevation(delta) {
    if (!activeTile || !Number.isFinite(delta)) return;
    const currentLevel = getTileElevation(elevations, activeTile, plane);
    const nextLevel = Math.max(0, currentLevel + Math.trunc(delta));
    if (nextLevel === currentLevel) return;

    setTileElevation(elevations, activeTile, nextLevel, plane);
    topPadding = getMaximumElevationPixels(elevations);
    updateTransform();
    draw();
    if (lastPointer) updateHover(lastPointer);
    updateReadout();
  }

  function changeGridSize(value) {
    const nextSize = normalizeGridSize(value);
    if (nextSize === plane.columns) return;
    plane.columns = nextSize;
    plane.rows = nextSize;
    plane.width = nextSize * plane.tileWidth;
    plane.height = nextSize * plane.tileHeight;

    // Drop data that falls outside a shrunken plane instead of retaining
    // invisible elevations which could unexpectedly reappear later.
    for (const key of elevations.keys()) {
      const [row, column] = key.split(",").map(Number);
      if (!isTileInRange(row, column, plane)) elevations.delete(key);
    }
    if (!isTileInRange(activeTile?.row, activeTile?.column, plane)) activeTile = null;
    if (!isTileInRange(hoveredTile?.row, hoveredTile?.column, plane)) hoveredTile = null;
    topPadding = getMaximumElevationPixels(elevations);
    updateTransform();
    draw();
    if (lastPointer) updateHover(lastPointer);
    updateReadout();
  }

  function changeVisibility(key, value) {
    if (!Object.hasOwn(visual, key)) return;
    visual[key] = Boolean(value);
    draw();
    inspector?.render(inspectorState());
  }

  function changeZoom(value) {
    if (!Number.isFinite(value)) return;
    const nextZoom = clampZoom(value);
    if (nextZoom === zoom) return;
    zoom = nextZoom;
    updateTransform();
    draw();
    if (lastPointer) updateHover(lastPointer);
  }

  inspector = initializeInspector(document, {
    plane,
    onResetCamera: resetCamera,
    onElevationChange: changeActiveElevation,
    onGridSizeChange: changeGridSize,
    onVisibilityChange: changeVisibility,
    onZoomChange: changeZoom,
  });

  function handlePointerMove(event) {
    lastPointer = { clientX: event.clientX, clientY: event.clientY };
    if (drag && drag.pointerId === event.pointerId) {
      pan = {
        x: pan.x + event.clientX - drag.x,
        y: pan.y + event.clientY - drag.y,
      };
      drag = { ...drag, x: event.clientX, y: event.clientY };
      hoveredTile = null;
      updateTransform();
    }
    updateHover(event);
  }

  function endPan(event) {
    if (!drag || (event?.pointerId !== undefined && drag.pointerId !== event.pointerId)) return;
    drag = null;
    canvas.style.cursor = "";
    inspector?.render(inspectorState());
  }

  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 1) return;
    event.preventDefault?.();
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    inspector?.render(inspectorState());
    try { canvas.setPointerCapture?.(event.pointerId); } catch { /* optional in test/headless contexts */ }
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointerup", endPan);
  canvas.addEventListener("pointercancel", endPan);
  canvas.addEventListener("lostpointercapture", endPan);

  canvas.addEventListener("wheel", (event) => {
    event.preventDefault?.();
    const rect = canvas.getBoundingClientRect();
    const oldZoom = zoom;
    const delta = normalizeWheelDelta(event, window.innerHeight || plane.height);
    const nextZoom = zoomLevelForWheel(oldZoom, delta);
    if (nextZoom === oldZoom) return;

    const focus = zoomFocusFromRect(rect, event.clientX, event.clientY, oldZoom, {
      x: plane.width / 2,
      y: plane.height / 2 + topPadding,
    });
    if (!focus) return;
    pan = panToKeepZoomFocus(pan, oldZoom, nextZoom, focus.x, focus.y);
    zoom = nextZoom;
    updateTransform();
    draw();
    updateHover(event);
  }, { passive: false });

  canvas.addEventListener("click", (event) => {
    if (event.button !== 0) return;
    updateHover(event);
    activeTile = toggleActiveTile(activeTile, hoveredTile, plane);
    updateReadout();
    draw();
  });

  canvas.addEventListener("pointerleave", () => {
    if (hoveredTile && !drag) {
      hoveredTile = null;
      updateReadout();
      draw();
    }
  });

  window.addEventListener?.("resize", () => {
    updateTransform();
    draw();
    if (lastPointer) updateHover(lastPointer);
  });

  updateTransform();
  updateReadout();
  draw();

  return {
    getState: () => ({
      zoom,
      pan: { ...pan },
      hoveredTile: hoveredTile ? { ...hoveredTile } : null,
      activeTile: activeTile ? { ...activeTile } : null,
      elevations: new Map(elevations),
      activeElevation: getTileElevation(elevations, activeTile, plane),
      topPadding,
      elevationStepPx: ELEVATION_STEP_PX,
      dragging: Boolean(drag),
      plane: { ...plane },
      visual: { ...visual },
      renderRatio: Math.min(
        (Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0 ? window.devicePixelRatio : 1) * zoom,
        Math.sqrt(MAX_CANVAS_PIXELS / (plane.width * (plane.height + topPadding))),
        MAX_CANVAS_DIMENSION / Math.max(plane.width, plane.height + topPadding),
      ),
    }),
  };
}
