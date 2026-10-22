import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useObject } from "@ai-sdk/react";
import { intentSchema } from "../shared/contracts.mjs";
import PlanCards from "./PlanCards";
import JudgeAccess from "./JudgeAccess";
import { WorkflowLauncher, RunHandoff } from "./ProductOverview";
import { workflowFromSearch } from "../shared/workflow-presets.mjs";
import { voiceAvailability } from "../shared/voice-access.mjs";
import { recordingWave } from "./voice-audio";
import { VOX_MOTION } from "./motion-system";
import { startWorkspacePolling } from "./workspace-polling";
import {
  readWorkspaceRoute,
  workspaceHash,
  readableError,
} from "./workspace-routing";
import {
  Activity,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Command,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Headphones,
  History,
  Inbox,
  Layers,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  Menu,
  Mic,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Ticket,
  Volume2,
  Workflow,
  X,
  XCircle,
  Zap,
} from "lucide-react";
const DEFAULT_COMMAND =
  "Triage the pending tickets, research likely fixes, draft replies, and tag the urgent ones. Ask me before sending anything.";
const IS_JUDGE = window.location.pathname.startsWith("/judge");
const endpoint = (path) => `/api/${path}${IS_JUDGE ? "?workspace=judge" : ""}`;
const VOICE_SECONDS = IS_JUDGE ? 20 : 60;
function DraftReview({ review }) {
  if (!review) return null;
  return (
    <div className="detail-section" aria-label="Ultramarine advisory review">
      <h4>Ultramarine review</h4>
      <Badge kind={review.verdict === "needs_revision" ? "pending" : "local"}>
        {review.verdict === "needs_revision"
          ? "Changes suggested"
          : "Ready for your review"}
      </Badge>
      <p>{review.summary}</p>
      {review.issues.map((issue, index) => (
        <p key={index}>
          <strong>
            {issue.severity === "blocking" ? "Blocking concern: " : "Caution: "}
            {issue.concern}
          </strong>
          <br />
          {issue.suggestion}
        </p>
      ))}
      <small>
        AI advice against the supplied references. You decide whether this
        synthetic reply should be sent.
      </small>
    </div>
  );
}
const NAV = [
  ["overview", "Overview", LayoutDashboard],
  ["tickets", "Ticket queue", Inbox],
  ["approvals", "Approvals", ShieldCheck],
  ["history", "Run history", History],
  ["evidence", "Evidence", Layers],
];
const relative = (date) => {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(date)) / 60000),
  );
  return minutes < 1
    ? "Just now"
    : minutes < 60
      ? `${minutes}m ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)}h ago`
        : new Date(date).toLocaleDateString();
};
const sla = (t) => {
  const h = Math.ceil((new Date(t.slaAt) - Date.now()) / 3600000);
  return h <= 0 ? "Overdue" : `${h}h left`;
};
const initials = (name) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
const statusLabel = (s) =>
  ({
    running: "In progress",
    awaiting_approval: "Needs approval",
    completed: "Completed",
    cancelled: "Stopped",
    failed: "Needs attention",
    pending: "Awaiting review",
    sent: "Sent in sandbox",
    rejected: "Rejected",
    normal: "Normal",
    high: "High",
    urgent: "Urgent",
  })[s] || s;
async function api(path, body) {
  const res = await fetch(
    endpoint(path),
    body === undefined
      ? {}
      : {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  const data = await res.json();
  if (!res.ok)
    throw new Error(data.error || "The request could not be completed.");
  return data;
}
function Badge({ kind, children, dot = false }) {
  return (
    <span className={`badge ${kind || ""}`}>
      {dot && <span className="status-dot" />}
      {children}
    </span>
  );
}
function Logo({ small = false }) {
  return (
    <span className={`logo ${small ? "small" : ""}`}>
      <span className="logo-mark">
        <AudioLines size={small ? 18 : 23} strokeWidth={2.5} />
      </span>
      {!small && (
        <>
          vox<span className="logo-period">.</span>
        </>
      )}
    </span>
  );
}
function Modal({ title, subtitle, children, onClose, wide = false }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef(),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const items = [
          ...ref.current.querySelectorAll(
            'button:not(:disabled), a, input, textarea, select, [tabindex="0"]',
          ),
        ];
        const visibleItems = items.filter(
          (el) => !el.disabled && el.getClientRects().length,
        );
        const first = visibleItems[0],
          last = visibleItems.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`modal ${wide ? "wide" : ""}`}
        initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
        transition={{
          duration: reduceMotion ? 0.1 : VOX_MOTION.duration.standard,
          ease: VOX_MOTION.ease,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.section>
    </motion.div>
  );
}
function Waveform({ recording = false, levels }) {
  return (
    <div
      className={`waveform ${recording ? "recording" : ""}`}
      aria-hidden="true"
    >
      {Array.from({ length: 65 }, (_, i) => {
        const envelope = Math.sin((i / 64) * Math.PI);
        const height = 5 + envelope * (12 + Math.abs(Math.sin(i * 1.67)) * 63);
        return (
          <i
            key={i}
            ref={(node) => {
              if (levels) levels.current[i] = node;
            }}
            style={{ height: `${height}px`, opacity: 0.3 + envelope * 0.7 }}
          />
        );
      })}
    </div>
  );
}
function Timeline({ events, compact = false }) {
  return (
    <div className={`timeline ${compact ? "compact" : ""}`}>
      {events.map((e, i) => (
        <div className={`timeline-item ${e.status}`} key={e.id}>
          <span className="timeline-marker">
            {e.status === "retry" ? (
              <RefreshCw size={12} />
            ) : e.status === "failed" ? (
              <X size={12} />
            ) : (
              <Check size={12} />
            )}
          </span>
          <div>
            <p>{e.title}</p>
            {!compact && <span>{e.detail}</span>}
            <time>{relative(e.at)}</time>
          </div>
        </div>
      ))}
    </div>
  );
}
export default function App() {
  const [state, setState] = useState(null),
    [view, setView] = useState(() => readWorkspaceRoute().view),
    [modal, setModal] = useState(
      location.hash === "#help" ? { type: "docs" } : null,
    ),
    [menuOpen, setMenuOpen] = useState(false),
    [command, setCommand] = useState(
      () => workflowFromSearch(location.search)?.command || "",
    ),
    [scope, setScope] = useState(
      () => workflowFromSearch(location.search)?.scope || "all",
    ),
    [plan, setPlan] = useState(null),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(null),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState("all"),
    [selectedRun, setSelectedRun] = useState(() => readWorkspaceRoute().runId),
    [approvalFilter, setApprovalFilter] = useState(() =>
      readWorkspaceRoute().view === "approvals"
        ? readWorkspaceRoute().runId || "all"
        : "all",
    ),
    [recording, setRecording] = useState(false),
    [playing, setPlaying] = useState(false),
    [voiceConsent, setVoiceConsent] = useState(false),
    [transcript, setTranscript] = useState(null),
    [voicePhase, setVoicePhase] = useState(null),
    [voiceError, setVoiceError] = useState(null),
    [speechLoading, setSpeechLoading] = useState(false),
    [prefs, setPrefs] = useState(null),
    [confirmReset, setConfirmReset] = useState(false),
    [loadError, setLoadError] = useState(null),
    [searchQuery, setSearchQuery] = useState("");
  const planRequest = useRef(null),
    syncRequest = useRef(0),
    initialized = useRef(false),
    mainRef = useRef(null),
    sidebarRef = useRef(null),
    speechObjectUrl = useRef(null),
    voiceRequest = useRef(null),
    speechRequest = useRef(null),
    browserSpeech = useRef(null),
    textarea = useRef(),
    recordRef = useRef(null),
    audioRef = useRef(null),
    levelNodes = useRef([]),
    reduceMotion = useReducedMotion();
  const notify = (message, kind = "success") =>
    setToast({ message, kind, id: Date.now() });
  const sync = async () => {
    const request = ++syncRequest.current;
    try {
      const s = await api("state");
      if (request !== syncRequest.current) return s;
      setState(s);
      setLoadError(null);
      if (!initialized.current) {
        setScope(
          workflowFromSearch(location.search)?.scope ||
            s.preferences.scope ||
            "all",
        );
        const used = new Set(
          s.runs.map((run) => run.plan.input?.transcriptId).filter(Boolean),
        );
        const pending = [...(s.transcripts || [])]
          .reverse()
          .find(
            (item) =>
              !used.has(item.id) &&
              Date.now() - Date.parse(item.createdAt) < 3600000,
          );
        if (pending && !workflowFromSearch(location.search)) {
          setTranscript({ id: pending.id, text: pending.text });
          setCommand(pending.text);
        }
        initialized.current = true;
      }
      return s;
    } catch (e) {
      if (request === syncRequest.current) setLoadError(readableError(e));
    }
  };
  useEffect(() => {
    document.title = "VOX · Operations workspace";
    document
      .querySelector("meta[name=theme-color]")
      ?.setAttribute("content", "#f7f8fb");
    const stopPolling = startWorkspacePolling(sync);
    return () => {
      stopPolling();
      ++syncRequest.current;
    };
  }, []);
  useEffect(() => {
    const restore = () => {
      const route = readWorkspaceRoute();
      setView(route.view);
      setSelectedRun(route.runId);
      setApprovalFilter(
        route.view === "approvals" ? route.runId || "all" : "all",
      );
      setModal(null);
      setMenuOpen(false);
    };
    window.addEventListener("popstate", restore);
    window.addEventListener("hashchange", restore);
    return () => {
      window.removeEventListener("popstate", restore);
      window.removeEventListener("hashchange", restore);
    };
  }, []);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 761px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector("button")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [menuOpen]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const handler = (e) => {
      if (document.querySelector('[role="dialog"]')) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchQuery("");
        setModal({ type: "search" });
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "Enter" &&
        !e.target.closest("input,textarea,select")
      ) {
        e.preventDefault();
        newRun();
      }
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(
    () => () => {
      if (recordRef.current) {
        recordRef.current.discard = true;
        recordRef.current.stop?.();
      }
      if (speechObjectUrl.current) URL.revokeObjectURL(speechObjectUrl.current);
      voiceRequest.current?.abort();
      speechRequest.current?.abort();
      audioRef.current?.pause?.();
      window.speechSynthesis?.cancel();
    },
    [],
  );
  const planStream = useObject({
    api: endpoint("plans/stream"),
    schema: intentSchema,
    onFinish: async ({ object, error }) => {
      const requestId = planRequest.current;
      if (!requestId) return;
      if (error || !object) {
        setModal(null);
        setBusy(false);
        notify(
          "The plan could not be validated. No changes were made.",
          "error",
        );
        return;
      }
      try {
        const validated = await api(`plans/${requestId}`);
        if (planRequest.current !== requestId) return;
        setPlan(validated);
        setModal({ type: "plan" });
        await sync();
      } catch (e) {
        setModal(null);
        notify(readableError(e), "error");
      } finally {
        setBusy(false);
      }
    },
    onError: (error) => {
      if (!planRequest.current) return;
      setBusy(false);
      setModal(null);
      notify(readableError(error), "error");
    },
  });
  function cancelPlanning() {
    planRequest.current = null;
    planStream.stop();
    setBusy(false);
    setModal(null);
  }
  const act = async (fn) => {
    setBusy(true);
    try {
      await fn();
      await sync();
    } catch (e) {
      notify(readableError(e), "error");
    } finally {
      setBusy(false);
    }
  };
  if (!state)
    return (
      <div className="loading-screen">
        <Logo />
        <Loader2 className="spin" size={24} />
        <p>{loadError || "Preparing your workspace…"}</p>
        <button className="text-button" onClick={sync}>
          Try again
        </button>
      </div>
    );
  const pending = state.tickets.flatMap((t) =>
    t.drafts
      .filter((d) => d.status === "pending")
      .map((d) => ({ ...d, ticket: t })),
  );
  const approvalItems = pending.filter(
    (draft) => approvalFilter === "all" || draft.runId === approvalFilter,
  );
  const currentRun = selectedRun
    ? state.runs.find((r) => r.id === selectedRun)
    : state.runs[0];
  const active = state.runs.find((r) => r.status === "running");
  const voiceAccess = voiceAvailability(state.capabilities, IS_JUDGE);
  const judgePass = state.capabilities.judge;
  const canPlan =
    !IS_JUDGE ||
    (judgePass?.canDecide &&
      judgePass.mode !== "expired" &&
      !(
        judgePass.mode === "live" &&
        Number.isFinite(judgePass.limits?.plan) &&
        judgePass.used.plan >= judgePass.limits.plan
      ));
  const urgent = state.tickets.filter((t) =>
    ["urgent", "high"].includes(t.priority),
  );
  const draftTotal = state.tickets.reduce((n, t) => n + t.drafts.length, 0);
  const actionsSaved = state.runs.reduce(
    (n, r) => n + r.metrics.triaged + r.metrics.labels + r.metrics.drafts,
    0,
  );
  const filtered = state.tickets
    .filter(
      (t) =>
        (filter === "all" ||
          (filter === "urgent" && ["urgent", "high"].includes(t.priority)) ||
          (filter === "drafted" && t.drafts.length > 0)) &&
        `${t.id} ${t.title} ${t.name} ${t.company} ${t.category}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  const searchResults = state.tickets.filter((t) =>
    `${t.id} ${t.title} ${t.name} ${t.company} ${t.category}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );
  function goto(v, runId) {
    setView(v);
    if (v === "approvals") setApprovalFilter(runId || "all");
    if (runId) setSelectedRun(runId);
    const hash = workspaceHash(
      v,
      runId || (v === "operations" ? selectedRun : null),
    );
    if (location.hash !== hash) history.pushState(null, "", hash);
    setMenuOpen(false);
    setQuery("");
    setFilter("all");
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }
  async function preview() {
    if (busy || active) return;
    if (!canPlan)
      return notify(
        "This pass cannot start another plan. Review your saved work or choose the rules-only demo.",
        "error",
      );
    if (!command.trim()) {
      textarea.current?.focus();
      notify("Type a command or use a suggested workflow.", "error");
      return;
    }
    planRequest.current = crypto.randomUUID();
    planStream.clear();
    setBusy(true);
    setModal({ type: "planning" });
    planStream.submit({
      command,
      scope,
      requestId: planRequest.current,
      ...(transcript ? { transcriptId: transcript.id } : {}),
    });
  }
  async function startRun() {
    await act(async () => {
      const r = await api("runs", { planId: plan.id });
      setSelectedRun(r.id);
      setModal(null);
      goto("operations", r.id);
      notify("Your run has started. You can follow every saved action here.");
    });
  }
  async function decide(id, decision) {
    await act(async () => {
      await api(`approvals/${id}`, { decision });
      setModal(null);
      notify(
        decision === "approve"
          ? "Reply sent inside the sandbox. No external delivery."
          : "Draft preserved. Nothing sent.",
      );
    });
  }
  function newRun() {
    setModal(null);
    goto("overview");
    setTimeout(() => textarea.current?.focus(), 100);
  }
  async function voiceStart() {
    if (recording) {
      recordRef.current?.stop();
      return;
    }
    if (!voiceAccess.allowed) return notify(voiceAccess.message, "error");
    setModal({ type: "voice" });
    setVoiceConsent(false);
    setVoiceError(null);
  }
  async function transcribeBlob(blob, controller = new AbortController()) {
    if (!voiceAccess.allowed) {
      setVoiceError(voiceAccess.message);
      return;
    }
    voiceRequest.current = controller;
    setBusy(true);
    setVoiceError(null);
    setVoicePhase("transcribing");
    try {
      const response = await fetch(endpoint("transcribe"), {
        method: "POST",
        headers: { "content-type": blob.type || "application/octet-stream" },
        body: blob,
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (controller.signal.aborted) return;
      setTranscript({ id: result.id, text: result.text });
      setCommand(result.text);
      setModal(null);
      goto("overview");
      notify(
        "ElevenLabs transcript ready. Review it, then create your Gemma plan.",
      );
      setTimeout(() => textarea.current?.focus(), 100);
    } catch (error) {
      if (!controller.signal.aborted) {
        setVoiceError(readableError(error));
        notify(readableError(error), "error");
      }
    } finally {
      if (voiceRequest.current === controller) {
        setBusy(false);
        setVoicePhase(null);
        voiceRequest.current = null;
        await sync();
      }
    }
  }
  async function uploadVoice(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !voiceConsent || busy || recording) return;
    if (file.size > (IS_JUDGE ? 2 : 8) * 1024 * 1024) {
      notify(
        `Choose an audio file smaller than ${IS_JUDGE ? 2 : 8} MB.`,
        "error",
      );
      return;
    }
    await transcribeBlob(file);
  }
  async function record() {
    if (!voiceConsent || busy || recording) return;
    if (!voiceAccess.allowed) {
      setVoiceError(voiceAccess.message);
      return;
    }
    const controller = new AbortController();
    voiceRequest.current = controller;
    setVoicePhase("requesting");
    let stream, context, frame, timer;
    const cleanup = () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      context?.close().catch(() => {});
    };
    try {
      if (!state.capabilities.elevenlabs)
        throw new Error("Connect ElevenLabs to transcribe audio.");
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "Microphone recording is unavailable here. Upload an audio file or use text.",
        );
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (controller.signal.aborted) {
        cleanup();
        return;
      }
      const recorder = new MediaRecorder(stream),
        chunks = [];
      context = new AudioContext();
      const analyser = context.createAnalyser();
      context.createMediaStreamSource(stream).connect(analyser);
      analyser.fftSize = 256;
      const values = new Uint8Array(analyser.frequencyBinCount);
      const paint = () => {
        analyser.getByteFrequencyData(values);
        levelNodes.current.forEach((el, index) => {
          if (el) el.style.height = `${4 + values[index] * 0.34}px`;
        });
        frame = requestAnimationFrame(paint);
      };
      paint();
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = async () => {
        cleanup();
        setRecording(false);
        if (controller.signal.aborted || recordRef.current?.discard) {
          setVoicePhase(null);
          return;
        }
        setVoicePhase("transcribing");
        setBusy(true);
        try {
          const wave = await recordingWave(
            new Blob(chunks, { type: recorder.mimeType }),
          );
          if (!controller.signal.aborted)
            await transcribeBlob(wave, controller);
        } catch (error) {
          if (!controller.signal.aborted) {
            setVoiceError(readableError(error));
            notify(readableError(error), "error");
          }
          setVoicePhase(null);
          setBusy(false);
        }
      };
      recorder.onerror = () => {
        cleanup();
        setRecording(false);
        setVoicePhase(null);
        const message =
          "Recording was interrupted. Try uploading an audio file.";
        setVoiceError(message);
        notify(message, "error");
      };
      recorder.start();
      timer = setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, VOICE_SECONDS * 1000);
      recordRef.current = {
        stop: () => {
          if (recorder.state !== "inactive") recorder.stop();
        },
        discard: false,
      };
      setRecording(true);
      setVoicePhase("recording");
    } catch (error) {
      cleanup();
      setRecording(false);
      setVoicePhase(null);
      if (!controller.signal.aborted) {
        const message =
          error.name === "NotAllowedError"
            ? "Microphone access was denied. Upload audio or type your command instead."
            : readableError(error);
        setVoiceError(message);
        notify(message, "error");
      }
    }
  }
  async function playBriefing(run) {
    if (state.capabilities.modelMode === "local")
      return notify(
        "Voice is skipped in local mode. Your text briefing is saved.",
      );
    if (playing) {
      speechRequest.current?.abort();
      setSpeechLoading(false);
      if (browserSpeech.current) {
        browserSpeech.current.onend = null;
        browserSpeech.current.onerror = null;
      }
      audioRef.current?.pause();
      if (speechObjectUrl.current) {
        URL.revokeObjectURL(speechObjectUrl.current);
        speechObjectUrl.current = null;
      }
      window.speechSynthesis?.cancel();
      setPlaying(false);
      return;
    }
    if (!run?.briefing) return;
    setPlaying(true);
    if (state.capabilities.speech) {
      const controller = new AbortController();
      speechRequest.current = controller;
      setSpeechLoading(true);
      try {
        const res = await fetch(endpoint("speech"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ runId: run.id }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error);
        }
        const blob = await res.blob();
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(blob);
        setSpeechLoading(false);
        speechObjectUrl.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onerror = () => {
          setPlaying(false);
          setSpeechLoading(false);
          URL.revokeObjectURL(url);
          speechObjectUrl.current = null;
          notify(
            "Audio could not play. Your briefing is available as text.",
            "error",
          );
        };
        audio.onended = () => {
          setPlaying(false);
          URL.revokeObjectURL(url);
          speechObjectUrl.current = null;
        };
        await audio.play();
        notify(
          res.headers.get("X-VOX-Audio-Cache") === "hit"
            ? "Playing saved ElevenLabs audio. No new generation request."
            : "Playing your ElevenLabs briefing.",
        );
        await sync();
      } catch (e) {
        setPlaying(false);
        setSpeechLoading(false);
        if (speechObjectUrl.current) {
          URL.revokeObjectURL(speechObjectUrl.current);
          speechObjectUrl.current = null;
        }
        if (!controller.signal.aborted) notify(readableError(e), "error");
      }
    } else if ("speechSynthesis" in window) {
      const speech = new SpeechSynthesisUtterance(run.briefing);
      browserSpeech.current = speech;
      speech.rate = 0.95;
      speech.onend = () => setPlaying(false);
      speech.onerror = () => {
        setPlaying(false);
        notify(
          "Browser speech could not play. The full briefing is available on screen.",
          "error",
        );
      };
      window.speechSynthesis.speak(speech);
      notify("Playing with browser speech. ElevenLabs is not connected.");
    } else {
      setPlaying(false);
      notify(
        "Speech playback is unavailable in this browser. Your briefing is available as text.",
        "error",
      );
    }
  }
  const ticketTable = (limit) => (
    <div className="table-scroll">
      <table className="ticket-table">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Customer</th>
            <th>Priority</th>
            <th>Response due</th>
            <th>
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filtered.slice(0, limit || 100).map((t, i) => (
            <tr
              key={t.id}
              onClick={() => setModal({ type: "ticket", id: t.id })}
            >
              <td>
                <button
                  className="ticket-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    setModal({ type: "ticket", id: t.id });
                  }}
                >
                  <span className="ticket-id">{t.id}</span>
                  <strong>{t.title}</strong>
                  <span className="mobile-customer">{t.company}</span>
                </button>
              </td>
              <td>
                <span className={`avatar av-${i % 5}`}>{initials(t.name)}</span>
                <span className="customer">
                  <strong>{t.name}</strong>
                  <small>{t.company}</small>
                </span>
              </td>
              <td>
                {t.triagedAt ? (
                  <Badge kind={t.priority}>
                    <span className="priority-lines">
                      {t.priority === "urgent"
                        ? "▴"
                        : t.priority === "high"
                          ? "Ⅱ"
                          : "▥"}
                    </span>
                    {statusLabel(t.priority)}
                  </Badge>
                ) : (
                  <span className="unranked">
                    <span />
                    Untriaged
                  </span>
                )}
              </td>
              <td>
                <span
                  className={`sla ${new Date(t.slaAt) - Date.now() < 5 * 3600000 ? "soon" : ""}`}
                >
                  <Clock size={13} />
                  {sla(t)}
                </span>
              </td>
              <td>
                <ChevronRight size={15} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!filtered.length && (
        <div className="empty">
          <Search size={26} />
          <h3>No tickets found</h3>
          <p>Try a different search or show all tickets.</p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
  return (
    <div className="app-shell">
      <a
        className="workspace-skip"
        href="#workspace-main"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Skip to workspace
      </a>
      {menuOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside ref={sidebarRef} className={`sidebar ${menuOpen ? "open" : ""}`}>
        <button
          className="icon-button mobile-menu sidebar-close"
          aria-label="Close navigation menu"
          onClick={() => setMenuOpen(false)}
        >
          <X size={19} />
        </button>
        <div className="sidebar-brand">
          <a className="brand-home" href="/" aria-label="VOX homepage">
            <Logo />
          </a>
          <Badge>ZERO-TOUCH OS</Badge>
        </div>
        <button
          className="workspace-selector"
          onClick={() => {
            setPrefs({
              ...state.preferences,
              scope: state.preferences.scope || "all",
            });
            setConfirmReset(false);
            setModal({ type: "settings" });
          }}
        >
          <span className="workspace-icon">H</span>
          <span>
            {IS_JUDGE ? "Judge workspace" : "My workspace"}
            <small>
              {IS_JUDGE ? "Private evaluation" : "Personal sandbox"}
            </small>
          </span>
          <ChevronDown size={15} />
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {NAV.map(([id, label, Icon]) => (
            <button
              key={id}
              className={`nav-item ${view === id || (id === "history" && view === "operations") ? "selected" : ""}`}
              onClick={() => goto(id)}
              aria-current={
                view === id || (id === "history" && view === "operations")
                  ? "page"
                  : undefined
              }
            >
              <Icon size={18} />
              <span>{label}</span>
              {id === "tickets" && (
                <span className="nav-count">{state.tickets.length}</span>
              )}
              {id === "approvals" && pending.length > 0 && (
                <span className="nav-count orange">{pending.length}</span>
              )}
            </button>
          ))}
        </nav>
        <button className="new-run" onClick={newRun}>
          <Plus size={17} />
          New run<span>⌘ ↵</span>
        </button>
        <div className="sidebar-bottom">
          <div className="sandbox-note">
            <div className="sandbox-note-icon">
              <ShieldCheck size={19} />
            </div>
            <strong>A safe place to delegate.</strong>
            <p>
              Fictional tickets. Real workflows.
              <br />
              You’re always in control.
            </p>
            <button
              onClick={() => {
                setMenuOpen(false);
                setModal({ type: "docs" });
              }}
            >
              How the sandbox works
              <ArrowUpRight size={13} />
            </button>
          </div>
          <button
            className="nav-item"
            onClick={() => {
              setPrefs({
                ...state.preferences,
                scope: state.preferences.scope || "all",
              });
              setConfirmReset(false);
              setMenuOpen(false);
              setModal({ type: "settings" });
            }}
          >
            <Settings2 size={18} />
            Preferences
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setMenuOpen(false);
              setModal({ type: "docs" });
            }}
          >
            <BookOpen size={18} />
            Help & documentation
            <ArrowUpRight className="push-right" size={14} />
          </button>
          <div className="user-card">
            <span className="user-avatar">H</span>
            <span>
              {IS_JUDGE ? "Judge workspace" : "My workspace"}
              <small>
                {IS_JUDGE
                  ? "Private browser session"
                  : state.capabilities.authenticated
                    ? "Auth0 account"
                    : "Guest session"}{" "}
                · {state.session.id}
              </small>
            </span>
            <button
              className="icon-button"
              aria-label="Open workspace settings"
              onClick={() => {
                setPrefs({
                  ...state.preferences,
                  scope: state.preferences.scope || "all",
                });
                setConfirmReset(false);
                setMenuOpen(false);
                setModal({ type: "settings" });
              }}
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
          {state.capabilities.identity && !IS_JUDGE && (
            <a
              className="nav-item"
              href={
                state.capabilities.authenticated
                  ? "/auth/logout"
                  : "/auth/login"
              }
            >
              {state.capabilities.authenticated
                ? "Sign out"
                : "Sign in with Auth0"}
            </a>
          )}
        </div>
      </aside>
      <div className="main-shell" inert={menuOpen ? "" : undefined}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span className="workspace-crumb">Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {view === "operations"
                ? "Live operations"
                : NAV.find((n) => n[0] === view)?.[1]}
            </strong>
          </div>
          <div className="topbar-actions">
            <span className="sandbox-live">
              <span />
              Sandbox active
            </span>
            <span className="topbar-divider" />
            <button
              className="icon-button search-shortcut"
              aria-label="Search workspace"
              onClick={() => {
                setSearchQuery("");
                setModal({ type: "search" });
              }}
            >
              <Search size={18} />
              <kbd>⌘ K</kbd>
            </button>
            <button
              className="icon-button notification-button"
              aria-label={`${pending.length} pending approvals`}
              onClick={() => goto("approvals")}
            >
              <Bell size={19} />
              {pending.length > 0 && <i />}
            </button>
            <button
              className="header-avatar"
              aria-label="Workspace preferences"
              onClick={() => {
                setPrefs({
                  ...state.preferences,
                  scope: state.preferences.scope || "all",
                });
                setConfirmReset(false);
                setMenuOpen(false);
                setModal({ type: "settings" });
              }}
            >
              H
            </button>
          </div>
        </header>
        <main id="workspace-main" ref={mainRef} tabIndex={-1}>
          {state.capabilities.modelMode === "local" && (
            <section
              className="judge-access"
              aria-label="Local open-weight mode"
            >
              <div>
                <div className="eyebrow">LOCAL OPEN-WEIGHT AI</div>
                <h2>Give it the queue. Come back to two decisions.</h2>
                <p>
                  {state.capabilities.gemmaModel} runs planning, intent
                  normalization and reply drafting on this machine. No cloud
                  model, search, voice or browser calls. You approve the plan
                  and each simulated send.
                </p>
                <small>
                  Local SQLite persistence · Temporal + Mastra · External steps
                  have skipped receipts
                </small>
              </div>
            </section>
          )}
          <JudgeAccess
            info={state.capabilities.judge}
            busy={busy}
            savedPlan={state.judgePreview}
            onReviewPlan={() => {
              setPlan(state.judgePreview);
              setModal({ type: "plan" });
            }}
            onActivate={(mode) =>
              act(async () => {
                await api("judge/activate", { mode });
                setTranscript(null);
                setPlan(null);
                if (!command)
                  setCommand(
                    "Triage all support tickets, research fixes, tag urgent ones, and draft two replies. Ask me before sending anything.",
                  );
                notify(
                  mode === "live"
                    ? "Your live pass is reserved. Review your instruction to begin."
                    : "Rules-only demo ready. Fixed priorities and reply templates are active.",
                );
              })
            }
          />
          {loadError && (
            <div className="connection-banner" role="status">
              <RefreshCw size={15} />
              <span>{loadError}</span>
              <button onClick={sync}>Retry</button>
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              className="workspace-view"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -5 }}
              transition={{
                duration: VOX_MOTION.duration.standard,
                ease: VOX_MOTION.ease,
              }}
            >
              {view === "overview" && (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: VOX_MOTION.duration.expressive,
                    ease: VOX_MOTION.ease,
                  }}
                >
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">
                        <span className="tiny-line" /> YOUR OPERATIONS WORKSPACE
                      </div>
                      <h1>
                        Give VOX the prep. Keep the decisions<span>.</span>
                      </h1>
                      <p>
                        Choose the work, review the plan and let VOX prepare it.
                        Each proposed reply comes back to you for approval.
                      </p>
                    </div>
                    <button
                      className="button secondary how-it-works"
                      onClick={() => {
                        setMenuOpen(false);
                        setModal({ type: "docs" });
                      }}
                    >
                      <Play size={14} />
                      How it works
                    </button>
                  </div>
                  {state.runs[0] && (
                    <RunHandoff
                      run={state.runs[0]}
                      onReview={() => goto("approvals", state.runs[0].id)}
                      onOpen={() => goto("operations", state.runs[0].id)}
                    />
                  )}
                  <WorkflowLauncher
                    command={command}
                    disabled={busy || !!active}
                    onSelect={(preset) => {
                      setCommand(preset.command);
                      setScope(preset.scope);
                      setTranscript(null);
                      textarea.current?.focus();
                    }}
                  />
                  <section className="hero-grid">
                    <div className="voice-card">
                      <div className="voice-card-top">
                        <span className="console-label">
                          <span /> ONE INSTRUCTION. SAFE WORK, TAKEN CARE OF.
                        </span>
                        <Badge>
                          <LockKeyhole size={11} />
                          Sandbox only
                        </Badge>
                      </div>
                      <div className="voice-intro">
                        <h2>
                          What can we take
                          <br />
                          <span>off your plate?</span>
                        </h2>
                        <div className="voice-orb-wrap">
                          <button
                            className={`voice-orb ${recording ? "is-recording" : ""}`}
                            aria-label={
                              recording
                                ? "Stop recording"
                                : "Record a voice command"
                            }
                            disabled={
                              busy || (!recording && !voiceAccess.allowed)
                            }
                            aria-describedby="voice-access-status"
                            onClick={voiceStart}
                          >
                            {recording ? (
                              <Square size={24} fill="currentColor" />
                            ) : (
                              <AudioLines size={36} strokeWidth={1.5} />
                            )}
                          </button>
                          <span className="orb-label">
                            {recording ? "Listening…" : voiceAccess.label}
                          </span>
                        </div>
                      </div>
                      <Waveform />
                      <div className="command-composer">
                        <label htmlFor="command" className="sr-only">
                          Your instruction
                        </label>
                        <textarea
                          id="command"
                          ref={textarea}
                          value={command}
                          maxLength={2000}
                          placeholder="“Triage my tickets, find fixes, and draft the replies…”"
                          onChange={(e) => {
                            setCommand(e.target.value);
                            if (!e.target.value) setTranscript(null);
                          }}
                          onKeyDown={(e) => {
                            if ((e.metaKey || e.ctrlKey) && e.key === "Enter")
                              preview();
                          }}
                        />
                        <div className="composer-bottom">
                          <button
                            className="composer-mic"
                            disabled={
                              busy || (!recording && !voiceAccess.allowed)
                            }
                            aria-describedby="voice-access-status"
                            onClick={voiceStart}
                            aria-label="Record a command"
                          >
                            <Mic size={16} />
                          </button>
                          <span className="composer-mode">
                            {state.capabilities.gemma
                              ? state.capabilities.modelMode === "local"
                                ? `${state.capabilities.gemmaModel} · local`
                                : "Gemma connected"
                              : "Local planner"}
                          </span>
                          <select
                            className="composer-scope"
                            aria-label="Ticket scope"
                            value={scope}
                            onChange={(e) => setScope(e.target.value)}
                          >
                            <option value="all">All tickets</option>
                            <option value="urgent">Urgent only</option>
                            <option value="untriaged">Untriaged</option>
                          </select>
                          <button
                            className="button primary"
                            disabled={busy || !!active || !canPlan}
                            onClick={preview}
                          >
                            {busy ? (
                              <Loader2 size={15} className="spin" />
                            ) : (
                              <Sparkles size={15} />
                            )}
                            Create a plan
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      </div>
                      <div
                        id="voice-access-status"
                        className="voice-access-status"
                      >
                        {voiceError && modal?.type !== "voice" ? (
                          <p className="voice-error" role="alert">
                            {voiceError} No plan was started by this recording.
                          </p>
                        ) : voiceAccess.message ? (
                          <p role="status">{voiceAccess.message}</p>
                        ) : null}
                        {voiceError && modal?.type !== "voice" && (
                          <button
                            className="text-button"
                            onClick={() => setVoiceError(null)}
                          >
                            Dismiss voice error
                          </button>
                        )}
                        {!voiceAccess.allowed &&
                          IS_JUDGE &&
                          state.runs.length > 0 && (
                            <button
                              className="text-button"
                              onClick={() => goto("history")}
                            >
                              Open saved runs <ArrowRight size={14} />
                            </button>
                          )}
                      </div>
                      {transcript && (
                        <div className="voice-provenance">
                          <CheckCheck size={12} />
                          <span>
                            ElevenLabs transcript ·{" "}
                            {transcript.text === command
                              ? "ready to review"
                              : "edited by you"}
                          </span>
                        </div>
                      )}
                      <div className="suggestions">
                        <span>TRY</span>
                        <button
                          onClick={() => {
                            setCommand(DEFAULT_COMMAND);
                            setTranscript(null);
                            setScope("all");
                            textarea.current?.focus();
                          }}
                        >
                          Triage my queue
                          <ArrowUpRight size={12} />
                        </button>
                        <button
                          onClick={() => {
                            setTranscript(null);
                            setCommand(
                              "Prioritize urgent tickets and draft replies. Do not send without approval.",
                            );
                            setScope("urgent");
                            textarea.current?.focus();
                          }}
                        >
                          Get ahead of SLAs
                          <ArrowUpRight size={12} />
                        </button>
                      </div>
                      <div className="console-disclosure">
                        <ShieldCheck size={13} />
                        <span>
                          {state.capabilities.gemma
                            ? "Connected model, bounded by your approved plan."
                            : IS_JUDGE
                              ? state.capabilities.judge?.mode === "unclaimed"
                                ? "Choose your evaluation mode above to begin."
                                : "Rules-only demo: fixed priorities and reply templates."
                              : "Local rules are active. Connect Gemma to enable model generation."}
                        </span>
                        <button onClick={() => goto("evidence")}>
                          {IS_JUDGE ? "View evidence" : "View setup"}
                          <ArrowUpRight size={12} />
                        </button>
                      </div>
                    </div>
                    <section
                      className="workflow-card"
                      aria-label="How VOX works"
                    >
                      <div className="section-eyebrow">
                        <Workflow size={16} /> THE WAY VOX WORKS
                      </div>
                      <h3>
                        From instruction
                        <br />
                        to reviewed replies.
                      </h3>
                      <div className="workflow-steps">
                        {[
                          [
                            Mic,
                            "Ask for ticket work",
                            "Say or type: triage tickets and draft two replies.",
                          ],
                          [
                            FileText,
                            "Review the plan",
                            "Check which tickets and actions VOX will handle.",
                          ],
                          [
                            Zap,
                            "VOX prepares the queue",
                            "Priorities, labels, guidance and draft replies are saved.",
                          ],
                          [
                            Headphones,
                            "Decide on each reply",
                            "Approve or reject drafts, then hear the saved results.",
                          ],
                        ].map(([Icon, title, desc], i) => (
                          <div key={title} className="workflow-step">
                            <span>
                              <Icon size={17} />
                            </span>
                            <div>
                              <strong>{title}</strong>
                              <p>{desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="workflow-foot">
                        <ShieldCheck size={15} />
                        <span>Nothing gets sent without your say.</span>
                      </div>
                    </section>
                  </section>
                  <div className="metrics-row">
                    {[
                      [
                        Inbox,
                        "Tickets in queue",
                        state.tickets.length,
                        "Ready for a fresh set of eyes",
                        "",
                      ],
                      [
                        Activity,
                        "Need attention",
                        urgent.length,
                        state.tickets.some((t) => t.triagedAt)
                          ? "Based on saved priority scores"
                          : "Run triage to reveal priorities",
                        "attention",
                      ],
                      [
                        FileText,
                        "Reply drafts",
                        draftTotal,
                        draftTotal
                          ? `${pending.length} waiting for your review`
                          : "A little help with the right words",
                        "",
                      ],
                      [
                        CheckCheck,
                        "Updates saved",
                        actionsSaved,
                        state.runs.length
                          ? `Across ${state.runs.length} saved ${state.runs.length === 1 ? "run" : "runs"}`
                          : "Your first run starts here",
                        "",
                      ],
                    ].map(([Icon, label, value, desc, kind]) => (
                      <div key={label} className={`metric ${kind}`}>
                        <div className="metric-label">
                          <span>{label}</span>
                          <Icon size={17} />
                        </div>
                        <strong>{String(value).padStart(2, "0")}</strong>
                        <p>{desc}</p>
                      </div>
                    ))}
                  </div>
                  {active && (
                    <button
                      className="active-run-banner"
                      onClick={() => goto("operations", active.id)}
                    >
                      <Loader2 size={18} className="spin" />
                      <div>
                        <strong>Your workflow is in motion</strong>
                        <span>
                          {active.plan.steps[active.cursor]?.title}. Follow
                          every action as it happens.
                        </span>
                      </div>
                      <ArrowRight size={18} />
                    </button>
                  )}
                  <div className="bottom-grid">
                    <section className="panel queue-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            Your support queue{" "}
                            <span>{state.tickets.length}</span>
                          </h2>
                          <p>A little order for everything coming in.</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => goto("tickets")}
                        >
                          View queue
                          <ArrowUpRight size={14} />
                        </button>
                      </div>
                      <div className="queue-tabs">
                        <div>
                          {[
                            ["all", "All tickets"],
                            ["urgent", "Needs attention"],
                            ["drafted", "Drafted"],
                          ].map(([id, label]) => (
                            <button
                              className={filter === id ? "active" : ""}
                              key={id}
                              onClick={() => setFilter(id)}
                            >
                              {label}
                              {id === "urgent" && urgent.length > 0 && (
                                <span>{urgent.length}</span>
                              )}
                            </button>
                          ))}
                        </div>
                        <button
                          className="icon-button"
                          aria-label="Search tickets"
                          onClick={() => {
                            setSearchQuery("");
                            setModal({ type: "search" });
                          }}
                        >
                          <SlidersHorizontal size={16} />
                        </button>
                      </div>
                      {ticketTable(5)}
                      <div className="table-footer">
                        <span>
                          Showing {Math.min(5, filtered.length)} of{" "}
                          {filtered.length} tickets
                        </span>
                        <span>
                          <i className="mini-dot" />
                          Synthetic data
                        </span>
                      </div>
                    </section>
                    <section className="panel activity-panel">
                      <div className="panel-heading">
                        <h2>Activity</h2>
                        <span className="live-label">
                          <span />
                          LIVE
                        </span>
                      </div>
                      {state.runs.length ? (
                        <>
                          <Timeline
                            compact
                            events={state.runs[0].events.slice(-4).reverse()}
                          />
                          <button
                            className="text-button activity-link"
                            onClick={() => goto("history")}
                          >
                            View run history
                            <ArrowRight size={14} />
                          </button>
                        </>
                      ) : (
                        <div className="activity-empty">
                          <div className="activity-empty-icon">
                            <Activity size={26} />
                            <span />
                          </div>
                          <h3>
                            A quiet workspace.
                            <br />
                            For now.
                          </h3>
                          <p>
                            Your runs, saved work, and
                            <br />
                            decisions will show up here.
                          </p>
                          <span>
                            Start with your first instruction
                            <ArrowUpRight size={13} />
                          </span>
                        </div>
                      )}
                    </section>
                  </div>
                  <div className="workspace-foot">
                    <span>
                      <ShieldCheck size={14} />
                      Your workspace is isolated. All tickets are fictional.
                    </span>
                    <button onClick={() => goto("evidence")}>
                      Built for transparency
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                </motion.div>
              )}
              {view === "tickets" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">THE HELPDESK</div>
                      <h1>
                        A clearer queue<span>.</span>
                      </h1>
                      <p>Every ticket, priority, and draft in one place.</p>
                    </div>
                    <button className="button primary" onClick={newRun}>
                      <Plus size={16} />
                      Start a run
                    </button>
                  </div>
                  <div className="list-toolbar">
                    <div className="search-field">
                      <Search size={17} />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search tickets, people, or companies"
                        aria-label="Search tickets"
                      />
                    </div>
                    <select
                      aria-label="Filter tickets"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      <option value="all">All tickets</option>
                      <option value="urgent">Needs attention</option>
                      <option value="drafted">Has a draft</option>
                    </select>
                    <Badge>{filtered.length} tickets</Badge>
                  </div>
                  <section className="panel">
                    {ticketTable()}
                    <div className="table-footer">
                      <span>{filtered.length} tickets in this view</span>
                      <span>Fictional identities · Synthetic sandbox</span>
                    </div>
                  </section>
                </>
              )}
              {view === "approvals" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">THE FINAL SAY IS YOURS</div>
                      <h1>
                        A human in the loop<span>.</span>
                      </h1>
                      <p>
                        {approvalItems.length
                          ? `${approvalItems.length} ${approvalItems.length === 1 ? "reply" : "replies"} ready for a thoughtful once-over.`
                          : approvalFilter !== "all"
                            ? "This run has been reviewed. Your decisions are saved."
                            : "You’re all caught up. Nothing is waiting on you."}
                      </p>
                    </div>
                    <Badge kind="local">
                      <LockKeyhole size={13} />
                      {IS_JUDGE
                        ? "Private session approvals"
                        : state.capabilities.authenticated
                          ? "Auth0 account approvals"
                          : state.capabilities.identity
                            ? "Sign in for approvals"
                            : "Session-bound approvals"}
                    </Badge>
                  </div>
                  <div className="list-toolbar approval-toolbar">
                    <label htmlFor="approval-run">Review replies from</label>
                    <select
                      id="approval-run"
                      aria-label="Filter approvals by run"
                      value={approvalFilter}
                      onChange={(event) =>
                        goto(
                          "approvals",
                          event.target.value === "all"
                            ? null
                            : event.target.value,
                        )
                      }
                    >
                      <option value="all">All saved runs</option>
                      {state.runs
                        .filter((run) => run.metrics.drafts > 0)
                        .map((run) => (
                          <option key={run.id} value={run.id}>
                            Run {run.id.slice(0, 8)} ·{" "}
                            {run.plan.provider === "gemma" ? "Gemma" : "Local"}{" "}
                            · {run.metrics.pending} pending
                          </option>
                        ))}
                    </select>
                    <Badge>{approvalItems.length} pending</Badge>
                  </div>
                  <div className="info-strip">
                    <ShieldCheck size={18} />
                    <p>
                      Approving records a send inside this fictional helpdesk.
                      VOX never delivers an external message.
                    </p>
                  </div>
                  {approvalItems.length ? (
                    <div className="approval-grid">
                      {approvalItems.map((d) => (
                        <article className="approval-card panel" key={d.id}>
                          <div className="approval-top">
                            <Badge kind={d.ticket.priority}>
                              {d.ticket.id}
                            </Badge>
                            <span>
                              {d.provider} · {relative(d.createdAt)}
                            </span>
                          </div>
                          <h2>{d.ticket.title}</h2>
                          <div className="draft-to">
                            <span className="avatar av-2">
                              {initials(d.ticket.name)}
                            </span>
                            <span>
                              To {d.ticket.name}
                              <small>
                                {d.ticket.company} · fictional customer
                              </small>
                            </span>
                          </div>
                          <p className="draft-excerpt">{d.body}</p>
                          {d.review && (
                            <Badge
                              kind={
                                d.review.verdict === "needs_revision"
                                  ? "pending"
                                  : "local"
                              }
                            >
                              {d.review.verdict === "needs_revision"
                                ? "Ultramarine: changes suggested"
                                : "Ultramarine: ready for your review"}
                            </Badge>
                          )}
                          <div className="draft-source">
                            <BookOpen size={13} />
                            <a
                              href={d.source.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {d.source.title}
                              <ExternalLink size={11} />
                            </a>
                          </div>
                          <div className="approval-footer">
                            <span>
                              <Clock size={12} />
                              Expires{" "}
                              {new Date(d.expiresAt).toLocaleDateString()}
                            </span>
                            <button
                              className="button secondary"
                              onClick={() =>
                                setModal({ type: "approval", id: d.id })
                              }
                            >
                              Review reply
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty large">
                      <div className="empty-icon">
                        <CheckCheck size={30} />
                      </div>
                      <h2>
                        {approvalFilter !== "all"
                          ? "This run has been reviewed."
                          : "Nothing needs your approval."}
                      </h2>
                      <p>
                        {pending.length
                          ? `${pending.length} replies from other runs are still awaiting review.`
                          : "Run a workflow with reply drafting to prepare your first set of replies."}
                      </p>
                      {pending.length > 0 && (
                        <button
                          className="button secondary"
                          onClick={() => goto("approvals")}
                        >
                          Review other runs
                          <ArrowRight size={15} />
                        </button>
                      )}
                      <button className="button primary" onClick={newRun}>
                        Create a plan
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </>
              )}
              {view === "history" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">EVERY ACTION HAS A RECEIPT</div>
                      <h1>
                        Work you can look back on<span>.</span>
                      </h1>
                      <p>
                        Saved plans, real changes, and the decisions along the
                        way.
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() =>
                        window.location.assign(endpoint("evidence"))
                      }
                    >
                      <Download size={15} />
                      Export evidence
                    </button>
                  </div>
                  {state.runs.length ? (
                    <div className="run-list">
                      {state.runs.map((r) => (
                        <button
                          className="panel run-row"
                          key={r.id}
                          onClick={() => {
                            setSelectedRun(r.id);
                            goto("operations", r.id);
                          }}
                        >
                          <div className="run-icon">
                            <Workflow size={23} />
                          </div>
                          <div>
                            <div className="run-row-top">
                              <strong>Support queue workflow</strong>
                              <Badge kind={r.status} dot>
                                {statusLabel(r.status)}
                              </Badge>
                            </div>
                            <p>{r.plan.command}</p>
                            <span>
                              {relative(r.createdAt)}
                              <i />
                              {r.metrics.triaged} triaged
                              <i />
                              {r.metrics.drafts} drafts
                              <i />
                              {r.plan.provider === "local"
                                ? "Local planner"
                                : "Gemma endpoint"}
                            </span>
                          </div>
                          <ArrowUpRight size={20} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty large">
                      <div className="empty-icon">
                        <History size={30} />
                      </div>
                      <h2>Your story starts with a run.</h2>
                      <p>
                        Create a plan to turn your first instruction into saved
                        work.
                      </p>
                      <button className="button primary" onClick={newRun}>
                        Start your first run
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  )}
                </>
              )}
              {view === "operations" && (
                <>
                  {currentRun ? (
                    <>
                      <div className="page-heading">
                        <div>
                          <button
                            className="back-link"
                            onClick={() => goto("history")}
                          >
                            Run history
                            <ChevronRight size={13} />
                          </button>
                          <h1>
                            {currentRun.status === "running"
                              ? "Consider it in progress"
                              : currentRun.status === "failed"
                                ? "Let’s pick up where we left off"
                                : currentRun.status === "cancelled"
                                  ? "Ready when you are again"
                                  : currentRun.status === "completed"
                                    ? "Your support run is complete"
                                    : "Review your draft replies"}
                            <span>.</span>
                          </h1>
                          <p>
                            Run {currentRun.id.slice(0, 8)} ·{" "}
                            {relative(currentRun.createdAt)} ·{" "}
                            {currentRun.plan.provider === "local"
                              ? "Local sandbox executor"
                              : "Gemma + Mastra workflow"}
                          </p>
                        </div>
                        <Badge kind={currentRun.status} dot>
                          {statusLabel(currentRun.status)}
                        </Badge>
                      </div>
                      {currentRun.plan.input?.kind === "voice" && (
                        <div className="voice-run-origin">
                          <Mic size={13} />
                          <span>
                            ElevenLabs transcript → Gemma plan → Mastra
                            execution
                          </span>
                        </div>
                      )}
                      {state.capabilities.sentryTraceBase &&
                        currentRun.traces?.length > 0 && (
                          <div className="run-provenance">
                            {currentRun.traces
                              .filter((id) => /^[a-f0-9]{32}$/.test(id))
                              .map((id, index) => (
                                <a
                                  key={id}
                                  href={`${state.capabilities.sentryTraceBase}${id}/`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Activity size={13} /> Sentry trace{" "}
                                  {index + 1} <ArrowUpRight size={12} />
                                </a>
                              ))}
                          </div>
                        )}
                      <RunHandoff
                        run={currentRun}
                        onReview={() => goto("approvals", currentRun.id)}
                        onOpen={() => goto("evidence")}
                        openLabel="Inspect receipts"
                      />
                      <div className="run-command">
                        <span>
                          <Mic size={16} />
                          YOUR INSTRUCTION
                        </span>
                        <p>“{currentRun.plan.command}”</p>
                      </div>
                      <div className="metrics-row run-metrics">
                        {[
                          ["Triaged", currentRun.metrics.triaged],
                          ["Labels saved", currentRun.metrics.labels],
                          ["Drafts prepared", currentRun.metrics.drafts],
                          ["Awaiting approval", currentRun.metrics.pending],
                        ].map(([label, value]) => (
                          <div className="metric" key={label}>
                            <div className="metric-label">{label}</div>
                            <strong>{String(value).padStart(2, "0")}</strong>
                          </div>
                        ))}
                      </div>
                      <div className="operations-grid">
                        <section className="panel">
                          <div className="panel-heading">
                            <h2>The plan in motion</h2>
                            <span className="small-muted">
                              {currentRun.cursor}/{currentRun.plan.steps.length}{" "}
                              steps
                            </span>
                          </div>
                          <div className="execution-plan">
                            <PlanCards
                              plan={currentRun.plan}
                              execution={{
                                cursor: currentRun.cursor,
                                status: currentRun.status,
                              }}
                            />
                          </div>
                          <div className="execution-controls">
                            {currentRun.status === "running" ? (
                              <button
                                className="button danger"
                                disabled={busy}
                                onClick={() =>
                                  act(async () => {
                                    await api(
                                      `runs/${currentRun.id}/cancel`,
                                      {},
                                    );
                                    notify(
                                      "Run stopped. Previously saved changes are preserved.",
                                    );
                                  })
                                }
                              >
                                <Square size={14} />
                                Stop run
                              </button>
                            ) : ["failed", "cancelled"].includes(
                                currentRun.status,
                              ) ? (
                              <button
                                className="button primary"
                                disabled={busy}
                                onClick={() =>
                                  act(() =>
                                    api(`runs/${currentRun.id}/resume`, {}),
                                  )
                                }
                              >
                                <RefreshCw size={15} />
                                Resume from checkpoint
                              </button>
                            ) : (
                              <span>
                                <ShieldCheck size={15} />
                                No external messages sent
                              </span>
                            )}
                            <span>
                              {currentRun.workflow
                                ? `Mastra · ${currentRun.workflow.status}`
                                : "Local checkpoint"}
                            </span>
                          </div>
                        </section>
                        <section className="panel">
                          <div className="panel-heading">
                            <h2>Action timeline</h2>
                            <Badge>{currentRun.metrics.retries} retries</Badge>
                          </div>
                          <Timeline events={currentRun.events} />
                        </section>
                      </div>
                      {currentRun.briefing && (
                        <div className="briefing-card">
                          <div className="briefing-mark">
                            <Headphones size={27} />
                          </div>
                          <div>
                            <div className="eyebrow">
                              YOUR BRIEFING{" "}
                              {state.capabilities.speech ? "· ELEVENLABS" : ""}
                            </div>
                            <h2>Here’s where things stand.</h2>
                            <p>{currentRun.briefing}</p>
                            <span>
                              Time saved: not measured. No manual baseline has
                              been recorded.
                            </span>
                          </div>
                          <button
                            className="button primary"
                            disabled={
                              busy || state.capabilities.modelMode === "local"
                            }
                            onClick={() => playBriefing(currentRun)}
                          >
                            {speechLoading ? (
                              <Loader2 size={16} className="spin" />
                            ) : playing ? (
                              <Pause size={16} />
                            ) : (
                              <Volume2 size={16} />
                            )}{" "}
                            {state.capabilities.modelMode === "local"
                              ? "Voice skipped in local mode"
                              : speechLoading
                                ? "Cancel audio"
                                : playing
                                  ? "Stop briefing"
                                  : "Play briefing"}
                          </button>
                        </div>
                      )}
                      {currentRun.metrics.pending > 0 && (
                        <div className="approval-nudge">
                          <ShieldCheck size={23} />
                          <div>
                            <h3>The last step belongs to you.</h3>
                            <p>
                              {currentRun.metrics.pending} drafted replies need
                              your approval before a simulated send.
                            </p>
                          </div>
                          <button
                            className="button secondary"
                            onClick={() => goto("approvals", currentRun.id)}
                          >
                            Review replies
                            <ArrowRight size={15} />
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="empty large">
                      <Workflow size={30} />
                      <h2>No run selected.</h2>
                      <button className="button primary" onClick={newRun}>
                        Start a run
                      </button>
                    </div>
                  )}
                </>
              )}
              {view === "evidence" && (
                <>
                  <div className="page-heading">
                    <div>
                      <div className="eyebrow">PROOF BEFORE PROMISES</div>
                      <h1>
                        See what VOX actually did<span>.</span>
                      </h1>
                      <p>
                        A clear account of what is running, what is connected,
                        and what still needs proof.
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() =>
                        window.location.assign(endpoint("evidence"))
                      }
                    >
                      <Download size={15} />
                      Export JSON
                    </button>
                  </div>
                  <div className="sdk-proof-strip">
                    <span className="sdk-vercel-mark">▲</span>
                    <div>
                      <strong>
                        Built with Vercel AI SDK {state.capabilities.aiSdk}
                      </strong>
                      <p>
                        Structured outputs, streaming plan cards, and validation
                        before execution.{" "}
                        {state.capabilities.gemma
                          ? state.capabilities.modelMode === "local"
                            ? "Local Gemma endpoint configured; cloud calls disabled."
                            : "Gemma endpoint configured."
                          : "No model endpoint is connected. The local planner is active."}
                      </p>
                    </div>
                    <Badge>Schema-driven UI</Badge>
                  </div>
                  <div className="evidence-summary">
                    <div className="panel evidence-local">
                      <span className="evidence-icon">
                        <CheckCheck size={24} />
                      </span>
                      <div>
                        <h2>Working in this workspace</h2>
                        <p>
                          {state.capabilities.storage || "SQLite"} persistence,
                          bounded planning, ticket scoring, saved labels,
                          drafts, approvals, checkpoints and idempotent retries.
                        </p>
                        <Badge kind="local">Saved operational state</Badge>
                      </div>
                    </div>
                    <div className="panel evidence-local">
                      <span className="evidence-icon neutral">
                        <Layers size={24} />
                      </span>
                      <div>
                        <h2>Connections and observed requests</h2>
                        <p>
                          {state.capabilities.modelMode === "local"
                            ? "Mastra runs the approved plan. Local model requests and skipped external steps are recorded separately; skipped steps do not count as successful requests."
                            : "Mastra runs the approved plan. The receipts below show which external services this workspace called. A configured connection alone is not proof of a successful request or prize eligibility."}
                        </p>
                        <Badge>Request evidence, not prize certification</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Integration readiness</h2>
                        <p>
                          Local features do not stand in for provider proof.
                        </p>
                      </div>
                      <Badge>
                        {
                          state.receipts.filter((r) => r.status !== "skipped")
                            .length
                        }{" "}
                        request receipts
                      </Badge>
                    </div>
                    <div className="integration-grid">
                      {state.integrations.map((p) => (
                        <div className="integration" key={p.id}>
                          <span
                            className={`integration-monogram ${p.id === "gemma" ? "accent" : ""}`}
                          >
                            {p.name.slice(0, 1)}
                          </span>
                          <div>
                            <strong>{p.name}</strong>
                            <p>{p.role}</p>
                            {p.evidence?.startsWith(
                              "https://github.com/himanshu748/vox-zero-touch-os/",
                            ) && (
                              <a
                                href={p.evidence}
                                target="_blank"
                                rel="noreferrer"
                                className="development-proof"
                              >
                                View development evidence{" "}
                                <ArrowUpRight size={11} />
                              </a>
                            )}
                          </div>
                          <div>
                            <Badge
                              kind={
                                p.status === "configured" ? "configured" : ""
                              }
                            >
                              {p.status === "local"
                                ? "Running locally"
                                : p.status === "configured"
                                  ? "Configured"
                                  : p.status === "skipped in local mode"
                                    ? "Skipped in local mode"
                                    : "Not connected"}
                            </Badge>
                            {p.proofCount > 0 && (
                              <small>{p.proofCount} request receipts</small>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {state.receipts.length > 0 && (
                    <div className="panel receipt-panel">
                      <div className="panel-heading">
                        <h2>
                          {state.capabilities.modelMode === "local"
                            ? "Local requests and skipped steps"
                            : "Actual provider requests"}
                        </h2>
                      </div>
                      {state.receipts.map((r) => (
                        <div className="receipt" key={r.id}>
                          <strong>{r.provider}</strong>
                          <span>{r.model || r.operation}</span>
                          <span>
                            {r.status === "skipped"
                              ? "No request"
                              : r.latencyMs == null
                                ? "Latency unavailable"
                                : `${r.latencyMs} ms`}
                          </span>
                          <span>
                            {r.status === "skipped"
                              ? "Not called"
                              : typeof r.cost === "number"
                                ? `Est. $${r.cost.toFixed(5)}`
                                : "Cost unavailable"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="info-strip">
                    <BookOpen size={18} />
                    <p>
                      Playbook URLs are checked-in references. They are not live
                      research receipts. Priority scores show their rules and,
                      when enabled, TabPFN estimates from authored synthetic
                      scenarios.
                    </p>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="app-footer">
          <span>
            <Logo small />A little less work. A little more life.
          </span>
          <span>
            VOX · Built in the open <span className="footer-dot">·</span>{" "}
            Synthetic sandbox
          </span>
        </footer>
      </div>
      <AnimatePresence>
        {modal && (
          <Modal
            title={
              {
                planning: "Your goal is taking shape.",
                plan: "A plan, before a single action.",
                ticket: "Ticket details",
                approval: "One reply. Your decision.",
                voice: "Start with your voice.",
                settings: "Make this workspace yours.",
                docs: "A little context goes a long way.",
                search: "Find something in your workspace.",
              }[modal.type]
            }
            subtitle={
              modal.type === "plan"
                ? "Review the scope and boundaries. Execution starts only when you approve this plan."
                : modal.type === "voice"
                  ? "Your microphone is only active when you choose to record."
                  : null
            }
            onClose={() => {
              if (modal.type === "planning") {
                cancelPlanning();
                return;
              }
              if (modal.type === "voice") {
                voiceRequest.current?.abort();
                setVoicePhase(null);
                setBusy(false);
              }
              if (recording) {
                recordRef.current.discard = true;
                recordRef.current?.stop();
              }
              setModal(null);
            }}
            wide={["planning", "plan", "ticket", "docs"].includes(modal.type)}
          >
            {modal.type === "planning" && (
              <>
                <div className="plan-instruction">“{command}”</div>
                <div className="plan-meta">
                  <Badge kind="local">
                    {state.capabilities.gemma
                      ? "Gemma via Vercel AI SDK"
                      : "Local rules mode"}
                  </Badge>
                  {transcript && <Badge>Voice transcript</Badge>}
                  <Badge>No changes made</Badge>
                </div>
                <PlanCards intent={planStream.object} loading />
                <div className="modal-actions">
                  <button className="button secondary" onClick={cancelPlanning}>
                    Cancel planning
                  </button>
                </div>
              </>
            )}
            {modal.type === "plan" && plan && (
              <>
                <div className="plan-meta">
                  <Badge kind="local">
                    {plan.ticketIds.length} synthetic tickets
                  </Badge>
                  <Badge>
                    {plan.provider === "local-model"
                      ? "Local open-weight Gemma"
                      : plan.provider === "local"
                        ? "Local rules planner"
                        : "Configured Gemma endpoint"}
                  </Badge>
                  <Badge>{plan.estimatedCalls} estimated model calls</Badge>
                  {plan.normalization && (
                    <Badge>
                      {plan.normalization.provider} intent ·{" "}
                      {plan.normalization.drafts}{" "}
                      {plan.normalization.drafts === 1 ? "draft" : "drafts"}
                    </Badge>
                  )}
                  {plan.maxKnowledgeCalls > 0 && (
                    <Badge>
                      Up to {plan.maxKnowledgeCalls} Tiger hybrid searches
                    </Badge>
                  )}
                  {plan.maxPredictionCalls > 0 && (
                    <Badge>
                      1 TabPFN batch · ceiling{" "}
                      {plan.maxPredictionTokens.toLocaleString()} tokens
                    </Badge>
                  )}
                  {plan.maxReviewCalls > 0 && (
                    <Badge>
                      Up to {plan.maxReviewCalls} Ultramarine reviews
                    </Badge>
                  )}
                  {plan.maxSearchCalls > 0 && (
                    <Badge>Up to {plan.maxSearchCalls} web searches</Badge>
                  )}
                  {(plan.maxBrowserActions ?? plan.maxBrowserModelCalls) >
                    0 && (
                    <Badge>
                      Up to{" "}
                      {plan.maxBrowserActions ?? plan.maxBrowserModelCalls}{" "}
                      browser actions
                    </Badge>
                  )}
                  {plan.memory && (
                    <Badge>Backboard reply preference recalled</Badge>
                  )}
                  {plan.input?.kind === "voice" && (
                    <Badge>
                      ElevenLabs voice {plan.input.edited ? "· edited" : ""}
                    </Badge>
                  )}
                </div>
                <div className="plan-instruction">“{plan.command}”</div>
                <PlanCards plan={plan} />
                <div className="plan-guardrails">
                  <ShieldCheck size={20} />
                  <div>
                    <strong>The boundaries stay put.</strong>
                    <p>{plan.boundaries.join(" · ")}</p>
                    <small>
                      {plan.injectFailure
                        ? "Recovery demo enabled: safe pre-write retry checks are active."
                        : "Recovery demo disabled."}{" "}
                      Gemma call ceiling: {plan.maxProviderCalls}. Additional
                      provider limits are shown above. Costs are estimates where
                      available.
                    </small>
                  </div>
                </div>
                <div className="modal-actions">
                  <button
                    className="button secondary"
                    onClick={() => setModal(null)}
                  >
                    Edit instruction
                  </button>
                  <button
                    className="button primary"
                    onClick={startRun}
                    disabled={busy}
                  >
                    {busy ? (
                      <Loader2 size={16} className="spin" />
                    ) : (
                      <Play size={15} />
                    )}
                    Approve & start run
                  </button>
                </div>
              </>
            )}
            {modal.type === "ticket" &&
              (() => {
                const t = state.tickets.find((t) => t.id === modal.id);
                return (
                  <>
                    <div className="ticket-detail-title">
                      <Badge>{t.id}</Badge>
                      <Badge kind={t.priority}>
                        {t.triagedAt ? statusLabel(t.priority) : "Untriaged"}
                      </Badge>
                      <h3>{t.title}</h3>
                      <div className="draft-to">
                        <span className="avatar av-1">{initials(t.name)}</span>
                        <span>
                          {t.name}
                          <small>{t.company} · fictional customer</small>
                        </span>
                        <span className="push-right sla">
                          <Clock size={13} />
                          {sla(t)}
                        </span>
                      </div>
                    </div>
                    <div className="message-body">{t.body}</div>
                    {t.browserNote && (
                      <div className="detail-section">
                        <h4>Browserbase review</h4>
                        <p>{t.browserNote}</p>
                        <small>
                          Saved through the hosted helpdesk UI by Stagehand.
                        </small>
                      </div>
                    )}
                    <div className="tags">
                      {t.tags.map((tag) => (
                        <Badge key={tag}>{tag}</Badge>
                      ))}
                    </div>
                    {t.triagedAt && (
                      <div className="detail-section">
                        <h4>Why this priority</h4>
                        <p>{t.reasons.join(" · ")}</p>
                        <small>
                          Score {t.score}/100 ·{" "}
                          {t.escalation
                            ? "SLA rules + synthetic TabPFN estimate"
                            : "Deterministic rules v1"}{" "}
                          · {new Date(t.triagedAt).toLocaleString()}
                        </small>
                      </div>
                    )}
                    {t.notes.length > 0 && (
                      <div className="detail-section">
                        <h4>Internal notes</h4>
                        {t.notes.map((n) => (
                          <p key={n.id}>{n.body}</p>
                        ))}
                      </div>
                    )}
                    <div className="detail-section">
                      <h4>
                        Reply drafts <span>{t.drafts.length}</span>
                      </h4>
                      {t.drafts.length ? (
                        t.drafts.map((d) => (
                          <div key={d.id} className="ticket-draft">
                            <Badge kind={d.status}>
                              {statusLabel(d.status)}
                            </Badge>
                            <p>{d.body}</p>
                            <DraftReview review={d.review} />
                            <a
                              href={d.source.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {d.source.title}
                              <ExternalLink size={12} />
                            </a>
                            {d.status === "pending" && (
                              <button
                                className="button secondary"
                                onClick={() =>
                                  setModal({ type: "approval", id: d.id })
                                }
                              >
                                Review this draft
                                <ArrowRight size={14} />
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="small-muted">
                          No drafts yet. Ask VOX to draft replies in your next
                          run.
                        </p>
                      )}
                    </div>
                  </>
                );
              })()}
            {modal.type === "approval" &&
              (() => {
                const d = pending.find((d) => d.id === modal.id);
                return d ? (
                  <>
                    <div className="approval-top">
                      <Badge>{d.ticket.id}</Badge>
                      <Badge kind="pending">Approval required</Badge>
                    </div>
                    <h3 className="approval-title">{d.ticket.title}</h3>
                    <div className="action-diff">
                      <div>
                        <span>FROM</span>
                        <strong>Saved draft</strong>
                      </div>
                      <ArrowRight size={20} />
                      <div>
                        <span>TO</span>
                        <strong>Simulated sent reply</strong>
                      </div>
                    </div>
                    <div className="message-body">{d.body}</div>
                    <DraftReview review={d.review} />
                    <div className="draft-source">
                      <BookOpen size={14} />
                      <a href={d.source.url} target="_blank" rel="noreferrer">
                        {d.source.title}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                    <p className="small-muted">
                      {d.source.kind}. {d.confidence}. Expires{" "}
                      {new Date(d.expiresAt).toLocaleString()}.
                    </p>
                    <div className="info-strip">
                      <LockKeyhole size={18} />
                      <p>
                        {IS_JUDGE
                          ? "Only your private judge session can decide this action. Every decision is single-use; nothing is delivered externally."
                          : state.capabilities.authenticated
                            ? "Only this authenticated Auth0 account can decide this action. Every decision is single-use."
                            : state.capabilities.identity
                              ? "Sign in with the authorized Auth0 account to decide this action."
                              : "Only your isolated guest session can decide this action. This is local session authorization."}
                      </p>
                    </div>
                    <div className="modal-actions">
                      <button
                        disabled={busy}
                        className="button secondary"
                        onClick={() => decide(d.id, "reject")}
                      >
                        <X size={15} />
                        Reject & keep draft
                      </button>
                      <button
                        disabled={busy}
                        className="button primary"
                        onClick={() => decide(d.id, "approve")}
                      >
                        <Check size={15} />
                        Approve sandbox send
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty">
                    <Check size={24} />
                    <h3>This reply has been reviewed.</h3>
                    <button
                      className="button secondary"
                      onClick={() => setModal(null)}
                    >
                      Close
                    </button>
                  </div>
                );
              })()}
            {modal.type === "voice" && (
              <div className="voice-modal">
                <div className={`record-disc ${recording ? "recording" : ""}`}>
                  <Mic size={32} />
                </div>
                <h3>
                  {voicePhase === "transcribing"
                    ? "Turning your voice into words."
                    : voicePhase === "requesting"
                      ? "Waiting for microphone access."
                      : recording
                        ? "Listening. Take your time."
                        : "A goal in your own words."}
                </h3>
                <p>
                  {recording
                    ? `Recording stops automatically after ${VOICE_SECONDS} seconds. Stop when you’re ready.`
                    : state.capabilities.elevenlabs
                      ? `Record up to ${VOICE_SECONDS} seconds. Your audio is sent to ElevenLabs for transcription. VOX does not save the recording. Provider retention follows your account terms.`
                      : "ElevenLabs is not connected in this workspace. Add the server credentials to enable recording and transcription. Text commands work now."}
                </p>
                {voiceError && (
                  <p className="voice-error" role="alert">
                    {voiceError} No plan was started by this recording.
                  </p>
                )}
                {!voiceAccess.allowed && (
                  <p role="status">{voiceAccess.message}</p>
                )}
                {recording ? (
                  <>
                    <Waveform recording levels={levelNodes} />
                    <button
                      className="button primary"
                      onClick={() => recordRef.current?.stop()}
                    >
                      <Square size={15} />
                      Stop & transcribe
                    </button>
                  </>
                ) : (
                  <>
                    <label className="consent">
                      <input
                        type="checkbox"
                        checked={voiceConsent}
                        onChange={(e) => setVoiceConsent(e.target.checked)}
                        disabled={!voiceAccess.allowed}
                      />
                      I agree to send this recording to ElevenLabs.
                    </label>
                    <button
                      className="button primary"
                      disabled={
                        !voiceConsent ||
                        !state.capabilities.elevenlabs ||
                        !voiceAccess.allowed ||
                        busy ||
                        voicePhase === "requesting"
                      }
                      onClick={record}
                    >
                      {busy ? (
                        <Loader2 className="spin" size={15} />
                      ) : (
                        <Mic size={16} />
                      )}
                      Start recording
                    </button>
                    {state.capabilities.elevenlabs && (
                      <label
                        className={`voice-upload ${!voiceConsent || busy ? "disabled" : ""}`}
                      >
                        <input
                          type="file"
                          accept="audio/*,.wav,.mp3,.m4a,.ogg,.webm"
                          aria-label="Upload a voice command"
                          disabled={
                            !voiceConsent ||
                            !voiceAccess.allowed ||
                            busy ||
                            voicePhase === "requesting"
                          }
                          onChange={uploadVoice}
                        />
                        <span>
                          <Download size={14} /> Or upload an audio command
                        </span>
                        <small>
                          Up to {VOICE_SECONDS} seconds · {IS_JUDGE ? 2 : 8} MB
                          · Audio is not saved
                        </small>
                      </label>
                    )}
                    {voicePhase === "transcribing" && (
                      <p role="status">
                        <Loader2 size={14} className="spin" /> Transcribing with
                        ElevenLabs…
                      </p>
                    )}
                    <button
                      className="text-button"
                      disabled={busy || voicePhase === "requesting"}
                      onClick={() => {
                        setModal(null);
                        goto("overview");
                        setTimeout(() => textarea.current?.focus(), 100);
                      }}
                    >
                      Use a text command
                      <ArrowRight size={14} />
                    </button>
                  </>
                )}
              </div>
            )}
            {modal.type === "settings" && prefs && (
              <>
                <div className="settings-section">
                  <label htmlFor="reply-style">Your reply style</label>
                  <p>
                    Used by local templates and passed to configured Gemma
                    inference. Saved in this workspace.
                  </p>
                  <select
                    id="reply-style"
                    value={prefs.style}
                    onChange={(e) =>
                      setPrefs({ ...prefs, style: e.target.value })
                    }
                  >
                    <option value="concise">Concise and clear</option>
                    <option value="friendly">Warm and friendly</option>
                    <option value="detailed">Detailed and thorough</option>
                  </select>
                </div>
                <div className="settings-toggle">
                  <div>
                    <strong>Show a recoverable failure</strong>
                    <p>
                      Interrupt one label activity before its write, then retry
                      from the checkpoint.
                    </p>
                  </div>
                  <button
                    className={`toggle ${prefs.injectFailure ? "on" : ""}`}
                    role="switch"
                    aria-checked={prefs.injectFailure}
                    aria-label="Inject a recoverable failure"
                    onClick={() =>
                      setPrefs({
                        ...prefs,
                        injectFailure: !prefs.injectFailure,
                      })
                    }
                  >
                    <span />
                  </button>
                </div>
                <div className="settings-section">
                  <label htmlFor="scope">
                    Default scope for your next plan
                  </label>
                  <select
                    id="scope"
                    value={prefs.scope}
                    onChange={(e) =>
                      setPrefs({ ...prefs, scope: e.target.value })
                    }
                  >
                    <option value="all">All pending tickets</option>
                    <option value="urgent">Urgent tickets only</option>
                    <option value="untriaged">Untriaged tickets only</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        await api("preferences", prefs);
                        setScope(prefs.scope);
                        setModal(null);
                        notify("Your preferences are saved for the next run.");
                      })
                    }
                  >
                    <Check size={15} />
                    Save preferences
                  </button>
                </div>
                <div className="reset-section">
                  <h3>A fresh start</h3>
                  <p>
                    Clear your transcript history, plans, runs, drafts,
                    decisions, and preferences. Recreate the 24 fictional
                    tickets.
                  </p>
                  {confirmReset ? (
                    <div className="reset-confirm">
                      <span>This permanently clears your sandbox records.</span>
                      <button
                        className="button danger"
                        disabled={busy || !!active}
                        onClick={() =>
                          act(async () => {
                            await api("reset", {});
                            setCommand("");
                            setTranscript(null);
                            setScope("all");
                            setConfirmReset(false);
                            setSelectedRun(null);
                            setModal(null);
                            goto("overview");
                            notify(
                              "Your sandbox is fresh. All previous workspace records were cleared.",
                            );
                          })
                        }
                      >
                        Clear & reset workspace
                      </button>
                      <button
                        className="text-button"
                        onClick={() => setConfirmReset(false)}
                      >
                        Keep my workspace
                      </button>
                    </div>
                  ) : (
                    <button
                      className="button secondary"
                      disabled={!!active}
                      onClick={() => setConfirmReset(true)}
                    >
                      <RefreshCw size={14} />
                      Reset demo workspace
                    </button>
                  )}
                  {active && (
                    <small>Stop the active workflow before resetting.</small>
                  )}
                </div>
              </>
            )}
            {modal.type === "search" && (
              <>
                <div className="search-field modal-search">
                  <Search size={18} />
                  <input
                    autoFocus
                    aria-label="Search workspace tickets"
                    placeholder="Search ticket titles, people, or companies…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="search-results">
                  {searchResults.slice(0, 8).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setModal({ type: "ticket", id: t.id })}
                    >
                      <Ticket size={17} />
                      <span>
                        <small>
                          {t.id} · {t.company}
                        </small>
                        <strong>{t.title}</strong>
                      </span>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                  {!searchResults.length && (
                    <div className="empty">
                      <Search size={24} />
                      <p>No matches. Try another keyword.</p>
                    </div>
                  )}
                </div>
              </>
            )}
            {modal.type === "docs" && (
              <div className="docs-content">
                <div className="docs-intro">
                  <Logo />
                  <h3>
                    A support assistant
                    <br />
                    you can direct by voice.
                  </h3>
                  <p>
                    VOX reads support tickets, prioritizes urgent work, looks up
                    guidance and drafts replies. You check the plan before it
                    runs and decide on each reply. Try it here with 24 fictional
                    tickets and simulated sends.
                  </p>
                </div>
                <div className="docs-grid">
                  {[
                    [
                      "01",
                      "Give it a goal",
                      "Choose a live pass for AI and voice, or the rules-only demo for templates. Ask to triage tickets and draft two replies.",
                    ],
                    [
                      "02",
                      "Approve a clear plan",
                      "Read the ticket scope, action list, provider mode, and boundaries before starting.",
                    ],
                    [
                      "03",
                      "Follow the saved work",
                      "Watch priorities, internal labels and drafts update. Saved checkpoints let interrupted work resume.",
                    ],
                    [
                      "04",
                      "Keep the final say",
                      "Review every proposed simulated reply. Rejection keeps the draft and sends nothing.",
                    ],
                  ].map(([n, title, body]) => (
                    <div key={n}>
                      <span>{n}</span>
                      <h4>{title}</h4>
                      <p>{body}</p>
                    </div>
                  ))}
                </div>
                <div className="info-strip">
                  <ShieldCheck size={19} />
                  <p>
                    {state.capabilities.gemma
                      ? `Gemma ${state.capabilities.gemmaModel} generates plans and replies.`
                      : "The planner is using deterministic local rules."}{" "}
                    {state.capabilities.elevenlabs
                      ? "ElevenLabs handles transcription and spoken briefings."
                      : "ElevenLabs requires server configuration."}{" "}
                    Mastra orchestrates the saved execution steps.{" "}
                    {state.capabilities.temporal
                      ? "Temporal schedules durable execution. "
                      : ""}
                    {state.capabilities.identity
                      ? "Auth0 protects signed-in actions. "
                      : ""}
                    The evidence view reports each provider’s current
                    configuration and actual requests.
                  </p>
                </div>
                <div className="modal-actions">
                  <button
                    className="button secondary"
                    onClick={() => {
                      setModal(null);
                      goto("evidence");
                    }}
                  >
                    Inspect the evidence
                    <ArrowUpRight size={14} />
                  </button>
                  <button
                    className="button primary"
                    onClick={() => {
                      setModal(null);
                      setCommand(DEFAULT_COMMAND);
                      setTranscript(null);
                      goto("overview");
                      setTimeout(() => textarea.current?.focus(), 100);
                    }}
                  >
                    Try your first instruction
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </Modal>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            role={toast.kind === "error" ? "alert" : "status"}
            className={`toast ${toast.kind}`}
            initial={reduceMotion ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          >
            {toast.kind === "error" ? (
              <XCircle size={18} />
            ) : (
              <Check size={18} />
            )}
            <span>{toast.message}</span>
            <button
              aria-label="Dismiss message"
              className="icon-button"
              onClick={() => setToast(null)}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
