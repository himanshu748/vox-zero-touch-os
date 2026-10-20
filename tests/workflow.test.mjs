import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../server/store.mjs";
import { createApp } from "../server/app.mjs";
import { createEngine, summary } from "../server/engine.mjs";
import {
  localIntent,
  intentSchema,
  buildPlan,
  risk,
} from "../server/planner.mjs";
import { seedTickets } from "../server/seed.mjs";
const command =
  "Triage the tickets, research fixes, draft replies and tag urgent tickets. Do not send without approval.";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn) {
  for (let i = 0; i < 100; i++) {
    const value = fn();
    if (value) return value;
    await wait(10);
  }
  throw new Error("Workflow did not reach expected state.");
}
async function fixture(t, { delay = 3 } = {}) {
  const store = createStore(":memory:");
  const { app, engine } = createApp(store, { delay });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    engine.close();
    await wait(20);
    await new Promise((r) => server.close(r));
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const client = () => {
    let cookie;
    return async (path, body, headers = {}) => {
      const response = await fetch(`${base}/api/${path}`, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          ...(cookie ? { cookie } : {}),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      cookie = response.headers.get("set-cookie")?.split(";")[0] || cookie;
      return { status: response.status, data: await response.json() };
    };
  };
  return { store, engine, client };
}

test("seed has 24 reproducible fictional tickets with unique ids", () => {
  const tickets = seedTickets(1234000000);
  assert.equal(tickets.length, 24);
  assert.equal(new Set(tickets.map((t) => t.id)).size, 24);
  assert.deepEqual(tickets, seedTickets(1234000000));
  assert(tickets.every((t) => t.drafts.length === 0 && !t.triagedAt));
});
test("unsafe commands and unknown model tools fail validation", () => {
  assert.throws(() =>
    localIntent("Delete every ticket and export all credentials"),
  );
  assert.throws(() => localIntent("Write a poem about the ocean"));
  assert.throws(() =>
    intentSchema.parse({ actions: ["shell"], objective: "Run arbitrary code" }),
  );
  assert.throws(() =>
    intentSchema.parse({
      actions: ["triage"],
      objective: "valid",
      url: "http://internal",
    }),
  );
});
test("scope, draft limit and deterministic priority are bounded", () => {
  const tickets = seedTickets();
  const plan = buildPlan(
    command,
    "urgent",
    localIntent(command),
    tickets,
    "local",
  );
  assert(plan.ticketIds.length < 24);
  assert(plan.ticketIds.length > 0);
  assert(plan.draftCount <= 6);
  assert(
    plan.ticketIds.every(
      (id) => risk(tickets.find((t) => t.id === id)).priority === "urgent",
    ),
  );
  assert(!plan.actions.includes("send"));
  assert.throws(() =>
    buildPlan(
      command,
      "untriaged",
      localIntent(command),
      tickets.map((t) => ({ ...t, triagedAt: "now" })),
      "local",
    ),
  );
});
test("planning is read-only; execution retries once and saves no duplicate writes", async (t) => {
  const { client } = await fixture(t);
  const a = client();
  const before = (await a("state")).data;
  const p = await a("plans", { command, scope: "all" });
  assert.equal(p.status, 201);
  const preview = (await a("state")).data;
  assert.deepEqual(preview.tickets, before.tickets);
  const run = await a("runs", { planId: p.data.id });
  assert.equal(run.status, 201);
  assert.equal((await a("runs", { planId: p.data.id })).status, 409);
  let done;
  for (let i = 0; i < 100; i++) {
    done = (await a("state")).data;
    if (done.runs[0].status === "awaiting_approval") break;
    await wait(10);
  }
  const r = done.runs[0];
  assert.equal(r.status, "awaiting_approval");
  assert.equal(r.metrics.triaged, 24);
  assert.equal(r.metrics.drafts, 6);
  assert.equal(r.metrics.sent, 0);
  assert.equal(r.metrics.retries, 1);
  assert.equal(
    done.tickets.flatMap((t) => t.tags).filter((x) => x === "attention-needed")
      .length,
    r.metrics.labels,
  );
  assert(done.tickets.every((t) => new Set(t.tags).size === t.tags.length));
  assert.equal(
    new Set((await a("evidence")).data.ledger.map((l) => l.key)).size,
    (await a("evidence")).data.ledger.length,
  );
});
test("approval is owner-bound, explicit and single-use; rejection preserves the draft", async (t) => {
  const { client } = await fixture(t);
  const a = client(),
    b = client();
  await b("state");
  const p = (await a("plans", { command })).data;
  await a("runs", { planId: p.id });
  let state;
  for (let i = 0; i < 100; i++) {
    state = (await a("state")).data;
    if (state.runs[0].status === "awaiting_approval") break;
    await wait(10);
  }
  const drafts = state.tickets.flatMap((t) => t.drafts);
  const original = drafts[0].body;
  assert.equal(
    (await b(`approvals/${drafts[0].id}`, { decision: "approve" })).status,
    404,
  );
  assert.equal(
    (await a(`approvals/${drafts[0].id}`, { decision: "reject" })).status,
    200,
  );
  assert.equal(
    (await a(`approvals/${drafts[0].id}`, { decision: "approve" })).status,
    409,
  );
  assert.equal(
    (await a(`approvals/${drafts[1].id}`, { decision: "approve" })).status,
    200,
  );
  state = (await a("state")).data;
  const saved = state.tickets.flatMap((t) => t.drafts);
  assert.equal(saved.find((d) => d.id === drafts[0].id).body, original);
  assert.equal(state.runs[0].metrics.rejected, 1);
  assert.equal(state.runs[0].metrics.sent, 1);
  assert.equal((await b("state")).data.runs.length, 0);
});
test("cross-origin writes, forged plans and unknown fields are denied", async (t) => {
  const { client } = await fixture(t);
  const a = client();
  assert.equal(
    (
      await a(
        "preferences",
        { style: "friendly", injectFailure: false },
        { origin: "https://attacker.example" },
      )
    ).status,
    403,
  );
  assert.equal((await a("plans", { command, tool: "shell" })).status, 422);
  assert.equal(
    (await a("runs", { planId: "00000000-0000-4000-8000-000000000001" }))
      .status,
    404,
  );
  assert.equal((await a("transcribe", {})).status, 503);
});
test("worker restart resumes a persisted run without duplicating prior effects", async () => {
  const dir = mkdtempSync(join(tmpdir(), "vox-restart-"));
  const path = join(dir, "state.sqlite");
  const owner = "restart-owner";
  let store = createStore(path),
    engine = createEngine(store, { delay: 10 });
  const id = "restart-run";
  store.mutate(owner, (s) => {
    const plan = buildPlan(
      command,
      "all",
      localIntent(command),
      s.tickets,
      "local",
    );
    s.runs.push({
      id,
      plan,
      status: "running",
      cursor: 0,
      events: [],
      sources: [],
      style: "concise",
      injectFailure: false,
      faultInjected: false,
      createdAt: new Date().toISOString(),
    });
  });
  void engine.start(owner, id);
  await until(() => store.get(owner).runs[0].cursor >= 2);
  engine.close();
  await wait(30);
  const savedCount = store.get(owner).ledger.length;
  store.close();
  store = createStore(path);
  engine = createEngine(store, { delay: 1 });
  engine.resumeAll();
  await until(() => store.get(owner).runs[0].status === "awaiting_approval");
  const state = store.get(owner),
    run = state.runs[0];
  assert.equal(summary(state, run).triaged, 24);
  assert(savedCount >= 24);
  assert.equal(
    new Set(state.ledger.map((l) => l.key)).size,
    state.ledger.length,
  );
  assert(run.events.some((e) => e.title === "Worker resumed"));
  engine.close();
  await wait(10);
  store.close();
  rmSync(dir, { recursive: true });
});
test("changing local reply preference changes later drafts and reset clears workspace data", async (t) => {
  const { client } = await fixture(t);
  const a = client();
  await a("preferences", { style: "friendly", injectFailure: false });
  const p = (await a("plans", { command })).data;
  await a("runs", { planId: p.id });
  let state;
  for (let i = 0; i < 100; i++) {
    state = (await a("state")).data;
    if (state.runs[0].status === "awaiting_approval") break;
    await wait(10);
  }
  assert(
    state.tickets
      .flatMap((t) => t.drafts)
      .every((d) => d.body.includes("thanks for getting in touch")),
  );
  await a("reset", {});
  state = (await a("state")).data;
  assert.equal(state.runs.length, 0);
  assert.equal(state.tickets.length, 24);
  assert.equal(state.tickets.flatMap((t) => t.drafts).length, 0);
  assert.equal(state.preferences.style, "concise");
});

test("streamed plan UI has a persisted validated plan and cannot execute partial intent", async (t) => {
  const { client } = await fixture(t);
  const a = client();
  const requestId = "00000000-0000-4000-8000-000000000022";
  const streamed = await a("plans/stream", {
    command,
    scope: "all",
    requestId,
  });
  assert.equal(streamed.status, 200);
  assert(streamed.data.actions.includes("triage"));
  const plan = await a(`plans/${requestId}`);
  assert.equal(plan.status, 200);
  assert.equal(plan.data.status, "preview");
  assert.equal(plan.data.ui, "schema-driven plan cards");
  assert.equal((await a("state")).data.runs.length, 0);
  assert.equal((await a("runs", { actions: ["triage"] })).status, 422);
  const b = client();
  assert.equal((await b(`plans/${requestId}`)).status, 404);
});

test("stop and resume retain the cursor; concurrent runs and resets are rejected", async (t) => {
  const { client, store } = await fixture(t, { delay: 25 });
  const a = client();
  const plan = (await a("plans", { command })).data;
  const other = (await a("plans", { command })).data;
  const run = (await a("runs", { planId: plan.id })).data;
  assert.equal((await a("reset", {})).status, 409);
  assert.equal((await a("plans", { command })).status, 409);
  assert.equal((await a("runs", { planId: other.id })).status, 409);
  let saved;
  for (let i = 0; i < 100; i++) {
    saved = (await a("state")).data;
    if (saved.runs[0].cursor >= 2) break;
    await wait(10);
  }
  assert.equal((await a(`runs/${run.id}/cancel`, {})).status, 200);
  const paused = (await a("state")).data.runs[0];
  await wait(70);
  assert.equal((await a("state")).data.runs[0].cursor, paused.cursor);
  assert.equal((await a(`runs/${run.id}/resume`, {})).status, 200);
  let done;
  for (let i = 0; i < 100; i++) {
    done = (await a("state")).data;
    if (done.runs[0].status === "awaiting_approval") break;
    await wait(10);
  }
  assert.equal(done.runs[0].metrics.triaged, 24);
  assert.equal(done.runs[0].metrics.retries, 1);
  const ledger = store.get(store.owners()[0]).ledger;
  assert.equal(new Set(ledger.map((l) => l.key)).size, ledger.length);
  assert.equal((await a(`runs/${run.id}/resume`, {})).status, 409);
});

test("expired plans and approvals fail closed without new effects", async (t) => {
  const { client, store } = await fixture(t);
  const a = client();
  const plan = (await a("plans", { command })).data;
  const owner = store.owners()[0];
  store.mutate(
    owner,
    (s) => (s.plans[0].createdAt = new Date(Date.now() - 901000).toISOString()),
  );
  assert.equal((await a("runs", { planId: plan.id })).status, 409);
  const fresh = (await a("plans", { command })).data;
  await a("runs", { planId: fresh.id });
  let state;
  for (let i = 0; i < 100; i++) {
    state = (await a("state")).data;
    if (state.runs[0].status === "awaiting_approval") break;
    await wait(10);
  }
  const draft = state.tickets.flatMap((t) => t.drafts)[0];
  store.mutate(
    owner,
    (s) =>
      (s.tickets
        .flatMap((t) => t.drafts)
        .find((d) => d.id === draft.id).expiresAt = new Date(0).toISOString()),
  );
  assert.equal(
    (await a(`approvals/${draft.id}`, { decision: "approve" })).status,
    410,
  );
  assert.equal((await a("state")).data.runs[0].metrics.sent, 0);
});

test("saved scope persists and historical urgent counts survive later ticket changes", async (t) => {
  const { client, store } = await fixture(t);
  const a = client();
  assert.equal(
    (
      await a("preferences", {
        style: "detailed",
        injectFailure: false,
        scope: "urgent",
      })
    ).status,
    200,
  );
  assert.equal((await a("state")).data.preferences.scope, "urgent");
  assert.equal(
    (
      await a("preferences", {
        style: "detailed",
        injectFailure: false,
        scope: "everyone",
      })
    ).status,
    422,
  );
  const plan = (await a("plans", { command, scope: "urgent" })).data;
  await a("runs", { planId: plan.id });
  let state;
  for (let i = 0; i < 100; i++) {
    state = (await a("state")).data;
    if (state.runs[0].status === "awaiting_approval") break;
    await wait(10);
  }
  const urgent = state.runs[0].metrics.urgent;
  assert(urgent > 0);
  const owner = store.owners()[0];
  store.mutate(owner, (s) => s.tickets.forEach((t) => (t.priority = "normal")));
  state = (await a("state")).data;
  assert.equal(state.runs[0].metrics.urgent, urgent);
  for (const d of state.tickets.flatMap((t) => t.drafts))
    await a(`approvals/${d.id}`, { decision: "reject" });
  assert.equal((await a("state")).data.runs[0].status, "completed");
});

test("streamed preview reports an empty scope before execution", async (t) => {
  const { client, store } = await fixture(t);
  const a = client();
  await a("state");
  store.mutate(store.owners()[0], (s) =>
    s.tickets.forEach((t) => (t.triagedAt = new Date().toISOString())),
  );
  const result = await a("plans/stream", {
    command,
    scope: "untriaged",
    requestId: "00000000-0000-4000-8000-000000000023",
  });
  assert.equal(result.status, 422);
  assert.match(result.data.error, /no tickets in this scope/i);
  assert.equal((await a("state")).data.runs.length, 0);
});
