# VOX

Say it once. Get your day back.

VOX is a working local support-operations sandbox with a product landing page, a persistent helpdesk and a reviewable execution flow. It uses Vercel AI SDK 7 for structured model output and React plan rendering. **This build does not complete the cloud integrations or contest submission in the original PRD.**

## Run

Requires Node.js 22.14 or newer. SQLite uses Node's built-in experimental `node:sqlite` API.

```bash
npm ci
npm run dev
```

- Landing page: http://localhost:4310/
- Workspace: http://localhost:4310/app
- Evidence: http://localhost:4310/app#evidence
- Health: http://localhost:4310/healthz

The server defaults to localhost. Each browser session receives its own 24-ticket synthetic workspace. All fictional identities and tickets are generated from checked-in seed data. Data persists in `data/vox.sqlite`. Preferences includes an explicit workspace reset.

```bash
npm test
npm run typecheck
npm run build
npm start
```

`npm run seed` explains the automatic seed/reset path. `npm start` serves the production build. `DATA_DIR` sets the persistent database directory.

## A real local workflow

1. Select “Triage my queue” or type a support instruction.
2. Review the generated action cards, ticket scope and side-effect boundaries.
3. Approve the plan. The executor saves priorities, internal labels, notes and reply drafts.
4. With the recovery setting on, one internal label activity fails before its transaction and retries from its saved checkpoint.
5. Inspect the resulting tickets and activity history. Every proposed simulated send requires a separate decision.
6. Reject a draft or approve one sandbox send. No external delivery takes place.
7. Play the saved briefing with browser speech, or configured ElevenLabs. Export the actual records from Evidence.

All displayed execution counts are calculated from saved records. The landing page's workspace preview reads the current session's real local data. Its workflow examples and animated approval card are labeled illustrations.

## Vercel AI SDK and generative UI

- `server/ai.mjs` uses `generateText`, `streamText` and `Output.object` with Zod schemas.
- `@ai-sdk/openai-compatible` connects a server-configured Gemma endpoint.
- `@ai-sdk/react`'s `useObject` parses the streamed intent for the planning UI.
- Only allowlisted action kinds render fixed React components. The model cannot emit executable HTML or choose tool URLs.
- The server saves a complete validated plan before it can be executed. A partial preview cannot mutate tickets.
- Without an endpoint, the app explicitly uses deterministic local rules and reply templates. The SDK React hook still consumes that structured local response. This is not represented as model inference.
- SDK tests use `ai/test` mocks and do not count as live provider evidence.

## Connect a model and voice

Copy `.env.example` to `.env`, set the desired server credentials and restart the process. Do not place credentials in browser code.

For a self-hosted Gemma endpoint, set `GEMMA_BASE_URL`, `GEMMA_MODEL` and, if needed, `GEMMA_API_KEY`. Supply the exact model id served by your endpoint. `GEMMA_STRUCTURED_OUTPUTS=true` opts into server-side JSON-schema support if the endpoint supports it. The SDK validates the result in either mode. SDK-level retries are disabled; no silent local fallback occurs after a configured provider fails.

For ElevenLabs, set `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID`. The microphone flow requires consent before recording and provider processing. Audio is bounded to 60 seconds and 8 MB, stays in memory, and is not saved by VOX. Closing a recording dialog discards the recording. Provider retention depends on the account terms. These adapters have not been verified with live credentials in this build.

## Persistence and authorization

One local Node process owns the executor. Plans, activity cursors, fault-injection state, drafts, decisions, receipts and the write ledger are persisted atomically in SQLite. Restarting the worker resumes running workflows. An idempotency key prevents an activity from repeating an already saved write.

An opaque HttpOnly, SameSite cookie identifies an isolated guest workspace. Foreign sessions cannot retrieve or decide another workspace's plans or approvals. JSON mutation routes reject foreign browser origins. This is local session authorization, **not Auth0 authentication**. Keep this build on localhost until public-hosting controls, authentication and provider budgets are completed.

## Verification and limits

13 automated tests cover schema validation, SDK generation and streaming with test models, read-only planning, scoped plans, unknown tool rejection, cross-session approvals, single-use decisions, retries, idempotency, database reopen/resume, preferences and reset. Type checking covers the AI SDK adapter. The production build passes.

Browser checks covered the local text-to-plan-to-run-to-approval flow, the new structured plan UI, landing navigation, example switching, motion preview pause/resume, desktop and mobile layouts. See [verification](docs/VERIFICATION.md).

No live Gemma/ElevenLabs provider call, Temporal workflow, Stagehand/Browserbase operation, Auth0 login, MongoDB Atlas proof, cloud deployment, public repository, domain setup or submission is claimed. See [remaining requirements](docs/REMAINING.md).

## Design and motion

The current visual direction uses Geist, soft white, near-black and cobalt. The dark workspace uses the same typography and interaction accent. The original copper direction was replaced after user feedback.

The landing page uses an original ImageGen sculpture, not a photograph of a physical device. It has a coordinated hero entrance and once-only section reveals. “Play the workflow” is a finite 6.4-second, user-controlled illustration with pause, resume and replay. Reduced motion removes spatial choreography and shows the final preview directly. [Motion notes](docs/MOTION.md) and [asset provenance](docs/ASSETS.md) document the approach.

## Source map

- `src/Landing.jsx`, `src/landing.css`: marketing page and interactive illustrations.
- `src/App.jsx`, `src/styles.css`: operations workspace and review dialogs.
- `src/PlanCards.jsx`, `shared/contracts.mjs`: schema-driven generative UI.
- `server/app.mjs`: session-bound HTTP API and streaming preview.
- `server/planner.mjs`: policy, scope and transparent priority rules.
- `server/engine.mjs`: durable local activities, retry, approvals and briefing counts.
- `server/store.mjs`, `server/seed.mjs`: SQLite persistence and synthetic fixtures.
- `server/ai.mjs`, `server/providers.mjs`: AI SDK model layer and provider evidence state.

MIT licensed. The proposed product requirements are preserved in [the original PRD](docs/PRD.md).

API references: [Vercel AI SDK](https://ai-sdk.dev/docs), [structured outputs](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data), [useObject](https://ai-sdk.dev/docs/ai-sdk-ui/object-generation), [ElevenLabs transcription](https://elevenlabs.io/docs/api-reference/speech-to-text/convert), [ElevenLabs speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).
