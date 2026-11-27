import { gridToScreen, tileW, tileH } from "./isometric.js";

const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const gridSize = 4;

function preventBrowserZoom(event) {
  if (event.ctrlKey || event.metaKey) event.preventDefault();
}

window.addEventListener("wheel", (event) => {
  if (event.ctrlKey || event.metaKey) event.preventDefault();
}, { passive: false, capture: true });

window.addEventListener("keydown", (event) => {
  if (!(event.ctrlKey || event.metaKey)) return;
  if (["+", "=", "-", "_", "0"].includes(event.key)) preventBrowserZoom(event);
}, true);

for (const gesture of ["gesturestart", "gesturechange", "gestureend"]) {
  window.addEventListener(gesture, (event) => event.preventDefault(), { passive: false });
}

let width = 0;
let height = 0;
let previousTime = null;

function resize() {
  const pixelRatio = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  // Keep drawing coordinates in CSS/world units; DPR only scales the backing-store render.
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.clearRect(0, 0, width, height);
}

function drawGrid() {
  const originX = width / 2;
  const originY = height / 2;
  const gridCenter = (gridSize - 1) / 2;

  // Draw from the far edge toward the near edge to keep tile borders tidy.
  for (let diagonal = 0; diagonal <= (gridSize - 1) * 2; diagonal += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      const row = diagonal - col;
      if (row < 0 || row >= gridSize) continue;

      const position = gridToScreen(col - gridCenter, row - gridCenter);
      const tileX = originX + position.x;
      const tileY = originY + position.y;

      context.beginPath();
      context.moveTo(tileX, tileY - tileH / 2);
      context.lineTo(tileX + tileW / 2, tileY);
      context.lineTo(tileX, tileY + tileH / 2);
      context.lineTo(tileX - tileW / 2, tileY);
      context.closePath();
      context.fillStyle = "#383838";
      context.fill();
      context.strokeStyle = "#484848";
      context.lineWidth = 1;
      context.stroke();
    }
  }

  // World-space col and row axes project diagonally onto the screen.
  const axisExtent = gridSize / 2;
  const colAxisStart = gridToScreen(-axisExtent, 0);
  const colAxisEnd = gridToScreen(axisExtent, 0);
  const rowAxisStart = gridToScreen(0, -axisExtent);
  const rowAxisEnd = gridToScreen(0, axisExtent);

  context.beginPath();
  context.moveTo(originX + colAxisStart.x, originY + colAxisStart.y);
  context.lineTo(originX + colAxisEnd.x, originY + colAxisEnd.y);
  context.strokeStyle = "#3b82f6";
  context.lineWidth = 1;
  context.stroke();

  context.beginPath();
  context.moveTo(originX + rowAxisStart.x, originY + rowAxisStart.y);
  context.lineTo(originX + rowAxisEnd.x, originY + rowAxisEnd.y);
  context.strokeStyle = "#ef4444";
  context.lineWidth = 1;
  context.stroke();

  const yAxisTipX = originX;
  const yAxisTipY = originY - 40;
  const arrowSize = 4;
  context.beginPath();
  context.moveTo(originX, originY);
  context.lineTo(yAxisTipX, yAxisTipY);
  context.strokeStyle = "#22c55e";
  context.lineWidth = 1;
  context.stroke();

  context.beginPath();
  context.moveTo(yAxisTipX, yAxisTipY);
  context.lineTo(yAxisTipX - arrowSize / 2, yAxisTipY + arrowSize);
  context.moveTo(yAxisTipX, yAxisTipY);
  context.lineTo(yAxisTipX + arrowSize / 2, yAxisTipY + arrowSize);
  context.strokeStyle = "#22c55e";
  context.lineWidth = 1;
  context.stroke();
}

function frame(time) {
  const dt = previousTime === null ? 0 : (time - previousTime) / 1000;
  previousTime = time;

  context.clearRect(0, 0, width, height);
  drawGrid(dt);
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(frame);
