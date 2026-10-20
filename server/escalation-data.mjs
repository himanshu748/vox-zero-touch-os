// Authored synthetic scenarios, not customer histories or observed outcomes.
// Features: age in hours, hours until response deadline, incident, reported production/team impact.
// Labels are authored escalation decisions. The held-out rows are never uploaded as training labels.
export const escalationData = {
  version: "vox-synthetic-escalation-v1",
  featureNames: ["age_hours", "sla_hours", "incident", "production_impact"],
  provenance:
    "Authored synthetic support scenarios; estimates are illustrative and require human review.",
  train: [
    [1, 48, 0, 0, 0],
    [2, 36, 0, 0, 0],
    [4, 24, 0, 0, 0],
    [8, 40, 0, 0, 0],
    [3, 12, 0, 0, 0],
    [1, 16, 0, 1, 0],
    [2, 8, 0, 0, 0],
    [4, 6, 0, 0, 0],
    [2, 2, 0, 1, 1],
    [3, 1, 0, 1, 1],
    [4, 3, 1, 1, 1],
    [2, 4, 1, 1, 1],
    [6, 2, 1, 0, 1],
    [8, 1, 0, 0, 1],
    [12, 4, 0, 1, 1],
    [10, 2, 0, 0, 1],
    [2, 30, 1, 0, 0],
    [1, 24, 1, 0, 0],
    [3, 18, 1, 0, 0],
    [6, 20, 0, 1, 0],
    [12, 6, 1, 0, 1],
    [16, 8, 0, 1, 1],
    [20, 12, 1, 1, 1],
    [24, 16, 0, 1, 1],
    [18, 24, 0, 0, 0],
    [24, 30, 0, 0, 0],
    [30, 20, 0, 0, 1],
    [36, 12, 0, 0, 1],
    [1, 1, 0, 0, 0],
    [2, 3, 0, 0, 0],
    [4, 8, 1, 0, 0],
    [3, 10, 0, 1, 0],
    [9, 4, 0, 0, 1],
    [7, 5, 0, 1, 1],
    [5, 7, 1, 1, 1],
    [8, 8, 1, 1, 1],
    [10, 18, 0, 0, 0],
    [14, 32, 1, 0, 0],
    [20, 36, 0, 0, 0],
    [4, 18, 0, 1, 0],
    [28, 4, 1, 0, 1],
    [32, 6, 0, 1, 1],
    [16, 2, 0, 0, 1],
    [10, -1, 0, 0, 1],
    [1, -2, 1, 1, 1],
    [6, -4, 0, 0, 1],
    [2, 40, 0, 1, 0],
    [12, 48, 1, 0, 0],
  ],
  heldOut: [
    [2, 44, 0, 0, 0],
    [5, 26, 0, 0, 0],
    [3, 5, 1, 1, 1],
    [5, 2, 0, 1, 1],
    [11, 3, 0, 0, 1],
    [1, 20, 1, 0, 0],
    [15, 7, 0, 1, 1],
    [4, 12, 0, 1, 0],
    [22, 32, 0, 0, 0],
    [31, 16, 0, 0, 1],
    [1, 3, 0, 0, 0],
    [7, 4, 1, 0, 1],
    [9, 9, 1, 1, 1],
    [8, 28, 0, 0, 0],
    [2, -1, 0, 0, 1],
    [18, 22, 1, 0, 0],
  ],
};

export function ticketFeatures(ticket, now = Date.now()) {
  return [
    Math.max(0, Math.min(72, (now - new Date(ticket.createdAt)) / 3600000)),
    Math.max(-24, Math.min(72, (new Date(ticket.slaAt) - now) / 3600000)),
    ticket.category === "incident" ? 1 : 0,
    /production|entire team|locked out|cannot access/i.test(ticket.body)
      ? 1
      : 0,
  ].map((value) => {
    if (!Number.isFinite(value)) throw new Error("Invalid ticket features.");
    return Number(value.toFixed(2));
  });
}
