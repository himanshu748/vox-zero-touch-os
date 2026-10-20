import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { VOX_MOTION } from "./motion-system";
import {
  Inbox,
  Activity,
  BookOpen,
  Tag,
  FileText,
  Headphones,
  Check,
  ShieldCheck,
  Loader2,
} from "lucide-react";
export const ACTIONS = {
  inspect: { icon: Inbox, title: "Inspect the queue", tag: "Read only" },
  triage: {
    icon: Activity,
    title: "Prioritize with evidence",
    tag: "Internal update",
  },
  research: {
    icon: BookOpen,
    title: "Find relevant guidance",
    tag: "Read only",
  },
  tag: { icon: Tag, title: "Update internal labels", tag: "Sandbox write" },
  draft: {
    icon: FileText,
    title: "Prepare reply drafts",
    tag: "Approval required",
  },
  brief: { icon: Headphones, title: "Prepare your briefing", tag: "Summary" },
};
export default function PlanCards({
  plan,
  intent,
  loading = false,
  activeKind = null,
  completedKinds = [],
  playback = false,
}) {
  const reduced = useReducedMotion();
  const steps =
    plan?.steps ||
    [...new Set(intent?.actions || [])]
      .filter((kind) => ACTIONS[kind])
      .map((kind) => ({
        kind,
        title: ACTIONS[kind].title,
        detail:
          kind === "draft"
            ? "Prepare replies for your review. Sending stays blocked."
            : kind === "tag"
              ? "Label priority tickets inside your synthetic workspace."
              : kind === "research"
                ? "Find relevant support guidance and preserve its sources."
                : "Rank tickets using their deadlines and reported impact.",
      }));
  return (
    <div className="generative-plan">
      <h3 className="sr-only">Workflow plan</h3>
      <div className="plan-card-heading">
        <span>
          {loading ? (
            <Loader2 size={14} className="spin" />
          ) : (
            <ShieldCheck size={14} />
          )}{" "}
          {loading ? "Building your plan" : "A bounded plan, ready for review"}
        </span>
        <span>{plan ? `${plan.steps.length} steps` : "Preview only"}</span>
      </div>
      {intent?.objective && !plan && (
        <p className="generated-objective">{intent.objective}</p>
      )}
      <div className="generative-card-grid">
        {steps.map((step, i) => {
          const meta = ACTIONS[step.kind],
            Icon = meta.icon;
          return (
            <motion.article
              className={`generative-action ${step.kind} ${activeKind === step.kind ? "story-active" : ""} ${completedKinds.includes(step.kind) ? "story-complete" : ""} ${playback ? "story-playback" : ""}`}
              key={step.kind}
              initial={reduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: VOX_MOTION.duration.standard,
                ease: VOX_MOTION.ease,
                delay: Math.min(i * 0.035, 0.14),
              }}
            >
              <div className="generative-action-top">
                <span className="generative-icon">
                  <Icon size={18} />
                </span>
                <span className="generative-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h4>{step.title}</h4>
              <p>{step.detail}</p>
              <div className="generative-action-foot">
                <span>{meta.tag}</span>
                {plan && (!playback || completedKinds.includes(step.kind)) && (
                  <motion.span
                    initial={reduced ? false : { scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check size={12} />
                  </motion.span>
                )}
                {activeKind === step.kind && (
                  <span
                    className="story-current-dot"
                    aria-label="Current preview step"
                  />
                )}
              </div>
            </motion.article>
          );
        })}
        {loading && !steps.length && (
          <div className="plan-waiting">
            <span className="plan-signal">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <h4>Turning your goal into a clear plan.</h4>
            <p>
              Actions will appear as the response arrives.
              <br />
              No changes are made during planning.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
