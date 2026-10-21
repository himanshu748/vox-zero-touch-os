---
title: "VOX: give it the queue. Come back to two decisions."
published: false
tags: devchallenge, hf26challenge
---

<!-- FILE-ONLY REVISION. The live DEV post has not been changed. Local mode is proposed in the week3-local-lazy-payoff PR; getvox.tech still runs the existing hosted build. Fill the explicitly unmeasured human fields only after following LAZY_PAYOFF.md. -->

## What I Built

I wanted an afternoon off, not another chatbot. Give VOX the queue, approve its plan, and come back to **two reply decisions**. That is the sloth payoff I wanted: let the machine do the preparation, then spend my attention on the answers that need judgment.

VOX is a support ticket assistant. Ask it to prioritize tickets, find guidance and draft two replies. First you approve its plan. After that, it prepares the work and waits for you to approve or reject each reply. Those are **three human gates altogether**, including the initial plan approval.

The hosted workflow runs on the server, so my browser and laptop do not have to stay open while it prepares the queue. Temporal preserves the run across interruption; free hosting can still sleep, so I claim recoverability rather than uninterrupted service. The separate local mode keeps model requests on my own machine and needs that machine running. [Hosted restart evidence](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json).

I now have a measured local run: **24 fictional tickets triaged, seven labels saved and two Gemma drafts ready in 25.09 seconds** on a MacBook Air M4 with 16 GB. That is machine preparation time, not a claim about minutes saved. The model was not already loaded, and local server/worker startup took another 1.42 seconds. The [receipt includes stage timings, actual draft text and the frozen input](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/lazy-payoff.json).

The helpdesk is fictional. Approving a reply records a simulated send; no customer message leaves it. The benchmark scripts one approval and one rejection to prove both paths. It does not pretend to measure a human's reading time or certify the drafts' quality.

## Why Does Open Innovation Matter?

**The model can run on my own laptop.** Local Gemma performs intent normalization, planning and reply drafting through Ollama's OpenAI-compatible endpoint. VOX keeps the same action cards, request reservations and review gate. Its application HTTP destinations were limited to loopback in the measured run; cloud search, voice, browser automation and advisory providers have explicit skipped receipts. [Local run evidence](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/lazy-payoff.json).

That gives “open-weight” a practical job. I can inspect and replace the model connection, run without cloud keys, and keep these model requests on the machine. Dependencies and weights must be installed first. This was not an operating-system packet capture or an airplane-mode test.

Open weights also made the separate hosted Tinker experiment possible. I trained a Qwen3-8B LoRA for three small intent fields. On **16 authored holdouts**, exact matches increased from **12/16 to 16/16**, while median latency worsened from **2,385 ms to 7,870 ms**. Output tokens fell from 320 to 240. I am keeping the slower result beside the improvement. These are small synthetic fixtures, not production accuracy. [Baseline and fine-tuned evaluation](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/tinker-evaluation.json).

The paths are distinct: **local mode uses Gemma, with local Qwen3-8B as the intent fallback; hosted mode uses the private Tinker adapter**. No Tinker call occurs in the local benchmark. The Qwen fallback is transport-tested but real fallback inference is **unverified**; the recorded run used Gemma throughout. [Verification boundaries](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/local-mode-verification.json).

## The Lazy Payoff

I also ran ten complete local workflows with the model already resident. All ten prepared 24 tickets and two drafts, then completed after scripted approval/rejection. Preparation measured **17.19 seconds p50 and 31.97 seconds p95**; local text-to-plan was **9.44/23.42 seconds p50/p95**. Startup was measured separately. At ten samples, nearest-rank p95 is simply the slowest observation. These are local text-mode measurements, not cloud voice performance or human time saved. [All ten receipts](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/local-performance.json).

The reproducible instruction was:

> Triage all 24 support tickets, research fixes from the local playbooks, tag urgent ones, and draft two replies. Ask before sending anything.

| Measured work                                    |           Local VOX |
| ------------------------------------------------ | ------------------: |
| Intent normalization + planning                  |             20.99 s |
| Two Gemma reply drafts                           |              3.86 s |
| Complete preparation until two pending decisions |         **25.09 s** |
| Tickets triaged / internal labels / drafts       |      **24 / 7 / 2** |
| Reply decisions waiting for a person             |               **2** |
| Initial plan approvals                           |               **1** |
| Application external HTTP destinations           |               **0** |
| Mastra / Temporal after scripted decisions       | success / COMPLETED |

These are **one run's wall-clock measurements**, with deliberate retry faults and cosmetic step delays disabled. SLA ranking remains rule-based; Gemma does the language work. Temporal completed with 21 history events and one decision signal. [Full measured receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/lazy-payoff.json).

The actual drafts are included so a fast result cannot hide poor writing. One is generic and one proposes rate-limit investigation. Both still need a person to check their relevance and wording. There is no measured quality score or manual speed comparison yet.

| Human measurement                                       | Result                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| My manual preparation of the same queue and two replies | **[UNMEASURED — enter stopwatch time]**                         |
| My initial instruction and VOX plan review              | **[UNMEASURED — enter stopwatch time]**                         |
| My review and correction of the two VOX replies         | **[UNMEASURED — enter stopwatch time]**                         |
| Difference in human attention or elapsed time           | **[UNVERIFIED — calculate only after both sides are measured]** |

I have a [frozen-queue protocol and empty timing sheet](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/LAZY_PAYOFF.md). It uses the same 24 cases, response windows, guidance and two reply targets. The benchmark's 0.09-second scripted decision/completion phase is not a substitute for those human measurements. Until the sheet is filled, my payoff claim is the work prepared and the decisions left, not a percentage saved.

## Demo

[Watch the captioned 1:50 local walkthrough](https://github.com/himanshu748/vox-zero-touch-os/raw/refs/heads/week3-local-lazy-payoff/docs/evidence/local-demo.mp4). It uses actual screenshots from one completed local run, assembled with edited timing and pointer overlays; it is not a continuous recording or a latency benchmark. It shows the plan, safe work, individual approval/rejection, and explicit cloud skips. [Run and media receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/local-demo.json).

**Local open-weight mode:** follow [LOCAL.md](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/LOCAL.md). After installing Node dependencies, Ollama and Temporal CLI:

```sh
ollama pull gemma3:4b
VOX_MODEL_MODE=local npm run dev
```

Open `http://127.0.0.1:4320/app`. Type the instruction, inspect the streamed cards, approve the plan, then decide on each draft. The mode banner identifies the local model, and Evidence shows successful local requests separately from skipped external steps.

![A separate local browser verification run at two pending decisions; the timed benchmark is recorded in JSON.](https://raw.githubusercontent.com/himanshu748/vox-zero-touch-os/week3-local-lazy-payoff/docs/evidence/local-open-weight.png)

**Hosted demo:** [getvox.tech/judge](https://getvox.tech/judge) remains the existing cloud-backed version, with bounded live passes and a separately labelled rules-only demo. It is not the laptop benchmark running on a server. Its earlier recorded-voice evaluation completed 24 triages, seven labels, two drafts and 16 successful provider receipts. A synthetic audio file was tested; physical microphone/speaker output remains **unverified**. [Hosted judge receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/judge-hosted.json).

## Code

[Public MIT source, setup and evidence](https://github.com/himanshu748/vox-zero-touch-os). Local-mode changes are on `week3-local-lazy-payoff`; the hosted site and live DEV article are unchanged by this PR. [Local verification record](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/local-mode-verification.json).

## How I Built It

### Give the model a small job; validate the answer

Vercel AI SDK sends structured requests to local Gemma. The server validates the complete response before it saves an executable plan. Partial streamed text only renders fixed React cards. Unknown actions and overlong replies fail validation; they cannot become executable HTML or a silent template replacement. The test transport proves those boundaries independently of the real model run. [Verification](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/local-mode-verification.json).

The first local attempt found a real compatibility problem: Ollama rejected the long bounded-string grammar used for a reply. I removed string-length hints from the inference schema, while retaining the original final Zod validation and output-token ceiling. The added regression test checks that an oversized draft is still rejected. This changed the adapter, not the approval boundary. [Recorded checks](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/local-mode-verification.json).

The broader local planner check was more sobering: **30/30 schema-valid responses, but 19/30 exact requested-action matches**. Sharing the bounded prompt improved the latter from 11/30 under the old example prompt, but valid JSON still did not mean the model understood every command. These are regression cases inspected during the correction, not unseen test data. The separate intent-normalization stage and visible plan approval matter. [Outputs and limitations](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/planning-evaluation.json).

### Leave work behind a durable gate

Mastra owns the named activity graph and reply suspension. Temporal owns durable scheduling and the decision signal. In the earlier hosted restart experiment, stopping the server at two pending approvals preserved the same Temporal execution and completed provider receipts. The later anonymous voice run is a separate test; I do not combine their counts. [Hosted restart evidence](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json).

The local benchmark keeps those same workflows and request reservations, using isolated SQLite state and a loopback Temporal dev server. Before scripting either reply decision, it verifies two pending drafts and zero sends. Afterward, it verifies Mastra success and Temporal completion. [Local receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/lazy-payoff.json).

### Keep failures and sources visible

The hosted version combines authored guidance with retrieval, search and advisory tools; those services are skipped in local mode. Sources do not make an answer automatically safe. An earlier hosted search returned irrelevant references, and the draft was rejected. The published trace evidence also separates a real Gemma failure from an injected retry test. [Hosted evidence](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json) · [actual Sentry screenshot](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/sentry-judge-trace.png).

Ultramarine already supplies a second opinion on hosted drafts. A separate recorded review returned `needs_revision` with three concerns, including a potentially invented completed action. The inbox now distinguishes suggested changes from readiness for human review and labels blocking concerns. The review remains advice; it cannot authorize sending. Its token cost is estimated, not an invoice. [Actual review response](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/ultramarine-review.json).

## Prize Categories

I am entering **17 categories**. The four at the center of this story are:

- **Best Use of Temporal:** the hosted execution survives a restart; the local run completes with 21 history events. [Restart proof](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json).
- **Best Use of Tinker:** real Qwen3-8B intent fine-tuning, 12/16 to 16/16 matches, with the latency regression disclosed. [Evaluation](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/tinker-evaluation.json).
- **Best Use of Mastra:** the actual activity graph suspends for two decisions, then finishes successfully. [Local run](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/lazy-payoff.json).
- **Best Use of Gemma:** actual local intent, planning and two draft generations on M4/16 GB; hosted Gemma is separately evidenced. [Local requests](https://github.com/himanshu748/vox-zero-touch-os/blob/week3-local-lazy-payoff/docs/evidence/lazy-payoff.json).

| Other category                   | Proof of its role                                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Best Use of Render               | [Hosted application and workflow runtime](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json)                   |
| Best Use of TabPFN               | [Escalation predictions inside the ticket workflow](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/judge-hosted.json)             |
| Best Use of Auth0 for AI Agents  | [Owner identity; separate private judge authorization](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json)      |
| Best Use of Backboard            | [Bounded preference memory save/recall](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/judge-hosted.json)                         |
| Best Use of ElevenLabs           | [Recorded-command transcription and briefing](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/judge-hosted.json)                   |
| Best Use of Browserbase          | [Hosted synthetic UI note through Stagehand](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/judge-hosted.json)                    |
| Best Use of Entire               | [Authorized development checkpoint](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/entire-checkpoint.json)                        |
| Best Use of GitHub Copilot       | [Actual CLI research-module review](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/copilot-research-review.txt)                   |
| Best Use of MongoDB Atlas        | [Hosted operational persistence](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json)                            |
| Best Use of Sentry Agent Tracing | [Actual model span, latency/tokens and debugging evidence](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/sentry-judge-trace.png) |
| Best Use of SerpApi              | [Live references used during hosted drafting](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/judge-hosted.json)                   |
| Best Use of a .tech Domain       | [Hosted getvox.tech domain](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json)                                 |
| Best Use of Tiger Data           | [Hybrid retrieval evaluation](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/tiger-retrieval-evaluation.json)                     |

Ultramarine remains a hosted advisory integration, but **I am not entering its category**. DigitalOcean and Arduino are excluded too. None of those external services is part of the local timing claim.

## What still needs a person

The manual timing, human review time and quality comparison are **unmeasured**. Local Qwen fallback and llama.cpp execution are **unverified on hardware**. The local run is a synthetic pilot, not a production benchmark. Free hosted capacity is finite. I want the comparison to show whether the preparation saved outweighs the time spent checking the answers; that question remains open.

## My Agent Session and AI Disclosure

Copilot CLI reviewed the research module, and Entire captured that authorized session: [review](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/copilot-research-review.txt) · [checkpoint](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/entire-checkpoint.json). These are development tools, not runtime APIs.

VOX and this file-only article revision were prepared with AI coding and writing assistance. The queues and evaluation fixtures are authored synthetic data. The linked receipts distinguish local inference, mocked transport tests and earlier hosted calls.
