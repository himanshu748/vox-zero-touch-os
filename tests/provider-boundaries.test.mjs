import test from "node:test";
import assert from "node:assert/strict";
import { reviewDraft } from "../server/draft-review.mjs";
import { predictEscalation } from "../server/escalation.mjs";
import { providerTask } from "../server/provider-task.mjs";
import {
  normalizeCommand,
  normalizePlan,
  normalizedIntent,
} from "../server/intent-normalizer.mjs";
import { retrieveKnowledge } from "../server/knowledge-retrieval.mjs";
import { createEngine } from "../server/engine.mjs";
import { createStore } from "../server/store.mjs";
import { buildPlan } from "../server/planner.mjs";
import { selfHostedConfig } from "../server/temporal-self-host.mjs";

test("self-hosted durability refuses admin or foreign connections and keeps RPCs private", () => {
  const uri =
    "postgresql://vox_temporal:test-only@vox-test.tsdb.cloud.timescale.com:5432/tsdb";
  for (const bad of [
    uri.replace("vox_temporal:", "tsdbadmin:"),
    uri.replace("vox-test.tsdb.cloud.timescale.com", "untrusted.example"),
    uri.replace("/tsdb", "/other"),
  ])
    assert.throws(
      () => selfHostedConfig(bad, "/test/ca.pem", "/test/dynamic.json"),
      /restricted VOX/,
    );
  const config = selfHostedConfig(uri, "/test/ca.pem", "/test/dynamic.json");
  assert.ok(
    Object.values(config.services).every(
      (service) => service.rpc.bindOnLocalHost,
    ),
  );
  for (const { sql } of Object.values(config.persistence.datastores)) {
    assert.equal(sql.tls.enabled, true);
    assert.equal(sql.tls.enableHostVerification, true);
    assert.equal(sql.user, "vox_temporal");
    assert.match(
      sql.connectAttributes.search_path,
      /^vox_(temporal|visibility),public$/,
    );
  }
});

const input = {
  ticket: { title: "Deploy error", body: "Our build stopped." },
  body: "Please send a redacted build log for review.",
  sources: [
    {
      title: "Runbook",
      content: "Ask for redacted logs.",
      url: "https://render.com/docs",
    },
  ],
};
test("Ultramarine review bounds cost, validates advice and never echoes provider errors", async (t) => {
  const diagnostics = [];
  t.mock.method(console, "warn", (...args) => diagnostics.push(args.join(" ")));
  const before = process.env.PAPERINSTRUMENTS_API_KEY;
  process.env.PAPERINSTRUMENTS_API_KEY = "test-only";
  t.after(() => {
    if (before === undefined) delete process.env.PAPERINSTRUMENTS_API_KEY;
    else process.env.PAPERINSTRUMENTS_API_KEY = before;
  });
  const payload = {
    id: "review-1",
    model: "ultramarine-1-flash",
    choices: [
      {
        finish_reason: "stop",
        message: {
          content: JSON.stringify({
            verdict: "needs_revision",
            summary: "Ask for the error timestamp before proposing a fix.",
            issues: [
              {
                severity: "warning",
                concern: "Missing timestamp",
                suggestion: "Request a redacted error timestamp.",
              },
            ],
          }),
        },
      },
    ],
    usage: { prompt_tokens: 1000, completion_tokens: 500 },
  };
  const result = await reviewDraft(input, {
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://api.paperinstruments.com/v1/chat/completions");
      assert.match(
        new Headers(options.headers).get("user-agent"),
        /^OpenAI\/JS /,
      );
      assert.equal(
        new Headers(options.headers).get("x-stainless-retry-count"),
        "0",
      );
      assert.equal(options.redirect, "error");
      const body = JSON.parse(options.body);
      assert.equal(body.max_completion_tokens, 3072);
      assert.equal(body.response_format.type, "json_schema");
      assert.equal(body.response_format.json_schema.strict, true);
      assert.deepEqual(body.response_format.json_schema.schema.required, [
        "verdict",
        "summary",
        "issues",
      ]);
      assert.equal(
        body.response_format.json_schema.schema.additionalProperties,
        false,
      );
      assert.equal(body.tools, undefined);
      return Response.json(payload);
    },
  });
  assert.equal(result.review.verdict, "needs_revision");
  assert.equal(result.receipt.cost, 0.0004);
  assert.equal(result.receipt.sdk, "OpenAI Node SDK");
  assert.equal(result.receipt.costIsEstimate, true);
  await assert.rejects(
    reviewDraft(input, {
      fetchImpl: async () =>
        new Response("secret upstream detail", { status: 401 }),
    }),
    (error) => !error.message.includes("secret upstream"),
  );
  payload.choices[0].finish_reason = "length";
  await assert.rejects(
    reviewDraft(input, { fetchImpl: async () => Response.json(payload) }),
  );
  assert.match(diagnostics.join(" "), /choices.0.finish_reason/);
  assert.ok(!diagnostics.join(" ").includes("secret upstream"));
});

test("Ultramarine SDK never retries billable failures and preserves cancellation and size limits", async (t) => {
  const before = process.env.PAPERINSTRUMENTS_API_KEY;
  process.env.PAPERINSTRUMENTS_API_KEY = "test-only";
  t.after(() => {
    if (before === undefined) delete process.env.PAPERINSTRUMENTS_API_KEY;
    else process.env.PAPERINSTRUMENTS_API_KEY = before;
  });
  for (const status of [429, 500]) {
    let calls = 0;
    await assert.rejects(
      reviewDraft(input, {
        fetchImpl: async () => {
          calls++;
          return new Response("private upstream message", { status });
        },
      }),
      /No automatic retry/,
    );
    assert.equal(calls, 1);
  }
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(
    reviewDraft(input, {
      signal: controller.signal,
      fetchImpl: async (_, options) => {
        calls++;
        controller.abort();
        assert.equal(options.signal.aborted, true);
        throw new Error("private transport failure");
      },
    }),
    /No automatic retry/,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    reviewDraft(input, {
      fetchImpl: async () => new Response("x".repeat(1048577)),
    }),
    /No automatic retry/,
  );
});

test("Ultramarine SDK cannot escape local mode even when its key remains configured", async (t) => {
  const keys = ["PAPERINSTRUMENTS_API_KEY", "VOX_MODEL_MODE"];
  const before = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.PAPERINSTRUMENTS_API_KEY = "test-only";
  process.env.VOX_MODEL_MODE = "local";
  t.after(() => {
    for (const key of keys) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  });
  const hosts = [];
  await assert.rejects(
    reviewDraft(input, {
      fetchImpl: async (url) => {
        hosts.push(new URL(url).hostname);
        throw new Error("must not reach transport");
      },
    }),
  );
  assert.deepEqual(hosts, []);
});

test("TabPFN refuses unaffordable requests before uploading and strips credentials from uploads", async (t) => {
  const before = process.env.TABPFN_API_KEY;
  process.env.TABPFN_API_KEY = "test-only";
  t.after(() => {
    if (before === undefined) delete process.env.TABPFN_API_KEY;
    else process.env.TABPFN_API_KEY = before;
  });
  let calls = 0;
  await assert.rejects(
    predictEscalation([], {
      rows: [[1, 2, 0, 0]],
      fetchImpl: async () => {
        calls++;
        return Response.json({ estimated_cost: 50001 });
      },
    }),
    /ceiling/,
  );
  assert.equal(calls, 1);
  const info = {
    signed_urls: ["https://storage.googleapis.com/vox-test?signature=test"],
    required_headers: {
      "Content-Type": "text/csv",
      Host: "storage.googleapis.com",
    },
  };
  const result = await predictEscalation([], {
    rows: [[1, 2, 0, 0]],
    fetchImpl: async (url, options) => {
      if (new URL(url).hostname === "storage.googleapis.com") {
        assert.equal(options.headers.Authorization, undefined);
        assert.equal(options.headers.Host, undefined);
        assert.equal(options.redirect, "error");
        return new Response("");
      }
      const path = new URL(url).pathname.split("/").pop();
      if (path === "estimate_cost")
        return Response.json({ estimated_cost: 10000 });
      if (path === "prepare_train_set_upload")
        return Response.json({
          train_set_upload_id: "train",
          x_train_info: info,
          y_train_info: info,
        });
      if (path === "fit") return Response.json({ fitted_train_set_id: "fit" });
      if (path === "prepare_test_set_upload")
        return Response.json({ test_set_upload_id: "test", x_test_info: info });
      return Response.json({ prediction: [[0.2, 0.8]], metadata: {} });
    },
  });
  assert.deepEqual(result.probabilities, [0.8]);
  assert.equal(result.dataset.trainRows, 48);
  info.signed_urls = ["https://attacker.example/upload"];
  await assert.rejects(
    predictEscalation([], {
      rows: [[1, 2, 0, 0]],
      fetchImpl: async (url) =>
        new URL(url).pathname.endsWith("estimate_cost")
          ? Response.json({ estimated_cost: 10000 })
          : Response.json({
              train_set_upload_id: "train",
              x_train_info: info,
              y_train_info: info,
            }),
    }),
    /unsafe upload/,
  );
});

test("durable reservations cache completed calls and block uncertain billing replay", async () => {
  const state = { runs: [{ id: "run", status: "running" }], receipts: [] };
  const store = {
    get: () => state,
    mutate: (_, fn) => fn(state),
    flush: async () => {},
  };
  let count = 0;
  const task = () => {
    count++;
    return { probabilities: [0.5] };
  };
  await providerTask(store, "owner", "run", "tabpfn:triage", 1, task);
  await providerTask(store, "owner", "run", "tabpfn:triage", 1, task);
  assert.equal(count, 1);
  await assert.rejects(
    providerTask(store, "owner", "run", "tabpfn:another", 1, task),
    /ceiling/,
  );
  await assert.rejects(
    providerTask(store, "owner", "run", "ultramarine:review", 1, () => {
      throw new Error("timeout");
    }),
  );
  await assert.rejects(
    providerTask(store, "owner", "run", "ultramarine:review", 1, task),
    /replay/,
  );
  assert.equal(count, 1);
});

test("Tinker uses the trained no-thinking contract, caches paid planning and blocks uncertain replay", async (t) => {
  const keys = ["TINKER_API_KEY", "TINKER_MODEL", "TINKER_MODEL_EXPIRES_AT"];
  const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(process.env, {
    TINKER_API_KEY: "test",
    TINKER_MODEL: "tinker://test/sampler_weights/test",
    TINKER_MODEL_EXPIRES_AT: new Date(Date.now() + 60000).toISOString(),
  });
  t.after(() => {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
  const output = await normalizeCommand(
    "Tag urgent tickets without drafting replies.",
    {
      fetchImpl: async (url, o) => {
        assert.equal(new URL(url).hostname, "tinker.thinkingmachines.dev");
        const body = JSON.parse(o.body);
        assert.equal(body.reasoning_effort, false);
        assert.equal(body.max_tokens, 96);
        assert.equal(body.tools, undefined);
        return Response.json({
          id: "test",
          choices: [
            {
              finish_reason: "stop",
              message: { content: '{"research":false,"drafts":0,"tag":true}' },
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 15 },
        });
      },
    },
  );
  assert.deepEqual(
    normalizedIntent(
      { actions: ["triage", "draft"], objective: "Triage" },
      output.value,
    ),
    { actions: ["triage", "tag"], objective: "Triage" },
  );
  const state = { receipts: [] };
  const store = {
    get: () => structuredClone(state),
    mutate: (_, fn) => fn(state),
    flush: async () => {},
  };
  let calls = 0;
  const normalize = async () => {
    calls++;
    return output;
  };
  await normalizePlan(store, "owner", "plan", "Tag urgent tickets.", {
    normalize,
  });
  await normalizePlan(store, "owner", "plan", "Tag urgent tickets.", {
    normalize,
  });
  assert.equal(calls, 1);
  assert.equal(state.receipts.length, 1);
  await assert.rejects(
    normalizePlan(store, "owner", "plan", "Draft one reply.", { normalize }),
    /different command/,
  );
  await assert.rejects(
    normalizePlan(store, "owner", "failed", "Tag urgent tickets.", {
      normalize: async () => {
        throw new Error("timeout");
      },
    }),
  );
  await assert.rejects(
    normalizePlan(store, "owner", "failed", "Tag urgent tickets.", {
      normalize,
    }),
    /replay/,
  );
  assert.equal(calls, 1);
});

test("Tiger binds query input, combines keyword and vector ranking, and labels authored sources", async (t) => {
  const keys = [
    "TIGER_DATABASE_URL",
    "TIGER_CA_PEM",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_EMBEDDING_FREE_TIER_CONFIRMED",
  ];
  const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(process.env, {
    TIGER_DATABASE_URL: "test",
    TIGER_CA_PEM: "test",
    GOOGLE_GENERATIVE_AI_API_KEY: "test",
    GOOGLE_EMBEDDING_FREE_TIER_CONFIRMED: "true",
  });
  t.after(() => {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
  const ticket = {
    id: "VX-test",
    title: "Deploy error'; DROP TABLE passages;--",
    body: "My deploy failed.",
  };
  const result = await retrieveKnowledge(ticket, {
    fetchImpl: async (url, o) => {
      assert.equal(new URL(url).hostname, "generativelanguage.googleapis.com");
      assert.equal(JSON.parse(o.body).outputDimensionality, 768);
      return Response.json({ embedding: { values: Array(768).fill(0.01) } });
    },
    query: async (sql, values) => {
      assert.ok(!sql.includes(ticket.title));
      assert.ok(sql.includes("websearch_to_tsquery"));
      assert.ok(sql.includes("<=>"));
      assert.equal(JSON.parse(values[0]).length, 768);
      assert.ok(values[1].includes("deploy OR error"));
      assert.ok(!values[1].includes(";"));
      return {
        rows: [
          {
            id: "deployment",
            title: "Runbook",
            content: "Review logs.",
            url: "https://render.com/docs",
            score: 0.03,
            semantic_rank: 1,
            keyword_rank: 1,
          },
        ],
      };
    },
  });
  assert.equal(result.sources[0].ticketId, "VX-test");
  assert.match(result.sources[0].kind, /authored/);
  assert.equal(result.receipt.provider, "Tiger Data");
});

test("advanced providers feed the approved workflow once and preserve human review", async (t) => {
  const keys = [
    "TABPFN_API_KEY",
    "PAPERINSTRUMENTS_API_KEY",
    "TIGER_DATABASE_URL",
    "TIGER_CA_PEM",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "GOOGLE_EMBEDDING_FREE_TIER_CONFIRMED",
  ];
  const previous = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  Object.assign(
    process.env,
    Object.fromEntries(
      keys.map((k) => [
        k,
        k === "GOOGLE_EMBEDDING_FREE_TIER_CONFIRMED" ? "true" : "test",
      ]),
    ),
  );
  const store = createStore(":memory:"),
    owner = "advanced-test",
    calls = { predict: 0, retrieve: 0, review: 0, generate: 0 };
  const engine = createEngine(store, {
    delay: 1,
    predict: async (tickets) => {
      calls.predict++;
      return {
        probabilities: tickets.map(() => 0.9),
        dataset: { version: "authored-test", provenance: "synthetic" },
        receipt: { provider: "TabPFN" },
      };
    },
    retrieve: async (ticket) => {
      calls.retrieve++;
      return {
        sources: [
          {
            id: "test",
            ticketId: ticket.id,
            title: "Test playbook",
            content: "Ask for a redacted log.",
            url: "https://render.com/docs",
            kind: "Tiger hybrid retrieval of authored playbook",
          },
        ],
        receipt: { provider: "Tiger Data" },
      };
    },
    generate: async (input) => {
      calls.generate++;
      const context = JSON.parse(input.messages[1].content);
      assert.ok(context.retrievedPassages.length);
      return {
        output: {
          body: "Please provide a redacted log so we can investigate.",
        },
        model: "test",
        sdk: "test",
        usage: {},
      };
    },
    review: async (input) => {
      calls.review++;
      assert.ok(input.sources.some((s) => s.kind?.includes("Tiger")));
      return {
        review: {
          verdict: "needs_revision",
          summary: "Confirm the cause before sending.",
          issues: [],
        },
        receipt: { provider: "Ultramarine" },
      };
    },
  });
  t.after(async () => {
    await engine.close();
    store.close();
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
  await engine.ready;
  const plan = buildPlan(
    "Triage tickets, research fixes, tag urgent tickets and draft one reply.",
    "all",
    {
      actions: ["triage", "research", "tag", "draft"],
      draftLimit: 1,
      objective: "Review",
    },
    store.get(owner).tickets,
    "gemma",
  );
  // External search/browser are disabled in this injected orchestration test.
  plan.researchMode = "local";
  plan.browserMode = "local";
  store.mutate(owner, (s) =>
    s.runs.push({
      id: "advanced-run",
      plan,
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
  await engine.start(owner, "advanced-run");
  for (let i = 0; i < 100 && store.get(owner).runs[0].status === "running"; i++)
    await new Promise((r) => setTimeout(r, 10));
  const state = store.get(owner),
    run = state.runs[0],
    drafts = state.tickets.flatMap((t) => t.drafts);
  assert.equal(run.status, "awaiting_approval");
  assert.deepEqual(calls, { predict: 1, retrieve: 2, review: 1, generate: 1 });
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].status, "pending");
  assert.equal(drafts[0].review.verdict, "needs_revision");
  assert.equal(drafts[0].knowledgeSources.length, 1);
  assert.ok(state.tickets.every((t) => t.score >= t.ruleScore));
  assert.equal(
    state.receipts.filter((r) => r.provider === "Tiger Data").length,
    2,
  );
  assert.equal(run.events.filter((e) => e.status === "retry").length, 1);
});
