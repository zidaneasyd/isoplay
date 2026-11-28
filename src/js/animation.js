export function startRenderLoop(render) {
  let previousTime = null;

  function frame(time) {
    const dt = previousTime === null ? 0 : (time - previousTime) / 1000;
    previousTime = time;
    render(dt);
    requestAnimationFrame(frame);
  }

  return requestAnimationFrame(frame);
}
