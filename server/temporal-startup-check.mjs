import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

// Run before HTTP starts. This uses the actual workflow but no application data
// or provider calls, and keeps an unhealthy replacement out of service.
export async function verifySelfHostedTemporal() {
  if (process.env.TEMPORAL_SELF_HOSTED !== "true") return;
  const [{ Client, Connection }, { NativeConnection, Worker }] =
    await Promise.all([
      import("@temporalio/client"),
      import("@temporalio/worker"),
    ]);
  const address = "127.0.0.1:7233";
  const namespace = process.env.TEMPORAL_NAMESPACE || "default";
  const id = randomUUID();
  const taskQueue = `vox-startup-${id}`;
  const connection = await Connection.connect({ address });
  const native = await NativeConnection.connect({ address });
  let worker,
    running,
    handle,
    calls = 0,
    stage = "worker";
  try {
    worker = await Worker.create({
      connection: native,
      namespace,
      taskQueue,
      workflowBundle: {
        codePath: fileURLToPath(
          new URL("../dist/server/temporal-workflow.js", import.meta.url),
        ),
      },
      maxCachedWorkflows: 0,
      maxConcurrentWorkflowTaskExecutions: 1,
      maxConcurrentActivityTaskExecutions: 1,
      maxConcurrentWorkflowTaskPolls: 1,
      maxConcurrentActivityTaskPolls: 1,
      activities: {
        executePipeline() {
          calls++;
          if (calls === 1) throw new Error("Recoverable startup probe");
          return { status: calls === 2 ? "awaiting_approval" : "completed" };
        },
      },
    });
    running = worker.run();
    // Attach immediately so worker failure is never an unhandled rejection.
    running.catch(() => {});
    const client = new Client({ connection, namespace });
    stage = "start";
    await connection.withDeadline(Date.now() + 60000, async () => {
      handle = await client.workflow.start("voxWorkflow", {
        workflowId: `vox-startup-${id}`,
        taskQueue,
        args: [{ owner: "startup-probe", id }],
        workflowExecutionTimeout: "60 seconds",
      });
      const deadline = Date.now() + 45000;
      stage = "approval-gate";
      let gated = false;
      while (Date.now() < deadline) {
        const history = await handle.fetchHistory();
        const events = history.events || [];
        gated =
          calls === 2 &&
          events.some((e) => e.activityTaskCompletedEventAttributes) &&
          Boolean(events.at(-1)?.workflowTaskCompletedEventAttributes);
        if (gated) break;
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      if (!gated) throw new Error("Workflow did not persist its approval gate");
      stage = "decision-signal";
      await handle.signal("ownerDecision");
      const result = await handle.result();
      if (calls !== 3 || result.status !== "completed")
        throw new Error("Workflow retry and decision check failed");
      const history = await handle.fetchHistory();
      console.log(
        JSON.stringify({
          temporalStartupCheck: "passed",
          activityAttempts: calls,
          historyEvents: history.events.length,
          retried: true,
          decisionResumed: true,
          providerCalls: 0,
        }),
      );
    });
  } catch {
    console.error(
      JSON.stringify({
        temporalStartupCheck: "failed",
        stage,
        activityAttempts: calls,
        providerCalls: 0,
      }),
    );
    await connection
      .withDeadline(Date.now() + 5000, () =>
        handle?.terminate("Startup check failed").catch(() => {}),
      )
      .catch(() => {});
    throw new Error(
      "Temporal startup workflow failed; HTTP service was not started.",
    );
  } finally {
    worker?.shutdown();
    await running?.catch(() => {});
    await native.close();
    await connection.close();
  }
}
