export function createRenderScheduler(render, {
  requestFrame = (callback) => requestAnimationFrame(callback),
  cancelFrame = (id) => globalThis.cancelAnimationFrame?.(id),
} = {}) {
  let frameId = null;
  let continuous = false;
  let previousTime = null;
  let disposed = false;

  function schedule() {
    if (!disposed && frameId === null) frameId = requestFrame(frame);
  }

  function cancelPendingFrame() {
    if (frameId === null) return;
    cancelFrame(frameId);
    frameId = null;
  }

  function frame(time) {
    frameId = null;
    const dt = continuous && previousTime !== null ? (time - previousTime) / 1000 : 0;
    previousTime = continuous ? time : null;
    render(dt);
    if (continuous) schedule();
  }

  return {
    invalidate: schedule,
    setContinuous(enabled) {
      continuous = Boolean(enabled);
      previousTime = null;
      if (continuous) schedule();
    },
    isContinuous: () => continuous,
    isPending: () => frameId !== null,
    cancel: cancelPendingFrame,
    dispose() {
      disposed = true;
      continuous = false;
      cancelPendingFrame();
    },
  };
}
