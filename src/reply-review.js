// Keep review navigation inside the current run. This never makes a decision.
export function replyReviewState(tickets, draftId) {
  const drafts = tickets.flatMap((ticket) =>
    ticket.drafts.map((draft) => ({ ...draft, ticket })),
  );
  const draft = drafts.find((item) => item.id === draftId);
  if (!draft) return null;
  const run = drafts.filter((item) => item.runId === draft.runId);
  return {
    draft,
    position: run.findIndex((item) => item.id === draftId) + 1,
    total: run.length,
    pending: run.filter((item) => item.status === "pending").length,
    nextId:
      run.find((item) => item.id !== draftId && item.status === "pending")
        ?.id || null,
  };
}

export function approvalExpiry(expiresAt, now = Date.now()) {
  const minutes = Math.ceil((Date.parse(expiresAt) - now) / 60000);
  if (!Number.isFinite(minutes)) return "Expiry unavailable";
  if (minutes <= 0) return "Approval expired";
  return minutes < 60
    ? `Expires in ${minutes} min`
    : `Expires in ${Math.ceil(minutes / 60)} h`;
}
