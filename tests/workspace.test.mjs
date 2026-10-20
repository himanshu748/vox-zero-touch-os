import test from "node:test";
import assert from "node:assert/strict";
import {
  readWorkspaceRoute,
  workspaceHash,
  readableError,
} from "../src/workspace-routing.js";
test("workspace routes preserve selected runs and reject unknown views", () => {
  assert.deepEqual(readWorkspaceRoute("#operations?run=run%2Fone"), {
    view: "operations",
    runId: "run/one",
  });
  assert.equal(
    workspaceHash("operations", "run/one"),
    "#operations?run=run%2Fone",
  );
  assert.equal(readWorkspaceRoute("#ticket-typo").view, "overview");
  assert.equal(workspaceHash("tickets", "abc"), "#tickets");
});
test("stream errors retain server explanations and network errors stay readable", () => {
  assert.equal(
    readableError(
      new Error('{"error":"This plan expired. Create a new preview."}'),
    ),
    "This plan expired. Create a new preview.",
  );
  assert.match(
    readableError(new Error("Failed to fetch")),
    /connection was interrupted/,
  );
  assert.equal(
    readableError(new Error("No tickets match this scope.")),
    "No tickets match this scope.",
  );
});
