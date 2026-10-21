import React from "react";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

export default function JudgeAccess({
  info,
  busy,
  onActivate,
  savedPlan,
  onReviewPlan,
}) {
  if (!info) return null;
  const starting = info.mode === "unclaimed";
  return (
    <section
      className={`judge-access ${starting ? "is-welcome" : ""}`}
      aria-label="Judge workspace access"
    >
      <div className="judge-access-copy">
        <span className="eyebrow">
          <ShieldCheck size={14} /> YOUR OPERATIONS CO-WORKER
        </span>
        <h2>
          {starting
            ? "Take VOX for a working test drive."
            : info.mode === "live"
              ? "Your live support workspace."
              : info.mode === "expired"
                ? "Your live pass has expired."
                : "Your rules-only demo."}
        </h2>
        <p>
          {starting
            ? "Start with 24 fictional support tickets. Give VOX a goal, review its plan, and return to the reply decisions. Live AI uses a limited free pass. The rules-only demo lets you explore the workflow without one. Sends are simulated."
            : info.mode === "live"
              ? "Real providers. Fictional tickets. Only this browser session can review your replies. Your pass lasts 24 hours."
              : info.mode === "expired"
                ? "Your live pass is no longer active. Switch to the rules-only demo to keep exploring the fictional helpdesk."
                : "Fixed rules prioritize the tickets and templates prepare replies. You can review the plan and practice approvals. Browser speech can read the briefing; this mode makes no live AI or voice-provider requests."}
        </p>
        {starting ? (
          <small>
            {info.available
              ? `${info.remainingSessions} live passes available. Repeat plans, voice uploads and briefings within an active pass. Each run prepares at most two drafts. Provider quotas apply. Please use fictional inputs only.`
              : "Live passes are currently reserved or unavailable. The rules-only demo still lets you try planning, ticket updates and reply approvals."}
          </small>
        ) : info.mode === "live" ? (
          <div className="judge-usage" aria-label="Live requests used">
            <span>Plans {info.used.plan}</span>
            <span>Voice uploads {info.used.transcribe}</span>
            <span>Briefings {info.used.speech}</span>
          </div>
        ) : null}
      </div>
      <div className="judge-access-actions">
        {savedPlan && (
          <button
            className="button primary"
            disabled={busy}
            onClick={onReviewPlan}
          >
            Review saved plan <ArrowRight size={16} />
          </button>
        )}
        {starting && info.available && (
          <button
            className="button primary"
            disabled={busy}
            onClick={() => onActivate("live")}
          >
            <Sparkles size={16} /> Start live evaluation{" "}
            <ArrowRight size={16} />
          </button>
        )}
        {info.mode !== "sandbox" && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => onActivate("sandbox")}
          >
            {starting ? "Try rules-only demo" : "Switch to rules-only demo"}
          </button>
        )}
        <a href="/app" className="text-button">
          Owner workspace
        </a>
      </div>
    </section>
  );
}
