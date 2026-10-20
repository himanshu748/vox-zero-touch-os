# VOX

Say it once. Get your day back.

VOX is a support-operations workspace with live Gemma planning/drafting, ElevenLabs transcription/speech and Mastra workflow orchestration. The helpdesk contains 24 fictional tickets. Its writes, plans, approvals and evidence are persisted; external customer delivery is disabled. The expanded hosted adapters and their verification boundaries are listed in [SPONSORS.md](docs/SPONSORS.md).

## Hosted workspace

[Open VOX](https://vox-zero-touch-os.onrender.com/app). Guests can inspect an isolated synthetic workspace; live provider calls and approvals require the configured, verified Auth0 owner. DigitalOcean is disconnected by owner choice, and Temporal Cloud awaits account recovery. [Integration evidence and limits](docs/SPONSORS.md).

## Run

Requires Node.js 22.18 or newer. SQLite uses Node's built-in experimental `node:sqlite` API.

```bash
npm ci
cp .env.example .env
# Fill the server credentials. Never commit .env.
npm run dev
```

- Landing: http://localhost:4310/
- Workspace: http://localhost:4310/app
- Evidence: http://localhost:4310/app#evidence
- Health: http://localhost:4310/healthz

Without provider credentials, the app explicitly uses local rules and templates. A configured provider failure does not silently fall back to local generation. Each guest session has an isolated workspace. Production live providers require HTTPS, Auth0 and a verified allowed owner email; paid provider routes and approvals reject guests.

## Voice to execution

1. Choose the voice button and consent to ElevenLabs processing. Record up to 60 seconds, or upload an audio command smaller than 8 MB.
2. Review and edit the transcript. Voice provenance follows the saved plan and run.
3. Create a streamed Gemma plan. Inspect the ticket scope, action cards, requested draft count, provider mode and boundaries.
4. Approve the plan. Mastra runs inspection, triage, research, labels, drafts and briefing as named workflow steps. Only requested steps execute.
5. Review each proposed simulated send. Mastra suspends at its approval gate until the individual decisions are complete. Approvals can be filtered by run.
6. Play the ElevenLabs briefing. Replays use persisted generated audio; changing the briefing creates a different cache key.
7. Export the saved evidence. No external message is sent.

A requested draft count is limited to six. The deliberate label interruption retries once before its write. Model requests have no automatic SDK retries. Completed model responses are cached before the draft step commits, so resuming a failed step reuses them.

## Provider configuration

For hosted Google Gemma, set `GEMMA_PROVIDER=google`, `GOOGLE_GENERATIVE_AI_API_KEY` and `GEMMA_MODEL`. The verified model on October 20, 2026 was `gemma-4-26b-a4b-it`. For a self-hosted OpenAI-compatible endpoint, set `GEMMA_PROVIDER=compatible`, `GEMMA_BASE_URL`, the exact model id and optional `GEMMA_API_KEY`.

The AI SDK adapter uses the installed version's `instructions` API. Google Gemma emits prompt-constrained JSON, validated with Zod. Compatible endpoints can opt into native schema output with `GEMMA_STRUCTURED_OUTPUTS=true`. Partial streamed output cannot execute tools. The UI renders fixed, allowlisted React cards rather than model-supplied HTML.

For voice, set `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `ELEVENLABS_STT_MODEL` and `ELEVENLABS_TTS_MODEL`. The verified models were `scribe_v2` and `eleven_multilingual_v2`, with an available public preset voice. Use a dedicated key limited to transcription, synthesis, voice reading and model access. The locally configured VOX key has a 1,000-credit cap per refresh period and expires after 30 days.

Recordings stay in memory and are not saved by VOX. Browser recordings are normalized to mono WAV so their duration can be validated before provider processing. Transcripts and successful request metadata are saved in the owner workspace. Closing an in-flight transcription aborts processing. Provider retention follows the account terms.

Generated briefings are saved separately in a bounded SQLite audio cache, keyed by owner, run, text, voice and model. Concurrent identical requests share one generation. Reset clears the owner's cache. Browser speech is a labeled fallback only when ElevenLabs voice is not configured.

## Mastra and durability

`server/workflow-runtime.mjs` registers `vox-support-v1` with Mastra and file-backed libSQL storage. Named activities feed into a persisted approval suspension. No Mastra admin server is exposed.

`data/vox.sqlite` stores workspace state, activity cursors, model-response caches, decisions, request receipts and the idempotency ledger. `data/mastra.sqlite` stores Mastra snapshots. A suspended run resumes its saved Mastra instance. Recovery after an unfinished attempt uses the saved application cursor and ledger; a new Mastra attempt skips completed activities. A crash before a provider response is committed can leave an uncertain provider charge, so provider work remains bounded by the plan's call ceiling.

An opaque HttpOnly, SameSite cookie identifies the guest session. Auth0 identities use stable issuer/subject-bound owners. Foreign sessions cannot retrieve voice provenance, execute another session's plan, decide its drafts or read its generated audio. JSON mutation routes reject foreign browser origins.

## Hosted adapters

Set `PUBLIC_ORIGIN`, Auth0's issuer/client credentials/session secret and `AUTH0_ALLOWED_EMAIL` for a public deployment. Auth0 callback is `/auth/callback`; login/logout are under `/auth`. Only `openid profile email` are requested.

`MONGODB_URI` enables acknowledged Atlas workspace, session and audio snapshots. Startup hydrates SQLite from Atlas; failed acknowledgments return an error. Run one web/worker instance. A revision check rejects concurrent writers. Speech cache entries expire after seven days.

`TEMPORAL_ADDRESS`, namespace and scoped API key enable the real Temporal worker. `npm run build` precompiles its deterministic workflow. Temporal owns scheduling, retries and approval signals; Mastra executes validated activities. Only owner/run identifiers enter Temporal payloads. `node scripts/verify-temporal.mjs` verifies restart/retry against a real local Temporal server without model calls.

`SERPAPI_API_KEY` enables up to two live searches per approved research plan. URLs, timestamps and provider search IDs are retained. `BACKBOARD_API_KEY` stores and recalls the workspace's reply-style preference. A returned memory ID follows the next plan. `SENTRY_DSN` enables actual AI SDK and tool tracing with prompt/response recording disabled and exact environment-secret redaction.

`BROWSERBASE_API_KEY` and project ID enable two bounded Stagehand actions against VOX's hosted synthetic helpdesk: fill and save one internal note. An HttpOnly, three-minute signed grant permits only the approved run/ticket/note. The saved field, session ID and ledger are checked before execution continues. No external helpdesk credentials or customer data are used. Stagehand executes two explicit approved actions against the fixed form. Model-based selector self-healing is disabled; no Google credential is sent to Browserbase. Gemma plans and drafts through Vercel AI SDK on Render. The browser stays open until the acknowledged save response and persisted field agree.

On Render, use `npm ci --include=dev && npm run build`, `npm start`, `/healthz`, one instance and Node 22.18+. Store keys in a secret file and set `VOX_ENV_FILE=/etc/secrets/vox.env`. Do not put keys in Vite client variables. Atlas must allow only the service's outbound ranges. Hosted provider verification is distinct from local tests and physical microphone checks.

## Verification

```bash
npm test
npm run typecheck
npm run build
npm start
```

32 automated checks pass. Type checking covers the AI SDK adapter. Browser verification exercised the real provider chain with a synthetic spoken file: live Scribe transcription → live Gemma plan → two live Gemma drafts → Mastra approval suspension/resume → live ElevenLabs briefing. Replay and process restart reused the saved audio. Provider receipts and a real Mastra snapshot were exported. Physical microphone testing was deferred by the user.

The workspace and landing share Geist typography, soft white surfaces, near-black headings, cobalt accents and motion tokens. Mobile/tablet/desktop checks cover menus, dialogs, plan cards, approvals and evidence.

The dependency audit currently reports one unpatched transitive formatter denial-of-service advisory through Mastra's frontmatter dependency chain (five affected package entries). VOX does not expose frontmatter parsing or user-controlled format strings. No unsafe forced dependency downgrade was applied.

See [verification](docs/VERIFICATION.md), [live voice architecture](docs/VOICE-FLOW.md), [motion](docs/MOTION.md), [asset provenance](docs/ASSETS.md) and [remaining PRD requirements](docs/REMAINING.md).

## References

[Vercel AI SDK](https://ai-sdk.dev/docs), [Google-hosted Gemma](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api), [Mastra workflows](https://mastra.ai/docs/workflows/overview), [Mastra human approval](https://mastra.ai/docs/workflows/human-in-the-loop), [ElevenLabs transcription](https://elevenlabs.io/docs/api-reference/speech-to-text/convert), [ElevenLabs speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert).
