import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { isLocalModelMode, assertLoopbackURL } from "./model-mode.mjs";

// Temporal owns durable scheduling/history. Mastra owns the validated stage graph.
// Only ids go into Temporal payloads; ticket text stays in VOX's operational store.
export async function createTemporalRuntime({ store, execute, event }) {
  const address = process.env.TEMPORAL_ADDRESS;
  if (!address) return null;
  if (isLocalModelMode()) assertLoopbackURL(`http://${address}`);
  const [
    { Client, Connection, WorkflowExecutionAlreadyStartedError },
    { Worker, NativeConnection, bundleWorkflowCode },
    { Context },
  ] = await Promise.all([
    import("@temporalio/client"),
    import("@temporalio/worker"),
    import("@temporalio/activity"),
  ]);
  const namespace = process.env.TEMPORAL_NAMESPACE || "default";
  const taskQueue = process.env.TEMPORAL_TASK_QUEUE || "vox-support";
  const options = {
    address,
    ...(!isLocalModelMode() &&
    process.env.TEMPORAL_SELF_HOSTED !== "true" &&
    process.env.TEMPORAL_API_KEY
      ? { tls: true, apiKey: process.env.TEMPORAL_API_KEY }
      : {}),
  };
  const connection = await Connection.connect(options);
  const native = await NativeConnection.connect(options);
  const client = new Client({ connection, namespace });
  const bundlePath = fileURLToPath(
    new URL("../dist/server/temporal-workflow.js", import.meta.url),
  );
  const workflowBundle = existsSync(bundlePath)
    ? { codePath: bundlePath }
    : await bundleWorkflowCode({
        workflowsPath: fileURLToPath(
          new URL("./temporal-workflow.cjs", import.meta.url),
        ),
      });
  const worker = await Worker.create({
    connection: native,
    namespace,
    taskQueue,
    workflowBundle,
    maxCachedWorkflows: 0,
    maxConcurrentWorkflowTaskExecutions: 1,
    maxConcurrentActivityTaskExecutions: 1,
    maxConcurrentWorkflowTaskPolls: 1,
    maxConcurrentActivityTaskPolls: 1,
    activities: {
      async executePipeline({ owner, id }) {
        const context = Context.current();
        const timer = setInterval(() => context.heartbeat({ runId: id }), 5000);
        try {
          const run = store.get(owner).runs.find((item) => item.id === id);
          if (!run) return { status: "missing" };
          if (run.injectFailure && !run.temporalFaultInjected) {
            store.mutate(owner, (state) => {
              const current = state.runs.find((item) => item.id === id);
              current.temporalFaultInjected = true;
              event(
                current,
                "Temporal retry demonstration",
                "Interrupted before any pipeline activity. Temporal retries from recorded event history.",
                "retry",
              );
            });
            await store.flush?.();
            throw new Error("Recoverable pre-write Temporal interruption");
          }
          await execute(owner, id);
          await store.flush?.();
          return {
            status:
              store.get(owner).runs.find((item) => item.id === id)?.status ||
              "missing",
          };
        } finally {
          clearInterval(timer);
        }
      },
    },
  });
  const running = worker.run();
  running.catch((error) =>
    console.error("Temporal worker stopped:", error.name),
  );
  return {
    async start(owner, id) {
      const run = store.get(owner).runs.find((item) => item.id === id);
      const workflowId = run.temporal?.workflowId || `vox-${id}`;
      try {
        const handle = await client.workflow.start("voxWorkflow", {
          workflowId,
          taskQueue,
          args: [{ owner, id }],
        });
        store.mutate(owner, (state) => {
          state.runs.find((item) => item.id === id).temporal = {
            workflowId,
            runId: handle.firstExecutionRunId,
            namespace,
            status: "running",
          };
        });
      } catch (error) {
        if (!(error instanceof WorkflowExecutionAlreadyStartedError))
          throw error;
        await client.workflow.getHandle(workflowId).signal("ownerDecision");
      }
      await store.flush?.();
    },
    async history(owner, id) {
      const run = store.get(owner).runs.find((item) => item.id === id);
      if (!run?.temporal) return null;
      const handle = client.workflow.getHandle(run.temporal.workflowId);
      const description = await handle.describe();
      const history = await handle.fetchHistory();
      return {
        workflowId: run.temporal.workflowId,
        runId: description.runId,
        namespace,
        status: description.status.name,
        events: history.events,
      };
    },
    async close() {
      worker.shutdown();
      await running;
      await native.close();
      await connection.close();
    },
  };
}
