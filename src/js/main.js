import { createCanvas } from "./canvas.js";
import { startRenderLoop } from "./animation.js";
import { preventBrowserZoom } from "./browser-controls.js";
import { drawGrid } from "./renderer.js";
import { createInspector } from "./inspector.js";

const canvas = document.getElementById("canvas");
const { context, getSize, resize } = createCanvas(canvas);
const sizeInput = document.getElementById("grid-size");
const sizeValue = document.getElementById("grid-size-value");
const inspector = createInspector(sizeInput, sizeValue);

preventBrowserZoom();
window.addEventListener("resize", resize);
resize();

startRenderLoop(() => {
  const { width, height } = getSize();
  context.clearRect(0, 0, width, height);
  drawGrid(context, width, height, inspector.getGridSize());
});
