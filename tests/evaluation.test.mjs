import test from "node:test";
import assert from "node:assert/strict";
import { distribution, nearestRank } from "../scripts/evaluation-utils.mjs";

test("ten-run benchmark uses nearest-rank percentiles and rejects invalid measurements", () => {
  const values = [10, 30, 20, 40, 60, 50, 80, 70, 90, 100];
  assert.deepEqual(distribution(values), {
    samples: 10,
    minimumMs: 10,
    p50Ms: 50,
    p95Ms: 100,
    maximumMs: 100,
  });
  assert.equal(values[0], 10);
  for (const data of [[], [NaN], [-1], [Infinity]])
    assert.throws(() => nearestRank(data, 0.5));
  assert.throws(() => nearestRank([1], 0));
});
