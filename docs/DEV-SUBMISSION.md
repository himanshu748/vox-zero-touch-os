---
title: "VOX: I asked for two support replies. Then I turned the server off."
tags: devchallenge, hf26challenge
published: true
---

_This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19)._

## What I Built

**Give VOX the queue. Approve the plan. Come back to two decisions.**

I built VOX because a few small unfinished tasks can keep me from sleeping. I wanted to delegate the preparation, know what had finished, and return when something needed my judgment.

Support is the first working workflow. Give VOX this instruction by voice or text:

> Triage all support tickets, research fixes, tag urgent ones, and draft two replies. Ask me before sending anything.

It proposes a plan. After approval, VOX prioritizes the queue, retrieves guidance, saves internal labels and prepares two replies. Each reply waits for its own approve-or-reject decision. The human work is concentrated at three gates: one plan approval and two reply decisions.

Then I stopped the hosted server with both replies waiting.

When it came back, VOX resumed the same execution. The replies were still waiting, and completed provider requests were not repeated. That was the test I needed before calling this work I could step away from. [Restart evidence](https://github.com/himanshu748/vox-zero-touch-os/blob/ba10b92506f57d39bd15f9fb2675af6cd692d3ec/docs/evidence/hosted-expansion.json).

The public preview uses **24 fictional tickets and simulated sends**. It has no connection to a customer inbox. Its model requests, saved workspace changes and workflow history are real.

[Try VOX](https://getvox.tech/judge) · [Source code](https://github.com/himanshu748/vox-zero-touch-os) · [Judge guide](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/JUDGES.md)

## Why Does Open Innovation Matter?

Open weights let me run the core workflow on my own machine and adapt one model to a narrower job.

With `VOX_MODEL_MODE=local`, Gemma 3 4B handles intent normalization, planning and reply drafting through Ollama and the Vercel AI SDK. Deterministic rules calculate SLA priority; the model does the language work. The same server-side approval checks still apply.

Local research uses checked-in playbooks. External search, voice, browser automation and the other cloud integrations leave explicit “skipped in local mode” receipts. VOX does not load its hosted credentials or silently switch to cloud inference when a local request fails. [Local implementation and setup](https://github.com/himanshu748/vox-zero-touch-os/blob/ba10b92506f57d39bd15f9fb2675af6cd692d3ec/docs/LOCAL.md).

I also used Tinker to train a Qwen3-8B LoRA for hosted intent extraction: 53 synthetic training examples, a rank-8 adapter and 12 epochs. On 16 held-out commands:

| Measurement | Base Qwen3-8B | With adapter |
| --- | ---: | ---: |
| Exact intent matches | 12/16 | 16/16 |
| Output tokens | 320 | 240 |
| Median latency | 2,385 ms | 7,870 ms |

The adapter improved this small test and used fewer output tokens. It also took more than three times as long. That tradeoff belongs next to the accuracy result. This is a narrow intent experiment, separate from the local Gemma planner evaluation below. [Training and evaluation receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/ba10b92506f57d39bd15f9fb2675af6cd692d3ec/docs/evidence/tinker-evaluation.json).

The cloud path makes the connected workflow available from a browser without asking each evaluator to install models or provide API keys. The local path lets a developer inspect and run the core with their own model. Both stop at the same human gates.

## The Lazy Payoff

On a MacBook Air M4 with 16 GB of memory, the local Gemma workflow produced:

| Same 24-ticket synthetic queue | Recorded result |
| --- | --- |
| Preparation, model initially unloaded | 25.09 s |
| Preparation across 10 resident-model runs | 10/10 completed; p50 17.19 s |
| Slowest of those 10 runs | 31.97 s |
| Saved output | 24 triaged, 7 labels, 2 drafts |
| Required human gates | 1 plan approval + 2 reply decisions |

Preparation includes intent normalization, planning and work up to the two pending drafts. Application startup and human reading, corrections and decisions are excluded. The ten-run report uses nearest-rank percentiles; with ten samples, its p95 is the slowest observed run.

In the initially unloaded run, understanding and planning took 20.99 seconds and drafting took 3.86 seconds. The application recorded only loopback HTTP destinations. This measures VOX's application requests, not all traffic on the computer.

[Single-run receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/ba10b92506f57d39bd15f9fb2675af6cd692d3ec/docs/evidence/lazy-payoff.json) · [Ten-run measurements](https://github.com/himanshu748/vox-zero-touch-os/blob/ba10b92506f57d39bd15f9fb2675af6cd692d3ec/docs/evidence/local-performance.json)

One local draft was generic and needed editing. I have measured preparation, not total human time saved. The demonstrated payoff is a prepared queue and two reviewable replies waiting together; the full benefit still depends on the work needed to correct them.

## Demo

{% embed https://www.youtube.com/watch?v=K9MYbrX1T74 %}

The 2:25 walkthrough uses edited captures of the real hosted workflow and a local run, with AI-generated narration. It predates the latest visual refresh. Waiting time is trimmed; the receipts supply the measurements.

**[Open the judge workspace](https://getvox.tech/judge). No account or API key is required.**

1. If offered, choose **Start live evaluation**. The page displays available passes.
2. Say, upload or type the instruction above. Use fictional inputs only.
3. Read and approve the plan. Inspect both replies, approve one and reject the other.
4. Open the briefing and **Evidence export** to inspect the saved actions and provider receipts.

A live pass lasts 24 hours. Within an active pass, plans, voice uploads and briefings can be repeated, subject to provider quotas. The shared pool remains capped at eight passes. An expired pass retains saved work; use **Switch to rules-only demo** to continue exploring without providers. If no new passes remain, use **Try rules-only demo**.

| Mode | What runs |
| --- | --- |
| Hosted live | Connected providers, saved workspace state and Temporal-backed execution |
| Local Gemma | Real local understanding, planning and drafting; cloud integrations explicitly skipped |
| Rules-only demo | Fixed priorities and reply templates; no live model inference |

The October 21 hosted verification used a recorded voice file, public HTTP endpoints and scripted decisions. It completed **24 triages, 7 labels, 2 drafts, 1 simulated send and 1 rejection**, with 16 successful receipts across nine providers. Mastra succeeded and Temporal completed with 21 events. Replaying the briefing returned identical cached audio without another generation.

That provider test ran on commit `22fcfa4`; browser checks were separate. It establishes the recorded-audio pipeline, not a physical microphone or speaker test. [Full hosted receipt and method](https://github.com/himanshu748/vox-zero-touch-os/blob/ba10b92506f57d39bd15f9fb2675af6cd692d3ec/docs/evidence/hosted-ultramarine-verification.json).

## How I Built It

### A valid plan still needs a human

The Vercel AI SDK streams structured output into fixed React action cards. Partial output cannot execute work, and the model never supplies executable tool code. The server checks reply ownership, status and expiry, and rejects duplicate decisions.

Local Gemma produced valid JSON in **30/30 cases**, but selected the exact requested actions in **19/30**. A prompt change improved that action score from 11/30 on the same fixed regression set. Valid structure clearly did not establish correct interpretation. The plan remains visible for approval. [Planner evaluation](https://github.com/himanshu748/vox-zero-touch-os/blob/ba10b92506f57d39bd15f9fb2675af6cd692d3ec/docs/evidence/planning-evaluation.json).

My earlier projects, [ToolTrap](https://dev.to/himanshu_748/tooltrap-tool-results-are-data-wasnt-enough-25oh) and [EmbodiWeave](https://dev.to/himanshu_748/embodiweave-my-agent-read-its-own-failure-and-repeated-it-so-i-made-the-graph-enforce-it-4cd9), led me to put permission checks in the executor. VOX's model can propose a reply; it cannot grant permission to send it.

### Recovery needs a record of the request

Mastra coordinates named steps and pauses for review. Temporal preserves hosted execution across restarts. VOX adds a reservation before a provider request because a server can die after the provider finishes but before the result is saved.

The guard in `server/provider-task.mjs` is small:

```js
const saved = current()?.providerTasks?.[key];
if (saved?.status === "completed") return saved.result;
if (saved)
  throw new Error(
    "This provider request already started without a saved result. Automatic replay is blocked.",
  );
```

VOX persists the reservation before calling the provider and the result before moving on. A completed request reuses its saved result. An uncertain request stops for intervention. This sacrifices automatic recovery in an ambiguous case rather than risking a duplicate billable effect; it provides no general exactly-once guarantee for external APIs. [Implementation](https://github.com/himanshu748/vox-zero-touch-os/blob/ba10b92506f57d39bd15f9fb2675af6cd692d3ec/server/provider-task.mjs).

The restart test exercised completed-result reuse. The two pending decisions and the completed request records survived in the same execution.

### Fixing the retry that looked like broken voice

An earlier judge session allowed only one voice upload. After it was used, the interface could show “This live pass has used its voice upload,” preventing another attempt.

The current release removes per-pass ceilings for plans, transcription and briefings. Usage counters, pass expiry, provider reservations, per-run bounds and reply approvals remain. A new intentional request and automatic replay of an uncertain request are handled separately.

The regression check exercised an injected transcription success, a deliberate failure and a successful recovery, plus reload, keyboard controls and a 390px layout. It made zero external HTTP attempts. Those are local regression results, separate from the real hosted provider test. [Regression evidence](https://github.com/himanshu748/vox-zero-touch-os/blob/ba10b92506f57d39bd15f9fb2675af6cd692d3ec/docs/evidence/judge-repeat-requests.json).

Release [`ba10b92`](https://github.com/himanshu748/vox-zero-touch-os/commit/ba10b92506f57d39bd15f9fb2675af6cd692d3ec) passed **62 tests, typecheck and the production build**. [CI result](https://github.com/himanshu748/vox-zero-touch-os/actions/runs/39649058667).

### Retrieval and a second reviewer provide evidence to inspect

Tiger Data combines vector and full-text retrieval; SerpApi retrieves fresh references. Backboard supplies reply-style memory, TabPFN estimates escalation risk, and Browserbase's Stagehand files a bounded internal note. These outputs support preparation; none authorizes a reply.

An earlier search returned irrelevant material and the resulting draft was rejected. A Gemma internal error also stopped a hosted attempt. Sentry exposed the failing span; explicit recovery reused completed work instead of substituting a template.

![Sentry Agent Activity from an earlier hosted run, with the Gemma span selected and prompt capture disabled.](https://raw.githubusercontent.com/himanshu748/vox-zero-touch-os/9bfc07d5657d41a43213a9fb7b699f6ae0db43d6/docs/evidence/sentry-judge-trace.png)

Ultramarine adds an advisory review through the official OpenAI Node SDK. In the verified run it flagged a specific omission: a draft had not addressed the customer's intermittent 500 responses and request for root-cause confirmation. I still had to judge that criticism and the reply.

Its first SDK response failed VOX's review contract. I sent the same strict schema used by server validation, kept automatic SDK retries off and verified a new run. Validation stayed in place.

The two successful reviews consumed **$0.00034095 in settled promotional credit**. The provider's usage deltas matched two requests, 1,313 input tokens and 288 output tokens. The rejected attempt consumed another $0.00020585. These are measured review charges, not the full workflow price; no purchase or top-up was made. [Cost reconciliation](https://github.com/himanshu748/vox-zero-touch-os/blob/ba10b92506f57d39bd15f9fb2675af6cd692d3ec/docs/evidence/ultramarine-hosted-cost.json) · [Rejected attempt](https://github.com/himanshu748/vox-zero-touch-os/blob/ba10b92506f57d39bd15f9fb2675af6cd692d3ec/docs/evidence/ultramarine-rejected-review.json).

## Code

[github.com/himanshu748/vox-zero-touch-os](https://github.com/himanshu748/vox-zero-touch-os) · MIT license · Started October 20

Install Node.js 22.18+, Ollama and the Temporal CLI first. On macOS, Temporal is available through `brew install temporal`. Then:

```sh
git clone https://github.com/himanshu748/vox-zero-touch-os.git
cd vox-zero-touch-os
npm ci
ollama pull gemma3:4b
VOX_MODEL_MODE=local npm run dev
```

Open `http://127.0.0.1:4320/app`. VOX starts a loopback-only Temporal development server and keeps local data separate from the hosted workspace. That server is for development. [Full setup and model constraints](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/LOCAL.md).

## My Agent Session

GitHub Copilot CLI reviewed the research module: [review transcript](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/copilot-research-review.txt) and [usage receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/copilot-research-usage.json). Entire captured the development session: [checkpoint](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/entire-checkpoint.json) and [session export](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/entire-review-session.jsonl).

For related engineering approaches, see NextCTL's [Building an AI Agent with Human Approval Gates](https://dev.to/nextctl/building-an-ai-agent-with-human-approval-gates-5h01) and kongkong's [Put AI Agent Actions Behind an Approval Gate From API to Worker](https://dev.to/kongkong1/put-ai-agent-actions-behind-an-approval-gate-from-api-to-worker-lak). These are further reading, separate from VOX's implementation evidence.

## Prize Categories

I am entering **18 categories**: 15 runtime or infrastructure integrations, two development tools and the domain.

- **Best Use of Temporal:** [the same execution and pending approvals survive a restart](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json).
- **Best Use of Tinker:** [Qwen3-8B LoRA improves a 16-command test from 12/16 to 16/16, with slower latency disclosed](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/tinker-evaluation.json).
- **Best Use of Mastra:** [named steps suspend and resume around individual reply decisions](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/lazy-payoff.json).
- **Best Use of Gemma:** [real local intent, planning and drafting on the M4 laptop](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/lazy-payoff.json), plus hosted inference.

<details>
<summary>Other 14 entries: what each does and where to verify it</summary>

| Category | Work and evidence |
| --- | --- |
| Best Use of Render | [Hosts the app, API and workflow worker](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json) |
| Best Use of Tiger Data | [Hybrid guidance retrieval](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/tiger-retrieval-evaluation.json) and workflow history |
| Best Use of MongoDB Atlas | [Persists workspaces, decisions, quotas and receipts](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json) |
| Best Use of Sentry Agent Tracing | [Exposes model spans and failures](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/sentry-judge-trace.png) |
| Best Use of TabPFN | [Estimates escalation risk; 15/16 on a synthetic holdout](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/tabpfn-evaluation.json) |
| Best Use of Auth0 for AI Agents | [Provides owner sign-in, separate from judge sessions](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json) |
| Best Use of ElevenLabs | [Transcribes commands and generates the saved briefing](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-ultramarine-verification.json) |
| Best Use of SerpApi | [Retrieves fresh reply references](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-ultramarine-verification.json) |
| Best Use of Backboard | [Retrieves reply-style memory](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-ultramarine-verification.json) |
| Best Use of Browserbase | [Stagehand files a synthetic internal note](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-ultramarine-verification.json) |
| Best Use of GitHub Copilot | [Reviews the research module through its CLI](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/copilot-research-review.txt) |
| Best Use of Entire | [Captures the development session](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/entire-review-session.jsonl) |
| Best Use of a .tech Domain | [Serves the product at getvox.tech](https://getvox.tech/) |
| Best Use of Ultramarine | [Reviews drafts through the official SDK, with $0.00034095 of reconciled credit consumption](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/ultramarine-hosted-cost.json) |

</details>

The [integration ledger](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/SPONSORS.md) records each integration's scope. DigitalOcean and Arduino are excluded.

## What comes next

VOX is a working prototype with no customer users or revenue. The next product step is one read-only helpdesk connector and a consented pilot to test draft usefulness, correction work and repeat use.

The local Qwen fallback and llama.cpp path remain transport-tested rather than verified with real inference. Production accuracy, total multi-provider cost and continuous uptime are unproven. Free hosting can sleep, and provider quotas and resource expiry still apply.

## AI disclosure and credits

VOX and this article were built with AI coding and writing assistance. The walkthrough uses AI-generated Deepgram narration over edited real browser captures; in-app voice uses ElevenLabs. All tickets and identities are synthetic. ToolTrap and EmbodiWeave are earlier projects; VOX is new for this challenge. [Asset provenance](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/ASSETS.md).
