import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { createStore } from "../server/store.mjs";
import {
  configureBrowserOperations,
  signBrowserGrant,
} from "../server/browser-operations.mjs";
test("browser operation grants expire, restrict the field and origin, and cannot duplicate writes", async (t) => {
  const original = {
    secret: process.env.AUTH0_SESSION_SECRET,
    origin: process.env.PUBLIC_ORIGIN,
  };
  process.env.AUTH0_SESSION_SECRET = randomUUID();
  const store = createStore(":memory:"),
    owner = randomUUID(),
    runId = randomUUID(),
    sessionId = randomUUID(),
    ticketId = store.get(owner).tickets[0].id;
  store.mutate(owner, (s) =>
    s.runs.push({
      id: runId,
      status: "running",
      plan: { actions: ["tag"], ticketIds: [ticketId] },
    }),
  );
  const app = express();
  configureBrowserOperations(app, store);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  process.env.PUBLIC_ORIGIN = origin;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.close();
    for (const [key, value] of [
      ["AUTH0_SESSION_SECRET", original.secret],
      ["PUBLIC_ORIGIN", original.origin],
    ])
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  });
  const token = signBrowserGrant({
      owner,
      runId,
      ticketId,
      sessionId,
      expires: Date.now() + 60000,
    }),
    cookie = `vox_browser=${token}`;
  const send = (note, extra = {}) =>
    fetch(origin + "/browser/operations", {
      method: "POST",
      headers: {
        cookie,
        origin,
        "content-type": "application/x-www-form-urlencoded",
        ...extra,
      },
      body: new URLSearchParams({ note }),
    });
  assert.equal((await fetch(origin + "/browser/operations")).status, 403);
  assert.equal(
    (
      await fetch(origin + "/browser/operations", {
        headers: { cookie: cookie + "tampered" },
      })
    ).status,
    403,
  );
  const expired = signBrowserGrant({
    owner,
    runId,
    ticketId,
    sessionId,
    expires: Date.now() - 1,
  });
  assert.equal(
    (
      await fetch(origin + "/browser/operations", {
        headers: { cookie: `vox_browser=${expired}` },
      })
    ).status,
    403,
  );
  assert.equal((await send("Anything else")).status, 422);
  const note = `Reviewed by VOX run ${runId.slice(0, 8)}. Human approval is required before any reply.`;
  assert.equal(
    (await send(note, { origin: "https://untrusted.example" })).status,
    403,
  );
  assert.equal((await send(note)).status, 200);
  assert.equal((await send(note)).status, 200);
  assert.equal(store.get(owner).ledger.length, 1);
  assert.equal(store.get(owner).receipts.length, 1);
  assert.equal(store.get(owner).tickets[0].browserNote, note);
  assert.equal(store.get(owner).runs[0].browserOperation.sessionId, sessionId);
  store.mutate(owner, (s) => (s.runs[0].status = "completed"));
  assert.equal((await send(note)).status, 403);
});
