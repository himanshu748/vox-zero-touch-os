import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../server/app.mjs";
import { createStore } from "../server/store.mjs";
import { connectAtlas } from "../server/atlas.mjs";
import {
  normalizeCommand,
  normalizePlan,
} from "../server/intent-normalizer.mjs";
import { localModelConfig, loopbackFetch } from "../server/model-mode.mjs";

const command =
  "Triage all tickets, research fixes, tag urgent ones and draft two replies. Ask before sending anything.";
const pause = () => new Promise((resolve) => setTimeout(resolve, 10));
async function until(fn) {
  for (let i = 0; i < 300; i++) {
    const value = await fn();
    if (value) return value;
    await pause();
  }
  throw new Error("Local test workflow did not finish.");
}
function environment(t) {
  const keys = [
    "VOX_MODEL_MODE",
    "VOX_LOCAL_BASE_URL",
    "VOX_LOCAL_MODEL",
    "TEMPORAL_ADDRESS",
    "SERPAPI_API_KEY",
    "ELEVENLABS_API_KEY",
    "BACKBOARD_API_KEY",
    "BROWSERBASE_API_KEY",
    "BROWSERBASE_PROJECT_ID",
    "TABPFN_API_KEY",
    "PAPERINSTRUMENTS_API_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "TIGER_DATABASE_URL",
    "MONGODB_URI",
    "AUTH0_ISSUER_BASE_URL",
    "AUTH0_CLIENT_ID",
    "AUTH0_CLIENT_SECRET",
    "AUTH0_SESSION_SECRET",
    "PUBLIC_ORIGIN",
    "AUTH0_REQUIRE_APPROVAL_LOGIN",
    "VOX_REQUIRE_PROVIDER_LOGIN",
  ];
  const previous = Object.fromEntries(
    keys.map((key) => [key, process.env[key]]),
  );
  for (const key of keys) process.env[key] = "test-only-not-a-credential";
  process.env.VOX_MODEL_MODE = "local";
  process.env.VOX_LOCAL_BASE_URL = "http://127.0.0.1:11434/v1";
  process.env.VOX_LOCAL_MODEL = "gemma3:4b";
  process.env.AUTH0_REQUIRE_APPROVAL_LOGIN = "true";
  process.env.VOX_REQUIRE_PROVIDER_LOGIN = "true";
  delete process.env.TEMPORAL_ADDRESS;
  t.after(() => {
    for (const key of keys)
      previous[key] === undefined
        ? delete process.env[key]
        : (process.env[key] = previous[key]);
  });
}
function transport(
  t,
  { invalidPlan = false, failGemmaIntent = false, invalidDraft = false } = {},
) {
  const original = globalThis.fetch,
    calls = [],
    externalHosts = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
      externalHosts.push(url.hostname);
      throw new Error("External network forbidden in local tests");
    }
    if (url.port !== "11434") return original(input, init);
    const body = JSON.parse(init.body);
    calls.push(body);
    const schema = body.response_format.json_schema.schema.properties;
    const isIntent = Boolean(schema.research);
    if (isIntent && failGemmaIntent && body.model === "gemma3:4b")
      return new Response("{}", { status: 503 });
    const output = isIntent
      ? { research: true, drafts: 2, tag: true }
      : schema.actions
        ? {
            actions: invalidPlan
              ? ["shell"]
              : ["triage", "research", "tag", "draft"],
            objective: "Prepare two replies for review",
            draftLimit: 2,
          }
        : {
            body: invalidDraft
              ? "x".repeat(3001)
              : "Please share a redacted error excerpt and timestamp so we can verify the playbook's proposed next step. This is a draft, not a confirmed fix.",
          };
    const completion = {
      id: "local-fixture",
      object: "chat.completion",
      created: 1,
      model: body.model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: JSON.stringify(output) },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 30, completion_tokens: 20, total_tokens: 50 },
    };
    if (body.stream) {
      return new Response(
        `data: ${JSON.stringify({ ...completion, choices: [{ index: 0, delta: { role: "assistant", content: JSON.stringify(output) }, finish_reason: null }] })}\n\ndata: ${JSON.stringify({ ...completion, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`,
        { headers: { "content-type": "text/event-stream" } },
      );
    }
    return Response.json(completion);
  };
  t.after(() => {
    globalThis.fetch = original;
  });
  return { calls, externalHosts };
}
async function fixture(t) {
  const store = createStore(":memory:");
  const { app, engine } = createApp(store, { delay: 1 });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    await engine.close();
    await new Promise((r) => server.close(r));
    store.close();
  });
  let cookie;
  const api = async (path, body) => {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/${path}`,
      {
        method: body === undefined ? "GET" : "POST",
        headers: {
          ...(cookie ? { cookie } : {}),
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    cookie = response.headers.get("set-cookie")?.split(";")[0] || cookie;
    return { status: response.status, data: await response.json() };
  };
  return {
    store,
    engine,
    api,
    base: `http://127.0.0.1:${server.address().port}`,
  };
}

test("local models prepare two real model drafts; approval and reservations survive, with zero external hosts even when cloud settings exist", async (t) => {
  environment(t);
  const net = transport(t);
  const { store, engine, api, base } = await fixture(t);
  const landing = await fetch(base + "/judge", { redirect: "manual" });
  assert.equal(landing.status, 302);
  assert.equal(landing.headers.get("location"), "/app");
  let connected = false;
  assert.equal(
    await connectAtlas(store, {
      client: {
        connect() {
          connected = true;
        },
      },
    }),
    null,
  );
  assert.equal(connected, false);
  const initial = (await api("state")).data;
  assert.equal(initial.capabilities.modelMode, "local");
  assert.equal(initial.capabilities.elevenlabs, false);
  assert.equal(initial.capabilities.identity, false);
  const voice = await api("transcribe", {});
  assert.equal(voice.status, 409);
  assert.equal(voice.data.receipt.status, "skipped");
  const p = await api("plans", { command });
  assert.equal(p.status, 201);
  assert.equal(p.data.provider, "local-model");
  assert.equal(p.data.draftCount, 2);
  assert.equal(p.data.researchMode, "local");
  assert.equal(p.data.browserMode, "local");
  assert.equal(p.data.reviewMode, "none");
  const owner = store.owners()[0];
  const callCount = net.calls.length;
  await normalizePlan(store, owner, p.data.id, command);
  assert.equal(
    net.calls.length,
    callCount,
    "Completed normalization must be reused",
  );
  await api("runs", { planId: p.data.id });
  const s = await until(async () => {
    const v = (await api("state")).data;
    return (
      v.runs[0]?.status === "awaiting_approval" &&
      v.runs[0]?.workflow?.status === "suspended" &&
      v
    );
  });
  assert.equal(s.runs[0].metrics.triaged, 24);
  assert.equal(s.runs[0].metrics.drafts, 2);
  assert.equal(s.runs[0].metrics.sent, 0);
  assert.equal(
    (await engine.snapshot(s.runs[0].workflow.runId)).steps["approval-gate"]
      .status,
    "suspended",
  );
  const drafts = s.tickets.flatMap((t) => t.drafts);
  assert(
    drafts.every(
      (d) => d.provider === "Local Gemma model" && d.status === "pending",
    ),
  );
  assert.equal(
    (await api("approvals/" + drafts[0].id, { decision: "approve" })).status,
    200,
  );
  assert.equal(
    (await api("approvals/" + drafts[0].id, { decision: "approve" })).status,
    409,
  );
  assert.equal(
    (await api("approvals/" + drafts[1].id, { decision: "reject" })).status,
    200,
  );
  const completed = await until(async () => {
    const v = (await api("state")).data;
    return v.runs[0]?.workflow?.status === "success" && v;
  });
  assert.equal(completed.runs[0].metrics.pending, 0);
  assert.equal(completed.runs[0].metrics.sent, 1);
  assert.equal(completed.runs[0].metrics.rejected, 1);
  for (const provider of ["SerpApi", "ElevenLabs", "Browserbase"])
    assert(
      completed.receipts.some(
        (r) =>
          r.provider === provider &&
          r.status === "skipped" &&
          r.operation === "skipped in local mode",
      ),
    );
  assert.equal(net.calls.length, 4);
  assert.deepEqual(net.externalHosts, []);
});

test("local planning rejects unknown model actions without persisting a runnable plan", async (t) => {
  environment(t);
  const net = transport(t, { invalidPlan: true });
  const { api } = await fixture(t);
  const result = await api("plans", { command });
  assert(result.status >= 400);
  const s = (await api("state")).data;
  assert.equal(s.runs.length, 0);
  assert.equal(s.judgePreview, undefined);
  assert.deepEqual(net.externalHosts, []);
});

test("local streamed planning validates the final schema before execution", async (t) => {
  environment(t);
  const net = transport(t);
  const { api } = await fixture(t);
  const id = "10000000-0000-4000-8000-000000000001";
  const result = await api("plans/stream", { command, requestId: id });
  assert.equal(result.status, 200);
  assert.deepEqual(result.data.actions, ["triage", "research", "tag", "draft"]);
  const plan = (await api("plans/" + id)).data;
  assert.equal(plan.provider, "local-model");
  assert.equal(plan.draftCount, 2);
  assert.equal((await api("state")).data.runs.length, 0);
  assert.deepEqual(net.externalHosts, []);
});

test("local grammar adaptation cannot bypass final reply length validation or silently use templates", async (t) => {
  environment(t);
  const net = transport(t, { invalidDraft: true });
  const { api } = await fixture(t);
  const plan = (await api("plans", { command })).data;
  await api("runs", { planId: plan.id });
  const failed = await until(async () => {
    const s = (await api("state")).data;
    return s.runs[0]?.status === "failed" && s;
  });
  assert.equal(failed.tickets.flatMap((t) => t.drafts).length, 0);
  assert.equal(failed.runs[0].metrics.sent, 0);
  assert.deepEqual(net.externalHosts, []);
});

test("Gemma intent failure falls back only to local Qwen3-8B; remote endpoints, redirects and cloud tags fail closed", async (t) => {
  environment(t);
  const net = transport(t, { failGemmaIntent: true });
  const result = await normalizeCommand(command);
  assert.equal(result.receipt.fallbackUsed, true);
  assert.deepEqual(
    net.calls.map((c) => c.model),
    ["gemma3:4b", "qwen3:8b"],
  );
  assert.deepEqual(net.externalHosts, []);
  process.env.VOX_LOCAL_BASE_URL = "https://provider.example/v1";
  assert.throws(localModelConfig, /loopback/);
  process.env.VOX_LOCAL_BASE_URL = "http://127.0.0.1:11434/v1";
  process.env.VOX_LOCAL_MODEL = "gemma3:cloud";
  assert.throws(localModelConfig, /cloud/);
  assert.throws(
    () => loopbackFetch()("https://provider.example/v1"),
    /loopback/,
  );
  let options;
  await loopbackFetch(async (_url, init) => {
    options = init;
    return new Response("{}");
  })("http://127.0.0.1:11434/v1", { redirect: "follow" });
  assert.equal(options.redirect, "error");
});
