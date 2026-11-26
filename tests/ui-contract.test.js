import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

function getElement(id) {
  const match = html.match(new RegExp(`<[^>]+\\bid=["']${id}["'][^>]*>`));
  assert.ok(match, `missing #${id}`);
  return match[0];
}

test("both right-side expand controls point to their corresponding panels", () => {
  const objectsExpand = getElement("objects-expand");
  const selectionExpand = getElement("selection-expand");
  assert.match(objectsExpand, /aria-controls="objects-panel"/);
  assert.match(selectionExpand, /aria-controls="selection-panel"/);
  assert.match(getElement("objects-panel"), /class="right-panel upper"/);
  assert.match(getElement("selection-panel"), /class="right-panel lower"/);
});

test("expanded right panels and action rail have explicit desktop and mobile layout rules", () => {
  assert.match(html, /\.right-panel\.is-expanded\s*\{\s*width:\s*var\(--right-panel-expanded-width\)/);
  assert.match(html, /\.right-expand\.is-expanded\s*\{/);
  assert.match(html, /body\.right-wide \.quick-actions/);
  assert.match(html, /@media\s*\(max-width:\s*760px\)/);
  assert.match(html, /@media\s*\(min-width:\s*761px\) and \(max-width:\s*840px\)/);
});

test("tile-selection elevation controls start disabled and explain the selection requirement", () => {
  assert.match(getElement("elevation-decrease"), /disabled/);
  assert.match(getElement("elevation-increase"), /disabled/);
  assert.match(getElement("selection-hint"), /id="selection-hint"/);
  assert.match(html, /Klik tile pada canvas untuk mengaktifkan kontrol elevasi/);
  assert.match(html, /1 level = 8 px/);
  assert.match(html, /level minimum 0/);
});

test("file protocol displays instructions to start the supported local HTTP server", () => {
  assert.match(html, /location\.protocol\s*===\s*["']file:["']/);
  assert.match(html, /npm run dev/);
  assert.match(html, /http:\/\/127\.0\.0\.1:4173/);
});


test("workspace Inspector exposes functional grid, axis, coordinate and zoom controls", () => {
  assert.match(getElement("grid-size-slider"), /type="range"/);
  assert.match(getElement("grid-size-slider"), /min="12".*max="64".*step="2"/);
  assert.match(getElement("axis-toggle"), /type="checkbox"/);
  assert.match(getElement("grid-toggle"), /type="checkbox"/);
  assert.match(getElement("coord-toggle"), /type="checkbox"/);
  assert.match(getElement("zoom-slider"), /min="25".*max="400"/);
  assert.match(html, /id="plane-dimensions"/);
});
