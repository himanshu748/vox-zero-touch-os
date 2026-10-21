import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { cpus, totalmem, platform, arch } from "node:os";
import { distribution, round } from "./evaluation-utils.mjs";
import { planningPromptVersion } from "../server/planning-prompt.mjs";

// No dotenv, provider credential or hosted database is loaded by this runner.
process.env.VOX_MODEL_MODE = "local";
const { assertLoopbackURL, localModelConfig } =
  await import("../server/model-mode.mjs");
const hosts = new Set(),
  externalHosts = [],
  originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  hosts.add(url.hostname);
  try {
    assertLoopbackURL(url.href);
  } catch (error) {
    externalHosts.push(url.hostname);
    throw error;
  }
  return originalFetch(input, { ...init, redirect: "error" });
};
const { planWithGemma } = await import("../server/providers.mjs");
const raw = await readFile(new URL("./planning-fixture.json", import.meta.url));
const fixture = JSON.parse(raw),
  config = localModelConfig();
if (fixture.cases.length < 30)
  throw new Error("At least 30 fixed commands are required.");
const startedAt = new Date().toISOString(),
  rows = [];
for (const item of fixture.cases) {
  const start = performance.now();
  try {
    const result = await planWithGemma(item.command);
    const sameActions =
      JSON.stringify([...new Set(result.intent.actions)].sort()) ===
      JSON.stringify([...item.actions].sort());
    const sameLimit =
      item.draftLimit === undefined ||
      item.draftLimit === result.intent.draftLimit;
    rows.push({
      ...item,
      schemaValid: true,
      exactIntentMatch: sameActions && sameLimit,
      output: result.intent,
      receipt: result.receipt,
      wallClockMs: round(performance.now() - start),
    });
  } catch (error) {
    rows.push({
      ...item,
      schemaValid: false,
      exactIntentMatch: false,
      error: String(error.message).slice(0, 500),
      wallClockMs: round(performance.now() - start),
    });
  }
  console.log(
    `${item.id}: schema=${rows.at(-1).schemaValid} exact=${rows.at(-1).exactIntentMatch}`,
  );
}
const valid = rows.filter((r) => r.schemaValid).length;
const report = {
  schemaVersion: 1,
  startedAt,
  finishedAt: new Date().toISOString(),
  mode: "real local Gemma inference; no mocks or fallback model",
  fixture: fixture.version,
  fixtureFile: "scripts/planning-fixture.json",
  fixtureSha256: createHash("sha256").update(raw).digest("hex"),
  provenance: fixture.provenance,
  model: config.model,
  endpoint: config.baseURL,
  planningPromptVersion,
  hardware: {
    cpu: cpus()[0]?.model,
    memoryBytes: totalmem(),
    platform: platform(),
    arch: arch(),
  },
  total: rows.length,
  schemaValid: valid,
  schemaValidRate: valid / rows.length,
  exactIntentMatches: rows.filter((r) => r.exactIntentMatch).length,
  acceptance: {
    minimumCommands: 30,
    minimumSchemaValidRate: 0.9,
    passed: valid / rows.length >= 0.9,
  },
  latency: distribution(rows.map((r) => r.wallClockMs)),
  network: {
    applicationHttpHosts: [...hosts],
    externalHosts,
    scope: "Application fetch guard; not OS packet capture",
  },
  rows,
  limitations: [
    "Local Gemma 3 4B, not the hosted Gemma model or voice-to-plan endpoint.",
    "Schema validity does not establish action accuracy, reply quality or production reliability.",
    "Fixed synthetic regression set, not a held-out generalization claim. The shared planner prompt was corrected after observing the baseline failures; both results are retained.",
  ],
};
await writeFile(
  "docs/evidence/planning-evaluation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    schemaValid: valid,
    total: rows.length,
    exactIntentMatches: report.exactIntentMatches,
    acceptance: report.acceptance,
    latency: report.latency,
  }),
);
if (!report.acceptance.passed || externalHosts.length) process.exitCode = 1;
