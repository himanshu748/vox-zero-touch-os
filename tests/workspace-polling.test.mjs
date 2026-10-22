import test from "node:test";
import assert from "node:assert/strict";
import { startWorkspacePolling } from "../src/workspace-polling.js";

const settle = () => new Promise(setImmediate);

test("a state response slower than the polling interval is applied before another poll", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0,
    applied = 0,
    finish;
  const stop = startWorkspacePolling(async () => {
    calls++;
    await new Promise((resolve) => {
      finish = resolve;
    });
    applied++;
  });
  t.after(stop);
  await settle();
  t.mock.timers.tick(2100);
  await settle();
  assert.equal(calls, 1, "no newer request invalidates the slow response");
  finish();
  await settle();
  assert.equal(applied, 1);
  t.mock.timers.tick(1499);
  await settle();
  assert.equal(calls, 1);
  t.mock.timers.tick(1);
  await settle();
  assert.equal(calls, 2);
  stop();
  finish();
  await settle();
  t.mock.timers.tick(10000);
  await settle();
  assert.equal(calls, 2, "unmount does not restart a pending poll");
});

test("a failed state request retries and stopping clears a scheduled retry", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let calls = 0;
  const stop = startWorkspacePolling(async () => {
    if (++calls === 1) throw new Error("temporary connection loss");
  });
  t.after(stop);
  await settle();
  t.mock.timers.tick(1500);
  await settle();
  assert.equal(calls, 2);
  stop();
  t.mock.timers.tick(10000);
  await settle();
  assert.equal(calls, 2);
});
