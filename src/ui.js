import { PLANE } from "./config.js";
import { isTileInRange, tileCenter } from "./geometry.js";

function safeTile(tile) {
  return tile && isTileInRange(tile.row, tile.column) ? tile : null;
}

export function formatTile(tile) {
  const validTile = safeTile(tile);
  if (!validTile) return "—";
  return `Kolom ${validTile.column + 1}, Baris ${validTile.row + 1} · [${validTile.column}, ${validTile.row}]`;
}

export function formatTileCenter(tile) {
  const validTile = safeTile(tile);
  if (!validTile) return "—";
  const center = tileCenter(validTile.row, validTile.column);
  return `${center.x}, ${center.y} px`;
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

/** Bind the workspace chrome to the real plane interaction state. */
export function initializeInspector(documentRef, { onResetCamera = () => {} } = {}) {
  const select = (selector) => documentRef?.querySelector?.(selector) ?? null;
  const elements = {
    panel: select("#inspector-panel"),
    toggle: select("#inspector-toggle"),
    reset: select("#reset-camera"),
    planeSize: select("#plane-size"),
    tileSize: select("#tile-size"),
    hover: select("#hover-value"),
    selected: select("#selected-value"),
    summary: select("#selection-summary"),
    selectedIndex: select("#selected-index"),
    selectedDetailCoord: select("#selected-detail-coord"),
    selectedCenter: select("#selected-center"),
    zoom: select("#camera-zoom"),
    pan: select("#camera-pan"),
    cameraMode: select("#camera-mode"),
    footerSelection: select("#footer-selection"),
    footerZoom: select("#footer-zoom"),
  };

  if (elements.toggle?.addEventListener && elements.panel?.classList?.toggle) {
    elements.toggle.addEventListener("click", () => {
      const hidden = elements.panel.classList.toggle("is-hidden");
      elements.toggle.setAttribute("aria-expanded", String(!hidden));
      elements.toggle.setAttribute("aria-label", hidden ? "Tampilkan inspector" : "Sembunyikan inspector");
    });
  }

  elements.reset?.addEventListener?.("click", onResetCamera);

  return {
    render(state = {}) {
      const hovered = safeTile(state.hoveredTile);
      const selected = safeTile(state.activeTile);
      const zoomText = formatZoom(state.zoom);

      if (elements.planeSize) elements.planeSize.textContent = `${PLANE.columns} × ${PLANE.rows} tile`;
      if (elements.tileSize) elements.tileSize.textContent = `${PLANE.tileWidth} × ${PLANE.tileHeight} px`;
      if (elements.hover) elements.hover.textContent = formatTile(hovered);
      if (elements.selected) elements.selected.textContent = formatTile(selected);
      if (elements.summary) {
        elements.summary.textContent = selected ? "Tile sedang dipilih" : "Belum ada tile dipilih";
      }
      if (elements.selectedIndex) {
        elements.selectedIndex.textContent = selected ? `[${selected.column}, ${selected.row}]` : "—";
      }
      if (elements.selectedDetailCoord) elements.selectedDetailCoord.textContent = selected
        ? `[${selected.column}, ${selected.row}]` : "—";
      if (elements.selectedCenter) elements.selectedCenter.textContent = formatTileCenter(selected);
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
