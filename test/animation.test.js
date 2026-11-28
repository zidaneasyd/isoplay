import test from "node:test";
import assert from "node:assert/strict";
import { createRenderScheduler } from "../src/js/animation.js";

function withAnimationFrame(callback) {
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  const queued = [];
  let nextId = 1;
  globalThis.requestAnimationFrame = (frame) => {
    const id = nextId++;
    queued.push({ id, frame });
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    const index = queued.findIndex((entry) => entry.id === id);
    if (index >= 0) queued.splice(index, 1);
  };
  try { callback(queued); }
  finally {
    if (originalRequest === undefined) delete globalThis.requestAnimationFrame;
    else globalThis.requestAnimationFrame = originalRequest;
    if (originalCancel === undefined) delete globalThis.cancelAnimationFrame;
    else globalThis.cancelAnimationFrame = originalCancel;
  }
}

test("change-driven invalidations coalesce into one frame and then go idle", () => {
  withAnimationFrame((queued) => {
    const deltas = [];
    const scheduler = createRenderScheduler((dt) => deltas.push(dt));
    scheduler.invalidate();
    scheduler.invalidate();
    assert.equal(queued.length, 1);
    queued.shift().frame(1000);
    assert.deepEqual(deltas, [0]);
    assert.equal(queued.length, 0);
  });
});

test("continuous mode keeps scheduling frames and stops after the pending frame", () => {
  withAnimationFrame((queued) => {
    const deltas = [];
    const scheduler = createRenderScheduler((dt) => deltas.push(dt));
    scheduler.setContinuous(true);
    queued.shift().frame(1000);
    queued.shift().frame(1016);
    assert.deepEqual(deltas, [0, 0.016]);
    assert.equal(queued.length, 1);

    scheduler.setContinuous(false);
    queued.shift().frame(1032);
    assert.equal(queued.length, 0);
    assert.deepEqual(deltas, [0, 0.016, 0]);
  });
});

test("continuous mode preserves long frame gaps for future scene updates", () => {
  withAnimationFrame((queued) => {
    const deltas = [];
    const scheduler = createRenderScheduler((dt) => deltas.push(dt));
    scheduler.setContinuous(true);
    queued.shift().frame(0);
    queued.shift().frame(2500);
    assert.deepEqual(deltas, [0, 2.5]);
    scheduler.dispose();
    assert.equal(queued.length, 0);
  });
});

test("scheduler accepts injected frame functions and cancels a pending frame", () => {
  const queue = new Map();
  const cancelled = [];
  let nextId = 1;
  const scheduler = createRenderScheduler(() => {}, {
    requestFrame(callback) {
      const id = nextId++;
      queue.set(id, callback);
      return id;
    },
    cancelFrame(id) {
      cancelled.push(id);
      queue.delete(id);
    },
  });

  assert.equal(scheduler.isPending(), false);
  scheduler.invalidate();
  assert.equal(scheduler.isPending(), true);
  scheduler.cancel();
  assert.deepEqual(cancelled, [1]);
  assert.equal(queue.size, 0);
  assert.equal(scheduler.isPending(), false);
});
