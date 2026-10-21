import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createStore } from "../server/store.mjs";
import { createApp } from "../server/app.mjs";
import {
  activateJudge,
  judgeStatus,
  reserveJudgeRequest,
} from "../server/judge-access.mjs";

function environment(t, values) {
  const old = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(values))
    value === undefined ? delete process.env[key] : (process.env[key] = value);
  t.after(() => {
    for (const [key, value] of Object.entries(old))
      value === undefined
        ? delete process.env[key]
        : (process.env[key] = value);
  });
}

test("eight durable judge passes cannot be overallocated, refreshed by reset, or replayed", async (t) => {
  environment(t, { VOX_JUDGE_LIVE_SESSIONS: "999" });
  const store = createStore(":memory:");
  t.after(() => store.close());
  let acknowledgments = 0;
  store.flush = async () => {
    acknowledgments++;
  };
  const attempts = await Promise.allSettled(
    Array.from({ length: 9 }, (_, i) =>
      activateJudge(store, `judge:${i}`, "live"),
    ),
  );
  assert.equal(attempts.filter((x) => x.status === "fulfilled").length, 8);
  assert.equal(judgeStatus(store, "judge:other").remainingSessions, 0);
  await reserveJudgeRequest(store, "judge:0", "plan");
  store.reset("judge:0");
  await assert.rejects(
    reserveJudgeRequest(store, "judge:0", "plan"),
    /planning attempt/,
  );
  await assert.rejects(activateJudge(store, "judge:0", "live"), /already used/);
  await reserveJudgeRequest(store, "judge:0", "speech");
  await reserveJudgeRequest(store, "judge:0", "speech");
  await assert.rejects(
    reserveJudgeRequest(store, "judge:0", "speech"),
    /two briefing/,
  );
  assert.equal(
    judgeStatus(store, "judge:0", Date.now() + 86401000).mode,
    "expired",
  );
  assert(acknowledgments >= 11);
});

test("anonymous judges can execute and decide their own bounded live run; normal guests and other sessions stay denied", async (t) => {
  environment(t, {
    VOX_JUDGE_LIVE_SESSIONS: "8",
    VOX_REQUIRE_PROVIDER_LOGIN: "true",
    AUTH0_REQUIRE_APPROVAL_LOGIN: "true",
    GOOGLE_GENERATIVE_AI_API_KEY: "test-only",
    GOOGLE_API_KEY: undefined,
    GEMMA_PROVIDER: "google",
    AUTH0_ISSUER_BASE_URL: undefined,
    AUTH0_CLIENT_ID: undefined,
    AUTH0_CLIENT_SECRET: undefined,
    AUTH0_SESSION_SECRET: undefined,
    TEMPORAL_ADDRESS: undefined,
    TINKER_API_KEY: undefined,
    TINKER_MODEL: undefined,
    TABPFN_API_KEY: undefined,
    TIGER_DATABASE_URL: undefined,
    PAPERINSTRUMENTS_API_KEY: undefined,
    BROWSERBASE_API_KEY: undefined,
    SERPAPI_API_KEY: undefined,
    BACKBOARD_API_KEY: undefined,
  });
  const store = createStore(":memory:");
  let modelCalls = 0;
  const { app, engine } = createApp(store, {
    delay: 1,
    planModel: async () => {
      modelCalls++;
      return {
        intent: {
          actions: ["triage", "draft"],
          objective: "Review the fictional queue",
          draftLimit: 6,
        },
        receipt: { provider: "Gemma endpoint", sdk: "test-only" },
      };
    },
    engineOptions: {
      generate: async () => {
        modelCalls++;
        return {
          output: {
            body: "A cautious proposed next step for this fictional ticket.",
          },
          model: "test-only",
          usage: { totalTokens: 12 },
        };
      },
    },
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await engine.close();
    await new Promise((resolve) => server.close(resolve));
    store.close();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const client = () => {
    let cookie;
    return async (path, body, judge = true) => {
      const response = await fetch(
        `${base}/api/${path}${judge ? "?workspace=judge" : ""}`,
        {
          method: body === undefined ? "GET" : "POST",
          headers: {
            ...(cookie ? { cookie } : {}),
            ...(body === undefined
              ? {}
              : { "content-type": "application/json" }),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      );
      cookie = response.headers.get("set-cookie")?.split(";")[0] || cookie;
      return { status: response.status, data: await response.json() };
    };
  };
  const a = client(),
    b = client(),
    guest = client();
  assert.equal(
    (await guest("plans", { command: "Triage the queue" }, false)).status,
    401,
  );
  assert.equal((await a("plans", { command: "Triage the queue" })).status, 409);
  assert.equal((await a("judge/activate", { mode: "live" })).status, 200);
  const plan = (
    await a("plans", { command: "Triage the queue and draft six replies" })
  ).data;
  assert.equal(plan.draftCount, 2);
  assert.equal(plan.maxProviderCalls, 5);
  assert.equal((await a("state")).data.judgePreview.id, plan.id);
  assert.equal(
    (await a("plans", { command: "Triage more tickets" })).status,
    429,
  );
  assert.equal((await b(`plans/${plan.id}`)).status, 404);
  await a("runs", { planId: plan.id });
  let state;
  for (let i = 0; i < 100; i++) {
    state = (await a("state")).data;
    if (state.runs[0].status === "awaiting_approval") break;
    await new Promise((r) => setTimeout(r, 10));
  }
  assert.equal(state.runs[0].status, "awaiting_approval");
  const drafts = state.tickets.flatMap((ticket) => ticket.drafts);
  await b("judge/activate", { mode: "sandbox" });
  assert.equal(
    (await b(`approvals/${drafts[0].id}`, { decision: "approve" })).status,
    404,
  );
  assert.equal(
    (await a(`approvals/${drafts[0].id}`, { decision: "approve" })).status,
    200,
  );
  assert.equal(
    (await a(`approvals/${drafts[0].id}`, { decision: "approve" })).status,
    409,
  );
  assert.equal(
    (await a(`approvals/${drafts[1].id}`, { decision: "reject" })).status,
    200,
  );
  assert.equal((await a("state")).data.runs[0].status, "completed");
  assert.equal(modelCalls, 3);
  const local = (await b("plans", { command: "Triage and draft one reply" }))
    .data;
  assert.equal(local.provider, "local");
  assert.equal(local.draftCount, 2);
  assert.equal(modelCalls, 3);
  await a("reset", {});
  assert.equal((await a("plans", { command: "Triage the queue" })).status, 429);
});

test("judge reservations persist after reopening storage and a failed acknowledgement blocks provider access", async (t) => {
  environment(t, { VOX_JUDGE_LIVE_SESSIONS: "8" });
  const dir = mkdtempSync(join(tmpdir(), "vox-judge-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let store = createStore(join(dir, "judge.sqlite"));
  await activateJudge(store, "judge:durable", "live");
  await reserveJudgeRequest(store, "judge:durable", "plan");
  store.close();
  store = createStore(join(dir, "judge.sqlite"));
  t.after(() => store.close());
  assert.equal(judgeStatus(store, "judge:durable").used.plan, 1);
  assert.equal(judgeStatus(store, "judge:other").remainingSessions, 7);
  await assert.rejects(
    reserveJudgeRequest(store, "judge:durable", "plan"),
    /planning attempt/,
  );
  await assert.rejects(
    activateJudge(store, "judge:bad", "unlimited"),
    /supported/,
  );
  store.flush = async () => {
    throw new Error("Test acknowledgement failure");
  };
  await assert.rejects(
    reserveJudgeRequest(store, "judge:durable", "speech"),
    /acknowledgement/,
  );
  assert.equal(judgeStatus(store, "judge:durable").used.speech, 1);
});
