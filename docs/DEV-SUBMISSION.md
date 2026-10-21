---
title: "VOX: I asked for two support replies. Then I turned the server off."
tags: devchallenge, hf26challenge
published: false
---

## What I Built

During a hosted test, I stopped VOX while two replies were waiting for approval. When the service came back, it had the same Temporal execution, the same pending approvals and the same completed provider receipts. It picked up the saved work without repeating the completed requests.

That is the kind of support assistant I wanted: one I could give a job to, leave alone and still understand when I came back.

**VOX is a support ticket assistant you can direct by voice or text.** Ask it to prioritize the queue, find guidance and draft replies. It proposes a plan, does the approved preparation and waits for you to decide on each reply.

[Try VOX](https://getvox.tech/judge) · [Source, MIT license and setup](https://github.com/himanshu748/vox-zero-touch-os) · [Judge guide](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/JUDGES.md)

The hosted build contains **24 fictional tickets**. Its AI requests, saved updates and workflow history are real. Customer sends are simulated; it does not connect to a real inbox.

### What one instruction actually does

Here is the instruction from the anonymous hosted test:

> Triage all support tickets, research fixes, tag urgent ones, and draft two replies. Ask me before sending anything.

VOX turns that into six cards you can inspect before starting:

1. Read the tickets and response deadlines.
2. Prioritize the queue and save the reasons.
3. Retrieve support guidance and search for relevant references.
4. Add internal attention labels and save one browser-based review note.
5. Prepare two replies for individual review.
6. Report what changed in a spoken briefing.

You approve the plan first. Later, each reply has its own approve or reject action. Rejecting one preserves the draft.

That is the **Slow and Steady** payoff: leave the preparation to VOX, then spend your attention on the answers that need judgment. I have not timed a manual baseline, so I am not claiming a number of minutes saved.

## Demo

**[Open the judge workspace](https://getvox.tech/judge). No account or API key needed.**

Choose **Start live evaluation** if a pass is available. Type the instruction above, or consent to ElevenLabs processing and record/upload a fictional command. Review the plan, approve it, then inspect both replies. Try approving one and rejecting the other. Finish with the briefing and Evidence view.

Eight live passes were enabled from existing free/promotional balances. One was used for verification; **seven remained at the October 21 check**. The page shows current availability. A pass lasts 24 hours and permits one plan, two drafts, one voice upload and two briefing generations. Failed attempts count.

**Try rules-only demo** uses fixed priority rules, checked-in guidance and reply templates. It lets you practice planning and approvals without reserving a live pass. It makes no model, search, browser-automation or voice-provider requests; persistence and telemetry still operate. The mode is labelled.

![The completed anonymous hosted VOX run: the approved instruction, saved ticket counts and recorded workflow.](https://raw.githubusercontent.com/himanshu748/vox-zero-touch-os/9bfc07d5657d41a43213a9fb7b699f6ae0db43d6/docs/evidence/judge-workflow-clarity.png)

The anonymous recorded-voice run completed with:

| Saved result                         | Observed value                              |
| ------------------------------------ | ------------------------------------------- |
| Tickets triaged / labels saved       | 24 / 7                                      |
| Replies drafted                      | 2                                           |
| Simulated sends / rejected drafts    | 1 / 1                                       |
| Successful external request receipts | 16                                          |
| Mastra                               | `success`                                   |
| Temporal                             | `COMPLETED`, 21 events, one decision signal |

The two reply decisions were recorded separately in the app; one Temporal signal released its durable wait. The [curated receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/judge-hosted.json) records the result and its limits. Voice used a **7.791-second synthetic WAV**. Browser playback and cached replay were checked; physical microphone and speaker output remain unverified.

The server-stop experiment in the opening was an earlier owner-authenticated run. The anonymous run above separately proves the no-signup judge path. Both are documented; their counts are not combined into one fictional test.

## Code

**[github.com/himanshu748/vox-zero-touch-os](https://github.com/himanshu748/vox-zero-touch-os)**

The repository includes the React workspace, adapters, synthetic data, approval rules, tests and curated receipts. Development started October 20, within this challenge's window. The source is MIT-licensed; dependencies and models retain their own licenses and terms. Credentials, private databases and checkpoint identifiers are excluded.

## How I Built It

### Give the model a smaller job

ElevenLabs transcribes the command. A private Qwen3-8B LoRA adapter trained with Tinker normalizes three allowed intent fields: research, draft count and internal tagging. Gemma produces the readable plan and replies through Vercel AI SDK.

The UI renders fixed React cards from validated data. A partial streamed response cannot execute actions. Model output never becomes executable HTML or arbitrary tool code.

Approval is enforced in the server, where the current session must own the draft, its status must still be pending and its decision must not have expired. Clicking twice cannot send twice. The public judge session is separate from the Auth0-protected owner workspace.

This follows a lesson from my earlier agent work. [ToolTrap](https://dev.to/himanshu_748/tooltrap-tool-results-are-data-wasnt-enough-25oh) made me examine what reached a customer, and [EmbodiWeave](https://dev.to/himanshu_748/embodiweave-my-agent-read-its-own-failure-and-repeated-it-so-i-made-the-graph-enforce-it-4cd9) made me put consequential constraints in the system's action path. In VOX, the model's promise to ask permission is backed by an approval endpoint that checks it.

### Retrying a workflow can repeat a billable request

Mastra executes the validated activities and pauses for reply decisions. Temporal schedules durable work and retries the deliberately interrupted internal-label step. Atlas preserves application checkpoints, decisions and provider reservations; Tiger persists Temporal history in restricted schemas.

There is an awkward boundary between calling a provider and saving its answer. If the process dies there, a retry cannot assume the provider did nothing.

The advanced-provider wrapper checks the saved reservation before it makes another request:

```js
const saved = current()?.providerTasks?.[key];
if (saved?.status === "completed") return saved.result;
if (saved)
  throw new Error(
    "This provider request already started without a saved result. Automatic replay is blocked.",
  );
```

[Full implementation](https://github.com/himanshu748/vox-zero-touch-os/blob/main/server/provider-task.mjs).

VOX commits the reservation before calling the provider and commits the result before advancing. An uncertain request stops for inspection. That can be inconvenient, but it keeps an interruption from becoming an automatic series of repeated calls. It is not a universal exactly-once billing guarantee.

In the hosted restart test, the same workflow and completed receipts survived. The run then finished after the individual reply decisions. [Hosted restart evidence](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/hosted-expansion.json).

### Better intent matching cost us latency

The Tinker experiment used **53 authored training pairs and 16 held-out commands**:

| Measurement          | Base Qwen3-8B | Fine-tuned adapter |
| -------------------- | ------------: | -----------------: |
| Exact intent matches |         12/16 |              16/16 |
| Output tokens        |           320 |                240 |
| Median latency       |      2,385 ms |           7,870 ms |

The adapter improved exact matching on this small fixed set and produced fewer output tokens. It was also considerably slower. I kept all three measurements because the improvement claim only makes sense with that tradeoff beside it. These are synthetic task results, not production accuracy.

The same private checkpoint is retained through **November 5 at 23:59 UTC**, covering the announced judging week with a buffer. Estimated remaining storage is **$0.004852** within the approved $0.25 promotional budget. No retraining, purchase or top-up was used. [Evaluation](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/tinker-evaluation.json) · [Retention receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/tinker-retention.json).

### Sources help, but a sourced reply can still need rejection

Tiger combines pgvector similarity and full-text search over five authored playbooks. In a six-question fixture, hybrid retrieval found 6/6 expected playbooks versus 5/6 for keywords alone. TabPFN-3.5-Plus adds escalation estimates from 48 authored scenarios; it can raise attention but cannot lower the deterministic deadline/impact floor. Its separate synthetic holdout had 15/16 correct labels.

SerpApi adds fresh search results. Backboard recalls the bounded reply-style preference. Browserbase and Stagehand save an internal note through the hosted form using explicit selectors.

Each of those jobs is bounded, and each has a limitation. The playbooks are authored summaries. The prediction data is synthetic. Search snippets are untrusted. In an earlier live test, a search returned irrelevant dictionary/general-interest references and that draft was rejected. In the anonymous test, one draft was approved and the other rejected. An advisory review does not remove the need to read the answer.

### Trace the failure before changing the workflow

An earlier hosted drafting attempt failed with a real Gemma internal error. Sentry's model span identified the provider boundary. Explicit resume reused completed activities and cached successful responses; VOX now shows a safe checkpoint explanation without exposing the upstream error body or silently switching to templates.

![Actual Sentry Agent Activity from the later successful anonymous judge run, with a selected Gemma span and prompt capture disabled.](https://raw.githubusercontent.com/himanshu748/vox-zero-touch-os/9bfc07d5657d41a43213a9fb7b699f6ae0db43d6/docs/evidence/sentry-judge-trace.png)

This screenshot is from the later successful judge run. Its selected span reports **17.05 seconds and about 1.8K tokens**. Sentry's displayed cost is estimated; provider-billed cost is unavailable. The red internal-label interruption in the timeline was an injected retry test, separate from the real Gemma error.

The regression suite has **44 passing tests**, including session isolation, quota persistence, single-use decisions, retries and validated planning. Type checking and the production build pass. SDK tests use mocks or injected transports where stated; the hosted receipts are the live evidence.

## Why Does Open Innovation Matter?

The intent dataset, plan schema, action cards, orchestration and approval rules are inspectable in the repository. Open weights let me adapt a narrow task and publish the comparison, including the slower result. Gemma's adapter also supports an OpenAI-compatible endpoint, so another deployment can replace the hosted model without redesigning the workflow.

The boundaries matter as much as the model. Someone reproducing this can inspect how a request is reserved, why a draft can be rejected and which evidence survives an interruption.

This hosted release still sends requests to configured cloud providers. It does not run offline or keep every input local. That is why the judge workspace uses fictional inputs, isolated sessions and explicit voice-processing consent.

## My Agent Session

Copilot CLI reviewed the non-secret research module; the [review](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/copilot-research-review.txt) and [usage receipt](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/copilot-research-usage.json) record that development use.

Entire captured the authorized review: [checkpoint](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/entire-checkpoint.json) and [session export](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/evidence/entire-review-session.jsonl). Earlier private chat history was excluded. These are development tools, not runtime APIs.

## Prize Categories

I am entering **17 categories**. The [integration ledger](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/SPONSORS.md) separates configuration, observed use and eligibility boundaries.

| Category                         | Its job in VOX                                                         |
| -------------------------------- | ---------------------------------------------------------------------- |
| Best Use of Render               | Hosts the UI, API and workflow runtime.                                |
| Best Use of TabPFN               | Escalation estimates in the wider ticket workflow.                     |
| Best Use of Tinker               | Real intent fine-tuning and baseline comparison.                       |
| Best Use of Gemma                | Streamed plans and generated replies.                                  |
| Best Use of Auth0 for AI Agents  | Verified owner sign-in; judge sessions use separate VOX authorization. |
| Best Use of Backboard            | Save and recall reply-style memory.                                    |
| Best Use of ElevenLabs           | Transcribe commands and generate briefings.                            |
| Best Use of Browserbase          | Stagehand actions against the hosted synthetic form.                   |
| Best Use of Entire               | Captured development session linked above.                             |
| Best Use of GitHub Copilot       | Actual CLI review with saved evidence.                                 |
| Best Use of Mastra               | Validated activities and the review gate.                              |
| Best Use of MongoDB Atlas        | Workspaces, decisions, quotas and receipt persistence.                 |
| Best Use of Sentry Agent Tracing | Actual spans, latency/tokens and debugging evidence.                   |
| Best Use of SerpApi              | Fresh references for reply preparation.                                |
| Best Use of a .tech Domain       | [getvox.tech](https://getvox.tech), claimed through Hacktoberfest.     |
| Best Use of Temporal             | Durable execution, retry and restart/resume proof.                     |
| Best Use of Tiger Data           | Hybrid retrieval and restricted workflow persistence.                  |

Ultramarine remains a working advisory tool, but **I am not entering its prize category**. DigitalOcean and Arduino are also excluded.

## Limits and what comes next

The live judge budget is finite. Free Render may sleep. The deployment supports one application writer. Physical microphone/speaker testing, a second live unauthorized-account walkthrough and production accuracy remain unverified. The helpdesk is fictional, and no customer message leaves it.

The next useful test is a timed comparison with someone working through the same queue manually. That would tell me whether the preparation VOX saves outweighs the time spent checking its answers.

## AI disclosure and credits

VOX was built and this article prepared with AI coding and writing assistance. All evaluation fixtures and helpdesk identities are synthetic. [Asset provenance](https://github.com/himanshu748/vox-zero-touch-os/blob/main/docs/ASSETS.md) distinguishes generated brand artwork from actual browser/provider evidence. The linked ToolTrap and EmbodiWeave posts are my earlier work; VOX is a new project for this challenge window.
