---
title: "VOX: tell your support queue what to do, then review the replies"
tags: devchallenge, hf26challenge
published: false
---

## What I Built

VOX is a support ticket assistant you can direct by voice or text. Give it one instruction, review its plan, then let it prioritize tickets, find guidance and prepare replies. Each reply waits for your decision.

For example:

> Triage all tickets, research fixes, tag urgent ones, and draft two replies. Ask before sending anything.

That instruction becomes a set of action cards: inspect the queue, prioritize, research, update internal labels, prepare drafts and report the result. VOX shows which tickets and tools are in scope before execution starts.

I built this for the repetitive first pass through a support queue: working out what is urgent, finding the relevant playbook and getting a useful answer ready for review. It fits **Slow and Steady** by taking that preparation off the user's plate while keeping the final decisions visible.

This release uses **24 fictional tickets**. The provider calls and saved updates are real; sends are simulated. It does not connect to a real customer inbox.

## Demo

**[Try VOX without an account](https://getvox.tech/judge).**

1. Choose **Start live evaluation** if a pass is available. Use the same browser throughout.
2. Type the instruction above, or record/upload a fictional voice command. Voice requires your consent to ElevenLabs processing.
3. Create the plan and review its action cards before approving it.
4. Follow the ticket updates, then approve one draft and reject the other.
5. Play the briefing and open Evidence to inspect the actual provider requests.

Eight live passes were enabled using existing free/promotional balances. One was used for verification; seven remained at the October 21 check. The page displays current availability. Each pass lasts 24 hours and permits one plan, two drafts, one voice upload and two briefing generations. Failed attempts count.

**Try rules-only demo** remains available without a live pass. It uses fixed priority rules, checked-in guidance and reply templates, with the same plan and approval journey. It makes no model, search, browser-automation or voice-provider calls; persistence and telemetry still operate. It is clearly labelled.

The recorded anonymous live run produced:

| Observed result                       | Value                                     |
| ------------------------------------- | ----------------------------------------- |
| Fictional tickets triaged             | 24                                        |
| Internal labels saved                 | 7                                         |
| Replies drafted                       | 2                                         |
| Simulated replies approved / rejected | 1 / 1                                     |
| Successful external request receipts  | 16                                        |
| Mastra status                         | success                                   |
| Temporal history                      | COMPLETED, 21 events, one decision signal |

The two draft decisions were recorded individually in the app. One Temporal signal released its durable wait. The [curated judge receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/judge-hosted.json) preserves the result and its limits. It used a 7.791-second recorded synthetic WAV, not a physical microphone test. Browser playback state and cached replay were checked; physical speaker output was not assessed.

## Code

**[Public source and MIT license](https://github.com/himanshu748/vox-zero-touch-os).**

The repository includes setup instructions, synthetic fixtures, server adapters, the React workspace, tests and curated evidence. Credentials, checkpoint identifiers, private databases and prior chat history are excluded.

Development began October 20, within the Week 3 window. The original recorded judge run used commit `626740356df86c84a767c5f51cda501e45eeaf8d`; later guard and clarity changes are recorded in the repository history. The evidence distinguishes the original provider run from later checks rather than claiming a complete new live run at every commit.

## How I Built It

### A generated plan with a fixed execution boundary

ElevenLabs transcribes the command. A private Qwen3-8B LoRA adapter trained with Tinker normalizes a few allowed intent fields: whether research is requested, the bounded draft count and whether to add internal labels. Gemma generates the readable plan and reply drafts through Vercel AI SDK.

The interface renders allowlisted React action cards from validated data. It never executes generated HTML or a partial streamed instruction. Approving a plan starts the saved workflow; each simulated send needs a separate, single-use decision from the originating session.

### Work that can stop and resume

Mastra runs the validated activities and pauses at the review gate. Temporal schedules the durable workflow, retries the deliberately interrupted internal-label activity and waits for the decision signal. MongoDB Atlas preserves application state, provider reservations, decisions and receipts. Tiger holds separate restricted workflow schemas and the small knowledge corpus.

A hosted stop/resume at the approval gate preserved the same Temporal execution and completed request receipts. Resuming skipped completed work. This matters because repeating a model request after an interruption can consume credit even when the application has not finished saving its result.

VOX persists a reservation before a bounded advanced-provider call. Failed or uncertain calls still count; an uncertain request cannot be automatically replayed. Free Render can sleep, and this one-writer deployment has no uptime guarantee.

### Prediction and retrieval, with small-data limits

TabPFN-3.5-Plus estimates escalation from 48 authored scenarios. Its estimate can raise attention but cannot lower the deterministic SLA/impact floor. A separate 16-example synthetic holdout had 15 correct labels. This is not calibrated customer risk.

Tiger combines pgvector similarity and full-text search over five authored playbooks. A six-question fixture retrieved the intended playbook for 6/6 hybrid queries versus 5/6 keyword-only queries. One paraphrase had no keyword match. Those reference links identify the playbooks' sources; they are not evidence that VOX fetched the linked documents.

SerpApi supplies up to two fresh searches. Browserbase and Stagehand save one internal review note through the actual hosted helpdesk form using explicit selectors. The browser action is real; the helpdesk is fictional. Backboard saves and recalls the bounded reply-style preference.

### Fine-tuning improved this task, but was slower

The Tinker experiment used 53 authored training pairs and 16 held-out commands. Exact intent matches rose from **12/16 to 16/16**. Output tokens fell from 320 to 240, but median latency increased from **2,385 ms to 7,870 ms**. The small fixed evaluation supports a task-specific improvement, not a production accuracy claim or speedup. [Dataset, evaluation and limitations](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/ADVANCED-INTEGRATIONS.md).

The same private checkpoint is retained through **November 5, 2026 at 23:59 UTC**, covering the announced judging week with a buffer. Estimated storage through expiry is $0.004852 at the published rate, within the approved $0.25 promotional budget. That is an estimate, not an invoice. No retraining, purchase or top-up was used. [Retention receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/tinker-retention.json).

### Traces helped distinguish a provider error from a workflow error

Sentry captures actual model/tool spans with prompt and output capture disabled. In an earlier expanded hosted run, Gemma returned an internal provider error during drafting. The failed model span helped identify the failing boundary; an explicit resume reused completed activities and cached successful responses. The application now reports a safe checkpoint explanation rather than displaying the upstream error body or silently switching to templates.

![Actual Sentry Agent Activity from the anonymous hosted judge run, showing a Gemma span with latency and token usage; prompt input capture is disabled.](https://raw.githubusercontent.com/himanshu748/vox-zero-touch-os/main/docs/evidence/sentry-judge-trace.png)

The screenshot is from the later successful judge run. Its selected Gemma span reports 17.05 seconds and about 1.8K tokens. Sentry's displayed cost is an estimate; provider-billed cost is unavailable. The label interruption visible in the timeline is an intentional retry demonstration, distinct from the earlier real Gemma failure.

The regression suite has 44 passing tests covering ownership, isolated judge sessions, bounded use, approvals, persistence, retries and validated planning. SDK tests use mocks or injected transports where stated; they do not substitute for the hosted receipts. Type checking and the production build pass.

## Why Does Open Innovation Matter?

The useful part of this project is visible and changeable: the intent dataset, plan schema, action cards, orchestration and approval rules are in the repository. An open-weight model can be adapted to the narrow intent task, and the Gemma adapter also supports an OpenAI-compatible endpoint so a different deployment can replace the hosted model.

That let me measure a concrete tradeoff: fine-tuning improved exact intent matching on my fixture while making inference slower. Keeping the data and evaluation visible makes that result inspectable and repeatable.

Openness does not make this hosted build offline or automatically private. Voice and model requests still go to configured providers. The demo uses fictional inputs, separate judge sessions and explicit processing consent. Its limits are part of what a user needs to understand before relying on it.

## My Agent Session

Copilot CLI reviewed the non-secret research module. The [captured review](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/copilot-research-review.txt) and [usage receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/copilot-research-usage.json) show that development use separately from runtime integrations.

Entire captured that authorized review session: [checkpoint](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/entire-checkpoint.json) and [session export](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/entire-review-session.jsonl). It contains the scoped review, not my earlier private chat history.

## The Lazy Payoff

One instruction prepared a queue for review: priorities, seven labels and two draft replies. The remaining work was to inspect the answers and make two decisions. I have not measured a manual baseline, so I am not claiming minutes saved.

One search returned irrelevant material and that draft was rejected. An advisory model review cannot guarantee a correct answer. The human review step is necessary, and real helpdesk delivery is future work.

## Prize Categories

I am entering the following **17 categories**, with the exact implementation and proof boundaries in the [integration ledger](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/SPONSORS.md):

| Category                         | Contribution                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Best Use of Render               | Hosts the frontend, API and bounded workflow runtime.                                                   |
| Best Use of TabPFN               | Escalation estimates inside the ticket workflow.                                                        |
| Best Use of Tinker               | Real task-specific LoRA training and baseline comparison.                                               |
| Best Use of Gemma                | Streamed plans and generated reply drafts.                                                              |
| Best Use of Auth0 for AI Agents  | Verified owner sign-in and protected owner workspace. Public judge decisions use separate VOX sessions. |
| Best Use of Backboard            | Saved and recalled reply-style memory.                                                                  |
| Best Use of ElevenLabs           | Command transcription and spoken briefings.                                                             |
| Best Use of Browserbase          | Stagehand actions against the hosted synthetic form.                                                    |
| Best Use of Entire               | Captured development session linked above.                                                              |
| Best Use of GitHub Copilot       | Actual CLI review and saved development evidence.                                                       |
| Best Use of Mastra               | Validated activities and the human review gate.                                                         |
| Best Use of MongoDB Atlas        | Persistent workspaces, decisions, quota reservations and receipts.                                      |
| Best Use of Sentry Agent Tracing | Actual spans, latency/tokens and the debugging account above.                                           |
| Best Use of SerpApi              | Live search references for reply preparation.                                                           |
| Best Use of a .tech Domain       | [getvox.tech](https://getvox.tech), claimed through the Hacktoberfest benefit.                          |
| Best Use of Temporal             | Durable execution, retry and restart/resume proof.                                                      |
| Best Use of Tiger Data           | pgvector/full-text retrieval and restricted workflow persistence.                                       |

Ultramarine remains visible as a working advisory review tool, but **I am not entering its prize category**. DigitalOcean and Arduino are also excluded.

## Credits and related reading

This project was built with AI coding assistance. Its source is MIT-licensed; dependencies and models retain their own licenses and terms. [Asset provenance](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/ASSETS.md) describes the generated artwork. All evaluation fixtures and helpdesk identities are synthetic.

Two related community examples helped frame the final explanation: [“Pausing a LangGraph Agent Mid-Run for a Human Approval” by royalpinto007](https://dev.to/royalpinto007/pausing-a-langgraph-agent-mid-run-for-a-human-approval-3nde) and [“Build a Live Supervisor Dashboard for AI Support Calls” by sonam_gupta_dba00ec9473e5](https://dev.to/sonam_gupta_dba00ec9473e5/build-a-live-supervisor-dashboard-for-ai-support-calls-22bp). VOX uses Mastra and Temporal for its own ticket workflow.
