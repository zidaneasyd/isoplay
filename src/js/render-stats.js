const EMPTY_VALUE = "—";

export function createRenderStats(outputs, {
  interval = 250,
  idleGap = 200,
  now = () => performance.now(),
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = (timerId) => clearTimeout(timerId),
} = {}) {
  if (!Object.values(outputs).some(Boolean)) return { record() {}, dispose() {} };

  const written = {};
  let latest = null;
  let timerId = null;
  let disposed = false;
  let lastFrameTime = null;
  let windowStart = null;
  let windowFrames = 0;
  let fps = null;

  function write(key, value) {
    const output = outputs[key];
    if (!output || written[key] === value) return;
    output.textContent = value;
    written[key] = value;
  }

  function flush() {
    timerId = null;
    if (!latest || disposed) return;
    const idle = now() - lastFrameTime > idleGap;
    write("tiles", String(latest.tiles));
    write("visibleTiles", String(latest.visibleTiles));
    write("gridLines", String(latest.gridLines));
    write("fps", idle || fps === null ? EMPTY_VALUE : String(fps));
    write("time", `${latest.renderMs.toFixed(2)} ms`);
    if (!idle) schedule();
  }

  function schedule() {
    if (timerId !== null || disposed) return;
    timerId = setTimer(flush, interval);
  }

  return {
    record({ tiles, visibleTiles, gridLines, renderMs }) {
      if (disposed) return;
      const time = now();
      if (lastFrameTime === null || time - lastFrameTime > idleGap) {
        windowStart = time;
        windowFrames = 0;
        fps = null;
      } else {
        windowFrames += 1;
        const elapsed = time - windowStart;
        if (elapsed >= interval) {
          fps = Math.round(windowFrames * 1000 / elapsed);
          windowStart = time;
          windowFrames = 0;
        }
      }
      lastFrameTime = time;
      latest = { tiles, visibleTiles, gridLines, renderMs };
      schedule();
    },
    dispose() {
      disposed = true;
      if (timerId !== null) clearTimer(timerId);
      timerId = null;
    },
  };
}
