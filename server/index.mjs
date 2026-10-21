import { resolve } from "node:path";
import express from "express";
import { createStore } from "./store.mjs";
import { createApp } from "./app.mjs";
import { flushTelemetry } from "./telemetry.mjs";
import { connectAtlas } from "./atlas.mjs";
import { closeKnowledge } from "./knowledge-retrieval.mjs";
import { stopSelfHostedTemporal } from "./temporal-self-host.mjs";
import { stopLocalTemporal } from "./local-runtime.mjs";
const store = createStore(
  resolve(process.env.DATA_DIR || "data", "vox.sqlite"),
);
const atlas = await connectAtlas(store);
const { app, engine } = createApp(store);
await engine.ready;
let vite;
if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist"));
  app.get("*", (_, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 4310);
const server = app.listen(port, process.env.HOST || "127.0.0.1", () => {
  console.log(`VOX is ready at http://localhost:${port}`);
  engine.resumeAll();
});
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const stopped = new Promise((resolve) => server.close(resolve));
  await engine.close();
  await stopSelfHostedTemporal();
  await stopLocalTemporal();
  await closeKnowledge();
  await vite?.close();
  await flushTelemetry();
  await atlas?.close();
  server.closeAllConnections();
  await stopped;
  store.close();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
