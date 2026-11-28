export function createRenderScheduler(render) {
  let frameId = null;
  let continuous = false;
  let previousTime = null;
  let disposed = false;

  function schedule() {
    if (!disposed && frameId === null) frameId = requestAnimationFrame(frame);
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
    dispose() {
      disposed = true;
      continuous = false;
      if (frameId !== null) globalThis.cancelAnimationFrame?.(frameId);
      frameId = null;
    },
  };
}
