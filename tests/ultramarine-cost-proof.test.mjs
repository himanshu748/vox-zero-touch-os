import test from "node:test";
import assert from "node:assert/strict";
import { buildCostProof } from "../scripts/ultramarine-cost-proof.mjs";

function fixture() {
  const usage = {
    period_start: 1,
    period_end: 100,
    reserved_nanodollars: 0,
    requests: 7,
    prompt_tokens: 1000,
    cached_prompt_tokens: 0,
    completion_tokens: 100,
    reasoning_tokens: 0,
    total_tokens: 1100,
    available_nanodollars: 5000000000,
  };
  const before = { observedAt: "2026-10-21T10:00:00Z", usage };
  const after = {
    observedAt: "2026-10-21T10:10:00Z",
    usage: {
      ...usage,
      requests: 9,
      prompt_tokens: 1200,
      completion_tokens: 140,
      total_tokens: 1340,
      available_nanodollars: 4999950000,
    },
  };
  const state = {
    runs: [
      {
        id: "run",
        status: "completed",
        createdAt: "2026-10-21T10:01:00Z",
        metrics: {},
      },
    ],
    receipts: [1, 2].map((n) => ({
      provider: "Ultramarine",
      runId: "run",
      sdk: "OpenAI Node SDK",
      sdkVersion: "test",
      requestId: `request-${n}`,
      createdAt: "2026-10-21T10:05:00Z",
      usage: { inputTokens: 100, outputTokens: 20, cachedTokens: 0 },
    })),
  };
  return { before, after, state };
}

test("actual cost proof uses the settled debit and rejects concurrent usage or estimates", () => {
  const { before, after, state } = fixture();
  const proof = buildCostProof(before, after, state, "run", "test");
  assert.equal(proof.billing.chargedNanodollars, 50000);
  assert.equal(proof.billing.chargedUSD, 0.00005);
  after.usage.requests++;
  assert.throws(
    () => buildCostProof(before, after, state, "run", "test"),
    /attribution/,
  );
  after.usage.requests--;
  after.usage.prompt_tokens++;
  assert.throws(() => buildCostProof(before, after, state, "run", "test"));
});

test("billing proof refuses unsettled balances, crossed periods and pre-SDK receipts", () => {
  for (const change of [
    (f) => f.after.usage.reserved_nanodollars++,
    (f) => f.after.usage.period_start++,
    (f) => delete f.state.receipts[0].sdk,
  ]) {
    const f = fixture();
    change(f);
    assert.throws(() =>
      buildCostProof(f.before, f.after, f.state, "run", "test"),
    );
  }
});
