import { randomUUID } from "node:crypto";
// Reserve before a billable request, persist the result before progressing.
// An uncertain request is never automatically repeated after a crash or timeout.
export async function providerTask(store, owner, runId, key, limit, task) {
  const current = () => store.get(owner).runs.find((run) => run.id === runId);
  const saved = current()?.providerTasks?.[key];
  if (saved?.status === "completed") return saved.result;
  if (saved)
    throw new Error(
      "This provider request already started without a saved result. Automatic replay is blocked.",
    );
  if (current()?.status !== "running")
    throw new Error("The workflow is no longer running.");
  store.mutate(owner, (state) => {
    const run = state.runs.find((item) => item.id === runId);
    const provider = key.split(":")[0];
    const attempts = Object.keys(run.providerTasks || {}).filter((item) =>
      item.startsWith(`${provider}:`),
    ).length;
    if (attempts >= limit)
      throw new Error("The approved provider request ceiling was reached.");
    (run.providerTasks ||= {})[key] = {
      status: "started",
      at: new Date().toISOString(),
    };
  });
  await store.flush?.();
  try {
    const result = await task();
    if (!result)
      throw new Error("The approved provider is no longer configured.");
    store.mutate(owner, (state) => {
      const run = state.runs.find((item) => item.id === runId);
      run.providerTasks[key] = {
        status: "completed",
        result,
        at: new Date().toISOString(),
      };
      if (result.receipt)
        state.receipts.push({ id: randomUUID(), runId, ...result.receipt });
    });
    await store.flush?.();
    return result;
  } catch (error) {
    store.mutate(owner, (state) => {
      const run = state.runs.find((item) => item.id === runId);
      if (run?.providerTasks?.[key]?.status === "started")
        run.providerTasks[key].status = "uncertain";
    });
    await store.flush?.();
    throw error;
  }
}
