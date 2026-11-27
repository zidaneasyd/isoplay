import { createCanvas } from "./canvas.js";
import { startRenderLoop } from "./animation.js";
import { preventBrowserZoom } from "./browser-controls.js";
import { drawGrid } from "./renderer.js";

const canvas = document.getElementById("canvas");
const gridSize = 4;
const { context, getSize, resize } = createCanvas(canvas);

preventBrowserZoom();
window.addEventListener("resize", resize);
resize();

startRenderLoop((dt) => {
  const { width, height } = getSize();
  context.clearRect(0, 0, width, height);
  drawGrid(context, width, height, gridSize, dt);
});
