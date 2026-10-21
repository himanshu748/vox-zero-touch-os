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
          <ShieldCheck size={14} /> YOUR OWN SPACE TO TRY VOX
        </span>
        <h2>
          {starting
            ? "Take it for a real run."
            : info.mode === "live"
              ? "Your live evaluation is ready."
              : info.mode === "expired"
                ? "Your live pass has expired."
                : "Your provider-free sandbox."}
        </h2>
        <p>
          {starting
            ? "No account needed. Start with a voice or text command, review the plan, then decide what gets sent inside a fictional helpdesk."
            : info.mode === "live"
              ? "Real providers. Fictional tickets. Only this browser session can review your replies. Your pass lasts 24 hours."
              : "Rules and templates power this mode. Browser speech is labelled separately; no external model or voice requests are made."}
        </p>
        {starting ? (
          <small>
            {info.available
              ? `${info.remainingSessions} live passes available. One plan, two drafts, one voice upload and two briefing generations per pass. Failed requests count. Please use fictional inputs only.`
              : "Live passes are currently reserved or unavailable. You can still complete the entire workflow in the provider-free sandbox."}
          </small>
        ) : info.mode === "live" ? (
          <div className="judge-usage" aria-label="Live allowance used">
            <span>Plan {info.used.plan}/1</span>
            <span>Voice {info.used.transcribe}/1</span>
            <span>Briefings {info.used.speech}/2</span>
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
            {starting
              ? "Use provider-free sandbox"
              : "Switch to provider-free sandbox"}
          </button>
        )}
        <a href="/app" className="text-button">
          Owner workspace
        </a>
      </div>
    </section>
  );
}
