// A shortcut supplies an instruction, never a pre-approved plan or permission.
export const workflowPresets = [
  {
    id: "clear-queue",
    title: "Get the queue under control",
    outcome: "Priorities, researched answers and two drafts to review.",
    command:
      "Triage all support tickets, research fixes, tag urgent ones, and draft two replies. Ask me before sending anything.",
    scope: "all",
    label: "Full workflow",
  },
  {
    id: "sla-watch",
    title: "Protect the response window",
    outcome: "Focus on urgent tickets and prepare two proposed replies.",
    command:
      "Prioritize urgent tickets, tag those needing attention, and draft two replies. Do not send without approval.",
    scope: "urgent",
    label: "Urgent work",
  },
  {
    id: "queue-brief",
    title: "Tell me what needs attention",
    outcome: "Inspect and prioritize the queue. No replies requested.",
    command:
      "Inspect and triage all support tickets, tag urgent tickets, and summarize the queue.",
    scope: "all",
    label: "Briefing only",
  },
];

export function workflowFromSearch(search) {
  const id = new URLSearchParams(search).get("workflow");
  return workflowPresets.find((preset) => preset.id === id) || null;
}
