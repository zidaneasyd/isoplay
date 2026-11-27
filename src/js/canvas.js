export function createCanvas(canvas) {
  const context = canvas.getContext("2d");
  let width = 0;
  let height = 0;

  function resize() {
    const pixelRatio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    // Keep drawing coordinates in CSS pixels; DPR scales the backing store.
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  return { context, resize, getSize: () => ({ width, height }) };
}
