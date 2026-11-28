export function createCamera({ minZoom = 0.25, maxZoom = 4 } = {}) {
  let offsetX = 0;
  let offsetY = 0;
  let zoom = 1;

  function screenToWorld(point, width, height) {
    return {
      x: width / 2 + (point.x - width / 2 - offsetX) / zoom,
      y: height / 2 + (point.y - height / 2 - offsetY) / zoom,
    };
  }

  function worldToScreen(point, width, height) {
    return {
      x: width / 2 + offsetX + (point.x - width / 2) * zoom,
      y: height / 2 + offsetY + (point.y - height / 2) * zoom,
    };
  }

  return {
    getState: () => ({ offsetX, offsetY, zoom }),
    panBy(dx, dy) {
      offsetX += dx;
      offsetY += dy;
    },
    screenToWorld,
    worldToScreen,
    zoomAt(nextZoom, point, width, height) {
      const anchor = screenToWorld(point, width, height);
      zoom = Math.min(maxZoom, Math.max(minZoom, nextZoom));
      offsetX = point.x - width / 2 - (anchor.x - width / 2) * zoom;
      offsetY = point.y - height / 2 - (anchor.y - height / 2) * zoom;
      return zoom;
    },
    applyToContext(context, width, height) {
      context.translate(width / 2 + offsetX, height / 2 + offsetY);
      context.scale(zoom, zoom);
      context.translate(-width / 2, -height / 2);
    },
    reset() {
      offsetX = 0;
      offsetY = 0;
      zoom = 1;
    },
  };
}

export function attachCameraControls(canvas, {
  camera,
  getCanvasSize,
  onChange = () => {},
  getDefaultCursor = () => "",
}) {
  let panPointer = null;

  function canvasPoint(event) {
    const bounds = canvas.getBoundingClientRect?.() ?? { left: 0, top: 0 };
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function setCursor(value) {
    if (canvas.style) canvas.style.cursor = value;
  }

  function finishPan(event) {
    if (!panPointer || (event?.pointerId !== undefined && event.pointerId !== panPointer.id)) return;
    panPointer = null;
    setCursor(getDefaultCursor());
  }

  const listeners = {
    wheel(event) {
      event.preventDefault();
      const { width, height } = getCanvasSize();
      const factor = Math.exp(-event.deltaY * 0.001);
      camera.zoomAt(camera.getState().zoom * factor, canvasPoint(event), width, height);
      onChange();
    },
    pointerdown(event) {
      if (event.button !== 1) return;
      event.preventDefault();
      panPointer = { id: event.pointerId, ...canvasPoint(event) };
      canvas.setPointerCapture?.(event.pointerId);
      setCursor("grabbing");
    },
    pointermove(event) {
      if (!panPointer || event.pointerId !== panPointer.id) return;
      const point = canvasPoint(event);
      const dx = point.x - panPointer.x;
      const dy = point.y - panPointer.y;
      panPointer = { id: panPointer.id, ...point };
      if (dx === 0 && dy === 0) return;
      camera.panBy(dx, dy);
      onChange();
    },
    pointerup: finishPan,
    pointercancel: finishPan,
    lostpointercapture: finishPan,
  };

  for (const [name, listener] of Object.entries(listeners)) {
    canvas.addEventListener?.(name, listener, name === "wheel" ? { passive: false } : undefined);
  }

  return {
    dispose() {
      for (const [name, listener] of Object.entries(listeners)) {
        canvas.removeEventListener?.(name, listener);
      }
      finishPan();
    },
  };
}
