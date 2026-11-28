import test from "node:test";
import assert from "node:assert/strict";
import { createRenderStats } from "../src/js/render-stats.js";

function setup(options = {}) {
  let time = 0;
  let nextTimer = 1;
  const timers = new Map();
  const writes = [];
  const outputs = {};
  for (const key of ["tiles", "gridLines", "fps", "time"]) {
    outputs[key] = { set textContent(value) { writes.push([key, value]); this.value = value; } };
  }
  const stats = createRenderStats(outputs, {
    now: () => time,
    setTimer(callback, delay) {
      const id = nextTimer++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimer(id) { timers.delete(id); },
    ...options,
  });
  return {
    outputs, stats, timers, writes,
    advance(ms) { time += ms; },
    fireTimer() {
      const [id, timer] = timers.entries().next().value;
      timers.delete(id);
      timer.callback();
    },
  };
}

const frame = (renderMs = 0.5) => ({ tiles: 3, gridLines: 20, renderMs });

test("stats skip timers when no output elements exist", () => {
  const timers = [];
  const stats = createRenderStats({ tiles: null }, { setTimer: (...args) => timers.push(args) });
  stats.record(frame());
  assert.equal(timers.length, 0);
});

test("stats coalesce frame writes and avoid unchanged DOM values", () => {
  const env = setup();
  for (let index = 0; index < 10; index += 1) {
    env.stats.record(frame());
    env.advance(16);
  }
  assert.equal(env.timers.size, 1);
  assert.equal([...env.timers.values()][0].delay, 250);
  assert.equal(env.writes.length, 0);

  env.fireTimer();
  assert.deepEqual(env.writes.filter(([key]) => key !== "fps"), [
    ["tiles", "3"], ["gridLines", "20"], ["time", "0.50 ms"],
  ]);
  const writeCount = env.writes.length;
  env.stats.record(frame());
  env.advance(100);
  env.fireTimer();
  assert.deepEqual(env.writes.slice(writeCount), []);
});

test("fps is reported during repeated rendering and resets after idle", () => {
  const env = setup();
  for (let index = 0; index < 20; index += 1) {
    env.stats.record(frame());
    env.advance(16);
  }
  env.fireTimer();
  const fps = Number(env.outputs.fps.value);
  assert.ok(fps >= 55 && fps <= 70, `fps ${fps}`);
  assert.equal(env.timers.size, 1);

  env.advance(300);
  env.fireTimer();
  assert.equal(env.outputs.fps.value, "—");
  assert.equal(env.timers.size, 0);
});

test("stats dispose clears a pending timer and ignores later frames", () => {
  const env = setup();
  env.stats.record(frame());
  assert.equal(env.timers.size, 1);
  env.stats.dispose();
  env.stats.record(frame());
  assert.equal(env.timers.size, 0);
});
