import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { distribution } from "./evaluation-utils.mjs";

const directory = "docs/evidence/performance-runs";
await mkdir(directory, { recursive: true });
const startedAt = new Date().toISOString(),
  runs = [];
for (let n = 1; n <= 10; n++) {
  const output = `${directory}/run-${String(n).padStart(2, "0")}`;
  await promisify(execFile)(
    process.execPath,
    ["scripts/lazy-payoff.mjs", "--output-dir", output],
    {
      env: {
        PATH: process.env.PATH,
        TMPDIR: process.env.TMPDIR,
        VOX_MODEL_MODE: "local",
        ...(process.env.VOX_LOCAL_BASE_URL
          ? { VOX_LOCAL_BASE_URL: process.env.VOX_LOCAL_BASE_URL }
          : {}),
        ...(process.env.VOX_LOCAL_MODEL
          ? { VOX_LOCAL_MODEL: process.env.VOX_LOCAL_MODEL }
          : {}),
      },
      timeout: 900000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  const receipt = JSON.parse(
    await readFile(`${output}/lazy-payoff.json`, "utf8"),
  );
  if (
    receipt.status !== "completed" ||
    receipt.result.triaged !== 24 ||
    receipt.result.drafts !== 2 ||
    receipt.orchestration.temporal !== "COMPLETED" ||
    receipt.network.externalHosts.length
  )
    throw new Error(
      `Run ${n} did not satisfy the workflow boundary; inspect its receipt.`,
    );
  runs.push({ file: `${output}/lazy-payoff.json`, ...receipt });
  console.log(
    `Run ${n}/10: preparation ${receipt.timing.preparationUntilTwoDecisionsMs} ms`,
  );
}
const report = {
  schemaVersion: 1,
  startedAt,
  finishedAt: new Date().toISOString(),
  mode: "local text-to-plan and workflow; real Gemma, Temporal and Mastra",
  models: [...new Set(runs.flatMap((r) => r.models))],
  hardware: runs[0].hardware,
  samples: runs.length,
  completed: runs.filter((r) => r.status === "completed").length,
  method:
    "Nearest-rank percentiles; with n=10, p95 is the slowest observed sample. Sequential runs; no retry injection or cosmetic stage delays; startup measured separately. Model residency is recorded per run, not forced.",
  startup: distribution(runs.map((r) => r.timing.startupMs)),
  textToPlan: distribution(
    runs.map((r) => r.timing.planningAndNormalizationMs),
  ),
  preparationUntilTwoDecisions: distribution(
    runs.map((r) => r.timing.preparationUntilTwoDecisionsMs),
  ),
  applicationHttpHosts: [
    ...new Set(runs.flatMap((r) => r.network.applicationHttpHosts)),
  ],
  externalHosts: [...new Set(runs.flatMap((r) => r.network.externalHosts))],
  runs: runs.map((r) => ({
    file: r.file,
    modelLoadedAtStart: r.modelLoadedAtStart,
    timing: r.timing,
    result: r.result,
    orchestration: r.orchestration,
  })),
  voiceToPlan: {
    status: "not measured",
    reason:
      "Local mode intentionally disables cloud transcription and physical voice; no cloud credentials or quota were used.",
  },
  manualBaseline: {
    status: "not measured",
    manualMinutes: null,
    humanReviewMinutes: null,
    timeSavedMinutes: null,
  },
  limitations: [
    "Synthetic local workload, not hosted latency or an uptime guarantee.",
    "Scripted plan and draft decisions; elapsed human review time remains unmeasured.",
    "Original single-run lazy-payoff.json and its manual timing sheet input are preserved.",
  ],
};
await writeFile(
  "docs/evidence/local-performance.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    samples: report.samples,
    completed: report.completed,
    textToPlan: report.textToPlan,
    preparation: report.preparationUntilTwoDecisions,
  }),
);
