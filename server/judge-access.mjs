const budgetOwner = "internal:judge-allowance-v1";
export const JUDGE_LIMITS = Object.freeze({
  // The owner permits repeat requests within an active pass. Null means no
  // per-pass request ceiling; counters, expiry and provider reservations remain.
  plan: null,
  transcribe: null,
  speech: null,
});
const failure = (message, status = 429) =>
  Object.assign(new Error(message), { status, publicMessage: true });
export function judgeCapacity() {
  // Eight sessions is the approved ceiling, even if a configuration value is larger.
  return Math.min(
    8,
    Math.max(
      0,
      Number.parseInt(process.env.VOX_JUDGE_LIVE_SESSIONS || "0", 10) || 0,
    ),
  );
}
function claims(store) {
  return store.get(budgetOwner).judgeClaims || {};
}
export function judgeStatus(store, owner, now = Date.now()) {
  const all = claims(store),
    pass = all[owner];
  const chosen = store.get(owner).judgeMode;
  const mode =
    chosen === "sandbox"
      ? "sandbox"
      : pass
        ? Date.parse(pass.expiresAt) > now
          ? "live"
          : "expired"
        : "unclaimed";
  return {
    mode,
    canDecide: mode !== "unclaimed",
    remainingSessions: Math.max(0, judgeCapacity() - Object.keys(all).length),
    limits: JUDGE_LIMITS,
    used: pass?.used || { plan: 0, transcribe: 0, speech: 0 },
    expiresAt: pass?.expiresAt || null,
    available: judgeCapacity() > Object.keys(all).length && !pass,
  };
}
export async function activateJudge(store, owner, mode, now = Date.now()) {
  if (!["live", "sandbox"].includes(mode))
    throw failure("Choose a supported judge mode.", 422);
  if (!owner.startsWith("judge:"))
    throw failure("This is not a judge workspace.", 403);
  if (
    store
      .get(owner)
      .runs.some((run) => ["running", "awaiting_approval"].includes(run.status))
  )
    throw failure(
      "Finish the active run and its decisions before switching modes.",
      409,
    );
  if (mode === "live") {
    store.mutate(budgetOwner, (state) => {
      const all = (state.judgeClaims ||= {});
      if (all[owner])
        throw failure(
          "This browser has already used its live pass. Its saved work remains available; you can also use the provider-free sandbox.",
          409,
        );
      if (Object.keys(all).length >= judgeCapacity())
        throw failure(
          "The live judge allowance is fully reserved. The provider-free sandbox is still available.",
        );
      all[owner] = {
        claimedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 86400000).toISOString(),
        used: { plan: 0, transcribe: 0, speech: 0 },
      };
    });
  }
  store.mutate(owner, (state) => {
    state.judgeMode = mode;
  });
  await store.flush?.();
  return judgeStatus(store, owner, now);
}
export async function reserveJudgeRequest(store, owner, kind) {
  if (!Object.hasOwn(JUDGE_LIMITS, kind))
    throw failure("Unsupported judge operation.", 403);
  if (judgeStatus(store, owner).mode !== "live")
    throw failure("Activate a live judge session before using providers.", 403);
  store.mutate(budgetOwner, (state) => {
    const pass = state.judgeClaims?.[owner];
    if (!pass) throw failure("This live session is unavailable.", 403);
    pass.used[kind] = (pass.used[kind] || 0) + 1;
  });
  // A reservation must survive restart before any provider request starts.
  // Failed/uncertain attempts remain counted; reset never erases usage.
  await store.flush?.();
}
