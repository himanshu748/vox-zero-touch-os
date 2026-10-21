import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

process.env.VOX_MODEL_MODE = "local";
// Replay saved synthetic predictions only. No account connection or model request.
globalThis.fetch = async () => {
  throw new Error("Recorded prediction replay forbids HTTP.");
};
const { createStore } = await import("../server/store.mjs");
const { createEngine } = await import("../server/engine.mjs");
const { risk, buildPlan } = await import("../server/planner.mjs");
const { escalationData, ticketFeatures } =
  await import("../server/escalation-data.mjs");
const evidence = JSON.parse(
  await readFile("docs/evidence/tabpfn-evaluation.json", "utf8"),
);
assert.equal(
  evidence.dataset.sha256,
  createHash("sha256")
    .update(JSON.stringify(escalationData.train))
    .digest("hex"),
);
const now = Date.now(),
  store = createStore(":memory:"),
  owner = "recorded-prediction-replay";
let calls = 0;
const template = store.get(owner).tickets[0];
const tickets = escalationData.heldOut.map(
  ([age, sla, incident, impact], i) => ({
    ...structuredClone(template),
    id: `HELD-${String(i + 1).padStart(2, "0")}`,
    title: `Authored held-out support scenario ${i + 1}`,
    body: impact
      ? "Production impact reported."
      : "A support issue was reported.",
    category: incident ? "incident" : "docs",
    createdAt: new Date(now - age * 3600000).toISOString(),
    slaAt: new Date(now + sla * 3600000).toISOString(),
    tags: [],
    notes: [],
    drafts: [],
  }),
);
tickets.forEach((ticket, i) =>
  assert.deepEqual(
    ticketFeatures(ticket, now),
    escalationData.heldOut[i].slice(0, 4),
  ),
);
store.mutate(owner, (s) => {
  s.tickets = tickets;
});
const baseline = tickets.map((t) => ({ id: t.id, ...risk(t, now) }));
const plan = buildPlan(
  "Triage the support queue.",
  "all",
  { actions: ["triage"], objective: "Replay held-out prediction ranking" },
  tickets,
  "local",
);
plan.predictionMode = "tabpfn";
plan.maxPredictionCalls = 1;
plan.maxPredictionTokens = 50000;
const engine = createEngine(store, {
  delay: 0,
  predict: async () => {
    calls++;
    return {
      probabilities: evidence.probabilities,
      dataset: evidence.dataset,
      receipt: {
        provider: "Recorded TabPFN replay",
        operation: "saved predictions, no new provider request",
        cost: null,
      },
    };
  },
});
try {
  await engine.ready;
  store.mutate(owner, (s) =>
    s.runs.push({
      id: "recorded-ranking",
      plan,
      status: "running",
      cursor: 0,
      events: [],
      sources: [],
      style: "concise",
      injectFailure: false,
    }),
  );
  await engine.start(owner, "recorded-ranking");
  for (
    let i = 0;
    i < 1000 && store.get(owner).runs[0].status === "running";
    i++
  )
    await new Promise((r) => setTimeout(r, 10));
  const state = store.get(owner),
    run = state.runs[0];
  assert.equal(run.status, "completed");
  assert.equal(calls, 1);
  const order = (rows) =>
    [...rows].sort((a, b) => b.score - a.score).map((t) => t.id);
  const before = order(baseline),
    after = order(state.tickets);
  assert.notDeepEqual(before, after);
  assert.ok(state.tickets.every((t) => t.score >= t.ruleScore));
  const rows = state.tickets.map((t, i) => ({
    id: t.id,
    features: escalationData.heldOut[i].slice(0, 4),
    authoredLabel: escalationData.heldOut[i][4],
    recordedProbability: evidence.probabilities[i],
    ruleScore: t.ruleScore,
    combinedScore: t.score,
    beforeRank: before.indexOf(t.id) + 1,
    afterRank: after.indexOf(t.id) + 1,
    reason: t.reasons.at(-1),
  }));
  const report = {
    checkedAt: new Date().toISOString(),
    mode: "Recorded live TabPFN output replayed through the actual local VOX engine; no fresh provider inference",
    source: "docs/evidence/tabpfn-evaluation.json",
    originalProviderObservedAt: evidence.observedAt,
    datasetVersion: escalationData.version,
    heldOutRows: rows.length,
    ruleClassification: {
      positiveWhen: "SLA rule score >= 50",
      correct: rows.filter((r) => Number(r.ruleScore >= 50) === r.authoredLabel)
        .length,
    },
    tabpfnClassification: {
      positiveWhen: "recorded probability >= 0.5",
      correct: rows.filter(
        (r) => Number(r.recordedProbability >= 0.5) === r.authoredLabel,
      ).length,
    },
    changedRanks: rows.filter((r) => r.beforeRank !== r.afterRank).length,
    safetyFloorViolations: 0,
    applicationHttpRequests: 0,
    status: run.status,
    before,
    after,
    rows,
    limitations: [
      "Authored labels and features, not customer outcomes.",
      "Offline replay verifies the runtime effect; it is not a second live TabPFN request.",
      "Rank changes do not establish better customer outcomes or probability calibration.",
    ],
  };
  await writeFile(
    "docs/evidence/tabpfn-ranking-replay.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      heldOutRows: rows.length,
      changedRanks: report.changedRanks,
      ruleCorrect: report.ruleClassification.correct,
      tabpfnCorrect: report.tabpfnClassification.correct,
    }),
  );
} finally {
  await engine.close();
  store.close();
}
