import test from "node:test";
import assert from "node:assert/strict";
import {
  ELEVATION_STEP_PX,
  PLANE,
  drawPlane,
  getMaximumElevationLevel,
  getMaximumElevationPixels,
  getTileElevation,
  getTileElevationPixels,
  hitTestTileAtElevations,
  normalizeElevationLevel,
  setTileElevation,
  tileCenter,
} from "../plane.js";

function createContext() {
  const calls = { fills: [], fillPaths: [], strokes: [], clears: [], translations: [], path: [] };
  return {
    calls,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    setTransform() {},
    clearRect(...args) { calls.clears.push(args); },
    save() {}, restore() {}, translate(...args) { calls.translations.push(args); },
    beginPath() { calls.path = []; },
    moveTo(x, y) { calls.path.push({ x, y }); }, lineTo(x, y) { calls.path.push({ x, y }); }, closePath() {},
    fill() { calls.fills.push(this.fillStyle); calls.fillPaths.push({ color: this.fillStyle, points: calls.path.map(point => ({ ...point })) }); },
    stroke() { calls.strokes.push({ color: this.strokeStyle, width: this.lineWidth }); },
  };
}

const validTiles = [
  { row: 0, column: 0 }, { row: 0, column: 11 }, { row: 5, column: 5 },
  { row: 11, column: 0 }, { row: 11, column: 11 },
];

test("elevation levels are normalized to finite non-negative whole levels", () => {
  const cases = [
    [-100, 0], [-1, 0], [-0.1, 0], [-0, 0], [0, 0], [0.9, 0], [1, 1],
    [1.9, 1], [2.1, 2], [7.99, 7], [16, 16], [128, 128], [1024, 1024],
    [NaN, 0], [Infinity, 0], [-Infinity, 0], [null, 0], ["5", 0],
  ];
  for (const [input, expected] of cases) {
    assert.equal(normalizeElevationLevel(input), expected, `normalize ${String(input)}`);
  }
});

test("one elevation level always equals exactly eight CSS pixels", () => {
  assert.equal(ELEVATION_STEP_PX, 8);
  for (const level of [0, 1, 2, 3, 4, 5, 8, 16, 32, 64, 128, 256, 1024]) {
    assert.equal(getTileElevationPixels(level), level * 8);
  }
});

test("tile elevations are independent across every tested corner and interior tile", () => {
  const elevations = new Map();
  for (let index = 0; index < validTiles.length; index++) {
    const tile = validTiles[index];
    setTileElevation(elevations, tile, index + 1);
  }
  validTiles.forEach((tile, index) => {
    assert.equal(getTileElevation(elevations, tile), index + 1);
  });
  assert.equal(getTileElevation(elevations, { row: 4, column: 4 }), 0);
  setTileElevation(elevations, validTiles[2], 0);
  assert.equal(getTileElevation(elevations, validTiles[2]), 0);
  assert.equal(elevations.has("5,5"), false, "level zero is represented by absence from the sparse map");
});

test("invalid tile coordinates cannot write into the elevation map", () => {
  const elevations = new Map();
  const invalidTiles = [null, undefined, {}, { row: -1, column: 0 }, { row: 0, column: -1 },
    { row: 12, column: 0 }, { row: 0, column: 12 }, { row: 1.5, column: 2 },
    { row: "2", column: 3 }, { row: NaN, column: 1 }, { row: 1, column: Infinity }];
  for (const tile of invalidTiles) assert.equal(setTileElevation(elevations, tile, 9), 0);
  assert.equal(elevations.size, 0);
});

test("maximum level and required vertical padding track the tallest remaining tile", () => {
  const elevations = new Map();
  assert.equal(getMaximumElevationLevel(elevations), 0);
  assert.equal(getMaximumElevationPixels(elevations), 0);
  setTileElevation(elevations, { row: 0, column: 0 }, 2);
  setTileElevation(elevations, { row: 6, column: 8 }, 9);
  setTileElevation(elevations, { row: 11, column: 11 }, 4);
  assert.equal(getMaximumElevationLevel(elevations), 9);
  assert.equal(getMaximumElevationPixels(elevations), 72);
  setTileElevation(elevations, { row: 6, column: 8 }, 3);
  assert.equal(getMaximumElevationLevel(elevations), 4);
  assert.equal(getMaximumElevationPixels(elevations), 32);
  setTileElevation(elevations, { row: 11, column: 11 }, 0);
  assert.equal(getMaximumElevationLevel(elevations), 3);
  assert.equal(getMaximumElevationPixels(elevations), 24);
});

test("all 144 tile top faces remain hittable at multiple elevation levels when visible", () => {
  for (const level of [1, 2, 3, 4, 8, 16, 32]) {
    for (let row = 0; row < PLANE.rows; row++) {
      for (let column = 0; column < PLANE.columns; column++) {
        const tile = { row, column };
        const elevations = new Map();
        setTileElevation(elevations, tile, level);
        const center = tileCenter(row, column);
        const raisedCenterY = center.y - getTileElevationPixels(level);
        const actual = hitTestTileAtElevations(center.x, raisedCenterY, elevations);
        assert.deepEqual(actual, tile, `top hit at level ${level}, tile ${row},${column}`);
      }
    }
  }
});

test("both exposed side faces of a raised tile can be selected", () => {
  const tile = { row: 4, column: 5 };
  const elevations = new Map();
  setTileElevation(elevations, tile, 3);
  const x = (tile.column - tile.row) * (PLANE.tileWidth / 2);
  const y = (tile.column + tile.row) * (PLANE.tileHeight / 2);
  const height = 3 * ELEVATION_STEP_PX;
  const westSidePoint = { x: x - 8, y: y + PLANE.tileHeight - height / 2 };
  const eastSidePoint = { x: x + 8, y: y + PLANE.tileHeight - height / 2 };
  assert.deepEqual(hitTestTileAtElevations(westSidePoint.x, westSidePoint.y, elevations), tile);
  assert.deepEqual(hitTestTileAtElevations(eastSidePoint.x, eastSidePoint.y, elevations), tile);
});

test("side-face hit regions shorten to the height difference from elevated neighbors", () => {
  const tile = { row: 4, column: 5 };
  const elevations = new Map();
  setTileElevation(elevations, tile, 5);
  setTileElevation(elevations, { row: 5, column: 5 }, 2);
  setTileElevation(elevations, { row: 4, column: 6 }, 3);
  const x = (tile.column - tile.row) * (PLANE.tileWidth / 2);
  const y = (tile.column + tile.row) * (PLANE.tileHeight / 2);
  const currentHeight = 5 * ELEVATION_STEP_PX;
  const leftNeighborHeight = 2 * ELEVATION_STEP_PX;
  const rightNeighborHeight = 3 * ELEVATION_STEP_PX;
  const leftPoint = {
    x: x - 8,
    y: y + PLANE.tileHeight * 0.75 - (currentHeight + leftNeighborHeight) / 2,
  };
  const rightPoint = {
    x: x + 8,
    y: y + PLANE.tileHeight * 0.75 - (currentHeight + rightNeighborHeight) / 2,
  };
  assert.deepEqual(hitTestTileAtElevations(leftPoint.x, leftPoint.y, elevations), tile);
  assert.deepEqual(hitTestTileAtElevations(rightPoint.x, rightPoint.y, elevations), tile);
});

test("raised tile renderer paints a top face and two visible side faces", () => {
  const context = createContext();
  const elevations = new Map([["4,5", 3]]);
  drawPlane(context, { elevations, topPadding: 24 });
  assert.equal(context.calls.clears.length, 1);
  assert.deepEqual(context.calls.clears[0], [0, 0, PLANE.width, PLANE.height + 24]);
  assert.equal(context.calls.fills.length, 4, "ground + two side faces + top face");
});

test("rendered top faces rise by exactly eight CSS pixels per level", () => {
  const tile = { row: 4, column: 5 };
  const x = (tile.column - tile.row) * PLANE.tileWidth / 2;
  const y = (tile.column + tile.row) * PLANE.tileHeight / 2;
  for (const level of [0, 1, 2, 3, 5, 10]) {
    const context = createContext();
    const elevations = new Map();
    setTileElevation(elevations, tile, level);
    const padding = level * ELEVATION_STEP_PX;
    drawPlane(context, { elevations, topPadding: padding });
    assert.deepEqual(context.calls.translations.at(-1), [PLANE.width / 2, padding]);
    if (level === 0) continue;
    const expected = [
      { x, y: y - level * ELEVATION_STEP_PX },
      { x: x + PLANE.tileWidth / 2, y: y + PLANE.tileHeight / 2 - level * ELEVATION_STEP_PX },
      { x, y: y + PLANE.tileHeight - level * ELEVATION_STEP_PX },
      { x: x - PLANE.tileWidth / 2, y: y + PLANE.tileHeight / 2 - level * ELEVATION_STEP_PX },
    ];
    const face = context.calls.fillPaths.find(({ color, points }) => color === PLANE.colors.tile &&
      points.length === 4 && points.every((point, index) => point.x === expected[index].x && point.y === expected[index].y));
    assert.ok(face, `top face matches exact level-${level} geometry`);
    assert.equal(padding + face.points[0].y, y,
      "maximum-height top face begins at the top of its padded canvas region");
  }
});

test("neighbor elevation differences render only the exposed side height", () => {
  const tile = { row: 4, column: 5 };
  const x = (tile.column - tile.row) * PLANE.tileWidth / 2;
  const y = (tile.column + tile.row) * PLANE.tileHeight / 2;
  const elevations = new Map();
  setTileElevation(elevations, tile, 5);
  setTileElevation(elevations, { row: 5, column: 5 }, 2);
  setTileElevation(elevations, { row: 4, column: 6 }, 3);
  const context = createContext();
  drawPlane(context, { elevations, topPadding: 5 * ELEVATION_STEP_PX });
  const left = [
    { x: x - 32, y: y + 16 - 40 }, { x, y: y + 32 - 40 },
    { x, y: y + 32 - 16 }, { x: x - 32, y: y + 16 - 16 },
  ];
  const right = [
    { x, y: y + 32 - 40 }, { x: x + 32, y: y + 16 - 40 },
    { x: x + 32, y: y + 16 - 24 }, { x, y: y + 32 - 24 },
  ];
  const matches = expected => context.calls.fillPaths.filter(({ points }) => points.length === expected.length &&
    points.every((point, index) => point.x === expected[index].x && point.y === expected[index].y));
  assert.equal(matches(left).length, 1, "left face spans the 5-to-2 level difference once");
  assert.equal(matches(right).length, 1, "right face spans the 5-to-3 level difference once");

  setTileElevation(elevations, { row: 5, column: 5 }, 5);
  setTileElevation(elevations, { row: 4, column: 6 }, 5);
  const equalContext = createContext();
  drawPlane(equalContext, { elevations, topPadding: 5 * ELEVATION_STEP_PX });
  assert.equal(equalContext.calls.fillPaths.some(({ points }) =>
    points.length === 4 && (matches(left).some(face => JSON.stringify(face.points) === JSON.stringify(points)) ||
      matches(right).some(face => JSON.stringify(face.points) === JSON.stringify(points)))), false,
  "equal-height shared edges do not create internal walls");
});

test("multi-tile elevation patterns render independent side heights without losing the ground grid", () => {
  const context = createContext();
  const elevations = new Map([
    ["5,5", 5], ["6,5", 2], ["5,6", 3], ["0,0", 1], ["11,11", 8],
  ]);
  drawPlane(context, { elevations, topPadding: getMaximumElevationPixels(elevations) });
  assert.equal(context.calls.clears[0][3], PLANE.height + 64);
  assert.ok(context.calls.fills.length > 1 + elevations.size * 2,
    "faces should be added for elevated tiles while preserving the ground fill");
  assert.ok(context.calls.strokes.length >= 2, "base grid and perimeter remain visible");
});

test("zero-elevation and empty maps retain the original flat plane rendering", () => {
  for (const elevations of [new Map(), new Map([["4,5", 0], ["0,0", -8]])]) {
    const context = createContext();
    drawPlane(context, { elevations });
    assert.equal(context.calls.fills.length, 1);
    assert.equal(context.calls.strokes.length, 2);
    assert.deepEqual(context.calls.clears[0], [0, 0, PLANE.width, PLANE.height]);
  }
});
