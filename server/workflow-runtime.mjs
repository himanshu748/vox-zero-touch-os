import { Mastra } from "@mastra/core/mastra";
import { createStep, createWorkflow } from "@mastra/core/workflows";
import { LibSQLStore } from "@mastra/libsql";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";

// No Mastra HTTP/admin server is exposed. Every invocation is owner-bound by VOX.
export function createWorkflowRuntime({
  store,
  applyActivity,
  event,
  summary,
  onFailure,
  delay,
}) {
  const contextSchema = z.object({ owner: z.string(), id: z.string() });
  const storage = new LibSQLStore({
    id: "vox-workflow-storage",
    url:
      store.path === ":memory:"
        ? ":memory:"
        : `file:${resolve(dirname(store.path), "mastra.sqlite")}`,
  });
  let closed = false;
  const active = new Map(),
    queued = new Set();
  const stages = ["inspect", "triage", "research", "tag", "draft", "brief"].map(
    (kind) =>
      createStep({
        id: kind,
        inputSchema: contextSchema,
        outputSchema: contextSchema,
        suspendSchema: z.object({ reason: z.string() }),
        resumeSchema: z.object({ approved: z.boolean() }),
        // Only the deliberate pre-write label fault retries automatically. Provider calls do not.
        retries: kind === "tag" ? 1 : 0,
        execute: async ({ inputData, suspend }) => {
          const completed = await applyActivity(
            inputData.owner,
            inputData.id,
            kind,
          );
          if (!completed)
            return await suspend({
              reason: closed
                ? "Worker checkpointed"
                : "Run stopped by its owner",
            });
          return inputData;
        },
      }),
  );
  const approvalGate = createStep({
    id: "approval-gate",
    inputSchema: contextSchema,
    outputSchema: contextSchema,
    suspendSchema: z.object({ reason: z.string(), pending: z.number() }),
    resumeSchema: z.object({ approved: z.boolean() }),
    execute: async ({ inputData, suspend }) => {
      const state = store.get(inputData.owner),
        run = state.runs.find((run) => run.id === inputData.id);
      const pending = summary(state, run).pending;
      if (pending)
        return await suspend({
          reason: "Individual reply decisions are required",
          pending,
        });
      return inputData;
    },
  });
  let definition = createWorkflow({
    id: "vox-support-v1",
    inputSchema: contextSchema,
    outputSchema: contextSchema,
    retryConfig: { attempts: 0, delay },
    options: { autoRestartActiveRuns: false },
  });
  for (const step of stages) definition = definition.then(step);
  const supportWorkflow = definition.then(approvalGate).commit();
  const mastra = new Mastra({
    workflows: { supportWorkflow },
    storage,
    logger: false,
  });
  const workflow = mastra.getWorkflow("supportWorkflow");

  async function drive(owner, id) {
    const previous = store.get(owner).runs.find((run) => run.id === id);
    if (!previous) return;
    const snapshot = previous.workflow?.runId
      ? await workflow.getWorkflowRunById(previous.workflow.runId)
      : null;
    if (snapshot?.status === "success") return;
    const resuming = snapshot?.status === "suspended";
    // After a crash/failure, a new Mastra attempt reuses VOX's atomic cursor and ledger.
    // Completed activities and completed model responses are skipped, never replayed blindly.
    const workflowRunId = resuming ? previous.workflow.runId : randomUUID();
    const handle = await workflow.createRun({
      runId: workflowRunId,
      resourceId: owner,
    });
    store.mutate(owner, (state) => {
      const run = state.runs.find((run) => run.id === id);
      run.workflow = {
        engine: "Mastra",
        workflowId: "vox-support-v1",
        runId: workflowRunId,
        attempt: resuming
          ? previous.workflow.attempt
          : (previous.workflow?.attempt || 0) + 1,
        status: "running",
      };
      event(
        run,
        resuming ? "Mastra workflow resumed" : "Mastra workflow started",
        "Named activities and the human approval gate are orchestrated by Mastra. Snapshots are stored in local libSQL.",
      );
    });
    const result = resuming
      ? await handle.resume({ resumeData: { approved: true } })
      : await handle.start({ inputData: { owner, id } });
    store.mutate(owner, (state) => {
      const run = state.runs.find((run) => run.id === id);
      if (run) run.workflow.status = result.status;
    });
    if (result.status === "failed") throw result.error;
  }
  function start(owner, id) {
    if (closed) return Promise.resolve();
    if (active.has(id)) {
      queued.add(id);
      return active.get(id);
    }
    const task = drive(owner, id)
      .catch((error) => onFailure(owner, id, error))
      .finally(() => {
        active.delete(id);
        if (queued.delete(id) && !closed) void start(owner, id);
      });
    active.set(id, task);
    return task;
  }
  return {
    start,
    async snapshot(runId) {
      return workflow.getWorkflowRunById(runId);
    },
    async close() {
      closed = true;
      await Promise.allSettled([...active.values()]);
      await storage.close();
    },
  };
}
