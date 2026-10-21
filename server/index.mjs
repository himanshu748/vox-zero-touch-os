import { resolve } from "node:path";
import { createServer as createHttpServer } from "node:http";
import express from "express";
import { createStore } from "./store.mjs";
import { createApp } from "./app.mjs";
import { flushTelemetry } from "./telemetry.mjs";
import { connectAtlas } from "./atlas.mjs";
import { closeKnowledge } from "./knowledge-retrieval.mjs";
import { stopSelfHostedTemporal } from "./temporal-self-host.mjs";
import { stopLocalTemporal } from "./local-runtime.mjs";
import { listenServer } from "./listener.mjs";
const store = createStore(
  resolve(process.env.DATA_DIR || "data", "vox.sqlite"),
);
const atlas = await connectAtlas(store);
const { app, engine } = createApp(store);
await engine.ready;
const server = createHttpServer(app);
let vite;
if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist"));
  app.get("*", (_, res) => res.sendFile(resolve("dist/index.html")));
} else {
  const { createServer } = await import("vite");
  vite = await createServer({
    // Share VOX's HTTP listener instead of competing for Vite's default socket port.
    server: { middlewareMode: true, hmr: { server } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}
const port = Number(process.env.PORT || 4310);
let closing;
function closeResources() {
  return (closing ||= (async () => {
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
  })());
}
try {
  await listenServer(server, port, process.env.HOST || "127.0.0.1");
} catch (error) {
  await closeResources();
  throw error;
}
console.log(`VOX is ready at http://localhost:${port}`);
engine.resumeAll();
async function shutdown() {
  await closeResources();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
