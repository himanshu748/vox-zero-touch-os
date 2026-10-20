import { spawn } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { openSync, closeSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { lookup } from "node:dns/promises";
import { Connection } from "@temporalio/client";
let active;
export const temporalLimits = {
  "history.cacheSizeBasedLimit": true,
  "history.hostLevelCacheMaxSizeBytes": 8388608,
  "history.eventsCacheMaxSizeBytes": 1048576,
  "history.eventsHostLevelCacheMaxSizeBytes": 4194304,
  "history.shardIOTimeout": "30s",
  "history.shardIOConcurrency": 4,
  "matching.numTaskqueueWritePartitions": 1,
  "matching.numTaskqueueReadPartitions": 1,
  "worker.taskQueueScannerEnabled": false,
  "worker.historyScannerEnabled": false,
  "worker.perNamespaceWorkerCount": 0,
  "worker.enableScheduler": false,
  "system.enableParentClosePolicyWorker": false,
};

export function selfHostedConfig(uri, caFile, dynamicFile, hostAddress) {
  const u = new URL(uri);
  if (
    u.username !== "vox_temporal" ||
    !u.hostname.endsWith(".tsdb.cloud.timescale.com") ||
    u.pathname !== "/tsdb"
  )
    throw new Error(
      "Self-hosted Temporal requires its restricted VOX PostgreSQL connection.",
    );
  const sql = (schema) => ({
    sql: {
      pluginName: "postgres12",
      databaseName: "tsdb",
      connectAddr: `${u.hostname}:${u.port}`,
      connectProtocol: "tcp",
      user: "vox_temporal",
      password: decodeURIComponent(u.password),
      connectAttributes: {
        search_path: `${schema},public`,
        application_name: `vox-temporal-${schema}`,
        connect_timeout: "5",
        binary_parameters: "yes",
        disable_prepared_binary_result: "yes",
        ...(hostAddress ? { hostaddr: hostAddress } : {}),
      },
      maxConns: schema === "vox_temporal" ? 8 : 2,
      maxIdleConns: 2,
      maxConnLifetime: "5m",
      tls: {
        enabled: true,
        caFile,
        enableHostVerification: true,
        serverName: u.hostname,
      },
    },
  });
  return {
    log: { stdout: true, level: "error" },
    persistence: {
      defaultStore: "postgres-default",
      visibilityStore: "postgres-visibility",
      numHistoryShards: 1,
      datastores: {
        "postgres-default": sql("vox_temporal"),
        "postgres-visibility": sql("vox_visibility"),
      },
    },
    global: {
      membership: { maxJoinDuration: "30s", broadcastAddress: "127.0.0.1" },
    },
    services: Object.fromEntries(
      [
        ["frontend", 7233, 6933],
        ["history", 7234, 6934],
        ["matching", 7235, 6935],
        ["worker", 7239, 6939],
      ].map(([name, grpcPort, membershipPort]) => [
        name,
        { rpc: { grpcPort, membershipPort, bindOnLocalHost: true } },
      ]),
    ),
    clusterMetadata: {
      enableGlobalNamespace: false,
      failoverVersionIncrement: 10,
      masterClusterName: "active",
      currentClusterName: "active",
      clusterInformation: {
        active: {
          enabled: true,
          initialFailoverVersion: 1,
          rpcName: "frontend",
          rpcAddress: "127.0.0.1:7233",
        },
      },
    },
    dcRedirectionPolicy: { policy: "noop" },
    archival: {
      history: { state: "disabled", enableRead: false },
      visibility: { state: "disabled", enableRead: false },
    },
    dynamicConfigClient: { filepath: dynamicFile, pollInterval: "30s" },
  };
}
export async function startSelfHostedTemporal() {
  if (process.env.TEMPORAL_SELF_HOSTED !== "true") return null;
  if (!process.env.TEMPORAL_POSTGRES_URI || !process.env.TIGER_CA_PEM)
    throw new Error(
      "TEMPORAL_POSTGRES_URI and TIGER_CA_PEM are required for durable self-hosting.",
    );
  const binary = resolve(
    process.env.TEMPORAL_SERVER_BINARY || ".temporal-bin/temporal-server",
  );
  if (!existsSync(binary))
    throw new Error(
      "Pinned Temporal server binary is missing. Run the build installer.",
    );
  const directory = await mkdtemp(join(tmpdir(), "vox-temporal-"));
  const caFile = join(directory, "ca.pem"),
    dynamicFile = join(directory, "dynamic.yaml"),
    configFile = join(directory, "server.yaml");
  await writeFile(caFile, process.env.TIGER_CA_PEM, { mode: 0o600 });
  await writeFile(
    dynamicFile,
    JSON.stringify(
      Object.fromEntries(
        Object.entries(temporalLimits).map(([k, v]) => [k, [{ value: v }]]),
      ),
    ),
    { mode: 0o600 },
  );
  await writeFile(
    configFile,
    JSON.stringify(
      selfHostedConfig(
        process.env.TEMPORAL_POSTGRES_URI,
        caFile,
        dynamicFile,
        // The vendor macOS build uses pure-Go DNS. Resolve via the OS while
        // retaining the original host for full certificate verification.
        process.platform === "darwin"
          ? (
              await lookup(
                new URL(process.env.TEMPORAL_POSTGRES_URI).hostname,
                { family: 4 },
              )
            ).address
          : undefined,
      ),
    ),
    { mode: 0o600 },
  );
  const logFile =
    process.env.TEMPORAL_LOG_FILE || join(directory, "server.log");
  const log = openSync(logFile, "a", 0o600);
  // Full Temporal Server. All RPC ports bind only to loopback; Node is the public service.
  const child = spawn(
    binary,
    ["--config-file", configFile, "--allow-no-auth", "start"],
    {
      env: { GOMEMLIMIT: "128MiB", GOMAXPROCS: "1" },
      stdio: ["ignore", log, log],
    },
  );
  closeSync(log);
  let stopping = false,
    exited = false;
  const finished = new Promise((resolve) => {
    child.once("exit", (code) => {
      exited = true;
      resolve(code);
    });
    child.once("error", () => {
      exited = true;
      resolve(1);
    });
  });
  child.once("exit", () => {
    if (!stopping && active) {
      console.error(
        "The private Temporal server stopped; VOX is shutting down.",
      );
      process.kill(process.pid, "SIGTERM");
    }
  });
  let connection;
  try {
    const deadline = Date.now() + 120000;
    while (Date.now() < deadline && !exited) {
      try {
        connection = await Connection.connect({
          address: "127.0.0.1:7233",
          connectTimeout: 2000,
        });
        await connection.ensureConnected();
        break;
      } catch {
        await connection?.close().catch(() => {});
        connection = null;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    if (!connection)
      throw new Error("The private Temporal server did not become ready.");
    const namespace = process.env.TEMPORAL_NAMESPACE || "default";
    try {
      await connection.workflowService.describeNamespace({ namespace });
    } catch (error) {
      if (error.code !== 5) throw error;
      await connection.workflowService.registerNamespace({
        namespace,
        workflowExecutionRetentionPeriod: { seconds: 604800 },
      });
    }
    process.env.TEMPORAL_ADDRESS = "127.0.0.1:7233";
  } catch {
    stopping = true;
    child.kill("SIGTERM");
    await finished;
    throw new Error(
      "Durable Temporal startup failed; VOX did not start. Private diagnostics: " +
        logFile,
    );
  } finally {
    await connection?.close();
  }
  active = {
    pid: child.pid,
    async close() {
      stopping = true;
      child.kill("SIGTERM");
      const timer = setTimeout(() => child.kill("SIGKILL"), 15000);
      await finished;
      clearTimeout(timer);
      await rm(directory, { recursive: true, force: true });
    },
  };
  process.once("exit", () => {
    if (!exited) child.kill("SIGTERM");
  });
  return active;
}
export async function stopSelfHostedTemporal() {
  const current = active;
  active = null;
  await current?.close();
}
