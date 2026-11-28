export function createInspector(sizeInput, sizeValue, axesInput, gridInput, multiSelectInput) {
  let gridSize = 9;
  let showAxes = axesInput ? axesInput.checked : true;
  let showGrid = gridInput ? gridInput.checked : true;

  function updateGridSize() {
    const requestedSize = Number(sizeInput.value);
    gridSize = Number.isFinite(requestedSize) ? Math.round(Math.min(99, Math.max(9, requestedSize))) : 9;
    sizeInput.value = String(gridSize);
    sizeValue.value = `${gridSize} × ${gridSize}`;
    sizeValue.textContent = sizeValue.value;
  }

  sizeInput.addEventListener("input", updateGridSize);
  axesInput?.addEventListener("change", () => {
    showAxes = axesInput.checked;
  });
  gridInput?.addEventListener("change", () => {
    showGrid = gridInput.checked;
  });
  updateGridSize();

  return {
    getGridSize: () => gridSize,
    getShowAxes: () => axesInput ? axesInput.checked : showAxes,
    getShowGrid: () => gridInput ? gridInput.checked : showGrid,
    getMultiSelect: () => multiSelectInput ? multiSelectInput.checked : false,
  };
}
