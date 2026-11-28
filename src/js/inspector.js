export function createInspector(sizeInput, sizeValue, axesInput, gridInput, multiSelectInput) {
  let gridSize = Number(sizeInput.value);
  let showAxes = axesInput ? axesInput.checked : true;
  let showGrid = gridInput ? gridInput.checked : true;

  function updateGridSize() {
    gridSize = Number(sizeInput.value);
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
