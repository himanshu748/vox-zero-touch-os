import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDown,
  AudioLines,
  Check,
  ChevronDown,
  Code2,
  FileText,
  Headphones,
  Inbox,
  LockKeyhole,
  Menu,
  Mic,
  Play,
  Pause,
  RotateCcw,
  Plus,
  ShieldCheck,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import PlanCards from "./PlanCards";
import { OperationsPreview, ProductWorkflows } from "./ProductOverview";
import { VOX_MOTION } from "./motion-system";
import { useWorkflowPreview } from "./useWorkflowPreview";
import "./landing.css";
const EXAMPLES = [
  {
    label: "Tame the queue",
    command:
      "Triage my support queue, find likely fixes, and draft replies. Ask me before sending anything.",
    steps: [
      {
        kind: "inspect",
        title: "Read the pending tickets",
        detail: "Start with the tickets and response deadlines in scope.",
      },
      {
        kind: "triage",
        title: "Put urgent work first",
        detail:
          "Rank reported impact and show the reasons behind each priority.",
      },
      {
        kind: "research",
        title: "Find supporting guidance",
        detail: "Keep the source alongside every proposed next step.",
      },
      {
        kind: "draft",
        title: "Get replies ready",
        detail: "Save drafts for review. Sending still belongs to you.",
      },
    ],
  },
  {
    label: "Get ahead of SLAs",
    command:
      "Prioritize tickets that are close to their SLA, add internal tags, and tell me what needs attention.",
    steps: [
      {
        kind: "inspect",
        title: "Check the response window",
        detail: "Inspect the deadlines on the tickets in your synthetic queue.",
      },
      {
        kind: "triage",
        title: "Surface the time-sensitive work",
        detail:
          "Show exactly which deadline or impact signal raised a priority.",
      },
      {
        kind: "tag",
        title: "Make attention visible",
        detail: "Apply internal labels inside the sandbox helpdesk.",
      },
      {
        kind: "brief",
        title: "Bring back a clear briefing",
        detail: "Report saved changes and the work still waiting for a human.",
      },
    ],
  },
  {
    label: "Prepare thoughtful replies",
    command:
      "Research likely answers for the queue and draft concise replies. Leave every send for me to approve.",
    steps: [
      {
        kind: "inspect",
        title: "Understand the context",
        detail: "Read the request and its internal history.",
      },
      {
        kind: "research",
        title: "Keep the source close",
        detail: "Select relevant support guidance and preserve the reference.",
      },
      {
        kind: "draft",
        title: "Write a useful first draft",
        detail:
          "Use your saved reply preference and make uncertainty explicit.",
      },
      {
        kind: "brief",
        title: "Leave a tidy handoff",
        detail: "Bring proposed replies to the approval inbox.",
      },
    ],
  },
];
const FAQ = [
  [
    "What can I actually try right now?",
    "Explore 24 fictional tickets without an account. Choose a live AI pass or the rules-only demo, review a plan, run triage, save labels and drafts, then approve or reject simulated sends. Your work stays in your isolated browser session.",
  ],
  [
    "Is an AI model already connected?",
    "Yes. Choose a live judge pass to use Gemma for plans and drafts, ElevenLabs for voice, and the connected research tools. No signup is needed. The rules-only demo uses fixed rules and reply templates instead. Each mode is labelled, and Evidence shows the actual request receipts.",
  ],
  [
    "Does VOX send messages to real customers?",
    "No. This build uses a synthetic helpdesk. Approving a reply records a simulated send in that workspace. It does not send email or contact a real customer. Every proposed send still requires individual approval.",
  ],
  [
    "What happens to a voice recording?",
    "Recording only starts after your consent and microphone permission. When ElevenLabs is configured, audio is processed in memory and sent for transcription. VOX does not save the recording. Provider retention follows the terms of your provider account. Text input is always available.",
  ],
  [
    "Can I inspect what happened?",
    "Yes. Each run includes the approved plan, activity events, checkpoint progress, sources, saved changes, and approval decisions. The evidence view separates working local features from configured or unconnected services. You can export the records as JSON.",
  ],
];
function Brand({ footer = false }) {
  return (
    <a
      className={`landing-brand ${footer ? "footer-brand" : ""}`}
      href="/"
      aria-label="VOX home"
    >
      <span>
        <AudioLines size={22} strokeWidth={2.2} />
      </span>
      vox<span className="brand-period">.</span>
    </a>
  );
}
function OpenLink({
  children = "Open workspace",
  secondary = false,
  className = "",
}) {
  return (
    <a
      className={`landing-button ${secondary ? "outline" : "solid"} ${className}`}
      href="/judge"
    >
      {children}
      <ArrowUpRight size={17} />
    </a>
  );
}
function Reveal({ children, className = "" }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, ease: VOX_MOTION.ease }}
    >
      {children}
    </motion.div>
  );
}
export default function Landing() {
  const [menu, setMenu] = useState(false),
    [example, setExample] = useState(0),
    [faq, setFaq] = useState(0),
    [workspace, setWorkspace] = useState(null);
  const menuButton = useRef(null),
    nav = useRef(null);
  useEffect(() => {
    if (!menu) return;
    const dismiss = (event) => {
      if (event.type === "keydown" && event.key === "Escape") {
        setMenu(false);
        menuButton.current?.focus();
      }
      if (
        event.type === "pointerdown" &&
        !nav.current?.contains(event.target) &&
        !menuButton.current?.contains(event.target)
      )
        setMenu(false);
    };
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
    };
  }, [menu]);
  const reduced = useReducedMotion();
  const preview = useWorkflowPreview(example, reduced);
  useEffect(() => {
    document.title = "VOX · Your operations co-worker";
    document
      .querySelector("meta[name=theme-color]")
      ?.setAttribute("content", "#f7f8fb");
    fetch("/api/state?workspace=judge")
      .then((r) => r.json())
      .then(setWorkspace)
      .catch(() => {});
  }, []);
  const enter = {
    initial: reduced ? false : { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, ease: VOX_MOTION.ease },
  };
  return (
    <div className="landing-page">
      <a className="landing-skip" href="#main-content">
        Skip to content
      </a>
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <Brand />
          <nav
            ref={nav}
            id="landing-navigation"
            className={menu ? "expanded" : ""}
            aria-label="Main navigation"
          >
            <a href="#how-it-works" onClick={() => setMenu(false)}>
              How it works
            </a>
            <a href="#inside-vox" onClick={() => setMenu(false)}>
              Inside VOX
            </a>
            <a href="#built-in-the-open" onClick={() => setMenu(false)}>
              Built in the open
              <ArrowUpRight size={12} />
            </a>
          </nav>
          <div className="landing-nav-right">
            <OpenLink secondary>Try the demo</OpenLink>
            <button
              className="landing-menu"
              ref={menuButton}
              aria-controls="landing-navigation"
              aria-label={menu ? "Close menu" : "Open menu"}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </header>
      <main id="main-content">
        <section className="landing-hero">
          <div className="hero-fine-grid" aria-hidden="true" />
          <div className="landing-container hero-layout">
            <div className="hero-copy">
              <motion.a {...enter} className="release-note" href="#inside-vox">
                <span className="release-dot" />
                YOUR OPERATIONS CO-WORKER
                <ArrowUpRight size={13} />
              </motion.a>
              <h1>
                <span className="hero-line">
                  <motion.span
                    initial={reduced ? false : { y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      duration: 0.58,
                      delay: 0.04,
                      ease: VOX_MOTION.ease,
                    }}
                  >
                    Say it once.
                  </motion.span>
                </span>
                <span className="hero-line">
                  <motion.span
                    initial={reduced ? false : { y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      duration: 0.58,
                      delay: 0.11,
                      ease: VOX_MOTION.ease,
                    }}
                  >
                    Come back
                  </motion.span>
                </span>
                <span className="hero-line hero-accent">
                  <motion.span
                    initial={reduced ? false : { y: 24, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      duration: 0.58,
                      delay: 0.18,
                      ease: VOX_MOTION.ease,
                    }}
                  >
                    to decisions.
                  </motion.span>
                </span>
              </h1>
              <motion.p
                {...enter}
                transition={{ ...enter.transition, delay: 0.14 }}
              >
                Give VOX the support queue and approve its plan. It sorts the
                urgent work, finds guidance and prepares two replies. You decide
                what goes forward.
              </motion.p>
              <motion.div
                className="hero-ctas"
                {...enter}
                transition={{ ...enter.transition, delay: 0.21 }}
              >
                <OpenLink>Try it on 24 sample tickets</OpenLink>
                <a
                  href="https://www.youtube.com/watch?v=K9MYbrX1T74"
                  target="_blank"
                  rel="noreferrer"
                  className="hero-tour"
                >
                  <span>
                    <Play size={16} />
                  </span>
                  See the walkthrough
                </a>
              </motion.div>
              <motion.div
                {...enter}
                transition={{ ...enter.transition, delay: 0.28 }}
                className="hero-caption"
              >
                <ShieldCheck size={13} />
                No signup. Fictional tickets. Simulated sends.
              </motion.div>
            </div>
            <motion.div
              className="hero-art product-hero-art"
              initial={reduced ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.45,
                delay: 0.12,
                ease: VOX_MOTION.ease,
              }}
            >
              <OperationsPreview workspace={workspace} />
            </motion.div>
          </div>
          <div className="landing-container hero-bottom">
            <span>
              An operations co-worker for makers and small teams. Support is the
              first working workflow.
            </span>
            <a href="#how-it-works">
              SEE THE TICKET WORKFLOW
              <ArrowDown size={12} />
            </a>
          </div>
        </section>
        <div className="principle-strip landing-container">
          <span>
            One instruction.
            <br />
            <strong>Work you can inspect.</strong>
          </span>
          <div>
            <Workflow size={19} />
            <span>Prioritized tickets</span>
          </div>
          <div>
            <ShieldCheck size={19} />
            <span>Researched reply drafts</span>
          </div>
          <div>
            <Code2 size={19} />
            <span>Approvals and a saved history</span>
          </div>
        </div>
        <ProductWorkflows />
        <section id="how-it-works" className="landing-section workflow-section">
          <div className="landing-container">
            <Reveal className="section-intro">
              <div>
                <div className="landing-eyebrow">
                  <span />
                  01 / FROM INTENTION TO ACTION
                </div>
                <h2>
                  From a full queue
                  <br />
                  to replies ready for review.
                </h2>
              </div>
              <p>
                Ask VOX to triage tickets and draft answers. Check the plan,
                follow the work, then approve or reject each proposed reply.
              </p>
            </Reveal>
            <Reveal className="workflow-demo">
              <div className="demo-topbar">
                <div>
                  <span className="demo-light" />
                  <span>ONE SUPPORT REQUEST, STEP BY STEP</span>
                </div>
                <span>Interactive workflow illustration</span>
              </div>
              <div className="demo-body">
                <div className="demo-command">
                  <div
                    className="example-tabs"
                    role="tablist"
                    aria-label="Example workflow"
                    onKeyDown={(e) => {
                      let next = example;
                      if (e.key === "ArrowRight")
                        next = (example + 1) % EXAMPLES.length;
                      else if (e.key === "ArrowLeft")
                        next =
                          (example + EXAMPLES.length - 1) % EXAMPLES.length;
                      else if (e.key === "Home") next = 0;
                      else if (e.key === "End") next = EXAMPLES.length - 1;
                      else return;
                      e.preventDefault();
                      setExample(next);
                      e.currentTarget
                        .querySelectorAll("[role=tab]")
                        [next].focus();
                    }}
                  >
                    {EXAMPLES.map((e, i) => (
                      <button
                        key={e.label}
                        role="tab"
                        tabIndex={example === i ? 0 : -1}
                        aria-selected={example === i}
                        className={example === i ? "selected" : ""}
                        onClick={() => setExample(i)}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                  <div
                    className={`demo-mic ${preview.status === "playing" && preview.phase === 0 ? "signal-active" : ""}`}
                  >
                    <Mic size={23} />
                    <span className="mic-signal-ring" aria-hidden="true" />
                  </div>
                  <span className="demo-overline">IN YOUR OWN WORDS</span>
                  <blockquote>“{EXAMPLES[example].command}”</blockquote>
                  <div className="demo-command-foot">
                    <span className="demo-preview-status" role="status">
                      {preview.status === "complete"
                        ? "Preview complete. Your approval comes next."
                        : preview.status === "paused"
                          ? "Preview paused."
                          : preview.status === "playing"
                            ? `Illustrating step ${Math.min(4, preview.phase + 1)} of 4`
                            : "One instruction. Multiple safe steps."}
                    </span>
                    <button
                      className="motion-preview-button"
                      onClick={preview.toggle}
                    >
                      {preview.status === "playing" ? (
                        <Pause size={13} />
                      ) : preview.status === "complete" ? (
                        <RotateCcw size={13} />
                      ) : (
                        <Play size={13} />
                      )}{" "}
                      {preview.status === "playing"
                        ? "Pause"
                        : preview.status === "paused"
                          ? "Resume"
                          : preview.status === "complete"
                            ? "Replay"
                            : "Play the workflow"}
                    </button>
                  </div>
                </div>
                <div className="demo-plan">
                  <PlanCards
                    key={example}
                    plan={{ steps: EXAMPLES[example].steps }}
                    activeKind={
                      preview.status !== "idle" && preview.phase < 4
                        ? EXAMPLES[example].steps[preview.phase]?.kind
                        : null
                    }
                    completedKinds={EXAMPLES[example].steps
                      .filter((_, i) => i < preview.phase)
                      .map((s) => s.kind)}
                    playback={preview.status !== "idle"}
                  />
                  <div className="demo-plan-foot">
                    <ShieldCheck size={14} />
                    <span>
                      Illustration only. Try a real saved run in the workspace.
                    </span>
                    <a href="/judge">
                      Try it
                      <ArrowUpRight size={13} />
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
            <div className="process-captions">
              <Reveal>
                <span>01</span>
                <h3>Start with your goal.</h3>
                <p>
                  Start with a sentence. Voice is a shortcut. Text works just as
                  well.
                </p>
              </Reveal>
              <Reveal>
                <span>02</span>
                <h3>See the plan before the work.</h3>
                <p>
                  Review the tickets in scope, the requested actions and what
                  will need your approval.
                </p>
              </Reveal>
              <Reveal>
                <span>03</span>
                <h3>Come back to the facts.</h3>
                <p>
                  Get a briefing that counts what was saved, what failed, and
                  what still needs you.
                </p>
              </Reveal>
            </div>
          </div>
        </section>
        <section id="inside-vox" className="landing-section inside-section">
          <div className="landing-container">
            <Reveal className="section-intro">
              <div>
                <div className="landing-eyebrow">
                  <span />
                  02 / A WORKSPACE THAT WORKS BACK
                </div>
                <h2>
                  Your tickets, drafts,
                  <br />
                  and decisions in one place.
                </h2>
              </div>
              <p>
                See which tickets need attention, read the suggested answers and
                their sources, and check what VOX changed.
              </p>
            </Reveal>
            <Reveal className="product-window">
              <div className="product-window-bar">
                <div>
                  <i />
                  <i />
                  <i />
                </div>
                <span>
                  <LockKeyhole size={11} />
                  vox / workspace
                </span>
                <a href="/judge">
                  Step inside
                  <ArrowUpRight size={13} />
                </a>
              </div>
              <div className="product-window-body">
                <section
                  className="mini-sidebar"
                  aria-label="Illustrative workspace navigation"
                >
                  <Brand />
                  <div className="mini-workspace">
                    <span>H</span>
                    <div>
                      My workspace<small>Personal sandbox</small>
                    </div>
                  </div>
                  <span className="mini-nav active">
                    <Inbox size={15} />
                    Support queue
                  </span>
                  <span className="mini-nav">
                    <ShieldCheck size={15} />
                    Approvals
                  </span>
                  <span className="mini-nav">
                    <Workflow size={15} />
                    Run history
                  </span>
                  <div className="mini-guardrail">
                    <ShieldCheck size={20} />
                    <p>
                      Fictional tickets.
                      <br />
                      Real saved work.
                    </p>
                  </div>
                </section>
                <div className="mini-content">
                  <div className="mini-content-top">
                    <span>YOUR SYNTHETIC WORKSPACE</span>
                    <span>
                      <i />
                      Saved workspace data
                    </span>
                  </div>
                  <h3>
                    The queue is here.
                    <br />
                    <span>So is the next step.</span>
                  </h3>
                  <div className="mini-metrics">
                    <div>
                      <span>Tickets in queue</span>
                      <strong>
                        {workspace
                          ? String(workspace.tickets.length).padStart(2, "0")
                          : "··"}
                      </strong>
                    </div>
                    <div>
                      <span>Drafts prepared</span>
                      <strong>
                        {workspace
                          ? String(
                              workspace.tickets.flatMap((t) => t.drafts).length,
                            ).padStart(2, "0")
                          : "··"}
                      </strong>
                    </div>
                    <div>
                      <span>Saved runs</span>
                      <strong>
                        {workspace
                          ? String(workspace.runs.length).padStart(2, "0")
                          : "··"}
                      </strong>
                    </div>
                  </div>
                  <div className="mini-ticket-list">
                    <div className="mini-ticket-heading">
                      <span>Support queue</span>
                      <span>Response due</span>
                    </div>
                    {workspace ? (
                      workspace.tickets.slice(0, 3).map((t) => (
                        <a href="/judge" key={t.id}>
                          <span>
                            <small>{t.id}</small>
                            <strong>{t.title}</strong>
                          </span>
                          <span>
                            {Math.max(
                              0,
                              Math.ceil(
                                (new Date(t.slaAt) - Date.now()) / 3600000,
                              ),
                            )}
                            h left
                            <ArrowUpRight size={13} />
                          </span>
                        </a>
                      ))
                    ) : (
                      <div className="mini-loading">
                        Open the workspace to inspect the synthetic queue.
                      </div>
                    )}
                  </div>
                  <div className="mini-status">
                    <ShieldCheck size={13} />
                    <span>Every send waits for an individual approval.</span>
                    <a href="/judge#approvals">
                      Inspect approvals
                      <ArrowRight size={12} />
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
            <div className="inside-detail-row">
              <Reveal>
                <FileText size={20} />
                <div>
                  <h3>Useful drafts. Clear sources.</h3>
                  <p>
                    A proposed answer, its reference, and the uncertainty that
                    still deserves a human.
                  </p>
                </div>
              </Reveal>
              <Reveal>
                <Workflow size={20} />
                <div>
                  <h3>Pick up where the run stopped.</h3>
                  <p>
                    Inspect saved progress after an interruption. Completed
                    requests reuse their saved results on resume.
                  </p>
                </div>
              </Reveal>
              <Reveal>
                <Headphones size={20} />
                <div>
                  <h3>A briefing with a point.</h3>
                  <p>
                    Hear the outcome and see the same saved counts. The summary
                    stays tied to the work.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
        <section className="boundary-section">
          <div className="landing-container boundary-layout">
            <Reveal className="boundary-copy">
              <div className="landing-eyebrow">
                <span />
                03 / A HUMAN IN THE LOOP
              </div>
              <h2>
                Delegate the prep.
                <br />
                Keep the final say.
              </h2>
              <p>
                Read the draft, check its sources and decide whether it should
                move forward. Each reply waits for its own approval.
              </p>
              <ul>
                <li>
                  <Check size={16} />
                  Review the scope before execution.
                </li>
                <li>
                  <Check size={16} />
                  Approve each proposed simulated send.
                </li>
                <li>
                  <Check size={16} />
                  Reject a reply without losing the draft.
                </li>
                <li>
                  <Check size={16} />
                  Stop a run and inspect its saved progress.
                </li>
              </ul>
              <a href="/judge#approvals" className="landing-text-link">
                See the approval inbox
                <ArrowUpRight size={15} />
              </a>
            </Reveal>
            <Reveal className="boundary-art">
              <div className="approval-illustration">
                <div className="illustration-top">
                  <span>
                    <ShieldCheck size={15} />
                    YOUR APPROVAL REQUIRED
                  </span>
                  <span className="illustration-label">Illustration</span>
                </div>
                <h3>
                  One reply.
                  <br />
                  Your decision.
                </h3>
                <div className="approval-illustration-message">
                  <div className="illustration-avatar">MC</div>
                  <div>
                    <span>To Maya Chen</span>
                    <small>Fictional customer · Orbit Labs</small>
                  </div>
                </div>
                <p>
                  Here’s a proposed next step, with the source attached. Review
                  the context before this reply moves forward.
                </p>
                <div className="illustration-source">
                  <FileText size={13} />
                  Documentation reference attached
                </div>
                <div className="approval-illustration-actions">
                  <span>
                    <X size={14} />
                    Keep as draft
                  </span>
                  <span>
                    <Check size={14} />
                    Approve in sandbox
                  </span>
                </div>
              </div>
              <div className="boundary-signature">
                <span>
                  <ShieldCheck size={19} />
                </span>
                Your voice starts the work.
                <br />
                Your judgment sets the boundary.
              </div>
            </Reveal>
          </div>
        </section>
        <section
          id="built-in-the-open"
          className="landing-section open-section"
        >
          <div className="landing-container">
            <Reveal className="section-intro">
              <div>
                <div className="landing-eyebrow">
                  <span />
                  04 / OPEN, INSPECTABLE WORKFLOWS
                </div>
                <h2>
                  Run your model.
                  <br />
                  <span>Inspect its work.</span>
                </h2>
              </div>
              <p>
                Use local Gemma on your laptop or try the hosted AI workflow.
                Both keep the plan review and individual reply approvals.
              </p>
            </Reveal>
            <div className="open-grid">
              <Reveal className="open-card">
                <div className="open-card-top">
                  <span className="open-symbol">▲</span>
                  <span>THE AI LAYER</span>
                </div>
                <h3>
                  Read the plan.
                  <br />
                  Then start the work.
                </h3>
                <p>
                  Vercel AI SDK turns structured responses into readable plan
                  cards. The server validates the complete plan before any
                  action can run.
                </p>
                <div className="open-card-tags">
                  <span>AI SDK 7</span>
                  <span>Typed outputs</span>
                  <span>Streaming UI</span>
                </div>
              </Reveal>
              <Reveal className="open-card">
                <div className="open-card-top">
                  <Code2 size={25} />
                  <span>THE OPEN APPROACH</span>
                </div>
                <h3>
                  Your model.
                  <br />A portable workflow.
                </h3>
                <p>
                  Run Gemma on your own laptop through Ollama, or use the hosted
                  workflow with connected research and voice tools. Both paths
                  keep the same approval boundary.
                </p>
                <a href="/judge#evidence" className="landing-text-link">
                  See what’s connected
                  <ArrowUpRight size={14} />
                </a>
              </Reveal>
              <Reveal className="open-card">
                <div className="open-card-top">
                  <LayersIcon />
                  <span>THE EVIDENCE</span>
                </div>
                <h3>
                  See what ran.
                  <br />
                  Check what changed.
                </h3>
                <p>
                  Follow each saved action to its sources, provider receipts and
                  approval decision. Export the run when you want to check the
                  details.
                </p>
                <a href="/judge#evidence" className="landing-text-link">
                  Open the evidence console
                  <ArrowUpRight size={14} />
                </a>
              </Reveal>
            </div>
            <div className="build-honesty">
              <span className="build-dot" />
              <p>
                Available today: a working support-operations preview with
                fictional tickets, live AI and simulated sends. Customer
                helpdesk connections are not available in this release.
              </p>
            </div>
          </div>
        </section>
        <section className="faq-section landing-container">
          <Reveal className="faq-heading">
            <div className="landing-eyebrow">
              <span />
              BEFORE YOU TRY IT
            </div>
            <h2>Know what you’re trying.</h2>
            <p>The models, the data and the limits of this release.</p>
          </Reveal>
          <div className="faq-list">
            {FAQ.map(([q, a], i) => (
              <div className={`faq-item ${faq === i ? "open" : ""}`} key={q}>
                <button
                  aria-expanded={faq === i}
                  aria-controls={`answer-${i}`}
                  onClick={() => setFaq(faq === i ? -1 : i)}
                >
                  <span>{q}</span>
                  <Plus size={17} />
                </button>
                <div id={`answer-${i}`} hidden={faq !== i}>
                  <p>{a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="final-cta">
          <div className="landing-container">
            <Reveal>
              <span className="cta-wave">
                <AudioLines size={42} strokeWidth={1.1} />
              </span>
              <div className="landing-eyebrow">YOUR FIRST HANDOFF IS READY</div>
              <h2>
                Give VOX the queue.
                <br />
                Make the final call<span>.</span>
              </h2>
              <OpenLink>Try the support workflow</OpenLink>
              <p>No signup. 24 fictional tickets. Every send is simulated.</p>
            </Reveal>
          </div>
        </section>
      </main>
      <footer className="landing-footer landing-container">
        <div className="landing-footer-top">
          <div>
            <Brand footer />
            <p>Say it once. Let the safe work happen.</p>
          </div>
          <nav aria-label="Footer navigation">
            <a href="#how-it-works">How it works</a>
            <a href="/judge#help">Documentation</a>
            <a href="/judge#evidence">
              Evidence
              <ArrowUpRight size={12} />
            </a>
            <a href="/judge">
              Open workspace
              <ArrowUpRight size={12} />
            </a>
          </nav>
        </div>
        <div className="landing-footer-bottom">
          <span>© {new Date().getFullYear()} VOX. Open source under MIT.</span>
          <span>
            <ShieldCheck size={12} />
            Synthetic sandbox · Human in control
          </span>
          <a href="#main-content">
            Back to the top
            <ArrowUpRight size={12} />
          </a>
        </div>
      </footer>
    </div>
  );
}
function LayersIcon() {
  return (
    <span className="layers-icon">
      <span />
      <span />
      <span />
    </span>
  );
}
