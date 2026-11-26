import { DEFAULT_ZOOM, ELEVATION_STEP_PX, PLANE } from "./config.js";
import { getMaximumElevationPixels, getTileElevation, setTileElevation } from "./elevation.js";
import { hitTestTileAtElevations, toggleActiveTile } from "./geometry.js";
import { drawPlane } from "./render.js";
import { initializeInspector } from "./ui.js";
import {
  normalizeWheelDelta,
  panToKeepZoomFocus,
  zoomFocusFromRect,
  zoomLevelForWheel,
} from "./zoom.js";

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

  let hoveredTile = null;
  let activeTile = null;
  const elevations = new Map();
  let topPadding = 0;
  let zoom = DEFAULT_ZOOM;
  let pan = { x: 0, y: 0 };
  let drag = null;
  let lastPointer = null;
  let inspector;

  // The ground plane keeps its native width/height; vertical canvas padding
  // grows with the highest tile so raised top faces are never clipped.
  function updateTransform() {
    const canvasHeight = PLANE.height + topPadding;
    board.style.width = `${PLANE.width}px`;
    board.style.height = `${canvasHeight}px`;
    board.style.marginTop = `${-canvasHeight / 2}px`;
    board.style.marginLeft = `${-PLANE.width / 2}px`;
    canvas.style.width = `${PLANE.width}px`;
    canvas.style.height = `${canvasHeight}px`;
    board.style.transformOrigin = "center center";
    board.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
    inspector?.render({
      zoom, pan, hoveredTile, activeTile, elevations,
      activeElevation: getTileElevation(elevations, activeTile),
      dragging: Boolean(drag),
    });
  }

  function draw() {
    const deviceRatio = Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0
      ? window.devicePixelRatio : 1;
    const renderRatio = deviceRatio * zoom;
    const width = Math.max(1, Math.round(PLANE.width * renderRatio));
    const height = Math.max(1, Math.round((PLANE.height + topPadding) * renderRatio));
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    drawPlane(context, { hoveredTile, activeTile, elevations, topPadding }, renderRatio, zoom);
  }

  function updateReadout() {
    inspector?.render({
      zoom, pan, hoveredTile, activeTile, elevations,
      activeElevation: getTileElevation(elevations, activeTile),
      dragging: Boolean(drag),
    });
    if (!readout) return;
    if (hoveredTile) {
      readout.textContent = `Hover: Kolom ${hoveredTile.column + 1}, Baris ${hoveredTile.row + 1} [${hoveredTile.column}, ${hoveredTile.row}]`;
    } else if (activeTile) {
      readout.textContent = `Aktif: Kolom ${activeTile.column + 1}, Baris ${activeTile.row + 1} [${activeTile.column}, ${activeTile.row}]`;
    } else {
      readout.textContent = "Arahkan kursor ke tile";
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
    const currentLevel = getTileElevation(elevations, activeTile);
    const nextLevel = Math.max(0, currentLevel + Math.trunc(delta));
    if (nextLevel === currentLevel) return;

    setTileElevation(elevations, activeTile, nextLevel);
    topPadding = getMaximumElevationPixels(elevations);
    updateTransform();
    draw();
    if (lastPointer) updateHover(lastPointer);
    updateReadout();
  }

  inspector = initializeInspector(document, {
    onResetCamera: resetCamera,
    onElevationChange: changeActiveElevation,
  });

  function updateHover(event) {
    if (!event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const planeX = (event.clientX - rect.left) / zoom - PLANE.width / 2;
    const planeY = (event.clientY - rect.top) / zoom - topPadding;
    const nextTile = hitTestTileAtElevations(planeX, planeY, elevations);
    if (!sameTile(hoveredTile, nextTile)) {
      hoveredTile = nextTile;
      updateReadout();
      draw();
    }
  }

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
    inspector?.render({
      zoom, pan, hoveredTile, activeTile, elevations,
      activeElevation: getTileElevation(elevations, activeTile),
      dragging: false,
    });
  }

  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 1) return;
    event.preventDefault?.();
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    inspector?.render({
      zoom, pan, hoveredTile, activeTile, elevations,
      activeElevation: getTileElevation(elevations, activeTile),
      dragging: true,
    });
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
    const delta = normalizeWheelDelta(event, window.innerHeight || PLANE.height);
    const nextZoom = zoomLevelForWheel(oldZoom, delta);
    if (nextZoom === oldZoom) return;

    const focus = zoomFocusFromRect(rect, event.clientX, event.clientY, oldZoom);
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
    activeTile = toggleActiveTile(activeTile, hoveredTile);
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
      hoveredTile,
      activeTile,
      elevations: new Map(elevations),
      activeElevation: getTileElevation(elevations, activeTile),
      topPadding,
      elevationStepPx: ELEVATION_STEP_PX,
      dragging: Boolean(drag),
    }),
  };
}
