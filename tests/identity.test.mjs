import test from "node:test";
import assert from "node:assert/strict";
import { authenticatedOwner, requireIdentity } from "../server/identity.mjs";
test("hosted live-provider identity requires the authorized verified account", (t) => {
  const previous = { ...process.env };
  process.env.AUTH0_ALLOWED_EMAIL = "owner@example.test";
  process.env.AUTH0_ISSUER_BASE_URL = "https://tenant.example.test";
  process.env.AUTH0_REQUIRE_APPROVAL_LOGIN = "true";
  t.after(() => {
    for (const key of [
      "AUTH0_ALLOWED_EMAIL",
      "AUTH0_ISSUER_BASE_URL",
      "AUTH0_REQUIRE_APPROVAL_LOGIN",
    ])
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
  });
  const request = (email, verified) => ({
    oidc: {
      isAuthenticated: () => true,
      user: { sub: "id-1", email, email_verified: verified },
    },
  });
  assert.equal(authenticatedOwner(request("foreign@example.test", true)), null);
  assert.equal(authenticatedOwner(request("owner@example.test", false)), null);
  assert.match(
    authenticatedOwner(request("owner@example.test", true)),
    /^auth0:[a-f0-9]{64}$/,
  );
  let status;
  requireIdentity(
    {},
    {
      status(value) {
        status = value;
        return this;
      },
      json() {},
    },
    () => assert.fail("guest must be rejected"),
  );
  assert.equal(status, 401);
});
