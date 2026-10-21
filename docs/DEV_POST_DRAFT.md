_This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19)._

## What I Built

**Give VOX the queue. Approve the plan. Come back to two decisions.**

That is the payoff I wanted from an operations co-worker: the preparation can happen while I am elsewhere, and the reply decisions wait for me.

So I stopped the hosted VOX server with two support replies waiting for approval.

When I brought it back, VOX resumed the same execution. The replies were still waiting. No completed paid request ran again. That restart was my way of testing whether I could actually step away.

Give VOX a command by voice or text:

> Triage all support tickets, research fixes, tag urgent ones, and draft two replies. Ask me before sending anything.

It proposes a plan. After you approve it, VOX prioritizes the queue, retrieves guidance, saves internal labels and prepares two replies. Then it waits for you to approve or reject each reply. That makes three human gates: one plan approval and two reply decisions.

Support is VOX’s first working operations workflow. The preview contains **24 synthetic tickets and simulated sends**; it has no connection to a customer inbox. The model calls, saved changes and workflow history are real.

[Try VOX](https://getvox.tech/judge) · [Source code](https://github.com/himanshu748/vox-zero-touch-os) · [Judge guide](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/JUDGES.md)

## Why Does Open Innovation Matter?

The model should be replaceable without moving the approval boundary. VOX runs Gemma locally for understanding, planning and drafting, and uses a Tinker-trained Qwen3-8B LoRA for the narrower hosted intent task.

With `VOX_MODEL_MODE=local`, Gemma handles understanding, planning and drafting through Ollama. That path requires no model API key or cloud inference bill. Local research uses checked-in playbooks. Cloud capabilities such as external search, voice and browser automation are explicitly skipped rather than presented as successful work. The approval gate remains in place.

Open weights also made a narrower experiment possible. I used Tinker to fine-tune a Qwen3-8B LoRA on 53 synthetic training examples, then evaluated intent extraction on 16 held-out commands.

| Held-out evaluation | Base Qwen3-8B | With adapter |
| --- | --- | --- |
| Exact intent matches | 12/16 | 16/16 |
| Output tokens | 320 | 240 |
| Median latency | 2,385 ms | 7,870 ms |

The adapter matched every intent in that small test and used fewer output tokens. It was also more than three times slower. Sixteen commands are too few to establish general accuracy, and this intent experiment is separate from the local Gemma planner evaluation below.

[Fine-tuning evaluation](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/tinker-evaluation.json)

## The Lazy Payoff

I timed preparation on my MacBook Air M4 with 16 GB of memory, not my review. On this local path, research means checked-in playbooks, not live web searches. These timings are not a benchmark of the hosted integrations.

| Preparation for the same 24-ticket queue | Result |
| --- | --- |
| Manual work | About 30 minutes, [my estimate rather than a timed run](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/manual-baseline-status.json) |
| Local Gemma, cold | 25.09 s |
| Local Gemma, warm | 17.19 s median across 10 runs |
| Recorded output | 24 tickets triaged, 7 labels saved, 2 replies drafted |
| Human decisions | Approve the plan, then approve or reject each reply |

Understanding and planning accounted for 20.99 seconds of the cold run; drafting took 3.86 seconds. The slowest of the ten warm runs took 31.97 seconds. VOX recorded zero external application requests during the local run. That is an application receipt, not a packet capture or an airplane-mode test.

[Cold-run receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/lazy-payoff.json) · [All ten warm runs](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/local-performance.json)

One local draft was generic. It still needed editing, which is why I am not calling this a measured 30-minute-to-25-second improvement. The preparation is timed. The full job is not. The [frozen queue and timing sheet](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/LAZY_PAYOFF.md) are public so that comparison can be made with review included.

## Demo

{% embed https://www.youtube.com/watch?v=K9MYbrX1T74 %}

The 2:25 walkthrough shows the hosted workflow and a local run, before the latest visual refresh. It uses edited real browser captures and AI-generated narration. Waiting time is trimmed, so use the receipts below for measurements.

**[Open the judge page](https://getvox.tech/judge). No account or API key is required.**

1. Choose **Start live evaluation**. The page shows how many free passes remain.
2. Say, upload or type the command above. Use fictional inputs only.
3. Review and approve the plan. Approve one reply and reject the other.
4. Open the briefing and **Evidence export** to inspect what happened.

If no passes remain, choose **Try rules-only demo**. It uses fixed rules and templates, not live model inference.

### Three ways to run it

| Mode | What you are testing |
| --- | --- |
| Hosted live evaluation | Live provider integrations and a Temporal-backed workflow that can survive a server restart |
| Local Gemma | Understanding, planning and drafting through Ollama; cloud steps leave explicit “skipped in local mode” receipts |
| Rules-only demo | The interaction and approval flow using fixed rules and templates |

The latest hosted check ran against deployed commit [`22fcfa4`](https://github.com/himanshu748/vox-zero-touch-os/commit/22fcfa46d715c14a7c808b06fdfc56880de157ce) on October 21. A recorded voice file went through real transcription, planning, preparation, individual decisions and a spoken briefing. It finished with **24 tickets triaged, 7 labels, 2 drafts, 1 simulated send and 1 rejection**, plus 16 successful provider receipts. Mastra succeeded; Temporal completed after 21 events. Replaying the briefing returned identical cached audio without another generation.

That check used an isolated anonymous judge session through the public HTTP API, with scripted approvals. Browser interaction was checked separately. It does not prove physical microphone or speaker performance. Three of the original eight live passes remained afterward; the judge page shows the current count. [Saved hosted verification](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-ultramarine-verification.json).

## How I Built It

### A valid plan still needs a human

The Vercel AI SDK streams model output into fixed React action cards. Partial output cannot trigger an action, and the model never writes tool code. Reply decisions are checked on the server for ownership, status and expiry, including protection against duplicate submissions.

The planner evaluation explains why this boundary matters. Local Gemma returned valid JSON in **30 out of 30 cases**, but selected exactly the right actions in **19 out of 30**. That improved from 11 out of 30 after a prompt change. It still leaves plenty of reason to read the plan before approving it.

[Planner evaluation](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/planning-evaluation.json)

My earlier projects, [ToolTrap](https://dev.to/himanshu_748/tooltrap-tool-results-are-data-wasnt-enough-25oh) and [EmbodiWeave](https://dev.to/himanshu_748/embodiweave-my-agent-read-its-own-failure-and-repeated-it-so-i-made-the-graph-enforce-it-4cd9), led to the same design choice: permission belongs in an endpoint, not just in a prompt.

### Turning the server off shouldn’t cost money twice

Mastra runs the steps and pauses for review. Temporal keeps the hosted execution durable. VOX also saves a reservation before each provider call to handle an awkward failure window: the provider may finish its work just before the server dies, leaving no saved result.

The relevant guard is small:

```js
const saved = current()?.providerTasks?.[key];
if (saved?.status === "completed") return saved.result;
if (saved)
  throw new Error(
    "This provider request already started without a saved result. Automatic replay is blocked.",
  );
```

A completed call reuses its saved result. A call with an uncertain outcome blocks automatic replay and waits for human intervention. This is deliberately conservative. It is not a general exactly-once guarantee for external APIs.

The restart test at the start of this post exercised the completed-call path: the same execution resumed with its two pending replies and without repeating a completed paid request.

[Restart evidence](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json) · [Provider-call implementation](https://github.com/himanshu748/vox-zero-touch-os/blob/main/server/provider-task.mjs)

### Sources and failures stay visible

Tiger Data combines pgvector with full-text search to retrieve guidance. TabPFN estimates escalation risk, with 15 correct results on a 16-item synthetic holdout. SerpApi retrieves fresh references, Backboard supplies reply-style memory and Browserbase's Stagehand files an internal note.

Retrieved material is treated as untrusted. An early search returned junk, and the resulting draft was rejected. Retrieval gives the reviewer something to inspect; it does not make the answer correct.

An earlier hosted run also hit a real Gemma internal error. Sentry identified the failing call. Resuming reused the successful work rather than silently replacing the failed model output with a template.

![Sentry Agent Activity from an earlier hosted judge run, with a Gemma span selected and prompt capture disabled.](https://raw.githubusercontent.com/himanshu748/vox-zero-touch-os/9bfc07d5657d41a43213a9fb7b699f6ae0db43d6/docs/evidence/sentry-judge-trace.png)

### A second model reviews the draft. It gets no permissions.

Ultramarine reviews each proposed reply through the official OpenAI Node SDK. In the latest hosted run, it flagged that one reply had missed the customer’s intermittent 500 errors and request for root-cause confirmation. That gives me a specific omission to check. It cannot approve the reply or send it.

The first SDK attempt returned JSON that failed VOX’s review contract. Execution stopped. I changed the request to send the same strict schema used by server validation, kept automatic SDK retries off, and verified a fresh hosted run. I did not relax validation to accept the failed response.

For the successful pair, Paper Instruments’ settled promotional balance fell by **$0.00034095**. The usage counters increased by exactly two requests, 1,313 input tokens and 288 output tokens, matching the saved SDK receipts. The earlier rejected review consumed a separate **$0.00020585**; total testing debit across those attempts was **$0.00054680**. No purchase or top-up was made.

This is measured promotional-credit consumption for Ultramarine, not a full workflow price or a card invoice. The UI’s per-request estimates are labelled separately. [Actual cost reconciliation](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/ultramarine-hosted-cost.json) · [Rejected-attempt record](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/ultramarine-rejected-review.json).

The deployed build passed **58 tests, typecheck and the production build**. [CI run](https://github.com/himanshu748/vox-zero-touch-os/actions/runs/39640659579). Local-mode transport tests also verify that configured cloud providers receive no requests.

## Code

**[github.com/himanshu748/vox-zero-touch-os](https://github.com/himanshu748/vox-zero-touch-os)** · MIT license · Started October 20

You need Node.js 22.18 or newer, Ollama running and the Temporal CLI on your `PATH`. On macOS, the Temporal CLI can be installed with `brew install temporal`. See [LOCAL.md](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/LOCAL.md) for the full setup.

From a macOS or POSIX shell:

```sh
git clone https://github.com/himanshu748/vox-zero-touch-os.git
cd vox-zero-touch-os
npm ci
ollama pull gemma3:4b
VOX_MODEL_MODE=local npm run dev
```

Open `http://127.0.0.1:4320/app`. Check the banner to confirm which model is running. The local Temporal development server is for development, not production deployment.

## My Agent Session

GitHub Copilot CLI reviewed the research module: [review transcript](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/copilot-research-review.txt) and [usage receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/copilot-research-usage.json).

Entire captured the development session: [checkpoint](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/entire-checkpoint.json) and [session export](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/entire-review-session.jsonl).

## Prize Categories

I am entering **18 categories**. These four carry the core argument:

- **Temporal:** the hosted execution survives a restart with its pending approvals and completed requests intact.
- **Tinker:** a real Qwen3-8B LoRA improved a 16-command intent test from 12/16 to 16/16, with slower latency disclosed.
- **Mastra:** named activities suspend until the individual reply decisions are complete.
- **Gemma:** open-weight inference handles understanding, plans and drafts, including the measured local path.

The evidence index covers those entries and the supporting integrations.

<details>
<summary>Prize entries and implementation evidence</summary>

| Category | Implementation and evidence |
| --- | --- |
| Best Use of Temporal | [Hosted execution resumes after a restart without repeating completed paid calls](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json) |
| Best Use of Gemma | [Local understanding, planning and drafting on an M4 laptop](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/lazy-payoff.json), plus hosted Gemma |
| Best Use of Tinker | [Qwen3-8B LoRA: 12/16 to 16/16 intent matches, with the latency regression disclosed](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/tinker-evaluation.json) |
| Best Use of Mastra | [Step graph with pauses for individual reply decisions](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/lazy-payoff.json) |
| Best Use of Render | [App, API and workflow worker hosting](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json) |
| Best Use of Tiger Data | [Hybrid retrieval](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/tiger-retrieval-evaluation.json) and workflow history |
| Best Use of MongoDB Atlas | [Workspaces, decisions, quotas and receipts](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json) |
| Best Use of Sentry Agent Tracing | [Spans, latency, tokens and debugging](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/sentry-judge-trace.png) |
| Best Use of TabPFN | [Escalation estimates](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/tabpfn-evaluation.json) |
| Best Use of Auth0 for AI Agents | [Owner sign-in, separate from judge sessions](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json) |
| Best Use of ElevenLabs | [Voice commands and spoken briefings](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/judge-hosted.json) |
| Best Use of SerpApi | [Fresh references for replies](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/judge-hosted.json) |
| Best Use of Backboard | [Reply-style memory](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/judge-hosted.json) |
| Best Use of Browserbase | [Stagehand files an internal note](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/judge-hosted.json) |
| Best Use of GitHub Copilot | [CLI code review](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/copilot-research-review.txt) |
| Best Use of Entire | [Captured development session](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/entire-review-session.jsonl) |
| Best Use of a .tech Domain | [getvox.tech](https://getvox.tech/) |
| Best Use of Ultramarine | [Two hosted reviews through the official OpenAI SDK, reconciled to $0.00034095 of actual credit consumption](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/ultramarine-hosted-cost.json) |

DigitalOcean and Arduino are excluded. The [integration ledger](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/SPONSORS.md) records the scope of each integration.

</details>

## Limits, honestly

- The local Qwen fallback and llama.cpp path have only been tested with mocks.
- Real microphone and speaker hardware, a second Auth0 account and production accuracy remain untested.
- Free Render hosting can sleep. Live judge passes are limited.

## AI disclosure and credits

VOX and this post were built with AI coding and writing help. The video uses AI-generated Deepgram narration over edited real browser captures; in-app voice uses ElevenLabs. All tickets and identities are synthetic. [Asset provenance](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/ASSETS.md).

ToolTrap and EmbodiWeave are earlier projects. VOX is new for this challenge.

## What I will measure next

The next test is the full task, with a stopwatch: preparation, review and corrections. The timing sheet is ready; the result is not.

If checking VOX’s work takes longer than doing it myself, the sloth loses.
