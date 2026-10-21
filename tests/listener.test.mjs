import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { listenServer } from "../server/listener.mjs";

test("startup resolves only after the HTTP listener can serve a request", async (t) => {
  const server = createServer((_, res) => res.end("ready"));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = await listenServer(server, 0, "127.0.0.1");
  const response = await fetch(`http://127.0.0.1:${address.port}`);
  assert.equal(await response.text(), "ready");
});

test("an occupied application port rejects startup instead of releasing a successful import", async (t) => {
  const holder = createServer(),
    candidate = createServer();
  t.after(() => new Promise((resolve) => holder.close(resolve)));
  const address = await listenServer(holder, 0, "127.0.0.1");
  await assert.rejects(listenServer(candidate, address.port, "127.0.0.1"), {
    code: "EADDRINUSE",
  });
  assert.equal(candidate.listening, false);
});
