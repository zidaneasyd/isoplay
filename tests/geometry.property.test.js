import test from "node:test";
import assert from "node:assert/strict";
import { PLANE } from "../src/config.js";
import { hitTestTile, isTileInRange, tileCenter, toggleActiveTile } from "../src/geometry.js";

const HALF_W = PLANE.tileWidth / 2;
const HALF_H = PLANE.tileHeight / 2;
const EPSILON = 1 / HALF_W;

// Independent coordinate-space oracle. In the isometric basis, the diamond
// distance is twice the Chebyshev distance in (column,row) coordinates.
function referenceHitTest(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  const columnCoordinate = (x / HALF_W + (y - HALF_H) / HALF_H) / 2;
  const rowCoordinate = ((y - HALF_H) / HALF_H - x / HALF_W) / 2;
  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      const distance = 2 * Math.max(
        Math.abs(columnCoordinate - column),
        Math.abs(rowCoordinate - row),
      );
      if (distance <= 1 + EPSILON) return { row, column };
    }
  }
  return null;
}


function legacyScanHitTest(x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      const center = tileCenter(row, column);
      const distance = Math.abs(x - center.x) / HALF_W + Math.abs(y - center.y) / HALF_H;
      if (distance <= 1 + 1 / HALF_W) return { row, column };
    }
  }
  return null;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

test("all 144 tile centers are unique and resolve to their own tile", () => {
  const seen = new Set();
  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      assert.equal(isTileInRange(row, column), true);
      const center = tileCenter(row, column);
      const key = `${center.x},${center.y}`;
      assert.equal(seen.has(key), false, `duplicate center at ${row},${column}`);
      seen.add(key);
      assert.deepEqual(hitTestTile(center.x, center.y), { row, column });
    }
  }
  assert.equal(seen.size, PLANE.rows * PLANE.columns);
});

test("every tile remains hittable for a grid of points safely inside its diamond", () => {
  const offsets = [-10, 0, 10].flatMap((dx) => [-5, 0, 5].map((dy) => [dx, dy]));
  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      const center = tileCenter(row, column);
      for (const [dx, dy] of offsets) {
        assert.deepEqual(
          hitTestTile(center.x + dx, center.y + dy),
          { row, column },
          `tile ${row},${column} at offset ${dx},${dy}`,
        );
      }
    }
  }
});

test("hit testing matches an independent isometric-coordinate oracle for 40,000 seeded points", () => {
  const random = seededRandom(0x51_50_1A);
  for (let index = 0; index < 40_000; index++) {
    const x = (random() * 2 - 1) * (PLANE.width * 0.9);
    const y = (random() * 2 - 1) * (PLANE.height * 1.2);
    assert.deepEqual(hitTestTile(x, y), referenceHitTest(x, y), `random sample ${index}: ${x},${y}`);
  }
});

test("optimized hit testing stays identical to the previous exhaustive scan for 40,000 points", () => {
  const random = seededRandom(0xBADC0DE);
  for (let index = 0; index < 40_000; index++) {
    const rowCoordinate = random() * (PLANE.rows + 1) - 0.5;
    const columnCoordinate = random() * (PLANE.columns + 1) - 0.5;
    const x = (columnCoordinate - rowCoordinate) * HALF_W;
    const y = (columnCoordinate + rowCoordinate) * HALF_H + HALF_H;
    assert.deepEqual(hitTestTile(x, y), legacyScanHitTest(x, y), `legacy sample ${index}`);
  }
});

test("shared edges, corners and tolerance boundary use deterministic tie-breaking", () => {
  const probes = [];
  for (let row = 0; row < PLANE.rows; row++) {
    for (let column = 0; column < PLANE.columns; column++) {
      const center = tileCenter(row, column);
      for (const [dx, dy] of [
        [0, -HALF_H], [HALF_W, -HALF_H / 2], [HALF_W, HALF_H / 2],
        [0, HALF_H], [-HALF_W, HALF_H / 2], [-HALF_W, -HALF_H / 2],
      ]) {
        probes.push([center.x + dx, center.y + dy]);
      }
    }
  }

  for (const [x, y] of probes) {
    const expected = referenceHitTest(x, y);
    assert.deepEqual(hitTestTile(x, y), expected);
    assert.deepEqual(hitTestTile(x, y), expected, "same shared edge must resolve the same way every time");
  }
});

test("candidate interval endpoints remain exact at the tolerance boundary", () => {
  const offsets = [-0.515625 - 1e-8, -0.515625, -0.515625 + 1e-8,
    0, 0.515625 - 1e-8, 0.515625, 0.515625 + 1e-8];
  for (let row = -1; row <= PLANE.rows; row++) {
    for (let column = -1; column <= PLANE.columns; column++) {
      for (const rowOffset of offsets) {
        for (const columnOffset of offsets) {
          const r = row + rowOffset;
          const c = column + columnOffset;
          const x = (c - r) * HALF_W;
          const y = (c + r) * HALF_H + HALF_H;
          assert.deepEqual(hitTestTile(x, y), legacyScanHitTest(x, y),
            `row=${row}, col=${column}, offsets=${rowOffset},${columnOffset}`);
        }
      }
    }
  }
});

test("hit testing rejects non-finite points and tile range checks reject malformed indices", () => {
  for (const [x, y] of [
    [NaN, 0], [0, NaN], [Infinity, 0], [0, -Infinity],
    [Number.MAX_VALUE, Number.MAX_VALUE], [-Number.MAX_VALUE, Number.MAX_VALUE],
  ]) {
    assert.equal(hitTestTile(x, y), null);
  }
  for (const [row, column] of [
    [-1, 0], [0, -1], [PLANE.rows, 0], [0, PLANE.columns], [1.5, 2], [2, 3.5], ["1", 2],
  ]) {
    assert.equal(isTileInRange(row, column), false);
    assert.equal(tileCenter(row, column), null);
  }
});

test("an invalid selected tile cannot enter active selection state", () => {
  const current = { row: 2, column: 4 };
  assert.strictEqual(toggleActiveTile(current, { row: 99, column: 99 }), current);
  assert.strictEqual(toggleActiveTile(current, { row: 2.5, column: 4 }), current);
  assert.deepEqual(toggleActiveTile(null, { row: 2, column: 4 }), { row: 2, column: 4 });
});
