import React from "react";
import {
  ArrowRight,
  AudioLines,
  Check,
  FileText,
  Inbox,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { workflowPresets } from "../shared/workflow-presets.mjs";
import localProof from "../docs/evidence/lazy-payoff.json";
import "./product-overview.css";

export function OperationsPreview({ workspace }) {
  return (
    <div
      className="ops-preview"
      role="region"
      aria-label="Illustrative support workflow preview"
    >
      <div className="ops-preview-toolbar">
        <span>
          <AudioLines size={17} /> VOX <i>/</i> Handoff
        </span>
        <span className="ops-preview-badge">Illustrative preview</span>
      </div>
      <div className="ops-preview-body">
        <div className="ops-preview-kicker">
          THE PREP IS DONE. YOU HAVE THE FINAL SAY.
        </div>
        <h2>
          A queue full of work.
          <br />
          <span>Two replies to review.</span>
        </h2>
        <div className="ops-preview-command">
          <AudioLines size={20} />
          <p>
            “Triage the queue. Draft two replies.
            <br />
            Ask me before sending anything.”
          </p>
        </div>
        <div className="ops-prepared">
          <span>
            <Check size={14} /> Queue prioritized
          </span>
          <span>
            <Check size={14} /> Drafts saved
          </span>
        </div>
        <div className="ops-reply-preview">
          <div className="ops-reply-label">
            <span>REPLY 01 / 02</span>
            <span>
              <ShieldCheck size={13} /> Needs your review
            </span>
          </div>
          <h3>Production deploy fails with exit code 137</h3>
          <p className="ops-reply-to">To Maya Chen · fictional customer</p>
          <p className="ops-reply-body">
            Hi Maya — exit code 137 can indicate memory pressure. Could you
            share the peak memory usage and the worker count before this change?
          </p>
          <div className="ops-reply-source">
            <FileText size={14} /> Review the context and source before
            deciding.
          </div>
        </div>
        <div className="ops-preview-footer">
          <span>
            {workspace
              ? `${workspace.tickets.length} fictional tickets`
              : "24 fictional tickets"}{" "}
            · simulated sends
          </span>
          <a href="/judge?workflow=clear-queue">
            Try this workflow <ArrowRight size={15} />
          </a>
        </div>
      </div>
      <div className="ops-preview-note">
        <ShieldCheck size={15} /> Every reply waits for your individual
        approval.
      </div>
    </div>
  );
}

export function ProductWorkflows() {
  return (
    <section
      className="product-workflows landing-container"
      aria-labelledby="product-workflows-title"
    >
      <div className="product-workflows-heading">
        <div>
          <div className="landing-eyebrow">CHOOSE THE JOB</div>
          <h2 id="product-workflows-title">What should VOX prepare?</h2>
        </div>
        <p>
          Choose a starting point and edit the instruction.
          <br />
          You review the plan before anything runs.
        </p>
      </div>
      <div className="product-workflow-grid">
        {workflowPresets.map((preset, index) => (
          <a
            key={preset.id}
            className="product-workflow-card"
            href={`/judge?workflow=${preset.id}`}
          >
            <span className="product-workflow-label">
              <span>0{index + 1}</span>
              {preset.label}
              <ArrowRight size={16} />
            </span>
            <h3>{preset.title}</h3>
            <p>{preset.outcome}</p>
            <span className="product-workflow-open">
              Try this workflow <ArrowRight size={14} />
            </span>
          </a>
        ))}
      </div>
      <div className="product-proof-strip">
        <div>
          <span className="product-proof-value">
            {(localProof.timing.preparationUntilTwoDecisionsMs / 1000).toFixed(
              2,
            )}
            <small>s</small>
          </span>
          <span>Recorded local preparation</span>
        </div>
        <div>
          <span className="product-proof-value">
            {localProof.result.triaged}
            <small> tickets</small>
          </span>
          <span>Triaged in that run</span>
        </div>
        <div>
          <span className="product-proof-value">
            {localProof.result.humanReplyDecisionsNeeded}
            <small> reply decisions</small>
          </span>
          <span>After one plan approval</span>
        </div>
        <p>
          One synthetic Gemma run on an M4 / 16 GB. Startup and human review
          excluded; manual savings unmeasured.{" "}
          <a
            href="https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/lazy-payoff.json"
            target="_blank"
            rel="noreferrer"
          >
            Read the measurement <ArrowRight size={12} />
          </a>
        </p>
      </div>
    </section>
  );
}

export function WorkflowLauncher({ command, onSelect, disabled }) {
  const selected = workflowPresets.find((preset) => preset.command === command);
  return (
    <section
      className="workflow-launcher"
      aria-label="Choose a starting workflow"
    >
      <div className="workflow-launcher-heading">
        <span className="sr-only">Choose a starting point</span>
      </div>
      <div className="workflow-launcher-grid">
        {workflowPresets.map((preset, index) => (
          <button
            key={preset.id}
            disabled={disabled}
            className={command === preset.command ? "selected" : ""}
            onClick={() => onSelect(preset)}
            aria-pressed={command === preset.command}
          >
            <span className="launcher-number">0{index + 1}</span>
            <span>
              <strong>{preset.label}</strong>
              <small className="sr-only">{preset.outcome}</small>
            </span>
            {command === preset.command ? (
              <Check size={16} />
            ) : (
              <ArrowRight size={16} />
            )}
          </button>
        ))}
      </div>
      <p className="preset-outcome">
        {selected?.outcome ||
          "Custom instruction. You’ll review the scope before anything runs."}
      </p>
    </section>
  );
}

export function RunHandoff({ run, onReview, onOpen, openLabel }) {
  if (!run) return null;
  const pending = run.metrics.pending;
  const interrupted = ["failed", "cancelled"].includes(run.status);
  const ready = run.status === "completed";
  return (
    <section
      className={`run-handoff ${pending ? "needs-review" : ""}`}
      aria-label="Your next step"
    >
      <span className="handoff-icon">
        {pending ? <ShieldCheck size={23} /> : <FileText size={23} />}
      </span>
      <div>
        <span className="eyebrow">YOUR NEXT STEP</span>
        <h2>
          {pending
            ? `${pending} ${pending === 1 ? "reply needs" : "replies need"} your judgment.`
            : interrupted
              ? "A checkpoint is waiting for you."
              : ready
                ? "The work is saved. Your handoff is ready."
                : "Your instruction is becoming saved work."}
        </h2>
        <p>
          {pending
            ? "Read each draft, its sources and any advisory review. Decide on each simulated send."
            : interrupted
              ? "Inspect the failure and saved work before choosing whether to resume."
              : ready
                ? `${run.metrics.triaged} triaged · ${run.metrics.labels} labels · ${run.metrics.sent} simulated ${run.metrics.sent === 1 ? "send" : "sends"} · ${run.metrics.rejected} rejected`
                : "Follow the steps and return here when the replies are ready."}
        </p>
      </div>
      <button
        className={`button ${pending || !ready ? "primary" : "secondary"}`}
        onClick={pending ? onReview : onOpen}
      >
        {pending
          ? "Review replies"
          : openLabel || (ready ? "Open outcome" : "Follow the run")}
        <ArrowRight size={15} />
      </button>
    </section>
  );
}
