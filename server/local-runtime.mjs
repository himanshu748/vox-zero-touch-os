import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { Connection } from "@temporalio/client";
import { localModelConfig, loopbackFetch } from "./model-mode.mjs";
let active;
export async function stopLocalTemporal() {
  await active?.close();
  active = null;
}

// This entry path never loads .env and never opens the hosted data directory.
export function configureLocalRuntime() {
  localModelConfig();
  process.env.DATA_DIR = resolve(
    process.env.VOX_LOCAL_DATA_DIR || "data/local",
  );
  process.env.HOST = "127.0.0.1";
  process.env.PORT = process.env.VOX_LOCAL_PORT || "4320";
  process.env.PUBLIC_ORIGIN = `http://127.0.0.1:${process.env.PORT}`;
  process.env.COOKIE_SECURE = "false";
  process.env.TEMPORAL_NAMESPACE = "vox-local";
  process.env.TEMPORAL_TASK_QUEUE = "vox-local-support";
  globalThis.fetch = loopbackFetch();
}

export async function startLocalTemporal({
  dataDir = process.env.DATA_DIR,
  port = Number(process.env.VOX_LOCAL_TEMPORAL_PORT || 17233),
} = {}) {
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Invalid local Temporal port.");
  const directory = resolve(dataDir || "data/local");
  await mkdir(directory, { recursive: true });
  const binary =
    process.env.VOX_TEMPORAL_CLI ||
    (existsSync(".temporal-bin/temporal")
      ? resolve(".temporal-bin/temporal")
      : "temporal");
  const child = spawn(
    binary,
    [
      "server",
      "start-dev",
      "--ip",
      "127.0.0.1",
      "--port",
      String(port),
      "--headless",
      "--namespace",
      "vox-local",
      "--db-filename",
      join(directory, "temporal.sqlite"),
      "--log-level",
      "error",
    ],
    {
      env: { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR },
      stdio: ["ignore", "ignore", "pipe"],
    },
  );
  let failure,
    exited = false,
    diagnostics = "";
  child.stderr.on("data", (chunk) => {
    diagnostics = (diagnostics + chunk).slice(-1000);
  });
  const stopped = new Promise((resolve) => {
    child.once("error", (error) => {
      failure = error;
      exited = true;
      resolve();
    });
    child.once("exit", () => {
      exited = true;
      resolve();
    });
  });
  const close = async () => {
    if (exited) return;
    child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 10000);
    await stopped;
    clearTimeout(timer);
  };
  let connection;
  try {
    const deadline = Date.now() + 30000;
    while (!exited && Date.now() < deadline) {
      try {
        connection = await Connection.connect({
          address: `127.0.0.1:${port}`,
          connectTimeout: 500,
        });
        await connection.workflowService.describeNamespace({
          namespace: "vox-local",
        });
        break;
      } catch {
        await connection?.close().catch(() => {});
        connection = null;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    if (exited || !connection)
      throw new Error(
        `Local Temporal could not start. Install Temporal CLI and use a free local port. ${failure?.code || diagnostics}`,
      );
    process.env.TEMPORAL_ADDRESS = `127.0.0.1:${port}`;
    active = { close, address: process.env.TEMPORAL_ADDRESS };
    return active;
  } catch (error) {
    await close();
    throw error;
  } finally {
    await connection?.close();
  }
}
