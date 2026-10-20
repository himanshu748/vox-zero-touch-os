import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { createStore } from "../server/store.mjs";
import { createEngine, summary } from "../server/engine.mjs";
import { buildPlan, localIntent } from "../server/planner.mjs";
process.env.TEMPORAL_ADDRESS ||= "127.0.0.1:7233";
const directory = resolve(
  process.env.VOX_PROOF_DIR || "../../work/temporal-proof",
);
await mkdir(directory, { recursive: true });
const path = resolve(directory, "vox.sqlite"),
  owner = `proof-${randomUUID()}`,
  id = randomUUID();
let store = createStore(path),
  engine = createEngine(store, { delay: 5 });
await engine.ready;
store.mutate(owner, (s) =>
  s.runs.push({
    id,
    plan: buildPlan(
      "Triage tickets, research and draft two replies",
      "all",
      {
        ...localIntent("triage tickets research draft replies"),
        draftLimit: 2,
      },
      s.tickets,
      "local",
    ),
    status: "running",
    cursor: 0,
    events: [],
    sources: [],
    style: "concise",
    injectFailure: true,
    faultInjected: false,
    createdAt: new Date().toISOString(),
  }),
);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(fn) {
  for (let i = 0; i < 240; i++) {
    const result = await fn();
    if (result) return result;
    await wait(250);
  }
  throw new Error("Temporal proof timed out");
}
try {
  await engine.start(owner, id);
  await until(() => store.get(owner).runs[0].status === "awaiting_approval");
  const before = store.get(owner),
    writes = before.ledger.length;
  assert.equal(summary(before, before.runs[0]).drafts, 2);
  await engine.close();
  store.close();
  store = createStore(path);
  engine = createEngine(store, { delay: 5 });
  await engine.ready;
  store.mutate(owner, (s) => {
    for (const ticket of s.tickets)
      for (const draft of ticket.drafts) draft.status = "rejected";
    s.runs[0].status = "completed";
  });
  await engine.approvalsChanged(owner, id);
  const history = await until(async () => {
    const result = await engine.temporalHistory(owner, id);
    return result?.status === "COMPLETED" ? result : null;
  });
  const after = store.get(owner);
  assert.equal(after.ledger.length, writes);
  assert.equal(new Set(after.ledger.map((item) => item.key)).size, writes);
  const proof = {
    verifiedAt: new Date().toISOString(),
    scope:
      "real local Temporal server; synthetic helpdesk; no provider requests",
    workerRestarted: true,
    metrics: summary(after, after.runs[0]),
    run: after.runs[0],
    history,
  };
  await writeFile(
    resolve(directory, "temporal-proof.json"),
    JSON.stringify(
      proof,
      (_, value) => (typeof value === "bigint" ? value.toString() : value),
      2,
    ),
  );
  console.log(
    JSON.stringify({
      status: history.status,
      workflowId: history.workflowId,
      workerRestarted: true,
      writesBefore: writes,
      writesAfter: after.ledger.length,
      historyEvents: history.events.length,
    }),
  );
} finally {
  await engine.close();
  store.close();
}
