import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir, cpus, totalmem, platform, arch, release } from "node:os";
import { join, resolve } from "node:path";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { parseArgs } from "node:util";
import { relative } from "node:path";

// No dotenv, account credential, cloud database or hosted endpoint is read.
process.env.VOX_MODEL_MODE = "local";
const { configureLocalRuntime, startLocalTemporal } =
  await import("../server/local-runtime.mjs");
const directory = await mkdtemp(join(tmpdir(), "vox-lazy-payoff-"));
process.env.VOX_LOCAL_DATA_DIR = directory;
configureLocalRuntime();
const destinations = new Set(),
  externalHosts = [],
  originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  destinations.add(url.hostname);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)) {
    externalHosts.push(url.hostname);
    throw new Error("Benchmark blocked an external HTTP destination.");
  }
  return originalFetch(input, init);
};
const { createStore } = await import("../server/store.mjs");
const { createApp } = await import("../server/app.mjs");
const { localModelConfig } = await import("../server/model-mode.mjs");
const { knowledge } = await import("../server/seed.mjs");
const config = localModelConfig(),
  stageTimings = {};
let temporal, store, engine, server;
const launchedAt = performance.now();
const { values } = parseArgs({ options: { "output-dir": { type: "string" } } });
const evidenceDirectory = resolve(values["output-dir"] || "docs/evidence");
await mkdir(evidenceDirectory, { recursive: true });
try {
  temporal = await startLocalTemporal({
    dataDir: directory,
    port: Number(process.env.VOX_LOCAL_TEMPORAL_PORT || 17333),
  });
  store = createStore(join(directory, "vox.sqlite"));
  const app = createApp(store, {
    delay: 0,
    engineOptions: {
      onStage: ({ kind, durationMs }) => {
        const timing = (stageTimings[kind] ||= { attempts: 0, wallClockMs: 0 });
        timing.attempts++;
        timing.wallClockMs += durationMs;
      },
    },
  });
  engine = app.engine;
  await engine.ready;
  server = app.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const startupMs = performance.now() - launchedAt;
  const base = `http://127.0.0.1:${server.address().port}/api/`;
  let cookie;
  async function api(path, body) {
    const r = await fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    cookie = r.headers.get("set-cookie")?.split(";")[0] || cookie;
    const data = await r.json();
    if (!r.ok)
      throw new Error(`Local ${path} failed (${r.status}): ${data.error}`);
    return data;
  }
  async function until(check) {
    const deadline = Date.now() + 600000;
    while (Date.now() < deadline) {
      const state = await api("state");
      if (state.runs[0]?.status === "failed")
        throw new Error("Local workflow failed: " + state.runs[0].error);
      if (await check(state)) return state;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error("Local benchmark timed out.");
  }
  const initial = await api("state");
  // Disable deliberate fault injection for a time benchmark; retry tests remain separate.
  await api("preferences", {
    style: "concise",
    injectFailure: false,
    scope: "all",
  });
  const referenceTime = Date.now();
  const queue = {
    referenceTime: new Date(referenceTime).toISOString(),
    provenance: "24 authored fictional VOX tickets; no customer data",
    tickets: initial.tickets.map((t) => ({
      id: t.id,
      title: t.title,
      body: t.body,
      category: t.category,
      slaHoursAtStart: Number(
        ((Date.parse(t.slaAt) - referenceTime) / 3600000).toFixed(3),
      ),
    })),
    playbooks: knowledge,
  };
  const datasetSha256 = createHash("sha256")
    .update(JSON.stringify(queue))
    .digest("hex");
  let modelLoadedAtStart = null,
    modelRuntime = { name: "OpenAI-compatible server", version: "unverified" };
  try {
    const ps = await fetch(new URL("/api/ps", config.baseURL));
    if (ps.ok)
      modelLoadedAtStart = (await ps.json()).models.some(
        (m) => m.name === config.model,
      );
    const version = await fetch(new URL("/api/version", config.baseURL));
    if (version.ok)
      modelRuntime = {
        name: "Ollama",
        version: (await version.json()).version,
      };
  } catch {
    /* llama.cpp need not expose Ollama metadata */
  }
  const command =
    "Triage all 24 support tickets, research fixes from the local playbooks, tag urgent ones, and draft two replies. Ask before sending anything.";
  const startedAt = new Date().toISOString(),
    beforePlan = performance.now();
  const plan = await api("plans", { command, scope: "all" });
  const planningMs = performance.now() - beforePlan;
  if (plan.provider !== "local-model" || plan.draftCount !== 2)
    throw new Error("Benchmark requires two locally generated drafts.");
  const run = await api("runs", { planId: plan.id });
  const ready = await until(
    (s) =>
      s.runs[0]?.status === "awaiting_approval" &&
      s.runs[0]?.workflow?.status === "suspended",
  );
  const preparationMs = performance.now() - beforePlan;
  const pending = ready.tickets
    .flatMap((t) => t.drafts.map((d) => ({ ...d, ticketId: t.id })))
    .filter((d) => d.status === "pending");
  if (pending.length !== 2 || ready.runs[0].metrics.sent !== 0)
    throw new Error("Approval gate did not preserve two pending decisions.");
  // Automation proves the two decision paths; it does not measure human review time.
  const beforeDecisions = performance.now();
  await api("approvals/" + pending[0].id, { decision: "approve" });
  await api("approvals/" + pending[1].id, { decision: "reject" });
  const done = await until(
    (s) =>
      s.runs[0]?.status === "completed" &&
      s.runs[0]?.workflow?.status === "success",
  );
  let history;
  await until(async () => {
    history = await api("runs/" + run.id + "/temporal");
    return history.status === "COMPLETED";
  });
  const finished = done.runs[0];
  const receipts = done.receipts.filter((r) => r.status !== "skipped");
  if (externalHosts.length) throw new Error("An external host was attempted.");
  let machineIdentifier = "unverified";
  if (platform() === "darwin")
    try {
      machineIdentifier = execFileSync("sysctl", ["-n", "hw.model"], {
        encoding: "utf8",
      }).trim();
    } catch {}
  const round = (n) => Number(n.toFixed(2));
  for (const stage of Object.values(stageTimings))
    stage.wallClockMs = round(stage.wallClockMs);
  const receipt = {
    schemaVersion: 1,
    status: "completed",
    startedAt,
    finishedAt: new Date().toISOString(),
    modelMode: "local",
    models: [...new Set(receipts.map((r) => r.model))],
    endpoint: config.baseURL,
    modelLoadedAtStart,
    modelRuntime,
    hardware: {
      description:
        platform() === "darwin" && machineIdentifier === "Mac16,12"
          ? "MacBook Air M4, 16 GB"
          : "See observed fields",
      cpu: cpus()[0]?.model,
      memoryBytes: totalmem(),
      machineIdentifier,
      platform: platform(),
      arch: arch(),
      osRelease: release(),
    },
    dataset: {
      tickets: 24,
      sha256: datasetSha256,
      file: relative(
        resolve(),
        join(evidenceDirectory, "lazy-payoff-queue.json"),
      ),
    },
    command,
    timing: {
      startupMs: round(startupMs),
      planningAndNormalizationMs: round(planningMs),
      preparationUntilTwoDecisionsMs: round(preparationMs),
      scriptedDecisionsAndCompletionMs: round(
        performance.now() - beforeDecisions,
      ),
      stages: stageTimings,
    },
    result: {
      ...finished.metrics,
      draftTicketIds: pending.map((d) => d.ticketId),
      humanReplyDecisionsNeeded: 2,
      planApprovalNeeded: 1,
      totalHumanGates: 3,
    },
    drafts: pending.map((d) => ({
      ticketId: d.ticketId,
      body: d.body,
      source: d.source,
      statusAtPreparation: d.status,
    })),
    orchestration: {
      mastra: finished.workflow.status,
      temporal: history.status,
      temporalEvents: history.events.length,
      decisionSignals: history.events.filter(
        (e) => e.eventType === "EVENT_TYPE_WORKFLOW_EXECUTION_SIGNALED",
      ).length,
    },
    requests: receipts.map((r) => ({
      provider: r.provider,
      model: r.model,
      execution: r.execution,
      operation: r.operation || "structured generation",
      latencyMs: r.latencyMs,
      usage: r.usage,
      fallbackUsed: r.fallbackUsed ?? false,
    })),
    skipped: done.receipts
      .filter((r) => r.status === "skipped")
      .map((r) => ({
        provider: r.provider,
        status: r.status,
        operation: r.operation,
      })),
    network: {
      applicationHttpHosts: [...destinations],
      externalHosts,
      externalHttpRequests: 0,
      temporalAddress: temporal.address,
      scope:
        "Application fetch destinations and loopback-only Temporal configuration; not an OS packet capture.",
    },
    manualBaseline: {
      status: "not measured",
      manualMinutes: null,
      humanReviewMinutes: null,
      timeSavedMinutes: null,
    },
    limitations: [
      "One synthetic run; not production accuracy or an average.",
      "Scripted plan approval and reply decisions; human reading/review time is not measured.",
      "SLA priority remains deterministic; Gemma performs intent, planning and drafting.",
      "Local Qwen3-8B fallback is transport-tested; real fallback execution is unverified unless fallbackUsed is true.",
      "No physical voice input/output is used in local mode.",
    ],
  };
  // Do not replace a previously measured input if this attempt fails mid-workflow.
  await writeFile(
    join(evidenceDirectory, "lazy-payoff-queue.json"),
    JSON.stringify(queue, null, 2) + "\n",
  );
  await writeFile(
    join(evidenceDirectory, "lazy-payoff.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      {
        status: receipt.status,
        preparationMs: round(preparationMs),
        result: receipt.result,
        orchestration: receipt.orchestration,
        externalHosts,
      },
      null,
      2,
    ),
  );
} finally {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await engine?.close();
  store?.close();
  await temporal?.close();
  await rm(directory, { recursive: true, force: true });
}
