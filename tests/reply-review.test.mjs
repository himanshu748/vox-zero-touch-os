import test from "node:test";
import assert from "node:assert/strict";
import { replyReviewState, approvalExpiry } from "../src/reply-review.js";
const tickets = [
  {
    id: "t1",
    drafts: [
      { id: "other", runId: "other-run", status: "pending" },
      { id: "a", runId: "run", status: "pending" },
    ],
  },
  { id: "t2", drafts: [{ id: "b", runId: "run", status: "pending" }] },
];
test("reply navigation stays within a run and never changes a decision", () => {
  const before = structuredClone(tickets);
  assert.equal(replyReviewState(tickets, "a").nextId, "b");
  assert.equal(replyReviewState(tickets, "a").total, 2);
  assert.deepEqual(tickets, before);
  assert.equal(replyReviewState(tickets, "missing"), null);
});
test("a saved decision advances only to a still-pending reply and stops at the last", () => {
  const saved = structuredClone(tickets);
  saved[0].drafts[1].status = "sent";
  assert.equal(replyReviewState(saved, "a").nextId, "b");
  assert.equal(replyReviewState(saved, "b").position, 2);
  assert.equal(replyReviewState(saved, "b").pending, 1);
  saved[1].drafts[0].status = "rejected";
  assert.equal(replyReviewState(saved, "b").nextId, null);
  assert.equal(replyReviewState(saved, "b").pending, 0);
  assert.equal(saved[0].drafts[0].status, "pending");
});
test("expiry copy handles upcoming, expired and invalid times", () => {
  const now = Date.parse("2026-10-23T12:00:00Z");
  assert.equal(
    approvalExpiry("2026-10-23T12:25:00Z", now),
    "Expires in 25 min",
  );
  assert.equal(approvalExpiry("2026-10-23T14:00:00Z", now), "Expires in 2 h");
  assert.equal(approvalExpiry("2026-10-23T12:00:00Z", now), "Approval expired");
  assert.equal(approvalExpiry("invalid", now), "Expiry unavailable");
});
