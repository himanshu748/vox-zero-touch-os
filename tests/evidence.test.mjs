import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { intentSchema } from "../shared/contracts.mjs";
import { distribution } from "../scripts/evaluation-utils.mjs";

const json = (path) => JSON.parse(readFileSync(path, "utf8"));
const hash = (data) => createHash("sha256").update(data).digest("hex");

test("published planning figures derive from frozen commands and saved valid model outputs", () => {
  const fixturePath = "scripts/planning-fixture.json",
    fixture = json(fixturePath);
  for (const path of [
    "docs/evidence/planning-evaluation.json",
    "docs/evidence/planning-evaluation-baseline.json",
  ]) {
    const report = json(path);
    assert.equal(report.fixtureSha256, hash(readFileSync(fixturePath)));
    assert.equal(report.total, 30);
    assert.equal(new Set(report.rows.map((r) => r.id)).size, 30);
    let valid = 0,
      exact = 0;
    for (const [i, row] of report.rows.entries()) {
      assert.equal(row.command, fixture.cases[i].command);
      const parsed = intentSchema.safeParse(row.output);
      assert.equal(row.schemaValid, parsed.success);
      if (!parsed.success) continue;
      valid++;
      const sameActions =
        JSON.stringify([...new Set(parsed.data.actions)].sort()) ===
        JSON.stringify([...row.actions].sort());
      const match =
        sameActions &&
        (row.draftLimit === undefined ||
          row.draftLimit === parsed.data.draftLimit);
      assert.equal(row.exactIntentMatch, match);
      exact += Number(match);
    }
    assert.equal(report.schemaValid, valid);
    assert.equal(report.exactIntentMatches, exact);
    assert.equal(report.schemaValidRate, valid / 30);
    assert.deepEqual(report.network.externalHosts, []);
  }
});

test("ten-run percentiles and frozen queue hashes agree with complete raw receipts", () => {
  const report = json("docs/evidence/local-performance.json");
  assert.equal(report.runs.length, 10);
  const receipts = report.runs.map((row) => {
    const run = json(row.file);
    assert.equal(
      run.dataset.sha256,
      hash(JSON.stringify(json(run.dataset.file))),
    );
    assert.equal(run.result.triaged, 24);
    assert.equal(run.result.drafts, 2);
    assert.equal(run.result.sent, 1);
    assert.equal(run.result.rejected, 1);
    assert.equal(run.orchestration.temporal, "COMPLETED");
    assert.equal(run.orchestration.mastra, "success");
    assert.deepEqual(run.network.externalHosts, []);
    assert.equal(run.manualBaseline.timeSavedMinutes, null);
    return run;
  });
  assert.deepEqual(
    report.textToPlan,
    distribution(receipts.map((r) => r.timing.planningAndNormalizationMs)),
  );
  assert.deepEqual(
    report.preparationUntilTwoDecisions,
    distribution(receipts.map((r) => r.timing.preparationUntilTwoDecisionsMs)),
  );
  const original = json("docs/evidence/lazy-payoff.json");
  assert.equal(
    original.dataset.sha256,
    hash(JSON.stringify(json(original.dataset.file))),
  );
});
