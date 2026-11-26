import { ELEVATION_STEP_PX, PLANE } from "./config.js";
import { getTileElevation } from "./elevation.js";
import { isTileInRange, tileCenter } from "./geometry.js";

function safeTile(tile, plane = PLANE) {
  return tile && isTileInRange(tile.row, tile.column, plane) ? tile : null;
}

export function formatTile(tile, plane = PLANE) {
  const validTile = safeTile(tile, plane);
  if (!validTile) return "—";
  return `Kolom ${validTile.column + 1}, Baris ${validTile.row + 1} · [${validTile.column}, ${validTile.row}]`;
}

export function formatTileCenter(tile, elevationLevel = 0, plane = PLANE) {
  const validTile = safeTile(tile, plane);
  if (!validTile) return "—";
  const center = tileCenter(validTile.row, validTile.column, plane);
  const level = Number.isFinite(elevationLevel) ? Math.max(0, Math.floor(elevationLevel)) : 0;
  return `${center.x}, ${center.y - level * ELEVATION_STEP_PX} px`;
}

export function formatZoom(zoom) {
  const value = Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  return `${Math.round(value * 100)}%`;
}

export function formatPan(pan) {
  const x = Number.isFinite(pan?.x) ? Math.round(pan.x) : 0;
  const y = Number.isFinite(pan?.y) ? Math.round(pan.y) : 0;
  return `${x >= 0 ? "+" : ""}${x}, ${y >= 0 ? "+" : ""}${y} px`;
}

function inputValue(event, element) {
  const value = event?.target?.value ?? event?.value ?? element?.value;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

/** Bind the workspace shell and inspector controls to the live plane state. */
export function initializeInspector(
  documentRef,
  {
    plane = PLANE,
    onResetCamera = () => {},
    onElevationChange = () => {},
    onGridSizeChange = () => {},
    onVisibilityChange = () => {},
    onZoomChange = () => {},
  } = {},
) {
  const select = (selector) => documentRef?.querySelector?.(selector) ?? null;
  const elements = {
    panel: select("#inspector-panel"),
    toggle: select("#inspector-toggle"),
    reset: select("#reset-camera"),
    planeLabel: select("#plane-label"),
    planeSize: select("#plane-size"),
    planeDimensions: select("#plane-dimensions"),
    tileSize: select("#tile-size"),
    gridSizeSlider: select("#grid-size-slider"),
    gridSizeValue: select("#grid-size-value"),
    axisToggle: select("#axis-toggle"),
    gridToggle: select("#grid-toggle"),
    coordToggle: select("#coord-toggle"),
    zoomSlider: select("#zoom-slider"),
    hover: select("#hover-value"),
    selected: select("#selected-value"),
    summary: select("#selection-summary"),
    selectedIndex: select("#selected-index"),
    selectedDetailCoord: select("#selected-detail-coord"),
    selectedCenter: select("#selected-center"),
    selectionHint: select("#selection-hint"),
    selectedElevation: select("#selected-elevation"),
    selectedRise: select("#selected-rise"),
    elevationDecrease: select("#elevation-decrease"),
    elevationIncrease: select("#elevation-increase"),
    zoom: select("#camera-zoom"),
    pan: select("#camera-pan"),
    cameraMode: select("#camera-mode"),
    footerSelection: select("#footer-selection"),
    footerZoom: select("#footer-zoom"),
    objectsPanel: select("#objects-panel"),
    objectsExpand: select("#objects-expand"),
    selectionPanel: select("#selection-panel"),
    selectionExpand: select("#selection-expand"),
    objectCount: select("#object-count"),
  };

  if (elements.toggle?.addEventListener && elements.panel?.classList?.toggle) {
    elements.toggle.addEventListener("click", () => {
      const hidden = elements.panel.classList.toggle("is-hidden");
      elements.toggle.setAttribute("aria-expanded", String(!hidden));
      elements.toggle.setAttribute("aria-label", hidden ? "Tampilkan inspector" : "Sembunyikan inspector");
    });
  }

  elements.reset?.addEventListener?.("click", onResetCamera);
  elements.elevationDecrease?.addEventListener?.("click", () => onElevationChange(-1));
  elements.elevationIncrease?.addEventListener?.("click", () => onElevationChange(1));
  elements.gridSizeSlider?.addEventListener?.("input", (event) => {
    const value = inputValue(event, elements.gridSizeSlider);
    if (value !== null) onGridSizeChange(value);
  });
  elements.zoomSlider?.addEventListener?.("input", (event) => {
    const value = inputValue(event, elements.zoomSlider);
    if (value !== null) onZoomChange(value / 100);
  });
  for (const [element, key] of [
    [elements.axisToggle, "showAxes"],
    [elements.gridToggle, "showGrid"],
    [elements.coordToggle, "showCoordinates"],
  ]) {
    element?.addEventListener?.("change", (event) => {
      const checked = Boolean(event?.target?.checked ?? element.checked);
      onVisibilityChange(key, checked);
    });
  }

  const rightPanels = [
    { panel: elements.objectsPanel, toggle: elements.objectsExpand, label: "daftar objek" },
    { panel: elements.selectionPanel, toggle: elements.selectionExpand, label: "tile selection" },
  ];
  const updateRightPanelLayout = () => {
    const upperExpanded = elements.objectsPanel?.classList?.contains("is-expanded") ?? false;
    documentRef?.body?.classList?.toggle("right-wide", upperExpanded);
  };
  rightPanels.forEach(({ panel, toggle, label }) => {
    if (!panel?.classList?.toggle || !toggle?.addEventListener) return;
    const initiallyExpanded = panel.classList.contains("is-expanded");
    toggle.classList?.toggle?.("is-expanded", initiallyExpanded);
    toggle.setAttribute("aria-expanded", String(initiallyExpanded));
    toggle.setAttribute("aria-label", `${initiallyExpanded ? "Perkecil" : "Perluas"} panel ${label}`);
    toggle.title = initiallyExpanded ? `Perkecil panel ${label}` : "Perluas panel ke kiri";
    toggle.addEventListener("click", () => {
      const expanded = panel.classList.toggle("is-expanded");
      toggle.classList?.toggle?.("is-expanded", expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      const action = expanded ? "Perkecil" : "Perluas";
      toggle.setAttribute("aria-label", `${action} panel ${label}`);
      toggle.title = expanded ? `Perkecil panel ${label}` : "Perluas panel ke kiri";
      updateRightPanelLayout();
    });
  });
  updateRightPanelLayout();

  return {
    render(state = {}) {
      const currentPlane = state.plane ?? plane;
      const visual = state.visual ?? {};
      const hovered = safeTile(state.hoveredTile, currentPlane);
      const selected = safeTile(state.activeTile, currentPlane);
      const elevation = selected ? getTileElevation(state.elevations, selected, currentPlane) : 0;
      const zoom = Number.isFinite(state.zoom) ? state.zoom : 1;
      const zoomText = formatZoom(zoom);
      const gridText = `${currentPlane.columns} × ${currentPlane.rows}`;

      if (elements.planeSize) elements.planeSize.textContent = `${gridText} tile`;
      if (elements.planeDimensions) elements.planeDimensions.textContent = `${currentPlane.width} × ${currentPlane.height} px`;
      if (elements.tileSize) elements.tileSize.textContent = `${currentPlane.tileWidth} × ${currentPlane.tileHeight} px`;
      if (elements.planeLabel) elements.planeLabel.textContent = `Plane · ${gridText} tile`;
      if (elements.gridSizeSlider) elements.gridSizeSlider.value = String(currentPlane.columns);
      if (elements.gridSizeValue) elements.gridSizeValue.textContent = gridText;
      if (elements.axisToggle) elements.axisToggle.checked = visual.showAxes ?? false;
      if (elements.gridToggle) elements.gridToggle.checked = visual.showGrid ?? true;
      if (elements.coordToggle) elements.coordToggle.checked = visual.showCoordinates ?? false;
      if (elements.zoomSlider) elements.zoomSlider.value = String(Math.round(zoom * 100));
      if (elements.hover) elements.hover.textContent = formatTile(hovered, currentPlane);
      if (elements.selected) elements.selected.textContent = formatTile(selected, currentPlane);
      if (elements.summary) elements.summary.textContent = selected ? "Tile sedang dipilih" : "Belum ada tile dipilih";
      if (elements.selectionHint) {
        elements.selectionHint.textContent = selected
          ? "Gunakan + atau − untuk mengubah elevasi tile ini"
          : "Klik tile pada canvas untuk mengaktifkan kontrol elevasi";
      }
      if (elements.objectCount) elements.objectCount.textContent = "0";
      if (elements.selectedIndex) elements.selectedIndex.textContent = selected ? `[${selected.column}, ${selected.row}]` : "—";
      if (elements.selectedDetailCoord) elements.selectedDetailCoord.textContent = selected
        ? `[${selected.column}, ${selected.row}]` : "—";
      if (elements.selectedCenter) elements.selectedCenter.textContent = formatTileCenter(selected, elevation, currentPlane);
      if (elements.selectedElevation) elements.selectedElevation.textContent = String(elevation);
      if (elements.selectedRise) elements.selectedRise.textContent = `${elevation * ELEVATION_STEP_PX} px`;
      if (elements.elevationDecrease) {
        elements.elevationDecrease.disabled = !selected || elevation === 0;
        elements.elevationDecrease.title = !selected
          ? "Pilih tile terlebih dahulu"
          : elevation === 0 ? "Level minimum adalah 0" : "Turunkan satu level (−8 px)";
        elements.elevationDecrease.setAttribute?.("aria-disabled", String(elements.elevationDecrease.disabled));
      }
      if (elements.elevationIncrease) {
        elements.elevationIncrease.disabled = !selected;
        elements.elevationIncrease.title = selected ? "Naikkan satu level (+8 px)" : "Pilih tile terlebih dahulu";
        elements.elevationIncrease.setAttribute?.("aria-disabled", String(elements.elevationIncrease.disabled));
      }
      if (elements.zoom) elements.zoom.textContent = zoomText;
      if (elements.pan) elements.pan.textContent = formatPan(state.pan);
      if (elements.cameraMode) elements.cameraMode.textContent = state.dragging ? "Menggeser" : "Siap";
      if (elements.footerSelection) {
        elements.footerSelection.textContent = selected
          ? `Tile: ${selected.column}, ${selected.row}`
          : hovered ? `Hover: ${hovered.column}, ${hovered.row}` : "Tidak ada tile aktif";
      }
      if (elements.footerZoom) elements.footerZoom.textContent = `Zoom: ${zoomText}`;
    },
  };
}
