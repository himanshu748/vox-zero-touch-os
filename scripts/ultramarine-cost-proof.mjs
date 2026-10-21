// Reconcile read-only organization usage snapshots with one hosted run.
// This command makes no requests and refuses ambiguous attribution.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export function buildCostProof(before, after, state, runId, deployedCommit) {
  const run = state.runs.find((item) => item.id === runId);
  assert.ok(run, "The hosted run must exist.");
  assert.equal(
    run.status,
    "completed",
    "Complete the individual decisions first.",
  );
  const receipts = state.receipts.filter(
    (item) => item.runId === runId && item.provider === "Ultramarine",
  );
  assert.equal(
    receipts.length,
    2,
    "Exactly two saved advisory review receipts are required.",
  );
  assert.ok(
    receipts.every(
      (item) =>
        item.sdk === "OpenAI Node SDK" && item.sdkVersion && item.requestId,
    ),
  );
  const b = before.usage,
    a = after.usage;
  assert.equal(
    b.period_start,
    a.period_start,
    "Snapshots must share a billing period.",
  );
  assert.equal(b.period_end, a.period_end);
  assert.equal(
    b.reserved_nanodollars,
    0,
    "Wait for existing reservations to settle.",
  );
  assert.equal(
    a.reserved_nanodollars,
    0,
    "Wait for the run's reservations to settle.",
  );
  assert.ok(Date.parse(before.observedAt) <= Date.parse(run.createdAt));
  assert.ok(
    receipts.every(
      (item) => Date.parse(item.createdAt) <= Date.parse(after.observedAt),
    ),
  );
  const delta = Object.fromEntries(
    [
      "requests",
      "prompt_tokens",
      "cached_prompt_tokens",
      "completion_tokens",
      "reasoning_tokens",
      "total_tokens",
    ].map((key) => [key, a[key] - b[key]]),
  );
  const sum = (key) =>
    receipts.reduce((total, item) => total + item.usage[key], 0);
  assert.equal(
    delta.requests,
    receipts.length,
    "Concurrent or missing requests prevent exact attribution.",
  );
  assert.equal(delta.prompt_tokens, sum("inputTokens"));
  assert.equal(delta.completion_tokens, sum("outputTokens"));
  assert.equal(delta.cached_prompt_tokens, sum("cachedTokens"));
  assert.equal(
    delta.total_tokens,
    delta.prompt_tokens + delta.completion_tokens,
  );
  const chargedNanodollars = b.available_nanodollars - a.available_nanodollars;
  assert.ok(Number.isSafeInteger(chargedNanodollars) && chargedNanodollars > 0);
  return {
    schemaVersion: 1,
    verifiedAt: after.observedAt,
    origin: "https://getvox.tech",
    runId,
    deployedCommit,
    sdk: {
      name: "Official OpenAI Node SDK",
      version: receipts[0].sdkVersion,
      baseURL: "https://api.paperinstruments.com/v1",
      maxRetries: 0,
    },
    billing: {
      source: "https://api.paperinstruments.com/v1/usage",
      chargedNanodollars,
      chargedUSD: chargedNanodollars / 1e9,
      basis:
        "Observed settled prepaid-credit balance debit, not a token-price estimate.",
      funding: "Existing promotional balance; no purchase or top-up.",
      scope:
        "Ultramarine's two advisory reviews only; not the full multi-provider run cost.",
      attribution:
        "Organization-wide request and input/output/cache token deltas exactly match these two saved receipts. No other Paper Instruments usage was initiated in the window.",
      before,
      after,
      usageDelta: delta,
    },
    result: {
      status: run.status,
      metrics: run.metrics,
      mastra: run.workflow?.status,
      reviews: run.draftReviews,
    },
    receipts,
    limitations: [
      "Advisory review against supplied references cannot establish independent factual correctness or authorize sending.",
      "The provider usage API is organization-wide. The reconciler rejects mismatched request or token counts, outstanding reservations and crossed billing periods.",
      "Per-request UI costs remain explicitly estimated; this artifact measures the combined settled credit debit for this verification window.",
    ],
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [beforePath, afterPath, statePath, runId, commit, outputPath] =
    process.argv.slice(2);
  assert.ok(
    outputPath && /^[a-f0-9]{40}$/.test(commit),
    "Usage: before.json after.json state.json runId deployedSHA output.json",
  );
  const [before, after, state] = await Promise.all(
    [beforePath, afterPath, statePath].map(async (path) =>
      JSON.parse(await readFile(path, "utf8")),
    ),
  );
  const proof = buildCostProof(before, after, state, runId, commit);
  await writeFile(outputPath, JSON.stringify(proof, null, 2) + "\n");
  console.log(
    JSON.stringify({
      saved: outputPath,
      chargedUSD: proof.billing.chargedUSD,
      reviews: proof.receipts.length,
    }),
  );
}
