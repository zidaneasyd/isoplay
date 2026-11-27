export function createInspector(sizeInput, sizeValue) {
  let gridSize = Number(sizeInput.value);

  function updateGridSize() {
    gridSize = Number(sizeInput.value);
    sizeValue.value = `${gridSize} × ${gridSize}`;
    sizeValue.textContent = sizeValue.value;
  }

  sizeInput.addEventListener("input", updateGridSize);
  updateGridSize();

  return { getGridSize: () => gridSize };
}
