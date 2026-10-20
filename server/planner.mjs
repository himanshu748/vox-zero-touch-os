import { z } from "zod";
import { intentSchema } from "../shared/contracts.mjs";
import { browserEnabled } from "./browser-operations.mjs";
import { escalationEnabled } from "./escalation.mjs";
import { reviewEnabled } from "./draft-review.mjs";
import { knowledgeEnabled } from "./knowledge-retrieval.mjs";
import { normalizationEnabled } from "./intent-normalizer.mjs";
export { intentSchema };
export const commandSchema = z
  .object({
    command: z.string().trim().min(8).max(2000),
    scope: z.enum(["all", "urgent", "untriaged"]).default("all"),
    transcriptId: z.string().uuid().optional(),
  })
  .strict();
export function risk(ticket, now = Date.now()) {
  const remaining = (new Date(ticket.slaAt) - now) / 3600000;
  const incident = ticket.category === "incident";
  const impact = /production|entire team|locked out|cannot access/i.test(
    ticket.body,
  );
  const score = Math.min(
    99,
    Math.max(
      5,
      Math.round(
        15 +
          (remaining <= 4 ? 45 : remaining <= 8 ? 25 : 5) +
          (incident ? 22 : 0) +
          (impact ? 18 : 0),
      ),
    ),
  );
  const reasons = [
    remaining <= 8
      ? `SLA due in ${Math.max(0, Math.round(remaining))} hours`
      : "Within the response window",
  ];
  if (incident) reasons.push("Service incident reported");
  if (impact) reasons.push("Production or team-wide impact reported");
  return {
    score,
    priority: score >= 75 ? "urgent" : score >= 50 ? "high" : "normal",
    reasons,
  };
}
export function localIntent(command) {
  if (
    /\b(delete|refund|payment|export|shell|execute code|change password)\b/i.test(
      command,
    )
  )
    throw Object.assign(
      new Error(
        "This command is outside the sandbox allowlist. Try triage, research, draft replies, or add internal tags.",
      ),
      { status: 422 },
    );
  if (
    !/triage|prioriti[sz]e|tickets?|queue|repl(?:y|ies)|draft|tag|backlog|support/i.test(
      command,
    )
  )
    throw Object.assign(
      new Error(
        "The local planner handles support tickets. Try “Triage the queue and draft replies for urgent tickets.”",
      ),
      { status: 422 },
    );
  const actions = ["triage"];
  if (/research|fix|answer|draft|repl/i.test(command)) actions.push("research");
  if (/draft|repl/i.test(command)) actions.push("draft");
  if (/tag|label|urgent|prioriti/i.test(command)) actions.push("tag");
  return intentSchema.parse({
    actions,
    objective: "Get the support queue ready for a human review.",
  });
}
export function buildPlan(command, scope, intent, tickets, provider) {
  const liveResearch =
    Boolean(process.env.SERPAPI_API_KEY) && provider !== "local";
  const liveBrowser = browserEnabled() && provider !== "local";
  const livePrediction = escalationEnabled() && provider !== "local";
  const liveReview = reviewEnabled() && provider !== "local";
  const liveKnowledge = knowledgeEnabled() && provider !== "local";
  const chosen = tickets.filter((t) =>
    scope === "urgent"
      ? risk(t).score >= 75
      : scope === "untriaged"
        ? !t.triagedAt
        : true,
  );
  if (!chosen.length)
    throw Object.assign(
      new Error(
        "There are no tickets in this scope. Choose all pending tickets or reset the workspace.",
      ),
      { status: 422 },
    );
  const actions = [...new Set(intent.actions)];
  if (actions.includes("draft") && !actions.includes("research"))
    actions.unshift("research");
  if (!actions.includes("triage")) actions.unshift("triage");
  const count = chosen.length;
  const draftCount = actions.includes("draft")
    ? Math.min(intent.draftLimit || 6, count)
    : 0;
  const steps = [
    {
      kind: "inspect",
      title: "Inspect the queue",
      detail: `Read ${count} synthetic tickets and their response deadlines.`,
    },
  ];
  if (actions.includes("triage"))
    steps.push({
      kind: "triage",
      title: "Prioritize with evidence",
      detail: livePrediction
        ? "Combine SLA rules with one TabPFN batch trained on authored synthetic scenarios. Save both estimates and reasons."
        : "Rank response deadlines and reported impact. Save the reasons.",
    });
  if (actions.includes("research"))
    steps.push({
      kind: "research",
      title: "Find relevant guidance",
      detail:
        (liveKnowledge
          ? "Retrieve up to two tickets' guidance with Tiger vector and keyword search. "
          : "") +
        (liveResearch
          ? "Search current guidance for up to two priority tickets with SerpApi; save source URLs and timestamps."
          : "Retrieve checked-in support playbooks and official documentation links."),
    });
  if (actions.includes("tag"))
    steps.push({
      kind: "tag",
      title: "Update internal labels",
      detail: liveBrowser
        ? "Use Browserbase to save one internal review note through the helpdesk UI, then label urgent and high-priority tickets."
        : "Add attention-needed tags to urgent and high-priority sandbox tickets.",
    });
  if (actions.includes("draft"))
    steps.push({
      kind: "draft",
      title: "Prepare reply drafts",
      detail: `Create up to ${draftCount} sourced drafts.${liveReview ? " Ask Ultramarine for an advisory review of each reply." : ""} Every simulated send needs your approval.`,
    });
  steps.push({
    kind: "brief",
    title: "Prepare your briefing",
    detail: "Count saved changes and surface the items that need you.",
  });
  return {
    command,
    scope,
    actions,
    objective: intent.objective,
    ticketIds: chosen.map((t) => t.id),
    draftCount,
    steps,
    provider,
    predictionMode: livePrediction ? "tabpfn" : "rules",
    maxPredictionCalls: livePrediction ? 1 : 0,
    maxPredictionTokens: livePrediction ? 50000 : 0,
    reviewMode: liveReview ? "ultramarine" : "none",
    knowledgeMode: liveKnowledge ? "tiger" : "local",
    maxKnowledgeCalls: liveKnowledge && actions.includes("research") ? 2 : 0,
    maxReviewCalls: liveReview ? draftCount : 0,
    researchMode: liveResearch ? "serpapi" : "local",
    maxSearchCalls: liveResearch && actions.includes("research") ? 2 : 0,
    browserMode: liveBrowser ? "browserbase" : "local",
    maxBrowserActions: liveBrowser && actions.includes("tag") ? 2 : 0,
    maxBrowserModelCalls: 0,
    estimatedCalls:
      provider === "local"
        ? 0
        : 1 +
          draftCount +
          (liveReview ? draftCount : 0) +
          (normalizationEnabled() ? 1 : 0) +
          (liveKnowledge && actions.includes("research") ? 2 : 0),
    maxProviderCalls: 8,
    boundaries: [
      "Synthetic helpdesk only",
      "Internal labels and drafts only",
      "No external messages or account changes",
      "Approval required for every simulated send",
    ],
  };
}
