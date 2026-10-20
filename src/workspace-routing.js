const VIEWS = new Set([
  "overview",
  "tickets",
  "approvals",
  "history",
  "operations",
  "evidence",
]);
export function readWorkspaceRoute(hash = window.location.hash) {
  const [candidate, search = ""] = hash.replace(/^#/, "").split("?");
  return {
    view: VIEWS.has(candidate) ? candidate : "overview",
    runId: new URLSearchParams(search).get("run"),
  };
}
export function workspaceHash(view, runId) {
  return `#${VIEWS.has(view) ? view : "overview"}${["operations", "approvals"].includes(view) && runId ? `?run=${encodeURIComponent(runId)}` : ""}`;
}
export function readableError(error) {
  const message = error?.message || "The request could not be completed.";
  try {
    const data = JSON.parse(message);
    if (typeof data.error === "string") return data.error;
  } catch {}
  if (/fetch|network|connection/i.test(message))
    return "The connection was interrupted. Your saved work is safe. Try again.";
  return message.length < 240
    ? message
    : "The response could not be validated. No new work was executed.";
}
