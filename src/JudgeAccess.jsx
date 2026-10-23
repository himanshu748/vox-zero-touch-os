import React, { useEffect, useRef } from "react";
import { ArrowRight, ShieldCheck, Sparkles, ChevronDown } from "lucide-react";

export function JudgeModeStatus({ info, modelLabel, busy, onActivate }) {
  const details = useRef(null);
  useEffect(() => {
    const dismiss = (event) => {
      if (!details.current?.open) return;
      if (event.type === "keydown" && event.key === "Escape") {
        details.current.open = false;
        details.current.querySelector("summary")?.focus();
      } else if (
        event.type === "pointerdown" &&
        !details.current.contains(event.target)
      ) {
        details.current.open = false;
      }
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, []);
  if (!info || info.mode === "unclaimed") return null;
  const live = info.mode === "live",
    expired = info.mode === "expired";
  return (
    <details ref={details} className="workspace-mode">
      <summary>
        <ShieldCheck size={15} />
        <span>
          {live ? "Live AI" : expired ? "Pass expired" : "Rules-only"}
        </span>
        <span className="mode-safety">· simulated sends</span>
        <ChevronDown size={13} />
      </summary>
      <div className="mode-popover">
        <strong>
          {live
            ? modelLabel || "Configured Gemma endpoint"
            : expired
              ? "Your saved work is available"
              : "Rules and reply templates"}
        </strong>
        <p>
          {live
            ? "Real providers, fictional tickets. Your private pass lasts 24 hours; provider quotas apply. Every send is simulated."
            : expired
              ? "Switch to rules-only to prepare another plan. Your existing replies and decisions remain saved."
              : "No live AI, search or voice-provider requests. Your changes are saved; sends are simulated."}
        </p>
        {live && (
          <p className="mode-usage">
            {info.used.plan} plans · {info.used.transcribe} voice uploads ·{" "}
            {info.used.speech} briefings
          </p>
        )}
        {info.mode !== "sandbox" && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              details.current.open = false;
              onActivate("sandbox");
            }}
          >
            Switch to rules-only
          </button>
        )}
      </div>
    </details>
  );
}

export default function JudgeAccess({
  info,
  busy,
  savedPlan,
  onActivate,
  onReviewPlan,
}) {
  if (!info) return null;
  const starting = info.mode === "unclaimed";
  return (
    <>
      {starting && (
        <section
          className="judge-welcome"
          aria-labelledby="judge-welcome-title"
        >
          <span className="eyebrow">YOUR FIRST HANDOFF</span>
          <h1 id="judge-welcome-title">
            A queue of work.
            <br />
            <span>A few decisions for you.</span>
          </h1>
          <p className="judge-welcome-intro">
            Try VOX on 24 fictional support tickets. Review the plan, let it
            prepare the work, then decide on each reply. Nothing is sent to a
            real customer.
          </p>
          <div
            className={`judge-mode-options ${!info.available ? "one-option" : ""}`}
          >
            {info.available && (
              <div className="judge-mode-option">
                <Sparkles size={21} className="judge-mode-icon" />
                <div>
                  <h2>Live AI</h2>
                  <p>
                    Gemma plans and drafts, with connected research and voice.
                  </p>
                  <small>
                    {info.remainingSessions} shared passes left · yours lasts 24
                    hours
                  </small>
                </div>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() => onActivate("live")}
                >
                  Start live evaluation <ArrowRight size={16} />
                </button>
              </div>
            )}
            <div className="judge-mode-option">
              <ShieldCheck size={21} className="judge-mode-icon" />
              <div>
                <h2>Rules-only demo</h2>
                <p>
                  Fixed rules prioritize the queue. Templates prepare two
                  replies for your review.
                </p>
                <small>No live pass or provider requests.</small>
              </div>
              <button
                className={`button ${info.available ? "secondary" : "primary"}`}
                disabled={busy}
                onClick={() => onActivate("sandbox")}
              >
                {busy ? "Opening your workspace…" : "Start rules-only demo"}{" "}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
          {!info.available && (
            <p className="live-unavailable">
              <Sparkles size={16} />
              <span>
                Live AI is unavailable right now. You can explore the same plan
                and reply approvals with rules-only.
              </span>
            </p>
          )}
          <ol className="welcome-steps" aria-label="The workflow">
            <li>
              <span>1</span>Review the plan
            </li>
            <li>
              <span>2</span>VOX prepares the work
            </li>
            <li>
              <span>3</span>Decide on each reply
            </li>
          </ol>
        </section>
      )}
      {info.mode === "expired" && (
        <div className="saved-plan-bar">
          <p>Your live pass expired. Saved work remains available.</p>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => onActivate("sandbox")}
          >
            Continue with rules-only
          </button>
        </div>
      )}
      {savedPlan && (
        <div className="saved-plan-bar">
          <p>
            <strong>Your plan is saved.</strong> Review it when you’re ready to
            start.
          </p>
          <button
            className="button secondary"
            disabled={busy}
            onClick={onReviewPlan}
          >
            Review saved plan <ArrowRight size={16} />
          </button>
        </div>
      )}
    </>
  );
}
