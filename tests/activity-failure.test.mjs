import test from "node:test";
import assert from "node:assert/strict";
import { activityFailure } from "../server/activity-failure.mjs";

test("activity failure exposes only safe categories, including nested SDK HTTP errors", () => {
  const upstreamText = "test-only sensitive response marker";
  const error = new Error(upstreamText, {
    cause: Object.assign(new Error(upstreamText), {
      statusCode: 429,
      responseBody: upstreamText,
      url: `https://example.com/${upstreamText}`,
    }),
  });
  const result = activityFailure(error);
  assert.equal(result.code, "provider_rate_limit");
  assert.equal(result.status, 429);
  assert(!JSON.stringify(result).includes(upstreamText));
  const cycle = new Error(upstreamText);
  cycle.cause = cycle;
  assert.equal(activityFailure(cycle).code, "activity_failed");
});

test("invalid model output stays blocked and provider access failures require configuration repair", () => {
  assert.equal(
    activityFailure(new SyntaxError("sensitive output")).code,
    "invalid_model_output",
  );
  assert.equal(
    activityFailure({ statusCode: 403, message: "secret" }).code,
    "provider_access",
  );
  assert.equal(
    activityFailure({ statusCode: 503 }).code,
    "provider_unavailable",
  );
});
